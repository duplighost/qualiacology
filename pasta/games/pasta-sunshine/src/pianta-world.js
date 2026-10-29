import * as THREE from '../vendor/three.module.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
// Tubes are baked by material so the village can contain individual noodles
// without making every noodle a separate draw call.
class Batch{
  constructor(material){this.material=material;this.p=[];this.n=[];this.uv=[];this.i=[];}
  tube(points,r=.1,sides=6){const first=this.p.length/3;let length=0;for(let j=0;j<points.length;j++){const p=points[j],t=points[Math.min(j+1,points.length-1)].clone().sub(points[Math.max(0,j-1)]);if(t.lengthSq()<1e-10)t.set(0,1,0);t.normalize();const side=V().crossVectors(t,Math.abs(t.y)>.9?V(1,0,0):V(0,1,0)).normalize(),up=V().crossVectors(t,side).normalize();if(j)length+=p.distanceTo(points[j-1]);for(let k=0;k<=sides;k++){const a=k/sides*TAU,n=side.clone().multiplyScalar(Math.cos(a)).addScaledVector(up,Math.sin(a));this.p.push(p.x+n.x*r,p.y+n.y*r,p.z+n.z*r);this.n.push(n.x,n.y,n.z);this.uv.push(length,k/sides);}}for(let j=0;j<points.length-1;j++)for(let k=0;k<sides;k++){const a=first+j*(sides+1)+k,b=a+sides+1;this.i.push(a,b,a+1,b,b+1,a+1);}}
  finish(parent,name){if(!this.p.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));g.setIndex(this.i);g.computeBoundingSphere();const m=new THREE.Mesh(g,this.material);m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
}
const line=(a,b,n=10,w=.012)=>Array.from({length:n+1},(_,j)=>{const t=j/n;return V(lerp(a.x,b.x,t),lerp(a.y,b.y,t)+Math.sin(t*13+a.x)*w,lerp(a.z,b.z,t)+Math.sin(t*11+a.z)*w);});
const circle=(x,y,z,rx,rz,n=38)=>Array.from({length:n+1},(_,i)=>{const a=i/n*TAU;return V(x+Math.cos(a)*rx,y,z+Math.sin(a)*rz);});

