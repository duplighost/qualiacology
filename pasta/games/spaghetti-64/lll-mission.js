const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const burning=f=>!!f?.surface?.includes('BURNING');
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

// Bully victory is a physical ring-out. Attacks impart velocity; they do not
// decrement a hidden hit counter. Source constants are rescaled at100:1/30Hz.
export class LllMission{
 constructor(physics,course,callbacks={}){this.physics=physics;this.course=course;this.callbacks=callbacks;this.home=point(course.mission.boss.position);this.homeFloor=this.home.y;this.radius=1.15;this.maxHealth=1;this.reset();}
 reset(){this.position=point(this.home);this.velocity={x:0,y:0,z:0};this.yaw=0;this.state='patrol';this.active=false;this.health=1;this.held=false;this.timer=0;this.hitTimer=0;this.actionCooldown=0;this.impact=0;this.starReady=false;this.starCollectible=false;this.starAge=0;this.bridgeReady=false;this.sinkTime=0;this.starPosition=point(this.course.mission.star.position);this.attacks=0;this.lavaRingOut=false;this._defeated=false;this.small=(this.course.objects||[]).filter(o=>o.kind==='bhvSmallBully').map((o,i)=>({id:'small_bully_'+i,home:point(o.position),position:point(o.position),velocity:{x:0,y:0,z:0},yaw:o.yaw*Math.PI/180,radius:.73,height:1.23,state:'patrol',timer:0,hitTimer:0,alive:true,impact:0,isSmall:true,sinkTime:0}));}
 get objective(){return this.starReady?'Cross the falling stair-bridge to the star':this.active?'Knock Big Bully into the lava':'Reach the Big Bully’s platform';}
 context(p){if(this.starReady)return distance(p.position,this.starPosition)<12?'Jump up the collapsing pasta steps. The star is above the far platform.': 'The Bully is boiled. Cross the stair-bridge behind his platform.';if(this.active)return'Punch or jump-kick him toward the edge. Keep your back away from the lava.';return null;}
 _targets(){return[this,...this.small.filter(b=>b.alive)];}
 _hit(b,p,strength=1){if(b.state==='sinking'||b.state==='defeated'||b.hitTimer>0)return false;const dx=Math.sin(p.yaw),dz=Math.cos(p.yaw),speed=(b.isSmall?13.9397:8.8487)*strength;b.velocity.x=dx*speed;b.velocity.z=dz*speed;b.velocity.y=0;b.state='knockback';b.timer=0;b.hitTimer=.19;b.impact=1;b.yaw=Math.atan2(-dx,-dz);if(b===this){this.attacks++;this.active=true;this.callbacks.hit?.();}p.velocity.x-=dx*3.6;p.velocity.z-=dz*3.6;p.squashVelocity-=1.2;return true;}
 action(p){if(this.actionCooldown>0||p.dead)return false;this.actionCooldown=.27;let best=null,bestDistance=Infinity;for(const b of this._targets()){if(b===this&&this.starReady)continue;const d=distance(p.position,b.position),dy=p.position.y-b.position.y,dx=b.position.x-p.position.x,dz=b.position.z-p.position.z,facing=(dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw))/(d||1);if(d<b.radius+1.08&&dy>-1.6&&dy<(b.isSmall?1.4:2.4)&&facing>-.03&&d<bestDistance){best=b;bestDistance=d;}}return best&&this._hit(best,p)?'hit':false;}
 onGroundPound(p){for(const b of this._targets())if(distance(p.position,b.position)<b.radius+.9&&Math.abs(p.position.y-b.position.y)<2.65){if(this._hit(b,p,1.12)){p.velocity.y=9;p.grounded=false;p.pounding=false;return'hit';}}return false;}
 _body(b,dt,p){
  if(b.state==='defeated')return;b.timer+=dt;b.hitTimer=Math.max(0,b.hitTimer-dt);b.impact*=Math.exp(-5*dt);
  if(b.state==='sinking'){b.sinkTime+=dt;b.position.y-=dt*.9;b.velocity.x*=Math.exp(-8*dt);b.velocity.z*=Math.exp(-8*dt);if(b.sinkTime>1.45){b.state='defeated';if(b.isSmall){b.alive=false;this.world?.spawnBullyCoin?.(b);}else this._defeat();}return;}
  const d=distance(b.position,p.position),homeDistance=distance(p.position,b.home),vertical=Math.abs(p.position.y-b.position.y);
  if(b===this)this.active=homeDistance<17&&vertical<8;
  if(b.state==='knockback'){
   const drag=Math.pow(b.isSmall?.91:.93,dt*30);b.velocity.x*=drag;b.velocity.z*=drag;
   if(b.timer>.65&&Math.hypot(b.velocity.x,b.velocity.z)<2.2){b.state='chasing';b.timer=0;}
  }else{
   const engage=homeDistance<10&&vertical<5;
   if(engage&&b.state!=='backing'){
    if(b.state!=='chasing'){b.state='chasing';b.timer=0;}
    const cycle=b.timer%(b.isSmall?1.03:1.2),target=Math.atan2(p.position.x-b.position.x,p.position.z-b.position.z);
    if(cycle<.333)b.yaw+=angleDelta(target,b.yaw)*Math.min(1,dt*11);
    const speed=cycle<.333?.9:b.isSmall?6:9;b.velocity.x=Math.sin(b.yaw)*speed;b.velocity.z=Math.cos(b.yaw)*speed;
   }else if(b.state==='backing'){
    b.velocity.x=-Math.sin(b.yaw)*1.5;b.velocity.z=-Math.cos(b.yaw)*1.5;if(b.timer>.5){b.state='patrol';b.timer=0;}
   }else{
    b.state='patrol';const hd=distance(b.position,b.home),target=hd>2.5?Math.atan2(b.home.x-b.position.x,b.home.z-b.position.z):b.yaw+dt*.34;b.yaw+=angleDelta(target,b.yaw)*Math.min(1,dt*3);b.velocity.x=Math.sin(b.yaw)*1.5;b.velocity.z=Math.cos(b.yaw)*1.5;
   }
  }
  const old={...b.position},nx=b.position.x+b.velocity.x*dt,nz=b.position.z+b.velocity.z*dt,floor=this.physics.groundAt(nx,nz,b.position.y+.6);
  const safe=floor&&!burning(floor)&&floor.height>=b.home.y-.75;
  if(!safe&&b.state!=='knockback'&&b.position.y>=b.home.y-.5){b.state='backing';b.timer=0;b.velocity.x=b.velocity.z=0;}
  else{b.position.x=nx;b.position.z=nz;if(safe&&b.position.y>=floor.height-.1){b.position.y=floor.height;b.velocity.y=0;}else{b.velocity.y-=45*dt;b.position.y+=b.velocity.y*dt;const lava=this.physics.groundAt(nx,nz,b.position.y+.8);if(lava&&burning(lava)&&b.position.y<=lava.height+.12){b.position.y=lava.height;b.state='sinking';b.sinkTime=0;if(b===this)this.lavaRingOut=true;}}}
  // A descending jump or ground-pound can impart the same momentum as a kick.
  const contact=distance(b.position,p.position),top=b.position.y+(b.isSmall?1.1:2.05);
  if(contact<b.radius+.39&&p.position.y<top+.25&&p.position.y+p.height>b.position.y+.18&&b.state!=='sinking'&&b.hitTimer<=0){
   if(!p.grounded&&p.velocity.y<-.3&&p.position.y>top-.65){if(this._hit(b,p,p.pounding?1.12:1)){p.velocity.y=10.5;p.pounding=false;p.grounded=false;}}
   else if(p.invincible<=0){const dx=p.position.x-b.position.x,dz=p.position.z-b.position.z,len=Math.hypot(dx,dz)||1,nx=dx/len,nz=dz/len,overlap=b.radius+p.radius-contact;p.position.x+=nx*Math.max(.01,overlap);p.position.z+=nz*Math.max(.01,overlap);p.velocity.x=nx*(b.isSmall?7:10);p.velocity.z=nz*(b.isSmall?7:10);p.invincible=2/30;p.squashVelocity-=3;b.velocity.x-=nx*(b.isSmall?2.8:1.5);b.velocity.z-=nz*(b.isSmall?2.8:1.5);b.state='knockback';b.timer=0;b.hitTimer=.09;this.callbacks.bump?.(b);}
  }
 }
 _defeat(){if(this._defeated)return;this._defeated=true;this.health=0;this.starReady=true;this.starCollectible=false;this.starAge=0;this.bridgeReady=true;this.releaseFrom=point(this.position);this.releaseFrom.y+=2.4;this.starPosition=point(this.releaseFrom);this.callbacks.defeat?.();}
 update(dt,p){dt=clamp(dt,0,.05);this.actionCooldown=Math.max(0,this.actionCooldown-dt);if(this.starReady){this.starAge+=dt;const t=clamp(this.starAge/1.6,0,1),s=t*t*(3-2*t),target=point(this.course.mission.star.position);this.starPosition={x:this.releaseFrom.x+(target.x-this.releaseFrom.x)*s,y:this.releaseFrom.y+(target.y-this.releaseFrom.y)*s+Math.sin(Math.PI*t)*4,z:this.releaseFrom.z+(target.z-this.releaseFrom.z)*s};this.starCollectible=t>=1;}else this._body(this,dt,p);for(const b of this.small)if(b.alive)this._body(b,dt,p);}
}
