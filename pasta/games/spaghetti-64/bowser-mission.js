import {TtmController} from './ttm-mission.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};

// Bowser courses use ordinary source-scale running/jumping and physical pole
// contact. The three stages share this controller, without changing older ones.
export class BowserController extends TtmController {
  constructor(physics,start){super(physics,start);physics.sourceNonSlipperySlopes=true;this._poleSource=()=>[];}
  reset(start){super.reset(start);this.climbingPole=false;this.pole=null;this.poleOffset=0;this.poleGrabAge=0;this.poleCooldown=0;this.poleDownSpeed=0;this.poleSpeed=0;this.poleTop=false;this.poleGrabs=0;this.poleClimbDistance=0;this.horizontalWind=false;this.windDistance=0;this.moveIntent={x:0,z:0};}
  setPoleSource(source){this._poleSource=typeof source==='function'?source:()=>source||[];return this;}
  knockback(dx,dz,damage=1){const hit=super.knockback(dx,dz,damage);if(hit){this.climbingPole=false;this.pole=null;this.poleCooldown=.5;this.poleTop=false;this.longJumpCoasting=false;}return hit;}
  _leavePole(jump,input){
    const top=this.poleTop;this.climbingPole=false;this.pole=null;this.poleTop=false;this.poleCooldown=.45;this.grounded=false;this.coyote=0;this.jumpBuffer=0;
    if(jump){if(!top)this.yaw+=Math.PI;this.velocity.x=Math.sin(this.yaw)*7.2;this.velocity.z=Math.cos(this.yaw)*7.2;this.velocity.y=18.6;this.longJumpCoasting=false;this.events.push('jump','pole-jump');}
    else{this.velocity.x=-Math.sin(this.yaw)*.6;this.velocity.z=-Math.cos(this.yaw)*.6;this.velocity.y=0;}
  }
  update(dt,input={}){
    dt=clamp(Number(dt)||0,0,.1);this.moveIntent={x:clamp(Number(input.x)||0,-1,1),z:clamp(Number(input.z)||0,-1,1)};this.poleCooldown=Math.max(0,this.poleCooldown-dt);
    if(this.climbingPole){
      this.events=[];this.time+=dt;this.invincible=Math.max(0,this.invincible-dt);this.poleGrabAge+=dt;const pole=this.pole;
      if(this.dead||!pole||pole.enabled===false){this._leavePole(false,input);return super.update(dt,input);}
      if(input.jump&&this.poleGrabAge>.12){this._leavePole(true,input);return{jumped:true,landed:false,groundPound:false,landingSpeed:0};}
      if(input.groundPound||input.dive){this._leavePole(false,input);return{jumped:false,landed:false,groundPound:false,landingSpeed:0};}
      const base=point(pole.position),height=Number(pole.height)||7.1,up=clamp(Number(input.poleUp)||0,0,1),down=clamp(Number(input.poleDown)||0,0,1),turn=clamp(Number(input.poleTurn)||0,-1,1),previous=this.poleOffset;
      this.yaw-=turn*(80*16*Math.PI*2/65536)*30*dt;
      if(down>.2){this.poleDownSpeed=Math.min(4.8,this.poleDownSpeed+down*5.625*dt);this.poleOffset-=this.poleDownSpeed*dt;this.yaw+=this.poleDownSpeed/4.8*(4096*Math.PI*2/65536)*30*dt;this.poleTop=false;}
      else{this.poleDownSpeed=0;if(up>.1)this.poleOffset+=up*3*dt;}
      const maximum=Math.max(0,height-1);this.poleOffset=clamp(this.poleOffset,0,maximum);this.poleSpeed=(this.poleOffset-previous)/(dt||1);this.poleClimbDistance+=Math.max(0,this.poleOffset-previous);
      if(this.poleOffset>=maximum-.004&&up>.62)this.poleTop=true;
      this.position.x=base.x;this.position.z=base.z;this.position.y=base.y+this.poleOffset+(this.poleTop?.65:0);
      const ceiling=this.physics.ceilingAt(base.x,base.z,this.position.y);if(ceiling&&this.position.y+1.6>ceiling.height){this.position.y=ceiling.height-1.6;this.poleOffset=Math.max(0,this.position.y-base.y);this.poleTop=false;}
      const floor=this.physics.groundAt(base.x,base.z,this.position.y+.02);if(down>.2&&floor&&this.position.y<=floor.height+.05){this.position.y=floor.height;this._leavePole(false,input);this.grounded=true;this.coyote=.115;}
      this.velocity.x=this.velocity.y=this.velocity.z=0;this.speed=Math.abs(this.poleSpeed);if(this.climbingPole)this.grounded=false;this.pounding=this.diving=false;this.squash*=Math.exp(-12*dt);
      return{jumped:false,landed:false,groundPound:false,landingSpeed:0};
    }
    const result=super.update(dt,input);this.poleSpeed=0;this.horizontalWind=false;
    const windFloor=this.physics.groundAt(this.position.x,this.position.z,this.position.y+.2);
    if(!this.dead&&!this.swimming&&windFloor?.surface==='SURFACE_HORIZONTAL_WIND'){
      this.horizontalWind=true;const angle=((windFloor.triangle.force<<8)&65535)*Math.PI*2/65536,sx=Math.sin(angle),sz=Math.cos(angle);let push;
      if(this.grounded){const moving=Math.hypot(input.x||0,input.z||0)>.1,delta=Math.atan2(Math.sin(this.yaw-angle),Math.cos(this.yaw-angle));push=moving?-(this.speed>0?this.speed*.5:2.4):(.96+Math.floor(this.time*30)%4*.3);if(moving){if(Math.abs(delta)<Math.PI/2)push*=-1;push*=Math.cos(delta);}this.position.x+=sx*push*dt;this.position.z+=sz*push*dt;}
      else{push=10.8*dt;this.velocity.x+=sx*push;this.velocity.z+=sz*push;const speed=Math.hypot(this.velocity.x,this.velocity.z);if(speed>14.4){this.velocity.x*=14.4/speed;this.velocity.z*=14.4/speed;}this.position.x+=sx*push*dt;this.position.z+=sz*push*dt;}
      this.windDistance+=Math.abs(push*dt);
    }
    if(!this.dead&&!this.disabled&&!this.grounded&&!this.pounding&&this.poleCooldown<=0){
      for(const pole of this._poleSource?.()||[]){if(pole.enabled===false)continue;const q=point(pole.position),height=Number(pole.height)||7.1,relative=this.position.y-q.y;
        if(relative<-.1||relative>height-.6||Math.hypot(this.position.x-q.x,this.position.z-q.z)>(pole.radius??.8)+this.radius)continue;
        this.pole=pole;this.climbingPole=true;this.poleOffset=clamp(relative,0,height-1);this.poleGrabAge=0;this.poleGrabs++;this.poleTop=false;this.poleDownSpeed=0;this.position.x=q.x;this.position.z=q.z;this.position.y=q.y+this.poleOffset;this.velocity.x=this.velocity.y=this.velocity.z=0;this.grounded=false;this.pounding=this.diving=false;this.longJumpCoasting=false;this.events.push('pole-grab');break;
      }
    }
    return result;
  }
}

