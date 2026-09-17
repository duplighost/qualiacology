// CURFEW — WHO LIVES IN THE HAMLETS. The Eleven rewire, rebuilt for D16.
//
// Modelled on holdfast-life.js and deliberately a third of it. A hamlet has eight people:
// a lookout on the post at the road end, three with rifles, somebody who trades, somebody
// who keeps the fuel, the one whose house has the bed, and one more. There is no shop and
// no gate. You talk to people, and when the lookout has said everything she has to say the
// prompt on her becomes 'E · STAND WITH US' and hamlet-defence.js takes it from there.
//
// SAFETY. A hamlet is LIT GROUND, the way the Holdfast is, and contains() below is how both
// halves of that are said: enemies/enemies.js refuses a hostile spawn inside one, and
// world/safety.js answers peacefulAt() true so the dread lane keeps out as well. While a
// hamlet's defence is LIVE, contains() ignores that one hamlet (C22): the waves have to be
// able to walk in.
//
// FEET. Nobody's height is a number typed here any more. `y` on a person is the storey they
// live on — the boards, the terrace, the mud — and the collision field is asked for the
// actual floor under them (collision.supportHeight), at spawn and again every 0.7 s, so a
// person stands ON the boards their chunk streamed in after they did.
//
// TALK (D10). Each person has a read-through index. Each E press says the next line and
// cuts the one before (dialogue.js's same-mouth rule). After the last line the prompt goes
// DARK — nothing emitted — for the line's reading time + 0.35 s + 8 s, and then the person
// is readable again from line 0. The last line is never repeated on a spam.
//
// The LANTERNS in the geometry are emissive, not lights. What this file borrows is one rover
// per hamlet, over the fire, near the player only.

import * as THREE from 'three';
import { faceYaw } from '../enemies/nav.js';
import { readingTime } from '../dialogue/lines.js';
import { CASE_SITE } from './climbs-and-caches.js';
import { MAJOR_BY_ID } from './placedata.js';
import { HAMLET_PLAN } from './hamlets.js';

/* ------------------------------------------------------------------- the people -- */
//
// Positions are LOCAL to each hamlet, in the frame hamlets.js builds in (+Z is the road).
// `y` is the storey above the pad (0 the ground, 0.10 Eelwater's water, 0.55 its boards,
// 3.4 The Cut's lower terrace, 1.2 a lookout post). `face` is what they look at. `look` is
// the per-person appearance the PEOPLE lane draws (C14): fen faces 0-3, ridge 4-7, pines
// 8-11, one palette per hamlet, so each cast is visibly its own.
//
// `lines` are said before the defence, `thanks` after it is won; `here` is what the lookout
// shouts as each wave arrives. Every line is authored here and handed to the dialogue system
// as an ad-hoc line (priority 4, never recorded).

