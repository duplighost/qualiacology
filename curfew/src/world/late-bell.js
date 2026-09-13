// A bell, one final night, and an ordinary dawn. No camera or movement locks.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { canRingLateBell, readLastNight, trueDawnAt, LAST_NIGHT_S } from './late-bell-state.js';

const SAVE_KEY = 'morning:late-bell';
const KEPT_KEY = 'morning:kept-blackout';
const ANSWERS = [
  ['gallowsfen', 1.7], ['choir-vault', 3.2], ['choir-vault', 3.65],
  ['choir-vault', 4.1], ['choir-vault', 4.55], ['choir-vault', 5.0],
  ['holdfast', 6.5], ['morning', 9.0],
];
const warm = new THREE.Color(0xffd19a);

export class LateBell {
  static id = 'late-bell';
  constructor(ctx) {
    this.ctx = ctx; this.last = null; this.loaded = false; this.saveT = 0;
    this.answers = []; this.answerT = 0; this.blackout = 0; this.relight = 1;
    this.cryptFlash = 0; this.cryptRover = null; this.haleT = 0;
    this.title = null; this.titleT = 0; this.seatT = 0; this.returnArmed = false;
    this.offs = [];
  }
  _sys(id) { return this.ctx.systems.get(id); }
  async init() {
    this.offs.push(this.ctx.bus.on('place:bell-shot', e => this._ring(e)));
    this.offs.push(this.ctx.bus.on('boss:cleared', e => { if (e?.id === 'underkeep') this._kept(); }));
    this.offs.push(this.ctx.bus.on('save:loaded', () => { this.loaded = false; }));
    this.offs.push(this.ctx.bus.on('clock:rest-advanced', e => {
      this.blackout = Math.max(0, this.blackout - (e?.seconds || 0));
      this._save();
    }));
    this._load();
  }
  ready() { return true; }
  _load() {
    const pr = this._sys('progress');
    if (!pr?.save?.data) return;
    this.last = readLastNight(pr.flag(SAVE_KEY));
    this.blackout = Math.max(0, Math.min(LAST_NIGHT_S, Number(pr.flag(KEPT_KEY)) || 0));
    this.relight = this.blackout > 0 ? 0 : 1;
    if (this.last) this._sys('clock')?.beginLastNight(this.last.complete ? LAST_NIGHT_S : this.last.elapsed);
    else if(this._sys('clock')?.finalNight){
      const clock=this._sys('clock');clock.finalNight=false;clock.setPhase('dusk');
      this._sys('dusk-to-dawn')?.setHonestNight(false);this._sys('dusk-to-dawn')?.setPhotocellSweep(0);
      this._sys('sky')?.setTrueDawn(0);
    }
    this._publish(); this.loaded = true;
  }
  _save(flush = false) {
    const pr = this._sys('progress'); if (!pr) return;
    if (this.last) pr.flag(SAVE_KEY, { ...this.last });
    if (pr.bossCleared?.('underkeep')) pr.flag(KEPT_KEY, this.blackout);
    if (flush) pr.save?.flush();
  }
  _publish() {
    const s = this.ctx.shared;
    s.lateBellFinal = !!this.last;
    s.trueDawn = this.last ? trueDawnAt(this.last.elapsed) : 0;
    s.morningReturned = !!this.last?.complete;
    s.holdfastBlackout = this.blackout > 0;
    s.holdfastRelight = this.relight;
  }
  _ring(e) {
    if (!e || e.id !== 'bell-tower' || this.last) return false;
    const pr = this._sys('progress'), car = this._sys('car');
    if (!car?.pos || car.exists === false) return false;
    const distance = Math.hypot(car.pos.x - e.x, car.pos.z - e.z);
    const col = this._sys('collision');
    // Line from the car roof to the bell, ending short of its own collider.
    const cy = (car.roofHeightAt?.(car.pos.x, car.pos.z) ?? car.pos.y + 1.97) + .12;
    const dx = e.x - car.pos.x, dy = e.y - cy, dz = e.z - car.pos.z;
    const length = Math.hypot(dx, dy, dz), f = Math.max(0, 1 - 3.1 / Math.max(1, length));
    const visible = !col?.segmentClear || col.segmentClear(car.pos.x, cy, car.pos.z,
      car.pos.x + dx * f, cy + dy * f, car.pos.z + dz * f);
    if (!canRingLateBell({ finishes: pr?.save?.data?.finishes, phase: this.ctx.shared.phase,
      carDistance: distance, carVisible: visible, started: !!this.last })) return false;
    this.last = { rang: true, elapsed: 0, complete: false };
    this.answers = ANSWERS.map(([id, at]) => ({ id, at })); this.answerT = 0;
    this._sys('clock').beginLastNight();
    this._publish(); this._save(true);
    this.ctx.bus.emit('morning:bell', { x: e.x, z: e.z });
    this._sys('planetarium')?.setTrueMorning(0);
    return true;
  }
  _bell(id) {
    const places = this._sys('places'), rec = places?.nodes.get(id);
    if (!rec) return;
    rec.bellT = 0;
    this._sys('audio')?.whisper?.('bell', rec.def.name, rec.def.x, rec.padY + 3, rec.def.z);
    this.ctx.bus.emit('morning:answer', { id, x: rec.def.x, z: rec.def.z });
  }
  _kept() {
    this.blackout = LAST_NIGHT_S; this.relight = 0; this.cryptFlash = 2; this.haleT = 0;
    this._publish(); this._save(true);
    this.ctx.bus.emit('morning:crypt-opened', {});
  }
  _crypt(dt) {
    if (this.cryptFlash <= 0) return;
    this.cryptFlash = Math.max(0, this.cryptFlash - dt);
    const lights = this._sys('lights'), site = this._sys('boss-sites')?.sites.find(s => s.id === 'underkeep');
    if (!site) return;
    if (!this.cryptRover && this.cryptFlash > 0) {
      this.cryptRover = lights?.borrow('kept-sunlight', site.x, site.y + 8, site.z, 0xffd19a, 190, 0);
      if (this.cryptRover) { this.cryptRover.decay = .7; this.cryptRover.distance = 105; }
    }
    // An emissive wash lets all thirteen faces read even if the rover pool is busy.
    for (const mat of site.cryptMaterials || []) {
      if (!mat.emissive) continue;
      mat.emissive.copy(warm); mat.emissiveIntensity = this.cryptFlash > 0 ? .5 : 0;
    }
    if (!this.cryptFlash && this.cryptRover) { lights?.release(this.cryptRover); this.cryptRover = null; }
  }
  step(dt) {
    if (!this.ctx.ready) return;
    if (!this.loaded) this._load();
    if (!this.loaded) return;
    this._crypt(dt);
    if (this.blackout > 0) {
      this.blackout = Math.max(0, this.blackout - dt);
      this.haleT -= dt;
      if (this.haleT <= 0) { this.haleT = 4.8; this._bell('holdfast'); }
    } else this.relight = Math.min(1, this.relight + dt / 18);
    if (this.last) {
      this.last.elapsed = Math.min(LAST_NIGHT_S, this._sys('clock').cycleT);
      this.answerT += dt;
      while (this.answers.length && this.answers[0].at <= this.answerT) this._bell(this.answers.shift().id);
      const p = this._sys('player'), planetarium = this._sys('planetarium');
      const morning = this._sys('places')?.nodes.get('morning');
      const atMorning = morning && Math.hypot(p.pos.x - morning.def.x, p.pos.z - morning.def.z) < 48;
      const facingEast = this.ctx.camera?.getWorldDirection ? this.ctx.camera.getWorldDirection(_view).x > .35 : true;
      if (!this.last.complete && this.last.elapsed >= LAST_NIGHT_S && atMorning && planetarium?.seated && facingEast && !p.dead) {
        this.seatT += dt;
        if (this.seatT >= 3) this._complete();
      } else this.seatT = 0;
      if (this.last.complete) {
        const inTown = this._sys('holdfast-life')?.contains(p.pos.x, p.pos.z, 0);
        if (!inTown) this.returnArmed = true;
        if (inTown && this.returnArmed) { this._bell('holdfast'); this.returnArmed = false; }
      }
    }
    this._publish();
    const lamps = this._sys('dusk-to-dawn');
    if (this.last) { lamps?.setHonestNight(true); lamps?.setPhotocellSweep(this.ctx.shared.trueDawn); }
    this.saveT += dt;
    if (this.saveT >= 5) { this.saveT = 0; this._save(); }
    if (this.titleT > 0) {
      this.titleT -= dt;
      if (this.titleT <= 0) this._dismissTitle();
    }
  }
  present() {
    if(this._sys('boss-sites')?.inside && this._sys('progress')?.bossCleared('underkeep') && this.cryptFlash<=0){
      const lights=this._sys('lights');lights?.setFillScale(.035);lights?.setMoonIntensity(0);
    }
    if (!this.last) return;
    const k = this.ctx.shared.trueDawn;
    if (k > 0) {
      const sky = this._sys('sky'), lights = this._sys('lights');
      sky?.setTrueDawn(k);
      lights?.setMoonArc(.14 + k * .10, 0);
      if (lights?.moon) lights.moon.color.set(0xffd19a).lerp(_white, k * .35);
      lights?.setMoonIntensity(CFG.lights.moon.intensity * (1 + k * .7));
      if(this._sys('boss-sites')?.inside)lights?.setMoonIntensity(0);
      this._sys('planetarium')?.setTrueMorning(k);
    }
  }
  _complete() {
    this.last.complete = true; this.last.elapsed = LAST_NIGHT_S;
    this._publish(); this._save(true);
    this.ctx.bus.emit('morning:returned', {});
    if (typeof document === 'undefined') return;
    this._dismissTitle();
    const card = document.createElement('div'); card.id = 'morning-date';
    card.setAttribute('role', 'status'); card.textContent = 'NOVEMBER 2.';
    card.style.cssText = 'position:fixed;inset:0;z-index:80;display:grid;place-items:center;background:#08090b;color:#eee7d9;font:clamp(25px,4vw,56px) Georgia,serif;letter-spacing:.22em;pointer-events:none';
    document.body.append(card); this.title = card; this.titleT = 6;
    this.dismissKey = () => this._dismissTitle();
    document.addEventListener('keydown', this.dismissKey, { once: true });
    document.addEventListener('pointerdown', this.dismissKey, { once: true });
  }
  _dismissTitle() {
    this.title?.remove(); this.title = null; this.titleT = 0;
    if (typeof document !== 'undefined' && this.dismissKey) {
      document.removeEventListener('keydown', this.dismissKey);
      document.removeEventListener('pointerdown', this.dismissKey);
    }
    this.dismissKey = null;
  }
  state() { return { lastNight: this.last ? { ...this.last } : null, blackout: this.blackout, relight: this.relight, cryptFlash: this.cryptFlash, trueDawn: this.ctx.shared.trueDawn, answers: this.answers.length }; }
  dispose() {
    this._save(true); this.offs.forEach(off => off?.()); this._dismissTitle();
    if (this.cryptRover) this._sys('lights')?.release(this.cryptRover);
  }
}
const _view = new THREE.Vector3(), _white = new THREE.Color(0xfff4e0);
