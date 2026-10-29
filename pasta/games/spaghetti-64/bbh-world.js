import * as THREE from './vendor/three.module.js';
import {BbhMission} from './bbh-mission.js';

const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const vec=p=>p?.isVector3?p.clone():Array.isArray(p)?new THREE.Vector3(...p):new THREE.Vector3(p.x,p.y,p.z);
const rng=(s=6417)=>()=>{s=(Math.imul(s,1664525)+1013904223)|0;return(s>>>0)/4294967296;};
const horizontal=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const palette={
  spooky_09000000:['ink','#a4a2ae'],spooky_09000800:['toasted','#c2b2a1'],
  spooky_09001800:['ink','#a4a3b2'],spooky_09002800:['toasted','#c0b0a0'],
  spooky_09003800:['toasted','#c8baa6'],spooky_09004800:['ink','#b0acbd'],
  spooky_09005000:['toasted','#c6b89e'],spooky_09006000:['blue','#c0c6d3'],
  spooky_09006800:['toasted','#c3ac8d'],spooky_09007000:['ink','#a9b1b4'],
  spooky_09008000:['blue','#adb9d0'],spooky_09008800:['ink','#b6b5c3'],
  spooky_09009000:['toasted','#cbbca3'],spooky_0900A000:['spinach','#b2b5a7'],
  bbh_seg7_texture_07000000:['ink','#b7b2c4'],bbh_seg7_texture_07001000:['toasted','#cdbda1'],
  bbh_seg7_texture_07001800:['ink','#a8b5c4'],bbh_seg7_texture_07002000:['blue','#acb3c9'],
};
const shadowIDs=new Set(['spooky_0900A800','spooky_0900B000','spooky_0900B800']);
// The source's colored window/light decals are replaced with lit noodle
// geometry; its railings, floor grates and perimeter fence remain open grids.
const latticeIDs=new Set(['spooky_09008000','spooky_09000000','bbh_seg7_texture_07001800']);
function mesh(kit,geometries,material){const m=new THREE.Mesh(kit.mergeGeometry(geometries),material);m.castShadow=m.receiveShadow=true;for(const g of geometries)g.dispose();return m;}
function facesGeometry(vertices,faces,scale=2.6){
  const ps=[],ns=[],uv=[];
  for(const f of faces){const a=vec(vertices[f[0]]),b=vec(vertices[f[1]]),c=vec(vertices[f[2]]),n=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),axis=Math.abs(n.y)>.5?'y':Math.abs(n.x)>Math.abs(n.z)?'x':'z';
    for(const p of[a,b,c]){ps.push(p.x,p.y,p.z);ns.push(n.x,n.y,n.z);uv.push((axis==='x'?p.z:p.x)/scale,(axis==='y'?p.z:p.y)/scale);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(ns,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeBoundingSphere();return g;
}
function latticeGeometry(kit,vertices,faces,material){
  const gs=[],spacing=.37;
  for(const f of faces){const p=f.slice(0,3).map(i=>vec(vertices[i])),n=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize(),axes=Math.abs(n.y)>.6?['x','z']:Math.abs(n.x)>Math.abs(n.z)?['y','z']:['x','y'];
    for(const axis of axes){const low=Math.min(...p.map(v=>v[axis])),high=Math.max(...p.map(v=>v[axis]));for(let q=Math.ceil(low/spacing)*spacing;q<=high;q+=spacing){const hits=[];
        for(let i=0;i<3;i++){const a=p[i],b=p[(i+1)%3],d=b[axis]-a[axis];if(Math.abs(d)<1e-7)continue;const t=(q-a[axis])/d;if(t>=0&&t<=1){const hit=a.clone().lerp(b,t).addScaledVector(n,.008);if(!hits.some(h=>h.distanceToSquared(hit)<1e-7))hits.push(hit);}}
        if(hits.length===2&&hits[0].distanceTo(hits[1])>.035)gs.push(kit.noodleGeometry(hits,.034,2,5));}}
  }return mesh(kit,gs,material);
}
function noodlePanel(kit,width,height,depth,material,{vertical=true,spacing=.09}={}){
  const gs=[];for(let i=0;i<=Math.ceil((vertical?width:height)/spacing);i++){const t=i/Math.ceil((vertical?width:height)/spacing);
    gs.push(kit.noodleGeometry(vertical?[[width*(t-.5),0,0],[width*(t-.5)+.012,height*.5,depth*.15],[width*(t-.5),height,0]]:[[-width/2,height*t,0],[0,height*t+.012,depth*.15],[width/2,height*t,0]],spacing*.48,8,5));}
  return mesh(kit,gs,material);
}
function wireBox(kit,width,height,depth,material){
  const g=new THREE.Group();for(const z of[-depth/2,depth/2]){const p=noodlePanel(kit,width,height,depth,material);p.position.z=z;g.add(p);}
  for(const x of[-width/2,width/2]){const p=noodlePanel(kit,depth,height,width,material);p.position.x=x;p.rotation.y=Math.PI/2;g.add(p);}
  const lid=noodlePanel(kit,width,depth,height,material);lid.rotation.x=Math.PI/2;lid.position.set(0,height,-depth/2);g.add(lid);return g;
}

// Milk-white rice spaghetti is wound into a Boo's volume. Covering the eyes
// folds the noodle arms inward; drag and impact drive damped body deformation.
// The hanging ends use constrained Verlet motion rather than rigid keyframes.
export function createBbhBoo(kit,{boss=false,whiteMaterial=kit.materials.white}={}){
  const root=new THREE.Group(),body=new THREE.Group(),hands=[],tails=[],mats=[];root.name=boss?'Big Boo King of rice spaghetti':'Boo ghost of rice spaghetti';root.add(body);
  const clone=m=>{const c=m.clone();c.transparent=true;c.opacity=1;c.depthWrite=false;c.roughness=.22;c.clearcoat=.82;mats.push(c);return c;};
  const rice=clone(whiteMaterial),ink=clone(kit.materials.ink),pink=clone(kit.materials.pink),cream=clone(kit.materials.egg);
  rice.color.set('#e6eee8');rice.transmission=.08;rice.thickness=.12;rice.ior=1.43;rice.sheen=.25;
  const gs=[kit.winding(.86,.83,.77,.034,103,33)];
  for(let i=0;i<11;i++){const a=i/11*TAU,ps=[];for(let j=0;j<=16;j++){const t=j/16,phi=.15+t*(Math.PI-.28),r=Math.sin(phi);ps.push([Math.cos(a+t*.22)*.87*r,Math.cos(phi)*.82,Math.sin(a+t*.22)*.78*r]);}gs.push(kit.noodleGeometry(ps,.028,28,5));}
  const shell=mesh(kit,gs,rice);body.add(shell);const rest=shell.geometry.attributes.position.array.slice();
  const mouth=kit.coilBall(.34,ink,99);mouth.scale.set(1.25,.66,.15);mouth.position.set(0,-.16,.73);body.add(mouth);
  const features=[];for(const s of[-1,1]){
    features.push(kit.noodleGeometry([[s*.16,.41,.70],[s*.23,.31,.76],[s*.24,.15,.80]],.055,9,5));
    features.push(kit.noodleGeometry([[s*.10,.47,.69],[s*.26,.43,.73],[s*.36,.48,.65]],.038,9,5));
    const hand=new THREE.Group();hand.position.set(s*.68,-.02,.05);const fingers=[];
    for(let i=0;i<5;i++){const q=i/4;fingers.push(kit.noodleGeometry([[s*.02,0,-.02],[s*(.22+q*.06),.11-q*.08,.12],[s*(.36-q*.035),.05-q*.09,.29],[s*(.24-q*.03),-.04-q*.08,.30]],.034,15,5));}
    hand.add(mesh(kit,fingers,rice));body.add(hand);hands.push(hand);
  }body.add(mesh(kit,features,ink));
  const teeth=[];for(const x of[-.21,.21])teeth.push(kit.noodleGeometry([[x-.07,-.04,.77],[x,-.19,.83],[x+.06,-.035,.78]],.024,8,5));body.add(mesh(kit,teeth,cream));
  const tongue=new THREE.Group(),tongueGs=[];for(let i=0;i<7;i++){const x=(i-3)*.033;tongueGs.push(kit.noodleGeometry([[x,-.20,.78],[x,-.33,.90],[x*.9,-.39,.99],[x*.6,-.35,1.05]],.024,16,5));}tongue.add(mesh(kit,tongueGs,pink));body.add(tongue);
  for(let i=0;i<8;i++){const a=i/8*TAU,anchor=new THREE.Vector3(Math.cos(a)*.42,-.67,Math.sin(a)*.38),points=Array.from({length:6},(_,j)=>anchor.clone().add(new THREE.Vector3(Math.sin(a+j*.4)*j*.012,-j*.068,Math.cos(a)*j*.024))),geo=kit.noodleGeometry(points,.023,5,5),m=new THREE.Mesh(geo,rice);body.add(m);tails.push({anchor,points,previous:points.map(p=>p.clone()),mesh:m,phase:a});}
  let cover=0,coverV=0,squash=1,squashV=0,lastPosition=null,vel=new THREE.Vector3();
  root.userData.update=(dt,state={},time=0)=>{
    dt=Math.min(.04,Math.max(0,dt));const shy=state.shy||state.state==='shy',hit=(state.hitTimer||0)>0;
    coverV+=(Number(shy)-cover)*45*dt;coverV*=Math.exp(-9*dt);cover=clamp(cover+coverV*dt,0,1);
    const target=hit?.78:1;squashV+=(target-squash)*54*dt;squashV*=Math.exp(-7*dt);squash=clamp(squash+squashV*dt,.65,1.22);
    if(lastPosition&&dt)vel.copy(root.position).sub(lastPosition).multiplyScalar(1/dt);else vel.set(0,0,0);lastPosition=root.position.clone();
    const yscale=squash+Math.sin(time*2.8)*.019;body.scale.set(1/Math.sqrt(yscale),yscale,1/Math.sqrt(yscale));
    body.rotation.z=clamp(-vel.x*.008,-.12,.12);body.rotation.x=clamp(vel.z*.008,-.12,.12);
    const pos=shell.geometry.attributes.position;for(let i=0;i<pos.count;i++){const k=i*3,x=rest[k],y=rest[k+1],z=rest[k+2],bend=Math.max(0,.45-y);pos.array[k]=x+Math.sin(time*2.2+y*4+z*3)*.012*bend;pos.array[k+1]=y;pos.array[k+2]=z+Math.cos(time*2+y*5+x*3)*.014*bend;}pos.needsUpdate=true;
    hands.forEach((h,i)=>{const s=i?1:-1;h.position.set(s*(.68-cover*.34),-.02+cover*.27,.05+cover*.51);h.rotation.y=-s*cover*.92;h.rotation.z=s*(cover*.23+Math.sin(time*2+i)*.10);});
    tongue.scale.y=1-cover*.55;tongue.rotation.x=Math.sin(time*3.3)*.10;
    for(const tail of tails){const {points,previous,anchor}=tail;for(let j=1;j<points.length;j++){const p=points[j],old=p.clone(),q=previous[j];p.add(p.clone().sub(q).multiplyScalar(Math.exp(-5*dt)));p.y-=1.8*dt*dt;p.x+=(Math.sin(time*2+tail.phase)*.18-vel.x*.25)*dt*dt;p.z+=(Math.cos(time*1.9+tail.phase)*.18-vel.z*.25)*dt*dt;previous[j].copy(old);}points[0].copy(anchor);previous[0].copy(anchor);
      for(let k=0;k<4;k++)for(let j=1;j<points.length;j++){const delta=points[j].clone().sub(points[j-1]),len=delta.length()||1,correction=delta.multiplyScalar((len-.077)/len);if(j===1)points[j].sub(correction);else{points[j].addScaledVector(correction,-.5);points[j-1].addScaledVector(correction,.5);}}
      const geometry=tail.mesh.geometry,positions=geometry.attributes.position,normals=geometry.attributes.normal;
      let previousRight=new THREE.Vector3(1,0,0);for(let j=0;j<points.length;j++){const tangent=points[Math.min(j+1,points.length-1)].clone().sub(points[Math.max(0,j-1)]).normalize(),right=previousRight.clone().addScaledVector(tangent,-previousRight.dot(tangent));if(right.lengthSq()<.001)right.set(0,1,0).addScaledVector(tangent,-tangent.y);right.normalize();const up=new THREE.Vector3().crossVectors(tangent,right).normalize();previousRight=right;
        for(let side=0;side<5;side++){const a=side/5*TAU,n=right.clone().multiplyScalar(Math.cos(a)).addScaledVector(up,Math.sin(a)),index=j*5+side;positions.setXYZ(index,points[j].x+n.x*.023,points[j].y+n.y*.023,points[j].z+n.z*.023);normals.setXYZ(index,n.x,n.y,n.z);}}
      positions.needsUpdate=normals.needsUpdate=true;
    }
    const opacity=clamp(state.opacity??1,0,1);for(const m of mats)m.opacity=opacity;mats.forEach(m=>m.depthWrite=opacity>.97);
  };
  root.userData.reset=()=>{cover=coverV=squashV=0;squash=1;lastPosition=null;};return root;
}

function doorModel(kit){
  const root=new THREE.Group(),hinge=new THREE.Group();root.name='Hinged haunted door of braided toasted pasta';hinge.position.x=-.72;root.add(hinge);
  const panel=noodlePanel(kit,1.4975,2.5,.12,kit.materials.toasted,{spacing:.075});panel.position.x=.72875;hinge.add(panel);
  for(const x of[.045,1.43])hinge.add(kit.bundle([x,.05,.04],[x,2.45,.04],.045,kit.materials.ink,4,73));
  for(const y of[.12,1.4,2.37])hinge.add(kit.bundle([.02,y,.05],[1.46,y,.05],.045,kit.materials.ink,4,14));
  const loop=[];for(let i=0;i<=20;i++){const a=i/20*TAU;loop.push([1.30+Math.cos(a)*.08,1.06+Math.sin(a)*.12,.13]);}hinge.add(kit.strand(loop,.027,kit.materials.saffron,24));root.userData.hinge=hinge;return root;
}
function chairModel(kit){
  const g=new THREE.Group();g.name='Haunted chair of dry bucatini';
  for(const x of[-.43,.43])for(const z of[-.39,.39])g.add(kit.bundle([x,0,z],[x,.76,z],.075,kit.materials.toasted,5,51));
  const seat=noodlePanel(kit,.97,.9,.1,kit.materials.toasted);seat.rotation.x=Math.PI/2;seat.position.set(0,.77,-.45);g.add(seat);
  for(const x of[-.43,.43])g.add(kit.bundle([x,.76,-.39],[x,1.75,-.39],.075,kit.materials.toasted,5,30));
  for(const y of[1.06,1.34,1.65])g.add(kit.bundle([-.43,y,-.39],[.43,y,-.39],.065,kit.materials.toasted,5,48));return g;
}
function pianoModel(kit){
  const root=new THREE.Group(),lid=new THREE.Group();root.name='Mad piano of squid-ink tagliatelle and rice-noodle keys';
  const base=wireBox(kit,2.8,.66,1.8,kit.materials.ink);base.position.y=.48;root.add(base);
  for(const x of[-1.14,1.14])for(const z of[-.6,.6])root.add(kit.bundle([x,0,z],[x,.5,z],.11,kit.materials.ink,6,12));
  lid.position.set(0,1.14,-.9);const top=noodlePanel(kit,2.85,1.85,.12,kit.materials.ink,{spacing:.10});top.rotation.x=Math.PI/2;lid.add(top);root.add(lid);
  for(let i=0;i<21;i++){const key=kit.bundle([-.97+i*.097,.97,.91],[-.97+i*.097,.97,1.20],.045,i%7===1||i%7===3||i%7===6?kit.materials.ink:kit.materials.white,3,14);root.add(key);}
  for(let i=0;i<13;i++){const x=-1.18+i*.196;root.add(kit.strand([[x-.075,1.08,.88],[x,.91,1.08],[x+.075,1.08,.88]],.037,kit.materials.white,9));}
  root.userData.lid=lid;return root;
}
function bookModel(kit){
  const root=new THREE.Group(),left=new THREE.Group(),right=new THREE.Group();root.name='Flying folded-lasagna book';root.add(left,right);
  for(const[g,s]of[[left,-1],[right,1]]){const cover=noodlePanel(kit,.70,.93,.08,kit.materials.tomato,{spacing:.07});cover.position.x=s*.35;cover.rotation.x=Math.PI/2;g.add(cover);
    for(let i=0;i<3;i++){const page=noodlePanel(kit,.65,.87,.05,kit.materials.white,{spacing:.075});page.position.set(s*.34,.035+i*.028,.03);page.rotation.x=Math.PI/2;g.add(page);}}
  root.userData.wings=[left,right];return root;
}
function eyeModel(kit){
  const root=new THREE.Group(),pupil=new THREE.Group();root.name='Mr. I of coiled rice and squid-ink spaghetti';const ball=kit.coilBall(.83,kit.materials.white,17);root.add(ball);
  const iris=kit.coilBall(.38,kit.materials.blue,21);iris.scale.z=.33;pupil.add(iris);const dot=kit.coilBall(.19,kit.materials.ink,17);dot.scale.z=.3;dot.position.z=.13;pupil.add(dot);pupil.position.z=.73;root.add(pupil);return root;
}
function bugModel(kit){
  const root=new THREE.Group(),body=kit.coilBall(.37,kit.materials.saffron,21);body.scale.set(1,1.12,1.22);body.position.y=.61;root.add(body);root.name='Scuttlebug of saffron spaghetti';
  const legs=[];for(const s of[-1,1])for(let i=0;i<3;i++){const z=(i-1)*.24,leg=kit.strand([[s*.25,.63,z],[s*.66,.46,z+.12],[s*.74,.05,z+.21]],.043,kit.materials.ink,14);root.add(leg);legs.push(leg);}
  for(const s of[-1,1])root.add(kit.strand([[s*.15,.82,.36],[s*.15,.72,.42]],.041,kit.materials.ink,4));root.userData.legs=legs;return root;
}
function signModel(kit){const root=kit.pole(1.35,.07);const panel=noodlePanel(kit,1.12,.65,.1,kit.materials.egg);panel.position.y=.92;root.add(panel);return root;}
function flameModel(kit){
  const root=new THREE.Group(),gs=[];root.name='Curled tomato-pasta candle';for(let i=0;i<7;i++){const a=i/7*TAU;gs.push(kit.noodleGeometry([[Math.cos(a)*.13,0,Math.sin(a)*.13],[Math.cos(a+.5)*.18,.34,Math.sin(a+.5)*.18],[Math.cos(a+1)*.06,.69,Math.sin(a+1)*.06],[0,.86,0]],.035,16,5));}root.add(mesh(kit,gs,kit.materials.tomato));return root;
}

export async function createBbhWorld(scene,kit,course,renderData,physics,{onProgress=()=>{},...initialCallbacks}={}){
  // Room-selector surfaces are deliberately intangible in the original game.
  // Keep them in the source room query, but never block Mario or the camera.
  physics.setCourse({...course,triangles:course.triangles.filter(t=>!t[3]?.includes('INTANGIBLE'))});
  const terrain=new THREE.Group(),props=new THREE.Group(),guide=new THREE.Group();terrain.name='Big Boo mansion of original geometry and pasta';props.name='Haunted pasta objects';guide.name='Optional ghost-hunt route';guide.visible=false;scene.add(terrain,props,guide);
  const loaded=await Promise.allSettled(['ink-noodle-surface.png','tagliatelle-surface.png','rice-noodle-surface.png','spaghetti-surface.png'].map(n=>new THREE.TextureLoader().loadAsync('./assets/'+n)));
  const maps=loaded.map(r=>r.status==='fulfilled'?r.value:null);for(const m of maps)if(m){m.wrapS=m.wrapT=THREE.RepeatWrapping;m.colorSpace=THREE.SRGBColorSpace;m.anisotropy=8;}
  const materials={},uniforms={pastaFoot:{value:new THREE.Vector3(1e5,1e5,1e5)},pastaYield:{value:.025}};
  function materialFor(id){if(materials[id])return materials[id];const[type,color]=palette[id]||['toasted','#c7bdad'],map=(type==='ink'?maps[0]:type==='toasted'?maps[1]:type==='white'?maps[2]:maps[3])||maps[3],m=new THREE.MeshPhysicalMaterial({color,map,bumpMap:map,bumpScale:.031,roughness:type==='ink'?.28:.35,metalness:0,clearcoat:.68,clearcoatRoughness:.22,ior:1.45,sheen:.14,sheenColor:new THREE.Color('#d4d7d0'),side:THREE.DoubleSide});
    m.name=type==='ink'?'Glossy squid-ink tagliatelle':'Toasted and infused pasta';m.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='uniform vec3 pastaFoot; uniform float pastaYield;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat pastaD=distance(position.xz,pastaFoot.xz); float pastaH=abs(position.y-pastaFoot.y); transformed.y-=exp(-pastaD*pastaD*1.6)*exp(-pastaH*pastaH*2.0)*pastaYield;');};materials[id]=m;return m;}
  const callbacks={...initialCallbacks},mission=new BbhMission(physics,course),world={terrain,props,guide,materials,callbacks,mission,area:1,activeCourse:course,coins:[],enemies:[],friends:[],rollingBalls:[],chomp:null,signs:[],routePoints:(course.route||[]).map(vec),bossSpawn:vec(course.mission.boss.position),starPosition:vec(course.mission.star.position),roomId:13,roomName:'Mansion grounds',inside:false,doors:[],platforms:[],hazards:[],ghostMeshes:[],roomGroups:new Map()};mission.world=world;
  Object.defineProperty(world,'starCollectible',{get:()=>mission.starCollectible});
  Object.defineProperty(world,'mapGoal',{get:()=>mission.starReady?mission.starPosition:mission.active?mission.position:(mission.ghosts?.find(g=>g.alive&&g.room===world.roomId)||mission.ghosts?.find(g=>g.alive))?.position||world.bossSpawn});
  const roomTriangles=[];
  for(let i=0;i<course.triangles.length;i++){const f=course.triangles[i],a=vec(course.vertices[f[0]]),b=vec(course.vertices[f[1]]),c=vec(course.vertices[f[2]]),n=b.clone().sub(a).cross(c.clone().sub(a));if(n.y<=.0001)continue;const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-8)continue;roomTriangles.push({a,b,c,n,den,room:course.triangleRooms?.[i]||0,minX:Math.min(a.x,b.x,c.x),maxX:Math.max(a.x,b.x,c.x),minZ:Math.min(a.z,b.z,c.z),maxZ:Math.max(a.z,b.z,c.z)});}
  function roomAt(position){const p=vec(position),dynamicFloor=physics.groundAt(p.x,p.z,p.y+.65);if(dynamicFloor?.triangle.dynamic){const d=(course.dynamic||[]).find(d=>(d.id||d.kind)===dynamicFloor.triangle.dynamic);if(d?.room)return d.room;}
    let floor=-Infinity,room=0;for(const t of roomTriangles){if(p.x<t.minX-.005||p.x>t.maxX+.005||p.z<t.minZ-.005||p.z>t.maxZ+.005)continue;const u=((t.b.z-t.c.z)*(p.x-t.c.x)+(t.c.x-t.b.x)*(p.z-t.c.z))/t.den,v=((t.c.z-t.a.z)*(p.x-t.c.x)+(t.a.x-t.c.x)*(p.z-t.c.z))/t.den;if(u<-.001||v<-.001||u+v>1.001)continue;const y=t.a.y-(t.n.x*(p.x-t.a.x)+t.n.z*(p.z-t.a.z))/t.n.y;if(y>p.y+.65||y<floor-.005)continue;floor=y;room=t.room;}return room||world.roomId||13;}
  world.roomAt=roomAt;
  const names=course.roomNames||{1:'Main hall',2:'Right trap room',3:'Piano room',4:'Tumbling bridge room',5:'Haunted library',6:'Upper haunted books',7:'Coffin room',8:'Mr. I room',9:'Attic',10:'Merry-go-round cellar',11:'Cellar corridor',12:'Elevator shed',13:'Mansion grounds'};
  const canonical=room=>{const lists=renderData.roomDisplayLists?.[room]||[];return Object.keys(names).map(Number).filter(r=>(renderData.roomDisplayLists?.[r]||[]).some(d=>lists.includes(d)));};
  function isVisibleRoom(room){if(!room||room===world.roomId)return true;const active=renderData.roomDisplayLists?.[world.roomId],other=renderData.roomDisplayLists?.[room];return !active||!other||other.every(id=>active.includes(id));}
  const objectRecords=[],terrainGroups=[];
  function place(m,p,yaw=0,room){m.position.copy(vec(p));m.rotation.y=yaw*Math.PI/180;props.add(m);const record={mesh:m,room:room??roomAt(m.position)};objectRecords.push(record);return m;}
  function addFaces(vertices,faces,parent,{split=false,loose=0,seed=63}={}){
    const groups=new Map();for(const f of faces){if(shadowIDs.has(f[3]))continue;const key=(split?(f[5]||'all')+'|':'')+(f[3]||'spooky_09003800');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);}
    const random=rng(seed);for(const[key,fs]of groups){const id=fs[0][3],dl=split?fs[0][5]:null,m=latticeIDs.has(id)?latticeGeometry(kit,vertices,fs,kit.materials.ink):new THREE.Mesh(facesGeometry(vertices,fs),materialFor(id));m.castShadow=m.receiveShadow=true;parent.add(m);if(split)terrainGroups.push({mesh:m,dl});
      if(loose&&!latticeIDs.has(id)){const strands=[];for(const f of fs){const a=vec(vertices[f[0]]),b=vec(vertices[f[1]]),c=vec(vertices[f[2]]),n=b.clone().sub(a).cross(c.clone().sub(a)),ar=n.length()/2;n.normalize();if(ar<.06)continue;const count=Math.min(18,Math.max(0,Math.round(ar*loose)));for(let j=0;j<count;j++){let u=random(),w=random();if(u+w>1){u=1-u;w=1-w;}const p=a.clone().addScaledVector(b.clone().sub(a),u).addScaledVector(c.clone().sub(a),w).addScaledVector(n,.024),tangent=b.clone().sub(a).normalize(),bitangent=new THREE.Vector3().crossVectors(n,tangent),length=.33+random()*.65,ps=[];
            for(let k=0;k<6;k++){const t=(k/5-.5)*length;ps.push(p.clone().addScaledVector(tangent,t).addScaledVector(bitangent,Math.sin(t*5+j)*.024));}strands.push(kit.noodleGeometry(ps,.021,6,5));}}
        if(strands.length){const type=(palette[id]||['toasted'])[0],noodles=mesh(kit,strands,kit.materials[type]||kit.materials.toasted);parent.add(noodles);if(split)terrainGroups.push({mesh:noodles,dl});}}
    }
  }
  addFaces(renderData.vertices,renderData.triangles,terrain,{split:true,loose:.18});onProgress(30);
  function addCoin(position,{value=1,blue=false,red=false,transient=false}={}){const p=vec(position),m=kit.coin(blue?.36:.29,red);if(blue)m.traverse(o=>{if(o.isMesh)o.material=kit.materials.blue;});m.position.copy(p);props.add(m);const c={mesh:m,position:p,value,collected:false,phase:world.coins.length*.73,room:roomAt(p),transient};world.coins.push(c);return c;}
  world.spawnBlueCoin=ghost=>{const p=vec(ghost.position),f=physics.groundAt(p.x,p.z,p.y+3);p.y=(f?.height??p.y)+.6;return addCoin(p,{value:5,blue:true,transient:true});};
  const white=kit.materials.white.clone();white.name='Milk-white cooked rice spaghetti';white.color.set('#e5eee7');white.roughness=.23;materials.rice=white;
  // The two library ghosts start behind this source portrait wall. The image
  // itself is another layered serving of pasta, with noodle eyes and hands.
  for(const side of[1,-1]){const portrait=new THREE.Group(),boo=createBbhBoo(kit,{whiteMaterial:white});boo.scale.set(1.72,1.72,.14);portrait.add(boo);for(let i=0;i<40;i++)boo.userData.update(.025,{shy:true,opacity:1},0);
    for(const x of[-2.58,2.58])portrait.add(kit.bundle([x,-2.56,0],[x,2.56,0],.075,kit.materials.toasted,6,22));for(const y of[-2.56,2.56])portrait.add(kit.bundle([-2.58,y,0],[2.58,y,0],.075,kit.materials.toasted,6,23));
    place(portrait,[-15.35,3.58,side>0?-2.35:-3.77],side>0?0:180,5);}
  for(const ghost of mission.ghosts||[]){ghost.room=roomAt(ghost.home||ghost.position);const m=createBbhBoo(kit,{whiteMaterial:white});props.add(m);world.ghostMeshes.push({mesh:m,ghost});}
  const bossMesh=createBbhBoo(kit,{boss:true,whiteMaterial:white});props.add(bossMesh);world.bossMesh=bossMesh;
  const random=rng(999),flames=[],water=[],bookSpawners=[],projectiles=[];world.projectiles=projectiles;
  for(const o of course.objects||[]){const k=o.kind,p=o.position,yaw=o.yaw||0,room=roomAt(vec(p));
    if(k==='special_haunted_door'){const m=place(doorModel(kit),p,yaw,0),a=yaw*Math.PI/180,position=vec(p),sourceDoor=course.doors?.find(d=>vec(d.position).distanceToSquared(position)<.0001);world.doors.push({id:'haunted_door_'+world.doors.length,mesh:m,position,yaw:a,open:0,hold:0,sign:1,rooms:sourceDoor?.rooms||o.rooms||[roomAt(position.clone().add(new THREE.Vector3(Math.sin(a)*2,0,Math.cos(a)*2))),roomAt(position.clone().add(new THREE.Vector3(-Math.sin(a)*2,0,-Math.cos(a)*2)))]});}
    else if(k==='macro_red_coin')addCoin(vec(p).add(new THREE.Vector3(0,.55,0)),{value:2,red:true});
    else if(k==='macro_yellow_coin_1')addCoin(vec(p).add(new THREE.Vector3(0,.55,0)));
    else if(k==='macro_wooden_signpost'){place(signModel(kit),p,yaw,room);world.signs.push({position:vec(p),text:'Find five Boos in the ground-floor rooms. They hide when you look at them: turn away to lure them, then jump and punch, or ground pound them. When the big ghost appears, return to the main hall. Defeat him with three hits, approach the middle of the hall to raise the stairs, and jump up to the star.'});}
    else if(k==='bhvMadPiano'||k==='bhvHauntedChair'||k.includes('haunted_chair')){const type=k==='bhvMadPiano'?'piano':'chair',m=place(type==='piano'?pianoModel(kit):chairModel(kit),p,yaw,room);world.hazards.push({type,mesh:m,position:m.position.clone(),home:m.position.clone(),yaw:m.rotation.y,room,state:'idle',age:0,cooldown:0,velocity:new THREE.Vector3(),alive:true,phase:random()*TAU});}
    else if(k==='bhvFlyingBookend'){const m=place(bookModel(kit),p,yaw,room);world.hazards.push({type:'book',mesh:m,position:m.position.clone(),home:m.position.clone(),yaw:m.rotation.y,room,state:'idle',age:0,velocity:new THREE.Vector3(),alive:true,phase:random()*TAU});}
    else if(k==='bhvBookendSpawn')bookSpawners.push({position:vec(p),yaw:yaw*Math.PI/180,room,timer:0});
    else if(k==='macro_mr_i'){const position=vec(p).add(new THREE.Vector3(0,.9,0)),m=place(eyeModel(kit),position,yaw,room);world.hazards.push({type:'eye',mesh:m,position,home:position.clone(),yaw:m.rotation.y,room,state:'idle',age:0,lastAngle:null,turned:0,turnDirection:0,turnTime:0,shootTime:1.8+random(),alive:true,phase:random()*TAU});}
    else if(k==='macro_scuttlebug'){const m=place(bugModel(kit),p,yaw,room);world.hazards.push({type:'bug',mesh:m,position:m.position.clone(),home:m.position.clone(),yaw:m.rotation.y,room,state:'idle',age:0,velocity:new THREE.Vector3(),alive:true,phase:random()*TAU});}
    else if(k==='bhvFlame'){const m=place(flameModel(kit),p,yaw,room),light=new THREE.PointLight('#f1c190',.8,8,2);light.position.y=.35;m.add(light);flames.push({mesh:m,phase:random()*TAU});}
    else if(k.includes('box')&&!k.includes('switch')){const m=wireBox(kit,.95,.95,.95,k.includes('vanish')?kit.materials.blue:kit.materials.toasted);place(m,p,yaw,room);}
  }
  for(const d of course.dynamic||[]){const m=new THREE.Group();m.name=d.type==='boo_staircase'?'Rising pasta staircase':'Moving '+d.type.replaceAll('_',' ')+' of pasta';addFaces(d.renderVertices||d.vertices,d.renderTriangles||d.triangles,m,{loose:1.2});place(m,d.position,d.yaw||0,d.room??(d.type==='boo_staircase'?1:roomAt(vec(d.position))));const record={d,mesh:m,id:d.id||d.kind,base:vec(d.position),yaw:(d.yaw||0)*Math.PI/180,age:0,state:'idle',velocity:0,pitch:0,previous:m.position.clone()};world.platforms.push(record);if(d.initiallyEnabled===false)physics.setDynamicEnabled(record.id,false);}
  for(const box of course.waterBoxes||[]){const vs=[[box.x[0],0,box.z[0]],[box.x[1],0,box.z[0]],[box.x[1],0,box.z[1]],[box.x[0],0,box.z[1]]],m=new THREE.Mesh(facesGeometry(vs,[[0,2,1],[0,3,2]],6),new THREE.MeshPhysicalMaterial({color:'#8299a4',map:maps[2],transparent:true,opacity:.28,depthWrite:false,alphaTest:.001,side:THREE.DoubleSide,roughness:.18,clearcoat:.9,ior:1.44}));m.name='Submerged glass-noodle surface';m.position.y=box.height;props.add(m);water.push({box,mesh:m});}
  if(world.routePoints.length){const gs=[];for(const p of world.routePoints){const ps=[];for(let j=0;j<=10;j++){const a=j/10*TAU;ps.push([p.x+Math.cos(a)*.11,p.y+.06,p.z+Math.sin(a)*.11]);}gs.push(kit.noodleGeometry(ps,.025,10,5));}guide.add(mesh(kit,gs,kit.materials.saffron));}
  onProgress(75);
  function setRoom(room,force=false){if(room===world.roomId&&!force)return;world.roomId=room;const inRooms=canonical(room),main=names[room]?room:inRooms.find(r=>r!==13)||room;world.inside=room!==13&&!(!inRooms.length&&room===0);world.roomName=names[main]||(world.inside?'Inside the haunted mansion':'Mansion grounds');world.visibleRooms=inRooms;const lists=renderData.roomDisplayLists?.[room];for(const item of terrainGroups)item.mesh.visible=!lists||lists.includes(item.dl);for(const o of objectRecords)o.mesh.visible=!o.room||isVisibleRoom(o.room);for(const w of water)w.mesh.visible=inRooms.some(r=>r===10||r===11||r===12);callbacks.roomChanged?.({roomId:room,roomName:world.roomName,inside:world.inside,visibleRooms:inRooms});}
  function updateDoors(dt,player){for(const d of world.doors){const p=player?.position,near=p&&horizontal(p,d.position)<2.25&&Math.abs(p.y-d.position.y)<2.2;if(near){d.hold=1.1;const side=(p.x-d.position.x)*Math.sin(d.yaw)+(p.z-d.position.z)*Math.cos(d.yaw);if(d.open<.05)d.sign=side>=0?1:-1;}else d.hold=Math.max(0,d.hold-dt);const target=d.hold>0?1:0;d.open+=(target-d.open)*(1-Math.exp(-9*dt));d.mesh.userData.hinge.rotation.y=d.sign*d.open*Math.PI*.53;d.mesh.visible=d.rooms.some(isVisibleRoom)||d.rooms.includes(world.roomId);const a=d.yaw+d.mesh.userData.hinge.rotation.y,hinge=d.position.clone().add(new THREE.Vector3(-.72*Math.cos(d.yaw),0,.72*Math.sin(d.yaw))),center=hinge.add(new THREE.Vector3(.72875*Math.cos(a),1.25,-.72875*Math.sin(a)));physics.setBoxCollider(d.id,{center:center.toArray(),halfSize:[.74875,1.25,.055],yaw:a},d.open<.55);}}
  function onPlatform(player,id){if(!player?.grounded)return false;const f=physics.groundAt(player.position.x,player.position.z,player.position.y+.2);return f?.triangle.dynamic===id&&Math.abs(player.position.y-f.height)<.3;}
  function updatePlatforms(time,dt,player){for(const q of world.platforms){const {d,mesh:m,id,base}=q,standing=onPlatform(player,id),old=m.position.clone(),oldYaw=m.rotation.y;q.age+=dt;
      if(d.type==='boo_staircase'){const active=!!mission.stairsActive;physics.setDynamicEnabled(id,active);m.visible=active&&isVisibleRoom(1);m.position.y=active?Math.min(d.targetPosition?.[1]??0,-6.2+(mission.stairTime||0)*2.4):-6.2;}
      else if(d.type==='mesh_elevator'){const low=-23.6,high=base.y,mid=(low+high)/2;if(q.state==='idle'){m.position.y=player&&player.position.y<mid?low:high;if(standing){q.state=m.position.y>mid?'down':'up';q.velocity=0;}}else if(q.state==='up'||q.state==='down'){const direction=q.state==='up'?1:-1;q.velocity+=clamp(direction*3-q.velocity,-18*dt,18*dt);m.position.y=clamp(m.position.y+q.velocity*dt,low,high);if(m.position.y===low||m.position.y===high){q.state='wait';q.velocity=0;}}else if(!standing&&player?.grounded)q.state='idle';}
      else if(d.type==='merry_go_round')m.rotation.y=time*(128/65536*TAU*30);
      else if(d.type==='tilting_trap'){if(standing){q.velocity=(player.position.z-base.z)*100/65536*TAU*60;q.pitch+=q.velocity*dt;q.age=0;}else if(Math.abs(q.pitch)<3000/65536*TAU||q.age>.5){q.velocity=0;q.pitch-=Math.sign(q.pitch)*Math.min(Math.abs(q.pitch),200/65536*TAU*30*dt);}else q.pitch+=q.velocity*dt;m.rotation.x=q.pitch;}
      else if(d.type==='tumbling_bridge'){
        const parent=vec(d.parentPosition||d.position),away=player&&vec(player.position).distanceTo(parent)>12;
        if(away){q.state='idle';q.age=q.velocity=0;m.position.copy(base);m.rotation.set(0,q.yaw,0);physics.setDynamicEnabled(id,true);m.visible=isVisibleRoom(d.room||4);}
        else if(q.state==='idle'&&standing){q.state='warning';q.age=0;}
        else if(q.state==='warning'&&q.age>(d.delayFrames||6)/30){q.state='falling';q.age=0;q.velocity=0;}
        else if(q.state==='falling'){q.velocity-=(d.gravity||27)*dt;m.position.y+=q.velocity*dt;m.rotation.x+=Math.min(2.95,q.age*8)*dt;m.rotation.z+=(d.segment%2?1:-1)*Math.min(2.95,q.age*8)*dt;if(m.position.y<base.y-35){m.visible=false;physics.setDynamicEnabled(id,false);q.state='gone';}}
      }else if(d.type==='coffin'&&d.parameter){
        if(q.state==='idle'){if(q.pitch>0)q.pitch=Math.max(0,q.pitch-5.75*dt);else if(player&&q.age>2){const dx=player.position.x-base.x,dz=player.position.z-base.z,c=Math.cos(q.yaw),s=Math.sin(q.yaw),forward=dx*c+dz*s,side=dz*c-dx*s;if(Math.abs(forward)<1.4&&side<1.5&&side> -4.5&&player.position.y-base.y<2&&Math.hypot(dx,dz)>1){q.state='rising';q.age=0;}}}
        else if(q.state==='rising'){q.pitch=Math.min(Math.PI/2,q.pitch+2.87*dt);if(q.pitch>=Math.PI/2){q.state='standing';q.age=0;}}
        else if(q.age>2){q.state='idle';q.age=0;}m.rotation.x=q.pitch;
      }
      physics.setDynamicPose(id,m.position.toArray(),[m.rotation.x,m.rotation.y,m.rotation.z]);
      if(standing&&player){const dy=m.position.y-old.y;if(Math.abs(dy)<1)player.position.y+=dy;const delta=m.rotation.y-oldYaw;if(delta){const dx=player.position.x-old.x,dz=player.position.z-old.z,c=Math.cos(delta),s=Math.sin(delta);player.position.x=m.position.x+dx*c+dz*s;player.position.z=m.position.z-dx*s+dz*c;player.yaw+=delta;}}
    }}
  function hitHazard(h,player){if(!h.alive)return false;h.alive=false;h.mesh.visible=false;physics.setBoxCollider('bbh-hazard-'+world.hazards.indexOf(h),null,false);if(h.type==='bug')addCoin(h.position.clone().add(new THREE.Vector3(0,.5,0)));callbacks.burst?.(h.position,10,kit.materials.toasted);return true;}
  function updateHazards(time,dt,player){if(!player)return;const p=player.position;for(const h of world.hazards){if(!h.alive)continue;h.mesh.visible=isVisibleRoom(h.room);if(h.room!==world.roomId&&!canonical(world.roomId).includes(h.room))continue;h.age+=dt;const d=horizontal(p,h.position),height=Math.abs(p.y-h.position.y),angle=Math.atan2(p.x-h.position.x,p.z-h.position.z);
      if(h.type==='piano'){if(h.state==='idle'&&d<5&&player.speed>3&&h.age>.67){h.state='attack';h.age=0;}if(h.state==='attack'){const turn=Math.atan2(Math.sin(angle-h.mesh.rotation.y),Math.cos(angle-h.mesh.rotation.y));h.mesh.rotation.y+=clamp(turn,-1.15*dt,1.15*dt);h.position.x+=Math.sin(h.mesh.rotation.y)*1.5*dt;h.position.z+=Math.cos(h.mesh.rotation.y)*1.5*dt;const delta=h.position.clone().sub(h.home);delta.y=0;if(delta.length()>4)h.position.copy(h.home).add(delta.setLength(4));if(d<5)h.age=0;else if(h.age>2.67){h.state='idle';h.age=0;}}
        h.mesh.userData.lid.rotation.x=h.state==='attack'?-.08-(.5+.5*Math.sin(time*11))*.85:-.035;const f=physics.groundAt(h.position.x,h.position.z,h.position.y+.65);if(f)h.position.y=f.height;h.mesh.position.copy(h.position);if(d<2.1&&height<1.7&&h.state==='attack')callbacks.damage?.(h.position,3);physics.setBoxCollider('bbh-hazard-'+world.hazards.indexOf(h),{center:[h.position.x,h.position.y+.55,h.position.z],halfSize:[1.42,.55,.93],yaw:h.mesh.rotation.y});}
      else if(h.type==='chair'||h.type==='book'){
        if(h.state==='idle'&&d<(h.type==='chair'?5:4)&&height<3){h.state='warning';h.age=0;}
        if(h.state==='warning'){h.mesh.rotation.z=Math.sin(time*24)*.075;h.mesh.position.y=h.home.y+Math.min(2.9,h.age*1.8);h.position.copy(h.mesh.position);if(h.age>(h.type==='chair'?3.7:1.65)){h.state='flying';h.age=0;h.velocity.set(p.x-h.position.x,p.y+.8-h.position.y,p.z-h.position.z).normalize().multiplyScalar(15);}}
        else if(h.state==='flying'){h.position.addScaledVector(h.velocity,dt);h.mesh.position.copy(h.position);h.mesh.rotation.y+=dt*4;h.mesh.rotation.x+=dt*2;if(d<1&&height<1.5){callbacks.damage?.(h.position,2);hitHazard(h,player);}const test={x:h.position.x,y:h.position.y,z:h.position.z};if(physics.resolveWalls(test,.4,.8).hit||h.age>4||h.position.y<(physics.groundAt(h.position.x,h.position.z,h.position.y+1)?.height??-100)+.1)hitHazard(h,player);}
        if(h.type==='book')h.mesh.userData.wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*(.23+Math.sin(time*13)*.5));
      }else if(h.type==='eye'){
        if(d<8&&height<3){const delta=h.lastAngle===null?0:Math.atan2(Math.sin(angle-h.lastAngle),Math.cos(angle-h.lastAngle)),direction=Math.sign(delta);if(Math.abs(delta)<.0002){h.turnTime=0;h.turned=0;}else if(direction===h.turnDirection){h.turned+=Math.abs(delta);h.turnTime+=dt;}else{h.turnDirection=direction;h.turned=0;h.turnTime=0;}
          if(h.turnTime>4){h.turned=h.turnTime=0;}h.mesh.rotation.y=angle;if(h.turned>TAU){hitHazard(h,player);addCoin(h.position,{value:5,blue:true,transient:true});}
          if(h.turned<5000/65536*TAU){h.shootTime-=dt;if(h.shootTime<=0&&h.alive){const m=kit.coilBall(.15,kit.materials.pink,8),direction=new THREE.Vector3(p.x-h.position.x,p.y+.8-h.position.y,p.z-h.position.z).normalize();m.position.copy(h.position).addScaledVector(direction,.9);props.add(m);projectiles.push({mesh:m,position:m.position,velocity:direction.multiplyScalar(6),room:h.room,life:100/30});h.shootTime=(70+random()*50)/30;}}else h.shootTime=(70+random()*50)/30;
          if(d<1.25)callbacks.damage?.(h.position,2);
        }else{h.turned=0;h.lastAngle=null;}if(d<8)h.lastAngle=angle;
      }else if(h.type==='bug'){const target=d<8?angle:Math.atan2(h.home.x-h.position.x,h.home.z-h.position.z),speed=d<8?2.2:.65;h.position.x+=Math.sin(target)*speed*dt;h.position.z+=Math.cos(target)*speed*dt;const f=physics.groundAt(h.position.x,h.position.z,h.position.y+.8);if(f)h.position.y=f.height;physics.resolveWalls(h.position,.4,1);h.mesh.position.copy(h.position);h.mesh.rotation.y=target;h.mesh.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(time*10+i*Math.PI/3)*.15);if(d<.85&&height<1.1)callbacks.damage?.(h.position,1);}
      if(player.pounding&&p.y>h.position.y&&p.y<h.position.y+2.2&&d<1.1&&(h.type==='chair'||h.type==='book'||h.type==='bug'))hitHazard(h,player);
    }
    for(const s of bookSpawners){if(s.room!==world.roomId)continue;s.timer+=dt;if(s.timer>1.33&&horizontal(p,s.position)<6){const m=bookModel(kit);m.position.copy(s.position);props.add(m);const velocity=new THREE.Vector3(Math.sin(s.yaw)*15,0,Math.cos(s.yaw)*15);world.hazards.push({type:'book',mesh:m,position:m.position.clone(),home:m.position.clone(),yaw:s.yaw,room:s.room,state:'flying',age:0,velocity,alive:true,spawned:true});s.timer=0;}}
    for(let i=projectiles.length-1;i>=0;i--){const s=projectiles[i];s.life-=dt;s.position.addScaledVector(s.velocity,dt);s.mesh.rotation.y+=dt*6;if(horizontal(p,s.position)<.65&&Math.abs(p.y+.8-s.position.y)<.8){callbacks.damage?.(s.position,1);s.life=0;}const test={x:s.position.x,y:s.position.y,z:s.position.z};if(s.room!==world.roomId||physics.resolveWalls(test,.15,.3).hit)s.life=0;if(s.life<=0){props.remove(s.mesh);projectiles.splice(i,1);}}
    for(let i=world.hazards.length-1;i>=0;i--)if(world.hazards[i].spawned&&!world.hazards[i].alive){props.remove(world.hazards[i].mesh);world.hazards.splice(i,1);}
  }
  function update(time,dt,player){if(player){uniforms.pastaFoot.value.copy(player.position);uniforms.pastaYield.value=.012+(player.cookingSoftness??.55)*.033;setRoom(roomAt(player.position));}updateDoors(dt,player);updatePlatforms(time,dt,player);updateHazards(time,dt,player);
    for(let i=0;i<world.ghostMeshes.length;i++){const item=world.ghostMeshes[i],m=item.mesh,g=item.ghost=mission.ghosts[i];m.visible=(g.alive||g.state==='dying')&&isVisibleRoom(g.room);if(!m.visible)continue;m.position.copy(g.position);m.position.y+=.3;m.rotation.y=g.yaw||0;m.scale.setScalar(g.scale||1);m.userData.update(dt,g,time);}
    bossMesh.visible=!!mission.active&&(mission.health>0||mission.state==='dying')&&!mission.starReady&&isVisibleRoom(1);if(bossMesh.visible){bossMesh.position.copy(mission.position);bossMesh.position.y+=.6*(mission.baseScale||3);bossMesh.rotation.y=mission.yaw||0;bossMesh.scale.setScalar(mission.scale||mission.baseScale||3);bossMesh.userData.update(dt,mission,time);}
    for(const c of world.coins){c.mesh.visible=!c.collected&&isVisibleRoom(c.room);if(c.mesh.visible){c.mesh.rotation.y=time*1.4+c.phase;c.mesh.position.y=c.position.y+Math.sin(time*2+c.phase)*.10;}}
    for(const f of flames){f.mesh.rotation.y=Math.sin(time*2.5+f.phase)*.16;f.mesh.scale.y=1+Math.sin(time*4+f.phase)*.08;}
    world.starPosition.copy(mission.starPosition);}
  function getWaterInfo(x,z){const box=(course.waterBoxes||[]).find(b=>x>=b.x[0]&&x<=b.x[1]&&z>=b.z[0]&&z<=b.z[1]);return box?{level:box.height,flow:{x:0,y:0,z:0}}:null;}
  function action(player){if(mission.action(player))return true;for(const h of world.hazards){if(!h.alive||h.type==='piano'||h.type==='eye')continue;const d=horizontal(player.position,h.position),height=Math.abs(player.position.y+.7-h.position.y);if(d<1.9&&height<1.6){const front=(h.position.x-player.position.x)*Math.sin(player.yaw)+(h.position.z-player.position.z)*Math.cos(player.yaw);if(front>-.1)return hitHazard(h,player);}}
    const door=world.doors.find(d=>horizontal(player.position,d.position)<2.3&&Math.abs(player.position.y-d.position.y)<2.2);if(door){door.hold=1.5;return true;}return false;}
  function onGroundPound(player){let hit=mission.onGroundPound(player);for(const h of world.hazards)if(h.alive&&h.type!=='piano'&&h.type!=='eye'&&horizontal(player.position,h.position)<2.0&&Math.abs(player.position.y-h.position.y)<2.2)hit=hitHazard(h,player)||hit;return hit;}
  function reset(){mission.reset();for(let i=world.coins.length-1;i>=0;i--){const c=world.coins[i];if(c.transient){props.remove(c.mesh);world.coins.splice(i,1);}else{c.collected=false;c.mesh.visible=true;}}
    for(const d of world.doors){d.open=d.hold=0;d.mesh.userData.hinge.rotation.y=0;}
    for(const q of world.platforms){q.state='idle';q.age=q.pitch=q.velocity=0;q.mesh.position.copy(q.base);q.mesh.rotation.set(0,q.yaw,0);physics.setDynamicPose(q.id,q.base.toArray(),[0,q.yaw,0]);physics.setDynamicEnabled(q.id,q.d.initiallyEnabled!==false);}
    for(let i=world.hazards.length-1;i>=0;i--){const h=world.hazards[i];if(h.spawned){props.remove(h.mesh);world.hazards.splice(i,1);continue;}h.alive=true;h.state='idle';h.age=h.turned=h.turnDirection=h.turnTime=0;h.lastAngle=null;h.shootTime=2;h.position.copy(h.home);h.mesh.position.copy(h.home);h.mesh.rotation.set(0,h.yaw,0);h.velocity?.set(0,0,0);physics.setBoxCollider('bbh-hazard-'+i,null,false);}for(const s of bookSpawners)s.timer=0;for(const s of projectiles)props.remove(s.mesh);projectiles.length=0;for(const {mesh:m}of world.ghostMeshes)m.userData.reset();bossMesh.userData.reset();setRoom(roomAt(course.start.position),true);updateDoors(0,null);update(0,0,null);}
  world.update=update;world.reset=reset;world.action=action;world.onGroundPound=onGroundPound;world.getWaterInfo=getWaterInfo;world.setRoom=setRoom;world.setQuality=()=>{};world.spawnCoin=addCoin;
  reset();onProgress(100);return world;
}
