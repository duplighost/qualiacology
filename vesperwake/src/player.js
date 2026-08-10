/* player.js — Sabine Vale, bellwright.
 *
 * The moveset, in the order you learn it:
 *
 *   RUN / JUMP      variable height, coyote time, buffered input
 *   NOONCORD        a three-link ground combo; the third link commits you
 *   CROUCH          hold Down. Real posture change, real hitbox change.
 *   CROUCH STRIKE   a low whip that goes UNDER a shield or a high sweep
 *   OVERHEAD        Up + strike; the answer to anything with wings
 *   DIVE STRIKE     Down + strike in the air. Whips straight down, and on a
 *                   hit it bounces you and refunds itself, so it chains.
 *   QUICKSTEP       a short grounded dodge with i-frames. Passing through an
 *                   attack is a PERFECT STEP: cooldown refunded, resonance
 *                   granted, time hitches. That is the whole reason it exists.
 */

import { PLAYER, STEP, WHIP, RESONANCE, SIM } from './config.js';
import { clamp, overlaps, approach } from './core.js';
import { platformsNear, solidsNear } from './level.js';
import { SAB } from './art/atlas.js';

export const ATTACK = {
  NONE: 'none',
  GROUND: 'ground',
  CROUCH: 'crouch',
  UP: 'up',
  AIR: 'air',
  DIVE: 'dive',
};

export function makePlayer(x = 80, y = 300) {
  return {
    x, y, vx: 0, vy: 0,
    w: PLAYER.W, h: PLAYER.H,
    facing: 1,
    grounded: false,
    groundedTime: 0,
    coyote: 0,
    jumpBuffer: 0,
    jumpHeld: false,
    dropThrough: 0,

    crouch: 0,          // 0..1 visual/physical blend
    crouching: false,

    hp: PLAYER.MAX_HP,
    maxHp: PLAYER.MAX_HP,
    invuln: 0,
    hitstun: 0,
    flash: 0,
    dead: false,

    attack: ATTACK.NONE,
    attackTime: 0,
    attackIndex: 0,
    attackHits: null,    // Set of entity ids already hit by this swing
    comboWindow: 0,
    attackBuffer: 0,
    diveBounced: false,
    airAttackUsed: false,

    stepTime: 0,
    stepCooldown: 0,
    stepDir: 1,
    stepIFrames: false,
    stepPassedThrough: false,
    sliding: false,
    perfectFlash: 0,

    resonance: 0,
    resonanceHits: 0,
    resonanceIdle: 0,
    sunstrikeReady: false,

    chain: 0,
    chainTimer: 0,

    animTime: 0,
    landSquash: 0,
    ridingMover: null,

    /* set by the forge (progress.js); 1 = unforged */
    damageMult: 1,
    reachMult: 1,

    /* abilities — everything after the first is granted by the shard system */
    abilities: { doubleJump: false, airStep: false, glide: false },
    airJumps: 0,
    airStepUsed: false,
    gliding: false,
    glideTime: 0,
  };
}

const spec = (p) => {
  switch (p.attack) {
    case ATTACK.GROUND: return WHIP.GROUND[clamp(p.attackIndex, 0, 2)];
    case ATTACK.CROUCH: return WHIP.CROUCH;
    case ATTACK.UP: return WHIP.UP;
    case ATTACK.AIR: return WHIP.AIR;
    case ATTACK.DIVE: return WHIP.DOWN;
    default: return null;
  }
};

export function attackPhase(p) {
  const s = spec(p);
  if (!s) return null;
  const e = p.attackTime;
  if (e < s.windup) return { stage: 'windup', t: e / s.windup, spec: s };
  if (e < s.windup + s.active) return { stage: 'active', t: (e - s.windup) / s.active, spec: s };
  return { stage: 'recovery', t: clamp((e - s.windup - s.active) / s.recovery, 0, 1), spec: s };
}

