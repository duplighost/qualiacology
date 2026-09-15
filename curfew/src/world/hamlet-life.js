// CURFEW — WHO LIVES IN THE HAMLETS. The Eleven rewire.
//
// Modelled on holdfast-life.js and deliberately a tenth of it. A hamlet has four or five
// people, no shop, no gate, no guard, and one of them will come with you. There is no quest
// system: you talk to somebody two or three times and then you can ask them to come.
//
// SAFETY. A hamlet is LIT GROUND, the way the Holdfast is, and contains() below is how both
// halves of that are said: enemies/enemies.js refuses a hostile spawn inside one, and
// world/safety.js answers peacefulAt() true so the dread lane keeps out as well. Without
// them, hounds spawn on the boardwalk and Eelwater is a fight instead of somewhere people live.
//
// The LANTERNS in the geometry are emissive, not lights. What this file borrows is one rover
// per hamlet, near the player only, so a hamlet you are standing in is somewhere you can see
// and a hamlet across the county costs nothing.

import { faceYaw } from '../enemies/nav.js';
import { CASE_SITE } from './climbs-and-caches.js';
import { MAJOR_BY_ID } from './placedata.js';

/* ------------------------------------------------------------------- the people -- */
//
// Positions are LOCAL to each hamlet, in the same frame hamlets.js builds in. `y` is metres
// above the pad — the ones on decks and terraces have to be told, because the staged walk
// samples terrain and a boardwalk is not terrain.

export const HAMLETS = Object.freeze({
  eelwater: {
    r: 46, lamp: [0, 0, 3.4],
    people: [
      { id: 'eel-greer', name: 'Greer', species: 'greer', companion: 'greer',
        x: 0, z: -18.5, y: 1.55, yaw: Math.PI,
        lines: ['greer.meet', 'greer.meet2', 'greer.meet3'] },
      { id: 'eel-smoker', name: 'Ness · smokehouse', x: -6.4, z: -16.2, y: 1.55, yaw: -1.2,
        lines: ['eelwater.ness.1', 'eelwater.ness.2'] },
      { id: 'eel-trapper', name: 'Ord · trapper', x: 8.2, z: -6.0, y: 1.55, yaw: -Math.PI * 0.5,
        lines: ['eelwater.ord.1', 'eelwater.ord.2'] },
      { id: 'eel-boy', name: 'a boy on the boards', x: 0, z: 8.0, y: 1.55, yaw: 0,
        lines: ['eelwater.boy.1'] },
    ],
  },
  'the-cut': {
    r: 50, lamp: [-16.5, -2, 7.0],
    people: [
      { id: 'cut-roan', name: 'Roan', species: 'roan', companion: 'roan',
        x: 5.0, z: -1.5, y: 3.4, yaw: Math.PI,
        // ALEX: "after three conversations he gives a free case lead." The third line IS the
        // lead; hamlet-life pins the nearest unopened case on the map when it lands.
        lines: ['roan.meet', 'roan.toll', 'roan.lead'], gift: 'case-lead' },
      { id: 'cut-burner', name: 'Ilke · lime burner', x: -12.4, z: -1.0, y: 3.4, yaw: -0.6,
        lines: ['cut.ilke.1', 'cut.ilke.2'] },
      { id: 'cut-hoist', name: 'Sarn · at the hoist', x: -19.6, z: -9.0, y: 3.4, yaw: -1.4,
        lines: ['cut.sarn.1', 'cut.sarn.2'] },
      { id: 'cut-upper', name: 'Meriel · upper terrace', x: -5.0, z: -12.0, y: 7.2, yaw: 0,
        lines: ['cut.meriel.1'] },
    ],
  },
  highwood: {
    r: 44, lamp: [0, -4, 9.0],
    people: [
      { id: 'wood-tobin', name: 'Tobin', species: 'sheet', companion: 'sheet',
        x: 0.6, z: -12.0, y: 0.02, yaw: Math.PI,
        lines: ['tobin.meet', 'tobin.party'] },
      { id: 'wood-winch', name: 'Cass · at the winch', x: -3.2, z: -14.6, y: 0.02, yaw: -1.0,
        lines: ['highwood.cass.1', 'highwood.cass.2'] },
      { id: 'wood-ladder', name: 'Pell · below the ladder', x: -9.0, z: -3.6, y: 0.02, yaw: 0.4,
        lines: ['highwood.pell.1', 'highwood.pell.2'] },
      { id: 'wood-plat', name: 'Wren · on the low platform', x: -9, z: -7, y: 6.4, yaw: 1.2,
        lines: ['highwood.wren.1'] },
    ],
  },
});

