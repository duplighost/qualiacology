import * as THREE from './vendor/three.module.js';

const TAU=Math.PI*2;
const rand=(seed=9274)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
const v=a=>new THREE.Vector3(...a);
const palette={generic_09005800:['spinach','#879250'],generic_09009800:['egg','#dfb36d'],generic_09009000:['toasted','#b4824e'],generic_09006000:['egg','#dcba7b'],generic_09001800:['spinach','#788b49'],generic_09002000:['egg','#c6ae7b'],generic_09003000:['toasted','#b99159'],generic_09003800:['white','#e4d5ac'],generic_09004800:['white','#f0dca8'],generic_09005000:['toasted','#c4a168'],generic_0900A000:['egg','#e0bb73'],bob_seg7_texture_07001000:['spinach','#b6ad63'],bob_seg7_texture_07001800:['spinach','#8f984e']};
const transparentIDs=new Set(['generic_09008800','bob_seg7_texture_07000000']);

function makeNoodleTexture(bump=false) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=768;
  const c=canvas.getContext('2d'),r=rand(98),S=768;
  c.fillStyle=bump?'#383838':'#8c7048';c.fillRect(0,0,S,S);c.lineCap='round';c.lineJoin='round';
  for(let i=0;i<180;i++) {
    const x=r()*S,y=r()*S,a=r()*TAU,len=150+r()*380,w=13+r()*9,bend=(r()-.5)*160;
    const dx=Math.cos(a),dy=Math.sin(a),nx=-dy,ny=dx;
    for(const ox of [-S,0,S])for(const oy of [-S,0,S]){
      const path=()=>{c.beginPath();c.moveTo(x+ox,y+oy);c.bezierCurveTo(x+dx*len*.3+nx*bend+ox,y+dy*len*.3+ny*bend+oy,x+dx*len*.7-nx*bend+ox,y+dy*len*.7-ny*bend+oy,x+dx*len+ox,y+dy*len+oy);};
      if(!bump){path();c.strokeStyle='rgba(47,30,12,.45)';c.lineWidth=w+6;c.stroke();}
      path();c.strokeStyle=bump?'#888':'#bda070';c.lineWidth=w;c.stroke();
      path();c.strokeStyle=bump?'#c5c5c5':'#e5d4aa';c.lineWidth=w*.73;c.stroke();
      path();c.strokeStyle=bump?'#f0f0f0':'rgba(255,245,210,.72)';c.lineWidth=w*.19;c.stroke();
    }
  }
  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=8;
  if(!bump)tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}

function makeLatticeTexture() {
  const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');
  c.clearRect(0,0,128,128);c.lineCap='round';c.strokeStyle='#d7b780';c.lineWidth=10;
  for(const x of [4,64,124]){c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+3,42,x-3,86,x,128);c.stroke();}
  for(const y of [18,110]){c.beginPath();c.moveTo(0,y);c.lineTo(128,y);c.stroke();}
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;
}

