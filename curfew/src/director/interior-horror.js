// Authored destination residents. Bodies are staged before entry; attention starts the beat.
// September 8: these residents are real combatants. Damage owns health and death;
// shots can never restart a decorative collapse or revive a defeated resident.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeShell } from '../enemies/bodies.js';
import { clamp01 } from '../engine/math.js';
import { CFG } from '../config.js';

// Site-local coordinates use the SAME yaw/pad frame as places.nodes. The zone is the actual
// room, not a radius through its walls; a head-height sight ray is a second independent gate.
// A room is allowed to keep its resident after the site's power is restored. Only the real
// closed refuge is safe, and that public predicate wins over every encounter state below.
export const INTERIOR_ENCOUNTERS = Object.freeze([
  { id: 'blackthorn-hall', site: 'blackthorn-manor', kind: 'resident', x: 14.8, z: 4.9, y: 3.2,
    zone: [0, 4, 57, 3.7], look: [6.3, 4, 3.2], yaw: Math.PI / 2 },
  { id: 'blackthorn-upper', site: 'blackthorn-manor', kind: 'resident', x: -2, z: -10, y: 7.4,
    zone: [-12, -10, 33, 3.5], look: [-11, -10, 7.4], yaw: Math.PI / 2 },
  { id: 'blackthorn-cellar', site: 'blackthorn-manor', kind: 'resident', x: -9, z: -12.1, y: 0,
    zone: [-10, -12, 23, 3.1], look: [0, -12, 0], yaw: -Math.PI / 2, scale: 0.77 },
  { id: 'avery-hall', site: 'avery-house', kind: 'resident', x: -14.8, z: 4.6, y: 3.2,
    zone: [0, 4, 57, 3.7], look: [-7, 4, 3.2], yaw: -Math.PI / 2 },
  { id: 'avery-upper', site: 'avery-house', kind: 'resident', x: 13, z: 4.8, y: 7.4,
    zone: [0, 4, 57, 3.6], look: [5, 4, 7.4], yaw: Math.PI / 2, scale: 0.91 },
  { id: 'mine-shift', site: 'weeping-mine', kind: 'suspended', x: 8.3, z: -7.4, y: 0,
    zone: [12.5, -8, 10.7, 7.8], look: [8.2, -11.2, 0], ceiling: 5.05, yaw: 0 },
  { id: 'mine-chain-room', site: 'weeping-mine', kind: 'suspended', x: -9.2, z: 5.6, y: 0,
    zone: [-11.3, 8.4, 9.0, 7.0], look: [-10.0, 11.0, 0], ceiling: 7.7, yaw: Math.PI },
  { id: 'cathedral-congregation', site: 'cathedral', kind: 'congregation', x: 0, z: 17, y: 0,
    zone: [0, 14, 15.6, 16.5], look: [0, 21.0, 0], yaw: Math.PI,
    seats: [[-3.0, -0.75], [3.0, 1], [-3.8, 2.75], [4.4, -0.75]] },
  { id: 'chapel-vesper', site: 'chapel', kind: 'resident', x: -1.65, z: 6.2, y: 0,
    zone: [0, 4.2, 7.4, 8.7], look: [-1.55, 1.8, 0], yaw: 0, scale: 0.93 },
  { id: 'mill-sacks', site: 'hollow-mill', kind: 'resident', x: 7.4, z: 4.6, y: 0,
    zone: [7.5, 4.5, 5.8, 3.7, 0.6], look: [6.1, 3.4, 0], yaw: 0.6, scale: 0.76, minDistance: 1.5 },
  { id: 'mill-granary', site: 'hollow-mill', kind: 'resident', x: 11.0, z: -5.0, y: 0,
    zone: [10.7, -5.5, 3.2, 15.5], look: [11.0, 0.9, 0], yaw: Math.PI, scale: 0.95 },
  { id: 'garden-mourner', site: 'garden-of-rest', kind: 'resident', x: -18.9, z: 8.4, y: 0,
    zone: [-17.2, 6.5, 5.7, 7.2, 0.34], look: [-18.0, 4.4, 0], yaw: 0.34, terrain: true },
  { id: 'jackfield-rafters', site: 'jackfield', kind: 'suspended', x: -2.3, z: 1.2, y: 0,
    zone: [-0.6, 0, 6.0, 10.0], look: [-3.3, -1.1, 0], ceiling: 5.6, yaw: 0, minDistance: 2.0 },
]);

