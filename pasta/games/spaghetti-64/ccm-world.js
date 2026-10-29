import * as THREE from './vendor/three.module.js';
import {CoursePhysics} from './physics.js';
import {CcmMission} from './ccm-mission.js';

const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const vec=p=>p?.isVector3?p.clone():Array.isArray(p)?new THREE.Vector3(...p):new THREE.Vector3(p.x,p.y,p.z);
const rng=(s=707)=>()=>{s=(Math.imul(s,1664525)+1013904223)|0;return(s>>>0)/4294967296;};
const palette={
  snow_09000000:['toasted','#ac875c'],snow_09000800:['blue','#a4d4d8'],snow_09001000:['blue','#8eaab6'],
  snow_09002000:['toasted','#ad9a75'],snow_09002800:['blue','#b8d6dd'],snow_09003000:['white','#eef0db'],
  snow_09004000:['egg','#dfc991'],snow_09004800:['toasted','#b49b6b'],snow_09005000:['toasted','#b99a65'],
  snow_09005800:['egg','#d9c695'],snow_09006000:['toasted','#bca479'],snow_09006800:['white','#e7e5cc'],
  snow_09007000:['white','#d6e5d9'],snow_09008000:['egg','#d5bd84'],snow_09008800:['white','#edf0e3'],
  ccm_seg7_texture_07000000:['toasted','#b79b6e'],ccm_seg7_texture_07000800:['toasted','#c1a66d'],
  ccm_seg7_texture_07000900:['white','#e5e2d0'],ccm_seg7_texture_07001900:['white','#ebe9d5'],
  ccm_seg7_texture_07003100:['white','#dbe9df'],ccm_seg7_texture_07004300:['blue','#a8bfca'],
  ccm_seg7_texture_07004B00:['ink','#7d9695'],ccm_seg7_texture_07003900:['blue','#afc2cb'],ccm_seg7_texture_07003B00:['blue','#badcdf'],
};
// These44source triangles are baked tree/bridge shadows. Actual noodle
// geometry casts the lighting-dependent shadows instead of painted decals.
const shadowIDs=new Set(['snow_09009000','snow_09009800']);
const translucentIDs=new Set(['snow_09000800','snow_09009000','snow_09009800','ccm_seg7_texture_07003900','ccm_seg7_texture_07003B00']);
const openIDs=new Set(['ccm_seg7_texture_07000900','snow_09004000','snow_09007000']);
function merged(kit,geometries,material){const m=new THREE.Mesh(kit.mergeGeometry(geometries),material);m.castShadow=m.receiveShadow=true;for(const g of geometries)g.dispose();return m;}
function facesGeometry(vertices,faces,scale=3.2){
  const ps=[],ns=[],uv=[];
  for(const f of faces){const a=vec(vertices[f[0]]),b=vec(vertices[f[1]]),c=vec(vertices[f[2]]),n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const axis=Math.abs(n.y)>.5?'y':Math.abs(n.x)>Math.abs(n.z)?'x':'z';
    for(const p of[a,b,c]){ps.push(p.x,p.y,p.z);ns.push(n.x,n.y,n.z);uv.push((axis==='x'?p.z:p.x)/scale,(axis==='y'?p.z:p.y)/scale);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(ns,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeBoundingSphere();return g;
}
function lattice(kit,vertices,faces,material){
  const gs=[],spacing=.30;
  for(const f of faces){const p=f.slice(0,3).map(i=>vec(vertices[i])),n=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize(),axes=Math.abs(n.y)>.6?['x','z']:Math.abs(n.x)>Math.abs(n.z)?['y','z']:['x','y'];
    for(const axis of axes){const low=Math.min(...p.map(q=>q[axis])),high=Math.max(...p.map(q=>q[axis]));
      for(let q=Math.ceil(low/spacing)*spacing;q<=high;q+=spacing){const hits=[];
        for(let i=0;i<3;i++){const a=p[i],b=p[(i+1)%3],d=b[axis]-a[axis];if(Math.abs(d)<1e-7)continue;const t=(q-a[axis])/d;if(t>=0&&t<=1){const hit=a.clone().lerp(b,t).addScaledVector(n,.008);if(!hits.some(h=>h.distanceToSquared(hit)<1e-7))hits.push(hit);}}
        if(hits.length===2&&hits[0].distanceTo(hits[1])>.03)gs.push(kit.noodleGeometry(hits,.035,2,5));
      }
    }
  }
  return merged(kit,gs,material);
}
function batch(kit,group){
  group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),buckets=new Map();
  group.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid;if(!buckets.has(key))buckets.set(key,{material:o.material,gs:[]});buckets.get(key).gs.push(o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));});
  group.clear();for(const b of buckets.values())group.add(merged(kit,b.gs,b.material));
}
function snowTree(kit,white,seed){
  const root=new THREE.Group(),gs=[];root.name='Fir of spinach spaghetti and rice noodles';
  root.add(kit.bundle([0,0,0],[0,4.9,0],.17,kit.materials.toasted,8,seed));
  for(let tier=0;tier<3;tier++)for(let strand=0;strand<4;strand++){
    const ps=[],base=.9+tier*1.1,height=2.05,radius=1.42-tier*.30;
    for(let j=0;j<=90;j++){const t=j/90,a=t*TAU*8+strand*Math.PI/2,r=radius*(1-t);ps.push([Math.cos(a)*r,base+t*height+Math.sin(a*2.1+seed)*.022,Math.sin(a)*r]);}
    gs.push(kit.noodleGeometry(ps,.049,110,5));
  }
  root.add(merged(kit,gs,white));return root;
}
function penguin(kit,{adult=false}={}){
  const root=new THREE.Group(),body=new THREE.Group(),wings=[],feet=[];root.name=adult?'Mother penguin of squid-ink and rice spaghetti':'Baby penguin of squid-ink and rice spaghetti';root.add(body);
  const torso=kit.coilBall(.56,kit.materials.ink,819);torso.scale.set(1,1.18,.9);torso.position.y=.65;body.add(torso);
  const belly=kit.coilBall(.40,kit.materials.white,352);belly.scale.set(1,1.17,.30);belly.position.set(0,.68,.44);body.add(belly);
  const head=kit.coilBall(.39,kit.materials.ink,87);head.position.set(0,1.27,.02);body.add(head);
  for(const s of[-1,1]){
    const cheek=kit.coilBall(.16,kit.materials.white,36);cheek.scale.set(.75,1,.44);cheek.position.set(s*.155,1.3,.35);body.add(cheek);
    const pupil=kit.strand([[s*.155,1.35,.415],[s*.155,1.27,.425]],.027,kit.materials.ink,3);body.add(pupil);
    const wing=new THREE.Group();wing.position.set(s*.48,.92,0);wing.add(kit.bundle([0,0,0],[s*.30,-.43,-.06],.13,kit.materials.ink,7,82));body.add(wing);wings.push(wing);
    const foot=kit.coilBall(.20,kit.materials.saffron,87);foot.scale.set(.9,.28,1.6);foot.position.set(s*.29,.085,.20);root.add(foot);feet.push(foot);
  }
  const beak=[];for(let j=0;j<4;j++){const x=(j-1.5)*.052;beak.push(kit.noodleGeometry([[x,1.20,.35],[x*.48,1.16,.66],[x,1.13,.38]],.035,10,5));}body.add(merged(kit,beak,kit.materials.saffron));
  root.scale.setScalar(adult?2.25:.76);root.userData.animate=(t,moving=0)=>{body.rotation.z=Math.sin(t*2.6)*(.025+moving*.06);wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*(.10+Math.sin(t*1.8+i)*.07));feet.forEach((f,i)=>f.position.y=.085+Math.max(0,Math.sin(t*5+i*Math.PI))*.09*moving);};return root;
}
function snowman(kit,white,{headOnly=false}={}){
  const root=new THREE.Group();root.name='Coiled rice-noodle snowman';
  if(!headOnly){const body=kit.coilBall(.73,white,11);body.position.y=.72;root.add(body);}
  const head=kit.coilBall(.48,white,35);head.position.y=headOnly?.48:1.65;root.add(head);const y=head.position.y;
  for(const s of[-1,1])root.add(kit.strand([[s*.16,y+.13,.45],[s*.16,y+.04,.48]],.043,kit.materials.ink,4));
  root.add(kit.bundle([0,y-.04,.43],[0,y-.10,.82],.085,kit.materials.saffron,5,93));
  if(!headOnly)for(const s of[-1,1])root.add(kit.bundle([s*.6,.98,0],[s*1.05,1.37,.05],.065,kit.materials.toasted,5,47));
  return root;
}
function spindrift(kit){
  const root=new THREE.Group(),crown=new THREE.Group();root.name='Spaghetti Spindrift';
  const body=kit.coilBall(.40,kit.materials.white,82);body.position.y=.48;root.add(body);crown.position.y=1.02;root.add(crown);
  for(let j=0;j<5;j++){const a=j/5*TAU,petal=kit.coilBall(.30,kit.materials.pink,28);petal.scale.set(.58,.25,1.35);petal.position.set(Math.sin(a)*.30,0,Math.cos(a)*.30);petal.rotation.y=a;crown.add(petal);}
  for(const s of[-1,1])root.add(kit.strand([[s*.13,.61,.37],[s*.13,.50,.40]],.036,kit.materials.ink,4));root.userData.crown=crown;return root;
}
function sign(kit){const root=kit.pole(1.5,.07),gs=[];for(let j=0;j<10;j++)gs.push(kit.noodleGeometry([[-.57,1+j*.065,0],[0,1.01+j*.065,.02],[.57,1+j*.065,0]],.043,6,5));root.add(merged(kit,gs,kit.materials.egg));return root;}
function door(kit){
  const root=new THREE.Group(),hinge=new THREE.Group(),gs=[];root.name='Opening cabin door of folded pasta';root.add(hinge);
  for(let j=0;j<19;j++){const x=j/18*1.54;gs.push(kit.noodleGeometry([[x,.03,0],[x+.018,1.27,.018],[x,2.56,0]],.052,12,5));}
  for(const y of[.30,2.22])gs.push(kit.noodleGeometry([[.01,y,.075],[.77,y-.025,.095],[1.54,y,.075]],.060,10,5));hinge.add(merged(kit,gs,kit.materials.toasted));
  const handle=kit.strand([[1.37,1.03,.08],[1.37,1.03,.24],[1.37,1.27,.24],[1.37,1.27,.08]],.035,kit.materials.saffron,14);hinge.add(handle);
  root.userData.hinge=hinge;return root;
}

