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
uniform sampler2D tScene, tBloom; uniform vec2 uRes; uniform float uBloom, uExposure, uTime, uSpeed, uSat, uVig, uFlash, uGrain, uAberr, uDesat;
uniform vec3 uTint, uFlashColor, uLift;
varying vec2 vUv;
vec3 aces(vec3 x){ // ACES fitted (Hill)
  const mat3 i = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 o = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  vec3 v = i * x; vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return clamp(o * (a / b), 0.0, 1.0);
}
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  vec2 uv = vUv;
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
  vec3 bloom = texture2D(tBloom, uv).rgb;
  col += bloom * uBloom;
  col += uFlashColor * uFlash;
  col *= uExposure * uTint;
  col = aces(col);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);
  col = mix(col, vec3(l) * vec3(0.8, 0.85, 1.0), uDesat);
  col += uLift * (1.0 - col);
  // vignette
  col *= 1.0 - uVig * smoothstep(0.35, 1.05, r);
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
        uAberr: { value: 0.0 }, uDesat: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) }, uFlashColor: { value: new THREE.Color(1, 0.6, 0.85) },
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
