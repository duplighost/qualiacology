// clock — the fourteen-minute lightless cycle the whole game is shaped around. Manifest #4.
//
// There is NEVER a day (DESIGN decision 3). The cycle is
//
//     dusk 90 s  ->  deep night 480 s  ->  BLACK HOUR 180 s  ->  false dawn 90 s
//
// = 840 s, and then it starts again at dusk. False dawn is a look, not a lighting regime;
// nothing here ever produces sun.
//
// What this file owns:
//   * ctx.shared.phase  — 'dusk' | 'night' | 'black' | 'dawn'
//   * ctx.shared.phaseT — 0..1 inside the current phase
//   * the 'phase:changed' bus event, { phase, prev }
//   * sky.setPhase(t)   — the whole LUT ramp, including the telegraph
//   * the moon's COLOUR and its (requested) elevation, through the lights system.
//
// THE TELEGRAPH IS THE POINT. The black hour is announced 90 s early
// (CFG.clock.blackHourWarnS) by the sky and only by the sky: the moon reddens and the star
// field thins, because sky.js's LUT already carries stars 1.00 at deep night and 0.55 at the
// black hour, so walking the LUT pointer early IS the thinning. There is no clock on screen
// and there never will be — the player learns to read the sky, which is the one instrument
// this game gives them. (No words on screen during play; DESIGN §1, THROWN precedent.)
//
// donor: donors/hallowind/src/world.js:787-846 `updateNight` — the moon arc and its colour
//   math (a night whose key light changes hue and height is the whole tell). Read
//   2026-09-02; the arc is re-keyed here from HALLOWIND's blood moon to CURFEW's black hour,
//   and the sky colours themselves live in gfx/sky.js's STOPS table, not here.
// donor: donors/forest/src/world/Sky.js — GLIDE's elevation-keyed stop table is the SHAPE of
//   setPhase(); sky.js already implements it, so this file only drives its pointer.
//
// THE LIGHT CENSUS IS UNTOUCHED. This file never creates, adds, removes or hides a light.
// It writes `moon.color` and `moon.intensity`, which are uniform writes on a light that has
// existed since boot — the count is what recompiles every material, not the value.

import { CFG } from '../config.js';
import { clamp01, lerp, smoothstep } from '../engine/math.js';

/* ---------------------------------------------------------------- the cycle -- */

const C = CFG.clock;

// name, seconds. Order is the cycle. `night` is deliberately the long one: the game lives
// in the delta between deep night and the black hour and you have to be bored of the dark
// before the dark changes.
const PHASES = [
  { name: 'dusk', dur: C.duskS },
  { name: 'night', dur: C.deepNightS },
  { name: 'black', dur: C.blackHourS },
  { name: 'dawn', dur: C.falseDawnS },
];
const CYCLE_S = PHASES.reduce((a, p) => a + p.dur, 0);   // 840

// Where each phase sits on sky.js's 0..1 LUT (its STOPS are dusk 0.00, deep night 0.30,
// black hour 0.70, false dawn 1.00). These are the pointer's endpoints, not new colours:
// authoring colour here would put the palette in two files and guarantee they drift.
const SKY_DUSK = 0.00, SKY_NIGHT = 0.30, SKY_WARN = 0.58, SKY_BLACK = 0.70, SKY_DAWN = 1.00;

// The black hour's moon. HALLOWIND's blood moon re-keyed: not a horror-red, a dried-blood
// brown-red, because the moon is still the KEY LIGHT for the whole county and a saturated
// red one turns every trunk into a theatre gel. Measured intent, not taste: it has to read
// as "wrong colour" at a glance and still light a treeline.
// MEASURED, not picked: the first value tried here was 0x8f4234, whose RED CHANNEL (0.561)
// is LOWER than the pale moon's (0.745). A "red" moon whose every channel goes down is not
// a red moon, it is a dimmer — the hue reads only in a side-by-side, and in the chair it
// would have looked like the lights failing. 0xc0563c raises red (0.753) while dropping
// green and blue by more than half, so the hue shift is what you see and the darkening is
// the separate, deliberate multiplier below.
const MOON_PALE = CFG.lights.moon.colour;      // 0xbecfe8
const MOON_RED = 0xc0563c;
// Luminance goes 0.80 -> 0.42 on the hue change alone; x0.68 lands the black hour at ~35%
// of deep-night moonlight. hemi (4.5) and ambient (2.0) are untouched and carry the ground
// read, so this is dark, not void — it is the one number in this file a play session should
// retune first.
const MOON_BLACK_MUL = 0.68;

