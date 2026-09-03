// lights — THE CENSUS. Manifest #2.
//
// 13 lights, allocated in init() at intensity 0, added to the scene once, and never
// added, removed, re-parented or `.visible = false`d again for the life of the page:
//
//   1 DirectionalLight (moon)  — the ONLY shadow caster in the county
//   1 HemisphereLight          — "the house feels empty" is this number, not a prop count
//   1 AmbientLight             — the floor; nowhere is a pitch-black void
//   8 PointLight               — the rover pool; muzzle, eyes, motes, embers all BORROW
//   2 SpotLight                — torch (512 shadow) + headlights (no shadow)
//
// Three bakes numDirectional/numPoint/numSpot AND the shadow counts into every material's
// program. A light that appears later recompiles every material mid-frame and the page
// hangs for seconds: MARROW's "it freezes when I pick up a key". So castShadow is pinned
// at boot too — toggling castShadow changes numSpotLightShadows, which is the same
// recompile by another door.
//
// Pattern for the pool lifted from SKYSHARD src/fx/rovers.js:1-66 (fixed pool, borrowers
// request, nearest-first, distance fade so the handoff never pops).

import * as THREE from 'three';
import { CFG } from '../config.js';
import { clamp, clamp01, lerp, damp } from '../engine/math.js';

// How many logical borrows can exist at once. More borrows than physical lights is the
// point: the pool seats the 8 nearest and the rest wait, which is why an off-screen
// ember never steals the muzzle flash.
const MAX_BORROWS = 32;

// MARROW config.js:64-70 — the post-fix torch, in candela with decay 2 under an ACES
// exposure of ~1.2. Its `distance` (68 m) has no home in CFG yet; requested in HANDOFF.md.
const TORCH_DISTANCE = 68;
const TORCH_COLOUR = 0xffeccb;
const TORCH_DECAY = 2.0;

// Moon direction, deep night. Elevation 34 degrees so trunks cast long readable bars and
// the ground still separates from the sky; azimuth chosen so the light rakes across the
// default heading rather than down it.
//
// These are DEFAULTS, not the truth: world/clock.js recomputes an elevation every step
// (its MOON_ELEV_HIGH 0.593 -> MOON_ELEV_LOW 0.235 arc) and drives it through setMoonArc().
// Until that knob existed the black hour's low moon simply never happened on screen — the
// number was computed and thrown away. The arc lives on the INSTANCE now; these consts are
// only the value we boot at.
const MOON_ELEV = 0.593;   // radians, ~34 deg
const MOON_AZIM = 2.234;   // radians, ~128 deg
// Below ~0.14 rad the pinned shadow bias stops holding and trunk shadows detach; above
// ~1.45 the moon is overhead and the county loses every long readable bar. The clamp is
// here rather than in clock.js because the shadow box is ours.
const MOON_ELEV_MIN = 0.14, MOON_ELEV_MAX = 1.45;

// setMoonTint's destination. director/tension.js pushes the moon toward this as tension
// climbs; world/clock.js runs its own pale->red arc for the black-hour telegraph. Both end
// up warm on purpose: the sky reddening is ONE language, and the player is meant to read it
// as "it is getting worse" without knowing which system said so.
const MOON_TINT_R = 0xbf / 255, MOON_TINT_G = 0x52 / 255, MOON_TINT_B = 0x36 / 255;

/* ---- THE FILL. ART.md 1.3 and 1.4. ----------------------------------------
 * These four numbers are the working values for CFG.lights.hemi.intensity,
 * CFG.lights.ambient.intensity and CFG.lights.hemi.ground. config.js is the engine owner's
 * file, so they live here until the integrator applies the CONFIG CHANGES recorded in
 * docs/HANDOFF.md; when CFG carries them, delete these and read CFG again.
 *
 * 1.3 — MOVE FILL FROM AMBIENT TOWARD HEMI. DO NOT CUT THE TOTAL.
 * The measured trap, from ART.md 1.3's sweep of the two fills against the ground band:
 *     4.5 / 2.0 (shipped) -> ground 35.6, 32-95 share 22.2%
 *     3.0 / 1.4           -> ground 28.6, 11.9%
 *     1.5 / 0.7           -> ground 20.4,  5.2%
 * THE FILL IS WHAT MAKES THE GROUND READ. Cutting it takes the game straight back to the
 * void the M0 audit already fixed once ("the forest rendered as a void — 98.4% of the lower
 * frame below luminance 8"). A light's COLOUR multiplies its intensity, which is why the
 * near-black fills of the pre-M0 build contributed nothing at all.
 *
 * What is wrong is not the amount but that AmbientLight is DIRECTIONLESS: it adds the same
 * irradiance to a surface facing the moon and to one facing away, which is exactly what
 * turns a cylinder into a slab. So the total holds and the share moves to the hemisphere,
 * which at least knows which way is up.
 *
 * HEMI_GROUND is CURFEW's ENTIRE warm-below term (ART.md 0.5: cold from above, warm and
 * very dim from below). 0x1d2620 is a green-grey and the bounce off a forest floor is not.
 */
// These were local constants while the art round measured them, with a note in HANDOFF asking
// the integrator to move them into config and delete the locals. Config now carries the
// measured values (hemi 6.8, ambient 1.55, from the tools/lightsweep.mjs ladder), so the
// locals are gone and this reads the one source again. A local that shadows config is a
// second source of truth, and the sweep spent a run measuring a number the game was not using.
const HEMI_INTENSITY = CFG.lights.hemi.intensity;
const AMBIENT_INTENSITY = CFG.lights.ambient.intensity;
const HEMI_GROUND = 0x241f18;    // was CFG.lights.hemi.ground 0x1d2620

