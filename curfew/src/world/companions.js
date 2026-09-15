// CURFEW — COMPANIONS. The Eleven rewire.
//
// ALEX: "each [hamlet] with a different companion you can talk to and acquire. The companions
// should look amazing. One should be kind of a nasty dude who always hits on the player
// character. One should be a badass female. One should be a dude with a bedsheet over his body
// as a ghost costume."
//
// ONE AT A TIME. You ask somebody to come with you; they walk beside you until you tell them
// to wait, and then they go home. There is no quest system, no party screen, no orders, no
// inventory. What a companion is for is that the county is quieter with somebody in it.
//
// THE BODY is enemies.spawn's, staged and neutral, exactly the way the Holdfast's residents
// are: this file writes stagedX/Y/Z and stagedYaw and sets townWalk, and enemies.js applies
// and animates them. It does not own a rig, a mesh, a material or a light.
//
// THEY CANNOT DIE TO MONSTERS: enemies never target neutrals. They can be shot by the player,
// and if you shoot one they stop following and walk home, which is the entire consequence.
//
// IN THE CAR (v1): the body is released on car:entered and re-placed at the exit point on
// car:exited, and their lines use the car anchor while you drive. A seated passenger is v2,
// after Alex has played this.

import { HAMLETS } from './hamlet-life.js';

const FOLLOW_D = 2.6;          // metres behind you, off the crosshair
const FOLLOW_CLOSE = 1.8;      // Roan stands too close, on purpose
const SIDE_STEP = 0.8;         // and off to one side, so they are never the thing you shoot
const WALK = 3.4;
const RUN = 5.6;
const RUN_AT = 6;              // metres of gap before they break into a run
const TELEPORT_AT = 40;        // past this they were left behind; put them back
const AHEAD = 0.65;            // the probe distance the walk uses to slide round things
const IDLE_BARK_S = 40;
const ARRIVE_R = 2.2;

/** Which bark belongs to whom. The ids are dialogue/lines.js's. */
const BARKS = Object.freeze({
  greer: { join: 'greer.join', wait: 'greer.wait', boss: 'greer.boss', idle: 'greer.idle',
    aware: 'greer.aware', car: 'greer.car', name: 'greer.oriana', home: 'greer.fen' },
  roan: { join: 'roan.join', wait: 'roan.wait', boss: 'roan.boss', idle: 'roan.idle',
    aware: 'roan.aware', car: 'roan.car', name: 'roan.oriana', home: 'roan.idle2' },
  sheet: { join: 'tobin.join', wait: 'tobin.wait', boss: 'tobin.boss', idle: 'tobin.idle',
    aware: 'tobin.aware', car: 'tobin.car', name: 'tobin.oriana', home: 'tobin.false' },
});

/** Display names, for the prompt and the subtitle eyebrow. */
const NAMES = Object.freeze({ greer: 'Greer', roan: 'Roan', sheet: 'Tobin' });

export class Companions {
  static id = 'companions';

  constructor(ctx) {
    this.ctx = ctx;
    this.id = '';             // who is out with you, or ''
    this.e = null;            // their body
    this.gen = 0;
    this.riding = false;      // released into the car
    this.time = 0;
    this.idleT = 0;
    this.useLock = false;
    this.homeT = 0;           // seconds spent walking home before they are simply gone
    this.goingHome = '';
    this._awareWas = 0;
    this._offs = [];
  }

  _sys(id) { return this.ctx.systems.get(id); }

  init() {
    const bus = this.ctx.bus;
    // THE CAR, v1: let go of the body at the door and put it back when you get out. A
    // companion standing in the road while you drive off would be worse than either.
    this._offs.push(bus.on('car:entered', () => {
      if (!this.id) return;
      this.riding = true;
      this._drop();
      this._say('car');
    }));
    this._offs.push(bus.on('car:exited', (p) => {
      if (!this.id || !this.riding) return;
      this.riding = false;
      const pl = this._sys('player');
      const x = Number.isFinite(p?.x) ? p.x : pl?.pos.x || 0;
      const z = Number.isFinite(p?.z) ? p.z : pl?.pos.z || 0;
      // 1.2 m further out than the driver's exit point, so you are never inside each other.
      const dx = x - (pl?.pos.x || x), dz = z - (pl?.pos.z || z);
      const len = Math.hypot(dx, dz) || 1;
      this._place(x + dx / len * 1.2, z + dz / len * 1.2);
    }));
    // Danger cuts chatter, and somebody noticing you is worth saying out loud once.
    this._offs.push(bus.on('boss:cleared', () => this._trust(1)));
    this._offs.push(bus.on('place:discovered', () => { if (this.id) this.idleT = 0; }));
    this._offs.push(bus.on('player:hurt', () => {
      if (!this.id) return;
      this._sys('dialogue')?.stop(NAMES[this.id]);
    }));
    // SHOOT YOUR COMPANION and they are done for the night. enemies.damage on a neutral is
    // the only way this can happen — nothing in the county targets them.
    this._offs.push(bus.on('enemy:hurt', (p) => {
      if (!this.id || !p?.e || p.e !== this.e) return;
      this._sendHome(true);
    }));
    this._offs.push(bus.on('save:loaded', () => { this._drop(); this.id = ''; this.riding = false; }));
    this._offs.push(bus.on('player:died', () => { this._drop(); this.riding = false; }));
    this._load();
  }