function geometryFromFaces(vertices,faces) {
  const ps=[],uv=[],norm=[];
  for(const f of faces){const a=v(vertices[f[0]]),b=v(vertices[f[1]]),c=v(vertices[f[2]]),n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const axis=Math.abs(n.y)>.55?'y':Math.abs(n.x)>Math.abs(n.z)?'x':'z';
    for(const p of [a,b,c]){ps.push(p.x,p.y,p.z);norm.push(n.x,n.y,n.z);uv.push((axis==='x'?p.z:p.x)/4.25,(axis==='y'?p.z:p.y)/4.25);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeBoundingSphere();return g;
}

export async function createWorld(scene,kit,course,renderData,physics,{onProgress=()=>{}}={}) {
  const terrain=new THREE.Group(),props=new THREE.Group(),staticProps=new THREE.Group(),guide=new THREE.Group();
  terrain.name='Exact Bob-omb Battlefield geometry, remade in pasta';props.name='Pasta course objects';guide.name='Optional pasta trail';guide.visible=false;
  scene.add(terrain,props,guide);props.add(staticProps);
  const random=rand(64),materials={},bumpMap=makeNoodleTexture(true),lattice=makeLatticeTexture();
  let noodleMap;
  try {noodleMap=await new THREE.TextureLoader().loadAsync('./assets/spaghetti-surface.png');noodleMap.wrapS=noodleMap.wrapT=THREE.RepeatWrapping;noodleMap.colorSpace=THREE.SRGBColorSpace;noodleMap.anisotropy=8;}
  catch {noodleMap=makeNoodleTexture();}
  const uniforms={noodleHero:{value:new THREE.Vector3(1e5,1e5,1e5)},noodleTime:{value:0},noodleCompression:{value:.042}};
  const deform=mat=>{mat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='uniform vec3 noodleHero;\nuniform float noodleTime;\nuniform float noodleCompression;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat noodleD=distance(position.xz,noodleHero.xz);\nfloat noodleH=abs(position.y-noodleHero.y);\ntransformed.y-=exp(-noodleD*noodleD*1.4)*exp(-noodleH*noodleH)*noodleCompression;');};};
  const grouped=new Map();
  for(const f of renderData.triangles){if(f[3]==='generic_0900B000')continue;if(!grouped.has(f[3]))grouped.set(f[3],[]);grouped.get(f[3]).push(f);}
  for(const [id,faces] of grouped){
    const color=palette[id]?.[1]||'#ddbd86',isLattice=transparentIDs.has(id);
    const mat=new THREE.MeshPhysicalMaterial({color,metalness:0,roughness:.36,clearcoat:.45,clearcoatRoughness:.24,ior:1.46,map:isLattice?lattice:noodleMap,bumpMap:isLattice?null:bumpMap,bumpScale:.06,side:THREE.DoubleSide,alphaTest:isLattice?.5:0});
    mat.name=isLattice?'Woven spaghetti fence':`${palette[id]?.[0]||'egg'} spaghetti terrain`;materials[id]=mat;deform(mat);
    const mesh=new THREE.Mesh(geometryFromFaces(renderData.vertices,faces),mat);mesh.receiveShadow=true;mesh.castShadow=true;terrain.add(mesh);
  }
  onProgress(25);
  // Real round strands complement the close photographic surface, including
  // irregular overhangs and the loose ends along the path.
  const strandBuckets=new Map();
  function addStrand(points,radius,type='egg',segments=7){if(!strandBuckets.has(type))strandBuckets.set(type,[]);strandBuckets.get(type).push(kit.noodleGeometry(points,radius,segments,5));}
  let surfaceArea=0;const topFaces=[];
  for(const f of renderData.triangles){if(transparentIDs.has(f[3])||f[3]==='generic_0900B000')continue;
    const a=v(renderData.vertices[f[0]]),b=v(renderData.vertices[f[1]]),c=v(renderData.vertices[f[2]]),n=b.clone().sub(a).cross(c.clone().sub(a)),area=n.length()*.5;n.normalize();
    if(n.y<.45||area<.1)continue;surfaceArea+=area;topFaces.push({a,b,c,n,area,type:palette[f[3]]?.[0]||'egg'});
  }
  for(const f of topFaces){const count=Math.max(1,Math.round(f.area/surfaceArea*3200));
    for(let j=0;j<count;j++){
      let u=random(),w=random();if(u+w>1){u=1-u;w=1-w;}
      const center=f.a.clone().addScaledVector(f.b.clone().sub(f.a),u).addScaledVector(f.c.clone().sub(f.a),w);
      const angle=random()*TAU,l=.8+random()*1.8,radius=.025+random()*.023,ps=[];
      const dx=Math.cos(angle),dz=Math.sin(angle);
      for(let k=0;k<7;k++){const t=(k/6-.5)*l,bend=Math.sin(k/6*TAU+u*5)*.13,x=center.x+dx*t-dz*bend,z=center.z+dz*t+dx*bend;
        const y=center.y-(f.n.x*(x-center.x)+f.n.z*(z-center.z))/f.n.y+radius*.9+Math.sin(k/6*Math.PI)*.04;ps.push([x,y,z]);}
      addStrand(ps,radius,f.type,6);
    }
  }
  // Dense strands around the arrival point and summit reward the closer camera.
  for(const [cx,cy,cz,count,radius] of [[-65.58,0,64.64,460,8],[20,42.93,-45,220,10]])for(let j=0;j<count;j++){
    const a=random()*TAU,d=Math.sqrt(random())*radius,x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;
    const floor=physics.groundAt(x,z,cy+2);if(!floor||Math.abs(floor.height-cy)>2)continue;
    const dir=random()*TAU,l=.7+random()*1.1,ps=[];
    for(let k=0;k<8;k++){const t=(k/7-.5)*l,px=x+Math.cos(dir)*t+Math.sin(k*.8)*.1,pz=z+Math.sin(dir)*t;
      const f=physics.groundAt(px,pz,floor.height+.5);ps.push([px,(f?.height??floor.height)+.035+Math.sin(k/7*Math.PI)*.05,pz]);}
    addStrand(ps,.032,j%6===0?'egg':cy>30?'toasted':'spinach',7);
  }
  for(const [type,gs]of strandBuckets){const m=kit.materials[type].clone();deform(m);const mesh=new THREE.Mesh(kit.mergeGeometry(gs),m);mesh.receiveShadow=true;mesh.castShadow=true;terrain.add(mesh);for(const g of gs)g.dispose();}

  const coins=[],enemies=[],friends=[],signs=[],rollingBalls=[];
  const grounded=(a,extra=0)=>{const p=v(a),f=physics.groundAt(p.x,p.z,p.y+1);p.y=(f?.height??p.y)+extra;return p;};
  const addStatic=(mesh,p,yaw=0)=>{mesh.position.copy(p);mesh.rotation.y=yaw*Math.PI/180;staticProps.add(mesh);return mesh;};
  const addCoin=(p,red=false,ground=false)=>{const mesh=kit.coin(.32,red),position=ground?grounded(p,.65):v(p).add(new THREE.Vector3(0,.55,0));mesh.position.copy(position);props.add(mesh);coins.push({mesh,position,value:red?2:1,collected:false,red,phase:random()*TAU});};
  const addEnemy=(kind,p,yaw=0)=>{const mesh=kind==='goomba'?makeGoomba(kit):kit.bomb(),home=grounded(p);mesh.position.copy(home);mesh.rotation.y=yaw*Math.PI/180;props.add(mesh);enemies.push({mesh,kind,home,position:mesh.position,phase:random()*TAU,alive:true});};
  const signText={DIALOG_015:'Move with WASD or the stick. Space jumps. Keep your momentum through the pasta.',DIALOG_095:'Three jumps in a row build height. Hold Shift to run. C or Ctrl crouches; crouch and jump for a long jump.',DIALOG_008:'The Chain Chomp lunges toward you. Leave room for his spaghetti chain.',DIALOG_074:'The mountain path has a gap. Jump from the edge and keep moving forward.',DIALOG_112:'The King is waiting at the summit. Get behind him, grab, and throw him onto the platform.',DIALOG_035:'Cross the noodle bridge, pass the Chomp, and follow the winding path to the summit.'};
  for(const o of course.objects){const p=o.position,k=o.kind;
    if(k==='special_bubble_tree')addStatic(kit.tree(4.8,Math.floor(random()*100)),grounded(p));
    else if(k==='bhvBobombBuddy'){const mesh=kit.bomb({friendly:true}),position=grounded(p);mesh.position.copy(position);props.add(mesh);friends.push({mesh,position});}
    else if(k==='macro_bobomb'||k==='macro_bobomb_stationary')addEnemy('bobomb',p,o.yaw);
    else if(k==='macro_goomba')addEnemy('goomba',p,o.yaw);
    else if(k==='macro_goomba_triplet_spawner')for(let j=0;j<3;j++){const a=j/3*TAU;addEnemy('goomba',[p[0]+Math.cos(a)*2,p[1],p[2]+Math.sin(a)*2],j*120);}
    else if(k==='macro_yellow_coin_1')addCoin(p,false,false);
    else if(k==='macro_red_coin')addCoin(p,true,false);
    else if(k==='macro_coin_line_horizontal')for(let j=0;j<5;j++){const a=(o.yaw||0)*Math.PI/180,t=(j-2)*1.6;addCoin([p[0]+Math.sin(a)*t,p[1],p[2]+Math.cos(a)*t],false,true);}
    else if(k==='macro_coin_ring_horizontal')for(let j=0;j<8;j++){const a=j/8*TAU;addCoin([p[0]+Math.sin(a)*3,p[1],p[2]+Math.cos(a)*3]);}
    else if(k==='macro_coin_ring_vertical_flying')for(let j=0;j<8;j++){const a=j/8*TAU,yaw=(o.yaw||0)*Math.PI/180;addCoin([p[0]+Math.cos(yaw)*Math.cos(a)*3,p[1]+Math.sin(a)*3,p[2]-Math.sin(yaw)*Math.cos(a)*3]);}
    else if(k==='macro_cannon_closed'){const c=kit.coilBall(.85,kit.materials.toasted);c.scale.y=.22;addStatic(c,grounded(p,.1));}
    else if(k.includes('water_bomb_cannon')||k==='bhvWaterBombCannon')addStatic(kit.cannon(),grounded(p),o.yaw);
    else if(k==='macro_wooden_post_1')addStatic(kit.pole(1.1,.19),grounded(p));
    else if(k==='macro_wooden_signpost'){const position=grounded(p),mesh=makeSign(kit);addStatic(mesh,position,o.yaw);signs.push({position,text:signText[o.params]||'Climb the winding mountain path. At the summit, get behind the King and throw him three times.'});}
    else if(k.includes('breakable_box'))addStatic(makePastaBox(kit),grounded(p));
  }
  onProgress(75);
  let seesaw=null,grate=null;
  for(const d of course.dynamic){
    if(d.kind==='seesaw'){
      seesaw=new THREE.Group();seesaw.position.fromArray(d.position);seesaw.rotation.y=d.yaw*Math.PI/180;
      const mesh=new THREE.Mesh(geometryFromFaces(d.vertices,d.triangles),materials.generic_09006000);mesh.castShadow=mesh.receiveShadow=true;seesaw.add(mesh);
      const gs=[];for(let x=-1.7;x<1.8;x+=.11){const ps=[];for(let j=0;j<15;j++)ps.push([x+Math.sin(j*1.4+x)*.018,.55,-9+j/14*18]);gs.push(kit.noodleGeometry(ps,.046,28,5));}
      const pasta=new THREE.Mesh(kit.mergeGeometry(gs),kit.materials.egg);pasta.castShadow=pasta.receiveShadow=true;seesaw.add(pasta);props.add(seesaw);
    } else {const width=d.kind==='chomp_gate'?10.23:3.2,height=6.4,mesh=kit.gate(width,height);if(d.kind==='grate_door')mesh.position.x=width/2;const wrap=new THREE.Group();wrap.add(mesh);wrap.position.fromArray(d.position);wrap.rotation.y=d.yaw*Math.PI/180;wrap.name=d.kind;props.add(wrap);if(d.kind==='grate_door')grate=wrap;}
  }
  const anchor=grounded([2.6,7.68,19.2]),chompMesh=kit.chomp(1.5);chompMesh.position.copy(anchor).add(new THREE.Vector3(0,0,3.8));props.add(chompMesh);
  const chain=new THREE.Group();chain.name='Linked squid-ink pasta chain';props.add(chain);
  for(let i=0;i<8;i++){const link=kit.coin(.2);link.traverse(m=>{if(m.isMesh)m.material=kit.materials.ink;});chain.add(link);}
  addStatic(kit.pole(1.5,.22),anchor);
  const chomp={mesh:chompMesh,anchor,position:chompMesh.position,chain};
  for(let pathIndex=0;pathIndex<2;pathIndex++){
    const raw=course.trajectories[`bob_seg7_metal_ball_path${pathIndex}`]||[];
    const path=raw.map(a=>{const p=v(a);const g=physics.groundAt(p.x,p.z,p.y+1);p.y=g?.height??p.y;return p;});
    for(let j=0;j<2;j++){const mesh=kit.coilBall(.8,kit.materials.ink,71+pathIndex);mesh.position.copy(path[Math.min(j*4,path.length-1)]||new THREE.Vector3());mesh.position.y+=.8;props.add(mesh);rollingBalls.push({mesh,path,distance:j*22,active:true,speed:9+pathIndex*2,radius:.8,position:mesh.position});}
  }
  const bossSpawn=grounded(course.boss.position),starPosition=v(course.star?.position||[20,45,-45]),routePoints=(course.route||[]).map(v);
  const guideGeoms=[];
  for(let i=1;i<routePoints.length;i++){
    const a=routePoints[i-1],b=routePoints[i],distance=a.distanceTo(b),count=Math.ceil(distance/2.5);
    for(let j=0;j<count;j++){const p=a.clone().lerp(b,j/count);p.y+=.09;const points=[];for(let k=0;k<8;k++){const t=k/7*TAU;points.push([p.x+Math.cos(t)*.11,p.y+.02,p.z+Math.sin(t)*.11]);}guideGeoms.push(kit.noodleGeometry(points,.034,9,5));}
  }
  if(guideGeoms.length)guide.add(new THREE.Mesh(kit.mergeGeometry(guideGeoms),kit.materials.tomato));
  // Trees, signs, boxes and closed cannons share a few material batches.
  mergeStaticObjects(staticProps,kit);
  function update(time,dt,player){
    uniforms.noodleTime.value=time;if(player?.position){uniforms.noodleHero.value.copy(player.position);uniforms.noodleCompression.value=.02+.04*(player.cookingSoftness??.55);}
    if(grate)grate.visible=physics.dynamicEnabled.get('grate_door')!==false;
    for(const coin of coins)if(!coin.collected){coin.mesh.rotation.y=time*1.25+coin.phase;coin.mesh.position.y=coin.position.y+Math.sin(time*2.6+coin.phase)*.075;}
    for(const f of friends)f.mesh.userData.update?.(dt,{time});
    const start=anchor.clone().add(new THREE.Vector3(0,.9,0)),end=chompMesh.position.clone().add(new THREE.Vector3(0,1.3,0));
    for(let i=0;i<chain.children.length;i++){const t=(i+1)/(chain.children.length+1),m=chain.children[i];m.position.copy(start).lerp(end,t);m.position.y-=Math.sin(t*Math.PI)*.38;m.rotation.set(i%2*Math.PI/2,0,Math.atan2(end.x-start.x,end.z-start.z));}
    if(seesaw&&player?.position){const distance=seesaw.position.distanceTo(player.position);seesaw.rotation.z+=(Math.max(-.025,Math.min(.025,(player.position.x-seesaw.position.x)*.002))*(distance<10?1:0)-seesaw.rotation.z)*Math.min(1,dt*2);}
  }
  onProgress(100);
  return {terrain,props,coins,enemies,friends,chomp,rollingBalls,bossSpawn,starPosition,signs,routePoints,guide,update,materials,grate};
}

