import * as THREE from './vendor/three.module.js';
import {DddMission} from './ddd-mission.js';

const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const vec=p=>p?.isVector3?p.clone():Array.isArray(p)?new THREE.Vector3(...p):new THREE.Vector3(p.x,p.y,p.z);
const rng=(s=6419)=>()=>{s=(Math.imul(s,1664525)+1013904223)|0;return(s>>>0)/4294967296;};
const palette={water_09003800:['toasted','#b7b5a2'],water_0900B800:['rice','#ced7c4'],water_09007800:['ink','#a6bdc3'],water_09004800:['rice','#d5d1ad'],water_09009000:['ink','#acbec1'],water_09006800:['toasted','#bdb196'],water_0900A000:['toasted','#c3a476'],ddd_seg7_texture_07001000:['toasted','#b5b5a6'],ddd_seg7_texture_07002000:['ink','#c2c7bb'],ddd_seg7_texture_07001800:['toasted','#c6b18b'],ddd_seg7_texture_07000000:['ink','#bdd2ce']};

function merged(kit,gs,mat){const mesh=new THREE.Mesh(kit.mergeGeometry(gs),mat);gs.forEach(g=>g.dispose());mesh.castShadow=mesh.receiveShadow=true;return mesh;}
function facesGeometry(vertices,faces,tile=2.5){
  const ps=[],ns=[],uv=[];
  function emit(a,b,c,n,depth=0){
    const ab=a.distanceToSquared(b),bc=b.distanceToSquared(c),ca=c.distanceToSquared(a),longest=Math.max(ab,bc,ca);
    if(longest>25&&depth<14){if(ab===longest){const m=a.clone().lerp(b,.5);emit(a,m,c,n,depth+1);emit(m,b,c,n,depth+1);}else if(bc===longest){const m=b.clone().lerp(c,.5);emit(a,b,m,n,depth+1);emit(a,m,c,n,depth+1);}else{const m=c.clone().lerp(a,.5);emit(a,b,m,n,depth+1);emit(m,b,c,n,depth+1);}return;}
    const axis=Math.abs(n.y)>.5?'y':Math.abs(n.x)>Math.abs(n.z)?'x':'z';
    for(const p of[a,b,c]){ps.push(p.x,p.y,p.z);ns.push(n.x,n.y,n.z);uv.push((axis==='x'?p.z:p.x)/tile,(axis==='y'?p.z:p.y)/tile);}
  }
  for(const f of faces){const a=vec(vertices[f[0]]),b=vec(vertices[f[1]]),c=vec(vertices[f[2]]),n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();emit(a,b,c,n);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(ns,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeBoundingSphere();return g;
}
function surfaceStrands(kit,vertices,faces,mat,{count=1400,seed=419,allSides=false,radius=.028}={}){
  const r=rng(seed),gs=[],surfaces=[];let total=0;
  for(const f of faces){const a=vec(vertices[f[0]]),b=vec(vertices[f[1]]),c=vec(vertices[f[2]]),n=b.clone().sub(a).cross(c.clone().sub(a)),area=n.length()/2;n.normalize();if((!allSides&&n.y<.4)||area<.03)continue;total+=area;surfaces.push({a,b,c,n,area});}
  for(const f of surfaces){const number=Math.max(1,Math.round(count*f.area/total)),tangent=f.b.clone().sub(f.a).normalize(),across=new THREE.Vector3().crossVectors(f.n,tangent);
    for(let i=0;i<number;i++){let u=r(),v=r();if(u+v>1){u=1-u;v=1-v;}const p=f.a.clone().addScaledVector(f.b.clone().sub(f.a),u).addScaledVector(f.c.clone().sub(f.a),v).addScaledVector(f.n,radius*.7),angle=r()*TAU,length=Math.min(.5+r()*.9,Math.sqrt(f.area)*.4),points=[];
      for(let j=0;j<8;j++){const t=(j/7-.5)*length;points.push(p.clone().addScaledVector(tangent,Math.cos(angle)*t).addScaledVector(across,Math.sin(angle)*t+Math.sin(j*.75+i)*.035));}gs.push(kit.noodleGeometry(points,radius,8,5));}
  }
  return merged(kit,gs,mat);
}
function looseStrand(kit,anchor,length,mat,seed){
  const start=vec(anchor),n=9,rest=length/(n-1),points=Array.from({length:n},(_,i)=>start.clone().add(new THREE.Vector3(Math.sin(i+seed)*.025,-i*rest,0))),previous=points.map(p=>p.clone()),mesh=kit.strand(points,.025,mat,n-1);
  mesh.frustumCulled=false;
  return {mesh,update(dt,time,flow=0){if(!dt)return;dt=Math.min(dt,.034);points[0].copy(start);
    for(let i=1;i<n;i++){const p=points[i],last=p.clone();p.addScaledVector(p.clone().sub(previous[i]),.86);p.y-=.15*dt*dt;p.x+=Math.sin(time*1.3+seed+i*.4)*.06*dt;p.z+=flow*dt*dt;previous[i].copy(last);}
    for(let pass=0;pass<5;pass++)for(let i=1;i<n;i++){const d=points[i].clone().sub(points[i-1]),l=d.length()||.001;d.multiplyScalar((l-rest)/l);if(i===1)points[i].sub(d);else{points[i].addScaledVector(d,-.5);points[i-1].addScaledVector(d,.5);}}
    const g=kit.noodleGeometry(points,.025,n-1,5);for(const a of['position','normal']){mesh.geometry.attributes[a].array.set(g.attributes[a].array);mesh.geometry.attributes[a].needsUpdate=true;}g.dispose();
  }};
}

// Uses the extracted first-act submarine mesh. Braided noodles lie on its
// source faces; the collision remains the original separate submarine mesh.
export function createSubmarineModel(kit,model,maps={}){
  const root=new THREE.Group();root.name='Bowser submarine of braided saffron and ink spaghetti';if(!model)return root;
  const groups=new Map();for(const f of model.triangles){if(!groups.has(f[3]))groups.set(f[3],[]);groups.get(f[3]).push(f);}
  const hull=kit.materials.toasted.clone();hull.color.set('#cfb282');hull.map=maps.ribbon||null;hull.bumpMap=maps.ribbon||hull.bumpMap;hull.bumpScale=.035;hull.roughness=.25;hull.clearcoat=.9;hull.side=THREE.DoubleSide;
  const trim=kit.materials.ink.clone();trim.map=maps.ink||null;trim.color.set('#5c6260');trim.roughness=.28;trim.side=THREE.DoubleSide;
  for(const[id,fs]of groups){const mat=id==='ddd_seg7_texture_07000000'?trim:hull,m=new THREE.Mesh(facesGeometry(model.vertices,fs,1.8),mat);m.castShadow=m.receiveShadow=true;root.add(m);}
  const braids=surfaceStrands(kit,model.vertices,model.triangles,kit.materials.saffron,{count:2100,seed:629,allSides:true,radius:.038});root.add(braids);
  const loose=[];for(const p of[[29.2,2,8],[49.0,1.8,12],[31.5,1.9,26],[45.8,2,32],[38.4,7.5,-5.5],[40,7.5,-5.5]]){const l=looseStrand(kit,p,.5+(loose.length%3)*.16,kit.materials.egg,loose.length+91);root.add(l.mesh);loose.push(l);}
  root.userData.update=(dt,t,player)=>{for(const l of loose)l.update(dt,t,.3);};root.userData.sourceModel=model;
  return root;
}
function seaweed(kit,seed){const r=rng(seed),gs=[];for(let i=0;i<9;i++){const h=1.8+r()*2.3,points=[];for(let j=0;j<12;j++){const t=j/11;points.push([(i-4)*.075+Math.sin(t*4+i)*.21*t,h*t,Math.sin(i*2)*.2+Math.cos(t*3+i)*.13*t]);}gs.push(kit.noodleGeometry(points,.065,16,5));}const root=new THREE.Group();root.add(merged(kit,gs,kit.materials.spinach));root.name='Drifting spinach fettuccine';return root;}
function fish(kit,large=false){
  const root=new THREE.Group(),body=new THREE.Group(),tail=new THREE.Group(),mat=large?kit.materials.blue:kit.materials.white;root.add(body,tail);root.name=large?'Sushi shark of braided blue spaghetti':'Small rice-noodle fish';
  const g=kit.winding(large?.72:.13,large?.58:.18,large?2.1:.32,large?.04:.018,large?123:455,large?53:16),m=new THREE.Mesh(g,mat);body.add(m);const fins=[];
  for(const side of[-1,1]){const ps=large?[[side*.3,-.1,.3],[side*1.65,-.3,-.5],[side*.38,-.2,-.8]]:[[0,0,-.2],[side*.22,.03,-.5],[0,0,-.38]],gs=[];for(let i=0;i<(large?9:3);i++){const t=i/(large?8:2);gs.push(kit.noodleGeometry([ps[0],vec(ps[0]).lerp(vec(ps[1]),t),vec(ps[0]).lerp(vec(ps[2]),t)],large?.036:.02,8,5));}const fin=merged(kit,gs,mat);body.add(fin);fins.push(fin);}
  if(large){const dorsal=[];for(let i=0;i<10;i++){const t=i/9;dorsal.push(kit.noodleGeometry([[0,.44,-.7+t*.9],[0,.52+t*.93,-.4],[0,.44,.35]],.032,10,5));}body.add(merged(kit,dorsal,mat));for(const side of[-1,1]){const eye=kit.coilBall(.1,kit.materials.ink,87);eye.position.set(side*.45,.2,1.6);body.add(eye);}}
  const tailGs=[];for(let i=0;i<(large?13:5);i++){const t=i/(large?12:4);tailGs.push(kit.noodleGeometry([[0,0,large?-1.8:-.24],[0,(t-.5)*(large?2.2:.55),large?-2.7:-.55],[0,(t-.5)*(large?1.5:.4),large?-2.4:-.46]],large?.037:.02,9,5));}tail.add(merged(kit,tailGs,mat));
  root.userData.update=t=>{tail.rotation.y=Math.sin(t*(large?3.4:5))*.24;body.rotation.y=Math.sin(t*(large?3.4:5))*.025;fins.forEach((f,i)=>f.rotation.z=Math.sin(t*2.3+i)*.055);};return root;
}
function clam(kit){const root=new THREE.Group(),top=new THREE.Group();root.name='Clam of pink conchiglie and rice noodles';root.add(top);const gs=[];for(let i=0;i<19;i++){const a=i/18*Math.PI,ps=[];for(let j=0;j<14;j++){const t=j/13,r=t*1.25;ps.push([Math.cos(a)*r,Math.sin(t*Math.PI)*.36,Math.sin(a)*r]);}gs.push(kit.noodleGeometry(ps,.052,17,5));}const upper=merged(kit,gs,kit.materials.pink),lower=upper.clone();upper.position.z=-.45;lower.rotation.z=Math.PI;lower.position.set(0,.11,-.45);top.add(upper);root.add(lower);top.position.y=.18;root.userData.top=top;return root;}
function boxModel(kit){const root=new THREE.Group(),gs=[];root.name='Temporary box of woven tagliatelle';for(let h=0;h<=2;h+=.115)gs.push(kit.noodleGeometry([[-1,h,-1],[1,h,-1],[1,h,1],[-1,h,1],[-1,h,-1]],.055,20,5));for(let x=-.95;x<=.96;x+=.11)gs.push(kit.noodleGeometry([[x,2,-1],[x+.025,2.01,0],[x,2,1]],.054,8,5));root.add(merged(kit,gs,kit.materials.toasted));for(const x of[-1.025,1.025])root.add(kit.strand([[x,.15,-.85],[x,1,.05],[x,1.85,.85]],.06,kit.materials.egg,8));return root;}
function switchModel(kit,d){const root=new THREE.Group(),mat=kit.materials.pink.clone();mat.color.set('#8a668b');mat.roughness=.28;root.name='Purple beet-pasta floor switch';root.add(surfaceStrands(kit,d.vertices,d.triangles,mat,{count:420,allSides:true,radius:.034}));const face=new THREE.Mesh(facesGeometry(d.vertices,d.triangles,.8),mat);face.castShadow=face.receiveShadow=true;root.add(face);const ring=[];for(let i=0;i<=48;i++){const a=i/48*TAU;ring.push([Math.sin(a)*.63,.56,Math.cos(a)*.63]);}root.add(kit.strand(ring,.045,kit.materials.white,48));root.add(kit.strand([[-.15,.565,.32],[-.15,.565,-.32],[.2,.565,-.32],[.2,.565,.02],[-.15,.565,.02]],.043,kit.materials.white,20));return root;}
function signModel(kit){const root=kit.pole(1.4,.07),gs=[];for(let i=0;i<11;i++)gs.push(kit.noodleGeometry([[-.6,.85+i*.06,0],[0,.86+i*.06,.025],[.6,.85+i*.06,0]],.034,8,5));root.add(merged(kit,gs,kit.materials.egg));return root;}
function chestModel(kit){const root=new THREE.Group(),lid=new THREE.Group(),gs=[];for(let y=0;y<.85;y+=.09)gs.push(kit.noodleGeometry([[-.85,y,-.7],[.85,y,-.7],[.85,y,.7],[-.85,y,.7],[-.85,y,-.7]],.047,18,5));root.add(merged(kit,gs,kit.materials.toasted));const tops=[];for(let x=-.85;x<=.86;x+=.1)tops.push(kit.noodleGeometry([[x,0,0],[x,.3,.7],[x,0,1.4]],.055,14,5));lid.add(merged(kit,tops,kit.materials.egg));lid.position.set(0,.85,-.7);root.add(lid);root.userData.lid=lid;return root;}

export async function createDddWorld(scene,kit,course,renderData,physics,{onProgress=()=>{},...initialCallbacks}={}){
  const terrain=new THREE.Group(),props=new THREE.Group(),guide=new THREE.Group();terrain.name='Dire Dire Docks wet pasta terrain';props.name='Submarine and underwater pasta life';guide.visible=false;scene.add(terrain,props,guide);
  const loads=await Promise.allSettled(['spaghetti-surface.png','tagliatelle-surface.png','rice-noodle-surface.png','ink-noodle-surface.png','glass-noodle-surface.png'].map(n=>new THREE.TextureLoader().loadAsync('./assets/'+n))),maps=loads.map(r=>r.status==='fulfilled'?r.value:null);
  for(const m of maps)if(m){m.wrapS=m.wrapT=THREE.RepeatWrapping;m.colorSpace=THREE.SRGBColorSpace;m.anisotropy=8;}
  const materials={},uniforms={pastaFoot:{value:new THREE.Vector3(1e5,1e5,1e5)},pastaTime:{value:0}};
  function matFor(id){if(materials[id])return materials[id];const[type,color]=palette[id]||['toasted','#bfb39a'],map=maps[type==='ink'?3:type==='rice'?2:1]||maps[0],m=new THREE.MeshPhysicalMaterial({color,map,bumpMap:map,bumpScale:.032,roughness:.25,clearcoat:.86,clearcoatRoughness:.18,metalness:0,ior:1.46,sheen:.18,sheenColor:new THREE.Color('#dce9d2'),side:THREE.DoubleSide});m.name=type==='ink'?'Wet squid-ink spaghetti':type==='rice'?'Wet rice noodles':'Moist layered tagliatelle';
    m.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.vertexShader='uniform vec3 pastaFoot; uniform float pastaTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat pd=distance(position.xz,pastaFoot.xz);float py=abs(position.y-pastaFoot.y);transformed.y-=exp(-pd*pd*1.6)*exp(-py*py*2.0)*.025;');};return materials[id]=m;}
  const mission=new DddMission(physics,course),areaRecords={},world={terrain,props,guide,materials,callbacks:{...initialCallbacks},mission,area:1,activeCourse:course,coins:[],enemies:[],friends:[],rollingBalls:[],chomp:null,signs:[],routePoints:[],bossSpawn:new THREE.Vector3(39,5,0),starPosition:vec(mission.starPosition),inside:false,roomId:1,roomName:'Entrance basin',areaName:'Entrance basin',platforms:[],hazards:[],waterMeshes:[]};mission.world=world;
  Object.defineProperties(world,{starCollectible:{get:()=>mission.starCollectible&&world.area===2},starVisible:{get:()=>world.area===2},mapGoal:{get:()=>world.area===1?{x:41,y:-2,z:0}:mission.switchActive||mission._lastPlayer?.position.y>4?mission.starPosition:{x:68,y:1.6,z:20}}});
  function addFaces(vertices,faces,parent){const groups=new Map();for(const f of faces){if(!groups.has(f[3]))groups.set(f[3],[]);groups.get(f[3]).push(f);}for(const[id,fs]of groups){const m=new THREE.Mesh(facesGeometry(vertices,fs),matFor(id));m.castShadow=m.receiveShadow=true;parent.add(m);}}
  function area(data,render,index){
    const land=new THREE.Group(),objects=new THREE.Group(),route=new THREE.Group(),random=rng(901*index),rec={index,data,render,land,objects,route,coins:[],signs:[],fish:[],sharks:[],clams:[],seaweed:[],water:[],steps:[],fragments:[],chests:[],flames:[],time:0};areaRecords[index]=rec;terrain.add(land);props.add(objects);guide.add(route);
    land.name=index===1?'Original entrance basin made of pasta':'Original submarine dock made of pasta';addFaces(render.vertices,render.triangles,land);land.add(surfaceStrands(kit,render.vertices,render.triangles,kit.materials.toasted,{count:index===1?1700:1900,seed:index*710}));
    for(const model of render.models||[]){const m=model.kind==='bhvBowsersSub'?createSubmarineModel(kit,model,{ribbon:maps[1],ink:maps[3]}):new THREE.Group();if(model.kind!=='bhvBowsersSub'){addFaces(model.vertices,model.triangles,m);m.add(surfaceStrands(kit,model.vertices,model.triangles,kit.materials.ink,{count:350,allSides:true}));m.name='Dock shutter of squid-ink noodles';}objects.add(m);if(model.kind==='bhvBowsersSub'){rec.submarine=m;world.submarine=m;}}
    function addCoin(p,value=1){const pos=vec(p),m=kit.coin(.29,value===2);m.position.copy(pos);objects.add(m);rec.coins.push({mesh:m,position:pos,value,collected:false,phase:random()*TAU});}
    for(const o of data.objects||[]){const k=o.kind,p=vec(o.position),yaw=(o.yaw||0)*Math.PI/180;
      if(k==='macro_red_coin')addCoin(p,2);else if(k.startsWith('macro_yellow_coin'))addCoin(p);
      else if(k.includes('coin_line'))for(let i=0;i<5;i++){const t=(i-2)*1.5;addCoin(k.includes('vertical')?[p.x,p.y+t,p.z]:[p.x+Math.sin(yaw)*t,p.y,p.z+Math.cos(yaw)*t]);}
      else if(k.includes('coin_ring'))for(let i=0;i<8;i++){const a=i/8*TAU,r=2.5;addCoin(k.includes('vertical')?[p.x+Math.cos(yaw)*Math.cos(a)*r,p.y+Math.sin(a)*r,p.z-Math.sin(yaw)*Math.cos(a)*r]:[p.x+Math.cos(a)*r,p.y,p.z+Math.sin(a)*r]);}
      else if(k==='macro_seaweed_bundle'){const m=seaweed(kit,Math.round(random()*9999));m.position.copy(p);objects.add(m);rec.seaweed.push({mesh:m,phase:random()*TAU});}
      else if(k==='macro_clam_shell'){const m=clam(kit);m.position.copy(p);m.rotation.y=yaw;objects.add(m);rec.clams.push({mesh:m,home:p,age:random()*4,open:0,state:'closed'});}
      else if(/fish_spawner|BlueFishSpawner|ChirpChirp/.test(k)){for(let i=0;i<5;i++){const m=fish(kit);m.position.copy(p);objects.add(m);rec.fish.push({mesh:m,home:p,phase:random()*TAU,radius:1+random()*2});}}
      else if(k==='bhvSushiShark'){const m=fish(kit,true);m.position.copy(p);objects.add(m);rec.sharks.push({mesh:m,home:p,phase:0});}
      else if(k==='macro_wooden_signpost'){const m=signModel(kit);m.position.copy(p);m.rotation.y=yaw;objects.add(m);rec.signs.push({mesh:m,position:p,text:'The purple pasta switch on the eastern dock reveals temporary steps. Step onto it, then jump west across the boxes to board the submarine. Your first star is already on the upper deck. Surface for air while swimming.'});}
      else if(k==='macro_fire_spitter'){const m=kit.coilBall(.45,kit.materials.tomato,89);m.position.copy(p);objects.add(m);rec.flames.push({mesh:m,home:p,phase:0,flaming:false});}
      else if(k==='macro_box_metal_cap'||k==='macro_box_vanish_cap'){const m=boxModel(kit);m.scale.setScalar(.45);m.position.copy(p);objects.add(m);}
    }
    if(index===1){for(const[x,y,z,yaw]of[[-45,-51.19,13,-135.0055],[-18,-51.19,10.5,44.9945],[-45,-51.19,-11,50],[ -24,-46.07,1.25,88]]){const m=chestModel(kit);m.position.set(x,y,z);m.rotation.y=yaw*Math.PI/180;objects.add(m);rec.chests.push({mesh:m,home:new THREE.Vector3(x,y,z),open:0});}}
    for(const d of data.dynamic||[]){const m=d.type==='switch'?switchModel(kit,d):boxModel(kit);m.position.fromArray(d.position);m.rotation.y=(d.yaw||0)*Math.PI/180;objects.add(m);const q={d,mesh:m,base:m.position.clone()};if(d.type==='switch'){rec.switch=q;world.switchMesh=m;}else{rec.steps.push(q);m.visible=false;}}
    for(const box of data.waterBoxes||[]){const[x0,x1]=box.x,[z0,z1]=box.z,mat=new THREE.MeshPhysicalMaterial({color:'#7db1b5',map:maps[4]||maps[2]||maps[0],transparent:true,opacity:.19,alphaTest:.001,depthWrite:false,roughness:.15,metalness:0,clearcoat:.95,ior:1.46,side:THREE.DoubleSide}),surface=new THREE.Mesh(facesGeometry([[x0,0,z0],[x1,0,z0],[x1,0,z1],[x0,0,z1]],[[0,2,1],[0,3,2]],5),mat);surface.position.y=box.height;surface.name='Translucent glass-noodle surface';surface.renderOrder=2;objects.add(surface);rec.water.push({box,mesh:surface});world.waterMeshes.push(surface);
      const gs=[];for(let i=0;i<280;i++){const x=x0+random()*(x1-x0),z=z0+random()*(z1-z0),a=random()*TAU,ps=[];for(let j=0;j<10;j++){const t=j/9-.5;ps.push([x+Math.cos(a)*t*1.7,box.height+.025+Math.sin(j*.7)*.02,z+Math.sin(a)*t*1.7]);}gs.push(kit.noodleGeometry(ps,.018,10,5));}const glass=kit.materials.white.clone();glass.color.set('#a0d1cc');glass.roughness=.16;glass.transparent=true;glass.opacity=.62;const noodles=merged(kit,gs,glass);noodles.name='Individual floating glass noodles';objects.add(noodles);
    }
    for(const current of data.currents.filter(c=>c.activeFirstAct)){const root=new THREE.Group(),gs=[];root.position.fromArray(current.position);root.name=current.strength>0?'Whirlpool of glass spaghetti':'Rising glass-noodle current';for(let k=0;k<14;k++){const ps=[];for(let j=0;j<=42;j++){const t=j/42,a=t*TAU*2.5+k/14*TAU,r=current.strength>0?.3+t*3.6:.3+t*.9;ps.push([Math.cos(a)*r,t*7,Math.sin(a)*r]);}gs.push(kit.noodleGeometry(ps,.025,50,5));}const mat=kit.materials.white.clone();mat.color.set('#9ec6c1');mat.transparent=true;mat.opacity=.62;root.add(merged(kit,gs,mat));objects.add(root);rec.currentMesh=root;}
    const points=(data.route||[]).map(vec);for(const p of points){const ps=[];for(let i=0;i<=12;i++){const a=i/12*TAU;ps.push([p.x+Math.sin(a)*.25,p.y+.1,p.z+Math.cos(a)*.25]);}route.add(kit.strand(ps,.022,kit.materials.saffron,12));}rec.routePoints=points;return rec;
  }
  area(course,renderData,1);onProgress(42);area(course.interior,renderData.interior,2);onProgress(76);
  function currentAt(x,y,z){const flow={x:0,y:0,z:0};for(const c of world.activeCourse.currents||[]){if(!c.activeFirstAct)continue;const dx=c.position[0]-x,dy=c.position[1]-y,dz=c.position[2]-z,d=Math.hypot(dx,dy,dz),h=Math.hypot(dx,dz),radius=c.strength>=0?(world.area===2?40:20):20;if(d>=radius||d<.26&&c.strength>=0||d<.001)continue;const strength=c.strength*.3*(1-d/radius),yaw=Math.atan2(dx,dz)-Math.PI/4*10/(d+10);flow.x+=strength*h/d*Math.sin(yaw);flow.y+=strength*dy/d;flow.z+=strength*h/d*Math.cos(yaw);}return flow;}
  function getWaterInfo(x,z,p){const b=world.activeCourse.waterBoxes.find(b=>x>=b.x[0]&&x<=b.x[1]&&z>=b.z[0]&&z<=b.z[1]);if(!b)return null;return {level:b.height,flow:currentAt(x,p?.position?.y??b.height-1,z)};}
  function syncCollision(){if(world.area!==2)return;const rec=areaRecords[2];for(const q of rec.steps){const active=mission.stepsActive&&!mission.brokenSteps.has(q.d.kind);physics.setDynamicEnabled(q.d.kind,active);q.mesh.visible=active&&mission.stepsVisible;}
    const q=rec.switch,ratio=1-mission.switchPress*(1-.2/1.5);q.mesh.scale.y=ratio;
    const vertices=q.d.vertices.map(v=>[v[0]+q.d.position[0],v[1]*ratio+q.d.position[1],v[2]+q.d.position[2]]);physics._liveFaces(vertices,q.d.triangles,q.d.kind);
  }
  function setArea(index,p,{warp=true,displacement}={}){const rec=areaRecords[index];if(!rec)throw Error('Unknown Dire Dire Docks area '+index);const old=world.area,offset=displacement||areaRecords[old].data.instantWarps.find(w=>w.area===index)?.displacement||[0,0,0];world.area=index;world.activeCourse=rec.data;world.inside=index===2;world.roomId=index;world.roomName=world.areaName=index===1?'Entrance basin':'Submarine dock';mission.area=index;physics.setCourse(rec.data);
    for(const a of Object.values(areaRecords)){const shown=a.index===index;a.land.visible=a.objects.visible=a.route.visible=shown;}world.coins=rec.coins;world.signs=rec.signs;world.routePoints=rec.routePoints;world.platforms=index===2?[rec.switch,...rec.steps]:[];world.hazards=[...rec.sharks,...rec.clams];syncCollision();
    if(p){if(warp){if(p.instantWarp)p.instantWarp(offset,physics);else{p.position.x+=offset[0];p.position.y+=offset[1];p.position.z+=offset[2];p.setPhysics?.(physics);}}else p.setPhysics?.(physics);p.setWaterSource?.(getWaterInfo);}
    world.callbacks.areaChanged?.({area:index,course:rec.data,physics,start:rec.data.start,spawn:p?{position:[p.position.x,p.position.y,p.position.z],yawRadians:p.yaw}:rec.data.start,star:world.starPosition,displacement:p&&warp?offset:null,fromArea:old});
  }
  function update(time,dt,p){
    uniforms.pastaTime.value=time;if(p)uniforms.pastaFoot.value.copy(vec(p.position));mission.preStep(dt,p);syncCollision();world.starPosition.copy(vec(mission.starPosition));const rec=areaRecords[world.area];rec.time+=dt;
    for(const c of rec.coins)if(!c.collected){c.mesh.rotation.y=time*1.35+c.phase;c.mesh.position.y=c.position.y+Math.sin(time*2+c.phase)*.12;}
    for(const w of rec.seaweed){w.mesh.rotation.z=Math.sin(time*.8+w.phase)*.07;w.mesh.rotation.x=Math.sin(time*.55+w.phase)*.055;}
    for(const f of rec.fish){const a=rec.time*.4+f.phase;f.mesh.position.copy(f.home).add(new THREE.Vector3(Math.sin(a)*f.radius,Math.sin(a*1.3)*.5,Math.cos(a)*f.radius));f.mesh.rotation.y=a+Math.PI/2;f.mesh.userData.update(time+f.phase);}
    for(const s of rec.sharks){const a=rec.time*TAU*(128*30/65536);s.mesh.position.set(s.home.x+Math.sin(a)*17,s.home.y+Math.sin(a)*2,s.home.z+Math.cos(a)*17);s.mesh.rotation.y=a+Math.PI/2;s.mesh.userData.update(time);if(p&&s.mesh.position.distanceTo(vec(p.position).add(new THREE.Vector3(0,.6,0)))<1.65)world.callbacks.damage?.(s.mesh.position,3);}
    for(const c of rec.clams){c.age+=dt;if(c.state==='closed'&&c.age>5&&p&&c.home.distanceTo(vec(p.position))<5){c.state='open';c.age=0;}if(c.state==='open'&&c.age>5){c.state='closed';c.age=0;}c.open+=(Number(c.state==='open')-c.open)*(1-Math.exp(-5*dt));c.mesh.userData.top.rotation.x=-c.open*1.1;if(p&&c.open<.15&&Math.hypot(p.position.x-c.home.x,p.position.z-c.home.z)<1.5&&p.position.y>=c.home.y-.3&&p.position.y<c.home.y+1.2)world.callbacks.damage?.(c.home,2);}
    for(const c of rec.chests){const target=p&&c.home.distanceTo(vec(p.position))<2.5?1:0;c.open+=(target-c.open)*(1-Math.exp(-3*dt));c.mesh.userData.lid.rotation.x=-c.open*.85;}
    for(const f of rec.flames){f.phase+=dt;f.flaming=f.phase%6>3;f.mesh.scale.y=f.flaming?1.8+Math.sin(time*10)*.2:1;if(f.flaming&&p&&f.home.distanceTo(vec(p.position))<1.6)world.callbacks.damage?.(f.home,2);}
    if(rec.currentMesh)rec.currentMesh.rotation.y=time*(world.area===1?1.6:-1.2);rec.submarine?.userData.update(dt,time,p);
    for(let i=rec.fragments.length-1;i>=0;i--){const f=rec.fragments[i];f.age+=dt;f.velocity.y-=9*dt;f.mesh.position.addScaledVector(f.velocity,dt);f.mesh.rotation.x+=f.spin*dt;const floor=physics.groundAt(f.mesh.position.x,f.mesh.position.z,f.mesh.position.y+.2);if(floor&&f.mesh.position.y<floor.height+.03){f.mesh.position.y=floor.height+.03;f.velocity.y=Math.abs(f.velocity.y)*.2;f.velocity.x*=.8;f.velocity.z*=.8;}if(f.age>4){rec.objects.remove(f.mesh);f.mesh.geometry.dispose();rec.fragments.splice(i,1);}}
  }
  function burstStep(d){const rec=areaRecords[2],r=rng(419+mission.brokenSteps.size);for(let i=0;i<12;i++){const m=kit.strand([[-.18,0,0],[0,.05,.03],[.2,-.01,0]],.04,kit.materials.toasted,5);m.position.fromArray(d.position).add(new THREE.Vector3((r()-.5)*1.6,.3+r()*1.5,(r()-.5)*1.6));rec.objects.add(m);rec.fragments.push({mesh:m,age:0,spin:(r()-.5)*8,velocity:new THREE.Vector3((r()-.5)*3,1+r()*3,(r()-.5)*3)});}}
  function reset(){mission.reset();for(const rec of Object.values(areaRecords)){rec.time=0;for(const c of rec.coins){c.collected=false;c.mesh.visible=true;}for(const c of rec.clams){c.age=0;c.state='closed';c.open=0;}for(const c of rec.chests)c.open=0;for(const f of rec.fragments){rec.objects.remove(f.mesh);f.mesh.geometry.dispose();}rec.fragments.length=0;for(const s of rec.steps)s.mesh.visible=false;}setArea(1,undefined,{warp:false});world.starPosition.copy(vec(mission.starPosition));}
  Object.assign(world,{getWaterInfo,currentAt,setArea,update,reset,burstStep,areaRecords,action:p=>mission.action(p)==='opened',onGroundPound:p=>mission.onGroundPound(p)});reset();onProgress(100);return world;
}
