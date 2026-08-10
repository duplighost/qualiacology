/* boss.js — ABBESS IONE, THE THIRTEENTH VOICE.
 *
 * Six patterns, each answered by a different one of your moves, dealt out in
 * three phases. She is always hittable except behind the halo — a boss you
 * cannot punish is a boss you cannot learn.
 *
 *   sweep   a chain of bells swung at chest height   -> CROUCH
 *   lunge   she crosses the floor in one motion      -> QUICKSTEP or jump
 *   bells   three bells drop on marked ground        -> read the marks, move
 *   slam    two shockwaves along the floor           -> JUMP
 *   halo    a ring of bells orbits her, with a gap   -> enter through the gap
 *   storm   smoke fills the arena, safe pockets      -> stand in the clear
 */

import { clamp, lerp, TAU, smoothstep, withAlpha, overlaps } from './core.js';
import { FAIR } from './config.js';
import { drawAbbess, ABB, ABBESS_SCALE } from './art/atlas.js';
import { glowDot } from './art/paint.js';

const PATTERNS = {
  sweep: { frame: ABB.SWEEP, tell: 0.62, active: 0.42, recover: 0.70, damage: 16 },
  lunge: { frame: ABB.LUNGE, tell: 0.54, active: 0.46, recover: 0.78, damage: 18 },
  bells: { frame: ABB.BELLS, tell: 0.78, active: 0.30, recover: 0.62, damage: 15 },
  slam: { frame: ABB.SLAM, tell: 0.70, active: 0.26, recover: 0.74, damage: 18 },
  halo: { frame: ABB.HALO, tell: 0.66, active: 2.20, recover: 0.86, damage: 14 },
  storm: { frame: ABB.STORM, tell: 0.80, active: 2.60, recover: 0.92, damage: 12 },
};

const PHASE_SETS = [
  ['sweep', 'bells', 'lunge'],
  ['sweep', 'lunge', 'slam', 'bells', 'halo'],
  ['lunge', 'slam', 'halo', 'storm', 'sweep', 'bells'],
];

export class Boss {
  constructor(game, arena) {
    this.arena = arena;
    this.title = 'ABBESS IONE · THE THIRTEENTH VOICE';
    this.maxHp = 620;
    this.hp = this.maxHp;
    this.phases = 3;
    this.phase = 1;
    this.w = 74;
    this.h = 128;
    this.x = arena.x + arena.w * 0.68;
    this.y = arena.y + arena.h - this.h;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.state = 'entrance';
    this.timer = 1.6;
    this.pattern = null;
    this.lastPattern = null;
    this.cycle = 0;
    this.flash = 0;
    this.vulnerable = true;
    this.defeated = false;
    this.deathTimer = 0;
    this.haloAngle = 0;
    this.marks = [];
    this.pockets = [];
    this.hitCooldown = 0;
  }

  body() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  hurt(game, amount) {
    if (this.defeated || !this.vulnerable) return;
    this.hp -= amount;
    this.flash = 1;
    const nextPhase = this.hp > this.maxHp * 0.66 ? 1 : this.hp > this.maxHp * 0.33 ? 2 : 3;
    if (nextPhase !== this.phase) {
      this.phase = nextPhase;
      this.state = 'shift';
      this.timer = 1.2;
      this.vulnerable = false;
      game.flash(0.7);
      game.shake(9);
      game.sound('toll');
      game.particles.burst(this.x + this.w * 0.5, this.y + this.h * 0.5, '#e6d2ff', 34, 300, 'spark', { life: 0.9 });
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.defeated = true;
      this.state = 'fallen';
      this.deathTimer = 0;
      this.vulnerable = false;
      game.onBossDefeated();
    }
  }
}

