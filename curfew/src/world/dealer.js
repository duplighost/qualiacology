// A travelling arms seller: a lit counter, displayed stock, a lowered weapon.
// Trading and fighting share the real weapon rays; scenery still occludes every shot.
import * as THREE from 'three';
import { buildHuman } from '../art/people.js';
import { readableSurface } from '../art/surface-light.js';
import { buildWorkshop } from './dealer-workshop.js';
import { DEALER_CAMPS as CAMPS } from './dealer-camps.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { dampAngle, Rng } from '../engine/math.js';
import { ShopMenu } from '../ui/shop-menu.js';
import CFG from '../config.js';

// ROUND 18 (Alex: "Things should cost much more"). x6 on the ladder — a revolver was 20
// coins, which is three searched bodies, so the arsenal arrived before the county did.
// ROUND 22 (Alex: "money buys bulbs and lanterns from the merchant, and the player relights
// the county pole by pole ... you can't punch a bulb into existence"). The bulb is an ITEM,
// not a gun: no ammo, no ownership, a fixed price, a count that goes into your pocket
// (world/dusk-to-dawn.js carries it; progress flag 'd2d:bulbs' remembers it).
// D7. A gun you own reads OWNED and is never sold twice; the per-gun ammo rows are gone.
// ONE AMMUNITION row, a flat price, fills EVERY gun you own by one base bundle each
// (weapons.addReserveAll) — "buying ammo must give an equal amount to every gun you own".
// The four Holdfast counters import this table, so the county sells one list at one price.
export const AMMO_PRICE = 60;   // a bundle for every gun; under the revolver, so it is the first thing a poor night buys
export const STOCK = Object.freeze([
  { id: 'shotgun', name: 'SHOTGUN', price: 190, line: 'Close work. A full reserve comes with it.' },
  { id: 'carbine', name: 'CARBINE', price: 340, line: 'Long work. A full reserve comes with it.' },
  { id: 'revolver', name: 'REVOLVER', price: 120, line: 'Six in the cylinder. A full reserve comes with it.' },
  { id: 'ammo', name: 'AMMUNITION', price: AMMO_PRICE, ammo: true, line: 'One bundle for every gun you own.' },
  { id: 'bulb', name: 'BULB', price: CFG.duskToDawn?.bulbPrice ?? 40, item: true, line: 'A light for one of the county’s roadside poles.' },
]);
// The lines a row wears once it is not for sale. Shared with the Holdfast counters.
export const OWNED_LINE = 'Yours already.';
export const AMMO_FULL_LINE = 'Every gun you own is full.';
// The bulb line carries the count you hold; one string per count, made the first time it is seen.
const _bulbLines = [];
export function bulbLine(n) { n = Math.max(0, n | 0); return _bulbLines[n] || (_bulbLines[n] = 'A light for a roadside pole · ' + n + ' carried.'); }
// Where each row's THING sits, in the camp's local frame, so the menu's look-to-hover has
// something on the counter to look at and the E prompt hangs over it, not over the person.
//   guns  the three displays on the rail (dealer-workshop.js gun((i-1)*1.35, 1.21, .67))
//   bulb  the carton on the right-hand crate (crate(3.13,.65,1.15,1.20,1.32): its top is y 1.38)
//   ammo  a box of rounds at the right end of the leather mat (mat spans x ±2.05, top y 1.13),
//         half a metre clear of the revolver so the gaze can tell them apart
const RAIL = Object.freeze({
  shotgun: { x: -1.35, y: 1.21, z: .67 }, carbine: { x: 0, y: 1.21, z: .67 }, revolver: { x: 1.35, y: 1.21, z: .67 },
  bulb: { x: 3.13, y: 1.38, z: .72 }, ammo: { x: 1.92, y: 1.132, z: .60 },
});
const BULB_AT = RAIL.bulb, AMMO_AT = RAIL.ammo;
// In front of the counter: past its front edge (z 1.13), within reach of the mat, and looking
// at him rather than away — the dealer's old rail cone was the whole "am I at the counter" test.
const COUNTER_REACH = 4.2;   // m from the mat centre: the bulb crate's far corner is 3.9 away, and a step past it still counts
const COUNTER_DOT = .30;     // a wide cone: turning your back on him closes the menu, nothing less
export const MAX_HP = 1500;
export const SHOT_COMMIT_S = .62;
const TRAVEL_INTERVAL = 660;
const _dir = new THREE.Vector3(), _from = new THREE.Vector3(), _tip = new THREE.Vector3();

