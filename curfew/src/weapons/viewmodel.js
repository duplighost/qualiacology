// CURFEW — the viewmodel. LIFTED from Projects/vigil/src/weapons/viewmodel.js:
// its OWN scene and its OWN camera, rendered after the world with the depth
// buffer cleared, at its own FOV. The gun therefore never clips a wall, never
// fisheyes at the world's 68 deg, and its apparent size is independent of what
// the world FOV is doing (COMBAT_FEEL 1.1). Aim stays screen-centre: the ADS
// pose MOVES THE MODEL so the sight sits on the world camera's centre ray.
// Every spring, every sway coefficient and every lag clamp is VIGIL's.
//
// Gun local frame: +X right, +Y up, -Z down the bore.
//
// THE FLARE TRAP, and the reason this file is worth its length: FLARE drew its
// muzzle flash in the WORLD scene at 68 deg while the gun rendered in the
// viewmodel scene at 48. Two different projections, so the flash floated
// beside the barrel forever and no amount of nudging the offset fixed it,
// because the offset was never the bug. THE FLASH BELONGS IN THE VIEWMODEL
// SCENE, parented to the gun, in the same projection as the barrel it leaves.
// The only thing that goes into the world is the LIGHT the flash casts.
//
// THE CINDERBLOOM CLAMP (cinderbloom weapons.js:6155-6158, and the FLASH_SOFTEN
// note at :212-224): three attenuates a decay-2 light as 1/max(d*d, 0.01), so
// anything within 10 cm of a point light is handed 100x the intensity. Put the
// flash light's centroid 7 cm AHEAD of the crown — which is where the plume
// actually forms — and the nearest weapon surface stays outside the clamp.
// Cinderbloom's front handguard washed to flat pale grey until it did this,
// and no roughness floor could have survived it.
//
// WHAT CHANGED FROM VIGIL:
//   1. It is a bolt rifle, not the CINDER carbine (M0's selected weapon), so
//      the silhouette is authored here: long barrel, wood, a scope, and a bolt
//      that throws. The pose stack underneath it is unchanged.
//   2. VIGIL's weapon.js created this module. CURFEW's manifest lists it
//      separately (entry 12, right after weapons at 11), so it reads the gun's
//      published state and drains its pulse queue lazily, in step.
//   3. The world-side muzzle light BORROWS from the 8-rover pool
//      (gfx/lights.js) instead of adding a PointLight of its own. Three bakes
//      the light count into every shader program; a light appearing mid-game
//      recompiles every material and freezes the frame. That was MARROW's
//      "it freezes when I pick up a key".
//   4. present(alpha) genuinely reads alpha: the spring channels are snapshot
//      prev/curr in step and lerped here, then the continuous-time sway and
//      breath are added on top at the true presentation time.

import * as THREE from 'three';
import {finishMaterial, setMaterialFinish} from './finishes.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, DEG, clamp, clamp01, lerp, ease, Spring, Spring3, sway2 } from '../engine/math.js';
import CFG from '../config.js';
import {buildClimbingHand,climbingHandMaterials,placeClimbingHand} from './climbing-hands.js';
import {buildPourRig} from './pour-hands.js';
import { SURFACE_RELIEF_GLSL } from '../world/surface-relief.js';

// Small bevels carry a moving light edge on the stock, receiver and grip.
function bevelBox(w,h,d) {
  const radius=Math.min(.003,w*.16,h*.16,d*.16);
  const g=new THREE.BoxGeometry(w,h,d,3,3,3),p=g.attributes.position,n=g.attributes.normal;
  const v=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);
    if(Math.abs(v.x)<w*.49)v.x=Math.sign(v.x)*(w/2-radius);
    if(Math.abs(v.y)<h*.49)v.y=Math.sign(v.y)*(h/2-radius);
    if(Math.abs(v.z)<d*.49)v.z=Math.sign(v.z)*(d/2-radius);
    c.set(Math.max(-w/2+radius,Math.min(w/2-radius,v.x)),Math.max(-h/2+radius,Math.min(h/2-radius,v.y)),Math.max(-d/2+radius,Math.min(d/2-radius,v.z)));
    v.sub(c).normalize();n.setXYZ(i,v.x,v.y,v.z);v.multiplyScalar(radius).add(c);p.setXYZ(i,v.x,v.y,v.z);
  }
  return g;
}

/* ---------------- r3: shapes that are not boxes ----------------
 * The guns were built from boxes with a 3 mm bevel, capped tubes and an 8x6 sphere: a stock of
 * three planks with a square block for a grip, a straight 25 mm barrel, flat trigger guards. These
 * are the few shapes that replace them, all core three geometry, in the same four materials:
 * a part drawn in PROFILE (a side view, extruded to its width and rounded all round), a long part
 * with rounded long edges, and a lathe for anything round. Normals are welded so a rounded part
 * shades as one surface, not as facets. */
function smoothed(geo) {
  // Weld every vertex that shares a position (to 10 um), then let three average the faces. (The
  // vendored BufferGeometryUtils carries mergeGeometries only.) Boot-time work, a few thousand
  // vertices a part.
  const src = geo.index ? geo.toNonIndexed() : geo;
  const pos = src.attributes.position, n = pos.count;
  const seen = new Map(), idx = new Uint32Array(n), out = [];
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const key = Math.round(x * 1e5) + ',' + Math.round(y * 1e5) + ',' + Math.round(z * 1e5);
    let k = seen.get(key);
    if (k === undefined) { k = out.length / 3; seen.set(key, k); out.push(x, y, z); }
    idx[i] = k;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  m.computeVertexNormals();
  if (src !== geo) src.dispose();
  geo.dispose();
  return m;
}
/** A centred rounded rectangle, into `path`. */
function rrect(path, w, h, r) {
  const x = -w / 2, y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
  return path;
}
/** A long part, its length on z: long edges rounded to `r`, both ends softened by `e`. */
function roundBar(w, h, d, r, e = 0.0025) {
  const iw = w - 2 * e, ih = h - 2 * e;
  const rr = Math.max(0.0004, Math.min(r, iw / 2 - 1e-4, ih / 2 - 1e-4));
  const geo = new THREE.ExtrudeGeometry(rrect(new THREE.Shape(), iw, ih, rr), {
    depth: Math.max(1e-4, d - 2 * e), bevelEnabled: e > 0, bevelThickness: e, bevelSize: e,
    bevelSegments: 2, curveSegments: 5,
  });
  geo.translate(0, 0, -(d - 2 * e) / 2);
  return smoothed(geo);
}
/**
 * A part drawn in profile: `draw(shape)` traces its side view with x = the gun's z and y = the
 * gun's y, and it is extruded across the gun to `width`, every edge rounded by `bevel`.
 */
function profile(width, bevel, draw) {
  const shape = new THREE.Shape();
  draw(shape);
  const depth = Math.max(1e-4, width - 2 * bevel);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 3, curveSegments: 10,
  });
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(-Math.PI / 2);          // shape x -> gun z, extrusion -> across the gun (x)
  return smoothed(geo);
}
/** Turned along z: `pts` are [radius, z] pairs from the back to the front. */
function turned(pts, seg = 28) {
  const geo = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), seg);
  geo.rotateX(Math.PI / 2);           // lathe y -> gun z (the back of the list ends up at +z)
  return smoothed(geo);
}

/* ---------------- the authored pose anchors ---------------- */

// VIGIL's hip pose was authored for the CINDER CARBINE, and lifting it onto a BOLT RIFLE is
// the fault ART.md 6.1 could not see because it only ever measured the gun's VALUE.
//
// MEASURED, frame A, differential mask taken inside ONE rAF with BOTH grain chains zeroed
// (ART.md H.3 facts 1 and 2). tests/viewmodel.mjs takes its two captures in TWO SEPARATE rAF
// callbacks with the grain on, so what it reports is the forest and the noise, not the gun:
// run the same diff hiding NOTHING at all and it still reports 46.87% of the frame changed.
// Its 52.6% therefore cannot be brought under its own 45% ceiling by anything in this file.
// The instrument fix is filed in docs/HANDOFF.md; the numbers below are the clean ones.
//
//                             coverage  lower half   sight dot lands at   gun max
//   VIGIL's carbine pose  hip   13.80%      96.5%      x 77.1%  y 56.2%    249.2
//   this                  hip   10.12%     100.0%      x 83.2%  y 69.2%     93.0
//   VIGIL's carbine pose  ADS   13.97%      79.6%      centre ray          250.0
//   this                  ADS   13.52%      80.7%      centre ray          100.9
//
// The coverage was never half the screen. What was wrong is WHERE those pixels sat. The rifle
// spans +0.256 (butt plate) to -0.585 (crown) in gun space — 0.84 m — against the CINDER
// carbine's 0.47. At VIGIL's rest z of -0.282 the BUTT PLATE therefore lands 2.6 cm from the
// eye, where this lens sees 2.3 cm of frame height: a 9.2 cm plate at four times the height of
// the entire frame. That is the pale wedge filling the bottom-right of value-A.png. And at
// rest y -0.088 the scope's optical centre lands at camera y -0.0145, i.e. 5.8% of the
// half-frame below the horizon — the scope sat ON the eye line, in the middle of the read,
// which is what value-B.png shows occluding the right half of the world.
//
// So: down, right, and further out along the bore. The butt plate goes from 2.6 cm to 6.9 cm
// from the eye (its apparent height falls 2.6x), the sight dot goes from the eye line to 69%
// down the frame, and 100% of the gun's pixels are now in the lower half. The gun keeps a real
// presence — a viewmodel much under 8% reads as a toy held at arm's length — and gets out of
// the middle of the frame. The full sweep is in docs/HANDOFF.md.
const REST_POS = new THREE.Vector3(0.1400, -0.1180, -0.3200);
const REST_ROT = new THREE.Euler(-0.024, 0.038, 0.052);

/* ---------------- ROUND 5: two guns, one pose stack ----------------
 * NEXT.md item 3 — "other guns should be obtainable". The KV-7 carbine is earned by claiming
 * The Weeping Mine (weapon.js grant()) and it needs its OWN silhouette, hip pose, ADS pose,
 * muzzle anchor and brass anchor. Both guns are built at boot, in the SAME four material
 * instances (no new program can link during play), and the one not in the hands is
 * visible = false. Everything per-weapon lives in this table; everything shared (springs,
 * sway, bob, lag, melee, the flash, the brass pool) is untouched and reads `this.cur`.
 *
 * The carbine's numbers are VIGIL's, lifted from the readable donor:
 *   donor: C:/Users/Alex/Projects/vigil-handoff/vigil-enhanced/src/weapons/viewmodel.js:14-20
 *     REST  (0.0975, -0.0880, -0.2820) rot (-0.024, 0.038, 0.052)
 *     SIGHT (0, 0.0680, -0.0790), ADS_DIST 0.155, MUZZLE (0, 0.012, -0.472)
 * The CINDER carbine is 0.47 m long (butt at +0.199), so VIGIL's rest z puts the butt 8 cm
 * from the eye — the fault the bolt's re-pose above fixed (a 0.84 m rifle at that z put its
 * butt plate 2.6 cm from the eye) does not apply, and the donor HIP pose is kept as authored
 * (moved down/right after measurement, see the table's own comment). ADS_DIST IS the donor's
 * 0.155 again (verification round 3): round 1 had moved it to 0.28 to stop the aimed carbine
 * being a slab, which worked but spent a number Alex has already held. What was actually
 * wrong is the OPTIC MOUNT, not the eye relief — the sight sat 0.068 up, level with the top
 * rail, so the rail and its slots stacked into the bottom of the ring and the window was 80 px
 * up and 20 px down. The optic is on a riser now (sight.y 0.084) and both faults go with one
 * geometry number; see the table's own comment for the two-axis sweep.
 * `boltThrow` scales the bolt-carrier travel: the carbine has no bolt throw (cycle 0), only a
 * hold-open on empty, and its handle does not lift. `brass` is the ejection anchor in eye
 * space (right, forward, down): the carbine's port sits 5 cm further back than the rifle's.
 */
const POSES = {
  bolt: {
    rest: REST_POS, rot: REST_ROT, scale: 0.96,
    sight: new THREE.Vector3(0, 0.0735, 0.0300), adsDist: 0.155,
    muzzle: new THREE.Vector3(0, 0.014, -0.5850),
    boltThrow: 1.0, boltLift: -0.55,
    brass: { right: 0.16, fwd: 0.30, down: 0.06 },
    kick: { pos: 0.90, flip: 1.50, twist: 1.20, rot: { f: 4.09, z: 1.38 } },   // see KICK below: 25 mm back, 5 degrees up
    flash: { k: 1.0, core: 0.034, cone: 0.55, len: 1.0, light: 46 },   // THE FLASH, per gun (_presentFlash)
  },
  carbine: {
    // Started at VIGIL's rest (0.0975, -0.0880, -0.2820) and MEASURED (tests/weapon.mjs (f),
    // frame A hip): 15.76% of the frame, dot at x 65% / y 55% — the reflex sight sat just
    // right of the frame centre, in the middle of the read, the same fault the rifle's
    // re-pose above names. Down and right, like the rifle; see the report for the sweep.
    rest: new THREE.Vector3(0.1180, -0.1060, -0.2950), rot: new THREE.Euler(-0.024, 0.038, 0.052), scale: 1.0,
    // THE RISER (verification round 3). adsDist is VIGIL's 0.155 again. sight.y is the ONE
    // number that moved: the donor mounts the optic at 0.068, level with the top rail (top at
    // 0.054, its slots at 0.0605), so at full ADS the rail runs forward UNDER the sight line
    // and stacks up into the bottom of the ring in perspective. The ring was a window you
    // could only see out of UPWARDS, and a body you put the dot on was behind your own rail.
    // Round 1 answered that by pushing the eye relief out to 0.28, which shrank the whole
    // gun instead of unblocking the ring - and spent a number Alex has held.
    // MEASURED (tests/artifacts/r3-F-aperture.mjs; flat road -1335,-345, pitch 0, adsT 1,
    // torch on, 1200x675; OPAQUE-BODY mask = render with the glass and dot meshes hidden,
    // minus render with vm.root hidden, diff > 12; aperture = pixels walked from the dot to
    // the first body pixel):
    //   adsDist  sight.y   aperture up/down/l/r    frame %   lower-half %   x extent
    //   0.155     0.068      80 /  20 / 79 / 77      37.4        69.3        0 - 100 %  (VIGIL)
    //   0.28      0.068      42 /  14 / 43 / 41      18.5        35.5       24 -  76 %  (round 1)
    //   0.155     0.078      80 /  53 / 78 / 77      23.3        41.2       16 -  84 %
    //   0.155     0.084      80 /  62 / 78 / 77      19.5        33.6       17 -  83 %  <- this
    //   0.155     0.090      80 /  67 / 79 / 77      16.6        27.6       23 -  77 %
    //   bolt                 47 /  35 / 49 / 46      13.3        21.2       35 -  70 %  (for scale)
    // At 0.084 the ring is open 78% of its radius BELOW the dot (the bolt's scope: 74%), the
    // aimed gun hides a third of the lower half instead of two thirds, and both flanks are
    // clear - the pack circles, and a body coming in low from the side used to be behind your
    // own gun. Cutting the two rail slots forward of the sight was measured too and is worth
    // 1 px (the handguard's top strip is the next blocker), so the geometry is untouched.
    // Above 0.084 the ring keeps opening but the optic starts to look like a periscope; 0.090
    // was measured and left on the table. The see-through and sight-on-centre-ray checks in
    // tests/weapon.mjs (f) hold (the dot is on the centre ray by construction: adsPosFor
    // solves the ADS pose from the sight, so moving the sight moves the gun, not the dot).
    // The frame / lower-half / x columns above are the SWEEP's instrument (the render-and-diff
    // mask, which grows with how bright the night is). The suite pins the same three numbers
    // on a PAINTED silhouette instead, which does not, and reads 19.3-21.3 / 33.4-35.3 /
    // x 8.8-16.8 here against VIGIL's 27.1 / 50.1 / x 0-99.9. Both refute the same way.
    sight: new THREE.Vector3(0, 0.0840, -0.0790), adsDist: 0.155,
    muzzle: new THREE.Vector3(0, 0.012, -0.472),
    boltThrow: 0.30, boltLift: 0,
    brass: { right: 0.14, fwd: 0.24, down: 0.05 },
    kick: { pos: 0.30, flip: 0.45, twist: 0.45, alt: true, climb: 0.22 },   // 8 mm and 1.5 degrees, twelve times a second
    flash: { k: 0.72, core: 0.025, cone: 0.40, len: 0.8, light: 26 },
  },
  /* ROUND 6 (Alex, fifth playtest: "I'm assuming there are other guns, right? I haven't found
   * any"). The shotgun and the revolver were defined in CFG.weapons.defs and fired through
   * weapon.js, and this file had NO MODEL for either: _selectGun('revolver') found nothing in
   * this.guns and returned, so a claim of the Drowned Light would have fired a revolver from a
   * picture of the bolt rifle. Measured on this branch (tests/weapon.mjs (i): curId stayed
   * 'bolt' with wep.def.id 'revolver'). Both are built below in the same four materials.
   * Iron sights on both: the SIGHT is the rear notch / the receiver's rib, and the `dot` is
   * the front bead on the same axis, so sightScreenOffset() measures the real alignment. */
  shotgun: {
    // a pump gun is held like the rifle: the rifle's own rest, a shade lower and nearer
    rest: new THREE.Vector3(0.1300, -0.1220, -0.2900), rot: new THREE.Euler(-0.024, 0.038, 0.052), scale: 0.96,
    sight: new THREE.Vector3(0, 0.0420, -0.0200), adsDist: 0.230,
    muzzle: new THREE.Vector3(0, 0.016, -0.6300),
    // r3: a 9 cm stroke (1.45 of the rifle's 6.2 cm bolt throw), which is what a pump racks.
    boltThrow: 1.45, boltLift: 0,           // the pump comes back on the cycle, no lift
    brass: { right: 0.15, fwd: 0.26, down: 0.06 },
    kick: { pos: 1.10, flip: 1.90, twist: 1.40, rot: { f: 3.73, z: 1.39 } },   // the heaviest: 31 mm back, 6.5 degrees up
    flash: { k: 1.45, core: 0.040, cone: 0.70, len: 1.3, light: 54 },
  },
  revolver: {
    // a pistol in two hands: nearer the eye, lower, and the sight line higher in the frame
    rest: new THREE.Vector3(0.0900, -0.1150, -0.2450), rot: new THREE.Euler(-0.020, 0.030, 0.040), scale: 1.0,
    sight: new THREE.Vector3(0, 0.0440, 0.0450), adsDist: 0.260,
    muzzle: new THREE.Vector3(0, 0.024, -0.2100),
    boltThrow: 0, boltLift: 0,              // cycle 0: the hammer is the moving part, and it does not travel
    brass: null,                            // a revolver keeps its brass in the cylinder
    kick: { pos: 0.50, flip: 2.10, twist: 1.00, rot: { f: 5.13, z: 1.26 } },   // short and light: it flips, 7 degrees
    flash: { k: 1.15, core: 0.030, cone: 0.50, len: 0.7, light: 40, gap: true },
    // A short gun held close: the shared low-ready took all but its front sight off the
    // bottom of the frame (looked at, 2026-09-18), so it dips less and turns a little more.
    low: { pos: new THREE.Vector3(0, -0.012, 0.010), rot: new THREE.Euler(-5 * DEG, 19 * DEG, 5 * DEG) },
  },
};

