/* enemies.js — ten enemies, ten answers.
 *
 * The design rule for this file: an enemy is only worth putting in the game if
 * it asks a question the player can answer with a specific move. If two
 * enemies have the same answer, one of them is decoration.
 *
 *   wretch      wide chest-high sweep         ->  CROUCH under it (or step)
 *   hound       committed pounce arc          ->  QUICKSTEP through, punish
 *   crow        straight dive along a line    ->  leave the line; overhead it
 *   warden      shield covers his front-high  ->  CROUCH-STRIKE his legs, or
 *                                                 DIVE onto his helm
 *   moth        three-shard fan               ->  duck the high one, overhead
 *   choir       alternating high / low rings  ->  crouch, then jump, in rhythm
 *   duelist     long tell, 0.1s active thrust ->  QUICKSTEP (the perfect-step
 *                                                 tutor)
 *   bellKnight  floor shockwaves              ->  JUMP them, dive his helm
 *   harrier     drops anchors from above      ->  overhead, or dive off it
 *   censer      a swung censer with a gap at
 *               the bottom of its arc         ->  crouch inside the gap
 *
 * Every telegraph obeys FAIR.MIN_TELEGRAPH and leaves FAIR.MIN_RECOVERY of
 * punish window. The autotest asserts it, because "unfair" is a bug.
 *
 * Readability note: telegraphs are never signalled by colour alone. Shape (a
 * closing bracket), motion (the pose leans), brightness (a ramp to a hard
 * white commit flash) and sound all carry the same information.
 */

import { FAIR } from './config.js';
import { clamp, lerp, overlaps, TAU, withAlpha, hash01, smoothstep } from './core.js';
import { solidsNear, platformsNear } from './level.js';
import { drawEnemy as drawEnemySprite } from './art/atlas.js';

/* ------------------------------------------------------------------ */

export const DEFS = {
  wretch: {
    hp: 26, w: 30, h: 56, contact: 8, score: 100,
    speed: 44, aggro: 230, gravity: true,
    tell: 0.52, active: 0.16, recover: 0.44,
    reach: 78, damage: 12,
    teaches: 'crouch',
  },
  hound: {
    hp: 22, w: 46, h: 30, contact: 9, score: 120,
    speed: 92, aggro: 280, gravity: true,
    tell: 0.42, active: 0.55, recover: 0.52,
    reach: 0, damage: 12,
    teaches: 'step',
  },
  crow: {
    hp: 14, w: 30, h: 26, contact: 10, score: 90,
    speed: 0, aggro: 320, gravity: false, flying: true,
    tell: 0.46, active: 0.72, recover: 0.70,
    reach: 0, damage: 10,
    teaches: 'reposition',
  },
  warden: {
    hp: 62, w: 40, h: 62, contact: 10, score: 260,
    speed: 40, aggro: 420, gravity: true,
    tell: 0.62, active: 0.18, recover: 0.64,
    reach: 68, damage: 18,
    guard: { kneeLine: 40 },  // hits landing above (top + kneeLine) are blocked
    teaches: 'crouch-strike / dive',
  },
  moth: {
    hp: 18, w: 34, h: 34, contact: 8, score: 130,
    speed: 34, aggro: 340, gravity: false, flying: true,
    tell: 0.50, active: 0.18, recover: 0.62,
    reach: 0, damage: 9,
    teaches: 'duck the fan',
  },
  choir: {
    hp: 38, w: 38, h: 52, contact: 0, score: 220,
    speed: 0, aggro: 460, gravity: false, flying: true,
    tell: 0.58, active: 0.2, recover: 0.86,
    reach: 0, damage: 12,
    teaches: 'crouch / jump rhythm',
  },
  duelist: {
    hp: 32, w: 30, h: 58, contact: 8, score: 240,
    speed: 118, aggro: 380, gravity: true,
    tell: 0.44, active: 0.10, recover: 0.58,
    reach: 120, damage: 15,
    teaches: 'perfect step',
  },
  bellKnight: {
    hp: 86, w: 46, h: 66, contact: 12, score: 400,
    speed: 36, aggro: 460, gravity: true,
    tell: 0.70, active: 0.22, recover: 0.72,
    reach: 62, damage: 20,
    teaches: 'jump the wave',
  },
  harrier: {
    hp: 26, w: 44, h: 30, contact: 10, score: 190,
    speed: 148, aggro: 460, gravity: false, flying: true,
    tell: 0.45, active: 0.2, recover: 0.5,
    reach: 0, damage: 12,
    teaches: 'overhead / dive',
  },
  censer: {
    hp: 46, w: 34, h: 60, contact: 8, score: 280,
    speed: 26, aggro: 340, gravity: true,
    tell: 0.55, active: 2.2, recover: 0.62,
    reach: 96, damage: 14,
    teaches: 'the gap at the bottom',
  },
};

