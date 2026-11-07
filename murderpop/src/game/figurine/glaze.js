// Glazed porcelain: one MeshPhysicalMaterial family (onBeforeCompile) for every part of a figurine.
//  body: white porcelain with an outfit painted on in glaze layers (signed-distance fields per vertex),
//        patterns, raised gold-leaf trim, the painted face, glaze pooling in hollows and thinning on
//        edges, a warm translucent terminator, the mouth's interior, procedural expressions in the
//        vertex shader (jaw, smile, pucker, brows)
//  eye:  glazed eyeballs with a painted iris and painted lids (blink, squint, wide, happy-closed)
//  hair: sculpted ceramic hair (the Quaternius lock normals under a deep clearcoat, glaze pooling in grooves)
//  acc:  rigid accessories in one glaze or gold leaf
// Every kind shares the damage: a voronoi crack network grown from hit points (dark hairlines with a
// faint kintsugi glow), chipped flakes of bare bisque, broken-off parts, a white-hot hit ring. With
// {shard: true} the same material draws shatter shards positioned from a transform texture.
import * as THREE from 'three';

// uniforms every material of one figurine shares (pass the same object to each makeGlaze call)
export function sharedUniforms() {
  return {
    fTime: { value: 0 },
    fDamage: { value: 0 },
    fHits: { value: Array.from({ length: 16 }, () => new THREE.Vector4(0, -10, 0, 0)) },
    fHitN: { value: 0 },
    fFlash: { value: new THREE.Vector4(0, -10, 0, 9) },     // xyz bind position, w = age (s)
    fFlashColor: { value: new THREE.Color(1.0, 0.85, 0.55) },
    fShardGlow: { value: 0 },                                           // the shatter's light on its shards (fades)
    fHitPop: { value: 0 },                                    // a 2-frame white pop over the whole figurine on a hit
    fOff: { value: new THREE.Vector4(0, 0, 0, 0) },                     // per part slot: 1 = broken off (hidden)
    fShell: { value: new THREE.Vector4(0, 0, 0, 0) },                   // per part slot: 1 = glaze shell gone (bisque)
    fBreakAge: { value: new THREE.Vector4(9, 9, 9, 9) },      // seconds since each slot broke (the edge glows, then cools)
    fGold: { value: new THREE.Color(1.0, 0.74, 0.33) },
    fKintsugi: { value: 1 },
    fBisque: { value: new THREE.Color(0.93, 0.91, 0.87) },
    fInterior: { value: new THREE.Color(0.05, 0.035, 0.03) },
    fShardTex: { value: null }, fVorN: { value: 27 },
    fShardN: { value: 1 },
    fGlitterT: { value: 0 },
    fRim: { value: new THREE.Color(0, 0, 0) },                          // a pale rim on her silhouette (the room sets it)
  };
}

// ---------------------------------------------------------------------------------------------
const NOISE = /* glsl */`
float fHash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 fHash33(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float fHash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float fNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(fHash13(i), fHash13(i + vec3(1, 0, 0)), f.x), mix(fHash13(i + vec3(0, 1, 0)), fHash13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(fHash13(i + vec3(0, 0, 1)), fHash13(i + vec3(1, 0, 1)), f.x), mix(fHash13(i + vec3(0, 1, 1)), fHash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// voronoi with true edge distance (Quilez): x = edge distance, y = cell hash, zw unused; seed in cell space out
uniform int fVorN;   // 27; a uniform so the loop stays a loop (fast to compile)
vec3 fCell(int c) { return vec3(float(c % 3) - 1.0, float((c / 3) % 3) - 1.0, float(c / 9) - 1.0); }
vec2 fVoronoi(vec3 x, out vec3 seed) {
  vec3 n = floor(x), f = fract(x);
  vec3 mg = vec3(0.0), mr = vec3(0.0); float md = 8.0;
  for (int c = 0; c < fVorN; c++) {
    vec3 g = fCell(c); vec3 o = fHash33(n + g); vec3 r = g + o - f; float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int c = 0; c < fVorN; c++) {
    vec3 g = mg + fCell(c); vec3 o = fHash33(n + g); vec3 r = g + o - f;
    vec3 dr = r - mr;
    if (dot(dr, dr) > 1e-5) md = min(md, dot(0.5 * (mr + r), normalize(dr)));
  }
  seed = n + mg + fHash33(n + mg);
  return vec2(md, fHash13(n + mg));
}
`;

// damage, shared by every kind. Needs: vec3 fp (bind position), float fPx (metres per pixel).
const DAMAGE = /* glsl */`
uniform float fDamage; uniform vec4 fHits[16]; uniform int fHitN; uniform vec4 fFlash; uniform vec3 fFlashColor; uniform float fHitPop; uniform float fShardGlow;
uniform vec3 fGold; uniform float fKintsugi; uniform vec3 fBisque; uniform float fTime;
struct FigCrack { float line; float glow; float chip; float edge; };
FigCrack figCracks(vec3 p, float px) {
  FigCrack c = FigCrack(0.0, 0.0, 0.0, 0.0);
  if (fDamage <= 0.0 && fHitN == 0) return c;
  // reveal: near each hit, out to its radius (radius grows with damage), plus a little everywhere when badly broken
  float rv = 0.0, near = 0.0, chipR = 0.0;
  for (int i = 0; i < fHitN; i++) {
    vec4 h = fHits[i];
    float d = distance(p, h.xyz);
    rv = max(rv, 1.0 - smoothstep(h.w * 0.25, h.w, d));
    near = max(near, 1.0 - smoothstep(h.w * 0.1, h.w * 0.6, d));
    chipR = max(chipR, (0.012 + h.w * 0.12) * (1.0 - smoothstep(0.0, 0.07 + h.w * 0.15, d)));
  }
  float glob = smoothstep(0.55, 1.0, fDamage) * (0.35 + 0.65 * fNoise(p * 3.1));
  rv = max(rv, glob);
  if (rv <= 0.001) return c;
  // the network: warped voronoi in bind space, two scales (one loop so the cell search compiles once)
  vec3 w = p + sin(p.yzx * 21.0 + p.zxy * 13.0) * 0.012 + sin(p.zxy * 57.0) * 0.004;
  vec3 s2 = vec3(0.0);
  float l1 = 0.0, l2 = 0.0, e1 = 1.0, e2 = 1.0, reveal1 = 0.0, reveal2 = 0.0;
  for (int o = 0; o < 2; o++) {
    float fq = o == 0 ? 9.0 : 27.0;
    vec3 sd;
    vec2 v = fVoronoi(w * fq + (o == 0 ? 0.0 : 3.7), sd);
    float e = v.x / fq;
    if (o == 0) {
      e1 = e; reveal1 = rv * (0.55 + 0.9 * v.y);
      float w1 = 0.0009 * smoothstep(0.25, 0.9, reveal1) + px * 0.5;
      l1 = (1.0 - smoothstep(w1 - px * 0.5, w1 + px * 0.5, e)) * smoothstep(0.2, 0.55, reveal1);
    } else {
      e2 = e; s2 = sd; reveal2 = near * (0.5 + 0.8 * v.y);
      float w2 = 0.0005 * smoothstep(0.3, 0.9, reveal2) + px * 0.4;
      l2 = (1.0 - smoothstep(w2 - px * 0.5, w2 + px * 0.5, e)) * smoothstep(0.35, 0.7, reveal2);
    }
    if (near <= 0.001) break;   // far from every hit: the fine network is not needed
  }
  c.line = max(l1, l2 * 0.85);
  c.glow = exp(-e1 / (0.0011 + px * 0.6)) * smoothstep(0.25, 0.7, reveal1) + exp(-e2 / (0.0008 + px * 0.5)) * smoothstep(0.4, 0.8, reveal2) * 0.5;
  // chipped flakes: whole fine cells whose seed sits close to a heavy hit lose their glaze
  vec3 seedB = s2 / 27.0;
  float chip = 0.0;
  for (int i = 0; i < fHitN; i++) {
    vec4 h = fHits[i];
    float r = 0.012 + h.w * 0.09;
    chip = max(chip, step(distance(seedB - 3.7 / 27.0, h.xyz), r * (0.6 + 0.8 * fHash13(s2 * 1.7))));
  }
  c.chip = chip * step(0.12, fDamage + float(fHitN) * 0.02);
  c.edge = c.chip * (1.0 - smoothstep(0.0, 0.0025 + px, e2));
  return c;
}
`;