// The model is also slightly too big for the lens, because a 0.84 m rifle is not a 0.47 m
// carbine. Scale is applied to the GUN group, about the action, so the pose offsets above stay
// in honest camera-space metres and the springs, sway, bob and melee amplitudes underneath
// them are untouched. Measured, frame A hip, at the rest position above:
//   scale        1.00    0.98    0.96    0.94
//   coverage    ~10.5%  10.15%  10.12%   9.58%
// It is a weak lever compared with the position — which is the finding, and the reason this
// is 0.96 and not the 0.84 the first pass reached for. 0.84 measured 5.01% and left a band of
// empty frame between the scope and the right edge: a rifle floating in front of the player
// rather than held by them.
const VM_SCALE = 0.96;

// Scope optical centre in gun space (POSES.bolt.sight, and the carbine's own in POSES.carbine).
// The ADS pose is solved from it so the reticle lands on the world camera's centre ray to
// the pixel. Solved from the scale, not hard-coded: the sight axis rides the model, so a model
// scaled about the action moves the axis with it and the ADS pose has to follow or the reticle
// walks off the world camera's centre ray. At scale 1 this is VIGIL's number exactly.
const adsPosFor = (sight, adsDist, scale, out) =>
  out.set(0, -sight.y * scale, -(adsDist + sight.z * scale));

// A bolt rifle is long. The crown sits well forward of the carbine's -0.472. Per-weapon now
// (POSES.*.muzzle); this.muzzle is the selected gun's.
const FLASH_AHEAD = 0.070;                    // see THE CINDERBLOOM CLAMP above
const FLASH_NONE = { k: 1, core: 0.034, cone: 0.55, len: 1, light: 46 };
// r3: where the revolver's cylinder meets its barrel (gun space): the cylinder's front face is
// at z -0.051 and the frame is 3 cm wide, so the flares sit just outside it either side.
const REVOLVER_GAP = { x: 0.026, y: 0.012, z: -0.053 };

const SPRINT_POS = new THREE.Vector3(0.075, -0.045, -0.020);
const SPRINT_ROT = new THREE.Euler(-14 * DEG, 8 * DEG, 32 * DEG);
// The swap (ROUND 5) is the sprint-out motion — the donor motion for "the gun leaves the
// hands" — plus a drop and a nose-down that take it fully out of frame at the midpoint,
// which is the instant weapon.js changes the gun. Measured on the swap screenshot: the
// gun's share of the frame at the bottom of the swap is what says it left.
const SWAP_DROP = new THREE.Vector3(0.02, -0.19, 0.03);
const SWAP_ROT = new THREE.Euler(-34 * DEG, 0, 0);
// THE LOW-READY. Lowered is a pose, not an absence: the muzzle drops and swings in across the
// body, still in frame, so a lowered gun reads as a gun you chose to point at the floor. Small
// on purpose: the lens is 48 degrees and the guns sit low right, so any drop of 4.5 cm or more
// loses the shotgun and the revolver off the bottom of the frame (the r3 evidence pass rastered
// the real meshes). Looked at in the game on all four guns, 2026-09-18.
const LOW_POS = new THREE.Vector3(0, -0.030, 0.015);
const LOW_ROT = new THREE.Euler(-10 * DEG, 16 * DEG, 4 * DEG);
const LOW = { pos: LOW_POS, rot: LOW_ROT };      // a gun's POSES entry may carry its own `low`
// ROUND 6: how far down the swap curve reaches (of SWAP_DROP / SWAP_ROT + the sprint pose).
// Measured: the bolt's coverage hits 0% at 0.55 of the drop and the carbine's at 0.55 on the
// way back up, so 0.66 clears the frame with a margin and nothing more — the gun leaves the
// frame for ~4 steps around the midpoint instead of 17.
const SWAP_REACH = 0.66;
// THE KICK (r3 polish, 2026-09-18). The weapon-kick springs were nudged x16 in _onPulse and
// divided by 16 again in present(), on a 16 Hz spring that is back at rest one step after the
// shot, so the gun in the hands moved 0.005 mm when it fired while the world punched (measured:
// tests/shots/r3-gun/polish/before-*). The numbers in _onPulse are now the PEAK the gun reaches,
// in metres and radians at the hip, times the gun's own POSES.*.kick and the stance's mW (0.32
// aimed): the impulse that reaches that peak is worked out from the spring itself at boot, so
// retuning a spring cannot quietly change how far the gun goes. The springs are slower than
// VIGIL's 16 Hz so the kick is seen: the push back is gone in four steps, the muzzle comes down
// over six, and neither rings.
const KICK_POS = { f: 9, z: 0.60 };
const KICK_ROT = { f: 7, z: 0.65 };
/** Peak displacement of `spring` params for a unit impulse, sampled at the fixed step. */
function kickPeak({ f, z }) {
  const s = new Spring(f, z);
  s.nudge(1);
  let pk = 0;
  for (let i = 0; i < 12; i++) pk = Math.max(pk, s.update(CFG.loop.FIXED));
  return pk;
}
const KICK_GAIN_POS = 1 / kickPeak(KICK_POS);
const KICK_GAIN_ROT = 1 / kickPeak(KICK_ROT);
const KICK_NONE = { pos: 1, flip: 1, twist: 1 };
// THE WEIGHT (r3 shooting feel). On KICK_ROT every gun's muzzle was back at rest 83 ms after the
// shot, which read light and twitchy for a rifle. A heavy gun's muzzle SNAPS up and then comes
// down under the shooter's control, and that is an OVERDAMPED spring: two real rates instead of
// a ring. POSES.*.kick.rot is that spring per gun, chosen from the two rates (per second):
//   bolt      11 / 60  -> 4.09 Hz z 1.38: peak on step 1-2, half down at 117 ms, 10% at 267 ms
//   shotgun   10 / 55  -> 3.73 Hz z 1.39: peak on step 2,   half down at 117 ms, 10% at 300 ms
//   revolver  16 / 65  -> 5.13 Hz z 1.26: peak on step 1,   half down at  83 ms, 10% at 200 ms
// none overshooting by more than 1.3% (scratchpad r3/gun/rotsim.mjs, engine/math.js's Spring).
// The carbine keeps KICK_ROT: at twelve rounds a second a slow return is a climb, and the
// climb is authored on its own (CLIMB_MAX). Each spring's own impulse gain is worked out here,
// so the peaks written in _onPulse stay the peaks.
for (const id in POSES) {
  const K = POSES[id].kick;
  if (K) K.gainRot = K.rot ? 1 / kickPeak(K.rot) : KICK_GAIN_ROT;
}
// THE HANDS AT WORK (r3 shooting feel). The same fault as the kick, on the other two springs:
// the reload beats nudged a 13 Hz jolt by j*10, which peaks at 0.05 mm (the seat) to 0.08 mm
// (the bolt release) one step later and is gone the next (simulated with engine/math.js's own
// Spring: scratchpad r3/gun/joltsim.mjs), and a hard landing dipped the gun 0.7 mm. Now the
// numbers in RELOAD_JOLT / CYCLE_JOLT are PEAKS, in jolt units (one unit is 3 mm down and 0.6
// degrees of muzzle, see present()), and the jolt is slower so a knock is seen: at 8 Hz it
// peaks on the second step and has settled in eight. Aimed, a jolt is 6% of that
// (JOLT_ADS_K), so a reload you keep the sight up through keeps the bead on the ray (0.048 NDC
// at a tenth, against tests/weapon.mjs (l)'s 0.05, so it is less).
const JOLT_SPRING = { f: 8, z: 0.50 };
const JOLT_GAIN = 1 / kickPeak(JOLT_SPRING);
const JOLT_ADS_K = 0.06;
const DIP_SPRING = { f: 6.2, z: 0.62 };
const DIP_GAIN = 1 / kickPeak(DIP_SPRING);
// The rifle's bolt (and, scaled by POSES.*.boltThrow, the pump and the charging handle) travels
// this far back on the cycle, and stays back on an empty gun until the reload closes it.
const BOLT_TRAVEL = 0.062;
const BOLT_CLOSE_S = 0.12;           // the empty reload's bolt, released, runs home in this long
// The carbine walks up in the hands over a long burst (POSES.carbine.kick.climb, degrees a
// round at the hip), to this, and settles back with this half-life once the trigger lets go.
const CLIMB_MAX = 2.4 * DEG, CLIMB_HL = 0.12;

// YOUR TORCH ON YOUR OWN HANDS (r3 polish). Where the stand-in for the torch sits in this
// scene (camera metres: a hand's width above the eye and a little behind), and how bright it is
// against the torch's CFG.lights.torch.hot. See _buildLights.
const TORCH_AT = new THREE.Vector3(-0.05, 0.09, 0.04);
const VM_TORCH = 2.4;

// ROUND 6 repair: the reload body track (the -0.045 m dip and the 9 / 22 / -16 degree roll that
// says "hands working") is scaled down to this at full ADS. MEASURED 2026-09-03 before the change
// (tests/artifacts/r1-probe-sight-before.txt): the auto reload KEPT adsT at 1.0 (weapon.js) while
// this track swung the rifle across a still-zoomed frame - the bead was more than 0.05 NDC off the
// centre ray for 3.02 s on the bolt (peak 1.14 NDC), 2.70 s on the carbine, 2.13 s on the revolver:
// longer than the 2.75 s the sight was LOWERED before. The sight is only kept if the gun stays on the
// ray, so at ADS the track is all but off; from the hip (adsT 0) it is the same track as before,
// and a reload the player pressed R for lowers the sight (adsT -> 0) and gets the whole track back.
const RELOAD_ADS_K = 0.03;

// The viewmodel's own lens. The world's 68 / 74 / 55 are untouchable (ART.md 0.6); this one is
// not — it is this file's own, and it was swept:
//   FOV_HIP        48      50      52      55      58
//   coverage    10.12%   9.80%   8.16%   5.01%   3.94%
// Widening it does shrink the gun, and hard. It is NOT used, and that is a measured decision
// rather than caution: past about 52 the gun stops touching the right and bottom edges of the
// frame (bbox [57,56,100,100] at 48, [57,57,96,100] at 52, [56,62,82,100] at 55) and a
// viewmodel that does not leave the frame reads as an object floating in front of the player
// instead of a thing in their hands. The position fix already lands the read; a lens change on
// top of it would only make the rifle small. So VIGIL's 48 / 44 stands.
const FOV_HIP = 48, FOV_ADS = 44;

// A bolt gun did not need VIGIL's 48, and 24 was that. The carbine (ROUND 5) dumps 30 cases
// in 2.48 s against a 6 s case life, so at 24 the pool wrapped inside one magazine: 6 of 30
// cases were recycled while still live - a case on the ground teleported back to the port
// (measured by the verifier, verification round 1). 36 held one magazine and still recycled
// 14 when a second burst followed inside the case life (measured, tests/weapon.mjs (d)); a
// mag dump, the 2.1 s reload and a second dump are 60 cases in ~7 s, and VIGIL's 48 is the
// number that holds that with the first cases expiring as the last ones leave. The
// InstancedMesh is the same one draw at any count.
const BRASS_N = 48;

/* ---------------- the grade, applied to the gun in its own scene ---------------
 * ART.md 6.1.1 asks for the gun to be drawn INSIDE the composer, between RenderPass and
 * UnrealBloomPass, so it gets the same ACES, bloom threshold and grade as the world. That
 * is a pass-order change in gfx/post.js and main.js, and neither is this lane's file; the
 * request is filed in docs/HANDOFF.md.
 *
 * Until it lands, the same maths is applied here, per-fragment, in the gun's own materials.
 * It is inserted AFTER three's colorspace_fragment, which is the exact point in the chain
 * where post.js's GRADE pass operates: display space, sRGB-encoded, 0..1. The grain uses
 * gl_FragCoord and the SAME hash the grade uses, so the noise field is CONTINUOUS across the
 * gun/world silhouette instead of stopping dead at it — which is the tell ART.md 6.1.1 names.
 *
 * One shared uniform block and one CONSTANT customProgramCacheKey across all four standard
 * materials, so they still share exactly ONE compiled program (CFG.render.budget.programsMax;
 * a cache key that varies per instance is how CINDERBLOOM spent 55 s compiling shaders).
 * The reticle and the flash are deliberately NOT graded: they are toneMapped:false emissives
 * and the vignette at screen centre is nil anyway.
 *
 * GLSL laws honoured: no backtick anywhere inside the literal, and no identifier named
 * flat, half or sat.
 */
// CALIBRATED, not assumed. Set to CFG.render.grade.grain the gun's grain measured 2.4-2.8x
// stronger than the grade's on the world at the SAME nominal amplitude — the two shaders add
// the identical term, (hash - 0.5) * amplitude, in the identical display space, and the reason
// for the gap is somewhere in shader precision that a fifth measurement run would not be worth.
// So it is calibrated against the world instead of argued about. Method: mean |px - mean of its
// 4 neighbours| through a fixed mask, grain off vs grain on, one frame, nothing else moved.
//
//   uVmGrain   gun HF rise /255   gun rise : world rise (world rise = 2.244 at grain 0.035)
//     0.035          6.201                2.76
//     0.020          3.927                1.75
//     0.013          2.871                1.28
//     0.010          2.440                1.09
//
// Expressed as a FRACTION of the grade's grain so it tracks if the integrator retunes
// CFG.render.grade.grain, which is the number this is trying to match.
const VM_GRAIN_MATCH = 0.34;

const VM_GRADE_HELPERS = /* glsl */`
  float vmHash12(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float vmBayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
  float vmBayer4(vec2 a) { return vmBayer2(0.5 * a) * 0.25 + vmBayer2(a); }
  float vmHash13(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vmNoise3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mix(vmHash13(i), vmHash13(i + vec3(1.0, 0.0, 0.0)), f.x);
    float b = mix(vmHash13(i + vec3(0.0, 1.0, 0.0)), vmHash13(i + vec3(1.0, 1.0, 0.0)), f.x);
    float c = mix(vmHash13(i + vec3(0.0, 0.0, 1.0)), vmHash13(i + vec3(1.0, 0.0, 1.0)), f.x);
    float d = mix(vmHash13(i + vec3(0.0, 1.0, 1.0)), vmHash13(i + vec3(1.0, 1.0, 1.0)), f.x);
    return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
  }
`;

/* r3: THE SURFACE. Every part was one flat colour, so the steel read as dark painted plastic and
 * the stock as brown card. Per material (uVmSurf): WOOD (1) gets grain, fine dark lines running
 * the length of the gun, wandering a little, over a slow figure of lighter and darker wood, and
 * a satin sheen where the grain is tight; STEEL (2) gets a fine breakup of its roughness and a
 * few percent of its colour, so light moves across it the way it does on worn bluing instead of
 * sliding off one smooth sheet. It is keyed on the part's own position (vFinishPosition, which
 * finishes.js already carries), so it holds still on the gun as the gun moves. The hands, the
 * pour rig, the glass and the dot are 0: untouched. */
const VM_SURF_COLOR = /* glsl */`
  float vmSurfaceGrain = 0.0;
  float vmSurfaceWear = 0.5;
  float vmSurfaceHeight = 0.0;
  if (uVmSurf > 0.5) {
    vec3 sp = vFinishPosition;
    float footprint = max(length(dFdx(sp)), length(dFdy(sp)));
    float detailFade = 1.0 - smoothstep(0.0003, 0.0018, footprint);
    if (uVmSurf < 1.5) {
      float wav = vmNoise3(sp * vec3(9.0, 9.0, 2.2)) * 0.020 + vmNoise3(sp * vec3(40.0, 40.0, 7.0)) * 0.004;
      float lines = sin((sp.y * 0.92 + sp.x * 0.39 + wav) * 1150.0);
      float grain = smoothstep(0.55, 1.0, lines);
      float figure = vmNoise3(sp * vec3(26.0, 26.0, 5.0));
      float fibre = vmNoise3(sp * vec3(850.0, 850.0, 28.0));
      vmSurfaceGrain = grain;
      vmSurfaceWear = figure;
      vmSurfaceHeight = (fibre - 0.5) * 0.000065 * detailFade - grain * 0.00009;
      diffuseColor.rgb *= mix(1.13, 0.82, figure) * (1.0 - 0.22 * grain);
      diffuseColor.rgb *= vec3(1.04, 1.0, 0.94);
    } else {
      float broad = vmNoise3(sp * 46.0);
      float machining = vmNoise3(sp * vec3(930.0, 930.0, 25.0));
      vmSurfaceWear = broad;
      vmSurfaceGrain = machining;
      vmSurfaceHeight = (machining - 0.5) * 0.000012 * detailFade;
      diffuseColor.rgb *= mix(0.89, 1.12, broad) * (1.0 + (machining - 0.5) * 0.055 * detailFade);
    }
  }
`;
// Pores and retained oil interrupt a satin highlight. A uniformly near-one
// roughness erased the difference between blued steel, wood and rubber.
const VM_SURF_ROUGH = /* glsl */`
  if (uVmSurf > 1.5) {
    roughnessFactor = clamp(roughnessFactor + (vmSurfaceWear - 0.5) * 0.13 + (vmSurfaceGrain - 0.5) * 0.055, 0.34, 0.96);
  } else if (uVmSurf > 0.5) {
    roughnessFactor = clamp(roughnessFactor + vmSurfaceGrain * 0.12 - (1.0 - vmSurfaceWear) * 0.06, 0.40, 0.94);
  }
`;

