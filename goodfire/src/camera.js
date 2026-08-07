// GOODFIRE camera.js — two tiers, one lens (Module A; owner: verbs agent).
// Conforms to canon-final §8: GROUND 16 px/tile (labor) and TOWER 4 px/tile (triage) —
// MID was deleted, a scope win. Log-space zoom lerp (zoom is multiplicative), cursor-
// anchored zoom-in, follow+lookahead steered by the mouse, trauma shake that never
// rotates. All time-based math takes dt explicitly, so a headless harness driving
// tick(target, mouse, 1/30) reproduces the camera exactly.
//
// worldToScreen/screenToWorld are shake-FREE: input mapping and sim reading must never
// wobble. The renderer applies shake() as a final translate when compositing.

import { GRID } from './canon.js';
import { cellHash01 } from './rng.js';

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// ---- tuning (canon-final §8 + interfaces.md Module A; homed here — canon.js owns no
//      camera numbers, and the same constant must never live in two files) ----
const PPT = { GROUND: 16, TOWER: 4 };  // the two map "readings": hands and head
const ZOOM_TAU = 0.110;      // s — fast enough to never gate a decision, slow enough to
                             // preserve the mental map (teleport zooms destroy it)
const ZOOM_SNAP = 0.01;      // snap at <1% remaining: kills the asymptotic shimmer
const FOLLOW_K = 8;          // /s exponential — ~0.15 s settle, critically-damped feel
const FOLLOW_EASE_S = 0.15;  // s — an anchored zoom hands the frame to follow at a dead stop;
                             // ramping the follow gain 0→FOLLOW_K over this window keeps camera
                             // VELOCITY continuous. A hard k=8 handoff read as a one-frame yank
const LOOK_FRAC = 0.22, LOOK_MAX = 5.5; // tiles — more map where you're working, warden
                             // never leaves the center third of the screen
const TRAUMA_MAX_PX = 4;     // art's cap (canon-final §8: verbs' sources, art's caps)
const TRAUMA_DECAY = 1.2;    // /s linear
const TRAUMA_TOWER_MUL = 0.3;// the mountain shakes the warden's hands, not the map table
const SHAKE_HZ = 25;         // Perlin-ish lattice rate: reads as rumble, not buzz
const SHAKE_SALT_X = 0x5EAC, SHAKE_SALT_Y = 0xA11E; // cosmetic-only hash salts (no stream
                             // consumption — cellHash01 is stateless, so shake can never
                             // shift ember dice even if sampled at render rate)
const MAP_CENTER = GRID / 2; // the mountain's middle: where TOWER sits whenever the whole
                             // axis fits on the paper (see the TOWER branch in tick())

// smooth value-noise in [-1,1] over a 25 Hz lattice — deterministic, allocation-free
function noise1(t, salt) {
  const i = Math.floor(t), f = t - i;
  const s = f * f * (3 - 2 * f);
  const a = cellHash01(i & 0x7fffffff, salt), b = cellHash01((i + 1) & 0x7fffffff, salt);
  return (a + (b - a) * s) * 2 - 1;
}

