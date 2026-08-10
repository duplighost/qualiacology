// THE IRRADIANCE SPLAT — P0, and the fix for the finding that drove the whole
// render decision.
//
// C2-F2: "the scars do not light anything — 137 of 140 are unlit additive
// decals, so illuminationAt (the simulation) and the rendered picture diverge
// everywhere it matters, and the game's central promise is a decal that
// illuminates nothing."
//
// The fix is not more lights. It is to render the light field ONCE PER DEPOSIT
// into a per-chamber top-down RG16F 1024^2 target, from the SAME expression the
// CPU query sums:
//
//     R = SUM  i * (1 - d^2/r^2)^2          <- LightField.illuminationAt, exactly
//     G = SUM  i * (1 - d^2/r^2)^2 * y
//
// so G/R is the intensity-weighted mean scar height at that texel, and the
// surface shader attenuates by exp(-|y_frag - G/R| / 4.5). That is what lets a
// top-down projection survive THE HELIX's 34 m spiral instead of lighting the
// deck from two turns below.
//
// Cost: one texture fetch and three ALU per fragment. Unbounded scar count. Zero
// light slots. Zero program variants. And — the part that matters — the sim and
// the picture are the same expression by construction, which is the discipline
// groundAt() already enforces and the light field never did. tests/render.mjs
// reads this target back off the GPU and compares it against a brute-force CPU
// sum of the same scar list to within 1%.
//
// ON "NEVER CLEARED": a brand new scar is exactly one additive quad and no
// clear, which is the common case and the one docs/RENDER.md describes. But
// LightField.deposit MERGES a repeat kill into an existing scar, growing its i
// and r in place, and a grown Gaussian is not the sum of a delta — you cannot
// splat the difference. A mutation or a cull therefore forces a full rebuild
// (clear + one quad per scar, up to 140, on that frame only). Choosing drift-free
// over clear-free is not a liberty: the whole point of this target is that it
// cannot disagree with illuminationAt.

import * as THREE from 'three';
import FEEL from '../feel.js';
import { makeQuadInstances } from './materials.js';

export const IRRADIANCE_TABLE = Object.freeze({
  size: FEEL.render.irradianceSize,
  defaultSpan: 128,          // metres across, until a chamber declares its bounds
  maxSplatsPerFlush: 256,
});

const IT = IRRADIANCE_TABLE;

/** IEEE 754 binary16 -> Number. The readback path is raw gl.readPixels. */
export function halfToFloat(h) {
  const s = (h & 0x8000) ? -1 : 1;
  const e = (h & 0x7c00) >> 10;
  const m = h & 0x03ff;
  if (e === 0) return s * 5.9604644775390625e-8 * m;      // 2^-24 * m
  if (e === 0x1f) return m ? NaN : s * Infinity;
  return s * Math.pow(2, e - 15) * (1 + m / 1024);
}

