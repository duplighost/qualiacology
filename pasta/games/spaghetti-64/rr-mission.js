import {TtmController} from './ttm-mission.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};

// Rainbow Ride retains the source launch speeds, 30 Hz gravity and original
// airborne entrance. The visible spaghetti's deformation is handled separately.
export class RrController extends TtmController{
 constructor(physics,start,options={}){super(physics,start,{killFloorY:-85,...options});}
 reset(start=this._spawn){super.reset(start?.entryPosition?{...start,position:start.entryPosition}:start);this.pole=null;this.poleCooldown=0;this.windExposure=0;}
 update(dt,input={}){
  this.poleCooldown=Math.max(0,this.poleCooldown-dt);
  if(!this.dead&&!this.disabled&&this.pole){
   const pole=this.pole,p=this.position,move=Math.hypot(input.x||0,input.z||0),result={jumped:false,groundPound:false};this.events=[];
   this.invincible=Math.max(0,this.invincible-dt);
   if(input.jump){const angle=move>.05?Math.atan2(input.x,input.z):this.yaw;p.x=pole.position.x+Math.sin(angle)*.78;p.z=pole.position.z+Math.cos(angle)*.78;this.yaw=angle;this.velocity.x=Math.sin(angle)*5.5;this.velocity.z=Math.cos(angle)*5.5;this.velocity.y=12.6;this.pole=null;this.poleCooldown=.6;this.grounded=false;this.jumpHeld=true;result.jumped=true;this.events.push('jump');}
   else{p.y=clamp(p.y+(input.crouch?-3.2:move*3.2)*dt,pole.position.y,pole.position.y+pole.height);p.x=pole.position.x+Math.sin(this.yaw)*.43;p.z=pole.position.z+Math.cos(this.yaw)*.43;this.velocity.x=this.velocity.y=this.velocity.z=0;this.grounded=false;this.pounding=false;this.action='climbing';if(input.crouch&&p.y<=pole.position.y+.02){this.pole=null;this.poleCooldown=.3;}}
   return result;
  }
  const result=super.update(dt,input);
  if(!this.dead&&!this.disabled&&!this.grounded&&!this.pounding&&!this.poleCooldown){for(const pole of this.physics.rrPoles||[]){const p=this.position;if(Math.hypot(p.x-pole.position.x,p.z-pole.position.z)<.62&&p.y>pole.position.y+.15&&p.y<pole.position.y+pole.height){this.pole=pole;this.velocity.x=this.velocity.y=this.velocity.z=0;this.action='climbing';break;}}}
  return result;
 }
 _step(dt,input,result){
  super._step(dt,input,result);
  const p=this.position,floor=this.physics.groundAt(p.x,p.z,p.y+.12);
  if(!this.dead&&this.grounded&&floor?.surface==='SURFACE_HORIZONTAL_WIND'){
   const force=this.physics.rrWindForce?.get(floor.triangle)||0,angle=((force<<8)&65535)*Math.PI*2/65536,speed=Math.hypot(this.velocity.x,this.velocity.z);let push;
   if(speed>.1){const along=Math.cos(this.yaw-angle);push=(speed/.3)*.5*Math.abs(along);}else push=3.2+Math.floor((this.physics.rrTime||0)*30)%4;
   p.x+=Math.sin(angle)*push*.3*dt;p.z+=Math.cos(angle)*push*.3*dt;this.physics.resolveWalls(p,this.radius,this.height);this.windExposure+=dt;
  }
 }
}

export class RrMission{
 constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.world=null;this.reset();}
 reset(){this.position=point(this.course.mission.star.position);this.home=point(this.position);this.starPosition=point(this.position);this.starReady=this.starCollectible=true;this.yaw=0;this.active=false;this.health=this.maxHealth=0;this.held=false;this.state='boarding';this.highestY=this.course.start.position[1];this.climbFraction=0;this.actionCooldown=0;this.carpetsRidden=new Set();}
 update(dt,p){this.actionCooldown=Math.max(0,this.actionCooldown-dt);this.highestY=Math.max(this.highestY,p.position.y);this.climbFraction=clamp((this.highestY-this.course.start.position[1])/(32.91-this.course.start.position[1]),0,1);const carpet=this.world?.carpets.find(c=>c.riding);if(carpet)this.carpetsRidden.add(carpet.d.pathIndex);this.state=p.position.y>28?'cruiser':carpet?'riding':p.pole?'climbing':p.position.y>22?'boarding-cruiser':p.position.y>7?'junction':'boarding';}
 get objective(){return this.state==='cruiser'?'Cross the windy cruiser to its bow star':this.state==='boarding-cruiser'?'Cross the falling pasta tiles and board the cruiser':this.state==='junction'?'Take the right carpet toward the cruiser':this.state==='riding'?'Stay aboard · Jump over obstacles · Return to the carpet':'Ride the carpets and climb toward the cruiser';}
 context(p){const c=this.world?.carpets.find(c=>c.riding);if(p.pole)return'Move to climb the spaghetti pole. Crouch to descend; jump to leave it.';if(c?.state==='fall')return'Jump off! This carpet has reached the end of its route.';if(c)return c.d.pathIndex===7?'Stay on this carpet through the spiral. Jump past obstacles, then land back on it.':c.d.pathIndex===1?'Ride to the carpet junction. Jump over the raised obstacles along the way.':'Ride the first carpet, then cross the rotating platforms to the next one.';if(p.position.y>28)return'The wind pushes along the cruiser. The first star waits at its bow.';if(p.position.y>22)return'The small pasta tiles fall after you stand on them. Keep moving toward the ship.';if(p.position.y>7)return'The right carpet circles upward toward the cruiser. The left one heads to the big house.';return null;}
 action(p){if(this.actionCooldown>0||p.dead)return false;this.actionCooldown=.25;return this.world?.attackScenery?.(p)||false;}
 onGroundPound(p){return this.world?.attackScenery?.(p,true)||false;}
}
