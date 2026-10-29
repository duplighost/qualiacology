// Whomp's Fortress, mission one: the vulnerable back is exposed only after a slam.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};

export class WhompEncounter {
  constructor(physics,spawn,callbacks={}){
    this.physics=physics;this.callbacks=callbacks;
    this.home=point(spawn.position);this.home.y=physics.groundAt(this.home.x,this.home.z,this.home.y+1)?.height??this.home.y;
    this.startYaw=(spawn.yaw||0)*Math.PI/180;this.colliderId='king-whomp-body';this.reset();
  }
  emit(name,...args){this.callbacks[name]?.(...args);}
  reset(){this.position={...this.home};this.yaw=this.startYaw;this.health=3;this.state='idle';this.active=false;this.starReady=false;this.held=false;this.fall=0;this.hitTimer=0;this.timer=0;this.scoredThisFall=false;this.slamDamaged=false;this._collider();}
  action(){return 'none';}
  _local(player){const dx=player.position.x-this.position.x,dz=player.position.z-this.position.z,s=Math.sin(this.yaw),c=Math.cos(this.yaw);return {x:dx*c-dz*s,z:dx*s+dz*c,y:player.position.y-this.position.y};}
  _collider(){
    if(!this.physics.setBoxCollider)return;
    if(this.state==='defeated'){this.physics.setBoxCollider(this.colliderId,null,false);return;}
    if(this.fall>.96){const reach=4.8;this.physics.setBoxCollider(this.colliderId,{center:[this.position.x+Math.sin(this.yaw)*reach,this.position.y+1.03,this.position.z+Math.cos(this.yaw)*reach],halfSize:[3,.97,3.8],yaw:this.yaw});}
    else if(this.fall<.15)this.physics.setBoxCollider(this.colliderId,{center:[this.position.x-Math.sin(this.yaw)*1.03,this.position.y+4.8,this.position.z-Math.cos(this.yaw)*1.03],halfSize:[3,3.8,.97],yaw:this.yaw});
    else this.physics.setBoxCollider(this.colliderId,null,false);
  }
  context(player){
    if(this.starReady)return 'Collect the pasta star!';
    if(!this.active)return '';
    if(Math.hypot(player.position.x-this.position.x,player.position.z-this.position.z)>13)return '';
    if(this.state==='exposed')return 'Jump onto his back, then POUND / Ctrl / C';
    if(this.state==='windup'||this.state==='falling')return 'He is tipping forward. Dodge sideways!';
    if(this.state==='recovering'||this.state==='rising')return 'Move clear while he gets up';
    return 'Lure him into a slam, dodge, then ground-pound his back';
  }
  onGroundPound(player){
    if(this.state!=='exposed'||this.scoredThisFall||this.health<=0)return false;
    const p=this._local(player);
    if(Math.abs(p.x)>3.2||p.z<.8||p.z>8.8||p.y<1.6||p.y>2.6)return false;
    this.scoredThisFall=true;this.health--;this.hitTimer=.9;this.emit('hit',this.health);
    player.velocity.y=8.5;player.grounded=false;player.pounding=false;player.squashVelocity=-3;
    if(this.health===0){this.state='defeated';this.active=false;this.starReady=true;this.fall=1;this._collider();this.emit('message','The Whomp King has crumbled into noodles. Collect your star!');this.emit('defeat');}
    else{this.state='recovering';this.timer=1.1;this.emit('message',`${3-this.health} of 3 ground pounds. Watch for the next slam.`);}
    return true;
  }
  update(dt,player){
    dt=clamp(dt,0,.1);if(!dt||!player)return;this.hitTimer=Math.max(0,this.hitTimer-dt);
    if(this.state==='defeated'){this._collider();return;}
    if(player.dead)return;
    if(this.active&&player.position.y<this.home.y-12){this.reset();this.emit('message','The Whomp King is waiting at the summit again.');return;}
    const dx=player.position.x-this.position.x,dz=player.position.z-this.position.z,d=Math.hypot(dx,dz),dy=player.position.y-this.position.y;
    if(this.state==='idle'){
      if(d<11&&Math.abs(dy)<3.8){this.active=true;this.state='chasing';this.timer=.8;this.emit('dialogue','WHOMP KING','My fortress is built from nothing but pasta. Stand in front of me and I will flatten you. Dodge my fall, jump onto my back, and ground-pound it three times!');}
    }else if(this.state==='chasing'){
      if(this.timer>0){this.timer-=dt;this._collider();return;}
      this.yaw+=clamp(angle(Math.atan2(dx,dz),this.yaw),-dt*1.05,dt*1.05);
      if(d>7.2){const nx=this.position.x+Math.sin(this.yaw)*dt*.85,nz=this.position.z+Math.cos(this.yaw)*dt*.85,f=this.physics.groundAt(nx,nz,this.home.y+.3);if(f&&f.height>=this.home.y-.35&&f.height<=this.home.y+.3){this.position.x=nx;this.position.z=nz;this.position.y=f.height;}}
      const p=this._local(player);if(d<10&&p.z>1.4&&Math.abs(p.x)<3.6&&Math.abs(dy)<2.5){this.state='windup';this.timer=.65;this.scoredThisFall=false;this.slamDamaged=false;this.emit('message','He is leaning forward. Dodge to the side!');}
    }else if(this.state==='windup'){
      this.timer-=dt;this.fall=.08*(1-clamp(this.timer/.65,0,1));if(this.timer<=0){this.state='falling';this.timer=0;}
    }else if(this.state==='falling'){
      this.timer+=dt;const t=clamp(this.timer/.40,0,1);this.fall=.08+.92*t*t;
      if(t>=1){this.fall=1;this.state='exposed';this.timer=3.33;this._collider();const p=this._local(player);if(Math.abs(p.x)<3.35&&p.z>.5&&p.z<8.9&&p.y<2.1){if(player.knockback(dx,dz,3)){this.emit('damage');this.slamDamaged=true;}}this.emit('message','His back is exposed. Jump, then ground-pound!');}
    }else if(this.state==='exposed'){
      this.timer-=dt;if(this.timer<=0){this.state='rising';this.timer=0;}
    }else if(this.state==='recovering'){
      this.timer-=dt;this.fall=1;if(this.timer<=0){this.state='rising';this.timer=0;}
    }else if(this.state==='rising'){
      this.timer+=dt;const t=clamp(this.timer/1.2,0,1);this.fall=1-t*t*(3-2*t);
      if(t===1){this.fall=0;this.state='chasing';this.timer=.7;}
    }
    this._collider();
  }
}
