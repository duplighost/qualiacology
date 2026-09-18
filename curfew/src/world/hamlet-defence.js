// CURFEW — HAMLET DEFENCE. D16 (2026-09-17).
//
// The lookout at the road end of each hamlet, read through, asks: 'E · STAND WITH US'. Take
// it and three waves come up the road side, at the three authored attack points, while the
// hamlet's three rifles and yours hold them off. When the last one is dead the hamlet HELD,
// and the people say thank you the only ways they can: the trader gives you 150 coins, the
// fuel person two cans of gas, and the host opens her door — 'E · COME INSIDE' — a bed, a
// fade, and you come out with ten more of yourself to lose (+10 max HP, C1). Once per
// hamlet, every bit of it in progress.worldFlags:
//
//   'hamlet-siege:<id>'      '' | 'live' | 'won'
//   'hamlet-gift:<id>:cash'  1 once the trader has paid
//   'hamlet-gift:<id>:gas'   1 once the cans are yours
//   'hamlet-rested:<id>'     1 once you have slept there
//
// WHILE IT IS LIVE hamlet-life.contains() ignores the hamlet (C22): enemies.spawn refuses
// hostiles on lit ground and safety.peacefulAt keeps the dread lane out, and the waves have
// to be allowed in. Every wave body is spawned awake, as an AMBUSH (e.scripted: off the
// leash, calm-proof) with siteGuard 'siege:<id>', which cull() and standDown() both refuse,
// so a wave cannot be thinned by the county's thermostat before it reaches the fire.
//
// LOSING is dying, or walking away: the wave is released, the flag goes back to '', and the
// lookout asks again. A reload mid-siege lands as '' too — nobody is left standing in the
// road for a fight that was never finished.
//
// THE REST is wordless past the door line. The body is pinned inside beside the bed, this
// file's OWN overlay (#curfew-hamlet-fade — refuge.js owns #curfew-rest and hides it whenever
// its own fade is 0, so a second writer needs a second element) goes to 0.72 over 1.2 s,
// holds 2 s, and comes back over 0.6 s. Everything happens at the hold.

import { HAMLETS } from './hamlet-life.js';
import { HAMLET_PLAN, houseDoor, houseInside } from './hamlets.js';
import { MAJOR_BY_ID } from './placedata.js';

// Which species come, per region, per wave. Existing species only; the hounds are the
// pressure, and every wave carries one body that is not simply shot off the road.
//
// D17, RE-COSTED AGAINST THE NEW RIFLES. These tables were written when three guards did 255
// damage a second out to 56 m and killed a wave on the frame it spawned; the player's share
// of the fight was nothing. The rifles are support now (hamlet-life.js, THE THREE RIFLES) at
// about sixteen damage a second between them and only inside 20 m, so these are what the
// PLAYER is being asked to clear. Species hp from enemies/species.js: hound 55, standing 60,
// poacher 70, hunter 140, drowned 260.
//
//   fen    180 -> 370 -> 510   Eelwater, boards over water; the drowned (2.5 m/s, 260 hp) is
//                              the clock — it takes a quarter of a minute simply to arrive,
//                              which is what makes a wave last rather than end.
//   ridge  180 -> 305 -> 390   The Cut, open quarry floor and long sightlines: more bodies
//                              rather than heavier ones, and the hunter last.
//   pines  165 -> 300 -> 365   Highwood, the trees break every line: the standing (2.6 m/s)
//                              walks in through them while the hounds are already on you.
//
// Every wave is more than the one before it in both hit points and bodies, which the three
// of them were not: the fen used to fall 370 -> 305 and the pines 220 -> 170 at wave two.
export const WAVES = Object.freeze({
  fen: [
    ['hound', 'hound', 'poacher'],
    ['drowned', 'hound', 'hound'],
    ['drowned', 'poacher', 'poacher', 'hound', 'hound'],
  ],
  ridge: [
    ['hound', 'hound', 'poacher'],
    ['poacher', 'poacher', 'hound', 'hound', 'hound'],
    ['hunter', 'poacher', 'poacher', 'hound', 'hound'],
  ],
  pines: [
    ['hound', 'hound', 'hound'],
    ['standing', 'standing', 'hound', 'hound', 'poacher'],
    ['hunter', 'standing', 'hound', 'hound', 'hound'],
  ],
});
// D17: 25 -> 38. At 25 s a wave the player was still fighting got the next one on top of it
// and the three waves ran together into one siege-long soup. 38 is past the long end of a
// wave (the drowned alone needs a quarter of a minute to cross the ground), so the timer is
// what it was meant to be — the thing that stops a siege stalling, not the thing that paces it.
const WAVE_MAX_S = 38;        // the next wave comes when the last is dead, or after this
const WAVE_GAP_S = 2.5;       // s between a wave dying and the next: the lookout's line lands first
const AMBUSH_S = 120;         // s of e.scripted: long enough for the whole fight, then ordinary
const ABANDON_R = 150;        // m from the hamlet centre: further than this and you have left
const ABANDON_S = 10;         // s outside that before the defence is called off
const DOOR_R = 2.3;           // m to the host's door for 'E · COME INSIDE'
const DOOR_DOT = 0.55;        // and looking at it
const REST_IN_S = 1.2;        // s to the black
const REST_HOLD_S = 2.0;      // s at it
const REST_OUT_S = 0.6;       // s back
const REST_BLACK = 0.72;      // not full black: the room stays there, dimly, the way sleep does
const CASH_GIFT = 150;
const GAS_GIFT = 2;
const HP_GIFT = 10;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const _prompt = { kind: 'hold', label: 'E', rank: 10, x: 0, y: 0, z: 0, k: 0, detail: '', subdetail: 'E · COME INSIDE', unavailable: false };

