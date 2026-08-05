// FINALE — WAVE SCRIPTS. This file is DATA. It owns no clock, no timers, no update loop.
//
// The director owns the bar clock. It walks `Waves.ACTS[a].waves[w].events` (pre-sorted by musical
// time), and when the clock passes an event's time it calls `Waves.spawnEvent(ev, ctx)`. Everything
// here is a transcription of SPEC-v1 §7 — the bar:beat timings, enemy counts, x positions and
// formations are AUTHORED. They are not decoration and they are not a difficulty curve you can
// re-tune by feel; they are the composition.
//
// THE ONE INVARIANT THIS FILE EXISTS TO PROTECT: `MAX_WINDOWS`. A wave may put 30 live shells on
// screen. It must NEVER open 30 fuse invitations at once, because a screen with 30 white rings has
// no white ring — it has noise. The director hands MAX_WINDOWS[act] to Fuse.setMaxConcurrent() and
// the queue does the rest. Every count below was written assuming that cap is in force.
//
// Authoring conventions used by every spawner in here:
//   delayBeats    seconds-before-first-fuse-request, expressed in BEATS so a formation transposes
//                 cleanly from 124bpm (Act I) to 150bpm (Act IV) without re-authoring.
//   staggerBeats  extra delay per index. 0.5 = one 1/8 note = the STRING's cascade spacing.
//   y             for enterHold shells: where they settle. For descend/rise movers: the height at
//                 which their window opens (matching the spec's "MORTAR ... window opens when y=260").
//   y0            birth height override. Defaults put every birth off-screen; nothing pops in.
window.Waves = (() => {
  const W = CFG.W, H = CFG.H;

  // ---------------------------------------------------------------------------------------------
  // TIME
  // ---------------------------------------------------------------------------------------------
  // The whole game is 4/4. Bar:beat is 1-indexed, beat runs 1.00–4.75 in 0.25 steps (SPEC §7).
  const BEATS_PER_BAR = 4;
  const beatSec = (bpm) => 60 / bpm;
  const barSec = (bpm) => 60 / bpm * BEATS_PER_BAR;
  const eighthSec = (bpm) => 30 / bpm;            // 1/8 note — the grid Fuse.grant() runs on
  const eventTime = (ev, bpm) => ((ev.bar - 1) * BEATS_PER_BAR + (ev.beat - 1)) * (60 / bpm);

  // ---------------------------------------------------------------------------------------------
  // SCRATCH — spawners are called on beat boundaries, not per frame, but the house rule is the
  // house rule: one reusable opts object, fully reset every time so a stale field can never leak
  // from one formation into the next.
  // ---------------------------------------------------------------------------------------------
  const _o = {};
  function opts0() {
    _o.homeX = undefined; _o.homeY = undefined; _o.delay = undefined; _o.enterT = undefined;
    _o.mv = undefined; _o.mvSpeed = undefined;
    _o.cx = undefined; _o.cy = undefined; _o.orbitR = undefined; _o.orbitW = undefined;
    _o.phase = undefined; _o.dir = undefined;
    _o.hp = undefined; _o.fuse = undefined; _o.ownerBoss = undefined;
    return _o;
  }

  const OFF = 120;          // px past the edge where a shell is born. Nothing may pop into view.
  const SIDE_STEP = 96;     // px of extra off-screen offset per side-entering shell. At WHIP's
                            // 380px/s that is ~0.25s of travel ≈ half a beat at every act tempo,
                            // so "one every 0.5 beat, alternating" comes out of geometry for free.
  const TOP_STEP = 34;      // px of birth-height stagger down a top-entering line: enough that the
                            // line arrives as a sweep rather than a slab, small enough to stay a line.
  const _pt = { x: 0, y: 0 };
  function entry(from, x, y, i, y0) {
    switch (from) {
      case 'bottom': _pt.x = x; _pt.y = (y0 !== undefined ? y0 : H + OFF) + i * TOP_STEP; break;
      case 'left':   _pt.x = -OFF - i * SIDE_STEP; _pt.y = y; break;
      case 'right':  _pt.x = W + OFF + i * SIDE_STEP; _pt.y = y; break;
      case 'none':   _pt.x = x; _pt.y = (y0 !== undefined ? y0 : y); break;
      case 'top': default: _pt.x = x; _pt.y = (y0 !== undefined ? y0 : -OFF) - i * TOP_STEP; break;
    }
    return _pt;
  }

  // A mover that descends or rises IS its own entrance — no eased approach, no birth stagger by
  // index. Its birth height is off-screen and its authored `y` is where its window opens.
  const isTravelling = (mv) => mv === 'descend' || mv === 'rise';
  const travelBirth = (a) =>
    a.y0 !== undefined ? a.y0 : (a.mv === 'rise' ? H + 40 : -40);

  const DEFAULT_DELAY_BEATS = 2;   // half a bar on screen before a shell asks for anything. A fresh
                                   // spawn is never an instant question — you always get to read it.

  // Fuse delay in seconds. Three authoring forms, in priority order:
  //   travelling mover  -> physics: how long it takes to reach the authored open height
  //   delaySec          -> literal seconds (rare; used where musical time would lie)
  //   delayBeats        -> musical (the default form)
  function delayOf(a, i, bpm, birthY) {
    const bs = beatSec(bpm);
    let d;
    if (isTravelling(a.mv) && a.mvSpeed) d = (a.y - birthY) / a.mvSpeed;
    else if (a.delaySec !== undefined) d = a.delaySec;
    else if (a.delayBeats !== undefined) d = a.delayBeats * bs;
    else d = DEFAULT_DELAY_BEATS * bs;
    const st = (a.staggerBeats !== undefined ? a.staggerBeats : 0) * bs;
    return Math.max(0.05, d + st * i);           // 0.05 floor: a window still needs one frame of warning
  }

  // Copy the shared per-shell options an author may set on any spawner.
  function common(a, i) {
    if (a.mv) _o.mv = a.mv;
    if (a.mvSpeed !== undefined) _o.mvSpeed = a.mvSpeed;
    if (a.enterT !== undefined) _o.enterT = a.enterT;
    if (a.hp !== undefined) _o.hp = a.hp;
    if (a.fuse !== undefined) _o.fuse = a.fuse;
    // 0.7 rad of phase per index de-syncs the idle breathe so a formation never pulses as one body
    _o.phase = (a.phase !== undefined ? a.phase : 0) + i * 0.7;
  }

  // =============================================================================================
  // SPAWNERS
  // =============================================================================================

  // line(type, n, x0, x1, y, stagger) — n shells evenly spaced x0..x1.
  // Index 0 sits at x0, so authoring "@ 840..440" makes the cascade run right-to-left with no extra
  // flag: the spec's `>>` / `<<` suffix is encoded in the order of the two x values.
  // `alternate:true` turns it into the WHIP form — shells stream in from alternating sides instead.
  // `y1` ramps the settle height across the line ("y 260→380").
  function line(a, c) {
    const n = a.n | 0;
    if (n <= 0) return 0;
    const bpm = c.bpm, y1 = a.y1 !== undefined ? a.y1 : a.y;
    const travelling = isTravelling(a.mv);
    let made = 0;
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) : 0;
      const hx = U.lerp(a.x0, a.x1, k);
      const hy = U.lerp(a.y, y1, k);
      let sx, sy;
      if (travelling) {
        sx = hx; sy = travelBirth(a);
      } else if (a.alternate) {
        // even index enters from the left running right, odd from the right running left
        const si = i >> 1;
        const p = entry(i & 1 ? 'right' : 'left', hx, hy, si, a.y0);
        sx = p.x; sy = p.y;
      } else {
        const p = entry(a.from || 'top', hx, hy, i, a.y0);
        sx = p.x; sy = p.y;
      }
      const o = opts0();
      o.homeX = hx; o.homeY = hy;
      common(a, i);
      if (a.alternate) { o.dir = (i & 1) ? -1 : 1; o.homeX = sx; }
      o.delay = delayOf(a, i, bpm, sy);
      if (Enemies.spawn(a.type, sx, sy, o)) made++;
    }
    return made;
  }

  // ---------------------------------------------------------------------------------------------
  // THE STRING — the game's teaching moment, its screenshot, and its most repeatable joy.
  // 7 SPARKs in a horizontal line, 96px apart, whose fuse windows open sequentially one 1/8-note
  // apart. Convert the first and the cascade travels down the line like a burning fuse.
  // ---------------------------------------------------------------------------------------------
  const STRING_N = 7;         // seven: long enough to read as a run, short enough that the whole
                              // cascade resolves inside 7/8 of a bar and stays one gesture.
  const STRING_GAP = 96;      // px. Canon (SPEC §6). Wide enough that each white ring owns its own
                              // patch of screen — this spacing IS the readability of the formation.
  const STRING_ENTER = 0.55;  // s. Fast: the line must be planted and legible BEFORE the first ring
                              // opens, or the teaching moment teaches nothing.
  const STRING_OPEN_BEATS = 2;// half a bar between "the line lands" and "the first ring opens".
  function string(a, c) {
    const bpm = c.bpm, bs = beatSec(bpm), eighth = eighthSec(bpm);
    const n = a.n !== undefined ? (a.n | 0) : STRING_N;
    const gap = a.gap !== undefined ? a.gap : STRING_GAP;
    // The spec writes the String as an x-RANGE ("@ 344..1000"). Spacing is canon at 96px, so the
    // range is honoured as a CENTRE, not as a stride — that keeps every String in the game the same
    // physical object while still letting a wave place it left, right or centre.
    const cx = (a.x0 !== undefined && a.x1 !== undefined)
      ? (a.x0 + a.x1) * 0.5
      : (a.cx !== undefined ? a.cx : W * 0.5);
    const first = cx + (a.xShift || 0) - (n - 1) * gap * 0.5;
    // Direction: explicit `dir`, else inferred from the order the x-range was written in.
    const dir = a.dir !== undefined ? a.dir
      : ((a.x0 !== undefined && a.x1 !== undefined && a.x1 < a.x0) ? -1 : 1);
    const base = (a.delayBeats !== undefined ? a.delayBeats : STRING_OPEN_BEATS) * bs;
    const from = a.from || 'top';
    // Whole line born at ONE height so it slides in as a line. No per-index birth stagger here —
    // a String that arrives crooked stops being a String.
    const by = a.y0 !== undefined ? a.y0
      : (from === 'bottom' ? H + OFF : a.y - 190);
    let made = 0;
    for (let i = 0; i < n; i++) {
      const x = first + i * gap;
      const order = dir === 1 ? i : (n - 1 - i);
      const o = opts0();
      o.homeX = x; o.homeY = a.y;
      o.enterT = a.enterT !== undefined ? a.enterT : STRING_ENTER;
      o.phase = i * 0.55;
      o.delay = base + order * eighth;           // <- THE cascade. One 1/8 note per shell.
      if (Enemies.spawn(a.type || 'SPARK', x, by, o)) made++;
    }
    return made;
  }

  // arc(type, n, side, y, amp) — shells stream in from an edge and settle onto a sine curve.
  // amp > 0 bulges up (an arc), amp < 0 bulges down (a V). Index 0 is always the shell nearest the
  // entry edge, so a `<<` arc from the right staggers outward from the right as written.
  function arc(a, c) {
    const n = a.n | 0;
    if (n <= 0) return 0;
    const bpm = c.bpm;
    const side = a.side || 'top';
    const amp = a.amp !== undefined ? a.amp : 60;
    const x0 = a.x0 !== undefined ? a.x0 : 200;
    const x1 = a.x1 !== undefined ? a.x1 : W - 200;
    let made = 0;
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) : 0.5;
      const hx = side === 'right' ? U.lerp(x1, x0, k) : U.lerp(x0, x1, k);
      const hy = a.y - U.fsin(k * Math.PI) * amp;
      const p = entry(side, hx, hy, i, a.y0);
      const o = opts0();
      o.homeX = hx; o.homeY = hy;
      common(a, i);
      o.delay = delayOf(a, i, bpm, p.y);
      if (Enemies.spawn(a.type, p.x, p.y, o)) made++;
    }
    return made;
  }

  // grid(type, cols, rows, x0, y0, dx, dy) — the HORNET box and the SPARKs in its safe lanes.
  function grid(a, c) {
    const cols = a.cols | 0, rows = a.rows | 0;
    if (cols <= 0 || rows <= 0) return 0;
    const bpm = c.bpm;
    const travelling = isTravelling(a.mv);
    let made = 0, i = 0;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++, i++) {
        const hx = a.x0 + col * a.dx, hy = a.y0 + r * a.dy;
        let sx, sy;
        if (travelling) { sx = hx; sy = travelBirth(a); }
        else { const p = entry(a.from || 'top', hx, hy, r, a.birthY0); sx = p.x; sy = p.y; }
        const o = opts0();
        o.homeX = hx; o.homeY = hy;
        common(a, i);
        // travelling grids read their open-height off the row they were authored on
        o.delay = travelling ? Math.max(0.05, (hy - sy) / a.mvSpeed) : delayOf(a, i, bpm, sy);
        if (Enemies.spawn(a.type, sx, sy, o)) made++;
      }
    }
    return made;
  }

  // ring(type, n, cx, cy, r) — n shells on a circle of radius r about (cx,cy).
  // LANTERNs default to orbiting their own station (their auras sweep, so the shielded pocket in the
  // middle breathes); everything else stands still, which is what a DRUM pentagon wants.
  function ring(a, c) {
    const n = a.n | 0;
    if (n <= 0) return 0;
    const bpm = c.bpm;
    const orbit = a.orbit !== undefined ? a.orbit : (a.type === 'LANTERN');
    const r = a.r !== undefined ? a.r : 200;
    const p0 = a.phase0 !== undefined ? a.phase0 : -Math.PI / 2;   // start at 12 o'clock: rings read
                                                                   // as rings when they have a top
    let made = 0;
    for (let i = 0; i < n; i++) {
      const ang = p0 + i / n * U.TAU;
      const hx = a.cx + U.fcos(ang) * r, hy = a.cy + U.fsin(ang) * r * 0.72;  // 0.72: the play field
                                                                             // is 16:9, a true circle
                                                                             // wastes the width
      const o = opts0();
      if (orbit) {
        o.cx = hx; o.cy = hy;
        o.orbitR = a.orbitR !== undefined ? a.orbitR : 70;
        o.orbitW = a.orbitW !== undefined ? a.orbitW : 40;         // deg/s
        o.phase = ang;
        o.homeX = hx; o.homeY = hy;
        _o.mv = 'orbit';
      } else {
        o.homeX = hx; o.homeY = hy;
        common(a, i);
      }
      o.delay = delayOf(a, i, bpm, hy);
      if (Enemies.spawn(a.type, hx, hy, o)) made++;
    }
    return made;
  }

  // single(type, x, y, opts) — one shell. Orbiters ignore entry: their orbit IS the entrance.
  function single(a, c) {
    const bpm = c.bpm;
    const travelling = isTravelling(a.mv);
    const o = opts0();
    let sx = a.x, sy = a.y;
    if (a.orbit) {
      o.cx = a.cx !== undefined ? a.cx : a.x;
      o.cy = a.cy !== undefined ? a.cy : a.y;
      o.orbitR = a.orbitR !== undefined ? a.orbitR : 70;
      o.orbitW = a.orbitW !== undefined ? a.orbitW : 40;
      o.phase = a.phase !== undefined ? a.phase : 0;
      o.mv = 'orbit';
      o.homeX = a.x; o.homeY = a.y;
    } else if (travelling) {
      sy = travelBirth(a);
      o.homeX = a.x; o.homeY = a.y;
      common(a, 0);
    } else {
      const p = entry(a.from || 'top', a.x, a.y, 0, a.y0);
      sx = p.x; sy = p.y;
      o.homeX = a.x; o.homeY = a.y;
      common(a, 0);
    }
    o.delay = delayOf(a, 0, bpm, sy);
    return Enemies.spawn(a.type, sx, sy, o) ? 1 : 0;
  }

  // rain(type, n, overBars, xMin, xMax) — staggered top-entry (or bottom, for CROWD FLARES).
  // The director fires this ONCE; the spread over time is baked into the birth positions and the
  // per-shell settle time, so a "rain" costs exactly one event and no scheduler state.
  function rain(a, c) {
    const n = a.n | 0;
    if (n <= 0) return 0;
    const bpm = c.bpm, bs = beatSec(bpm);
    const over = (a.overBars !== undefined ? a.overBars : 4) * barSec(bpm);
    const xMin = a.xMin !== undefined ? a.xMin : 160;
    const xMax = a.xMax !== undefined ? a.xMax : W - 160;
    const fromBottom = a.from === 'bottom';
    const travelling = isTravelling(a.mv);
    const spd = a.mvSpeed !== undefined ? Math.abs(a.mvSpeed) : 0;
    let made = 0;
    for (let i = 0; i < n; i++) {
      const f = n > 1 ? i / (n - 1) : 0;
      // sine sweep (SPEC 2-2 "entering from top in a sine sweep") vs even spread with a small
      // deterministic jitter. Jitter uses the GAMEPLAY stream so a seeded run still reproduces.
      const hx = a.sweep
        ? W * 0.5 + U.fsin(f * Math.PI * 1.75) * (xMax - xMin) * 0.5
        : U.clamp(U.lerp(xMin, xMax, (i + 0.5) / n) + U.rngRun.range(-26, 26), 40, W - 40);
      const hy = a.y !== undefined ? a.y : (fromBottom ? 420 : U.lerp(170, 330, f));
      const tOff = f * over;                     // this shell's share of the rain's duration
      let sx = hx, sy;
      if (travelling && spd) {
        // spatial stagger: born further out, so the movement itself spaces them in time
        sy = (fromBottom ? H + 40 : -40) + (fromBottom ? 1 : -1) * tOff * spd;
      } else {
        sy = fromBottom ? H + OFF : -OFF;
      }
      const o = opts0();
      o.homeX = hx; o.homeY = hy;
      common(a, i);
      // stagger the settle as well as the birth, so late shells are still visibly arriving
      if (!travelling) o.enterT = (a.enterT !== undefined ? a.enterT : 0.6) + tOff * 0.55;
      o.delay = Math.max(0.05,
        (a.delayBeats !== undefined ? a.delayBeats : DEFAULT_DELAY_BEATS) * bs
        + tOff
        + (a.staggerBeats !== undefined ? a.staggerBeats : 0) * bs * i);
      if (Enemies.spawn(a.type, sx, sy, o)) made++;
    }
    return made;
  }

  // ---------------------------------------------------------------------------------------------
  // DRIZZLE — Act III "GOLD RAIN". Ambient bullet curtain, not enemies.
  // This spawner does NOT spawn. It returns a descriptor the director ticks, because a curtain is a
  // RATE, not an event: 6 bullets/s for sixteen bars is one descriptor, not 3000 scheduled spawns.
  // One module-scope object, so "18:1 drizzle ramps to 14 b/s" is a mutation of the running curtain
  // rather than a second curtain layered on top of the first.
  // ---------------------------------------------------------------------------------------------
  const DRIZZLE = {
    active: false,
    rate: 0,        // bullets/second
    speed: 110,     // px/s downward. Slow: the lesson of GOLD RAIN is that a DRUM's blue ring cuts
                    // visible HOLES in the curtain, and you cannot see a hole in a fast curtain.
    acc: 0,
    xMin: 20, xMax: W - 20,
    y: -20,         // spec: "from y=-20"
  };
  // preallocated spawn opts for a drizzle bullet: standard lethal circle, culled by bounds
  const DZ_OPTS = { r: 7, dmg: 1, life: 0, beh: Pool.B.LINEAR, flags: 0, pierce: 1 };

  function drizzle(a) {
    DRIZZLE.rate = a.rate !== undefined ? a.rate : 0;
    DRIZZLE.speed = a.speed !== undefined ? a.speed : 110;
    DRIZZLE.active = DRIZZLE.rate > 0;
    if (a.xMin !== undefined) DRIZZLE.xMin = a.xMin;
    if (a.xMax !== undefined) DRIZZLE.xMax = a.xMax;
    return DRIZZLE;                                // the director ticks this; we never spawn here
  }
  function resetDrizzle() {
    DRIZZLE.active = false; DRIZZLE.rate = 0; DRIZZLE.acc = 0;
    DRIZZLE.speed = 110; DRIZZLE.xMin = 20; DRIZZLE.xMax = W - 20;
  }
  // Optional convenience for the director. Zero allocation, safe to call every frame.
  function tickDrizzle(dt, bul) {
    if (!DRIZZLE.active || !bul) return 0;
    DRIZZLE.acc += DRIZZLE.rate * dt;
    let made = 0;
    while (DRIZZLE.acc >= 1) {
      DRIZZLE.acc -= 1;
      const x = U.rngRun.range(DRIZZLE.xMin, DRIZZLE.xMax);
      // +-14px/s of lateral drift so a curtain reads as weather, never as a barcode
      const vx = U.rngRun.range(-14, 14);
      if (bul.spawn(x, DRIZZLE.y, vx, DRIZZLE.speed, Pool.T.CIRCLE, Pool.FACTION.ENEMY, DZ_OPTS) >= 0) made++;
    }
    return made;
  }

  const SPAWNERS = { line, string, arc, grid, ring, single, rain, drizzle };

  function spawnEvent(ev, c) {
    if (!ev) return 0;
    const fn = SPAWNERS[ev.fn];
    if (!fn) return 0;
    return fn(ev.args, c || DEFAULT_CTX);
  }
  const DEFAULT_CTX = { act: 0, bpm: 124 };

  // =============================================================================================
  // THE WEIGHTED BAG — continuous spawner (SPEC 3-3, 4-1..4-3, and every RALLY).
  // "every 1/8 note, if aliveCount < target, spawn `rate` shells from the bag."
  // Weights are flattened to a cumulative table at boot so picking never allocates.
  // =============================================================================================
  function prepBag(b) {
    if (!b || !b.weights) return b;
    const names = [], cum = [];
    let acc = 0;
    for (const k in b.weights) { acc += b.weights[k]; names.push(k); cum.push(acc); }
    b.names = names; b.cum = cum; b.total = acc;
    return b;
  }
  function bagPick(bag) {
    if (!bag || !bag.names || bag.names.length === 0) return 'SPARK';
    const r = U.rngRun.next() * bag.total;
    const cum = bag.cum;
    for (let i = 0; i < cum.length; i++) if (r <= cum[i]) return bag.names[i];
    return bag.names[bag.names.length - 1];
  }
  // Spawn one shell from the bag at a type-appropriate entry. Deterministic (rngRun).
  function bagSpawn(bag, c) {
    const name = bagPick(bag);
    const bs = beatSec((c && c.bpm) || 124);
    const o = opts0();
    let sx, sy;
    switch (name) {
      case 'MORTAR': {
        const x = U.rngRun.range(220, W - 220);
        sx = x; sy = -40;
        o.homeX = x; o.homeY = 260; o.mv = 'descend'; o.mvSpeed = 70;
        o.delay = (260 + 40) / 70;                 // window opens at y=260, exactly as scripted mortars do
        break;
      }
      case 'CROSSETTE': {
        const x = U.rngRun.range(180, W - 180);
        sx = x; sy = -40;
        o.homeX = x; o.homeY = 150; o.mv = 'descend'; o.mvSpeed = 70;
        o.delay = (150 + 40) / 70;
        break;
      }
      case 'LANTERN': {
        const cx = U.rngRun.range(240, W - 240), cy = U.rngRun.range(170, 300);
        o.cx = cx; o.cy = cy; o.orbitR = 70; o.orbitW = U.rngRun.sign() * 34;
        o.phase = U.rngRun.range(0, U.TAU); o.mv = 'orbit';
        o.homeX = cx; o.homeY = cy;
        sx = cx + 70; sy = cy;
        o.delay = 1;                                // LANTERN has no window; harmless placeholder
        break;
      }
      case 'WHIP': {
        const rightward = U.rngRun.next() < 0.5;
        const y = U.rngRun.range(250, 400);
        sx = rightward ? -OFF : W + OFF; sy = y;
        o.homeX = sx; o.homeY = y; o.dir = rightward ? 1 : -1;
        o.delay = bs;                               // one beat: a strafer must cross into view first
        break;
      }
      case 'HORNET': {
        const x = U.rngRun.range(200, W - 200), y = U.rngRun.range(150, 250);
        sx = x; sy = -OFF;
        o.homeX = x; o.homeY = y;
        o.delay = bs * 2;                           // amber must always telegraph before it exists
        break;
      }
      default: {                                    // SPARK, CANDLE, DRUM, FLARE
        const x = U.rngRun.range(140, W - 140), y = U.rngRun.range(140, 330);
        sx = x; sy = -OFF;
        o.homeX = x; o.homeY = y;
        o.enterT = 0.7;
        o.delay = bs * (1.5 + U.rngRun.range(0, 0.5));  // jitter so a bag never machine-guns the grid
        break;
      }
    }
    return Enemies.spawn(name, sx, sy, o);
  }

  // =============================================================================================
  // ACT I — THE PIER · 124 BPM (beat 0.4839s, bar 1.9355s) · boss ROMAN CANDLE
  // =============================================================================================
  const ev = (bar, beat, fn, args) => ({ bar, beat, fn, args });

  const W1_1 = {
    name: 'SOUNDCHECK',
    bars: 16,                                       // 31.0s at 124bpm
    // Teaches, in order: the window, the colour law, the String. Nothing else happens in this wave
    // and nothing else is allowed to.
    events: [
      ev(1, 1, 'line', { type: 'SPARK', n: 5, x0: 440, x1: 840, y: 170, enterT: 0.8, delayBeats: 4, staggerBeats: 0.5 }),
      ev(3, 1, 'line', { type: 'SPARK', n: 5, x0: 840, x1: 440, y: 170, enterT: 0.8, delayBeats: 4, staggerBeats: 0.5 }),
      // the two metronomes: 6 windows each, one per beat, bars 5-7
      ev(5, 1, 'single', { type: 'CANDLE', x: 320, y: 150, delayBeats: 1 }),
      ev(5, 1, 'single', { type: 'CANDLE', x: 960, y: 150, delayBeats: 1 }),
      ev(6, 1, 'arc', { type: 'SPARK', n: 8, side: 'left', y: 230, amp: 60, delayBeats: 2, staggerBeats: 0.5 }),
      ev(8, 1, 'arc', { type: 'SPARK', n: 8, side: 'right', y: 230, amp: 60, delayBeats: 2, staggerBeats: 0.5 }),
      // first DRUM: 24 petals, window opens 9:3. The gun does 54 of its 80hp — you must feed it.
      ev(9, 1, 'single', { type: 'DRUM', x: 640, y: 150, delayBeats: 2 }),
      ev(11, 1, 'line', { type: 'WHIP', n: 6, x0: 60, x1: 1220, y: 300, alternate: true, delayBeats: 1, staggerBeats: 0.5 }),
      // THE STRING, both directions. This is the wave's whole reason to exist.
      ev(13, 1, 'string', { x0: 344, x1: 1000, y: 190, dir: 1 }),
      ev(14, 3, 'string', { x0: 1000, x1: 344, y: 250, dir: -1 }),
      // the button: two DRUMs and six SPARKs, all fusing together on 16:3
      ev(16, 1, 'single', { type: 'DRUM', x: 400, y: 160, delayBeats: 2 }),
      ev(16, 1, 'single', { type: 'DRUM', x: 880, y: 160, delayBeats: 2 }),
      ev(16, 1, 'line', { type: 'SPARK', n: 6, x0: 470, x1: 810, y: 220, delayBeats: 2, staggerBeats: 0 }),
    ],
    bag: null,
  };

  const W1_2 = {
    name: 'THE LAMPS',
    bars: 18,                                       // 34.8s
    // Introduces LANTERN: its 96px aura eats the peashooter, so the SPARKs standing inside it can
    // ONLY be reached with petals. The teacher wave.
    events: [
      ev(1, 1, 'single', { type: 'LANTERN', x: 500, y: 200, orbit: true, orbitR: 70, orbitW: 40, phase: 0 }),
      ev(1, 1, 'single', { type: 'LANTERN', x: 780, y: 200, orbit: true, orbitR: 70, orbitW: 40, phase: 3.14159 }),
      ev(1, 1, 'line', { type: 'SPARK', n: 6, x0: 460, x1: 820, y: 200, delayBeats: 3, staggerBeats: 0.5 }),
      ev(4, 1, 'line', { type: 'CROSSETTE', n: 3, x0: 380, x1: 900, y: 120, mv: 'descend', mvSpeed: 60, staggerBeats: 0.5 }),
      ev(6, 1, 'string', { x0: 300, x1: 980, y: 210, dir: 1 }),
      ev(7, 3, 'single', { type: 'LANTERN', x: 420, y: 180, orbit: true, orbitR: 80, orbitW: 40 }),
      ev(7, 3, 'single', { type: 'LANTERN', x: 860, y: 180, orbit: true, orbitR: 80, orbitW: -40 }),
      ev(7, 3, 'single', { type: 'DRUM', x: 640, y: 170, delayBeats: 3 }),
      ev(10, 1, 'line', { type: 'WHIP', n: 10, x0: 60, x1: 1220, y: 260, y1: 380, alternate: true, delayBeats: 1, staggerBeats: 0.5 }),
      ev(12, 1, 'single', { type: 'CANDLE', x: 250, y: 140, delayBeats: 1 }),
      ev(12, 1, 'single', { type: 'CANDLE', x: 640, y: 120, delayBeats: 1 }),
      ev(12, 1, 'single', { type: 'CANDLE', x: 1030, y: 140, delayBeats: 1 }),
      // first MORTAR of the run. 1.60s window, opens when it reaches y=260 (spec's own wording).
      ev(14, 1, 'single', { type: 'MORTAR', x: 640, y: 260, mv: 'descend', mvSpeed: 70 }),
      // two Vs (negative amp = the arc bulges downward)
      ev(16, 1, 'arc', { type: 'SPARK', n: 6, x0: 300, x1: 600, y: 180, amp: -70, delayBeats: 2, staggerBeats: 0 }),
      ev(16, 1, 'arc', { type: 'SPARK', n: 6, x0: 680, x1: 980, y: 180, amp: -70, delayBeats: 2, staggerBeats: 0 }),
      // the exam: DRUMs standing inside auras. Gun cannot reach them; a cascade can.
      ev(18, 1, 'single', { type: 'DRUM', x: 460, y: 200, delayBeats: 2 }),
      ev(18, 1, 'single', { type: 'DRUM', x: 820, y: 200, delayBeats: 2 }),
      ev(18, 1, 'single', { type: 'LANTERN', x: 460, y: 200, orbit: true, orbitR: 74, orbitW: 40 }),
      ev(18, 1, 'single', { type: 'LANTERN', x: 820, y: 200, orbit: true, orbitR: 74, orbitW: -40 }),
    ],
    bag: null,
  };

  const W1_3 = {
    name: 'PIERWORKS',
    bars: 16,                                       // 31.0s. First real density (~450 bullets peak).
    events: [
      // overBars IS the stagger for a rain (spec: "staggered 0.25 beat" == 10 shells across 2 bars);
      // adding staggerBeats on top would double-count it into a 6-second drip.
      ev(1, 1, 'rain', { type: 'SPARK', n: 10, overBars: 2, xMin: 180, xMax: 1100, delayBeats: 2 }),
      // first amber. Beams cannot be converted — this is the honest-dodge floor under the mechanic.
      ev(3, 1, 'single', { type: 'HORNET', x: 300, y: 180, delayBeats: 2 }),
      ev(3, 1, 'single', { type: 'HORNET', x: 980, y: 180, delayBeats: 2 }),
      ev(4, 1, 'string', { y: 170, dir: 1 }),
      ev(5, 1, 'string', { y: 250, dir: -1 }),
      ev(7, 1, 'single', { type: 'DRUM', x: 380, y: 150, delayBeats: 2 }),
      ev(7, 1, 'single', { type: 'DRUM', x: 640, y: 190, delayBeats: 2 }),
      ev(7, 1, 'single', { type: 'DRUM', x: 900, y: 150, delayBeats: 2 }),
      ev(9, 1, 'line', { type: 'CROSSETTE', n: 6, x0: 240, x1: 1040, y: 130, mv: 'descend', mvSpeed: 70, staggerBeats: 0.5 }),
      ev(11, 1, 'line', { type: 'WHIP', n: 12, x0: 60, x1: 1220, y: 280, y1: 390, alternate: true, delayBeats: 1, staggerBeats: 0.5 }),
      ev(11, 1, 'single', { type: 'CANDLE', x: 200, y: 140, delayBeats: 1 }),
      ev(11, 1, 'single', { type: 'CANDLE', x: 1080, y: 140, delayBeats: 1 }),
      ev(14, 1, 'single', { type: 'MORTAR', x: 440, y: 270, mv: 'descend', mvSpeed: 70 }),
      ev(14, 1, 'single', { type: 'MORTAR', x: 840, y: 270, mv: 'descend', mvSpeed: 70 }),
      ev(14, 1, 'line', { type: 'SPARK', n: 8, x0: 300, x1: 980, y: 210, delayBeats: 3, staggerBeats: 0.25 }),
    ],
    bag: null,
  };

  // =============================================================================================
  // ACT II — THE CRANE YARD · 132 BPM (beat 0.4545s, bar 1.818s) · boss CATHERINE
  // =============================================================================================
  const W2_1 = {
    name: 'SCAFFOLD',
    bars: 16,                                       // 29.1s
    events: [
      ev(1, 1, 'line', { type: 'WHIP', n: 8, x0: 60, x1: 1220, y: 340, alternate: true, mvSpeed: 420, delayBeats: 1, staggerBeats: 0.5 }),
      ev(2, 1, 'line', { type: 'CANDLE', n: 4, x0: 200, x1: 1080, y: 130, delayBeats: 1, staggerBeats: 1 }),
      // two Strings a half-bar apart, running opposite ways: they interleave into an X.
      // The second is shifted half a gap so the two lines read as 14 shells, not 7 doubled ones.
      ev(5, 1, 'string', { y: 200, dir: 1 }),
      ev(5, 3, 'string', { y: 200, dir: -1, xShift: 48 }),
      ev(7, 1, 'single', { type: 'LANTERN', x: 400, y: 220, orbit: true, orbitR: 76, orbitW: 40 }),
      ev(7, 1, 'single', { type: 'LANTERN', x: 640, y: 180, orbit: true, orbitR: 76, orbitW: -40 }),
      ev(7, 1, 'single', { type: 'LANTERN', x: 880, y: 220, orbit: true, orbitR: 76, orbitW: 40 }),
      ev(7, 1, 'single', { type: 'DRUM', x: 400, y: 220, delayBeats: 3 }),
      ev(7, 1, 'single', { type: 'DRUM', x: 640, y: 180, delayBeats: 3 }),
      ev(7, 1, 'single', { type: 'DRUM', x: 880, y: 220, delayBeats: 3 }),
      ev(10, 1, 'line', { type: 'CROSSETTE', n: 8, x0: 200, x1: 1080, y: 120, mv: 'descend', mvSpeed: 80, staggerBeats: 0.25 }),
      // three amber beams make three lanes; the SPARKs are parked in the safe ones.
      ev(12, 1, 'line', { type: 'HORNET', n: 3, x0: 260, x1: 1020, y: 170, delayBeats: 2, staggerBeats: 1 }),
      ev(12, 1, 'grid', { type: 'SPARK', cols: 4, rows: 3, x0: 290, y0: 250, dx: 236, dy: 64, delayBeats: 3, staggerBeats: 0.25 }),
      ev(14, 1, 'line', { type: 'MORTAR', n: 2, x0: 420, x1: 860, y: 270, mv: 'descend', mvSpeed: 70 }),
      ev(14, 1, 'line', { type: 'WHIP', n: 8, x0: 60, x1: 1220, y: 300, y1: 390, alternate: true, delayBeats: 1, staggerBeats: 0.5 }),
      // DRUM diamond, all four fusing together: 96 petals if you take all of it.
      ev(16, 1, 'single', { type: 'DRUM', x: 640, y: 120, delayBeats: 2 }),
      ev(16, 1, 'single', { type: 'DRUM', x: 400, y: 240, delayBeats: 2 }),
      ev(16, 1, 'single', { type: 'DRUM', x: 880, y: 240, delayBeats: 2 }),
      ev(16, 1, 'single', { type: 'DRUM', x: 640, y: 360, delayBeats: 2 }),
    ],
    bag: null,
  };

  const W2_2 = {
    name: 'SPARK SHOWER',
    bars: 18,                                       // 32.7s
    events: [
      ev(1, 1, 'rain', { type: 'SPARK', n: 20, overBars: 4, xMin: 140, xMax: 1140, sweep: true, delayBeats: 2 }),
      // four overlapping auras become a WALL the gun cannot cross. Pure conversion puzzle.
      ev(5, 1, 'single', { type: 'DRUM', x: 480, y: 200, delayBeats: 3 }),
      ev(5, 1, 'single', { type: 'DRUM', x: 800, y: 200, delayBeats: 3 }),
      ev(5, 1, 'ring', { type: 'LANTERN', n: 4, cx: 640, cy: 200, r: 200, orbit: true, orbitR: 86, orbitW: 34 }),
      ev(8, 1, 'line', { type: 'CROSSETTE', n: 4, x0: 300, x1: 980, y: 150, mv: 'descend', mvSpeed: 70, staggerBeats: 0.5 }),
      ev(8, 1, 'single', { type: 'CANDLE', x: 180, y: 130, delayBeats: 1 }),
      ev(8, 1, 'single', { type: 'CANDLE', x: 1100, y: 130, delayBeats: 1 }),
      ev(8, 1, 'single', { type: 'HORNET', x: 400, y: 170, delayBeats: 2 }),
      ev(8, 1, 'single', { type: 'HORNET', x: 880, y: 170, delayBeats: 2 }),
      // three stacked Strings, all left-to-right, a half-bar apart. The cascade should fall through
      // all three — this is the wave's whole thesis and the highest-value moment in Act II.
      ev(10, 1, 'string', { y: 160, dir: 1 }),
      ev(10, 3, 'string', { y: 220, dir: 1 }),
      ev(11, 1, 'string', { y: 280, dir: 1 }),
      ev(13, 1, 'line', { type: 'MORTAR', n: 3, x0: 340, x1: 940, y: 260, mv: 'descend', mvSpeed: 70, staggerBeats: 1 }),
      ev(15, 1, 'line', { type: 'WHIP', n: 16, x0: 60, x1: 1220, y: 270, y1: 400, alternate: true, delayBeats: 1, staggerBeats: 0.5 }),
      ev(18, 1, 'line', { type: 'DRUM', n: 3, x0: 400, x1: 880, y: 190, delayBeats: 2, staggerBeats: 0 }),
      ev(18, 1, 'arc', { type: 'SPARK', n: 9, x0: 260, x1: 1020, y: 300, amp: -50, delayBeats: 3, staggerBeats: 0.25 }),
    ],
    bag: null,
  };

  const W2_3 = {
    name: 'THE YARD',
    bars: 16,                                       // 29.1s, peak ~700 bullets
    events: [
      ev(1, 1, 'line', { type: 'SPARK', n: 8, x0: 300, x1: 980, y: 190, delayBeats: 2, staggerBeats: 0.5 }),
      ev(1, 1, 'line', { type: 'WHIP', n: 4, x0: 60, x1: 1220, y: 330, alternate: true, delayBeats: 1, staggerBeats: 0.5 }),
      ev(1, 1, 'line', { type: 'CROSSETTE', n: 2, x0: 440, x1: 840, y: 150, mv: 'descend', mvSpeed: 70, staggerBeats: 0.5 }),
      // four HORNETs in a box; their beams sweep inward, shrinking the safe area
      ev(3, 1, 'grid', { type: 'HORNET', cols: 2, rows: 2, x0: 320, y0: 160, dx: 640, dy: 230, delayBeats: 2, staggerBeats: 0.5 }),
      ev(5, 1, 'grid', { type: 'DRUM', cols: 2, rows: 2, x0: 520, y0: 200, dx: 240, dy: 150, delayBeats: 2, staggerBeats: 0 }),
      ev(7, 1, 'string', { y: 200, dir: 1 }),
      ev(7, 1, 'string', { y: 200, dir: -1, xShift: 48 }),
      // six LANTERNs ringing a DRUM: the aura ring is a fence, the DRUM inside it is the prize
      ev(9, 1, 'ring', { type: 'LANTERN', n: 6, cx: 640, cy: 240, r: 200, orbit: true, orbitR: 70, orbitW: 30 }),
      ev(9, 1, 'single', { type: 'DRUM', x: 640, y: 240, delayBeats: 3 }),
      ev(12, 1, 'line', { type: 'MORTAR', n: 4, x0: 280, x1: 1000, y: 270, mv: 'descend', mvSpeed: 70, staggerBeats: 4 }),
    ],
    bag: null,
  };

  // =============================================================================================
  // ACT III — THE CLOUD DECK · 138 BPM (beat 0.4348s, bar 1.739s) · boss KAMURO
  // New idea for the act: things come from BELOW. The city is under cloud now, so the horizon is no
  // longer a wall you can put your back against.
  // =============================================================================================
  const W3_1 = {
    name: 'ABOVE THE WEATHER',
    bars: 16,                                       // 27.8s
    events: [
      ev(1, 1, 'line', { type: 'SPARK', n: 12, x0: 180, x1: 1100, y: 300, from: 'bottom', y0: 760, delayBeats: 3, staggerBeats: 0.25 }),
      ev(3, 1, 'arc', { type: 'CANDLE', n: 6, x0: 220, x1: 1060, y: 140, amp: 46, delayBeats: 1, staggerBeats: 0.5 }),
      // the String, upside down. Spec writes the birth at y=680; 760 is used instead so the line is
      // never seen materialising inside the play field — the only place this file departs from §7.
      ev(5, 1, 'string', { y: 260, y0: 760, from: 'bottom', dir: 1 }),
      ev(7, 1, 'single', { type: 'DRUM', x: 340, y: 190, delayBeats: 2 }),
      ev(7, 1, 'single', { type: 'LANTERN', x: 500, y: 210, orbit: true, orbitR: 72, orbitW: 36 }),
      ev(7, 1, 'single', { type: 'DRUM', x: 640, y: 190, delayBeats: 2 }),
      ev(7, 1, 'single', { type: 'LANTERN', x: 780, y: 210, orbit: true, orbitR: 72, orbitW: -36 }),
      ev(7, 1, 'single', { type: 'DRUM', x: 940, y: 190, delayBeats: 2 }),
      ev(7, 1, 'single', { type: 'LANTERN', x: 1090, y: 210, orbit: true, orbitR: 72, orbitW: 36 }),
      ev(9, 1, 'line', { type: 'CROSSETTE', n: 10, x0: 180, x1: 1100, y: 140, mv: 'descend', mvSpeed: 70, staggerBeats: 0.25 }),
      // amber that never stops arriving: the hornets themselves scroll down at 40px/s
      ev(11, 1, 'line', { type: 'HORNET', n: 4, x0: 200, x1: 1080, y: 150, y0: 40, mv: 'descend', mvSpeed: 40, staggerBeats: 1 }),
      // pincer: mortars falling, sparks rising
      ev(13, 1, 'line', { type: 'MORTAR', n: 3, x0: 320, x1: 960, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 1 }),
      ev(13, 1, 'line', { type: 'SPARK', n: 10, x0: 200, x1: 1080, y: 420, from: 'bottom', y0: 780, delayBeats: 3, staggerBeats: 0.25 }),
      ev(16, 1, 'ring', { type: 'DRUM', n: 5, cx: 640, cy: 240, r: 170, orbit: false, delayBeats: 2, staggerBeats: 0 }),
    ],
    bag: null,
  };

  const W3_2 = {
    name: 'GOLD RAIN',
    bars: 18,                                       // 31.3s. Slow dense curtains: readability at high count.
    events: [
      ev(1, 1, 'drizzle', { rate: 6, speed: 110 }),
      ev(2, 1, 'rain', { type: 'SPARK', n: 16, overBars: 4, xMin: 160, xMax: 1120, delayBeats: 2 }),
      // THE LESSON of this wave: four blue rings cut four visible holes in the curtain.
      ev(6, 1, 'grid', { type: 'DRUM', cols: 4, rows: 1, x0: 340, y0: 180, dx: 200, dy: 0, delayBeats: 2, staggerBeats: 0 }),
      ev(8, 1, 'ring', { type: 'LANTERN', n: 4, cx: 640, cy: 220, r: 210, orbit: true, orbitR: 78, orbitW: 30 }),
      ev(8, 1, 'line', { type: 'CROSSETTE', n: 6, x0: 240, x1: 1040, y: 150, mv: 'descend', mvSpeed: 70, staggerBeats: 0.5 }),
      ev(11, 1, 'line', { type: 'MORTAR', n: 4, x0: 260, x1: 1020, y: 260, mv: 'descend', mvSpeed: 70, staggerBeats: 4 }),
      ev(14, 1, 'string', { y: 180, dir: 1 }),
      ev(14, 1, 'string', { y: 320, dir: -1 }),
      ev(16, 1, 'grid', { type: 'HORNET', cols: 4, rows: 1, x0: 260, y0: 160, dx: 253, dy: 0, delayBeats: 2, staggerBeats: 0.5 }),
      ev(16, 1, 'line', { type: 'WHIP', n: 12, x0: 60, x1: 1220, y: 300, y1: 400, alternate: true, delayBeats: 1, staggerBeats: 0.5 }),
      // last bar: the curtain more than doubles. Nothing else changes — the pressure is the weather.
      ev(18, 1, 'drizzle', { rate: 14, speed: 110 }),
    ],
    bag: null,
  };

  const W3_3 = {
    name: 'THE DECK',
    bars: 16,                                       // 27.8s, peak ~1100 bullets
    // Continuous pressure from bar 1, punctuated by three scripted interrupts. The bag keeps 14-20
    // shells alive; MAX_WINDOWS[2] = 8 is what stops that from becoming 20 simultaneous questions.
    events: [
      ev(5, 1, 'line', { type: 'MORTAR', n: 5, x0: 220, x1: 1060, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 0 }),
      // three Strings a half-BEAT apart — near-simultaneous, one cascade should sweep all 21
      ev(9, 1, 'string', { y: 170, dir: 1 }),
      ev(9, 1.5, 'string', { y: 240, dir: 1 }),
      ev(9, 2, 'string', { y: 310, dir: 1 }),
      ev(13, 1, 'ring', { type: 'DRUM', n: 6, cx: 640, cy: 250, r: 190, orbit: false, delayBeats: 2, staggerBeats: 0 }),
    ],
    // spec verbatim: every 1/8 note, if aliveCount < 16, spawn from this bag
    bag: {
      rate: 1, target: 16,
      weights: { SPARK: 0.40, WHIP: 0.18, CROSSETTE: 0.14, CANDLE: 0.10, DRUM: 0.08, LANTERN: 0.05, HORNET: 0.03, MORTAR: 0.02 },
    },
  };

  // =============================================================================================
  // ACT IV — THE FINALE · 150 BPM (beat 0.400s, bar 1.600s) · boss THE SHOWRUNNER
  // =============================================================================================
  const W4_1 = {
    name: 'EVERYTHING AT ONCE',
    bars: 14,                                       // 22.4s. A greatest-hits medley, 2 bars each, no gaps.
    events: [
      // 1-2: the String (both directions at once, interleaved)
      ev(1, 1, 'string', { y: 180, dir: 1 }),
      ev(1, 1, 'string', { y: 260, dir: -1, xShift: 48 }),
      // 3-4: the Drum diamond
      ev(3, 1, 'single', { type: 'DRUM', x: 640, y: 130, delayBeats: 2 }),
      ev(3, 1, 'single', { type: 'DRUM', x: 400, y: 250, delayBeats: 2 }),
      ev(3, 1, 'single', { type: 'DRUM', x: 880, y: 250, delayBeats: 2 }),
      ev(3, 1, 'single', { type: 'DRUM', x: 640, y: 370, delayBeats: 2 }),
      // 5-6: the Mortar wall
      ev(5, 1, 'line', { type: 'MORTAR', n: 5, x0: 240, x1: 1040, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 0 }),
      // 7-8: the Lantern ring around a Drum
      ev(7, 1, 'ring', { type: 'LANTERN', n: 6, cx: 640, cy: 240, r: 200, orbit: true, orbitR: 70, orbitW: 30 }),
      ev(7, 1, 'single', { type: 'DRUM', x: 640, y: 240, delayBeats: 3 }),
      // 9-10: the Hornet grid with sparks in the lanes
      ev(9, 1, 'grid', { type: 'HORNET', cols: 2, rows: 2, x0: 320, y0: 160, dx: 640, dy: 230, delayBeats: 2, staggerBeats: 0.5 }),
      ev(9, 1, 'grid', { type: 'SPARK', cols: 4, rows: 3, x0: 290, y0: 250, dx: 236, dy: 60, delayBeats: 3, staggerBeats: 0.25 }),
      // 11-12: the three-String reprise from Act II, at Act IV tempo
      ev(11, 1, 'string', { y: 160, dir: 1 }),
      ev(11, 1.5, 'string', { y: 230, dir: -1 }),
      ev(11, 2, 'string', { y: 300, dir: 1 }),
      // 13-14: the Drum hex from Act III
      ev(13, 1, 'ring', { type: 'DRUM', n: 6, cx: 640, cy: 250, r: 190, orbit: false, delayBeats: 2, staggerBeats: 0 }),
    ],
    // a thin bag underneath the medley, purely so "no gaps" is literally true between formations
    bag: { rate: 1, target: 10, weights: { SPARK: 0.55, WHIP: 0.25, CANDLE: 0.12, CROSSETTE: 0.08 } },
  };

  const W4_2 = {
    name: 'THE CROWD STANDS',
    bars: 12,                                       // 19.2s
    // The rooftop crowd throws CROWD FLARES up to you: neutral, harmless if they expire, 20 petals
    // if you pop one. This wave is a gift and it must feel like one — the flares outnumber the
    // pressure, and the bag underneath is deliberately mild.
    // mvSpeed -90 is the spec's rise rate (§7), overriding the roster default.
    events: [
      ev(1, 1, 'rain', { type: 'FLARE', n: 4, overBars: 2, xMin: 180, xMax: 1100, from: 'bottom', mv: 'rise', mvSpeed: -90, delayBeats: 1 }),
      ev(3, 1, 'rain', { type: 'FLARE', n: 4, overBars: 2, xMin: 200, xMax: 1080, from: 'bottom', mv: 'rise', mvSpeed: -90, delayBeats: 1 }),
      ev(5, 1, 'rain', { type: 'FLARE', n: 5, overBars: 2, xMin: 160, xMax: 1120, from: 'bottom', mv: 'rise', mvSpeed: -90, delayBeats: 1 }),
      ev(7, 1, 'rain', { type: 'FLARE', n: 5, overBars: 2, xMin: 180, xMax: 1100, from: 'bottom', mv: 'rise', mvSpeed: -90, delayBeats: 1 }),
      ev(9, 1, 'rain', { type: 'FLARE', n: 6, overBars: 2, xMin: 140, xMax: 1140, from: 'bottom', mv: 'rise', mvSpeed: -90, delayBeats: 1 }),
      ev(11, 1, 'rain', { type: 'FLARE', n: 6, overBars: 2, xMin: 160, xMax: 1120, from: 'bottom', mv: 'rise', mvSpeed: -90, delayBeats: 1 }),
    ],
    bag: {
      rate: 1, target: 20,
      weights: { SPARK: 0.42, WHIP: 0.18, CROSSETTE: 0.13, CANDLE: 0.10, DRUM: 0.09, LANTERN: 0.04, HORNET: 0.02, MORTAR: 0.02 },
    },
  };

  const W4_3 = {
    name: 'LAST CALL',
    bars: 10,                                       // 16.0s. Peak ~1500 bullets.
    // Two MORTARs every single bar, x-positions walking so the wall never repeats itself, over a bag
    // holding 28 alive. MAX_WINDOWS[3] = 9 is doing enormous work here.
    events: [
      ev(1, 1, 'line', { type: 'MORTAR', n: 2, x0: 380, x1: 900, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 0 }),
      ev(2, 1, 'line', { type: 'MORTAR', n: 2, x0: 240, x1: 1040, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 0 }),
      ev(3, 1, 'line', { type: 'MORTAR', n: 2, x0: 520, x1: 760, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 0 }),
      ev(4, 1, 'line', { type: 'MORTAR', n: 2, x0: 300, x1: 980, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 0 }),
      ev(5, 1, 'line', { type: 'MORTAR', n: 2, x0: 440, x1: 840, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 0 }),
      ev(6, 1, 'line', { type: 'MORTAR', n: 2, x0: 200, x1: 1080, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 0 }),
      ev(7, 1, 'line', { type: 'MORTAR', n: 2, x0: 560, x1: 720, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 0 }),
      ev(8, 1, 'line', { type: 'MORTAR', n: 2, x0: 340, x1: 940, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 0 }),
      ev(9, 1, 'line', { type: 'MORTAR', n: 2, x0: 260, x1: 1020, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 0 }),
      ev(10, 1, 'line', { type: 'MORTAR', n: 2, x0: 480, x1: 800, y: 250, mv: 'descend', mvSpeed: 70, staggerBeats: 0 }),
    ],
    bag: {
      rate: 2, target: 28,
      weights: { SPARK: 0.34, WHIP: 0.18, CROSSETTE: 0.14, CANDLE: 0.09, DRUM: 0.12, LANTERN: 0.05, HORNET: 0.04, MORTAR: 0.04 },
    },
  };

  // =============================================================================================
  // RALLIES — the mini-swarm that closes each act. No gaps, fuses on every 1/8, then the boss.
  // These are pure bag descriptors: dur seconds, `rate` shells per 1/8-note grant while under
  // `target` alive. Act I/II were authored in the spec as explicit rosters (24 SPARK + 2 DRUM);
  // those rosters are preserved as `roster` for reference and expressed as weights + a rate that
  // delivers the same headcount across the same duration.
  // =============================================================================================
  const RALLY = [
    {
      name: 'RALLY', act: 0, dur: 6, target: 14, rate: 1,      // 26 shells / ~24.8 eighths at 124bpm ≈ 1
      roster: [{ type: 'SPARK', n: 24 }, { type: 'DRUM', n: 2 }],
      weights: { SPARK: 0.923, DRUM: 0.077 },                  // 24:2, exactly the spec's roster
      eighthFuse: true,
    },
    {
      name: 'RALLY', act: 1, dur: 6, target: 18, rate: 1.4,    // 36 shells / ~26.4 eighths at 132bpm
      roster: [{ type: 'SPARK', n: 30 }, { type: 'DRUM', n: 4 }, { type: 'MORTAR', n: 2 }],
      weights: { SPARK: 0.833, DRUM: 0.111, MORTAR: 0.056 },   // 30:4:2
      eighthFuse: true,
    },
    {
      name: 'RALLY', act: 2, dur: 6, target: 26, rate: 2,      // spec: "bag rate doubles, target 26"
      roster: null,
      weights: { SPARK: 0.40, WHIP: 0.18, CROSSETTE: 0.14, CANDLE: 0.10, DRUM: 0.08, LANTERN: 0.05, HORNET: 0.03, MORTAR: 0.02 },
      eighthFuse: true,
    },
    {
      name: 'RALLY', act: 3, dur: 8, target: 34, rate: 2.4,    // 8s, everything, then a hard cut to silence
      roster: null,
      weights: { SPARK: 0.30, WHIP: 0.16, CROSSETTE: 0.13, CANDLE: 0.09, DRUM: 0.13, LANTERN: 0.05, HORNET: 0.05, MORTAR: 0.05, FLARE: 0.04 },
      eighthFuse: true,
    },
  ];

  // =============================================================================================
  // THE READABILITY CAP. One number per act. This is not a difficulty dial — it is the reason a
  // 2000-bullet screen still tells you exactly where to look. It rises by one per act only because
  // by Act IV you have been reading white rings for eleven minutes.
  // =============================================================================================
  const MAX_WINDOWS = [8, 9, 10, 12];

  const ACTS = [
    { name: 'THE PIER',       bpm: 124, waves: [W1_1, W1_2, W1_3], rally: RALLY[0], boss: 'ROMAN CANDLE' },
    { name: 'THE CRANE YARD', bpm: 132, waves: [W2_1, W2_2, W2_3], rally: RALLY[1], boss: 'CATHERINE' },
    { name: 'THE CLOUD DECK', bpm: 138, waves: [W3_1, W3_2, W3_3], rally: RALLY[2], boss: 'KAMURO' },
    { name: 'THE FINALE',     bpm: 150, waves: [W4_1, W4_2, W4_3], rally: RALLY[3], boss: 'THE SHOWRUNNER' },
  ];

  // ---------------------------------------------------------------------------------------------
  // BOOT-TIME PREPARATION. Sorting and weight-flattening happen exactly once, here — never in a
  // director tick. After this, an event list is a straight walk with a cursor.
  // ---------------------------------------------------------------------------------------------
  const byTime = (a, b) => (a.bar - b.bar) || (a.beat - b.beat);
  (function prepare() {
    for (let i = 0; i < ACTS.length; i++) {
      const act = ACTS[i], bpm = act.bpm;
      for (let w = 0; w < act.waves.length; w++) {
        const wave = act.waves[w];
        wave.act = i;
        wave.events.sort(byTime);
        for (let e = 0; e < wave.events.length; e++) {
          const evt = wave.events[e];
          evt.t = eventTime(evt, bpm);              // seconds from wave start, cached
        }
        wave.dur = wave.bars * barSec(bpm);
        prepBag(wave.bag);
      }
      prepBag(act.rally);
    }
  })();

  // Total scripted headcount of a wave — used by the director for the "NO POWDER WASTED" tally and
  // by the test harness to assert a wave is not silently spawning nothing.
  function waveHeadcount(wave) {
    let n = 0;
    for (let i = 0; i < wave.events.length; i++) {
      const a = wave.events[i].args, fn = wave.events[i].fn;
      if (fn === 'drizzle') continue;
      if (fn === 'single') n += 1;
      else if (fn === 'string') n += (a.n !== undefined ? a.n | 0 : STRING_N);
      else if (fn === 'grid') n += (a.cols | 0) * (a.rows | 0);
      else n += a.n | 0;
    }
    return n;
  }

  return {
    ACTS, RALLY, MAX_WINDOWS, SPAWNERS,
    spawnEvent, waveHeadcount,
    bagPick, bagSpawn,
    drizzleState: DRIZZLE, resetDrizzle, tickDrizzle,
    beatSec, barSec, eighthSec, eventTime,
    STRING_N, STRING_GAP,
    wave: (a, w) => ACTS[a].waves[w],
  };
})();
