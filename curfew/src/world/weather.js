// weather — what the sky is DOING tonight, and what the ground does about it.
//
// ALEX, 2026-09-10: "add a whether system too where sometimes it's raining or snowing and
// stuff like that. I know it already does snow a bit. but make the weather system beautiful."
// And, of the pale ground three sites had by accident: "make it snow."
//
// WHAT WAS ALREADY HERE. Round 18 built snow as a PLACE: terrain.frostAt() is a static
// low-frequency field, chunks.js bakes its colour into the ground's vertex colours, and
// fx._snow() spawns flakes when you stand in a frosted patch. It always snows there and it
// never snows anywhere else, and there has never been a drop of rain in the county.
//
// This is the other axis. Weather is a TIME laid over that place: a front arrives, holds for
// a couple of minutes, and passes. Where the two meet — falling snow over a frost patch —
// the deeper one wins, so the authored cold hollows still read as the coldest places in the
// county rather than being flattened by a passing squall.
//
// THIS SYSTEM DRAWS NOTHING AND OWNS NO MATERIAL. That is deliberate and it is the reason
// fx.js's own header gives for keeping snow out of a weather system in the first place: the
// county has 94 shader programs and uses 92, and "a new system would be a new material would
// be a new shader program". So this is a state machine and four numbers. Everything visible
// belongs to a lane that already had a program for it:
//
//   fx.js       falling rain and snow, in the pooled Points buffer it already draws
//   chunks.js   lying snow and wet ground, two floats on the ground material's injection
//   sky.js      cloud and fog, through setCloud/setWeatherFog, knobs sky.js already exposed
//   bed.js      the rain stem, which has been baked and sitting at gain 0 since round 13
//
// It reads phase from the clock and writes ctx.shared.weather, so anything may ask what the
// sky is doing without reaching in here.

import { CFG } from '../config.js';
import { TAU, clamp01, lerp } from '../engine/math.js';

const W = CFG.world.weather;

// ROUND 22 lane F — LIGHTNING. Alex, 2026-09-10: "The only daylight left is a lightning
// storm — one frame of the whole forest, every silhouette, then black. The player will pray
// for storms and dread them."
//
// A bolt is not a light. It is a two-step flash on lights and uniforms that already exist:
// the moon x moonMul, both fills x fillMul, the dome's uFlash, the fog colour, the stars out.
// This system keeps the schedule and the envelope and hands one number (0..1) to sky and
// lights every step; they do the writing. The bus event is for audio (thunder, lane G) and
// anyone else who wants to know a bolt landed.
//
// 'storm' the WEATHER KIND is not 'storm' the director's enemy surge (director.js,
// CFG.director.targets.storm). Same word, two things; they are not coupled this round.
const LN = CFG.world.lightning || {
  minStrength: 0.5, firstS: 8, gapS: [25, 90], peakS: 0.033, tailS: 0.05, distM: [300, 3000],
};

// The kinds, in the order the odds are read. 'clear' is not in the table because it is what
// happens between spells rather than a spell of its own.
const KINDS = ['drizzle', 'rain', 'snow', 'mist', 'storm'];

/** Rain, drizzle and a storm wet the ground; snow lays on it; mist does neither. */
const IS_RAIN = { drizzle: 1, rain: 1, snow: 0, mist: 0, storm: 1, clear: 0 };
const IS_SNOW = { drizzle: 0, rain: 0, snow: 1, mist: 0, storm: 0, clear: 0 };

export class Weather {
  static id = 'weather';

