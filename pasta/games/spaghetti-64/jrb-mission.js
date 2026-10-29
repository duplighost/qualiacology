// Jolly Roger Bay, mission one. The bay and the flooded ship share one
// persistent puzzle state; every transition is initiated by normal play.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const difference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const defaultChests=[{order:1,position:[4,-3.5,-27],yaw:0},{order:2,position:[6.5,-3.5,-9.4],yaw:-135.0055},{order:3,position:[-5.5,-3.5,-7.7],yaw:134.9945},{order:4,position:[1,-3.5,-17],yaw:0}];

export class JrbMission {
  constructor(physics,course,callbacks={}){
    this.physics=physics;this.course=course;this.callbacks=callbacks;this.definition=course.mission||{};
    const data=this.definition;
    this.eelHome=point(data.eel?.position||[60.48,-53.81,11.54]);
    this.eelHead=point(data.eel?.headPosition||data.hatch?.position||[58,-49,17]);
    this.hatch=point(data.hatch?.position||[57,-48,20]);
    this.hatchRadius=data.hatch?.radius||2.3;
    this.boxPosition=point(data.starBox?.position||[0,16,30]);
    this.chests=(data.chests||defaultChests).map(c=>({...c,position:point(c.position),yaw:(c.yaw||0)*Math.PI/180,open:false,lid:0,wrong:false}));
    this.waterStart=data.water?.interiorLevel??27.65;this.waterEnd=data.water?.drainedLevel??-3.35;this.drainSpeed=data.water?.drainPerSecond??1.5;
    this.eelPath=(data.eel?.path||[[53,-38,12],[45,-38,28],[37,-33,36],[30,-28,23],[39,-31,3],[53,-38,12]]).map(point);
    this.world=null;this.reset();
  }
  emit(name,...args){this.callbacks[name]?.(...args);}
  reset(){
    this.area=1;this.state='eel';this.position={...this.eelHome};this.homeFloor=this.eelHome.y;this.yaw=340*Math.PI/180;this.held=false;this.active=false;this.health=4;this.maxHealth=4;this.hitTimer=0;this.starReady=false;
    this.eelState='peeking';this.eelArmed=false;this.eelTravel=0;this.eelPosition={...this.eelHome};this.eelDamageCooldown=0;this.eelNotice=false;
    this.nextChest=1;this.wrongChest=null;this.waterLevel=this.waterStart;this.drainStarted=false;this.boxBroken=false;this.boxHitTimer=0;this.starVelocity=null;
    this.starPosition={x:this.boxPosition.x,y:this.boxPosition.y+.4,z:this.boxPosition.z};this.starCollectible=false;this.starPhase=0;this.time=0;this.warpCooldown=0;this.sequenceCompleted=false;
    for(const c of this.chests){c.open=false;c.lid=0;c.wrong=false;}
  }
  get openedCount(){return this.nextChest-1;}
  get objective(){
    if(this.starReady)return 'Collect the pasta star';
    if(this.area===1){if(this.eelState==='swimming')return 'Enter the sunken ship';if(this.eelArmed)return 'Swim away so the eel leaves';return 'Find the eel in the sunken ship';}
    if(this.nextChest<5)return `Open the chests in order · ${this.nextChest-1} / 4`;
    if(this.waterLevel>this.boxPosition.y-1)return 'The ship is draining · swim upward';
    return 'Climb the ship and break the star box';
  }
  context(player){
    if(!player)return '';
    if(this.starReady)return 'Collect the first pasta star!';
    if(this.area===1){
      if(this.eelState==='swimming'&&distance(player.position,this.hatch)<10)return 'Swim into the opening in the ship';
      if(this.eelArmed)return 'He noticed you. Swim far away, then come back.';
      if(distance(player.position,this.eelHead)<15)return 'Approach the eel, then retreat toward the surface';
      return '';
    }
    if(this.nextChest<5){
      if(this.wrongChest)return 'Wrong order. Swim clear to reset the chests.';
      if(this.chests.some(c=>!c.open&&distance(player.position,c.position)<4))return 'Face a chest and swim toward it to open';
      return 'Four chests. Discover the opening order.';
    }
    if(distance(player.position,this.boxPosition)<5)return player.swimming?'The box must be struck out of the water':'Jump and PUNCH / E, or ground pound the star box';
    return this.waterLevel>this.waterEnd+.01?'The pasta current is draining. Reach the high ledge.':'Climb the dry ledges to the star box';
  }
  _openChest(chest,player){
    if(this.wrongChest||chest.open)return false;
    if(chest.order===this.nextChest){
      chest.open=true;this.nextChest++;this.health=5-this.nextChest;this.world?.spawnBreathBubble?.(chest.position,chest.yaw);this.emit('chest',chest.order,chest.position);this.emit('message',chest.order===4?'Four chests open. The ship is draining. Swim toward the high ledge!':`Chest ${chest.order} of 4. Collect the rice-noodle air pocket for a breath.`);
      if(this.nextChest===5){this.sequenceCompleted=true;this.drainStarted=true;this.state='draining';this.emit('puzzleComplete');}
    }else{
      this.wrongChest=chest;this.nextChest=1;this.health=4;for(const c of this.chests){c.open=false;c.wrong=false;}chest.wrong=true;
      player.knockback?.(player.position.x-chest.position.x,player.position.z-chest.position.z,1);this.emit('damage');this.emit('message','Wrong order. Swim away from the chest, then try again.');
    }
    return true;
  }
  tryChest(player){
    if(this.area!==2||this.nextChest>4||this.wrongChest)return false;
    for(const c of this.chests){if(c.open)continue;
      // The source checks facing within 0x3000 of the opposite chest yaw.
      if(distance(player.position,c.position)<1.52&&Math.abs(difference(player.yaw+Math.PI,c.yaw))<Math.PI*.375)return this._openChest(c,player);
    }
    return false;
  }
  breakBox(player){
    if(this.area!==2||this.boxBroken||this.nextChest<5||player.swimming)return false;
    const p=player.position,b=this.boxPosition;
    if(Math.hypot(p.x-b.x,p.z-b.z)>2||p.y>b.y+3.4||p.y+player.height<b.y+.49)return false;
    this.boxBroken=true;this.boxHitTimer=.24;this.state='star-box';this.emit('message','The star box is open. Collect your pasta star!');this.emit('boxBroken',b);
    return true;
  }
  action(player){if(this.tryChest(player))return 'opened';if(this.breakBox(player))return 'opened';return 'none';}
  onGroundPound(player){return this.breakBox(player);}
  _updateEel(dt,player){
    const p=player.position;
    if(this.eelState==='peeking'){
      if(!this.eelArmed&&distance(p,this.eelHead)<(this.definition.eel?.armRadius||7)){this.eelArmed=true;this.emit('message','The eel noticed you. Retreat toward the surface, then return to the ship.');}
      if(this.eelArmed&&distance(p,this.eelHome)>(this.definition.eel?.retreatDistance||45)){this.eelState='swimming';this.state='enter-ship';this.eelTravel=0;this.eelPosition={...this.eelPath[0]};this.emit('message','The eel has left the ship. Its opening is clear.');}
    }else{
      this.eelTravel+=dt*3;let remain=this.eelTravel,total=0;for(let i=1;i<this.eelPath.length;i++)total+=distance(this.eelPath[i-1],this.eelPath[i]);remain%=total||1;
      for(let i=1;i<this.eelPath.length;i++){const a=this.eelPath[i-1],b=this.eelPath[i],length=distance(a,b);if(remain<=length){const t=remain/(length||1);this.eelPosition={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};this.yaw=Math.atan2(b.x-a.x,b.z-a.z);break;}remain-=length;}
    }
    this.position={...this.eelPosition};this.eelDamageCooldown=Math.max(0,this.eelDamageCooldown-dt);
    if(this.eelDamageCooldown===0&&distance(p,this.eelState==='peeking'?this.eelHead:this.eelPosition)<1.65){if(player.knockback?.(p.x-this.eelPosition.x,p.z-this.eelPosition.z,3)){this.eelDamageCooldown=2;this.emit('damage');}}
    // The actual warp surface is always present. The eel obstructs its intended
    // approach; after it leaves, normal swimming into the hatch changes areas.
    if(this.eelState==='swimming'&&this.warpCooldown<=0&&distance(p,this.hatch)<this.hatchRadius){this.area=2;this.state='chests';this.position={...this.chests[0].position};this.world?.setArea(2,player,{warp:true});this.emit('message','Inside the sunken ship. Face a treasure chest and swim toward it.');this.warpCooldown=1;}
  }
  update(dt,player){
    dt=clamp(dt,0,.1);if(!dt||!player||player.dead)return;this.time+=dt;this.warpCooldown=Math.max(0,this.warpCooldown-dt);this.hitTimer=Math.max(0,this.hitTimer-dt);
    for(const c of this.chests)c.lid+=(Number(c.open)-c.lid)*Math.min(1,dt*(c.open?3.5:12));
    if(this.area===1){this._updateEel(dt,player);return;}
    if(this.wrongChest&&distance(player.position,this.wrongChest.position)>5){this.wrongChest.wrong=false;this.wrongChest=null;}
    this.tryChest(player);
    if(this.drainStarted){this.waterLevel=Math.max(this.waterEnd,this.waterLevel-dt*this.drainSpeed);if(this.waterLevel===this.waterEnd&&!this.boxBroken)this.state='star-box';}
    if(this.boxBroken&&!this.starReady){this.boxHitTimer-=dt;if(this.boxHitTimer<=0){this.starReady=true;this.state='complete';this.starPosition={x:this.boxPosition.x,y:this.boxPosition.y+.4,z:this.boxPosition.z};this.starHomeY=this.starPosition.y;this.starVelocity=15;this.starPhase=0;this.emit('defeat');}}
    if(this.starReady&&!this.starCollectible){
      const g=this.starPhase===0?36:9;this.starVelocity-=g*dt;if(this.starPhase===1)this.starVelocity=Math.max(-1.5,this.starVelocity);this.starPosition.y+=this.starVelocity*dt;
      if(this.starVelocity<0&&this.starPosition.y<=this.starHomeY){this.starPosition.y=this.starHomeY;if(this.starPhase===0){this.starPhase=1;this.starVelocity=6;}else{this.starPhase=2;this.starPosition.y=this.boxPosition.y+.35;this.starCollectible=true;this.starVelocity=0;}}
    }
  }
}