const POOL = 4;
const REARM = 300;                 // a new visit, not a loop you can farm by turning around
const GLOBAL_GAP = 42;
const SKIN = [0.056, 0.049, 0.043];
const CLOTH = [0.040, 0.048, 0.043];
const SEAM = [0.108, 0.087, 0.063];
const VOID = [0.002, 0.003, 0.003];
const TEETH = [0.135, 0.113, 0.088];
const _origin = { x: 0, y: 0, z: 0 };
const _meshRay = new THREE.Raycaster();
const RESIDENT_DEF=Object.freeze({id:'interior-resident',owner:'pressure',hp:150,xp:90,height:2.9,radius:.43,mass:110,dmg:20});

function paint(g, color) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set(color, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

function sculpt(mat, fn) {
  const parts = [];
  const shape = (g, x, y, z, color, rx = 0, rz = 0) => {
    g.rotateX(rx); g.rotateZ(rz); g.translate(x, y, z); parts.push(paint(g, color));
  };
  const ell = (x, y, z, w, h, d, color, rx = 0, rz = 0) => {
    const g = new THREE.SphereGeometry(1, 12, 9); g.scale(w, h, d); shape(g, x, y, z, color, rx, rz);
  };
  const rod = (x, y, z, top, bottom, length, color, rx = 0, rz = 0) =>
    shape(new THREE.CylinderGeometry(top, bottom, length, 7), x, y, z, color, rx, rz);
  fn(ell, rod, shape);
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; return mesh;
}

// One readable, deliberately wrong anatomy: a narrow coat hanging off an extra-long chest,
// a face whose mouth reaches its throat, bone fingers, and a second lower row of teeth.
// Every moving section is merged. The mapped enemy shell already has a boot-warmed program.
function residentRig(mat, index) {
  const root = new THREE.Group(); root.name = 'interior-resident-' + index; root.visible = false;
  const hips = new THREE.Group(); root.add(hips);
  const lower = sculpt(mat, (ell, rod) => {
    ell(0, 0.95, 0, 0.29, 0.44, 0.22, CLOTH);
    for (const s of [-1, 1]) {
      rod(s * 0.18, 0.50, -0.06, 0.125, 0.074, 0.91, CLOTH, -0.09, -s * 0.07);
      ell(s * 0.20, 0.09, 0.10, 0.115, 0.075, 0.24, VOID);
      rod(s * 0.29, 0.92, 0.13, 0.035, 0.09, 0.85, SEAM, 0.16, s * 0.14);
    }
  });
  hips.add(lower);
  const torso = new THREE.Group(); torso.position.y = 1.18; hips.add(torso);
  torso.add(sculpt(mat, (ell, rod) => {
    ell(0, 0.52, 0, 0.30, 0.72, 0.18, CLOTH, 0.10);
    ell(0, 0.94, -0.03, 0.48, 0.15, 0.16, CLOTH, 0.13);
    rod(0, 0.58, 0.157, 0.034, 0.022, 1.03, SEAM);
    for (let i = 0; i < 6; i++) {
      ell(-0.018, 0.97 - i * 0.15, 0.177, 0.025, 0.024, 0.018, SKIN);
      rod((i % 2 ? -1 : 1) * 0.17, 0.84 - i * 0.115, 0.133, 0.018, 0.018, 0.26, SEAM, 0, 1.31);
    }
    rod(0.025, 1.18, 0.025, 0.085, 0.13, 0.36, SKIN, -0.14);
  }));
  const head = new THREE.Group(); head.position.set(0.018, 1.40, 0.028); torso.add(head);
  head.add(sculpt(mat, (ell, rod) => {
    ell(0, 0.045, -0.092, 0.237, 0.343, 0.207, CLOTH, -0.06);
    ell(0, 0.02, 0, 0.182, 0.29, 0.19, SKIN, -0.06);
    ell(-0.027, -0.222, 0.094, 0.109, 0.262, 0.116, SKIN, -0.12, -0.19);
    ell(0.109, -0.033, 0.12, 0.064, 0.106, 0.080, SEAM, 0.04, 0.13);
    ell(-0.116, -0.031, 0.153, 0.046, 0.082, 0.037, [0.016, 0.018, 0.016], 0, -0.14);
    // Recesses are geometry with depth, so they read in the torch rather than glowing.
    for (const s of [-1, 1]) {
      ell(s * 0.079, 0.082 + s * 0.016, 0.172, 0.052, 0.039 + s * 0.008, 0.042, VOID, 0, -s * 0.26);
      ell(s * 0.080, 0.123, 0.165, 0.073, 0.027, 0.044, SEAM, 0, -s * 0.18);
      rod(s * 0.143, -0.11, 0.136, 0.027, 0.012, 0.22, SEAM, 0, s * 0.14);
    }
    ell(0.029, -0.188, 0.216, 0.057, 0.181, 0.026, VOID, -0.10, -0.18);
    // Strips of the old head covering divide the face, and hide its familiar symmetry.
    rod(-0.148, -0.062, 0.123, 0.030, 0.012, 0.60, SEAM, 0.05, -0.045);
    rod(0.129, -0.141, 0.128, 0.019, 0.046, 0.72, CLOTH, -0.035, 0.12);
    for (const [x, y, h, tilt] of [[-0.042,-0.034,0.049,-0.20],[-0.009,-0.043,0.078,0.13],
      [0.037,-0.019,0.034,0.23],[-0.048,-0.327,0.067,-0.27],[0.014,-0.348,0.047,0.09]])
      rod(x, y, 0.24, 0.011, 0.013, h, TEETH, 0, tilt);
    ell(0.013, 0.015, 0.195, 0.032, 0.071, 0.050, SKIN);
  }));
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.40, 0.95, 0); torso.add(arm); arms.push(arm);
    arm.add(sculpt(mat, (ell, rod) => {
      rod(s * 0.11, -0.34, 0, 0.13, 0.074, 0.78, CLOTH, 0.08, s * 0.25);
      ell(s * 0.21, -0.75, 0.036, 0.09, 0.105, 0.10, SKIN);
      rod(s * 0.19, -1.06, 0.096, 0.072, 0.034, 0.60, SKIN, -0.16, -s * 0.07);
      ell(s * 0.17, -1.35, 0.143, 0.074, 0.115, 0.04, SKIN);
      for (let i = 0; i < 4; i++) rod(s * (0.12 + i * 0.033), -1.50 - i * 0.017, 0.17,
        0.019, 0.007, 0.27 + i * 0.014, SKIN, -0.19, s * (i - 1.5) * 0.055);
    }));
  }
  const rope = sculpt(mat, (_ell, rod) => rod(0, 0.5, 0, 0.018, 0.020, 1, SEAM));
  rope.visible = false; root.add(rope);
  return { root, hips, torso, head, arms, rope, x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0,
    yaw: 0, baseYaw: 0, face: 0, prevFace: 0, fold: 0, prevFold: 0, scale: 1,
    floor: 0, ceiling: 0, active: false, phase: 0,
    interior:true,def:RESIDENT_DEF,species:'interior-resident',pos:new THREE.Vector3(),
    hp:150,alive:true,dead:false,deathT:0,searched:false,attackT:-1,cooldown:0,index };
}