function makeGoomba(kit){
  const g=new THREE.Group(),body=kit.coilBall(.58,kit.materials.toasted,51);body.position.y=.72;body.scale.set(1.05,.85,.8);g.add(body);
  for(const side of [-1,1]){const foot=kit.coilBall(.22,kit.materials.ink,5);foot.scale.set(1,.5,1.45);foot.position.set(side*.3,.14,.15);g.add(foot);const eye=kit.coin(.115);eye.traverse(m=>{if(m.isMesh)m.material=kit.materials.white;});eye.position.set(side*.22,.83,.43);g.add(eye);const pupil=kit.strand([[side*.21,.84,.46],[side*.21,.76,.47]],.028,kit.materials.ink);g.add(pupil);}
  return g;
}
function makeSign(kit){
  const g=kit.pole(1.6,.075),gs=[];for(let j=0;j<9;j++)gs.push(kit.noodleGeometry([[-.55,1.05+j*.07,0],[0,1.04+j*.07,.025],[.55,1.05+j*.07,0]],.045,8,5));
  const board=new THREE.Mesh(kit.mergeGeometry(gs),kit.materials.egg);board.castShadow=true;g.add(board);
  g.add(kit.strand([[-.32,1.35,.06],[.3,1.35,.06],[.08,1.55,.06],[.3,1.35,.06],[.08,1.15,.06]],.035,kit.materials.tomato,15));return g;
}
function makePastaBox(kit){
  const g=new THREE.Group(),gs=[];for(let side=0;side<4;side++)for(let j=0;j<12;j++){
    const a=side*Math.PI/2,ps=[];for(let k=0;k<6;k++){const t=-.48+k/5*.96;ps.push([Math.cos(a)*t+Math.sin(a)*.48,.06+j*.08,-Math.sin(a)*t+Math.cos(a)*.48]);}gs.push(kit.noodleGeometry(ps,.048,5,5));}
  for(let j=0;j<12;j++)gs.push(kit.noodleGeometry([[-.48,.96,-.48+j*.08],[0,.98,-.48+j*.08],[.48,.96,-.48+j*.08]],.047,5,5));
  const m=new THREE.Mesh(kit.mergeGeometry(gs),kit.materials.toasted);m.castShadow=m.receiveShadow=true;g.add(m);return g;
}
function mergeStaticObjects(group,kit){
  group.updateMatrixWorld(true);const byMat=new Map();group.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld),id=o.material.uuid;if(!byMat.has(id))byMat.set(id,{material:o.material,geometries:[]});byMat.get(id).geometries.push(g);});
  group.clear();for(const{material,geometries}of byMat.values()){const mesh=new THREE.Mesh(kit.mergeGeometry(geometries),material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);for(const g of geometries)g.dispose();}
}
