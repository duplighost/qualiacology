// The lens: one HDR scene render (MSAA + depth), then
//  1. half-res ambient occlusion from depth (crevices between noodles, under ledges)
//  2. half-res depth of field gather (macro food-photo focus on the hero)
//  3. full-res composite: AO, focus blend, exposure, vignette, tone map, grain.
import * as THREE from 'three';

const VERT = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const COMMON = /* glsl */`
#include <packing>
varying vec2 vUv;
uniform sampler2D tDepth;
uniform float uNear, uFar;
float linZ(vec2 uv) { return -perspectiveDepthToViewZ(textureLod(tDepth, uv, 0.0).x, uNear, uFar); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

const AO_FRAG = COMMON + /* glsl */`
uniform mat4 uInvProj;
uniform mat4 uProj;
uniform vec2 uRes;
uniform float uRadius, uIntensity;
vec3 viewPos(vec2 uv) {
  float d = textureLod(tDepth, uv, 0.0).x;
  vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return v.xyz / v.w;
}
void main() {
  float d = texture2D(tDepth, vUv).x;
  if (d >= 0.9999) { gl_FragColor = vec4(1.0); return; }
  vec3 P = viewPos(vUv);
  vec2 tx = 1.0 / uRes;
  vec3 Pr = viewPos(vUv + vec2(tx.x, 0.0)), Pl = viewPos(vUv - vec2(tx.x, 0.0));
  vec3 Pu = viewPos(vUv + vec2(0.0, tx.y)), Pd = viewPos(vUv - vec2(0.0, tx.y));
  vec3 dx = abs(Pr.z - P.z) < abs(P.z - Pl.z) ? Pr - P : P - Pl;
  vec3 dy = abs(Pu.z - P.z) < abs(P.z - Pd.z) ? Pu - P : P - Pd;
  vec3 N = normalize(cross(dx, dy));
  float rpx = clamp(uRadius * uProj[1][1] * 0.5 * uRes.y / -P.z, 2.0, 60.0);
  float rnd = hash12(vUv * uRes) * 6.2831;
  float ao = 0.0;
  const int S = 12;
  for (int i = 0; i < S; i++) {
    float fi = float(i) + 0.5;
    float r = rpx * sqrt(fi / float(S));
    float a = fi * 2.39996 + rnd;
    vec2 suv = vUv + vec2(cos(a), sin(a)) * r * tx;
    vec3 v = viewPos(suv) - P;
    float vv = dot(v, v);
    float nv = dot(N, v) * inversesqrt(vv + 1e-5);
    ao += max(0.0, nv - 0.1) * (1.0 - smoothstep(0.0, uRadius * uRadius * 1.6, vv));
  }
  ao = clamp(1.0 - uIntensity * ao / float(S) * 1.8, 0.0, 1.0);
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}`;

const BLUR_FRAG = COMMON + /* glsl */`
uniform sampler2D tAO;
uniform vec2 uDir;
uniform vec2 uRes;
void main() {
  float zc = linZ(vUv);
  float sum = 0.0, wsum = 0.0;
  for (int i = -3; i <= 3; i++) {
    vec2 uv = vUv + uDir * float(i) / uRes;
    float z = linZ(uv);
    float w = exp(-float(i * i) * 0.18) * exp(-abs(z - zc) / (0.02 * zc + 0.05) );
    sum += textureLod(tAO, uv, 0.0).r * w; wsum += w;
  }
  float a = sum / max(wsum, 1e-4);
  gl_FragColor = vec4(a, a, a, 1.0);
}`;

const COC = /* glsl */`
uniform float uFocus, uAperture, uMaxCoC;
// signed circle of confusion in half-res pixels: + behind focus, - in front
float coc(float z) {
  float dz = z - uFocus;
  float band = uFocus * 0.45 + 1.5;
  float e = sign(dz) * max(abs(dz) - band, 0.0);
  float c = uAperture * e / max(z, 0.05);
  c = c > 0.0 ? c : c * 1.3;
  return clamp(c, -uMaxCoC, uMaxCoC);
}`;

// half-res prefilter: color * AO in rgb, signed circle of confusion in alpha
const PRE_FRAG = COMMON + COC + /* glsl */`
uniform sampler2D tColor;
uniform sampler2D tAO;
uniform float uAOMix;
void main() {
  vec3 c = texture2D(tColor, vUv).rgb * mix(1.0, texture2D(tAO, vUv).r, uAOMix);
  gl_FragColor = vec4(c, coc(linZ(vUv)));
}`;

// gather: one read per tap from the prefiltered buffer
const DOF_FRAG = /* glsl */`
varying vec2 vUv;
uniform sampler2D tPre;
uniform vec2 uRes;
uniform float uMaxCoC;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec4 c0 = textureLod(tPre, vUv, 0.0);
  float cc = c0.a;
  vec3 acc = c0.rgb; float wsum = 1.0;
  const int S = 24;
  float rnd = hash12(vUv * uRes) * 6.2831;
  for (int i = 0; i < S; i++) {
    float fi = float(i) + 0.5;
    float r = sqrt(fi / float(S)) * uMaxCoC;
    float a = fi * 2.39996 + rnd;
    vec4 s = textureLod(tPre, vUv + vec2(cos(a), sin(a)) * r / uRes, 0.0);
    float reach = s.a > cc ? min(abs(s.a), abs(cc) + 0.5) : abs(s.a);
    float w = smoothstep(r - 1.2, r + 0.4, reach);
    acc += s.rgb * w; wsum += w;
  }
  gl_FragColor = vec4(acc / wsum, abs(cc));
}`;

// bloom: bright parts of the half-res image, blurred at quarter res
const BRIGHT_FRAG = /* glsl */`
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uThreshold;
void main() {
  vec3 c = vec3(0.0);
  c += textureLod(tSrc, vUv + uTexel * vec2(-0.5, -0.5), 0.0).rgb;
  c += textureLod(tSrc, vUv + uTexel * vec2( 0.5, -0.5), 0.0).rgb;
  c += textureLod(tSrc, vUv + uTexel * vec2(-0.5,  0.5), 0.0).rgb;
  c += textureLod(tSrc, vUv + uTexel * vec2( 0.5,  0.5), 0.0).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  float k = clamp((l - uThreshold) / max(l, 1e-4), 0.0, 1.0);
  gl_FragColor = vec4(c * k * k, 1.0);
}`;
const GAUSS_FRAG = /* glsl */`
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uDir;
void main() {
  vec3 c = textureLod(tSrc, vUv, 0.0).rgb * 0.2270270270;
  c += textureLod(tSrc, vUv + uDir * 1.3846153846, 0.0).rgb * 0.3162162162;
  c += textureLod(tSrc, vUv - uDir * 1.3846153846, 0.0).rgb * 0.3162162162;
  c += textureLod(tSrc, vUv + uDir * 3.2307692308, 0.0).rgb * 0.0702702703;
  c += textureLod(tSrc, vUv - uDir * 3.2307692308, 0.0).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}`;

const FINAL_FRAG = COMMON + COC + /* glsl */`
uniform sampler2D tColor;
uniform sampler2D tAO;
uniform sampler2D tDOF;
uniform sampler2D tBloom;
uniform float uBloom;
uniform vec2 uRes;
uniform float uAOMix, uExposure, uVignette, uGrain, uTime, uSat, uDofOn, uFade;
uniform vec3 uTint;
void main() {
  vec3 c = texture2D(tColor, vUv).rgb * mix(1.0, texture2D(tAO, vUv).r, uAOMix);
  if (uDofOn > 0.5) {
    float cc = abs(coc(linZ(vUv)));
    vec4 b = texture2D(tDOF, vUv);
    float m = smoothstep(0.45, 1.6, max(cc, b.a * 0.85));
    c = mix(c, b.rgb, m);
  }
  c += texture2D(tBloom, vUv).rgb * uBloom;
  c *= uExposure * uTint;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = max(mix(vec3(l), c, uSat), 0.0);
  vec2 q = vUv - 0.5;
  c *= 1.0 - uVignette * smoothstep(0.1, 0.85, dot(q, q) * 2.2);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  float g = hash12(vUv * uRes + fract(uTime * 7.13) * 251.0) - 0.5;
  gl_FragColor.rgb += g * uGrain * (1.0 - gl_FragColor.rgb * 0.6);
  gl_FragColor.rgb *= uFade;
}`;

export class Post {
  constructor(renderer) {
    this.r = renderer;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(g);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    const base = () => ({ tDepth: { value: null }, uNear: { value: 0.1 }, uFar: { value: 1000 }, uRes: { value: new THREE.Vector2() } });
    const coc = () => ({ uFocus: { value: 8 }, uAperture: { value: 5 }, uMaxCoC: { value: 7 } });
    const mk = (frag, uniforms, toneMapped = false) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped });
    this.aoMat = mk(AO_FRAG, { ...base(), uInvProj: { value: new THREE.Matrix4() }, uProj: { value: new THREE.Matrix4() }, uRadius: { value: 0.7 }, uIntensity: { value: 1.0 } });
    this.blurMat = mk(BLUR_FRAG, { ...base(), tAO: { value: null }, uDir: { value: new THREE.Vector2(1, 0) } });
    this.preMat = mk(PRE_FRAG, { ...base(), ...coc(), tColor: { value: null }, tAO: { value: null }, uAOMix: { value: 0.75 } });
    this.dofMat = mk(DOF_FRAG, { tPre: { value: null }, uRes: { value: new THREE.Vector2() }, uMaxCoC: { value: 6 } });
    this.brightMat = mk(BRIGHT_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1.2 } });
    this.gaussMat = mk(GAUSS_FRAG, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.finalMat = mk(FINAL_FRAG, { ...base(), ...coc(), tColor: { value: null }, tAO: { value: null }, tDOF: { value: null }, tBloom: { value: null }, uBloom: { value: 0.12 },
      uAOMix: { value: 0.75 }, uExposure: { value: 1 }, uVignette: { value: 0.35 }, uGrain: { value: 0.035 }, uTime: { value: 0 },
      uSat: { value: 1.04 }, uTint: { value: new THREE.Color(1, 1, 1) }, uDofOn: { value: 1 }, uFade: { value: 1 } }, true);
    this.params = { focus: 8, aperture: 4.2, maxCoC: 6, aoMix: 0.75, aoRadius: 0.7, aoIntensity: 1.0, exposure: 1, vignette: 0.35, grain: 0.035, sat: 1.04, dof: true, fade: 1, bloom: 0.12, bloomThreshold: 1.15 };
    this.w = this.h = 0;
  }

  setSize(w, h) {
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.main?.dispose(); this.aoA?.dispose(); this.aoB?.dispose(); this.dof?.dispose(); this.pre?.dispose(); this.blA?.dispose(); this.blB?.dispose();
    const depthTexture = new THREE.DepthTexture(w, h);
    depthTexture.type = THREE.UnsignedIntType;
    this.main = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4, depthTexture, depthBuffer: true });
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    const half = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.aoA = new THREE.WebGLRenderTarget(hw, hh, half);
    this.aoB = new THREE.WebGLRenderTarget(hw, hh, half);
    this.dof = new THREE.WebGLRenderTarget(hw, hh, half);
    this.pre = new THREE.WebGLRenderTarget(hw, hh, half);
    const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
    this.blA = new THREE.WebGLRenderTarget(qw, qh, half); this.blB = new THREE.WebGLRenderTarget(qw, qh, half);
    this.qw = qw; this.qh = qh;
    this.hw = hw; this.hh = hh;
  }

  pass(mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.scene, this.cam);
  }

  render(scene, camera, time) {
    const r = this.r, p = this.params;
    r.setRenderTarget(this.main);
    r.render(scene, camera);
    const depth = this.main.depthTexture;
    const setBase = (m, w, h) => { m.uniforms.tDepth.value = depth; m.uniforms.uNear.value = camera.near; m.uniforms.uFar.value = camera.far; m.uniforms.uRes.value.set(w, h); };
    const setCoc = (m, scale) => { m.uniforms.uFocus.value = p.focus; m.uniforms.uAperture.value = p.aperture * scale; m.uniforms.uMaxCoC.value = p.maxCoC * scale; };
    // AO
    setBase(this.aoMat, this.hw, this.hh);
    this.aoMat.uniforms.uProj.value.copy(camera.projectionMatrix);
    this.aoMat.uniforms.uInvProj.value.copy(camera.projectionMatrixInverse);
    this.aoMat.uniforms.uRadius.value = p.aoRadius; this.aoMat.uniforms.uIntensity.value = p.aoIntensity;
    this.pass(this.aoMat, this.aoA);
    setBase(this.blurMat, this.hw, this.hh);
    this.blurMat.uniforms.tAO.value = this.aoA.texture; this.blurMat.uniforms.uDir.value.set(1, 0);
    this.pass(this.blurMat, this.aoB);
    this.blurMat.uniforms.tAO.value = this.aoB.texture; this.blurMat.uniforms.uDir.value.set(0, 1);
    this.pass(this.blurMat, this.aoA);
    // DOF (half res)
    if (p.dof) {
      setBase(this.preMat, this.hw, this.hh); setCoc(this.preMat, 1);
      this.preMat.uniforms.tColor.value = this.main.texture; this.preMat.uniforms.tAO.value = this.aoA.texture; this.preMat.uniforms.uAOMix.value = p.aoMix;
      this.pass(this.preMat, this.pre);
      this.dofMat.uniforms.tPre.value = this.pre.texture; this.dofMat.uniforms.uRes.value.set(this.hw, this.hh); this.dofMat.uniforms.uMaxCoC.value = p.maxCoC;
      this.pass(this.dofMat, this.dof);
      // bloom from the prefiltered half-res image
      this.brightMat.uniforms.tSrc.value = this.pre.texture; this.brightMat.uniforms.uTexel.value.set(1 / this.hw, 1 / this.hh); this.brightMat.uniforms.uThreshold.value = p.bloomThreshold;
      this.pass(this.brightMat, this.blA);
      for (let k = 0; k < 2; k++) {
        this.gaussMat.uniforms.tSrc.value = this.blA.texture; this.gaussMat.uniforms.uDir.value.set((1 + k) / this.qw, 0); this.pass(this.gaussMat, this.blB);
        this.gaussMat.uniforms.tSrc.value = this.blB.texture; this.gaussMat.uniforms.uDir.value.set(0, (1 + k) / this.qh); this.pass(this.gaussMat, this.blA);
      }
    }
    // composite to screen
    const f = this.finalMat;
    setBase(f, this.w, this.h); setCoc(f, 1);
    f.uniforms.tColor.value = this.main.texture; f.uniforms.tAO.value = this.aoA.texture; f.uniforms.tDOF.value = this.dof.texture;
    f.uniforms.uAOMix.value = p.aoMix; f.uniforms.uExposure.value = p.exposure; f.uniforms.uVignette.value = p.vignette;
    f.uniforms.uGrain.value = p.grain; f.uniforms.uTime.value = time; f.uniforms.uSat.value = p.sat; f.uniforms.uDofOn.value = p.dof ? 1 : 0;
    f.uniforms.uFade.value = p.fade;
    f.uniforms.tBloom.value = this.blA.texture; f.uniforms.uBloom.value = p.dof ? p.bloom : 0;
    this.pass(f, null);
  }
}