/* 1.4 — THE BLACK HOUR IS NOT BLACK.
 * clock.js drives the moon and the sky and nothing else: its own comment says so on purpose
 * ("hemi (4.5) and ambient (2.0) are untouched"). Measured consequence, frame D against
 * frame A: ground moved 38.7 -> 28.9 (0.75x) and the grass did not move at all
 * (143.4 -> 146.1). The hour whose entire job is to be the most frightening thing in the
 * game was costing the county a quarter of its floor and nothing else.
 *
 * So the fill dims with the moon. THE CENSUS IS UNTOUCHED — this is a uniform write on two
 * lights that already exist, exactly like clock's own moon.intensity write.
 *
 * The scale is derived HERE, from clock.redness read lazily at use, rather than pushed from
 * clock._apply(). Two owners writing one light is the bug this file's moon-tint comment
 * spends forty lines on; hemi and ambient belong to the census and the census belongs here.
 * clock is manifest #4 and we are #2, so this reads the redness clock published at the end
 * of the previous step — one fixed step (16 ms) of latency on a value that takes 180 s to
 * travel its whole arc. See docs/HANDOFF.md: clock.js must NOT also write these.
 */
const FILL_BLACK_MUL = 0.55;     // lerp(1, 0.55, redness), the same shape as MOON_BLACK_MUL

/* ---- ctx.shared.lit: how lit the player is, 0..1 ---------------------------
 * OWNED BY THIS FILE (CONTRACT, "Shared read-only state on ctx") and published every step.
 * Three lanes read it and one of them has no fallback: enemies/enemies.js scales poacher
 * accuracy by (1 + lit * 1.40), director/tension.js takes 0.30 of the whole dread bus from
 * darkness, and progression/progress.js will not bank XP below 0.60. While nothing wrote it
 * the light trade at the centre of DESIGN §3 — seeing is how you are seen — did not exist.
 *
 * The two ends are what matter and they are asserted by the shape of the terms:
 *   0.00  torch off, no borrow, no claimed place, no car beam on you, full canopy overhead.
 *         Nothing adds. Every term here must be able to reach zero on its own, or this end
 *         does not exist — which is exactly what the ungated headlight term did to it.
 *   ~0.97 standing on the Filling Station's claimed, lit apron.
 * Terms combine by 1-(1-a)(1-b): light adds, and it saturates instead of clipping.
 */
const LIT_TORCH_BASE = 0.42;   // carrying a lit torch at all
const LIT_TORCH_AIM = 0.20;    // ...plus this much when the cone has settled onto your view
const LIT_HEADLIGHT = 0.52;    // driving with the headlights on is the same trade at speed
// ...but ONLY while the beam is on you. This term used to be a bare `if (headlightOn)`, and
// vehicle/car.js switches the headlights on the moment the car spawns and leaves them on:
// one autonomous spawn anywhere in the county pinned lit >= 0.52 for the rest of the
// session, with the car parked 400 m away behind a ridge. Measured consequences: tension's
// darkness term collapsed 0.30 -> 0.144 permanently, poacher accuracy sat at (1 + 0.52*1.40)
// forever, and progression's 0.60 bank threshold was one moon term from firing in an open
// field. Worst of all it made lit = 0.00 — torch off under full canopy, the end this whole
// number exists to have — unreachable. So it falls off with distance exactly like a rover.
// The fade-out end is NOT a new number: it is CFG.lights.headlight.distance, the SpotLight's
// own reach, read at use. Past it the real light contributes nothing, so neither may lit.
const LIT_HEADLIGHT_FULL = 6;  // m: at the lamp (or in the cab) you are standing in the beam
const LIT_MOON_MAX = 0.34;     // an open sky under the high moon. Never enough to bank on
const LIT_ROVER_REF = 24;      // candela that reads as "fully lit" at arm's length
const LIT_ROVER_SOFT = 4;      // m^2 softening so a rover at 0 m is not a divide by zero
const LIT_PLACE_MAX = 0.96;    // a claimed place's own lamps
const LIT_PLACE_FULL = 18;     // m: inside this you are standing in it
const LIT_PLACE_FADE = 52;     // m: and out here its light does not reach you at all

// Module-level scratch. The hot path allocates nothing.
const _dir = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _col = new THREE.Color();

class RoverHandle {
  constructor(pool, index) {
    this._pool = pool;
    this._index = index;
    this.gen = 0;
    this.inUse = false;
    this.kind = '';
    this.x = 0; this.y = -1000; this.z = 0;
    this.r = 1; this.g = 1; this.b = 1;
    this.peak = 0;
    this.ttl = 0;        // <= 0 or non-finite means persistent until released
    this.age = 0;
    this.d2 = 0;
  }
  get alive() { return this.inUse; }
  setPosition(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setIntensity(v) { this.peak = v; return this; }
  setColour(c) {
    _col.set(c);
    this.r = _col.r; this.g = _col.g; this.b = _col.b;
    return this;
  }
  release() { this._pool.release(this); }
}

export class Lights {
  static id = 'lights';