/* The live hit rectangle, or null. */
export function whipBox(p) {
  const ph = attackPhase(p);
  if (!ph || ph.stage !== 'active') return null;
  const s = ph.spec;
  const cx = p.x + p.w * 0.5;
  const top = p.y;
  const reachMult = (p.sunstrikeArmed ? WHIP.SUNSTRIKE_REACH : 1) * (p.reachMult ?? 1);

  if (p.attack === ATTACK.DIVE) {
    return {
      x: cx - 15, y: p.y + p.h - 6,
      w: 30, h: s.height,
      damage: s.damage, knock: s.knock, heavy: false, dive: true,
    };
  }
  if (p.attack === ATTACK.UP) {
    return {
      x: cx - s.reach * 0.5 * reachMult, y: top - s.up,
      w: s.reach * reachMult, h: s.height,
      damage: s.damage, knock: s.knock, heavy: false, up: true,
    };
  }
  const reach = s.reach * reachMult;
  const h = p.crouching ? p.h : p.h;
  const yTop = p.attack === ATTACK.CROUCH
    ? p.y + h - s.height - 2
    : p.y + (h - s.height) * 0.5 - (s.up - 20) * 0.35;
  return {
    x: p.facing > 0 ? cx + 6 : cx - 6 - reach,
    y: yTop,
    w: reach, h: s.height,
    damage: s.damage, knock: s.knock, heavy: Boolean(s.heavy), low: Boolean(s.low),
  };
}

/* Where the chain visually reaches, for the renderer. */
export function whipTip(p) {
  const ph = attackPhase(p);
  const cx = p.x + p.w * 0.5;
  const cy = p.y + p.h * 0.45;
  if (!ph) return null;
  const s = ph.spec;
  const grow = ph.stage === 'windup' ? -0.35 * (1 - ph.t)
    : ph.stage === 'active' ? 1
      : 1 - ph.t * 0.85;
  if (p.attack === ATTACK.DIVE) {
    return { x: cx, y: p.y + p.h + s.height * clamp(grow, 0, 1) * 0.92, stage: ph.stage, t: ph.t };
  }
  if (p.attack === ATTACK.UP) {
    return { x: cx + p.facing * 8, y: p.y - s.up * clamp(grow, 0, 1), stage: ph.stage, t: ph.t };
  }
  const reach = s.reach * (p.sunstrikeArmed ? WHIP.SUNSTRIKE_REACH : 1) * (p.reachMult ?? 1);
  return {
    x: cx + p.facing * reach * clamp(grow, -0.4, 1),
    y: p.attack === ATTACK.CROUCH ? p.y + p.h - 12 : cy - (ph.stage === 'windup' ? 10 : 0),
    stage: ph.stage, t: ph.t,
  };
}

/* ------------------------------------------------------------------ *
 * update
 * ------------------------------------------------------------------ */

