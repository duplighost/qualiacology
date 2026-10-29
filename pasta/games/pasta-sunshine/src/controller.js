import * as THREE from '../vendor/three.module.js';
const clamp=THREE.MathUtils.clamp;
const approach=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

export function createPlayer(world) {
  const spawn=world.landmarks.spawn;
  const player={position:new THREE.Vector3(spawn.x,world.heightAt(spawn.x,spawn.z)+.1,spawn.z),velocity:new THREE.Vector3(),heading:Math.PI,grounded:false,wet:false,health:8,tank:100,hovering:false,spraying:false,ragdoll:false,speed:0,turnVelocity:0,nozzle:'spray',nozzleEnabled:world.nozzleAllowed!==false,jumpCount:0,turboActive:false,turboCharge:0,rocketCharge:0,rocketPowered:false,groundPounding:false,groundPoundImpact:null};
  let jumpWas=false,jumpBuffer=0,coyote=0,lastJump=-9,elapsed=0,flopTime=0,slideTime=0,hoverTime=0,airTime=0,lastGroundY=0;
  let flopWas=false,rocketLatched=false,airPeak=player.position.y,poundPeak=0,impactSerial=0;
  let wallNormal=new THREE.Vector3(),hasWall=false,stunned=0;
  const old=new THREE.Vector3(),desired=new THREE.Vector3();
  const radius=.42,bodyHeight=1.9;
  player.reset=(position)=>{
    player.position.copy(position||new THREE.Vector3(spawn.x,world.heightAt(spawn.x,spawn.z)+.1,spawn.z));
    player.velocity.set(0,0,0);player.heading=Math.PI;player.grounded=false;player.hovering=false;player.ragdoll=false;player.spraying=false;player.nozzleEnabled=world.nozzleAllowed!==false;player.tank=player.nozzleEnabled?100:0;
    coyote=jumpBuffer=flopTime=slideTime=hoverTime=airTime=stunned=0;jumpWas=false;player.jumpCount=0;
    hasWall=false;wallNormal.set(0,0,0);player.speed=0;player.turnVelocity=0;
    flopWas=rocketLatched=false;airPeak=player.position.y;poundPeak=0;
    player.turboActive=player.rocketPowered=player.groundPounding=false;player.turboCharge=player.rocketCharge=0;player.groundPoundImpact=null;
  };
  player.impulse=(v)=>{if(v)player.velocity.add(v);stunned=.22;flopTime=Math.max(flopTime,.35);};
  player.update=(dt,input,firmness=.62)=>{
    // A paused/first animation frame must not generate infinite turn velocity;
    // cap long resumed frames so collision tests cannot tunnel across a wall.
    if(!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,.05);
    elapsed+=dt;
    const canUseNozzle=world.nozzleAllowed!==false;
    player.nozzleEnabled=canUseNozzle;
    const nozzleModes=world.nozzleModes;
    if(canUseNozzle&&Array.isArray(nozzleModes)&&nozzleModes.length&&!nozzleModes.includes(player.nozzle))player.nozzle=nozzleModes[0];
    // The coaster owns its rider's pose while on the rails. Ordinary movement,
    // gravity and platform collisions resume immediately after dismounting.
    if(world.controlPlayer?.(player,dt,input)===true){jumpWas=!!input.jump;jumpBuffer=coyote=airTime=hoverTime=0;return;}
    const sprayInput=canUseNozzle&&input.spray;
    const turboRequested=canUseNozzle&&nozzleModes?.includes('turbo')&&player.nozzle==='turbo'&&input.spray&&!input.grab&&!player.groundPounding&&player.tank>0;
    player.turboCharge=turboRequested?Math.min(.35,player.turboCharge+dt):0;
    player.turboActive=!!turboRequested&&player.turboCharge>=.35;
    if(!input.spray||player.nozzle!=='rocket'||!canUseNozzle){player.rocketCharge=0;rocketLatched=false;}
    // Platforms provide their previous-to-current displacement. Applying it
    // before locomotion makes riders inherit both horizontal travel and lift.
    if(player.grounded&&world.platformMotionAt){
      const carry=world.platformMotionAt(player.position.x,player.position.z,player.position.y);
      if(carry&&Number.isFinite(carry.x)&&Number.isFinite(carry.y)&&Number.isFinite(carry.z)){
        player.position.x+=carry.x;player.position.y+=carry.y;player.position.z+=carry.z;
      }
    }
    old.copy(player.position);
    player.wet=world.surfaceAt(player.position.x,player.position.z)==='water'&&player.position.y<1;
    jumpBuffer=Math.max(0,jumpBuffer-dt);coyote=player.grounded?.13:Math.max(0,coyote-dt);
    if(input.jump&&!jumpWas)jumpBuffer=.15;jumpWas=input.jump;
    stunned=Math.max(0,stunned-dt);flopTime=Math.max(0,flopTime-dt);slideTime=Math.max(0,slideTime-dt);
    if(input.flop)flopTime=.3;
    if(input.slide&&player.grounded&&player.speed>1.5)slideTime=.2;
    const yaw=input.cameraYaw??Math.PI,f=input.forward||0,r=input.right||0;
    desired.set(Math.sin(yaw)*f-Math.cos(yaw)*r,0,Math.cos(yaw)*f+Math.sin(yaw)*r);
    if(desired.lengthSq()>1)desired.normalize();
    if(player.turboActive&&desired.lengthSq()<=.008)desired.set(Math.sin(yaw),0,Math.cos(yaw));
    const moving=desired.lengthSq()>.008;
    let maxSpeed=player.turboActive?22:player.wet?4.5:7.5;
    if(sprayInput&&player.nozzle==='spray')maxSpeed*=.55;
    if(input.grab)maxSpeed*=.65;
    if(flopTime>0)maxSpeed*=.25;
    if(slideTime>0)maxSpeed*=1.55;
    const grip=player.turboActive?(player.grounded||player.wet?4.5:2.4):player.wet?2.5:player.grounded?(slideTime>0?1.2:5+firmness*11):3.1;
    if(stunned===0){
      player.velocity.x=approach(player.velocity.x,desired.x*maxSpeed,grip,dt);
      player.velocity.z=approach(player.velocity.z,desired.z*maxSpeed,grip,dt);
    }else{player.velocity.x*=Math.exp(-dt*2);player.velocity.z*=Math.exp(-dt*2);}
    if(slideTime>0&&player.grounded){
      const eps=.4;
      const gx=(world.heightAt(player.position.x+eps,player.position.z)-world.heightAt(player.position.x-eps,player.position.z))/(2*eps);
      const gz=(world.heightAt(player.position.x,player.position.z+eps)-world.heightAt(player.position.x,player.position.z-eps))/(2*eps);
      if(Math.abs(gx)<2)player.velocity.x-=gx*12*dt;
      if(Math.abs(gz)<2)player.velocity.z-=gz*12*dt;
    }
    const targetHeading=(sprayInput&&player.nozzle!=='turbo')||input.grab?yaw:(moving?Math.atan2(desired.x,desired.z):player.heading);
    const da=angleDelta(player.heading,targetHeading);player.turnVelocity=da/dt;
    player.heading+=da*(1-Math.exp(-dt*12));
    if(jumpBuffer>0&&(coyote>0||player.wet)){
      player.jumpCount=elapsed-lastJump<.68&&player.speed>3?(player.jumpCount+1)%3:0;
      player.velocity.y=10.4+player.jumpCount*1.45;
      player.grounded=false;coyote=0;jumpBuffer=0;lastJump=elapsed;slideTime=0;hoverTime=0;
      player.onJump?.(player.jumpCount);
    }else if(jumpBuffer>0&&hasWall&&!player.grounded){
      player.velocity.y=10;player.velocity.addScaledVector(wallNormal,8);stunned=.16;jumpBuffer=0;player.onJump?.(1);
    }
    // Special nozzles are opt-in per course. A rocket is a charged impulse;
    // its fuel, flight and landing still pass through ordinary collision.
    if(canUseNozzle&&nozzleModes?.includes('rocket')&&player.nozzle==='rocket'&&input.spray&&!input.grab&&!player.groundPounding&&!rocketLatched&&player.tank>=20){
      player.rocketCharge=Math.min(1,player.rocketCharge+dt);
      if(player.rocketCharge>=1){player.tank-=20;player.velocity.y=24;player.grounded=false;player.rocketPowered=true;rocketLatched=true;player.rocketCharge=0;coyote=jumpBuffer=hoverTime=0;airPeak=player.position.y;player.onJump?.(2);}
    }else if(player.nozzle==='rocket'&&!rocketLatched)player.rocketCharge=0;
    if(world.preciseGroundPound&&input.flop&&!flopWas&&!player.grounded&&!player.wet&&airTime>.06){player.groundPounding=true;poundPeak=Math.max(airPeak,player.position.y);}
    flopWas=!!input.flop;
    if(player.groundPounding){player.velocity.y=Math.min(player.velocity.y,-28);player.velocity.x*=Math.exp(-dt*4);player.velocity.z*=Math.exp(-dt*4);}
    player.hovering=canUseNozzle&&player.nozzle==='hover'&&input.jumpHeld&&!player.grounded&&!player.groundPounding&&player.tank>0&&hoverTime<2.4&&airTime>.12;
    if(player.hovering){
      hoverTime+=dt;player.velocity.y=approach(player.velocity.y,1,7,dt);player.tank=Math.max(0,player.tank-12*dt);
    }else player.velocity.y-=22*dt;
    if(player.grounded){hoverTime=0;airTime=0;}else airTime+=dt;
    player.spraying=sprayInput&&!input.grab&&player.nozzle==='spray'&&player.tank>0&&flopTime===0;
    if(player.spraying)player.tank=Math.max(0,player.tank-5.8*dt);
    if(player.turboActive)player.tank=Math.max(0,player.tank-8*dt);
    const onWetSlope=world.refillAt?world.refillAt(player.position.x,player.position.z,player.position.y):player.position.x<-27&&player.position.z>19&&player.position.z<36&&player.grounded;
    if(canUseNozzle&&(player.wet||onWetSlope))player.tank=Math.min(100,player.tank+25*dt);
    player.position.addScaledVector(player.velocity,dt);
    if(!player.grounded)airPeak=Math.max(airPeak,player.position.y);
    let floor=world.heightAt(player.position.x,player.position.z);
    const waterNow=world.surfaceAt(player.position.x,player.position.z)==='water';
    if(waterNow)floor=Math.max(floor,-.15);
    hasWall=false;wallNormal.set(0,0,0);
    for(const c of world.colliders){
      if(player.position.x<c.minX-radius||player.position.x>c.maxX+radius||player.position.z<c.minZ-radius||player.position.z>c.maxZ+radius)continue;
      const bottom=c.bottom??-10;
      if(old.y>=c.top-.42&&player.velocity.y<=1.1){floor=Math.max(floor,c.top);continue;}
      if(player.position.y+bodyHeight<=bottom+.001||player.position.y>=c.top-.07)continue;
      // Rising into a floating bridge/roof meets its underside. Treating this
      // contact as a side wall would teleport the player to the platform edge.
      if(player.velocity.y>0&&old.y+bodyHeight<=bottom+.08){
        player.position.y=bottom-bodyHeight;player.velocity.y=0;continue;
      }
      if(c.top-player.position.y<=.5&&player.grounded){floor=Math.max(floor,c.top);continue;}
      const distances=[Math.abs(player.position.x-(c.minX-radius)),Math.abs(c.maxX+radius-player.position.x),Math.abs(player.position.z-(c.minZ-radius)),Math.abs(c.maxZ+radius-player.position.z)];
      let side=distances.indexOf(Math.min(...distances));
      if(old.x<c.minX-radius+.015)side=0;
      else if(old.x>c.maxX+radius-.015)side=1;
      else if(old.z<c.minZ-radius+.015)side=2;
      else if(old.z>c.maxZ+radius-.015)side=3;
      if(side===0){player.position.x=c.minX-radius;player.velocity.x=Math.min(0,player.velocity.x);wallNormal.set(-1,0,0);}
      if(side===1){player.position.x=c.maxX+radius;player.velocity.x=Math.max(0,player.velocity.x);wallNormal.set(1,0,0);}
      if(side===2){player.position.z=c.minZ-radius;player.velocity.z=Math.min(0,player.velocity.z);wallNormal.set(0,0,-1);}
      if(side===3){player.position.z=c.maxZ+radius;player.velocity.z=Math.max(0,player.velocity.z);wallNormal.set(0,0,1);}
      hasWall=true;
    }
    // Steep pasta cliffs are obstacles, not elevators.
    const oldFloor=world.heightAt(old.x,old.z);
    if(floor-oldFloor>1.05&&floor>old.y+.55&&!waterNow){
      player.position.x=old.x;player.position.z=old.z;floor=oldFloor;
      player.velocity.x*=.65;player.velocity.z*=.65;
    }
    if(player.position.y<=floor+.04&&player.velocity.y<=0){
      const landed=!player.grounded&&player.velocity.y<-3;
      const impact=-player.velocity.y;
      player.position.y=floor;player.velocity.y=0;player.grounded=true;lastGroundY=floor;
      if(player.groundPounding)player.groundPoundImpact={serial:++impactSerial,x:player.position.x,y:floor,z:player.position.z,dropHeight:Math.max(0,poundPeak-floor),rocketPowered:player.rocketPowered,impactSpeed:impact};
      player.groundPounding=false;player.rocketPowered=false;airPeak=floor;
      if(landed)player.onLand?.(impact);
    }else if(player.position.y>floor+.15)player.grounded=false;
    const bounds=world.bounds||{x0:-65,x1:72,z0:-51,z1:47};
    player.position.x=clamp(player.position.x,bounds.x0+1,bounds.x1-1);player.position.z=clamp(player.position.z,bounds.z0+1,bounds.z1-1);
    player.speed=Math.hypot(player.velocity.x,player.velocity.z);
    player.ragdoll=flopTime>0||slideTime>0||player.groundPounding;
    player.airTime=airTime;player.floor=floor;
    if(player.position.y<-20||!Number.isFinite(player.position.y))player.onFall?.();
  };
  return player;
}