const PERTURB = /* glsl */`
vec3 figPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
  vec3 vSigmaX = normalize(dFdx(surf_pos.xyz));
  vec3 vSigmaY = normalize(dFdy(surf_pos.xyz));
  vec3 R1 = cross(vSigmaY, surf_norm);
  vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
`;

// ---------------------------------------------------------------------------------------------
// vertex side
const VERT_PARS = /* glsl */`
attribute vec4 aBind;
varying vec4 vBind;
varying vec2 vFigUv;
#ifdef FIG_BODY
attribute vec4 aPat; attribute vec4 aMisc; attribute vec4 aLayA; attribute vec4 aLayB; attribute vec4 aPart;
varying vec4 vPat; varying vec4 vMisc; varying vec4 vLayA; varying vec4 vLayB; varying vec4 vPart;
uniform vec4 fFaceA;   // jaw, smileL, smileR, pucker
uniform vec4 fFaceB;   // brow inner L, brow outer L, brow inner R, brow outer R
uniform vec4 fFaceC;   // sneer, pout, cheek, unused
uniform vec4 fMouth;   // centre xyz, half width
uniform vec4 fJaw;     // hinge xyz, max angle
uniform vec4 fBrowL;   // inner brow point xyz (left), outer x
uniform vec4 fBrowR;
uniform vec4 fLandmk;  // side sign, brow outer y offset, eye radius, unused
float fG(vec3 d, float s) { return exp(-dot(d, d) / (s * s)); }
void figExpress(inout vec3 p, inout vec3 n, float jw) {
  if (jw > 1.5) jw -= 2.0;
  vec3 m = fMouth.xyz; float hw = fMouth.w;
  // jaw hinge rotation
  float ang = fFaceA.x * fJaw.w * jw;
  if (ang != 0.0) {
    float c = cos(ang), s = sin(ang);
    vec3 q = p - fJaw.xyz;
    p = fJaw.xyz + vec3(q.x, q.y * c - q.z * s, q.y * s + q.z * c);
    n = vec3(n.x, n.y * c - n.z * s, n.y * s + n.z * c);
  }
  float sideL = fLandmk.x;
  // mouth corners: smile up/back/out, frown down
  vec3 cL = vec3(m.x + hw * sideL, m.y, m.z), cR = vec3(m.x - hw * sideL, m.y, m.z);
  float gL = fG(p - cL, 0.016), gR = fG(p - cR, 0.016);
  float smL = fFaceA.y, smR = fFaceA.z;
  p += vec3(sideL * 0.0035, 0.0055, -0.003) * smL * gL * (smL > 0.0 ? 1.0 : 0.8);
  p += vec3(-sideL * 0.0035, 0.0055, -0.003) * smR * gR * (smR > 0.0 ? 1.0 : 0.8);
  // cheeks lift with a smile
  vec3 chL = vec3(m.x + sideL * (hw + 0.022), m.y + 0.022, m.z - 0.012), chR = vec3(m.x - sideL * (hw + 0.022), m.y + 0.022, m.z - 0.012);
  p.y += 0.003 * max(smL, 0.0) * fG(p - chL, 0.02) + 0.003 * max(smR, 0.0) * fG(p - chR, 0.02) + 0.002 * fFaceC.z * (fG(p - chL, 0.022) + fG(p - chR, 0.022));
  // pucker: lips forward and in; pout: the lower lip pushes out
  vec3 dm = p - m;
  float lipM = exp(-(dm.x * dm.x) / (hw * hw * 1.1) - (dm.y * dm.y) / (0.0085 * 0.0085)) * smoothstep(m.z - 0.03, m.z - 0.008, p.z);
  p.z += 0.0055 * fFaceA.w * lipM;
  p.x -= dm.x * 0.28 * fFaceA.w * lipM;
  float lower = lipM * smoothstep(m.y + 0.001, m.y - 0.004, p.y);
  p += vec3(0.0, -0.0018, 0.0045) * fFaceC.y * lower;
  // sneer: the upper lip lifts on the left
  float up = exp(-pow((dm.x - sideL * hw * 0.45) / (hw * 0.6), 2.0) - pow((dm.y - 0.006) / 0.007, 2.0));
  p.y += 0.003 * fFaceC.x * up;
  // brows (the painted brows move with the skin)
  vec3 biL = fBrowL.xyz, boL = vec3(fBrowL.w, fBrowL.y + fLandmk.y, fBrowL.z - 0.012);
  vec3 biR = fBrowR.xyz, boR = vec3(fBrowR.w, fBrowR.y + fLandmk.y, fBrowR.z - 0.012);
  float sb = 0.014;
  p.y += 0.0065 * (fFaceB.x * fG(p - biL, sb) + fFaceB.y * fG(p - boL, sb) + fFaceB.z * fG(p - biR, sb) + fFaceB.w * fG(p - boR, sb));
  // inner brows pinch toward the nose when lowered
  p.x -= sideL * 0.0025 * (min(fFaceB.x, 0.0) * -1.0) * fG(p - biL, sb);
  p.x += sideL * 0.0025 * (min(fFaceB.z, 0.0) * -1.0) * fG(p - biR, sb);
}
#endif
#ifdef FIG_SHARD
attribute float aShard; attribute float aEdge; varying float vEdge;
uniform sampler2D fShardTex;
vec3 figQRot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
#endif
`;

