// Human anatomy from CC0 MakeHuman graphical assets; clothing and rig authored for WWPM.
// Local forward is -Z, matching the enemy controller. No emissive eyes or reveal dimming.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HEADS, HEAD_INDEX } from './human-head-data.js';
import { readableSurface } from './surface-light.js';
import { loft, tendon, characterMaps } from './character-sculpt.js';

const cache = new Map();
const SKIN=[[.43,.285,.205],[.19,.102,.061],[.39,.253,.177],[.46,.303,.227]];
const COATS=[[.065,.082,.079],[.094,.073,.055],[.08,.094,.115],[.12,.106,.085]];
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
    const sockets=Math.exp(-Math.pow((Math.abs(x)-.032)/.025,2)-Math.pow((y-1.683)/.015,2))*front;
    const stubble=v<2?Math.exp(-Math.pow((y-1.647)/.030,2))*front*.18:0;
    const m=1-.23*sockets-stubble+.018*Math.sin(x*920+y*617+z*134);
    const hairLine=z>-.015?1.695:1.749;
    const hair=Math.max(0,Math.min(1,(y-hairLine)/.012));
    const hc=v<2?[.07,.064,.054]:[.019,.015,.012];
    color.push(skin[0]*m*(1+cheeks*.14)*(1-hair)+hc[0]*hair,skin[1]*m*(1-cheeks*.08)*(1-hair)+hc[1]*hair,skin[2]*m*(1-hair)+hc[2]*hair);
    uv.push(x*10,y*10);p[i+1]-=1.50;
  }
  g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(color,3));
  const neckCut=[];
  for(let i=0;i<HEAD_INDEX.length;i+=3){const ids=HEAD_INDEX.slice(i,i+3);if(ids.every(j=>p[j*3+1]>.09))neckCut.push(...ids);}
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(neckCut);g.computeVertexNormals();g.computeBoundingSphere();cache.set(key,g);return g;
}
function clothing(style,v){
  const key=style+v;if(cache.has(key))return cache.get(key);
  const torso=[],upper=[],fore=[],thigh=[],shin=[],headwear=[],eyes=[],neck=[],hands=[],boots=[];
  const c=style==='dealer'?[.053,.069,.063]:style==='sentry'||style==='marshal'||style==='dogcaller'?[.048,.059,.054]:COATS[v];
  const armored=style==='marshal'||style==='dealer';
  garment(torso,[[.68,.205,.133],[.74,.214,.14],[.84,.207,.14],[.94,.184,.124],[1.06,.185,.127],
    [1.22,.212,.141,-.004],[1.34,.234,.133],[1.405,.225,.114],[1.45,.155,.079],[1.465,.065,.056]],c,v,'coat');
  // Open lapels, layered collar, working pockets and buttons have actual thickness.
  for(const side of [-1,1]){
    const lapel=new THREE.Shape();
    const points=[[.047,1.470],[.133,1.402],[.090,1.350],[.059,1.248],[.019,1.386]];
    points.forEach(([x,y],i)=>i?lapel.lineTo(side*x,y):lapel.moveTo(side*x,y));lapel.closePath();
    const fold=new THREE.ExtrudeGeometry(lapel,{depth:.008,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:2,steps:1});
    fold.translate(0,0,-.143);torso.push(tint(fold,[c[0]*1.05,c[1]*1.05,c[2]*1.04]));
    box(torso,side*.135,1.04,-.137,.117,.14,.022,c,side*.05);
    box(torso,side*.135,1.10,-.151,.12,.015,.025,c.map(n=>n*.70));
    box(torso,side*.155,.79,-.145,.012,.13,.008,seam,side*.08);
  }
  for(let i=0;i<4;i++)oval(torso,0,1.26-i*.098,-.145,.007,.007,.004,[.21,.19,.14]);
  // Jacket closure and back yoke are seams in the garment, visible at conversational distance.
  const seamColour=c.map(n=>n*.60);
  const stitch=(pts,r=.0018)=>{torso.push(tint(tendon(pts,r,r,18,5),seamColour));};
  stitch([[.012,.71,-.144],[.009,.95,-.129],[.006,1.16,-.143],[.006,1.38,-.116]]);
  stitch([[-.18,1.31,.088],[0,1.30,.141],[.18,1.31,.088]]);
  for(const side of [-1,1]){
    stitch([[side*.20,.74,.005],[side*.195,1.0,.007],[side*.22,1.30,.025]]);
    box(torso,side*.128,1.31,-.15,.011,.019,.01,[.25,.23,.18]);
  }
  garment(torso,[[1.435,.083,.076,-.010],[1.455,.075,.066,-.015],[1.477,.060,.054,-.018]],[.092,.087,.076]);
  garment(neck,[[.028,.045,.045,-.010],[.055,.054,.051,-.010],[.105,.049,.043,-.012],[.132,.030,.030,-.020]],SKIN[v]);
  if(armored){
    garment(torso,[[1.00,.198,.15],[1.08,.204,.166],[1.31,.226,.167],[1.37,.21,.139]],[.063,.071,.068]);
    for(const x of [-.145,0,.145]){box(torso,x,1.11,-.18,.115,.18,.065,leather);box(torso,x,1.205,-.183,.118,.025,.07,c);}
    box(torso,0,1.30,-.174,.32,.027,.02,[.09,.098,.093]);
  }
  if(style==='cashier')box(torso,-.118,1.32,-.158,.042,.067,.01,[.42,.30,.09]);
  garment(upper,[[.050,.002,.002],[.037,.047,.052],[.015,.075,.076],[-.018,.086,.083],[-.09,.086,.080],[-.24,.071,.071],[-.31,.068,.069]],c,v,'sleeve');
  garment(fore,[[.024,.074,.074],[-.025,.079,.081],[-.15,.061,.063],[-.235,.052,.055],[-.27,.051,.052]],c,v+1,'cuff');
  garment(fore,[[-.238,.054,.058],[-.273,.054,.057]],seam);
  const skin=SKIN[v];
  garment(hands,[[-.257,.034,.026],[-.282,.038,.026],[-.315,.040,.023],[-.343,.034,.023]],skin,v);
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.017,y=-.341+Math.abs(i-1.5)*.003, length=.065-Math.abs(i-1.5)*.010;
    hands.push(tint(tendon([[x,y,-.002],[x,y-length*.45,-.010],[x,y-length*.86,-.025],[x,y-length,-.026]],.0092,.0065,12,8),skin));
  }
  hands.push(tint(tendon([[.032,-.298,0],[.049,-.315,-.01],[.045,-.341,-.026]],.013,.008,12,8),skin));
  garment(thigh,[[.035,.105,.119],[0,.111,.123],[-.12,.100,.105],[-.30,.081,.082],[-.41,.081,.082]],seam,v,'trouser');
  garment(shin,[[.025,.081,.083],[-.025,.084,.084],[-.13,.076,.08],[-.30,.065,.072],[-.37,.066,.071]],seam,v+1,'trouser');
  oval(boots,0,-.375,-.055,.077,.065,.143,leather);
  garment(boots,[[-.310,.073,.078],[-.355,.076,.095,-.026],[-.412,.080,.142,-.05]],leather);
  box(boots,0,-.420,-.052,.158,.025,.285,[.018,.020,.021]);
  for(let i=0;i<4;i++)box(boots,0,-.328-i*.016,-.107-i*.008,.069,.005,.008,[.084,.075,.060],i%2?.09:-.09);
  for(const [x,y,z] of HEADS[v].eyes){
    oval(eyes,x*1.1,y-1.5,z,.0121,.0106,.0121,[.43,.405,.355]);
    oval(eyes,x*1.1,y-1.5,z-.0114,.0054,.0057,.0019,[.053+v*.009,.061,.036]);
    oval(eyes,x*1.1,y-1.5,z-.0128,.0027,.0034,.001,[.007,.008,.007]);
  }
  // Close-cropped hair is colored into the scalp, avoiding a faceted helmet edge.
  if(style==='sentry'||style==='cashier'){
    oval(headwear,0,.272,.003,.106,.037,.102,c);
    oval(headwear,0,.247,-.090,.106,.008,.068,c);
  }
  // Brows follow each anatomical eye instead of a generic strip across the forehead.
  for(const [x,y,z] of HEADS[v].eyes){
    const s=x<0?-1:1;
    headwear.push(tint(tendon([[x*1.1-s*.014,y-1.5+.017,z-.006],[x*1.1,y-1.5+.021,z-.007],[x*1.1+s*.018,y-1.5+.014,z+.001]],.0026,.0014,14,6),[.027,.021,.016]));
  }
  const set={torso:finish(torso),upper:finish(upper),fore:finish(fore),thigh:finish(thigh),shin:finish(shin),headwear:finish(headwear),eyes:finish(eyes),neck:finish(neck),hands:finish(hands),boots:finish(boots)};
  cache.set(key,set);return set;
}

