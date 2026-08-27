// Post chain (Eclipse's proven order): HDR HalfFloat MSAA target ->
// RenderPass -> UnrealBloom (threshold 1.05 so ONLY true emissives bloom) ->
// OutputPass (ACES + sRGB) -> display-space film grade. No TAA/GTAO/DOF —
// this stack holds 60 fps on a GTX 980M.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSat: { value: 1.28 },
    uContrast: { value: 1.09 },
    uLift: { value: 0.022 },
    uShadow: { value: new THREE.Vector3(0.90, 0.95, 1.08) },
    uHigh: { value: new THREE.Vector3(1.07, 1.02, 0.90) },
    uVignette: { value: 0.16 },
    uFrame: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uSat, uContrast, uLift, uVignette, uFrame;
    uniform vec3 uShadow, uHigh;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(luma), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      c = c * (1.0 - uLift) + uLift;
      float t = smoothstep(0.0, 1.0, luma);
      c *= mix(uShadow, uHigh, t);
      vec2 p = vUv - 0.5;
      c *= 1.0 - dot(p, p) * uVignette * 2.4;
      // Display-space interleaved-gradient noise: enough to break up the
      // blue-black bands, below the threshold of visible film-grain crawl.
      vec2 grainCoord = gl_FragCoord.xy + vec2(uFrame * 17.0, uFrame * 59.0);
      float grain = fract(52.9829189 * fract(dot(grainCoord, vec2(0.06711056, 0.00583715)))) - 0.5;
      float grainAmount = mix(0.78, 0.30, smoothstep(0.035, 0.52, luma)) / 255.0;
      c += grain * grainAmount;
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};

export function create(ctx) {
  const { renderer, scene, camera } = ctx;
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.3, 0.6, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  let frame = 0;

  return {
    id: 'post',
    composer,
    grade,
    render() {
      grade.uniforms.uFrame.value = frame;
      frame = (frame + 1) % 64;
      composer.render();
    },
    setSize(w, h) { composer.setSize(w, h); bloom.setSize(w, h); },
  };
}
