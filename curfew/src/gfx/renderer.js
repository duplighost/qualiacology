// gfx — the rendering spine. System #1 in the manifest, so it exists before anything
// else can ask for ctx.renderer / ctx.scene / ctx.camera.
//
// THE RESIZE AUTHORITY LIVES HERE AND NOWHERE ELSE. One window listener, one call to
// setSize, and every other module that needs to hear about a size change subscribes with
// onResize(fn). setSize's third argument is ALWAYS false: RELAY//ECLIPSE's screen-cutoff
// bug was setSize writing an inline width/height style onto the canvas that the
// performance governor never refreshed, so after one render-scale change the drawing
// buffer and the CSS box disagreed forever. CSS owns the canvas box (index.html pins
// #gl to inset:0); we own only the drawing buffer.
//
// antialias is OFF on the context on purpose — MSAA x4 lives on the post chain's
// HalfFloat render target (gfx/post.js), and asking for both pays for both.

import * as THREE from 'three';
import { CFG } from '../config.js';
import { clamp } from '../engine/math.js';

// Module-level scratch. The hot path allocates nothing.
const _size = new THREE.Vector2();

export class Gfx {
  static id = 'gfx';

  constructor(ctx) {
    this.ctx = ctx;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.canvas = null;
    this.renderScale = CFG.render.renderScale;
    this.cssW = 1;
    this.cssH = 1;
    this._listeners = [];
    this._onWindowResize = () => this.resize();
  }

  async init() {
    const canvas = this.ctx.canvas || document.getElementById('gl');
    if (!canvas) throw new Error('gfx: no #gl canvas');
    this.canvas = canvas;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,      // MSAA x4 is on the post RT instead
      alpha: false,
      depth: true,
      stencil: false,        // nothing in CURFEW stencils; saves the attachment
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    // dpr is pinned at 1 on this GPU [glide]. Never read window.devicePixelRatio here:
    // a 2x display would quadruple fill on a machine measured at dpr 1.
    renderer.setPixelRatio(CFG.render.dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = CFG.render.exposure;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // The post chain renders several passes per frame. With autoReset on, renderer.info
    // would report only the LAST pass and the <=750 draw gate would read as ~4 draws.
    // We reset once per frame at the top of render() instead, so info is the frame total.
    renderer.info.autoReset = false;

    const scene = new THREE.Scene();
    // Placeholder background so the very first frame is night and not renderer grey.
    // sky.js owns the real background colour and the fog that must EQUAL it.
    scene.background = new THREE.Color(0x07090c);

    const camera = new THREE.PerspectiveCamera(
      CFG.render.fov, 1, CFG.render.near, CFG.render.far,
    );
    camera.position.set(0, CFG.player.EYE, 0);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Publish on the ctx bag. Everyone else reads ctx.renderer/scene/camera, never imports us.
    this.ctx.renderer = renderer;
    this.ctx.scene = scene;
    this.ctx.camera = camera;
    this.ctx.canvas = canvas;

    this.resize();
    window.addEventListener('resize', this._onWindowResize, { passive: true });
  }

  /**
   * Subscribe to drawing-buffer size changes. Called immediately with the current size
   * so a late subscriber (post, which is manifest #15) never runs one frame mis-sized.
   * fn(widthPx, heightPx) — DRAWING BUFFER pixels, already render-scaled.
   */
  onResize(fn) {
    this._listeners.push(fn);
    this.renderer.getDrawingBufferSize(_size);
    fn(_size.x, _size.y);
    return () => {
      const i = this._listeners.indexOf(fn);
      if (i >= 0) this._listeners.splice(i, 1);
    };
  }

  /** The ONLY place setSize is called. Nothing else may call it. */
  resize() {
    const canvas = this.canvas;
    // CSS owns the box; clientWidth is the truth. innerWidth is the fallback for a
    // headless first frame before layout has run.
    const w = Math.max(1, canvas.clientWidth || window.innerWidth || 1);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight || 1);
    this.cssW = w;
    this.cssH = h;
    const s = this.renderScale;
    this.renderer.setSize(Math.round(w * s), Math.round(h * s), false); // false — CSS owns the style
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.getDrawingBufferSize(_size);
    for (let i = 0; i < this._listeners.length; i++) this._listeners[i](_size.x, _size.y);
  }

  /**
   * Governor knob 1 of 4 (renderScale, shadow resolution, tree ring density, particle
   * scale — DESIGN §8). SPIKE-FINDINGS measured ~6x headroom at full resolution, so this
   * is a lever held in reserve, not a requirement.
   */
  setRenderScale(s) {
    const v = clamp(s, 0.4, 1.0);
    if (v === this.renderScale) return;
    this.renderScale = v;
    this.resize();
  }

  /** Drawing-buffer size in pixels, into a caller-owned Vector2. */
  drawingBufferSize(out) { return this.renderer.getDrawingBufferSize(out); }

  /**
   * Draw one frame. Call this ONCE per rAF, AFTER every system's present(alpha) has run —
   * gfx is manifest #1, so if drawing lived in our present() we would draw the previous
   * frame's poses. Delegates to the post chain when it exists (read lazily; post is
   * manifest #15 and does not exist while we are being constructed).
   */
  render() {
    const r = this.renderer;
    r.info.reset();                       // frame totals, see autoReset note above
    const post = this.ctx.systems && this.ctx.systems.get('post');
    if (post && post.enabled) post.render();
    else r.render(this.scene, this.camera);
  }

  /** For window.__CURFEW.frameStats(). renderer.info totals for the whole frame. */
  stats() {
    const info = this.renderer.info;
    return {
      draws: info.render.calls,
      tris: info.render.triangles,
      programs: info.programs ? info.programs.length : 0,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    };
  }

  ready() {
    return !!(this.renderer && this.scene && this.camera
      && this.ctx.renderer === this.renderer && this.ctx.camera === this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this._onWindowResize);
    this._listeners.length = 0;
    if (this.renderer) this.renderer.dispose();
  }
}

export default Gfx;
