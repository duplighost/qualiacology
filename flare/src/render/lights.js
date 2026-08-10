// THE ROVER POOL — eight lights, and not one THREE.Light object.
//
// docs/RENDER.md, and the measurement behind it: r161 textually substitutes
// NUM_POINT_LIGHTS into every lit shader and the count is part of the program
// cache key, so adding one light mid-fight relinks every lit material in the
// scene — a multi-second ANGLE hitch the first time you pull the trigger. The
// sibling project worked around this in two separate files. We refuse the
// lighting path outright, so the failure class is unreachable rather than
// avoided.
//
// What replaces it: an RGBA32F DataTexture read with texelFetch behind a UNIFORM
// loop bound. Two texels per light:
//     texel 2i     = (x, y, z, radius^2)
//     texel 2i + 1 = (r*I, g*I, b*I, kind)
// Never a `uniform vec4 x[N]` indexed by a variable — ANGLE/D3D11 lowers that to
// a generated helper and emits X4000 dyn_index, which the harness promotes to an
// error naming no file, turning every agent's gate red at once.
//
// C2-F3 is the reason the pool is CATEGORISED rather than globally sorted. A
// single sorted list of 30+ requesters against 8 slots makes the room strobe in
// exactly the fights the game is about. Instead each category owns a fixed slot
// range and a slot only changes owner if the challenger is meaningfully closer
// AND the incumbent has held long enough to have been seen.
//
// Two whole requester classes were also removed from contention, which is what
// makes 8 enough where 12 was not: scars are the irradiance texture now, and
// THE FURNACE's lamps are permanent scar records. Neither ever asks for a slot.

import * as THREE from 'three';
import FEEL from '../feel.js';

export const LIGHT_TABLE = Object.freeze({
  // Slot ranges are derived from FEEL.render.lightReserve so the reservation and
  // the pool size can never disagree. Order matters: muzzle first, because slot 0
  // is the one light that is always live while firing.
  order: Object.freeze(['muzzle', 'telegraph', 'projectiles', 'flares']),
  texelsPerLight: 2,
  defaultColor: Object.freeze([1, 1, 1]),
  ownerChangeWindow: 1.0,        // seconds; the budget and the metric share it
  // C2-F3's QA assertion is "slot-owner changes per second < 8 during a saturated
  // fight". The per-slot rule ALONE cannot deliver that: a 0.25 s hold permits
  // four swaps per second per slot, and eight slots is a theoretical 32/s. A
  // saturated fight with crossing distances measured 14/s before this budget
  // existed. So the pool carries a global brake as well, and it is deliberately
  // spent on CONTESTED swaps only -- refilling a slot whose emitter died is the
  // light following the action, not the room strobing.
  maxContestedPerWindow: 6,
  minRadius: 0.05,
});

const LT = LIGHT_TABLE;

/** kind bits read by the surface shader. A disc pool is not a point light. */
export const LIGHT_KIND = Object.freeze({ POINT: 0, DISC: 1, MUZZLE: 2, COLD: 3 });

