import * as THREE from '../vendor/three.module.js';
import {PlazaPastaBatch as Batch,V,TAU,circle,braid,packedDeck as deck,packedWall as wall} from './plaza-geometry.js';
import {pastaBall} from './airstrip-world.js';
import {plazaRayClear} from './plaza-visibility.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const inRect=(x,z,r,pad=0)=>x>=r.x0-pad&&x<=r.x1+pad&&z>=r.z0-pad&&z<=r.z1+pad;

// The landmark mechanisms have their own state and collision. Washing changes
// individual pasta clumps, doors need Turbo impact, and the lighthouse slab
// only fractures after a genuinely powered downward landing.
export function createPlazaLandmarks(parent,M,base){
  const {landmarks,colliders,portals,roofs,addBox}=base,root=new THREE.Group();root.name='Delfino Plaza working pasta landmarks';parent.add(root);
  Object.assign(landmarks,{
    westBell:V(-23,17,-4),westBellShine:V(-23,4.2,-5),eastBell:V(23,18,-5),eastBellShine:V(23,29,-5),
    gateFace:V(0,17,-31.64),gateShine:V(0,30,-34.5),lighthousePad:V(36,18.3,20),lighthouseShine:V(36,27.6,20),
    birdIsland:V(57,1.2,65),birdShine:V(43,3.85,48),turboDoor:V(-23,3,1),turboShine:V(-23,4.2,-.4),
    chuckster:V(-16,11,-27),tossWindow:V(-9.25,13,-27),tossShine:V(-6,12.2,-27),
    hundredShine:V(-34.5,4.25,32),boathouse:V(-42,3,16),rocketBox:V(-9,3.9,5),turboBox:V(-9,3.9,1),
    turboTrackDoor:V(-3,3,-25),turboTrack:V(-3,4.2,-30),blueTurboDoor:V(13,3,-32.8),blueTurboCoin:V(13,4.2,-35.1),
    slidePipe:V(61,9.2,2),fieldPipe:V(-56,19.2,-43),eastBellBack:V(23,4.2,-8)
  });
  const staticBins=Object.fromEntries(['egg','cream','tomato','spinach','darkGreen','ink','gold','toasted','pale'].map(k=>[k,new Batch(M[k]||M.cream,{staticGeometry:true})]));
  const dirtyGeometry=new THREE.TorusGeometry(.20,.075,6,12),dirty=new THREE.InstancedMesh(dirtyGeometry,M.toasted,144),dummy=new THREE.Object3D();
  dirty.name='Individually washable cooked-pasta clumps';dirty.instanceMatrix.setUsage(THREE.DynamicDrawUsage);dirty.frustumCulled=false;dirty.castShadow=dirty.receiveShadow=true;root.add(dirty);
  const targets={},bells=[],doors=[],nozzleBoxes=[],extraGround=[];let clock=0,playerRef=null,lighthouseBroken=false,lighthouseAge=0,throwActive=false,throwAge=0,throwCount=0,windowBroken=false,windowHits=0,rocket=false,turbo=false;
  let dirtyIndex=0;

  function bell(id,x,z,top){
    const target={id,position:V(x,top-2,z),group:new THREE.Group(),angle:0,velocity:0,patches:[],complete:false};
    const gold=new Batch(M.gold),cream=new Batch(M.cream),dark=new Batch(M.ink);target.group.position.set(x,top-.3,z);root.add(target.group);
    for(const dx of[-1.65,1.65])for(const dz of[-1.65,1.65]){braid(staticBins.cream,V(x+dx,10,z+dz),V(x+dx,top,z+dz),.25,6);addBox(x+dx-.2,x+dx+.2,z+dz-.2,z+dz+.2,10,top,'bell tower column');}
    for(let k=0;k<12;k++){const t=k/11;gold.tube(circle(0,-2.6+t*2.35,0,1.23-t*.83,1.23-t*.83,32),.13,8);}
    braid(cream,V(0,-.3,0),V(0,.3,0),.12,4);braid(dark,V(0,-.4,0),V(0,-2.65,0),.075,3);pastaBall(gold,V(0,-2.55,0),.24,6);
    gold.finish(target.group,id+' curved pasta bell');cream.finish(target.group,id+' suspending noodles');dark.finish(target.group,id+' flexible clapper');
    deck(staticBins.tomato,x-2.1,x+2.1,z-2.1,z+2.1,top,.14);addBox(x-2.1,x+2.1,z-2.1,z+2.1,top-.32,top,'bell tower roof');
    // A scalloped border and a small dry-noodle finial leave a usable flat roof.
    for(let j=0;j<32;j++){const a=j/32*TAU;staticBins.cream.tube([V(x+Math.cos(a)*2.1,top-.2,z+Math.sin(a)*2.1),V(x+Math.cos(a)*2.2,top+.1,z+Math.sin(a)*2.2)],.085,7);}
    for(let k=0;k<4;k++)for(let j=0;j<10;j++){const y=-2.35+k*.48,r=1.15-k*.17,a=j/10*TAU;target.patches.push({index:dirtyIndex++,local:V(Math.cos(a)*r,y,Math.sin(a)*r),water:0,required:.5,clean:false,angle:a});}
    targets[id]=target;bells.push(target);return target;
  }
  bell('westBell',-23,-4,19);bell('eastBell',23,-5,20);
  const gate={id:'gate',position:landmarks.gateFace.clone(),group:new THREE.Group(),angle:0,patches:[],complete:false};gate.group.position.set(0,17,-31.88);root.add(gate.group);
  const gateGold=new Batch(M.gold),gateInk=new Batch(M.ink);for(let j=0;j<20;j++)gateGold.tube(circle(0,0,0,.15+j*.20,.15+j*.20,44).map(p=>V(p.x,p.z,0)),.125,7);
  for(let k=0;k<8;k++){const a=k/8*TAU,p=[];for(let j=0;j<=18;j++){const t=j/18,r=4.05+Math.sin(t*Math.PI)*1.15,ang=a+(t-.5)*.24;p.push(V(Math.cos(ang)*r,Math.sin(ang)*r,.03));}gateGold.tube(p,.17,7);}for(const x of[-1,1])gateInk.tube([V(x,-1,.2),V(x,1,.2)],.19,7);
  gateGold.finish(gate.group,'Shine Gate of wound golden spaghetti');gateInk.finish(gate.group,'Shine Gate ink-pasta face');
  for(let row=0;row<4;row++)for(let j=0;j<16;j++){const a=j/16*TAU,r=.65+row*.85;gate.patches.push({index:dirtyIndex++,local:V(Math.cos(a)*r,Math.sin(a)*r,.24),water:0,required:.16,clean:false,angle:a});}targets.gate=gate;

  function targetPoint(target,patch){const q=patch.local.clone();if(target.id==='gate')q.applyAxisAngle(V(0,0,1),target.angle);else q.applyAxisAngle(V(0,0,1),target.angle);return q.add(target.group.position);}
  function drawDirt(){for(const target of Object.values(targets))for(const p of target.patches){dummy.position.copy(targetPoint(target,p));dummy.rotation.set(target.id==='gate'?0:Math.PI/2,p.angle*.27,p.angle+target.angle);dummy.scale.setScalar(p.clean?0:1-clamp(p.water/p.required)*.55);dummy.updateMatrix();dirty.setMatrixAt(p.index,dummy.matrix);}dirty.instanceMatrix.needsUpdate=true;}
  function targetState(id,origin=playerRef?.position){
    const t=targets[id];if(!t)return null;
    const key=origin?`${clock}:${origin.x.toFixed(3)},${origin.y.toFixed(3)},${origin.z.toFixed(3)}:${t.revision??0}`:`${clock}:none:${t.revision??0}`;
    if(t.stateKey===key)return t.cachedState;
    const remaining=t.patches.filter(p=>!p.clean),nearby=!origin||origin.distanceToSquared(t.position)<24*24,viewpoint=nearby?origin?.clone().add(V(0,1.35,0)):null,visible=!nearby?[]:viewpoint?remaining.filter(p=>plazaRayClear(colliders,viewpoint,targetPoint(t,p))):remaining,closest=origin?visible.sort((a,b)=>targetPoint(t,a).distanceToSquared(origin)-targetPoint(t,b).distanceToSquared(origin))[0]:visible[0];
    t.stateKey=key;t.cachedState={id,cleaned:t.patches.length-remaining.length,total:t.patches.length,complete:t.complete,aimTarget:closest?targetPoint(t,closest):null,position:t.position.clone(),angle:t.angle,water:t.patches.reduce((n,p)=>n+p.water,0)};return t.cachedState;
  }
  function washTarget(id,origin,direction,dt){const t=targets[id];if(!t||t.complete||!Number.isFinite(dt)||dt<=0||direction.lengthSq()<1e-8)return targetState(id);if(id==='gate'&&origin.z<-31.9)return targetState(id);const dir=direction.clone().normalize();let selected=null,best=Infinity;
    for(const p of t.patches)if(!p.clean){const d=targetPoint(t,p).sub(origin),along=d.dot(dir);if(along<=0||along>22)continue;const perpendicular=d.addScaledVector(dir,-along).length(),radius=.25+along*.028;if(perpendicular>radius||!plazaRayClear(colliders,origin,targetPoint(t,p)))continue;const score=perpendicular+along*.0001;if(score<best){selected=p;best=score;}}
    if(selected){t.revision=(t.revision??0)+1;selected.water=Math.min(selected.required,selected.water+Math.min(dt,.05));if(selected.water>=selected.required-1e-7)selected.clean=true;if(id!=='gate')t.velocity+=Math.sign(selected.local.x||1)*dt*.14;t.complete=t.patches.every(p=>p.clean);drawDirt();}return targetState(id);
  }
  function restoreTarget(id){const t=targets[id];if(!t)return false;t.revision=(t.revision??0)+1;for(const p of t.patches){p.clean=true;p.water=p.required;}t.complete=true;drawDirt();return true;}

  function nozzleBox(mode,position){const g=new THREE.Group(),body=new Batch(mode==='rocket'?M.tomato:M.ink),trim=new Batch(M.cream),icon=new Batch(M.gold);for(let y=-.65;y<=.65;y+=.17)body.tube([V(-.65,y,-.65),V(.65,y,-.65),V(.65,y,.65),V(-.65,y,.65),V(-.65,y,-.65)],.105,7);deck(body,-.65,.65,-.65,.65,.7,.12);for(const z of[-.68,.68])trim.tube([V(-.5,-.4,z),V(0,.5,z),V(.5,-.4,z)],.075,7);if(mode==='rocket')braid(icon,V(0,.8,0),V(0,1.7,0),.15,4);else icon.tube([V(-.6,1.1,0),V(.6,1.1,0),V(.25,1.4,0),V(.6,1.1,0),V(.25,.8,0)],.10,7);body.finish(g,mode+' bundled-pasta nozzle box');trim.finish(g,mode+' pale-pasta bindings');icon.finish(g,mode+' physical nozzle symbol');g.position.copy(position);root.add(g);const item={mode,position:position.clone(),group:g};nozzleBoxes.push(item);return item;}
  nozzleBox('rocket',landmarks.rocketBox);nozzleBox('turbo',landmarks.turboBox);
  function unlockNozzle(mode){if(mode==='rocket'){const fresh=!rocket;rocket=true;return fresh;}if(mode==='turbo'){const fresh=!turbo;turbo=true;return fresh;}return false;}

  function makeDoor(id,position,width,height){const g=new THREE.Group(),left=new THREE.Group(),right=new THREE.Group(),panes=[left,right];g.position.copy(position);root.add(g);for(let side=0;side<2;side++){const p=panes[side],body=new Batch(M.toasted),bind=new Batch(M.cream),x=side?width/4:-width/4;for(let dx=-width/4+.05;dx<=width/4;dx+=.15)body.tube([V(dx,0,0),V(dx,height,0)],.09,7);for(const y of[.25,height*.5,height-.25])bind.tube([V(-width/4,y,.08),V(width/4,y,.08)],.075,7);bind.tube([V(-width/4,.25,.1),V(width/4,height-.25,.1)],.07,7);body.finish(p,id+' dry linguine door leaf');bind.finish(p,id+' braided bindings');p.position.x=x;g.add(p);}const collider={minX:position.x-width/2,maxX:position.x+width/2,minZ:position.z-.15,maxZ:position.z+.15,bottom:position.y,top:position.y+height,kind:'Plaza Turbo door'};colliders.push(collider);const door={id,position:position.clone(),width,height,group:g,panes,collider,broken:false,age:0,pressure:0};doors.push(door);return door;}
  makeDoor('turbo',landmarks.turboDoor,3.3,3.7);makeDoor('track',landmarks.turboTrackDoor,4,3.7);makeDoor('blue',landmarks.blueTurboDoor,2.45,3.8);
  function breakDoor(door){if(!door||door.broken)return false;door.broken=true;door.age=0;door.pressure=0;const at=colliders.indexOf(door.collider);if(at>=0)colliders.splice(at,1);return true;}
  function doorState(id){const d=doors.find(d=>d.id===id);return d?{id,broken:d.broken,age:d.age,pressure:d.pressure,position:d.position.clone()}:null;}

  // Upper tower behind the Chuckster. The front window is independently
  // breakable: a paid throw uses the normal controller's gravity/collisions.
  const tower={x0:-9.25,x1:-3.1,z0:-30.3,z1:-24.7};deck(staticBins.cream,tower.x0,tower.x1,tower.z0,tower.z1,11,.14);addBox(tower.x0,tower.x1,tower.z0,tower.z1,10.7,11,'Chuckster tower floor');
  for(const z of[tower.z0,tower.z1]){wall(staticBins.pale,V(tower.x0,11,z),V(tower.x1,11,z),5);addBox(tower.x0,tower.x1,z-.13,z+.13,11,16,'Chuckster tower side');}wall(staticBins.pale,V(tower.x1,11,tower.z0),V(tower.x1,11,tower.z1),5);addBox(tower.x1-.13,tower.x1+.13,tower.z0,tower.z1,11,16,'Chuckster tower rear');
  for(const [z0,z1]of[[tower.z0,-29.2],[-24.8,tower.z1]]){wall(staticBins.pale,V(tower.x0,11,z0),V(tower.x0,11,z1),5);addBox(tower.x0-.13,tower.x0+.13,z0,z1,11,16,'Chuckster window frame');}
  wall(staticBins.pale,V(tower.x0,15.6,tower.z0),V(tower.x0,15.6,tower.z1),.4);addBox(tower.x0-.13,tower.x0+.13,tower.z0,tower.z1,15.6,16,'Chuckster window lintel');
  const windowGroup=new THREE.Group(),windowPasta=new Batch(M.cream);for(let y=11.2;y<15.5;y+=.25)windowPasta.tube([V(-9.3,y,-29.2),V(-9.3,y,-24.8)],.075,7);for(let z=-29.1;z<=-24.9;z+=.35)windowPasta.tube([V(-9.3,11.2,z),V(-9.3,15.5,z)],.07,7);windowPasta.finish(windowGroup,'Breakable wafer-pasta tower window');root.add(windowGroup);const windowCollider=addBox(-9.4,-9.15,-29.2,-24.8,11,15.6,'Chuckster breakable window');
  const pset=Object.fromEntries(['egg','cream','tomato','spinach','toasted','gold','ink'].map(k=>[k,staticBins[k]]));base.pianta(pset,-16,11,-27,'tomato',1.05);
  function throwPlayer(player){if(!player||throwActive||!player.grounded||Math.hypot(player.position.x+16,player.position.z+27)>2.7||Math.abs(player.position.y-11)>.55)return false;const direction=V(-16-player.position.x,0,-27-player.position.z);if(direction.lengthSq()<.04)direction.set(1,0,0);direction.normalize();player.velocity.set(0,0,0);player.impulse(direction.multiplyScalar(34).add(V(0,11.2,0)));player.grounded=false;throwActive=true;throwAge=0;throwCount++;player.onJump?.(1);return true;}
  function smashWindow(){if(windowBroken)return;windowBroken=true;windowHits++;windowGroup.visible=false;const at=colliders.indexOf(windowCollider);if(at>=0)colliders.splice(at,1);}
  function getThrowState(){return{active:throwActive,age:throwAge,throws:throwCount,windowBroken,windowHits};}

  // The lighthouse crown is a flat usable roof. Its scorched pasta slab has a
  // real contact surface and leaves fragments under gravity after impact.
  deck(staticBins.tomato,33.1,38.9,17.1,22.9,18,.14);addBox(33.1,38.9,17.1,22.9,17.7,18,'lighthouse crown');
  for(let j=0;j<18;j++){const a=j/18*TAU;braid(staticBins.cream,V(36+Math.cos(a)*2.9,16.8,20+Math.sin(a)*2.9),V(36+Math.cos(a)*2.9,18.05,20+Math.sin(a)*2.9),.08,3);}
  const slab=new THREE.Group(),slabBatch=new Batch(M.ink),flame=new Batch(M.tomato);deck(slabBatch,-2.05,2.05,-2.05,2.05,.3,.13);for(let j=0;j<5;j++){const x=(j-2)*.25;flame.tube([V(x-.18,.44,-.6),V(x+.22,.44,.1),V(x-.02,.44,.85)],.085,7);}slabBatch.finish(slab,'Scorched dry-pasta lighthouse slab');flame.finish(slab,'Tomato-noodle flame emblem');slab.position.set(36,18,20);root.add(slab);const slabCollider=addBox(33.95,38.05,17.95,22.05,18,18.3,'Rocket ground-pound slab');
  const slabFragments=new THREE.InstancedMesh(new THREE.CylinderGeometry(.10,.10,1,7),M.ink,32);slabFragments.name='Ballistic fractured lighthouse spaghetti';slabFragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);slabFragments.frustumCulled=false;slabFragments.castShadow=true;root.add(slabFragments);
  function breakLighthouse(impact){if(lighthouseBroken||!impact?.rocketPowered||impact.dropHeight<7.5||impact.impactSpeed<25||Math.hypot(impact.x-36,impact.z-20)>2.25||Math.abs(impact.y-18.3)>.45)return false;lighthouseBroken=true;lighthouseAge=0;slab.visible=false;const at=colliders.indexOf(slabCollider);if(at>=0)colliders.splice(at,1);return true;}

  // A moving bird made of tightly coiled egg pasta, with damped wing hinges.
  const bird=new THREE.Group(),birdBody=new Batch(M.gold),birdBeak=new Batch(M.toasted),birdEye=new Batch(M.ink);pastaBall(birdBody,V(),.35,11,V(.9,.9,1.4));pastaBall(birdBody,V(0,.3,.36),.23,9);birdBeak.tube([V(0,.25,.53),V(0,.25,.84)],.07,7);for(const x of[-.12,.12])birdEye.tube([V(x,.38,.5),V(x,.44,.48)],.035,6);birdBody.finish(bird,'Golden-pasta bird body');birdBeak.finish(bird,'Toasted spaghetti beak');birdEye.finish(bird,'Ink-pasta bird eyes');const wings=[];for(const side of[-1,1]){const wing=new THREE.Group(),wingBatch=new Batch(M.gold);for(let k=0;k<6;k++)wingBatch.tube([V(side*.2,0,k*.06-.2),V(side*(.6+k*.05),.08,-.15),V(side*(.8+k*.04),.04,-.55)],.055,7);wingBatch.finish(wing,'Flexible golden vermicelli flight feathers');bird.add(wing);wings.push({group:wing,side,angle:0,velocity:0});}root.add(bird);
  const birdPosition=V(61,5,65),birdVelocity=V();let birdHits=0,birdWet=0,birdCooldown=0,birdComplete=false;
  function sprayBird(origin,direction,dt){if(birdComplete||birdCooldown>0||dt<=0||!Number.isFinite(dt)||direction.lengthSq()<1e-8)return getBirdState();const dir=direction.clone().normalize(),delta=birdPosition.clone().sub(origin),along=delta.dot(dir);if(along>0&&along<14&&delta.addScaledVector(dir,-along).length()<.65&&plazaRayClear(colliders,origin,birdPosition)){birdWet+=Math.min(dt,.05);birdVelocity.addScaledVector(dir,dt*1.4);if(birdWet>=.16){birdWet=0;birdHits++;birdCooldown=.65;if(birdHits>=3){birdComplete=true;bird.visible=false;}}}else birdWet=Math.max(0,birdWet-dt*.25);return getBirdState();}
  function getBirdState(){return{position:birdPosition.clone(),velocity:birdVelocity.clone(),hits:birdHits,maxHits:3,cooldown:birdCooldown,wet:birdWet,complete:birdComplete,defeated:birdComplete};}

  // Remaining secret entrances are part of the physical Plaza. Their courses
  // have their own loaders, but reaching these pipes still takes traversal.
  function pipe(position,label){for(let y=-1.1;y<=.25;y+=.15)staticBins.spinach.tube(circle(position.x,position.y+y,position.z,.9,.9,30),.11,7);for(let j=0;j<3;j++)staticBins.cream.tube(circle(position.x,position.y+.2+j*.1,position.z,1.12,1.12,30),.1,7);}
  for(const [x,z,y,r]of[[39,-11,2,2.8],[47,-7,4,2.8],[55,-3,6,2.8],[61,2,8,3.4]]){const rect={x0:x-r*.78,x1:x+r*.78,z0:z-r*.78,z1:z+r*.78,y};extraGround.push(rect);for(let h=-.7;h<y;h+=.3)staticBins.toasted.tube(circle(x,h,z,r,r,32),.18,7);deck(staticBins.egg,rect.x0,rect.x1,rect.z0,rect.z1,y,.15);addBox(rect.x0,rect.x1,rect.z0,rect.z1,-1,y,'offshore secret pillar');}
  const cliff={x0:-61,x1:-50,z0:-49,z1:-27,y:18};extraGround.push(cliff);deck(staticBins.egg,cliff.x0,cliff.x1,cliff.z0,cliff.z1,18,.18);for(const x of[cliff.x0,cliff.x1])wall(staticBins.toasted,V(x,-.5,cliff.z0),V(x,-.5,cliff.z1),18.3,.22);for(const z of[cliff.z0,cliff.z1])wall(staticBins.toasted,V(cliff.x0,-.5,z),V(cliff.x1,-.5,z),18.3,.22);addBox(cliff.x0,cliff.x1,cliff.z0,cliff.z1,-1,18,'northwest secret cliff');
  pipe(landmarks.slidePipe,'Super Slide');pipe(landmarks.fieldPipe,'Red Coin Field');braid(staticBins.toasted,V(-53,18,-30),V(-54,25,-31),.32,7);for(let k=0;k<8;k++){const a=k/8*TAU;for(let v=0;v<3;v++)staticBins.spinach.tube([V(-54,25,-31),V(-54+Math.cos(a)*2,26,-31+Math.sin(a)*2),V(-54+Math.cos(a)*4,24,-31+Math.sin(a)*4+v*.11)],.10,7);}
  portals.push({id:'slide',episode:1,position:landmarks.slidePipe.clone(),label:'SUPER SLIDE',kind:'pipe'},{id:'field',episode:1,position:landmarks.fieldPipe.clone(),label:'RED COIN FIELD',kind:'pipe'},{id:'turbo',episode:1,position:landmarks.turboTrack.clone(),label:'TURBO TRACK',kind:'door',get enabled(){return doors.find(d=>d.id==='track').broken;}});

  // A supported service cornice in front of the gate makes sustained
  // cleaning possible without standing on a capsule-width roof edge.
  deck(staticBins.cream,-2.5,8,-32.2,-27.5,12,.14);addBox(-2.5,8,-32.2,-27.5,11.65,12,'Shine Gate service cornice');landmarks.gateWashLedge=V(4,12,-28);
  for(const x of[-2.3,7.8])for(let k=0;k<3;k++)staticBins.toasted.tube([V(x+k*.09,10.3,-33),V(x+k*.09,11,-30.5),V(x+k*.09,11.85,-27.6)],.14,7);

  // Small modeled details distinguish facades without a texture painted onto
  // boxes: shell-like cornices, bundled downpipes, and curved pasta roof tiles.
  for(const r of roofs){for(const z of[r.z0-.27,r.z1+.27]){staticBins.cream.tube([V(r.x0-.3,r.y-.25,z),V(r.x1+.3,r.y-.25,z)],.12,7);for(let x=r.x0+.5;x<r.x1;x+=1.2){const p=[];for(let k=0;k<=8;k++){const a=k/8*Math.PI;p.push(V(x+Math.cos(a)*.42,r.y+.13+Math.sin(a)*.10,z));}staticBins.tomato.tube(p,.065,7);}}for(const x of[r.x0-.17,r.x1+.17])braid(staticBins.toasted,V(x,3.15,r.z0),V(x,r.y-.2,r.z0),.07,3);}
  for(const [key,b]of Object.entries(staticBins))b.finish(root,'Plaza landmark '+key+' pasta');

  function restoreBarrier(id){if(id==='lighthouse'){lighthouseBroken=true;lighthouseAge=9;slab.visible=false;const at=colliders.indexOf(slabCollider);if(at>=0)colliders.splice(at,1);return true;}if(id==='window'||id==='toss'){smashWindow();return true;}if(id==='bird'){birdHits=3;birdComplete=true;bird.visible=false;return true;}return breakDoor(doors.find(d=>d.id===id));}
  function update(dt,time,player){clock=time;playerRef=player||playerRef;
    for(const b of bells){b.velocity+=(-7.2*Math.sin(b.angle)-1.25*b.velocity+Math.sin(clock*1.3+b.position.x)*.018)*dt;b.angle+=b.velocity*dt;b.group.rotation.z=b.angle;}
    gate.angle=gate.complete?Math.sin(clock*.35)*.025:0;gate.group.rotation.z=gate.angle;drawDirt();
    for(const box of nozzleBoxes){const unlocked=box.mode==='rocket'?rocket:turbo;box.group.rotation.y=Math.sin(clock*.5)*.025;box.group.position.y=box.position.y+(unlocked?-.10:Math.sin(clock*1.8)*.03);}
    for(const d of doors){if(!d.broken&&player){const dx=Math.abs(player.position.x-d.position.x),dz=d.position.z-player.position.z,forward=Math.cos(player.heading),vertical=player.position.y<d.position.y+d.height&&player.position.y+1.9>d.position.y,across=dx<d.width/2+.25;
        const strike=player.turboActive&&across&&vertical&&player.speed>9&&Math.abs(player.velocity.z)>7&&dz*player.velocity.z>0&&Math.abs(dz)<.5+Math.abs(player.velocity.z)*dt;
        const pressing=player.turboActive&&across&&vertical&&Math.abs(dz)<.65&&dz*forward>0&&Math.abs(forward)>.65;d.pressure=pressing?d.pressure+dt:Math.max(0,d.pressure-dt*2);if(strike||d.pressure>=.22)breakDoor(d);}
      if(d.broken){d.age+=dt;d.group.visible=d.age<2.2;for(let j=0;j<2;j++){d.panes[j].rotation.x=Math.min(Math.PI*.54,d.age*2.5);d.panes[j].rotation.z=(j?1:-1)*Math.min(.6,d.age*.45);d.panes[j].position.y=Math.max(-.25,Math.min(.3,d.age*1.5)-4*d.age*d.age);}}}
    if(throwActive&&player){throwAge+=dt;const nextX=player.position.x+player.velocity.x*dt;if(!windowBroken&&player.velocity.x>6&&player.position.x<=-8.75&&nextX>=-9.85&&player.position.z>-29.1&&player.position.z<-24.9&&player.position.y>10.8&&player.position.y<14.0)smashWindow();if(throwAge>2.2||throwAge>.35&&player.grounded)throwActive=false;}
    if(lighthouseBroken)lighthouseAge+=dt;for(let j=0;j<32;j++){const a=j*2.399,t=lighthouseAge,active=lighthouseBroken&&t<2.6;dummy.position.set(36+Math.cos(a)*(t*2.1+.25),Math.max(18.05,18.5+(1+j%4)*t-8*t*t),20+Math.sin(a)*(t*2.1+.25));dummy.rotation.set(a+t*2,t*3,j*.7);dummy.scale.set(active?1:0,active?.6+j%5*.16:0,active?1:0);dummy.updateMatrix();slabFragments.setMatrixAt(j,dummy.matrix);}slabFragments.instanceMatrix.needsUpdate=true;
    birdCooldown=Math.max(0,birdCooldown-dt);if(!birdComplete){const theta=clock*.48,target=V(57+Math.cos(theta)*4,4.6+Math.sin(theta*1.7)*.8,65+Math.sin(theta)*4);birdVelocity.addScaledVector(target.sub(birdPosition),dt*4.5);birdVelocity.multiplyScalar(Math.exp(-2.6*dt));birdPosition.addScaledVector(birdVelocity,dt);bird.position.copy(birdPosition);if(birdVelocity.lengthSq()>.001)bird.rotation.y=Math.atan2(birdVelocity.x,birdVelocity.z);for(const w of wings){const goal=Math.sin(clock*10)*.55*w.side;w.velocity+=(goal-w.angle)*100*dt;w.velocity*=Math.exp(-9*dt);w.angle+=w.velocity*dt;w.group.rotation.z=w.angle;}}
  }
  function heightAt(x,z,reference){let h=-Infinity;for(const p of extraGround)if(inRect(x,z,p)&&reference>=p.y-.6)h=Math.max(h,p.y);return h;}
  function onExtraGround(x,z,y){return extraGround.some(p=>inRect(x,z,p)&&y>=p.y-.6);}
  function reset(){clock=0;playerRef=null;rocket=turbo=false;lighthouseBroken=false;lighthouseAge=0;throwActive=false;throwAge=throwCount=windowHits=0;windowBroken=false;windowGroup.visible=slab.visible=true;if(!colliders.includes(windowCollider))colliders.push(windowCollider);if(!colliders.includes(slabCollider))colliders.push(slabCollider);for(const t of Object.values(targets)){t.complete=false;t.stateKey=null;t.revision=0;t.angle=t.velocity=0;t.group.rotation.z=0;for(const p of t.patches){p.clean=false;p.water=0;}}for(const d of doors){d.broken=false;d.age=d.pressure=0;d.group.visible=true;for(const p of d.panes){p.rotation.set(0,0,0);p.position.y=0;}if(!colliders.includes(d.collider))colliders.push(d.collider);}birdHits=birdWet=birdCooldown=0;birdComplete=false;bird.visible=true;birdPosition.set(61,5,65);birdVelocity.set(0,0,0);wings.forEach(w=>{w.angle=w.velocity=0;});drawDirt();update(0,0,null);}
  function getState(){return{rocketUnlocked:rocket,turboUnlocked:turbo,nozzleBoxes:nozzleBoxes.map(b=>({mode:b.mode,position:b.position.clone(),unlocked:b.mode==='rocket'?rocket:turbo})),targets:Object.fromEntries(Object.keys(targets).map(id=>[id,targetState(id)])),doors:doors.map(d=>doorState(d.id)),turboDoorBroken:doorState('turbo').broken,turboTrackDoorBroken:doorState('track').broken,blueTurboDoorBroken:doorState('blue').broken,lighthouseBroken,bird:getBirdState(),throwState:getThrowState(),extraGround:extraGround.map(p=>({...p}))};}
  reset();return{root,update,reset,heightAt,onExtraGround,getState,get nozzleModes(){return['spray','hover',...(rocket?['rocket']:[]),...(turbo?['turbo']:[])];},api:{nozzleBoxes,birdPosition,washTarget,targetState,restoreTarget,setTargetComplete:restoreTarget,unlockNozzle,breakLighthouse,throwPlayer,getThrowState,sprayBird,getBirdState,restoreBarrier,restoreBird:()=>restoreBarrier('bird'),doorState},get lighthouseBroken(){return lighthouseBroken;},get turboDoorBroken(){return doorState('turbo').broken;},get turboTrackDoorBroken(){return doorState('track').broken;},get blueTurboDoorBroken(){return doorState('blue').broken;},get windowBroken(){return windowBroken;}};
}