  ready() { return true; }

  /* ------------------------------------------------------------- the save -- */

  _bag() {
    const d = this._sys('progress')?.save?.data;
    if (!d) return null;
    if (!d.companions || typeof d.companions !== 'object') d.companions = {};
    return d.companions;
  }

  _rec(id) {
    const bag = this._bag();
    if (!bag) return null;
    if (!bag[id]) bag[id] = { met: 0, joined: 0, trust: 0, talks: 0, home: 1 };
    return bag[id];
  }

  _load() {
    const bag = this._bag();
    if (!bag) return;
    for (const [id, rec] of Object.entries(bag)) {
      if (rec && rec.joined && !rec.home) { this.id = id; break; }
    }
  }

  /* ------------------------------------------------------------- the door -- */

  /** Is this one out with you right now? hamlet-life.js asks before standing them at home. */
  isOut(id) { return this.id === id && !this.goingHome; }
  /** Who is with you, or ''. */
  joined() { return this.id; }
  name() { return NAMES[this.id] || ''; }

  /** Ask somebody to come. One at a time; the second ask is refused, not queued. */
  recruit(id, entity) {
    if (this.id || !NAMES[id]) return false;
    const rec = this._rec(id);
    if (rec) { rec.met = 1; rec.joined = 1; rec.home = 0; this._sys('progress')?.save?.mark?.(); }
    this.id = id;
    this.goingHome = '';
    this.riding = !!this.ctx.shared.inCar;
    this.idleT = 0;
    // Take the hamlet's own body over rather than spawning a second one on the same spot.
    if (entity) { this.e = entity; this.gen = entity.gen; }
    else {
      const p = this._sys('player');
      if (p?.pos) this._place(p.pos.x, p.pos.z);
    }
    this._say('join');
    this.ctx.bus.emit('companion:joined', { id, name: NAMES[id] });
    return true;
  }

  /** Tell them to wait. They walk home from wherever they are. */
  dismiss() {
    if (!this.id) return false;
    this._say('wait');
    this._sendHome(false);
    return true;
  }

  /* ---------------------------------------------------------- the body -- */

  _place(x, z) {
    const en = this._sys('enemies');
    const terrain = this._sys('terrain');
    if (!en || !this.id) return;
    const y = terrain?.heightAt ? terrain.heightAt(x, z) : 0;
    this.e = en.spawn(this.id, x, z, {
      staged: true, neutral: true, initiallyNeutral: true,
      siteGuard: 'companion:' + this.id, feetY: y, yaw: 0, placementRadius: 0.8,
    });
    this.gen = this.e ? this.e.gen : 0;
  }

  _drop() {
    const en = this._sys('enemies');
    if (this.e?.alive && this.e.gen === this.gen) { en?._uncommit?.(this.e); en?._release?.(this.e); }
    this.e = null;
  }

  _sendHome(hurt) {
    const id = this.id;
    if (!id) return;
    const rec = this._rec(id);
    if (rec) {
      rec.home = 1; rec.joined = 0;
      if (hurt) rec.trust = Math.max(0, (rec.trust || 0) - 2);
      this._sys('progress')?.save?.mark?.();
    }
    this.goingHome = id;
    this.homeT = 0;
    this.ctx.bus.emit('companion:left', { id, name: NAMES[id], hurt: !!hurt });
    this.id = '';
    // The body walks off under its own steam for a few seconds and is then simply not there.
    // Nobody in this game watches somebody walk five hundred metres.
  }

  _trust(n) {
    if (!this.id) return;
    const rec = this._rec(this.id);
    if (!rec) return;
    rec.trust = (rec.trust || 0) + n;
    this._sys('progress')?.save?.mark?.();
  }

