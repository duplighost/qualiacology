// ── VESPERBANE · entities.js ─────────────────────────────────────────
// Player movement model + enemies + props.
//
// Movement budget (level design depends on these):
//   held jump apex   = 335²/(2·780)  ≈ 72px  (~4.5 tiles)
//   full-jump air    ≈ 0.43s up + 0.31s down ≈ 0.74s
//   jump distance    ≈ 0.74·speed → 111px base (7t), 166px tier-3 (10t)
//   dash             = 410 px/s for 0.13s (+~35px net over a jump)
'use strict';

const CONFIG = {
  GRAV_RISE_HELD: 780,
  GRAV: 1500,
  MAX_FALL: 430,
  JUMP_V: 350,          // apex ≈ 78px held (~4.9 tiles): 4-tile rises are safe
  ACCEL: 1700,
  ACCEL_AIR: 1250,
  TURN_BOOST: 2.1,        // extra bite when reversing, so direction flips feel crisp
  DECEL: 1800,
  BASE_SPEED: 150,
  TIER_MULT: [1, 1.17, 1.34, 1.5],
  DASH_SPEED: 410,
  DASH_TIME: 0.13,
  DASH_CD: 0.55,
  WALL_SLIDE: 70,
  WALLKICK_VX: 250,
  WALLKICK_VY: 320,
  COYOTE: 0.09,
  BUFFER: 0.12,
  SLIDE_TIME: 0.34,
  SLIDE_SPEED: 265,
  POGO_V: 310,
  HP_MAX: 5,
  INVULN: 1.1,
  ATTACK_TIME: 0.2,       // whole swing
  ATTACK_ACTIVE: [0.03, 0.13],
  ATTACK_CD: 0.05,        // gap after swing before next
};

// ── tile collision (per-axis sweep; per-frame motion < tile size) ───
function moveX(e, level, dx) {
  e.x += dx;
  const ty0 = Math.floor(e.y / TW), ty1 = Math.floor((e.y + e.h - 0.01) / TW);
  let hit = 0;
  if (dx > 0) {
    const tx = Math.floor((e.x + e.w) / TW);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (level.solidAt(tx, ty)) { e.x = tx * TW - e.w - 0.01; e.vx = 0; hit = 1; break; }
    }
  } else if (dx < 0) {
    const tx = Math.floor(e.x / TW);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (level.solidAt(tx, ty)) { e.x = (tx + 1) * TW + 0.01; e.vx = 0; hit = -1; break; }
    }
  }
  return hit;
}

function moveY(e, level, dy, dropThrough) {
  const prevBot = e.y + e.h;
  e.y += dy;
  const tx0 = Math.floor(e.x / TW), tx1 = Math.floor((e.x + e.w - 0.01) / TW);
  let res = 0;
  if (dy > 0) {
    const ty = Math.floor((e.y + e.h) / TW);
    for (let tx = tx0; tx <= tx1; tx++) {
      const solid = level.solidAt(tx, ty);
      const plat = level.oneWayAt(tx, ty) && !dropThrough && prevBot <= ty * TW + 0.5;
      if (solid || plat) { e.y = ty * TW - e.h; e.vy = 0; res = 1; break; }
    }
  } else if (dy < 0) {
    const ty = Math.floor(e.y / TW);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (level.solidAt(tx, ty)) { e.y = (ty + 1) * TW + 0.01; e.vy = 0; res = -1; break; }
    }
  }
  return res;
}

function touchingWall(e, level, dir) {
  const tx = dir > 0 ? Math.floor((e.x + e.w + 1) / TW) : Math.floor((e.x - 1) / TW);
  const ty0 = Math.floor(e.y / TW), ty1 = Math.floor((e.y + e.h - 0.01) / TW);
  for (let ty = ty0; ty <= ty1; ty++) if (level.solidAt(tx, ty)) return true;
  return false;
}

function onSpikes(e, level) {
  // spikes occupy the lower 10px of their tile; small horizontal inset
  const tx0 = Math.floor((e.x + 2) / TW), tx1 = Math.floor((e.x + e.w - 2) / TW);
  const ty0 = Math.floor(e.y / TW), ty1 = Math.floor((e.y + e.h - 0.01) / TW);
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++)
      if (level.spikeAt(tx, ty) && e.y + e.h > ty * TW + 6) return true;
  return false;
}