export function buildHuman(style='resident',variant=0,height=1.80){
  const v=((variant%4)+4)%4,geo=clothing(style,v),group=new THREE.Group();group.name='human:'+style;
  const cloth=new THREE.MeshStandardMaterial({vertexColors:true,...characterMaps('cloth'),bumpScale:.0015,roughness:1,metalness:0});
  const skin=new THREE.MeshStandardMaterial({vertexColors:true,...characterMaps('skin'),bumpScale:.00055,roughness:1,metalness:0});
  const hide=new THREE.MeshStandardMaterial({vertexColors:true,...characterMaps('leather'),bumpScale:.0015,roughness:1,metalness:0});
  const eye=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.26,clearcoat:.65,clearcoatRoughness:.14});
  skin.name='human-skin';cloth.name='human-clothing';hide.name='human-boot-leather';eye.name='human-eyes';
  for(const m of [cloth,skin,hide,eye])readableSurface(m);
  const model=new THREE.Group();model.scale.setScalar(height/1.80);group.add(model);
  const mesh=(g,mat,parent=model)=>{if(!g)return null;const m=new THREE.Mesh(g,mat);m.userData.sharedHuman=true;m.castShadow=mat===cloth;m.receiveShadow=false;parent.add(m);return m;};
  const torso=mesh(geo.torso,cloth),head=new THREE.Group();head.position.y=1.43;head.scale.set(1.045,1.04,1.03);model.add(head);
  mesh(headGeometry(v),skin,head);mesh(geo.headwear,cloth,head);const eyes=mesh(geo.eyes,eye,head);
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
    pivot.position.set(side*.205,1.405,0);model.add(pivot);mesh(geo.upper,cloth,pivot);elbow.position.y=-.29;pivot.add(elbow);mesh(geo.fore,cloth,elbow);
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
      head.position.y=1.43+settle*.45;head.rotation.y=Math.sin(clock*.21)*.055*(1-aim)+torso.rotation.y*.35;
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
