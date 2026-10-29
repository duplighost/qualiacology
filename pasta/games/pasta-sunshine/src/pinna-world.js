import * as THREE from '../vendor/three.module.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
class PastaBatch {
  constructor(material){this.material=material;this.p=[];this.n=[];this.uv=[];this.i=[];}
  tube(points,r=.1,sides=6){
    if(points.length<2)return;const first=this.p.length/3,t=V(),s=V(),b=V(),axis=V();let length=0;
    for(let j=0;j<points.length;j++){
      t.subVectors(points[Math.min(j+1,points.length-1)],points[Math.max(j-1,0)]).normalize();axis.set(Math.abs(t.y)>.94?1:0,Math.abs(t.y)>.94?0:1,0);s.crossVectors(t,axis).normalize();b.crossVectors(t,s).normalize();if(j)length+=points[j].distanceTo(points[j-1]);
      for(let k=0;k<=sides;k++){const a=k/sides*TAU,n=s.clone().multiplyScalar(Math.cos(a)).addScaledVector(b,Math.sin(a)),p=points[j].clone().addScaledVector(n,r);this.p.push(p.x,p.y,p.z);this.n.push(n.x,n.y,n.z);this.uv.push(length,k/sides);}
    }
    for(let j=0;j<points.length-1;j++)for(let k=0;k<sides;k++){const a=first+j*(sides+1)+k,b=a+sides+1;this.i.push(a,b,a+1,b,b+1,a+1);}
  }
  mesh(parent,name){if(!this.p.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));g.setIndex(this.i);g.computeBoundingSphere();const m=new THREE.Mesh(g,this.material);m.name=name;m.castShadow=true;m.receiveShadow=true;parent?.add(m);return m;}
}
const line=(a,b,n=12,w=.025)=>Array.from({length:n+1},(_,i)=>{const p=a.clone().lerp(b,i/n);p.y+=Math.sin(i*1.7)*w;return p;});
const ring=(x,y,z,rx,rz=rx,n=40)=>Array.from({length:n+1},(_,i)=>V(x+Math.cos(i/n*TAU)*rx,y+Math.sin(i/n*TAU*5)*.018,z+Math.sin(i/n*TAU)*rz));
const box=(x,y,z,w,d)=>[V(x-w/2,y,z-d/2),V(x+w/2,y,z-d/2),V(x+w/2,y,z+d/2),V(x-w/2,y,z+d/2),V(x-w/2,y,z-d/2)];