export function updatePlayer(game, p, input, dt) {
  const level = game.level;

  p.animTime += dt;
  p.invuln = Math.max(0, p.invuln - dt);
  p.hitstun = Math.max(0, p.hitstun - dt);
  p.flash = Math.max(0, p.flash - dt * 3.4);
  p.perfectFlash = Math.max(0, p.perfectFlash - dt * 2.6);
  p.stepCooldown = Math.max(0, p.stepCooldown - dt);
  p.comboWindow = Math.max(0, p.comboWindow - dt);
  p.attackBuffer = Math.max(0, p.attackBuffer - dt);
  p.landSquash = Math.max(0, p.landSquash - dt * 4.5);
  p.chainTimer = Math.max(0, p.chainTimer - dt);
  if (p.chainTimer <= 0) p.chain = 0;
  p.dropThrough = Math.max(0, p.dropThrough - dt);

  /* resonance bleeds away if you stop connecting */
  p.resonanceIdle += dt;
  if (p.resonanceIdle > RESONANCE.DECAY_AFTER && p.resonance > 0) {
    p.resonanceDrain = (p.resonanceDrain ?? 0) + dt;
    if (p.resonanceDrain >= RESONANCE.DECAY_EVERY) {
      p.resonanceDrain = 0;
      p.resonance = Math.max(0, p.resonance - 1);
    }
  }
  p.sunstrikeReady = p.resonance >= RESONANCE.MAX;

  if (p.dead) { integrate(game, p, dt); return; }

  const stunned = p.hitstun > 0;

  /* ---- quickstep -------------------------------------------------- */
  if (p.stepTime > 0) {
    p.stepTime -= dt;
    const dur = p.sliding ? STEP.SLIDE_TIME : STEP.TIME;
    const speed = p.sliding ? STEP.SLIDE_SPEED : STEP.SPEED;
    const elapsed = dur - p.stepTime;
    p.stepIFrames = elapsed >= STEP.IFRAME_START && elapsed <= STEP.IFRAME_END;
    const decel = clamp((elapsed - dur * (1 - STEP.EASE_OUT)) / (dur * STEP.EASE_OUT), 0, 1);
    p.vx = p.stepDir * speed * (1 - decel * decel * 0.92);
    p.vy = Math.min(p.vy, 30);
    if (p.sliding) { p.crouching = true; p.crouch = Math.min(1, p.crouch + dt * 14); applyHeight(game, p); }
    if (p.stepTime <= 0) {
      p.stepIFrames = false;
      if (p.stepPassedThrough) {
        /* PERFECT STEP */
        p.stepCooldown = 0;
        p.resonance = Math.min(RESONANCE.MAX, p.resonance + RESONANCE.PER_PERFECT_STEP);
        p.resonanceIdle = 0;
        p.perfectFlash = 1;
        game.hitch(STEP.PERFECT_SLOWMO, STEP.PERFECT_RATE);
        game.banner('PERFECT STEP', null, 0.9, 'step');
        game.sound('perfect');
        game.shake(3);
      }
      p.stepPassedThrough = false;
      p.sliding = false;
    }
    integrate(game, p, dt);
    if (p.stepTime > 0 && !(p.attackBuffer > 0 && STEP.TIME - p.stepTime > STEP.CANCEL_AFTER)) return;
  }

  /* ---- attack state ----------------------------------------------- */
  if (p.attack !== ATTACK.NONE) {
    p.attackTime += dt;
    const s = spec(p);
    const ph = attackPhase(p);

    /* the dive holds until it lands or times out */
    if (p.attack === ATTACK.DIVE) {
      if (p.grounded) endAttack(p, true);
      else if (p.attackTime > s.windup + s.active) endAttack(p, false);
    } else if (p.attackTime >= s.total) {
      endAttack(p, false);
    } else if (p.attack === ATTACK.AIR && p.grounded && ph.stage !== 'windup') {
      endAttack(p, false);
    }
  }

  /* ---- ground state ----------------------------------------------- */
  if (p.grounded) {
    p.coyote = PLAYER.COYOTE;
    p.groundedTime += dt;
    p.airAttackUsed = false;
    p.airStepUsed = false;
    p.airJumps = p.abilities.doubleJump ? 1 : 0;
    p.glideTime = 0;
  } else {
    p.coyote = Math.max(0, p.coyote - dt);
    p.groundedTime = 0;
  }

  /* ---- crouch ------------------------------------------------------ */
  const wantCrouch = !stunned
    && (p.sliding || input.held.down)
    && p.grounded
    && (p.sliding || p.stepTime <= 0)
    && (p.attack === ATTACK.NONE || p.attack === ATTACK.CROUCH);
  const canStand = wantCrouch ? true : headroom(game, p);
  p.crouching = wantCrouch || (p.crouching && !canStand);
  const targetCrouch = p.crouching ? 1 : 0;
  p.crouch = approach(p.crouch, targetCrouch, dt * (p.crouching ? 12 : 9));
  applyHeight(game, p);

  /* ---- horizontal -------------------------------------------------- */
  if (!stunned && p.stepTime <= 0) {
    const move = input.moveX;
    const committed = p.attack !== ATTACK.NONE && p.grounded && p.attack !== ATTACK.AIR;
    if (move !== 0 && !p.crouching) {
      if (!committed) p.facing = move;
      const boost = (move !== Math.sign(p.vx) && p.vx !== 0) ? PLAYER.TURN_BOOST : 1;
      const accel = (p.grounded ? PLAYER.ACCEL : PLAYER.AIR_ACCEL) * boost
        * (committed ? 0.18 : 1);
      p.vx = approach(p.vx, move * PLAYER.RUN, accel * dt);
    } else if (p.crouching) {
      /* a crouched creep: slow, but a low passage is a passage */
      if (move !== 0 && p.attack === ATTACK.NONE) {
        p.facing = move;
        p.vx = approach(p.vx, move * PLAYER.CROUCH_WALK, PLAYER.CROUCH_ACCEL * dt);
      } else {
        p.vx = approach(p.vx, 0, PLAYER.CROUCH_SLIDE * dt);
      }
    } else {
      p.vx = approach(p.vx, 0, (p.grounded ? PLAYER.FRICTION : PLAYER.AIR_DRAG) * dt);
    }
  } else if (stunned) {
    p.vx = approach(p.vx, 0, 420 * dt);
  }

  /* ---- jump -------------------------------------------------------- */
  if (input.pressed.jump) p.jumpBuffer = PLAYER.JUMP_BUFFER;
  p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);

  if (!stunned && p.jumpBuffer > 0) {
    const dropping = input.held.down && p.grounded && standingOnOneWay(game, p);
    if (dropping) {
      p.jumpBuffer = 0;
      p.dropThrough = 0.22;
      p.grounded = false;
      p.y += 2;
      game.sound('land', 0.4);
    } else if (p.coyote > 0 || p.grounded) {
      doJump(game, p);
    } else if (p.airJumps > 0 && p.abilities.doubleJump) {
      p.airJumps -= 1;
      doJump(game, p, 0.92);
      game.puff(p.x + p.w * 0.5, p.y + p.h, 'jump');
    }
  }
  if (!input.held.jump && p.vy < 0 && !p.jumpHeldRelease) {
    p.vy *= PLAYER.JUMP_CUT;
    p.jumpHeldRelease = true;
  }
  if (p.grounded) p.jumpHeldRelease = false;

  /* ---- glide (Moth Shard) ------------------------------------------ */
  p.gliding = !stunned && p.abilities.glide && !p.grounded
    && input.held.jump && p.vy > 40 && p.attack === ATTACK.NONE;
  if (p.gliding) p.glideTime += dt;

  /* ---- strike ------------------------------------------------------ */
  if (input.pressed.attack) p.attackBuffer = 0.16;
  if (!stunned && p.attackBuffer > 0) tryAttack(game, p, input);

  /* ---- step -------------------------------------------------------- */
  if (!stunned && input.pressed.step && p.stepCooldown <= 0 && p.stepTime <= 0) {
    /* one step per airtime once the Harrier Shard is held — otherwise you
     * could stair-step across the whole chapter */
    const canStep = p.grounded || (p.abilities.airStep && !p.airStepUsed);
    if (canStep) {
      /* holding Down turns the dodge into a slide that keeps the low hitbox */
      p.sliding = p.grounded && (input.held.down || p.crouching);
      p.stepTime = p.sliding ? STEP.SLIDE_TIME : STEP.TIME;
      p.stepCooldown = STEP.COOLDOWN + p.stepTime;
      p.stepDir = input.moveX !== 0 ? input.moveX : p.facing;
      p.facing = p.stepDir;
      if (!p.grounded) p.airStepUsed = true;
      p.stepPassedThrough = false;
      if (!p.sliding) { p.crouching = false; p.crouch = 0; }
      applyHeight(game, p);
      endAttack(p, false);
      game.sound('step');
      game.trailBurst(p);
    }
  }

  integrate(game, p, dt);
}