  constructor(ctx) {
    this.ctx = ctx;
    this.scene = null;
    this.moon = null;
    this.hemi = null;
    this.ambient = null;
    this.torch = null;
    this.headlight = null;
    this.rovers = [];
    this.handles = [];
    this._free = new Int32Array(MAX_BORROWS);
    this._freeCount = 0;
    this._order = new Int32Array(MAX_BORROWS);
    this._seated = new Int32Array(CFG.lights.rovers.count);
    this._reseatTimer = 0;
    this._dirty = false;
    // OFF at boot. The first frame with it on was a blown-out white wall filling half the
    // screen — MARROW's "all I see is the flashlight on the wall", which cost that project a
    // round. The torch is a choice the player makes with F, and the dark has to be the thing
    // they are choosing against. Also: seeing is how you are seen (DESIGN §3, the light trade),
    // so it cannot be free and it cannot be the default.
    this._torchOn = false;
    this._torchIntensity = CFG.lights.torch.hot;
    this._headlightOn = false;

    // ---- the moon's arc. Driven by world/clock.js through setMoonArc(). --------
    this._moonElev = MOON_ELEV;
    this._moonAzim = MOON_AZIM;

    // ---- the moon's tint. Driven by director/tension.js through setMoonTint(). -
    // `_tintBase*` IS the base colour, held explicitly, and every tint is computed from it.
    // The light's CURRENT colour is never an input to the maths — it is only ever compared,
    // to notice that somebody else wrote it. That distinction is the whole fix: the old code
    // re-adopted whatever was on the light, which meant the tint and clock's black-hour arc
    // only failed to compound because clock happens to present at manifest #4 and tension
    // applies at #18. Reorder the manifest and the county's only key light saturated to pure
    // red in about a second. Now the worst a reorder can do is cost the tint a frame.
    // ---- the fill's black-hour dim (ART.md 1.4). 1 at dusk and deep night. ----
    // Held explicitly so hemi/ambient intensity is always BASE * scale and can never
    // compound: the light's current intensity is never an input to the maths.
    this._fillScale = 1;

    this._moonTint = 0;
    this._tintBaseR = 0; this._tintBaseG = 0; this._tintBaseB = 0;
    // The exact RGB we last wrote. Anything else on the light is an external write.
    this._tintWroteR = NaN; this._tintWroteG = NaN; this._tintWroteB = NaN;

    // ---- ctx.shared.lit -------------------------------------------------------
    this.lit = 0;
    // Built ONCE, lazily, on the first step where places exists: places is manifest #10
    // and we are #2, so init() is too early. list() allocates, which is why the result is
    // cached into flat arrays and never asked for again.
    this._placeIds = null;
    this._placeX = null;
    this._placeZ = null;
  }

  async init() {
    // ctx.scene is read here, at init, not in the constructor: gfx is manifest #1 and has
    // already run its own init by the time ours is called, but construction order gives
    // no such promise.
    const scene = this.ctx.scene;
    if (!scene) throw new Error('lights: ctx.scene missing (gfx must be manifest #1)');
    this.scene = scene;

    /* ---- 1 DirectionalLight: the moon, the only caster ---------------------- */
    const moon = new THREE.DirectionalLight(CFG.lights.moon.colour, 0);
    moon.castShadow = true;                       // PINNED. Never toggled — see header.
    moon.shadow.mapSize.set(CFG.render.shadow.size, CFG.render.shadow.size);
    const D = CFG.render.shadow.distance;
    const cam = moon.shadow.camera;
    cam.left = -D; cam.right = D; cam.top = D; cam.bottom = -D;
    cam.near = 1; cam.far = D * 4;
    cam.updateProjectionMatrix();
    // Slope-scaled bias: trunks at a grazing moon angle acne badly without the normalBias,
    // and a plain constant bias big enough to fix them detaches the contact shadow.
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.045;
    moon.shadow.autoUpdate = true;
    moon.name = 'moon';
    scene.add(moon);
    // moon.target MUST be in the scene or its world matrix is never updated and the moon
    // points at the origin forever — the shadow box then leaves the player behind.
    scene.add(moon.target);
    this.moon = moon;

    /* ---- 1 HemisphereLight -------------------------------------------------- */
    // HEMI_GROUND, not CFG.lights.hemi.ground — ART.md 1.3, pending the CONFIG CHANGE.
    const hemi = new THREE.HemisphereLight(CFG.lights.hemi.sky, HEMI_GROUND, 0);
    hemi.name = 'hemi';
    scene.add(hemi);
    this.hemi = hemi;

    /* ---- 1 AmbientLight ----------------------------------------------------- */
    const ambient = new THREE.AmbientLight(CFG.lights.ambient.colour, 0);
    ambient.name = 'ambient';
    scene.add(ambient);
    this.ambient = ambient;

    /* ---- 8 PointLights: the rover pool -------------------------------------- */
    const R = CFG.lights.rovers;
    for (let i = 0; i < R.count; i++) {
      const p = new THREE.PointLight(0xffffff, 0, R.distance, R.decay);
      p.castShadow = false;
      p.position.set(0, -1000, 0);   // parked far below the world, not hidden
      p.name = 'rover' + i;
      scene.add(p);
      this.rovers.push(p);
      this._seated[i] = -1;
    }
    for (let i = 0; i < MAX_BORROWS; i++) {
      this.handles.push(new RoverHandle(this, i));
      this._free[i] = MAX_BORROWS - 1 - i;   // stack, so borrow order is 0,1,2...
    }
    this._freeCount = MAX_BORROWS;

    /* ---- 2 SpotLights: torch (shadowed) + headlights (not) ------------------ */
    const T = CFG.lights.torch;
    const torch = new THREE.SpotLight(TORCH_COLOUR, 0, TORCH_DISTANCE, T.angle, T.penumbra, TORCH_DECAY);
    torch.castShadow = true;                      // PINNED, see header
    torch.shadow.mapSize.set(CFG.render.shadow.torchSize, CFG.render.shadow.torchSize);
    torch.shadow.camera.near = 0.4;
    torch.shadow.camera.far = TORCH_DISTANCE;
    torch.shadow.bias = -0.0008;
    torch.shadow.normalBias = 0.03;
    torch.name = 'torch';
    torch.position.set(0, CFG.player.EYE, 0);
    scene.add(torch);
    scene.add(torch.target);
    this.torch = torch;

    const H = CFG.lights.headlight;
    const head = new THREE.SpotLight(0xfff3d8, 0, H.distance, H.angle, 0.35, 2.0);
    head.castShadow = false;                      // census: headlights never cast
    head.name = 'headlight';
    head.position.set(0, -1000, 0);
    scene.add(head);
    scene.add(head.target);
    this.headlight = head;

    // Everything above was allocated at 0. Raising an intensity is a uniform write and
    // costs nothing; it is the COUNT that recompiles. So the three static lights take
    // their real values here and the pool/torch/headlights stay dark until borrowed or
    // switched on.
    moon.intensity = CFG.lights.moon.intensity;
    // The fill takes its ART.md 1.3 values through the one door that writes them, so boot
    // and every later frame agree about what base * scale means.
    this._writeFill();
    if (this._torchOn) torch.intensity = this._torchIntensity;

    // The explicit tint base, before clock has said anything. Nothing has written the moon
    // yet, so its colour IS the base; from here on the base only changes through
    // setMoonBase() or a detected external write, never by reading the light back.
    this._tintBaseR = moon.color.r; this._tintBaseG = moon.color.g; this._tintBaseB = moon.color.b;

    // ctx.shared is the flat scalar bag from CONTRACT. We may be the first system to want
    // it (manifest #2), so it is created defensively rather than assumed.
    const shared = this.ctx.shared || (this.ctx.shared = {});
    shared.lit = 0;
  }