// Pinna's rides, ocean and surfaces are individually modeled pasta strands.
// Only the current sublevel is drawn. The secret's support is the same data
// that drives the changing platform geometry, including the catch floor.
export function createPinnaWorld(scene,materials,options={}){
  const episode=options.episode===2?2:1,M=materials,root=new THREE.Group(),outdoors=new THREE.Group(),secret=new THREE.Group();root.name='Pinna Park — woven pasta amusement park';root.add(outdoors,secret);scene.add(root);
  const batches=Object.fromEntries(Object.keys(M).map(k=>[k,new PastaBatch(M[k])])),collisions=[],safePads=[],tiles=[],springs=[],route=[];
  const b=batches,dummy=new THREE.Object3D();let mode='beach',rideActive=false,ridePhase=0,rideDistance=0,clock=0,secretTime=0,blocksCrossed=0;
  const ridePosition=V(),ridePrevious=V(),rideTangent=V(0,0,-1),rideVelocity=V(),redStarts=[-1,-1];
  const landmarks={spawn:V(-42,.15,30),gate:V(0,.15,12),pool:V(0,.25,-31),operator:V(-7,.25,-21),cannon:V(38,.15,23),secretSpawn:V(0,.05,12),secretGoal:V(-3,8.6,-42),bossTarget:V(0,13,-31)};
  function terrain(x,z){const shore=39+Math.sin(x*.13)*1.4;return z>shore?Math.max(-1.2,.05-(z-shore)*.48):.05+Math.sin(x*.08)*Math.sin(z*.1)*.045;}
  function deck(batch,x,y,z,w,d){for(let zz=z-d/2;zz<=z+d/2+.001;zz+=.23)batch.tube(line(V(x-w/2,y-.09,zz),V(x+w/2,y-.09,zz),Math.max(3,Math.ceil(w/.8))),.12,6);for(let j=0;j<3;j++)batch.tube(box(x,y-.1-j*.18,z,w,d),.12,6);}
  function post(batch,x,z,y,h,r=.22){for(let strand=0;strand<5;strand++){const p=[];for(let i=0;i<=20;i++){const t=i/20,a=t*TAU*2.6+strand/5*TAU;p.push(V(x+Math.cos(a)*r*.62,y+h*t,z+Math.sin(a)*r*.62));}batch.tube(p,r*.4,6);}}
  function ball(batch,c,r,count=13){for(let band=0;band<count;band++){const t=(band+.5)/count*2-1,rr=r*Math.sqrt(1-t*t);batch.tube(ring(c.x,c.y+t*r,c.z,rr,rr,28),Math.max(.055,r/count*.8),6);}}
  function palm(x,z,h=6){const y=terrain(x,z);post(b.toasted,x,z,y,h,.32);for(let k=0;k<8;k++){const a=k/8*TAU,p=[];for(let i=0;i<=18;i++){const t=i/18;p.push(V(x+Math.cos(a)*t*3.2,y+h+Math.sin(t*Math.PI)*1.2-t*1.3,z+Math.sin(a)*t*3.2));}b.spinach.tube(p,.13,6);for(let j=4;j<16;j+=3){const q=p[j];b.spinach.tube([q.clone().add(V(-Math.sin(a)*.5,-.05,Math.cos(a)*.5)),q,q.clone().add(V(Math.sin(a)*.5,-.05,-Math.cos(a)*.5))],.08,5);}}}
  // Short, irregular strands expose the semolina grain of the broad beach.
  for(let z=-55;z<=40;z+=.43)for(let x=-51;x<51;x+=17){const pts=[];for(let i=0;i<=19;i++){const xx=x+i/19*17,zz=z+Math.sin(xx*.32+z)*.07;pts.push(V(xx,terrain(xx,zz)+.03,zz));}b.cream.tube(pts,.12,5);}
  for(let z=39;z<=59;z+=.39){const p=[];for(let x=-63;x<=63;x+=1.1)p.push(V(x,-.2+Math.sin(x*.18+z*.26)*.13,z));b.lake.tube(p,.13,6);}
  // A woven retaining wall and arch separate the beach from the park.
  for(let x=-48;x<=48;x+=.27){if(Math.abs(x)<4)continue;b.tomato.tube(line(V(x,.1,12),V(x,4.1,12),10,.035),.14,6);}
  for(let j=0;j<5;j++){const p=[];for(let i=0;i<=30;i++){const a=i/30*Math.PI;p.push(V(Math.cos(a)*(4+j*.19),3.7+Math.sin(a)*(4+j*.19),12));}b.egg.tube(p,.13,7);}
  for(const x of [-4,4])post(b.egg,x,12,.1,3.8,.34);
  for(const [lo,hi]of [[-51,-4],[4,51]])collisions.push({minX:lo,maxX:hi,minZ:11.65,maxZ:12.35,bottom:0,top:4.2,kind:'pasta-park-wall'});
  const gateBarrier={minX:-4,maxX:4,minZ:11.75,maxZ:12.3,bottom:0,top:5,kind:'closed-pasta-park-gate'};
  const gateMesh=new THREE.Group();gateMesh.name='Pasta entrance gate';outdoors.add(gateMesh);const gb=new PastaBatch(M.egg);for(let x=-3.8;x<=3.8;x+=.37)gb.tube([V(x,.1,12),V(x,3.7,12)],.11,6);gb.mesh(gateMesh,'Braided entrance strands');
  if(episode===2)collisions.push(gateBarrier);gateMesh.visible=episode===2;
  for(const [x,z,h]of [[-44,20,6],[-29,33,7],[-18,23,6.3],[21,31,6.6],[46,32,6.8],[-41,-32,7],[37,-20,7],[-34,-50,6],[34,-47,6]])palm(x,z,h);
  // Pianta tree and sunflower garden on the outer beach.
  post(b.toasted,-30,17,.1,7.1,.75);ball(b.spinach,V(-30,8,17),3.1,26);for(const side of [-1,1]){b.toasted.tube([V(-30+side*.4,3,17),V(-30+side*1.9,5,17),V(-30+side*3,5.8,17)],.3,7);ball(b.ink,V(-30+side*.39,5.2,17.73),.1,5);}b.toasted.tube([V(-30.3,4.3,17.8),V(-30,4.1,18),V(-29.7,4.3,17.8)],.08,6);
  for(let j=0;j<7;j++){const x=-45+j*2,z=35+(j%2)*1.3,y=2+(j===3?2:0);post(b.spinach,x,z,.1,y,.16);for(let k=0;k<8;k++){const a=k/8*TAU;b.gold.tube([V(x,y,z),V(x+Math.cos(a)*.7,y+Math.sin(a)*.7,z+.04),V(x+Math.cos(a)*.3,y+Math.sin(a)*.3,z+.1)],.14,6);}ball(b.toasted,V(x,y,z+.13),.25,6);}
  // Central Yoshi carousel with shell pasta seats.
  deck(b.tomato,-10,.3,-6,10,10);for(let j=0;j<13;j++)b.egg.tube(ring(-10,.65+j*.16,-6,4.6-j*.18,4.6-j*.18,48),.13,6);post(b.egg,-10,-6,.3,6,.33);
  const carousel=new THREE.Group();carousel.position.set(-10,.3,-6);outdoors.add(carousel);const cb=new PastaBatch(M.spinach),cc=new PastaBatch(M.egg);
  for(let k=0;k<5;k++){const a=k/5*TAU,x=Math.cos(a)*3.3,z=Math.sin(a)*3.3;post(cc,x,z,0,4.7,.12);ball(cb,V(x,2,z),.65,12);ball(cb,V(x,2.8,z+.32),.4,9);for(const s of[-1,1])cb.tube([V(x+s*.24,1.8,z),V(x+s*.43,1.3,z+.35)],.12,6);}cb.mesh(carousel,'Spinach noodle carousel creatures');cc.mesh(carousel,'Bucatini carousel poles');
  // Clam cups at the front right and two pirate boats behind them.
  const cups=new THREE.Group();cups.position.set(18,.1,0);outdoors.add(cups);const cupBatch=new PastaBatch(M.egg);for(let k=0;k<6;k++){const a=k/6*TAU,x=Math.cos(a)*3.4,z=Math.sin(a)*3.4;for(let j=0;j<10;j++)cupBatch.tube(ring(x,.15+j*.14,z,.4+j*.08,.4+j*.08,24),.09,6);}cupBatch.mesh(cups,'Conchiglie teacup ride');
  const ships=[];for(const [x,z]of [[24,-13],[24,-27]]){
    for(const s of[-1,1]){post(b.toasted,x+s*4.3,z,.1,10,.32);b.egg.tube([V(x+s*4.3,10,z),V(x,10.6,z)],.23,6);}const pivot=new THREE.Group();pivot.position.set(x,9.6,z);outdoors.add(pivot);const sb=new PastaBatch(M.toasted),trim=new PastaBatch(M.egg);
    for(let j=0;j<10;j++)sb.tube(ring(0,-6+j*.18,0,3.4-j*.1,.7+j*.05,38),.12,6);for(const s of[-1,1])trim.tube([V(s*3.5,-4.2,0),V(s*2,-5.2,0),V(0,-5.8,0)],.2,7);for(const s of[-1,1])trim.tube(line(V(s*2.7,-4.8,0),V(s*1.9,0,0),20),.1,6);sb.mesh(pivot,'Fettuccine pirate ship hull');trim.mesh(pivot,'Ship noodle suspension');ships.push(pivot);
  }
  // Tall Ferris wheel: circular spaghetti hoops and hanging pasta baskets.
  const ferris=new THREE.Group();ferris.position.set(-25,11.8,-35);outdoors.add(ferris);const fb=new PastaBatch(M.tomato),fg=new PastaBatch(M.egg);
  for(const r of[8.9,9.2,9.5]){const p=[];for(let i=0;i<=100;i++){const a=i/100*TAU;p.push(V(Math.cos(a)*r,Math.sin(a)*r,0));}fb.tube(p,.16,7);}
  const baskets=[];for(let k=0;k<12;k++){const a=k/12*TAU;fg.tube([V(0,0,0),V(Math.cos(a)*9.4,Math.sin(a)*9.4,0)],.14,6);const basket=new THREE.Group();const q=new PastaBatch(k%2?M.gold:M.spinach);deck(q,0,-.8,0,1.8,1.4);for(const s of[-1,1])q.tube([V(s*.8,-.8,0),V(s*.8,.7,0),V(0,1,0)],.1,6);q.mesh(basket,'Coiled pasta Ferris gondola');ferris.add(basket);baskets.push({basket,angle:a});}fb.mesh(ferris,'Tomato spaghetti Ferris hoops');fg.mesh(ferris,'Noodle wheel spokes');for(const s of[-1,1])b.toasted.tube([V(-25+s*5,.1,-33),V(-25,11.8,-35)],.33,7);
  // Coaster follows a closed three-dimensional spline: hills and two turns.
  const trackPoints=[[-9,4,-18],[-29,7,-15],[-37,15,-30],[-30,19,-48],[-5,14,-54],[23,9,-49],[36,6,-32],[28,13,-13],[7,10,-4],[-9,4,-18]].map(p=>V(...p));
  const track=new THREE.CatmullRomCurve3(trackPoints.slice(0,-1),true,'catmullrom',.45),trackLength=track.getLength();
  for(const offset of[-.7,.7]){const pts=[];for(let i=0;i<=480;i++){const t=i/480,p=track.getPointAt(t),tan=track.getTangentAt(t),side=V(-tan.z,0,tan.x).normalize();pts.push(p.addScaledVector(side,offset));}b.egg.tube(pts,.15,7);}
  for(let i=0;i<190;i++){const t=i/190,p=track.getPointAt(t),tan=track.getTangentAt(t),side=V(-tan.z,0,tan.x).normalize();b.toasted.tube([p.clone().addScaledVector(side,-1),p.clone().addScaledVector(side,1)],.09,5);}
  for(let i=0;i<25;i++){const p=track.getPointAt(i/25);post(b.tomato,p.x,p.z,.1,p.y,.26);}
  const cart=new THREE.Group();outdoors.add(cart);const cartB=new PastaBatch(M.tomato),cartE=new PastaBatch(M.egg);deck(cartB,0,0,0,2.2,3.3);for(let j=0;j<5;j++)cartB.tube(box(0,.2+j*.2,0,2.2,3.3),.12,6);for(const z of[-.8,.8])for(const x of[-1.1,1.1]){const p=[];for(let i=0;i<=22;i++){const a=i/22*TAU;p.push(V(x,-.2+Math.cos(a)*.35,z+Math.sin(a)*.35));}cartE.tube(p,.08,6);}cartB.mesh(cart,'Spaghetti roller-coaster car');cartE.mesh(cart,'Rotelle pasta cart wheels');
  const fringe=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,6),M.egg,48);fringe.name='Gravity-constrained loose coaster spaghetti';fringe.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fringe.frustumCulled=false;fringe.castShadow=true;outdoors.add(fringe);
  const fringeStrands=Array.from({length:6},(_,i)=>({anchor:V(i%2?.92:-.92,.15,-1.1+Math.floor(i/2)*1.1),lastAnchor:V(1e6,0,0),nodes:Array.from({length:9},()=>V()),old:Array.from({length:9},()=>V())}));
  function updateCartFringe(dt){const up=V(0,1,0),direction=V();let index=0;cart.updateMatrixWorld(true);
    for(const s of fringeStrands){const anchor=cart.localToWorld(s.anchor.clone());if(dt===0||anchor.distanceTo(s.lastAnchor)>8){for(let j=0;j<9;j++){s.nodes[j].copy(anchor).add(V(0,-j*.22,0));s.old[j].copy(s.nodes[j]);}}
      else{for(let j=1;j<9;j++){const p=s.nodes[j],previous=s.old[j].clone();s.old[j].copy(p);p.add(p.clone().sub(previous).multiplyScalar(.975));p.y-=17*dt*dt;}for(let solve=0;solve<6;solve++){s.nodes[0].copy(anchor);for(let j=1;j<9;j++){direction.subVectors(s.nodes[j],s.nodes[j-1]);const length=direction.length();if(length>.00001){direction.multiplyScalar((length-.22)/length);if(j===1)s.nodes[j].sub(direction);else{s.nodes[j].addScaledVector(direction,-.5);s.nodes[j-1].addScaledVector(direction,.5);}}}}}s.lastAnchor.copy(anchor);
      for(let j=0;j<8;j++){direction.subVectors(s.nodes[j+1],s.nodes[j]);const length=direction.length();dummy.position.copy(s.nodes[j]).add(s.nodes[j+1]).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,length>.0001?direction.multiplyScalar(1/length):up);dummy.scale.set(.05,Math.max(.001,length+.02),.05);dummy.updateMatrix();fringe.setMatrixAt(index++,dummy.matrix);}}
    fringe.instanceMatrix.needsUpdate=true;
  }
  // The pool remains walkable; its surface is dense blue linguine.
  for(let zz=-37;zz<=-25;zz+=.25){const rr=Math.sqrt(Math.max(0,36-(zz+31)**2));b.lake.tube(line(V(-rr,.12,zz),V(rr,.12,zz),20),.115,6);}for(let j=0;j<3;j++)b.egg.tube(ring(0,.1+j*.14,-31,6.2+j*.17,6.2+j*.17,60),.13,6);
  // Cannon shell, composed of thick nested coils; its opening is real.
  const cannonGroup=new THREE.Group();cannonGroup.position.copy(landmarks.cannon);outdoors.add(cannonGroup);const cannonB=new PastaBatch(M.ink),cannonR=new PastaBatch(M.egg);
  for(let j=0;j<20;j++)cannonB.tube(ring(0,.13+j*.17,0,2.4-j*.035,2.4-j*.035,42),.15,7);for(let j=0;j<3;j++)cannonR.tube(ring(0,3.55+j*.13,0,1.75,1.75,40),.13,7);for(const s of[-1,1]){const pts=[];for(let j=0;j<=40;j++){const a=j/40*TAU;pts.push(V(s*1.5,1.2+Math.cos(a)*.55,2.1+Math.sin(a)*.55));}cannonB.tube(pts,.2,7);}cannonB.mesh(cannonGroup,'Coiled squid-ink spaghetti cannon');cannonR.mesh(cannonGroup,'Hollow bucatini cannon rim');cannonGroup.visible=episode===2;cannonGroup.scale.y=.54;
  if(episode===2){
    const c=landmarks.cannon;for(const [dx,dz,w,d]of[[-1.95,0,.9,4.8],[1.95,0,.9,4.8],[0,-1.95,3,.9],[0,1.95,3,.9]])collisions.push({minX:c.x+dx-w/2,maxX:c.x+dx+w/2,minZ:c.z+dz-d/2,maxZ:c.z+dz+d/2,bottom:0,top:2.2,kind:'hollow-pasta-cannon-shell'});
  }
  // Low noodle walls around the park keep the original route readable.
  for(const x of[-50,50])for(let j=0;j<13;j++)b.spinach.tube(line(V(x,.15+j*.2,-56),V(x,.15+j*.2,12),90,.06),.14,6);
  for(const [name,batch]of Object.entries(batches))batch.mesh(outdoors,'Pinna '+name+' pasta environment');

  // Secret platforms: green batches disappear together; tomato rows collapse
  // in a traveling wave. The first red bridge has a spotted catch platform.
  const sb=Object.fromEntries(['egg','spinach','tomato','cream','gold','ink'].map(k=>[k,new PastaBatch(M[k])]));
  function safe(x,y,z,w,d){safePads.push({x,y,z,w,d,stable:true});deck(sb.cream,x,y,z,w,d);for(let k=0;k<Math.ceil(w*d/5);k++){const xx=x-w*.4+(k%5)*w*.18,zz=z-d*.35+Math.floor(k/5)*d*.23;sb.spinach.tube(ring(xx,y+.03,zz,.22,.28,13),.06,5);}}
  function tile(x,y,z,colour='spinach',wave=-1,index=0){const t={x,y,z,colour,w:3,d:3,support:true,age:-1,recover:0,sag:0,previousSag:0,touched:false,wave,index};tiles.push(t);return t;}
  function spring(x,y,z){safe(x,y,z,3.6,3.6);const group=new THREE.Group();group.position.set(x,y,z);secret.add(group);const p=new PastaBatch(M.gold),r=new PastaBatch(M.tomato);for(let k=0;k<6;k++){const pts=[];for(let i=0;i<=48;i++){const t=i/48,a=t*TAU*3.5+k/6*TAU;pts.push(V(Math.cos(a)*1.15,.1+t*.55,Math.sin(a)*1.15));}p.tube(pts,.075,6);}deck(r,0,.7,0,2.8,2.8);p.mesh(group,'Coiled fusilli trampoline');r.mesh(group,'Springy tomato noodle mat');springs.push({x,y,z,group,cooldown:0,compression:0});}
  safe(0,0,12,7,6);route.push({x:0,y:0,z:12});
  for(let i=0;i<6;i++){tile(0,0,7.5-i*3);route.push({x:0,y:0,z:7.5-i*3});}
  safe(0,0,-12,7,6);route.push({x:0,y:0,z:-12});safe(0,0,-23,8,18);safe(-.5,0,-28,28,10);
  spring(0,0,-18);spring(-5,3.6,-22);safe(-10,7.2,-25,5,6);
  route.push({x:0,y:0,z:-17.8,spring:true},{x:-5,y:3.6,z:-22,spring:true},{x:-10,y:7.2,z:-25});
  for(let i=0;i<7;i++){tile(-10+i*3,7.2,-29,'tomato',0,i);route.push({x:-10+i*3,y:7.2,z:-29,slide:true});}
  safe(12,7.2,-29,5,5);route.push({x:12,y:7.2,z:-29});
  let index=0;for(const z of[-33,-36,-39,-42]){tile(12,7.2,z,'tomato',1,index++);route.push({x:12,y:7.2,z,slide:true});}for(const x of[9,6,3,0]){tile(x,7.2,-42,'tomato',1,index++);route.push({x,y:7.2,z:-42,slide:true});}safe(-3,7.2,-42,6,6);route.push({x:-3,y:7.2,z:-42});
  for(const [name,batch]of Object.entries(sb))batch.mesh(secret,'Secret '+name+' spotted pasta platforms');
  const tileTemplate=new PastaBatch(M.egg);deck(tileTemplate,0,0,0,3,3);const tileGeometry=tileTemplate.mesh(null,'').geometry,tileMeshes={};
  for(const colour of['spinach','tomato']){const list=tiles.filter(t=>t.colour===colour),mesh=new THREE.InstancedMesh(tileGeometry,M[colour],list.length);mesh.name=colour+' disappearing spaghetti blocks';mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;secret.add(mesh);tileMeshes[colour]={mesh,list};}
  // The secret's surreal hills/clouds are distant woven pasta, never paint.
  const backdrop=new PastaBatch(M.cream),hills=new PastaBatch(M.spinach);for(let j=0;j<12;j++){const x=-40+j*8,y=12+(j%3)*3,z=-62-(j%2)*5;for(let n=0;n<7;n++)backdrop.tube(ring(x,y+n*.15,z,2.8-n*.18,1.0,35),.13,6);for(let n=0;n<14;n++)hills.tube(ring(x,-11+n*.3,-58,6-n*.25,4,30),.17,6);}backdrop.mesh(secret,'Pasta clouds beyond the cannon secret');hills.mesh(secret,'Woven spinach secret hills');
  const loose=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,6),M.egg,14*8);loose.instanceMatrix.setUsage(THREE.DynamicDrawUsage);loose.frustumCulled=false;loose.castShadow=true;secret.add(loose);const strands=Array.from({length:14},()=>({life:0,nodes:Array.from({length:9},()=>V()),old:Array.from({length:9},()=>V())}));let looseCursor=0;
  function shed(tile){for(let k=0;k<5;k++){const s=strands[looseCursor++%strands.length];s.life=2.5;for(let j=0;j<9;j++){s.nodes[j].set(tile.x-1.3+j*.32,tile.y-.12,tile.z-.7+k*.35);s.old[j].copy(s.nodes[j]).add(V((k-2)*-.015,.006,0));}}}
  function secretHeight(x,z){let y=-80;for(const p of safePads)if(Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2)y=Math.max(y,p.y);for(const t of tiles)if(t.support&&Math.abs(x-t.x)<=1.5&&Math.abs(z-t.z)<=1.5)y=Math.max(y,t.y-t.sag);return y;}
  function heightAt(x,z){return mode==='secret'?secretHeight(x,z):terrain(x,z);}
  function surfaceAt(x,z){return mode==='secret'?(heightAt(x,z)<-50?'void':'ground'):terrain(x,z)<-.2?'water':'ground';}
  function animateTiles(dt,player){
    for(const t of tiles){
      t.previousSag=t.sag;const contact=player&&Math.abs(player.position.x-t.x)<1.48&&Math.abs(player.position.z-t.z)<1.48&&Math.abs(player.position.y-(t.y-t.sag))<.22&&player.grounded;
      if(contact&&!t.touched){t.touched=true;blocksCrossed++;}
      if(contact&&t.age<0&&t.wave<0)t.age=0;
      if(t.wave>=0&&redStarts[t.wave]<0&&contact)redStarts[t.wave]=secretTime-t.index*.3;
      if(t.wave>=0&&redStarts[t.wave]>=0)t.age=secretTime-redStarts[t.wave]-t.index*.3;
      else if(t.age>=0)t.age+=dt;
      const duration=t.wave<0?1.55:1.6;
      if(t.age>=0&&t.age<duration){t.sag=.19*clamp(t.age/duration);t.support=true;}
      else if(t.age>=duration){if(t.support)shed(t);t.support=false;t.recover+=dt;t.sag=.6+(t.age-duration)*2.3;
        if(t.wave<0&&t.recover>4.5){t.age=-1;t.recover=0;t.support=true;t.sag=0;}}
      else{t.support=true;t.sag=0;}
    }
    for(let wave=0;wave<2;wave++)if(redStarts[wave]>=0&&secretTime-redStarts[wave]>7.2){redStarts[wave]=-1;for(const t of tiles)if(t.wave===wave){t.age=-1;t.recover=0;t.support=true;t.sag=0;}}
    for(const {mesh,list}of Object.values(tileMeshes)){for(let i=0;i<list.length;i++){const t=list[i];dummy.position.set(t.x,t.y-t.sag,t.z);dummy.rotation.set(0,0,t.support?Math.sin(t.age*6)*t.sag*.07:0);dummy.scale.setScalar(t.support?1:Math.max(0,1-(t.age-(t.wave<0?1.55:1.6))*1.6));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);const shade=t.age<0?1:Math.max(.2,1-t.age/(t.wave<0?1.55:1.6)*.75);mesh.setColorAt(i,new THREE.Color(shade,shade,shade));}mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    for(const spring of springs){spring.cooldown=Math.max(0,spring.cooldown-dt);spring.compression*=Math.exp(-dt*11);const near=player&&Math.abs(player.position.x-spring.x)<1.3&&Math.abs(player.position.z-spring.z)<1.3&&player.position.y<=spring.y+.5&&player.velocity.y<=0;if(near&&spring.cooldown<=0){player.velocity.y=14.3;player.grounded=false;spring.cooldown=.75;spring.compression=.55;}spring.group.scale.y=1-spring.compression;}
  }
  function updateStrands(dt){const up=V(0,1,0),dir=V();let idx=0;
    for(const s of strands){s.life=Math.max(0,s.life-dt);if(s.life>0){for(let j=0;j<9;j++){const p=s.nodes[j],previous=s.old[j].clone();s.old[j].copy(p);p.add(p.clone().sub(previous).multiplyScalar(.985));p.y-=18*dt*dt;const floor=secretHeight(p.x,p.z);if(p.y<floor+.06){p.y=floor+.06;s.old[j].x+=(p.x-s.old[j].x)*.13;s.old[j].z+=(p.z-s.old[j].z)*.13;}}for(let solve=0;solve<4;solve++)for(let j=1;j<9;j++){dir.subVectors(s.nodes[j],s.nodes[j-1]);const len=dir.length();if(len>.00001){dir.multiplyScalar((len-.32)/len*.5);s.nodes[j].sub(dir);s.nodes[j-1].add(dir);}}}
      for(let j=0;j<8;j++){dir.subVectors(s.nodes[j+1],s.nodes[j]);const len=dir.length();dummy.position.copy(s.nodes[j]).add(s.nodes[j+1]).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,len>.00001?dir.multiplyScalar(1/len):up);dummy.scale.set(s.life>0?.07:0,Math.max(.001,len),s.life>0?.07:0);dummy.updateMatrix();loose.setMatrixAt(idx++,dummy.matrix);}}
    loose.instanceMatrix.needsUpdate=true;
  }
  function resetSecret(){mode='secret';rideActive=false;outdoors.visible=false;secret.visible=true;secretTime=0;blocksCrossed=0;redStarts.fill(-1);for(const t of tiles)Object.assign(t,{age:-1,recover:0,sag:0,previousSag:0,touched:false,support:true});for(const s of springs){s.cooldown=0;s.compression=0;}for(const s of strands)s.life=0;animateTiles(0,null);updateStrands(0);return landmarks.secretSpawn.clone();}
  function setPark(){mode='park';gateMesh.visible=true;if(!collisions.includes(gateBarrier))collisions.push(gateBarrier);}
  function startRide(player){mode='ride';rideActive=true;ridePhase=0;rideDistance=0;ridePosition.copy(track.getPointAt(0)).add(V(0,.35,0));ridePrevious.copy(ridePosition);player?.reset(ridePosition);return ridePosition.clone();}
  function stopRide(){rideActive=false;mode='park';return landmarks.pool.clone().add(V(0,.15,6));}
  function controlPlayer(player,dt,input){if(!rideActive)return false;player.position.copy(ridePosition);player.velocity.copy(rideVelocity);player.heading=Number.isFinite(input.cameraYaw)?input.cameraYaw:Math.atan2(rideTangent.x,rideTangent.z);player.speed=rideVelocity.length();player.grounded=true;player.hovering=false;player.ragdoll=false;player.nozzleEnabled=true;player.nozzle='spray';player.tank=100;player.spraying=!!input.spray;player.wet=false;player.turnVelocity=0;return true;}
  function update(dt,time,player){clock=time||0;if(mode==='secret'){secretTime+=dt;animateTiles(dt,player);updateStrands(dt);return;}
    carousel.rotation.y=time*.16;cups.rotation.y=-time*.18;ships.forEach((ship,i)=>ship.rotation.z=Math.sin(time*.75+i*1.4)*.7);ferris.rotation.z=time*.07;for(const o of baskets){o.basket.position.set(Math.cos(o.angle)*9.3,Math.sin(o.angle)*9.3,0);o.basket.rotation.z=-ferris.rotation.z;}
    ridePrevious.copy(ridePosition);if(rideActive){ridePhase=(ridePhase+dt*10.8/trackLength)%1;rideDistance+=dt*10.8;}else ridePhase=(time*.018)%1;ridePosition.copy(track.getPointAt(ridePhase)).add(V(0,.35,0));rideTangent.copy(track.getTangentAt(ridePhase));if(dt>0)rideVelocity.subVectors(ridePosition,ridePrevious).divideScalar(dt);else rideVelocity.set(0,0,0);cart.position.copy(ridePosition).add(V(0,-.35,0));cart.quaternion.setFromUnitVectors(V(0,0,1),rideTangent);updateCartFringe(dt);}
  function reset(){mode='beach';rideActive=false;ridePhase=rideDistance=clock=0;outdoors.visible=true;secret.visible=false;gateMesh.visible=episode===2;const i=collisions.indexOf(gateBarrier);if(episode===2&&i<0)collisions.push(gateBarrier);if(episode===1&&i>=0)collisions.splice(i,1);for(const s of strands)s.life=0;}
  reset();return {group:root,episode,landmarks,heightAt,surfaceAt,controlPlayer,update,setPark,startRide,stopRide,enterSecret:resetSecret,resetSecret,reset,secretRoute:route,ridePosition,rideTangent,
    get mode(){return mode;},get rideActive(){return rideActive;},get ridePhase(){return ridePhase;},get rideDistance(){return rideDistance;},get nozzleAllowed(){return mode!=='secret';},get bounds(){return mode==='secret'?{x0:-29,x1:32,z0:-56,z1:20}:{x0:-53,x1:53,z0:-57,z1:55};},get colliders(){return mode==='secret'?[]:collisions;},
    refillAt(x,z){return mode!=='secret'&&(z>39||Math.hypot(x,z+31)<6);},
    platformMotionAt(x,z,y){if(mode!=='secret')return null;for(const t of tiles)if(t.support&&Math.abs(x-t.x)<1.5&&Math.abs(z-t.z)<1.5&&Math.abs(y-(t.y-t.previousSag))<.2)return{x:0,y:t.previousSag-t.sag,z:0};return null;},
    getState(){return {mode,rideActive,ridePhase,rideDistance,blocksCrossed,totalBlocks:tiles.length,collapsedTiles:tiles.filter(t=>!t.support).length,crumblingTiles:tiles.filter(t=>t.age>=0&&t.support).length,redStarts:[...redStarts],looseStrands:strands.filter(s=>s.life>0).length,tiles:tiles.map(t=>({x:t.x,y:t.y,z:t.z,support:t.support,age:t.age,wave:t.wave}))};},
    get mapData(){return mode==='secret'?{route,platforms:[...safePads,...tiles].map(t=>({x:t.x,z:t.z,y:t.y,w:t.w,d:t.d,stable:!!t.stable,support:t.support!==false}))}:{route:[{x:-42,z:30},{x:0,z:12},{x:0,z:-31}],platforms:[]};}
  };
}
