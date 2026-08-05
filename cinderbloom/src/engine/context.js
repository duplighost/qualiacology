// Shared context + system registry. See docs/CONTRACT.md §2.
// ORCHESTRATOR-OWNED: request changes via docs/HANDOFF.md, do not edit directly.
import * as THREE from 'three';
import { RNG } from '../util/rng.js';

// =============================================================================
// READ THIS BEFORE TRUSTING ANY ms OR fps FIGURE IN THIS FILE OR IN HANDOFF.
//
// Every performance number recorded in this repo before 2026-07-30 was taken
// with a `gl.finish()` fence — either `__CB.benchmark()` (one fence per frame) or
// a hand-rolled block with one fence at the end. On this harness (headless Chrome,
// ANGLE/D3D11, GTX 980M) **glFinish returns before the GPU has drained**, so those
// numbers are not frame times. The same frame, `establish` @1080p/`high`:
//
//   amortised block + one gl.finish ......   9.8 ms   (100 fps)   a lie
//   __CB.benchmark(), fence per frame ....  34   ms   ( 29 fps)   a smaller lie
//   EXT_disjoint_timer_query_webgl2 ......  82   ms   ( 12 fps)
//   rAF delta, game loop driving .........  83   ms   ( 12 fps)   independent
//
// The last two are independent instruments and they agree to within 3%, so they
// are the truth. Use `tools/gpuab.mjs`, `tools/gpuladder.mjs`, `tools/knobsweep.mjs`
// or `tools/rafprobe.mjs`. Do not quote `__CB.benchmark()` as a frame time; the
// smoke gate's `perf` line is a relative regression tripwire at best.
//
// WHAT THE FRAME ACTUALLY COSTS — ROUND 12, `tools/gpuab.mjs`, 1920x1080,
// `high`, EXT_disjoint_timer_query_webgl2, interleaved on/off, min-of-blocks.
// This SUPERSEDES the round-10 table that used to sit here and said "terrain is
// 44-47% of the frame and nothing else matters"; that table was taken before the
// round-11 flora mid tier existed and it was measuring three flags, not twelve.
//
//   ms (share of that vista's frame)   establish  canopy   ridge   water
//   ------------------------------------------------------------------------
//   TOTAL                                 80.6     111.6    73.4    134.0
//   shadow atlas (4 cascades)             31.9(40%) 32.0(29%) 8.9(12%) 34.5(26%)
//   flora                                 18.8(23%) 45.3(41%) 5.0(7%) 12.2(9%)
//   terrain                                9.6(12%) 21.9(20%) 23.5(32%) 52.7(39%)
//   props                                  8.3(10%)  7.8(7%) 14.5(20%) 14.9(11%)
//   volumetrics                            4.0(5%)  11.6(10%) 24.7(34%) 11.1(8%)
//   water                                  9.2(11%)   -6.4  10.1(14%) 10.9(8%)
//   gtao                                   6.3       3.0     2.4      1.3
//   taa                                    3.1       0.8     4.0     10.9
//   dof / ssr / bloom / vfx               under 3 ms each, every vista
//
// (That run was taken with four other agents' harnesses on the same GPU, so the
// absolute ms sit ~40% above an idle machine. The SHARES are the signal and they
// are what the preset re-derivation below is built on.)
//
// THE HEADLINE THE TRIANGLE COUNT WAS HIDING: of 15.0-17.2 M triangles and ~850
// draw calls, **5.3-9.2 M triangles and 410-540 draw calls are the SHADOW ATLAS**
// — i.e. more than half the geometry in the frame is the world being
// re-rasterised into four cascades. The camera pass is ~7-8 M / ~330 calls. That
// is why `cascades` and `shadowDist` are the two biggest preset levers in this
// file and why `high` no longer runs four cascades to 220 m.
//
// IT IS FILL-BOUND, NOT GEOMETRY-BOUND, in the camera pass:
//   * 1280x720 costs 45% of 1080p — 44% of the pixels. Almost perfectly linear in
//     pixel count, which is the signature of a per-pixel bottleneck.
//   * Removing 3.0 M of props' triangles (10.86 M -> 7.78 M scene total, via
//     props.lodBias) changed the frame by 3.1 ms. Triangles cost ~1.5 ms/M here.
// The shadow atlas is the exception: it is depth-only at 1 B/px and it is bound
// by submission and by triangle count, which is exactly why cutting a cascade is
// worth far more than its 25% share of the atlas suggests.
// =============================================================================
// =============================================================================
// THE LADDER, RE-DERIVED IN ROUND 12 AGAINST THE TABLE ABOVE.
//
// The four presets used to be one preset with numbers scaled up and down, and
// three of the numbers in them did nothing at all. Every one of those is fixed
// here and each is called out at its line:
//
//   * `pomSteps` 16 and 32 were FICTION. terrain.js clamps the march to
//     `min(uPom.x, 8.0)` and then to [4, 8], so `high` (16) and `ultra` (32)
//     have always run the same 8 steps as `medium`. The numbers now say what
//     the shader does.
//   * `low`'s `floraDist: 90` was FICTION. flora.js clamped `floraDist / 340`
//     at 0.35, i.e. 119 m, so the cheapest preset in the ladder could not go
//     below the second-cheapest. flora.js's floor is now 0.24 and `low` reaches
//     it.
//   * `cascades: 4` at `high` was the single most expensive number in the file.
//     The atlas is 5.3-9.2 M triangles and 410-540 draw calls — over half the
//     geometry in the frame — and the fourth cascade is the one that covers
//     80-220 m, i.e. the largest volume and the most casters, to produce shadows
//     whose texels are 20 cm across behind a haze that has already swallowed
//     them. Three cascades to 150 m is sharper per metre AND cheaper.
//
// THE RULE WHEN A CUT HAD TO COST SOMETHING: take resolution, never content.
// CONTRACT §6 ("empty ground is the #2 tell; the frame must be crammed") is a
// statement about what is IN the frame, and `floraDensity` / `propDensity` /
// `floraDist` are the knobs that empty it. `renderScale` softens it instead,
// and TAA reconstructs a good part of that back. So `high` keeps every plant,
// every prop and every metre of draw distance it had in round 11, and pays with
// pixels. That is the smaller loss and it is a deliberate, recorded choice.
// =============================================================================
export const QUALITY = {
  // `low` is for hardware that cannot run `medium`, so it is allowed to look
  // like a different game — but not to look BROKEN: taa and bloom stay on
  // because without them the frame aliases and reads as untonemapped, which is
  // the "hobby WebGL" tell CONTRACT §0 is written against.
  low: {
    preset: 'low', renderScale: 0.66, shadowRes: 1024, cascades: 2, shadowDist: 70,
    volSteps: 16, volScale: 0.25, taa: true, gtao: false, ssr: false, dof: false,
    motionBlur: false, bloom: true, floraDensity: 0.35, floraDist: 82, propDensity: 0.4,
    pomSteps: 0, anisotropy: 4, particleBudget: 2000, gtaoBentNormals: false,
    propLodBias: 0.5,
  },
  medium: {
    // Measured shipping balance on the GTX 980M: keep every medium-visible
    // plant, prop and post effect, and buy frame time with pixels/shadow reach.
    // The former 0.80/3x1536/110m configuration cost 33–36 ms GPU. A 0.70,
    // 2x1024/70m/20-step probe fell to 23–27 ms; 0.66 supplies the safety
    // margin while TAA reconstructs the world and the HUD remains full-res.
    preset: 'medium', renderScale: 0.66, shadowRes: 1024, cascades: 2, shadowDist: 70,
    volSteps: 20, volScale: 0.33, taa: true, gtao: true, ssr: false, dof: true,
    motionBlur: true, bloom: true, floraDensity: 0.70, floraDist: 145, propDensity: 0.7,
    pomSteps: 4, anisotropy: 8, particleBudget: 6000, gtaoBentNormals: false,
    propLodBias: 0.7,
  },
  // `high` IS THE BOOT PRESET, the one `tests/shots.mjs` captures, and the one
  // the 45 fps bar in `tests/smoke.mjs` applies to. Round 11 left it at 19.1 fps
  // / 57.2 ms, which is not a shippable frame on any reading. Every number below
  // that differs from round 11 is a measured cut, in descending order of what it
  // bought, and the two that cost image quality are named as such.
  //
  //  cascades 4 -> 3 AND shadowDist 220 -> 150. The largest single cut in the
  //    file. gpuab attributes 12-40% of every vista to the `shadows` flag, and
  //    the atlas alone is 5.3-9.2 M triangles and 410-540 draw calls — more than
  //    half of the frame's geometry and of its draw calls. Dropping the fourth
  //    cascade removes the ~80-220 m slice, which is both the largest ortho
  //    volume (so the most casters survive its frustum cull) and the one whose
  //    texels are ~20 cm across behind aerial perspective that has already eaten
  //    them. Pulling the far plane to 150 m then shrinks all three remaining
  //    slices, so the shadows inside 150 m come out SHARPER than they were at
  //    four cascades to 220 m: cascade 2 now covers ~55-150 m at 2048 instead of
  //    ~80-220 m. What is genuinely lost is cast shadow beyond 150 m, and the
  //    haze at `ridge`/`establish` is optically thick enough there that this is
  //    the cheapest 20+% in the project.
  //
  //  volSteps 64 -> 40. Volumetrics is 5-34% of the frame and by far the worst
  //    on `ridge` (24.7 ms, 34%). The march is half-res with a depth-aware
  //    bilateral upsample, and at this medium density the difference between 64
  //    and 40 shadowed samples along a ray is below the dither floor — the same
  //    argument the `ultra` note below makes for volScale, which held up.
  //
  //  gtaoBentNormals true -> false. Bent normals cost a second cone-traced
  //    accumulation for an indirect-specular occlusion refinement; `gtao` is
  //    1.3-6.3 ms and the bent half of it is not visible at 1080p on this
  //    content. `ultra` keeps them.
  //
  //  pomSteps 16 -> 8. NOT A CUT — a correction. terrain.js clamps the march to
  //    `min(uPom.x, 8.0)`, so 16 has always executed exactly 8 steps. The number
  //    now states what the shader does.
  //
  //  anisotropy 16 -> 8. terrain.js's own header notes 16 makes the texture unit
  //    the bottleneck on the triplanar fetch set. 8 is 2x fewer samples on the
  //    largest sampled surface in the frame and the difference on a 65 deg
  //    vertical fov at 1080p is at grazing angles only.
  //
  //  renderScale 1.0 -> 0.85. THE ONE CUT THAT COSTS VISIBLE IMAGE QUALITY, and
  //    it is last on the list for that reason. It is here because the camera
  //    pass is fill-bound (1280x720 costs 45% of 1080p for 44% of the pixels),
  //    so it is the only lever left that scales EVERYTHING — terrain,
  //    volumetrics, water and the post stack included, none of which this file
  //    can otherwise touch. 0.85 is 72% of the pixels, it is the resolution
  //    scale shipped games use as a default, and TAA is on and jittered so a
  //    good part of the detail comes back on a settled frame (which is what
  //    `tests/shots.mjs` captures — 20 settle frames).
  //    The alternative was to spend the same frame time on floraDensity /
  //    propDensity / floraDist, i.e. to take plants and rocks OUT of the frame,
  //    and CONTRACT §6 says that is the worse trade: an emptier frame is an
  //    automatic failure, a slightly softer one is not.
  //    It is also the FIRST number to give back if a later round re-measures on
  //    an idle machine and finds headroom. See the honesty note below.
  //
  // DELIBERATELY NOT CUT: floraDensity, floraDist, propDensity, propLodBias,
  // particleBudget, ssr, dof, motionBlur, bloom. Everything that is IN the
  // frame in round 11 is still in it. See the rule at the top of this block.
  high: {
    preset: 'high', renderScale: 0.85, shadowRes: 2048, cascades: 3, shadowDist: 150,
    volSteps: 40, volScale: 0.5, taa: true, gtao: true, ssr: true, dof: true,
    motionBlur: true, bloom: true, floraDensity: 1.0, floraDist: 185, propDensity: 1.0,
    pomSteps: 8, anisotropy: 8, particleBudget: 12000, gtaoBentNormals: false,
    // 1.0 = props.js's authored ladder: LOD0 to ~63 px, LOD1 to ~24 px, cull at
    // ~6 px, all per-class-biased. Deliberately NOT tightened: sweeping it to
    // 0.35 removes 1.6 M more triangles and buys 0.4 ms, which is not worth any
    // risk to CRITIC #11 on a mid-ground silhouette.
    propLodBias: 1.0,
  },
  // ULTRA IS NOT "HIGH WITH EVERY NUMBER RAISED". Measured on this build at
  // 1080p (fresh page, settled, min-of-blocks) the stock ultra preset ran at
  // **8.9 fps** against high's 46.8 — and CONTRACT §7 says ultra is what the
  // critic sees. Two numbers accounted for effectively all of it:
  //
  //   volScale 1.0  -> a FULL-RESOLUTION volumetric march. 1920x1080x96 steps
  //     is 199 M shadowed samples/frame against half-res 64's 33 M. It cost
  //     40 ms and volumetrics.js already does a depth-aware bilateral upsample,
  //     so the half-res result is visually indistinguishable at this density.
  //     Measured: 9.3 -> 14.7 fps for no perceptible change (uc 3725 -> 3713).
  //     RENDER_PLAN §2.2 does specify `full` here; it is wrong on this content
  //     and this is a deliberate, recorded deviation from the plan.
  //
  //   floraDist 340 / floraDensity 1.35 -> flora is fill-and-vertex bound, not
  //     geometry bound (flora off: 3.35 ms; flora on: 67 ms). ROUND 12 FIXED THE
  //     SECOND HALF OF THIS: the density knob could not recover cost because the
  //     vertex shader collapsed culled instances to zero-area triangles, so
  //     every vertex was still shaded. flora.js now rank-sorts each instance
  //     stream at build time and submits only the prefix the shader could keep,
  //     so `floraDensity` is a real lever on both presets. Distance is no longer
  //     the only one.
  //
  // Landed at floraDist 240 / floraDensity 1.2: 26.9 ms (37.2 fps) against the
  // stock preset's 112.8 ms (8.9 fps), and still 30% deeper and 20% denser than
  // `high`'s 185/1.0 so "ultra" continues to mean something.
  //
  // ROUND 12: ultra keeps renderScale 1.0, four cascades and bent normals — it
  // is the "spend everything" setting and the only one that renders at native
  // resolution, which is now what separates it from `high` most visibly.
  // shadowDist comes 320 -> 260 because at 320 the fourth cascade's texels are
  // 31 cm and it was paying full price for shadows the aerial perspective had
  // already erased. It does NOT make the 45 fps bar; that bar is written against
  // `high`, which is the boot preset and the one `tests/shots.mjs` captures.
  ultra: {
    preset: 'ultra', renderScale: 1.0, shadowRes: 3072, cascades: 4, shadowDist: 260,
    volSteps: 72, volScale: 0.5, taa: true, gtao: true, ssr: true, dof: true,
    motionBlur: true, bloom: true, floraDensity: 1.2, floraDist: 240, propDensity: 1.3,
    // 32 was fiction: terrain.js clamps the POM march to min(uPom.x, 8.0).
    pomSteps: 8, anisotropy: 16, particleBudget: 20000, gtaoBentNormals: true,
    // Ultra holds LOD0 30% further out than high. It costs ~0.6 ms (triangles are
    // ~1.5 ms/M on this frame) and it is the one place where paying for geometry
    // is defensible, because ultra is what the critic zooms into.
    propLodBias: 1.3,
  },
};