// Moon elevation, radians. lights.js currently pins this at a module constant (MOON_ELEV
// 0.593); see the request in docs/HANDOFF.md. The black hour drops it toward the treetops
// so the shadows go long — a low key light is the cheapest "something is wrong with tonight"
// there is.
const MOON_ELEV_HIGH = 0.593;
const MOON_ELEV_LOW = 0.235;

const PHASE_INDEX = { dusk: 0, night: 1, black: 2, dawn: 3 };

/** Seconds from the top of the cycle to the start of phase i. */
function phaseStart(i) {
  let s = 0;
  for (let k = 0; k < i; k++) s += PHASES[k].dur;
  return s;
}

/* ------------------------------------------------------------------ module scratch -- */
// The hot path allocates nothing. These are only ever read/written in place.
const _payload = { phase: 'dusk', prev: 'dawn' };   // reused, per the chunk:built convention
const _rgb = { r: 0, g: 0, b: 0 };

function hexToRgb(hex, out) {
  out.r = ((hex >> 16) & 255) / 255;
  out.g = ((hex >> 8) & 255) / 255;
  out.b = (hex & 255) / 255;
  return out;
}
const _pale = hexToRgb(MOON_PALE, { r: 0, g: 0, b: 0 });
const _red = hexToRgb(MOON_RED, { r: 0, g: 0, b: 0 });

export class Clock {
  static id = 'clock';

  constructor(ctx) {
    this.ctx = ctx;
    // ctx.shared is the flat scalar bag from CONTRACT ("Shared read-only state on ctx").
    // Created defensively: this is manifest #4 and may be the first system to want it.
    this.shared = ctx.shared || (ctx.shared = {});

    this.cycleT = 0;          // seconds into the current cycle
    this.cycleLength = CYCLE_S;
    this.cycle = 0;           // completed cycles; the director eases the first three
    this.phase = 'dusk';
    this.phaseT = 0;
    this.telegraph = 0;       // 0..1, how loudly the sky is announcing the black hour
    this.redness = 0;         // 0..1, the moon's tint toward MOON_RED
    this.skyT = SKY_DUSK;
    this.moonElev = MOON_ELEV_HIGH;

    this._prevSkyT = SKY_DUSK;
    this._currSkyT = SKY_DUSK;
    this._prevRed = 0;
    this._currRed = 0;
    this._appliedSkyT = -1;
    this._announced = false;  // the first phase:changed is emitted on the first step
    this._paused = false;
    this._rate = 1;

    this._applyOverride();
  }

  /* ---------------------------------------------------------------- the override -- */
  //
  // ?hour=black / ?hour=dusk / ?hour=dawn / ?hour=night.
  //
  // The whole game is the delta between deep night and the black hour, and eleven minutes is
  // too long to wait to look at it. This is the single most-used debug door in the project
  // and it is one click. ?hour also accepts a fraction — ?hour=black:0.5 starts halfway
  // through — and ?hour=warn drops you 20 s before the telegraph begins, which is the beat
  // that actually needs eyes on it.
  _applyOverride() {
    let raw = null;
    try {
      if (typeof location !== 'undefined' && location.search) {
        raw = new URLSearchParams(location.search).get('hour');
      }
    } catch (e) { raw = null; }
    if (!raw) return;
    const parts = String(raw).toLowerCase().split(':');
    let name = parts[0];
    const frac = parts.length > 1 ? clamp01(parseFloat(parts[1]) || 0) : 0;
    // No alias table. There was one here mapping 'deepnight'/'blackhour'/'falsedawn' onto
    // the real names, and a convenience spelling that only one file accepts is how the long
    // spellings kept leaking back into lanes that then compared against them. The vocabulary
    // is exactly PHASE_INDEX: dusk | night | black | dawn. (?hour=warn is not a phase — it
    // is a position inside `night`, and it is spelled that way on purpose.)
    if (name === 'warn') {
      // 20 s before the telegraph starts: night, at (dur - warn - 20).
      const d = PHASES[1].dur;
      this.setPhase('night', clamp01((d - C.blackHourWarnS - 20) / d));
      this._override = raw;
      return;
    }
    if (!(name in PHASE_INDEX)) return;
    this.setPhase(name, frac);
    this._override = raw;
  }

  /* ------------------------------------------------------------------ test door -- */

  /** Jump to the start of a phase (or `t` of the way through it). Deterministic. */
  setPhase(name, t = 0) {
    const i = PHASE_INDEX[name];
    if (i === undefined) return false;
    this.cycleT = phaseStart(i) + clamp01(t) * PHASES[i].dur;
    this._recompute();
    // A jump is a discontinuity: kill the interpolation so present() does not sweep the
    // sky through the intervening hours over one frame.
    this._prevSkyT = this._currSkyT = this.skyT;
    this._prevRed = this._currRed = this.redness;
    this._appliedSkyT = -1;
    this._announced = false;   // re-announce, so listeners hear the phase they landed in
    return true;
  }

