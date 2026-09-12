// Authored estate-car coachwork. Local forward is -Z; every moving interface is the
// same one the driving simulation already owns. Geometry and materials live here.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {carSurfaces} from './car-surfaces.js';
import {buildCarFittings} from './car-fittings.js';

const clamp=v=>Math.max(0,Math.min(1,v));
function rounded(w,h,d,r=.035){
  r=Math.min(r,w*.18,h*.18,d*.18);
  if(r<.006)return new THREE.BoxGeometry(w,h,d);
  const g=new THREE.BoxGeometry(w,h,d,4,4,4),p=g.attributes.position,n=g.attributes.normal,v=new THREE.Vector3(),core=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);
    for(const [key,dim]of [['x',w],['y',h],['z',d]])if(Math.abs(v[key])<dim*.499)v[key]=Math.sign(v[key])*(dim/2-r);
    core.set(Math.max(-w/2+r,Math.min(w/2-r,v.x)),Math.max(-h/2+r,Math.min(h/2-r,v.y)),Math.max(-d/2+r,Math.min(d/2-r,v.z)));
    v.sub(core).normalize();n.setXYZ(i,v.x,v.y,v.z);v.multiplyScalar(r).add(core);p.setXYZ(i,v.x,v.y,v.z);
  }return g;
}