// ── PLAYER ───────────────────────────────────────────────────────────
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 10; this.h = 20;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.hp = CONFIG.HP_MAX;
    this.grounded = false;
    this.coyoteT = 0; this.bufferT = 0;
    this.dashT = 0; this.dashCd = 0; this.airDashUsed = false;
    this.slideT = 0;
    this.attackT = -1; this.attackCd = 0; this.attackHit = new Set(); this.pogoing = false;
    this.hurtT = 0; this.invulnT = 0;
    this.dropT = 0;               // one-way drop-through window
    this.velocity = 0;            // momentum meter 0..3
    this.tier = 0;
    this.animT = 0; this.runDist = 0;
    this.dead = false;
    this.ghostAcc = 0;
    this.wallDir = 0;
  }

  get maxSpeed() { return CONFIG.BASE_SPEED * CONFIG.TIER_MULT[this.tier]; }
  get attacking() { return this.attackT >= 0 && this.attackT < CONFIG.ATTACK_TIME; }
  get attackActive() {
    return this.attackT >= CONFIG.ATTACK_ACTIVE[0] && this.attackT <= CONFIG.ATTACK_ACTIVE[1];
  }

  attackBox() {
    if (this.pogoing) return { x: this.x - 3, y: this.y + this.h - 2, w: this.w + 6, h: 18 };
    const w = 26, h = 16;
    return { x: this.facing > 0 ? this.x + this.w - 2 : this.x - w + 2, y: this.y + 1, w, h };
  }

  update(dt, input, level, game) {
    if (this.dead) return;
    const C = CONFIG;

    this.coyoteT -= dt; this.dashCd -= dt; this.attackCd -= dt;
    this.invulnT -= dt; this.hurtT -= dt; this.dropT -= dt;
    if (this.attackT >= 0) {
      this.attackT += dt;
      if (this.attackT >= C.ATTACK_TIME) { this.attackT = -1; this.pogoing = false; }
    }
    if (input.jumpPressed) this.bufferT = C.BUFFER; else this.bufferT -= dt;

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const hurting = this.hurtT > 0;

    // ── dash ──
    if (input.dashPressed && this.dashCd <= 0 && this.dashT <= 0 && !hurting
        && !(this.airDashUsed && !this.grounded)) {
      // down+dash on the ground = slide (low profile)
      if (this.grounded && input.down) {
        this.slideT = C.SLIDE_TIME;
        this.vx = this.facing * C.SLIDE_SPEED;
        audio.sfx('dash');
      } else {
        this.dashT = C.DASH_TIME;
        if (dir) this.facing = dir;
        this.vx = this.facing * C.DASH_SPEED;
        this.vy = 0;
        if (!this.grounded) this.airDashUsed = true;
        audio.sfx('dash');
        FX.burst(this.x + this.w / 2, this.y + this.h - 2, ['#8d94b3', '#c22e46'], 6,
          { angle: this.facing > 0 ? Math.PI : 0, spread: 0.9, speed: 70, grav: 40, life: 0.3 });
      }
      this.dashCd = C.DASH_CD;
    }

    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.facing * C.DASH_SPEED;
      this.vy = 0;
      this.ghostAcc += dt;
      if (this.ghostAcc > 0.024) { this.ghostAcc = 0; game.spawnGhost(this); }
    } else if (this.slideT > 0) {
      this.slideT -= dt;
      this.vx = this.facing * lerp(C.SLIDE_SPEED * 0.5, C.SLIDE_SPEED, this.slideT / C.SLIDE_TIME);
      // can't stand up under a low ceiling: extend the slide
      if (this.slideT <= 0 && this.ceilingAbove(level)) this.slideT = 0.08;
    } else if (!hurting) {
      // ── run ──
      const accel = this.grounded ? C.ACCEL : C.ACCEL_AIR;
      if (dir) {
        this.facing = dir;
        const cap = this.maxSpeed;
        const movingWith = sgn(this.vx) === dir;
        if (movingWith && Math.abs(this.vx) > cap) {
          // over-cap speed (post-dash) decays gently instead of snapping
          this.vx -= dir * C.DECEL * 0.5 * dt;
          if (dir * this.vx < cap) this.vx = dir * cap;
        } else {
          // reversing gets a boost so direction flips feel crisp, not icy
          const a = movingWith ? accel : accel * C.TURN_BOOST;
          this.vx += dir * a * dt;
          if (dir * this.vx > cap) this.vx = dir * cap;
        }
      } else {
        const d = (this.grounded ? C.DECEL : C.DECEL * 0.3) * dt;
        if (Math.abs(this.vx) <= d) this.vx = 0; else this.vx -= sgn(this.vx) * d;
      }
    }

    // ── slide hitbox ──
    const sliding = this.slideT > 0;
    if (sliding && this.h !== 12) { this.y += 8; this.h = 12; }
    if (!sliding && this.h !== 20 && !this.ceilingAbove(level)) { this.y -= 8; this.h = 20; }

    // ── gravity ──
    if (this.dashT <= 0) {
      let g = C.GRAV;
      if (this.vy < 0 && input.jump) g = C.GRAV_RISE_HELD;
      this.vy += g * dt;
      // wall slide
      this.wallDir = 0;
      if (!this.grounded && this.vy > 0 && dir !== 0 && touchingWall(this, level, dir)) {
        this.wallDir = dir;
        if (this.vy > C.WALL_SLIDE) this.vy = C.WALL_SLIDE;
        if (Math.random() < 0.3)
          FX.burst(dir > 0 ? this.x + this.w : this.x, this.y + this.h * 0.6, '#8d94b3', 1,
            { speed: 20, grav: 100, life: 0.25 });
      }
      if (this.vy > C.MAX_FALL) this.vy = C.MAX_FALL;
    }

    // ── jump ──
    if (this.bufferT > 0 && !hurting) {
      if (this.grounded && input.down && this.onOneWayOnly(level)) {
        // down+jump: drop through the platform instead of jumping
        this.dropT = 0.16; this.bufferT = 0; this.grounded = false; this.coyoteT = 0;
      } else if (this.grounded || this.coyoteT > 0) {
        this.vy = -C.JUMP_V;
        this.grounded = false; this.coyoteT = 0; this.bufferT = 0;
        this.slideT = 0;
        if (this.h !== 20 && !this.ceilingAbove(level)) { this.y -= 8; this.h = 20; }
        audio.sfx('jump');
        FX.burst(this.x + this.w / 2, this.y + this.h, '#6a7194', 4, { speed: 40, grav: 60, life: 0.25, spread: 1 });
      } else if (this.wallDir !== 0) {
        this.vx = -this.wallDir * C.WALLKICK_VX;
        this.vy = -C.WALLKICK_VY;
        this.facing = -this.wallDir;
        this.bufferT = 0;
        this.airDashUsed = false;
        audio.sfx('wallkick');
        FX.burst(this.wallDir > 0 ? this.x + this.w : this.x, this.y + this.h / 2, '#c22e46', 5,
          { speed: 60, life: 0.3, grav: 80 });
      }
    }
    // variable height: releasing while rising clips the jump
    if (this.vy < -60 && !input.jump && this.dashT <= 0) this.vy *= 0.86;

    // ── attack ──
    if (input.attackPressed && !this.attacking && this.attackCd <= 0 && !hurting && this.dashT <= 0) {
      this.attackT = 0;
      this.attackCd = C.ATTACK_TIME + C.ATTACK_CD;
      this.attackHit.clear();
      this.pogoing = !this.grounded && input.down;
      audio.sfx('slash');
    }

    // ── integrate & collide ──
    const wasGrounded = this.grounded;
    const vxBefore = this.vx;
    const hitWall = moveX(this, level, this.vx * dt);
    // auto step-up: 1-tile ledges never break a sprint (dashes included)
    if (hitWall && wasGrounded && this.tryStepUp(level, vxBefore)) {
      moveX(this, level, vxBefore * dt);   // carry the motion onto the ledge
    }
    const vres = moveY(this, level, this.vy * dt, this.dropT > 0);
    this.grounded = vres === 1;
    if (this.grounded) {
      this.coyoteT = C.COYOTE;
      this.airDashUsed = false;
      if (!wasGrounded && this.vy >= 0) {
        FX.burst(this.x + this.w / 2, this.y + this.h, '#6a7194', 3, { speed: 30, grav: 60, life: 0.2 });
      }
    }

    // ── hazards ──
    if (onSpikes(this, level)) {
      this.damage(1, this.x, game, true);
    }

    // ── momentum meter ──
    const fast = Math.abs(this.vx) >= this.maxSpeed * 0.82;
    if (this.dashT > 0 || (fast && !hurting)) {
      this.velocity = Math.min(3, this.velocity + (this.grounded ? 0.5 : 0.3) * dt);
    } else if (!fast) {
      this.velocity = Math.max(0, this.velocity - 0.85 * dt);
    }
    const newTier = Math.min(3, Math.floor(this.velocity + 1e-6));
    if (newTier > this.tier) { audio.sfx('tier'); FX.burst(this.x + this.w / 2, this.y + this.h / 2, '#c22e46', 8, { speed: 70, grav: 0, life: 0.3 }); }
    this.tier = newTier;

    // top-tier afterimages
    if (this.tier >= 2 && Math.abs(this.vx) > 140 && this.dashT <= 0) {
      this.ghostAcc += dt;
      if (this.ghostAcc > 0.07) { this.ghostAcc = 0; game.spawnGhost(this); }
    }

    // animation clock
    this.animT += dt;
    this.runDist += Math.abs(this.vx) * dt;
  }

  tryStepUp(level, vxBefore) {
    const dir = sgn(vxBefore);
    if (!dir) return false;
    const txAhead = dir > 0 ? Math.floor((this.x + this.w + 0.1) / TW) : Math.floor((this.x - 0.1) / TW);
    const feetTy = Math.floor((this.y + this.h - 1) / TW);
    if (!level.solidAt(txAhead, feetTy)) return false;       // must be a 1-tile ledge
    if (level.solidAt(txAhead, feetTy - 1)) return false;
    const newY = feetTy * TW - this.h;
    const tx0 = Math.min(Math.floor(this.x / TW), txAhead);
    const tx1 = Math.max(Math.floor((this.x + this.w - 0.01) / TW), txAhead);
    for (let ty = Math.floor(newY / TW); ty < feetTy; ty++)
      for (let tx = tx0; tx <= tx1; tx++)
        if (level.solidAt(tx, ty)) return false;             // no headroom
    this.y = newY;
    this.vx = vxBefore;
    return true;
  }

  onOneWayOnly(level) {
    const tx0 = Math.floor(this.x / TW), tx1 = Math.floor((this.x + this.w - 0.01) / TW);
    const ty = Math.floor((this.y + this.h + 1) / TW);
    let oneWay = false;
    for (let tx = tx0; tx <= tx1; tx++) {
      if (level.solidAt(tx, ty)) return false;
      if (level.oneWayAt(tx, ty)) oneWay = true;
    }
    return oneWay;
  }

  ceilingAbove(level) {
    const tx0 = Math.floor(this.x / TW), tx1 = Math.floor((this.x + this.w - 0.01) / TW);
    const ty = Math.floor((this.y - 8) / TW);
    for (let tx = tx0; tx <= tx1; tx++) if (level.solidAt(tx, ty)) return true;
    return false;
  }

  damage(dmg, fromX, game, isSpike) {
    if (this.invulnT > 0 || this.dead || this.dashT > 0) return;   // dash has i-frames
    this.hp -= dmg;
    this.invulnT = CONFIG.INVULN;
    this.hurtT = 0.28;
    this.slideT = 0; this.attackT = -1;
    this.vx = (this.x + this.w / 2 < fromX ? -1 : 1) * 150;
    this.vy = -190;
    this.velocity = Math.max(0, this.velocity - 1);
    this.tier = Math.min(this.tier, Math.floor(this.velocity));
    FX.hitstop(0.06); FX.shake(3, 0.25);
    FX.burst(this.x + this.w / 2, this.y + this.h / 2, ['#c22e46', '#f4f2fa'], 10, { speed: 90, life: 0.4 });
    if (this.hp <= 0) { this.die(game); } else audio.sfx('hurt');
  }

  die(game) {
    if (this.dead) return;
    this.dead = true;
    audio.sfx('death');
    FX.shake(5, 0.5);
    FX.burst(this.x + this.w / 2, this.y + this.h / 2, ['#c22e46', '#7e1830', '#f4f2fa'], 26,
      { speed: 130, life: 0.7 });
    game.onPlayerDeath();
  }

  spriteKeyFrame() {
    const S = CONFIG;
    if (this.hurtT > 0) return ['hurt', 0];
    if (this.dashT > 0) return ['dash', 0];
    if (this.slideT > 0) return ['slide', 0];
    if (this.attacking) {
      if (this.pogoing) return ['pogo', 0];
      const t = this.attackT / S.ATTACK_TIME;
      return ['slash', t < 0.18 ? 0 : t < 0.62 ? 1 : 2];
    }
    if (!this.grounded) return [this.vy < 0 ? 'jump' : 'fall', 0];
    if (Math.abs(this.vx) > 12) return ['run', Math.floor(this.runDist / 11) % 6];
    return ['idle', Math.floor(this.animT * 1.6) % 2];
  }

  draw(ctx, camX, camY) {
    if (this.dead) return;
    if (this.invulnT > 0 && this.hurtT <= 0 && Math.floor(this.invulnT * 16) % 2 === 0) return;
    const [key, fr] = this.spriteKeyFrame();
    const set = this.facing > 0 ? SPR.player : SPR.playerL;
    const img = set[key][fr];
    // sprite is 16x24 with feet on its bottom row; hitbox is 10 wide
    const dx = Math.round(this.x - camX - 3);
    const dy = Math.round(this.y + this.h - img.height - camY);
    ctx.drawImage(img, dx, dy);
    this.drawSlashArc(ctx, camX, camY);
  }

  // crescent swipe so the attack reads at speed
  drawSlashArc(ctx, camX, camY) {
    if (!this.attacking) return;
    const t = this.attackT / CONFIG.ATTACK_TIME;
    if (t > 0.75) return;
    const cx = this.x + this.w / 2 - camX;
    const cy = this.y + this.h / 2 - camY;
    const prog = clamp(t / 0.5, 0, 1);
    const alpha = clamp(1.2 - t * 1.8, 0, 1);
    let a0, a1;
    if (this.pogoing) { a0 = Math.PI * 0.15; a1 = Math.PI * 0.85; }
    else if (this.facing > 0) { a0 = -1.25; a1 = 1.25; }
    else { a0 = Math.PI - 1.25; a1 = Math.PI + 1.25; }
    const sweep = a0 + (a1 - a0) * prog;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#f4f2fa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, this.pogoing ? 13 : 16, a0, sweep);
    ctx.stroke();
    ctx.strokeStyle = '#c22e46';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, this.pogoing ? 10 : 12, a0, sweep);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ghostSprite() {
    const [key, fr] = this.spriteKeyFrame();
    const set = this.facing > 0 ? SPR.playerSil : SPR.playerSilL;
    return set[key][fr];
  }
}