  /* ------------------------------------------------------------------ pool -- */

  /**
   * Borrow a rover. The ONLY way a dynamic light exists in CURFEW.
   * @param kind      label for debugging ('muzzle', 'eyes', 'ember', ...)
   * @param colour    hex number, css string or THREE.Color
   * @param intensity candela at the source, before the distance fade
   * @param ttl       seconds; <= 0 or Infinity means "until you release it"
   * @returns handle or null when all 32 logical slots are taken
   */
  borrow(kind, x, y, z, colour, intensity, ttl = 0) {
    if (this._freeCount <= 0) return null;
    const idx = this._free[--this._freeCount];
    const h = this.handles[idx];
    h.inUse = true;
    h.gen++;
    h.kind = kind;
    h.x = x; h.y = y; h.z = z;
    _col.set(colour);
    h.r = _col.r; h.g = _col.g; h.b = _col.b;
    h.peak = intensity;
    h.ttl = ttl;
    h.age = 0;
    h.d2 = 0;
    // Re-seat NOW rather than up to CFG.lights.rovers.reseat seconds from now: a muzzle
    // flash lives 50 ms and would otherwise be over before it was ever seated. Combat
    // borrows during step(), which runs after ours, so present() picks the flag up in the
    // SAME frame the shot was fired.
    this._reseatTimer = 0;
    this._dirty = true;
    return h;
  }

  release(handle) {
    if (!handle || !handle.inUse) return;
    handle.inUse = false;
    handle.peak = 0;
    this._free[this._freeCount++] = handle._index;
    this._reseatTimer = 0;
    this._dirty = true;
    for (let i = 0; i < this._seated.length; i++) {
      if (this._seated[i] === handle._index) {
        this._seated[i] = -1;
        this.rovers[i].intensity = 0;
        this.rovers[i].position.set(0, -1000, 0);
      }
    }
  }

  /** Live-borrow count, for tests and debug HUDs. */
  borrowed() { return MAX_BORROWS - this._freeCount; }

  /* ------------------------------------------------------------- the census -- */

  /**
   * Walk the real scene graph and count what is actually in it. Deliberately not a
   * bookkeeping counter: the test that matters is "did anyone ELSE add a light", and a
   * counter we maintain ourselves could not answer that.
   */
  count() {
    let directional = 0, hemisphere = 0, ambient = 0, point = 0, spot = 0, other = 0, shadows = 0;
    const scene = this.scene || this.ctx.scene;
    if (scene) {
      scene.traverse((o) => {
        if (!o.isLight) return;
        if (o.castShadow) shadows++;
        if (o.isDirectionalLight) directional++;
        else if (o.isHemisphereLight) hemisphere++;
        else if (o.isAmbientLight) ambient++;
        else if (o.isSpotLight) spot++;        // before isPointLight: SpotLight is not a PointLight, but order is cheap insurance
        else if (o.isPointLight) point++;
        else other++;
      });
    }
    const total = directional + hemisphere + ambient + point + spot + other;
    return { directional, hemisphere, ambient, point, spot, other, shadows, total };
  }