const VERT_NORMAL = /* glsl */`
vec3 figP = vec3(position);
#if defined(FIG_BODY) && !defined(FIG_SHARD)
  figExpress(figP, objectNormal, aMisc.w);
#endif
#ifdef FIG_SHARD
  vec4 figT0 = texelFetch(fShardTex, ivec2(int(aShard) * 2, 0), 0);
  vec4 figT1 = texelFetch(fShardTex, ivec2(int(aShard) * 2 + 1, 0), 0);
  objectNormal = figQRot(figT1, objectNormal);
  vEdge = aEdge;
#endif
`;
const VERT_POS = /* glsl */`
transformed = figP;
#ifdef FIG_SHARD
  transformed = figQRot(figT1, figP * figT0.w) + figT0.xyz;
#endif
vBind = aBind;
vFigUv = uv;
#ifdef FIG_BODY
  vPat = aPat; vMisc = aMisc; vLayA = aLayA; vLayB = aLayB; vPart = aPart;
#endif
`;

// ---------------------------------------------------------------------------------------------
// fragment side
const FRAG_PARS = /* glsl */`
varying vec4 vBind;
varying vec2 vFigUv;
uniform vec4 fOff; uniform vec4 fShell; uniform vec4 fBreakAge; uniform vec3 fInterior;
${NOISE}
${DAMAGE}
${PERTURB}
struct FigSurf { vec3 albedo; float rough; float metal; float coat; float coatRough; vec3 emissive; float sss; float h; float ccH; float ao; };
FigSurf gS;
float gSSS = 0.0;
#ifdef FIG_BODY
varying vec4 vPat; varying vec4 vMisc; varying vec4 vLayA; varying vec4 vLayB; varying vec4 vPart;
uniform vec3 fSkin; uniform vec4 fSkinMat; uniform vec3 fPoolTint; uniform vec3 fMouthCol;
uniform vec4 fLayCol[8]; uniform vec4 fLayMat[8]; uniform vec4 fLayPat[8]; uniform vec4 fLayCol2[8]; uniform vec4 fLayTrim[8]; uniform vec4 fLayTrimCol[8];
uniform vec4 fLayMode[8]; uniform vec4 fLayMode2[8];
uniform int fLayN; uniform int fShellL;   // number of layers; the layer a shell mesh carries (-1: the body)
// a layer's coverage (signed metres) from its per-vertex value and, for bands, the bind position
float figLayer(int i, float a, vec3 p) {
  vec4 m = fLayMode[i];
  if (m.x < 0.5) return a;
  if (m.x < 1.5) {           // lapels: a band inside the neckline
    vec4 m2 = fLayMode2[i];
    float yTo = m2.x, yPeak = m2.y;
    float w = p.y < yPeak ? m.y * pow(max(0.0, (p.y - yTo) / (yPeak - yTo)), 0.8) : mix(m.z, m.y * 0.55, smoothstep(yPeak + 0.025, yPeak, p.y));
    return min(min(a, w - a), min(p.y - yTo, m.w - abs(p.x)));
  }
  if (m.x < 2.5) return min(m.y - abs(p.y - m.z), a);    // belt
  vec4 m2 = fLayMode2[i];                                  // sash
  vec2 d = m2.xy - m.zw; float l = length(d);
  float dist = abs((p.x - m.z) * d.y - (p.y - m.w) * d.x) / l;
  return min(m.y - dist, a);
}
uniform sampler2D fFaceTex; uniform vec4 fFaceRect;
uniform vec4 fSeam;    // width, depth, colour mix, on
uniform vec4 fMouth;
float figLay(int i) { return i == 0 ? vLayA.x : i == 1 ? vLayA.y : i == 2 ? vLayA.z : i == 3 ? vLayA.w : i == 4 ? vLayB.x : i == 5 ? vLayB.y : i == 6 ? vLayB.z : vLayB.w; }
// a smooth square wave: 1 inside bands of width duty (fraction of a period) centred on whole numbers
float figBand(float u, float duty, float aa) { float t = abs(fract(u + 0.5) - 0.5) * 2.0; return 1.0 - smoothstep(duty - aa, duty + aa, t); }
#endif
#ifdef FIG_EYE
uniform vec4 fEyeL; uniform vec4 fEyeR;      // centre xyz, radius
uniform vec4 fLidL; uniform vec4 fLidR;      // top (0 open .. 1 closed), bottom, happy curve, unused
uniform vec4 fIris;                          // gaze xy, iris scale, pupil scale
uniform vec3 fIrisCol; uniform vec3 fIrisCol2; uniform vec3 fLidCol; uniform vec4 fEyeStyle; // x: slit pupil, y: gold ring, z: white tint
uniform vec4 fEyeOpen;   // the visible opening (eye radii from the centre): top, bottom
#endif
#ifdef FIG_HAIR
uniform sampler2D fGroove; uniform vec4 fHairStyle; // x: gilding amount, y: groove depth, z: sheen of tips
#endif
#ifdef FIG_ACC
uniform vec4 fAccStyle;  // x: pattern (1 stripes, 2 dots, 4 plaid, 5 pinstripe), y: repeats across u, z: repeats along v, w: duty
uniform vec3 fAccCol2;
uniform vec4 fAccTrim;   // trim widths in metres: at v = 1 (hem), at v = 0 (waist), at u = 0/1 (sides); w: relief
uniform float fAccGold;  // the colour is the shared gold leaf
float figBandAcc(float u, float duty, float aa) { float t = abs(fract(u + 0.5) - 0.5) * 2.0; return 1.0 - smoothstep(duty - aa, duty + aa, t); }
#endif
#ifdef FIG_SHARD
varying float vEdge;
#endif
`;