// ── ENEMIES ──────────────────────────────────────────────────────────
class Enemy {
  constructor(x, y, w, h, hp) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.hp = hp; this.dead = false;
    this.flashT = 0;
    this.touchDmg = 1;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  hit(dmg, dir, game) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flashT = 0.09;
    if (this.hp <= 0) {
      this.dead = true;
      game.onKill(this);
    } else {
      audio.sfx('hit');
      this.vx += dir * 60;
      FX.hitstop(0.03);
      FX.burst(this.cx, this.cy, '#f4f2fa', 5, { speed: 80, life: 0.25 });
    }
  }
  drawImg(ctx, img, camX, camY, ox, oy) {
    const dx = Math.round(this.x - camX + (ox || 0));
    const dy = Math.round(this.y - camY + (oy || 0));
    if (this.flashT > 0) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(silhouetteCached(img), dx, dy);
    } else {
      ctx.drawImage(img, dx, dy);
    }
  }
}

// cache white-flash variants of enemy frames
const _silCache = new Map();
function silhouetteCached(img) {
  let s = _silCache.get(img);
  if (!s) { s = silhouette(img, '#ffffff'); _silCache.set(img, s); }
  return s;
}

class Wretch extends Enemy {
  constructor(tx, ty) {
    super(tx * TW + 2, (ty + 1) * TW - 16, 12, 16, 2);
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.state = 'patrol';                 // patrol | windup | lunge | recover
    this.t = 0;
    this.animT = Math.random() * 10;
  }
  update(dt, level, player) {
    if (this.dead) return;
    this.flashT -= dt; this.t -= dt; this.animT += dt;
    const dx = player.x + player.w / 2 - this.cx;
    const dy = player.y + player.h / 2 - this.cy;
    switch (this.state) {
      case 'patrol': {
        this.vx = this.dir * 28;
        if (!player.dead && Math.abs(dx) < 96 && Math.abs(dy) < 40) {
          this.state = 'windup'; this.t = 0.34; this.vx = 0;
          this.dir = sgn(dx) || this.dir;
        }
        break;
      }
      case 'windup':
        this.vx = 0;
        if (this.t <= 0) { this.state = 'lunge'; this.t = 0.42; }
        break;
      case 'lunge':
        this.vx = this.dir * 175;
        if (this.t <= 0) { this.state = 'recover'; this.t = 0.7; }
        break;
      case 'recover':
        this.vx *= Math.pow(0.02, dt);
        if (this.t <= 0) this.state = 'patrol';
        break;
    }
    this.vy = Math.min(this.vy + 1400 * dt, 430);
    const wall = moveX(this, level, this.vx * dt);
    if (wall) this.dir = -wall;
    const g = moveY(this, level, this.vy * dt, false) === 1;
    // turn at ledges while patrolling
    if (g && this.state === 'patrol') {
      const aheadX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
      const tx = Math.floor(aheadX / TW), ty = Math.floor((this.y + this.h + 2) / TW);
      if (!level.solidAt(tx, ty) && !level.oneWayAt(tx, ty)) this.dir = -this.dir;
    }
  }
  draw(ctx, camX, camY) {
    if (this.dead) return;
    let img;
    if (this.state === 'lunge' || this.state === 'windup') {
      img = (this.dir > 0 ? SPR.wretchLungeL : SPR.wretchLunge)[0];
    } else {
      img = (this.dir > 0 ? SPR.wretchL : SPR.wretch)[Math.floor(this.animT * 6) % 2];
    }
    // art faces left; -2/-4 recenters the 16x20 frame on the 12x16 box
    this.drawImg(ctx, img, camX, camY, -2, -4);
  }
}

