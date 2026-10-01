import * as THREE from 'three';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const damp=(a,b,k,dt)=>THREE.MathUtils.lerp(a,b,1-Math.exp(-k*dt));

export class Player {
  constructor(world,input,audio,effects,onFall){
    Object.assign(this,{world,input,audio,effects,onFall});
    this.position=new THREE.Vector3();this.velocity=new THREE.Vector3();this.previous=new THREE.Vector3();
    this.yaw=0;this.pitch=0;this.grounded=true;this.health=100;this.maxHealth=100;this.invuln=0;
    this.dashCd=0;this.dashTime=0;this.dashDir=new THREE.Vector3();this.dashBefore=new THREE.Vector3();
    this.coyote=.12;this.jumpBuffer=0;this.sliding=false;this.slideTime=0;this.eyeHeight=1.68;
    this.bob=0;this.stepDistance=0;this.landDip=0;this.speed=0;this.cameraRoll=0;this.skillSet=new Set();this.onDash=null;this.swimming=false;
    this._f=new THREE.Vector3();this._r=new THREE.Vector3();this._wish=new THREE.Vector3();this._eye=new THREE.Vector3();
  }
  hasSkill(id){return this.skillSet.has(id);}
  reset(position){this.position.copy(position);this.previous.copy(position);this.velocity.set(0,0,0);this.health=this.maxHealth;this.invuln=.6;this.dashCd=0;this.dashTime=0;this.yaw=0;this.pitch=0;this.grounded=true;this.eyeHeight=1.68;this.landDip=0;this.bob=0;this.slideTime=0;this.jumpBuffer=0;this.coyote=.12;this.sliding=false;this.stepDistance=0;this.cameraRoll=0;this.speed=0;this.swimming=false;}
  aim(out=new THREE.Vector3()){const cp=Math.cos(this.pitch);return out.set(-Math.sin(this.yaw)*cp,Math.sin(this.pitch),-Math.cos(this.yaw)*cp);}
  eye(out=new THREE.Vector3()){return out.copy(this.position).add(new THREE.Vector3(0,this.eyeHeight,0));}
  look(){const d=this.input.look();this.yaw-=d.x;this.pitch=clamp(this.pitch-d.y,-1.48,1.48);}
  step(dt){
    this.previous.copy(this.position);this.invuln=Math.max(0,this.invuln-dt);this.dashCd=Math.max(0,this.dashCd-dt);
    this.coyote=this.grounded?.12:Math.max(0,this.coyote-dt);
    this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);if(this.input.pressed('Space'))this.jumpBuffer=.14;
    const axis=this.input.axis();this._f.set(-Math.sin(this.yaw),0,-Math.cos(this.yaw));this._r.set(Math.cos(this.yaw),0,-Math.sin(this.yaw));
    this._wish.copy(this._f).multiplyScalar(axis.z).addScaledVector(this._r,axis.x);
    const water=this.world.waterAt?.(this.position.x,this.position.z);
    this.swimming=Number.isFinite(water)&&this.position.y+.8<water+.18;
    const wantsSlide=this.input.down('ControlLeft')||this.input.down('ControlRight')||this.input.down('KeyC');
    if(wantsSlide&&this.grounded&&this.speed>3&&!this.sliding){this.slideTime=.85;this.audio.sfx('dash',this.position,.45);}
    this.sliding=wantsSlide&&this.grounded&&this.slideTime>0;this.slideTime=Math.max(0,this.slideTime-dt);
    if(!wantsSlide)this.slideTime=0;
    const dash=this.input.pressed('ShiftLeft')||this.input.pressed('ShiftRight');
    if(dash&&this.dashCd<=0){
      this.dashTime=.18;this.dashCd=1.05;this.invuln=Math.max(this.invuln,.17);
      this.dashDir.copy(this._wish.lengthSq()>.01?this._wish:this._f).normalize();this.dashBefore.copy(this.position);
      this.velocity.y=Math.max(this.velocity.y,1.2);this.audio.sfx('dash');this.effects.burst(this.position.clone().add(new THREE.Vector3(0,.3,0)),0x6ae2ef,8,.45);this.onDash?.();
    }
    if(this.dashTime>0){this.dashTime-=dt;this.velocity.x=this.dashDir.x*25;this.velocity.z=this.dashDir.z*25;this.velocity.y*=.95;}
    else{
      const speed=this.swimming?7:this.sliding?14.5:10;
      const accel=this.grounded?(this.sliding?5:19):8;
      if(this.sliding&&this._wish.lengthSq()<.01)this._wish.copy(this._f);
      this.velocity.x=damp(this.velocity.x,this._wish.x*speed,accel,dt);
      this.velocity.z=damp(this.velocity.z,this._wish.z*speed,accel,dt);
      if(this.swimming){
        const targetY=this.input.down('Space')?6.5:wantsSlide?-4.5:clamp((water-.82-this.position.y)*3,-2.5,3.5);
        this.velocity.y=damp(this.velocity.y,targetY,7,dt);
        if(this.input.down('Space')&&this.position.y>water-1.15)this.velocity.y=10;
      }else this.velocity.y-=24*dt;
    }
    if(this.jumpBuffer>0&&this.coyote>0){
      this.velocity.y=this.sliding?9.1:8.5;this.jumpBuffer=0;this.coyote=0;this.grounded=false;this.sliding=false;this.slideTime=0;this.audio.sfx('jump');
    }
    const height=this.sliding?1.02:1.72,r=.36,feetBefore=this.position.y;
    const solids=this.world.solids||[];
    const overlap=b=>this.position.x+r>b.minX&&this.position.x-r<b.maxX&&this.position.z+r>b.minZ&&this.position.z-r<b.maxZ;
    // Resolve each horizontal axis against the body's PREVIOUS vertical span.
    // A rising head is handled as a ceiling impact below, never as lateral penetration.
    for(const axis of ['x','z']){
      const old=this.position[axis];this.position[axis]+=this.velocity[axis]*dt;
      const low=axis==='x'?'minX':'minZ',high=axis==='x'?'maxX':'maxZ';
      for(const b of solids){
        if(b.active===false||feetBefore+height<=b.minY+.02||feetBefore>=b.maxY-.45||!overlap(b))continue;
        if(old+r<=b[low]+.02)this.position[axis]=b[low]-r;
        else if(old-r>=b[high]-.02)this.position[axis]=b[high]+r;
        else{
          // Recover small numerical penetrations without ejecting a player across
          // an entire ceiling/platform when already beneath or inside its bounds.
          const lo=this.position[axis]+r-b[low],hi=b[high]-this.position[axis]+r;
          if(Math.min(lo,hi)>.48)continue;
          this.position[axis]=lo<hi?b[low]-r:b[high]+r;
        }
        this.velocity[axis]=0;
      }
    }
    this.position.y=feetBefore+this.velocity.y*dt;
    let floor=this.world.floorAt(this.position.x,this.position.z,Math.max(feetBefore,this.position.y));
    for(const b of solids){
      if(b.active===false||!overlap(b))continue;
      if(this.velocity.y>0&&feetBefore+height<=b.minY+.03&&this.position.y+height>b.minY){this.position.y=b.minY-height;this.velocity.y=0;}
      if(feetBefore>=b.maxY-.46&&this.position.y<=b.maxY+.03){
        const headFree=!solids.some(o=>o!==b&&o.active!==false&&overlap(o)&&o.minY<b.maxY+height-.02&&o.maxY>b.maxY+.05);
        if(headFree)floor=Math.max(floor,b.maxY);
      }
    }
    const wasGrounded=this.grounded;
    if(Number.isFinite(floor)&&this.position.y<=floor+.03&&this.velocity.y<=0){
      if(!wasGrounded&&this.velocity.y<-4){this.landDip=Math.min(.25,-this.velocity.y*.015);this.audio.sfx('land',null,Math.min(1,-this.velocity.y/15));}
      this.position.y=floor;this.velocity.y=0;this.grounded=true;
    }else this.grounded=false;
    if(this.position.y<-22){this.onFall?.();return;}
    this.speed=Math.hypot(this.velocity.x,this.velocity.z);
    this.eyeHeight=damp(this.eyeHeight,this.sliding?1.0:1.68,15,dt);this.landDip=damp(this.landDip,0,11,dt);
    if(this.grounded&&this.speed>.5){this.bob+=this.speed*dt*1.55;this.stepDistance+=this.speed*dt;if(this.stepDistance>2.2){this.stepDistance=0;this.audio.sfx('step',null,this.sliding?.18:.5);}}
    this.cameraRoll=damp(this.cameraRoll,-axis.x*.015*(this.speed/10),8,dt);
  }
}
