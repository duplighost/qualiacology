// CURFEW — HAMLET DEFENCE. D16 (2026-09-17), given a real end in R3 (2026-09-18).
//
// The lookout at the road end of each hamlet, read through, asks: 'E · STAND WITH US'. Take
// it and three waves come up the road side, at the three authored attack points, while the
// hamlet's three rifles and yours hold them off. When the last one is dead the hamlet HELD,
// and the people say thank you the only ways they can: the trader gives you 150 coins and
// from then on sells to you, the fuel person two cans of gas, and the host opens her door —
// 'E · COME INSIDE' — a bed, a fade, and you come out healed, banked, and the first time
// with ten more of yourself to lose (+10 max HP, C1). Every bit of it in progress.worldFlags:
//
//   'hamlet-siege:<id>'      '' | 'live' | 'won'
//   'hamlet-gift:<id>:cash'  1 once the trader has paid (and opened his counter)
//   'hamlet-gift:<id>:gas'   1 once the cans are yours
//   'hamlet-rested:<id>'     1 once you have slept there the first time
//
// R3. ALEX: "the events don't have a clear end, i couldn't ever talk to anyone when i thought
// i completed it. and after it said clear and i thought it was good, there's just always
// enemies. we should say 0/x enemies defeated somewhere during the events ... and the enemies
// should stop appearing around the town after that." Measured before this pass: a hands-off
// Eelwater siege was still live after 240 s, because two wounded hounds had fled a kilometre
// and a poacher sat 68 m out shooting, and the win waited for every one of them.
//
// THE COUNT. A siege is a fixed number of bodies, the sum of its three waves, known the
// moment it starts (fen 11, ridge 13, pines 13). The win is that many kills: counted from the
// synchronous 'enemy:killed' event, so the rifles' kills count as well as yours. readout()
// hands the HUD '${killed} / ${total}' (C1/C2). Nothing counted can leave the fight:
//   - every body is spawned HELD (C5, enemies.js): it never runs, never stays outside the
//     hamlet's circle (radius + HOLD_PAD), and knows where you are while you stand in it;
//   - a body that vanishes without being killed (released by anything) is OWED, and so is a
//     body that failed to spawn: it is put back at the attack point you are least looking at;
//   - a body out of the fight — far out and unseen, or making no ground on you and without a
//     line on you for STUCK_S — is RECALLED (released unseen) and owed the same way.
// So the count only ever goes up by a death, and it always reaches the total.
//
// SECURED GROUND (C7). While a siege is live nothing is placed within QUIET_LIVE_R of the
// hamlet and every other hostile inside it is stood down (enemies.standDown, C3): the only
// bodies fighting you are the ones in the count. Once it has held, nothing is placed within
// QUIET_HELD_R ever again, anything that wanders in is stood down, and the rifles, with
// nothing in reach, stay down. director.js asks quietAt().
//
// WHILE IT IS LIVE hamlet-life.contains() ignores the hamlet (C22): enemies.spawn refuses
// hostiles on lit ground and safety.peacefulAt keeps the dread lane out, and the waves have
// to be allowed in. Every wave body is spawned awake, as an AMBUSH (calm-proof for the whole
// fight) with siteGuard 'siege:<id>', which cull(), coolDown() and standDown() all refuse.
//
// LOSING is dying, or walking away: the wave is released, the flag goes back to '', and the
// lookout asks again. A reload mid-siege lands as '' too — nobody is left standing in the
// road for a fight that was never finished.
//
// THE REST is wordless past the door line. The body is pinned inside beside the bed, this
// file's OWN overlay (#curfew-hamlet-fade — refuge.js owns #curfew-rest and hides it whenever
// its own fade is 0, so a second writer needs a second element) goes to 0.72 over 1.2 s,
// holds 2 s, and comes back over 0.6 s. Everything happens at the hold; the 'Rested' card
// (place:rested, which also banks carried XP) lands as the room comes back.

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
// A wave that comes on the timer while the last is still out there costs nothing in honesty:
// the count is the siege's, not the wave's.
const WAVE_MAX_S = 38;        // the next wave comes when the last is dead, or after this
const WAVE_GAP_S = 2.5;       // s between a wave dying and the next: the lookout's line lands first
const SIEGE_SCRIPT_S = 600;   // s of e.scripted (calm-proof, off the leash): the whole fight
const HOLD_PAD = 8;           // m past the hamlet's radius a siege body's circle reaches (C5)
const KNOWS_PAD = 12;         // m past that where it still knows where you are (enemies.js HOLD_KNOWS_PAD)
const ABANDON_R = 150;        // m from the hamlet centre: further than this and you have left
const ABANDON_S = 10;         // s outside that before the defence is called off
const WIN_BEAT_S = 1.0;       // s the count holds at full before the hamlet says it held
const WON_SHOW_S = 8;         // s readout() keeps showing the held count after the win (C2)
// THE COUNT'S HONESTY. A body is out of the fight when it is STRAY_M past its circle and
// unseen for STRAY_S, or when, with you standing in the fight, it has neither closed on you
// by a metre nor had a line on you for STUCK_S (checked every STUCK_WIN_S) and you cannot see
// it. Owed bodies are placed every OWED_EVERY_S at the attack point you are least looking at,
// waiting up to OWED_WAIT_S for one to be out of view. A body that cannot be placed at all
// for OWED_GIVEUP_S is forgiven — counted — rather than holding the siege open for ever.
const STRAY_M = 12;
const STRAY_S = 8;
const STUCK_WIN_S = 3;
const STUCK_S = 24;
const OWED_EVERY_S = 0.5;
const OWED_WAIT_S = 3;
const OWED_SEEN_DOT = 0.5;
const OWED_NEAR_M = 12;
const OWED_GIVEUP_S = 45;
// ...and a body you are not looking at that nothing has touched for UNANSWERED_S while you
// stand in the fight is somewhere the fight cannot reach it (measured at The Cut: a poacher
// under the lookout post's lee, unanswered by the rifles for three minutes). It is recalled
// the same way, and comes back up the road where the rifles can see it.
const UNANSWERED_S = 45;
// C7: SECURED GROUND. Placement and stand-down radii from the hamlet centre, and how often the
// stand-down sweep runs (it walks the pool, so twice a second is plenty: a hound covers about
// four metres in that time, and the radius is a hundred and thirty).
const QUIET_LIVE_R = 150;
const QUIET_HELD_R = 130;
const QUIET_EVERY_S = 0.5;
const QUIET_NEAR = 80;        // m past the held radius you have to be within for the sweep to run
const DOOR_R = 2.3;           // m to the host's door for 'E · COME INSIDE'
const DOOR_DOT = 0.55;        // and looking at it
const DOOR_NEAR = 60;         // m from the hamlet centre before the door is even asked about
const REST_IN_S = 1.2;        // s to the black
const REST_HOLD_S = 2.0;      // s at it
const REST_OUT_S = 0.6;       // s back
const REST_BLACK = 0.72;      // not full black: the room stays there, dimly, the way sleep does
const CASH_GIFT = 150;
const GAS_GIFT = 2;
const HP_GIFT = 10;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const _prompt = { kind: 'hold', label: 'E', rank: 10, x: 0, y: 0, z: 0, k: 0, detail: '', subdetail: 'E · COME INSIDE', unavailable: false };
const _restEvt = { id: '', x: 0, y: 0, z: 0 };

