// =============================================================================
// CINDERBLOOM — HUD. Owner: hud agent. See docs/CONTRACT.md §4, COMBAT_FEEL §4.
// =============================================================================
//
// ## WHY THIS IS NOT DOM TEXT
//
// CRITIC.md automatic failure #13 is "UI that looks like a browser (default
// fonts, flat boxes)". There is no way to ship a system font and not look like a
// browser, and CONTRACT §1 forbids fetching a webfont. So the HUD carries its
// own typeface: `Type` below is a stroke-constructed, chamfered technical face
// authored on a unit em box, rendered with `lineJoin:'miter'` at a low
// `miterLimit` so every corner self-bevels. One glyph set, weight-parameterised:
// hairline at 9 px for labels, 20% of cap height for the ammo counter. It is
// crisp at any DPR because it is geometry, not a bitmap.
//
// ## HOW IT COSTS NOTHING
//
// Five small canvases, each with its own dirty flag, none of them full-screen:
//
//   reticle   ~670 CSS px square, centred. Crosshair + hitmarkers + damage arcs.
//   compass   360 x 26,  top centre.   Repaints when yaw moves.
//   ammo      340 x 132, bottom right. Repaints when the readout text changes.
//   vitals    300 x 96,  bottom left.
//   feed      460 x 190, top right.
//
// Objective markers and damage numbers are pooled DOM nodes moved by
// `transform` with their glyph drawn into a 92 px canvas once. The low-health
// vignette is a CSS layer with a procedurally generated irregular edge mask, so
// it costs an opacity write. Nothing here allocates per frame and nothing here
// adds a WebGL draw call. Measured cost is in docs/HANDOFF.md.
//
// ## THE DATA CONTRACT — combat.js is the model, this file is the view
//
// `src/game/combat.js` publishes the authoritative readout and it wins over
// everything else here. Pulled once per sim step:
//
//   ctx.sys.combat.hudState() -> {
//     marker:{kind,t,phase,duck, zone,melee,strength,hpFrac,seq},
//     numbers[], hits[], dirs[{angle,t,strength}],
//     health, maxHealth, regenerating, lastHitT,
//     ammo, reserve, reloading, cone /* live spread HALF-angle in degrees */,
//     reserveMax, lowAmmo, reserveEmpty, pickupT, pickupRounds, cacheT,
//     killT, killKind, killZone, kills, meleePhase, meleeT }
//
// ## THE CONFIRMATION CHAIN (round 11) — what this file is for
//
// Player, 2026-08-01: *"it needs to feel satisfying to kill them somehow."*
// The three things this file owns in that chain, and the rule each obeys:
//
//   HIT   inside 60 ms. The marker is painted on the frame of the hit (one sim
//         step, 16.7 ms) because `_pullCombat` reads combat's marker slot every
//         step and `lateUpdate` paints it the same frame. Nothing is queued.
//   KILL  must not look like a hit. Recoded on FOUR axes — shape (a rotating
//         ring with cardinal arrowheads, not diagonal ticks), motion (an
//         outBack overshoot + a cyan clap ring), duration (290 ms, or 420 for
//         a melee kill, against a hit's 210) and value (near-white, the
//         brightest thing in the readout). Colour is the LAST of the four, on
//         purpose: the player has moderate deuteranomaly and §4.6's red-vs-
//         white kill/hit distinction does not exist for him. See MARK_STYLE.
//   STATE every ammo tier is redundantly coded per ACCESSIBILITY §5 — pickup is
//         a rising cyan "+N" with a chevron, low reserve is amber PLUS a dashed
//         rule PLUS the word, empty reserve is an INVERSE-VIDEO plate PLUS a
//         blink PLUS brackets PLUS a boxed magazine strip PLUS a centre tag.
//
// Secondary pulls, each optional:
//   ctx.sys.weapons.hudState() -> { name, mode, magSize, adsT, state, heat }
//     (or the loose fields .name/.mode/.magSize/.adsT — weapons.js is still a
//      stub at time of writing, so nothing above is assumed to exist)
//   ctx.sys.director.tension  -> 0..1, holds the chrome at full presence
//
// PUSHED on the bus. Both the shapes combat.js/director.js actually emit and
// the neutral shapes are accepted, because two agents landed two vocabularies:
//   'combat:kill'   { actor, x,y,z, damage, wallbang }      -> killfeed
//   'combat:hitmarker' { kind, duck }                        -> marker
//   'player:damage' { amount, health, angle /* rad, view-relative */ }
//   'player:health' { hp, max, frac, delta }
//   'objective'     { text, sub, waypoint:{x,y,z,dist} }     (director shape)
//                 | { id, pos:[x,y,z], label, kind }         (neutral shape)
//   'prompt'        { text, ms }
//   'ammo' | 'weapon' | 'health' | 'hit' | 'kill' | 'damage' — neutral aliases
//
// Everything degrades: with every game system a stub this file still shows a
// coherent, honest readout off its own local model.
//
// Knobs: ctx.debug.hud. `ctx.sys.hud.stage(name)` dresses the review shots and
// defers to combat.stageBurst() wherever combat.js can answer instead.
// =============================================================================

import * as THREE from 'three';
import { clamp, sat, lerp, ease, DEG, TAU, wrapPi } from '../util/math.js';
import { RNG } from '../util/rng.js';

// -----------------------------------------------------------------------------
// Palette. ART_DIRECTION §2: the world is greyscale and colour is an event, so
// the HUD is bone-ash on char with exactly three signal colours — amber for
// attention, ember-red for harm, quickfire cyan for information. No blues, no
// greens, nothing off the Planckian locus except the cyan, which is the world's
// one licensed non-blackbody hue (E5).
// -----------------------------------------------------------------------------
export const PALETTE = {
  ink: '#ECE3D1',
  ink2: '#C6BBA4',
  dim: '#8E8676',
  amber: '#F2A544',
  ember: '#FF6B2C',
  danger: '#FF3B22',
  cold: '#6FD9CE',
  shadow: 'rgba(6,4,3,0.70)',
  plate: 'rgba(10,8,6,0.28)',
};

// -----------------------------------------------------------------------------
// TYPE — a chamfered technical face, authored on a unit em box.
// x in [0, glyph.w], y in [0, 1] with y = 0 at cap top and y = 1 on the
// baseline. `s` are polylines (closed shapes simply repeat their first point),
// `d` are square dots (periods, colons) drawn at the current stroke weight.
// Every letter is 0.60 em wide, so digits are tabular by construction and an
// ammo counter never reflows as it counts down.
// -----------------------------------------------------------------------------
const W = 0.60;
const G = {
  A: { w: W, s: [[0, 1, .30, 0, .60, 1], [.11, .63, .49, .63]] },
  B: { w: W, s: [[0, 1, 0, 0, .42, 0, .58, .16, .58, .34, .44, .5, 0, .5], [.44, .5, .60, .66, .60, .84, .44, 1, 0, 1]] },
  C: { w: W, s: [[.60, .17, .44, 0, .16, 0, 0, .17, 0, .83, .16, 1, .44, 1, .60, .83]] },
  D: { w: W, s: [[0, 1, 0, 0, .40, 0, .60, .20, .60, .80, .40, 1, 0, 1]] },
  E: { w: W, s: [[.58, 0, 0, 0, 0, 1, .58, 1], [0, .48, .44, .48]] },
  F: { w: W, s: [[.58, 0, 0, 0, 0, 1], [0, .48, .44, .48]] },
  G: { w: W, s: [[.60, .17, .44, 0, .16, 0, 0, .17, 0, .83, .16, 1, .44, 1, .60, .83, .60, .55, .33, .55]] },
  H: { w: W, s: [[0, 0, 0, 1], [.60, 0, .60, 1], [0, .5, .60, .5]] },
  I: { w: 0.34, s: [[.17, 0, .17, 1]] },
  J: { w: W, s: [[.60, 0, .60, .82, .44, 1, .17, 1, 0, .82, 0, .70]] },
  K: { w: W, s: [[0, 0, 0, 1], [.58, 0, .06, .52], [.24, .36, .60, 1]] },
  L: { w: W, s: [[0, 0, 0, 1, .56, 1]] },
  M: { w: 0.68, s: [[0, 1, 0, 0, .34, .46, .68, 0, .68, 1]] },
  N: { w: W, s: [[0, 1, 0, 0, .60, 1, .60, 0]] },
  O: { w: W, s: [[.16, 0, .44, 0, .60, .17, .60, .83, .44, 1, .16, 1, 0, .83, 0, .17, .16, 0]] },
  P: { w: W, s: [[0, 1, 0, 0, .44, 0, .60, .16, .60, .38, .44, .54, 0, .54]] },
  Q: { w: W, s: [[.16, 0, .44, 0, .60, .17, .60, .83, .44, 1, .16, 1, 0, .83, 0, .17, .16, 0], [.36, .70, .64, 1.05]] },
  R: { w: W, s: [[0, 1, 0, 0, .44, 0, .60, .16, .60, .38, .44, .54, 0, .54], [.30, .54, .60, 1]] },
  S: { w: W, s: [[.60, .16, .44, 0, .16, 0, 0, .16, 0, .34, .14, .48, .46, .48, .60, .63, .60, .84, .44, 1, .16, 1, 0, .84]] },
  T: { w: W, s: [[0, 0, .60, 0], [.30, 0, .30, 1]] },
  U: { w: W, s: [[0, 0, 0, .82, .17, 1, .43, 1, .60, .82, .60, 0]] },
  V: { w: W, s: [[0, 0, .30, 1, .60, 0]] },
  W: { w: 0.72, s: [[0, 0, .15, 1, .36, .38, .57, 1, .72, 0]] },
  X: { w: W, s: [[0, 0, .60, 1], [.60, 0, 0, 1]] },
  Y: { w: W, s: [[0, 0, .30, .46, .60, 0], [.30, .46, .30, 1]] },
  Z: { w: W, s: [[0, 0, .60, 0, 0, 1, .60, 1]] },

  0: { w: W, s: [[.16, 0, .44, 0, .60, .17, .60, .83, .44, 1, .16, 1, 0, .83, 0, .17, .16, 0]] },
  1: { w: W, s: [[.06, .20, .30, 0, .30, 1]] },
  2: { w: W, s: [[0, .18, .17, 0, .43, 0, .60, .17, .60, .33, 0, 1, .60, 1]] },
  3: { w: W, s: [[0, 0, .60, 0, .30, .44, .46, .44, .60, .60, .60, .84, .44, 1, .16, 1, 0, .84]] },
  4: { w: W, s: [[.42, 1, .42, 0, 0, .66, .60, .66]] },
  5: { w: W, s: [[.58, 0, 0, 0, 0, .42, .44, .42, .60, .58, .60, .84, .44, 1, .16, 1, 0, .84]] },
  6: { w: W, s: [[.52, .04, .38, 0, .16, 0, 0, .17, 0, .83, .16, 1, .44, 1, .60, .83, .60, .62, .44, .46, .16, .46, 0, .62]] },
  7: { w: W, s: [[0, 0, .60, 0, .22, 1]] },
  8: { w: W, s: [[.16, .5, .44, .5, .60, .66, .60, .84, .44, 1, .16, 1, 0, .84, 0, .66, .16, .5, 0, .34, 0, .16, .16, 0, .44, 0, .60, .16, .60, .34, .44, .5]] },
  9: { w: W, s: [[.08, .96, .22, 1, .44, 1, .60, .83, .60, .17, .44, 0, .16, 0, 0, .17, 0, .38, .16, .54, .44, .54, .60, .38]] },

  ' ': { w: 0.38, s: [] },
  '-': { w: 0.52, s: [[.06, .52, .46, .52]] },
  '_': { w: W, s: [[0, 1, .60, 1]] },
  '/': { w: 0.52, s: [[.44, -.04, .08, 1.04]] },
  '+': { w: W, s: [[.06, .5, .54, .5], [.30, .26, .30, .74]] },
  '=': { w: W, s: [[.06, .38, .54, .38], [.06, .66, .54, .66]] },
  '<': { w: 0.50, s: [[.42, .18, .08, .50, .42, .82]] },
  '>': { w: 0.50, s: [[.08, .18, .42, .50, .08, .82]] },
  '(': { w: 0.40, s: [[.32, -.02, .12, .24, .12, .76, .32, 1.02]] },
  ')': { w: 0.40, s: [[.08, -.02, .28, .24, .28, .76, .08, 1.02]] },
  '[': { w: 0.38, s: [[.30, -.02, .10, -.02, .10, 1.02, .30, 1.02]] },
  ']': { w: 0.38, s: [[.08, -.02, .28, -.02, .28, 1.02, .08, 1.02]] },
  '|': { w: 0.28, s: [[.14, -.04, .14, 1.04]] },
  '.': { w: 0.32, s: [], d: [[.16, .94]] },
  ',': { w: 0.32, s: [[.18, .92, .06, 1.14]] },
  ':': { w: 0.32, s: [], d: [[.16, .30], [.16, .86]] },
  '!': { w: 0.32, s: [[.16, 0, .16, .66]], d: [[.16, .94]] },
  '%': { w: 0.72, s: [[.60, .04, .10, .96]], d: [[.12, .16], [.56, .78]] },
  '·': { w: 0.34, s: [], d: [[.17, .54]] },   // interpunct
  '•': { w: 0.40, s: [], d: [[.18, .52]] },   // bullet
  '▸': { w: 0.44, s: [[.10, .24, .38, .52, .10, .80, .10, .24]] }, // solid-ish caret
  '×': { w: 0.54, s: [[.08, .28, .46, .74], [.46, .28, .08, .74]] },
};

const FALLBACK = G['·'];

export const Type = {
  glyph(ch) { return G[ch] || G[ch.toUpperCase()] || FALLBACK; },

  /** Default stroke weight for a cap height. Kept in one place: `measure` and
   *  `draw` MUST agree on it or every right-aligned readout drifts. */
  weightFor(size) { return size * 0.115; },

  /**
   * Inked width in px for `text` at cap-height `size`, `tracking` px of extra
   * letterspace, and stroke `weight`.
   *
   * THE SIDE BEARING IS NOT OPTIONAL. These glyphs are *strokes centred on a
   * path*, so a run of them inks from -weight/2 to +weight/2 outside the em box.
   * The first version of this file advanced by `w*size + tracking` only, which
   * is correct for a hairline and catastrophically wrong for the readout that
   * matters: the ammo counter is cap 47 px with a 9 px stroke, so consecutive
   * digits overlapped by 8 px and "20" photographed as a 2 and a 0 printed on
   * top of each other (tests/shots/combat.png, first capture of this stage).
   * "100" in the vitals block was one blob. Advance = w·size + tracking +
   * weight; total width carries one extra `weight` for the two half-strokes at
   * the ends.
   */
  measure(text, size, tracking = 0, weight = null) {
    const wt = weight != null ? weight : this.weightFor(size);
    let w = 0;
    for (let i = 0; i < text.length; i++) w += this.glyph(text[i]).w * size + tracking + wt;
    return Math.max(0, w - tracking);
  },

  /**
   * Draw `text` with its baseline on `y`.
   * o = { size, tracking, weight, color, align:'left'|'center'|'right',
   *       alpha, halo, haloColor, cap, miterLimit, skew }
   */
  draw(g, text, x, y, o) {
    const size = o.size;
    const tr = o.tracking || 0;
    const weight = o.weight != null ? o.weight : this.weightFor(size);
    const width = this.measure(text, size, tr, weight);
    const x0 = o.align === 'right' ? x - width : o.align === 'center' ? x - width * 0.5 : x;

    g.save();
    if (o.alpha != null) g.globalAlpha = o.alpha;
    g.lineJoin = 'miter';
    g.miterLimit = o.miterLimit != null ? o.miterLimit : 1.9;
    g.lineCap = o.cap || 'butt';

    // Two passes: a dark outline first so the readout survives sunlit bone ash,
    // then the ink. The outline must stay THIN relative to the stroke — at
    // `weight + 2·halo` with halo ≈ 1.1 px, an 8 px label whose stroke is 1.3 px
    // gets a 3.5 px dark pass, the counters fill in, adjacent glyphs merge, and
    // small caps turn to mush. Measured on the first capture: "NE" on the
    // compass overlapped into a single blob. Scale the outline with the type
    // and cap it.
    const halo = o.halo != null ? o.halo : clamp(size * 0.030, 0.40, 1.40);
    for (let pass = halo > 0 ? 0 : 1; pass < 2; pass++) {
      g.strokeStyle = pass === 0 ? (o.haloColor || PALETTE.shadow) : (o.color || PALETTE.ink);
      g.fillStyle = g.strokeStyle;
      g.lineWidth = pass === 0 ? weight + halo * 1.7 : weight;
      let px = x0 + weight * 0.5;         // left half-stroke sits inside x0
      for (let i = 0; i < text.length; i++) {
        const gl = this.glyph(text[i]);
        if (gl.s.length) {
          g.beginPath();
          for (let p = 0; p < gl.s.length; p++) {
            const pts = gl.s[p];
            g.moveTo(px + pts[0] * size, y + (pts[1] - 1) * size);
            for (let k = 2; k < pts.length; k += 2) g.lineTo(px + pts[k] * size, y + (pts[k + 1] - 1) * size);
          }
          g.stroke();
        }
        if (gl.d) {
          const s = g.lineWidth * 1.05;
          for (let d = 0; d < gl.d.length; d++) {
            g.fillRect(px + gl.d[d][0] * size - s * 0.5, y + (gl.d[d][1] - 1) * size - s * 0.5, s, s);
          }
        }
        px += gl.w * size + tr + weight;
      }
    }
    g.restore();
    return width;
  },
};

