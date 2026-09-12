// New destination ground, approach paths, environmental levers and the hidden Holdfast crypt.
import * as THREE from 'three';
import {Kit} from './sites.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {projectPlaceSurfaceUVs} from './place-surfaces.js';
import {createWaterMaterial,prepareWaterGeometry} from './water-surface.js';
import {BOSSES,CRYPT,bossMapPoint} from './boss-catalog.js';
import {addFlat,heightAt} from './terrain.js';
import {nearestRoadInfo} from './roads.js';
const TAU=Math.PI*2,STONE=[.16,.17,.18],IRON=[.08,.085,.095],BONE=[.25,.23,.18],SNOW=[.33,.35,.38],TIMBER=[.13,.095,.071];
function rod(k,a,b,r,col){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),d=to.clone().sub(from);const g=new THREE.CylinderGeometry(r*.7,r,d.length(),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate(...from.add(to).multiplyScalar(.5).toArray());k.push(g,col);}
function bones(k,x,z,y=0,yaw=0){const c=Math.cos(yaw),s=Math.sin(yaw),p=(a,b,h=.12)=>[x+a*c+b*s,y+h,z-a*s+b*c];k.at(new THREE.SphereGeometry(.26,14,10),BONE,...p(0,-.9,.24));for(const side of[-1,1])k.at(new THREE.SphereGeometry(.076,8,6),[.025,.024,.022],...p(side*.095,-.87,.455));k.box(.28,.13,.17,...p(0,-.64,.15),BONE,yaw);k.cyl(.085,.085,.025,12,...p(0,-.3,.23),[.35,.26,.12]);rod(k,p(0,-.6),p(0,.55),.085,BONE);for(let i=0;i<6;i++){rod(k,p(-.36,-.45+i*.14),p(.36,-.45+i*.14),.035,BONE);}for(const side of[-1,1]){rod(k,p(side*.1,.45),p(side*.25,1.2),.06,BONE);rod(k,p(side*.25,1.2),p(side*.32,1.8),.05,BONE);rod(k,p(side*.35,-.35),p(side*.65,.2),.05,BONE);rod(k,p(side*.65,.2),p(side*.45,.7),.04,BONE);}}
function sign(root,text,x,y,z,yaw=0){if(typeof document==='undefined')return;
 const c=document.createElement('canvas');c.width=768;c.height=256;const g=c.getContext('2d');g.fillStyle='#181c20';g.fillRect(0,0,768,256);g.strokeStyle='#89775d';g.lineWidth=9;g.strokeRect(10,10,748,236);g.fillStyle='#d2c4a6';g.font='bold 34px Georgia';g.textAlign='center';const lines=text.split('|');for(let i=0;i<lines.length;i++)g.fillText(lines[i],384,65+i*57,700);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshStandardMaterial({map:tex,roughness:.9,side:THREE.DoubleSide,emissive:0x595142,emissiveMap:tex,emissiveIntensity:.25});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4.8,1.6),m);mesh.position.set(x,y,z);mesh.rotation.y=yaw;root.add(mesh);
}
export class BossSites {
 static id='boss-sites';
 constructor(ctx){this.ctx=ctx;this.sites=[];this.release=false;this.inside=false;this.loaded=false;this.time=0;
  for(const def of BOSSES){const y=addFlat({id:'boss-ground:'+def.id,x:def.x,z:def.z,radius:74,blend:.78});const road=def.id==='underkeep'?null:nearestRoadInfo(def.x,def.z,200);this.sites.push({...def,y,road,art:null,anchors:[],supplyUsed:false});}
 }
 _sys(id){return this.ctx.systems.get(id);}
 clearsTrees(x,z){for(const s of this.sites){if(Math.hypot(x-s.x,z-s.z)<58)return true;if(!s.road?.hit)continue;const dx=s.road.x-s.x,dz=s.road.z-s.z,den=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-s.x)*dx+(z-s.z)*dz)/den));if(Math.hypot(x-s.x-dx*t,z-s.z-dz*t)<4.5)return true;}return false;}
 async init(){this.group=new THREE.Group();this.group.name='boss-destinations';this.ctx.scene.add(this.group);const textures=this._sys('places')?.surfaceTextures;this.materials={};
  for(const family of ['stone','timber','metal','bone']){const source=family==='bone'?'plaster':family;const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:family==='metal'?.61:.88,metalness:family==='metal'?.48:.035,map:textures?.[source]||null,bumpMap:textures?.[source+'-bump']||null,bumpScale:family==='stone'?.055:.035});mat.name='boss-site-'+family;this.materials[family]=mat;}
  this.material=this.materials.stone;this.ownedMaterials=new Set(Object.values(this.materials));
  this.waterMaterial=this._sys('sky')?.dome?createWaterMaterial(this._sys('sky')):new THREE.MeshStandardMaterial({color:0x142a30,roughness:.23,metalness:.68});this.ownedMaterials.add(this.waterMaterial);
  for(const s of this.sites)this._build(s);
  this.ctx.shared.bossZones=this.sites.map(s=>({id:s.id,x:s.x,z:s.z,r:78,on:true}));
  this.off=this.ctx.bus.on('save:loaded',()=>{this.loaded=false;});
  this.deathOff=this.ctx.bus.on('player:respawn',()=>{this.inside=false;this.ctx.shared.locationOverride=null;});
  if(typeof window!=='undefined'){const api=window.__CURFEW||(window.__CURFEW={});api.bossSites={state:()=>this.state()};}
 }
 ready(){return this.sites.length===10&&this.sites.every(s=>s.art);}
 _build(s){const root=new THREE.Group();root.name='arena-'+s.id;root.position.set(s.x,s.y,s.z);this.group.add(root);const k=new Kit(),glow=new Kit();const collision=this._sys('collision');const chunk='boss-site:'+s.id;
  const box=(x,z,w,d,h=2,col=STONE,y=0)=>{k.box(w,h,d,x,y+h/2,z,col);collision?.addCollider({kind:'obb',x:s.x+x,z:s.z+z,hx:w/2,hz:d/2,y0:s.y+y,y1:s.y+y+h,tag:'stone',authored:true},chunk);};
  // The fight floor is level and broad. Raised objects only occupy its edge and cover islands.
  k.cyl(43,43,.10,80,0,.025,0,[.065,.068,.071]);collision?.addCollider({kind:'circle',x:s.x,z:s.z,r:43,y0:s.y-.1,y1:s.y+.075,tag:'stone',standable:true,authored:true},chunk);
  for(let i=0;i<56;i++){const a=i*2.399963,r=24+Math.sqrt(i/56)*19;k.box(1.1,.05,.6,Math.cos(a)*r,.11,Math.sin(a)*r,[.13,.14,.15],a);}
  for(let i=0;i<9;i++){const a=i*TAU/9+.1,x=Math.cos(a)*39,z=Math.sin(a)*39;if(z>28)continue;box(x,z,4.5,2,1.4+i%3*.6);k.box(4.7,.14,2.2,x,1.48+i%3*.6,z,SNOW);}
  if(s.shape==='sea'){
   const waterGeo=new THREE.CircleGeometry(22,72);waterGeo.rotateX(-Math.PI/2);prepareWaterGeometry(waterGeo,{variant:'pool'},22,22,22,22);const water=new THREE.Mesh(waterGeo,this.waterMaterial);water.position.y=.15;root.add(water);s.water=water;
   // The flooded lock is shallow at its broken slipway. Whalebones and tide marks establish scale.
   for(const side of[-1,1]){box(side*31,-4,6,48,4);for(let i=0;i<9;i++){k.box(6.4,.13,.24,side*31,1.7+i*.22,-4,[.24,.25,.23]);}for(let i=0;i<5;i++)rod(k,[side*(12+i*2),.4,-18+i*6],[side*(9+i*2),8,-18+i*6],.28,BONE);}
   for(let i=0;i<14;i++)k.box(1.6,.19,19,(i-6.5)*1.8,.27,26,TIMBER);box(0,-34,31,3,5,IRON);sign(root,'BRINE LOCK|NO VESSEL RETURNED INTACT',0,3.5,37);
  }else if(s.shape==='tree'){
   for(let i=0;i<16;i++){const a=i*2.4,r=29+(i%3)*3,x=Math.cos(a)*r,z=Math.sin(a)*r;k.cyl(.35,.7,4+i%4,8,x,2,z,TIMBER);rod(k,[x,3,z],[x+3,6,z+2],.18,TIMBER);rod(k,[x,4,z],[x-2,6,z-1],.17,TIMBER);k.box(1.2,.65,.85,x+1,.35,z,[.22,.12,.08]);}sign(root,'WIDOW\'S ORCHARD|DO NOT PICK WHAT LOOKS BACK',0,2.8,39);
  }else if(s.shape==='bell'){
   for(const side of[-1,1]){box(side*27,-12,5,5,14);box(side*27,15,5,5,11);}for(let i=0;i<4;i++){k.tube(2.3,3.3,3,24,-23+i*15,2,-29,IRON);k.cyl(2.6,3.4,.3,24,-23+i*15,.45,-29,BONE);}k.box(58,1.3,3,0,13,-12,IRON);sign(root,'BELLFOUNDER\'S CUT|HEARING PROTECTION REQUIRED',0,3,39);
  }else if(s.shape==='choir'){
   for(let i=0;i<5;i++){const x=(i-2)*13;k.cyl(4,4,19+i%2*5,32,x,9.5+i%2*2.5,-31,STONE);k.cone(4.8,3,24,x,20+i%2*5,-31,IRON);collision?.addCollider({kind:'circle',x:s.x+x,z:s.z-31,r:4,y0:s.y,y1:s.y+24,tag:'stone'},chunk);for(let j=0;j<7;j++)k.tube(4.1,4.1,.12,32,x,2+j*2.4,-31,IRON);}sign(root,'COUNTY GRAIN RESERVE|DO NOT ANSWER THE VOICES',0,3.1,39);
  }else if(s.shape==='furnace'){
   for(const side of[-1,1]){box(side*29,-6,8,30,6,IRON);for(let i=0;i<4;i++){k.cyl(1.7,2.5,21,16,side*29,10.5,-18+i*9,STONE);glow.quad(1.4,2.3,side*24.9,2.6,-18+i*9,[1.3,.25,.06],side>0?-Math.PI/2:Math.PI/2);}}for(let i=0;i<4;i++)k.box(44,.06,.28,0,.15,-18+i*12,[.38,.16,.07]);sign(root,'CHARCOAL WORKS|THE FIRES MUST NOT BE FED',0,3,39);
  }else if(s.shape==='lantern'){
   for(const side of[-1,1])for(let i=0;i<3;i++)box(side*25,-28+i*25,5,6,17);k.box(58,2,8,0,17,-28,STONE);k.box(58,2,8,0,17,22,STONE);for(let i=0;i<9;i++){k.cyl(.09,.12,6,8,(i-4)*6,3,29,IRON);glow.cyl(.14,.14,.25,8,(i-4)*6,5.8,29,[.3,.35,.5]);}sign(root,'LAST LIGHT VIADUCT|COUNT THE LAMPS ON YOUR WAY BACK',0,3,39);
  }else if(s.shape==='mire'){
   for(let i=0;i<14;i++){const a=i*TAU/14,x=Math.cos(a)*29,z=Math.sin(a)*29;if(z>20)continue;box(x,z,2.2,2.2,7);rod(k,[x,7,z],[x*.75,11,z*.75],.22,STONE);}for(let i=0;i<12;i++){const a=i*2.4,x=Math.cos(a)*23,z=Math.sin(a)*23;k.box(4,.1,2,x,.14,z,[.06,.085,.072],a);}sign(root,'WADING CHAPEL|WE LEFT THE DRESSES HERE',0,3,39);
  }else if(s.shape==='moth'){
   for(let i=0;i<9;i++){const a=i*Math.PI/8;for(const side of[-1,1])rod(k,[side*32,0,-30+i*7],[side*29,15,-30+i*7],.16,IRON);rod(k,[-29,15,-30+i*7],[0,21,-30+i*7],.14,IRON);rod(k,[0,21,-30+i*7],[29,15,-30+i*7],.14,IRON);}for(let i=0;i<18;i++){const a=i*2.4;rod(k,[Math.cos(a)*24,1,Math.sin(a)*25],[0,18,0],.035,[.35,.36,.34]);}sign(root,'LUNAR CONSERVATORY|DO NOT OPEN AFTER SUNDOWN',0,3,39);
  }else if(s.shape==='antler'){
   for(const side of[-1,1])k.box(.2,.18,90,side*2,.13,0,IRON);for(let i=0;i<29;i++)k.box(5.8,.13,.8,0,.08,-42+i*3,TIMBER);for(const side of[-1,1]){box(side*28,-10,7,22,5,IRON);k.box(7.4,.22,22.4,side*28,5.1,-10,[.28,.3,.31]);}for(let i=0;i<8;i++){const a=i*TAU/8;rod(k,[Math.cos(a)*35,0,Math.sin(a)*35],[Math.cos(a)*34,4,Math.sin(a)*34],.22,BONE);}sign(root,'STAG CROSSING|THE TRACK IS NO LONGER THE ROUTE',0,3,39);
  }else if(s.shape==='crypt'){
   // Sealed separate room keeps the terrain collision contract intact while looking underground.
   box(-43,0,4,90,15);box(43,0,4,90,15);box(0,-43,90,4,15);box(0,43,90,4,15);k.box(90,3,90,0,16,0,STONE);
   for(const side of[-1,1])for(let i=0;i<5;i++){const z=-30+i*13;box(side*31,z,3.5,3.5,14);if(side===-1){const arch=new THREE.TorusGeometry(31,.68,10,52,Math.PI);arch.scale(1,.24,1);arch.translate(0,7,z);k.push(arch,STONE);}glow.cyl(.14,.24,1,8,side*30,3,z,[.3,.38,.65]);}
   // A vestibule breaks the first view; bones face the return stair, food bowls face inward.
   box(-22,25,20,2.4,6);box(22,25,20,2.4,6);for(let i=0;i<13;i++)bones(k,-20+i*3.2,18+(i%3)*2.4,0,i*.4);for(let i=0;i<6;i++)k.cyl(.34,.23,.18,16,-4+i*1.3,.16,32,IRON);
   sign(root,'THE KEPT|WE DID NOT BURY A MAN',0,3,23);sign(root,'HOLDFAST|RETURN TO THE LIGHT',0,2.8,38,Math.PI);
  }
  // Three coherent arena levers. Their amber hearts visibly rupture and stay spent for this attempt.
  for(let i=0;i<3;i++){const a=(i+1)*TAU/3+.4,x=Math.cos(a)*23,z=Math.sin(a)*23;const g=new THREE.Group();g.position.set(x,0,z);const mat=new THREE.MeshStandardMaterial({color:s.skin.colors.accent,emissive:s.skin.colors.accent,emissiveIntensity:.45,roughness:.48,metalness:.15});const heart=new THREE.Mesh(new THREE.SphereGeometry(.72,16,12),mat);heart.scale.set(.8,1.25,.8);heart.position.y=1.55;g.add(heart);root.add(g);k.cyl(.65,.85,.48,12,x,.28,z,IRON);for(const side of[-1,1])rod(k,[x+side*.7,.2,z],[x+side*.55,2.5,z],.09,IRON);s.anchors.push({index:i,x:s.x+x,y:s.y+1.55,z:s.z+z,hp:36,spent:false,mesh:g,heart,mat,r:.85});}
  // A finite preparation cache sits at every approach, independent of currently owned weapons.
  const supply={x:s.x+6,z:s.z+32,y:s.y+.6};k.box(2,.9,1.2,6,.5,32,[.12,.2,.17]);k.box(.25,.06,.9,6,1,32,[.5,.57,.44]);k.box(1.1,.06,.25,6,1.01,32,[.5,.57,.44]);s.supply=supply;
  if(s.road?.hit){const dx=s.road.x-s.x,dz=s.road.z-s.z,dist=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);const count=Math.ceil(dist/2.5);
   for(let i=0;i<count;i++){const t=i/count,x=dx*t,z=dz*t,y=heightAt(s.x+x,s.z+z)-s.y;k.box(5,.045,3,x,y+.065,z,[.085,.084,.08],angle);if(i%5===0){const side=(i%2?1:-1);k.cyl(.13,.19,2,8,x+Math.cos(angle)*side*3,y+1,z-Math.sin(angle)*side*3,TIMBER);glow.cyl(.10,.13,.18,8,x+Math.cos(angle)*side*3,y+2,z-Math.sin(angle)*side*3,[.36,.27,.15]);}}
   sign(root,s.location.toUpperCase()+'|KEEP CLEAR',dx,Math.max(2,heightAt(s.road.x,s.road.z)-s.y+2),dz,angle);
  }
  const batches=new Map();for(const part of k.parts){const c=part.attributes.color.array;const same=a=>Math.abs(c[0]-a[0])+Math.abs(c[1]-a[1])+Math.abs(c[2]-a[2])<.005;const family=same(TIMBER)?'timber':same(IRON)?'metal':same(BONE)?'bone':'stone';if(!batches.has(family))batches.set(family,[]);batches.get(family).push(part);}
  for(const [family,parts]of batches){const geo=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());projectPlaceSurfaceUVs(geo,family==='timber'?2.8:4);const mesh=new THREE.Mesh(geo,this.materials[family]);mesh.receiveShadow=true;root.add(mesh);}k.parts.length=0;if(glow.parts.length){const mat=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});root.add(new THREE.Mesh(glow.build(),mat));}
  s.art=root;root.visible=false;
 }
 _hatch(){const r=this._sys('places')?.nodes.get('holdfast');if(!r)return null;const c=Math.cos(r.yaw),s=Math.sin(r.yaw);return {x:CRYPT.hatchX*c+CRYPT.hatchZ*s,z:-CRYPT.hatchX*s+CRYPT.hatchZ*c,y:r.padY,yaw:r.yaw};}
 _transfer(enter){const p=this._sys('player');if(!p||p.dead||this.ctx.shared.inCar)return false;const h=this._hatch();if(!h)return false;this.inside=enter;
  if(enter){const site=this.sites.find(s=>s.id==='underkeep');site.art.visible=true;p.teleport(CRYPT.entryX,CRYPT.entryZ,0);this.ctx.shared.locationOverride={x:h.x,z:h.z,name:'Beneath the Holdfast'};}
  else{p.teleport(h.x+Math.sin(h.yaw)*2.5,h.z+Math.cos(h.yaw)*2.5,h.yaw);this.ctx.shared.locationOverride=null;}
  const camera=this._sys('camera');if(camera){camera.yaw=p.yaw;camera.pitch=0;}this.ctx.bus.emit('boss:passage',{inside:enter});this.release=true;return true;
 }
 step(dt){if(!this.ctx.ready)return;this.time+=dt;const p=this._sys('player'),pr=this._sys('progress');if(!p?.pos||!pr)return;if(!this.loaded){for(const s of this.sites)s.supplyUsed=!!pr.flag('boss-supply:'+s.id);this.loaded=true;}
  const use=this.ctx.input.held('use');if(!use)this.release=false;
  const atCrypt=Math.hypot(p.pos.x-CRYPT.x,p.pos.z-CRYPT.z)<65;if(atCrypt!==this.inside){this.inside=atCrypt;const hatch=this._hatch();this.ctx.shared.locationOverride=atCrypt?{x:hatch?.x||0,z:hatch?.z||0,name:'Beneath the Holdfast'}:null;}
  for(const s of this.sites){const d=Math.hypot(p.pos.x-s.x,p.pos.z-s.z);s.art.visible=d<500;for(const a of s.anchors){a.mesh.visible=!a.spent;a.mat.emissiveIntensity=.32+Math.sin(this.time*2+a.index)*.10;}
   if(d<s.discoverR&&!pr.flag('boss-found:'+s.id)){pr.flag('boss-found:'+s.id,true);const pt=bossMapPoint(s);pr.learnRumour?.({id:s.id,name:s.location,x:pt.x,z:pt.z,kind:'boss',visited:true});this.ctx.bus.emit('boss:discovered',{id:s.id,name:s.location});}
   const sd=Math.hypot(p.pos.x-s.supply.x,p.pos.z-s.supply.z);if(sd<2.8&&!s.supplyUsed&&!this.ctx.shared.inCar){this.ctx.bus.emit('prompt',{kind:'tap',label:'E',rank:7,x:s.supply.x,y:s.supply.y,z:s.supply.z,detail:'TAKE THE AMMUNITION',subdetail:'LEFT FOR WHOEVER CAME NEXT'});if(use&&!this.release){const weapons=this._sys('weapons');for(const id of ['revolver','bolt','shotgun','carbine'])weapons?.addReserveTo?.(id,id==='carbine'?90:id==='shotgun'?18:24);s.supplyUsed=true;pr.flag('boss-supply:'+s.id,true);this.release=true;this.ctx.bus.emit('pickup',{kind:'ammo',amount:1});}}
  }
  if(this.ctx.shared.inCar||p.dead)return;const h=this._hatch();const target=this.inside?{x:3500,z:3538,y:this.sites[9].y}:h;if(!target)return;const d=Math.hypot(p.pos.x-target.x,p.pos.z-target.z);
  if(d<3.2){this.ctx.bus.emit('prompt',{kind:'tap',label:'E',rank:9,x:target.x,y:target.y+.35,z:target.z,detail:this.inside?'CLIMB TO HOLDFAST':'DESCEND BELOW HOLDFAST',subdetail:this.inside?'THE STAIR IS STILL HERE':'THE BOWLS HAVE BEEN LICKED CLEAN'});if(use&&!this.release)this._transfer(!this.inside);}
 }
 state(){return {inside:this.inside,sites:this.sites.map(s=>({id:s.id,x:s.x,y:s.y,z:s.z,visible:s.art?.visible,anchors:s.anchors.map(a=>({x:a.x,y:a.y,z:a.z,spent:a.spent})),supplyUsed:s.supplyUsed}))};}
 dispose(){this.off?.();this.deathOff?.();for(const s of this.sites){this._sys('collision')?.removeChunk('boss-site:'+s.id);s.art.traverse(o=>{o.geometry?.dispose();if(o.material&&!this.ownedMaterials.has(o.material)){o.material.map?.dispose();o.material.dispose();}});}for(const m of this.ownedMaterials)m.dispose();this.group.removeFromParent();this.ctx.shared.bossZones=[];this.ctx.shared.locationOverride=null;}
}