export function updateBoss(game, b, dt) {
  b.cycle += dt;
  b.flash = Math.max(0, b.flash - dt * 4);
  const p = game.player;
  const px = p.x + p.w * 0.5;
  const cx = b.x + b.w * 0.5;

  if (b.defeated) {
    b.deathTimer += dt;
    if (b.deathTimer < 2.4 && Math.random() < 0.25) {
      game.particles.burst(b.x + Math.random() * b.w, b.y + Math.random() * b.h,
        '#e8dcff', 4, 120, 'ember', { life: 1.1, gravity: -40 });
    }
    return;
  }

  if (Math.abs(px - cx) > 12 && b.state !== 'lungeGo') b.facing = px < cx ? -1 : 1;

  b.timer -= dt;

  switch (b.state) {
    case 'entrance':
      if (b.timer <= 0) { pick(game, b); }
      break;

    case 'shift':
      b.vx = 0;
      if (b.timer <= 0) { b.vulnerable = true; pick(game, b); }
      break;

    case 'idle': {
      /* she drifts to keep a duelling distance, never cornering you */
      const want = clamp(px + (px < b.arena.x + b.arena.w * 0.5 ? 210 : -210),
        b.arena.x + 60, b.arena.x + b.arena.w - 60 - b.w);
      b.x = lerp(b.x, want, 1 - Math.exp(-1.6 * dt));
      b.y = lerp(b.y, b.arena.y + b.arena.h - b.h - Math.sin(b.cycle * 1.4) * 6, 1 - Math.exp(-3 * dt));
      if (b.timer <= 0) pick(game, b);
      break;
    }

    case 'tell':
      if (b.pattern === 'bells' && b.marks.length === 0) layBellMarks(game, b);
      if (b.timer <= 0) begin(game, b);
      break;

    case 'active':
      runActive(game, b, dt);
      if (b.timer <= 0) {
        b.state = 'recover';
        b.timer = Math.max(PATTERNS[b.pattern].recover * (b.phase === 3 ? 0.78 : 1), FAIR.MIN_RECOVERY);
        b.vulnerable = true;
        b.marks.length = 0;
        b.pockets.length = 0;
      }
      break;

    case 'recover':
      b.vx *= 1 - 5 * dt;
      b.x += b.vx * dt;
      if (b.timer <= 0) {
        b.state = 'idle';
        b.timer = b.phase === 3 ? 0.34 : b.phase === 2 ? 0.5 : 0.72;
      }
      break;

    default: break;
  }

  b.x = clamp(b.x, b.arena.x + 20, b.arena.x + b.arena.w - b.w - 20);
}

function pick(game, b) {
  const set = PHASE_SETS[b.phase - 1];
  let choice = set[Math.floor(Math.random() * set.length)];
  let guard = 0;
  while (choice === b.lastPattern && guard < 6) { choice = set[Math.floor(Math.random() * set.length)]; guard += 1; }
  b.lastPattern = choice;
  b.pattern = choice;
  b.state = 'tell';
  b.timer = Math.max(PATTERNS[choice].tell * (b.phase === 3 ? 0.84 : 1), FAIR.MIN_TELEGRAPH);
  b.tellMax = b.timer;
  b.marks = [];
  b.pockets = [];
  game.sound('tell', 0.8);
}

function begin(game, b) {
  const spec = PATTERNS[b.pattern];
  b.state = 'active';
  b.timer = spec.active;
  b.activeMax = spec.active;
  game.enemyCommitFlash({ x: b.x, y: b.y, w: b.w, h: b.h });

  switch (b.pattern) {
    case 'lunge':
      b.vx = b.facing * 620;
      game.sound('thrust');
      break;
    case 'slam': {
      const groundY = b.arena.y + b.arena.h;
      for (const dir of [-1, 1]) {
        game.spawnProjectile({
          kind: 'shock', x: b.x + b.w * 0.5, y: groundY - 14,
          vx: dir * 300, vy: 0, w: 34, h: 28, r: 17,
          damage: PATTERNS.slam.damage, life: 3, wave: true, ground: true,
        });
      }
      game.shake(9);
      game.sound('slam');
      break;
    }
    case 'bells':
      for (const m of b.marks) {
        game.spawnProjectile({
          kind: 'bellfall', x: m.x, y: b.arena.y - 40,
          vx: 0, vy: 120, gravity: 900, r: 13,
          damage: PATTERNS.bells.damage, life: 3.4, sticks: false,
        });
      }
      game.sound('bellSwing');
      break;
    case 'halo':
      b.haloAngle = 0;
      b.vulnerable = false;   /* the ring is her guard — go through the gap */
      game.sound('noteHigh');
      break;
    case 'storm':
      layPockets(game, b);
      game.sound('toll');
      break;
    case 'sweep':
    default:
      game.sound('bellSwing');
      break;
  }
}

