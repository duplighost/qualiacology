import * as THREE from './vendor/three.module.js';
import {BowserArenaMission} from './bowser-arena-mission.js';

const TAU=Math.PI*2,UNIT=TAU/65536,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const vec=p=>p?.isVector3?p.clone():Array.isArray(p)?new THREE.Vector3(...p):new THREE.Vector3(p.x,p.y,p.z);
const random=(s=1)=>()=>{s=(Math.imul(s,1664525)+1013904223)|0;return(s>>>0)/4294967296;};
function merge(kit,gs,material){const geometry=kit.mergeGeometry(gs);gs.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;return mesh;}
function surfaceGeometry(vertices,faces,tile=1.8,maxEdge=6){
  const positions=[],normals=[],uv=[];
  function emit(a,b,c,n,depth=0){const edges=[a.distanceTo(b),b.distanceTo(c),c.distanceTo(a)],longest=Math.max(...edges);if(longest>maxEdge&&depth<7){if(edges[0]===longest){const m=a.clone().lerp(b,.5);emit(a,m,c,n,depth+1);emit(m,b,c,n,depth+1);}else if(edges[1]===longest){const m=b.clone().lerp(c,.5);emit(a,b,m,n,depth+1);emit(a,m,c,n,depth+1);}else{const m=c.clone().lerp(a,.5);emit(a,b,m,n,depth+1);emit(m,b,c,n,depth+1);}return;}const axes=Math.abs(n.y)>.55?['x','z']:Math.abs(n.x)>.55?['z','y']:['x','y'];for(const p of[a,b,c]){positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);uv.push(p[axes[0]]/tile,p[axes[1]]/tile);}}
  for(const f of faces){const a=vec(vertices[f[0]]),b=vec(vertices[f[1]]),c=vec(vertices[f[2]]),n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();if(n.lengthSq())emit(a,b,c,n);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeBoundingSphere();if(maxEdge<10)g.userData.softwareGeometry=surfaceGeometry(vertices,faces,tile,13);return g;
}
function surfaceStrands(kit,vertices,faces,material,count,seed){
  const r=random(seed),gs=[],surfaces=[];let total=0;
  for(const f of faces){const a=vec(vertices[f[0]]),b=vec(vertices[f[1]]),c=vec(vertices[f[2]]),n=b.clone().sub(a).cross(c.clone().sub(a)),area=n.length()*.5;n.normalize();if(n.y<.35||area<.02)continue;surfaces.push({a,b,c,n,area});total+=area;}
  for(const f of surfaces){const tangent=f.b.clone().sub(f.a).normalize(),cross=new THREE.Vector3().crossVectors(f.n,tangent),n=Math.max(1,Math.round(count*f.area/total));for(let i=0;i<n;i++){let u=r(),v=r();if(u+v>1){u=1-u;v=1-v;}const p=f.a.clone().addScaledVector(f.b.clone().sub(f.a),u).addScaledVector(f.c.clone().sub(f.a),v).addScaledVector(f.n,.023),a=r()*TAU,l=Math.min(.55+r()*1.1,Math.sqrt(f.area)*.4),points=[];for(let j=0;j<7;j++){const t=(j/6-.5)*l;points.push(p.clone().addScaledVector(tangent,Math.cos(a)*t).addScaledVector(cross,Math.sin(a)*t+Math.sin(j*.9+i)*.026));}gs.push(kit.noodleGeometry(points,.027,9,5));}}
  return merge(kit,gs,material);
}
function coilSpike(kit,base,tip,width,material){const a=vec(base),b=vec(tip),axis=b.clone().sub(a).normalize(),right=new THREE.Vector3(1,0,0).addScaledVector(axis,-axis.x).normalize();if(right.lengthSq()<.01)right.set(0,0,1);const up=new THREE.Vector3().crossVectors(axis,right),p=[];for(let i=0;i<=72;i++){const t=i/72,theta=t*TAU*7,r=width*(1-t);p.push(a.clone().lerp(b,t).addScaledVector(right,Math.cos(theta)*r).addScaledVector(up,Math.sin(theta)*r));}return kit.strand(p,.065,material,100);}

