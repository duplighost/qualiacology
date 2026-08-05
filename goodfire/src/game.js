// GOODFIRE game.js — the fire-scene controller: owns one sim session (fire, rx, interlude,
// ambient), wires warden/camera/director/audio/radio/ledger, and reports the outcome.
// Scenes are created fresh per session; the SAVE is the only cross-session truth.

import { GRID, CELLS, FUEL, S, FLAG, RETARDANT, SEASON_D, CEREMONY, ACRES_PER_CELL,
         TICK_HZ, DT, WARDEN } from './canon.js';
import { makeStreams, WORLD_SEED } from './rng.js';
import { createSim } from './sim.js';
import { createWarden } from './warden.js';
import { createCamera } from './camera.js';
import { createDirector, FIRES, RX_UNITS, FIRE_MONTHS, monthOfOrdinal } from './season.js';
import { createRadio } from './radio.js';
import { buildLedger, buildRxStamp, snapshotPreFire } from './ledger.js';
import { applySeason, harvestFire, countCompleted, bitGet, bitSet } from './save.js';
import { ZONE, ZONE_NAMES } from './map.js';

// ---- scene-controller constants. These are pacing/feel numbers no other module reads, so
// they live here rather than in canon.js (interfaces.md: never the same constant twice).
// PROVISIONAL ones are marked; the rest are authored in the specs cited. ------------------
const I0_TICKS = 30 * TICK_HZ;                   // season §13.1: I0 is a 30 s walk, no satchel
const LEAVE_MIN_TICKS = 20 * TICK_HZ;            // §13.1 leave-early: 20 s of ground first
const LEAVE_ARM_TILES = 6;                       // PROVISIONAL: the truck only becomes an exit
const LEAVE_TILES = 2;                           //   once you've actually walked away from it
const CLOSE_CAP_TICKS = 12 * TICK_HZ;            // she finishes the sentence — but not forever
const CLOSE_CAP_LONG_TICKS = 20 * TICK_HZ;       // D-15/D-51+D-52: the book's longest reads
const CROWN_TRAUMA = 0.6, CROWN_TRAUMA_RANGE = 40; // verbs §10.1 (canon-final §8: verbs' sources)
const CROWN_TRAUMA_COOLDOWN = 0.5 * TICK_HZ;     // art §10.1's global cooldown — punch, not pin
const DROP_TRAUMA = 0.4, STOMP_TRAUMA = 0.04;    // verbs §10.1
const CUT_TRAUMA_PER_S = 0.05;                   // verbs §10.1, source-capped at 0.15 (see tick)
const TOWER_SCORCH_TILES = 4;                    // PROVISIONAL: F3's lamp-height scorch radius
// §19 pips, no markers. The radii are the MAP's, not a designer's whim (all kernel-measured):
// the tower stands on a scree knob whose closest walkable ground is 5.5 tiles out, and the
// Larder basin isn't connected to the town half at all — a walker gets ~13 tiles from its box,
// which is precisely why the season calls that beat an OVERLOOK.
const CEDAR_TILES = 7, LARDER_TILES = 16, CATWALK_TILES = 12, BOOK_TILES = 6;
const EPILOGUE_MIN_TICKS = 20 * TICK_HZ;         // PROVISIONAL: a walk, not a doorstep
const EPILOGUE_CAP_TICKS = 180 * TICK_HZ;        // §19 soft cap ~3 min: one last entry, out

