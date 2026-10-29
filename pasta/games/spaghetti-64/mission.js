// First-star encounter. World coordinates are original SM64 units / 100.
// Game-specific motion and noodle deformation are implemented independently.
const TAU = Math.PI * 2;
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const point = p => Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

export class BossEncounter {
  constructor(physics,spawn,callbacks={}) {
    this.physics=physics;
    this.spawn={position:point(spawn.position),yaw:(spawn.yaw||0)*Math.PI/180};
    this.home={...this.spawn.position};
    const floor=physics.groundAt(this.home.x,this.home.z,this.home.y+3);
    this.homeFloor=floor?.height??this.home.y;
    this.callbacks=callbacks;
    this._captured=null;
    this.reset();
  }

  _emit(name,...args){this.callbacks[name]?.(...args);}
  _releasePlayer(){
    if(this._captured){this._captured.disabled=this._priorDisabled||false;this._captured=null;}
  }
  reset(player){
    this._releasePlayer();
    this.position={x:this.home.x,y:this.homeFloor,z:this.home.z};
    this.velocity={x:0,y:0,z:0};
    this.yaw=this.spawn.yaw;
    this.state='idle';this.health=3;this.held=false;this.active=false;
    this.starReady=false;this.hitTimer=0;this.timer=0;this.escapeActions=0;
    this._throwScored=false;this._returnFrom=null;this._returnTime=0;
    if(player&&this._ownDisabled===player){player.disabled=false;this._ownDisabled=null;}
  }

  _relative(player){
    const dx=player.position.x-this.position.x,dz=player.position.z-this.position.z;
    const distance=Math.hypot(dx,dz);
    return {dx,dz,distance,vertical:player.position.y-this.position.y,
      front:distance>.0001?(dx*Math.sin(this.yaw)+dz*Math.cos(this.yaw))/distance:1};
  }
  _safeFloor(x,z){
    const floor=this.physics.groundAt(x,z,this.homeFloor+.7);
    return floor&&floor.walkable!==false&&floor.height>=this.homeFloor-.55?floor:null;
  }
  _returnHome(){
    this.held=false;this._releasePlayer();this.state='returning';this.timer=0;
    this._returnFrom={...this.position};this._returnTime=1.5;
    this.velocity={x:0,y:0,z:0};
    this._emit('message','Keep the king on the summit. That throw does not count.');
  }

  context(player){
    if(this.starReady)return 'Collect the pasta star!';
    if(this.held)return 'Throw the king onto the summit';
    if(this.state==='grabbing')return 'Tap grab repeatedly to wriggle free';
    if(!this.active)return '';
    const r=this._relative(player);
    if(Math.abs(r.vertical)>2.1||r.distance>8)return '';
    if(this.state==='windup')return 'He is reaching—move behind him!';
    if(this.state==='recovering')return 'The king is getting up';
    if(r.distance<=2.8&&r.front<-.15)return 'Grab from behind';
    return 'Circle behind the king';
  }

  action(player){
    if(this.state==='defeated')return 'none';
    if(this.state==='grabbing'&&this._captured===player){
      this.escapeActions++;
      if(this.escapeActions>=11){
        this._releasePlayer();this.state='recovering';this.timer=.9;
        player.velocity.y=5.2;player.grounded=false;
        player.velocity.x=-Math.sin(this.yaw)*4;player.velocity.z=-Math.cos(this.yaw)*4;
        this._emit('message','You slipped free!');
      }
      return 'blocked';
    }
    if(this.held){
      this.held=false;this.state='thrown';this.timer=0;this._throwScored=false;
      this.yaw=player.yaw;
      this.position.x=player.position.x+Math.sin(player.yaw)*1.5;
      this.position.z=player.position.z+Math.cos(player.yaw)*1.5;
      this.position.y=player.position.y+2.5;
      this.velocity={x:Math.sin(player.yaw)*8,y:9.5,z:Math.cos(player.yaw)*8};
      this._emit('message','Throw him onto the flat summit!');
      return 'thrown';
    }
    if(!this.active||!['chasing','windup'].includes(this.state)||player.dead)return 'none';
    const r=this._relative(player);
    if(r.distance>2.8||Math.abs(r.vertical)>1.8)return 'none';
    if(r.front>=-.15){this._emit('message','Get behind him to grab.');return 'blocked';}
    this.state='held';this.held=true;this.timer=0;this.velocity={x:0,y:0,z:0};
    this._emit('message','You have him. Aim toward the middle of the summit and throw.');
    return 'grabbed';
  }

