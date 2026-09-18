// Small connected stories leave changes in the county, with ordinary E interaction.
import * as THREE from 'three';
import { Kit, C } from './sites.js';
import { MASK } from './collision.js';
import { mountSignBoard, reseatFace } from './sign-mount.js';
import { projectPlaceSurfaceUVs } from './place-surfaces.js';
import { heightAt, addFlat } from './terrain.js';
import { SINKHOLE, LOST_DRIVE } from './world-scars.js';
import { SITE_RECORDS } from './lore-records.js';
import { SITE_HANDS, paintHandwriting } from './lore-handwriting.js';
import { DrownedLightMemory } from './lore-drowned-light.js';
import { LoreBellAnswers } from './lore-bell-answers.js';
import { reservoirContains } from './lore-reservoir.js';
import { CHAIN_ROOM } from './destination-details.js';
import { WAKE_TABLE } from './dress-interiors.js';
import { carShell } from './staged.js';

const XMAS={x:-20,z:300,yaw:1.782};
const WOOD=[.105,.077,.052],IRON=[.067,.079,.075],PAPER=[.28,.265,.215];
// THE COUNTY'S WRITING: the placards hung on a site's own walls, in that site's local frame
// (x, y above the pad, z, yaw), painted by _sign. A table rather than a run of calls so
// tests/sign-clearance.mjs can hang every one against its site's real geometry and say which
// is inside a wall. Both station placards are fixed to solid masonry above the openings; a
// static notice across the door used to float in the passage when the leaf swung.
export const COUNTY_WRITING=Object.freeze([
 {id:'assembly-3',siteId:'filling-station',x:-13.6,y:3.32,z:-3.235,yaw:Math.PI,lines:['ASSEMBLY POINT 3 · AWAIT TRANSPORT','TRANSPORT DEPARTS AT FIRST LIGHT'],w:2.4,h:.42},
 {id:'relief-driver',siteId:'filling-station',x:-11.95,y:1.72,z:-3.235,yaw:Math.PI,lines:['SERVICE 17 · RELIEF DRIVER','REPORT TO ASSEMBLY POINT 3','COLLECT WAITING PASSENGERS','TRANSPORT DEPARTS AT FIRST LIGHT'],w:.36,h:.5},
 {id:'county-seal',siteId:'filling-station',x:-10.5,y:3.24,z:-3.25,yaw:Math.PI,lines:['COUNTY OF MERIDIAN · EST. 1841'],w:2,h:.5},
 {id:'barn-morning',siteId:'jackfield',x:0,y:2.15,z:6.235,yaw:0,lines:['DO YOU REMEMBER MORNING'],w:8,h:.9},
 {id:'school-erased',siteId:'holdfast',x:57.265,y:3.5,z:35,yaw:-Math.PI/2,lines:['MORNING IS SOMETHING WE TELL CHILDREN'],w:3.8,h:.8},
 {id:'fridge',siteId:'avery-house',x:26.86,y:4.7,z:6.912,yaw:0,lines:['Gone for gas. Back by morning. Love you.'],w:.62,h:.34},
 {id:'bedroom',siteId:'avery-house',x:-26.9,y:9.1,z:-15.857,yaw:0,lines:["It’ll look better in the morning — Mom"],w:.74,h:.32},
 {id:'mirror',siteId:'avery-house',x:-2.143,y:8.9,z:-7,yaw:-Math.PI/2,lines:['still dark out'],w:.6,h:.3},
 {id:'seventh-portal',siteId:'black-rib',x:11.1984,y:1.9,z:-16.1063,yaw:Math.PI+.108,lines:['OPEN IT AGAIN'],w:1.2,h:.7},
]);
const up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3(),quat=new THREE.Quaternion();
function member(k,a,b,r,c=WOOD){dir.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const len=dir.length();quat.setFromUnitVectors(up,dir.normalize());const g=new THREE.CylinderGeometry(r,r*1.13,len,7);g.applyQuaternion(quat);g.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);k.push(g,c);}
function cable(k,points,r=.027,c=[.027,.029,.025]){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));k.push(new THREE.TubeGeometry(curve,Math.max(12,points.length*8),r,5,false),c);}
function christmasPoint(x,z,y=0){const cy=Math.cos(XMAS.yaw),sy=Math.sin(XMAS.yaw);return{x:XMAS.x+x*cy+z*sy,z:XMAS.z-x*sy+z*cy,y:heightAt(XMAS.x,XMAS.z)+y};}

