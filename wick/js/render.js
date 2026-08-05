// render.js — everything you see is lit by fire.
//
// scene = walls + air + flame, lit by (a) a raymarched 1D shadow map around the
// ember, and (b) a blurred emission pyramid standing in for bounce light.
// Then GPU sparks, a bloom chain, and a filmic post pass.

import * as S from './shaders.js';

const SHADOW_RES = 1024;
const BLOOM_LEVELS = 5;
const MAX_SCENE_W = 1792;

export class Renderer {
  constructor(glx) {
    this.glx = glx;
    this.p = {
      threshold: 1.45, knee: 0.60,
      shadowMax: 250, giGain: 1.0,
      exposure: 1.0, fade: 1, flash: 0, desatAdd: 0,
      quality: 1.0,
    };
    this.viewport = [0, 0, 1, 1];
    this.sceneW = 0; this.sceneH = 0;
    this.gw = 0; this.gh = 0;
    this.progs = {
      composite: glx.prog(S.COMPOSITE),
      emission: glx.prog(S.EMISSION),
      down: glx.prog(S.DOWNSAMPLE),
      up: glx.prog(S.UPSAMPLE),
      pre: glx.prog(S.BLOOM_PREFILTER),
      post: glx.prog(S.POST),
      shadow: glx.prog(S.SHADOW),
      part: glx.prog(S.PART_FS, S.PART_VS),
      blit: glx.prog(S.BLIT),
    };
    this.shadowT = glx.target(SHADOW_RES, 1, 'r16f', 'linear', 'repeat');
  }

  /** Fit a letterboxed viewport of `aspect` inside the canvas, and size the HDR chain. */
  resize(cw, ch, aspect) {
    let w = cw, h = Math.round(cw / aspect);
    if (h > ch) { h = ch; w = Math.round(ch * aspect); }
    this.viewport = [Math.round((cw - w) / 2), Math.round((ch - h) / 2), w, h];

    let sw = Math.min(Math.round(w * this.p.quality), MAX_SCENE_W);
    sw = Math.max(320, sw);
    let sh = Math.max(180, Math.round(sw / aspect));
    if (sw === this.sceneW && sh === this.sceneH) return;
    this.sceneW = sw; this.sceneH = sh;
    this._allocScene();
  }