export const HAMLETS = Object.freeze({
  eelwater: {
    r: 46, lamp: [-7, 31, 2.8], region: 'fen',
    people: [
      { id: 'eel-greer', name: 'Greer', role: 'lookout', species: 'greer',
        x: 0, z: 30.3, y: 1.2, face: [0, 60], look: { variant: 1, palette: 'fen', hair: 'tied' },
        lines: ['They come up from the road side. They always have.',
          'Three of us can shoot. Ness will not, and the boy is nine.',
          'Tonight, I think. If you are staying, stand with us.'],
        here: ['Here they come.', 'More of them. Hold the boards.', 'Last of it. Do not let them on the boards.'],
        thanks: ['That was the worst of it.', 'The boards held. So did you.'] },
      { id: 'eel-ness', name: 'Ness · smokehouse', role: 'host',
        x: -5.0, z: 6.9, y: 0.55, face: [-8, 7], look: { variant: 0, palette: 'fen', hair: 'loose' },
        lines: ['The smoke keeps. Nothing else out here keeps.',
          'Six years of eel. I could tell you which year one came out of.'],
        thanks: ['You are cold. Come inside.'] },
      { id: 'eel-ord', name: 'Ord · trapper', role: 'trader',
        x: -20.0, z: 6.0, y: 0.55, face: [-30, 6], look: { variant: 2, palette: 'fen', hair: 'cropped' },
        lines: ['Mind the third board. It has been the third board since before this.',
          'The traps come up heavier at the west end. I have stopped asking why.'],
        thanks: ['I sell eel. Nobody buys eel. So this is eel money.',
          'Take it. It is no use to me out here.'] },
      { id: 'eel-hesk', name: 'Hesk · the drums', role: 'gas',
        x: 5.8, z: 30.2, y: 0, face: [7.5, 31], look: { variant: 3, palette: 'fen', hair: 'cropped' },
        lines: ['Diesel for the pump. The pump is for the water. The water does not care.',
          'There was a boat. You do not want to know what happened to the boat.'],
        thanks: ['Two cans. Off the boat that is not coming back.'] },
      { id: 'eel-bram', name: 'Bram', role: 'guard',
        x: -3.6, z: 28.6, y: 0, face: [-3.6, 60], look: { variant: 0, palette: 'fen', hair: 'cropped' },
        lines: ['Road side. That is where it comes from.',
          'I do not sleep before the black hour. Nobody here does.'] },
      { id: 'eel-tam', name: 'Tam', role: 'guard',
        x: 3.6, z: 28.6, y: 0, face: [3.6, 60], look: { variant: 1, palette: 'fen', hair: 'cropped' },
        lines: ['Greer saw the first one. I saw the second.',
          'Keep your torch off the water. It draws them.'] },
      { id: 'eel-wick', name: 'Wick', role: 'guard',
        x: 2.6, z: 16, y: 0.10, face: [0, 40], look: { variant: 2, palette: 'fen', hair: 'tied' },
        lines: ['I check the traps. Something checks them before me.',
          'The cold does not bother me. The other thing does.'] },
      { id: 'eel-boy', name: 'a boy on the boards', role: 'plain',
        x: 19.4, z: -6, y: 0.55, face: [30, -6], walk: [[19.4, -6], [4, -6]],
        look: { variant: 3, palette: 'fen', hair: 'loose' },
        lines: ['I can hold my breath to the smokehouse and back. Do not tell Ness.',
          'Ord says the third board. It is the fourth.'],
        thanks: ['I counted. You got four.'] },
    ],
  },
  'the-cut': {
    r: 50, lamp: [-1, 12, 3.0], region: 'ridge',
    people: [
      { id: 'cut-roan', name: 'Roan', role: 'lookout', species: 'roan',
        x: 0, z: 28.3, y: 1.2, face: [0, 60], look: { variant: 5, palette: 'ridge', hair: 'cropped' },
        lines: ['The road brings them. Same as it brought you.',
          'Dace and Orrin and Hesper have rifles. Hesper can even shoot.',
          'They will come tonight. Stand with us, and I will remember it.'],
        here: ['Here they come.', 'Again. Keep them off the lane.', 'Last of them. Make it count.'],
        // ALEX: "after three conversations he gives a free case lead." The lead is the last
        // thing he says after the defence: the nearest unopened case, pinned on the map.
        thanks: ['Told you I would remember.',
          'There is a sealed case not far from here. Nobody has opened it. Now you know where.'],
        gift: 'case-lead' },
      { id: 'cut-ilke', name: 'Ilke · lime burner', role: 'host',
        x: -5.2, z: 8.6, y: 0, face: [-6.4, 7], look: { variant: 4, palette: 'ridge', hair: 'tied' },
        lines: ['The kiln has not been out. Not once. Somebody is always up.',
          'Lime, mostly. And it keeps the lane warm, which is the real job now.'],
        thanks: ['You have done enough for one night. Come inside.'] },
      { id: 'cut-sarn', name: 'Sarn · at the hoist', role: 'trader',
        x: -15, z: -4.5, y: 3.4, face: [-17, -6], look: { variant: 6, palette: 'ridge', hair: 'cropped' },
        lines: ['Everything up there came up on that rope. Including Meriel.',
          'The face is good stone. We were forty years off finishing it.'],
        thanks: ['We do not pay in lime. Not any more.',
          'Coin. Real coin. Off the last lorry that ever came up here.'] },
      { id: 'cut-meriel', name: 'Meriel · the drums', role: 'gas',
        x: 11.4, z: 23.2, y: 0, face: [13, 24], look: { variant: 7, palette: 'ridge', hair: 'loose' },
        lines: ['From the terrace you can see the road lamps go. One at a time, most nights.',
          'The drums are for the hoist engine. The hoist engine is for nothing, now.'],
        thanks: ['Two cans. The engine will not miss them.'] },
      { id: 'cut-dace', name: 'Dace', role: 'guard',
        x: -4, z: 25, y: 0, face: [-4, 60], look: { variant: 4, palette: 'ridge', hair: 'cropped' },
        lines: ['Stone at my back. That is the whole plan.',
          'They do not like the kiln light. They come anyway.'] },
      { id: 'cut-orrin', name: 'Orrin', role: 'guard',
        x: 4, z: 25, y: 0, face: [4, 60], look: { variant: 5, palette: 'ridge', hair: 'tied' },
        lines: ['I was a quarryman. Now I am this.',
          'If it gets past me it gets Ilke. So it does not get past me.'] },
      { id: 'cut-hesper', name: 'Hesper', role: 'guard',
        x: 10, z: -2.2, y: 3.4, face: [10, 40], look: { variant: 6, palette: 'ridge', hair: 'loose' },
        lines: ['I can hit the road from here. I have.',
          'Up here is where I would want to be, if I were you. I am not you.'] },
      { id: 'cut-pip', name: 'Pip · with the bucket', role: 'plain',
        x: -15.5, z: 9.5, y: 0, face: [-19, 14], walk: [[-15.5, 9.5], [-13.5, 19]],
        look: { variant: 7, palette: 'ridge', hair: 'cropped' },
        lines: ['Lime in the bucket. Lime on my hands. Lime in the bread, probably.',
          'Ilke says the kiln is older than the road. The road says nothing.'],
        thanks: ['I watched from the stair. You were quick.'] },
    ],
  },
  highwood: {
    r: 44, lamp: [0, 1, 3.0], region: 'pines',
    people: [
      { id: 'wood-tobin', name: 'Tobin', role: 'lookout', species: 'sheet',
        x: 0, z: 25.3, y: 1.2, face: [0, 60], look: { variant: 10, palette: 'pines', hair: 'loose' },
        lines: ['Nothing comes through the trees. It comes up the road, same as everyone.',
          'Aldo, Marn and Sif. Three rifles. One of them was mine, before the sheet.',
          'They are close. Stand with us. You would have liked the party.'],
        here: ['Here they come.', 'More. Keep the fire between you and them.', 'Last of them. Then we sit down.'],
        thanks: ['That was the party, then.', 'Wren keeps a bed for whoever needs it. Tonight that is you.'] },
      { id: 'wood-wren', name: 'Wren · the cabin', role: 'host',
        x: -13.2, z: -5.0, y: 0, face: [-14.3, -4], look: { variant: 8, palette: 'pines', hair: 'loose' },
        lines: ['It was a party. It is still a party. We are just quite tired.',
          'I came down first. The others took a year.'],
        thanks: ['Come inside. The bed is made.'] },
      { id: 'wood-pell', name: 'Pell · at the table', role: 'trader',
        x: -2.2, z: -7.2, y: 0, face: [0, -5.5], look: { variant: 9, palette: 'pines', hair: 'cropped' },
        lines: ['Thirteen rungs. I counted them coming down. I am not going back up.',
          'We keep the lanterns cut. It is a thing to do with an evening.'],
        thanks: ['There was a collection. For the band. The band never came.',
          'So it is yours. Do not spend it on a band.'] },
      { id: 'wood-cass', name: 'Cass · at the winch', role: 'gas',
        x: 1.9, z: -11.2, y: 0, face: [3.6, -12.4], look: { variant: 11, palette: 'pines', hair: 'tied' },
        lines: ['The basket takes two. Three if you like each other.',
          'Nobody has gone up in a year. There is nothing up there to go up for.'],
        thanks: ['Two cans. The winch will not need them again.'] },
      { id: 'wood-aldo', name: 'Aldo', role: 'guard',
        x: -4, z: 22, y: 0, face: [-4, 60], look: { variant: 8, palette: 'pines', hair: 'cropped' },
        lines: ['I was the skeleton. Sif was the witch. Marn came as himself.',
          'Fire behind me, road in front. I can live with that.'] },
      { id: 'wood-marn', name: 'Marn', role: 'guard',
        x: 4, z: 22, y: 0, face: [4, 60], look: { variant: 9, palette: 'pines', hair: 'tied' },
        lines: ['They do not like the pumpkins. Neither do I, any more.',
          'The trees hide us from the road. They hide the road from us too.'] },
      { id: 'wood-sif', name: 'Sif', role: 'guard',
        x: 6.5, z: 13, y: 0, face: [3, 40], look: { variant: 10, palette: 'pines', hair: 'loose' },
        lines: ['I was the witch. I still have the hat somewhere.',
          'Sit by the fire if you want. Just do not stand in my line.'] },
      { id: 'wood-lark', name: 'Lark · in a paper crown', role: 'plain',
        x: 12.5, z: 5.5, y: 0, face: [0, 1], walk: [[12.5, 5.5], [5, 4]],
        look: { variant: 11, palette: 'pines', hair: 'loose' },
        lines: ['I was a king. I am still a king. Nobody has said otherwise.',
          'The lanterns are paper. The fire is not. Pell says to remember which.'],
        thanks: ['A king does not thank people. But.'] },
    ],
  },
});

