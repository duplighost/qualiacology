import {NoodleController} from './physics.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const EPS=1e-7;

function killFloorFor(physics){
  let lowest=Infinity;
  for(const triangle of physics?.triangles||[])if(Number.isFinite(triangle.minY))lowest=Math.min(lowest,triangle.minY);
  return Number.isFinite(lowest)?Math.min(-40,lowest-18):-180;
}

// Exterior movement is the original NoodleController. The slide mode replaces
// only surface movement: gravity is projected onto the actual triangle normal,
// steering applies bounded forces, and unsupported edges remain real falls.
// Neither the slide's route nor a centerline is supplied to this controller.
export class SlidingController extends NoodleController {
  constructor(physics,start,options={}){
    super(physics,start);
    this._explicitKillFloor=finite(options.killFloorY)?Number(options.killFloorY):null;
    this._slideSource=typeof options.slideSource==='function'?options.slideSource:()=>false;
    this.setPhysics(physics);
  }

  reset(start=this._spawn){
    super.reset(start);
    this.sliding=false;this.slideBlend=0;this.slidePitch=0;this.slideBank=0;this.slideSpeed=0;
    this.slideDistance=0;this.slideContact=false;this.slideBraking=false;
    this._slideInput={};this._physicsTriangles=null;this._slideInfo=null;
    this._slideAirborne=0;this._slideFloor=null;
  }

  setPhysics(physics){
    this.physics=physics;this._physicsTriangles=physics?.triangles;
    this.killFloorY=this._explicitKillFloor??killFloorFor(physics);
    return this;
  }

  setSlideSource(source){
    this._slideSource=typeof source==='function'?source:()=>source;
    return this;
  }

  setSlideMode(enabled){return this.setSlideSource({enabled:!!enabled});}

  // Used only by actual cabin/chimney and finish-door area transitions.
  warp(start,{physics=this.physics,preserveVitals=true}={}){
    const health=this.health,invincible=this.invincible;
    this.setPhysics(physics);this.reset(start);this.setPhysics(physics);
    if(preserveVitals){this.health=health;this.invincible=invincible;this.dead=health<=0;}
    return this;
  }

  _sampleSlide(){
    const p=this.position,raw=this._slideSource?.(p.x,p.z,this);
    if(!raw)return null;
    if(raw===true)return {enabled:true};
    return raw.enabled===false?null:raw;
  }

  update(dt,input={}){
    dt=clamp(Number(dt)||0,0,.1);
    if(this._physicsTriangles!==this.physics?.triangles)this.setPhysics(this.physics);
    this._slideInfo=this._sampleSlide();this._slideInput=input;
    const wasSliding=this.sliding;
    // Crouch is a deliberate brake while seated; it never turns into a ground
    // pound when a track edge briefly leaves the character airborne.
    const controls=this._slideInfo?{...input,crouch:false,groundPound:false,dive:false}:input;
    const result=super.update(dt,controls);
    this.slideSpeed=this.sliding?Math.hypot(this.velocity.x,this.velocity.y,this.velocity.z):0;
    this.slideContact=this.sliding&&this.grounded;
    this.slideBlend+=((this.sliding?1:0)-this.slideBlend)*(1-Math.exp(-10*dt));
    const forwardX=Math.sin(this.yaw),forwardZ=Math.cos(this.yaw),n=this.groundNormal;
    const pitch=this.sliding&&this.grounded?Math.atan2(n[0]*forwardX+n[2]*forwardZ,n[1]):0;
    const bank=this.sliding&&this.grounded?Math.atan2(n[0]*forwardZ-n[2]*forwardX,n[1]):0;
    this.slidePitch+=(clamp(pitch,-.9,.9)-this.slidePitch)*(1-Math.exp(-9*dt));
    this.slideBank+=(clamp(bank,-.7,.7)-this.slideBank)*(1-Math.exp(-8*dt));
    if(this.sliding&&!wasSliding)this.events.push('slide-start');
    if(!this.sliding&&wasSliding)this.events.push('slide-stop');
    result.sliding=this.sliding;result.slideSpeed=this.slideSpeed;result.slideBraking=this.slideBraking;
    return result;
  }

