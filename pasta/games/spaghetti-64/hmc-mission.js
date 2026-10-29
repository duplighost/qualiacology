import * as THREE from './vendor/three.module.js';
import {SwimmingController} from './swimming.js';
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const vector=p=>p?.isVector3?p.clone():Array.isArray(p)?new THREE.Vector3(...p):new THREE.Vector3(p.x,p.y,p.z);

// One area and one always-present source star. Dorrie is a moving physical
// surface, not a vehicle teleport: the rider is translated and rotated by
// the same per-frame displacement as the source collision mesh.
export class HmcMission {
  constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.world=null;this.reset();}
  reset(){
    const d=this.course.mission.dorrie;
    this.dorrie={home:vector(d.home),position:vector(d.position),yaw:d.yaw*Math.PI/180,speed:0,yawVelocity:0,state:'move',age:0,neck:1,offsetY:0,verticalSpeed:0,riding:false,lifting:false,hasRidden:false,hasLowered:false,hasLifted:false,headHeight:d.home[1]+7.17,headPosition:new THREE.Vector3(),gait:0,impact:0};
    this.position=this.dorrie.position;this.yaw=0;this.state='exploring';this.active=false;this.health=0;this.maxHealth=0;this.held=false;this.starReady=true;this.starCollectible=true;this.starPosition=vector(this.course.mission.star.position);this.lakeVisited=false;this.ridingTime=0;this.headLiftCount=0;this.groundPounds=0;this._player=null;
    this.physics.setDynamicEnabled('dorrie_raised',true);this.physics.setDynamicEnabled('dorrie_lowered',false);this.physics.setBoxCollider('hmc_dorrie_lift_support',null,false);this._applyCollision();
  }
  _floor(player){if(!player)return null;return this.physics.groundAt(player.position.x,player.position.z,player.position.y+.28);}
  isRiding(player){const f=this._floor(player);return !!(player?.grounded&&f&&Math.abs(player.position.y-f.height)<.65&&String(f.triangle.dynamic).startsWith('dorrie_'));}
  localPosition(player){const d=this.dorrie,p=player.position,c=Math.cos(d.yaw),s=Math.sin(d.yaw),dx=p.x-d.position.x,dz=p.z-d.position.z;return{x:dx*c-dz*s,y:p.y-d.position.y,z:dx*s+dz*c};}
  headPosition(neck=this.dorrie.neck){const d=this.dorrie,z=8.3-2.1*neck,y=3.45+3.55*neck;return new THREE.Vector3(d.position.x+Math.sin(d.yaw)*z,d.position.y+y,d.position.z+Math.cos(d.yaw)*z);}
  _applyCollision(){
    const d=this.dorrie,lower=d.state==='lowering'||d.state==='lowered'||d.state==='raising';
    this.physics.setDynamicEnabled('dorrie_raised',!lower);this.physics.setDynamicEnabled('dorrie_lowered',lower);
    if(lower){const original=this.physics.dynamicTemplates.get('dorrie_lowered');
      // The two source collision shapes have different topology. During the
      // brief neck animation, deform the lowered source vertices continuously;
      // both stable endpoints use their original source collision arrays.
      if(d.neck>0){const c=Math.cos(d.yaw),s=Math.sin(d.yaw),vertices=original.vertices.map(v=>{const w=clamp((v[2]-3.2)/3.4,0,1),x=v[0],y=v[1]+3.55*d.neck*w,z=v[2]-2.1*d.neck*w;return[d.position.x+x*c+z*s,d.position.y+y,d.position.z-x*s+z*c];});this.physics._liveFaces(vertices,original.triangles,'dorrie_lowered');}
      else this.physics.setDynamicPose('dorrie_lowered',d.position.toArray(),[0,d.yaw,0]);
    }else this.physics.setDynamicPose('dorrie_raised',d.position.toArray(),[0,d.yaw,0]);
    d.headPosition.copy(this.headPosition());d.headHeight=d.headPosition.y;
  }
  // Called once before the land/swimming controller from world.update.
  preStep(dt,player){
    const d=this.dorrie;this._player=player||this._player;const oldPosition=d.position.clone(),oldYaw=d.yaw,oldNeck=d.neck;
    const riding=this.isRiding(player)||!!(player&&d.lifting);d.riding=riding;d.age+=dt;d.impact*=Math.exp(-5*dt);
    if(riding){d.hasRidden=true;this.ridingTime+=dt;}
    if(d.state==='move'){
      let target;
      if(riding){target=player.yaw;d.speed+=clamp(3-d.speed,-4.5*dt,4.5*dt);}
      else{const toHome=Math.atan2(d.home.x-d.position.x,d.home.z-d.position.z),r=Math.hypot(d.position.x-d.home.x,d.position.z-d.home.z),turn=Math.PI/2-Math.atan2(r-20,20);target=toHome+(angle(toHome,d.yaw)<0?-turn:turn);d.speed+=clamp(1.5-d.speed,-4.5*dt,4.5*dt);}
      const desired=angle(d.yaw,target)*.6;d.yawVelocity+=clamp(desired-d.yawVelocity,-.4314*dt,.4314*dt);d.yaw+=d.yawVelocity*dt;
      d.position.x+=Math.sin(d.yaw)*d.speed*dt;d.position.z+=Math.cos(d.yaw)*d.speed*dt;
      const dx=d.position.x-d.home.x,dz=d.position.z-d.home.z,r=Math.hypot(dx,dz)||.001,toHome=Math.atan2(-dx,-dz),neckAngle=-.956*d.neck,shift=4.4*Math.cos(neckAngle)*Math.cos(d.yaw-toHome),radius=clamp(r,16.5+shift,23+shift);d.position.x=d.home.x+dx/r*radius;d.position.z=d.home.z+dz/r*radius;
    }else if(d.state==='lowering'){
      d.speed=0;d.neck=Math.max(0,1-d.age/(35/30));if(d.age>=35/30){d.state='lowered';d.age=0;d.neck=0;}
    }else if(d.state==='lowered'){
      const local=player?this.localPosition(player):null;
      if(riding&&local.z>7.8){d.state='raising';d.age=0;d.lifting=true;d.hasLifted=true;this.headLiftCount++;player.disabled=true;this.callbacks.message?.('Dorrie is lifting you. Jump from her head to the island.',4);}
      else if(!riding&&d.age>5){d.state='raising';d.age=0;d.lifting=false;}
      else if(riding&&local.z>3.2)d.age=0;
    }else if(d.state==='raising'){
      const t=clamp(d.age/(74/30),0,1);d.neck=t*t*(3-2*t);
      if(t>=1){d.neck=1;d.state='move';d.age=0;d.lifting=false;if(player)player.disabled=false;}
    }
    // Source standing offset is -17 units. A damped pressure response keeps
    // the noodle body visibly compliant without losing stable ride collision.
    const targetY=riding?-.17:0;d.verticalSpeed+=((targetY-d.offsetY)*55-d.verticalSpeed*12)*dt;d.offsetY=clamp(d.offsetY+d.verticalSpeed*dt,-.8,.2);d.position.y=d.home.y+d.offsetY;
    if(riding&&player){const dx=player.position.x-oldPosition.x,dz=player.position.z-oldPosition.z,turn=d.yaw-oldYaw,c=Math.cos(turn),s=Math.sin(turn);player.position.x=d.position.x+dx*c+dz*s;player.position.z=d.position.z-dx*s+dz*c;player.position.y+=d.position.y-oldPosition.y;
      if(d.lifting||d.state==='raising'&&oldNeck<1){const neckDelta=d.neck-oldNeck;player.position.y+=3.55*neckDelta;player.position.x-=Math.sin(d.yaw)*2.1*neckDelta;player.position.z-=Math.cos(d.yaw)*2.1*neckDelta;if(d.lifting){player.velocity.x=player.velocity.z=0;player.velocity.y=0;}}
      // Mario's facing remains his chosen steering input; moving a platform
      // does not compound its yaw into the rider's target direction.
    }
    this._applyCollision();d.gait+=dt*(1.5+d.speed*.5);this.yaw=d.yaw;
  }
  update(dt,player){this._player=player;const d=this.dorrie;d.riding=this.isRiding(player)||d.lifting;if(player.position.y< -30)this.lakeVisited=true;this.state=d.state==='move'?(d.riding?'riding':'exploring'):d.state;}
  onGroundPound(player){const d=this.dorrie;if(d.state!=='move'||!this.isRiding(player))return false;const p=this.localPosition(player);if(p.z>=3.2)return false;d.state='lowering';d.age=0;d.speed=d.yawVelocity=0;d.hasLowered=true;d.verticalSpeed=-4.5;d.impact=1;this.groundPounds++;this.callbacks.message?.('Walk along Dorrie’s lowered neck and hop onto her head.',4);return true;}
  action(){return false;}
  get objective(){const d=this.dorrie;if(d.lifting)return'Ride Dorrie’s rising head';if(d.state==='lowered'||d.state==='lowering')return'Walk onto Dorrie’s lowered head';if(d.riding)return'Face the island · Ground pound Dorrie’s back';if(this.lakeVisited)return'Climb onto Dorrie and reach the island';return'Find the elevator to the underground lake';}
  get status(){const d=this.dorrie;return d.riding?'RIDING DORRIE':this.lakeVisited?'UNDERGROUND LAKE':'DESCEND TO THE LAKE';}
  context(player){const d=this.dorrie;if(player.position.z>34&&player.position.z<49&&player.position.x> -70&&player.position.x< -61&&player.position.y>10)return'Run, then crouch + jump across the gap. Hold run / full stick, then press crouch and jump together.';if(d.lifting)return'Dorrie’s head is rising. Get ready to jump to the island.';if(d.riding){if(d.state==='lowering'||d.state==='lowered')return'Walk along the lowered neck, then hop onto Dorrie’s head.';return'Face where you want Dorrie to swim. Jump, then ground pound her back to lower her head.';}if(player.position.y< -40)return'Swim to Dorrie’s back. Press jump at the surface to climb aboard.';if(this.world?.roomId===4)return'Follow the boulder path to the far door. Watch for rolling pasta.';return'';}
}

// Cooked noodle bundles keep their running impulse through the long jump.
// This opt-in controller is confined to HMC's original twelve-unit entrance
// gap; earlier courses retain their established controller behavior.
export class HmcController extends SwimmingController {
  reset(start){super.reset(start);this.longJumpCoasting=false;}
  update(dt,input={}){if(input.jump&&input.crouch&&this.grounded&&Math.hypot(this.velocity.x,this.velocity.z)>2.4)this.longJumpCoasting=true;const result=super.update(dt,input);if(this.grounded||this.swimming||this.pounding||this.dead)this.longJumpCoasting=false;return result;}
  _step(dt,input,result){const airborne=!this.grounded,vx=this.velocity.x,vz=this.velocity.z;super._step(dt,input,result);if(this.longJumpCoasting&&airborne&&!this.grounded&&!this.swimming&&!this.pounding){const oldSpeed=Math.hypot(vx,vz),speed=Math.hypot(this.velocity.x,this.velocity.z),coasting=oldSpeed*Math.exp(-.1*dt);if(speed>0&&speed<coasting){this.velocity.x*=coasting/speed;this.velocity.z*=coasting/speed;}}}
}
