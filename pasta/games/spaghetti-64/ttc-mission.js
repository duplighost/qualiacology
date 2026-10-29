import {HmcController} from './hmc-mission.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};

// Restore the source 30 Hz vertical impulses while retaining the shared
// browser capsule, buffered input and long-jump steering implementation.
export class TtcController extends HmcController{
 _step(dt,input,result){
  const p=this.position,speed=Math.hypot(this.velocity.x,this.velocity.z),canJump=this.jumpBuffer>0&&this.coyote>0&&!this.disabled&&!this.dead&&!this.swimming,longJump=input.crouch&&speed>2.4;
  super._step(dt,input,result);
  if(canJump&&result.jumped){const target=longJump?9:input.crouch?18.6:this.jumpCount===2?20.7:(this.jumpCount===1?15.6:12.6)+speed*.25,base=longJump?9.7:[13,15,17][this.jumpCount],delta=target-base;this.velocity.y+=delta;p.y+=delta*dt;}
  if(!this.swimming&&!this.grounded&&!this.pounding){const correction=this.longJumpCoasting?10.5:-7.5;this.velocity.y+=correction*dt;p.y+=correction*dt*dt;}
 }
}

export class TtcMission{
 constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.world=null;this.clockMode=course.mission.clock.initialMode;this.reset();}
 reset(){this.position=point(this.course.mission.star.position);this.home=point(this.position);this.starPosition=point(this.position);this.yaw=0;this.state='climbing';this.active=this.held=false;this.health=this.maxHealth=0;this.starReady=this.starCollectible=true;this.highestY=this.course.start.position[1];this.climbFraction=0;this.actionCooldown=0;this.mechanismsRidden=new Set();}
 update(dt,p){if(!p||p.dead)return;this.actionCooldown=Math.max(0,this.actionCooldown-dt);this.highestY=Math.max(this.highestY,p.position.y);this.climbFraction=clamp((this.highestY-this.course.start.position[1])/36.92,0,1);const f=this.physics.groundAt(p.position.x,p.position.z,p.position.y+.13);if(p.grounded&&f?.triangle.dynamic)this.mechanismsRidden.add(f.triangle.dynamic);this.state=p.position.y>-17?'cage':'climbing';}
 get objective(){return this.state==='cage'?'Enter the cage and collect the star':'Climb the turning pasta clockwork';}
 context(p){if(this.state==='cage')return'Follow the last conveyor into the open side of the noodle cage.';const f=this.physics.groundAt(p.position.x,p.position.z,p.position.y+.1),id=f?.triangle.dynamic||'';if(id.includes('treadmill'))return'The pasta belt carries you. Run against it and jump from the edge.';if(id.includes('rotating_cube'))return'The cube dips before turning. Time your next jump.';if(this.clockMode==='stopped')return'The clock is stopped. Its platforms hold their entry positions.';return p.position.y<-40?'Take the rising path around the clock. Jump onto the rotating cube.':null;}
 action(p){if(this.actionCooldown>0||p.dead)return false;this.actionCooldown=.25;return this.world?.attackScenery?.(p)||false;}
 onGroundPound(p){return this.world?.attackScenery?.(p,true)||false;}
}