export class WorldStories {
 static id='world-stories';
 constructor(ctx){this.ctx=ctx;this.targets=[];this.groups=[];this.signs=[];this.time=0;this.hold=0;this.latch=false;this.target=null;this.receipt=0;this.lamp=null;this.readyState=false;addFlat({id:'christmas-houses',x:XMAS.x,z:XMAS.z,radius:23,blend:.88});}
 _sys(id){return this.ctx.systems.get(id);}
 clearsTrees(x,z){return Math.hypot(x-SINKHOLE.x,z-SINKHOLE.z)<58||reservoirContains(x,z);}
 async init(){
  this.group=new THREE.Group();this.group.name='connected-county-stories';this.ctx.scene.add(this.group);
  const places=this._sys('places');this.materials={};
  for(const family of['timber','plaster','stone','metal']){const mat=places.matBody.clone();mat.name='story-'+family;mat.map=places.surfaceTextures?.[family]||null;mat.bumpMap=places.surfaceTextures?.[family+'-bump']||null;mat.bumpScale=family==='plaster'?.018:.035;this.materials[family]=mat;}
  this.material=this.materials.timber;
  this._christmas();this._sinkhole();this._roadNotice();this._siteRecords();this._appendix();this._marnie();
  // THE ELEVEN REWIRE: the caption element is gone. What a note says is a line like any
  // other line and goes through dialogue/dialogue.js, so a note cannot talk over a person.
  this.drownedMemory=new DrownedLightMemory(this.ctx);this.bellAnswers=new LoreBellAnswers(this.ctx);
  this.moments=new CountyMoments(this.ctx,this);this.moments.build();this.readyState=true;
 }
 ready(){return this.readyState;}
 _sitePoint(id,x,y,z,yaw=0){const n=this._sys('places')?.nodes.get(id);if(!n)return null;const a=n.yaw||0,c=Math.cos(a),s=Math.sin(a);return{x:n.def.x+x*c+z*s,y:n.padY+y,z:n.def.z-x*s+z*c,yaw:a+yaw};}
 // the site's RESIDENT meshes (the landmark node, and the body group when its chunk is in),
 // world matrices brought up to date, for reseating a wall-hung face at build
 _siteMeshes(id){const places=this._sys('places'),out=[];const n=places?.nodes?.get(id);if(n?.node){n.node.updateWorldMatrix(true,true);out.push(n.node);}
  if(places?.bodies)for(const list of places.bodies.values())for(const b of list)if(b?.kind==='major'&&b.id===id&&b.group){b.group.updateWorldMatrix(true,true);out.push(b.group);}
  return out;}
 _paper(root,p,record){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=768;const c=canvas.getContext('2d');c.fillStyle='#4a4535';c.fillRect(0,0,640,768);c.fillStyle='#060402';
  paintHandwriting(c,record.title,35,62,565,25,record.siteId);
  let lines=[];for(const paragraph of record.text.split('\n')){let line='';for(const word of paragraph.split(' ')){if((line+' '+word).length>49){lines.push(line);line=word;}else line+=(line?' ':'')+word;}lines.push(line);}
  const step=Math.min(37,630/Math.max(1,lines.length));lines.forEach((line,i)=>paintHandwriting(c,line,35,111+i*step,565,Math.min(25,step*.76),record.siteId));
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.NoColorSpace;
  const mat=new THREE.MeshLambertMaterial({map:tex,vertexColors:true,side:THREE.DoubleSide,dithering:true});
  const geo=new THREE.PlaneGeometry(record.w||.64,record.h||.77);geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*3).fill(1),3));const mesh=new THREE.Mesh(geo,mat);mesh.position.set(p.x,p.y,p.z);mesh.rotation.set(record.mount==='desk'||record.mount==='surface'?-Math.PI/2:0,p.yaw,0,'YXZ');root.add(mesh);this.signs.push(mesh);
 }
 _siteRecords(){
  for(const r of SITE_RECORDS){const p=this._sitePoint(r.siteId,r.x,r.y,r.z,r.yaw);if(!p)continue;const pad=this._sys('places').nodes.get(r.siteId).padY,ground=heightAt(p.x,p.z);if(r.ground)p.y+=ground-pad;const floor=r.ground?ground:pad+(r.floor||0),root=this._group('record-'+r.siteId,p.x,p.z),k=new Kit();
   // a 'wall' record trusts masonry 0.012 m behind it: seat it on the wall that is resident
   if(r.mount==='wall')reseatFace(p,this._siteMeshes(r.siteId),.012);
   if(r.mount==='desk'){k.box(.9,.08,1.05,p.x,p.y-.055,p.z,WOOD,p.yaw);for(const side of[-1,1]){const dx=side*.31*Math.cos(p.yaw),dz=-side*.31*Math.sin(p.yaw),h=p.y-floor-.1;k.box(.065,h,.065,p.x+dx,floor+h/2,p.z+dz,IRON);}}
   if(r.mount==='board')this._board(k,{...p,w:r.w||.64,h:r.h||.77},floor);
   this._mesh(k,root);this._paper(root,p,r);this.targets.push({...r,...p,kind:'read',hand:SITE_HANDS[r.siteId],title:'READ · '+r.title});
  }
 }
 _appendix(){
  // The placards on the county's own walls: the COUNTY_WRITING table, each reseated on the
  // wall that is actually resident before it is hung (see reseatFace).
  for(const wr of COUNTY_WRITING){const p=this._sitePoint(wr.siteId,wr.x,wr.y,wr.z,wr.yaw);if(!p)continue;reseatFace(p,this._siteMeshes(wr.siteId),.012);const root=this._group('county-writing-'+wr.id,p.x,p.z);this._sign(root,{...p,w:wr.w??2.1,h:wr.h??.9,lines:wr.lines,small:true});this.targets.push({id:'writing:'+wr.id,kind:'read',...p,title:'READ THE WRITING',siteId:wr.siteId,text:wr.lines.join('\n')});}
  // Four contracts in stone: three repeated eastward promises, one deliberate reversal.
  const epitaphs=[['WE SHALL RISE','TO MEET IT'],['UNTIL THE MORNING'],['ASLEEP, AWAITING','THE DAWN'],['FACING THE OTHER WAY','ON PURPOSE']];
  // A row in front of the east columbarium's niches, facing WORLD east like every old grave
  // here, which on this site is back across the graves toward you. The fourth stood inside
  // the chapel of rest's front wall and the third was a stone you walked through. The
  // reversal faces the niches: you step behind the row to read it. Each stone has a body.
  for(let i=0;i<4;i++){const p=this._sitePoint('garden-of-rest',16.9,0,-9.8+i*1.6);if(!p)continue;const y=heightAt(p.x,p.z),yaw=i===3?-Math.PI/2:Math.PI/2,root=this._group('morning-headstone-'+i,p.x,p.z),k=new Kit();k.box(.82,1.1,.20,p.x,y+.55,p.z,C.stone,yaw);k.box(1,.16,.46,p.x,y+.08,p.z,C.stone,yaw);this._mesh(k,root,this.materials.stone);this._sign(root,{x:p.x+Math.sin(yaw)*.108,y:y+.68,z:p.z+Math.cos(yaw)*.108,yaw,w:.75,h:.58,lines:epitaphs[i],small:true});
   this._sys('collision')?.addCollider({kind:'obb',x:p.x,z:p.z,halfX:.41,halfZ:.10,yaw,y0:y-.2,y1:y+1.1,tag:'headstone'},'story:records');}
  // The county's footpath map has been rubbed blank on the eastern half.
  const trail=this._sitePoint('standing-stones',10,0,16);if(trail){trail.y=heightAt(trail.x,trail.z)+1.6;const root=this._group('rubbed-trailhead-map',trail.x,trail.z),k=new Kit();k.box(2.3,1.5,.15,trail.x,trail.y,trail.z,WOOD);for(const side of[-1,1])k.box(.08,1.5,.08,trail.x+side*.9,trail.y-.85,trail.z,IRON);this._mesh(k,root);this._sign(root,{...trail,z:trail.z+.09,w:2.1,h:1.35,lines:['YOU ARE HERE','← WOODS    ·    ROAD →','                          '],small:true});}
  // A short inscription belongs to the viaduct's approach abutment.
  {const x=2646-27,z=1305+38,y=heightAt(x,z),root=this._group('tully-abutment',x,z),k=new Kit();k.box(5.4,1.7,.8,x,y+.85,z,C.stone);this._mesh(k,root,this.materials.stone);this._sign(root,{x,y:y+1,z:z+.411,w:5,h:.72,lines:['BRING IT TO TULLY, HE’LL KEEP IT SAFE'],small:true});}
  // Only the first examples carry these carvings; the woods are not an essay.
  for(const kind of['culvert','blind']){const m=this._sys('places')?.minors.find(m=>m.kind===kind);if(!m)continue;const yaw=m.yaw||0,x=m.x+Math.sin(yaw)*1.2,z=m.z+Math.cos(yaw)*1.2,y=heightAt(x,z)+.45,root=this._group('carved-'+kind,x,z),k=new Kit();k.box(1.5,.55,.14,x,y,z,kind==='culvert'?C.stone:WOOD,yaw);this._mesh(k,root,kind==='culvert'?this.materials.stone:this.materials.timber);this._sign(root,{x:x+Math.sin(yaw)*.078,y,z:z+Math.cos(yaw)*.078,yaw,w:1.4,h:.4,lines:[kind==='culvert'?'EAST IS JUST A DIRECTION':'BLUE'],small:true});}
  const mailbox=christmasPoint(-5.8,20,1.15),root=this._group('vale-mailbox',mailbox.x,mailbox.z),k=new Kit();k.box(.08,1.1,.08,mailbox.x,mailbox.y-.55,mailbox.z,WOOD);k.box(1.55,.68,.35,mailbox.x,mailbox.y,mailbox.z,IRON,XMAS.yaw);this._mesh(k,root);this._sign(root,{...mailbox,x:mailbox.x+Math.sin(XMAS.yaw)*.184,z:mailbox.z+Math.cos(XMAS.yaw)*.184,yaw:XMAS.yaw,w:1.48,h:.62,lines:['THE VALES · WELCOME',"SUPPER’S ON"],small:true});
 }
 _group(name,x,z){const g=new THREE.Group();g.name=name;this.group.add(g);this.groups.push({g,x,z});return g;}
 _mesh(k,root,mat=this.material){if(!k.parts.length)return null;const geo=k.build();projectPlaceSurfaceUVs(geo,2.5);const m=new THREE.Mesh(geo,mat);m.receiveShadow=true;root.add(m);return m;}
 _board(k,p,floor,chunk='story:records'){mountSignBoard(k,{...p,groundY:floor,boardColor:WOOD,postColor:IRON,postSpacing:p.w>2?p.w-.65:0},shape=>this._sys('collision')?.addCollider(shape,chunk));}
 _box(k,x,y,z,w,h,d,col=WOOD,yaw=0,chunk='story:xmas',solid=true){k.box(w,h,d,x,y,z,col,yaw);if(solid)this._sys('collision')?.addCollider({kind:'obb',x,z,halfX:w/2,halfZ:d/2,y0:y-h/2,y1:y+h/2,yaw,tag:'stone',standable:true,authored:true},chunk);}
 _sign(root,{x,y,z,yaw=0,w=2.4,h=1.4,lines=[],graffiti='',small=false}){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const c=canvas.getContext('2d');
  c.fillStyle=small?'#4a4535':'#050e11';c.fillRect(0,0,1024,512);c.strokeStyle=small?'#383328':'#51523e';c.lineWidth=6;c.strokeRect(18,18,988,476);
  for(let i=0;i<1100;i++){const x=(i*73)%1024,y=(i*127)%512;c.fillStyle=i%2?'#00000009':'#ffffff07';c.fillRect(x,y,1+(i%3),1);}
  c.textAlign='center';c.fillStyle=small?'#060402':'#52503f';const font=lines.length>3?35:52;c.font='bold '+font+'px '+(small?'Georgia':'Arial');
  const step=lines.length>3?74:105,start=lines.length>3?80:100;lines.forEach((line,i)=>c.fillText(line,512,start+i*step,945));
  if(lines.some(l=>l.includes('COUNTY OF MERIDIAN'))){c.strokeStyle='#6b634c';c.lineWidth=4;c.beginPath();c.arc(512,300,74,0,Math.PI*2);c.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6;c.beginPath();c.moveTo(512+Math.cos(a)*90,300+Math.sin(a)*90);c.lineTo(512+Math.cos(a)*113,300+Math.sin(a)*113);c.stroke();}}
  if(lines[0]==='MORNING IS SOMETHING WE TELL CHILDREN'){c.fillStyle='#4a4535bb';c.fillRect(20,25,984,130);c.strokeStyle='#484432cc';c.lineWidth=16;for(let i=0;i<9;i++){c.beginPath();c.moveTo(55,50+i*12);c.lineTo(965,46+i*12);c.stroke();}}
  if(lines[0]==='YOU ARE HERE'){c.fillStyle='#a49c86';c.fillRect(40,145,944,315);c.strokeStyle='#535744';c.lineWidth=5;for(let i=0;i<5;i++){c.beginPath();c.moveTo(70+i*78,180);c.lineTo(130+i*66,260);c.lineTo(75+i*73,410);c.stroke();}c.fillStyle='#b6ad94';c.fillRect(512,145,472,315);c.fillStyle='#604132';c.beginPath();c.arc(495,310,11,0,Math.PI*2);c.fill();}
  if(graffiti){c.strokeStyle='#591f16';c.lineWidth=19;c.lineCap='round';c.beginPath();c.moveTo(63,165);c.lineTo(957,283);c.moveTo(79,296);c.lineTo(962,151);c.stroke();c.save();c.translate(512,418);c.rotate(-.065);c.font='italic bold 66px Georgia';c.fillStyle='#514027';c.fillText(graffiti,0,0,930);c.restore();}
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.NoColorSpace;
  const mat=new THREE.MeshLambertMaterial({map:tex,vertexColors:true,side:THREE.DoubleSide,dithering:true});
  const geo=new THREE.PlaneGeometry(w,h);geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*3).fill(1),3));const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.y=yaw;root.add(mesh);this.signs.push(mesh);return mesh;
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
  const label=put(-6.2,11.438,.43);this._sign(root,{...label,yaw:XMAS.yaw,w:1.1,h:.43,lines:['SERVICE 17','LOCAL SUPPLY'],small:true});
  const notice=put(-7.9,12,1.5);this._sign(root,{...notice,yaw:XMAS.yaw,w:1.45,h:1.0,lines:['MRS VALE / CIRCUIT 17','Timer broken. Motor is sound.','Leave the coloured lights on.','They said our family could use this road.'],small:true});
  this._board(k,{...notice,yaw:XMAS.yaw,w:1.45,h:1.0},heightAt(notice.x,notice.z),'story:xmas');
  this.targets.push({id:'xmas-power',kind:'repair',...put(-6.2,11,1.05),title:'RECONNECT THE GENERATOR',hold:1.1,text:'The timer stops fighting the motor. Every house stays lit. Someone left two spare bulbs in the tool tray.',reward:160,cash:80});
  // A letter at the laid table turns the light display into a family waiting for somebody.
  const hyaw=Math.atan2(-11.5,-4.5),cx=Math.cos(hyaw),sx=Math.sin(hyaw),lp=put(-11.5+1.75*cx+.15*sx,-4.5-1.75*sx+.15*cx,.929);
  const letter=this._sign(root,{...lp,yaw:XMAS.yaw+hyaw,w:.36,h:.25,lines:['CAL / PLEASE READ THIS','We will keep the lights on.','Do not send anyone down Service 17.','The house has gone under the road.'],small:true});if(letter)letter.rotation.x=-Math.PI/2;
  this.targets.push({id:'xmas-letter',kind:'read',...lp,title:'READ THE LETTER',text:'“Cal, do not take the Service 17 route card. The road has fallen. Come the long way. We will keep the lights on. Supper is on. Love, Mom.”',rumour:true});
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
  this._sign(root,{x:approach.x+4,y:ay+1.9,z:approach.z,yaw:0,w:3.8,h:1.7,lines:['COUNTY SERVICE 17','ROAD OPEN','FOLLOW THE LIGHTS'],graffiti:'family below · lights on · do not use'});
  this._board(metal,{x:approach.x+4,y:ay+1.9,z:approach.z,yaw:0,w:3.8,h:1.7},ay,chunk);
  this.targets.push({id:'sinkhole-view',kind:'read',x:approach.x+4,y:ay+1.9,z:approach.z,title:'READ THE SCRATCHED NOTICE',text:'EVACUATION ROUTE 17 →\n\nThe arrow is scratched out. Under it: family below · lights on · do not use',rumour:true});
  this._mesh(k,root);this._mesh(plaster,root,this.materials.plaster);this._mesh(stone,root,this.materials.stone);this._mesh(metal,root,this.materials.metal);this.sinkhole={x:s.x,z:s.z,y:heightAt(s.x,s.z),house:{x:hx,y:hy,z:hz},approach};
  this.sinkhole.car=this._calsCar(root,chunk);
 }
 /**
  * CAL'S CAR, AT THE BOTTOM. The letter at the Vales' table asks Cal not to take the Service 17
  * card; the card in the house says they gave it to him after they knew. His car went down
  * with the road. It lies nose-down at the bottom of the bowl below the house, both doors open, a child's seat on the earth beside it and the presents that were
  * on the back seat spilled on down the slope. The shell is staged.js's carShell, built
  * level and then pitched to the slope measured under its own nose and tail; the wheels are
  * set on the ground by the highest of the four, and the body's collider is laid in pieces
  * along the pitch so it matches what is drawn.
  */
 _calsCar(root,chunk){
  // MEASURED on the analytic terrain (every 5 degrees and every metre of the bowl, the four
  // wheels against one pitched plane): the house stands on a shelf at 30 m and the true bottom
  // is south of it at 26-27 m. Here, 7 m from the centre, a car-sized footprint fits one plane
  // pitched 23 degrees nose-down to within 8 mm across and 0 mm of twist.
  const px=976.8,pz=198.2,hd=-20*Math.PI/180,dx=Math.cos(hd),dz=Math.sin(hd);
  const H=(x,z)=>heightAt(x,z),slope=(H(px+dx*1.9,pz+dz*1.9)-H(px-dx*1.9,pz-dz*1.9))/3.8;
  const pitch=Math.max(-.62,Math.min(.05,Math.atan(slope))),head=Math.atan2(-dz,dx),cp=Math.cos(pitch),sp=Math.sin(pitch),ch=Math.cos(head),sh=Math.sin(head);
  const kk={solid:new Kit(),glow:new Kit()},shapes=[];
  const api={heightAt:()=>0,wx:(x)=>x,wz:(x,z)=>z,emit:(sh2)=>{shapes.push(sh2);return -1;}};
  carShell(kk,api,0,0,0,{rust:true,open:1.05,roll:0});
  // car-local (x along the nose, y up, z across) to the world, and the height that sets it down
  const toW=(x,y,z,o)=>{const x2=x*cp-y*sp,y2=x*sp+y*cp;o.x=px+x2*ch+z*sh;o.z=pz-x2*sh+z*ch;o.y=y2;return o;};
  const q={x:0,y:0,z:0};let py=-1e9;
  for(const [wx,wz] of [[1.52,.88],[1.52,-.88],[-1.52,.88],[-1.52,-.88]]){toW(wx,-.01,wz,q);py=Math.max(py,H(q.x,q.z)-q.y);}
  const geo=kk.solid.build();geo.rotateZ(pitch);geo.rotateY(head);geo.translate(px,py,pz);projectPlaceSurfaceUVs(geo,2.5);
  // plaster: the metal family's surface map reads as planks under the torch on a car body
  const mesh=new THREE.Mesh(geo,this.materials.plaster);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  const col=this._sys('collision');
  for(const c of shapes){if(c.kind!=='obb')continue;const n=Math.max(1,Math.ceil(c.halfX*2/1.1)),hs=c.halfX/n;
   for(let i=0;i<n;i++){const cx=c.x-c.halfX+hs*(2*i+1);toW(cx,0,c.z,q);const dy=cx*sp,ex=Math.abs(hs*sp);
    col?.addCollider({kind:'obb',x:q.x,z:q.z,halfX:hs*cp,halfZ:c.halfZ,yaw:head,y0:py+c.y0*cp+dy-ex,y1:py+c.y1*cp+dy+ex,tag:'vehicle',standable:false,climbable:false},chunk);}}
  // what was in it: the child's seat out on the earth by the open rear door, a mitten, and
  // five presents spilled on down the slope below the nose, each on the ground it came to
  const k=new Kit(),SEAT=[.10,.11,.12];
  toW(-.55,0,1.75,q);{const gy=H(q.x,q.z);k.box(.40,.07,.40,q.x,gy+.035,q.z,SEAT,head+.4);k.box(.40,.46,.07,q.x-Math.sin(head+.4)*.19,gy+.25,q.z-Math.cos(head+.4)*.19,SEAT,head+.4,-.12);
   for(const e of[-1,1])k.box(.06,.26,.40,q.x+Math.cos(head+.4)*.19*e,gy+.15,q.z-Math.sin(head+.4)*.19*e,SEAT,head+.4);
   col?.addCollider({kind:'obb',x:q.x,z:q.z,halfX:.22,halfZ:.22,yaw:head+.4,y0:gy-.05,y1:gy+.48,tag:'wood',climbable:false},chunk);
   const mx=q.x+Math.cos(head)*.45,mz=q.z-Math.sin(head)*.45;k.box(.10,.035,.14,mx,H(mx,mz)+.02,mz,[.30,.27,.24],head+1.1);}
  const PAPER2=[[.16,.09,.08],[.08,.11,.09],[.15,.13,.08],[.10,.08,.12],[.14,.14,.13]],RIB=[.25,.23,.18];
  for(let i=0;i<5;i++){const along=.55+i*.52,lat=((i*37)%5-2)*.42,w=.30+(i%3)*.08,h=.16+(i%2)*.08;
   toW(2.15+along,0,lat,q);const x=q.x,z=q.z,tilt=Math.atan((H(x+dx*.3,z+dz*.3)-H(x-dx*.3,z-dz*.3))/.6),yaw=head+i*.7,gy=H(x,z)+h*.5*Math.cos(tilt)-.01;
   k.box(w,h,w*.8,x,gy,z,PAPER2[i],yaw,0,tilt*Math.cos(yaw-head));k.box(w+.006,h+.006,.035,x,gy,z,RIB,yaw,0,tilt*Math.cos(yaw-head));k.box(.035,h+.008,w*.8+.006,x,gy,z,RIB,yaw,0,tilt*Math.cos(yaw-head));}
  this._mesh(k,root,this.materials.plaster);
  toW(0,0,0,q);return{x:q.x,y:py,z:q.z,pitch,head};
 }
 /**
  * MARNIE'S CHAIR. Marnie Oakes kept the fire lookout on the Great Tree's deck: the last page
  * before it happened is a drawing of the sunset, and after that she counted lights (her
  * logbook is the site's record). Her chair is on the ring facing world west, where the sun
  * went down, a blanket over its arm and her binoculars on the seat, and the drawing is
  * pinned to the rail post in front of it.
  *
  * The ring is sites.js's great-tree body: an annulus r 3.7..9.0 at pad + 12.9 over 238 deg
  * from 323.75 deg (the stair's last tread at 310 + 0.24 rad) round to 201.75 deg, posts at
  * r 8.85 every 11.9 deg. The chair goes at r 7.3 on the bearing nearest world west that is
  * 8 deg inside the ring's ends and clear of the logbook desk (39.7 deg) and the claim cage
  * (4.5 deg). Everything stands on the deck's top, which is flat.
  */
 _marnie(){
  const n=this._sys('places')?.nodes.get('great-tree');if(!n)return;
  const yaw=n.yaw||0,deg=a=>((a*180/Math.PI)%360+360)%360,dist=(a,b)=>{const d=Math.abs(deg(a)-deg(b))%360;return d>180?360-d:d;};
  const R0=323.75*Math.PI/180,R1=201.75*Math.PI/180,DA=238/20*Math.PI/180;
  const ok=a=>{const d=deg(a);if(d>193.75&&d<331.75)return false;return dist(a,39.7*Math.PI/180)>22&&dist(a,4.5*Math.PI/180)>26;};
  const west=Math.atan2(-Math.sin(yaw),-Math.cos(yaw));let a=west;
  for(let i=1;i<=36&&!ok(a);i++){const t=west+Math.ceil(i/2)*(i%2?1:-1)*5*Math.PI/180;if(ok(t)){a=t;break;}}
  if(!ok(a))return;
  const top=n.padY+12.9,cx=Math.cos(a)*7.3,cz=Math.sin(a)*7.3,face=Math.atan2(Math.cos(a),Math.sin(a));
  const g=new THREE.Group();g.position.set(n.def.x,0,n.def.z);g.rotation.y=yaw;const root=this._group('marnies-chair',n.def.x,n.def.z);root.add(g);
  const k=new Kit(),W=[.11,.085,.055],c=Math.cos(face),sn=Math.sin(face),at=(lx,lz)=>[cx+lx*c+lz*sn,cz-lx*sn+lz*c];
  // a folding lookout chair: canvas seat and back on a timber frame
  k.box(.46,.04,.44,cx,top+.44,cz,[.14,.12,.09],face);
  for(const [lx,lz] of[[-.2,-.19],[.2,-.19],[-.2,.19],[.2,.19]]){const[x,z]=at(lx,lz);k.box(.035,.42,.035,x,top+.21,z,W,face);}
  {const[x,z]=at(0,-.2);k.box(.46,.52,.035,x,top+.72,z,[.14,.12,.09],face,.1);}
  // the blanket over its arm, hanging to the boards on the trunk side
  {const[x,z]=at(-.25,0);k.box(.06,.46,.40,x,top+.23,z,[.12,.07,.06],face);const[x2,z2]=at(-.16,0);k.box(.20,.03,.42,x2,top+.475,z2,[.12,.07,.06],face);}
  // her binoculars, on the seat, pointed where she was looking
  for(const s2 of[-1,1]){const[x,z]=at(s2*.045,.02);k.cyl(.028,.028,.13,8,x,top+.49,z,[.05,.05,.055],face,Math.PI*.5);}
  const mesh=new THREE.Mesh(k.build(),this.materials.timber);projectPlaceSurfaceUVs(mesh.geometry,2.5);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  const col=this._sys('collision'),w=this._sitePoint('great-tree',cx,12.9,cz);
  col?.addCollider({kind:'obb',x:w.x,z:w.z,halfX:.24,halfZ:.23,yaw:yaw+face,y0:top,y1:top+.46,tag:'wood',standable:true},'story:marnie');
  // the drawing, pinned to the inside face of the rail post nearest the chair's bearing
  const i=Math.round(((deg(a)-deg(R0)+360)%360)/deg(DA)),ap=R0+i*DA,pr=8.85-.06-.004;
  const pp=this._sitePoint('great-tree',Math.cos(ap)*pr,12.9+1.12,Math.sin(ap)*pr);
  pp.yaw=yaw+Math.atan2(-Math.cos(ap),-Math.sin(ap));
  this._sketch(root,pp);
  this.marnie={x:w.x,y:top,z:w.z,bearing:deg(a),post:{x:pp.x,y:pp.y,z:pp.z}};
 }
 /** Marnie's sunset, in pencil on a page torn out of the logbook. */
 _sketch(root,p){
  if(typeof document==='undefined')return;
  const cv=document.createElement('canvas');cv.width=256;cv.height=320;const c=cv.getContext('2d');
  // dark paper and a heavy pencil: the torch at arm's length flattens anything paler
  c.fillStyle='#3b372b';c.fillRect(0,0,256,320);c.strokeStyle='#0b0a07';c.lineWidth=5;c.lineCap='round';
  c.beginPath();c.moveTo(18,190);c.lineTo(238,186);c.stroke();                       // the horizon
  c.beginPath();c.arc(128,188,44,Math.PI,0);c.stroke();                               // the sun, half gone
  for(let i=0;i<9;i++){const t=Math.PI+(i+.5)*Math.PI/9;c.beginPath();c.moveTo(128+Math.cos(t)*56,188+Math.sin(t)*56);c.lineTo(128+Math.cos(t)*78,188+Math.sin(t)*78);c.stroke();}
  c.lineWidth=3;for(let i=0;i<14;i++){const x=20+i*16;c.beginPath();c.moveTo(x,205);c.lineTo(x+7,188+(i%3)*3);c.lineTo(x+14,205);c.stroke();}   // the pines
  for(let i=0;i<22;i++){c.beginPath();c.moveTo(20+i*10,214);c.lineTo(26+i*10,226);c.stroke();}
  paintHandwriting(c,'Oct 31  5:41',30,272,200,26,'great-tree');
  const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.NoColorSpace;
  const mat=new THREE.MeshLambertMaterial({map:tex,vertexColors:true,side:THREE.DoubleSide,dithering:true});
  const geo=new THREE.PlaneGeometry(.21,.27);geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*3).fill(1),3));
  const m=new THREE.Mesh(geo,mat);m.position.set(p.x,p.y,p.z);m.rotation.set(0,p.yaw,.04);root.add(m);this.signs.push(m);
 }
 _roadNotice(){
  const [x,z]=LOST_DRIVE[0],root=this._group('official-route-crossed-out',x,z),k=new Kit(),y=heightAt(x+5,z+2);
  this._sign(root,{x:x+5,y:y+2.0,z:z+2,yaw:.23,w:4.4,h:2.2,lines:['EVACUATION ROUTE 17 →','SERVICE 17 / ROAD OPEN','KEEP YOUR LIGHTS ON'],graffiti:'THEY KNEW'});
  this._board(k,{x:x+5,y:y+2,z:z+2,yaw:.23,w:4.4,h:2.2},y,'story:road-notice');
  // A service reel and a severed orange lead repeat the cable at the houses.
  k.cyl(.6,.6,.85,20,x+2,y+.64,z-1,WOOD,0,Math.PI/2);cable(k,[[x+2,y+.3,z-1],[x-1,y+.06,z-3],[x-4,y+.06,z-7],[x-3,y+.07,z-13]],.037,[.15,.079,.032]);this._mesh(k,root);
 }
 // The speaker is 'a note' rather than a person: it is what is written down, read out.
 // Priority 5 so a resident saying hello cannot bury it, interruptible so danger can.
 _say(text,id){this.receipt=Math.max(10,Math.min(45,text.length/20));
  this._sys('dialogue')?.say({id:'story.'+(id||'note'),speaker:'a note',text,priority:5,interrupt:true,
   durS:Math.max(6,Math.min(26,text.length/17))});}
 _use(t){const pr=this._sys('progress'),key='story:'+t.id,first=!pr.flag(key);
  if(t.kind==='repair'&&!first)return;
  if(first){pr.flag(key,true);if(t.reward)pr.award(t.reward,t.x,t.y,t.z,'discovery');if(t.cash)pr.payCash(t.cash,t.x,t.y,t.z,'story');if(t.kind==='repair')this._sys('dusk-to-dawn')?.addBulb(2);pr.save.flush();}
  if(t.rumour)this._reveal(t.id==='sinkhole-view');
  this._say(t.text,t.id);this.ctx.bus.emit('story:read',{id:t.id,first,title:t.title,text:t.text,siteId:t.siteId,hand:t.hand});
 }
 _reveal(visited=false){const pr=this._sys('progress');pr.learnRumour({id:SINKHOLE.id,name:SINKHOLE.name,x:SINKHOLE.x,z:SINKHOLE.z,kind:'story'});if(visited)pr.discoverBoss(SINKHOLE.id);}
 step(dt){
  if(!this.ctx.playing||this.ctx.paused)return;this.time+=dt;this.receipt=Math.max(0,this.receipt-dt);this.drownedMemory?.step(dt);this.bellAnswers?.step(dt);this.moments?.step(dt);
  const p=this._sys('player'),pr=this._sys('progress');if(!p?.pos)return;
  const use=this.ctx.input.held('use');if(!use)this.latch=false;
  // Streamed trail cameras keep their card identity across rebuilds. The camera, rather
  // than an invisible map point, is the thing the player reaches to read.
  const cameras=this._sys('setpieces')?._triggers||[];
  this.targets=this.targets.filter(t=>!t.camera||cameras.includes(t.camera));
  for(const camera of cameras){if(this.targets.some(t=>t.camera===camera))continue;const id='camera:'+camera.rec.key+':'+Math.round(camera.x)+':'+Math.round(camera.z);this.targets.push({id,camera,kind:'read',x:camera.x,y:camera.y,z:camera.z,title:'READ THE CAMERA CARD',text:'OCT 31 · Deer. Deer. Deer.\nOCT 31 · 5:41 PM · The trail in daylight. Sun through the branches.\nNOV 1 · 1:47 AM · The empty trail.\nNOV 1 · 1:47 AM · The same trail. Everyone in the county is standing on it, facing east.\nNOV 1 · 1:'+String(10+Math.floor((this.time%300)/6)).padStart(2,'0')+' AM · You, from behind. Taken just now.'});}
  let target=null,best=3.3;
  const camera=this._sys('camera'),yaw=camera?.yaw??p.yaw??0,pitch=camera?.pitch??0;
  const cp=Math.cos(pitch),forward={x:-Math.sin(yaw)*cp,y:Math.sin(pitch),z:-Math.cos(yaw)*cp};
  const eye=p.eyeY??p.pos.y+1.6;
  if(!this.ctx.shared.inCar&&!p.dead)for(const t of this.targets){
   if(t.enabled&&!t.enabled())continue;
   const dx=t.x-p.pos.x,dy=t.y-eye,dz=t.z-p.pos.z,len=Math.hypot(dx,dy,dz);
   if(len>best||len<.001)continue;
   // Reading follows the actual three-dimensional gaze. A sign above a doorway
   // must not take its E prompt while the player looks through the doorway.
   if((dx*forward.x+dy*forward.y+dz*forward.z)/len<.94)continue;
   const ray=this._sys('collision')?.raycast({x:p.pos.x,y:eye,z:p.pos.z},{x:dx/len,y:dy/len,z:dz/len},len,MASK.SIGHT);
   // The 0.70 m slack is the board a notice is nailed to: its collider stands in front of
   // the point the target is registered at. MEASURED 2026-09-15 with tools over every target:
   // at 0.12 m the Cathedral (a blocker 0.48 m short) and the Hollow Mill (0.19 m short) could
   // no longer be read from any bearing.
   if(ray&&ray.t<len-.70)continue;
   target=t;best=len;
  }
  if(target!==this.target){this.target=target;this.hold=0;}
  if(target){const repaired=target.kind==='repair'&&pr.flag('story:xmas-power');this.ctx.bus.emit('prompt',{kind:'hold',label:'E',rank:7,x:target.x,y:target.y,z:target.z,k:this.hold/(target.hold||.2),detail:repaired?'THE LIGHTS WILL STAY ON':target.title,subdetail:target.sub!==undefined?target.sub:target.kind==='repair'?'SERVICE 17 · LOCAL POWER':'E · READ',unavailable:!!repaired});if(use&&!this.latch&&!repaired){this.hold+=dt;if(this.hold>=(target.hold||.2)){if(target.act)target.act();else this._use(target);this.hold=0;this.latch=true;}}else this.hold=0;}
  const powered=!!pr.flag('story:xmas-power');if(this.switch){this.switch.rotation.z=powered?.52:-.52;this.switch.material.color.setHex(powered?0x567450:0x9a2c1e);}
  const near=Math.hypot(p.pos.x-XMAS.x,p.pos.z-XMAS.z)<34,lights=this._sys('lights');
  if(powered&&near){if(!this.lamp?.inUse)this.lamp=lights?.borrow('christmas-house',XMAS.x,this.generator.y+3.0,XMAS.z,0xffc88b,13,0);if(this.lamp){this.lamp.peak=13;this.lamp.distance=30;this.lamp.decay=.95;}if(Math.hypot(p.pos.x-XMAS.x,p.pos.z-XMAS.z)<19){this.ctx.shared.lit=Math.max(this.ctx.shared.lit||0,.65);this.ctx.bus.emit('place:near',{id:'story:xmas',lit:true,x:XMAS.x,y:this.generator.y,z:XMAS.z});}}
  else if(this.lamp){lights?.release(this.lamp);this.lamp=null;}
  if(Math.hypot(p.pos.x-SINKHOLE.x,p.pos.z-SINKHOLE.z)<64&&pr.mapStatus(SINKHOLE.id)!=='discovered')this._reveal(true);
 }
 present(alpha){this.bellAnswers?.present(alpha);this.moments?.present();const p=this._sys('player')?.pos;for(const a of this.groups)a.g.visible=!p||Math.hypot(p.x-a.x,p.z-a.z)<550;}
 state(){return{moments:this.moments?.state(),marnie:this.marnie||null,power:!!this._sys('progress')?.flag('story:xmas-power'),generator:this.generator?{x:this.generator.x,y:this.generator.y,z:this.generator.z}:null,sinkhole:this.sinkhole,targets:this.targets.map(t=>({id:t.id,kind:t.kind,x:t.x,y:t.y,z:t.z})),target:this.target?.id||null};}
 dispose(){this.drownedMemory?.dispose();this.bellAnswers?.dispose();this.moments?.dispose();this._sys('lights')?.release(this.lamp);for(const id of['story:xmas','story:sinkhole','story:road-notice','story:records','story:marnie'])this._sys('collision')?.removeChunk(id);this.group?.traverse(o=>{o.geometry?.dispose();});for(const s of this.signs){s.material.map.dispose();s.material.dispose();}this.switch?.material.dispose();for(const mat of Object.values(this.materials||{}))mat.dispose();this.group?.removeFromParent();}
}