export class BowserMission {
  constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.world=null;this.reset();}
  reset(){this.position=point(this.course.mission.star.position);this.home=point(this.position);this.yaw=0;this.health=this.maxHealth=0;this.active=this.held=false;this.state='collecting';this.redCoinCount=0;this.redCollected=new Set();this.starReady=false;this.starCollectible=false;this.starPosition=point(this.position);this.releaseAge=0;this.releaseCount=0;this._rewardDelay=0;this.actionCooldown=0;this._player=null;}
  update(dt,p){
    this._player=p;this.actionCooldown=Math.max(0,this.actionCooldown-dt);if(p.dead)return;
    for(const c of this.world?.coins||[]){if(c.redIndex!==undefined&&c.collected&&!this.redCollected.has(c.redIndex)){this.redCollected.add(c.redIndex);this.redCoinCount=this.redCollected.size;this.callbacks.redCoin?.(this.redCoinCount);}}
    if(this.redCoinCount===8&&!this.starReady){this._rewardDelay+=dt;if(this._rewardDelay>3/30){this.starReady=true;this.state='star-appearing';this.releaseAge=0;this.releaseCount++;this.callbacks.star?.(this.starPosition);}}
    if(this.starReady&&!this.starCollectible){
      this.releaseAge+=dt;const t=this.releaseAge,hold=21/30,travel=31/30,bounceUp=20/30;
      // Source star-spawn action: initial spin, a 4 m rise/return, then
      // decelerating upward bounce and 3 m/s descent onto its fixed home.
      let height=0;if(t<hold)height=0;else if(t<hold+travel)height=Math.sin(Math.min(1,(t-hold)/travel)*Math.PI)*4;else{const b=t-hold-travel;if(b<bounceUp)height=6*b-4.5*b*b;else height=2-(b-bounceUp)*3;}
      this.starPosition.y=this.home.y+Math.max(0,height);
      if(t>=hold+travel+bounceUp+2/3){this.starPosition=point(this.home);this.starCollectible=true;this.state='star-ready';}
    }
  }
  get objective(){return this.starCollectible?'Collect the red-coin star':this.starReady?'Your eight-coin star is appearing':`Collect the eight red pasta coins · ${this.redCoinCount} / 8`;}
  context(p){if(p.climbingPole&&this.course.id==='bitfs'){if(p.pole?.parentId==='bitfs_sinking_cage_2')return'Jump from partway up this pole into the opening beneath the upper block. Face away from the landing first.';if(p.pole?.parentId==='bitfs_sinking_cage_1')return'Slide down through the middle opening, then turn again and jump toward the lower landing.';if(p.pole?.parentId==='bitfs_sinking_cage_3')return'Climb to the tip and wait for the highest point. Jump toward the thin upper rail, then AIR DIVE at the top of the arc.';}if(p.climbingPole)return p.poleTop?'At the top. Turn with left/right, then jump toward a platform.':'Climb with forward, slide down with backward. Turn left/right, then jump away.';if(this.starReady)return'The eight red coins revealed the star. Reach the golden pasta marker.';return this.world?.courseHint?.(p)||null;}
  action(p){if(p.dead||this.actionCooldown>0)return false;this.actionCooldown=.25;return this.world?.attackScenery?.(p)||false;}
  onGroundPound(p){return this.world?.attackScenery?.(p,true)||false;}
}
