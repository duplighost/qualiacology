import {SwimmingController} from './swimming.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const horizontal=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const difference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

// The pipe itself, including its open centre and rim, uses its original
// collision. Only touching the bottom warp volume starts this source action.
export class ThiController extends SwimmingController{
 reset(start=this._spawn){super.reset(start);this.emergingPipe=false;this.pipeDelay=0;this.pipeYaw=0;this.pipeHidden=false;}
 emergeFromPipe(start,physics){this.warp(start,{physics,preserveVitals:true});this.emergingPipe=true;this.pipeDelay=11/30;this.pipeYaw=this.yaw;this.pipeHidden=true;this.grounded=false;this.velocity={x:0,y:0,z:0};}
 update(dt,input={}){
  if(this.emergingPipe&&this.pipeDelay>0){this.pipeDelay=Math.max(0,this.pipeDelay-dt);this.pipeHidden=this.pipeDelay>0;if(!this.pipeDelay){this.velocity.y=15.6;this.velocity.x=Math.sin(this.pipeYaw)*2.4;this.velocity.z=Math.cos(this.pipeYaw)*2.4;}return{jumped:false,landed:false,groundPound:false,swimming:false};}
  const emerge=this.emergingPipe,control=emerge?{x:Math.sin(this.pipeYaw)*(2.4/7.4),z:Math.cos(this.pipeYaw)*(2.4/7.4),run:false}:input,result=super.update(dt,control);
  // ACT_WATER_JUMP is 42 source units/frame (12.6 here). Tiny Island's
  // intermediate western ledge is reached by this real surface jump.
  if(this.events.includes('swim-breach'))this.velocity.y+=12.6-8.3;
  else if(result.jumped&&!input.crouch){const speed=Math.hypot(this.velocity.x,this.velocity.z),source=[12.6+speed*.25,15.6+speed*.25,20.7][this.jumpCount];this.velocity.y+=source-[13,15,17][this.jumpCount];}
  if(emerge){this.yaw=this.pipeYaw;if(result.landed||this.grounded){this.emergingPipe=false;this.velocity.x=this.velocity.z=0;}}return result;
 }
}