/* ==============================================================================================
   THE COUNTY MOMENTS. Alex, 2026-09-18: "make it so there are beautifully horrifying things
   that make my stomach drop or my heart beat rapidly irl around each corner." Five places get
   one authored thing each that happens once, to you, when you are there:

     the seventh coat   Weeping Mine chain room. Six coats hauled up to the roof. Look away and
                        back: a seventh hangs low on the empty hook, coat, trousers and boots,
                        no head. Watch it and it turns on its chain to face you. Look away: it
                        is on the floor, and the chain is swinging.
     the wake table     Gallowsfen. A sheet over somebody on the table. Hold E at the head and
                        you fold it back: a grey face, eyes shut. Look away and back: open.
     the mill floor     Hollow Mill. On the threshing floor, four sets of hooves walk the circle
                        under the stone. Stand at the centre and they stop, all at once, and
                        something knocks once under your feet.
     the stair          The Holdfast's sealed stair, at night, while the Kept lives. Stand at
                        the top and metal scrapes on metal a long way down, three times. An E
                        with no words. Knock, and after a while everything down there knocks back.
     Dad's chair        The Avery House. A chair out on the west lawn facing the children's
                        window, his coat over the back, a thermos, the grass worn in front of it.
                        Read the note in the boy's room ("Dad is outside watching") and look out:
                        somebody is standing behind the chair, facing the house. Look away and
                        he is gone, and the chair is turned to face the road.

   The rules they share: no words (an E with no label is the only prompt), no light, no new
   program (the story materials and dread's own figure geometry and material family), every
   sound through dread.answer at a gain a person feels rather than hears, every payoff holds
   the county's loud gap (dread.noteLoud), and each is certain to happen once when you do the
   thing and never repeats while its flag is set. Attention is checked ten times a second and
   nothing on the hot path allocates.
   ============================================================================================== */