export class Dealer {
  static id = 'dealer';
  constructor(ctx) {
    this.ctx = ctx; this.rng = ctx.rng.fork('travelling-dealer');
    this.root = new THREE.Group(); this.root.name = 'arms-dealer-camp';
    this.person = new THREE.Group(); this.person.name = 'arms-dealer';
    this.root.add(this.person);
    this.pos = new THREE.Vector3(); this.prev = new THREE.Vector3();
    this.enemy = { pos: this.pos, def: { radius: .38, height: 1.92 }, dealer: true };
    this.hp = MAX_HP; this.hostile = false; this.dead = false;
    this.phase = 'peaceful'; this.phaseT = 0; this.shot = 0;
    this.timer = 0; this.hold = 0; this.campIndex = 0;
    this.cycle = 0; this.hurtT = 0;
    this.poseY=0;this.prevPoseY=0;this.poseX=0;this.prevPoseX=0;this.poseYaw=0;this.prevPoseYaw=0;this.gunRaise=0;this.prevGunRaise=0;
    this.record = { t: 0, point: new THREE.Vector3(), zone: 'torso', enemy: this.enemy };
    this.bodyId = -1;
    this.bodyShape = {kind:'circle',x:NaN,z:NaN,r:.38,y0:0,y1:0,mask:1,
      tag:'dealer',standable:false,climbable:false,breakable:false};
    // D7: the one shop menu draws the list and emits the one E prompt; this.prompt IS its
    // prompt object (rank 4 here), so a reader of dealer.prompt reads what the HUD reads.
    this.menu = new ShopMenu(ctx);
    this.prompt = this.menu.prompt;
    // One row object per STOCK entry, rewritten in place every step at the counter: nothing
    // is allocated while trading. x/y/z are the row's thing on the counter, in world space.
    this.rows = STOCK.map(s => ({ id: s.id, name: s.name, price: s.price, line: s.line, owned: false, full: false,
      unavailable: false, tag: '', note: '', x: 0, y: 0, z: 0, item: !!s.item, ammo: !!s.ammo }));
    this.spec = { key: 'dealer', title: 'Arms & ammunition', rank: 4, cash: 0, x: 0, y: 0, z: 0, offers: this.rows, buy: o => this._buy(o) };
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, metalness: .12 });
    readableSurface(this.mat);
    this.lampMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffbe69, emissiveIntensity: 2.5 });
    this.mats = [this.mat, this.lampMat];
    this._build();
    this._off = ctx.bus.on('player:respawn', () => {
      this.revive();
    });
  }
  _sys(id) { return this.ctx.systems.get(id); }
  _build() {
    this.workshop=buildWorkshop(this.mat,this.lampMat);
    this.root.add(this.workshop.solid,this.workshop.glow);
    this.human=buildHuman('dealer',0,1.92);this.human.group.rotation.y=Math.PI;
    this.person.add(this.human.group);this.rifle=this.human.gun;
    this.aim=new THREE.Mesh(new THREE.SphereGeometry(.038,12,8),this.lampMat);
    this.aim.name='dealer-weapon-tell';this.aim.position.set(0,.025,-.70);this.aim.visible=false;
    this.rifle.add(this.aim);
    this.root.add(this._buildCarton());
  }
  // ROUND 22: a carton of bulbs on the right crate, on the camp's own vertex-coloured
  // Standard material — no new material, no new program. A cardboard box, its lid folded
  // back, four pale bulbs standing in it. D7 adds the AMMUNITION row's thing beside it: an
  // olive box of rounds on the right end of the mat with three brass cases standing on it,
  // so the row has something to look at and the prompt hangs over the box, not the revolver.
  _buildCarton(){
    const parts=[];
    const put=(geo,col,x,y,z)=>{
      const n=geo.attributes.position.count,c=new Float32Array(n*3);
      for(let i=0;i<n;i++){c[i*3]=col[0];c[i*3+1]=col[1];c[i*3+2]=col[2];}
      geo.setAttribute('color',new THREE.BufferAttribute(c,3));geo.translate(x,y,z);parts.push(geo);
    };
    const card=[.20,.152,.098],pale=[.62,.60,.54],olive=[.16,.17,.11],brass=[.42,.33,.14];
    const {x,y,z}=BULB_AT;
    put(new THREE.BoxGeometry(.34,.20,.26),card,x,y+.10,z);
    put(new THREE.BoxGeometry(.34,.012,.13),card,x,y+.21,z-.13+.065);
    for(const [dx,dz] of [[-.08,-.05],[.08,-.05],[-.08,.06],[.08,.06]]){
      put(new THREE.SphereGeometry(.04,8,6),pale,x+dx,y+.24,z+dz);
      put(new THREE.CylinderGeometry(.018,.018,.05,6),[.28,.27,.25],x+dx,y+.20,z+dz);
    }
    const a=AMMO_AT;
    put(new THREE.BoxGeometry(.30,.13,.20),olive,a.x,a.y+.065,a.z);
    put(new THREE.BoxGeometry(.31,.010,.21),[.12,.13,.085],a.x,a.y+.135,a.z);
    for(const dx of [-.07,0,.07])put(new THREE.CylinderGeometry(.011,.011,.055,6),brass,a.x+dx,a.y+.168,a.z+.02);
    const geo=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());
    const m=new THREE.Mesh(geo,this.mat);m.name='dealer-counter-goods';m.castShadow=true;m.receiveShadow=true;
    return m;
  }
  /** How many bulbs he carries: the pole system's count, or the flag when a test has no such system. */
  _bulbsHeld(){
    const d2d=this._sys('dusk-to-dawn');
    if(d2d&&typeof d2d.bulbs==='function')return d2d.bulbs();
    return Math.max(0,Number(this._sys('progress')?.flag('d2d:bulbs'))||0);
  }
  resetEncounter(){
    this.hp=MAX_HP;this.hostile=false;this.phase='peaceful';this.phaseT=0;this.shot=0;this.cycle=0;
    this.hold=0;this.menu.close();this.hurtT=0;this.gunRaise=this.prevGunRaise=0;
    this.poseX=this.prevPoseX=this.poseY=this.prevPoseY=this.poseYaw=this.prevPoseYaw=0;
    this.targetX=this.targetZ=undefined;this.aim.visible=false;this.aim.scale.setScalar(1);
    this.person.position.set(0,.18,-.50);this.person.rotation.set(0,0,0);
    this.root.updateMatrixWorld(true);this.pos.set(0,.18,-.50).applyMatrix4(this.root.matrixWorld);this.prev.copy(this.pos);
    this._syncBody();this.human.animate({aim:0,time:this.timer});
  }
  revive(){
    this.dead=false;this.person.visible=true;this.person.rotation.z=0;
    this._sys('progress')?.flag('dealer:dead',false);this.resetEncounter();
  }
  _chooseCamp(first=false){
    const old=CAMPS[this.campIndex]?.near;
    const player=this._sys('player')?.pos;
    const car=this._sys('car')?.pos;
    const options=CAMPS.map((c,i)=>({c,i})).filter(({c})=>(first?c.near!=='filling-station':c.near!==old&&c.near!==this.lastCampNear)
      &&(!player||Math.hypot(c.x-player.x,c.z-player.z)>240)&&(!car||Math.hypot(c.x-car.x,c.z-car.z)>12));
    return options[Math.floor(this.rng.next()*options.length)].i;
  }
  async init() {
    this.ctx.scene.add(this.root);
    const pr=this._sys('progress');
    let routeSeed=Number(pr?.flag('dealer:route-seed'));
    if(!routeSeed){
      const entropy=new Uint32Array(1);
      if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(entropy);
      routeSeed=entropy[0]||((Date.now()^Math.floor(this.rng.next()*0xffffffff))>>>0)||1;
      pr?.flag('dealer:route-seed',routeSeed);
    }
    this.rng=new Rng(routeSeed);
    const saved=Number(pr?.flag('dealer:camp'));
    this.campIndex=pr?.flag('dealer:route-v2')&&Number.isInteger(saved)&&saved>=0&&saved<CAMPS.length?saved:this._chooseCamp(true);
    pr?.flag('dealer:route-v2',1);
    if(pr?.flag('dealer:dead'))pr.flag('dealer:rewarded',true);
    this.dead=false;pr?.flag('dealer:dead',false); this.hp=MAX_HP;
    this._place(this.campIndex);
  }
  ready(){return true;}
  warmup(){
    // Existing Standard vertex-colour and emissive variants are already warmed by the car.
    this.root.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
  }
  _place(index){
    this.lastCampNear=CAMPS[this.campIndex]?.near;this.campIndex=index; const c=CAMPS[index], terr=this._sys('terrain'), col=this._sys('collision');
    if(this.light){this._sys('lights')?.release(this.light);this.light=null;}
    let high=terr.heightAt(c.x,c.z);const cy=Math.cos(c.yaw),sy=Math.sin(c.yaw);
    for(let x=-4.1;x<=4.2;x+=1.025)for(let z=-3.6;z<=3.95;z+=.75)
      high=Math.max(high,terr.heightAt(c.x+x*cy+z*sy,c.z-x*sy+z*cy));
    this.root.position.set(c.x,high-.04,c.z); this.root.rotation.y=c.yaw;
    this.root.updateMatrixWorld(true); this.person.position.set(0,.18,-.50);
    this.poseY=this.prevPoseY=0;this.poseX=this.prevPoseX=0;this.poseYaw=this.prevPoseYaw=0;
    this.pos.set(0,.18,-.50).applyMatrix4(this.root.matrixWorld); this.prev.copy(this.pos);
    this.person.visible=!this.dead;
    col?.removeChunk('travelling-arms-dealer');
    col?.removeChunk('travelling-arms-dealer-body');this.bodyId=-1;
    const add=(x,z,hx,hz,y0,y1,tag,standable=false)=>{
      _tip.set(x,0,z).applyMatrix4(this.root.matrixWorld);
      col?.addCollider({kind:'obb',x:_tip.x,z:_tip.z,halfX:hx,halfZ:hz,yaw:c.yaw,
        y0:this.root.position.y+y0,y1:this.root.position.y+y1,tag,standable,breakable:false,authored:true},'travelling-arms-dealer');
    };
    for(const c of this.workshop.colliders)add(c.x,c.z,c.hx,c.hz,c.y0,c.y1,c.tag,c.standable);
    this._syncBody();
    this._sys('progress')?.flag('dealer:camp',index);
    this.timer=0;
  }
  _world(x,y,z){return _tip.set(x,y,z).applyMatrix4(this.root.matrixWorld);}
  _syncBody(){
    const col=this._sys('collision');if(!col)return;
    const shape=this.bodyShape;
    if(this.dead){if(this.bodyId>=0)col.removeCollider(this.bodyId);this.bodyId=-1;return;}
    if(this.bodyId>=0&&shape.x===this.pos.x&&shape.z===this.pos.z&&shape.y0===this.pos.y)return;
    if(this.bodyId>=0)col.removeCollider(this.bodyId);
    shape.x=this.pos.x;shape.z=this.pos.z;shape.y0=this.pos.y;shape.y1=this.pos.y+1.92;
    // Movement only: the actual flesh ray zones own shots, and his own body must
    // never block a sight ray leaving his muzzle.
    shape.mask=col.MASK?.SOLID||1;
    this.bodyId=col.addCollider(shape,'travelling-arms-dealer-body');
  }
  _grantWeapon(id){
    this._sys('weapons').reward(id);
    this._sys('progress').flag('dealer:weapon:'+id,true);
  }
  _voice(name,gain=.7){
    const audio=this._sys('audio'); if(!audio)return;
    if(name.startsWith('dealer-')){audio.dread(name,this.pos.x,this.pos.y+1.5,this.pos.z,gain);return;}
    if(!audio.has(name))return;
    const s=audio.spec();s.gain=gain;s.ref=10;s.cls=this.hostile?'threat':'world';s.bus='world';s.propagate=false;
    audio.playAt(name,this.pos.x,this.pos.y+1.5,this.pos.z,s);
  }
  _sight(player){
    _from.set(this.pos.x,this.pos.y+1.53,this.pos.z);
    _dir.set(player.pos.x,player.pos.y+1.20,player.pos.z).sub(_from);
    const d=_dir.length(); _dir.multiplyScalar(1/Math.max(d,.001));
    const col=this._sys('collision'); const h=col?.raycast(_from,_dir,Math.max(.1,d-.5),(col.MASK?.SIGHT||4)|(col.MASK?.GROUND||8));
    return !(h&&h.hit!==false);
  }
  step(dt){
    if(!this.ctx.playing){this.menu.close();return;}
    const player=this._sys('player');if(!player){this.menu.close();return;}
    this.prevPoseY=this.poseY;this.prevPoseX=this.poseX;this.prevPoseYaw=this.poseYaw;this.prevGunRaise=this.gunRaise;
    this.root.updateMatrixWorld(true);this.prev.copy(this.pos);
    this.pos.set(this.poseX,.18+this.poseY,-.50).applyMatrix4(this.root.matrixWorld);
    const d=Math.hypot(player.pos.x-this.pos.x,player.pos.z-this.pos.z);
    this.root.visible=d<190;
    this.timer+=dt; this.hurtT=Math.max(0,this.hurtT-dt);
    this.greetingT=Math.max(0,(this.greetingT||0)-dt);
    if(d>120&&this.light){this._sys('lights')?.release(this.light);this.light=null;}
    if((this.dead||this.hostile)&&d>220){this.revive();return;}
    if(this.dead){this.menu.close();return;}
    if(!this.hostile && this.timer>TRAVEL_INTERVAL && d>220){this.menu.close();this._place(this._chooseCamp());return;}
    if(d>180){this.hold=0;this.menu.close();if(this.light){this._sys('lights')?.release(this.light);this.light=null;}return;}
    // One borrowed light, refreshed only while the camp is near. No new light census.
    if(d<100&&(!this.light||this.light.dead)){const l=this._world(0,2.50,1.65);this.light=this._sys('lights')?.borrow('dealer',l.x,l.y,l.z,0xffc886,7.5,0);}
    if(!this.hostile&&d<17&&!this.greetingT){this._voice('dealer-rack',.22);this.greetingT=90;}
    const aimX=this.phase==='fire'?this.targetX:player.pos.x,aimZ=this.phase==='fire'?this.targetZ:player.pos.z;
    const target=Math.atan2(aimX-this.pos.x,aimZ-this.pos.z)-this.root.rotation.y;
    this.poseYaw=d<180?dampAngle(this.poseYaw,target,3,dt):0;
    if(this.hostile){
      this.menu.close();this._fight(dt,player,d);
      this.pos.set(this.poseX,.18+this.poseY,-.50).applyMatrix4(this.root.matrixWorld);this._syncBody();
      this.gunRaise+=(Number(this.phase==='aim'||this.phase==='fire')-this.gunRaise)*(1-Math.exp(-dt*10));return;
    }
    this._trade(dt,player);
  }
  /**
   * D7: AT THE COUNTER. In front of it, near the mat, facing him: the one shop menu shows
   * the rail as rows, picks by gaze on the rail (or a digit), and buys on a click or the hold.
   * Money moves in _buy; the purse (progress.spendCash) makes the one sound of spending.
   */
  _trade(dt,player){
    _from.copy(player.pos);this.root.worldToLocal(_from);
    let at=!this.ctx.shared.inCar&&_from.z>=1.13&&Math.abs(_from.y)<=2.5&&Math.hypot(_from.x,_from.z-.65)<=COUNTER_REACH;
    if(at){
      // Looking his way at all keeps the menu; the rail's own cone does the row picking.
      const cam=this._sys('camera'),h=this._world(0,1.62,-.5);
      const dx=h.x-player.pos.x,dz=h.z-player.pos.z,d=Math.hypot(dx,dz)||.001;
      at=cam?(-Math.sin(cam.yaw)*dx-Math.cos(cam.yaw)*dz)/d>COUNTER_DOT:true;
    }
    if(!at){this.menu.close();this.hold=0;return;}
    const pr=this._sys('progress'),weapons=this._sys('weapons');
    this._offers(weapons);
    const spec=this.spec,a=this._world(0,1.62,-.5);
    spec.cash=pr.cash();spec.x=a.x;spec.y=a.y;spec.z=a.z;
    this.menu.show(spec,dt);
    this.hold=this.menu.hold;
  }
  /** Is every gun you own at its reserve ceiling? Then the AMMUNITION row reads FULL. */
  _ammoFull(weapons){
    const owned=weapons?.owned;if(!owned||!owned.length)return false;
    for(let k=0;k<owned.length;k++){const base=CFG.weapons.defs[owned[k]];if(base&&weapons.reserveOf(owned[k])<base.reserve*2)return false;}
    return true;
  }
  /** Rewrite the row objects in place from what he has and what you have. No allocation. */
  _offers(weapons){
    const rows=this.rows;
    for(let i=0;i<rows.length;i++){
      const o=rows[i],s=STOCK[i],p=this._world(RAIL[s.id].x,RAIL[s.id].y,RAIL[s.id].z);
      o.x=p.x;o.y=p.y;o.z=p.z;o.price=s.price;o.unavailable=false;o.tag='';o.note='';
      if(s.item){o.owned=false;o.full=false;o.line=bulbLine(this._bulbsHeld());continue;}
      if(s.ammo){o.owned=false;o.full=this._ammoFull(weapons);o.line=o.full?AMMO_FULL_LINE:s.line;continue;}
      o.owned=!!weapons?.has(s.id);o.full=false;o.line=o.owned?OWNED_LINE:s.line;
    }
  }
  /** One purchase, from the menu, only when the row could be bought and the purse covered it. */
  _buy(o){
    const pr=this._sys('progress'),weapons=this._sys('weapons');
    if(o.item){
      // ROUND 22: the bulb row. Fixed price, no ownership, never full — you can always carry
      // one more. The count is read from the pole system so the line is honest about it.
      if(!pr.spendCash(o.price,'dealer:'+o.id)){this._voice('dealer-rack',.3);return;}
      const d2d=this._sys('dusk-to-dawn'),bulbs=this._bulbsHeld();
      const count=d2d&&typeof d2d.addBulb==='function'?d2d.addBulb(1):pr.flag('d2d:bulbs',bulbs+1);
      this.ctx.bus.emit('dealer:bought',{id:o.id,price:o.price,ammo:false,rounds:0,count});
      return;
    }
    if(o.ammo){
      if(this._ammoFull(weapons))return;
      if(!pr.spendCash(o.price,'dealer:ammo')){this._voice('dealer-rack',.3);return;}
      const rounds=weapons.addReserveAll(1);
      this.ctx.bus.emit('dealer:bought',{id:'ammo',price:o.price,ammo:true,rounds});
      return;
    }
    // Belt and braces under the greyed row: a gun you own is never sold twice.
    if(weapons.has(o.id))return;
    if(!pr.spendCash(o.price,'dealer:'+o.id)){this._voice('dealer-rack',.3);return;}
    this._grantWeapon(o.id);
    this.ctx.bus.emit('dealer:bought',{id:o.id,price:o.price,ammo:false,rounds:0});
  }
  _fight(dt,player,d){
    this.phaseT-=dt;
    if(player.dead||d>180){this.aim.visible=false;this.phase='recover';this.phaseT=1;return;}
    const startAim=(time=.72)=>{this.phase='aim';this.phaseT=time;this.aim.visible=true;this.aim.scale.setScalar(1);this._voice('dealer-rack',.45);};
    if(this.phase==='peaceful')startAim(1.1);
    // A raised stock and a heavy rack warn against rushing the counter. The shove has
    // a full .80-second commitment and is blocked by the same walls as the rifle.
    if(d<2.65&&this.phase==='aim'){
      this.phase='shove';this.phaseT=.80;this.aim.visible=true;this.aim.scale.setScalar(1.8);this._voice('dealer-rack',.65);
    }
    if(this.phase==='aim'&&this.phaseT<=0){
      const v=player.vel;
      this.targetX=player.pos.x+Math.max(-.7,Math.min(.7,(v?.x||0)*.14));
      this.targetZ=player.pos.z+Math.max(-.7,Math.min(.7,(v?.z||0)*.14));
      this.phase='fire';this.phaseT=SHOT_COMMIT_S;
      this.aim.scale.setScalar(1.7);this._voice('dealer-rack',.5);
    }else if(this.phase==='fire'&&this.phaseT<=0){
      this.shot++;this._voice('dealer-shot',.85);
      if(this._sight(player)&&Math.hypot(player.pos.x-this.targetX,player.pos.z-this.targetZ)<1.12){
        _dir.set(player.pos.x-this.pos.x,0,player.pos.z-this.pos.z).normalize();player.hurt(34,_dir);
      }
      _from.set(this.pos.x,this.pos.y+1.42,this.pos.z);
      _dir.set(this.targetX,this.pos.y+1.2,this.targetZ).sub(_from).normalize();this._sys('fx')?.tracer(_from,_dir,d);
      if(this.shot>=4){
        this.phase='reload';this.phaseT=this.hp<MAX_HP*.45?1.55:2.15;this.shot=0;this.cycle++;
        this.aim.visible=false;this._voice('dealer-reload',.7);
      }else startAim(this.hp<MAX_HP*.45?.20:.34);
    }else if(this.phase==='shove'&&this.phaseT<=0){
      if(d<2.80&&this._sight(player)){
        _dir.set(player.pos.x-this.pos.x,0,player.pos.z-this.pos.z).normalize();player.hurt(44,_dir);
      }
      this._voice('dealer-shot',.65);this.phase='recover';this.phaseT=.72;this.aim.visible=false;
    }else if((this.phase==='reload'||this.phase==='recover')&&this.phaseT<=0)startAim(.70);
    // He changes firing position and takes a knee behind the counter to reload. The
    // exposed flanks and reload beat reward moving around his armored front.
    const side=this.cycle%2?-1.80:1.80;
    if(this.phase!=='fire'&&this.phase!=='shove')this.poseX+=(side-this.poseX)*(1-Math.exp(-dt*3.2));
    const crouch=this.phase==='reload'?-.43:0;
    this.poseY+=(crouch-this.poseY)*(1-Math.exp(-dt*9));
  }
  present(alpha=1){
    this.menu.present();
    if(this.dead)return;
    this.person.position.x=this.prevPoseX+(this.poseX-this.prevPoseX)*alpha;
    this.person.position.y=.18+this.prevPoseY+(this.poseY-this.prevPoseY)*alpha;
    const yawDelta=Math.atan2(Math.sin(this.poseYaw-this.prevPoseYaw),Math.cos(this.poseYaw-this.prevPoseYaw));
    this.person.rotation.y=this.prevPoseYaw+yawDelta*alpha;
    const raised=this.prevGunRaise+(this.gunRaise-this.prevGunRaise)*alpha;
    this.human.animate({aim:raised,time:this.timer,coil:this.phase==='shove'?.7:0});
    this.human.telegraph(this.hurtT>0?.8:0);
  }
  raycast(origin,dir,maxT){
    if(this.dead||!this.root.visible)return null;
    let best=maxT,zone='torso';
    const yaw=this.root.rotation.y+this.poseYaw+Math.PI,cy=Math.cos(yaw),sy=Math.sin(yaw);
    for(const z of this.human.zones){
      const wx=this.pos.x+z.x*cy+z.z*sy,wz=this.pos.z-z.x*sy+z.z*cy;
      const x=origin.x-wx,dy=origin.y-this.pos.y-z.y,dz=origin.z-wz;
      const b=x*dir.x+dy*dir.y+dz*dir.z,c=x*x+dy*dy+dz*dz-z.r*z.r,disc=b*b-c;
      if(disc<0)continue;const t=-b-Math.sqrt(disc);if(t>=0&&t<best){best=t;zone=z.zone;}
    }
    if(best===maxT)return null;
    this.record.t=best;this.record.zone=zone;this.record.point.copy(dir).multiplyScalar(best).add(origin);return this.record;
  }
  damage(enemy,amount,hit){
    if(this.dead||enemy!==this.enemy)return {killed:false};
    this.hostile=true;this.hold=0;
    // Armour has a cost, not invulnerability. Bare head/reload timing reward precision.
    const p=this._sys('player'),yaw=this.root.rotation.y+this.poseYaw;
    const dx=(p?.pos.x||this.pos.x)-this.pos.x,dz=(p?.pos.z||this.pos.z)-this.pos.z;
    const flank=(dx*Math.sin(yaw)+dz*Math.cos(yaw))/Math.max(.001,Math.hypot(dx,dz))<.20;
    const exposed=this.phase==='reload'||flank;
    const protection=hit?.zone==='head'?(exposed?1:.55):(exposed?.80:.28);
    this.hp=Math.max(0,this.hp-Math.max(1,Math.round(amount*protection)));this.hurtT=.2;
    if(this.hp===0){
      this.dead=true;this.phase='dead';this.person.rotation.z=-Math.PI/2;this.person.position.y=.1;
      this.aim.visible=false;const pr=this._sys('progress');pr.flag('dealer:dead',true);
      this._syncBody();
      const rewarded=!!pr.flag('dealer:rewarded');
      if(!rewarded){pr.payCash(150,this.pos.x,this.pos.y+.6,this.pos.z,'dealer');pr.award(320,this.pos.x,this.pos.y+.6,this.pos.z,'dealer');pr.flag('dealer:rewarded',true);}
      // The death reward is a GUN he had on the rail; the bulb and ammunition rows are not weapons.
      const gun=STOCK.find(s=>!s.item&&!s.ammo&&!this._sys('weapons').has(s.id));if(gun&&!rewarded)this._grantWeapon(gun.id);
      this.ctx.bus.emit('dealer:defeated',{x:this.pos.x,z:this.pos.z});return {killed:true};
    }
    return {killed:false};
  }
  state(){return {camp:this.campIndex,near:CAMPS[this.campIndex]?.near,spawnPoints:CAMPS.length,maxHp:MAX_HP,x:this.pos.x,y:this.pos.y,z:this.pos.z,hp:this.hp,hostile:this.hostile,dead:this.dead,phase:this.phase,stock:STOCK,bulbs:this._bulbsHeld()};}
  dispose(){
    this._off?.();this.menu.dispose();if(this.light)this._sys('lights')?.release(this.light);
    this._sys('collision')?.removeChunk('travelling-arms-dealer');
    this._sys('collision')?.removeChunk('travelling-arms-dealer-body');
    this.root.traverse(o=>{if(o.isMesh&&!o.userData.sharedHuman)o.geometry.dispose();});this.human.dispose();this.root.removeFromParent();this.mats.forEach(m=>m.dispose());
  }
}