  /** One bark, through the one system that owns spoken lines. Never audio from here. */
  _say(kind, force) {
    const id = this.id || this.goingHome;
    const line = BARKS[id]?.[kind];
    if (!line) return false;
    const d = this._sys('dialogue');
    if (!d) return false;
    if (this.riding) return d.say(line, { anchor: 'car', name: NAMES[id] });
    if (!this.e?.alive && !force) return false;
    return d.say(line, { speakerEntity: this.e, name: NAMES[id] });
  }

  /* ---------------------------------------------------------------- step -- */

  step(dt) {
    if (!this.ctx.playing || this.ctx.paused) return;
    this.time += dt;

    // WALKING HOME. A few seconds of actually turning and going, then gone: they live
    // somewhere and the county does not need to watch the journey.
    if (this.goingHome) {
      this.homeT += dt;
      if (this.e?.alive) this._walkAway(dt);
      if (this.homeT > 6) { this._drop(); this.goingHome = ''; }
      return;
    }
    if (!this.id) return;

    const p = this._sys('player');
    if (!p?.pos || p.dead) return;
    if (this.riding) { this._stepRiding(dt); return; }

    // The body may have gone with a chunk: bring it back next step, the way holdfast-life
    // notices a stale gen.
    if (!this.e || !this.e.alive || this.e.gen !== this.gen) {
      this._place(p.pos.x - 1.5, p.pos.z - 1.5);
      if (!this.e) return;
    }
    const e = this.e;

    // THE GOAL: behind you, along the camera's back, and a step to one side so a companion is
    // never the thing standing in your crosshair when something comes out of the trees.
    const cam = this._sys('camera');
    const yaw = cam ? cam.yaw : 0;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const followD = this.id === 'roan' ? FOLLOW_CLOSE : FOLLOW_D;
    const side = this.id === 'roan' ? -1 : 1;
    const gx = p.pos.x - fx * followD + fz * side * SIDE_STEP;
    const gz = p.pos.z - fz * followD - fx * side * SIDE_STEP;

    let dx = gx - e.stagedX, dz = gz - e.stagedZ;
    let d = Math.hypot(dx, dz);

    // Left behind, respawned, or streamed away: put them back rather than let them run a
    // marathon you never see.
    if (d > TELEPORT_AT) {
      this._drop();
      this._place(p.pos.x - fx * 2.0, p.pos.z - fz * 2.0);
      return;
    }

    if (d > 0.35) {
      const speed = d > RUN_AT ? RUN : WALK;
      let nx = dx / d, nz = dz / d;
      // Slide sideways round whatever is in the way, exactly as holdfast-life's walk does.
      const col = this._sys('collision');
      if (col?.raycast) {
        const from = { x: e.stagedX, y: e.stagedY + 0.8, z: e.stagedZ };
        const hit = col.raycast(from, { x: nx, y: 0, z: nz }, AHEAD, col.MASK.SOLID);
        if (hit && hit.hit !== false) {
          const sx = -nz, sz = nx;                      // try one side, then the other
          const a = col.raycast(from, { x: sx, y: 0, z: sz }, AHEAD, col.MASK.SOLID);
          if (a && a.hit !== false) { nx = -sx; nz = -sz; } else { nx = sx; nz = sz; }
        }
      }
      const step = Math.min(d, speed * dt);
      e.stagedX += nx * step;
      e.stagedZ += nz * step;
      const terrain = this._sys('terrain');
      const groundY = terrain?.heightAt ? terrain.heightAt(e.stagedX, e.stagedZ) : e.stagedY;
      e.stagedY += (groundY - e.stagedY) * Math.min(1, dt * 6);
      // `townWalk` is the gait: metres a second, which is what enemies.js animates from.
      e.townWalk = step / Math.max(dt, 0.001);
      const want = Math.atan2(nx, nz) + Math.PI;
      const turn = Math.atan2(Math.sin(want - e.stagedYaw), Math.cos(want - e.stagedYaw));
      e.stagedYaw += turn * Math.min(1, dt * 8);
    } else {
      e.townWalk = 0;
      // Standing still, they look at you. That is the whole of the idle animation and it is
      // enough: a person who is with you faces you.
      const want = Math.atan2(p.pos.x - e.stagedX, p.pos.z - e.stagedZ) + Math.PI;
      const turn = Math.atan2(Math.sin(want - e.stagedYaw), Math.cos(want - e.stagedYaw));
      e.stagedYaw += turn * Math.min(1, dt * 5);
    }
    dx = 0; dz = 0; d = 0;

    this._prompt(e, p);
    this._barks(dt, p);
  }