// the surface, before lighting
const FRAG_SURF = /* glsl */`
{
  vec3 fp = vBind.xyz;
  float fPx = max(1e-5, 0.5 * (length(dFdx(fp)) + length(dFdy(fp))));
  gS = FigSurf(diffuse, roughness, metalness, 1.0, 0.04, vec3(0.0), 0.4, 0.0, 0.0, 1.0);
  #ifdef USE_CLEARCOAT
    gS.coat = clearcoat; gS.coatRough = clearcoatRoughness;
  #endif
  float pool = 0.0;   // + in hollows, - on edges (glaze pooling / breaking)
  float occl = 0.0;
  bool glazed = true;

#ifdef FIG_BODY
  // ---------- porcelain skin
  gS.albedo = fSkin; gS.rough = fSkinMat.x; gS.coat = fSkinMat.y; gS.coatRough = fSkinMat.z; gS.sss = fSkinMat.w;
  pool = vMisc.x * 0.8 + vMisc.y * 0.5;
  occl = max(vMisc.y, 0.0);
  float purity = smoothstep(0.55, 0.95, vMisc.z);
  // fabric coordinates
  float fTh = atan(vPat.y, vPat.x);
  float dTh = length(vec2(vPat.x * dFdx(vPat.y) - vPat.y * dFdx(vPat.x), vPat.x * dFdy(vPat.y) - vPat.y * dFdy(vPat.x)));
  float fAround = fTh / 6.2831853;   // -0.5..0.5 around the limb
  float fAlong = vPat.z;
  float fC = vPat.w;
  float dAlong = length(vec2(dFdx(fAlong), dFdy(fAlong)));
  // ---------- face paint (only the head's face island; arms and legs have a smaller circumference code)
  {
    vec2 fuv = (vFigUv - fFaceRect.xy) / (fFaceRect.zw - fFaceRect.xy);
    vec4 fpaint = texture2D(fFaceTex, clamp(fuv, 0.0, 1.0));
    float inFace = step(0.8, vPat.w) * step(0.0, fuv.x) * step(0.0, fuv.y) * step(fuv.x, 1.0) * step(fuv.y, 1.0);
    fpaint *= inFace;   // premultiplied
    gS.albedo = gS.albedo * (1.0 - fpaint.a) + fpaint.rgb;
    gS.sss *= 1.0 - fpaint.a * 0.7;
  }
  // ---------- painted layers, bottom to top
  float aa = fPx * 0.85;
  if (fShellL >= 0 && figLayer(fShellL, figLay(fShellL), fp) < 0.0) discard;
  for (int i = 0; i < fLayN; i++) {
    float dm = figLayer(i, figLay(i), fp);
    float cov = smoothstep(-aa, aa, dm);
    if (i < fShellL) continue;
    if (i == fShellL) cov = 1.0;
    if (cov <= 0.0) continue;
    vec4 lc = fLayCol[i], lm = fLayMat[i], lp = fLayPat[i], l2 = fLayCol2[i], lt = fLayTrim[i], tc = fLayTrimCol[i];
    vec3 c = lc.rgb; float r = lm.x, cc = lm.y, ccr = lm.z, m = lm.w; float hh = 0.0;
    float pt = lp.x;
    if (pt > 0.5) {
      float per = lp.y;
      float n = max(1.0, floor(fC / per + 0.5));
      float u = fAround * n, v = fAlong / per;
      float du = dTh / 6.2831853 * n, dv = dAlong / per;
      float pm = 0.0;
      if (pt < 1.5) {          // stripes: z = 0 vertical (around), 1 horizontal (along), 0.5 diagonal
        float q = lp.z < 0.25 ? u : lp.z > 0.75 ? v : u + v;
        float dq = lp.z < 0.25 ? du : lp.z > 0.75 ? dv : du + dv;
        pm = figBand(q, lp.w, dq * 1.5 + 0.01);
        pm = mix(pm, lp.w, smoothstep(0.25, 0.6, dq));
      } else if (pt < 2.5) {   // polka dots, staggered rows
        float row = floor(v);
        vec2 g = vec2(u + mod(row, 2.0) * 0.5, v);
        vec2 l = fract(g) - 0.5;
        float rr = lp.w;
        float dd = length(l);
        float w = (du + dv) * 0.75 + 0.01;
        pm = 1.0 - smoothstep(rr - w, rr + w, dd);
        pm = mix(pm, 3.14 * rr * rr, smoothstep(0.2, 0.5, du + dv));
        hh += pm * 0.00015;
      } else if (pt < 3.5) {   // sequins: overlapping discs, each tilted its own way
        float row = floor(v * 1.15);
        vec2 g = vec2(u + mod(row, 2.0) * 0.5, v * 1.15);
        vec2 cell = floor(g); vec2 l = fract(g) - 0.5;
        float hs = fHash12(cell + lp.z);
        vec2 tilt = (vec2(fHash12(cell * 1.7 + 3.1), fHash12(cell * 2.3 + 7.7)) - 0.5) * 2.0;
        float dd = length(l);
        float disc = 1.0 - smoothstep(0.44, 0.5, dd);
        hh += disc * (dot(l, tilt) * 0.0012 + (0.25 - dd * dd) * 0.0006) * per * 30.0;
        // each disc a tilted mirror of the garment's own colour (lifted so dark sequins still flash)
        vec3 sq = mix(c, l2.rgb, 0.18) * (0.85 + 0.4 * hs) + 0.02;
        c = mix(c * 0.3, sq, disc);
        m = mix(m, 1.0, disc * 0.92); r = mix(r, 0.1 + 0.14 * hs, disc); cc = mix(cc, 0.5, disc);
        pm = 0.0;
      } else if (pt < 4.5) {   // plaid: two bands each way and a thin overcheck
        float bH = figBand(v, 0.32, dv * 1.5 + 0.01), bV = figBand(u, 0.32, du * 1.5 + 0.01);
        float tH = figBand(v * 4.0 + 0.5, 0.05, dv * 6.0 + 0.02), tV = figBand(u * 4.0 + 0.5, 0.05, du * 6.0 + 0.02);
        pm = clamp((bH + bV) * 0.5, 0.0, 1.0);
        c = mix(c, l2.rgb, pm);
        c = mix(c, fGold * 0.8, max(tH, tV) * 0.55 * lp.w * (1.0 - smoothstep(0.2, 0.5, du + dv)));
        pm = 0.0;
      } else {                 // pinstripe: hairline verticals
        pm = figBand(u, lp.w, du * 1.5 + 0.004) * (1.0 - smoothstep(0.15, 0.5, du));
      }
      pm *= purity;
      c = mix(c, l2.rgb, pm);
    }
    // raised gold-leaf trim on the garment's edge (optionally a second fine line inside it)
    float tw = lt.x;
    if (tw > 0.0) {
      float band = 1.0 - smoothstep(tw - aa, tw + aa, dm);
      float b2 = 0.0;
      if (lt.z > 0.0) b2 = (1.0 - smoothstep(tw * 0.35 - aa, tw * 0.35 + aa, abs(dm - tw * 2.1)));
      float tb = max(band, b2);
      // gold leaf is flat; a little darkening toward its edges reads as a soft bevel
      float bev = mix(0.72, 1.0, sin(clamp(dm / tw, 0.0, 1.0) * 3.14159));
      c = mix(c, tc.rgb * (band > b2 ? bev : 1.0), tb); m = mix(m, tc.a, tb); r = mix(r, 0.2, tb * tc.a); cc = mix(cc, 0.2, tb * tc.a); ccr = mix(ccr, 0.1, tb * tc.a);
    }
    gS.albedo = mix(gS.albedo, c, cov); gS.rough = mix(gS.rough, r, cov); gS.coat = mix(gS.coat, cc, cov);
    gS.coatRough = mix(gS.coatRough, ccr, cov); gS.metal = mix(gS.metal, m, cov); gS.sss = mix(gS.sss, lc.a, cov);
    gS.h += hh * cov;
  }
  #ifdef FIG_DEBUG_ISO
  { float d = figLayer(FIG_DEBUG_ISO, figLay(FIG_DEBUG_ISO), fp); gS.albedo = d > 0.0 ? vec3(0.9, 0.3, 0.2) : vec3(0.2, 0.3, 0.9); gS.albedo *= 0.4 + 0.6 * step(0.12, fract(d * 100.0)); if (abs(d) < 0.0015) gS.albedo = vec3(1.0, 1.0, 0.0); gS.metal = 0.0; }
  #endif
  // mannequin seams: a fine groove on the joint lines
  {
    float sd = vBind.w; float saa = max(fwidth(sd) * 0.75, 1e-5);
    float sm = abs(sd);
    float groove = (1.0 - smoothstep(fSeam.x - saa, fSeam.x + saa, sm)) * fSeam.w;
    gS.h -= groove * fSeam.y * (1.0 - sm / max(fSeam.x, 1e-4));
    gS.albedo = mix(gS.albedo, gS.albedo * fSeam.z, groove);
  }
  // the mouth's interior
  if (vMisc.w > 1.5) {
    // the mouth: dark glaze, a row of white teeth at the front of the upper half
    float teeth = step(fMouth.y - 0.0004, fp.y) * smoothstep(fMouth.z - 0.016, fMouth.z - 0.012, fp.z);
    gS.albedo = mix(fMouthCol, vec3(0.86, 0.84, 0.8), teeth); gS.rough = mix(0.35, 0.2, teeth); gS.coat = mix(0.5, 1.0, teeth); gS.sss = 0.0; pool = 0.0;
  }
  // broken parts: hidden (off) or the glaze shell gone (bare bisque), ragged edges
  {
    float jag = (fNoise(fp * 70.0) - 0.5) * 0.35 + (fNoise(fp * 210.0) - 0.5) * 0.12;
    float keep = 1.0;
    #ifdef FIG_SHARD
    keep = 1.0 - step(2.5, vEdge);    // a flying shell keeps its glaze
    #endif
    float offM = dot(vPart, fOff), shM = dot(vPart, fShell);
    float thr = 0.5 + jag;
    #ifndef FIG_SHARD
    if (offM > thr) discard;
    #endif
    float rim = smoothstep(thr - 0.09, thr - 0.005, offM) * keep;
    float sh = smoothstep(thr - 0.012, thr + 0.012, shM) * keep;
    float shRim = (1.0 - smoothstep(0.0, 0.05, abs(shM - thr))) * keep;
    float bis = max(rim, sh);
    if (bis > 0.0 || shRim > 0.0) {
      float g = fNoise(fp * 400.0);
      vec3 bc = fBisque * (0.82 + 0.18 * g) * mix(1.0, 0.78, sh * smoothstep(0.0, 0.5, shM - thr));
      gS.albedo = mix(gS.albedo, bc, bis); gS.rough = mix(gS.rough, 0.88, bis); gS.coat = mix(gS.coat, 0.0, bis);
      gS.metal = mix(gS.metal, 0.0, bis); gS.sss = mix(gS.sss, 0.15, bis);
      gS.albedo *= 1.0 - shRim * 0.85 * max(sh, 0.4);
      gS.h += (sh - rim) * 0.0012;
      glazed = bis < 0.5;
      float age = min(min(fBreakAge.x, fBreakAge.y), min(fBreakAge.z, fBreakAge.w));
      gS.emissive += fGold * (rim + shRim) * 3.0 * exp(-age * 2.5) * fKintsugi;
    }
  }
#endif

#ifdef FIG_EYE
  {
    vec4 E =(fp.x - fEyeL.x) * (fp.x - fEyeL.x) < (fp.x - fEyeR.x) * (fp.x - fEyeR.x) ? fEyeL : fEyeR;
    vec4 lid = (fp.x - fEyeL.x) * (fp.x - fEyeL.x) < (fp.x - fEyeR.x) * (fp.x - fEyeR.x) ? fLidL : fLidR;
    vec3 q = (fp - E.xyz) / E.w;
    vec2 e = q.xy;
    float pe = fPx / E.w;
    // iris and pupil, with the gaze
    vec2 ic = fIris.xy;
    float ir = 0.52 * fIris.z;
    vec2 de = e - ic;
    if (fEyeStyle.x > 0.5) de.x *= 1.0;
    float rd = length(de);
    float irisM = 1.0 - smoothstep(ir - pe, ir + pe, rd);
    float ang = atan(de.y, de.x);
    float streak = fNoise(vec3(ang * 9.0, rd * 6.0, 1.0));
    vec3 icol = mix(fIrisCol2, fIrisCol, smoothstep(0.15, 0.95, rd / ir)) * (0.75 + 0.5 * streak);
    icol *= 1.0 - 0.75 * smoothstep(ir * 0.78, ir, rd);           // dark limbal ring
    float pr = ir * 0.42 * fIris.w;
    vec2 pd = de; if (fEyeStyle.x > 0.5) pd.x *= 3.2;
    float pupilM = 1.0 - smoothstep(pr - pe, pr + pe, length(pd));
    vec3 white = mix(vec3(0.93, 0.93, 0.95), vec3(0.98, 0.95, 0.9), fEyeStyle.z);
    gS.albedo = mix(white, icol, irisM);
    gS.albedo = mix(gS.albedo, vec3(0.008), pupilM);
    // gold ring around the iris
    float ring = (1.0 - smoothstep(0.02, 0.02 + pe * 2.0, abs(rd - ir * 1.04))) * fEyeStyle.y;
    gS.albedo = mix(gS.albedo, fGold, ring); gS.metal = ring;
    // painted catchlight
    float hl = 1.0 - smoothstep(0.07, 0.07 + pe * 1.5, length(de - vec2(-0.16, 0.2) * ir / 0.52));
    gS.albedo = mix(gS.albedo, vec3(1.0), hl * irisM);
    gS.rough = 0.25; gS.coat = 1.0; gS.coatRough = 0.02; gS.sss = 0.1;
    // painted lids: the upper lid line comes down, the lower comes up; a happy curve arches it
    float x2 = e.x * e.x;
    float oT = fEyeOpen.x + 0.06, oB = fEyeOpen.y - 0.06;
    float mid = mix(oB, oT, 0.4);
    // the lids close toward a line a little below the middle of the opening; a happy eye closes onto
    // an arch (the lash line curves up like a smile)
    float arch = mid + 0.16 - x2 * 0.9;
    float closeLine = mix(mid - x2 * 0.12, arch, lid.z);
    float topY = mix(oT + 0.12, closeLine, clamp(lid.x, -0.3, 1.0)) - x2 * 0.18 * (1.0 - lid.z);
    float botY = mix(oB - 0.1, closeLine - 0.004, clamp(lid.y, 0.0, 1.0)) + x2 * 0.15 * (1.0 - lid.z);
    botY = min(botY, topY);
    float lidTop = smoothstep(topY - pe, topY + pe, e.y);
    float lidBot = 1.0 - smoothstep(botY - pe, botY + pe, e.y);
    float lash = (1.0 - smoothstep(0.0, 0.08 + pe * 1.5, abs(e.y - topY))) * smoothstep(0.08, 0.3, lid.x);
    vec3 lc = fLidCol;
    gS.albedo = mix(gS.albedo, lc, max(lidTop, lidBot));
    gS.albedo = mix(gS.albedo, vec3(0.01), lash);
    gS.h = max(lidTop, lidBot) * 0.0003;
  }
#endif

#ifdef FIG_HAIR
  {
    vec2 huv = vFigUv;
    float gv = texture2D(fGroove, huv).r;     // bright on the locks, dark in the grooves
    pool = (0.55 - gv) * fHairStyle.y * 2.2;
    occl = max(0.0, 0.5 - gv) * fHairStyle.y;
    float gild = smoothstep(0.62, 0.8, gv) * fHairStyle.x;
    gS.albedo = mix(gS.albedo, fGold, gild); gS.metal = mix(gS.metal, 1.0, gild); gS.rough = mix(gS.rough, 0.2, gild);
    gS.sss = 0.15;
  }
#endif

#ifdef FIG_ACC
  {
    if (fAccGold > 0.5) gS.albedo = fGold;
    vec2 auv = vFigUv;
    vec2 fu = vec2(fwidth(auv.x), fwidth(auv.y));
    float pt = fAccStyle.x;
    if (pt > 0.5) {
      float u = auv.x * fAccStyle.y, v = auv.y * fAccStyle.z;
      float du = fu.x * fAccStyle.y, dv = fu.y * fAccStyle.z;
      float pm = 0.0;
      if (pt < 1.5) pm = figBandAcc(u, fAccStyle.w, du * 1.5 + 0.01);
      else if (pt < 2.5) { vec2 g = vec2(u + mod(floor(v), 2.0) * 0.5, v); vec2 l = fract(g) - 0.5; pm = 1.0 - smoothstep(fAccStyle.w - du - dv, fAccStyle.w + du + dv, length(l)); }
      else if (pt < 4.5) { pm = clamp((figBandAcc(u, 0.32, du * 1.5) + figBandAcc(v, 0.32, dv * 1.5)) * 0.5, 0.0, 1.0); }
      else pm = figBandAcc(u, fAccStyle.w, du * 1.5 + 0.004);
      gS.albedo = mix(gS.albedo, fAccCol2, pm * (1.0 - smoothstep(0.25, 0.6, du + dv)));
    }
    // gold edges, measured in metres from the uv borders
    if (fAccTrim.x + fAccTrim.y + fAccTrim.z > 0.0) {
      float mu = fPx / max(fu.x, 1e-6), mv = fPx / max(fu.y, 1e-6);
      float dHem = (1.0 - auv.y) * mv, dWaist = auv.y * mv, dSide = min(auv.x, 1.0 - auv.x) * mu;
      float aa = fPx;
      float tb = 0.0, rel = 0.0;
      if (fAccTrim.x > 0.0) { float b = 1.0 - smoothstep(fAccTrim.x - aa, fAccTrim.x + aa, dHem); tb = max(tb, b); rel += b * sin(clamp(dHem / fAccTrim.x, 0.0, 1.0) * 3.14159); }
      if (fAccTrim.y > 0.0) { float b = 1.0 - smoothstep(fAccTrim.y - aa, fAccTrim.y + aa, dWaist); tb = max(tb, b); rel += b * sin(clamp(dWaist / fAccTrim.y, 0.0, 1.0) * 3.14159); }
      if (fAccTrim.z > 0.0) { float b = 1.0 - smoothstep(fAccTrim.z - aa, fAccTrim.z + aa, dSide); tb = max(tb, b); rel += b * sin(clamp(dSide / fAccTrim.z, 0.0, 1.0) * 3.14159); }
      gS.albedo = mix(gS.albedo, fGold * mix(0.75, 1.0, min(rel, 1.0)), tb); gS.metal = mix(gS.metal, 1.0, tb); gS.rough = mix(gS.rough, 0.2, tb); gS.coat = mix(gS.coat, 0.2, tb);
    }
  }
#endif

  // ---------- glaze pooling / breaking, a little hand-made unevenness
  if (glazed) {
    float k = clamp(pool, -1.0, 1.0);
    // pools: deeper, more saturated colour in hollows; thins: the white body shows through on sharp edges
    vec3 pooled = gS.albedo * mix(vec3(1.0), gS.albedo / max(max(gS.albedo.r, max(gS.albedo.g, gS.albedo.b)), 1e-3), 0.35) * 0.78 * mix(vec3(1.0), FIG_POOL_TINT, gS.metal < 0.5 ? 1.0 : 0.0);
    gS.albedo = mix(gS.albedo, pooled, max(k, 0.0) * 0.6);
    float thin = smoothstep(0.25, 0.9, -k) * (1.0 - gS.metal);
    gS.albedo = mix(gS.albedo, gS.albedo * 1.35 + 0.012, thin * 0.5);
    gS.ao = 1.0 - occl * 0.45;
    float wob = fNoise(fp * 18.0);
    gS.coatRough += (wob - 0.5) * 0.02;
    gS.h += (fNoise(fp * 60.0) - 0.5) * 0.00004;
  }

  // ---------- cracks, chips, the hit ring
  #ifdef FIG_CRACK
  FigCrack fc = figCracks(fp, fPx);
  if (fc.chip > 0.0) {
    float g = fNoise(fp * 500.0);
    gS.albedo = mix(gS.albedo, fBisque * (0.78 + 0.2 * g), fc.chip); gS.rough = mix(gS.rough, 0.9, fc.chip);
    gS.coat = mix(gS.coat, 0.0, fc.chip); gS.metal = mix(gS.metal, 0.0, fc.chip); gS.sss = mix(gS.sss, 0.1, fc.chip);
    gS.h -= fc.chip * 0.0006;
    gS.albedo *= 1.0 - fc.edge * 0.8;
  }
  if (fc.line > 0.0) {
    // a hairline reads dark on pale glaze; on a near-black glaze the pale body shows in the crack
    float lumB = dot(gS.albedo, vec3(0.2126, 0.7152, 0.0722));
    vec3 crackC = mix(fBisque * 0.42, vec3(0.012, 0.008, 0.006), smoothstep(0.015, 0.09, lumB));
    gS.albedo = mix(gS.albedo, crackC, fc.line * 0.92);
    gS.rough = mix(gS.rough, 0.7, fc.line); gS.metal = mix(gS.metal, 0.0, fc.line * 0.8);
    gS.h -= fc.line * 0.00045;
    gS.ccH -= fc.line * 0.0009;
  }
  // a faint gold glow in the hairline (kintsugi), stronger the more broken she is
  gS.emissive += fGold * fc.glow * (1.0 - fc.line * 0.6) * 0.16 * fKintsugi * (0.4 + 0.6 * smoothstep(0.0, 0.8, fDamage));
  #endif
  {
    float age = fFlash.w;
    if (age < 1.2) {
      float d = distance(fp, fFlash.xyz);
      float rr = age * 1.4;
      float ring = exp(-pow((d - rr) / (0.012 + age * 0.03), 2.0)) * exp(-age * 5.0);
      float core = exp(-d * d / 0.006) * exp(-age * 12.0);
      gS.emissive += fFlashColor * (ring * 2.6 + core * 6.0);
    }
    if (fHitPop > 0.0) {
      // the whole figurine pops white for a frame or two, brightest where the light already catches it
      gS.emissive += vec3(1.0, 0.94, 0.86) * fHitPop * (0.35 + 0.65 * max(gS.albedo.r, max(gS.albedo.g, gS.albedo.b)));
    }
  }
  // backfaces are the hollow inside of the cast
  #ifdef FIG_BODY
  // the inside of a garment shell: its own colour, in shadow (a lining)
  if (!gl_FrontFacing && fShellL >= 0) { gS.albedo = fLayCol[fShellL].rgb * 0.22 + 0.004; gS.rough = 0.7; gS.coat = 0.0; gS.metal = 0.0; gS.emissive = vec3(0.0); gS.sss = 0.0; gS.ao = 0.5; }
  else
  #endif
  #if !defined(FIG_NO_INTERIOR)
  if (!gl_FrontFacing) { gS.albedo = fInterior; gS.rough = 0.95; gS.coat = 0.0; gS.metal = 0.0; gS.emissive = vec3(0.0); gS.sss = 0.0; gS.ao = 0.4; }
  #endif
  #ifdef FIG_SHARD
  // a shard's broken edges are white bisque; its inner cap is the dim unglazed inside
  if (vEdge > 0.5 && vEdge < 2.5) {
    float g = fNoise(fp * 300.0);
    bool cap = vEdge > 1.5;
    gS.albedo = cap ? fBisque * 0.55 : fBisque * (0.86 + 0.14 * g); gS.rough = 0.92; gS.coat = 0.0; gS.metal = 0.0; gS.sss = 0.25; gS.h = g * 0.0002; gS.ccH = 0.0;
    gS.emissive = vec3(0.0);
  }
  // the shatter lights its own pieces: warm white on the break, fading to a faint sheen (they read in a dark room)
  gS.emissive += vec3(1.0, 0.93, 0.85) * fShardGlow * ((vEdge > 0.5 && vEdge < 2.5) ? 1.0 : 0.55);
  #endif
  gSSS = gS.sss;
}
`;

