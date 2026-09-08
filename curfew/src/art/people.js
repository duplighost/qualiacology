// Human anatomy from CC0 MakeHuman graphical assets; clothing and rig authored for WWPM.
// Local forward is -Z, matching the enemy controller. No emissive eyes or reveal dimming.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HEADS, HEAD_INDEX } from './human-head-data.js';
import { readableSurface } from './surface-light.js';

const cache = new Map();
let surface;
function fabric() {
  if (surface) return surface;
  const n=128, data=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const p=(y*n+x)*4, hash=Math.sin(x*91.17+y*173.3)*43758.54;
    const grain=hash-Math.floor(hash), weave=((x+y)%3===0?3:0);
    const v=230+Math.floor(grain*22)-weave;
    data[p]=data[p+1]=data[p+2]=v;data[p+3]=255;
  }
  surface=new THREE.DataTexture(data,n,n);surface.wrapS=surface.wrapT=THREE.RepeatWrapping;
  surface.magFilter=THREE.LinearFilter;surface.minFilter=THREE.LinearMipmapLinearFilter;
  surface.generateMipmaps=true;surface.needsUpdate=true;return surface;
}
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
function garment(parts,rings,c,seed=0){
  const p=[],uv=[],ix=[],N=24;
  rings.forEach(([y,rx,rz,cz=0],j)=>{
    for(let i=0;i<=N;i++){
      const a=i/N*Math.PI*2, fold=1+.023*Math.sin(a*7+j*.8+seed)+.016*Math.sin(a*11-j);
      p.push(Math.sin(a)*rx*fold,y,Math.cos(a)*rz*fold+cz);uv.push(i/N*2,y*4);
      if(j&&i<N){const b=j*(N+1)+i,t=b-(N+1);
        if(rings[j][0]>rings[j-1][0])ix.push(t,t+1,b,t+1,b+1,b);
        else ix.push(t,b,t+1,t+1,b,b+1);
      }
    }
  });
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();parts.push(tint(g,c));
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
    const stubble=v<2?Math.exp(-Math.pow((y-1.625)/.033,2))*front*.22:0;
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
  const torso=[],upper=[],fore=[],thigh=[],shin=[],headwear=[],eyes=[],neck=[];
  const c=style==='dealer'?[.053,.069,.063]:style==='sentry'||style==='marshal'?[.048,.059,.054]:COATS[v];
  const armored=style==='marshal'||style==='dealer';
  garment(torso,[[.68,.22,.14],[.74,.225,.147],[.84,.211,.145],[.94,.192,.132],[1.06,.186,.126],[1.22,.211,.141],[1.36,.233,.132],[1.42,.214,.116],[1.465,.166,.095],[1.49,.077,.078]],c,v);
  // Open lapels, layered collar, working pockets and buttons have actual thickness.
  for(const side of [-1,1]){
    box(torso,side*.10,1.315,-.137,.053,.27,.022,[c[0]*1.5,c[1]*1.5,c[2]*1.4],side*.33);
    box(torso,side*.135,1.04,-.137,.117,.14,.022,c,side*.05);
    box(torso,side*.135,1.10,-.151,.12,.028,.025,seam);
    box(torso,side*.155,.79,-.145,.012,.13,.008,seam,side*.08);
  }
  for(let i=0;i<4;i++)oval(torso,0,1.26-i*.098,-.145,.007,.007,.004,[.21,.19,.14]);
  garment(torso,[[1.435,.096,.089,-.010],[1.49,.083,.080,-.017],[1.525,.067,.071,-.02]],[.135,.12,.098]);
  oval(neck,0,.045,-.025,.052,.087,.056,SKIN[v]);
  if(armored){
    garment(torso,[[1.00,.198,.15],[1.08,.204,.166],[1.31,.226,.167],[1.37,.21,.139]],[.063,.071,.068]);
    for(const x of [-.145,0,.145]){box(torso,x,1.11,-.18,.115,.18,.065,leather);box(torso,x,1.205,-.183,.118,.025,.07,c);}
    box(torso,0,1.30,-.174,.32,.027,.02,[.09,.098,.093]);
  }
  if(style==='cashier')box(torso,-.118,1.32,-.158,.042,.067,.01,[.42,.30,.09]);
  garment(upper,[[.080,.002,.002],[.068,.05,.058],[.035,.082,.083],[0,.096,.09],[-.09,.088,.081],[-.24,.076,.074],[-.31,.072,.073]],c,v);
  garment(fore,[[.024,.074,.074],[-.025,.079,.081],[-.15,.061,.063],[-.235,.052,.055],[-.27,.051,.052]],c,v+1);
  garment(fore,[[-.238,.054,.058],[-.273,.054,.057]],seam);
  const skin=SKIN[v];oval(fore,0,-.311,-.008,.043,.062,.023,skin);
  for(let i=0;i<4;i++)oval(fore,(i-1.5)*.018,-.362+Math.abs(i-1.5)*.011,-.012,.010,.042,.012,skin);
  oval(fore,.048,-.307,-.012,.015,.033,.016,skin);
  garment(thigh,[[.035,.105,.119],[0,.111,.123],[-.12,.100,.105],[-.30,.081,.082],[-.41,.081,.082]],seam,v);
  garment(shin,[[.025,.081,.083],[-.025,.084,.084],[-.13,.076,.08],[-.30,.065,.072],[-.37,.066,.071]],seam,v+1);
  oval(shin,0,-.375,-.058,.079,.075,.15,leather);
  garment(shin,[[-.315,.075,.080],[-.36,.078,.096,-.025],[-.425,.079,.14,-.055]],leather);
  for(const [x,y,z] of HEADS[v].eyes){
    oval(eyes,x*1.1,y-1.5,z,.0125,.0118,.0125,[.36,.33,.27]);
    oval(eyes,x*1.1,y-1.5,z-.0114,.0059,.0062,.0019,[.04,.046,.034]);
    oval(eyes,x*1.1,y-1.5,z-.0128,.0027,.0034,.001,[.007,.008,.007]);
  }
  // Close-cropped hair is colored into the scalp, avoiding a faceted helmet edge.
  if(style==='sentry'||style==='cashier'){
    oval(headwear,0,.272,.003,.106,.037,.102,c);
    oval(headwear,0,.247,-.090,.106,.008,.068,c);
  }
  const set={torso:finish(torso),upper:finish(upper),fore:finish(fore),thigh:finish(thigh),shin:finish(shin),headwear:finish(headwear),eyes:finish(eyes),neck:finish(neck)};
  cache.set(key,set);return set;
}