function runActive(game, b, dt) {
  switch (b.pattern) {
    case 'lunge': {
      b.x += b.vx * dt;
      const lim0 = b.arena.x + 20;
      const lim1 = b.arena.x + b.arena.w - b.w - 20;
      if (b.x <= lim0 || b.x >= lim1) {
        b.x = clamp(b.x, lim0, lim1);
        b.vx = 0;
        b.timer = Math.min(b.timer, 0.05);
        game.shake(6);
        game.particles.burst(b.x + b.w * 0.5, b.y + b.h, '#e0d4ff', 16, 240, 'dust', { life: 0.6 });
      }
      break;
    }
    case 'halo':
      b.haloAngle += dt * 2.1;
      break;
    case 'storm':
      if (Math.random() < 0.4) {
        game.particles.burst(
          b.arena.x + Math.random() * b.arena.w,
          b.arena.y + b.arena.h - Math.random() * 120,
          '#cfc4e6', 2, 40, 'smoke', { life: 1.6, gravity: -20, r: 9 },
        );
      }
      break;
    default: break;
  }
}

function layBellMarks(game, b) {
  const p = game.player;
  const px = p.x + p.w * 0.5;
  b.marks = [
    { x: clamp(px, b.arena.x + 40, b.arena.x + b.arena.w - 40) },
    { x: clamp(px - 150, b.arena.x + 40, b.arena.x + b.arena.w - 40) },
    { x: clamp(px + 150, b.arena.x + 40, b.arena.x + b.arena.w - 40) },
  ];
}

function layPockets(game, b) {
  const n = 3;
  b.pockets = [];
  for (let i = 0; i < n; i += 1) {
    b.pockets.push({
      x: b.arena.x + 90 + (b.arena.w - 180) * ((i + 0.5) / n) + (Math.random() - 0.5) * 60,
      r: 52,
    });
  }
}

/* ------------------------------------------------------------------ */

export function bossHitboxes(b) {
  if (b.defeated || b.state !== 'active') return [];
  const cx = b.x + b.w * 0.5;
  const cy = b.y + b.h * 0.5;
  const out = [];
  switch (b.pattern) {
    case 'sweep': {
      /* chest height, both sides, deliberately duckable */
      const reach = 190;
      out.push({ x: cx - reach, y: b.y + 26, w: reach * 2, h: 34, damage: PATTERNS.sweep.damage });
      break;
    }
    case 'lunge':
      out.push({ x: b.x + 4, y: b.y + 6, w: b.w - 8, h: b.h - 10, damage: PATTERNS.lunge.damage });
      break;
    case 'halo': {
      for (let i = 0; i < 8; i += 1) {
        const a = b.haloAngle + (i / 8) * TAU;
        /* one gap: skip the link nearest the bottom-front */
        if (i === 5) continue;
        const r = 104;
        out.push({
          x: cx + Math.cos(a) * r - 14, y: cy + Math.sin(a) * r - 14,
          w: 28, h: 28, damage: PATTERNS.halo.damage,
        });
      }
      break;
    }
    case 'storm': {
      /* everywhere except the pockets */
      const y = b.arena.y + b.arena.h - 90;
      for (let x = b.arena.x; x < b.arena.x + b.arena.w; x += 40) {
        const safe = b.pockets.some((pk) => Math.abs(pk.x - (x + 20)) < pk.r);
        if (safe) continue;
        out.push({ x, y, w: 40, h: 96, damage: PATTERNS.storm.damage });
      }
      break;
    }
    default: break;
  }
  return out;
}

/* ------------------------------------------------------------------ */