export function createFireSession(opts) {
  // opts: { mapData, save, mode:'fire'|'rx'|'interlude'|'ambient'|'epilogue',
  //         fire (season entry) | rxUnit | interludeIdx, audio, viewport:{w,h},
  //         onClose(result) }
  const { mapData, save, mode, audio, onClose } = opts;
  const fire = opts.fire || null;
  const ordinal = fire ? FIRES.indexOf(fire) + 1 : 0;
  // Rx identity = position in the authored list. RX_UNITS entries carry no idx field, so the
  // old `opts.rxUnit.idx` was undefined at BOTH sites: every unit shared the plain world seed
  // and harvested as ordinal 8 (save model: rx = 8+idx).
  const rxIdx = mode === 'rx' ? Math.max(0, RX_UNITS.indexOf(opts.rxUnit)) : 0;
  const seed = WORLD_SEED ^ (mode === 'rx' ? 0x52580000 + rxIdx : ordinal);
  const streams = makeStreams(seed);
  const sim = createSim(mapData, streams);
  const completedBefore = countCompleted(save);
  applySeason(sim, mapData, save);

  // dryness by mode
  const D = mode === 'fire' ? fire.D
          : mode === 'rx' ? SEASON_D.rx
          : mode === 'epilogue' ? 0.10
          : 0.30;

  // The atlas keys palettes ['jun','jul','aug','sep','oct','winter','spring']; season.js speaks
  // whole month words ('september') and FIRES entries carry NO month field — the calendar lives
  // in FIRE_MONTHS/monthOfOrdinal, so derive it here and never copy the table. (Sending
  // `fire.month` sent undefined, which pinned the whole season to render's 'jun' default: the
  // aug gold, the oct rust, and the winter snow were all authored and never seen.)
  const MONTH = (() => {
    if (mode === 'fire') return monthOfOrdinal(ordinal).slice(0, 3);
    if (mode === 'rx') return monthOfOrdinal(8).slice(0, 3);   // both rx windows are september
    if (mode === 'interlude') {
      // a dawn wears the month it walks toward. After the Crown there is no next fire — that
      // dawn is where first snow lands (season §19).
      const next = FIRE_MONTHS[(opts.interludeIdx | 0) + 1];
      return next ? next.slice(0, 3) : 'winter';
    }
    if (mode === 'epilogue') return 'spring';
    return 'jun'; // ambient / title backdrop: the season's first light
  })();
  sim.initFire({ D, basinFloor: fire ? fire.basinFloor !== false : completedBefore < 5 });

  if (mode === 'rx') {
    sim.setSchedule([{ t: 0, deg: 300, mph: 4 }, { t: 210, deg: 320, mph: 6 }]);
    sim.setEmbers(false); // zen sessions never spot: trust is the reward (spec-verbs §11.2)
  } else if (mode !== 'fire') {
    sim.setSchedule([{ t: 0, deg: 290, mph: mode === 'epilogue' ? 5 : 3 }]);
    sim.setEmbers(false);
  }

  // ---- tallies (ledger inputs) ----
  const tally = {
    lineCellsCut: 0, tieIns: 0, cedes: [], grandmotherUsed: 0,
    structuresLostNow: [], breaches: 0, planted: 0,
    burnedAtStart: (() => { let n = 0; for (let i = 0; i < CELLS; i++) if (sim.state[i] === S.SCAR) n++; return n; })(),
  };

  // ---- warden + camera ----
  // spawn sanitizer: authored spawns aim at landmarks (the Lookout sits on a rock knob in
  // the Hogback's band) — BFS to the nearest cell whose 5×5 box is fully walkable so the
  // warden never wakes up bricked into scree.
  function openSpawn(want) {
    const walkable = (cx, cy) => {
      if (cx < 2 || cy < 2 || cx >= GRID - 2 || cy >= GRID - 2) return false;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const f = sim.fuel[(cy + dy) * GRID + (cx + dx)];
        if (f === FUEL.ROCK || f === FUEL.WATER || f === FUEL.STRUCTURE) return false;
      }
      return true;
    };
    const sx = want.x | 0, sy = want.y | 0;
    if (walkable(sx, sy)) return { x: sx + 0.5, y: sy + 0.5 };
    const seen = new Set([sy * GRID + sx]);
    const q = [[sx, sy]];
    while (q.length) {
      const [cx, cy] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        const key = ny * GRID + nx;
        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID || seen.has(key)) continue;
        seen.add(key);
        if (Math.hypot(nx - sx, ny - sy) > 48) continue; // stay near the intent
        if (walkable(nx, ny)) return { x: nx + 0.5, y: ny + 0.5 };
        q.push([nx, ny]);
      }
    }
    return { x: sx + 0.5, y: sy + 0.5 }; // authored ground is authored ground
  }
  const spawn = openSpawn(
    mode === 'interlude' ? (opts.spawn || { x: 160, y: 120 })
    : mode === 'epilogue' ? { x: 198, y: 302 } // the town bridge
    : fire ? fire.spawn : { x: 162, y: 86 });
  const camera = createCamera(opts.viewport.w, opts.viewport.h);
  let grandmother = { state: 'idle', charges: fire ? (fire.grandmotherCharges ?? 1) : 0,
                      corridor: null, ticksLeft: 0, dropTicks: 0 };
  const warden = createWarden(sim, spawn, {
    onTieIn: (info) => {
      tally.tieIns++;
      ui.liturgy('LINE TIED IN.');
      if (audio) audio.chord('tieIn');
    },
    onTieTick: () => { if (audio) audio.ui('tieTick'); },
    onSizzle: () => { if (audio) audio.ui('sizzle'); },
  });

  // ---- ui state consumed by the renderer ----
  const ui = {
    toasts: [], logLine: null, fuelLens: false,
    liturgy(text) { this.toasts.push({ text, register: 'liturgy', born: sim.tick }); },
    whisper(text) { this.toasts.push({ text, register: 'whisper', born: sim.tick }); },
  };

  // ---- radio. view.radioLine now reads radio.state() directly: radio.js already paces the
  // line at 18 cps + 4 s hold from its LENGTH, and the old born-tick model here gave every
  // line a flat 200 ticks — long lines vanished mid-sentence, short ones hung around. show()
  // survives as the squelch/PTT cue only. ----
  const radio = createRadio({
    show: () => { if (audio) audio.radioKey(); },
  });
  // season §6: the prologue is wordless until D-1 at close. One gate for every line game.js
  // says. (The director gates its own; its closeRadio bypasses on purpose — D-1 is the line
  // that ends the silence.)
  const say = (id, params) => !fire?.silent && radio.say(id, params);

  // ---- director (fires only) ----
  let lastCuts = 0;
  const director = mode === 'fire' ? createDirector(sim, fire, {
    suppress: (untilTick) => radio.suppress(untilTick),
    burnFire: save.burnFire,
    radio: (id, params) => radio.say(id, params),
    logLine: () => {
      radio.suppress(sim.tick + 20 * 30);
      ui.logLine = { text: 'nothing has burned here in forty years.', born: sim.tick };
      save.sawTwist = true;
    },
    beat: (name) => { if (audio) audio.ui('beat:' + name); },
    weatherEnd: () => { sim.setWeatherEnd(true); },
    strike: (n, cell) => { if (audio) audio.ui('strike'); },
  }) : null;

  // ---- event wiring ----
  const preState = snapshotPreFire(sim);
  const lookout = mapData.landmarks.lookout;
  let crownTraumaAt = 0;
  sim.onEvent((e) => {
    switch (e.type) {
      case 'structureLost': {
        tally.structuresLostNow.push(e.key);
        // D-38 is the DIRECTOR's line (it owns the name grammar). Saying it here too put the
        // loss on the air twice per structure — one loss, one entry.
        break;
      }
      case 'propanePop': say('D-33'); break;
      case 'backburnEscaped': ui.whisper("backburn's loose."); say('D-37'); break;
      case 'backburnStarved': ui.liturgy('THE FIRE STARVED.');
        if (audio) audio.chord('starve');
        say('D-36'); break;
      case 'emberCatch': if (spotCatchWatch) spotCatchWatch(e); break;
      // ---- trauma (verbs §10.1 source table; camera owns the caps) ----
      case 'stomp': camera.addTrauma(STOMP_TRAUMA); break;
      case 'crownTransition': {
        // 0.6 × distance falloff, nothing past 40 tiles: the mountain announcing a mode change
        // to the body that has to outrun it. A crown run flips dozens of cells a second, so one
        // hit per 0.5 s (art §10.1's global cooldown) — otherwise trauma pins at 1.0 and Fire
        // Four becomes unreadable exactly when reading it is the whole game.
        if (sim.tick < crownTraumaAt) break;
        const p = warden.pos();
        const d = Math.hypot(p.x - ((e.cell % GRID) + 0.5), p.y - (((e.cell / GRID) | 0) + 0.5));
        if (d > CROWN_TRAUMA_RANGE) break;
        crownTraumaAt = sim.tick + CROWN_TRAUMA_COOLDOWN;
        camera.addTrauma(CROWN_TRAUMA * (1 - d / CROWN_TRAUMA_RANGE));
        break;
      }
      case 'cellBurnout':
        // F3's tower scorch: cosmetic on the map (canon §7), permanent in the book — it gates
        // the Lantern's best medal ('THE TOWER KEEPS ITS LAMP.') and the lookout's scorch line
        // for the rest of the season. Nobody else writes this flag.
        if (fire && fire.id === 'fire3' && !save.towerScorched) {
          const dx = (e.cell % GRID) - lookout[0], dy = ((e.cell / GRID) | 0) - lookout[1];
          if (dx * dx + dy * dy <= TOWER_SCORCH_TILES * TOWER_SCORCH_TILES) save.towerScorched = true;
        }
        break;
    }
  });
  let spotCatchWatch = null;

  // ---- verbs context (what the warden is allowed to reach) ----
  const zoneAcres = (() => {
    const counts = new Uint32Array(16);
    for (let i = 0; i < CELLS; i++) counts[sim.zoneId[i]]++;
    return counts;
  })();
  const ctx = {
    scene: mode,
    get grandmotherCharges() { return grandmother.charges; },
    requestGrandmother(x0, y0, x1, y1) {
      if (mode === 'rx') { say('D-16'); return false; }
      if (grandmother.charges <= 0 || grandmother.state !== 'idle') {
        if (grandmother.charges <= 0) ui.whisper([
          "grandmother's gone home. it's your mountain tonight.",
          "tanker one is rearming. you're alone up here.",
          "she'll be back for the next one. hold what you can.",
        ][tally.grandmotherUsed % 3]);
        // charges left but she's already in the air (F6 flies two): the drag was spent and the
        // player heard nothing back. Silence reads as a broken key, not as a full sky.
        else ui.whisper(grandmother.state === 'inbound'
          ? "she's still on her first run." : "she's over the drop. let her work.");
        return false;
      }
      grandmother = { ...grandmother, state: 'inbound', corridor: { x0, y0, x1, y1 },
                      ticksLeft: RETARDANT.INBOUND_TICKS };
      grandmother.charges--;
      tally.grandmotherUsed++;
      say('D-41');
      if (audio && audio.grandmother) audio.grandmother(sim.tick, sim.tick + RETARDANT.INBOUND_TICKS, { x0, y0, x1, y1 });
      return true;
    },
    cedeZone(zoneId) {
      if (!zoneId || sim.zonesCeded.has(zoneId) || mode !== 'fire') return false;
      sim.zonesCeded.add(zoneId);
      const name = ZONE_NAMES[zoneId];
      tally.cedes.push({ zoneId, name });
      ui.whisper('let ' + name + ' go.');
      if (audio && audio.setCeded) audio.setCeded(sim.zonesCeded);
      if (zoneId === 6 /* bride creek: the weaver context */) say('D-17');
      return true;
    },
    plant(x, y) {
      if (mode !== 'interlude') return false;
      const i = (y | 0) * GRID + (x | 0);
      if (sim.fuel[i] !== FUEL.SCAR || bitGet(save.planted, i)) return false;
      if (satchel <= 0) {
        // 40 seedlings against 5,000 acres is I4's authored inadequacy — but an empty satchel
        // that fails silently just reads as a broken verb. The trowel scuffs; nothing plants.
        if (audio) audio.ui('scuff');
        return false;
      }
      bitSet(save.planted, i);
      sim.regrow[i] = Math.max(sim.regrow[i], 1);
      satchel--;
      tally.planted++;
      if (audio) audio.ui('plant');
      if (tally.planted % 10 === 0 && audio) audio.ui('plantBird');
      return true;
    },
  };
  let satchel = mode === 'interlude' && opts.interludeIdx > 0 ? CEREMONY.INTERLUDE_SATCHEL : 0;
  // I0 is a 30 s walk with no satchel (season §13.1): black comes back is the beat, not the
  // verb. The old flat 90 s left the player standing in an empty dawn for a minute.
  const interludeTicks = mode === 'interlude' && (opts.interludeIdx | 0) === 0
    ? I0_TICKS : CEREMONY.INTERLUDE_TICKS;

  // ---- retardant "held" watch. One watch PER curtain: F6 flies two tankers, and a single
  // slot meant the second drop erased the first curtain's pending liturgy. ----
  const heldWatches = [];
  function armHeldWatch(cells) {
    let extinguishedNear = 0;
    const cellSet = new Set(cells);
    const until = sim.tick + RETARDANT.HELD_WINDOW_S * 30;
    // returns true when the watch is spent (fired or timed out) and should be dropped
    heldWatches.push((e) => {
      if (sim.tick > until) return true;
      if (e.type !== 'cellBurnout') return false;
      for (const d of [1, -1, GRID, -GRID, GRID + 1, GRID - 1, -GRID + 1, -GRID - 1])
        if (cellSet.has(e.cell + d)) { extinguishedNear++; break; }
      if (extinguishedNear >= RETARDANT.HELD_MIN_EXTINGUISH) {
        ui.liturgy('RETARDANT LINE HELD.');
        if (audio) audio.chord('retardantHeld');
        say('D-42');
        return true;
      }
      return false;
    });
  }
  sim.onEvent((e) => {
    for (let k = heldWatches.length - 1; k >= 0; k--) if (heldWatches[k](e)) heldWatches.splice(k, 1);
  });

  // ---- close scheduling. The scene tears down the instant onClose fires, so any book that
  // closes on the dispatcher's cue has to wait for her to finish typing AND holding the line
  // (radio.state() === null). The cap is the escape hatch — a jammed line never eats the game.
  let closed = false, closeTimer = -1, interludeTick = 0;
  let closeReason = null, closeCapTick = 0;
  function requestClose(reason, capTicks = CLOSE_CAP_TICKS) {
    if (closed || closeReason) return;
    closeReason = reason;
    closeCapTick = sim.tick + capTicks;
  }

  // ---- session tick ----
  function tick(input) {
    if (closed) return;
    // grandmother inbound
    if (grandmother.state === 'inbound') {
      if (--grandmother.ticksLeft <= 0) {
        grandmother.state = 'dropping';
        grandmother.dropTicks = RETARDANT.SWEEP_TICKS;
        const c = grandmother.corridor;
        const cells = sim.dropRetardant(c.x0, c.y0, c.x1, c.y1);
        armHeldWatch(cells);
        camera.addTrauma(DROP_TRAUMA);
      }
    } else if (grandmother.state === 'dropping') {
      if (--grandmother.dropTicks <= 0) grandmother.state = 'idle';
    }

    warden.tick(input, ctx);
    sim.simTick();
    if (director) director.tick();
    radio.tick();
    // per-cell cut audio + tally (warden has no per-cell callback; poll the metrics delta)
    const cutsNow = warden.metrics().cellsCut || 0;
    if (cutsNow > lastCuts) {
      tally.lineCellsCut += cutsNow - lastCuts;
      if (audio && audio.cutTick) {
        // baseFuel, not fuel: cutLineCell already turned this cell to SOIL, so the live array
        // reports fuel 0 for every bite and the whole per-fuel BITE table went unheard.
        const p = warden.pos(), ci = (p.y | 0) * GRID + (p.x | 0);
        audio.cutTick({ fuel: sim.baseFuel[ci], dragSpeed01: Math.min(1, (warden.verb().cutSpeed || 0) / 3.5), x: p.x, y: p.y });
      }
      lastCuts = cutsNow;
    }

    // trauma sources that are STATES, not events (verbs §10.1). Neither needs a cap in code:
    // camera trauma decays 1.2/s, so a 0.05/s cut drip equilibrates near 0.04 and a 0.10/s
    // burning-ground drip near 0.08 — both well under the source cap of 0.15. Cutting rumble
    // is effort, and it must never obscure the line being cut.
    const v = warden.verb();
    if (v.mode === 'cut') {
      const p = warden.pos(), bf = sim.baseFuel[(p.y | 0) * GRID + (p.x | 0)];
      if (bf === FUEL.BRUSH || bf === FUEL.SLASH) camera.addTrauma(CUT_TRAUMA_PER_S * DT);
    }
    if (warden.metrics().burningGround) camera.addTrauma(WARDEN.BURNING_TRAUMA_PER_S * DT);

    // toast lifetimes (1.2 s hold + fade handled by renderer via born tick)
    ui.toasts = ui.toasts.filter(t => sim.tick - t.born < 60);
    if (ui.logLine && sim.tick - ui.logLine.born > 300) ui.logLine = null;

    // interlude clock: diegetic dawn → the truck (90 s; I0 runs 30 s)
    if (mode === 'interlude') {
      interludeTick++;
      const k = opts.interludeIdx | 0;
      if (k > 0 && interludeTick === interludeTicks - 300) say('D-19'); // 10 s out: truck's leaving
      if (k === 6 && interludeTick === 55 * TICK_HZ) say('D-47');       // look up. that's not ash.
      // leave early at the truck (§13.1) — armed only once you've actually walked off it, or
      // an AFK dawn would end at 20 s and take I6's first snow with it.
      if (interludeTick > LEAVE_MIN_TICKS && !closeReason) {
        const p = warden.pos(), d = Math.hypot(p.x - spawn.x, p.y - spawn.y);
        if (d > LEAVE_ARM_TILES) truckArmed = true;
        else if (truckArmed && d <= LEAVE_TILES) closeInterlude();
      }
      if (interludeTick >= interludeTicks) closeInterlude();
    }

    // epilogue: one verb, three pips, the book at the top of the Grade (season §19)
    if (mode === 'epilogue') epilogueTick();

    // fire close: the director owns the book (weather end + quiet, or hard durationT)
    if (mode === 'fire' && director && closeTimer < 0 && director.state().closed)
      closeTimer = sim.tick + 90; // 3 s of quiet before the ledger
    if (closeTimer > 0 && sim.tick >= closeTimer) requestClose('out');

    // rx close: the unit gets its 3:30, then the stamp. Her verdict on it (D-30 / D-18) is the
    // only feedback the session gives, so it is spoken here and the close waits it out.
    if (mode === 'rx' && sim.tick >= 210 * 30 && !closeReason) {
      rxStamp = buildRxStamp(sim, opts.rxUnit, preState);
      if (rxStamp.radioId) say(rxStamp.radioId);
      requestClose('rxDone');
    }

    // the close itself: only when she has stopped talking (or the cap says go)
    if (closeReason && (radio.state() === null || sim.tick >= closeCapTick)) closeSession(closeReason);
  }

  // ---- interlude close: I4's letter is the season's inversion and it plays AT THE TRUCK
  // (season §13.1) — she reads it to you as you leave, so the close waits out the longest
  // line in the book (~170 chars ≈ 13 s of typing + hold).
  let truckArmed = false;
  function closeInterlude() {
    if (closeReason) return;
    if ((opts.interludeIdx | 0) === 4) { say('D-15'); requestClose('truck', CLOSE_CAP_LONG_TICKS); }
    else requestClose('truck');
  }

  // ---- the spring epilogue (season §19). Three optional proximity pips, no markers: the
  // mountain doesn't point at things. Preacher's Knob is the third pip and it is SILENT —
  // green, mown, doves, and no line at all. The restraint is the beat; do not fill it.
  const pips = { cedar: false, larder: false, knob: false, catwalk: false };
  // The Larder's rim, boxed once at session start: the basin is its own walkable island, so
  // "at the Larder" can only ever mean standing on the ridge above it and listening. One
  // rectangle keeps the pip O(1) a tick instead of a 4,000-cell distance query.
  const larderBox = mode === 'epilogue' ? (() => {
    let x0 = GRID, y0 = GRID, x1 = -1, y1 = -1;
    for (let i = 0; i < CELLS; i++) {
      if (sim.zoneId[i] !== ZONE.LARDER) continue;
      const x = i % GRID, y = (i / GRID) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  })() : null;
  function epilogueTick() {
    const p = warden.pos();
    const lm = mapData.landmarks;
    const near = (pt, r) => Math.hypot(p.x - pt[0], p.y - pt[1]) <= r;
    const z = sim.zoneId[(p.y | 0) * GRID + (p.x | 0)];
    // the Hundredyear black: the cedar is the only coordinate the season authors for it
    if (!pips.cedar && near(lm.hundredyearCedar, CEDAR_TILES)) { pips.cedar = true; say('D-49'); }
    if (!pips.larder && larderBox) { // the overlook: chorus peak of the whole game
      const d = Math.hypot(Math.max(larderBox.x0 - p.x, 0, p.x - larderBox.x1),
                           Math.max(larderBox.y0 - p.y, 0, p.y - larderBox.y1));
      if (d <= LARDER_TILES) { pips.larder = true; say('D-50'); }
    }
    if (!pips.knob && z === ZONE.PREACHERS_KNOB) pips.knob = true;              // no line: §19
    if (!pips.catwalk && near(lm.lookout, CATWALK_TILES)) { pips.catwalk = true; say('D-51'); }
    if (closeReason) return;
    // the logbook lies open at the Lookout door: reaching it closes the book. The cap is the
    // soft ~3 min — a worker checking her ground, one last entry, out.
    if ((sim.tick >= EPILOGUE_MIN_TICKS && near(lm.lookout, BOOK_TILES)) || sim.tick >= EPILOGUE_CAP_TICKS) {
      say('D-52'); // the last words in the game; the long cap lets D-51 clear ahead of it
      requestClose('book', CLOSE_CAP_LONG_TICKS);
    }
  }

  let rxStamp = null;
  function closeSession(reason) {
    if (closed) return;
    closed = true;
    let result = { mode, reason };
    if (mode === 'fire') {
      const ledger = buildLedger(sim, fire, {
        preState,
        lineCells: tally.lineCellsCut,
        // zoneId rides along: the ledger reaches the authored epitaph through it, not the name
        sacrifices: tally.cedes.map(c => ({ name: c.name, zoneId: c.zoneId })),
        towerScorched: save.towerScorched,
      });
      harvestFire(sim, save, ordinal, completedBefore);
      result = { ...result, ledger, ordinal };
    } else if (mode === 'rx') {
      const u = opts.rxUnit;
      const stampRes = rxStamp || buildRxStamp(sim, u, preState); // already built + spoken at the close request
      harvestFire(sim, save, 8 + rxIdx, completedBefore); // save model: rx = 8+idx
      result = { ...result, stamped: stampRes.stamped, stamp: stampRes, unit: u };
    } else if (mode === 'interlude') {
      result = { ...result, planted: tally.planted };
    }
    onClose(result);
  }

  return {
    sim, warden, camera, radio, ui,
    tick,
    get grandmother() { return grandmother; },
    get satchel() { return satchel; },
    get interludeT01() { return mode === 'interlude' ? interludeTick / interludeTicks : 0; },
    get mode() { return mode; },
    get fire() { return fire; },
    forceClose: closeSession,
    view(mouse) { // assembled for the renderer each frame
      const rl = radio.state(); // she paces herself: 18 cps + 4 s hold, sized to the line
      return {
        camera, warden: { pos: warden.pos(), vel: warden.vel(), verb: warden.verb(), facing: warden.facing() },
        scene: mode, month: MONTH,
        phase: fire && fire.night ? 'NIGHT' : 'DAY',
        duskT01: mode === 'interlude' ? Math.max(0, (interludeTick / interludeTicks - 0.66) * 3) : 0,
        fuelLens: ui.fuelLens && save.sawTwist,
        toasts: ui.toasts.map(t => ({ text: t.text, register: t.register, t01: (sim.tick - t.born) / 60 })),
        radioLine: rl ? { text: rl.text, t01: rl.t01 } : null,
        logLine: ui.logLine ? { text: ui.logLine.text, t01: (sim.tick - ui.logLine.born) / 300 } : null,
        cursor: mouse,
        grandmother: grandmother.state === 'idle' ? null : {
          state: grandmother.state, corridor: grandmother.corridor,
          t01: grandmother.state === 'inbound' ? 1 - grandmother.ticksLeft / RETARDANT.INBOUND_TICKS
              : 1 - grandmother.dropTicks / RETARDANT.SWEEP_TICKS,
        },
        cedeRing: warden.verb().mode === 'cede' ? { t01: warden.verb().cedeT01 } : null,
        satchel, interludeT01: this ? undefined : 0,
      };
    },
  };
}