export function createPiantaWorld(scene,materials,options={}){
  const episode=options.episode===2?2:1,M=materials,group=new THREE.Group();group.name='Pianta Village — suspended spaghetti settlement';scene.add(group);
  const b=Object.fromEntries(['egg','cream','tomato','spinach','darkGreen','ink','blue','gold','toasted','pale'].map(k=>[k,new Batch(M[k]||M.cream)]));
  const colliders=[],bounds={x0:-48,x1:48,z0:-55,z1:64};let elapsed=0,playerY=2,bridgeLoads=0;
  const pond={x:-4,z:-1,rx:5.7,rz:4.6},spa={x:-23,z:-28,rx:5.2,rz:4.1};
  const trunk={a:V(-14,2,-18),b:V(-24,16,-40),width:3.6};
  const landmarks={spawn:V(0,2,58),bridgeEnd:V(0,2,25.5),owner:V(-5,2,23),racer:V(3,2,24),pond:V(pond.x,.15,pond.z),spa:V(spa.x,.15,spa.z),treeFoot:trunk.a.clone(),flag:V(-26,17,-42),shine:V(-11,7,-7)};
  const raceRoute=[V(3,2,24),V(17,2,20),V(22,2,8),V(18,2,-7),V(13,2,-17),V(1,2,-22),V(-10,2,-21),trunk.a.clone(),V(-18,7.6,-26.8),V(-21,11.8,-33.4),trunk.b.clone(),landmarks.flag.clone()];
  const villageRect={x0:-34,x1:34,z0:-37,z1:27};
  const pondDistance=(x,z,p)=>Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz);
  const inWater=(x,z)=>pondDistance(x,z,pond)<.91||pondDistance(x,z,spa)<.91;
  function groundHeight(x,z){if(x>=-34&&x<=34&&z>=-37&&z<=27){let h=2;for(const p of [pond,spa]){const d=pondDistance(x,z,p);if(d<1.18)h=Math.min(h,d<.91?.05:lerp(.05,2,(d-.91)/.27));}return h;}if(Math.abs(x)<6.5&&z>=54&&z<=62)return 2;return -80;}
  function deck(batch,x,z,w,d,y,r=.1){for(let zz=z-d/2;zz<=z+d/2+.001;zz+=r*1.94)batch.tube(line(V(x-w/2,y-r,zz),V(x+w/2,y-r,zz),Math.max(4,Math.ceil(w/1.4))),r,6);}
  function braid(batch,a,c,r=.3,count=5){for(let k=0;k<count;k++){const d=c.clone().sub(a),up=d.clone().normalize(),side=V().crossVectors(up,Math.abs(up.y)>.9?V(1,0,0):V(0,1,0)).normalize(),normal=V().crossVectors(up,side).normalize(),points=[];for(let j=0;j<=36;j++){const t=j/36,angle=t*TAU*2+k/count*TAU;points.push(a.clone().lerp(c,t).addScaledVector(side,Math.cos(angle)*r*.65).addScaledVector(normal,Math.sin(angle)*r*.65));}batch.tube(points,r*.4,6);}}
  // Woven egg-pasta ground follows the bowls down into both pasta pools.
  for(let z=-37;z<=27;z+=.34){const p=[];for(let x=-34;x<=34;x+=.85)p.push(V(x,groundHeight(x,z)-.1,z+Math.sin(x*.2+z)*.025));b.egg.tube(p,.105,5);}
  for(let x=-34;x<=34;x+=.6){const p=[];for(let z=-37;z<=27;z+=1.2)p.push(V(x,groundHeight(x,z)-.16+Math.sin(z*.8)*.018,z));b.cream.tube(p,.1,5);}
  deck(b.egg,0,58,13,8,2);
  // The full underside is a supported lattice hung from three giant roots.
  for(let x=-34;x<=34;x+=3.2)b.toasted.tube(line(V(x,.35,-37),V(x,.35,27),36,.06),.19,7);
  for(let z=-37;z<=27;z+=3.2)b.toasted.tube(line(V(-34,.35,z),V(34,.35,z),36,.06),.19,7);
  for(const z of [-37,27])for(let j=0;j<6;j++)b.toasted.tube(line(V(-34,1.6-j*.24,z),V(34,1.6-j*.24,z),40,.03),.15,6);
  for(const x of [-34,34])for(let j=0;j<6;j++)b.toasted.tube(line(V(x,1.6-j*.24,-37),V(x,1.6-j*.24,27),40,.03),.15,6);
  for(const p of [pond,spa]){for(let j=0;j<5;j++)b.cream.tube(circle(p.x,.12+j*.025,p.z,p.rx*(.91-j*.025),p.rz*(.91-j*.025)),.065,5);for(let z=p.z-p.rz*.9;z<=p.z+p.rz*.9;z+=.18){const t=(z-p.z)/(p.rz*.93),half=p.rx*.93*Math.sqrt(Math.max(0,1-t*t));b.blue.tube(line(V(p.x-half,.13,z),V(p.x+half,.13,z),18,.022),.1,6);}for(let j=0;j<4;j++)b.pale.tube(circle(p.x,1.97+j*.07,p.z,p.rx*1.18+j*.07,p.rz*1.18+j*.07),.075,6);}
  // Toasted pathways form the original village loop around the hot puppies.
  const paths=[V(0,2,25),V(16,2,18),V(21,2,3),V(14,2,-15),V(-1,2,-19),V(-19,2,-11),V(-21,2,5),V(-12,2,18),V(0,2,25)];
  for(let j=0;j<paths.length-1;j++){const a=paths[j],c=paths[j+1],d=c.clone().sub(a).normalize(),side=V(-d.z,0,d.x);for(let off=-1.7;off<=1.7;off+=.22)b.toasted.tube(line(a.clone().addScaledVector(side,off).add(V(0,.012,0)),c.clone().addScaledVector(side,off).add(V(0,.012,0)),16,.015),.075,5);}
  function tree(x,z,h,r=2.3){for(let s=0;s<15;s++){const p=[];for(let j=0;j<=50;j++){const t=j/50,a=s/15*TAU+t*.45,rr=r*(1-t*.32)+Math.sin(t*8+s)*.08;p.push(V(x+Math.cos(a)*rr,-10+t*(h+10),z+Math.sin(a)*rr));}b.toasted.tube(p,.21,7);}for(let k=0;k<20;k++){const a=k/20*TAU,p=[];for(let j=0;j<=28;j++){const t=j/28;p.push(V(x+Math.cos(a)*(r+t*8),-.5-Math.sin(t*Math.PI)*2.4-t*4,z+Math.sin(a)*(r+t*8)));}b.toasted.tube(p,.16,6);}for(let k=0;k<26;k++){const a=k/26*TAU,rr=6+(k%3)*1.8;for(let strand=0;strand<4;strand++){const p=[];for(let j=0;j<=24;j++){const t=j/24;p.push(V(x+Math.cos(a)*t*rr+Math.sin(a)*strand*.11,h+Math.sin(t*Math.PI)*2.5-t*3,z+Math.sin(a)*t*rr-Math.cos(a)*strand*.11));}b[k%2?'darkGreen':'spinach'].tube(p,.12,6);}}}
  tree(4,-10,28,3.2);tree(28,17,24,2.1);tree(-29,12,24,2.2);
  for(const [x,z,r]of [[4,-10,2.5],[28,17,1.6],[-29,12,1.6]])colliders.push({minX:x-r,maxX:x+r,minZ:z-r,maxZ:z+r,bottom:-10,top:25,kind:'giant-tree'});
  // The race palm leans over the spa. Its climbable surface is made from
  // bundled linguine and shallow root ridges; the mesh and collision share
  // the same segment projection instead of using an invisible staircase.
  const trunkVector=trunk.b.clone().sub(trunk.a),flat=V(trunkVector.x,0,trunkVector.z),trunkSide=V(-flat.z,0,flat.x).normalize();
  for(let s=-11;s<=11;s++)b.toasted.tube(line(trunk.a.clone().addScaledVector(trunkSide,s*.15).add(V(0,-.13,0)),trunk.b.clone().addScaledVector(trunkSide,s*.15).add(V(0,-.13,0)),50,.018),.095,6);
  for(let j=0;j<=42;j++){const t=j/42,c=trunk.a.clone().lerp(trunk.b,t);b.egg.tube(line(c.clone().addScaledVector(trunkSide,-1.8),c.clone().addScaledVector(trunkSide,1.8),8,.005),.065,6);}
  for(let y=-8;y<16;y+=.28)b.toasted.tube(circle(-24,y,-40,1.7,1.7,32),.16,6);
  const crown=V(-24,18.4,-40);for(let a=0;a<10;a++){const angle=a/10*TAU;for(let s=-2;s<=2;s++){const p=[];for(let j=0;j<=25;j++){const t=j/25;p.push(crown.clone().add(V(Math.cos(angle)*t*8-Math.sin(angle)*s*.16,Math.sin(t*Math.PI)*2.2-t*1.5,Math.sin(angle)*t*8+Math.cos(angle)*s*.16)));}b.spinach.tube(p,.13,6);}}
  deck(b.cream,-25.3,-41,7,6,16,.13);for(let j=0;j<5;j++)b.toasted.tube([V(-28.8,15.8-j*.2,-44),V(-21.8,15.8-j*.2,-44),V(-21.8,15.8-j*.2,-38),V(-28.8,15.8-j*.2,-38)],.13,6);
  braid(b.cream,V(-26,16,-42),V(-26,20.5,-42),.16,4);for(let y=18.7;y<20.2;y+=.16)b.tomato.tube([V(-26,y,-42),V(-24.1,y-.15,-42),V(-24.5,y-.45,-42)],.09,6);
  // Three rounded mushroom stepping caps lead to the Episode 1 reward.
  const mushrooms=[{x:-16,z:-5,y:3.2,r:2.1},{x:-13.4,z:-6,y:4.7,r:1.8},{x:-11,z:-7,y:6,r:2.0},{x:22,z:17,y:5.6,r:3.3},{x:-26,z:-24,y:5.1,r:3.2}];
  for(const m of mushrooms){for(let y=1.9;y<m.y-.5;y+=.22)b.cream.tube(circle(m.x,y,m.z,m.r*.25,m.r*.25,22),.13,6);for(let k=0;k<12;k++){const t=k/11,rr=m.r*Math.sqrt(Math.max(.03,1-(t*.9)**2));b.tomato.tube(circle(m.x,m.y-.5+t*.5,m.z,rr,rr,36),.12,6);}for(let j=0;j<5;j++){const a=j/5*TAU;for(let s=0;s<3;s++)b.pale.tube(circle(m.x+Math.cos(a)*m.r*.58,m.y-.08+s*.04,m.z+Math.sin(a)*m.r*.58,.18+s*.05,.18+s*.05,14),.06,5);}}
  function hut(x,z,color,rotation=0){const w=6,d=5;for(let y=2;y<6.3;y+=.21){const pts=[V(-w/2,y,-d/2),V(w/2,y,-d/2),V(w/2,y,d/2),V(1.1,y,d/2)];const other=[V(-1.1,y,d/2),V(-w/2,y,d/2),V(-w/2,y,-d/2)];for(const p of [pts,other])b.cream.tube(p.map(q=>q.applyAxisAngle(V(0,1,0),rotation).add(V(x,0,z))),.12,6);}for(let xx=-3.4;xx<=3.4;xx+=.2)for(const side of [-1,1])b[color].tube([V(xx,8.7,0),V(xx,6.2,side*3.1)].map(q=>q.applyAxisAngle(V(0,1,0),rotation).add(V(x,0,z))),.14,6);colliders.push({minX:x-3,maxX:x+3,minZ:z-2.5,maxZ:z+2.5,bottom:2,top:7,kind:'pasta-hut'});}
  hut(-29,0,'tomato');hut(26,-9,'spinach');hut(-2,-31,'tomato');hut(25,24,'spinach');
  // Lower fence and its obvious gap are part of the running route.
  for(const [a,c]of [[V(8,2,18),V(8,2,11)],[V(8,2,5),V(8,2,-2)],[V(-9,2,17),V(-3,2,17)]]){for(let h=.35;h<1.3;h+=.42)b.cream.tube(line(a.clone().add(V(0,h,0)),c.clone().add(V(0,h,0))),.085,6);const length=a.distanceTo(c);for(let d=0;d<=length;d+=1.3)braid(b.egg,a.clone().lerp(c,d/length),a.clone().lerp(c,d/length).add(V(0,1.5,0)),.12,3);colliders.push({minX:Math.min(a.x,c.x)-.12,maxX:Math.max(a.x,c.x)+.12,minZ:Math.min(a.z,c.z)-.12,maxZ:Math.max(a.z,c.z)+.12,bottom:2,top:3.3,kind:'pasta-fence'});}
  // Far cloud nests, a moon and stars are themselves strands of pale pasta.
  for(let k=0;k<9;k++){const x=-60+k*15,z=-67-(k%3)*4;for(let s=0;s<6;s++){const p=[];for(let j=0;j<=35;j++){const a=j/35*TAU*2;p.push(V(x+Math.cos(a)*3+s*.65,18+Math.sin(a)*.8+k%2*7,z+j*.09));}b.pale.tube(p,.16,6);}}
  if(episode===1){for(let j=0;j<17;j++){const r=.1+j*.13,p=[];for(let k=0;k<=40;k++){const a=k/40*TAU;p.push(V(39+Math.cos(a)*r,29+Math.sin(a)*r,-55));}b.pale.tube(p,.085,6);}for(let i=0;i<25;i++){const x=-65+(i*37)%130,y=25+(i*11)%20,z=-65-(i%4)*2;b.pale.tube([V(x-.12,y,z),V(x,y+.3,z),V(x+.12,y,z),V(x,y-.3,z),V(x-.12,y,z)],.045,5);}}
  for(const [key,batch]of Object.entries(b))batch.finish(group,key+' village pasta');
  // Individually sprung bridge slats and constrained handrails sag under the
  // player's load. Eight simulation passes keep the long noodles attached.
  const bridge=new THREE.Group();bridge.name='Load-bearing spaghetti suspension bridge';group.add(bridge);const planks=[];
  for(let i=0;i<23;i++){const z=27.5+i*1.15,t=(z-27)/27,base=2-.6*Math.sin(t*Math.PI),source=new THREE.Group(),batch=new Batch(M.toasted);deck(batch,0,0,5,1.11,0,.11);batch.finish(source,'Bound pasta bridge slat');source.position.set(0,base,z);bridge.add(source);planks.push({z,base,y:base,previousY:base,velocity:0,mesh:source});}
  const railNodes=[-2.8,2.8].map(x=>Array.from({length:25},(_,i)=>V(x,4.1-1.0*Math.sin(i/24*Math.PI),27+i/24*27))),railPrevious=railNodes.map(row=>row.map(p=>p.clone()));
  const rails=new THREE.InstancedMesh(new THREE.CylinderGeometry(.085,.085,1,6,1,true),M.cream,48+46);rails.name='Constrained pasta handrails and ties';rails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);rails.frustumCulled=false;rails.castShadow=true;bridge.add(rails);const dummy=new THREE.Object3D(),up=V(0,1,0);
  function segment(index,a,c){const d=c.clone().sub(a),len=d.length();dummy.position.copy(a).add(c).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,len>1e-6?d.multiplyScalar(1/len):up);dummy.scale.set(1,Math.max(.001,len),1);dummy.updateMatrix();rails.setMatrixAt(index,dummy.matrix);}
  function bridgeHeight(z,previous=false){const index=clamp((z-27.5)/1.15,0,22),a=Math.floor(index),c=Math.min(22,a+1);return lerp(planks[a][previous?'previousY':'y'],planks[c][previous?'previousY':'y'],index-a);}
  function trunkSurface(x,z){const dx=trunk.b.x-trunk.a.x,dz=trunk.b.z-trunk.a.z,t=((x-trunk.a.x)*dx+(z-trunk.a.z)*dz)/(dx*dx+dz*dz),xx=trunk.a.x+dx*t,zz=trunk.a.z+dz*t;return t>=-.02&&t<=1.02&&Math.hypot(x-xx,z-zz)<trunk.width/2?lerp(trunk.a.y,trunk.b.y,clamp(t)):null;}
  function heightAt(x,z,reference=playerY){let h=groundHeight(x,z);if(Math.abs(x)<=2.55&&z>=26.9&&z<=54.1)h=Math.max(h,bridgeHeight(z));const slope=trunkSurface(x,z);if(slope!==null&&slope<=reference+.7)h=Math.max(h,slope);if(x>-28.8&&x<-21.8&&z>-44&&z<-38&&reference>15.3)h=Math.max(h,16);for(const m of mushrooms)if(Math.hypot(x-m.x,z-m.z)<m.r*.88&&m.y<=reference+.56)h=Math.max(h,m.y);return h;}
  function update(dt,time,player){dt=clamp(Number.isFinite(dt)?dt:0,0,.05);elapsed=Number.isFinite(time)?time:elapsed+dt;if(player)playerY=player.position.y;for(const p of planks){p.previousY=p.y;const loaded=player&&Math.abs(player.position.x)<2.55&&Math.abs(player.position.z-p.z)<1.6&&Math.abs(player.position.y-p.y)<.35;const target=p.base-(loaded?.18:0);p.velocity+=(target-p.y)*36*dt;p.velocity*=Math.exp(-8*dt);p.y+=p.velocity*dt;p.mesh.position.y=p.y;if(loaded&&dt>0)bridgeLoads++;}
    let index=0;for(let side=0;side<2;side++){const row=railNodes[side],old=railPrevious[side],x=side===0?-2.8:2.8;for(let i=1;i<24;i++){const point=row[i],before=point.clone();point.add(point.clone().sub(old[i]).multiplyScalar(.975));point.y-=dt*dt*9;old[i].copy(before);}for(let pass=0;pass<8;pass++){row[0].set(x,4.1,27);row[24].set(x,4.1,54);for(let i=0;i<24;i++){const a=row[i],c=row[i+1],d=c.clone().sub(a),len=d.length()||1,delta=(len-1.142)/len;d.multiplyScalar(delta*.5);if(i)a.add(d);if(i+1<24)c.sub(d);}for(let i=1;i<24;i++){row[i].x=lerp(row[i].x,x,.15);const target=bridgeHeight(row[i].z)+1.55;row[i].y=Math.max(target,row[i].y);}}for(let i=0;i<24;i++)segment(index++,row[i],row[i+1]);for(let i=0;i<23;i++)segment(index++,V(x,planks[i].y+.02,planks[i].z),row[i+1]);}rails.count=index;rails.instanceMatrix.needsUpdate=true;
  }
  function reset(){elapsed=0;playerY=2;bridgeLoads=0;for(const p of planks){p.y=p.previousY=p.base;p.velocity=0;p.mesh.position.y=p.base;}for(let side=0;side<2;side++)for(let i=0;i<25;i++){railNodes[side][i].set(side===0?-2.8:2.8,4.1-1.0*Math.sin(i/24*Math.PI),27+i/24*27);railPrevious[side][i].copy(railNodes[side][i]);}update(0,0,null);}
  reset();
  return {group,episode,landmarks,pond,spa,trunk,mushrooms,paths,raceRoute,bounds,colliders,heightAt,update,reset,nozzleAllowed:true,mode:'village',
    surfaceAt(x,z){return inWater(x,z)?'water':heightAt(x,z)<-50?'void':'ground';},
    refillAt(x,z,y=2){return inWater(x,z)&&y<.8;},
    inPond(x,z){return pondDistance(x,z,pond)<.9;},
    platformMotionAt(x,z,y){if(Math.abs(x)<2.55&&z>=27&&z<=54&&Math.abs(y-bridgeHeight(z,true))<.35)return{x:0,y:bridgeHeight(z)-bridgeHeight(z,true),z:0};return null;},
    get mapData(){return{route:episode===1?paths:raceRoute,platforms:[{x:0,z:-5,w:68,d:64,y:2,stable:true,support:true},{x:0,z:40.5,w:5,d:27,y:2,stable:true,support:true}]};},
    getState(){return{episode,night:episode===1,mode:'village',bridgeLoads,bridge:planks.map(p=>({x:0,z:p.z,y:p.y,base:p.base,velocity:p.velocity})),railNodes:railNodes.map(row=>row.map(p=>p.toArray())),flag:landmarks.flag.clone()};}
  };
}
