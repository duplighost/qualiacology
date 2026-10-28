// HDR pipeline: the scene renders into a float target, bright things bloom
// through a mip chain, then one composite pass tone-maps and grades it, adds
// the speed blur at the edges, a vignette and a little grain.

import * as THREE from 'three';

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const DOWN = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uPrefilter, uThreshold, uKnee;
varying vec2 vUv;
vec3 pf(vec3 c){
  if (uPrefilter < 0.5) return c;
  float br = max(c.r, max(c.g, c.b));
  float rq = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  rq = (rq * rq) / (4.0 * uKnee + 1e-4);
  return c * max(rq, br - uThreshold) / max(br, 1e-4);
}
void main(){
  vec2 t = uTexel;
  vec3 a = texture2D(tSrc, vUv + t * vec2(-2.0,  2.0)).rgb, b = texture2D(tSrc, vUv + t * vec2(0.0, 2.0)).rgb, c = texture2D(tSrc, vUv + t * vec2(2.0, 2.0)).rgb;
  vec3 d = texture2D(tSrc, vUv + t * vec2(-2.0, 0.0)).rgb, e = texture2D(tSrc, vUv).rgb, f = texture2D(tSrc, vUv + t * vec2(2.0, 0.0)).rgb;
  vec3 g = texture2D(tSrc, vUv + t * vec2(-2.0, -2.0)).rgb, h = texture2D(tSrc, vUv + t * vec2(0.0, -2.0)).rgb, i = texture2D(tSrc, vUv + t * vec2(2.0, -2.0)).rgb;
  vec3 j = texture2D(tSrc, vUv + t * vec2(-1.0, 1.0)).rgb, k = texture2D(tSrc, vUv + t * vec2(1.0, 1.0)).rgb;
  vec3 l = texture2D(tSrc, vUv + t * vec2(-1.0, -1.0)).rgb, m = texture2D(tSrc, vUv + t * vec2(1.0, -1.0)).rgb;
  vec3 o = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  gl_FragColor = vec4(min(pf(o), vec3(60.0)), 1.0);
}`;

const UP = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uScatter;
varying vec2 vUv;
void main(){
  vec2 t = uTexel * uScatter;
  vec3 s = texture2D(tSrc, vUv + vec2(-t.x, t.y)).rgb + 2.0 * texture2D(tSrc, vUv + vec2(0.0, t.y)).rgb + texture2D(tSrc, vUv + vec2(t.x, t.y)).rgb
         + 2.0 * texture2D(tSrc, vUv + vec2(-t.x, 0.0)).rgb + 4.0 * texture2D(tSrc, vUv).rgb + 2.0 * texture2D(tSrc, vUv + vec2(t.x, 0.0)).rgb
         + texture2D(tSrc, vUv + vec2(-t.x, -t.y)).rgb + 2.0 * texture2D(tSrc, vUv + vec2(0.0, -t.y)).rgb + texture2D(tSrc, vUv + vec2(t.x, -t.y)).rgb;
  gl_FragColor = vec4(s / 16.0, 1.0);
}`;