const CLOTH=[.066,.066,.060],TROUSER=[.046,.047,.052],BOOT=[.030,.028,.026],SHEET=[.171,.156,.126],DARK=[.02,.02,.022],CHAIN_COL=[.075,.052,.040];
// grey-green, two steps under the sheet, so the whites of his eyes are the palest thing on him
const DEAD=[.078,.086,.078],WOOL=[.036,.038,.036];
const MOMENT_SHOW=160;

class CountyMoments {
 constructor(ctx,stories){this.ctx=ctx;this.st=stories;this.acc=0;this.night=0;this.roots=[];}
 _sys(id){return this.ctx.systems.get(id);}
 _flag(k,v){const pr=this._sys('progress');if(!pr)return null;return v===undefined?pr.flag(k):pr.flag(k,v);}
 /** The site's frame as a group: children are authored in the site's LOCAL metres. */
 _site(id){const n=this._sys('places')?.nodes.get(id);if(!n)return null;const g=new THREE.Group();g.name='moment-'+id;g.position.set(n.def.x,0,n.def.z);g.rotation.y=n.yaw||0;this.group.add(g);
  const c=Math.cos(n.yaw||0),s=Math.sin(n.yaw||0);const S={id,g,padY:n.padY,x:n.def.x,z:n.def.z,w:(lx,lz,o)=>{o.x=n.def.x+lx*c+lz*s;o.z=n.def.z-lx*s+lz*c;return o;}};this.roots.push(S);return S;}
 _ground(S,lx,lz){const p=S.w(lx,lz,{x:0,z:0});return heightAt(p.x,p.z);}
 _mesh(k,mat){const geo=k.build();projectPlaceSurfaceUVs(geo,2.5);const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;return m;}
 _col(shape,chunk){const id=this._sys('collision')?.addCollider(shape,chunk);return id;}
 /** How squarely the camera looks at a point: the cosine, and this._d the distance. */
 _view(x,y,z){const cam=this.ctx.camera,c=this._sys('camera');if(!cam||!c){this._d=1e9;return -1;}
  const dx=x-cam.position.x,dy=y-cam.position.y,dz=z-cam.position.z,d=Math.hypot(dx,dy,dz)||1e-4,cp=Math.cos(c.pitch);this._d=d;
  return(-dx*Math.sin(c.yaw)*cp+dy*Math.sin(c.pitch)-dz*Math.cos(c.yaw)*cp)/d;}
 _clear(x,y,z){const cam=this.ctx.camera,col=this._sys('collision');return !cam||!col||col.segmentClear(cam.position.x,cam.position.y,cam.position.z,x,y,z);}
 _say(kind,x,y,z,g){this._sys('dread')?.answer(kind,x,y,z,g);}
 build(){
  this.group=new THREE.Group();this.group.name='county-moments';this.ctx.scene.add(this.group);
  const M=this.st.materials;this.mats={cloth:M.plaster,wood:M.timber,metal:M.metal,stone:M.stone};
  this._buildCoat();this._buildWake();this._buildMill();this._buildStair();this._buildDad();
  const bus=this.ctx.bus;
  this.offs=[bus.on('phase:changed',p=>{if(p&&p.phase==='dusk'&&p.prev)this.night++;}),
   bus.on('story:read',p=>{if(p&&p.id==='site:avery-house')this._dadCue();})];
 }

