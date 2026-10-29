import * as THREE from '../vendor/three.module.js';
import {pastaLine as line,pastaCircle as circle,pastaBall as ball} from './airstrip-world.js';
import {PlazaPastaBatch as Batch,finalizePlazaStaticGeometry} from './plaza-geometry.js';
import {createPlazaLandmarks} from './plaza-landmarks.js';
import {createPlazaFerries} from './plaza-ferries.js';
import {PLAZA_RETURN_POINTS} from './plaza-travel.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const inside=(x,z,r,pad=0)=>x>=r.x0-pad&&x<=r.x1+pad&&z>=r.z0-pad&&z<=r.z1+pad;

// Every visible surface is a strand, bundle or folded pasta sheet. Static dry
// pasta supplies the town's supports; flags, moorings and boats are compliant.
export function createPlazaWorld(scene,materials,options={}){
  const episode=Number.isInteger(options.episode)&&options.episode>=1&&options.episode<=11?options.episode:1,M=materials,group=new THREE.Group();group.name='Delfino Plaza — a town woven from pasta';scene.add(group);
  const keys=['egg','cream','tomato','spinach','darkGreen','ink','blue','gold','toasted','pale'],b=Object.fromEntries(keys.map(k=>[k,new Batch(M[k]||M.cream,{staticGeometry:true})]));
  const colliders=[],bounds={x0:-66,x1:66,z0:-56,z1:78},landmarks={spawn:V(...(PLAZA_RETURN_POINTS[options.returnFrom]??[0,3,29])),sand:V(38,1.4286,34),shine:V(47,5.05,53),shopDoor:V(-18,3,-16),crateGuy:V(-13,3,-31),shopShine:V(-18,4.3,-24),fountain:V(1,3,-10),sewerWest:V(-29,3,18),sewerEast:V(12,3,15)};
  const town={x0:-47,x1:31,z0:-40,z1:29},beach={x0:28,x1:49,z0:23,z1:44},shop={x0:-26,x1:-10,z0:-35,z1:-17};
  const islands=[{x:39,z:43,r:1.9,y:1.4},{x:43,z:48,r:1.8,y:2.6},{x:47,z:53,r:1.8,y:3.8},{x:57,z:65,r:5,y:1.2}];
  let clock=0,playerY=3,interior=false,sewer=false,playerRef=null;
  const roofs=[],stairs=[],boats=[],flags=[],crates=[],hollowRooms=[],seaRamps=[{x0:6,x1:10,z0:29,z1:36,y0:3,y1:-.15,steps:10},{x0:-42,x1:-38,z0:34,z1:41,y0:3,y1:-.15,steps:10}];let crateVariant=episode===3?3:2,mounted=false,playerController=null;
  function deck(batch,x0,x1,z0,z1,y,r=.18){for(let z=z0;z<=z1+.001;z+=r*1.92)batch.tube(line(V(x0,y-r,z),V(x1,y-r,z),Math.max(3,Math.ceil((x1-x0)/2)),.014),r,6);}
  function wall(batch,a,c,height,r=.18){for(let y=0;y<height;y+=r*1.92)batch.tube(line(a.clone().add(V(0,y,0)),c.clone().add(V(0,y,0)),Math.max(4,Math.ceil(a.distanceTo(c)/1.8))),r,6);}
  function braid(batch,a,c,r=.22,count=4){const d=c.clone().sub(a).normalize(),side=V().crossVectors(d,Math.abs(d.y)>.9?V(1,0,0):V(0,1,0)).normalize(),up=V().crossVectors(d,side).normalize();for(let k=0;k<count;k++){const p=[];for(let j=0;j<=24;j++){const t=j/24,a0=t*TAU*2+k/count*TAU;p.push(a.clone().lerp(c,t).addScaledVector(side,Math.cos(a0)*r*.6).addScaledVector(up,Math.sin(a0)*r*.6));}batch.tube(p,r*.44,6);}}
  function addBox(x0,x1,z0,z1,bottom,top,kind='building'){const c={minX:x0,maxX:x1,minZ:z0,maxZ:z1,bottom,top,kind};colliders.push(c);return c;}
  function pianta(batchSet,x,y,z,color='spinach',scale=1){const p=(xx,yy,zz)=>V(x+xx*scale,y+yy*scale,z+zz*scale);ball(batchSet[color],p(0,1.05,0),.59*scale,13,V(1,1.22,.9));ball(batchSet.egg,p(0,1.95,0),.46*scale,12);ball(batchSet.egg,p(0,1.93,.51),.2*scale,7);for(const s of[-1,1]){batchSet[color].tube([p(s*.5,1.3,0),p(s*.86,1.04,.1),p(s*.8,1.32,.26)],.14*scale,6);batchSet.toasted.tube([p(s*.27,.62,0),p(s*.38,.14,.1),p(s*.38,.12,.44)],.15*scale,6);batchSet.ink.tube([p(s*.14,2.02,.41),p(s*.14,2.18,.4)],.05*scale,6);}for(let j=0;j<7;j++){const a=j/7*TAU;batchSet.spinach.tube([p(0,2.3,0),p(Math.cos(a)*.42,2.86,Math.sin(a)*.42),p(Math.cos(a)*.94,2.6,Math.sin(a)*.94)],.095*scale,6);}}
  // Quays and piazzas surround a real water canal. The crossings are elevated.
  deck(b.egg,-47,-38,-40,29,3);deck(b.egg,-29,31,-40,29,3);deck(b.cream,-38,-29,-40,-13,3);
  deck(b.toasted,-47,-29,25,34,3,.16);deck(b.cream,-4,4,29,42,3,.14);
  for(let x=28;x<=49;x+=.29){const p=[];for(let j=0;j<=24;j++){const z=23+j/24*21;p.push(V(x,3*(44-z)/21-.12,z));}b.egg.tube(p,.16,6);}
  for(const z of[-13,9,25]){deck(b.cream,-38,-29,z-2,z+2,3,.14);addBox(-38,-29,z-2,z+2,2.4,3,'canal-bridge');for(const zz of[z-2.1,z+2.1]){braid(b.toasted,V(-38,4,zz),V(-29,4,zz),.17,4);for(let x=-38;x<=-29;x+=1.5)braid(b.cream,V(x,3,zz),V(x,4,zz),.12,3);}}
  // A tall western arch contains the original Pachinko entrance underneath.
  for(const x of[-38.5,-31.7]){wall(b.cream,V(x,3,-2),V(x,3,3),5.5);addBox(x-.3,x+.3,-2,3,3,8.5,'arch-pier');}
  for(let z=-2;z<=3;z+=.27){const p=[];for(let j=0;j<=24;j++){const t=j/24;p.push(V(-38.5+t*6.8,6.4+Math.sin(t*Math.PI)*2.1,z));}b.cream.tube(p,.15,6);}addBox(-38.5,-31.7,-2,3,7.8,8.6,'pachinko-arch');
  // Coast retaining walls and an open waterfront show the town's silhouette.
  for(const [a,c]of [[V(-47,-.5,34),V(-29,-.5,34)],[V(-29,-.5,29),V(28,-.5,29)],[V(31,-.5,-40),V(31,-.5,23)]])wall(b.toasted,a,c,3.3,.19);
  const seaBatch=new Batch(M.blue||M.lake,{castShadow:false,staticGeometry:true});for(let z=-53;z<=77;z+=.76){const p=[];for(let x=-65;x<=65;x+=2.6)p.push(V(x,-.3+Math.sin(x*.16+z*.13)*.08,z+Math.sin(x*.2)*.055));seaBatch.tube(p,.25,6);}seaBatch.finish(group,'Sea of individually modeled, spatially culled pasta');
  // Broad, visible pasta quay steps let a swimmer climb out naturally.
  for(const r of seaRamps){for(let i=0;i<r.steps;i++){const z0=r.z0+(r.z1-r.z0)*i/r.steps,z1=r.z0+(r.z1-r.z0)*(i+1)/r.steps,y=r.y0+(r.y1-r.y0)*i/r.steps;deck(b.cream,r.x0,r.x1,z0,z1,y,.14);}for(const x of[r.x0-.13,r.x1+.13])braid(b.toasted,V(x,r.y0+.75,r.z0),V(x,r.y1+.75,r.z1),.12,4);}
  // Supported rooftops retain actual collision, gutters and individual tiles.
  function house(x0,x1,z0,z1,top,color='cream',name='Townhouse',room=null){
    const frontGroup=new THREE.Group(),roofGroup=new THREE.Group(),front=room?new Batch(M[color]):b[color],roof=room?new Batch(M.tomato):b.tomato;
    const openingZ=room?.back?z0:z1,cx=room?.doorX??(x0+x1)/2,half=room?.width??1.7;
    for(const z of[z0,z1]){if(room&&z===openingZ){wall(front,V(x0,3,z),V(cx-half,3,z),top-3);wall(front,V(cx+half,3,z),V(x1,3,z),top-3);wall(front,V(cx-half,6.8,z),V(cx+half,6.8,z),top-6.8);addBox(x0,cx-half,z-.16,z+.16,3,top,name+' door flank');addBox(cx+half,x1,z-.16,z+.16,3,top,name+' door flank');addBox(cx-half,cx+half,z-.16,z+.16,6.8,top,name+' doorway lintel');}else{wall(b[color],V(x0,3,z),V(x1,3,z),top-3);if(room)addBox(x0,x1,z-.16,z+.16,3,top,name+' wall');}}
    wall(b[color],V(x0,3,z0),V(x0,3,z1),top-3);wall(b[color],V(x1,3,z0),V(x1,3,z1),top-3);
    if(room){addBox(x0-.16,x0+.16,z0,z1,3,top,name+' west wall');addBox(x1-.16,x1+.16,z0,z1,3,top,name+' east wall');addBox(x0,x1,z0,z1,top-.35,top,name+' roof');}else addBox(x0,x1,z0,z1,3,top,name);
    deck(roof,x0-.25,x1+.25,z0-.25,z1+.25,top,.15);
    for(let x=x0+.65;x<x1;x+=1.6){b.toasted.tube(line(V(x,top+.04,z0-.25),V(x,top+.04,z1+.25),8),.095,6);for(const zz of[z0-.19,z1+.19]){if(room&&zz===openingZ+(openingZ===z0?-.19:.19)&&Math.abs(x-cx)<half+.6)continue;for(let k=0;k<6;k++){const a=k/5*Math.PI;b.blue.tube([V(x+Math.cos(a)*.5,5+Math.sin(a)*.6,zz),V(x+Math.cos(a)*.5,6.2+Math.sin(a)*.6,zz)],.085,6);}b.toasted.tube([V(x-.6,5,zz),V(x-.6,6.7,zz),V(x+.6,6.7,zz),V(x+.6,5,zz)],.11,6);}}
    roofs.push({x0,x1,z0,z1,y:top});if(room){front.finish(frontGroup,name+' cutaway front');roof.finish(roofGroup,name+' cutaway pasta roof');group.add(frontGroup,roofGroup);hollowRooms.push({name,x0,x1,z0,z1,top,front:frontGroup,roof:roofGroup});}
  }
  house(-45,-39,-34,-20,11,'pale','western homes');house(-45,-39,12,23,9,'cream','boathouse',{doorX:-42,width:1.8});
  house(-27,-17,-10,1,10,'cream','western bell house',{doorX:-23,width:1.65});house(-9,3,-34,-25,10,'pale','courthouse',{doorX:-3,width:2});
  house(9,24,-31,-21,12,'cream','fruit market homes');house(17,27,-10,0,10,'pale','eastern bell house',{doorX:23,width:1.65,back:true});house(16,27,8,18,8,'cream','seafront homes');
  house(-7,4,9,19,7,'cream','center shop');
  // The west bell chamber has its own sewer entrance. Breaking the Turbo
  // doors opens the front room; it does not bypass the bell's underground route.
  wall(b.cream,V(-27,3,-2.2),V(-17,3,-2.2),6.6);addBox(-27,-17,-2.36,-2.04,3,9.7,'west bell chamber partition');
  // Crate shop: physical doorway, interior walls and a separate removable roof.
  wall(b.cream,V(-26,3,-35),V(-10,3,-35),8);wall(b.cream,V(-26,3,-35),V(-26,3,-17),8);wall(b.cream,V(-10,3,-35),V(-10,3,-17),8);
  addBox(-26.25,-25.75,-35,-17,3,11,'crate shop west');addBox(-10.25,-9.75,-35,-17,3,11,'crate shop east');addBox(-26,-10,-35.25,-34.75,3,11,'crate shop back');
  const shopFront=new THREE.Group(),front=new Batch(M.cream);wall(front,V(-26,3,-17),V(-20.5,3,-17),8);wall(front,V(-15.5,3,-17),V(-10,3,-17),8);wall(front,V(-20.5,7,-17),V(-15.5,7,-17),4);front.finish(shopFront,'Crate shop doorway pasta');group.add(shopFront);
  addBox(-26,-20.5,-17.2,-16.8,3,11,'crate shop doorway');addBox(-15.5,-10,-17.2,-16.8,3,11,'crate shop doorway');addBox(-20.5,-15.5,-17.2,-16.8,7,11,'crate shop lintel');
  const shopRoof=new THREE.Group(),roof=new Batch(M.tomato);deck(roof,-26.3,-9.7,-35.3,-16.7,11,.16);roof.finish(shopRoof,'Lasagnette crate shop roof');group.add(shopRoof);addBox(-26.3,-9.7,-35.3,-16.7,10.65,11,'crate shop roof');
  // Ten brittle bundles occupy five pairs. Their collision disappears only
  // after a real ground-pound event, never after touching or spraying them.
  for(let row=0;row<5;row++)for(let col=0;col<2;col++){
    const id=row*2+col,x=-21+col*3,z=-21-row*2.7,root=new THREE.Group(),cb=new Batch(M.toasted),binding=new Batch(M.cream),size=1.65;
    for(let t=-size/2;t<=size/2+.001;t+=.16){cb.tube(line(V(t,0,-size/2),V(t,size,-size/2),7),.095,6);cb.tube(line(V(t,0,size/2),V(t,size,size/2),7),.095,6);cb.tube(line(V(-size/2,0,t),V(-size/2,size,t),7),.095,6);cb.tube(line(V(size/2,0,t),V(size/2,size,t),7),.095,6);cb.tube(line(V(-size/2,size,t),V(size/2,size,t),7),.095,6);}
    for(const y of[.16,1.49])binding.tube([V(-.88,y,-.88),V(.88,y,-.88),V(.88,y,.88),V(-.88,y,.88),V(-.88,y,-.88)],.085,6);
    for(const zz of[-.91,.91])binding.tube([V(-.7,.12,zz),V(.7,1.52,zz)],.09,6);
    cb.finish(root,'Dry pasta crate '+id);binding.finish(root,'Crossed crate bindings '+id);root.position.set(x,3,z);group.add(root);const collider={minX:x-.825,maxX:x+.825,minZ:z-.825,maxZ:z+.825,bottom:3,top:4.65,kind:'smashable-crate'};colliders.push(collider);crates.push({id,x,z,root,collider,broken:false,age:0});
  }
  // Landmark statue: concentric noodles form the Pianta body, nose and leaves.
  for(let y=3;y<=4.5;y+=.22)b.toasted.tube(circle(-16,y,6,3,3,40),.14,6);pianta(b,-16,4.5,6,'cream',2.8);addBox(-18.6,-13.4,3.4,8.6,3,8.7,'Grand Pianta Statue');
  // Shine Gate's three arches are open at street level. The back cave stays
  // traversable, while the rooftop pipe is reached by a real stair flight.
  for(const x of[-13,-5,5,13]){if(x===13){for(const xx of[11.6,14.4]){wall(b.cream,V(xx,3,-36.8),V(xx,3,-32.8),19);addBox(xx-.16,xx+.16,-36.8,-32.8,3,22,'hollow gate pillar side');}wall(b.cream,V(11.6,7,-32.8),V(14.4,7,-32.8),15);wall(b.cream,V(11.6,3,-36.8),V(14.4,3,-36.8),19);addBox(11.6,14.4,-36.8,-36.5,3,22,'hollow gate pillar rear');addBox(11.6,14.4,-36.8,-32.8,7,22,'hollow gate pillar ceiling');}else{wall(b.cream,V(x-.85,3,-36),V(x+.85,3,-36),19);wall(b.cream,V(x-.85,3,-33),V(x+.85,3,-33),19);addBox(x-.85,x+.85,-36,-33,3,22,'Shine Gate pillar');}}
  for(let z=-36;z<=-33;z+=.29)for(const center of[-9,0,9]){const p=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI;p.push(V(center+Math.cos(a)*(center?3.15:4.1),9+Math.sin(a)*3,z));}b.cream.tube(p,.18,6);}
  wall(b.cream,V(-14,13,-34.5),V(14,13,-34.5),8,.19);deck(b.toasted,-14,14,-37,-32,22,.16);addBox(-14,14,-37,-32,12.3,22,'Shine Gate lintel');
  // Broad stair flights make the rooftop route traversable without a Rocket.
  function stair(x0,x1,z0,z1,y0,y1,steps=24){const s={x0,x1,z0,z1,y0,y1,steps};stairs.push(s);for(let i=0;i<steps;i++){const a=z0+(z1-z0)*i/steps,c=z0+(z1-z0)*(i+1)/steps,y=y0+(y1-y0)*(i+1)/steps;deck(b.cream,x0,x1,Math.min(a,c),Math.max(a,c),y,.16);}for(const x of[x0-.2,x1+.2])braid(b.toasted,V(x,y0+1,z0),V(x,y1+1,z1),.16,4);}
  stair(28,31,3,-30,3,12,30);deck(b.cream,23,31,-32,-29,12,.16);addBox(23,31,-32,-29,11.6,12,'eastern roof landing');stair(14.5,18,-31,-50,12,22,28);
  deck(b.cream,10,18,-51,-49.7,22,.16);addBox(10,18,-51,-49.7,21.6,22,'gate stair landing');deck(b.cream,10,14,-51,-36,22,.16);addBox(10,14,-51,-36,21.6,22,'gate rear walkway');
  stair(-31,-27.5,7,-10,3,10,22);deck(b.tomato,-31,-17,-11,-9,10,.16);addBox(-31,-17,-11,-9,9.6,10,'western roof landing');
  // Bell towers and the lighthouse crown are dynamic mechanisms below.
  for(let y=3;y<=18;y+=.28)b.cream.tube(circle(36,y,20,2.8-(y-3)*.055,2.8-(y-3)*.055,40),.17,7);addBox(33.6,38.4,17.6,22.4,3,18,'lighthouse');
  // Small offshore pillars are the actual path to the sand mission's reward.
  for(const island of islands){for(let y=-.7;y<island.y;y+=.22)b.toasted.tube(circle(island.x,y,island.z,island.r,island.r,32),.14,6);for(let r=.14;r<island.r;r+=.2)b.egg.tube(circle(island.x,island.y-.08,island.z,r,r,32),.13,6);addBox(island.x-island.r*.79,island.x+island.r*.79,island.z-island.r*.79,island.z+island.r*.79,-1,island.y,'offshore pillar');}
  // Fountain, citrus-pasta market stalls, café umbrellas and palm bundles.
  for(let y=3;y<=3.6;y+=.14)b.cream.tube(circle(1,y,-10,3.2,3.2,40),.1,6);for(let r=.1;r<2.95;r+=.2)b.blue.tube(circle(1,3.25,-10,r,r,38),.13,6);for(let j=0;j<8;j++){const a=j/8*TAU,p=[];for(let n=0;n<=24;n++){const t=n/24;p.push(V(1+Math.cos(a)*t*2.5,3.5+Math.sin(t*Math.PI)*2.5,-10+Math.sin(a)*t*2.5));}b.blue.tube(p,.09,6);}
  for(const [x,z]of[[10,1],[21,23],[-6,-14],[-44,4]]){for(const dx of[-1.4,1.4])for(const dz of[-.8,.8])braid(b.toasted,V(x+dx,3,z+dz),V(x+dx,5.7,z+dz),.1,3);deck(b.cream,x-1.6,x+1.6,z-1,z+1,4,.12);for(let k=0;k<20;k++){const a=k/20*TAU,p=[];for(let n=0;n<=12;n++){const t=n/12;p.push(V(x+Math.cos(a)*t*2.5,6.4-t*.8,z+Math.sin(a)*t*1.5));}b[k%2?'tomato':'cream'].tube(p,.12,6);}for(let j=0;j<8;j++)ball(b[j%2?'gold':'spinach'],V(x-1.2+(j%4)*.75,4.3,z-.4+Math.floor(j/4)*.8),.23,7);}
  for(const [x,z]of[[-7,-20],[-5,-20],[26,34],[43,29]]){braid(b.toasted,V(x,3,z),V(x,5.5,z),.09,3);for(let j=0;j<18;j++){const a=j/18*TAU,p=[];for(let i=0;i<=12;i++){const t=i/12;p.push(V(x+Math.cos(a)*t*1.8,5.8-t*.9,z+Math.sin(a)*t*1.8));}b[j%3?'cream':'tomato'].tube(p,.1,6);}}
  function palm(x,z,y=3,h=7){braid(b.toasted,V(x,y,z),V(x+.6,y+h,z),.4,7);for(let j=0;j<9;j++){const a=j/9*TAU,p=[];for(let i=0;i<=22;i++){const t=i/22;p.push(V(x+.6+Math.cos(a)*t*4,y+h+Math.sin(t*Math.PI)*1.2-t*.9,z+Math.sin(a)*t*4));}for(let k=-1;k<=1;k++)b.spinach.tube(p.map(q=>q.clone().add(V(k*.11,0,k*.09))),.13,6);}}
  for(const [x,z]of[[-43,-10],[12,-16],[8,25],[45,29],[-5,34]])palm(x,z);palm(58,65,1.2,5);
  pianta(b,-13,3,-31,'gold');for(const [x,z,color]of[[-5,25,'tomato'],[11,21,'spinach'],[24,1,'blue'],[-42,-8,'gold'],[-6,-22,'cream'],[43,30,'tomato'],[-44,31,'blue']])pianta(b,x,3,z,color);
  // Every course is entered through its physical Plaza landmark. The full
  // original story unlock campaign is not imposed on the available missions.
  const portals=[
    {id:'bianco',episode:1,position:V(-16,4.2,9.3),label:'BIANCO HILLS',kind:'paint'},
    {id:'ricco',episode:1,position:V(-42,4.2,24),label:'RICCO HARBOR',kind:'paint'},
    {id:'gelato',episode:1,position:V(36,4.2,23.2),label:'GELATO BEACH',kind:'paint'},
    {id:'pinna',episode:1,position:V(-44,4.2,-2),label:'PINNA PARK',kind:'cannon'},
    {id:'sirena',episode:1,position:V(-20,11.2,-8),label:'SIRENA BEACH',kind:'pipe'},
    {id:'noki',episode:1,position:V(5,4.2,-16),label:'NOKI BAY',kind:'shine'},
    {id:'pianta',episode:1,position:V(10,23.2,-34.2),label:'PIANTA VILLAGE',kind:'pipe'},
    {id:'airstrip',episode:1,position:V(-43,4.2,31),label:'DELFINO AIRSTRIP',kind:'boat'},
    {id:'corona',episode:1,position:V(0,4.2,-39),label:'CORONA MOUNTAIN',kind:'cave'},
    {id:'pachinko',episode:1,position:V(-33.5,7.75,.5),label:'PACHINKO GAME',kind:'hole'},
    {id:'lily',episode:1,position:V(56,2.4,65),label:'LILY PAD RIDE',kind:'pipe'}
  ];
  for(const p of portals){if(p.kind==='pipe'){for(let y=-1.1;y<=.3;y+=.15)b.tomato.tube(circle(p.position.x,p.position.y+y,p.position.z,1,1,30),.115,6);for(let j=0;j<3;j++)b.cream.tube(circle(p.position.x,p.position.y+.2+j*.09,p.position.z,1.2,1.2,30),.1,6);}else if(p.kind==='paint'){const q=p.position;b.tomato.tube([V(q.x-1,q.y-1,q.z),V(q.x-.8,q.y+.7,q.z),V(q.x,q.y-.2,q.z),V(q.x+.8,q.y+.7,q.z),V(q.x+1,q.y-1,q.z)],.16,7);for(let k=0;k<3;k++)b.gold.tube([V(q.x-1.1+k*.14,q.y-.8,q.z+.02),V(q.x-1.5+k*.14,q.y-1.2,q.z+.02)],.08,5);}else if(p.kind==='shine'){for(let r=.1;r<1.3;r+=.17)b.gold.tube(circle(p.position.x,3.08,p.position.z,r,r,30),.11,6);}else if(p.kind==='hole'){for(let k=0;k<3;k++)b.toasted.tube(circle(p.position.x,p.position.y+.1*k,p.position.z,.8,.8,28),.1,6);}else if(p.kind==='cannon'){for(let k=0;k<12;k++){const a=k/12*TAU;b.ink.tube([p.position.clone().add(V(Math.cos(a)*.8,-.7,Math.sin(a)*.8)),p.position.clone().add(V(Math.cos(a)*.8,1.2,Math.sin(a)*.8-.3))],.15,7);}}}
  // A genuine sewer route beneath the central quays. Its manholes explicitly
  // lower/raise Mario; surface queries then use the lower physical floor.
  const tunnels=[{x0:-30.5,x1:-27.5,z0:-6.5,z1:21},{x0:-30.5,x1:13.5,z0:13,z1:17},{x0:10.5,x1:13.5,z0:-6.5,z1:20},{x0:-30.5,x1:-21.5,z0:-6.5,z1:-3.5},{x0:10.5,x1:24.5,z0:-6.5,z1:-3.5}];
  for(const r of tunnels)deck(b.toasted,r.x0,r.x1,r.z0,r.z1,-3,.17);
  // Boundary segments come from the union of corridor cells, so junctions
  // stay open. Their low walls also physically constrain walking underground.
  const cutsX=[...new Set(tunnels.flatMap(r=>[r.x0,r.x1]))].sort((a,b)=>a-b),cutsZ=[...new Set(tunnels.flatMap(r=>[r.z0,r.z1]))].sort((a,b)=>a-b),has=(x,z)=>tunnels.some(r=>inside(x,z,r,-.001));
  for(let xi=0;xi<cutsX.length;xi++)for(let zi=0;zi<cutsZ.length-1;zi++){const x=cutsX[xi],z0=cutsZ[zi],z1=cutsZ[zi+1],z=(z0+z1)/2;if(has(x-.01,z)===has(x+.01,z))continue;wall(b.cream,V(x,-3,z0),V(x,-3,z1),2.7,.17);addBox(x-.1,x+.1,z0,z1,-3,-.3,'sewer wall');}
  for(let zi=0;zi<cutsZ.length;zi++)for(let xi=0;xi<cutsX.length-1;xi++){const z=cutsZ[zi],x0=cutsX[xi],x1=cutsX[xi+1],x=(x0+x1)/2;if(has(x,z-.01)===has(x,z+.01))continue;wall(b.cream,V(x0,-3,z),V(x1,-3,z),2.7,.17);addBox(x0,x1,z-.1,z+.1,-3,-.3,'sewer wall');}
  landmarks.sewerBell=V(-23,3,-5);landmarks.sewerMarket=V(23,3,-5);
  const sewerEntrances=[['west',landmarks.sewerWest],['east',landmarks.sewerEast],['west-bell',landmarks.sewerBell],['market',landmarks.sewerMarket]].map(([id,surface])=>({id,surface:surface.clone(),underground:V(surface.x,-3,surface.z)}));
  for(const p of sewerEntrances.map(e=>e.surface)){for(let r=.1;r<1;r+=.17)b.toasted.tube(circle(p.x,3.07,p.z,r,r,26),.095,6);for(let y=-2.5;y<2.8;y+=.45)b.cream.tube([V(p.x-.5,y,p.z-.7),V(p.x+.5,y,p.z-.7)],.1,6);}
  // Decorative distant volcano is also bundled toasted noodles.
  for(let j=0;j<25;j++){const y=3+j*1.1,rad=20-j*.52;b.toasted.tube(circle(0,y,-66,rad,rad*.68,48),.35,6);}
  for(const [key,batch]of Object.entries(b))batch.finish(group,'Plaza '+key+' pasta strands');
  const mechanics=createPlazaLandmarks(group,M,{landmarks,colliders,portals,roofs,islands,addBox,pianta:(set,x,y,z,color,scale)=>pianta(set,x,y,z,color,scale),Batch,deck,wall});
  const ferryWorld=createPlazaFerries(group,M,{islands,landmarks,addBox});
  // Moving boats: spring buoyancy plus horizontal drift, with rider carry.
  for(const [id,x,z]of[[0,-33.5,18],[1,-44,38]]){const root=new THREE.Group(),hull=new Batch(M.toasted),rim=new Batch(M.cream);for(let j=0;j<9;j++)hull.tube(circle(0,-.4+j*.15,0,1.55+j*.06,3+j*.1,36),.115,6);deck(rim,-1.9,1.9,-3.7,3.7,1,.14);for(let k=0;k<3;k++)rim.tube(circle(0,1+k*.13,0,2,3.8,36),.1,6);hull.finish(root,'Buoyant braided pasta boat');rim.finish(root,'Ribbed boat deck');group.add(root);const collider={minX:x-1.8,maxX:x+1.8,minZ:z-3.5,maxZ:z+3.5,bottom:-.4,top:1,kind:'canal boat'};colliders.push(collider);boats.push({id,root,x,z,oldX:x,oldZ:z,y:0,oldY:0,velocity:0,collider});}
  // Flags/awning strings use Verlet integration and length constraints.
  for(const [x,y,z,span]of[[-26,9,-17,16],[10,8,1,12],[-47,5,31,15]]){const nodes=Array.from({length:17},(_,i)=>V(x+i/16*span,y,z));flags.push({a:V(x,y,z),c:V(x+span,y,z),nodes,old:nodes.map(q=>q.clone()),rest:span/16*1.025});}
  const strands=new THREE.InstancedMesh(new THREE.CylinderGeometry(.07,.07,1,6,1,true),M.tomato,48);strands.name='Gravity-constrained pasta awning strands';strands.instanceMatrix.setUsage(THREE.DynamicDrawUsage);strands.frustumCulled=false;strands.castShadow=true;group.add(strands);const dummy=new THREE.Object3D(),up=V(0,1,0);
  const debris=new THREE.InstancedMesh(new THREE.CylinderGeometry(.075,.075,1,6,1,true),M.toasted,120);debris.name='Falling brittle spaghetti crate splinters';debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);debris.frustumCulled=false;debris.castShadow=true;group.add(debris);
  const spatialCells=finalizePlazaStaticGeometry(group);
  function onBoat(x,z,boat){return Math.abs(x-boat.x)<1.9&&Math.abs(z-boat.z)<3.6;}
  function groundAt(x,z){for(const r of seaRamps)if(inside(x,z,r)){const t=clamp((z-r.z0)/(r.z1-r.z0));return r.y0+(r.y1-r.y0)*Math.floor(t*r.steps)/r.steps;}if(inside(x,z,beach))return 3*(44-z)/21;if(inside(x,z,town)&&!(x>-38&&x<-29&&z>-13&&z<25))return 3;if(x>=-47&&x<=-29&&z>=25&&z<=34||Math.abs(x)<4&&z>=29&&z<=42)return 3;return-.15;}
  function surfaceHeightAt(x,z,reference=playerY){let y=Math.max(groundAt(x,z),mechanics.heightAt(x,z,reference),ferryWorld.heightAt(x,z,reference));for(const s of stairs)if(inside(x,z,{x0:s.x0,x1:s.x1,z0:Math.min(s.z0,s.z1),z1:Math.max(s.z0,s.z1)})){const t=clamp((z-s.z0)/(s.z1-s.z0));y=Math.max(y,s.y0+(s.y1-s.y0)*Math.ceil(t*s.steps)/s.steps);}for(const island of islands)if(Math.hypot(x-island.x,z-island.z)<island.r*.8&&reference>=island.y-.6)y=Math.max(y,island.y);for(const boat of boats)if(onBoat(x,z,boat)&&reference>=boat.y+.4)y=Math.max(y,boat.y+1);return y;}
  function heightAt(x,z,reference=playerY){
    // The shared controller requests spawn height before a player is attached.
    // A course return may start on a supported roof above the street below it.
    if(!playerRef&&options.returnFrom&&x===landmarks.spawn.x&&z===landmarks.spawn.z)return landmarks.spawn.y;
    return sewer?(tunnels.some(r=>inside(x,z,r))?-3:-30):surfaceHeightAt(x,z,reference);
  }
  function refreshCrates(){for(const c of crates){const at=colliders.indexOf(c.collider);if(c.broken&&at>=0)colliders.splice(at,1);if(!c.broken&&at<0)colliders.push(c.collider);c.root.visible=!c.broken;}}
  const stackedLayout=[[-22,-29,0],[-22,-29,1],[-22,-29,2],[-22,-24,0],[-22,-24,1],[-17,-29,0],[-17,-29,1],[-17,-24,0],[-17,-24,1],[-20,-20.5,0]];
  function resetCrates(variant=crateVariant){crateVariant=variant===3?3:2;for(const c of crates){const row=Math.floor(c.id/2),col=c.id%2,[x,z,layer]=crateVariant===3?stackedLayout[c.id]:[-21+col*3,-21-row*2.7,0];c.x=x;c.z=z;c.y=3+layer*1.65;c.layer=layer;c.broken=false;c.age=0;c.root.position.set(x,c.y,z);c.root.visible=true;Object.assign(c.collider,{minX:x-.825,maxX:x+.825,minZ:z-.825,maxZ:z+.825,bottom:c.y,top:c.y+1.65});}refreshCrates();}
  function setCrateVariant(value){resetCrates(value);return crateVariant;}
  function breakCratesAt(impact){if(!impact||impact.dropHeight<.45||impact.impactSpeed<15)return[];const hit=[];
    if(crateVariant===3){const candidates=crates.filter(c=>!c.broken&&!crates.some(other=>!other.broken&&other.id!==c.id&&other.x===c.x&&other.z===c.z&&other.collider.top>c.collider.top+.1)&&Math.hypot(impact.x-c.x,impact.z-c.z)<1.08&&Math.abs(impact.y-c.collider.top)<.35).sort((a,b)=>b.collider.top-a.collider.top);const c=candidates[0];if(c){c.broken=true;c.age=0;hit.push(c.id);}}
    else for(const c of crates)if(!c.broken&&Math.hypot(impact.x-c.x,impact.z-c.z)<1.78&&impact.y>=2.9&&impact.y<=4.8){c.broken=true;c.age=0;hit.push(c.id);}
    refreshCrates();return hit;
  }
  function update(dt,time,player){dt=clamp(Number.isFinite(dt)?dt:0,0,.05);clock=Number.isFinite(time)?time:clock+dt;playerRef=player||playerRef;if(player)playerY=player.position.y;interior=!!player&&inside(player.position.x,player.position.z,shop)&&player.position.y<9;shopRoof.visible=shopFront.visible=!interior;for(const room of hollowRooms){const inRoom=!!player&&inside(player.position.x,player.position.z,room)&&player.position.y<room.top-1.9;room.front.visible=room.roof.visible=!inRoom;}mechanics.update(dt,clock,player);ferryWorld.update(dt,clock,player);
    for(const boat of boats){boat.oldX=boat.x;boat.oldY=boat.y;boat.oldZ=boat.z;if(boat.id===0)boat.z=1+Math.sin(clock*.11)*5;else boat.z=38+Math.sin(clock*.18)*2;const load=player&&onBoat(player.position.x,player.position.z,boat)&&Math.abs(player.position.y-boat.y-1)<.3?.15:0,target=Math.sin(clock*1.6+boat.id)*.1-load;boat.velocity+=(target-boat.y)*26*dt;boat.velocity*=Math.exp(-5*dt);boat.y+=boat.velocity*dt;boat.root.position.set(boat.x,boat.y,boat.z);Object.assign(boat.collider,{minX:boat.x-1.8,maxX:boat.x+1.8,minZ:boat.z-3.5,maxZ:boat.z+3.5,bottom:boat.y-.4,top:boat.y+1});}
    let index=0;for(const f of flags){for(let i=1;i<16;i++){const before=f.nodes[i].clone();f.nodes[i].add(f.nodes[i].clone().sub(f.old[i]).multiplyScalar(.96));f.nodes[i].y-=8*dt*dt;f.nodes[i].z+=Math.sin(clock*1.6+i*.2)*dt*dt*1.5;f.old[i].copy(before);}for(let pass=0;pass<7;pass++){f.nodes[0].copy(f.a);f.nodes[16].copy(f.c);for(let i=0;i<16;i++){const d=f.nodes[i+1].clone().sub(f.nodes[i]),l=d.length()||1;d.multiplyScalar((l-f.rest)/l*.5);if(i)f.nodes[i].add(d);if(i+1<16)f.nodes[i+1].sub(d);}}for(let i=0;i<16;i++){const a=f.nodes[i],c=f.nodes[i+1],d=c.clone().sub(a),len=d.length();dummy.position.copy(a).add(c).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,len>1e-8?d.multiplyScalar(1/len):up);dummy.scale.set(1,Math.max(.001,len),1);dummy.updateMatrix();strands.setMatrixAt(index++,dummy.matrix);}}strands.instanceMatrix.needsUpdate=true;
    index=0;for(const c of crates){if(c.broken)c.age+=dt;for(let j=0;j<12;j++){const t=c.age,a=j*2.399,active=c.broken&&t<2.1;dummy.position.set(c.x+Math.cos(a)*t*1.8,Math.max(3.08,(c.y??3)+1.1+(1+j%3)*t-5*t*t),c.z+Math.sin(a)*t*1.8);dummy.rotation.set(a+t*2,j*.7,t*3);dummy.scale.setScalar(active?1:0);if(active)dummy.scale.y=.6+(j%4)*.18;dummy.updateMatrix();debris.setMatrixAt(index++,dummy.matrix);}}debris.instanceMatrix.needsUpdate=true;
  }
  function reset(){clock=0;playerY=3;sewer=interior=false;playerRef=null;shopRoof.visible=shopFront.visible=true;mounted=false;mechanics.reset();ferryWorld.reset();resetCrates(episode===3?3:2);for(const boat of boats){boat.x=boat.oldX=boat.id===0?-33.5:-44;boat.z=boat.oldZ=boat.id===0?1:38;boat.y=boat.oldY=boat.velocity=0;}for(const f of flags)for(let i=0;i<17;i++){f.nodes[i].copy(f.a).lerp(f.c,i/16);f.old[i].copy(f.nodes[i]);}update(0,0,null);}
  reset();
  return{group,episode,bounds,colliders,landmarks,islands,portals,returnPoints:PLAZA_RETURN_POINTS,shop,crates,roofs,sewerEntrances,tunnels,seaRamps,heightAt,surfaceHeightAt,update,reset,breakCratesAt,resetCrates,setCrateVariant,preciseGroundPound:true,nozzleAllowed:true,mode:'plaza',
    ...mechanics.api,ferries:ferryWorld.ferries,onFerry:ferryWorld.onFerry,get turboDoorBroken(){return mechanics.turboDoorBroken;},get turboTrackDoorBroken(){return mechanics.turboTrackDoorBroken;},get blueTurboDoorBroken(){return mechanics.blueTurboDoorBroken;},get lighthouseBroken(){return mechanics.lighthouseBroken;},get tossWindowBroken(){return mechanics.windowBroken;},get nozzleModes(){return mounted?['spray']:mechanics.nozzleModes;},setMounted(value){mounted=!!value;},setPlayerController(fn){playerController=typeof fn==='function'?fn:null;},controlPlayer(player,dt,input){return playerController?.(player,dt,input)===true;},
    roomAt(x,z,y=playerY){return hollowRooms.find(room=>inside(x,z,room)&&y<room.top-1.9)?.name||null;},
    setSewer(value){sewer=!!value;},get inSewer(){return sewer;},isInShop(x,z){return inside(x,z,shop,-.25);},
    surfaceAt(x,z){return sewer?(tunnels.some(r=>inside(x,z,r))?'ground':'void'):groundAt(x,z)>-.1||mechanics.onExtraGround(x,z,playerY)||!!ferryWorld.onFerry(x,z,playerY)||stairs.some(s=>inside(x,z,{x0:s.x0,x1:s.x1,z0:Math.min(s.z0,s.z1),z1:Math.max(s.z0,s.z1)}))||islands.some(i=>Math.hypot(x-i.x,z-i.z)<i.r*.8&&playerY>i.y-.6)||boats.some(boat=>onBoat(x,z,boat)&&playerY>.5)?'ground':'water';},
    refillAt(x,z,y){return !mounted&&(Math.hypot(x-1,z+10)<2.9&&Math.abs(y-3)<.7||sewer&&tunnels.some(r=>inside(x,z,r))&&Math.abs(y+3)<.5);},
    platformMotionAt(x,z,y){const ferryMotion=ferryWorld.platformMotionAt(x,z,y);if(ferryMotion)return ferryMotion;for(const boat of boats)if(Math.abs(x-boat.oldX)<1.9&&Math.abs(z-boat.oldZ)<3.6&&Math.abs(y-(boat.oldY+1))<.35)return{x:boat.x-boat.oldX,y:boat.y-boat.oldY,z:boat.z-boat.oldZ};return null;},
    get mapData(){return{route:episode===1?[landmarks.spawn,V(12,3,25),landmarks.sand,...islands.slice(0,3).map(i=>V(i.x,i.y,i.z))]:[landmarks.spawn,V(7,3,25),V(7,3,-14),landmarks.shopDoor,landmarks.crateGuy],platforms:[{x:-8,z:-5,w:78,d:70,y:3,stable:true,support:true},...islands.map(i=>({x:i.x,z:i.z,w:i.r*2,d:i.r*2,y:i.y,stable:true,support:true}))]};},
    getState(){return{episode,interior,sewer,crateVariant,mounted,spatialCells,...mechanics.getState(),...ferryWorld.getState(),crates:crates.map(c=>({id:c.id,x:c.x,y:c.y,z:c.z,layer:c.layer,bottom:c.collider.bottom,top:c.collider.top,broken:c.broken,age:c.age})),boats:boats.map(q=>({id:q.id,x:q.x,y:q.y,z:q.z,oldY:q.oldY,oldZ:q.oldZ,velocity:q.velocity})),flagNodes:flags.map(f=>f.nodes.map(q=>q.toArray()))};}
  };
}
