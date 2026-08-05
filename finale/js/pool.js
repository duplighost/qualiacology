// FINALE — pools. Structure-of-Arrays typed arrays, swap-remove free list, ZERO allocation per frame.
// This file is the reason the game can hold 2300 live bullets at 60fps in Canvas2D. Rules for anyone
// editing it: no objects per bullet, no closures inside loops, no array literals, no Object.assign.
window.Pool = (() => {
  // ---- bullet type ids (index into the baked sprite atlas) ----
  const T = {
    CIRCLE: 0,      // standard lethal — CIRCLE (magenta)
    COMET: 1,       // fat aimed lethal — CIRCLE, larger, with a baked tail
    AMBER: 2,       // unconvertible lethal — TRIANGLE (amber)
    PETAL: 3,       // yours — DIAMOND (stage 0/1/2 = cyan/mint/white)
    PEA: 4,         // your peashooter — LINE, deliberately dim
    SPARKLE: 5,     // harmless drifting relief-beat spark (phase transitions)
  };
  // ---- behaviours ----
  const B = {
    LINEAR: 0,
    ACCEL: 1,       // p0,p1 = ax,ay (px/s^2)
    GRAVITY: 2,     // KAMURO: decel to a stop, hang, then fall. Density without speed.
    CURL: 3,        // p0 = turn rate rad/s (WHIP)
    SPLIT: 4,       // p0 = seconds until it splits (CROSSETTE); game handles the spawn
  };
  // ---- flags (bitfield) ----
  const F = {
    AMBER: 1,       // never converts, never becomes a petal
    PERSIST: 2,     // wide cull margin + lifetime instead (KAMURO's hanging curtain)
    FUSED: 4,       // this BULLET carries a fuse window (KAMURO P3: bullets become shells)
    SPLITFLASH: 8,  // flashes white for 3 frames before splitting — the readability tell
  };
  const FACTION = { ENEMY: 0, PLAYER: 1 };

  // Default gravity profile (KAMURO, spec §8.3). Per-bullet overrides live in q0/q1 so MORTAR's
  // softer flower (-120 decel, +45 fall) and KAMURO's hard hang can share one behaviour.
  const GRAV_DECEL = 260, GRAV_HANG = 0.5, GRAV_ACC = 55, GRAV_TERM = 130;

  function makeBullets(cap) {
    const x = new Float32Array(cap), y = new Float32Array(cap);
    const vx = new Float32Array(cap), vy = new Float32Array(cap);
    const p0 = new Float32Array(cap), p1 = new Float32Array(cap);
    const q0 = new Float32Array(cap), q1 = new Float32Array(cap);  // gravity: decel, fall accel
    const age = new Float32Array(cap), life = new Float32Array(cap);
    const r = new Float32Array(cap), dmg = new Float32Array(cap);
    const fuseT = new Float32Array(cap), fuseMax = new Float32Array(cap);
    const type = new Uint8Array(cap), faction = new Uint8Array(cap);
    const flags = new Uint8Array(cap), beh = new Uint8Array(cap);
    const stage = new Uint8Array(cap), pierce = new Uint8Array(cap);
    let n = 0;
    let onSplit = null;      // (i) => void, set by game; called when a SPLIT bullet matures
    let onFuseExpire = null; // (i) => void, for FUSED bullets whose window closed unconverted

    // returns index, or -1 if the pool is full (drop silently: the cap IS the readability contract)
    function spawn(px, py, pvx, pvy, ptype, pfaction, opts) {
      if (n >= cap) return -1;
      const i = n++;
      x[i] = px; y[i] = py; vx[i] = pvx; vy[i] = pvy;
      type[i] = ptype; faction[i] = pfaction;
      age[i] = 0; stage[i] = 0; fuseT[i] = 0; fuseMax[i] = 0;
      if (opts) {
        r[i] = opts.r !== undefined ? opts.r : 6;
        dmg[i] = opts.dmg !== undefined ? opts.dmg : 1;
        life[i] = opts.life !== undefined ? opts.life : 0;      // 0 = no lifetime, cull by bounds only
        beh[i] = opts.beh || 0;
        flags[i] = opts.flags || 0;
        p0[i] = opts.p0 || 0; p1[i] = opts.p1 || 0;
        q0[i] = opts.decel !== undefined ? opts.decel : GRAV_DECEL;
        q1[i] = opts.grav !== undefined ? opts.grav : GRAV_ACC;
        stage[i] = opts.stage || 0;
        pierce[i] = opts.pierce !== undefined ? opts.pierce : 1;
      } else {
        r[i] = 6; dmg[i] = 1; life[i] = 0; beh[i] = 0; flags[i] = 0;
        p0[i] = 0; p1[i] = 0; q0[i] = GRAV_DECEL; q1[i] = GRAV_ACC; pierce[i] = 1;
      }
      return i;
    }

    function kill(i) {
      const last = --n;
      if (i !== last) {
        x[i] = x[last]; y[i] = y[last]; vx[i] = vx[last]; vy[i] = vy[last];
        p0[i] = p0[last]; p1[i] = p1[last]; q0[i] = q0[last]; q1[i] = q1[last];
        age[i] = age[last]; life[i] = life[last];
        r[i] = r[last]; dmg[i] = dmg[last]; fuseT[i] = fuseT[last]; fuseMax[i] = fuseMax[last];
        type[i] = type[last]; faction[i] = faction[last]; flags[i] = flags[last];
        beh[i] = beh[last]; stage[i] = stage[last]; pierce[i] = pierce[last];
      }
    }

    function update(dt) {
      const W = CFG.W, H = CFG.H;
      let i = 0;
      while (i < n) {
        const bh = beh[i];
        if (bh === B.ACCEL) {
          vx[i] += p0[i] * dt; vy[i] += p1[i] * dt;
        } else if (bh === B.CURL) {
          // rotate the velocity vector — a whip that curls, not a bullet that steers
          const a = p0[i] * dt, c = U.fcos(a), s = U.fsin(a);
          const nvx = vx[i] * c - vy[i] * s, nvy = vx[i] * s + vy[i] * c;
          vx[i] = nvx; vy[i] = nvy;
        } else if (bh === B.GRAVITY) {
          const ph = p1[i];
          if (ph === 0) {
            const sp = Math.hypot(vx[i], vy[i]);
            const ns = sp - q0[i] * dt;
            if (ns <= 0) { vx[i] = 0; vy[i] = 0; p1[i] = 1; p0[i] = GRAV_HANG; }
            else { const k = ns / sp; vx[i] *= k; vy[i] *= k; }
          } else if (ph === 1) {
            p0[i] -= dt;
            if (p0[i] <= 0) p1[i] = 2;
          } else {
            vy[i] += q1[i] * dt;
            if (vy[i] > GRAV_TERM) vy[i] = GRAV_TERM;
          }
        }
        x[i] += vx[i] * dt; y[i] += vy[i] * dt;
        age[i] += dt;

        // bullet-level fuse windows (KAMURO P3) tick down; expiry is the game's problem
        if (flags[i] & F.FUSED) {
          fuseT[i] -= dt;
          if (fuseT[i] <= 0) {
            if (onFuseExpire) onFuseExpire(i);
            // callback may kill(i) — if it did, the slot now holds a different bullet, so don't advance
            if (i < n && (flags[i] & F.FUSED) && fuseT[i] <= 0) flags[i] &= ~F.FUSED;
          }
        }
        if (beh[i] === B.SPLIT) {
          p0[i] -= dt;
          if (p0[i] <= 0.05) flags[i] |= F.SPLITFLASH;   // 3-frame white tell before it splits
          if (p0[i] <= 0) {
            if (onSplit) onSplit(i);
            if (i < n) { kill(i); continue; }
          }
        }
        // lifetime + cull
        const m = (flags[i] & F.PERSIST) ? 200 : 64;
        if ((life[i] > 0 && age[i] >= life[i]) ||
            x[i] < -m || x[i] > W + m || y[i] < -m || y[i] > H + m) {
          kill(i); continue;
        }
        i++;
      }
    }

    function clear() { n = 0; }
    function count(f) { let c = 0; for (let i = 0; i < n; i++) if (faction[i] === f) c++; return c; }

    return {
      x, y, vx, vy, p0, p1, q0, q1, age, life, r, dmg, fuseT, fuseMax,
      type, faction, flags, beh, stage, pierce, cap,
      get n() { return n; },
      spawn, kill, update, clear, count,
      set onSplit(f) { onSplit = f; },
      set onFuseExpire(f) { onFuseExpire = f; },
    };
  }

  // ---- particles: decorative only, never gameplay ----
  function makeParticles(cap) {
    const x = new Float32Array(cap), y = new Float32Array(cap);
    const vx = new Float32Array(cap), vy = new Float32Array(cap);
    const age = new Float32Array(cap), life = new Float32Array(cap);
    const size = new Float32Array(cap), drag = new Float32Array(cap);
    const cr = new Uint8Array(cap), cg = new Uint8Array(cap), cb = new Uint8Array(cap);
    let n = 0;
    function spawn(px, py, pvx, pvy, plife, psize, rgb, pdrag) {
      if (n >= cap) { n = cap - 1; }        // steal the newest rather than drop: particles are never load-bearing
      const i = n++;
      x[i] = px; y[i] = py; vx[i] = pvx; vy[i] = pvy;
      age[i] = 0; life[i] = plife; size[i] = psize; drag[i] = pdrag === undefined ? 0.94 : pdrag;
      cr[i] = rgb[0]; cg[i] = rgb[1]; cb[i] = rgb[2];
      return i;
    }
    function kill(i) {
      const last = --n;
      if (i !== last) {
        x[i] = x[last]; y[i] = y[last]; vx[i] = vx[last]; vy[i] = vy[last];
        age[i] = age[last]; life[i] = life[last]; size[i] = size[last]; drag[i] = drag[last];
        cr[i] = cr[last]; cg[i] = cg[last]; cb[i] = cb[last];
      }
    }
    function update(dt) {
      let i = 0;
      while (i < n) {
        x[i] += vx[i] * dt; y[i] += vy[i] * dt;
        const d = Math.pow(drag[i], dt * 60);
        vx[i] *= d; vy[i] *= d;
        age[i] += dt;
        if (age[i] >= life[i]) { kill(i); continue; }
        i++;
      }
    }
    // one-tick radial shove — the "bloom wind". Free spectacle, zero gameplay cost.
    function wind(cx, cy, radius, speed) {
      const r2 = radius * radius;
      for (let i = 0; i < n; i++) {
        const dx = x[i] - cx, dy = y[i] - cy, d2 = dx * dx + dy * dy;
        if (d2 > r2 || d2 < 1) continue;
        const d = Math.sqrt(d2), k = (1 - d / radius) * speed;
        vx[i] += dx / d * k; vy[i] += dy / d * k;
      }
    }
    function clear() { n = 0; }
    return { x, y, vx, vy, age, life, size, cr, cg, cb, cap,
             get n() { return n; }, spawn, kill, update, wind, clear };
  }

  return { T, B, F, FACTION, makeBullets, makeParticles };
})();