 /* ------------------------------------------------------------------ the seventh coat */
 _buildCoat(){
  const S=this._site('weeping-mine');if(!S)return;const R=CHAIN_ROOM,top=R.railY-.2,hook=2.45,L=top-hook;
  const floor=this._ground(S,R.seventh.x,R.seventh.z)-S.padY;
  const pivot=new THREE.Group();pivot.position.set(R.seventh.x,S.padY+top,R.seventh.z);S.g.add(pivot);
  const ck=new Kit();ck.cyl(.014,.014,L,5,0,-L*.5,0,CHAIN_COL);ck.box(.03,.07,.012,0,-L+.02,0,C.metal);
  pivot.add(this._mesh(ck,this.mats.metal));
  // coat, trousers and boots, hung by the collar from the hook: the shape of a man, no head
  const bk=new Kit();
  bk.box(.15,.08,.14,0,-.04,0,DARK);bk.box(.48,.11,.20,0,-.12,0,CLOTH);bk.box(.44,.76,.22,0,-.54,0,CLOTH,0,.02);
  for(const s of[-1,1]){bk.box(.13,.64,.15,s*.28,-.47,.01,CLOTH,0,0,s*.05);bk.box(.10,.09,.11,s*.29,-.83,.02,[.10,.10,.095]);}
  for(const s of[-1,1]){bk.box(.17,.92,.17,s*.1,-1.36,0,TROUSER);bk.box(.15,.24,.16,s*.1,-1.94,.01,BOOT);bk.box(.15,.08,.26,s*.1,-2.03,.06,BOOT);}
  const body=this._mesh(bk,this.mats.cloth);body.position.y=-L;body.rotation.y=Math.PI;body.visible=false;pivot.add(body);
  // the heap on the floor under the hook
  const hk=new Kit(),hx=R.seventh.x,hz=R.seventh.z+.05,fy=S.padY+floor;
  hk.box(.62,.07,.46,hx,fy+.035,hz,CLOTH,.5);hk.box(.30,.06,.26,hx+.18,fy+.10,hz-.05,CLOTH,-.3);
  hk.box(.16,.07,.62,hx-.26,fy+.035,hz+.12,TROUSER,.9);hk.box(.16,.07,.55,hx-.10,fy+.035,hz+.22,TROUSER,1.3);
  hk.box(.15,.24,.15,hx+.30,fy+.12,hz+.28,BOOT);hk.box(.26,.10,.15,hx-.33,fy+.05,hz-.22,BOOT,.4,0,Math.PI*.5);
  const heap=this._mesh(hk,this.mats.cloth);heap.visible=false;S.g.add(heap);
  const w=S.w(R.seventh.x,R.seventh.z,{x:0,z:0});
  this.coat={S,pivot,body,heap,x:w.x,z:w.z,y:S.padY+hook-.9,fy,state:this._flag('moment:seventh-coat')==='fallen'?'fallen':'wait',t:0,near:0,away:0,watch:0,turn:0,turnTo:0,swingT:9};
  if(this.coat.state==='fallen')this._coatFallen(false);
 }
 _coatFallen(live){
  const C7=this.coat;C7.state='fallen';C7.body.visible=false;C7.heap.visible=true;
  this._col({kind:'obb',x:C7.x,z:C7.z,halfX:.40,halfZ:.35,yaw:0,y0:C7.fy-.05,y1:C7.fy+.14,tag:'body',standable:true},'story:moments');
  if(!live)return;
  C7.swingT=0;this._flag('moment:seventh-coat','fallen');
  this._say('drop-impact',C7.x,C7.fy+.2,C7.z,.42);
  const d=this._sys('dread');d?.hush(2.4,C7.x,C7.z);d?.noteLoud('coat');this._sys('fx')?.addTrauma?.(.03);
 }
 _stepCoat(dt){
  const C7=this.coat;if(!C7||C7.state==='fallen')return;
  const p=this._sys('player')?.pos;if(!p)return;const dxz=Math.hypot(p.x-C7.x,p.z-C7.z);
  if(dxz>30){if(C7.state!=='wait'){C7.state='wait';C7.body.visible=false;}C7.near=0;return;}
  if(this.ctx.shared.interiorHorror&&C7.state==='wait')return;
  const dot=this._view(C7.x,C7.y,C7.z),seen=dot>.93&&this._d<16&&this._clear(C7.x,C7.y,C7.z);
  if(C7.state==='wait'){
   C7.near=dxz<13?C7.near+dt:0;C7.away=dot<.45?C7.away+dt:0;
   // It is not there while you are looking at the room. It is there the next time you look.
   if(C7.near>2.5&&C7.away>1.0){C7.state='hung';C7.body.visible=true;C7.body.rotation.y=Math.PI;C7.watch=0;this._say('cable-strain',C7.x,C7.y+2.5,C7.z,.16);}
  }else if(C7.state==='hung'){
   C7.watch=seen?C7.watch+dt:Math.max(0,C7.watch-dt*.5);
   if(C7.watch>1.2){
    // a quarter turn on its chain, toward you
    const lx=p.x-C7.x,lz=p.z-C7.z,want=Math.atan2(lx,lz)-C7.S.g.rotation.y;let dy=want-Math.PI;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;
    C7.turnFrom=Math.PI;C7.turnTo=Math.PI+Math.max(-Math.PI*.5,Math.min(Math.PI*.5,dy));C7.turn=0;C7.state='turning';C7.away=0;
    this._say('cable-strain',C7.x,C7.y+2.5,C7.z,.30);
   }
  }else if(C7.state==='turning'||C7.state==='turned'){
   if(C7.state==='turning'){C7.turn+=dt/.9;if(C7.turn>=1){C7.turn=1;C7.state='turned';}}
   C7.away=dot<.8?C7.away+dt:0;
   if(C7.state==='turned'&&C7.away>.45)this._coatFallen(true);
  }
 }
 _presentCoat(dt){
  const C7=this.coat;if(!C7)return;
  if(C7.state==='turning'||C7.state==='turned'){const u=C7.turn*C7.turn*(3-2*C7.turn);C7.body.rotation.y=C7.turnFrom+(C7.turnTo-C7.turnFrom)*u;}
  if(C7.swingT<4.5){C7.swingT+=dt;const k=Math.exp(-C7.swingT/1.4);C7.pivot.rotation.z=.16*k*Math.sin(C7.swingT*2.3);C7.pivot.rotation.x=.07*k*Math.sin(C7.swingT*2.3+1.2);}
  else if(C7.pivot.rotation.z!==0){C7.pivot.rotation.z=0;C7.pivot.rotation.x=0;}
 }