  /** Live A/B only. rate 0 freezes the cycle where it stands. */
  setRate(r) { this._rate = Math.max(0, +r || 0); }

  /* --------------------------------------------------------------------- derive -- */

  _recompute() {
    if (this.cycleT >= CYCLE_S) {
      const n = Math.floor(this.cycleT / CYCLE_S);
      this.cycle += n;
      this.cycleT -= n * CYCLE_S;
    }
    let t = this.cycleT, i = 0;
    while (i < PHASES.length - 1 && t >= PHASES[i].dur) { t -= PHASES[i].dur; i++; }
    const P = PHASES[i];
    this.phase = P.name;
    this.phaseT = clamp01(t / P.dur);

    // ---- the LUT pointer, phase by phase --------------------------------------
    // Every segment is authored so the pointer is CONTINUOUS across a phase boundary and
    // across the cycle wrap (dawn ends at 1.00, dusk begins at 0.00, and sky.js's two
    // stops there are 0x161a22 and 0x141a26 — the same value to the eye).
    let sky, red, elev = MOON_ELEV_HIGH, warn = 0;
    if (i === 0) {
      // dusk: the light leaving. Eased, because a linear ramp reads as a dimmer knob.
      sky = lerp(SKY_DUSK, SKY_NIGHT, smoothstep(0, 1, this.phaseT));
      red = 0;
    } else if (i === 1) {
      // deep night: flat, and then the telegraph. The last blackHourWarnS seconds walk the
      // pointer most of the way to the black hour: the stars thin and the horizon darkens
      // BEFORE anything happens, which is the only warning the player ever gets.
      const secsLeft = P.dur - t;
      warn = clamp01((C.blackHourWarnS - secsLeft) / C.blackHourWarnS);
      // squared: nothing for the first thirty seconds, then unmistakable
      const w = warn * warn;
      sky = lerp(SKY_NIGHT, SKY_WARN, w);
      red = 0.62 * w;
      elev = lerp(MOON_ELEV_HIGH, MOON_ELEV_LOW, w * 0.55);
    } else if (i === 2) {
      // the black hour: settle onto the stop over the first 25 s and hold there. Holding is
      // deliberate — three minutes of a sky that is still moving reads as a transition, and
      // this is not a transition, it is the hour.
      const k = clamp01((t) / 25);
      sky = lerp(SKY_WARN, SKY_BLACK, k);
      red = lerp(0.62, 1, k);
      warn = 1;
      elev = lerp(lerp(MOON_ELEV_HIGH, MOON_ELEV_LOW, 0.55), MOON_ELEV_LOW, k);
    } else {
      // false dawn: the colour comes back before the danger does. The red drains over the
      // first 40% — the sky forgives you faster than the county does.
      sky = lerp(SKY_BLACK, SKY_DAWN, this.phaseT);
      red = 1 - clamp01(this.phaseT / 0.40);
      elev = lerp(MOON_ELEV_LOW, MOON_ELEV_HIGH, clamp01(this.phaseT / 0.55));
    }
    this.skyT = sky;
    this.redness = clamp01(red);
    this.telegraph = warn;
    this.moonElev = elev;

    // ---- publish ---------------------------------------------------------------
    this.shared.phase = this.phase;
    this.shared.phaseT = this.phaseT;
  }

  /* ----------------------------------------------------------------------- loop -- */

  async init() {
    this._recompute();
    this._prevSkyT = this._currSkyT = this.skyT;
    this._prevRed = this._currRed = this.redness;
    this._apply(this.skyT, this.redness);
  }

  step(dt) {
    this._prevSkyT = this._currSkyT;
    this._prevRed = this._currRed;

    const prevPhase = this.phase;
    if (!this._paused && this._rate > 0) {
      this.cycleT += dt * this._rate;
      this._recompute();
    }
    this._currSkyT = this.skyT;
    this._currRed = this.redness;

    // The first announcement is made HERE, not in init(): every system's init() has run by
    // the time the first step lands, so a listener registered in dread's or the director's
    // init still hears the phase it woke up in. An init-time emit would be shouted into an
    // empty room and the director would sit at dusk's roster through the black hour.
    if (!this._announced) {
      this._announced = true;
      _payload.phase = this.phase;
      _payload.prev = prevPhase === this.phase ? null : prevPhase;
      this.ctx.bus.emit('phase:changed', _payload);
    } else if (this.phase !== prevPhase) {
      _payload.phase = this.phase;
      _payload.prev = prevPhase;
      this.ctx.bus.emit('phase:changed', _payload);
    }
  }

