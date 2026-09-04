// CURFEW — the wordless HUD. Manifest #22, id 'hud'. Owner: progression.
//
// ALEX'S LAW, WHICH OUTRANKS EVERY OTHER CONSIDERATION IN THIS FILE:
// "Delete words from game UI. Show state through in-world visuals so the player feels it,
// rather than reads it." So: no ammo counter, no XP number, no level, no objective, no
// minimap, no damage numbers, no compass, no prompt, no name of anything.
// tests/progression.mjs walks every text node in the document during play and fails on one
// visible glyph. That test is not an obstacle to work around; it is this file's spec.
//
// AND THE ONE AMENDMENT HE MADE HIMSELF, 2026-09-02, after the first human playtest:
// "plus, a healthbar is something we do need."
//
// He is the judge, so the readout exists — and it is built to the SPIRIT of his law rather
// than against it. The law was never "withhold state"; it is "do not make the player READ
// what he could FEEL". Health is the one thing in this game that cannot be felt: the
// vignette and the tremor below are BANDS that say nothing at all above 35 hp, and he died
// from full in fifteen seconds having never seen anything move. So he gets a readout with
// NO number, NO glyph, NO label and NO colour code — a shallow arc at the bottom of the
// frame that answers "how close am I" by LENGTH and "how hard was that" by the size of the
// piece it just lost. See THE LIFE ARC below. The vignette and the tremor stay: they are
// what a low-health state should FEEL like, and they were only ever wrong as the ONLY
// signal.
//
// WHAT IS ALLOWED TO EXIST, AND WHY EACH ONE EARNED IT
//   * A crosshair that IS the weapon's live cone in pixels. A static crosshair over a growing
//     cone is a lie the player will feel and never be able to name.
//   * A hit marker whose SHAPE says normal / armoured / weak point / kill. Shape, not colour:
//     a marker read by hue is a marker half the room cannot read, and shape survives being
//     4 px across in the corner of the eye.
//   * Health as a vignette and a tremor, AND as the life arc he asked for. The tremor is on
//     the VIGNETTE, never on the camera — "never take the camera away" is the horror law and
//     it has no exceptions, including for feedback the player would probably enjoy.
//   * A brief arc for the direction damage came from, with a tick that points along it.
//   * A chevron for each committed thing at your BACK, for as long as it is there. Eleven of
//     the thirteen hits in his first session came from behind him, every one of them legally
//     telegraphed where he could not see it. The mark deletes itself the instant you turn
//     toward it, which is how "turn around" gets taught without a word.
//   * The respawn window, drawn as a closing arc. Invulnerability the player cannot see is a
//     mechanic he will never learn to use.
//   * A ring pulse when a mote lands, so getting paid reaches the screen even when the mote
//     arrives from behind you — and two slower rings for a node bought, three for a level.
//     Those two were added after the second audit: a purchase used to acknowledge itself with
//     a chime and nothing else, so with the audio lane disabled — every headless run — buying
//     a node was completely silent AND completely invisible. Speed and COUNT tell the three
//     apart; no hue and no glyph is involved.
//   * ONE screen-reader line, class "sr-only", which no sighted player ever sees.
//   * A pause card that DOES list the controls, because reading costs nothing when the game
//     is stopped, and because a game nobody can find the crouch key in is not scarier.
//   * THE TREE, on that same card. Round 5 (lane B) put the level as a word, the six branches
//     and a three-card deal there. Alex, fifth playtest: "I want a good skill tree that is not
//     automatic that is intuitive and the player can use." A deal of three random cards is not
//     a tree you USE, it is a slot machine you accept — so since round 6 (lane G) the WHOLE
//     tree is on the card: six branch rows, four tiers each, every node a button with its name
//     and one line of what it buys, in four states (owned / affordable / locked / not yet
//     affordable), and a click on an affordable one buys it. No deal, no randomness. The
//     points to spend are a word. Words are legal here and nowhere else; tests/progression.mjs
//     still walks the page during play and finds none.
//   * THE MAP, above the tree on the same card (round 6, lane G). Alex: "A minimap or at the
//     least a large map in the menu that shows where you've been and if you've finished
//     places would be nice." DESIGN decision 19 stands — nothing is marked on the HUD — and
//     this is not the HUD: it is the paper map, on the one surface where the game is stopped.
//     A canvas, county-square, drawn from live state each time the card shows and never per
//     step: the roads, the majors in three states (unfound faint, found named, claimed lit in
//     the region's tint), the campfires and wilds he has found, the car, himself as an arrow,
//     and WHERE HE HAS BEEN as a soft wash over a 64 x 64 travelled-cell bitmap that
//     progression/progress.js records once a second and keeps in the save. The unexplored
//     county stays dark. Words on the map: place names, once found; no legend, no compass, no
//     coordinates.
//
// WHAT IS DELIBERATELY NOT HERE: ammo. DESIGN says ammo is "the magazine window and the last
// three tracers" — both of those live on the gun, and the gun is weapons/viewmodel.js. The
// only ammo fact this file states is a DRY one: the centre pip goes hollow when the magazine
// is empty. That is a shape, it is at the point the eye is already on, and it says the one
// thing the player must not learn by pulling a silent trigger.
//
// donor: cinderbloom src/ui/hud.js:1392-1394 `_conePx` — "Half-angle degrees -> pixels at the
//   frame's centre", tan(deg) * (vh/2) / tan(vfov/2). That single line is what makes the
//   crosshair honest, and CFG has no equivalent because it is geometry, not taste.
// donor: cinderbloom src/ui/hud.js:1417-1455 — the three-pass reticle (wide soft shade, tight
//   hard outline, then ink) and the blade length growing with the gap so four marks keep
//   reading as ONE object. Written after a capture where the crosshair was invisible on a
//   blown-out rock: "a one-pixel outline cannot solve this."
// donor: cinderbloom src/ui/hud.js:1574-1680 `_drawMarker` — the grow/hold/fade envelope, the
//   deflect marker pointing INWARD so it reads as wrong pre-attentively, the kill marker as a
//   rotating ring plus a cross rather than more ticks, and the weak-point chevron pair.
// donor: cinderbloom src/game/combat.js:1298-1312 `_marker` — MARK_RANK, so a plain hit
//   arriving 40 ms after a kill cannot overwrite the kill.
// donor: palehollow src/progress.js:95-106 — the 64 x 64 reveal grid drawn onto a canvas,
//   which DESIGN section 2 names for the paper map. Here the grid is progress.js's and the
//   canvas is a DOM element on the card rather than a texture in the hand.

import { CFG } from '../config.js';
import { clamp, clamp01, DEG, TAU } from '../engine/math.js';
// Pure data, no ctx, same owner (progression). The card lists every branch and every node
// once at build time and rewrites their STATE afterwards; the names and lines never change.
import { BRANCHES, NODES } from '../progression/nodes.js';
// Pure data, read-only: the majors' positions, names and region tints for the map.
import { MAJORS, MINOR_KINDS, REGION_TINT, DEFAULT_TINT } from '../world/placedata.js';

/* ---------------------------------------------------------------- constants -- */
// No CFG.hud block exists; config.js belongs to the engine owner and is deep-frozen. Every
// number here is named, reasoned, and requested for a home in docs/HANDOFF.md P-4.

const RET_MAX = 640;            // CSS px of the reticle canvas, square, centred
const DPR_CAP = 2;

const MARK_LIFE = { normal: 0.210, weak: 0.240, armoured: 0.240, kill: 0.320 };
const MARK_RANK = { normal: 0, weak: 2, armoured: 1, kill: 3 };   // combat.js:1303
const MARK_POOL = 6;

const ARC_LIFE = 0.90;          // damage direction
const ARC_POOL = 4;
const PULSE_LIFE = 0.30;        // a mote landed
const PULSE_POOL = 5;
// A NODE BOUGHT AND A LEVEL GAINED, and they are here for the reason the second audit found
// everywhere else: the only acknowledgement either of them had was a chime, and the chime is
// baked through the audio lane, which returns early with the AudioContext dead — every
// headless run, and any browser with autoplay hard-blocked. Buying a node is one of the four
// things Alex asked for by name and it must reach the screen without Web Audio.
// Still no words and no number: a slow ring is a different SHAPE from the mote's fast one,
// and the level ring is a slower, wider version of the same gesture, so the two read as the
// same family without either being labelled.
const GRANT_LIFE = 0.62;
const LEVEL_LIFE = 0.95;

// SOUND LEADS ANY READOUT BY 200 ms. The bed's hurt cue plays on the frame of the hit; the
// vignette does not move until this has elapsed, so the ear always gets there first and the
// eye confirms. A readout that arrives WITH its sound reads as a UI event; one that arrives
// after it reads as a consequence.
const READOUT_LEAD_S = 0.200;

const VIG_LAMBDA = 5.0;         // how fast the vignette follows the health band
const TREMOR_FROM = 0.35;       // below this FRACTION of the body's own max it starts to shake.
                                // Round 6 fixed the arc's length to read against player.hpMax
                                // and left this one an absolute 35 hp, so with Iron bought
                                // (hpMax 150) the frame did not move until 23% left where a
                                // plain body gets its warning at 35%. A readout that changes
                                // its mind about what "nearly dead" means when you buy a node
                                // is a readout that lies about the node.
const TREMOR_HZ = 8.5;
const TREMOR_PX = 2.6;          // at 0 hp. Never applied to the camera.

/* ---------------------------------------------------- THE LIFE ARC (new) ----
 * ALEX, 2026-09-02, after the first human playtest: "plus, a healthbar is
 * something we do need." He is the judge, so he gets one — and it gets built to the SPIRIT
 * of his own standing law rather than against it.
 *
 * The law was never "withhold state". It is "do not make the player READ what he could
 * FEEL". Health is the one number in this game that cannot be felt: the vignette and the
 * tremor above are BANDS, they only start speaking below 35 hp, and by then the answer he
 * needs — how many more bites do I have — has already been decided. He was at 34 hp with no
 * way to know it, and he died from full in fifteen seconds without ever seeing a number move.
 *
 * So: no number, no glyph, no corner box, no colour code. A shallow arc across the bottom of
 * the frame, and it answers two questions pre-attentively:
 *
 *   HOW CLOSE AM I TO DYING     -> LENGTH. It shrinks symmetrically toward the centre, so
 *                                  the read works in peripheral vision where position, not
 *                                  hue, is what survives. And VALUE: at full health it is a
 *                                  0.10-alpha thread nobody looks at; at a quarter it is a
 *                                  thick bright bar that breathes. Quiet when you are fine,
 *                                  impossible to ignore when you are not.
 *   DID THAT HURT A LOT         -> the GHOST. The piece that was just taken stays lit where
 *                                  it was for GHOST_LIFE and burns off. Its LENGTH is the
 *                                  damage. A 22-point hound bite and a 6-point graze are
 *                                  different-sized objects on screen, in the same instant.
 *
 * Regen settles it back; because CFG.player.health.regenCeiling is 40, it visibly stops at
 * two fifths and stays there, which teaches the ceiling without a word about it.
 *
 * It is drawn on its OWN canvas, full width and LIFE_H tall at the bottom edge, because the
 * reticle canvas is 640 px and centred and this belongs at the rim of vision. That canvas is
 * repainted only when something on it actually moved.
 *
 * ROUND 6: the arc's whole length is the body's OWN maximum — player.hpMax when the body
 * exposes it (lane E reads the tree's hpMax stat), CFG's 100 otherwise, and never less than
 * the hp actually held, so Thick Skin makes the arc no longer at full and the readout never
 * draws a fraction the body does not have.
 */
const LIFE_H = 132;             // CSS px of the bottom canvas
const LIFE_BOTTOM = 20;         // px from the viewport bottom to the apex of the arc
const LIFE_HALF = 0.34;         // half-width of the arc as a fraction of the viewport
const LIFE_RISE = 54;           // px the centre of the arc rises above its ends
const LIFE_A_FULL = 0.10;       // ink alpha at 100 hp — a thread, nothing more
const LIFE_A_DEAD = 0.86;       // ink alpha as it approaches 0
const LIFE_W_FULL = 1.7;        // stroke, design px, at 100 hp
const LIFE_W_DEAD = 6.4;        // stroke at 0
const LIFE_TROUGH_A = 0.40;     // the empty part of the arc, at 0 hp; scales with the loss
const LIFE_BREATH_FROM = 0.34;  // below this fraction the bar starts to breathe
const LIFE_BREATH_HZ = [0.85, 2.30];  // at the threshold, and at death's door
const GHOST_LIFE = 0.72;        // s a lost segment stays lit
const GHOST_POOL = 4;
const RESTORE_LIFE = 0.85;      // s of "you are whole again" after a respawn
const LIFE_EPS = 0.12;          // hp of movement worth a repaint

/* ------------------------------------------------- THE THREAT MARKS (new) ---
 * ALEX: "basically the whole time im hearing sounds and seeing directions marked like I'm
 * being hit" — and he still could not tell what was happening. MEASURED, 75 s of walking
 * from the spawn without shooting: eleven of thirteen hits came from BEHIND him, dot -1.00,
 * -0.99, -0.96, -0.94 against camera forward, from a hound standing 0.0-2.2 m away.
 *
 * The damage arc below is a FADE. It says "something hit you from over there", once, and
 * then it is gone while the thing that hit you is still standing there. That is a receipt,
 * not a warning, and he was reading a stream of receipts.
 *
 * So: a mark that PERSISTS while the threat does, and stops existing the moment you turn to
 * face it. One chevron per committed body that is inside THREAT_R and OUTSIDE your forward
 * cone, on a ring at the edge of the reticle, pointing outward at its bearing. Weight is
 * distance; a body in its wind-up throbs. Turn toward it and it is gone — which is the whole
 * lesson, taught by the mark deleting itself rather than by anybody saying it.
 *
 * It is not a radar: it cannot show you anything in front of you, anything past 20 m, or
 * anything that has not committed to you. What it shows is exactly the case the camera
 * cannot — the thing at your back.
 */
const THREAT_R = 20;            // m; past this you are not being attacked, you are being stalked
const THREAT_NEAR = 3.5;        // m at which a mark is at full weight
const THREAT_CONE = 0.90;       // rad (~52 deg) each side of forward = "you can see it"
const THREAT_POOL = 4;          // more marks than this is a wall, not a warning
const THREAT_A = [0.20, 0.72];  // alpha at THREAT_R and at THREAT_NEAR
const THREAT_HZ = 5.5;          // the wind-up throb

