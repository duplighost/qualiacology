// FINALE — pattern DSL. THE CONVERSION CONTRACT LIVES HERE.
//
// A volley is plain DATA (`desc`), never code. That is the whole trick: converting a shell means
// re-running the *identical* descriptor with faction=PLAYER instead of ENEMY. Same count, same
// geometry, same origin — only allegiance, speed and colour differ. If a pattern ever gets authored
// as a bespoke function instead of a desc, conversion silently stops working for it. Don't.
window.Emit = (() => {
  const { PETAL, CIRCLE, COMET, AMBER } = Pool.T;
  const P_FACT = Pool.FACTION.PLAYER;

  // scratch emit-context, reused every call so emitting never allocates
  const P = {
    bul: null, x: 0, y: 0, aim: 0,
    faction: 0, speedMult: 1, addVx: 0, addVy: 0,
    stage: 0, pierce: 1, chain: 0,
  };

  function ctx(bul, x, y, aim, faction, speedMult, addVx, addVy, stage, pierce) {
    P.bul = bul; P.x = x; P.y = y; P.aim = aim; P.faction = faction;
    P.speedMult = speedMult; P.addVx = addVx; P.addVy = addVy;
    P.stage = stage; P.pierce = pierce;
    return P;
  }

  // one bullet. `o` carries per-pattern extras (r, beh, p0, life, flags, decel, grav, type).
  function push(a, speed, o) {
    const mine = P.faction === P_FACT;
    const sp = speed * P.speedMult;
    const vx = U.fcos(a) * sp + P.addVx;
    const vy = U.fsin(a) * sp + P.addVy;
    const amber = o && (o.amber || false);
    // A petal is ALWAYS a diamond and ALWAYS cyan-family. An amber emitter converts to nothing at all
    // (handled upstream in fuse.js), so amber can never reach the PLAYER faction here.
    const type = mine ? PETAL : (amber ? AMBER : (o && o.type !== undefined ? o.type : CIRCLE));
    return P.bul.spawn(P.x, P.y, vx, vy, type, P.faction, {
      r: mine ? 6 : (o && o.r !== undefined ? o.r : 7),
      dmg: mine ? CFG.PETAL_DMG : 1,
      life: mine ? CFG.PETAL_LIFE : (o && o.life !== undefined ? o.life : 0),
      beh: o && o.beh !== undefined ? o.beh : 0,
      flags: (o && o.flags ? o.flags : 0) | (amber ? Pool.F.AMBER : 0),
      p0: o && o.p0 !== undefined ? o.p0 : 0,
      p1: o && o.p1 !== undefined ? o.p1 : 0,
      decel: o && o.decel, grav: o && o.grav,
      stage: mine ? P.stage : 0,
      pierce: mine ? P.pierce : 1,
    });
  }

  // ---------- PATTERNS ----------
  // Each takes (d, aimOverride). `d.speed` is px/s at the enemy's own tempo; speedMult scales it.

  function fan(d) {                                   // n bullets across `spread` degrees, centred on aim
    const n = d.n | 0, spread = U.deg(d.spread || 0);
    const base = (d.aimed === false) ? (d.angle !== undefined ? U.deg(d.angle) : Math.PI / 2) : P.aim;
    const start = base - spread / 2, step = n > 1 ? spread / (n - 1) : 0;
    for (let i = 0; i < n; i++) push(start + step * i, d.speed, d);
  }

  function ring(d) {                                  // n bullets evenly around a circle
    const n = d.n | 0, off = (d.phase || 0) + (d.aimed ? P.aim : 0);
    for (let i = 0; i < n; i++) push(off + i / n * U.TAU, d.speed, d);
  }

  function aimed(d) {                                 // one fat comet straight at the player
    const n = d.n === undefined ? 1 : d.n | 0;
    for (let i = 0; i < n; i++) push(P.aim, d.speed, d);
  }

  // WHIP: a short curling spread. The curl is what makes it punish greed — it arrives where you were
  // going, not where you were.
  function whip(d) {
    const n = d.n | 0, spread = U.deg(d.spread === undefined ? 16 : d.spread);
    const start = P.aim - spread / 2, step = n > 1 ? spread / (n - 1) : 0;
    const curl = U.deg(d.curl === undefined ? 90 : d.curl);
    for (let i = 0; i < n; i++) {
      // alternate curl direction so a whip fans open rather than all bending the same way
      push(start + step * i, d.speed, { beh: Pool.B.CURL, p0: (i % 2 ? curl : -curl), r: d.r });
    }
  }

  // CROSSETTE: bullets that split into children. The chain multiplier of the whole game.
  function cross(d) {
    const n = d.n | 0, spread = U.deg(d.spread === undefined ? 360 : d.spread);
    const base = d.aimed ? P.aim : 0;
    for (let i = 0; i < n; i++) {
      const a = n > 1 ? base + (spread >= U.TAU ? i / n * U.TAU : -spread / 2 + spread / (n - 1) * i) : base;
      push(a, d.speed, { beh: Pool.B.SPLIT, p0: d.splitAfter === undefined ? 0.70 : d.splitAfter, r: d.r });
    }
  }

  // FLOWER: MORTAR's signature. Decelerates to a hang, then falls. Density without speed — this is
  // how a 60-bullet volley stays on screen long enough to matter without becoming unreadable.
  function flower(d) {
    const n = d.n | 0, off = d.phase || 0;
    for (let i = 0; i < n; i++) {
      push(off + i / n * U.TAU, d.speed, {
        beh: Pool.B.GRAVITY, decel: d.decel === undefined ? 120 : d.decel,
        grav: d.grav === undefined ? 45 : d.grav, flags: Pool.F.PERSIST, r: d.r,
      });
    }
  }

  // WALL: a vertical column with a gap you thread. ROMAN CANDLE's staircase.
  // `gapIndex` counts from the top; `gapSlots` is how many slots are missing.
  function wall(d) {
    const n = d.n | 0, spacing = d.spacing === undefined ? 40 : d.spacing;
    const gi = d.gapIndex | 0, gs = d.gapSlots === undefined ? 2 : d.gapSlots | 0;
    const dir = d.angle !== undefined ? U.deg(d.angle) : 0;
    const y0 = d.y0 === undefined ? 60 : d.y0;
    const sx = P.x, sy = P.y;
    for (let i = 0; i < n; i++) {
      if (i >= gi && i < gi + gs) continue;
      P.y = y0 + i * spacing; P.x = sx;
      push(dir, d.speed, d);
    }
    P.x = sx; P.y = sy;
  }

  // SPIRAL: ONE STEP of a rotating arm. Bosses call this every tick with an advancing angle —
  // keeping the rotation state on the boss, not in here, is what makes spirals cheap and resumable.
  function spiral(d) {
    const arms = d.arms === undefined ? 1 : d.arms | 0;
    for (let i = 0; i < arms; i++) push(d.angle + i / arms * U.TAU, d.speed, d);
  }

  const KINDS = { fan, ring, aimed, whip, cross, flower, wall, spiral };

  // Dispatcher. `desc.kind` selects the pattern. THIS is what conversion re-runs.
  function run(desc, bul, x, y, aim, faction, speedMult, addVx, addVy, stage, pierce) {
    const fn = KINDS[desc.kind];
    if (!fn) return 0;
    ctx(bul, x, y, aim, faction, speedMult || 1, addVx || 0, addVy || 0, stage || 0, pierce || 1);
    const before = bul.n;
    fn(desc);
    return bul.n - before;
  }

  // How many bullets a descriptor WILL produce. Used for petal counts, HUD, and events — must stay
  // in agreement with the pattern functions above.
  function countOf(d) {
    if (!d) return 0;
    if (d.kind === 'wall') {
      const gs = d.gapSlots === undefined ? 2 : d.gapSlots | 0;
      return Math.max(0, (d.n | 0) - gs);
    }
    if (d.kind === 'spiral') return d.arms === undefined ? 1 : d.arms | 0;
    if (d.kind === 'aimed') return d.n === undefined ? 1 : d.n | 0;
    return d.n | 0;
  }

  return { run, countOf, KINDS };
})();