/* ------------------------------------------------------------------- the system -- */

const NEAR_R = 90;            // spawn the people inside this
const TALK_R = 2.9;
const TALK_DOT = 0.60;
const LAMP_NEAR = 70;
const TALK_REST_S = 8;        // D10: dark this long after the last line's reading time
const WALK_SPEED = 0.62;      // m/s: a stroll, half the Holdfast's 0.74, on boards and dust
const WALK_PAUSE_S = 3;       // s at each end of a route
const FLOOR_RECHECK_S = 0.7;  // ask the collision field for the floor this often: a chunk
                              // that streams in after the person did re-floors them inside a
                              // second, and 8 probes a step at most is nothing
const GUARD_NEAR = 100;       // m from the hamlet: the guards only work while you are here (Holdfast rule)
const GUARD_SIGHT = 56;       // m: holdfast-life._protect's reach
const GUARD_CADENCE = 0.8;    // s between shots, the same rifle
const GUARD_DMG = 68;         // per hit, the same rifle
const GUARD_FLASH_S = 0.05;   // s of borrowed muzzle light

// module scratch, never allocated per step: the guard ray, one world point, the prompt
const _from = new THREE.Vector3(), _to = new THREE.Vector3(), _ray = new THREE.Vector3();
const _scratch = { x: 0, y: 0, z: 0 };
const _prompt = { kind: 'hold', label: 'E', rank: 9, x: 0, y: 0, z: 0, k: 0, detail: '', subdetail: '', unavailable: false };