class Bat extends Enemy {
  constructor(tx, ty) {
    super(tx * TW + 1, ty * TW, 12, 8, 1);
    this.ax = this.x; this.ay = this.y;    // anchor
    this.state = 'hang';
    this.animT = Math.random() * 10;
  }
  update(dt, level, player) {
    if (this.dead) return;
    this.flashT -= dt; this.animT += dt;
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    const dx = px - this.cx, dy = py - this.cy;
    const dist = Math.hypot(dx, dy);
    if (this.state === 'hang') {
      this.y = this.ay + Math.sin(this.animT * 2.4) * 3;
      this.vx = this.vy = 0;
      if (!player.dead && dist < 120) { this.state = 'swoop'; audio.sfx('slash'); }
    } else {
      const sp = 128;
      if (dist > 1) {
        this.vx = damp(this.vx, (dx / dist) * sp, 3.2, dt);
        this.vy = damp(this.vy, (dy / dist) * sp + Math.sin(this.animT * 7) * 46, 3.2, dt);
      }
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (player.dead || dist > 260) this.state = 'hang';
      // drift home vertical anchor when returning
      if (this.state === 'hang') { this.ax = this.x; this.ay = this.y; }
    }
  }
  draw(ctx, camX, camY) {
    if (this.dead) return;
    const img = SPR.bat[Math.floor(this.animT * (this.state === 'hang' ? 4 : 10)) % 2];
    this.drawImg(ctx, img, camX, camY, -1, -1);
  }
}

