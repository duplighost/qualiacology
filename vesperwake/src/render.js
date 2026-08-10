/* render.js — draw order is the design.
 *
 *   far matte  ->  mid architecture  ->  fog  ->  back props  ->  gorge
 *   ->  terrain  ->  props  ->  pickups  ->  enemies  ->  Sabine
 *   ->  projectiles + particles  ->  FRONT props  ->  near weather
 *   ->  ONE GRADE OVER ALL OF IT  ->  HUD
 *
 * The grade is the point. Anything drawn before it shares a photograph with
 * the painting; anything after it is interface.
 */

import { VIEW_W, VIEW_H, CAM } from './config.js';
import { clamp, lerp, damp, TAU, withAlpha, smoothstep } from './core.js';
import { drawSabine, drawSabineFallback, SAB, SABINE_SCALE } from './art/atlas.js';
import { drawChainWhip } from './art/fx.js';
import { drawEnemyEntity } from './enemies.js';
import { whipTip, attackPhase, ATTACK, playerFrame } from './player.js';
import { groundShadow, glowDot, withAlpha as wa } from './art/paint.js';

export class Camera {
  constructor() {
    this.x = 0; this.y = 0;
    this.baseY = 0;
    this.look = 0;
    this.shake = 0;
    this.shakeX = 0; this.shakeY = 0;
    this.minY = -Infinity; this.maxY = Infinity;
  }

  snap(p, level) {
    this.x = clamp(p.x + p.w * 0.5 - VIEW_W * 0.5, 0, Math.max(0, level.width - VIEW_W));
    this.baseY = p.y + p.h - VIEW_H * 0.66;
    this.y = this.baseY;
  }

  update(p, level, dt) {
    const targetLook = (Math.abs(p.vx) > 40 ? Math.sign(p.vx) : 0) * CAM.LOOK_AHEAD;
    this.look = damp(this.look, targetLook, CAM.LOOK_LERP, dt);

    const wantX = p.x + p.w * 0.5 + this.look - VIEW_W * 0.5;
    if (Math.abs(wantX - this.x) > CAM.DEAD_X) {
      this.x = damp(this.x, wantX, CAM.FOLLOW_X, dt);
    }
    this.x = clamp(this.x, 0, Math.max(0, level.width - VIEW_W));

    /* vertical anchors to the last ground height so falling does not swing */
    if (p.grounded) this.baseY = p.y + p.h - VIEW_H * (1 - CAM.GROUND_BIAS) - 30;
    const wantY = lerp(this.baseY, p.y + p.h - VIEW_H * (1 - CAM.GROUND_BIAS) - 30, 0.34);
    if (Math.abs(wantY - this.y) > CAM.DEAD_Y) {
      this.y = damp(this.y, wantY, CAM.FOLLOW_Y, dt);
    }
    this.y = clamp(this.y, level.camMinY ?? -400, level.camMaxY ?? (level.height - VIEW_H + 200));

    this.shake = Math.max(0, this.shake - CAM.SHAKE_DECAY * dt * (1 + this.shake * 0.12));
    const s = Math.min(this.shake, CAM.MAX_SHAKE);
    this.shakeX = (Math.random() - 0.5) * s * 2;
    this.shakeY = (Math.random() - 0.5) * s * 1.4;
  }

  add(n) { this.shake = Math.min(CAM.MAX_SHAKE, this.shake + n); }

  get ox() { return Math.round(this.x + this.shakeX); }
  get oy() { return Math.round(this.y + this.shakeY); }
}

/* ------------------------------------------------------------------ */