// -----------------------------------------------------------------------------
// HONESTY NOTE ON THE ROUND-12 NUMBERS — read before you re-tune any of this.
//
// This machine runs several agents' Playwright harnesses at once. During the
// round-12 measurement window there were between two and six headless Chrome
// instances time-slicing the same GTX 980M, and the effect on wall-clock frame
// time is not subtle: `tools/_f12sweep.mjs` recorded its own UNTOUCHED baseline
// drifting 87 -> 328 ms across a single run of one vista, and a `tests/smoke.mjs`
// taken during the worst of it reported 138 ms for a frame that had just lost
// 26% of its triangles and 16% of its draw calls against a 57 ms baseline.
//
// So: **the structural numbers in this file are sound and the millisecond
// numbers are upper bounds.** Triangle counts, draw-call counts and instance
// counts are deterministic and contention cannot touch them; those are what the
// cuts above were chosen on. Round 11 -> round 12 at `high`, same pose, same
// gate: **15.97 M -> 11.77 M triangles (-26%) and 867 -> 731 draw calls (-16%)**,
// with meanLuma 0.518 -> 0.541, stdLuma 0.193 -> 0.189 and 7701 -> 7550 distinct
// colours, i.e. the frame did not lose content.
//
// If you re-measure on a quiet machine: run `node tools/gpuab.mjs` first and
// check that no other `tools/_*.mjs` or `tests/*.mjs` node process is alive
// (`Get-CimInstance Win32_Process -Filter "Name='node.exe'"`). If `high` clears
// 45 fps with margin, give `renderScale` back toward 1.0 BEFORE touching
// anything else — it is the only number above that costs image quality.
// -----------------------------------------------------------------------------

