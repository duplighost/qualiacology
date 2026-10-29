import {SecretController} from './secret-mission.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// The castle shares the tested land, water, long-jump and pole controller.
// Cannon flight is an explicit ballistic state; it never teleports to a roof.
export class CastleController extends SecretController {
  reset(start){super.reset(start);this.inCannon=false;this.cannonFlight=false;this.cannonAge=0;}
  launchCannon(yaw,elevation=.84){
    this.disabled=false;this.inCannon=false;this.cannonFlight=true;this.cannonAge=0;
    this.grounded=false;this.coyote=0;this.jumpBuffer=0;this.pounding=this.diving=false;
    this.yaw=yaw;const speed=40,pitch=clamp(elevation,.18,1.34);
    this.velocity.x=Math.sin(yaw)*Math.cos(pitch)*speed;this.velocity.z=Math.cos(yaw)*Math.cos(pitch)*speed;this.velocity.y=Math.sin(pitch)*speed;
    this.longJumpCoasting=true;this.invincible=Math.max(this.invincible,1);this.events.push('cannon-fire');
  }
  _step(dt,input,result){
    const flight=this.cannonFlight&&!this.grounded&&!this.swimming,oldVy=this.velocity.y;
    const resolve=this.physics.resolveWalls;
    // A capsule's shin otherwise catches the vertical 25/51 cm source stair
    // risers before its centre reaches the tread. Test the same horizontal
    // move with its lower 36 cm lifted, retaining full head clearance and the
    // original 58 cm maximum floor step. Large walls still block normally.
    const stairStep=this.grounded&&!this.swimming&&!this.pounding&&!this.diving;
    if(stairStep)this.physics.resolveWalls=function(position,radius,height){
      const before={...position},ordinary={...position},hit=resolve.call(this,ordinary,radius,height);
      if(!hit.hit){Object.assign(position,ordinary);return hit;}
      const raised={...before,y:before.y+.36},upper=resolve.call(this,raised,radius,Math.max(.8,height-.36)),floor=this.groundAt(raised.x,raised.z,before.y+.58),ceiling=this.ceilingAt(raised.x,raised.z,before.y+.58);
      if(!upper.hit&&floor?.walkable&&floor.height>=before.y-.65&&floor.height<=before.y+.58&&(!ceiling||ceiling.height>Math.max(floor.height,before.y)+height+.02)){
        position.x=raised.x;position.z=raised.z;return upper;
      }
      Object.assign(position,ordinary);return hit;
    };
    try{super._step(dt,input,result);}finally{this.physics.resolveWalls=resolve;}
    if(flight&&!this.grounded&&!this.swimming&&!this.pounding){
      // Controlled drag and a 12 m/s² ballistic arc retain a useful roof shot.
      // This is a browser-controller approximation, not a port of Mario actions.
      const correction=6*dt;this.velocity.y+=correction;this.position.y+=correction*dt;
      if(oldVy>0&&this.velocity.y<-.5&&this.position.y<0)this.cannonFlight=false;
    }
  }
  update(dt,input={}){
    if(this.inCannon){this.events=[];this.velocity.x=this.velocity.y=this.velocity.z=0;this.speed=0;return{jumped:false,landed:false,groundPound:false,landingSpeed:0};}
    const result=super.update(dt,input);if(this.cannonFlight){this.cannonAge+=dt;if(this.grounded||this.swimming||this.dead||this.cannonAge>14){this.cannonFlight=false;this.longJumpCoasting=false;}}
    return result;
  }
}

export class CastleMission {
  constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.world=null;this.reset();}
  reset(){this.position={x:0,y:0,z:0};this.home={...this.position};this.starPosition={...this.position};this.active=this.held=this.starReady=this.starCollectible=false;this.health=this.maxHealth=0;this.state='exploring';this.yaw=0;this.actionCooldown=0;}
  update(dt,p){this.actionCooldown=Math.max(0,this.actionCooldown-dt);this.position={...p.position};this.state=p.inCannon?'cannon':p.swimming?'swimming':'exploring';this.world?.afterPhysics?.(dt,p);}
  get objective(){return this.world?.objective||'Explore the castle and enter a pasta world';}
  get status(){return this.world?.areaName||'CASTLE';}
  context(p){return this.world?.context?.(p)||null;}
  action(p){if(p.dead||this.actionCooldown>0)return false;this.actionCooldown=.24;return this.world?.interact?.(p)||false;}
  onGroundPound(p){return this.world?.pound?.(p)||false;}
}
