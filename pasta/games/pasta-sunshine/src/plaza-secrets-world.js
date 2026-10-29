import * as THREE from '../vendor/three.module.js';
import {CoronaBatch as Batch,V,TAU,clamp,line,circle,deck,braid} from './corona-geometry.js';
import {pastaBall as ball} from './airstrip-world.js';

const inRect=(x,z,r,pad=0)=>x>=r.x0-pad&&x<=r.x1+pad&&z>=r.z0-pad&&z<=r.z1+pad;
const mix=(a,b,t)=>a+(b-a)*t;
const palette=['egg','cream','tomato','spinach','darkGreen','ink','blue','gold','toasted','pale'];
function batches(M){return Object.fromEntries(palette.map(k=>[k,new Batch(M[k]||M.cream)]));}
function finish(b,group,label){for(const [key,batch] of Object.entries(b))batch.finish(group,label+' · '+key+' pasta');}
function pipe(b,x,y,z){for(let j=0;j<10;j++)b.spinach.tube(circle(x,y+j*.14,z,1.02,1.02,30),.11,6);for(let j=0;j<3;j++)b.cream.tube(circle(x,y+1.17+j*.1,z,1.22,1.22,30),.1,6);}
function slab(b,rect,yAt,color='cream',r=.15){
  for(let z=rect.z0;z<=rect.z1+.001;z+=r*1.88){const points=[];const n=Math.max(3,Math.ceil((rect.x1-rect.x0)/1.2));for(let j=0;j<=n;j++){const x=mix(rect.x0,rect.x1,j/n);points.push(V(x,yAt(x,z)-r,z));}b[color].tube(points,r,6);}
  for(const x of[rect.x0,rect.x1])for(let j=0;j<3;j++){const points=[];const n=Math.max(3,Math.ceil((rect.z1-rect.z0)/1.2));for(let k=0;k<=n;k++){const z=mix(rect.z0,rect.z1,k/n);points.push(V(x,yAt(x,z)-.18-j*.18,z));}b.toasted.tube(points,.12,6);}
  for(const z of[rect.z0,rect.z1])for(let j=0;j<3;j++)b.toasted.tube(line(V(rect.x0,yAt(rect.x0,z)-.18-j*.18,z),V(rect.x1,yAt(rect.x1,z)-.18-j*.18,z),Math.max(3,Math.ceil((rect.x1-rect.x0)/1.2)),.008),.12,6);
  for(let x=rect.x0+.3;x<rect.x1;x+=.65){const n=Math.max(4,Math.ceil((rect.z1-rect.z0)/2)),points=[];for(let j=0;j<=n;j++){const z=mix(rect.z0,rect.z1,j/n);points.push(V(x,yAt(x,z)-.42,z));}b.egg.tube(points,.085,5);}
}
function clouds(b,list){for(const [x,y,z,s]of list)for(let k=0;k<3;k++)ball(b.pale,V(x+(k-1)*s*.65,y+Math.sin(k*2)*s*.14,z),s*(k===1?1:.75),8,V(1,.48,.75));}
function pianta(M){const group=new THREE.Group(),b=batches(M);ball(b.gold,V(0,1.1,0),.65,13,V(1,1.25,.9));ball(b.egg,V(0,2.1,.05),.47,12);ball(b.egg,V(0,2,.52),.23,8);for(const s of[-1,1]){braid(b.gold,V(s*.5,1.6,0),V(s*.9,1,.25),.14,3);braid(b.toasted,V(s*.28,.6,0),V(s*.36,.12,.25),.16,3);b.ink.tube([V(s*.15,2.1,.48),V(s*.15,2.27,.45)],.05,6);}for(let k=0;k<7;k++){const a=k/7*TAU;b.spinach.tube([V(0,2.45,0),V(Math.sin(a)*.45,2.9,Math.cos(a)*.45),V(Math.sin(a)*.9,2.65,Math.cos(a)*.9)],.09,6);}finish(b,group,'Coiled-pasta Pianta');return group;}