  /** In the car, there is no body. The barks still happen, on the car anchor. */
  _stepRiding(dt) {
    this._barks(dt, this._sys('player'));
  }

  /**
   * WAIT HERE, while they are following. Rank 9, the same as talking to them, because it is
   * the same gesture at the same distance.
   */
  _prompt(e, p) {
    const use = this.ctx.input.held('use');
    if (!use) this.useLock = false;
    const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    if (d > 2.6 || Math.abs(p.pos.y - e.pos.y) > 2.0) return;
    const cam = this._sys('camera');
    if (!cam) return;
    const dot = ((e.pos.x - p.pos.x) * -Math.sin(cam.yaw) + (e.pos.z - p.pos.z) * -Math.cos(cam.yaw)) / (d || 1);
    if (dot < 0.6) return;
    this.ctx.bus.emit('prompt', {
      kind: 'hold', label: 'E', rank: 9, x: e.pos.x, y: e.pos.y + 1.6, z: e.pos.z, k: 0,
      detail: NAMES[this.id], subdetail: 'E · WAIT HERE',
    });
    if (!use || this.useLock) return;
    this.useLock = true;
    this.dismiss();
  }

  /**
   * WHAT THEY SAY, AND WHEN. Every one of these is a cooldown in dialogue/lines.js rather
   * than a timer here, so the catalogue is the one place a line's rhythm lives.
   */
  _barks(dt, p) {
    const en = this._sys('enemies');
    const d = this._sys('dialogue');
    if (!d) return;

    // SOMETHING NOTICED US. Priority 7 and interrupt:false, so it cuts chatter and nothing
    // cuts it. The rising edge only: a body staying aware is not news twice.
    const aware = en?.awareCount || 0;
    if (aware > this._awareWas && aware > 0) {
      d.stop(NAMES[this.id]);
      this._say('aware');
      this.idleT = 0;
    }
    this._awareWas = aware;

    // NEARING ONE OF THE ELEVEN. They say it once every ninety seconds at most, and only
    // while the boss is still alive: walking past a cleared arena is not a warning.
    const bosses = this._sys('boss-encounters');
    if (bosses?.all && p?.pos) {
      for (const k of bosses.all) {
        if (!k.alive || !k.home) continue;
        if (Math.hypot(p.pos.x - k.home.x, p.pos.z - k.home.z) > 120) continue;
        this._say('boss');
        this.idleT = 0;
        break;
      }
    }

    // IDLING. The lowest priority in the game and the first thing anything cuts.
    this.idleT += dt;
    if (this.idleT > IDLE_BARK_S) {
      this.idleT = 0;
      // Her name, every so often, from somebody who is actually with her.
      this._say(this.time % 3 < 1 ? 'name' : 'idle');
    }
  }

  /** The few seconds of actually leaving. They turn away from you and go. */
  _walkAway(dt) {
    const e = this.e;
    const p = this._sys('player');
    if (!e || !p?.pos) return;
    const home = this._sys('hamlet-life')?.homeOf(this.goingHome);
    let nx, nz;
    if (home) {
      const dx = home.x - e.stagedX, dz = home.z - e.stagedZ;
      const len = Math.hypot(dx, dz) || 1;
      nx = dx / len; nz = dz / len;
      if (len < ARRIVE_R) { e.townWalk = 0; return; }
    } else {
      const dx = e.stagedX - p.pos.x, dz = e.stagedZ - p.pos.z;
      const len = Math.hypot(dx, dz) || 1;
      nx = dx / len; nz = dz / len;
    }
    const step = WALK * dt;
    e.stagedX += nx * step; e.stagedZ += nz * step;
    const terrain = this._sys('terrain');
    if (terrain?.heightAt) {
      const g = terrain.heightAt(e.stagedX, e.stagedZ);
      e.stagedY += (g - e.stagedY) * Math.min(1, dt * 6);
    }
    e.townWalk = step / Math.max(dt, 0.001);
    e.stagedYaw = Math.atan2(nx, nz) + Math.PI;
  }

  state() {
    const bag = this._bag() || {};
    return {
      with: this.id, name: NAMES[this.id] || '', riding: this.riding,
      body: !!this.e?.alive, goingHome: this.goingHome,
      known: Object.keys(bag).map(id => ({ id, ...bag[id] })),
      hamlets: Object.keys(HAMLETS).length,
    };
  }

  dispose() {
    for (const off of this._offs) off?.();
    this._offs.length = 0;
    this._drop();
  }
}

export default Companions;
