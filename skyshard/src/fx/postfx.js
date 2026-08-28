// One post pass, one render target, one quad — the whole cinematic look.
// Uniforms are emotion channels [ported]: uPulse spikes on big hits,
// uDread rises near bosses and at low health. No EffectComposer chain.

import * as THREE from 'three';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D tScene;
  uniform float uTime, uPulse, uDread, uAberration;
  uniform vec2 uTexel;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec2 uv = vUv;
    vec2 c = uv - 0.5;
    float r = length(c);

    // A compact edge-aware resolve replaces hardware MSAA. It preserves thin
    // silhouettes while softening staircase shimmer at the browser's native
    // resolution, and costs four neighboring samples in the one existing pass.
    vec3 center = texture2D(tScene, uv).rgb;
    vec3 n = texture2D(tScene, uv + vec2(0.0, uTexel.y * 1.15)).rgb;
    vec3 s = texture2D(tScene, uv - vec2(0.0, uTexel.y * 1.15)).rgb;
    vec3 e = texture2D(tScene, uv + vec2(uTexel.x * 1.15, 0.0)).rgb;
    vec3 w = texture2D(tScene, uv - vec2(uTexel.x * 1.15, 0.0)).rgb;
    vec3 nearAvg = (n + s + e + w) * 0.25;
    float centerLum = dot(center, vec3(0.299, 0.587, 0.114));
    float edge = abs(centerLum - dot(nearAvg, vec3(0.299, 0.587, 0.114)));
    vec3 resolved = mix(center, nearAvg, smoothstep(0.055, 0.30, edge) * 0.20);

    // chromatic aberration, stronger at edges and on hits
    float ab = (uAberration + uPulse * 0.004) * (0.25 + r * 1.6);
    vec3 col;
    col.r = texture2D(tScene, uv + c * ab).r;
    col.g = resolved.g;
    col.b = texture2D(tScene, uv - c * ab).b;

    // Small-radius highlight spread: emissive materials illuminate their
    // immediate pixels without an EffectComposer or a second target.
    vec3 bloom = max(n - 0.80, 0.0) + max(s - 0.80, 0.0) + max(e - 0.80, 0.0) + max(w - 0.80, 0.0);
    vec3 nd = texture2D(tScene, uv + uTexel * vec2(2.6, 2.2)).rgb;
    vec3 sd = texture2D(tScene, uv - uTexel * vec2(2.6, 2.2)).rgb;
    vec3 wideBloom = max(nd - 0.76, 0.0) + max(sd - 0.76, 0.0);
    col += bloom * (0.034 + uPulse * 0.018) + wideBloom * 0.018;

    // split-tone: cool shadows, warm highlights
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float hi = smoothstep(0.28, 0.88, lum);
    col = mix(col * vec3(0.94, 0.975, 1.035), col * vec3(1.035, 1.01, 0.955), hi);
    float gradeLum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(gradeLum), col, 1.035);
    col += vec3(0.009, 0.003, 0.016) * smoothstep(0.12, 0.62, gradeLum) * (1.0 - hi);

    // gentle contrast + floor — from the low-mids up only. A pivot-0.5 curve
    // crushes everything under ~0.2 toward black, which made dim interiors
    // unreadable; shadows keep their raw values so dark reads as shape.
    vec3 filmic = (col - 0.5) * (1.025 + uPulse * 0.06 + uDread * 0.1) + 0.5;
    col = mix(col, filmic, smoothstep(0.03, 0.28, lum));
    col = max(col, vec3(0.004));

    // halation on the brightest spots
    col += vec3(1.0, 0.76, 0.54) * smoothstep(0.70, 1.12, lum) * (0.018 + uPulse * 0.075);

    // vignette + dread crush at the edges
    col *= 1.0 - smoothstep(0.58, 1.24, r + uDread * 0.14) * 0.22;
    col = mix(col, vec3(0.06, 0.0, 0.02), uDread * smoothstep(0.35, 0.85, r) * 0.5);

    // grain + dither
    float g = hash(uv * vec2(917.0, 533.0) + uTime);
    col += (g - 0.5) * (0.0035 + uDread * 0.012);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = true;
    this.target = new THREE.WebGLRenderTarget(2, 2, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
    });
    this.uniforms = {
      tScene: { value: this.target.texture },
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uDread: { value: 0 },
      uAberration: { value: 0.00045 },
      uTexel: { value: new THREE.Vector2(0.5, 0.5) },
    };
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadScene.add(new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms, depthWrite: false, depthTest: false })
    ));
    this.dreadTarget = 0;
    this.resize();
  }

  resize() {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.target.setSize(size.x, size.y);
    this.uniforms.uTexel.value.set(1 / Math.max(1, size.x), 1 / Math.max(1, size.y));
  }

  pulse(v = 1) { this.uniforms.uPulse.value = Math.min(1.4, this.uniforms.uPulse.value + v); }
  setDread(v) { this.dreadTarget = v; }

  render(scene, camera, rawDt, t) {
    const U = this.uniforms;
    U.uTime.value = t % 977;
    U.uPulse.value = Math.max(0, U.uPulse.value - U.uPulse.value * 6 * rawDt);
    U.uDread.value += (this.dreadTarget - U.uDread.value) * Math.min(1, rawDt * 3.5);

    if (!this.enabled) {
      this.renderer.render(scene, camera);
      this.stats = { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles };
      return;
    }
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    // capture the real scene stats before the post quad wipes them
    this.stats = { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles };
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCam);
  }
}