// -----------------------------------------------------------------------------
// Small drawing helpers shared with menu.js.
// -----------------------------------------------------------------------------
/** A hairline rule with a chamfered right end — the HUD's connective tissue. */
export function rule(g, x, y, w, color, alpha = 0.4, thick = 1) {
  g.save();
  g.globalAlpha = alpha; g.fillStyle = color;
  g.fillRect(x, y, w, thick);
  g.restore();
}

/**
 * A soft elliptical darkening under a block of type.
 *
 * WHY THIS EXISTS: the corner scrims are broad and gentle, which is right for
 * the frame but not enough locally. `tests/shots/hipfire.png` put the ammo
 * counter and the crosshair over sunlit bone ash at ~0.97 luma; bone-white ink
 * with a 1.3 px dark halo on it disappeared completely. Every shipped shooter
 * puts a tight, feathered shadow directly under its counters for exactly this.
 * `createRadialGradient` is circular only, so scale the space around it.
 * Painted into the widget's own canvas, so it costs nothing per frame — these
 * canvases repaint when their text changes, not every frame.
 */
export function smudge(g, cx, cy, rx, ry, alpha) {
  if (alpha <= 0.004) return;
  g.save();
  g.translate(cx, cy); g.scale(Math.max(1, rx), Math.max(1, ry));
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  gr.addColorStop(0, `rgba(4,3,2,${alpha.toFixed(3)})`);
  gr.addColorStop(0.42, `rgba(4,3,2,${(alpha * 0.72).toFixed(3)})`);
  gr.addColorStop(0.74, `rgba(4,3,2,${(alpha * 0.26).toFixed(3)})`);
  gr.addColorStop(1, 'rgba(4,3,2,0)');
  g.fillStyle = gr;
  g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill();
  g.restore();
}

/** Corner brackets around a rect. The single cheapest "designed" signal there is. */
export function brackets(g, x, y, w, h, len, color, alpha = 0.5, thick = 1) {
  g.save();
  g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = thick; g.lineCap = 'butt';
  g.beginPath();
  g.moveTo(x, y + len); g.lineTo(x, y); g.lineTo(x + len, y);
  g.moveTo(x + w - len, y); g.lineTo(x + w, y); g.lineTo(x + w, y + len);
  g.moveTo(x + w, y + h - len); g.lineTo(x + w, y + h); g.lineTo(x + w - len, y + h);
  g.moveTo(x + len, y + h); g.lineTo(x, y + h); g.lineTo(x, y + h - len);
  g.stroke();
  g.restore();
}

/**
 * The KV-7 silhouette — the killfeed's cause-of-death glyph. Drawn from the
 * weapon's actual authored read (COMBAT_FEEL §3.1: "a long, squared handguard
 * with a visible gas block"), because a generic dash means nothing and a
 * generic skull means less. Returns the advance width.
 */
export function weaponGlyph(g, x, y, s, color, alpha = 0.9) {
  g.save();
  g.globalAlpha = alpha; g.fillStyle = color;
  g.fillRect(x + s * 0.34, y - s * 0.20, s * 1.52, s * 0.24);   // receiver + handguard
  g.fillRect(x + s * 1.20, y - s * 0.30, s * 0.22, s * 0.12);   // gas block
  g.fillRect(x + s * 0.52, y + s * 0.04, s * 0.30, s * 0.52);   // magazine
  g.fillRect(x + s * 0.86, y + s * 0.04, s * 0.16, s * 0.26);   // grip
  g.fillRect(x + s * 0.62, y - s * 0.42, s * 0.34, s * 0.16);   // reflex sight
  g.fillRect(x, y - s * 0.14, s * 0.36, s * 0.18);              // stock
  g.fillRect(x + s * 1.86, y - s * 0.15, s * 0.34, s * 0.13);   // muzzle
  g.restore();
  return s * 2.20;
}

/**
 * The melee cause-of-death glyph — the KV-7 held by the barrel, i.e. the
 * buttstock leading. It has to be legible at 12 px as SOMETHING OTHER THAN the
 * rifle glyph above it, so the read is the stock's wedge plus the impact
 * chevrons, not a faithful drawing. Returns the advance width, same as
 * `weaponGlyph`, so the killfeed row does not care which one it drew.
 */
export function meleeGlyph(g, x, y, s, color, alpha = 0.9) {
  g.save();
  g.globalAlpha = alpha; g.fillStyle = color;
  // canted receiver, butt-first
  g.translate(x + s * 1.10, y + s * 0.05); g.rotate(-0.42);
  g.fillRect(-s * 1.00, -s * 0.10, s * 1.62, s * 0.20);   // body
  g.fillRect(-s * 1.16, -s * 0.26, s * 0.26, s * 0.52);   // the butt plate
  g.fillRect(s * 0.10, s * 0.06, s * 0.24, s * 0.38);     // grip
  g.restore();
  // two impact chevrons off the butt — the "this connected" mark
  g.save();
  g.globalAlpha = alpha * 0.85; g.strokeStyle = color;
  g.lineWidth = Math.max(1, s * 0.12); g.lineCap = 'butt';
  for (let i = 0; i < 2; i++) {
    const r = s * (0.52 + i * 0.30);
    g.beginPath();
    g.moveTo(x + s * 0.02 - r * 0.55, y - s * 0.60 - r * 0.10);
    g.lineTo(x + s * 0.02 - r * 0.90, y - s * 0.22);
    g.lineTo(x + s * 0.02 - r * 0.55, y + s * 0.16 + r * 0.10);
    g.stroke();
  }
  g.restore();
  return s * 2.20;
}

// -----------------------------------------------------------------------------

const RET_MIN = 300, RET_MAX = 740;

/** Life of the "+N" ammo toast, seconds. Rises, holds, fades. */
const AMMO_TOAST = 1.10;

/**
 * Hit-marker styles. COMBAT_FEEL §4.6 authors four; combat.js added `head`
 * (1.60x) this round because the brief asks for a headshot/weak-point
 * distinction and the spec only had the weak point.
 *
 * ONE DELIBERATE DEPARTURE FROM §4.6, and it is a colour decision, so
 * docs/ACCESSIBILITY.md wins it (§1, §5; and the doc says so explicitly where
 * it disagrees with the older art documents). §4.6 authors the kill marker as
 * `1.00 / 0.32 / 0.22` — saturated red against a bone-white normal marker.
 * This player has moderate deuteranomaly: red-against-white is the single
 * worst pair available, and a kill that differs from a hit ONLY in that
 * respect does not exist for him. That is a plausible part of why "it needs to
 * feel satisfying to kill them somehow" was written after a session in which
 * the kill marker was, mechanically, working.
 *
 * So the kill is recoded on four axes at once, three of which are hue-free:
 *   SHAPE     a ring with cardinal arrowheads, not diagonal ticks
 *   MOTION    an outBack overshoot plus a rotation; hits do neither
 *   DURATION  290 ms (kill) / 420 ms (melee) against 210 ms (hit)
 *   VALUE     near-white at full alpha, the brightest thing in the readout,
 *             ringed in cyan — the blue-yellow axis deuteranomaly leaves
 *             intact, and the world's own bioluminescent hue (PALETTE_TARGET).
 * Any one of the four carries the distinction on its own.
 */
const MARK_STYLE = {
  normal: { col: '#F4EEE2', a: 0.90, sc: 1.00 },
  head: { col: '#FFF3D2', a: 0.98, sc: 1.12 },
  weak: { col: '#FFDB59', a: 0.98, sc: 1.25 },
  deflect: { col: '#8FA0B0', a: 0.92, sc: 0.80 },
  kill: { col: '#EAFBFF', a: 1.00, sc: 1.40 },
};

export class HUD {
  static id = 'hud';
  static deps = [];

  constructor(ctx) {
    this.ctx = ctx;
    this.rng = new RNG('hud');

    // --- published knobs (COMBAT_FEEL §8) ------------------------------------
    this.k = ctx.debug.hud = {
      scale: 1.0,            // global HUD size multiplier
      opacity: 1.0,          // master alpha
      crosshair: 1.0,        // crosshair alpha
      hitmarkerMs: 210,      // COMBAT_FEEL §4.6 total marker life
      damageNumbers: false,  // §4.7 — off by default, and correctly so
      compass: true,
      idleFade: true,        // chrome fades toward `idleFloor` when nothing happens
      idleAfter: 6.0,
      idleFloor: 0.42,
      lowHealthAt: 45,
      criticalAt: 25,
      showcase: true,        // allow stage() to stand in while the game is stubs
    };

    // --- local model. Authoritative only until a sibling feeds me. -----------
    this.w = {
      name: 'KV-7 CINDER', mode: 'AUTO',
      mag: 30, magSize: 30, reserve: 210,
      spreadDeg: 2.10, adsT: 0, state: 'idle', reloadT: 0, heat: 0,
    };
    this.vit = { health: 100, max: 100 };
    this.fed = [];                 // killfeed entries
    this.marks = [];               // local hitmarkers (no-combat / staged)
    this.dmg = [];                 // local damage direction arcs
    this.cmark = null;             // combat.js's marker slot, {kind, age, ...}
    this.cdirs = [];               // combat.js's damage directions

    // --- THE CONFIRMATION CHAIN (round 11). Player: "it needs to feel
    //     satisfying to kill them somehow." Everything below exists to make a
    //     hit legible inside 60 ms and a KILL unmistakably NOT a hit — by
    //     SHAPE and MOTION first, colour last, because the player has moderate
    //     deuteranomaly and a red-vs-white marker distinction does not exist
    //     for him (docs/ACCESSIBILITY.md §1, §5).
    this.ammoFx = {
      reserveMax: 210,
      low: false,                  // <= 2 mags in reserve
      empty: false,                // reserve is gone; the gun is ending
      pickT0: -99,                 // sim time of the last pickup/refill toast
      pickN: 0,                    // rounds credited by it
      pickBig: false,              // a cache refill, not a node
      pickSeq: 0,
      _lastPickupT: 99,            // for the poll-path edge detector
    };
    this._punch = 0;               // kill "punch" layer, 0..1
    this._punchKind = 0;           // 1 = kill, 2 = melee kill
    this._markSeq = -1;            // last marker sequence seen from combat.js
    this._hasCombat = false;
    this.objectives = [];
    // The brief panel's own model, fed by `objective` events whether or not the
    // objective has a world position. `area` is authored; the rest is director's.
    this.brief = { area: 'SURVEY 9 · THESSALY BASIN', line: '', sub: '', dist: -1 };
    this.numbers = [];
    this.prompt = { text: '', until: -1 };
    this.sched = [];               // deferred staged events (sim-time)

    this.presence = 1;             // 0..1 chrome visibility from recent activity
    this.lastEventT = 0;
    this._yawShown = 1e9;
    this._ammoKey = '';
    this._vitKey = '';
    this._feedKey = '';
    this._flash = 0;               // white damage flash 0..1
    this._hurt = 0;                // sustained red edge 0..1
    this._staged = null;

    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
  }

