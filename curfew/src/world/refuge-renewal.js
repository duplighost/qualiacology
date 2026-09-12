// A safe room improves while its owner is out in the county. Time only accrues
// during actual play, after the room is cleared, powered and personally visited.
import * as THREE from 'three';
import {Kit} from './sites.js';
import {bedsidePlacement} from './refuge-comfort.js';

const ARMED=1,AWAY=2,RENEWED=4,TAKEN=8;
export class RefugeRenewal {
 constructor(unit){this.u=unit;this.ctx=unit.ctx;this.bits=0;this.away=0;this.loaded=false;this.focus=false;this.usePrev=false;this.persistT=0;this.checkT=0;this.eligible=false;
  this.key='refuge-renewal:'+unit.siteId;this.off=this.ctx.bus.on('save:loaded',()=>{this.loaded=false;});
 }
 build(){const u=this.u,room=u.spec.room,bag=u.anchors.bag,roomYaw=room.yaw||0;this.group=new THREE.Group();this.group.name='refuge-tended-'+u.siteId;u.group.add(this.group);
  // Folded wool goes on the foot of the actual sleeping bag, never across its approach.
  const quilt=new THREE.Group();quilt.position.set(bag.x,u.padY,bag.z);quilt.rotation.y=bag.yaw||0;const q=new Kit();
  q.box(1.00,.12,.68,0,.40,.47,[.13,.16,.16]);q.box(.96,.045,.62,0,.478,.45,[.17,.20,.20]);
  for(let i=0;i<8;i++){q.box(.018,.007,.65,-.44+i*.125,.503,.45,[.30,.27,.20]);q.box(.97,.007,.014,0,.505,.16+i*.081,[.24,.24,.20]);}
  quilt.add(new THREE.Mesh(q.build(),u.matBody));this.group.add(quilt);
  // A narrow repaired shelf and an orderly supply basket sit against the room's
  // back wall. The footprint is kept out of both the door and the bedside puzzle.
  const rc=Math.cos(roomYaw),rs=Math.sin(roomYaw),dx=bag.x-room.x,dz=bag.z-room.z,bedSide=dx*rc-dz*rs;
  const sx=bedSide<0?room.w*.30:-room.w*.30,sz=room.d*.5-.38;
  this.shelf=new THREE.Group();this.shelf.position.set(room.x+sx*rc+sz*rs,u.padY,room.z-sx*rs+sz*rc);this.shelf.rotation.y=roomYaw;this.group.add(this.shelf);
  const k=new Kit();k.box(1.25,.085,.50,0,1.03,0,[.12,.082,.044]);for(const side of[-1,1]){k.box(.065,.38,.07,side*.48,.86,.18,[.19,.15,.095]);k.box(.06,.065,.37,side*.48,.69,.02,[.14,.10,.065]);}
  k.box(1.22,.34,.055,0,1.32,.2,[.12,.092,.061]);for(let i=0;i<4;i++)k.cyl(.02,.02,.012,8,-.51+i*.34,1.32,.161,[.30,.26,.17],Math.PI/2);
  // A repaired pair of boots, split kindling and a swept mat stay after supplies are taken.
  for(const side of[-1,1]){k.box(.20,.22,.30,side*.14,.25,-.03,[.052,.045,.036]);k.box(.22,.12,.44,side*.14,.20,-.14,[.074,.063,.046]);}
  for(let i=0;i<7;i++)k.cyl(.035,.05,.45,7,.39+(i%2)*.08,.19+Math.floor(i/2)*.08,-.04,[.15,.10,.049],Math.PI/2);
  this.shelf.add(new THREE.Mesh(k.build(),u.matBody));
  const supplies=new Kit();supplies.box(.68,.23,.35,0,1.2,-.01,[.16,.15,.09]);supplies.box(.13,.24,.36,0,1.21,-.01,[.34,.29,.21]);supplies.box(.69,.24,.055,0,1.21,-.16,[.32,.28,.21]);
  for(let i=0;i<4;i++)supplies.cyl(.045,.045,.16,10,-.22+i*.14,1.38,0,[.28,.20,.07]);this.supplies=new THREE.Mesh(supplies.build(),u.matBody);this.shelf.add(this.supplies);
  // A small jar of cut stems on the already-built bedside table. The stems cast
  // real silhouettes in its existing lamp; no new light or glow is introduced.
  const at=bedsidePlacement(bag,room),flowers=new THREE.Group();flowers.position.set(at.x,u.padY,at.z);flowers.rotation.y=at.yaw;this.group.add(flowers);const f=new Kit();
  f.cyl(.062,.075,.18,16,-.23,.94,.14,[.14,.20,.18]);
  for(let i=0;i<5;i++){const x=-.23+Math.sin(i*2.4)*.07,z=.14+Math.cos(i*2.4)*.055,h=.18+(i%3)*.055;f.cyl(.005,.005,h,5,x,1.02+h*.5,z,[.09,.13,.055]);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;f.at(new THREE.SphereGeometry(.026,7,5),[.32,.29,.20],x+Math.cos(a)*.031,1.02+h,z+Math.sin(a)*.031);}}
  flowers.add(new THREE.Mesh(f.build(),u.matBody));
  this._note();this.group.visible=false;
 }
 _note(){if(typeof document==='undefined')return;const c=document.createElement('canvas');c.width=512;c.height=192;const g=c.getContext('2d');g.fillStyle='#aaa28b';g.fillRect(0,0,512,192);g.fillStyle='#302f29';g.font='29px Georgia';g.textAlign='center';g.fillText('Kept the light on.',256,69);g.fillText('Left what we could.',256,120);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;this.noteMaterial=new THREE.MeshStandardMaterial({map,roughness:1,color:0x898478});const note=new THREE.Mesh(new THREE.PlaneGeometry(.9,.34),this.noteMaterial);note.position.set(0,1.7,-.22);note.rotation.y=Math.PI;this.shelf.add(note);}
 _save(pr){pr.flag(this.key,this.bits);pr.flag(this.key+':away',Math.min(60,Math.floor(this.away)));}
 step(dt){this.focus=false;const ctx=this.ctx,u=this.u,pr=u._sys('progress'),p=u._sys('player');const use=!!ctx.input?.held('use'),pressed=use&&!this.usePrev;this.usePrev=use;
  if(!ctx.ready||!pr||!p?.pos)return false;
  if(!this.loaded){this.bits=Number(pr.flag(this.key))||0;this.away=Number(pr.flag(this.key+':away'))||0;this.loaded=true;}
  this.group.visible=!!(this.bits&RENEWED);this.supplies.visible=!(this.bits&TAKEN);
  if(!ctx.playing||ctx.paused||p.dead)return false;
  this.checkT-=dt;if(this.checkT<=0){const status=u._sys('territory')?.status?.(u.siteId);this.eligible=u.power&&(status?.clear===true||!!pr.flag('secured:'+u.siteId));this.checkT=.5;}
  if(!this.eligible)return false;
  const room=u.spec.room,x=u._wx(room.x,room.z),z=u._wz(room.x,room.z),distance=Math.hypot(p.pos.x-x,p.pos.z-z),inside=u.contains(p.pos.x,p.pos.y,p.pos.z);
  if(!(this.bits&ARMED)&&inside){this.bits|=ARMED;this._save(pr);}
  if((this.bits&ARMED)&&!(this.bits&RENEWED)){
   if(distance>130){this.away+=dt;this.persistT+=dt;if(this.away>=60)this.bits|=AWAY;if(this.persistT>10){this.persistT=0;this._save(pr);}}
   else if(distance<100&&!(this.bits&AWAY)&&this.away>0){this.away=0;this._save(pr);}
   if((this.bits&AWAY)&&distance<24){this.bits|=RENEWED;this._save(pr);this.group.visible=true;ctx.bus.emit('refuge:tended',{id:u.siteId});}
  }
  if(!(this.bits&RENEWED)||(this.bits&TAKEN)||!inside||ctx.shared.inCar)return false;
  const at=this.shelf.position,wx=u._wx(at.x,at.z),wz=u._wz(at.x,at.z),wy=u.padY+1.3,dx=wx-p.pos.x,dz=wz-p.pos.z,d=Math.hypot(dx,dz),cam=u._sys('camera');
  if(d>2.0||!cam||(-Math.sin(cam.yaw)*dx-Math.cos(cam.yaw)*dz)/(d||1)<.78)return false;
  if(u._sys('collision')?.segmentClear&&!u._sys('collision').segmentClear(p.pos.x,p.eyeY??p.pos.y+1.65,p.pos.z,wx,wy,wz))return false;
  this.focus=true;ctx.bus.emit('prompt',{kind:'use',label:'E',rank:7,x:wx,y:wy,z:wz,detail:'TAKE THE SUPPLIES',subdetail:'LEFT FOR YOU'});
  if(pressed){this.bits|=TAKEN;this.supplies.visible=false;this._save(pr);p.heal?.(35);const weapons=u._sys('weapons');for(const id of['revolver','bolt','shotgun','carbine'])weapons?.addReserveTo?.(id,id==='carbine'?24:8);u._say?.('lantern',.2,wx,wy,wz);ctx.bus.emit('pickup',{kind:'ammo',amount:8});}
  return true;
 }
 state(){const p=this.shelf?.position;return {armed:!!(this.bits&ARMED),away:Math.floor(this.away),tended:!!(this.bits&RENEWED),suppliesTaken:!!(this.bits&TAKEN),at:p?[this.u._wx(p.x,p.z),this.u.padY+1.3,this.u._wz(p.x,p.z)]:null};}
 dispose(){this.off?.();this.group?.removeFromParent();this.group?.traverse(o=>o.geometry?.dispose());this.noteMaterial?.map?.dispose();this.noteMaterial?.dispose();}
}