export function drawBoss(ctx, b, env) {
  if (!b) return;
  const cx = b.x + b.w * 0.5;
  const feet = b.y + b.h;
  const telling = b.state === 'tell';
  const tp = telling ? clamp(1 - b.timer / (b.tellMax || 1), 0, 1) : 0;

  /* the ground she stands on remembers her */
  glowDot(ctx, cx, feet, 96, '#d9c3ff', 0.12 + Math.sin(b.cycle * 1.6) * 0.03);

  /* Where a bell is about to fall, the floor is lit. Not a marker ring and a
   * dashed line — the bells are coming down out of the dark and the light
   * arrives first, which is a thing that happens rather than a diagram. */
  if (b.marks.length) {
    const k = smoothstep(tp);
    const floor = b.arena.y + b.arena.h;
    for (const m of b.marks) {
      glowDot(ctx, m.x, floor - 6, 30 + k * 26, '#ffe9b8', 0.10 + k * 0.30);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const shaft = ctx.createLinearGradient(0, floor - 150, 0, floor);
      shaft.addColorStop(0, 'rgba(255,233,184,0)');
      shaft.addColorStop(1, withAlpha('#ffe9b8', 0.06 + k * 0.16));
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(m.x - 10, floor - 150);
      ctx.lineTo(m.x + 10, floor - 150);
      ctx.lineTo(m.x + 26, floor);
      ctx.lineTo(m.x - 26, floor);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  /* The safe places in the storm are where the smoke is not: clear air with
   * the light still reaching the floor. No outline — you read it the way you
   * read a gap in fog. */
  if (b.pattern === 'storm' && (b.state === 'tell' || b.state === 'active') && b.pockets.length) {
    const floor = b.arena.y + b.arena.h;
    for (const pk of b.pockets) {
      glowDot(ctx, pk.x, floor - 40, pk.r * 1.15, '#eaf7ff', 0.16);
      glowDot(ctx, pk.x, floor - 6, pk.r * 0.8, '#eaf7ff', 0.12);
    }
  }

  ctx.save();
  ctx.translate(cx, feet);
  if (b.defeated) ctx.globalAlpha = clamp(1 - (b.deathTimer - 2.4) / 1.2, 0, 1);
  ctx.scale(-b.facing, 1);   /* the sheet faces right; she looks at you */
  if (telling) {
    const k = smoothstep(tp);
    ctx.scale(1 + k * 0.05, 1 - k * 0.03);
  }
  const frame = b.defeated ? ABB.FALLEN
    : b.state === 'tell' || b.state === 'active' ? PATTERNS[b.pattern].frame
      : ABB.IDLE;
  const ok = drawAbbess(ctx, frame, { telegraph: telling, flash: b.flash > 0.6 });
  if (!ok) {
    ctx.fillStyle = 'rgba(28,20,40,.9)';
    ctx.fillRect(-b.w * 0.5, -b.h, b.w, b.h);
  }
  ctx.restore();

  /* the halo ring, with its one gap drawn as an actual gap */
  if (b.pattern === 'halo' && b.state === 'active') {
    const cy = b.y + b.h * 0.5;
    ctx.save();
    for (let i = 0; i < 8; i += 1) {
      if (i === 5) continue;
      const a = b.haloAngle + (i / 8) * TAU;
      const x = cx + Math.cos(a) * 104;
      const y = cy + Math.sin(a) * 104;
      glowDot(ctx, x, y, 20, '#ffe9b8', 0.35);
      ctx.fillStyle = '#c9a962';
      ctx.beginPath();
      ctx.moveTo(x, y - 9); ctx.quadraticCurveTo(x + 10, y - 2, x + 8, y + 8);
      ctx.lineTo(x - 8, y + 8); ctx.quadraticCurveTo(x - 10, y - 2, x, y - 9);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#f4e2ab'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
  }

  /* Nothing else is drawn over her. The sweep used to get a hatched band
   * and every wind-up got a filling tick above her head; both were interface
   * pasted onto a painting. Her SWEEP pose already fans the bell-chain out to
   * its full width before it travels, which is the same information.
   */
}
