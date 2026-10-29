import * as THREE from './vendor/three.module.js';

export function createHazards(scene,kit,course,physics,{damage=(pos,n)=>{},burst=(pos,n,mat)=>{},message=()=>{}}={}) {
  const group=new THREE.Group();group.name='Original course hazards in pasta';scene.add(group);
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const grounded=a=>{const p=new THREE.Vector3(...a);p.y=physics.groundAt(p.x,p.z,p.y+1)?.height??p.y;return p;};
  const pitBalls=course.objects.filter(o=>o.kind==='bhvPitBowlingBall').map((o,i)=>{
    const home=grounded(o.position),mesh=kit.coilBall(.8,kit.materials.ink,181+i);mesh.position.copy(home);mesh.position.y+=.8;group.add(mesh);
    return{home,mesh,phase:i*Math.PI+.35,last:mesh.position.clone()};
  });
  const sources=course.objects.filter(o=>o.kind==='macro_water_bomb_spawner').map((o,i)=>({position:new THREE.Vector3(...o.position),ground:grounded(o.position),timer:2+i*.8,index:i}));
  const drops=[],dropTemplate=kit.coilBall(.46,kit.materials.white,441);
  let heart=null,switchMesh=null,warpCooldown=1.5,warpHold=0,warpCandidate=null;
  const heartSource=course.objects.find(o=>o.kind==='macro_recovery_heart');
  if(heartSource){
    heart=new THREE.Group();const gs=[];
    for(let layer=0;layer<6;layer++){
      const points=[],scale=.044*(1-layer*.11);
      for(let j=0;j<=72;j++){const t=j/72*Math.PI*2;points.push([16*Math.sin(t)**3*scale,(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*scale,.025*Math.sin(layer)]);}
      gs.push(kit.noodleGeometry(points,.033,72,6));
    }
    const mesh=new THREE.Mesh(kit.mergeGeometry(gs),kit.materials.tomato);mesh.castShadow=true;heart.add(mesh);heart.position.copy(grounded(heartSource.position));heart.position.y+=1.0;heart.userData.baseY=heart.position.y;group.add(heart);
  }
  const switchSource=course.objects.find(o=>o.kind==='bhvFloorSwitchGrills');
  if(switchSource){
    switchMesh=new THREE.Group();switchMesh.position.copy(grounded(switchSource.position));
    const beet=kit.materials.pink.clone();beet.color.set('#86526c');
    const base=kit.coilBall(.8,kit.materials.toasted,381);base.scale.y=.18;base.position.y=.13;switchMesh.add(base);
    const button=kit.coilBall(.61,beet,382);button.scale.y=.24;button.position.y=.29;button.name='button';switchMesh.add(button);
    switchMesh.add(kit.strand([[-.23,.46,0],[.23,.46,0]],.034,kit.materials.white));switchMesh.add(kit.strand([[0,.46,-.23],[0,.46,.23]],.034,kit.materials.white));group.add(switchMesh);
  }
  const warps=new Map();
  for(const o of course.objects.filter(o=>o.kind==='bhvFadingWarp')){
    const code=o.params.match(/WARP_NODE_0([BCDE])/i)?.[1];if(code)warps.set(code,{position:grounded(o.position),yaw:(o.yaw||0)*Math.PI/180});
  }
  const pairs={B:'C',C:'B',D:'E',E:'D'};

  function launch(source,player){
    const mesh=dropTemplate.clone(true),p=player.position,velocity=player.velocity||{x:0,z:0};
    const flight=1.15,height=14.8;
    mesh.position.set(source.position.x+Math.sin(source.index*3.1)*2,p.y+height,source.position.z+Math.cos(source.index*2.2)*2);
    const targetX=p.x+velocity.x*.6,targetZ=p.z+velocity.z*.6;
    const initialY=(.5*24*flight*flight-height)/flight;
    const motion=new THREE.Vector3((targetX-mesh.position.x)/flight,initialY,(targetZ-mesh.position.z)/flight);
    group.add(mesh);drops.push({mesh,velocity:motion,age:0});
  }

  function update(time,dt,player){
    dt=Math.min(.06,Math.max(0,dt));const p=player.position;
    for(const ball of pitBalls){
      const a=time*.67+ball.phase,nx=ball.home.x+Math.sin(a)*2.2,nz=ball.home.z+Math.cos(a)*2.9;
      const floor=physics.groundAt(nx,nz,ball.home.y+3.5);
      if(floor){ball.last.copy(ball.mesh.position);ball.mesh.position.set(nx,floor.height+.8,nz);const travelled=ball.last.distanceTo(ball.mesh.position);ball.mesh.rotation.x+=(nz-ball.last.z)/.8;ball.mesh.rotation.z-=(nx-ball.last.x)/.8;ball.mesh.scale.y=1-Math.min(.055,travelled*.2);}
      if(distance(p,ball.mesh.position)<1.15&&Math.abs(p.y+.8-ball.mesh.position.y)<1.45)damage(ball.mesh.position,3);
    }
    for(const source of sources){source.timer-=dt;if(source.timer<=0&&distance(p,source.position)<14&&Math.abs(p.y-source.ground.y)<7&&!player.dead){launch(source,player);source.timer=5.1+source.index*.33;}}
    for(let i=drops.length-1;i>=0;i--){const drop=drops[i];drop.age+=dt;drop.velocity.y-=24*dt;drop.mesh.position.addScaledVector(drop.velocity,dt);drop.mesh.rotation.x+=dt*3;drop.mesh.rotation.z+=dt*2;
      drop.mesh.scale.set(1.03,.98+Math.min(.18,Math.abs(drop.velocity.y)*.006),1.03);
      const pos=drop.mesh.position,floor=physics.groundAt(pos.x,pos.z,pos.y+2),hitPlayer=distance(p,pos)<.95&&Math.abs(p.y+.85-pos.y)<1.1;
      if(hitPlayer||(floor&&pos.y<=floor.height+.44)||drop.age>5){
        if(floor&&pos.y<floor.height+.44)pos.y=floor.height+.35;
        if(drop.age<=5){burst(pos,20,kit.materials.white);if(distance(p,pos)<2&&Math.abs(p.y+.6-pos.y)<2)damage(pos,1);}
        group.remove(drop.mesh);drops.splice(i,1);
      }
    }
    if(heart){heart.rotation.y=time*1.2;heart.position.y=heart.userData.baseY+Math.sin(time*2)*.13;heart.scale.setScalar(1+Math.sin(time*3)*.055);}
    if(switchMesh){const open=physics.dynamicEnabled.get('grate_door')===false;switchMesh.scale.y+=( (open?.3:1)-switchMesh.scale.y)*Math.min(1,dt*9);}
    warpCooldown=Math.max(0,warpCooldown-dt);
    if(warpCooldown<=0&&player.grounded&&!player.dead&&Math.hypot(player.velocity.x,player.velocity.z)<.25){
      let found=null;for(const[code,warp]of warps)if(distance(p,warp.position)<.8&&Math.abs(p.y-warp.position.y)<1.1){found=code;break;}
      if(found&&warps.has(pairs[found])){
        if(warpCandidate!==found){warpCandidate=found;warpHold=0;}warpHold+=dt;
        if(warpHold>=1){const destination=warps.get(pairs[found]);burst(p,14,kit.materials.egg);p.x=destination.position.x;p.y=destination.position.y;p.z=destination.position.z;player.velocity.x=player.velocity.y=player.velocity.z=0;player.yaw=destination.yaw;player.grounded=true;player.invincible=Math.max(player.invincible||0,.8);warpCooldown=5;warpHold=0;warpCandidate=null;message('A secret pasta passage.',2);burst(p,14,kit.materials.egg);}
      }else{warpCandidate=null;warpHold=0;}
    }else{warpCandidate=null;warpHold=0;}
  }
  function reset(){for(const d of drops)group.remove(d.mesh);drops.length=0;for(const b of pitBalls){b.mesh.position.copy(b.home);b.mesh.position.y+=.8;b.mesh.rotation.set(0,0,0);b.mesh.scale.setScalar(1);}for(const s of sources)s.timer=2+s.index*.8;warpCooldown=1.5;warpHold=0;warpCandidate=null;if(switchMesh)switchMesh.scale.y=1;}
  return{update,reset};
}