class Gargoyle extends Enemy {
  constructor(tx, ty) {
    super(tx * TW + 1, (ty + 1) * TW - 13, 14, 13, 3);
    this.px = this.x; this.py = this.y;    // perch
    this.state = 'perch';                  // perch | dive | return
    this.t = 0;
    this.animT = Math.random() * 10;
    this.dir = -1;
  }
  update(dt, level, player) {
    if (this.dead) return;
    this.flashT -= dt; this.animT += dt;
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    const dx = px - this.cx, dy = py - this.cy;
    const dist = Math.hypot(dx, dy);
    this.dir = sgn(dx) || this.dir;
    switch (this.state) {
      case 'perch':
        this.vx = this.vy = 0;
        if (!player.dead && dist < 140 && Math.abs(dy) < 130) {
          this.state = 'dive'; this.t = 1.4;
          this.vy = -70; this.vx = sgn(dx) * 40;
        }
        break;
      case 'dive': {
        this.t -= dt;
        const sp = 165;
        if (dist > 1) {
          this.vx = damp(this.vx, (dx / dist) * sp, 2.4, dt);
          this.vy = damp(this.vy, (dy / dist) * sp, 2.4, dt);
        }
        const hitX = moveX(this, level, this.vx * dt);
        const hitY = moveY(this, level, this.vy * dt, true);
        if (this.t <= 0 || hitX || hitY || player.dead) this.state = 'return';
        break;
      }
      case 'return': {
        const rx = this.px - this.x, ry = this.py - this.y;
        const rd = Math.hypot(rx, ry);
        if (rd < 4) { this.x = this.px; this.y = this.py; this.state = 'perch'; break; }
        this.vx = (rx / rd) * 90; this.vy = (ry / rd) * 90;
        this.x += this.vx * dt; this.y += this.vy * dt;   // ghosts home through walls
        if (!player.dead && dist < 100) { this.state = 'dive'; this.t = 1.2; }
        break;
      }
    }
  }
  draw(ctx, camX, camY) {
    if (this.dead) return;
    let img;
    if (this.state === 'perch') img = (this.dir > 0 ? SPR.gargPerchL : SPR.gargPerch)[0];
    else img = SPR.gargFly[0];
    this.drawImg(ctx, img, camX, camY, -1, this.state === 'perch' ? -1 : 0);
  }
}

