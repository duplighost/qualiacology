import {NoodleController} from './physics.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const EMPTY_WATER=null;

function killFloorFor(physics){
  let lowest=Infinity;
  for(const t of physics?.triangles||[])if(Number.isFinite(t.minY))lowest=Math.min(lowest,t.minY);
  return Number.isFinite(lowest)?Math.min(-40,lowest-18):-160;
}

// The land controller is unchanged. Only submerged steps use viscous drag,
// buoyancy and vertical swimming input. All motion still uses course collision.
export class SwimmingController extends NoodleController {
  constructor(physics,start,options={}){
    super(physics,start);
    this.breathSeconds=Math.max(1,Number(options.breathSeconds)||64);
    this.breathRecoverySeconds=Math.max(.25,Number(options.breathRecoverySeconds)||2.5);
    this._explicitKillFloor=finite(options.killFloorY)?Number(options.killFloorY):null;
    this._waterSource=typeof options.waterSource==='function'?options.waterSource:()=>EMPTY_WATER;
    this.setPhysics(physics);
    this._refreshWater();
  }

  reset(start=this._spawn){
    super.reset(start);
    this.swimming=false;this.underwater=false;this.waterLevel=null;this.waterDepth=0;
    this.oxygen=1;this.swimPitch=0;this.swimBlend=0;this.strokePhase=0;
    this._waterInfo=null;this._breachTimer=0;this._breachCooldown=0;
    this._swimInput={};this._swimFloorContact=false;this._drownClock=0;
    this._surfaceHeal=0;this._airWarned=false;this._physicsTriangles=null;
  }

  setPhysics(physics){
    this.physics=physics;this._physicsTriangles=physics?.triangles;
    this.killFloorY=this._explicitKillFloor??killFloorFor(physics);
    return this;
  }

  setWaterSource(source){
    this._waterSource=typeof source==='function'?source:()=>source;
    this._refreshWater();return this;
  }

  // Area transitions use this only after the player enters a real warp opening.
  // Health and breath survive passage between the bay and the flooded hold.
  warp(start,{physics=this.physics,preserveVitals=true}={}){
    const health=this.health,oxygen=this.oxygen,invincible=this.invincible;
    this.setPhysics(physics);this.reset(start);this.setPhysics(physics);
    if(preserveVitals){this.health=health;this.oxygen=oxygen;this.invincible=invincible;this.dead=health<=0;}
    this._refreshWater();this.swimming=this._isSubmerged(this._waterInfo);
    this.underwater=!!this._waterInfo&&this.position.y<this._waterInfo.level-1.4;
    this.swimBlend=this.swimming?1:0;
    return this;
  }

  refillBreath(fraction=1){
    const amount=finite(fraction)?Math.max(0,Number(fraction)):1;
    this.oxygen=clamp(this.oxygen+amount,0,1);this._drownClock=0;
    if(this.oxygen>.3)this._airWarned=false;
    return this.oxygen;
  }

  _sampleWater(){
    const p=this.position,raw=this._waterSource?.(p.x,p.z,this);
    if(raw==null||raw===false)return EMPTY_WATER;
    const info=typeof raw==='number'?{level:raw}:raw;
    const level=Number(info.level??info.surfaceY??info.waterLevel);
    if(!Number.isFinite(level)||info.enabled===false)return EMPTY_WATER;
    if(finite(info.bottom)&&p.y+this.height<Number(info.bottom))return EMPTY_WATER;
    return {...info,level};
  }

  _refreshWater(){
    this._waterInfo=this._sampleWater();this.waterLevel=this._waterInfo?.level??null;
    this.waterDepth=this._waterInfo?Math.max(0,this._waterInfo.level-this.position.y):0;
    return this._waterInfo;
  }

