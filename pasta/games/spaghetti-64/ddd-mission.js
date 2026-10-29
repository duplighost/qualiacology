import {SwimmingController} from './swimming.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const xyz=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const horizontal=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// DDD's tunnel is an instant area displacement, not a respawn. Preserve the
// swimmer's velocity, facing, breath, health, animation and airborne state.
export class DddController extends SwimmingController {
  instantWarp(displacement,physics=this.physics){
    const d=xyz(displacement);this.position.x+=d.x;this.position.y+=d.y;this.position.z+=d.z;
    this.setPhysics(physics);this._refreshWater();return this;
  }
}

export class DddMission {
  constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.world=null;this.reset();}
  reset(){
    this.area=1;this.time=0;this.state='swim';this.position={x:39,y:5,z:0};this.yaw=0;this.health=this.maxHealth=1;this.held=this.active=false;this.hitTimer=0;
    this.starReady=this.starCollectible=true;this.starPosition=xyz(this.course.mission?.star?.position||[39,8.5,-6]);
    this.switchState='idle';this.switchTimer=0;this.switchPress=0;this.switchActivations=0;this.stepsAge=Infinity;this.warpCooldown=0;this.areaTransitions=0;this.whirlpoolCaught=false;this.whirlpoolTimer=0;this.brokenSteps=new Set();this._lastPlayer=null;
  }
  get switchActive(){return this.switchState==='ticking';}
  get switchRemaining(){return this.switchActive?Math.max(0,(this.course.mission?.switch?.duration||401/30)-this.switchTimer):0;}
  get stepsActive(){return this.stepsAge<(this.course.mission?.switch?.stepDuration||403/30);}
  get stepsVisible(){return this.stepsActive&&(this.stepsAge<12||Math.floor(this.stepsAge*30)%2===0);}
  get objective(){if(this.area===1)return 'Swim through the underwater tunnel';if(this.switchActive)return 'Climb the temporary pasta steps onto the sub';return 'Find the purple switch beside the submarine';}
  context(p){
    if(!p)return '';
    if(this.whirlpoolCaught)return 'Caught in the swirling noodles!';
    if(this.area===1){if(p.position.y< -35&&horizontal(p.position,{x:-31.74,z:1.02})<10)return 'Stay clear of the whirlpool. The tunnel is to the east.';if(p.position.x>0)return 'Follow the rising tunnel toward the submarine dock';return 'Dive toward the coin rings and swim into the east tunnel';}
    if(p.position.y>4&&horizontal(p.position,this.starPosition)<20)return 'The star is on the submarine. Keep climbing!';
    if(this.switchActive)return `The steps last ${Math.ceil(this.switchRemaining)} more seconds. Jump west toward the sub.`;
    if(horizontal(p.position,{x:68,z:20})<8)return 'Jump onto the purple pasta switch to reveal the steps';
    if(p.swimming)return 'Surface beside the dock, then climb onto the right-hand ledge';
    return 'Step on the purple switch beside the submarine';
  }
  onSwitch(p){
    if(this.area!==2||!p.grounded||p.swimming)return false;
    const s=this.course.mission?.switch?.position||[68,1.1,20];
    if(horizontal(p.position,{x:s[0],z:s[2]})>1.275)return false;
    const floor=this.physics.groundAt(p.position.x,p.position.z,p.position.y+.12);
    return floor?.triangle.dynamic==='ddd-purple-switch'&&Math.abs(p.position.y-floor.height)<.14;
  }
  preStep(dt,p){
    if(!p||p.dead)return;dt=clamp(dt,0,.1);this.time+=dt;this.hitTimer=Math.max(0,this.hitTimer-dt);this.warpCooldown=Math.max(0,this.warpCooldown-dt);
    if(this.area!==2)return;
    if(this.switchState==='pressing'){
      this.switchTimer+=dt;this.switchPress=clamp(this.switchTimer/.1,0,1);
      if(this.switchTimer>=.1){this.switchState='ticking';this.switchTimer=0;this.stepsAge=0;this.switchActivations++;this.brokenSteps.clear();this.callbacks.switch?.();this.callbacks.message?.('The pasta steps are here! Jump west onto the submarine.',4);}
    }else if(this.switchState==='ticking'){
      this.switchTimer+=dt;if(this.switchTimer>(this.course.mission?.switch?.duration||401/30)){this.switchState='waiting';this.switchTimer=0;}
    }else if(this.switchState==='waiting'){
      if(!this.onSwitch(p)){this.switchState='releasing';this.switchTimer=0;}
    }else if(this.switchState==='releasing'){
      this.switchTimer+=dt;this.switchPress=1-clamp(this.switchTimer/.1,0,1);if(this.switchTimer>=.1){this.switchState='idle';this.switchTimer=0;this.switchPress=0;this.brokenSteps.clear();}
    }
    if(Number.isFinite(this.stepsAge))this.stepsAge+=dt;
  }
  update(dt,p){
    if(!p||p.dead)return;this._lastPlayer=p;
    if(this.whirlpoolCaught){
      const w=this.course.mission.whirlpool.position,dx=p.position.x-w[0],dz=p.position.z-w[2],a=dt*5.8,r=Math.exp(-dt*.8);
      p.position.x=w[0]+(dx*Math.cos(a)+dz*Math.sin(a))*r;p.position.z=w[2]+(dz*Math.cos(a)-dx*Math.sin(a))*r;
      p.position.y=Math.max(w[1],p.position.y-dt*2.2);p.velocity.x=p.velocity.z=0;p.velocity.y=-1;this.whirlpoolTimer+=dt;
      if(this.whirlpoolTimer>3){p.health=0;p.dead=true;p.events?.push('death');}return;
    }
    if(this.area===1){const w=this.course.mission.whirlpool.position;if(horizontal(p.position,{x:w[0],z:w[2]})<2&&p.position.y>=w[1]-.5&&p.position.y<w[1]+5){this.whirlpoolCaught=true;this.whirlpoolTimer=0;p.disabled=true;this.callbacks.message?.('The whirlpool caught you!',3);}}
    const floor=this.physics.groundAt(p.position.x,p.position.z,p.position.y+.1),warp=this.world?.activeCourse?.instantWarps?.find(w=>w.surface===floor?.surface);
    if(warp&&this.warpCooldown<=0){this.world.setArea(warp.area,p,{warp:true,displacement:warp.displacement});this.areaTransitions++;this.warpCooldown=.12;this.state=this.area===2?'dock':'swim';this.callbacks.message?.(this.area===2?'The submarine dock. Surface and find the purple switch.':'Back in the entrance basin.',3);}
    if(this.area===2&&this.switchState==='idle'&&this.onSwitch(p)){this.switchState='pressing';this.switchTimer=0;}
    this.position=this.area===1?{x:0,y:-25,z:0}:{x:68,y:1.1,z:20};this.state=this.area===1?'swim':this.switchActive?'steps':'dock';
  }
  _breakStep(p,groundPound=false){
    if(this.area!==2||!this.stepsActive||p.swimming)return false;
    for(const d of this.course.interior.dynamic||[]){if(d.type!=='hidden_step'||this.brokenSteps.has(d.kind))continue;const[x,y,z]=d.position,dx=p.position.x-x,dz=p.position.z-z;
      if(groundPound){if(Math.abs(dx)>1.15||Math.abs(dz)>1.15||Math.abs(p.position.y-y-2)>.35)continue;}
      else{if(Math.hypot(dx,dz)>2.15||p.position.y+1.6<y||p.position.y>y+2.4)continue;const facing=Math.atan2(-dx,-dz),diff=Math.atan2(Math.sin(facing-p.yaw),Math.cos(facing-p.yaw));if(Math.abs(diff)>1.05)continue;}
      this.brokenSteps.add(d.kind);this.physics.setDynamicEnabled(d.kind,false);this.world?.burstStep?.(d);this.callbacks.boxBroken?.(xyz(d.position));return true;
    }return false;
  }
  action(p){return this._breakStep(p,false)?'opened':'none';}
  onGroundPound(p){return this._breakStep(p,true);}
}