const VM_GRADE_TAIL = /* glsl */`
  if (uVmOn > 0.5) {
    vec3 vmCol = gl_FragColor.rgb;
    float vmLum = dot(vmCol, vec3(0.2126, 0.7152, 0.0722));
    vec3 vmCurved = (vmCol - 0.5) * uVmContrast + 0.5;
    vmCol = mix(vmCol, vmCurved, smoothstep(uVmContrastFrom, uVmContrastTo, vmLum));
    float vmHi = smoothstep(0.28, 0.88, vmLum);
    vmCol = mix(vmCol * vec3(0.90, 0.95, 1.07), vmCol * vec3(1.07, 1.01, 0.90), vmHi);
    vmCol += vec3(1.0, 0.72, 0.42) * smoothstep(0.66, 1.10, vmLum) * 0.02;
    vmCol = max(vmCol, vec3(uVmBlackFloor));
    vec2 vmP = gl_FragCoord.xy / max(uVmResolution, vec2(1.0)) - 0.5;
    vmCol *= 1.0 - uVmVignette * smoothstep(0.22, 0.86, length(vmP));
    float vmG = vmHash12(gl_FragCoord.xy + vec2(uVmTime * 61.0, uVmTime * 37.0));
    vmCol += (vmG - 0.5) * uVmGrain;
    vmCol += (vmBayer4(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(max(vmCol, 0.0), gl_FragColor.a);
  }
`;

/* ---------------- interpolated spring channel layout ---------------- */
const C = {
  KP_X: 0, KP_Y: 1, KP_Z: 2, KR_X: 3, KR_Y: 4, KR_Z: 5,
  AL_X: 6, AL_Y: 7, AL_Z: 8, LL_X: 9, LL_Y: 10, LL_Z: 11,
  DIP: 12, JOLT: 13, BOLTS: 14, SPRINT: 15, ADS: 16,
  BOLTZ: 17, MAG_Y: 18, MAG_X: 19, MAG_RZ: 20,
  SWING: 21, LIFT: 22, RELOADW: 23, BOB: 24, MAGVIS: 25,
  SWAP: 26,                                   // ROUND 5: 0..1 how far the gun is lowered
  LOWER:27,N:28,
};

/* ---------------- module scratch. present/step allocate nothing. ------- */
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _fwd = new THREE.Vector3();
const _rgt = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _S = new Float64Array(C.N);             // the interpolated frame
const _rayO = { x: 0, y: 0, z: 0 };            // r3: the brass floor ray (_floorUnder)
const _DOWN = Object.freeze({ x: 0, y: -1, z: 0 });
const _ZERO = Object.freeze({ x: 0, y: 0, z: 0 });

export class Viewmodel {
  static id = 'viewmodel';

  constructor(ctx) {
    this.ctx = ctx;
    this.rng = ctx.rng.fork('viewmodel-flash');
    this.brassRng = ctx.rng.fork('viewmodel-brass');

    this.scene = new THREE.Scene();
    const aspect = (ctx.canvas && ctx.canvas.clientWidth)
      ? ctx.canvas.clientWidth / Math.max(1, ctx.canvas.clientHeight)
      : 16 / 9;
    this.camera = new THREE.PerspectiveCamera(FOV_HIP, aspect, 0.01, 6);

    // The pose lives on the INSTANCE, not in the module consts, so it can be swept live in one
    // browser session instead of one rebuild per candidate. Every field is pre-allocated here
    // and only written by setPose(); present() reads them and allocates nothing.
    this.restPos = REST_POS.clone();
    this.restRot = REST_ROT.clone();
    this.adsPos = new THREE.Vector3();
    this.vmScale = VM_SCALE;
    this.fovHip = FOV_HIP;
    this.fovAds = FOV_ADS;
    // ROUND 5: the selected gun's own anchors, copied out of POSES by _selectGun().
    this.sight = new THREE.Vector3();
    this.adsDist = 0.155;
    this.muzzle = new THREE.Vector3();
    this.guns = {};                 // id -> { group, bolt, dot, mag, pose }
    this.cur = null;
    this.curId = '';

    this._buildLights();
    this._buildGun();
    this._buildFlash();
    this._buildBrass();
    this._selectGun('bolt');        // pose, anchors and visibility for the M0 gun

    /* ---- springs. VIGIL's freq/damping pairs, except the kick (THE KICK, above). ---- */
    this.kickPos = new Spring3(KICK_POS.f, KICK_POS.z);
    this.kickRot = new Spring3(KICK_ROT.f, KICK_ROT.z);
    { const R = (this.cur && this.cur.pose.kick && this.cur.pose.kick.rot) || KICK_ROT; for (const sp of [this.kickRot.x, this.kickRot.y, this.kickRot.z]) { sp.w = TAU * R.f; sp.z = R.z; } }
    this.angLag = new Spring3(6.5, 0.72);
    this.linLag = new Spring3(7.0, 0.80);
    this.landDip = new Spring(DIP_SPRING.f, DIP_SPRING.z);
    this.jolt = new Spring(JOLT_SPRING.f, JOLT_SPRING.z);    // THE HANDS AT WORK (was 13 Hz)
    this.boltS = new Spring(22, 0.30);

    this.prevS = new Float64Array(C.N);
    this.currS = new Float64Array(C.N);

    this.sprintT = 0;
    this.boltAnim = 99;                // s since the last shot, drives the throw
    this.prevYaw = 0; this.prevPitch = 0; this._seeded = false;
    this.magDropT = -1; this.magRiseT = -1;
    this.flashT0 = -99; this.flashAds = 0;
    this.pendingBrass = [];            // fixed capacity; see _queueBrass
    this._brassSlots = 0;
    this.muzzleHandle = null;
    this.muzzleGen = -1;
    this.renderedFrame = -1;
    this._openHold = false;            // r3: an empty reload keeps the bolt back until it closes it
    this._closeT = 99;                 // s since the held-back bolt was released
    this._climb = 0;                   // r3: the carbine's walk up the burst (CLIMB_MAX)
    this._brassLand = { x: 0, y: 0, z: 0, speed: 0, soft: 0, shell: false };   // 'brass:land', reused
    this._flashLight = 46;             // the selected gun's world flash (POSES.*.flash.light)
    this._flashJit = 1;                // this shot's flash size, 0.88..1.12
    this._smokeN = 0;
    this._cylFrom = 0; this._cylAng = 0; this._cylT = 99;   // r3: the revolver's cylinder turning on
    this._hammerT = 99;                                        // r3: s since the hammer fell

    // A hard landing dips the gun: up to 16 mm and 1.3 degrees (it was 0.7 mm, THE HANDS AT WORK).
    ctx.bus.on('player:land', (p) => {
      const sp = (p && p.speed) || 0;
      this.landDip.nudge(-clamp(sp * 0.030, 0, 0.42) * 2.2 * DIP_GAIN);
    });

    // The gun draws AFTER the world and after post, with depth cleared. Nothing
    // in this module can make that happen on its own — post.js owns the final
    // composite. Register here so the gfx owner has a hook that needs no
    // knowledge of us; the matching request is filed in docs/HANDOFF.md.
    if (!ctx.overlays) ctx.overlays = [];
    ctx.overlays.push(() => this.render());
  }

  /* ------------------------------------------------------------------ */

  /** Scale is on the GUN group, about the action, so the camera-space pose stays in metres. */
  _applyPose() {
    this.gun.scale.setScalar(this.vmScale);
    adsPosFor(this.sight, this.adsDist, this.vmScale, this.adsPos);
  }

  /**
   * ROUND 5: put weapon `id` in the frame. The other gun's group goes visible = false (it
   * stays in the scene, in the same material instances, so nothing compiles), the pose
   * anchors are copied out of POSES, and the flash meshes move to the new crown. Called from
   * step() the step vmState.weapon changes — which weapon.js does at the bottom of the swap.
   */
  _selectGun(id) {
    const g = this.guns[id];
    if (!g || g === this.cur) return;
    if (this.cur) this.cur.group.visible = false;
    this.cur = g; this.curId = id;
    g.group.visible = true;
    const P = g.pose;
    this.restPos.copy(P.rest);
    this.restRot.copy(P.rot);
    this.vmScale = P.scale;
    this.sight.copy(P.sight);
    this.adsDist = P.adsDist;
    this.muzzle.copy(P.muzzle);
    this.bolt = g.bolt;
    this.dot = g.dot;
    this._applyPose();
    if (this.flashCore) this.flashCore.position.copy(this.muzzle);
    if (this.flashCone) this.flashCone.position.set(this.muzzle.x, this.muzzle.y, this.muzzle.z - 0.14);
    this._flashLight = P.flash ? P.flash.light : 46;
    // THE WEIGHT: this gun's muzzle spring (the springs exist after the constructor's first select).
    if (this.kickRot) {
      const R = (P.kick && P.kick.rot) || KICK_ROT;
      for (const sp of [this.kickRot.x, this.kickRot.y, this.kickRot.z]) { sp.w = TAU * R.f; sp.z = R.z; }
    }
  }

  /**
   * Sweep door for the size/placement measurement. Accepts any subset of
   * { x, y, z, scale, fovHip, fovAds } and is the reason the table in docs/HANDOFF.md is
   * measured rather than argued: one boot, one rAF per candidate. Nothing in the game calls
   * it; it exists for tools and for the next owner who has to re-derive this pose.
   */
  setPose(p) {
    if (!p) return;
    if (typeof p.x === 'number') this.restPos.x = p.x;
    if (typeof p.y === 'number') this.restPos.y = p.y;
    if (typeof p.z === 'number') this.restPos.z = p.z;
    if (typeof p.scale === 'number') this.vmScale = p.scale;
    if (typeof p.fovHip === 'number') this.fovHip = p.fovHip;
    if (typeof p.fovAds === 'number') this.fovAds = p.fovAds;
    this._applyPose();
  }