export class HamletDefence {
  static id = 'hamlet-defence';

  constructor(ctx) {
    this.ctx = ctx;
    this.sites = [];           // { id, name, region, phase, wave, bodies:[{e,gen}], waveT, gapT, awayT }
    this.time = 0;
    this.useLock = false;
    this.resting = false;      // hamlet-life reads it: no prompts while the fade runs
    this.rest = { id: '', phase: '', t: 0, x: 0, y: 0, z: 0 };
    this.fade = 0; this._fadePrev = 0; this._fadeCurr = 0;
    this._overlay = null;
    this._restored = false;
    this._offs = [];
    this._door = { x: 0, y: 0, z: 0 };
  }

  _sys(id) { return this.ctx.systems.get(id); }

  init() {
    for (const [id, spec] of Object.entries(HAMLETS)) {
      const host = spec.people.find(q => q.role === 'host');
      this.sites.push({
        id, name: MAJOR_BY_ID[id]?.name || id, region: spec.region, plan: HAMLET_PLAN[id],
        hostName: (host ? host.name : id).split(' · ')[0],   // the prompt's eyebrow at her door
        phase: 'idle', wave: 0, bodies: [], waveT: 0, gapT: 0, awayT: 0,
      });
    }
    this._overlayInit();
    this._offs.push(this.ctx.bus.on('save:loaded', () => this._restore()));
    this._offs.push(this.ctx.bus.on('player:died', () => { for (const st of this.sites) if (st.phase === 'live') this._lose(st); this._restCancel(); }));
  }

  ready() { return true; }

  /* --------------------------------------------------------------- state -- */

  _site(id) { for (const st of this.sites) if (st.id === id) return st; return null; }
  _flag(key, value) { const pr = this._sys('progress'); return pr && typeof pr.flag === 'function' ? pr.flag(key, value) : undefined; }

  /** Read every flag. On a load a 'live' siege is a fight that never finished: back to ''. */
  _restore() {
    this._restored = true;
    const life = this._sys('hamlet-life');
    for (const st of this.sites) {
      this._releaseWave(st);
      const v = this._flag('hamlet-siege:' + st.id);
      if (v === 'live') this._flag('hamlet-siege:' + st.id, '');
      st.phase = v === 'won' ? 'won' : 'idle';
      st.wave = 0; st.waveT = 0; st.gapT = 0; st.awayT = 0;
    }
    life?.setSiege?.('');
    this._restCancel();
  }

  canOffer(id) { const st = this._site(id); return !!st && st.phase === 'idle' && this._flag('hamlet-siege:' + id) !== 'won'; }
  isLive(id) { const st = this._site(id); return !!st && st.phase === 'live'; }
  won(id) { const st = this._site(id); return !!st && (st.phase === 'won' || this._flag('hamlet-siege:' + id) === 'won'); }

