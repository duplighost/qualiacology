import * as THREE from '../vendor/three.module.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
// Separate strands, baked by material. Their cross sections and longitudinal
// texture coordinates survive batching; there are no solid painted boxes.
export class AirstripPastaBatch{
  constructor(material){this.material=material;this.p=[];this.n=[];this.uv=[];this.i=[];}
  tube(points,r=.1,sides=6){const first=this.p.length/3;let length=0;for(let j=0;j<points.length;j++){const p=points[j],t=points[Math.min(j+1,points.length-1)].clone().sub(points[Math.max(0,j-1)]);if(t.lengthSq()<1e-10)t.set(0,1,0);t.normalize();const side=V().crossVectors(t,Math.abs(t.y)>.9?V(1,0,0):V(0,1,0)).normalize(),up=V().crossVectors(t,side).normalize();if(j)length+=p.distanceTo(points[j-1]);for(let k=0;k<=sides;k++){const a=k/sides*TAU,n=side.clone().multiplyScalar(Math.cos(a)).addScaledVector(up,Math.sin(a));this.p.push(p.x+n.x*r,p.y+n.y*r,p.z+n.z*r);this.n.push(n.x,n.y,n.z);this.uv.push(length,k/sides);}}for(let j=0;j<points.length-1;j++)for(let k=0;k<sides;k++){const a=first+j*(sides+1)+k,c=a+sides+1;this.i.push(a,c,a+1,c,c+1,a+1);}}
  finish(parent,name){if(!this.p.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));g.setIndex(this.i);g.computeBoundingSphere();const mesh=new THREE.Mesh(g,this.material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
}
export const pastaLine=(a,c,n=12,w=.012)=>Array.from({length:n+1},(_,i)=>{const t=i/n;return V(lerp(a.x,c.x,t),lerp(a.y,c.y,t)+Math.sin(t*16+a.x)*w,lerp(a.z,c.z,t)+Math.sin(t*11+a.z)*w);});
export const pastaCircle=(x,y,z,rx,rz,n=40)=>Array.from({length:n+1},(_,i)=>{const a=i/n*TAU;return V(x+Math.cos(a)*rx,y,z+Math.sin(a)*rz);});
export function pastaBall(batch,position,radius,loops=14,scale=V(1,1,1)){for(let s=0;s<loops;s++){const p=[],axis=V(Math.sin(s*2.399),Math.cos(s*2.399),.6).normalize();for(let j=0;j<=32;j++){const a=j/32*TAU,q=V(Math.cos(a)*radius,Math.sin(a)*radius,Math.sin(a*3+s)*radius*.1).applyAxisAngle(axis,s*.63).multiply(scale).add(position);p.push(q);}batch.tube(p,Math.max(.045,radius*.075),6);}}

export function createAirstripWorld(scene,materials,options={}){
  const episode=options.episode===2?2:1,M=materials,group=new THREE.Group();group.name='Delfino Airstrip — woven runway and turbo lagoon';scene.add(group);
  const batches=Object.fromEntries(['egg','cream','tomato','spinach','darkGreen','ink','blue','gold','toasted','pale'].map(k=>[k,new AirstripPastaBatch(M[k]||M.cream)]));
  const b=batches,colliders=[],bounds={x0:-47,x1:48,z0:-61,z1:55};let clock=0,playerY=3.2,fludd=episode===2,turbo=false;
  const runway={x0:-8,x1:8,z0:-44,z1:32,y:3.2},arm={x0:8,x1:36,z0:24,z1:34,y:3.2};
  const landmarks={spawn:episode===1?V(0,3.2,23):V(31,3.2,29),fludd:V(-4,3.2,-33),turbo:V(24,3.2,29),switch:V(17,3.2,29),boss:V(0,3.2,-6),refill:V(3,3.2,-37),shine:V(0,4.35,-6),dock:V(36,3.2,29),doorEast:V(12,3.2,29),doorWest:V(4,3.2,29)};
  const redCoinPositions=[V(8,4.25,29),V(-16,2.9,21),V(-25,2.9,-1),V(-22,.95,-31),V(2,.95,-49),V(29,.95,29),V(0,4.25,8),V(0,4.25,-23)];
  const turboRoute=[landmarks.switch.clone(),V(8,3.2,29),V(-8,.2,29),V(-16,.2,21),V(-25,.2,-1),V(-22,.2,-31),V(-16,.2,-47),V(2,.2,-49),V(24,.2,-43),V(29,.2,10),V(29,.2,29),V(29,.2,43),V(0,.2,45),V(0,3.2,31),V(0,3.2,8),V(0,3.2,-23)];
  function deck(batch,x0,x1,z0,z1,y,r=.12){for(let z=z0;z<=z1+.001;z+=r*1.92)batch.tube(pastaLine(V(x0,y-r,z),V(x1,y-r,z),Math.max(5,Math.ceil((x1-x0)/1.7))),r,6);}
  function wall(batch,a,c,height,r=.12){for(let y=0;y<height;y+=r*1.9)batch.tube(pastaLine(a.clone().add(V(0,y,0)),c.clone().add(V(0,y,0)),12),r,6);}
  function braid(batch,a,c,r=.2,count=4){const d=c.clone().sub(a).normalize(),side=V().crossVectors(d,Math.abs(d.y)>.9?V(1,0,0):V(0,1,0)).normalize(),up=V().crossVectors(d,side).normalize();for(let k=0;k<count;k++){const p=[];for(let j=0;j<=30;j++){const t=j/30,a0=t*TAU*2+k/count*TAU;p.push(a.clone().lerp(c,t).addScaledVector(side,Math.cos(a0)*r*.6).addScaledVector(up,Math.sin(a0)*r*.6));}batch.tube(p,r*.44,6);}}
  deck(b.toasted,-8,8,-44,32,3.2,.135);deck(b.cream,8,36,24,34,3.2,.135);
  // Cross strands and bundled edges make the full L silhouette readable.
  for(let x=-8;x<=8;x+=.5)b.egg.tube(pastaLine(V(x,2.97,-44),V(x,2.97,32),42,.015),.10,5);
  for(let x=8;x<=36;x+=.55)b.egg.tube(pastaLine(V(x,2.97,24),V(x,2.97,34),9,.015),.1,5);
  for(const [a,c]of [[V(-8,3.08,-44),V(8,3.08,-44)],[V(-8,3.08,-44),V(-8,3.08,32)],[V(8,3.08,-44),V(8,3.08,24)],[V(8,3.08,24),V(36,3.08,24)],[V(36,3.08,24),V(36,3.08,34)],[V(4,3.08,34),V(36,3.08,34)]])for(let k=0;k<3;k++)b.pale.tube(pastaLine(a.clone().add(V(0,-k*.16,0)),c.clone().add(V(0,-k*.16,0)),38),.12,6);
  for(let z=-42;z<28;z+=8){for(const x of [-6,6])b.pale.tube(pastaLine(V(x,3.245,z),V(x,3.245,z+3),6,0),.11,6);}
  // All of the sandy islets are tightly coiled semolina vermicelli.
  for(const [x,z,rx,rz]of [[0,-33,11,15],[0,4,11,19],[0,27,10,10]])for(let j=0;j<18;j++){const t=j/17,y=-.5+t*3.4,scale=1-t*.26;b.egg.tube(pastaCircle(x,y,z,rx*scale,rz*scale,56),.13,6);}
  // A shallow, visible pasta ramp is the return from the red-coin circuit.
  for(let x=-4;x<=4;x+=.22){const p=[];for(let i=0;i<=24;i++){const z=32+i/24*11;p.push(V(x,3.2*(1-i/24)-.1,z));}b.cream.tube(p,.115,6);}
  for(let z=33;z<=42;z+=.7)b.toasted.tube(pastaLine(V(-4,3.2*(43-z)/11-.07,z),V(4,3.2*(43-z)/11-.07,z),8,.005),.06,5);
  // Pier supports leave the actual x=29 underpass open for the sixth coin.
  for(const x of [13,21,35])for(const z of [24.3,33.6])braid(b.toasted,V(x,-1.5,z),V(x,2.8,z),.28,6);
  colliders.push({minX:12.5,maxX:36,minZ:24,maxZ:34,bottom:2.72,top:3.2,kind:'dock-underpass'});
  // The control tower's double doors really block the corridor until a Turbo
  // impact unravels them. The roof and walls have matching collision bounds.
  wall(b.cream,V(4,3.2,25.5),V(12,3.2,25.5),3.7);wall(b.cream,V(4,3.2,32.5),V(12,3.2,32.5),3.7);
  deck(b.toasted,3.6,12.4,25.1,32.9,7.1,.14);
  colliders.push({minX:3.8,maxX:12.2,minZ:25.3,maxZ:25.7,bottom:3.2,top:7.2,kind:'tower-wall'},{minX:3.8,maxX:12.2,minZ:32.3,maxZ:32.7,bottom:3.2,top:7.2,kind:'tower-wall'},{minX:3.6,maxX:12.4,minZ:25.1,maxZ:32.9,bottom:6.8,top:7.2,kind:'tower-roof'});
  for(let s=0;s<16;s++){const a=s/16*TAU,p=[];for(let j=0;j<=20;j++){const t=j/20;p.push(V(8+Math.cos(a)*t*5.8,11.6-Math.sin(t*Math.PI/2)*4.2,29+Math.sin(a)*t*5.8));}for(let k=-1;k<=1;k++)b[s%2?'spinach':'darkGreen'].tube(p.map(q=>q.clone().add(V(k*.13,0,k*.08))),.14,6);}
  braid(b.toasted,V(8,7.1,29),V(8,11.6,29),.35,7);
  // Water tower and refill basin at the far end of the runway.
  for(const x of [.4,5.6])for(const z of [-39.6,-34.4])braid(b.toasted,V(x,3.2,z),V(x,10,z),.18,4);
  for(let y=9.2;y<=13;y+=.21)b.cream.tube(pastaCircle(3,y,-37,3,3,38),.13,6);
  for(let r=.2;r<3.1;r+=.18)b.pale.tube(pastaCircle(3,13.1+Math.sqrt(Math.max(0,9-r*r))*.3,-37,r,r,38),.12,6);
  for(let j=0;j<5;j++)b.cream.tube(pastaCircle(3,3.26+j*.1,-37,3.1+j*.05,3.1+j*.05),.1,6);
  for(let z=-39.8;z<=-34.2;z+=.18){const dx=Math.sqrt(Math.max(0,2.8**2-(z+37)**2));b.blue.tube(pastaLine(V(3-dx,3.25,z),V(3+dx,3.25,z),12,.01),.1,6);}
  braid(b.cream,V(5.7,10,-37),V(6,4.4,-37),.13,4);
  // A recognizable twin-engine pasta seaplane, confined behind the first spawn.
  if(episode===1){for(let y=-.6;y<=.6;y+=.15){const p=[];for(let j=0;j<=60;j++){const a=j/60*TAU;p.push(V(Math.cos(a)*1.75,5+y+Math.sin(a)*.15,28+Math.sin(a)*7));}b.pale.tube(p,.11,6);}for(let s=0;s<19;s++){const a=s/19*TAU,p=[];for(let j=0;j<=35;j++){const t=j/35,z=21+t*14,r=Math.sin(t*Math.PI)*1.6;p.push(V(Math.cos(a)*r,5+Math.sin(a)*r,z));}b.cream.tube(p,.12,6);}for(let z=26.1;z<=29.3;z+=.19)b.tomato.tube(pastaLine(V(-13,5.15,z),V(13,5.15,z),20,.015),.12,6);for(let y=5;y<8.2;y+=.18)b.tomato.tube(pastaLine(V(0,y,31.4),V(0,y,34),7,.005),.11,6);for(const x of [-6.8,6.8]){for(let j=0;j<10;j++){const a=j/10*TAU;b.cream.tube(pastaLine(V(x+Math.cos(a)*.65,4.85+Math.sin(a)*.65,25.8),V(x+Math.cos(a)*.65,4.85+Math.sin(a)*.65,29),9),.1,6);}for(let j=0;j<2;j++)b.toasted.tube([V(x-.75+j*1.5,3.35,26),V(x-.75+j*1.5,3.35,30)],.19,7);}for(let i=0;i<4;i++)b.blue.tube([V(-1.1,5.2,22+i*1.7),V(-1.25,5.7,22+i*1.7),V(-1.2,5.2,22.6+i*1.7)],.18,6);colliders.push({minX:-1.8,maxX:1.8,minZ:25,maxZ:35,bottom:3.2,top:6.5,kind:'airplane-body'});}
  // The arrival party stands beside the aircraft, clear of the left-hand
  // route to FLUDD. Peach's layered dress/crown and the Toad mushroom caps
  // are baked into the same pasta batches rather than adding prop draw calls.
  if(episode===1){
    const px=3.7,pz=22.2,scale=.85,at=(x,y,z)=>V(px+x*scale,3.2+y*scale,pz+z*scale);
    for(let j=0;j<14;j++){const t=j/13,r=.88-t*.51;b.tomato.tube(pastaCircle(px,3.2+(.16+t*1.45)*scale,pz,r*scale,r*scale,36),.095*scale,6);}
    for(let j=0;j<7;j++)b.tomato.tube(pastaCircle(px,3.2+(1.63+j*.1)*scale,pz,.35*scale,.31*scale,26),.09*scale,6);
    for(const s of [-1,1]){pastaBall(b.tomato,at(s*.42,1.88,0),.24*scale,8);b.cream.tube([at(s*.48,1.88,0),at(s*.65,1.46,.2),at(s*.42,1.43,.43)],.10*scale,6);pastaBall(b.cream,at(s*.4,1.43,.43),.13*scale,6);}
    pastaBall(b.egg,at(0,2.53,.08),.43*scale,15,V(1,1.13,.91));
    for(let j=0;j<13;j++){const a=j/13*TAU,p=[];for(let k=0;k<=18;k++){const t=k/18;p.push(at(Math.cos(a)*(.39+t*.12),2.8-t*.86,Math.sin(a)*.38-.16));}b.gold.tube(p,.085*scale,6);}
    for(const s of [-1,1]){b.blue.tube([at(s*.14,2.53,.46),at(s*.14,2.69,.45)],.046*scale,5);pastaBall(b.gold,at(s*.43,2.36,.03),.10*scale,6);}
    pastaBall(b.egg,at(0,2.48,.5),.10*scale,6);pastaBall(b.blue,at(0,1.96,.34),.12*scale,7);
    for(let j=0;j<3;j++)b.gold.tube(pastaCircle(px,3.2+(2.96+j*.08)*scale,pz,.26*scale,.26*scale,24),.07*scale,6);
    for(let j=0;j<5;j++){const a=j/5*TAU,c=(j+1)/5*TAU;b.gold.tube([at(Math.cos(a)*.26,3.1,Math.sin(a)*.26),at(Math.cos((a+c)/2)*.29,3.42,Math.sin((a+c)/2)*.29),at(Math.cos(c)*.26,3.1,Math.sin(c)*.26)],.06*scale,5);}
    function toad(x,z,vest,spots,elder=false){const q=(xx,y,zz)=>V(x+xx,3.2+y,z+zz);pastaBall(b[vest],q(0,.85,0),.34,10,V(1,1.2,.8));pastaBall(b.cream,q(0,1.45,.04),.37,12,V(1,1,.9));for(const side of [-1,1]){b.cream.tube([q(side*.3,1.05,0),q(side*.53,.86,.05),q(side*.5,.82,.25)],.09,6);b.toasted.tube([q(side*.2,.55,0),q(side*.23,.16,.12),q(side*.23,.14,.34)],.15,7);b.ink.tube([q(side*.13,1.45,.37),q(side*.13,1.61,.36)],.045,5);}for(let j=0;j<14;j++){const t=j/13,r=.73*Math.sqrt(Math.max(.02,1-t*t));b.pale.tube(pastaCircle(x,3.2+1.75+t*.62,z,r,r*.88,30),.09,6);}for(let j=0;j<5;j++){const a=j/5*TAU,p=q(Math.cos(a)*.49,2.03,Math.sin(a)*.42);pastaBall(b[spots],p,.18,6,V(1,.6,1));}if(elder){for(const side of [-1,1])b.cream.tube([q(side*.02,1.32,.4),q(side*.2,1.22,.46),q(side*.34,1.3,.36)],.07,6);b.toasted.tube([q(.65,.13,.1),q(.65,1.18,.1),q(.52,1.23,.15)],.065,6);}}
    toad(5.4,20.3,'toasted','toasted',true);toad(2.2,19.2,'blue','tomato');toad(5.9,17.7,'tomato','blue');
  }
  // The sea remains a mass of individual blue pasta strands, not a water plane.
  for(let z=-64;z<=55;z+=.62){const p=[];for(let x=-50;x<=52;x+=1.8)p.push(V(x,-.27+Math.sin(x*.19+z*.11)*.075,z+Math.sin(x*.15)*.045));b.blue.tube(p,.20,5);}
  for(let k=0;k<14;k++){const x=k<7?-34:k*4-36,z=-54+(k%7)*15;for(let j=0;j<3;j++)b.pale.tube(pastaCircle(x,-.06+j*.015,z,1.5+j*.28,1+j*.15,24),.04,5);}
  for(const [x,z]of [[-3,-47],[7,-50],[0,-54],[12,-45]]){pastaBall(b.gold,V(x,.3,z),.42,8,V(1,.8,1));b.toasted.tube([V(x,-2,z),V(x,.35,z)],.075,5);}
  // A visible Shine emblem of coiled pasta provides a fixed finish landmark.
  for(let r=.2;r<=1.2;r+=.15)b.gold.tube(pastaCircle(0,3.265,-6,r,r,32),.08,6);
  for(let a=0;a<8;a++){const theta=a/8*TAU;b.gold.tube([V(Math.cos(theta)*1.4,3.27,-6+Math.sin(theta)*1.4),V(Math.cos(theta)*2.2,3.27,-6+Math.sin(theta)*2.2)],.1,6);}
  for(const [name,batch]of Object.entries(b))batch.finish(group,name+' airstrip strands');

  const doors=[];
  for(const x of [4,12]){const root=new THREE.Group(),batch=new AirstripPastaBatch(M.toasted);for(let z=25.8;z<=32.2;z+=.18)batch.tube(pastaLine(V(0,0,z-29),V(0,3.4,z-29),13),.105,6);for(let y=.4;y<3.2;y+=1.15)batch.tube(pastaLine(V(.02,y,-3.3),V(.02,y,3.3),12),.09,6);batch.finish(root,'Turbo-breakable bundled linguine door');root.position.set(x,3.2,29);group.add(root);const collider={minX:x-.14,maxX:x+.14,minZ:25.6,maxZ:32.4,bottom:3.2,top:6.7,kind:'turbo-door'};colliders.push(collider);doors.push({x,root,collider,broken:episode===1,age:0});}
  function refreshDoors(){for(const d of doors){const index=colliders.indexOf(d.collider);if(d.broken&&index>=0)colliders.splice(index,1);if(!d.broken&&index<0)colliders.push(d.collider);d.root.visible=!d.broken||d.age<1.4;}}
  function breakDoor(door){if(door.broken)return;door.broken=true;door.age=0;refreshDoors();}
  // Boats are buoyant damped springs, and carry a rider through their movement.
  const boats=[];
  for(const [id,x,z,angle]of [[0,-16,21,-.7],[1,-25,-1,-.35]]){const root=new THREE.Group(),hull=new AirstripPastaBatch(M.toasted),rim=new AirstripPastaBatch(M.cream),seats=new AirstripPastaBatch(M.tomato);for(let y=-.5;y<=.65;y+=.15){const scale=.7+(y+.5)*.23;hull.tube(pastaCircle(0,y,0,2.6*scale,1.3*scale,36),.105,6);}deck(seats,-2.35,2.35,-.95,.95,.65,.11);for(let k=0;k<3;k++)rim.tube(pastaCircle(0,.67+k*.11,0,2.65,1.32,36),.095,6);hull.finish(root,'Buoyant woven pasta hull');rim.finish(root,'Spaghetti gunwale');seats.finish(root,'Tomato linguine deck');root.position.set(x,0,z);root.rotation.y=angle;group.add(root);const hx=Math.abs(Math.cos(angle))*2.3+Math.abs(Math.sin(angle))*1.0,hz=Math.abs(Math.sin(angle))*2.3+Math.abs(Math.cos(angle))*1.0,collider={minX:x-hx,maxX:x+hx,minZ:z-hz,maxZ:z+hz,bottom:-.6,top:.65,kind:'buoyant-boat'};colliders.push(collider);boats.push({id,x,z,angle,root,collider,y:0,previousY:0,velocity:0,deck:.65});}
  // Eight short free strands respond to gravity, wind and end constraints on
  // each mooring; a separate constraint strip makes the flag visibly soft.
  const strandSpecs=[{a:V(36,4.8,25),b:V(36,4.8,34),count:13,slack:1.06},{a:V(-18.5,.9,21),b:V(-13.5,.9,21),count:12,slack:1.08},{a:V(-27.5,.9,-1),b:V(-22.5,.9,-1),count:12,slack:1.08}];
  const strands=strandSpecs.map(spec=>({...spec,nodes:Array.from({length:spec.count},(_,i)=>spec.a.clone().lerp(spec.b,i/(spec.count-1))),previous:Array.from({length:spec.count},(_,i)=>spec.a.clone().lerp(spec.b,i/(spec.count-1)))}));
  const noodleMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.075,.075,1,6,1,true),M.cream,40);noodleMesh.name='Gravity-constrained mooring spaghetti';noodleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);noodleMesh.frustumCulled=false;noodleMesh.castShadow=true;group.add(noodleMesh);const dummy=new THREE.Object3D(),up=V(0,1,0);
  const flagBatch=new AirstripPastaBatch(M.toasted);braid(flagBatch,V(34,3.2,25),V(34,12,25),.16,4);flagBatch.finish(group,'Braided flagpole');
  const flag=new THREE.InstancedMesh(new THREE.CylinderGeometry(.08,.08,1,6,1,true),M.tomato,32);flag.name='Soft tomato-pasta windsock';flag.instanceMatrix.setUsage(THREE.DynamicDrawUsage);flag.frustumCulled=false;flag.castShadow=true;group.add(flag);const flagNodes=Array.from({length:9},(_,i)=>V(34+i*.35,11.6-i*.08,25)),flagOld=flagNodes.map(p=>p.clone());
  function setSegment(mesh,index,a,c,r=1){const delta=c.clone().sub(a),length=delta.length();dummy.position.copy(a).add(c).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,length>1e-8?delta.multiplyScalar(1/length):up);dummy.scale.set(r,Math.max(.001,length),r);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);}
  function atBoat(x,z,boat){const dx=x-boat.x,dz=z-boat.z,xx=dx*Math.cos(boat.angle)-dz*Math.sin(boat.angle),zz=dx*Math.sin(boat.angle)+dz*Math.cos(boat.angle);return Math.abs(xx)<2.4&&Math.abs(zz)<1.1;}
  function heightAt(x,z,reference=playerY){let h=-.15;if(x>=runway.x0&&x<=runway.x1&&z>=runway.z0&&z<=runway.z1)h=3.2;if(x>=arm.x0&&x<=arm.x1&&z>=arm.z0&&z<=arm.z1&&reference>2.6)h=Math.max(h,3.2);if(Math.abs(x)<4&&z>=32&&z<=43)h=Math.max(h,3.2*(43-z)/11);for(const boat of boats)if(atBoat(x,z,boat)&&boat.deck+boat.y<=reference+.56)h=Math.max(h,boat.deck+boat.y);return h;}
  function isGround(x,z){return x>=-8&&x<=8&&z>=-44&&z<=32||x>=8&&x<=36&&z>=24&&z<=34&&playerY>2.6||Math.abs(x)<4&&z>=32&&z<=43;}
  function update(dt,time,player){dt=clamp(Number.isFinite(dt)?dt:0,0,.05);clock=Number.isFinite(time)?time:clock+dt;if(player)playerY=player.position.y;for(const door of doors){if(!door.broken&&episode===2&&player?.turboActive&&((player.speed>10&&(door.x-player.position.x)*player.velocity.x>0&&Math.abs(player.velocity.x)>6&&Math.abs(player.position.x-door.x)<.58+Math.abs(player.velocity.x)*dt)||(Math.abs(player.position.x-door.x)<=.58&&(door.x-player.position.x)*Math.sin(player.heading)>0&&Math.abs(Math.sin(player.heading))>.6))&&Math.abs(player.position.z-29)<3.45&&player.position.y+1.9>3.2&&player.position.y<6.7)breakDoor(door);if(door.broken){door.age+=dt;door.root.visible=door.age<1.4;door.root.rotation.z=Math.min(1.6,door.age*2);door.root.position.y=3.2-Math.max(0,door.age-.12)**2*4;}}
    for(const boat of boats){boat.previousY=boat.y;const load=player&&atBoat(player.position.x,player.position.z,boat)&&Math.abs(player.position.y-(boat.y+boat.deck))<.35?.12:0,target=Math.sin(clock*1.7+boat.id)*.08-load;boat.velocity+=(target-boat.y)*24*dt;boat.velocity*=Math.exp(-5*dt);boat.y+=boat.velocity*dt;boat.root.position.y=boat.y;boat.collider.top=boat.deck+boat.y;boat.collider.bottom=-.6+boat.y;}
    let cursor=0;for(let s=0;s<strands.length;s++){const strand=strands[s],row=strand.nodes,old=strand.previous,a=strand.a.clone(),c=strand.b.clone();if(s>0){a.y+=boats[s-1].y;c.y+=boats[s-1].y;}for(let i=1;i<row.length-1;i++){const before=row[i].clone();row[i].add(row[i].clone().sub(old[i]).multiplyScalar(.97));row[i].y-=9*dt*dt;row[i].z+=Math.sin(clock*1.3+i*.5)*dt*dt*.65;old[i].copy(before);}const rest=a.distanceTo(c)/(row.length-1)*strand.slack;for(let pass=0;pass<7;pass++){row[0].copy(a);row.at(-1).copy(c);for(let i=0;i<row.length-1;i++){const d=row[i+1].clone().sub(row[i]),l=d.length()||1;d.multiplyScalar((l-rest)/l*.5);if(i)row[i].add(d);if(i+1<row.length-1)row[i+1].sub(d);}}for(let i=0;i<row.length-1;i++)setSegment(noodleMesh,cursor++,row[i],row[i+1]);}noodleMesh.count=cursor;noodleMesh.instanceMatrix.needsUpdate=true;
    for(let i=1;i<flagNodes.length;i++){const p=flagNodes[i],before=p.clone();p.add(p.clone().sub(flagOld[i]).multiplyScalar(.96));p.y-=dt*dt*7;p.x+=dt*dt*8;p.z+=Math.sin(clock*2.1+i*.4)*dt*dt*4;flagOld[i].copy(before);}for(let pass=0;pass<8;pass++){flagNodes[0].set(34,11.6,25);for(let i=0;i<8;i++){const d=flagNodes[i+1].clone().sub(flagNodes[i]),l=d.length()||1;d.multiplyScalar((l-.36)/l*.5);if(i)flagNodes[i].add(d);flagNodes[i+1].sub(d);}}cursor=0;for(let j=0;j<4;j++)for(let i=0;i<8;i++)setSegment(flag,cursor++,flagNodes[i].clone().add(V(0,-j*.16,0)),flagNodes[i+1].clone().add(V(0,-j*.16,0)));flag.instanceMatrix.needsUpdate=true;
  }
  function reset(){clock=0;playerY=3.2;fludd=episode===2;turbo=false;for(const door of doors){door.broken=episode===1;door.age=episode===1?5:0;door.root.rotation.set(0,0,0);door.root.position.set(door.x,3.2,29);}refreshDoors();for(const boat of boats){boat.y=boat.previousY=boat.velocity=0;boat.root.position.y=0;}for(const s of strands)for(let i=0;i<s.nodes.length;i++){s.nodes[i].copy(s.a).lerp(s.b,i/(s.nodes.length-1));s.previous[i].copy(s.nodes[i]);}for(let i=0;i<9;i++){flagNodes[i].set(34+i*.35,11.6-i*.08,25);flagOld[i].copy(flagNodes[i]);}update(0,0,null);}
  reset();
  return{group,episode,bounds,colliders,landmarks,redCoinPositions,turboRoute,boats,heightAt,update,reset,preciseGroundPound:true,mode:'airstrip',
    get nozzleAllowed(){return fludd;},get nozzleModes(){return fludd?turbo?['spray','hover','turbo']:['spray','hover']:[];},
    setFLUDD(value=true){fludd=!!value;},unlockTurbo(){turbo=true;fludd=true;},
    surfaceAt(x,z){return isGround(x,z)||boats.some(boat=>atBoat(x,z,boat)&&playerY>.25)?'ground':'water';},
    refillAt(x,z,y){return Math.hypot(x-3,z+37)<2.85&&Math.abs(y-3.2)<.6;},
    platformMotionAt(x,z,y){for(const boat of boats)if(atBoat(x,z,boat)&&Math.abs(y-(boat.previousY+boat.deck))<.35)return{x:0,y:boat.y-boat.previousY,z:0};return null;},
    get mapData(){return{route:episode===2?turboRoute:[landmarks.spawn,landmarks.fludd,landmarks.boss],platforms:[{x:0,z:-6,w:16,d:76,y:3.2,stable:true,support:true},{x:22,z:29,w:28,d:10,y:3.2,stable:true,support:true},{x:0,z:37.5,w:8,d:11,y:1.6,stable:true,support:true}]};},
    getState(){return{episode,fludd,turbo,doors:doors.map(d=>({x:d.x,broken:d.broken,age:d.age})),boats:boats.map(d=>({id:d.id,x:d.x,z:d.z,y:d.y,previousY:d.previousY,velocity:d.velocity,deck:d.deck})),strandNodes:strands.map(s=>s.nodes.map(p=>p.toArray())),flagNodes:flagNodes.map(p=>p.toArray())};}
  };
}