export function makeIrradiance(ctx, family) {
  const renderer = ctx.renderer;
  const size = IT.size;

  const target = new THREE.WebGLRenderTarget(size, size, {
    format: THREE.RGFormat,
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
    colorSpace: THREE.NoColorSpace,
  });
  target.texture.name = 'flare.irradiance';

  const material = family.irradianceSplat();
  const { geometry, arrays } = makeQuadInstances(IT.maxSplatsPerFlush, ['iA', 'iB']);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.sortObjects = false;
  scene.add(mesh);
  const camera = new THREE.Camera();

  const bounds = { minX: -IT.defaultSpan / 2, minZ: -IT.defaultSpan / 2, spanX: IT.defaultSpan, spanZ: IT.defaultSpan };

  // Change detection against LightField, which emits no events and which we do
  // not own. Identity-keyed, so a merge that mutates a scar in place is seen.
  const shadow = new Map();
  let lastVersion = -1;
  let splatDraws = 0;
  let rebuilds = 0;
  let appends = 0;
  let lastFlushCount = 0;

  function applyBounds() {
    material.uniforms.uOrigin.value.set(bounds.minX, bounds.minZ);
    material.uniforms.uInvSize.value.set(1 / bounds.spanX, 1 / bounds.spanZ);
  }

  function setBounds(minX, minZ, maxX, maxZ) {
    bounds.minX = minX; bounds.minZ = minZ;
    bounds.spanX = Math.max(1e-3, maxX - minX);
    bounds.spanZ = Math.max(1e-3, maxZ - minZ);
    applyBounds();
    // A new chamber is a new projection: everything must be re-splatted.
    forceRebuild();
  }

  applyBounds();
  clearTarget();

  function clearTarget() {
    const prev = renderer.getRenderTarget();
    const pc = new THREE.Color();
    renderer.getClearColor(pc);
    const pa = renderer.getClearAlpha();
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.setClearColor(pc, pa);
    renderer.setRenderTarget(prev);
  }

  let pendingRebuild = false;
  function forceRebuild() { pendingRebuild = true; lastVersion = -1; }

  /** Draw `n` staged instances into the target. Additive, never depth-tested. */
  function draw(n) {
    if (n <= 0) return;
    geometry.instanceCount = n;
    arrays.iA.needsUpdate = true;
    arrays.iB.needsUpdate = true;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(prev);
    splatDraws++;
    lastFlushCount = n;
  }

  function stage(n, s, sign) {
    const a = arrays.iA.array, b = arrays.iB.array;
    a[n * 4] = s.x; a[n * 4 + 1] = s.y; a[n * 4 + 2] = s.z; a[n * 4 + 3] = s.r;
    b[n * 4] = s.i * sign; b[n * 4 + 1] = 0; b[n * 4 + 2] = 0; b[n * 4 + 3] = 0;
  }

  function rebuild(field) {
    clearTarget();
    shadow.clear();
    let n = 0;
    for (const s of field.scars) {
      if (n >= IT.maxSplatsPerFlush) { draw(n); n = 0; }
      stage(n++, s, 1);
      shadow.set(s, { x: s.x, y: s.y, z: s.z, r: s.r, i: s.i });
    }
    const neg = field.negLights;
    if (Array.isArray(neg)) {
      for (const s of neg) {
        if (n >= IT.maxSplatsPerFlush) { draw(n); n = 0; }
        stage(n++, s, -1);
      }
    }
    draw(n);
    rebuilds++;
    pendingRebuild = false;
  }

  /**
   * Called every frame; does nothing at all unless the field changed. This is the
   * "on deposit only, never per frame" contract, enforced by a version compare
   * rather than by remembering to call it.
   */
  function sync(field) {
    if (!field) return false;
    const negLive = Array.isArray(field.negLights) && field.negLights.length > 0;
    if (!pendingRebuild && field.version === lastVersion && !negLive) return false;

    if (pendingRebuild) { rebuild(field); lastVersion = field.version; return true; }

    // Negative lights (darkbolts) are transient and signed; while any exist the
    // projection is rebuilt, because their expiry is a subtraction we cannot
    // append. They are rare and short-lived by design (FEEL.projectiles).
    if (negLive) { rebuild(field); lastVersion = field.version; return true; }

    let mutated = false;
    let n = 0;
    for (const s of field.scars) {
      const was = shadow.get(s);
      if (!was) {
        if (n >= IT.maxSplatsPerFlush) { draw(n); n = 0; }
        stage(n++, s, 1);
        shadow.set(s, { x: s.x, y: s.y, z: s.z, r: s.r, i: s.i });
        appends++;
        continue;
      }
      if (was.i !== s.i || was.r !== s.r || was.x !== s.x || was.y !== s.y || was.z !== s.z) { mutated = true; break; }
    }
    if (!mutated && shadow.size !== field.scars.length) mutated = true;

    if (mutated) { rebuild(field); lastVersion = field.version; return true; }

    draw(n);
    lastVersion = field.version;
    return n > 0;
  }

  // -------------------------------------------------------------------------
  // Readback. Raw gl.readPixels with the implementation's preferred RG/HALF_FLOAT
  // pair, verified on this box. It costs ZERO programs, which matters: a debug
  // resolve pass would have been the eighteenth program and the budget is 17.
  // -------------------------------------------------------------------------
  function texelOf(worldX, worldZ) {
    const u = (worldX - bounds.minX) / bounds.spanX;
    const v = (worldZ - bounds.minZ) / bounds.spanZ;
    const px = Math.min(size - 1, Math.max(0, Math.floor(u * size)));
    const py = Math.min(size - 1, Math.max(0, Math.floor(v * size)));
    return { px, py, worldX: bounds.minX + (px + 0.5) / size * bounds.spanX, worldZ: bounds.minZ + (py + 0.5) / size * bounds.spanZ };
  }

  const readBuf = new Uint16Array(2);

  function sampleAt(worldX, worldZ) {
    const t = texelOf(worldX, worldZ);
    const gl = renderer.getContext();
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    gl.readPixels(t.px, t.py, 1, 1, gl.RG, gl.HALF_FLOAT, readBuf);
    renderer.setRenderTarget(prev);
    const r = halfToFloat(readBuf[0]);
    const g = halfToFloat(readBuf[1]);
    return { px: t.px, py: t.py, worldX: t.worldX, worldZ: t.worldZ, r, g, meanY: r > 0 ? g / r : 0 };
  }

  /**
   * The CPU reference. This is deliberately a SEPARATE transcription of the same
   * expression rather than a call into LightField: the assertion is that two
   * independent implementations of i*(1-d^2/r^2)^2 agree, which is the thing that
   * actually protects against drift.
   */
  function bruteForceAt(field, worldX, worldZ) {
    let r = 0, g = 0;
    for (const s of field.scars) {
      const dx = s.x - worldX, dz = s.z - worldZ;
      const d2 = dx * dx + dz * dz;
      const rr = s.r * s.r;
      if (d2 >= rr) continue;
      const t = 1 - d2 / rr;
      const e = s.i * t * t;
      r += e; g += e * s.y;
    }
    return { r, g, meanY: r > 0 ? g / r : 0 };
  }

  return {
    target,
    texture: target.texture,
    material,
    bounds,
    setBounds,
    sync,
    forceRebuild,
    sampleAt,
    bruteForceAt,
    texelOf,
    get metresPerTexel() { return Math.max(bounds.spanX, bounds.spanZ) / size; },
    snapshot() {
      return {
        size,
        format: 'RG16F',
        type: target.texture.type,
        halfFloat: target.texture.type === THREE.HalfFloatType,
        bounds: { ...bounds },
        metresPerTexel: Math.max(bounds.spanX, bounds.spanZ) / size,
        splatDraws, rebuilds, appends, lastFlushCount,
      };
    },
    dispose() {
      target.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}

export default makeIrradiance;
