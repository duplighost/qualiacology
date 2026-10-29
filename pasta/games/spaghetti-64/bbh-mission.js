// Big Boo's Haunt, Go on a Ghost Hunt. Coordinates are source units / 100.
// Room activation, the five-minion gate, angular shyness, three boss hits,
// star destination and delayed staircase follow n64decomp's boo.inc.c.
// Integration, collision response and strand animation are browser-native.
import {CoursePhysics} from './physics.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const faceThreshold=0x1568*Math.PI/32768;
const marioThreshold=0x6b58*Math.PI/32768;
const defaultGhosts=[[.2,1,-9.08],[31.5,1,3.98],[-20,1.5,-8],[28.51,1,22.89],[-15.51,1,-10.18]];

export class BbhMission {
  constructor(physics,course,callbacks={}){
    this.physics=physics;this.course=course;this.callbacks=callbacks;this.world=null;
    // Boos have ACTIVE_FLAG_MOVE_THROUGH_GRATE in the source. In this
    // mansion the blue portrait is a vanish-cap wall: Mario collides with
    // it, while the two library Boos can emerge through its pasta strands.
    this.ghostPhysics=new CoursePhysics({...course,triangles:(course.triangles||[]).filter(f=>!f[3]?.includes('INTANGIBLE')&&!f[3]?.includes('VANISH_CAP_WALLS'))});
    const m=this.definition=course.mission||{};
    this.ghostDefinitions=m.ghosts||course.objects?.filter(o=>o.kind==='bhvGhostHuntBoo')||defaultGhosts.map((position,i)=>({id:`ghost_${i}`,position,yaw:0}));
    const spawn=m.boss||course.boss||{position:[10,.5,10],yaw:0};
    this.home=point(spawn.position);this.homeFloor=physics.groundAt(this.home.x,this.home.z,this.home.y+.1)?.height??0;
    this.startYaw=(spawn.yaw||0)*Math.PI/180;this.bossRoom=spawn.room??1;
    this.starDestination=point(m.star?.position||course.star?.position||[9.8,11,2.5]);
    this.stairDefinition=m.staircase||{};
    this.stairTrigger=point(this.stairDefinition.triggerPosition||[9.73,0,6.26]);
    this.reset();
  }
  emit(name,...args){this.callbacks[name]?.(...args);}
  reset(){
    this.ghosts=this.ghostDefinitions.map((d,i)=>({id:d.id||`ghost_${i}`,index:i,home:point(d.position),position:point(d.position),room:d.room??null,startYaw:(d.yaw||0)*Math.PI/180,yaw:(d.yaw||0)*Math.PI/180,state:'dormant',health:1,alive:true,active:false,opacity:1,targetOpacity:1,baseScale:1,scale:1,radius:1.4,shy:false,tangible:false,hitTimer:0,deathTime:0,deathYaw:0,coinDropped:false,counted:false,bobPhase:i*1.7,aggro:1.6+i*.13}));
    this.position={...this.home};this.yaw=this.startYaw;this.health=3;this.maxHealth=3;
    this.state='hunt';this.active=false;this.alive=true;this.held=false;this.opacity=0;this.targetOpacity=0;
    this.baseScale=3;this.scale=3;this.radius=4.2;this.shy=false;this.tangible=false;this.hitTimer=0;this.bobPhase=0;
    this.time=0;this.defeatedCount=0;this.bossSpawned=false;this.bossDefeated=false;this.deathTime=0;this.deathYaw=0;
    this.bossDeathAge=0;this.stairsActive=false;this.stairTime=0;this.stairProgress=0;
    this.starReady=false;this.starCollectible=false;this.starAge=0;this.starPosition={...this.starDestination};
    this._attackCooldown=0;this._starRelease={...this.home};this._bossAnnounced=false;
  }
  get ghostCount(){return this.defeatedCount;}
  get remainingGhosts(){return Math.max(0,5-this.defeatedCount);}
  get objective(){
    if(this.starReady)return this.stairProgress>=1?'Climb the stairs and collect the pasta star':'The pasta staircase is rising · collect the star above';
    if(this.active)return `Defeat Big Boo · ${3-this.health} of 3 hits`;
    if(this.defeatedCount>=5)return 'Return to the main hall for Big Boo';
    return `Hunt the five first-floor Boos · ${this.defeatedCount} of 5`;
  }
  _room(position){
    const room=this.world?.roomAt?.(position);if(Number.isFinite(room))return room;
    if(room&&Number.isFinite(room.id))return room.id;
    return 0;
  }
  _sameRoom(g,player){
    if(g.room===null)g.room=this._room(g.home);
    const current=this._room(player.position);
    return current===0||g.room===0||g.room===current;
  }
  _looking(g,player){
    const toward=Math.atan2(player.position.x-g.position.x,player.position.z-g.position.z);
    // Original Boos hide only when both actors face one another within the
    // source thresholds. Circling behind a Boo therefore permits a punch.
    return Math.abs(angle(toward,g.yaw))<=faceThreshold&&Math.abs(angle(g.yaw,player.yaw))>=marioThreshold;
  }
  _visiblePath(g,player){
    const from={x:player.position.x,y:player.position.y+.95,z:player.position.z};
    const to={x:g.position.x,y:g.position.y+Math.min(.6,.25*g.baseScale),z:g.position.z};
    return !this.physics.raycastSegment(from,to,.025);
  }
  _canHit(g){return g.alive&&g.active&&g.tangible&&g.hitTimer<=0&&!['dying','dead','recovering','bouncing'].includes(g.state);}
  _hit(g,player){
    if(!this._canHit(g))return false;
    g.tangible=false;g.shy=false;g.hitTimer=g===this?1.6:1.05;
    g.deathYaw=player.yaw;g.deathTime=0;
    if(g===this){
      this.health--;this.emit('hit',this.health);
      if(this.health===0){this.alive=false;this.state='dying';this.bossDefeated=true;this.emit('message','Big Boo is unraveling. Watch the main hall for your star.',4);}
      else{this.baseScale-=.5;this.radius=1.4*this.baseScale;this.state='recovering';this.emit('message',`${3-this.health} of 3 hits. Big Boo is smaller and quicker.`,3);}
    }else{
      g.health=0;g.alive=false;g.state='dying';
      this.emit('ghostHit',g);this.world?.callbacks?.burst?.(g.position,14,this.world?.materials?.rice);
    }
    return true;
  }
  action(player){
    if(!player||player.dead||this._attackCooldown>0)return false;
    const candidates=[...this.ghosts,...(this.active?[this]:[])].filter(g=>this._canHit(g)).sort((a,b)=>distance(a.position,player.position)-distance(b.position,player.position));
    for(const g of candidates){
      const dx=g.position.x-player.position.x,dz=g.position.z-player.position.z,d=Math.hypot(dx,dz);
      const facing=d<.08?1:(dx*Math.sin(player.yaw)+dz*Math.cos(player.yaw))/d;
      if(d>1.4*g.baseScale+.78||facing<.25||Math.abs(player.position.y+.9-(g.position.y+.3*g.baseScale))>1.25+.25*g.baseScale||!this._visiblePath(g,player))continue;
      if(this._hit(g,player)){this._attackCooldown=.28;return 'hit';}
    }
    return false;
  }
  onGroundPound(player){
    if(!player||player.dead)return false;
    for(const g of [...this.ghosts,...(this.active?[this]:[])]){
      if(!this._canHit(g)||distance(g.position,player.position)>1.4*g.baseScale+.35)continue;
      // The landing callback supplements the airborne contact path below.
      if(Math.abs(player.position.y-g.position.y)>1.1+.35*g.baseScale||!this._visiblePath(g,player))continue;
      if(this._hit(g,player))return true;
    }
    return false;
  }
  context(player){
    if(this.starReady)return this.stairProgress<1?'Approach the middle of the hall; the stairs will rise':'Jump up the pasta stairs to reach the first star';
    if(this.defeatedCount>=5&&!this.active)return 'The five Boos are gone. Return to the main hall.';
    if(this._room(player.position)===5&&player.position.y<.95&&this.ghosts.some(g=>g.alive&&g.room===5&&g.position.z<-2.5))return 'Jump onto the library table. Turn away to lure the portrait Boos out.';
    const g=[...this.ghosts,...(this.active?[this]:[])].filter(g=>g.alive&&g.active).sort((a,b)=>distance(a.position,player.position)-distance(b.position,player.position))[0];
    if(!g||distance(g.position,player.position)>9)return '';
    if(g.shy)return 'It hides when watched. Turn your back, then circle behind or ground-pound.';
    return g===this?'Punch from behind or ground-pound Big Boo · three hits':'Punch from behind or jump, face away, and ground-pound';
  }
  _damage(player,g){
    if(player.knockback?.(player.position.x-g.position.x,player.position.z-g.position.z,g===this?3:2)!==false)this.emit('damage');
  }
  _contact(g,player){
    if(!this._canHit(g))return;
    const d=distance(g.position,player.position),r=1.4*g.baseScale+player.radius;
    if(d>r)return;
    const p=player.position,top=g.position.y+.8*g.baseScale;
    if(player.pounding&&player.velocity.y<0&&p.y<top+.45&&p.y>g.position.y-.6){
      if(this._hit(g,player)){player.velocity.y=8.5;player.grounded=false;player.pounding=false;player.squashVelocity=-3;}
      return;
    }
    if(!player.pounding&&player.velocity.y<0&&!player.grounded&&p.y>=top-.4&&p.y<top+.5){
      // A normal jump never defeats a Boo. It bounces the player and briefly
      // makes the Boo intangible, as ATTACK_FROM_ABOVE does in the source.
      player.velocity.y=9.5;player.grounded=false;player.pounding=false;
      g.state='bouncing';g.hitTimer=32/30;g.tangible=false;g.deathYaw=Math.atan2(g.position.x-p.x,g.position.z-p.z);
      this.emit('bounce',g);return;
    }
    if(p.y+player.height>g.position.y&&p.y<top-.2)this._damage(player,g);
  }
  _resetUnfinishedBoss(){
    this.position={...this.home};this.yaw=this.startYaw;this.health=3;this.baseScale=3;this.scale=3;this.radius=4.2;
    this.opacity=0;this.targetOpacity=0;this.active=false;this.state='waiting';this.shy=false;this.tangible=false;this.hitTimer=0;
  }
  _updateGhost(g,dt,player){
    if(g.state==='dead')return;
    g.hitTimer=Math.max(0,g.hitTimer-dt);
    if(g.state==='dying'){
      g.deathTime+=dt;g.position.x+=Math.sin(g.deathYaw)*12*dt;g.position.z+=Math.cos(g.deathYaw)*12*dt;g.position.y+=1.5*dt;
      if(g.deathTime>5/30)g.opacity=Math.max(0,g.opacity-dt*20/255*30);
      const walls=this.ghostPhysics.resolveWalls(g.position,.3,.6);
      if(g.deathTime>1||walls.hit){
        g.state='dead';g.opacity=0;g.active=false;
        if(g===this){this._releaseStar();}
        else if(!g.counted){
          g.counted=true;this.defeatedCount++;
          if(!g.coinDropped){g.coinDropped=true;this.world?.spawnBlueCoin?.(g);}
          this.emit('ghostDefeated',g,this.defeatedCount);
          this.emit('message',this.defeatedCount===5?'All five ghosts are gone. Big Boo is waiting in the main hall!':`${this.defeatedCount} of 5 ghosts unraveled. Search the other first-floor rooms.`,4);
          if(this.defeatedCount===5)this.state='waiting';
        }
      }
      return;
    }
    const same=this._sameRoom(g,player),near=distance(g.position,player.position)<15;
    if(!same){
      if(g===this){this._resetUnfinishedBoss();return;}
      g.active=false;g.tangible=false;g.state='dormant';g.position={...g.home};g.yaw=g.startYaw;g.opacity=1;g.targetOpacity=1;g.shy=false;g.hitTimer=0;return;
    }
    if(!g.active&&!near)return;
    g.active=true;
    if(g.state==='recovering'||g.state==='bouncing'){
      const t=g.hitTimer,drift=g.state==='recovering'?Math.max(0,t-.53)*3:Math.max(0,t-.25)*1.8;
      g.position.x+=Math.sin(g.deathYaw)*drift*dt;g.position.z+=Math.cos(g.deathYaw)*drift*dt;
      this.ghostPhysics.resolveWalls(g.position,.3,.6);
      if(g.hitTimer<=0){g.state='chasing';g.tangible=false;}
      return;
    }
    const shy=this._looking(g,player);g.shy=shy;g.targetOpacity=shy?40/255:1;
    g.opacity+=clamp(g.targetOpacity-g.opacity,-dt*600/255,dt*600/255);
    g.tangible=!shy&&g.opacity>180/255;g.state=shy?'shy':'chasing';
    g.scale=(.6+.4*g.opacity)*g.baseScale;
    if(g.tangible){
      const target=distance(player.position,g.home)>15?g.home:player.position;
      const targetYaw=Math.atan2(target.x-g.position.x,target.z-g.position.z);
      const turn=g===this?(this.health===3?0x180:this.health===2?0x240:0x300):0x180+g.index*27;
      g.yaw+=clamp(angle(targetYaw,g.yaw),-turn*Math.PI/32768*30*dt,turn*Math.PI/32768*30*dt);
      const multiplier=g===this?(this.health===3?.5:this.health===2?.6:.8):.5;
      const speed=Math.max(g===this?3*multiplier:g.aggro,(player.speed||0)*multiplier);
      g.position.x+=Math.sin(g.yaw)*speed*dt;g.position.z+=Math.cos(g.yaw)*speed*dt;
      // Original Boos float toward a grounded player and collide with solid
      // walls. A portrait's intangible surface is deliberately not a wall.
      const dy=player.position.y+.5-g.position.y;
      let vertical=player.grounded&&Math.abs(dy)>=.1?Math.sign(dy)*.6:0;
      if(g.opacity>.999){vertical+=Math.sin(g.bobPhase)*g.baseScale*.3;g.bobPhase+=Math.PI/32*30*dt;}
      g.position.y+=vertical*dt;
      const floor=this.ghostPhysics.groundAt(g.position.x,g.position.z,g.position.y+.2);
      if(floor&&g.position.y<floor.height)g.position.y=floor.height;
      this.ghostPhysics.resolveWalls(g.position,.3,.6);
      this._contact(g,player);
    }
  }
  _releaseStar(){
    if(this.starReady)return;
    this.starReady=true;this.starCollectible=false;this.starAge=0;this.bossDeathAge=0;this.state='defeated';this.active=false;this.tangible=false;
    this._starRelease={x:this.position.x,y:this.position.y+1.8,z:this.position.z};this.starPosition={...this._starRelease};
    this.emit('defeat');this.emit('message','Big Boo is defeated. Approach the middle of the hall, then climb the rising pasta stairs!',5);
  }
  update(dt,player){
    dt=clamp(Number(dt)||0,0,.1);if(!dt||!player||player.dead)return;
    this.time+=dt;this._attackCooldown=Math.max(0,this._attackCooldown-dt);
    for(const g of this.ghosts)this._updateGhost(g,dt,player);
    if(this.starReady){
      this.bossDeathAge+=dt;
      if(!this.starCollectible){
        this.starAge+=dt;const t=clamp(this.starAge/1.45,0,1),e=t*t*(3-2*t),s=this._starRelease,d=this.starDestination;
        this.starPosition={x:s.x+(d.x-s.x)*e,y:s.y+(d.y-s.y)*e+Math.sin(t*Math.PI)*2.5,z:s.z+(d.z-s.z)*e};
        if(t===1){this.starCollectible=true;this.starPosition={...d};}
      }
      const delay=(this.stairDefinition.delayFrames??60)/(this.stairDefinition.timeBaseHz??30);
      if(!this.stairsActive&&this.bossDeathAge>delay&&Math.hypot(player.position.x-this.stairTrigger.x,player.position.y-this.stairTrigger.y,player.position.z-this.stairTrigger.z)<(this.stairDefinition.triggerRadius??6)){
        this.stairsActive=true;this.emit('stairs');
      }
      if(this.stairsActive){this.stairTime+=dt;this.stairProgress=clamp(this.stairTime*(this.stairDefinition.riseSpeed??2.4)/6.2,0,1);}
      return;
    }
    if(this.defeatedCount<5)return;
    this.room=this.bossRoom;
    if(!this.active&&!this.bossDefeated){
      if(!this._sameRoom(this,player)||distance(this.home,player.position)>=15)return;
      this.active=true;this.bossSpawned=true;this.state='chasing';this.opacity=1;this.targetOpacity=1;this.health=3;this.alive=true;this.baseScale=3;this.scale=3;this.radius=4.2;
      if(!this._bossAnnounced){this._bossAnnounced=true;this.emit('dialogue','BIG BOO','Five little ghosts, one enormous serving. Circle behind Big Boo to punch, or jump and ground-pound while his back is turned. Three hits reveal the first star.');}
    }
    this._updateGhost(this,dt,player);
  }
}
