import * as THREE from './vendor/three.module.js';
import {SwimmingController} from './swimming.js';

const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const vec=p=>Array.isArray(p)?new THREE.Vector3(...p):new THREE.Vector3(p.x,p.y,p.z);
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

export class SlController extends SwimmingController{
 reset(start=this._spawn){super.reset(start);this.coldExposure=0;this.coldWater=false;this.coldDamage=0;this.windSheltered=false;this.windExposure=0;this.blownTime=0;this.blowCooldown=0;this.blownAge=0;this.blownYaw=0;this.blownSpeed=0;this.blownGravity=3.6;this.blownPeak=false;this.capLost=false;this.slopeContact=false;this.backflipping=false;}
 blowAway(yaw){if(this.dead||this.blowCooldown>0||this.blownTime>0)return false;this.blownYaw=yaw;this.yaw=yaw+Math.PI;this.blownSpeed=7.2;this.blownGravity=3.6;this.blownPeak=false;this.blownAge=0;this.velocity.x=Math.sin(yaw)*7.2;this.velocity.z=Math.cos(yaw)*7.2;this.velocity.y=3.6;this.grounded=false;this.coyote=0;this.jumpBuffer=0;this.pounding=this.diving=false;this.blownTime=8;this.blowCooldown=2.0;this.events.push('wind');return true;}
 _updateBreath(dt){
  this.coldWater=!!(this.swimming&&this._waterInfo?.cold);
  if(!this.coldWater){super._updateBreath(dt);return;}
  if(this.dead||this.disabled)return;
  // Snow-terrain water loses 3 / 256 of a wedge each source frame at 30 Hz,
  // including the surface. It never heals a swimmer at the surface.
  this._surfaceHeal=0;this.coldExposure+=dt*90/256;
  this.oxygen=this.underwater?Math.max(0,this.oxygen-dt/this.breathSeconds):Math.min(1,this.oxygen+dt/this.breathRecoverySeconds);
  while(this.coldExposure>=1&&!this.dead){this.coldExposure--;this.health=Math.max(0,this.health-1);this.coldDamage++;this.events.push('cold');if(!this.health){this.dead=true;this.events.push('death');}}
 }
 _step(dt,input,result){
  const p=this.position,oldY=p.y,oldFloor=this.physics.groundAt(p.x,p.z,p.y+.08),wasBlown=this.blownTime>0,canJump=this.jumpBuffer>0&&this.coyote>0&&!this.disabled&&!this.dead&&!this.swimming,speed=Math.hypot(this.velocity.x,this.velocity.z),longJump=input.crouch&&speed>2.4;
  if(this.surface==='SURFACE_ICE')this.surface='SURFACE_VERY_SLIPPERY';
  if(wasBlown){this.blownAge+=dt;if(!this.blownPeak){this.blownSpeed=Math.min(18,this.blownSpeed+54*dt);if(this.blownSpeed>=18)this.blownPeak=true;}else{this.blownSpeed=Math.max(4.8,this.blownSpeed-7.2*dt);if(this.velocity.y<0)this.blownGravity=Math.min(36,this.blownGravity+13.5*dt);}if(this.blownAge>=20/30)this.capLost=true;this.velocity.x=Math.sin(this.blownYaw)*this.blownSpeed;this.velocity.z=Math.cos(this.blownYaw)*this.blownSpeed;this.velocity.y+=dt*(28.5-this.blownGravity);input={...input,x:0,z:0,jump:false,crouch:false};}
  super._step(dt,input,result);
  // Original first-star ledges are 512 source units high. The source triple
  // jump launches at 69 units/frame; a crouching backflip launches at 62.
  // Keep these course-local so older course controllers are unaffected.
  if(canJump&&result.jumped&&!wasBlown&&!longJump){const backflip=input.crouch&&speed<=2.4,target=backflip?18.6:this.jumpCount===2?20.7:(this.jumpCount===1?15.6:12.6)+speed*.25,base=[13,15,17][this.jumpCount],delta=target-base;this.velocity.y+=delta;p.y+=delta*dt;this.backflipping=backflip;}
  if(!this.swimming&&!this.grounded&&!this.pounding&&!wasBlown){this.velocity.y-=7.5*dt;p.y-=7.5*dt*dt;}else if(this.grounded)this.backflipping=false;
  const swept=this.physics.groundAt(p.x,p.z,oldY+.65);
  if(!this.swimming&&oldFloor&&oldY>=oldFloor.height-.04&&swept&&!swept.walkable&&swept.surface.includes('SLIPPERY')&&p.y<swept.height&&swept.height-oldFloor.height<.65){p.y=swept.height;this.velocity.y=0;this.surface=swept.surface;this.groundNormal=swept.normal;}
  const f=this.physics.groundAt(p.x,p.z,p.y+.08);this.slopeContact=!this.swimming&&!this.dead&&!!f&&!f.walkable&&Math.abs(p.y-f.height)<.03&&Math.abs(this.velocity.y)<.1;if(this.slopeContact)this.coyote=.115;
  if(this.grounded&&f?.surface==='SURFACE_HORIZONTAL_WIND'){
   const force=this.physics.slWindForces?.get(f.triangle)||0,yaw=force/256*TAU,speed=Math.hypot(this.velocity.x,this.velocity.z),moving=Math.hypot(input.x||0,input.z||0)>.06,d=angle(yaw,this.yaw);
   let push=moving?(-speed*.5)*(Math.abs(d)<Math.PI/2?-1:1)*Math.cos(d):(3.2+(Math.floor(this.time*30)%4))*.3;
   p.x+=Math.sin(yaw)*push*dt;p.z+=Math.cos(yaw)*push*dt;this.physics.resolveWalls(p,this.radius,this.height);
  }
 }
 update(dt,input={}){this.blownTime=Math.max(0,this.blownTime-dt);this.blowCooldown=Math.max(0,this.blowCooldown-dt);const r=super.update(dt,input);if(r.jumped&&this.events.includes('swim-breach')){this.velocity.y+=4.3;this.position.y+=4.3*Math.min(dt,.1);}if(this.grounded&&this.blownAge>.1)this.blownTime=0;return r;}
}

