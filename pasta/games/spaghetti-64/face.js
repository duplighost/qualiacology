import * as THREE from './vendor/three.module.js';

// A sculpted noodle face: there is no skin shell underneath the spaghetti.
// Every rendered primitive is a round strand. Hidden spheres are used only
// for picking, and never contribute pixels, shadows, or depth.
export function createPastaFace(kit) {
  const group = new THREE.Group();
  group.name = 'Spaghetti Mario — pullable face';
  const TAU = Math.PI * 2, sides = 5;
  const buckets = new Map(), meshes = [], handles = [];
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const material = name => kit.materials[name] || kit.materials.egg;
  const add = (name, geometry) => {
    if (!buckets.has(name)) buckets.set(name,[]);
    buckets.get(name).push(geometry);
    return geometry;
  };
  const coil = (name,x,y,z,rx,ry,rz,radius,turns,seed=1) =>
    add(name,kit.winding(rx,ry,rz,radius,seed,turns).translate(x,y,z));
  const noodle = (name,points,radius=.04,segments=20) =>
    add(name,kit.noodleGeometry(points,radius,segments,sides));

  // Durum pasta cranium, rounded chin, and soft coiled cheeks.
  coil('egg',0,-.10,-.08,1.17,1.39,.88,.056,32,31);
  coil('egg',0,-1.03,.08,.68,.40,.69,.049,11,51);
  for (const side of [-1,1]) {
    coil('egg',side*.75,-.48,.48,.39,.41,.42,.049,9,39+side);
    coil('egg',side*1.28,-.03,-.05,.32,.53,.25,.050,11,17+side);
    // A folded spiral of tomato-tinted pasta defines the inner ear.
    const ear=[];
    for(let j=0;j<=35;j++){
      const t=j/35,a=t*TAU*2.3,fall=1-t*.68;
      ear.push([side*(1.30+Math.cos(a)*.18*fall),-.02+Math.sin(a)*.34*fall,.17+Math.sin(a)*.014]);
    }
    noodle('pink',ear,.037,42);
    // Sideburns are actual toasted noodles following the temple.
    for(let j=0;j<4;j++)noodle('toasted',[
      [side*(.98+j*.045),.69,.28],
      [side*(1.08+j*.037),.27,.34],
      [side*(1.10+j*.030),-.04,.29],
      [side*(1.03+j*.025),-.16,.32],
    ],.044,13);
  }

  // Several crossing strands prevent the face reading as a rigid lathed solid.
  for(let i=0;i<11;i++){
    const x=(i-5)*.18,points=[];
    for(let j=0;j<=16;j++){
      const y=-1.16+j/16*2.12;
      const z=.87*Math.sqrt(Math.max(.015,1-(x/1.22)**2-((y+.1)/1.5)**2))-.045;
      points.push([x+Math.sin(j*.55+i)*.025,y,z]);
    }
    noodle('egg',points,.035,24);
  }

  // White rice-pasta eyes, butterfly-pea irises, and squid-ink pupils.
  for(const side of [-1,1]){
    const x=side*.46;
    coil('white',x,.38,.81,.275,.375,.11,.038,10,58+side);
    coil('blue',x-side*.020,.36,.928,.115,.225,.049,.028,8,68+side);
    coil('ink',x-side*.015,.36,.977,.056,.145,.030,.021,6,78+side);
    noodle('white',[[x-.028,.445,1.01],[x-.019,.480,1.015],[x-.002,.479,1.013]],.018,5);
    // Raised folded noodles, rather than flat painted eyebrows.
    for(let j=0;j<3;j++)noodle('ink',[
      [x-side*.27,.70+j*.042,.79],
      [x-side*.09,.82+j*.043,.86],
      [x+side*.14,.83+j*.038,.82],
      [x+side*.26,.75+j*.029,.74],
    ],.041,12);
  }

  // The large nose remains a coil of cooked spaghetti even when stretched.
  coil('egg',0,-.055,1.02,.36,.32,.405,.047,12,22);

  // Smile cavity, noodles for teeth, and a rounded noodle lip.
  coil('dark',0,-.80,.77,.46,.19,.10,.040,8,35);
  for(let i=0;i<4;i++){
    const y=-.735-i*.030;
    noodle('white',[[-.31,y,.883],[-.17,y-.025,.899],[0,y-.035,.909],[.17,y-.025,.899],[.31,y,.883]],.025,14);
  }
  for(let j=0;j<3;j++)noodle('egg',[
    [-.46,-.80-j*.025,.79],[-.30,-.96-j*.022,.84],[0,-1.015-j*.018,.86],[.30,-.96-j*.022,.84],[.46,-.80-j*.025,.79],
  ],.039,22);

  // Six moustache lobes are tight, uneven squid-ink spaghetti spirals.
  for(let i=0;i<6;i++){
    const x=(i-2.5)*.25,edge=Math.abs(i-2.5)/2.5;
    coil('ink',x,-.48-edge*.075,1.00-edge*.15,.19,.17-edge*.025,.14,.038,7,90+i);
  }
  for(const side of [-1,1])for(let j=0;j<3;j++)noodle('ink',[
    [side*.57,-.51+j*.025,.93],
    [side*.77,-.54+j*.026,.85],
    [side*.91,-.43+j*.023,.76],
    [side*.92,-.34+j*.018,.73],
  ],.038,12);

  // Tomato spaghetti cap. The brim is eight nested noodles, never cloth.
  coil('tomato',0,1.28,-.13,1.26,.65,.96,.055,20,49);
  for(let j=0;j<9;j++){
    const points=[],rx=1.20-j*.047,rz=.83-j*.040;
    for(let k=0;k<=25;k++){
      const a=Math.PI*k/25;
      points.push([Math.cos(a)*rx,.94+Math.sin(a)*.025+j*.003,.28+Math.sin(a)*rz]);
    }
    noodle('tomato',points,.041,30);
  }
  coil('white',0,1.37,.800,.255,.245,.055,.032,10,111);
  noodle('tomato',[[-.135,1.24,.865],[-.115,1.50,.866],[0,1.34,.883],[.115,1.50,.866],[.135,1.24,.865]],.031,18);

  // Small noodle ends on the hat and moustache make the elastic drag visible.
  noodle('tomato',[[-1.06,1.12,.48],[-1.16,.99,.52],[-1.15,.80,.56],[-1.22,.70,.54]],.029,11);
  noodle('ink',[[.80,-.47,.83],[.90,-.61,.86],[.88,-.76,.89],[.80,-.80,.88]],.027,11);

  const hitMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
  hitMaterial.visible=false;
  const hitGeometry=new THREE.SphereGeometry(1,10,8);
  const defineHandle=(id,label,rest,radius,influence,mass=1,maxStretch=1.8)=>{
    const handle={id,label,rest:new THREE.Vector3(...rest),position:new THREE.Vector3(...rest),velocity:new THREE.Vector3(),radius,influence,mass,maxStretch,worldPoint:new THREE.Vector3()};
    const hitMesh=new THREE.Mesh(hitGeometry,hitMaterial);
    hitMesh.name=`Pick ${label}`;hitMesh.position.copy(handle.position);hitMesh.scale.setScalar(radius);hitMesh.userData.faceHandle=handle;group.add(hitMesh);handle.hitMesh=hitMesh;
    handles.push(handle);return handle;
  };
  defineHandle('nose','nose',[0,-.06,1.31],.33,.49,1.15,2.05);
  defineHandle('ear-left','left ear',[-1.37,-.06,.17],.31,.53,.65,1.7);
  defineHandle('ear-right','right ear',[1.37,-.06,.17],.31,.53,.65,1.7);
  defineHandle('cheek-left','left cheek',[-.79,-.62,.78],.30,.65,.9,1.7);
  defineHandle('cheek-right','right cheek',[.79,-.62,.78],.30,.65,.9,1.7);
  defineHandle('moustache-left','left moustache tip',[-.82,-.45,.91],.20,.37,.55,1.8);
  defineHandle('moustache-right','right moustache tip',[.82,-.45,.91],.20,.37,.55,1.8);
  defineHandle('brow-left','left eyebrow',[-.48,.84,.89],.23,.47,.65,1.6);
  defineHandle('brow-right','right eyebrow',[.48,.84,.89],.23,.47,.65,1.6);
  defineHandle('eye-left','left eye',[-.46,.38,1.01],.25,.35,.8,1.25);
  defineHandle('eye-right','right eye',[.46,.38,1.01],.25,.35,.8,1.25);
  defineHandle('mouth','smile',[0,-.94,.94],.30,.57,.7,1.8);
  defineHandle('cap','top of the cap',[0,1.78,.24],.42,.95,1.4,1.8);
  defineHandle('cap-left','left cap brim',[-.98,1.02,.76],.25,.55,.75,1.7);
  defineHandle('cap-right','right cap brim',[.98,1.02,.76],.25,.55,.75,1.7);

  // Neighbor springs transmit a little of a pull into adjoining features.
  // Their rest lengths preserve the arrangement while allowing local sag.
  const links=[];
  const link=(a,b,strength=.17)=>{
    const ia=handles.findIndex(h=>h.id===a),ib=handles.findIndex(h=>h.id===b);
    links.push({a:ia,b:ib,rest:handles[ia].rest.distanceTo(handles[ib].rest),strength});
  };
  for(const side of ['left','right']){
    link(`ear-${side}`,`cheek-${side}`,.12);
    link(`cheek-${side}`,`moustache-${side}`,.17);
    link(`moustache-${side}`,'nose',.09);
    link(`moustache-${side}`,'mouth',.12);
    link(`eye-${side}`,`brow-${side}`,.20);
    link(`eye-${side}`,`cheek-${side}`,.15);
    link(`brow-${side}`,`cap-${side}`,.15);
    link(`cap-${side}`,'cap',.22);
    link(`cheek-${side}`,'mouth',.12);
  }

  function makeDeformer(geometry){
    const original=geometry.attributes.position.array.slice(),originalNormals=geometry.attributes.normal.array.slice();
    const uv=geometry.attributes.uv.array,ringCount=geometry.attributes.position.count/sides;
    const centers=new Float32Array(ringCount*3),deformed=new Float32Array(ringCount*3),tangents=new Float32Array(ringCount*3);
    const previous=new Int32Array(ringCount),next=new Int32Array(ringCount),influences=new Uint8Array(ringCount*4),weights=new Float32Array(ringCount*4);
    for(let r=0;r<ringCount;r++){
      for(let j=0;j<sides;j++){const k=(r*sides+j)*3;centers[r*3]+=original[k]/sides;centers[r*3+1]+=original[k+1]/sides;centers[r*3+2]+=original[k+2]/sides;}
      const t=uv[r*sides*2+1];previous[r]=r>0&&t>uv[(r-1)*sides*2+1]+.00001?r-1:r;
      next[r]=r+1<ringCount&&uv[(r+1)*sides*2+1]>t+.00001?r+1:r;
      const options=handles.map((h,index)=>{
        const dx=centers[r*3]-h.rest.x,dy=centers[r*3+1]-h.rest.y,dz=centers[r*3+2]-h.rest.z;
        const d2=dx*dx+dy*dy+dz*dz;
        return {index,weight:Math.exp(-d2/(h.influence*h.influence*.54))};
      }).sort((a,b)=>b.weight-a.weight).slice(0,4);
      const total=options.reduce((s,o)=>s+o.weight,0),norm=Math.max(1,total);
      for(let j=0;j<4;j++){influences[r*4+j]=options[j].index;weights[r*4+j]=options[j].weight/norm;}
    }
    const tangent=new THREE.Vector3();
    for(let r=0;r<ringCount;r++){
      const a=previous[r]*3,b=next[r]*3;
      tangent.set(centers[b]-centers[a],centers[b+1]-centers[a+1],centers[b+2]-centers[a+2]).normalize();
      if(tangent.lengthSq()<.1)tangent.set(0,1,0);
      tangents.set([tangent.x,tangent.y,tangent.z],r*3);
    }
    geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.15,.2),5.5);
    return {geometry,original,originalNormals,centers,deformed,tangents,previous,next,influences,weights,ringCount};
  }
  for(const [name,geometries]of buckets){
    const geometry=kit.mergeGeometry(geometries),mat=material(name).clone();
    mat.name=`Cooked ${name} spaghetti face`;mat.roughness=.30;mat.clearcoat=.59;mat.clearcoatRoughness=.22;
    const mesh=new THREE.Mesh(geometry,mat);mesh.name=`Spaghetti Mario face ${name}`;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;group.add(mesh);
    meshes.push(makeDeformer(geometry));for(const g of geometries)g.dispose();
  }

  let active=null,softness=.65,dragTarget=new THREE.Vector3(),grabOffset=new THREE.Vector3(),lastTime=0;
  let settling=true,revision=0;
  const delta=new THREE.Vector3(),force=new THREE.Vector3(),local=new THREE.Vector3(),rotation=new THREE.Quaternion();
  const fromTangent=new THREE.Vector3(),toTangent=new THREE.Vector3(),radial=new THREE.Vector3(),normal=new THREE.Vector3();
  const offsets=new Float32Array(handles.length*3);

  function updateGeometry(){
    for(let i=0;i<handles.length;i++){const h=handles[i];offsets[i*3]=h.position.x-h.rest.x;offsets[i*3+1]=h.position.y-h.rest.y;offsets[i*3+2]=h.position.z-h.rest.z;}
    for(const d of meshes){
      const {centers,deformed,ringCount,influences,weights}=d;
      for(let r=0;r<ringCount;r++){
        const q=r*3;let x=centers[q],y=centers[q+1],z=centers[q+2];
        for(let j=0;j<4;j++){const h=influences[r*4+j]*3,w=weights[r*4+j];x+=offsets[h]*w;y+=offsets[h+1]*w;z+=offsets[h+2]*w;}
        deformed[q]=x;deformed[q+1]=y;deformed[q+2]=z;
      }
      const out=d.geometry.attributes.position.array,outNormals=d.geometry.attributes.normal.array;
      for(let r=0;r<ringCount;r++){
        const q=r*3,a=d.previous[r]*3,b=d.next[r]*3;
        fromTangent.set(d.tangents[q],d.tangents[q+1],d.tangents[q+2]);
        toTangent.set(deformed[b]-deformed[a],deformed[b+1]-deformed[a+1],deformed[b+2]-deformed[a+2]).normalize();
        if(toTangent.lengthSq()<.1)toTangent.copy(fromTangent);
        rotation.setFromUnitVectors(fromTangent,toTangent);
        for(let j=0;j<sides;j++){
          const k=(r*sides+j)*3;
          radial.set(d.original[k]-centers[q],d.original[k+1]-centers[q+1],d.original[k+2]-centers[q+2]).applyQuaternion(rotation);
          out[k]=deformed[q]+radial.x;out[k+1]=deformed[q+1]+radial.y;out[k+2]=deformed[q+2]+radial.z;
          normal.set(d.originalNormals[k],d.originalNormals[k+1],d.originalNormals[k+2]).applyQuaternion(rotation);
          outNormals[k]=normal.x;outNormals[k+1]=normal.y;outNormals[k+2]=normal.z;
        }
      }
      d.geometry.attributes.position.needsUpdate=true;d.geometry.attributes.normal.needsUpdate=true;
    }
    revision++;
  }

  function integrate(dt){
    const stiffness=48-softness*26,damping=6.5-softness*2.1;
    for(const h of handles){
      force.subVectors(h.rest,h.position).multiplyScalar(stiffness/h.mass);
      // Cooked noodles sag under their weight; the rest tether is the face's
      // structural support, rather than an attempt to simulate free dough.
      force.y-=.36+softness*.30;
      if(h===active)force.addScaledVector(delta.subVectors(dragTarget,h.position),370/h.mass);
      h.velocity.addScaledVector(force,dt).multiplyScalar(Math.exp(-(h===active?22:damping)*dt));
    }
    for(const l of links){
      const a=handles[l.a],b=handles[l.b];delta.subVectors(b.position,a.position);const length=delta.length()||.001;
      delta.multiplyScalar((length-l.rest)/length*(30*l.strength));
      a.velocity.addScaledVector(delta,dt/a.mass);b.velocity.addScaledVector(delta,-dt/b.mass);
    }
    for(const h of handles){
      h.position.addScaledVector(h.velocity,dt);
      delta.subVectors(h.position,h.rest);const length=delta.length();
      if(length>h.maxStretch){delta.multiplyScalar(h.maxStretch/length);h.position.copy(h.rest).add(delta);h.velocity.multiplyScalar(.25);}
      // Prevent folds from sending the face through the back of its skull.
      h.position.z=Math.max(-.55,h.position.z);
    }
  }

  function update(dt,time=lastTime+dt){
    dt=clamp(Number(dt)||0,0,.1);lastTime=time;
    if(!dt)return;
    const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
    for(let i=0;i<steps;i++)integrate(h);
    let energy=0;
    for(const handle of handles){handle.hitMesh.position.copy(handle.position);energy+=handle.velocity.lengthSq();}
    const moving=active||energy>.000015||settling;
    if(moving)updateGeometry();
    settling=energy>.000015;
  }
  function pick(raycaster){
    group.updateWorldMatrix(true,true);
    const hits=raycaster.intersectObjects(handles.map(h=>h.hitMesh),false);
    if(!hits.length)return null;
    const handle=hits[0].object.userData.faceHandle;
    handle.worldPoint.copy(hits[0].point);return handle;
  }
  function beginDrag(handle,worldPoint){
    if(typeof handle==='string')handle=handles.find(h=>h.id===handle);
    if(!handles.includes(handle))return false;
    active=handle;settling=true;dragTarget.copy(handle.position);
    if(worldPoint){group.updateWorldMatrix(true,false);local.copy(worldPoint);group.worldToLocal(local);grabOffset.copy(handle.position).sub(local);}
    else grabOffset.set(0,0,0);
    return true;
  }
  function drag(worldPoint){
    if(!active||!worldPoint)return;
    group.updateWorldMatrix(true,false);local.copy(worldPoint);group.worldToLocal(local);local.add(grabOffset);
    delta.subVectors(local,active.rest);const length=delta.length();
    if(length>active.maxStretch)delta.multiplyScalar(active.maxStretch/length);
    dragTarget.copy(active.rest).add(delta);dragTarget.z=Math.max(-.4,dragTarget.z);settling=true;
  }
  function endDrag(){active=null;settling=true;}
  function reset(){
    active=null;settling=true;
    for(const handle of handles){handle.position.copy(handle.rest);handle.velocity.set(0,0,0);handle.hitMesh.position.copy(handle.rest);}
    updateGeometry();
  }
  function setSoftness(value){const n=Number(value);softness=Number.isFinite(n)?clamp(n,0,1):.65;settling=true;}

  updateGeometry();
  return {group,handles,update,pick,beginDrag,drag,endDrag,reset,setSoftness,
    get activeHandle(){return active;},get revision(){return revision;}};
}
