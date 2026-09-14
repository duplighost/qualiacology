// Authored encounter places. Static scenery is merged by material; moving atmosphere
// reads the encounter state and never changes collision or conceals a warning mark.
import * as THREE from 'three';
import {Kit} from './sites.js';
import {projectPlaceSurfaceUVs} from './place-surfaces.js';
import {prepareWaterGeometry} from './water-surface.js';
import {roadDistance} from './roads.js';

const TAU=Math.PI*2;
const PALETTES={
 sea:{floor:[.075,.125,.127],light:0x609d9e,kind:'silt'},
 tree:{floor:[.12,.077,.055],light:0xb37860,kind:'earth'},
 bell:{floor:[.105,.083,.06],light:0xb69a54,kind:'foundry'},
 choir:{floor:[.12,.105,.107],light:0xa59bba,kind:'grain'},
 furnace:{floor:[.075,.062,.055],light:0xd2743c,kind:'ash'},
 lantern:{floor:[.076,.087,.108],light:0x7187b1,kind:'cobbles'},
 mire:{floor:[.06,.085,.069],light:0x92ad7d,kind:'mud'},
 moth:{floor:[.10,.12,.145],light:0x98bdd6,kind:'tiles'},
 antler:{floor:[.095,.097,.089],light:0xa78e72,kind:'ballast'},
 crypt:{floor:[.099,.092,.109],light:0x9996bc,kind:'tombs'},
 burrow:{floor:[.12,.075,.045],light:0xa17145,kind:'earth'},
};
const STONE=[.24,.225,.20],DARK=[.04,.043,.047],IRON=[.13,.135,.14],RUST=[.24,.115,.062],WOOD=[.18,.11,.06],BONE=[.40,.36,.27];
const hash=(x,z)=>{let n=Math.imul(x,374761393)+Math.imul(z,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz,a=u*u*(3-2*u),b=v*v*(3-2*v);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),a),THREE.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),a),b);}
function tileNoise(x,z,px,pz=px){const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz,a=u*u*(3-2*u),b=v*v*(3-2*v),h=(i,j)=>hash((i%px+px)%px,(j%pz+pz)%pz);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(h(ix,iz),h(ix+1,iz),a),THREE.MathUtils.lerp(h(ix,iz+1),h(ix+1,iz+1),a),b);}
function rod(k,a,b,r,col=IRON){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);const g=new THREE.CylinderGeometry(r*.78,r,d.length(),7);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate(...p.add(q).multiplyScalar(.5).toArray());k.push(g,col);}
function curve(k,points,r,col=IRON){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));k.push(new THREE.TubeGeometry(path,Math.max(10,points.length*4),r,6,false),col);}
function ring(k,x,y,z,r,t,col=IRON,rx=0){k.at(new THREE.TorusGeometry(r,t,7,36),col,x,y,z,0,rx);}

