import {SwimmingController} from './swimming.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const xyz=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const horizontal=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export class WdwController extends SwimmingController {
  // mario.c initializes ACT_WATER_JUMP with 42 source units/frame. This
  // source-sized impulse lets Mario board the original .64 m floating decks.
  update(dt,input={}){const water=this._refreshWater();this._sourceWaterJumpPending=!!(water&&input.jump&&this._isSubmerged(water)&&this._breachCooldown<=Math.min(dt,.1)&&this.position.y>=water.level-1.24&&!this.dead&&!this.disabled);return super.update(dt,input);}
  _step(dt,input,result){if(this._sourceWaterJumpPending&&this._breachTimer>0){this.velocity.y=12.6;this._sourceWaterJumpPending=false;}super._step(dt,input,result);}
}

// Water controls respond to physical contact. The star is inside the source
// exclamation box; neither water level nor a particular route gates its release.
export class WdwMission {
  constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.world=null;this.reset();}
  reset(){
    this.time=0;this.area=1;this.state='water';this.position=xyz(this.course.mission.starBox.position);this.yaw=0;this.health=this.maxHealth=1;this.active=this.held=false;this.hitTimer=0;
    this.waterLevel=this.course.mission.water.initialLevel;this.waterTarget=this.waterLevel;this.maxWaterLevel=28.16;this.minWaterLevel=.31;this.waterSurface=this.waterLevel;this.changingWater=false;this.activeDiamond=null;this.activatedDiamonds=new Set();this.waterChanges=0;
    this.diamonds=this.course.mission.water.diamonds.map((d,i)=>({...d,id:i,position:xyz(d.position),angle:0,state:'idle'}));
    this.boxPosition=xyz(this.course.mission.starBox.position);this.boxBroken=false;this.boxAge=0;this.boxRise=0;this.starReady=this.starCollectible=false;this.starPosition=xyz(this.course.mission.star.position);this.starPhase=0;this.starVelocity=0;this.starReleases=0;
    this.switches=new Map((this.course.dynamic||[]).filter(d=>d.type==='switch').map(d=>[d.id,{id:d.id,position:xyz(d.position),state:'idle',age:0,press:0,remaining:0,activation:0,stepsAge:Infinity}]));this.brokenBoxes=new Set();this._lastPlayer=null;this._previousHead=null;this.actionCooldown=0;
  }
  get diamondCount(){return this.activatedDiamonds.size;}
  get objective(){if(this.starReady)return 'Collect the star above the pasta platform';if(this.waterLevel<17)return 'Touch a diamond to raise the glass noodles';return 'Cross the arrow lifts and break the star box';}
  context(p){
    if(this.starReady)return this.starCollectible?'The star is ready above the box platform':'The star is settling. Stay on the platform.';
    if(this.boxBroken)return 'The pasta box is opening!';
    if(this.changingWater)return 'The glass noodles are moving to '+this.waterTarget.toFixed(1)+' m';
    if(horizontal(p.position,this.boxPosition)<5)return 'Jump into the box, or jump and PUNCH to release the star';
    const d=this.diamonds.find(d=>horizontal(p.position,d.position)<5&&Math.abs(p.position.y-d.position.y)<4);
    if(d)return 'Touch the pasta diamond to set the water to '+d.target.toFixed(1)+' m';
    const floor=this.physics.groundAt(p.position.x,p.position.z,p.position.y+.12);
    if(floor?.triangle.dynamic?.includes('arrow_lift'))return 'Stay on the arrow lift to move it. Jump to the next one.';
    if(this.waterLevel<17)return 'The purple switch reveals steps toward the raised water diamond';
    return 'Use the floating platform and two tall blocks to reach the arrow lifts';
  }
  touchingDiamond(d,p){return horizontal(d.position,p.position)<.70+(p.radius||.43)&&p.position.y<d.position.y+.30&&p.position.y+(p.height||1.8)>d.position.y;}
  onSwitch(s,p){if(!p.grounded||p.swimming)return false;const f=this.physics.groundAt(p.position.x,p.position.z,p.position.y+.12);return f?.triangle.dynamic===s.id&&horizontal(p.position,s.position)<1.275&&Math.abs(p.position.y-f.height)<.14;}
  preStep(dt,p){
    dt=clamp(dt,0,.1);this.time+=dt;this.actionCooldown=Math.max(0,this.actionCooldown-dt);this.hitTimer=Math.max(0,this.hitTimer-dt);
    if(this.changingWater&&this.activeDiamond!==null){const d=this.diamonds[this.activeDiamond],delta=this.waterTarget-this.waterLevel,step=this.course.mission.water.speed*dt,rotation=Math.PI*2*30/32*dt;this.waterLevel+=Math.sign(delta)*Math.min(Math.abs(delta),step);
      if(Math.abs(this.waterTarget-this.waterLevel)>1e-6)d.angle+=rotation;
      else{this.waterLevel=this.waterTarget;if(d.state!=='waiting'){const phase=((d.angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2),remaining=phase<1e-6?0:Math.PI*2-phase;if(remaining<=rotation){d.angle+=remaining;d.state='waiting';}else d.angle+=rotation;}if(d.state==='waiting'&&(!p||!this.touchingDiamond(d,p))){this.changingWater=false;d.state='idle';this.activeDiamond=null;}}
    }
    this.waterSurface=this.waterLevel+(this.time>10/30?Math.sin((this.time-10/30)*this.course.mission.water.waveRadiansPerSecond)*this.course.mission.water.waveAmplitude:0);
    for(const s of this.switches.values()){
      s.age+=dt;if(Number.isFinite(s.stepsAge))s.stepsAge+=dt;
      if(s.state==='pressing'){s.press=clamp(s.age/.1,0,1);if(s.age>=.1){s.state='ticking';s.age=0;s.remaining=401/30;s.stepsAge=0;s.activation++;this.world?.rearmSwitch?.(s.id);this.callbacks.switch?.();}}
      else if(s.state==='ticking'){s.remaining=Math.max(0,401/30-s.age);if(!s.remaining){s.state='waiting';s.age=0;}}
      else if(s.state==='waiting'&&p&&!this.onSwitch(s,p)){s.state='releasing';s.age=0;}
      else if(s.state==='releasing'){s.press=1-clamp(s.age/.1,0,1);if(s.age>=.1){s.press=0;s.state='idle';s.age=0;}}
    }
    if(p)this._previousHead={x:p.position.x,y:p.position.y+(p.height||1.8),z:p.position.z,vy:p.velocity.y,grounded:p.grounded};
  }
  breakBox(p,kind='punch'){
    if(this.boxBroken||p.dead||p.swimming)return false;
    const b=this.boxPosition,dx=b.x-p.position.x,dz=b.z-p.position.z;
    if(horizontal(p.position,b)>1.7||p.position.y>b.y+1.2||p.position.y+(p.height||1.8)<b.y+.48)return false;
    if(kind==='punch'&&dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw)<-.2)return false;
    this.boxBroken=true;this.boxAge=0;this.state='star-box';this.physics.setDynamicEnabled(this.course.mission.starBox.id,false);this.world?.burst?.(b,.8);this.callbacks.boxBroken?.(b);this.callbacks.message?.('The pasta box is open. Wait for the star to settle, then jump to collect it.',4);return true;
  }
  update(dt,p){
    if(!p||p.dead)return;dt=clamp(dt,0,.1);this._lastPlayer=p;this.active=horizontal(p.position,this.boxPosition)<24;
    if(this.time>11/30&&!this.changingWater){const d=this.diamonds.find(d=>this.touchingDiamond(d,p));if(d){this.activeDiamond=d.id;d.state='changing';this.changingWater=true;this.waterTarget=d.target;this.activatedDiamonds.add(d.id);this.waterChanges++;this.callbacks.waterChanged?.(d.target);this.callbacks.message?.('The glass noodles are moving to '+d.target.toFixed(1)+' m.',3);}}
    for(const s of this.switches.values())if(s.state==='idle'&&this.onSwitch(s,p)){s.state='pressing';s.age=0;}
    if(!this.boxBroken&&this._previousHead&&!p.swimming&&!p.grounded){const b=this.boxPosition,head=p.position.y+(p.height||1.8),near=Math.abs(p.position.x-b.x)<.52+(p.radius||.43)&&Math.abs(p.position.z-b.z)<.52+(p.radius||.43);
      if(near&&this._previousHead.vy>0&&head>=b.y+.56&&head<=b.y+1.06&&this._previousHead.y<=b.y+.70)this.breakBox(p,'head');
    }
    if(this.boxBroken&&!this.starReady){this.boxAge+=dt;this.boxRise=.72*Math.sin(clamp(this.boxAge/(4/30),0,1)*Math.PI/2);if(this.boxAge>=this.course.mission.starBox.breakDelay){this.starReady=true;this.starReleases++;this.state='star';this.starPosition={x:this.boxPosition.x,y:this.boxPosition.y+.72,z:this.boxPosition.z};this.starHomeY=this.starPosition.y;this.starVelocity=15;this.starPhase=0;this.callbacks.defeat?.();}}
    if(this.starReady&&!this.starCollectible){const g=this.starPhase===0?36:9;this.starVelocity-=g*dt;if(this.starPhase===1)this.starVelocity=Math.max(-1.2,this.starVelocity);this.starPosition.y+=this.starVelocity*dt;
      if(this.starVelocity<0&&this.starPosition.y<=this.starHomeY){this.starPosition.y=this.starHomeY;if(this.starPhase===0){this.starPhase=1;this.starVelocity=6;}else{this.starPhase=2;this.starCollectible=true;this.starVelocity=0;}}
    }
    if(!this.boxBroken)this.state=this.changingWater?'changing-water':'arrow-lifts';
  }
  action(p){if(this.actionCooldown>0||p.dead)return false;this.actionCooldown=.25;if(this.breakBox(p))return 'opened';return this.world?.attackBox?.(p,false)||false;}
  onGroundPound(p){return this.breakBox(p,'pound')||this.world?.attackBox?.(p,true)||false;}
}
