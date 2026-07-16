// Scripted atmosphere and the arrest finale. No on-screen text during play —
// the house speaks only through sound and light. The one draw is a music box
// drifting from the far bedroom, louder the closer you get, pulling you up and
// down the long hall to the shape at the window. Then: the lights, the turn,
// the officer, the cuffs. The only words are the end cards.
import { ENDING } from './story.js';

export class Events {
  constructor(ctx) {
    this.ctx = ctx;
    this.t = 0;
    this.triggers = this.buildTriggers();
    this.finale = { active: false, phase: '', t: 0, turnTo: Math.PI, cuffed: false };
    this.mbT = 5;   // music-box phrase timer
  }

  start() {
    const C = this.ctx;
    // the far bedroom is shut and locked. Nothing leaks down the hall yet — the
    // only pull is the music box drifting from behind that door. You have to
    // explore the house, find the key in the cellar, and open it yourself.
    setTimeout(() => C.audio.ghostChord(0.06), 1400);   // one low breath, then only the house
  }

  buildTriggers() {
    const t = [];
    const add = (id, x0, z0, x1, z1, level, fire) =>
      t.push({ id, x0, z0, x1, z1, level, fire, done: false });
    // wordless beats — a cold pulse when you first glimpse someone, the heartbeat
    // as you commit to the long hall, and the arrest at the end.
    add('kitchenSee', 50, 30, 60, 40, 'ground', () => this.dread(0.34, 3200));
    add('studySee',    0, 15, 12, 26, 'ground', () => this.dread(0.28, 3000));
    add('landing',     0, 25, 60, 30, 'first', () => this.dread(0.3, 3000));
    add('longhall',   27,  9, 32, 25, 'first', () => {
      this.ctx.audio.heartbeat(true);
      this.ctx.fx.fearTarget = 0.42;
    });
    // two beats now, so the end is a walk toward the shape, not a doorway snap:
    // first, crossing into the room — the dread climbs as the pale figure resolves
    add('masterEnter', 24, 3, 36, 7, 'first', () => {
      this.ctx.fx.fearTarget = Math.max(this.ctx.fx.fearTarget, 0.6);
      this.ctx.audio.heartbeat(true);
    });
    // then, only once you stand right in front of it at the window, the night ends
    add('atFigure',    27, 0, 35, 3, 'first', () => this.runArrest());
    return t;
  }

  dread(v, ms) {
    this.ctx.fx.fearTarget = Math.max(this.ctx.fx.fearTarget, v);
    setTimeout(() => { if (!this.finale.active) this.ctx.fx.fearTarget = 0; }, ms);
  }

  update(dt) {
    const C = this.ctx;
    if (!C.player.enabled) return;
    this.t += dt;
    const p = C.player.pos;
    const level = C.world.levelAt(p.y);

    for (const tr of this.triggers) {
      if (tr.done || tr.level !== level) continue;
      if (p.x < tr.x0 || p.x > tr.x1 || p.z < tr.z0 || p.z > tr.z1) continue;
      tr.done = true;
      tr.fire();
    }

    // the cold glow at the hall's end breathes, so the pull feels alive/wrong
    if (C.props.masterGlow && !this.finale.active)
      C.props.masterGlow.intensity = 3.3 + Math.sin(this.t * 1.6) * 0.7;

    // the music box, from the far bedroom — louder the nearer you are, and much
    // fainter on the wrong floor. This is the pull toward the final room.
    if (!this.finale.active) {
      this.mbT -= dt;
      if (this.mbT <= 0) {
        this.mbT = 8 + Math.random() * 5;
        const d = Math.hypot(p.x - 30, p.z - 4) + Math.abs(p.y - 4.2) * 5;
        C.audio.musicBox(0.03 + 0.17 * Math.max(0, 1 - d / 26));
      }
    }

    if (this.finale.active) this.updateFinale(dt);
  }

  /* ---------------- the arrest ---------------- */

  runArrest() {
    const C = this.ctx;
    if (this.finale.active || C.game.arrested) return;
    if (!C.game.hasKey('masterKey')) return;   // the locked door blocks this anyway; belt and braces
    C.game.arrested = true;
    this.finale.active = true;
    this.finale.phase = 'draw';
    setTimeout(() => this.beginReveal(), 2300);   // a beat drifting toward the "figure"
  }

  beginReveal() {
    const C = this.ctx;
    this.finale.phase = 'stunned';
    this.finale.t = 0;
    C.player.frozen = true;
    C.fx.flipAllLightsOn();
    if (C.props.masterGlow) C.props.masterGlow.intensity = 0;   // the "wrong" light was never real
    C.audio.heartbeat(false);
    C.audio.lightsOn();
    setTimeout(() => C.audio.dawn(), 400);   // the dread resolves upward — it was nothing

    C.world.doorById.masterDoor?.setOpen(true);
    const off = C.npcs.officer;
    off.position.set(29, 4.2, 8.6);
    off.rotation.y = 0;
    off.visible = true;
    const dx = off.position.x - C.player.pos.x, dz = off.position.z - C.player.pos.z;
    this.finale.turnTo = Math.atan2(-dx, -dz);

    setTimeout(() => { this.finale.phase = 'turn'; }, 1000);
  }

  updateFinale(dt) {
    const C = this.ctx, f = this.finale;
    f.t += dt;
    const off = C.npcs.officer;

    if (f.phase === 'draw' || f.phase === 'stunned') {
      if (C.player.pos.z > 7.2) C.player.pos.z = 7.2;
      return;
    }
    if (f.phase === 'turn') {
      let d = f.turnTo - C.player.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      C.player.yaw += d * Math.min(1, dt * 2.4);
      C.player.pitch += (0 - C.player.pitch) * Math.min(1, dt * 2.4);
      if (Math.abs(d) < 0.05) { f.phase = 'approach'; f.t = 0; }
    } else if (f.phase === 'approach') {
      const throughDoor = off.position.z > 7.6;
      const tx = throughDoor ? 29 : C.player.pos.x;
      const tz = throughDoor ? 6.6 : C.player.pos.z;
      const dx = tx - off.position.x, dz = tz - off.position.z;
      const dd = Math.hypot(dx, dz) || 1;
      off.rotation.y = Math.atan2(-dx, -dz);
      off.userData.phase += dt * 6;
      const sw = Math.sin(off.userData.phase) * 0.5;
      off.userData.legL.rotation.x = sw; off.userData.legR.rotation.x = -sw;
      off.userData.armL.rotation.x = -sw * 0.6; off.userData.armR.rotation.x = sw * 0.6;
      const toPlayer = Math.hypot(C.player.pos.x - off.position.x, C.player.pos.z - off.position.z);
      if (toPlayer > 1.7) {
        const st = 1.5 * dt;
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
    // fade to black, then the reveal is delivered on the end cards (the only text)
    setTimeout(() => { document.getElementById('fade').style.opacity = 1; }, 3200);
    setTimeout(() => { C.ui.showEnding(ENDING.arrest); }, 4800);
    setTimeout(() => { C.ui.swapEnding(ENDING.epilogue); C.game.won = true; }, 15600);
  }
}