/* ---------------------------------------------- THE RESPAWN WINDOW (new) ----
 * player/controller.js gives the body RESPAWN_INVULN seconds in which damage cannot land.
 * Invulnerability the player cannot see is a mechanic he will never learn to use, so it is
 * drawn: a second arc riding just above the life arc, starting full and CLOSING to nothing
 * across exactly those seconds. Same gesture, same geometry, one hair brighter — the family
 * resemblance is the point, because it says "this is also about staying alive" without
 * saying anything.
 */
const INV_GAP = 9;              // px above the life arc
const INV_SPAN_MUL = 0.86;      // slightly narrower, so the two arcs are never confused
const INV_A = 0.80;

const SR_PERIOD_S = 2.0;        // the screen-reader line is rewritten at most this often

// Fixed steps after a resume during which a 'menu' edge is ignored. MEASURED (tests/pause.mjs,
// first run of the round-5 card): an Escape pressed WHILE PAUSED is not lost — input.js keeps
// the edge until the next fixed step, which is the first step after the click back in — so
// honouring it re-paused the game exactly one step (0.0167 s on the clock) after every resume.
// That is Alex's "multiple levels of pause screen", reproduced by his second press.
// Since verification round 1, main.js clears every input edge on the resume transition
// (main.js frame(), the game:paused false branch), so no stale edge of any key reaches a
// step; this guard stays as the second fence for the one key that could re-pause.
const MENU_ARM_STEPS = 3;

// The card shows on game:paused true ONLY once the pointer lock has been held at least once
// this page (input:lock true). Entering the game emits game:paused true while the lock
// request is still in flight, and the lock lands 10-40 ms later (measured: 1 frame headless,
// 3 frames with a 40 ms lock in verification round 1); a frame-counted delay flashed the
// whole card over the fading title whenever the lock took longer than the count. If the
// lock never lands (Chrome refused it), the pause is real and the card shows after this
// much wall time so the player is not left with a frozen world and no way out.
const CARD_LATE_MS = 500;

const INK = '#e8eef8';
const SHADE = 'rgba(4,6,9,0.72)';

/* ------------------------------------------------------------- THE MAP ----
 * County-square, MAP_PX a side, in the card's own palette so it never reads as a HUD: the
 * ground is the card's own dark, the roads and marks are the card's ink at low alpha, and
 * the ONE hue on it is a claimed place in its region's tint — the same colour its beacon
 * put in the sky. The travelled wash is the ink at MAP_WASH_A, drawn as overlapping discs a
 * little larger than a cell so the edge of the walked county is soft rather than a grid.
 * Everything below is measured against the PNGs in docs/ROUND-6/G-card.md.
 */
const MAP_PX = 440;             // CSS px, square
const MAP_GROUND = '#0b0e13';   // the paper: darker than the card so the wash reads on it
const MAP_EDGE = '#1b2431';     // the card's rule colour

/* ROUND 7 — THE WASH IS A PATH NOW, NOT A STRING OF SCALLOPS.
 * NEXT.md B9: "the travelled wash draws as scalloped discs". It did: one arc per visited
 * cell at 0.10 alpha, and where two discs overlapped the alpha doubled, so a walked road
 * read as a row of bright lenses with dark notches between them — the shape of the DRAWING
 * METHOD, never the shape of the walk.
 *
 * So the wash is composited ONCE, off screen, at the bitmap's own 64 x 64 resolution: a set
 * cell is opaque, a cell touching one is half, and the whole thing is drawn up to 440 px
 * with smoothing on. The upscale IS the softness — bilinear over a 6.9x magnification — so
 * overlapping neighbours can never add, one cell is a soft blot and a walked road is a
 * continuous band with a feathered edge. One drawImage instead of up to 4096 arcs.
 */
const MAP_WASH_A = 0.23;        // alpha of the composited wash. The core reads ~0.27, the
                                // feathered halo ~0.13, and the loop road (0.52) sits clearly
                                // above both. MEASURED, tools/g-pausecard.mjs: at 0.34 the
                                // wash swallowed the loop wherever he had walked it, and the
                                // road is the thing that has to lead.
const MAP_WASH_HALO = 112;      // 0-255: how much of a set cell bleeds into its neighbours
const MAP_LOOP_A = 0.60;        // the county loop: the one road that goes everywhere
const MAP_LOOP_W = 2.0;
const MAP_SPUR_A = 0.34;        // a gravel spur: thinner, dashed, so the loop reads as the loop
const MAP_SPUR_W = 1.2;
const MAP_CASING_A = 0.10;      // a soft casing under the loop, so it survives the wash
const MAP_UNFOUND_A = 0.30;     // a faint mark. It says SOMETHING IS HERE and nothing else —
                                // no glyph, no name: you have not been.
const MAP_FOUND_A = 0.86;
const MAP_GLYPH = 6.4;          // half-size of a destination's drawn silhouette, px
const MAP_MINOR_A = 0.52;       // a minor site he has stood at
const MAP_NAME_FONT = '10.5px "Palatino Linotype", Palatino, Georgia, serif';
const MAP_NAME_DX = 7;          // px from the mark to its name
const MAP_NAME_FLIP = 92;       // px from the right edge past which a name sits on the left
const MAP_ARROW = 11;           // px, the player's arrow, tip to base
const MAP_CAR_L = 9;            // px, the car's rectangle
const MAP_CAR_W = 5;

const CONTROLS = [
  ['Move', 'W A S D'],
  ['Look', 'Mouse'],
  ['Fire', 'Left mouse'],
  ['Aim', 'Right mouse'],
  ['Melee', 'V or middle mouse'],
  ['Reload', 'R'],
  // Round 5 lane F (the gun) adds a second weapon and Q swaps; round 6 lane D1 adds the
  // digits. Same round, same card.
  ['Swap weapon', 'Q or 1 / 2'],
  ['Sprint', 'Shift'],
  ['Crouch and slide', 'Ctrl or C'],
  ['Jump and mantle', 'Space'],
  // ALEX, first playtest: "I've made it to the car. i have no idea how to get into the car
  // lol." The door is KeyE and the horn is KeyH (engine/input.js:59-60, adopted from the
  // vehicle lane's shim) and NEITHER was on this card — the one surface in CURFEW where
  // words are legal, because the game is stopped and reading costs nothing. A verb the
  // player cannot find is a verb that does not exist.
  // ROUND 6, lane D1 (BRIEF-G item 5): E is also the claim verb, held. Alex, fifth
  // playtest: "I have no idea how you finish places."
  ['Use, get in the car', 'E'],
  ['Claim a place', 'hold E'],
  ['Horn', 'H'],
  ['Torch', 'F'],
  // ROUND 7. Alex, fifth playtest: "I don't know if there's a map or conquered destinations
  // or something." There is, and it is behind this key, and the card that says so is the one
  // he only sees AFTER pressing it. Naming the key for what is behind it is the only place
  // this can be taught without a word on the screen during play.
  ['Map and skills', 'Esc'],
];

const CSS = `
/* NO BACKTICK MAY APPEAR IN THIS BLOCK. It is a template literal, and the CONTRACT's GLSL
   law is the same law here: one backtick in a comment closed the string and the module threw
   SyntaxError at import, taking the whole boot with it.
   Not "contain: strict": paint containment would clip the vignette's -3% overhang, which is
   the whole reason it overhangs. layout + style is all this subtree needs. */
#curfew-hud { position: fixed; inset: 0; z-index: 12; pointer-events: none;
              contain: layout style; }
#curfew-vig { position: absolute; inset: -3%; opacity: 0; will-change: opacity, transform;
              background: radial-gradient(ellipse at 50% 52%,
                rgba(0,0,0,0) 38%, rgba(6,3,3,0.55) 78%, rgba(9,2,2,0.92) 100%); }
#curfew-ret { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); }
/* The life arc. Bottom edge, full width, its own surface so the 640 px reticle canvas is
   not cleared for a thing that lives at the rim of vision. */
#curfew-life { position: absolute; left: 0; bottom: 0; width: 100%; display: block; }
#curfew-hud .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden;
              clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
/* THE PAUSE CARD. A flex overlay with the card on margin:auto: centred when it fits,
   scrollable when it does not (a grid place-items:center clips a tall card's head; margin
   auto does not).
   THE HOME PILL. The site wraps the game and puts a home pill in the top-left 170 x 44 px,
   and it reappears the moment the lock is lost — which is exactly when this card shows. The
   52 px top pad keeps the card's resting layout clear of it. Round 6 ALSO indented the whole
   card by 180 px under 1000 px wide, which on Alex's phone left a 390 px window with a 210 px
   card: measured 2026-09-03, node buttons 45 px wide by 190 px tall and the map squashed to
   269 x 440. "mobile is much more important than pc", so the indent is gone and the corner is
   covered instead — a fixed patch of the overlay's own ground, so any line that scrolls up
   there is hidden rather than fighting the pill. */
#curfew-pause { position: fixed; inset: 0; z-index: 24; display: flex; overflow-y: auto;
              box-sizing: border-box; padding: 52px 14px 20px;
              background: rgba(5,7,10,0.88); pointer-events: auto;
              -webkit-overflow-scrolling: touch;
              font: 400 14px/1.6 "Palatino Linotype", Palatino, Georgia, serif; color: #c9d4e6; }
#curfew-pause::before { content: ''; position: fixed; left: 0; top: 0; width: 250px; height: 86px;
              z-index: 3; pointer-events: none;
              background: linear-gradient(128deg, rgba(5,7,10,0.99) 0%, rgba(5,7,10,0.92) 34%,
                          rgba(5,7,10,0.55) 62%, rgba(5,7,10,0) 100%); }
#curfew-pause[hidden] { display: none !important; }
#curfew-pause .card { position: relative; z-index: 1; width: min(1240px, 96vw); margin: auto; }
#curfew-pause .rule { height: 1px; background: #1b2431; margin: 0 0 16px; }
#curfew-pause .rule.mid { margin: 14px 0; }
/* THE MAP AND THE TREE, side by side when the window is wide enough, the map first. One
   block, and it swallows the press: a click anywhere on it must never resume the game. */
#curfew-pause .top { display: grid; grid-template-columns: 440px minmax(0, 1fr); gap: 0 28px;
              align-items: start; }
@media (max-width: 1180px) { #curfew-pause .top { grid-template-columns: minmax(0, 1fr); gap: 16px 0; } }
/* SQUARE AT EVERY WIDTH. It was width:440 height:440 with max-width:100%, so a 270 px column
   drew a 440 px-tall county into a 270 px-wide box and the whole map was stretched. */
#curfew-pause .map { display: block; width: min(440px, 100%); aspect-ratio: 1 / 1; height: auto;
              margin: 0 auto; border: 1px solid #1b2431; border-radius: 2px; background: #0b0e13; }
/* THE TREE: the level and the points as words, then six branch rows of four node buttons. */
#curfew-pause .lvl { font-size: 17px; letter-spacing: .10em; color: #e8eef8; margin: 0 0 9px; }
#curfew-pause .lvl .pts { font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
              opacity: .55; margin-left: 14px; }
#curfew-pause .br { display: grid; grid-template-columns: 56px repeat(4, minmax(0, 1fr));
              gap: 0 8px; align-items: stretch; margin: 0 0 6px; }
#curfew-pause .bn { opacity: .52; letter-spacing: .12em; text-transform: uppercase; font-size: 11px;
              align-self: center; }
/* A PHONE. Four tiers across a 360 px window is four 78 px columns, which is a word a line.
   Two across, with the branch name over them, is the same tree in the same order — read down
   the pairs instead of across the row — and every button clears the 44 px touch floor. */
@media (max-width: 760px) {
  #curfew-pause .br { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin: 0 0 14px; }
  #curfew-pause .bn { grid-column: 1 / -1; align-self: start; margin: 0 0 1px; }
}
/* A NODE. Four states, told apart by VALUE and by edge, never by hue:
     own   held. Bright, a filled ground and a solid left edge. No cost, it is paid.
     can   affordable now. Bright, a lit border, a pointer, and it brightens under the mouse.
     poor  the tier below is yours but the points are not there yet. Half.
     lock  the tier below is not yours. Faint, but the line is still readable. */
#curfew-pause .nd { position: relative; display: block; width: 100%; box-sizing: border-box;
              text-align: left; min-height: 44px;
              font: inherit; color: #c9d4e6; background: rgba(4,6,9,0.72);
              border: 1px solid #1b2431; border-left: 3px solid #1b2431; border-radius: 2px;
              padding: 6px 9px 7px; cursor: default; opacity: .55; }
#curfew-pause .nd .cn { display: flex; justify-content: space-between; align-items: baseline;
              gap: 0 6px; color: #e8eef8; font-size: 13px; letter-spacing: .05em; line-height: 1.3; }
#curfew-pause .nd .cc { font-size: 9.5px; letter-spacing: .18em; text-transform: uppercase;
              opacity: .55; white-space: nowrap; }
#curfew-pause .nd .cl { display: block; font-size: 10.5px; line-height: 1.35; opacity: .74;
              margin: 3px 0 0; }
/* THE CHAIN. A tier needs the tier below it, and until round 7 the only way to learn that was
   to click a locked node and watch nothing happen. Now the 8 px gap between two nodes in a
   row carries a rule, and the rule LIGHTS once the node on its left is owned — so a branch
   reads left to right as a thing you work along, with no word saying so. On a phone the row
   is two wide and the chain runs between the pairs, which is still the reading order. */
#curfew-pause .nd + .nd::before { content: ''; position: absolute; left: -12px; top: 50%;
              width: 9px; height: 1px; background: #1b2431; }
#curfew-pause .nd.own + .nd::before { background: #6f7f99; }
@media (max-width: 760px) { #curfew-pause .nd + .nd::before { display: none; } }
#curfew-pause .nd.own { opacity: 1; border-color: #34425a; border-left-color: #c9d4e6;
              background: rgba(201,212,230,0.075); }
#curfew-pause .nd.own .cc { display: none; }
/* AFFORDABLE NOW. The one state the eye has to find on a card of 24, so it is the brightest
   edge on the card and it does not depend on a hover the phone cannot make. */
#curfew-pause .nd.can { opacity: 1; cursor: pointer; border-color: #8a9ab5;
              border-left-color: #e8eef8; background: rgba(201,212,230,0.045); }
#curfew-pause .nd.can:hover { border-color: #e8eef8; background: rgba(201,212,230,0.09); }
#curfew-pause .nd.poor { opacity: .55; }
#curfew-pause .nd.lock { opacity: .30; }
/* THE CONTROLS. Three pairs to a row on a wide window (fifteen verbs in five rows, which is
   what keeps the whole card inside a 780 px window), two under 1180, one on a phone. */
#curfew-pause dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 2px 34px; margin: 0; }
@media (max-width: 1180px) { #curfew-pause dl { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { #curfew-pause dl { grid-template-columns: minmax(0, 1fr); gap: 5px; } }
/* Each verb and its key are ONE unit. Round 6 laid the dl out as 1fr auto 1fr auto, which put
   a third of the card between "MOVE" and "W A S D" and made the reader's eye do the pairing. */
#curfew-pause .pair { display: flex; justify-content: space-between; align-items: baseline;
              gap: 0 14px; border-bottom: 1px solid rgba(27,36,49,0.55); padding: 0 0 2px; }
#curfew-pause dt { opacity: .52; letter-spacing: .12em; text-transform: uppercase;
              font-size: 11px; }
#curfew-pause dd { text-align: right; font-size: 13px; letter-spacing: .06em; opacity: .86;
              margin: 0; white-space: nowrap; }
#curfew-pause .foot { margin-top: 12px; font-size: 11px; letter-spacing: .22em;
              text-transform: uppercase; opacity: .32; text-align: center; }
`;