// The slide is a continuous surface with actual holes and a split final lane.
// Supported dry strands supply the deck. The exposed edge strands respond to
// the rider's load; downhill motion is integrated from gravity and friction.
export function createSlideWorld(scene,materials){
  const group=new THREE.Group();group.name='Super Slide · woven pasta slope';scene.add(group);const b=batches(materials),colliders=[];
  const bounds={x0:-28,x1:28,z0:-184,z1:17},landmarks={spawn:V(0,40,8),exit:V(-5,40,7),shine:V(7,4.3,-172)};
  const holes=[{x0:-7,x1:-2.6,z0:-48,z1:-41},{x0:1.5,x1:5.7,z0:-53,z1:-47},{x0:-2.1,x1:1.6,z0:-60,z1:-54},{x0:-7.5,x1:-3,z0:-66,z1:-60},{x0:3,x1:7.5,z0:-72,z1:-66},{x0:-6.5,x1:-1,z0:-115,z1:-108},{x0:1.3,x1:6.5,z0:-124,z1:-118},{x0:-20,x1:20,z0:-132,z1:-128},{x0:-.8,x1:.8,z0:-153,z1:-136}];
  const ramps=[{d0:79,d1:83,height:1.25},{d0:90,d1:94,height:1.35},{d0:100,d1:104,height:1.25}];
  const blocks=[
    {d0:-12,d1:0,lo:-8,hi:8,color:'cream'},
    ...Array.from({length:5},(_,i)=>({d0:i*8,d1:(i+1)*8,lo:-8,hi:8,color:['tomato','gold','spinach','cream','blue'][i]})),
    {d0:40,d1:74,lo:-8,hi:8,color:'egg'},
    {d0:74,d1:105,lo:-4,hi:4,color:'spinach'},
    {d0:105,d1:134,lo:-7,hi:7,color:'gold'},
    {d0:134,d1:154,lo:-3.2,hi:3.2,color:'tomato'},
    {d0:154,d1:164,lo:1.1,hi:2.9,color:'cream'},
    {d0:164,d1:178,lo:-5,hi:10,color:'spinach'}
  ];
  function baseHeight(d){return d<0?40:d<164?40-d*37/164:3;}
  function rampHeight(d){let h=0;for(const r of ramps)if(d>=r.d0&&d<=r.d1)h+=(d-r.d0)/(r.d1-r.d0)*r.height;return h;}
  function rawHeight(x,z){const d=-z;return baseHeight(d)+rampHeight(d);}
  function surface(x,z){const d=-z,block=blocks.find(p=>d>=p.d0&&d<=p.d1&&x>=p.lo&&x<=p.hi);if(!block||holes.some(h=>inRect(x,z,h)))return null;return{height:x>=5.5&&x<=8.5&&z>=-173.5&&z<=-170.5?3.2:rawHeight(x,z),block};}
  // Separate contiguous strips leave true empty apertures in the mesh.
  for(const [index,p]of blocks.entries()){
    for(let z=-p.d1;z<=-p.d0+.001;z+=.285){const cuts=holes.filter(h=>z>=h.z0&&z<=h.z1).map(h=>[Math.max(p.lo,h.x0),Math.min(p.hi,h.x1)]).filter(a=>a[1]>a[0]).sort((a,c)=>a[0]-c[0]);let from=p.lo;for(const [a,c]of [...cuts,[p.hi,p.hi]]){if(a>from+.05){const n=Math.max(3,Math.ceil((a-from)/1.2)),points=[];for(let j=0;j<=n;j++)points.push(V(mix(from,a,j/n),rawHeight(0,z)-.15,z));b[p.color].tube(points,.155,6);if(index%2===0)b.toasted.tube(points.map(q=>q.clone().add(V(0,-.28,0))),.09,5);}from=Math.max(from,c);}
    }
    for(const x of[p.lo,p.hi]){const points=[];for(let d=p.d0;d<=p.d1;d+=.5)points.push(V(x,rawHeight(x,-d)-.12,-d));points.push(V(x,rawHeight(x,-p.d1)-.12,-p.d1));b.cream.tube(points,.13,6);}
    for(const d of[p.d0,p.d1])if(!holes.some(h=>-d>=h.z0&&-d<=h.z1&&h.x0<=p.lo&&h.x1>=p.hi))b.toasted.tube(line(V(p.lo,rawHeight(0,-d)-.45,-d),V(p.hi,rawHeight(0,-d)-.45,-d),12,.005),.14,6);
  }
  const hiddenLedge={x0:-7.5,x1:-2.1,z0:-49,z1:-40,y:baseHeight(45)-3.8};slab(b,hiddenLedge,()=>hiddenLedge.y,'toasted',.13);
  // A tiny block in the finish corner carries the physical Shine.
  const goalBlock={minX:5.5,maxX:8.5,minZ:-173.5,maxZ:-170.5,bottom:3,top:3.2,kind:'shine-block'};colliders.push(goalBlock);slab(b,{x0:5.5,x1:8.5,z0:-173.5,z1:-170.5},()=>3.2,'cream',.12);
  pipe(b,-5,40,7);for(let j=0;j<4;j++)b.gold.tube([V(-.6,40.04,1+j*1.1),V(0,40.04,.45+j*1.1),V(.6,40.04,1+j*1.1)],.06,6);
  clouds(b,[[-19,32,-21,3],[18,26,-60,4],[-16,8,-127,3],[17,-4,-174,4]]);finish(b,group,'Super Slide');
  // Weighted viscoelastic noodles along the opening's lip, independent from
  // the rigid support strands. They spring back rather than following a sine.
  const lipGeometry=new THREE.CylinderGeometry(.085,.085,1,5,1),lipMesh=new THREE.InstancedMesh(lipGeometry,materials.cream,24),dummy=new THREE.Object3D(),up=V(0,1,0);lipMesh.name='Load-bending spaghetti slide lip';lipMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);lipMesh.castShadow=true;lipMesh.frustumCulled=false;group.add(lipMesh);const lipNodes=Array.from({length:25},(_,i)=>({base:V(-8+i*2/3,39.82,0),y:39.82,v:0}));
  let playerRef=null,jumpWas=false,rocketLatched=false,hoverTime=0,airTime=0,distance=0,peakSpeed=0,rampLaunches=0,slides=0;
  function heightAt(x,z){const s=surface(x,z);if(s)return s.height;if(inRect(x,z,hiddenLedge))return hiddenLedge.y;return -60;}
  function update(dt,time,player){playerRef=player;dt=clamp(Number.isFinite(dt)?dt:0,0,.05);for(let i=0;i<lipNodes.length;i++){const n=lipNodes[i],load=player&&Math.abs(player.position.z)<1.25?Math.exp(-(((n.base.x-player.position.x)/1.1)**2))*.12:0;n.v+=((n.base.y-load-n.y)*65-n.v*9)*dt;n.y+=n.v*dt;}for(let i=0;i<24;i++){const a=lipNodes[i],c=lipNodes[i+1],p=V(a.base.x,a.y,0),q=V(c.base.x,c.y,0),delta=q.clone().sub(p);dummy.position.copy(p).lerp(q,.5);dummy.quaternion.setFromUnitVectors(up,delta.clone().normalize());dummy.scale.set(1,delta.length(),1);dummy.updateMatrix();lipMesh.setMatrixAt(i,dummy.matrix);}lipMesh.instanceMatrix.needsUpdate=true;}
  function controlPlayer(player,dt,input){
    const p=player.position,v=player.velocity,before=p.clone(),oldSurface=surface(p.x,p.z)||(inRect(p.x,p.z,hiddenLedge)?{height:hiddenLedge.y,hidden:true}:null),onSurface=!!oldSurface&&Math.abs(p.y-oldSurface.height)<.16&&v.y<=1.1;
    const yaw=input.cameraYaw??Math.PI,f=input.forward||0,r=input.right||0,dx=Math.sin(yaw)*f-Math.cos(yaw)*r,dz=Math.cos(yaw)*f+Math.sin(yaw)*r,magnitude=Math.max(1,Math.hypot(dx,dz)),moveX=dx/magnitude,moveZ=dz/magnitude,d=-p.z;
    player.grounded=onSurface;if(onSurface)p.y=oldSurface.height;player.nozzleEnabled=true;player.wet=false;player.groundPounding=false;player.groundPoundImpact=null;
    const turboRequested=player.nozzle==='turbo'&&input.spray&&!input.grab&&player.tank>0;player.turboCharge=turboRequested?Math.min(.35,player.turboCharge+dt):0;player.turboActive=!!turboRequested&&player.turboCharge>=.35;
    const slopeActive=onSurface&&!oldSurface.hidden&&d>=0&&d<164;
    if(onSurface){hoverTime=airTime=0;if(slopeActive){const eps=.035,gy=(rawHeight(p.x,p.z+eps)-rawHeight(p.x,p.z-eps))/(2*eps),normal=V(0,1,-gy).normalize();const gravity=V(0,-22,0).addScaledVector(normal,22*normal.y);v.x+=moveX*15*dt;v.z+=gravity.z*dt+moveZ*2.7*dt;const friction=Math.exp(-dt*(input.grab||input.slide||input.flop?1.9:.085));v.x*=Math.exp(-dt*1.6);v.z*=friction;v.z=clamp(v.z,player.turboActive?-22:-21,5);v.y=gy*v.z;slides++;}else{if(!player.turboActive){v.x+=(moveX*7.5-v.x)*(1-Math.exp(-dt*13));v.z+=(moveZ*7.5-v.z)*(1-Math.exp(-dt*13));}v.y=0;}}
    else{v.x+=moveX*5*dt;v.x*=Math.exp(-dt*.8);v.z+=moveZ*1.3*dt;v.y-=22*dt;airTime+=dt;}
    if(player.turboActive){const tx=Math.hypot(moveX,moveZ)>.08?moveX:Math.sin(yaw),tz=Math.hypot(moveX,moveZ)>.08?moveZ:Math.cos(yaw),grip=1-Math.exp(-dt*(onSurface?4.5:2.4));v.x+=(tx*22-v.x)*grip;v.z+=(tz*22-v.z)*grip;player.tank=Math.max(0,player.tank-8*dt);}
    let launched=false;if(input.jump&&!jumpWas&&onSurface){v.y=10.4;player.grounded=false;player.onJump?.(0);airTime=0;launched=true;}jumpWas=!!input.jump;
    if(!input.spray||player.nozzle!=='rocket'){player.rocketCharge=0;rocketLatched=false;}
    if(player.nozzle==='rocket'&&input.spray&&!input.grab&&!rocketLatched&&player.tank>=20){player.rocketCharge=Math.min(1,player.rocketCharge+dt);if(player.rocketCharge>=1){player.tank-=20;v.y=24;player.grounded=false;player.rocketPowered=true;player.rocketCharge=0;rocketLatched=true;hoverTime=airTime=0;launched=true;player.onJump?.(2);}}
    player.hovering=player.nozzle==='hover'&&input.jumpHeld&&!player.grounded&&airTime>.12&&hoverTime<2.4-1e-8&&player.tank>0;
    if(player.hovering){const use=Math.min(dt,2.4-hoverTime,player.tank/12);v.y+=(1-v.y)*(1-Math.exp(-use*7));hoverTime=Math.min(2.4,hoverTime+use);player.tank=Math.max(0,player.tank-12*use);}
    player.spraying=!!input.spray&&player.nozzle==='spray'&&player.tank>0&&!input.grab;if(player.spraying)player.tank=Math.max(0,player.tank-5.8*dt);
    p.addScaledVector(v,dt);distance+=Math.hypot(p.x-before.x,p.z-before.z);let floor=heightAt(p.x,p.z);const crossedRamp=ramps.find(a=>-before.z<=a.d1&&-p.z>a.d1&&-before.z>=a.d0&&onSurface&&v.z<-4&&!launched);
    if(crossedRamp){v.y=Math.max(5.7,-v.z*.34);player.grounded=false;rampLaunches++;}
    const nextSurface=surface(p.x,p.z),canFollow=slopeActive&&nextSurface&&Math.abs(nextSurface.height-before.y)<1.2&&!crossedRamp&&!launched;
    if(canFollow){p.y=nextSurface.height;player.grounded=true;}
    else if(p.y<=floor+.045&&v.y<=0){const impact=-v.y;p.y=floor;v.y=0;player.grounded=true;player.rocketPowered=false;hoverTime=airTime=0;if(impact>3)player.onLand?.(impact);}
    else player.grounded=false;
    player.speed=Math.hypot(v.x,v.z);peakSpeed=Math.max(peakSpeed,player.speed);const wanted=(player.spraying?yaw:player.speed>.2?Math.atan2(v.x,v.z):player.heading),delta=Math.atan2(Math.sin(wanted-player.heading),Math.cos(wanted-player.heading));player.turnVelocity=delta/dt;player.heading+=delta*(1-Math.exp(-dt*10));player.ragdoll=slopeActive&&!input.jump;player.floor=floor;player.airTime=airTime;
    if(p.y<-20||!Number.isFinite(p.length()+v.length()))player.onFall?.();return true;
  }
  function reset(){jumpWas=rocketLatched=false;hoverTime=airTime=distance=peakSpeed=rampLaunches=slides=0;for(const n of lipNodes){n.y=n.base.y;n.v=0;}}
  function resetMotion(){jumpWas=rocketLatched=false;hoverTime=airTime=0;}
  return{group,courseId:'slide',mode:'slide',episode:1,bounds,colliders,landmarks,holes,ramps,blocks,heightAt,update,reset,resetMotion,controlPlayer,nozzleAllowed:true,nozzleModes:['spray','hover','rocket','turbo'],preciseGroundPound:false,surfaceAt:(x,z)=>heightAt(x,z)>-30?'pasta':'void',refillAt:()=>false,
    get mapData(){return{route:[landmarks.spawn,V(0,40,0),V(4,22,-80),V(2,6,-150),landmarks.shine],platforms:blocks.map(p=>({x:(p.lo+p.hi)/2,z:-(p.d0+p.d1)/2,w:p.hi-p.lo,d:p.d1-p.d0,y:baseHeight((p.d0+p.d1)/2),stable:true}))};},
    getState(){return{distance,peakSpeed,rampLaunches,slides,hoverTime,lipNodes:lipNodes.map(n=>[n.base.x,n.y,n.base.z]),onSlide:!!playerRef&&playerRef.position.z<0&&playerRef.position.z>-164};}}
}