  /**
   * ART.md 6.1.1, lane-local half. Give one MeshStandardMaterial the same display-space grade
   * post.js applies to the world, inserted where three has already encoded to sRGB.
   *
   * The uniform objects are SHARED between every material this is called on, so one write in
   * present() reaches all of them and they still compile to one program. customProgramCacheKey
   * is a constant string for exactly the same reason.
   *
   * setGraded(false) turns it off with a uniform write and no recompile: it is the door for
   * the gfx owner, because once the overlay hook moves inside the composer (the HANDOFF
   * request) the world's own grade pass covers the gun and this would double-apply.
   */
  _grade(mat) {
    delete mat.userData.finishUniforms;
    delete mat.userData.finishOriginal;
    if (!this._gradeU) {
      const G = CFG.render.grade;
      this._gradeU = {
        uVmTime: { value: 0 },
        uVmResolution: { value: new THREE.Vector2(1, 1) },
        uVmContrastFrom: { value: G.contrastFrom },
        uVmContrastTo: { value: G.contrastTo },
        uVmContrast: { value: G.contrast },
        uVmBlackFloor: { value: G.blackFloor },
        uVmGrain: { value: G.grain * VM_GRAIN_MATCH },
        uVmVignette: { value: G.vignette },
        uVmOn: { value: 1 },            // r3: the whole lane-local grade, on or off (setGraded)
      };
      this._gradeOn = true;
      this._bufSize = new THREE.Vector2(1, 1);
    }
    const U = this._gradeU;
    // r3: THE SURFACE, per material (VM_SURF_*). A uniform, not a define, so every material in
    // this scene still shares the one program.
    if (!mat.userData.vmSurf) mat.userData.vmSurf = { value: 0 };
    const surf = mat.userData.vmSurf;
    mat.onBeforeCompile = (shader) => {
      for (const k in U) shader.uniforms[k] = U[k];
      shader.uniforms.uVmSurf = surf;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>',
          '#include <common>\n' +
          'uniform float uVmTime, uVmContrastFrom, uVmContrastTo, uVmContrast;\n' +
          'uniform float uVmBlackFloor, uVmGrain, uVmVignette, uVmOn, uVmSurf;\n' +
          'uniform vec2 uVmResolution;\n' + VM_GRADE_HELPERS + '\n' + SURFACE_RELIEF_GLSL)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + VM_SURF_COLOR)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + VM_SURF_ROUGH)
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = countyReliefNormal(-vViewPosition, normal, vmSurfaceHeight);')
        .replace('#include <colorspace_fragment>',
          '#include <colorspace_fragment>\n' + VM_GRADE_TAIL);
    };
    // CONSTANT, and identical across all four materials: they share one program.
    mat.customProgramCacheKey = () => 'curfew-vm-machined-3';
    finishMaterial(mat, 0);
    mat.needsUpdate = true;
  }

  /** The gfx owner's door: turn the lane-local grade off if the gun moves inside the composer. */
  setGraded(on) {
    if (!this._gradeU) return;
    this._gradeOn = !!on;
    const G = CFG.render.grade;
    this._gradeU.uVmVignette.value = on ? G.vignette : 0;
    this._gradeU.uVmGrain.value = on ? G.grain * VM_GRAIN_MATCH : 0;
    this._gradeU.uVmContrast.value = on ? G.contrast : 1;
    this._gradeU.uVmBlackFloor.value = on ? G.blackFloor : 0;
    this._gradeU.uVmOn.value = on ? 1 : 0;
  }

  _buildLights() {
    // These live in the VIEWMODEL scene. They are not part of the world light
    // census (a different scene compiles a different set of programs), and
    // like the census they are allocated once, at boot, and never added to.
    //
    // THE EXPOSURE TRAP THESE NUMBERS EXIST TO ANSWER. The gun renders after post with
    // the depth buffer cleared, so it never passes through the grade — no contrast curve,
    // no black floor, no vignette. Only ACES at CFG.render.exposure touches it, and ACES
    // multiplies by exposure/0.6, which is 1.9x before the curve even starts. The world
    // is graded down; the gun was not, so the gun won every frame.
    //
    // MEASURED, not guessed (tests/shots/art-spawn.png, sampled inside the viewmodel's own
    // silhouette, Rec.709 luma on the sRGB frame):
    //   before: mean 30.1, max 243, 5.2% of the gun's pixels at or above 200
    //   after:  mean 18.2, max 136, 0.0% at or above 200
    // The same frame's world reads mean 20.0 in the midground and 35.6 in the lit
    // foreground, so the gun is now the darkest large shape on screen instead of the
    // brightest — which is the whole ask. The 243s were not a glow: they were entire FLAT
    // FACES of the receiver sitting at the peak of a roughness-0.33 specular lobe, which
    // is what made it read as a paper cutout rather than metal. Roughness is the lever
    // that moved it; key intensity alone moved the mean and left the blowout at 243,
    // because ACES had already saturated it.
    // ROUND TWO (ART.md 6.1), and it found something the first round could not have guessed.
    // Differential-masking each light in turn, frame A, gun pixels only:
    //
    //   rim 1.10 -> 0     gun mean 17.5 -> 1.6, p95 102.1 -> 4.2   <-- the ENTIRE gun
    //   key 1.25 -> 0     gun mean 17.5 -> 15.9
    //   ambient 2.2 -> 0  gun mean 17.5 -> 17.3
    //   fill 0.46 -> 0    gun mean 17.5 -> 17.3
    //
    // Every readable pixel on this gun was ONE near-mirror specular hit. The rim sits at
    // N.H = 0.992 on the receiver's top plate — 7 degrees off the perfect reflection of the
    // eye — so that one flat face collected the whole lobe and read 125 while the body read
    // 1.9. Turning the rim down fixes the 125 and leaves a hole in the frame; the first
    // round could only trade one for the other, which is why it stopped at 125.
    //
    // The fix is to REDISTRIBUTE: spread the lobe with roughness (see _buildGun) and let a
    // real directional key carry the body in DIFFUSE, which is also the only thing that can
    // give the gun a lit side and a shadow side instead of one blown face on a black slab.
    // Measured, frame A, gun pixels, hip / ADS:
    //
    //                              mean    p50    p95    max
    //   shipped (round one)   hip  17.5    1.9  102.1    125
    //   this                  hip  14.6    5.7   44.8   58.8
    //   shipped (round one)   ADS   8.5    1.9   33.1   66.4
    //   this                  ADS  12.8    5.9   28.2   34.1
    //
    // The dark half comes UP (p50 1.9 -> 5.7: the body now has a value at all) and the bright
    // end comes DOWN by 2.3x. Gate row 14 is p95 <= 60 and max <= 90 in both poses.
    //
    // The key is 2.6 again, which was its value before round one. That is NOT a revert of
    // round one's work: round one moved key AND roughness together and kept the metalness,
    // and it was the roughness that did the work. Roughness goes further here (0.64 -> 0.84)
    // and metalness comes down (0.62 -> 0.40) so the diffuse the key delivers can be seen.
    // With key at 2.6 and roughness still at 0.64 the gun measures 125, exactly as before.
    const key = new THREE.DirectionalLight(0xbecfe8, 2.6);   // moon-coloured [CFG.lights.moon]
    key.position.set(-0.5, 0.9, 0.55);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x3d4c6e, 0.46); // [CFG.lights.hemi.sky]
    fill.position.set(0.45, -0.6, 0.35);
    this.scene.add(fill);
    // The rim is the one light that goes UP. It is what draws the specular EDGE along the
    // barrel and the scope rings, and the edge is the only thing telling the player the
    // black shape in front of them is metal and not a hole in the frame. Its INTENSITY and
    // DIRECTION are unchanged on purpose: a rim swung sideways to miss the receiver plate
    // was clean at the hip (max 60.9) and blew to 142.9 at ADS, because a light fixed in
    // camera space finds some surface's mirror angle in some pose. The lobe is widened in
    // the material instead, which is pose-independent.
    const rim = new THREE.DirectionalLight(0x8fa4c4, 1.10);
    rim.position.set(0.3, 0.25, -0.8);
    this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight(0x2a3648, 4.0));   // [CFG.lights.ambient]
    // The near-field flash light, in the gun's own scene. Position is set 7 cm
    // ahead of the crown every frame (THE CINDERBLOOM CLAMP, top of file).
    this.viewFlash = new THREE.PointLight(0xffc27a, 0, 4, 2);
    this.scene.add(this.viewFlash);
    // YOUR TORCH ON YOUR OWN HANDS (r3 polish). The torch is a WORLD light and the gun is drawn
    // in this scene, so the gun's pixels were identical with the torch on and off, and gloves
    // held in its beam stayed moon-grey against a wall it had lit warm (r3 critic). This is the
    // torch's stand-in here: its colour, cone and lagging aim, from TORCH_AT, with no distance
    // falloff (decay 0), so a butt plate 7 cm from the eye gets what a muzzle 60 cm away gets
    // and THE CINDERBLOOM CLAMP has nothing to bite. It exists from boot at intensity 0, so it
    // is in every viewmodel program from the first compile and the torch switch never links a
    // shader. present() copies the torch's live intensity, flicker and blackout included.
    const T = CFG.lights.torch;
    this.torchFill = new THREE.SpotLight(0xffeccb, 0, 0, T.angle, T.penumbra, 0);
    this.torchFill.position.copy(TORCH_AT);
    this.torchFill.target.position.set(TORCH_AT.x, TORCH_AT.y, TORCH_AT.z - 1);
    this.scene.add(this.torchFill, this.torchFill.target);
  }

  /** The torch stand-in follows the real torch: its intensity, its cone and its lagging aim. */
  _presentTorch() {
    const L = this._sys('lights'), T = L && L.torch, wc = this.ctx.camera, F = this.torchFill;
    if (!T || !wc || (L.torchIsHeadlamp && L.torchIsHeadlamp())) { F.intensity = 0; return; }
    F.intensity = VM_TORCH * T.intensity / CFG.lights.torch.hot;
    if (F.intensity <= 0) return;
    if (F.angle !== T.angle) F.angle = T.angle;
    // lights.js damps the torch's target toward the look, so the beam trails a fast turn.
    // Carry that into camera space so the gun is lit from where the beam actually points.
    _v2.subVectors(T.target.position, T.position);
    if (_v2.lengthSq() < 1e-8) _v2.set(0, 0, -1);
    else _v2.transformDirection(_m.extractRotation(wc.matrixWorld).transpose());
    F.target.position.copy(F.position).add(_v2);
  }

  _buildGun() {
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.gun = new THREE.Group();
    this.root.add(this.gun);

    // Every MeshStandardMaterial here shares one feature set on purpose, so they share one
    // compiled program. The whole-page program budget lives in exactly one place —
    // CFG.render.budget.programsMax — and is measured by the integrator; nothing in this
    // file asserts a number of its own.
    //
    // Dark bluing, oiled walnut and rubber have different highlight widths.
    // Small worn steel edges supply restrained mechanical definition; the key,
    // rim and torch intensities remain shared with the existing weapon rig.
    const wood = new THREE.MeshStandardMaterial({ color: 0x684126, roughness: 0.68, metalness: 0.00 });
    const blued = new THREE.MeshStandardMaterial({ color: 0x2b3540, roughness: 0.57, metalness: 0.52 });
    const matte = new THREE.MeshStandardMaterial({ color: 0x20272e, roughness: 0.79, metalness: 0.08 });
    const brassM = new THREE.MeshStandardMaterial({ color: 0x7a5a24, roughness: 0.42, metalness: 0.80 });
    const edgeSteel = new THREE.MeshStandardMaterial({ color: 0x56616a, roughness: 0.42, metalness: 0.68 });
    this._mats = [wood, blued, matte, brassM, edgeSteel];
    for (const m of this._mats) this._grade(m);
    // r3: the surfaces (VM_SURF_*), and how much of the night sky each one gives back once the
    // scene has the world's reflection map (init()).
    wood.userData.vmSurf.value = 1; blued.userData.vmSurf.value = 2; matte.userData.vmSurf.value = 2; edgeSteel.userData.vmSurf.value = 2;
    wood.envMapIntensity = 0.38; blued.envMapIntensity = 1.0; matte.envMapIntensity = 0.38; brassM.envMapIntensity = 1.0; edgeSteel.envMapIntensity = 0.82;
    this._finishMats = [...this._mats];
    for (let i=0;i<this._finishMats.length;i++) this._finishMats[i].userData.finishUniforms.uFinishStrength.value = i===2?.72:i===3?.48:1;
    edgeSteel.userData.finishUniforms.uFinishStrength.value = 0.46;
    // A visible alternating grip communicates the held-Space movement without a tutorial.
    this.climbHands=[];
    const handMaterials=climbingHandMaterials();
    for(const mat of Object.values(handMaterials)){this._grade(mat);this._mats.push(mat);}
    for(const side of [-1,1]){
      const hand=buildClimbingHand(side,handMaterials);hand.visible=false;
      this.root.add(hand);this.climbHands.push(hand);
    }
    // THE POUR RIG (the Eleven rewire). Shown by world/gas.js while a can of gas goes into
    // the car, exactly the way the climbing hands are shown while you are on a wall: the gun
    // goes away, this comes up, and nothing about the camera or the feet is taken.
    this.pourRig=buildPourRig();
    for(const mat of this.pourRig.materials){this._grade(mat);this._mats.push(mat);}
    this.root.add(this.pourRig.root);
    this.pouring=false;
    const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); parent.add(mesh);
      return mesh;
    };
    // Barrel and scope silhouettes use smooth radial normals. Edge rings and bevels
    // carry the machining detail without turning the optic into a ten-sided tube.

    // THE SIXTH ARGUMENT IS `openEnded` AND IT DEFAULTS TO FALSE, so every "tube" on this
    // gun was a SEALED CYLINDER with a lid on each end. Alex, playtest 3: "i can't look down
    // whatever its called. the guns sights. because when i use the iron sites or whatever, it
    // it just block and i cant see through it. there a dot on it. but the spot where you would
    // see through is black." That black spot is the scope tube's rear cap, 3.5 mm behind the
    // aiming dot, and it had been there for the whole life of the file — an earlier round even
    // found the cap while chasing an invisible dot, moved the DOT in front of it, and left the
    // lid in place. Aiming down the sights is a core verb of a first-person game and it was
    // looking at a wall.
    const tube = (r, len, seg = 10, open = false) => {
      const g = new THREE.CylinderGeometry(r, r, len, Math.max(32, seg), 1, open);
      g.rotateX(Math.PI / 2);
      return g;                              // continuous steel highlight, smooth circular silhouette
    };

    // ART.md 6.1.2 — break the flat. A BoxGeometry face has ONE normal across its whole area,
    // so it enters and leaves a specular lobe all at once and reads as a cutout rather than as
    // metal. This is the same box with a 3 degree ridge down the top face: two normals meeting
    // at a shared centre column, so the highlight is a GRADIENT across the plate. Four extra
    // triangles. computeVertexNormals averages at the ridge on purpose — a hard crease would
    // just be two cutouts instead of one.
    const ridgedBox = (w, h, d, deg) => {
      const geo = new THREE.BoxGeometry(w, h, d, 2, 1, 1);
      const pos = geo.attributes.position;
      const rise = (w * 0.5) * Math.tan(deg * DEG);
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getY(i) - h * 0.5) < 1e-6 && Math.abs(pos.getX(i)) < 1e-6) {
          pos.setY(i, h * 0.5 + rise);
        }
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    };

    // Shared port shadow, coated glass and amber dot on both rifle optics.
    this._portMat = new THREE.MeshBasicMaterial({ color: 0x04060a });
    this._glassMat = new THREE.MeshStandardMaterial({
      color: 0x315d66, roughness: 0.20, metalness: 0.32,
      transparent: true, opacity: 0.12, depthWrite: false,
      side: THREE.DoubleSide, envMapIntensity: 1.5,
    });
    this._grade(this._glassMat);
    this._mats.push(this._glassMat);
    this._dotMat = new THREE.MeshBasicMaterial({
      // Six percent under the Round-8 value: the old 125-luma peak missed the 120 ceiling
      // while the dot's footprint/readability already passed.
      color: new THREE.Color(0.300, 0.086, 0.015), toneMapped: false,
      transparent: true, opacity: 1.0, depthWrite: false, side: THREE.DoubleSide,
    });
    // Both guns hang off this.gun (the pose/scale group). Each gets its own child group so
    // one line toggles which is in the frame.
    const boltGroup = new THREE.Group();
    boltGroup.name = 'vm-bolt-rifle';
    this.gun.add(boltGroup);
    const carbineGroup = new THREE.Group();
    carbineGroup.name = 'vm-carbine';
    carbineGroup.visible = false;
    this.gun.add(carbineGroup);
    this.guns.bolt = this._buildBolt(boltGroup, { add, tube, ridgedBox, wood, blued, matte, edgeSteel });
    this.guns.carbine = this._buildCarbine(carbineGroup, { add, tube, ridgedBox, blued, matte, brassM });
    // ROUND 6: the two rewards that had no picture. Same four materials, same kit.
    const shotgunGroup = new THREE.Group();
    shotgunGroup.name = 'vm-shotgun';
    shotgunGroup.visible = false;
    this.gun.add(shotgunGroup);
    this.guns.shotgun = this._buildShotgun(shotgunGroup, { add, tube, ridgedBox, wood, blued, matte, brassM });
    const revolverGroup = new THREE.Group();
    revolverGroup.name = 'vm-revolver';
    revolverGroup.visible = false;
    this.gun.add(revolverGroup);
    this.guns.revolver = this._buildRevolver(revolverGroup, { add, tube, ridgedBox, wood, blued, matte, brassM });

    // r3: DRAW CALLS. Every part was its own mesh: the bolt rifle 28 draws, the carbine 51, the
    // shotgun 23, the revolver 22, every frame, for a thing that never comes apart. The parts that
    // do not move are merged into one mesh per material per gun; the moving ones (the bolt, the
    // pump, the magazine, the cylinder, the hammer) and the sight dots stay their own.
    for (const id in this.guns) {
      const r = this.guns[id];
      this._mergeStatic(r.group, new Set([r.bolt, r.mag, r.cyl, r.dot].filter(Boolean)));
      // NO HANDS ON THE GUN. An in-flight version of this put a bare forearm and a fist on
      // every weapon; Alex's read was "I cannot tell what is going on with it", and he is
      // the only instrument that counts here. It was never in a build he played, so taking
      // it out is not a regression - it restores the gun he knows. src/weapons/weapon-hands.js
      // and its wiring are in commit 951cc9d if anyone wants to finish the idea properly,
      // which means gloves and a sleeve, not a naked hand.
    }

    // Nothing on a viewmodel may ever be frustum-culled: the gun sits inside
    // the near plane's shadow and three's bounding-sphere test gets it wrong.
    this.gun.traverse(o => { o.frustumCulled = false; });
  }

  /** Merge every mesh under `g` that is not (under) something in `keep` into one mesh per material. */
  _mergeStatic(g, keep) {
    this.root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const rel = new THREE.Matrix4();
    const byMat = new Map(), gone = [];
    g.traverse((o) => {
      if (!o.isMesh || o.renderOrder !== 0) return;
      for (let q = o; q && q !== g; q = q.parent) if (keep.has(q)) return;
      rel.multiplyMatrices(inv, o.matrixWorld);
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(rel);
      for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
      geo.clearGroups();
      let list = byMat.get(o.material);
      if (!list) byMat.set(o.material, (list = []));
      list.push(geo);
      gone.push(o);
    });
    for (const o of gone) { o.parent.remove(o); o.geometry.dispose(); }
    for (const [mat, list] of byMat) {
      const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (list.length > 1) for (const q of list) q.dispose();
      const m = new THREE.Mesh(merged, mat);
      m.name = 'vm-merged';
      g.add(m);
    }
  }

  /** The M0 bolt rifle. Returns the per-weapon record and original pose anchors. */
  _buildBolt(g, K) {
    const { add, tube, wood, blued, matte, edgeSteel } = K;
    // r3: a sporting rifle, not a stack of boxes. The receiver is rounded; the barrel tapers from
    // 27 mm at the receiver to 19 mm at the muzzle and lies in a channel in the fore-end; the
    // stock is ONE piece drawn in profile, with a comb, a pistol grip and a rubber pad; the guard
    // is a bow whose ends meet the bottom metal and the grip. Nothing here is on the sight line.
    add(g, roundBar(0.050, 0.062, 0.235, 0.010), blued, 0, 0, -0.045);            // receiver
    {
      const b = new THREE.CylinderGeometry(0.0135, 0.0095, 0.42, 32, 1);          // top = the breech end
      b.rotateX(Math.PI / 2);
      add(g, b, blued, 0, 0.014, -0.375);
    }
    add(g, tube(0.0112, 0.012), blued, 0, 0.014, -0.5790);                       // the crown
    add(g, bevelBox(0.0045, 0.014, 0.010), blued, 0, 0.0322, -0.566);            // front blade, on the crown
    // the fore-end: a channel for the barrel, a belly that deepens toward the action, a rounded tip
    add(g, profile(0.040, 0.005, (sh) => {
      sh.moveTo(-0.098, 0.002); sh.lineTo(-0.415, 0.002);
      sh.quadraticCurveTo(-0.432, 0.001, -0.432, -0.012);
      sh.quadraticCurveTo(-0.431, -0.022, -0.410, -0.022);
      sh.lineTo(-0.180, -0.030); sh.lineTo(-0.110, -0.034); sh.lineTo(-0.098, -0.032);
      sh.lineTo(-0.098, 0.002);
    }), wood, 0, 0, 0);
    // the buttstock: tang, comb, heel, butt, belly, pistol grip, back under the action
    add(g, profile(0.044, 0.005, (sh) => {
      sh.moveTo(0.066, 0.014);
      sh.quadraticCurveTo(0.140, 0.020, 0.205, 0.012);
      sh.lineTo(0.252, 0.008); sh.lineTo(0.256, -0.064);
      sh.quadraticCurveTo(0.230, -0.068, 0.170, -0.050);
      sh.quadraticCurveTo(0.120, -0.040, 0.098, -0.048);
      sh.quadraticCurveTo(0.078, -0.060, 0.066, -0.084);
      sh.lineTo(0.046, -0.090);
      sh.quadraticCurveTo(0.026, -0.078, 0.020, -0.052);
      sh.lineTo(0.022, -0.030); sh.lineTo(0.066, -0.026); sh.lineTo(0.066, 0.014);
    }), wood, 0, 0, 0);
    add(g, roundBar(0.046, 0.080, 0.014, 0.008, 0.002), matte, 0, -0.028, 0.264);   // the recoil pad
    add(g, roundBar(0.036, 0.034, 0.090, 0.006), blued, 0, -0.040, -0.055);         // bottom metal
    {
      const guard = new THREE.TorusGeometry(0.0205, 0.0026, 8, 20, Math.PI);
      guard.rotateY(Math.PI / 2);
      add(g, guard, blued, 0, -0.050, -0.004, 0, 0, Math.PI);                    // the bow
    }
    add(g, bevelBox(0.006, 0.020, 0.005), blued, 0, -0.044, -0.008);   // trigger

    // the bolt: a group so the whole assembly throws back and forward
    const bolt = new THREE.Group();
    g.add(bolt);
    bolt.position.set(0, 0, 0);
    add(bolt, tube(0.0105, 0.120, 8), blued, 0.0, 0.021, -0.010);
    {
      // the handle: a round stem swept out and down from the bolt to a proper knob
      const stem = new THREE.CylinderGeometry(0.0034, 0.0042, 0.030, 12, 1);
      stem.rotateZ(Math.PI / 2 - 0.42);
      add(bolt, stem, blued, 0.021, 0.015, 0.032);
      add(bolt, new THREE.SphereGeometry(0.0100, 18, 12), blued, 0.035, 0.009, 0.032);   // knob
    }
    // ejection port shadow: a near-black sliver so the port reads as a HOLE and
    // the bolt's travel is legible against it in moonlight. (r3: lowered onto the flat of the
    // rounded receiver, where it used to stand 2 mm proud of the top edge.)
    add(g, bevelBox(0.002, 0.022, 0.070), this._portMat, 0.0255, 0.012, -0.010);
    // A machined port lip, tang fasteners and small retaining pins supply real
    // light-catching edges. They merge into one static hardware mesh below.
    add(g, roundBar(0.0018, 0.0018, 0.068, 0.0005, 0.0004), edgeSteel, 0.0256, 0.0231, -0.010);
    add(g, roundBar(0.0018, 0.0018, 0.068, 0.0005, 0.0004), blued, 0.0256, 0.0010, -0.010);
    for (const z of [-0.104, 0.050]) {
      const screw = add(g, new THREE.CylinderGeometry(0.0030, 0.0032, 0.0012, 16), edgeSteel, 0, 0.0320, z);
      screw.name = 'vm-receiver-fastener';
      add(g, bevelBox(0.0008, 0.00025, 0.0042), this._portMat, 0, 0.0327, z, 0, 0.22, 0);
    }
    for (const z of [-0.124, 0.053]) {
      add(g, tube(0.0023, 0.0012, 12), edgeSteel, 0.0252, -0.011, z, 0, Math.PI / 2, 0);
    }

    // scope. The reticle is a real illuminated dot: the gun has to be aimable
    // in a county with no daylight, and a black crosshair on a black hillside
    // is the working-but-illegible failure mode this project is named for.
    const SIGHT = POSES.bolt.sight;
    const sg = new THREE.Group();
    g.add(sg);
    sg.position.set(0, SIGHT.y, 0);
    // Open at both ends, and DoubleSide so the far half of the bore wall still renders —
    // with front-face culling an open tube shows the world through its own sides and reads as
    // a floating ring. This double-sided variant is present during boot warmup.
    const bore = matte.clone();
    bore.side = THREE.DoubleSide;
    bore.name = 'vm-bore';
    // clone() omits the shader hooks. Reinstall them so the optic receives the
    // same machined finish, grade and earned weapon finish as the receiver.
    this._grade(bore);
    bore.userData.vmSurf.value = 2;
    bore.userData.finishUniforms.uFinishStrength.value = 0.64;
    this._mats.push(bore);
    this._finishMats.push(bore);
    add(sg, tube(0.0195, 0.200, 12, true), bore, 0, 0, -0.045);
    add(sg, tube(0.0260, 0.048, 12, true), bore, 0, 0, -0.152);   // objective bell
    add(sg, tube(0.0225, 0.036, 12, true), bore, 0, 0, 0.026);    // ocular
    // The bells are open tubes round the main tube, so each end showed the gap between the two
    // as a paper-thin 'C' in every frame (r3 critic). A shoulder closes each end of that gap,
    // and a rolled lip gives the objective's open mouth and the eyepiece a wall to see.
    const shoulder = (r0, r1, z, back) => {
      const m = add(sg, new THREE.RingGeometry(r0, r1, 40, 1), bore, 0, 0, z);
      if (back) m.rotation.y = Math.PI;
      return m;
    };
    shoulder(0.0195, 0.0225, 0.044, false);    // ocular, the end that faces you
    shoulder(0.0195, 0.0225, 0.008, true);
    shoulder(0.0195, 0.0260, -0.128, false);   // objective, the end that faces you
    add(sg, new THREE.TorusGeometry(0.0250, 0.0014, 6, 40), blued, 0, 0, -0.176);
    add(sg, new THREE.TorusGeometry(0.0200, 0.0009, 6, 40), edgeSteel, 0, 0, 0.055);
    // The dioptre ring has fine raised flutes, with a narrow worn witness edge.
    // The original optical opening and sight axis are untouched.
    for (const z of [0.0135, 0.0375]) {
      add(sg, new THREE.TorusGeometry(0.0226, 0.00055, 5, 40), blued, 0, 0, z);
    }
    for (let i = 0; i < 40; i++) {
      const angle = i / 40 * TAU;
      add(sg, bevelBox(0.00125, 0.0008, 0.020), i % 5 === 0 ? edgeSteel : blued,
        Math.sin(angle) * 0.02255, Math.cos(angle) * 0.02255, 0.0255, 0, 0, -angle);
    }
    // r3: THE MOUNTS. Two blocks 16 mm tall used to stop 11 mm short of the receiver, so the
    // scope hung in the air over the rifle. Each is now a ring clamped round the tube and a base
    // that stands on the receiver (its top is 0.031; the scope's axis is SIGHT.y above the bore).
    for (const z of [-0.112, 0.004]) {
      add(sg, new THREE.TorusGeometry(0.0212, 0.0027, 8, 36), blued, 0, 0, z);
      add(sg, roundBar(0.020, 0.0235, 0.012, 0.003, 0.0015), blued, 0, 0.0305 + 0.0235 / 2 - SIGHT.y, z);
      for (const side of [-1, 1]) {
        add(sg, tube(0.0023, 0.0014, 12), edgeSteel, side * 0.0238, 0, z, 0, Math.PI / 2, 0);
      }
    }
    // The ocular glass. At 0.30 over a CLOSED tube this was simply a darker lid; over an
    // open bore it is what a coated lens actually is — a faint cool tint you see the county
    // through. depthWrite off so a transparent disc cannot punch the depth of the world
    // behind it, and it sits just inside the ocular rather than across the whole aperture.
    add(sg, new THREE.CircleGeometry(0.0180, 20), this._glassMat, 0, 0, 0.0435);
    // The dot sits ON the sight axis, so sightScreenOffset() measures the real ADS alignment
    // rather than an approximation of it.
    //
    // ART.md 6.2 is a do-not-break-it directive and the gate was ALREADY FAILING when this
    // round started. Measured, frame A, differential mask on the dot alone: it contributed
    // ZERO pixels at the hip and ZERO at full ADS, and the pixel the dot projects to at ADS
    // read luma 1.9. Nothing above 150 existed anywhere on the viewmodel.
    //
    // The cause is geometry, not material, and no amount of reading the material found it —
    // it took projecting the dot to a pixel and then reading that pixel. The main scope tube
    // is tube(0.0195, 0.200) centred at z -0.045, so it spans -0.145 .. +0.055, and
    // CylinderGeometry is CAPPED by default. The dot sat at +0.044: eleven millimetres INSIDE
    // a closed tube, behind an opaque matte lid, for the whole life of the file. It was also
    // exactly coplanar with the ocular's own rear cap at +0.044.
    //
    // Both faults are fixed by putting the dot 3.5 mm in FRONT of the outermost cap. It moves
    // 14.5 mm back along the optical axis, which at full ADS is a sub-pixel change in the
    // projected offset (tests/viewmodel.mjs allows 0.02 NDC; measured 0.0012 / 0.0029).
    // Opacity goes to 1.0 because at 0.85 over a black bore the dot lands at ~193 and the
    // gate is >= 200. depthWrite is off so a 16 px emissive disc cannot punch the depth
    // buffer of anything drawn after it.
    // ROUND THREE: the amount was wrong even though the fix was right. Color(3.2, 0.92, 0.16)
    // with toneMapped:false is 3.2 in a channel that clips at 1.0, so the dot did not read as
    // AMBER at all — it read as the clipped near-white of a blown highlight, and it measured
    //
    //   frame max 249.3, the single brightest pixel in the build, 65 gun pixels above 150
    //
    // against ART.md gate row 10 (frame max <= 160 torch off) and row 14 (viewmodel max <= 90).
    // ART.md 6.2 asks in the same breath for the dot to hold >= 200, which cannot be true at
    // the same time as either of them; 6.2's INTENT — "a black crosshair on a black hillside is
    // the failure mode this game is named for" — is a legibility floor, not a brightness floor,
    // and legibility is a RATIO (FETCH's law, ART.md 0.3). So the dot is set by ratio instead.
    //
    // Measured sweep, frame A, gun mask, at the pose above. k scales (3.2, 0.92, 0.16):
    //   k                     1.00     0.30     0.18     0.10
    //   dot peak, hip        239.1    183.0    140.9     93.0
    //   dot peak, ADS        250.0      —      155.1    100.9
    //   gun pixels > 150        47       34        0        0
    // k = 0.10 is chosen. It puts the peak at 93 hip / 101 ADS: row 14's ceiling to within the
    // width of one antialiased edge pixel, nothing on the weapon above 150 in either pose, and
    // the frame's brightest pixel handed back to the world where it belongs.
    //
    // It is still unmistakably ON, and that was checked by LOOKING and not only by measuring
    // (ART.md H.5): against a gun body at p50 6.0 it is a 15x amber bead, and it is BRIGHTEST
    // at ADS — exactly when it is the thing being used, because the HUD's own cone crosshair
    // (ui/hud.js, ART.md 6.2's "reticle") fades out as you aim. The two reads hand over.
    const DOT_Z = 0.0585;                     // scope tube rear cap is at +0.055
    const dot = add(sg, new THREE.CircleGeometry(0.0013, 10), this._dotMat, 0, 0, DOT_Z);
    dot.renderOrder = 5;

    return { group: g, bolt, boltZ0: bolt.position.z, dot, mag: null, pose: POSES.bolt };
  }

  /**
   * ROUND 5: the KV-7 CINDER carbine — the only gun Alex has held and blessed (DESIGN §0.16).
   * Geometry lifted piece by piece from the readable donor, in the SAME material instances
   * as the rifle (blued for anodized/steel, matte for polymer/ceramic, brass for the few
   * bright fittings) so no program links when it first appears:
   *   donor: C:/Users/Alex/Projects/vigil-handoff/vigil-enhanced/src/weapons/viewmodel.js:96-210
   * What is NOT lifted, on purpose: the cyan emissive conduit and the tinted magazine window
   * (each is a new material), the two gloved hands (the rifle has none; two guns with one
   * pair of hands between them would be the odd one), the chamfer helper (gfx/shapes.js is
   * VIGIL's; the rifle's ridgedBox breaks the flat the same way, ART.md 6.1.2), and the 13
   * rail slots and 10 vents (7 and 6 here — a viewmodel scene draw is a draw).
   */
  _buildCarbine(g, K) {
    const { add, tube, ridgedBox, blued, matte, brassM } = K;
    const B = (w, h, d) => bevelBox(w, h, d);

    // Upper/lower receiver, side armour, rear cap, top rail. donor :96-104
    add(g, ridgedBox(0.072, 0.076, 0.300, 3), blued, 0, 0.004, -0.075);
    add(g, B(0.066, 0.060, 0.130), matte, 0, -0.035, 0.012);
    add(g, B(0.068, 0.062, 0.030), blued, 0, -0.002, 0.086);
    for (const x of [-0.039, 0.039]) add(g, B(0.007, 0.052, 0.174), matte, x, 0.002, -0.066);
    add(g, ridgedBox(0.058, 0.012, 0.340, 3), blued, 0, 0.048, -0.090);
    for (let i = 0; i < 7; i++) add(g, B(0.056, 0.007, 0.017), matte, 0, 0.057, 0.055 - i * 0.046);

    // Right-side ejection port and chamber glint. donor :112-113
    add(g, B(0.003, 0.029, 0.078), this._portMat, 0.0405, 0.010, -0.052);
    add(g, B(0.0018, 0.015, 0.046), brassM, 0.0426, 0.012, -0.052);
    const sel = new THREE.CylinderGeometry(0.008, 0.008, 0.004, 12);
    sel.rotateZ(Math.PI / 2);
    add(g, sel, brassM, 0.042, -0.016, 0.056, 0, 0, 0.28);            // selector, donor :123-125

    // Handguard with inset panels and vents. donor :129-138
    add(g, ridgedBox(0.082, 0.074, 0.225, 3), matte, 0, 0.003, -0.325);
    add(g, B(0.054, 0.007, 0.178), blued, 0, 0.042, -0.318);
    add(g, B(0.054, 0.007, 0.164), blued, 0, -0.039, -0.318);
    for (const x of [-0.044, 0.044]) {
      add(g, B(0.006, 0.044, 0.172), blued, x, 0.002, -0.318);
      for (let i = 0; i < 3; i++) {
        add(g, B(0.0035, 0.014, 0.017), this._portMat, x > 0 ? 0.0475 : -0.0475, 0.007, -0.255 - i * 0.052);
      }
    }

    // Gas block, barrel, vented muzzle device ending at MUZZLE. donor :142-147
    add(g, B(0.052, 0.050, 0.038), blued, 0, 0.020, -0.419);
    add(g, tube(0.011, 0.130, 12), blued, 0, 0.012, -0.407);
    add(g, tube(0.018, 0.038, 8), blued, 0, 0.012, -0.453);

    // Buffer tube, layered stock, grip, trigger guard, trigger. donor :150-163
    add(g, tube(0.017, 0.140, 8), blued, 0, 0.004, 0.105);
    add(g, B(0.054, 0.064, 0.095), matte, 0, -0.005, 0.143);
    add(g, B(0.057, 0.070, 0.018), matte, 0, -0.009, 0.190);
    add(g, B(0.048, 0.018, 0.110), matte, 0, 0.033, 0.132);
    add(g, B(0.038, 0.085, 0.052), matte, 0, -0.075, 0.035, 0.32);
    const guardGeo = new THREE.TorusGeometry(0.024, 0.003, 6, 18, Math.PI);
    guardGeo.rotateY(Math.PI / 2);
    add(g, guardGeo, blued, 0, -0.050, -0.006, 0, 0, Math.PI);
    add(g, B(0.004, 0.025, 0.004), blued, 0, -0.045, -0.015, -0.18);

    // The magazine, as one group so the reload choreography can drop it. donor :167-176
    const mag = new THREE.Group();
    g.add(mag);
    mag.position.set(0, -0.075, -0.045);
    mag.rotation.x = 0.14;
    add(mag, B(0.056, 0.130, 0.075), matte, 0, -0.050, 0);
    add(mag, B(0.061, 0.012, 0.082), blued, 0, -0.116, 0.002);
    for (let i = 0; i < 3; i++) add(mag, B(0.059, 0.006, 0.078), blued, 0, -0.018 - i * 0.033, 0);

    // Charging handle: the one moving part. donor :179-184
    const bolt = new THREE.Group();
    bolt.position.set(0.043, 0.020, -0.030);
    g.add(bolt);
    add(bolt, B(0.018, 0.016, 0.050), blued, 0, 0, 0);
    add(bolt, new THREE.SphereGeometry(0.008, 10, 6), brassM, 0.011, 0, 0.012);

    // Reflex optic at SIGHT: housing, two posts, a top bar, the ring, the glass and the dot.
    // An open ring — nothing sits on the optical axis but a 0.10-opacity disc and the dot, so
    // the sight is see-through by construction (the rifle's scope was a sealed tube once).
    // donor :188-210
    const SIGHT = POSES.carbine.sight;
    const sg = new THREE.Group();
    g.add(sg);
    sg.position.copy(SIGHT);
    add(sg, B(0.046, 0.012, 0.056), blued, 0, -0.021, 0);
    for (const x of [-0.017, 0.017]) add(sg, B(0.006, 0.038, 0.012), blued, x, -0.001, 0.012);
    add(sg, B(0.040, 0.006, 0.012), blued, 0, 0.018, 0.012);
    add(sg, new THREE.TorusGeometry(0.016, 0.0022, 6, 24), blued, 0, 0, 0.012);
    add(sg, new THREE.CircleGeometry(0.0145, 24), this._glassMat, 0, 0, 0.011);
    const dot = add(sg, new THREE.CircleGeometry(0.0016, 10), this._dotMat, 0, 0, 0.013);
    dot.renderOrder = 5;

    return { group: g, bolt, boltZ0: bolt.position.z, dot, mag, pose: POSES.carbine };
  }

  /**
   * ROUND 6: the pump shotgun from Jackfield's loft (DESIGN 7.9). A long gun like the rifle —
   * receiver, a barrel over a magazine tube, a wood fore-end that is the moving part (it rides
   * `bolt`, so the cycle pumps it back and forward and it sits back on empty), a wood stock.
   * Iron sights: a rib on the receiver top is the SIGHT, the brass bead at the muzzle is the
   * dot, both on the axis at y 0.042, so aiming down it puts the bead in the notch.
   */
  _buildShotgun(g, K) {
    const { add, tube, ridgedBox, wood, blued, matte, brassM } = K;
    const B = (w, h, d) => bevelBox(w, h, d);
    // receiver, its top rib, and the loading / ejection ports (r3: the receiver is rounded)
    add(g, roundBar(0.048, 0.062, 0.180, 0.010), blued, 0, 0.002, -0.020);
    add(g, B(0.010, 0.006, 0.150), blued, 0, 0.036, -0.030);                 // the rib
    add(g, B(0.003, 0.024, 0.062), this._portMat, 0.0245, 0.008, -0.030);   // ejection port
    add(g, B(0.030, 0.003, 0.070), this._portMat, 0, -0.030, -0.020);       // loading port
    // barrel over the magazine tube, a band at the muzzle, the bead
    add(g, tube(0.0115, 0.520), blued, 0, 0.016, -0.365);
    add(g, tube(0.0095, 0.400), blued, 0, -0.012, -0.320);
    add(g, roundBar(0.028, 0.052, 0.012, 0.012), blued, 0, 0.002, -0.500);  // the band, round both tubes
    add(g, tube(0.0135, 0.020), blued, 0, 0.016, -0.622);                    // crown
    add(g, B(0.004, 0.010, 0.006), blued, 0, 0.033, -0.612);                 // front post
    // the pump: the moving part. It rides `bolt`, authored at rest; the cycle slides it +z.
    // It wraps the magazine tube and its top just meets the barrel (y 0.006 against the
    // barrel's 0.0045), and the two action bars run back along the tube's sides into the
    // receiver, so pumping it slides them in and out of the action as on the real gun.
    const bolt = new THREE.Group();
    bolt.position.set(0, -0.017, -0.300);
    g.add(bolt);
    // r3: the fore-end is TURNED, round the magazine tube (which runs through it), with the ribs
    // a hand grips by, instead of a square wooden block with five steel strips under it.
    {
      const pts = [[0.013, -0.075], [0.0186, -0.075], [0.0204, -0.071]];
      for (let z = -0.060; z <= 0.0601; z += 0.008) pts.push([0.0208, z - 0.0026], [0.0196, z - 0.0010], [0.0196, z + 0.0010], [0.0208, z + 0.0026]);
      pts.push([0.0204, 0.071], [0.0186, 0.075], [0.013, 0.075]);
      add(bolt, turned(pts), wood, 0, 0.002, 0);
    }
    for (const x of [-0.0115, 0.0115]) add(bolt, B(0.003, 0.006, 0.125), blued, x, 0.005, 0.1375);  // action bars
    // stock: one piece in profile, a semi-pistol grip and a recoil pad (r3, was three planks)
    add(g, profile(0.044, 0.005, (sh) => {
      sh.moveTo(0.066, 0.016);
      sh.quadraticCurveTo(0.160, 0.018, 0.245, 0.006);
      sh.lineTo(0.288, 0.004); sh.lineTo(0.292, -0.070);
      sh.quadraticCurveTo(0.262, -0.074, 0.190, -0.054);
      sh.quadraticCurveTo(0.130, -0.042, 0.108, -0.050);
      sh.quadraticCurveTo(0.090, -0.060, 0.082, -0.078);
      sh.lineTo(0.064, -0.082);
      sh.quadraticCurveTo(0.050, -0.066, 0.050, -0.036);
      sh.lineTo(0.066, -0.026); sh.lineTo(0.066, 0.016);
    }), wood, 0, 0, 0);
    add(g, roundBar(0.046, 0.086, 0.020, 0.008, 0.002), matte, 0, -0.033, 0.302);   // recoil pad
    // The guard's ends meet the receiver's floor (they hung 4 mm under it).
    const guardGeo = new THREE.TorusGeometry(0.022, 0.0028, 8, 20, Math.PI);
    guardGeo.rotateY(Math.PI / 2);
    add(g, guardGeo, blued, 0, -0.030, 0.040, 0, 0, Math.PI);
    add(g, B(0.005, 0.018, 0.005), blued, 0, -0.038, 0.034, -0.18);
    // the bead at the muzzle, on the sight axis: what you put on the body
    const dot = add(g, new THREE.SphereGeometry(0.0030, 8, 6), brassM, 0, POSES.shotgun.sight.y, -0.614);
    return { group: g, bolt, boltZ0: bolt.position.z, dot, mag: null, pose: POSES.shotgun };
  }

  /**
   * ROUND 6: the revolver from the Drowned Light's lamp room. A big-frame six-shot: frame,
   * a fluted cylinder, a barrel over a full underlug, a top strap with the rear notch, a wood
   * grip, and a hammer that is the `bolt` (it does not travel: cycle 0). Iron sights: the
   * notch at the rear of the top strap is the SIGHT and the front blade's bead is the dot.
   */
  _buildRevolver(g, K) {
    const { add, tube, ridgedBox, wood, blued, matte, brassM } = K;
    const B = (w, h, d) => bevelBox(w, h, d);
    // frame and top strap (r3: the frame's edges are rounded)
    add(g, roundBar(0.030, 0.042, 0.100, 0.006), blued, 0, 0.004, -0.005);
    // The strap runs back to 0.050 so the rear-sight ears below stand ON it: it used to stop at
    // 0.0275 and the ears floated 12 mm behind its end and 11 mm over the frame (r3 critic).
    // It also sits ON the frame now (it hung 2 mm over it), still topping out at 0.036.
    add(g, B(0.028, 0.0102, 0.1375), blued, 0, 0.0309, -0.01875);
    // r3: THE CYLINDER. It was a 12-sided can with six dark slivers stuck on for flutes. Now it is
    // round, cut with six real flutes between the chambers and six chamber mouths through it, its
    // edges rounded, and it is a group of its own so it can turn on to the next round (present).
    const cylG = new THREE.Group();
    cylG.position.set(0, 0.008, -0.030);
    g.add(cylG);
    {
      const cs = new THREE.Shape(), R = 0.0195, N = 96;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU;
        const f = Math.cos(6 * (a - Math.PI / 6));
        const r = R - 0.0024 * Math.pow(Math.max(0, (f - 0.35) / 0.65), 1.4);
        if (i === 0) cs.moveTo(Math.cos(a) * r, Math.sin(a) * r); else cs.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3, h = new THREE.Path();
        h.absarc(Math.cos(a) * 0.0115, Math.sin(a) * 0.0115, 0.0040, 0, TAU, true);
        cs.holes.push(h);
      }
      const cg = new THREE.ExtrudeGeometry(cs, { depth: 0.039, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 10 });
      cg.translate(0, 0, -0.0195);
      add(cylG, smoothed(cg), blued, 0, 0, 0);
    }
    // barrel over the underlug, the crown, the front blade
    add(g, tube(0.0095, 0.155, 10), blued, 0, 0.024, -0.130);
    add(g, roundBar(0.020, 0.026, 0.150, 0.006), blued, 0, 0.004, -0.128);      // the underlug
    add(g, tube(0.0115, 0.016), blued, 0, 0.024, -0.205);
    add(g, B(0.004, 0.014, 0.006), blued, 0, 0.037, -0.196);
    // rear notch: two ears either side of the sight axis, their tops level with the bead
    // Open the notch by 2.5 mm overall. The old left clearance was one raster pixel under
    // its contract (15/17 px); moving the ears, rather than shrinking the front bead,
    // preserves the aiming reference.
    for (const x of [-0.011, 0.011]) add(g, B(0.0055, 0.008, 0.010), blued, x, 0.040, 0.045);
    // grip, trigger guard, trigger. r3: the grip is a plow handle drawn in profile (it was a
    // tilted block), and the guard's ends meet the frame (they hung 5 mm under it).
    add(g, profile(0.028, 0.004, (sh) => {
      sh.moveTo(0.012, -0.016);
      sh.lineTo(0.050, -0.012);
      sh.quadraticCurveTo(0.062, -0.030, 0.058, -0.058);
      sh.quadraticCurveTo(0.057, -0.080, 0.068, -0.092);
      sh.lineTo(0.052, -0.098);
      sh.lineTo(0.030, -0.094);
      sh.quadraticCurveTo(0.024, -0.060, 0.012, -0.030);
      sh.lineTo(0.012, -0.016);
    }), wood, 0, 0, 0);
    add(g, B(0.032, 0.016, 0.042), blued, 0, -0.014, 0.030);
    const guardGeo = new THREE.TorusGeometry(0.017, 0.0028, 8, 18, Math.PI);
    guardGeo.rotateY(Math.PI / 2);
    add(g, guardGeo, blued, 0, -0.018, -0.004, 0, 0, Math.PI);
    add(g, B(0.005, 0.014, 0.004), blued, 0, -0.024, -0.008, -0.2);
    // the hammer: the moving part, which on this gun does not travel. Its spur stays UNDER
    // the sight line (y 0.044): a hammer that stood above it blocked the bead at full ADS
    // (measured: 0 px of world above the bead, tests/weapon.mjs (m), first cut).
    const bolt = new THREE.Group();
    bolt.position.set(0, 0.020, 0.052);
    g.add(bolt);
    add(bolt, B(0.008, 0.016, 0.010), blued, 0, 0.004, 0.004, 0.5);
    add(bolt, B(0.012, 0.005, 0.010), matte, 0, 0.012, 0.010);
    // the bead on the front blade, on the sight axis
    const dot = add(g, new THREE.SphereGeometry(0.0025, 8, 6), brassM, 0, POSES.revolver.sight.y, -0.197);
    return { group: g, bolt, boltZ0: bolt.position.z, dot, mag: null, cyl: cylG, pose: POSES.revolver };
  }

  _buildFlash() {
    // Star core + bore cone, both PARENTED TO THE GUN in the viewmodel scene.
    // See THE FLARE TRAP at the top of this file.
    this.flashU = { uLife: { value: 1 }, uRot: { value: 0 } };
    const coreMat = new THREE.ShaderMaterial({
      uniforms: this.flashU,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv * 2.0 - 1.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        varying vec2 vUv;
        uniform float uLife;
        uniform float uRot;
        void main() {
          float cr = cos(uRot), sr = sin(uRot);
          vec2 p = mat2(cr, -sr, sr, cr) * vUv;
          float rr = length(p);
          float a2 = atan(p.y, p.x);
          float bright = exp(-rr * rr * 26.0) * 2.6 + exp(-rr * rr * 9.0) * 0.9;
          float petals = pow(abs(cos(a2 * 2.0)), 2.6) * 0.9
                       + pow(abs(cos(a2 * 4.0 + 0.785)), 3.4) * 0.5;
          float spokes = pow(abs(cos(a2 * 8.5)), 12.0) * 0.6;
          float shape = bright + (petals + spokes) * exp(-rr * rr * 5.0) * 0.8;
          shape *= 1.0 - smoothstep(0.75, 1.0, rr);
          float a = clamp(shape, 0.0, 1.0) * (1.0 - uLife * uLife);
          vec3 col = mix(vec3(1.0, 0.93, 0.78), vec3(1.0, 0.62, 0.22), clamp(rr * 1.6, 0.0, 1.0));
          gl_FragColor = vec4(col * a, a);
        }`,
      // r3: depth-TESTED (never written). With the test off the star was painted over the gun
      // itself: aimed, the bolt's flash sat inside the scope's tube. Now the scope and the crown
      // stand in front of the flash they make, which is what a flash seen from behind looks like.
      transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.AdditiveBlending, toneMapped: false,
    });
    this.flashCore = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), coreMat);
    this.flashCore.visible = false;
    this.flashCore.frustumCulled = false;
    this.flashCore.position.copy(POSES.bolt.muzzle);   // re-anchored per weapon by _selectGun
    this.gun.add(this.flashCore);

    this.coneMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.0, 0.55, 0.18), transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    this.flashCone = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.28, 10, 1, true), this.coneMat);
    this.flashCone.rotation.x = -Math.PI / 2;
    const M0 = POSES.bolt.muzzle;
    this.flashCone.position.set(M0.x, M0.y, M0.z - 0.14);
    this.flashCone.visible = false;
    this.flashCone.frustumCulled = false;
    this.gun.add(this.flashCone);
    // r3: THE CYLINDER GAP. A revolver also flashes sideways out of the gap between the cylinder
    // and the barrel, and from behind the gun that is two small flares either side of the frame.
    // The same material as the core (one program, the same life and turn), shown on the revolver.
    this.flashGap = [];
    for (const x of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.022), coreMat);
      m.position.set(x * REVOLVER_GAP.x, REVOLVER_GAP.y, REVOLVER_GAP.z);
      m.visible = false; m.frustumCulled = false;
      this.gun.add(m);
      this.flashGap.push(m);
    }
  }

  /**
   * r3: the gun's smoke, from the real crown in the world (fx.muzzleSmoke). Thinner when aimed,
   * so the sight picture clears, and only every third round of the carbine, whose smoke would
   * otherwise stand in front of you as a wall.
   */
  _smoke(adsT) {
    const fx = this._sys('fx'), cam = this._sys('camera');
    if (!fx || !fx.muzzleSmoke || !cam) return;
    if (this.curId === 'carbine' && (this._smokeN++ % 3) !== 0) return;
    if (!this.muzzleWorld(_v3, 0.05)) return;
    cam.aimDir(_fwd);
    fx.muzzleSmoke(_v3.x, _v3.y, _v3.z, _fwd.x, _fwd.y, _fwd.z, this.curId, lerp(1, 0.4, adsT || 0));
  }

  /**
   * r3: THE CROWN, IN THE WORLD, ON ITS OWN PIXEL. The gun is drawn through this file's 44-48
   * degree lens and the world through the camera's 55-74, so the crown's camera-space point,
   * put into the world as it is, lands on a different pixel from the crown you see: nearer the
   * middle of the frame (THE FLARE TRAP at the top of this file, for anything that is not a
   * light). The point is moved out along the view plane by the ratio of the two lenses at the
   * same depth, so smoke and the tracer leave the muzzle you are looking at. `ahead` metres
   * down the bore. Writes world coordinates into `out`; false with no world camera.
   */
  muzzleWorld(out, ahead = 0) {
    const wc = this.ctx.camera;
    if (!wc) return false;
    const MZ = this.muzzle;
    this.gun.updateWorldMatrix(true, false);
    this.gun.localToWorld(out.set(MZ.x, MZ.y, MZ.z - ahead));
    const k = Math.tan(wc.fov * DEG * 0.5) / Math.tan(this.camera.fov * DEG * 0.5);
    out.x *= k; out.y *= k;
    out.applyMatrix4(wc.matrixWorld);
    return true;
  }

  _buildBrass() {
    // Brass lives in the WORLD scene: a case you can walk back and find is a
    // record of what you did, and it is the cheapest proof the gun is real.
    const geo = new THREE.CylinderGeometry(0.0042, 0.0040, 0.0620, 6);
    // r3: roughness 0.35 -> 0.5. A case 20 cm from the eye caught the muzzle light at its height
    // and bloomed into a glowing orange rod beside the carbine's sight; spent brass is not mirror.
    const mat = new THREE.MeshStandardMaterial({ color: 0xc8963e, roughness: 0.5, metalness: 0.9 });
    this.brass = new THREE.InstancedMesh(geo, mat, BRASS_N);
    this.brass.frustumCulled = false;
    this.brass.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Every slot starts parked (a new InstancedMesh is 48 identity matrices, 48 cases at the
    // origin): _presentBrass only writes a slot when it changes (r3).
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < BRASS_N; i++) this.brass.setMatrixAt(i, _m);
    this.brass.instanceMatrix.needsUpdate = true;
    // NOT attached here. main.js constructs every system before it calls any init(), so
    // ctx.scene is still null at construction and this guard was always false - the brass
    // pool then simulated and wrote instance matrices every frame on an orphaned mesh that
    // was never drawn. It is parented in init(), and ready() now proves it.
    this.brassState = [];
    for (let i = 0; i < BRASS_N; i++) {
      this.brassState.push({
        live: false, age: 0, bounces: 0,
        pos: new THREE.Vector3(), prev: new THREE.Vector3(),
        vel: new THREE.Vector3(), rot: new THREE.Euler(),
        prot: new THREE.Euler(), spin: new THREE.Vector3(),
        // r3: the floor it will land on (a collider's top under where it is thrown, checked
        // again where it arrives), whether that is ground (soft) and whether it has been heard.
        floorY: -Infinity, floorChecked: false, soft: 1, heard: false, shown: false,
      });
    }
    this.brassCursor = 0;
    // Fixed-capacity delay queue: a bolt gun ejects one case per cycle, so 4
    // pending is already generous and it never grows in the hot path.
    this.brassDelay = new Float64Array(4).fill(-1);
  }

  async init() {
    const apply = () => {
      const id=this.ctx.systems.get('progress')?.activeFinish?.()||'original';
      for(const m of this._finishMats) setMaterialFinish(m,id);
      this.finishId=id;
    };
    this._finishOff=[this.ctx.bus.on('save:loaded',apply),this.ctx.bus.on('finish:equipped',apply)];
    apply();
    // Parent the brass here, not in the constructor: main.js constructs every system before
    // it calls any init(), so ctx.scene does not exist yet at construction time. ready()
    // asserts brass.parent so a future regression fails the boot sweep instead of silently
    // simulating an ejection pool nobody can see.
    if (this.ctx.scene && !this.brass.parent) this.ctx.scene.add(this.brass);
    // r3: THE STEEL HAS A SKY TO REFLECT. gfx gives the world scene a baked, filtered night canopy
    // (gfx/night-reflections.js); the gun's own scene had nothing, so its metal could only show
    // the four lights. It shares the same map: set here, before main.js warms every program, so
    // no program links later and the count does not change (the scene's materials already share
    // one program, and still do).
    if (this.ctx.scene && this.ctx.scene.environment) this.scene.environment = this.ctx.scene.environment;

    if (typeof window !== 'undefined') {
      const T = (window.__CURFEW = window.__CURFEW || {});
      T.viewmodel = {
        dump: () => this.dump(),
        sightScreenOffset: () => this.sightScreenOffset(),
        scene: () => this.scene,
        camera: () => this.camera,
        setPose: (p) => this.setPose(p),
        pose: () => ({
          x: this.restPos.x, y: this.restPos.y, z: this.restPos.z,
          scale: this.vmScale, fovHip: this.fovHip, fovAds: this.fovAds,
        }),
        // ROUND 5
        weapon: () => this.curId,
        guns: () => Object.keys(this.guns),
        gunGroup: (id) => (this.guns[id] ? this.guns[id].group : null),
      };
    }
  }

  ready() { return !!this.scene && !!this.camera && !!this.gun && !!this.brass.parent; }

  dispose() {
    for(const off of this._finishOff||[]) off();
    if (this.ctx.scene) this.ctx.scene.remove(this.brass);
    this.brass.geometry.dispose();
    this.brass.material.dispose();
    this.pourRig?.dispose();
    for (const m of this._mats) m.dispose();
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }

  /* -------------------------------------------------- the pour rig (gas) -- */

  /** world/gas.js raises and lowers it. Pure presentation: it holds no state of its own. */
  setPourRig(on) { this.pouring = !!on; if (this.pourRig && !on) this.pourRig.setTip(0); }
  /** Radians the can is tipped over. */
  setPourTip(rad) { this.pourRig?.setTip(rad); }

  onResize(w, h) {
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Compile every viewmodel program at boot, flash included — and BOTH guns revealed, so
   * the carbine's geometry is uploaded now rather than on the frame it is first granted.
   * (Its materials are the rifle's, so no program could link then anyway; this is the
   * buffer upload.)
   */
  warmup() {
    this.flashCore.visible = true;
    this.flashCone.visible = true;
    for (const m of this.flashGap) m.visible = false;
    for (const id in this.guns) this.guns[id].group.visible = true;
    if (this.ctx.renderer) this.ctx.renderer.compile(this.scene, this.camera);
    this.flashCore.visible = false;
    this.flashCone.visible = false;
    for (const id in this.guns) this.guns[id].group.visible = (this.guns[id] === this.cur);
  }

  _sys(id) { return this.ctx.systems && this.ctx.systems.get(id); }

  /* ------------------------------------------------------------------ */

  step(dt) {
    const ctx = this.ctx;
    const wep = this._sys('weapons');        // LAZY. Never captured.
    const cam = this._sys('camera');
    const p = this._sys('player');
    if (!wep || !cam || !p) return;
    const st = wep.vmState;

    // ---- drain the gun's pulse queue. weapons is manifest entry 11 and we
    // are 12, so this is the same step with zero latency.
    wep.drainPulses((pu) => this._onPulse(pu, st));

    // ---- ROUND 5: the gun in the hands follows the published id. weapon.js changes it at
    // the bottom of the swap, when the viewmodel is fully lowered (see C.SWAP below).
    if (st.weapon !== this.curId) this._selectGun(st.weapon);

    this.prevS.set(this.currS);

    this.sprintT = clamp01(this.sprintT + (st.sprinting ? dt / 0.18 : -dt / 0.13));
    this.kickPos.update(dt); this.kickRot.update(dt);
    this.angLag.update(dt); this.linLag.update(dt);
    this.landDip.update(dt); this.jolt.update(dt); this.boltS.update(dt);
    this.boltAnim += dt;
    this._cylT += dt; this._hammerT += dt;

    // ---- look lag from the camera's angular velocity
    if (!this._seeded) { this.prevYaw = cam.yaw; this.prevPitch = cam.pitch; this._seeded = true; }
    const dyaw = cam.yaw - this.prevYaw, dpitch = cam.pitch - this.prevPitch;
    this.prevYaw = cam.yaw; this.prevPitch = cam.pitch;
    const lagScale = lerp(1, 0.30, st.adsT) * lerp(1, 1.15, this.sprintT);
    const yawRate = dyaw / Math.max(dt, 1e-4) / DEG;
    const pitchRate = dpitch / Math.max(dt, 1e-4) / DEG;
    this.angLag.y.target = clamp(-yawRate * 0.0125, -6.5, 6.5) * DEG * lagScale;
    this.angLag.x.target = clamp(pitchRate * 0.0125, -6.5, 6.5) * DEG * lagScale;
    this.angLag.z.target = this.angLag.y.target * 0.35;

    const vel = p.vel || _ZERO;
    const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
    const vFwd = -(vel.x * -sy + vel.z * -cy);
    const vRight = vel.x * cy - vel.z * sy;
    this.linLag.x.target = clamp(-vRight * 0.006, -0.035, 0.035) * lagScale;
    this.linLag.y.target = clamp(-(vel.y || 0) * 0.006, -0.035, 0.035) * lagScale;
    this.linLag.z.target = clamp(vFwd * 0.006, -0.035, 0.035) * lagScale;

    // ---- the bolt throw. A bolt gun's whole identity is that the shot is
    // followed by WORK: lift, pull, push, drop. It runs inside the 1.09 s
    // interval so the cadence is the animation, not a cooldown number.
    // Per weapon: the carbine has no bolt throw (cycleLen 0) and only a short hold-open,
    // so the travel is scaled by POSES.*.boltThrow.
    // r3: the throw is scaled per gun (the pump racks 9 cm), and an EMPTY gun's bolt comes back
    // and STAYS back: it used to slam home at 0.86 of the cycle and pop open again the next
    // step, and it snapped shut the moment a reload began. It is held back through an empty
    // reload until the beat that closes it ('boltrelease', or the shotgun's first shell) and
    // then runs home in BOLT_CLOSE_S.
    let boltZ = 0;
    const cyc = st.cycleLen;
    const throwK = this.cur ? this.cur.pose.boltThrow : 1;
    const travel = BOLT_TRAVEL * throwK;
    const heldOpen = st.empty && (!st.reloading || this._openHold);
    if (cyc > 0 && this.boltAnim < cyc) {
      const u = this.boltAnim / cyc;
      if (u < 0.42) boltZ = travel * ease.outQuad(u / 0.42);
      else if (heldOpen) boltZ = travel;
      else if (u < 0.86) boltZ = travel * (1 - ease.inQuad((u - 0.42) / 0.44)) - 0.0015 * throwK;
      else boltZ = 0;
    } else if (heldOpen) {
      boltZ = travel;                         // held open on empty: it SHOWS you
    } else if (this._closeT < BOLT_CLOSE_S) {
      boltZ = travel * (1 - ease.inQuad(this._closeT / BOLT_CLOSE_S));
    }
    this._closeT += dt;

    // ---- the carbine's climb settles once the trigger lets go (CLIMB_MAX)
    if (this._climb > 0 && st.sinceShot > 0.09) {
      this._climb *= Math.pow(0.5, dt / CLIMB_HL);
      if (this._climb < 1e-4) this._climb = 0;
    }
    this.kickRot.x.target = this._climb;

    // ---- ROUND 5: the swap. Fully lowered at the midpoint, which is the step weapon.js
    // changes the gun.
    // ROUND 6 (NEXT.md item 3: "the swap is a ~0.3 s cut with empty hands, not a lower-and-
    // raise"). MEASURED on this branch before the change (tests/artifacts/d1-baseline.txt):
    // the half-sine put the gun out of frame from 0.083 s to 0.367 s of the 0.45 s swap —
    // 0.28 s of empty hands, with the whole lowering done in four steps — because the drop
    // cleared the frame at sin = 0.55 and the sine sits above that for 63% of its length.
    // Two changes, both here: the curve is a TRIANGLE (down at a constant rate, up at a
    // constant rate, bent a little toward rest with the 1.25 power so it leaves and returns
    // softly), and it reaches SWAP_REACH, not 1, so the gun clears the bottom of the frame
    // only around the midpoint — the frames the weapon change needs — and is a visible,
    // lowering gun for the rest. The midpoint is still where weapon.js changes the gun.
    let swapLower = 0;
    if (st.swapping && st.swapT >= 0) {
      const tri = 1 - Math.abs(1 - 2 * clamp01(st.swapT));
      swapLower = SWAP_REACH * Math.pow(tri, 1.25);
    }

    // ---- reload choreography (the mag/floorplate body track)
    let magY = -0.042, magX = 0, magRZ = 0, magVis = 1;
    if (this.magDropT >= 0) {
      this.magDropT += dt;
      const dd = this.magDropT;
      magY = -0.042 - dd * 0.40 - 5.5 * dd * dd * 0.5;
      magRZ = dd * 2.2;
      if (magY < -0.5) magVis = 0;
    } else if (this.magRiseT >= 0) {
      this.magRiseT += dt;
      const r = clamp01(this.magRiseT / 0.38);
      magY = lerp(-0.42, -0.042, ease.outCubic(r));
      magX = lerp(-0.06, 0, ease.outCubic(r));
      magRZ = lerp(0.55, 0, ease.outCubic(r));
      if (r >= 1) this.magRiseT = -1;
    }

    // ---- melee pose curve. The wind-up TRAVELS for MELEE.travel and then
    // HOLDS still for MELEE.hold: the swing sits at -1 and does not move, and
    // that stillness is the whole anticipation. Motion that never stops reads
    // as drift, not as a threat. (vigil viewmodel.js:397-420)
    let swing = 0, lift = 0;
    const M = CFG.weapons.melee;
    if (st.melee) {
      if (st.melee.phase === 'windup') {
        const u = clamp01(st.melee.t / M.travel);    // reaches 1 at 0.200 s,
        swing = -ease.outCubic(u);                   // then HOLDS for 0.060 s
        lift = ease.outCubic(u);
      } else if (st.melee.phase === 'active') {
        const u = clamp01(st.melee.t / M.active);
        swing = lerp(-1, 1.15, ease.inQuad(u));
        lift = 1 - u * 0.7;
      } else {
        const u = clamp01(st.melee.t / M.recover);
        swing = 1.15 * (1 - ease.outCubic(u));
        lift = 0.3 * (1 - ease.outCubic(u));
      }
    }

    // ---- reload body weight
    let rw = 0;
    if (st.reloading) rw = Math.sin(Math.PI * clamp01(st.reloading.t / st.reloading.dur)) * lerp(1, RELOAD_ADS_K, st.adsT);

    // ---- bob amplitude off the player's ONE stride clock. Two timers reads
    // as floaty and the player will not be able to name why. [CFG.player.stride]
    const ref = st.sprinting ? CFG.player.SPRINT : (p.crouched ? CFG.player.CROUCH : CFG.player.WALK);
    const bobAmp = Math.pow(clamp((p.speed || 0) / ref, 0, 1.6), 0.85)
      * (p.grounded !== false && !p.sliding ? 1 : 0)
      * lerp(1, 0.25, st.adsT) * 0.55;         // 0.55x of the camera's amplitude

    const s = this.currS;
    s[C.KP_X] = this.kickPos.x.value; s[C.KP_Y] = this.kickPos.y.value; s[C.KP_Z] = this.kickPos.z.value;
    s[C.KR_X] = this.kickRot.x.value; s[C.KR_Y] = this.kickRot.y.value; s[C.KR_Z] = this.kickRot.z.value;
    s[C.AL_X] = this.angLag.x.value; s[C.AL_Y] = this.angLag.y.value; s[C.AL_Z] = this.angLag.z.value;
    s[C.LL_X] = this.linLag.x.value; s[C.LL_Y] = this.linLag.y.value; s[C.LL_Z] = this.linLag.z.value;
    s[C.DIP] = this.landDip.value; s[C.JOLT] = this.jolt.value; s[C.BOLTS] = this.boltS.value;
    s[C.SPRINT] = this.sprintT; s[C.ADS] = st.adsT;
    s[C.BOLTZ] = boltZ; s[C.MAG_Y] = magY; s[C.MAG_X] = magX; s[C.MAG_RZ] = magRZ;
    s[C.MAGVIS] = magVis;
    s[C.SWING] = swing; s[C.LIFT] = lift; s[C.RELOADW] = rw; s[C.BOB] = bobAmp;
    s[C.SWAP] = swapLower;
    s[C.LOWER]=st.lowerT||0;

    this._stepBrass(dt, p, cam);
  }

  /* ---- pulses from the gun ------------------------------------------- */

  _onPulse(pu, st) {
    switch (pu.type) {
      case 'kick': {
        // CHANNEL 3 of the three. ~70% of the felt motion, and it lives here,
        // in a scene that does not share the world camera — so however violent
        // it looks it cannot move a bullet.
        // The numbers are the peak at the hip (THE KICK): 28 mm back, 6 mm up, 4 mm aside;
        // 3.4 degrees of muzzle, 1.1 of yaw and 2.2 of roll, alternating shot to shot.
        // r3: only the carbine ALTERNATES its roll (a light gun shaken shot to shot). A heavy
        // gun rolls the same way every time, into the shoulder and to the right, as a real
        // one does under the shooter's grip, and its sideways kick is a small random lean
        // biased right; it used to rock left-right-left like a metronome.
        const i = pu.index, mW = pu.mW;
        const K = (this.cur && this.cur.pose.kick) || KICK_NONE;
        const gR = K.gainRot || KICK_GAIN_ROT;
        const kp = mW * K.pos * KICK_GAIN_POS, kf = mW * K.flip * gR, kt = mW * K.twist * gR;
        const side = K.alt ? (i % 2 ? 1 : -1) : -1;
        const lean = K.alt ? side : (this.rng.next() < 0.7 ? -1 : 1) * (0.5 + this.rng.next() * 0.5);
        this.kickPos.nudge(-lean * 0.004 * kp, 0.006 * kp, 0.028 * kp);
        this.kickRot.nudge(3.4 * DEG * kf, lean * 1.1 * DEG * kt, side * 2.2 * DEG * kt);
        if (K.climb) this._climb = Math.min(CLIMB_MAX, this._climb + K.climb * DEG * mW);
        this.boltS.nudge(1.0);
        this.boltAnim = 0;
        // The revolver: the hammer falls, and the cylinder turns on a sixth to the next round.
        if (this.cur && this.cur.cyl) {
          this._cylFrom = this._cylAng; this._cylAng += Math.PI / 3; this._cylT = 0; this._hammerT = 0;
        }
        break;
      }
      case 'flash': {
        this.flashT0 = this.ctx.time.t - pu.subT;
        this.flashAds = pu.adsT;
        this.flashU.uRot.value = Math.floor(this.rng.next() * 8) * (Math.PI / 4);
        // The case leaves 28 ms after the shot on an auto; on a bolt gun it
        // leaves when the bolt comes back, so schedule it against the throw.
        const cy = st.cycleLen;
        this._queueBrass((cy > 0 ? cy * 0.34 : 0.028) - pu.subT);
        this._borrowMuzzleLight();
        // Each shot's flash is its own: up to 12% larger or smaller than the last.
        this._flashJit = 0.88 + this.rng.next() * 0.24;
        this._smoke(pu.adsT);
        break;
      }
      case 'reload:start':
        // An empty reload (or a resumed one that is still empty) keeps the bolt back.
        this._openHold = pu.name !== 'tac' && !!st.empty;
        break;
      case 'reload:beat': {
        const j = RELOAD_JOLT[pu.name];
        if (j) this.jolt.nudge(j * JOLT_GAIN * lerp(1, JOLT_ADS_K, st.adsT));
        if (pu.name === 'drop') this.magDropT = 0;
        if (pu.name === 'enter') { this.magRiseT = 0; this.magDropT = -1; }
        if (this._openHold && (pu.name === 'boltrelease' || pu.name === 'shell')) { this._openHold = false; this._closeT = 0; }
        break;
      }
      case 'reload:end':
        this.magDropT = -1; this.magRiseT = -1;
        if (this._openHold) { this._openHold = false; this._closeT = st.empty ? 99 : 0; }
        break;
      // r3: the bolt (or the pump) at the back and going home (weapon.js 'weapon:cycle').
      case 'cycle': {
        const j = CYCLE_JOLT[pu.name];
        if (j) this.jolt.nudge(j * JOLT_GAIN * lerp(1, JOLT_ADS_K, pu.adsT));
        break;
      }
      // ROUND 18. What a connecting swing does to the gun in your hands. The old dose was
      // a shade under the rifle's own recoil, so hitting something felt LIGHTER than
      // firing at it. Now it stops the swing dead and bounces it back, which is what
      // hitting a body with a rifle stock actually does to the rifle.
      //
      // r3 polish: and it never showed, for the same x16 / 16 reason as the shot (THE KICK).
      // These are peaks now: the stock stops and comes back 5 cm the way it came, drops 4 cm
      // and twists. The 12.5 cm shove down the bore it was written with is 6 here: on top of
      // the swing's own 27 cm it read as the gun leaving the hands.
      case 'melee:connect':
        this.kickPos.nudge(-0.052 * KICK_GAIN_POS, -0.044 * KICK_GAIN_POS, -0.060 * KICK_GAIN_POS);
        this.kickRot.nudge(-13 * DEG * KICK_GAIN_ROT, 11 * DEG * KICK_GAIN_ROT, 18 * DEG * KICK_GAIN_ROT);
        this.jolt.nudge(6 * JOLT_GAIN);
        break;
      case 'dry':
        this.jolt.nudge(0.5 * JOLT_GAIN * lerp(1, JOLT_ADS_K, st.adsT));
        break;
      default: break;
    }
  }

  /* ---- the world-side muzzle light, BORROWED from the rover pool ------ */

  _borrowMuzzleLight() {
    const lights = this._sys('lights');
    const p = this._sys('player');
    const cam = this._sys('camera');
    if (!lights || !lights.borrow || !p || !cam) return;
    this._releaseMuzzleLight();          // never leak a rover across two shots
    // Centroid AHEAD of the crown, in the world, for the same reason it is
    // ahead of the crown in the viewmodel scene: three clamps decay-2 falloff
    // at 1/max(d*d, 0.01), so anything within 10 cm of the point gets 100x.
    cam.aimDir(_fwd);
    const ox = p.pos.x, oy = (p.eyeY !== undefined ? p.eyeY : p.pos.y + CFG.player.EYE), oz = p.pos.z;
    const reach = 0.60 + FLASH_AHEAD;
    // 46 is VIGIL's measured world-flash intensity at distance 18 / decay 2;
    // CFG.lights.rovers is 18 / 1.8, near enough that the number carries.
    this.muzzleHandle = lights.borrow(
      'muzzle',
      ox + _fwd.x * reach, oy + _fwd.y * reach - 0.06, oz + _fwd.z * reach,
      0xffc27a, this._flashLight, 0.075,
    );
    // The pool bumps `gen` on every borrow. Once our ttl expires the pool releases the
    // handle and somebody else (an impact spark, an ember) may be holding it by the time
    // we look again — so record the generation and touch nothing that does not match.
    this.muzzleGen = this.muzzleHandle ? this.muzzleHandle.gen : -1;
  }

  _releaseMuzzleLight() {
    // Only release a handle that is still OURS. The pool expires a ttl'd borrow on its own
    // fixed step, and after that the slot can be re-borrowed by another system with the
    // same object; releasing it then would put out somebody else's light.
    const h = this.muzzleHandle;
    this.muzzleHandle = null;
    if (!h || !h.inUse || h.gen !== this.muzzleGen) return;
    const lights = this._sys('lights');
    if (lights && lights.release) lights.release(h);
  }

  /* ---- brass --------------------------------------------------------- */

  _queueBrass(delay) {
    const q = this.brassDelay;
    for (let i = 0; i < q.length; i++) {
      if (q[i] < 0) { q[i] = Math.max(0, delay); return; }
    }
  }

  _stepBrass(dt, p, cam) {
    const q = this.brassDelay;
    for (let i = 0; i < q.length; i++) {
      if (q[i] < 0) continue;
      q[i] -= dt;
      if (q[i] > 0) continue;
      q[i] = -1;
      this._spawnBrass(p, cam);
    }
    const terrain = this._sys('terrain');
    for (let i = 0; i < BRASS_N; i++) {
      const b = this.brassState[i];
      if (!b.live) continue;
      b.age += dt;
      if (b.age > 6.0) { b.live = false; continue; }
      b.prev.copy(b.pos);
      b.prot.copy(b.rot);
      b.vel.y -= CFG.player.GRAVITY * dt;
      b.vel.multiplyScalar(Math.exp(-0.12 * dt));
      b.pos.addScaledVector(b.vel, dt);
      // r3: the ground is what a mover stands on (surfaceAt: ice over a pond, not the bed under
      // it), and a floor is a floor: a case fired in a room used to fall through the boards to
      // the soil underneath the building. The floor found at the throw is confirmed once, with
      // one short ray, where the case actually arrives, so one thrown off a deck still falls.
      let gy = terrain ? (terrain.surfaceAt ? terrain.surfaceAt(b.pos.x, b.pos.z) : terrain.heightAt(b.pos.x, b.pos.z)) : 0;
      let soft = b.soft;
      if (b.floorY > gy && b.pos.y < b.floorY + 0.02) {
        if (!b.floorChecked) { b.floorChecked = true; if (this._floorUnder(b.pos.x, b.floorY + 0.25, b.pos.z, 0.5) === -Infinity) b.floorY = -Infinity; }
        if (b.floorY > gy) { gy = b.floorY; soft = 0; }
      }
      if (b.pos.y < gy + 0.01 && b.vel.y < 0 && b.bounces < 2) {
        const hit = -b.vel.y;
        b.pos.y = gy + 0.01;
        b.vel.y *= -0.32;
        b.vel.x *= 0.55; b.vel.z *= 0.55;
        b.spin.multiplyScalar(0.45);
        b.bounces++;
        if (!b.heard) {
          // The first knock: where it lands and as hard as it lands (guns.js brassLand).
          b.heard = true;
          const L = this._brassLand;
          L.x = b.pos.x; L.y = b.pos.y; L.z = b.pos.z; L.speed = hit; L.soft = soft;
          L.shell = this.curId === 'shotgun';
          this.ctx.bus.emit('brass:land', L);
        }
      } else if (b.pos.y < gy) {
        b.pos.y = gy; b.vel.set(0, 0, 0); b.spin.set(0, 0, 0);
      }
      b.rot.x += b.spin.x * dt;
      b.rot.y += b.spin.y * dt;
    }
  }

  /** The top of a collider under (x, z), searching `reach` metres down from y; -Infinity if none. */
  _floorUnder(x, y, z, reach) {
    const col = this._sys('collision');
    if (!col || !col.raycast) return -Infinity;
    _rayO.x = x; _rayO.y = y; _rayO.z = z;
    const h = col.raycast(_rayO, _DOWN, reach, col.MASK ? col.MASK.SOLID : 1);
    return h && h.hit !== false && !h.ground && h.point ? h.point.y : -Infinity;
  }

  _spawnBrass(p, cam) {
    const anchor = this.cur ? this.cur.pose.brass : POSES.bolt.brass;   // per weapon (ROUND 5)
    if (!anchor) return;                                                 // ROUND 6: the revolver ejects nothing
    const b = this.brassState[this.brassCursor];
    this.brassCursor = (this.brassCursor + 1) % BRASS_N;
    b.live = true; b.age = 0; b.bounces = 0;
    const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
    _rgt.set(cy, 0, -sy);
    _fwd.set(-sy, 0, -cy);
    const eye = p.eyeY !== undefined ? p.eyeY : p.pos.y + CFG.player.EYE;
    b.pos.set(p.pos.x, eye - anchor.down, p.pos.z)
      .addScaledVector(_rgt, anchor.right).addScaledVector(_fwd, anchor.fwd);
    b.prev.copy(b.pos);
    const j = () => 1 + (this.brassRng.next() * 2 - 1) * 0.12;
    b.vel.copy(_rgt).multiplyScalar(2.10 * j());
    b.vel.y = 1.35 * j();
    b.vel.addScaledVector(_fwd, -0.30 * j());
    if (p.vel) b.vel.add(p.vel);            // NOT optional: a case thrown from a
    // r3: the floor where it will come down, from its flight (about 0.7 s; drag is small):
    // a collider's top under that point if there is one, else the ground (soft).
    b.heard = false; b.floorChecked = false; b.soft = 1;
    {
      const tf = (b.vel.y + Math.sqrt(b.vel.y * b.vel.y + 2 * CFG.player.GRAVITY * 1.5)) / CFG.player.GRAVITY;
      b.floorY = this._floorUnder(b.pos.x + b.vel.x * tf, b.pos.y, b.pos.z + b.vel.z * tf, 3.5);
      b.floorChecked = false;
    }
    b.rot.set(this.brassRng.next() * TAU, this.brassRng.next() * TAU, 0);  // moving
    b.prot.copy(b.rot);                                                    // gun
    b.spin.set(5 + this.brassRng.next() * 9, 14 + this.brassRng.next() * 9, 4);
  }

  /* ---- presentation --------------------------------------------------- */

  present(alpha) {
    const cam = this._sys('camera');
    const p = this._sys('player');
    const wep = this._sys('weapons');
    if (!cam || !p || !wep) return;
    const st = wep.vmState;

    for (let i = 0; i < C.N; i++) _S[i] = lerp(this.prevS[i], this.currS[i], alpha);

    const t = this.ctx.time.t + alpha * CFG.loop.FIXED;
    const a = ease.outQuint(_S[C.ADS]);       // the pose snaps; the FOV eases

    // ---- base: rest -> ADS. The ADS pose moves the MODEL so the reticle lands
    // on the world camera's centre ray; the aim itself never moves.
    _v.copy(this.restPos).lerp(this.adsPos, a);
    _e.set(this.restRot.x * (1 - a), this.restRot.y * (1 - a), this.restRot.z * (1 - a));

    // ---- sprint cant, and the swap (ROUND 5) which rides the same pose and then keeps
    // going: down and nose-first out of the bottom of the frame.
    const sw = _S[C.SWAP];
    const sp = Math.max(ease.inOutQuad(_S[C.SPRINT]) * (1 - a), sw);
    _v.x += SPRINT_POS.x * sp; _v.y += SPRINT_POS.y * sp; _v.z += SPRINT_POS.z * sp;
    _e.x += SPRINT_ROT.x * sp; _e.y += SPRINT_ROT.y * sp; _e.z += SPRINT_ROT.z * sp;
    if (sw > 0) {
      _v.x += SWAP_DROP.x * sw; _v.y += SWAP_DROP.y * sw; _v.z += SWAP_DROP.z * sw;
      _e.x += SWAP_ROT.x * sw;
    }

    // ---- melee: a horizontal buttstroke ACROSS the frame, never a thrust. Z
    // motion is the one axis a first-person camera reads worst.
    // ROUND 18 (Alex: "the melee looks lame"). The arc was 0.155 m of travel and 30 degrees
    // of yaw — a nudge, not a swing, and at 2 m range most of it happened off the side of
    // the frame where you could not see it. Nearly doubled, and given a THIRD axis: the
    // stock now drops and comes UP through the arc (the -0.055 term on y, keyed to how far
    // through the swing it is) so the whole thing reads as a body turning into a hit rather
    // than a rifle sliding sideways. Nothing about the timing changed — CFG.weapons.melee
    // still owns windup / travel / hold / active / recover, and those numbers are Alex's.
    const swing = _S[C.SWING], lift = _S[C.LIFT];
    if (swing !== 0 || lift !== 0) {
      _v.x += swing * 0.265;
      _v.y += lift * 0.052 - (1 - swing * swing) * 0.055 - Math.abs(swing) * 0.010;
      _v.z += lift * 0.052 - Math.max(0, swing) * 0.040;
      _e.y += -swing * 52 * DEG;
      _e.z += swing * 44 * DEG + lift * 14 * DEG;
      _e.x += lift * 13 * DEG - swing * 11 * DEG;
    }

    // ---- reload body track
    const rw = _S[C.RELOADW];
    if (rw !== 0) {
      _v.y += -0.045 * rw;
      _e.x += 9 * DEG * rw; _e.y += 22 * DEG * rw; _e.z += -16 * DEG * rw;
    }

    // ---- sway: two-octave NON-HARMONIC noise per axis. Harmonic sway reads as
    // a machine breathing; this reads as hands. (COMBAT_FEEL 3.6.1)
    // st.swayMul is 1 unless the gun says the breath is held (HANDS 'Hold'). The tree is
    // read in weapon.js and arrives here as one number, so this file needs no knowledge of
    // progression and behaves identically when the system does not exist.
    const breathMul = (st && st.swayMul > 0) ? st.swayMul : 1;
    const swayScale = lerp(1, 0.22, _S[C.ADS]) * lerp(1, 1.15, _S[C.SPRINT]) * breathMul;
    _e.y += sway2(t, 0.19, 0.47, 0.68, 0.32, 11) * 0.55 * DEG * swayScale;
    _e.x += sway2(t, 0.17, 0.43, 0.68, 0.32, 23) * 0.42 * DEG * swayScale;
    _e.z += sway2(t, 0.13, 0.37, 0.72, 0.28, 37) * 0.30 * DEG * swayScale;
    _v.x += sway2(t, 0.13, 0.31, 0.70, 0.30, 41) * 0.0022 * swayScale;
    _v.y += sway2(t, 0.11, 0.29, 0.70, 0.30, 53) * 0.0018 * swayScale;
    _v.z += sway2(t, 0.09, 0.23, 0.75, 0.25, 67) * 0.0010 * swayScale;
    // 6.6 breaths/min — and it is the FIRST thing that stops when the breath is held.
    _e.x += Math.sin(t * TAU * 0.11) * 0.09 * DEG * _S[C.ADS] * breathMul;

    // ---- bob, off the player's ONE stride clock
    const bph = (p.bobPhase || 0) * 2;
    const amp = _S[C.BOB];
    _v.y += -0.021 * Math.cos(2 * bph) * amp;
    _v.x += 0.014 * Math.sin(bph) * amp;

    // ---- springs: look lag, velocity lag, kick, land dip, jolt
    _e.x += _S[C.AL_X] + _S[C.KR_X];
    _e.y += _S[C.AL_Y] + _S[C.KR_Y];
    _e.z += _S[C.AL_Z] + _S[C.KR_Z];
    _v.x += _S[C.LL_X] + _S[C.KP_X];
    _v.y += _S[C.LL_Y] + _S[C.KP_Y] + _S[C.DIP] * 0.0170 + _S[C.JOLT] * -0.003;
    _v.z += _S[C.LL_Z] + _S[C.KP_Z];
    _e.x += _S[C.DIP] * -1.4 * DEG + _S[C.JOLT] * 0.6 * DEG;

    // root locked to the camera orientation: rotate-then-place
    this.root.position.set(0, 0, 0);
    this.root.quaternion.identity();
    const gripping=p.scaling||p.scaleDescending||p.climb!==0;
    const lo = ease.inOutQuad(_S[C.LOWER]);
    if (lo > 0) {
      const L = (this.cur && this.cur.pose.low) || LOW;
      _v.y += L.pos.y * lo; _v.z += L.pos.z * lo;
      _e.x += L.rot.x * lo; _e.y += L.rot.y * lo; _e.z += L.rot.z * lo;
    }
    // The pour hides the gun for as long as it lasts. It rides the same bob and sway as the
    // gun does, because it is in the same hands.
    if(this.pourRig){this.pourRig.root.visible=this.pouring&&!gripping;
      if(this.pourRig.root.visible){this.pourRig.root.position.copy(_v);this.pourRig.root.rotation.copy(_e);}}
    this.gun.visible=!gripping&&!this.pouring;
    for(const hand of this.climbHands){
      hand.visible=gripping&&!!this.ctx.camera&&placeClimbingHand(hand,p,this.ctx.camera,this.camera);
    }
    this.gun.position.copy(_v);
    this.gun.rotation.copy(_e);

    // ---- moving parts. The rifle's bolt handle lifts while back; the carbine's charging
    // handle does not (POSES.*.boltLift).
    // The travel is added to where the part was BUILT (boltZ0). It used to be written over it,
    // which put the shotgun's pump inside the receiver, buried the revolver's hammer and moved
    // the carbine's charging handle 3 cm back, in every frame (the r3 critic's side views).
    const P = this.cur ? this.cur.pose : POSES.bolt;
    this.bolt.position.z = (this.cur ? this.cur.boltZ0 : 0) + _S[C.BOLTZ] + _S[C.BOLTS] * 0.004;
    this.bolt.rotation.z = _S[C.BOLTZ] > 0.001 ? P.boltLift : 0;
    // r3: the revolver's cylinder turns on 60 degrees 30-100 ms after the shot, and its hammer,
    // down on the shot, comes back to full cock over 140 ms (neither ever above the sight line).
    const cyl = this.cur ? this.cur.cyl : null;
    if (cyl) {
      const ta = alpha * CFG.loop.FIXED;
      cyl.rotation.z = lerp(this._cylFrom, this._cylAng, ease.inOutQuad(clamp01((this._cylT + ta - 0.03) / 0.07)));
      this.bolt.rotation.x = -0.5 * (1 - ease.outCubic(clamp01((this._hammerT + ta) / 0.14)));
    }
    // The carbine's magazine follows the reload choreography (the rifle has a floorplate).
    const mag = this.cur ? this.cur.mag : null;
    if (mag) {
      mag.position.y = -0.075 + (_S[C.MAG_Y] + 0.042);
      mag.position.x = _S[C.MAG_X];
      mag.rotation.z = _S[C.MAG_RZ];
      mag.visible = _S[C.MAGVIS] > 0.5;
    }
    // ---- viewmodel lens, hip -> ADS
    const vfov = lerp(this.fovHip, this.fovAds, ease.inOutQuad(_S[C.ADS]));
    if (Math.abs(this.camera.fov - vfov) > 1e-3) {
      this.camera.fov = vfov;
      this.camera.updateProjectionMatrix();
    }

    this._presentTorch();
    this._presentFlash(t);
    this._presentBrass(alpha);
  }

  _presentFlash(t) {
    // r3: each gun's own flash (POSES.*.flash): the shotgun's is half again the rifle's and
    // lasts longer, the carbine's is small and quick (twelve a second), the revolver's has the
    // cylinder gap. Every shot is jittered in size (_flashJit) so no two read the same.
    const F = (this.cur && this.cur.pose.flash) || FLASH_NONE;
    const coreS = F.core, coneS = F.core * 1.47;
    const ft = t - this.flashT0;
    if (ft >= 0 && ft < coneS + 0.010) {
      this.flashCore.visible = ft < coreS;
      this.flashCone.visible = ft < coneS;
      this.flashU.uLife.value = clamp01(ft / coreS);
      this.coneMat.opacity = (1 - clamp01(ft / coneS)) * F.cone;
      const grow = 1 + (ft / coneS) * 0.35, ck = F.k * this._flashJit;
      this.flashCone.scale.set(ck * grow, F.len * grow, ck * grow);
      const env = Math.exp(-ft / 0.018);
      const scale = lerp(1, 0.55, this.flashAds) * ck;
      this.flashCore.scale.setScalar(scale);
      const MZ = this.muzzle;                 // the selected gun's crown (ROUND 5)
      this.flashCore.position.set(MZ.x, MZ.y, MZ.z - this.flashAds * 0.06);
      this.flashCone.position.set(MZ.x, MZ.y, MZ.z - 0.14 * F.len * grow);
      for (const m of this.flashGap) { m.visible = !!F.gap && ft < coreS; m.scale.setScalar(scale); }
      this.viewFlash.intensity = 2.6 * env * lerp(1, 0.55, this.flashAds) * Math.sqrt(F.k);
      // 7 cm AHEAD of the crown. THE CINDERBLOOM CLAMP, top of file.
      //
      // AND THE LAW WAS NOT BEING KEPT. This wrote the muzzle point as though it were a SCENE
      // coordinate, but MUZZLE is in GUN space and the gun sits at the rest pose, canted, and
      // recoiling. Measured standoff from the crown to this light, on the shipped pose:
      // 0.2454 m — three and a half times the 0.070 the clamp asks for, so the near-field
      // flash has been lighting the receiver from behind and to the left rather than the bore,
      // for the life of the file. On the new pose it would have been 0.2859 m.
      //
      // It stays parented to the SCENE rather than to the gun, because a light parented to a
      // 0.96x group would inherit the scale and be handed a 6.7 cm standoff — the clamp coming
      // back in through the door it was locked out of. So it is placed in scene space every
      // frame from the gun's own transform: the crown through localToWorld, which already
      // carries the pose, the recoil, the sway and the scale, then the fixed 7 cm forward.
      // Measured after: 0.0700 m, in every pose.
      this.gun.localToWorld(_v3.set(MZ.x, MZ.y, MZ.z));
      _v3.z -= FLASH_AHEAD;
      this.viewFlash.position.copy(_v3);
      // Keep the borrowed world rover riding the real muzzle.
      //
      // WHAT THIS USED TO BE, and why it is worth the paragraph: this block tested
      // `h.light || h` for `.isLight` and then wrote `.intensity` and `.position` on it.
      // A RoverHandle is NOT a light and never has been — gfx/lights.js keeps the physical
      // PointLight private on purpose, because the pool decides which eight borrows are
      // seated. So the condition was always false, the branch never ran, and the world
      // muzzle flash survived purely on its 0.075 s ttl. It happened to look right, which
      // is exactly why nobody caught it.
      //
      // The pool's real API is setPosition/setIntensity/setColour on the handle, and the
      // pool ALSO owns the envelope: gfx/lights.js decays a ttl'd borrow by
      // exp(-age/(ttl*0.4)) in both step() and present(). So intensity is not ours to
      // write — writing 46*env here would double-apply the falloff. Position is ours,
      // and this is the one thing worth doing: over 75 ms of a sprint or a fast turn the
      // muzzle moves several centimetres, and a light that stays where the shot started
      // is a light that lights the wrong grass.
      const h = this.muzzleHandle;
      if (h && h.inUse && h.gen === this.muzzleGen && h.setPosition) {
        // Same standoff law as the near-field light above: transform the CROWN, then step the
        // fixed 7 cm forward in camera space, so the model's scale cannot shrink the clamp.
        this.gun.localToWorld(_v2.set(MZ.x, MZ.y, MZ.z));
        _v2.z -= FLASH_AHEAD;
        // Viewmodel space is camera-relative; convert through the world camera.
        if (this.ctx.camera) _v2.applyMatrix4(this.ctx.camera.matrixWorld);
        h.setPosition(_v2.x, _v2.y, _v2.z);
      }
    } else {
      this.flashCore.visible = false;
      this.flashCone.visible = false;
      for (const m of this.flashGap) m.visible = false;
      this.viewFlash.intensity = 0;
      if (this.muzzleHandle) this._releaseMuzzleLight();
    }
  }

  _presentBrass(alpha) {
    // r3: a dead case is parked once, on the frame it goes, not rewritten every frame; with
    // nothing live and nothing just gone there is no upload at all (it was 48 matrices a frame).
    let dirty = false;
    for (let i = 0; i < BRASS_N; i++) {
      const b = this.brassState[i];
      if (!b.live) {
        if (b.shown) { b.shown = false; _m.makeScale(0, 0, 0); this.brass.setMatrixAt(i, _m); dirty = true; }
        continue;
      }
      b.shown = true;
      _v2.lerpVectors(b.prev, b.pos, alpha);
      _e.set(lerp(b.prot.x, b.rot.x, alpha), lerp(b.prot.y, b.rot.y, alpha), 0);
      const sc = b.age > 5.4 ? 1 - (b.age - 5.4) / 0.6 : 1;
      _m.compose(_v2, _q.setFromEuler(_e), _v.set(sc, sc, sc));
      this.brass.setMatrixAt(i, _m);
      dirty = true;
    }
    if (dirty) this.brass.instanceMatrix.needsUpdate = true;
  }

  /**
   * Draw the gun. MUST be called by the gfx owner AFTER the final composite,
   * or the gun is behind post and the world paints over it. We also register
   * this into ctx.overlays at construction so the hook needs no knowledge of
   * us; see docs/HANDOFF.md.
   */
  render() {
    if (this.ctx.shared.inCar) return;
    const r = this.ctx.renderer;
    if (!r) return;
    if (this.renderedFrame === this.ctx.time.frame) return;   // never draw twice
    this.renderedFrame = this.ctx.time.frame;
    // autoClear defaults to TRUE in r161, and EffectComposer's RenderPass restores it to true
    // when the composite finishes. So calling render() here with it still on issues a full
    // clear(colour, depth, stencil) on the default framebuffer and wipes the world that post
    // just composited — the first frame was a black screen with a rifle floating on it.
    // clearDepth() alone is what the gun needs; the colour buffer must survive.
    // Feed the lane-local grade. Resolution must be the DRAWING BUFFER, not the CSS size, or
    // the vignette centre drifts off the frame centre at renderScale 0.75 and the grain field
    // stops matching the world's — which is the whole point of applying it here at all.
    // Both writes are into pre-allocated objects; nothing here allocates.
    // r3: GRADED ONCE. post.js draws the gun INTO its HDR target now, so the world's grade already
    // covers it; this file's own grade then ran on top, in linear light: a second vignette where
    // the gun sits (the corner, where it is strongest), a black floor that lifted its blacks and a
    // second split tone. The door for it (setGraded) was never called; it is, the first frame the
    // post chain says it draws the overlays.
    if (!this._gradeChecked) {
      const post = this._sys('post');
      if (post && typeof post.willWarmOverlays === 'function') {
        this._gradeChecked = true;
        if (post.willWarmOverlays()) this.setGraded(false);
      }
    }
    if (this._gradeU) {
      r.getDrawingBufferSize(this._bufSize);
      this._gradeU.uVmResolution.value.set(this._bufSize.x, this._bufSize.y);
      this._gradeU.uVmTime.value = (this.ctx.time && this.ctx.time.t) || 0;
    }
    const prevAutoClear = r.autoClear;
    r.autoClear = false;
    r.clearDepth();                     // the gun never clips a wall
    r.render(this.scene, this.camera);
    r.autoClear = prevAutoClear;
  }

  /** Projected NDC offset of the reticle from screen centre. Test probe: at
   *  full ADS this must be within a pixel of (0, 0) or the gun is lying. */
  sightScreenOffset() {
    this.dot.getWorldPosition(_v2);
    _v2.project(this.camera);
    return { x: _v2.x, y: _v2.y };
  }

  dump() {
    return {
      weapon: this.curId, swap: this.currS[C.SWAP],
      lowered:this.currS[C.LOWER],
      fov: this.camera.fov, adsT: this.currS[C.ADS],
      sight: this.sightScreenOffset(),
      boltZ: this.currS[C.BOLTZ],
      brassLive: this.brassState.reduce((n, b) => n + (b.live ? 1 : 0), 0),
      flashAge: this.ctx.time.t - this.flashT0,
      renderedFrame: this.renderedFrame,
    };
  }
}

// vigil viewmodel.js:236 — which reload beats shove the gun, and how hard.
// 'active' (D2) is the active-reload hit landing in the hands: a shade more than the seat,
// so a hit is felt and not only heard. 'shell' is one shell thumbed into the shotgun's tube
// (weapon.js _startTubeReload), lighter than a magazine seating and repeated per shell.
// r3: PEAKS in jolt units now (THE HANDS AT WORK): the seat is 6 mm, the bolt going home on an
// empty reload 9 mm. The ratios between the beats are VIGIL's, near enough.
const RELOAD_JOLT = { contact: 1.0, seat: 2.0, boltrelease: 3.0, drop: 0.6, active: 2.3, shell: 1.0 };
// r3: the bolt (or the pump) arriving at the back and going home (weapon.js 'weapon:cycle').
const CYCLE_JOLT = { back: 1.3, home: 1.7 };

export default Viewmodel;