const COMP = /* glsl */`
uniform sampler2D tScene, tBloom; uniform vec2 uRes; uniform float uBloom, uExposure, uTime, uSpeed, uSat, uVig, uFlash, uGrain, uAberr, uDesat, uDaze, uFever;
uniform float uGroovy, uGBeat, uGBar, uGBeatN;
uniform vec3 uTint, uFlashColor, uLift;
varying vec2 vUv;
vec3 aces(vec3 x){ // ACES fitted (Hill)
  const mat3 i = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 o = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  vec3 v = i * x; vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return clamp(o * (a / b), 0.0, 1.0);
}
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
vec3 hueRot(vec3 c, float a){ const vec3 k = vec3(0.57735); float ca = cos(a); return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca); }
vec3 rainbow(float h){ return 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + h)); }
void main(){
  vec2 uv = vUv;
  // dazed: the room tilting a little and swimming
  if (uDaze > 0.001) {
    float a = sin(uTime * 0.7) * 0.022 * uDaze, asp = uRes.x / uRes.y;
    vec2 c = uv - 0.5; c.x *= asp;
    c = mat2(cos(a), -sin(a), sin(a), cos(a)) * c; c.x /= asp;
    uv = c + 0.5 + vec2(sin(uTime * 1.3 + uv.y * 4.0), cos(uTime * 1.1 + uv.x * 3.0)) * 0.004 * uDaze;
  }
  // Groovy: the picture breathes out on every beat and swims at its edges (the middle, where she
  // and the road ahead are, stays steady enough to ride)
  float gk = uGroovy, kick = exp(-uGBeat * 5.0), gr = 0.0, gedge = 0.0;
  if (gk > 0.001) {
    vec2 c0 = uv - vec2(0.5, 0.46), ca = c0 * vec2(uRes.x / uRes.y, 1.0);
    gr = length(ca); gedge = smoothstep(0.12, 0.62, gr);
    float ga = atan(ca.y, ca.x);
    uv = vec2(0.5, 0.46) + c0 * (1.0 - 0.02 * kick * gk);
    uv += gk * gedge * 0.011 * vec2(sin(ga * 5.0 + uTime * 2.3 + gr * 14.0), cos(ga * 4.0 - uTime * 1.9 + gr * 11.0));
  }
  vec2 dc = uv - 0.5;
  float r = length(dc * vec2(uRes.x / uRes.y, 1.0));
  // speed blur: smear toward the centre, only at the edges
  vec3 col = vec3(0.0);
  float sb = uSpeed * smoothstep(0.18, 0.75, r);
  const int N = 8;
  float wsum = 0.0;
  for (int k = 0; k < N; k++) {
    float f = float(k) / float(N - 1);
    vec2 o = dc * (f * 0.06 * sb);
    float w = 1.0 - f * 0.5;
    vec3 c;
    c.r = texture2D(tScene, uv - o * (1.0 + uAberr)).r;
    c.g = texture2D(tScene, uv - o).g;
    c.b = texture2D(tScene, uv - o * (1.0 - uAberr)).b;
    col += c * w; wsum += w;
  }
  col /= wsum;
  // and seeing double
  if (uDaze > 0.001) {
    vec2 g = vec2(sin(uTime * 0.9), cos(uTime * 0.6) * 0.5) * 0.02 * uDaze;
    vec3 ghost = vec3(texture2D(tScene, uv + g * 1.25).r, texture2D(tScene, uv + g).g, texture2D(tScene, uv + g * 0.75).b);
    col = mix(col, ghost, 0.42 * uDaze);
  }
  vec3 bloom = texture2D(tBloom, uv).rgb;
  col += bloom * uBloom * (1.0 + 0.8 * uDaze);
  col += uFlashColor * uFlash;
  col *= uExposure * uTint;
  col = aces(col);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);
  col = mix(col, vec3(l) * vec3(0.8, 0.85, 1.0), uDesat);
  // Groovy's colours: the wheel turns once a bar, further out the further from the middle; a ring of
  // rainbow runs out from her on every beat; and everything a little more saturated
  if (gk > 0.001) {
    col = mix(col, hueRot(col, 6.2832 * (uGBar + 0.22 * gr)), gk * (0.3 + 0.5 * gedge));
    float ring = exp(-pow((gr - uGBeat * 1.15) / 0.07, 2.0)) * (1.0 - uGBeat);
    col += rainbow(uGBeatN * 0.13 + gr * 0.9 - uTime * 0.2) * ring * gk * 0.3 * (0.25 + 0.75 * gedge);
    float l2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(l2), col, 1.0 + 0.4 * gk);
  }
  col += uLift * (1.0 - col);
  // vignette
  col *= 1.0 - (uVig + 0.45 * uDaze) * smoothstep(0.35 - 0.15 * uDaze, 1.05, r);
  // fever (a run at x4): a band round the screen's edges burns gold, breathing with the beat (as
  // wide on every side, whatever the screen's shape)
  // (Groovy turns it to a rainbow running round the screen)
  float fe = smoothstep(0.84, 1.0, max(abs(dc.x), abs(dc.y)) * 2.0);
  vec3 fc = vec3(1.0, 0.6, 0.12);
  if (gk > 0.001) fc = mix(fc, rainbow(atan(dc.y, dc.x) / 6.2832 - uTime * 0.45) * 1.2, gk);
  col += fc * uFever * fe * fe * 0.7;
  col = srgb(col);
  col += (h12(gl_FragCoord.xy + fract(uTime) * 917.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

export class Post {
  constructor(renderer) {
    this.r = renderer;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.qs = new THREE.Scene(); this.qs.add(this.quad);
    this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.down = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uPrefilter: { value: 0 }, uThreshold: { value: 1.25 }, uKnee: { value: 0.5 } }, vertexShader: VS, fragmentShader: DOWN, depthTest: false, depthWrite: false });
    this.up = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uScatter: { value: 1.0 } }, vertexShader: VS, fragmentShader: UP, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true });
    this.comp = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null }, tBloom: { value: null }, uRes: { value: new THREE.Vector2() }, uBloom: { value: 0.9 }, uExposure: { value: 1.0 },
        uTime: { value: 0 }, uSpeed: { value: 0 }, uSat: { value: 1.12 }, uVig: { value: 0.55 }, uFlash: { value: 0 }, uGrain: { value: 0.035 },
        uAberr: { value: 0.0 }, uDesat: { value: 0 }, uDaze: { value: 0 }, uFever: { value: 0 },
        uGroovy: { value: 0 }, uGBeat: { value: 0 }, uGBar: { value: 0 }, uGBeatN: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) }, uFlashColor: { value: new THREE.Color(1, 0.6, 0.85) },
        uLift: { value: new THREE.Color(0.012, 0.006, 0.02) },
      },
      vertexShader: VS, fragmentShader: COMP, depthTest: false, depthWrite: false,
    });
    this.levels = 6;
    this.mips = [];
    this.setSize(1, 1, 1);
  }

  setSize(w, h, pr) {
    const W = Math.max(1, Math.floor(w * pr)), H = Math.max(1, Math.floor(h * pr));
    this.W = W; this.H = H;
    if (this.scene) this.scene.dispose();
    this.scene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
    this.scene.texture.minFilter = THREE.LinearFilter; this.scene.texture.magFilter = THREE.LinearFilter;
    this.mips.forEach((m) => m.dispose());
    this.mips = [];
    let mw = W, mh = H;
    for (let i = 0; i < this.levels; i++) {
      mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1);
      const rt = new THREE.WebGLRenderTarget(mw, mh, { type: THREE.HalfFloatType, depthBuffer: false });
      rt.texture.minFilter = THREE.LinearFilter; rt.texture.magFilter = THREE.LinearFilter;
      this.mips.push(rt);
    }
    this.comp.uniforms.uRes.value.set(W, H);
  }

  _pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qs, this.qc); }

  render(scene, camera) {
    const r = this.r;
    r.setRenderTarget(this.scene);
    r.render(scene, camera);
    // bloom down
    let src = this.scene.texture, sw = this.W, sh = this.H;
    for (let i = 0; i < this.levels; i++) {
      this.down.uniforms.tSrc.value = src;
      this.down.uniforms.uTexel.value.set(1 / sw, 1 / sh);
      this.down.uniforms.uPrefilter.value = i === 0 ? 1 : 0;
      this._pass(this.down, this.mips[i]);
      src = this.mips[i].texture; sw = this.mips[i].width; sh = this.mips[i].height;
    }
    // bloom up (additive into the next larger level)
    const ac = r.autoClear; r.autoClear = false;
    for (let i = this.levels - 1; i > 0; i--) {
      this.up.uniforms.tSrc.value = this.mips[i].texture;
      this.up.uniforms.uTexel.value.set(1 / this.mips[i].width, 1 / this.mips[i].height);
      this._pass(this.up, this.mips[i - 1]);
    }
    r.autoClear = ac;
    this.comp.uniforms.tScene.value = this.scene.texture;
    this.comp.uniforms.tBloom.value = this.mips[0].texture;
    this._pass(this.comp, null);
  }
}