  update(dt,player){
    dt=clamp(Number(dt)||0,0,.1);
    if(!dt||!player)return;
    this.hitTimer=Math.max(0,this.hitTimer-dt);
    if(this.state==='defeated')return;
    if(player.dead){this._releasePlayer();if(this.held)this._returnHome();return;}
    if(this.active&&player.position.y<this.homeFloor-12){
      this.reset(player);this._emit('message','The king has returned to his starting position.');return;
    }
    if(this.state==='idle'){
      const r=this._relative(player);
      if(r.distance<=5&&Math.abs(r.vertical)<=1.8){
        this.active=true;this.state='chasing';this.timer=.9;
        this._emit('dialogue','King Bob-omb','You climbed my mountain of pasta? Get behind me and throw me onto the summit three times. Throwing me off the mountain does not count!');
      }
      return;
    }
    if(this.state==='held'){
      this.position.x=player.position.x+Math.sin(player.yaw)*.8;
      this.position.z=player.position.z+Math.cos(player.yaw)*.8;
      this.position.y=player.position.y+2.7;
      this.yaw=player.yaw;return;
    }
    if(this.state==='thrown'){
      const steps=Math.max(1,Math.ceil(dt/(1/90))),h=dt/steps;
      for(let i=0;i<steps;i++){
        const oldY=this.position.y;this.velocity.y-=23*h;
        this.position.x+=this.velocity.x*h;this.position.y+=this.velocity.y*h;this.position.z+=this.velocity.z*h;
        const floor=this.physics.groundAt(this.position.x,this.position.z,oldY+.2);
        if(this.velocity.y<=0&&floor&&this.position.y<=floor.height){
          this.position.y=floor.height;this.velocity={x:0,y:0,z:0};
          if(floor.height>this.home.y-1&&!this._throwScored){
            this._throwScored=true;this.health=Math.max(0,this.health-1);this.hitTimer=.8;
            this._emit('hit',this.health);
            if(this.health===0){
              this.held=false;this.active=false;this.starReady=true;this.state='defeated';
              this._emit('message','The king is defeated. Collect the first pasta star!');this._emit('defeat');
            }else{
              this.state='recovering';this.timer=1.5;
              this._emit('message',`${3-this.health} of 3 throws. Get behind him again.`);
            }
          }else this._returnHome();
          break;
        }
        if(this.position.y<this.home.y-15){this._returnHome();break;}
      }
      return;
    }
    if(this.state==='returning'){
      this.timer+=dt;const t=clamp(this.timer/this._returnTime,0,1),s=t*t*(3-2*t),from=this._returnFrom;
      this.position.x=from.x+(this.home.x-from.x)*s;
      this.position.z=from.z+(this.home.z-from.z)*s;
      this.position.y=from.y+(this.homeFloor-from.y)*s+Math.sin(Math.PI*t)*7;
      if(t===1){this.state='recovering';this.timer=1;this.yaw=this.spawn.yaw;}
      return;
    }
    if(this.state==='recovering'){
      this.timer-=dt;
      if(this.timer<=0)this.state='chasing';
      return;
    }
    if(this.state==='grabbing'){
      this.timer-=dt;
      player.position.x=this.position.x+Math.sin(this.yaw)*1.7;
      player.position.z=this.position.z+Math.cos(this.yaw)*1.7;
      player.position.y=this.position.y+2.4;
      player.velocity.x=0;player.velocity.y=0;player.velocity.z=0;
      if(this.timer<=0){
        this._releasePlayer();
        const damaged=player.knockback(Math.sin(this.yaw),Math.cos(this.yaw),2);
        if(damaged!==false)this._emit('damage');
        this.state='recovering';this.timer=1.2;
        this._emit('message','Circle behind him while he is turning.');
      }
      return;
    }
    if(this.state==='windup'){
      this.timer-=dt;
      const r=this._relative(player);
      if(r.distance>3||r.front<.05||Math.abs(r.vertical)>2){this.state='recovering';this.timer=.5;return;}
      if(this.timer<=0){
        if(r.distance<=2.6&&r.front>.1&&!(player.invincible>0)){
          this.state='grabbing';this.timer=.8;this.escapeActions=0;
          this._captured=player;this._priorDisabled=!!player.disabled;player.disabled=true;
        }else{this.state='recovering';this.timer=.6;}
      }
      return;
    }
    if(this.state==='chasing'){
      if(this.timer>0){this.timer-=dt;return;}
      const r=this._relative(player),target=Math.atan2(r.dx,r.dz);
      this.yaw+=clamp(angleDelta(target,this.yaw),-.735*dt,.735*dt);
      this.yaw=(this.yaw+TAU)%TAU;
      const dx=Math.sin(this.yaw),dz=Math.cos(this.yaw);
      const nx=this.position.x+dx*.9*dt,nz=this.position.z+dz*.9*dt;
      const floor=this._safeFloor(nx,nz),ahead=this._safeFloor(nx+dx*1.35,nz+dz*1.35);
      if(floor&&ahead&&r.distance>1.8){this.position.x=nx;this.position.z=nz;this.position.y=floor.height;}
      const near=this._relative(player);
      if(near.distance<2.1&&near.front>.18&&Math.abs(near.vertical)<1.8&&!(player.invincible>0)){
        this.state='windup';this.timer=.65;this._emit('message','He is reaching—slip behind him!');
      }
    }
  }
}
