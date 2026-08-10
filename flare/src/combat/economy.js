// W8 — THE ECONOMY, WHOSE READOUTS ARE ALL IN THE WORLD.
//
// Health, regen, drops, pickups, flares, the combo, and the one readout the
// player has for any of it. CONTRACT §6 bans HUD TEXT, which means every number
// in this file has to arrive through something the player can see or hear:
//
//   HEALTH          the visor frost — a continuous MULTIPLY over the frame, plus
//                   ONE COUNTABLE CRACK per 20 HP crossed downward, plus a
//                   breathe below 25 HP. Three channels, because a colourblind
//                   player reading a dark frame through film grain needs the
//                   answer to survive any one of them being unreadable.
//   AMMO            W6's flash intensity and radius; RESERVE is the four
//                   chamber-glow notches. This file only tops them up.
//   PICKUPS         EVERY PICKUP IS A SMALL LIGHT. That is not decoration: it is
//                   the entire reason a drop is findable in a dark room without
//                   a marker, and it is why a pickup carries a light-field probe
//                   and not merely a sprite.
//   FLARES          BORROWED LIGHT. A flare deposits NO permanent scar, and that
//                   distinction is the point — kills are the payment, flares are
//                   the debt. GROUPED G4 refills them every chamber so they are
//                   a tactical resource rather than a run-long hoard nobody
//                   spends.
//
// THE FROST IS A MULTIPLY BLEND (styles.css), never screen. Screen lifts blacks
// and would destroy the low-mids contrast the entire game is built on; the frost
// darkens the edges and leaves the centre readable, which is also the correct
// fiction for a cracked visor.
//
// ONE HEALTH NUMBER. `player.state.health` is the authority when a controller
// exists, because the dash-execute already heals through it and two health
// values that drift is precisely the class of bug this repo was organised to
// prevent. Standalone, an identically-shaped local record stands in, so exactly
// one of the two is live at any moment and the gate can drive either.

import FEEL from '../feel.js';
import { clamp, clamp01 } from '../core/math.js';
import { Pool } from '../core/pool.js';
import { GROUND, hasSurface } from '../world/ground.js';

const E = FEEL.economy;
const C = FEEL.combo;

/** The ONE frozen table this module owns. Balance lives in FEEL (CONTRACT §5). */
export const ECONOMY_TABLE = Object.freeze({
  // ---- chambers ----------------------------------------------------------
  // "MAX_HEALTH 100 (75 until GALLERY)" needs an ORDER to mean anything.
  chamberOrder: Object.freeze(['intake', 'helix', 'gallery', 'furnace', 'aperture']),
  fullHealthFrom: 2,         // index of GALLERY
  extraFlareFrom: 1,         // "3 after INTAKE"

  // ---- the frost ---------------------------------------------------------
  frostQuant: 256,           // opacity is written from a precomputed string table,
                             // so the readout never allocates during play
  crackInk: 'rgba(13, 17, 22, 0.9)',
  // Five fixed chip positions, deterministic and off-centre: a crack that
  // crosses the middle of the frame is a readout that costs the player the shot
  // it is reporting on. Countable objects beat continuous alpha for a colourblind
  // player (C3-F3), so these are discrete chips, not a smear.
  crackSpots: Object.freeze([
    Object.freeze([18, 74, 7.5, 2.2, 24]),
    Object.freeze([81, 29, 6.5, 2.0, -37]),
    Object.freeze([34, 21, 5.5, 1.8, -14]),
    Object.freeze([69, 82, 8.5, 2.4, 41]),
    Object.freeze([9, 41, 6.0, 1.9, -58]),
  ]),

  // ---- pickups -----------------------------------------------------------
  pickupPool: 24,
  pickupRise: 0.55,          // metres above the floor a drop rests
  pickupSpriteR: 0.26,
  pickupAlpha: 0.95,
  pickupLightR: 2.6,         // the small light. Findable, never a landmark.
  pickupLightI: 0.34,
  pickupBobAmp: 0.07,
  pickupBobHz: 0.9,
  pickupBobPhase: 0.37,      // per-drop phase offset, so a pile does not pulse as one
  collectFlash: 0.22,        // seconds of absorb feedback, identical whether the
                             // pickup was USED or converted to score
  collectFlashR: 3.2,
  collectFlashI: 1.4,
  fullPickupScore: 25,       // "full pickup -> +25 score, same feedback"

  // ---- flares ------------------------------------------------------------
  flarePool: 6,
  flareThrow: 2.2,           // metres forward of the eye it lands
  flareRise: 0.12,
  flareIgnite: 0.35,         // seconds to reach full intensity
  flareFade: 3.0,            // seconds of decay at the end of the burn
  flareSpriteR: 0.34,
  flareKindDisc: 1,          // LIGHT_KIND.DISC — a flare on the floor is a disc

  // ---- shapes, which is how the two drop kinds are told apart ------------
  // NEVER hue (CONTRACT §6): health is a RING, ammo is a BLOB, and the two are
  // separable in greyscale at any brightness.
  shapeHealth: 1,
  shapeAmmo: 0,

  // W5's injected `impact` callback names five events; impact.js has four kinds
  // and falls back to 'hurt' for anything it does not recognise — which would
  // put a 0.050 s FREEZE on a landing rumble. The map is explicit so that
  // cannot happen by omission. GROUPED G8 sanctions routing footfall and slam
  // rumble through impact() rather than through an addTrauma allowlist.
  impactKind: Object.freeze({
    execute: 'break', bodyCheck: 'hurt', bodyCheckHeavy: 'break', rumble: 'graze',
    break: 'break', hurt: 'hurt', graze: 'graze', locked: 'locked',
  }),

  eps: 1e-6,
});

