// Small connected stories leave changes in the county, with ordinary E interaction.
import * as THREE from 'three';
import { Kit, C } from './sites.js';
import { projectPlaceSurfaceUVs } from './place-surfaces.js';
import { heightAt, addFlat } from './terrain.js';
import { SINKHOLE, LOST_DRIVE } from './world-scars.js';

const XMAS={x:-20,z:300,yaw:1.782};
const WOOD=[.105,.077,.052],IRON=[.067,.079,.075],PAPER=[.28,.265,.215];
const up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3(),quat=new THREE.Quaternion();
function member(k,a,b,r,c=WOOD){dir.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const len=dir.length();quat.setFromUnitVectors(up,dir.normalize());const g=new THREE.CylinderGeometry(r,r*1.13,len,7);g.applyQuaternion(quat);g.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);k.push(g,c);}
function cable(k,points,r=.027,c=[.027,.029,.025]){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));k.push(new THREE.TubeGeometry(curve,Math.max(12,points.length*8),r,5,false),c);}
function christmasPoint(x,z,y=0){const cy=Math.cos(XMAS.yaw),sy=Math.sin(XMAS.yaw);return{x:XMAS.x+x*cy+z*sy,z:XMAS.z-x*sy+z*cy,y:heightAt(XMAS.x,XMAS.z)+y};}