// ---------------------------------------------------------------------------------------------
const FINISH = {
  gloss: { rough: 0.5, coat: 1.0, coatRough: 0.05 },
  lacquer: { rough: 0.55, coat: 1.0, coatRough: 0.04 },
  satin: { rough: 0.55, coat: 0.5, coatRough: 0.2 },
  matte: { rough: 0.85, coat: 0.0, coatRough: 0.5 },
  gold: { rough: 0.2, coat: 0.15, coatRough: 0.1, metal: 1 },
  silver: { rough: 0.16, coat: 0.15, coatRough: 0.1, metal: 1 },
  chrome: { rough: 0.06, coat: 0.0, coatRough: 0.1, metal: 1 },
  pearl: { rough: 0.25, coat: 1.0, coatRough: 0.05 },
};
export { FINISH };

export function linearColor(c) { return c instanceof THREE.Color ? c.clone() : new THREE.Color(c); }

// kind: 'body' | 'eye' | 'hair' | 'acc'.  U: sharedUniforms().  o: per-kind options.
export function makeGlaze(kind, U, o = {}) {
  const fin = FINISH[o.finish || (kind === 'body' ? 'gloss' : 'gloss')] || FINISH.gloss;
  const m = new THREE.MeshPhysicalMaterial({
    color: linearColor(o.color ?? 0xf7f2ec),
    roughness: o.roughness ?? fin.rough,
    metalness: o.metalness ?? fin.metal ?? 0,
    clearcoat: o.clearcoat ?? fin.coat,
    clearcoatRoughness: o.clearcoatRoughness ?? fin.coatRough,
    side: o.side ?? (kind === 'body' ? THREE.DoubleSide : THREE.FrontSide),
    envMapIntensity: o.envMapIntensity ?? 1.0,
  });
  // glaze is colour under glass: the clearcoat carries the reflections, the base layer's own specular is faint
  if (!(fin.metal > 0) && kind !== 'eye') m.specularIntensity = o.specularIntensity ?? 0.35;
  if (o.normalMap) { m.normalMap = o.normalMap; m.normalScale = new THREE.Vector2(o.normalScale ?? 1, o.normalScale ?? 1); }
  if (o.iridescence) { m.iridescence = o.iridescence; m.iridescenceIOR = 1.45; m.iridescenceThicknessMinimum = 180; m.iridescenceThicknessMaximum = 520; }
  if (o.transparent) { m.transparent = true; m.opacity = o.opacity ?? 1; m.depthWrite = o.depthWrite ?? true; }
  if (o.alphaTest) m.alphaTest = o.alphaTest;
  if (o.alphaToCoverage) m.alphaToCoverage = true;
  const defines = { ['FIG_' + kind.toUpperCase()]: '' };
  if (o.cracks !== false) defines.FIG_CRACK = '';
  if (o.shard) defines.FIG_SHARD = '';
  if (o.interior === false) defines.FIG_NO_INTERIOR = '';
  if (kind === 'body' && o.debugIso !== undefined) defines.FIG_DEBUG_ISO = String(o.debugIso);
  const pt = o.poolTint || [0.96, 0.98, 1.0];
  defines.FIG_POOL_TINT = `vec3(${pt[0].toFixed(3)}, ${pt[1].toFixed(3)}, ${pt[2].toFixed(3)})`;
  m.defines = { ...(m.defines || {}), ...defines };
  let local = o.uniforms || {};
  if (kind === 'body') local = { ...local, fLayN: { value: Math.max(1, o.layers || 1) }, fShellL: { value: o.shell ?? -1 } };
  m.userData.figUniforms = local;
  m.userData.figKind = kind;
  const key = 'fig-' + kind + JSON.stringify(defines) + (o.normalMap ? 'n' : '') + (o.alphaTest ? 'a' : '');
  m.customProgramCacheKey = () => key;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, local);
    let vs = sh.vertexShader, fs = sh.fragmentShader;
    vs = vs.replace('#include <common>', '#include <common>\n' + VERT_PARS)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + VERT_NORMAL)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_POS);
    if (o.shard) vs = vs.replace('#include <skinning_vertex>', '').replace('#include <skinnormal_vertex>', '').replace('#include <skinbase_vertex>', '');
    fs = fs.replace('#include <common>', '#include <common>\nuniform vec3 fRim;\n' + FRAG_PARS)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + FRAG_SURF)
      .replace('#include <color_fragment>', `#include <color_fragment>
        #ifdef USE_MAP
          diffuseColor.rgb = gS.albedo * sampledDiffuseColor.rgb;
        #else
          diffuseColor.rgb = gS.albedo;
        #endif`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(gS.rough, 0.04, 1.0);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = clamp(gS.metal, 0.0, 1.0);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec3 figPos = -vViewPosition; float figPx = max(1e-5, 0.5 * (length(dFdx(vBind.xyz)) + length(dFdy(vBind.xyz))));
          vec2 dH = vec2(dFdx(gS.h), dFdy(gS.h)) / figPx;
          normal = figPerturb(figPos, normal, dH, faceDirection); }`)
      .replace('#include <clearcoat_normal_fragment_maps>', `#include <clearcoat_normal_fragment_maps>
        #ifdef USE_CLEARCOAT
        { vec3 figPos = -vViewPosition; float figPx = max(1e-5, 0.5 * (length(dFdx(vBind.xyz)) + length(dFdy(vBind.xyz))));
          vec2 dH = vec2(dFdx(gS.h * ${kind === 'hair' ? '1.0' : '0.35'} + gS.ccH), dFdy(gS.h * ${kind === 'hair' ? '1.0' : '0.35'} + gS.ccH)) / figPx;
          clearcoatNormal = figPerturb(figPos, ${kind === 'hair' ? 'normal' : 'clearcoatNormal'}, dH, faceDirection); }
        #endif`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += gS.emissive;\n { float figFr = 1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0); totalEmissiveRadiance += fRim * figFr * figFr * figFr * (gl_FrontFacing ? 1.0 : 0.0); }')
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
          material.clearcoat = saturate(gS.coat);
          material.clearcoatRoughness = min(max(gS.coatRough, 0.02) + geometryRoughness, 1.0);
        #endif`)
      .replace('#include <aomap_fragment>', `
        reflectedLight.indirectDiffuse *= gS.ao;
        reflectedLight.indirectSpecular *= mix(1.0, gS.ao, 0.7);
        reflectedLight.directDiffuse *= mix(1.0, gS.ao, 0.4);`)
      .replace('#include <lights_physical_pars_fragment>', LIGHTS_PARS);
    if (o.alphaFn) fs = fs.replace('#include <alphatest_fragment>', o.alphaFn + '\n#include <alphatest_fragment>');
    // extra uniforms an accessory brings (declared from their values)
    const extra = Object.entries(local).filter(([k]) => !/^f(Acc|Lay|Skin|Pool|Mouth|Face|Seam|Groove|Hair|Eye|Lid|Iris|Brow|Jaw|Landmk|Shell)/.test(k));
    if (extra.length) fs = fs.replace('#include <common>', '#include <common>\n' + extra.map(([k, u]) => `uniform ${u.value?.isVector2 ? 'vec2' : u.value?.isVector3 ? 'vec3' : u.value?.isVector4 ? 'vec4' : 'float'} ${k};`).join('\n'));
    sh.vertexShader = vs; sh.fragmentShader = fs;
  };
  return m;
}

