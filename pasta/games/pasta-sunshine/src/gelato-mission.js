import * as THREE from '../vendor/three.module.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {noodle,noodleBall} from './materials.js';

// Episode 1 has no boss: water the peninsula bud, enter its temporary gate,
// then cross the collapsing course with Mario's ordinary jumps alone.
export function createGelatoMission(scene,materials,world,callbacks={}){
  const M=materials,V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp;
  const landmark=(name,fallback)=>{const p=world.landmarks?.[name];return p?.isVector3?p.clone():p?V(p.x,p.y,p.z):V(...fallback);};
  const duneBud=landmark('duneBud',[-10,1.85,18]),portal=landmark('portal',[2,1.25,13]);
  const secretSpawn=landmark('secretSpawn',[0,0,10]),secretGoal=landmark('secretGoal',[-3,10.7,-48.5]);
  const oneUpPosition=landmark('secretOneUp',[6,10.2,-60.5]);
  const goalPosition=portal.clone(),bossPosition=duneBud.clone(),directionTo=V(),dummy=new THREE.Object3D();
  const root=new THREE.Group(),beachObjects=new THREE.Group(),secretObjects=new THREE.Group();
  root.name='Gelato Beach — Dune Bud Sand Castle Secret';root.add(beachObjects,secretObjects);scene.add(root);
  const PORTAL_DURATION=12,CHARGE_TIME=.8,THEFT_DURATION=1.8;
  let sublevel='beach',stage='bud',clock=0,portalRemaining=0,portalAge=0,budCharge=0,lastSpray=-10;
  let shineCollected=false,coinCount=0,retries=0,transitionSerial=0,theftTime=THEFT_DURATION,extraLives=0;
  let playerRef=null,entryGrace=0,cataquackAnnounced=false,oneUpCollected=false;
  const message=text=>callbacks.message?.(text),sound=kind=>callbacks.sound?.(kind);

  function bake(source){
    source.updateMatrixWorld(true);const inverse=source.matrixWorld.clone().invert(),bins=new Map(),group=new THREE.Group();
    source.traverse(o=>{if(!o.isMesh)return;let bin=bins.get(o.material.uuid);if(!bin){bin={material:o.material,geometries:[]};bins.set(o.material.uuid,bin);}bin.geometries.push(o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));});
    for(const bin of bins.values()){const geometry=mergeGeometries(bin.geometries,false);if(geometry){const mesh=new THREE.Mesh(geometry,bin.material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}bin.geometries.forEach(g=>g.dispose());}
    source.traverse(o=>{if(o.isMesh)o.geometry.dispose();});return group;
  }
  function ring(radius,tube,material){const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,6,24),material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
  function coilBody(radius,material,count=12){return bake(noodleBall(radius,material,count,2));}

  // Optional beach coins are short, hollow and ridged pieces of rigatoni.
  const coinSource=new THREE.Group(),profile=[new THREE.Vector2(.22,-.14),new THREE.Vector2(.33,-.14),new THREE.Vector2(.33,.14),new THREE.Vector2(.22,.14),new THREE.Vector2(.22,-.14)];
  const coinTube=new THREE.Mesh(new THREE.LatheGeometry(profile,20),M.gold);coinTube.rotation.x=Math.PI/2;coinSource.add(coinTube);
  for(let j=0;j<12;j++){const a=j/12*Math.PI*2;coinSource.add(noodle([[Math.cos(a)*.335,Math.sin(a)*.335,-.14],[Math.cos(a)*.343,Math.sin(a)*.343,0],[Math.cos(a)*.335,Math.sin(a)*.335,.14]],.026,M.gold,3,4));}
  const coinTemplate=bake(coinSource);
  const coinSpecs=[[-36,26],[-31,23],[-26,21],[-21,19],[-16,18],[-7,19],[-3,16],[3,17],[8,22],[12,26],[-22,10],[-28,12]];
  const coins=coinSpecs.map(([x,z],index)=>({position:V(x,world.heightAt(x,z)+1,z),collected:false,index}));
  const coinMesh=new THREE.InstancedMesh(coinTemplate.children[0].geometry,M.gold,coins.length);coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);coinMesh.frustumCulled=false;coinMesh.castShadow=true;beachObjects.add(coinMesh);

  const arrowSource=new THREE.Group();
  for(let strand=0;strand<5;strand++){
    const offset=(strand-2)*.065;
    arrowSource.add(noodle([[offset,1.32,0],[offset,.79,.025],[offset,.12,0]],.068,M.tomato,12,6));
    arrowSource.add(noodle([[-.65+offset,.69,0],[offset,.03,.035],[.65+offset,.69,0]],.068,M.tomato,16,6));
  }
  const portalArrow=bake(arrowSource);portalArrow.name='Rotating tomato-spaghetti entrance arrow';portalArrow.visible=false;beachObjects.add(portalArrow);

  // Blue Cataquacks are bundled noodles. They launch Mario without damage.
  const ducks=[];
  for(const [index,x,z]of [[0,-25,17],[1,-16,10],[2,8,21]]){
    const source=new THREE.Group(),body=coilBody(.6,M.blue,10);body.position.y=.64;body.scale.set(1,.85,1.18);source.add(body);
    const head=coilBody(.36,M.blue,8);head.position.set(0,1.26,.36);source.add(head);
    for(let i=0;i<4;i++)source.add(noodle([[-.26+i*.17,1.18,.54],[-.24+i*.16,1.14,.9],[-.22+i*.15,1.1,.67]],.075,M.toasted,10,6));
    for(const side of [-1,1]){
      source.add(noodle([[side*.28,.25,-.08],[side*.34,.11,.14],[side*.52,.09,.36],[side*.23,.1,.4]],.09,M.egg,12,6));
      source.add(noodle([[side*.48,.76,-.1],[side*.75,.85,.01],[side*.6,.62,.27]],.085,M.blue,12,6));
      const eye=ring(.09,.046,M.ink);eye.position.set(side*.245,1.34,.62);source.add(eye);
    }
    const group=bake(source);beachObjects.add(group);ducks.push({group,home:V(x,0,z),position:V(x,0,z),phase:index*2.1,cooldown:0});
  }

  const shineSource=new THREE.Group(),spiral=[];
  for(let i=0;i<95;i++){const a=i/94*Math.PI*8,r=.05+i/94*.6;spiral.push([Math.cos(a)*r,Math.sin(a)*r,0]);}
  shineSource.add(noodle(spiral,.105,M.gold,100,7));
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,points=[];for(let k=0;k<=12;k++){const t=k/12,r=.68+.65*Math.sin(t*Math.PI),angle=a+(t-.5)*.24;points.push([Math.cos(angle)*r,Math.sin(angle)*r,0]);}shineSource.add(noodle(points,.1,M.gold,16,6));}
  for(const x of [-.2,.2])shineSource.add(noodle([[x,-.12,.13],[x,.08,.17],[x,.23,.13]],.055,M.ink,7,6));
  const shine=bake(shineSource);shine.position.copy(secretGoal);secretObjects.add(shine);

  // The far horn's optional 1-Up is also pasta, including its spotted cap.
  const lifeSource=new THREE.Group();
  for(let j=0;j<9;j++){
    const y=.08+j*.08,r=Math.sqrt(Math.max(.01,.55*.55-y*y))+.07,points=[];
    for(let k=0;k<=32;k++){const a=k/32*Math.PI*2;points.push([Math.cos(a)*r,y,Math.sin(a)*r]);}
    lifeSource.add(noodle(points,.065,M.spinach,34,6));
  }
  for(let i=0;i<5;i++){const t=i*.18,stem=ring(.2,.065,M.cream);stem.rotation.x=Math.PI/2;stem.position.y=-.4+t*.5;lifeSource.add(stem);}
  for(const x of [-.12,.12])lifeSource.add(noodle([[x,-.26,.24],[x,-.1,.25],[x,-.01,.24]],.035,M.ink,5,5));
  const oneUp=bake(lifeSource);oneUp.position.copy(oneUpPosition);secretObjects.add(oneUp);

  // A brief, nonblocking theft animation visibly accounts for the missing pack.
  const shadow=new THREE.Group(),shadowSource=new THREE.Group();
  const shadowTorso=coilBody(.43,M.ink,10);shadowTorso.position.y=1.02;shadowTorso.scale.set(.85,1.35,.72);shadowSource.add(shadowTorso);
  const shadowHead=coilBody(.34,M.ink,9);shadowHead.position.set(0,1.78,.05);shadowSource.add(shadowHead);
  for(let i=0;i<4;i++){const cap=ring(.28+i*.025,.055,M.ink);cap.rotation.x=Math.PI/2;cap.position.y=2.02+i*.04;shadowSource.add(cap);}
  shadowSource.add(noodle([[-.29,2.02,.12],[0,2.03,.47],[.29,2.02,.12]],.065,M.ink,12,6));
  for(const side of [-1,1]){
    for(let j=0;j<3;j++){
      shadowSource.add(noodle([[side*.18+j*.045,.81,0],[side*.34+j*.035,.42,.12],[side*.42+j*.03,.16,.35]],.065,M.ink,12,6));
      shadowSource.add(noodle([[side*.32,1.43,0],[side*.51,1.19,.13],[side*.57,1.45,.47+j*.06]],.065,M.ink,12,6));
    }
    shadowSource.add(noodle([[side*.12,1.74,.34],[side*.12,1.86,.35],[side*.12,1.89,.34]],.045,M.cream,7,5));
  }
  shadow.add(bake(shadowSource));
  const stolenPack=new THREE.Group();
  for(const side of [-1,1])for(let i=0;i<8;i++){const loop=ring(.2,.055,i%3===0?M.blue:M.egg);loop.position.set(side*.24,1.28+i*.065,.7);loop.rotation.x=Math.PI/2;stolenPack.add(loop);}
  stolenPack.add(noodle([[-.42,1.32,.7],[0,1.2,.76],[.42,1.43,.7],[.52,1.8,.79]],.07,M.blue,18,6));
  shadow.add(bake(stolenPack));shadow.visible=false;secretObjects.add(shadow);

  function animateCoins(time,player){
    for(const coin of coins){
      if(!coin.collected&&player&&sublevel==='beach'&&Math.hypot(player.position.x-coin.position.x,player.position.z-coin.position.z)<1.0&&Math.abs(player.position.y+.9-coin.position.y)<1.5){coin.collected=true;coinCount++;sound('coin');callbacks.pickup?.();}
      dummy.position.copy(coin.position);dummy.position.y+=Math.sin(time*2.4+coin.index)*.12;dummy.rotation.set(0,time*1.5+coin.index*.2,0);dummy.scale.setScalar(coin.collected?0:1);dummy.updateMatrix();coinMesh.setMatrixAt(coin.index,dummy.matrix);
    }
    coinMesh.instanceMatrix.needsUpdate=true;
  }
  function updateDucks(dt,time,player){
    for(const duck of ducks){
      duck.cooldown=Math.max(0,duck.cooldown-dt);let targetX=duck.home.x+Math.sin(time*.45+duck.phase)*2.1,targetZ=duck.home.z+Math.cos(time*.41+duck.phase)*1.6;
      const near=player&&player.position.distanceTo(duck.position)<4.5;
      if(near){targetX=player.position.x;targetZ=player.position.z;}
      const dx=targetX-duck.position.x,dz=targetZ-duck.position.z,length=Math.hypot(dx,dz),step=Math.min(length,dt*(near?2.3:1.2));
      if(length>.01){duck.position.x+=dx/length*step;duck.position.z+=dz/length*step;duck.group.rotation.y=Math.atan2(dx,dz);}
      duck.position.y=world.heightAt(duck.position.x,duck.position.z);duck.group.position.copy(duck.position);duck.group.position.y+=Math.sin(time*7+duck.phase)*.055;duck.group.rotation.z=Math.sin(time*7+duck.phase)*.09;
      if(player&&duck.cooldown<=0&&Math.hypot(player.position.x-duck.position.x,player.position.z-duck.position.z)<.9&&Math.abs(player.position.y-duck.position.y)<1.2){
        duck.cooldown=2.6;callbacks.bounce?.(11.8);sound('jump');
        if(!cataquackAnnounced){cataquackAnnounced=true;message('Blue Cataquacks toss you up. They do not take a health petal.');}
      }
    }
  }
  function enterSecret(player){
    sublevel='secret';stage='secret-start';portalRemaining=0;budCharge=0;transitionSerial++;theftTime=0;entryGrace=.3;
    world.setCastleProgress?.(0);world.setBudCharge?.(0);world.enterSecret();player.reset(secretSpawn.clone());
    goalPosition.copy(secretGoal);beachObjects.visible=false;secretObjects.visible=true;shadow.visible=true;
    sound('reveal');message('Shadow Mario took the pasta nozzle! Run and jump. Green and toasted pasta blocks are safe.');
  }
  function onRespawn(player=playerRef){
    if(sublevel!=='secret'||!player)return false;
    world.resetSecret();player.reset(secretSpawn.clone());retries++;transitionSerial++;entryGrace=.3;theftTime=THEFT_DURATION;shadow.visible=false;stage='secret-start';
    message('Back at the secret entrance. Keep moving on the loose pasta; rest on the solid blocks.');return true;
  }
  function update(dt,time,player,input={}){
    dt=Number.isFinite(dt)?clamp(dt,0,.1):0;clock=Number.isFinite(time)?time:clock+dt;playerRef=player;
    entryGrace=Math.max(0,entryGrace-dt);beachObjects.visible=sublevel==='beach';secretObjects.visible=sublevel==='secret';
    portalArrow.visible=sublevel==='beach'&&portalRemaining>0;
    if(portalArrow.visible){portalArrow.position.copy(portal).add(V(0,2.9+Math.sin(clock*3)*.12,.15));portalArrow.rotation.y=clock*1.8;portalArrow.scale.setScalar(Math.min(1,portalAge/.55,portalRemaining/1.8));}
    if(sublevel==='beach'){
      if(portalRemaining>0){
        portalRemaining=Math.max(0,portalRemaining-dt);portalAge+=dt;
        const raised=Math.min(1,portalAge/.55,portalRemaining/1.8);world.setCastleProgress?.(raised);
        if(portalRemaining===0){stage='bud';message('The sand castle crumbled. Spray the peninsula bud to raise it again.');}
        else{
          stage='portal';const p=player?.position;
          if(p&&raised>.55&&Math.abs(p.x-portal.x)<1.2&&Math.abs(p.z-portal.z)<.8&&Math.abs(p.y-portal.y)<2.0)enterSecret(player);
        }
      }else if(clock-lastSpray>.18){budCharge=Math.max(0,budCharge-dt*.32);world.setBudCharge?.(budCharge/CHARGE_TIME);}
      if(sublevel==='beach'){animateCoins(clock,player);updateDucks(dt,clock,player);goalPosition.copy(portal);}
    }
    if(sublevel==='secret'){
      goalPosition.copy(secretGoal);theftTime=Math.min(THEFT_DURATION,theftTime+dt);shadow.visible=theftTime<THEFT_DURATION;
      if(shadow.visible){const t=theftTime/THEFT_DURATION;shadow.position.set(secretSpawn.x-1+t*8,secretSpawn.y+1.5+Math.sin(t*Math.PI)*2.3,secretSpawn.z-2-t*6);shadow.rotation.set(.15,Math.PI*.7+t*.7,-.15+Math.sin(t*9)*.13);shadow.scale.setScalar(Math.min(1,(1-t)*5));}
      shine.visible=!shineCollected;shine.rotation.y=clock*.85;shine.position.copy(secretGoal);shine.position.y+=Math.sin(clock*2.1)*.13;
      oneUp.visible=!oneUpCollected;oneUp.rotation.y=clock*.8;oneUp.position.copy(oneUpPosition);oneUp.position.y+=Math.sin(clock*2.4)*.1;
      if(player&&!shineCollected){
        const p=player.position;
        if(!oneUpCollected&&Math.hypot(p.x-oneUpPosition.x,p.z-oneUpPosition.z)<1.15&&Math.abs(p.y+1-oneUpPosition.y)<1.5){oneUpCollected=true;extraLives++;callbacks.pickup?.();sound('coin');message('1-UP! The Shine is on the peak above the incoming path.');}
        if(entryGrace<=0&&Math.hypot(p.x-secretGoal.x,p.z-secretGoal.z)<1.35&&Math.abs(p.y+1-secretGoal.y)<1.55){shineCollected=true;stage='complete';shine.visible=false;sound('shine');callbacks.win?.();}
        else if(p.z< -43)stage='castle';else if(p.z< -17)stage='bent-path';else if(p.z< -10)stage='rest';else stage='first-path';
      }
    }
  }
  function spray(origin,direction,dt){
    if(sublevel!=='beach'||shineCollected||portalRemaining>0||!Number.isFinite(dt)||dt<=0)return;
    directionTo.subVectors(duneBud,origin);const distance=directionTo.length(),length=direction.length();
    if(!Number.isFinite(distance)||!Number.isFinite(length)||length<.001||distance>18||distance<.05||directionTo.dot(direction)/(distance*length)<.86)return;
    lastSpray=clock;budCharge=Math.min(CHARGE_TIME,budCharge+Math.min(dt,.1));world.setBudCharge?.(budCharge/CHARGE_TIME);
    if(budCharge>=CHARGE_TIME-1e-6){portalRemaining=PORTAL_DURATION;portalAge=0;budCharge=0;stage='portal';sound('reveal');message('A sand castle rises on the peninsula! Run through either side of its arch before it crumbles.');}
  }
  function reset(){
    sublevel='beach';stage='bud';clock=portalAge=portalRemaining=budCharge=0;lastSpray=-10;shineCollected=false;coinCount=retries=transitionSerial=extraLives=0;theftTime=THEFT_DURATION;entryGrace=0;oneUpCollected=false;cataquackAnnounced=false;
    if(world.mode&&world.mode!=='beach')world.reset?.();world.setCastleProgress?.(0);world.setBudCharge?.(0);goalPosition.copy(portal);beachObjects.visible=true;secretObjects.visible=false;shadow.visible=false;portalArrow.visible=false;shine.visible=true;oneUp.visible=true;
    coins.forEach(c=>{c.collected=false;});for(const duck of ducks){duck.position.copy(duck.home);duck.position.y=world.heightAt(duck.position.x,duck.position.z);duck.group.position.copy(duck.position);duck.cooldown=0;}
    animateCoins(0,null);
  }
  function getState(){
    const w=world.getState?.()||{},blocksCrossed=w.blocksCrossed??w.touchedTiles??0,totalBlocks=w.totalSandTiles??w.totalBlocks??0;
    let objective,subobjective,area;
    if(shineCollected){objective='GELATO BEACH SHINE!';subobjective='The sand castle secret is complete.';area='SHINE COLLECTED';}
    else if(sublevel==='beach'){
      objective=portalRemaining>0?'ENTER THE SAND CASTLE':'WATER THE PENINSULA BUD';
      subobjective=portalRemaining>0?'Run through the open arch before the pasta castle crumbles.':'Find the little sprout by the peninsula and hold E to spray it.';area='GELATO BEACH';
    }else{
      objective=stage==='castle'?'CLIMB TO THE SHINE':'CROSS THE SAND CASTLE SECRET';
      subobjective=stage==='castle'?'Jump up the right side, then turn left toward the near peak.': 'Your nozzle is gone. Keep moving across loose pasta; pause on green or toasted blocks.';area='SAND CASTLE SECRET';
    }
    return {bossPhase:shineCollected?'defeated':sublevel==='secret'?'fighting':'hidden',bossHP:0,bossName:'',bossPosition,goalPosition,open:portalRemaining>0,cleaned:blocksCrossed,totalPollution:totalBlocks,coins:coinCount,shineCollected,stage,sublevel,nozzleEnabled:sublevel==='beach',portalRemaining,portalDuration:PORTAL_DURATION,budCharge:budCharge/CHARGE_TIME,retries,transitionSerial,blocksCrossed,totalBlocks,collapsedTiles:w.collapsedTiles??0,crumblingTiles:w.crumblingTiles??0,extraLives,objective,subobjective,area,interactionPrompt:sublevel==='beach'?(portalRemaining>0?'RUN THROUGH THE ARCH':'E · WATER THE DUNE BUD'):'SPACE · JUMP',aimTarget:sublevel==='beach'?duneBud:null};
  }
  reset();return {update,spray,reset,onRespawn,getState,coins,goalPosition};
}
