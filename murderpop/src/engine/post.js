// HDR scene -> bloom (mip chain) -> one composite pass:
// exposure, a light sharpen, filmic tone map, grade (lift/gamma/gain, saturation, split tone), vignette, chromatic
// aberration (off unless something pushes it), flash, desaturate, a glitch (a brief colour split; no scanlines),
// letterbox, grain (off unless a room asks). Everything the fight wants to push on the picture is a number on
// `post.fx`. Alex, 7 Nov: no old-TV look in the fights, sharper.
import * as THREE from 'three';

// The game's own glowing things (telegraphs, shots, sparks, trails, the spotlight) are drawn in absolute HDR
// colours, but a dark room raises its exposure to show the set. FXK keeps them from blowing out there (and from
// going dim in a bright room): shaders multiply their colour by it. Updated from the exposure every frame.
export const FXK = { value: 1 };

const FS_QUAD_VS = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const DOWN_FS = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold; uniform float uFirst;
varying vec2 vUv;
vec3 prefilter(vec3 c) {
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + 0.5, 0.0, 1.0); soft = soft * soft * 0.5;
  float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
  return c * contrib;
}
void main() {
  // 13-tap downsample (Call of Duty: Advanced Warfare)
  vec2 t = uTexel;
  vec3 a = texture2D(tSrc, vUv + t * vec2(-2.0, 2.0)).rgb, b = texture2D(tSrc, vUv + t * vec2(0.0, 2.0)).rgb, c = texture2D(tSrc, vUv + t * vec2(2.0, 2.0)).rgb;
  vec3 d = texture2D(tSrc, vUv + t * vec2(-2.0, 0.0)).rgb, e = texture2D(tSrc, vUv).rgb, f = texture2D(tSrc, vUv + t * vec2(2.0, 0.0)).rgb;
  vec3 g = texture2D(tSrc, vUv + t * vec2(-2.0, -2.0)).rgb, h = texture2D(tSrc, vUv + t * vec2(0.0, -2.0)).rgb, i = texture2D(tSrc, vUv + t * vec2(2.0, -2.0)).rgb;
  vec3 j = texture2D(tSrc, vUv + t * vec2(-1.0, 1.0)).rgb, k = texture2D(tSrc, vUv + t * vec2(1.0, 1.0)).rgb;
  vec3 l = texture2D(tSrc, vUv + t * vec2(-1.0, -1.0)).rgb, m = texture2D(tSrc, vUv + t * vec2(1.0, -1.0)).rgb;
  vec3 o = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  if (uFirst > 0.5) o = prefilter(min(o, vec3(64.0)));
  gl_FragColor = vec4(o, 1.0);
}`;

const UP_FS = /* glsl */`
uniform sampler2D tSrc; uniform sampler2D tPrev; uniform vec2 uTexel; uniform float uRadius;
varying vec2 vUv;
void main() {
  vec2 t = uTexel * uRadius;
  vec3 s = texture2D(tSrc, vUv + vec2(-t.x, t.y)).rgb + texture2D(tSrc, vUv + vec2(0.0, t.y)).rgb * 2.0 + texture2D(tSrc, vUv + t).rgb
    + texture2D(tSrc, vUv + vec2(-t.x, 0.0)).rgb * 2.0 + texture2D(tSrc, vUv).rgb * 4.0 + texture2D(tSrc, vUv + vec2(t.x, 0.0)).rgb * 2.0
    + texture2D(tSrc, vUv - t).rgb + texture2D(tSrc, vUv + vec2(0.0, -t.y)).rgb * 2.0 + texture2D(tSrc, vUv + vec2(t.x, -t.y)).rgb;
  gl_FragColor = vec4(texture2D(tPrev, vUv).rgb + s / 16.0, 1.0);
}`;

const COMPOSITE_FS = /* glsl */`
uniform sampler2D tScene; uniform sampler2D tBloom;
uniform vec2 uRes; uniform float uTime;
uniform float uExposure, uBloom, uSat, uContrast, uVignette, uCA, uGrain, uDesat, uVHS, uLetterbox, uFade, uSharp;
uniform vec3 uLift, uGamma, uGain, uShadowTint, uHighTint, uFlash, uFade3;
uniform vec2 uFocus; uniform float uFocusK;
varying vec2 vUv;
// a hash with no sin() in it (sin of big numbers turns into moving stripes on some GPUs)
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// AgX-ish filmic curve (Troy Sobotka's AgX approximation, as in three.js)
vec3 agx(vec3 color) {
  const mat3 inMat = mat3(0.856627153315983, 0.137318972929847, 0.11189821299995, 0.0951212405381588, 0.761241990602591, 0.0767994186031903, 0.0482516061458583, 0.101439036467562, 0.811302368396859);
  const mat3 outMat = mat3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826, -0.11060664309660323, 1.157823702216272, -0.11060664309660294, -0.016493938717834573, -0.016493938717834257, 1.2519364065950405);
  const float minEv = -12.47393, maxEv = 4.026069;
  color = inMat * color;
  color = max(color, 1e-10);
  color = clamp(log2(color), minEv, maxEv);
  color = (color - minEv) / (maxEv - minEv);
  vec3 x2 = color * color, x4 = x2 * x2;
  color = 15.5 * x4 * x2 - 40.14 * x4 * color + 31.96 * x4 - 6.868 * x2 * color + 0.4298 * x2 + 0.1191 * color - 0.00232;
  color = outMat * color;
  color = pow(max(vec3(0.0), color), vec3(2.2));
  return color;
}
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  vec2 uv = vUv;
  vec2 dc = uv - 0.5;
  float r2 = dot(dc, dc);
  vec3 col = texture2D(tScene, uv).rgb;
  // a light sharpen on brightness only (no colour fringes, halos held down)
  if (uSharp > 0.0) {
    vec2 px = 1.0 / uRes;
    vec3 n = (texture2D(tScene, uv + vec2(px.x, 0.0)).rgb + texture2D(tScene, uv - vec2(px.x, 0.0)).rgb + texture2D(tScene, uv + vec2(0.0, px.y)).rgb + texture2D(tScene, uv - vec2(0.0, px.y)).rgb) * 0.25;
    float L = dot(col, vec3(0.2126, 0.7152, 0.0722)), Ln = dot(n, vec3(0.2126, 0.7152, 0.0722));
    col *= clamp(1.0 + uSharp * (L - Ln) / max(L, 0.04), 0.8, 1.3);
  }
  // colour split: only while something pushes it (a big hit for a moment, a glitch), never resting on the picture
  float ca = uCA * (0.25 + r2 * 3.0) + uVHS * 0.003;
  if (ca > 0.00002) {
    vec2 o = dc * ca + vec2(uVHS * 0.004, 0.0);
    col.r = texture2D(tScene, uv + o).r;
    col.b = texture2D(tScene, uv - o).b;
  }
  vec3 bloom = texture2D(tBloom, uv).rgb;
  col += bloom * uBloom;
  col *= uExposure;
  float flashEdge = smoothstep(0.1, 0.8, length(dc * vec2(uRes.x / uRes.y, 1.0)));
  col *= 1.0 + uFlash * 1.6;
  col += uFlash * 0.22 * flashEdge;
  col = agx(col);
  // grade in display-ish space
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);
  col = (col - 0.5) * uContrast + 0.5;
  col = mix(col * uShadowTint, col * uHighTint, smoothstep(0.0, 0.8, l));
  col = pow(max(vec3(0.0), col * uGain + uLift * (1.0 - col)), 1.0 / max(uGamma, vec3(0.01)));
  float ld = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, vec3(ld) * vec3(1.0, 0.96, 0.92), uDesat);
  // vignette (and an optional focus point that darkens everything else: the spotlight)
  float v = smoothstep(0.95, 0.25, length(dc * vec2(uRes.x / uRes.y, 1.0)) * 0.9);
  col *= mix(1.0, v, uVignette);
  if (uFocusK > 0.0) {
    vec2 fd = (vUv - uFocus) * vec2(uRes.x / uRes.y, 1.0);
    col *= mix(1.0, smoothstep(0.55, 0.12, length(fd)) * 0.85 + 0.15, uFocusK);
  }
  // grain, stronger in the shadows (only where a room asks for it)
  if (uGrain > 0.0) { float gr = hash(floor(vUv * uRes) + floor(fract(uTime * 7.31) * 97.0) * vec2(13.0, 7.0)) - 0.5; col += gr * uGrain * (1.0 - ld * 0.7); }
  col = mix(col, uFade3, uFade);
  // letterbox
  float lb = uLetterbox * 0.12;
  if (vUv.y < lb || vUv.y > 1.0 - lb) col = vec3(0.0);
  gl_FragColor = vec4(toSRGB(clamp(col, 0.0, 1.0)), 1.0);
}`;

export class Post {
  constructor(renderer) {
    this.r = renderer;
    this.scale = 1;
    const quad = new THREE.BufferGeometry();
    quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    quad.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.mesh = new THREE.Mesh(quad);
    this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.mesh);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.down = new THREE.ShaderMaterial({ vertexShader: FS_QUAD_VS, fragmentShader: DOWN_FS, uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1.0 }, uFirst: { value: 0 } }, depthTest: false, depthWrite: false });
    this.up = new THREE.ShaderMaterial({ vertexShader: FS_QUAD_VS, fragmentShader: UP_FS, uniforms: { tSrc: { value: null }, tPrev: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1.0 } }, depthTest: false, depthWrite: false });
    this.fx = {
      exposure: 1.0, bloom: 0.6, threshold: 1.0, saturation: 1.0, contrast: 1.0, vignette: 0.55, ca: 0, grain: 0, sharpen: 0.4,
      desat: 0, vhs: 0, letterbox: 0, fade: 0, fadeColor: new THREE.Color(0, 0, 0),
      lift: new THREE.Color(0, 0, 0), gamma: new THREE.Color(1, 1, 1), gain: new THREE.Color(1, 1, 1),
      shadowTint: new THREE.Color(1, 1, 1), highTint: new THREE.Color(1, 1, 1),
      flash: new THREE.Color(0, 0, 0), focus: new THREE.Vector2(0.5, 0.5), focusK: 0,
    };
    this.comp = new THREE.ShaderMaterial({
      vertexShader: FS_QUAD_VS, fragmentShader: COMPOSITE_FS, depthTest: false, depthWrite: false,
      uniforms: {
        tScene: { value: null }, tBloom: { value: null }, uRes: { value: new THREE.Vector2() }, uTime: { value: 0 },
        uExposure: { value: 1 }, uBloom: { value: 0.6 }, uSat: { value: 1 }, uContrast: { value: 1 }, uVignette: { value: 0.5 }, uCA: { value: 0 },
        uGrain: { value: 0 }, uDesat: { value: 0 }, uVHS: { value: 0 }, uLetterbox: { value: 0 }, uFade: { value: 0 }, uFade3: { value: new THREE.Color() }, uSharp: { value: 0.4 },
        uLift: { value: new THREE.Color() }, uGamma: { value: new THREE.Color(1, 1, 1) }, uGain: { value: new THREE.Color(1, 1, 1) },
        uShadowTint: { value: new THREE.Color(1, 1, 1) }, uHighTint: { value: new THREE.Color(1, 1, 1) }, uFlash: { value: new THREE.Color() },
        uFocus: { value: new THREE.Vector2(0.5, 0.5) }, uFocusK: { value: 0 },
      },
    });
    this.levels = [];
    this.setSize(1, 1);
  }

  setSize(w, h, scale = this.scale) {
    this.scale = scale;
    this.w = w; this.h = h;
    const rw = Math.max(1, Math.round(w * scale)), rh = Math.max(1, Math.round(h * scale));
    if (this.target) this.target.dispose();
    this.target = new THREE.WebGLRenderTarget(rw, rh, { type: THREE.HalfFloatType, samples: 4, colorSpace: THREE.LinearSRGBColorSpace });
    this.target.depthTexture = null;
    for (const l of this.levels) l.dispose();
    this.levels = [];
    let lw = rw >> 1, lh = rh >> 1;
    for (let i = 0; i < 6 && lw > 4 && lh > 4; i++) {
      this.levels.push(new THREE.WebGLRenderTarget(lw, lh, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }));
      lw >>= 1; lh >>= 1;
    }
    this.ups = this.levels.slice(0, -1).map((l) => new THREE.WebGLRenderTarget(l.width, l.height, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }));
    this.comp.uniforms.uRes.value.set(w, h);
  }

  _pass(mat, target) {
    this.mesh.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.scene, this.cam);
  }

  render(scene, camera, time) {
    const r = this.r;
    FXK.value = Math.pow(Math.max(0.2, this.fx.exposure), -0.6);
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    // bloom down
    let src = this.target.texture, sw = this.target.width, sh = this.target.height;
    this.down.uniforms.uThreshold.value = this.fx.threshold;
    for (let i = 0; i < this.levels.length; i++) {
      this.down.uniforms.tSrc.value = src;
      this.down.uniforms.uTexel.value.set(1 / sw, 1 / sh);
      this.down.uniforms.uFirst.value = i === 0 ? 1 : 0;
      this._pass(this.down, this.levels[i]);
      src = this.levels[i].texture; sw = this.levels[i].width; sh = this.levels[i].height;
    }
    // bloom up: ups[i] = levels[i] + blur(up of i+1)
    let prevSmall = this.levels[this.levels.length - 1];
    for (let i = this.levels.length - 2; i >= 0; i--) {
      this.up.uniforms.tSrc.value = prevSmall.texture;
      this.up.uniforms.tPrev.value = this.levels[i].texture;
      this.up.uniforms.uTexel.value.set(1 / prevSmall.width, 1 / prevSmall.height);
      this._pass(this.up, this.ups[i]);
      prevSmall = this.ups[i];
    }
    const u = this.comp.uniforms, fx = this.fx;
    u.tScene.value = this.target.texture;
    u.tBloom.value = (this.ups[0] || this.levels[0]).texture;
    u.uTime.value = time;
    u.uExposure.value = fx.exposure; u.uBloom.value = fx.bloom; u.uSat.value = fx.saturation; u.uContrast.value = fx.contrast;
    u.uVignette.value = fx.vignette; u.uCA.value = fx.ca; u.uGrain.value = fx.grain; u.uDesat.value = fx.desat; u.uVHS.value = fx.vhs; u.uSharp.value = fx.sharpen ?? 0.4;
    u.uLetterbox.value = fx.letterbox; u.uFade.value = fx.fade; u.uFade3.value.copy(fx.fadeColor);
    u.uLift.value.copy(fx.lift); u.uGamma.value.copy(fx.gamma); u.uGain.value.copy(fx.gain);
    u.uShadowTint.value.copy(fx.shadowTint); u.uHighTint.value.copy(fx.highTint); u.uFlash.value.copy(fx.flash);
    u.uFocus.value.copy(fx.focus); u.uFocusK.value = fx.focusK;
    this._pass(this.comp, null);
  }
}