export function buildHuman(style='resident',variant=0,height=1.80){
  const v=((variant%4)+4)%4,geo=clothing(style,v),group=new THREE.Group();group.name='human:'+style;
  const cloth=new THREE.MeshStandardMaterial({vertexColors:true,map:fabric(),bumpMap:fabric(),bumpScale:.004,roughness:.94,metalness:0});
  const skin=cloth.clone();skin.roughness=.71;skin.bumpScale=.0012;skin.name='human-skin';cloth.name='human-clothing';
  readableSurface(cloth);readableSurface(skin);
  const model=new THREE.Group();model.scale.setScalar(height/1.80);group.add(model);
  const mesh=(g,mat,parent=model)=>{if(!g)return null;const m=new THREE.Mesh(g,mat);m.userData.sharedHuman=true;m.castShadow=mat===cloth;m.receiveShadow=false;parent.add(m);return m;};
  const torso=mesh(geo.torso,cloth),head=new THREE.Group();head.position.y=1.50;model.add(head);
  mesh(headGeometry(v),skin,head);mesh(geo.headwear,cloth,head);mesh(geo.eyes,skin,head);
  mesh(geo.neck,skin,head);
  const owned=[];
  let gun=null;
  if(style==='sentry'||style==='dealer'){
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
    pivot.position.set(side*.205,1.405,0);model.add(pivot);mesh(geo.upper,cloth,pivot);elbow.position.y=-.29;pivot.add(elbow);mesh(geo.fore,skin,elbow);arms.push({pivot,elbow});
    const hip=new THREE.Group(),knee=new THREE.Group();hip.position.set(side*.106,.855,.006);model.add(hip);mesh(geo.thigh,cloth,hip);knee.position.y=-.405;hip.add(knee);mesh(geo.shin,cloth,knee);legs.push({pivot:hip,knee});
  }
  const scale=height/1.80;
  const zones=[{x:0,y:1.68,z:-.04,r:.13,zone:'head'}];
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
      const move=a.moveAmp||0,phase=a.gait||0,aim=a.aim||0;
      if(Number.isFinite(a.time))clock=a.time+variant*.91;
      torso.scale.y=1+Math.sin(clock*1.7)*.0019;head.rotation.y=Math.sin(clock*.21)*.035;head.rotation.z=Math.sin(clock*.38)*.013;
      if(gun)gun.rotation.x=-1.0*(1-aim);
      for(let i=0;i<2;i++){
        const ph=phase+(i?Math.PI:0),s=i?1:-1;
        arms[i].pivot.rotation.x=Math.sin(ph)*.38*move+aim*.80-(a.coil||0)*.8+(a.swing||0)*1.2;
        arms[i].pivot.rotation.z=s*(.035+Math.sin(clock*.6+i)*.008);
        arms[i].elbow.rotation.x=.15+aim*.66+Math.abs(Math.sin(ph))*.13*move;
        legs[i].pivot.rotation.x=-Math.sin(ph)*.46*move;
        legs[i].knee.rotation.x=-Math.max(0,Math.sin(ph-.6))*.62*move;
      }
    },
    dispose(){cloth.dispose();skin.dispose();owned.forEach(g=>g.dispose());}
  };rig.animate();return rig;
}
