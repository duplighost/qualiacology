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
import { TAU, DEG, clamp, clamp01, lerp, ease, Spring, Spring3, sway2 } from '../engine/math.js';
import CFG from '../config.js';

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

// Scope optical centre in gun space. The ADS pose is solved from it so the
// reticle lands on the world camera's centre ray to the pixel.
const SIGHT = new THREE.Vector3(0, 0.0735, 0.0300);
const ADS_DIST = 0.155;                       // eye to reticle when aimed
// Solved from the scale, not hard-coded: the sight axis rides the model, so a model scaled
// about the action moves the axis with it and the ADS pose has to follow or the reticle walks
// off the world camera's centre ray. At VM_SCALE 1 this is VIGIL's number exactly.
const adsPosFor = (scale, out) => out.set(0, -SIGHT.y * scale, -(ADS_DIST + SIGHT.z * scale));

// A bolt rifle is long. The crown sits well forward of the carbine's -0.472.
const MUZZLE = new THREE.Vector3(0, 0.014, -0.5850);
const FLASH_AHEAD = 0.070;                    // see THE CINDERBLOOM CLAMP above

const SPRINT_POS = new THREE.Vector3(0.075, -0.045, -0.020);
const SPRINT_ROT = new THREE.Euler(-14 * DEG, 8 * DEG, 32 * DEG);

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