export class InteriorHorror {
  static id = 'interior-horror';

  constructor(ctx) {
    this.ctx = ctx; this.enabled = true; this.clock = 0; this.active = null;
    this.cooldown = 0; this.events = []; this.actors = [];
    this.stats = { started: 0, payoffs: 0, shots: 0, protected: 0, blockedSight: 0, blockedRush: 0 };
  }

  async init() {
    this.rng = this.ctx.rng.fork('interior-horror');
    this.root = new THREE.Group(); this.root.name = 'interior-horror'; this.ctx.scene.add(this.root);
    this.mat = makeShell(1, 1, 1); this.mat.name = 'interior-resident-cloth';
    for (let i = 0; i < POOL; i++) { const a = residentRig(this.mat, i); this.actors.push(a); this.root.add(a.root); }
    const places = this.ctx.systems.get('places');
    for (const def of INTERIOR_ENCOUNTERS) {
      const site = places.nodes.get(def.site); if (!site) throw new Error('interior-horror: missing ' + def.site);
      this.events.push({ def, site, spent: false, away: 0, last: -REARM, dwell: 0,
        stage: 'dormant', t: 0, seen: 0, notSeen: 0, sounded: 0, rushed: false });
    }
    this._offRespawn = this.ctx.bus.on('player:respawn', () => this._finish());
    this.ctx.shared.interiorHorror = false;
  }