/* ------------------------------------------------------------------ */

let eid = 0;

export function spawnEnemy(kind, x, y, opts = {}) {
  const d = DEFS[kind];
  if (!d) throw new Error(`unknown enemy: ${kind}`);
  return {
    id: `e${(eid += 1)}`,
    kind,
    x: x - d.w * 0.5,
    y: y - d.h,
    w: d.w, h: d.h,
    vx: 0, vy: 0,
    hp: d.hp * (opts.hpMult ?? 1),
    maxHp: d.hp * (opts.hpMult ?? 1),
    facing: opts.facing ?? -1,
    state: 'idle',
    timer: 0,
    intent: null,
    grounded: false,
    dead: false,
    flash: 0,
    hurt: 0,
    onScreenTime: 0,
    cycle: hash01(x) * 6,
    homeX: x, homeY: y,
    patrol: opts.patrol ?? 0,
    patrolDir: opts.facing ?? -1,
    attackHit: false,
    guardFlash: 0,
    stagger: 0,
    aggro: false,
    variant: opts.variant ?? null,
    /* per-kind scratch */
    swing: 0, ringHigh: true, anchorsLeft: 0, perch: { x, y },
    deathTimer: 0,
    spawnOpts: opts,
  };
}

/* ------------------------------------------------------------------ *
 * update
 * ------------------------------------------------------------------ */

export function updateEnemy(game, e, dt) {
  const d = DEFS[e.kind];
  const p = game.player;
  e.cycle += dt;
  e.onScreenTime += dt;
  e.flash = Math.max(0, e.flash - dt * 8);
  e.guardFlash = Math.max(0, e.guardFlash - dt * 4);
  e.hurt = Math.max(0, e.hurt - dt);
  e.stagger = Math.max(0, e.stagger - dt);

  if (e.dead) {
    e.deathTimer += dt;
    e.vy += 900 * dt;
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.vx *= 1 - 2.4 * dt;
    return;
  }

  const px = p.x + p.w * 0.5;
  const py = p.y + p.h * 0.5;
  const cx = e.x + e.w * 0.5;
  const cy = e.y + e.h * 0.5;
  const dx = px - cx;
  const dy = py - cy;
  const distance = Math.hypot(dx, dy);
  e.aggro = e.aggro || distance < d.aggro;

  if (e.stagger > 0) {
    e.state = 'stagger';
    if (d.gravity) physics(game, e, dt);
    return;
  }

  BEHAVIOUR[e.kind](game, e, d, { p, px, py, cx, cy, dx, dy, distance, dt });

  if (d.gravity) physics(game, e, dt);
  else flyPhysics(game, e, dt);
}

function physics(game, e, dt) {
  e.vy = Math.min(e.vy + 1500 * dt, 720);
  e.x += e.vx * dt;
  const boxX = { x: e.x, y: e.y, w: e.w, h: e.h };
  for (const s of solidsNear(game.level, boxX, 24)) {
    if (!overlaps(boxX, s)) continue;
    if (e.vx > 0) e.x = s.x - e.w; else if (e.vx < 0) e.x = s.x + s.w;
    if (e.state === 'walk' || e.state === 'idle') e.patrolDir *= -1;
    e.vx = 0;
    boxX.x = e.x;
  }
  const wasBottom = e.y + e.h;
  e.grounded = false;
  e.y += e.vy * dt;
  const boxY = { x: e.x, y: e.y, w: e.w, h: e.h };
  for (const s of solidsNear(game.level, boxY, 24)) {
    if (!overlaps(boxY, s)) continue;
    if (e.vy >= 0 && wasBottom <= s.y + 10) { e.y = s.y - e.h; e.vy = 0; e.grounded = true; }
    else if (e.vy < 0) { e.y = s.y + s.h; e.vy = 0; }
    boxY.y = e.y;
  }
  if (e.vy >= 0) {
    for (const pl of platformsNear(game.level, boxY, 24)) {
      const box = { x: pl.x, y: pl.y, w: pl.w, h: pl.h };
      if (!overlaps(boxY, box)) continue;
      if (wasBottom <= pl.y + 10) { e.y = pl.y - e.h; e.vy = 0; e.grounded = true; boxY.y = e.y; }
    }
  }
}

