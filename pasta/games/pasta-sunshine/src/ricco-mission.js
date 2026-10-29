import * as THREE from '../vendor/three.module.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { noodle, noodleBall } from './materials.js';

// Ricco Harbor, Episode 1. All visible mission objects are modeled pasta.
// Grabbing is a spatial action: hold the target, walk away, then release.
export function createRiccoMission(scene, materials, world, callbacks = {}) {
  const M=materials, V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
  const clamp=THREE.MathUtils.clamp, lerp=THREE.MathUtils.lerp;
  const layer=new THREE.Group();layer.name='Ricco Harbor — Gooper Blooper Breaks Out';scene.add(layer);
  const floorAt=(x,z)=>{const h=world.heightAt(x,z);return Number.isFinite(h)?h:0;};
  const arenaY=8.2,bossPosition=V(29,arenaY,-44),goalPosition=V(-32,4.4,18);
  const mouthAnchor=V(29,arenaY+2.22,-41.35),crateAnchor=V(29,arenaY+1.08,-40.0),crateTip=V(29,arenaY+.38,-36);
  const aimTarget=mouthAnchor.clone(),up=V(0,1,0),zAxis=V(0,0,1),dummy=new THREE.Object3D();
  const aTmp=V(),bTmp=V(),cTmp=V(),hand=V();
  let randomSeed=33019;
  const random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
  const message=(text)=>callbacks.message?.(text),sound=(kind)=>callbacks.sound?.(kind);
  function bake(group){
    group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),bins=new Map(),out=new THREE.Group();
    group.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid;if(!bins.has(key))bins.set(key,{material:o.material,list:[]});bins.get(key).list.push(o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));});
    for(const {material,list}of bins.values()){const geometry=mergeGeometries(list,false);if(geometry){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;out.add(mesh);}list.forEach(g=>g.dispose());}
    group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});out.position.copy(group.position);out.quaternion.copy(group.quaternion);out.scale.copy(group.scale);return out;
  }
  function ringPoints(rx,rz,y=0,n=36){const points=[];for(let i=0;i<=n;i++){const t=i/n*Math.PI*2;points.push([Math.cos(t)*rx,y+Math.sin(t*5)*.02,Math.sin(t)*rz]);}return points;}
  function makeRing(radius,tube,material){const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,7,28),material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
  function matrixSegment(mesh,index,a,b,radius){
    aTmp.subVectors(b,a);const length=aTmp.length();dummy.position.copy(a).add(b).multiplyScalar(.5);
    dummy.quaternion.setFromUnitVectors(up,length>.0001?aTmp.multiplyScalar(1/length):up);dummy.scale.set(radius,Math.max(.001,length+.015),radius);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
  }

  // Five freight crates made from compressed layers of bucatini and lasagna.
  const crates=[];
  for(const [index,offset]of [[0,[-3.2,0,0]],[1,[0,0,0]],[2,[3.2,0,0]],[3,[-1.6,2.9,-.7]],[4,[1.6,2.9,-.7]]]){
    const g=new THREE.Group(),material=index%2?M.toasted:M.tomato,w=2.95,h=2.8,d=3;
    for(let y=.1;y<h;y+=.18){const p=[[-w/2,y,-d/2],[w/2,y,-d/2],[w/2,y,d/2],[-w/2,y,d/2],[-w/2,y,-d/2]];g.add(noodle(p,.115,material,18,5));}
    for(let x=-w/2;x<=w/2;x+=.22)g.add(noodle([[x,h,-d/2],[x,h+.025,0],[x,h,d/2]],.12,material,8,5));
    for(const x of [-1.18,1.18])g.add(noodle([[x,0,1.58],[x,1.4,1.6],[x,2.8,1.58]],.14,M.egg,7,6));
    const box=bake(g);box.position.set(29+offset[0],arenaY+offset[1],-42.1+offset[2]);layer.add(box);
    crates.push({group:box,start:box.position.clone(),spin:(index-2)*.7,velocity:V((index-2)*3.2,5+index*.8,index%2?4:-2)});
  }
  const bossCollider={minX:24.2,maxX:33.8,minZ:-46,maxZ:-40.5,bottom:arenaY-.1,top:arenaY+5.5,kind:'ricco-boss'};
  function setBodyCollision(mode){
    if(!Array.isArray(world.colliders))return;
    const i=world.colliders.indexOf(bossCollider);
    if(mode==='off'){if(i>=0)world.colliders.splice(i,1);return;}
    if(i<0)world.colliders.push(bossCollider);
    if(mode==='crates')Object.assign(bossCollider,{minX:24.2,maxX:33.8,minZ:-46,maxZ:-40.5,top:arenaY+5.5});
    else Object.assign(bossCollider,{minX:26.55,maxX:31.45,minZ:-46.3,maxZ:-42.35,top:arenaY+4.5});
  }

  const bossModel=new THREE.Group();bossModel.position.copy(bossPosition);bossModel.visible=false;layer.add(bossModel);
  const bodySource=new THREE.Group();
  // The body is a continuously wound tapered pasta shell, never a smooth orb.
  for(let i=0;i<31;i++){
    const t=i/30,y=.72+t*4.7,r=.22+2.37*Math.pow(Math.sin((.12+t*.85)*Math.PI),.83);
    bodySource.add(noodle(ringPoints(r,r*.78,y,44),.125,i%7===0?M.pale:M.cream,46,7));
  }
  for(let j=0;j<18;j++){
    const angle=j/18*Math.PI*2,points=[];
    for(let k=0;k<=18;k++){const t=k/18,r=2.05*(1-t),twist=angle+t*1.8;points.push([Math.cos(twist)*r,3.9+t*2.1,Math.sin(twist)*r*.77]);}
    bodySource.add(noodle(points,.11,M.cream,25,7));
  }
  // Four small rear pasta tentacles complete the eight-armed silhouette.
  for(let j=0;j<4;j++){
    const sign=j<2?-1:1,points=[];
    for(let k=0;k<=24;k++){const t=k/24,angle=t*Math.PI*1.8;points.push([sign*(1.3+t*1.5)+Math.sin(angle)*.35,.62+Math.sin(t*Math.PI)*.45,-.5-t*2.3+Math.cos(angle)*.3]);}
    for(let q=0;q<3;q++)bodySource.add(noodle(points.map(p=>[p[0]+q*.095,p[1],p[2]]),.095,M.cream,28,6));
  }
  const body=bake(bodySource);bossModel.add(body);
  const faceSource=new THREE.Group();
  for(const side of [-1,1]){
    const eye=makeRing(.34,.11,M.ink);eye.position.set(side*.73,3.08,1.77);eye.rotation.y=side*.22;faceSource.add(eye);
    faceSource.add(noodle([[side*.73,2.85,1.88],[side*.70,3.08,1.93],[side*.73,3.29,1.89]],.09,M.ink,10,6));
    faceSource.add(noodle([[side*.32,3.55,1.67],[side*.72,3.65,1.65],[side*1.1,3.42,1.59]],.105,M.blue,12,6));
  }
  for(let i=0;i<13;i++){
    const a=i*2.3999,y=1.2+(i%5)*.63,r=1.6+(i%3)*.1;
    const spot=makeRing(.17+(i%3)*.025,.065,M.blue);spot.position.set(Math.cos(a)*r,y,Math.sin(a)*r*.77);spot.lookAt(V(0,y,0));faceSource.add(spot);
  }
  const faceDetails=bake(faceSource);bossModel.add(faceDetails);
  const mouth=new THREE.Group();mouth.position.set(0,2.22,2.65);bossModel.add(mouth);
  for(let i=0;i<4;i++){const lip=makeRing(.52-i*.045,.12,M.cream);lip.position.z=i*.12;mouth.add(lip);}
  const innerLip=makeRing(.24,.085,M.tomato);innerLip.position.z=.36;mouth.add(innerLip);
  const corkSource=new THREE.Group();
  for(let j=0;j<6;j++){
    const pts=[];for(let i=0;i<=28;i++){const a=i/28*Math.PI*2;pts.push([Math.cos(a)*.36,Math.sin(a)*.36,.18+j*.10]);}
    corkSource.add(noodle(pts,.085,j%2?M.toasted:M.gold,30,6));
  }
  const corkSpiral=[];for(let i=0;i<=55;i++){const a=i/55*Math.PI*7,r=.025+.28*i/55;corkSpiral.push([Math.cos(a)*r,Math.sin(a)*r,.78]);}
  corkSource.add(noodle(corkSpiral,.068,M.toasted,60,6));const cork=bake(corkSource);mouth.add(cork);
  const inkCoats=[];
  for(let j=0;j<8;j++){
    const src=new THREE.Group();
    for(let k=0;k<3;k++){
      const points=[];for(let q=0;q<=15;q++){const t=q/15,x=-1.35+j*.36+.11*Math.sin(t*9+k),y=1.75+t*1.9;points.push([x,y,1.85+.38*Math.sin(t*Math.PI)+k*.055]);}
      src.add(noodle(points,.115,M.ink,22,6));
    }
    const coat=bake(src);bossModel.add(coat);inkCoats.push(coat);
  }

  // Four long tentacles are 13-node Verlet chains. Several individual strands
  // wind around each simulated centre line, sharing one instanced draw call.
  const N=13,BUNDLES=4,SEGMENTS=N-1;
  const segmentGeometry=new THREE.CylinderGeometry(1,1,1,7,1,true);
  const tentacleMesh=new THREE.InstancedMesh(segmentGeometry,M.cream,4*SEGMENTS*BUNDLES);tentacleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);tentacleMesh.frustumCulled=false;tentacleMesh.castShadow=true;tentacleMesh.receiveShadow=true;layer.add(tentacleMesh);
  const suctionMesh=new THREE.InstancedMesh(new THREE.TorusGeometry(.22,.07,6,16),M.pale,4*6);suctionMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);suctionMesh.frustumCulled=false;suctionMesh.castShadow=true;layer.add(suctionMesh);
  const tipMesh=new THREE.InstancedMesh(new THREE.TorusGeometry(.29,.12,6,18),M.blue,4);tipMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);tipMesh.frustumCulled=false;layer.add(tipMesh);
  const redTipMesh=new THREE.InstancedMesh(new THREE.TorusGeometry(.105,.065,5,14),M.tomato,4);redTipMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);redTipMesh.frustumCulled=false;layer.add(redTipMesh);
  const grabStrands=new THREE.InstancedMesh(segmentGeometry,M.cream,72);grabStrands.instanceMatrix.setUsage(THREE.DynamicDrawUsage);grabStrands.frustumCulled=false;grabStrands.castShadow=true;layer.add(grabStrands);
  const tentacles=[];
  for(let i=0;i<4;i++){
    const xOffsets=[-2,-.72,.72,2],endX=[-6.3,-2.7,2.7,6.3],endZ=[5.7,8.2,8.2,5.7];
    const anchor=V(29+xOffsets[i],arenaY+.83,-42.95),restTip=V(29+endX[i],arenaY+.3,-44+endZ[i]);
    const nodes=Array.from({length:N},()=>V()),old=Array.from({length:N},()=>V()),target=restTip.clone();
    const t={index:i,anchor,restTip,nodes,old,tip:nodes[N-1],state:'idle',timer:0,age:0,rest:anchor.distanceTo(restTip)*1.10/SEGMENTS,h:1/120,target,attackStart:V(),struck:false,removedAge:0};
    const ring=makeRing(.9,.055,M.tomato);ring.rotation.x=-Math.PI/2;ring.visible=false;layer.add(ring);t.ring=ring;tentacles.push(t);
  }
  function resetTentacle(t){
    t.state='idle';t.timer=0;t.age=0;t.removedAge=0;t.struck=false;t.target.copy(t.restTip);t.ring.visible=false;t.h=1/120;
    for(let i=0;i<N;i++){const u=i/SEGMENTS;t.nodes[i].copy(t.anchor).lerp(t.restTip,u);t.nodes[i].y+=Math.sin(u*Math.PI)*.55;t.old[i].copy(t.nodes[i]);}
  }

  // Dark nests represent ink on the ship and plaza. Cleaning removes strands.
  const patchSpecs=[[-30,22,1.1,3.2],[-25,17,1.0,3.2],[-10,4,.8,4.2],[1,-5,.85,4.2],[13,-15,.9,4.5],
    [35,-31,1.0,8.2],[33,-35,1.0,8.2],[25,-34,1.1,8.2],[22,-38,1.35,8.2],[20,-43,1.3,8.2],[23,-48,1.25,8.2],
    [27,-48,1.4,8.2],[32,-48,1.2,8.2],[36,-46,1.2,8.2],[38,-42,1.2,8.2],[36,-38,1.4,8.2],[32,-38,1.2,8.2],
    [28,-39,1.0,8.2],[25,-42,1.1,8.2],[34,-43,1.0,8.2],[30,-34,1.0,8.2],[38,-32,.9,8.2]];
  const patches=patchSpecs.map(([x,z,r,y],index)=>{
    const g=new THREE.Group();for(let j=0;j<7;j++){const pts=[],phase=random()*Math.PI*2;for(let k=0;k<=18;k++){const a=k/18*Math.PI*2.3,rr=r*(.25+j*.105);pts.push([Math.cos(a+phase)*rr,.06+j*.018+Math.sin(a*4)*.045,Math.sin(a+phase)*rr*.76]);}g.add(noodle(pts,.075+random()*.025,M.ink,24,5));}
    const mesh=bake(g);mesh.position.set(x,y+.055,z);layer.add(mesh);return {mesh,x,z,r,y,index,health:.75,cleared:false,fade:1};
  });
  const coinSpecs=[[-46,37,2],[-42,33,2],[-42,29,2],[-35,25,3.2],[-30,23,3.2],[-24,19,3.2],[-23,14,3.2],[-13,5,4.2],[-10,5,4.2],[-8,2,4.2],[-8,-2,4.2],[0,-3,4.2],[0,-7,4.2],[4,-10.8,4.2],[13,-14,4.5],[14,-16,4.5],[15,-18,4.5],[31,-24,4.5],[33,-23,4.5],[35,-29,8.2],[35,-33,8.2],[31,-35,8.2],[27,-34,8.2],[24,-36,8.2],[20,-39,8.2],[20,-45,8.2],[23,-50,8.2],[30,-50,8.2],[37,-48,8.2],[39,-41,8.2],[38,-36,8.2]];
  const coinSource=new THREE.Group(),profile=[new THREE.Vector2(.22,-.14),new THREE.Vector2(.33,-.14),new THREE.Vector2(.33,.14),new THREE.Vector2(.22,.14),new THREE.Vector2(.22,-.14)];
  const tube=new THREE.Mesh(new THREE.LatheGeometry(profile,20),M.gold);tube.rotation.x=Math.PI/2;coinSource.add(tube);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;coinSource.add(noodle([[Math.cos(a)*.335,Math.sin(a)*.335,-.14],[Math.cos(a)*.34,Math.sin(a)*.34,0],[Math.cos(a)*.335,Math.sin(a)*.335,.14]],.025,M.gold,3,4));}
  const coinGroup=bake(coinSource),coins=coinSpecs.map(([x,z,y],index)=>({position:V(x,y+1,z),collected:false,index}));
  const coinMesh=new THREE.InstancedMesh(coinGroup.children[0].geometry,M.gold,coins.length);coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);coinMesh.frustumCulled=false;coinMesh.castShadow=true;layer.add(coinMesh);

  const shineSource=new THREE.Group(),spiral=[];
  for(let i=0;i<95;i++){const a=i/94*Math.PI*8,r=.05+i/94*.60;spiral.push([Math.cos(a)*r,Math.sin(a)*r,0]);}
  shineSource.add(noodle(spiral,.105,M.gold,100,7));
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,pts=[];for(let k=0;k<=12;k++){const t=k/12,r=.68+.65*Math.sin(t*Math.PI),angle=a+(t-.5)*.24;pts.push([Math.cos(angle)*r,Math.sin(angle)*r,0]);}shineSource.add(noodle(pts,.10,M.gold,16,6));}
  for(const x of [-.20,.20])shineSource.add(noodle([[x,-.12,.13],[x,.08,.17],[x,.23,.13]],.055,M.ink,7,6));
  const shine=bake(shineSource);shine.position.set(29,arenaY+2,-43);shine.visible=false;layer.add(shine);

  const crumbMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.055,.075,.3,6),M.cream,110);crumbMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);crumbMesh.frustumCulled=false;layer.add(crumbMesh);
  const crumbs=Array.from({length:110},()=>({position:V(0,-100,0),velocity:V(),life:0,phase:0}));let crumbCursor=0;
  function burst(position,count=16,speed=4){for(let i=0;i<count;i++){const c=crumbs[crumbCursor++%crumbs.length];c.position.copy(position);c.velocity.set((random()-.5)*speed,1+random()*speed,(random()-.5)*speed);c.life=1.1+random();c.phase=random()*Math.PI*2;}}
  const ballGroup=bake(noodleBall(.36,M.ink,9,2));const inkBalls=Array.from({length:6},()=>{const mesh=new THREE.Mesh(ballGroup.children[0].geometry,M.ink);mesh.visible=false;mesh.castShadow=true;layer.add(mesh);return{mesh,velocity:V(),active:false,age:0};});

  let bossPhase='hidden',bossHP=2,round=1,faceDirt=1,faceClean=false,cleaned=0,coinCount=0,shineCollected=false;
  let clock=0,phaseTime=0,attackClock=1.8,inkClock=0,damageCooldown=0,grab=null,grabLatch=false,grabCooldown=0,invalidToastAt=-10;
  let playerRef=null,previousFeetY=0,previousVy=0,stage='harbor',interactionPrompt='',objective='',subobjective='',area='RICCO HARBOR';
  let wave=0,cratePullTarget=crateTip.clone(),lastFaceContact=-10,arenaAnnounced=false;
  const soundLog=[];
  function harm(source,amount=1){
    if(damageCooldown>0||!playerRef||shineCollected||(playerRef.health??8)<=0)return false;
    const impulse=playerRef.position.clone().sub(source);impulse.y=0;if(impulse.lengthSq()<.001)impulse.set(0,0,1);impulse.normalize().multiplyScalar(4);impulse.y=4;
    damageCooldown=1.5;callbacks.damage?.(amount,impulse);sound('damage');
    if(grab)releaseGrab(false,true);return true;
  }
  function clearPatch(p){if(p.cleared)return;p.cleared=true;p.health=0;cleaned++;burst(p.mesh.position,5,2);}
  function dirtyArena(){for(const p of patches)if(p.index>=5){if(p.cleared)cleaned--;p.cleared=false;p.health=.75;p.fade=1;p.mesh.visible=true;p.mesh.scale.set(1,1,1);}}
  function startAttack(){
    if(!playerRef||bossPhase!=='fighting')return;
    wave++;
    for(const t of tentacles){
      if(t.state==='removed'||t.state==='flattened'||t.state==='grabbed')continue;
      t.state='windup';t.age=0;t.timer=.94+(t.index%2)*.13;t.struck=false;t.attackStart.copy(t.tip);
      t.target.copy(playerRef.position);t.target.x+=(t.index-1.5)*.68;t.target.y=arenaY+.22;
      const dx=t.target.x-t.anchor.x,dz=t.target.z-t.anchor.z,d=Math.hypot(dx,dz),reach=t.rest*SEGMENTS*.98;
      if(d>reach){t.target.x=t.anchor.x+dx/d*reach;t.target.z=t.anchor.z+dz/d*reach;}
      t.ring.position.set(t.target.x,arenaY+.09,t.target.z);t.ring.visible=true;
    }
    sound('windup');
  }
  function beginBoss(){
    bossPhase='emerging';phaseTime=0;bossModel.visible=true;bossModel.scale.set(.75,.12,.75);setBodyCollision('body');
    tentacles.forEach(resetTentacle);sound('reveal');burst(crateAnchor,45,7);message('Gooper Blooper breaks out! Wash its face. Stomp a tentacle, then hold G and pull.');
  }
  function hitFace(){
    if(bossPhase!=='fighting'||!faceClean)return;
    bossHP--;sound('bossHit');burst(mouthAnchor,30,6);
    if(bossHP>0){
      round=2;bossPhase='recovering';phaseTime=0;faceDirt=1;faceClean=false;cork.visible=false;
      dirtyArena();tentacles.forEach(resetTentacle);attackClock=0;message('The cork is out. It regrows its arms! Wash the face and pull the mouth once more.');
    }else{
      bossPhase='defeated';phaseTime=0;faceClean=false;setBodyCollision('off');patches.forEach(clearPatch);inkBalls.forEach(b=>{b.active=false;b.mesh.visible=false;});
      for(const t of tentacles){t.state='removed';t.removedAge=0;t.ring.visible=false;for(let i=0;i<N;i++)t.old[i].copy(t.nodes[i]).sub(V(.06,.12,.035));}
      goalPosition.copy(shine.position);sound('bossDefeat');burst(bossPosition.clone().add(V(0,3,0)),70,9);message('Gooper Blooper is overboard! Collect the pasta Shine.');
    }
  }
  function candidate(){
    if(!playerRef)return null;hand.copy(playerRef.position).add(V(0,1.2,0));
    if(bossPhase==='hidden')return hand.distanceTo(crateTip)<2.5?{kind:'crate',anchor:crateAnchor,point:crateTip}:null;
    if(bossPhase!=='fighting')return null;
    if(hand.distanceTo(mouthAnchor)<2.55)return {kind:'face',anchor:mouthAnchor,point:mouthAnchor,dirty:!faceClean};
    let closest=null,best=2.1;
    for(const t of tentacles){if(t.state==='removed'||t.state==='grabbed'||t.state==='windup')continue;const d=hand.distanceTo(t.tip);if(d<best){best=d;closest={kind:'tentacle',index:t.index,anchor:t.anchor,point:t.tip};}}
    return closest;
  }
  function beginGrab(c){
    if(c.dirty){if(clock-invalidToastAt>2){invalidToastAt=clock;message('Its face is too slippery. Hold E to wash off the dark pasta first.');}return;}
    hand.copy(playerRef.position).add(V(0,1.2,0));
    grab={kind:c.kind,index:c.index,anchor:c.anchor.clone(),startDistance:hand.distanceTo(c.anchor),tension:0,stretch:0,age:0,target:hand.clone()};
    if(c.kind==='tentacle'){const t=tentacles[c.index];t.state='grabbed';t.ring.visible=false;}
    if(c.kind==='face'){attackClock=0;startAttack();}
    sound('grab');
  }
  function releaseGrab(allow=true,interrupted=false){
    if(!grab)return;const g=grab;grab=null;grabCooldown=.25;grabLatch=interrupted||g.stretch>=5.4;
    const success=allow&&g.stretch>=3.5;
    if(g.kind==='tentacle'){
      const t=tentacles[g.index];
      if(success){t.state='removed';t.removedAge=0;t.ring.visible=false;burst(t.tip,12,3.5);sound('snap');message('One arm down. The others are optional; a clean face can be pulled too.');}
      else{t.state='flattened';t.timer=Math.max(1.3,t.timer);t.target.copy(t.tip);t.target.y=arenaY+.14;}
    }else if(g.kind==='crate'){
      if(success)beginBoss();
    }else if(g.kind==='face'&&success&&faceClean)hitFace();
    if(!success&&!interrupted&&clock-invalidToastAt>1.2){invalidToastAt=clock;message('Too loose! Hold G, walk farther away, then release at full tension.');}
  }
  function updateGrab(dt,input){
    if(!input.grab)grabLatch=false;
    grabCooldown=Math.max(0,grabCooldown-dt);
    if(grab){
      grab.age+=dt;hand.copy(playerRef.position).add(V(0,1.2,0));grab.target.copy(hand);
      grab.stretch=Math.max(0,hand.distanceTo(grab.anchor)-grab.startDistance);grab.tension=clamp(grab.stretch/3.5,0,1);
      if(grab.kind==='crate')cratePullTarget.copy(hand);
      if(grab.kind==='tentacle')tentacles[grab.index].target.copy(hand);
      if(!input.grab)releaseGrab(true);else if(grab.stretch>=5.4)releaseGrab(true);
    }else if(input.grab&&!grabLatch&&grabCooldown<=0){const c=candidate();if(c)beginGrab(c);}
  }

  function animateTentacles(dt){
    const visible=bossPhase!=='hidden'&&bossPhase!=='emerging'||(bossPhase==='emerging'&&phaseTime>.30);
    for(const t of tentacles){
      t.age+=dt;
      if(t.state==='flattened'){t.timer-=dt;if(t.timer<=0){t.state='idle';t.age=0;}}
      else if(t.state==='windup'){
        t.timer-=dt;if(t.timer<=0){t.state='slapping';t.age=0;t.attackStart.copy(t.tip);}
      }else if(t.state==='slapping'){
        if(!t.struck&&t.age>.18){
          t.struck=true;t.ring.visible=false;
          if(playerRef&&Math.hypot(playerRef.position.x-t.target.x,playerRef.position.z-t.target.z)<1.45&&playerRef.position.y<arenaY+1.3)harm(t.target);
          burst(t.target,6,2.5);sound('slap');
        }
        if(t.age>.56){t.state='idle';t.age=0;}
      }
      if(t.state==='removed')t.removedAge+=dt;
      let target=t.restTip;
      if(t.state==='idle'){
        bTmp.copy(t.restTip);bTmp.x+=Math.sin(clock*1.2+t.index)*.26;bTmp.y+=.10+.18*Math.sin(clock*2+t.index);target=bTmp;
      }else if(t.state==='windup'){
        const u=clamp(t.age/.7,0,1);bTmp.copy(t.attackStart).lerp(t.target,u);bTmp.y=lerp(t.attackStart.y,arenaY+4.4,u);target=bTmp;
      }else if(t.state==='slapping'){
        const u=clamp(t.age/.19,0,1);bTmp.copy(t.attackStart).lerp(t.target,u*u);target=bTmp;
      }else if(t.state==='flattened'||t.state==='grabbed')target=t.target;
      const substeps=2,h=dt/substeps;
      if(h>0)for(let sub=0;sub<substeps;sub++){
        const ratio=clamp(h/t.h,.1,4),damp=Math.exp(-h*(t.state==='removed'?2.7:2.0));
        for(let i=0;i<N;i++){
          const p=t.nodes[i],old=t.old[i],x=p.x,y=p.y,z=p.z;
          p.x+=(x-old.x)*ratio*damp;p.y+=(y-old.y)*ratio*damp-13*h*h;p.z+=(z-old.z)*ratio*damp;
          old.set(x,y,z);
          if(t.state!=='removed'&&i>0&&i<N-1){
            const u=i/SEGMENTS,arch=t.state==='windup'?1.7:t.state==='flattened'?.05:.6;
            cTmp.copy(t.anchor).lerp(target,u);cTmp.y+=Math.sin(u*Math.PI)*arch;
            p.addScaledVector(cTmp.sub(p),(t.state==='slapping'?50:24)*h*h);
          }
        }
        t.h=h;
        const extension=t.state==='grabbed'&&grab?.index===t.index?1+grab.tension*.26:1;
        const rest=t.rest*extension;
        for(let iter=0;iter<6;iter++){
          if(t.state!=='removed'){t.nodes[0].copy(t.anchor);t.nodes[N-1].copy(target);}
          for(let i=0;i<N-1;i++){
            const a=t.nodes[i],b=t.nodes[i+1];cTmp.subVectors(b,a);const d=cTmp.length()||.001,err=(d-rest)/d;
            const pinA=t.state!=='removed'&&i===0,pinB=t.state!=='removed'&&i+1===N-1;
            if(!pinA)a.addScaledVector(cTmp,err*(pinB?1:.5));if(!pinB)b.addScaledVector(cTmp,-err*(pinA?1:.5));
          }
          // A weak bend constraint avoids infinitely sharp folds while retaining
          // the slack and spring-back of a cooked strand.
          for(let i=0;i<N-2;i++){
            const a=t.nodes[i],b=t.nodes[i+2];cTmp.subVectors(b,a);const d=cTmp.length()||.001,min=rest*1.28;
            if(d<min){const correction=(d-min)/d*.11;if(i>0||t.state==='removed')a.addScaledVector(cTmp,correction);if(i+2<N-1||t.state==='removed')b.addScaledVector(cTmp,-correction);}
          }
          for(let i=0;i<N;i++){const p=t.nodes[i],floor=floorAt(p.x,p.z)+.12;if(p.y<floor){p.y=floor;t.old[i].x=lerp(t.old[i].x,p.x,.18);t.old[i].z=lerp(t.old[i].z,p.z,.18);}}
        }
        if(t.state!=='removed'){t.nodes[0].copy(t.anchor);t.nodes[N-1].copy(target);}
      }
      // Stomping uses a descending foot crossing, not proximity alone.
      if(visible&&playerRef&&bossPhase==='fighting'&&['idle','slapping','windup'].includes(t.state)){
        const p=playerRef.position,descending=playerRef.velocity.y<-.2||(playerRef.grounded&&previousVy<-.2);
        if(descending&&Math.hypot(p.x-t.tip.x,p.z-t.tip.z)<.93&&p.y<=t.tip.y+.45&&previousFeetY>t.tip.y+.16){
          t.state='flattened';t.timer=5;t.age=0;t.target.copy(t.tip);t.target.y=floorAt(t.tip.x,t.tip.z)+.13;t.ring.visible=false;
          callbacks.bounce?.(6.2);burst(t.tip,7,2);sound('land');
        }
      }
      let index=t.index*SEGMENTS*BUNDLES,scale=visible?(t.state==='removed'?clamp((6-t.removedAge)*.7,0,1):1):0;
      if(bossPhase==='emerging')scale*=clamp(phaseTime/.8,0,1);
      for(let i=0;i<SEGMENTS;i++)for(let j=0;j<BUNDLES;j++){
        const phase=j/BUNDLES*Math.PI*2+i*.48,phase2=phase+.48,r=.16*(1-i/N*.45),r2=.16*(1-(i+1)/N*.45);
        bTmp.copy(t.nodes[i]).add(V(Math.cos(phase)*r,Math.sin(phase)*r,0));cTmp.copy(t.nodes[i+1]).add(V(Math.cos(phase2)*r2,Math.sin(phase2)*r2,0));
        matrixSegment(tentacleMesh,index++,bTmp,cTmp,(.125-i/N*.038)*scale);
      }
      for(let i=0;i<6;i++){
        const p=t.nodes[2+i*2];dummy.position.copy(p);dummy.position.y-=.15;dummy.rotation.set(Math.PI/2,0,0);dummy.scale.setScalar(scale*(1-i*.055));dummy.updateMatrix();suctionMesh.setMatrixAt(t.index*6+i,dummy.matrix);
      }
      dummy.position.copy(t.tip);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.set(1.15*scale,(t.state==='flattened'?.28:1)*scale,scale);dummy.updateMatrix();tipMesh.setMatrixAt(t.index,dummy.matrix);
      dummy.position.y+=.08;dummy.scale.setScalar(scale);dummy.updateMatrix();redTipMesh.setMatrixAt(t.index,dummy.matrix);
      t.ring.scale.setScalar(1+Math.sin(clock*13)*.075);
    }
    tentacleMesh.instanceMatrix.needsUpdate=suctionMesh.instanceMatrix.needsUpdate=tipMesh.instanceMatrix.needsUpdate=redTipMesh.instanceMatrix.needsUpdate=true;
  }
  function drawGrabStrands(){
    let count=0;
    if(bossPhase==='hidden'){
      const end=grab?.kind==='crate'?grab.target:crateTip;
      for(let strand=0;strand<3;strand++)for(let i=0;i<12;i++){
        const u=i/12,w=(i+1)/12;
        bTmp.copy(crateAnchor).lerp(end,u);cTmp.copy(crateAnchor).lerp(end,w);
        bTmp.x+=Math.sin(u*7+clock*2+strand)*.11;bTmp.y+=Math.sin(u*Math.PI)*.27+strand*.07;
        cTmp.x+=Math.sin(w*7+clock*2+strand)*.11;cTmp.y+=Math.sin(w*Math.PI)*.27+strand*.07;
        matrixSegment(grabStrands,count++,bTmp,cTmp,.13);
      }
    }
    mouth.position.set(0,2.22,2.65);
    if(grab?.kind==='face'){
      const end=grab.target;mouth.position.copy(end).sub(bossModel.position);
      for(let strand=0;strand<4;strand++)for(let i=0;i<9;i++){
        const u=i/9,w=(i+1)/9,a=strand/4*Math.PI*2;
        bTmp.copy(mouthAnchor).lerp(end,u);cTmp.copy(mouthAnchor).lerp(end,w);
        bTmp.x+=Math.cos(a)*.24;bTmp.y+=Math.sin(a)*.24-Math.sin(u*Math.PI)*.14;
        cTmp.x+=Math.cos(a)*.24;cTmp.y+=Math.sin(a)*.24-Math.sin(w*Math.PI)*.14;
        matrixSegment(grabStrands,count++,bTmp,cTmp,.10);
      }
    }
    grabStrands.count=count;grabStrands.instanceMatrix.needsUpdate=true;
  }
  function updateBalls(dt){
    if(bossPhase==='fighting'&&round===2&&playerRef){
      inkClock+=dt;const distance=playerRef.position.distanceTo(bossPosition);
      if(inkClock>3.6&&distance>8&&distance<25){
        inkClock=0;const ball=inkBalls.find(b=>!b.active);if(ball){ball.active=true;ball.age=0;ball.mesh.visible=true;ball.mesh.position.copy(mouthAnchor);ball.velocity.copy(playerRef.position).sub(mouthAnchor);ball.velocity.y=0;ball.velocity.normalize().multiplyScalar(8.4);ball.velocity.y=4.3;sound('spray');}
      }
    }
    for(const ball of inkBalls){
      if(!ball.active)continue;ball.age+=dt;ball.velocity.y-=11*dt;ball.mesh.position.addScaledVector(ball.velocity,dt);ball.mesh.rotation.x+=dt*6;ball.mesh.rotation.z+=dt*2;
      if(playerRef&&ball.mesh.position.distanceTo(playerRef.position.clone().add(V(0,.85,0)))<.9){harm(ball.mesh.position);ball.active=false;}
      if(ball.mesh.position.y<floorAt(ball.mesh.position.x,ball.mesh.position.z)+.2||ball.age>4){burst(ball.mesh.position,6,2);ball.active=false;}
      ball.mesh.visible=ball.active;
    }
  }
  function updatePresentation(){
    interactionPrompt='';
    if(grab)interactionPrompt=grab.tension>=1?'RELEASE G · SNAP IT!':'HOLD G + WALK AWAY · STRETCH THE PASTA';
    else{const c=candidate();if(c)interactionPrompt=c.dirty?'E · WASH THE FACE FIRST':c.kind==='crate'?'HOLD G + WALK BACK · PULL THE CRATE TENTACLE':c.kind==='face'?'HOLD G + WALK BACK · PULL THE '+(round===1?'CORK':'MOUTH'):'HOLD G + WALK AWAY · PULL THE TENTACLE';}
    if(shineCollected){stage='complete';objective='Ricco Harbor’s first Shine is yours';subobjective='Explore the pasta harbor, or choose another stage.';area='EPISODE COMPLETE';return;}
    if(bossPhase==='defeated'){stage='shine';objective='Collect the pasta Shine';subobjective='Gooper Blooper is overboard. The Shine is in the crate plaza.';area='THE CLEARED PLAZA';goalPosition.copy(shine.position);return;}
    if(bossPhase!=='hidden'){
      stage='boss';area='GOOPER BLOOPER';goalPosition.copy(mouthAnchor);
      if(bossPhase==='emerging'){objective='The cargo has escaped';subobjective='Wash its face. Jump on an arm to flatten it, then grab and pull.';}
      else if(bossPhase==='recovering'){objective='One pull left';subobjective='The arms regrow and the face is dirty again. Keep clear of the ink.';}
      else if(grab){objective=grab.tension>=1?'Let go and snap it!':'Stretch the spaghetti';subobjective='Keep G held and walk away. Release once the tension meter is full.';}
      else{objective=faceClean?(round===1?'Pull the cork':'Pull the mouth — last round'):'Wash the ink off its face';subobjective=faceClean?'G to grab, walk backward, then release. Stomp arms for a safer opening.':'Hold E toward its face. Dodge the raised tentacles; jump on their tips.';}
      return;
    }
    const p=playerRef?.position||V(-42,2,37);
    if(p.y>=7&&p.x>12){stage='crate';area='THE FREIGHT PLAZA';objective='Something is inside those crates';subobjective='Grab the loose tentacle with G. Keep holding and walk away, then release.';goalPosition.copy(crateTip);}
    else if(p.x>25){stage='lift';area='THE QUAYSIDE LIFT';objective='Ride up to the street';subobjective='Board the rising red platform, then follow the overhead pasta grate.';goalPosition.set(33,8,-23);}
    else if(p.x>8){stage='submarine';area='THE YELLOW SUBMARINE';objective='Raise the submarine';subobjective='Spray the propeller, cross the submarine, then spray the Bloopads.';goalPosition.set(14,5.5,-19);}
    else if(p.x>-17){stage='grates';area='THE PASTA GRATE MAZE';objective='Cross the harbor scaffolds';subobjective='Climb the woven grates. Follow the arrows to the next crane.';goalPosition.set(4,5.2,-9);}
    else if(p.z<29){stage='ship';area='THE FREIGHTER';objective='Ride the crane to the grates';subobjective='Turn right at the smokestack. Board the moving pasta platform.';goalPosition.set(-14,5.2,5);}
    else{stage='harbor';area='RICCO HARBOR';objective='Follow the rigatoni onto the ship';subobjective='The first Shine is beyond the cranes, grates and yellow submarine.';goalPosition.set(-32,4.3,18);}
  }

  function update(dt,time,player,input={}){
    dt=clamp(Number.isFinite(dt)?dt:0,0,.05);clock+=dt;phaseTime+=dt;playerRef=player;
    damageCooldown=Math.max(0,damageCooldown-dt);
    if(player.health<=0&&grab)releaseGrab(false,true);
    if(!arenaAnnounced&&player.position.y>7&&player.position.z<-30){arenaAnnounced=true;message('A tentacle is poking out of the cargo. Hold G, walk away, then release to pull it free.');}
    updateGrab(dt,input);
    if(bossPhase==='emerging'){
      const u=clamp(phaseTime/1.35,0,1),e=1-(1-u)**3;bossModel.scale.set(.75+.25*e,.12+.88*e,.75+.25*e);
      for(const c of crates){c.group.position.copy(c.start).addScaledVector(c.velocity,phaseTime);c.group.position.y-=phaseTime*phaseTime*4;c.group.rotation.set(c.spin*phaseTime,phaseTime*c.spin*.3,c.spin*phaseTime*.5);c.group.scale.setScalar(Math.max(0,1-phaseTime*.6));c.group.visible=u<1;}
      if(u>=1){bossPhase='fighting';phaseTime=0;attackClock=1.7;bossModel.scale.set(1,1,1);}
    }else if(bossPhase==='recovering'){
      bossModel.rotation.y=Math.sin(clamp(phaseTime/1.9,0,1)*Math.PI*2)*.14;bossModel.scale.set(1+Math.sin(phaseTime*9)*.04,1,1);
      if(phaseTime>1.9){bossPhase='fighting';phaseTime=0;attackClock=.3;bossModel.rotation.y=0;bossModel.scale.set(1,1,1);}
    }else if(bossPhase==='fighting'){
      attackClock+=dt;
      if(attackClock>4.0&&player.position.distanceTo(bossPosition)<18){attackClock=0;startAttack();}
      bossModel.position.y=arenaY+Math.sin(clock*2)*.06;
      body.rotation.z=Math.sin(clock*1.3)*.025;
    }else if(bossPhase==='defeated'){
      const u=clamp(phaseTime/2.15,0,1);bossModel.position.set(29+u*28,arenaY+Math.sin(u*Math.PI)*13-u*10,-44+u*23);bossModel.rotation.z=u*3.2;bossModel.rotation.x=u*1.4;bossModel.visible=u<1;
      shine.visible=phaseTime>1.3&&!shineCollected;shine.position.y=arenaY+2+Math.sin(clock*2.5)*.16;shine.rotation.y=clock*1.35;
      if(phaseTime>1.8&&!shineCollected&&Math.hypot(player.position.x-29,player.position.z+43)<2.1&&Math.abs(player.position.y-shine.position.y)<2.7){shineCollected=true;shine.visible=false;burst(shine.position,90,8);sound('shine');callbacks.win?.();}
    }
    for(let i=0;i<inkCoats.length;i++){const local=clamp(faceDirt*inkCoats.length-i,0,1);inkCoats[i].visible=local>0;inkCoats[i].scale.setScalar(.5+.5*local);}
    cork.visible=round===1&&bossPhase!=='defeated';
    animateTentacles(dt);drawGrabStrands();updateBalls(dt);
    for(const p of patches){
      if(p.cleared){p.fade=Math.max(0,p.fade-dt*2.4);p.mesh.scale.setScalar(Math.max(.001,p.fade));p.mesh.visible=p.fade>0;}
      else if(!shineCollected&&bossPhase!=='recovering'&&Math.hypot(player.position.x-p.x,player.position.z-p.z)<p.r*.56&&Math.abs(player.position.y-p.y)<.6&&player.grounded)harm(p.mesh.position);
    }
    for(const coin of coins){
      if(!coin.collected&&Math.hypot(player.position.x-coin.position.x,player.position.z-coin.position.z)<1.1&&Math.abs(player.position.y+.75-coin.position.y)<1.65){coin.collected=true;coinCount++;callbacks.pickup?.();sound('coin');burst(coin.position,6,2.5);}
      dummy.position.copy(coin.position);dummy.position.y+=Math.sin(clock*2.7+coin.index*.5)*.12;dummy.rotation.set(0,clock*1.25+coin.index*.2,0);dummy.scale.setScalar(coin.collected?0:1.05);dummy.updateMatrix();coinMesh.setMatrixAt(coin.index,dummy.matrix);
    }
    coinMesh.instanceMatrix.needsUpdate=true;
    for(let i=0;i<crumbs.length;i++){const p=crumbs[i];p.life-=dt;if(p.life>0){p.velocity.y-=14*dt;p.position.addScaledVector(p.velocity,dt);const floor=floorAt(p.position.x,p.position.z)+.08;if(p.position.y<floor){p.position.y=floor;p.velocity.y=Math.abs(p.velocity.y)*.13;p.velocity.x*=.9;p.velocity.z*=.9;}}dummy.position.copy(p.position);dummy.rotation.set(p.phase+clock*3,p.phase,clock*2);dummy.scale.setScalar(p.life>0?Math.min(1,p.life*3):0);dummy.updateMatrix();crumbMesh.setMatrixAt(i,dummy.matrix);}crumbMesh.instanceMatrix.needsUpdate=true;
    updatePresentation();previousFeetY=player.position.y;previousVy=player.velocity.y;
  }
  function spray(origin,direction,dt){
    if(shineCollected)return;dt=clamp(dt,0,.05);const dir=direction.clone().normalize(),horizontal=Math.hypot(dir.x,dir.z);
    for(const p of patches){if(p.cleared)continue;const dx=p.x-origin.x,dz=p.z-origin.z,d=Math.hypot(dx,dz),dot=(dx*dir.x+dz*dir.z)/(Math.max(.001,d*horizontal));if(d<17&&Math.abs(p.y-origin.y)<4.5&&(dot>.79||d<1.3)){p.health-=dt*(1.4-d*.04);if(p.health<=0)clearPatch(p);}}
    if(bossPhase!=='fighting')return;
    aTmp.copy(mouthAnchor).sub(origin);const d=aTmp.length();
    if(d<22&&aTmp.normalize().dot(dir)>.78){
      faceDirt=Math.max(0,faceDirt-dt*.95);lastFaceContact=clock;
      if(faceDirt<=.025&&!faceClean){faceClean=true;faceDirt=0;message(round===1?'Face clean! Flatten the arms, then hold G at the cork and pull away.':'Face clean! Pull the mouth back and release for the final hit.');sound('clean');attackClock=Math.max(attackClock,3.15);}
    }
  }
  function reset(){
    bossPhase='hidden';bossHP=2;round=1;faceDirt=1;faceClean=false;cleaned=0;coinCount=0;shineCollected=false;
    clock=phaseTime=inkClock=damageCooldown=grabCooldown=wave=0;attackClock=1.8;grab=null;grabLatch=false;playerRef=null;previousFeetY=arenaY;previousVy=0;invalidToastAt=-10;lastFaceContact=-10;arenaAnnounced=false;
    stage='harbor';interactionPrompt='';goalPosition.set(-32,4.4,18);aimTarget.copy(mouthAnchor);
    bossModel.visible=false;bossModel.position.copy(bossPosition);bossModel.scale.set(1,1,1);bossModel.rotation.set(0,0,0);body.rotation.z=0;mouth.position.set(0,2.22,2.65);cork.visible=true;
    for(const c of crates){c.group.visible=true;c.group.position.copy(c.start);c.group.rotation.set(0,0,0);c.group.scale.set(1,1,1);}
    tentacles.forEach(resetTentacle);patches.forEach(p=>{p.cleared=false;p.health=.75;p.fade=1;p.mesh.visible=true;p.mesh.scale.set(1,1,1);});coins.forEach(c=>c.collected=false);crumbs.forEach(c=>c.life=0);inkBalls.forEach(b=>{b.active=false;b.mesh.visible=false;});inkCoats.forEach(c=>{c.visible=true;c.scale.set(1,1,1);});shine.visible=false;shine.position.set(29,arenaY+2,-43);setBodyCollision('crates');drawGrabStrands();updatePresentation();
  }
  function cancelInteraction(){
    // Checkpoint travel is not a physical pull. Release the held pasta before
    // moving the player, and require a fresh G press for the next interaction.
    if(grab)releaseGrab(false,true);
    grabLatch=true;grabCooldown=.3;cratePullTarget.copy(crateTip);drawGrabStrands();updatePresentation();
  }
  function getState(){return {bossPhase,bossHP,open:faceClean&&bossPhase==='fighting',cleaned,totalPollution:patches.length,coins:coinCount,shineCollected,bossPosition,goalPosition,stage,round,faceClean,grabbing:grab?.kind||null,pullTension:grab?.tension||0,interactionPrompt,bossName:'GOOPER BLOOPER',objective,subobjective,area,aimTarget,tentacles:tentacles.map(t=>({index:t.index,tip:t.tip,state:t.state,flattenedFor:t.state==='flattened'?t.timer:0})),faceDirt};}
  reset();return {update,spray,reset,cancelInteraction,getState,coins,goalPosition};
}