function doJump(game, p, mult = 1) {
  p.vy = -PLAYER.JUMP_V * mult;
  p.grounded = false;
  p.coyote = 0;
  p.jumpBuffer = 0;
  p.jumpHeldRelease = false;
  p.crouching = false;
  p.crouch = 0;
  applyHeight(game, p);
  game.sound('jump');
}

function tryAttack(game, p, input) {
  const busy = p.attack !== ATTACK.NONE;
  const ph = busy ? attackPhase(p) : null;

  if (!p.grounded) {
    if (busy) return;
    if (p.airAttackUsed) return;
    if (input.held.down) {
      start(p, ATTACK.DIVE);
      p.vy = Math.max(p.vy, 40);
      game.sound('whipDive');
    } else if (input.held.up) {
      start(p, ATTACK.UP);
      game.sound('whip');
    } else {
      start(p, ATTACK.AIR);
      game.sound('whip');
    }
    p.airAttackUsed = true;
    p.attackBuffer = 0;
    return;
  }

  /* grounded */
  if (busy) {
    /* combo continuation only from the recovery of a non-final link */
    if (p.attack === ATTACK.GROUND && ph && ph.stage === 'recovery' && p.attackIndex < 2) {
      start(p, ATTACK.GROUND, p.attackIndex + 1);
      p.attackBuffer = 0;
      game.sound('whip', 1 + p.attackIndex * 0.12);
    }
    return;
  }

  if (p.crouching) {
    start(p, ATTACK.CROUCH);
    game.sound('whipLow');
  } else if (input.held.up) {
    start(p, ATTACK.UP);
    game.sound('whip');
  } else {
    const chained = p.comboWindow > 0 && p.attackIndex < 2;
    start(p, ATTACK.GROUND, chained ? p.attackIndex + 1 : 0);
    game.sound('whip', chained ? 1.1 : 1);
  }
  p.attackBuffer = 0;
}

