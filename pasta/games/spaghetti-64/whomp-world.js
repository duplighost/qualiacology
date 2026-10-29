import * as THREE from './vendor/three.module.js';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const v=p=>new THREE.Vector3(...p),rand=(seed=74)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const colorNames={grass_09000000:'ink',grass_09000800:'toasted',grass_09001000:'egg',grass_09002000:'saffron',grass_09002800:'spinach',grass_09004000:'egg',grass_09004800:'toasted',grass_09005000:'spinach',grass_09005800:'spinach',grass_09006800:'toasted',grass_09007800:'white',grass_09008000:'egg',grass_09008800:'white',grass_09009800:'toasted',grass_0900A000:'egg',wf_seg7_texture_07000000:'egg',wf_seg7_texture_07000800:'tomato',wf_seg7_texture_07001000:'egg',checkerboard_pasta:'egg'};

function geometry(vertices,faces){
  const p=[],n=[],uv=[];
  for(const f of faces){const a=v(vertices[f[0]]),b=v(vertices[f[1]]),c=v(vertices[f[2]]),normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),axis=Math.abs(normal.y)>.55?'y':Math.abs(normal.x)>Math.abs(normal.z)?'x':'z';
    for(const q of [a,b,c]){p.push(q.x,q.y,q.z);n.push(normal.x,normal.y,normal.z);uv.push((axis==='x'?q.z:q.x)/3.7,(axis==='y'?q.z:q.y)/3.7);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeBoundingSphere();return g;
}
function pastaMesh(kit,gs,material){const mesh=new THREE.Mesh(kit.mergeGeometry(gs),material);mesh.castShadow=mesh.receiveShadow=true;return mesh;}

function createThwompModel(kit){
  const root=new THREE.Group(),gs=[],spikes=[];root.name='Rigatoni Thwomp';
  for(let i=0;i<57;i++){const y=.045+i/56*4.53;gs.push(kit.noodleGeometry([[-2.14,y,-2.14],[2.14,y,-2.14],[2.14,y,2.14],[-2.14,y,2.14],[-2.14,y,-2.14]],.047,36,5));}
  for(let i=0;i<47;i++){const x=-2.1+i/46*4.2;gs.push(kit.noodleGeometry([[x,4.58,-2.14],[x+.018,4.6,0],[x,4.58,2.14]],.047,10,5));}
  for(const s of [-1,1])for(let j=0;j<7;j++){const y=.4+j*.6;spikes.push(kit.noodleGeometry([[s*2.16,y-.18,1.95],[s*2.48,y,1.96],[s*2.16,y+.18,1.95]],.08,8,5));}
  root.add(pastaMesh(kit,gs,kit.materials.blue),pastaMesh(kit,spikes,kit.materials.white));
  const face=[];for(const s of [-1,1]){const eye=kit.coilBall(.38,kit.materials.white);eye.scale.set(1,1.2,.3);eye.position.set(s*.85,3.05,2.19);root.add(eye);face.push(kit.noodleGeometry([[s*.85,3.23,2.33],[s*.85,2.94,2.34]],.095,6,5));face.push(kit.noodleGeometry([[s*1.38,3.7,2.23],[s*.85,3.48,2.25],[s*.38,3.38,2.23]],.11,10,5));}
  for(let j=0;j<4;j++)face.push(kit.noodleGeometry([[-.85,1.2+j*.14,2.22],[0,1.08+j*.14,2.26],[.85,1.2+j*.14,2.22]],.078,10,5));root.add(pastaMesh(kit,face,kit.materials.ink));
  root.userData.height=4.62;root.userData.radius=2.2;root.userData.update=()=>{};return root;
}

// Rectangular layers of noodles make the slab, including its sides and back.
export function createWhompModel(kit,{boss=true,thwomp=false}={}){
  if(thwomp)return createThwompModel(kit);
  const root=new THREE.Group(),pivot=new THREE.Group(),rig=new THREE.Group();root.add(pivot);pivot.add(rig);rig.position.set(0,-.15,-.5);root.name=boss?'Spaghetti Whomp King':thwomp?'Rigatoni Thwomp':'Pasta Whomp';
  const gs=[],side=[],back=[],H=3.9,W=3.05,D=.96;
  for(let j=0;j<50;j++){const y=.65+j/49*H,ps=[];for(let k=0;k<8;k++){const x=-W/2+k/7*W;ps.push([x,y+Math.sin(k*1.7+j)*.016,D/2+.02*Math.sin(k+j)]);}gs.push(kit.noodleGeometry(ps,.044,10,5));
    back.push(kit.noodleGeometry(ps.map(p=>[p[0],p[1],-D/2]),.044,9,5));}
  for(let j=0;j<15;j++){const z=-D/2+j/14*D;for(const x of [-W/2,W/2])side.push(kit.noodleGeometry([[x,.65,z],[x+.02,2.55,z],[x,4.55,z]],.046,8,5));side.push(kit.noodleGeometry([[-W/2,4.55,z],[0,4.57,z],[W/2,4.55,z]],.046,8,5));}
  const mat=thwomp?kit.materials.blue:kit.materials.egg;rig.add(pastaMesh(kit,gs,mat),pastaMesh(kit,back,kit.materials.toasted),pastaMesh(kit,side,mat));
  const face=[];for(const x of [-.68,.68]){
    const eye=kit.coilBall(.29,kit.materials.white);eye.scale.set(.92,1.15,.35);eye.position.set(x,3.18,.56);rig.add(eye);
    face.push(kit.noodleGeometry([[x-.035,3.34,.68],[x+.02,3.09,.7]],.072,6,5));
    face.push(kit.noodleGeometry([[x-.38,3.63,.58],[x,3.55,.63],[x+.33,3.39,.59]],.09,8,5));
  }
  const mouth=[];for(let j=0;j<5;j++){const y=1.35+j*.105;mouth.push(kit.noodleGeometry([[-.75,y,.56],[0,y-.08,.59],[.75,y,.56]],.058,10,5));}
  rig.add(pastaMesh(kit,[...face,...mouth],kit.materials.ink));
  const teeth=[];for(let i=0;i<6;i++){const x=-.62+i*.245;teeth.push(kit.noodleGeometry([[x,1.83,.64],[x+.035,1.62,.66]],.078,5,5));}rig.add(pastaMesh(kit,teeth,kit.materials.white));
  // Back cracks are toasted noodles, with a clear target made from a spiral.
  const crack=[];for(const s of [-1,1])crack.push(kit.noodleGeometry([[s*.18,3.9,-.55],[s*.42,3.3,-.56],[s*.22,2.9,-.56],[s*.62,2.3,-.56],[s*.4,1.3,-.55]],.042,15,5));
  if(boss){const spiral=[];for(let i=0;i<65;i++){const t=i/64*TAU*2.5,r=.5*(1-i/70);spiral.push([Math.cos(t)*r,2.65+Math.sin(t)*r,-.57]);}crack.push(kit.noodleGeometry(spiral,.046,70,5));}rig.add(pastaMesh(kit,crack,kit.materials.toasted));
  const arms=[],feet=[];
  for(const s of [-1,1]){const arm=new THREE.Group();arm.position.set(s*1.6,2.6,0);arm.add(kit.bundle([0,0,0],[s*.65,-.2,.03],.2,mat,10,3));const hand=kit.coilBall(.3,mat);hand.position.set(s*.72,-.24,.04);arm.add(hand);rig.add(arm);arms.push(arm);
    const foot=kit.coilBall(.37,kit.materials.toasted);foot.scale.set(1,.65,1.35);foot.position.set(s*.9,.27,.1);rig.add(foot);feet.push(foot);}
  if(thwomp){const spikes=[];for(const s of [-1,1])for(let j=0;j<7;j++){const y=.8+j*.55;spikes.push(kit.noodleGeometry([[s*1.51,y-.15,0],[s*1.85,y,.04],[s*1.51,y+.15,.1]],.075,8,5));}rig.add(pastaMesh(kit,spikes,kit.materials.white));}
  const size=boss?2:thwomp?.48:1;root.scale.setScalar(size);
  root.userData.height=4.4*size;root.userData.radius=1.6*size;root.userData.rig=pivot;
  root.userData.update=(dt,state={})=>{const f=clamp(state.fall||0,0,1),t=state.time||0;pivot.rotation.x=f*Math.PI/2;rig.scale.set(1+(state.hitTimer>0?.045*Math.sin(t*24):0),1,1);arms.forEach((a,i)=>{a.rotation.z=(i?1:-1)*(.08+f*.5+Math.sin(t*2)*.035);a.rotation.x=-f*.45;});feet.forEach((foot,i)=>foot.position.y=.27+(!f&&state.state==='chasing'?Math.max(0,Math.sin(t*4+i*Math.PI))*.1:0));};
  return root;
}

function sign(kit){const group=kit.pole(1.6,.08),gs=[];for(let j=0;j<9;j++)gs.push(kit.noodleGeometry([[-.6,1.08+j*.065,0],[0,1.09+j*.065,.015],[.6,1.08+j*.065,0]],.043,6,5));group.add(pastaMesh(kit,gs,kit.materials.egg));group.add(kit.strand([[-.32,1.37,.07],[.29,1.37,.07],[.08,1.56,.07],[.29,1.37,.07],[.08,1.17,.07]],.035,kit.materials.tomato,14));return group;}
function piranha(kit){
  const root=new THREE.Group(),head=new THREE.Group();root.add(kit.bundle([0,0,0],[0,1.1,0],.12,kit.materials.spinach,8,8));head.position.y=1.3;root.add(head);
  const ball=kit.coilBall(.68,kit.materials.tomato);ball.scale.set(1,.8,1.05);head.add(ball);
  const mouth=kit.coilBall(.43,kit.materials.ink);mouth.scale.set(1,.32,.3);mouth.position.set(0,-.04,.59);head.add(mouth);
  for(const s of [-1,1]){const leaf=kit.coilBall(.38,kit.materials.spinach);leaf.scale.set(1,.2,.7);leaf.position.set(s*.38,.36,0);leaf.rotation.z=s*.3;root.add(leaf);const eye=kit.coin(.105);eye.position.set(s*.28,.25,.52);eye.traverse(m=>{if(m.isMesh)m.material=kit.materials.white;});head.add(eye);}
  const teeth=[];for(let i=0;i<5;i++){const x=-.3+i*.15;teeth.push(kit.noodleGeometry([[x,.1,.7],[x+.02,-.07,.74]],.033,4,5));}head.add(pastaMesh(kit,teeth,kit.materials.white));root.userData.head=head;return root;
}
function box(kit){const gs=[];for(let j=0;j<12;j++){const y=.05+j*.08;gs.push(kit.noodleGeometry([[-.5,y,-.5],[.5,y,-.5],[.5,y,.5],[-.5,y,.5],[-.5,y,-.5]],.05,16,5));}for(let j=0;j<10;j++)gs.push(kit.noodleGeometry([[-.5,.95,-.46+j*.1],[.5,.95,-.46+j*.1]],.05,2,5));return pastaMesh(kit,gs,kit.materials.toasted);}

export async function createWhompWorld(scene,kit,course,renderData,physics,{onProgress=()=>{},damage=()=>{},burst=()=>{},message=()=>{}}={}){
  const terrain=new THREE.Group(),props=new THREE.Group(),staticProps=new THREE.Group(),guide=new THREE.Group();terrain.name='Whomp Fortress original ACT1 geometry in spaghetti';props.name='Whomp Fortress pasta objects';guide.visible=false;scene.add(terrain,props,guide);props.add(staticProps);
  const random=rand(),materials={},callbacks={damage,burst,message};let noodleMap;
  try{noodleMap=await new THREE.TextureLoader().loadAsync('./assets/spaghetti-surface.png');noodleMap.wrapS=noodleMap.wrapT=THREE.RepeatWrapping;noodleMap.colorSpace=THREE.SRGBColorSpace;noodleMap.anisotropy=8;}catch{}
  const materialFor=id=>{if(materials[id])return materials[id];const type=colorNames[id]||'egg',base=kit.materials[type];const m=new THREE.MeshPhysicalMaterial({color:base.color,metalness:0,roughness:.35,clearcoat:.5,clearcoatRoughness:.24,ior:1.46,map:noodleMap,bumpMap:noodleMap,bumpScale:.045,side:THREE.DoubleSide});m.name=`${type} spaghetti fortress`;return materials[id]=m;};
  function pastaFence(vertices,faces,id){
    const gs=[],spacing=id==='grass_09000000'?.4:.65,radius=id==='grass_09000000'?.035:.065;
    for(const face of faces){const ps=face.slice(0,3).map(i=>v(vertices[i])),normal=ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0])).normalize(),axes=Math.abs(normal.y)>.6?['x','z']:Math.abs(normal.x)>Math.abs(normal.z)?['z','y']:['x','y'];
      for(const axis of axes){const min=Math.min(...ps.map(p=>p[axis])),max=Math.max(...ps.map(p=>p[axis]));for(let k=Math.ceil(min/spacing);k*spacing<=max+.00001;k++){const level=k*spacing,hits=[];
        for(let j=0;j<3;j++){const a=ps[j],b=ps[(j+1)%3],d=b[axis]-a[axis];if(Math.abs(d)<1e-8)continue;const t=(level-a[axis])/d;if(t>=-1e-6&&t<=1+1e-6){const hit=a.clone().lerp(b,clamp(t,0,1)).addScaledVector(normal,.008);if(!hits.some(p=>p.distanceToSquared(hit)<1e-8))hits.push(hit);}}
        if(hits.length===2&&hits[0].distanceTo(hits[1])>.025)gs.push(kit.noodleGeometry(hits,radius,2,5));
      }}
    }
    const mesh=pastaMesh(kit,gs,kit.materials[colorNames[id]||'egg']);mesh.name='Open lattice of individual pasta strands';return mesh;
  }
  const groups=(vertices,faces,target)=>{const map=new Map();for(const f of faces){if(f[3]==='grass_0900B000')continue;const id=f[3]||'grass_09000800';if(!map.has(id))map.set(id,[]);map.get(id).push(f);}for(const[id,fs]of map){const mesh=id==='grass_09000000'||id==='grass_0900A000'?pastaFence(vertices,fs,id):new THREE.Mesh(geometry(vertices,fs),materialFor(id));mesh.castShadow=mesh.receiveShadow=true;target.add(mesh);}};
  groups(renderData.vertices,renderData.triangles,terrain);onProgress(22);
  const strandBuckets=new Map();const addStrand=(ps,type='egg',radius=.035)=>{if(!strandBuckets.has(type))strandBuckets.set(type,[]);strandBuckets.get(type).push(kit.noodleGeometry(ps,radius,8,5));};
  const top=[];let areaTotal=0;for(const f of renderData.triangles){if(f[3]==='grass_0900B000')continue;const a=v(renderData.vertices[f[0]]),b=v(renderData.vertices[f[1]]),c=v(renderData.vertices[f[2]]),n=b.clone().sub(a).cross(c.clone().sub(a)),area=n.length()/2;n.normalize();if(n.y<.4||area<.08)continue;areaTotal+=area;top.push({a,b,c,n,area,type:colorNames[f[3]]||'egg'});}
  for(const f of top)for(let j=0,N=Math.max(1,Math.round(2100*f.area/areaTotal));j<N;j++){let u=random(),w=random();if(u+w>1){u=1-u;w=1-w;}const p=f.a.clone().addScaledVector(f.b.clone().sub(f.a),u).addScaledVector(f.c.clone().sub(f.a),w),a=random()*TAU,ps=[];for(let k=0;k<7;k++){const t=(k/6-.5)*(1+random()*.3),x=p.x+Math.cos(a)*t,z=p.z+Math.sin(a)*t+Math.sin(k*1.1)*.07,y=p.y-(f.n.x*(x-p.x)+f.n.z*(z-p.z))/f.n.y+.04;ps.push([x,y,z]);}addStrand(ps,f.type);}
  for(const[type,gs]of strandBuckets){terrain.add(pastaMesh(kit,gs,kit.materials[type]));gs.forEach(g=>g.dispose());}
  const coins=[],enemies=[],friends=[],signs=[],rollingBalls=[],plants=[],thwomps=[],whomps=[],butterflies=[],breakables=[],platforms=[];
  const ground=(a,extra=0)=>{const p=v(a),f=physics.groundAt(p.x,p.z,p.y+1);p.y=(f?.height??p.y)+extra;return p;};
  const addStatic=(mesh,p,yaw=0)=>{mesh.position.copy(p);mesh.rotation.y=yaw*Math.PI/180;staticProps.add(mesh);return mesh;};
  const addCoin=(p,red=false,snap=false)=>{const position=snap?ground(p,.65):v(p).add(new THREE.Vector3(0,.5,0)),mesh=kit.coin(.3,red);mesh.position.copy(position);props.add(mesh);const coin={mesh,position,value:red?2:1,collected:false,phase:random()*TAU};coins.push(coin);return coin;};
  const texts={DIALOG_018:'Climb the fortress. Watch the sliding slabs and the Thwomps overhead. At the top, dodge the king, then ground-pound his back.',DIALOG_042:'The wooden bridge turns. Let it line up before crossing, and keep your balance on the pasta.',DIALOG_096:'Ride the alternating platforms up toward the summit. Jump onto the next ledge when they line up.',DIALOG_113:'Thwomps rise slowly and fall suddenly. Wait for a clear opening, then move.',DIALOG_051:'A sleeping Piranha Plant wakes when you run nearby. Walk slowly or crouch past it.'};
  for(const o of course.objects){const k=o.kind,p=o.position;
    if(k==='special_bubble_tree')addStatic(kit.tree(4.6,23),ground(p));
    else if(k==='macro_wooden_signpost'){const position=ground(p);addStatic(sign(kit),position,o.yaw);signs.push({position,text:texts[o.params]||'Follow the path upward. Dodge the Whomp King’s slam, jump onto his exposed back, then ground-pound three times.'});}
    else if(k==='bhvGiantPole')addStatic(kit.pole(20,.14),v(p));
    else if(k==='macro_cannon_closed'){const m=kit.coilBall(.8,kit.materials.toasted);m.scale.y=.2;addStatic(m,ground(p,.12));}
    else if(k==='macro_red_coin')addCoin(p,true);
    else if(k==='macro_yellow_coin_1')addCoin(p);
    else if(k==='macro_coin_line_horizontal')for(let i=0;i<5;i++){const a=o.yaw*Math.PI/180,t=(i-2)*1.6;addCoin([p[0]+Math.sin(a)*t,p[1],p[2]+Math.cos(a)*t],false,true);}
    else if(k.includes('coin_ring_horizontal'))for(let i=0;i<8;i++){const a=i/8*TAU;addCoin([p[0]+Math.sin(a)*2.5,p[1],p[2]+Math.cos(a)*2.5]);}
    else if(k==='macro_coin_arrow')for(const[x,z]of [[0,-2],[0,-.8],[0,.4],[-1.1,-.7],[1.1,-.7]]){const a=o.yaw*Math.PI/180;addCoin([p[0]+x*Math.cos(a)+z*Math.sin(a),p[1],p[2]-x*Math.sin(a)+z*Math.cos(a)],false,true);}
    else if(k==='bhvPiranhaPlant'){const mesh=piranha(kit),position=ground(p);mesh.position.copy(position);mesh.rotation.y=o.yaw*Math.PI/180;props.add(mesh);plants.push({mesh,position,state:'sleeping',timer:0,alive:true,phase:random()*TAU});}
    else if(k==='bhvThwomp'||k==='bhvThwomp2'){const mesh=createWhompModel(kit,{boss:false,thwomp:true}),position=ground(p),large=k==='bhvThwomp2';mesh.position.copy(position);mesh.position.y+=4.15;mesh.rotation.y=o.yaw*Math.PI/180;props.add(mesh);thwomps.push({mesh,home:position,yaw:o.yaw*Math.PI/180,large,state:'hover',timer:random()*2,velocity:0,id:`wf-thwomp-${thwomps.length}`});}
    else if(k==='bhvSmallWhomp'){const mesh=createWhompModel(kit,{boss:false}),position=ground(p);mesh.position.copy(position);mesh.rotation.y=o.yaw*Math.PI/180;props.add(mesh);whomps.push({mesh,position,home:position.clone(),startYaw:o.yaw*Math.PI/180,yaw:o.yaw*Math.PI/180,state:'idle',fall:0,timer:0,alive:true,id:`wf-whomp-${whomps.length}`});}
    else if(k==='bhvButterfly'){const mesh=new THREE.Group();for(const s of [-1,1]){const wing=kit.coilBall(.16,kit.materials.saffron);wing.scale.set(1.4,.17,1);wing.position.x=s*.16;mesh.add(wing);}mesh.position.fromArray(p);mesh.position.y+=1.2;props.add(mesh);butterflies.push({mesh,home:mesh.position.clone(),phase:random()*TAU});}
    else if(k.includes('breakable_box')){const mesh=box(kit),position=ground(p);mesh.position.copy(position);props.add(mesh);breakables.push({mesh,position,alive:true});}
  }
  onProgress(55);
  for(const d of course.dynamic||[]){const mesh=new THREE.Group();mesh.name=d.kind;groups(d.renderVertices||d.vertices,d.renderTriangles||d.triangles,mesh);mesh.position.fromArray(d.position);mesh.rotation.y=(d.yaw||0)*Math.PI/180;props.add(mesh);
    // Loose strands follow each moving slab as part of the actual object.
    const vertices=d.vertices;let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,top=-Infinity;vertices.forEach(p=>{minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minZ=Math.min(minZ,p[2]);maxZ=Math.max(maxZ,p[2]);top=Math.max(top,p[1]);});
    const gs=[];if(d.type!=='breakable_wall_left'&&d.type!=='breakable_wall_right')for(let j=0,N=Math.min(35,Math.ceil((maxX-minX)/.13));j<N;j++){const x=minX+(j+.5)/N*(maxX-minX),ps=[];for(let k=0;k<8;k++)ps.push([x+Math.sin(k*.7+j)*.025,top+.025,minZ+(maxZ-minZ)*k/7]);gs.push(kit.noodleGeometry(ps,.035,10,5));}if(gs.length)mesh.add(pastaMesh(kit,gs,kit.materials.egg));
    platforms.push({d,mesh,base:v(d.position),baseYaw:(d.yaw||0)*Math.PI/180,trigger:-1,fallV:0,previous:new THREE.Matrix4(),matrix:new THREE.Matrix4(),active:true});mesh.updateMatrix();platforms[platforms.length-1].previous.copy(mesh.matrix);
  }
  // The original shallow water basin is filled entirely with soft rice noodles.
  for(const basin of course.waterBoxes||[]){const x0=basin.x[0],x1=basin.x[1],z0=basin.z[0],z1=basin.z[1],y=basin.height,vs=[[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]],m=materialFor('rice-pasta-basin').clone();m.color.copy(kit.materials.white.color);m.roughness=.26;const mesh=new THREE.Mesh(geometry(vs,[[0,2,1],[0,3,2]]),m);mesh.receiveShadow=true;props.add(mesh);physics.setBoxCollider?.('wf-pasta-basin',{center:[(x0+x1)/2,y-.12,(z0+z1)/2],halfSize:[(x1-x0)/2,.12,(z1-z0)/2],yaw:0});}
  const routePoints=(course.route||[]).map(v),guideGeometry=[];for(let i=1;i<routePoints.length;i++){const a=routePoints[i-1],b=routePoints[i],count=Math.ceil(a.distanceTo(b)/2);for(let j=0;j<count;j++){const p=a.clone().lerp(b,j/count);p.y+=.06;const ps=[];for(let k=0;k<7;k++){const q=k/6*TAU;ps.push([p.x+Math.cos(q)*.1,p.y,p.z+Math.sin(q)*.1]);}guideGeometry.push(kit.noodleGeometry(ps,.03,8,5));}}if(guideGeometry.length)guide.add(pastaMesh(kit,guideGeometry,kit.materials.tomato));
  // Batch immobile decorations without removing their pasta geometry.
  staticProps.updateMatrixWorld(true);const batches=new Map();staticProps.traverse(o=>{if(!o.isMesh)return;const id=o.material.uuid;if(!batches.has(id))batches.set(id,{m:o.material,g:[]});batches.get(id).g.push(o.geometry.clone().applyMatrix4(o.matrixWorld));});staticProps.clear();for(const b of batches.values()){staticProps.add(pastaMesh(kit,b.g,b.m));b.g.forEach(g=>g.dispose());}
  const initialCoinCount=coins.length;
  let warpCooldown=0,warpDwell=0,warpIndex=-1,worldTime=0;
  const world={terrain,props,coins,enemies,friends,chomp:null,rollingBalls,bossSpawn:ground(course.boss.position),starPosition:v(course.star?.position||course.star||[1.8,38.8,3.4]),signs,routePoints,guide,materials,callbacks,platforms,plants,thwomps,whomps};
  function movePlatforms(t,dt,player){
    let riding=null;if(player?.grounded){const floor=physics.groundAt(player.position.x,player.position.z,player.position.y+.12);if(floor&&Math.abs(floor.height-player.position.y)<.3)riding=floor.triangle?.dynamic;}
    for(const p of platforms){const{d,mesh,base,baseYaw}=p,m=d.motion||{};mesh.position.copy(base);mesh.rotation.set(0,baseYaw,0);
      if(d.type==='rotating_platform')mesh.rotation.y=baseYaw+t*(m.yawRadiansPerSecond||.3681554);
      else if(d.type==='rotating_wooden_platform'){const cycle=(m.idleSeconds||2)+(m.rotateSeconds||4.2),n=Math.floor(t/cycle),part=t%cycle;mesh.rotation.y=baseYaw+n*Math.PI+Math.max(0,part-2)*(m.yawRadiansPerSecond||.73631);}
      else if(d.type==='small_bomp'||d.type==='large_bomp'){const phase=(t+(d.type==='large_bomp'?1.4:d.kind.endsWith('1')?2.6:0))%5.4;let ext=0;if(phase>1.8&&phase<2.2)ext=(phase-1.8)/.4*.22;else if(phase>=2.2&&phase<2.5)ext=.22;else if(phase>=2.5&&phase<2.75)ext=.22+(phase-2.5)/.25*.78;else if(phase>=2.75&&phase<3.55)ext=1;else if(phase>=3.55&&phase<4.8)ext=1-(phase-3.55)/1.25;mesh.position.x=(m.retractedX||33.3)+ext*((m.extendedX||38.3)-(m.retractedX||33.3));if(ext>.7&&player&&Math.abs(player.position.y-base.y)<2.2&&Math.abs(player.position.z-base.z)<(d.type==='large_bomp'?2.9:1.5)&&player.position.x>mesh.position.x+1&&player.position.x<mesh.position.x+3.3)world.callbacks.damage?.(mesh.position,1);}
      else if(d.type==='sliding_platform'){const idx=+d.kind.slice(-1),speed=m.speed||[4.5,3,6][idx]||3,phase=Math.max(0,t-idx*.67)%5;mesh.position.x=33.3+(phase<2?Math.min(5.1,phase*speed):Math.max(0,5.1-(phase-2)*speed));}
      else if(d.type==='checkerboard_elevator'){const travel=m.travel||6.5,speed=m.speed||3,run=travel/speed,turn=m.turnSeconds||2.133333,cycle=2*run+2*turn,phase=(t+(m.initialPhase?run+turn:0))%cycle,g=m.groupOrigin||[10.35,28.8,-9],r=m.pivotRadius||1.45;let y=0,rot=0,z=-r;if(phase<run)y=phase*speed;else if(phase<run+turn){const a=(phase-run)/turn*Math.PI;y=travel+r*Math.sin(a);z=-r*Math.cos(a);rot=a;}else if(phase<2*run+turn){y=travel-(phase-run-turn)*speed;z=r;rot=Math.PI;}else{const a=(phase-2*run-turn)/turn*Math.PI;y=-r*Math.sin(a);z=r*Math.cos(a);rot=Math.PI+a;}
        mesh.position.set(g[0]+Math.sin(baseYaw)*z,g[1]+y,g[2]+Math.cos(baseYaw)*z);mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),baseYaw).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),rot-(m.initialPhase?Math.PI:0)));}
      else if(d.type==='tumbling_bridge'){if(riding===d.kind&&p.trigger<0)p.trigger=t;const elapsed=p.trigger<0?0:t-p.trigger;if(elapsed>(m.triggerDelay||.2)){const f=elapsed-(m.triggerDelay||.2);mesh.position.y=base.y-.5*(m.gravity||27)*f*f;mesh.rotation.x=Math.min(1.5,f*2);if(mesh.position.y<base.y-18){mesh.visible=false;physics.setDynamicEnabled(d.kind,false);p.active=false;}}
        if(p.trigger>=0&&elapsed>4&&player&&Math.hypot(player.position.x-base.x,player.position.z-base.z)>(m.respawnDistance||12)){p.trigger=-1;p.active=true;mesh.visible=true;physics.setDynamicEnabled(d.kind,true);mesh.position.copy(base);mesh.rotation.set(0,baseYaw,0);}}
      mesh.updateMatrix();p.matrix.copy(mesh.matrix);
      if(riding===d.kind&&player&&p.active&&d.type!=='tumbling_bridge'){const local=new THREE.Vector3(player.position.x,player.position.y,player.position.z).applyMatrix4(p.previous.clone().invert()),next=local.applyMatrix4(p.matrix);player.position.x=next.x;player.position.y=next.y;player.position.z=next.z;}
      if(p.active)physics.setDynamicPose?.(d.kind,mesh.position.toArray(),[mesh.rotation.x,mesh.rotation.y,mesh.rotation.z]);p.previous.copy(p.matrix);
    }
  }
  function update(time,dt,player){
    worldTime+=dt;const t=worldTime;movePlatforms(t,dt,player);
    for(const c of coins)if(!c.collected){c.mesh.rotation.y=time*1.3+c.phase;c.mesh.position.y=c.position.y+Math.sin(time*2.5+c.phase)*.075;}
    for(const b of butterflies){b.mesh.position.copy(b.home).add(new THREE.Vector3(Math.sin(t*.7+b.phase)*.5,Math.sin(t*2+b.phase)*.2,Math.cos(t*.8+b.phase)*.5));for(let i=0;i<2;i++)b.mesh.children[i].rotation.z=(i?1:-1)*Math.sin(t*12+b.phase)*.65;}
    if(!player)return;
    for(const p of plants){if(!p.alive)continue;const dx=player.position.x-p.position.x,dz=player.position.z-p.position.z,d=Math.hypot(dx,dz),near=d<4&&Math.abs(player.position.y-p.position.y)<2.2;if(p.state==='sleeping'&&near&&player.speed>2.4){p.state='waking';p.timer=.55;}if(p.state==='waking'){p.timer-=dt;if(p.timer<=0){p.state='biting';p.timer=1.7;}}else if(p.state==='biting'){p.timer-=dt;if(d<1.25&&near)world.callbacks.damage?.(p.position,3);if(p.timer<=0&&!near)p.state='sleeping';}p.mesh.userData.head.rotation.x=p.state==='sleeping'?.38:Math.sin(t*6)*.17;p.mesh.rotation.y+=angle(Math.atan2(dx,dz),p.mesh.rotation.y)*Math.min(1,dt*(p.state==='sleeping'?0:2));}
    for(const th of thwomps){const d=Math.hypot(player.position.x-th.home.x,player.position.z-th.home.z),height=4.15,width=2.19,bodyH=4.62;th.timer-=dt;
      if(th.state==='hover'&&th.timer<=0&&d<5&&Math.abs(player.position.y-th.home.y)<6){th.state='falling';th.velocity=0;}
      if(th.state==='falling'){th.velocity-=36*dt;th.mesh.position.y=Math.max(th.home.y,th.mesh.position.y+th.velocity*dt);if(th.mesh.position.y===th.home.y){th.state='down';th.timer=1;world.callbacks.burst?.(th.home,10,kit.materials.egg);}}
      else if(th.state==='down'&&th.timer<=0)th.state='rising';else if(th.state==='rising'){th.mesh.position.y+=dt*3;if(th.mesh.position.y>=th.home.y+height){th.mesh.position.y=th.home.y+height;th.state='hover';th.timer=.65;}}
      physics.setBoxCollider?.(th.id,{center:[th.mesh.position.x,th.mesh.position.y+bodyH/2,th.mesh.position.z],halfSize:[width,bodyH/2,width],yaw:th.yaw});
      if(th.state==='falling'&&d<width+.45&&player.position.y+player.height>th.mesh.position.y&&player.position.y<th.mesh.position.y+bodyH)world.callbacks.damage?.(th.mesh.position,3);
    }
    for(const w of whomps){if(!w.alive)continue;const dx=player.position.x-w.position.x,dz=player.position.z-w.position.z,d=Math.hypot(dx,dz);w.timer-=dt;
      if(w.state==='idle'&&d<6&&Math.abs(player.position.y-w.position.y)<2.5){w.yaw+=clamp(angle(Math.atan2(dx,dz),w.yaw),-dt*.85,dt*.85);if(d<6.2){w.state='windup';w.timer=.6;}}
      else if(w.state==='windup'&&w.timer<=0){w.state='falling';w.timer=0;}
      else if(w.state==='falling'){w.fall=Math.min(1,w.fall+dt*3);if(w.fall===1){w.state='exposed';w.timer=3.33;const lx=dx*Math.cos(w.yaw)-dz*Math.sin(w.yaw),lz=dx*Math.sin(w.yaw)+dz*Math.cos(w.yaw);if(Math.abs(lx)<1.8&&lz>.3&&lz<4.5&&player.position.y-w.position.y<1.1)world.callbacks.damage?.(w.position,2);}}
      else if(w.state==='exposed'&&w.timer<=0)w.state='rising';else if(w.state==='rising'){w.fall=Math.max(0,w.fall-dt*.9);if(w.fall===0){w.state='idle';w.timer=.5;}}
      w.mesh.rotation.y=w.yaw;w.mesh.userData.update(dt,{time,state:w.state,fall:w.fall});if(w.fall>.98)physics.setBoxCollider?.(w.id,{center:[w.position.x+Math.sin(w.yaw)*2.4,w.position.y+.515,w.position.z+Math.cos(w.yaw)*2.4],halfSize:[1.5,.485,1.9],yaw:w.yaw});else if(w.fall<.1)physics.setBoxCollider?.(w.id,{center:[w.position.x-Math.sin(w.yaw)*.515,w.position.y+2.4,w.position.z-Math.cos(w.yaw)*.515],halfSize:[1.5,1.9,.485],yaw:w.yaw});else physics.setBoxCollider?.(w.id,null,false);
    }
    warpCooldown=Math.max(0,warpCooldown-dt);if(warpCooldown===0&&player.grounded&&player.speed<.5){const i=(course.warps||[]).findIndex(w=>Math.hypot(player.position.x-w.from[0],player.position.z-w.from[2])<.9&&Math.abs(player.position.y-w.from[1])<1.4);if(i>=0){warpDwell=i===warpIndex?warpDwell+dt:dt;warpIndex=i;if(warpDwell>1){const dest=course.warps[i].to;player.position.x=dest[0];player.position.y=dest[1]+.06;player.position.z=dest[2];player.velocity.x=player.velocity.y=player.velocity.z=0;warpCooldown=5;warpDwell=0;world.callbacks.message?.('A secret passage through the pasta.');}}else{warpIndex=-1;warpDwell=0;}}
  }
  function onGroundPound(player){
    for(const w of whomps){if(!w.alive||w.state!=='exposed')continue;const dx=player.position.x-w.position.x,dz=player.position.z-w.position.z,lx=dx*Math.cos(w.yaw)-dz*Math.sin(w.yaw),lz=dx*Math.sin(w.yaw)+dz*Math.cos(w.yaw);if(Math.abs(lx)<1.7&&lz>.3&&lz<4.5&&player.position.y-w.position.y>.7&&player.position.y-w.position.y<1.7){w.alive=false;w.mesh.visible=false;physics.setBoxCollider?.(w.id,null,false);world.callbacks.burst?.(w.position,20,kit.materials.egg);for(let i=0;i<5;i++)addCoin([w.position.x+(i-2)*.35,w.position.y+.2,w.position.z]);player.velocity.y=8;player.grounded=false;}}
    for(const b of breakables)if(b.alive&&Math.hypot(player.position.x-b.position.x,player.position.z-b.position.z)<1.4&&Math.abs(player.position.y-b.position.y)<2){b.alive=false;b.mesh.visible=false;world.callbacks.burst?.(b.position,16,kit.materials.toasted);addCoin(b.position.toArray());}
  }
  function action(player){for(const p of plants)if(p.alive&&p.state!=='biting'&&Math.hypot(player.position.x-p.position.x,player.position.z-p.position.z)<1.85&&Math.abs(player.position.y-p.position.y)<1.5){p.alive=false;p.mesh.visible=false;world.callbacks.burst?.(p.position,12,kit.materials.tomato);for(let i=0;i<3;i++)addCoin([p.position.x+(i-1)*.3,p.position.y,p.position.z]);return true;}return false;}
  function reset(){for(const c of coins.splice(initialCoinCount))props.remove(c.mesh);worldTime=0;warpCooldown=warpDwell=0;warpIndex=-1;for(const p of platforms){p.trigger=-1;p.active=true;p.mesh.visible=true;p.mesh.position.copy(p.base);p.mesh.rotation.set(0,p.baseYaw,0);p.mesh.updateMatrix();p.previous.copy(p.mesh.matrix);physics.setDynamicEnabled(p.d.kind,true);physics.setDynamicPose?.(p.d.kind,p.base.toArray(),[0,p.baseYaw,0]);}for(const p of plants){p.alive=true;p.mesh.visible=true;p.state='sleeping';p.timer=0;}for(const w of whomps){w.alive=true;w.mesh.visible=true;w.state='idle';w.fall=0;w.timer=0;w.position.copy(w.home);w.yaw=w.startYaw;w.mesh.rotation.y=w.yaw;w.mesh.userData.update(0,{fall:0});physics.setBoxCollider?.(w.id,null,false);}for(const th of thwomps){th.mesh.position.copy(th.home);th.mesh.position.y+=4.15;th.state='hover';th.timer=.65;th.velocity=0;physics.setBoxCollider?.(th.id,null,false);}for(const b of breakables){b.alive=true;b.mesh.visible=true;}}
  world.update=update;world.reset=reset;world.action=action;world.onGroundPound=onGroundPound;onProgress(100);return world;
}