  /* ---------------------------------------------------------------- switches -- */

  setTorch(on) {
    this._torchOn = !!on;
    this.torch.intensity = this._torchOn ? this._torchIntensity : 0;
  }
  torchOn() { return this._torchOn; }

  /**
   * Drive the moon's elevation. world/clock.js computes one every step (high through dusk
   * and night, low through the black hour, climbing back for the false dawn) and until this
   * existed nothing read it — so the black hour's low, raking moon never happened.
   *
   * ELEVATION ONLY MOVES A LIGHT WE ALREADY HAVE. The census is 13 and this creates,
   * replaces and hides nothing; present() re-derives the shadow box from the new angle on
   * the very next frame, which is why the arc has to live here and not in clock.
   *
   * @param elev radians above the horizon, clamped to [0.14, 1.45]
   * @param azim optional radians; omit and the moon keeps its current bearing
   */
  setMoonArc(elev, azim) {
    if (typeof elev === 'number' && isFinite(elev)) {
      this._moonElev = clamp(elev, MOON_ELEV_MIN, MOON_ELEV_MAX);
    }
    if (typeof azim === 'number' && isFinite(azim)) this._moonAzim = azim;
  }

  /** The moon's current elevation in radians, for tests and the debug HUD. */
  moonArc() { return this._moonElev; }

  /**
   * Redden the moon. director/tension.js calls this every frame with
   * `tension * moonRedPerT` (0 .. 0.55): the sky is how the player learns to read the night
   * instead of a clock, and it telegraphs the black hour ~90 s early.
   *
   * COLOUR ONLY. No intensity, no census, no new light. Applied at CALL time rather than
   * deferred to present(), because clock.js (manifest #4) writes moon.color in its own
   * present and tension (#18) runs after it — a deferred tint from #2 would be overwritten
   * every single frame and the telegraph would silently do nothing.
   *
   * THE TINT IS ALWAYS COMPUTED FROM `_tintBase*`, NEVER FROM THE LIGHT'S CURRENT COLOUR.
   * The audit was right that the old version only worked by accident: it re-read moon.color
   * as the base whenever that colour differed from its own last write, so its correctness
   * rested entirely on clock presenting (#4) before tension applied (#18). Read the light
   * back in the wrong order and each frame's tint became the next frame's base — one second
   * to a saturated red key light. Here the current colour is used for exactly one thing:
   * noticing that an owner other than us has written it, so we can adopt THEIR value as the
   * new base (once) and immediately re-express our tint on top of it. Compounding is now
   * structurally impossible: the output is a pure function of (base, k), and k comes from
   * the caller. Order can cost the telegraph a frame; it can no longer run away.
   *
   * clock.js should call setMoonBase() when it writes its own arc, which removes even that
   * one-frame lag — requested in docs/HANDOFF.md. The detection below is the fallback that
   * keeps us correct until it does, and correct if it never does.
   *
   * @param t 0..1 toward the ember red; anything else is treated as 0
   */
  setMoonTint(t) {
    const moon = this.moon;
    if (!moon) return;
    const k = clamp01(typeof t === 'number' && isFinite(t) ? t : 0);
    const c = moon.color;
    // Did somebody else write the moon since our last write? Then THAT is the base now.
    // (First call ever: _tintWrote* is NaN, every comparison is false, and we adopt — which
    // is right, because whatever is on the light at that point is somebody's base, not ours.)
    if (!(Math.abs(c.r - this._tintWroteR) < 1e-6
       && Math.abs(c.g - this._tintWroteG) < 1e-6
       && Math.abs(c.b - this._tintWroteB) < 1e-6)) {
      this._tintBaseR = c.r; this._tintBaseG = c.g; this._tintBaseB = c.b;
    }
    this._moonTint = k;
    this._writeMoonColour();
  }

  /**
   * Declare the moon's UNTINTED base colour. For world/clock.js: it owns the pale->red
   * black-hour arc and this is how it says "this is the moon before anyone reddens it".
   * Calling it re-expresses the current tint on top of the new base immediately, so clock
   * and tension compose in either manifest order and neither erases the other.
   *
   * COLOUR ONLY, like setMoonTint. No intensity, no census, no new light.
   * @param colour hex number, css string or THREE.Color
   */
  setMoonBase(colour) {
    if (!this.moon || colour === undefined || colour === null) return;
    _col.set(colour);
    this._tintBaseR = _col.r; this._tintBaseG = _col.g; this._tintBaseB = _col.b;
    this._writeMoonColour();
  }

  /** The base colour the tint is applied to, as an {r,g,b} triple. Tests and debug only. */
  moonBase() { return { r: this._tintBaseR, g: this._tintBaseG, b: this._tintBaseB }; }

  /** The one place moon.color is written: lerp(base -> ember, tint). Allocates nothing. */
  _writeMoonColour() {
    const c = this.moon.color;
    const k = this._moonTint;
    // setRGB, not set(hex): no allocation and no sRGB round-trip through an int. clock.js
    // writes the same way, so the two agree about what the numbers mean.
    c.setRGB(
      lerp(this._tintBaseR, MOON_TINT_R, k),
      lerp(this._tintBaseG, MOON_TINT_G, k),
      lerp(this._tintBaseB, MOON_TINT_B, k),
    );
    this._tintWroteR = c.r; this._tintWroteG = c.g; this._tintWroteB = c.b;
  }

