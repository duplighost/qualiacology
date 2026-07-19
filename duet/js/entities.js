// DUET — entities. Pools (bullets/sparks/particles), the player pip, and AUBADE (one partner, five stances).
// Zero per-frame allocation: everything is a fixed pool reused in place, so 600+ bullets hold 60fps.
window.Ent = (() => {
  const { clamp, dist, TAU } = U;

  // ---------- BULLET POOL ----------
  function makeBulletPool(cap) {
    const a = new Array(cap);
    for (let i = 0; i < cap; i++) a[i] = {
      active: false, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
      r: CFG.PARTNER_BULLET_R, kind: 'rose', grazed: false, born: 0,
      beh: 0, decK: 0.985, accK: 1.03, minSpeed: 0.4, phase: 0,
    };
    function spawn(x, y, vx, vy, kind, opts) {
      for (let i = 0; i < cap; i++) {
        const b = a[i];
        if (b.active) continue;
        b.active = true; b.x = x; b.y = y; b.px = x; b.py = y; b.vx = vx; b.vy = vy;
        b.kind = kind || 'rose'; b.grazed = false; b.born = 0;
        b.r = (opts && opts.r) || (kind === 'needle' ? 5 : CFG.PARTNER_BULLET_R);
        b.beh = (opts && opts.beh) || 0;
        b.decK = (opts && opts.decK) || 0.985; b.accK = (opts && opts.accK) || 1.03;
        b.minSpeed = (opts && opts.minSpeed) || 0.4; b.phase = 0;
        return b;
      }
      return null; // pool full: readability cap already respected by design, so just drop
    }
    function update() {
      for (let i = 0; i < cap; i++) {
        const b = a[i];
        if (!b.active) continue;
        b.px = b.x; b.py = b.y;
        if (b.beh === 1) { // decel-petal: brake to a near-stop, then drift back out
          const k = (b.phase === 0) ? b.decK : b.accK;
          b.vx *= k; b.vy *= k;
          if (b.phase === 0 && Math.hypot(b.vx, b.vy) < b.minSpeed) b.phase = 1;
        }
        b.x += b.vx; b.y += b.vy; b.born++;
        if (b.x < -40 || b.x > CFG.W + 40 || b.y < -40 || b.y > CFG.H + 60) b.active = false;
      }
    }
    function clear() { for (let i = 0; i < cap; i++) a[i].active = false; }
    // authoritative count by scan (gameplay deactivates bullets directly, so no fragile counter)
    function count() { let n = 0; for (let i = 0; i < cap; i++) if (a[i].active) n++; return n; }
    return { arr: a, cap, spawn, update, clear, count, get live(){ return count(); } };
  }

  // ---------- SPARK POOL (harvestable, from harmonize/popcorn) ----------
  function makeSparkPool(cap) {
    const a = new Array(cap);
    for (let i = 0; i < cap; i++) a[i] = { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, magnet: 0 };
    function spawn(x, y, vx, vy, magnetFrames) {
      for (let i = 0; i < cap; i++) { const s = a[i]; if (s.active) continue;
        s.active = true; s.x = x; s.y = y; s.vx = vx; s.vy = vy; s.life = 0; s.magnet = magnetFrames || 0; return s; }
      return null;
    }
    function clear(){ for (let i=0;i<cap;i++) a[i].active=false; }
    return { arr: a, cap, spawn, clear };
  }

  // ---------- PARTICLE POOL (decorative only: graze flecks, muzzle, popcorn) ----------
  function makeParticlePool(cap) {
    const a = new Array(cap);
    for (let i = 0; i < cap; i++) a[i] = { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 20, col: '#fff', size: 2, glow: 0 };
    function spawn(x, y, vx, vy, max, col, size, glow) {
      for (let i = 0; i < cap; i++) { const p = a[i]; if (p.active) continue;
        p.active = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = 0; p.max = max; p.col = col; p.size = size; p.glow = glow || 0; return p; }
      return null;
    }
    function update() {
      for (let i = 0; i < cap; i++) { const p = a[i]; if (!p.active) continue;
        p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life++; if (p.life >= p.max) p.active = false; }
    }
    function clear(){ for (let i=0;i<cap;i++) a[i].active=false; }
    return { arr: a, cap, spawn, update, clear };
  }

  // ---------- PLAYER ----------
  function makePlayer() {
    return {
      x: CFG.W / 2, y: CFG.H * 0.72, px: CFG.W / 2, py: CFG.H * 0.72, hp: CFG.PLAYER_HP,
      iframes: 0, focus: false, firing: false, fireCd: 0, harmonizeLock: 0,
      reset() { this.x = this.px = CFG.W / 2; this.y = this.py = CFG.H * 0.72; this.hp = CFG.PLAYER_HP; this.iframes = 0; this.fireCd = 0; this.harmonizeLock = 0; },
      move(intent) {
        this.px = this.x; this.py = this.y;      // remember where we were, so collision can sweep the player's motion
        this.focus = intent.focus;
        const spd = CFG.PLAYER_SPEED * (intent.focus ? CFG.FOCUS_SPEED_MULT : 1) * CFG.DT;
        if (intent.mouse) {
          const k = intent.focus ? CFG.FOCUS_SPEED_MULT : 1;
          let ddx = (intent.mx - this.x) * k, ddy = (intent.my - this.y) * k;
          // cap per-frame mouse travel to the same speed ceiling so it never out-runs keys
          const m = Math.hypot(ddx, ddy), cap = spd * 3.2;
          if (m > cap) { ddx = ddx / m * cap; ddy = ddy / m * cap; }
          this.x += ddx; this.y += ddy;
        } else {
          this.x += intent.dx * spd; this.y += intent.dy * spd;
        }
        this.x = clamp(this.x, 14, CFG.W - 14);
        this.y = clamp(this.y, 40, CFG.H - 18);
      },
    };
  }

  // ---------- PARTNER (AUBADE) ----------
  function makePartner() {
    return {
      x: CFG.W / 2, y: 150, t: 0, stance: 0, bodyPhase: 0,
      gauge: 0, gaugeMax: 900, driftEnabled: true,
      reset() { this.x = CFG.W / 2; this.y = 150; this.t = 0; this.stance = 0; this.bodyPhase = 0; this.gauge = 0; this.driftEnabled = true; },
      updateDrift(dt) {
        this.t += dt; this.bodyPhase += dt;
        if (this.driftEnabled) {
          this.x = 640 + 220 * Math.sin(this.t * 0.6);
          this.y = 150 + 30 * Math.sin(this.t * 1.1);
        }
      },
      aim(px, py) { return Math.atan2(py - this.y, px - this.x); },
      damage(d) { this.gauge = Math.min(this.gaugeMax, this.gauge + d); },
    };
  }

  // ---------- COLLISION + GRAZE ----------
  // Minimum distance between two moving segments (player prev->cur vs bullet prev->cur). Sweeping BOTH
  // means a 7.5px needle can't tunnel the 4px hitbox AND a 21px/frame mouse flick can't tunnel a bullet.
  function segSegDist(ax, ay, bx, by, cx, cy, dx, dy) {
    // sample the closest approach cheaply along t (both segments advance over the same frame)
    const ex = bx - ax, ey = by - ay, fx = dx - cx, fy = dy - cy;      // player delta, bullet delta
    const rx = ax - cx, ry = ay - cy, gx = ex - fx, gy = ey - fy;      // relative start + relative velocity
    const gg = gx * gx + gy * gy;
    let t = gg === 0 ? 0 : -(rx * gx + ry * gy) / gg; t = clamp(t, 0, 1);
    const qx = rx + gx * t, qy = ry + gy * t;
    return Math.hypot(qx, qy);
  }
  // returns { hit, inBand, newGrazes }; invokes onGraze(bullet) per fresh graze. Mutates b.grazed.
  function scan(pool, player, invuln, onGraze) {
    let hit = false, inBand = 0, newGrazes = 0;
    const IN = CFG.GRAZE_BAND_INNER, OUT = CFG.GRAZE_BAND_OUTER, RES = CFG.GRAZE_RESET, LET = CFG.HITBOX_RADIUS;
    const IN2 = IN * IN, OUT2 = OUT * OUT, RES2 = RES * RES, GATE2 = 44 * 44; // sweep-gate a hair wider than OUT for fast closers
    const px = player.x, py = player.y;
    for (let i = 0; i < pool.cap; i++) {
      const b = pool.arr[i]; if (!b.active) continue;
      const ddx = px - b.x, ddy = py - b.y, d2 = ddx * ddx + ddy * ddy;   // squared distance: no sqrt for the ~600 far bullets
      if (d2 <= OUT2) {
        if (d2 >= IN2) { inBand++; if (!b.grazed) { b.grazed = true; newGrazes++; if (onGraze) onGraze(b); } }
      } else if (d2 > RES2 && b.grazed) b.grazed = false;
      if (!invuln && d2 <= GATE2) {
        if (segSegDist(player.px, player.py, px, py, b.px, b.py, b.x, b.y) < LET) hit = true;
      }
    }
    return { hit, inBand, newGrazes };
  }

  return { makeBulletPool, makeSparkPool, makeParticlePool, makePlayer, makePartner, scan };
})();
