// Post stack: render -> bloom -> grade (exposure, warmth, vignette, chromatic aberration,
// radial speed smear, flash) -> output (sRGB + tonemap). Everything a game needs to make
// "state" visible on the whole frame without a HUD.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1.0 },
    uWarmth: { value: 0.0 },     // -1 cool .. +1 warm tint mix
    uWarmColor: { value: new THREE.Color(1.0, 0.86, 0.66) },
    uCoolColor: { value: new THREE.Color(0.66, 0.78, 1.0) },
    uVignette: { value: 0.35 },
    uChroma: { value: 0.0 },     // chromatic aberration px-ish
    uSmear: { value: 0.0 },      // radial blur toward centre (speed)
    uFlash: { value: 0.0 },      // additive white flash
    uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uDesat: { value: 0.0 },      // 0 colour .. 1 grey
    uDark: { value: 0.0 },       // fade to black
    uCentre: { value: new THREE.Vector2(0.5, 0.5) },
    uTime: { value: 0 },
    uGrain: { value: 0.035 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uExposure, uWarmth, uVignette, uChroma, uSmear, uFlash, uDesat, uDark, uTime, uGrain;
    uniform vec3 uWarmColor, uCoolColor, uFlashColor;
    uniform vec2 uCentre, uResolution;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      vec2 d = uv - uCentre;
      float r = length(d);
      vec3 col;
      if (uSmear > 0.001) {
        // radial smear: sample along the ray toward the centre
        vec3 acc = vec3(0.0);
        const int N = 8;
        float w = 0.0;
        for (int i = 0; i < N; i++) {
          float t = float(i) / float(N - 1);
          float k = 1.0 - t * uSmear * r * 2.2;
          vec2 p = uCentre + d * k;
          float wt = 1.0 - t * 0.6;
          acc += texture2D(tDiffuse, p).rgb * wt; w += wt;
        }
        col = acc / w;
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }
      if (uChroma > 0.001) {
        vec2 off = d * uChroma * 0.01 * (0.4 + r);
        col.r = texture2D(tDiffuse, uv + off).r;
        col.b = texture2D(tDiffuse, uv - off).b;
      }
      col *= uExposure;
      // warmth: tint the midtones
      vec3 tint = mix(vec3(1.0), uWarmth > 0.0 ? uWarmColor : uCoolColor, abs(uWarmth));
      col *= tint;
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, vec3(lum), uDesat);
      // vignette
      float v = smoothstep(0.95, 0.25, r * (0.75 + uVignette));
      col *= mix(1.0, v, uVignette);
      // grain
      float g = (hash(uv * uResolution.xy * 0.5 + fract(uTime) * 91.7) - 0.5) * uGrain;
      col += g * (0.35 + 0.65 * (1.0 - lum));
      col += uFlashColor * uFlash;
      col *= (1.0 - uDark);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function makePostFX(renderer, scene, camera, { bloomStrength = 0.55, bloomRadius = 0.55, bloomThreshold = 0.85, width = 1, height = 1, samples = 0 } = {}) {
  const target = new THREE.WebGLRenderTarget(Math.max(1, width), Math.max(1, height), { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, target);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), bloomStrength, bloomRadius, bloomThreshold);
  const grade = new ShaderPass(GradeShader);
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(grade);
  composer.addPass(output);
  const api = {
    composer, renderPass, bloom, grade, output,
    u: grade.uniforms,
    resize(w, h, pr = 1) {
      composer.setSize(w, h);
      composer.setPixelRatio(pr);
      bloom.setSize(w, h);
      grade.uniforms.uResolution.value.set(w * pr, h * pr);
    },
    render(dt) {
      grade.uniforms.uTime.value += dt || 0.016;
      composer.render();
    },
    setCamera(c) { renderPass.camera = c; },
  };
  api.resize(width, height);
  return api;
}