  /** How red the moon currently is, 0..1. For tests and the debug HUD. */
  moonTint() { return this._moonTint; }

  /**
   * Dim the two fills together. ART.md 1.4: the black hour has to take the floor down with
   * the moon, or the most frightening hour in the game moves the ground by 25% and the
   * grass by nothing at all.
   *
   * INTENSITY ONLY. No census, no colour, no new light — the same kind of write as
   * clock.js's moon.intensity. The scale is applied to the BASE constants every time, never
   * to the light's current value, so repeated calls cannot compound.
   *
   * Nothing outside this file needs to call it: step() derives the scale from clock.redness
   * itself. It is public so a test can pin it and so a later lane has a door instead of a
   * reason to reach into a light.
   *
   * @param k 0.35..1; anything else is clamped, a non-number is ignored
   */
  setFillScale(k) {
    if (typeof k !== 'number' || !isFinite(k)) return;
    const c = clamp(k, 0.35, 1);
    if (Math.abs(c - this._fillScale) < 1e-4) return;
    this._fillScale = c;
    this._writeFill();
  }

  /** The fill's current black-hour dim, 0.35..1. Tests and the debug HUD. */
  fillScale() { return this._fillScale; }

  /** The ONE place hemi.intensity and ambient.intensity are written. */
  _writeFill() {
    if (this.hemi) this.hemi.intensity = HEMI_INTENSITY * this._fillScale;
    if (this.ambient) this.ambient.intensity = AMBIENT_INTENSITY * this._fillScale;
  }

  /** Car headlights (M1). Intensity only — the light itself never comes or goes. */
  setHeadlights(on, x = 0, y = 0, z = 0, dx = 0, dy = 0, dz = -1) {
    this._headlightOn = !!on;
    this.headlight.intensity = this._headlightOn ? CFG.lights.headlight.intensity : 0;
    if (this._headlightOn) {
      this.headlight.position.set(x, y, z);
      this.headlight.target.position.set(x + dx * 20, y + dy * 20, z + dz * 20);
    } else {
      this.headlight.position.set(0, -1000, 0);
    }
  }

  /* -------------------------------------------------------------------- loop -- */

  step(dt) {
    // Age and expire borrows on the fixed step so a replay is deterministic.
    for (let i = 0; i < MAX_BORROWS; i++) {
      const h = this.handles[i];
      if (!h.inUse) continue;
      const finite = h.ttl > 0 && isFinite(h.ttl);
      if (!finite) continue;
      h.age += dt;
      if (h.age >= h.ttl) this.release(h);
    }

    this._reseatTimer -= dt;
    if (this._reseatTimer <= 0) {
      this._reseatTimer = CFG.lights.rovers.reseat;
      this._reseat();
    }

    // ART.md 1.4 — the fill follows the moon into the black hour. clock is manifest #4 and
    // we are #2, so this is read lazily, at use, and never captured: on a build where clock
    // is absent (M0, a headless test, a lane that lands out of order) redness is simply 0
    // and the fill sits at its full ART.md 1.3 value, which is the correct default.
    const clock = this.ctx.systems ? this.ctx.systems.get('clock') : null;
    const redness = clock && typeof clock.redness === 'number' ? clamp01(clock.redness) : 0;
    this.setFillScale(lerp(1, FILL_BLACK_MUL, redness));

    // Published on the STEP, not on present(): enemies (#16), tension (#18) and
    // progression (#20) all read it inside their own step, and a headless
    // __CURFEW.step(dt, n) with no rendering has to see it move too.
    this._updateLit();
  }

  /* ------------------------------------------------------------- shared.lit -- */

  /**
   * Publish ctx.shared.lit. See the constants block for what this number is for and what
   * its two ends have to be. Reads siblings lazily, allocates nothing after the one-time
   * place cache, and never touches a light.
   */
  _updateLit() {
    const shared = this.ctx.shared || (this.ctx.shared = {});

    // The body is the truth. The camera is the fallback for the frames before the player
    // exists at all — we are manifest #2 and it is #11, which also means this reads the
    // position the player had at the END of the previous step. One fixed step of latency
    // (16 ms) on a term whose job is to say "you are standing in light": not worth a
    // second publish point, and a second one would disagree with this one.
    const sys = this.ctx.systems;
    const player = sys ? sys.get('player') : null;
    let px, py, pz;
    if (player && player.pos) { px = player.pos.x; py = player.pos.y; pz = player.pos.z; }
    else if (this.ctx.camera) {
      const c = this.ctx.camera.position; px = c.x; py = c.y; pz = c.z;
    } else { this.lit = 0; shared.lit = 0; return; }

    let lit = 0;

    /* ---- your own torch: the trade at the centre of the design -------------- */
    if (this._torchOn && this.torch && this.torch.intensity > 0) {
      let t = LIT_TORCH_BASE;
      const cam = this.ctx.camera;
      if (cam) {
        // The cone LAGS the view (see present()). A settled cone is throwing light on the
        // ground you are standing in, so you are the silhouette in it; a cone still
        // swinging through the dark after a fast flick is lighting somewhere you are not.
        cam.getWorldDirection(_fwd);
        const tt = this.torch.target.position;
        const dx = tt.x - px, dy = tt.y - py, dz = tt.z - pz;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len > 1e-4) {
          const align = clamp01((dx * _fwd.x + dy * _fwd.y + dz * _fwd.z) / len);
          t += LIT_TORCH_AIM * align;
        }
      }
      t *= clamp01(this.torch.intensity / (CFG.lights.torch.hot || 1));
      lit = lit + t - lit * t;
    }

