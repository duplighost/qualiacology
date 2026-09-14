import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loft, wornPlate} from '../art/character-sculpt.js';
const TAU=Math.PI*2, UP=new THREE.Vector3(0,1,0);
const colors={flesh:0x54443d,bone:0x746f60,hide:0x202a2b,iron:0x333936,wood:0x42392d,wound:0x401d26,brass:0x6b5130,cloth:0x777365,coal:0x242624,pearl:0x9aafa0};
let surfaces=null,organicSurface=null,surfaceLoad=null;
function applyOrganicSurface(material,id){
 if(!organicSurface||!['flesh','hide'].includes(id))return;
 material.map=organicSurface.map;material.bumpMap=organicSurface.bump;
 material.bumpScale=id==='hide'?.16:.12;material.color.setHex(id==='hide'?0x424c47:0x70645c);material.needsUpdate=true;
}
// One original image, shared by every organic body. Preload before shader warmup;
// the procedural surfaces remain usable when the file or decoding is unavailable.
export function preloadBossSurface(){
 if(typeof document==='undefined')return Promise.resolve(false);
 if(!surfaceLoad)surfaceLoad=new THREE.TextureLoader().loadAsync(new URL('../../assets/materials/creature-hide-v2.png',import.meta.url).href).then(map=>{
  map.name='boss-creature-hide-v2';map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1,1);map.anisotropy=4;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;
  const bump=map.clone();bump.name='boss-creature-hide-v2-relief';bump.colorSpace=THREE.NoColorSpace;bump.needsUpdate=true;organicSurface={map,bump};
  if(surfaces)for(const id of['flesh','hide']){const m=surfaces[id];m.map.dispose();m.bumpMap.dispose();applyOrganicSurface(m,id);}return true;
 }).catch(()=>false);
 return surfaceLoad;
}
function texNoise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,s=t=>t*t*(3-2*t),h=(a,b)=>{let n=Math.imul(a+391,374761393)^Math.imul(b+717,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};const a=h(ix,iy),b=h(ix+1,iy),c=h(ix,iy+1),d=h(ix+1,iy+1),u=s(fx),v=s(fy);return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;}

function tissueSurface(kind){
 const size=192,pixels=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*TAU,v=y/size*TAU,n=texNoise(x*.29,y*.29)*2-1;
  const vein=Math.abs(Math.sin(v*2+Math.sin(u)*1.3+texNoise(x*.035,y*.035)*1.1));
  const grain=kind==='wood'?Math.sin(v*23+Math.sin(u)*.8)*.15:kind==='cloth'?Math.sin(x*2)*Math.sin(y*2)*.065:kind==='iron'||kind==='brass'?Math.sin(v*19)*.025:n*.045;
  const scar=kind==='flesh'||kind==='hide'?Math.pow(Math.max(0,1-vein*9),2)*.17:kind==='bone'?Math.pow(Math.max(0,1-vein*12),2)*.16:0;
  const tone=clampSurface(.87+grain-scar+n*.06),p=(y*size+x)*4,b=clampSurface(.52+n*.11+grain*.5-scar*.45);
  pixels[p]=Math.round(tone*255);pixels[p+1]=Math.round((tone-scar*.23)*255);pixels[p+2]=Math.round((tone-scar*.2)*255);pixels[p+3]=255;
  height[p]=height[p+1]=height[p+2]=Math.round(b*255);height[p+3]=255;
 }
 const map=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat),bump=new THREE.DataTexture(height,size,size,THREE.RGBAFormat);
 for(const t of [map,bump]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.repeat.set(kind==='wood'?3:2,2);t.needsUpdate=true;}map.colorSpace=THREE.SRGBColorSpace;
 return {map,bump};
}
const clampSurface=v=>Math.max(.06,Math.min(1,v));
function materials(){
 if(surfaces)return surfaces;
 surfaces={};for(const [id,color] of Object.entries(colors)){
  const tex=organicSurface&&['flesh','hide'].includes(id)?organicSurface:tissueSurface(id),metal=id==='iron'||id==='brass';
  // Dark organic surfaces stay diffuse under the carried lamp. Actual metal earns
  // a specular response; a shared plastic sheen erased every material difference.
  const base={color,vertexColors:true,map:tex.map,bumpMap:tex.bump,bumpScale:id==='wood'?.14:id==='cloth'?.065:.048,side:id==='cloth'?THREE.DoubleSide:THREE.FrontSide};
  const m=metal?new THREE.MeshStandardMaterial({...base,roughness:id==='brass'?.58:.78,metalness:.84}):new THREE.MeshLambertMaterial(base);m.name='boss-'+id;applyOrganicSurface(m,id);surfaces[id]=m;
 }return surfaces;
}
function mottled(g,seed=0,mat='flesh'){
 const p=g.attributes.position,a=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=Math.sin(x*9.3+seed)*Math.sin(y*13.7-z*5.9)*.12+Math.sin(y*2.8+x*3.2)*.09;const stain=mat==='bone'?.69+texNoise(x*1.3+z*.7+17,y*1.3+29)*.31:1,k=(.85+n)*stain;a.set([k,k*.96,k*.91],i*3);}
 g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;
}
class Sculpt {
 constructor(root){this.root=root;this.parts=new Map();}
 add(g,mat='flesh'){if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));mottled(g,this.parts.size,mat);let a=this.parts.get(mat);if(!a)this.parts.set(mat,a=[]);a.push(g);}
 oval(x,y,z,sx,sy,sz,mat='flesh',rot=0){const g=new THREE.SphereGeometry(1,16,12);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const xx=p.getX(i),yy=p.getY(i),zz=p.getZ(i),organic=['flesh','hide','bone'].includes(mat),f=1+(organic?.035:.02)*Math.sin(xx*19+yy*11)*Math.cos(zz*17)+(organic?.055:0)*Math.sin(xx*5.7+yy*3.9)*Math.cos(zz*6.1);p.setXYZ(i,xx*f,yy*f,zz*f);}g.computeVertexNormals();g.scale(sx,sy,sz);g.rotateZ(rot);g.translate(x,y,z);this.add(g,mat);
 }
 rod(points,r,mat='flesh',end=.18){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),steps=Math.max(12,points.length*5),radial=8,g=new THREE.TubeGeometry(curve,steps,r,radial,false),p=g.attributes.position;
  for(let i=0;i<=steps;i++){const t=i/steps,centre=curve.getPointAt(t),taper=(1-t*(1-end))*(1+.04*Math.sin(t*23));for(let j=0;j<=radial;j++){const n=i*(radial+1)+j,a=j/radial*TAU,organic=['flesh','hide','bone'].includes(mat),bundle=organic?1+.065*Math.sin(a*3+t*7)+.035*Math.sin(a*5-t*13):1,k=taper*bundle;p.setXYZ(n,centre.x+(p.getX(n)-centre.x)*k,centre.y+(p.getY(n)-centre.y)*k,centre.z+(p.getZ(n)-centre.z)*k);}}g.computeVertexNormals();this.add(g,mat);
 }
 torus(x,y,z,r,t,mat='bone',sx=1,sy=1){const g=new THREE.TorusGeometry(r,t,10,32);g.scale(sx,sy,1);g.translate(x,y,z);this.add(g,mat);}
 box(x,y,z,w,h,d,mat='iron'){const g=new THREE.BoxGeometry(w,h,d,3,3,3);g.translate(x,y,z);this.add(g,mat);}
 plate(x,y,z,w,h,d,mat='iron',rx=0,ry=0,rz=0){const g=wornPlate();g.scale(w,h,d);g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);this.add(g,mat);}
 ring(x,y,z,r,t,mat='iron',axis='y',sx=1,sy=1){const g=new THREE.TorusGeometry(r,t,8,40);g.scale(sx,sy,1);if(axis==='y')g.rotateX(Math.PI/2);if(axis==='x')g.rotateY(Math.PI/2);g.translate(x,y,z);this.add(g,mat);}
 lathe(profile,mat='iron',x=0,z=0){const g=new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),48);g.translate(x,0,z);this.add(g,mat);}
 loft(sections,mat='flesh',folds=.035){const g=loft(sections,{segments:24,subdivisions:3,folds});if(['flesh','hide'].includes(mat)){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*.5,uv.getY(i)/15);}this.add(g,mat);}
 cloth(points,width,mat='cloth',seed=0){
  // A torn, pleated surface, with a real silhouette and thickness-free folds.
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),v=[],uv=[],ix=[],rows=18,cols=10;
  for(let j=0;j<=rows;j++){const t=j/rows,c=curve.getPoint(t),w=width*(.36+.64*t);
   for(let i=0;i<=cols;i++){const u=i/cols*2-1,rag=j===rows?(Math.sin(i*2.3+seed)*.35+Math.sin(i*5.7)*.15):0;v.push(c.x+u*w,c.y+rag,c.z+Math.sin(u*13+seed)*(.10+.28*t)+Math.sin(t*11+u*3)*.08);uv.push(i/cols,t*3);if(j&&i<cols){const a=j*(cols+1)+i,b=a-cols-1;ix.push(a,b,a+1,b,b+1,a+1);}}
  }const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();this.add(g,mat);
 }
 teeth(x,y,z,r,count=18,mat='bone'){for(let i=0;i<count;i++){const a=i*TAU/count,xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r;this.rod([[xx,yy,z],[xx-Math.cos(a)*.22,yy-Math.sin(a)*.22,z+.35],[xx-Math.cos(a)*.54,yy-Math.sin(a)*.54,z+.42]],.15,mat,.01);}}
 flush(){for(const [id,list]of this.parts){const g=mergeGeometries(list,false);list.forEach(g=>g.dispose());const mesh=new THREE.Mesh(g,materials()[id]);mesh.receiveShadow=true;mesh.castShadow=false;this.root.add(mesh);}this.parts.clear();}
}

