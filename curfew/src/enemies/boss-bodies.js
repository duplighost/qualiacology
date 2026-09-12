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
  s.oval(0,6,0,3.2,3.6,2.9,'iron');s.torus(0,4,2.9,2.3,.36,'bone');s.oval(0,4,2.8,2.2,2,.3,'wound');
  for(let i=0;i<5;i++){s.torus(0,4.5+i*.6,0,2.8-i*.25,.11,'bone');}
  for(const side of[-1,1]){s.rod([[side*1.8,5,0],[side*4,3,1],[side*4.5,.4,3]],.95,'flesh');for(let i=0;i<4;i++)s.rod([[side*4.5,.5,3],[side*(3.6+i*.5),.15,4],[side*(3.4+i*.6),.1,5.4]],.28,'bone');s.rod([[side*1,8,0],[side*2,10,0],[side*.8,10.8,.5]],.2,'iron');}
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
  for(const side of[-1,1]){s.rod([[side*2,5,0],[side*4,3,1],[side*5,.6,3]],1,'flesh');s.oval(side*5,.6,3,1.4,.7,1.4,'bone');s.rod([[side*1,1,0],[side*2,.3,-2]],.9,'iron');}
  return {weak:[0,4,2.75],r:1.2,body:[0,4.2,0,3.1],height:12};
 },
 lantern(s,limbs){
  s.oval(0,3.8,0,1.4,3.4,1.5,'hide');s.oval(0,6.8,.7,1.4,1.6,1.5,'flesh');s.torus(0,6.8,2.1,.8,.2,'bone');s.teeth(0,6.8,2.1,.72,16);
  for(const side of[-1,1]){s.rod([[side*.8,3,0],[side*3,2,0],[side*4.5,.1,2]],.28,'bone');s.rod([[side*.8,5,0],[side*3.5,4,-1],[side*5,0,-2]],.25,'flesh');s.rod([[side*.7,1,0],[side*2,.1,-3]],.25,'bone');}
  s.rod([[0,7,-.3],[0,10,0],[0,10.5,2.5],[0,8,4]],.14,'bone');s.oval(0,8,4,.6,.8,.6,'flesh');
  return {weak:[0,6.8,2.3],r:.85,body:[0,4,0,2.2],height:11};
 },
 mire(s,limbs){
  s.oval(0,2.2,0,3.5,2.3,3,'flesh');s.rod([[0,2,0],[0,4,0],[-.4,6,0]],1.5,'flesh',.6);s.oval(-.4,6.5,.2,1,1.7,1.1,'bone');s.oval(-.4,6.2,1.15,.7,1.1,.2,'wound');
  for(let i=0;i<12;i++){const a=i*TAU/12;const g=new THREE.Group(),k=new Sculpt(g);k.rod([[Math.cos(a),6,Math.sin(a)],[Math.cos(a)*2.8,3,Math.sin(a)*2.8],[Math.cos(a)*5,.05,Math.sin(a)*5]],.2,'hide',.08);k.flush();limbs.push(g);s.root.add(g);}
  for(const side of[-1,1])s.rod([[side,4,0],[side*3,3,1],[side*3.8,.5,3.4]],.45,'flesh');
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
  for(const side of[-1,1]){s.rod([[side*.9,8,3],[side*2.5,10,2],[side*5,11,0]],.3,'bone',.05);for(let i=0;i<4;i++)s.rod([[side*(2+i*.7),9+i*.6,2-i*.5],[side*(1.8+i*.8),12+i*.4,1-i*.6]],.2,'bone');for(let j=0;j<3;j++)s.rod([[side*1.4,3,-3+j*2],[side*2.5,1.7,-2+j*2],[side*3,0,-1+j*2]],.5,'bone');s.box(side*1.8,3,-1,.3,1.2,5,'iron');}
  return {weak:[0,6.8,4.85],r:.95,body:[0,3.8,-.5,3.8],height:14};
 },
 crypt(s,limbs){
  s.oval(0,2.5,-1,2.7,2.6,2.2,'hide');s.oval(0,5,0,2.1,2.9,1.6,'flesh');s.oval(0,7.9,.7,1.5,1.8,1.25,'bone');
  for(const side of[-1,1]){s.oval(side*.55,8.2,1.88,.42,.52,.22,'hide');s.rod([[side*.14,8.65,1.95],[side*.64,8.8,1.78],[side*1.11,8.51,1.61]],.14,'bone');s.oval(side*1,7.55,1.7,.35,.53,.31,'bone');for(let i=0;i<8;i++)s.rod([[side*.13,5.7-i*.34,1.84],[side*1.3,5.9-i*.36,1.7],[side*2.1,5.55-i*.36,1.05]],.12,'bone');}
  s.oval(0,7.9,2.01,.16,.4,.12,'hide');s.oval(0,7.12,1.98,.6,.62,.15,'wound');s.teeth(0,7.1,2.13,.53,11);s.oval(0,5.25,1.76,.8,1.2,.2,'wound');

  for(let i=0;i<9;i++){const a=i*TAU/9;s.rod([[Math.cos(a)*1.5,8.4,Math.sin(a)*1.5],[Math.cos(a)*2,10.3,Math.sin(a)*2]],.18,'iron');}
  for(let i=0;i<6;i++){const side=i%2?-1:1,y=3+Math.floor(i/2)*1.2;const g=new THREE.Group(),k=new Sculpt(g);k.rod([[side*2,y,0],[side*(4+i*.25),y-1,1],[side*(5+i*.25),.5,3]],.48,'flesh');for(let j=0;j<4;j++)k.rod([[side*(5+i*.25),.5,3],[side*(5+i*.25)+(j-1.5)*.27,.1,4.5]],.14,'bone');k.flush();limbs.push(g);s.root.add(g);}
  for(let i=0;i<12;i++)s.torus(0,2.5+i*.35,1.3,1.2+i*.07,.07,'bone',1,.6);
  return {weak:[0,5.25,2.0],r:.76,body:[0,4,0,3.2],height:11,eyes:[[-.55,8.2,2.08],[.55,8.2,2.08]]};
 }
};
export function buildBossRig(def){
 const root=new THREE.Group();root.name='boss-'+def.id;const body=new THREE.Group();root.add(body);const s=new Sculpt(body),limbs=[];const anatomy=SHAPES[def.shape](s,limbs);s.flush();
 const tissue=tissueSurface('flesh');const membrane=new THREE.MeshStandardMaterial({color:0x582b35,emissive:0x7a3037,emissiveIntensity:.15,roughness:.35,metalness:.04,map:tissue.map,bumpMap:tissue.bump,bumpScale:.045});membrane.name='boss-open-heart';
 const weak=new THREE.Mesh(new THREE.SphereGeometry(anatomy.r,20,14),membrane);weak.position.set(...anatomy.weak);weak.scale.z=.42;body.add(weak);
 const eyeMat=new THREE.MeshBasicMaterial({color:def.skin.colors.accent,toneMapped:false});const eyes=[];
 for(const side of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.105,10,8),eyeMat);if(anatomy.eyes)e.position.set(...anatomy.eyes[side===-1?0:1]);else e.position.set(anatomy.weak[0]+side*(anatomy.r+ .38),anatomy.weak[1]+.8,anatomy.weak[2]-.2);body.add(e);eyes.push(e);}
 // A soft contact shadow seats the creature in the floor without another shadow pass.
 const shadowData=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const d=Math.hypot((x-31.5)/32,(y-31.5)/32);shadowData[(y*64+x)*4+3]=Math.round(Math.max(0,1-d*d)**2*175);}
 const shadowMap=new THREE.DataTexture(shadowData,64,64,THREE.RGBAFormat);shadowMap.needsUpdate=true;shadowMap.magFilter=THREE.LinearFilter;
 const shadowMat=new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,color:0x000000,polygonOffset:true,polygonOffsetFactor:-1});const shadow=new THREE.Mesh(new THREE.PlaneGeometry(def.shape==='sea'?23:16,def.shape==='sea'?23:16),shadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=.09;root.add(shadow);
 const veins=new THREE.MeshStandardMaterial({color:0x311018,roughness:.37});for(let i=0;i<5;i++){const r=anatomy.r,x=(i-2)*r*.28,points=[new THREE.Vector3(x,-r*.74,r*.65),new THREE.Vector3(x+Math.sin(i)*r*.16,0,r*1.03),new THREE.Vector3(x-r*.15,r*.71,r*.69)],g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,r*.036,6,false),m=new THREE.Mesh(g,veins);m.userData.weakTissue=true;weak.add(m);}
 const zone=()=>weak.getWorldPosition(new THREE.Vector3());
 return {root,body,limbs,weak,membrane,eyes,anatomy,zone,
  pose(t,open,telegraph,dead){body.position.y=dead?-Math.min(.4,dead*.1):Math.sin(t*1.2)*.055;body.scale.y=dead?1-Math.min(.63,dead*.21):1;body.rotation.z=dead?Math.min(.4,dead*.13):Math.sin(t*.5)*.013;eyeMat.color.setHex(dead?0x111218:def.skin.colors.accent);for(let i=0;i<limbs.length;i++){const l=limbs[i];l.rotation.y=Math.sin(t*.65+i)*.045;l.rotation.z=Math.sin(t*1.05+i*.9)*(.018+telegraph*.045);if(def.shape==='moth')l.rotation.y=(i?1:-1)*(.16+Math.sin(t*.7)*.15+telegraph*.13);}membrane.color.setHex(open?0x944153:0x3d2830);membrane.emissive.setHex(open?0xbd5249:0x461423);membrane.emissiveIntensity=dead?0:open?.38:.05;weak.scale.set(1+Math.sin(t*4)*.035,1+Math.sin(t*4)*.035,.42);},
  dispose(){root.traverse(o=>o.geometry?.dispose());veins.dispose();shadowMap.dispose();shadowMat.dispose();membrane.map?.dispose();membrane.bumpMap?.dispose();membrane.dispose();eyeMat.dispose();root.removeFromParent();}
 };
}
