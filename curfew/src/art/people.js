// Human anatomy from CC0 MakeHuman graphical assets; clothing and rig authored for WWPM.
// Local forward is -Z, matching the enemy controller. No emissive eyes or reveal dimming.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HEADS, HEAD_INDEX } from './human-head-data.js';
import { readableSurface } from './surface-light.js';
import { loft, tendon, characterMaps } from './character-sculpt.js';

const cache = new Map();
const SKIN=[[.43,.285,.205],[.19,.102,.061],[.39,.253,.177],[.46,.303,.227]];
const COATS=[[.105,.139,.132],[.165,.113,.079],[.093,.127,.181],[.178,.158,.123]];
const SCARVES=[[.215,.075,.054],[.119,.151,.112],[.236,.169,.082],[.086,.108,.173]];
const HAIR=[[.097,.084,.067],[.022,.017,.013],[.038,.027,.020],[.080,.043,.021]];
const leather=[.031,.027,.024], seam=[.025,.029,.029];
function tint(g,c){
  const p=g.attributes.position, color=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++)color.set(c,i*3);
  g.setAttribute('color',new THREE.BufferAttribute(color,3));return g;
}
function finish(parts){
  if(!parts.length)return null;
  const flat=parts.map(g=>g.index?g.toNonIndexed():g);
  const g=mergeGeometries(flat,false);parts.forEach(p=>p.dispose());
  flat.forEach(p=>{if(!parts.includes(p))p.dispose();});g.computeBoundingSphere();return g;
}
function oval(parts,x,y,z,rx,ry,rz,c){
  const g=new THREE.SphereGeometry(1,16,10);g.scale(rx,ry,rz);g.translate(x,y,z);parts.push(tint(g,c));
}
function box(parts,x,y,z,w,h,d,c,rz=0){
  const b=Math.min(w,h,d)*.22,shape=new THREE.Shape();
  shape.moveTo(-w/2+b,-h/2+b);shape.lineTo(w/2-b,-h/2+b);shape.lineTo(w/2-b,h/2-b);shape.lineTo(-w/2+b,h/2-b);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:d-2*b,steps:1,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:3,curveSegments:1});
  g.translate(0,0,-d/2+b);g.rotateZ(rz);g.translate(x,y,z);parts.push(tint(g,c));
}
// Elliptical garment cross sections: shoulders, waist, hem and compression folds.
// Unlike stacked primitives this is a continuous sewn silhouette with irregular folds.
function garment(parts,rings,c,seed=0,cut='plain'){
  const g=loft(rings.map(([y,rx,rz,cz=0])=>[y,rx,rz,0,cz]),{segments:32,subdivisions:cut==='plain'?3:5,folds:.025,seed});
  tint(g,c);
  const p=g.attributes.position,colors=g.attributes.color;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const a=Math.atan2(x,z),front=Math.max(0,-Math.cos(a));
    const bell=(n,centre,width)=>Math.exp(-Math.pow((n-centre)/width,2));
    let relief=0;
    if(cut==='coat'){
      // Cloth bunches beneath the arms, pulls diagonally into the pockets and
      // gathers above the hem. Broad relief remains readable at two metres.
      relief+=Math.sin(y*55+a*3)*.010*bell(y,1.22,.13)*(1-front*.65);
      relief+=front*.008*(bell(y,1.08-Math.abs(x)*.65,.022)-bell(y,1.11-Math.abs(x)*.65,.020));
      relief+=front*.007*(bell(y,.82+Math.abs(x)*.44,.023)-bell(y,.86+Math.abs(x)*.44,.028));
      relief+=Math.sin(a*9+seed)*.010*bell(y,.73,.085);
      relief-=.006*bell(y,1.30,.026)*(1-front);
    }else if(cut==='sleeve'){
      relief+=Math.sin(y*82+a*1.8+seed)*.0075*bell(y,-.245,.075);
      relief+=Math.sin(y*48-a*2)*.005*bell(y,-.065,.09);
    }else if(cut==='cuff'){
      relief+=Math.sin(y*96+a*1.5+seed)*.006*bell(y,-.073,.09);
      relief+=Math.sin(y*64-a*2)*.004*bell(y,-.218,.055);
    }else if(cut==='trouser'){
      relief+=Math.sin(y*75+a*2+seed)*.0075*bell(y,-.34,.08);
      relief+=front*.005*bell(x,0,.015);
    }
    const radius=Math.hypot(x,z)||1;
    p.setXYZ(i,x+x/radius*relief,y,z+z/radius*relief);
    const wear=.93+.05*Math.sin(y*19+x*7)+.025*Math.sin(x*73+z*31)+Math.max(-.10,relief*5);
    colors.setXYZ(i,c[0]*wear,c[1]*wear,c[2]*wear);
  }
  g.computeVertexNormals();g.computeBoundingSphere();
  parts.push(g);
}
function headGeometry(v){
  const key='head'+v;if(cache.has(key))return cache.get(key);
  const data=HEADS[v],g=new THREE.BufferGeometry(),p=new Float32Array(data.positions);
  const color=[],uv=[],skin=SKIN[v];
  for(let i=0;i<p.length;i+=3){
    const x=p[i]*1.10,y=p[i+1],z=p[i+2];p[i]=x;
    const front=Math.max(0,Math.min(1,(-z-.065)/.06));
    const cheeks=Math.exp(-Math.pow((Math.abs(x)-.046)/.025,2)-Math.pow((y-1.665)/.03,2))*front;
    const sockets=Math.exp(-Math.pow((Math.abs(x)-.032)/.020,2)-Math.pow((y-1.688)/.014,2))*front;
    const stubble=v<2?Math.exp(-Math.pow((y-1.632)/.022,2))*front*.10:0;
    const lips=Math.exp(-Math.pow(x/.022,4)-Math.pow((y-[1.631,1.632,1.632,1.636][v])/.0042,2))*front;
    const m=1-.11*sockets-stubble+.010*Math.sin(x*920+y*617+z*134);
    const hairLine=z>-.015?1.713:1.772;
    const hair=Math.max(0,Math.min(1,(y-hairLine)/.012));
    const hc=v<2?[.07,.064,.054]:[.019,.015,.012];
    color.push(skin[0]*m*(1+cheeks*.10+lips*.08)*(1-hair)+hc[0]*hair,skin[1]*m*(1-cheeks*.055-lips*.18)*(1-hair)+hc[1]*hair,skin[2]*m*(1-lips*.11)*(1-hair)+hc[2]*hair);
    uv.push(x*10,y*10);p[i+1]-=1.50;
  }
  g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(color,3));
  const neckCut=[];
  for(let i=0;i<HEAD_INDEX.length;i+=3){const ids=HEAD_INDEX.slice(i,i+3);if(ids.every(j=>p[j*3+1]>.09))neckCut.push(...ids);}
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(neckCut);g.computeVertexNormals();g.computeBoundingSphere();cache.set(key,g);return g;
}
function hairGeometry(v,wardrobe){
  // Follow the licensed anatomical scalp itself. This retains temples, a parting
  // and the irregular hairline instead of placing a sphere over the skull.
  const source=HEADS[v].positions,positions=new Float32Array(source.length),colors=[],uv=[],indices=[];
  const hc=HAIR[v].map(n=>n*(wardrobe===1?1.30:1)),inside=[];
  for(let i=0;i<source.length;i+=3){
    const x=source[i],y=source[i+1],z=source[i+2],a=Math.atan2(x,z+.027);
    let line=z>-.012?1.687:z>-.075?1.707:1.740;
    if(v===0&&z<-.073)line+=.018+Math.abs(x)*.16;
    if(v>=2&&z<-.074)line+=Math.sin(x*48+wardrobe)*.007;
    inside.push(y>line);
    const wave=.0015*Math.sin(a*17+y*93)+.0007*Math.sin(a*39-y*112);
    positions[i]=x*1.10*(1.035+wave*6);
    positions[i+1]=y-1.50+.0025+Math.max(0,y-1.73)*.025;
    positions[i+2]=-.027+(z+.027)*(1.040+wave*7);
    const strand=1+.11*Math.sin(a*72+y*105)+.06*Math.sin(a*133-y*57);
    colors.push(hc[0]*strand,hc[1]*strand,hc[2]*strand);uv.push(a/Math.PI*.5+.5,y*5);
  }
  for(let i=0;i<HEAD_INDEX.length;i+=3){const a=HEAD_INDEX[i],b=HEAD_INDEX[i+1],c=HEAD_INDEX[i+2];if(inside[a]&&inside[b]&&inside[c])indices.push(a,b,c);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function clothing(style,variant){
  const key=style+variant;if(cache.has(key))return cache.get(key);
  const v=variant%4,wardrobe=Math.floor(variant/4)%3,civilian=style==='resident'||style==='cashier';
  const torso=[],upper=[],fore=[],thigh=[],shin=[],headwear=[],hair=[],eyes=[],neck=[],hands=[],boots=[];
  const c=style==='dealer'?[.065,.088,.078]:civilian?COATS[v].map(n=>n*(wardrobe===1?.88:1)):[.067,.080,.067];
  const armored=style==='marshal'||style==='dealer',scarf=SCARVES[(v+wardrobe)%4];
  const shoulder=[.186,.194,.176,.181][v],waist=[.155,.173,.146,.154][v];
  // A sloping shoulder seam, fitted waist and flared hem give the coat its cut.
  // The sleeve cap stays below the neck instead of forming a spherical shoulder.
  const hem=civilian&&wardrobe===1?.61:.75;
  garment(torso,[[hem,.194,.121],[hem+.065,.198,.127],[.89,.184,.125],[1.01,waist,.110],
    [1.15,waist+.012,.117,-.004],[1.30,shoulder-.002,.121],[1.368,shoulder+.008,.103],
    [1.408,shoulder-.022,.082],[1.447,.111,.065],[1.462,.055,.049]],c,variant,'coat');
  // Open lapels, layered collar, working pockets and buttons have actual thickness.
  for(const side of [-1,1]){
    const lapel=new THREE.Shape();
    const points=[[.044,1.457],[.099,1.405],[.075,1.369],[.046,1.279],[.014,1.393]];
    points.forEach(([x,y],i)=>i?lapel.lineTo(side*x,y):lapel.moveTo(side*x,y));lapel.closePath();
    const fold=new THREE.ExtrudeGeometry(lapel,{depth:.008,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:2,steps:1});
    const fp=fold.attributes.position;
    for(let i=0;i<fp.count;i++){const t=Math.max(0,Math.min(1,(1.455-fp.getY(i))/.115));fp.setZ(i,fp.getZ(i)-.065-.053*t);}
    fold.computeVertexNormals();if(wardrobe!==2||!civilian)torso.push(tint(fold,c.map(n=>n*1.22)));else fold.dispose();
    box(torso,side*.112,1.005,-.108,.088,.115,.016,c,side*.11);
    box(torso,side*.112,1.057,-.119,.09,.014,.020,c.map(n=>n*.68));
    box(torso,side*.146,hem+.075,-.119,.009,.10,.006,seam,side*.08);
  }
  for(let i=0;i<4;i++)oval(torso,.005,1.255-i*.102,-.122,.0055,.0055,.003,[.24,.215,.16]);
  // Jacket closure and back yoke are seams in the garment, visible at conversational distance.
  const seamColour=c.map(n=>n*.60);
  const stitch=(pts,r=.0018)=>{torso.push(tint(tendon(pts,r,r,18,5),seamColour));};
  stitch([[.012,hem+.025,-.129],[.009,.95,-.117],[.006,1.16,-.125],[.006,1.38,-.097]]);
  stitch([[-.155,1.31,.066],[0,1.30,.124],[.155,1.31,.066]]);
  for(const side of [-1,1]){
    stitch([[side*.190,hem+.03,.005],[side*waist,1.0,.007],[side*shoulder,1.30,.025]]);
    if(!civilian)box(torso,side*.116,1.31,-.117,.009,.016,.008,[.25,.23,.18]);
  }
  garment(torso,[[1.432,.067,.059,-.010],[1.457,.066,.057,-.015],[1.478,.051,.046,-.018]],[.16,.148,.124]);
  garment(neck,[[.002,.038,.038,-.010],[.044,.043,.039,-.011],[.094,.044,.036,-.014],[.126,.030,.029,-.023]],SKIN[v]);
  if(civilian){
    // A woven scarf and individually sewn workwear break the identical uniform.
    garment(torso,[[1.420,.071,.064,-.011],[1.449,.078,.065,-.016],[1.485,.067,.056,-.015],[1.507,.051,.045,-.016]],scarf,variant,'plain');
    const wrap=new THREE.Shape();
    for(const [i,[x,y]] of [[-.047,1.442],[.024,1.431],[.052,1.304],[.024,1.235],[-.026,1.278]].entries())i?wrap.lineTo(x,y):wrap.moveTo(x,y);
    wrap.closePath();const hanging=new THREE.ExtrudeGeometry(wrap,{depth:.008,steps:1,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:2});
    const hp=hanging.attributes.position;
    for(let i=0;i<hp.count;i++){const t=Math.max(0,Math.min(1,(1.440-hp.getY(i))/.12));hp.setZ(i,hp.getZ(i)-.082-.049*t+Math.sin(hp.getX(i)*90)*.002);}
    hanging.computeVertexNormals();torso.push(tint(hanging,scarf.map(n=>n*.85)));
    if(wardrobe===1){
      // A broad shoulder shawl tapers over the coat rather than inflating the arms.
      garment(torso,[[1.19,shoulder+.012,.131],[1.30,shoulder+.02,.132],[1.384,shoulder-.002,.111],[1.435,.093,.075]],c.map(n=>n*1.48),variant,'coat');
      for(let i=0;i<9;i++)torso.push(tint(tendon([[(i-4)*.034,1.20,-.116],[(i-4)*.035,1.177,-.117],[(i-4)*.035+.003,1.163,-.112]],.0022,.0013,6,5),scarf));
    }else if(wardrobe===2||style==='cashier'){
      const apron=c.map((n,i)=>n*[1.27,1.16,.94][i]);
      box(torso,0,1.15,-.130,.183,.255,.015,apron);
      box(torso,0,.87,-.142,.267,.314,.014,apron);
      box(torso,.035,1.026,-.144,.111,.086,.010,apron.map(n=>n*.78));
      for(const side of [-1,1])box(torso,side*.068,1.338,-.119,.025,.215,.012,apron,side*-.15);
    }
  }
  if(armored){
    garment(torso,[[1.00,waist+.009,.128],[1.08,waist+.025,.141],[1.30,shoulder+.009,.145],[1.36,shoulder-.012,.115]],[.077,.084,.077]);
    for(const x of [-.115,0,.115]){box(torso,x,1.11,-.151,.09,.16,.044,leather);box(torso,x,1.192,-.154,.093,.020,.046,c);}
    box(torso,0,1.30,-.149,.27,.024,.016,[.11,.118,.108]);
  }
  if(style==='cashier')box(torso,-.096,1.30,-.137,.032,.047,.008,[.42,.30,.09]);
  garment(upper,[[.038,.008,.009],[.025,.033,.038],[.003,.055,.060],[-.045,.063,.061],[-.12,.060,.057],[-.25,.051,.050],[-.31,.048,.048]],c,variant,'sleeve');
  garment(fore,[[.023,.049,.049],[-.032,.052,.052],[-.115,.050,.049],[-.23,.040,.039],[-.27,.037,.037]],c,variant+1,'cuff');
  garment(fore,[[-.239,.040,.042],[-.273,.039,.040]],c.map(n=>n*.56));
  const skin=SKIN[v];
  garment(hands,[[-.257,.026,.021],[-.282,.031,.022],[-.315,.034,.021],[-.343,.030,.020]],skin,v);
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.015,y=-.339+Math.abs(i-1.5)*.004, length=.063-Math.abs(i-1.5)*.009;
    hands.push(tint(tendon([[x,y,-.002],[x,y-length*.45,-.010],[x,y-length*.86,-.025],[x,y-length,-.026]],.0074,.0054,12,8),skin));
    oval(hands,x,y-.004,.016,.008,.010,.002,skin.map(n=>n*1.07));
  }
  hands.push(tint(tendon([[.027,-.298,0],[.043,-.315,-.01],[.041,-.341,-.026]],.010,.007,12,8),skin));
  const trousers=civilian?[[.063,.065,.068],[.085,.075,.059],[.038,.052,.069],[.081,.076,.067]][v]:seam;
  garment(thigh,[[.035,.092,.101],[0,.098,.106],[-.12,.086,.095],[-.30,.069,.074],[-.41,.067,.070]],trousers,variant,'trouser');
  garment(shin,[[.025,.068,.071],[-.025,.071,.073],[-.13,.066,.074],[-.30,.054,.061],[-.37,.055,.060]],trousers,variant+1,'trouser');
  oval(boots,0,-.375,-.055,.077,.065,.143,leather);
  garment(boots,[[-.310,.073,.078],[-.355,.076,.095,-.026],[-.412,.080,.142,-.05]],leather);
  box(boots,0,-.420,-.052,.158,.025,.285,[.018,.020,.021]);
  for(let i=0;i<4;i++)box(boots,0,-.328-i*.016,-.107-i*.008,.069,.005,.008,[.084,.075,.060],i%2?.09:-.09);
  for(const [x,y,z] of HEADS[v].eyes){
    // The two older donor heads' joint centres sit inside their upper eyelids.
    // Correct the eyeball to the sculpted aperture; preserve the eyelid geometry.
    const ey=y-1.5-(v<2?.0048:0),ez=z-.002;
    oval(eyes,x*1.1,ey,ez,.0120,.0101,.0120,[.49,.464,.418]);
    oval(eyes,x*1.1,ey,ez-.0114,.0051,.0053,.0018,[.049+v*.010,.056,.035]);
    oval(eyes,x*1.1,ey,ez-.0128,.0025,.0030,.001,[.008,.009,.008]);
  }
  hair.push(hairGeometry(v,wardrobe));
  if(v>=2&&wardrobe!==2){
    // Hair follows the back of the head, with an asymmetric tied section.
    const hc=HAIR[v];oval(hair,v===2?.023:-.022,.174,.071,.045,.051,.037,hc);
    for(let i=0;i<8;i++)hair.push(tint(tendon([[Math.cos(i*.82)*.054,.223,-.005],[Math.cos(i*.82)*.062,.172,.040],[.018,.150,.080]],.0068,.0032,17,6),hc.map(n=>n*(.85+i*.045))));
  }
  if(style==='sentry'||style==='cashier'||(civilian&&v===0&&wardrobe===2)){
    garment(headwear,[[.213,.077,.084,-.018],[.240,.083,.087,-.019],[.273,.071,.073,-.024],[.299,.042,.045,-.024],[.306,.004,.004,-.024]],civilian?scarf:c,variant,'plain');
    garment(headwear,[[.215,.079,.086,-.018],[.236,.084,.089,-.019]],(civilian?scarf:c).map(n=>n*.72));
  }
  // Brows follow each anatomical eye instead of a generic strip across the forehead.
  for(const [x,y,z] of HEADS[v].eyes){
    const s=x<0?-1:1;
    const ey=y-1.5-(v<2?.0048:0);
    hair.push(tint(tendon([[x*1.1-s*.012,ey+.014,z-.019],[x*1.1,ey+.018,z-.018],[x*1.1+s*.015,ey+.012,z-.010]],.0020,.0011,14,6),HAIR[v].map(n=>n*.60)));
  }
  const set={shoulder,torso:finish(torso),upper:finish(upper),fore:finish(fore),thigh:finish(thigh),shin:finish(shin),headwear:finish(headwear),hair:finish(hair),eyes:finish(eyes),neck:finish(neck),hands:finish(hands),boots:finish(boots)};
  cache.set(key,set);return set;
}

export function buildHuman(style='resident',variant=0,height=1.80){
  variant=((Math.floor(variant)%12)+12)%12;
  const v=variant%4,geo=clothing(style,variant),group=new THREE.Group();group.name='human:'+style;
  group.userData.appearance=variant;
  const cloth=new THREE.MeshStandardMaterial({vertexColors:true,...characterMaps('cloth'),bumpScale:.0015,roughness:1,metalness:0});
  const skin=new THREE.MeshStandardMaterial({vertexColors:true,...characterMaps('skin'),roughnessMap:null,bumpScale:.00055,roughness:1,metalness:0});
  const hide=new THREE.MeshStandardMaterial({vertexColors:true,...characterMaps('leather'),bumpScale:.0015,roughness:1,metalness:0});
  const eye=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.26,clearcoat:.65,clearcoatRoughness:.14});
  skin.name='human-skin';cloth.name='human-clothing';hide.name='human-boot-leather';eye.name='human-eyes';
  for(const m of [cloth,skin,hide,eye])readableSurface(m);
  const model=new THREE.Group();model.scale.setScalar(height/1.80);group.add(model);
  const mesh=(g,mat,parent=model)=>{if(!g)return null;const m=new THREE.Mesh(g,mat);m.userData.sharedHuman=true;m.castShadow=mat===cloth;m.receiveShadow=false;parent.add(m);return m;};
  const torso=mesh(geo.torso,cloth),head=new THREE.Group();head.position.y=1.424;head.scale.set(1.10,1.10,1.08);model.add(head);
  mesh(headGeometry(v),skin,head);mesh(geo.headwear,cloth,head);mesh(geo.hair,skin,head);const eyes=mesh(geo.eyes,eye,head);
  mesh(geo.neck,skin,head);
  const owned=[];
  let gun=null;
  if(style==='sentry'||style==='dealer'||style==='dogcaller'){   // ROUND 22, lane C: the dog-caller carries the rifle his poacher brain fires
    gun=new THREE.Group();gun.position.set(.20,1.16,-.16);model.add(gun);
    const p=[];box(p,0,0,0,.065,.11,.26,[.07,.075,.071]);
    box(p,0,-.025,.19,.083,.13,.24,leather);box(p,0,-.115,-.01,.057,.17,.085,leather,.12);
    box(p,0,-.096,-.10,.049,.17,.105,[.057,.065,.061]);
    box(p,0,.047,-.28,.070,.038,.33,[.07,.078,.072]);
    const barrel=new THREE.CylinderGeometry(.016,.019,.57,14);barrel.rotateX(Math.PI/2);barrel.translate(0,.025,-.40);p.push(tint(barrel,[.11,.12,.11]));
    for(let i=0;i<8;i++)box(p,0,.024,-.13-i*.028,.077,.061,.012,[.041,.046,.044]);
    const gunGeo=finish(p);owned.push(gunGeo);mesh(gunGeo,cloth,gun);
  }
  const arms=[],legs=[];
  for(let i=0;i<2;i++){
    const side=i?1:-1,pivot=new THREE.Group(),elbow=new THREE.Group();
    pivot.position.set(side*geo.shoulder,1.382,0);model.add(pivot);mesh(geo.upper,cloth,pivot);elbow.position.y=-.29;pivot.add(elbow);mesh(geo.fore,cloth,elbow);
    const hand=mesh(geo.hands,skin,elbow);if(side<0)hand.scale.x=-1;arms.push({pivot,elbow});
    const hip=new THREE.Group(),knee=new THREE.Group();hip.position.set(side*.106,.855,.006);model.add(hip);mesh(geo.thigh,cloth,hip);knee.position.y=-.405;hip.add(knee);mesh(geo.shin,cloth,knee);mesh(geo.boots,hide,knee);legs.push({pivot:hip,knee});
  }
  const scale=height/1.80;
  const zones=[{x:0,y:1.62,z:-.04,r:.14,zone:'head'}];
  for(const y of [.86,1.03,1.20,1.37])zones.push({x:0,y,z:0,r:.225,zone:'torso'});
  for(const side of [-1,1]){
    for(const y of [.11,.27,.44,.60,.76])zones.push({x:side*.106,y,z:0,r:.13,zone:'limb'});
    for(const y of [.80,.94,1.10,1.25,1.40])zones.push({x:side*.25,y,z:0,r:.10,zone:'limb'});
  }
  zones.forEach(z=>{z.x*=scale;z.y*=scale;z.z*=scale;z.r*=scale;});
  let clock=variant*.91;
  let drawCount=0;group.traverse(n=>{if(n.isMesh)drawCount++;});
  const rig={group,gun,zones,scale:1,drawCount,gait:'walk',muzzle:{x:.22*scale,y:1.32*scale,z:-.58*scale},shellMat:cloth,eyeMat:skin,contactMat:cloth,
    reveal(){},telegraph(v){cloth.emissive.setRGB(v*.025,v*.032,v*.023);},deathGlow(){},
    animate(a={}){
      const move=a.moveAmp||0,phase=a.gait||0,aim=a.aim||0,limp=Math.max(0,Math.min(1,a.limp||0));
      if(Number.isFinite(a.time))clock=a.time+variant*.91;
      const settle=Math.sin(phase*2-.7)*.007*move,breath=Math.sin(clock*1.7)*.002;
      torso.scale.z=1+breath;torso.position.y=settle;torso.rotation.z=Math.sin(phase)*.013*move;
      torso.rotation.y=Math.sin(phase)*.026*move;
      head.position.y=1.424+settle*.45;head.rotation.y=Math.sin(clock*.21)*.055*(1-aim)+torso.rotation.y*.35;
      head.rotation.x=-.028+breath*.5+limp*.36;head.rotation.z=Math.sin(clock*.38)*.010+torso.rotation.z*.3;
      const blinkPhase=(clock+v*.83)%4.7;
      if(eyes)eyes.visible=!(blinkPhase>4.59&&blinkPhase<4.68);
      if(gun){gun.rotation.x=-.80*(1-aim);gun.position.y=1.16+settle;gun.rotation.z=Math.sin(phase)*.01*move;}
      for(let i=0;i<2;i++){
        const ph=phase+(i?Math.PI:0),s=i?1:-1;
        arms[i].pivot.rotation.x=(Math.sin(ph-.16)*.32*move+aim*.80-(a.coil||0)*.8+(a.swing||0)*1.2)*(1-limp)+limp*.24;
        arms[i].pivot.rotation.z=s*.04+(i?-.035:.62)*aim+s*limp*.20;
        arms[i].elbow.rotation.x=.12+aim*(i?.66:.47)+Math.max(0,Math.sin(ph))*.16*move-limp*.4;
        legs[i].pivot.rotation.x=-Math.sin(ph)*.43*move;
        legs[i].knee.rotation.x=-Math.max(0,Math.sin(ph-.35))*.64*move;
        legs[i].pivot.rotation.z=-s*.018+Math.sin(phase)*.012*move;
      }
    },
    dispose(){cloth.dispose();skin.dispose();hide.dispose();eye.dispose();owned.forEach(g=>g.dispose());}
  };rig.animate();return rig;
}