  /**
   * The sky is written from the INTERPOLATED pointer, like everything else that moves.
   * It moves far below 1 Hz so no human could see the interpolation difference — but a system that opts
   * out of alpha "because it is slow" is how the next thing that opts out gets away with it.
   */
  present(alpha) {
    const a = clamp01(alpha);
    let sky = this._currSkyT, red = this._currRed;
    // A wrap (1.00 -> 0.00) or a setPhase() jump must not be swept through.
    if (Math.abs(this._currSkyT - this._prevSkyT) < 0.5) {
      sky = lerp(this._prevSkyT, this._currSkyT, a);
      red = lerp(this._prevRed, this._currRed, a);
    }
    this._apply(sky, red);
  }

  /**
   * Write the sky and the moon. Skips when nothing moved enough to see: the pointer travels
   * 1.4e-5 per frame in deep night and sky.setPhase() does a dozen Color lerps plus a fog
   * write, so this is ~6 real calls a second instead of 60 for an identical picture.
   */
  _apply(skyT, redness) {
    if (this._appliedSkyT >= 0 && Math.abs(skyT - this._appliedSkyT) < 2e-4) return;
    this._appliedSkyT = skyT;

    const sys = this.ctx.systems;
    if (!sys) return;

    // --- the sky. Read lazily, at use: never captured at construction. ---
    const sky = sys.get('sky');
    if (sky && typeof sky.setPhase === 'function') sky.setPhase(skyT);

    // --- the moon. Colour and intensity only. ---
    const lights = sys.get('lights');
    if (!lights) return;
    // gfx is shipping the arc knob this round (docs/HANDOFF.md, request 1). It wins when it
    // is there: elevation is lights' to write, because lights.present() re-derives the
    // shadow box from it. The guard stays regardless — this file must boot against a lights
    // system that has it and one that does not, and a hard call would be a TypeError inside
    // present() on any build where the two lanes land out of order.
    if (typeof lights.setMoonArc === 'function') lights.setMoonArc(this.moonElev);
    // NOT setMoonTint(): gfx is adding one this round but nothing has written down what `t`
    // means, and a wrong guess here recolours the county's only key light. The direct
    // moon.color write below stays until that signature is documented — see HANDOFF.
    const moon = lights.moon;
    if (!moon) return;
    _rgb.r = lerp(_pale.r, _red.r, redness);
    _rgb.g = lerp(_pale.g, _red.g, redness);
    _rgb.b = lerp(_pale.b, _red.b, redness);
    // setRGB, not set(hex): no allocation, no sRGB round-trip through an int.
    moon.color.setRGB(_rgb.r, _rgb.g, _rgb.b);
    moon.intensity = CFG.lights.moon.intensity * lerp(1, MOON_BLACK_MUL, redness);
  }

  /* ---------------------------------------------------------------- the surface -- */

  get isBlackHour() { return this.phase === 'black'; }
  /** True once the sky has started telling you. The dread lane may want this. */
  get isTelegraphing() { return this.telegraph > 0.02 && this.phase !== 'dawn'; }
  /** Seconds until the black hour begins (0 while it is happening). */
  timeToBlackHour() {
    if (this.phase === 'black') return 0;
    const start = phaseStart(2);
    let d = start - this.cycleT;
    if (d < 0) d += CYCLE_S;
    return d;
  }

  state() {
    return {
      phase: this.phase,
      phaseT: +this.phaseT.toFixed(4),
      cycle: this.cycle,
      cycleT: +this.cycleT.toFixed(2),
      cycleLength: CYCLE_S,
      skyT: +this.skyT.toFixed(4),
      telegraph: +this.telegraph.toFixed(3),
      redness: +this.redness.toFixed(3),
      moonElev: +this.moonElev.toFixed(3),
      toBlack: +this.timeToBlackHour().toFixed(1),
      override: this._override || null,
    };
  }

  config(patch) {
    if (!patch || !patch.clock) return;
    if (typeof patch.clock.rate === 'number') this.setRate(patch.clock.rate);
    if (typeof patch.clock.phase === 'string') this.setPhase(patch.clock.phase, patch.clock.t || 0);
  }

  ready() {
    // A real wiring check: the cycle must be the four authored phases, the pointer must be
    // finite, and shared must actually carry the phase — a clock that publishes nothing is
    // exactly the working-but-invisible failure this catalogue keeps shipping.
    return PHASES.length === 4 && CYCLE_S === (C.duskS + C.deepNightS + C.blackHourS + C.falseDawnS)
      && Number.isFinite(this.skyT) && typeof this.shared.phase === 'string';
  }

  dispose() {}
}

export default Clock;