export class HamletLife {
  static id = 'hamlet-life';

  constructor(ctx) {
    this.ctx = ctx;
    this.sites = [];          // { id, spec, plan, rec, people[], lamp, shotAt:Map }
    this.time = 0;
    this.useLock = false;
    this.target = '';
    this.siege = '';          // the hamlet whose defence is live: contains() ignores it (C22)
    this._offs = [];
  }

  _sys(id) { return this.ctx.systems.get(id); }

  init() {
    const places = this._sys('places');
    for (const [id, spec] of Object.entries(HAMLETS)) {
      const rec = places?.nodes?.get?.(id);
      if (!rec) continue;
      const site = {
        id, spec, plan: HAMLET_PLAN[id], rec, lamp: null, shotAt: new Map(),
        people: spec.people.map(p => ({
          ...p, e: null, gen: 0,
          read: 0, restUntil: 0, talks: 0, chain: '',   // D10: this read-through, and which chain it is
          wp: 1, dir: 1, pause: 0, goalY: 0,            // the idle walk
          floorT: 0, homeYaw: 0,
        })),
      };
      this.sites.push(site);
    }
    // LIT GROUND, and NOT by pushing a circle into ctx.shared.sanctuaryZones. That array IS
    // world/sanctuaries.js's own `sites` list — it assigns, not merges — and every entry in it
    // is walked each step expecting a lantern crown to draw. contains() below is the whole
    // answer instead: enemies.js checks it before a hostile spawn and world/safety.js checks
    // it first in peacefulAt(), which is what the dread lane and every placement path read.
    this._offs.push(this.ctx.bus.on('save:loaded', () => this._reset()));
    this._offs.push(this.ctx.bus.on('player:respawn', () => this._reset()));
  }

