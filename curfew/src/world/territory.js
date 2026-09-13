// Destination completion joins authored combat, power, rewards and persistent safe ground.
// Geometry, enemy brains and the save owner stay in their own systems.
import { MAJORS, MAJOR_BY_ID } from './placedata.js';
import { SPECIES } from '../enemies/species.js';

export function countBits(n) { let count = 0; for (n >>>= 0; n; n &= n - 1) count++; return count; }
export const castKey = (record, index) => 'cast-killed:' + record.key + ':' + index;
// The hour's officials cannot die. A circuit must never require their deaths, including
// while a saved cast is streamed out and no live entity exists to answer the question.
export const countsForClear = (row, returned=false) => !row?.neutral && !row?.def?.officer
  && !SPECIES[row?.species || row?.def?.species]?.officer
  && !(row?.species == null && row?.entity?.def?.officer)
  && !(returned && SPECIES[row?.species] && !SPECIES[row.species].human && !['poacher','hunter'].includes(row.species));

export class Territory {
  static id = 'territory';
  constructor(ctx) { this.ctx = ctx; this.rows = new Map(); this.zones = []; this.elapsed = 0; this.loaded = false; this.off = []; }
  _sys(id) { return this.ctx.systems.get(id); }
  async init() {
    for (const d of MAJORS) {
      const row = { id: d.id, name: d.name, x: d.x, z: d.z, r: Math.min(72, Math.max(34, d.nearR || 40)), on: false,
        remaining: 0, total: 0, secured: false, powered: false, clear: false, reward: 160 };
      this.rows.set(d.id, row); this.zones.push(row);
    }
    this.ctx.shared.territoryZones = this.zones;
    this.off.push(this.ctx.bus.on('enemy:killed', p => this._killed(p)));
    this.off.push(this.ctx.bus.on('boss:killed', p => this._sys('progress')?.flag('boss-killed:' + p.id, true)));
    this.off.push(this.ctx.bus.on('place:claimed', p => this._secure(p.id)));
    this.off.push(this.ctx.bus.on('save:loaded', () => { this.loaded = false; }));
    this._restore();
  }
  ready() { return this.rows.size === MAJORS.length; }
  _killed(p) {
    const e = p?.e; if (!e) return;
    const places = this._sys('places'), pr = this._sys('progress');
    for (const rec of places._casts.values()) for (let i = 0; i < rec.cast.length; i++) {
      const c = rec.cast[i];
      if (c.entity === e && c.generation === e.gen && countsForClear(c)) pr.flag(castKey(rec, i), true);
    }
    this.elapsed = 1;
  }
  status(id) {
    const row = this.rows.get(id); if (!row) return null;
    const pr = this._sys('progress'), places = this._sys('places');
    const returned=!!pr.flag('morning:late-bell')?.rang;
    row.powered = places.isClaimed(id);
    row.secured = !!pr.flag('secured:' + id);
    let remaining = 0, total = 0;
    const cast = places._casts.get('major:' + id);
    if (cast) for (let i = 0; i < cast.cast.length; i++) {
      const c = cast.cast[i]; if (!countsForClear(c,returned)) continue;
      total++;
      // Pool recycling and leaving a chunk are never proof of a kill.
      if (!pr.flag(castKey(cast, i))) remaining++;
    }
    for (const e of this._sys('interior-horror')?.events || []) {
      if (e.def.site !== id || !countsForClear(e) || pr.flag('interior-returned:'+e.def.id)) continue;
      const n = e.def.seats?.length || 1, mask = (1 << n) - 1;
      total += n; remaining += n - countBits((pr.flag('interior-killed:' + e.def.id) || 0) & mask);
    }
    if (MAJOR_BY_ID[id]?.boss && !returned) { total++; if (!pr.flag('boss-killed:' + id)) remaining++; }
    row.total = total; row.remaining = row.secured ? 0 : remaining;
    row.clear = row.remaining === 0; row.on = row.secured;
    row.reward = 120 + Math.min(180, total * 20);
    return row;
  }
  canPower(id) { return this.status(id)?.clear !== false; }
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
    for (const id of this.rows.keys()) this.status(id);
  }
  step(dt) {
    if (!this.ctx.ready) return;
    if (!this.loaded) this._restore();
    this.elapsed += dt; if (this.elapsed < .25) return; this.elapsed = 0;
    for (const id of this.rows.keys()) this.status(id);
  }
  state() { return { places: [...this.rows.values()].map(r => ({ ...r })) }; }
  dispose() { for (const off of this.off) off?.(); this.ctx.shared.territoryZones = []; }
}
