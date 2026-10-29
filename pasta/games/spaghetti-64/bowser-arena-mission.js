import {TtmController} from './ttm-mission.js';

const TAU=Math.PI*2,UNIT=TAU/65536;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const flat=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function sweptDistance(a,b,p){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,l=dx*dx+dy*dy+dz*dz,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/l,0,1):0;return Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y,a.z+dz*t-p.z);}

// Running/jumping remain the established browser controller. During a real
// tail grab, left/right supplies angular acceleration instead of locomotion.
// The angular cap and release velocity conversion are from the source game.
export class BowserArenaController extends TtmController {
  setArenaWorld(world){this.arenaWorld=world;return this;}
  reset(start){super.reset(start);this.bowserSpin=0;this.bowserHeld=false;}
  update(dt,input={}){
    const m=this.arenaWorld?.mission;this.bowserHeld=!!m?.held;
    if(!this.bowserHeld||this.dead)return super.update(dt,input);
    this.events=[];dt=clamp(Number(dt)||0,0,.1);this.time+=dt;this.invincible=Math.max(0,this.invincible-dt);
    const spin=clamp(Number(input.spin??input.poleTurn??input.x)||0,-1,1);
    m.spinSpeed=clamp(m.spinSpeed+spin*128*UNIT*30*30*dt,-4096*UNIT*30,4096*UNIT*30);
    if(Math.abs(spin)<.08)m.spinSpeed+=clamp(-m.spinSpeed,-64*UNIT*30*30*dt,64*UNIT*30*30*dt);
    this.yaw+=m.spinSpeed*dt;this.bowserSpin=m.spinSpeed;this.speed=0;
    this.velocity.x=this.velocity.z=0;this.pounding=this.diving=false;this.longJumpCoasting=false;
    const f=this.physics.groundAt(this.position.x,this.position.z,this.position.y+.4);
    if(f&&Math.abs(f.height-this.position.y)<.65){this.position.y=f.height;this.velocity.y=0;this.grounded=true;}
    else{m.drop(this);return super.update(dt,{...input,spin:0});}
    this.squash*=Math.exp(-10*dt);
    return{landed:false,jumped:false,groundPound:false,landingSpeed:0};
  }
}

