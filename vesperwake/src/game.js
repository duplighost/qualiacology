/* game.js — the machine that runs the chapter.
 *
 * The one non-obvious rule in here: input edge flags are cleared INSIDE the
 * fixed-step loop, once per consumed step. Clearing them per rendered frame
 * silently drops most presses on a high-refresh display, and the game feels
 * "off" in a way that is almost impossible to diagnose from the outside.
 */

import { VIEW_W, VIEW_H, SIM, PLAYER, RESONANCE, FAIR } from './config.js';
import { clamp, lerp, overlaps, damp, Ring, TAU } from './core.js';
import { Input, TouchPad } from './input.js';
import { Camera, renderGame } from './render.js';
import { Particles } from './art/fx.js';
import { Backdrop } from './art/backdrop.js';
import { preloadSprites } from './art/atlas.js';
import { drawHud, drawHintGlyph } from './hud.js';
import { Audio } from './audio.js';
import {
  makePlayer, updatePlayer, whipBox, damagePlayer, onWhipConnect,
  notePassedThrough, playerFrame, ATTACK, cancelAttack,
} from './player.js';
import {
  spawnEnemy, updateEnemy, enemyHitbox, enemyBody, damageEnemy, isBlocked, DEFS,
} from './enemies.js';
import {
  resetLevelRuntime, updateTerrain, hazardAt, groundUnder as levelGroundUnder,
  platformsNear, zoneAt,
} from './level.js';
import { PAINTERS } from './art/painters.js';
import { LEVELS } from './levels/index.js';
import { Boss, updateBoss, drawBoss, bossHitboxes } from './boss.js';
import {
  makeProgress, applyAll, chainLinksFor, buy, save as saveProgress,
  load as loadProgress, wipe as wipeProgress, dustFor, SHARDS,
} from './progress.js';
import { drawForge, drawMap, FORGE_KEYS } from './menus.js';

const SAVE_KEY = 'vesperwake.progress';
const BEST_KEY = 'vesperwake.best';

export class Game {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.callbacks = callbacks;
    this.input = new Input();
    this.audio = new Audio();
    this.particles = new Particles();
    this.camera = new Camera();
    this.ghosts = new Ring(24);

    this.mode = 'title';
    this.levelIndex = 0;
    this.level = null;
    this.painter = null;
    this.backdrop = null;
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.boss = null;

    this.worldTime = 0;
    this.runTime = 0;
    this.acc = 0;
    this.lastTime = 0;
    this.frame = 0;
    this.running = true;
    this.fatal = null;

    this.hitstop = 0;
    this.slowTimer = 0;
    this.slowRate = 1;
    this.screenFlash = 0;
    this.damageVeil = 0;
    this.lowHealthPulse = 0;

    this.bannerData = { title: '', subtitle: null, style: 'plain' };
    this.bannerTimer = 0;
    this.bannerMax = 1;

    const restored = loadProgress();
    this.progress = restored ? restored.progress : makeProgress();
    /* what a CONTINUE would resume: the chapter and the sun-disc, not just
     * the stats. Kept separate from progress so BEGIN AGAIN can throw it away
     * without touching anything else. */
    this.saved = restored && (restored.level > 0 || restored.checkpoint)
      ? { level: restored.level ?? 0, checkpoint: restored.checkpoint ?? null }
      : null;
    this.forgeIndex = 0;
    this.travelIndex = 0;
    this.atSunDisc = null;

    this.score = 0;
    this.kills = 0;
    this.chainLinks = chainLinksFor(this.progress);
    this.collectedRelics = new Set();
    this.exitOpen = false;
    this.checkpoint = null;
    this.transition = 0;
    this.deathTimer = 0;

    this.autotest = typeof location !== 'undefined' && new URLSearchParams(location.search).has('autotest');
    this.debugMode = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

    this.input.attach(window);
    this.touch = new TouchPad(canvas, this.input, { w: VIEW_W, h: VIEW_H });
    this.touch.layout();

    this.spritesReady = false;
    preloadSprites().then((ok) => { this.spritesReady = ok; });

    /* noon earned between sun-discs should not evaporate because a tab
     * closed — the disc is the RESPAWN point, not the only save */
    window.addEventListener('beforeunload', () => {
      if (this.mode === 'playing' || this.mode === 'paused') this.save();
    });
    window.addEventListener('pagehide', () => {
      if (this.mode === 'playing' || this.mode === 'paused') this.save();
    });

