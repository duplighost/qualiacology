import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const TAU=Math.PI*2, UP=new THREE.Vector3(0,1,0);
const colors={flesh:0x53413b,bone:0x898572,hide:0x21262a,iron:0x353a3e,wood:0x3e3628,wound:0x642335};
let surfaces=null;
function texNoise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,s=t=>t*t*(3-2*t),h=(a,b)=>{let n=Math.imul(a+391,374761393)^Math.imul(b+717,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};const a=h(ix,iy),b=h(ix+1,iy),c=h(ix,iy+1),d=h(ix+1,iy+1),u=s(fx),v=s(fy);return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;}

function tissueSurface(kind){
 const size=192,pixels=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*TAU,v=y/size*TAU,n=texNoise(x*.29,y*.29)*2-1;
  const vein=Math.abs(Math.sin(v*2+Math.sin(u)*1.3+texNoise(x*.035,y*.035)*1.1));
  const grain=kind==='wood'?Math.sin(v*23+Math.sin(u)*.8)*.15:kind==='iron'?Math.sin(v*19)*.025:n*.045;
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
  const tex=tissueSurface(id);const m=new THREE.MeshStandardMaterial({color,roughness:id==='flesh'?.49:.85,metalness:id==='iron'?.68:.04,vertexColors:true,map:tex.map,bumpMap:tex.bump,bumpScale:id==='wood'?.105:.027});m.name='boss-'+id;surfaces[id]=m;
 }return surfaces;
}
function mottled(g,seed=0){
 const p=g.attributes.position,a=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=Math.sin(x*9.3+seed)*Math.sin(y*13.7-z*5.9)*.12+Math.sin(y*2.8+x*3.2)*.09;const k=.85+n;a.set([k,k*.96,k*.91],i*3);}
 g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;
}
class Sculpt {
 constructor(root){this.root=root;this.parts=new Map();}
 add(g,mat='flesh'){mottled(g,this.parts.size);let a=this.parts.get(mat);if(!a)this.parts.set(mat,a=[]);a.push(g);}
 oval(x,y,z,sx,sy,sz,mat='flesh',rot=0){const g=new THREE.SphereGeometry(1,20,14);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const xx=p.getX(i),yy=p.getY(i),zz=p.getZ(i),f=1+.045*Math.sin(xx*19+yy*11)*Math.cos(zz*17);p.setXYZ(i,xx*f,yy*f,zz*f);}g.computeVertexNormals();g.scale(sx,sy,sz);g.rotateZ(rot);g.translate(x,y,z);this.add(g,mat);
 }
 rod(points,r,mat='flesh',end=.18){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),steps=Math.max(18,points.length*7),radial=11,g=new THREE.TubeGeometry(curve,steps,r,radial,false),p=g.attributes.position;
  for(let i=0;i<=steps;i++){const t=i/steps,centre=curve.getPointAt(t),taper=(1-t*(1-end))*(1+.04*Math.sin(t*23));for(let j=0;j<=radial;j++){const n=i*(radial+1)+j;p.setXYZ(n,centre.x+(p.getX(n)-centre.x)*taper,centre.y+(p.getY(n)-centre.y)*taper,centre.z+(p.getZ(n)-centre.z)*taper);}}g.computeVertexNormals();this.add(g,mat);
 }
 torus(x,y,z,r,t,mat='bone',sx=1,sy=1){const g=new THREE.TorusGeometry(r,t,10,32);g.scale(sx,sy,1);g.translate(x,y,z);this.add(g,mat);}
 box(x,y,z,w,h,d,mat='iron'){const g=new THREE.BoxGeometry(w,h,d,3,3,3);g.translate(x,y,z);this.add(g,mat);}
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
function placeSegment(mesh,a,b){mesh.position.copy(a);IK_D.copy(b).sub(a);mesh.scale.y=IK_D.length();mesh.quaternion.setFromUnitVectors(UP,IK_D.normalize());}
function poseCrawler(ik,t,motion,telegraph,dead){
 const gait=motion.gait||0,speed=Math.min(1,(motion.speed||0)/4),phase=gait*1.8+ik.index*Math.PI*.92;
 const cycle=Math.sin(phase),lift=Math.max(0,Math.cos(phase))*speed;
 IK_A.copy(ik.anchor);IK_C.copy(ik.foot);IK_C.z+=cycle*1.9*speed;IK_C.y+=lift*1.3;
 const front=ik.index<2,reach=motion.attack==='reach'||motion.attack==='hands';
 const strike=motion.state==='striking'?Math.sin(Math.min(1,motion.strike||0)*Math.PI):0;
 if(front&&reach){IK_C.y+=telegraph*3.4;IK_C.z+=telegraph*2.5+strike*6;IK_C.x*=1-telegraph*.3;}
 if(front&&motion.attack==='seize'&&motion.state==='rising'){const u=Math.min(1,(motion.stateT||0)/1.1);IK_C.y+=Math.sin(u*Math.PI)*8;IK_C.z+=Math.sin(u*Math.PI)*5;IK_C.x*=.55;}
 if(motion.attack==='slam'){IK_C.y+=telegraph*(front?4:1.2);IK_C.z+=telegraph*(front?1.3:0);}
 if(motion.state==='climbing'){IK_C.x=ik.side*(front?.9:ik.index<4?1.1:1.5);IK_C.z=front?4.8:ik.index<4?4.7:3.8;IK_C.y=front?6.8:ik.index<4?3.8:.3;}
 if(dead){IK_C.x*=1.2;IK_C.z+=.8;IK_C.y=.12;}
 if(motion.body){IK_C.sub(motion.body.position).applyQuaternion(IK_Q.copy(motion.body.quaternion).invert());IK_C.y/=motion.body.scale.y;}
 IK_B.copy(IK_A).lerp(IK_C,.5);IK_B.x+=ik.side*(1.1+telegraph*.5);IK_B.y+=1.0;IK_B.z-=1.1;
 placeSegment(ik.upper,IK_A,IK_B);placeSegment(ik.lower,IK_B,IK_C);ik.hand.position.copy(IK_C);ik.hand.rotation.set(-lift*.35,ik.side*.18+cycle*.1*speed,ik.side*lift*.14);
}

