import {CoursePhysics} from './physics.js';
import {SwimmingController} from './swimming.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const difference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const climbable=t=>t?.surface==='SURFACE_HARD_NOT_SLIPPERY'&&t.normal.y>.01;
const key=t=>[t.a.x,t.a.y,t.a.z,t.b.x,t.b.y,t.b.z,t.c.x,t.c.y,t.c.z].join(',');

// The original pillar sides are floors, despite their near-vertical normals.
// Only this course adopts that source floor class; its vertices are unchanged.
export class SslPhysics extends CoursePhysics{
 constructor(course){super(course);const forces=new Map((course.triangles||[]).map(f=>[f.slice(0,3).flatMap(i=>course.vertices[i]).join(','),f[4]||0]));for(const t of this.triangles)t.force=forces.get(key(t))||0;this._wallView=Object.create(this);this._wallView._nearTriangles=(...args)=>this._nearTriangles(...args).filter(t=>!climbable(t));}
 groundAt(x,z,ceiling=Infinity){const f=super.groundAt(x,z,ceiling);if(f&&climbable(f.triangle))f.walkable=true;return f;}
 resolveWalls(p,r=.43,h=1.8){return super.resolveWalls.call(this._wallView,p,r,h);}
}

export class SslController extends SwimmingController{
 reset(start=this._spawn){super.reset(start);this.quicksandDepth=0;this.inQuicksand=false;this.climbingPillar=false;this.slopeContact=false;this.tornadoActive=false;this.tornadoTime=0;this._sandJump=false;}
 _step(dt,input,result){
  const p=this.position,v=this.velocity,oldY=p.y,oldFloor=this.physics.groundAt(p.x,p.z,p.y+.08);let control=input;this.climbingPillar=false;
  if(this.grounded&&!this.swimming&&!this.dead){
   const ix=Number(input.x)||0,iz=Number(input.z)||0,d=Math.hypot(ix,iz)||1,probe=this.physics.groundAt(p.x+ix/d*.12,p.z+iz/d*.12,p.y+3.5),here=this.physics.groundAt(p.x,p.z,p.y+.08),f=climbable(probe?.triangle)&&probe.normal[1]<.31?probe:climbable(here?.triangle)&&here.normal[1]<.31?here:null;
   if(f){const n=f.normal,up=-(n[0]*v.x+n[2]*v.z)/n[1],speed=Math.hypot(v.x,v.z);if(Math.abs(up)>11.5){const k=11.5/Math.abs(up);v.x*=k;v.z*=k;}const inputSlope=Math.abs(n[0]*ix+n[2]*iz)/n[1],k=inputSlope>1?Math.max(.065,Math.min(1,1.08/inputSlope)):1;control={...input,x:ix*k,z:iz*k};this.climbingPillar=true;}
   if(this.quicksandDepth>.1&&!input.jump){const k=clamp(.0625/this.quicksandDepth,.11,1);control={...control,x:(control.x||0)*k,z:(control.z||0)*k};v.x*=Math.exp(-2.6*dt);v.z*=Math.exp(-2.6*dt);}
  }
  super._step(dt,control,result);
  const swept=this.physics.groundAt(p.x,p.z,oldY+.65);if(!this.swimming&&oldFloor&&oldY>=oldFloor.height-.04&&swept&&!swept.walkable&&swept.surface.includes('SLIPPERY')&&p.y<swept.height&&swept.height-oldFloor.height<.65){p.y=swept.height;v.y=0;this.surface=swept.surface;this.groundNormal=swept.normal;}
  const contact=this.physics.groundAt(p.x,p.z,p.y+.08);this.slopeContact=!this.swimming&&!this.dead&&!!contact&&!contact.walkable&&Math.abs(p.y-contact.height)<.03&&Math.abs(v.y)<.1;
  // A sliding Mario can jump from a steep dune in the source game. Preserve
  // downhill sliding while making actual floor contact available to jump input.
  if(this.slopeContact)this.coyote=.115;
  if(this.grounded&&!this.swimming&&!this.dead){const floor=this.physics.groundAt(p.x,p.z,p.y+.08),s=floor?.surface||'';this.inQuicksand=s.includes('QUICKSAND');
   if(this.inQuicksand){const moving=Math.hypot(input.x||0,input.z||0)>.1,rate=(moving?.25:.5)*.01*30;this.quicksandDepth=Math.max(.011,this.quicksandDepth)+rate*dt;const cap=s.includes('SHALLOW_MOVING')?.25:s.includes('SHALLOW')?.10:s.includes('DEEP')?1.6:.6;this.quicksandDepth=Math.min(cap,this.quicksandDepth);
    if(s.includes('INSTANT')||(s.includes('DEEP')&&this.quicksandDepth>=1.6)){this.quicksandDepth=1.6;this.dead=true;this.health=0;this.events.push('death');}
    if(s.includes('MOVING')){const force=floor.triangle.force||0,angle=(force&255)/256*Math.PI*2,speed=[12,8,4,0][(force>>8)&3]*.3;p.x+=Math.sin(angle)*speed*dt;p.z+=Math.cos(angle)*speed*dt;}
   }else this.quicksandDepth=0;
  }else{this.inQuicksand=false;this.quicksandDepth=Math.max(0,this.quicksandDepth-dt*3);}
 }
 update(dt,input={}){const result=super.update(dt,input);if(result.jumped){this.quicksandDepth=0;this.inQuicksand=false;}this.tornadoTime=Math.max(0,(this.tornadoTime||0)-dt);this.tornadoActive=this.tornadoTime>0;return result;}
}

