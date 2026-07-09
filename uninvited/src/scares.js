// Scares. Every one has a mundane cause you'll only understand at the end: a
// family member crossing a doorway, ducking out of sight, watching from behind;
// a draught moving a door; the kids; the storm. Nothing here is a real ghost.
import * as THREE from 'three';
import { figure } from './npc.js';

const MONO = {
  cross: [
    'Something just crossed the hall ahead. Gone before I could look twice.',
    'A shape — right there — then the doorway was empty.',
  ],
  behind: [
    "…There was someone behind me. I know there was. There's nothing behind me.",
    'The back of my neck. Someone was watching. Was.',
  ],
  giggle: "A child, laughing. Somewhere in the walls. Kids don't laugh in empty houses.",
  door: 'A door I never touched, drifting open. This house breathes.',
  landing: 'A child. Small. Watching me from the dark — then it ran, and the wall took it.',
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Scares {
  constructor(ctx) {
    this.ctx = ctx;
    const M = ctx.world.M, S = ctx.world.scene;
    // two reusable "someones" — an adult and a child, hidden until a scare needs them
    this.adult = figure(M, { skin: 'skinMid', hair: 'hairDark', color: 'clothNavy' });
    this.child = figure(M, { skin: 'skinLight', hair: 'hairBrown', color: 'pjBlue', child: true });
    for (const f of [this.adult, this.child]) { f.visible = false; S.add(f); }
    this.beat = null;
    this.idleT = 24 + Math.random() * 12;
    this.placed = [
      { id: 'firstCross', x0: 0, z0: 26, x1: 60, z1: 30, level: 'ground', done: false,
        fire: (p) => this.figureScare(p, { mono: pick(MONO.cross) }) },
      { id: 'landingWatch', x0: 0, z0: 25, x1: 60, z1: 30, level: 'first', done: false,
        fire: (p) => this.figureScare(p, { child: true, mono: MONO.landing }) },
    ];
    this._pt = null;
  }

  floorY(lvl) { return lvl === 'first' ? 4.2 : 0; }

  pulse(v = 0.3, ms = 2600) {
    const fx = this.ctx.fx;
    fx.fearTarget = Math.max(fx.fearTarget, v);
    clearTimeout(this._pt);
    this._pt = setTimeout(() => { if (!this.ctx.events.finale.active) fx.fearTarget = 0; }, ms);
  }

  // a figure crosses the view ~6.5m ahead of the player, then is gone
  figureScare(p, opts = {}) {
    const C = this.ctx;
    const lvl = C.world.levelAt(p.y), y = this.floorY(lvl);
    const yaw = C.player.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const cx = p.x + fx * 6.5, cz = p.z + fz * 6.5;
    if (!C.world.roomAt(cx, cz, p.y)) return false;   // a wall is ahead — no room to cross
    const s = Math.random() < 0.5 ? 1 : -1;
    const fig = opts.child ? this.child : (Math.random() < 0.4 ? this.child : this.adult);
    const dur = 1.3 + Math.random() * 0.5;
    this.beat = {
      fig, still: false, t: 0, dur, y,
      x0: cx + rx * 2.2 * s, z0: cz + rz * 2.2 * s,
      x1: cx - rx * 2.2 * s, z1: cz - rz * 2.2 * s,
    };
    fig.position.set(this.beat.x0, y, this.beat.z0);
    fig.rotation.y = Math.atan2(-(this.beat.x1 - this.beat.x0), -(this.beat.z1 - this.beat.z0));
    fig.visible = true;
    for (let i = 0; i < 3; i++) setTimeout(() => C.audio.footstep(true, lvl), i * 150);
    this.pulse(0.34);
    if (opts.mono) C.ui.monologue(opts.mono, 4600);
    return true;
  }

  // a figure is standing right behind you — turn and it's already leaving
  behindYou(p) {
    const C = this.ctx;
    const lvl = C.world.levelAt(p.y), y = this.floorY(lvl);
    const yaw = C.player.yaw;
    const bx = p.x + Math.sin(yaw) * 3.4, bz = p.z + Math.cos(yaw) * 3.4;  // behind = -forward
    if (!C.world.roomAt(bx, bz, p.y)) return false;
    const fig = Math.random() < 0.5 ? this.adult : this.child;
    fig.position.set(bx, y, bz);
    fig.rotation.y = yaw;                 // facing the same way = facing the player's back
    const u = fig.userData;
    u.armL.rotation.set(0, 0, 0); u.armR.rotation.set(0, 0, 0);
    u.legL.rotation.set(0, 0, 0); u.legR.rotation.set(0, 0, 0);
    fig.visible = true;
    this.beat = { fig, still: true, t: 0, dur: 1.9 };
    C.audio.creak(0.7);
    this.pulse(0.42);
    if (C.game.once('behindmono')) C.ui.monologue(pick(MONO.behind), 4400);
    return true;
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

  fireAmbient(p, lvl) {
    const C = this.ctx, r = Math.random();
    if (r < 0.2) {                                   // the storm
      C.fx._flash = 1.2; C.audio.thunder(0.7); this.pulse(0.3);
    } else if (r < 0.38) {                           // a knock from somewhere
      C.audio.creak(0.85); this.pulse(0.24);
    } else if (r < 0.54) {                           // one of the kids
      C.audio.murmur(1.7); this.pulse(0.28);
      if (C.game.once('gigglemono')) C.ui.monologue(MONO.giggle, 4500);
    } else if (r < 0.7) {                            // a door drifts open
      const d = this.nearestClosedDoor(p);
      if (d) { d.setOpen(true); C.audio.doorOpen(); this.pulse(0.3);
        if (C.game.once('doormono')) C.ui.monologue(MONO.door, 4200); }
      else this.figureScare(p);
    } else if (r < 0.86) {                           // someone crossed ahead
      if (!this.figureScare(p)) { C.audio.creak(0.8); this.pulse(0.24); }
    } else {                                          // someone behind you
      if (!this.behindYou(p)) { C.fx._flash = 1.0; C.audio.thunder(0.6); this.pulse(0.28); }
    }
  }

  update(dt, p) {
    const C = this.ctx;

    // animate the current scare beat (runs even during the finale so it can finish)
    if (this.beat) {
      const b = this.beat; b.t += dt;
      if (!b.still) {
        const k = Math.min(1, b.t / b.dur);
        b.fig.position.set(b.x0 + (b.x1 - b.x0) * k, b.y, b.z0 + (b.z1 - b.z0) * k);
        const u = b.fig.userData; u.phase += dt * 8;
        const sw = Math.sin(u.phase) * 0.55;
        u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
        u.armL.rotation.x = -sw * 0.6; u.armR.rotation.x = sw * 0.6;
      }
      if (b.t >= b.dur) { b.fig.visible = false; this.beat = null; }
    }

    if (!C.player.enabled || C.events.finale.active) return;

    // placed one-shot scares
    const lvl = C.world.levelAt(p.y);
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
      this.idleT = 28 + Math.random() * 26;
      this.fireAmbient(p, lvl);
    }
  }
}
