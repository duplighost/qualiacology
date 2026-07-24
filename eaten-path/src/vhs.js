// vhs.js — the camcorder between you and the forest. Renders the scene to a
// soft 640x480 target, then composites it with scanlines, grain, chroma bleed,
// tracking bands, head-switching noise, barrel distortion, auto-iris lag and a
// pillarboxed 4:3 frame.
import * as THREE from 'three';
import { clamp, damp } from './util.js';

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse;
uniform float uTime;
uniform vec2 uFrame;        // fraction of the canvas the 4:3 frame occupies
uniform float uGlitch;      // 0..1 decaying event glitch
uniform float uTrack;       // tracking band strength 0..1
uniform float uTrackY;      // band centre (0..1)
uniform float uRoll;        // vertical roll offset
uniform float uExposure;
uniform float uFrameParity; // 0/1 alternating
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  // pillarbox mapping into the 4:3 frame
  vec2 uv = (vUv - 0.5) / uFrame + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  // slight barrel distortion
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  uv = 0.5 + c * (1.0 + 0.055 * r2);
  // vertical roll (wrap only while rolling; otherwise clamp so barrel overshoot
  // can't smear bottom-of-frame head-switch garbage onto the top edge)
  uv.y = (abs(uRoll) > 0.0001) ? fract(uv.y + uRoll) : clamp(uv.y, 0.0015, 0.9985);

  float row = uv.y * 480.0;
  float t = uTime;

  // tracking band displacement
  float band = smoothstep(0.09, 0.0, abs(uv.y - uTrackY));
  float bandNoise = (hash(vec2(floor(row), floor(t * 60.0))) - 0.5);
  uv.x += band * uTrack * (bandNoise * 0.09 + 0.02);
  // event glitch: whole-line tearing
  float lineTear = step(0.985 - uGlitch * 0.12, hash(vec2(floor(row), floor(t * 24.0))));
  uv.x += lineTear * (hash(vec2(floor(row) * 3.1, t)) - 0.5) * 0.12 * (0.3 + uGlitch);
  // head-switching noise at the bottom of the frame
  float headSw = step(uv.y, 0.028);
  uv.x += headSw * (hash(vec2(floor(row), floor(t * 90.0))) - 0.5) * 0.2;
  // interlace shimmy
  float field = mod(floor(row) + uFrameParity, 2.0);
  uv.x += (field - 0.5) * 0.0006;

  if (uv.x < 0.0 || uv.x > 1.0) { gl_FragColor = vec4(0.0,0.0,0.0,1.0); return; }

  // chroma bleed: R and B sampled apart
  float chroma = (0.0016 + uGlitch * 0.004 + band * uTrack * 0.004);
  vec3 col;
  col.r = texture2D(tDiffuse, uv + vec2(chroma, 0.0)).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - vec2(chroma, 0.0)).b;

  col *= uExposure;

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  // luma grain — stronger in the dark, like gain-starved tape
  float g1 = hash(uv * vec2(191.0, 271.0) + t * 13.7) - 0.5;
  col += g1 * (0.045 + (1.0 - clamp(luma * 2.2, 0.0, 1.0)) * 0.075 + uGlitch * 0.12);
  // chroma noise blotches in shadow
  float cn = hash(uv * 57.0 + floor(t * 17.0));
  col += (vec3(cn, hash(uv * 63.0 + 4.0 + floor(t * 17.0)), hash(uv * 51.0 + 9.0 + floor(t * 17.0))) - 0.5)
         * 0.055 * (1.0 - clamp(luma * 2.6, 0.0, 1.0));
  // band + head-switch garbage
  col += band * uTrack * bandNoise * 0.55;
  col = mix(col, vec3(hash(vec2(row, t * 91.0))), headSw * 0.75);
  col = mix(col, vec3(1.0), lineTear * 0.06);

  // scanlines
  col *= 0.9 + 0.1 * sin(uv.y * 480.0 * 3.14159);
  // interlace darkening
  col *= 1.0 - field * 0.04;

  // VHS never shows a true black; lift, desaturate a little, drift green
  col = col * 0.9 + 0.05;
  float l2 = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(l2), 0.16);
  col *= vec3(0.97, 1.03, 0.99);

  // vignette
  float vig = 1.0 - 1.05 * dot(c, c);
  col *= clamp(vig, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

export class VHS {
  constructor(renderer) {
    this.renderer = renderer;
    this.rt = new THREE.WebGLRenderTarget(640, 480, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true,
    });
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.uniforms = {
      tDiffuse: { value: this.rt.texture },
      uTime: { value: 0 },
      uFrame: { value: new THREE.Vector2(1, 1) },
      uGlitch: { value: 0 },
      uTrack: { value: 0 },
      uTrackY: { value: 0.5 },
      uRoll: { value: 0 },
      uExposure: { value: 1 },
      uFrameParity: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: FRAG,
      depthTest: false, depthWrite: false,
    });
    const geo = new THREE.PlaneGeometry(2, 2);
    this.quadScene.add(new THREE.Mesh(geo, mat));
    this.trackTimer = 12; this.trackActive = 0;
    this.rollTimer = 40;
    this.exposure = 1; this.exposureTarget = 1;
    this.frameCount = 0;
  }

  // pixel rect of the 4:3 frame — main uses this to place the OSD
  frameRect(w, h) {
    const target = 4 / 3;
    let fw = w, fh = h;
    if (w / h > target) { fw = h * target; } else { fh = w / target; }
    return { x: (w - fw) / 2, y: (h - fh) / 2, w: fw, h: fh };
  }

  resize(w, h) {
    const r = this.frameRect(w, h);
    this.uniforms.uFrame.value.set(r.w / w, r.h / h);
  }

  glitch(x) {
    this.uniforms.uGlitch.value = Math.max(this.uniforms.uGlitch.value, x);
    if (x > 0.4) { this.trackActive = Math.max(this.trackActive, 0.6 + x * 0.6); this.uniforms.uTrackY.value = Math.random(); }
  }

  setExposureTarget(x) { this.exposureTarget = x; }

  update(dt) {
    const u = this.uniforms;
    // wrap time — unbounded float32 t degrades the hash noise after minutes
    u.uTime.value = (u.uTime.value + dt) % 300;
    this.frameCount++;
    u.uFrameParity.value = this.frameCount % 2;
    u.uGlitch.value = Math.max(0, u.uGlitch.value - dt * 1.4);

    // scheduled tracking wobble
    this.trackTimer -= dt;
    if (this.trackTimer <= 0) {
      this.trackTimer = 14 + Math.random() * 34;
      this.trackActive = 0.5 + Math.random() * 1.2;
      u.uTrackY.value = Math.random();
    }
    if (this.trackActive > 0) {
      this.trackActive -= dt;
      u.uTrack.value = clamp(this.trackActive * 1.4, 0, 1);
      u.uTrackY.value += dt * 0.22; // the band drifts upward
      if (u.uTrackY.value > 1.05) u.uTrackY.value = -0.05;
    } else u.uTrack.value = 0;

    // rare vertical roll stutter
    this.rollTimer -= dt;
    if (this.rollTimer <= 0) {
      this.rollTimer = 30 + Math.random() * 60;
      this.rollT = 0.5;
    }
    if (this.rollT > 0) {
      this.rollT -= dt;
      u.uRoll.value = (this.rollT > 0.3 ? (0.5 - this.rollT) * 0.12 : 0.024 * (this.rollT / 0.3)) * Math.sin(this.rollT * 40);
      if (this.rollT <= 0) u.uRoll.value = 0;
    }

    // auto-iris: the camcorder chases the light and overshoots
    const diff = this.exposureTarget - this.exposure;
    this.exposure = damp(this.exposure, this.exposureTarget + diff * 0.35, 2.2, dt);
    u.uExposure.value = this.exposure;
  }

  render(scene, camera) {
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(scene, camera);
    // snapshot scene-pass stats before the quad pass resets renderer.info
    const ri = this.renderer.info.render;
    this.sceneStats = { calls: ri.calls, triangles: ri.triangles };
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCam);
  }
}
