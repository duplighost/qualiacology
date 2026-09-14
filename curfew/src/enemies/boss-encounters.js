// Eleven encounters share damage geometry, with authored anatomy and attack timelines.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {BOSSES,CRYPT_ROOM} from '../world/boss-catalog.js';
import {buildBossRig,preloadBossSurface} from './boss-bodies.js';
import {BOSS_PACE,buildCryptTraverse,sampleCryptTraverse,orientToSurface} from './boss-locomotion.js';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const V=new THREE.Vector3(),N=new THREE.Vector3(0,1,0),ray=new THREE.Raycaster();
const SURFACE_FORWARD=new THREE.Vector3(),SURFACE_POINT=new THREE.Vector3(),BODY_BOUNDS=new THREE.Box3();
const hit={t:0,enemy:null,zone:'torso',point:new THREE.Vector3(),boss:true};
export function distanceToSegment(x,z,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-ax-dx*t,z-az-dz*t);}
export function hazardContains(h,x,z,jump=0,time=0){
 if(time<(h.delay||0)||time>(h.delay||0)+(h.life??Infinity))return false;
 time-=h.delay||0;
 if(h.kind==='ring'){const r=h.inward?Math.max(0,h.r-time*h.speed):time*h.speed;return jump<.8&&Math.abs(Math.hypot(x-h.x,z-h.z)-r)<h.width;}
 if(jump>(h.height??4.2))return false;
 if(h.kind==='line'){const dx=h.bx-h.x,dz=h.bz-h.z,len=dx*dx+dz*dz,along=((x-h.x)*dx+(z-h.z)*dz)/(len||1),f=h.travel?clamp(time/h.travel,0,1):1;return along>=0&&along<=f&&distanceToSegment(x,z,h.x,h.z,h.x+dx*f,h.z+dz*f)<h.width;}
 if(h.kind==='fan'){const dx=x-h.x,dz=z-h.z,d=Math.hypot(dx,dz);return d<h.r&&(dx*h.dx+dz*h.dz)/(d||1)>h.dot;}
 return Math.hypot(x-h.x,z-h.z)<h.r;
}
function makeVoice(audio,index,kind='dread'){
 const name='encounter-'+kind+'-'+index;if(audio?.has?.(name)||!audio?.actx)return name;
 const sr=22050,seconds=kind==='strike'?1.2:kind==='warn'?1.9:4.2,n=Math.floor(sr*seconds),a=new Float32Array(n);let seed=31917+index*619,brown=0,phase=0;
 const notes=[39,31,74,57,26,108,44,138,34,49,36];
 for(let i=0;i<n;i++){
  const t=i/sr,u=t/seconds;seed=(Math.imul(seed,1664525)+1013904223)|0;const noise=(seed>>>0)/2147483648-1;brown=(brown+noise*.045)/1.045;
  const bend=kind==='warn'?1+u*.3:kind==='strike'?1.4-u*.5:1+.14*Math.sin(t*1.7+index),f=notes[index]*bend;phase+=TAU*f/sr;
  const env=kind==='strike'?Math.min(1,t*70)*Math.exp(-u*4):Math.sin(Math.PI*u)**1.35;
  const throat=Math.sin(phase+Math.sin(phase*.501)*1.7)*.35+Math.sin(phase*1.51)*.14+Math.sin(phase*3.07)*.09;
  let voice=throat+brown*.5;
  if(index===0)voice=throat*.6+Math.sin(phase*.49+Math.sin(t*19)*2)*.24+brown*(.3+.3*Math.sin(t*31)**2);
  if(index===1)voice=throat*.4+Math.sin(phase*.5)*.22+noise*.12*Math.max(0,Math.sin(t*47))**8;
  if(index===2)voice=(Math.sin(phase)+Math.sin(phase*2.756)*.48+Math.sin(phase*5.404)*.22)*.44;
  if(index===3)voice=(Math.sin(phase)+Math.sin(phase*1.189)*.65+Math.sin(phase*1.498)*.7)*(.32+.08*Math.sin(phase*4.7));
  if(index===4)voice=brown*2.3+noise*.16*(.25+.75*Math.sin(t*27)**2)+Math.sin(phase*.5)*.19;
  if(index===5)voice=Math.sin(phase*4.03+Math.sin(phase*.07)*4)*.16+Math.sin(phase*.5)*.26+brown*.5;
  if(index===6)voice=throat*.4+brown*1.3+noise*.13*Math.max(0,Math.sin(t*21))**6;
  if(index===7)voice=(noise*.13+Math.sin(phase*2.01)*.22+Math.sin(phase*.49)*.22)*(.3+.7*Math.sin(t*44)**2);
  if(index===8)voice=throat*.55+brown*1.4*Math.max(.1,Math.sin(t*(kind==='warn'?17+u*29:47)))+Math.sin(phase*3.96)*.10;
  if(index===9)voice=throat*.75+Math.sin(phase*.749)*.22+noise*.16*Math.max(0,Math.sin(t*37))**12;
  if(index===10)voice=Math.sin(phase*.49+Math.sin(phase*.25)*3)*.36+brown*1.5+noise*.14*Math.sin(t*63)**2;
  a[i]=clamp(voice*env*.44,-.8,.8);
 }
 audio.reg(name,[a],sr);return name;
}
function hazardMesh(h,material){let geo;if(h.kind==='ring')geo=new THREE.RingGeometry(Math.max(.01,h.r-h.width),h.r+h.width,80);else if(h.kind==='line')geo=new THREE.PlaneGeometry(1,1);else if(h.kind==='fan')geo=new THREE.CircleGeometry(h.r,48,-Math.PI/2-Math.acos(h.dot),2*Math.acos(h.dot));else geo=new THREE.CircleGeometry(h.r,40);const m=new THREE.Mesh(geo,material);m.rotation.x=-Math.PI/2;m.position.set(h.x,h.y+.18,h.z);
 if(h.kind==='line'){const dx=h.bx-h.x,dz=h.bz-h.z;m.position.x=(h.x+h.bx)/2;m.position.z=(h.z+h.bz)/2;m.scale.set(h.width*2,Math.hypot(dx,dz),1);m.rotation.z=Math.atan2(dx,dz);}if(h.kind==='ring'){h.ringAngles=[];const p=geo.attributes.position;for(let i=0;i<p.count;i++)h.ringAngles.push(Math.atan2(p.getY(i),p.getX(i)));}if(h.kind==='fan')m.rotation.z=Math.atan2(h.dx,h.dz);return m;
}
function floorAnatomy(h,shape){
 // Merged anatomy makes each warning erupt into physical matter, with one draw per hazard.
 const pieces=[],add=(g,x,y,z)=>{g.translate(x,y,z);pieces.push(g);};
 const organic=['sea','tree','mire','crypt','burrow'].includes(shape),count=h.kind==='disc'?5:h.kind==='line'?9:7;
 for(let i=0;i<count;i++){
  const along=(i+.5)/count,half=Math.acos(h.dot||0),a=h.kind==='fan'?Math.atan2(h.dz,h.dx)+(along-.5)*half*1.8:i*2.399,span=h.kind==='line'?Math.hypot(h.bx-h.x,h.bz-h.z):h.r;
  const x=h.kind==='line'?(h.bx-h.x)*along:Math.cos(a)*span*(.25+.55*along),z=h.kind==='line'?(h.bz-h.z)*along:Math.sin(a)*span*(.25+.55*along);
  if(organic){
   const height=shape==='tree'?3.8:shape==='sea'?4.4:2.7;
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,0,z),new THREE.Vector3(x+Math.cos(a)*.4,height*.55,z+Math.sin(a)*.3),new THREE.Vector3(x+Math.cos(a)*1.1,height,z+Math.sin(a)*.7),new THREE.Vector3(x+Math.cos(a)*1.5,height*.72,z+Math.sin(a)*1.1)]);
   pieces.push(new THREE.TubeGeometry(curve,9,shape==='sea'?.26:.16,5,false));
   if(shape==='crypt'||shape==='mire'||shape==='burrow'){add(new THREE.SphereGeometry(.38,7,5),x,height*.68,z);for(let f=0;f<4;f++){const finger=new THREE.ConeGeometry(.1,.85+f*.12,5);finger.rotateZ((f-1.5)*.22);add(finger,x+(f-1.5)*.2,height*.96,z+.1);}}
  }else{
   const height=shape==='furnace'?3.9:shape==='choir'?5.3:shape==='moth'?2.1:2.8;
   const tooth=new THREE.ConeGeometry(shape==='furnace'?.5:.23,height,shape==='moth'?3:5);tooth.rotateZ(Math.sin(a)*.28);add(tooth,x,height*.5,z);
   if(shape==='antler'||shape==='bell')add(new THREE.BoxGeometry(.8,.16,.35),x,1.1,z);
  }
 }
 const geometry=mergeGeometries(pieces);for(const g of pieces)g.dispose();return geometry;
}
export class BossEncounters {
 static id='boss-encounters';
 constructor(ctx){this.ctx=ctx;this.all=[];this.time=0;this.active=null;this.loaded=false;this._voices=new Set();this._colliderTimer=0;}
 _sys(id){return this.ctx.systems.get(id);}
 async init(){const sites=this._sys('boss-sites');if(!sites)return;
  await preloadBossSurface();
  this.group=new THREE.Group();this.group.name='county-encounters';this.ctx.scene.add(this.group);
  for(let i=0;i<BOSSES.length;i++){const def=BOSSES[i],site=sites.sites.find(s=>s.id===def.id),rig=buildBossRig(def);const k={id:def.id,index:i,def:{...def,radius:3,height:rig.anatomy.height},site,rig,encounter:true,species:'encounter',pos:new THREE.Vector3(def.x,site.y,def.z),home:new THREE.Vector3(def.x,site.y,def.z),hp:def.hp,alive:true,dead:false,state:'dormant',stateT:0,age:0,cycle:0,phase:1,weakOpen:false,stagger:0,away:0,dreadT:0,hitFlash:0,hazards:[],pressureHazards:[],pressureT:1.2,pressureCursor:0,comboLeft:0,pendingRupture:false,recoveryDuration:1.1,attack:'',yaw:0,windup:1.8,duration:1.6,hitCooldown:0,chargeStart:null,chargeEnd:null,scar:0,rover:null,gait:0,moveSpeed:0,recoil:0,turn:0,stalkT:0,climbedCycle:-1,surfaceHop:0,surface:'floor',surfaceRoute:null,surfaceNormal:new THREE.Vector3(0,1,0),travelX:0,travelZ:0,ambushed:false};
   rig.root.position.copy(k.pos);rig.root.visible=false;this.group.add(rig.root);this.all.push(k);for(const anchor of site.anchors){anchor.enemy={id:def.id+':anchor:'+anchor.index,encounter:true,anchor:true,boss:k,record:anchor,pos:new THREE.Vector3(anchor.x,anchor.y,anchor.z),def:{radius:.85,height:2},alive:true};}
   this._seat(k);
  }
  // The engine reveals hidden objects for its compile pass. Prime the two material
  // variants used by future warning marks and erupting floor anatomy in that same pass.
  this.prime=new THREE.Group();this.prime.name='encounter-shader-prime';this.prime.visible=false;
  this.prime.add(new THREE.Mesh(new THREE.PlaneGeometry(.01,.01),new THREE.MeshBasicMaterial({color:0xffaaaa,transparent:true,opacity:.1,side:THREE.DoubleSide,depthWrite:false,toneMapped:false})));
  this.prime.add(new THREE.Mesh(new THREE.ConeGeometry(.01,.02,7),new THREE.MeshStandardMaterial({color:0x665649,roughness:.7})));
  this.group.add(this.prime);
  this.off=this.ctx.bus.on('save:loaded',()=>{this.loaded=false;});
  this._makeHUD();if(typeof window!=='undefined'){const api=window.__CURFEW||(window.__CURFEW={});api.bosses={state:()=>this.state(),list:()=>this.all.map(k=>({id:k.id,name:k.def.name,x:k.pos.x,y:k.pos.y,z:k.pos.z,hp:k.hp,state:k.state,weakOpen:k.weakOpen})),zoneWorld:id=>{const k=this.all.find(k=>k.id===id);if(!k)return null;k.rig.root.updateMatrixWorld(true);return k.rig.weak.getWorldPosition(new THREE.Vector3()).toArray();}};}
 }
 _makeHUD(){if(typeof document==='undefined')return;const el=document.createElement('section');el.id='encounter-hud';el.setAttribute('aria-label','Boss encounter');el.style.cssText='position:fixed;top:7%;left:50%;transform:translateX(-50%);width:min(470px,55vw);pointer-events:none;text-align:center;color:#e8d9cf;z-index:32;opacity:0;transition:opacity .6s;font-family:Georgia,serif;text-shadow:0 2px 9px #000';el.innerHTML='<div class="encounter-name" style="font-size:21px;letter-spacing:.1em;margin-bottom:9px"></div><div style="height:4px;background:#19171dcc;box-shadow:0 0 0 1px #85766b55"><div class="encounter-health" style="height:100%;width:100%;background:linear-gradient(90deg,#796579,#cbb6a5);transition:width .18s"></div></div><div class="encounter-state" style="font:10px monospace;letter-spacing:.22em;margin-top:9px;color:#c6afb0"></div>';document.body.append(el);this.hud=el;this.nameEl=el.querySelector('.encounter-name');this.hpEl=el.querySelector('.encounter-health');this.stateEl=el.querySelector('.encounter-state');}
 ready(){return this.all.length===BOSSES.length;}
 _restore(){const pr=this._sys('progress');if(!pr)return;for(const k of this.all){const cleared=pr.bossCleared?.(k.id)||pr.flag('boss:'+k.id);if(cleared){k.hp=0;k.alive=false;k.dead=true;k.state='dead';k.stateT=10;k.scar=1;for(const a of k.site.anchors){a.spent=true;a.enemy.alive=false;}if(k.rover?.inUse)this._sys('lights')?.release?.(k.rover);k.rover=null;this._clearHazards(k);this._unseat(k);}else this._reset(k);}this.loaded=true;}
 _seat(k){const c=this._sys('collision');if(!c)return;this._unseat(k);
  if(k.def.shape==='crypt'&&k.surfaceNormal&&k.surfaceNormal.y<.999){
   BODY_BOUNDS.makeEmpty();for(const x of[-2.25,2.25])for(const y of[0,8])for(const z of[-2.25,2.25])BODY_BOUNDS.expandByPoint(SURFACE_POINT.set(x,y,z).applyQuaternion(k.rig.root.quaternion).add(k.pos));
   const a=BODY_BOUNDS.min,b=BODY_BOUNDS.max;k.collider=c.addCollider({kind:'obb',x:(a.x+b.x)/2,z:(a.z+b.z)/2,hx:(b.x-a.x)/2,hz:(b.z-a.z)/2,y0:a.y,y1:b.y,mask:1,tag:'boss',climbable:false},'boss-body:'+k.id);
  }else k.collider=c.addCollider({kind:'circle',x:k.pos.x,z:k.pos.z,r:k.def.shape==='tree'?3:2.25,y0:k.pos.y,y1:k.pos.y+Math.min(8,k.rig.anatomy.height),mask:1,tag:'boss',climbable:false},'boss-body:'+k.id);
 }
 _unseat(k){if(k.collider!==undefined){this._sys('collision')?.removeChunk('boss-body:'+k.id);k.collider=undefined;}}
 _voice(k,kind='dread',gain=.6){const a=this._sys('audio');if(!a?.spec)return;const name=kind==='death'?'kn_death':kind==='open'?'kn_vent':makeVoice(a,k.index,kind);if(!a.has(name))return;const s=a.spec();s.bus='creatures';s.cls='threat';s.gain=gain;s.ref=kind==='dread'?55:24;s.maxDist=180;s.priority=1;s.rate=kind==='dread'?1:.74+k.index*.033;s.send=.5;s.propagate=false;a.playAt(name,k.pos.x,k.pos.y+4,k.pos.z,s);}
 _wake(k){if(!k.alive||k.state!=='dormant')return;k.state='rising';k.stateT=0;k.weakOpen=false;k.comboLeft=0;k.pressureT=1.25;if(k.def.ambush)this._ambush(k);this._voice(k,'dread',.85);this.ctx.bus.emit('boss:woke',{id:k.id,x:k.pos.x,z:k.pos.z,by:'arrival'});}
 _ambush(k){
  const p=this._sys('player'),car=this._sys('car');if(!p||k.ambushed)return;k.ambushed=true;
  if(this.ctx.shared.inCar&&car?.throwFromEncounter){
   // It erupts under the nose, rather than launching the car remotely from the
   // middle of a field. The arena identity and return/reset point remain fixed.
   k.pos.set(car.x-Math.sin(car.heading)*8,k.site.y,car.z-Math.cos(car.heading)*8);
   const offset=k.pos.clone().sub(k.home);if(offset.length()>40)k.pos.copy(k.home).add(offset.setLength(40));
   k.yaw=Math.atan2(car.x-k.pos.x,car.z-k.pos.z);k.rig.root.rotation.y=k.yaw;k.rig.root.position.copy(k.pos);k.attack='seize';this._seat(k);
   const direction=new THREE.Vector3(car.x-k.home.x,0,car.z-k.home.z);if(direction.length()<3)direction.set(-1,0,.4);direction.normalize();
   car.throwFromEncounter({x:k.home.x,z:k.home.z,dx:direction.x,dz:direction.z,distance:70});
  }
  p.invuln=Math.max(p.invuln||0,3.4);this._sys('fx')?.addTrauma?.(.44);
  this.ctx.bus.emit('boss:eruption',{id:k.id,x:k.pos.x,y:k.pos.y,z:k.pos.z});
 }
 _move(k,dx,dz,dt,speed){
  const len=Math.hypot(dx,dz);if(len<.01){k.moveSpeed=0;return false;}dx/=len;dz/=len;
  const distance=Math.min(len,speed*dt),col=this._sys('collision'),radius=k.def.shape==='crypt'?2.2:2.8;
  let mx=dx,mz=dz,blocked=false;
  for(let trial=0;trial<3;trial++){
   const c=col?.raycast({x:k.pos.x,y:k.site.y+1.5,z:k.pos.z},{x:mx,y:0,z:mz},distance+radius,2);
   if(!c?.hit){blocked=false;break;}blocked=true;
   const sign=(trial===0?1:-1)*(k.index%2?1:-1);mx=-dz*sign;mz=dx*sign;
  }
  if(blocked){k.moveSpeed=0;return false;}
  const x=k.pos.x+mx*distance,z=k.pos.z+mz*distance,homeD=Math.hypot(x-k.home.x,z-k.home.z),limit=k.def.shape==='sea'?13:k.def.ambush?43:28;
  if(homeD>limit){k.moveSpeed=0;return false;}
  k.pos.x=x;k.pos.z=z;k.pos.y=k.site.y;k.rig.root.position.copy(k.pos);k.moveSpeed=distance/Math.max(dt,.001);k.gait+=distance;k.travelX=mx;k.travelZ=mz;
  if(this._colliderTimer<=0)this._seat(k);return true;
 }
 _stalk(k,p,dt){
  const shape=k.def.shape,dx=p.pos.x-k.pos.x,dz=p.pos.z-k.pos.z,d=Math.hypot(dx,dz)||1;
  const pace=BOSS_PACE[shape]||0;
  if(shape==='crypt'&&k.cycle>0&&k.climbedCycle!==k.cycle){
   k.surfaceRoute=buildCryptTraverse(k.pos,k.home,k.surfaceHop||0,p.pos);k.surfaceNormal||=new THREE.Vector3(0,1,0);k.state='climbing';k.stateT=0;k.climbedCycle=k.cycle;k.moveSpeed=0;return;
  }
  const desired=shape==='crypt'?10:shape==='burrow'?11:shape==='moth'?19:shape==='sea'?18:14;
  const close=d>desired+2?1:d<desired-4?-.8:.15,orbit=(k.cycle%2?1:-1)*(shape==='moth'?1:.65);
  const burst=.72+.48*Math.sin(k.stateT*11+k.index)**2;
  this._move(k,dx/d*close-dz/d*orbit,dz/d*close+dx/d*orbit,dt,pace*burst*(1+(k.phase-1)*.16));
  if((k.stateT>(k.phase===1?.55:.35)&&d<desired+4)||k.stateT>(k.phase===1?1.5:1.1)||pace===0)this._beginAttack(k,p);
 }
 _surfaceFacing(k,p){
  if(k.def.shape!=='crypt'||!k.surfaceNormal||k.surfaceNormal.y>.999)return false;
  SURFACE_FORWARD.subVectors(p.pos,k.pos);orientToSurface(k.rig.root,k.surfaceNormal,SURFACE_FORWARD);return true;
 }
 _climb(k,p,dt){
  const route=k.surfaceRoute;if(!route){k.state='stalking';k.stateT=0;return;}
  const before=k.pos.clone(),done=sampleCryptTraverse(route,k.stateT,k.pos,k.surfaceNormal,SURFACE_FORWARD);
  k.rig.root.position.copy(k.pos);orientToSurface(k.rig.root,k.surfaceNormal,SURFACE_FORWARD);
  const travel=before.distanceTo(k.pos);k.moveSpeed=travel/Math.max(dt,.001);k.gait+=travel;k.travelX=0;k.travelZ=1;
  // A surface route never deals contact damage. It ends in a planted warning pose.
  this._seat(k);
  if(done){k.surface=route.surface;k.surfaceHop=(k.surfaceHop||0)+1;k.surfaceRoute=null;k.moveSpeed=0;this._beginAttack(k,p);this._seat(k);}
 }
 _dropHazard(h){h.mesh.removeFromParent();h.mesh.geometry.dispose();h.material.dispose();for(const m of h.spikes||[]){m.removeFromParent();m.geometry.dispose();m.material.dispose();}if(h.lead){h.lead.removeFromParent();h.lead.geometry.dispose();h.lead.material.dispose();}}
 _clearHazards(k,all=true){for(const h of k.hazards)this._dropHazard(h);k.hazards.length=0;if(all){for(const h of k.pressureHazards||[])this._dropHazard(h);k.pressureHazards=[];for(const a of k.site.anchors||[])a.channeling=0;}}
 _reset(k){this._clearHazards(k);k.pos.copy(k.home);k.rig.root.position.copy(k.home);k.rig.body.rotation.set(0,0,0);k.rig.root.rotation.set(0,0,0);k.surface='floor';k.surfaceHop=0;k.surfaceRoute=null;k.surfaceNormal?.set(0,1,0);k.travelX=0;k.travelZ=0;k.hp=k.def.hp;k.alive=true;k.dead=false;k.state='dormant';k.stateT=0;k.cycle=0;k.phase=1;k.weakOpen=false;k.stagger=0;k.away=0;k.scar=0;k.moveSpeed=0;k.gait=0;k.recoil=0;k.climbedCycle=-1;k.comboLeft=0;k.pendingRupture=false;k.pressureT=1.25;k.pressureCursor=0;k.recoveryDuration=1.1;for(const a of k.site.anchors){a.spent=false;a.hp=36;a.channeling=0;a.enemy.alive=true;}this._seat(k);}
 _expose(k,reason='exhausted'){
  if(k.pendingRupture){reason='anchor';k.pendingRupture=false;}
  this._clearHazards(k,reason==='anchor');k.state='recover';k.stateT=0;k.weakOpen=true;k.comboLeft=0;
  const broken=(k.site.anchors||[]).filter(a=>a.spent).length;
  k.recoveryDuration=reason==='anchor'?1.45+broken*.10:reason==='collision'?1.35:1.05+broken*.24-(k.phase-1)*.05;k.openReason=reason;
  k.stagger=reason==='anchor'?k.recoveryDuration:0;if(reason==='anchor')k.pressureT=3.2;
  this._voice(k,'open',.48);this._seat(k);
 }
 _finishAttack(k,p){
  this._clearHazards(k,false);k.comboLeft=Math.max(0,(k.comboLeft||1)-1);
  if(k.comboLeft>0&&!p.dead){this._beginAttack(k,p);return;}
  this._expose(k);
 }
 _hazard(k,data){
  const material=new THREE.MeshBasicMaterial({color:k.def.skin.colors.accent,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
  const h={y:k.site.y,r:4,width:2.4,height:k.def.shape==='choir'?5.6:k.def.shape==='sea'?4.6:4.2,speed:17,inward:false,damage:29,delay:0,life:1.6,hit:false,...data,material};h.mesh=hazardMesh(h,material);this.group.add(h.mesh);h.spikes=[];
  if(h.kind==='disc'&&k.def.shape!=='crypt'&&Math.hypot(h.x-k.home.x,h.z-k.home.z)>43){const floor=this._sys('terrain')?.heightAt?.(h.x,h.z);if(Number.isFinite(floor)){h.y=floor;h.mesh.position.y=floor+.18;}}
  if(h.kind==='ring'){
   const crest=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.65,80,1,true),material.clone());crest.material.opacity=.32;crest.position.set(h.x,h.y+.4,h.z);crest.visible=false;crest.userData.wave=true;this.group.add(crest);h.spikes.push(crest);
  }
  if(h.kind!=='ring'&&!h.bodyOnly){
   const hot=k.def.shape==='furnace'||k.def.shape==='lantern'||k.def.shape==='choir';
   const anatomy=new THREE.Mesh(floorAnatomy(h,k.def.shape),new THREE.MeshStandardMaterial({color:hot?k.def.skin.colors.accent:k.def.shape==='tree'?0x3d2824:0x685750,roughness:hot?.48:.78,emissive:hot?k.def.skin.colors.accent:0x29100d,emissiveIntensity:hot?.6:.13}));
   anatomy.position.set(h.x,h.y-.2,h.z);anatomy.visible=false;this.group.add(anatomy);h.spikes.push(anatomy);
  }
  if(h.sourceX!==undefined){const dx=h.x-h.sourceX,dz=h.z-h.sourceZ;h.lead=new THREE.Mesh(new THREE.PlaneGeometry(.15,Math.hypot(dx,dz)),material.clone());h.lead.rotation.set(-Math.PI/2,0,Math.atan2(dx,dz));h.lead.position.set((h.x+h.sourceX)/2,h.y+.19,(h.z+h.sourceZ)/2);this.group.add(h.lead);}
  if(h.pressure){k.pressureHazards||=[];k.pressureHazards.push(h);}else k.hazards.push(h);return h;
 }
 _beginAttack(k,p){
  this._clearHazards(k,false);
  if(!k.comboLeft){const remaining=(k.site.anchors||[]).filter(a=>!a.spent).length;const base=k.def.ambush||k.phase>1?3:2;k.comboLeft=remaining<2&&!k.pendingRupture?Math.max(1,base-1):base;}
  k.attack=k.def.attacks[k.cycle++%k.def.attacks.length];k.attackFamily='slam';k.moveSpeed=0;k.state='warning';k.stateT=0;k.weakOpen=false;
  const dx=p.pos.x-k.pos.x,dz=p.pos.z-k.pos.z,d=Math.hypot(dx,dz)||1,ux=dx/d,uz=dz/d,phase=k.phase;
  k.yaw=Math.atan2(ux,uz);if(!this._surfaceFacing(k,p))k.rig.root.rotation.set(0,k.yaw,0);k.windup=phase===1?1.85:1.6;k.duration=2.3;k.chargeStart=null;k.chargeEnd=null;
  const disc=(x,z,r=4,delay=0,life=1.25,damage=30)=>this._hazard(k,{kind:'disc',x,z,r,delay,life,damage});
  const line=(angle,length=40,width=2.3,delay=0,life=.65,extra={})=>this._hazard(k,{kind:'line',x:k.pos.x,z:k.pos.z,bx:k.pos.x+Math.sin(angle)*length,bz:k.pos.z+Math.cos(angle)*length,width,delay,life,damage:32,...extra});
  const wave=(delay=0,inward=false,speed=18,width=1.35)=>this._hazard(k,{kind:'ring',x:k.pos.x,z:k.pos.z,r:42,width,speed,inward,delay,life:42/speed,damage:27});
  const fan=(angle=k.yaw,r=18,dot=.02,delay=0)=>{k.attackFamily='sweep';return this._hazard(k,{kind:'fan',x:k.pos.x,z:k.pos.z,dx:Math.sin(angle),dz:Math.cos(angle),r,dot,delay,life:.55,damage:36});};
  const charge=(length=28,width=3.1)=>{
   k.attackFamily='charge';k.windup=phase===1?2.05:1.8;k.duration=1.05;k.chargeStart=k.pos.clone();k.chargeEnd=k.pos.clone().add(new THREE.Vector3(ux*length,0,uz*length));
   const delta=k.chargeEnd.clone().sub(k.home),limit=k.def.ambush?41:27;if(delta.length()>limit)k.chargeEnd.copy(k.home).add(delta.setLength(limit));
   // The warning ends where the body actually ends; only the travelling body hurts.
   this._hazard(k,{kind:'line',x:k.pos.x,z:k.pos.z,bx:k.chargeEnd.x,bz:k.chargeEnd.z,width,damage:38,life:k.duration,bodyOnly:true});
  };
  const orbit=(x,z,count,r,size,delay=0,gap=0)=>{for(let i=0;i<count;i++){if(i===gap)continue;const a=k.yaw+i*TAU/count;disc(x+Math.sin(a)*r,z+Math.cos(a)*r,size,delay,1.5);}};
  switch(k.attack){
   case 'undertow':wave(0,true,16,1.6);if(phase>1)wave(.9,false,19,1.25);k.duration=3.2;break;
   case 'tentacles':orbit(p.pos.x,p.pos.z,7,9,3.2,0,k.cycle%7);disc(p.pos.x,p.pos.z,4.3,.8,1.1,34);k.duration=2.1;break;
   case 'drowned-procession':for(let i=0;i<6;i++)disc(k.pos.x+ux*(7+i*6),k.pos.z+uz*(7+i*6),3.8,i*.22,.9,31);if(phase>1)wave(.55,true,18,1.2);k.duration=3;break;
   case 'root-cage':orbit(p.pos.x,p.pos.z,8,9,3.1,0,k.cycle%8);disc(p.pos.x,p.pos.z,4.4,1,1.3,35);if(phase>1)line(k.yaw,40,1.6,.65,1.2,{travel:.65});k.duration=2.6;break;
   case 'harvest':fan(k.yaw,23,-.12);if(phase>1)fan(k.yaw+Math.PI,21,.25,1.05);k.duration=phase>1?1.8:1.0;break;
   case 'orchard-heartbeat':wave(0,false,16,1.3);wave(1.05,false,19,1.3);if(phase>1)disc(p.pos.x,p.pos.z,4.3,.6,1.1);k.duration=3.5;break;
   case 'funeral-peal':for(let i=0;i<(phase>1?3:2);i++)wave(i*.95,false,19,1.35);k.windup=2.1;k.duration=phase>1?4.3:3.3;break;
   case 'clapper-swing':fan(k.yaw,21,-.1);wave(.7,false,21,1.2);k.duration=2.8;break;
   case 'bell-charge':charge(Math.min(27,d+5),3.5);if(phase>1){const h=wave(1.1,false,18,1.2);h.x=k.chargeEnd.x;h.z=k.chargeEnd.z;h.mesh.position.set(h.x,h.y+.18,h.z);for(const m of h.spikes)m.position.set(h.x,h.y+.4,h.z);k.duration=3.5;}break;
   case 'antiphon':for(let i=0;i<5;i++)line(k.yaw+(i-2)*.29,46,1.55,(i%2)*.85,.65);k.duration=1.8;break;
   case 'choir-cross':for(let i=0;i<4;i++)line(k.yaw+Math.PI/4+i*Math.PI/2,45,2,0,.7);if(phase>1){for(let i=0;i<4;i++)line(k.yaw+i*Math.PI/2,45,1.8,1.05,.7);}k.duration=2;break;
   case 'last-breath':for(let i=0;i<3;i++)line(k.yaw+(i-1)*.35,43,2,i*.6,.7,{travel:.45});if(phase>1)disc(p.pos.x,p.pos.z,4.2,1.3,.8);k.duration=2.4;break;
   case 'kiln-seams':for(let i=0;i<6;i++)line(i*TAU/6+k.cycle*.31,40,2.4,(i%2)*.95,.8,{travel:.45});k.windup=2;k.duration=2.1;break;
   case 'furnace-breath':fan(k.yaw,29,.5);if(phase>1)fan(k.yaw+(k.cycle%2?1:-1)*.85,27,.55,1);k.windup=2;k.duration=2;break;
   case 'ashfall':for(let i=0;i<7;i++){const a=i*2.399+k.yaw;disc(p.pos.x+Math.cos(a)*i*2.8,p.pos.z+Math.sin(a)*i*2.8,3.4,i*.19,.95,34);}k.duration=2.5;break;
   case 'false-lights':for(let i=0;i<5;i++){const a=k.yaw+(i-2)*.38;disc(k.pos.x+Math.sin(a)*22,k.pos.z+Math.cos(a)*22,3.5,(i%2)*.6,1);}line(k.yaw,43,1.7,.85,.75,{travel:.35});k.duration=2;break;
   case 'lantern-rush':charge(Math.min(34,d+9),2.9);break;
   case 'blackout':orbit(k.pos.x,k.pos.z,9,21,3.4,0,k.cycle%9);line(k.yaw,43,2.2,.8,.8);if(phase>1)line(k.yaw+.4,43,1.8,1.4,.65);k.duration=2.4;break;
   case 'bridal-grasp':disc(p.pos.x,p.pos.z,4.7,.4,1.2,34);for(const side of[-1,1])for(let i=0;i<3;i++)disc(p.pos.x-uz*side*8+ux*i*5,p.pos.z+ux*side*8+uz*i*5,2.8,i*.35,1);k.duration=2;break;
   case 'wedding-ring':wave(0,true,14,1.6);disc(k.pos.x,k.pos.z,7,1.75,.9,37);if(phase>1)wave(1.05,false,18,1.15);k.duration=3.5;break;
   case 'veil':fan(k.yaw,27,.48);orbit(p.pos.x,p.pos.z,6,10,3.1,.95,k.cycle%6);k.duration=2.7;break;
   case 'wing-dust':for(const side of[-1,1])for(let i=0;i<3;i++)line(k.yaw+side*(.22+i*.29),44,1.55,(i%2)*.7,.8);k.duration=2;break;
   case 'moonfall':disc(p.pos.x,p.pos.z,6.5,.15,.8,36);wave(.6,false,22,1.2);if(phase>1)orbit(p.pos.x,p.pos.z,7,13,3.4,1.1,k.cycle%7);k.duration=3;break;
   case 'molt':wave(0,false,17,1.25);wave(.65,true,17,1.25);if(phase>1)line(k.yaw,40,1.8,1.3,.8);k.duration=3.3;break;
   case 'rail-charge':charge(Math.min(34,d+8),3.3);break;
   case 'antler-rake':fan(k.yaw,22,-.13);for(const side of[-1,1])line(k.yaw+side*.52,33,1.55,.7,.75,{travel:.6});k.duration=1.7;break;
   case 'derailment':for(const side of[-1,1])line(k.yaw+side*.22,43,2.1,0,1,{travel:.55});disc(p.pos.x,p.pos.z,4.7,1,1,36);if(phase>1)wave(.9,false,19,1.2);k.duration=3.2;break;
   case 'hands':orbit(p.pos.x,p.pos.z,7,8.5,2.8,0,k.cycle%7);disc(p.pos.x,p.pos.z,4.1,.9,1.2,35);k.duration=2.4;break;
   case 'wall-grasp':for(const side of[-1,1]){const startX=k.home.x+side*27;this._hazard(k,{kind:'line',x:startX,z:p.pos.z,bx:k.home.x-side*4,bz:p.pos.z,width:2.4,travel:.85,delay:side>0?.8:0,life:1.2,damage:34});}k.windup=2;k.duration=2.4;break;
   case 'kneeling-supper':for(let i=0;i<5;i++)disc(k.pos.x+ux*(8+i*5),k.pos.z+uz*(8+i*5),3.4,i*.25,1,33);if(phase>1)fan(k.yaw+Math.PI,15,.1,1.2);k.duration=2.5;break;
   case 'furrow':for(let i=0;i<(phase>1?3:2);i++)line(k.yaw+(i-(phase>1?1:.5))*.28,38,1.8,i*.55,.9,{travel:.7});k.duration=2.2;break;
   case 'maw-charge':charge(Math.min(30,d+7),3.3);break;
   case 'earth-split':disc(k.pos.x,k.pos.z,12,0,.75,38);for(let i=0;i<5;i++)line(k.yaw+i*TAU/5,37,1.65,.65,1,{travel:.7});k.windup=2.1;k.duration=2;break;
   default:disc(p.pos.x,p.pos.z,5,0,1.2,30);
  }
  // The last third combines an extra committed hazard with the existing rhythm.
  // Its position is locked now, and its late eruption is visible throughout the warning.
  if(phase===3&&!k.chargeStart){disc(p.pos.x,p.pos.z,3.6,1.55,.85,31);k.duration=Math.max(k.duration,2.65);}
  if(d>40&&d<78&&!k.chargeStart){disc(p.pos.x,p.pos.z,4.6,.8,1.2,30);k.duration=Math.max(k.duration,2.2);}
  k.windup=Math.max(1.1,k.windup-(phase===1?.35:.4));k.chargeDuration=k.chargeStart?1.05:0;
  this._voice(k,'warn',.65);this.ctx.bus.emit('enemy:telegraph',{e:k,kind:k.attackFamily==='charge'?'lunge':'slam',x:k.pos.x,y:k.pos.y+4,z:k.pos.z,rear:false});
 }
 _renderHazard(k,h,t,warning=false){
  const local=t-h.delay,waiting=warning||local<0,active=!warning&&local>=0&&local<=h.life;
  if(active&&!h.sounded){h.sounded=true;if(h.delay>.3)this._voice(k,'strike',.16);}
  const tell=warning?clamp(t/k.windup,0,1):clamp(t/Math.max(.01,h.delay),0,1);
  h.material.opacity=waiting?.13+tell*.28:active?.34*(1-clamp(local/h.life,0,1)*.35):.04;
  h.material.color.setHex(waiting?k.def.skin.colors.accent:0xda8472);h.mesh.visible=waiting||active;
  if(h.lead){h.lead.visible=waiting;h.lead.material.opacity=.12+tell*.3;}
  if(h.kind==='ring'){
   const rr=waiting?(h.inward?h.r:Math.min(4,h.r)):h.inward?Math.max(.01,h.r-local*h.speed):Math.max(.01,local*h.speed);
   const pos=h.mesh.geometry.attributes.position,n=pos.count/2;
   for(let i=0;i<pos.count;i++){const r=Math.max(.01,rr+(i<n?-h.width:h.width)),a=h.ringAngles[i];pos.setXY(i,Math.cos(a)*r,Math.sin(a)*r);}pos.needsUpdate=true;h.mesh.geometry.computeBoundingSphere();
  }
  for(const m of h.spikes){
   if(m.userData.wave){m.visible=active;const r=h.inward?Math.max(.01,h.r-local*h.speed):Math.max(.01,local*h.speed);m.scale.set(r,1,r);m.material.color.copy(h.material.color);continue;}
   m.visible=waiting||active;const rise=active?Math.min(1,local*9)*Math.min(1,(h.life-local)*7):.035+.07*tell;
   m.position.y=h.y-.06;m.scale.y=Math.max(.01,rise);
   if(h.travel){const f=active?clamp(local/h.travel,0,1):1;m.scale.x=f;m.scale.z=f;}
  }
 }
 _hitHazards(k,p,hazards,time){
  if(p.dead||k.hitCooldown>0||Math.abs(p.pos.y-k.site.y)>=12)return;
  for(const h of hazards){
   const t=time===null?h.time:time;let inside=hazardContains(h,p.pos.x,p.pos.z,Math.max(0,p.pos.y-h.y),t);
   if(h.bodyOnly)inside=t<=k.chargeDuration&&Math.abs(p.pos.y-k.pos.y)<4.2&&Math.hypot(p.pos.x-k.pos.x,p.pos.z-k.pos.z)<h.width;
   if(!inside||h.hit)continue;
   let blocked=false;if(h.kind!=='ring'){
    const sx=h.bodyOnly?k.pos.x:h.sourceX??h.x,sz=h.bodyOnly?k.pos.z:h.sourceZ??h.z;
    V.set(p.pos.x-sx,p.pos.y+1-h.y-2,p.pos.z-sz);const len=V.length();
    if(len>1){V.multiplyScalar(1/len);const obstruction=this._sys('collision')?.raycast({x:sx,y:h.y+2,z:sz},V,len,2);blocked=!!obstruction?.hit&&obstruction.t<len-.5;}
   }
   if(blocked)continue;h.hit=true;k.hitCooldown=.82;const old=p.hp;V.set(p.pos.x-h.x,0,p.pos.z-h.z).normalize();p.hurt(h.damage,V);if(p.hp<old)this._sys('fx')?.addTrauma?.(.25);break;
  }
 }
 _advancePressure(k,p,dt){
  k.pressureHazards||=[];const anchors=k.site.anchors||[],live=anchors.filter(a=>!a.spent);
  for(const a of anchors)a.channeling=0;
  k.pressureT=(k.pressureT??1.25)-dt;
  if(k.pressureT<=0&&live.length&&k.stagger<=0){
   const anchor=live[(k.pressureCursor||0)%live.length];k.pressureCursor=(k.pressureCursor||0)+1;
   // The machine anticipates continued movement once, then commits for the entire tell.
   // Reverse direction, release a slow aimed walk, or break its sightline to evade it.
   const vx=clamp(p.vel?.x||0,-9,9),vz=clamp(p.vel?.z||0,-9,9),lead=.88;
   const x=p.pos.x+vx*lead,z=p.pos.z+vz*lead;
   this._hazard(k,{kind:'disc',x,z,r:3.7,delay:1.15,life:.85,damage:32,pressure:true,time:0,anchor:anchor.index,sourceX:anchor.x,sourceZ:anchor.z});
   k.pressureT=live.length===3?2.1-(k.phase-1)*.15:live.length===2?2.85:3.65;
   this._voice(k,'warn',.23);
  }
  for(let i=k.pressureHazards.length-1;i>=0;i--){const h=k.pressureHazards[i];h.time+=dt;
   const anchor=anchors.find(a=>a.index===h.anchor);
   if(anchor?.spent||h.time>h.delay+h.life){this._dropHazard(h);k.pressureHazards.splice(i,1);continue;}
   if(anchor)anchor.channeling=Math.max(anchor.channeling,h.time<h.delay?clamp(h.time/h.delay,.12,1):.65);
   this._renderHazard(k,h,h.time,false);
  }
  this._hitHazards(k,p,k.pressureHazards,null);
 }
 _advanceAttack(k,p,dt){
  const warning=k.state==='warning',t=k.stateT;for(const h of k.hazards)this._renderHazard(k,h,t,warning);
  if(warning){if(t>=k.windup){k.state='striking';k.stateT=0;this._voice(k,'strike',.63);if(Math.hypot(p.pos.x-k.pos.x,p.pos.z-k.pos.z)<35)this._sys('fx')?.addTrauma?.(.18);}return;}
  if(k.chargeStart){
   const f=clamp(t/k.chargeDuration,0,1);V.lerpVectors(k.chargeStart,k.chargeEnd,f*f*(3-2*f));const dx=V.x-k.pos.x,dz=V.z-k.pos.z,travel=Math.hypot(dx,dz);
   const obstacle=travel>.001?this._sys('collision')?.raycast({x:k.pos.x,y:k.pos.y+1.5,z:k.pos.z},{x:dx/travel,y:0,z:dz/travel},travel+2.3,2):null;
   if(obstacle?.hit){this._expose(k,'collision');this._voice(k,'strike',.65);return;}
   k.pos.copy(V);k.rig.root.position.copy(k.pos);k.moveSpeed=travel/Math.max(dt,.001);k.gait+=travel;if(this._colliderTimer<=0)this._seat(k);
  }
  this._hitHazards(k,p,k.hazards,t);
  if(t>=k.duration)this._finishAttack(k,p);
 }
 _die(k){if(!k.alive)return;if(k.rover?.inUse)this._sys('lights')?.release?.(k.rover);k.rover=null;k.hp=0;k.alive=false;k.dead=true;k.state='dying';k.stateT=0;k.weakOpen=false;k.pendingRupture=false;this._clearHazards(k);this._unseat(k);this._voice(k,'death',.7);this._sys('fx')?.addTrauma?.(.22);this._sys('progress')?.completeBoss?.({id:k.id,name:k.def.name,xp:k.def.xp,cash:k.def.cash,finishId:k.def.skin.id,x:k.pos.x,y:k.pos.y,z:k.pos.z});
  // A dead arena stays physically changed: pale hearts go dark and the body remains collapsed.
  for(const a of k.site.anchors){a.spent=true;a.enemy.alive=false;}this.ctx.bus.emit('boss:world-cleared',{id:k.id,x:k.home.x,z:k.home.z});
 }
 damage(enemy,amount,info={}){if(enemy?.anchor){const k=enemy.boss,a=enemy.record;if(a.spent||!k.alive)return {killed:false,hpFrac:0};a.hp-=Math.max(1,amount);this._wake(k);if(a.hp<=0){
   a.spent=true;a.channeling=0;enemy.alive=false;k.hp-=Math.round(k.def.hp*.09);
   // A broken machine loses its attack immediately. Its rupture exposes the boss
   // after the committed chain resolves; rapid breaks share that one opening.
   // Breaking another during recovery cannot rewind the recovery or freeze the hunt.
   k.pendingRupture=true;k.hitFlash=.3;k.recoil=Math.max(k.recoil,.7);
   this._voice(k,'strike',.6);this._sys('fx')?.impact?.('flesh',enemy.pos,N,1.4);if(k.hp<=0)this._die(k);return {killed:false,hpFrac:Math.max(0,k.hp/k.def.hp),species:'encounter'};}return {killed:false,hpFrac:a.hp/36,species:'encounter'};}
  const k=enemy;if(!k?.alive)return {killed:false,hpFrac:0,species:'encounter'};this._wake(k);const vulnerable=info.zone==='heart'&&k.weakOpen;
  // Closed brass, boiler plate and iron resist sustained fire. Organic armour still
  // yields, while a missed heart shot during recovery makes useful progress.
  const closed=['bell','furnace','antler'].includes(k.def.shape)?.10:.14;
  const broken=(k.site.anchors||[]).filter(a=>a.spent).length,heartMultiplier=1.75+broken*.30;
  const dealt=Math.max(1,amount*(vulnerable?heartMultiplier:k.weakOpen?.52:closed));k.hp-=dealt;k.hitFlash=.22;k.recoil=Math.min(1,k.recoil+(vulnerable?.7:.24));if(k.hp<=0){this._die(k);return {killed:true,hpFrac:0,species:'encounter'};}return {killed:false,hpFrac:k.hp/k.def.hp,species:'encounter'};
 }
 raycast(origin,direction,maxT){let best=maxT,owner=null,zone='torso';ray.set(origin,direction);ray.far=maxT;ray.near=0;
  for(const k of this.all){if(!k.alive||!k.rig.root.visible)continue;const ax=k.pos.x-origin.x,az=k.pos.z-origin.z,ay=k.pos.y+5-origin.y,along=ax*direction.x+ay*direction.y+az*direction.z;if(along<-25||along>best+25||ax*ax+ay*ay+az*az-along*along>625)continue;
   k.rig.root.updateMatrixWorld(true);ray.far=best;const hits=ray.intersectObject(k.rig.body,true);if(hits.length&&hits[0].distance<best){const h=hits[0];best=h.distance;owner=k;zone=(h.object===k.rig.weak||h.object.userData.weakTissue)&&k.weakOpen?'heart':'torso';}
  }
  // These are combat-owned targets, so the normal world occlusion stage still wins in front of them.
  for(const k of this.all){if(!k.alive||!k.site.art.visible)continue;for(const a of k.site.anchors){if(a.spent)continue;const x=a.x-origin.x,y=a.y-origin.y,z=a.z-origin.z,t=x*direction.x+y*direction.y+z*direction.z,q=x*x+y*y+z*z-t*t;if(t<0||q>a.r*a.r)continue;const near=t-Math.sqrt(a.r*a.r-q);if(near>=0&&near<best){best=near;owner=a.enemy;zone='anchor';}}}
  if(!owner)return null;hit.t=best;hit.enemy=owner;hit.zone=zone;hit.point.copy(direction).multiplyScalar(best).add(origin);return hit;
 }
 step(dt){if(!this.ctx.ready)return;if(!this.loaded)this._restore();const p=this._sys('player');if(!p?.pos)return;this.time+=dt;this.active=null;this._colliderTimer-=dt;
  for(const k of this.all){k.age+=dt;k.stateT+=dt;k.hitCooldown=Math.max(0,k.hitCooldown-dt);k.hitFlash=Math.max(0,k.hitFlash-dt);k.recoil=Math.max(0,k.recoil-dt*2.5);k.moveSpeed=0;k.stagger=Math.max(0,k.stagger-dt);const d=Math.hypot(p.pos.x-k.home.x,p.pos.z-k.home.z);k.rig.root.visible=d<460;
   if(!k.alive){if(k.state==='dying'&&k.stateT>4)k.state='dead';if(d<80&&k.stateT<6)this.active=k;k.rig.pose(k.age,false,0,Math.min(8,k.stateT));continue;}
   if(d>100||p.dead){k.away+=dt;if(k.away>12&&k.state!=='dormant')this._reset(k);}else k.away=0;
   if(d<160&&d>(k.id==='underkeep'?24:42)){k.dreadT-=dt;if(k.dreadT<=0){this._voice(k,'dread',.36+(1-d/170)*.28);k.dreadT=12+k.index*.9;}}
   if(k.state==='dormant'&&d<(k.id==='underkeep'?25:36)&&!p.dead)this._wake(k);
   if(k.state!=='dormant'&&d<92)this.active=k;
   if(k.state==='rising'&&k.stateT>(k.def.ambush?3.2:1.7)&&!p.dead)this._beginAttack(k,p);
   if(k.hp<k.def.hp*(k.phase===1?.66:.29)&&k.phase<3){k.phase++;this._voice(k,'dread',.72);}
   if(k.state==='recover'){
    k.weakOpen=true;const settle=k.recoveryDuration||1.05;
    if(k.stateT>settle&&k.stagger<=0&&!p.dead&&d<85){k.state='stalking';k.stateT=0;k.weakOpen=false;}
   }
   if(k.state==='stalking'&&!p.dead){k.weakOpen=false;this._stalk(k,p,dt);}
   if(k.state==='climbing'){k.weakOpen=false;this._climb(k,p,dt);}
   if(k.state==='warning'||k.state==='striking')this._advanceAttack(k,p,dt);
   if(!['dormant','rising'].includes(k.state)&&d<85&&!p.dead)this._advancePressure(k,p,dt);
   const face=(k.state==='dormant'||k.state==='recover'||k.state==='rising'||k.state==='stalking');if(face&&d<120){const travelling=k.state==='stalking'&&k.moveSpeed>0,desired=travelling?Math.atan2(k.travelX,k.travelZ):Math.atan2(p.pos.x-k.pos.x,p.pos.z-k.pos.z),delta=Math.atan2(Math.sin(desired-k.yaw),Math.cos(desired-k.yaw));k.turn=delta;k.yaw+=delta*Math.min(1,dt*(travelling?11:1.9));if(!this._surfaceFacing(k,p))k.rig.root.rotation.set(0,k.yaw,0);}
   const onSurface=k.def.shape==='crypt',localX=k.state==='climbing'?0:(k.travelX||0)*Math.cos(k.yaw)-(k.travelZ||0)*Math.sin(k.yaw),localZ=k.state==='climbing'?1:(k.travelX||0)*Math.sin(k.yaw)+(k.travelZ||0)*Math.cos(k.yaw);
   k.rig.pose(k.age,k.weakOpen,k.state==='warning'?clamp(k.stateT/k.windup,0,1):0,0,{state:k.state,stateT:k.stateT,attack:k.attack,attackFamily:k.attackFamily,phase:k.phase,strike:k.stateT/k.duration,speed:k.moveSpeed,gait:k.gait,recoil:k.recoil,turn:k.turn,travelX:localX,travelZ:localZ,surface:k.surface,contact:onSurface?{root:k.rig.root,home:k.home,room:CRYPT_ROOM}:null});if(k.hitFlash>0)k.rig.membrane.emissiveIntensity=.65;
   // One borrowed light paints the real creature and nearby ground. No extra renderer light slots.
   if(d<72&&k.state!=='dormant'){const lights=this._sys('lights');if(!k.rover?.inUse)k.rover=lights?.borrow?.('boss',k.pos.x,k.pos.y+5,k.pos.z+6,k.def.skin.colors.accent,13,0);if(k.rover){k.rover.x=k.pos.x;k.rover.y=k.pos.y+5;k.rover.z=k.pos.z+6;k.rover.peak=k.weakOpen?17:8;k.rover.distance=38;k.rover.decay=1.1;}}else if(k.rover?.inUse){this._sys('lights')?.release?.(k.rover);k.rover=null;}
  }
  if(this._colliderTimer<=0)this._colliderTimer=.12;
  const k=this.active;this.ctx.shared.bossEncounter=k?{id:k.id,name:k.def.name,location:k.def.location,hp:k.hp,maxHp:k.def.hp,hpFrac:k.hp/k.def.hp,phase:k.phase,weakOpen:k.weakOpen,hint:k.def.hint}:null;
  if(this.hud){this.hud.style.opacity=k&&!this.ctx.paused?'1':'0';if(k){this.nameEl.textContent=k.def.name;this.hpEl.style.width=Math.max(0,k.hp/k.def.hp*100)+'%';this.stateEl.textContent=!k.alive?'THE DARK HAS LET GO':k.weakOpen?'EXPOSED':k.phase===3?'DESPERATE':k.phase===2?'UNBOUND':'';}}
 }
 // Presentation still runs while simulation is paused; keep encounter UI out of menus.
 present(){if(!this.hud)return;const show=!!(this.active&&this.ctx.playing&&!this.ctx.paused&&!this._sys('player')?.dead);this.hud.hidden=!show;this.hud.style.opacity=show?'1':'0';}
 state(){return {active:this.active?.id||null,encounters:this.all.map(k=>({id:k.id,state:k.state,hp:k.hp,maxHp:k.def.hp,phase:k.phase,comboLeft:k.comboLeft,pendingRupture:!!k.pendingRupture,recoveryDuration:k.recoveryDuration,surface:k.surface||'floor',moveSpeed:k.moveSpeed,weakOpen:k.weakOpen,alive:k.alive,position:k.pos.toArray(),hazards:[...k.hazards,...(k.pressureHazards||[])].map(h=>({pressure:!!h.pressure,anchor:h.anchor,kind:h.kind,x:h.x,z:h.z,r:h.r,width:h.width,damage:h.damage,delay:h.delay,life:h.life,bodyOnly:!!h.bodyOnly})),anchors:k.site.anchors.filter(a=>!a.spent).length}))};}
 dispose(){this.off?.();for(const k of this.all){this._clearHazards(k);this._unseat(k);k.rig.dispose();if(k.rover?.inUse)this._sys('lights')?.release?.(k.rover);}this.prime?.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.hud?.remove();this.group?.removeFromParent();this.ctx.shared.bossEncounter=null;}
}