export async function createCcmWorld(scene,kit,course,renderData,physics,{onProgress=()=>{},...initialCallbacks}={}){
  const terrain=new THREE.Group(),props=new THREE.Group(),guide=new THREE.Group();terrain.name='Cool, Cool Mountain original terrain in rice pasta';props.name='Cool, Cool Mountain pasta objects';guide.name='Optional pasta route';guide.visible=false;scene.add(terrain,props,guide);
  const loads=await Promise.allSettled(['rice-noodle-surface.png','tagliatelle-surface.png','spaghetti-surface.png'].map(name=>new THREE.TextureLoader().loadAsync('./assets/'+name)));
  const textures=loads.map(x=>x.status==='fulfilled'?x.value:null);for(const map of textures)if(map){map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;}
  const riceMap=textures[0]||textures[2],ribbonMap=textures[1]||textures[2],materials={},white=kit.materials.white.clone();white.color.set('#eef0e4');white.name='Soft white rice spaghetti';white.roughness=.29;
  const uniforms={pastaFoot:{value:new THREE.Vector3(1e5,1e5,1e5)},pastaYield:{value:.032}};
  function deform(material){material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='uniform vec3 pastaFoot; uniform float pastaYield;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat pastaD=distance(position.xz,pastaFoot.xz); float pastaH=abs(position.y-pastaFoot.y); transformed.y-=exp(-pastaD*pastaD*1.6)*exp(-pastaH*pastaH*2.0)*pastaYield;');};}
  const materialFor=id=>{if(materials[id])return materials[id];const [type,color]=palette[id]||['white','#e5e9da'],ribbon=type==='toasted',map=ribbon?ribbonMap:riceMap;
    const transparent=translucentIDs.has(id),m=new THREE.MeshPhysicalMaterial({color,map,metalness:0,roughness:ribbon?.34:.24,clearcoat:.62,clearcoatRoughness:.19,ior:1.46,bumpMap:map,bumpScale:ribbon?.028:.038,sheen:.12,sheenColor:new THREE.Color('#f6edcb'),side:THREE.DoubleSide,transparent,opacity:transparent?(id==='ccm_seg7_texture_07003900'?.07:.18):1,depthWrite:!transparent,alphaTest:transparent?.001:0});m.name=ribbon?'Toasted tagliatelle cabin and bridge':'Glossy rice-noodle mountain';deform(m);materials[id]=m;return m;};
  const mission=new CcmMission(physics,course),callbacks={...initialCallbacks},areaRecords={};
  const world={terrain,props,guide,materials,callbacks,mission,area:1,activeCourse:course,areaRecords,coins:[],enemies:[],friends:[],rollingBalls:[],chomp:null,signs:[],routePoints:[],bossSpawn:vec(course.mission.entry.position),starPosition:vec(mission.starPosition)};mission.world=world;
  Object.defineProperty(world,'starCollectible',{get:()=>mission.starCollectible});
  Object.defineProperty(world,'mapGoal',{get:()=>world.area===2?mission.exit:mission.starReady?mission.starDestination:mission.entry});
  function addFaces(vertices,faces,target){const groups=new Map();for(const f of faces){if(shadowIDs.has(f[3]))continue;const id=f[3]||'snow_09008800';if(!groups.has(id))groups.set(id,[]);groups.get(id).push(f);}for(const[id,fs]of groups){const m=openIDs.has(id)?lattice(kit,vertices,fs,kit.materials[(palette[id]||['white'])[0]]):new THREE.Mesh(facesGeometry(vertices,fs),materialFor(id));m.castShadow=m.receiveShadow=true;target.add(m);}}
  function buildArea(data,render,index){
    const land=new THREE.Group(),objects=new THREE.Group(),fixed=new THREE.Group(),route=new THREE.Group(),random=rng(709+index),localPhysics=new CoursePhysics(data);terrain.add(land);props.add(objects);objects.add(fixed);guide.add(route);land.name=index===1?'Source mountain and cabins in pasta':'Complete source slide, bowls, gap and shortcut in pasta';addFaces(render.vertices,render.triangles,land);
    const record={index,data,render,land,objects,fixed,route,coins:[],signs:[],penguins:[],snowmen:[],spindrifts:[],doors:[],platforms:[],projectiles:[],flakes:[],routePoints:[]};areaRecords[index]=record;
    const grounded=(p,extra=0)=>{const q=vec(p),f=localPhysics.groundAt(q.x,q.z,q.y+.65);if(f&&q.y-f.height<12)q.y=f.height;q.y+=extra;return q;};
    const place=(m,p,yaw=0,animated=false)=>{m.position.copy(p?.isVector3?p:vec(p));m.rotation.y=yaw*Math.PI/180;(animated?objects:fixed).add(m);return m;};
    const addCoin=(p,red=false)=>{const position=vec(p).add(new THREE.Vector3(0,.5,0)),m=kit.coin(.29,red);m.position.copy(position);objects.add(m);record.coins.push({mesh:m,position,value:red?2:1,collected:false,phase:random()*TAU});};
    // Thin physical strands break up silhouette and specular highlights above
    // the photographic pasta surface without changing source collision.
    const surfaces=[];let total=0;for(const f of render.triangles){if(shadowIDs.has(f[3])||openIDs.has(f[3]))continue;const a=vec(render.vertices[f[0]]),b=vec(render.vertices[f[1]]),c=vec(render.vertices[f[2]]),n=b.clone().sub(a).cross(c.clone().sub(a)),ar=n.length()/2;n.normalize();if(n.y<.35||ar<.08)continue;total+=ar;surfaces.push({a,b,c,n,ar,type:(palette[f[3]]||['white'])[0]});}
    const strands=new Map();for(const f of surfaces){const count=Math.max(1,Math.round((index===1?2300:2600)*f.ar/(total||1)));for(let i=0;i<count;i++){let u=random(),w=random();if(u+w>1){u=1-u;w=1-w;}const p=f.a.clone().addScaledVector(f.b.clone().sub(f.a),u).addScaledVector(f.c.clone().sub(f.a),w),a=random()*TAU,length=.55+random()*1.15,ps=[];
        for(let j=0;j<7;j++){const t=(j/6-.5)*length,x=p.x+Math.cos(a)*t+Math.sin(j*.8+i)*.025,z=p.z+Math.sin(a)*t,y=p.y-(f.n.x*(x-p.x)+f.n.z*(z-p.z))/f.n.y+.032;ps.push([x,y,z]);}
        if(!strands.has(f.type))strands.set(f.type,[]);strands.get(f.type).push(kit.noodleGeometry(ps,.027,7,5));}}
    for(const[type,gs]of strands){const m=type==='white'?white:kit.materials[type];land.add(merged(kit,gs,m));}
    for(const o of data.objects||[]){const k=o.kind,p=o.position,yaw=o.yaw||0;
      if(k==='special_snow_tree')place(snowTree(kit,white,Math.floor(random()*100)),grounded(p));
      else if(k==='macro_red_coin')addCoin(p,true);
      else if(k.startsWith('macro_yellow_coin')||k==='macro_moving_blue_coin')addCoin(p);
      else if(k.includes('coin_line'))for(let i=0;i<5;i++){const a=yaw*Math.PI/180,t=(i-2)*1.6;addCoin(k.includes('vertical')?[p[0],p[1]+t,p[2]]:[p[0]+Math.sin(a)*t,p[1],p[2]+Math.cos(a)*t]);}
      else if(k==='macro_coin_arrow')for(const[x,z]of[[0,-2],[0,-.8],[0,.4],[-1.1,-.7],[1.1,-.7]]){const a=yaw*Math.PI/180;addCoin([p[0]+x*Math.cos(a)+z*Math.sin(a),p[1],p[2]-x*Math.sin(a)+z*Math.cos(a)]);}
      else if(k==='macro_wooden_signpost'){const position=grounded(p);place(sign(kit),position,yaw);record.signs.push({position,text:index===2?'Lean into the curves. Hold C / Ctrl or the BRAKE button to slow down before a sharp bend. There is a real gap in the slide: carry speed or jump across it. At the bottom, walk through the cabin door. This first mission has no race or time limit.':'The first star waits beyond the cabin slide. Jump onto the roof, drop into the chimney, then steer your pasta body down the long course. Leave through the lower cabin door and collect the star outside.'});}
      else if(k==='special_wooden_door_warp'){const m=place(door(kit),p,yaw,true);record.doors.push({mesh:m,position:vec(p),open:0});}
      else if(k==='bhvSmallPenguin'||k==='bhvTuxiesMother'){const m=place(penguin(kit,{adult:k==='bhvTuxiesMother'}),grounded(p),yaw,true);record.penguins.push({mesh:m,home:m.position.clone(),phase:random()*TAU,adult:k==='bhvTuxiesMother'});}
      else if(k==='bhvSnowmansHead')place(snowman(kit,white,{headOnly:true}),grounded(p),yaw);
      else if(k==='bhvMrBlizzard'||k.startsWith('macro_mr_blizzard')){const m=place(snowman(kit,white),grounded(p),yaw,true);record.snowmen.push({mesh:m,position:m.position.clone(),home:m.position.clone(),phase:random()*TAU,throwTimer:2+random()*3});}
      else if(k==='macro_spindrift'){const m=place(spindrift(kit),grounded(p),yaw,true);record.spindrifts.push({mesh:m,home:m.position.clone(),phase:random()*TAU,alive:true});}
      else if(k==='macro_cannon_closed'){const m=kit.coilBall(.72,kit.materials.toasted,13);m.scale.y=.20;place(m,grounded(p,.06));}
      else if(k.includes('bobomb_buddy'))place(kit.bomb({friendly:true}),grounded(p),yaw);
      else if(k==='macro_recovery_heart'){const loop=[];for(let j=0;j<=48;j++){const a=j/48*TAU;loop.push([Math.sin(a)**3*.52,.9+(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*.032,0]);}const m=place(kit.strand(loop,.07,kit.materials.tomato,60),p,0,true);record.heart={mesh:m,position:vec(p),cooldown:0};}
    }
    for(const d of data.dynamic||[]){const m=new THREE.Group();m.name='Spaghetti ropeway lift';addFaces(d.renderVertices||d.vertices,d.renderTriangles||d.triangles,m);m.position.fromArray(d.position);m.rotation.y=(d.yaw||0)*Math.PI/180;objects.add(m);record.platforms.push({d,mesh:m,previous:m.position.clone()});}
    for(const box of data.waterBoxes||[]){const vs=[[box.x[0],box.height,box.z[0]],[box.x[1],box.height,box.z[0]],[box.x[1],box.height,box.z[1]],[box.x[0],box.height,box.z[1]]],m=new THREE.Mesh(facesGeometry(vs,[[0,2,1],[0,3,2]]),materialFor('snow_09008000'));m.receiveShadow=true;fixed.add(m);}
    const routePoints=(data.route?.length?data.route:index===2?course.mission.slidePath:[]).map(vec),gs=[];for(let i=1;i<routePoints.length;i++){const a=routePoints[i-1],b=routePoints[i],count=Math.ceil(a.distanceTo(b)/2.8);for(let j=0;j<count;j++){const p=a.clone().lerp(b,j/count),ps=[];for(let k=0;k<=7;k++){const q=k/7*TAU;ps.push([p.x+Math.cos(q)*.10,p.y+.08,p.z+Math.sin(q)*.10]);}gs.push(kit.noodleGeometry(ps,.028,8,5));}}if(gs.length)route.add(merged(kit,gs,kit.materials.saffron));record.routePoints=routePoints;
    batch(kit,fixed);return record;
  }
  buildArea(course,renderData,1);onProgress(45);buildArea(course.interior,renderData.interior,2);onProgress(78);
  // Falling flakes are curved pieces of rice pasta with gravity, air drag and
  // a short settling interval when they reach the sampled source surface.
  const flakeGroup=new THREE.Group();flakeGroup.name='Falling rice-noodle fragments';areaRecords[1].objects.add(flakeGroup);
  const random=rng(808),flakeGeometry=kit.noodleGeometry([[-.08,0,0],[0,.025,.025],[.08,0,.01]],.018,5,4);
  for(let i=0;i<64;i++){const m=new THREE.Mesh(flakeGeometry,white);m.castShadow=false;m.position.set(course.start.position[0]+(random()-.5)*34,course.start.position[1]+random()*20,course.start.position[2]+(random()-.5)*34);flakeGroup.add(m);areaRecords[1].flakes.push({mesh:m,vy:-.8-random(),phase:random()*TAU,settled:0,floor:-100});}
  function getSlideInfo(){return{enabled:world.area===2};}
  function setArea(index,player,{warp=true,spawn,entry='warp'}={}){
    const record=areaRecords[index];if(!record)throw Error('Unknown Cool, Cool Mountain area '+index);
    world.area=index;world.activeCourse=record.data;physics.setCourse(record.data);player?.setPhysics?.(physics);
    for(const[id,a]of Object.entries(areaRecords))a.land.visible=a.objects.visible=a.route.visible=+id===index;
    world.coins=record.coins;world.signs=record.signs;world.routePoints=record.routePoints;
    const arrival=spawn||record.data.start;
    if(warp&&player){player.warp(arrival,{physics,preserveVitals:true});player.setSlideSource(getSlideInfo);}
    mission.enterArea(index,player,{entry});
    world.callbacks.areaChanged?.({area:index,course:record.data,physics,start:arrival,spawn:arrival,star:world.starPosition});
    world.starPosition.copy(mission.starPosition);
  }
  function update(time,dt,player){
    const record=areaRecords[world.area];world.starPosition.copy(mission.starPosition);
    if(player){uniforms.pastaFoot.value.set(player.position.x,player.position.y,player.position.z);uniforms.pastaYield.value=.018+player.cookingSoftness*.045;}
    for(const c of record.coins)if(!c.collected){c.mesh.rotation.y=time*1.4+c.phase;c.mesh.position.y=c.position.y+Math.sin(time*2+c.phase)*.08;}
    for(const d of record.doors){const near=player&&Math.hypot(player.position.x-d.position.x,player.position.y-d.position.y,player.position.z-d.position.z)<3;d.open+=(Number(near)-d.open)*(1-Math.exp(-8*dt));d.mesh.userData.hinge.rotation.y=-d.open*1.15;}
    for(const p of record.penguins){p.mesh.userData.animate(time+p.phase,0);p.mesh.rotation.y+=Math.sin(time*.5+p.phase)*dt*.025;}
    for(const s of record.spindrifts){if(!s.alive)continue;s.mesh.userData.crown.rotation.y=time*5+s.phase;s.mesh.position.y=s.home.y+Math.sin(time*2+s.phase)*.12;if(player&&Math.hypot(player.position.x-s.mesh.position.x,player.position.z-s.mesh.position.z)<.95){const dy=player.position.y-s.mesh.position.y;if(player.velocity.y<-.6&&dy>.7&&dy<1.8){s.alive=false;s.mesh.visible=false;player.velocity.y=9;player.grounded=false;world.callbacks.burst?.(s.home,12,white);}else if(Math.abs(dy)<1.2)world.callbacks.damage?.(s.mesh.position,1);}}
    for(const s of record.snowmen){s.mesh.rotation.y+=Math.sin(time*.6+s.phase)*dt*.10;s.throwTimer-=dt;if(player){const dx=player.position.x-s.home.x,dz=player.position.z-s.home.z,range=Math.hypot(dx,dz);if(range<16&&Math.abs(player.position.y-s.home.y)<5){s.mesh.rotation.y=Math.atan2(dx,dz);if(s.throwTimer<=0){s.throwTimer=3.7;const m=kit.coilBall(.22,white,93);m.position.copy(s.home).add(new THREE.Vector3(0,1.6,0));record.objects.add(m);record.projectiles.push({mesh:m,velocity:new THREE.Vector3(dx/(range||1)*8,4,dz/(range||1)*8),life:3});}}}}
    for(let i=record.projectiles.length-1;i>=0;i--){const q=record.projectiles[i];q.life-=dt;q.velocity.y-=dt*12;q.mesh.position.addScaledVector(q.velocity,dt);q.mesh.rotation.x+=dt*2.5;if(player&&q.mesh.position.distanceTo(new THREE.Vector3(player.position.x,player.position.y+.8,player.position.z))<.8){world.callbacks.damage?.(q.mesh.position,1);q.life=0;}const f=physics.groundAt(q.mesh.position.x,q.mesh.position.z,q.mesh.position.y+.4);if(f&&q.mesh.position.y<f.height+.2)q.life=0;if(q.life<=0){record.objects.remove(q.mesh);record.projectiles.splice(i,1);}}
    for(const lift of record.platforms){const path=lift.d.path||[lift.d.position],segments=path.slice(1).map((p,i)=>vec(p).distanceTo(vec(path[i]))),total=segments.reduce((a,b)=>a+b,0);let distance=(time*2.3)%(total||1),at=vec(path[0]);for(let j=0;j<segments.length;j++){if(distance<=segments[j]){at=vec(path[j]).lerp(vec(path[j+1]),distance/(segments[j]||1));break;}distance-=segments[j];}const previous=lift.mesh.position.clone();lift.mesh.position.copy(at);physics.setDynamicPose(lift.d.kind,at.toArray(),[0,0,0]);if(player?.grounded){const f=physics.groundAt(player.position.x,player.position.z,player.position.y+.55);if(f?.triangle.dynamic===lift.d.kind){player.position.x+=at.x-previous.x;player.position.y+=at.y-previous.y;player.position.z+=at.z-previous.z;}}}
    if(record.heart){record.heart.mesh.rotation.y=time;record.heart.cooldown=Math.max(0,record.heart.cooldown-dt);if(player&&record.heart.cooldown===0&&Math.hypot(player.position.x-record.heart.position.x,player.position.y-record.heart.position.y,player.position.z-record.heart.position.z)<1.5){player.health=Math.min(8,player.health+1);record.heart.cooldown=.15;}}
    if(player&&world.area===1)for(const q of record.flakes){const m=q.mesh;let expired=false;if(q.settled>0){q.settled-=dt;expired=q.settled<=0;}else{q.vy=Math.max(-2.3,q.vy-4*dt);m.position.y+=q.vy*dt;m.position.x+=Math.sin(time*.6+q.phase)*dt*.22;m.rotation.x+=dt*.6;m.rotation.z+=Math.sin(time+q.phase)*dt*.4;if(m.position.y<q.floor+.03){m.position.y=q.floor+.03;q.settled=.35;}}
      if(Math.hypot(m.position.x-player.position.x,m.position.z-player.position.z)>23||m.position.y<player.position.y-7||expired){m.position.set(player.position.x+(random()-.5)*34,player.position.y+7+random()*12,player.position.z+(random()-.5)*34);q.vy=-.6-random();q.settled=0;const f=physics.groundAt(m.position.x,m.position.z,m.position.y);q.floor=f?.height??player.position.y-12;}}
  }
  function reset(){
    mission.reset();for(const a of Object.values(areaRecords)){for(const c of a.coins){c.collected=false;c.mesh.visible=true;}for(const s of a.spindrifts){s.alive=true;s.mesh.visible=true;}for(const q of a.projectiles)a.objects.remove(q.mesh);a.projectiles.length=0;for(const d of a.doors){d.open=0;d.mesh.userData.hinge.rotation.y=0;}for(const p of a.platforms)p.mesh.position.fromArray(p.d.position);}
    setArea(1,undefined,{warp:false,entry:'reset'});mission.areaTransitions=0;mission.warpCooldown=0;
  }
  world.getSlideInfo=getSlideInfo;world.setArea=setArea;world.update=update;world.reset=reset;world.action=player=>mission.action(player)==='opened';world.onGroundPound=()=>false;
  reset();onProgress(100);return world;
}