export class HamletDefence {
  static id = 'hamlet-defence';

  constructor(ctx) {
    this.ctx = ctx;
    this.sites = [];           // see init()
    this.time = 0;
    this.useLock = false;
    this.resting = false;      // hamlet-life reads it: no prompts while the fade runs
    this.rest = { id: '', phase: '', t: 0, x: 0, y: 0, z: 0 };
    this.fade = 0; this._fadePrev = 0; this._fadeCurr = 0;
    this._overlay = null;
    this._restored = false;
    this._offs = [];
    this._door = { x: 0, y: 0, z: 0 };
    // C2: the one readout object, rewritten in place (the HUD copies what it needs).
    this._ro = { id: '', name: '', killed: 0, total: 0, wave: 0, waves: 3, live: false, won: false };
    this._wonId = ''; this._wonAt = -1e9;
    this._dtLast = 0;
  }

  _sys(id) { return this.ctx.systems.get(id); }

  init() {
    for (const [id, spec] of Object.entries(HAMLETS)) {
      const plan = HAMLET_PLAN[id];
      const first = role => { const q = spec.people.find(p => p.role === role); return q ? q.name.split(' · ')[0] : ''; };
      const waves = WAVES[spec.region] || WAVES.fen;
      const d = MAJOR_BY_ID[id];
      this.sites.push({
        id, name: d?.name || id, region: spec.region, plan,
        hostName: first('host') || id,             // the prompt's eyebrow at her door
        traderName: first('trader'), gasName: first('gas'),
        cx: d ? d.x : 0, cz: d ? d.z : 0, r: spec.r,
        // C5: the circle every siege body belongs to. One object per hamlet, shared by its bodies.
        hold: { x: d ? d.x : 0, z: d ? d.z : 0, r: spec.r + HOLD_PAD },
        doorL: plan ? houseDoor(plan.host) : null, // the door, hamlet-local, worked out once
        phase: 'idle', wave: 0, bodies: [], waveT: 0, gapT: 0, awayT: 0,
        total: waves.reduce((n, w) => n + w.length, 0), killed: 0,
        owed: [], owedT: 0, owedWait: 0, owedFailT: 0, winT: 0, away: false,
        recalled: 0, lost: 0, forgiven: 0, stoodDown: 0, quietT: 0,
        // every key this file reads in a step, made once (a hot path allocates nothing)
        tag: 'siege:' + id, kSiege: 'hamlet-siege:' + id, kRested: 'hamlet-rested:' + id,
        kCash: 'hamlet-gift:' + id + ':cash', kGas: 'hamlet-gift:' + id + ':gas',
      });
    }
    this._overlayInit();
    const bus = this.ctx.bus;
    this._offs.push(bus.on('save:loaded', () => this._restore()));
    this._offs.push(bus.on('player:died', () => { for (const st of this.sites) if (st.phase === 'live') this._lose(st); this._restCancel(); }));
    this._offs.push(bus.on('enemy:killed', p => this._onKill(p)));
  }