 /* ------------------------------------------------------------------ the wake table */
 _buildWake(){
  const S=this._site('gallowsfen');if(!S)return;const W=WAKE_TABLE;
  // the table's frame: the ringing floor's (dress-interiors steeple), rotated by its yaw
  const fc=Math.cos(W.yaw),fs=Math.sin(W.yaw),TX=W.rx+W.lx*fc+W.lz*fs,TZ=W.rz-W.lx*fs+W.lz*fc;
  const top=this._ground(S,W.rx,W.rz)-S.padY+W.raise+W.top;
  const T=new THREE.Group();T.position.set(TX,S.padY+top,TZ);T.rotation.y=W.yaw;S.g.add(T);
  const tl=(lx,lz,o)=>S.w(TX+lx*fc+lz*fs,TZ-lx*fs+lz*fc,o);
  // him: lying along the table, head to +x. Hidden under the sheet except the face.
  const bk=new Kit();
  bk.box(1.05,.15,.44,-.12,.075,0,TROUSER);bk.box(.66,.12,.34,-.78,.06,0,TROUSER);
  for(const s of[-1,1])bk.box(.09,.15,.09,-1.08,.12,s*.09,BOOT);
  bk.box(.10,.07,.12,.47,.055,0,DEAD);                                    // the neck
  T.add(this._mesh(bk,this.mats.cloth));
  // THE HEAD turns on the neck (x .5): face up while his eyes are shut, and rolled toward
  // you when they are open. Everything on it is in the head's own frame, face along +y.
  const headPivot=new THREE.Group();headPivot.position.set(.5,.095,0);T.add(headPivot);
  const hk=new Kit();
  const head=new THREE.SphereGeometry(.112,12,9);head.scale(1.1,.82,.92);head.translate(.12,0,0);hk.push(head,DEAD);
  // wet hair on the crown only, behind the hairline, so the face is bare
  const hair=new THREE.SphereGeometry(.118,10,7,0,Math.PI*2,0,Math.PI*.38);hair.rotateZ(-Math.PI*.5);hair.scale(1.05,.84,.95);hair.translate(.12,0,0);hk.push(hair,DARK);
  // the face, sampled on the head's own ellipsoid (radii .123/.092/.103) so nothing floats over it
  hk.box(.05,.022,.026,.105,.095,0,DEAD);                                 // the nose
  hk.box(.012,.005,.05,.065,.0825,0,DARK);                                // the mouth, shut
  for(const s of[-1,1]){const e=new THREE.SphereGeometry(.034,8,6);e.scale(1.1,.5,1.3);e.translate(.138,.08,s*.043);hk.push(e,DARK);}   // the sockets
  headPivot.add(this._mesh(hk,this.mats.cloth));
  // shut: lids across the sockets. Open: the whites, and a pupil in each, looking at you
  const ek=new Kit();for(const s of[-1,1]){const l=new THREE.SphereGeometry(.027,8,6);l.scale(1.05,.42,1.2);l.translate(.14,.087,s*.043);ek.push(l,DEAD);}
  const shut=this._mesh(ek,this.mats.cloth);headPivot.add(shut);
  const ok=new Kit();for(const s of[-1,1]){const w=new THREE.SphereGeometry(.022,8,6);w.scale(1.0,.55,1.25);w.translate(.138,.091,s*.043);ok.push(w,[.46,.45,.41]);ok.box(.013,.004,.013,.138,.1015,s*.043,DARK);}
  const open=this._mesh(ok,this.mats.cloth);open.visible=false;headPivot.add(open);
  // the sheet: the long part over him, and the flap over his face that folds back at x .2
  const sk=new Kit();
  sk.box(1.30,.025,.80,-.45,.245,0,SHEET);for(const s of[-1,1])sk.box(1.30,.23,.02,-.45,.13,s*.39,SHEET);sk.box(.02,.23,.80,-1.10,.13,0,SHEET);
  T.add(this._mesh(sk,this.mats.cloth));
  const hinge=new THREE.Group();hinge.position.set(.2,.258,0);T.add(hinge);
  const fk=new Kit();fk.box(.84,.022,.34,.42,0,0,SHEET);for(const s of[-1,1])fk.box(.84,.022,.30,.42,-.11,s*.26,SHEET,0,s*.95);fk.box(.02,.20,.70,.84,-.10,0,SHEET);
  const flap=this._mesh(fk,this.mats.cloth);hinge.add(flap);
  const hw={x:0,z:0},cw={x:0,z:0};tl(.62,0,hw);tl(-.2,0,cw);
  this._col({kind:'obb',x:cw.x,z:cw.z,halfX:.94,halfZ:.40,yaw:S.g.rotation.y+W.yaw,y0:S.padY+top,y1:S.padY+top+.27,tag:'body',standable:true},'story:moments');
  // attention is taken at a point just over the body's own collider (top .27), or the line to
  // his face would end inside it and he could never be looked at
  this.wake={S,T,hinge,headPivot,shut,open,fx:hw.x,fz:hw.z,fy:S.padY+top+.31,state:'covered',t:0,away:0,seen:0,roll:0,rollTo:0};
  const tw={x:0,z:0};tl(.98,0,tw);
  this.st.targets.push({id:'moment:wake',kind:'lift',title:'',sub:'',hold:.6,x:tw.x,y:S.padY+top+.35,z:tw.z,
   enabled:()=>this.wake.state==='covered',act:()=>this._lift()});
 }
 _lift(){const K=this.wake;K.state='lifting';K.t=0;this._say('brush',K.fx,K.fy,K.fz,.18);}
 _stepWake(dt){
  const K=this.wake;if(!K)return;const p=this._sys('player')?.pos;if(!p)return;
  if(Math.hypot(p.x-K.fx,p.z-K.fz)>60){if(K.state!=='covered'){K.state='covered';K.hinge.rotation.z=0;K.shut.visible=true;K.open.visible=false;K.roll=0;K.rollTo=0;K.headPivot.rotation.x=0;}return;}
  if(K.state==='covered')return;
  K.t+=dt;
  if(K.state==='lifting'){if(K.t>=.9){K.state='lifted';K.t=0;K.seen=0;K.away=0;}return;}
  const dot=this._view(K.fx,K.fy,K.fz),seen=dot>.9&&this._d<9&&this._clear(K.fx,K.fy,K.fz);
  if(K.state==='lifted'){
   if(K.t>1.0&&!K.hushed){K.hushed=true;this._sys('dread')?.hush(3.2,K.fx,K.fz);}
   K.seen=seen?K.seen+dt:K.seen;K.away=dot<.6?K.away+dt:0;
   // You looked at him. You looked away for a whole second. He has not moved, except his eyes.
   if(K.seen>.6&&K.away>1.0){
    K.state='waiting';K.shut.visible=false;K.open.visible=true;
    // and his head has rolled over on the table toward the side you are standing on
    const g=K.S.g.rotation.y+WAKE_TABLE.yaw,dx=p.x-K.fx,dz=p.z-K.fz,lz=dx*Math.sin(g)+dz*Math.cos(g);
    K.rollTo=lz>=0?1.15:-1.15;K.headPivot.rotation.x=K.rollTo;
   }
  }else if(K.state==='waiting'&&seen){
   K.state='open';this._say('witnessed',K.fx,K.fy,K.fz,.30);
   const d=this._sys('dread');d?.hush(2.5,K.fx,K.fz);d?.noteLoud('wake');this._sys('fx')?.addTrauma?.(.03);
  }
 }
 _presentWake(){const K=this.wake;if(!K)return;const u=K.state==='covered'?0:K.state==='lifting'?Math.min(1,K.t/.9):1;K.hinge.rotation.z=Math.PI*.97*u*u*(3-2*u);}