export class SlMission{
 constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.world=null;this.reset();}
 reset(){
  const d=this.course.mission.penguin;this.penguin={position:vec(d.position),home:vec(d.position),yaw:d.yaw*Math.PI/180,state:'forward',age:0,step:0,stepAge:0,speed:0,gait:0,windCenter:new THREE.Vector3(),riding:false};
  this.position=this.penguin.position;this.yaw=this.penguin.yaw;this.state='climbing';this.active=false;this.health=0;this.maxHealth=0;this.held=false;this.starReady=true;this.starCollectible=true;this.starPosition=vec(this.course.mission.star.position);this.time=0;this.windAwake=false;this.windYaw=this.course.mission.wind.yaw*Math.PI/180;this.windBlows=0;this.shelteredTime=0;this.bridgeVisited=false;this.bridgeCrossed=false;this.penguinRideTime=0;this._player=null;this._syncPenguin();
 }
 _syncPenguin(){const g=this.penguin,d=this.course.mission.penguin;g.windCenter.set(g.position.x+d.windOffset[0],g.position.y+1,g.position.z+d.windOffset[1]);this.physics.setDynamicPose('sl_penguin',g.position,[0,g.yaw,0]);this.yaw=g.yaw;}
 sheltered(p){
  const w=vec(this.course.mission.wind.position),g=this.penguin.windCenter,dx=p.position.x-w.x,dz=p.position.z-w.z,dist2=dx*dx+dz*dz;if(dist2<.001)return false;
  const t=((g.x-w.x)*dx+(g.z-w.z)*dz)/dist2;
  const rayDistance=Math.hypot(w.x+dx*clamp(t,0,1)-g.x,w.z+dz*clamp(t,0,1)-g.z);
  // Source wind particles are removed within 300 units of the penguin's
  // visually adjusted center. A ray sweep represents the same wind shadow.
  return t>0&&rayDistance<this.course.mission.penguin.windRadius;
 }
 isRiding(p){const f=p&&this.physics.groundAt(p.position.x,p.position.z,p.position.y+.18);return !!(p?.grounded&&f?.triangle.dynamic==='sl_penguin'&&Math.abs(p.position.y-f.height)<.4);}
 preStep(dt,p){
  dt=clamp(dt,0,.1);this.time+=dt;const g=this.penguin,d=this.course.mission.penguin,prior=g.position.clone(),oldYaw=g.yaw;g.riding=this.isRiding(p);g.age+=dt;
  if(g.state==='forward'){
   g.stepAge+=dt;const step=d.steps[g.step];if(g.stepAge>=(step[0]+1)/30){g.stepAge=0;g.step=(g.step+1)%d.steps.length;}
   g.speed=d.steps[g.step][1]*.3;if(g.position.x<3){g.state='turnBack';g.age=0;g.speed=0;}
  }else if(g.state==='return'){g.speed=3.6;if(g.position.x>17){g.state='turnForward';g.age=0;g.speed=0;}}
  else{g.speed=0;g.yaw+=TAU/64*30*dt;if(g.age>=32/30){g.yaw=oldYaw+(32/30-(g.age-dt))*TAU/64*30;g.yaw=g.state==='turnBack'?d.yaw*Math.PI/180+Math.PI:d.yaw*Math.PI/180;g.state=g.state==='turnBack'?'return':'forward';g.age=0;g.step=g.stepAge=0;}}
  g.position.x+=Math.sin(g.yaw)*g.speed*dt;g.position.z+=Math.cos(g.yaw)*g.speed*dt;
  const floor=this.physics.groundAt(g.position.x,g.position.z,g.position.y+.4);if(floor&&floor.triangle.dynamic!=='sl_penguin')g.position.y=floor.height;
  if(g.riding&&p){const dx=p.position.x-prior.x,dz=p.position.z-prior.z,turn=g.yaw-oldYaw,c=Math.cos(turn),s=Math.sin(turn);p.position.x=g.position.x+dx*c+dz*s;p.position.z=g.position.z-dx*s+dz*c;p.position.y+=g.position.y-prior.y;this.penguinRideTime+=dt;}
  g.gait+=dt*(Math.abs(g.speed)*2+.8);this._syncPenguin();
  if(!p||p.dead)return;this._player=p;const w=this.course.mission.wind,wv=vec(w.position),p3=vec(p.position),bridge=vec(w.triggerCenter),close=Math.hypot(p3.x-bridge.x,p3.z-bridge.z)<w.triggerRadius&&p.position.y>bridge.y-1.6&&p.position.y<bridge.y+.3&&p.grounded;
  if(!this.windAwake&&close){this.windAwake=true;this.callbacks.message?.('The snowman is blowing! Stay behind the moving penguin to cross the bridge.',4);}
  if(close)this.bridgeVisited=true;if(this.bridgeVisited&&p.position.x<3&&p.position.y>32)this.bridgeCrossed=true;
  const dx=p.position.x-wv.x,dz=p.position.z-wv.z,distance=Math.hypot(dx,dz),target=Math.atan2(dx,dz),base=w.yaw*Math.PI/180,limit=w.aimLimit*Math.PI/180;this.windYaw=base+clamp(angle(base,target),-limit,limit);
  this.active=this.windAwake&&p3.distanceTo(wv)<w.range&&Math.abs(p.position.y-wv.y)<w.heightRange;
  const inBeam=this.active&&Math.abs(angle(this.windYaw,target))<3000/65536*TAU+.6/Math.max(distance,1)&&p.position.y+(p.height||1.8)>wv.y-.5&&p.position.y<wv.y+2.6;
  p.windSheltered=inBeam&&this.sheltered(p);p.windExposure=inBeam&&!p.windSheltered?1:0;if(p.windSheltered)this.shelteredTime+=dt;
  if(inBeam&&!p.windSheltered&&p.blowAway?.(this.windYaw)){this.windBlows++;this.callbacks.wind?.();this.callbacks.message?.('The gust caught you. Use the penguin as a moving windbreak.',3);}
 }
 update(dt,p){this._player=p;this.penguin.riding=this.isRiding(p);this.state=p.blownTime>0?'blown':p.windSheltered?'sheltered':this.active?'wind':p.position.y>38?'summit':'climbing';}
 action(){return false;}
 onGroundPound(){return false;}
 get objective(){const p=this._player;if(p?.coldWater)return'Leave the freezing glass noodles';if(p?.position.y>38)return'Climb onto the head and collect the star';if(this.active)return'Stay behind the penguin across the bridge';return'Climb the snowman’s rice-noodle mountain';}
 context(p){if(p.coldWater)return'This pasta is freezing. Reach shore: the surface does not restore health.';if(p.windSheltered)return'The penguin blocks the gust. Match its stops and changes of pace.';if(p.blownTime>0)return'The wind blew you off. Land safely, then return behind the penguin.';if(p.position.y>30&&p.position.y<38)return'Cross in the penguin’s wind shadow, or jump onto its back.';if(p.position.y>38&&p.position.y<43)return'Chain three jumps to reach the head. Keep moving and jump again as you land.';if(p.position.y>43)return'The first star is waiting around the front of the snowman’s head.';if(p.position.y<16&&p.position.x<11&&p.position.z>15&&p.position.z<27)return p.position.x>3?'Chain three running jumps to reach the ledge above the waves.':'Jump over the moving pasta waves. Climb the ledges at the far end.';return'Go around the snowman, jump the waves, then follow the climbing ledges.';}
}