// Five frequencies of colour/height describe the ground under a close torch. Tile
// identity is expressed in the surface itself, not a different tint on the same paving.
function groundMaps(kind){
 const size=256,rgb=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,n=tileNoise(u*16,v*16,16),fine=hash(x,y),coarse=tileNoise(u*4,v*4,4);
  let grain=.48+n*.24+fine*.18,h=n*.4+fine*.16;
  if(kind==='tiles'||kind==='tombs'||kind==='cobbles'){
   const nx=kind==='tombs'?4:kind==='tiles'?8:12,nz=kind==='tombs'?2:kind==='tiles'?8:10;
   const row=Math.floor(v*nz),shifted=u*nx+(kind==='cobbles'?row%2*.5:0),gx=shifted%1,gz=v*nz%1;
   const mortar=Math.min(gx,1-gx,gz,1-gz)<.036,stone=hash(Math.floor(shifted)%nx,row);
   grain=mortar?.22:.54+stone*.28+n*.15+fine*.05;h=mortar?.08:.62+n*.18;
   if(kind==='tiles'&&(Math.floor(u*8)+Math.floor(v*8))%2)grain*=.66;
  }else if(kind==='foundry'||kind==='ash'){
   const crack=Math.abs(tileNoise(u*9+n*.6,v*9,9)-.5)<.025;
   grain=(crack?.24:.43+n*.31+fine*.17)*(kind==='ash'?.82:1);h=crack?.03:.46+n*.3;
  }else if(kind==='ballast'){
   const cell=hash(Math.floor(u*40),Math.floor(v*40));grain=.3+cell*.49+fine*.16;h=cell*.65+fine*.1;
  }else if(kind==='grain'){
   const cut=Math.min(u*7%1,v*7%1)<.021;grain=cut?.25:.56+n*.15+fine*.22;h=cut?.1:.6+n*.16;
  }else{
   const wet=coarse<.43;grain=(.44+n*.30+fine*.15)*(wet?.75:1);h=n*.52+fine*.23;
   if(kind==='earth'){const rut=Math.pow(.5+.5*Math.sin(u*TAU*8+tileNoise(u*2,v*3,2,3)*.7),8);grain-=rut*.12;h-=rut*.12;}
  }
  const i=(y*size+x)*4,c=Math.max(0,Math.min(255,Math.round(grain*255))),b=Math.max(0,Math.min(255,Math.round(h*255)));
  rgb[i]=rgb[i+1]=rgb[i+2]=c;rgb[i+3]=255;height[i]=height[i+1]=height[i+2]=b;height[i+3]=255;
 }
 const map=new THREE.DataTexture(rgb,size,size),bump=new THREE.DataTexture(height,size,size);
 for(const t of[map,bump]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;}
 return {map,bump};
}

export function createBossGroundLibrary(){const out={};for(const p of Object.values(PALETTES))if(!out[p.kind])out[p.kind]=groundMaps(p.kind);return out;}