// Each body part is wound pasta, the horn/spike silhouettes are tapered coils,
// and the tail uses a damped chain rather than a rigid cone or skin-colored solid.
export function createPastaBowser(kit){
  const root=new THREE.Group(),body=new THREE.Group(),head=new THREE.Group(),shell=new THREE.Group(),tailRoot=new THREE.Group();root.name='Bowser made entirely of wound spaghetti, rigatoni and pasta coils';root.add(body,tailRoot);body.add(shell,head);
  const m=kit.materials;
  function wound(rx,ry,rz,material,thickness,seed){const o=new THREE.Mesh(kit.winding(rx,ry,rz,thickness,seed),material);o.castShadow=o.receiveShadow=true;return o;}
  const core=wound(1.55,1.65,1.25,m.saffron,.07,200);core.position.y=2.05;body.add(core);
  const back=wound(1.74,1.82,.8,m.spinach,.078,72);back.position.set(0,2.35,-.85);shell.add(back);
  for(let j=0;j<5;j++){const t=j/4*Math.PI-Math.PI/2,p=[];for(let k=0;k<=42;k++){const a=k/42*TAU;p.push([Math.cos(a)*1.74*Math.cos(t),2.35+Math.sin(t)*1.82,-.85+Math.sin(a)*.8*Math.cos(t)]);}shell.add(kit.strand(p,.075,m.white,48));}
  const rim=[];for(let j=0;j<=75;j++){const a=j/75*TAU;rim.push([Math.sin(a)*1.8,2.3+Math.cos(a)*1.85,-.58]);}shell.add(kit.strand(rim,.14,m.white,80));
  for(const [x,y,z]of[[-1.05,1.35,-1.35],[1.05,1.35,-1.35],[-1.2,2.45,-1.4],[1.2,2.45,-1.4],[-.8,3.55,-1.15],[.8,3.55,-1.15],[0,2.3,-1.7],[0,3.35,-1.55]])shell.add(coilSpike(kit,[x,y,z],[x*1.18,y+.35,z-.85],.28,m.white));
  const belly=[];for(let j=0;j<10;j++){const y=.8+j*.25,w=1.28*Math.sin((j+1)/11*Math.PI);belly.push(kit.noodleGeometry([[-w,y,1.02],[-w*.5,y-.1,1.35],[0,y-.14,1.45],[w*.5,y-.1,1.35],[w,y,1.02]],.11,20,6));}body.add(merge(kit,belly,m.white));
  head.position.set(0,3.6,.65);const skull=wound(1.05,1.05,.9,m.spinach,.065,22),snout=wound(1.04,.56,.75,m.saffron,.052,23),jaw=wound(.88,.25,.6,m.white,.043,24);snout.position.set(0,-.27,.75);jaw.position.set(0,-.78,.77);head.add(skull,snout,jaw);
  for(const s of[-1,1]){
    const eye=wound(.31,.42,.19,m.white,.034,30);eye.position.set(s*.48,.3,.79);head.add(eye);const iris=wound(.12,.2,.08,m.tomato,.026,33),pupil=wound(.055,.13,.055,m.ink,.018,34);iris.position.set(s*.48,.29,.97);pupil.position.set(s*.48,.29,1.04);head.add(iris,pupil);
    head.add(kit.strand([[s*.2,.58,.98],[s*.5,.72,.97],[s*.82,.67,.77]],.13,m.tomato,14));head.add(coilSpike(kit,[s*.83,.65,0],[s*1.35,1.45,-.1],.27,m.white));
    const nostril=wound(.14,.08,.07,m.ink,.022,42);nostril.position.set(s*.4,-.14,1.45);head.add(nostril);
    head.add(coilSpike(kit,[s*.72,-.55,1.0],[s*.73,-.85,1.15],.09,m.white));
  }
  const hair=[];for(let i=0;i<14;i++){const x=(i%7-3)*.16,z=-.3-Math.floor(i/7)*.3;hair.push(kit.noodleGeometry([[x,.7,z],[x+.1,1.2,z-.1],[x-.08,1.35,z-.45],[x-.12,1.04,z-.65]],.075,20,5));}head.add(merge(kit,hair,m.tomato));
  const limbs=[];
  for(const s of[-1,1]){
    const arm=new THREE.Group();arm.position.set(s*1.35,2.7,.25);arm.add(kit.bundle([0,0,0],[s*.42,-.8,.35],.3,m.saffron,9,50));const hand=wound(.45,.5,.42,m.saffron,.046,52);hand.position.set(s*.4,-.95,.4);arm.add(hand);for(let j=0;j<3;j++)arm.add(coilSpike(kit,[s*.4+(j-1)*.21,-1.12,.68],[s*.4+(j-1)*.21,-1.43,.85],.08,m.white));
    const cuff=[];for(let j=0;j<=34;j++){const a=j/34*TAU;cuff.push([s*.33+Math.cos(a)*.35,-.62,Math.sin(a)*.35+.27]);}arm.add(kit.strand(cuff,.11,m.ink,40));body.add(arm);limbs.push({mesh:arm,side:s,arm:true});
    const foot=new THREE.Group();foot.position.set(s*.95,.4,.2);const leg=wound(.57,.72,.55,m.saffron,.052,58),toes=wound(.68,.33,.8,m.saffron,.049,60);leg.position.y=.32;toes.position.set(0,-.13,.43);foot.add(leg,toes);for(let j=0;j<3;j++)foot.add(coilSpike(kit,[(j-1)*.35,-.1,.98],[(j-1)*.35,-.15,1.37],.13,m.white));body.add(foot);limbs.push({mesh:foot,side:s,arm:false});
  }
  const chain=Array.from({length:9},(_,i)=>new THREE.Vector3(0,1.3-i*.08,-1.1-i*.31)),previous=chain.map(p=>p.clone()),tailGeo=[];
  for(let n=0;n<8;n++){const points=chain.map((p,i)=>p.clone().add(new THREE.Vector3(Math.sin(n/8*TAU)*(.25*(1-i/10)),Math.cos(n/8*TAU)*(.25*(1-i/10)),0)));tailGeo.push(kit.noodleGeometry(points,.047,24,5));}
  const tail=merge(kit,tailGeo,m.saffron);tailRoot.add(tail);const tailTip=coilSpike(kit,[0,.66,-3.35],[0,.75,-3.9],.16,m.white);tailRoot.add(tailTip);
  const privateMaterials=new Map();root.traverse(o=>{if(o.isMesh){if(!privateMaterials.has(o.material))privateMaterials.set(o.material,o.material.clone());o.material=privateMaterials.get(o.material);}});let previousOpacity=1;
  root.userData.update=(dt,mission,time)=>{
    dt=Math.min(dt,.033);const held=mission.held,walk=['walk','charge'].includes(mission.state),phase=mission.walkPhase,impact=mission.bodySquash;
    body.scale.set(1+impact*.3,1-impact*.5,1+impact*.25);body.rotation.x=held?-.35:Math.sin(time*1.5)*.015;body.rotation.z=held?Math.sin(time*7)*.04:0;
    const breathing=mission.state==='flame'||mission.state==='fire-fan'||mission.state==='fire-rain';head.rotation.x=mission.state==='fire-rain'?-.65:breathing?-.14+Math.sin(time*7)*.05:Math.sin(time*1.8)*.028;jaw.position.y=-.78-(breathing?.25:0);
    for(const l of limbs)l.mesh.rotation.x=held?(l.arm?-.9:.8):walk?Math.sin(phase+l.side*Math.PI/2)*(l.arm?.27:.34):Math.sin(time*2+l.side)*.025;
    chain[0].set(0,1.3,-1.1);for(let i=1;i<chain.length;i++){const old=chain[i].clone();chain[i].addScaledVector(chain[i].clone().sub(previous[i]),.9);chain[i].y-=4.5*dt*dt;chain[i].x+=((held?mission.spinSpeed*.9:Math.sin(time*2)*.6)-chain[i].x*5)*dt*dt;previous[i].copy(old);}
    for(let pass=0;pass<5;pass++)for(let i=1;i<chain.length;i++){const d=chain[i].clone().sub(chain[i-1]),l=d.length()||1e-5;d.multiplyScalar((l-.32)/l);if(i===1)chain[i].sub(d);else{chain[i].addScaledVector(d,-.5);chain[i-1].addScaledVector(d,.5);}chain[i].y=Math.max(.22,chain[i].y);}
    const gs=[];for(let n=0;n<8;n++){const ps=chain.map((p,i)=>p.clone().add(new THREE.Vector3(Math.sin(n/8*TAU+i*.28)*(.25*(1-i/10)),Math.cos(n/8*TAU+i*.28)*(.25*(1-i/10)),0)));gs.push(kit.noodleGeometry(ps,.047,24,5));}const g=kit.mergeGeometry(gs);gs.forEach(q=>q.dispose());for(const key of['position','normal']){tail.geometry.attributes[key].array.set(g.attributes[key].array);tail.geometry.attributes[key].needsUpdate=true;}g.dispose();tail.geometry.computeBoundingSphere();tailTip.position.set(chain[8].x,chain[8].y-.66,chain[8].z+3.35);
    root.visible=!mission.starReady;if(mission.starReady)root.scale.setScalar(.01);else if(mission.state==='melting'){const s=Math.max(.18,1-mission.timer*.68);root.scale.set(s,1-mission.timer*.32,s);}else root.scale.setScalar(1);
    root.userData.tailDeflection=chain[8].x;root.userData.spinLoad=mission.spinFraction;
    if(previousOpacity!==mission.opacity){for(const m of privateMaterials.values()){const transparent=mission.opacity<1;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.opacity=mission.opacity;}previousOpacity=mission.opacity;}
  };
  return root;
}