  _allocScene() {
    const g = this.glx, gl = g.gl;
    const kill = (t) => { if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); } };
    if (this.scene) kill(this.scene);
    if (this.bloomA) { this.bloomA.forEach(kill); this.bloomB.forEach(kill); }
    this.scene = g.target(this.sceneW, this.sceneH, 'rgba16f', 'linear');
    this.bloomA = []; this.bloomB = [];
    let w = Math.max(2, this.sceneW >> 1), h = Math.max(2, this.sceneH >> 1);
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      this.bloomA.push(g.target(w, h, 'rgba16f', 'linear'));
      this.bloomB.push(g.target(w, h, 'rgba16f', 'linear'));
      w = Math.max(2, w >> 1); h = Math.max(2, h >> 1);
    }
  }

  /** Emission pyramid lives at grid resolution, so re-alloc when a level loads. */
  allocForGrid(gw, gh) {
    if (gw === this.gw && gh === this.gh) return;
    const g = this.glx, gl = g.gl;
    if (this.gi) this.gi.forEach((t) => { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); });
    this.gw = gw; this.gh = gh;
    this.gi = [];
    let w = Math.max(4, gw >> 1), h = Math.max(4, gh >> 1);
    for (let i = 0; i < 3; i++) {
      this.gi.push(g.target(w, h, 'rgba16f', 'linear'));
      w = Math.max(2, w >> 1); h = Math.max(2, h >> 1);
    }
  }

  /**
   * @param fluid   the simulation
   * @param ember   player state
   * @param cam     [uvx, uvy, uvw, uvh] window into the grid
   * @param grade   the movement's colour grade
   */
  frame(fluid, ember, cam, grade, time) {
    const g = this.glx, P = this.progs, p = this.p;
    const gtex = [1 / fluid.gw, 1 / fluid.gh];
    const euv = [ember.x / fluid.gw, ember.y / fluid.gh];
    const eheat = ember.alive ? ember.heat : 0;

    // ── bounce light
    g.draw(P.emission, this.gi[0], {
      uMedium: fluid.medium.read.tex, uSolid: fluid.solidT.tex, uFuel: fluid.fuel.read.tex,
      uTexel: gtex, uEmber: euv, uAspect: fluid.aspect,
      uEmberHeat: eheat, uEmberR: 0.018, uGain: p.giGain,
    });
    for (let i = 1; i < this.gi.length; i++)
      g.draw(P.down, this.gi[i], { uSrc: this.gi[i - 1].tex, uTexel: [1 / this.gi[i - 1].w, 1 / this.gi[i - 1].h] });

    // ── cast shadows from the ember
    g.draw(P.shadow, this.shadowT, {
      uSolid: fluid.solidT.tex, uGrid: [fluid.gw, fluid.gh],
      uLight: [ember.x, ember.y], uMaxDist: p.shadowMax, uTexel: [1 / SHADOW_RES, 1],
    });

    // ── the room
    g.draw(P.composite, this.scene, {
      uMedium: fluid.medium.read.tex, uSolid: fluid.solidT.tex, uFuel: fluid.fuel.read.tex,
      uVel: fluid.vel.read.tex, uShadow: this.shadowT.tex,
      uGI0: this.gi[0].tex, uGI1: this.gi[1].tex, uGI2: this.gi[2].tex,
      uTexel: gtex, uCam: cam, uGrid: [fluid.gw, fluid.gh], uAspect: fluid.aspect,
      uEmber: [euv[0], euv[1], eheat, ember.glow / fluid.gw],
      uEmberVel: [ember.vx, ember.vy],
      uTime: time, uShadowMax: p.shadowMax,
      uDetail: grade.detail, uShimmer: grade.shimmer, uFogGain: grade.fogGain,
      uAmbient: grade.ambient, uAmbientTint: grade.ambientTint,
      uWallTint: grade.wallTint, uWallLift: grade.wallLift,
    });

    // ── sparks and dust
    g.drawPoints(P.part, this.scene, fluid.partCount, {
      uPart: fluid.parts.read.tex, uVelTex: fluid.vel.read.tex, uPartRes: fluid.partRes, uCam: cam,
      uPx: [this.sceneW, this.sceneH], uScale: Math.max(1, this.sceneH / 620),
      uEmber: [euv[0], euv[1], Math.max(eheat, 0.12)], uAspect: fluid.aspect,
      uSparkGain: grade.sparkGain, uMoteGain: grade.moteGain, uMoteTint: grade.moteTint,
    }, true);

    // ── bloom
    g.draw(P.pre, this.bloomA[0], {
      uSrc: this.scene.tex, uTexel: [1 / this.sceneW, 1 / this.sceneH],
      uThreshold: p.threshold, uKnee: p.knee,
    });
    for (let i = 1; i < BLOOM_LEVELS; i++)
      g.draw(P.down, this.bloomA[i], { uSrc: this.bloomA[i - 1].tex, uTexel: [1 / this.bloomA[i - 1].w, 1 / this.bloomA[i - 1].h] });
    let cur = this.bloomA[BLOOM_LEVELS - 1];
    for (let i = BLOOM_LEVELS - 1; i >= 1; i--) {
      const dst = this.bloomB[i - 1];
      g.draw(P.up, dst, { uSrc: cur.tex, uAdd: this.bloomA[i - 1].tex, uTexel: [1 / cur.w, 1 / cur.h], uMix: 0.82 });
      cur = dst;
    }

    // ── to the screen
    const gl = g.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.disable(gl.BLEND);
    gl.clearColor(0.012, 0.010, 0.020, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    g.draw(P.post, null, {
      uScene: this.scene.tex, uBloom: cur.tex,
      uTexel: [1 / this.sceneW, 1 / this.sceneH], uRes: [this.sceneW, this.sceneH],
      uTime: time, uBloomGain: grade.bloom, uVignette: grade.vignette,
      uGrain: grade.grain, uAberr: grade.aberr, uExposure: p.exposure * grade.exposure,
      uFade: p.fade, uDesat: Math.min(1, grade.desat + p.desatAdd), uFlash: p.flash,
      uLift: grade.lift, uGamma: grade.gamma, uGain: grade.gain,
    }, { viewport: this.viewport });
  }
}