// ── THE BELLKEEPER'S SHADE — the boss ────────────────────────────────
// Phase 1 (hp>9): telegraphed swoop dives.
// Phase 2 (hp>4): faster dives, summons bat pairs.
// Phase 3:        rises and SLAMS, sending floor shockwaves, then lies
//                 stunned — the punish window.
class Shade extends Enemy {
  constructor(x, y) {
    super(x, y, 22, 26, 14);
    this.hpMax = 14; this.bossName = "THE BELLKEEPER'S SHADE";
    this.homeX = x; this.homeY = y;
    this.state = 'hover';       // hover | telegraph | dive | rise | slamwind | slam | stun
    this.t = 1.2;
    this.animT = 0;
    this.dir = -1;
    this.summoned = [];
    this.touchDmg = 1;
  }
  get phase() { return this.hp > 9 ? 1 : this.hp > 4 ? 2 : 3; }
  update(dt, level, player, game) {
    if (this.dead) return;
    this.flashT -= dt; this.t -= dt; this.animT += dt;
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    this.dir = sgn(px - this.cx) || this.dir;
    const speed = this.phase === 1 ? 185 : 225;
    switch (this.state) {
      case 'hover': {
        // bob near home, drift toward the player's side of the arena
        const tx = clamp(px, this.homeX - 70, this.homeX + 40);
        this.x = damp(this.x, tx - this.w / 2, 1.6, dt);
        this.y = this.homeY + Math.sin(this.animT * 2.2) * 6;
        if (this.t <= 0 && !player.dead) {
          if (this.phase === 3 && Math.random() < 0.6) { this.state = 'slamwind'; this.t = 0.8; }
          else { this.state = 'telegraph'; this.t = this.phase === 1 ? 0.55 : 0.4; audio.sfx('slash'); }
        }
        break;
      }
      case 'telegraph':
        this.flashT = Math.max(this.flashT, 0.05);   // shimmer = incoming
        this.y += Math.sin(this.animT * 26) * 0.6;
        if (this.t <= 0) {
          this.state = 'dive'; this.t = 1.1;
          const d = Math.hypot(px - this.cx, py - this.cy) || 1;
          this.vx = (px - this.cx) / d * speed;
          this.vy = (py - this.cy) / d * speed;
          audio.sfx('dash');
        }
        break;
      case 'dive': {
        const hx = moveX(this, level, this.vx * dt);
        const hy = moveY(this, level, this.vy * dt, true);
        FX.ghost(this.dir > 0 ? SPR.shadeL[1] : SPR.shade[1], this.x - 3, this.y - 4);
        if (this.t <= 0 || hx || hy) {
          this.state = 'rise'; this.t = 0;
          if (this.phase >= 2 && game) game.summonBossBats(this);
        }
        break;
      }
      case 'rise': {
        const rx = this.homeX - this.x, ry = this.homeY - this.y;
        const rd = Math.hypot(rx, ry);
        if (rd < 6) { this.state = 'hover'; this.t = this.phase === 1 ? 1.4 : 0.9; break; }
        this.x += (rx / rd) * 130 * dt;
        this.y += (ry / rd) * 130 * dt;
        break;
      }
      case 'slamwind': {
        // rise above the player and hang for a beat
        this.x = damp(this.x, px - this.w / 2, 3.5, dt);
        this.y = damp(this.y, this.homeY - 34, 3, dt);
        this.flashT = Math.max(this.flashT, 0.05);
        if (this.t <= 0) { this.state = 'slam'; this.vy = 430; audio.sfx('dash'); }
        break;
      }
      case 'slam': {
        const hy = moveY(this, level, this.vy * dt, true);
        if (hy === 1) {
          this.state = 'stun'; this.t = 2.1;
          FX.shake(5, 0.4); FX.hitstop(0.06);
          audio.bell(140, 1.6, 0.4);
          FX.burst(this.cx, this.y + this.h, ['#7fe9f5', '#e8e4f0'], 16, { speed: 100, life: 0.5, grav: 60 });
          if (game) game.spawnShockwaves(this.cx, this.y + this.h);
        }
        break;
      }
      case 'stun':
        // grounded and helpless — hit it
        if (this.t <= 0) { this.state = 'rise'; audio.sfx('slash'); }
        break;
    }
  }
  draw(ctx, camX, camY) {
    if (this.dead) return;
    const diving = this.state === 'dive' || this.state === 'slam';
    const img = (this.dir > 0 ? SPR.shadeL : SPR.shade)[diving ? 1 : 0];
    const stunned = this.state === 'stun';
    if (stunned) ctx.globalAlpha = 0.8 + Math.sin(this.animT * 10) * 0.15;
    this.drawImg(ctx, img, camX, camY, -3, stunned ? -2 : -4);
    ctx.globalAlpha = 1;
  }
  glow() {
    return { x: this.cx, y: this.cy, r: 34, color: '127,233,245', a: this.state === 'stun' ? 0.22 : 0.1 };
  }
}

// spectral shockwave running along the floor after a slam
class Shockwave {
  constructor(x, y, dir) {
    this.x = x; this.y = y - 11;
    this.w = 9; this.h = 11;
    this.vx = dir * 150;
    this.t = 2.4;
    this.dead = false;
    this.animT = Math.random() * 9;
  }
  update(dt, level) {
    this.t -= dt; this.animT += dt;
    this.x += this.vx * dt;
    const tx = Math.floor((this.vx > 0 ? this.x + this.w + 1 : this.x - 1) / TW);
    const ty = Math.floor((this.y + this.h / 2) / TW);
    if (this.t <= 0 || level.solidAt(tx, ty)) this.dead = true;
    // hug the floor over steps
    const fy = Math.floor((this.y + this.h + 1) / TW);
    if (!level.solidAt(Math.floor(this.cx() / TW), fy)) this.y += 140 * dt;
  }
  cx() { return this.x + this.w / 2; }
  draw(ctx, camX, camY) {
    if (this.dead) return;
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    const f = Math.floor(this.animT * 14) % 2;
    ctx.fillStyle = f ? '#7fe9f5' : '#e8e4f0';
    ctx.fillRect(x + 2, y + 2 + f, 5, 9 - f);
    ctx.fillStyle = '#3fa8bd';
    ctx.fillRect(x, y + 6, 9, 5);
  }
  glow() { return { x: this.cx(), y: this.y + 6, r: 16, color: '127,233,245', a: 0.14 }; }
}

class BonesProp {
  constructor(tx, ty) {
    this.x = tx * TW + 1; this.y = (ty + 1) * TW - 6;
  }
  draw(ctx, camX, camY) {
    ctx.drawImage(SPR.bones, Math.round(this.x - camX), Math.round(this.y - camY));
  }
}