export function createTurboWorld(scene,materials){
  const group=new THREE.Group();group.name='Turbo Track · floating pasta runways';scene.add(group);const b=batches(materials),colliders=[],bounds={x0:-20,x1:20,z0:-193,z1:17};
  const landmarks={spawn:V(0,6,7),exit:V(-5.8,6,7),refill:V(0,6,5),shine:V(0,11.2,-181)};
  const platforms=[{d0:-12,d1:18,w:16,y0:6,y1:6},{d0:32,d1:51,w:10,y0:6,y1:6},{d0:65,d1:81,w:10,y0:6,y1:6},{d0:96,d1:111,w:10,y0:6,y1:6},{d0:124,d1:146,w:10,y0:6,y1:10},{d0:158,d1:164,w:7,y0:10,y1:10},{d0:176,d1:188,w:10,y0:10,y1:10}];
  for(const [i,p]of platforms.entries()){
    const yAt=(x,z)=>mix(p.y0,p.y1,clamp((-z-p.d0)/(p.d1-p.d0))),r={x0:-p.w/2,x1:p.w/2,z0:-p.d1,z1:-p.d0};slab(b,r,yAt,'spinach',.16);
    for(let x=-p.w/2;x<=p.w/2;x+=.58){const points=[];for(let j=0;j<=Math.ceil((p.d1-p.d0)/1.2);j++){const d=mix(p.d0,p.d1,j/Math.ceil((p.d1-p.d0)/1.2));points.push(V(x,mix(p.y0,p.y1,(d-p.d0)/(p.d1-p.d0))-.32,-d));}b.cream.tube(points,.13,6);}
    for(let d=p.d0+2;d<p.d1-1;d+=3.5){const y=yAt(0,-d)+.025;b.pale.tube([V(-.8,y,-d+.5),V(0,y,-d-.15),V(.8,y,-d+.5)],.065,6);}
    for(const x of[-p.w/2+.2,p.w/2-.2]){const pts=[];for(let j=0;j<=20;j++){const t=j/20,z=-mix(p.d0,p.d1,t);pts.push(V(x,yAt(x,z)+.02,z));}b.gold.tube(pts,.08,6);}
    if(i===5){for(let j=0;j<3;j++)b.tomato.tube(line(V(-3.5,9.65-j*.15,-164),V(3.5,9.65-j*.15,-164),12),.12,6);}
  }
  // Both visible pasta fountains really replenish the tank at the start.
  for(const x of[-3,3]){for(let r=.2;r<=1.6;r+=.18)b.blue.tube(circle(x,6.02,5,r,r,24),.11,6);for(let j=0;j<6;j++){const a=j/6*TAU,pts=[];for(let k=0;k<=18;k++){const t=k/18;pts.push(V(x+Math.sin(a)*t*1.5,6.1+Math.sin(t*Math.PI)*2.2,5+Math.cos(a)*t*1.5));}b.blue.tube(pts,.08,6);}}
  pipe(b,-5.8,6,7);clouds(b,[[16,-1,-18,3],[-18,-2,-69,4],[17,0,-123,3],[-16,2,-180,4]]);finish(b,group,'Turbo Track');
  let distance=0,peakSpeed=0,turboFrames=0,lastPosition=null;
  function heightAt(x,z){const d=-z;for(const p of platforms)if(d>=p.d0&&d<=p.d1&&Math.abs(x)<=p.w/2)return mix(p.y0,p.y1,(d-p.d0)/(p.d1-p.d0));return -60;}
  function update(dt,time,player){if(player){if(lastPosition&&dt>0)distance+=Math.hypot(player.position.x-lastPosition.x,player.position.z-lastPosition.z);lastPosition=player.position.clone();peakSpeed=Math.max(peakSpeed,player.speed);if(player.turboActive)turboFrames++;}}
  return{group,courseId:'turbo',mode:'turbo',episode:1,bounds,colliders,landmarks,platforms,heightAt,update,nozzleAllowed:true,nozzleModes:['spray','turbo','hover','rocket'],preciseGroundPound:false,reset(){distance=peakSpeed=turboFrames=0;lastPosition=null;},surfaceAt:(x,z)=>heightAt(x,z)>-30?'pasta':'void',refillAt:(x,z,y)=>Math.abs(z-5)<2.1&&Math.abs(y-6)<.6&&(Math.abs(x-3)<1.8||Math.abs(x+3)<1.8),
    get mapData(){return{route:[landmarks.spawn,landmarks.shine],platforms:platforms.map(p=>({x:0,z:-(p.d0+p.d1)/2,w:p.w,d:p.d1-p.d0,y:p.y0,stable:true}))};},getState(){return{distance,peakSpeed,turboFrames};}}
}