function flyPhysics(game, e, dt) {
  e.x += e.vx * dt;
  e.y += e.vy * dt;
}

/* Helpers shared by the behaviours. */
const face = (e, dx) => { if (Math.abs(dx) > 6) e.facing = dx > 0 ? 1 : -1; };

function beginTell(game, e, intent, duration) {
  e.state = 'telegraph';
  e.intent = intent;
  e.timer = Math.max(duration, intent === 'shot' || intent === 'ring' ? FAIR.MIN_TELEGRAPH_RANGED : FAIR.MIN_TELEGRAPH);
  e.tellMax = e.timer;
  e.attackHit = false;
  game.sound('tell', 1 + hash01(e.cycle) * 0.2);
}

function beginActive(game, e, d) {
  e.state = 'attack';
  e.timer = d.active;
  e.activeMax = d.active;
  e.attackHit = false;
  game.enemyCommitFlash(e);
}

function beginRecover(e, d) {
  e.state = 'recover';
  e.timer = Math.max(d.recover, FAIR.MIN_RECOVERY);
}

export const tellProgress = (e) => (e.state === 'telegraph' ? clamp(1 - e.timer / (e.tellMax || 1), 0, 1) : 0);

/* ------------------------------------------------------------------ *
 * behaviours
 * ------------------------------------------------------------------ */

