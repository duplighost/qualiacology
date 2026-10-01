import * as THREE from 'three';
const UP=new THREE.Vector3(0,1,0);

// The service lance is a compact, machined tool: a dark ceramic spine,
// insulated grip, replaceable cutting rails and a contained induction core.
// Static pieces are consolidated by material so fine detail does not mean
// dozens of extra draw calls every time the player throws it.
function consolidate(group) {
  group.updateMatrixWorld(true);
  const batches=new Map();
  group.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(geometry);o.geometry.dispose();});
  group.clear();
  for(const [material,geometries] of batches){
    const count=geometries.reduce((n,g)=>n+g.attributes.position.count,0),geometry=new THREE.BufferGeometry();
    for(const [name,size] of [['position',3],['normal',3],['uv',2]]){
      const data=new Float32Array(count*size);let cursor=0;
      for(const g of geometries){if(g.attributes[name])data.set(g.attributes[name].array,cursor*size);cursor+=g.attributes.position.count;}
      geometry.setAttribute(name,new THREE.BufferAttribute(data,size));
    }
    geometry.computeBoundingSphere();group.add(new THREE.Mesh(geometry,material));geometries.forEach(g=>g.dispose());
  }
}
function lanceModel(materials){
  const g=new THREE.Group();
  const surface=(name,opts)=>{const shared=materials?.get(name,opts);if(shared)return shared.clone();const {repeat,...parameters}=opts;return new THREE.MeshStandardMaterial(parameters);};
  const dark=surface('dark',{color:0x172329,metalness:.8,roughness:.39,repeat:[1,3]});
  const steel=surface('steel',{color:0x88999e,metalness:.95,roughness:.29,repeat:[1,2]});
  const ceramic=new THREE.MeshStandardMaterial({color:0x29373c,metalness:.32,roughness:.27});
  const copper=surface('brass',{color:0x967044,metalness:.86,roughness:.34,repeat:1});
  const edge=new THREE.MeshStandardMaterial({color:0xa8babc,metalness:1,roughness:.16});
  const grip=new THREE.MeshStandardMaterial({color:0x101b1c,metalness:.03,roughness:.87});
  const glow=new THREE.MeshStandardMaterial({color:0x409ca5,emissive:0x2db9cf,emissiveIntensity:1.1,metalness:.1,roughness:.2});
  const add=(geometry,material,position=[0,0,0],rotation=[0,0,0])=>{const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.rotation.set(...rotation);g.add(m);return m;};
  const cyl=(r1,r2,len,mat,y,segments=20)=>add(new THREE.CylinderGeometry(r1,r2,len,segments),mat,[0,y,0]);
  cyl(.052,.068,1.36,dark,0);cyl(.077,.08,.48,grip,-.38);
  for(let i=0;i<14;i++)cyl(.082,.081,.012,dark,-.6+i*.034,20);
  for(const y of [-.66,-.11,.3,.64]){cyl(.092,.086,.044,steel,y,12);cyl(.094,.094,.009,copper,y+.02,24);}
  cyl(.055,.055,.35,glow,.47);cyl(.078,.057,.17,ceramic,.7);
  cyl(.064,.082,.16,copper,-.8);cyl(.031,.06,.1,steel,-.92);
  // Closed helical conductor sits behind protective rails.
  const coil=[];for(let i=0;i<=144;i++){const a=i/144*Math.PI*18;coil.push(new THREE.Vector3(Math.cos(a)*.065,.305+i/144*.29,Math.sin(a)*.065));}
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil),144,.008,5,false),copper);
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3,ca=Math.cos(a),sa=Math.sin(a);
    add(new THREE.BoxGeometry(.026,.79,.044),dark,[ca*.082,.38,sa*.082],[0,-a,0]);
    const shape=new THREE.Shape();shape.moveTo(-.05,0);shape.lineTo(.06,.02);shape.lineTo(.075,.15);shape.lineTo(.008,.59);shape.lineTo(-.035,.32);shape.closePath();
    const blade=add(new THREE.ExtrudeGeometry(shape,{depth:.023,bevelEnabled:true,bevelThickness:.006,bevelSize:.009,bevelSegments:2,steps:1}),ceramic,[ca*.043,.75,sa*.043],[0,-a,0]);
    // Two polished cutting strips expose metal only at the working edge.
    const strip=add(new THREE.BoxGeometry(.012,.45,.019),edge,[ca*.043+.024,.995,sa*.043+.02],[0,-a,-.145]);
    strip.position.applyAxisAngle(UP,a*.12);
    for(const y of [-.08,.28,.65])add(new THREE.CylinderGeometry(.016,.016,.025,6),steel,[ca*.101,y,sa*.101],[Math.PI/2,0,Math.PI/2-a]);
    add(new THREE.BoxGeometry(.014,.16,.014),glow,[ca*.081,.1,sa*.081],[0,-a,0]);
    for(let j=0;j<5;j++)add(new THREE.BoxGeometry(.022,.012,.04),copper,[ca*.078,.74+j*.035,sa*.078],[0,-a,0]);
  }
  consolidate(g);g.userData.glow=glow;return g;
}