const T = ECONOMY_TABLE;
const WARM = FEEL.render.warm;

// ---------------------------------------------------------------------------
// PURE READOUT MATHS. Exported so the gate asserts the SHIPPING expression
// rather than a transcription of it.
// ---------------------------------------------------------------------------

/** The continuous channel. 5.4% at 90 HP, 16% at 75 (docs/FEEL.md §ECONOMY). */
export function frostOpacity(health, maxHealth) {
  const max = maxHealth > 0 ? maxHealth : E.maxHealth;
  const missing = clamp01(1 - clamp(health, 0, max) / max);
  return clamp01(Math.pow(missing, E.frostPow) * E.frostScale);
}

/**
 * The COUNTABLE channel. One crack per 20 HP crossed downward, healed back one
 * at a time. Expressed as a function of health rather than as a latch, which is
 * what makes "healed back one at a time" fall out instead of being implemented:
 * floor((max-health)/20) rises by one at each threshold going down and falls by
 * one at the same threshold coming back up.
 */
export function crackCount(health, maxHealth) {
  const max = maxHealth > 0 ? maxHealth : E.maxHealth;
  const n = Math.floor((max - clamp(health, 0, max)) / E.frostCrackPer);
  return clamp(n, 0, Math.floor(max / E.frostCrackPer));
}

/**
 * The grain the frost has to be read THROUGH.
 *
 * docs/FEEL.md's render line is `grain (g-.5)*(.10 + t*.055)` with g uniform on
 * [0,1), so the peak deviation per unit local luminance is HALF the constant:
 * ±0.050 at rest, ±0.0775 at full tension. Those are exactly the numbers C3-F3
 * measured the health readout against, and they are what makes FEEL's own claim
 * ("5.4% at 90 HP ... clear of grain") true.
 *
 * NOTE, and it is filed as a request in docs/HANDOFF.md: the SHIPPED shader in
 * src/render/post.js is `col += g * 2.0 * uGrain * localLuma`, i.e. exactly
 * TWICE this. Against the shipped amplitude the continuous channel does not
 * clear the noise until ~83 HP instead of ~90. One of the two is wrong and it is
 * not mine to change; `tests/combat.mjs` reports both numbers so whoever picks
 * cannot pick by accident.
 */
export const grainAmplitude = (tension = 0) =>
  (FEEL.render.grainBase + FEEL.render.grainPerTension * clamp01(tension)) * 0.5;

/** The combo multiplier. 1.00 / 1.25 / ... / 2.00 at chain 0,2,4,6,8. */
export const comboMultiplier = chain =>
  1 + Math.min(C.max, Math.floor(Math.max(0, chain) / C.step)) * C.perStep;

/** Drop chance for a target of this size (FEEL: .42 + clamp01(maxHp/240)*.4). */
export const dropChanceFor = maxHp =>
  E.dropBase + clamp01((maxHp || 0) / E.dropHpRef) * E.dropPerHp;