export function buildBossPlaceArt(owner,s,root){
 const palette=PALETTES[s.shape],kits={stone:new Kit(),metal:new Kit(),timber:new Kit(),bone:new Kit(),glass:new Kit()},glow=new Kit();
 const k=kits.stone,metal=kits.metal,wood=kits.timber,bone=kits.bone;
 const col=owner._sys('collision'),chunk='boss-site:'+s.id,animated=[];
 const solid=(family,x,y,z,w,h,d,color=STONE,yaw=0)=>{
  kits[family].box(w,h,d,x,y+h/2,z,color,yaw);
  col?.addCollider({kind:'obb',x:s.x+x,z:s.z+z,hx:w/2,hz:d/2,yaw,y0:s.y+y,y1:s.y+y+h,tag:family==='timber'?'wood':'stone',standable:true,authored:true},chunk);
 };
 const pillar=(family,x,z,r,h,color=STONE,y=0)=>{
  kits[family].cyl(r*.9,r,h,12,x,y+h/2,z,color);
  col?.addCollider({kind:'circle',x:s.x+x,z:s.z+z,r,y0:s.y+y,y1:s.y+y+h,tag:family==='timber'?'trunk':'stone',authored:true},chunk);
 };
 const cloth=(x,y,z,w,h,color,phase=0)=>{
  const geo=new THREE.PlaneGeometry(w,h,6,9),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const yy=p.getY(i),xx=p.getX(i);p.setZ(i,Math.sin(xx*2.5+yy*.9+phase)*.16*(.3+(h/2-yy)/h));if(yy<-h*.35)p.setY(i,yy+(hash(i,33)-.5)*.8);}
  geo.computeVertexNormals();const material=new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide,emissive:palette.light,emissiveIntensity:.012});
  const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);root.add(m);owner.ownedMaterials.add(material);animated.push({mesh:m,phase,y,kind:'cloth'});
 };
 const water=(x,z,rx,rz)=>{const geo=new THREE.CircleGeometry(1,40);geo.rotateX(-Math.PI/2);geo.scale(rx,1,rz);prepareWaterGeometry(geo,{variant:'pool'},rx,rz,rx,rz);const m=new THREE.Mesh(geo,owner.waterMaterial);m.position.set(x,.092,z);root.add(m);};
 // The perimeter is irregular and graded into the terrain; the fight surface is
 // flat. All ornamentation within the dodge lane is flush with that surface.
 if(!s.ambush){
  const maps=owner.groundLibrary[palette.kind],material=new THREE.MeshStandardMaterial({vertexColors:true,map:maps.map,bumpMap:maps.bump,bumpScale:palette.kind==='ballast'?.075:.045,roughness:s.shape==='mire'||s.shape==='sea'?.53:.9,metalness:s.shape==='bell'?.18:.035,emissive:palette.light,emissiveIntensity:.016});material.name=s.id+'-arena-ground';s.groundMaterial=material;owner.ownedMaterials.add(material);
  const floor=new THREE.PlaneGeometry(92,92,46,46);floor.rotateX(-Math.PI/2);const p=floor.attributes.position,c=new Float32Array(p.count*3),uv=floor.attributes.uv;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),edge=Math.max(Math.abs(x),Math.abs(z)),n=noise(x*.16+100,z*.16+100),wear=noise(x*.04+70,z*.04+70),f=.8+n*.36+wear*.13;
   p.setY(i,.073-Math.max(0,edge-40)*.037);uv.setXY(i,x/8,z/8);for(let j=0;j<3;j++)c[i*3+j]=palette.floor[j]*f;
  }floor.setAttribute('color',new THREE.BufferAttribute(c,3));floor.computeVertexNormals();const m=new THREE.Mesh(floor,material);m.name=s.id+'-'+palette.kind+'-ground';m.receiveShadow=true;root.add(m);
  // Coloured surfaces follow the same physical height as the existing approach.
  col?.addCollider({kind:'obb',x:s.x,z:s.z,hx:40,hz:40,y0:s.y-.08,y1:s.y+.073,tag:'floor',standable:true,authored:true},chunk);
 }

 if(s.shape==='sea'){
  // A lock crane holds the spine of a vessel over a salt-stripped ship grave.
  for(const side of[-1,1]){
   solid('stone',side*35,0,-22,8,2.6,8,[.17,.22,.21]);
   for(let j=0;j<6;j++){k.box(8.05,.16,8.05,side*35,.5+j*.35,-22,[.28,.32,.27]);}
   pillar('metal',side*35,-24,.9,24,RUST);
   for(let i=0;i<8;i++)curve(bone,[[side*25,.3,-27+i*4],[side*30,2.8,-27+i*4],[side*29,6.8,-27+i*4],[side*24,9,-27+i*4]],.16,BONE);
   for(let j=0;j<4;j++)ring(metal,side*27,.6,-21+j*10,.8,.11,RUST,Math.PI/2);
  }
  rod(metal,[-35,24,-24],[18,24,-24],.6,RUST);rod(metal,[-35,18,-24],[7,24,-24],.23,IRON);
  for(const x of[-16,2,17]){rod(metal,[x,24,-24],[x,11,-24],.048,IRON);ring(metal,x,10.6,-24,.45,.1,RUST);}
  for(let i=0;i<11;i++){const z=-31+i*5;solid('timber',-39,0,z,4,.7,3.3,WOOD);}
  for(let j=0;j<8;j++){const x=-20+j*5;glow.box(.13,2.3+.8*Math.sin(j),.03,x,2.1,-32.44,[.08,.26,.24]);}
  cloth(-33,18,-23,5,8,0x535449,1.3);
 }else if(s.shape==='tree'){
  // The orchard has grown a ribbed vault from grafted trees; the central rows
  // remain open, with braided roots and baskets confined to their ends.
  for(const side of[-1,1])for(let row=0;row<4;row++){
   const z=-28+row*17,x=side*(31+row%2*3);pillar('timber',x,z,1.1,8,WOOD);
   curve(wood,[[x,3,z],[side*28,9,z],[side*18,15,z-2],[side*5,17,z-4]],.46,WOOD);
   for(let b=0;b<3;b++)curve(wood,[[side*(25-b*5),11+b*2,z-1],[side*(26-b*4),16+b,z-5],[side*(30-b*3),18+b,z-7]],.16,WOOD);
   for(let r=0;r<4;r++)curve(wood,[[x,2,z],[x+side*(2+r*.5),.7,z+r-2],[x+side*(4+r),.1,z+r*2-4]],.20,WOOD);
   if(row%2===0){rod(wood,[side*20,14,z-3],[side*20,10,z-3],.025,WOOD);bone.at(new THREE.IcosahedronGeometry(.54,1),[.32,.2,.15],side*20,9.6,z-3);}
  }
  for(let i=0;i<7;i++){const x=-21+i*7;wood.box(.18,.027,70,x,.092,0,[.05,.031,.019]);}
  for(const side of[-1,1])solid('timber',side*32,0,24,4,1.4,2,WOOD);
  cloth(-28,8,-27,2,5,0x79664e,2);
 }else if(s.shape==='bell'){
  // Open-backed bellfoundry, with a suspended mould large enough to dwarf the
  // walking bell and a gallery of broken brass bells against the night sky.
  for(const side of[-1,1]){solid('stone',side*36,0,-27,5,24,6,[.20,.16,.12]);solid('stone',side*36,0,3,5,13,6,[.20,.16,.12]);}
  solid('metal',0,22,-27,77,2,4,RUST);rod(metal,[-36,13,-27],[0,23,-27],.22,IRON);rod(metal,[36,13,-27],[0,23,-27],.22,IRON);
  for(let i=0;i<5;i++){const x=-25+i*12.5,h=7+(i%3)*2.7;rod(metal,[x,23,-27],[x,h+5,-27],.09,IRON);metal.tube(1.5,3.6,5,28,x,h+2.5,-27,[.35,.23,.085]);ring(metal,x,h,-27,3.6,.2,[.36,.25,.11],Math.PI/2);metal.cyl(.33,.5,2.7,10,x,h+.3,-27,IRON);}
  for(const side of[-1,1]){solid('stone',side*30,0,15,5,1.6,12,[.14,.12,.105]);for(let i=0;i<6;i++)metal.box(5.05,.08,.18,side*30,1.65,10+i*2,RUST);}
  for(const side of[-1,1]){metal.box(.19,.025,40,side*17,.096,1,[.37,.25,.10]);glow.box(.035,.016,38,side*17,.115,1,[.16,.095,.027]);}
 }else if(s.shape==='choir'){
  for(let i=0;i<5;i++){
   const x=(i-2)*13,h=19+i%2*5;
   for(const side of[-1,1]){metal.box(.23,h,1.2,x+side*3.5,h*.5,-28,IRON);}
   for(let j=0;j<4;j++){k.quad(1.15,2.2,x,5+j*3.4,-26.94,DARK);bone.box(1.4,.13,.5,x,3.95+j*3.4,-26.7,BONE);glow.quad(.11,1.7,x+.25,5+j*3.4,-26.89,[.19,.12,.17]);}
   curve(metal,[[x,15,-26.7],[x,20,-23],[x,22,-18]],.55,[.22,.20,.22]);ring(bone,x,22,-18,.72,.14,BONE);
  }
  solid('metal',0,13,-27,57,.5,2.4,IRON);for(let i=0;i<20;i++){metal.box(.07,1.4,.09,-27+i*2.8,14,-25.9,IRON);}metal.box(57,.09,.09,0,14.7,-25.9,IRON);
  for(const side of[-1,1])for(let i=0;i<4;i++){
   const x=side*33,z=-12+i*11;solid('stone',x,0,z,3.5,1.5,3,[.19,.15,.13]);
   for(let j=0;j<3;j++){bone.at(new THREE.SphereGeometry(.6,10,7),[.24,.20,.16],x-1+j,1.7,z);rod(bone,[x-1+j,1.7,z],[x-1+j,2,z+.45],.03,BONE);}
  }
  cloth(26,16,-26,3,9,0x6b595e,3.2);
 }else if(s.shape==='furnace'){
  for(const side of[-1,1]){
   solid('stone',side*23,0,-36,20,14,5,[.21,.105,.062]);
   for(let j=0;j<3;j++){const x=side*(17+j*5);metal.box(3.2,5.7,.08,x,4,-33.43,DARK);glow.quad(2.5,4.8,x,3.9,-33.36,[.83,.17,.025]);for(let q=0;q<4;q++)metal.box(.10,5,.3,x-1+q*.66,4,-33.2,IRON);}
   pillar('stone',side*37,-31,3.6,30,[.16,.10,.071]);
   for(let j=0;j<7;j++)ring(metal,side*37,3+j*3.6,-31,3.65,.10,RUST,Math.PI/2);
   for(let z=-15;z<26;z+=13)curve(metal,[[side*33,6,z],[side*27,11,z],[side*12,14,z]],.55,RUST);
  }
  solid('metal',0,16,-35,60,1.6,3,RUST);for(let x=-22;x<=22;x+=11){rod(metal,[x,17,-35],[x,10,-31],.06,IRON);ring(metal,x,9.5,-31,.65,.12,IRON);}
  for(let i=0;i<5;i++){const z=-24+i*12;metal.box(39,.028,.45,0,.101,z,IRON);for(let j=0;j<33;j++)metal.box(.11,.032,.8,-19+j*1.2,.109,z,RUST);}
 }else if(s.shape==='lantern'){
  // The viaduct's two enormous ribs read at county scale, while the missing
  // parapets and hanging empty lamps explain why the last lights disappeared.
  for(const z of[-29,23]){
   for(const side of[-1,1])pillar('stone',side*35,z,1.45,8,[.16,.18,.21]);
   curve(k,[[-35,0,z],[-34,12,z],[-24,24,z],[0,29,z],[24,24,z],[34,12,z],[35,0,z]],1.35,[.16,.18,.21]);
   solid('stone',0,29,z,76,2.6,6,[.17,.19,.22]);
   for(let x=-34;x<=34;x+=4){k.box(1.4,1.2,1.1,x,32.2,z+2.2,STONE);}
   for(let i=0;i<8;i++){
    const x=-25+i*7.1,drop=2+i%3*1.2;rod(metal,[x,28,z],[x,28-drop,z],.027,IRON);metal.tube(.30,.35,.8,8,x,27.6-drop,z,IRON);glow.cyl(.18,.18,.5,8,x,27.65-drop,z,[.20,.25,.38]);
   }
  }
  for(const side of[-1,1]){solid('stone',side*35,0,0,4,8,7,[.14,.15,.17]);for(let j=0;j<8;j++)k.box(4.08,.15,7.07,side*35,1+j*.8,0,[.24,.25,.27]);}
  for(let i=0;i<15;i++){const x=-27+i*3.8;metal.box(.025,.019,55,x,.095,-2,[.26,.29,.35]);}
 }else if(s.shape==='mire'){
  // A flooded wedding chapel. Stained lancets, bridal cloth and sunken pews
  // establish its former use without surrounding the fight with text.
  for(const side of[-1,1]){
   for(let i=0;i<4;i++){
    const z=-28+i*17;solid('stone',side*33,0,z,3,11,3,[.13,.17,.14]);
    curve(k,[[side*33,9,z],[side*24,14,z],[0,18,z]],.42,[.23,.27,.21]);
    for(let r=0;r<8;r++){const x=side*(35+hash(i,r)*6),zz=z-4+r;rod(wood,[x,0,zz],[x+.2,1.5+hash(r,i)*1.9,zz],.025,[.16,.18,.08]);}
   }
   for(let i=0;i<3;i++){const z=-15+i*15;solid('timber',side*29,0,z,5,.7,1.5,[.10,.13,.085]);solid('timber',side*31,0,z-.6,1,1.7,1.5,[.10,.13,.085]);}
   water(side*34,12,7,18);
  }
  for(const side of[-1,1])solid('stone',side*13,0,-37,10,15,3,[.14,.18,.15]);
  curve(k,[[-18,11,-35],[0,23,-35],[18,11,-35]],.6,[.25,.28,.21]);
  for(let i=0;i<12;i++){const a=i*TAU/12;glow.quad(1.1,2.3,Math.cos(a)*5,12+Math.sin(a)*5,-35.35,i%3?[.17,.24,.16]:[.24,.12,.10],a*.12);}
  ring(k,0,12,-35,6,.3,[.25,.27,.20]);cloth(-4,13,-34,4,12,0x8a8a70,.8);cloth(4,13,-34,4,12,0x89866d,2);
 }else if(s.shape==='moth'){
  // Broken glass is held high above the floor; silk, seed pods and astronomical
  // rings make this a ruined conservatory rather than another stone enclosure.
  for(let i=0;i<8;i++){
   const z=-29+i*8;
   for(const side of[-1,1]){
    solid('stone',side*33,0,z,1.4,3.2,2,[.17,.19,.23]);
    curve(metal,[[side*33,3,z],[side*27,16,z],[side*14,24,z],[0,26,z]],.16,IRON);
    if(i%2===0){cloth(side*30,12,z,3,7,0x767f83,i);}
    if(i%3!==1){const glass=new THREE.PlaneGeometry(8,5);glass.rotateY(side*Math.PI*.24);glass.rotateZ(side*.65);glass.translate(side*23,18,z);kits.glass.push(glass,[.12,.20,.23]);}
   }
  }
  for(const r of[5,8,11])ring(metal,0,21,-30,r,.11,[.25,.29,.32]);
  for(let i=0;i<20;i++){const a=i*2.399;rod(wood,[Math.cos(a)*27,3,-24+Math.sin(a)*9],[Math.cos(a+1)*19,22,-26],.016,[.31,.34,.33]);}
  for(const side of[-1,1])solid('stone',side*30,0,16,5,1.8,9,[.13,.16,.17]);
 }else if(s.shape==='antler'){
  // An abandoned train forms the far boundary, with an exploded boiler, red
  // semaphore eyes and an overhead signal rack. The charging line stays broad.
  for(const side of[-1,1]){
   pillar('metal',side*34,16,.35,15,IRON);metal.box(1,2.8,.65,side*34,13.8,16,IRON);
   for(let j=0;j<2;j++)glow.cyl(.28,.28,.11,14,side*34,13+j*1.5,16.4,j?[.5,.03,.014]:[.08,.11,.055],0,Math.PI/2);
   rod(metal,[side*34,10,16],[side*25,10,16],.16,RUST);
  }
  for(let i=0;i<3;i++){
   const x=-25+i*24;solid('metal',x,0,-36,20,2.3,6.5,RUST);solid('timber',x,2.3,-36,19,4.4,6.2,[.11,.11,.09]);
   for(let j=0;j<5;j++){metal.box(.2,4.7,6.5,x-8+j*4,4.5,-36,IRON);}
   for(const side of[-1,1])for(const xx of[-7,7])metal.cyl(1.25,1.25,.3,16,x+xx,1.4,-36+side*3.4,IRON,0,Math.PI/2);
  }
  pillar('metal',-36,-14,2.3,10,RUST);metal.cyl(2.2,2.2,11,24,-36,6,-10,IRON,0,Math.PI/2);
  for(const side of[-1,1]){solid('metal',side*35,0,-25,1.5,20,2,IRON);}
  solid('metal',0,19,-25,71,.8,2,IRON);for(let x=-32;x<=32;x+=4)rod(metal,[x,19,-25],[x+4,22,-25],.08,IRON);metal.box(71,.2,.5,0,22,-25,IRON);
  for(const side of[-1,1])curve(metal,[[side*2,.1,10],[side*4,.1,-8],[side*13,.1,-26],[side*21,.1,-43]],.09,IRON);
 }else if(s.shape==='crypt'){
  // A true vaulted ossuary behind the original vestibule. The return stair and
  // thirteen seated neighbours retain their exact positions and clear approach.
  for(const z of[-31,-17,-3,11]){
   curve(k,[[-40,2,z],[-33,9,z],[-20,13,z],[0,14,z],[20,13,z],[33,9,z],[40,2,z]],.55,[.23,.21,.25]);
   for(const side of[-1,1]){
    solid('stone',side*39,0,z,2.5,12,2.5,[.18,.16,.19]);
    k.quad(5.4,7.3,side*40.8,5,z+5,DARK,side>0?-Math.PI/2:Math.PI/2);
    for(let row=0;row<4;row++)for(let j=0;j<3;j++){
     const x=side*40.55,y=2.8+row*1.35,zz=z+3.5+j*1.3;
     bone.at(new THREE.SphereGeometry(.30,9,6),BONE,x,y,zz);bone.box(.3,.18,.3,x,y-.3,zz,BONE);
    }
   }
  }
  for(let i=0;i<7;i++){const x=-18+i*6;cloth(x,11,-38,1.5,8,0x645760,i);}
  for(const side of[-1,1]){
   solid('stone',side*9,0,-36,5,3,5,[.17,.15,.18]);
   curve(bone,[[side*14,2,-37],[side*15,7,-37],[side*9,12,-37],[0,13,-37]],.46,BONE);
   for(let i=0;i<5;i++)curve(bone,[[side*(13-i*1.3),2,-37],[side*(13-i*1.5),6+i*.9,-36],[side*2,8+i,-35]],.13,BONE);
  }
  for(let i=0;i<9;i++){const x=-23+i*5.8;bone.box(.04,.013,51,x,.095,-1,[.22,.18,.20]);}
 }else{
  // Agricultural remains stay outside the approach and road crossing. Nothing
  // luminous advertises the ambush while the field is still sleeping.
  for(const side of[-1,1]){
   for(let i=0;i<8;i++){
    const z=-35+i*9,x=side*49;if(roadDistance(s.x+x,s.z+z)<8)continue;
    wood.open();wood.cyl(.145,.16,1.6,12,x,.8,z,WOOD);wood.close(x,z,.18,WOOD);
    col?.addCollider({kind:'circle',x:s.x+x,z:s.z+z,r:.16,y0:s.y,y1:s.y+1.6,tag:'fence',authored:true},chunk);
    if(i<7&&roadDistance(s.x+x,s.z+z+4.5)>=8&&roadDistance(s.x+x,s.z+z+9)>=8){
     wood.open();
     for(const h of[.56,1.13])wood.box(.11,.14,8.7,x,h,z+4.5,WOOD);
     wood.close(x,z+4.5,4.4,WOOD);
     col?.addCollider({kind:'obb',x:s.x+x,z:s.z+z+4.5,hx:.06,hz:4.35,y0:s.y+.49,y1:s.y+1.20,tag:'fence',standable:false,authored:true},chunk);
    }
   }
  }
  solid('metal',37,0,-15,4.6,2,3.4,RUST);metal.cyl(1.1,1.1,5.6,12,37,1,-14,IRON,0,0,Math.PI/2);
  for(let i=0;i<11;i++){metal.box(.10,.7,.18,32+i*.9,.5,-11,RUST);}
 }

 // Distinct anchor housings retain the existing soft centre, position and hit
 // radius. Their silhouettes explain tanks, roots, resonators and signal drums.
 for(const a of s.anchors){const x=a.x-s.x,z=a.z-s.z;
  if(s.shape==='sea'||s.shape==='furnace'||s.shape==='antler'){
   metal.tube(.9,.9,.5,14,x,.31,z,RUST);for(const y of[.25,2.65])ring(metal,x,y,z,.93,.08,IRON,Math.PI/2);for(const side of[-1,1])metal.box(.1,2.4,.15,x+side*.92,1.4,z,IRON);metal.box(.4,.36,.15,x,2.7,z+.85,IRON);
  }else if(s.shape==='tree'||s.shape==='mire'||s.shape==='burrow'){
   for(let j=0;j<4;j++){const t=j*TAU/4;curve(wood,[[x+Math.cos(t)*1.3,.1,z+Math.sin(t)*1.3],[x+Math.cos(t)*.7,1,z+Math.sin(t)*.7],[x+Math.cos(t)*.7,2.4,z+Math.sin(t)*.7]],.10,WOOD);}
  }else if(s.shape==='bell'||s.shape==='choir'){
   for(const side of[-1,1])metal.cyl(.25,.43,2.8,10,x+side*.95,1.4,z,[.26,.20,.11]);curve(metal,[[x-.95,2.8,z],[x,3.3,z],[x+.95,2.8,z]],.10,IRON);
  }else{
   for(const side of[-1,1])curve(bone,[[x+side*.95,.1,z],[x+side*.85,1.3,z],[x+side*.52,2.8,z]],.12,BONE);
  }
 }
 const mats=[];
 for(const [family,kit]of Object.entries(kits)){
  if(!kit.parts.length)continue;const geo=kit.build();projectPlaceSurfaceUVs(geo,family==='timber'?3:5);
  const material=family==='glass'?new THREE.MeshStandardMaterial({vertexColors:true,roughness:.18,metalness:.28,transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide}):owner.materials[family].clone();material.name=s.id+'-scenery-'+family;material.emissive.setHex(palette.light);material.emissiveIntensity=.018;owner.ownedMaterials.add(material);mats.push(material);
  const mesh=new THREE.Mesh(geo,material);mesh.name=s.id+'-authored-'+family;mesh.receiveShadow=family!=='glass';mesh.castShadow=family!=='glass';root.add(mesh);
 }
 const luminous=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});owner.ownedMaterials.add(luminous);
 let response=null;if(glow.parts.length){response=new THREE.Mesh(glow.build(),luminous);response.name=s.id+'-practical-lights';root.add(response);}
 // One small point cloud per place: salt spray / ash / spores. A soft circular
 // shader mask avoids square pixels; no allocations or geometry creation in step.
 const count=s.ambush?44:72,positions=new Float32Array(count*3),seeds=new Float32Array(count);
 for(let i=0;i<count;i++){const a=i*2.399963,r=16+hash(i,32)*21;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=.4+hash(i,54)*10;positions[i*3+2]=Math.sin(a)*r;seeds[i]=hash(i,88);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
 const material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uActivity:{value:0},uColor:{value:new THREE.Color(palette.light)}},vertexShader:'attribute float aSeed;uniform float uTime;uniform float uActivity;varying float vFade;void main(){vec3 p=position;p.x+=sin(uTime*.22+aSeed*24.)*.65;p.z+=cos(uTime*.17+aSeed*18.)*.65;p.y=mod(p.y+uTime*(.08+aSeed*.12),10.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((45.+aSeed*35.)/max(3.,-mv.z),1.,7.);vFade=(.03+uActivity*.17)*sin(clamp(p.y/10.,0.,1.)*3.14159);}',fragmentShader:'uniform vec3 uColor;varying float vFade;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(uColor,(1.-smoothstep(.05,1.,r))*vFade);}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
 owner.ownedMaterials.add(material);const motes=new THREE.Points(geo,material);motes.name=s.id+'-airborne-residue';root.add(motes);
 s.atmosphere={mats,luminous,response,motes,material,animated,activity:0};
}

export function stepBossPlaceArt(s,encounter,cleared,time,dt){
 const a=s.atmosphere;if(!a||!s.art.visible)return;
 const active=encounter&&encounter.state!=='dormant'&&!cleared;
 const warning=encounter?.state==='warning',striking=encounter?.state==='striking';
 const charge=warning?Math.min(1,(encounter.stateT||0)/(encounter.windup||2)):0;
 const target=cleared?0:active?.32+charge*.6+(striking?.4:0):.08;
 a.activity+=(target-a.activity)*Math.min(1,dt*4);
 const breath=.94+Math.sin(time*.85)*.06;
 for(const m of a.mats)m.emissiveIntensity=(cleared?.024:.018+a.activity*.018)*breath;
 a.luminous.color.setScalar(cleared?(s.shape==='furnace'?.18:.58):.7+a.activity*.7);
 a.material.uniforms.uTime.value=time;a.material.uniforms.uActivity.value=a.activity;
 a.motes.visible=!s.ambush||!!active;
 for(const q of a.animated){q.mesh.rotation.z=Math.sin(time*.48+q.phase)*(.013+a.activity*.025);q.mesh.rotation.y=Math.sin(time*.31+q.phase)*.06;}
}