 /* ------------------------------------------------------------------ the mill floor */
 _buildMill(){
  const n=this._sys('places')?.nodes.get('hollow-mill');if(!n)return;
  const p=this.st._sitePoint('hollow-mill',-10.5,0,-8.5);
  this.mill={x:p.x,z:p.z,top:heightAt(p.x,p.z)+.18,night:-1,on:0,centre:0,step:0,a:0,phase:'walk',t:0};
 }
 _stepMill(dt){
  const M=this.mill;if(!M||M.night===this.night)return;const pl=this._sys('player');const p=pl?.pos;if(!p||this.ctx.shared.inCar||pl.dead)return;
  const r=Math.hypot(p.x-M.x,p.z-M.z),on=r<5.2&&Math.abs(p.y-M.top)<.45;
  if(M.phase==='walk'){
   if(!on){M.centre=0;return;}
   M.a+=dt*Math.PI*2/9.4;M.step-=dt;
   if(M.step<=0){M.step=.47;for(let i=0;i<4;i++){const a=M.a+i*Math.PI*.5;this._say('footfall',M.x+Math.cos(a)*3.6,M.top-1.6,M.z+Math.sin(a)*3.6,.20);}}
   M.centre=r<1.0?M.centre+dt:0;
   if(M.centre>3){M.phase='stop';M.t=0;this._sys('dread')?.hush(4,M.x,M.z);}
  }else if(M.phase==='stop'){
   M.t+=dt;
   if(M.t>1.2){this._say('knock',p.x,M.top-.5,p.z,.45);const d=this._sys('dread');d?.noteLoud('mill');this._sys('fx')?.addTrauma?.(.025);M.night=this.night;M.phase='walk';M.centre=0;}
  }
 }