const BRASS_N = 24;                           // a bolt gun does not need 48

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
`;

const VM_GRADE_TAIL = /* glsl */`
  {
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
  N: 26,
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

    this._buildLights();
    this._buildGun();
    this._buildFlash();
    this._buildBrass();
    this._applyPose();

    /* ---- springs. VIGIL's freq/damping pairs, unchanged. ---- */
    this.kickPos = new Spring3(16, 0.50);
    this.kickRot = new Spring3(16, 0.50);
    this.angLag = new Spring3(6.5, 0.72);
    this.linLag = new Spring3(7.0, 0.80);
    this.landDip = new Spring(6.2, 0.62);
    this.jolt = new Spring(13, 0.55);
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

    ctx.bus.on('player:land', (p) => {
      const sp = (p && p.speed) || 0;
      this.landDip.nudge(-clamp(sp * 0.030, 0, 0.42) * 6.2);
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
    adsPosFor(this.vmScale, this.adsPos);
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
      };
      this._gradeOn = true;
      this._bufSize = new THREE.Vector2(1, 1);
    }
    const U = this._gradeU;
    mat.onBeforeCompile = (shader) => {
      for (const k in U) shader.uniforms[k] = U[k];
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>',
          '#include <common>\n' +
          'uniform float uVmTime, uVmContrastFrom, uVmContrastTo, uVmContrast;\n' +
          'uniform float uVmBlackFloor, uVmGrain, uVmVignette;\n' +
          'uniform vec2 uVmResolution;\n' + VM_GRADE_HELPERS)
        .replace('#include <colorspace_fragment>',
          '#include <colorspace_fragment>\n' + VM_GRADE_TAIL);
    };
    // CONSTANT, and identical across all four materials: they share one program.
    mat.customProgramCacheKey = () => 'curfew-vm-grade-1';
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
    // ROUGHNESS IS THE ART DECISION, not the colour. A flat BoxGeometry face has one
    // normal across its whole area, so at roughness 0.33 the receiver's top plate sat at
    // the peak of the specular lobe ALL AT ONCE and clipped to white — 9.7% of that one
    // mesh's pixels were at or above 200 and its max was 243. At 0.64 the same face peaks
    // at 126 and the highlight becomes a gradient across the plate instead of a cutout.
    // Per-mesh means, before -> after: receiver 35.0 -> 21.4, floorplate 45.1 -> 25.6,
    // comb 34.0 -> 21.0, scope tube 8.2 -> 3.6.
    //
    // ROUND TWO: 0.64 -> 0.84 and metalness 0.62 -> 0.40. Measured, gun pixels, frame A, hip:
    //   roughness  0.64   0.78   0.84   0.90        (metalness 0.62, key 1.25, ambient 2.2)
    //   gun p95   102.1   49.7   36.6   31.5
    //   gun max     125   66.6   51.8     51
    // The response is monotonic and steep, which is what a lobe-width lever looks like; 0.84
    // is chosen rather than 0.90 because the last step buys 0.8 of max and costs the edge
    // that says "metal". Metalness comes down with it so the key's DIFFUSE can carry the
    // body — at metalness 0.62 the diffuse term is scaled by 0.38 and the gun could only be
    // lit by specular, which is the whole fault of round one's frame.
    const wood = new THREE.MeshStandardMaterial({ color: 0x291b12, roughness: 0.80, metalness: 0.03 });
    const blued = new THREE.MeshStandardMaterial({ color: 0x1f2329, roughness: 0.84, metalness: 0.40 });
    const matte = new THREE.MeshStandardMaterial({ color: 0x171b20, roughness: 0.92, metalness: 0.06 });
    const brassM = new THREE.MeshStandardMaterial({ color: 0x7a5a24, roughness: 0.42, metalness: 0.80 });
    this._mats = [wood, blued, matte, brassM];
    for (const m of this._mats) this._grade(m);

    const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      parent.add(m);
      return m;
    };
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
      const g = new THREE.CylinderGeometry(r, r, len, seg, 1, open);
      g.rotateX(Math.PI / 2);
      return g;
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

    const g = this.gun;
    // receiver + barrel: the long line that says "rifle" from the first frame
    add(g, ridgedBox(0.050, 0.062, 0.235, 3), blued, 0, 0, -0.045);
    add(g, tube(0.0125, 0.42), blued, 0, 0.014, -0.375);
    add(g, tube(0.0165, 0.030), blued, 0, 0.014, -0.5750);          // crown
    add(g, new THREE.BoxGeometry(0.0045, 0.018, 0.007), blued, 0, 0.0335, -0.545);  // front blade
    // furniture
    add(g, new THREE.BoxGeometry(0.042, 0.044, 0.260), wood, 0, -0.008, -0.290);    // forend
    add(g, new THREE.BoxGeometry(0.046, 0.030, 0.016), blued, 0, 0.004, -0.400);    // barrel band
    add(g, new THREE.BoxGeometry(0.044, 0.072, 0.240), wood, 0, -0.014, 0.135);     // comb
    add(g, new THREE.BoxGeometry(0.048, 0.092, 0.016), matte, 0, -0.028, 0.256);    // butt plate
    add(g, new THREE.BoxGeometry(0.038, 0.062, 0.075), wood, 0, -0.048, 0.055, 0.22); // wrist
    add(g, new THREE.BoxGeometry(0.044, 0.036, 0.085), blued, 0, -0.042, -0.055);   // floorplate
    add(g, new THREE.BoxGeometry(0.010, 0.005, 0.056), blued, 0, -0.050, -0.012);   // trigger guard
    add(g, new THREE.BoxGeometry(0.006, 0.020, 0.005), blued, 0, -0.044, -0.008);   // trigger

    // the bolt: a group so the whole assembly throws back and forward
    this.bolt = new THREE.Group();
    g.add(this.bolt);
    this.bolt.position.set(0, 0, 0);
    add(this.bolt, tube(0.0105, 0.120, 8), blued, 0.0, 0.021, -0.010);
    add(this.bolt, new THREE.BoxGeometry(0.030, 0.009, 0.009), blued, 0.020, 0.018, 0.030);  // stem
    add(this.bolt, new THREE.SphereGeometry(0.0115, 8, 6), blued, 0.036, 0.012, 0.030);      // knob
    // ejection port shadow: a near-black sliver so the port reads as a HOLE and
    // the bolt's travel is legible against it in moonlight.
    add(g, new THREE.BoxGeometry(0.002, 0.026, 0.070),
      new THREE.MeshBasicMaterial({ color: 0x04060a }), 0.0255, 0.020, -0.010);

    // scope. The reticle is a real illuminated dot: the gun has to be aimable
    // in a county with no daylight, and a black crosshair on a black hillside
    // is the working-but-illegible failure mode this project is named for.
    const sg = new THREE.Group();
    g.add(sg);
    sg.position.set(0, SIGHT.y, 0);
    // Open at both ends, and DoubleSide so the far half of the bore wall still renders —
    // with front-face culling an open tube shows the world through its own sides and reads as
    // a floating ring. `side` is render state, not a shader define, so this clone shares the
    // matte program and costs no extra compile.
    const bore = matte.clone();
    bore.side = THREE.DoubleSide;
    bore.name = 'vm-bore';
    add(sg, tube(0.0195, 0.200, 12, true), bore, 0, 0, -0.045);
    add(sg, tube(0.0260, 0.048, 12, true), bore, 0, 0, -0.152);   // objective bell
    add(sg, tube(0.0225, 0.036, 12, true), bore, 0, 0, 0.026);    // ocular
    add(sg, new THREE.BoxGeometry(0.030, 0.016, 0.016), blued, 0, -0.022, -0.112);
    add(sg, new THREE.BoxGeometry(0.030, 0.016, 0.016), blued, 0, -0.022, 0.004);
    // The ocular glass. At 0.30 over a CLOSED tube this was simply a darker lid; over an
    // open bore it is what a coated lens actually is — a faint cool tint you see the county
    // through. depthWrite off so a transparent disc cannot punch the depth of the world
    // behind it, and it sits just inside the ocular rather than across the whole aperture.
    add(sg, new THREE.CircleGeometry(0.0180, 20), new THREE.MeshBasicMaterial({
      color: 0x16283a, transparent: true, opacity: 0.10, depthWrite: false,
      side: THREE.DoubleSide,
    }), 0, 0, 0.0435);
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
    this.dot = add(sg, new THREE.CircleGeometry(0.0013, 10), new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.320, 0.092, 0.016), toneMapped: false,
      transparent: true, opacity: 1.0, depthWrite: false, side: THREE.DoubleSide,
    }), 0, 0, DOT_Z);
    this.dot.renderOrder = 5;

    // Nothing on a viewmodel may ever be frustum-culled: the gun sits inside
    // the near plane's shadow and three's bounding-sphere test gets it wrong.
    g.traverse(o => { o.frustumCulled = false; });
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
      transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    });
    this.flashCore = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), coreMat);
    this.flashCore.visible = false;
    this.flashCore.frustumCulled = false;
    this.flashCore.position.copy(MUZZLE);
    this.gun.add(this.flashCore);

    this.coneMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.0, 0.55, 0.18), transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    this.flashCone = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.28, 10, 1, true), this.coneMat);
    this.flashCone.rotation.x = -Math.PI / 2;
    this.flashCone.position.set(MUZZLE.x, MUZZLE.y, MUZZLE.z - 0.14);
    this.flashCone.visible = false;
    this.flashCone.frustumCulled = false;
    this.gun.add(this.flashCone);
  }

  _buildBrass() {
    // Brass lives in the WORLD scene: a case you can walk back and find is a
    // record of what you did, and it is the cheapest proof the gun is real.
    const geo = new THREE.CylinderGeometry(0.0042, 0.0040, 0.0620, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0xc8963e, roughness: 0.35, metalness: 0.9 });
    this.brass = new THREE.InstancedMesh(geo, mat, BRASS_N);
    this.brass.frustumCulled = false;
    this.brass.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
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
      });
    }
    this.brassCursor = 0;
    // Fixed-capacity delay queue: a bolt gun ejects one case per cycle, so 4
    // pending is already generous and it never grows in the hot path.
    this.brassDelay = new Float64Array(4).fill(-1);
  }

  async init() {
    // Parent the brass here, not in the constructor: main.js constructs every system before
    // it calls any init(), so ctx.scene does not exist yet at construction time. ready()
    // asserts brass.parent so a future regression fails the boot sweep instead of silently
    // simulating an ejection pool nobody can see.
    if (this.ctx.scene && !this.brass.parent) this.ctx.scene.add(this.brass);

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
      };
    }
  }

  ready() { return !!this.scene && !!this.camera && !!this.gun && !!this.brass.parent; }

  dispose() {
    if (this.ctx.scene) this.ctx.scene.remove(this.brass);
    this.brass.geometry.dispose();
    this.brass.material.dispose();
    for (const m of this._mats) m.dispose();
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }

  onResize(w, h) {
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  /** Compile every viewmodel program at boot, flash included. */
  warmup() {
    this.flashCore.visible = true;
    this.flashCone.visible = true;
    if (this.ctx.renderer) this.ctx.renderer.compile(this.scene, this.camera);
    this.flashCore.visible = false;
    this.flashCone.visible = false;
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

    this.prevS.set(this.currS);

    this.sprintT = clamp01(this.sprintT + (st.sprinting ? dt / 0.18 : -dt / 0.13));
    this.kickPos.update(dt); this.kickRot.update(dt);
    this.angLag.update(dt); this.linLag.update(dt);
    this.landDip.update(dt); this.jolt.update(dt); this.boltS.update(dt);
    this.boltAnim += dt;

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
    let boltZ = 0;
    const cyc = st.cycleLen;
    if (cyc > 0 && this.boltAnim < cyc) {
      const u = this.boltAnim / cyc;
      if (u < 0.42) boltZ = 0.062 * ease.outQuad(u / 0.42);
      else if (u < 0.86) boltZ = 0.062 * (1 - ease.inQuad((u - 0.42) / 0.44)) - 0.0015;
      else boltZ = 0;
    } else if (st.empty && !st.reloading) {
      boltZ = 0.062;                          // held open on empty: it SHOWS you
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
    if (st.reloading) rw = Math.sin(Math.PI * clamp01(st.reloading.t / st.reloading.dur));

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

    this._stepBrass(dt, p, cam);
  }

  /* ---- pulses from the gun ------------------------------------------- */

  _onPulse(pu, st) {
    switch (pu.type) {
      case 'kick': {
        // CHANNEL 3 of the three. ~70% of the felt motion, and it lives here,
        // in a scene that does not share the world camera — so however violent
        // it looks it cannot move a bullet.
        const i = pu.index, mW = pu.mW;
        this.kickPos.nudge((i % 2 ? -0.004 : 0.004) * mW * 16, 0.006 * mW * 16, 0.028 * mW * 16);
        this.kickRot.nudge(3.4 * DEG * mW * 16,
          (i % 2 ? 1.1 : -1.1) * DEG * mW * 16,
          (i % 2 ? 2.2 : -2.2) * DEG * mW * 16);
        this.boltS.nudge(1.0);
        this.boltAnim = 0;
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
        break;
      }
      case 'reload:beat': {
        const j = RELOAD_JOLT[pu.name];
        if (j) this.jolt.nudge(j * 10);
        if (pu.name === 'drop') this.magDropT = 0;
        if (pu.name === 'enter') { this.magRiseT = 0; this.magDropT = -1; }
        break;
      }
      case 'reload:end':
        this.magDropT = -1; this.magRiseT = -1;
        break;
      case 'melee:connect':
        this.kickPos.nudge(-0.030 * 16, -0.026 * 16, -0.070 * 16);
        this.kickRot.nudge(-7 * DEG * 16, 5 * DEG * 16, 9 * DEG * 16);
        this.jolt.nudge(10);
        break;
      case 'dry':
        this.jolt.nudge(2.4);
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
      0xffc27a, 46, 0.075,
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
      const gy = terrain && terrain.heightAt ? terrain.heightAt(b.pos.x, b.pos.z) : 0;
      if (b.pos.y < gy + 0.01 && b.vel.y < 0 && b.bounces < 2) {
        b.pos.y = gy + 0.01;
        b.vel.y *= -0.32;
        b.vel.x *= 0.55; b.vel.z *= 0.55;
        b.spin.multiplyScalar(0.45);
        b.bounces++;
      } else if (b.pos.y < gy) {
        b.pos.y = gy; b.vel.set(0, 0, 0); b.spin.set(0, 0, 0);
      }
      b.rot.x += b.spin.x * dt;
      b.rot.y += b.spin.y * dt;
    }
  }

  _spawnBrass(p, cam) {
    const b = this.brassState[this.brassCursor];
    this.brassCursor = (this.brassCursor + 1) % BRASS_N;
    b.live = true; b.age = 0; b.bounces = 0;
    const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
    _rgt.set(cy, 0, -sy);
    _fwd.set(-sy, 0, -cy);
    const eye = p.eyeY !== undefined ? p.eyeY : p.pos.y + CFG.player.EYE;
    b.pos.set(p.pos.x, eye - 0.06, p.pos.z)
      .addScaledVector(_rgt, 0.16).addScaledVector(_fwd, 0.30);
    b.prev.copy(b.pos);
    const j = () => 1 + (this.brassRng.next() * 2 - 1) * 0.12;
    b.vel.copy(_rgt).multiplyScalar(2.10 * j());
    b.vel.y = 1.35 * j();
    b.vel.addScaledVector(_fwd, -0.30 * j());
    if (p.vel) b.vel.add(p.vel);            // NOT optional: a case thrown from a
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

    // ---- sprint cant
    const sp = ease.inOutQuad(_S[C.SPRINT]) * (1 - a);
    _v.x += SPRINT_POS.x * sp; _v.y += SPRINT_POS.y * sp; _v.z += SPRINT_POS.z * sp;
    _e.x += SPRINT_ROT.x * sp; _e.y += SPRINT_ROT.y * sp; _e.z += SPRINT_ROT.z * sp;

    // ---- melee: a horizontal buttstroke ACROSS the frame, never a thrust. Z
    // motion is the one axis a first-person camera reads worst.
    const swing = _S[C.SWING], lift = _S[C.LIFT];
    if (swing !== 0 || lift !== 0) {
      _v.x += swing * 0.155;
      _v.y += lift * 0.052 - Math.abs(swing) * 0.018;
      _v.z += lift * 0.052;
      _e.y += -swing * 30 * DEG;
      _e.z += swing * 26 * DEG + lift * 14 * DEG;
      _e.x += lift * 13 * DEG;
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
    _e.x += _S[C.AL_X] + _S[C.KR_X] / 16;
    _e.y += _S[C.AL_Y] + _S[C.KR_Y] / 16;
    _e.z += _S[C.AL_Z] + _S[C.KR_Z] / 16;
    _v.x += _S[C.LL_X] + _S[C.KP_X] / 16;
    _v.y += _S[C.LL_Y] + _S[C.KP_Y] / 16 + _S[C.DIP] * 0.0170 + _S[C.JOLT] * -0.003;
    _v.z += _S[C.LL_Z] + _S[C.KP_Z] / 16;
    _e.x += _S[C.DIP] * -1.4 * DEG + _S[C.JOLT] * 0.6 * DEG;

    // root locked to the camera orientation: rotate-then-place
    this.root.position.set(0, 0, 0);
    this.root.quaternion.identity();
    this.gun.position.copy(_v);
    this.gun.rotation.copy(_e);

    // ---- moving parts
    this.bolt.position.z = _S[C.BOLTZ] + _S[C.BOLTS] * 0.004;
    this.bolt.rotation.z = _S[C.BOLTZ] > 0.001 ? -0.55 : 0;   // handle lifted while back

    // ---- viewmodel lens, hip -> ADS
    const vfov = lerp(this.fovHip, this.fovAds, ease.inOutQuad(_S[C.ADS]));
    if (Math.abs(this.camera.fov - vfov) > 1e-3) {
      this.camera.fov = vfov;
      this.camera.updateProjectionMatrix();
    }

    this._presentFlash(t);
    this._presentBrass(alpha);
  }

  _presentFlash(t) {
    const ft = t - this.flashT0;
    if (ft >= 0 && ft < 0.060) {
      this.flashCore.visible = ft < 0.034;
      this.flashCone.visible = ft < 0.050;
      this.flashU.uLife.value = clamp01(ft / 0.034);
      this.coneMat.opacity = (1 - clamp01(ft / 0.050)) * 0.55;
      this.flashCone.scale.setScalar(1 + (ft / 0.050) * 0.35);
      const env = Math.exp(-ft / 0.018);
      const scale = lerp(1, 0.55, this.flashAds);
      this.flashCore.scale.setScalar(scale);
      this.flashCore.position.set(MUZZLE.x, MUZZLE.y, MUZZLE.z - this.flashAds * 0.06);
      this.viewFlash.intensity = 2.6 * env * lerp(1, 0.55, this.flashAds);
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
      this.gun.localToWorld(_v3.set(MUZZLE.x, MUZZLE.y, MUZZLE.z));
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
        this.gun.localToWorld(_v2.set(MUZZLE.x, MUZZLE.y, MUZZLE.z));
        _v2.z -= FLASH_AHEAD;
        // Viewmodel space is camera-relative; convert through the world camera.
        if (this.ctx.camera) _v2.applyMatrix4(this.ctx.camera.matrixWorld);
        h.setPosition(_v2.x, _v2.y, _v2.z);
      }
    } else {
      this.flashCore.visible = false;
      this.flashCone.visible = false;
      this.viewFlash.intensity = 0;
      if (this.muzzleHandle) this._releaseMuzzleLight();
    }
  }

  _presentBrass(alpha) {
    let dirty = false;
    for (let i = 0; i < BRASS_N; i++) {
      const b = this.brassState[i];
      if (!b.live) { _m.makeScale(0, 0, 0); this.brass.setMatrixAt(i, _m); dirty = true; continue; }
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
const RELOAD_JOLT = { contact: 0.18, seat: 0.5, boltrelease: 0.85, drop: 0.1 };

export default Viewmodel;