const BEHAVIOUR = {

  /* ---- WRETCH: a slow chest-high sweep. Crouch under it. ---- */
  wretch(game, e, d, s) {
    switch (e.state) {
      case 'idle':
      case 'walk': {
        if (e.aggro && Math.abs(s.dy) < 60 && Math.abs(s.dx) < d.reach - 10) {
          face(e, s.dx);
          beginTell(game, e, 'sweep', d.tell);
          e.vx = 0;
          break;
        }
        if (e.aggro && Math.abs(s.dy) < 90) {
          face(e, s.dx);
          e.vx = e.facing * d.speed;
          e.state = 'walk';
        } else if (e.patrol) {
          if (e.x < e.homeX - e.patrol) e.patrolDir = 1;
          if (e.x > e.homeX + e.patrol) e.patrolDir = -1;
          e.facing = e.patrolDir;
          e.vx = e.patrolDir * d.speed * 0.55;
          e.state = 'walk';
        } else { e.vx = 0; e.state = 'idle'; }
        break;
      }
      case 'telegraph':
        e.vx = 0;
        e.timer -= s.dt;
        if (e.timer <= 0) beginActive(game, e, d);
        break;
      case 'attack':
        e.timer -= s.dt;
        e.vx = e.facing * 46;
        if (e.timer <= 0) { e.vx = 0; beginRecover(e, d); }
        break;
      case 'recover':
        e.vx = 0;
        e.timer -= s.dt;
        if (e.timer <= 0) e.state = 'walk';
        break;
      default: e.state = 'walk';
    }
  },

  /* ---- HOUND: one committed arc. Step through it. ---- */
  hound(game, e, d, s) {
    switch (e.state) {
      case 'idle':
      case 'walk': {
        if (e.aggro && Math.abs(s.dx) < 210 && Math.abs(s.dy) < 96 && e.grounded) {
          face(e, s.dx);
          beginTell(game, e, 'pounce', d.tell);
          e.vx = 0;
          break;
        }
        if (e.aggro && Math.abs(s.dy) < 140) {
          face(e, s.dx);
          e.vx = e.facing * d.speed;
        } else if (e.patrol) {
          if (e.x < e.homeX - e.patrol) e.patrolDir = 1;
          if (e.x > e.homeX + e.patrol) e.patrolDir = -1;
          e.facing = e.patrolDir;
          e.vx = e.patrolDir * d.speed * 0.5;
        } else e.vx = 0;
        e.state = 'walk';
        break;
      }
      case 'telegraph':
        e.vx = 0;
        e.timer -= s.dt;
        /* it crouches lower the closer it gets to launching — a shape tell */
        if (e.timer <= 0) {
          beginActive(game, e, d);
          e.vx = e.facing * 330;
          e.vy = -280;
          e.grounded = false;
          game.sound('pounce');
        }
        break;
      case 'attack':
        e.timer -= s.dt;
        if (e.grounded && e.timer < d.active - 0.12) { e.vx = 0; beginRecover(e, d); }
        else if (e.timer <= 0) { e.vx *= 0.4; beginRecover(e, d); }
        break;
      case 'recover':
        e.vx *= 1 - 6 * s.dt;
        e.timer -= s.dt;
        if (e.timer <= 0) e.state = 'walk';
        break;
      default: e.state = 'walk';
    }
  },

  /* ---- CROW: dives along a fixed line. Leave the line. ---- */
  crow(game, e, d, s) {
    switch (e.state) {
      case 'idle': {
        /* settle back onto the perch */
        e.vx = (e.perch.x - (e.x + e.w * 0.5)) * 2.2;
        e.vy = (e.perch.y - d.h - e.y) * 2.2 + Math.sin(e.cycle * 2.1) * 6;
        if (e.aggro && s.distance < d.aggro && Math.abs(e.x + e.w * 0.5 - e.perch.x) < 14) {
          face(e, s.dx);
          beginTell(game, e, 'dive', d.tell);
        }
        break;
      }
      case 'telegraph': {
        e.vx = 0;
        e.vy = -26;  /* it rises before it drops — a motion tell */
        e.timer -= s.dt;
        if (e.timer <= 0) {
          const a = Math.atan2(s.dy, s.dx);
          e.diveVX = Math.cos(a) * 360;
          e.diveVY = Math.sin(a) * 360;
          beginActive(game, e, d);
          game.sound('dive');
        }
        break;
      }
      case 'attack': {
        e.vx = e.diveVX; e.vy = e.diveVY;
        face(e, e.diveVX);
        e.timer -= s.dt;
        const box = { x: e.x, y: e.y, w: e.w, h: e.h };
        let hitWall = false;
        for (const so of solidsNear(game.level, box, 20)) if (overlaps(box, so)) hitWall = true;
        if (e.timer <= 0 || hitWall) {
          beginRecover(e, d);
          if (hitWall) { game.shake(2); game.puff(e.x + e.w * 0.5, e.y + e.h, 'dust'); }
        }
        break;
      }
      case 'recover':
        e.vx *= 1 - 3 * s.dt;
        e.vy = -60;
        e.timer -= s.dt;
        if (e.timer <= 0) e.state = 'idle';
        break;
      default: e.state = 'idle';
    }
  },

  /* ---- WARDEN: a wall that walks. Get under or over the shield. ---- */
  warden(game, e, d, s) {
    switch (e.state) {
      case 'idle':
      case 'walk': {
        if (!e.aggro) { e.vx = 0; e.state = 'idle'; break; }
        face(e, s.dx);
        if (Math.abs(s.dx) < d.reach && Math.abs(s.dy) < 70) {
          beginTell(game, e, 'slam', d.tell);
          e.vx = 0;
        } else {
          e.vx = e.facing * d.speed;
          e.state = 'walk';
        }
        break;
      }
      case 'telegraph':
        e.vx = 0;
        e.timer -= s.dt;
        if (e.timer <= 0) beginActive(game, e, d);
        break;
      case 'attack':
        e.timer -= s.dt;
        if (e.timer <= 0) {
          beginRecover(e, d);
          game.shake(4);
          game.particles.burst(e.x + e.w * 0.5 + e.facing * 40, e.y + e.h, '#d9c79a', 12, 200, 'dust', { lift: 30, gravity: 300 });
        }
        break;
      case 'recover':
        e.vx = 0;
        e.timer -= s.dt;
        if (e.timer <= 0) e.state = 'walk';
        break;
      default: e.state = 'walk';
    }
  },

  /* ---- MOTH: a three-shard fan. Duck the high one. ---- */
  moth(game, e, d, s) {
    const hoverY = e.homeY - d.h - 40 + Math.sin(e.cycle * 1.5) * 16;
    switch (e.state) {
      case 'idle': {
        e.vx = Math.cos(e.cycle * 0.8) * d.speed;
        e.vy = (hoverY - e.y) * 2.0;
        if (e.x + e.w * 0.5 < e.homeX - 120) e.vx = Math.abs(e.vx);
        if (e.x + e.w * 0.5 > e.homeX + 120) e.vx = -Math.abs(e.vx);
        face(e, s.dx);
        if (e.aggro && s.distance < d.aggro) beginTell(game, e, 'shot', d.tell);
        break;
      }
      case 'telegraph':
        e.vx *= 1 - 4 * s.dt;
        e.vy = (hoverY - e.y) * 2.0;
        e.timer -= s.dt;
        if (e.timer <= 0) {
          beginActive(game, e, d);
          const ox = e.x + e.w * 0.5 + e.facing * 12;
          const oy = e.y + e.h * 0.5;
          for (const ang of [-0.42, 0, 0.42]) {
            game.spawnProjectile({
              kind: 'shard', x: ox, y: oy,
              vx: Math.cos(ang) * 210 * e.facing, vy: Math.sin(ang) * 210,
              r: 6, damage: d.damage, life: 3.2, from: e.id,
            });
          }
          game.sound('shard');
        }
        break;
      case 'attack':
        e.timer -= s.dt;
        if (e.timer <= 0) beginRecover(e, d);
        break;
      case 'recover':
        e.vy = (hoverY - e.y) * 2.0;
        e.timer -= s.dt;
        if (e.timer <= 0) e.state = 'idle';
        break;
      default: e.state = 'idle';
    }
  },

  /* ---- CHOIR: alternating high and low rings. Crouch, then jump. ---- */
  choir(game, e, d, s) {
    e.vy = Math.sin(e.cycle * 1.1) * 8;
    e.vx = 0;
    switch (e.state) {
      case 'idle':
        face(e, s.dx);
        if (e.aggro && s.distance < d.aggro) beginTell(game, e, e.ringHigh ? 'ringHigh' : 'ringLow', d.tell);
        break;
      case 'telegraph':
        e.timer -= s.dt;
        if (e.timer <= 0) {
          beginActive(game, e, d);
          const groundY = game.groundUnder(e.x + e.w * 0.5, e.y) ?? (e.y + e.h + 60);
          const y = e.ringHigh ? e.y + 6 : groundY - 20;
          const h = e.ringHigh ? 30 : 22;
          for (const dir of [-1, 1]) {
            game.spawnProjectile({
              kind: e.ringHigh ? 'noteHigh' : 'noteLow',
              x: e.x + e.w * 0.5, y: y + h * 0.5,
              vx: dir * 168, vy: 0,
              w: 26, h, r: h * 0.5,
              damage: d.damage, life: 3.4, from: e.id, wave: true,
            });
          }
          game.sound(e.ringHigh ? 'noteHigh' : 'noteLow');
          e.ringHigh = !e.ringHigh;
        }
        break;
      case 'attack':
        e.timer -= s.dt;
        if (e.timer <= 0) beginRecover(e, d);
        break;
      case 'recover':
        e.timer -= s.dt;
        if (e.timer <= 0) e.state = 'idle';
        break;
      default: e.state = 'idle';
    }
  },

  /* ---- DUELIST: the perfect-step tutor. ---- */
  duelist(game, e, d, s) {
    const want = 150;
    switch (e.state) {
      case 'idle':
      case 'walk': {
        if (!e.aggro) { e.vx = 0; e.state = 'idle'; break; }
        face(e, s.dx);
        const gap = Math.abs(s.dx);
        if (gap > want + 26) e.vx = e.facing * d.speed;
        else if (gap < want - 42) e.vx = -e.facing * d.speed * 0.85;
        else {
          e.vx = 0;
          e.poise = (e.poise ?? 0) + s.dt;
          if (e.poise > 0.30 && Math.abs(s.dy) < 60) { e.poise = 0; beginTell(game, e, 'thrust', d.tell); }
        }
        e.state = 'walk';
        break;
      }
      case 'telegraph':
        e.vx = -e.facing * 34;    /* it draws BACK before it goes — motion tell */
        e.timer -= s.dt;
        if (e.timer <= 0) { beginActive(game, e, d); e.vx = e.facing * 260; game.sound('thrust'); }
        break;
      case 'attack':
        e.timer -= s.dt;
        if (e.timer <= 0) { e.vx = 0; beginRecover(e, d); }
        break;
      case 'recover':
        e.vx *= 1 - 7 * s.dt;
        e.timer -= s.dt;
        if (e.timer <= 0) e.state = 'walk';
        break;
      default: e.state = 'walk';
    }
  },

  /* ---- BELLKNIGHT: floor shockwaves. Jump. ---- */
  bellKnight(game, e, d, s) {
    switch (e.state) {
      case 'idle':
      case 'walk': {
        if (!e.aggro) { e.vx = 0; e.state = 'idle'; break; }
        face(e, s.dx);
        const overhead = s.dy < -40 && Math.abs(s.dx) < 90;
        if (overhead) { beginTell(game, e, 'uppeal', 0.5); e.vx = 0; break; }
        if (Math.abs(s.dx) < 260 && Math.abs(s.dy) < 110) { beginTell(game, e, 'slamwave', d.tell); e.vx = 0; break; }
        e.vx = e.facing * d.speed;
        e.state = 'walk';
        break;
      }
      case 'telegraph':
        e.vx = 0;
        e.timer -= s.dt;
        if (e.timer <= 0) {
          beginActive(game, e, d);
          if (e.intent === 'slamwave') {
            const groundY = game.groundUnder(e.x + e.w * 0.5, e.y) ?? (e.y + e.h);
            for (const dir of [-1, 1]) {
              game.spawnProjectile({
                kind: 'shock', x: e.x + e.w * 0.5, y: groundY - 13,
                vx: dir * 250, vy: 0, w: 30, h: 26, r: 15,
                damage: d.damage, life: 2.6, from: e.id, wave: true, ground: true,
              });
            }
            game.shake(6);
            game.sound('slam');
          } else {
            game.sound('bellSwing');
          }
        }
        break;
      case 'attack':
        e.timer -= s.dt;
        if (e.timer <= 0) beginRecover(e, d);
        break;
      case 'recover':
        e.vx = 0;
        e.timer -= s.dt;
        if (e.timer <= 0) e.state = 'walk';
        break;
      default: e.state = 'walk';
    }
  },

  /* ---- HARRIER: sweeps overhead and drops anchors. ---- */
  harrier(game, e, d, s) {
    const cruiseY = e.homeY - d.h - 96;
    switch (e.state) {
      case 'idle': {
        e.vy = (cruiseY - e.y) * 1.8 + Math.sin(e.cycle * 2.4) * 12;
        e.vx = e.patrolDir * d.speed;
        if (e.x < e.homeX - (e.patrol || 200)) e.patrolDir = 1;
        if (e.x > e.homeX + (e.patrol || 200)) e.patrolDir = -1;
        face(e, e.patrolDir);
        if (e.aggro && Math.abs(s.dx) < 70 && s.dy > 20) beginTell(game, e, 'anchor', d.tell);
        break;
      }
      case 'telegraph':
        e.vx *= 1 - 3 * s.dt;
        e.timer -= s.dt;
        if (e.timer <= 0) {
          beginActive(game, e, d);
          game.spawnProjectile({
            kind: 'anchor', x: e.x + e.w * 0.5, y: e.y + e.h,
            vx: 0, vy: 210, r: 11, damage: d.damage, life: 4, from: e.id,
            gravity: 620, sticks: true,
          });
          game.sound('anchor');
        }
        break;
      case 'attack':
        e.timer -= s.dt;
        if (e.timer <= 0) beginRecover(e, d);
        break;
      case 'recover':
        e.vx = e.patrolDir * d.speed * 1.3;
        e.timer -= s.dt;
        if (e.timer <= 0) e.state = 'idle';
        break;
      default: e.state = 'idle';
    }
  },

  /* ---- CENSER: a swung weight with a gap at the bottom of its arc. ---- */
  censer(game, e, d, s) {
    switch (e.state) {
      case 'idle':
      case 'walk': {
        face(e, s.dx);
        if (e.aggro && s.distance < d.aggro) { beginTell(game, e, 'swing', d.tell); e.vx = 0; break; }
        if (e.patrol) {
          if (e.x < e.homeX - e.patrol) e.patrolDir = 1;
          if (e.x > e.homeX + e.patrol) e.patrolDir = -1;
          e.facing = e.patrolDir;
          e.vx = e.patrolDir * d.speed;
        } else e.vx = 0;
        e.state = 'walk';
        break;
      }
      case 'telegraph':
        e.vx = 0;
        e.timer -= s.dt;
        e.swing = -Math.PI * 0.5 - (1 - e.timer / (e.tellMax || 1)) * 0.7;
        if (e.timer <= 0) { beginActive(game, e, d); e.swingSpeed = 3.5; }
        break;
      case 'attack': {
        e.timer -= s.dt;
        e.swing += e.swingSpeed * s.dt;
        e.vx = Math.sign(s.dx) * d.speed * 0.7;
        e.facing = Math.sign(s.dx) || e.facing;
        if (e.timer <= 0) { e.vx = 0; beginRecover(e, d); }
        break;
      }
      case 'recover':
        e.vx = 0;
        e.swing += e.swingSpeed * 0.3 * s.dt;
        e.timer -= s.dt;
        if (e.timer <= 0) e.state = 'walk';
        break;
      default: e.state = 'walk';
    }
  },
};