 /* ------------------------------------------------------------------ the stair */
 _buildStair(){
  const n=this._sys('places')?.nodes.get('holdfast');if(!n)return;
  const mouth=this.st._sitePoint('holdfast',45,0,-36.4),knock=this.st._sitePoint('holdfast',45,-.15,-37.5),below=this.st._sitePoint('holdfast',45,-3.4,-46.4);
  const side=this.st._sitePoint('holdfast',46,0,-36.4);
  this.stair={x:mouth.x,z:mouth.z,y:n.padY,bx:below.x,by:below.y,bz:below.z,ax:side.x-mouth.x,az:side.z-mouth.z,night:-1,state:'idle',t:0,still:0,n:0};
  this.st.targets.push({id:'moment:stair',kind:'knock',title:'',sub:'',hold:.35,x:knock.x,y:knock.y,z:knock.z,
   enabled:()=>this.stair.state==='asking',act:()=>this._knock()});
 }
 _knock(){const K=this.stair,p=this._sys('player')?.pos;K.state='answer';K.t=0;K.n=0;
  if(p)this._say('knock',p.x,p.y+.3,p.z,.40);this._sys('dread')?.hush(5.5,K.x,K.z);}
 _stepStair(dt){
  const K=this.stair;if(!K||K.night===this.night)return;const pl=this._sys('player'),p=pl?.pos;if(!p)return;
  const ph=this.ctx.shared.phase,dark=ph==='night'||ph==='black',kept=!this._sys('progress')?.bossCleared?.('underkeep');
  const d=Math.hypot(p.x-K.x,p.z-K.z),atTop=d<1.9&&p.y>K.y-1.1&&!this.ctx.shared.inCar&&!pl.dead;
  if(K.state==='idle'){
   if(!dark||!kept){K.still=0;return;}
   K.still=atTop?K.still+dt:0;
   if(K.still>6){K.state='scrape';K.t=0;K.n=0;}
   return;
  }
  if(d>10&&K.state!=='answer'){K.state='idle';K.still=0;return;}
  K.t+=dt;
  if(K.state==='scrape'){
   // metal on metal, a long way down: three slow drags, like a spoon round the inside of a bowl
   if(K.n<3&&K.t>=K.n*1.7){this._say('can',K.bx+K.ax*(K.n-1)*.5,K.by,K.bz+K.az*(K.n-1)*.5,.28);K.n++;}
   if(K.t>5.4){K.state='asking';K.t=0;}
  }else if(K.state==='answer'){
   // everything down there knocks back, all at once
   if(K.t>=4.2&&K.n<7){const i=K.n;const lat=(i%3-1)*1.1,dep=(i*.37)%1;
    if(K.t>=4.2+i*.055){this._say('knock',K.bx+K.ax*lat,K.by-dep,K.bz+K.az*lat+(dep-.5)*1.6,.22);K.n++;if(i===0){this._sys('fx')?.addTrauma?.(.04);this._sys('dread')?.noteLoud('stair');}}}
   if(K.n>=7){K.night=this.night;K.state='idle';K.still=0;}
  }
 }

 /* ------------------------------------------------------------------ Dad's chair */
 _buildDad(){
  const S=this._site('avery-house');if(!S)return;
  // THE FRONT LAWN, 7 m east of the walk you leave by, 13 m from the porch, facing the house.
  // The boy's room windows are opaque panes, so he is met when you come out, not through them.
  // Measured: the lawn here is clear (a 0.45 body stands anywhere in x -12..26, z 20..44) and
  // flat on the pad, so the apron is 0.025 over the ground under every leg.
  const CX=7.0,CZ=29.5,turned=this._flag('moment:dad')==='gone';
  const chair=new THREE.Group();chair.position.set(CX,0,CZ);S.g.add(chair);
  this.dad={S,chair,mesh:null,cx:0,cz:0,seatY:0,state:turned?'gone':'idle',t:0,seen:0,fig:null,fx:0,fy:0,fz:0};
  const cw={x:0,z:0};S.w(CX,CZ,cw);this.dad.cx=cw.x;this.dad.cz=cw.z;
  this._dadChair(turned?0:Math.PI);
  const wk=new Kit(),wg=this._ground(S,CX,CZ-1.0)+.037;const oval=new THREE.CircleGeometry(1,20);oval.rotateX(-Math.PI*.5);oval.scale(.75,1,.45);oval.translate(CX,wg,CZ-1.0);wk.push(oval,[.034,.030,.022]);
  S.g.add(this._mesh(wk,this.mats.cloth));
  // where he stands: behind the chair, facing the house
  const fw={x:0,z:0};S.w(CX,CZ+1.05,fw);this.dad.fx=fw.x;this.dad.fz=fw.z;this.dad.fy=this._ground(S,CX,CZ+1.05)+.025;
 }
 /** The chair, turned to `ry` in the site frame, every leg cut to the ground under it. */
 _dadChair(ry){
  const D=this.dad,S=D.S,CX=D.chair.position.x,CZ=D.chair.position.z,c=Math.cos(ry),sn=Math.sin(ry);
  const at=(a,b)=>this._ground(S,CX+a*c+b*sn,CZ-a*sn+b*c)+.025;
  const legs=[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]],g=legs.map(([a,b])=>at(a,b));
  const seat=Math.max(...g)+.45,k=new Kit(),WOOD2=[.12,.085,.05];
  k.box(.46,.045,.46,0,seat,0,WOOD2);
  legs.forEach(([a,b],i)=>{const h=seat-.02-g[i];k.box(.04,h,.04,a,g[i]+h*.5,b,WOOD2);});
  k.box(.44,.50,.04,0,seat+.28,-.21,WOOD2);
  // his coat over the back, the thermos by the leg
  k.box(.50,.06,.30,0,seat+.56,-.21,WOOL);k.box(.48,.46,.035,0,seat+.30,-.1725,WOOL);k.box(.48,.62,.035,0,seat+.22,-.2475,WOOL);
  for(const e of[-1,1])k.box(.10,.52,.09,e*.28,seat+.27,-.26,WOOL,0,0,e*.06);                // its sleeves
  const tg=at(-.42,.12);k.cyl(.045,.045,.28,8,-.42,tg+.14,.12,[.10,.13,.12]);k.cyl(.05,.05,.05,8,-.42,tg+.305,.12,DARK);
  if(D.mesh){D.chair.remove(D.mesh);D.mesh.geometry.dispose();}
  D.mesh=this._mesh(k,this.mats.wood);D.chair.add(D.mesh);D.chair.rotation.y=ry;D.seatY=seat;
  this._dadCols();
 }
 _dadCols(){
  const D=this.dad,col=this._sys('collision');if(!D||!col)return;col.removeChunk('story:dad-chair');
  const yaw=D.S.g.rotation.y+D.chair.rotation.y,sy=Math.sin(yaw),cy=Math.cos(yaw);   // chair-local -z is its back
  col.addCollider({kind:'obb',x:D.cx,z:D.cz,halfX:.24,halfZ:.24,yaw,y0:D.seatY-.6,y1:D.seatY+.03,tag:'wood',standable:true},'story:dad-chair');
  col.addCollider({kind:'obb',x:D.cx-.21*sy,z:D.cz-.21*cy,halfX:.25,halfZ:.05,yaw,y0:D.seatY+.03,y1:D.seatY+.6,tag:'wood',climbable:false},'story:dad-chair');
 }
 _dadFigure(){
  const D=this.dad,dr=this._sys('dread');if(D.fig||!dr?.figGeo)return D.fig;
  const mat=dr.matBase.clone();mat.name='moment-dad';mat.color.setHex(0x02030a);mat.opacity=1;
  const face=dr.matFace.clone();face.opacity=1;
  const f=new THREE.Mesh(dr.figGeo,mat);f.add(new THREE.Mesh(dr.faceGeo,face));f.frustumCulled=false;f.visible=false;
  f.position.set(D.fx,D.fy-.04,D.fz);f.rotation.y=Math.atan2(D.cx-D.fx,D.cz-D.fz);
  this.group.add(f);D.fig=f;D.mats=[mat,face];return f;
 }
 _dadCue(){const D=this.dad;if(!D||D.state==='gone')return;if(!this._dadFigure())return;D.state='armed';D.t=0;D.seen=0;D.fig.visible=true;}
 _stepDad(dt){
  const D=this.dad;if(!D||D.state!=='armed'&&D.state!=='seen')return;D.t+=dt;
  const p=this._sys('player')?.pos,eyeY=D.fy+1.9,dot=this._view(D.fx,eyeY,D.fz);
  const look=dot>.95&&this._d<70&&this._clear(D.fx,eyeY,D.fz);
  if(D.state==='armed'){
   D.seen=look?D.seen+dt:0;
   if(D.seen>.25)D.state='seen';
   // he waits for you to come out; if you leave the place without looking, he is not there
   else if(D.t>600||(p&&Math.hypot(p.x-D.cx,p.z-D.cz)>120)){D.state='idle';D.fig.visible=false;}
  }else if(dot<.9){
   // the moment you look away he is not there, and the chair is facing the road
   D.state='gone';D.fig.visible=false;this._dadChair(0);this._flag('moment:dad','gone');
   this._sys('dread')?.noteLoud('dad');
  }
 }

 step(dt){
  // the animation every step; attention and state at ten a second
  this._presentCoat(dt);this._presentWake();
  this.acc+=dt;if(this.acc<.1)return;const d=this.acc;this.acc=0;
  this._stepCoat(d);this._stepWake(d);this._stepMill(d);this._stepStair(d);this._stepDad(d);
 }
 present(){
  const p=this._sys('player')?.pos;if(p)for(const S of this.roots)S.g.visible=Math.hypot(p.x-S.x,p.z-S.z)<MOMENT_SHOW;
 }
 state(){return{coat:this.coat?.state,wake:this.wake?.state,mill:this.mill?{phase:this.mill.phase,done:this.mill.night===this.night}:null,stair:this.stair?.state,dad:this.dad?.state,night:this.night};}
 dispose(){for(const o of this.offs||[])o?.();const col=this._sys('collision');col?.removeChunk('story:moments');col?.removeChunk('story:dad-chair');
  this.group?.traverse(o=>{if(o.geometry&&o.geometry!==this._sys('dread')?.figGeo&&o.geometry!==this._sys('dread')?.faceGeo)o.geometry.dispose();});for(const m of this.dad?.mats||[])m.dispose();this.group?.removeFromParent();}
}

export default WorldStories;