  constructor(ctx) {
    this.ctx = ctx;
    this.shared = ctx.shared || (ctx.shared = {});
    this.rng = ctx.rng ? ctx.rng.fork('weather') : null;

    // --- the front
    this.kind = 'clear';        // what is falling, or 'clear'
    this.target = 0;            // where the strength is heading: 1 during a spell, 0 between
    this.strength = 0;          // 0..1, eased. THE number everything else reads.
    this.hold = this._span(W.clearS);   // seconds left in this state

    // --- the ground's memory. These lag the front by design: that lag IS the weather being
    //     something that happened to the county rather than a switch on a screen.
    this.snow = 0;              // 0..1 lying snow
    this.wet = 0;               // 0..1 wet ground

    // --- one wandering wind, shared by every falling thing
    this.windX = 0; this.windZ = 0;
    this._wtx = 0; this._wtz = 0;
    this._windT = 0;

    // --- lightning. All step state; sky and lights read the envelope through _drive().
    this._boltT = LN.firstS;    // seconds to the next bolt while a storm is armed
    this._flashT = 0;           // seconds of flash left (peak + tail)
    this._flashS = 0;           // this bolt's strength, 0..1 (near is bright)
    this._flashK = 0;           // THE envelope this step, 0..1
    this._bolts = 0;
    this._lastDist = 0;
    // One payload, reused: the bus is synchronous and nobody may keep it.
    this._boltPayload = { x: 0, z: 0, dist: 0, strength: 0 };

    // Presentation reads these; step writes them. Nothing here moves the camera.
    this._forced = null;
    this._publish();
  }

  _span(range) {
    const lo = range[0], hi = range[1];
    return lo + (this.rng ? this.rng.next() : 0.5) * (hi - lo);
  }

  /** Pick the next spell. Weighted, and never the same kind twice in a row. */
  _roll() {
    const odds = W.odds;
    let total = 0;
    for (const k of KINDS) if (k !== this._last) total += odds[k] || 0;
    let r = (this.rng ? this.rng.next() : 0.5) * total;
    for (const k of KINDS) {
      if (k === this._last) continue;
      r -= odds[k] || 0;
      if (r <= 0) return k;
    }
    return 'rain';
  }

  /**
   * Force a front, for a test or a tool. `?weather=snow` does the same at boot.
   * Passing null hands the county back to its own schedule.
   */
  force(kind, strength) {
    if (kind === null || kind === undefined) { this._forced = null; return; }
    this._forced = kind;
    this.kind = kind;
    this.target = kind === 'clear' ? 0 : 1;
    if (strength !== undefined) this.strength = clamp01(strength);
    this.hold = 1e9;
    this._publish();
  }

  /**
   * One bolt, now. The schedule calls this; a tool or a test may too, in any weather.
   * `dist` metres from the player, `bearing` radians; both default to the storm's own roll.
   * Emits 'weather:lightning' {x, z, dist, strength} so audio can put the thunder dist/340 s
   * behind it (context.md, F -> G). The payload object is reused: read it, do not keep it.
   */
  strike(dist, bearing) {
    const lo = LN.distM[0], hi = LN.distM[1];
    const r = this.rng ? this.rng.next() : 0.5;
    // Log-uniform: most bolts are a distant flicker, a near one is the rare thing that
    // lights the county from overhead.
    if (!(dist > 0)) dist = lo * Math.pow(hi / lo, r);
    if (typeof bearing !== 'number') bearing = (this.rng ? this.rng.next() : 0.5) * TAU;
    const strength = 1 - 0.75 * clamp01((dist - lo) / Math.max(1, hi - lo));

    this._flashS = strength;
    this._flashT = LN.peakS + LN.tailS;
    this._bolts++;
    this._lastDist = dist;
    this._boltT = this._span(LN.gapS);

    const sys = this.ctx.systems;
    const player = sys ? sys.get('player') : null;
    const pos = player && player.pos ? player.pos : (this.ctx.camera ? this.ctx.camera.position : null);
    const px = pos ? pos.x : 0, pz = pos ? pos.z : 0;
    const p = this._boltPayload;
    p.x = px + Math.sin(bearing) * dist;
    p.z = pz + Math.cos(bearing) * dist;
    p.dist = dist;
    p.strength = strength;
    if (this.ctx.bus) this.ctx.bus.emit('weather:lightning', p);
  }