export async function createBowserArenaWorld(scene,kit,course,renderData,physics,{onProgress=()=>{},...initialCallbacks}={}){
  const terrain=new THREE.Group(),props=new THREE.Group(),guide=new THREE.Group();terrain.name=course.title+' in real pasta surfaces';props.name='Pasta Bowser and arena objects';guide.visible=false;scene.add(terrain,props,guide);
  const files=['spaghetti-surface.png','rigatoni-pasta-surface.png','ink-noodle-surface.png','tagliatelle-surface.png','tricolor-pasta-surface.png'],loaded=await Promise.allSettled(files.map(f=>new THREE.TextureLoader().loadAsync('./assets/'+f))),maps=loaded.map(r=>r.status==='fulfilled'?r.value:null);
  for(const m of maps)if(m){m.wrapS=m.wrapT=THREE.RepeatWrapping;m.colorSpace=THREE.SRGBColorSpace;m.anisotropy=8;}
  for(const[k,m]of Object.entries(kit.materials)){const map=maps[k==='ink'||k==='dark'?2:k==='spinach'?4:k==='toasted'?3:0];if(map){m.map=m.bumpMap=map;m.bumpScale=.014;m.needsUpdate=true;}}
  const materials={},uniforms={pastaFoot:{value:new THREE.Vector3(1e5,1e5,1e5)},pastaImpact:{value:0}};
  function material(id){if(materials[id])return materials[id];const hash=[...id].reduce((v,c)=>v+c.charCodeAt(0),0),index=/lava|fire/.test(id)?4:hash%4,map=maps[index]||maps[0],m=new THREE.MeshPhysicalMaterial({map,bumpMap:map,bumpScale:.04,color:course.id==='bowser_2'?'#d1a77d':index===2?'#bbb293':'#e2c294',roughness:.33,clearcoat:.62,clearcoatRoughness:.22,metalness:0,ior:1.46,sheen:.18,sheenColor:new THREE.Color('#fff0d1'),side:THREE.DoubleSide});m.name='Photographic '+(index===1?'rigatoni':index===2?'squid-ink spaghetti':'durum pasta')+' surface';m.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='uniform vec3 pastaFoot; uniform float pastaImpact;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat d=distance(position.xz,pastaFoot.xz);float h=abs(position.y-pastaFoot.y);transformed.y-=exp(-d*d*1.8)*exp(-h*h*2.0)*(.018+pastaImpact*.035);');};return materials[id]=m;}
  function addMesh(v,f,parent,strands=0,seed=1){const groups=new Map();for(const t of f){if(t[4]==='LAYER_ALPHA'||t[4]==='LAYER_TRANSPARENT')continue;const id=t[3]||'durum';if(!groups.has(id))groups.set(id,[]);groups.get(id).push(t);}for(const[id,triangles]of groups){const mesh=new THREE.Mesh(surfaceGeometry(v,triangles),material(id));mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);}if(strands)parent.add(surfaceStrands(kit,v,f,kit.materials.egg,strands,seed));}
  addMesh(renderData.vertices,renderData.triangles,terrain,course.id==='bowser_2'?600:2100,920);onProgress(20);
  const mission=new BowserArenaMission(physics,course),world={terrain,props,guide,materials,callbacks:{...initialCallbacks},mission,activeCourse:course,area:1,roomId:0,roomName:course.title,areaName:course.title,inside:false,coins:[],enemies:[],friends:[],signs:[],rollingBalls:[],chomp:null,platforms:[],bombs:[],flames:[],waves:[],waterMeshes:[],routePoints:(course.route||[]).map(vec),bossSpawn:vec(course.boss.position),starPosition:vec(course.mission.star.position),carriedDistance:0,sourceFrame:0,damageEvents:0,tiltCycles:0,collapsedWedges:0};mission.world=world;
  Object.defineProperties(world,{starCollectible:{get:()=>mission.starCollectible},starVisible:{get:()=>mission.starReady},mapGoal:{get:()=>mission.starPosition},tilting:{get:()=>world.tiltFrame>=0&&world.tiltFrame<186}});world.getWaterInfo=()=>null;
  world.bowserMesh=createPastaBowser(kit);props.add(world.bowserMesh);
  for(const d of course.dynamic){const mesh=new THREE.Group();mesh.name=d.type==='tilting_arena'?'Whole pasta arena with live tilt collision':'Falling lasagna arena section '+d.index;addMesh(d.renderVertices,d.renderTriangles,mesh,d.type==='tilting_arena'?2300:170,300+d.index);mesh.rotation.order='YXZ';mesh.rotation.y=d.yaw*Math.PI/180;mesh.position.set(...d.position);mesh.updateMatrix();props.add(mesh);world.platforms.push({d,mesh,position:vec(d.position),matrix:mesh.matrix.clone(),oldMatrix:mesh.matrix.clone(),pitch:0,roll:0,state:'stable',age:0,vy:0,riding:false});}
  for(const o of course.objects){if(o.kind==='special_level_geo_03'&&course.id==='bowser_1'){const ball=kit.coilBall(.37,kit.materials.saffron,44);ball.position.set(...o.position);props.add(ball);}}
  for(const d of course.bombs){const mesh=kit.coilBall(.9,kit.materials.ink,888),strands=[];for(let i=0;i<6;i++){const a=i/6*TAU;mesh.add(coilSpike(kit,[Math.sin(a)*.6,.15,Math.cos(a)*.6],[Math.sin(a)*1.12,.15,Math.cos(a)*1.12],.14,kit.materials.white));}mesh.add(kit.strand([[0,.7,0],[.13,1.06,.05],[-.06,1.22,.1]],.06,kit.materials.toasted,15));mesh.name='Spiked pasta bomb';mesh.position.set(...d.position);props.add(mesh);world.bombs.push({...d,position:vec(d.position),mesh,active:true,flash:0});}
  for(const p of world.routePoints){const ring=[];for(let j=0;j<=32;j++){const a=j/32*TAU;ring.push([p.x+Math.sin(a)*.3,p.y+.07,p.z+Math.cos(a)*.3]);}guide.add(kit.strand(ring,.035,kit.materials.saffron,32));}
  const throwGuide=new THREE.Group();throwGuide.name='Optional pasta rings showing the current ballistic throw';guide.add(throwGuide);for(let i=0;i<25;i++){const q=kit.coin(.12);throwGuide.add(q);}throwGuide.visible=false;
  let accumulator=0,collapseFrame=-1;
  function applyPose(a){a.mesh.position.copy(a.position);a.mesh.rotation.set(a.pitch,a.d.yaw*Math.PI/180,a.roll,'YXZ');a.mesh.updateMatrix();a.matrix.copy(a.mesh.matrix);physics._liveFaces(a.d.vertices.map(v=>vec(v).applyMatrix4(a.matrix).toArray()),a.d.triangles,a.d.id);}
  function sourceTick(p){
    world.sourceFrame++;if(world.tilting){const pattern=course.mission.sourceTiltPattern;let i=0;while(i<pattern.length&&world.tiltFrame>=pattern[i][2])i++;const line=pattern[i];if(line){const[flag,speed,end]=line,units=flag>0?(end-world.tiltFrame-1)*speed:(world.tiltFrame-(pattern[i-1]?.[2]||0))*speed,a=world.platforms[0];a.pitch+=Math.cos(world.tiltYaw)*units*UNIT;a.roll-=Math.sin(world.tiltYaw)*units*UNIT;}world.tiltFrame++;if(world.tiltFrame>=186){world.platforms[0].pitch=world.platforms[0].roll=0;}}
    if(collapseFrame>=0)collapseFrame++;
    for(const a of world.platforms){a.oldMatrix.copy(a.matrix);const oldY=a.position.y;let rider=null;if(p?.grounded&&!p.dead){const f=physics.groundAt(p.position.x,p.position.z,p.position.y+.12);if(f?.triangle.dynamic===a.d.id&&Math.abs(f.height-p.position.y)<.25)rider=vec(p.position).applyMatrix4(a.matrix.clone().invert());}
      let bossLocal=null;if(['walk','flame','windup','recover','tilting','dance','intro'].includes(mission.state)){const f=physics.groundAt(mission.position.x,mission.position.z,mission.position.y+.2);if(f?.triangle.dynamic===a.d.id&&Math.abs(f.height-mission.position.y)<.4)bossLocal=vec(mission.position).applyMatrix4(a.matrix.clone().invert());}
      if(a.d.type==='falling_wedge'&&collapseFrame>20*(a.d.index-1)&&a.state==='stable'){a.state='falling';a.age=0;world.collapsedWedges++;}
      if(a.state==='falling'){a.age++;if(a.age<22){a.vy=2.4;a.position.y+=.08;}else{a.vy-=1.2;a.position.y+=a.vy/30;}if(a.age>300){a.state='gone';a.mesh.visible=false;physics.setDynamicEnabled(a.d.id,false);}}
      applyPose(a);if(rider&&a.state!=='gone'){const q=rider.applyMatrix4(a.matrix);world.carriedDistance+=vec(p.position).distanceTo(q);Object.assign(p.position,{x:q.x,y:q.y,z:q.z});a.riding=true;}if(bossLocal){const q=bossLocal.applyMatrix4(a.matrix);mission.position={x:q.x,y:q.y,z:q.z};}
    }
  }
  world.beginTilt=position=>{world.tiltFrame=0;world.tiltYaw=Math.atan2(position.x,position.z);world.tiltCycles++;};
  world.beginCollapse=()=>{if(collapseFrame<0){collapseFrame=0;world.callbacks.message?.('The outer pasta sections are falling. Stay on the central star and finish the fight.',5);}};
  world.beginBossJump=position=>{if(course.id!=='bowser_3')return;const f=physics.groundAt(position.x,position.z,position.y+.2),a=world.platforms.find(q=>q.d.id===f?.triangle.dynamic);if(a&&a.state==='stable'){a.state='falling';a.age=0;world.collapsedWedges++;}};
  world.damagePlayer=(p,from,amount)=>{if(!p||p.dead||p.invincible>0||mission.held)return false;const before=p.health;if(world.callbacks.damage)world.callbacks.damage(from,amount);else p.knockback(p.position.x-from.x,p.position.z-from.z,amount);if(p.health<before)world.damageEvents++;return p.health<before;};
  world.explodeBomb=b=>{b.mesh.visible=false;b.flash=1;world.callbacks.burst?.(b.position,48,kit.materials.tomato);};
  const flameGeometry=kit.winding(.34,.55,.34,.045,881,14);
  world.spawnFlame=(position,yaw,{speed=7.8,vertical=-1.3,gravity=0,life=4.5}={})=>{const mesh=new THREE.Mesh(flameGeometry,kit.materials.tomato);mesh.castShadow=true;mesh.position.copy(vec(position));props.add(mesh);world.flames.push({mesh,position:vec(position),velocity:new THREE.Vector3(Math.sin(yaw)*speed,vertical,Math.cos(yaw)*speed),gravity,life,grounded:false,age:0});};
  const ringPoints=[];for(let j=0;j<=90;j++){const a=j/90*TAU;ringPoints.push([Math.sin(a)*12,0,Math.cos(a)*12]);}const waveGeometry=kit.noodleGeometry(ringPoints,.065,110,5);
  world.landingImpact=(position,shockwave=false)=>{uniforms.pastaImpact.value=1;world.callbacks.burst?.(position,22,kit.materials.egg);if(shockwave){const mesh=new THREE.Mesh(waveGeometry,kit.materials.saffron);mesh.position.copy(vec(position));mesh.position.y+=.14;props.add(mesh);world.waves.push({position:vec(position),mesh,radius:.6,age:0,hit:false});}};
  world.action=p=>mission.action(p);world.onGroundPound=p=>mission.onGroundPound(p);world.onRewardCollected=()=>mission.collectReward();
  world.update=(time,dt,p)=>{
    dt=Math.min(.1,dt);if(p){world.platforms.forEach(a=>a.riding=false);accumulator+=dt;while(accumulator>=1/30-1e-8){sourceTick(p);accumulator-=1/30;}uniforms.pastaFoot.value.set(p.position.x,p.position.y,p.position.z);}
    uniforms.pastaImpact.value*=Math.exp(-5*dt);
    for(let i=world.flames.length-1;i>=0;i--){const f=world.flames[i];f.age+=dt;if(!f.grounded){f.velocity.y-=f.gravity*dt;f.position.addScaledVector(f.velocity,dt);}const floor=physics.groundAt(f.position.x,f.position.z,f.position.y+2);if(floor&&f.position.y<floor.height+.35){f.position.y=floor.height+.35;if(f.gravity){f.velocity.set(0,0,0);f.grounded=true;}}f.mesh.position.copy(f.position);f.mesh.rotation.y=time*4;f.mesh.scale.setScalar(1+Math.min(1,f.age)*.55);if(p&&!p.dead&&Math.hypot(p.position.x-f.position.x,p.position.z-f.position.z)<.75+p.radius&&p.position.y+p.height>f.position.y-.4&&p.position.y<f.position.y+1)world.damagePlayer(p,f.position,3);if(f.age>f.life){props.remove(f.mesh);world.flames.splice(i,1);}}
    for(let i=world.waves.length-1;i>=0;i--){const w=world.waves[i];w.age+=dt;w.radius+=18*dt;w.mesh.scale.set(w.radius/12,1,w.radius/12);if(p&&!w.hit&&!p.dead&&Math.abs(Math.hypot(p.position.x-w.position.x,p.position.z-w.position.z)-w.radius)<.65&&p.position.y<w.position.y+.8){w.hit=world.damagePlayer(p,w.position,2);}if(w.radius>65){props.remove(w.mesh);world.waves.splice(i,1);}}
    for(const b of world.bombs){b.mesh.rotation.y=time*.12;if(p&&b.active&&!p.dead&&Math.hypot(p.position.x-b.position.x,p.position.z-b.position.z)<1.1&&Math.abs(p.position.y+1-b.position.y)<1.6){b.active=false;world.explodeBomb(b);world.damagePlayer(p,b.position,3);}}
    if(p&&!p.dead&&p.grounded&&p.surface==='SURFACE_BURNING'&&p.invincible<=0){p.health=Math.max(0,p.health-3);p.velocity.y=25.2;p.grounded=false;p.pounding=p.diving=p.longJumpCoasting=false;p.invincible=1.8;p.squashVelocity-=4;p.dead=p.health===0;world.damageEvents++;world.callbacks.lavaBounce?.();}
    world.bowserMesh.position.set(mission.position.x,mission.position.y,mission.position.z);world.bowserMesh.rotation.y=mission.yaw;if(world.visualsEnabled!==false)world.bowserMesh.userData.update(dt,mission,time);
    throwGuide.visible=mission.held&&!!p;if(guide.visible&&throwGuide.visible){const launch=mission.getThrowPreview(p);for(let i=0;i<throwGuide.children.length;i++){const t=(i+1)*.035,q=throwGuide.children[i];q.position.set(launch.position.x+launch.velocity.x*t,launch.position.y+launch.velocity.y*t-18*t*t,launch.position.z+launch.velocity.z*t);q.rotation.y=time*2;const floor=physics.groundAt(q.position.x,q.position.z,launch.position.y+.2);q.visible=q.position.y>(floor?.height??course.deathY);}}
  };
  world.reset=()=>{mission.reset();world.tiltFrame=-1;world.tiltYaw=0;world.carriedDistance=world.damageEvents=world.tiltCycles=world.collapsedWedges=world.sourceFrame=0;accumulator=0;collapseFrame=-1;for(const a of world.platforms){a.position.set(...a.d.position);a.pitch=a.roll=0;a.state='stable';a.age=a.vy=0;a.riding=false;a.mesh.visible=true;physics.setDynamicEnabled(a.d.id,true);applyPose(a);a.oldMatrix.copy(a.matrix);}for(const b of world.bombs){b.active=true;b.mesh.visible=true;b.flash=0;}for(const f of[...world.flames,...world.waves])props.remove(f.mesh);world.flames.length=world.waves.length=0;world.bowserMesh.visible=true;world.bowserMesh.scale.setScalar(1);uniforms.pastaImpact.value=0;};
  world.reset();onProgress(100);return world;
}