// ── THE PALE HOUND — Night II hunter ─────────────────────────────────
// A spectral chaser that phases through terrain. Slow between tolls (you
// pull ahead by moving), but SURGES above your run speed while the toll
// rings — the window that gave shortcuts in Night I now bares its teeth.
// Can't be killed, only knocked back and briefly stunned by a slash.
class Hunter {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 20; this.h = 12;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.stunT = 0; this.hitCd = 0;
    this.animT = 0; this.ghostAcc = 0;
    this.dead = false;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  update(dt, level, player, game) {
    this.animT += dt; this.hitCd -= dt;
    if (this.stunT > 0) {
      this.stunT -= dt;
      this.vx *= Math.pow(0.03, dt);
      this.x += this.vx * dt;
      return;
    }
    const surge = level.tollActive;
    // surge sits just above top-tier run speed (225): a max-VELOCITY player
    // outpaces it, a sluggish one gets caught — the flame is your escape
    const sp = surge ? 235 : 100;
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    const dx = px - this.cx, dy = py - this.cy;
    const d = Math.hypot(dx, dy) || 1;
    this.vx = damp(this.vx, (dx / d) * sp, surge ? 4 : 2.4, dt);
    this.vy = damp(this.vy, (dy / d) * sp * 0.8, 3, dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (Math.abs(dx) > 4) this.facing = sgn(dx);
    // spectral trail
    this.ghostAcc += dt;
    if (this.ghostAcc > (surge ? 0.03 : 0.08)) {
      this.ghostAcc = 0;
      const sil = (this.facing > 0 ? SPR.houndSilR : SPR.houndSil)[0];
      FX.ghost(sil, this.x - 2, this.y - 2);
    }
    // contact
    if (this.hitCd <= 0 && !player.dead && player.dashT <= 0 &&
        rectsOverlap(this.x + 2, this.y + 1, this.w - 4, this.h - 2, player.x, player.y, player.w, player.h)) {
      player.damage(1, this.cx, game);
      this.hitCd = 0.9;
      this.vx = -sgn(this.vx || 1) * 140;   // recoil so it doesn't glue on
    }
  }
  stun(dir) {
    this.stunT = 0.55;
    this.vx = dir * 280;
    audio.sfx('hit');
    FX.burst(this.cx, this.cy, ['#7fe9f5', '#f4f2fa'], 9, { speed: 95, life: 0.3 });
  }
  draw(ctx, camX, camY) {
    const set = this.facing > 0 ? SPR.houndR : SPR.hound;
    const fr = Math.floor(this.animT * (this.stunT > 0 ? 4 : 13)) % 2;
    ctx.globalAlpha = this.stunT > 0 ? 0.65 : 0.95;
    // 26x16 art on a 20x12 box: center horizontally, align feet to box bottom
    ctx.drawImage(set[fr], Math.round(this.x - camX - 3), Math.round(this.y - camY - 4));
    ctx.globalAlpha = 1;
  }
  glow() { return { x: this.cx, y: this.cy, r: 24, color: '127,233,245', a: 0.15 }; }
}

// ── THE TOLLBEARER — Night II boss ───────────────────────────────────
// A grounded bruiser wearing your cracked bell as a heart. It charges
// (dodge or dash through; wall-hits stun it), and on every toll it slams
// out shockwaves. Cut the bell out of its chest.
class Tollbearer extends Enemy {
  constructor(x, y) {
    super(x, y, 28, 30, 16);
    this.hpMax = 16; this.bossName = 'THE TOLLBEARER';
    this.state = 'idle';        // idle | telegraph | charge | recover | tollslam
    this.t = 1.0;
    this.dir = -1; this.animT = 0;
    this.touchDmg = 1;
    this.summoned = [];
  }
  get phase() { return this.hp > 10 ? 1 : this.hp > 4 ? 2 : 3; }
  update(dt, level, player, game) {
    if (this.dead) return;
    this.flashT -= dt; this.t -= dt; this.animT += dt;
    this.vy = Math.min(this.vy + 1400 * dt, 430);
    const px = player.x + player.w / 2;
    if (this.state !== 'charge') this.dir = sgn(px - this.cx) || this.dir;
    switch (this.state) {
      case 'idle':
        this.vx *= Math.pow(0.05, dt);
        if (this.t <= 0 && !player.dead) { this.state = 'telegraph'; this.t = this.phase >= 3 ? 0.34 : 0.5; }
        break;
      case 'telegraph':
        this.vx = 0;
        this.flashT = Math.max(this.flashT, 0.05);
        if (this.t <= 0) {
          this.state = 'charge'; this.t = 1.5;
          this.vx = this.dir * (this.phase >= 2 ? 300 : 250);
          audio.sfx('dash'); FX.shake(1.5, 0.2);
        }
        break;
      case 'charge': {
        const hit = moveX(this, level, this.vx * dt);
        if (hit) {
          this.state = 'recover'; this.t = this.phase >= 3 ? 1.0 : 1.6;
          FX.shake(4, 0.4); FX.hitstop(0.05);
          audio.bell(150, 1.2, 0.35);
          FX.burst(this.dir > 0 ? this.x + this.w : this.x, this.cy, ['#d1a854', '#7fe9f5'], 14, { speed: 90, life: 0.4 });
        } else if (this.t <= 0) { this.state = 'idle'; this.t = 0.5; }
        break;
      }
      case 'recover':
        this.vx *= Math.pow(0.02, dt);
        if (this.t <= 0) this.state = 'idle';
        break;
      case 'tollslam':
        this.vx = 0;
        if (this.t <= 0) { this.state = 'idle'; this.t = 0.6; }
        break;
    }
    moveY(this, level, this.vy * dt, false);
  }
  onToll(game) {
    if (this.dead || this.state === 'recover' || this.state === 'charge') return;
    this.state = 'tollslam'; this.t = 0.5;
    FX.shake(4, 0.4); audio.bell(140, 1.6, 0.4);
    game.spawnShockwaves(this.cx, this.y + this.h);
    if (this.phase >= 3) game.spawnShockwaves(this.cx, this.y + this.h);   // doubled late
    FX.burst(this.cx, this.y + this.h, ['#7fe9f5', '#e8e4f0'], 16, { speed: 100, life: 0.5, grav: 60 });
  }
  draw(ctx, camX, camY) {
    if (this.dead) return;
    const img = this.dir > 0 ? SPR.tollbearerL : SPR.tollbearer;
    let ox = -3, oy = -4;
    if (this.state === 'charge') ox += this.dir * 2;
    if (this.state === 'recover') oy += 2;
    const dx = Math.round(this.x - camX + ox), dy = Math.round(this.y - camY + oy);
    if (this.flashT > 0) ctx.drawImage(silhouetteCached(img), dx, dy);
    else ctx.drawImage(img, dx, dy);
  }
  glow() { return { x: this.cx, y: this.cy - 6, r: 30, color: '127,233,245', a: this.state === 'recover' ? 0.2 : 0.12 }; }
}

// ── PROPS ────────────────────────────────────────────────────────────
class Candle {
  constructor(tx, ty) {
    this.x = tx * TW + 4; this.y = (ty + 1) * TW - 12;
    this.w = 8; this.h = 12;
    this.dead = false;
    this.animT = Math.random() * 10;
  }
  update(dt) { this.animT += dt; }
  draw(ctx, camX, camY) {
    if (this.dead) return;
    const fx = Math.round(this.x - camX), fy = Math.round(this.y - camY);
    ctx.drawImage(SPR.flame[Math.floor(this.animT * 6) % 2], fx, fy - 5);
    ctx.drawImage(SPR.candleBase, fx, fy + 1);
  }
  glow() { return { x: this.x + 4, y: this.y - 2, r: 22, color: '255,155,47', a: 0.16 + Math.sin(this.animT * 6) * 0.03 }; }
}

class Spark {
  constructor(tx, ty) {
    this.x = tx * TW + 4.5; this.y = ty * TW + 4;
    this.w = 7; this.h = 7;
    this.dead = false;
    this.animT = Math.random() * 10;
  }
  update(dt) { this.animT += dt; }
  bobY() { return this.y + Math.sin(this.animT * 3) * 2; }
  draw(ctx, camX, camY) {
    if (this.dead) return;
    ctx.drawImage(SPR.spark[Math.floor(this.animT * 5) % 2], Math.round(this.x - camX), Math.round(this.bobY() - camY));
  }
  glow() { return { x: this.x + 3, y: this.bobY() + 3, r: 14, color: '127,233,245', a: 0.12 }; }
}

class Heart {
  constructor(tx, ty) {
    this.x = tx * TW + 4; this.y = ty * TW + 4;
    this.w = 8; this.h = 7;
    this.dead = false;
    this.animT = Math.random() * 10;
  }
  update(dt) { this.animT += dt; }
  bobY() { return this.y + Math.sin(this.animT * 2.6) * 2; }
  draw(ctx, camX, camY) {
    if (this.dead) return;
    ctx.drawImage(SPR.heart, Math.round(this.x - camX), Math.round(this.bobY() - camY));
  }
  glow() { return { x: this.x + 4, y: this.bobY() + 3, r: 16, color: '255,107,143', a: 0.12 }; }
}

class Checkpoint {
  constructor(tx, ty, whisper) {
    this.x = tx * TW + 3; this.y = (ty + 1) * TW - 16;
    this.w = 10; this.h = 16;
    this.active = false;
    this.animT = 0;
    this.whisper = whisper || null;
  }
  update(dt) { this.animT += dt; }
  draw(ctx, camX, camY) {
    ctx.drawImage(this.active ? SPR.lanternOn : SPR.lanternOff,
      Math.round(this.x - camX), Math.round(this.y - camY));
  }
  glow() {
    if (!this.active) return null;
    return { x: this.x + 5, y: this.y + 7, r: 26, color: '127,233,245', a: 0.16 + Math.sin(this.animT * 4) * 0.04 };
  }
}

class Bell {
  constructor(tx, ty) {
    this.w = 52; this.h = 52;
    this.x = tx * TW + TW / 2 - this.w / 2;
    this.y = ty * TW;
    this.hits = 3;
    this.sway = 0; this.swayV = 0;
    this.rung = false;
    this.locked = true;          // the Shade holds it until it falls
  }
  update(dt) {
    // damped pendulum on the x offset
    this.swayV += -this.sway * 30 * dt;
    this.swayV *= Math.pow(0.4, dt);
    this.sway += this.swayV * dt;
  }
  strike(game) {
    if (this.rung) return;
    if (this.locked) {
      // a dead thud — the Shade still holds the night
      this.swayV = 20;
      audio.sfx('hit');
      if (game) game.whisperNow('THE SHADE HOLDS THE BELL');
      return;
    }
    this.hits--;
    this.swayV = 90;
    FX.shake(4, 0.4); FX.hitstop(0.08);
    FX.burst(this.x + this.w / 2, this.y + this.h / 2, ['#d1a854', '#ffe27a'], 18, { speed: 120, life: 0.6, grav: 60 });
    if (this.hits <= 0) {
      this.rung = true;
      audio.sfx('bellFinal');
      game.onWin();
    } else {
      audio.sfx('bell');
    }
  }
  draw(ctx, camX, camY) {
    ctx.drawImage(SPR.bell, 0, 0, 26, 26,
      Math.round(this.x - camX + this.sway), Math.round(this.y - camY), 52, 52);
  }
  glow() { return { x: this.x + this.w / 2, y: this.y + this.h / 2, r: 40, color: '209,168,84', a: 0.1 }; }
}

class SignProp {
  constructor(tx, ty, up) {
    this.x = tx * TW + 2; this.y = (ty + 1) * TW - 12;
    this.up = up;
  }
  draw(ctx, camX, camY) {
    ctx.drawImage(this.up ? SPR.signUp : SPR.signDown, Math.round(this.x - camX), Math.round(this.y - camY));
  }
}