  /**
   * The schedule and the envelope. Only a storm past minStrength is armed, and never in its
   * first seconds: the rain arrives before the first bolt, so a storm is something you hear
   * closing in rather than a switch. Nothing here touches `strength` — tests/weather.mjs
   * asserts a front never snaps, and a bolt is not a front.
   */
  _stepLightning(dt) {
    const armed = this.kind === 'storm' && this.strength >= LN.minStrength;
    if (armed) {
      this._boltT -= dt;
      if (this._boltT <= 0) this.strike();
    } else if (this._boltT < LN.firstS) this._boltT = LN.firstS;

    if (this._flashT > 0) {
      this._flashT -= dt;
      // Full for the peak, then a straight fade through the tail. Two steps of white and
      // three of after-image at 60 Hz: the one frame Alex asked for, plus the eye's memory.
      const tail = this._flashT > LN.tailS ? 1 : Math.max(0, this._flashT / Math.max(1e-6, LN.tailS));
      this._flashK = this._flashS * tail;
    } else this._flashK = 0;
  }

  async init() {
    const p = typeof location !== 'undefined' && location.search
      ? new URLSearchParams(location.search).get('weather') : null;
    if (p) this.force(p === 'clear' ? 'clear' : (KINDS.includes(p) ? p : 'rain'), 1);
  }

  ready() { return true; }

  step(dt) {
    if (!(dt > 0)) return;

    // ---- the schedule ---------------------------------------------------------------
    if (!this._forced) {
      this.hold -= dt;
      if (this.hold <= 0) {
        if (this.target > 0) {
          // a spell ends: back to clear, and remember what it was so the next one differs
          this._last = this.kind;
          this.target = 0;
          this.hold = this._span(W.clearS);
        } else {
          this.kind = this._roll();
          this.target = 1;
          this.hold = this._span(W.wetS);
        }
      }
    }

    // Ease toward the target. A front that snapped on would read as a bug, so fadeS is long
    // enough that you notice the sky closing before you notice the first drop.
    const rate = dt / Math.max(0.001, W.fadeS);
    if (this.strength < this.target) this.strength = Math.min(this.target, this.strength + rate);
    else if (this.strength > this.target) this.strength = Math.max(this.target, this.strength - rate);
    // Once a spell has faded out the kind stops meaning anything; say so, so a reader that
    // looks at kind alone cannot see 'rain' over a dry county.
    if (this.strength <= 0 && this.target <= 0) this.kind = 'clear';

    // ---- the wind -------------------------------------------------------------------
    // Gusts wander toward a new target on their own clock. The strength term means a clear
    // night is still and a downpour leans.
    this._windT -= dt;
    if (this._windT <= 0) {
      this._windT = W.windTurnS * (0.6 + (this.rng ? this.rng.next() : 0.5) * 0.8);
      const a = (this.rng ? this.rng.next() : 0.5) * Math.PI * 2;
      const gust = W.windMax * (0.25 + (this.rng ? this.rng.next() : 0.5) * 0.75);
      this._wtx = Math.cos(a) * gust;
      this._wtz = Math.sin(a) * gust;
    }
    const wk = 1 - Math.pow(0.5, dt / W.windGustS);
    this.windX = lerp(this.windX, this._wtx * (0.35 + 0.65 * this.strength), wk);
    this.windZ = lerp(this.windZ, this._wtz * (0.35 + 0.65 * this.strength), wk);

    // ---- what the ground remembers ---------------------------------------------------
    // Rain that is only a drizzle still wets, at its own strength; snow only lays while it
    // is actually snowing. Both decay whenever their source is not running.
    const snowing = IS_SNOW[this.kind] ? this.strength : 0;
    const raining = IS_RAIN[this.kind] ? this.strength * (this.kind === 'drizzle' ? 0.55 : 1) : 0;

    this.snow = snowing > 0
      ? Math.min(1, this.snow + dt * snowing / W.snowLayS)
      : Math.max(0, this.snow - dt / W.snowMeltS);
    // Rain takes lying snow away faster than time does — a warm front eats it.
    if (raining > 0) this.snow = Math.max(0, this.snow - dt * raining / (W.snowMeltS * 0.22));

    this.wet = raining > 0
      ? Math.min(1, this.wet + dt * raining / W.wetS_rise)
      : Math.max(0, this.wet - dt / W.wetS_dry);
    // Ground under snow is not ALSO shining wet; the snow is the surface now.
    if (this.snow > 0) this.wet = Math.min(this.wet, 1 - this.snow * 0.85);

    this._stepLightning(dt);

    this._publish();
    this._drive();
  }