  _step(dt,input,result){
    const info=this._slideInfo=this._sampleSlide();
    if(!info){this.sliding=false;this.slideBraking=false;this._slideFloor=null;super._step(dt,input,result);return;}
    const p=this.position,floor=this.physics.groundAt(p.x,p.z,p.y+.5);
    const nearFloor=!!floor&&Math.abs(p.y-floor.height)<.6&&floor.normal[1]>.26;
    const speed=Math.hypot(this.velocity.x,this.velocity.z),original=this._slideInput;
    const slope=nearFloor&&floor.normal[1]<.985;
    const deliberate=nearFloor&&speed>2&&(original.slideStart||original.dive||original.crouch);
    const continuing=this.sliding&&(!this.grounded||speed>.65||slope);
    if(!(slope||deliberate||continuing)){
      this.sliding=false;this.slideBraking=false;this._slideFloor=null;
      super._step(dt,input,result);return;
    }
    if(!this.sliding&&nearFloor){
      this.grounded=true;this.groundNormal=floor.normal;this.surface=floor.surface;
      this.position.y=floor.height;this.coyote=.1;this._slideFloor=floor;
    }
    this.sliding=true;
    this._slideStep(dt,input,result,info);
  }

  _slideStep(dt,input,result,info){
    const p=this.position,v=this.velocity,oldY=p.y,oldX=p.x,oldZ=p.z;
    const wasGrounded=this.grounded,cooking=this.cookingSoftness,enabled=!this.dead&&!this.disabled;
    let ix=enabled?(Number(input.x)||0):0,iz=enabled?(Number(input.z)||0):0;
    const inputLength=Math.hypot(ix,iz);if(inputLength>1){ix/=inputLength;iz/=inputLength;}
    const speed=Math.hypot(v.x,v.z),nx=this.groundNormal[0],ny=Math.max(.26,this.groundNormal[1]),nz=this.groundNormal[2];
    const forwardX=speed>.2?v.x/speed:Math.sin(this.yaw),forwardZ=speed>.2?v.z/speed:Math.cos(this.yaw);
    const along=ix*forwardX+iz*forwardZ,sideX=ix-forwardX*along,sideZ=iz-forwardZ*along;
    const original=this._slideInput;
    const manualBrake=enabled&&!!(original.slideBrake??original.crouch);
    const counterSteer=enabled?clamp(-along,0,1):0;
    const brake=manualBrake?1:counterSteer*.85;
    const tuck=enabled&&!!(original.slideTuck??original.run);
    const gravity=finite(info.gravity)?clamp(Number(info.gravity),8,45):28.5;
    const maxSpeed=finite(info.maxSpeed)?clamp(Number(info.maxSpeed),8,38):(tuck?30:25);
    this.slideBraking=brake>.15;this.pounding=false;this.diving=false;
    if(this.grounded){
      this.coyote=.1;this.airTime=0;this._slideAirborne=0;
      // The horizontal components below are the projection of (0,-g,0)
      // onto the supporting plane. Banks therefore push back naturally.
      v.x+=gravity*nx*ny*dt;v.z+=gravity*nz*ny*dt;
      const steering=(finite(info.steering)?Number(info.steering):28)*(1-.16*cooking);
      const drive=speed<1.2?12:5.2;
      v.x+=(sideX*steering+forwardX*Math.max(0,along)*drive)*dt;
      v.z+=(sideZ*steering+forwardZ*Math.max(0,along)*drive)*dt;
      const drag=(tuck?.07:.16)+cooking*.11+brake*2.9;
      const damping=Math.exp(-drag*dt);v.x*=damping;v.z*=damping;
      if(brake){const magnitude=Math.hypot(v.x,v.z),friction=Math.min(magnitude,brake*3.8*dt);if(magnitude>EPS){v.x*=1-friction/magnitude;v.z*=1-friction/magnitude;}}
      v.y=-(nx*v.x+nz*v.z)/ny;
    }else{
      this.coyote=Math.max(0,this.coyote-dt);this.airTime+=dt;this._slideAirborne+=dt;
      // Air steering is weaker; releasing the stick retains launch momentum.
      v.x+=ix*7.5*dt;v.z+=iz*7.5*dt;v.y-=gravity*dt;
      const damping=Math.exp(-.045*dt);v.x*=damping;v.z*=damping;
    }
    const horizontal=Math.hypot(v.x,v.z);
    if(horizontal>maxSpeed){const factor=maxSpeed/horizontal;v.x*=factor;v.z*=factor;if(this.grounded)v.y*=factor;}
    if(this.jumpBuffer>0&&this.coyote>0&&enabled){
      v.y=Math.max(0,v.y)+9.6;this.grounded=false;this.coyote=0;this.jumpBuffer=0;
      this.squashVelocity=-3;this.events.push('jump');result.jumped=true;
    }
    p.x+=v.x*dt;p.z+=v.z*dt;
    const walls=this.physics.resolveWalls(p,this.radius,1.12);
    if(walls.hit){
      const amount=Math.hypot(walls.x,walls.z);
      if(amount>EPS){const wx=walls.x/amount,wz=walls.z/amount,inward=v.x*wx+v.z*wz;if(inward<0){v.x-=wx*inward;v.z-=wz*inward;this.squashVelocity+=Math.min(-inward*.08,1.2);}}
    }
    const upwardAllowance=Math.max(.52,Math.max(0,v.y*dt)+.12);
    const floor=this.physics.groundAt(p.x,p.z,oldY+upwardAllowance);
    const canSlide=!!floor&&floor.normal[1]>.26;
    const slopeRate=Math.hypot(nx,nz)/ny;
    const contactDrop=.23+Math.hypot(p.x-oldX,p.z-oldZ)*Math.min(3,slopeRate+.65);
    if(this.grounded&&canSlide&&floor.height>=oldY-contactDrop&&floor.height<=oldY+upwardAllowance){
      p.y=floor.height;this.groundNormal=floor.normal;this.surface=floor.surface;this._slideFloor=floor;
      v.y=-(floor.normal[0]*v.x+floor.normal[2]*v.z)/Math.max(.26,floor.normal[1]);
    }else{
      if(this.grounded){this.grounded=false;v.y-=gravity*dt;}
      p.y=oldY+v.y*dt;
      if(v.y>0){
        const ceiling=this.physics.ceilingAt(p.x,p.z,oldY+1.12-.08);
        if(ceiling&&p.y+1.12>ceiling.height){p.y=ceiling.height-1.13;v.y=-.3;}
      }
      if(canSlide&&v.y<=0&&p.y<=floor.height&&oldY>=floor.height-.15){
        const landingSpeed=Math.max(0,-v.y);p.y=floor.height;this.grounded=true;this.coyote=.1;
        this.surface=floor.surface;this.groundNormal=floor.normal;this._slideFloor=floor;
        const n=floor.normal,inward=v.x*n[0]+v.y*n[1]+v.z*n[2];
        if(inward<0){v.x-=n[0]*inward;v.y-=n[1]*inward;v.z-=n[2]*inward;}
        v.y=-(n[0]*v.x+n[2]*v.z)/Math.max(.26,n[1]);
        if(!wasGrounded&&this.airTime>.07){
          result.landed=true;result.landingSpeed=landingSpeed;this.lastLandingSpeed=landingSpeed;
          this.landingTimer=0;this.squashVelocity+=Math.min(landingSpeed*(.2+.25*cooking),8);this.events.push('land');
        }
        this._slideAirborne=0;
      }
    }
    const resultingSpeed=Math.hypot(v.x,v.z);
    if(resultingSpeed>.18){const target=Math.atan2(v.x,v.z),difference=Math.atan2(Math.sin(target-this.yaw),Math.cos(target-this.yaw));this.yaw+=difference*(1-Math.exp(-10*dt));}
    this.slideDistance+=Math.hypot(p.x-oldX,p.y-oldY,p.z-oldZ);
    if(!Number.isFinite(p.x+p.y+p.z+v.x+v.y+v.z)){this.reset(this._spawn);return;}
    if((p.y<this.killFloorY||(this.grounded&&this.surface.includes('DEATH_PLANE')))&&!this.dead){this.health=0;this.dead=true;this.events.push('death');}
  }
}