  // ===========================================================================
  // boot
  // ===========================================================================
  async init() {
    const root = document.createElement('div');
    root.id = 'hud';
    root.innerHTML = `<style>
      #hud{position:fixed;inset:0;pointer-events:none;z-index:20;
           contain:layout style paint;overflow:hidden;}
      #hud canvas{position:absolute;display:block;}
      #hud .vig{position:absolute;inset:-2%;opacity:0;
        background:radial-gradient(58% 62% at 50% 50%,rgba(0,0,0,0) 34%,rgba(26,3,1,.62) 78%,rgba(14,1,0,.94) 100%);}
      #hud .vig.b{background:radial-gradient(60% 64% at 50% 50%,rgba(0,0,0,0) 40%,rgba(150,22,8,.20) 80%,rgba(190,34,12,.44) 100%);}
      #hud .flash{position:absolute;inset:0;opacity:0;background:rgba(255,86,44,.42);}
      /* KILL PUNCH. The kill marker is 8 px of geometry at the centre of a
         2 Mpx frame; on its own it is a UI event, not a physical one. A very
         short, very soft centre-weighted lift gives the kill a whole-frame
         beat without becoming a stinger. It is COOL (cyan-white), which is
         both the world's bioluminescent signature (PALETTE_TARGET) and the
         half of the spectrum this player can still see (ACCESSIBILITY §3) —
         and it is the opposite pole from the warm damage-taken flash layer, so
         the two can never be confused with each other.
         (No backticks in here: this whole style block is a JS template literal
         and a quoted identifier would close it. Same trap as the glsl one in
         RESUME.md, different literal — tools/glslguard.mjs only scans the
         /* glsl */ ones, so it does not catch this and I found it the slow way.) */
      #hud .punch{position:absolute;inset:0;opacity:0;
        background:radial-gradient(52% 56% at 50% 50%,rgba(214,250,255,.34) 0%,rgba(130,224,238,.16) 40%,rgba(90,180,200,.05) 66%,rgba(0,0,0,0) 82%);}
      /* Corner scrims. A HUD has to survive the frame it is drawn over, and
         this frame has a 22000 cd muzzle flash in it — on the shot where the
         ground reads near-white the readout washed out completely. These are
         what every shipped shooter puts under its ammo counter. Feathered by
         the gradient itself, so there is no boundary anywhere. */
      #hud .scrim{position:absolute;opacity:.85;}
      #hud .sBR{right:0;bottom:0;width:42%;height:36%;
        background:radial-gradient(ellipse 100% 100% at 100% 100%,rgba(5,3,2,.60) 0%,rgba(5,3,2,.40) 30%,rgba(5,3,2,.20) 56%,rgba(5,3,2,0) 80%);}
      #hud .sBL{left:0;bottom:0;width:34%;height:28%;
        background:radial-gradient(ellipse 100% 100% at 0% 100%,rgba(5,3,2,.54) 0%,rgba(5,3,2,.34) 32%,rgba(5,3,2,.17) 56%,rgba(5,3,2,0) 80%);}
      #hud .sTR{right:0;top:0;width:35%;height:29%;
        background:radial-gradient(ellipse 100% 100% at 100% 0%,rgba(5,3,2,.46) 0%,rgba(5,3,2,.28) 34%,rgba(5,3,2,.13) 58%,rgba(5,3,2,0) 80%);}
      #hud .sTL{left:0;top:0;width:31%;height:22%;
        background:radial-gradient(ellipse 100% 100% at 0% 0%,rgba(5,3,2,.42) 0%,rgba(5,3,2,.24) 34%,rgba(5,3,2,.11) 58%,rgba(5,3,2,0) 80%);}
      #hud .mk{position:absolute;left:0;top:0;will-change:transform;}
      #hud .mk canvas{position:static;}
      #hud .dn{position:absolute;left:0;top:0;will-change:transform,opacity;}
      #hud .state{position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;opacity:0;transform:scale(1.035);
        transition:opacity .16s ease,transform .28s cubic-bezier(.2,.75,.2,1);
        color:#EAFBFF;text-align:center;text-shadow:0 0 24px rgba(83,215,239,.38);}
      #hud .state.on{opacity:1;transform:scale(1);}
      #hud .state strong{font:600 clamp(24px,4.1vw,58px)/1 system-ui,sans-serif;
        letter-spacing:.24em;margin-left:.24em;}
      #hud .state span{margin-top:18px;font:600 clamp(9px,1vw,14px)/1.4 system-ui,sans-serif;
        letter-spacing:.36em;margin-left:.36em;color:#FFDB59;}
    </style>`;

    // scrims first — they must sit UNDER every canvas
    this.scrims = ['sBR', 'sBL', 'sTR', 'sTL'].map(c => {
      const d = document.createElement('div');
      d.className = 'scrim ' + c;
      root.appendChild(d);
      return d;
    });

    const mk = (cls) => { const c = document.createElement('canvas'); if (cls) c.className = cls; root.appendChild(c); return c; };
    this.cvReticle = mk();
    this.cvCompass = mk();
    this.cvAmmo = mk();
    this.cvVitals = mk();
    this.cvFeed = mk();
    this.cvBrief = mk();

    this.elVig = document.createElement('div'); this.elVig.className = 'vig';
    this.elVigB = document.createElement('div'); this.elVigB.className = 'vig b';
    this.elFlash = document.createElement('div'); this.elFlash.className = 'flash';
    this.elPunch = document.createElement('div'); this.elPunch.className = 'punch';
    root.appendChild(this.elVig); root.appendChild(this.elVigB);
    root.appendChild(this.elFlash); root.appendChild(this.elPunch);

    this.elState = document.createElement('div');
    this.elState.className = 'state';
    this.elState.setAttribute('role', 'status');
    this.elState.setAttribute('aria-live', 'assertive');
    this.elState.innerHTML = '<strong></strong><span></span>';
    root.appendChild(this.elState);

    this.markLayer = document.createElement('div');
    this.markLayer.style.cssText = 'position:absolute;inset:0;';
    root.appendChild(this.markLayer);

    (document.getElementById('ui') || document.body).appendChild(root);
    this.root = root;

    // Irregular edge mask for the low-health vignette. A clean radial gradient
    // is the flattest, most "CSS" thing you can put on a frame; multiplying it
    // by two octaves of value noise gives it a scorched, uneven boundary that
    // reads as an effect rather than a filter. Generated once, deterministic.
    const mask = this._buildVignetteMask();
    this.elVig.style.webkitMaskImage = this.elVig.style.maskImage = `url(${mask})`;
    this.elVig.style.webkitMaskSize = this.elVig.style.maskSize = '100% 100%';
    this.elVigB.style.webkitMaskImage = this.elVigB.style.maskImage = `url(${mask})`;
    this.elVigB.style.webkitMaskSize = this.elVigB.style.maskSize = '100% 100%';

    this._layout();
    this._wireBus();
    this._hookVistas();
    this.ctx.bus.on('ready', () => this._hookVistas());
    this._markAll();
    this._paint();
  }

  /**
   * Put the readout into the state each review vista is supposed to be showing.
   *
   * `gotoVista` has no hook for this — main.js's VISTAS table is the only place
   * a per-shot setup exists, and `main.js` is orchestrator-owned. So this wraps
   * (never replaces) each entry's `setup`, idempotently. It is a stopgap with a
   * documented replacement filed under HANDOFF "## requests": one line in
   * `gotoVista`, `ctx.bus.emit('vista', {name, def})`, and this method deletes
   * itself. The bus listener for that event is already wired below.
   */
  _hookVistas() {
    let V = null;
    try { V = (typeof window !== 'undefined' && window.__CB && window.__CB.VISTAS) || null; } catch { V = null; }
    if (!V) return;
    const COMBAT = { hipfire: 'hipfire', ads: 'ads', reload: 'reload', combat: 'combat' };
    for (const name of Object.keys(V)) {
      const def = V[name];
      if (!def || def.__hudHook) continue;
      const prev = def.setup;
      const which = COMBAT[name] || 'idle';
      def.setup = (c) => { if (prev) prev(c); c.sys.hud && c.sys.hud.stage(which); };
      def.__hudHook = true;
    }
  }