// ---------------------------------------------------------------------------
export function makeEconomy(ctx, opts = {}) {
  const rng = ctx && ctx.rng ? ctx.rng.fork('drop') : null;
  const roll = () => (rng ? rng.next() : 0.5);

  const getWorld = opts.world
    ? (typeof opts.world === 'function' ? opts.world : () => opts.world)
    : () => ctx && ctx.world;

  // ---- THE ONE HEALTH RECORD ---------------------------------------------
  const localBody = { health: E.maxHealth, maxHealth: E.maxHealth, alive: true };
  const hostOf = () => ((ctx && ctx.player && ctx.player.state) ? ctx.player.state : localBody);

  let chamberIndex = 0;
  let sinceDamage = E.regenDelay;      // start able to regen; nothing has hit us
  let regenSpent = 0;
  let lastHealth = localBody.health;
  let clock = 0;

  // ---- combo --------------------------------------------------------------
  let chain = 0;
  let chainLeft = 0;

  // ---- flares -------------------------------------------------------------
  let flaresCarried = E.flares;
  let flareCapacity = E.flares;

  // ---- score, which lives on the end card and nowhere else ----------------
  let score = 0;

  const stats = {
    kills: 0, drops: 0, dropRolls: 0, healthDrops: 0, ammoDrops: 0,
    collected: 0, converted: 0, expired: 0, denied: 0,
    healed: 0, regenerated: 0, damageTaken: 0,
    flaresLit: 0, flaresRefused: 0, chamberClears: 0, waveClears: 0,
    cracksOpened: 0, cracksHealed: 0, maxChain: 0,
  };

  const pickups = new Pool(T.pickupPool, () => ({
    kind: 'health', x: 0, y: 0, z: 0, gy: 0, age: 0, serial: 0,
    collected: false, collectAge: 0, converted: false,
  }));
  const flares = new Pool(T.flarePool, () => ({
    x: 0, y: 0, z: 0, age: 0, serial: 0,
  }));
  const liveP = pickups.live;
  const liveF = flares.live;
  let serial = 0;

  // -------------------------------------------------------------------------
  // THE FROST. Precomputed strings, so the readout that runs every frame for the
  // whole game allocates nothing (CONTRACT §4).
  // -------------------------------------------------------------------------
  const frostEl = (ctx && ctx.ui && ctx.ui.frost) ? ctx.ui.frost
    : (typeof document !== 'undefined' && document.getElementById ? document.getElementById('frost') : null);

  const OPACITY = new Array(T.frostQuant + 1);
  for (let i = 0; i <= T.frostQuant; i++) OPACITY[i] = String(i / T.frostQuant);

  // The base gradient is READ off the element, never restated here. styles.css
  // belongs to the integrator; copying its gradient into this file would be a
  // second copy of an art decision that would silently stop tracking the first.
  let frostBase = '';
  if (frostEl && typeof getComputedStyle === 'function') {
    const bg = getComputedStyle(frostEl).backgroundImage;
    if (bg && bg !== 'none') frostBase = bg;
  }
  const maxCracks = Math.floor(E.maxHealth / E.frostCrackPer);
  const CRACK_BG = new Array(maxCracks + 1);
  for (let n = 0; n <= maxCracks; n++) {
    let s = '';
    for (let i = 0; i < n && i < T.crackSpots.length; i++) {
      const c = T.crackSpots[i];
      // A chip, not a line across the frame. Multiply blend, so ink = dark.
      s += `radial-gradient(${c[2]}vmin ${c[3]}vmin at ${c[0]}% ${c[1]}%, ${T.crackInk} 0%, rgba(0,0,0,0) 100%), `;
    }
    CRACK_BG[n] = s + frostBase;
  }

  let wroteOpacity = -1;
  let wroteCracks = -1;

  function paintFrost(opacity, cracks) {
    if (!frostEl) return;
    const q = clamp(Math.round(opacity * T.frostQuant), 0, T.frostQuant);
    if (q !== wroteOpacity) { frostEl.style.opacity = OPACITY[q]; wroteOpacity = q; }
    const n = clamp(cracks, 0, maxCracks);
    if (n !== wroteCracks && frostBase) { frostEl.style.backgroundImage = CRACK_BG[n]; wroteCracks = n; }
  }

  /**
   * The composed readout for THIS moment. Returned as a SHARED record so the
   * readout that runs every frame for the whole game allocates nothing — read
   * it, never retain it. (The second call rewrites every field, which is
   * exactly how the first version of verify() below compared a value against
   * itself and reported a working readout as broken.)
   */
  const _read = { health: 0, maxHealth: 0, opacity: 0, cracks: 0, critical: false, breathe: 0 };
  function readout() {
    const h = hostOf();
    _read.health = h.health;
    _read.maxHealth = h.maxHealth;
    _read.cracks = crackCount(h.health, h.maxHealth);
    let o = frostOpacity(h.health, h.maxHealth);
    _read.critical = h.health < E.criticalBelow;
    // "critical breathe below 25 HP: .12 + sin(t*5.4)*.10". Note the argument:
    // sin(t*5.4) is 5.4 RADIANS per second = 0.86 Hz, a breath. Read as 5.4 Hz it
    // would be a full-screen luminance modulation above SAFETY.md's 3 Hz ceiling,
    // on the one player state where a seizure is least survivable.
    _read.breathe = _read.critical
      ? E.criticalBase + Math.sin(clock * E.criticalHz) * E.criticalAmp
      : 0;
    _read.opacity = clamp01(o + _read.breathe);
    return _read;
  }

  // -------------------------------------------------------------------------
  // DROPS. Adaptive: hurt players get health, healthy players get ammo, and the
  // chance scales with how big the thing you killed was.
  // -------------------------------------------------------------------------
  function groundUnder(x, z, y) {
    const base = y === undefined ? 0 : y;
    const world = getWorld();
    if (!world || !world.ground) return base;
    const g = world.ground.groundAt(x, z, y === undefined ? GROUND.top : y + 1);
    return hasSurface(g) ? g : base;
  }

  function spawnPickup(kind, x, y, z) {
    const p = pickups.take();
    if (!p) { stats.denied++; return null; }
    p.kind = kind;
    p.x = x; p.z = z;
    p.gy = groundUnder(x, z, y);
    p.y = p.gy + T.pickupRise;
    p.age = 0;
    p.collected = false;
    p.collectAge = 0;
    p.converted = false;
    p.serial = ++serial;
    stats.drops++;
    if (kind === 'health') stats.healthDrops++; else stats.ammoDrops++;
    return p;
  }

  /** The roll. Returns the pickup, or null — and null is the common case. */
  function rollDrop(x, y, z, maxHp) {
    stats.dropRolls++;
    const h = hostOf();
    if (roll() > dropChanceFor(maxHp)) return null;
    const hurt = h.health < h.maxHealth * E.hurtBelow;
    const pHealth = hurt ? E.dropHurtHealth : E.dropHealthyHealth;
    return spawnPickup(roll() < pHealth ? 'health' : 'ammo', x, y, z);
  }

  // -------------------------------------------------------------------------
  /** A fraction of each weapon's MAX reserve — the wave-clear payout. */
  function addReserveFraction(fraction) {
    const w = ctx && ctx.weapons;
    if (!w || !w.states) return 0;
    let added = 0;
    for (let i = 0; i < w.states.length; i++) {
      const s = w.states[i];
      const spec = FEEL.weapons[s.index !== undefined ? s.index : i];
      if (!spec) continue;
      const want = Math.ceil(spec.reserve * fraction);
      const room = spec.reserve - s.reserve;
      const give = room > 0 ? Math.min(want, room) : 0;
      s.reserve += give;
      added += give;
    }
    return added;
  }

  /** One ammo pickup: ceil(mag*.55) into the held gun, ceil(mag*.35) into the rest. */
  function addAmmoPickup() {
    const w = ctx && ctx.weapons;
    if (!w || !w.states) return 0;
    let added = 0;
    for (let i = 0; i < w.states.length; i++) {
      const s = w.states[i];
      const spec = FEEL.weapons[s.index !== undefined ? s.index : i];
      if (!spec) continue;
      const frac = (i === w.current) ? E.dropAmmoHeld : E.dropAmmoOther;
      const want = Math.ceil(spec.mag * frac);
      const room = spec.reserve - s.reserve;
      const give = room > 0 ? Math.min(want, room) : 0;
      s.reserve += give;
      added += give;
    }
    return added;
  }

  function heal(amount) {
    const h = hostOf();
    const before = h.health;
    h.health = Math.min(h.maxHealth, h.health + amount);
    const gained = h.health - before;
    stats.healed += gained;
    lastHealth = h.health;
    return gained;
  }

  function collect(p) {
    p.collected = true;
    p.collectAge = 0;
    stats.collected++;
    let used = 0;
    if (p.kind === 'health') used = heal(E.dropHealth);
    else used = addAmmoPickup();
    // THE NEVER-DEAD PICKUP. A health drop taken at full health is not wasted and
    // does not sit there mocking you: it converts to score and gives back the
    // IDENTICAL feedback, so the player is never taught to leave light on the
    // floor. (Every pickup is a light; walking past one to "save it" is the
    // player declining to see.)
    if (used <= 0) { p.converted = true; score += T.fullPickupScore; stats.converted++; }
    return used;
  }

  // -------------------------------------------------------------------------
  // FLARES — borrowed light.
  // -------------------------------------------------------------------------
  function useFlare(x, y, z) {
    if (flaresCarried <= 0) { stats.flaresRefused++; return null; }
    const f = flares.take();
    if (!f) { stats.flaresRefused++; return null; }
    const pl = ctx && ctx.player;
    let fx = x, fy = y, fz = z;
    if (fx === undefined && pl) {
      // Thrown a couple of metres ahead, so lighting the ground you are about to
      // cross costs you the ground you are standing on.
      const a = typeof pl.aimBasis === 'function' ? pl.aimBasis() : null;
      fx = pl.body.x + (a ? a.fx : 0) * T.flareThrow;
      fz = pl.body.z + (a ? a.fz : -1) * T.flareThrow;
      fy = pl.body.y;
    }
    fx = fx || 0; fz = fz || 0;
    f.x = fx; f.z = fz;
    f.y = groundUnder(fx, fz, fy === undefined ? 0 : fy) + T.flareRise;
    f.age = 0;
    f.serial = ++serial;
    flaresCarried--;
    stats.flaresLit++;
    return f;
  }

  /** Current intensity of a burning flare, 0..FEEL.economy.flareIntensity. */
  function flareIntensity(f) {
    const inLeft = E.flareBurn - f.age;
    const rise = f.age < T.flareIgnite ? f.age / T.flareIgnite : 1;
    const fall = inLeft < T.flareFade ? clamp01(inLeft / T.flareFade) : 1;
    return E.flareIntensity * rise * fall;
  }

  // -------------------------------------------------------------------------
  // KILLS — the scar, the combo and the drop, in one place.
  //
  // The scar deposit lives HERE and not in W7 because the combo multiplier
  // scales it (`i *= mult`, `r *= 0.85 + mult*0.15`) and a multiplier applied in
  // a different module from the one that owns the chain is the drift this repo
  // is organised around.
  // -------------------------------------------------------------------------
  function onKill(enemy, opts) {
    const e = enemy || {};
    const type = e.type || e.archetype || e.id || 'husk';
    const dep = FEEL.field.deposit[type] || FEEL.field.deposit.husk;

    chain++;
    chainLeft = C.window;
    if (chain > stats.maxChain) stats.maxChain = chain;
    const mult = comboMultiplier(chain);

    const x = e.x || 0, z = e.z || 0;
    const y = groundUnder(x, z, e.y === undefined ? 0 : e.y);
    // The caller may already own the deposit. enemies/manager.js does, and
    // LightField.deposit MERGES within 6 m (i += new.i * 0.45), so depositing
    // here as well inflates the field ~45% per kill — invisibly, in the number
    // the iris, enemy accuracy, spawn scoring and the mood filter all read.
    const wantDeposit = !(opts && opts.deposit === false);
    if (wantDeposit && ctx && ctx.light && typeof ctx.light.deposit === 'function') {
      ctx.light.deposit(x, y, z,
        dep[0] * (C.scarRadiusBase + mult * C.scarRadiusPerMult),
        dep[1] * mult * C.scarIntensityScale);
    }

    stats.kills++;
    score += (e.score || 0) * mult;
    const drop = rollDrop(x, y, z, e.maxHp || e.hp || 0);
    return { mult, chain, drop };
  }

  /**
   * C1-F11's ruling: a player hit HALVES the chain rather than clearing it. A
   * flat reset is a compounding loop pointed at the weakest player (fewer scars
   * -> less sight -> more hits), and `chain -= 3` makes damage nearly free at
   * the top. You lose a tier or two, never the run.
   */
  function onPlayerHit() {
    chain = Math.floor(chain / C.onHitDivide);
    sinceDamage = 0;
    regenSpent = 0;
  }

  function onWaveClear() {
    stats.waveClears++;
    heal(E.waveClearHeal);
    addReserveFraction(E.waveClearReserve);
  }

  /** GROUPED G4: flares refill to full on EVERY chamber clear. */
  function onChamberClear() {
    stats.chamberClears++;
    onWaveClear();
    flaresCarried = flareCapacity;
    return flaresCarried;
  }

  function setChamber(id) {
    const i = T.chamberOrder.indexOf(id);
    chamberIndex = i < 0 ? chamberIndex : i;
    const h = hostOf();
    const max = chamberIndex >= T.fullHealthFrom ? E.maxHealth : E.maxHealthEarly;
    h.maxHealth = max;
    if (h.health > max) h.health = max;
    lastHealth = h.health;
    flareCapacity = chamberIndex >= T.extraFlareFrom ? E.flaresAfterIntake : E.flares;
    // You ARRIVE at a chamber full. Entering one always follows a landing, which
    // GROUPED G3 gives the job of "reload, collect, choose, look down" — walking
    // into THE HELIX holding two of your three flares would make the third a
    // reward for having already cleared the chamber it is meant to be spent in.
    flaresCarried = flareCapacity;
    return max;
  }

  // -------------------------------------------------------------------------
  // UPDATE. Presentation clock: regen, magnet, lights, and the visor.
  // -------------------------------------------------------------------------
  function update(rdt) {
    const dt = rdt > 0 ? rdt : 0;
    clock += dt;
    const h = hostOf();

    // ---- damage detection, without draining anyone else's event ring -------
    // `player.events` has ONE read cursor, so a system that drains it takes the
    // events away from W7 and W10. Comparing health is non-destructive and
    // cannot fight another consumer for the same record.
    if (h.health < lastHealth - T.eps) {
      stats.damageTaken += lastHealth - h.health;
      onPlayerHit();
    }
    lastHealth = h.health;

    // ---- regen. Capped: it closes a fight, it does not replace one. --------
    sinceDamage += dt;
    if (h.health > 0 && sinceDamage >= E.regenDelay && h.health < h.maxHealth && regenSpent < E.regenCap) {
      const want = Math.min(E.regenRate * dt, h.maxHealth - h.health, E.regenCap - regenSpent);
      if (want > 0) {
        h.health += want;
        regenSpent += want;
        stats.regenerated += want;
        lastHealth = h.health;
      }
    }

    // ---- combo window ------------------------------------------------------
    if (chainLeft > 0) {
      chainLeft -= dt;
      if (chainLeft <= 0) { chainLeft = 0; chain = 0; }
    }

    const render = ctx && ctx.render;
    const add = render && render.additive;
    const lights = render && render.lights;
    const field = ctx && ctx.light;
    const pl = ctx && ctx.player;
    const px = pl ? pl.body.x : 0;
    const py = pl ? pl.body.y + FEEL.move.height * 0.5 : 0;
    const pz = pl ? pl.body.z : 0;

    // ---- pickups -----------------------------------------------------------
    for (let i = liveP.length - 1; i >= 0; i--) {
      const p = liveP[i];

      if (p.collected) {
        p.collectAge += dt;
        const k = 1 - clamp01(p.collectAge / T.collectFlash);
        if (k <= 0) { pickups.release(p); continue; }
        // The absorb. Identical for a used pickup and a converted one, which is
        // what makes "you were full" readable as a reward rather than a refusal.
        if (add) {
          add.sprite(p.x, p.y, p.z, T.pickupSpriteR + (1 - k) * T.collectFlashR * 0.5,
            WARM[0], WARM[1], WARM[2], k, T.shapeHealth, 0, 0, 0);
        }
        if (field && field.addProbe) field.addProbe(p.x, p.y, p.z, T.collectFlashR, T.collectFlashI * k);
        continue;
      }

      p.age += dt;
      if (p.age >= E.pickupLife) { stats.expired++; pickups.release(p); continue; }

      const dx = px - p.x, dy = py - p.y, dz = pz - p.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (pl) {
        if (d <= E.collectRadius) { collect(p); continue; }
        if (d <= E.magnetRadius && d > T.eps) {
          const step = Math.min(E.magnetPull * dt, d);
          p.x += (dx / d) * step;
          p.y += (dy / d) * step;
          p.z += (dz / d) * step;
        }
      }

      // Fade is ALPHA and LIGHT together: a drop about to expire dims, so the
      // room tells you it is going without a timer anywhere on the screen.
      const left = E.pickupLife - p.age;
      const fade = left < E.pickupFade ? clamp01(left / E.pickupFade) : 1;
      const bob = Math.sin((clock * T.pickupBobHz + p.serial * T.pickupBobPhase) * Math.PI * 2) * T.pickupBobAmp;
      const y = p.y + bob;
      if (add) {
        add.sprite(p.x, y, p.z, T.pickupSpriteR, WARM[0], WARM[1], WARM[2],
          T.pickupAlpha * fade, p.kind === 'health' ? T.shapeHealth : T.shapeAmmo, 0, 0, 0);
      }
      // EVERY PICKUP IS A SMALL LIGHT. This probe is the mechanic, not garnish:
      // it is what makes a drop findable in a dark room with no HUD marker.
      if (field && field.addProbe) field.addProbe(p.x, y, p.z, T.pickupLightR, T.pickupLightI * fade);
    }

    // ---- flares ------------------------------------------------------------
    for (let i = liveF.length - 1; i >= 0; i--) {
      const f = liveF[i];
      f.age += dt;
      if (f.age >= E.flareBurn) { flares.release(f); continue; }
      const inten = flareIntensity(f);
      if (add) {
        add.sprite(f.x, f.y, f.z, T.flareSpriteR, WARM[0], WARM[1], WARM[2],
          clamp01(inten / E.flareIntensity), 0, 0, 0, 0);
      }
      // BORROWED LIGHT: a rover slot and a field probe, and NO DEPOSIT. Nothing
      // in this branch touches ctx.light.deposit, and that omission is the whole
      // distinction between a flare and a kill.
      if (lights) {
        lights.request('flares', f.serial, f.x, f.y, f.z, E.flareRadius, inten, WARM,
          (render.LIGHT_KIND && render.LIGHT_KIND.DISC !== undefined) ? render.LIGHT_KIND.DISC : T.flareKindDisc);
      }
      if (field && field.addProbe) field.addProbe(f.x, f.y, f.z, E.flareRadius, inten);
    }

    // ---- the visor ---------------------------------------------------------
    const before = wroteCracks;
    const r = readout();
    paintFrost(r.opacity, r.cracks);
    if (before >= 0 && wroteCracks > before) stats.cracksOpened += wroteCracks - before;
    if (before >= 0 && wroteCracks < before) stats.cracksHealed += before - wroteCracks;
  }

  // -------------------------------------------------------------------------
  // WIRING. W5-PLAYER's controller refuses to reach chamber-ready with a default
  // callback in place (C2-F8), and TWO of the four are ours: `impact` (the
  // execute's hit language) and `refillWeapon` (D1's magazine refund). W7 wires
  // the other two.
  // -------------------------------------------------------------------------
  const _ip = { x: 0, y: 0, z: 0 };
  function wirePlayer() {
    const pl = ctx && ctx.player;
    if (!pl || typeof pl.inject !== 'function') return false;
    pl.inject({
      impact: (kind, x, y, z, id) => {
        const combat = ctx.weapons && ctx.weapons.combat;
        if (!combat) return;
        _ip.x = x; _ip.y = y; _ip.z = z;
        combat.impact(T.impactKind[kind] || 'graze', _ip, undefined, id);
      },
      refillWeapon: () => {
        // D1: the execute refunds ONE MAGAZINE of the held weapon. Into the
        // reserve, not into the magazine — an execute that reloads for you also
        // deletes the reload, and the reload is where the panic lives.
        const w = ctx && ctx.weapons;
        if (!w || !w.states) return;
        const s = w.states[w.current];
        const spec = FEEL.weapons[s.index !== undefined ? s.index : w.current];
        if (!spec) return;
        s.reserve = Math.min(spec.reserve, s.reserve + spec.mag);
      },
    });
    return true;
  }

  function reset() {
    for (let i = liveP.length - 1; i >= 0; i--) pickups.release(liveP[i]);
    for (let i = liveF.length - 1; i >= 0; i--) flares.release(liveF[i]);
    chain = 0; chainLeft = 0; score = 0; clock = 0;
    sinceDamage = E.regenDelay; regenSpent = 0;
    flaresCarried = flareCapacity;
    localBody.health = localBody.maxHealth; localBody.alive = true;
    lastHealth = hostOf().health;
    wroteOpacity = -1; wroteCracks = -1;
    for (const k of Object.keys(stats)) stats[k] = 0;
  }

  function snapshot() {
    const r = readout();
    return {
      build: 'w8-economy',
      health: r.health, maxHealth: r.maxHealth,
      frostOpacity: r.opacity, cracks: r.cracks, critical: r.critical,
      grainAmplitude: grainAmplitude(typeof ctx.tension === 'number' ? ctx.tension : 0),
      chain, multiplier: comboMultiplier(chain), chainLeft,
      regenSpent, sinceDamage,
      flares: flaresCarried, flareCapacity, flaresLit: liveF.length,
      pickups: liveP.length, pickupCapacity: pickups.capacity,
      chamber: T.chamberOrder[chamberIndex],
      score,
      stats: { ...stats },
      frostWired: !!frostEl,
      frostBaseCaptured: !!frostBase,
    };
  }

  /**
   * CONTRACT §2 — observable on the SHIPPING page. Take damage, and the visor
   * must actually darken: the DOM opacity the player sees has to move, not just
   * a number in a snapshot.
   */
  function verify() {
    const h = hostOf();
    const before = frostEl ? frostEl.style.opacity : '';
    const hp = h.health;
    h.health = Math.max(1, h.maxHealth - E.frostCrackPer * 2 - 1);
    lastHealth = h.health;
    // `readout()` returns the SHARED record — read the scalars out NOW. Calling
    // it a second time below rewrites every field, and comparing `r.opacity`
    // afterwards would compare the restored health against itself.
    const r = readout();
    const opacity = r.opacity, cracks = r.cracks;
    paintFrost(opacity, cracks);
    const after = frostEl ? frostEl.style.opacity : '';
    h.health = hp; lastHealth = hp;
    const rr = readout();
    paintFrost(rr.opacity, rr.cracks);
    const ok = cracks >= 2 && opacity > grainAmplitude(1) && (!frostEl || after !== before);
    return {
      ok,
      detail: `opacity '${before}' -> '${after}' (${(opacity * 100).toFixed(1)}%), ${cracks} cracks at ${(h.maxHealth - E.frostCrackPer * 2 - 1)} HP, grain ±${grainAmplitude(1).toFixed(4)}`,
    };
  }

  const api = {
    id: 'economy',
    ECONOMY_TABLE,
    update, reset, snapshot, verify, wirePlayer,

    // reads
    readout,
    get health() { return hostOf().health; },
    get maxHealth() { return hostOf().maxHealth; },
    get chain() { return chain; },
    get multiplier() { return comboMultiplier(chain); },
    get score() { return score; },
    get flares() { return flaresCarried; },
    get flareCapacity() { return flareCapacity; },
    get flareDrawRadius() { return E.flareDraw; },
    get activeFlares() { return liveF; },
    get pickups() { return liveP; },
    get chamber() { return T.chamberOrder[chamberIndex]; },
    frostOpacity: () => readout().opacity,
    cracks: () => readout().cracks,

    // writes
    onKill, onPlayerHit, onWaveClear, onChamberClear, setChamber,
    useFlare, flareIntensity, heal, spawnPickup, rollDrop, collect,
    addReserveFraction, addAmmoPickup,
    damage(amount) {
      const pl = ctx && ctx.player;
      if (pl && typeof pl.hurt === 'function') return pl.hurt(amount);
      const h = hostOf();
      if (!h.alive) return 0;
      const taken = Math.max(1, amount);
      h.health = Math.max(0, h.health - taken);
      if (h.health <= 0) h.alive = false;
      return taken;
    },

    stats, pool: pickups, flarePool: flares,
    dispose() {
      reset();
      if (frostEl) { frostEl.style.opacity = OPACITY[0]; wroteOpacity = 0; }
    },
  };
  return api;
}

// ---------------------------------------------------------------------------
// THE SYSTEM. One manifest entry:
//   { id: 'economy', module: './combat/economy.js', needs: ['ground', 'render', 'player', 'weapons'] }
//
// update(rdt) only, deliberately: nothing in here moves through the world on the
// fixed clock. Regen, the magnet, the burn and the visor are all presentation-
// rate quantities, and giving them a step() would make the magnet pull at a
// different speed during a hitstop than outside one.
// ---------------------------------------------------------------------------
export function create(ctx) {
  const api = makeEconomy(ctx);
  ctx.economy = api;
  api.wirePlayer();
  if (ctx && ctx.chamber && ctx.chamber.id) api.setChamber(ctx.chamber.id);
  if (typeof window !== 'undefined' && window.__FLARE) window.__FLARE.economy = api;
  return api;
}

export default create;