function start(p, kind, index = 0) {
  p.attack = kind;
  p.attackIndex = index;
  p.attackTime = 0;
  p.attackHits = new Set();
  p.diveBounced = false;
  p.sunstrikeArmed = p.resonance >= RESONANCE.MAX;
}

function endAttack(p, landed) {
  if (p.attack === ATTACK.GROUND) p.comboWindow = WHIP.COMBO_WINDOW;
  p.attack = ATTACK.NONE;
  p.attackTime = 0;
  p.attackHits = null;
  p.sunstrikeArmed = false;
  if (landed) p.landSquash = Math.max(p.landSquash, 0.6);
}

export function cancelAttack(p) { endAttack(p, false); }

/* Called by the game when a whip hit connects. */
export function onWhipConnect(game, p, target, box) {
  p.resonanceIdle = 0;
  p.chain += 1;
  p.chainTimer = 2.6;
  if (p.sunstrikeArmed) {
    p.resonance = 0;
    p.sunstrikeArmed = false;
    game.hitch(SIM.HITSTOP_HEAVY, 0.06);
    game.shake(7);
  } else {
    p.resonanceHits += 1;
    if (p.resonanceHits >= RESONANCE.HITS_PER_PIP) {
      p.resonanceHits = 0;
      p.resonance = Math.min(RESONANCE.MAX, p.resonance + 1);
    }
  }
  if (p.attack === ATTACK.DIVE && !p.diveBounced) {
    p.diveBounced = true;
    const held = game.input.held.jump;
    p.vy = -(held ? WHIP.DOWN.BOUNCE_V_HELD : WHIP.DOWN.BOUNCE_V);
    p.airAttackUsed = false;
    endAttack(p, false);
    game.sound('pogo');
    game.puff(p.x + p.w * 0.5, p.y + p.h, 'pogo');
  }
}

/* Called each step by the game while i-frames are live and an enemy attack
 * hitbox overlaps us — this is what makes the quickstep worth a button. */
export function notePassedThrough(p) {
  if (p.stepIFrames) p.stepPassedThrough = true;
}

export function damagePlayer(game, p, amount, fromX) {
  if (p.invuln > 0 || p.stepIFrames || p.dead) return false;
  p.hp -= amount;
  p.invuln = PLAYER.HIT_INVULN;
  p.hitstun = PLAYER.HIT_STUN;
  p.flash = 1;
  p.chain = 0;
  p.resonance = Math.max(0, p.resonance - 1);
  const dir = fromX === undefined ? -p.facing : Math.sign(p.x + p.w * 0.5 - fromX) || 1;
  p.vx = dir * PLAYER.HIT_KNOCK_X;
  p.vy = PLAYER.HIT_KNOCK_Y;
  p.grounded = false;
  p.crouching = false;
  p.crouch = 0;
  endAttack(p, false);
  p.stepTime = 0;
  p.sliding = false;
  p.stepIFrames = false;
  applyHeight(game, p);
  game.onPlayerHurt(amount);
  if (p.hp <= 0) { p.hp = 0; p.dead = true; }
  return true;
}

/* ------------------------------------------------------------------ *
 * physics
 * ------------------------------------------------------------------ */

function applyHeight(game, p) {
  const target = p.crouching ? PLAYER.CROUCH_H : PLAYER.H;
  const h = PLAYER.H + (PLAYER.CROUCH_H - PLAYER.H) * p.crouch;
  const bottom = p.y + p.h;
  p.h = p.crouch > 0.5 ? Math.min(h, PLAYER.H) : h;
  p.h = h;
  p.y = bottom - p.h;
  return target;
}

function headroom(game, p) {
  if (!game.level) return true;
  const test = { x: p.x + 2, y: p.y + p.h - PLAYER.H, w: p.w - 4, h: PLAYER.H };
  for (const s of solidsNear(game.level, test, 8)) if (overlaps(test, s)) return false;
  return true;
}

function standingOnOneWay(game, p) {
  const feet = { x: p.x + 3, y: p.y + p.h - 2, w: p.w - 6, h: 6 };
  for (const pl of platformsNear(game.level, feet, 8)) {
    if (overlaps(feet, { x: pl.x, y: pl.y, w: pl.w, h: pl.h })) return true;
  }
  return false;
}

