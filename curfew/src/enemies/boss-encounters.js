// Ten encounters share the damage contract, but keep their own anatomy, voice and attack rhythm.
import * as THREE from 'three';
import {BOSSES} from '../world/boss-catalog.js';
import {buildBossRig} from './boss-bodies.js';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const V=new THREE.Vector3(),N=new THREE.Vector3(0,1,0),ray=new THREE.Raycaster();
const hit={t:0,enemy:null,zone:'torso',point:new THREE.Vector3(),boss:true};
export function distanceToSegment(x,z,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-ax-dx*t,z-az-dz*t);}
export function hazardContains(h,x,z,jump=0,time=0){
 if(h.kind==='ring'){const r=h.inward?Math.max(0,h.r-time*h.speed):time*h.speed;return jump<.8&&Math.abs(Math.hypot(x-h.x,z-h.z)-r)<h.width;}
 if(h.kind==='line')return distanceToSegment(x,z,h.x,h.z,h.bx,h.bz)<h.width;
 if(h.kind==='fan'){const dx=x-h.x,dz=z-h.z,d=Math.hypot(dx,dz);return d<h.r&&((dx*h.dx+dz*h.dz)/(d||1)>h.dot||d<3);}
 return Math.hypot(x-h.x,z-h.z)<h.r;
}
function makeVoice(audio,index){const name='encounter-voice-'+index;if(audio?.has?.(name)||!audio?.actx)return name;const sr=22050,seconds=4.2,n=Math.floor(sr*seconds),a=new Float32Array(n);let seed=31917+index*619,brown=0,phase=0;const notes=[39,31,74,57,26,108,44,138,34,49];
 for(let i=0;i<n;i++){const t=i/sr;seed=(Math.imul(seed,1664525)+1013904223)|0;const noise=(seed>>>0)/2147483648-1;brown=(brown+noise*.045)/1.045;const bend=1+.14*Math.sin(t*1.7+index),f=notes[index]*bend;phase+=TAU*f/sr;const env=Math.sin(Math.PI*t/seconds)**1.6,pulse=.6+.4*Math.sin(t*(2+index*.4))**2;const throat=Math.sin(phase+Math.sin(phase*.501)*1.7)*.35+Math.sin(phase*1.51)*.14+Math.sin(phase*3.07)*.09;const scrape=noise*.045*(.5+.5*Math.sin(t*(13+index*3)));a[i]=(throat*pulse+brown*.5+scrape)*env*.44;}
 audio.reg(name,[a],sr);return name;
}
function hazardMesh(h,material){let geo;if(h.kind==='ring')geo=new THREE.RingGeometry(.96,1,96);else if(h.kind==='line')geo=new THREE.PlaneGeometry(1,1);else if(h.kind==='fan')geo=new THREE.CircleGeometry(h.r,48,Math.PI-Math.acos(h.dot),2*Math.acos(h.dot));else geo=new THREE.CircleGeometry(h.r,40);const m=new THREE.Mesh(geo,material);m.rotation.x=-Math.PI/2;m.position.set(h.x,h.y+.15,h.z);
 if(h.kind==='line'){const dx=h.bx-h.x,dz=h.bz-h.z;m.position.x=(h.x+h.bx)/2;m.position.z=(h.z+h.bz)/2;m.scale.set(h.width*2,Math.hypot(dx,dz),1);m.rotation.z=Math.atan2(dx,dz);}if(h.kind==='ring')m.scale.setScalar(h.r);if(h.kind==='fan')m.rotation.z=Math.atan2(h.dx,h.dz)+Math.PI/2;return m;
}
export class BossEncounters {
 static id='boss-encounters';
 constructor(ctx){this.ctx=ctx;this.all=[];this.time=0;this.active=null;this.loaded=false;this._voices=new Set();this._colliderTimer=0;}
 _sys(id){return this.ctx.systems.get(id);}
 async init(){const sites=this._sys('boss-sites');if(!sites)return;
  this.group=new THREE.Group();this.group.name='county-encounters';this.ctx.scene.add(this.group);
  for(let i=0;i<BOSSES.length;i++){const def=BOSSES[i],site=sites.sites.find(s=>s.id===def.id),rig=buildBossRig(def);const k={id:def.id,index:i,def:{...def,radius:3,height:rig.anatomy.height},site,rig,encounter:true,species:'encounter',pos:new THREE.Vector3(def.x,site.y,def.z),home:new THREE.Vector3(def.x,site.y,def.z),hp:def.hp,alive:true,dead:false,state:'dormant',stateT:0,age:0,cycle:0,phase:1,weakOpen:false,stagger:0,away:0,dreadT:0,hitFlash:0,hazards:[],attack:'',yaw:0,windup:1.8,duration:1.6,hitCooldown:0,chargeStart:null,chargeEnd:null,scar:0,rover:null};
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
 ready(){return this.all.length===10;}
 _restore(){const pr=this._sys('progress');if(!pr)return;for(const k of this.all){const cleared=pr.bossCleared?.(k.id)||pr.flag('boss:'+k.id);if(cleared){k.hp=0;k.alive=false;k.dead=true;k.state='dead';k.stateT=10;k.scar=1;for(const a of k.site.anchors){a.spent=true;a.enemy.alive=false;}if(k.rover?.inUse)this._sys('lights')?.release?.(k.rover);k.rover=null;this._clearHazards(k);this._unseat(k);}else this._reset(k);}this.loaded=true;}
 _seat(k){const c=this._sys('collision');if(!c)return;this._unseat(k);k.collider=c.addCollider({kind:'circle',x:k.pos.x,z:k.pos.z,r:k.def.shape==='tree'?3:2.25,y0:k.pos.y,y1:k.pos.y+Math.min(8,k.rig.anatomy.height),mask:1,tag:'boss',climbable:false},'boss-body:'+k.id);}
 _unseat(k){if(k.collider!==undefined){this._sys('collision')?.removeChunk('boss-body:'+k.id);k.collider=undefined;}}
 _voice(k,kind='dread',gain=.6){const a=this._sys('audio');if(!a?.spec)return;const name=kind==='dread'?makeVoice(a,k.index):kind==='death'?'kn_death':kind==='open'?'kn_vent':kind==='strike'?'kn_stand':'kn_sweep';if(!a.has(name))return;const s=a.spec();s.bus='creatures';s.cls='threat';s.gain=gain;s.ref=kind==='dread'?55:24;s.maxDist=180;s.priority=1;s.rate=kind==='dread'?1:.74+k.index*.033;s.send=.5;s.propagate=false;a.playAt(name,k.pos.x,k.pos.y+4,k.pos.z,s);}
 _wake(k){if(!k.alive||k.state!=='dormant')return;k.state='rising';k.stateT=0;k.weakOpen=false;this._voice(k,'dread',.85);this.ctx.bus.emit('boss:woke',{id:k.id,x:k.pos.x,z:k.pos.z,by:'arrival'});}
 _clearHazards(k){for(const h of k.hazards){h.mesh.removeFromParent();h.mesh.geometry.dispose();h.material.dispose();for(const m of h.spikes||[]){m.removeFromParent();m.geometry.dispose();m.material.dispose();}}k.hazards.length=0;}
 _reset(k){this._clearHazards(k);k.pos.copy(k.home);k.rig.root.position.copy(k.home);k.rig.body.rotation.set(0,0,0);k.hp=k.def.hp;k.alive=true;k.dead=false;k.state='dormant';k.stateT=0;k.cycle=0;k.phase=1;k.weakOpen=false;k.stagger=0;k.away=0;k.scar=0;for(const a of k.site.anchors){a.spent=false;a.hp=36;a.enemy.alive=true;}this._seat(k);}
 _hazard(k,data){const material=new THREE.MeshBasicMaterial({color:k.def.skin.colors.accent,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});const h={y:k.site.y,r:4,width:2.4,speed:17,inward:false,damage:25,hit:false,...data,material};h.mesh=hazardMesh(h,material);this.group.add(h.mesh);h.spikes=[];
  // Gross physical aftermath belongs to the floor marks: tentacles, hands, roots and vent plumes.
  if(h.kind==='disc'){for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(.3,.9,7),new THREE.MeshStandardMaterial({color:k.def.shape==='furnace'?0x663220:0x665649,roughness:.7}));const a=i*TAU/4;m.position.set(h.x+Math.cos(a)*h.r*.5,h.y-.8,h.z+Math.sin(a)*h.r*.5);m.visible=false;this.group.add(m);h.spikes.push(m);}}
  k.hazards.push(h);return h;
 }
 _beginAttack(k,p){this._clearHazards(k);k.attack=k.def.attacks[k.cycle++%k.def.attacks.length];k.state='warning';k.stateT=0;k.weakOpen=false;k.hitCooldown=0;const dx=p.pos.x-k.pos.x,dz=p.pos.z-k.pos.z,d=Math.hypot(dx,dz)||1,ux=dx/d,uz=dz/d;k.yaw=Math.atan2(ux,uz);k.rig.root.rotation.y=k.yaw;k.windup=k.phase===2?1.55:1.85;k.duration=1.65;k.chargeStart=null;
  const disc=(x,z,r=4,damage=24)=>this._hazard(k,{kind:'disc',x,z,r,damage});
  const line=(angle,length=42,width=2.8)=>this._hazard(k,{kind:'line',x:k.pos.x,z:k.pos.z,bx:k.pos.x+Math.sin(angle)*length,bz:k.pos.z+Math.cos(angle)*length,width,damage:27});
  switch(k.attack){
   case 'charge':{const length=Math.min(26,Math.max(15,d+4));line(k.yaw,length,3.1);k.windup=2.0;k.duration=1.5;k.chargeStart=k.pos.clone();k.chargeEnd=k.pos.clone().add(new THREE.Vector3(ux*length,0,uz*length));const delta=k.chargeEnd.clone().sub(k.home);if(delta.length()>27)k.chargeEnd.copy(k.home).add(delta.setLength(27));break;}
   case 'ring':this._hazard(k,{kind:'ring',x:k.pos.x,z:k.pos.z,r:40,width:1.5,speed:17,damage:23});k.duration=2.6;break;
   case 'undertow':this._hazard(k,{kind:'ring',x:k.pos.x,z:k.pos.z,r:40,width:2,speed:16,inward:true,damage:22});k.duration=2.6;break;
   case 'sweep':this._hazard(k,{kind:'fan',x:k.pos.x,z:k.pos.z,dx:ux,dz:uz,r:17,dot:-.13,damage:29});k.windup=1.8;k.duration=.85;break;
   case 'cross':{const count=k.phase===2?5:3;for(let i=0;i<count;i++)line(k.yaw+(i-(count-1)/2)*.42,48,2);k.duration=1.35;break;}
   case 'vents':{for(let i=0;i<5;i++)line(i*TAU/5+k.cycle*.23,39,2.4);k.windup=2.1;k.duration=2.0;break;}
   case 'roots':{disc(p.pos.x,p.pos.z,4);for(let i=0;i<3;i++){const a=k.cycle*.7+i*TAU/3;disc(k.home.x+Math.cos(a)*19,k.home.z+Math.sin(a)*19,4.8);}k.duration=2.4;break;}
   case 'tentacles':{disc(p.pos.x,p.pos.z,4.8);for(let i=0;i<4;i++){const a=i*TAU/4+k.cycle*.33;disc(k.home.x+Math.cos(a)*22,k.home.z+Math.sin(a)*22,4.8);}k.windup=2;k.duration=2.2;break;}
   case 'hands':{disc(p.pos.x,p.pos.z,4.3);for(let i=0;i<4;i++){const a=i*TAU/4;disc(p.pos.x+Math.cos(a)*9,p.pos.z+Math.sin(a)*9,3);}k.duration=2.25;break;}
   case 'slam':disc(k.pos.x,k.pos.z,15,32);k.windup=2.3;k.duration=.85;break;
   default:{disc(p.pos.x,p.pos.z,5.5);if(k.phase===2)disc(p.pos.x+ux*8,p.pos.z+uz*8,4);k.windup=2;k.duration=2.25;}
  }
  this._voice(k,'warn',.65);this.ctx.bus.emit('enemy:telegraph',{e:k,kind:k.attack==='charge'?'lunge':'slam',x:k.pos.x,y:k.pos.y+4,z:k.pos.z,rear:false});
 }
 _advanceAttack(k,p,dt){const warning=k.state==='warning',t=k.stateT;for(const h of k.hazards){h.material.opacity=warning?.09+Math.pow(clamp(t/k.windup,0,1),2)*.22:.27*(1-clamp(t/k.duration,0,1)*.45);h.material.color.setHex(warning?k.def.skin.colors.accent:0xcd7970);
   if(h.kind==='ring'){const rr=warning?h.r:h.inward?Math.max(.01,h.r-t*h.speed):Math.max(.01,t*h.speed);h.mesh.scale.set(rr,rr,1);}
   for(let i=0;i<h.spikes.length;i++){const m=h.spikes[i];m.visible=!warning;const rise=Math.min(1,t*5)*Math.min(1,(k.duration-t)*3);m.position.y=h.y+rise*1.9-.5;m.scale.set(.9,1+rise*3,.9);m.rotation.z=Math.sin(i+k.index)*.45;}
  }
  if(warning){if(t>=k.windup){k.state='striking';k.stateT=0;this._voice(k,'strike',.63);if(Math.hypot(p.pos.x-k.pos.x,p.pos.z-k.pos.z)<35)this._sys('fx')?.addTrauma?.(.18);}return;}
  if(k.attack==='charge'&&k.chargeStart){const f=clamp(t/k.duration,0,1);V.lerpVectors(k.chargeStart,k.chargeEnd,f*f*(3-2*f));const dx=V.x-k.pos.x,dz=V.z-k.pos.z,travel=Math.hypot(dx,dz);
   const obstacle=travel>.001?this._sys('collision')?.raycast({x:k.pos.x,y:k.pos.y+1.5,z:k.pos.z},{x:dx/travel,y:0,z:dz/travel},travel+2.3,2):null;
   if(obstacle?.hit){this._clearHazards(k);k.state='recover';k.stateT=-1;k.weakOpen=true;k.stagger=4.5;this._seat(k);this._voice(k,'strike',.65);return;}
   k.pos.copy(V);k.rig.root.position.copy(k.pos);if(this._colliderTimer<=0)this._seat(k);
  }
  const jump=Math.max(0,p.pos.y-k.site.y);if(!p.dead&&k.hitCooldown<=0&&Math.abs(p.pos.y-k.site.y)<20){
   for(const h of k.hazards){let inside=hazardContains(h,p.pos.x,p.pos.z,jump,t);if(k.attack==='charge')inside=Math.hypot(p.pos.x-k.pos.x,p.pos.z-k.pos.z)<4.3;if(!inside||h.hit)continue;
    // Walls and arena cover block attacks except the ground-borne wave you can jump.
    let blocked=false;if(h.kind!=='ring'){V.set(p.pos.x-k.pos.x,p.pos.y+1-k.pos.y-3,p.pos.z-k.pos.z);const len=V.length();if(len>1){V.multiplyScalar(1/len);const obstruction=this._sys('collision')?.raycast({x:k.pos.x,y:k.pos.y+3,z:k.pos.z},V,len,2);blocked=!!obstruction?.hit&&obstruction.t<len-.5;}}
    if(blocked)continue;h.hit=true;k.hitCooldown=1;const old=p.hp;V.set(p.pos.x-k.pos.x,0,p.pos.z-k.pos.z).normalize();p.hurt(h.damage,V);if(p.hp<old)this._sys('fx')?.addTrauma?.(.28);break;
   }
  }
  if(t>=k.duration){this._clearHazards(k);k.state='recover';k.stateT=0;k.weakOpen=true;this._voice(k,'open',.48);this._seat(k);}
 }
 _die(k){if(!k.alive)return;if(k.rover?.inUse)this._sys('lights')?.release?.(k.rover);k.rover=null;k.hp=0;k.alive=false;k.dead=true;k.state='dying';k.stateT=0;k.weakOpen=false;this._clearHazards(k);this._unseat(k);this._voice(k,'death',.7);this._sys('fx')?.addTrauma?.(.22);this._sys('progress')?.completeBoss?.({id:k.id,name:k.def.name,xp:k.def.xp,cash:k.def.cash,finishId:k.def.skin.id});
  // A dead arena stays physically changed: pale hearts go dark and the body remains collapsed.
  for(const a of k.site.anchors){a.spent=true;a.enemy.alive=false;}this.ctx.bus.emit('boss:world-cleared',{id:k.id,x:k.home.x,z:k.home.z});
 }
 damage(enemy,amount,info={}){if(enemy?.anchor){const k=enemy.boss,a=enemy.record;if(a.spent||!k.alive)return {killed:false,hpFrac:0};a.hp-=Math.max(1,amount);this._wake(k);if(a.hp<=0){a.spent=true;enemy.alive=false;k.stagger=6;k.weakOpen=true;k.state='recover';k.stateT=-2;this._clearHazards(k);k.hp-=190;this._voice(k,'strike',.6);this._sys('fx')?.impact?.('flesh',enemy.pos,N,1.4);if(k.hp<=0)this._die(k);return {killed:false,hpFrac:Math.max(0,k.hp/k.def.hp),species:'encounter'};}return {killed:false,hpFrac:a.hp/36,species:'encounter'};}
  const k=enemy;if(!k?.alive)return {killed:false,hpFrac:0,species:'encounter'};this._wake(k);const vulnerable=info.zone==='heart'&&k.weakOpen;const dealt=Math.max(1,amount*(vulnerable?2.65:.64));k.hp-=dealt;k.hitFlash=.22;if(k.hp<=0){this._die(k);return {killed:true,hpFrac:0,species:'encounter'};}return {killed:false,hpFrac:k.hp/k.def.hp,species:'encounter'};
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
  for(const k of this.all){k.age+=dt;k.stateT+=dt;k.hitCooldown=Math.max(0,k.hitCooldown-dt);k.hitFlash=Math.max(0,k.hitFlash-dt);k.stagger=Math.max(0,k.stagger-dt);const d=Math.hypot(p.pos.x-k.home.x,p.pos.z-k.home.z);k.rig.root.visible=d<460;
   if(!k.alive){if(k.state==='dying'&&k.stateT>4)k.state='dead';if(d<80&&k.stateT<6)this.active=k;k.rig.pose(k.age,false,0,Math.min(8,k.stateT));continue;}
   if(d>100||p.dead){k.away+=dt;if(k.away>12&&k.state!=='dormant')this._reset(k);}else k.away=0;
   if(d<160&&d>(k.id==='underkeep'?24:42)){k.dreadT-=dt;if(k.dreadT<=0){this._voice(k,'dread',.36+(1-d/170)*.28);k.dreadT=12+k.index*.9;}}
   if(k.state==='dormant'&&d<(k.id==='underkeep'?22:36)&&!p.dead)this._wake(k);
   if(k.state!=='dormant'&&d<92)this.active=k;
   if(k.state==='rising'&&k.stateT>3.2){k.state='recover';k.stateT=0;k.weakOpen=true;}
   if(k.hp<k.def.hp*.48&&k.phase===1){k.phase=2;this._voice(k,'dread',.72);}
   if(k.state==='recover'){k.weakOpen=true;if(k.stateT>3.6&&k.stagger<=0&&!p.dead&&d<70)this._beginAttack(k,p);}
   if(k.state==='warning'||k.state==='striking')this._advanceAttack(k,p,dt);
   const face=(k.state==='dormant'||k.state==='recover'||k.state==='rising');if(face&&d<120){const desired=Math.atan2(p.pos.x-k.pos.x,p.pos.z-k.pos.z),delta=Math.atan2(Math.sin(desired-k.yaw),Math.cos(desired-k.yaw));k.yaw+=delta*Math.min(1,dt*.75);k.rig.root.rotation.y=k.yaw;}
   k.rig.pose(k.age,k.weakOpen,k.state==='warning'?clamp(k.stateT/k.windup,0,1):0,0);if(k.hitFlash>0)k.rig.membrane.emissiveIntensity=.65;
   // One borrowed light paints the real creature and nearby ground. No extra renderer light slots.
   if(d<72&&k.state!=='dormant'){const lights=this._sys('lights');if(!k.rover?.inUse)k.rover=lights?.borrow?.('boss',k.pos.x,k.pos.y+5,k.pos.z+6,k.def.skin.colors.accent,13,0);if(k.rover){k.rover.x=k.pos.x;k.rover.y=k.pos.y+5;k.rover.z=k.pos.z+6;k.rover.peak=k.weakOpen?17:8;k.rover.distance=38;k.rover.decay=1.1;}}else if(k.rover?.inUse){this._sys('lights')?.release?.(k.rover);k.rover=null;}
  }
  if(this._colliderTimer<=0)this._colliderTimer=.12;
  const k=this.active;this.ctx.shared.bossEncounter=k?{id:k.id,name:k.def.name,location:k.def.location,hp:k.hp,maxHp:k.def.hp,hpFrac:k.hp/k.def.hp,phase:k.phase,weakOpen:k.weakOpen,hint:k.def.hint}:null;
  if(this.hud){this.hud.style.opacity=k&&!this.ctx.paused?'1':'0';if(k){this.nameEl.textContent=k.def.name;this.hpEl.style.width=Math.max(0,k.hp/k.def.hp*100)+'%';this.stateEl.textContent=!k.alive?'THE DARK HAS LET GO':k.weakOpen?'EXPOSED':k.phase===2?'UNBOUND':'';}}
 }
 // Presentation still runs while simulation is paused; keep encounter UI out of menus.
 present(){if(!this.hud)return;const show=!!(this.active&&this.ctx.playing&&!this.ctx.paused&&!this._sys('player')?.dead);this.hud.hidden=!show;this.hud.style.opacity=show?'1':'0';}
 state(){return {active:this.active?.id||null,encounters:this.all.map(k=>({id:k.id,state:k.state,hp:k.hp,maxHp:k.def.hp,phase:k.phase,weakOpen:k.weakOpen,alive:k.alive,position:k.pos.toArray(),hazards:k.hazards.map(h=>({kind:h.kind,x:h.x,z:h.z,r:h.r,width:h.width,damage:h.damage})),anchors:k.site.anchors.filter(a=>!a.spent).length}))};}
 dispose(){this.off?.();for(const k of this.all){this._clearHazards(k);this._unseat(k);k.rig.dispose();if(k.rover?.inUse)this._sys('lights')?.release?.(k.rover);}this.prime?.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.hud?.remove();this.group?.removeFromParent();this.ctx.shared.bossEncounter=null;}
}
