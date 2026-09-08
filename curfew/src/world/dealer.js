// A travelling arms seller: a lit counter, displayed stock, a lowered weapon.
// Trading and fighting share the real weapon rays; scenery still occludes every shot.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { dampAngle } from '../engine/math.js';
import CFG from '../config.js';

export const STOCK = Object.freeze([
  { id: 'shotgun', name: 'SHOTGUN', price: 28 },
  { id: 'carbine', name: 'CARBINE', price: 46 },
  { id: 'revolver', name: 'REVOLVER', price: 20 },
]);
const CAMPS = [
  { x: -501, z: 251, yaw: -Math.PI / 2, near: 'filling-station' },
  { x: -421, z: 884, yaw: Math.PI / 2, near: 'avery-house' },
  { x: -796, z: 1423, yaw: Math.PI / 2, near: 'chapel' },
];
const MAX_HP = 540;
const SHOT_COMMIT_S = .70;
const _dir = new THREE.Vector3(), _from = new THREE.Vector3(), _tip = new THREE.Vector3();

function coloured(g, colour, x, y, z, rx = 0, ry = 0, rz = 0) {
  g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z);
  const c = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < c.length; i += 3) c.set(colour, i);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  if(!g.index)return g;
  const flat=g.toNonIndexed();g.dispose();return flat;
}
function merged(parts, mat, name) {
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  const mesh = new THREE.Mesh(g, mat); mesh.name = name; mesh.receiveShadow = true;
  return mesh;
}

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
    this.poseX=0;this.prevPoseX=0;this.poseYaw=0;this.prevPoseYaw=0;this.gunRaise=0;this.prevGunRaise=0;
    this.record = { t: 0, point: new THREE.Vector3(), zone: 'torso', enemy: this.enemy };
    this.bodyId = -1;
    this.bodyShape = {kind:'circle',x:NaN,z:NaN,r:.38,y0:0,y1:0,mask:1,
      tag:'dealer',standable:false,climbable:false,breakable:false};
    this.prompt = { kind: 'hold', label: 'E', rank: 4, x: 0, y: 0, z: 0, k: 0,
      detail: '', subdetail: '', unavailable: false };
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, metalness: .12 });
    this.lampMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffbe69, emissiveIntensity: 2.5 });
    this.mats = [this.mat, this.lampMat];
    this._build();
    this._off = ctx.bus.on('player:respawn', () => {
      if (this.hostile && !this.dead) { this.phase = 'recover'; this.phaseT = 4; }
    });
  }
  _sys(id) { return this.ctx.systems.get(id); }
  _build() {
    const parts = [], face = [], glow = [];
    const wood = [.073, .047, .030], metal = [.05,.06,.065], cloth = [.035,.085,.069];
    const box = (arr,w,h,d,c,x,y,z) => arr.push(coloured(new THREE.BoxGeometry(w,h,d),c,x,y,z));
    // Low deck and a counter open toward the approach. The generous side gaps are exits
    // and fighting cover, not an invisible shop zone.
    // Keep the walkable top at .18; sink the plinth into the level camp pad.
    box(parts,5.6,.24,4.5,wood,0,.06,0);
    box(parts,4.5,.14,.72,wood,0,1.06,.65);
    for (const x of [-2.55,2.55]) for (const z of [-1.95,1.95]) {
      box(parts,.13,2.65,.13,metal,x,1.38,z);
    }
    box(parts,5.9,.12,4.8,cloth,0,2.74,0);
    box(parts,5.6,.35,.09,cloth,0,2.51,2.34);
    // Recognizable pale awning stripes and a weapon rack behind the seller.
    for (let i=-2;i<=2;i++) box(parts,.23,.34,.014,[.19,.18,.12],i*.96,2.51,2.40);
    box(parts,3.8,1.15,.18,wood,0,.7,-1.7);
    for (const x of [-1.85,1.85]) box(parts,.55,.9,.66,metal,x,.62,.67);
    // Three actual gun silhouettes on separate positions of the counter.
    STOCK.forEach((s,i)=>{
      const x=(i-1)*1.35;
      box(parts,.66,.07,.11,metal,x,1.19,.70);
      box(parts,.24,.12,.13,wood,x-.31,1.16,.70);
      box(parts,.035,.035,.29,metal,x+.3,1.19,.70);
      if(s.id==='carbine') box(parts,.13,.2,.08,metal,x,1.10,.69);
    });
    // Boots, separated legs, rounded coat shoulders and a bare, human face.
    box(face,.22,.12,.34,[.019,.02,.019],-.19,.25,0);
    box(face,.22,.12,.34,[.019,.02,.019],.19,.25,0);
    for(const x of [-.19,.19]) face.push(coloured(new THREE.CylinderGeometry(.12,.10,.70,10),[.033,.04,.04],x,.64,-.06));
    face.push(coloured(new THREE.CylinderGeometry(.28,.32,.65,12),cloth,0,1.18,-.05));
    face.push(coloured(new THREE.CapsuleGeometry(.10,.40,4,8),cloth,-.35,1.16,.01,0,0,-.35));
    face.push(coloured(new THREE.SphereGeometry(.165,16,12),[.23,.15,.095],0,1.72,-.03));
    box(face,.32,.09,.29,[.06,.067,.064],0,1.85,-.045);
    box(face,.33,.035,.19,[.06,.067,.064],0,1.805,.12);
    box(face,.19,.065,.055,[.014,.016,.018],0,1.747,.126);
    box(face,.22,.42,.026,[.18,.15,.08],.065,1.20,.253); // canvas work apron
    this.person.add(merged(face,this.mat,'dealer-human'));
    this.arm=new THREE.Group();this.arm.position.set(.32,1.43,0);this.person.add(this.arm);
    this.arm.add(merged([coloured(new THREE.CapsuleGeometry(.09,.36,4,8),cloth,0,-.23,0)],this.mat,'dealer-right-arm'));
    this.rifle=new THREE.Group();this.rifle.position.set(.28,1.24,.24);this.person.add(this.rifle);
    const gun=[];box(gun,.085,.13,.28,metal,0,0,.13);box(gun,.075,.09,.24,wood,0,-.01,-.12);
    box(gun,.085,.15,.10,metal,0,-.1,.15);
    gun.push(coloured(new THREE.CylinderGeometry(.02,.025,.52,14),metal,0,.015,.49,Math.PI/2));
    this.rifle.add(merged(gun,this.mat,'dealer-rifle'));
    this.rifle.rotation.x=1.15;
    this.root.add(merged(parts,this.mat,'dealer-shelter'));
    glow.push(coloured(new THREE.CylinderGeometry(.12,.12,.24,12),[.8,.65,.4],0,2.22,1.3));
    this.root.add(merged(glow,this.lampMat,'dealer-lantern'));
    this.aim = new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),this.lampMat);
    this.aim.name='dealer-weapon-tell'; this.aim.position.set(0,.02,.76); this.aim.visible=false;
    this.rifle.add(this.aim);
  }
  async init() {
    this.ctx.scene.add(this.root);
    const pr=this._sys('progress');
    this.campIndex=Number(pr?.flag('dealer:camp')||0)%CAMPS.length;
    this.dead=!!pr?.flag('dealer:dead'); this.hp=this.dead?0:MAX_HP;
    this._place(this.campIndex);
  }
  ready(){return true;}
  warmup(){
    // Existing Standard vertex-colour and emissive variants are already warmed by the car.
    this.root.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
  }
  _place(index){
    this.campIndex=index; const c=CAMPS[index], terr=this._sys('terrain'), col=this._sys('collision');
    if(this.light){this._sys('lights')?.release(this.light);this.light=null;}
    this.root.position.set(c.x,terr.heightAt(c.x,c.z)+.025,c.z); this.root.rotation.y=c.yaw;
    this.root.updateMatrixWorld(true); this.person.position.set(0,0,-.50);
    this.poseX=this.prevPoseX=0;this.poseYaw=this.prevPoseYaw=0;
    this.pos.set(0,0,-.50).applyMatrix4(this.root.matrixWorld); this.prev.copy(this.pos);
    this.person.visible=!this.dead;
    col?.removeChunk('travelling-arms-dealer');
    col?.removeChunk('travelling-arms-dealer-body');this.bodyId=-1;
    const add=(x,z,hx,hz,y0,y1,tag,standable=false)=>{
      _tip.set(x,0,z).applyMatrix4(this.root.matrixWorld);
      col?.addCollider({kind:'obb',x:_tip.x,z:_tip.z,halfX:hx,halfZ:hz,yaw:c.yaw,
        y0:this.root.position.y+y0,y1:this.root.position.y+y1,tag,standable,breakable:false,authored:true},'travelling-arms-dealer');
    };
    add(0,0,2.8,2.25,-.06,.18,'wood',true);
    add(0,.65,2.25,.36,.18,1.13,'metal');
    add(0,-1.7,1.9,.09,.18,1.28,'wood');
    for(const x of [-2.55,2.55])for(const z of [-1.95,1.95])add(x,z,.075,.075,.18,2.74,'metal');
    this._syncBody();
    this._sys('progress')?.flag('dealer:camp',index);
    this.timer=0;
  }
  _world(x,y,z){return _tip.set(x,y,z).applyMatrix4(this.root.matrixWorld);}
  _syncBody(){
    const col=this._sys('collision');if(!col)return;
    const shape=this.bodyShape;
    if(this.dead){if(this.bodyId>=0)col.removeCollider(this.bodyId);this.bodyId=-1;return;}
    if(this.bodyId>=0&&shape.x===this.pos.x&&shape.z===this.pos.z)return;
    if(this.bodyId>=0)col.removeCollider(this.bodyId);
    shape.x=this.pos.x;shape.z=this.pos.z;shape.y0=this.pos.y+.18;shape.y1=this.pos.y+1.90;
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
    this.prevPoseX=this.poseX;this.prevPoseYaw=this.poseYaw;this.prevGunRaise=this.gunRaise;
    this.root.updateMatrixWorld(true);this.prev.copy(this.pos);
    this.pos.set(this.poseX,0,-.50).applyMatrix4(this.root.matrixWorld);
    const d=Math.hypot(player.pos.x-this.pos.x,player.pos.z-this.pos.z);
    this.root.visible=d<190;
    this.timer+=dt; this.hurtT=Math.max(0,this.hurtT-dt);
    if(d>120&&this.light){this._sys('lights')?.release(this.light);this.light=null;}
    if(this.dead)return;
    if(!this.hostile && this.timer>300 && d>180){this._place((this.campIndex+1+Math.floor(this.rng.next()*2))%CAMPS.length);return;}
    if(d>120){this.hold=0;if(this.light){this._sys('lights')?.release(this.light);this.light=null;}return;}
    // One borrowed light, refreshed only while the camp is near. No new light census.
    if(!this.light||this.light.dead){const l=this._world(0,2.18,1.3);this.light=this._sys('lights')?.borrow('dealer',l.x,l.y,l.z,0xffc886,2.5,0);}
    const aimX=this.phase==='fire'?this.targetX:player.pos.x,aimZ=this.phase==='fire'?this.targetZ:player.pos.z;
    const target=Math.atan2(aimX-this.pos.x,aimZ-this.pos.z)-this.root.rotation.y;
    this.poseYaw=d<55?dampAngle(this.poseYaw,target,3,dt):0;
    if(this.hostile){
      this._fight(dt,player,d);
      this.pos.set(this.poseX,0,-.50).applyMatrix4(this.root.matrixWorld);this._syncBody();
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
    if(player.dead||d>55){this.aim.visible=false;this.phase='recover';this.phaseT=1;return;}
    if(this.phase==='peaceful'){this.phase='aim';this.phaseT=1.3;this._voice('dealer-rack');}
    if(this.phase==='aim'){
      this.aim.visible=true;
      // The muzzle light and a mechanical rack precede every volley. A fixed target
      // lets lateral movement beat it; solid cover always blocks the actual shot.
      if(this.phaseT<=0){
        this.targetX=player.pos.x;this.targetZ=player.pos.z;this.phase='fire';this.phaseT=SHOT_COMMIT_S;this.shot=0;
        // Target lock is audible and the brighter muzzle stops tracking. A .70 s
        // commitment leaves .30 s to react plus .40 s to clear 1.55 m at walking speed.
        this.aim.scale.setScalar(1.7);this._voice('dealer-rack',.45);
      }
    }else if(this.phase==='fire' && this.phaseT<=0){
      this.shot++;this.phaseT=.42;this._voice('dealer-shot',.85);
      if(this._sight(player)&&Math.hypot(player.pos.x-this.targetX,player.pos.z-this.targetZ)<1.55){
        _dir.set(player.pos.x-this.pos.x,0,player.pos.z-this.pos.z).normalize();player.hurt(23,_dir);
      }
      const fx=this._sys('fx');_from.set(this.pos.x,this.pos.y+1.52,this.pos.z);
      _dir.set(this.targetX,this.pos.y+1.2,this.targetZ).sub(_from).normalize();fx?.tracer(_from,_dir,d);
      if(this.shot>=3){this.phase='reload';this.phaseT=this.hp<MAX_HP*.45?1.65:2.4;this.aim.visible=false;this.aim.scale.setScalar(1);this.cycle++;this._voice('dealer-reload',.7);}
    }else if((this.phase==='reload'||this.phase==='recover')&&this.phaseT<=0){
      this.phase='aim';this.phaseT=this.hp<MAX_HP*.45 ? .85 : 1.15;this._voice('dealer-rack',.55);
    }
    // Reload is the clean counterattack window. He stays inside his authored cover.
    const side=this.cycle%2?-.9:.9;
    if(this.phase!=='fire')this.poseX+=(side-this.poseX)*(1-Math.exp(-dt*2.5));
  }
  present(alpha=1){
    if(this.dead)return;
    this.person.position.x=this.prevPoseX+(this.poseX-this.prevPoseX)*alpha;
    const yawDelta=Math.atan2(Math.sin(this.poseYaw-this.prevPoseYaw),Math.cos(this.poseYaw-this.prevPoseYaw));
    this.person.rotation.y=this.prevPoseYaw+yawDelta*alpha;
    const raised=this.prevGunRaise+(this.gunRaise-this.prevGunRaise)*alpha;
    this.rifle.rotation.x=1.15*(1-raised);this.arm.rotation.x=-1.12*raised;
  }
  raycast(origin,dir,maxT){
    if(this.dead||!this.root.visible)return null;
    // Three stacked spheres follow the visible man, including his short cover sidestep.
    let best=maxT,zone='torso';
    for(const [y,r,z] of [[1.73,.20,'head'],[1.25,.38,'torso'],[.60,.30,'torso']]){
      const x=origin.x-this.pos.x,dy=origin.y-this.pos.y-y,dz=origin.z-this.pos.z;
      const b=x*dir.x+dy*dir.y+dz*dir.z,c=x*x+dy*dy+dz*dz-r*r,disc=b*b-c;
      if(disc<0)continue;const t=-b-Math.sqrt(disc);if(t>=0&&t<best){best=t;zone=z;}
    }
    if(best===maxT)return null;
    this.record.t=best;this.record.zone=zone;this.record.point.copy(dir).multiplyScalar(best).add(origin);return this.record;
  }
  damage(enemy,amount,hit){
    if(this.dead||enemy!==this.enemy)return {killed:false};
    this.hostile=true;this.hold=0;
    // Armour has a cost, not invulnerability. Bare head/reload timing reward precision.
    const protection=hit?.zone==='head'||this.phase==='reload'?1:.72;
    this.hp=Math.max(0,this.hp-Math.max(1,Math.round(amount*protection)));this.hurtT=.2;
    if(this.hp===0){
      this.dead=true;this.phase='dead';this.person.rotation.z=-Math.PI/2;this.person.position.y=.1;
      this.aim.visible=false;const pr=this._sys('progress');pr.flag('dealer:dead',true);
      this._syncBody();
      pr.payCash(35,this.pos.x,this.pos.y+.6,this.pos.z,'dealer');pr.award(320,this.pos.x,this.pos.y+.6,this.pos.z,'dealer');
      const gun=STOCK.find(s=>!this._sys('weapons').has(s.id));if(gun)this._grantWeapon(gun.id);
      this.ctx.bus.emit('dealer:defeated',{x:this.pos.x,z:this.pos.z});return {killed:true};
    }
    return {killed:false};
  }
  state(){return {camp:this.campIndex,x:this.pos.x,y:this.pos.y,z:this.pos.z,hp:this.hp,hostile:this.hostile,dead:this.dead,phase:this.phase,stock:STOCK};}
  dispose(){
    this._off?.();if(this.light)this._sys('lights')?.release(this.light);
    this._sys('collision')?.removeChunk('travelling-arms-dealer');
    this._sys('collision')?.removeChunk('travelling-arms-dealer-body');
    this.root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});this.root.removeFromParent();this.mats.forEach(m=>m.dispose());
  }
}
