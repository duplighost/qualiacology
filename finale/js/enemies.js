// FINALE — enemy roster. Eight shells, each one a different question about the fuse window.
// Enemies are plain objects (max 48 alive) — only bullets and particles are worth SoA.
//
// Damage baseline: gun = 20 DPS, 80 DPS in-window (x4 fuse armour). Petal = 6.
// Every window length below is set against MEASURED numbers, not vibes:
//     usable = (window - 0.154s of bullet flight at 200px) * 80 DPS
// SPARK usable ~36 vs 24hp -> converts reliably. DRUM usable ~68 vs 90hp and MORTAR ~124 vs 170hp ->
// they CANNOT be solo-gunned, so the game structurally requires you to feed them petals. That is the
// whole design law expressed as arithmetic, and it is the line that keeps the gun an igniter.
window.Enemies = (() => {
  const T = Pool.T;

  const TYPES = {
    // The bread. 0.60s window, ~36 usable damage against 24hp — solo-killable, but only if you are
    // already pointed at it. Teaches precision without ever needing a tutorial.
    SPARK: {
      hp: 24, r: 12, score: 100, fuse: 0.60, cadence: 2.2, volleys: 3, mv: 'enterHold',
      volley: { kind: 'fan', n: 5, spread: 46, speed: 200, aimed: true },
    },
    // Punishes greed: it curls into where you were heading.
    WHIP: {
      hp: 15, r: 11, score: 150, fuse: 0.50, cadence: 1.6, volleys: 3, mv: 'strafe', mvSpeed: 240,
      volley: { kind: 'whip', n: 3, spread: 18, speed: 300, curl: 90 },
    },
    // The metronome. Six windows, one per beat — a free chain-keeper if you can spare the attention.
    CANDLE: {
      hp: 24, r: 15, score: 250, fuse: 0.50, cadence: 0.55, volleys: 6, mv: 'static',
      volley: { kind: 'aimed', n: 1, speed: 260, type: T.COMET, r: 9 },
    },
    // The chain multiplier: 4 bullets that become 16.
    CROSSETTE: {
      hp: 30, r: 14, score: 350, fuse: 0.70, cadence: 3.0, volleys: 2, mv: 'descend', mvSpeed: 60,
      volley: { kind: 'cross', n: 4, speed: 230, splitAfter: 0.70 },
    },
    // The honest dodge. Amber never converts, so this content can never be cheesed by the mechanic.
    HORNET: {
      hp: 36, r: 14, score: 400, fuse: 0.65, cadence: 3.2, volleys: -1, mv: 'hover', amber: true,
      volley: { kind: 'beam', n: 2 },
    },
    // The teacher. No fuse at all, and its 96px aura eats your peashooter — the ONLY way to kill a
    // LANTERN is with petals from something else. It also shields whatever it is standing next to.
    LANTERN: {
      hp: 45, r: 20, score: 300, fuse: 0, cadence: 0, volleys: 0, mv: 'orbit', aura: 96,
      volley: null,
    },
    // The igniter. 24 petals. This is the bullet-mass that makes a cascade travel.
    DRUM: {
      hp: 130, r: 26, score: 600, fuse: 1.00, cadence: 3.4, volleys: -1, mv: 'enterHold', big: true,
      volley: { kind: 'ring', n: 24, speed: 165 },
    },
    // The event. 60 petals if you take it, 60 hanging lethal bullets if you don't. A MORTAR that red
    // blooms changes the entire screen, and it is supposed to feel like a mistake you can see coming.
    MORTAR: {
      hp: 260, r: 30, score: 1200, fuse: 1.70, cadence: 5.0, volleys: -1, mv: 'descend', mvSpeed: 70,
      big: true,
      volley: { kind: 'flower', n: 60, speed: 150, decel: 120, grav: 45 },
    },
    // Not an enemy — a gift. The rooftop crowd throws these up for you in Act IV.
    FLARE: {
      hp: 12, r: 10, score: 50, fuse: 1.20, cadence: 99, volleys: 1, mv: 'rise', mvSpeed: -110,
      friendlyObject: true,
      volley: { kind: 'ring', n: 20, speed: 190 },
    },
  };
  const NAMES = Object.keys(TYPES);

  // ---------- pool ----------
  const list = [];
  for (let i = 0; i < CFG.ENEMY_CAP; i++) {
    list.push({
      alive: false, id: 0, name: '', t: 0,
      x: 0, y: 0, vx: 0, vy: 0, hp: 0, maxHp: 0, r: 0,
      homeX: 0, homeY: 0, enterT: 0, phase: 0,
      fuseOpen: false, fuseT: 0, fuseMax: 0, waiting: false, cadenceT: 0, volleysLeft: 0,
      amber: false, aura: 0, big: false, friendlyObject: false, volley: null, score: 0,
      cx: 0, cy: 0, orbitR: 0, orbitW: 0, mv: 'static', mvSpeed: 0, dir: 1,
      hitFlash: 0, born: 0, leaving: false, ownerBoss: 0,
    });
  }
  let nextId = 1;
  const alive = () => { let c = 0; for (let i = 0; i < list.length; i++) if (list[i].alive) c++; return c; };

  function spawn(name, x, y, opts) {
    const t = TYPES[name];
    if (!t) return null;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.alive) continue;
      e.alive = true; e.id = nextId++; e.name = name; e.t = 0; e.born = 0;
      e.x = x; e.y = y; e.vx = 0; e.vy = 0;
      e.hp = e.maxHp = (opts && opts.hp) || t.hp;
      e.r = t.r; e.score = t.score;
      e.amber = !!t.amber; e.aura = t.aura || 0; e.big = !!t.big;
      e.friendlyObject = !!t.friendlyObject;
      e.volley = t.volley;
      e.fuseMax = (opts && opts.fuse) || t.fuse;
      e.fuseOpen = false; e.fuseT = 0; e.waiting = false;
      e.volleysLeft = t.volleys;
      // first window is requested after `delay`, defaulting to a beat-ish settle so a fresh spawn is
      // never an instant threat — you always get to see a shell arrive before it asks for anything.
      e.cadenceT = (opts && opts.delay !== undefined) ? opts.delay : 0.9;
      e.mv = (opts && opts.mv) || t.mv;
      e.mvSpeed = (opts && opts.mvSpeed !== undefined) ? opts.mvSpeed : (t.mvSpeed || 0);
      e.homeX = (opts && opts.homeX !== undefined) ? opts.homeX : x;
      e.homeY = (opts && opts.homeY !== undefined) ? opts.homeY : y;
      e.enterT = (opts && opts.enterT !== undefined) ? opts.enterT : 0.8;
      e.cx = (opts && opts.cx !== undefined) ? opts.cx : x;
      e.cy = (opts && opts.cy !== undefined) ? opts.cy : y;
      e.orbitR = (opts && opts.orbitR) || 70;
      e.orbitW = U.deg((opts && opts.orbitW) || 40);
      e.phase = (opts && opts.phase) || 0;
      e.dir = (opts && opts.dir) || 1;
      e.hitFlash = 0; e.leaving = false;
      e.ownerBoss = (opts && opts.ownerBoss) || 0;
      return e;
    }
    return null;                       // at cap: drop. The cap IS the readability contract.
  }

  // ---------- movement ----------
  function move(e, dt) {
    e.t += dt; e.born += dt;
    switch (e.mv) {
      case 'enterHold': {
        // ease to the hold point, then breathe. No overshoot: a shell that wobbles reads as noise.
        if (e.born < e.enterT) {
          const k = e.born / e.enterT, s = k * k * (3 - 2 * k);
          e.x = U.lerp(e.x, e.homeX, s * 0.35 + 0.02);
          e.y = U.lerp(e.y, e.homeY, s * 0.35 + 0.02);
        } else {
          e.x = e.homeX + U.fsin(e.t * 0.9 + e.phase) * 14;
          e.y = e.homeY + U.fsin(e.t * 1.4 + e.phase) * 7;
        }
        break;
      }
      case 'strafe':
        e.x += e.mvSpeed * e.dir * dt;
        if (e.x < 40) { e.x = 40; e.dir = 1; }
        if (e.x > CFG.W - 40) { e.x = CFG.W - 40; e.dir = -1; }
        e.y = e.homeY + U.fsin(e.t * 2.2 + e.phase) * 18;
        break;
      case 'descend': e.y += e.mvSpeed * dt; e.x = e.homeX + U.fsin(e.t * 0.8 + e.phase) * 26; break;
      case 'rise':    e.y += e.mvSpeed * dt; e.x = e.homeX + U.fsin(e.t * 1.6 + e.phase) * 12; break;
      case 'orbit':
        e.x = e.cx + U.fcos(e.t * e.orbitW + e.phase) * e.orbitR;
        e.y = e.cy + U.fsin(e.t * e.orbitW + e.phase) * e.orbitR * 0.55;
        break;
      case 'hover':
        e.x = U.lerp(e.x, e.homeX, 0.03);
        e.y = e.homeY + U.fsin(e.t * 1.1 + e.phase) * 22;
        break;
      case 'static': default:
        e.x = e.homeX; e.y = e.homeY; break;
    }
    if (e.hitFlash > 0) e.hitFlash -= dt;
  }

  // Enemies age out only when they wander off-screen; scripts and blooms are what kill them.
  // A shell leaving the field with its window open MUST be forgotten by Fuse first, or its open-window
  // count leaks forever (the #1 bug). Same for Enemies.clear below.
  function update(dt) {
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.alive) continue;
      move(e, dt);
      if (e.y > CFG.H + 90 || e.y < -260 || e.x < -160 || e.x > CFG.W + 160) {
        if (window.Fuse) Fuse.forget(e);
        e.alive = false;
      }
    }
  }

  function clear() {
    for (let i = 0; i < list.length; i++) {
      if (list[i].alive && window.Fuse) Fuse.forget(list[i]);
      list[i].alive = false;
    }
  }

  // Does a peashooter bullet at (x,y) get eaten by a LANTERN aura? Petals pass through; the gun does
  // not. This one predicate is what turns LANTERN from "a tanky enemy" into "the teacher".
  function auraBlocks(x, y) {
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.alive || !e.aura) continue;
      const dx = x - e.x, dy = y - e.y;
      if (dx * dx + dy * dy <= e.aura * e.aura) return true;
    }
    return false;
  }

  return { TYPES, NAMES, list, spawn, update, clear, alive, auraBlocks, move };
})();