/* ------------------------------------------------------------------ *
 * hitboxes
 * ------------------------------------------------------------------ */

/* The rectangle that hurts, while it is live. Also used for perfect-step
 * detection: passing through THIS with i-frames is the whole trick. */
export function enemyHitbox(e) {
  if (e.dead || e.state !== 'attack') return null;
  const d = DEFS[e.kind];
  const cx = e.x + e.w * 0.5;
  switch (e.kind) {
    case 'wretch':
      /* chest-high and wide: a crouching player is BELOW it */
      return { x: e.facing > 0 ? cx : cx - d.reach, y: e.y + 2, w: d.reach, h: 30, damage: d.damage };
    case 'hound':
      return { x: e.x + 3, y: e.y + 2, w: e.w - 6, h: e.h - 4, damage: d.damage };
    case 'crow':
      return { x: e.x + 3, y: e.y + 3, w: e.w - 6, h: e.h - 6, damage: d.damage };
    case 'warden':
      return { x: e.facing > 0 ? cx + 4 : cx - 4 - d.reach, y: e.y - 6, w: d.reach, h: e.h + 12, damage: d.damage };
    case 'duelist':
      return { x: e.facing > 0 ? cx : cx - d.reach, y: e.y + 18, w: d.reach, h: 14, damage: d.damage };
    case 'bellKnight':
      if (e.intent === 'uppeal') return { x: cx - 52, y: e.y - 56, w: 104, h: 70, damage: d.damage };
      return { x: e.facing > 0 ? cx : cx - d.reach, y: e.y + e.h - 34, w: d.reach, h: 34, damage: d.damage };
    case 'censer': {
      const r = 84;
      const hx = cx + Math.cos(e.swing) * r;
      const hy = e.y + e.h * 0.42 + Math.sin(e.swing) * r;
      return { x: hx - 15, y: hy - 15, w: 30, h: 30, damage: d.damage, orb: true };
    }
    default:
      return null;
  }
}