export function renderGame(game, ctx) {
  const { level, painter, backdrop, camera: cam, player: p } = game;
  const env = {
    palette: backdrop.palette,
    time: game.worldTime,
    camera: cam,
    level,
    game,
  };

  ctx.save();
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  /* --- distance --- */
  backdrop.drawFar(ctx, cam);
  backdrop.drawMid(ctx, cam);
  backdrop.drawWeather(ctx, false);

  /* --- world space --- */
  ctx.save();
  ctx.translate(-cam.ox, -cam.oy);

  const view = { x: cam.ox - 90, y: cam.oy - 120, w: VIEW_W + 180, h: VIEW_H + 260 };
  const vis = (o, pad = 0) =>
    o.x + (o.w ?? 120) > view.x - pad && o.x < view.x + view.w + pad
    && (o.y ?? 0) + (o.h ?? 400) > view.y - pad && (o.y ?? 0) < view.y + view.h + pad;

  for (const b of level.back) if (vis(b, 320)) painter.paintProp(ctx, b, env);
  for (const hz of level.hazards) if (vis(hz)) painter.paintHazard(ctx, hz, env);

  for (const s of level.solids) if (vis(s)) painter.paintSolid(ctx, s, env);
  for (const l of level.ledges) if (vis(l, 60)) painter.paintLedge(ctx, l, env);
  for (const c of level.crumbles) {
    if (c.state === 'gone' || !vis(c, 60)) continue;
    painter.paintCrumble(ctx, c, env);
  }
  for (const m of level.movers) if (vis(m, 80)) painter.paintMover(ctx, m, env);
  for (const b of level.breakables) if (!b.dead && vis(b, 40)) painter.paintBreakable(ctx, b, env);

  for (const pr of level.props) if (vis(pr, 260)) painter.paintProp(ctx, pr, env);
  for (const c of level.checkpoints) if (vis(c, 160)) painter.paintProp(ctx, { kind: 'sundisc', x: c.x, y: c.y, lit: c.lit }, env);

  drawPickups(ctx, game, env);
  drawGates(ctx, game, env);
  drawDoorAndExit(ctx, game, env);

  /* actors */
  for (const e of game.enemies) {
    if (!vis(e, 120)) continue;
    if (!e.dead) groundShadow(ctx, e.x + e.w * 0.5, shadowY(game, e), e.w * 0.62, 0.36);
    drawEnemyEntity(ctx, e, env);
  }
  if (game.boss) game.drawBoss(ctx, env);

  drawPlayer(ctx, game, p, env);
  drawProjectiles(ctx, game, env);
  game.particles.draw(ctx);

  /* --- in front of everything in the world --- */
  for (const f of level.front) if (vis(f, 520)) painter.paintFront(ctx, f, env);

  ctx.restore();

  backdrop.drawWeather(ctx, true);
  backdrop.grade(ctx, {
    time: game.worldTime,
    flash: game.screenFlash,
    damage: game.damageVeil,
    vignette: 0.52,
  });
  ctx.restore();
}

function shadowY(game, e) {
  const g = game.groundUnder(e.x + e.w * 0.5, e.y);
  return g === null ? e.y + e.h : g;
}

/* ------------------------------------------------------------------ *
 * Sabine
 * ------------------------------------------------------------------ */