export class WorldStories {
 static id='world-stories';
 constructor(ctx){this.ctx=ctx;this.targets=[];this.groups=[];this.signs=[];this.time=0;this.hold=0;this.latch=false;this.target=null;this.receipt=0;this.lamp=null;this.readyState=false;addFlat({id:'christmas-houses',x:XMAS.x,z:XMAS.z,radius:23,blend:.88});}
 _sys(id){return this.ctx.systems.get(id);}
 clearsTrees(x,z){return Math.hypot(x-SINKHOLE.x,z-SINKHOLE.z)<58;}
 async init(){
  this.group=new THREE.Group();this.group.name='connected-county-stories';this.ctx.scene.add(this.group);
  const places=this._sys('places');this.materials={};
  for(const family of['timber','plaster','stone','metal']){const mat=places.matBody.clone();mat.name='story-'+family;mat.map=places.surfaceTextures?.[family]||null;mat.bumpMap=places.surfaceTextures?.[family+'-bump']||null;mat.bumpScale=family==='plaster'?.018:.035;this.materials[family]=mat;}
  this.material=this.materials.timber;
  this._christmas();this._sinkhole();this._roadNotice();
  if(typeof document!=='undefined'){this.caption=document.createElement('div');this.caption.style.cssText='display:none;position:fixed;left:50%;bottom:19%;transform:translateX(-50%);width:min(610px,70vw);padding:17px 22px;border-left:2px solid #b6a177;background:linear-gradient(100deg,rgba(12,16,22,.94),rgba(12,16,22,.80));color:#d8d2c2;font:16px/1.6 Georgia,serif;pointer-events:none;z-index:24;text-shadow:0 1px 2px #000';document.body.append(this.caption);}
  this.readyState=true;
 }
 ready(){return this.readyState;}
 _group(name,x,z){const g=new THREE.Group();g.name=name;this.group.add(g);this.groups.push({g,x,z});return g;}
 _mesh(k,root,mat=this.material){if(!k.parts.length)return null;const geo=k.build();projectPlaceSurfaceUVs(geo,2.5);const m=new THREE.Mesh(geo,mat);m.receiveShadow=true;root.add(m);return m;}
 _box(k,x,y,z,w,h,d,col=WOOD,yaw=0,chunk='story:xmas',solid=true){k.box(w,h,d,x,y,z,col,yaw);if(solid)this._sys('collision')?.addCollider({kind:'obb',x,z,halfX:w/2,halfZ:d/2,y0:y-h/2,y1:y+h/2,yaw,tag:'stone',standable:true,authored:true},chunk);}
 _sign(root,{x,y,z,yaw=0,w=2.4,h=1.4,lines=[],graffiti='',small=false}){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const c=canvas.getContext('2d');
  c.fillStyle=small?'#b0a891':'#254249';c.fillRect(0,0,1024,512);c.strokeStyle=small?'#817963':'#b2b4a4';c.lineWidth=6;c.strokeRect(18,18,988,476);
  for(let i=0;i<1100;i++){const x=(i*73)%1024,y=(i*127)%512;c.fillStyle=i%2?'#00000009':'#ffffff07';c.fillRect(x,y,1+(i%3),1);}
  c.textAlign='center';c.fillStyle=small?'#282b28':'#dbd7b9';const font=lines.length>3?35:52;c.font='bold '+font+'px '+(small?'Georgia':'Arial');
  const step=lines.length>3?74:105,start=lines.length>3?80:100;lines.forEach((line,i)=>c.fillText(line,512,start+i*step,945));
  if(graffiti){c.strokeStyle='#591f16';c.lineWidth=19;c.lineCap='round';c.beginPath();c.moveTo(63,165);c.lineTo(957,283);c.moveTo(79,296);c.lineTo(962,151);c.stroke();c.save();c.translate(512,418);c.rotate(-.065);c.font='italic bold 66px Georgia';c.fillStyle='#d0b879';c.fillText(graffiti,0,0,930);c.restore();}
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const mat=this.material.clone();mat.map=tex;mat.bumpMap=null;mat.bumpScale=0;mat.vertexColors=false;mat.side=THREE.DoubleSide;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);mesh.position.set(x,y,z);mesh.rotation.y=yaw;root.add(mesh);this.signs.push(mesh);return mesh;
 }
 _christmas(){
  const root=this._group('three-houses-still-waiting',XMAS.x,XMAS.z),k=new Kit(),a=christmasPoint(-6.2,11),y=a.y;
  const put=(x,z,h=0)=>christmasPoint(x,z,h),box=(lx,hh,lz,w,h,d,c=WOOD,solid=true)=>{const p=put(lx,lz,hh);this._box(k,p.x,p.y,p.z,w,h,d,c,XMAS.yaw,'story:xmas',solid);};
  // A recognisable open-frame generator: tank, motor, cooling fins, outlet and pull cord.
  box(-6.2,.42,11,1.42,.72,.85,[.10,.127,.102]);box(-6.2,.84,11,1.50,.16,.90,[.20,.14,.061]);
  for(const side of[-1,1]){const p=put(-6.2+side*.79,11,.50),q=put(-6.2+side*.79,11,1.05);member(k,[p.x,p.y-.43,p.z],[q.x,q.y,q.z],.035,IRON);}
  for(let i=0;i<7;i++)box(-6.78,.25+i*.065,11,.065,.025,.70,IRON,false);
  const tank=put(-6.2,11,.965);k.cyl(.095,.095,.07,12,tank.x,tank.y,tank.z,IRON);
  box(-6.2,1.28,10.83,.50,.55,.14,[.077,.087,.076]);
  const knob=put(-6.20,11.005,1.29);this.switch=new THREE.Mesh(new THREE.BoxGeometry(.07,.23,.08),new THREE.MeshStandardMaterial({color:0x9a2c1e,roughness:.55}));this.switch.position.set(knob.x,knob.y,knob.z);this.switch.rotation.y=XMAS.yaw;this.switch.rotation.z=-.52;root.add(this.switch);
  // Actual feeder cable leaves the enclosure, follows the drive and ends in a tagged dead line.
  const pts=[[-6.7,11,.2],[-8.3,12,.06],[-8.8,17,.04],[-6.3,20,.045],[-5.4,25,.09]].map(([x,z,h])=>{const p=put(x,z,h);return[p.x,p.y,p.z];});cable(k,pts,.040,[.15,.079,.032]);
  box(-5.4,.3,25,.8,.6,.48,IRON);
  const label=put(-6.2,11.1,1.35);this._sign(root,{...label,yaw:XMAS.yaw,w:.48,h:.26,lines:['SERVICE 17','LOCAL SUPPLY'],small:true});
  const notice=put(-7.9,12,1.5);this._sign(root,{...notice,yaw:XMAS.yaw,w:1.45,h:1.0,lines:['MRS VALE / CIRCUIT 17','Timer broken. Motor is sound.','Leave the coloured lights on.','They said our family could use this road.'],small:true});
  box(-7.9,.75,12,.065,1.5,.065,IRON);
  this.targets.push({id:'xmas-power',kind:'repair',...put(-6.2,11,1.05),title:'RECONNECT THE GENERATOR',hold:1.1,text:'The timer stops fighting the motor. Every house stays lit. Someone left two spare bulbs in the tool tray.',reward:160,cash:80});
  // A letter at the laid table turns the light display into a family waiting for somebody.
  const hyaw=Math.atan2(-11.5,-4.5),cx=Math.cos(hyaw),sx=Math.sin(hyaw),lp=put(-11.5+1.75*cx+.15*sx,-4.5-1.75*sx+.15*cx,.929);
  const letter=this._sign(root,{...lp,yaw:XMAS.yaw+hyaw,w:.36,h:.25,lines:['CAL / PLEASE READ THIS','We will keep the lights on.','Do not send anyone down Service 17.','The house has gone under the road.'],small:true});if(letter)letter.rotation.x=-Math.PI/2;
  this.targets.push({id:'xmas-letter',kind:'read',...lp,title:'READ THE LETTER',text:'“Cal, we will keep the lights on until they find the turn. Do not read that card again. There is no road through Service 17. The house has gone under it.”',rumour:true});
  this._mesh(k,root);this.generator={...a,root};
 }
 _sinkhole(){
  const s=SINKHOLE,root=this._group('the-house-below',s.x,s.z),k=new Kit(),plaster=new Kit(),stone=new Kit(),metal=new Kit(),chunk='story:sinkhole';
  // Exposed soil is shaded on the actual chunk terrain. A second analytic
  // surface would intersect its differently sampled LOD triangles.
  // Freshly exposed roots and split garden foundations lean into the missing ground.
  for(let i=0;i<34;i++){const a=i*2.399,r=44+(i%4)*2.1,x=s.x+Math.cos(a)*r,z=s.z+Math.sin(a)*r*.94,y=heightAt(x,z);const d=2.2+i%4;
   member(k,[x,y+.4,z],[x-Math.cos(a)*d,y-1.7,z-Math.sin(a)*d],.10+(i%3)*.035,WOOD);
   if(i%2===0)member(k,[x-Math.cos(a)*d,y-1.7,z-Math.sin(a)*d],[x-Math.cos(a)*(d+1.6)+.8,y-3.1,z-Math.sin(a)*(d+2)],.06,WOOD);
   if(i%4===0)this._box(stone,x,y+.24,z,1.9,.48,.65,[.15,.14,.115],a,chunk);
  }
  const hx=s.x+9,hz=s.z+12,hy=heightAt(hx,hz)+.3;
  // A broken house with a visible interior remains halfway down the bowl. The split
  // roof, chimney, bed and wallpaper show what disappeared without filling the hole.
  this._box(k,hx,hy,hz,9,.24,7,[.105,.085,.065],0,chunk);
  this._box(plaster,hx,hy+1.5,hz-3.5,9,3,.25,[.177,.165,.140],0,chunk);
  this._box(plaster,hx+4.5,hy+1.5,hz,.25,3,7,[.15,.16,.155],0,chunk);
  for(const side of[-1,1])this._box(plaster,hx+side*2.95,hy+1.5,hz+3.5,3.1,3,.25,[.16,.143,.118],0,chunk);
  this._box(k,hx,hy+2.9,hz+3.5,2.9,.24,.25,WOOD,0,chunk);
  for(let i=0;i<7;i++){const z=hz-3+i;member(k,[hx-4.5,hy,z],[hx-4.9-(i%3)*.3,hy+2.5-i*.15,z],.08,WOOD);}
  for(let i=0;i<5;i++){const z=hz-3+i*1.4;member(k,[hx-4.5,hy+3,z],[hx,hy+5,z],.10,WOOD);member(k,[hx,hy+5,z],[hx+4.5,hy+3,z],.10,WOOD);}
  metal.box(4.7,.16,7.5,hx+2.35,hy+4.00,hz,[.067,.080,.084],0,0,-.42);
  this._box(stone,hx+3.4,hy+3.4,hz-2,1.2,6.7,1.0,[.18,.10,.076],.06,chunk);
  for(let i=0;i<12;i++)stone.box(1.23,.09,1.04,hx+3.4,hy+.2+i*.48,hz-2,[.075,.07,.055]);
  this._box(k,hx+2.2,hy+.35,hz-1,1.4,.5,2.15,WOOD,0,chunk);plaster.box(1.36,.13,2.08,hx+2.2,hy+.67,hz-1,[.17,.13,.085]);plaster.box(1.1,.19,.4,hx+2.2,hy+.83,hz-1.68,PAPER);
  for(let i=0;i<8;i++)plaster.box(.09,2.5,.03,hx-3.8+i*.95,hy+1.6,hz-3.35,[.10,.135,.133]);
  this._box(k,hx-2.3,hy+.82,hz-1,1.5,.14,1.2,WOOD,0,chunk);
  for(const x of[-2.9,-1.7])for(const z of[-1.47,-.53])this._box(k,hx+x,hy+.42,hz+z,.09,.8,.09,WOOD,0,chunk);
  const note={x:hx-2.3,y:hy+.92,z:hz-1};const card=this._sign(root,{...note,w:.43,h:.30,lines:['SERVICE 17','INSPECTED / ROAD OPEN','READ VERBATIM','DO NOT TAKE CALLS'],small:true});if(card)card.rotation.x=-Math.PI/2;
  this.targets.push({id:'road-card',kind:'read',...note,title:'READ THE BROADCAST CARD',text:'The inspection date is later than the collapse. Beneath ROAD OPEN, somebody wrote: “They gave Cal this card after they knew.”',reward:120,cash:65});
  // The washing line is still fixed to its original trees, high above the roof.
  const left={x:s.x-49,z:s.z+15},right={x:s.x+51,z:s.z+10},ly=heightAt(left.x,left.z),ry=heightAt(right.x,right.z);
  for(const [p,y] of[[left,ly],[right,ry]]){k.cyl(.45,.68,7,10,p.x,y+3.5,p.z,WOOD);member(k,[p.x,y+4,p.z],[p.x+2,y+6,p.z-1],.17,WOOD);}
  cable(k,[[left.x,ly+3,left.z],[s.x-14,Math.min(ly,ry)-.5,s.z+13],[s.x+15,Math.min(ly,ry)-1,s.z+12],[right.x,ry+3,right.z]],.022);
  for(let i=0;i<6;i++){const x=s.x-17+i*6,z=s.z+13,y=Math.min(ly,ry)-.75-Math.sin(i/5*Math.PI)*.25;const g=new THREE.PlaneGeometry(.9+(i%2)*.3,1.3,5,6),p=g.attributes.position;for(let j=0;j<p.count;j++)p.setZ(j,Math.sin(p.getX(j)*12+p.getY(j)*2)*.035);g.computeVertexNormals();plaster.at(g,[.23-i*.012,.219-i*.01,.18],x,y-.65,z,0);}
  // The remaining garden path indicates the natural escape ramp on the west side.
  for(let i=0;i<22;i++){const x=s.x-54+i*2.7,z=s.z-1.3+Math.sin(i*.4)*.6,y=heightAt(x,z);k.box(1.8,.09,.72,x,y+.075,z,WOOD,.16);}
  const approach={x:s.x+5,z:s.z+53};const ay=heightAt(approach.x,approach.z);
  this._sign(root,{x:approach.x+4,y:ay+1.9,z:approach.z,yaw:0,w:3.8,h:1.7,lines:['COUNTY SERVICE 17','ROAD OPEN','FOLLOW THE LIGHTS'],graffiti:'THE HOUSE IS DOWN THERE'});
  for(const side of[-1,1])this._box(metal,approach.x+4+side*1.5,ay+.95,approach.z,.10,1.9,.10,IRON,0,chunk);
  this.targets.push({id:'sinkhole-view',kind:'read',x:approach.x+4,y:ay+1.9,z:approach.z,title:'READ THE SCRATCHED NOTICE',text:'The same service number as the Christmas lights. Below the printed route, the handwriting says: “We waited with the lights on. We could hear the house settling.”',rumour:true});
  this._mesh(k,root);this._mesh(plaster,root,this.materials.plaster);this._mesh(stone,root,this.materials.stone);this._mesh(metal,root,this.materials.metal);this.sinkhole={x:s.x,z:s.z,y:heightAt(s.x,s.z),house:{x:hx,y:hy,z:hz},approach};
 }
 _roadNotice(){
  const [x,z]=LOST_DRIVE[0],root=this._group('official-route-crossed-out',x,z),k=new Kit(),y=heightAt(x+5,z+2);
  this._sign(root,{x:x+5,y:y+2.0,z:z+2,yaw:.23,w:4.4,h:2.2,lines:['COUNTY EVACUATION ROUTE','SERVICE 17 / ROAD OPEN','KEEP YOUR LIGHTS ON'],graffiti:'THEY KNEW'});
  for(const side of[-1,1])this._box(k,x+5+side*1.7,y+1.1,z+2,.13,2.2,.13,IRON,0,'story:road-notice');
  // A service reel and a severed orange lead repeat the cable at the houses.
  k.cyl(.6,.6,.85,20,x+2,y+.64,z-1,WOOD,0,Math.PI/2);cable(k,[[x+2,y+.3,z-1],[x-1,y+.06,z-3],[x-4,y+.06,z-7],[x-3,y+.07,z-13]],.037,[.15,.079,.032]);this._mesh(k,root);
 }
 _say(text){this.receipt=10;if(this.caption)this.caption.textContent=text;}
 _use(t){const pr=this._sys('progress'),key='story:'+t.id,first=!pr.flag(key);
  if(t.kind==='repair'&&!first)return;
  if(first){pr.flag(key,true);if(t.reward)pr.award(t.reward,t.x,t.y,t.z,'discovery');if(t.cash)pr.payCash(t.cash,t.x,t.y,t.z,'story');if(t.kind==='repair')this._sys('dusk-to-dawn')?.addBulb(2);pr.save.flush();}
  if(t.rumour)this._reveal(t.id==='sinkhole-view');
  this._say(t.text);this.ctx.bus.emit('story:read',{id:t.id,first});
 }
 _reveal(visited=false){const pr=this._sys('progress');pr.learnRumour({id:SINKHOLE.id,name:SINKHOLE.name,x:SINKHOLE.x,z:SINKHOLE.z,kind:'story'});if(visited)pr.discoverBoss(SINKHOLE.id);}
 step(dt){
  if(!this.ctx.playing||this.ctx.paused)return;this.time+=dt;this.receipt=Math.max(0,this.receipt-dt);
  const p=this._sys('player'),pr=this._sys('progress');if(!p?.pos)return;
  const use=this.ctx.input.held('use');if(!use)this.latch=false;
  let target=null,best=3.3;const forward={x:-Math.sin(p.yaw||0),z:-Math.cos(p.yaw||0)};
  if(!this.ctx.shared.inCar&&!p.dead)for(const t of this.targets){const dx=t.x-p.pos.x,dz=t.z-p.pos.z,d=Math.hypot(dx,dz);if(d>best||Math.abs(t.y-(p.eyeY||p.pos.y+1.6))>2.1)continue;if(d>.3&&(dx*forward.x+dz*forward.z)/d<.25)continue;
   const eye=p.eyeY||p.pos.y+1.6,len=Math.hypot(dx,t.y-eye,dz),ray=this._sys('collision')?.raycast({x:p.pos.x,y:eye,z:p.pos.z},{x:dx/len,y:(t.y-eye)/len,z:dz/len},len,1);if(ray&&ray.t<len-.70)continue;target=t;best=d;
  }
  if(target!==this.target){this.target=target;this.hold=0;}
  if(target){const repaired=target.kind==='repair'&&pr.flag('story:xmas-power');this.ctx.bus.emit('prompt',{kind:'hold',label:'E',rank:7,x:target.x,y:target.y,z:target.z,k:this.hold/(target.hold||.2),detail:repaired?'THE LIGHTS WILL STAY ON':target.title,subdetail:target.kind==='repair'?'SERVICE 17 · LOCAL POWER':'E · READ',unavailable:!!repaired});if(use&&!this.latch&&!repaired){this.hold+=dt;if(this.hold>=(target.hold||.2)){this._use(target);this.hold=0;this.latch=true;}}else this.hold=0;}
  const powered=!!pr.flag('story:xmas-power');if(this.switch){this.switch.rotation.z=powered?.52:-.52;this.switch.material.color.setHex(powered?0x567450:0x9a2c1e);}
  const near=Math.hypot(p.pos.x-XMAS.x,p.pos.z-XMAS.z)<34,lights=this._sys('lights');
  if(powered&&near){if(!this.lamp?.inUse)this.lamp=lights?.borrow('christmas-house',XMAS.x,this.generator.y+3.0,XMAS.z,0xffc88b,13,0);if(this.lamp){this.lamp.peak=13;this.lamp.distance=30;this.lamp.decay=.95;}if(Math.hypot(p.pos.x-XMAS.x,p.pos.z-XMAS.z)<19){this.ctx.shared.lit=Math.max(this.ctx.shared.lit||0,.65);this.ctx.bus.emit('place:near',{id:'story:xmas',lit:true,x:XMAS.x,y:this.generator.y,z:XMAS.z});}}
  else if(this.lamp){lights?.release(this.lamp);this.lamp=null;}
  if(Math.hypot(p.pos.x-SINKHOLE.x,p.pos.z-SINKHOLE.z)<64&&pr.mapStatus(SINKHOLE.id)!=='discovered')this._reveal(true);
 }
 present(){const p=this._sys('player')?.pos;for(const a of this.groups)a.g.visible=!p||Math.hypot(p.x-a.x,p.z-a.z)<550;if(this.caption)this.caption.style.display=this.receipt>0&&!this.ctx.paused&&this.ctx.playing?'block':'none';}
 state(){return{power:!!this._sys('progress')?.flag('story:xmas-power'),generator:this.generator?{x:this.generator.x,y:this.generator.y,z:this.generator.z}:null,sinkhole:this.sinkhole,targets:this.targets.map(t=>({id:t.id,kind:t.kind,x:t.x,y:t.y,z:t.z})),target:this.target?.id||null};}
 dispose(){this.caption?.remove();this._sys('lights')?.release(this.lamp);for(const id of['story:xmas','story:sinkhole','story:road-notice'])this._sys('collision')?.removeChunk(id);this.group?.traverse(o=>{o.geometry?.dispose();});for(const s of this.signs){s.material.map.dispose();s.material.dispose();}this.switch?.material.dispose();for(const mat of Object.values(this.materials||{}))mat.dispose();this.group?.removeFromParent();}
}
export default WorldStories;