export class ThiMission{
 constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.maxHealth=5;this.radius=1.6;this.flowers=course.mission.flowers.map(d=>({...d,position:point(d.position),neutralScale:d.scale||2}));const tiny=course.objects.find(o=>o.kind==='macro_fire_piranha_plant_1');this.smallFlower=tiny?{id:'tiny-flower',position:point(tiny.position),neutralScale:.5,objective:false}:null;this.reset();}
 reset(){this.area=1;this.active=false;this.state='tiny';this.health=5;this.defeatedCount=0;this.flowerCount=0;this.hitTimer=0;this.actionCooldown=0;this.pipeCooldown=0;this.pipeTransitions=0;this.fadingTransitions=0;this.fadingLock=null;this.time=0;this.starReady=false;this.starCollectible=false;this.starAge=0;this.starPosition=point(this.course.mission.star.position);this.releaseFrom=null;this.position=point(this.flowers[0].position);this.yaw=0;this.pitch=this.roll=0;this.velocity={x:0,y:0,z:0};this.attacks=0;this.maxSimultaneousFlowers=0;for(const f of[...this.flowers,...(this.smallFlower?[this.smallFlower]:[])])Object.assign(f,{state:'hidden',timer:0,scale:0,health:f.neutralScale>1?1:0,dead:false,tangible:false,yaw:0,shot:false,deathSpin:0,hitImpulse:0,attacks:0,objective:f!==this.smallFlower});}
 get objective(){return this.starReady?'Collect the star in the giant flower garden':this.area===1?'Enter the western pipe to reach Huge Island':`Defeat the giant Piranha Plants · ${this.defeatedCount} / 5`;}
 context(p){if(this.starReady)return'The five giant flowers are gone. Collect their star in the flower garden.';if(p?.emergingPipe)return'The same pipe leads to an island more than three times larger.';if(this.area===1)return'Follow the western shore. Swim and jump onto the middle ledge; chain a running jump across the gap. Jump onto the pipe rim, then drop through its centre.';return'Approach a flower to wake it. Punch its grown head, or jump onto it. Keep clear of its pasta fire.';}
 _plants(){return this.area===2?this.flowers:this.smallFlower?[this.smallFlower]:[];}
 _strike(f,p,kind){if(f.dead||!f.tangible||f.state==='dying'||p.dead)return false;f.health=0;f.state='dying';f.timer=0;f.tangible=false;f.hitImpulse=1;f.attacks++;this.attacks++;this.hitTimer=.3;this.position=point(f.position);this.callbacks.hit?.();if(kind==='stomp'){p.velocity.y=10.5;p.grounded=false;p.pounding=false;}return'hit';}
 action(p){if(this.actionCooldown>0||p.dead||p.emergingPipe)return false;this.actionCooldown=.27;for(const f of this._plants()){const d=horizontal(p.position,f.position),dy=p.position.y-f.position.y,reach=f.scale*.5+(p.radius||.43)+.82,facing=((f.position.x-p.position.x)*Math.sin(p.yaw)+(f.position.z-p.position.z)*Math.cos(p.yaw))/(d||1);if(d<reach&&dy<1.6*f.scale&&dy+(p.height||1.8)>.3*f.scale&&facing>.25){const result=this._strike(f,p,'punch');if(result)return result;}}return this.world?.attackScenery?.(p)||false;}
 onGroundPound(p){for(const f of this._plants())if(horizontal(p.position,f.position)<f.scale*.5+(p.radius||.43)&&p.position.y>=f.position.y-.15&&p.position.y<=f.position.y+1.6*f.scale+.45){const result=this._strike(f,p,'pound');if(result)return result;}return this.world?.attackScenery?.(p,true)||false;}
 _defeated(f){f.dead=true;f.state='dead';f.scale=0;f.tangible=false;const count=f.objective?2:1;for(let i=0;i<count;i++)this.world?.addCoin?.([f.position.x+(i-(count-1)/2)*.64,f.position.y+.65,f.position.z],1,{dropped:true,area:this.area});if(!f.objective)return;this.defeatedCount++;this.flowerCount=this.defeatedCount;this.health=5-this.defeatedCount;this.world?.callbacks.message?.(`${this.defeatedCount} of 5 giant pasta flowers defeated.`,2.5);if(this.defeatedCount!==5)return;this.starReady=true;this.state='star';this.starAge=0;this.releaseFrom={x:f.position.x,y:f.position.y+2.1,z:f.position.z};this.starPosition=point(this.releaseFrom);this.callbacks.defeat?.();this.world?.callbacks.message?.('All five flowers are defeated. Their star is landing in the garden.',4);}
 _flower(dt,f,p,activeCount){if(f.dead)return activeCount;f.timer+=dt;f.hitImpulse=Math.max(0,f.hitImpulse-dt*1.6);const d=Math.hypot(f.position.x-p.position.x,f.position.y-p.position.y,f.position.z-p.position.z);
  if(f.state==='hidden'){f.tangible=false;if(f.timer>100/30&&d>1&&d<8&&activeCount<2){f.state='growing';f.timer=0;f.shot=false;activeCount++;}}
  else if(f.state==='growing'){f.scale=Math.min(f.neutralScale,f.scale+.04*f.neutralScale*30*dt);if(f.timer<50/30){const yaw=Math.atan2(p.position.x-f.position.x,p.position.z-f.position.z);f.yaw+=clamp(difference(yaw,f.yaw),-dt*Math.PI*30/32,dt*Math.PI*30/32);}f.tangible=f.scale>f.neutralScale*.5;if(f.timer>=56/30&&!f.shot){f.shot=true;this.world?.fireFlame?.(f);}if(f.timer>80/30){f.state='shrinking';f.timer=0;}}
  else if(f.state==='shrinking'){f.scale=Math.max(0,f.scale-.04*f.neutralScale*30*dt);f.tangible=f.scale>f.neutralScale*.5;if(f.scale===0){f.state='hidden';f.timer=0;activeCount--;}}
  else if(f.state==='dying'){f.deathSpin+=dt*23;f.tangible=false;if(f.timer>20/30)f.scale=Math.max(0,f.scale-.04*f.neutralScale*30*dt);if(f.scale===0){this._defeated(f);activeCount--;}}
  if(f.tangible&&!p.dead){const h=1.6*f.scale,dx=horizontal(p.position,f.position);if(dx<.8*f.scale+(p.radius||.43)&&p.position.y<f.position.y+h+.1&&p.position.y+(p.height||1.8)>f.position.y+.12){if(!p.grounded&&p.velocity.y<-.3&&p.position.y>f.position.y+h-.65)this._strike(f,p,'stomp');else this.world?.callbacks.damage?.(f.position,2);}}
  return activeCount;
 }
 _pipes(p){if(this.pipeCooldown>0||p.dead||p.emergingPipe)return;for(const pipe of this.world?.activeCourse.pipes||[]){const home=point(pipe.position),d=horizontal(p.position,home);if(d<pipe.radius&&p.position.y>=home.y-.3&&p.position.y<home.y+pipe.height&&p.velocity.y<=.5){this.pipeCooldown=2;this.pipeTransitions++;this.world.setArea(pipe.destinationArea,p,{pipeNode:pipe.node});this.state=this.starReady?'star':this.area===1?'tiny':'flowers';return;}}
  if(this.area!==1)return;const warps=this.course.objects.filter(o=>o.kind==='bhvFadingWarp');if(this.fadingLock){if(horizontal(p.position,point(this.fadingLock.position))>1.3)this.fadingLock=null;else return;}if(!p.grounded||Math.hypot(p.velocity.x,p.velocity.z)>.6)return;for(const source of warps){const a=point(source.position);if(horizontal(p.position,a)<.85+(p.radius||.43)&&p.position.y<a.y+.5&&p.position.y+(p.height||1.8)>a.y){const destination=warps.find(o=>o!==source);this.fadingLock=destination;this.fadingTransitions++;this.world.teleport(p,destination);return;}}
 }
 update(dt,p){if(!p)return;dt=clamp(dt,0,.05);this.time+=dt;this.actionCooldown=Math.max(0,this.actionCooldown-dt);this.hitTimer=Math.max(0,this.hitTimer-dt);this.pipeCooldown=Math.max(0,this.pipeCooldown-dt);this._pipes(p);let count=this._plants().filter(f=>!f.dead&&f.state!=='hidden').length;for(const f of this._plants())count=this._flower(dt,f,p,count);this.maxSimultaneousFlowers=Math.max(this.maxSimultaneousFlowers,count);
  if(this.starReady){this.starAge+=dt;const destination=point(this.course.mission.star.position),age=this.starAge,t=clamp((age-21/30)/(31/30),0,1);if(age<21/30)this.starPosition=point(this.releaseFrom);else if(t<1)this.starPosition={x:this.releaseFrom.x+(destination.x-this.releaseFrom.x)*t,y:this.releaseFrom.y+(destination.y-this.releaseFrom.y)*t+Math.sin(t*Math.PI)*4,z:this.releaseFrom.z+(destination.z-this.releaseFrom.z)*t};else{const settle=age-52/30,h=settle<20/30?6*settle-4.5*settle*settle:2-3*(settle-20/30);this.starPosition={x:destination.x,y:destination.y+Math.max(0,h),z:destination.z};if(h<=0&&settle>20/30)this.starCollectible=true;}}
  this.world?.starPosition?.set(this.starPosition.x,this.starPosition.y,this.starPosition.z);
 }
}