/* Contact damage for the bodies that are dangerous just by existing. */
export function enemyBody(e) {
  if (e.dead) return null;
  return { x: e.x, y: e.y, w: e.w, h: e.h };
}

/* Does an incoming whip hit get through? The warden's answer is "not from the
 * front, not above the knee". */
export function isBlocked(e, box) {
  const d = DEFS[e.kind];
  if (!d.guard || e.dead) return false;
  const cx = e.x + e.w * 0.5;
  const fromFront = (box.x + box.w * 0.5 - cx) * e.facing > 0;
  if (!fromFront) return false;
  if (box.dive) return false;                       // over the top
  const boxBottom = box.y + box.h;
  const knee = e.y + d.guard.kneeLine;
  if (boxBottom > knee + 6 && box.low) return false; // under the shield
  return true;
}

export function damageEnemy(game, e, amount, opts = {}) {
  if (e.dead) return false;
  e.hp -= amount;
  e.flash = 1;
  e.hurt = 0.16;
  if (opts.knock) {
    e.vx += opts.knock * (opts.dir ?? 1) * 0.6;
    if (DEFS[e.kind].gravity && opts.knock > 200) { e.vy = -140; e.grounded = false; }
  }
  if (opts.stagger) e.stagger = opts.stagger;
  if (e.hp <= 0) {
    e.dead = true;
    e.deathTimer = 0;
    e.vx = (opts.dir ?? 1) * 130;
    e.vy = -210;
    game.onEnemyKilled?.(e);
    return true;
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * rendering
 * ------------------------------------------------------------------ */

export function drawEnemyEntity(ctx, e, env) {
  const d = DEFS[e.kind];
  const cx = e.x + e.w * 0.5;
  const feet = e.y + e.h;
  const acting = e.state === 'telegraph' || e.state === 'attack';
  const tp = tellProgress(e);

  /* the censer's chain and head live outside the sprite */
  if (e.kind === 'censer' && (e.state === 'attack' || e.state === 'telegraph' || e.state === 'recover')) {
    drawCenserArc(ctx, e, env);
  }

  ctx.save();
  ctx.translate(cx, feet);
  if (e.dead) {
    ctx.globalAlpha = clamp(1 - e.deathTimer / 0.85, 0, 1);
    ctx.rotate(clamp(e.deathTimer * 2.4, 0, 1.2) * (e.vx > 0 ? 1 : -1));
  }
  ctx.scale(e.facing, 1);

  /* pose distortion carries the tell as MOTION, not colour */
  if (!e.dead) {
    if (e.state === 'telegraph') {
      const k = smoothstep(tp);
      ctx.translate(-k * 9, k * 2);
      ctx.rotate(-k * 0.05);
      ctx.scale(1 + k * 0.035, 1 - k * 0.035);
    } else if (e.state === 'attack') {
      ctx.translate(11, -2);
      ctx.scale(1.06, 0.95);
    } else if (e.state === 'stagger') {
      ctx.rotate(Math.sin(e.stagger * 40) * 0.06);
    } else {
      const bob = d.flying
        ? Math.sin(e.cycle * 4.4 + e.homeX * 0.02) * 2.4
        : Math.abs(Math.sin(e.x * 0.12)) * 1.6;
      ctx.translate(0, bob);
    }
  }

  if (!e.dead) {
    ctx.save();
    ctx.translate(2.2, -2.0);
    drawEnemySprite(ctx, e.kind, { acting, rim: 0.24 });
    ctx.restore();
  }
  const ok = drawEnemySprite(ctx, e.kind, { acting, flash: e.flash > 0.82 });
  if (!ok) {
    ctx.fillStyle = 'rgba(20,28,36,.9)';
    ctx.strokeStyle = 'rgba(190,225,225,.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(-e.w * 0.5, -e.h, e.w, e.h, 4); ctx.fill(); ctx.stroke();
  }
  ctx.restore();

  if (!e.dead) {
    /* Nothing is drawn over an enemy to explain what it is about to do.
     * The wind-up is the pose leaning back, the sprite brightening, and the
     * tell sound; the commit is the pose snapping forward and a one-frame
     * white flash. Overlays on top of that were reading as a debug view, and
     * the animation was already carrying it. */
    if (e.guardFlash > 0) drawGuardSpark(ctx, e, env);
    if (e.hp < e.maxHp && e.maxHp > 40) drawPip(ctx, e);
  }
}

function drawCenserArc(ctx, e, env) {
  const cx = e.x + e.w * 0.5;
  const cy = e.y + e.h * 0.42;
  const r = 84;
  const hx = cx + Math.cos(e.swing) * r;
  const hy = cy + Math.sin(e.swing) * r;
  ctx.save();
  /* the path it sweeps, with the gap at the bottom drawn as a break */
  ctx.strokeStyle = withAlpha('#e8f2ee', 0.16);
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 9]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = withAlpha('#cfe0da', 0.8);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
  /* smoke trail */
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 6; i += 1) {
    const a = e.swing - i * 0.16;
    ctx.globalAlpha = 0.16 - i * 0.024;
    ctx.fillStyle = '#dfeae4';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 12 - i, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#c8b06a';
  ctx.beginPath(); ctx.arc(hx, hy, 8.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#f0e0a8'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.restore();
}

function drawGuardSpark(ctx, e, env) {
  const cx = e.x + e.w * 0.5 + e.facing * 20;
  const cy = e.y + 26;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = e.guardFlash;
  ctx.strokeStyle = '#ffe9b0';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 5; i += 1) {
    const a = -0.9 + i * 0.45;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * (16 + i * 4) * e.facing, cy + Math.sin(a) * (16 + i * 3));
    ctx.stroke();
  }
  ctx.restore();
}

function drawPip(ctx, e) {
  const w = Math.max(26, e.w);
  const x = e.x + e.w * 0.5 - w * 0.5;
  const y = e.y - 9;
  ctx.save();
  ctx.fillStyle = 'rgba(3,8,12,.62)';
  ctx.fillRect(x, y, w, 3.4);
  ctx.fillStyle = 'rgba(238,246,236,.86)';
  ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), 3.4);
  ctx.restore();
}