  ready() { return this.events.length === INTERIOR_ENCOUNTERS.length && this.actors.length === POOL; }
  _sys(id) { return this.ctx.systems.get(id); }

  _world(e, x, y, z, out) {
    const r = e.site, c = Math.cos(r.yaw), s = Math.sin(r.yaw);
    out.x = r.def.x + x * c + z * s; out.z = r.def.z - x * s + z * c;
    out.y = r.padY + y;
    if (e.def.terrain) out.y = this._sys('terrain').heightAt(out.x, out.z) + y;
    return out;
  }

  _inside(e, p) {
    const r = e.site, z = e.def.zone, c = Math.cos(r.yaw), s = Math.sin(r.yaw);
    const dx = p.x - r.def.x, dz = p.z - r.def.z;
    const lx = dx * c - dz * s - z[0], lz = dx * s + dz * c - z[1];
    const cy = Math.cos(z[4] || 0), sy = Math.sin(z[4] || 0);
    const x = lx * cy - lz * sy, zz = lx * sy + lz * cy;
    const floor = e.def.terrain ? this._sys('terrain').heightAt(p.x, p.z) : r.padY;
    return Math.abs(x) < z[2] * 0.5 && Math.abs(zz) < z[3] * 0.5 && Math.abs(p.y - floor - e.def.y) < 1.15;
  }

  _protected(p) {
    const refuge = this._sys('refuge');
    return refuge.isResting() || refuge.isProtected(p.x, p.y, p.z);
  }

  _busy(p) {
    if (this._sys('director').permit().huntNear) return true;
    for (const boss of this._sys('kneeler').all) {
      if (boss.alive && boss.state !== 'dormant' && boss.state !== 'kneel' && boss.state !== 'return'
        && Math.hypot(p.x - boss.pos.x, p.z - boss.pos.z) < 36) return true;
    }
    return false;
  }

  _visible(a, p, cone = 0.65) {
    const cam = this._sys('camera'), eye = p.y + CFG.player.EYE;
    const crouch = 1 - clamp01((a.fold - 0.7) / 0.6) * 0.42;
    const forward = 1.4 * Math.sin(a.fold * 1.26) * a.scale;
    const tx = a.x + Math.sin(a.baseYaw) * forward, tz = a.z + Math.cos(a.baseYaw) * forward;
    const targetY = a.y + a.scale * (1.18 + 1.4 * Math.cos(a.fold * 1.26)) * crouch;
    const dx = tx - p.x, dy = targetY - eye, dz = tz - p.z;
    const d = Math.hypot(dx, dy, dz); if (d < 0.001 || d > 26) return false;
    const pitch = cam.pitch || 0, cp = Math.cos(pitch);
    const dot = (-Math.sin(cam.yaw) * cp * dx + Math.sin(pitch) * dy - Math.cos(cam.yaw) * cp * dz) / d;
    if (dot < cone) return false;
    const clear = this._sys('collision').segmentClear(p.x, eye, p.z, tx, targetY, tz);
    if (!clear) this.stats.blockedSight++;
    return clear;
  }

