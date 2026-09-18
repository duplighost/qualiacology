// Destination completion joins authored combat, power, rewards and persistent safe ground.
// Geometry, enemy brains and the save owner stay in their own systems.
import { MAJORS, MAJOR_BY_ID } from './placedata.js';
import { SPECIES } from '../enemies/species.js';
import { DefenderMarkers } from './defender-markers.js';

export function countBits(n) { let count = 0; for (n >>>= 0; n; n &= n - 1) count++; return count; }
export const castKey = (record, index) => 'cast-killed:' + record.key + ':' + index;
// The hour's officials cannot die. A circuit must never require their deaths, including
// while a saved cast is streamed out and no live entity exists to answer the question.
export const countsForClear = (row, returned=false) => !row?.neutral && !row?.void && !row?.def?.officer
  && !SPECIES[row?.species || row?.def?.species]?.officer
  && !(row?.species == null && row?.entity?.def?.officer)
  && !(returned && SPECIES[row?.species] && !SPECIES[row.species].human && !['poacher','hunter'].includes(row.species));

const LATE_BELL = 'morning:late-bell';
const ONE_SEAT = Object.freeze([Object.freeze([0, 0])]);
// THE KNOCK. 2026-09-18, Alex: "the last enemy i just couldn't find even though it was marked"
// (the Weeping Mine) and "the last defender was also marked and i just could not find it" (the
// Garden of Rest). A marked body you cannot see now answers: three knuckles on wood from where
// it is, muffled through walls ('knock' is occluded), so it says 'in there' or 'under there'.
// One sound, one meaning. Never during a fight, never from an empty room, never from something
// you have already had on screen close up, and never louder than a knock.
const KNOCK_MIN_M = 6, KNOCK_MAX_M = 34;
const KNOCK_GAP_S = 7.5, KNOCK_JITTER_S = 3;
const KNOCK_GAIN = 0.42;
const FOUND_M = 15;