  /** ctx.shared.weather — the flat bag every other lane reads instead of reaching in here. */
  _publish() {
    const s = this.shared.weather || (this.shared.weather = {});
    s.kind = this.kind;
    s.strength = this.strength;
    s.snow = this.snow;
    s.wet = this.wet;
    s.windX = this.windX;
    s.windZ = this.windZ;
    s.falling = this.strength > 0.02 && this.kind !== 'clear' && this.kind !== 'mist';
    // ROUND 22: the flash envelope this step (0 almost always) and how strong the storm is.
    s.lightning = this._flashK;
    s.storm = this.kind === 'storm' ? this.strength : 0;
  }

  /**
   * Hand the four numbers to the lanes that can draw them. Every call here is a public door
   * that already existed, and every one of them is a no-op on a system that is absent — this
   * has to survive a test realm that boots half a county.
   */
  _drive() {
    const sys = this.ctx.systems;
    if (!sys) return;
    const k = this.kind, s = this.strength;

    const sky = sys.get('sky');
    if (sky) {
      const fog = (W.fogMul[k] !== undefined ? W.fogMul[k] : 1);
      const cloud = (W.cloudMul[k] !== undefined ? W.cloudMul[k] : 1);
      if (sky.setWeatherFog) sky.setWeatherFog(lerp(1, fog, s));
      // Lying snow throws the little light there is back up at the cloud deck, so a white
      // county reads brighter overhead than a black one. It is the one place this system
      // pays the ground back for what it took.
      if (sky.setCloud) sky.setCloud(lerp(1, cloud, s) * (1 + this.snow * 0.10));
      // The bolt: the dome goes white, the fog with it, the stars out. sky.setFlash is
      // idempotent on an unchanged value, so this costs nothing between bolts.
      if (sky.setFlash) sky.setFlash(this._flashK);
    }

    // ...and the moon and both fills, on the same envelope. lights writes them in present().
    const lights = sys.get('lights');
    if (lights && lights.setFlash) lights.setFlash(this._flashK);

    const chunks = sys.get('chunks');
    if (chunks && chunks.setWeather) chunks.setWeather(this.snow, this.wet);

    // The destinations take the same snow. Without this the county goes white and every
    // major keeps a dark yard and a bare roof in the middle of it.
    const places = sys.get('places');
    if (places && places.setWeather) places.setWeather(this.snow, this.wet);

    const fx = sys.get('fx');
    if (fx && fx.setWeather) fx.setWeather(k, s, this.windX, this.windZ);

    const audio = sys.get('audio');
    const bed = audio && audio.bed;
    if (bed && bed.setWeather) bed.setWeather(k, s, this.snow);
  }

  /** For probes and the suite. */
  state() {
    return {
      kind: this.kind, strength: +this.strength.toFixed(4), target: this.target,
      snow: +this.snow.toFixed(4), wet: +this.wet.toFixed(4),
      windX: +this.windX.toFixed(3), windZ: +this.windZ.toFixed(3),
      hold: +this.hold.toFixed(1), forced: this._forced || null,
      lightning: {
        k: +this._flashK.toFixed(3), nextS: +this._boltT.toFixed(1),
        bolts: this._bolts, lastDist: Math.round(this._lastDist),
      },
    };
  }
}