function integrate(game, p, dt) {
  const level = game.level;
  if (!level) return;

  /* gravity */
  if (p.stepTime <= 0) {
    const g = PLAYER.GRAVITY * (p.vy > 0 ? PLAYER.FALL_MULT : 1);
    p.vy = Math.min(p.vy + g * dt, PLAYER.TERMINAL);
    /* the glide clamps AFTER gravity, so the descent is exactly the number in
     * config rather than that number plus one frame of falling */
    if (p.gliding) p.vy = Math.min(p.vy, PLAYER.GLIDE_FALL);
  }

  /* ride the platform under us */
  if (p.ridingMover) {
    p.x += p.ridingMover.vx * dt;
  }

  const wasBottom = p.y + p.h;

  /* --- X --- */
  p.x += p.vx * dt;
  const boxX = { x: p.x, y: p.y, w: p.w, h: p.h };
  for (const s of solidsNear(level, boxX)) {
    if (!overlaps(boxX, s)) continue;
    if (p.vx > 0) p.x = s.x - p.w;
    else if (p.vx < 0) p.x = s.x + s.w;
    else continue;
    p.vx = 0;
    boxX.x = p.x;
  }
  for (const b of level.breakables) {
    if (b.dead || !b.blocking) continue;
    if (!overlaps({ x: p.x, y: p.y, w: p.w, h: p.h }, b)) continue;
    if (p.vx > 0) p.x = b.x - p.w; else if (p.vx < 0) p.x = b.x + b.w;
    p.vx = 0;
  }
  p.x = clamp(p.x, 0, level.width - p.w);

  /* --- Y --- */
  const wasGrounded = p.grounded;
  p.grounded = false;
  p.ridingMover = null;
  p.y += p.vy * dt;
  const boxY = { x: p.x, y: p.y, w: p.w, h: p.h };

  for (const s of solidsNear(level, boxY)) {
    if (!overlaps(boxY, s)) continue;
    if (p.vy >= 0 && wasBottom <= s.y + 6) {
      p.y = s.y - p.h; p.vy = 0; p.grounded = true;
    } else if (p.vy < 0) {
      p.y = s.y + s.h; p.vy = 0;
    }
    boxY.y = p.y;
  }

  if (p.vy >= 0 && p.dropThrough <= 0) {
    for (const pl of platformsNear(level, boxY)) {
      const top = pl.y;
      const platBox = { x: pl.x, y: pl.y, w: pl.w, h: pl.h };
      if (!overlaps(boxY, platBox)) continue;
      if (wasBottom <= top + 6) {
        p.y = top - p.h;
        p.vy = 0;
        p.grounded = true;
        boxY.y = p.y;
        if (pl.kind === 'mover') p.ridingMover = pl;
        if (pl.kind === 'crumble' && pl.state === 'idle') {
          pl.state = 'shaking';
          pl.timer = 0.55;
          game.sound('crumble');
        }
      }
    }
  }

  if (p.grounded && !wasGrounded && p.vy === 0) {
    p.landSquash = 1;
    if (!p.dead) game.onLand(p);
  }
}

/* ------------------------------------------------------------------ *
 * animation
 * ------------------------------------------------------------------ */

export function playerFrame(p, input) {
  if (p.dead) return { frame: SAB.HURT, crouch: 0 };
  if (p.hitstun > 0) return { frame: SAB.HURT, crouch: 0 };
  if (p.stepTime > 0) return { frame: SAB.STEP, crouch: p.sliding ? 1 : 0 };

  const ph = p.attack !== ATTACK.NONE ? attackPhase(p) : null;
  if (ph) {
    if (p.attack === ATTACK.DIVE) return { frame: SAB.FALL, crouch: 0, dive: true };
    const f = ph.stage === 'windup' ? SAB.WINDUP : ph.stage === 'active' ? SAB.STRIKE : SAB.RECOVER;
    return { frame: f, crouch: p.attack === ATTACK.CROUCH ? Math.max(0.85, p.crouch) : 0 };
  }

  if (p.crouch > 0.05) return { frame: SAB.WINDUP, crouch: p.crouch };

  if (!p.grounded) return { frame: p.vy < -30 ? SAB.RISE : SAB.FALL, crouch: 0 };

  if (Math.abs(p.vx) > 26) {
    const cycle = [SAB.RUN_A, SAB.RUN_B, SAB.RUN_C];
    return { frame: cycle[Math.floor(p.animTime * 9.5) % 3], crouch: 0 };
  }
  return { frame: Math.floor(p.animTime * 1.4) % 2 === 0 ? SAB.IDLE_A : SAB.IDLE_B, crouch: 0 };
}