// Separate shoulder, forearm and hand pieces let the silhouette actually bear weight.
// Two bone placement below keeps fingertips on the ground during the planted half-step.
function crawlerArm(s,limbs,anchor,foot,side,index,size=1){
 const joint=new THREE.Group(),upper=new THREE.Group(),lower=new THREE.Group(),hand=new THREE.Group();
 const a=new Sculpt(upper),b=new Sculpt(lower),c=new Sculpt(hand);
 a.rod([[0,0,0],[.07,.35,.08],[0,1,0]],.38*size,'flesh',.65);
 a.oval(0,.35,0,.48*size,.31,.42*size,'flesh');
 for(const off of[-.16,.16])a.rod([[off,0,.27*size],[off*.8,.6,.25*size],[off,1,.12*size]],.065*size,'bone',.8);
 b.rod([[0,0,0],[-.07,.6,.03],[0,1,0]],.25*size,'flesh',.65);
 b.rod([[.18*size,.08,.12*size],[.19*size,.58,.1*size],[.12*size,.95,.09*size]],.09*size,'bone',.55);
 b.oval(0,.05,0,.36*size,.16,.33*size,'bone');
 c.oval(0,.19,.25,.66*size,.24*size,.9*size,'flesh');
 for(let j=0;j<5;j++){const x=(j-2)*.28*size,len=(j===0?.78:1.1-Math.abs(j-2)*.13)*size;
  c.rod([[x,.25,.65*size],[x*1.35,.2,1.15*size],[x*1.42,.1,1.35*size+len]],.14*size,'flesh',.4);
  c.oval(x*1.35,.19,1.2*size,.18*size,.16*size,.19*size,'bone');
  c.rod([[x*1.42,.1,1.35*size+len],[x*1.45,.17,1.64*size+len],[x*1.42,.04,1.91*size+len]],.12*size,'bone',.015);
 }
 a.flush();b.flush();c.flush();joint.add(upper,lower,hand);s.root.add(joint);joint.userData.ik={anchor:new THREE.Vector3(...anchor),foot:new THREE.Vector3(...foot),side,index,upper,lower,hand};limbs.push(joint);
}
const IK_A=new THREE.Vector3(),IK_B=new THREE.Vector3(),IK_C=new THREE.Vector3(),IK_D=new THREE.Vector3(),IK_Q=new THREE.Quaternion();
function walkerLeg(s,limbs,anchor,foot,side,index,size=1,hoof=false){
 const joint=new THREE.Group(),upper=new THREE.Group(),lower=new THREE.Group(),hand=new THREE.Group(),a=new Sculpt(upper),b=new Sculpt(lower),c=new Sculpt(hand);
 a.rod([[0,0,0],[side*.08,.5,0],[0,1,0]],.29*size,hoof?'iron':'flesh',.65);a.rod([[side*.19,.05,.10],[side*.20,.8,.12]],.10*size,'bone',.7);
 b.rod([[0,0,0],[side*.10,.5,0],[0,1,0]],.16*size,hoof?'iron':'bone',.75);b.oval(0,.06,0,.3*size,.12,.27*size,'bone');
 if(hoof){for(const x of[-.22,.22])c.plate(x*size,.3,0,.36*size,.6*size,1.45*size,'coal',0,0,x*.2);c.rod([[0,.65,-.4],[0,.9,-.5],[0,1.25,-.7]],.16*size,'bone',.1);}
 else {c.rod([[0,.22,-.3],[0,.2,.4],[0,.12,1.15]],.29*size,'flesh',.6);for(let i=0;i<4;i++)c.rod([[(i-1.5)*.16,.12,.85],[(i-1.5)*.2,.08,1.45+Math.sin(i)*.15]],.085*size,'bone',.03);}
 a.flush();b.flush();c.flush();joint.add(upper,lower,hand);s.root.add(joint);joint.userData.ik={anchor:new THREE.Vector3(...anchor),foot:new THREE.Vector3(...foot),side,index,upper,lower,hand,walking:true};limbs.push(joint);
}
function placeSegment(mesh,a,b){mesh.position.copy(a);IK_D.copy(b).sub(a);mesh.scale.y=IK_D.length();mesh.quaternion.setFromUnitVectors(UP,IK_D.normalize());}
function poseCrawler(ik,t,motion,telegraph,dead){
 const gait=motion.gait||0,speed=Math.min(1,(motion.speed||0)/4),phase=gait*1.8+ik.index*Math.PI*.92;
 const cycle=Math.sin(phase),lift=Math.max(0,Math.cos(phase))*speed;
 IK_A.copy(ik.anchor);IK_C.copy(ik.foot);IK_C.z+=cycle*1.9*speed;IK_C.y+=lift*1.3;
 const front=ik.index<2,reach=['reach','hands','wall-grasp','furrow','earth-split','bridal-grasp'].includes(motion.attack);
 const strike=motion.state==='striking'?Math.sin(Math.min(1,motion.strike||0)*Math.PI):0;
 if(front&&reach){IK_C.y+=telegraph*3.4;IK_C.z+=telegraph*2.5+strike*6;IK_C.x*=1-telegraph*.3;}
 if(front&&motion.attack==='seize'&&motion.state==='rising'){const u=Math.min(1,(motion.stateT||0)/1.1);IK_C.y+=Math.sin(u*Math.PI)*8;IK_C.z+=Math.sin(u*Math.PI)*5;IK_C.x*=.55;}
 if(['slam','kneeling-supper','derailment','clapper-swing'].includes(motion.attack)||motion.attackFamily==='slam'){IK_C.y+=telegraph*(front?4:1.2);IK_C.z+=telegraph*(front?1.3:0);}
 if(motion.state==='climbing'){IK_C.x=ik.side*(front?.9:ik.index<4?1.1:1.5);IK_C.z=front?4.8:ik.index<4?4.7:3.8;IK_C.y=front?6.8:ik.index<4?3.8:.3;}
 if(dead){IK_C.x*=1.2;IK_C.z+=.8;IK_C.y=.12;}
 if(motion.body){IK_C.sub(motion.body.position).applyQuaternion(IK_Q.copy(motion.body.quaternion).invert());IK_C.y/=motion.body.scale.y;}
 IK_B.copy(IK_A).lerp(IK_C,.5);IK_B.x+=ik.side*(ik.walking?.35:1.1+telegraph*.5);IK_B.y+=ik.walking?0:1.0;IK_B.z+=ik.walking?1.45:-1.1;
 placeSegment(ik.upper,IK_A,IK_B);placeSegment(ik.lower,IK_B,IK_C);ik.hand.position.copy(IK_C);ik.hand.rotation.set(-lift*.35,ik.side*.18+cycle*.1*speed,ik.side*lift*.14);
}