function drawPlayer(ctx, game, p, env) {
  const cx = p.x + p.w * 0.5;
  const feet = p.y + p.h;
  const gy = game.groundUnder(cx, p.y);
  if (gy !== null) groundShadow(ctx, cx, gy, 22 + (1 - clamp((gy - feet) / 180, 0, 1)) * 12, 0.42 * clamp(1 - (gy - feet) / 220, 0.12, 1));

  /* quickstep after-images */
  if (p.stepTime > 0 || p.perfectFlash > 0) {
    for (let i = 1; i <= 3; i += 1) {
      const g = game.ghosts.back(i * 2);
      if (!g) continue;
      ctx.save();
      ctx.globalAlpha = (0.24 - i * 0.06) * (p.stepTime > 0 ? 1 : p.perfectFlash);
      ctx.translate(g.x, g.y);
      ctx.scale(g.facing, 1);
      drawSabine(ctx, g.frame, { crouch: g.crouch, ghost: true, alpha: 1 });
      ctx.restore();
    }
  }

  const f = playerFrame(p, game.input);
  /* only the brief post-hit invulnerability strobes; a long grace period
   * (a respawn, a debug warp) must not turn her into a flicker */
  const invulnBlink = p.invuln > 0 && p.invuln < 1.6 && Math.floor(p.invuln * 22) % 2 === 0 && p.hitstun <= 0;

  ctx.save();
  ctx.translate(cx, feet);
  const squash = p.landSquash;
  if (squash > 0) {
    const k = smoothstep(squash) * 0.16;
    ctx.scale(1 + k, 1 - k);
  }
  if (f.dive) ctx.rotate(0.16 * p.facing);
  ctx.scale(p.facing, 1);
  ctx.globalAlpha = invulnBlink ? 0.34 : 1;

  /* rim first, offset toward the area's key light */
  ctx.save();
  ctx.translate(2.6 * p.facing, -2.4);
  drawSabine(ctx, f.frame, { crouch: f.crouch, rim: 0.30 });
  ctx.restore();

  const drew = drawSabine(ctx, f.frame, {
    crouch: f.crouch,
    flash: p.flash > 0.55 || p.perfectFlash > 0.7,
    ghost: p.sunstrikeReady,
  });
  if (!drew) drawSabineFallback(ctx, p.w, p.h);
  ctx.restore();

  drawWhip(ctx, game, p, env);

  if (p.sunstrikeReady) {
    const pulse = 0.5 + Math.sin(game.worldTime * 7) * 0.5;
    glowDot(ctx, cx, p.y + p.h * 0.45, 40 + pulse * 8, '#ffeaa8', 0.13 + pulse * 0.07);
  }
  if (p.perfectFlash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = p.perfectFlash * 0.6;
    ctx.strokeStyle = '#e8fbff';
    ctx.lineWidth = 2.5;
    const r = lerp(18, 84, 1 - p.perfectFlash);
    ctx.beginPath(); ctx.arc(cx, p.y + p.h * 0.5, r, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

function drawWhip(ctx, game, p, env) {
  if (p.attack === ATTACK.NONE) return;
  const ph = attackPhase(p);
  const tip = whipTip(p);
  if (!ph || !tip) return;
  const hand = {
    x: p.x + p.w * 0.5 + p.facing * (p.crouching ? 5 : 8),
    y: p.y + (p.crouching ? p.h * 0.36 : p.h * 0.34),
  };
  const hot = p.sunstrikeArmed;
  const alpha = ph.stage === 'recovery' ? 1 - ph.t * 0.8 : 1;

  /* The chain and its clapper are the weapon. There used to be a bright arc
   * drawn through wherever the strike landed — a diagram of the hit rather
   * than the hit. The chain, the impact sparks and the hitstop do the job. */
  ctx.save();
  ctx.globalAlpha = alpha;
  const diving = p.attack === ATTACK.DIVE;
  drawChainWhip(ctx, hand, tip, {
    links: diving ? Math.round(game.chainLinks * 0.68) : game.chainLinks,
    hot,
    t: ph.stage === 'active' ? 1 : ph.t,
    sag: diving ? 2 : 10,
    weight: diving ? 1.5 : 1,
    colour: hot ? '#ffeeb4' : '#cfdcda',
  });
  ctx.restore();
}

/* ------------------------------------------------------------------ */

function drawProjectiles(ctx, game, env) {
  for (const pr of game.projectiles) {
    ctx.save();
    ctx.translate(pr.x, pr.y);
    switch (pr.kind) {
      case 'shard': {
        ctx.rotate(Math.atan2(pr.vy, pr.vx));
        /* the trail first, so the shard reads as travelling */
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const tg = ctx.createLinearGradient(-26, 0, 2, 0);
        tg.addColorStop(0, 'rgba(180,225,255,0)');
        tg.addColorStop(1, 'rgba(200,236,255,.5)');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(-26, 0); ctx.lineTo(2, -2.6); ctx.lineTo(2, 2.6);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        glowDot(ctx, 0, 0, 11, '#cfe9ff', 0.34);
        ctx.fillStyle = 'rgba(226,244,255,.94)';
        ctx.beginPath();
        ctx.moveTo(6.4, 0); ctx.lineTo(0, 3.1); ctx.lineTo(-3.4, 0); ctx.lineTo(0, -3.1);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.7; ctx.stroke();
        break;
      }
      case 'noteHigh':
      case 'noteLow': {
        const high = pr.kind === 'noteHigh';
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = 'rgba(232,246,242,.85)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, pr.w * 0.5, pr.h * 0.5, 0, 0, TAU);
        ctx.stroke();
        /* shape carries high vs low: chevrons point the way you must go */
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i += 1) {
          const yy = high ? -pr.h * 0.5 - 4 : pr.h * 0.5 + 4;
          const dir = high ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(i * 8 - 5, yy + dir * 5);
          ctx.lineTo(i * 8, yy);
          ctx.lineTo(i * 8 + 5, yy + dir * 5);
          ctx.stroke();
        }
        break;
      }
      case 'shock': {
        ctx.globalCompositeOperation = 'screen';
        const g = ctx.createLinearGradient(0, -pr.h * 0.5, 0, pr.h * 0.5);
        g.addColorStop(0, 'rgba(255,236,178,.06)');
        g.addColorStop(1, 'rgba(255,228,150,.7)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-pr.w * 0.5, pr.h * 0.5);
        ctx.lineTo(0, -pr.h * 0.5);
        ctx.lineTo(pr.w * 0.5, pr.h * 0.5);
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'anchor': {
        ctx.fillStyle = '#3d434c';
        ctx.strokeStyle = '#a9b5b3'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill(); ctx.stroke();
        for (let i = 0; i < 3; i += 1) {
          const a = -0.6 + i * 0.6;
          ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15 + 6); ctx.stroke();
        }
        if (pr.stuck) glowDot(ctx, 0, 0, 22, '#ffe6b0', 0.22);
        break;
      }
      case 'bellfall': {
        glowDot(ctx, 0, 0, 22, '#ffe9b8', 0.3);
        ctx.fillStyle = '#c9a962';
        ctx.beginPath();
        ctx.moveTo(0, -10); ctx.quadraticCurveTo(11, -2, 9, 9);
        ctx.lineTo(-9, 9); ctx.quadraticCurveTo(-11, -2, 0, -10);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#f2dda0'; ctx.lineWidth = 1.2; ctx.stroke();
        break;
      }
      default: {
        glowDot(ctx, 0, 0, pr.r * 2.4, '#e7f4ff', 0.4);
        ctx.fillStyle = '#eef8ff';
        ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.7, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }
}

function drawPickups(ctx, game, env) {
  const t = game.worldTime;
  for (const k of game.level.pickups) {
    if (k.taken) continue;
    const bob = Math.sin(t * 2.4 + k.bob) * 4;
    const x = k.x; const y = k.y + bob;
    ctx.save();
    switch (k.kind) {
      case 'heart':
        glowDot(ctx, x, y, 22, '#ffd0e0', 0.32);
        ctx.fillStyle = '#f5c9d8';
        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.quadraticCurveTo(x - 9, y - 2, x - 4.4, y - 6);
        ctx.quadraticCurveTo(x, y - 8, x, y - 3);
        ctx.quadraticCurveTo(x, y - 8, x + 4.4, y - 6);
        ctx.quadraticCurveTo(x + 9, y - 2, x, y + 6);
        ctx.fill();
        break;
      case 'dust': {
        const a = 0.5 + Math.sin(t * 5 + k.bob) * 0.5;
        glowDot(ctx, x, y, 12 + a * 4, '#ffe6a0', 0.40);
        ctx.fillStyle = '#fff3c8';
        ctx.beginPath(); ctx.arc(x, y, 2.1 + a * 0.7, 0, TAU); ctx.fill();
        break;
      }
      case 'relic':
        glowDot(ctx, x, y, 34, '#ffeaa8', 0.4);
        ctx.save();
        ctx.translate(x, y); ctx.rotate(t * 0.8);
        ctx.strokeStyle = '#ffeaa8'; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * TAU;
          ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
        }
        ctx.closePath(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,244,200,.5)'; ctx.fill();
        ctx.restore();
        break;
      case 'vitality':
        glowDot(ctx, x, y, 30, '#a8f0d8', 0.36);
        ctx.strokeStyle = '#bff6e2'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y);
        ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke();
        break;
      case 'shard':
        glowDot(ctx, x, y, 36, '#d6b6ff', 0.42);
        ctx.save();
        ctx.translate(x, y); ctx.rotate(t * 1.4);
        ctx.fillStyle = '#e3ccff';
        ctx.beginPath();
        ctx.moveTo(0, -11); ctx.lineTo(7, 0); ctx.lineTo(0, 11); ctx.lineTo(-7, 0);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
        break;
      default:
        glowDot(ctx, x, y, 20, '#e8f6ff', 0.3);
    }
    ctx.restore();
  }
}

/* A shard gate: a hanging seal of bell-bronze that has no keyhole. It is the
 * same object in every area on purpose — a seal is not architecture, it is a
 * promise that you will come back. */
function drawGates(ctx, game, env) {
  for (const g of game.level.gates) {
    const cx = g.x + g.w * 0.5;
    const t = game.worldTime;
    if (g.open) {
      g.glow = Math.max(0, (g.glow ?? 0) - 0.01);
      if (g.glow <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = g.glow;
    } else {
      ctx.save();
    }
    /* the bars */
    const bars = Math.max(3, Math.round(g.w / 26));
    for (let i = 0; i <= bars; i += 1) {
      const bx = g.x + (g.w / bars) * i;
      const sway = Math.sin(t * 1.4 + i * 0.7) * 1.4;
      const grad = ctx.createLinearGradient(bx, g.y, bx, g.y + g.h);
      grad.addColorStop(0, 'rgba(228,208,150,.85)');
      grad.addColorStop(0.5, 'rgba(150,126,74,.9)');
      grad.addColorStop(1, 'rgba(46,40,26,.95)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(bx, g.y);
      ctx.quadraticCurveTo(bx + sway, g.y + g.h * 0.5, bx, g.y + g.h);
      ctx.stroke();
    }
    /* the seal, and the shape of the thing that opens it */
    const pulse = 0.5 + Math.sin(t * 2.2) * 0.5;
    glowDot(ctx, cx, g.y + g.h * 0.5, 46 + pulse * 10, '#e0c8ff', 0.18 + pulse * 0.08);
    ctx.save();
    ctx.translate(cx, g.y + g.h * 0.5);
    ctx.rotate(TAU * 0.125 + Math.sin(t * 0.8) * 0.08);
    ctx.fillStyle = 'rgba(228,208,150,.22)';
    ctx.strokeStyle = 'rgba(246,232,190,.9)';
    ctx.lineWidth = 2;
    ctx.fillRect(-13, -13, 26, 26);
    ctx.strokeRect(-13, -13, 26, 26);
    ctx.restore();
    ctx.restore();
  }
}

function drawDoorAndExit(ctx, game, env) {
  const ex = game.level.exit;
  if (!ex) return;
  const open = game.exitOpen;
  ctx.save();
  const g = ctx.createLinearGradient(ex.x, ex.y, ex.x, ex.y + ex.h);
  g.addColorStop(0, open ? 'rgba(255,238,178,.34)' : 'rgba(10,18,26,.72)');
  g.addColorStop(1, open ? 'rgba(255,214,120,.10)' : 'rgba(4,8,14,.86)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(ex.x, ex.y + ex.h);
  ctx.lineTo(ex.x, ex.y + ex.w * 0.5);
  ctx.quadraticCurveTo(ex.x, ex.y, ex.x + ex.w * 0.5, ex.y);
  ctx.quadraticCurveTo(ex.x + ex.w, ex.y, ex.x + ex.w, ex.y + ex.w * 0.5);
  ctx.lineTo(ex.x + ex.w, ex.y + ex.h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = open ? 'rgba(255,232,166,.75)' : 'rgba(150,178,184,.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (open) {
    const pulse = 0.5 + Math.sin(game.worldTime * 3) * 0.5;
    glowDot(ctx, ex.x + ex.w * 0.5, ex.y + ex.h * 0.5, 70 + pulse * 14, '#ffe9b0', 0.20 + pulse * 0.08);
    /* an in-world arrow, no words */
    ctx.strokeStyle = 'rgba(255,240,190,.9)';
    ctx.lineWidth = 3;
    const ax = ex.x + ex.w * 0.5;
    const ay = ex.y + ex.h * 0.5 + Math.sin(game.worldTime * 2.6) * 4;
    ctx.beginPath();
    ctx.moveTo(ax - 9, ay - 9); ctx.lineTo(ax + 6, ay); ctx.lineTo(ax - 9, ay + 9);
    ctx.stroke();
  }
  ctx.restore();
}