  ready() { return true; }

  /* --------------------------------------------------------------- state -- */

  _site(id) { for (const st of this.sites) if (st.id === id) return st; return null; }
  _flag(key, value) { const pr = this._sys('progress'); return pr && typeof pr.flag === 'function' ? pr.flag(key, value) : undefined; }

  _resetFight(st) {
    st.wave = 0; st.waveT = 0; st.gapT = 0; st.awayT = 0; st.killed = 0; st.winT = 0;
    st.owed.length = 0; st.owedT = 0; st.owedWait = 0; st.owedFailT = 0; st.away = false;
  }

  /** Read every flag. On a load a 'live' siege is a fight that never finished: back to ''. */
  _restore() {
    this._restored = true;
    const life = this._sys('hamlet-life');
    for (const st of this.sites) {
      this._releaseWave(st);
      const v = this._flag(st.kSiege);
      if (v === 'live') this._flag(st.kSiege, '');
      st.phase = v === 'won' ? 'won' : 'idle';
      this._resetFight(st);
    }
    this._wonId = ''; this._wonAt = -1e9;
    life?.setSiege?.('');
    this._restCancel();
  }

  canOffer(id) { const st = this._site(id); return !!st && st.phase === 'idle' && this._flag(st.kSiege) !== 'won'; }
  isLive(id) { const st = this._site(id); return !!st && st.phase === 'live'; }
  won(id) { const st = this._site(id); return !!st && (st.phase === 'won' || this._flag(st.kSiege) === 'won'); }
  /** The live hamlet's id, or ''. */
  liveId() { for (const st of this.sites) if (st.phase === 'live') return st.id; return ''; }

