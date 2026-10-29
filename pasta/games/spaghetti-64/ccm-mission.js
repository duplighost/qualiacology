// Cool, Cool Mountain, first star. The original game sets its slide-visited
// flag upon entering area 2, and creates the star after returning to area 1.
// Neither racing the penguin nor a time limit is part of this mission.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const horizontal=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export class CcmMission {
  constructor(physics,course,callbacks={}){
    this.physics=physics;this.course=course;this.callbacks=callbacks;
    this.definition=course.mission||{};
    this.entry=point(this.definition.entry?.position||[-1.81,29.18,-14.86]);
    this.exit=point(this.definition.exit?.position||[-76.28,-58.36,-69.88]);
    this.exteriorDoor=point(this.definition.exteriorDoor?.position||[24.64,-46.07,43.02]);
    this.finish=point(this.definition.finish?.position||[-65,-58.36,-64]);
    this.starDestination=point(this.definition.star?.position||course.star?.position||course.star||[25,-43.5,57.5]);
    this.starRelease=point(this.definition.star?.releasePosition||[27.8,-45.07,46.66]);
    this.world=null;this.reset();
  }
  emit(name,...args){this.callbacks[name]?.(...args);}
  reset(){
    this.area=1;this.state='cabin';this.active=false;this.held=false;
    this.position={...this.entry};this.yaw=0;this.homeFloor=this.entry.y;
    this.health=1;this.maxHealth=1;this.hitTimer=0;this.time=0;this.warpCooldown=0;
    this.enteredSlide=false;this.enteredThroughChimney=false;this.finishReached=false;
    this.slideTime=0;this.finishedTime=null;this.slideProgress=0;
    this.starReady=false;this.starCollectible=false;this.starAge=0;
    this.starPosition={...this.starDestination};this.areaTransitions=0;
  }
  get objective(){
    if(this.starReady)return 'Collect the pasta star outside the cabin';
    if(this.area===1)return 'Jump into the cabin chimney';
    return this.finishReached?'Leave through the cabin door':'Slide to the bottom · steer and brake';
  }
  context(player){
    if(!player)return '';
    const p=player.position;
    if(this.starReady)return 'Your first pasta star is outside the cabin';
    if(this.area===1){
      if(horizontal(p,this.entry)<10&&Math.abs(p.y-this.entry.y)<8)return 'Climb onto the roof and drop into the chimney';
      if(horizontal(p,this.exteriorDoor)<3&&Math.abs(p.y-this.exteriorDoor.y)<3)return 'Walk into the lower cabin door · E / ACT also opens it';
      return '';
    }
    if(horizontal(p,this.exit)<4&&Math.abs(p.y-this.exit.y)<4)return 'Walk into the door to return outside · E / ACT';
    if(this.finishReached)return 'The slide is complete. Leave through the wooden pasta door.';
    return player.sliding?'Steer into the bends · hold C / Ctrl to brake':'Follow the rice-noodle slide downward';
  }
  enterArea(index,player,{entry='warp'}={}){
    this.area=index;this.areaTransitions++;this.warpCooldown=.85;
    if(index===2){
      this.enteredSlide=true;
      if(entry==='chimney'){this.enteredThroughChimney=true;this.slideTime=0;this.finishedTime=null;this.finishReached=false;this.slideProgress=0;}
      this.state='slide';this.position={...this.finish};
      this.emit('message',entry==='chimney'?'The long slide awaits. Steer into each bend and brake before sharp turns.':'Inside the lower cabin. The door leads back outside.',4);
    }else{
      this.position={...this.starDestination};
      // This also preserves the source's legal lower-door shortcut. The
      // intended complete slide route is verified separately by the tests.
      if(this.enteredSlide&&!this.starReady)this.releaseStar();
      else if(!this.starReady)this.state='cabin';
    }
  }
  releaseStar(){
    if(this.starReady)return;
    this.starReady=true;this.starCollectible=false;this.starAge=0;this.health=0;
    this.starPosition={...this.starRelease};this.state='star';
    this.emit('defeat');this.emit('message','The mountain has served your first star. Collect it outside!',5);
  }
  _nearDoor(player,where){
    const p=player.position;
    return horizontal(p,where)<1.30&&p.y>=where.y-.65&&p.y<where.y+2.15;
  }
  _door(player){
    if(this.warpCooldown>0)return false;
    if(this.area===2&&this._nearDoor(player,this.exit)){
      this.world?.setArea(1,player,{warp:true,spawn:this.definition.returnSpawn,entry:'slide-exit'});return true;
    }
    if(this.area===1&&this._nearDoor(player,this.exteriorDoor)){
      const yaw=(this.definition.exit?.yaw??90)*Math.PI/180;
      const spawn={position:[this.exit.x+Math.sin(yaw)*3,this.exit.y,this.exit.z+Math.cos(yaw)*3],yaw:this.definition.exit?.yaw??90};
      this.world?.setArea(2,player,{warp:true,spawn,entry:'lower-door'});return true;
    }
    return false;
  }
  action(player){return this._door(player)?'opened':'none';}
  onGroundPound(){return false;}
  update(dt,player){
    dt=clamp(dt,0,.1);if(!dt||!player||player.dead)return;
    this.time+=dt;this.warpCooldown=Math.max(0,this.warpCooldown-dt);
    if(this.starReady&&!this.starCollectible){
      this.starAge+=dt;
      // The star follows the original release/destination locations. Its
      // short arrival arc is an independent browser animation.
      const t=clamp(this.starAge/1.45,0,1),ease=t*t*(3-2*t);
      this.starPosition={x:this.starRelease.x+(this.starDestination.x-this.starRelease.x)*ease,y:this.starRelease.y+(this.starDestination.y-this.starRelease.y)*ease+Math.sin(t*Math.PI)*3.2,z:this.starRelease.z+(this.starDestination.z-this.starRelease.z)*ease};
      if(t===1){this.starCollectible=true;this.starPosition={...this.starDestination};}
    }
    const p=player.position;
    if(this.area===1){
      if(this.warpCooldown<=0&&!this.starReady&&horizontal(p,this.entry)<(this.definition.entry?.radius??1.5)+player.radius*.35&&p.y+player.height>this.entry.y&&p.y<this.entry.y+(this.definition.entry?.height??.5)&&player.velocity.y<=2){
        this.world?.setArea(2,player,{warp:true,spawn:this.definition.entry?.destination||this.course.interior.start,entry:'chimney'});return;
      }
    }else{
      if(!this.finishReached){
        this.slideTime+=dt;
        this.slideProgress=clamp((66.56-p.y)/(66.56-this.finish.y),0,1);
        if(horizontal(p,this.finish)<(this.definition.finish?.radius??5)&&Math.abs(p.y-this.finish.y)<2.5){this.finishReached=true;this.finishedTime=this.slideTime;this.slideProgress=1;this.state='exit';this.emit('message','You reached the bottom. Walk through the cabin door to claim your star.',4);}
      }
    }
    this._door(player);
  }
}