  /* --------------------------------------------------------------- start -- */

  start(id) {
    const st = this._site(id);
    if (!st || st.phase !== 'idle') return false;
    st.phase = 'live'; st.wave = 0; st.waveT = 0; st.gapT = 0; st.awayT = 0; st.bodies.length = 0;
    this._flag('hamlet-siege:' + id, 'live');
    this._sys('hamlet-life')?.setSiege?.(id);
    this.ctx.bus.emit('hamlet:siege', { id, name: st.name });
    this._spawnWave(st, 1);
    return true;
  }

  _spawnWave(st, n) {
    st.wave = n; st.waveT = 0; st.gapT = 0;
    const en = this._sys('enemies'), life = this._sys('hamlet-life');
    const s = life?.site?.(st.id);
    const list = (WAVES[st.region] || WAVES.fen)[n - 1] || [];
    let count = 0;
    if (en && s) {
      for (let i = 0; i < list.length; i++) {
        const pt = st.plan.attack[i % st.plan.attack.length];
        const w = life._world(s, pt[0], pt[1], 0);
        // one call per body (pack: 1): a pack spawn returns only its leader, and every
        // body here has to be stamped and counted
        const e = en.spawn(list[i], w.x, w.z, { awake: true, ambush: true, ambushS: AMBUSH_S, pack: 1, placementRadius: 4 });
        if (!e) continue;
        e.siteGuard = 'siege:' + st.id;
        st.bodies.push({ e, gen: e.gen });
        count++;
      }
    }
    // the lookout says so — loud enough to carry across the hamlet
    const q = life?.person?.(st.id, 'lookout');
    const text = q?.here?.[n - 1];
    if (q?.e?.alive && text) {
      this._sys('dialogue')?.say({ id: 'hamlet.' + st.id + '.here' + n, speaker: q.name, text, priority: 5, interrupt: true, audibleR: 70 },
        { speakerEntity: q.e, name: q.name });
    }
    this.ctx.bus.emit('hamlet:wave', { id: st.id, wave: n, count });
  }

  _alive(st) {
    let n = 0;
    for (let i = 0; i < st.bodies.length; i++) { const b = st.bodies[i]; if (b.e.alive && b.e.gen === b.gen) n++; }
    return n;
  }

  _releaseWave(st) {
    const en = this._sys('enemies');
    for (let i = 0; i < st.bodies.length; i++) {
      const b = st.bodies[i];
      if (b.e.alive && b.e.gen === b.gen) { en?._uncommit?.(b.e); en?._release?.(b.e); }
    }
    st.bodies.length = 0;
  }

  _win(st) {
    st.phase = 'won'; st.bodies.length = 0;
    this._flag('hamlet-siege:' + st.id, 'won');
    this._sys('hamlet-life')?.setSiege?.('');
    this.ctx.bus.emit('hamlet:defended', { id: st.id, name: st.name });
    this.ctx.bus.emit('reward:bundle', { title: st.name + ' held', detail: 'Everyone is still standing. Talk to them.', quiet: true });
  }

  _lose(st) {
    this._releaseWave(st);
    st.phase = 'idle'; st.wave = 0; st.waveT = 0; st.gapT = 0; st.awayT = 0;
    this._flag('hamlet-siege:' + st.id, '');
    this._sys('hamlet-life')?.setSiege?.('');
    this.ctx.bus.emit('hamlet:siege-lost', { id: st.id, name: st.name });
  }

  _stepLive(st, dt, p) {
    const life = this._sys('hamlet-life');
    const s = life?.site?.(st.id);
    if (!s) { this._lose(st); return; }
    // walked away: the fight is not happening without you
    const d = Math.hypot(p.pos.x - s.rec.def.x, p.pos.z - s.rec.def.z);
    if (d > ABANDON_R) { st.awayT += dt; if (st.awayT >= ABANDON_S) { this._lose(st); return; } }
    else st.awayT = 0;
    st.waveT += dt;
    const alive = this._alive(st);
    if (alive === 0) {
      if (st.wave >= 3) { this._win(st); return; }
      st.gapT += dt;
      if (st.gapT >= WAVE_GAP_S) this._spawnWave(st, st.wave + 1);
    } else {
      st.gapT = 0;
      if (st.wave < 3 && st.waveT >= WAVE_MAX_S) this._spawnWave(st, st.wave + 1);
    }
  }