  /**
   * C2. What the HUD prints: null when there is nothing to show; during a live siege
   * {id, name, killed, total, wave, waves, live:true}; for WON_SHOW_S after a win
   * {id, name, killed:total, total, won:true}. ONE object, rewritten on every call: read it,
   * do not keep it. `id` narrows it to one hamlet.
   */
  readout(id) {
    const ro = this._ro;
    for (const st of this.sites) {
      if (st.phase !== 'live' || (id && st.id !== id)) continue;
      ro.id = st.id; ro.name = st.name; ro.killed = Math.min(st.killed, st.total); ro.total = st.total;
      ro.wave = st.wave; ro.waves = 3; ro.live = true; ro.won = false;
      return ro;
    }
    if (this._wonId && (!id || id === this._wonId) && this.time - this._wonAt < WON_SHOW_S) {
      const st = this._site(this._wonId);
      if (st) {
        ro.id = st.id; ro.name = st.name; ro.killed = st.total; ro.total = st.total;
        ro.wave = 3; ro.waves = 3; ro.live = false; ro.won = true;
        return ro;
      }
    }
    return null;
  }

  /**
   * C7. Is (x, z) ground the county may not place a hostile on: within QUIET_LIVE_R of a
   * hamlet whose siege is live, or QUIET_HELD_R of one that has held? director.js asks it for
   * every candidate spawn point and for the player. No allocation.
   */
  quietAt(x, z) {
    for (let i = 0; i < this.sites.length; i++) {
      const st = this.sites[i];
      const r = st.phase === 'live' ? QUIET_LIVE_R : st.phase === 'won' ? QUIET_HELD_R : 0;
      if (!r) continue;
      const dx = x - st.cx, dz = z - st.cz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  /* --------------------------------------------------------------- start -- */

  start(id) {
    const st = this._site(id);
    if (!st || st.phase !== 'idle') return false;
    if (this.ctx.shared.lateBellFinal) return false;          // the night is already over
    // one fight at a time: hamlet-life names ONE live hamlet (contains() ignores it), so any
    // other siege still counting down its walk-away is over now
    for (const o of this.sites) if (o !== st && o.phase === 'live') this._lose(o);
    st.phase = 'live'; st.bodies.length = 0;
    this._resetFight(st);
    this._flag(st.kSiege, 'live');
    this._sys('hamlet-life')?.setSiege?.(id);
    this.ctx.bus.emit('hamlet:siege', { id, name: st.name, total: st.total });
    this._quietTick(st, true);    // whatever was already hunting you here goes
    this._spawnWave(st, 1);
    return true;
  }

  /** The world point of attack point i (shared scratch from hamlet-life: read it at once). */
  _attackPoint(st, i) {
    const life = this._sys('hamlet-life');
    const s = life?.site?.(st.id);
    if (!s) return null;
    const pt = st.plan.attack[i % st.plan.attack.length];
    return life._world(s, pt[0], pt[1], 0);
  }

  /**
   * One counted body at attack point i. Held to the hamlet's circle (C5), calm-proof for the
   * whole fight, stamped 'siege:<id>'. A poacher works its NEAREST band (14 m): it comes up to
   * the fire, where the rifles can answer it. Measured with the 26 m band allowed (hands-off
   * Eelwater, 2026-09-18): the last poacher of wave 3 stood 25 m off the fire, outside the
   * rifles' 20 m, and shot at the player for three and a half minutes with the count at 10/11.
   */
  _spawnBody(st, species, i) {
    const en = this._sys('enemies');
    const w = this._attackPoint(st, i);
    if (!en || !w) return false;
    const x = w.x, z = w.z;
    const opts = { awake: true, ambush: true, ambushS: SIEGE_SCRIPT_S, pack: 1, placementRadius: 4,
      hold: st.hold, siteGuard: st.tag };
    // one call per body (pack: 1): a pack spawn returns only its leader, and every body here
    // has to be stamped and counted
    const e = en.spawn(species, x, z, opts);
    if (!e) return false;
    e.siteGuard = st.tag;
    if (!e.hold) e.hold = st.hold;
    if (species === 'poacher' && e.def?.bands?.length) e.band = 0;
    st.bodies.push({ e, gen: e.gen, species, done: false, strayT: 0, stuckT: 0, checkT: 0, lastD: 1e9, hp: e.hp, quietT: 0 });
    return true;
  }

  _spawnWave(st, n) {
    st.wave = n; st.waveT = 0; st.gapT = 0;
    const life = this._sys('hamlet-life');
    const list = (WAVES[st.region] || WAVES.fen)[n - 1] || [];
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      if (this._spawnBody(st, list[i], i)) count++;
      else st.owed.push(list[i]);                  // not dropped: it comes as soon as it can
    }
    // the lookout says so — loud enough to carry across the hamlet
    const q = life?.person?.(st.id, 'lookout');
    const text = q?.here?.[n - 1];
    if (q?.e?.alive && !q.e.down && text) {
      this._sys('dialogue')?.say({ id: 'hamlet.' + st.id + '.here' + n, speaker: q.name, text, priority: 5, interrupt: true, audibleR: 70 },
        { speakerEntity: q.e, name: q.name });
    }
    this.ctx.bus.emit('hamlet:wave', { id: st.id, wave: n, count, killed: st.killed, total: st.total });
  }

  /** How many counted bodies are standing right now. */
  _alive(st) {
    let n = 0;
    for (let i = 0; i < st.bodies.length; i++) {
      const b = st.bodies[i];
      if (!b.done && b.e.alive && b.e.gen === b.gen) n++;
    }
    return n;
  }

  /** A counted body died: the kill event is synchronous inside enemies._kill, guards' kills too. */
  _onKill(p) {
    const e = p?.e;
    if (!e || typeof e.siteGuard !== 'string' || !e.siteGuard.startsWith('siege:')) return;
    for (const st of this.sites) {
      if (st.phase !== 'live') continue;
      for (let i = 0; i < st.bodies.length; i++) {
        const b = st.bodies[i];
        if (b.done || b.e !== e || b.gen !== e.gen) continue;
        b.done = true;
        st.killed++;
        this.ctx.bus.emit('hamlet:count', { id: st.id, killed: st.killed, total: st.total });
        return;
      }
    }
  }

  _releaseWave(st) {
    const en = this._sys('enemies');
    for (let i = 0; i < st.bodies.length; i++) {
      const b = st.bodies[i];
      if (!b.done && b.e.alive && b.e.gen === b.gen) { en?._uncommit?.(b.e); en?._release?.(b.e); }
    }
    st.bodies.length = 0;
  }

  /** Out of the fight and out of sight: released, and owed back at an attack point. */
  _recall(st, b) {
    const en = this._sys('enemies');
    en?._uncommit?.(b.e); en?._release?.(b.e);
    b.done = true;
    st.owed.push(b.species);
    st.recalled++;
  }

  _win(st) {
    this._releaseWave(st);        // nothing counted is left standing; a forgiven or late-bell end may leave one
    st.phase = 'won'; st.killed = st.total; st.winT = 0; st.owed.length = 0;
    this._flag(st.kSiege, 'won');
    const life = this._sys('hamlet-life');
    this._clearSiege(st);
    this._wonId = st.id; this._wonAt = this.time;
    this.ctx.bus.emit('hamlet:defended', { id: st.id, name: st.name });
    // THE END, in order: the count has sat at full for a beat; now the lookout says it across
    // the hamlet, the fire swells, the rifles are cleared one after another, and one soft tone
    // comes with a card that names who to go and see.
    life?.announceHeld?.(st.id);
    life?.flare?.(st.id);
    const who = [];
    if (st.traderName) who.push(st.traderName + ' owes you.');
    if (st.gasName) who.push(st.gasName + ' has cans.');
    if (st.hostName) who.push(st.hostName + ' has a bed.');
    this.ctx.bus.emit('reward:bundle', { title: st.name + ' held', detail: who.join(' '), quiet: false });
    this._quietTick(st, true);
  }

  /** Tell hamlet-life this hamlet is no longer live, and only if it is the one it names. */
  _clearSiege(st) {
    const life = this._sys('hamlet-life');
    if (life && life.siege === st.id) life.setSiege('');
  }

  _lose(st) {
    this._releaseWave(st);
    st.phase = 'idle';
    this._resetFight(st);
    this._flag(st.kSiege, '');
    this._clearSiege(st);
    this.ctx.bus.emit('hamlet:siege-lost', { id: st.id, name: st.name });
  }

  _stepLive(st, dt, p) {
    // the night is over (the late bell's final hour): whatever is left of the fight is too
    if (this.ctx.shared.lateBellFinal) { this._win(st); return; }
    // walked away: the fight is not happening without you
    const d = Math.hypot(p.pos.x - st.cx, p.pos.z - st.cz);
    st.away = d > ABANDON_R;
    if (st.away) { st.awayT += dt; if (st.awayT >= ABANDON_S) { this._lose(st); return; } }
    else st.awayT = 0;
    st.waveT += dt;

    // THE AUDIT: every counted body is either in the fight, dead, or owed.
    const knows = d < st.hold.r + KNOWS_PAD;       // you are standing in it: they know where you are
    for (let i = 0; i < st.bodies.length; i++) {
      const b = st.bodies[i];
      if (b.done) continue;
      const e = b.e;
      if (!(e.alive && e.gen === b.gen)) { b.done = true; st.owed.push(b.species); st.lost++; continue; }
      const ed = Number.isFinite(e.dist) ? e.dist : 0;
      const unseen = ed > 60 ? !e.los : !e.obsSelf;
      const fromC = Math.hypot(e.pos.x - st.cx, e.pos.z - st.cz);
      b.strayT = (fromC > st.hold.r + STRAY_M && unseen) ? b.strayT + dt : 0;
      if (knows) {
        b.checkT += dt;
        if (b.checkT >= STUCK_WIN_S) {
          b.checkT = 0;
          if (e.los || ed < b.lastD - 1) b.stuckT = 0; else b.stuckT += STUCK_WIN_S;
          b.lastD = ed;
        }
        if (e.hp !== b.hp) { b.hp = e.hp; b.quietT = 0; } else b.quietT += dt;
      } else { b.stuckT = 0; b.checkT = 0; b.lastD = 1e9; b.quietT = 0; b.hp = e.hp; }
      const striking = e.state === 'windup' || e.state === 'attack';
      if (!striking && (b.strayT > STRAY_S || (unseen && (b.stuckT >= STUCK_S || b.quietT >= UNANSWERED_S)))) this._recall(st, b);
    }
    // compact the finished records now and then so a long siege does not grow the list
    if (st.bodies.length > 24) { let k = 0; for (let i = 0; i < st.bodies.length; i++) if (!st.bodies[i].done) st.bodies[k++] = st.bodies[i]; st.bodies.length = k; }

    // OWED bodies come back at the attack point you are least looking at.
    if (st.owed.length) {
      st.owedT += dt; st.owedFailT += dt;
      if (st.owedT >= OWED_EVERY_S) {
        st.owedT = 0;
        const cam = this._sys('camera');
        const fx = cam ? -Math.sin(cam.yaw) : 0, fz = cam ? -Math.cos(cam.yaw) : 0;
        let best = -1, bestDot = 9;
        const n = st.plan.attack.length;
        for (let i = 0; i < n; i++) {
          const w = this._attackPoint(st, i);
          if (!w) continue;
          const dx = w.x - p.pos.x, dz = w.z - p.pos.z, dd = Math.hypot(dx, dz) || 0.001;
          const dot = dd < OWED_NEAR_M ? 2 : (dx * fx + dz * fz) / dd;
          if (dot < bestDot) { bestDot = dot; best = i; }
        }
        if (best >= 0 && (bestDot <= OWED_SEEN_DOT || st.owedWait >= OWED_WAIT_S)) {
          let ok = false;
          for (let k = 0; k < n && !ok; k++) ok = this._spawnBody(st, st.owed[0], (best + k) % n);
          if (ok) { st.owed.shift(); st.owedWait = 0; st.owedFailT = 0; }
          else if (st.owedFailT >= OWED_GIVEUP_S) {
            // it cannot be put anywhere: forgiven, so the siege can still end
            st.owed.shift(); st.killed++; st.forgiven++; st.owedFailT = 0;
            this.ctx.bus.emit('hamlet:count', { id: st.id, killed: st.killed, total: st.total });
          }
        } else st.owedWait += OWED_EVERY_S;
      }
    } else { st.owedT = 0; st.owedWait = 0; st.owedFailT = 0; }

    // THE WIN: every counted body dead. The count sits at full for one beat first.
    if (st.killed >= st.total) {
      st.winT += dt;
      if (st.winT >= WIN_BEAT_S) { this._win(st); return; }
    } else {
      st.winT = 0;
      const alive = this._alive(st);
      if (st.wave < 3) {
        if (alive === 0 && st.owed.length === 0) {
          st.gapT += dt;
          if (st.gapT >= WAVE_GAP_S) this._spawnWave(st, st.wave + 1);
        } else {
          st.gapT = 0;
          if (st.waveT >= WAVE_MAX_S) this._spawnWave(st, st.wave + 1);
        }
      }
    }
    this._quietTick(st, false);
  }

  /**
   * C7. Stand down (enemies.standDown, C3) every hostile inside the hamlet's quiet radius that
   * is not one of the siege's own. standDown refuses whatever it should not touch (an ambush,
   * a body mid-strike, a tableau that never noticed you) and a refused body is simply asked
   * again next tick. A held hamlet only sweeps while you are near enough for it to matter.
   */
  _quietTick(st, force) {
    if (!force) {
      st.quietT -= this._dtLast || 0;
      if (st.quietT > 0) return;
    }
    st.quietT = QUIET_EVERY_S;
    const en = this._sys('enemies');
    if (!en || typeof en.standDown !== 'function' || !en.all) return;
    const R = st.phase === 'live' ? QUIET_LIVE_R : QUIET_HELD_R;
    if (!force && st.phase === 'won') {
      const p = this._sys('player');
      if (!p?.pos || Math.hypot(p.pos.x - st.cx, p.pos.z - st.cz) > R + QUIET_NEAR) return;
    }
    const R2 = R * R;
    for (let i = 0; i < en.all.length; i++) {
      const e = en.all[i];
      if (!e || !e.alive || e.neutral || e.initiallyNeutral || e.down || e.leaving) continue;
      if (e.siteGuard && e.siteGuard.startsWith('siege:')) continue;
      // a place's own body (staged by its cast) that is not after you is part of that place:
      // standDown would only send it home again, twice a second, for ever (measured at The
      // Cut: a nearby place's two hounds, 107 m out, 232 stand-downs in a minute). It goes when it hunts.
      if (e.authored && !(e.aware > 0)) continue;
      const dx = e.pos.x - st.cx, dz = e.pos.z - st.cz;
      if (dx * dx + dz * dz >= R2) continue;
      let ok = false;
      try { ok = !!en.standDown(e); } catch (err) { ok = false; }
      if (ok) st.stoodDown++;
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
      if (this._flag(st.kCash)) return false;
      this._flag(st.kCash, 1);
      pr.payCash(CASH_GIFT, x, y, z, 'hamlet');
      return true;
    }
    if (role === 'gas') {
      if (this._flag(st.kGas)) return false;
      this._flag(st.kGas, 1);
      pr.addGas(GAS_GIFT);
      const who = e?.townName ? String(e.townName).split(' · ')[0] : 'them';
      this.ctx.bus.emit('reward:bundle', { title: 'Two cans of gas', gas: GAS_GIFT, detail: 'From ' + who + '. Pour them at the filler cap.', quiet: true, x, y, z });
      return true;
    }
    return false;
  }

  /** Has the trader paid? From then on his counter is open (hamlet-life drives the menu). */
  traderOpen(id) { const st = this._site(id); return !!st && this.won(id) && !!this._flag(st.kCash); }

  /* ------------------------------------------------------------ the door -- */

  /**
   * Is the player at the host's door, looking at it, in a hamlet that has held? The bed is
   * yours for the rest of the game. Pure: fills this._door with the door's world point.
   * hamlet-life asks it too (once a step per hamlet), so one E press at the door is the
   * door's and not also the host's next line. No allocation.
   */
  atDoor(id) {
    const st = this._site(id);
    if (!st || !st.doorL || !this.won(id)) return false;
    const p = this._sys('player');
    if (!p?.pos || p.dead || this.ctx.shared.inCar) return false;
    const cdx = p.pos.x - st.cx, cdz = p.pos.z - st.cz;
    if (cdx * cdx + cdz * cdz > DOOR_NEAR * DOOR_NEAR) return false;
    const life = this._sys('hamlet-life');
    const s = life?.site?.(id);
    if (!s) return false;
    const w = life._world(s, st.doorL.x, st.doorL.z, st.plan.host.top);
    this._door.x = w.x; this._door.y = w.y; this._door.z = w.z;
    const dx = this._door.x - p.pos.x, dz = this._door.z - p.pos.z, d = Math.hypot(dx, dz);
    if (d > DOOR_R || Math.abs(this._door.y - p.pos.y) > 1.6) return false;
    const cam = this._sys('camera');
    if (!cam) return false;
    const dot = (dx * -Math.sin(cam.yaw) + dz * -Math.cos(cam.yaw)) / (d || 1);
    return dot >= DOOR_DOT;
  }

  /** The host's door, once the hamlet held: the first time she asks you in, then it is a bed. */
  _doorStep(st, use) {
    if (!this.atDoor(st.id)) return;
    const w = this._door, pp = _prompt;   // one payload, rewritten: hud.js copies the fields
    pp.x = w.x; pp.y = w.y + 1.3; pp.z = w.z; pp.detail = st.hostName;
    pp.subdetail = this._flag(st.kRested) ? 'E · REST' : 'E · COME INSIDE';
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
    const wx = w.x, wy = w.y, wz = w.z;
    const col = this._sys('collision');
    const floor = col && typeof col.supportHeight === 'function' ? col.supportHeight(wx, wz, wy, 0.34, 0.45) : wy;
    this.rest.id = st.id; this.rest.phase = 'in'; this.rest.t = 0;
    this.rest.x = wx; this.rest.y = Number.isFinite(floor) ? floor : wy; this.rest.z = wz;
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
        // the room is back: the county's own 'Rested' (reward-feedback), and carried XP banked
        // (progress.js), exactly as a refuge's bed does it
        _restEvt.id = r.id; _restEvt.x = r.x; _restEvt.y = r.y; _restEvt.z = r.z;
        this.ctx.bus.emit('place:rested', _restEvt);
      }
    }
    this._fadeCurr = this.fade;
    this._pin(false);
  }

  /**
   * The one moment at the hold on which everything actually happens. Every rest heals you to
   * full and loses whatever was on your trail; the first also makes you ten bigger.
   */
  _sleep(id) {
    const st = this._site(id);
    const key = st ? st.kRested : 'hamlet-rested:' + id;
    const first = !this._flag(key);
    if (first) {
      this._flag(key, 1);
      this._sys('progress')?.grantHpMax?.(HP_GIFT, 'hamlet');
    }
    const player = this._sys('player');
    if (player && typeof player.heal === 'function' && Number.isFinite(player.hpMax)) player.heal(player.hpMax);
    const en = this._sys('enemies');
    if (en && typeof en.loseTrail === 'function') { try { en.loseTrail(this.rest.x, this.rest.z, 0); } catch (e) { void e; } }
    this.ctx.bus.emit('hamlet:rested', { id, first, x: this.rest.x, y: this.rest.y, z: this.rest.z });
  }

  /* --------------------------------------------------------------- step -- */

  step(dt) {
    if (!this.ctx.playing || this.ctx.paused) return;
    this.time += dt;
    this._dtLast = dt;
    if (!this._restored) this._restore();
    const p = this._sys('player');
    if (!p?.pos) return;
    const use = this.ctx.input.held('use');
    if (!use) this.useLock = false;
    if (this.resting) { this._restStep(dt); return; }
    for (const st of this.sites) {
      if (st.phase === 'live') this._stepLive(st, dt, p);
      else if (st.phase === 'won') { this._quietTick(st, false); this._doorStep(st, use); }
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
        killed: st.killed, total: st.total, owed: st.owed.length, recalled: st.recalled, lost: st.lost,
        forgiven: st.forgiven, stoodDown: st.stoodDown,
        rested: !!this._flag(st.kRested) })),
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