  _isSubmerged(info){
    if(!info||this._breachTimer>0)return false;
    const p=this.position;
    if(p.y>=info.level-(this.swimming?.56:.72))return false;
    // A knee-deep shoreline is still walkable. This also lets the lowering hold
    // water hand control back to ordinary jumping without snapping to a deck.
    const floor=this.physics.groundAt(p.x,p.z,p.y+.6);
    if(floor?.walkable&&floor.height>=info.level-1.04&&p.y-floor.height<.7)return false;
    return true;
  }

  update(dt,input={}){
    dt=clamp(Number(dt)||0,0,.1);
    if(this._physicsTriangles!==this.physics?.triangles)this.setPhysics(this.physics);
    const previousSwimming=this.swimming,info=this._refreshWater();
    const inWater=this._isSubmerged(info);
    this._breachTimer=Math.max(0,this._breachTimer-dt);
    this._breachCooldown=Math.max(0,this._breachCooldown-dt);
    this._swimInput=input;
    let breached=false;
    if(inWater&&input.jump&&this._breachCooldown<=0&&this.position.y>=info.level-1.24&&!this.disabled&&!this.dead){
      this._breachTimer=.34;this._breachCooldown=.65;this.velocity.y=8.3;
      this.grounded=false;this.swimming=false;this.pounding=false;this.diving=false;
      breached=true;
    }
    const waterInput=inWater||previousSwimming||breached;
    const control=waterInput?{...input,jump:false,groundPound:false,dive:false,crouch:false}:input;
    const result=super.update(dt,control);
    if(breached){result.jumped=true;this.events.push('swim-breach');}
    this._refreshWater();
    this.underwater=!!this._waterInfo&&this.position.y<this._waterInfo.level-1.4;
    if(this.swimming&&!previousSwimming){result.enteredWater=true;this.events.push('water-enter');}
    if(!this.swimming&&previousSwimming){result.leftWater=true;this.events.push('water-exit');}
    this._updateBreath(dt);
    const blendTarget=this.swimming?1:0;
    this.swimBlend+=(blendTarget-this.swimBlend)*(1-Math.exp(-7*dt));
    const speed=Math.hypot(this.velocity.x,this.velocity.z);
    const pitchTarget=this.swimming?clamp(-Math.atan2(this.velocity.y,speed+.7),-.9,.9):0;
    this.swimPitch+=(pitchTarget-this.swimPitch)*(1-Math.exp(-5*dt));
    if(this.swimming)this.strokePhase+=dt*(2.3+speed*.5+Math.abs(this.velocity.y)*.28);
    result.swimming=this.swimming;result.underwater=this.underwater;result.oxygen=this.oxygen;
    return result;
  }

  _step(dt,input,result){
    const info=this._refreshWater(),submerged=this._isSubmerged(info);
    if(submerged){
      if(!this.swimming){this.velocity.y=clamp(this.velocity.y*.45,-6.8,5.2);this.squashVelocity+=.65;}
      this.swimming=true;this._swimStep(dt,input,result,info);
    }else{
      this.swimming=false;this._swimFloorContact=false;
      super._step(dt,input,result);
    }
  }