const SHAPES={
 sea(s,limbs){

  // A drowned cetacean folded into a deep-sea crown; the mouth is a vertical
  // split under a heavy brow, surrounded by wet plates and hooked feelers.
  s.loft([[.4,2.8,2.8,0,-.6],[1.3,4.6,3.8,0,-.7],[3.8,4.2,3.7,.3,-.8],[6,2.9,2.7,-.3,-.6],[7.2,1.2,1.4,-.5,-1],[7.8,.1,.3,-.3,-1]],'hide',.12);
  for(let j=0;j<8;j++){const y=1.2+j*.73,w=4.1-Math.abs(j-3)*.25;for(const side of[-1,1]){
   s.rod([[side*.5,y,-3.1],[side*w,y+.35,-1.4],[side*(w+.35),y-.25,1],[side*2.5,y-.7,2.5]],.24,'hide',.35);
   for(let n=0;n<3;n++){const x=side*(2+n*.64),z=.8-n*.9;s.ring(x,y+.25,z,.22+n*.04,.09,'bone','z',1,.8);}
  }}
  s.oval(0,3.6,3.24,1.55,2.12,.28,'wound');s.oval(0,4,3.5,1.08,1.75,.11,'hide');
  const jaws=[];for(const side of[-1,1]){const g=new THREE.Group();g.position.set(side*1.45,5.65,2.7);const k=new Sculpt(g);
   k.rod([[0,0,0],[side*.55,-1.5,.8],[side*.25,-3.6,1],[-side*.8,-4.25,.3]],.58,'flesh',.3);
   for(let n=0;n<14;n++){const y=-.4-n*.245;k.rod([[side*.24,y,.93],[-side*(.45+(n%3)*.18),y-.36,1.22],[-side*.56,y-.66,1.05]],.10,'bone',.01);}
   k.flush();s.root.add(g);jaws.push(g);
  }
  for(let i=0;i<8;i++){const a=i*TAU/8,x=Math.cos(a)*3.6,z=Math.sin(a)*3.2,g=new THREE.Group(),k=new Sculpt(g),h=1.5+(i%3)*1.45;
   k.rod([[x,2,z],[x*1.55,.55,z*1.65],[x*2.15,.2,z*2.15],[x*2.55,h,z*2.2],[x*2.1,h+1.7,z*2.0],[x*1.95,h+1.8,z*1.75]],.87,'hide',.025);
   for(let j=0;j<7;j++){const t=1.18+j*.15;k.ring(x*t,.5,z*t,.18,.085,'flesh','y',1,1.35);}
   for(let j=0;j<4;j++)k.rod([[x*(1.4+j*.2),.7,z*(1.4+j*.2)],[x*(1.5+j*.2),1.4,z*(1.45+j*.2)]],.12,'bone',.01);
   k.flush();limbs.push(g);s.root.add(g);
  }
  for(let i=0;i<9;i++){const x=(i-4)*.57;s.rod([[x,6.2,-1],[x*1.5,8.3+Math.cos(i)*.6,-1.2],[x*1.8,9.2,-2.5]],.23,'bone',.02);}
  s.rod([[0,7,-1],[-.4,9.5,0],[.5,10.3,2.8],[.65,7.8,4.2]],.18,'flesh',.25);s.oval(.65,7.65,4.2,.32,.55,.32,'pearl');
  return {weak:[0,3.95,3.8],r:1.05,weakScale:[.72,1.2,.43],weakColor:0x83a58e,body:[0,3,0,4.6],height:10.3,jaws,eyes:[[-2.05,5.6,3.1],[2.05,5.6,3.1]]};
 },
 tree(s,limbs){

  s.loft([[0,2.8,2.3,0,0],[1.2,3.7,2.8,0,0],[4,2.8,2.1,-.5,0],[7,2.3,1.85,.4,-.4],[10.5,1.7,1.3,-.7,-.7],[14,.85,.75,.5,-1],[18,.18,.2,1.8,-1.8]],'wood',.17);
  // Splayed roots and split bark expose a narrow heart in a torn trunk.
  for(let i=0;i<12;i++){const a=i*TAU/12,x=Math.cos(a),z=Math.sin(a);s.rod([[x*1.8,3,z*1.6],[x*3.5,.8,z*3.5],[x*6,.15,z*6],[x*(9+i%3),.08,z*(9+i%3)]],.75,'wood',.01);}
  for(const side of[-1,1]){s.rod([[side*.6,7.6,1.6],[side*1.4,6.6,2.15],[side*1.45,4.3,2.4],[side*.6,3,2.15]],.43,'wood',.4);
   for(let q=0;q<5;q++)s.rod([[side*(.8+q*.2),7.5-q*.35,1.8],[side*(1.2+q*.25),5.8,2.35],[side*(1+q*.3),3.1,1.9]],.1,'bone',.025);
  }s.oval(0,5.1,2.0,1.05,2.1,.33,'wound');
  const boughs=[];for(let i=0;i<9;i++){const a=i*2.39,x=Math.cos(a),z=Math.sin(a),y=7+i*.85,g=new THREE.Group(),k=new Sculpt(g);g.position.set(x,y,z);
   const reach=5.8+(i%3)*1.45;k.rod([[0,0,0],[x*2,2,z*1.7],[x*reach,3.4,z*reach],[x*(reach+1.1),6.1,z*(reach+.8)]],.63,'wood',.015);
   for(let j=0;j<4;j++){const f=2+j*1.1;k.rod([[x*f,2+j*.35,z*f],[x*(f+1.5)+z,4.4+j*.55,z*(f+1.5)-x],[x*(f+2.2)+z*1.7,5+j*.7,z*(f+2.2)-x*1.7]],.20,'wood',.01);}
   for(let j=0;j<2;j++){const xx=x*(3+j*1.5),zz=z*(3+j*1.5),yy=2.8+j*.5;k.rod([[xx,yy,zz],[xx+.12,yy-1.3,zz+.08],[xx-.1,yy-2.2,zz+.18]],.09,'wood',.4);k.oval(xx-.1,yy-2.45,zz+.18,.47,.82,.46,'flesh');k.oval(xx-.1,yy-2.5,zz+.58,.27,.45,.1,'bone');k.oval(xx-.21,yy-2.43,zz+.68,.06,.09,.03,'hide');k.oval(xx+.03,yy-2.43,zz+.68,.06,.09,.03,'hide');}
   k.flush();s.root.add(g);limbs.push(g);boughs.push(g);
  }
  for(let i=0;i<24;i++){const a=i*2.399,y=1.8+i*.43,r=2.65-y*.06;s.rod([[Math.cos(a)*r,y,Math.sin(a)*r],[Math.cos(a+.12)*r,y+1,Math.sin(a+.12)*r],[Math.cos(a+.08)*(r-.12),y+2,Math.sin(a+.08)*(r-.12)]],.14,i%4===0?'bone':'wood',.035);}
  return {weak:[0,5.1,2.45],r:1.05,weakScale:[.60,1.5,.3],weakColor:0xaf6839,body:[0,6,0,3],height:21,boughs};
 },
 bell(s,limbs){

  // The bell opens DOWN. Its skirt, waist, crown and shoulder bands remain
  // legible in silhouette; the dangling clapper is the living vulnerable organ.
  s.lathe([[4.25,3.35],[4.4,3.55],[4.4,3.8],[3.9,4.05],[3.55,4.7],[2.95,6.5],[2.62,7.6],[1.85,8.5],[.9,8.85],[.75,9]],'brass');
  s.lathe([[1.4,8.2],[2.42,7.3],[3.13,5.6],[3.65,4.15],[3.95,3.36]],'coal');
  for(const [y,r]of[[3.48,4.4],[3.95,4.0],[4.35,3.74],[7.6,2.65],[8.05,2.25]])s.ring(0,y,0,r,.09,'brass');
  for(let i=0;i<18;i++){const a=i*TAU/18,x=Math.cos(a),z=Math.sin(a);s.plate(x*3.01,6.35,z*3.01,.22,.68,.13,'brass',0,-a+Math.PI/2,0);s.rod([[x*3.55,4.7,z*3.55],[x*3.77,4.22,z*3.77]],.1,'wound',.1);}
  for(const side of[-1,1]){s.rod([[side*.55,8.8,0],[side*1.2,9.85,0],[side*.8,10.6,0],[0,10.75,0]],.24,'iron',.8);
   crawlerArm(s,limbs,[side*2.8,6.4,-.6],[side*6.2,.13,2.0],side,side<0?1:0,1.7);
   s.rod([[side*1.2,8.3,1.5],[side*1.25,7.7,2.25],[side*1.45,5.0,3.25]],.115,'iron',.8);
  }
  const clapper=new THREE.Group();clapper.position.set(0,6.2,.2);const c=new Sculpt(clapper);c.rod([[0,0,0],[0,-2.0,.5],[0,-3.7,1]],.31,'flesh',.7);c.oval(0,-3.6,1,.79,1.22,.74,'bone');
  for(const side of[-1,1]){c.rod([[side*.5,-2.8,1.1],[side*.65,-3.5,1.6],[side*.22,-4.45,1.6]],.16,'flesh',.2);c.oval(side*.29,-3.15,1.57,.14,.18,.06,'hide');}c.flush();s.root.add(clapper);
  // Broken chains drag from the inside of the skirt; they never obscure the bell.
  for(let i=0;i<5;i++){const x=(i-2)*1.1;for(let j=0;j<7;j++)s.ring(x,3.25-j*.33,-2.4+j*.06,.18,.035,'iron',j%2?'x':'z',1,1.25);}
  return {weak:[0,2.6,1.95],r:.85,weakScale:[.62,1.18,.42],weakColor:0xbe8d4b,body:[0,6,0,3.8],height:10.8,clapper,eyes:[[-.29,3.05,1.77],[.29,3.05,1.77]],mobile:true};
 },
 choir(s,limbs){

  // A pipe organ made of separate upright people. Negative space between
  // throats survives at long distance; there is no shared spherical abdomen.
  s.plate(0,1.0,-.4,7.6,1.35,2.7,'wood');s.plate(0,1.73,-.7,8.2,.35,2.5,'wood');
  const mouths=[];for(let i=0;i<7;i++){const x=(i-3)*1.05,y=7.0+Math.sin(i*1.78)*1.25+(i===3?2:0),g=new THREE.Group(),k=new Sculpt(g);g.position.set(x,1.6,0);
   k.loft([[0,.47,.47,0,0],[1,.40,.49,.06,-.1],[y-3,.29,.32,Math.sin(i)*.18,-.2],[y-1.9,.46,.4,Math.sin(i)*.23,-.1],[y-1,.40,.32,Math.sin(i)*.23,0]],'flesh',.09);
   k.rod([[-.3,.5,-.3],[-.42,y-3.2,-.5],[-.2,y-1.3,-.3]],.14,'bone',.4);
   k.oval(0,y-1.5,.3,.54,1.28,.4,'bone');k.oval(0,y-1.85,.68,.29,.87,.1,'hide');
   for(const side of[-1,1]){k.rod([[side*.18,y-.55,.56],[side*.43,y-1.45,.74],[side*.33,y-2.7,.67],[0,y-2.87,.64]],.105,'flesh',.55);k.oval(side*.2,y-.85,.63,.10,.11,.055,'hide');}
   for(let j=0;j<5;j++){const xx=(j-2)*.095;k.rod([[xx,y-1.12,.8],[xx,y-1.47-(j%2)*.12,.87]],.05,'bone',.01);}
   k.cloth([[0,y-2,-.5],[0,3,-.8],[Math.sin(i)*.3,-.8,-.8]],.58,'cloth',i);
   k.flush();s.root.add(g);limbs.push(g);mouths.push(g);
   for(const side of[-1,1]){s.rod([[x+side*.25,1.1,.5],[x+side*.5,.5,1.3],[x+side*.4,.13,2.2]],.16,'flesh',.55);for(let j=0;j<3;j++)s.rod([[x+side*.4+(j-1)*.12,.13,2.1],[x+side*.4+(j-1)*.18,.07,2.6]],.075,'bone',.04);}
  }
  for(let i=0;i<8;i++){const x=(i-3.5)*.9;s.rod([[x,.9,-1],[x*1.07,3.3,-1.5],[x*1.08,6.3,-1.5],[x*.95,7.2,-1]],.22,'brass',.8);s.ring(x*.95,7.2,-1,.25,.07,'brass','y');}
  return {weak:[0,6.15,1.0],r:1.0,weakScale:[.33,1.6,.26],weakColor:0xc29981,body:[0,4,0,3.7],height:11.6,mouths,eyes:[[-.19,8.15,.78],[.19,8.15,.78]]};
 },
 furnace(s,limbs){

  // A walking crematory. The heavy arched kiln and high broken chimney carry
  // the outline; ribs and a bound saint are fused into the refractory shell.
  s.loft([[1.1,2.3,2,0,0],[2,3.1,2.35,0,0],[6.6,2.9,2.1,0,0],[8.25,1.5,1.5,0,-.2],[8.6,1.1,1,0,-.3]],'coal',.055);
  for(let row=0;row<8;row++)for(const side of[-1,1]){s.plate(side*2.55,1.9+row*.72,1.7,1.1,.63,.8,'coal',0,side*.3,(row%2?1:-1)*.025);s.plate(side*2.9,2.0+row*.69,-.2,.45,.59,3.4,'iron');}
  for(let j=0;j<5;j++)s.plate(0,1.15+j*1.45,-2.22,5.6,.18,.25,'iron');
  s.plate(0,3.8,2.17,3.7,4.3,.12,'wound');s.plate(0,4,2.27,3.15,3.7,.09,'coal');
  for(const side of[-1,1]){s.rod([[side*2,1.8,2.45],[side*2,5.0,2.45],[side*1.5,6.25,2.4],[0,6.7,2.4]],.30,'iron',.95);s.plate(side*2.1,3.8,2.7,.24,4.35,.3,'brass');}
  const doors=[];for(const side of[-1,1]){const g=new THREE.Group();g.position.set(side*1.9,4,2.55);const k=new Sculpt(g);k.plate(-side*.88,0,0,1.76,3.5,.21,'iron');for(let j=0;j<6;j++)k.plate(-side*.88,-1.34+j*.52,.16,1.42,.09,.08,'coal');k.plate(-side*1.56,0,.2,.13,.65,.16,'brass');k.flush();s.root.add(g);doors.push(g);}
  s.loft([[7.2,1.05,.95,-1.35,-.55],[8.8,.85,.85,-1.35,-.55],[11.6,.72,.72,-1.55,-.55],[12.7,1.0,.87,-1.65,-.55],[13.05,.86,.8,-1.65,-.55]],'coal',.035);
  for(let j=0;j<5;j++)s.ring(-1.45-j*.04,8.2+j*.96,-.55,.88,.105,'iron');
  // A charred human torso bound to the arch, with extended arms and an ash halo.
  s.loft([[6.5,.5,.4,.7,1.3],[7.4,.7,.42,.7,1.25],[8.9,.55,.4,.7,1.1],[9.25,.23,.25,.7,1.0]],'flesh');s.oval(.7,9.7,1.02,.49,.69,.46,'coal');
  for(const side of[-1,1]){s.rod([[.7+side*.55,8.6,1.2],[side*2.0,8.5,1.2],[side*3.45,9.2,1.15]],.18,'bone',.42);for(let j=0;j<6;j++)s.rod([[.7,8.45-j*.25,1.63],[.7+side*.54,8.55-j*.25,1.56],[.7+side*.6,8.32-j*.25,1.3]],.08,'bone',.55);walkerLeg(s,limbs,[side*1.8,3.1,-.8],[side*3.3,.05,1.4],side,side<0?1:0,1.55,true);}
  for(let i=0;i<13;i++){const a=i*TAU/13;s.rod([[.7+Math.cos(a)*.85,9.7+Math.sin(a)*.85,.83],[.7+Math.cos(a)*1.55,9.7+Math.sin(a)*1.55,.83]],.065,'iron',.08);}
  return {weak:[0,3.9,2.5],r:1.25,weakScale:[1.05,1.12,.17],weakShape:'box',weakColor:0xd4722e,body:[0,4.2,0,3.1],height:13.1,doors,eyes:[[.53,9.7,1.44],[.86,9.7,1.44]],mobile:true};
 },
 lantern(s,limbs){

  // A tall, starved biped folded under its own lure. The shoulder hangs lower
  // than the pelvis and the neck doubles back, like a person swallowed backwards.
  s.loft([[4.9,.75,.68,0,-.8],[6.2,1.0,.68,0,-1],[8.2,.7,.65,0,-.5],[9.4,1.45,.64,0,.25],[9.8,.8,.5,0,.7]],'hide',.11);
  for(let j=0;j<11;j++)s.oval(0,5+j*.42,-1.6+j*.13,.22,.17,.23,'bone');
  s.rod([[0,9.2,.5],[0,10.4,1.2],[0,9.2,2.2],[0,7.95,2.2]],.52,'flesh',.68);
  s.oval(0,8.4,2.3,.9,1.3,.67,'bone');s.oval(0,7.75,2.88,.48,1.17,.14,'hide');
  const jaws=[];for(const side of[-1,1]){const jaw=new THREE.Group();jaw.position.set(side*.55,8.7,2.65);const k=new Sculpt(jaw);k.rod([[0,0,0],[side*.24,-1.1,.35],[side*.1,-2.4,.4],[-side*.42,-2.7,.16]],.18,'bone',.6);for(let j=0;j<9;j++)k.rod([[side*.12,-.5-j*.21,.45],[-side*(.26+j%2*.13),-.66-j*.21,.53]],.075,'bone',.015);k.flush();s.root.add(jaw);jaws.push(jaw);
   walkerLeg(s,limbs,[side*.65,6.1,-1],[side*1.7,.07,-.35],side,side<0?1:0,.94,false);
   const g=new THREE.Group();g.position.set(side*1.1,9.2,.2);const a=new Sculpt(g);a.rod([[0,0,0],[side*1.15,-2.6,.4],[side*2.1,-4.4,1.5],[side*1.8,-6.1,2.5]],.27,'flesh',.48);a.rod([[side*.15,-.1,-.18],[side*1.3,-2.5,.13],[side*2.3,-4.25,1.35]],.09,'bone',.55);for(let j=0;j<5;j++)a.rod([[side*1.8+(j-2)*.17,-6.1,2.5],[side*1.95+(j-2)*.25,-7,2.8],[side*1.65+(j-2)*.3,-7.7,3.45]],.09,'bone',.02);a.flush();s.root.add(g);limbs.push(g);g.userData.hangingArm=side;
  }
  s.rod([[0,9.5,-.15],[.2,12.1,-.45],[-.6,13.1,1.0],[-.8,12.1,4.1],[-.6,10.1,4.4]],.105,'bone',.35);
  const lure=new THREE.Group();lure.position.set(-.6,9.5,4.4);const a=new Sculpt(lure);a.oval(0,0,0,.43,.75,.43,'pearl');for(let i=0;i<6;i++){const q=i*TAU/6;a.rod([[Math.cos(q)*.3,.9,Math.sin(q)*.3],[Math.cos(q)*.6,0,Math.sin(q)*.6],[Math.cos(q)*.3,-.9,Math.sin(q)*.3]],.07,'iron',.8);}a.flush();s.root.add(lure);
  // Swallowed lamps can be seen through the ribs instead of a glowing face disc.
  for(const side of[-1,1])for(let j=0;j<8;j++)s.rod([[side*.12,9-j*.35,-.1],[side*1.15,8.9-j*.35,.15],[side*.82,8.7-j*.35,1.13],[side*.22,8.6-j*.35,1.28]],.105,'bone',.6);
  return {weak:[0,7.25,1.35],r:.82,weakScale:[.4,1.45,.45],weakColor:0xc3c4db,body:[0,6,0,2.2],height:13.2,jaws,lure,eyes:[[-.32,8.87,2.93],[.32,8.87,2.93]],mobile:true};
 },
 mire(s,limbs){

  // A bridal figure with a long train: a shoulder/waist silhouette under real
  // pleated fabric, a faceless head and two reaching arms. No crawler abdomen.
  s.loft([[.15,4.3,3.8,0,-1.4],[1.2,3.6,2.6,0,-.8],[3.9,2.0,1.5,0,-.25],[5.7,.72,.7,0,0],[7.2,1.45,.70,0,0],[7.6,.65,.5,0,0]],'cloth',.16);
  s.loft([[5.0,.85,.65,0,0],[6.1,.6,.5,0,0],[7.0,1.05,.58,0,0],[7.7,.38,.4,0,0]],'flesh',.08);s.rod([[0,7.2,0],[-.15,8.2,.2],[-.25,8.8,.3]],.35,'flesh',.8);s.oval(-.25,8.8,.3,.64,1.03,.57,'bone');s.oval(-.25,8.65,.84,.34,.72,.11,'hide');
  const veil=[];for(const side of[-1,1]){const g=new THREE.Group();g.position.set(-.25,9.1,.12);const k=new Sculpt(g);k.cloth([[side*.15,.3,.25],[side*.85,-1.3,.55],[side*2.4,-4.5,.1],[side*5.3,-8.8,-1.4]],1.0,'cloth',side+2);for(let j=0;j<4;j++)k.rod([[side*(.2+j*.16),.25,.4],[side*(1.2+j*.2),-3,.35],[side*(4.0+j*.6),-8.6,-1.3]],.035,'wood',.08);k.flush();s.root.add(g);veil.push(g);
   const arm=new THREE.Group();arm.position.set(side*.95,7.1,.1);const a=new Sculpt(arm);a.rod([[0,0,0],[side*1.5,-1.2,.4],[side*2.1,-2.3,1.8],[side*2.55,-1.2,3]],.25,'flesh',.55);a.rod([[side*.15,-.1,-.1],[side*1.65,-1.3,.25],[side*2.22,-2.15,1.65]],.08,'bone',.6);for(let j=0;j<5;j++)a.rod([[side*2.55+(j-2)*.14,-1.2,3],[side*2.5+(j-2)*.23,-.55,3.3],[side*2.3+(j-2)*.29,.2+(j%2)*.16,3.7]],.085,'bone',.02);a.flush();s.root.add(arm);limbs.push(arm);arm.userData.brideArm=side;
  }
  for(let i=0;i<12;i++){const a=i*TAU/12,x=Math.cos(a),z=Math.sin(a);s.cloth([[x*1.2,5.2,z*.8],[x*2.7,2.5,z*2.2-.5],[x*(4.5+i%2),.12,z*(4.5+i%2)-1.4]],.52,'cloth',i);s.rod([[x*2.2,.6,z*2.2],[x*3.8,.14,z*3.8],[x*6.1,.08,z*6.1-1]],.13,'wood',.01);}
  for(let i=0;i<11;i++){const a=i*2.4,x=Math.cos(a)*.72,z=Math.sin(a)*.52;s.rod([[x,9.4,z+.3],[x*1.15,9.9+(i%3)*.1,z+.3]],.07,'wood',.1);s.oval(x*1.15,9.9+(i%3)*.1,z+.3,.18,.14,.18,'bone');}
  return {weak:[-.25,8.48,1.0],r:.85,weakScale:[.40,1.1,.26],weakColor:0x91ab75,body:[0,3.5,0,3.2],height:10.1,veil,eyes:[[-.48,8.92,.86],[-.05,8.92,.86]],mobile:true};
 },
 moth(s,limbs){

  s.loft([[1.3,.18,.3,0,-.35],[2.2,.65,.6,0,-.2],[4.4,1.04,.87,0,0],[6.3,.85,.78,0,0],[7.2,1.2,.9,0,0],[8.4,.8,.67,0,.15],[8.7,.3,.3,0,.1]],'hide',.12);
  for(let j=0;j<7;j++)s.ring(0,2.2+j*.63,0,.62+j*.035,.12,'bone','y',1,.8);s.oval(0,8.15,.75,.74,.86,.42,'cloth');s.oval(0,7.75,1.08,.48,.76,.1,'hide');
  const wings=[];for(const side of[-1,1]){const g=new THREE.Group();g.position.set(side*.75,6.1,0);const k=new Sculpt(g);
   const makeWing=(lower)=>{const h=new THREE.Shape();h.moveTo(0,0);if(!lower){h.bezierCurveTo(side*1.2,3.9,side*5.1,7.0,side*8.6,5.4);h.bezierCurveTo(side*10,4.5,side*10.4,2.9,side*9.9,1.65);for(let j=0;j<7;j++)h.quadraticCurveTo(side*(9.9-j*1.0),.8-j*.32,side*(9.1-j*.95),.85-j*.34);h.quadraticCurveTo(side*1.5,-.9,0,0);}else {h.bezierCurveTo(side*3,-.2,side*8,-1.0,side*8.4,-3.4);h.quadraticCurveTo(side*8.7,-4.7,side*6.4,-4.0);h.bezierCurveTo(side*6.3,-6.0,side*6.8,-8.0,side*5.3,-8.9);h.bezierCurveTo(side*5.8,-5.0,side*3.0,-5.4,side*2.2,-4.0);h.quadraticCurveTo(side*.8,-2.2,0,0);}
    const geo=new THREE.ShapeGeometry(h,32),p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setXYZ(i,x,lower?y*.64:y,Math.sin(x*.7+y*.8)*.19+Math.sin(x*4-y*2)*.07+(lower?-.15:0));}geo.computeVertexNormals();k.add(geo,'cloth');
   };makeWing(false);makeWing(true);
   for(let n=0;n<2;n++){const x=side*(n?4.2:5.7),y=n?-2.7:2.75,r=n?1:1.75;k.oval(x,y,.21,r,r*.95,.10,'hide');k.oval(x,y,.33,r*.63,r*.57,.07,'bone');k.oval(x,y,.43,r*.43,r*.56,.08,'coal');k.oval(x-side*.12,y+.05,.54,r*.14,r*.25,.05,'pearl');}
   for(let j=0;j<9;j++){const y=1.2+j*.52;k.rod([[0,0,.12],[side*(3.6+j*.25),y*.75,.18],[side*(8.7-j*.35),y,.15]],.045,'bone',.015);}
   for(let j=0;j<5;j++)k.rod([[0,0,.13],[side*(2.2+j*.8),-2.3,.16],[side*(3.3+j*.85),-4.5+j*.28,.15]],.05,'bone',.015);
   for(let j=0;j<31;j++){const x=side*(2.5+j*.23),y=.9-(j/31)*1.7;k.rod([[x,y,.1],[x+side*.22,y-.45-(j%3)*.12,.1]],.025,'cloth',.01);}
   k.flush();s.root.add(g);limbs.push(g);wings.push(g);
   s.rod([[side*.5,8.5,.4],[side*1.3,10.2,.2],[side*2.5,10.6,.4]],.10,'bone',.05);for(let j=0;j<9;j++)s.rod([[side*(.9+j*.15),9.5+j*.11,.27],[side*(.95+j*.19),9.8+j*.13,.65]],.032,'cloth',.01);
   for(let j=0;j<3;j++)s.rod([[side*.9,4+j*.7,.1],[side*2.5,2.5+j*.8,1],[side*2.7,1.8+j*.6,2.4]],.14,'flesh',.04);
  }
  return {weak:[0,6.92,1.1],r:.85,weakScale:[.56,1.4,.37],weakColor:0x9aabc3,body:[0,5,0,2.2],height:13.2,wings,eyes:[[-.5,8.23,1.1],[.5,8.23,1.1]]};
 },
 antler(s,limbs){

  // Boiler, smokebox, cowcatcher and pistons establish an actual locomotive.
  // Four jointed ungulate legs carry it; the antlers grow through the stack.
  const boiler=new THREE.CylinderGeometry(2.0,2.1,7.0,36,1);boiler.rotateX(Math.PI/2);boiler.translate(0,4,-.55);s.add(boiler,'iron');
  for(let j=0;j<7;j++)s.ring(0,4,-3.8+j*1.08,2.06,.105,'brass','z');
  s.plate(0,2.12,-.5,5.5,.45,8.5,'iron');s.plate(0,5.65,-3,4.9,.32,2.8,'coal');
  for(const side of[-1,1]){s.plate(side*2,4.5,-3,.2,2.1,2.4,'iron');s.plate(side*2.12,4.65,-2.7,.1,.95,1.1,'coal');s.rod([[side*1.9,5,-3.5],[side*2.5,4.8,-1.3],[side*2.45,3.9,1.7]],.14,'brass',.85);s.rod([[side*1.9,3.3,2],[side*2.7,3,-2],[side*2.0,2.8,-3.6]],.22,'iron',.7);
   for(let j=0;j<2;j++)walkerLeg(s,limbs,[side*1.65,3.0,-2.75+j*5],[side*3.55,.08,-2.6+j*4.7],side,j*2+(side<0?1:0),1.16,true);
  }
  s.lathe([[.8,5.3],[.76,6.5],[.64,8.1],[1.0,8.45],[1.0,8.8]],'iron',0,.8);s.ring(0,8.62,.8,1.01,.10,'brass');
  s.oval(0,4,3.03,1.96,1.96,.14,'coal');s.ring(0,4,3.13,1.93,.11,'iron','z');
  for(let i=0;i<12;i++){const a=i*TAU/12;s.oval(Math.cos(a)*1.65,4+Math.sin(a)*1.65,3.25,.1,.1,.08,'brass');}
  for(let i=-5;i<=5;i++){const x=i*.52;s.rod([[x*.65,2.7,3.3],[x,1.7,4.2],[x*1.13,.65,5.6]],.13,'iron',.7);}s.rod([[-3.1,.65,5.6],[0,.65,5.8],[3.1,.65,5.6]],.16,'iron',.8);
  // An elongated deer skull sits over the smokebox, not a round target-face.
  s.loft([[4.55,.33,.40,0,3.1],[5.4,.55,.53,0,3.02],[6.6,.96,.60,0,2.8],[7.4,.8,.64,0,2.5],[7.7,.32,.34,0,2.25]],'bone',.085);
  for(const side of[-1,1]){s.oval(side*.6,6.64,3.33,.25,.31,.10,'hide');s.rod([[side*.35,5.7,3.47],[side*.63,5.0,3.8],[side*.32,4.3,3.7]],.12,'bone',.15);s.rod([[side*.65,7.3,2.2],[side*2.2,9.1,1.9],[side*4.5,10.1,.8],[side*6.1,11.3,-.7]],.31,'bone',.015);
   for(let j=0;j<5;j++){const x=side*(1.65+j*.85),y=8.8+j*.42,z=2.1-j*.62;s.rod([[x,y,z],[x-side*.1,y+1.9+(j%2)*.6,z-.35],[x+side*.25,y+2.7+(j%2)*.5,z-.9]],.18-j*.018,'bone',.01);if(j>1)s.rod([[x,y,z],[x+side*.65,y+.4,z+.9],[x+side*1.15,y+1.2,z+1.2]],.10,'bone',.01);}
  }
  s.ring(0,3.52,3.40,.70,.16,'brass','z');s.plate(0,1.75,3.5,2,.37,.25,'brass');
  const wheels=[];for(const side of[-1,1])for(let j=0;j<2;j++){const g=new THREE.Group();g.position.set(side*2.32,2.25,-2+j*3.5);const k=new Sculpt(g);k.ring(0,0,0,1.1,.17,'iron','x');for(let i=0;i<7;i++){const a=i*TAU/7;k.rod([[0,0,0],[0,Math.cos(a),Math.sin(a)]],.075,'brass',.8);}k.flush();s.root.add(g);wheels.push(g);}
  return {weak:[0,3.52,3.68],r:.72,weakScale:[.84,.84,.25],weakColor:0xbbaa77,body:[0,3.8,-.5,3.8],height:13.6,wheels,eyes:[[-.6,6.64,3.43],[.6,6.64,3.43]],mobile:true};
 },
 crypt(s,limbs){
  // A desiccated human frame pulled into a predatory, six-armed shape. The hollow
  // chest and leaning skull read as anatomy before the light in the cavity appears.
  // Broken pelvic wings and long exposed muscles leave daylight between the limbs.
  // A smooth inflated abdomen made the old silhouette look like a toy spider.
  for(const side of[-1,1]){s.oval(side*.95,2.15,-1.6,.72,1.27,1.9,'flesh',side*.36);s.rod([[side*.3,2.8,-.4],[side*1.65,2.5,-1.2],[side*1.3,1.25,-2.2]],.26,'bone',.7);s.rod([[side*.6,5.8,-.3],[side*1.15,4.1,.2],[side*.45,2.1,-.6]],.35,'flesh',.65);}
  s.rod([[0,1,-3],[0,2.7,-1.8],[0,4.8,-.1],[0,6.4,.6]],.45,'bone',.65);
  s.oval(0,4.1,-.1,1.18,2.1,.8,'wound');s.oval(0,4.8,1.15,.94,1.4,.2,'hide');
  for(const side of[-1,1]){s.rod([[side*.1,6,.7],[side*1.5,6.1,.3],[side*2.3,5.55,-.2]],.22,'bone');
   for(let i=0;i<8;i++){const y=5.5-i*.34,w=1.85-Math.abs(i-3)*.1;s.rod([[side*.25,y+ .12,-.8],[side*w,y,.1],[side*w*.8,y-.28,1.4],[side*.55,y-.43,1.83]],.16,'bone',.72);if(i%3===0)s.rod([[side*w,y,.25],[side*(w+.2),y-.65,.8],[side*(w-.3),y-1.18,1.03]],.19,'flesh',.025);}
   s.oval(side*1.7,5.5,-.1,.65,.7,.7,'flesh');
   for(let i=0;i<4;i++)s.rod([[side*(1.4+i*.12),4.5-i*.4,.8],[side*(1.2+i*.25),3.5-i*.42,1.4],[side*(.9+i*.3),2.5-i*.36,1.2]],.095,'wound',.02);
   s.rod([[side*.5,3.1,.6],[side*1.45,2.8,.3],[side*1.9,2,-.5]],.21,'bone');
  }
  for(let i=0;i<11;i++)s.oval(0,1.3+i*.43,-1.1+i*.12,.27,.18,.34,'bone');
  const head=new THREE.Group();head.position.set(0,6.1,.4);const h=new Sculpt(head);
  h.rod([[0,-.4,-.2],[-.16,.3,.4],[0,.9,.7]],.39,'flesh',.65);
  h.oval(.09,1.68,.6,.77,1.44,.95,'flesh',-.15);h.oval(-.32,1.94,1.05,.5,1.03,.54,'bone',.23);
  h.rod([[-.74,2.12,1.08],[-.26,2.66,1.17],[.25,2.77,.99],[.7,2.4,.67]],.17,'bone',.5);
  for(const side of[-1,1]){h.oval(side*.34,1.66,1.49,.23,.16,.19,'hide',side*.25);h.rod([[side*.08,1.99,1.51],[side*.38,2.06,1.5],[side*.69,1.77,1.22]],.16,side<0?'bone':'flesh');h.rod([[side*.61,1.62,1.28],[side*.71,1.02,1.5],[side*.47,.72,1.68]],.19,'bone',.5);}
  h.rod([[0,1.88,1.55],[.05,1.12,1.79],[-.12,.93,1.89]],.13,'bone',.28);
  // The lower face has torn away. The jaw hangs below the cheek on exposed ligaments,
  // opens independently with each reach, and never forms a horizontal smiling tooth row.
  h.oval(.04,.65,1.57,.45,.92,.19,'wound');h.oval(.06,.8,1.77,.34,.73,.08,'hide');
  for(let j=0;j<7;j++){const x=(j-3)*.11;h.rod([[x,.98-Math.abs(j-3)*.055,1.84],[x*1.03,.51-(j%3)*.10,1.95]],.065,'bone',.02);}
  const jaw=new THREE.Group();jaw.position.set(0,.9,1.34);const j=new Sculpt(jaw);
  for(const side of[-1,1]){j.rod([[side*.57,.18,0],[side*.73,-.85,.5],[side*.35,-1.67,.74],[side*.10,-1.78,.88]],.19,'bone',.48);j.rod([[side*.64,.37,-.03],[side*.79,-.38,.25],[side*.55,-1.3,.6]],.09,'flesh',.12);for(let q=0;q<4;q++)j.rod([[side*(.1+q*.11),-1.68+q*.07,.88],[side*(.1+q*.10),-1.3+q*.10,1.01]],.065,'bone',.02);}
  j.rod([[0,-.27,.34],[.12,-.86,.65],[-.1,-1.5,.9],[.22,-2.2,.93]],.19,'wound',.07);j.flush();head.add(jaw);
  h.rod([[-.72,2.05,.1],[-1.02,2.65,-.02],[-.64,3.18,-.08],[.1,3.43,-.17],[.62,3.02,-.3]],.13,'iron',.75);
  for(let i=0;i<5;i++){const x=-.5+i*.24;h.rod([[x,2.4,.82],[x+.13,1.93,1.27],[x+.25,1.32,1.34]],.065,'flesh',.04);}
  h.flush();s.root.add(head);
  for(let i=0;i<6;i++){const side=i%2?-1:1,pair=Math.floor(i/2);crawlerArm(s,limbs,[side*(1.55-pair*.12),5.3-pair*1.28,-pair*.65],[side*(5.1+pair*.7),.13,3.6-pair*3.6],side,i,1);}
  // The Kept is still wearing its broken restraint. The splintered coffin back,
  // crooked iron crown and chained wrists make its captivity visible in play.
  for(const side of[-1,1]){s.plate(side*1.42,4.4,-1.45,.33,6.1,.44,'wood',0,side*.22,side*.12);s.plate(side*1.4,7.25,-1.2,.35,1.6,.42,'wood',0,side*.17,-side*.38);
   for(let j=0;j<8;j++)s.ring(side*(1.45+j*.17),5.0-j*.37,-.5-j*.10,.18,.045,'iron',j%2?'x':'z',1,1.2);
  }
  s.plate(0,3.2,-1.72,2.8,.24,.26,'iron');s.ring(0,5.95,.35,.75,.11,'iron','y',1,1.12);
  return {weak:[0,4.7,1.94],r:.74,weakScale:[.5,1.28,.30],weakColor:0xa386aa,body:[0,3.6,0,2.7],height:10,head,jaw,eyes:[[-.34,7.76,1.91],[.34,7.76,1.91]],mobile:true};
 },
 burrow(s,limbs){
  // A mole-like corpse adapted into a shovel: bony digging hands, segmented
  // earth-encrusted mantle, split vertical throat, and a blind human jaw beneath.
  s.oval(0,3.1,-1.6,3.2,2.3,4.1,'hide');s.rod([[0,1.5,-5],[0,3,-3],[0,4.8,0],[0,5.4,1.8]],1.1,'flesh',.8);
  for(let i=0;i<8;i++){const z=-4.2+i*.85,y=3.5+Math.sin(i/8*Math.PI)*1.3;s.oval(0,y,z,2.8-i*.11,.7,.9,'wood');for(const side of[-1,1])s.rod([[side*2.1,y,z],[side*3,y+.9,z-.4],[side*3.45,y+.6,z-.8]],.22,'bone',.03);}
  s.oval(0,5.3,2.1,1.9,1.8,1.4,'bone');s.oval(0,4.8,3.25,1.1,1.7,.26,'wound');
  for(const side of[-1,1]){s.rod([[side*.27,6.8,3.35],[side*1.3,5.8,3.55],[side*1.0,3.8,3.5],[side*.3,3.4,3.4]],.32,'flesh',.55);for(let j=0;j<10;j++){const y=3.8+j*.27;s.rod([[side*(.9+Math.sin(j/9*Math.PI)*.3),y,3.65],[side*.48,y-.1,3.9],[side*.3,y-.15,3.75]],.14,'bone',.015);}}
  for(let i=0;i<4;i++){const side=i%2?-1:1,pair=Math.floor(i/2);crawlerArm(s,limbs,[side*2,3.8-pair*.7,1-pair*2.7],[side*(5.3-pair*1.5),.12,3.4-pair*6.1],side,i,pair===0?1.75:.65);
   if(pair===0){const hand=limbs.at(-1).userData.ik.hand,h=new Sculpt(hand);h.plate(0,.53,1.6,2.8,.55,2.8,'bone',-.16,0,0);for(let j=0;j<5;j++){const x=(j-2)*.52;h.rod([[x,.63,1.1],[x*1.12,.75,2.1],[x*1.28,.4,3.4],[x*1.36,.08,4.3-Math.abs(j-2)*.27]],.20,'bone',.01);}h.flush();}
  }
  for(let j=0;j<13;j++){const z=-4.9+j*.61,y=3.7+Math.sin(j/13*Math.PI)*1.2;s.rod([[0,y,z],[-.25,y+.68,z-.3],[0,y+1.3,z-.72]],.30,'wood',.01);}
  for(let i=0;i<9;i++)s.rod([[Math.sin(i*2.4)*2.5,2,-3+i*.5],[Math.sin(i*2.4)*3.5,.7,-4+i*.5]],.19,'flesh',.02);
  return {weak:[0,4.95,3.85],r:.88,weakScale:[.52,1.42,.35],weakColor:0xb98a66,body:[0,3,-1,3.8],height:8,mobile:true};
 }

};
export function buildBossRig(def){
 const root=new THREE.Group();root.name='boss-'+def.id;const body=new THREE.Group();root.add(body);const s=new Sculpt(body),limbs=[];const anatomy=SHAPES[def.shape](s,limbs);s.flush();
 const tissue=tissueSurface('flesh'),organColor=new THREE.Color(anatomy.weakColor||0x967169);
 const membrane=new THREE.MeshLambertMaterial({color:organColor.clone().multiplyScalar(.50),emissive:organColor,emissiveIntensity:.06,map:tissue.map,bumpMap:tissue.bump,bumpScale:.065});membrane.name='boss-'+def.shape+'-exposed-organ';
 const weakGeometry=anatomy.weakShape==='box'?wornPlate().scale(anatomy.r*1.8,anatomy.r*1.8,anatomy.r):new THREE.SphereGeometry(anatomy.r,24,16);
 const weak=new THREE.Mesh(weakGeometry,membrane);weak.position.set(...anatomy.weak);const weakScale=anatomy.weakScale||[1,1,.42];weak.scale.set(...weakScale);body.add(weak);
 if(anatomy.clapper){weak.position.sub(anatomy.clapper.position);anatomy.clapper.add(weak);}
 const eyeMat=new THREE.MeshBasicMaterial({color:def.skin.colors.accent,toneMapped:false});const eyes=[];
 for(const side of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),eyeMat);if(anatomy.eyes)e.position.set(...anatomy.eyes[side===-1?0:1]);else e.position.set(anatomy.weak[0]+side*(anatomy.r+ .38),anatomy.weak[1]+.8,anatomy.weak[2]-.2);const parent=anatomy.head||anatomy.clapper;if(parent){e.position.sub(parent.position);parent.add(e);}else body.add(e);eyes.push(e);}
 // A soft contact shadow seats the creature in the floor without another shadow pass.
 const shadowData=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const d=Math.hypot((x-31.5)/32,(y-31.5)/32);shadowData[(y*64+x)*4+3]=Math.round(Math.max(0,1-d*d)**2*175);}
 const shadowMap=new THREE.DataTexture(shadowData,64,64,THREE.RGBAFormat);shadowMap.needsUpdate=true;shadowMap.magFilter=THREE.LinearFilter;
 const shadowMat=new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,color:0x000000,polygonOffset:true,polygonOffsetFactor:-1});const shadow=new THREE.Mesh(new THREE.PlaneGeometry(def.shape==='sea'?23:16,def.shape==='sea'?23:16),shadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=.09;root.add(shadow);
 const veins=new THREE.MeshLambertMaterial({color:0x302526});for(let i=0;i<5;i++){const r=anatomy.r,x=(i-2)*r*.28,points=[new THREE.Vector3(x,-r*.74,r*.65),new THREE.Vector3(x+Math.sin(i)*r*.16,0,r*1.03),new THREE.Vector3(x-r*.15,r*.71,r*.69)],g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,r*.027,6,false),m=new THREE.Mesh(g,veins);m.userData.weakTissue=true;weak.add(m);}
 const zone=()=>weak.getWorldPosition(new THREE.Vector3());
 return {root,body,limbs,weak,membrane,eyes,anatomy,zone,
  pose(t,open,telegraph,dead,motion={}){
   const mobile=!!anatomy.mobile||['lantern','antler','bell','furnace','mire'].includes(def.shape),speed=Math.min(1,(motion.speed||0)/4),gait=motion.gait||0;
   const recoil=motion.recoil||0,rise=motion.state==='rising'?Math.min(1,(motion.stateT||0)/(def.ambush?.7:2.1)):1;
   body.position.y=dead?-Math.min(.7,dead*.18):Math.sin(mobile?gait*3.6:t*1.2)*(mobile?.13*speed:.055);
   body.scale.y=dead?1-Math.min(.65,dead*.22):1;
   const lean={bell:-.025,furnace:-.015,mire:-.015,lantern:-.06,antler:-.025,burrow:-.10,crypt:-.13}[def.shape]||0;
   body.rotation.x=dead?.2:mobile?lean-telegraph*.07+recoil*.15:recoil*.05;
   body.rotation.z=dead?Math.min(.45,dead*.15):Math.sin(mobile?gait*1.8:t*.5)*(mobile?.055*speed:.013);
   if(def.ambush&&!dead){body.position.y-=motion.state==='dormant'?10:(1-rise)*10;body.rotation.x+=(1-rise)*.45;}
   if(def.shape==='moth'&&!dead){body.position.y+=1.2+Math.sin(t*1.7)*.65;body.rotation.x+=speed*.16;}
   if(motion.state==='climbing'&&!dead){body.position.y+=motion.climb||0;body.rotation.x=-.55;}
   if(anatomy.head){anatomy.head.rotation.y=Math.sin(t*.7)*.07+(motion.turn||0)*.22;anatomy.head.rotation.x=-telegraph*.2+recoil*.33;anatomy.head.rotation.z=Math.sin(t*.83)*.08;}
   if(anatomy.jaw){anatomy.jaw.rotation.x=.15+telegraph*.55+Math.sin(t*2.3)*.09;anatomy.jaw.rotation.z=Math.sin(t*1.7)*.07+recoil*.15;}
   const strike=motion.state==='striking'?Math.sin(Math.min(1,motion.strike||0)*Math.PI):0;
   if(anatomy.jaws)for(let j=0;j<anatomy.jaws.length;j++){const side=j?1:-1;anatomy.jaws[j].rotation.y=side*(.025+telegraph*.26+(open?.32:0)+strike*.18);anatomy.jaws[j].rotation.x=telegraph*.1+Math.sin(t*1.8+j)*.035;}
   if(anatomy.clapper){anatomy.clapper.rotation.x=Math.sin(t*(telegraph?4.4:1.35))*(.08+telegraph*.5+strike*.7);anatomy.clapper.rotation.z=Math.sin(t*1.1)*.055;if(!dead)body.position.y+=telegraph*.4;}
   if(anatomy.doors)for(let j=0;j<anatomy.doors.length;j++)anatomy.doors[j].rotation.y=(j?1:-1)*(open?1.33:.015+telegraph*.16);
   if(anatomy.veil)for(let j=0;j<anatomy.veil.length;j++){const side=j?1:-1;anatomy.veil[j].rotation.y=side*((open?.45:0)+telegraph*.23+Math.sin(t*.7+j)*.045);anatomy.veil[j].rotation.z=side*telegraph*.055;}
   if(anatomy.lure){anatomy.lure.rotation.z=Math.sin(t*1.25)*(.10+telegraph*.15);anatomy.lure.position.y=9.5+Math.sin(t*1.8)*.1+telegraph*.35;}
   if(anatomy.wheels)for(const wheel of anatomy.wheels)wheel.rotation.x=gait*.65;
   eyeMat.color.setHex(dead?0x111218:def.skin.colors.accent);
   motion.body=body;
   for(let i=0;i<limbs.length;i++){const l=limbs[i];if(l.userData.ik){poseCrawler(l.userData.ik,t,motion,telegraph,dead);continue;}
    l.rotation.y=Math.sin(t*.65+i)*.07;l.rotation.z=Math.sin(t*1.05+i*.9)*(.045+telegraph*.14);
    if(def.shape==='moth'){l.rotation.y=(i?1:-1)*(.25+Math.sin(t*(speed?5.2:2.5))*(.3+speed*.16)+telegraph*.6);l.rotation.z=(i?1:-1)*(.06+Math.sin(t*2.5)*.1);}
    if(def.shape==='sea'){l.rotation.x=Math.sin(t*1.5+i)*.10+telegraph*.08;l.rotation.z=Math.sin(t*1.2+i*.9)*.14;}
    if(def.shape==='tree')l.rotation.z=Math.sin(t*.8+i*.7)*(.03+telegraph*.16)+recoil*.07;
    if(def.shape==='choir')l.rotation.x=Math.sin(t*1.9+i)*.1-telegraph*.22;
    if(l.userData.hangingArm){l.rotation.x=-telegraph*.85-strike*.8;l.rotation.z=l.userData.hangingArm*(Math.sin(t*1.1)*.045+telegraph*.14);}
    if(l.userData.brideArm){l.rotation.x=-telegraph*.38-strike*.55;l.rotation.y=l.userData.brideArm*(telegraph*.35+strike*.2);}
   }
   membrane.color.copy(organColor).multiplyScalar(open?.84:.38);membrane.emissive.copy(organColor);membrane.emissiveIntensity=dead?0:open?.32:.035;
   const pulse=1+Math.sin(t*(open?5.2:2.4))*(open?.048:.018);weak.scale.set(weakScale[0]*pulse,weakScale[1]*pulse,weakScale[2]);
  },
  dispose(){root.traverse(o=>o.geometry?.dispose());veins.dispose();shadowMap.dispose();shadowMat.dispose();membrane.map?.dispose();membrane.bumpMap?.dispose();membrane.dispose();eyeMat.dispose();root.removeFromParent();}
 };
}