  /* -------------------------------------------------------------- thanks -- */

  /** The trader's coins and the fuel person's cans, once each, on their last thanks line. */
  thank(id, role, e) {
    const st = this._site(id);
    const pr = this._sys('progress');
    if (!st || !pr || !this.won(id)) return false;
    const x = e?.pos?.x || 0, y = (e?.pos?.y || 0) + 1.2, z = e?.pos?.z || 0;
    if (role === 'trader') {
      if (this._flag('hamlet-gift:' + id + ':cash')) return false;
      this._flag('hamlet-gift:' + id + ':cash', 1);
      pr.payCash(CASH_GIFT, x, y, z, 'hamlet');
      return true;
    }
    if (role === 'gas') {
      if (this._flag('hamlet-gift:' + id + ':gas')) return false;
      this._flag('hamlet-gift:' + id + ':gas', 1);
      pr.addGas(GAS_GIFT);
      const who = e?.townName ? String(e.townName).split(' · ')[0] : 'them';
      this.ctx.bus.emit('reward:bundle', { title: 'Two cans of gas', gas: GAS_GIFT, detail: 'From ' + who + '. Pour them at the filler cap.', quiet: true, x, y, z });
      return true;
    }
    return false;
  }

  /* ------------------------------------------------------------ the door -- */

  /**
   * Is the player at the host's door, looking at it, with the door still to be opened?
   * Pure: fills this._door with the door's world point. hamlet-life asks it too, so one E
   * press at the door is the door's and not also the host's next line.
   */
  atDoor(id) {
    const st = this._site(id);
    if (!st || st.phase !== 'won' || this._flag('hamlet-rested:' + id)) return false;
    const p = this._sys('player');
    if (!p?.pos || p.dead || this.ctx.shared.inCar) return false;
    const life = this._sys('hamlet-life');
    const s = life?.site?.(id);
    if (!s) return false;
    const host = st.plan.host;
    const dl = houseDoor(host);
    const w = life._world(s, dl.x, dl.z, host.top);
    this._door.x = w.x; this._door.y = w.y; this._door.z = w.z;
    const dx = w.x - p.pos.x, dz = w.z - p.pos.z, d = Math.hypot(dx, dz);
    if (d > DOOR_R || Math.abs(w.y - p.pos.y) > 1.6) return false;
    const cam = this._sys('camera');
    if (!cam) return false;
    const dot = (dx * -Math.sin(cam.yaw) + dz * -Math.cos(cam.yaw)) / (d || 1);
    return dot >= DOOR_DOT;
  }

  /** The host's door, once the hamlet held and until you have slept there. */
  _doorStep(st, use) {
    if (!this.atDoor(st.id)) return;
    const w = this._door, pp = _prompt;   // one payload, rewritten: hud.js copies the fields
    pp.x = w.x; pp.y = w.y + 1.3; pp.z = w.z; pp.detail = st.hostName;
    this.ctx.bus.emit('prompt', pp);
    if (!use || this.useLock) return;
    this.useLock = true;
    this._restStart(st, this._sys('hamlet-life').site(st.id));
  }

  _restStart(st, s) {
    const host = st.plan.host;
    const il = houseInside(host);
    const life = this._sys('hamlet-life');
    const w = life._world(s, il.x, il.z, host.top);
    const col = this._sys('collision');
    const floor = col && typeof col.supportHeight === 'function' ? col.supportHeight(w.x, w.z, w.y, 0.34, 0.45) : w.y;
    this.rest.id = st.id; this.rest.phase = 'in'; this.rest.t = 0;
    this.rest.x = w.x; this.rest.y = Number.isFinite(floor) ? floor : w.y; this.rest.z = w.z;
    this.resting = true;
    this._pin(true);
  }

  _restCancel() {
    this.resting = false; this.rest.phase = ''; this.rest.t = 0;
    this.fade = 0; this._fadePrev = 0; this._fadeCurr = 0;
  }