    /* ---- headlights: the same trade, at 23 m/s ----------------------------- */
    // Gated like the rovers below, and for the same reason: a light that is not near you
    // does not light you. `inCar` short-circuits the distance test because in the cab you
    // ARE the source — the lamp is 2 m ahead of the seat and the glow is on your hands.
    // Outside it, the beam only counts while you are standing in it. Both siblings are read
    // lazily, at use: shared is a scalar bag and the headlight is our own light.
    if (this._headlightOn && this.headlight && this.headlight.intensity > 0) {
      let f;
      if (shared.inCar) f = 1;   // `shared` is the same bag we publish lit into, above
      else {
        const hp = this.headlight.position;
        const dx = hp.x - px, dy = hp.y - py, dz = hp.z - pz;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const fade = CFG.lights.headlight.distance;
        f = d <= LIT_HEADLIGHT_FULL ? 1
          : clamp01(1 - (d - LIT_HEADLIGHT_FULL) / Math.max(1e-3, fade - LIT_HEADLIGHT_FULL));
      }
      const t = LIT_HEADLIGHT * f;
      if (t > 0) lit = lit + t - lit * t;
    }

    /* ---- borrowed rovers ---------------------------------------------------- */
    // Read from the HANDLES, not the seated lights: handle state is simulation truth and
    // survives a step with no present(), which the seated intensities do not.
    for (let i = 0; i < MAX_BORROWS; i++) {
      const h = this.handles[i];
      if (!h.inUse || h.peak <= 0) continue;
      const dx = h.x - px, dy = h.y - py, dz = h.z - pz;
      const d2 = dx * dx + dy * dy + dz * dz;
      let peak = h.peak;
      // A ttl'd borrow decays on the same curve present() draws it with, so the muzzle
      // flash that lights you on screen is the muzzle flash the poacher aims by.
      if (h.ttl > 0 && isFinite(h.ttl)) peak *= Math.exp(-h.age / (h.ttl * 0.4));
      const t = clamp01((peak / LIT_ROVER_REF) * (LIT_ROVER_SOFT / (LIT_ROVER_SOFT + d2)));
      if (t > 0) lit = lit + t - lit * t;
    }

    /* ---- the moon, through the canopy -------------------------------------- */
    // Under a dense stand the ground is in real shadow and this term goes to zero, which
    // is the whole point: the Pines with the torch off must read 0, not "a bit lit".
    const flora = sys ? sys.get('flora') : null;
    const cover = flora && typeof flora.coverAt === 'function'
      ? clamp01(flora.coverAt(px, pz)) : 0;
    const open = 1 - cover;
    const moonI = this.moon
      ? clamp01(this.moon.intensity / (CFG.lights.moon.intensity || 1)) : 0;
    // sin(elev) against the boot elevation: the black hour's low moon rakes sideways and
    // puts almost nothing on the top of your head, which is exactly what clock intends.
    const elevF = clamp01(Math.sin(this._moonElev) / Math.sin(MOON_ELEV));
    // open^2, not open: half a canopy blocks much more than half the sky. Same reason
    // flora squares its own density field.
    const moonT = LIT_MOON_MAX * moonI * elevF * open * open;
    if (moonT > 0) lit = lit + moonT - lit * moonT;

    /* ---- a claimed place's own lamps --------------------------------------- */
    const pd = this._placeDistance(px, pz);
    if (pd < LIT_PLACE_FADE) {
      const f = pd <= LIT_PLACE_FULL ? 1
        : 1 - (pd - LIT_PLACE_FULL) / (LIT_PLACE_FADE - LIT_PLACE_FULL);
      const t = LIT_PLACE_MAX * clamp01(f);
      lit = lit + t - lit * t;
    }

    this.lit = clamp01(lit);
    shared.lit = this.lit;
  }