/* ---------------------------------------------------------- their lines, in full -- */
// The companions' own lines live in dialogue/lines.js because they will be recorded. These
// are the neighbours: authored here, passed to the dialogue system as ad-hoc lines, never
// baked. Every one of them is about the place they live in and nothing else.

const NEIGHBOUR = Object.freeze({
  'eelwater.ness.1': 'The smoke keeps. Nothing else out here keeps.',
  'eelwater.ness.2': 'Six years of eel. I could tell you which year one came out of.',
  'eelwater.ord.1': 'Mind the third board. It has been the third board since before this.',
  'eelwater.ord.2': 'The traps come up heavier at the west end. I have stopped asking why.',
  'eelwater.boy.1': 'I can hold my breath to the smokehouse and back. Do not tell Ness.',
  'cut.ilke.1': 'The kiln has not been out. Not once. Somebody is always up.',
  'cut.ilke.2': 'Lime, mostly. And it keeps the terrace warm, which is the real job now.',
  'cut.sarn.1': 'Everything up there came up on that rope. Including Meriel.',
  'cut.sarn.2': 'The face is good stone. We were forty years off finishing it.',
  'cut.meriel.1': 'From up here you can see the road lamps go. One at a time, most nights.',
  'highwood.cass.1': 'The basket takes two. Three if you like each other.',
  'highwood.cass.2': 'Nobody has come down. Not properly. There is nothing down here to come down for.',
  'highwood.pell.1': 'Thirteen rungs. Count them going up so you can count them coming down.',
  'highwood.pell.2': 'We keep the lanterns cut. It is a thing to do with an evening.',
  'highwood.wren.1': 'It was a party. It is still a party. We are just quite tired.',
});

/* ------------------------------------------------------------------- the system -- */

const NEAR_R = 90;          // spawn the people inside this
const TALK_R = 2.9;
const TALK_DOT = 0.60;
const LAMP_NEAR = 70;

export class HamletLife {
  static id = 'hamlet-life';

  constructor(ctx) {
    this.ctx = ctx;
    this.sites = [];          // { id, def, rec, people[], lamp }
    this.time = 0;
    this.useLock = false;
    this.target = '';
    this._offs = [];
  }

  _sys(id) { return this.ctx.systems.get(id); }

  init() {
    const places = this._sys('places');
    for (const [id, spec] of Object.entries(HAMLETS)) {
      const rec = places?.nodes?.get?.(id);
      if (!rec) continue;
      const site = { id, spec, rec, lamp: null, people: spec.people.map(p => ({ ...p, e: null, gen: 0, line: 0, talks: 0 })) };
      this.sites.push(site);
    }
    // LIT GROUND, and NOT by pushing a circle into ctx.shared.sanctuaryZones. That array IS
    // world/sanctuaries.js's own `sites` list — it assigns, not merges — and every entry in it
    // is walked each step expecting a lantern crown to draw. A foreign circle in there took
    // the frame down. contains() below is the whole answer instead: enemies.js checks it
    // before a hostile spawn and world/safety.js checks it first in peacefulAt(), which is
    // what the dread lane and every placement path already read.
    this._offs.push(this.ctx.bus.on('save:loaded', () => this._reset()));
    this._offs.push(this.ctx.bus.on('player:respawn', () => this._reset()));
  }

  ready() { return true; }