export function createFieldWorld(scene,materials){
  const group=new THREE.Group();group.name='Red Coin Field · tall spinach spaghetti';scene.add(group);const b=batches(materials),colliders=[],bounds={x0:-30,x1:30,z0:-38,z1:28},field={x0:-22,x1:22,z0:-30,z1:20},hole={x0:9,x1:17,z0:-26,z1:-16};
  const landmarks={spawn:V(0,4,15),exit:V(0,4,18),shine:V(0,9.2,-27),structure:V(-13,7.1,11),alcove:V(14,3.2,-22),pianta:V(10,5.1,-3),bird:V(-3,11,-23),melon:V(10.5,8.8,-17.4)};
  const floorHeight=(x,z)=>4+clamp((-z-2)/28)*4;
  const ledges=[{x0:9,x1:11,z0:-19,z1:-17,y:3.8},{x0:9,x1:11,z0:-22,z1:-20,y:5.5},{x0:9,x1:11,z0:-25,z1:-23,y:7.2}];
  // Rows terminate at the alcove rather than drawing a solid grass plane over it.
  for(let z=field.z0;z<=field.z1;z+=.29){const strips=inRect(12,z,hole)?[[-22,9],[17,22]]:[[-22,22]];for(const [a,c]of strips){const n=Math.ceil((c-a)/1.4),p=[];for(let j=0;j<=n;j++){const x=mix(a,c,j/n);p.push(V(x,floorHeight(x,z)-.15,z));}b.darkGreen.tube(p,.16,6);b.egg.tube(p.map(q=>q.clone().add(V(0,-.45,0))),.12,5);}}
  // The island sides are bundles of dry spaghetti with an actual exposed edge.
  for(const z of[-30,20])for(let y=1;y<4;y+=.24)b.toasted.tube(line(V(-22,y+floorHeight(0,z)-4,z),V(22,y+floorHeight(0,z)-4,z),30),.14,6);
  for(const x of[-22,22])for(let k=0;k<12;k++){const p=[];for(let z=-30;z<=20;z+=1.2)p.push(V(x,floorHeight(x,z)-.3-k*.24,z));b.toasted.tube(p,.14,6);}
  slab(b,hole,()=>2,'toasted',.13);for(const l of ledges){slab(b,l,()=>l.y,'cream',.12);colliders.push({minX:l.x0,maxX:l.x1,minZ:l.z0,maxZ:l.z1,bottom:l.y-.4,top:l.y,kind:'alcove-step'});}
  // A flat raft of brittle watermelon-colored noodles covers part of the pit.
  const melonGroup=new THREE.Group(),mb=batches(materials),melon={x0:9,x1:12,z0:-19,z1:-16,y:floorHeight(10.5,-17.4),broken:false};slab(mb,melon,()=>melon.y,'spinach',.13);for(let x=9.2;x<=11.8;x+=.48)mb.tomato.tube(line(V(x,melon.y+.03,-18.8),V(x,melon.y+.03,-16.2),8),.06,6);finish(mb,melonGroup,'Watermelon-block pasta crust');group.add(melonGroup);const melonCollider={minX:9,maxX:12,minZ:-19,maxZ:-16,bottom:melon.y-.35,top:melon.y,kind:'watermelon-block'};colliders.push(melonCollider);
  const structure={x0:-16,x1:-10,z0:8,z1:14,y:6};slab(b,structure,()=>6,'toasted',.14);for(const x of[-15.5,-10.5])for(const z of[8.5,13.5])braid(b.toasted,V(x,4,z),V(x,6,z),.2,4);colliders.push({minX:-16,maxX:-10,minZ:8,maxZ:14,bottom:5.6,top:6,kind:'brown-structure'});
  // Low bundled walls give sprayed Pokey Pods physical impact surfaces.
  const podWalls=[{minX:-18,maxX:-17.5,minZ:-9,maxZ:1,bottom:4,top:7.2,kind:'pokey-wall'},{minX:16.5,maxX:17,minZ:3,maxZ:13,bottom:4,top:7.2,kind:'pokey-wall'}];colliders.push(...podWalls);for(const wall of podWalls)for(let y=4;y<7.2;y+=.19)b.cream.tube(line(V(wall.minX,y,wall.minZ),V(wall.minX,y,wall.maxZ),14),.12,6);
  pipe(b,0,4,18);const observer=pianta(materials);observer.position.set(-6,floorHeight(-6,-26),-26);group.add(observer);
  // Tall noodle grass is deterministic and instanced. Individual blades bend
  // under the body then recover with a damped spring; no solid painted lawn.
  const grassBatch=new Batch(materials.spinach);grassBatch.tube([V(0,0,0),V(.04,.34,.015),V(-.025,.72,.035),V(.07,1.05,.1)],.045,5);const template=new THREE.Group(),templateMesh=grassBatch.finish(template,'blade'),grassGeometry=templateMesh.geometry,grass=[];
  for(let z=-28.8;z<18.4;z+=1.08)for(let x=-20.8;x<21;x+=1.04){const xx=x+Math.sin(x*12.3+z*4.2)*.3,zz=z+Math.cos(x*8.7-z*2.1)*.28;if(inRect(xx,zz,hole,.2)||inRect(xx,zz,structure,1)||Math.abs(xx)<3&&zz>10||Math.hypot(xx+6,zz+26)<1.9)continue;grass.push({x:xx,z:zz,y:floorHeight(xx,zz),angle:Math.sin(xx*7.1+zz*5.3)*Math.PI,scale:.75+(Math.sin(xx*3.7+zz*4.1)+1)*.35,bend:0,velocity:0});}
  const grassMesh=new THREE.InstancedMesh(grassGeometry,materials.spinach,grass.length),dummy=new THREE.Object3D();grassMesh.name='Responsive individual spinach spaghetti grass';grassMesh.castShadow=false;grassMesh.receiveShadow=true;grassMesh.frustumCulled=false;grassMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(grassMesh);template.remove(templateMesh);
  clouds(b,[[-29,-3,-18,4],[30,0,4,4],[-12,-4,27,3]]);finish(b,group,'Red Coin Field');
  let playerRef=null,clock=0,grassDrawn=false;
  function heightAt(x,z){if(inRect(x,z,hole)){let y=2;for(const l of ledges)if(inRect(x,z,l)&&(!playerRef||playerRef.position.y>=l.y-.5))y=Math.max(y,l.y);if(!melon.broken&&inRect(x,z,melon)&&(!playerRef||playerRef.position.y>=melon.y-.5))y=Math.max(y,melon.y);return y;}return inRect(x,z,field)?floorHeight(x,z):-60;}
  function update(dt,time,player){playerRef=player;dt=clamp(Number.isFinite(dt)?dt:0,0,.05);clock=Number.isFinite(time)?time:clock+dt;for(let i=0;i<grass.length;i++){const g=grass[i],dx=player?g.x-player.position.x:0,dz=player?g.z-player.position.z:0,d=Math.hypot(dx,dz),near=player&&Math.abs(player.position.y-g.y)<2&&d<2.1,load=near?(1-d/2.1)*.95:0;g.velocity+=((load-g.bend)*45-g.velocity*8)*dt;g.bend+=g.velocity*dt;if(!grassDrawn||near||Math.abs(g.velocity)>.0005||g.bend>.0005){dummy.position.set(g.x,g.y,g.z);dummy.rotation.set(g.bend*Math.cos(g.angle),g.angle,g.bend*Math.sin(g.angle));dummy.scale.setScalar(g.scale);dummy.updateMatrix();grassMesh.setMatrixAt(i,dummy.matrix);}}grassDrawn=true;grassMesh.instanceMatrix.needsUpdate=true;}
  function breakMelon(impact){if(melon.broken||!impact||!Number.isFinite(impact.dropHeight)||impact.dropHeight<.55||impact.impactSpeed<15||!inRect(impact.x,impact.z,melon,.22)||Math.abs(impact.y-melon.y)>.6)return false;melon.broken=true;melonGroup.visible=false;const index=colliders.indexOf(melonCollider);if(index>=0)colliders.splice(index,1);return true;}
  function reset(){melon.broken=false;melonGroup.visible=true;if(!colliders.includes(melonCollider))colliders.push(melonCollider);for(const g of grass){g.bend=g.velocity=0;}grassDrawn=false;clock=0;}
  return{group,courseId:'field',mode:'field',episode:1,bounds,colliders,landmarks,field,hole,ledges,podWalls,melon,structure,heightAt,floorHeight,update,reset,breakMelon,nozzleAllowed:true,nozzleModes:['spray','hover','rocket','turbo'],preciseGroundPound:true,surfaceAt:(x,z)=>heightAt(x,z)>-30?'grass':'void',refillAt:()=>false,
    get mapData(){return{route:[landmarks.spawn,landmarks.structure,V(-12,5,-5),V(-10,7,-17),landmarks.bird,landmarks.alcove,V(10,5,-3),V(10,4,9),landmarks.shine],platforms:[{x:0,z:-5,w:44,d:50,y:4,stable:true},{x:-13,z:11,w:6,d:6,y:6,stable:true}]};},getState(){return{melonBroken:melon.broken,grassCount:grass.length,bentGrass:grass.filter(g=>g.bend>.02).length,grassFinite:grass.every(g=>Number.isFinite(g.bend+g.velocity)),clock};}}
}