export function createCamera(viewportW, viewportH) {
  let vw = viewportW, vh = viewportH;
  let tier = 'GROUND';
  let ppt = PPT.GROUND, pptTarget = PPT.GROUND;
  let cx = MAP_CENTER, cy = MAP_CENTER; // world-tile center of the view
  let started = false;                  // first tick snaps to the warden: no boot swoop
  let anchor = null;                    // {wx,wy,sx,sy} — pinned world point during zoom-in
  let trauma = 0;
  let shakeT = 0;                       // advances on tick(dt): headless-reproducible
  let lastTarget = { x: MAP_CENTER, y: MAP_CENTER };
  let followEase = 1;                   // 0→1 gain ramp; reset to 0 when an anchor releases

  // The half-view in tiles, and the frame center that keeps the paper full on that axis.
  // If the viewport outsizes the map on an axis, the map centers (void margins, no clamp).
  function frameCenter(half, t) { return half * 2 >= GRID ? MAP_CENTER : clamp(t, half, GRID - half); }

  function worldToScreen(p) { return { x: (p.x - cx) * ppt + vw / 2, y: (p.y - cy) * ppt + vh / 2 }; }
  function screenToWorld(p) { return { x: (p.x - vw / 2) / ppt + cx, y: (p.y - vh / 2) / ppt + cy }; }

  function setTier(t) {
    if (t !== 'GROUND' && t !== 'TOWER') return;
    tier = t;
    pptTarget = PPT[t];
    if (t === 'TOWER') anchor = null; // going up eases to map-center; never cursor-pinned
  }

  function tick(target, mouseScreen, dt) {
    if (target) lastTarget = target;
    if (!started && target) { cx = target.x; cy = target.y; started = true; }

    // -- zoom: exponential smoothing in log space (multiplicative units) --
    if (ppt !== pptTarget) {
      const a = 1 - Math.exp(-dt / ZOOM_TAU);
      ppt = Math.exp(Math.log(ppt) + (Math.log(pptTarget) - Math.log(ppt)) * a);
      if (Math.abs(ppt - pptTarget) / pptTarget < ZOOM_SNAP) ppt = pptTarget;
    }
    const zooming = ppt !== pptTarget;

    if (anchor) {
      // cursor-anchored zoom-in: the point under the cursor stays put — you zoom INTO
      // the thing you're looking at, never losing the target. The correction runs on the
      // SNAP tick too, before the anchor is dropped: releasing it one tick early left the
      // frame a fraction of a tile off the anchor and follow yanked that error out at
      // k=8 in a single frame (a visible rubber-band on every wheel notch).
      cx = anchor.wx - (anchor.sx - vw / 2) / ppt;
      cy = anchor.wy - (anchor.sy - vh / 2) / ppt;
      if (!zooming) { anchor = null; followEase = 0; } // hand off to follow from a dead stop
    } else if (tier === 'TOWER') {
      // The tower is a PLACE, not a lens: no mouse lookahead, no dead zone, no steering —
      // you step back from the table and the mountain is on it, always at 4 px/tile
      // (canon-final §8: the two tiers are 16 and 4, and a viewport-fitted ppt would make
      // the tower a different-sized place on every monitor). But a table you cannot see
      // the town on is a picture, not a map: at 4 px/tile the design viewport shows
      // 320×200 of a 320² mountain, so Millhaven (y 288–316) — the prologue fire, F5's
      // siege, every structure that matters — sat permanently off-frame at exactly the
      // tier you climb up here to use. So the frame CLAMP-follows the body: it holds the
      // paper full and only moves on an axis the mountain overruns (at 1280×800, y alone).
      // Same rule as the world-bounds clamp below — one law, applied as a target instead
      // of as a correction, so it eases instead of snapping.
      const hw = vw / 2 / ppt, hh = vh / 2 / ppt;
      const tcx = frameCenter(hw, lastTarget.x), tcy = frameCenter(hh, lastTarget.y);
      const k = 1 - Math.exp(-FOLLOW_K * dt);
      cx += (tcx - cx) * k;
      cy += (tcy - cy) * k;
      if (Math.abs(cx - tcx) < 0.01) cx = tcx;
      if (Math.abs(cy - tcy) < 0.01) cy = tcy;
    } else if (target) {
      // follow + lookahead: steer the view with the mouse without ever losing your body
      let lx = 0, ly = 0;
      if (mouseScreen) {
        const mw = screenToWorld(mouseScreen);
        const dx = mw.x - target.x, dy = mw.y - target.y;
        const d = Math.hypot(dx, dy);
        if (d > 0) {
          const L = Math.min(LOOK_FRAC * d, LOOK_MAX);
          lx = dx / d * L; ly = dy / d * L;
        }
      }
      // the gain ramps in over FOLLOW_EASE_S after an anchor release, so the frame leaves
      // the anchored point at the speed it arrived: zero. Steady-state is the same k=8.
      followEase = Math.min(1, followEase + dt / FOLLOW_EASE_S);
      const k = 1 - Math.exp(-FOLLOW_K * followEase * dt);
      cx += (target.x + lx - cx) * k;
      cy += (target.y + ly - cy) * k;
    }

    // -- world bounds: never show void when the map can fill the frame (the epilogue's
    // town bridge sits 17 tiles off the south edge — raw void under april's fireweed
    // read as a bug, and it was one). If the viewport outsizes the map, center instead.
    // TOWER already targets a clamped center (above), so this is a no-op up there except
    // while the zoom is still lerping — where the half-view is changing every tick and a
    // hard clamp would fight the ease. --
    if (tier !== 'TOWER' || !zooming) {
      const hw = vw / 2 / ppt, hh = vh / 2 / ppt;
      cx = frameCenter(hw, cx);
      cy = frameCenter(hh, cy);
    }

    // -- trauma: linear decay; shake time advances here so feel is tick-deterministic --
    trauma = Math.max(0, trauma - TRAUMA_DECAY * dt);
    shakeT += dt;
  }

  return {
    tick,
    setTier,
    tier: () => tier,
    toggleTower() {
      if (tier === 'TOWER') {
        // going down anchors on the warden: the "run down the tower stairs" key lands
        // you on your own boots (spec-verbs §3.1)
        const s = worldToScreen(lastTarget);
        setTier('GROUND');
        anchor = { wx: lastTarget.x, wy: lastTarget.y, sx: s.x, sy: s.y };
      } else setTier('TOWER');
    },
    zoomStep(dir, anchorWorld) {
      // wheel: one tier per notch, clamped. Zoom-in pins the cursor's world point;
      // zoom-out eases to the fixed tower frame (a fixed frame can't hold an anchor).
      if (dir > 0 && tier !== 'GROUND') {
        const s = anchorWorld ? worldToScreen(anchorWorld) : null;
        setTier('GROUND');
        if (s) anchor = { wx: anchorWorld.x, wy: anchorWorld.y, sx: s.x, sy: s.y };
      } else if (dir < 0 && tier !== 'TOWER') setTier('TOWER');
    },
    pxPerTile: () => ppt,
    worldToScreen,
    screenToWorld,
    addTrauma(v) { trauma = Math.min(1, trauma + v); },
    shake() {
      // trauma² × 4 px, translation ONLY — rotation corrupts map reading, and the map
      // is the instrument panel. ×0.3 at TOWER: triage hands stay steady.
      const amp = trauma * trauma * TRAUMA_MAX_PX * (tier === 'TOWER' ? TRAUMA_TOWER_MUL : 1);
      if (amp === 0) return { x: 0, y: 0 };
      return { x: noise1(shakeT * SHAKE_HZ, SHAKE_SALT_X) * amp,
               y: noise1(shakeT * SHAKE_HZ, SHAKE_SALT_Y) * amp };
    },
    resize(w, h) { vw = w; vh = h; },
  };
}