  _stage(e) {
    this.active = e; e.stage = 'waiting'; e.t = 0; e.dwell = 0; e.seen = 0; e.notSeen = 0; e.sounded = 0; e.rushed = false;
    const d = e.def, seats = d.seats;
    for (let i = 0; i < POOL; i++) {
      const a = this.actors[i],killed=this._sys('progress').flag('interior-killed:'+e.def.id)||0;
      a.active = i < (seats ? seats.length : 1) && !(killed & (1<<i)); a.root.visible = a.active;
      if (!a.active) continue;
      a.hp=RESIDENT_DEF.hp;a.alive=true;a.dead=false;a.deathT=0;a.searched=false;a.attackT=-1;a.cooldown=0;
      a.encounter=e.def.id;a.index=i;
      const seat = seats ? seats[i] : [0, 0];
      this._world(e, d.x + seat[0], d.y, d.z + seat[1], _origin);
      a.floor = _origin.y; a.x = a.px = _origin.x; a.z = a.pz = _origin.z;
      a.scale = d.scale || (seats ? 0.88 + i * 0.026 : 1);
      a.y = a.py = a.floor + (d.kind === 'suspended' ? 1.55 : 0);
      a.ceiling = a.floor + (d.ceiling || 0); a.yaw = a.baseYaw = e.site.yaw + d.yaw;
      a.face = a.prevFace = 0; a.fold = a.prevFold = seats ? 1.04 : 0.83;
      a.phase = this.rng.range(0, 6.28); a.rope.visible = d.kind === 'suspended';
      a.pos.set(a.x,a.y,a.z);
    }
    this.present(1);
  }

  _say(kind, a, gain = 0.6) { this._sys('dread').answer(kind, a.x, a.y + 1.6, a.z, gain); }

  _begin(e) {
    e.stage = 'listening'; e.t = 0; e.last = this.clock; this.stats.started++;
    this.ctx.shared.interiorHorror = true;
    this._say(e.def.kind === 'suspended' ? 'branch' : 'door', this.actors[0], 0.53);
    this._sys('dread').hush(4.0, this.actors[0].x, this.actors[0].z);
    this.ctx.bus.emit('interior:beat', { id: e.def.id, site: e.def.site, kind: e.def.kind, phase: 'build' });
  }

  _payoff(e) {
    e.stage = 'turning'; e.t = 0; this.stats.payoffs++;
    const a = this.actors[0];
    this._say(e.def.kind === 'suspended' ? 'drop-impact' : 'witnessed', a, 0.80);
    this.ctx.bus.emit('dread:stinger', { kind: 'interior-' + e.def.kind });
    this.ctx.bus.emit('interior:beat', { id: e.def.id, site: e.def.site, kind: e.def.kind, phase: 'payoff' });
  }

  _finish(spent = true) {
    const e = this.active;
    if (e) {
      if (spent && e.stage !== 'waiting') { e.spent = true; e.last = this.clock; this.cooldown = GLOBAL_GAP; }
      e.stage = 'dormant'; e.away = 0;
    }
    for (const a of this.actors) { a.root.visible = false; a.active = false; }
    this.active = null; this.ctx.shared.interiorHorror = false;
  }

  _rush(a, p, dt) {
    const dx = p.x - a.x, dz = p.z - a.z, dist = Math.hypot(dx, dz);
    if (dist < 1.55) return;
    const amount = Math.min(dist - 1.55, dt * 4.8);
    const col = this._sys('collision');
    // Three parallel rays cover shoulders and knees. Never sprint a silhouette through a
    // pew, a sealed door, or a wall merely because the centre ray happened to be clear.
    const base=Math.atan2(dx,dz),side=a.steerSide||1;
    for(const turn of [0,side*.55,-side*.55,side*1.05,-side*1.05,side*1.5,-side*1.5]){
      const vx=Math.sin(base+turn),vz=Math.cos(base+turn),look=Math.min(dist-.9,Math.max(amount,.68));
      let clear=true;
      for(const offset of [-.32,0,.32]){
        const sx=vz*offset,sz=-vx*offset;
        for(const h of [.64,1.85*a.scale])if(!col.segmentClear(a.x+sx,a.floor+h,a.z+sz,
          a.x+sx+vx*look,a.floor+h,a.z+sz+vz*look)){clear=false;break;}
        if(!clear)break;
      }
      if(clear){a.x+=vx*amount;a.z+=vz*amount;if(turn)a.steerSide=Math.sign(turn);return;}
    }
    this.stats.blockedRush++;
  }

  raycast(origin, direction, maxT) {
    if(!this.active)return null;
    _meshRay.set(origin,direction);_meshRay.near=0;_meshRay.far=maxT;
    let best=null;
    for(const a of this.actors){
      if(!a.active||!a.alive)continue;
      a.root.updateMatrixWorld(true);
      const hits=_meshRay.intersectObject(a.root,true);
      const h=hits.find(h=>h.object!==a.rope);
      if(h&&(!best||h.distance<best.t))best={t:h.distance,enemy:a,zone:h.object.parent===a.head?'head':'torso',point:h.point};
    }
    return best;
  }