  /**
   * The body, pinned beside the bed. This system steps AFTER the player, so the controller
   * has already moved him by at most one frame of walk when this runs; teleport() puts him
   * back AND syncs prev to curr, so the camera never draws the streak. Zero velocity first
   * so his own integration starts flat next step.
   */
  _pin(first) {
    const player = this._sys('player');
    if (!player?.pos) return;
    if (player.vel) player.vel.set(0, 0, 0);
    const p = player.pos;
    if (first || Math.abs(p.x - this.rest.x) > 1e-3 || Math.abs(p.z - this.rest.z) > 1e-3 || Math.abs(p.y - this.rest.y) > 1e-3) {
      if (typeof player.teleport === 'function') { player.teleport(this.rest.x, this.rest.z); p.y = this.rest.y; if (player.currPos) player.currPos.y = this.rest.y; if (player.prevPos) player.prevPos.y = this.rest.y; }
      else { p.x = this.rest.x; p.y = this.rest.y; p.z = this.rest.z; }
    }
  }

  _restStep(dt) {
    const r = this.rest;
    r.t += dt;
    this._fadePrev = this._fadeCurr;
    if (r.phase === 'in') {
      this.fade = REST_BLACK * clamp01(r.t / REST_IN_S);
      if (r.t >= REST_IN_S) { this.fade = REST_BLACK; r.phase = 'hold'; r.t = 0; this._sleep(r.id); }
    } else if (r.phase === 'hold') {
      this.fade = REST_BLACK;
      if (r.t >= REST_HOLD_S) { r.phase = 'out'; r.t = 0; }
    } else if (r.phase === 'out') {
      this.fade = REST_BLACK * (1 - clamp01(r.t / REST_OUT_S));
      if (r.t >= REST_OUT_S) {
        this.fade = 0; r.phase = ''; this.resting = false;
        this.useLock = true;     // the key may still be down
      }
    }
    this._fadeCurr = this.fade;
    this._pin(false);
  }

  /** The one moment at the hold on which everything actually happens. */
  _sleep(id) {
    this._flag('hamlet-rested:' + id, 1);
    this._sys('progress')?.grantHpMax?.(HP_GIFT, 'hamlet');
    this.ctx.bus.emit('hamlet:rested', { id, x: this.rest.x, y: this.rest.y, z: this.rest.z });
  }

  /* --------------------------------------------------------------- step -- */

  step(dt) {
    if (!this.ctx.playing || this.ctx.paused) return;
    this.time += dt;
    if (!this._restored) this._restore();
    const p = this._sys('player');
    if (!p?.pos) return;
    const use = this.ctx.input.held('use');
    if (!use) this.useLock = false;
    if (this.resting) { this._restStep(dt); return; }
    for (const st of this.sites) {
      if (st.phase === 'live') this._stepLive(st, dt, p);
      else if (st.phase === 'won') this._doorStep(st, use);
    }
  }

  /* ------------------------------------------------------------ overlay -- */

  _overlayInit() {
    if (typeof document === 'undefined' || !document.body) return;
    let el = document.getElementById('curfew-hamlet-fade');
    if (!el) {
      el = document.createElement('div');
      el.id = 'curfew-hamlet-fade';
      el.setAttribute('aria-hidden', 'true');
      // z-index 16, the same layer as refuge.js's #curfew-rest: under the HUD shell (20) and
      // the pause card (24), so pausing mid-rest still works.
      el.style.cssText = 'position:fixed;inset:0;z-index:16;background:#000;opacity:0;'
        + 'pointer-events:none;display:none;will-change:opacity';
      document.body.appendChild(el);
    }
    this._overlay = el;
  }

  present(alpha) {
    if (!this._overlay) return;
    const a = clamp01(alpha);
    const fade = this._fadePrev + (this._fadeCurr - this._fadePrev) * a;
    const shown = fade > 0.002;
    this._overlay.style.display = shown ? 'block' : 'none';
    if (shown) this._overlay.style.opacity = String(fade);
  }

  state() {
    return {
      hamlets: this.sites.map(st => ({ id: st.id, phase: st.phase, wave: st.wave, alive: this._alive(st),
        rested: !!this._flag('hamlet-rested:' + st.id) })),
      resting: this.resting, fade: this.fade,
    };
  }

  dispose() {
    for (const off of this._offs) off?.();
    this._offs.length = 0;
    for (const st of this.sites) this._releaseWave(st);
    this._overlay?.remove?.(); this._overlay = null;
  }
}

export default HamletDefence;