  ready() { return true; }

  /** Is (x, z) inside any hamlet that is not under siege? enemies.js and safety.js ask. */
  contains(x, z, padding = 0) {
    for (const s of this.sites) {
      if (s.id === this.siege) continue;
      const r = s.spec.r + padding;
      const dx = x - s.rec.def.x, dz = z - s.rec.def.z;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  /** hamlet-defence says which hamlet is live ('' for none). */
  setSiege(id) { this.siege = id || ''; }

  site(id) { for (const s of this.sites) if (s.id === id) return s; return null; }

  /** The first person with this role in a hamlet, or null. */
  person(id, role) {
    const s = this.site(id);
    if (!s) return null;
    for (const q of s.people) if (q.role === role) return q;
    return null;
  }

  _world(s, lx, lz, ly) {
    const rec = s.rec, c = Math.cos(rec.yaw), sy = Math.sin(rec.yaw);
    _scratch.x = rec.def.x + lx * c + lz * sy;
    _scratch.z = rec.def.z - lx * sy + lz * c;
    _scratch.y = rec.padY + (ly || 0);
    return _scratch;
  }

  /**
   * THE FLOOR under a world point, asked from the storey the person lives on.
   * collision.supportHeight searches 0.48 m below and a step above the height it is handed
   * and falls back to bare terrain, which inside the flat pad is the pad. So a person on
   * The Cut's terrace is asked from padY + 3.4 and gets the terrace top when its chunk is
   * resident, and the pad (inside the fill, unseen, for under a second) when it is not.
   */
  _floorAt(wx, wz, refY) {
    const col = this._sys('collision');
    if (col && typeof col.supportHeight === 'function') {
      const h = col.supportHeight(wx, wz, refY, 0.34, 0.45);
      if (Number.isFinite(h)) return h;
    }
    const terrain = this._sys('terrain');
    return terrain && typeof terrain.heightAt === 'function' ? terrain.heightAt(wx, wz) : refY;
  }

  _reset() {
    const en = this._sys('enemies');
    for (const s of this.sites) {
      s.shotAt.clear();
      for (const p of s.people) {
        if (p.e?.alive && p.e.gen === p.gen) en?._release?.(p.e);
        p.e = null; p.read = 0; p.restUntil = 0; p.chain = ''; p.wp = 1; p.dir = 1; p.pause = 0;
      }
    }
    this.target = '';
  }

  /* -------------------------------------------------------------- spawn -- */

  _spawn(s, q) {
    const en = this._sys('enemies');
    const at = this._world(s, q.x, q.z, q.y);
    const wx = at.x, wz = at.z, refY = at.y;
    const feetY = this._floorAt(wx, wz, refY);
    let yaw = (q.yaw || 0) + s.rec.yaw;
    if (q.face) { const f = this._world(s, q.face[0], q.face[1], 0); yaw = faceYaw(wx, wz, f.x, f.z); }
    const guard = q.role === 'guard';
    q.e = en.spawn(q.species || (guard ? 'hamlet-guard' : 'resident'), wx, wz, {
      staged: true, neutral: true, initiallyNeutral: true,
      siteGuard: 'hamlet:' + s.id + ':' + q.id,
      feetY, yaw, placementRadius: 0.6,
      townGuard: guard, townCivilian: !guard,
      look: q.look,
    });
    if (!q.e) return;
    q.gen = q.e.gen; q.homeYaw = yaw; q.floorT = 0;
    q.e.townName = q.name;
    q.e.looted = true;          // a person is not a pocket to go through
    q.wp = 1; q.dir = 1; q.pause = 0; q.goalY = feetY;
  }

  /** Re-ask the floor under where the person is standing now. */
  _refloor(q, s, dt) {
    q.floorT -= dt;
    if (q.floorT > 0) return;
    q.floorT = FLOOR_RECHECK_S;
    const e = q.e;
    const h = this._floorAt(e.stagedX, e.stagedZ, s.rec.padY + (q.y || 0));
    if (Math.abs(h - e.stagedY) > 0.02) e.stagedY = h;
  }

  /* --------------------------------------------------------------- walk -- */
  // holdfast-life._walk, shortened: a two-point stroll, a pause at each end, a ray ahead so
  // nobody walks into a wall, and a stop when you are close or they are talking.
  _walk(s, q, dt) {
    const e = q.e;
    e.townWalk = 0;
    if (!q.walk || q.walk.length < 2) return;
    if (this.target === q.id || this.siege === s.id) return;
    const d = this._sys('dialogue');
    if (d?.active?.opts?.speakerEntity === e) return;
    if (q.pause > 0) { q.pause -= dt; return; }
    const w = q.walk[q.wp];
    const goal = this._world(s, w[0], w[1], q.y);
    const gx = goal.x, gz = goal.z;
    const dx = gx - e.stagedX, dz = gz - e.stagedZ, dist = Math.hypot(dx, dz);
    if (dist < 0.22) {
      q.wp += q.dir;
      if (q.wp >= q.walk.length || q.wp < 0) { q.dir *= -1; q.wp += q.dir * 2; }
      q.pause = WALK_PAUSE_S + (q.read % 3);
      return;
    }
    const col = this._sys('collision');
    if (col && typeof col.raycast === 'function') {
      _from.set(e.stagedX, e.stagedY + 0.8, e.stagedZ); _ray.set(dx / dist, 0, dz / dist);
      const hit = col.raycast(_from, _ray, 0.65, col.MASK.SOLID);
      if (hit && hit.hit !== false) { q.dir *= -1; q.wp = Math.max(0, Math.min(q.walk.length - 1, q.wp + q.dir)); q.pause = 1; return; }
    }
    const p = this._sys('player');
    if (p?.pos && Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < 1.4) return;
    const step = Math.min(dist, WALK_SPEED * dt);
    const yaw = faceYaw(e.stagedX, e.stagedZ, gx, gz);
    const turn = Math.atan2(Math.sin(yaw - e.stagedYaw), Math.cos(yaw - e.stagedYaw));
    e.stagedYaw += turn * Math.min(1, dt * 9);
    e.stagedX += dx / dist * step; e.stagedZ += dz / dist * step;
    e.townWalk = step / Math.max(dt, 0.001);
    // the floor under the new spot, from the storey they live on
    q.goalY = this._floorAt(e.stagedX, e.stagedZ, s.rec.padY + (q.y || 0));
    e.stagedY += (q.goalY - e.stagedY) * Math.min(1, dt * 12);
  }

  /* -------------------------------------------------------------- guards -- */

  _sight(a, b, height = 1.2) {
    const col = this._sys('collision');
    if (!col || typeof col.raycast !== 'function') return true;
    _from.set(a.x, a.y + height, a.z); _to.set(b.x, b.y + 1.15, b.z);
    const dx = _to.x - _from.x, dy = _to.y - _from.y, dz = _to.z - _from.z;
    const d = Math.hypot(dx, dy, dz) || 0.001;
    _ray.set(dx / d, dy / d, dz / d);
    const h = col.raycast(_from, _ray, Math.max(0, d - 0.35), col.MASK.SIGHT | col.MASK.GROUND);
    return !(h && h.hit !== false);
  }

  /**
   * holdfast-life._protect, per hamlet. Every guard standing and neutral picks the nearest
   * hostile within 56 m it can see, faces it, and fires every 0.8 s: a tracer, a borrowed
   * muzzle light, 68 damage, the dealer's rifle sound. A guard hit by a stray swing is
   * flinching (townFear, enemies.js) and holds fire until it passes.
   */
  _protect(s, dt) {
    const en = this._sys('enemies'), p = this._sys('player');
    if (!en || !p?.pos) return;
    if (Math.hypot(p.pos.x - s.rec.def.x, p.pos.z - s.rec.def.z) > GUARD_NEAR) return;
    for (const q of s.people) {
      if (q.role !== 'guard') continue;
      const g = q.e;
      if (!g?.alive || g.gen !== q.gen || !g.neutral) continue;
      g.townGuard = true; g.townAim = 0;
      if (g.townFear > 0) continue;
      let target = null, dist = GUARD_SIGHT;
      for (const e of en.all) {
        if (!e.alive || e.initiallyNeutral || e.neutral) continue;
        const d = Math.hypot(e.pos.x - g.pos.x, e.pos.z - g.pos.z);
        if (d < dist && this._sight(g.pos, e.pos)) { target = e; dist = d; }
      }
      if (!target) { if (this.target !== q.id) g.stagedYaw = q.homeYaw; continue; }
      g.stagedYaw = faceYaw(g.pos.x, g.pos.z, target.pos.x, target.pos.z); g.townAim = 1;
      const last = s.shotAt.get(q.id) || 0;
      if (this.time < last) continue;
      s.shotAt.set(q.id, this.time + GUARD_CADENCE);
      const mz = g.built?.muzzle, sy = Math.sin(g.stagedYaw), cy = Math.cos(g.stagedYaw), scale = g.scale || 1;
      _from.set(g.pos.x + (mz ? mz.x * cy + mz.z * sy : 0) * scale, g.pos.y + (mz ? mz.y * scale : 1.5), g.pos.z + (mz ? -mz.x * sy + mz.z * cy : 0) * scale);
      const dx = target.pos.x - _from.x, dy = target.pos.y + 1 - _from.y, dz = target.pos.z - _from.z;
      const n = Math.hypot(dx, dy, dz) || 0.001;
      _ray.set(dx / n, dy / n, dz / n);
      this._sys('fx')?.tracer?.(_from, _ray, dist);
      this._sys('lights')?.borrow('hamlet-guard', _from.x, _from.y, _from.z, 0xffc27a, 26, GUARD_FLASH_S);
      en.damage(target, GUARD_DMG, { zone: 'torso', point: target.pos, dist, source: 'guard' });
      this._sys('audio')?.dread?.('dealer-shot', g.pos.x, g.pos.y + 1.5, g.pos.z, 0.16);
      this.ctx.bus.emit('hamlet:guard-shot', { site: s.id, x: g.pos.x, y: g.pos.y + 1.5, z: g.pos.z, target: target.pos });
    }
  }

  /* --------------------------------------------------------------- talk -- */

  /** Which chain a person is on: their lines, or their thanks once the hamlet held. */
  _lines(q, s) {
    const won = !!this._sys('hamlet-defence')?.won?.(s.id);
    const chain = won && q.thanks ? 'thanks' : 'lines';
    if (q.chain !== chain) { q.chain = chain; q.read = 0; q.restUntil = 0; }
    return chain === 'thanks' ? q.thanks : q.lines;
  }

  /**
   * Say the next line. Every line is an ad-hoc object (priority 4, interruptible) handed to
   * the dialogue system, which owns the queue, the subtitle and who may talk over whom. The
   * index only ever moves forward; the rest after the last line is set here and read in
   * step(), where the prompt is.
   */
  _talk(q, s) {
    const d = this._sys('dialogue');
    if (!d) return;
    const lines = this._lines(q, s);
    const i = q.read;
    if (i >= lines.length) return;
    const text = lines[i];
    const ok = d.say({ id: 'hamlet.' + s.id + '.' + q.id + '.' + q.chain + i, speaker: q.name, text, priority: 4, interrupt: true },
      { speakerEntity: q.e, name: q.name });
    if (!ok) return;
    q.read++; q.talks++;
    if (q.read < lines.length) return;
    // THE LAST LINE: the rest starts on the press, not on dialogue:end, so a danger line
    // cutting the person mid-sentence can never leave it unset.
    q.restUntil = this.time + readingTime(text) + 0.35 + TALK_REST_S;
    if (q.chain === 'thanks') {
      // A GIFT lands with the line that says it, not a beat later and not on a separate press.
      if (q.role === 'trader' || q.role === 'gas') this._sys('hamlet-defence')?.thank?.(s.id, q.role, q.e);
      if (q.gift === 'case-lead') this._caseLead();
    }
  }

  /**
   * ROAN'S FREE LEAD. The same thing Bo charges 260 coins for, given away because Roan said
   * he would remember. Nearest unopened, un-rumoured case; nothing if there is none left,
   * and nothing said either — he is not going to admit he had nothing.
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

  /* --------------------------------------------------------------- step -- */

  step(dt) {
    if (!this.ctx.playing || this.ctx.paused) return;
    this.time += dt;
    const p = this._sys('player');
    const en = this._sys('enemies');
    const lights = this._sys('lights');
    const defence = this._sys('hamlet-defence');
    if (!p?.pos || !en) return;
    const use = this.ctx.input.held('use');
    if (!use) this.useLock = false;

    let talkTo = null, talkSite = null, best = TALK_R;
    for (const s of this.sites) {
      const d = Math.hypot(p.pos.x - s.rec.def.x, p.pos.z - s.rec.def.z);

      // ONE ROVER PER HAMLET, over the fire, and only while you are in it. The lanterns in
      // the geometry are emissive and cost nothing; this is the light that reaches the ground.
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
        if (!q.e || q.e.gen !== q.gen) { q.e = null; this._spawn(s, q); if (!q.e) continue; }
        if (!q.e.alive || !q.e.neutral) continue;
        this._refloor(q, s, dt);
        this._walk(s, q, dt);

        // nobody talks in a hamlet under siege; the lookout is busy and so is everyone else.
        // And at the host's door the press is the door's (hamlet-defence), not hers.
        if (this.siege === s.id || defence?.resting || defence?.atDoor?.(s.id)) continue;
        const pos = q.e.pos;
        const dd = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z);
        if (dd > best || Math.abs(p.pos.y - pos.y) > 2.2) continue;
        const cam = this._sys('camera');
        if (!cam) continue;
        const dot = ((pos.x - p.pos.x) * -Math.sin(cam.yaw) + (pos.z - p.pos.z) * -Math.cos(cam.yaw)) / (dd || 1);
        if (dot < TALK_DOT) continue;
        best = dd; talkTo = q; talkSite = s;
      }
      this._protect(s, dt);
    }

    if (!talkTo || p.dead || this.ctx.shared.inCar) { this.target = ''; return; }
    const e = talkTo.e;
    const lines = this._lines(talkTo, talkSite);
    const finished = talkTo.read >= lines.length;
    // THE ASK. The lookout, read through, with a defence still to be had: her prompt is the
    // ask, rank 10 so it beats ordinary talk, and it stays until you take it or the hamlet
    // holds. It never rests, and it never goes back to line 0 underneath you.
    const offer = talkTo.role === 'lookout' && talkTo.talks >= lines.length && talkTo.chain === 'lines'
      && !!defence?.canOffer?.(talkSite.id);
    if (!offer) {
      if (finished && this.time < talkTo.restUntil) { this.target = ''; return; }     // D10: dark
      if (finished) talkTo.read = 0;                                                  // readable again
    }
    this.target = talkTo.id;
    e.stagedYaw = faceYaw(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
    const d = this._sys('dialogue');
    const listening = !!(d?.active?.opts?.speakerEntity === e);
    const pp = _prompt;   // one payload, rewritten every step: hud.js copies the fields in its listener
    pp.rank = offer ? 10 : 9; pp.x = e.pos.x; pp.y = e.pos.y + 1.6; pp.z = e.pos.z;
    pp.detail = talkTo.name;
    pp.subdetail = offer ? 'E · STAND WITH US' : listening ? 'E · LISTEN' : 'E · TALK';
    this.ctx.bus.emit('prompt', pp);
    if (!use || this.useLock) return;
    this.useLock = true;
    if (offer) { defence.start(talkSite.id); return; }
    this._talk(talkTo, talkSite);
  }

  state() {
    return {
      hamlets: this.sites.map(s => ({
        id: s.id, lit: !!s.lamp?.inUse,
        standing: s.people.filter(q => q.e?.alive).length,
        talks: s.people.reduce((n, q) => n + q.talks, 0),
      })),
      target: this.target,
      siege: this.siege,
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
