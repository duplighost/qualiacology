import * as THREE from '../vendor/three.module.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { noodle, noodleBall } from './materials.js';

// Mission geometry is pasta throughout: nests replace pollution, tubes replace
// coins and teeth, bundled strands replace the plant, and the reward is dough.
export function createMission(scene, materials, world, callbacks = {}) {
  const layer = new THREE.Group(); layer.name = 'Road to the Big Windmill — pasta mission'; scene.add(layer);
  const M = materials, v = (x,y,z) => new THREE.Vector3(x,y,z);
  const ground = (x,z) => { const y = world.heightAt(x,z); return Number.isFinite(y) ? y : 0; };
  const bossGround = ground(22,-25);
  const bossPosition = v(22,bossGround,-25);
  const goalPosition = v(-6,ground(-6,13)+1,13);
  const temp = new THREE.Object3D(), delta = new THREE.Vector3();
  let seed = 16981;
  const random = () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  const say = text => callbacks.message?.(text);
  const sound = kind => callbacks.sound?.(kind);

  // Bake strand bundles by material, preserving their shape with very few draws.
  function bake(group) {
    group.updateMatrixWorld(true);
    const inv = group.matrixWorld.clone().invert(), buckets = new Map();
    group.traverse(object => {
      if(!object.isMesh) return;
      const key = object.material.uuid;
      if(!buckets.has(key)) buckets.set(key,{ material:object.material, geometries:[] });
      const transform = new THREE.Matrix4().multiplyMatrices(inv,object.matrixWorld);
      buckets.get(key).geometries.push(object.geometry.clone().applyMatrix4(transform));
    });
    const out = new THREE.Group();
    for(const {material,geometries} of buckets.values()) {
      const geometry = mergeGeometries(geometries,false);
      if(geometry) {
        const mesh = new THREE.Mesh(geometry,material); mesh.castShadow=true; mesh.receiveShadow=true; out.add(mesh);
      }
      geometries.forEach(g=>g.dispose());
    }
    group.traverse(object=>{if(object.isMesh)object.geometry.dispose();});
    out.position.copy(group.position); out.quaternion.copy(group.quaternion); out.scale.copy(group.scale);
    return out;
  }
  function ring(radius,tube,material,axis='z') {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius,tube,6,24),material);
    if(axis==='y') mesh.rotation.x=Math.PI/2;
    mesh.castShadow=true; mesh.receiveShadow=true; return mesh;
  }

  // Individual slick noodle nests are separate cleanup targets; no liquid decal.
  const patchSpecs = [
    [-24,3,1.7],[-20,5,1.6],[-15,3,1.5],
    [4,12,2.1],[7,9,2.3],[10,6,2.4],[8,2,2.1],[13,0,2.2],
    [16,-4,2.5],[12,-7,2.4],[9,-10,2.1],[10,-14,2.2],
    [13,-17,2.4],[17,-20,2.6],[20,-23,2.5],[24,-23,2.1],
    [19,-27,2.3],[25,-27,2.1],[27,-20,2.2],[21,-17,2.3],
    [18,-12,2.4],[19,-7,2.1],[20,-2,2.0],[14,5,2.4],
    [5,-8,1.8],[5,-16,1.9],[8,-22,2.1],[12,-25,2.0],
    [2,5,1.6]
  ];
  const patches = patchSpecs.map(([x,z,r],index)=>{
    const g = new THREE.Group();
    for(let j=0;j<9;j++) {
      const points=[], phase=random()*Math.PI*2, offset=(random()-.5)*r;
      for(let k=0;k<17;k++) {
        const t=k/16*Math.PI*2.4, rr=r*(.3+.62*(j/9));
        points.push([Math.cos(t+phase)*rr, .10+j*.013+.055*Math.sin(t*4+phase), Math.sin(t+phase)*rr*.72+offset*.24]);
      }
      g.add(noodle(points,.09+random()*.035,index%4===0?M.toasted:M.ink,25,5));
    }
    const mesh=bake(g); mesh.position.set(x,ground(x,z)+.07,z); layer.add(mesh);
    return {mesh,x,z,r,health:.65+random()*.3,initialHealth:0,cleared:false,fade:1};
  });
  patches.forEach(p=>p.initialHealth=p.health);

  const moundSource = noodleBall(2.75,M.ink,15,2.4);
  moundSource.scale.set(1,.28,1); const mound=bake(moundSource);
  mound.position.copy(bossPosition); mound.position.y+=.37; layer.add(mound);

  // When the generator is defeated this buried coil rises into the approach.
  const hillSource = new THREE.Group();
  for(let i=0;i<17;i++) {
    const r=3.5-i*.18, pts=[];
    for(let k=0;k<=42;k++) {const a=k/42*Math.PI*2;pts.push([Math.cos(a)*r,.8*(1-r/3.5),Math.sin(a)*r]);}
    hillSource.add(noodle(pts,.14,M.egg,46,6));
  }
  const restoredHill=bake(hillSource);restoredHill.position.copy(bossPosition);restoredHill.position.y-=1.1;layer.add(restoredHill);

  const boss = new THREE.Group(); boss.position.copy(bossPosition); boss.rotation.y=-.86; layer.add(boss);
  const neckSource = new THREE.Group();
  for(let i=0;i<20;i++) {
    const a=i/20*Math.PI*2, r=.45+(i%3)*.11, pts=[];
    for(let k=0;k<12;k++) {const t=k/11;pts.push([Math.cos(a+t*1.3)*r+.13*Math.sin(t*5),.15+t*2.65,Math.sin(a+t*1.3)*r]);}
    neckSource.add(noodle(pts,.13,i%5===0?M.toasted:M.ink,22,6));
  }
  const neck=bake(neckSource);boss.add(neck);
  function jaw(sign) {
    const source = new THREE.Group();
    for(let j=0;j<10;j++) {
      const y=j/10*.94, r=Math.sqrt(1-(y/.99)**2), points=[];
      for(let k=0;k<=34;k++) {
        const a=k/34*Math.PI*2;
        points.push([Math.cos(a)*1.6*r,sign*y,Math.sin(a)*1.2*r]);
      }
      source.add(noodle(points,.13,j===0?M.cream:M.ink,36,6));
    }
    for(let i=0;i<9;i++) {
      const a=.15+i/8*(Math.PI-.3);
      const tooth=new THREE.Mesh(new THREE.CylinderGeometry(.12,.105,.36,7,1,true),M.pale);
      tooth.position.set(Math.cos(a)*1.42,-sign*.19,Math.sin(a)*1.08);
      tooth.rotation.z=Math.cos(a)*.2;source.add(tooth);
    }
    if(sign===1) for(const x of [-.58,.58]) {
      const eye=ring(.21,.06,M.pale);eye.position.set(x,.55,1.05);eye.rotation.y=x*.32;source.add(eye);
      source.add(noodle([[x,.42,1.105],[x+.015,.56,1.15],[x,.68,1.1]],.067,M.ink,7,6));
    }
    return bake(source);
  }
  const upperJaw=jaw(1),lowerJaw=jaw(-1);
  upperJaw.position.y=2.85;lowerJaw.position.y=2.8;boss.add(upperJaw,lowerJaw);boss.visible=false;

  // A golden pasta sun: coiled centre, eight curled rays and ink-pasta eyes.
  const shineSource = new THREE.Group();
  const centre=[];
  for(let i=0;i<95;i++){const t=i/94*Math.PI*7,r=.10+.58*i/94;centre.push([Math.cos(t)*r,Math.sin(t)*r,.03*Math.sin(t)]);}
  shineSource.add(noodle(centre,.11,M.gold,100,7));
  for(let i=0;i<8;i++) {
    const a=i/8*Math.PI*2,points=[];
    for(let k=0;k<=12;k++) {
      const t=k/12, r=.67+.68*Math.sin(t*Math.PI), angle=a+(t-.5)*.22;
      points.push([Math.cos(angle)*r,Math.sin(angle)*r,.02]);
    }
    shineSource.add(noodle(points,.105,M.gold,16,6));
  }
  for(const x of [-.21,.21]) shineSource.add(noodle([[x,-.13,.16],[x,.06,.18],[x,.24,.16]],.055,M.ink,7,6));
  const shine=bake(shineSource);shine.position.copy(bossPosition);shine.position.y+=3;shine.visible=false;layer.add(shine);

  // Short ridged, hollow pasta tubes serve as coins, all rendered in one batch.
  const coinParts=new THREE.Group();
  const profile=[new THREE.Vector2(.22,-.12),new THREE.Vector2(.32,-.12),new THREE.Vector2(.33,.12),new THREE.Vector2(.22,.12),new THREE.Vector2(.22,-.12)];
  const coinTube=new THREE.Mesh(new THREE.LatheGeometry(profile,20),M.gold);coinTube.rotation.x=Math.PI/2;coinParts.add(coinTube);
  for(let i=0;i<12;i++) {
    const a=i/12*Math.PI*2;coinParts.add(noodle([[Math.cos(a)*.335,Math.sin(a)*.335,-.12],[Math.cos(a)*.338,Math.sin(a)*.338,0],[Math.cos(a)*.335,Math.sin(a)*.335,.12]],.021,M.gold,3,4));
  }
  const coinBaked=bake(coinParts),coinGeometry=coinBaked.children[0].geometry;
  const route=[[-43,36],[-38,18],[-37,10],[-26,3],[-12,4],[-8,13],[4,13],[8,4],[14,-4],[9,-14],[22,-25]];
  const routeLengths=[], routeDistances=[0];let routeLength=0;
  for(let i=1;i<route.length;i++){const len=Math.hypot(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]);routeLengths.push(len);routeLength+=len;routeDistances.push(routeLength);}
  function routePoint(distance) {
    let segment=0;while(segment<routeLengths.length-1&&distance>routeDistances[segment+1])segment++;
    const t=THREE.MathUtils.clamp((distance-routeDistances[segment])/routeLengths[segment],0,1),a=route[segment],b=route[segment+1];
    return [THREE.MathUtils.lerp(a[0],b[0],t),THREE.MathUtils.lerp(a[1],b[1],t)];
  }
  const coins=[];
  for(let i=0;i<31;i++){const [x,z]=routePoint(3+i*(routeLength-7)/30);coins.push({position:v(x,ground(x,z)+1.05,z),collected:false,index:i});}
  const coinMesh=new THREE.InstancedMesh(coinGeometry,M.gold,coins.length);coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);coinMesh.castShadow=true;coinMesh.frustumCulled=false;layer.add(coinMesh);

  // Pasta crumbs carry velocity, gravity and a brief soft landing.
  const crumbGeometry=new THREE.CylinderGeometry(.055,.07,.24,5,1,false);
  const crumbMesh=new THREE.InstancedMesh(crumbGeometry,M.egg,72);crumbMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);crumbMesh.frustumCulled=false;layer.add(crumbMesh);
  const crumbs=Array.from({length:72},()=>({position:v(0,-100,0),velocity:v(0,0,0),life:0,spin:0}));let crumbCursor=0;
  function burst(position,count=12,strength=3) {
    for(let i=0;i<count;i++) {const p=crumbs[crumbCursor++%crumbs.length];p.position.copy(position);p.velocity.set((random()-.5)*strength,1+random()*strength,(random()-.5)*strength);p.life=.7+random()*.6;p.spin=random()*6;}
  }

  const ballSource=noodleBall(.72,M.toasted,10,1.2),ballBaked=bake(ballSource),ballGeometry=ballBaked.children[0].geometry;
  const hazardRoute=[[22,-25],[18,-22],[9,-14],[14,-4],[8,4],[4,13],[-1,13]];
  const hazardLengths=[],hazardDistances=[0];let hazardLength=0;
  for(let i=1;i<hazardRoute.length;i++){const len=Math.hypot(hazardRoute[i][0]-hazardRoute[i-1][0],hazardRoute[i][1]-hazardRoute[i-1][1]);hazardLengths.push(len);hazardLength+=len;hazardDistances.push(hazardLength);}
  const hazards=Array.from({length:4},(_,i)=>{const mesh=new THREE.Mesh(ballGeometry,M.toasted);mesh.castShadow=true;mesh.visible=false;layer.add(mesh);return{mesh,active:false,distance:0,speed:5.6+i*.2,phase:i*1.7};});
  function spawnHazard(){const h=hazards.find(h=>!h.active);if(h){h.active=true;h.distance=0;h.mesh.visible=true;}}
  function moveHazard(h,dt,time) {
    h.distance+=dt*h.speed;
    if(h.distance>hazardLength){h.active=false;h.mesh.visible=false;return;}
    let s=0;while(s<hazardLengths.length-1&&h.distance>hazardDistances[s+1])s++;
    const u=(h.distance-hazardDistances[s])/hazardLengths[s],a=hazardRoute[s],b=hazardRoute[s+1];
    const x=THREE.MathUtils.lerp(a[0],b[0],u),z=THREE.MathUtils.lerp(a[1],b[1],u);
    h.mesh.position.set(x,ground(x,z)+.69+Math.sin(time*9+h.phase)*.035,z);
    h.mesh.rotation.x+=dt*h.speed/.72;h.mesh.rotation.z+=dt*h.speed*.27;
    h.mesh.scale.set(1+.035*Math.sin(time*11+h.phase),.94+.035*Math.cos(time*11+h.phase),1);
  }

  let bossPhase='hidden',bossHP=3,open=false,cleaned=0,coinCount=0,shineCollected=false;
  let revealCharge=0,hitCharge=0,emergeTime=0,fightTime=0,defeatTime=0,hitWindow=-1,flinch=0;
  let damageCooldown=0,hazardClock=2.2,simTime=0,contactAge=0,goopWarning=false,stage='village';
  let lastPlayer=null,nearBossMessage=false,nearWheelMessage=false,goopWarnTimer=0;

  function damagePlayer(position,amount=1) {
    if(damageCooldown>0||!lastPlayer||(lastPlayer.health??1)<=0||shineCollected)return;
    const impulse=lastPlayer.position.clone().sub(position);impulse.y=0;
    if(impulse.lengthSq()<.01)impulse.set(-1,0,1);
    impulse.normalize().multiplyScalar(3.3);impulse.y=4;
    callbacks.damage?.(amount,impulse);damageCooldown=1.4;sound('damage');
  }
  function clearPatch(p) {
    if(p.cleared)return;p.cleared=true;cleaned++;p.health=0;
    burst(p.mesh.position.clone().add(v(0,.2,0)),6,2.2);
  }
  function defeatBoss() {
    bossHP=0;bossPhase='defeated';open=false;defeatTime=0;hitCharge=0;
    patches.forEach(clearPatch);hazards.forEach(h=>{h.active=false;h.mesh.visible=false;});
    goalPosition.copy(shine.position);stage='shine';sound('bossDefeat');
    burst(bossPosition.clone().add(v(0,2.5,0)),40,6);
    say('The road rises! Collect the golden pasta Shine.');
  }

  function update(dt,time,player) {
    dt=Math.max(0,Math.min(dt,.05));simTime+=dt;lastPlayer=player;contactAge+=dt;
    damageCooldown=Math.max(0,damageCooldown-dt);goopWarnTimer=Math.max(0,goopWarnTimer-dt);flinch=Math.max(0,flinch-dt);
    if(contactAge>.12){revealCharge=Math.max(0,revealCharge-dt*.45);hitCharge=Math.max(0,hitCharge-dt*2);}
    const p=player.position, bossDistance=Math.hypot(p.x-22,p.z+25);
    if(!shineCollected&&bossPhase!=='defeated') {
      if(p.x>1){stage=bossDistance<25?'boss':'pollution';goalPosition.copy(bossPosition);goalPosition.y+=2;}
      else if(p.x>-15){stage='waterwheel';goalPosition.set(0,ground(0,13)+1,13);}
      else {stage='village';goalPosition.set(-8,ground(-8,13)+1,13);}
      if(!nearWheelMessage&&p.x>-18&&p.z>4&&p.z<19){nearWheelMessage=true;say('The gate is closed. Follow the noodles through the waterwheel.');}
      if(!nearBossMessage&&bossDistance<18){nearBossMessage=true;if(bossPhase==='hidden')say('Spray the dark pasta mound. Wait for the mouth to open, then keep spraying.');}
    }
    if(bossPhase==='hidden') {
      hazardClock+=dt;if(hazardClock>3.8){hazardClock=0;spawnHazard();}
      mound.scale.y=.28*(1+.045*Math.sin(simTime*3));
    }
    if(bossPhase==='emerging') {
      emergeTime+=dt;const u=Math.min(1,emergeTime/1.15),e=1-(1-u)**3;
      boss.visible=true;boss.scale.set(.75+.25*e,.06+.94*e,.75+.25*e);
      if(u>=1){bossPhase='fighting';fightTime=0;hitCharge=0;say('Three openings. Aim into the mouth when it opens.');}
    }
    if(bossPhase==='fighting') {
      fightTime+=dt;const cycle=fightTime%4,window=Math.floor(fightTime/4);
      open=cycle>=.9&&cycle<2.75&&hitWindow!==window&&flinch<=0;
      boss.scale.set(1,1,1);boss.rotation.z=.025*Math.sin(simTime*2.1);
      neck.rotation.z=.045*Math.sin(simTime*2.2);neck.scale.y=1+.022*Math.sin(simTime*2.7);
      const amount=open?1:0;
      upperJaw.rotation.x=THREE.MathUtils.damp(upperJaw.rotation.x,-.55*amount,10,dt);
      lowerJaw.rotation.x=THREE.MathUtils.damp(lowerJaw.rotation.x,.4*amount,10,dt);
      upperJaw.position.y=2.85+(flinch>0?Math.sin(flinch*24)*.08:0);
      if(!open)hitCharge=0;
    }
    if(bossPhase==='defeated') {
      defeatTime+=dt;const u=Math.min(1,defeatTime/1.5);world.setRoadProgress?.(u);
      boss.scale.set(1+u*.2,Math.max(.015,1-u),1+u*.2);boss.visible=u<1;
      mound.scale.set(1-u*.8,.28*(1-u),1-u*.8);mound.visible=u<1;
      restoredHill.position.y=bossGround-1.1+1.25*(1-(1-u)**3);
      shine.visible=defeatTime>.8&&!shineCollected;
      shine.position.y=bossGround+3+Math.sin(simTime*2.5)*.15;
      shine.rotation.y=simTime*1.3;shine.rotation.z=.08*Math.sin(simTime*2);
      goalPosition.copy(shine.position);
      if(!shineCollected&&defeatTime>1.65&&Math.hypot(p.x-shine.position.x,p.z-shine.position.z)<2.2&&Math.abs(p.y-shine.position.y)<3.05){
        shineCollected=true;shine.visible=false;stage='complete';burst(shine.position,60,7);sound('shine');callbacks.win?.();
      }
    }
    for(const patch of patches) {
      if(patch.cleared){patch.fade=Math.max(0,patch.fade-dt*2.2);patch.mesh.scale.setScalar(Math.max(.001,patch.fade));patch.mesh.visible=patch.fade>0;continue;}
      patch.mesh.scale.y=1+.025*Math.sin(simTime*2+patch.x);
      if(player.grounded&&Math.hypot(p.x-patch.x,p.z-patch.z)<patch.r*.67&&Math.abs(p.y-patch.mesh.position.y)<1.7) {
        if(!goopWarning){goopWarning=true;goopWarnTimer=2.5;say('Dark pasta is sticky. Spray a clean route through it.');}
        if(goopWarnTimer<=0)damagePlayer(patch.mesh.position);
      }
    }
    for(const hazard of hazards)if(hazard.active){moveHazard(hazard,dt,simTime);if(hazard.active&&Math.hypot(p.x-hazard.mesh.position.x,p.z-hazard.mesh.position.z)<1.13&&Math.abs(p.y+.7-hazard.mesh.position.y)<1.5)damagePlayer(hazard.mesh.position);}
    for(const coin of coins) {
      if(!coin.collected&&!shineCollected&&Math.hypot(p.x-coin.position.x,p.z-coin.position.z)<1.18&&Math.abs(p.y+.7-coin.position.y)<1.8){
        coin.collected=true;coinCount++;sound('coin');callbacks.pickup?.();burst(coin.position,7,2.2);
      }
      temp.position.copy(coin.position);temp.position.y+=Math.sin(simTime*2.7+coin.index*.6)*.13;temp.rotation.set(0,simTime*1.3+coin.index*.2,0);temp.scale.setScalar(coin.collected?0:1.1);temp.updateMatrix();coinMesh.setMatrixAt(coin.index,temp.matrix);
    }
    coinMesh.instanceMatrix.needsUpdate=true;
    for(let i=0;i<crumbs.length;i++){
      const c=crumbs[i];c.life-=dt;
      if(c.life>0){c.velocity.y-=14*dt;c.position.addScaledVector(c.velocity,dt);const floor=ground(c.position.x,c.position.z)+.07;if(c.position.y<floor){c.position.y=floor;c.velocity.y=Math.abs(c.velocity.y)*.16;c.velocity.x*=.86;c.velocity.z*=.86;}}
      temp.position.copy(c.position);temp.rotation.set(c.spin+simTime*4,c.spin,simTime*2);temp.scale.setScalar(c.life>0?Math.min(1,c.life*4):0);temp.updateMatrix();crumbMesh.setMatrixAt(i,temp.matrix);
    }
    crumbMesh.instanceMatrix.needsUpdate=true;
  }

  function spray(origin,direction,dt) {
    if(shineCollected)return;
    dt=Math.max(0,Math.min(dt,.05));const dir=direction.clone().normalize(),horizontal=Math.hypot(dir.x,dir.z);
    for(const patch of patches) {
      if(patch.cleared)continue;
      const dx=patch.x-origin.x,dz=patch.z-origin.z,dist=Math.hypot(dx,dz);
      const dot=horizontal>.001?(dx*dir.x+dz*dir.z)/(Math.max(dist,.001)*horizontal):0;
      if(dist<18&&Math.abs(patch.mesh.position.y-origin.y)<7&&(dot>.78||dist<1.4)) {
        patch.health-=dt*(1.35-dist*.035);if(patch.health<=0)clearPatch(patch);
      }
    }
    const target=bossPosition.clone().add(v(0,2.7,0));delta.copy(target).sub(origin);
    const distance=delta.length(),aim=delta.normalize().dot(dir);
    if(distance<24&&aim>.72){
      contactAge=0;
      if(bossPhase==='hidden') {
        revealCharge+=dt;
        if(revealCharge>=.7){bossPhase='emerging';emergeTime=0;boss.visible=true;boss.scale.set(.75,.06,.75);sound('reveal');burst(bossPosition.clone().add(v(0,.7,0)),16,4);}
      } else if(bossPhase==='fighting'&&open) {
        hitCharge+=dt;
        if(hitCharge>=.35){
          hitCharge=0;hitWindow=Math.floor(fightTime/4);bossHP--;flinch=.65;open=false;sound('bossHit');burst(target,14,4);
          if(bossHP<=0)defeatBoss();else say(`${bossHP} ${bossHP===1?'opening':'openings'} left. Wait for the mouth!`);
        }
      }
    }
  }

  function reset() {
    bossPhase='hidden';bossHP=3;open=false;cleaned=0;coinCount=0;shineCollected=false;
    revealCharge=hitCharge=emergeTime=fightTime=defeatTime=flinch=damageCooldown=simTime=contactAge=goopWarnTimer=0;
    hitWindow=-1;hazardClock=2.2;goopWarning=nearBossMessage=nearWheelMessage=false;stage='village';lastPlayer=null;
    boss.visible=false;boss.scale.set(1,1,1);boss.rotation.set(0,-.86,0);upperJaw.rotation.x=lowerJaw.rotation.x=0;upperJaw.position.y=2.85;neck.rotation.z=0;
    mound.visible=true;mound.scale.set(1,.28,1);shine.visible=false;restoredHill.position.y=bossGround-1.1;
    patches.forEach(p=>{p.health=p.initialHealth;p.cleared=false;p.fade=1;p.mesh.visible=true;p.mesh.scale.set(1,1,1);});
    coins.forEach(c=>c.collected=false);hazards.forEach(h=>{h.active=false;h.mesh.visible=false;});crumbs.forEach(c=>c.life=0);
    goalPosition.set(-8,ground(-8,13)+1,13);world.setRoadProgress?.(0);
  }
  function getState(){return{bossPhase,bossHP,open,cleaned,totalPollution:patches.length,coins:coinCount,shineCollected,bossPosition,goalPosition,stage};}
  reset();
  return {update,spray,reset,getState,coins,goalPosition};
}