/**
 * kind id -> its MINOR_KINDS row, so the map can tell a fire from a waystone without asking
 * places. Built once at module load off frozen data; it can never drift from the table.
 */
const MINOR_BY_ID = MINOR_KINDS.reduce((m, k) => { m[k.id] = k; return m; }, Object.create(null));

/** 0xrrggbb -> '#rrggbb'. Card-time only; never on a frame. */
function hex6(n) {
  const s = (n >>> 0).toString(16);
  return '#' + '000000'.slice(s.length) + s;
}

/* -------------------------------------------------------------------- system -- */

export class Hud {
  static id = 'hud';

  constructor(ctx) {
    this.ctx = ctx;
    this.enabled = typeof document !== 'undefined';

    this.root = null; this.vig = null; this.canvas = null; this.g = null;
    this.lifeCanvas = null; this.lg = null;
    this.srEl = null; this.pauseEl = null;
    this.mapCanvas = null; this.mg = null;

    this.R = RET_MAX; this.dpr = 1;
    this.vw = 1600; this.vh = 900;

    // --- live readout, one object, mutated, never replaced -----------------------
    this.cone = 2.0;        // live spread half-angle, degrees
    this.conePx = 0;
    this.adsT = 0;
    this.dry = false;
    this.inCar = false;
    this.hp = CFG.player.health.max;
    this.hpMax = CFG.player.health.max;     // the body's own maximum; see _readHpMax()
    this.hpShown = CFG.player.health.max;   // lags hp by READOUT_LEAD_S
    this.hpLead = 0;
    this.vigA = 0;
    this.tremor = 0;
    this._trX = 0; this._trY = 0;   // last APPLIED tremor offset, so the string is rare

    // --- pools. Nothing in step() or present() allocates. ------------------------
    this.marks = new Array(MARK_POOL);
    for (let i = 0; i < MARK_POOL; i++) this.marks[i] = { live: false, kind: 'normal', t: 0, seq: 0 };
    this.markSeq = 0;
    this.arcs = new Array(ARC_POOL);
    for (let i = 0; i < ARC_POOL; i++) this.arcs[i] = { live: false, rel: 0, amt: 0, t: 0 };
    this.pulses = new Array(PULSE_POOL);
    for (let i = 0; i < PULSE_POOL; i++) {
      this.pulses[i] = { live: false, t: 0, streak: 0, kind: 'mote', life: PULSE_LIFE };
    }
    // The pieces of the life arc that were just taken. `a` and `b` are FRACTIONS of the arc,
    // not hp, so the ghost stays where the loss happened no matter what regen does after.
    this.ghosts = new Array(GHOST_POOL);
    for (let i = 0; i < GHOST_POOL; i++) this.ghosts[i] = { live: false, a: 0, b: 0, t: 0 };
    // Threat marks. Fixed pool, written in place; `paintRel` is what was last DRAWN, which
    // is how the reticle avoids repainting for a bearing that moved a thousandth of a radian.
    this.threats = new Array(THREAT_POOL);
    for (let i = 0; i < THREAT_POOL; i++) {
      this.threats[i] = { live: false, rel: 0, w: 0, hot: false, paintRel: 99, paintW: -1 };
    }
    this.threatN = 0;

    this._threatPainted = 0;
    // Declared here, not grown on first use: the arc's solved circle, rewritten in place.
    this._geom = { cx: 0, cy: 0, r: 0, span: 0, apexY: 0 };

    this.invuln = 0; this.invulnMax = 1;
    this.restoreT = 99;             // s since the last respawn; >= RESTORE_LIFE is "settled"
    this.lifeH = LIFE_H;
    this._lifeDirty = true;
    this._lifePaintedHp = -1;

    this.paused = false;
    this.pauseBuilt = false;
    // THE CARD FOLLOWS THE ENGINE'S PAUSE, gated on the lock having been held; see _onPaused().
    this._lockHeld = false;    // input:lock true has arrived at least once this page
    this._pausedAtMs = 0;      // performance.now() at the last game:paused true
    this._sinceResume = 0;     // fixed steps since the pause last lifted; see step()
    // The tree's elements, built once in _buildPause() and restated in _refreshTree().
    this.lvEl = null; this.ptsEl = null;
    this.nodeEls = null;       // one { node, btn } per NODES row, in NODES order
    // What the map last drew, as numbers a test can hold: rewritten in place by _drawMap().
    this.mapInfo = {
      drawn: 0, painted: 0, roads: 0, spurs: 0, names: 0, glyphs: 0,
      found: 0, claimed: 0, unfound: 0,
      fires: 0, minors: 0, wilds: 0, car: false, arrowX: -1, arrowY: -1, carX: -1, carY: -1,
    };
    // The travelled wash's own surface, built at the bitmap's resolution and reused. See
    // _washImage(): it is what stops the wash being a string of scalloped discs.
    this._wash = null; this._washG = null; this._washCount = -1;

    this.srT = 0; this.srLast = '';
    this._dirty = true;
    this._lastConePx = -1;
    this._unsub = [];
    this._onResize = null;
    this._t = 0;
  }

  /* ------------------------------------------------------------------- init -- */

  async init() {
    if (!this.enabled) return;

    const style = document.createElement('style');
    style.id = 'curfew-hud-css';
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'curfew-hud';
    // aria-hidden on the painted layers: a canvas of ticks is noise to a screen reader, and
    // the one line that IS for it lives outside this subtree.
    root.setAttribute('aria-hidden', 'true');

    const vig = document.createElement('div');
    vig.id = 'curfew-vig';
    root.appendChild(vig);

    const canvas = document.createElement('canvas');
    canvas.id = 'curfew-ret';
    root.appendChild(canvas);

    const life = document.createElement('canvas');
    life.id = 'curfew-life';
    root.appendChild(life);

    document.body.appendChild(root);

    // The screen-reader line is a SIBLING of the aria-hidden layer, and carries the class
    // tests/progression.mjs skips (/sr-only|visually-hidden/). It is the one place in CURFEW
    // where words are allowed during play, because nobody sees them.
    const sr = document.createElement('div');
    sr.id = 'curfew-sr';
    sr.className = 'sr-only';
    sr.setAttribute('role', 'status');
    sr.setAttribute('aria-live', 'polite');
    sr.textContent = 'Outside. Night.';
    document.body.appendChild(sr);

    this.root = root; this.vig = vig; this.canvas = canvas; this.srEl = sr;
    this.lifeCanvas = life;
    // NOT `desynchronized`: this canvas is only repainted when something moved, and a
    // low-latency surface is allowed to present a frame that was never redrawn.
    this.g = canvas.getContext('2d', { alpha: true });
    this.lg = life.getContext('2d', { alpha: true });

    this._buildPause();
    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    this._wire();
  }

  ready() {
    return !this.enabled
      || !!(this.canvas && this.g && this.lifeCanvas && this.lg && this.root && this.pauseEl
        && this.mapCanvas && this.mg);
  }

  dispose() {
    for (const off of this._unsub) { try { off(); } catch (e) { void e; } }
    this._unsub.length = 0;
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    for (const el of [this.root, this.srEl, this.pauseEl, document.getElementById('curfew-hud-css')]) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
    this.root = this.vig = this.canvas = this.g = this.srEl = this.pauseEl = null;
    this.lifeCanvas = this.lg = null;
    this.mapCanvas = this.mg = null;
  }

  resize() {
    if (!this.canvas) return;
    this.vw = window.innerWidth || 1600;
    this.vh = window.innerHeight || 900;
    this.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    this.R = Math.round(Math.min(RET_MAX, this.vw * 0.86, this.vh * 0.86));
    this.canvas.style.width = this.R + 'px';
    this.canvas.style.height = this.R + 'px';
    this.canvas.width = Math.round(this.R * this.dpr);
    this.canvas.height = Math.round(this.R * this.dpr);
    // Work in CSS pixels inside the canvas; the backing store scale is set once, here.
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._dirty = true;

    if (this.lifeCanvas) {
      // Tall enough to hold the arc's own rise plus the invulnerability arc above it, and
      // never taller than a fifth of the frame — on a short window the arc flattens rather
      // than eating the picture.
      this.lifeH = Math.round(Math.min(LIFE_H, this.vh * 0.20));
      this.lifeCanvas.style.height = this.lifeH + 'px';
      this.lifeCanvas.width = Math.round(this.vw * this.dpr);
      this.lifeCanvas.height = Math.round(this.lifeH * this.dpr);
      this.lg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this._lifeDirty = true;
    }
    // The map's backing store follows the DPR; it is redrawn at the next show, not here.
    if (this.mapCanvas) {
      this.mapCanvas.width = Math.round(MAP_PX * this.dpr);
      this.mapCanvas.height = Math.round(MAP_PX * this.dpr);
      this.mg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (this.paused && this.pauseEl && !this.pauseEl.hidden) this._drawMap();
    }
  }

  /**
   * The one circle both bottom arcs are struck from, in life-canvas CSS pixels. Solved from
   * three points — the two ends and the apex — so the shape is authored as "this wide, this
   * much rise" and the radius falls out, rather than the other way round where a window
   * resize silently changes how curved it is.
   *
   * Writes into a preallocated struct: present() must not allocate.
   */
  _lifeGeom() {
    const G = this._geom;
    const halfW = this.vw * LIFE_HALF;
    // The ENDS sit LIFE_BOTTOM above the viewport floor and the apex rises above them, so
    // the whole figure — including the invulnerability arc riding over the apex — is inside
    // the canvas at any window height. Clamped so a short window flattens the curve rather
    // than pushing it off the top.
    const rise = Math.max(6, Math.min(LIFE_RISE, this.lifeH - LIFE_BOTTOM - 16));
    const r = (halfW * halfW + rise * rise) / (2 * rise);
    G.apexY = this.lifeH - LIFE_BOTTOM - rise;
    G.cx = this.vw * 0.5;
    G.cy = G.apexY + r;          // the centre sits far below the frame; we draw the crown
    G.r = r;
    G.span = Math.asin(clamp(halfW / r, 0, 1));
    return G;
  }

  /* -------------------------------------------------------------------- bus -- */

  _wire() {
    const b = this.ctx.bus;
    const on = (k, fn) => this._unsub.push(b.on(k, (p) => {
      try { fn(p || {}); } catch (e) { console.error('[hud] ' + k, e); }
    }));

    on('weapon:hit', (p) => {
      // Only a HIT ON A THING. Without this every round into a tree pops a marker and the
      // marker stops meaning anything, which is worse than having none.
      if (!p.enemy) return;
      const kind = p.killed ? 'kill' : p.deflected ? 'armoured' : (p.zone === 'head' ? 'weak' : 'normal');
      this._mark(kind);
    });

    on('player:hurt', (p) => this._arc(p));

    on('xp:gained', (p) => {
      if (p.reason !== 'kill') return;   // a road metre does not deserve a flash
      this._pulse('mote', PULSE_LIFE);
    });

    // A node is now yours. progression/progress.js emits this for a purchase AND for an
    // auto-granted tier-0, and both deserve the same mark: the auto-grant is the moment the
    // tree teaches itself, and a lesson nobody can see is not a lesson.
    // No _refreshTree() here: both arrive inside a fixed step (progress.step -> _verb / buy),
    // and the card is hidden during play, so a rewrite then is DOM work inside step() for a
    // surface nobody can see. Every path that SHOWS the card refreshes it (pause(true), a
    // node click).
    on('node:bought', () => { this._pulse('node', GRANT_LIFE); });
    on('level:up', () => { this._pulse('level', LEVEL_LIFE); });

    // NOT `this.hp = 0` any more. Setting it here hid the killing blow from the tracker in
    // step(), so the LAST piece of the arc — the bite that actually killed him, the one he
    // most needs to see the size of — was the only loss that never produced a ghost.
    on('player:died', () => { this._dirty = true; this._lifeDirty = true; });

    // Coming back. The arc snaps full rather than sweeping up to it (a respawn is not a
    // heal, and an arc that fills over half a second reads like one), old ghosts are dropped
    // because they belong to a body that is now dead, and the invulnerability window starts
    // being drawn from its own payload rather than from a constant this file duplicates.
    on('player:respawn', (p) => {
      const max = this._readHpMax();
      this.hp = max; this.hpShown = max; this.hpLead = 0;
      for (let i = 0; i < GHOST_POOL; i++) this.ghosts[i].live = false;
      this.invulnMax = (typeof p.invuln === 'number' && p.invuln > 0) ? p.invuln : this.invulnMax;
      this.invuln = this.invulnMax;
      this.restoreT = 0;
      this._dirty = true; this._lifeDirty = true;
    });
    // THE PAUSE, and the one event the card follows. main.js:387 keys the pause off pointer
    // lock. The payload is a boolean, not a bag, so it does not go through the wrapper above
    // (which would turn false into {}). A canvas click while unlocked ('input:clickthrough')
    // is handled by main.js:588 -> enterGame() -> requestLock(), and the card hides when the
    // lock lands and the pause lifts; this file no longer listens for it.
    this._unsub.push(b.on('game:paused', (v) => this._onPaused(v === true)));
    // The lock itself (engine/input.js _onLockChange, a boolean). The card is armed only once
    // this has been true; see CARD_LATE_MS and _onPaused().
    this._unsub.push(b.on('input:lock', (v) => { if (v === true) this._lockHeld = true; }));
  }

  /* ------------------------------------------------------------------ events -- */

