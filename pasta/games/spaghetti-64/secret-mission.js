import {BowserController,BowserMission} from './bowser-mission.js';
import {SlidingController} from './sliding.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const result=()=>({jumped:false,landed:false,groundPound:false,landingSpeed:0});

// Secret courses opt into these mechanics; previous course controllers are untouched.
export class SecretController extends BowserController {
 reset(start=this._spawn){super.reset(start);this.sliding=false;this.slideBlend=this.slidePitch=this.slideBank=this.slideSpeed=this.slideDistance=0;this.slideContact=this.slideBraking=false;this._slideInput={};this._slideInfo=this._slideFloor=null;this._slideAirborne=0;this.cap=null;this.capRemaining=0;this.flying=false;this.flightPitch=this.flightBank=0;this.flightSpeed=0;this.flightDistance=this.flightTime=0;this.cannon=null;this.cannonLift=0;this.cannonYaw=this.cannonPitch=0;this.cannonCooldown=0;this.cannonShots=0;this.metalDistance=0;this._flightLandingCooldown=0;if(this.secretWorld)this._secretStart();}
 setSecretWorld(world){this.secretWorld=world;this._slideSource=world.getSlideInfo;this.setWaterSource(world.getWaterInfo);this.setPoleSource(()=>world.poles);this._secretStart();return this;}
 _secretStart(){const d=this.secretWorld?.activeCourse?.mission;if(d?.initialCap)this.grantCap(d.initialCap);if(d?.initialFlying)this.launchFlight(this.yaw,.08,18);}
 grantCap(cap,seconds){this.cap=cap;this.capRemaining=seconds??(cap==='wing'?120:20);this.events.push('cap-'+cap);if(cap==='metal'){this.swimming=false;this.oxygen=1;}return true;}
 launchFlight(yaw=this.yaw,pitch=.35,speed=18){if(this.cap!=='wing')return false;this.flying=true;this.grounded=this.climbingPole=false;this.pole=null;this.yaw=yaw;this.flightPitch=pitch;this.flightSpeed=speed;this.pounding=this.diving=false;this.coyote=this.jumpBuffer=0;return true;}
 enterCannon(cannon){if(this.dead||this.cannonCooldown>0)return false;this.cannon=cannon;this.cannonLift=0;this.flying=this.climbingPole=this.grounded=false;this.pole=null;this.cannonYaw=cannon.yaw??this.yaw;this.cannonPitch=.7;this.position={x:cannon.position.x,y:cannon.position.y+.6,z:cannon.position.z};this.velocity={x:0,y:0,z:0};return true;}
 knockback(dx,dz,n=1){if(this.cap==='metal'||this.cap==='vanish')return false;const h=super.knockback(dx,dz,n);if(h){this.flying=false;this.cannon=null;}return h;}
 _isSubmerged(info){return this.cap==='metal'?false:super._isSubmerged(info);}
 _updateBreath(dt){if(this.cap==='metal'){this.oxygen=1;this._drownClock=0;return;}super._updateBreath(dt);}
 _sampleSlide(){return SlidingController.prototype._sampleSlide.call(this);}
 _slideStep(dt,input,r,info){const before=r.jumped;SlidingController.prototype._slideStep.call(this,dt,input,r,info);if(r.jumped&&!before){this.velocity.y+=3;this.position.y+=3*dt;}}
 _step(dt,input,r){if(this.secretWorld?.activeCourse.id==='pss')SlidingController.prototype._step.call(this,dt,input,r);else super._step(dt,input,r);}
 update(dt,input={}){
  dt=clamp(dt||0,0,.1);this.cannonCooldown=Math.max(0,this.cannonCooldown-dt);this._flightLandingCooldown=Math.max(0,this._flightLandingCooldown-dt);
  if(!this.dead&&this.capRemaining>0){this.capRemaining=Math.max(0,this.capRemaining-dt);if(!this.capRemaining){this.cap=null;this.flying=false;this.events.push('cap-expired');}}
  if(this.secretWorld?.activeCourse.id==='pss')return SlidingController.prototype.update.call(this,dt,input);
  if(this.cannon&&!this.dead){this.events=[];this.time+=dt;this.cannonLift=clamp((this.cannonLift||0)+dt/(68/30),0,1);this.position.y=this.cannon.position.y+.6+this.cannonLift*3.4;this.cannonYaw-=clamp(input.flightTurn??input.rawAxisX??0,-1,1)*1.2*dt;this.cannonPitch=clamp(this.cannonPitch-clamp(input.flightPitch??input.rawAxisY??0,-1,1)*.8*dt,-.05,1.45);this.yaw=this.cannonYaw;const r=result();
   if(input.jump&&this.cannonLift>=1){const cannon=this.cannon;this.cannon=null;this.cannonCooldown=1.5;this.cannonShots++;this.position.x+=Math.sin(this.cannonYaw)*1.6;this.position.y+=1.2;this.position.z+=Math.cos(this.cannonYaw)*1.6;this.velocity={x:Math.sin(this.cannonYaw)*Math.cos(this.cannonPitch)*32,y:Math.sin(this.cannonPitch)*32,z:Math.cos(this.cannonYaw)*Math.cos(this.cannonPitch)*32};this.launchFlight(this.cannonYaw,this.cannonPitch,32);this.grounded=false;this.events.push('cannon-fire');cannon.fired++;r.jumped=true;}return r;}
  if(this.flying&&!this.dead){if(input.groundPound||input.dive){this.flying=false;this._flightLandingCooldown=.35;return super.update(dt,{...input,dive:false});}return this._flightUpdate(dt,input);}
  const r=super.update(dt,input);
  if(r.jumped&&this.cap==='wing'&&(this.jumpCount===2||input.crouch)&&this._flightLandingCooldown<=0){this.launchFlight(this.yaw,.60,18);this.events.push('wing-takeoff');}
  if(this.cap==='metal'&&this._waterInfo&&this.position.y<this._waterInfo.level){this.metalDistance+=this.speed*dt;this.oxygen=1;this.swimming=false;}
  return r;
 }
 _flightUpdate(dt,input){
  this.events=[];this.time+=dt;this.invincible=Math.max(0,this.invincible-dt);this.flightTime+=dt;this.grounded=this.swimming=false;this.airTime+=dt;const r=result(),p=this.position;
  const turn=clamp(input.flightTurn??input.rawAxisX??0,-1,1),pitchInput=clamp(input.flightPitch??input.rawAxisY??0,-1,1);
  this.yaw-=turn*1.35*dt;const desired=clamp(-pitchInput*.9+(input.swimUp?.60:0)-(input.swimDown?.75:0)-.055,-1.15,1.12);this.flightPitch+=(desired-this.flightPitch)*(1-Math.exp(-2.8*dt));this.flightBank+=(-turn*.75-this.flightBank)*(1-Math.exp(-5*dt));
  // Climbing trades speed for height; diving rebuilds airspeed. This is a bounded
  // lift/drag model, not the console's bit-exact flight integrator.
  this.flightSpeed=clamp(this.flightSpeed+(-Math.sin(this.flightPitch)*7.8+(18-this.flightSpeed)*.22)*dt,8,34);
  let vertical=Math.sin(this.flightPitch)*this.flightSpeed-(this.flightSpeed<12?(12-this.flightSpeed)*.7:0);
  this.velocity.x=Math.sin(this.yaw)*Math.cos(this.flightPitch)*this.flightSpeed;this.velocity.z=Math.cos(this.yaw)*Math.cos(this.flightPitch)*this.flightSpeed;this.velocity.y=vertical;const count=Math.max(1,Math.ceil(dt/.012));
  for(let i=0;i<count;i++){const h=dt/count,old={...p};p.x+=this.velocity.x*h;p.y+=vertical*h;p.z+=this.velocity.z*h;const wall=this.physics.resolveWalls(p,this.radius,this.height);
   if(wall.hit){this.flightSpeed=Math.max(8,this.flightSpeed*.88);this.flightPitch=-.18;}
   const ceiling=this.physics.ceilingAt(p.x,p.z,old.y+this.height-.05);if(ceiling&&p.y+this.height>ceiling.height&&vertical>0){p.y=ceiling.height-this.height-.02;this.flightPitch=-.3;vertical=-1;}
   const floor=this.physics.groundAt(p.x,p.z,old.y+.2);if(floor&&floor.height>=p.y&&old.y>=floor.height-.1&&vertical<=0){p.y=floor.height;this.velocity.y=0;this.flying=false;this.grounded=floor.walkable;this.surface=floor.surface;this.groundNormal=floor.normal;this.coyote=.115;this._flightLandingCooldown=.3;r.landed=true;r.landingSpeed=-vertical;this.events.push('land');break;}
   this.flightDistance+=Math.hypot(p.x-old.x,p.y-old.y,p.z-old.z);
  }
  this.speed=this.flightSpeed;this.swimPitch=-this.flightPitch;this.squash*=Math.exp(-10*dt);if(p.y<this.killFloorY||(this.grounded&&this.surface.includes('DEATH_PLANE'))){this.health=0;this.dead=true;this.flying=false;this.events.push('death');}return r;
 }
}