  /** Is (x, z) inside any hamlet? enemies.js and safety.js both ask. */
  contains(x, z, padding = 0) {
    for (const s of this.sites) {
      const r = s.spec.r + padding;
      const dx = x - s.rec.def.x, dz = z - s.rec.def.z;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  /** Which hamlet, by id, or ''. companions.js asks when somebody walks home. */
  at(x, z) {
    for (const s of this.sites) {
      const dx = x - s.rec.def.x, dz = z - s.rec.def.z;
      if (dx * dx + dz * dz < s.spec.r * s.spec.r) return s.id;
    }
    return '';
  }

  /** A person's home point in world coordinates, or null. */
  homeOf(companionId) {
    for (const s of this.sites) {
      for (const p of s.people) {
        if (p.companion !== companionId) continue;
        return { ...this._world(s, p.x, p.z, p.y), yaw: p.yaw + s.rec.yaw, site: s.id };
      }
    }
    return null;
  }

  _world(s, lx, lz, ly) {
    const rec = s.rec, c = Math.cos(rec.yaw), sy = Math.sin(rec.yaw);
    return {
      x: rec.def.x + lx * c + lz * sy,
      z: rec.def.z - lx * sy + lz * c,
      y: rec.padY + (ly || 0),
    };
  }

  _reset() {
    const en = this._sys('enemies');
    for (const s of this.sites) for (const p of s.people) {
      if (p.e?.alive && p.e.gen === p.gen) en?._release?.(p.e);
      p.e = null;
    }
    this.target = '';
  }

  /* --------------------------------------------------------------- step -- */

  step(dt) {
    if (!this.ctx.playing || this.ctx.paused) return;
    this.time += dt;
    const p = this._sys('player');
    const en = this._sys('enemies');
    const lights = this._sys('lights');
    if (!p?.pos || !en) return;
    const use = this.ctx.input.held('use');
    if (!use) this.useLock = false;

    let talkTo = null, talkSite = null, best = TALK_R;
    for (const s of this.sites) {
      const d = Math.hypot(p.pos.x - s.rec.def.x, p.pos.z - s.rec.def.z);

      // ONE ROVER PER HAMLET, and only while you are in it. The lanterns in the geometry are
      // emissive and cost nothing; this is the light that actually reaches the ground.
      if (d < LAMP_NEAR && !p.dead) {
        const at = this._world(s, s.spec.lamp[0], s.spec.lamp[1], s.spec.lamp[2]);
        if (!s.lamp?.inUse) s.lamp = lights?.borrow('hamlet', at.x, at.y, at.z, 0xffb06a, 7.5, 0) || null;
      } else if (s.lamp) { lights?.release(s.lamp); s.lamp = null; }

      if (d > NEAR_R) {
        for (const q of s.people) {
          if (q.e?.alive && q.e.gen === q.gen) en._release(q.e);
          q.e = null;
        }
        continue;
      }

      for (const q of s.people) {
        // A companion who has joined you is COMPANIONS' body, not ours: it walks with you and
        // must not also be standing here. One of them, in one place, at a time.
        // A companion who has joined you is COMPANIONS' body now: recruit() takes the very
        // one standing here. LET GO OF THE REFERENCE, never release the body — releasing it
        // killed the person the player just recruited, and companions.js then quietly
        // respawned a second one a metre away.
        if (q.companion && this._sys('companions')?.isOut?.(q.companion)) { q.e = null; continue; }
        if (!q.e || q.e.gen !== q.gen) {
          const at = this._world(s, q.x, q.z, q.y);
          q.e = en.spawn(q.species || 'resident', at.x, at.z, {
            staged: true, neutral: true, initiallyNeutral: true,
            siteGuard: 'hamlet:' + s.id + ':' + q.id,
            feetY: at.y, yaw: q.yaw + s.rec.yaw, placementRadius: 0.6,
          });
          if (!q.e) continue;
          q.gen = q.e.gen;
        }
        if (!q.e.alive || !q.e.neutral) continue;
        q.e.townWalk = 0;

        const pos = q.e.pos;
        const dd = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z);
        if (dd > best || Math.abs(p.pos.y - pos.y) > 2.2) continue;
        const cam = this._sys('camera');
        if (!cam) continue;
        const dot = ((pos.x - p.pos.x) * -Math.sin(cam.yaw) + (pos.z - p.pos.z) * -Math.cos(cam.yaw)) / (dd || 1);
        if (dot < TALK_DOT) continue;
        best = dd; talkTo = q; talkSite = s;
      }
    }

    if (!talkTo || p.dead || this.ctx.shared.inCar) { this.target = ''; return; }
    this.target = talkTo.id;
    const e = talkTo.e;
    e.stagedYaw = faceYaw(e.pos.x, e.pos.z, p.pos.x, p.pos.z);

    // THE RECRUIT. Only after the hamlet chain is done, only one companion at a time, and
    // the prompt says which verb you are about to use. Ranks: 9, the Holdfast's talk rank,
    // because it is the same gesture.
    const comp = this._sys('companions');
    const canJoin = !!talkTo.companion && talkTo.talks >= talkTo.lines.length
      && comp && !comp.joined() && !comp.isOut(talkTo.companion);
    this.ctx.bus.emit('prompt', {
      kind: 'hold', label: 'E', rank: 9, x: e.pos.x, y: e.pos.y + 1.6, z: e.pos.z, k: 0,
      detail: talkTo.name,
      subdetail: canJoin ? 'E · COME WITH ME' : 'E · TALK',
      unavailable: false,
    });
    if (!use || this.useLock) return;
    this.useLock = true;
    if (canJoin) { comp.recruit(talkTo.companion, e); talkTo.talks++; return; }
    this._talk(talkTo, talkSite);
  }

  /**
   * Say the next line. The companions' lines are catalogue ids (they will be recorded); the
   * neighbours' are authored in this file and handed over as ad-hoc lines. Either way the
   * dialogue system owns the queue, the subtitle and who is allowed to talk over whom.
   */
  _talk(q, s) {
    const d = this._sys('dialogue');
    if (!d) return;
    const i = Math.min(q.talks, q.lines.length - 1);
    const id = q.lines[i];
    const text = NEIGHBOUR[id];
    const ok = text
      ? d.say({ id, speaker: q.name, text, priority: 4, interrupt: true }, { speakerEntity: q.e, name: q.name })
      : d.say(id, { speakerEntity: q.e, name: q.name });
    if (!ok) return;
    q.talks++;
    // A GIFT lands with the line that says it, not a beat later and not on a separate press.
    if (q.gift === 'case-lead' && q.talks === q.lines.length) this._caseLead();
    void s;
  }

  /**
   * ROAN'S FREE LEAD. The same thing Bo charges 260 coins for, given away because Roan is
   * generous and wants you to know it. Nearest unopened, un-rumoured case; nothing if there
   * is none left, and nothing said either — he is not going to admit he had nothing.
   */
  _caseLead() {
    const pr = this._sys('progress');
    const p = this._sys('player');
    if (!pr || !p?.pos) return;
    let best = null, bd = Infinity;
    for (const site of Object.values(CASE_SITE)) {
      if (pr.mapStatus('case:' + site) !== 'unknown') continue;
      const d = MAJOR_BY_ID[site];
      if (!d) continue;
      const dist = Math.hypot(p.pos.x - d.x, p.pos.z - d.z);
      if (dist < bd) { bd = dist; best = { id: 'case:' + site, name: d.name + ' · a sealed case', x: d.x, z: d.z, kind: 'place' }; }
    }
    if (best) pr.learnRumour(best);
  }

  state() {
    return {
      hamlets: this.sites.map(s => ({
        id: s.id, lit: !!s.lamp?.inUse,
        standing: s.people.filter(q => q.e?.alive).length,
        talks: s.people.reduce((n, q) => n + q.talks, 0),
      })),
      target: this.target,
    };
  }

  dispose() {
    for (const off of this._offs) off?.();
    this._offs.length = 0;
    const lights = this._sys('lights');
    for (const s of this.sites) if (s.lamp) { lights?.release(s.lamp); s.lamp = null; }
    this._reset();
  }
}

export default HamletLife;