export class SslMission{
 constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.home=point(course.mission.bird.position);this.targets=course.mission.bird.targets.map(point);this.radius=1.6;this.maxHealth=1;this.reset();}
 reset(){this.position=point(this.home);this.velocity={x:0,y:0,z:0};this.yaw=0;this.pitch=0;this.roll=0;this.health=1;this.held=false;this.active=false;this.state='circling';this.speed=0;this.timer=0;this.time=0;this.targetIndex=0;this.target=point(this.targets[0]);this.targetTimer=0;this.nextTarget=0;this.flightPhase=0;this.hitTimer=0;this.actionCooldown=0;this.starReady=false;this.starCollectible=false;this.starAge=0;this.starPosition=point(this.course.mission.star.position);this.attacks=0;this.releaseFrom=null;this._seed=6408;this._lastPlayer=null;}
 get objective(){return this.starReady?'Collect the star beside the pyramid':this.active?'Run up a pillar and jump into Klepto':'Find Klepto above the four pillars';}
 context(p){if(this.starReady)return'Klepto dropped the star. It is beside the pyramid’s western wall.';if(p.inQuicksand)return'Keep jumping to escape the soft pasta. The dark pit swallows you immediately.';if(p.climbingPillar)return'Keep moving up the pillar. Jump into Klepto when he passes overhead.';if(p.position.y>7)return'Wait for Klepto to circle close, then jump into him. A rising head hit works.';return'Run straight up a pillar’s steep pasta sides. Jump into the bird to free the star.';}
 _random(){this._seed=(Math.imul(this._seed,1664525)+1013904223)|0;return(this._seed>>>0)/4294967296;}
 _choose(p){let index;if(distance(p.position,this.position)>20){index=0;for(let i=1;i<3;i++)if(distance(p.position,this.targets[i])<distance(p.position,this.targets[index]))index=i;}else index=Math.floor(this._random()*3);this.targetIndex=index;this.target=point(this.targets[index]);this.targetTimer=0;this.nextTarget=10+this._random()*10;this.state='approaching';}
 _strike(p,kind){if(this.starReady||this.hitTimer>0||p.dead)return false;this.attacks++;this.health=0;this.hitTimer=.6;this.state='struck';this.timer=0;this.releaseFrom=point(this.position);this.starPosition=point(this.releaseFrom);this.starReady=true;this.starCollectible=false;this.starAge=0;this.velocity={x:-Math.sin(p.yaw)*5,y:6,z:-Math.cos(p.yaw)*5};this.callbacks.hit?.();this.callbacks.defeat?.();this.world?.callbacks.message?.('The star is free! Find it beside the pyramid’s western wall.',4);return'hit';}
 action(p){if(this.actionCooldown>0||p.dead)return false;this.actionCooldown=.27;const d=distance(p.position,this.position),dy=p.position.y-this.position.y,facing=((this.position.x-p.position.x)*Math.sin(p.yaw)+(this.position.z-p.position.z)*Math.cos(p.yaw))/(d||1);if(d<1.6&&dy>-.8&&dy<2.6&&facing>-.1)return this._strike(p,'punch');return this.world?.attackScenery?.(p)||false;}
 onGroundPound(p){if(distance(p.position,this.position)<1.55&&Math.abs(p.position.y-this.position.y)<2.5)return this._strike(p,'pound');return this.world?.attackScenery?.(p,true)||false;}
 _flight(dt,p){this.targetTimer+=dt;const d=distance(this.position,this.target),toPlayer=distance(this.position,p.position);this.active=toPlayer<28;
  if(this.state==='circling'&&((this.targetTimer>2&&toPlayer>20)||this.targetTimer>=this.nextTarget))this._choose(p);
  if(this.state==='approaching'&&distance(this.position,this.target)<18)this.state='circling';
  const targetSpeed=this.state==='approaching'?15:12;this.speed=Math.min(targetSpeed,this.speed+.45*dt);
  const dx=this.target.x-this.position.x,dz=this.target.z-this.position.z,targetYaw=Math.atan2(dx,dz);let desired=targetYaw;
  if(this.state==='circling'){const radial=Math.atan2(this.position.x-this.target.x,this.position.z-this.target.z);desired=radial+Math.PI/2+clamp((d-3)*.16,-1.3,1.3);}
  const turn=clamp(difference(desired,this.yaw),-dt*2.02,dt*2.02);this.yaw+=turn;this.roll+=(clamp(-turn/Math.max(dt,.001)*.13,-.35,.35)-this.roll)*Math.min(1,dt*5);
  const vertical=clamp((this.target.y-this.position.y)*1.8,-3.8,3.8);this.velocity={x:Math.sin(this.yaw)*this.speed,y:vertical,z:Math.cos(this.yaw)*this.speed};this.position.x+=this.velocity.x*dt;this.position.z+=this.velocity.z*dt;this.position.y+=vertical*dt;this.pitch=Math.atan2(-vertical,this.speed+.2);
  // Source INTERACT_HIT_FROM_BELOW accepts rising-head and descending-foot
  // attacks. Grounded proximity alone cannot free the star.
  if(!p.grounded&&!p.dead&&distance(p.position,this.position)<1.6+p.radius){const py=p.position.y,top=py+(p.height||1.8),by=this.position.y;const rising=p.velocity.y>.3&&top>=by&&py<by+1.6,falling=p.velocity.y<-.3&&py>=by+1.3&&py<by+2.7;
   if(rising||falling){if(this._strike(p,rising?'head':'stomp')){p.velocity.y=rising?Math.min(p.velocity.y,2):9;p.pounding=false;}}
  }
 }
 update(dt,p){dt=clamp(dt,0,.05);this.time+=dt;this.timer+=dt;this.hitTimer=Math.max(0,this.hitTimer-dt);this.actionCooldown=Math.max(0,this.actionCooldown-dt);
  if(!this.starReady)this._flight(dt,p);else{
   this.starAge+=dt;const age=this.starAge,destination=point(this.course.mission.star.position),travel=clamp((age-21/30)/(31/30),0,1);
   if(age<21/30)this.starPosition=point(this.releaseFrom);
   else if(travel<1)this.starPosition={x:this.releaseFrom.x+(destination.x-this.releaseFrom.x)*travel,y:this.releaseFrom.y+(destination.y-this.releaseFrom.y)*travel+Math.sin(travel*Math.PI)*4,z:this.releaseFrom.z+(destination.z-this.releaseFrom.z)*travel};
   else{const settle=age-52/30,h=settle<20/30?6*settle-4.5*settle*settle:2-3*(settle-20/30);this.starPosition={x:destination.x,y:destination.y+Math.max(0,h),z:destination.z};if(h<=0&&settle>20/30)this.starCollectible=true;}
   if(this.state==='struck'){this.position.x+=this.velocity.x*dt;this.position.z+=this.velocity.z*dt;this.position.y+=this.velocity.y*dt;this.velocity.y-=18*dt;this.roll+=dt*1.6;if(this.timer>.6){this.state='retreat';this.timer=0;}}
   else{this.position.x+=Math.sin(this.yaw)*8*dt;this.position.z+=Math.cos(this.yaw)*8*dt;this.position.y+=3*dt;this.roll*=Math.exp(-4*dt);}
  }
  this._lastPlayer=point(p.position);
 }
}