export class SecretMission extends BowserMission {
 reset(){super.reset();this.timerStarted=false;this.timerFinished=false;this.slideTime=0;this.speedStarReady=false;this.speedStarCollected=false;this.speedStarAge=0;this.speedStarPosition=point(this.course.mission.speedStarPosition||this.course.mission.star.position);this.boxOpened=false;this.primaryCollected=false;}
 update(dt,p){
  if(p.dead)return;this._player=p;
  if(this.course.id!=='pss'){super.update(dt,p);return;}
  this.actionCooldown=Math.max(0,this.actionCooldown-dt);const floor=this.physics.groundAt(p.position.x,p.position.z,p.position.y+.1),touching=floor&&p.position.y-floor.height<1;
  if(touching&&floor.surface==='SURFACE_TIMER_START'&&!this.timerStarted&&!this.timerFinished){this.timerStarted=true;this.slideTime=0;this.world?.callbacks.message?.('The slide timer has started. Finish in under 21 seconds for the second star.',4);}
  if(this.timerStarted&&!this.timerFinished)this.slideTime+=dt;
  if(touching&&floor.surface==='SURFACE_TIMER_END'&&this.timerStarted&&!this.timerFinished){this.timerFinished=true;this.timerStarted=false;if(this.slideTime<21){this.speedStarReady=true;this.speedStarAge=0;this.world?.callbacks.message?.(`Finished in ${this.slideTime.toFixed(2)} seconds! The second star is appearing.`,5);}else this.world?.callbacks.message?.(`Finished in ${this.slideTime.toFixed(2)} seconds. Break the box for the first star.`,4);}
  if(this.starReady&&!this.starCollectible){this.releaseAge+=dt;this.starPosition.y=this.home.y+Math.sin(Math.min(1,this.releaseAge/1.8)*Math.PI)*1.8;if(this.releaseAge>=1.8){this.starPosition=point(this.home);this.starCollectible=true;}}
  if(this.speedStarReady&&!this.speedStarCollected){this.speedStarAge+=dt;if(this.speedStarAge>2&&Math.hypot(p.position.x-this.speedStarPosition.x,p.position.z-this.speedStarPosition.z)<1.3&&Math.abs(p.position.y+1-this.speedStarPosition.y)<2.2){this.speedStarCollected=true;this.world?.callbacks.reward?.({id:'pss-speed',type:'secret',time:this.slideTime});this.world?.callbacks.message?.('The under-21-second pasta star is yours.',4);}}
 }
 releaseBox(){if(this.boxOpened)return false;this.boxOpened=this.starReady=true;this.starCollectible=false;this.releaseAge=0;this.releaseCount++;this.callbacks.defeat?.();return true;}
 get objective(){if(this.course.id==='pss')return this.starReady?'Collect the star above the finish box':this.timerFinished?'Break the finish box for your first star':this.timerStarted?`Slide to the finish · ${this.slideTime.toFixed(2)} / 21.00 seconds`:'Enter the slide. Reach the finish box.';return super.objective;}
 context(p){if(p.cannon)return p.cannonLift<1?'The rigatoni cannon is rising. Aim with the stick / WASD.':'Aim with the stick / WASD. Jump fires the cannon.';if(p.flying)return'Steer left/right. Forward points down; backward pulls up. POUND folds the wings to land.';if(p.cap==='metal'&&p.underwater)return'Dense dried pasta sinks. Walk along the riverbed; the current cannot carry you.';if(this.course.id==='pss')return p.sliding?'Steer down the pasta chute. Hold POUND / Ctrl to brake; hold run to tuck.':'Break the box at the bottom. A run under 21 seconds reveals a second star.';if(this.course.id==='vcutm'&&p.position.x>35)return'Press the blue pasta switch, take a fresh cap from its box, and pass through the loose noodle cage.';return this.world?.courseHint?.(p)||super.context(p);}
 action(p){if(p.dead||this.actionCooldown>0)return false;this.actionCooldown=.25;return this.world?.attackScenery?.(p)||false;}
 onGroundPound(p){return this.world?.attackScenery?.(p,true)||false;}
}