export class BowserArenaMission {
  constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.world=null;this.stage=course.mission.stage;this.rewardKind=course.mission.reward;this.home=point(course.boss.position);this.homeFloor=course.mission.floorHeight;this.maxHealth=course.mission.hits;this.reset();}
  reset(){
    this.position=point(this.home);this.position.y=this.homeFloor;this.yaw=(this.course.boss.yaw||0)*Math.PI/180;this.velocity={x:0,y:0,z:0};
    this.state='idle';this.health=this.maxHealth;this.active=false;this.held=false;this.starReady=this.starCollectible=false;
    this.starPosition=point(this.course.mission.star.position);this.starHome=point(this.starPosition);this.hitTimer=0;this.timer=0;this.age=0;this.cycles=0;this.spinSpeed=0;this.hits=0;this.throws=0;this.grabs=0;this.misses=0;this.releases=0;this.rewardCollected=false;this.actionCooldown=0;this.opacity=1;this.bodySquash=0;this.walkPhase=0;this.flameTimer=0;this._player=null;this._returnFrom=null;this._collapseTriggered=false;this._lastGrounded=true;this._heldAge=0;
  }
  get tailPosition(){return{x:this.position.x-Math.sin(this.yaw)*3.5,y:this.position.y+.65,z:this.position.z-Math.cos(this.yaw)*3.5};}
  get spinFraction(){return Math.abs(this.spinSpeed)/(4096*UNIT*30);}
  get objective(){if(this.starCollectible)return this.rewardKind==='grand-star'?'Collect the Grand Star':this.rewardKind==='key1'?'Collect the basement key':'Collect the upper castle key';if(this.starReady||this.state==='melting')return'The reward is appearing';if(this.state==='fallen')return'Approach the defeated Bowser';if(this.held)return`Spin left / right · ${Math.round(this.spinFraction*100)}% · release toward a pasta bomb`;return`Grab Bowser’s tail and throw him into a bomb · ${this.hits} / ${this.maxHealth}`;}
  context(p){if(this.starReady)return this.objective;if(this.state==='fallen')return'Approach Bowser and face him, or press ACT nearby.';if(this.state==='melting')return'The last of his pasta is unwinding. Reach the reward when it settles.';if(this.held)return'Spin with left / right. Press GRAB again when Bowser points toward a pasta bomb.';if(this.state==='tilting')return'The whole arena is tilting. Stay near the center until it settles.';if(this.state==='jump')return'Jump over the expanding pasta shockwave when he lands.';if(this.state==='charge')return'Dodge sideways. His tail is exposed when he skids to a stop.';if(['thrown','returning','dying'].includes(this.state))return'';const tail=this.tailPosition;if(flat(p.position,tail)<2.1&&Math.abs(p.position.y-tail.y)<2)return'GRAB his tail. Spin left / right, then release toward a bomb.';return'Circle around his shell and approach the tip of his tail.';}
  _message(t){this.callbacks.message?.(t,4);}
  _state(s){this.state=s;this.timer=0;}
  _damage(p,from=this.position,amount=2){if(p.dead||this.held)return;this.world?.damagePlayer(p,from,amount);}
  action(p){
    if(p.dead||this.actionCooldown>0||this.starReady)return false;
    this.actionCooldown=.2;
    if(this.state==='fallen'&&flat(p.position,this.position)<7){this._defeatedDialogue();return'talked';}
    if(this.held){this.release(p);return'thrown';}
    if(!this.active||!['walk','flame','fire-fan','fire-rain','windup','recover','charge','dance'].includes(this.state))return false;
    const tail=this.tailPosition,dx=p.position.x-this.position.x,dz=p.position.z-this.position.z,back=(dx*Math.sin(this.yaw)+dz*Math.cos(this.yaw))/(Math.hypot(dx,dz)||1);
    if(flat(p.position,tail)>1+p.radius||Math.abs(p.position.y-tail.y)>1.7||back>-.45||!p.grounded)return false;
    this.held=true;this.state='held';this.timer=0;this._heldAge=0;this.spinSpeed=0;this.grabs++;this.velocity={x:0,y:0,z:0};p.yaw=Math.atan2(this.position.x-p.position.x,this.position.z-p.position.z);p.velocity.x=p.velocity.z=0;p.bowserHeld=true;
    this._message('Tail grabbed. Hold left or right to build spin, then GRAB again to release toward a bomb.');return'grabbed';
  }
  onGroundPound(){return false;}
  drop(p){if(!this.held)return;this.spinSpeed=0;this.release(p);}
  getThrowPreview(p=this._player){
    if(!p)return null;const angularUnits=this.spinSpeed/(UNIT*30),pitch=-Math.abs(angularUnits)*UNIT;let speed=Math.abs(angularUnits/3000*70);if(speed>90)speed*=2.5;speed*=.3;
    return{speed,angularUnits,pitch,position:{x:p.position.x+Math.sin(p.yaw)*4.3,y:p.position.y+1.05,z:p.position.z+Math.cos(p.yaw)*4.3},velocity:{x:Math.sin(p.yaw)*Math.cos(pitch)*speed,y:-Math.sin(pitch)*speed,z:Math.cos(p.yaw)*Math.cos(pitch)*speed}};
  }
  release(p){
    this.held=false;p.bowserHeld=false;this._state('thrown');this.throws++;this.yaw=p.yaw;
    this._lastLaunch=this.getThrowPreview(p);this.position=point(this._lastLaunch.position);this.velocity=point(this._lastLaunch.velocity);this._throwBounces=0;
    this._message(this.spinFraction>.9?'Released!':'Released. Faster spins carry him farther.');
  }
  _return(){this.held=false;this._returnFrom=point(this.position);this._state('returning');this.velocity={x:0,y:0,z:0};this.misses++;}
  _mineHit(bomb){
    bomb.active=false;this.world?.explodeBomb(bomb);this.health--;this.hits++;this.hitTimer=1.2;this.held=false;this.spinSpeed=0;
    this.callbacks.hit?.(this.health);this._returnFrom=point(this.position);
    if(this.health<=0){this._state('dying');this._message(this.stage===3?'Bowser is defeated. The Grand Star is yours.':'Bowser is defeated. Collect the castle key.');}
    else{this._state('returning');this._returnAfterHit=true;this._message(`${this.hits} of ${this.maxHealth} bomb hits. Circle behind him again.`);}
  }
  _defeatedDialogue(){
    if(this.state!=='fallen')return;this._state('melting');this.active=false;this.starHome={x:this.position.x,y:this.homeFloor+2,z:this.position.z};this.starPosition=point(this.starHome);
    const text=this.stage===1?'My tail! My magnificent pasta tail! Take the key. The basement is yours—but there is more of this kingdom below.':this.stage===2?'You kept your footing through all that? Take the upper castle key. I will be waiting at the very top.':'Three throws. Three bombs. Every last strand defeated. Take the Grand Star and bring this pasta kingdom home.';
    this.callbacks.dialogue?.('BOWSER',text);
  }
  _floor(x=this.position.x,z=this.position.z,y=this.position.y+2){const f=this.physics.groundAt(x,z,y);return f&&!/BURNING|DEATH_PLANE/.test(f.surface)?f:null;}
  _land(p){this.position.y=this._floor()?.height??this.homeFloor;this.velocity.y=0;this.bodySquash=.3;this.world?.landingImpact(this.position,this.stage===3);if(this.stage===2){this._state('tilting');this.world?.beginTilt(this.position);}else this._state('recover');if(flat(p.position,this.position)<4&&Math.abs(p.position.y-this.position.y)<2)this._damage(p,this.position,2);}
  _choose(p){
    this.cycles++;const distance=flat(this.position,p.position);
    if(this.stage===3&&this.health===1&&!this._collapseTriggered){this._collapseTriggered=true;this.world?.beginCollapse();this._state('dance');return;}
    if(this.stage===2&&this.cycles%5===0){this._state('teleport');this._teleportFrom=point(this.position);const r=Math.min(15,flat(p.position,{x:0,z:0})+4),a=Math.atan2(-p.position.x,-p.position.z);this._teleportTo={x:Math.sin(a)*r,y:this.homeFloor,z:Math.cos(a)*r};return;}
    if(this.stage===3&&this.cycles%5===0){this._state('fire-rain');this.flameTimer=0;return;}
    if(this.stage>1&&this.cycles%4===0){this._state('fire-fan');this.flameTimer=0;return;}
    if(this.stage>1&&this.cycles%3===0){this._state('windup');this._nextAttack='jump';return;}
    if(distance>9&&this.cycles%2===0){this._state('windup');this._nextAttack='charge';return;}
    if(this.cycles%2===1){this._state('flame');this.flameTimer=0;return;}
    this._state('walk');
  }
  update(dt,p){
    if(!p)return;dt=clamp(Number(dt)||0,0,.1);this._player=p;this.age+=dt;this.timer+=dt;this.hitTimer=Math.max(0,this.hitTimer-dt);this.actionCooldown=Math.max(0,this.actionCooldown-dt);this.bodySquash*=Math.exp(-6*dt);
    if(p.dead){if(this.held)this.drop(p);return;}
    if(this.state==='idle'){
      if(p.grounded){this.active=true;this._state('intro');this._message('Circle behind Bowser, grab his tail, spin, and release him toward a pasta bomb.');}return;
    }
    if(this.state==='intro'){this.yaw+=clamp(delta(this.yaw,Math.atan2(p.position.x-this.position.x,p.position.z-this.position.z)),-dt*.4,dt*.4);if(this.timer>1.7){if(this.stage===2){this._state('windup');this._nextAttack='jump';}else this._state('walk');}return;}
    if(this.state==='fallen'){const facing=Math.abs(delta(p.yaw,Math.atan2(this.position.x-p.position.x,this.position.z-p.position.z)));if(flat(p.position,this.position)<7&&Math.abs(p.position.y-this.position.y)<4&&facing<Math.PI*.4)this._defeatedDialogue();return;}
    if(this.state==='melting'){this.yaw+=dt*(3+this.timer*4);if(this.timer>=1.2){this._state('reward-appearing');this.starReady=true;this.starCollectible=false;this._rewardAge=0;this.releases++;this.starPosition=point(this.starHome);this.callbacks.defeat?.();}return;}
    if(this.starReady){this._rewardAge+=dt;const t=this._rewardAge;this.starPosition.y=this.starHome.y+Math.sin(Math.min(t/1.5,1)*Math.PI)*3.2;if(t>=1.5){this.starPosition.y=this.starHome.y;this.starCollectible=true;this.state='defeated';}return;}
    if(this.state==='held'){
      this._heldAge+=dt;this.position.x=p.position.x+Math.sin(p.yaw)*4.3;this.position.z=p.position.z+Math.cos(p.yaw)*4.3;this.position.y=p.position.y+1.05;this.yaw=p.yaw+Math.PI;this.walkPhase+=dt*5;
      if(this.stage===3&&this.health===1&&!this._collapseTriggered){this._collapseTriggered=true;this.world?.beginCollapse();}
      if(this._heldAge>4.1&&Math.abs(this.spinSpeed)<.01)this.release(p);return;
    }
    if(this.state==='thrown'){
      const steps=Math.ceil(dt/(1/120)),h=dt/steps;
      for(let i=0;i<steps;i++){
        const old=point(this.position);this.velocity.y-=36*h;for(const k of ['x','y','z'])this.position[k]+=this.velocity[k]*h;
        const bomb=this.world?.bombs.find(b=>b.active&&sweptDistance(old,this.position,b.position)<8);
        if(bomb){this._mineHit(bomb);return;}
        const f=this._floor(this.position.x,this.position.z,old.y+.15);
        if(f&&this.velocity.y<0&&this.position.y<=f.height){this.position.y=f.height;this.velocity.x=this.velocity.z=0;this.velocity.y=0;this.misses++;this._state('recover');this.bodySquash=.3;break;}
        if(this.position.y<this.homeFloor-12||Math.hypot(this.position.x,this.position.z)>78){this._return();return;}
      }return;
    }
    if(this.state==='returning'||this.state==='dying'){
      const t=clamp(this.timer/2,0,1),s=t*t*(3-2*t),a=this._returnFrom||this.home;
      this.position.x=a.x+(this.home.x-a.x)*s;this.position.z=a.z+(this.home.z-a.z)*s;this.position.y=a.y+(this.homeFloor-a.y)*s+Math.sin(t*Math.PI)*9;
      if(t>=1){this.position=point(this.home);this.position.y=this.homeFloor;if(this.state==='dying'){
        this.active=false;this._state('fallen');
      }else{this.world?.landingImpact(this.position,this.stage===3);if(this.health===1&&this.stage===3&&!this._collapseTriggered){this._collapseTriggered=true;this.world?.beginCollapse();this._state('dance');}else this._state('recover');this._returnAfterHit=false;}}
      return;
    }
    if(this.state==='teleport'){
      const t=this.timer;this.opacity=t<.6?1-t/.6:t<.9?0:clamp((t-.9)/.6,0,1);
      if(t>=.75&&!this._teleported){this.position=point(this._teleportTo);this._teleported=true;}
      if(t>=1.5){this.opacity=1;this._teleported=false;this._state('recover');}return;
    }
    if(this.state==='tilting'){if(!this.world?.tilting&&this.timer>1)this._state('recover');return;}
    if(this.state==='dance'){this.walkPhase+=dt*4;if(this.timer>3)this._state('walk');return;}
    if(this.state==='recover'){if(this.timer>2)this._state('walk');return;}
    if(this.state==='windup'){this.bodySquash=.12*Math.sin(this.timer*6);if(this.timer>.85){if(this._nextAttack==='jump'){this.world?.beginBossJump(this.position);this._state('jump');this.velocity.y=22.5;this.velocity.x=Math.sin(this.yaw)*3;this.velocity.z=Math.cos(this.yaw)*3;}else this._state('charge');}return;}
    if(this.state==='jump'){
      const oldY=this.position.y;this.velocity.y-=36*dt;this.position.x+=this.velocity.x*dt;this.position.z+=this.velocity.z*dt;this.position.y+=this.velocity.y*dt;
      const f=this._floor(this.position.x,this.position.z,oldY+.2);if(f&&this.velocity.y<=0&&this.position.y<=f.height)this._land(p);else if(this.position.y<this.homeFloor-12)this._return();return;
    }
    const distance=flat(this.position,p.position),target=Math.atan2(p.position.x-this.position.x,p.position.z-this.position.z);
    if(this.state==='walk'){
      this.yaw+=clamp(delta(this.yaw,target),-(this.stage===1?.48:.65)*dt,(this.stage===1?.48:.65)*dt);
      const speed=this.stage===1?1.35:1.9,x=this.position.x+Math.sin(this.yaw)*speed*dt,z=this.position.z+Math.cos(this.yaw)*speed*dt,f=this._floor(x,z);
      if(f){this.position.x=x;this.position.z=z;this.position.y=f.height;this.walkPhase+=dt*3;}else this.yaw+=dt*1.2;
      if(this.timer>3.4)this._choose(p);
    }else if(this.state==='flame'){
      this.yaw+=clamp(delta(this.yaw,target),-.18*dt,.18*dt);this.flameTimer-=dt;
      if(this.timer>.6&&this.timer<2.2&&this.flameTimer<=0){this.flameTimer=.12;this.world?.spawnFlame({x:this.position.x+Math.sin(this.yaw)*2.9,y:this.position.y+2.2,z:this.position.z+Math.cos(this.yaw)*2.9},this.yaw+Math.sin(this.timer*3)*.25);}
      if(this.timer>3.1)this._state('walk');
    }else if(this.state==='fire-fan'||this.state==='fire-rain'){
      this.flameTimer-=dt;
      if(this.timer>.75&&this.timer<2.45&&this.flameTimer<=0){this.flameTimer=.5;const rain=this.state==='fire-rain';for(let j=-2;j<=2;j++){const yaw=this.yaw+j*.32+Math.sin(this.timer*2)*.15;this.world?.spawnFlame({x:this.position.x+Math.sin(this.yaw)*2.6,y:this.position.y+2.5,z:this.position.z+Math.cos(this.yaw)*2.6},yaw,{speed:rain?8+j*.5:9,vertical:rain?14+Math.cos(j)*2:3,gravity:rain?12:18,life:rain?7:5});}}
      if(this.timer>3.6)this._state('walk');
    }else if(this.state==='charge'){
      const speed=this.timer<1.8?15:Math.max(0,15-(this.timer-1.8)*10),x=this.position.x+Math.sin(this.yaw)*speed*dt,z=this.position.z+Math.cos(this.yaw)*speed*dt,f=this._floor(x,z);
      if(f&&Math.hypot(x,z)<24){this.position.x=x;this.position.z=z;this.position.y=f.height;this.walkPhase+=dt*9;}else{this._state('recover');this.bodySquash=.2;}
      if(this.timer>3.3)this._state('recover');
    }
    if(distance<1+p.radius&&p.position.y<this.position.y+3&&p.position.y+p.height>this.position.y)this._damage(p);
  }
  collectReward(p=this._player){
    if(this.rewardCollected||!this.starCollectible||!p||p.dead||flat(p.position,this.starPosition)>=1.4||Math.abs(p.position.y+1-this.starPosition.y)>=2.2)return null;
    this.rewardCollected=true;const event=this.rewardKind==='key1'?{key1:true}:this.rewardKind==='key2'?{key2:true}:{ending:true};this.world?.callbacks.adventure?.(event);return event;
  }
}
