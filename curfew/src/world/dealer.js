// A travelling arms seller: a lit counter, displayed stock, a lowered weapon.
// Trading and fighting share the real weapon rays; scenery still occludes every shot.
import * as THREE from 'three';
import { buildHuman } from '../art/people.js';
import { readableSurface } from '../art/surface-light.js';
import { buildWorkshop } from './dealer-workshop.js';
import { DEALER_CAMPS as CAMPS } from './dealer-camps.js';
import { dampAngle, Rng } from '../engine/math.js';
import CFG from '../config.js';

// ROUND 18 (Alex: "Things should cost much more"). x6 on the ladder — a revolver was 20
// coins, which is three searched bodies, so the arsenal arrived before the county did.
// The ammo price below is a quarter of the gun's price scaled by how many rounds you are
// short, so it followed on its own.
export const STOCK = Object.freeze([
  { id: 'shotgun', name: 'SHOTGUN', price: 190 },
  { id: 'carbine', name: 'CARBINE', price: 340 },
  { id: 'revolver', name: 'REVOLVER', price: 120 },
]);
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
    this.timer = 0; this.hold = 0; this.locked = false; this.campIndex = 0;
    this.cycle = 0; this.lastTarget = -1; this.hurtT = 0;
    this.poseY=0;this.prevPoseY=0;this.poseX=0;this.prevPoseX=0;this.poseYaw=0;this.prevPoseYaw=0;this.gunRaise=0;this.prevGunRaise=0;
    this.record = { t: 0, point: new THREE.Vector3(), zone: 'torso', enemy: this.enemy };
    this.bodyId = -1;
    this.bodyShape = {kind:'circle',x:NaN,z:NaN,r:.38,y0:0,y1:0,mask:1,
      tag:'dealer',standable:false,climbable:false,breakable:false};
    this.prompt = { kind: 'hold', label: 'E', rank: 4, x: 0, y: 0, z: 0, k: 0,
      detail: '', subdetail: '', unavailable: false };
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, metalness: .12 });
    readableSurface(this.mat);
    this.lampMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffbe69, emissiveIntensity: 2.5 });
    this.mats = [this.mat, this.lampMat];
    this._build();
    this._off = ctx.bus.on('player:respawn', () => {
      if (!this.dead) this.resetEncounter();
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
  }
  resetEncounter(){
    this.hp=MAX_HP;this.hostile=false;this.phase='peaceful';this.phaseT=0;this.shot=0;this.cycle=0;
    this.hold=0;this.locked=false;this.hurtT=0;this.gunRaise=this.prevGunRaise=0;
    this.poseX=this.prevPoseX=this.poseY=this.prevPoseY=this.poseYaw=this.prevPoseYaw=0;
    this.targetX=this.targetZ=undefined;this.aim.visible=false;this.aim.scale.setScalar(1);
    this.person.position.set(0,.18,-.50);this.person.rotation.set(0,0,0);
    this.root.updateMatrixWorld(true);this.pos.set(0,.18,-.50).applyMatrix4(this.root.matrixWorld);this.prev.copy(this.pos);
    this._syncBody();this.human.animate({aim:0,time:this.timer});
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
    this.dead=!!pr?.flag('dealer:dead'); this.hp=this.dead?0:MAX_HP;
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
    if(!this.ctx.playing)return;
    const player=this._sys('player');if(!player)return;
    this.prevPoseY=this.poseY;this.prevPoseX=this.poseX;this.prevPoseYaw=this.poseYaw;this.prevGunRaise=this.gunRaise;
    this.root.updateMatrixWorld(true);this.prev.copy(this.pos);
    this.pos.set(this.poseX,.18+this.poseY,-.50).applyMatrix4(this.root.matrixWorld);
    const d=Math.hypot(player.pos.x-this.pos.x,player.pos.z-this.pos.z);
    this.root.visible=d<190;
    this.timer+=dt; this.hurtT=Math.max(0,this.hurtT-dt);
    this.greetingT=Math.max(0,(this.greetingT||0)-dt);
    if(d>120&&this.light){this._sys('lights')?.release(this.light);this.light=null;}
    if(this.dead)return;
    if(!this.hostile && this.timer>TRAVEL_INTERVAL && d>220){this._place(this._chooseCamp());return;}
    if(d>180){this.hold=0;if(this.light){this._sys('lights')?.release(this.light);this.light=null;}return;}
    // One borrowed light, refreshed only while the camp is near. No new light census.
    if(d<100&&(!this.light||this.light.dead)){const l=this._world(0,2.50,1.65);this.light=this._sys('lights')?.borrow('dealer',l.x,l.y,l.z,0xffc886,7.5,0);}
    if(!this.hostile&&d<17&&!this.greetingT){this._voice('dealer-rack',.22);this.greetingT=90;}
    const aimX=this.phase==='fire'?this.targetX:player.pos.x,aimZ=this.phase==='fire'?this.targetZ:player.pos.z;
    const target=Math.atan2(aimX-this.pos.x,aimZ-this.pos.z)-this.root.rotation.y;
    this.poseYaw=d<180?dampAngle(this.poseYaw,target,3,dt):0;
    if(this.hostile){
      this._fight(dt,player,d);
      this.pos.set(this.poseX,.18+this.poseY,-.50).applyMatrix4(this.root.matrixWorld);this._syncBody();
      this.gunRaise+=(Number(this.phase==='aim'||this.phase==='fire')-this.gunRaise)*(1-Math.exp(-dt*10));return;
    }
    this._trade(dt,player);
  }
  _trade(dt,player){
    const input=this.ctx.input, held=!!input?.held('use');
    if(!held)this.locked=false;
    _from.copy(player.pos);this.root.worldToLocal(_from);
    if(this.ctx.shared.inCar||_from.z<1.13||Math.abs(_from.y) > 2.5){this.hold=0;return;}
    const cam=this._sys('camera'), pr=this._sys('progress'), weapons=this._sys('weapons');
    let chosen=-1,best=2.5;
    for(let i=0;i<STOCK.length;i++){
      const p=this._world((i-1)*1.35,1.18,.95);
      const dx=p.x-player.pos.x,dz=p.z-player.pos.z,d=Math.hypot(dx,dz);
      if(d<best && (-Math.sin(cam.yaw)*dx-Math.cos(cam.yaw)*dz)/Math.max(d,.001)>.66){chosen=i;best=d;}
    }
    if(chosen<0){this.hold=0;this.lastTarget=-1;return;}
    if(chosen!==this.lastTarget){this.hold=0;this.lastTarget=chosen;}
    const s=STOCK[chosen],owned=weapons.has(s.id),cash=pr.cash();
    const bundle=CFG.weapons.defs[s.id].reserve;
    const rounds=owned?Math.max(0,Math.min(bundle,bundle*2-weapons.reserveOf(s.id))):0;
    const full=owned&&rounds===0;
    const price=owned?Math.max(1,Math.ceil(Math.max(6,Math.round(s.price*.25))*rounds/bundle)):s.price;
    const p=this._world((chosen-1)*1.35,1.46,.96);
    Object.assign(this.prompt,{x:p.x,y:p.y,z:p.z,k:this.hold/.85,
      detail:full?`${s.name} · AMMO FULL`:owned?`${s.name} · ${rounds} ROUNDS · ${price} COINS`:`${s.name} · ${price} COINS`,
      subdetail:full?`YOU HAVE ${cash} COINS`:cash<price?`YOU HAVE ${cash} · NEED ${price-cash}`:`YOU HAVE ${cash} · HOLD E TO BUY`,unavailable:full||cash<price});
    this.ctx.bus.emit('prompt',this.prompt);
    if(!held||this.locked||full){this.hold=0;return;}
    this.hold+=dt;
    if(this.hold<.85)return;
    this.hold=0;this.locked=true;
    if(!pr.spendCash(price,'dealer:'+s.id)){this._voice('dealer-rack',.3);return;}
    if(owned)weapons.addReserveTo(s.id,rounds);else this._grantWeapon(s.id);
    this.ctx.bus.emit('dealer:bought',{id:s.id,price,ammo:owned,rounds});
    this._voice('xp_gain',.55);
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
      pr.payCash(150,this.pos.x,this.pos.y+.6,this.pos.z,'dealer');pr.award(320,this.pos.x,this.pos.y+.6,this.pos.z,'dealer');
      const gun=STOCK.find(s=>!this._sys('weapons').has(s.id));if(gun)this._grantWeapon(gun.id);
      this.ctx.bus.emit('dealer:defeated',{x:this.pos.x,z:this.pos.z});return {killed:true};
    }
    return {killed:false};
  }
  state(){return {camp:this.campIndex,near:CAMPS[this.campIndex]?.near,spawnPoints:CAMPS.length,maxHp:MAX_HP,x:this.pos.x,y:this.pos.y,z:this.pos.z,hp:this.hp,hostile:this.hostile,dead:this.dead,phase:this.phase,stock:STOCK};}
  dispose(){
    this._off?.();if(this.light)this._sys('lights')?.release(this.light);
    this._sys('collision')?.removeChunk('travelling-arms-dealer');
    this._sys('collision')?.removeChunk('travelling-arms-dealer-body');
    this.root.traverse(o=>{if(o.isMesh&&!o.userData.sharedHuman)o.geometry.dispose();});this.human.dispose();this.root.removeFromParent();this.mats.forEach(m=>m.dispose());
  }
}