  /** donor: cinderbloom combat.js:1300-1303 — a lesser marker never overwrites a live kill. */
  _mark(kind) {
    let slot = null, oldest = -1;
    for (let i = 0; i < MARK_POOL; i++) {
      const m = this.marks[i];
      if (!m.live) { slot = m; break; }
      if (m.t > oldest) { oldest = m.t; slot = m; }
    }
    // Rank guard: if a higher-ranked marker is still young, let it finish.
    for (let i = 0; i < MARK_POOL; i++) {
      const m = this.marks[i];
      if (m.live && m.t < 0.21 && MARK_RANK[m.kind] > MARK_RANK[kind]) return;
    }
    slot.live = true; slot.kind = kind; slot.t = 0; slot.seq = ++this.markSeq;
    this._dirty = true;
  }

  /**
   * The bearing the hit came FROM, relative to where you are looking.
   * `fromDir` is whatever enemies.js:1098 passed to player.hurt() — a THREE.Vector3 pointing
   * along the blow, i.e. away from the attacker. The source is therefore its negation. The
   * screen-right axis is derived from the aim vector rather than assumed:
   *   forward f = (fx, 0, fz); right = f x up = (-fz, 0, fx), which is +X for the default
   *   camera looking down -Z, so it really is screen right.
   * ASSUMPTION, flagged in HANDOFF P-1: the sign of `fromDir`. If an arc ever points at the
   * thing that hit you instead of away from it, negate `sx`/`sz` here and nothing else moves.
   */
  _arc(p) {
    const d = p.fromDir;
    if (!d || !Number.isFinite(d.x)) return;
    const cam = this.ctx.systems.get('camera');
    if (!cam) return;
    let fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);      // camera.js:149 aimDir, flat
    const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
    let sx = -d.x, sz = -d.z;
    const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
    const rel = Math.atan2(-sx * fz + sz * fx, sx * fx + sz * fz);