export function buildCoachwork(spec){
  const {seed,door:doorAt,hinge,openMax,roofY,lampOffsets}=spec;
  const root=new THREE.Group();root.name='car';root.rotation.order='YXZ';
  const surfaces=carSurfaces(seed),{paint,chrome,rubber,leather,dark,glass,warm}=surfaces;
  const batches=new Map(),geometries=[],extraMaterials=[];
  const collect=(g,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0,parent=root)=>{
    g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);
    let group=batches.get(parent);if(!group)batches.set(parent,group=new Map());
    let parts=group.get(mat);if(!parts)group.set(mat,parts=[]);parts.push(g);return g;
  };
  const box=(x,y,z,w,h,d,m=paint,rx=0,ry=0,rz=0,parent=root)=>collect(rounded(w,h,d),m,x,y,z,rx,ry,rz,parent);
  const cylinder=(x,y,z,r,h,m=chrome,rx=0,rz=0,parent=root)=>collect(new THREE.CylinderGeometry(r,r,h,32),m,x,y,z,rx,0,rz,parent);
  const tube=(points,r,m=chrome,parent=root)=>collect(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*8),r,8,false),m,0,0,0,0,0,0,parent);
  const sphere=(x,y,z,sx,sy,sz,m,parent=root)=>{const g=new THREE.SphereGeometry(1,32,16);g.scale(sx,sy,sz);return collect(g,m,x,y,z,0,0,0,parent);};
  const flush=()=>{for(const [parent,groups]of batches)for(const [mat,parts]of groups){
    const flat=parts.map(g=>g.index?g.toNonIndexed():g),geo=mergeGeometries(flat,false);
    if(!geo)throw new Error('car coachwork merge failed: '+mat.name);
    parts.forEach(g=>g.dispose());flat.forEach(g=>{if(!parts.includes(g))g.dispose();});
    geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,mat);mesh.name=parent.name+'-'+mat.name;
    mesh.castShadow=mat!==glass&&mat!==warm;mesh.receiveShadow=true;parent.add(mesh);geometries.push(geo);
  }batches.clear();};
  // The sill is a narrow structural rail, leaving daylight beneath the floor pan.
  box(0,.52,0,1.54,.11,3.78,dark);box(0,.68,.42,1.65,.12,3.20,rubber);
  for(const x of [-.68,.68])box(x,.48,0,.09,.12,3.94,dark);
  for(const z of [-1.275,1.275])cylinder(0,.41,z,.055,1.60,dark,0,Math.PI/2);
  // Deep side panels with real wheel-arch holes. The arches are shaped cuts, not
  // chunky trim rings pasted over a sealed rectangular slab.
  for(const side of [-1,1]){
    const shape=new THREE.Shape();shape.moveTo(-2.04,.61);
    shape.lineTo(-2.04,1.05);shape.quadraticCurveTo(-1.88,1.18,-1.03,1.20);
    shape.lineTo(.33,1.24);shape.lineTo(1.91,1.22);shape.quadraticCurveTo(2.12,1.15,2.10,.65);
    shape.lineTo(1.83,.61);shape.absarc(1.275,.40,.57,Math.PI*.13,Math.PI*.87,false);
    shape.lineTo(.71,.61);shape.lineTo(-.71,.61);shape.absarc(-1.275,.40,.57,Math.PI*.13,Math.PI*.87,false);shape.lineTo(-2.04,.61);
    const panels=[];
    if(side<0){
      // Separate fenders leave an open doorway. A polygon hole that touched the
      // front arch produced an invalid contour and triangulated across the wheel.
      const front=new THREE.Shape();front.moveTo(-2.04,.61);front.lineTo(-2.04,1.05);front.quadraticCurveTo(-1.88,1.18,-.92,1.205);
      front.lineTo(-.92,.846);front.absarc(-1.275,.40,.57,Math.acos(.355/.57),Math.PI*.87,false);front.lineTo(-2.04,.61);panels.push(front);
      const back=new THREE.Shape();back.moveTo(.30,.61);back.lineTo(.30,1.24);back.lineTo(1.91,1.22);back.quadraticCurveTo(2.12,1.15,2.10,.65);back.lineTo(1.83,.61);back.absarc(1.275,.4,.57,Math.PI*.13,Math.PI*.87,false);back.lineTo(.30,.61);panels.push(back);
      box(-.90,.685,-.205,.10,.11,1.01,paint);
    }else panels.push(shape);
    for(const contour of panels){const g=new THREE.ExtrudeGeometry(contour,{depth:.08,bevelEnabled:true,bevelSize:.025,bevelThickness:.015,bevelSegments:3,curveSegments:28});g.rotateY(-Math.PI/2);collect(g,paint,side*.88,0,0);}
    // The seam and lower rubber rubbing strip follow the car rather than its lighting.
    box(side*.94,.71,0,.025,.045,1.22,rubber);
    if(side>0){box(side*.937,1.035,-.33,.013,.046,1.20,rubber);box(side*.951,1.17,.06,.035,.027,.15,chrome);}
    box(side*.94,1.04,1.22,.018,.047,1.27,rubber);
    for(const z of [-1.275,1.275]){
      const points=[];for(let i=0;i<=22;i++){const a=Math.PI*.12+i/22*Math.PI*.76;points.push([side*.951,.4+Math.sin(a)*.564,z+Math.cos(a)*.564]);}
      tube(points,.022,chrome);box(side*.90,.38,z+.51,.07,.36,.065,rubber);
    }
    // Rain gutter, thin waist trim, roof rails and drain channels.
    tube([[side*.79,1.965,-.86],[side*.80,1.982,-.30],[side*.80,1.982,1.52],[side*.76,1.952,1.88]],.017,chrome);
    tube([[side*.94,1.248,-1.04],[side*.94,1.252,.29],[side*.94,1.243,1.94]],.012,chrome);
    for(const z of [-.27,1.47])box(side*.61,2.018,z,.07,.09,.12,dark);
    tube([[side*.61,2.05,-.41],[side*.61,2.105,-.22],[side*.61,2.105,1.42],[side*.61,2.04,1.61]],.025,dark);
  }
  // Bonnet with a gentle crown and falling shoulders. Each row has broad, continuous
  // normals, so grazing headlight reflections describe a metal surface.
  const loft=(rows,m)=>{
    const pos=[],uv=[],idx=[],segments=24;
    for(let j=0;j<rows.length;j++){const [z,y,w,crown]=rows[j];for(let i=0;i<=segments;i++){const s=i/segments*2-1;pos.push(s*w,y+crown*(1-s*s),z);uv.push(i/segments,j/(rows.length-1));}}
    for(let j=0;j<rows.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;idx.push(a,b,a+1,a+1,b,b+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();collect(g,m);
  };
  loft([[-2.10,1.047,.83,.035],[-1.94,1.105,.89,.041],[-1.55,1.157,.90,.035],[-1.06,1.207,.87,.022]],paint);
  box(0,1.005,-2.09,1.71,.20,.12,paint);
  box(0,.84,-2.17,1.82,.105,.095,chrome);box(0,.823,-2.223,1.30,.042,.012,rubber);
  box(0,.715,-2.09,1.59,.14,.09,dark);
  box(0,1.02,-2.171,.83,.16,.03,dark);
  for(let i=0;i<13;i++)box(-.386+i*.064,1.02,-2.195,.018,.122,.017,chrome);
  box(0,1.022,-2.207,.056,.052,.013,chrome);
  // Four separate lamp assemblies: recessed dark cups, bright trim, ribbed lenses.
  const headMat=new THREE.MeshStandardMaterial({color:0xb6c8be,emissive:0xffd5a0,emissiveIntensity:0,roughness:.22,metalness:.15});headMat.name='car-headlamp-lens';extraMaterials.push(headMat);
  const deadMat=headMat.clone();deadMat.name='car-second-headlamp';extraMaterials.push(deadMat);
  const lamps=[];
  for(let i=0;i<2;i++){
    const x=i?.66:-.66;cylinder(x,1.02,-2.177,.139,.035,rubber,Math.PI/2);
    collect(new THREE.TorusGeometry(.130,.012,10,40),chrome,x,1.02,-2.208);
    const g=new THREE.SphereGeometry(.113,32,16);g.scale(1,1,.32);
    const lens=new THREE.Mesh(g,i?deadMat:headMat);lens.position.set(x,1.02,-2.217);lens.name=i?'car-repaired-headlamp':'car-lamp-good';root.add(lens);geometries.push(g);lamps.push(lens);
    for(let k=-4;k<=4;k++){const h=Math.sqrt(.107*.107-(k*.021)**2)*2;box(x+k*.021,1.02,-2.254,.004,h,.004,chrome);}
    box(x,.862,-2.224,.12,.035,.018,warm);
  }
  // Greenhouse: slender pillars, curved roof and separate rubber glass seals.
  loft([[-1.01,1.885,.72,.018],[-.81,1.942,.78,.025],[-.32,1.954,.80,.02],[1.46,1.954,.80,.018],[1.83,1.918,.76,.014],[1.95,1.872,.71,.01]],paint);
  box(0,1.924,.47,1.48,.018,2.69,dark);
  box(0,1.914,-.97,1.51,.041,.048,chrome);box(0,1.245,-1.09,1.75,.053,.082,dark);
  for(const side of [-1,1]){
    tube([[side*.881,1.24,-1.067],[side*.743,1.899,-.978]],.028,paint);
    tube([[side*.86,1.25,1.955],[side*.754,1.907,1.831]],.035,paint);
    tube([[side*.917,1.244,.34],[side*.797,1.95,.29]],.022,paint);
    tube([[side*.915,1.244,1.13],[side*.797,1.95,1.10]],.018,paint);
    // Side windows are quadrilateral planes with the taper of the actual roof.
    const window=(z0,z1)=>{
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([side*.91,1.275,z0,side*.91,1.275,z1,side*.79,1.91,z1-.03,side*.79,1.91,z0+.03],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();collect(g,glass);
    };if(side>0)window(-.96,.28);window(.38,1.07);window(1.16,1.84);
  }
  const front=new THREE.PlaneGeometry(1.57,.66);collect(front,glass,0,1.586,-1.037,-.137);
  const rear=new THREE.PlaneGeometry(1.49,.64);collect(rear,glass,0,1.58,1.922,.18);
  box(0,.994,2.066,1.73,.47,.11,paint);box(0,.741,2.15,1.84,.10,.10,chrome);
  box(0,.99,2.131,.39,.15,.016,dark);box(0,1.139,2.138,.27,.027,.019,chrome);
  const tailMat=new THREE.MeshStandardMaterial({color:0x6c160d,emissive:0xff3820,emissiveIntensity:0,roughness:.32});tailMat.name='car-tail-lamps';extraMaterials.push(tailMat);
  for(const x of [-.73,.73]){box(x,1.04,2.135,.155,.255,.036,rubber);box(x,1.08,2.158,.119,.134,.019,tailMat);box(x,.971,2.158,.119,.047,.018,warm);for(let i=0;i<6;i++)box(x,1.03+i*.022,2.172,.108,.003,.002,chrome);}
  // Two windshield wipers follow the glass, with proper pivots and blades.
  for(const x of [-.42,.35]){cylinder(x,1.274,-1.093,.025,.017,dark,Math.PI/2);tube([[x,1.283,-1.105],[x+.20,1.36,-1.097],[x+.42,1.39,-1.09]],.007,dark);box(x+.42,1.404,-1.085,.34,.009,.016,rubber,0,0,.14);}
  for(const side of [-1,1]){tube([[side*.88,1.29,-.86],[side*1.015,1.35,-.92]],.016,chrome);box(side*1.05,1.374,-.92,.09,.12,.18,paint);box(side*1.053,1.375,-.82,.071,.085,.007,chrome);}
  // Hinged driver's door includes its own window and interior card.
  const door=new THREE.Group();door.name='car-door';door.position.set(hinge.x,hinge.y,hinge.z);root.add(door);
  const doorShape=new THREE.Shape([new THREE.Vector2(.02,1.205),new THREE.Vector2(1.22,1.24),new THREE.Vector2(1.22,.74),new THREE.Vector2(.25,.74),new THREE.Vector2(.02,.91)]);
  const doorSkin=new THREE.ExtrudeGeometry(doorShape,{depth:.075,bevelEnabled:true,bevelSize:.015,bevelThickness:.01,bevelSegments:3});doorSkin.rotateY(-Math.PI/2);collect(doorSkin,paint,.025,0,0,0,0,0,door);
  box(-.062,1.04,.611,.018,.047,1.17,rubber,0,0,0,door);
  box(-.077,1.17,1.005,.035,.027,.15,chrome,0,0,0,door);
  box(.052,1.021,.61,.035,.34,1.08,leather,0,0,0,door);
  box(.097,1.142,.77,.087,.05,.26,dark,0,0,0,door);
  const frame=[[0,1.242,.0],[.12,1.918,.03],[.115,1.927,1.19],[-.01,1.244,1.21]];
  for(let i=1;i<frame.length;i++)tube([frame[i-1],frame[i]],.021,paint,door);
  const doorWindow=new THREE.BufferGeometry();doorWindow.setAttribute('position',new THREE.Float32BufferAttribute([0,1.278,.025,0,1.278,1.18,.108,1.90,1.16,.108,1.90,.052],3));doorWindow.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));doorWindow.setIndex([0,1,2,0,2,3]);doorWindow.computeVertexNormals();collect(doorWindow,glass,0,0,0,0,0,0,door);
  box(.05,.80,.62,.018,.02,.62,warm,0,0,0,door);box(-.83,.73,-.33,.035,.023,1.09,warm);
  // Cabin: soft-edged leather bolsters, stitch seams and satin dashboard.
  box(0,.735,.44,1.62,.035,3.03,rubber);box(0,1.25,-1.053,1.58,.12,.24,dark);
  box(0,1.155,-.976,1.53,.18,.08,leather);box(0,1.275,-.935,1.53,.014,.016,chrome);
  for(const x of [-.43,.43]){
    box(x,.99,-.21,.62,.15,.55,leather);box(x,1.26,.035,.62,.46,.16,leather,-.13);
    for(const side of [-1,1]){sphere(x+side*.256,1.04,-.18,.063,.088,.27,leather);sphere(x+side*.254,1.265,.016,.060,.235,.085,leather);}
    box(x,1.554,.075,.28,.13,.12,leather);
    for(let n=-2;n<=2;n++)box(x+n*.085,1.255,-.062,.005,.30,.005,dark,-.13);
  }
  box(0,.98,1.09,1.41,.14,.49,leather);box(0,1.215,1.37,1.41,.36,.15,leather,-.15);
  box(0,.895,1.78,1.56,.055,.62,dark);
  for(let n=-5;n<=5;n++)box(n*.115,1.21,1.279,.005,.23,.005,dark,-.15);
  box(0,.88,-.39,.14,.24,.80,dark);cylinder(.04,1.063,-.58,.012,.24,chrome,-.23);sphere(.04,1.184,-.611,.029,.034,.029,leather);
  for(const x of [-.63,.52]){box(x,1.192,-.925,.19,.07,.018,dark);for(let n=0;n<5;n++)box(x-.07+n*.035,1.192,-.912,.007,.049,.003,chrome);}
  // Gauges are slightly tilted toward the seat and sit wholly in front of the dash.
  const instruments=new THREE.Group();instruments.name='car-instruments';instruments.position.set(-.31,1.395,-1.064);instruments.rotation.x=-.20;root.add(instruments);
  box(0,0,-.011,.40,.145,.063,dark,0,0,0,instruments);
  const dialMat=new THREE.MeshBasicMaterial({color:0xcde4bc});dialMat.name='car-gauge-print';extraMaterials.push(dialMat);
  const needleMat=new THREE.MeshBasicMaterial({color:0xf4ad66});needleMat.name='car-gauge-needle';extraMaterials.push(needleMat);
  const gauge=(x,r,parent=instruments)=>{
    cylinder(x,0,.03,r+.009,.018,chrome,Math.PI/2,0,parent);cylinder(x,0,.043,r,.006,dark,Math.PI/2,0,parent);
    for(let i=0;i<13;i++){const a=Math.PI*1.17-i/12*Math.PI*1.34;box(x+Math.cos(a)*(r-.01),Math.sin(a)*(r-.01),.049,.003,i%3===0?.014:.007,.002,dialMat,0,0,a-Math.PI/2,parent);}
    const pivot=new THREE.Group();pivot.position.set(x,0,.055);pivot.name='car-gauge-pointer';parent.add(pivot);box(0,r*.31,0,.004,r*.68,.002,needleMat,0,0,0,pivot);cylinder(0,0,.002,.008,.004,chrome,Math.PI/2,0,pivot);return pivot;
  };
  const conditionNeedle=gauge(-.079,.058),speedNeedle=gauge(.079,.058);
  const warnMat=new THREE.MeshBasicMaterial({color:0xff5522});warnMat.name='car-warning';extraMaterials.push(warnMat);
  const warning=new THREE.Mesh(new THREE.CircleGeometry(.009,16),warnMat);warning.position.set(.176,.037,.061);instruments.add(warning);geometries.push(warning.geometry);warning.visible=false;
  const steer=new THREE.Group();steer.name='car-steering-wheel';steer.position.set(-.31,1.253,-.81);steer.rotation.x=-.28;root.add(steer);
  collect(new THREE.TorusGeometry(.173,.014,12,48),rubber,0,0,0,0,0,0,steer);
  for(const a of [-.14,Math.PI+.14,-Math.PI/2])tube([[Math.cos(a)*.035,Math.sin(a)*.035,.01],[Math.cos(a)*.16,Math.sin(a)*.16,0]],.012,chrome,steer);
  cylinder(0,0,.012,.038,.025,leather,Math.PI/2,0,steer);
  // A softly lit analog radio. T moves a real needle over this five-band scale.
  const radio=new THREE.Group();radio.name='car-radio';radio.position.set(.135,1.165,-.904);root.add(radio);
  box(0,0,0,.29,.093,.028,dark,0,0,0,radio);box(0,.004,.018,.208,.041,.005,warm,0,0,0,radio);
  for(let i=0;i<11;i++)box(-.094+i*.0188,.012,.023,.002,i%2===0?.02:.011,.002,dark,0,0,0,radio);
  for(const x of [-.17,.17])cylinder(x,0,.015,.02,.025,chrome,Math.PI/2,0,radio);
  const radioNeedle=new THREE.Group();radioNeedle.name='car-radio-pointer';radioNeedle.position.set(0,0,.026);radio.add(radioNeedle);box(0,.004,0,.004,.031,.003,needleMat,0,0,0,radioNeedle);
  // Open-centred tyres expose the dished rim. Old solid cylinders hid every hub.
  const wheelParts=[];
  const wp=(g,color,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);const c=new THREE.Color(color),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=c.r;a[i+1]=c.g;a[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));wheelParts.push(g);};
  const tyre=new THREE.TorusGeometry(.302,.098,16,56);tyre.scale(1,1,1.29);wp(tyre,0x111719,0,0,0,0,Math.PI/2);
  for(const side of [-1,1]){
    wp(new THREE.TorusGeometry(.254,.016,8,40),0x8f9b94,side*.106,0,0,0,Math.PI/2);
    wp(new THREE.CylinderGeometry(.101,.106,.037,24),0xa2aaa1,side*.117,0,0,0,0,Math.PI/2);
    wp(new THREE.CylinderGeometry(.239,.239,.012,32),0x202725,side*.067,0,0,0,0,Math.PI/2);
    for(let n=0;n<8;n++){const a=n/8*Math.PI*2;wp(rounded(.024,.148,.055,.008),0x84958d,side*.099,Math.sin(a)*.170,Math.cos(a)*.170,a);}
    for(let n=0;n<5;n++){const a=n/5*Math.PI*2;wp(new THREE.CylinderGeometry(.012,.012,.018,6),0xc5c2ae,side*.144,Math.sin(a)*.07,Math.cos(a)*.07,0,0,Math.PI/2);}
  }
  for(let n=0;n<48;n++){const a=n/48*Math.PI*2;for(const side of [-1,1])wp(rounded(.099,.017,.031,.003),0x151c1b,side*.048,Math.sin(a)*.397,Math.cos(a)*.397,-a,side*.28);}
  const flat=wheelParts.map(g=>g.toNonIndexed()),wheelGeo=mergeGeometries(flat,false);wheelParts.forEach(g=>g.dispose());flat.forEach(g=>g.dispose());geometries.push(wheelGeo);
  const wheelMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.70,metalness:.20});wheelMat.name='car-tyres-and-dished-rims';extraMaterials.push(wheelMat);
  const wheels=new THREE.InstancedMesh(wheelGeo,wheelMat,4);wheels.name='car-wheels';wheels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);wheels.castShadow=true;wheels.receiveShadow=true;root.add(wheels);
  flush();
  const fittings=buildCarFittings({root,box,cylinder,tube,sphere,collect,flush,surfaces,extraMaterials,geometries});
  let repaired=false,headLevel=0;
  const setRepaired=on=>{repaired=!!on;deadMat.emissiveIntensity=repaired?headLevel*1.6:0;};
  return{
    root,wheels,steer,lampGood:lamps[0],lampDead:lamps[1],radio:radioNeedle,doorGroup:door,
    roofY,door:doorAt,hinge,openMax,lampOffsets,materials:[...surfaces.materials,...extraMaterials],
    get tris(){let n=0;root.traverse(o=>{if(o.isMesh){const g=o.geometry;n+=(g.index?g.index.count:g.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});return Math.round(n);},
    setLamp(head,tail,cake=0){headLevel=head;headMat.emissiveIntensity=head*1.6;headMat.color.setHex(cake>.5?0x827047:0xb6c8be);deadMat.emissiveIntensity=repaired?head*1.6:0;tailMat.emissiveIntensity=tail?.65:0;},
    setRepaired,
    setCabinView(inside){glass.opacity=inside?.018:.19;},
    setRadioDial(t){radioNeedle.position.x=(clamp(t)*2-1)*.095;},
    setCondition(t,time=0){conditionNeedle.rotation.z=(1.17-1.34*clamp(t))*Math.PI-Math.PI/2;warning.visible=t<.45;warnMat.color.setHex(t<.2?0xff381e:0xe69b2c);warning.scale.setScalar(t<.2?.8+Math.sin(time*8.5)*.2:1);},
    setMotion(speed,boost,boosting,time){speedNeedle.rotation.z=(1.17-1.34*clamp(Math.abs(speed)/42))*Math.PI-Math.PI/2;fittings.animate(boost,boosting,time);},
    setUpgrades(ids){fittings.setOwned(ids);surfaces.restored(ids.includes('kept'));if(ids.includes('kept'))setRepaired(true);},
    setDoor(t){door.rotation.y=-clamp(t)*openMax;},
    setCabin(level){warm.emissiveIntensity=.12+clamp(level)*.60;},
    dispose(){geometries.forEach(g=>g.dispose());extraMaterials.forEach(m=>m.dispose());surfaces.dispose();root.removeFromParent();},
  };
}