  _swimStep(dt,input,result,info){
    const p=this.position,v=this.velocity,oldY=p.y,cooking=this.cookingSoftness;
    const enabled=!this.disabled&&!this.dead,original=this._swimInput;
    let ix=enabled?(Number(input.x)||0):0,iz=enabled?(Number(input.z)||0):0;
    const inputLength=Math.hypot(ix,iz);if(inputLength>1){ix/=inputLength;iz/=inputLength;}
    const up=enabled?Number(original.swimUp??original.jump??0):0;
    const down=enabled?Number(original.swimDown??original.crouch??original.groundPound??0):0;
    const vertical=clamp((Number.isFinite(up)?up:0)-(Number.isFinite(down)?down:0),-1,1);
    const flow=info.flow||{},flowX=Number(flow.x)||0,flowY=Number(flow.y)||0,flowZ=Number(flow.z)||0;
    const moving=inputLength>.04,speed=(input.run?5.5:4.55)*(1-.12*cooking);
    const stroke=.93+.07*Math.sin(this.strokePhase);
    const targetX=flowX+ix*speed*stroke,targetZ=flowZ+iz*speed*stroke;
    const drag=2.5+cooking*.6,factor=1-Math.exp(-drag*dt);
    v.x+=(targetX-v.x)*factor;v.z+=(targetZ-v.z)*factor;
    const targetY=flowY+(vertical>0?vertical*4.8:vertical<0?vertical*5.4:.2);
    v.y+=(targetY-v.y)*(1-Math.exp(-(2.8+cooking*.5)*dt));
    if(moving){const targetYaw=Math.atan2(ix,iz),difference=Math.atan2(Math.sin(targetYaw-this.yaw),Math.cos(targetYaw-this.yaw));this.yaw+=difference*(1-Math.exp(-5.3*dt));}
    this.grounded=false;this.coyote=0;this.jumpBuffer=0;this.pounding=false;this.diving=false;this.airTime+=dt;
    p.x+=v.x*dt;p.z+=v.z*dt;
    const swimHeight=1.45,walls=this.physics.resolveWalls(p,this.radius,swimHeight);
    if(walls.hit){const length=Math.hypot(walls.x,walls.z);if(length>1e-7){const nx=walls.x/length,nz=walls.z/length,inward=v.x*nx+v.z*nz;if(inward<0){v.x-=nx*inward;v.z-=nz*inward;}}}
    p.y+=v.y*dt;
    if(v.y>0){const ceiling=this.physics.ceilingAt(p.x,p.z,oldY+swimHeight-.08);if(ceiling&&p.y+swimHeight>ceiling.height){p.y=ceiling.height-swimHeight-.01;v.y=Math.min(0,v.y);}}
    const floor=this.physics.groundAt(p.x,p.z,oldY+.35);
    let onFloor=false;
    if(floor&&p.y<=floor.height&&oldY>=floor.height-.35){
      const landingSpeed=Math.max(0,-v.y);p.y=floor.height;v.y=Math.max(0,v.y);
      this.surface=floor.surface;this.groundNormal=floor.normal;onFloor=true;
      if(!this._swimFloorContact&&landingSpeed>2){result.landed=true;result.landingSpeed=landingSpeed;this.squashVelocity+=landingSpeed*.12;this.events.push('land');}
    }
    this._swimFloorContact=onFloor;
    // Source swimming surface offset. A deliberate jump at the surface uses
    // the short breach path above; ordinary ascents settle with the head clear.
    const surfaceFeet=info.level-.8;
    if(p.y>surfaceFeet){p.y=surfaceFeet;if(v.y>0)v.y=0;}
    if(!Number.isFinite(p.x+p.y+p.z)){this.reset(this._spawn);return;}
    if((p.y<this.killFloorY||(onFloor&&this.surface.includes('DEATH_PLANE')))&&!this.dead){this.health=0;this.dead=true;this.events.push('death');}
  }

  _updateBreath(dt){
    if(this.dead||this.disabled)return;
    if(this.underwater){
      this.oxygen=Math.max(0,this.oxygen-dt/(this.breathSeconds||64));this._surfaceHeal=0;
      if(this.oxygen<=.25&&!this._airWarned){this._airWarned=true;this.events.push('air-low');}
      if(this.oxygen<=0){
        this._drownClock+=dt;
        while(this._drownClock>=1&&!this.dead){this._drownClock-=1;this.health=Math.max(0,this.health-1);this.events.push('drown');if(this.health===0){this.dead=true;this.events.push('death');}}
      }else this._drownClock=0;
    }else{
      const recovery=this.breathRecoverySeconds||2.5;
      this.oxygen=Math.min(1,this.oxygen+dt/recovery);this._drownClock=0;
      if(this.oxygen>.3)this._airWarned=false;
      if(this.swimming&&this._waterInfo){this._surfaceHeal+=dt*8/recovery;while(this._surfaceHeal>=1){this._surfaceHeal-=1;this.health=Math.min(8,this.health+1);}}else this._surfaceHeal=0;
    }
  }
}