  damage(a,amount,info={}) {
    if(!a?.active||!a.alive)return{killed:false};
    const e=this.active;a.hp-=Math.max(1,Number.isFinite(amount)?amount:1);this.stats.shots++;
    a.pos.set(a.x,a.y,a.z);
    if(a.hp<=0){
      a.hp=0;a.alive=false;a.dead=true;a.deathT=0;a.deathFold=a.fold;a.attackT=-1;a.rope.visible=false;
      const pr=this._sys('progress'),flag='interior-killed:'+a.encounter;
      pr.flag(flag,(pr.flag(flag)||0)|(1<<a.index));
      this._say('withdraw',a,.60);
      this.ctx.bus.emit('enemy:killed',{e:a,x:a.x,y:a.y+.6,z:a.z,xp:RESIDENT_DEF.xp,species:a.species,owner:'pressure',zone:info.zone,melee:!!info.melee});
      if(!this.actors.some(b=>b.active&&b.alive)){e.stage='remains';e.t=0;e.spent=true;this.ctx.shared.interiorHorror=false;}
      return{killed:true,hpFrac:0,species:a.species};
    }
    if(e.stage==='waiting'||e.stage==='listening'||e.stage==='collapsing'||e.stage==='remains')this._payoff(e);
    a.flinchUntil=this.clock+.15;
    return{killed:false,hpFrac:a.hp/RESIDENT_DEF.hp,species:a.species};
  }

  _combat(dt,p,player) {
    const e=this.active;
    for(const a of this.actors){
      if(!a.active||!a.alive)continue;
      a.fold=0;a.y=a.floor;a.rope.visible=false;
      const dx=p.x-a.x,dz=p.z-a.z,dist=Math.hypot(dx,dz);
      a.face=0;a.baseYaw=Math.atan2(dx,dz);a.cooldown=Math.max(0,a.cooldown-dt);
      if(a.attackT>=0){
        a.attackT+=dt;
        if(a.attackT>=.68){
          // Commit the swing before it lands. Sidestepping it or closing a solid door works.
          if(Math.hypot(p.x-a.strikeX,p.z-a.strikeZ)<1.05&&dist<2.45&&Math.abs(p.y-a.floor)<1.1
            &&this._sys('collision').segmentClear(a.x,a.floor+1.0,a.z,p.x,p.y+1,p.z))player.hurt(RESIDENT_DEF.dmg,{x:dx/(dist||1),y:0,z:dz/(dist||1)});
          a.attackT=-1;a.cooldown=1.8;
        }
      }else if(this.clock>(a.flinchUntil||0)){
        if(dist<2.05&&a.cooldown<=0&&Math.abs(p.y-a.floor)<1.1){a.attackT=0;a.strikeX=p.x;a.strikeZ=p.z;this._say('brush',a,.55);}
        else if(dist>1.8)this._rush(a,p,dt);
      }
      a.pos.set(a.x,a.y,a.z);
    }
    if(!this.actors.some(a=>a.active&&a.alive)){e.stage='remains';e.t=0;}
  }