// translucent porcelain: a warm, wrapped terminator added to the direct diffuse
const LIGHTS_PARS = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
  'reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );',
  `reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
   {
     float nl = dot( geometryNormal, directLight.direction );
     float wrapNL = saturate( ( nl + 0.45 ) / 1.45 );
     float extra = max( wrapNL - saturate( nl ), 0.0 );
     reflectedLight.directDiffuse += gSSS * extra * directLight.color * material.diffuseContribution * RECIPROCAL_PI * vec3( 1.0, 0.82, 0.7 ) * 1.4;
   }`);
if (!LIGHTS_PARS.includes('wrapNL')) console.warn('figurine: translucency patch did not apply');

// a depth material for shard meshes: each shard is moved by its texels of the transform texture
export function makeShardDepth(U) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.fShardTex = U.fShardTex;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute float aShard; uniform sampler2D fShardTex;
      vec3 figQRot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      { vec4 t0 = texelFetch(fShardTex, ivec2(int(aShard) * 2, 0), 0); vec4 t1 = texelFetch(fShardTex, ivec2(int(aShard) * 2 + 1, 0), 0);
        transformed = figQRot(t1, transformed * t0.w) + t0.xyz; }`);
  };
  m.customProgramCacheKey = () => 'fig-shard-depth';
  return m;
}

// a depth material for shadows that hides broken-off parts too
export function makeDepth(U) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { fOff: U.fOff });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aPart; attribute vec4 aBind; varying vec4 vPart; varying vec3 vB;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPart = aPart; vB = aBind.xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vPart; varying vec3 vB; uniform vec4 fOff;\n' + NOISE)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        { float jag = (fNoise(vB * 70.0) - 0.5) * 0.35 + (fNoise(vB * 210.0) - 0.5) * 0.12; if (dot(vPart, fOff) > 0.5 + jag) discard; }`);
  };
  m.customProgramCacheKey = () => 'fig-depth';
  return m;
}