export class Territory {
  static id = 'territory';
  constructor(ctx) { this.ctx = ctx; this.rows = new Map(); this.zones = []; this.elapsed = 0; this.loaded = false; this.off = []; }
  _sys(id) { return this.ctx.systems.get(id); }
  async init() {
    if(typeof document!=='undefined')this.markers=new DefenderMarkers(this.ctx);
    for (const d of MAJORS) {
      const row = { id: d.id, name: d.name, x: d.x, z: d.z, r: Math.min(72, Math.max(34, d.nearR || 40)), on: false,
        remaining: 0, total: 0, killed: 0, secured: false, powered: false, clear: false, reward: 160,
        securedKey: 'secured:' + d.id, bossKey: 'boss-killed:' + d.id, castId: 'major:' + d.id, prevRemaining: -1 };
      this.rows.set(d.id, row); this.zones.push(row);
    }
    // Save keys are built once and looked up, never concatenated per frame: status() runs every
    // presented frame for the place you are in (readouts.js), and targets every frame you track.
    this._castKeys = new Map();      // cast record -> ['cast-killed:<key>:<i>', ...]
    this._roomKeys = new Map();      // interior def id -> { killed, returned, seats: [...] }
    this._tg = []; this._tgN = 0;    // pooled marker records, filled by fillTargets()
    this._found = new Set();         // marker keys you have had on screen within FOUND_M
    this.rng = this.ctx.rng?.fork?.('territory') || null;
    this.callT = 3;
    this.ctx.shared.territoryZones = this.zones;
    this.off.push(this.ctx.bus.on('enemy:killed', p => this._killed(p)));
    this.off.push(this.ctx.bus.on('boss:killed', p => this._sys('progress')?.flag('boss-killed:' + p.id, true)));
    this.off.push(this.ctx.bus.on('place:claimed', p => this._secure(p.id)));
    this.off.push(this.ctx.bus.on('save:loaded', () => { this.loaded = false; this._found.clear(); }));
    this._restore();
  }
  ready() { return this.rows.size === MAJORS.length; }
  _keysFor(rec) {
    let keys = this._castKeys.get(rec);
    if (!keys || keys.length !== rec.cast.length) {
      keys = new Array(rec.cast.length);
      for (let i = 0; i < keys.length; i++) keys[i] = castKey(rec, i);
      this._castKeys.set(rec, keys);
    }
    return keys;
  }
  _room(def) {
    let k = this._roomKeys.get(def.id);
    if (!k) {
      const n = def.seats?.length || 1, seats = new Array(n);
      for (let i = 0; i < n; i++) seats[i] = def.id + ':' + i;
      k = { killed: 'interior-killed:' + def.id, returned: 'interior-returned:' + def.id, seats };
      this._roomKeys.set(def.id, k);
    }
    return k;
  }
  // An interior resident counts while the interior lane is running. A lane switched off
  // (config({enabled:false})) can never stage the body, so it must never hold a site hostage.
  _horror() { const h = this._sys('interior-horror'); return h && h.enabled !== false ? h : null; }
  _killed(p) {
    const e = p?.e; if (!e) return;
    const places = this._sys('places'), pr = this._sys('progress');
    for (const rec of places._casts.values()) for (let i = 0; i < rec.cast.length; i++) {
      const c = rec.cast[i];
      if (c.entity === e && c.generation === e.gen && countsForClear(c)) pr.flag(this._keysFor(rec)[i], true);
    }
    this.elapsed = 1;
  }
  status(id) {
    const row = this.rows.get(id); if (!row) return null;
    const pr = this._sys('progress'), places = this._sys('places');
    const returned=!!pr.flag(LATE_BELL)?.rang;
    row.powered = places.isClaimed(id);
    row.secured = !!pr.flag(row.securedKey);
    let remaining = 0, total = 0;
    const cast = places._casts.get(row.castId);
    if (cast) {
      const keys = this._keysFor(cast);
      for (let i = 0; i < cast.cast.length; i++) {
        const c = cast.cast[i]; if (!countsForClear(c,returned)) continue;
        total++;
        // Pool recycling and leaving a chunk are never proof of a kill.
        if (!pr.flag(keys[i])) remaining++;
      }
    }
    const horror = this._horror();
    if (horror) for (const e of horror.events || []) {
      if (e.def.site !== id || !countsForClear(e)) continue;
      const k = this._room(e.def);
      if (pr.flag(k.returned)) continue;
      const n = e.def.seats?.length || 1, mask = (1 << n) - 1;
      total += n; remaining += n - countBits((pr.flag(k.killed) || 0) & mask);
    }
    if (MAJOR_BY_ID[id]?.boss && !returned) { total++; if (!pr.flag(row.bossKey)) remaining++; }
    row.total = total; row.remaining = row.secured ? 0 : remaining;
    // C1: the counter reads killed / total. A secured place has nothing left standing.
    row.killed = row.secured ? total : total - remaining;
    row.clear = row.remaining === 0; row.on = row.secured;
    row.reward = 120 + Math.min(180, total * 20);
    return row;
  }
  canPower(id) { return this.status(id)?.clear !== false; }
  track(id) { this.tracked=id; }
  _slot() {
    let t = this._tg[this._tgN];
    if (!t) { t = { key: '', x: 0, y: 0, z: 0, feet: 0, kind: 'body', live: false, onscreen: false, dist: 0, label: '' }; this._tg[this._tgN] = t; }
    this._tgN++; t.onscreen = false; t.dist = 0;
    return t;
  }
  /**
   * The marked targets of one site, written into pooled records (this._tg) and counted. Every
   * record is a real counted slot: an authored cast body (live, or its seat while unspawned),
   * an interior resident (its actor while staged, its seat while the room is still empty),
   * or the site's Kneeler. `kind` is what the marker draws: 'body' a body that is there,
   * 'grave' a dormant body that is not showing yet, 'room' a room still waiting, 'boss'.
   */
  fillTargets(id) {
    this._tgN = 0;
    const pr=this._sys('progress'),places=this._sys('places'),returned=!!pr.flag(LATE_BELL)?.rang;
    const row = this.rows.get(id);
    if (!row || pr.flag(row.securedKey)) return 0;
    const cast=places._casts.get(row.castId);
    if(cast){
      const keys = this._keysFor(cast);
      for(let i=0;i<cast.cast.length;i++){
        const c=cast.cast[i];if(!countsForClear(c,returned)||pr.flag(keys[i]))continue;
        const e=c.entity?.alive&&c.entity.gen===c.generation?c.entity:null,t=this._slot();
        t.key=keys[i];t.label='DEFENDER';
        if(e){
          t.x=e.pos.x;t.z=e.pos.z;t.feet=e.pos.y;t.live=true;
          if(e.state==='dormant'){t.kind='grave';t.y=t.feet+.35;}
          else{t.kind='body';t.y=t.feet+(e.def?.height||1.8)+.45;}
        }else{
          t.x=c.x;t.z=c.z;t.feet=c.feetY??places.nodes.get(id)?.padY??0;t.live=false;t.kind='body';t.y=t.feet+1.8+.45;
        }
      }
    }
    const horror=this._horror();
    if(horror)for(const e of horror.events||[]){
      if(e.def.site!==id||!countsForClear(e))continue;
      const k=this._room(e.def);
      if(pr.flag(k.returned))continue;
      const killed=pr.flag(k.killed)||0,seats=e.def.seats||ONE_SEAT;
      for(let i=0;i<seats.length;i++){
        if(killed&(1<<i))continue;
        let actor=null;
        const actors=horror.actors;
        if(actors)for(let a=0;a<actors.length;a++){const q=actors[a];if(q.encounter===e.def.id&&q.index===i&&q.active&&q.alive){actor=q;break;}}
        if(actor&&actor.pos){
          const t=this._slot();t.key=k.seats[i];t.label='DEFENDER';t.kind='body';t.live=true;
          t.x=actor.pos.x;t.z=actor.pos.z;t.feet=actor.floor??actor.pos.y;t.y=actor.pos.y+2;
        }else{
          const s=e.site||places.nodes.get(id);if(!s)continue;
          const x=e.def.x+seats[i][0],z=e.def.z+seats[i][1],yaw=s.yaw||0,t=this._slot();
          t.key=k.seats[i];t.label='ROOM TO CHECK';t.kind='room';t.live=false;
          t.x=s.def.x+x*Math.cos(yaw)+z*Math.sin(yaw);t.z=s.def.z-x*Math.sin(yaw)+z*Math.cos(yaw);
          t.feet=s.padY+(e.def.y||0);t.y=t.feet+2;
        }
      }
    }
    if(MAJOR_BY_ID[id]?.boss&&!returned&&!pr.flag(row.bossKey)){
      let k=null;const all=this._sys('kneeler')?.all;
      if(all)for(let i=0;i<all.length;i++)if(all[i].placeId===id){k=all[i];break;}
      const pos=k?.pos||MAJOR_BY_ID[id],t=this._slot();
      t.key=row.bossKey;t.label='DEFENDER';t.kind='boss';t.live=!!k;
      t.x=pos.x;t.z=pos.z;t.feet=pos.y||0;t.y=(pos.y||0)+4;
    }
    return this._tgN;
  }
  /** The same records, copied out. For tests and tools; the HUD reads the pool. */
  targets(id) {
    const n=this.fillTargets(id),out=new Array(n);
    for(let i=0;i<n;i++){const t=this._tg[i];out[i]={key:t.key,x:t.x,y:t.y,z:t.z,feet:t.feet,kind:t.kind,live:t.live,label:t.label};}
    return out;
  }
  _secure(id) {
    const row = this.status(id); if (!row || row.secured || !row.clear) return;
    const pr = this._sys('progress');
    pr.flag('secured:' + id, true); row.secured = row.on = row.clear = true; row.remaining = 0;
    // Station is the free first refuge. Other destinations fund the next expedition.
    if (id !== 'filling-station') pr.payCash(row.reward, row.x, (this._sys('places').nodes.get(id)?.padY || 0) + 1, row.z, 'destination-secured');
    this.ctx.bus.emit('territory:secured', { id, name: row.name, cash: id === 'filling-station' ? 0 : row.reward });
  }
  _restore() {
    this.loaded = true;
    const progress = this._sys('progress'), kneeler = this._sys('kneeler');
    // A saved, already powered destination keeps its earned completion on migration.
    for (const id of this._sys('places').claimed) {
      if (!progress.flag('secured:' + id)) progress.flag('secured:' + id, true);
    }
    for (const k of kneeler?.all || []) {
      if (!progress.flag('boss-killed:' + k.placeId) && !progress.flag('secured:' + k.placeId)) continue;
      k.alive = false; k.state = 'dead'; k.rig.root.visible = false; kneeler._unseat(k);
    }
    // A loaded save is not a fresh clear: remember where every row stands without a receipt.
    for (const id of this.rows.keys()) { const row = this.status(id); row.prevRemaining = row.remaining; }
  }
  present(){
    const row=this.rows.get(this.tracked),p=this._sys('player');
    if(!row||!p||row.secured||Math.hypot(p.pos.x-row.x,p.pos.z-row.z)>row.r+100){this.tracked=null;this._tgN=0;this.markers?.update(null,this._tg,0);return;}
    const n=this.fillTargets(row.id);
    this.markers?.update(row,this._tg,n);
    // A target you have had on screen close up is found: it stops knocking.
    for(let i=0;i<n;i++){const t=this._tg[i];if(t.onscreen&&t.dist<FOUND_M&&!this._found.has(t.key))this._found.add(t.key);}
  }
  step(dt) {
    if (!this.ctx.ready) return;
    if (!this.loaded) this._restore();
    this.callT -= dt;
    if (this.callT <= 0) { this.callT = KNOCK_GAP_S + (this.rng ? this.rng.next() * KNOCK_JITTER_S : KNOCK_JITTER_S * .5); this._call(); }
    this.elapsed += dt; if (this.elapsed < .25) return; this.elapsed = 0;
    for (const row of this.rows.values()) {
      this.status(row.id);
      // C1, the clear moment: the last counted body of a place you have not powered yet.
      // Once, on the step it happens; readouts.js prints it and chimes once, softly.
      if (row.prevRemaining > 0 && row.remaining === 0 && !row.secured) this.ctx.bus.emit('territory:clear', { id: row.id, name: row.name });
      row.prevRemaining = row.remaining;
    }
  }
  // One knock from the nearest marked body you cannot see, if there is one worth leading you to.
  _call() {
    const row=this.rows.get(this.tracked);if(!row||row.secured||!this._tgN)return;
    const sh=this.ctx.shared||{};
    if(this.ctx.paused||!this.ctx.playing||sh.inCar||sh.interiorHorror)return;
    const p=this._sys('player');if(!p?.pos||p.dead)return;
    const refuge=this._sys('refuge');if(refuge?.isResting?.()||refuge?.isProtected?.(p.pos.x,p.pos.y,p.pos.z))return;
    if(this._sys('director')?.permit?.()?.huntNear)return;
    const audio=this._sys('audio');if(!audio?.dread)return;
    let best=null,bd=Infinity;
    for(let i=0;i<this._tgN;i++){
      const t=this._tg[i];
      // A real body only: a room still waiting for its resident is not knocked for (it would
      // lie), nor a seat whose body has not been placed yet, nor the Kneeler.
      if(!t.live||t.kind==='room'||t.kind==='boss'||t.onscreen||this._found.has(t.key))continue;
      const d=Math.hypot(t.x-p.pos.x,t.z-p.pos.z);
      if(d>KNOCK_MIN_M&&d<KNOCK_MAX_M&&d<bd){bd=d;best=t;}
    }
    if(best)audio.dread('knock',best.x,best.feet+(best.kind==='grave'?.1:1.0),best.z,KNOCK_GAIN);
  }
  state() { return { places: [...this.rows.values()].map(r => ({ ...r })) }; }
  dispose() { this.markers?.dispose();for (const off of this.off) off?.(); this.ctx.shared.territoryZones = []; }
}