  _buildVignetteMask() {
    const c = document.createElement('canvas');
    c.width = 192; c.height = 108;
    const g = c.getContext('2d');
    const img = g.createImageData(c.width, c.height);
    const r = this.rng.fork('vig');
    const grid = new Float32Array(24 * 14);
    for (let i = 0; i < grid.length; i++) grid[i] = r.next();
    const smp = (u, v, s) => {
      const x = u * s, y = v * (s * 0.58);
      const xi = Math.floor(x), yi = Math.floor(y);
      const fx = x - xi, fy = y - yi;
      const at = (a, b) => grid[((b % 14) + 14) % 14 * 24 + (((a % 24) + 24) % 24)];
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return lerp(lerp(at(xi, yi), at(xi + 1, yi), sx), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), sx), sy);
    };
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const u = x / (c.width - 1), v = y / (c.height - 1);
        const n = smp(u, v, 7) * 0.62 + smp(u, v, 17) * 0.38;
        const a = clamp(0.55 + (n - 0.5) * 0.95, 0, 1);
        const i = (y * c.width + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = (a * 255) | 0;
      }
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }

  _wireBus() {
    const bus = this.ctx.bus;
    const on = (names, fn) => { for (const n of names) bus.on(n, fn); };
    // combat.js drives the marker through its own state machine (rank-ordered,
    // duck-flagged); we take the EVENT for the no-combat case only, and the
    // pulled `hudState().marker` otherwise. Listening to `combat:hit` as well
    // would double every marker.
    on(['hit', 'hud:hit'], p => this.onHit(p));
    on(['combat:hitmarker'], p => { if (!this._hasCombat) this.onHit(p); });
    on(['kill', 'hud:kill', 'combat:kill'], p => this.onKill(p));
    on(['damage', 'hud:damage', 'player:damage'], p => this.onDamage(p));
    on(['health'], p => { if (p) { this.vit.health = p.health ?? this.vit.health; this.vit.max = p.max ?? this.vit.max; this._touch(); } });
    // director.js's shape
    on(['player:health'], p => {
      if (!p) return;
      if (typeof p.hp === 'number') this.vit.health = p.hp;
      if (typeof p.max === 'number') this.vit.max = p.max;
      if (typeof p.health === 'number') this.vit.health = p.health;
      this._touch(); this._dVit = true;
    });
    on(['ammo', 'weapon:ammo'], p => {
      if (!p) return;
      if (p.mag != null) this.w.mag = p.mag;
      if (p.reserve != null) this.w.reserve = p.reserve;
      if (p.magSize != null) this.w.magSize = p.magSize;
      this._touch();
    });
    on(['weapon', 'weapon:state'], p => {
      if (!p) return;
      if (p.name) this.w.name = p.name;
      if (p.mode) this.w.mode = p.mode;
      if (p.state) this.w.state = p.state;
      this._touch();
    });
    // --- ammo economy. combat.js's `hudState()` carries the same facts, but the
    // bus is the authority for the TOAST because the toast is an event, not a
    // state: `pickupT` is a clock, and a clock read once per step can miss a
    // pickup that happened and was superseded. The poll path in `_pullCombat`
    // is a fallback that only fires when no bus event arrived.
    on(['combat:ammoPickup', 'ammo:pickup'], p => this._onPickup(p, false));
    on(['combat:cacheRefill', 'ammo:cache'], p => this._onPickup(p, true));
    on(['objective'], p => this.addObjective(p));
    on(['objective:clear'], id => this.clearObjective(id));
    on(['player:death'], () => this.setState('SIGNAL LOST', 'REACQUIRING CHECKPOINT'));
    on(['player:respawn', 'mission:reset'], () => this.clearState());
    on(['prompt', 'hud:prompt'], p => { if (p) this.setPrompt(p.text || '', p.ms || 1600); });
    bus.on('quality', () => this._markAll());
    // the sanctioned replacement for _hookVistas(), the moment main.js emits it
    bus.on('vista', p => { if (p && p.name) this.stage(p.name); });
  }

  // TRAP: main.js calls `resize()` from `boot()` BEFORE `initAll()`, so every
  // system gets a resize while it is still just a constructed object. Nothing
  // here exists yet at that point.
  resize() { if (!this.cvReticle) return; this._layout(); this._markAll(); this._paint(); }

  _layout() {
    const s = this.ctx.size;
    const w = Math.max(320, s.w | 0), h = Math.max(240, s.h | 0);
    const dpr = clamp(s.dpr || 1, 1, 2);
    this.dpr = dpr;
    // One scale for the whole HUD, driven off frame height so a 4K and a 720p
    // frame carry the same apparent readout size. Clamped so it never gets
    // silly on an extreme aspect.
    this.u = clamp(h / 1080, 0.62, 1.6) * this.k.scale;
    this.M = Math.round(52 * this.u + 12);          // title-safe margin

    // NB: CSS dimensions are cached on the context object. Reading
    // `canvas.clientWidth` inside a paint forces a style/layout flush every
    // time the HUD repaints, which is exactly the kind of invisible cost that
    // shows up as jitter in `benchmark()` and nowhere else.
    // `pad` BLEEDS the canvas outward past its content box, and the content
    // origin stays where it was via the context transform. It exists because of
    // the local shades (`smudge`): a feathered ellipse under the ammo counter is
    // wider than the counter, so on a canvas sized exactly to the content it
    // gets CLIPPED, and you can see the straight cut 64 px in from the frame
    // edge. Photographed in the second capture of this stage, bottom right of
    // `combat`. Bleeding the four corner widgets to the frame edge lets the
    // feathering run off the frame instead, and negative content coordinates —
    // which is all the shade uses the pad for — are legal.
    const size = (cv, cw, ch, left, top, padL = 0, padT = 0, padR = 0, padB = 0) => {
      const bw = Math.round(cw + padL + padR), bh = Math.round(ch + padT + padB);
      cv.style.width = bw + 'px'; cv.style.height = bh + 'px';
      cv.style.left = Math.round(left - padL) + 'px'; cv.style.top = Math.round(top - padT) + 'px';
      const pw = Math.max(1, Math.round(bw * dpr)), ph = Math.max(1, Math.round(bh * dpr));
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, Math.round(padL) * dpr, Math.round(padT) * dpr);
      g.cw = Math.round(cw); g.ch = Math.round(ch);
      g.padL = Math.round(padL); g.padT = Math.round(padT);
      g.padR = Math.round(padR); g.padB = Math.round(padB);
      return g;
    };
    // Every paint clears its whole backing store, pad included.
    this._clear = (g) => g.clearRect(-g.padL, -g.padT, g.cw + g.padL + g.padR, g.ch + g.padT + g.padB);

    const R = Math.round(clamp(Math.min(w, h) * 0.62, RET_MIN, RET_MAX));
    this.R = R;
    this.gRet = size(this.cvReticle, R, R, (w - R) * 0.5, (h - R) * 0.5);

    const cw = Math.round(392 * this.u), chh = Math.round(30 * this.u);
    this.gCom = size(this.cvCompass, cw, chh, (w - cw) * 0.5, Math.round(this.M * 0.62));

    const M = this.M;
    const aw = Math.round(352 * this.u), ah = Math.round(140 * this.u);
    this.gAmmo = size(this.cvAmmo, aw, ah, w - M - aw, h - M - ah, 0, 0, M, M);

    const vw = Math.round(320 * this.u), vh = Math.round(104 * this.u);
    this.gVit = size(this.cvVitals, vw, vh, M, h - M - vh, M, 0, 0, M);

    const fw = Math.round(470 * this.u), fh = Math.round(196 * this.u);
    this.gFeed = size(this.cvFeed, fw, fh, w - M - fw, M, 0, M, M, 0);

    const bw = Math.round(430 * this.u), bh = Math.round(64 * this.u);
    this.gBrief = size(this.cvBrief, bw, bh, M, M, M, M, 0, 0);

    this.vw = w; this.vh = h;
  }

  _markAll() { this._dRet = this._dCom = this._dAmmo = this._dVit = this._dFeed = this._dBrief = true; }
  _touch() { this.lastEventT = this.ctx.time.elapsed; this.presence = 1; }

  // ===========================================================================
  // public API — siblings and the harness
  // ===========================================================================

  /**
   * COMBAT_FEEL §4.6, extended by combat.js this round.
   * kind: 'normal' | 'head' | 'weak' | 'deflect' | 'kill'.
   * The rest of `p` is the confirmation payload — see `_drawMarker`:
   *   melee    true for a rifle-butt strike; the heaviest confirm in the game
   *   zone     'head'|'vent'|'plate'|'torso'|'limb'
   *   hpFrac   the target's REMAINING health, 0..1, or absent
   *   strength dealt / 34 (one close-range body round)
   */
  onHit(p) {
    const kind = (p && p.kind) || 'normal';
    const t = this.ctx.time.elapsed;
    if (this.marks.length > 7) this.marks.shift();
    this.marks.push({
      kind, t0: t,
      melee: !!(p && p.melee), zone: (p && p.zone) || null,
      hpFrac: p && typeof p.hpFrac === 'number' ? p.hpFrac : -1,
      strength: p && typeof p.strength === 'number' ? p.strength : 1,
    });
    if (kind === 'kill') this._killPunch(!!(p && p.melee));
    if (this.k.damageNumbers && p && p.damage && p.point) this._spawnNumber(p);
    this._touch(); this._dRet = true;
  }

  /**
   * The whole-frame beat on a kill. Deliberately tiny and deliberately SHORT:
   * §4.9 allows "+0.20 EV — air, not a stinger", and this is the HUD's
   * equivalent of that. A melee kill gets 1.9x, because it is the only thing in
   * the game the player does with their hands.
   */
  _killPunch(melee) {
    this._punch = Math.max(this._punch, melee ? 1 : 0.52);
    this._punchKind = melee ? 2 : 1;
  }

  /**
   * A sinter node collected, or a resupply cache emptied into the reserve.
   * combat.js emits `{rounds, reserve, x,y,z}`; a cache adds nothing but is
   * flagged `big`, which buys it a wider toast and a longer hold.
   *
   * BUG THIS FIXES (verified by a critic last round, in two independent runs):
   * *"the on-screen ammo counter never repainted the pickup credit — it showed
   * the stale pre-pickup value."* The economy underneath was correct; the ammo
   * canvas is dirty-flag driven and NOTHING dirtied it when the reserve
   * changed. See the ammo key in `update()`, which is the actual fix; this is
   * the celebration on top of it.
   */
  _onPickup(p, big) {
    const n = p && typeof p.rounds === 'number' ? Math.round(p.rounds) : 0;
    if (p && typeof p.reserve === 'number') this.w.reserve = p.reserve;
    const f = this.ammoFx;
    f.pickT0 = this.ctx.time.elapsed;
    f.pickN = n; f.pickBig = !!big; f.pickSeq++;
    f._lastPickupT = 0;
    this._touch(); this._dAmmo = true;
  }

  onKill(p) {
    p = p || {};
    // combat.js sends `actor` as the enemy OBJECT; the neutral shape sends a
    // string. Accept both without asking anyone to change.
    const a = p.actor;
    const target = typeof a === 'string' ? a
      : (a && (a.kind || a.name || a.type)) || p.name || p.target || 'HOSTILE';
    if (!this._hasCombat) this.onHit({ kind: 'kill', melee: !!p.melee, hpFrac: 0 });
    this.fed.unshift({
      actor: typeof a === 'string' && p.name ? a : 'YOU',
      target: String(target).toUpperCase(),
      head: !!(p.headshot || p.zone === 'head'), wall: !!p.wallbang,
      melee: !!(p.melee || p.kind === 'melee'),
      t0: this.ctx.time.elapsed,
    });
    if (this.fed.length > 5) this.fed.length = 5;
    this._touch(); this._dFeed = true;
  }

  /**
   * Three accepted forms of "where did that come from":
   *   p.angle   view-relative radians, 0 = ahead, +right   (combat.js)
   *   p.dirRad  world bearing, atan2(dx, dz)
   *   p.from    a world point
   * Stored as `rel` (view-relative) so the arc does not have to know which.
   */
  onDamage(p) {
    p = p || {};
    let rel = typeof p.angle === 'number' ? p.angle : null;
    if (rel == null) {
      let bearing = p.dirRad;
      if (bearing == null && p.from) {
        const c = this.ctx.camera.position;
        const fx = (p.from.x ?? p.from[0]) - c.x, fz = (p.from.z ?? p.from[2]) - c.z;
        bearing = Math.atan2(fx, fz);
      }
      if (bearing != null) rel = wrapPi(bearing - this.ctx.camera.rotation.y);
    }
    const amt = p.amount != null ? p.amount : 12;
    if (p.health != null) this.vit.health = p.health;
    else if (p.hp != null) this.vit.health = p.hp;
    else if (!this._hasCombat) this.vit.health = clamp(this.vit.health - amt, 0, this.vit.max);
    if (rel != null && !this._hasCombat) {
      if (this.dmg.length > 5) this.dmg.shift();
      this.dmg.push({ rel, t0: this.ctx.time.elapsed, amt: clamp(amt / 30, 0.35, 1.4) });
    }
    this._flash = Math.max(this._flash, clamp(amt / 34, 0.25, 1));
    this._touch(); this._dRet = true; this._dVit = true;
  }

  /** menu.js hides the whole readout while a front-end page is up. */
  setVisible(on) {
    if (!this.root) return;
    this.root.style.transition = 'opacity .18s ease';
    this.root.style.opacity = on ? '1' : '0';
  }

  setState(title, sub = '') {
    if (!this.elState) return;
    this.elState.querySelector('strong').textContent = String(title || '').toUpperCase();
    this.elState.querySelector('span').textContent = String(sub || '').toUpperCase();
    this.elState.classList.toggle('on', !!title);
  }

  clearState() { this.setState('', ''); }

  setPrompt(text, ms = 1600) {
    this.prompt.text = (text || '').toUpperCase();
    this.prompt.until = this.ctx.time.elapsed + ms / 1000;
    this._touch(); this._dAmmo = true;
  }

  /**
   * Accepts director.js's `{text, sub, waypoint:{x,y,z,dist}}` and the neutral
   * `{id, pos, label, kind}`. director re-emits the SAME objective every 12
   * frames to refresh its distance, so this must update in place — tearing the
   * DOM node down and rebuilding it five times a second would churn a canvas
   * and flicker the marker.
   */
  addObjective(p) {
    if (!p) return;
    const wp = p.waypoint;
    // director.js emits `_emitObjective(text, sub)` with NO waypoint for every
    // beat that is not a "go here" beat — hold, clear, survive. Those used to
    // fall straight out of the bottom of this method (`if (!p.pos) return`), so
    // the mission line in the brief panel was blank for most of the level while
    // director thought it had published it. A text-only objective is still an
    // objective; it just has no world marker.
    if (!p.pos && !wp && (p.text || p.label)) {
      // Objective updates are authoritative. A text-only combat/hold objective
      // replaces the preceding navigation marker instead of leaving that old
      // landmark glowing through the fight.
      this.clearObjective(p.id != null ? p.id : 'primary', false);
      const line = String(p.text || p.label).toUpperCase();
      const sub = String(p.sub || '').toUpperCase();
      if (line !== this.brief.line || sub !== this.brief.sub) {
        this.brief.line = line; this.brief.sub = sub; this.brief.dist = -1;
        this._dBrief = true; this._touch();
      }
      return;
    }
    if (!p.pos && wp) {
      const line = String(p.text || p.label || '').toUpperCase();
      const sub = String(p.sub || '').toUpperCase();
      const dist = wp.dist != null ? Math.round(wp.dist) : -1;
      if (line !== this.brief.line || sub !== this.brief.sub || dist !== this.brief.dist) {
        this.brief.line = line; this.brief.sub = sub; this.brief.dist = dist;
        this._dBrief = true;
      }
      p = {
        id: p.id != null ? p.id : 'primary',
        pos: [wp.x, wp.y != null ? wp.y : (this.ctx.sys.terrain?.heightAt?.(wp.x, wp.z) ?? 0) + 1.6, wp.z],
        label: p.text || p.label || '', kind: p.kind || 'primary',
      };
    }
    if (!p.pos) return;
    const id0 = p.id != null ? p.id : 'primary';
    const ex = this.objectives.find(o => o.id === id0);
    if (ex) {
      ex.pos.set(p.pos[0] ?? p.pos.x, p.pos[1] ?? p.pos.y, p.pos[2] ?? p.pos.z);
      const lab = (p.label || '').toUpperCase();
      if (lab !== ex.label) { ex.label = lab; ex.key = ''; this._dBrief = true; }
      return;
    }
    const id = id0;
    this.clearObjective(id, false);
    const el = document.createElement('div');
    el.className = 'mk';
    const cv = document.createElement('canvas');
    const S = Math.round(104 * this.u);
    cv.width = Math.round(S * this.dpr); cv.height = Math.round(S * 0.72 * this.dpr);
    cv.style.width = S + 'px'; cv.style.height = Math.round(S * 0.72) + 'px';
    el.appendChild(cv);
    this.markLayer.appendChild(el);
    this.objectives.push({
      id, pos: new THREE.Vector3(p.pos[0] ?? p.pos.x, p.pos[1] ?? p.pos.y, p.pos[2] ?? p.pos.z),
      label: (p.label || '').toUpperCase(), kind: p.kind || 'primary',
      el, cv, g: cv.getContext('2d'), S, key: '', occ: false, phase: 0,
    });
    this._touch();
  }

  clearObjective(id, clearBrief = true) {
    for (let i = this.objectives.length - 1; i >= 0; i--) {
      const o = this.objectives[i];
      if (id === undefined || o.id === id) { o.el.remove(); this.objectives.splice(i, 1); }
    }
    if (clearBrief && (id === undefined || id === 'primary')) {
      this.brief.line = ''; this.brief.sub = ''; this.brief.dist = -1;
      this._dBrief = true; this._touch();
    }
  }

  /**
   * Put the readout into a representative combat state for a review capture.
   * SELF-DISABLING: the moment director.js grows a `stageEncounter`, this
   * returns without doing anything and the HUD shows only what the game tells
   * it. It exists because `hipfire`/`combat` are captured against stub combat
   * systems, and a HUD photographed with a full magazine and no feedback is a
   * dishonest picture of the HUD, not an honest picture of the game.
   */
  stage(name = 'combat') {
    if (!this.k.showcase) return false;
    if (!/^(combat|hipfire|ads|reload|idle|clear)$/.test(name)) name = 'idle';
    const t = this.ctx.time.elapsed;
    this.sched.length = 0;
    this.marks.length = 0; this.dmg.length = 0; this.fed.length = 0;
    this._staged = name;
    this._holdMark = false;

    if (name === 'idle' || name === 'clear') {
      // A prompt outlives a vista: gotoVista only advances 0.5 s of sim time,
      // so a 3 s "RELOADING" set by the `reload` shot was still on screen two
      // vistas later. Clear every transient here, not just the lists.
      this.prompt.text = ''; this.prompt.until = -1;
      this.cmark = null; this.cdirs.length = 0;
      this.w.state = 'idle'; this.w.adsT = 0;
      if (!this._hasCombat) { this.vit.health = 100; this.w.mag = 30; }
      this._markAll(); return true;
    }

    // Prefer the real thing. combat.js stages a deterministic burst without
    // stepping the sim, which gives a genuine magazine count, a genuine live
    // spread cone and a genuine marker — none of which this file should be
    // inventing once combat.js exists.
    const cb = this.ctx.sys.combat;
    if (cb && typeof cb.stageBurst === 'function') {
      try { cb.stageBurst({ rounds: name === 'reload' ? 30 : 13, ms: 460 }); } catch { /* combat mid-build */ }
    }
    // A staged vista is a 0.5 s window. A killfeed entry is the record of
    // something that happened SECONDS ago and a damage arc needs an attacker
    // that has already connected — neither can exist inside half a second, so
    // the `combat` shot (whose brief is literally "enemies engaged, impacts +
    // HUD") would photograph a HUD with two of its features permanently blank.
    // Those two are seeded here, for that one vista, behind `showcase`. They
    // are seeded with the same code path the real `combat:kill` /
    // `player:damage` events drive, so what is photographed is the real widget.
    // Everything else in the readout — ammo, reserve, cone, health, the marker
    // — comes from combat.js and weapons.js and is never invented.
    const dress = name === 'combat';

    // The capture lands 0.50 s after gotoVista's setup (30 fixed steps), so
    // events are scheduled to be the right AGE in the photograph, not the
    // right age now.
    const at = (dt, fn) => this.sched.push({ t: t + dt, fn });

    if (!this._hasCombat) {
      this.w.mag = name === 'reload' ? 0 : 17;
      this.w.reserve = 149;
      this.w.spreadDeg = name === 'ads' ? 0.05 : 2.86;
      this.vit.health = 62;
    }
    this.w.state = name === 'reload' ? 'reload' : 'fire';
    this.w.adsT = name === 'ads' ? 1 : 0;

    if (dress) {
      this.fed.push({ actor: 'YOU', target: 'SKITTER', head: true, wall: false, t0: t - 2.1 });
      this.fed.unshift({ actor: 'YOU', target: 'BLOOMSPITTER', head: false, wall: false, t0: t - 0.8 });
      this.dmg.push({ rel: -2.15, t0: t - 0.06, amt: 0.9 });
      if (this._hasCombat) this.vit.health = Math.min(this.vit.health, 62);
    }
    this.presence = 1; this.lastEventT = t;

    // Scheduled so the marker is the right AGE in the photograph: gotoVista
    // takes 30 fixed steps (0.500 s) between setup and capture, and a marker
    // lives 210 ms.
    // The marker is seeded only when combat.js is not already showing one, so a
    // real staged burst that connects always wins.
    // The payload matters now: a marker with no `hpFrac` cannot show the
    // escalation and a kill with no `melee` flag cannot show which kill it was,
    // so the staged marker carries the same fields a real one does. These are
    // states the game genuinely produces — `combat` already dresses a killfeed
    // row, so a kill confirm at 0.44 s is the marker that row implies.
    const seedMark = (kind, dt, o) => at(dt, () => {
      if (!this.cmark) {
        this.marks.push(Object.assign(
          { kind, t0: this.ctx.time.elapsed, melee: false, zone: null, hpFrac: -1, strength: 1 }, o));
        if (kind === 'kill') this._killPunch(!!(o && o.melee));
      }
    });
    if (name === 'combat') {
      seedMark('kill', 0.44, { zone: 'vent', hpFrac: 0, strength: 2.4 });
      at(0.10, () => this.fed.unshift({ actor: 'YOU', target: 'SKITTER', head: false, wall: true, t0: this.ctx.time.elapsed }));
    } else if (name === 'hipfire') seedMark('normal', 0.455, { zone: 'torso', hpFrac: 0.24, strength: 1 });
    else if (name === 'ads') seedMark('deflect', 0.46, { zone: 'plate', hpFrac: 0.78, strength: 0.55 });
    if (name === 'reload') this.setPrompt('RELOADING', 3000);
    // See `_markerLife`: hold whatever marker this vista ends up showing at its
    // peak frame, so the capture is not a coin flip against the 210 ms life.
    this._holdMark = true;
    this._markAll();
    return true;
  }

  // ===========================================================================
  // per-step
  // ===========================================================================
  update(dt) {
    const t = this.ctx.time.elapsed;

    for (let i = this.sched.length - 1; i >= 0; i--) {
      if (t >= this.sched[i].t) { const s = this.sched[i]; this.sched.splice(i, 1); s.fn(); this._dRet = this._dFeed = true; }
    }

    // The review-shot marker hold can only ever be armed by `stage()`, which
    // only a vista hook calls — but a frozen hit marker during real play would
    // be an appalling bug to ship, so it is also disarmed the moment somebody
    // is actually playing. A capture never has pointer lock.
    if (this._holdMark && this.ctx.sys.input && this.ctx.sys.input.locked) {
      this._holdMark = false; this._staged = null; this._dRet = true;
    }

    this._pullCombat();
    this._pullWeapon();
    this._pullVitals();

    // ---- lifetimes
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const m = this.marks[i];
      if (t - m.t0 > this._markerLife(m)) this.marks.splice(i, 1); else this._dRet = true;
    }
    for (let i = this.dmg.length - 1; i >= 0; i--) {
      if (t - this.dmg[i].t0 > 1.25) this.dmg.splice(i, 1); else this._dRet = true;
    }
    if (this.cmark || this.cdirs.length) this._dRet = true;
    for (let i = this.fed.length - 1; i >= 0; i--) {
      const age = t - this.fed[i].t0;
      if (age > 3.84) this.fed.splice(i, 1), this._dFeed = true;
      else if (age < 0.16 || age > 3.53) this._dFeed = true;
    }
    if (this.prompt.text && t > this.prompt.until) { this.prompt.text = ''; this._dAmmo = true; }
    if (this.w.mag <= 0) this._dAmmo = true;               // the RELOAD blink

    // ---- THE AMMO REPAINT. This block is the fix for the bug a critic caught
    //      in two independent runs last round: *"the on-screen ammo counter
    //      never repainted the pickup credit — it showed the stale pre-pickup
    //      value."*
    //
    //      The ammo widget is a dirty-flag canvas, and NOTHING in either pull
    //      path dirtied it. `_pullCombat` assigned `this.w.reserve = s.reserve`
    //      and `_pullWeapon` assigned `w.mag = ...`, both of which called
    //      `_touch()` — but `_touch()` only bumps `presence` and the last-event
    //      clock; it does not set `_dAmmo`. So the counter repainted only when
    //      `presence` happened to move, i.e. on the *idle fade*, seconds later
    //      or never. The magazine number appeared to work because firing moves
    //      presence constantly; walking over a node while standing still does
    //      not, which is exactly the case the critic ran.
    //
    //      A dirty flag whose source of truth is "everyone who mutates me
    //      remembers to set it" fails the moment a new field is added — and one
    //      was, last round. So this is a KEY over everything the widget draws,
    //      compared once per step. New fields cannot silently miss it.
    const ak = this.w.mag + '|' + Math.round(this.w.reserve) + '|' + this.w.magSize + '|'
      + this.w.state + '|' + this.w.name + '|' + this.w.mode + '|' + this.prompt.text
      + '|' + (this.ammoFx.low ? 'L' : '') + (this.ammoFx.empty ? 'E' : '');
    if (ak !== this._ammoKey) { this._ammoKey = ak; this._dAmmo = true; }
    // ...and the two things that ANIMATE inside the widget rather than change
    // its text: the pickup toast (1.10 s) and the empty-reserve blink.
    if (t - this.ammoFx.pickT0 < AMMO_TOAST) this._dAmmo = true;
    if (this.ammoFx.empty) { this._dAmmo = true; if (this.w.mag <= 8) this._dRet = true; }

    // ---- the kill punch. 90 ms up is already done (it is set to full on the
    //      kill frame); this is the release. Squared so the tail is short.
    if (this._punch > 0) {
      this._punch = Math.max(0, this._punch - dt * (this._punchKind === 2 ? 3.1 : 4.6));
      const p2 = this._punch * this._punch;
      this.elPunch.style.opacity = (p2 * (this._punchKind === 2 ? 0.62 : 0.40) * this.k.opacity).toFixed(3);
      if (this._punch === 0) this._punchKind = 0;
    }

    // ---- damage response
    if (this._flash > 0) {
      this._flash = Math.max(0, this._flash - dt * 5.2);
      this.elFlash.style.opacity = (this._flash * this._flash * 0.55).toFixed(3);
    }
    const hp = this.vit.health / Math.max(1, this.vit.max);
    const lowT = 1 - sat((hp * 100 - this.k.criticalAt) / Math.max(1, this.k.lowHealthAt - this.k.criticalAt));
    const pulse = hp * 100 <= this.k.criticalAt
      ? 0.5 + 0.5 * Math.sin(t * TAU * 1.15) : 0;
    const want = lowT * 0.85;
    this._hurt += (want - this._hurt) * clamp(dt * 6, 0, 1);
    this.elVig.style.opacity = (this._hurt * this.k.opacity).toFixed(3);
    this.elVigB.style.opacity = ((this._hurt * 0.5 + pulse * 0.30 * lowT) * this.k.opacity).toFixed(3);
    if (lowT > 0.02 && this._lowAnnounced !== (lowT > 0.5)) {
      this._lowAnnounced = lowT > 0.5;
      // audio.js is welcome to this; it is a no-op until something listens.
      this.ctx.bus.emit('hud:vitals', { health: this.vit.health, low: this._lowAnnounced, pulseHz: 1.15 });
    }

    // ---- presence. director.tension holds the readout up through a fight even
    //      if nothing has actually happened for a few seconds.
    if (this.k.idleFade) {
      const idle = t - this.lastEventT;
      const tension = this.ctx.sys.director?.tension || 0;
      const target = (idle > this.k.idleAfter && tension < 0.15)
        ? this.k.idleFloor : 1;
      const p = this.presence;
      this.presence += (target - this.presence) * clamp(dt * 1.6, 0, 1);
      if (Math.abs(p - this.presence) > 0.004) {
        this._dAmmo = this._dVit = this._dBrief = this._dFeed = this._dCom = true;
        const so = (0.30 + 0.70 * this.presence) * this.k.opacity;
        for (let i = 0; i < this.scrims.length; i++) this.scrims[i].style.opacity = so.toFixed(3);
      }
    } else this.presence = 1;

    // ---- compass follows the camera
    const yaw = this.ctx.camera.rotation.y;
    if (this.k.compass && Math.abs(wrapPi(yaw - this._yawShown)) > 0.0016) { this._yawShown = yaw; this._dCom = true; }

    this._updateMarkers();
    this._updateNumbers(dt);
  }

  lateUpdate() { this._paint(); }

  /**
   * combat.js owns ammo, health, the live spread cone, the hit marker and the
   * damage directions. Everything it answers, it wins. This is a straight copy
   * with no interpolation and no smoothing: a HUD that lags the model by even
   * two frames is the thing that makes a shooter feel unresponsive, and it is
   * invisible in a screenshot, so nobody ever catches it.
   */
  _pullCombat() {
    const c = this.ctx.sys.combat;
    const s = c && typeof c.hudState === 'function' ? c.hudState() : null;
    this._hasCombat = !!s;
    if (!s) { this.cmark = null; this.cdirs.length = 0; return; }

    if (typeof s.ammo === 'number') { if (s.ammo !== this.w.mag) this._touch(); this.w.mag = s.ammo; }
    if (typeof s.reserve === 'number') this.w.reserve = s.reserve;
    if (typeof s.cone === 'number') {
      if (Math.abs(s.cone - this.w.spreadDeg) > 1e-4) this._dRet = true;
      this.w.spreadDeg = s.cone;
    }
    if (typeof s.health === 'number') { if (s.health !== this.vit.health) { this._touch(); this._dVit = true; } this.vit.health = s.health; }
    if (typeof s.maxHealth === 'number') this.vit.max = s.maxHealth;
    if (s.reloading) this.w.state = 'reload';
    else if (this.w.state === 'reload') this.w.state = 'idle';

    // marker: one slot, combat's own age clock. The payload is copied field by
    // field rather than aliased — combat.js documents `marker` as a REUSED
    // record and retaining it across a frame would silently show the next hit's
    // data on this hit's marker.
    const m = s.marker;
    // `< life`, not `<= life + 0.06`. The old window kept a marker for 60 ms
    // AFTER its own fade had reached alpha 0, which cost a pointless `_dRet`
    // every one of those frames and — worse — made `this.cmark` non-null while
    // nothing was on screen. `stage()`'s "a real burst that connects always
    // wins" guard tests exactly that field, so an invisible corpse of a marker
    // silently suppressed the staged confirm in the `combat` review shot.
    // Photographed: combat.png had a killfeed and no marker at all.
    const life = this._markerLife(m);
    if (m && m.kind && m.t < life) {
      this.cmark = {
        kind: m.kind, age: m.t,
        melee: !!m.melee, zone: m.zone || null,
        hpFrac: typeof m.hpFrac === 'number' ? m.hpFrac : -1,
        strength: typeof m.strength === 'number' ? m.strength : 1,
      };
      // A kill is a one-shot event and `marker` is a decaying state, so the
      // punch has to be edged off the sequence number, not off the kind.
      if (m.seq !== undefined && m.seq !== this._markSeq) {
        this._markSeq = m.seq;
        if (m.kind === 'kill') this._killPunch(!!m.melee);
      }
    } else this.cmark = null;

    // --- ammo economy tiers. combat.js decides them (it owns RESERVE_MAX and
    //     the magazine size); this file only renders them.
    const f = this.ammoFx;
    if (typeof s.reserveMax === 'number') f.reserveMax = s.reserveMax;
    f.low = !!s.lowAmmo;
    f.empty = !!s.reserveEmpty;
    // Poll-path fallback for the toast, for the case where nothing is listening
    // on the bus (a stub audio/vfx round, or a harness that only steps the sim).
    // `pickupT` counts UP from 0, so a decrease is a new pickup.
    if (typeof s.pickupT === 'number') {
      const now = this.ctx.time.elapsed;
      if (s.pickupT < f._lastPickupT - 1e-6 && s.pickupT < 0.06 && (now - f.pickT0) > 0.08) {
        this._onPickup({ rounds: s.pickupRounds, reserve: s.reserve },
          typeof s.cacheT === 'number' && s.cacheT < 0.06);
      }
      f._lastPickupT = s.pickupT;
    }

    // damage directions: already view-relative
    this.cdirs.length = 0;
    if (s.dirs) {
      for (let i = 0; i < s.dirs.length; i++) {
        const d = s.dirs[i];
        if (d.t > 1.25) continue;
        this.cdirs.push({ rel: d.angle, age: d.t, amt: clamp(d.strength || 1, 0.35, 1.4) });
      }
    }
    if (this.k.damageNumbers && s.numbers) this._syncNumbers(s.numbers);
  }

  _pullWeapon() {
    const s = this.ctx.sys.weapons;
    if (!s) return;
    const h = typeof s.hudState === 'function' ? s.hudState() : (s.hud || null);
    const src = h || s;
    const w = this.w, prev = w.mag, prevAds = w.adsT, prevCone = w.spreadDeg;
    const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
    if (src === s && typeof s.hudState !== 'function' && !s.hud
        && s.mag === undefined && s.ammo === undefined && s.adsT === undefined) return; // stub
    // PRIORITY: weapons > combat > local, for anything the weapon owns.
    // Both files publish an ammo count and a spread cone. combat.js derives its
    // cone from `input.aim`; weapons.js owns the actual ADS blend, the
    // sprint-out ramp and the bloom decay, so where weapons answers it is the
    // more correct number and the crosshair must draw the more correct number
    // (COMBAT_FEEL §3.5: "a static crosshair over a growing cone is lying").
    w.mag = num(src.mag != null ? src.mag : src.ammo, w.mag);
    w.reserve = num(src.reserve, w.reserve);
    w.spreadDeg = num(src.spreadDeg != null ? src.spreadDeg : src.spread, w.spreadDeg);
    w.magSize = num(src.magSize != null ? src.magSize : src.capacity, w.magSize);
    w.adsT = num(src.adsT != null ? src.adsT : src.ads, w.adsT);
    w.reloadT = num(src.reloadT, w.reloadT);
    w.heat = num(src.heat, w.heat);
    if (typeof src.name === 'string') w.name = src.name;
    if (typeof src.mode === 'string') w.mode = src.mode;
    if (typeof src.state === 'string' && !this._hasCombat) w.state = src.state;
    if (w.mag !== prev) this._touch();
    // The crosshair's alpha is a function of adsT and its gap is a function of
    // the cone; without this the ADS fade and the whole spread-bloom read are
    // frozen on whatever the last dirtying event left behind. Invisible in a
    // still and glaring in motion, which is the worst kind of bug to ship.
    if (Math.abs(w.adsT - prevAds) > 1e-3 || Math.abs(w.spreadDeg - prevCone) > 1e-3) this._dRet = true;
  }

  _pullVitals() {
    if (this._hasCombat) return;
    const p = this.ctx.sys.player;
    if (!p) return;
    const h = typeof p.hudState === 'function' ? p.hudState() : p;
    if (typeof h.health === 'number') { if (h.health !== this.vit.health) this._touch(); this.vit.health = h.health; }
    if (typeof h.maxHealth === 'number') this.vit.max = h.maxHealth;
  }

  // ===========================================================================
  // painting
  // ===========================================================================
  _paint() {
    // `__CB.toggle('hud')` must actually do something — HANDOFF records two
    // world systems whose debug flag was a silent no-op, and it is the first
    // A/B a critic or a perf owner reaches for. This is also how the cost
    // number in my HANDOFF entry was measured.
    if (this.ctx.debug.flags.hud === false) {
      if (this.root && this.root.style.display !== 'none') this.root.style.display = 'none';
      return;
    }
    if (this.root && this.root.style.display === 'none') { this.root.style.display = ''; this._markAll(); }
    if (this._dRet) { this._paintReticle(); this._dRet = false; }
    if (this._dCom) { this._paintCompass(); this._dCom = false; }
    if (this._dAmmo) { this._paintAmmo(); this._dAmmo = false; }
    if (this._dVit) { this._paintVitals(); this._dVit = false; }
    if (this._dFeed) { this._paintFeed(); this._dFeed = false; }
    if (this._dBrief) { this._paintBrief(); this._dBrief = false; }
  }

  /**
   * §4.6 total marker life, seconds. A kill holds longer than a hit and a MELEE
   * kill holds longest. DURATION is one of the redundant codings (ACCESSIBILITY
   * §5) that make a kill unmistakable without leaning on hue: even in
   * peripheral vision, "that one stayed" reads before any shape is resolved.
   */
  _markerLife(m) {
    // REVIEW-SHOT HOLD. `shoot()` calls `__CB.settle()`, which restores the
    // main loop BEFORE `page.screenshot()` runs — so between the last sim step
    // and the capture, tens of milliseconds of real time elapse and the sim
    // keeps stepping. A hit marker lives 210 ms. Every marker in the review set
    // has therefore been a coin flip, and `combat.png` was photographed twice
    // in a row with a killfeed, a live burst and no marker at all.
    //
    // While a vista is staged, markers do not age out and `_drawMarker` clamps
    // them to their designed peak frame. This does not invent anything: the
    // geometry photographed is exactly the geometry the player sees at 120 ms,
    // and `stage()` is already the documented mechanism for making a transient
    // photographable (it dresses the killfeed and the damage arc the same way).
    // It is gated on `k.showcase` and cleared by `stage('idle')`.
    if (this._holdMark && this.k.showcase) return 9;
    const base = this.k.hitmarkerMs / 1000;
    if (!m || m.kind !== 'kill') return base;
    return m.melee ? base * 2.00 : base * 1.38;    // 420 ms / 290 ms at the default 210
  }

  /** True when weapons.js is drawing its own optic reticle in the viewmodel. */
  _hasOptic() {
    const w = this.ctx.sys.weapons;
    return !!(w && (w.reticle || w.optic));
  }

  /** Half-angle degrees -> pixels at the frame's centre. */
  _conePx(deg) {
    const vfov = (this.ctx.camera.fov || 65) * DEG;
    return Math.tan(clamp(deg, 0, 25) * DEG) * (this.vh * 0.5) / Math.tan(vfov * 0.5);
  }

  _paintReticle() {
    const g = this.gRet, R = this.R, c = R * 0.5, t = this.ctx.time.elapsed;
    this._clear(g);
    const A = this.k.opacity;

    // ---- crosshair -----------------------------------------------------------
    // COMBAT_FEEL §3.5: "a static crosshair over a growing cone is lying", so
    // the blade gap IS the live spread half-angle projected to pixels.
    //
    // THREE PASSES, AND THAT IS THE WHOLE TRICK. In the first capture of this
    // stage the crosshair sat on a blown-out boulder in `hipfire` and was
    // *gone* — four bone-white slivers on 0.97-luma ash, with a 0.9 px dark
    // inflation under them that did nothing. A one-pixel outline cannot solve
    // this: the reticle has to carry its own local darkening. So a wide soft
    // shade (3.4 px, low alpha), then a tight hard outline (1.7 px), then the
    // ink. Over ash the shade reads as a shadow the crosshair casts; over the
    // grotto's dark rock it is invisible and the ink carries alone.
    const ads = sat(this.w.adsT);
    const ch = this.k.crosshair * A * (1 - ease.inOutQuad(ads));
    if (ch > 0.004) {
      const u = this.u;
      const cone = this._conePx(this.w.spreadDeg);
      const gap = Math.max(3.6 * u, cone);
      // Blades lengthen slightly as the cone opens. A fixed-length blade at a
      // 45 px gap reads as four unrelated specks; growing it keeps the four
      // marks reading as ONE object, which is what makes bloom legible as
      // bloom rather than as the HUD falling apart.
      const len = (10.5 + 4.5 * sat(cone / 46)) * u;
      const wIn = 3.0 * u, wOut = 1.35 * u;
      // Second tuning pass. The first numbers (3.4 px shade at 0.34, 1.6 px
      // outline at 0.80, on a 2.5 px blade) made the dark envelope wider than
      // the ink and the reticle photographed as a white sticker in a black
      // frame. The ink has to be the loudest thing: thicker blades, a thin hard
      // outline, and one very faint wide shade doing the work over blown ash.
      const PASS = [
        { col: '#050302', a: 0.22, grow: 2.6 * u },
        { col: '#0A0705', a: 0.62, grow: 1.05 * u },
        { col: PALETTE.ink, a: 0.96, grow: 0 },
      ];
      for (let p = 0; p < 3; p++) {
        const P = PASS[p];
        g.save();
        g.globalAlpha = ch * P.a;
        g.fillStyle = P.col;
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI * 0.5;
          const ca = Math.cos(a), sa = Math.sin(a);
          const r0 = gap - P.grow, r1 = gap + len + P.grow;
          const h0 = wIn * 0.5 + P.grow, h1 = wOut * 0.5 + P.grow;
          g.beginPath();
          g.moveTo(c + ca * r0 - sa * h0, c + sa * r0 + ca * h0);
          g.lineTo(c + ca * r0 + sa * h0, c + sa * r0 - ca * h0);
          g.lineTo(c + ca * r1 + sa * h1, c + sa * r1 - ca * h1);
          g.lineTo(c + ca * r1 - sa * h1, c + sa * r1 + ca * h1);
          g.closePath(); g.fill();
        }
        // Centre pip. It never moves with the cone, so at full bloom it is the
        // only thing telling you where the barrel actually points.
        g.beginPath(); g.arc(c, c, 1.7 * u + P.grow * 0.55, 0, TAU); g.fill();
        g.restore();
      }
    } else if (ads > 0.98 && !this._hasOptic()) {
      // GRACEFUL DEGRADE. weapons.js models an open reflex sight with a real
      // 2 MOA dot in a segmented ring (`weapons.reticle`), and while that mesh
      // exists the HUD must not draw a second reticle over it — two aiming
      // references is worse than one. But if the viewmodel is absent or is
      // still a stub, an ADS frame with no aiming mark at all is a
      // weapon-and-HUD-craft failure the critic will name. One hairline pip.
      g.save();
      g.globalAlpha = A * 0.55; g.fillStyle = '#050302';
      g.beginPath(); g.arc(c, c, 3.0 * this.u, 0, TAU); g.fill();
      g.globalAlpha = A * 0.85; g.fillStyle = PALETTE.ember;
      g.beginPath(); g.arc(c, c, 1.5 * this.u, 0, TAU); g.fill();
      g.restore();
    }

    // ---- hitmarkers (COMBAT_FEEL §4.6) --------------------------------------
    // ---- empty reserve, at the centre ---------------------------------------
    // The ammo widget's treatment is loud, but it is in the corner the player is
    // NOT looking at during a fight. When the reserve is gone AND the magazine
    // is nearly gone, the fact belongs where the eyes already are. It appears
    // only in that combined case, so it can never become wallpaper.
    if (this.ammoFx.empty && this.w.mag <= 8) {
      const u = this.u;
      const blink = 0.55 + 0.45 * Math.sin(t * TAU * 1.35);
      const a2 = A * (0.30 + 0.40 * blink);
      const txt = this.w.mag <= 0 ? 'DRY' : 'NO RESERVE';
      const y = c + 44 * u;
      const tw = Type.draw(g, txt, c, y, {
        size: 10.0 * u, tracking: 3.2 * u, weight: 1.5 * u,
        align: 'center', color: PALETTE.ember, alpha: a2, halo: 0.75 * u,
      });
      brackets(g, c - tw * 0.5 - 9 * u, y - 12 * u, tw + 18 * u, 17 * u,
        4.5 * u, PALETTE.ember, a2 * 0.8, Math.max(1, 1.2 * u));
    }

    for (let i = 0; i < this.marks.length; i++) this._drawMarker(g, c, this.marks[i], t - this.marks[i].t0, A);
    if (this.cmark) this._drawMarker(g, c, this.cmark, this.cmark.age, A);

    // ---- damage direction ---------------------------------------------------
    const dr = R * 0.30;
    const dirs = this._dirScratch || (this._dirScratch = []);
    dirs.length = 0;
    for (let i = 0; i < this.dmg.length; i++) dirs.push({ rel: this.dmg[i].rel, age: t - this.dmg[i].t0, amt: this.dmg[i].amt });
    for (let i = 0; i < this.cdirs.length; i++) dirs.push(this.cdirs[i]);
    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const age = d.age;
      const inA = ease.outQuad(sat(age / 0.06));
      const outA = 1 - sat((age - 0.35) / 0.90);
      const a = inA * outA * outA * A * 0.95;
      if (a <= 0.004) continue;
      // `rel` is already view-relative (0 = dead ahead, +right); screen angle
      // puts "ahead" at the top of the ring.
      const mid = -Math.PI * 0.5 + d.rel;
      // 56° of 7 px arc read as a thin scratch on the frame, like a stray
      // tracer. A damage indicator has to be a WEDGE: short, fat, and clearly
      // a graphic rather than something in the world.
      const half = 0.26 + 0.09 * d.amt;
      const push = (1 - outA) * 12 * this.u;
      g.save();
      g.lineCap = 'butt';
      // A canvas radial gradient cannot fade an arc along its LENGTH, so a
      // gradient-stroked arc reads as a hard-ended red line — a stray mark on
      // the frame rather than a direction. Build the band out of segments and
      // taper alpha AND width toward the ends; that is what makes it read as a
      // soft wedge coming from somewhere.
      const N = 18;
      const rad = dr + push;
      for (let k = 0; k < N; k++) {
        const f0 = k / N, f1 = (k + 1) / N;
        const env = Math.pow(Math.sin(Math.PI * (f0 + f1) * 0.5), 1.35);
        g.globalAlpha = a * env;
        g.strokeStyle = env > 0.72 ? '#FF8A44' : '#DE3A14';
        g.lineWidth = (3.0 + 13.0 * env) * this.u;
        g.beginPath();
        g.arc(c, c, rad, mid - half + half * 2 * f0, mid - half + half * 2 * f1 + 0.004);
        g.stroke();
      }
      // a dim outer echo, so the band has depth instead of being one stroke
      for (let k = 0; k < N; k++) {
        const f0 = k / N, f1 = (k + 1) / N;
        const env = Math.pow(Math.sin(Math.PI * (f0 + f1) * 0.5), 1.8);
        g.globalAlpha = a * env * 0.34;
        g.strokeStyle = '#7E1604';
        g.lineWidth = (2.0 + 20.0 * env) * this.u;
        g.beginPath();
        g.arc(c, c, rad + 12.0 * this.u, mid - half + half * 2 * f0, mid - half + half * 2 * f1 + 0.004);
        g.stroke();
      }
      // inward chevron so the direction reads even at the edge of vision
      g.globalAlpha = a * 0.95;
      g.fillStyle = '#FFA05A';
      const cx = c + Math.cos(mid) * (rad - 12 * this.u), cy = c + Math.sin(mid) * (rad - 12 * this.u);
      const s = 5.4 * this.u;
      g.translate(cx, cy); g.rotate(mid);
      g.beginPath(); g.moveTo(-s * 0.6, -s * 0.9); g.lineTo(-s * 0.6, s * 0.9); g.lineTo(s * 0.8, 0); g.closePath(); g.fill();
      g.restore();
    }
  }

  /**
   * §4.6. `m` is the marker record: {kind, melee, zone, hpFrac, strength}.
   *
   * Two passes for legibility (a wide dark shade, then the ink) — the same
   * trick the crosshair uses, and for the same reason: the marker lands over
   * whatever the player was shooting, which in this game is regularly 0.97-luma
   * sunlit ash.
   *
   * THE ESCALATION (round-11 brief item 3). When the target publishes its
   * remaining health, `esc = 1 - hpFrac` lengthens and thickens the ticks
   * across a burst, and below 34% health a second set of four ticks appears on
   * the CARDINAL axes — the marker becomes an eight-point star. Size, weight
   * and COUNT, no hue: the player watches the confirmation grow and knows the
   * kill is one round away before it happens. That anticipation is most of what
   * "satisfying to kill" actually is.
   */
  _drawMarker(g, c, m, ageSec, A) {
    const kind = (m && m.kind) || 'normal';
    const melee = !!(m && m.melee);
    const kill = kind === 'kill';
    let age = ageSec * 1000;
    const total = this._markerLife(m) * 1000;
    const grow = kill ? (melee ? 90 : 70) : 60;
    const hold = kill ? (melee ? 140 : 90) : 40;
    const fadeMs = Math.max(1, total - grow - hold);
    if (this._holdMark && this.k.showcase) age = grow + hold * 0.5;   // the peak frame
    let alpha, gt;
    if (age < grow) { gt = age / grow; alpha = 1; }
    else if (age < grow + hold) { gt = 1; alpha = 1; }
    else { gt = 1; alpha = 1 - sat((age - grow - hold) / fadeMs); }
    if (alpha <= 0) return;

    const style = MARK_STYLE[kind] || MARK_STYLE.normal;
    // 1.10, not the 1.34 the first cut used: at 1.34 on top of §4.6's 1.40 kill
    // scale the melee marker measured 95 px across a 900 px frame — over a
    // tenth of the picture height, and it obscured the thing you had just
    // killed. It is the heaviest confirm in the game; it does not also have to
    // be the biggest object on screen.
    const u = this.u * style.sc * (kill && melee ? 1.10 : 1);
    // §4.6's 4 px -> 8 px expand. A kill uses outBack, so it overshoots and
    // settles instead of easing out. Motion is the coding the eye catches first
    // in the periphery, before any shape resolves.
    const r = kill ? lerp(3, 8, ease.outBack(gt, 2.05)) : lerp(4, 8, ease.outQuad(gt));
    const R0 = Math.max(1, r * u);
    const hp = m && typeof m.hpFrac === 'number' ? m.hpFrac : -1;
    const esc = (!kill && hp >= 0) ? sat(1 - hp) : 0;
    const st = clamp((m && m.strength) || 1, 0.4, 3);
    const L = 9 * u * (1 + 0.45 * esc);
    const wMul = 0.86 + 0.20 * Math.min(st, 2.4);

    g.save();
    g.lineCap = 'butt';
    g.lineJoin = 'miter';

    const pen = (pass) => {
      g.strokeStyle = pass === 0 ? 'rgba(6,4,3,0.72)' : style.col;
      g.fillStyle = pass === 0 ? 'rgba(6,4,3,0.72)' : style.col;
      g.lineWidth = (pass === 0 ? 3.6 : 1.9) * u * wMul;
      g.globalAlpha = alpha * style.a * A * (pass === 0 ? 0.7 : 1);
    };

    // --- open geometry (stroked) --------------------------------------------
    const strokePath = () => {
      if (kind === 'deflect') {
        // §4.6: the deflect marker points INWARD. It has to read as "wrong"
        // pre-attentively, before the player has learned anything.
        for (let i = 0; i < 4; i++) {
          const a = Math.PI * 0.25 + i * Math.PI * 0.5;
          const ca = Math.cos(a), sa = Math.sin(a);
          const rOut = R0 + L, rIn = R0 + L * 0.30, wing = L * 0.52;
          g.moveTo(c + ca * rOut - sa * wing, c + sa * rOut + ca * wing);
          g.lineTo(c + ca * rIn, c + sa * rIn);
          g.lineTo(c + ca * rOut + sa * wing, c + sa * rOut - ca * wing);
        }
        return;
      }
      if (kill) {
        // A RING, not ticks. Rotating, so a still frame and a moving frame both
        // say "different". Plus §4.6's X cross-bar, kept because it is a good
        // shape and it survives at 1x.
        const rot = 0.38 * ease.outQuad(sat(age / (grow + hold)));
        const Rk = R0 + L * 0.62;
        g.moveTo(c + Math.cos(rot) * Rk, c + Math.sin(rot) * Rk);
        g.arc(c, c, Rk, rot, rot + TAU);
        if (melee) { const R2 = Rk * 1.32; g.moveTo(c + R2, c); g.arc(c, c, R2, 0, TAU); }
        const rr = R0 + L * 0.30;
        g.moveTo(c - rr, c); g.lineTo(c + rr, c);
        g.moveTo(c, c - rr); g.lineTo(c, c + rr);
        return;
      }
      // normal / head / weak: four diagonal ticks
      for (let i = 0; i < 4; i++) {
        const a = Math.PI * 0.25 + i * Math.PI * 0.5;
        const ca = Math.cos(a), sa = Math.sin(a);
        g.moveTo(c + ca * R0, c + sa * R0);
        g.lineTo(c + ca * (R0 + L), c + sa * (R0 + L));
      }
      // ESCALATION, second stage: below 34% health the marker gains four more
      // ticks on the cardinal axes and becomes an eight-point star. A COUNT
      // change is the most legible thing a small mark can do.
      if (esc >= 0.66) {
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI * 0.5;
          const ca = Math.cos(a), sa = Math.sin(a);
          g.moveTo(c + ca * (R0 + L * 0.18), c + sa * (R0 + L * 0.18));
          g.lineTo(c + ca * (R0 + L * 0.74), c + sa * (R0 + L * 0.74));
        }
      }
      if (kind === 'weak') {
        // §4.6's extra outer chevron pair
        for (let i = 0; i < 2; i++) {
          const a = Math.PI * 0.25 + i * Math.PI;
          const ca = Math.cos(a), sa = Math.sin(a);
          const rr = R0 + L * 1.75, wing = L * 0.42;
          g.moveTo(c + ca * rr - sa * wing, c + sa * rr + ca * wing);
          g.lineTo(c + ca * (rr + L * 0.5), c + sa * (rr + L * 0.5));
          g.lineTo(c + ca * rr + sa * wing, c + sa * rr - ca * wing);
        }
      }
    };

    // --- closed geometry (filled) -------------------------------------------
    // Kill: outward arrowheads on the CARDINAL axes — 90 degrees out of phase
    // with every hit marker's diagonal ticks, which is a difference the eye
    // resolves without reading either shape. Head: a square cap on each tick.
    const fillPath = () => {
      if (kill) {
        const rot = 0.38 * ease.outQuad(sat(age / (grow + hold)));
        const n = melee ? 6 : 4;
        const Ra = (R0 + L * 0.62) * (melee ? 1.32 : 1) + L * 0.30;
        const w = L * 0.40, h = L * 0.62;
        for (let i = 0; i < n; i++) {
          const a = rot + i * (TAU / n);
          const ca = Math.cos(a), sa = Math.sin(a);
          g.moveTo(c + ca * (Ra + h), c + sa * (Ra + h));
          g.lineTo(c + ca * Ra - sa * w, c + sa * Ra + ca * w);
          g.lineTo(c + ca * Ra + sa * w, c + sa * Ra - ca * w);
          g.closePath();
        }
        return;
      }
      if (kind === 'head') {
        const s = L * 0.20;
        for (let i = 0; i < 4; i++) {
          const a = Math.PI * 0.25 + i * Math.PI * 0.5;
          const x = c + Math.cos(a) * (R0 + L), y = c + Math.sin(a) * (R0 + L);
          g.moveTo(x - s, y - s); g.lineTo(x + s, y - s);
          g.lineTo(x + s, y + s); g.lineTo(x - s, y + s); g.closePath();
        }
      }
    };

    for (let pass = 0; pass < 2; pass++) {
      pen(pass);
      g.beginPath(); strokePath(); g.stroke();
      g.beginPath(); fillPath();
      if (pass === 0) g.stroke(); else g.fill();
    }

    // --- the cyan clap ring. Kills only, first 130 ms, expanding past the
    //     marker and gone. It is the value+hue leg of the redundant coding and
    //     it is what makes a kill visible in the corner of the eye.
    if (kill) {
      const ct = sat(age / (melee ? 190 : 130));
      if (ct < 1) {
        const Rc = (R0 + L * 0.62) * lerp(1.0, melee ? 2.55 : 2.05, ease.outQuint(ct));
        g.globalAlpha = alpha * A * (1 - ct) * (melee ? 0.80 : 0.62);
        g.strokeStyle = PALETTE.cold;
        g.lineWidth = Math.max(1, 2.2 * u * (1 - ct * 0.6));
        g.beginPath(); g.arc(c, c, Rc, 0, TAU); g.stroke();
      }
    }
    g.restore();
  }

  _paintCompass() {
    const g = this.gCom;
    const w = g.cw, h = g.ch;
    this._clear(g);
    if (!this.k.compass) return;
    const A = this.k.opacity * (0.30 + 0.52 * this.presence);
    if (A < 0.02) return;

    // three.js yaw 0 looks down -Z; call that North. Iterate over ABSOLUTE
    // headings and place each by its offset from where the player is looking —
    // iterating over screen offsets instead makes the cardinal ticks land
    // between the 5° marks and the letters strobe as you turn.
    const hdg = ((-this.ctx.camera.rotation.y / DEG) % 360 + 360) % 360;
    const spanDeg = 116;
    const pxPerDeg = w / spanDeg;
    const cx = w * 0.5;
    const u = this.u;
    const labelY = 12 * u;         // baseline of the cardinal caps
    const tickTop = 16 * u, tickBot = 24 * u;

    g.save();
    // A plate — without one the strip is invisible against a bright sky, which
    // is exactly where a compass has to work. Feathered on BOTH axes: a plain
    // rect reads as a translucent grey bar pasted onto the frame, which is the
    // single most "browser overlay" thing a HUD can do. Vertical gradient
    // first, then a horizontal `destination-out` erase from the ends.
    // Stops raised from 0.30/0.26 after the first capture: `ads` and `hipfire`
    // both put this strip on a near-white sky and the cardinals were ghosts.
    const vg = g.createLinearGradient(0, 0, 0, h);
    vg.addColorStop(0, 'rgba(6,4,3,0)');
    vg.addColorStop(0.24, 'rgba(6,4,3,0.62)');
    vg.addColorStop(0.82, 'rgba(6,4,3,0.52)');
    vg.addColorStop(1, 'rgba(6,4,3,0)');
    g.globalAlpha = A;
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
    const hg = g.createLinearGradient(0, 0, w, 0);
    hg.addColorStop(0, 'rgba(0,0,0,1)');
    hg.addColorStop(0.34, 'rgba(0,0,0,0)');
    hg.addColorStop(0.66, 'rgba(0,0,0,0)');
    hg.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = 1;
    g.fillStyle = hg;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';

    const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    for (let a = 0; a < 360; a += 5) {
      let off = a - hdg;
      if (off > 180) off -= 360; else if (off < -180) off += 360;
      if (Math.abs(off) > spanDeg * 0.5 + 4) continue;
      const x = cx + off * pxPerDeg;
      const isCard = a % 45 === 0;
      const edge = 1 - sat((Math.abs(x - cx) / (w * 0.5) - 0.58) / 0.42);
      if (edge <= 0.01) continue;
      g.globalAlpha = A * edge * (isCard ? 1.0 : 0.46);
      g.fillStyle = isCard ? PALETTE.ink : PALETTE.ink2;
      const top = isCard ? tickTop : tickTop + 4 * u;
      g.fillRect(x - 0.6 * u, top, Math.max(1, 1.4 * u), tickBot - top);
      if (isCard) {
        const card = CARD[(a / 45) | 0];
        Type.draw(g, card, x, labelY, {
          size: card.length > 1 ? 9.2 * u : 10.4 * u,
          tracking: 2.4 * u, weight: card.length > 1 ? 1.35 * u : 1.65 * u,
          align: 'center', color: PALETTE.ink, alpha: A * edge, halo: 0.85 * u,
        });
      }
    }
    // centre caret — points DOWN into the strip from above, so it never sits on
    // top of a cardinal letter
    g.globalAlpha = A * 0.95;
    g.fillStyle = PALETTE.amber;
    const s = 4.4 * u;
    g.beginPath();
    g.moveTo(cx, tickBot + 4.6 * u);
    g.lineTo(cx - s, tickBot + 0.4 * u);
    g.lineTo(cx + s, tickBot + 0.4 * u);
    g.closePath(); g.fill();
    g.globalAlpha = A * 0.30;
    g.fillRect(cx - 0.6 * u, 3 * u, Math.max(1, 1.2 * u), tickBot - 3 * u);
    g.restore();
  }

  _paintAmmo() {
    const g = this.gAmmo;
    const w = g.cw, h = g.ch;
    this._clear(g);
    const A = this.k.opacity * (0.34 + 0.66 * this.presence);
    if (A < 0.02) return;
    const u = this.u;
    const R = w - 2 * u;                     // right edge inside the canvas
    const mag = Math.max(0, Math.round(this.w.mag));
    const magSize = Math.max(1, Math.round(this.w.magSize));
    const low = mag <= 10, crit = mag <= 3;
    const inkMain = crit ? PALETTE.ember : low ? PALETTE.amber : PALETTE.ink;

    // Local shade. See `smudge`. Sized to the block, not the canvas, and offset
    // toward the corner so the feathering runs off the edge rather than ending
    // inside the frame where you could see its boundary.
    // Sized so the only edges it is clipped on are the pad edges, i.e. the
    // frame's own bottom and right. Inward it fades out inside the canvas.
    smudge(g, 300 * u, h - 24 * u, 232 * u, 88 * u, 0.42 + 0.10 * this.presence);

    // --- weapon designation, top right, tracked wide -------------------------
    const nameY = 20 * u;
    Type.draw(g, this.w.name, R, nameY, {
      size: 10.5 * u, tracking: 3.4 * u, weight: 1.5 * u,
      align: 'right', color: PALETTE.ink2, alpha: A * 0.80, halo: 0.55 * u,
    });
    const modeW = Type.measure(this.w.mode, 8.6 * u, 2.6 * u, 1.25 * u);
    Type.draw(g, this.w.mode, R, nameY + 15 * u, {
      size: 8.6 * u, tracking: 2.6 * u, weight: 1.25 * u,
      align: 'right', color: PALETTE.dim, alpha: A * 0.70, halo: 0.50 * u,
    });
    rule(g, R - modeW - 9 * u - 30 * u, nameY + 15 * u - 3.4 * u, 30 * u, PALETTE.dim, A * 0.34, Math.max(1, 1 * u));

    // --- the number ----------------------------------------------------------
    const bigY = h - 26 * u;
    const magTxt = String(mag).padStart(2, '0');
    const resTxt = String(Math.max(0, Math.round(this.w.reserve)));
    const resW = Type.measure(resTxt, 17 * u, 1.6 * u, 2.5 * u);

    // --- ammo-economy state. Three tiers, each redundantly coded per
    //     ACCESSIBILITY §5 (colour PLUS shape, position, motion or text):
    //       pickup  cyan "+N" that RISES, with a leading chevron       (motion)
    //       low     amber digits + a dashed rule under them + a word   (shape)
    //       empty   INVERSE VIDEO plate + blink + a bracketed word     (value)
    //     The inverse plate is the important one: it is a figure-ground flip,
    //     which survives any colour vision and any amount of bloom over it.
    const f = this.ammoFx;
    const now = this.ctx.time.elapsed;
    const pickAge = now - f.pickT0;
    const toast = pickAge >= 0 && pickAge < AMMO_TOAST;
    const pulse = toast ? sat(1 - pickAge / 0.32) : 0;
    const blinkE = f.empty ? 0.5 + 0.5 * Math.sin(now * TAU * 1.35) : 1;
    const resCol = f.empty ? '#170B05' : f.low ? PALETTE.amber : PALETTE.ink2;

    if (f.empty) {
      // figure-ground flip behind the reserve digits
      const bw = resW + 11 * u, bh = 23 * u;
      g.save();
      g.globalAlpha = A * (0.62 + 0.38 * blinkE);
      g.fillStyle = PALETTE.ember;
      g.fillRect(R - bw + 5 * u, bigY - 17.5 * u, bw, bh);
      g.restore();
    }
    Type.draw(g, resTxt, R, bigY, {
      // The pulse is a 320 ms scale bump on the credit. It is what a player
      // sees out of the corner of their eye while they are looking at a
      // creature, which is when a pickup actually happens.
      size: 17 * u * (1 + 0.22 * ease.outQuad(pulse)),
      tracking: 1.6 * u, weight: 2.5 * u * (1 + 0.30 * pulse),
      align: 'right', color: resCol,
      alpha: A * (f.empty ? 0.98 : 0.72 + 0.28 * pulse), halo: 0.62 * u,
    });
    if (f.low && !f.empty) {
      // dashed rule under the reserve — the shape leg of the low tier
      g.save();
      g.globalAlpha = A * 0.55; g.strokeStyle = PALETTE.amber;
      g.lineWidth = Math.max(1, 1.3 * u); g.lineCap = 'butt';
      g.setLineDash([2.6 * u, 2.2 * u]);
      g.beginPath(); g.moveTo(R - resW, bigY + 4.5 * u); g.lineTo(R, bigY + 4.5 * u); g.stroke();
      g.setLineDash([]);
      g.restore();
    }

    // --- the toast / the reserve-state word, one line above the counter ------
    // 46u, not 30u. The magazine number is 47u tall on a baseline at `bigY`, so
    // its cap top is around bigY-40u and a word at bigY-30u lands INSIDE it —
    // photographed, "NO RESERVE" was struck through the digits. The toast got
    // away with it only because it had already risen out of the collision by
    // the time anything looked at it.
    const wordY = bigY - 46 * u;
    if (toast) {
      const rise = ease.outQuint(sat(pickAge / 0.42)) * 13 * u;
      const out = 1 - sat((pickAge - AMMO_TOAST * 0.58) / (AMMO_TOAST * 0.42));
      const txt = (f.pickN > 0 ? '+' + f.pickN : 'FULL');
      const size = (f.pickBig ? 13.0 : 11.4) * u;
      const y = wordY - rise;
      const tw = Type.draw(g, txt, R, y, {
        size, tracking: 2.2 * u, weight: 1.9 * u,
        align: 'right', color: PALETTE.cold, alpha: A * out, halo: 0.70 * u,
      });
      // leading chevron — the shape leg, so the toast is not just a colour
      g.save();
      g.globalAlpha = A * out * 0.92; g.fillStyle = PALETTE.cold;
      const cx = R - tw - 9 * u, cy = y - 4 * u, s = 4.2 * u;
      g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.95, cy + s * 0.7);
      g.lineTo(cx - s * 0.95, cy + s * 0.7); g.closePath(); g.fill();
      if (f.pickBig) {
        // a cache is a bigger event than a node: bracket the whole toast
        g.globalAlpha = A * out * 0.7;
        brackets(g, R - tw - 20 * u, y - 13 * u, tw + 24 * u, 18 * u, 5 * u, PALETTE.cold, A * out * 0.7, Math.max(1, 1.2 * u));
      }
      g.restore();
    } else if (f.empty || f.low) {
      const txt = f.empty ? 'NO RESERVE' : 'RESERVE LOW';
      const col = f.empty ? PALETTE.ember : PALETTE.amber;
      const a2 = A * (f.empty ? 0.55 + 0.45 * blinkE : 0.62);
      const tw = Type.draw(g, txt, R, wordY, {
        size: (f.empty ? 10.6 : 9.2) * u, tracking: 2.8 * u, weight: 1.5 * u,
        align: 'right', color: col, alpha: a2, halo: 0.60 * u,
      });
      if (f.empty) brackets(g, R - tw - 8 * u, wordY - 12 * u, tw + 12 * u, 17 * u, 4.5 * u, col, a2 * 0.85, Math.max(1, 1.2 * u));
    }
    // hairline separator, optically centred on the small digits' x-height
    const sepX = R - resW - 11 * u;
    g.save();
    g.globalAlpha = A * 0.45; g.strokeStyle = PALETTE.dim;
    g.lineWidth = Math.max(1, 1.2 * u); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(sepX + 5 * u, bigY - 16 * u); g.lineTo(sepX - 5 * u, bigY + 1 * u); g.stroke();
    g.restore();

    Type.draw(g, magTxt, sepX - 9 * u, bigY, {
      size: 47 * u, tracking: 1.0 * u, weight: 9.0 * u, miterLimit: 1.55,
      align: 'right', color: inkMain, alpha: A, halo: 1.35 * u,
    });

    // --- magazine tick strip --------------------------------------------------
    // Grouped in fives with a wider gap: a flat run of thirty identical ticks
    // reads as a hatch pattern and you cannot count it at a glance, which is
    // the only job it has.
    const pitch = 4.0 * u, tw = Math.max(1.2, 2.0 * u), th = 7.0 * u, grp = 3.2 * u;
    const stripW = magSize * pitch - (pitch - tw) + Math.floor((magSize - 1) / 5) * grp;
    const sx = R - stripW, sy = h - 12 * u;
    for (let i = 0; i < magSize; i++) {
      const on = i < mag;
      const x = sx + i * pitch + Math.floor(i / 5) * grp;
      g.globalAlpha = A * (on ? (crit ? 1.0 : low ? 0.92 : 0.80) : 0.20);
      g.fillStyle = on ? inkMain : PALETTE.dim;
      g.fillRect(x, sy - (on ? th : th * 0.42), tw, on ? th : th * 0.42);
    }
    g.globalAlpha = 1;
    // Reserve gone: box the strip. What is in the gun is all there is, and a
    // frame around the magazine says that without a word — it is the same
    // "this is the last one" grammar every shipped shooter uses on its clip.
    if (f.empty) {
      brackets(g, sx - 4 * u, sy - th - 4 * u, stripW + 8 * u, th + 8 * u,
        4 * u, PALETTE.ember, A * (0.35 + 0.45 * blinkE), Math.max(1, 1.2 * u));
    }

    // --- state line ----------------------------------------------------------
    let line = '', col = PALETTE.amber;
    if (this.prompt.text) line = this.prompt.text;
    else if (this.w.state === 'reload') line = 'RELOADING';
    else if (mag === 0) { line = 'RELOAD'; col = PALETTE.ember; }
    else if (low) line = 'LOW AMMO';
    if (line) {
      const blink = mag === 0 ? 0.55 + 0.45 * Math.sin(this.ctx.time.elapsed * TAU * 1.6) : 1;
      Type.draw(g, line, R - stripW - 12 * u, h - 13 * u, {
        size: 9.6 * u, tracking: 3.0 * u, weight: 1.5 * u,
        align: 'right', color: col, alpha: A * 0.92 * blink, halo: 0.55 * u,
      });
    }
  }

  _paintVitals() {
    const g = this.gVit;
    const w = g.cw, h = g.ch;
    this._clear(g);
    const A = this.k.opacity * (0.34 + 0.66 * this.presence);
    if (A < 0.02) return;
    const u = this.u;
    const hp = clamp(this.vit.health / Math.max(1, this.vit.max), 0, 1);
    const crit = hp * 100 <= this.k.criticalAt;
    const low = hp * 100 <= this.k.lowHealthAt;
    const col = crit ? PALETTE.danger : low ? PALETTE.ember : PALETTE.ink;

    smudge(g, 58 * u, h - 18 * u, 190 * u, 82 * u, 0.38 + 0.10 * this.presence);

    const baseY = h - 26 * u;
    Type.draw(g, String(Math.round(this.vit.health)).padStart(2, '0'), 0, baseY, {
      size: 27 * u, tracking: 1.0 * u, weight: 5.0 * u, miterLimit: 1.6,
      color: col, alpha: A * 0.96, halo: 0.95 * u,
    });
    Type.draw(g, 'VITALS', 0, baseY - 34 * u, {
      size: 8.8 * u, tracking: 3.6 * u, weight: 1.3 * u,
      color: PALETTE.dim, alpha: A * 0.62, halo: 0.50 * u,
    });

    // segmented bar — six segments, so damage reads as a step not a slide
    const segs = 6, gap = 3.0 * u, bw = 186 * u, sw = (bw - gap * (segs - 1)) / segs;
    const bx = 0, by = h - 13 * u;
    for (let i = 0; i < segs; i++) {
      const f = clamp(hp * segs - i, 0, 1);
      g.globalAlpha = A * 0.18; g.fillStyle = PALETTE.dim;
      g.fillRect(bx + i * (sw + gap), by, sw, 4.4 * u);
      if (f > 0) {
        g.globalAlpha = A * (crit ? 0.98 : 0.82); g.fillStyle = col;
        g.fillRect(bx + i * (sw + gap), by, sw * f, 4.4 * u);
      }
    }
    g.globalAlpha = 1;

    // right-hand status column: stance + the one thing worth saying
    const px = this.ctx.sys.player;
    const spd = px ? Math.hypot(px.vel?.x || 0, px.vel?.z || 0) : 0;
    const stance = spd > 6.0 ? 'SPRINT' : (px && px.input && px.input.crouch) ? 'CROUCH' : spd > 0.5 ? 'MOVE' : 'HOLD';
    Type.draw(g, stance, bw + 12 * u, baseY, {
      size: 9.2 * u, tracking: 2.8 * u, weight: 1.35 * u,
      color: PALETTE.ink2, alpha: A * 0.55, halo: 0.50 * u,
    });
  }

  _paintFeed() {
    const g = this.gFeed;
    const w = g.cw, h = g.ch;
    this._clear(g);
    const A = this.k.opacity * (0.42 + 0.58 * this.presence);
    if (A < 0.02 || !this.fed.length) return;
    const u = this.u, t = this.ctx.time.elapsed;
    const rowH = 25 * u;

    for (let i = 0; i < this.fed.length; i++) {
      const e = this.fed[i];
      const age = t - e.t0;
      const slide = ease.outQuint(sat(age / 0.14));
      const out = 1 - sat((age - 3.54) / 0.30);
      const a = A * out;
      if (a <= 0.01) continue;
      const y = 16 * u + i * rowH;
      const x = w - (1 - slide) * 44 * u;

      const you = e.actor === 'YOU';
      const tgtSize = 11.6 * u, trk = 2.4 * u, trw = 1.6 * u;
      const tw = Type.measure(e.target, tgtSize, trk, trw);
      const aw = Type.measure(e.actor, tgtSize, trk, trw);
      const gs = 12.5 * u;                       // weapon glyph unit
      const glyphW = gs * 2.20 + (e.wall ? 9 * u : 0);
      const total = aw + glyphW + tw + 22 * u;

      // plate: a slim dark bar so the feed survives a bright sky
      g.save();
      g.globalAlpha = a * 0.34; g.fillStyle = '#0A0806';
      g.fillRect(x - total - 9 * u, y - 14 * u, total + 9 * u, 21 * u);
      g.globalAlpha = a * 0.65; g.fillStyle = you ? PALETTE.amber : PALETTE.dim;
      g.fillRect(x - total - 9 * u, y - 14 * u, 1.8 * u, 21 * u);
      g.restore();

      let px = x - total;
      Type.draw(g, e.actor, px, y, {
        size: tgtSize, tracking: trk, weight: 1.6 * u,
        color: you ? PALETTE.amber : PALETTE.ink2, alpha: a * 0.95, halo: 0.55 * u,
      });
      px += aw + 10 * u;
      if (e.wall) {
        // wallbang: the round passes through a wall. Two short uprights the
        // silhouette crosses — a distinct icon, not a decoration on the rifle.
        g.save(); g.globalAlpha = a * 0.7; g.fillStyle = PALETTE.ink2;
        g.fillRect(px, y - 11 * u, 1.8 * u, 15 * u);
        g.fillRect(px + 4.4 * u, y - 11 * u, 1.8 * u, 15 * u);
        g.restore();
        px += 9 * u;
      }
      // A melee kill is rare and it is the heaviest thing the player can do, so
      // the feed row says which one it was — same slot, different object.
      if (e.melee) meleeGlyph(g, px, y - 4.0 * u, gs, PALETTE.cold, a * 0.98);
      else weaponGlyph(g, px, y - 4.0 * u, gs, PALETTE.ink, a * 0.92);
      if (e.head) {
        // headshot: a filled dot in a ring, set above the muzzle end
        g.save();
        g.globalAlpha = a; g.fillStyle = PALETTE.amber;
        g.beginPath(); g.arc(px + gs * 2.0, y - 12 * u, 1.9 * u, 0, TAU); g.fill();
        g.globalAlpha = a * 0.8; g.strokeStyle = PALETTE.amber; g.lineWidth = 1.2 * u;
        g.beginPath(); g.arc(px + gs * 2.0, y - 12 * u, 4.4 * u, 0, TAU); g.stroke();
        g.restore();
      }
      px += gs * 2.20 + 12 * u;
      Type.draw(g, e.target, px, y, {
        size: tgtSize, tracking: trk, weight: 1.6 * u,
        color: PALETTE.ink, alpha: a, halo: 0.55 * u,
      });
    }
  }

  _paintBrief() {
    const g = this.gBrief;
    const w = g.cw, h = g.ch;
    this._clear(g);
    const A = this.k.opacity * (0.26 + 0.50 * this.presence);
    if (A < 0.02) return;
    const u = this.u;
    const b = this.brief;
    const obj = this.objectives.find(o => o.kind === 'primary');
    const line = b.line || (obj && obj.label) || '';
    const dist = b.dist >= 0 ? b.dist : -1;

    // The brief lives on the sky in `establish` and on white ash in `hipfire`,
    // so it gets the same local shade as the counters.
    smudge(g, 92 * u, 20 * u, 200 * u, 42 * u, 0.46 + 0.12 * this.presence);

    // Was PALETTE.dim at 0.85 α, which is a mid grey at three-quarter strength.
    // Over `hipfire`'s 0.85-luma sky that is a contrast ratio of about 1.2:1 and
    // the line simply was not there. The area label is the quietest thing in the
    // readout, but quiet is not the same as absent.
    Type.draw(g, b.area, 0, 14 * u, {
      size: 8.8 * u, tracking: 3.6 * u, weight: 1.35 * u,
      color: PALETTE.ink2, alpha: A * 0.98, halo: 0.75 * u,
    });
    rule(g, 0, 20 * u, 78 * u, PALETTE.dim, A * 0.40, Math.max(1, 1 * u));
    if (line) {
      // A leading caret, then the objective, then the range as a separate
      // optical unit — the range is the number that changes and it must not
      // make the sentence reflow.
      Type.draw(g, '▸', 0, 37 * u, {
        size: 9.4 * u, tracking: 0, weight: 1.4 * u,
        color: PALETTE.amber, alpha: A * 0.9, halo: 0.50 * u,
      });
      const lw = Type.draw(g, line, 13 * u, 37 * u, {
        size: 10.6 * u, tracking: 2.6 * u, weight: 1.6 * u,
        color: PALETTE.amber, alpha: A, halo: 0.60 * u,
      });
      if (dist >= 0) {
        Type.draw(g, dist + 'M', 13 * u + lw + 12 * u, 37 * u, {
          size: 9.0 * u, tracking: 1.8 * u, weight: 1.35 * u,
          color: PALETTE.ink2, alpha: A * 0.72, halo: 0.50 * u,
        });
      }
      if (b.sub) {
        Type.draw(g, b.sub, 13 * u, 51 * u, {
          size: 8.2 * u, tracking: 2.6 * u, weight: 1.2 * u,
          color: PALETTE.dim, alpha: A * 0.70, halo: 0.45 * u,
        });
      }
    }
  }

  // ===========================================================================
  // world-anchored elements
  // ===========================================================================
  _updateMarkers() {
    if (!this.objectives.length) return;
    const cam = this.ctx.camera;
    const w = this.vw, h = this.vh;
    const frame = this.ctx.time.frame;
    for (let i = 0; i < this.objectives.length; i++) {
      const o = this.objectives[i];
      this._v.copy(o.pos);
      const dist = this._v.distanceTo(cam.position);
      this._v2.copy(o.pos).project(cam);
      const behind = this._v2.z > 1;
      let x = (this._v2.x * 0.5 + 0.5) * w;
      let y = (-this._v2.y * 0.5 + 0.5) * h;
      let edge = false;
      if (behind || x < 30 || x > w - 30 || y < 30 || y > h - 30) {
        edge = true;
        // clamp to an ellipse around the centre, using the world bearing so a
        // marker behind you swings the correct way instead of mirroring.
        const rel = wrapPi(Math.atan2(o.pos.x - cam.position.x, o.pos.z - cam.position.z) - cam.rotation.y);
        const ang = -Math.PI * 0.5 + rel;
        const rx = w * 0.36, ry = h * 0.34;
        x = w * 0.5 + Math.cos(ang) * rx;
        y = h * 0.5 + Math.sin(ang) * ry;
      }
      if ((frame + i * 7) % 9 === 0) o.occ = this._occluded(o.pos);
      const dm = dist < 50 ? Math.round(dist) : Math.round(dist / 5) * 5;
      const key = `${dm}|${o.occ ? 1 : 0}|${edge ? 1 : 0}|${o.kind}`;
      if (key !== o.key) { o.key = key; this._paintMarker(o, dm, edge); }
      o.el.style.transform = `translate3d(${Math.round(x - o.S * 0.5)}px,${Math.round(y - o.S * 0.30)}px,0)`;
      o.el.style.opacity = (this.k.opacity * (o.occ ? 0.40 : 0.92)).toFixed(2);
    }
  }

  /** Depth-correct enough: march the segment against the heightfield + colliders. */
  _occluded(p) {
    const t = this.ctx.sys.terrain, cam = this.ctx.camera.position;
    if (!t || typeof t.heightAt !== 'function') return false;
    const N = 14;
    for (let i = 2; i < N; i++) {
      const s = i / N;
      const x = lerp(cam.x, p.x, s), y = lerp(cam.y, p.y, s), z = lerp(cam.z, p.z, s);
      if (t.heightAt(x, z) > y + 0.35) return true;
    }
    // props.js publishes a collider raycast (HANDOFF "## requests"). It is
    // optional and its exact signature is another agent's; if it ever throws we
    // fall back to terrain-only occlusion permanently rather than killing the
    // frame.
    const pr = this.ctx.sys.props;
    if (this._propRay !== false && pr && typeof pr.raycastColliders === 'function') {
      try {
        const dx = p.x - cam.x, dy = p.y - cam.y, dz = p.z - cam.z;
        const L = Math.hypot(dx, dy, dz) || 1;
        if (pr.raycastColliders(cam.x, cam.y, cam.z, dx / L, dy / L, dz / L, L - 0.6,
          this._hitRec || (this._hitRec = {}))) return true;
      } catch { this._propRay = false; }
    }
    return false;
  }

  _paintMarker(o, dm, edge) {
    const g = o.g, S = o.S, H = S * 0.72, u = this.u;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, S, H);
    const col = o.kind === 'threat' ? PALETTE.ember : o.kind === 'loot' ? PALETTE.amber : PALETTE.cold;
    const cx = S * 0.5, cy = 16 * u;
    g.save();
    g.globalAlpha = o.occ ? 0.75 : 1;
    // diamond: hollow when occluded, filled when in line of sight
    g.strokeStyle = 'rgba(6,4,3,0.7)'; g.lineWidth = 3.4 * u; g.lineJoin = 'miter';
    const d = 7.2 * u;
    const path = () => { g.beginPath(); g.moveTo(cx, cy - d); g.lineTo(cx + d, cy); g.lineTo(cx, cy + d); g.lineTo(cx - d, cy); g.closePath(); };
    path(); g.stroke();
    g.strokeStyle = col; g.lineWidth = 1.7 * u;
    path(); g.stroke();
    if (!o.occ) { g.globalAlpha *= 0.5; g.fillStyle = col; path(); g.fill(); g.globalAlpha = 1; }
    if (edge) {
      g.fillStyle = col; g.globalAlpha = 0.9;
      g.beginPath(); g.moveTo(cx, cy + d + 3 * u); g.lineTo(cx - 4 * u, cy + d + 9 * u); g.lineTo(cx + 4 * u, cy + d + 9 * u); g.closePath(); g.fill();
    }
    g.restore();
    Type.draw(g, dm + 'M', cx, cy + 25 * u, {
      size: 9.2 * u, tracking: 1.8 * u, weight: 1.35 * u,
      align: 'center', color: o.occ ? PALETTE.dim : PALETTE.ink, alpha: 0.92, halo: 0.55 * u,
    });
    if (o.label) {
      Type.draw(g, o.label, cx, cy + 38 * u, {
        size: 8.0 * u, tracking: 2.2 * u, weight: 1.2 * u,
        align: 'center', color: PALETTE.dim, alpha: 0.7, halo: 0.50 * u,
      });
    }
  }

  /**
   * Mirror combat.js's pooled `numbers[]` onto pooled DOM nodes. Matched by
   * slot, not identity: combat shifts the array from the front, so a slot's
   * content can change under us — we redraw a slot's canvas only when its
   * (value, weak) pair actually changes, which for a real burst is once.
   */
  _syncNumbers(src) {
    while (this.numbers.length > src.length) { this.numbers.pop().el.remove(); }
    for (let i = 0; i < src.length; i++) {
      const s = src[i];
      let n = this.numbers[i];
      if (!n) { n = this._makeNumber(); this.numbers.push(n); }
      if (n.value !== s.value || n.weak !== s.weak) this._drawNumber(n, s.value, !!s.weak);
      n.pos.set(s.x, s.y, s.z);
      n.age = s.t; n.jitter = (s.jitter || 0) * this.u;
      n.external = true;
    }
  }

  _makeNumber() {
    const el = document.createElement('div');
    el.className = 'dn';
    const cv = document.createElement('canvas');
    el.appendChild(cv);
    this.markLayer.appendChild(el);
    return { el, cv, g: cv.getContext('2d'), cw: 1, chh: 1, value: null, weak: false, jitter: 0, age: 0, pos: new THREE.Vector3() };
  }

  _drawNumber(n, value, weak) {
    const sz = (weak ? 1.35 : 1) * 14 * this.u;
    const txt = String(Math.round(value));
    const cw = Math.ceil(Type.measure(txt, sz, 1.4 * this.u, 2.0 * this.u) + 12 * this.u);
    const chh = Math.ceil(sz + 12 * this.u);
    n.cv.width = Math.round(cw * this.dpr); n.cv.height = Math.round(chh * this.dpr);
    n.cv.style.width = cw + 'px'; n.cv.style.height = chh + 'px';
    n.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    n.g.clearRect(0, 0, cw, chh);
    Type.draw(n.g, txt, cw * 0.5, chh - 6 * this.u, {
      size: sz, tracking: 1.4 * this.u, weight: 2.0 * this.u, align: 'center',
      color: weak ? PALETTE.amber : PALETTE.ink, alpha: 1, halo: 0.70 * this.u,
    });
    n.cw = cw; n.chh = chh; n.value = value; n.weak = weak;
  }

  /** Local spawn — only used when combat.js is not the source (§4.7). */
  _spawnNumber(p) {
    if (this.numbers.length >= 12) this.numbers.shift().el.remove();
    const n = this._makeNumber();
    this._drawNumber(n, p.damage, p.kind === 'weak');
    n.pos.set(p.point.x ?? p.point[0], p.point.y ?? p.point[1], p.point.z ?? p.point[2]);
    n.jitter = (this.rng.fork('dn' + (this.ctx.time.frame | 0)).next() - 0.5) * 16 * this.u;
    n.age = 0; n.external = false; n.t0 = this.ctx.time.elapsed;
    this.numbers.push(n);
  }

  _updateNumbers() {
    if (!this.numbers.length) return;
    const cam = this.ctx.camera, t = this.ctx.time.elapsed;
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      const age = n.external ? n.age : t - n.t0;
      if (!n.external && age > 0.9) { n.el.remove(); this.numbers.splice(i, 1); continue; }
      this._v.copy(n.pos); this._v.y += sat(age / 0.9) * 0.42;
      this._v2.copy(this._v).project(cam);
      if (this._v2.z > 1) { n.el.style.opacity = '0'; continue; }
      const x = (this._v2.x * 0.5 + 0.5) * this.vw + n.jitter;
      const y = (-this._v2.y * 0.5 + 0.5) * this.vh;
      n.el.style.transform = `translate3d(${Math.round(x - n.cw * 0.5)}px,${Math.round(y - n.chh)}px,0)`;
      n.el.style.opacity = (1 - sat((age - 0.55) / 0.35)).toFixed(2);
    }
  }

  dispose() { this.root?.remove(); }
}