    let slot = null, oldest = -1;
    for (let i = 0; i < ARC_POOL; i++) {
      const a = this.arcs[i];
      if (!a.live) { slot = a; break; }
      if (a.t > oldest) { oldest = a.t; slot = a; }
    }
    slot.live = true; slot.rel = rel; slot.amt = clamp((p.amount || 10) / 30, 0.35, 1.6); slot.t = 0;
    this._dirty = true;
  }

  /**
   * One pool, three shapes. A grant must never be evicted by the mote storm a shotgun into a
   * pack throws, so a live 'node'/'level' ring is only ever recycled by another one of its
   * own kind — the same rank idea as MARK_RANK, one pool down.
   */
  _pulse(kind, life) {
    const k = kind || 'mote';
    const big = k !== 'mote';
    let slot = null, oldest = -1;
    for (let i = 0; i < PULSE_POOL; i++) {
      const q = this.pulses[i];
      if (!q.live) { slot = q; break; }
      if (!big && q.kind !== 'mote') continue;         // never steal a grant for a mote
      if (q.t > oldest) { oldest = q.t; slot = q; }
    }
    if (!slot) return;                                  // all five are grants: let them finish
    const prog = this.ctx.systems.get('progress');
    slot.live = true; slot.t = 0; slot.kind = k;
    slot.life = life || PULSE_LIFE;
    slot.streak = (!big && prog) ? prog.streak : 0;
    this._dirty = true;
  }

  /**
   * A piece of the life arc was just taken. Recorded in FRACTIONS of the arc, not in hp, so
   * the ghost stays exactly where the loss happened no matter what regen does afterwards —
   * and so its LENGTH on screen is the size of the bite, which is the whole question Alex
   * could not answer: "things are killing me quickly no matter where i run", with no way to
   * tell a 22-point hound from a graze.
   */
  _loss(a, b) {
    if (!(b > a)) return;
    let slot = null, oldest = -1;
    for (let i = 0; i < GHOST_POOL; i++) {
      const q = this.ghosts[i];
      if (!q.live) { slot = q; break; }
      if (q.t > oldest) { oldest = q.t; slot = q; }
    }
    slot.live = true; slot.a = a; slot.b = b; slot.t = 0;
    this._lifeDirty = true;
  }

  /* ------------------------------------------------------------------- pause -- */

  _buildPause() {
    const el = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text !== undefined) e.textContent = text;
      return e;
    };

    const card = el('div', '');
    card.id = 'curfew-pause';
    card.hidden = true;

    const wrap = el('div', 'card');
    wrap.appendChild(el('div', 'rule'));

    // THE MAP AND THE TREE, one block, and the block swallows the press: a click on the map
    // or on a node (what anyone does to a skill tree) must not throw the player back under
    // the lock. Only the overlay, the controls and the foot line resume.
    const top = el('div', 'top');
    top.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); });

    const map = el('canvas', 'map');
    map.id = 'curfew-map';
    map.width = MAP_PX; map.height = MAP_PX;
    top.appendChild(map);
    this.mapCanvas = map;
    this.mg = map.getContext('2d', { alpha: false });

    // THE TREE. Built once: a level line, then one row per branch holding one button per
    // tier. The name, the cost and the line are written here and never again; _refreshTree()
    // restates only each button's STATE, so the shape of the whole tree is on the card from
    // level 1 and a level-1 player can read what every tier will buy.
    const tree = el('div', 'tree');
    const lvl = el('div', 'lvl');
    this.lvEl = el('span', '', 'Level 1');
    // The points span carries its own separator so the line READS as one sentence in
    // textContent too ("Level 10 · 2 points", not "Level 102 points").
    this.ptsEl = el('span', 'pts', '');
    lvl.appendChild(this.lvEl); lvl.appendChild(this.ptsEl);
    tree.appendChild(lvl);

    this.nodeEls = [];
    for (let b = 0; b < BRANCHES.length; b++) {
      const br = BRANCHES[b];
      const row = el('div', 'br');
      row.appendChild(el('div', 'bn', br.name));
      const nodes = [];
      for (let i = 0; i < NODES.length; i++) if (NODES[i].branch === br.id) nodes.push(NODES[i]);
      nodes.sort((p, q) => p.tier - q.tier);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const btn = el('button', 'nd lock');
        btn.type = 'button';
        btn.dataset.node = n.id;
        const name = el('span', 'cn', n.name);
        name.appendChild(el('span', 'cc', n.cost === 1 ? 'one point' : n.cost + ' points'));
        btn.appendChild(name);
        btn.appendChild(el('span', 'cl', n.line));
        // The click buys, when it can; the press never resumes (the block above stops it).
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); e.preventDefault();
          const prog = this.ctx.systems.get('progress');
          if (prog && typeof prog.buy === 'function' && typeof prog.canBuy === 'function'
            && prog.canBuy(n.id)) prog.buy(n.id);
          this._refreshTree();
        });
        row.appendChild(btn);
        this.nodeEls.push({ node: n, btn });
      }
      tree.appendChild(row);
    }
    top.appendChild(tree);
    wrap.appendChild(top);

    wrap.appendChild(el('div', 'rule mid'));

    const dl = el('dl', '');
    for (const [what, how] of CONTROLS) {
      const pair = el('div', 'pair');
      pair.appendChild(el('dt', '', what));
      pair.appendChild(el('dd', '', how));
      dl.appendChild(pair);
    }
    wrap.appendChild(dl);

    wrap.appendChild(el('div', 'foot', 'click to go back out'));

    card.appendChild(wrap);
    card.addEventListener('mousedown', (e) => { e.preventDefault(); this._resume(); });
    document.body.appendChild(card);
    this.pauseEl = card;
    this.pauseBuilt = true;
  }

  /**
   * ONE ESCAPE = ONE STATE.
   *
   * ALEX, fourth playtest: "the pause button does pause the game. but it is jenky. there are
   * like multiple levels of pause screen so its hard to get out of."
   *
   * MEASURED before this rewrite (docs/ROUND-5/B-pause-tree.md): the browser drops pointer
   * lock on Escape and main.js:387 pauses the sim on the lost lock; this card used to toggle
   * on ITS OWN key read in step() — which does not run while the sim is paused. So one press
   * gave a frozen world with a cursor and no card, a second sometimes gave the card, and one
   * Escape/click cycle left the page with paused=false and the card VISIBLE over a running
   * game. Two states, two owners.
   *
   * Now there is one owner. The card follows game:paused and nothing else: no key shows it,
   * no key hides it. A menu press that reaches step() while locked exits pointer lock and
   * does nothing more — losing the lock IS the pause. The only way out is a click: card
   * mousedown -> _resume() -> input.requestLock() -> lock acquired -> main.js unpauses ->
   * game:paused false -> the card hides. The card never hides itself.
   *
   * IT NEVER SHOWS AT ENTRY. Entering the game emits game:paused true on frame N (playing,
   * lock requested, not yet held) and false when the lock lands — one frame later headless,
   * three with a 40 ms lock (verification round 1). A card that flipped on the event, or
   * after a counted number of frames, flashed over the fading title whenever the lock took
   * longer than the count. So the card is armed only once the lock has been HELD on this
   * page (input:lock true, engine/input.js:234): an entry pause is a pause before the first
   * lock and shows nothing; an Escape pause is a pause after it and shows at the very next
   * present(). The one exception is a lock that never lands (Chrome refused it): after
   * CARD_LATE_MS of wall time the pause is real whatever the lock did, and the card shows so
   * the player has a way out. The pointerlockchange event cannot fire inside a synchronous
   * frame() call, so _lockHeld cannot flip between main.js's pause check and this present.
   *
   * Never on a page that never took lock: ?test=1 and __CURFEW.noLock never emit
   * game:paused (main.js:387), so a headless suite never sits on a card full of words.
   */
  _onPaused(on) {
    if (on) {
      this.paused = true;
      this._pausedAtMs = performance.now();
    } else {
      this._sinceResume = 0;
      this.pause(false);
    }
    this._dirty = true;
  }

  /**
   * Show or hide the card. Asks for nothing; the lock is requested by _resume() only.
   * THE SHOW IS THE REBUILD: the tree is restated and the map is drawn on the transition
   * from hidden to shown, and nowhere per step (round 5's rule). The sim is stopped by the
   * time this runs, so what is drawn is what is true.
   */
  pause(on) {
    const v = !!on;
    this.paused = v;
    // Written only on a change: a MutationObserver on the attribute is how the gate counts
    // the card's transitions, and a same-value write would still make a record.
    if (this.pauseEl && this.pauseEl.hidden !== !v) {
      this.pauseEl.hidden = !v;
      if (v) { this._refreshTree(); this._drawMap(); }
    }
    this._dirty = true;
  }

  isPaused() { return this.paused; }

  /** The click on the card. Ask for the lock; main.js lifts the pause when it lands. */
  _resume() {
    if (this.ctx.input && this.ctx.input.requestLock) this.ctx.input.requestLock();
  }

  /**
   * THE TREE'S SURFACE. Restates the level line and the state of every node button into
   * elements built once. Runs when the card shows and after a click — never per frame — so
   * the few strings it makes are made a few times a pause.
   */
  _refreshTree() {
    const prog = this.ctx.systems.get('progress');
    if (!prog || !this.lvEl || !this.nodeEls) return;
    const owned = typeof prog.ownedSet === 'function' ? prog.ownedSet() : null;
    const level = typeof prog.level === 'number' ? prog.level : 1;
    const points = typeof prog.points === 'number' ? prog.points : 0;
    this.lvEl.textContent = 'Level ' + level;
    this.ptsEl.textContent = points <= 0 ? '' : ' · ' + (points === 1 ? 'one point' : points + ' points');
    for (let i = 0; i < this.nodeEls.length; i++) {
      const { node: n, btn } = this.nodeEls[i];
      const own = !!(owned && owned.has(n.id));
      let cls;
      if (own) cls = 'nd own';
      else if (typeof prog.canBuy === 'function' && prog.canBuy(n.id)) cls = 'nd can';
      else {
        // Not affordable. Is it the points, or the tier below? A locked tier is faint, a
        // merely expensive one is half, so a player at level 1 can still see the path.
        let pre = null;
        for (let k = 0; k < NODES.length; k++) {
          const m = NODES[k];
          if (m.branch === n.branch && m.tier === n.tier - 1) { pre = m; break; }
        }
        const open = n.tier === 0 || !!(pre && owned && owned.has(pre.id));
        cls = open ? 'nd poor' : 'nd lock';
      }
      if (btn.className !== cls) btn.className = cls;
    }
  }

  /* --------------------------------------------------------------- the map -- */

  /* ------------------------------------------------------- the map's drawing kit -- */

  /**
   * THE TRAVELLED WASH, composited once at the bitmap's own resolution.
   *
   * NEXT.md B9: "the travelled wash draws as scalloped discs." It did — one 0.10-alpha arc
   * per visited cell, so two neighbouring cells overlapped into a bright lens and the gaps
   * between them stayed dark. The eye read the drawing method, not the walk.
   *
   * Here every set cell is written opaque into a 64 x 64 image and every cell TOUCHING one is
   * written at MAP_WASH_HALO, and the whole image is drawn up to the map with smoothing on.
   * The 6.9x bilinear magnification IS the softness, and because it is one image, alpha can
   * never accumulate: a lone cell is a soft blot, a walked road is one continuous band with a
   * feathered edge, and the cost is one drawImage instead of up to 4096 arcs.
   *
   * The canvas is kept and reused; the ImageData is rebuilt only when the bitmap has changed,
   * which for a paused card is at most once a pause.
   */
  _washImage(grid) {
    if (typeof document === 'undefined') return null;
    const n = grid.n | 0;
    if (n <= 0) return null;
    if (!this._wash || this._wash.width !== n) {
      this._wash = document.createElement('canvas');
      this._wash.width = n; this._wash.height = n;
      this._washG = this._wash.getContext('2d', { alpha: true, willReadFrequently: true });
      this._washCount = -1;
    }
    if (!this._washG) return null;
    // The count is the whole state of the bitmap for this purpose: cells are only ever SET.
    if (this._washCount === grid.count) return this._wash;
    this._washCount = grid.count;
    const img = this._washG.createImageData(n, n);
    const d = img.data, cells = grid.cells;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let a = 0;
        if (cells[y * n + x]) a = 255;
        else {
          for (let dy = -1; dy <= 1 && !a; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const yy = y + dy, xx = x + dx;
              if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
              if (cells[yy * n + xx]) { a = MAP_WASH_HALO; break; }
            }
          }
        }
        const i = (y * n + x) * 4;
        d[i] = 232; d[i + 1] = 238; d[i + 2] = 248; d[i + 3] = a;   // INK; ImageData is straight, not premultiplied
      }
    }
    this._washG.putImageData(img, 0, 0);
    return this._wash;
  }

  /** A four-ray spark: a fire he has stood at. Shape, never hue. */
  _spark(g, x, y, r, a) {
    g.globalAlpha = a * 0.55; g.strokeStyle = SHADE; g.lineWidth = 2.6;
    for (let p = 0; p < 2; p++) {
      if (p === 1) { g.globalAlpha = a; g.strokeStyle = INK; g.lineWidth = 1; }
      g.beginPath();
      g.moveTo(x - r, y); g.lineTo(x + r, y);
      g.moveTo(x, y - r); g.lineTo(x, y + r);
      const q = r * 0.52;
      g.moveTo(x - q, y - q); g.lineTo(x + q, y + q);
      g.moveTo(x + q, y - q); g.lineTo(x - q, y + q);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  /**
   * A DESTINATION'S OWN SILHOUETTE, in a 2s x 2s box centred on (x, y), standing on y + s.
   *
   * ALEX asked for the map to be "organized or have flow", and the destinations cannot move —
   * the roads are baked around them. So what the map can do is make each of the twelve READ
   * as the thing it is, from across the card, with no legend and no word: a lighthouse is a
   * tapered tower throwing two rays, a graveyard is three headstones, a barn is a gambrel
   * roof. Twelve shapes, one per `kind` in placedata.js. An unknown kind falls back to a ring,
   * so a new destination row draws SOMETHING rather than nothing.
   *
   * Stroke only, current strokeStyle and lineWidth: the caller draws it twice, dark then ink,
   * which is what keeps it readable standing on a road or on the travelled wash.
   */
  _glyph(g, kind, x, y, s) {
    const b = y + s;                         // the ground line
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath();
    switch (kind) {
      case 'station':                        // a canopy on two posts, and a pump under it
        g.moveTo(x - s, y - s * 0.55); g.lineTo(x + s, y - s * 0.55);
        g.moveTo(x - s * 0.72, y - s * 0.55); g.lineTo(x - s * 0.72, b);
        g.moveTo(x + s * 0.72, y - s * 0.55); g.lineTo(x + s * 0.72, b);
        g.moveTo(x - s * 0.26, b); g.lineTo(x - s * 0.26, y + s * 0.10);
        g.lineTo(x + s * 0.26, y + s * 0.10); g.lineTo(x + s * 0.26, b);
        break;
      case 'manor':                          // a wide house, a steep roof, a chimney
        g.moveTo(x - s, y); g.lineTo(x, y - s * 0.92); g.lineTo(x + s, y);
        g.moveTo(x - s * 0.82, y); g.lineTo(x - s * 0.82, b); g.lineTo(x + s * 0.82, b);
        g.lineTo(x + s * 0.82, y);
        g.moveTo(x + s * 0.34, y - s * 0.50); g.lineTo(x + s * 0.34, y - s * 1.15);
        g.lineTo(x + s * 0.58, y - s * 1.15); g.lineTo(x + s * 0.58, y - s * 0.26);
        break;
      case 'works':                          // a headframe: an A over a winding wheel
        g.moveTo(x - s, b); g.lineTo(x, y - s); g.lineTo(x + s, b);
        g.moveTo(x - s * 0.52, y + s * 0.12); g.lineTo(x + s * 0.52, y + s * 0.12);
        g.moveTo(x + s * 0.26, y - s * 0.62); g.arc(x, y - s * 0.62, s * 0.26, 0, TAU);
        break;
      case 'relay':                          // a lattice mast with two stays
        g.moveTo(x - s * 0.52, b); g.lineTo(x, y - s); g.lineTo(x + s * 0.52, b);
        g.moveTo(x - s * 0.34, y + s * 0.22); g.lineTo(x + s * 0.34, y + s * 0.22);
        g.moveTo(x - s * 0.18, y - s * 0.38); g.lineTo(x + s * 0.18, y - s * 0.38);
        g.moveTo(x - s * 0.34, y - s * 1.05); g.lineTo(x + s * 0.34, y - s * 1.05);
        break;
      case 'cathedral':                      // a wide gable, a rose window, a tall spire
        g.moveTo(x - s, b); g.lineTo(x - s, y + s * 0.10);
        g.lineTo(x, y - s * 0.34); g.lineTo(x + s, y + s * 0.10); g.lineTo(x + s, b);
        g.moveTo(x + s * 0.30, y + s * 0.36); g.arc(x, y + s * 0.36, s * 0.30, 0, TAU);
        g.moveTo(x, y - s * 0.34); g.lineTo(x, y - s * 1.10);
        g.moveTo(x - s * 0.30, y - s * 0.82); g.lineTo(x + s * 0.30, y - s * 0.82);
        break;
      case 'chapel':                         // one small gable and one small spire
        g.moveTo(x - s * 0.66, b); g.lineTo(x - s * 0.66, y + s * 0.24);
        g.lineTo(x, y - s * 0.20); g.lineTo(x + s * 0.66, y + s * 0.24); g.lineTo(x + s * 0.66, b);
        g.moveTo(x, y - s * 0.20); g.lineTo(x, y - s * 0.86);
        break;
      case 'steeple':                        // a spire standing in water
        g.moveTo(x - s * 0.40, y + s * 0.30); g.lineTo(x, y - s); g.lineTo(x + s * 0.40, y + s * 0.30);
        g.moveTo(x - s, y + s * 0.46); g.lineTo(x + s, y + s * 0.46);
        g.moveTo(x - s * 0.80, y + s * 0.86); g.lineTo(x + s * 0.80, y + s * 0.86);
        break;
      case 'lighthouse':                     // a tapered tower, a lamp, two rays
        g.moveTo(x - s * 0.46, b); g.lineTo(x - s * 0.24, y - s * 0.32);
        g.lineTo(x + s * 0.24, y - s * 0.32); g.lineTo(x + s * 0.46, b);
        g.moveTo(x - s * 0.28, y - s * 0.32); g.lineTo(x - s * 0.28, y - s * 0.70);
        g.lineTo(x + s * 0.28, y - s * 0.70); g.lineTo(x + s * 0.28, y - s * 0.32);
        g.moveTo(x - s, y - s * 0.98); g.lineTo(x - s * 0.44, y - s * 0.60);
        g.moveTo(x + s, y - s * 0.98); g.lineTo(x + s * 0.44, y - s * 0.60);
        break;
      case 'mill':                           // a tower under a four-blade cross
        g.moveTo(x - s * 0.44, b); g.lineTo(x - s * 0.26, y - s * 0.20);
        g.lineTo(x + s * 0.26, y - s * 0.20); g.lineTo(x + s * 0.44, b);
        g.moveTo(x - s * 0.78, y - s * 1.02); g.lineTo(x + s * 0.78, y - s * 0.30);
        g.moveTo(x + s * 0.78, y - s * 1.02); g.lineTo(x - s * 0.78, y - s * 0.30);
        break;
      case 'cemetery':                       // three headstones on a ground line
        g.moveTo(x - s, b); g.lineTo(x + s, b);
        for (let k = -1; k <= 1; k++) {
          const hx = x + k * s * 0.60, top = y + (k === 0 ? -s * 0.42 : -s * 0.06);
          g.moveTo(hx - s * 0.22, b); g.lineTo(hx - s * 0.22, top);
          g.arc(hx, top, s * 0.22, Math.PI, 0);
          g.lineTo(hx + s * 0.22, b);
        }
        break;
      case 'tower':                          // a square bell tower with a pitched cap
        g.moveTo(x - s * 0.46, b); g.lineTo(x - s * 0.46, y - s * 0.34);
        g.lineTo(x + s * 0.46, y - s * 0.34); g.lineTo(x + s * 0.46, b);
        g.moveTo(x - s * 0.68, y - s * 0.34); g.lineTo(x, y - s); g.lineTo(x + s * 0.68, y - s * 0.34);
        g.moveTo(x - s * 0.22, y + s * 0.18); g.arc(x, y + s * 0.18, s * 0.22, Math.PI, 0);
        break;
      case 'barn':                           // a gambrel roof, and the door under it
        g.moveTo(x - s, b); g.lineTo(x - s, y + s * 0.06);
        g.lineTo(x - s * 0.56, y - s * 0.48); g.lineTo(x, y - s * 0.86);
        g.lineTo(x + s * 0.56, y - s * 0.48); g.lineTo(x + s, y + s * 0.06); g.lineTo(x + s, b);
        g.moveTo(x - s * 0.26, b); g.lineTo(x - s * 0.26, y + s * 0.36);
        g.lineTo(x + s * 0.26, y + s * 0.36); g.lineTo(x + s * 0.26, b);
        break;
      default:                               // a kind this file has never heard of
        g.moveTo(x + s * 0.6, y); g.arc(x, y, s * 0.6, 0, TAU);
        break;
    }
    g.stroke();
  }

  /**
   * The paper map. Drawn from live state each time the card shows; allocates freely,
   * because it runs a few times a session and never on a frame. Every sibling is read
   * lazily and guarded: a lane that has not shipped its half (wilds, a campfire list)
   * draws nothing rather than throwing, and `mapInfo` says what was actually drawn.
   */
  _drawMap() {
    const g = this.mg, c = this.mapCanvas;
    const I = this.mapInfo;
    if (!g || !c) return;
    const S = MAP_PX;
    const size = (this.ctx.cfg && this.ctx.cfg.world && this.ctx.cfg.world.SIZE) || CFG.world.SIZE;
    const half = size * 0.5;
    // North is -Z (the camera at yaw 0 looks down -Z), so -Z goes UP the page.
    const px = (x) => (x + half) / size * S;
    const pz = (z) => (z + half) / size * S;
    const sys = this.ctx.systems;
    const prog = sys.get('progress');
    const places = sys.get('places');
    const roads = sys.get('roads');
    const player = sys.get('player');
    const cam = sys.get('camera');
    const car = sys.get('car');
    const wilds = sys.get('wilds');

    I.painted = 0; I.roads = 0; I.spurs = 0; I.names = 0; I.glyphs = 0;
    I.found = 0; I.claimed = 0; I.unfound = 0;
    I.fires = 0; I.minors = 0; I.wilds = 0;
    I.car = false; I.arrowX = -1; I.arrowY = -1; I.carX = -1; I.carY = -1;

    /* 0. the paper ----------------------------------------------------------- */
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = MAP_GROUND;
    g.fillRect(0, 0, S, S);

    /* 1. where he has been — the wash ---------------------------------------- */
    // ONE composited image, not one arc per cell. See MAP_WASH_A. `painted` stays the count
    // of SET cells, because tests/pause.mjs holds it against progress's own visited count.
    const grid = prog && typeof prog.visitedGrid === 'function' ? prog.visitedGrid() : null;
    if (grid && grid.cells && grid.n > 0) {
      const wash = this._washImage(grid);
      if (wash) {
        const sm = g.imageSmoothingEnabled;
        g.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
        g.globalAlpha = MAP_WASH_A;
        g.drawImage(wash, 0, 0, S, S);
        g.globalAlpha = 1;
        g.imageSmoothingEnabled = sm;
      }
      I.painted = grid.count | 0;
    }

    /* 2. the roads — the loop, and the two spurs off it ---------------------- */
    // routePolylines(), not routes(): roads.js's constructor owns `this.routes` as a table.
    // That table is exactly where the KIND lives, though, and the kind is what makes the map
    // legible: one asphalt loop that goes everywhere, and two gravel spurs that end. Drawn
    // differently — the loop solid with a soft casing under it, a spur thin and dashed — so
    // "which way is the way round" is answered before you have read a single name.
    const routes = roads && typeof roads.routePolylines === 'function' ? roads.routePolylines() : null;
    const meta = roads && Array.isArray(roads.routes) ? roads.routes : null;
    if (Array.isArray(routes)) {
      g.lineJoin = 'round'; g.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        for (let r = 0; r < routes.length; r++) {
          const pl = routes[r];
          if (!Array.isArray(pl) || pl.length < 2) continue;
          const kind = meta && meta[r] && meta[r].kind ? meta[r].kind : (r === 0 ? 'asphalt' : 'gravel');
          const loop = kind === 'asphalt';
          if (pass === 0 && !loop) continue;            // the casing is the loop's alone
          g.strokeStyle = INK;
          g.setLineDash(pass === 1 && !loop ? [3.5, 3.0] : []);
          g.globalAlpha = pass === 0 ? MAP_CASING_A : (loop ? MAP_LOOP_A : MAP_SPUR_A);
          g.lineWidth = pass === 0 ? MAP_LOOP_W * 3.2 : (loop ? MAP_LOOP_W : MAP_SPUR_W);
          g.beginPath();
          g.moveTo(px(pl[0].x), pz(pl[0].z));
          for (let i = 1; i < pl.length; i++) g.lineTo(px(pl[i].x), pz(pl[i].z));
          g.stroke();
          if (pass === 1) { I.roads++; if (!loop) I.spurs++; }
        }
      }
      g.setLineDash([]);
      g.globalAlpha = 1;
    }

    /* 3. the small places along the roads he has actually stood at ------------ */
    // A campfire he has warmed himself at (progress.firesFound, ids), and — round 7 — every
    // OTHER minor site he has been within thirty metres of (progress.minorsMet, indices into
    // places' own table). Together they are the reason the county map reads as a route
    // somebody walked rather than twelve dots in a black square.
    //
    // The campfire id: places.campfires() renames `fireId` to `id` on the way out, and round
    // 6 read `f.fireId` off the public copy — undefined for every fire, so this layer drew
    // NOTHING for a whole round. Measured 2026-09-03: fires 0 with three fires in the save.
    const fires = prog && typeof prog.firesFound === 'function' ? prog.firesFound() : null;
    const fireList = places
      ? (typeof places.campfires === 'function' ? places.campfires()
        : (Array.isArray(places._campfires) ? places._campfires : null))
      : null;
    const fireAt = Object.create(null);
    if (fires && fires.size > 0 && Array.isArray(fireList)) {
      for (let i = 0; i < fireList.length; i++) {
        const f = fireList[i];
        const id = f && (f.id !== undefined ? f.id : f.fireId);
        if (id === undefined || !fires.has(id)) continue;
        fireAt[Math.round(f.x) + '|' + Math.round(f.z)] = 1;
        this._spark(g, px(f.x), pz(f.z), 3.4, 0.78);
        I.fires++;
      }
    }
    const met = prog && typeof prog.minorsMet === 'function' ? prog.minorsMet() : null;
    const minorList = places
      ? (typeof places.minorList === 'function' ? places.minorList()
        : (Array.isArray(places.minors) ? places.minors : null))
      : null;
    if (met && met.size > 0 && Array.isArray(minorList)) {
      g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 1;
      for (let i = 0; i < minorList.length; i++) {
        const m = minorList[i];
        if (!m || !Number.isFinite(m.x)) continue;
        const idx = Number.isInteger(m.i) ? m.i : i;
        if (!met.has(idx)) continue;
        // A fire already drew itself as a spark above; do not stack a dot on it.
        if (fireAt[Math.round(m.x) + '|' + Math.round(m.z)]) { I.minors++; continue; }
        const k = MINOR_BY_ID[m.kind];
        const x = px(m.x), y = pz(m.z);
        if (k && k.lit) { this._spark(g, x, y, 3.0, 0.62); }
        else if (k && k.bulk >= 3.0) {
          // A place big enough to stand in — a staged scene, an orchard, a roadblock.
          g.globalAlpha = MAP_MINOR_A;
          g.beginPath(); g.arc(x, y, 2.3, 0, TAU); g.stroke();
        } else {
          g.globalAlpha = MAP_MINOR_A;
          g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill();
        }
        I.minors++;
      }
      g.globalAlpha = 1;
    }

    /* 4. the wilds he has found (lane F) ------------------------------------- */
    const wl = wilds && typeof wilds.list === 'function' ? wilds.list() : null;
    if (Array.isArray(wl)) {
      g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 1;
      for (let i = 0; i < wl.length; i++) {
        const w = wl[i];
        if (!w || !w.found || !Number.isFinite(w.x) || !Number.isFinite(w.z)) continue;
        const x = px(w.x), y = pz(w.z);
        g.globalAlpha = w.climbed ? 0.85 : 0.55;
        // A small square: climbed is filled, found is hollow. Shape, never hue.
        if (w.climbed) g.fillRect(x - 2.5, y - 2.5, 5, 5);
        else g.strokeRect(x - 2.5, y - 2.5, 5, 5);
        I.wilds++;
      }
      g.globalAlpha = 1;
    }

    /* 5. the twelve destinations, three states ------------------------------- */
    // ALEX, original brief item 21: "the map has to be organized or have flow." The roads are
    // baked and the destinations cannot move, so the MAP does the organising:
    //   not found  a small hollow diamond and nothing else. Something is there. Go and see.
    //   found      the place's OWN SILHOUETTE, in ink, and its name. A lighthouse looks like a
    //              lighthouse, a barn like a barn, a graveyard like three headstones — so
    //              "what is over there" is answered by the shape, with no legend to read.
    //   claimed    the same silhouette in the region's tint, on a soft disc of it: the colour
    //              the place put in the sky when you took it. It also STOPS being the
    //              brightest thing on the map, so the unclaimed ones are what the eye goes
    //              to. That is the flow — the bright shapes are the ones still waiting.
    const foundSet = places && places.found && typeof places.found.has === 'function' ? places.found
      : (prog && prog.found && typeof prog.found.has === 'function' ? prog.found : null);
    const claimedA = places && places.claimed && typeof places.claimed.has === 'function' ? places.claimed : null;
    const claimedB = prog && prog.claimed && typeof prog.claimed.has === 'function' ? prog.claimed : null;
    g.font = MAP_NAME_FONT;
    g.textBaseline = 'middle';
    for (let i = 0; i < MAJORS.length; i++) {
      const d = MAJORS[i];
      const x = px(d.x), y = pz(d.z);
      const claimed = !!((claimedA && claimedA.has(d.id)) || (claimedB && claimedB.has(d.id)));
      const found = claimed || !!(foundSet && foundSet.has(d.id));
      const tint = hex6(REGION_TINT[d.region] || DEFAULT_TINT);
      if (!found) {
        // A hollow diamond, not a dot: at this size a filled dot is indistinguishable from a
        // minor site he has met, and the two must never be confused.
        g.globalAlpha = MAP_UNFOUND_A; g.strokeStyle = INK; g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y - 3.1); g.lineTo(x + 3.1, y); g.lineTo(x, y + 3.1); g.lineTo(x - 3.1, y);
        g.closePath(); g.stroke();
        I.unfound++;
        continue;
      }
      if (claimed) {
        g.globalAlpha = 0.26; g.fillStyle = tint;
        g.beginPath(); g.arc(x, y, MAP_GLYPH + 3.4, 0, TAU); g.fill();
        I.claimed++;
      } else {
        I.found++;
      }
      // A dark backing pass under every silhouette, so it survives standing on the wash or on
      // a road. Value, then ink: the same three-pass rule the reticle is drawn by.
      g.globalAlpha = 0.75; g.strokeStyle = SHADE; g.lineWidth = 3.0;
      this._glyph(g, d.kind, x, y, MAP_GLYPH);
      g.globalAlpha = claimed ? 0.92 : 1;
      g.strokeStyle = claimed ? tint : INK;
      g.lineWidth = 1.15;
      this._glyph(g, d.kind, x, y, MAP_GLYPH);
      I.glyphs++;
      // A claimed place has a light burning in it, and the mark says so: a solid dot of the
      // region's tint at the middle of its own silhouette. It is also what makes "claimed"
      // measurable on ONE pixel — the halo alone reads as a wash and a test sampling the
      // centre could not tell the tint from the ink.
      if (claimed) {
        g.globalAlpha = 0.96; g.fillStyle = tint;
        g.beginPath(); g.arc(x, y, 2.1, 0, TAU); g.fill();
      }
      // The name, once found. To the right unless that runs off the paper.
      g.globalAlpha = claimed ? 0.86 : MAP_FOUND_A;
      g.fillStyle = claimed ? tint : INK;
      const left = x > S - MAP_NAME_FLIP;
      g.textAlign = left ? 'right' : 'left';
      const nx = left ? x - MAP_GLYPH - MAP_NAME_DX : x + MAP_GLYPH + MAP_NAME_DX;
      g.fillText(d.name, nx, y);
      I.names++;
    }
    g.globalAlpha = 1;

    /* 6. the car ------------------------------------------------------------- */
    if (car && car.exists && Number.isFinite(car.x) && Number.isFinite(car.z)) {
      const x = px(car.x), y = pz(car.z);
      const h = Number.isFinite(car.heading) ? car.heading : 0;
      g.save();
      g.translate(x, y);
      // The car's forward is (-sin h, -cos h) in world x/z (camera convention), which on
      // the page is (-sin h, -cos h) too, since z goes down the page.
      g.rotate(Math.atan2(-Math.cos(h), -Math.sin(h)));
      g.globalAlpha = 0.85; g.strokeStyle = SHADE; g.lineWidth = 3;
      g.strokeRect(-MAP_CAR_L * 0.5, -MAP_CAR_W * 0.5, MAP_CAR_L, MAP_CAR_W);
      g.strokeStyle = INK; g.lineWidth = 1.2;
      g.strokeRect(-MAP_CAR_L * 0.5, -MAP_CAR_W * 0.5, MAP_CAR_L, MAP_CAR_W);
      g.restore();
      I.car = true; I.carX = +x.toFixed(1); I.carY = +y.toFixed(1);
    }

    /* 7. him ------------------------------------------------------------------ */
    if (player && player.pos) {
      const x = px(player.pos.x), y = pz(player.pos.z);
      const yaw = cam && typeof cam.yaw === 'number' ? cam.yaw : (typeof player.yaw === 'number' ? player.yaw : 0);
      // Forward is (-sin yaw, -cos yaw) in world x/z; on the page that is the same vector.
      const fx = -Math.sin(yaw), fy = -Math.cos(yaw);
      const L = MAP_ARROW, W = MAP_ARROW * 0.42;
      const tipX = x + fx * L * 0.62, tipY = y + fy * L * 0.62;
      const bx = x - fx * L * 0.38, by = y - fy * L * 0.38;
      const rx = -fy, ry = fx;
      for (let pass = 0; pass < 2; pass++) {
        g.globalAlpha = pass === 0 ? 0.7 : 1;
        g.strokeStyle = pass === 0 ? SHADE : INK;
        g.fillStyle = pass === 0 ? SHADE : INK;
        g.lineWidth = pass === 0 ? 4 : 1;
        g.lineJoin = 'round';
        g.beginPath();
        g.moveTo(tipX, tipY);
        g.lineTo(bx + rx * W, by + ry * W);
        g.lineTo(x - fx * L * 0.12, y - fy * L * 0.12);
        g.lineTo(bx - rx * W, by - ry * W);
        g.closePath();
        if (pass === 0) g.stroke(); else g.fill();
      }
      I.arrowX = +x.toFixed(1); I.arrowY = +y.toFixed(1);
    }

    /* 8. the edge ------------------------------------------------------------- */
    g.globalAlpha = 1;
    g.strokeStyle = MAP_EDGE; g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, S - 1, S - 1);
    I.drawn++;
  }

  /* -------------------------------------------------------------------- loop -- */

  /**
   * The body's own maximum. player.hpMax when the body exposes it (lane E), CFG's number
   * otherwise, and never less than the hp actually held — the arc must never draw a
   * fraction the body does not have. A Map lookup and two reads; no allocation.
   */
  _readHpMax() {
    const player = this.ctx.systems.get('player');
    let m = CFG.player.health.max;
    if (player && typeof player.hpMax === 'number' && player.hpMax > 0) m = player.hpMax;
    if (player && typeof player.hp === 'number' && player.hp > m) m = player.hp;
    return m;
  }

  step(dt) {
    this._t += dt;
    const inp = this.ctx.input;
    this._sinceResume++;
    // A menu press that reaches the sim while locked. Chrome normally eats Escape and drops
    // the lock itself; if the key gets here, do the same thing and NOTHING else. The lost
    // lock is the pause and the card follows the pause. No key ever hides the card.
    // Ignored for MENU_ARM_STEPS after a resume: a press made while paused arrives here as a
    // stale edge on the first step back and would re-pause the game (see the constant).
    if (this._sinceResume > MENU_ARM_STEPS && inp && inp.pressed && inp.pressed('menu')
      && !this.paused && document.pointerLockElement && document.exitPointerLock) {
      document.exitPointerLock();
    }

    for (let i = 0; i < MARK_POOL; i++) {
      const m = this.marks[i];
      if (!m.live) continue;
      m.t += dt;
      if (m.t > (MARK_LIFE[m.kind] || 0.21)) m.live = false;
      this._dirty = true;
    }
    for (let i = 0; i < ARC_POOL; i++) {
      const a = this.arcs[i];
      if (!a.live) continue;
      a.t += dt;
      if (a.t > ARC_LIFE) a.live = false;
      this._dirty = true;
    }
    for (let i = 0; i < PULSE_POOL; i++) {
      const q = this.pulses[i];
      if (!q.live) continue;
      q.t += dt;
      if (q.t > (q.life || PULSE_LIFE)) q.live = false;
      this._dirty = true;
    }

    for (let i = 0; i < GHOST_POOL; i++) {
      const q = this.ghosts[i];
      if (!q.live) continue;
      q.t += dt;
      if (q.t > GHOST_LIFE) q.live = false;
      this._lifeDirty = true;
    }

    // Health: the ear first, the eye 200 ms later.
    const max = this._readHpMax();
    if (max !== this.hpMax) { this.hpMax = max; this._lifeDirty = true; }
    const player = this.ctx.systems.get('player');
    if (player) {
      const hp = player.hp;
      // ONLY a drop arms the lead. controller.js:539 regenerates hp EVERY step, so arming on
      // any change at all would re-arm the 200 ms timer every frame and the vignette would
      // freeze at the value it had when the regen started and never open back up.
      if (hp < this.hp - 0.01) {
        this.hpLead = READOUT_LEAD_S;
        this._loss(clamp01(hp / max), clamp01(this.hp / max));
      }
      this.hp = hp;
      if (this.hpLead > 0) this.hpLead -= dt;
      else this.hpShown += (this.hp - this.hpShown) * (1 - Math.exp(-VIG_LAMBDA * dt));

      // The respawn window, read straight off the body. A window nobody can see the edge of
      // is a mechanic nobody learns, so this is drawn, and it is drawn from the OWNER's
      // number rather than from a copy of it here.
      const iv = typeof player.invuln === 'number' ? player.invuln : 0;
      if (Math.abs(iv - this.invuln) > 0.001) { this.invuln = iv; this._lifeDirty = true; }
      if (typeof player.invulnMax === 'number' && player.invulnMax > 0) {
        this.invulnMax = player.invulnMax;
      }
    }
    if (Math.abs(this.hpShown - this._lifePaintedHp) > LIFE_EPS) this._lifeDirty = true;
    this.restoreT += dt;

    this.srT += dt;
  }

  present(alpha) {
    void alpha;
    if (!this.enabled || !this.g || !this.ctx.ready) return;

    // The card: at the first present of a pause once the lock has been held on this page,
    // or after CARD_LATE_MS if it never was (see _onPaused). No counter, no allocation.
    if (this.paused && this.pauseEl && this.pauseEl.hidden
      && (this._lockHeld || performance.now() - this._pausedAtMs >= CARD_LATE_MS)) this.pause(true);

    this._readWeapon();
    this._readThreats();
    this._paintVignette();
    this._paintLife();
    this._speak();

    // Repaint only when something moved. A full 640 px clear every frame for a crosshair that
    // has not changed is the kind of cost that is invisible until it is 2 ms.
    if (!this._dirty && Math.abs(this.conePx - this._lastConePx) < 0.25) return;
    this._lastConePx = this.conePx;
    this._dirty = false;
    this._paintReticle();
  }

  /* ------------------------------------------------------------------ reads -- */

  _readWeapon() {
    const w = this.ctx.systems.get('weapons');
    const sh = this.ctx.shared;
    const car = !!(sh && sh.inCar);
    if (car !== this.inCar) { this.inCar = car; this._dirty = true; }
    if (!w) { this.conePx = 0; return; }
    this.cone = typeof w.spreadDeg === 'number' ? w.spreadDeg : this.cone;
    // ADS fades the crosshair out, so a change in it must repaint even at a steady cone.
    const ads = typeof w.adsT === 'number' ? w.adsT : 0;
    if (Math.abs(ads - this.adsT) > 0.004) { this.adsT = ads; this._dirty = true; }
    const dry = (w.ammo | 0) <= 0 && !w.reloading;
    if (dry !== this.dry) { this.dry = dry; this._dirty = true; }
    this.conePx = this._conePx(this.cone);
  }

  /**
   * WHAT IS AT YOUR BACK, refreshed every presented frame.
   *
   * Eleven of the thirteen hits in the first playtest came from behind him and every one of
   * them was legally telegraphed — where he could not see it. This is the only readout in
   * the file that answers a question the camera cannot, and it is deliberately narrow:
   *
   *   - only bodies that have committed to you (alerted, aware, or mid-swing),
   *   - only inside THREAT_R,
   *   - only OUTSIDE your forward cone.
   *
   * That last clause is what stops it being a radar, and it is also the lesson: the mark
   * deletes itself the instant you turn toward it, so "turn around" is taught by the mark's
   * own behaviour instead of by a caption.
   *
   * Reads siblings lazily, allocates nothing, and touches at most 46 pooled records
   * (enemies/species.js POOL sums to 46).
   */
  _readThreats() {
    const prevN = this.threatN;
    for (let i = 0; i < THREAT_POOL; i++) this.threats[i].live = false;
    this.threatN = 0;

    const en = this.ctx.systems.get('enemies');
    const player = this.ctx.systems.get('player');
    const cam = this.ctx.systems.get('camera');
    const list = en ? (typeof en.list === 'function' ? en.list() : en.all) : null;
    if (list && player && cam && !player.dead && !this.inCar) {
      // Same aim basis the damage arc uses: forward from the camera's yaw, screen-right
      // derived from it rather than assumed. camera.js:149.
      const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
      const px = player.pos.x, pz = player.pos.z;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e || !e.alive || !e.pos) continue;
        const st = e.state;
        // A body running away, dormant or dying is not a threat, and marking it would make
        // the mark mean "an enemy exists", which is exactly the wallpaper to avoid.
        if (st === 'flee' || st === 'dead' || st === 'dormant') continue;
        const committed = !!e.alerted || (e.aware | 0) > 0
          || st === 'approach' || st === 'windup' || st === 'attack';
        if (!committed) continue;
        const dx = e.pos.x - px, dz = e.pos.z - pz;
        const d = Math.hypot(dx, dz);
        if (d > THREAT_R || d < 1e-4) continue;
        const sx = dx / d, sz = dz / d;
        const rel = Math.atan2(-sx * fz + sz * fx, sx * fx + sz * fz);
        if (Math.abs(rel) < THREAT_CONE) continue;      // you are looking straight at it
        const w = clamp01((THREAT_R - d) / (THREAT_R - THREAT_NEAR));
        let slot = null;
        if (this.threatN < THREAT_POOL) slot = this.threats[this.threatN++];
        else {
          // Full: the nearest four win, so a pack never buries the one about to bite.
          let lo = 2, li = -1;
          for (let k = 0; k < THREAT_POOL; k++) {
            if (this.threats[k].w < lo) { lo = this.threats[k].w; li = k; }
          }
          if (li < 0 || lo >= w) continue;
          slot = this.threats[li];
        }
        slot.live = true; slot.rel = rel; slot.w = w;
        slot.hot = st === 'windup' || st === 'attack';
      }
    }

    // Repaint only for a change the eye could resolve — a bearing that moved a thousandth of
    // a radian is not a change, and a mark in its wind-up throb animates and always is.
    let changed = this.threatN !== prevN;
    for (let i = 0; i < THREAT_POOL && !changed; i++) {
      const q = this.threats[i];
      if (!q.live) continue;
      if (q.hot || Math.abs(q.rel - q.paintRel) > 0.02 || Math.abs(q.w - q.paintW) > 0.02) {
        changed = true;
      }
    }
    if (changed) this._dirty = true;
  }

  /** donor: cinderbloom src/ui/hud.js:1392-1394, verbatim geometry. */
  _conePx(deg) {
    const cam = this.ctx.camera;
    const vfov = ((cam && cam.fov) || CFG.render.fov) * DEG;
    return Math.tan(clamp(deg, 0, 25) * DEG) * (this.vh * 0.5) / Math.tan(vfov * 0.5);
  }

  /* --------------------------------------------------------------- vignette -- */

  _paintVignette() {
    if (!this.vig) return;
    const max = this.hpMax;
    const frac = clamp01(this.hpShown / max);
    // Nothing at full health. The vignette is not a permanent frame decoration; it is a
    // thing that CLOSES, and it can only read as closing if it starts absent.
    const a = Math.pow(1 - frac, 1.7) * 0.95;
    if (Math.abs(a - this.vigA) > 0.002) {
      this.vigA = a;
      this.vig.style.opacity = a.toFixed(3);
    }

    const trFrom = TREMOR_FROM * max;
    const hp = this.hpShown;
    const tr = hp >= trFrom ? 0 : clamp01((trFrom - hp) / trFrom);
    if (tr <= 0 && this.tremor <= 0) return;
    this.tremor = tr;
    if (tr <= 0) {
      this.vig.style.transform = '';
      this._trX = this._trY = 0;
      return;
    }
    // THE TREMOR IS ON THE FRAME, NOT THE CAMERA. "Never take the camera away."
    const t = this._t;
    const dx = Math.sin(t * TAU * TREMOR_HZ) * TREMOR_PX * tr;
    const dy = Math.sin(t * TAU * TREMOR_HZ * 1.37 + 1.1) * TREMOR_PX * tr * 0.7;
    // A whole transform STRING built and assigned every frame, for a 2.6 px shake nobody can
    // resolve to a tenth of a pixel: sub-pixel writes are style recalcs the player cannot
    // see. Cache the last applied offset and only rewrite past a whole pixel — the tremor
    // reads identically and the string is built only on the frames it is used.
    if (Math.abs(dx - this._trX) < 1 && Math.abs(dy - this._trY) < 1) return;
    this._trX = dx; this._trY = dy;
    this.vig.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
  }

  /* ------------------------------------------------------------- the life arc -- */

  /**
   * THE HEALTH READOUT HE ASKED FOR. No number, no glyph, no label, no colour code — it
   * survives tests/progression.mjs's no-words walk by construction, because it is four
   * strokes on a canvas.
   *
   * Four layers, in this order:
   *   1. the TROUGH — where the arc used to reach. Absent at full health, because a frame
   *      decoration that is always there is not a readout, and this one has to read as
   *      something that CLOSES.
   *   2. what is LEFT — shrinking symmetrically toward the centre. Length is the answer.
   *   3. the GHOSTS — the pieces taken in the last three quarters of a second, still lit
   *      where they were. Length is how hard that hit.
   *   4. the RESPAWN WINDOW — a second arc above the first, emptying across exactly the
   *      seconds of immunity the body actually has.
   *
   * Alpha and stroke width both climb as health falls, so at 100 hp this is a 0.10-alpha
   * hairline nobody looks at, and at 15 hp it is a thick breathing bar at the bottom of the
   * frame that cannot be ignored. That is the whole of "quiet at full, impossible near
   * death", and none of it is hue: it survives being seen in the far periphery of a dark
   * forest, which colour does not.
   */
  /**
   * The VALUE half of the readout — ink alpha and stroke width against health — kept in two
   * one-line methods so `state()` reports the numbers that are actually PAINTED. Every
   * instrument in this project that reported something adjacent to what it measured cost a
   * round (AGENTS.md rule 3, and seven of them in STATUS.md).
   */
  _lifeInk() {
    const low = 1 - clamp01(this.hpShown / this.hpMax);
    return LIFE_A_FULL + (LIFE_A_DEAD - LIFE_A_FULL) * Math.pow(low, 1.35);
  }

  _lifeStroke() {
    const low = 1 - clamp01(this.hpShown / this.hpMax);
    return LIFE_W_FULL + (LIFE_W_DEAD - LIFE_W_FULL) * Math.pow(low, 1.2);
  }

  _paintLife() {
    const g = this.lg;
    if (!g) return;
    const max = this.hpMax;
    const frac = clamp01(this.hpShown / max);
    const rest = this.restoreT < RESTORE_LIFE ? 1 - this.restoreT / RESTORE_LIFE : 0;
    const breathing = frac > 0.001 && frac < LIFE_BREATH_FROM;
    let ghosting = false;
    for (let i = 0; i < GHOST_POOL; i++) if (this.ghosts[i].live) { ghosting = true; break; }
    // Everything that animates on its own forces a frame; everything else waits for a change
    // worth more than LIFE_EPS of hp. At full health, settled, this paints nothing at all.
    if (!this._lifeDirty && !ghosting && !breathing && rest <= 0 && this.invuln <= 0) return;
    this._lifeDirty = false;
    this._lifePaintedHp = this.hpShown;

    g.clearRect(0, 0, this.vw, this.lifeH);
    if (this.paused) return;

    const G = this._lifeGeom();
    const u = Math.max(0.75, this.vw / 1600);
    const low = 1 - frac;
    const TOP = -Math.PI * 0.5;         // canvas angle of the crown of the circle
    g.lineCap = 'round';

    // Breath: slow at the threshold, faster as it approaches nothing. MOTION is what the far
    // periphery reports, long before any shape or value resolves there.
    let breath = 1;
    if (breathing) {
      const k = 1 - clamp01(frac / LIFE_BREATH_FROM);
      const hz = LIFE_BREATH_HZ[0] + (LIFE_BREATH_HZ[1] - LIFE_BREATH_HZ[0]) * k;
      breath = 0.74 + 0.26 * (0.5 + 0.5 * Math.sin(this._t * TAU * hz));
    }

    /* 1. the trough — what has been taken ----------------------------------- */
    if (low > 0.012) {
      g.globalAlpha = LIFE_TROUGH_A * Math.pow(low, 0.7);
      g.strokeStyle = SHADE;
      g.lineWidth = (LIFE_W_FULL + (LIFE_W_DEAD - LIFE_W_FULL) * low) * u;
      g.beginPath(); g.arc(G.cx, G.cy, G.r, TOP - G.span, TOP + G.span); g.stroke();
    }

    /* 2. what is left ------------------------------------------------------- */
    const half = G.span * frac;
    if (half > 0.0008) {
      g.globalAlpha = clamp01(this._lifeInk() * breath + rest * 0.55);
      g.strokeStyle = INK;
      g.lineWidth = this._lifeStroke()
        * u * (breathing ? 0.88 + 0.24 * breath : 1) * (1 + rest * 0.75);
      g.beginPath(); g.arc(G.cx, G.cy, G.r, TOP - half, TOP + half); g.stroke();
    }

    /* 3. the ghosts — the size of the bite ---------------------------------- */
    for (let i = 0; i < GHOST_POOL; i++) {
      const q = this.ghosts[i];
      if (!q.live) continue;
      const t = clamp01(q.t / GHOST_LIFE);
      // Full for the first fifth, then out: it is a flash that leaves a measurement behind,
      // not a bar that drains.
      g.globalAlpha = (t < 0.18 ? 1 : 1 - (t - 0.18) / 0.82) * 0.92;
      g.strokeStyle = INK;
      g.lineWidth = LIFE_W_DEAD * (1 - 0.5 * t) * u;
      const a0 = G.span * q.a, a1 = G.span * q.b;
      if (a1 - a0 < 1e-4) continue;
      g.beginPath(); g.arc(G.cx, G.cy, G.r, TOP + a0, TOP + a1); g.stroke();
      g.beginPath(); g.arc(G.cx, G.cy, G.r, TOP - a1, TOP - a0); g.stroke();
    }

    /* 4. the respawn window ------------------------------------------------- */
    // Riding INV_GAP px above the life arc, on the same centre, so it is unmistakably part
    // of the same family and unmistakably not the same thing. It starts full and closes to
    // nothing across the body's own invulnerability seconds: the edge of the window is
    // visible before it arrives, which is the only reason to draw a window at all.
    if (this.invuln > 0 && this.invulnMax > 0) {
      const f = clamp01(this.invuln / this.invulnMax);
      const spanI = G.span * INV_SPAN_MUL * f;
      const rI = G.r + INV_GAP;
      if (spanI > 0.0008) {
        g.globalAlpha = INV_A * 0.55;
        g.strokeStyle = SHADE;
        g.lineWidth = 5.2 * u;
        g.beginPath(); g.arc(G.cx, G.cy, rI, TOP - spanI, TOP + spanI); g.stroke();
        g.globalAlpha = INV_A;
        g.strokeStyle = INK;
        g.lineWidth = 2.1 * u;
        g.beginPath(); g.arc(G.cx, G.cy, rI, TOP - spanI, TOP + spanI); g.stroke();
      }
    }

    g.globalAlpha = 1;
  }

  /* ------------------------------------------------------------- the reticle -- */

  _paintReticle() {
    const g = this.g, R = this.R, c = R * 0.5;
    g.clearRect(0, 0, R, R);
    if (this.paused) return;

    const u = Math.max(1, R / 640);          // one design pixel at the reference size
    const ads = clamp01(this.adsT);

    /* ---- crosshair: the cone, in pixels ------------------------------------ */
    // Fades out into the sights, because a reticle over an aperture is two aiming marks and
    // two aiming marks is worse than one. In the car there is no gun to aim, so no crosshair.
    const ch = (1 - ads * ads) * (this.inCar ? 0 : 1);
    if (ch > 0.01) {
      const gap = Math.max(3.4 * u, this.conePx);
      // The blades grow with the gap so four marks keep reading as one object rather than as
      // four unrelated specks. cinderbloom hud.js:1423-1427.
      const len = (9.5 + 4.5 * clamp01(this.conePx / 46)) * u;
      const wIn = 2.6 * u, wOut = 1.2 * u;
      // Three passes. Over a torch-blown near wall a one-pixel outline does nothing; the
      // reticle has to carry its own local darkening. cinderbloom hud.js:1409-1416.
      for (let pass = 0; pass < 3; pass++) {
        const grow = pass === 0 ? 2.4 * u : pass === 1 ? 1.0 * u : 0;
        g.globalAlpha = ch * (pass === 0 ? 0.20 : pass === 1 ? 0.58 : 0.94);
        g.fillStyle = pass === 2 ? INK : SHADE;
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI * 0.5;
          const ca = Math.cos(a), sa = Math.sin(a);
          const r0 = gap - grow, r1 = gap + len + grow;
          const h0 = wIn * 0.5 + grow, h1 = wOut * 0.5 + grow;
          g.beginPath();
          g.moveTo(c + ca * r0 - sa * h0, c + sa * r0 + ca * h0);
          g.lineTo(c + ca * r0 + sa * h0, c + sa * r0 - ca * h0);
          g.lineTo(c + ca * r1 + sa * h1, c + sa * r1 - ca * h1);
          g.lineTo(c + ca * r1 - sa * h1, c + sa * r1 + ca * h1);
          g.closePath();
          g.fill();
        }
        // The centre pip never moves with the cone: at full bloom it is the only thing saying
        // where the barrel actually points. HOLLOW when the magazine is dry — the one ammo
        // fact this file states, and it is a shape, not a number.
        g.beginPath();
        if (this.dry) {
          g.arc(c, c, 2.6 * u + grow * 0.55, 0, TAU);
          g.arc(c, c, Math.max(0.4, 1.3 * u - grow * 0.2), 0, TAU, true);
        } else {
          g.arc(c, c, 1.6 * u + grow * 0.55, 0, TAU);
        }
        g.fill();
      }
      g.globalAlpha = 1;
    }

    /* ---- hit markers -------------------------------------------------------- */
    for (let i = 0; i < MARK_POOL; i++) if (this.marks[i].live) this._drawMark(g, c, this.marks[i], u);

    /* ---- a mote landed, a node bought, a level gained ------------------------ */
    // Three readings of one gesture, separated by SPEED and COUNT rather than by hue: the
    // mote is one fast thin ring, a node is two rings that open slowly behind each other, a
    // level is three, slower and wider still. Nothing is written, nothing is named, and every
    // one of them survives the audio lane being dead.
    for (let i = 0; i < PULSE_POOL; i++) {
      const q = this.pulses[i];
      if (!q.live) continue;
      const life = q.life || PULSE_LIFE;
      const t = clamp01(q.t / life);
      const rings = q.kind === 'level' ? 3 : q.kind === 'node' ? 2 : 1;
      // The grant eases OUT (fast then settling) so it reads as arriving rather than as an
      // expanding shockwave, which is what the mote's linear ring already is.
      const e = rings === 1 ? t : 1 - Math.pow(1 - t, 2.2);
      const base = rings === 1 ? 5 + 26 * t + q.streak * 1.1 : 7 + (rings === 3 ? 74 : 52) * e;
      g.strokeStyle = INK;
      for (let k = 0; k < rings; k++) {
        // Each ring lags the one before it by a fifth of the life, so they open in sequence.
        const lag = clamp01((t - k * 0.18) / Math.max(0.001, 1 - k * 0.18));
        if (lag <= 0) continue;
        const rr = (base * (1 - k * 0.24)) * u;
        if (rr <= 0.5) continue;
        g.globalAlpha = (1 - lag) * (rings === 1 ? 0.26 : 0.30);
        g.lineWidth = Math.max(0.8, (1.5 - lag) * u);
        g.beginPath(); g.arc(c, c, rr, 0, TAU); g.stroke();
      }
    }

    /* ---- damage direction --------------------------------------------------- */
    const dr = R * 0.30;
    for (let i = 0; i < ARC_POOL; i++) {
      const a = this.arcs[i];
      if (!a.live) continue;
      const t = clamp01(a.t / ARC_LIFE);
      // Full for the first fifth, then out. A directional cue that lingers becomes wallpaper.
      const al = (t < 0.2 ? 1 : 1 - (t - 0.2) / 0.8) * 0.78;
      const span = (0.22 + 0.14 * a.amt);
      const mid = a.rel - Math.PI * 0.5;      // canvas 0 rad is screen right; ahead is -90
      g.globalAlpha = al * 0.55;
      g.strokeStyle = SHADE;
      g.lineWidth = 7.5 * u;
      g.beginPath(); g.arc(c, c, dr, mid - span, mid + span); g.stroke();
      g.globalAlpha = al;
      g.strokeStyle = INK;
      g.lineWidth = 3.0 * u * a.amt;
      g.beginPath(); g.arc(c, c, dr, mid - span, mid + span); g.stroke();
      // ...and a tick pointing OUT along the bearing. An arc alone says "somewhere on this
      // side of you"; the tick says "there". It costs two lines and it is the difference
      // between a receipt and an instruction.
      const ca = Math.cos(mid), sa = Math.sin(mid);
      g.lineWidth = 2.6 * u;
      g.beginPath();
      g.moveTo(c + ca * (dr + 6 * u), c + sa * (dr + 6 * u));
      g.lineTo(c + ca * (dr + 15 * u), c + sa * (dr + 15 * u));
      g.stroke();
    }

    /* ---- what is at your back, for as long as it is there -------------------- */
    // Outside the damage arc's ring, so the two never sit on top of each other: the arc is a
    // thing that happened, these are things that are still happening.
    const tr = R * 0.42;
    for (let i = 0; i < THREAT_POOL; i++) {
      const q = this.threats[i];
      if (!q.live) continue;
      q.paintRel = q.rel; q.paintW = q.w;
      const mid = q.rel - Math.PI * 0.5;      // canvas 0 rad is screen right; ahead is -90
      // A body in its wind-up throbs. That is the 320 ms he was never shown, moved to where
      // he can see it — and it is the only state change this mark makes, so a throb means
      // exactly one thing.
      const throb = q.hot ? 0.70 + 0.30 * Math.sin(this._t * TAU * THREAT_HZ) : 1;
      const al = (THREAT_A[0] + (THREAT_A[1] - THREAT_A[0]) * q.w) * throb;
      const len = (5.0 + 5.5 * q.w) * u * (q.hot ? 1.3 : 1);
      const wing = (4.6 + 3.2 * q.w) * u;
      const ca = Math.cos(mid), sa = Math.sin(mid);
      const rIn = tr, rOut = tr + len;
      for (let pass = 0; pass < 2; pass++) {
        g.globalAlpha = al * (pass === 0 ? 0.70 : 1);
        g.strokeStyle = pass === 0 ? SHADE : INK;
        g.lineWidth = (pass === 0 ? 4.6 : 2.0) * u;
        g.lineCap = 'butt';
        g.beginPath();
        // A chevron with its point OUTWARD: the shape itself is an arrow at the bearing.
        g.moveTo(c + ca * rIn - sa * wing, c + sa * rIn + ca * wing);
        g.lineTo(c + ca * rOut, c + sa * rOut);
        g.lineTo(c + ca * rIn + sa * wing, c + sa * rIn - ca * wing);
        g.stroke();
      }
    }
    this._threatPainted = this.threatN;

    g.globalAlpha = 1;
  }

  /**
   * FOUR TICKS, AND THE SHAPE IS THE MESSAGE.
   *   normal   four diagonal ticks pointing out
   *   weak     the same, plus two outer chevrons — a COUNT change, the most legible thing a
   *            small mark can do (cinderbloom hud.js:1661-1670)
   *   armoured the ticks point INWARD, so it reads as wrong before it reads as anything
   *   kill     a ring and a cross: a different CLASS of shape, not a bigger tick
   * donor: cinderbloom src/ui/hud.js:1574-1680.
   */
  _drawMark(g, c, m, u) {
    const kind = m.kind;
    const total = MARK_LIFE[kind] || 0.21;
    const grow = kind === 'kill' ? 0.070 : 0.055;
    const hold = kind === 'kill' ? 0.090 : 0.040;
    const age = m.t;
    let gt = 1, alpha = 1;
    if (age < grow) { gt = age / grow; }
    else if (age >= grow + hold) alpha = clamp01(1 - (age - grow - hold) / Math.max(0.001, total - grow - hold));
    if (alpha <= 0) return;

    // Motion is what the eye catches in the periphery, before any shape resolves: 3 px out
    // to 8 px, with the kill overshooting instead of easing.
    const e = kind === 'kill' ? 1 - Math.pow(1 - gt, 3) : gt * (2 - gt);
    const over = kind === 'kill' ? 1 + 0.14 * Math.sin(Math.PI * gt) : 1;
    const R0 = (3 + 5 * e) * u * over;
    const L = 9 * u;

    for (let pass = 0; pass < 2; pass++) {
      g.globalAlpha = alpha * (pass === 0 ? 0.62 : 1);
      g.strokeStyle = pass === 0 ? SHADE : INK;
      g.lineWidth = (pass === 0 ? 3.6 : 1.9) * u;
      g.lineCap = 'butt';
      g.beginPath();

      if (kind === 'armoured') {
        for (let i = 0; i < 4; i++) {
          const a = Math.PI * 0.25 + i * Math.PI * 0.5;
          const ca = Math.cos(a), sa = Math.sin(a);
          const rOut = R0 + L, rIn = R0 + L * 0.30, wing = L * 0.52;
          g.moveTo(c + ca * rOut - sa * wing, c + sa * rOut + ca * wing);
          g.lineTo(c + ca * rIn, c + sa * rIn);
          g.lineTo(c + ca * rOut + sa * wing, c + sa * rOut - ca * wing);
        }
      } else if (kind === 'kill') {
        const rot = 0.38 * e;
        const Rk = R0 + L * 0.62;
        g.moveTo(c + Math.cos(rot) * Rk, c + Math.sin(rot) * Rk);
        g.arc(c, c, Rk, rot, rot + TAU);
        const rr = R0 + L * 0.30;
        g.moveTo(c - rr, c); g.lineTo(c + rr, c);
        g.moveTo(c, c - rr); g.lineTo(c, c + rr);
      } else {
        for (let i = 0; i < 4; i++) {
          const a = Math.PI * 0.25 + i * Math.PI * 0.5;
          const ca = Math.cos(a), sa = Math.sin(a);
          g.moveTo(c + ca * R0, c + sa * R0);
          g.lineTo(c + ca * (R0 + L), c + sa * (R0 + L));
        }
        if (kind === 'weak') {
          for (let i = 0; i < 2; i++) {
            const a = Math.PI * 0.25 + i * Math.PI;
            const ca = Math.cos(a), sa = Math.sin(a);
            const rr = R0 + L * 1.75, wing = L * 0.42;
            g.moveTo(c + ca * rr - sa * wing, c + sa * rr + ca * wing);
            g.lineTo(c + ca * (rr + L * 0.5), c + sa * (rr + L * 0.5));
            g.lineTo(c + ca * rr + sa * wing, c + sa * rr - ca * wing);
          }
        }
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  /* ------------------------------------------------------------ screen reader -- */

  /**
   * The one line of words that exists during play, and no sighted player can reach it. It is
   * deliberately coarse — bands, not numbers — because it is a substitute for a vignette and
   * a tremor, and those are bands too.
   */
  _speak() {
    if (!this.srEl || this.srT < SR_PERIOD_S) return;
    this.srT = 0;
    const max = this.hpMax;
    const f = clamp01(this.hpShown / max);
    const health = f > 0.92 ? 'Unhurt' : f > 0.66 ? 'Grazed' : f > 0.4 ? 'Hurt' : f > 0.15 ? 'Badly hurt' : 'Nearly gone';
    const w = this.ctx.systems.get('weapons');
    const ammo = !w ? '' : ((w.ammo | 0) <= 0 ? ', magazine empty'
      : (w.ammo | 0) <= 3 ? ', magazine nearly empty' : '');
    const prog = this.ctx.systems.get('progress');
    const carry = prog && prog.carryStep >= 0
      ? [', carrying a little', ', carrying a good deal', ', carrying a great deal'][prog.carryStep] : '';
    // The threat marks and the respawn window, in words, for the one reader who cannot see
    // either. Same rule as the rest of this line: bands, never numbers.
    let hot = false;
    for (let i = 0; i < THREAT_POOL; i++) if (this.threats[i].live && this.threats[i].hot) hot = true;
    const behind = this.threatN <= 0 ? ''
      : hot ? ', something is about to strike from behind you'
        : this.threatN > 1 ? ', several things are behind you' : ', something is behind you';
    const shielded = this.invuln > 0 ? ', briefly untouchable' : '';
    const line = health + ammo + carry + behind + shielded + '.';
    if (line === this.srLast) return;
    this.srLast = line;
    this.srEl.textContent = line;
  }

  /* ------------------------------------------------------------- test surface -- */

  state() {
    let marks = 0, arcs = 0, pulses = 0, grants = 0;
    let ghosts = 0, ghostSpan = 0, threatsHot = 0;
    for (let i = 0; i < MARK_POOL; i++) if (this.marks[i].live) marks++;
    for (let i = 0; i < ARC_POOL; i++) if (this.arcs[i].live) arcs++;
    for (let i = 0; i < GHOST_POOL; i++) {
      const q = this.ghosts[i];
      if (!q.live) continue;
      ghosts++;
      // The LENGTH of the largest live ghost, as a fraction of the arc. This is the number a
      // test can assert against "did the readout show him how big that bite was".
      ghostSpan = Math.max(ghostSpan, q.b - q.a);
    }
    for (let i = 0; i < THREAT_POOL; i++) if (this.threats[i].live && this.threats[i].hot) threatsHot++;
    for (let i = 0; i < PULSE_POOL; i++) {
      const q = this.pulses[i];
      if (!q.live) continue;
      pulses++;
      if (q.kind !== 'mote') grants++;   // a bought node reached the screen, audio or not
    }
    // The tree's buttons by state, counted off the DOM so the test reads what is shown.
    let own = 0, can = 0, poor = 0, lock = 0;
    if (this.nodeEls) {
      for (let i = 0; i < this.nodeEls.length; i++) {
        const cl = this.nodeEls[i].btn.className;
        if (cl.indexOf('own') >= 0) own++;
        else if (cl.indexOf('can') >= 0) can++;
        else if (cl.indexOf('poor') >= 0) poor++;
        else lock++;
      }
    }
    return {
      coneDeg: +this.cone.toFixed(3), conePx: +this.conePx.toFixed(2),
      adsT: +this.adsT.toFixed(3), dry: this.dry, inCar: this.inCar,
      hp: this.hp, hpMax: this.hpMax, hpShown: +this.hpShown.toFixed(1),
      vignette: +this.vigA.toFixed(3), tremor: +this.tremor.toFixed(3),
      marks, arcs, pulses, grants, paused: this.paused,
      card: !!(this.pauseEl && !this.pauseEl.hidden), lockHeld: this._lockHeld,
      tree: { own, can, poor, lock, points: this.ptsEl ? this.ptsEl.textContent : '' },
      map: Object.assign({}, this.mapInfo),
      // THE HEALTH READOUT, as numbers a gate can hold on to.
      // `lifeFrac` is the LENGTH of the arc; `lifeAlpha`/`lifeWidth` are the VALUE, and the
      // pair is the whole design: quiet at full, loud near death, never a hue.
      lifeFrac: +clamp01(this.hpShown / this.hpMax).toFixed(3),
      lifeAlpha: +this._lifeInk().toFixed(3),
      lifeWidth: +this._lifeStroke().toFixed(2),
      ghosts, ghostSpan: +ghostSpan.toFixed(3),
      invuln: +this.invuln.toFixed(2), invulnMax: +this.invulnMax.toFixed(2),
      restoring: this.restoreT < RESTORE_LIFE,
      threats: this.threatN, threatsHot,
      canvas: { r: this.R, dpr: this.dpr, lifeH: this.lifeH },
      // The only text this system owns, so a test can assert its content and its invisibility
      // in the same breath.
      sr: this.srLast,
    };
  }

  config(patch) {
    const p = patch && patch.hud;
    if (!p) return;
    if (p.paused !== undefined) this.pause(!!p.paused);
  }
}

export default Hud;