export function makeLights(ctx) {
  const slots = FEEL.render.lightSlots;
  const reserve = FEEL.render.lightReserve;

  // Fixed slot ranges, computed once. If the reservation does not sum to the pool
  // size that is a tuning-block error and it must be loud, not silently clamped.
  const ranges = {};
  let cursor = 0;
  for (const cat of LT.order) {
    const n = reserve[cat] | 0;
    ranges[cat] = { start: cursor, count: n };
    cursor += n;
  }
  if (cursor !== slots) {
    throw new Error(`FEEL.render.lightReserve sums to ${cursor} but lightSlots is ${slots}`);
  }

  const width = slots * LT.texelsPerLight;
  const data = new Float32Array(width * 4);
  const texture = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat, THREE.FloatType);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;

  // ---- request buffers, preallocated. CONTRACT §4: the hot path allocates none.
  const CAP = 64;
  const req = {
    cat: new Array(CAP).fill(''),
    key: new Array(CAP).fill(0),
    x: new Float32Array(CAP), y: new Float32Array(CAP), z: new Float32Array(CAP),
    r: new Float32Array(CAP), i: new Float32Array(CAP),
    cr: new Float32Array(CAP), cg: new Float32Array(CAP), cb: new Float32Array(CAP),
    kind: new Float32Array(CAP),
    d2: new Float32Array(CAP),
    used: new Uint8Array(CAP),
  };
  let reqCount = 0;
  let refused = 0;

  // ---- slot state
  const slotKey = new Int32Array(slots).fill(-1);
  const slotHeld = new Float32Array(slots);
  const slotD2 = new Float32Array(slots).fill(Infinity);
  const slotLive = new Uint8Array(slots);

  const candIdx = new Int32Array(CAP);
  let ownerChanges = 0;
  let contested = 0;
  let changeWindow = 0;
  let changesPerSecond = 0;
  let contestedPerSecond = 0;
  let budgetRefusals = 0;
  let activeCount = 0;

  const closer = 1 - FEEL.render.lightHysteresisCloser;   // challenger must be this fraction of the incumbent distance
  const holdFor = FEEL.render.lightHysteresisHold;
  const projRange2 = FEEL.render.projectileLightRange * FEEL.render.projectileLightRange;

  function beginFrame() {
    reqCount = 0;
  }

  /**
   * Ask for a slot this frame. `key` must be stable for the same emitter across
   * frames — that is what hysteresis is measured against. A refusal is counted
   * and surfaced, never swallowed.
   */
  function request(category, key, x, y, z, radius, intensity, color, kind) {
    if (reqCount >= CAP) { refused++; return false; }
    if (!ranges[category]) { refused++; return false; }
    if (!(radius > LT.minRadius) || !(intensity > 0)) return false;
    const n = reqCount++;
    req.cat[n] = category;
    req.key[n] = key | 0;
    req.x[n] = x; req.y[n] = y; req.z[n] = z;
    req.r[n] = radius; req.i[n] = intensity;
    if (color) { req.cr[n] = color[0]; req.cg[n] = color[1]; req.cb[n] = color[2]; }
    else { req.cr[n] = LT.defaultColor[0]; req.cg[n] = LT.defaultColor[1]; req.cb[n] = LT.defaultColor[2]; }
    req.kind[n] = kind === undefined ? LIGHT_KIND.POINT : kind;
    return true;
  }

  /**
   * Resolve requests into slots and upload. Called once per frame, after every
   * system has asked. `dt` is render dt: hysteresis is about what the EYE saw,
   * so it runs on the presentation clock and keeps counting during hitstop.
   */
  function commit(camX, camY, camZ, dt) {
    for (let n = 0; n < reqCount; n++) {
      const dx = req.x[n] - camX, dy = req.y[n] - camY, dz = req.z[n] - camZ;
      req.d2[n] = dx * dx + dy * dy + dz * dz;
      req.used[n] = 0;
    }

    for (let s = 0; s < slots; s++) slotHeld[s] += dt;

    activeCount = 0;

    for (const cat of LT.order) {
      const range = ranges[cat];
      if (range.count === 0) continue;

      // Gather this category's candidates, nearest first. Insertion sort over at
      // most a handful of entries and it allocates nothing.
      let cn = 0;
      for (let n = 0; n < reqCount; n++) {
        if (req.cat[n] !== cat) continue;
        // Projectile lights are nearest-only inside their own range (C2-F3).
        if (cat === 'projectiles' && req.d2[n] > projRange2) continue;
        let k = cn++;
        while (k > 0 && req.d2[candIdx[k - 1]] > req.d2[n]) { candIdx[k] = candIdx[k - 1]; k--; }
        candIdx[k] = n;
      }

      // Pass 1 — incumbents keep their slot unless a challenger has earned it.
      for (let s = range.start; s < range.start + range.count; s++) {
        if (slotKey[s] < 0) continue;
        let found = -1;
        for (let c = 0; c < cn; c++) {
          const n = candIdx[c];
          if (!req.used[n] && req.key[n] === slotKey[s]) { found = n; break; }
        }
        if (found < 0) { slotKey[s] = -1; slotLive[s] = 0; continue; }

        const best = cn > 0 ? candIdx[0] : -1;
        const challengerCloser = best >= 0 && !req.used[best] && best !== found
          && req.d2[best] < req.d2[found] * closer * closer;
        if (challengerCloser && slotHeld[s] >= holdFor) {
          if (contested >= LT.maxContestedPerWindow) {
            budgetRefusals++;            // the budget is spent: the incumbent stays lit
          } else {
            contested++;
            slotKey[s] = -1; slotLive[s] = 0;   // released; pass 2 reassigns it
            continue;
          }
        }
        req.used[found] = 1;
        write(s, found);
      }

      // Pass 2 — fill empty slots with the nearest unclaimed candidates.
      for (let s = range.start; s < range.start + range.count; s++) {
        if (slotLive[s]) continue;
        let picked = -1;
        for (let c = 0; c < cn; c++) { const n = candIdx[c]; if (!req.used[n]) { picked = n; break; } }
        if (picked < 0) { clearSlot(s); continue; }
        req.used[picked] = 1;
        if (slotKey[s] !== req.key[picked]) { ownerChanges++; slotHeld[s] = 0; }
        slotKey[s] = req.key[picked];
        write(s, picked);
      }
    }

    // Compact: the shader loops 0..uLightCount, so live slots must be a prefix.
    // Writing them in slot order preserves the category reservation inside the
    // prefix, which is what keeps the muzzle from being displaced by three bolts.
    compact();

    changeWindow += dt;
    if (changeWindow >= LT.ownerChangeWindow) {
      changesPerSecond = ownerChanges / changeWindow;
      contestedPerSecond = contested / changeWindow;
      ownerChanges = 0; contested = 0; changeWindow = 0;
    }

    texture.needsUpdate = true;
    return activeCount;
  }

  const stageX = new Float32Array(FEEL.render.lightSlots);
  const stageY = new Float32Array(FEEL.render.lightSlots);
  const stageZ = new Float32Array(FEEL.render.lightSlots);
  const stageR2 = new Float32Array(FEEL.render.lightSlots);
  const stageR = new Float32Array(FEEL.render.lightSlots);
  const stageG = new Float32Array(FEEL.render.lightSlots);
  const stageB = new Float32Array(FEEL.render.lightSlots);
  const stageK = new Float32Array(FEEL.render.lightSlots);

  function write(s, n) {
    slotLive[s] = 1;
    slotD2[s] = req.d2[n];
    stageX[s] = req.x[n]; stageY[s] = req.y[n]; stageZ[s] = req.z[n];
    stageR2[s] = req.r[n] * req.r[n];
    stageR[s] = req.cr[n] * req.i[n];
    stageG[s] = req.cg[n] * req.i[n];
    stageB[s] = req.cb[n] * req.i[n];
    stageK[s] = req.kind[n];
  }

  function clearSlot(s) {
    slotLive[s] = 0; slotKey[s] = -1; slotD2[s] = Infinity;
  }

  function compact() {
    let w = 0;
    for (let s = 0; s < slots; s++) {
      if (!slotLive[s]) continue;
      const o = w * LT.texelsPerLight * 4;
      data[o] = stageX[s]; data[o + 1] = stageY[s]; data[o + 2] = stageZ[s]; data[o + 3] = stageR2[s];
      data[o + 4] = stageR[s]; data[o + 5] = stageG[s]; data[o + 6] = stageB[s]; data[o + 7] = stageK[s];
      w++;
    }
    // Zero the tail so a stale light can never be read if a bound is ever wrong.
    for (let i = w * LT.texelsPerLight * 4; i < data.length; i++) data[i] = 0;
    activeCount = w;
  }

  function reset() {
    for (let s = 0; s < slots; s++) { clearSlot(s); slotHeld[s] = 0; }
    data.fill(0);
    activeCount = 0; ownerChanges = 0; contested = 0; changeWindow = 0;
    changesPerSecond = 0; contestedPerSecond = 0; refused = 0; budgetRefusals = 0;
    texture.needsUpdate = true;
  }

  return {
    texture,
    slots,
    ranges,
    beginFrame,
    request,
    commit,
    reset,
    get count() { return activeCount; },
    get refused() { return refused; },
    get ownerChangesPerSecond() { return changesPerSecond; },
    get contestedSwapsPerSecond() { return contestedPerSecond; },
    get budgetRefusals() { return budgetRefusals; },
    snapshot() {
      return {
        slots,
        active: activeCount,
        refused,
        ownerChangesPerSecond: changesPerSecond,
        contestedSwapsPerSecond: contestedPerSecond,
        budgetRefusals,
        contestedBudget: LT.maxContestedPerWindow,
        reserve: { ...reserve },
      };
    },
    dispose() { texture.dispose(); },
  };
}

export default makeLights;