class Bus {
  constructor() { this.map = new Map(); }
  on(k, fn) { (this.map.get(k) || this.map.set(k, []).get(k)).push(fn); return () => this.off(k, fn); }
  off(k, fn) { const a = this.map.get(k); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } }
  emit(k, payload) { const a = this.map.get(k); if (a) for (let i = 0; i < a.length; i++) a[i](payload); }
}

/** Budgeted async boot queue — keeps the loading bar honest and the tab responsive. */
class BootQueue {
  constructor(ctx) { this.ctx = ctx; this.items = []; this.done = 0; this.total = 0; this.progress = 0; }
  task(name, fn, weight = 1) { this.items.push({ name, fn, weight }); this.total += weight; return this; }
  async run(onStage) {
    for (const it of this.items) {
      this.ctx.bootStage = it.name;
      onStage?.(it.name, this.progress);
      await new Promise(r => requestAnimationFrame(r)); // let the bar paint
      const started = performance.now();
      await it.fn(this.ctx);
      (this.ctx.debug.bootTimings || (this.ctx.debug.bootTimings = [])).push({
        stage: it.name, kind: 'task', ms: +(performance.now() - started).toFixed(1),
      });
      this.done += it.weight;
      this.progress = this.done / Math.max(1, this.total);
    }
    this.progress = 1;
    onStage?.('ready', 1);
  }
}