  step(dt) {
    if (!(dt > 0) || !this.ctx.playing || this.ctx.paused) return;
    this.clock += dt; this.cooldown = Math.max(0, this.cooldown - dt);
    const player = this._sys('player'), p = player.pos;
    if (!this.enabled || player.dead || this.ctx.shared.inCar || this._protected(p)) {
      if (this.active) { this.stats.protected++; this._finish(this.active.stage !== 'waiting'); }
      return;
    }
    for (const e of this.events) {
      const distance = Math.hypot(p.x - e.site.def.x, p.z - e.site.def.z);
      e.away = distance > 80 ? e.away + dt : 0;
      if (e.spent && e.away > 30 && this.clock - e.last > REARM) e.spent = false;
    }
    let e = this.active;
    if (!e) {
      if (this.cooldown > 0) return;
      let best = null, score = Infinity;
      for (const candidate of this.events) {
        if (candidate.spent) continue;
        const mask=(1<<(candidate.def.seats?.length||1))-1;
        if(((this._sys('progress').flag('interior-killed:'+candidate.def.id)||0)&mask)===mask)continue;
        this._world(candidate, candidate.def.x, candidate.def.y, candidate.def.z, _origin);
        const d = Math.hypot(p.x - _origin.x, p.z - _origin.z);
        if (d > 48 || Math.abs(p.y - _origin.y) > 5) continue;
        const s = d + Math.abs(p.y - _origin.y) * 6 - (this._inside(candidate, p) ? 24 : 0);
        if (s < score) { best = candidate; score = s; }
      }
      if (best) this._stage(best);
      return;
    }
    for (const a of this.actors) {
      a.px=a.x;a.py=a.y;a.pz=a.z;a.prevFace=a.face;a.prevFold=a.fold;
      if(a.active&&a.dead){a.deathT+=dt;a.fold=a.deathFold+(1.30-a.deathFold)*clamp01(a.deathT/.6);a.y=a.floor;a.pos.set(a.x,a.y,a.z);}
    }
    const inside = this._inside(e, p), a0 = this.actors[0];
    let watched = false;
    for (const a of this.actors) if (a.active && this._visible(a, p)) watched = true;
    e.notSeen = watched ? 0 : e.notSeen + dt;
    const distance = Math.hypot(p.x - a0.x, p.z - a0.z);
    if (distance > 60 || Math.abs(p.y - a0.floor) > 8) { this._finish(e.stage !== 'waiting'); return; }
    if (e.stage === 'waiting') {
      // Move the pool to another room only out of sight. The body does not change into a
      // different apparition while the player watches it from a stair or a doorway.
      if (!inside && e.notSeen > 4) {
        const other = this.events.find(c => c !== e && !c.spent && this._inside(c, p));
        if (other) { this._finish(false); this._stage(other); return; }
      }
      e.dwell = inside && watched ? e.dwell + dt : Math.max(0, e.dwell - dt * 0.7);
      if (e.dwell > 0.75 && distance < 12
        && !this._busy(p) && this._sys('dread').permitOk()) this._begin(e);
      return;
    }
    e.t += dt;
    if(e.stage==='combat'){this._combat(dt,p,player);return;}
    if (e.stage === 'listening') {
      if (e.t > 0.72 && e.sounded === 0) { this._say('footfall', a0, 0.35); e.sounded = 1; }
      if (e.t > 1.45 && e.sounded === 1) { this._say('mimic', a0, 0.38); e.sounded = 2; }
      // Wait for the player to choose to look. The payoff never burns off behind their back.
      if (e.t > 2.1 && watched) this._payoff(e);
      else if (e.t > 16 || !inside && e.notSeen > 3) this._finish();
      return;
    }
    if (e.stage === 'turning' || e.stage === 'standing') {
      let i = 0;
      for (const a of this.actors) {
        if (!a.active || !a.alive) continue;
        const time = e.t - i * 0.085, k = clamp01(time / 0.34);
        const target = Math.atan2(p.x - a.x, p.z - a.z);
        let delta = target - a.baseYaw;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        a.face = delta * k;
        a.fold = (1 - clamp01((time - 0.20) / 0.74)) * (e.def.seats ? 1.04 : 0.83);
        if (e.def.kind === 'suspended') a.y = a.floor + 1.55 * (1 - clamp01(time / 0.50));
        i++;
      }
      if (e.t > 1.15 && e.stage === 'turning') { e.stage = 'standing'; }
      if (e.t > 1.45 && e.t < 1.94 && inside && e.def.kind !== 'congregation') {
        this._rush(a0, p, dt);
        if (!e.rushed) { e.rushed = true; this._say('brush', a0, 0.68); }
      }
      if (e.t > 1.95) { e.stage='combat';e.t=0; }
      return;
    }
    if (e.stage === 'collapsing') {
      for (const a of this.actors) if (a.active) { a.fold = clamp01(e.t / 0.52) * 1.30; a.y += (a.floor - a.y) * Math.min(1, dt * 9); }
      if (e.t > 0.72) { e.stage = 'remains'; e.t = 0; this.ctx.shared.interiorHorror = false; }
      return;
    }
    if (e.stage === 'remains' && e.t > 3.0 && (!watched && e.notSeen > 0.7 || distance > 25)) this._finish();
  }

