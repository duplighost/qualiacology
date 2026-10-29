import {HmcController} from './hmc-mission.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};

// The source updraft acts above tagged floor triangles. It remains a force,
// never a position warp or a requirement for collecting the summit star.
export class TtmController extends HmcController{
 reset(start){super.reset(start);this.updraft=false;this.quicksandDepth=0;this.slopeContact=false;}
 _step(dt,input,result){
  const p=this.position,oldY=p.y,oldFloor=this.physics.groundAt(p.x,p.z,p.y+.10),speed=Math.hypot(this.velocity.x,this.velocity.z),canJump=this.jumpBuffer>0&&this.coyote>0&&!this.disabled&&!this.dead&&!this.swimming,longJump=input.crouch&&speed>2.4;
  super._step(dt,input,result);
  // Source launch velocities use 30 Hz source frames. Long jumps have half
  // the ordinary gravity (2 rather than 4 source units/frame²), essential
  // for the original broad break in the upper trail.
  if(canJump&&result.jumped){const target=longJump?9:input.crouch?18.6:this.jumpCount===2?20.7:(this.jumpCount===1?15.6:12.6)+speed*.25,base=longJump?9.7:[13,15,17][this.jumpCount],delta=target-base;this.velocity.y+=delta;p.y+=delta*dt;}
  if(!this.swimming&&!this.grounded&&!this.pounding){const correction=this.longJumpCoasting?10.5:-7.5;this.velocity.y+=correction*dt;p.y+=correction*dt*dt;}
  const floor=this.physics.groundAt(p.x,p.z,p.y+.4);this.updraft=false;
  if(!this.dead&&!this.swimming&&floor?.surface==='SURFACE_VERTICAL_WIND'&&!this.pounding){
   const offset=p.y+15;
   if(offset>-30&&offset<20){const target=offset>=0?30/(offset+2):15;this.velocity.y=Math.min(target,this.velocity.y+target/8*30*dt);this.grounded=false;this.updraft=true;}
  }
  const swept=this.physics.groundAt(p.x,p.z,oldY+.65);
  if(!this.swimming&&oldFloor&&oldY>=oldFloor.height-.04&&swept&&!swept.walkable&&swept.surface.includes('SLIPPERY')&&p.y<swept.height&&swept.height-oldFloor.height<.65){p.y=swept.height;this.velocity.y=0;this.surface=swept.surface;this.groundNormal=swept.normal;}
  const contact=this.physics.groundAt(p.x,p.z,p.y+.08);this.slopeContact=!this.swimming&&!this.dead&&!!contact&&!contact.walkable&&Math.abs(p.y-contact.height)<.03&&Math.abs(this.velocity.y)<.1;if(this.slopeContact)this.coyote=.115;
  if(this.grounded&&floor?.surface==='SURFACE_SHALLOW_QUICKSAND'){this.quicksandDepth=Math.min(.1,this.quicksandDepth+.15*dt);this.velocity.x*=Math.exp(-1.5*dt);this.velocity.z*=Math.exp(-1.5*dt);}else this.quicksandDepth=Math.max(0,this.quicksandDepth-dt*3);
 }
 update(dt,input={}){const r=super.update(dt,input);if(r.jumped){this.quicksandDepth=0;if(this.events.includes('swim-breach')){this.velocity.y+=4.3;this.position.y+=4.3*Math.min(dt,.1);}}return r;}
}

export class TtmMission{
 constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.world=null;this.reset();}
 reset(){this.position=point(this.course.mission.star.position);this.home=point(this.position);this.yaw=0;this.state='climbing';this.active=false;this.health=this.maxHealth=0;this.held=false;this.starReady=this.starCollectible=true;this.starPosition=point(this.position);this.highestY=this.course.start.position[1];this.climbFraction=0;this.logCrossed=false;this.windEncountered=false;this.actionCooldown=0;}
 update(dt,p){this.actionCooldown=Math.max(0,this.actionCooldown-dt);this.highestY=Math.max(this.highestY,p.position.y);this.climbFraction=clamp((this.highestY-this.course.start.position[1])/(23.49-this.course.start.position[1]),0,1);this.state=p.position.y>20?'summit':p.updraft?'updraft':p.swimming?'swimming':'climbing';if(this.world?.log?.riding)this.logCrossed=true;if(this.world?.fwoosh?.blowing)this.windEncountered=true;}
 get objective(){return this.state==='summit'?'Collect the star above the summit':this.state==='updraft'?'Steer out of the rising noodle wind':this.highestY<-20?'Follow the winding mountain trail':this.highestY<0?'Cross the log and climb past the rolling pasta balls':'Keep climbing to the summit star';}
 context(p){if(this.world?.log?.riding)return'Keep your balance. Your weight rolls the braided pasta log.';if(this.world?.fwoosh?.blowing&&Math.hypot(p.position.x-this.world.fwoosh.position.x,p.position.z-this.world.fwoosh.position.z)<12)return'Fwoosh is blowing! Keep moving along the narrow path.';if(p.updraft)return'The rising noodle current lifts you. Steer toward the mountain.';if(p.position.y>19)return'The first star is waiting at the summit.';if(p.position.y<-35)return'Follow the winding path up the mountain. Jump across the broken ledges.';return null;}
 action(p){if(this.actionCooldown>0||p.dead)return false;this.actionCooldown=.26;return this.world?.attackScenery?.(p)||false;}
 onGroundPound(p){return this.world?.attackScenery?.(p,true)||false;}
}
