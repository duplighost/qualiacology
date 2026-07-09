// Scares. Every one has a mundane cause you'll only understand at the end: a
// family member crossing a doorway, ducking out of sight, watching from behind,
// standing just past a door as it opens; a draught; the storm; the kids. Nothing
// here is a real ghost — the figures are the Averys, and the dread rises the
// deeper in you go.
import * as THREE from 'three';
import { figure } from './npc.js';
import { FAMILY } from './story.js';

// role-specific monologue: creepy now, "…oh, that was the dad" in hindsight
const WHO = {
  mother: 'A woman. Just standing in the dark, watching me climb. Gone when I looked twice.',
  father: 'A man down the hall — big, dead still. Then the dark had him and the hall was empty.',
  boy: 'A boy. Bare feet on the boards. He looked right at me, then he ran, and the wall took him.',
  girl: 'A little girl. She was there. She was looking at me. She was not there.',
};
const MONO = {
  behind: [
    "…There was someone behind me. Right at my shoulder. There is nothing behind me.",
    'The back of my neck went cold. Someone was there. Was.',
  ],
  door: 'Someone was right there — the other side of the door, in the dark, waiting.',
  giggle: "A child, laughing. Somewhere in the walls. Kids don't laugh in empty houses.",
  draft: 'A door I never touched, drifting open. This house breathes.',
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Scares {
  constructor(ctx) {
    this.ctx = ctx;
    const M = ctx.world.M, S = ctx.world.scene;
    // one reusable figure per family member — they turn up where they shouldn't
    this.people = {};
    for (const role of ['mother', 'father', 'boy', 'girl']) {
      const f = FAMILY[role];
      const g = figure(M, { skin: f.skin, hair: f.hair, color: f.color, child: role === 'boy' || role === 'girl' });
      g.visible = false; S.add(g);
      this.people[role] = g;
    }
    this.beat = null;
    this.time = 0;
    this.dread = 0;
    this.doorCool = 0;
    this.idleT = 24 + Math.random() * 12;
    this.placed = [
      { id: 'firstCross', x0: 0, z0: 26, x1: 60, z1: 30, level: 'ground', done: false,
        fire: (p) => this.figureScare(p, { force: true }) },
      { id: 'landingWatch', x0: 0, z0: 25, x1: 60, z1: 30, level: 'first', done: false,
        fire: (p) => this.figureScare(p, { who: 'girl', force: true }) },
    ];
    this._pt = null;
  }

  floorY(lvl) { return lvl === 'first' ? 4.2 : 0; }
  resetLimbs(g) {
    const u = g.userData;
    u.armL.rotation.set(0, 0, 0); u.armR.rotation.set(0, 0, 0);
    u.legL.rotation.set(0, 0, 0); u.legR.rotation.set(0, 0, 0);
  }
  walk(g, dt) {
    const u = g.userData; u.phase += dt * 7.5;
    const sw = Math.sin(u.phase) * 0.5;
    u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
    u.armL.rotation.x = -sw * 0.6; u.armR.rotation.x = sw * 0.6;
  }

  pulse(v = 0.3, ms = 2600) {
    const fx = this.ctx.fx;
    fx.fearTarget = Math.max(fx.fearTarget, Math.min(0.85, v * (1 + this.dread * 0.6)));
    clearTimeout(this._pt);
    this._pt = setTimeout(() => { if (!this.ctx.events.finale.active) fx.fearTarget = 0; }, ms);
  }

  // how far ahead, in metres, the current room stays open along the view
  clearAhead(p) {
    const yaw = this.ctx.player.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const room = this.ctx.world.roomAt(p.x, p.z, p.y);
    if (!room) return 0;
    let d = 2;
    for (; d <= 7; d += 0.5) {
      const r = this.ctx.world.roomAt(p.x + fx * d, p.z + fz * d, p.y);
      if (!r || r.id !== room.id) break;
    }
    return d - 0.5;
  }

  pickPerson(lvl, opts = {}) {
    if (opts.who && this.people[opts.who]) return { role: opts.who, fig: this.people[opts.who] };
    const kids = ['boy', 'girl'], adults = ['mother', 'father'];
    const pool = opts.child ? kids : (lvl === 'first' ? kids : adults);
    const role = pick(pool);
    return { role, fig: this.people[role] };
  }

  // a family member crosses the view ahead of you, then is gone
  figureScare(p, opts = {}) {
    const C = this.ctx, lvl = C.world.levelAt(p.y), y = this.floorY(lvl);
    const clear = this.clearAhead(p);
    if (clear < 3 && !opts.force) return false;         // no clean sightline — try another scare
    const dist = Math.max(3, Math.min(clear, 5.5));
    const yaw = C.player.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const cx = p.x + fx * dist, cz = p.z + fz * dist;
    const s = Math.random() < 0.5 ? 1 : -1;
    const { role, fig } = this.pickPerson(lvl, opts);
    this.resetLimbs(fig);
    this.beat = {
      type: 'cross', fig, t: 0, dur: 1.3 + Math.random() * 0.5, y,
      x0: cx + rx * 2.2 * s, z0: cz + rz * 2.2 * s, x1: cx - rx * 2.2 * s, z1: cz - rz * 2.2 * s,
    };
    fig.position.set(this.beat.x0, y, this.beat.z0);
    fig.rotation.y = Math.atan2(-(this.beat.x1 - this.beat.x0), -(this.beat.z1 - this.beat.z0));
    fig.visible = true;
    for (let i = 0; i < 3; i++) setTimeout(() => C.audio.footstep(true, lvl), i * 150);
    this.pulse(0.34);
    if (C.game.once('cross-' + role)) C.ui.monologue(WHO[role], 4600);
    return true;
  }

  // a family member is standing right behind you — turn, and they're slipping away
  behindYou(p) {
    const C = this.ctx, lvl = C.world.levelAt(p.y), y = this.floorY(lvl);
    const yaw = C.player.yaw;
    const bx = p.x + Math.sin(yaw) * 3.3, bz = p.z + Math.cos(yaw) * 3.3;   // behind = -forward
    if (!C.world.roomAt(bx, bz, p.y)) return false;
    const { fig } = this.pickPerson(lvl, {});
    this.resetLimbs(fig);
    fig.position.set(bx, y, bz);
    fig.rotation.y = yaw;                          // facing your back
    fig.visible = true;
    // retreat: step further into the dark and turn away as it fades
    this.beat = {
      type: 'cross', fig, t: 0, dur: 1.9, y,
      x0: bx, z0: bz, x1: bx + Math.sin(yaw) * 1.2, z1: bz + Math.cos(yaw) * 1.2,
      rot0: yaw, rot1: yaw + 2.3,
    };
    C.audio.presence();
    this.pulse(0.44);
    if (C.game.once('behindmono')) C.ui.monologue(pick(MONO.behind), 4400);
    return true;
  }

  // called when the player opens a door — sometimes someone is right there
  maybeDoorReveal(door, p) {
    const C = this.ctx;
    if (this.beat || this.doorCool > 0 || door.id === 'masterDoor' || door.locked === 'never') return;
    const room = C.world.roomAt(p.x, p.z, p.y);
    if (room && (room.id === 'longhall' || room.id === 'master')) return;
    if (Math.random() > 0.32) return;
    const lvl = C.world.levelAt(p.y), y = this.floorY(lvl);
    const dx = door.center.x - p.x, dz = door.center.z - p.z, dd = Math.hypot(dx, dz) || 1;
    const bx = door.center.x + dx / dd * 1.5, bz = door.center.z + dz / dd * 1.5;   // just beyond it
    if (!C.world.roomAt(bx, bz, p.y)) return;
    const { fig } = this.pickPerson(lvl, {});
    this.resetLimbs(fig);
    fig.position.set(bx, y, bz);
    fig.rotation.y = Math.atan2(-(p.x - bx), -(p.z - bz));   // facing you through the doorway
    fig.visible = true;
    this.beat = {
      type: 'cross', fig, t: 0, dur: 1.3, y,
      x0: bx, z0: bz, x1: bx + dx / dd * 1.1, z1: bz + dz / dd * 1.1,     // withdraws deeper in
      rot0: fig.rotation.y, rot1: fig.rotation.y + 2.2,
    };
    this.doorCool = 24;
    C.audio.presence();
    this.pulse(0.52);
    if (C.game.once('doorrevealmono')) C.ui.monologue(MONO.door, 4400);
  }

  fireAmbient(p, lvl) {
    const C = this.ctx, r = Math.random();
    if (r < 0.18) {                                  // the storm
      C.fx._flash = 1.2; C.audio.thunder(0.7); this.pulse(0.3);
    } else if (r < 0.34) {                           // a knock from somewhere
      C.audio.creak(0.85); this.pulse(0.24);
    } else if (r < 0.48) {                           // one of the kids
      C.audio.murmur(1.7); this.pulse(0.28);
      if (C.game.once('gigglemono')) C.ui.monologue(MONO.giggle, 4500);
    } else if (r < 0.62) {                           // a door drifts open
      const d = this.nearestClosedDoor(p);
      if (d) { d.setOpen(true); C.audio.doorOpen(); this.pulse(0.3);
        if (C.game.once('draftmono')) C.ui.monologue(MONO.draft, 4200); }
      else if (!this.figureScare(p)) this.behindYou(p);
    } else if (r < 0.82) {                           // someone crossed ahead
      if (!this.figureScare(p)) this.behindYou(p);
    } else {                                          // someone behind you
      if (!this.behindYou(p)) { C.fx._flash = 1.0; C.audio.thunder(0.6); this.pulse(0.28); }
    }
  }

  nearestClosedDoor(p) {
    let best = null, bd = 64;
    for (const d of this.ctx.world.doors) {
      if (d.secret || d.isOpen || d.locked === 'never' || d.id === 'masterDoor') continue;
      const dx = d.center.x - p.x, dz = d.center.z - p.z, dd = dx * dx + dz * dz;
      if (dd < bd) { bd = dd; best = d; }
    }
    return bd < 64 ? best : null;
  }

  update(dt, p) {
    const C = this.ctx;
    this.time += dt;
    if (this.doorCool > 0) this.doorCool -= dt;

    // animate the current scare beat (finishes even if the finale starts)
    if (this.beat) {
      const b = this.beat; b.t += dt;
      const k = Math.min(1, b.t / b.dur);
      b.fig.position.set(b.x0 + (b.x1 - b.x0) * k, b.y, b.z0 + (b.z1 - b.z0) * k);
      if (b.rot0 !== undefined) b.fig.rotation.y = b.rot0 + (b.rot1 - b.rot0) * k;
      this.walk(b.fig, dt);
      if (b.t >= b.dur) { b.fig.visible = false; this.beat = null; }
    }

    if (!C.player.enabled || C.events.finale.active) return;

    // dread rises with time and with going upstairs, tightening the pacing
    const lvl = C.world.levelAt(p.y);
    this.dread = Math.min(1, this.time / 200 + (lvl === 'first' ? 0.35 : 0));

    // placed one-shots
    for (const s of this.placed) {
      if (s.done || s.level !== lvl) continue;
      if (p.x < s.x0 || p.x > s.x1 || p.z < s.z0 || p.z > s.z1) continue;
      s.done = true; s.fire(p);
    }

    // ambient scares — not while the end-game dread is building
    const room = C.world.roomAt(p.x, p.z, p.y);
    if (room && (room.id === 'longhall' || room.id === 'master')) return;
    this.idleT -= dt;
    if (this.idleT <= 0 && !this.beat && !C.player.frozen) {
      this.idleT = (30 - this.dread * 15) + Math.random() * (22 - this.dread * 10);
      this.fireAmbient(p, lvl);
    }
  }
}