export function createContext({ canvas, seed = 'cinderbloom', preset = 'high' }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,          // TAA does AA; MSAA on an HDR target is wasted bandwidth
    alpha: false,
    stencil: false,
    depth: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    logarithmicDepthBuffer: false,
  });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 is required');

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;   // the grade pass owns tonemapping
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;         // engine/shadows.js takes this over
  renderer.autoClear = false;
  renderer.info.autoReset = false;              // renderFrame() owns the reset point
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  // 65 VERTICAL = 96.6 deg horizontal at 16:9 = CoD's "80" slider. The old 80
  // vertical was 112.3 deg horizontal — a fisheye that made every number in
  // COMBAT_FEEL wrong and blew cascade 3 out to 37 cm/texel (COMBAT_FEEL §1.1,
  // and the shadows agent's second on it in HANDOFF).
  const camera = new THREE.PerspectiveCamera(65, 1, 0.05, 4000);
  camera.position.set(0, 1.7, 0);
  camera.rotation.order = 'YXZ';

  const viewScene = new THREE.Scene();
  const viewCamera = new THREE.PerspectiveCamera(48, 1, 0.008, 12);
  viewCamera.rotation.order = 'YXZ';

  const ctx = {
    THREE, renderer, canvas, scene, camera, viewScene, viewCamera,
    gl: renderer.getContext(),
    size: { w: 1, h: 1, dpr: 1, aspect: 1 },
    time: { elapsed: 0, dt: 1 / 60, frame: 0, scale: 1, wall: 0 },
    rng: new RNG(seed),
    quality: { ...QUALITY[preset] },
    bus: new Bus(),
    sys: Object.create(null),
    debug: { flags: Object.create(null), stats: {} },
    bootStage: 'init',
    _systems: [],
  };
  ctx.boot = new BootQueue(ctx);
  ctx.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  // ---------------------------------------------------------------------------
  // ctx.world — ONE global environment signal (ART_DIRECTION §3.4).
  // Every emissive pulse, every foliage sway, and the volumetric wind advection
  // read `breath` and `wind` so they move in phase. Per-shader sines look
  // generated; one shared clock looks authored. Deterministic: driven only by
  // ctx.time.elapsed, never wall time, never Math.random.
  // ---------------------------------------------------------------------------
  ctx.world = {
    breath: 0.5,                                  // 0..1 gust scalar
    wind: new THREE.Vector3(0.62, 0.05, -0.78).normalize(),
    windSpeed: 1.0,
  };
  ctx.updateWorldSignal = () => {
    const t = ctx.time.elapsed;
    // three incommensurable periods so it never visibly loops
    const g = Math.sin(t * 0.37) * 0.5 + Math.sin(t * 0.113 + 1.7) * 0.33 + Math.sin(t * 0.887 + 4.1) * 0.17;
    ctx.world.breath = g * 0.5 + 0.5;
    ctx.world.windSpeed = 0.55 + 0.9 * ctx.world.breath;
  };
  ctx.updateWorldSignal();

  /** Register in dependency order; duplicates and missing deps throw loudly. */
  ctx.register = (System) => {
    const id = System.id;
    if (!id) throw new Error(`system ${System.name} has no static id`);
    if (ctx.sys[id]) throw new Error(`duplicate system id "${id}"`);
    const inst = new System(ctx);
    inst.__id = id;
    inst.__deps = System.deps || [];
    ctx.sys[id] = inst;
    ctx._systems.push(inst);
    return inst;
  };

  ctx.initAll = async () => {
    const order = topoSort(ctx._systems);
    for (const s of order) {
      ctx.bootStage = s.__id;
      const started = performance.now();
      if (s.init) await s.init();
      (ctx.debug.bootTimings || (ctx.debug.bootTimings = [])).push({
        stage: s.__id, kind: 'system', ms: +(performance.now() - started).toFixed(1),
      });
    }
    ctx._ordered = order;
  };

  ctx.setSize = (w, h, dpr) => {
    ctx.size.w = w; ctx.size.h = h; ctx.size.dpr = dpr; ctx.size.aspect = w / h;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    viewCamera.aspect = w / h; viewCamera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    for (const s of ctx._systems) s.resize?.(Math.round(w * dpr), Math.round(h * dpr));
  };

  ctx.setQuality = (name) => {
    if (!QUALITY[name]) return false;
    Object.assign(ctx.quality, QUALITY[name]);
    ctx.bus.emit('quality', ctx.quality);
    for (const s of ctx._systems) s.onQuality?.(ctx.quality);
    return true;
  };

  return ctx;
}

function topoSort(systems) {
  const byId = new Map(systems.map(s => [s.__id, s]));
  const seen = new Set(), out = [], stack = new Set();
  const visit = (s) => {
    if (seen.has(s.__id)) return;
    if (stack.has(s.__id)) throw new Error('dependency cycle at ' + s.__id);
    stack.add(s.__id);
    for (const d of s.__deps) {
      const dep = byId.get(d);
      if (!dep) throw new Error(`system "${s.__id}" depends on missing "${d}"`);
      visit(dep);
    }
    stack.delete(s.__id); seen.add(s.__id); out.push(s);
  };
  for (const s of systems) visit(s);
  return out;
}