    this.backdrops = new Map();
    this.loadLevel(0, true);
  }

  /* ---------------------------------------------------------------- */

  async loadLevel(index, immediate = false) {
    this.levelIndex = clamp(index, 0, LEVELS.length - 1);
    const def = LEVELS[this.levelIndex];
    this.level = def.build();
    this.painter = PAINTERS[this.level.painter];
    resetLevelRuntime(this.level);

    let bd = this.backdrops.get(this.level.id);
    if (!bd) {
      bd = new Backdrop(this.level.backdrop);
      this.backdrops.set(this.level.id, bd);
      bd.load().then(() => { /* palette becomes real once decoded */ });
    }
    this.backdrop = bd;

    this.enemies = this.level.enemies.map((e) => spawnEnemy(e.kind, e.x, e.y, e));
    this.projectiles = [];
    this.particles.clear();
    this.boss = null;
    this.exitOpen = this.level.bossArena ? false : true;
    this.checkpoint = null;

    const sp = this.level.spawn;
    if (!this.player) { this.player = makePlayer(sp.x, sp.y); applyAll(this.progress, this.player); }
    this.player.x = sp.x; this.player.y = sp.y;
    this.player.vx = 0; this.player.vy = 0;
    this.player.dead = false;
    this.player.hp = this.player.maxHp;
    cancelAttack(this.player);
    this.camera.snap(this.player, this.level);
    this.ghosts.clear();
    this.zoneName = null;

    if (!immediate) {
      this.banner(this.level.name, `CHAPTER ${this.level.chapter}`, 3.2);
      this.audio.startMusic(this.level.music ?? this.levelIndex);
    }
  }

  hasSave() { return Boolean(this.saved); }

  /* Start a run at `index`, keeping everything the forge and the shards have
   * given you. `at` is a sun-disc to stand on instead of the chapter spawn. */
  resetRun(index = 0, at = null) {
    this.score = 0;
    this.kills = 0;
    this.runTime = 0;
    this.collectedRelics = new Set(this.progress.relics);
    this.player = makePlayer(0, 0);
    applyAll(this.progress, this.player);
    this.player.hp = this.player.maxHp;
    this.chainLinks = chainLinksFor(this.progress);
    this.loadLevel(clamp(index, 0, LEVELS.length - 1), true);
    if (at) {
      this.checkpoint = { x: at.x, y: at.y };
      this.player.x = at.x;
      this.player.y = at.y - this.player.h;
      /* every disc you had already lit stays lit, so the map is not a lie */
      for (const c of this.level.checkpoints) c.lit = c.x <= at.x;
      this.camera.snap(this.player, this.level);
    }
    this.banner(this.level.name, `CHAPTER ${this.level.chapter}`, 3.2);
  }

  /* BEGIN AGAIN: the whole vow, from the gate, with nothing carried. */
  async newRun() {
    if (!this.autotest) await this.audio.unlock();
    this.progress = makeProgress();
    this.saved = null;
    wipeProgress();
    this.bossDefeated = false;
    this.resetRun(0);
    this.audio.startMusic(0);
    this.setMode('playing');
  }

  /* CONTINUE: back to the last sun-disc, carrying everything. */
  async continueRun() {
    if (!this.autotest) await this.audio.unlock();
    const s = this.saved ?? { level: 0, checkpoint: null };
    this.bossDefeated = false;
    this.resetRun(s.level ?? 0, s.checkpoint);
    this.audio.startMusic(this.level.music ?? this.levelIndex);
    this.setMode('playing');
  }

  async start() {
    if (this.mode === 'paused') { this.setMode('playing'); return; }
    if (this.hasSave()) { await this.continueRun(); return; }
    await this.newRun();
  }

  setMode(m) {
    this.mode = m;
    this.callbacks.onMode?.(m, this.snapshot());
  }

  togglePause() {
    if (this.mode === 'playing') { this.save(); this.setMode('paused'); }
    else if (this.mode === 'paused') this.setMode('playing');
  }

  toggleMute() {
    const m = !this.audio.isMuted();
    this.audio.setMuted(m);
    this.callbacks.onMute?.(m);
    return m;
  }

  snapshot() {
    return {
      mode: this.mode,
      level: this.level?.name ?? '',
      chapter: this.level?.chapter ?? '',
      hp: this.player?.hp ?? 0,
      maxHp: this.player?.maxHp ?? 0,
      score: this.score,
      relics: this.collectedRelics.size,
      runTime: this.runTime,
    };
  }

  /* ---- feedback helpers used by everything else ------------------- */

  sound(name, param) { if (!this.autotest) this.audio.play(name, param); }
  shake(n) { this.camera.add(n); }
  hitch(duration, rate = 0.2) { this.slowTimer = Math.max(this.slowTimer, duration); this.slowRate = rate; }
  flash(n) { this.screenFlash = Math.max(this.screenFlash, n); }

  banner(title, subtitle = null, time = 2.2, style = 'plain') {
    this.bannerData = { title, subtitle, style };
    this.bannerTimer = time;
    this.bannerMax = time;
  }

  puff(x, y, kind) {
    const cols = { jump: '#cfe9ea', pogo: '#ffe8b4', dust: '#c8d4cf', land: '#b8d8da' };
    this.particles.burst(x, y, cols[kind] ?? '#cfe9ea', kind === 'pogo' ? 14 : 9, 130, 'dust',
      { lift: 24, gravity: 220, life: 0.42, r: 3 });
  }

  trailBurst(p) {
    this.particles.burst(p.x + p.w * 0.5, p.y + p.h * 0.6, '#bfeaff', 10, 200, 'spark',
      { angle: p.stepDir > 0 ? Math.PI : 0, spread: 0.9, life: 0.3, gravity: 60 });
  }

  enemyCommitFlash(e) {
    /* a hard brightness pop at the instant an attack becomes real: the one
     * frame that tells a colourblind player "now" as clearly as anyone */
    e.flash = 1;
    this.particles.ring(e.x + e.w * 0.5, e.y + e.h * 0.5, 'rgba(255,252,232,.9)', 8, 46, 0.20, 3);
  }

  onLand(p) {
    this.sound('land', clamp(Math.abs(p.vy) / 500 + 0.35, 0.3, 1.1));
    if (Math.abs(p.vy) > 200) this.puff(p.x + p.w * 0.5, p.y + p.h, 'land');
  }

  onPlayerHurt(amount) {
    this.sound('hurt');
    this.shake(7);
    this.damageVeil = 1;
    this.hitch(SIM.HITSTOP_HEAVY, 0.1);
    this.particles.burst(this.player.x + this.player.w * 0.5, this.player.y + this.player.h * 0.5,
      '#ffd2dd', 14, 210, 'spark', { life: 0.4 });
  }

  groundUnder(x, fromY) {
    if (!this.level) return null;
    let best = levelGroundUnder(this.level, x, fromY);
    for (const m of this.level.movers) {
      if (x >= m.x && x <= m.x + m.w && m.y >= fromY - 2 && (best === null || m.y < best)) best = m.y;
    }
    for (const c of this.level.crumbles) {
      if (c.state === 'gone') continue;
      if (x >= c.x && x <= c.x + c.w && c.y >= fromY - 2 && (best === null || c.y < best)) best = c.y;
    }
    return best;
  }

  spawnProjectile(pr) {
    this.projectiles.push({
      id: `p${this.frame}-${this.projectiles.length}`,
      w: pr.w ?? pr.r * 2, h: pr.h ?? pr.r * 2,
      gravity: 0, dead: false, ...pr,
    });
  }

  /* ---------------------------------------------------------------- *
   * loop
   * ---------------------------------------------------------------- */

  loop(now) {
    if (!this.running) return;
    try {
      const rawMs = now - this.lastTime;
      const raw = Math.min(SIM.MAX_FRAME, Math.max(0, rawMs / 1000));
      this.lastTime = now;
      if (rawMs > 0 && rawMs < 200) this.trackFrame(rawMs);
      this.worldTime += raw;

      let dt = raw;
      if (this.slowTimer > 0) {
        this.slowTimer -= raw;
        dt *= this.slowRate;
      }
      if (this.hitstop > 0) { this.hitstop -= raw; dt = 0; }

      if (this.mode === 'playing' || this.mode === 'dying' || this.mode === 'victory') {
        this.acc += dt;
        let guard = 0;
        while (this.acc >= SIM.STEP && guard < 8) {
          this.step(SIM.STEP);
          this.input.clearEdges();   /* <-- inside the loop. always. */
          this.acc -= SIM.STEP;
          guard += 1;
        }
        if (guard >= 8) this.acc = 0;
      } else {
        if (this.mode === 'forge' || this.mode === 'map') this.menuInput();
        this.input.clearEdges();
      }

      this.render();
    } catch (err) {
      this.fatal = err;
      this.running = false;
      console.error(err);
      this.callbacks.onError?.(err);
    }
    if (this.running) requestAnimationFrame((t) => this.loop(t));
  }

  /* Deterministic stepping for tests and hidden tabs. */
  advance(seconds) {
    const steps = Math.round(seconds / SIM.STEP);
    for (let i = 0; i < steps; i += 1) {
      this.step(SIM.STEP);
      this.input.clearEdges();
    }
  }

  step(dt) {
    this.frame += 1;
    const p = this.player;

    this.screenFlash = Math.max(0, this.screenFlash - dt * 3.2);
    this.damageVeil = Math.max(0, this.damageVeil - dt * 2.6);
    this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    this.lowHealthPulse = p.hp / p.maxHp < 0.3 ? (Math.sin(this.worldTime * 6) * 0.5 + 0.5) : 0;

    if (this.mode === 'victory') {
      this.transition = Math.min(1, this.transition + dt * 0.6);
      this.particles.update(dt);
      this.camera.update(p, this.level, dt);
      return;
    }

    if (this.mode === 'dying') {
      this.deathTimer += dt;
      this.particles.update(dt);
      updateTerrain(this.level, dt);
      this.camera.update(p, this.level, dt);
      if (this.deathTimer > 1.6) this.respawn();
      return;
    }

    this.runTime += dt;

    updateTerrain(this.level, dt);
    updatePlayer(this, p, this.input, dt);

    /* the after-image ring for the quickstep */
    const f = playerFrame(p, this.input);
    this.ghosts.push({ x: p.x + p.w * 0.5, y: p.y + p.h, facing: p.facing, frame: f.frame, crouch: f.crouch });

    for (const e of this.enemies) updateEnemy(this, e, dt);
    if (this.boss) updateBoss(this, this.boss, dt);

    this.updateProjectiles(dt);
    this.resolveCombat(dt);
    this.resolvePickups();
    this.resolveWorld(dt);

    this.particles.update(dt);
    this.camera.update(p, this.level, dt);
    this.backdrop.update(dt, clamp((p.x / this.level.width - 0.35) / 0.5, 0, 1));

    /* cull */
    this.enemies = this.enemies.filter((e) => !(e.dead && e.deathTimer > 1.1));
    this.projectiles = this.projectiles.filter((pr) => !pr.dead);

    if (p.dead && this.mode === 'playing') {
      this.setMode('dying');
      this.deathTimer = 0;
      this.audio.stopMusic();
      this.sound('toll');
      this.shake(10);
    }
  }

  /* ---- projectiles ------------------------------------------------ */

  updateProjectiles(dt) {
    for (const pr of this.projectiles) {
      if (pr.dead) continue;
      pr.life -= dt;
      if (pr.life <= 0) { pr.dead = true; continue; }
      if (pr.stuckTimer !== undefined) {
        pr.stuckTimer -= dt;
        if (pr.stuckTimer <= 0) pr.dead = true;
        continue;
      }
      if (pr.gravity) pr.vy += pr.gravity * dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      /* ground waves ride the floor */
      if (pr.ground) {
        const g = this.groundUnder(pr.x, pr.y - 30);
        if (g !== null) pr.y = g - pr.h * 0.5;
        else { pr.dead = true; continue; }
      }
      if (pr.sticks && pr.vy > 0) {
        const g = this.groundUnder(pr.x, pr.y);
        if (g !== null && pr.y >= g - 6) {
          pr.y = g - 6; pr.vy = 0; pr.stuck = true; pr.stuckTimer = 1.6;
          this.particles.burst(pr.x, pr.y, '#d8cfa8', 8, 150, 'dust', { gravity: 320, life: 0.4 });
          this.sound('land', 0.7);
        }
      }
      if (pr.x < -80 || pr.x > this.level.width + 80 || pr.y > this.level.height + 400) pr.dead = true;
    }
  }

  /* ---- combat ----------------------------------------------------- */

  resolveCombat(dt) {
    const p = this.player;

    /* --- the whip --- *
     * hits is captured up front: a blocked strike cancels the attack, which
     * clears p.attackHits mid-loop. */
    const box = whipBox(p);
    const hits = p.attackHits;
    if (box && hits) {
      for (const e of this.enemies) {
        if (e.dead || hits.has(e.id)) continue;
        const body = enemyBody(e);
        if (!body || !overlaps(box, body)) continue;
        hits.add(e.id);

        if (isBlocked(e, box)) {
          e.guardFlash = 1;
          this.sound('guard');
          this.hitch(SIM.HITSTOP_LIGHT, 0.05);
          this.shake(3);
          this.particles.burst(box.x + (p.facing > 0 ? box.w : 0), box.y + box.h * 0.5,
            '#ffe6ac', 12, 220, 'spark', { life: 0.34 });
          /* a blocked strike pushes YOU back — the shield is a real wall */
          p.vx = -p.facing * 150;
          if (p.attack === ATTACK.DIVE) p.vy = -160;
          cancelAttack(p);
          break;
        }

        const mult = (p.sunstrikeArmed ? 2.6 : 1) * (p.damageMult ?? 1);
        const dir = Math.sign(e.x + e.w * 0.5 - (p.x + p.w * 0.5)) || p.facing;
        const killed = damageEnemy(this, e, box.damage * mult, {
          knock: box.knock * (p.sunstrikeArmed ? 1.6 : 1), dir,
          stagger: box.heavy ? 0.3 : 0,
        });
        onWhipConnect(this, p, e, box);
        this.impact(box, e, killed, p.sunstrikeArmed);
        if (killed) this.hitch(SIM.HITSTOP_KILL, 0.05);
      }

      /* breakables */
      for (const br of this.level.breakables) {
        if (br.dead || hits.has(`b${br.id}`)) continue;
        if (!overlaps(box, br)) continue;
        hits.add(`b${br.id}`);
        br.hp -= 1;
        br.flash = 1;
        this.sound('break');
        this.particles.burst(br.x + br.w * 0.5, br.y + br.h * 0.5, '#d8dcc8', 16, 240, 'shard',
          { gravity: 700, life: 0.6, r: 3 });
        onWhipConnect(this, p, br, box);
        if (br.hp <= 0) {
          br.dead = true;
          this.shake(3);
          if (br.drop) this.dropPickup(br.drop, br.x + br.w * 0.5, br.y + br.h * 0.5);
          if (br.kind === 'falsewall') {
            this.banner('A FALSE STONE SINGS', null, 2.0);
            this.progress.secretsFound.add(`${this.level.id}:${br.id}`);
            this.revealHidden(br.x);
          }
        }
      }

      /* the boss */
      if (this.boss && !this.boss.defeated && !hits.has('boss')) {
        const bb = this.boss.body();
        if (overlaps(box, bb) && this.boss.vulnerable) {
          hits.add('boss');
          const mult = (p.sunstrikeArmed ? 2.6 : 1) * (p.damageMult ?? 1);
          this.boss.hurt(this, box.damage * mult);
          onWhipConnect(this, p, this.boss, box);
          this.impact(box, { x: bb.x, y: bb.y, w: bb.w, h: bb.h }, false, p.sunstrikeArmed);
        } else if (overlaps(box, bb)) {
          this.sound('guard');
          this.particles.burst(box.x, box.y + box.h * 0.5, '#e0d4ff', 8, 180, 'spark', { life: 0.3 });
          hits.add('boss');
        }
      }
    }

    /* --- what hurts us --- */
    for (const e of this.enemies) {
      if (e.dead) continue;
      const hb = enemyHitbox(e);
      if (hb) {
        const pb = { x: p.x, y: p.y, w: p.w, h: p.h };
        if (overlaps(hb, pb)) {
          if (p.stepIFrames) notePassedThrough(p);
          else if (!e.attackHit) {
            if (damagePlayer(this, p, hb.damage, e.x + e.w * 0.5)) e.attackHit = true;
          }
        }
      }
      const d = DEFS[e.kind];
      if (d.contact > 0 && e.state !== 'attack') {
        const body = enemyBody(e);
        const pb = { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 4 };
        if (body && overlaps(body, pb)) damagePlayer(this, p, d.contact, e.x + e.w * 0.5);
      }
    }

    if (this.boss && !this.boss.defeated) {
      for (const hb of bossHitboxes(this.boss)) {
        const pb = { x: p.x, y: p.y, w: p.w, h: p.h };
        if (!overlaps(hb, pb)) continue;
        if (p.stepIFrames) notePassedThrough(p);
        else damagePlayer(this, p, hb.damage, hb.x + hb.w * 0.5);
      }
    }

    for (const pr of this.projectiles) {
      if (pr.dead) continue;
      const prBox = { x: pr.x - (pr.w ?? 12) * 0.5, y: pr.y - (pr.h ?? 12) * 0.5, w: pr.w ?? 12, h: pr.h ?? 12 };
      const pb = { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 4 };
      if (overlaps(prBox, pb)) {
        if (p.stepIFrames) { notePassedThrough(p); continue; }
        if (damagePlayer(this, p, pr.damage, pr.x)) {
          if (!pr.wave) pr.dead = true;
        }
      }
      /* the whip swats shards out of the air — a small mercy that rewards timing */
      if (box && !pr.wave && !pr.dead && overlaps(box, prBox)) {
        pr.dead = true;
        this.particles.burst(pr.x, pr.y, '#dff2ff', 10, 200, 'spark', { life: 0.3 });
        this.sound('hit');
      }
    }
  }

  impact(box, target, killed, sun) {
    const x = clamp(this.player.facing > 0 ? box.x + box.w : box.x, target.x, target.x + target.w);
    const y = box.y + box.h * 0.5;
    this.particles.burst(x, y, sun ? '#fff0b4' : '#e8f8ff', killed ? 22 : 12,
      killed ? 300 : 210, 'spark', { life: killed ? 0.6 : 0.34 });
    this.particles.ring(x, y, sun ? 'rgba(255,240,180,.9)' : 'rgba(226,247,255,.85)',
      6, killed ? 62 : 34, 0.24, killed ? 4 : 2.6);
    this.sound(killed ? 'kill' : (box.heavy || sun ? 'heavy' : 'hit'));
    this.shake(killed ? 6 : box.heavy ? 4.5 : 2.4);
    if (!killed) this.hitch(box.heavy ? SIM.HITSTOP_HEAVY : SIM.HITSTOP_LIGHT, 0.06);
  }

  /* Everything that dies leaves a little noon behind. It is collected on
   * contact rather than on kill so a fight still has a floor to clean up. */
  /* Called by damageEnemy the moment anything dies, however it died. */
  onEnemyKilled(e) {
    this.kills += 1;
    this.score += DEFS[e.kind].score;
    this.dropDust(e);
    this.dropShardFrom(e);
  }

  dropDust(e) {
    const amount = dustFor(DEFS[e.kind].score, ((this.frame * 2654435761) % 1000) / 1000);
    this.level.pickups.push({
      id: `n${this.frame}-${e.id}`, kind: 'dust', amount,
      x: e.x + e.w * 0.5, y: e.y + e.h * 0.5, taken: false, bob: (this.frame % 7),
      vy: -90, life: 22,
    });
  }

  /* Some enemies are carrying something. Killing one of those is the only
   * way an ability enters the game, which is what makes the ability feel
   * like it came out of the world rather than out of a menu. */
  dropShardFrom(e) {
    const which = e.spawnOpts?.shard;
    if (!which || this.progress.shards.has(which)) return;
    this.level.pickups.push({
      id: `s${this.frame}`, kind: 'shard', shard: which,
      x: e.x + e.w * 0.5, y: e.y + e.h * 0.5 - 10, taken: false, bob: 0,
    });
    this.flash(0.55);
    this.shake(6);
    this.hitch(0.2, 0.2);
    this.sound('toll');
    this.particles.burst(e.x + e.w * 0.5, e.y + e.h * 0.5, '#d9bbf1', 30, 220, 'spark', { life: 1.1, gravity: -30 });
  }

  dropPickup(kind, x, y) {
    this.level.pickups.push({ id: `d${this.frame}`, kind, x, y, taken: false, bob: 0 });
  }

  revealHidden(x) {
    for (const k of this.level.pickups) if (k.hidden && Math.abs(k.x - x) < 220) k.hidden = false;
    this.flash(0.6);
  }

  /* ---- world ------------------------------------------------------ */

  resolvePickups() {
    const p = this.player;
    const pb = { x: p.x - 6, y: p.y - 6, w: p.w + 12, h: p.h + 12 };
    for (const k of this.level.pickups) {
      if (k.taken) continue;
      if (!overlaps(pb, { x: k.x - 12, y: k.y - 12, w: 24, h: 24 })) continue;
      k.taken = true;
      this.sound('pickup');
      this.particles.burst(k.x, k.y, '#fff4c8', 18, 200, 'spark', { life: 0.6, gravity: -60 });
      switch (k.kind) {
        case 'dust':
          this.progress.dust += k.amount ?? 5;
          break;
        case 'heart':
          p.hp = Math.min(p.maxHp, p.hp + 25);
          break;
        case 'vitality':
          p.maxHp += 20; p.hp = p.maxHp;
          this.banner('THE NOONCORD REMEMBERS', 'Vitality increased', 2.4);
          break;
        case 'relic':
          this.collectedRelics.add(`${this.level.id}`);
          this.progress.relics.add(`${this.level.id}`);
          this.banner('A RELIC OF NOON', `${this.progress.relics.size} of 3`, 2.6);
          this.flash(0.5);
          break;
        case 'shard':
          this.grantShard(k.shard);
          break;
        default: break;
      }
      if (k.kind !== 'dust') this.score += 50;
    }
  }

  grantShard(which) {
    const def = SHARDS[which];
    if (!def) return;
    this.progress.shards.add(which);
    applyAll(this.progress, this.player);
    this.banner(def.name, def.line, 3.4);
    this.flash(0.8);
    this.shake(5);
    this.hitch(0.25, 0.25);
    this.sound('toll');
    saveProgress(this.progress, { level: this.levelIndex, checkpoint: this.checkpoint });
  }

  resolveWorld(dt) {
    const p = this.player;

    /* hazards */
    const hz = hazardAt(this.level, { x: p.x + 5, y: p.y + p.h - 6, w: p.w - 10, h: 6 });
    if (hz && !p.dead) {
      if (hz.damage >= 999) {
        p.hp = 0; p.dead = true;
        this.banner('THE ABYSS RETURNS YOU', null, 2.0);
      } else {
        damagePlayer(this, p, hz.damage, p.x);
      }
    }
    if (p.y > this.level.height + 300 && !p.dead) { p.hp = 0; p.dead = true; }

    /* the shard gates open the moment you carry what opens them */
    for (const gate of this.level.gates) {
      if (gate.open) continue;
      if (!this.progress.shards.has(gate.shard)) continue;
      if (Math.abs(p.x + p.w * 0.5 - (gate.x + gate.w * 0.5)) > 260) continue;
      gate.open = true;
      this.sound('door');
      this.flash(0.4);
      this.shake(4);
      this.particles.burst(gate.x + gate.w * 0.5, gate.y + gate.h * 0.5, '#e6d2ff', 26, 240, 'spark', { life: 0.9 });
      this.banner('THE SEAL LETS YOU BY', null, 2.0);
    }

    /* standing at a lit sun-disc is how you reach the forge and the map */
    this.atSunDisc = null;
    for (const c of this.level.checkpoints) {
      if (!c.lit) continue;
      if (Math.abs(p.x + p.w * 0.5 - c.x) < 46 && Math.abs(p.y + p.h - c.y) < 70) this.atSunDisc = c;
    }
    /* Up is also the overhead strike, so the forge wants Up HELD for a
     * moment with no strike in progress. A tap should never eat your attack. */
    if (this.atSunDisc && this.input.held.up && p.grounded
        && p.attack === 'none' && !this.input.held.attack && this.mode === 'playing') {
      this.sunDiscHold = (this.sunDiscHold ?? 0) + dt;
    } else {
      this.sunDiscHold = 0;
    }
    if (this.sunDiscHold > 0.34) {
      this.sunDiscHold = 0;
      this.forgeIndex = 0;
      this.travelIndex = this.levelIndex;
      this.setMode('forge');
      this.sound('checkpoint');
      return;
    }
    if (this.input.pressed.map && this.mode === 'playing') {
      this.travelIndex = this.levelIndex;
      this.setMode('map');
      return;
    }

    /* checkpoints */
    for (const c of this.level.checkpoints) {
      if (c.lit) continue;
      if (Math.abs(p.x + p.w * 0.5 - c.x) < 34 && Math.abs(p.y + p.h - c.y) < 90) {
        c.lit = true;
        this.checkpoint = { x: c.x, y: c.y };
        p.hp = p.maxHp;
        this.sound('checkpoint');
        this.flash(0.35);
        this.banner('SUN-DISC REMEMBERED', null, 2.0);
        this.saved = { level: this.levelIndex, checkpoint: { x: c.x, y: c.y } };
        this.particles.burst(c.x, c.y - 34, '#ffe9a8', 24, 190, 'spark', { life: 0.8, gravity: -40 });
        this.save();
      }
    }

    /* triggers */
    for (const t of this.level.triggers) {
      if (t.fired && t.once) continue;
      if (p.x + p.w * 0.5 > t.x && p.x < t.x + t.w) { t.fired = true; t.fn(this); }
    }

    /* zone announcements — the only time the game names a place */
    const z = zoneAt(this.level, p.x + p.w * 0.5);
    if (z && z.name !== this.zoneName) {
      this.zoneName = z.name;
      this.progress.zonesSeen.add(`${this.level.id}:${z.name}`);
      this.callbacks.onZone?.(z.name);
    }

    /* the boss arena */
    if (this.level.bossArena && !this.boss && !this.bossDefeated) {
      const a = this.level.bossArena;
      if (p.x + p.w * 0.5 > a.x + 40) this.spawnBoss();
    }

    /* the way out */
    if (this.exitOpen && this.level.exit) {
      const ex = this.level.exit;
      if (overlaps({ x: p.x, y: p.y, w: p.w, h: p.h }, ex)) this.completeLevel();
    }
  }

  spawnBoss() {
    this.boss = new Boss(this, this.level.bossArena);
    this.audio.startMusic(3 % 3);
    this.sound('toll');
    this.banner('ABBESS IONE', 'THE THIRTEENTH VOICE', 3.4);
    this.flash(0.8);
    this.shake(10);
  }

  onBossDefeated() {
    this.bossDefeated = true;
    this.exitOpen = true;
    this.projectiles.length = 0;
    this.enemies.length = 0;
    this.banner('THE THIRTEENTH VOICE IS SILENT', 'The Dawn Door opens to the east', 3.6);
    this.sound('door');
    this.flash(1);
  }

  completeLevel() {
    this.progress.chaptersCleared.add(this.level.id);
    this.progress.furthestChapter = Math.max(this.progress.furthestChapter, Math.min(2, this.levelIndex + 1));
    this.saved = { level: Math.min(LEVELS.length - 1, this.levelIndex + 1), checkpoint: null };
    if (this.levelIndex >= LEVELS.length - 1) {
      this.setMode('victory');
      this.transition = 0;
      this.audio.stopMusic();
      this.sound('toll');
      this.saveBest();
      return;
    }
    const hp = this.player.hp;
    const maxHp = this.player.maxHp;
    const abilities = { ...this.player.abilities };
    this.loadLevel(this.levelIndex + 1);
    this.player.hp = Math.max(hp, maxHp * 0.55);
    this.player.maxHp = maxHp;
    this.player.abilities = abilities;
    this.audio.startMusic(this.levelIndex);
    this.banner(this.level.name, `CHAPTER ${this.level.chapter}`, 3.2);
    this.save();
  }

  respawn() {
    this.progress.deaths += 1;
    const p = this.player;
    p.dead = false;
    p.hp = p.maxHp;
    p.vx = 0; p.vy = 0;
    p.invuln = 1.2;
    p.sliding = false;
    p.stepTime = 0;
    p.stepCooldown = 0;
    p.crouching = false;
    p.crouch = 0;
    p.h = 58;
    cancelAttack(p);
    const cp = this.checkpoint;
    p.x = cp ? cp.x : this.level.spawn.x;
    p.y = (cp ? cp.y : this.level.spawn.y) - p.h;
    /* the world reassembles around you */
    resetLevelRuntime(this.level);
    for (const c of this.level.checkpoints) c.lit = Boolean(cp) && c.x <= (cp?.x ?? -1);
    this.enemies = this.level.enemies.map((e) => spawnEnemy(e.kind, e.x, e.y, e));
    this.projectiles = [];
    if (this.level.bossArena && this.boss && !this.boss.defeated) this.boss = null;
    this.camera.snap(p, this.level);
    this.setMode('playing');
    this.audio.startMusic(this.level.music ?? this.levelIndex);
    this.banner('THE VOW REFORMS', null, 1.8);
  }

  /* ---- the sun-disc forge and the map ----------------------------- */

  menuInput() {
    const i = this.input;
    if (this.mode === 'forge') {
      if (i.pressed.down) { this.forgeIndex = (this.forgeIndex + 1) % FORGE_KEYS.length; this.sound('tell', 1.2); }
      if (i.pressed.up) { this.forgeIndex = (this.forgeIndex + FORGE_KEYS.length - 1) % FORGE_KEYS.length; this.sound('tell', 1.2); }
      if (i.pressed.attack) {
        const key = FORGE_KEYS[this.forgeIndex];
        if (buy(key, this.progress, this.player)) {
          this.chainLinks = chainLinksFor(this.progress);
          this.sound('checkpoint');
          this.flash(0.4);
          this.save();
        } else {
          this.sound('guard');
        }
      }
      if (i.pressed.map) { this.setMode('map'); this.travelIndex = this.levelIndex; }
      return;
    }
    /* the map */
    if (this.atSunDisc) {
      if (i.pressed.right) { this.travelIndex = clamp(this.travelIndex + 1, 0, Math.min(2, this.progress.furthestChapter)); this.sound('tell', 1.2); }
      if (i.pressed.left) { this.travelIndex = clamp(this.travelIndex - 1, 0, Math.min(2, this.progress.furthestChapter)); this.sound('tell', 1.2); }
      if (i.pressed.attack && this.travelIndex !== this.levelIndex) {
        this.travelTo(this.travelIndex);
        return;
      }
    }
    if (i.pressed.map) this.setMode(this.atSunDisc ? 'forge' : 'playing');
  }

  travelTo(index) {
    const hp = this.player.maxHp;
    this.loadLevel(index, true);
    this.player.hp = hp;
    applyAll(this.progress, this.player);
    this.chainLinks = chainLinksFor(this.progress);
    this.audio.startMusic(this.level.music ?? index);
    this.banner(this.level.name, `CHAPTER ${this.level.chapter}`, 3.0);
    this.sound('door');
    this.setMode('playing');
    this.save();
  }

  /* ---- persistence ------------------------------------------------ */

  save() {
    saveProgress(this.progress, {
      level: this.saved?.level ?? this.levelIndex,
      checkpoint: this.checkpoint ?? this.saved?.checkpoint ?? null,
    });
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        level: this.levelIndex,
        checkpoint: this.checkpoint,
        maxHp: this.player.maxHp,
        abilities: this.player.abilities,
        relics: [...this.collectedRelics],
      }));
    } catch { /* private mode */ }
  }

  saveBest() {
    try {
      const prev = Number(localStorage.getItem(BEST_KEY) || 0);
      if (!prev || this.runTime < prev) localStorage.setItem(BEST_KEY, String(this.runTime));
    } catch { /* ignore */ }
  }

  /* ---------------------------------------------------------------- *
   * render
   * ---------------------------------------------------------------- */

  /* Dynamic resolution.
   *
   * The renderer is fill-rate bound, not CPU bound: a grade pass, a fog bank
   * and two matte plates all cover the whole screen, so cost scales with
   * BACKING PIXELS and nothing else. On a big window that is enough to halve
   * the frame rate while the CPU sits at 5ms. So the backing store is capped
   * and then scaled to fit the machine: drop fast when frames go long, climb
   * back slowly when they do not. The art is painterly, so a little upscale
   * costs nothing anyone can see — and a locked 60 costs everything. */
  fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(160, rect.width * dpr);
    const cssH = Math.max(90, rect.height * dpr);
    const CAP_W = 1360;                       // ~1.42x the virtual width
    const cap = Math.min(1, CAP_W / cssW);
    const scale = cap * (this.renderScale ?? 1);
    const w = Math.max(320, Math.round(cssW * scale));
    const h = Math.max(180, Math.round(cssH * scale));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
  }

  trackFrame(ms) {
    if (this.renderScale === undefined) {
      this.renderScale = 1; this._slow = 0; this._fast = 0; this._warm = 0;
    }
    /* ignore the first second (decode, first paint) and any single hitch —
     * a garbage collection is not a reason to lower the resolution */
    this._warm += 1;
    if (this._warm < 70 || ms > 60) return;
    if (ms > 21) { this._slow += 1; this._fast = 0; }
    else if (ms < 14) { this._fast += 1; this._slow = 0; }
    if (this._slow > 40 && this.renderScale > 0.7) {
      this.renderScale = Math.max(0.7, this.renderScale - 0.08);
      this._slow = 0; this._fast = 0;
    } else if (this._fast > 90 && this.renderScale < 1) {
      this.renderScale = Math.min(1, this.renderScale + 0.06);
      this._fast = 0; this._slow = 0;
    }
  }

  render() {
    this.fit();
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const scale = Math.min(cw / VIEW_W, ch / VIEW_H);
    const ox = (cw - VIEW_W * scale) * 0.5;
    const oy = (ch - VIEW_H * scale) * 0.5;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#04070c';
    ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip();

    if (this.level && this.backdrop) {
      renderGame(this, ctx);
      /* hint glyphs live above the grade so they stay legible */
      ctx.save();
      ctx.translate(-this.camera.ox, -this.camera.oy);
      for (const pr of this.level.props) {
        if (pr.kind === 'hint') drawHintGlyph(ctx, pr, this.worldTime);
      }
      ctx.restore();
    }

    if (this.mode === 'playing' || this.mode === 'paused' || this.mode === 'dying') drawHud(ctx, this);
    if (this.mode === 'forge') drawForge(ctx, this);
    if (this.mode === 'map') drawMap(ctx, this);
    if (this.mode === 'paused') this.drawPause(ctx);
    if (this.mode === 'dying') this.drawDeath(ctx);
    if (this.mode === 'victory') this.drawVictory(ctx);
    if (this.touch.visible) this.touch.draw(ctx);
    if (this.debugMode) this.drawDebug(ctx);
  }

  drawBoss(ctx, env) { drawBoss(ctx, this.boss, env); }

  drawPause(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(2,5,11,.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eafcff';
    ctx.font = '600 30px Georgia, serif';
    ctx.fillText('THE BELL WAITS', VIEW_W * 0.5, VIEW_H * 0.46);
    ctx.font = 'italic 13px Georgia, serif';
    ctx.fillStyle = 'rgba(221,238,238,.7)';
    ctx.fillText('Esc / P to return', VIEW_W * 0.5, VIEW_H * 0.46 + 26);
    ctx.restore();
  }

  drawDeath(ctx) {
    const k = clamp(this.deathTimer / 1.6, 0, 1);
    ctx.save();
    ctx.fillStyle = `rgba(4,2,9,${k * 0.72})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = clamp((k - 0.2) / 0.5, 0, 1);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f7edf4';
    ctx.font = '600 29px Georgia, serif';
    ctx.fillText('THE BELL HAS FALLEN SILENT', VIEW_W * 0.5, VIEW_H * 0.47);
    ctx.restore();
  }

  drawVictory(ctx) {
    const k = this.transition;
    ctx.save();
    ctx.fillStyle = `rgba(13,28,43,${k * 0.86})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = k;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff8cf';
    ctx.font = '600 46px Georgia, serif';
    ctx.fillText('DAWN, RETURNED', VIEW_W * 0.5, VIEW_H * 0.42);
    ctx.font = 'italic 18px Georgia, serif';
    ctx.fillStyle = 'rgba(255,235,192,.9)';
    ctx.fillText('The city remembers how to become morning.', VIEW_W * 0.5, VIEW_H * 0.42 + 34);
    ctx.font = '700 13px Arial, sans-serif';
    ctx.fillStyle = '#f5fbf8';
    const mm = String(Math.floor(this.runTime / 60)).padStart(2, '0');
    const ss = String(Math.floor(this.runTime % 60)).padStart(2, '0');
    ctx.fillText(`SCORE ${this.score}   ·   TIME ${mm}:${ss}   ·   RELICS ${this.collectedRelics.size}/3`,
      VIEW_W * 0.5, VIEW_H * 0.42 + 68);
    ctx.restore();
  }

  drawDebug(ctx) {
    const p = this.player;
    ctx.save();
    ctx.translate(-this.camera.ox, -this.camera.oy);
    ctx.strokeStyle = 'rgba(120,255,180,.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    const wb = whipBox(p);
    if (wb) { ctx.strokeStyle = 'rgba(255,120,120,.9)'; ctx.strokeRect(wb.x, wb.y, wb.w, wb.h); }
    for (const e of this.enemies) {
      ctx.strokeStyle = 'rgba(255,220,120,.6)';
      ctx.strokeRect(e.x, e.y, e.w, e.h);
      const hb = enemyHitbox(e);
      if (hb) { ctx.strokeStyle = 'rgba(255,80,80,.9)'; ctx.strokeRect(hb.x, hb.y, hb.w, hb.h); }
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(200,255,220,.9)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`x ${p.x | 0} y ${p.y | 0} vx ${p.vx | 0} vy ${p.vy | 0} g${p.grounded ? 1 : 0} atk ${p.attack} res ${p.resonance}`, 12, VIEW_H - 14);
    ctx.restore();
  }
}