export class Weapon {
  constructor({scene,camera,player,input,combat,world,effects,audio,materials,onPerfect,onHit,onShake,onMessage}){
    Object.assign(this,{scene,camera,player,input,combat,world,effects,audio,materials,onPerfect,onHit,onShake,onMessage});
    this.state='held';this.position=new THREE.Vector3();this.velocity=new THREE.Vector3();this.origin=new THREE.Vector3();this.prev=new THREE.Vector3();this.aim=new THREE.Vector3();this.hitIds=new Set();
    this.time=0;this.charge=0;this.charged=false;this.distance=0;this.lodgeTime=0;this.catchArmed=0;this.perfectWindow=false;this.perfectBuff=0;this.kick=0;this.catchFlash=0;this.parryCd=0;this.parryKick=0;this.stormReady=false;this.stormPass=false;this.damageScale=1;
    this.projectile=lanceModel(materials);this.projectile.scale.setScalar(.65);scene.add(this.projectile);this.projectile.visible=false;
    this.view=new THREE.Group();camera.add(this.view);const held=lanceModel(materials);held.scale.setScalar(.34);held.rotation.set(.32,0,-.22);held.position.set(.035,-.115,-.16);this.view.add(held);this.heldModel=held;
    this.view.position.set(.43,-.34,-.64);this.view.rotation.set(-.46,.06,-.35);
    const glove=new THREE.MeshStandardMaterial({color:0x24272a,roughness:.74,metalness:.12});
    const armor=new THREE.MeshStandardMaterial({color:0x786c57,roughness:.32,metalness:.74});
    const palm=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.1,4,10),glove);palm.rotation.z=Math.PI/2;palm.position.set(.075,-.25,.07);this.view.add(palm);
    for(let i=0;i<4;i++){const f=new THREE.Mesh(new THREE.CapsuleGeometry(.021,.07,3,6),glove);f.rotation.set(.5,0,.4);f.position.set(.016+i*.037,-.235,.015);this.view.add(f);}
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.075,.115,.52,12),armor);arm.position.set(.23,-.49,.13);arm.rotation.z=.66;this.view.add(arm);
    for(let i=0;i<4;i++){const cuff=new THREE.Mesh(new THREE.TorusGeometry(.078,.012,4,12),glove);cuff.position.set(.105+i*.027,-.30-i*.04,.10);cuff.rotation.set(Math.PI/2,0,-.6);this.view.add(cuff);}
    this.view.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false;}});
  }
  reset(){this.state='held';this.charge=0;this.hitIds=new Set();this.projectile.visible=false;this.view.visible=true;this.catchArmed=0;this.perfectBuff=0;this.parryCd=0;this.parryKick=0;this.kick=0;this.perfectWindow=false;this.stormReady=false;this.stormPass=false;}
  throw(){
    if(this.state!=='held')return;
    this.charged=this.charge>=.98;this.state='outbound';this.distance=0;this.lodgeTime=0;this.hitIds=new Set();this.stormPass=this.stormReady;this.stormReady=false;
    this.player.aim(this.aim);this.player.eye(this.position);this.origin.copy(this.position);
    this.velocity.copy(this.aim).multiplyScalar(this.charged?68:54);this.projectile.position.copy(this.position);this.projectile.visible=true;
    this.kick=.24;this.audio.sfx('throw',null,this.charged?1:.8);this.onShake?.(.09);this.charge=0;
  }
  recall(){
    if(this.state==='held'||this.state==='returning')return;
    this.state='returning';this.hitIds=new Set();this.audio.sfx('recall');
    if(this.player.hasSkill('airpull')&&!this.player.grounded&&this.input.axis().z>0){this.player.velocity.addScaledVector(this.player.aim(),5.5);this.player.velocity.y=Math.max(this.player.velocity.y,1);}
  }
  catch(perfect){
    this.state='held';this.projectile.visible=false;this.charge=0;this.kick=-.14;this.catchFlash=perfect?1:.25;this.perfectWindow=false;this.stormPass=false;
    this.audio.sfx(perfect?'perfect':'catch');this.effects.burst(this.position,perfect?0xffd68a:0x80e6ea,perfect?24:6,perfect?.7:.3);
    if(perfect){this.perfectBuff=1;this.player.health=Math.min(this.player.maxHealth,this.player.health+3);if(this.player.hasSkill('catchdrive'))this.player.dashCd=0;
      if(this.player.hasSkill('pulsecatch')){this.combat.pulse(this.player.position,6,18,{stun:1.2});this.effects.ring(this.player.position,0x83e9ec,6,.45);}
      this.onPerfect?.();}
    this.catchArmed=0;
  }
  parry(){
    if(this.state==='returning')this.catchArmed=.23;
    if(this.parryCd>0)return;
    this.parryCd=.35;this.parryKick=1;this.player.aim(this.aim);
    const count=this.combat.parry(this.player.eye(),this.aim,this.player.hasSkill('returnfire'))||0;
    this.audio.sfx('parry',null,count?1:.35);this.effects.ring(this.player.eye().addScaledVector(this.aim,1),count?0xffd896:0x9be1e4,count?1.4:.5,.2);
    if(count){this.player.invuln=Math.max(this.player.invuln,.18);this.player.dashCd=Math.max(0,this.player.dashCd-.5);this.onMessage?.('RETURN TO SENDER');this.onShake?.(.12);if(this.player.hasSkill('stormchain'))this.stormReady=true;}
  }
  step(dt){
    this.time+=dt;this.parryCd=Math.max(0,this.parryCd-dt);this.catchArmed=Math.max(0,this.catchArmed-dt);this.catchFlash=Math.max(0,this.catchFlash-dt*2);
    if(this.input.pressed('Mouse2')||this.input.pressed('KeyR'))this.recall();
    if(this.input.pressed('KeyE'))this.parry();
    if(this.state==='held'){
      if(this.input.mouse(0)){const before=this.charge;this.charge=Math.min(1,this.charge+dt/0.8);if(before<.98&&this.charge>=.98)this.audio.sfx('charge');}
      if(this.input.pressed('Mouse0:up'))this.throw();
    }else this.input.pressed('Mouse0:up');
    if(this.state==='held')return;
    const target=this.player.eye();this.prev.copy(this.position);
    if(this.state==='outbound'){
      this.position.addScaledVector(this.velocity,dt);this.distance+=this.velocity.length()*dt;
      const blocked=this.world.rayBlocked(this.prev,this.position);
      if(blocked){const end=this.position.clone();let lo=0,hi=1;for(let i=0;i<6;i++){const mid=(lo+hi)*.5;this.position.lerpVectors(this.prev,end,mid);if(this.world.rayBlocked(this.prev,this.position))hi=mid;else lo=mid;}this.position.lerpVectors(this.prev,end,lo);}
      const damage=(this.charged?44:32)*(this.perfectBuff?1.25:1);
      this.damagePass(damage,false);
      if(blocked||this.distance>(this.charged?45:33)){
        this.state='lodged';this.lodgeTime=0;this.effects.burst(this.position,0xffca82,10,.6);this.audio.sfx('impact',this.position,.6);
      }
      this.perfectWindow=false;
    }else if(this.state==='lodged'){
      this.lodgeTime+=dt;if(this.lodgeTime>1.35)this.recall();
    }else if(this.state==='returning'){
      const d=this.position.distanceTo(target);this.perfectWindow=d<10&&d>1;
      if(d<1.45){this.catch(this.catchArmed>0);return;}
      this.velocity.subVectors(target,this.position).normalize().multiplyScalar(Math.min(47,d/dt));this.position.addScaledVector(this.velocity,dt);
      this.damagePass(this.charged?86:42,true);
      if(this.position.distanceTo(target)<1.4){this.catch(this.catchArmed>0);return;}
    }
    this.projectile.position.copy(this.position);if(this.velocity.lengthSq()>.1)this.projectile.quaternion.setFromUnitVectors(UP,this.velocity.clone().normalize());
    this.projectile.rotateY(this.time*dt*2);this.effects.trail(this.prev,this.position,this.state==='returning'?0xffc784:0x70ddea,this.charged?.047:.029,.14);
  }
  damagePass(damage,returning){
    const meta={returning,charged:this.charged,hitIds:this.hitIds,skills:this.player.skillSet};
    const n=this.combat.hitSegment(this.prev,this.position,damage*this.damageScale,meta)||0;
    if(n){this.audio.sfx('hit',this.position);this.effects.burst(this.position,returning?0xffbd71:0x8be9f2,12,.8);this.onHit?.(n,returning);this.onShake?.(.12);this.perfectBuff=0;
      if(this.stormPass){this.combat.pulse(this.position,6,38,{chain:true,hitIds:this.hitIds});this.stormPass=false;}}
    const environmentHits=this.world.hitSegment?.(this.prev,this.position,damage)||[];
    for(const h of environmentHits){this.effects.burst(h.point||this.position,h.color||0xb9d2ce,12,.8);this.audio.sfx('impact',h.point||this.position,.8);}
  }
  render(dt,active){
    this.kick*=Math.exp(-dt*14);this.parryKick*=Math.exp(-dt*10);const held=this.state==='held';this.view.visible=active;
    const target=held?0:-1.1;this.view.position.y=THREE.MathUtils.lerp(this.view.position.y,-.36+target,1-Math.exp(-dt*18));
    const bob=this.player.grounded?Math.sin(this.player.bob)*Math.min(this.player.speed/10,1)*.008:0;
    this.view.position.x=.43+Math.sin(this.time*1.8)*.002;this.view.position.z=-.66+this.kick+this.charge*.075;
    this.view.rotation.set(-.46+this.kick*.65+this.charge*.1+this.parryKick*.45,.06-this.parryKick*.25,-.35+bob-this.player.cameraRoll*.7+this.parryKick*.72);
    this.heldModel.userData.glow.emissiveIntensity=1.0+this.charge*2.3+this.catchFlash*1.8;
  }
}