  /**
   * Metres to the nearest CLAIMED major place, or Infinity. Claimed is the right test:
   * places.js turns a place's lamps on when you claim it, and the one authored-lit place
   * (the Filling Station, where you wake up) starts claimed. A discovered-but-unclaimed
   * place is a dark building you have seen, and it must not light you.
   */
  _placeDistance(px, pz) {
    const sys = this.ctx.systems;
    const places = sys ? sys.get('places') : null;
    if (!places || typeof places.isClaimed !== 'function') return Infinity;
    if (!this._placeIds) {
      if (typeof places.list !== 'function') return Infinity;
      const l = places.list();          // ONE allocation, once, ever. Then never again.
      if (!l || !l.length) return Infinity;
      this._placeIds = new Array(l.length);
      this._placeX = new Float64Array(l.length);
      this._placeZ = new Float64Array(l.length);
      for (let i = 0; i < l.length; i++) {
        this._placeIds[i] = l[i].id;
        this._placeX[i] = l[i].x;
        this._placeZ[i] = l[i].z;
      }
    }
    let best2 = Infinity;
    for (let i = 0; i < this._placeIds.length; i++) {
      const dx = this._placeX[i] - px, dz = this._placeZ[i] - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= best2) continue;
      if (!places.isClaimed(this._placeIds[i])) continue;
      best2 = d2;
    }
    return best2 === Infinity ? Infinity : Math.sqrt(best2);
  }

  /** Nearest-first seating. Insertion sort over an Int32Array — no allocation. */
  _reseat() {
    const camPos = this.ctx.camera ? this.ctx.camera.position : null;
    const px = camPos ? camPos.x : 0, py = camPos ? camPos.y : 0, pz = camPos ? camPos.z : 0;
    let n = 0;
    for (let i = 0; i < MAX_BORROWS; i++) {
      const h = this.handles[i];
      if (!h.inUse) continue;
      const dx = h.x - px, dy = h.y - py, dz = h.z - pz;
      h.d2 = dx * dx + dy * dy + dz * dz;
      // insertion into the ordered index list
      let j = n++;
      while (j > 0 && this.handles[this._order[j - 1]].d2 > h.d2) {
        this._order[j] = this._order[j - 1];
        j--;
      }
      this._order[j] = i;
    }
    for (let s = 0; s < this._seated.length; s++) {
      const idx = s < n ? this._order[s] : -1;
      if (this._seated[s] !== idx) {
        this._seated[s] = idx;
        if (idx < 0) {
          this.rovers[s].intensity = 0;
          this.rovers[s].position.set(0, -1000, 0);
        }
      }
    }
  }

  present(alpha) {
    // ctx.time.dt is the RAW frame dt (see HANDOFF): hitstop must not stall the torch.
    const dt = (this.ctx.time && this.ctx.time.dt) || CFG.loop.FIXED;
    const camera = this.ctx.camera;
    if (!camera) return;
    const p = camera.position;

    // A borrow or release since the last seating: seat it before we write, so a muzzle
    // flash fired this frame is lit this frame.
    if (this._dirty) { this._dirty = false; this._reseat(); }

    /* ---- the moon's ortho box follows the player --------------------------- */
    const D = CFG.render.shadow.distance;
    // Quantise the anchor to whole shadow texels. Without this the shadow edges crawl
    // over every surface as you walk, which reads as the ground shimmering.
    const texel = (D * 2) / CFG.render.shadow.size;
    const ax = Math.round(p.x / texel) * texel;
    const az = Math.round(p.z / texel) * texel;
    const ay = Math.round(p.y / texel) * texel;
    // The arc, not the const: clock drives it through setMoonArc() and the box has to
    // follow, or the black hour's low moon lights nothing it is supposed to.
    const elev = this._moonElev, azim = this._moonAzim;
    _dir.set(
      Math.cos(elev) * Math.cos(azim),
      Math.sin(elev),
      Math.cos(elev) * Math.sin(azim),
    );
    this.moon.target.position.set(ax, ay, az);
    this.moon.position.set(ax + _dir.x * D * 2, ay + _dir.y * D * 2, az + _dir.z * D * 2);

    /* ---- the torch lags the view ------------------------------------------- */
    // MARROW's feel: the cone chases the look rather than being welded to it, so a fast
    // flick shows you the dark for a beat. CFG.lights.torch.lag / .ahead.
    if (this._torchOn) {
      const T = CFG.lights.torch;
      camera.getWorldDirection(_fwd);
      // The torch sits at the eye; the offset is left to the viewmodel owner to author.
      this.torch.position.copy(p);
      const tx = p.x + _fwd.x * T.ahead;
      const ty = p.y + _fwd.y * T.ahead;
      const tz = p.z + _fwd.z * T.ahead;
      const tt = this.torch.target.position;
      tt.set(
        damp(tt.x, tx, T.lag, dt),
        damp(tt.y, ty, T.lag, dt),
        damp(tt.z, tz, T.lag, dt),
      );
    }

    /* ---- write the seated rovers ------------------------------------------- */
    for (let s = 0; s < this._seated.length; s++) {
      const idx = this._seated[s];
      const light = this.rovers[s];
      if (idx < 0) { light.intensity = 0; continue; }
      const h = this.handles[idx];
      if (!h.inUse) { light.intensity = 0; continue; }
      light.position.set(h.x, h.y, h.z);
      light.color.setRGB(h.r, h.g, h.b);
      // Distance fade [skyshard rovers.js:56]: a rover that is about to lose its seat is
      // already dim, so the handoff never pops.
      const dx = h.x - p.x, dy = h.y - p.y, dz = h.z - p.z;
      const fall = clamp01(1.15 - Math.sqrt(dx * dx + dy * dy + dz * dz) / 46);
      let v = h.peak * fall;
      // A ttl'd borrow (muzzle flash, impact spark) decays on the VIGIL flash curve
      // [vigil fx.js:296-301]; a persistent borrow holds whatever intensity it was given.
      if (h.ttl > 0 && isFinite(h.ttl)) v *= Math.exp(-h.age / (h.ttl * 0.4));
      light.intensity = v;
    }
  }

  ready() {
    const c = this.count();
    return c.directional === 1 && c.hemisphere === 1 && c.ambient === 1
      && c.point === CFG.lights.rovers.count && c.spot === 2;
  }

  dispose() {
    // Lights are never removed during play; this exists for a full teardown only.
    for (const l of this.rovers) l.removeFromParent();
    for (const l of [this.moon, this.hemi, this.ambient, this.torch, this.headlight]) {
      if (l) { if (l.target) l.target.removeFromParent(); l.removeFromParent(); l.dispose && l.dispose(); }
    }
    this.rovers.length = 0;
  }
}

export default Lights;
