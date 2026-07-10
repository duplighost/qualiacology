// Scripted beats: the player's paranoid inner monologue on room entry, and the
// arrest finale — reach the far bedroom, the shape at the window, the lights come
// up, the forced turn, the officer, the cuffs.
import { MONO, ENDING } from './story.js';

export class Events {
  constructor(ctx) {
    this.ctx = ctx;
    this.t = 0;
    this.triggers = this.buildTriggers();
    this.finale = { active: false, phase: '', t: 0, turnTo: Math.PI, cuffed: false };
    this._seenStairs = false;
  }

  start() {
    const C = this.ctx;
    setTimeout(() => { this.monoSeq(MONO.intro, 3400); C.audio.ghostChord(0.07); }, 1200);
    setTimeout(() => C.ui.objectiveFlash('The house is dark. Find what it keeps.'), 9000);
  }

  // print an array of thoughts one after another on the monologue channel
  monoSeq(lines, gap = 3200) {
    lines.forEach((ln, i) => setTimeout(() => this.ctx.ui.monologue(ln, gap + 500), i * gap));
  }

  buildTriggers() {
    const t = [];
    const add = (id, x0, z0, x1, z1, level, fire) =>
      t.push({ id, x0, z0, x1, z1, level, fire, done: false });

    // ground — the prowler talks himself through the dark
    add('foyer',      24, 30, 36, 40, 'ground', () => this.monoSeq(MONO.foyer));
    add('living',      0, 30, 21, 40, 'ground', () => this.monoSeq(MONO.living));
    add('studySee',    0, 15, 12, 26, 'ground', () => this.monoSeq(MONO.studySee));
    add('kitchenSee', 50, 30, 60, 40, 'ground', () => {
      this.monoSeq(MONO.kitchenSee);
      this.ctx.fx.fearTarget = 0.32; setTimeout(() => (this.ctx.fx.fearTarget = 0), 3200);
    });
    // upstairs
    add('landing',     0, 25, 60, 30, 'first', () => this.monoSeq(MONO.landing));
    add('longhall',   27,  9, 32, 25, 'first', () => {
      this.monoSeq(MONO.longhall);
      this.ctx.audio.heartbeat(true);
      this.ctx.fx.fearTarget = 0.4;
    });
    // the far bedroom — the end
    add('master',     24,  0, 36,  7, 'first', () => this.runArrest());
    return t;
  }

  update(dt) {
    const C = this.ctx;
    if (!C.player.enabled) return;   // no scripted beats until the break-in
    this.t += dt;
    const p = C.player.pos;
    const level = C.world.levelAt(p.y);

    if (!this._seenStairs && p.y > 1.2 && p.y < 3.9) {
      this._seenStairs = true;
      this.monoSeq(MONO.stairs);
    }

    for (const tr of this.triggers) {
      if (tr.done || tr.level !== level) continue;
      if (p.x < tr.x0 || p.x > tr.x1 || p.z < tr.z0 || p.z > tr.z1) continue;
      tr.done = true;
      tr.fire();
    }

    if (this.finale.active) this.updateFinale(dt);
  }

  /* ---------------- the arrest ---------------- */

  runArrest() {
    const C = this.ctx;
    if (this.finale.active || C.game.arrested) return;
    C.game.arrested = true;
    this.finale.active = true;
    this.finale.phase = 'draw';
    // the last, wrongest thought — spoken as he drifts toward the "figure"
    this.monoSeq(MONO.masterEnter, 2600);
    setTimeout(() => this.beginReveal(), 2300);
  }

  beginReveal() {
    const C = this.ctx;
    this.finale.phase = 'stunned';
    this.finale.t = 0;
    C.player.frozen = true;              // take the controls
    C.fx.flipAllLightsOn();              // the whole house, all at once
    C.audio.heartbeat(false);
    C.audio.lightsOn();                  // breaker thunk, relay clack, mains hum
    setTimeout(() => C.audio.dawn(), 400);   // the dread resolves upward — it was nothing

    // the officer, already in the doorway behind you
    const off = C.npcs.officer;
    off.position.set(29, 4.2, 8.4);
    off.rotation.y = 0;
    off.visible = true;
    // turn to face wherever the officer actually is relative to you
    const dx = off.position.x - C.player.pos.x, dz = off.position.z - C.player.pos.z;
    this.finale.turnTo = Math.atan2(-dx, -dz);

    setTimeout(() => { this.finale.phase = 'turn'; }, 1000);
  }

  updateFinale(dt) {
    const C = this.ctx, f = this.finale;
    f.t += dt;
    const off = C.npcs.officer;

    if (f.phase === 'draw' || f.phase === 'stunned') {
      // the last free moment — let them drift toward the "figure", but don't let
      // them slip back out of the room and break the staged reveal
      if (C.player.pos.z > 7.2) C.player.pos.z = 7.2;
      return;
    }
    if (f.phase === 'turn') {
      // force the camera around to the door
      let d = f.turnTo - C.player.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      C.player.yaw += d * Math.min(1, dt * 2.4);
      C.player.pitch += (0 - C.player.pitch) * Math.min(1, dt * 2.4);
      if (Math.abs(d) < 0.05) { f.phase = 'approach'; f.t = 0; }
    } else if (f.phase === 'approach') {
      const dx = C.player.pos.x - off.position.x, dz = C.player.pos.z - off.position.z;
      const dd = Math.hypot(dx, dz);
      off.rotation.y = Math.atan2(-dx, -dz);
      off.userData.phase += dt * 6;
      const sw = Math.sin(off.userData.phase) * 0.5;
      off.userData.legL.rotation.x = sw; off.userData.legR.rotation.x = -sw;
      off.userData.armL.rotation.x = -sw * 0.6; off.userData.armR.rotation.x = sw * 0.6;
      if (dd > 1.7) {
        const st = Math.min(dd, 1.5 * dt);
        off.position.x += dx / dd * st;
        off.position.z += dz / dd * st;
      } else if (!f.cuffed) {
        f.cuffed = true;
        this.doCuffs();
      }
    }
  }

  doCuffs() {
    const C = this.ctx;
    this.finale.phase = 'done';
    C.audio.lockedRattle();
    setTimeout(() => C.audio.metalDrop(), 350);
    C.ui.say('', '“Hands where I can see them. Behind your back — slowly.”', 5000);
    // the realisation, spoken over the ordinary lit room
    setTimeout(() => this.monoSeq(MONO.after, 2400), 900);
    // then fade to black and the end cards
    setTimeout(() => { document.getElementById('fade').style.opacity = 1; }, 7600);
    setTimeout(() => { C.ui.showEnding(ENDING.arrest); }, 9200);
    setTimeout(() => { C.ui.swapEnding(ENDING.epilogue); C.game.won = true; }, 20000);
  }
}