  present(alpha = 1) {
    const e = this.active; if (!e) return;
    for (const a of this.actors) {
      if (!a.active) continue;
      const fold = a.prevFold + (a.fold - a.prevFold) * alpha;
      const turn = a.prevFace + (a.face - a.prevFace) * alpha;
      const t = this.clock + alpha / 60;
      a.root.position.set(a.px + (a.x - a.px) * alpha, a.py + (a.y - a.py) * alpha, a.pz + (a.z - a.pz) * alpha);
      a.root.scale.setScalar(a.scale); a.root.rotation.set(0,a.baseYaw,0);
      // A dead body falls all the way onto its side. The old folded standing pose was
      // indistinguishable from the living ambush pose, even after damage was repaired.
      const fall=a.dead?clamp01(a.deathT/.65):0;
      a.root.rotation.z=fall*1.48;
      a.root.position.y+=fall*.27*a.scale;
      a.hips.scale.y = 1 - clamp01((fold - 0.7) / 0.6) * 0.42;
      a.torso.rotation.x = fold * 1.26;
      a.torso.rotation.z = a.dead?0:Math.sin(t * 1.7 + a.phase) * 0.013;
      a.head.rotation.set(-fold * 0.68 - 0.16, turn, a.dead ? .13 : Math.sin(t * 2.1 + a.phase) * 0.025 + 0.13);
      // The shoulders follow the face after it has turned too far. This keeps a face aimed
      // at the player while retaining the impossible first half-second of neck movement.
      a.torso.rotation.y = turn * clamp01(Math.abs(turn) / Math.PI) * 0.54;
      a.head.rotation.y = turn - a.torso.rotation.y;
      for (let i = 0; i < a.arms.length; i++) {
        const swing=a.attackT>=0?(a.attackT<.48 ? -1.65*a.attackT/.48 : -1.65+2.15*(a.attackT-.48)/.20):0;
        a.arms[i].rotation.x = -fold * 0.42 + (e.stage === 'standing' ? -0.34 : 0)+swing;
        a.arms[i].rotation.z = (i ? 1 : -1) * (a.dead?.18:0.09 + Math.sin(t * 2 + i) * 0.012);
      }
      if (a.rope.visible) {
        const attach = 2.65 - fold * 0.66;
        const length = Math.max(0.01, (a.ceiling - a.root.position.y) / a.scale - attach);
        a.rope.position.set(0, attach, -0.08); a.rope.scale.y = length;
        a.rope.visible = !a.dead && (e.stage === 'waiting' || e.stage === 'listening');
      }
    }
  }

  state() {
    return { active: this.active?.def.id || null, stage: this.active?.stage || 'dormant',
      time: this.active?.t || 0, cooldown: this.cooldown, ownsBeat: !!this.ctx.shared.interiorHorror,
      bodies: this.actors.filter(a => a.active).length, stats: { ...this.stats },
      actors: this.actors.filter(a => a.active).map(a => ({ x: a.x, y: a.y, z: a.z, fold: a.fold, face: a.face,hp:a.hp,alive:a.alive,attackT:a.attackT })) };
  }

  // Exact world-space views for a human audit. This reports setup; it never teleports or
  // forces a scary beat. A test can arrive here and use the normal camera/input loop.
  encounters() {
    return this.events.map(e => {
      const at = this._world(e, e.def.x, e.def.y, e.def.z, { x: 0, y: 0, z: 0 });
      const v = e.def.look, view = this._world(e, v[0], v[2], v[1], { x: 0, y: 0, z: 0 });
      return { id: e.def.id, site: e.def.site, kind: e.def.kind, at, view,
        yaw: Math.atan2(-(at.x - view.x), -(at.z - view.z)), spent: e.spent };
    });
  }

  config(patch) { if (typeof patch?.enabled === 'boolean') { this.enabled = patch.enabled; if (!this.enabled) this._finish(false); } }
  reset() { this._finish(false); this.cooldown = 0; for (const e of this.events) { e.spent = false; e.dwell = 0; e.last = -REARM; } }
  dispose() {
    this._offRespawn?.(); this._finish(false); this.root.removeFromParent();
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.mat.dispose();
  }
}

export default InteriorHorror;