const SHAPES={
 sea(s,limbs){
  s.oval(0,3,0,4.8,3.3,4,'hide');s.oval(0,4.2,2.9,3.1,2.7,1.7,'flesh');s.torus(0,4,4.3,1.7,.42,'flesh',1.25,.85);s.teeth(0,4,4.6,1.65,27);s.oval(0,4,4.3,1.7,1.25,.13,'wound');
  for(let i=0;i<8;i++){const a=i*TAU/8,x=Math.cos(a)*3.8,z=Math.sin(a)*3.8,reach=2.15+.5*Math.sin(i*2.7),lift=2.8+Math.sin(i*1.9)*2.1;const g=new THREE.Group(),k=new Sculpt(g);k.rod([[x,1.8,z],[x*1.6,1,z*1.6],[x*2.0,.4,z*2.0],[x*reach,1.4,z*reach],[x*(reach+.45),lift,z*(reach+.45)],[x*reach,lift+1.2,z*(reach+.4)]],.95,'hide',.025);for(let j=0;j<5;j++)k.oval(x*(1.25+j*.2),1.1,z*(1.25+j*.2),.24,.18,.25,'flesh');k.flush();limbs.push(g);s.root.add(g);}
  for(let i=0;i<7;i++)s.rod([[(i-3)*.8,6,0],[(i-3)*.9,8.2,-1],[(i-3)*1.05,8.7,-2]],.25,'bone');
  return {weak:[0,4,4.7],r:1.25,body:[0,3,0,4.6],height:9};
 },
 tree(s,limbs){
  s.rod([[0,0,0],[-1,4,.1],[.6,9,0],[-.5,14,0],[1.5,19,-1]],3.1,'wood',.025);for(const side of[-1,1]){s.rod([[0,8,0],[side*3,12,-1],[side*6,15,-2],[side*8,17,-3]],.95,'wood',.02);s.rod([[side*3,12,-1],[side*4,17,2],[side*3,20,3]],.45,'wood',.02);}s.oval(0,5.3,2.45,1.8,2.5,.7,'wound');s.torus(0,5.3,3,1.35,.35,'wood',1,1.5);s.teeth(0,5.3,3.15,1.25,18);
  for(let i=0;i<10;i++){const a=i*TAU/10,x=Math.cos(a),z=Math.sin(a);s.rod([[x,1,z],[x*3,.5,z*3],[x*7,.2,z*7],[x*11,.06,z*11]],.85,'wood');const g=new THREE.Group(),k=new Sculpt(g);k.rod([[x*.4,7+i*.5,z*.4],[x*3,10+i*.4,z*3],[x*6,11+i*.3,z*6],[x*8,15+i*.2,z*8]],.55,'wood',.03);k.rod([[x*4,11,z*4],[x*7,12,z*2],[x*9,11,z]],.24,'wood');k.oval(x*5,10,z*5,.65,1.8,.6,'flesh');k.oval(x*5,9.75,z*5+.52,.26,.43,.18,'bone');k.oval(x*5-.11,9.87,z*5+.69,.08,.12,.04,'hide');k.oval(x*5+.11,9.87,z*5+.69,.08,.12,.04,'hide');k.rod([[x*5,9,z*5],[x*5+.7,8.4,z*5+.3],[x*5+.4,7.7,z*5+.4]],.12,'flesh');k.flush();limbs.push(g);s.root.add(g);}
  for(let i=0;i<22;i++){const a=i*2.4;s.oval(Math.cos(a)*2.4,2+i*.44,Math.sin(a)*2.4,.35,.6,.32,'bone');}
  return {weak:[0,5.3,3.35],r:.93,body:[0,6,0,3],height:18};
 },
 bell(s,limbs){
  const bell=new THREE.LatheGeometry([[2.9,3.3],[3.4,3.5],[3.3,3.9],[2.7,4.1],[2.25,6.3],[1.2,8.1],[.8,8.3]].map(p=>new THREE.Vector2(...p)),40);s.add(bell,'iron');s.torus(0,4,2.9,2.3,.36,'bone');s.oval(0,4,2.8,2.2,2,.3,'wound');
  for(let i=0;i<5;i++){s.torus(0,4.5+i*.6,0,2.8-i*.25,.11,'bone');}
  for(let i=0;i<4;i++){const side=i%2?-1:1,pair=Math.floor(i/2);crawlerArm(s,limbs,[side*2.2,5,0],[side*4.8,.12,3-pair*6],side,i,1.1);}for(const side of[-1,1])s.rod([[side*1,8,0],[side*2,10,0],[side*.8,10.8,.5]],.2,'iron');
  s.oval(0,8.9,1,1,1.1,.7,'bone');s.teeth(0,4,3,2.05,24);
  return {weak:[0,4,3.3],r:1.5,body:[0,6,0,3.4],height:11};
 },
 choir(s,limbs){
  s.oval(0,2,0,4.2,1.8,3.2,'flesh');
  for(let i=0;i<7;i++){const x=(i-3)*1.15,y=4.4+Math.sin(i*1.7)*1.5;const g=new THREE.Group(),k=new Sculpt(g);k.rod([[x*.7,1,0],[x,3.5,0],[x*.8,y+2,-.5]],.56,'flesh',.7);k.oval(x*.8,y+2,.2,.85,1.25,.65,'bone');k.torus(x*.8,y+2,.83,.52,.12,'flesh',.75,1.35);k.teeth(x*.8,y+2,.91,.46,9);k.flush();limbs.push(g);s.root.add(g);}
  for(let i=0;i<9;i++)s.rod([[(i-4)*.8,1,0],[(i-4)*1.3,.3,3],[(i-4)*1.45,.1,4.2]],.32,'bone');
  return {weak:[0,5.4,1],r:1.1,body:[0,3,0,3.9],height:9};
 },
 furnace(s,limbs){
  s.box(0,4,0,4.5,6.5,3.9,'iron');s.oval(0,7.7,0,2.5,2,2,'flesh');s.torus(0,4,2.2,1.45,.3,'bone');s.oval(0,4,2.3,1.4,1.4,.25,'wound');
  for(let i=-2;i<=2;i++){s.box(i*.7,4,2.65,.13,3.2,.15,'iron');s.rod([[i*.7,7,0],[i,10,0],[i*1.4,11.4,-1]],.23,'iron');}
  for(let i=0;i<4;i++){const side=i%2?-1:1; crawlerArm(s,limbs,[side*2,5-Math.floor(i/2)*2,0],[side*4.8,.15,3-Math.floor(i/2)*5],side,i,1.05);}for(let i=0;i<8;i++){s.box(0,1+i*.7,-2.1,4.8,.16,.3,'iron');s.oval((i%2?1:-1)*1.5,6.5+i*.2,.5,.42,.7,.5,'flesh');}
  return {weak:[0,4,2.75],r:1.2,body:[0,4.2,0,3.1],height:12};
 },
 lantern(s,limbs){
  s.oval(0,3.8,0,1.4,3.4,1.5,'hide');s.oval(0,6.8,.7,1.4,1.6,1.5,'flesh');s.torus(0,6.8,2.1,.8,.2,'bone');s.teeth(0,6.8,2.1,.72,16);
  for(let i=0;i<6;i++){const side=i%2?-1:1,pair=Math.floor(i/2);crawlerArm(s,limbs,[side*.9,4-pair*.7,0],[side*(4.7-pair*.5),.1,3-pair*3],side,i,.58);}for(let i=0;i<15;i++)s.oval(0,1+i*.4,-1.1,.22,.16,.25,'bone');
  s.rod([[0,7,-.3],[0,10,0],[0,10.5,2.5],[0,8,4]],.14,'bone');s.oval(0,8,4,.6,.8,.6,'flesh');
  return {weak:[0,6.8,2.3],r:.85,body:[0,4,0,2.2],height:11};
 },
 mire(s,limbs){
  s.oval(0,2.2,0,3.5,2.3,3,'flesh');s.rod([[0,2,0],[0,4,0],[-.4,6,0]],1.5,'flesh',.6);s.oval(-.4,6.5,.2,1,1.7,1.1,'bone');s.oval(-.4,6.2,1.15,.7,1.1,.2,'wound');
  for(let i=0;i<12;i++){const a=i*TAU/12;const g=new THREE.Group(),k=new Sculpt(g);k.rod([[Math.cos(a),6,Math.sin(a)],[Math.cos(a)*2.8,3,Math.sin(a)*2.8],[Math.cos(a)*5,.05,Math.sin(a)*5]],.2,'hide',.08);k.flush();limbs.push(g);s.root.add(g);}
  for(let i=0;i<4;i++){const side=i%2?-1:1,pair=Math.floor(i/2);crawlerArm(s,limbs,[side,4-pair*1.8,0],[side*3.7,.13,3.4-pair*6],side,i,.72);}
  for(let i=0;i<14;i++){const a=i*2.4;s.oval(Math.cos(a)*3,1.7+Math.sin(i)*.4,Math.sin(a)*2.5,.7,.65,.65,'wound');}
  return {weak:[-.4,6.2,1.45],r:.8,body:[0,2.7,0,3.4],height:8};
 },
 moth(s,limbs){
  s.oval(0,5,0,1.4,3,1.3,'hide');s.oval(0,7.8,.4,1.3,1.4,1.2,'flesh');s.oval(0,6.8,1.1,.8,1,.35,'wound');
  for(const side of[-1,1]){const g=new THREE.Group(),k=new Sculpt(g);const outline=[[.9,5.5],[2.2,10.2],[4.8,11.8],[9.6,10.1],[8.7,7.8],[9.3,5.8],[7.4,6.2],[8.1,3.4],[5.2,4.1],[4.5,1.4],[2.2,3.5]];const shape=new THREE.Shape(outline.map(([x,y])=>new THREE.Vector2(side*x,y)));const wing=new THREE.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:false,steps:1});k.add(wing,'bone');k.oval(side*4.8,7,.25,1.7,2.15,.11,'hide',side*.23);k.oval(side*4.8,7,.39,.65,.9,.1,'wound');for(let j=0;j<8;j++){const a=j*TAU/8;k.rod([[side*4.8+Math.cos(a)*1.8,7+Math.sin(a)*2.15,.3],[side*4.8+Math.cos(a)*2.3,7+Math.sin(a)*2.65,.22]],.11,'hide');}for(let j=0;j<6;j++)k.rod([[side*(3+j),4+j*.15,.15],[side*(3.5+j),1+j*.25,-.1],[side*(3.3+j),.5+j*.25,.1]],.075,'flesh',.02);for(let i=0;i<7;i++)k.rod([[side,5,.5],[side*(4+i*.55),3+i*.8,.55],[side*(7+i*.2),4+i*.4,.4]],.075,'iron');k.flush();limbs.push(g);s.root.add(g);s.rod([[side*.7,8,0],[side*1.4,10,.4],[side*2,10.5,1.4]],.12,'bone');for(let j=0;j<3;j++)s.rod([[side,4+j,0],[side*2.3,2+j,1],[side*2.8,.15+j*.2,3]],.18,'flesh');}
  return {weak:[0,6.8,1.5],r:.95,body:[0,5,0,2.2],height:12};
 },
 antler(s,limbs){
  s.oval(0,3.5,-1,2,2,4.4,'iron');s.rod([[0,4,1],[0,6,2],[0,7.5,3]],1,'flesh',.7);s.oval(0,7.3,3.5,1.4,1.4,1.3,'bone');s.oval(0,6.8,4.6,.85,.95,.2,'wound');
  for(const side of[-1,1]){s.rod([[side*.9,8,3],[side*2.5,10,2],[side*5,11,0]],.3,'bone',.05);for(let i=0;i<4;i++)s.rod([[side*(2+i*.7),9+i*.6,2-i*.5],[side*(1.8+i*.8),12+i*.4,1-i*.6]],.2,'bone');for(let j=0;j<3;j++)crawlerArm(s,limbs,[side*1.4,3,-3+j*2],[side*3.3,.12,-2+j*2],side,j*2+(side<0?1:0),.76);s.box(side*1.8,3,-1,.3,1.2,5,'iron');}
  return {weak:[0,6.8,4.85],r:.95,body:[0,3.8,-.5,3.8],height:14};
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
  return {weak:[0,4.7,1.94],r:.74,body:[0,3.6,0,2.7],height:10,head,jaw,eyes:[[-.34,7.76,1.91],[.34,7.76,1.91]],mobile:true};
 },
 burrow(s,limbs){
  // A mole-like corpse adapted into a shovel: bony digging hands, segmented
  // earth-encrusted mantle, split vertical throat, and a blind human jaw beneath.
  s.oval(0,3.1,-1.6,3.2,2.3,4.1,'hide');s.rod([[0,1.5,-5],[0,3,-3],[0,4.8,0],[0,5.4,1.8]],1.1,'flesh',.8);
  for(let i=0;i<8;i++){const z=-4.2+i*.85,y=3.5+Math.sin(i/8*Math.PI)*1.3;s.oval(0,y,z,2.8-i*.11,.7,.9,'wood');for(const side of[-1,1])s.rod([[side*2.1,y,z],[side*3,y+.9,z-.4],[side*3.45,y+.6,z-.8]],.22,'bone',.03);}
  s.oval(0,5.3,2.1,1.9,1.8,1.4,'bone');s.oval(0,4.8,3.25,1.1,1.7,.26,'wound');
  for(const side of[-1,1]){s.rod([[side*.27,6.8,3.35],[side*1.3,5.8,3.55],[side*1.0,3.8,3.5],[side*.3,3.4,3.4]],.32,'flesh',.55);for(let j=0;j<10;j++){const y=3.8+j*.27;s.rod([[side*(.9+Math.sin(j/9*Math.PI)*.3),y,3.65],[side*.48,y-.1,3.9],[side*.3,y-.15,3.75]],.14,'bone',.015);}}
  for(let i=0;i<6;i++){const side=i%2?-1:1,pair=Math.floor(i/2);crawlerArm(s,limbs,[side*2,3.8-pair*.7,1-pair*1.6],[side*(5.4-pair*.4),.12,4-pair*4],side,i,pair===0?1.45:.85);}
  for(let i=0;i<9;i++)s.rod([[Math.sin(i*2.4)*2.5,2,-3+i*.5],[Math.sin(i*2.4)*3.5,.7,-4+i*.5]],.19,'flesh',.02);
  return {weak:[0,4.95,3.85],r:.88,body:[0,3,-1,3.8],height:8,mobile:true};
 }

};
export function buildBossRig(def){
 const root=new THREE.Group();root.name='boss-'+def.id;const body=new THREE.Group();root.add(body);const s=new Sculpt(body),limbs=[];const anatomy=SHAPES[def.shape](s,limbs);s.flush();
 const tissue=tissueSurface('flesh');const membrane=new THREE.MeshStandardMaterial({color:0x582b35,emissive:0x7a3037,emissiveIntensity:.15,roughness:.35,metalness:.04,map:tissue.map,bumpMap:tissue.bump,bumpScale:.045});membrane.name='boss-open-heart';
 const weak=new THREE.Mesh(new THREE.SphereGeometry(anatomy.r,20,14),membrane);weak.position.set(...anatomy.weak);weak.scale.z=.42;body.add(weak);
 const eyeMat=new THREE.MeshBasicMaterial({color:def.skin.colors.accent,toneMapped:false});const eyes=[];
 for(const side of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.105,10,8),eyeMat);if(anatomy.eyes)e.position.set(...anatomy.eyes[side===-1?0:1]);else e.position.set(anatomy.weak[0]+side*(anatomy.r+ .38),anatomy.weak[1]+.8,anatomy.weak[2]-.2);if(anatomy.head){e.position.sub(anatomy.head.position);anatomy.head.add(e);}else body.add(e);eyes.push(e);}
 // A soft contact shadow seats the creature in the floor without another shadow pass.
 const shadowData=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const d=Math.hypot((x-31.5)/32,(y-31.5)/32);shadowData[(y*64+x)*4+3]=Math.round(Math.max(0,1-d*d)**2*175);}
 const shadowMap=new THREE.DataTexture(shadowData,64,64,THREE.RGBAFormat);shadowMap.needsUpdate=true;shadowMap.magFilter=THREE.LinearFilter;
 const shadowMat=new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,color:0x000000,polygonOffset:true,polygonOffsetFactor:-1});const shadow=new THREE.Mesh(new THREE.PlaneGeometry(def.shape==='sea'?23:16,def.shape==='sea'?23:16),shadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=.09;root.add(shadow);
 const veins=new THREE.MeshStandardMaterial({color:0x311018,roughness:.37});for(let i=0;i<5;i++){const r=anatomy.r,x=(i-2)*r*.28,points=[new THREE.Vector3(x,-r*.74,r*.65),new THREE.Vector3(x+Math.sin(i)*r*.16,0,r*1.03),new THREE.Vector3(x-r*.15,r*.71,r*.69)],g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,r*.036,6,false),m=new THREE.Mesh(g,veins);m.userData.weakTissue=true;weak.add(m);}
 const zone=()=>weak.getWorldPosition(new THREE.Vector3());
 return {root,body,limbs,weak,membrane,eyes,anatomy,zone,
  pose(t,open,telegraph,dead,motion={}){
   const mobile=!!anatomy.mobile||['lantern','antler','bell','furnace','mire'].includes(def.shape),speed=Math.min(1,(motion.speed||0)/4),gait=motion.gait||0;
   const recoil=motion.recoil||0,rise=motion.state==='rising'?Math.min(1,(motion.stateT||0)/(def.ambush?.7:2.1)):1;
   body.position.y=dead?-Math.min(.7,dead*.18):Math.sin(mobile?gait*3.6:t*1.2)*(mobile?.13*speed:.055);
   body.scale.y=dead?1-Math.min(.65,dead*.22):1;
   body.rotation.x=dead?.2:mobile?-.13-telegraph*.08+recoil*.15:recoil*.05;
   body.rotation.z=dead?Math.min(.45,dead*.15):Math.sin(mobile?gait*1.8:t*.5)*(mobile?.055*speed:.013);
   if(def.ambush&&!dead){body.position.y-=motion.state==='dormant'?10:(1-rise)*10;body.rotation.x+=(1-rise)*.45;}
   if(def.shape==='moth'&&!dead){body.position.y+=1.2+Math.sin(t*1.7)*.65;body.rotation.x+=speed*.16;}
   if(motion.state==='climbing'&&!dead){body.position.y+=motion.climb||0;body.rotation.x=-.55;}
   if(anatomy.head){anatomy.head.rotation.y=Math.sin(t*.7)*.07+(motion.turn||0)*.22;anatomy.head.rotation.x=-telegraph*.2+recoil*.33;anatomy.head.rotation.z=Math.sin(t*.83)*.08;}
   if(anatomy.jaw){anatomy.jaw.rotation.x=.15+telegraph*.55+Math.sin(t*2.3)*.09;anatomy.jaw.rotation.z=Math.sin(t*1.7)*.07+recoil*.15;}
   eyeMat.color.setHex(dead?0x111218:def.skin.colors.accent);
   motion.body=body;
   for(let i=0;i<limbs.length;i++){const l=limbs[i];if(l.userData.ik){poseCrawler(l.userData.ik,t,motion,telegraph,dead);continue;}
    l.rotation.y=Math.sin(t*.65+i)*.07;l.rotation.z=Math.sin(t*1.05+i*.9)*(.045+telegraph*.14);
    if(def.shape==='moth'){l.rotation.y=(i?1:-1)*(.25+Math.sin(t*(speed?5.2:2.5))*(.3+speed*.16)+telegraph*.6);l.rotation.z=(i?1:-1)*(.06+Math.sin(t*2.5)*.1);}
    if(def.shape==='sea'){l.rotation.x=Math.sin(t*1.5+i)*.10+telegraph*.08;l.rotation.z=Math.sin(t*1.2+i*.9)*.14;}
    if(def.shape==='tree')l.rotation.z=Math.sin(t*.8+i*.7)*(.03+telegraph*.16)+recoil*.07;
    if(def.shape==='choir')l.rotation.x=Math.sin(t*1.9+i)*.1-telegraph*.22;
   }
   membrane.color.setHex(open?0x944153:0x3d2830);membrane.emissive.setHex(open?0xbd5249:0x461423);membrane.emissiveIntensity=dead?0:open?.38:.05;weak.scale.set(1+Math.sin(t*4)*.035,1+Math.sin(t*4)*.035,.42);
  },
  dispose(){root.traverse(o=>o.geometry?.dispose());veins.dispose();shadowMap.dispose();shadowMat.dispose();membrane.map?.dispose();membrane.bumpMap?.dispose();membrane.dispose();eyeMat.dispose();root.removeFromParent();}
 };
}
