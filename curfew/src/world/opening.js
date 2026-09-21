import * as THREE from 'three';
import {Kit} from './sites.js';
import {projectPlaceSurfaceUVs} from './place-surfaces.js';
import {clonePlaceMaterial} from './places.js';
import {StationTimberKit,longitudinalWoodUV,bevelStock} from './station-exterior-geometry.js';
import {OPENING as O,openingRoadPoint} from './opening-layout.js';

const WOOD=[.125,.084,.05], PALE=[.28,.23,.15], IRON=[.064,.075,.082], RUST=[.13,.065,.034];
const SOIL=[.07,.064,.047], STONE=[.13,.14,.138], _q=new THREE.Quaternion(),_v=new THREE.Vector3();
const TANK=[.075,.102,.103], ZINC=[.22,.235,.23], CUT=[.18,.126,.072];

// Separate material ownership, with one merged mesh per actual substance.
// Breakable fence ranges stay in the timber kit throughout the split.
class OpeningExteriorKit extends Kit{
  constructor(){super();this.channels={timber:new StationTimberKit(),metal:new Kit(),mineral:new Kit(),ground:new Kit()};}
  channel(col){return col===SOIL?this.channels.ground:col===STONE?this.channels.mineral:
    col===IRON||col===RUST||col===TANK||col===ZINC?this.channels.metal:this.channels.timber;}
  at(g,col,x,y,z,ry,rx,rz){return this.channel(col).at(g,col,x,y,z,ry,rx,rz);}
  box(w,h,d,x,y,z,col,ry,rx,rz){return this.channel(col).box(w,h,d,x,y,z,col,ry,rx,rz);}
  push(g,col){return this.channel(col).push(g,col);}
  open(){for(const k of Object.values(this.channels))k.open();return this;}
  close(...args){for(const k of Object.values(this.channels))k.close(...args);return this;}
}

export function buildOpeningExterior(api,roads){
  const k=new OpeningExteriorKit();tower(k,api);groundLoop(k,api,roads);
  return Object.fromEntries(Object.entries(k.channels).map(([name,kit])=>[name,kit.build()]));
}

// All body-sized geometry and its collider come from the same dimensions.
function box(k,api,w,h,d,x,y,z,col=WOOD,tag='wood',standable=true){
  k.box(w,h,d,x,y,z,col);
  api.emit({kind:'obb',x,z,halfX:w/2,halfZ:d/2,yaw:0,y0:y-h/2,y1:y+h/2,tag,standable});
}
function beam(k,a,b,width,col=WOOD){
  const v=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
  const g=new THREE.BoxGeometry(width,v.length(),width);
  if(col===WOOD||col===PALE)longitudinalWoodUV(g,1,a[0]*.17+a[2]*.11);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));
  g.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);k.push(g,col);
}

function tower(k,api){
  const {x,z}=O.tower,y=api.padY;
  // Four timber legs carry the tank. A boarded maintenance face supplies a real
  // continuous scaling surface; the other three sides are open, braced construction.
  for(const dx of [-1.85,1.85])for(const dz of [-1.85,1.85]){
    box(k,api,.40,12,.40,x+dx,y+6,z+dz,WOOD);
    box(k,api,.68,.48,.68,x+dx,y+.24,z+dz,STONE,'stone');
  }
  box(k,api,3.7,12,.18,x,y+6,z+1.85,WOOD,'wall');
  for(const h of [0,4,8])for(const side of [-1,1]){
    beam(k,[x+side*1.85,y+h+.25,z-1.85],[x+side*1.85,y+h+3.95,z+1.85],.19,WOOD);
    beam(k,[x-1.85,y+h+.25,z-1.85],[x+1.85,y+h+3.95,z-1.85],.19,WOOD);
    k.box(4.1,.22,.20,x,y+h+3.95,z+side*1.85,IRON);
  }
  // Weathered grip courses on the maintenance face, a water pipe, and tank bands.
  for(let h=.5;h<12;h+=.55){
    k.box(3.72,.10,.13,x,y+h,z+1.96,h%1.1<.6?PALE:IRON);
    for(let j=0;j<7;j++)k.box(.025,.41,.025,x-1.7+j*.54,y+h+.24,z+1.947,IRON);
  }
  const flights=[[-3.6,3.6,3.6,3.6,0],[3.6,3.6,3.6,-3.6,3],
    [3.6,-3.6,-3.6,-3.6,6],[-3.6,-3.6,-3.6,3.6,9]];
  for(let f=0;f<flights.length;f++){
    const [ax,az,bx,bz,base]=flights[f],dx=(bx-ax)/18,dz=(bz-az)/18,alongX=dx!==0;
    for(let i=0;i<18;i++){
      const px=x+ax+dx*(i+.5),pz=z+az+dz*(i+.5),top=y+base+(i+1)/6;
      box(k,api,alongX?.44:1.65,.12,alongX?1.65:.44,px,top-.06,pz,i%3===0?PALE:WOOD);
      k.box(alongX?.07:1.65,.035,alongX?1.65:.07,px-dx*.35,top+.015,pz-dz*.35,PALE);
      if(i%4===0){
        const nx=alongX?0:(f===1?.84:-.84),nz=alongX?(f===0?.84:-.84):0;
        k.box(.09,1.02,.09,px+nx,top+.48,pz+nz,IRON);
        k.box(.14,top-y,.14,px+nx,y+(top-y)/2,pz+nz,WOOD);
      }
    }
    box(k,api,1.72,.18,1.72,x+bx,y+base+3-.09,z+bz,WOOD);
    const nx=alongX?0:(f===1?.89:-.89),nz=alongX?(f===0?.89:-.89):0;
    beam(k,[x+ax+nx,y+base+1,z+az+nz],[x+bx+nx,y+base+4,z+bz+nz],.095,IRON);
    // Outer handrail has physical segments following its actual slope.
    for(let i=0;i<18;i++){
      const px=x+ax+dx*(i+.5)+nx,pz=z+az+dz*(i+.5)+nz,top=y+base+(i+1)/6;
      api.emit({kind:'obb',x:px,z:pz,halfX:alongX?.21:.045,halfZ:alongX?.045:.21,yaw:0,
        y0:top+.16,y1:top+1,tag:'metal',climbable:false,standable:false});
    }
  }
  // Leave the full final flight open overhead. A solid deck here would trap the climber.
  box(k,api,7.3,.20,9.4,x+1.05,y+11.9,z,WOOD);
  box(k,api,2.1,.20,1.7,x-3.65,y+11.9,z+3.85,WOOD);
  // The cutout includes the lower turning landing: a strip across its headroom
  // would catch a descending player and make the auto-mantle pull them upstairs.
  for(const z0 of [-3.8,-2.2,-.6,1.0])k.box(.08,.95,.08,x-2.5,y+12.5,z+z0,IRON);
  k.box(.10,.10,6.6,x-2.5,y+13,z-1.2,PALE);
  api.emit({kind:'obb',x:x-2.5,z:z-1.2,halfX:.05,halfZ:3.3,yaw:0,y0:y+12.03,y1:y+13,tag:'metal',climbable:false});
  for(const s of [-1,1]){
    api.emit({kind:'obb',x:x+s*4.7,z,halfX:.05,halfZ:4.7,yaw:0,y0:y+12.03,y1:y+13,tag:'metal',climbable:false});
    if(s<0)api.emit({kind:'obb',x,z:z+s*4.7,halfX:4.7,halfZ:.05,yaw:0,y0:y+12.03,y1:y+13,tag:'metal',climbable:false});
    else for(const dx of [-3,3])api.emit({kind:'obb',x:x+dx,z:z+4.7,halfX:1.7,halfZ:.05,yaw:0,y0:y+12.03,y1:y+13,tag:'metal',climbable:false});
    // Narrow rail caps instead of a solid chest-height sheet.
    k.box(.14,.10,9.4,x+s*4.7,y+13,z,PALE);
    if(s<0)k.box(9.4,.10,.14,x,y+13,z+s*4.7,PALE);
    else for(const dx of [-3,3])k.box(3.4,.10,.14,x+dx,y+13,z+4.7,PALE);
  }
  // Open pickets keep the view out from the deck.
  for(let i=0;i<9;i++)for(const s of [-1,1]){
    if(s<0||Math.abs(-4+i)>1.25)k.box(.08,.95,.08,x-4+i,y+12.5,z+s*4.7,IRON);
    k.box(.08,.95,.08,x+s*4.7,y+12.5,z-4+i,IRON);
  }
  // An uninterrupted maintenance climb meets the outer deck lip, without an
  // overhang or a rail across the pull-up. The stairs remain the slower way up.
  box(k,api,2.1,12.1,.16,x,y+6.05,z+4.70,WOOD,'wall');
  for(let h=.45;h<12;h+=.46){
    k.box(2.16,.085,.10,x,y+h,z+4.81,PALE);
    for(const dx of [-.94,.94])k.box(.055,.46,.035,x+dx,y+h-.2,z+4.80,IRON);
  }
  k.cyl(2.0,2.0,3.35,32,x,y+13.82,z,TANK);
  api.emit({kind:'circle',x,z,r:2,y0:y+12,y1:y+15.5,tag:'metal',standable:true});
  for(const h of [12.2,12.8,14.7,15.48])k.tube(2.05,2.05,.13,32,x,y+h,z,IRON);
  for(let i=0;i<32;i++){const a=i*Math.PI/16;k.cyl(.018,.018,3.2,4,x+Math.sin(a)*2.01,y+13.82,z+Math.cos(a)*2.01,IRON);}
  k.cone(2.17,.85,32,x,y+15.93,z,IRON);
  k.cyl(.095,.095,13.4,8,x+1.6,y+6.7,z+1.6,RUST);
  k.cyl(.10,.10,1.45,8,x,y+16.65,z,IRON);
  k.cone(.4,.23,12,x,y+17.45,z,IRON);
  for(const s of [-1,1])box(k,api,.45,.35,.55,x+s*3.6,y+.17,z+3.6,STONE,'stone');
  // A bench and an open tool shelf make the top somewhere to stop.
  box(k,api,2.1,.14,.65,x+3.2,y+12.52,z-2,WOOD);
  for(const dz of [-.75,.75])k.box(.12,.46,.53,x+3.2+dz,y+12.23,z-2,IRON);
  k.box(2.1,.50,.08,x+3.2,y+12.85,z-2.3,WOOD);
}

function groundLoop(k,api,roads){
  const ground=(x,z)=>api.heightAt(api.wx(x,z),api.wz(x,z));
  // The path hugs the natural ground. It is a footpath, not another drivable ribbon.
  for(let n=1;n<O.path.length;n++){
    const a=O.path[n-1],b=O.path[n],len=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(len/.6);
    for(let i=0;i<steps;i++){
      const t=(i+.5)/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
      if(roads.roadDistance(api.wx(x,z),api.wz(x,z))<4.4)continue;
      const r=1.15+.10*Math.sin(i*2.17),nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len;
      // A continuous worn strip follows the real bed; it has no new floor collider.
      const positions=[],uvs=[],idx=[0,1,2,0,2,3];
      for(const [end,side]of[[0,-1],[0,1],[1,1],[1,-1]]){
        const t=(i+end)/steps,edge=1.12+.09*Math.sin((i+end)*1.71+n*.63);
        const ex=a[0]+(b[0]-a[0])*t+nx*edge*side,ez=a[1]+(b[1]-a[1])*t+nz*edge*side;
        positions.push(ex,ground(ex,ez)+.052,ez);uvs.push(ex*.25,ez*.25);
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();k.push(g,SOIL);
      if(i%5===0)for(const s of [-1,1]){
        const ex=x+nx*s*r,ez=z+nz*s*r;k.box(.13,.045,.22,ex,ground(ex,ez)+.023,ez,STONE,i*.73);
      }
    }
  }
  // Open timber woodstore: a dry recess, a bench, stacked split logs, and a reward within.
  const sx=2,sz=-20,y=ground(sx,sz);
  for(const dx of [-2,2])for(const dz of [-1.5,1.5])box(k,api,.20,2.45,.20,sx+dx,y+1.225,sz+dz,WOOD);
  box(k,api,4.3,.16,3.6,sx,y+2.5,sz,IRON,'metal');
  // Folded metal over a continuous deck, inside the original overhang and top.
  k.at(bevelStock(4.28,.065,3.58,.022),ZINC,sx,y+2.612,sz);
  for(const side of [-1,1]){
    k.box(4.3,.19,.055,sx,y+2.48,sz+side*1.765,IRON);
    k.box(.055,.19,3.55,sx+side*2.12,y+2.48,sz,IRON);
    k.box(4.02,.18,.18,sx,y+2.29,sz+side*1.47,WOOD);
  }
  for(const dx of [-1.38,-.44,.53,1.43]){
    k.box(.032,.018,3.55,sx+dx,y+2.645,sz,ZINC);
    k.box(.10,.13,3.05,sx+dx,y+2.345,sz,WOOD);
  }
  box(k,api,4.0,1.8,.14,sx,y+.9,sz-1.5,WOOD);
  for(let i=0;i<12;i++){
    const h=1.74+(i%4)*.035,col=i%4===0?CUT:WOOD;
    k.box(.316,h,.042,sx-1.825+i*.331,y+h*.5,sz-1.586,col);
  }
  // Real split ends and uneven courses, in the same log-stack volume.
  for(let i=0;i<15;i++){
    const row=Math.floor(i/5),slot=i%5,len=1.10+.13*Math.sin(i*2.3),radius=.125+(i%3)*.008;
    const lx=sx-1.14,ly=y+.15+row*.205,lz=sz-.96+slot*.224;
    k.cyl(radius,radius*.92,len,6,lx,ly,lz,WOOD,0,0,Math.PI/2);
    for(const side of [-1,1])k.cyl(radius*.82,radius*.82,.008,6,lx+side*(len*.5+.005),ly,lz,CUT,0,0,Math.PI/2);
  }
  // Keep the original solid stack collision, but stop its opaque box hiding all
  // of the separately shaped logs. The visible cradle sits inside that volume.
  api.emit({kind:'obb',x:sx-1.15,z:sz-.5,halfX:1.6/2,halfZ:1.2/2,yaw:0,
    y0:y+.32-.65/2,y1:y+.32+.65/2,tag:'wood',standable:true});
  k.box(1.6,.06,1.2,sx-1.15,y+.03,sz-.5,WOOD);
  // A fallen trunk hides a box but leaves a generous approach on either end.
  const lx=29,lz=-20,ly=ground(lx,lz);
  k.cyl(.5,.35,4.8,11,lx,ly+.5,lz,[.073,.058,.04],0,0,Math.PI/2);
  api.emit({kind:'obb',x:lx,z:lz,halfX:2.4,halfZ:.45,yaw:0,y0:ly,y1:ly+.95,tag:'wood',standable:true});
  for(const s of [-1,1])k.cyl(.30,.30,.025,11,lx+s*2.41,ly+.5,lz,PALE,0,0,Math.PI/2);
  // Low fence fragments frame pockets, with gaps at every path junction.
  for(const [x,z] of [[23,-29],[30,6],[35,-10],[-7,-27]]){
    for(const dx of [-1.8,1.8]){k.open();box(k,api,.15,1.15,.16,x+dx,ground(x+dx,z)+.575,z,WOOD,'fence');k.close(x+dx,z,.16,WOOD);}
    k.open();
    for(const h of [.43,.87])k.box(3.7,.12,.09,x,ground(x,z)+h,z,WOOD);
    k.close(x,z,1.9,WOOD);
    api.emit({kind:'obb',x,z,halfX:1.85,halfZ:.05,yaw:0,y0:ground(x,z)+.37,y1:ground(x,z)+.94,tag:'fence',standable:false});
  }
  // Short edge marks lead from the pumps onto the live Holdfast departure.
  // The old painted bay pointed across the grass after the road was rerouted.
  const yaw=api.yaw||0,cy=Math.cos(yaw),sy=Math.sin(yaw);
  for(let distance=8;distance<=35;distance+=3){
    const p=openingRoadPoint(roads,O.departure.route,distance);if(!p)continue;
    for(const side of[-1,1]){
      const wx=p.x-p.tz*side*(p.width*.5+.35),wz=p.z+p.tx*side*(p.width*.5+.35),dx=wx-O.x,dz=wz-O.z;
      const x=dx*cy-dz*sy,z=dx*sy+dz*cy;
      (k.channels?.mineral||k).box(.09,.022,1.3,x,ground(x,z)+.055,z,PALE,Math.atan2(p.tx,p.tz)-yaw);
    }
  }
}

export class Opening {
  static id='opening';
  constructor(ctx){this.ctx=ctx;this.root=new THREE.Group();this.root.name='station-opening';this.elapsed=0;this.nightT=-1;this.warned=false;this.cues=[];this.trees=[];this.materials=[];this.geometries=[];this.textures=[];}
  _sys(id){return this.ctx.systems.get(id);}
  init(){
    const places=this._sys('places'),n=places.nodes.get(O.id);this.padY=n.padY;this.yaw=n.yaw;
    const api=places._apiFor(n.def,n,'opening','station-opening');this.api=api;
    // The root uses the same local coordinates as the shop; geometry already carries Y.
    this.root.position.set(O.x,0,O.z);this.root.rotation.y=n.yaw;this.ctx.scene.add(this.root);
    const exterior=buildOpeningExterior(api,this._sys('roads'));
    for(const [channel,g]of Object.entries(exterior)){
      if(!g)continue;
      let mat;
      if(channel==='ground')mat=this._sys('chunks').matGround;
      else{
        mat=clonePlaceMaterial(places.matBody);
        if(channel==='metal'){
          mat.map=places.smoothSteelSurface.albedo;mat.bumpMap=places.smoothSteelSurface.physical;mat.bumpScale=.007;
        }else{
          const family=channel==='timber'?'timber':'naturalRock';
          mat.map=places.surfaceTextures[family];mat.bumpMap=places.surfaceTextures[family+'-bump'];
        }
        if(channel!=='timber')projectPlaceSurfaceUVs(g,4);
        this.materials.push(mat);
      }
      const mesh=this._mesh(g,mat,'opening-exterior-'+channel);
      mesh.castShadow=channel!=='ground';mesh.receiveShadow=true;
    }
    this._trees();this._papers();this._room();this._lanterns();this._weather();
    if(this._sys('progress').flag('opening:night'))this.nightT=20;
    // THE ELEVEN REWIRE. Alex: "on a fresh game the car exists, parked in the Filling Station
    // garage, full condition, visible immediately, no road spawn." So it is placed IN THE BAY
    // at init, before the first step, and _considerSpawn's answer for the rest of the session
    // is that the car is already here.
    //
    // Never _park() in here: that snaps the nose AWAY from the nearest major, which at the
    // station would point the car into the back wall. placeAt takes a heading, and heading 0
    // is -Z, which is the way the bay is open — so the site's own yaw plus PI faces the car
    // out through the open mouth. The bay is at site-local x -23.0, z -0.2.
    const car=this._sys('car');
    // Heading 0 is -Z and the bay is open on -Z, so the site's own yaw points the nose out
    // through the mouth. MEASURED in the bay, not reasoned: yaw + PI put it nose to the back
    // wall and the first thing a new player would have had to do is reverse.
    car.placeAt(api.wx(-23.0,-0.3),api.wz(-23.0,-0.3),n.yaw);
    // ALEX, 2026-09-15: "lets have it start at zero gas."
    //
    // ONLY ON A NIGHT NOBODY HAS PLAYED YET — a save that has already been driven carries its
    // own wear and this must not reach in and empty it. The bay has two cans on the rack ten
    // metres from the seat, so the opening is: the shutter goes up, the car will not start,
    // there is a can on the wall. Nothing has to say any of that out loud, which is the whole
    // reason to teach the county's one real verb here rather than on a roadside at 3 a.m.
    if(!this._sys('progress').flag('car:wear')){car.wear=1;car.wearShown=1;}
    car.beacon=false;
    // YOU DO NOT DISCOVER THE GARAGE YOU WAKE UP IN.
    //
    // ALEX, 2026-09-15: "collecting those gas canisters might have given me xp. somehow it
    // let me choose a couple perks ... start at level 1." It was not the cans — nothing
    // subscribes to their pickup event. MEASURED: the night starts at (-545.0, 243.1) and
    // this site's centre is (-520, 240), which is 25.19 m out against its own discoverR of
    // 24. So the player spawns 1.2 m OUTSIDE the radius of the building they are standing
    // in, and the first step towards the car or the can rack crosses in and "arrives".
    // places.js already means to prevent exactly this — _seedInside is commented "record,
    // never fire" — and it cannot, because at the spawn the station is not inside anything.
    //
    // A find is worth XP_PLACE.findMajor, which is 300, and level 2 is 273. So the county's
    // first ten seconds handed out a level and a skill point for walking two metres across a
    // floor. Mark it found here, where the lane that owns "the night starts here" lives, and
    // pay nothing: coming home is not a discovery when you never left.
    const pr=this._sys('progress');
    if(places&&!places.found.has(O.id)){places.found.add(O.id);places._pinsDirty=true;}
    pr?.found?.add?.(O.id);
    this.off=[this.ctx.bus.on('phase:changed',p=>{if(p.phase==='night'&&p.prev==='dusk')this._night();}),
      this.ctx.bus.on('place:rest',p=>{if(p.id===O.id)this.pendingWake=true;})];
  }
  _mesh(geo,mat,name){this.geometries.push(geo);const m=new THREE.Mesh(geo,mat);m.name=name;this.root.add(m);return m;}
  _trees(){
    const f=this._sys('flora'),r=this._sys('roads'),a=this.api;
    const rowsAll=[...O.trees];
    for(let i=0;i<42;i++){
      const theta=i*2.399,rad=45+(i%3)*8,x=Math.cos(theta)*rad,z=Math.sin(theta)*rad;
      rowsAll.push([x,z,i%3===0?4:i%2,.83+(i%5)*.10]);
    }
    for(let t=0;t<6;t++){
      const rows=rowsAll.filter(v=>v[2]===t&&r.roadDistance(a.wx(v[0],v[1]),a.wz(v[0],v[1]))>6.3);
      if(!rows.length)continue;const tpl=f.templates[t];
      for(const [geo,mat] of [[tpl.lod0,f.matNear],[tpl.lod1,f.matMid]]){
        const mesh=new THREE.InstancedMesh(geo,mat,rows.length),matrix=new THREE.Matrix4();
        rows.forEach(([x,z,_,scale],i)=>{const y=a.heightAt(a.wx(x,z),a.wz(x,z));
          matrix.compose(new THREE.Vector3(x,y,z),_q.setFromAxisAngle(new THREE.Vector3(0,1,0),i*2.399),_v.set(scale,scale,scale));mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new THREE.Color(1,1,1));});
        mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=geo===tpl.lod0;mesh.receiveShadow=true;mesh.name='opening-trees-'+t;this.root.add(mesh);
      }
      for(const [x,z,_,scale] of rows){const y=a.heightAt(a.wx(x,z),a.wz(x,z));
        a.emit({kind:'circle',x,z,r:tpl.trunkR*scale*1.15,y0:y-.3,y1:y+tpl.height*scale,tag:'tree',climbable:false});this.trees.push({x,z,y,scale});}
    }
    const rows=[];
    for(let i=0;i<88;i++){
      const theta=i*2.399,rad=24+(i%8)*4,x=Math.cos(theta)*rad,z=Math.sin(theta)*rad;
      if(r.roadDistance(a.wx(x,z),a.wz(x,z))<5||x<8&&x>-30&&z>-7&&z<8)continue;
      rows.push([x,z,.68+(i%4)*.22]);
    }
    // Small cut-leaf ferns use actual leaf geometry and the tree's warmed material.
    // That keeps this clearing independent of the optional grass-card program.
    const fern=new Kit();
    for(let j=0;j<7;j++){
      const angle=j*2.399,dx=Math.sin(angle),dz=Math.cos(angle),length=.60+(j%3)*.1;
      beam(fern,[0,.03,0],[dx*length,.42,dz*length],.013,[.068,.097,.040]);
      for(let n=1;n<7;n++)for(const side of [-1,1]){
        const t=n/7,x=dx*length*t,z=dz*length*t,y=.03+.39*t,size=.18*Math.sin(t*Math.PI);
        const leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute([
          x,y,z,x-dz*size*side-dx*.035,y+.015,z+dx*size*side-dz*.035,
          x-dz*size*.65*side+dx*.11,y+.06,z+dx*size*.65*side+dz*.11
        ],3));leaf.setIndex([0,1,2]);leaf.setAttribute('uv',new THREE.Float32BufferAttribute([.75,.89,.75,.89,.75,.89],2));
        leaf.computeVertexNormals();fern.push(leaf,n%2?[.083,.12,.050]:[.12,.15,.065]);
      }
    }
    const fernGeo=fern.build(),uv=fernGeo.attributes.uv;
    fernGeo.setAttribute('aBark',new THREE.Float32BufferAttribute(new Float32Array(fernGeo.attributes.position.count),1));
    for(let i=0;i<uv.count;i++)uv.setXY(i,.75,.89);
    this.geometries.push(fernGeo);
    for(const [geo,mat] of [[fernGeo,f.matNear]]){
      const mesh=new THREE.InstancedMesh(geo,mat,rows.length),matrix=new THREE.Matrix4();
      rows.forEach(([x,z,scale],i)=>{const y=a.heightAt(a.wx(x,z),a.wz(x,z));matrix.compose(new THREE.Vector3(x,y,z),_q.setFromAxisAngle(new THREE.Vector3(0,1,0),i*2.399),_v.set(scale,scale,scale));mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new THREE.Color(1,1,1));});
      mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;mesh.name='opening-ferns';this.root.add(mesh);
    }
  }
  _paper(name,x,y,z,w,h,draw,yaw=Math.PI){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.round(768*h/w);
    const c=canvas.getContext('2d');draw(c,canvas.width,canvas.height);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.NoColorSpace;tex.anisotropy=4;this.textures.push(tex);
    const mat=this._sys('places').matBody.clone();mat.map=tex;mat.bumpScale=0;this.materials.push(mat);
    const geo=new THREE.PlaneGeometry(w,h);geo.setAttribute('color',new THREE.Float32BufferAttribute(Array(geo.attributes.position.count*3).fill(1),3));
    const m=this._mesh(geo,mat,name);m.position.set(x,y,z);m.rotation.y=yaw;return m;
  }
  _papers(){
    // ROUND 22 (lane D). Alex: "it happened the night the clocks fell back. Kitchen calendar,
    // first Sunday of November circled, FALL BACK. Everyone got an extra hour of dark and it
    // never gave the hour back." November 2026: the 1st is that Sunday. Every night since is
    // crossed off. 'Still here.' stays.
    this.calendar=this._paper('thirty-days-calendar',-11.2,this.padY+1.73,3.69,1.32,1.98,(c,w,h)=>{
      c.fillStyle='#51483a';c.fillRect(0,0,w,h);c.fillStyle='#17120c';c.fillRect(0,0,w,22);
      for(let i=0;i<3200;i++){const x=(i*347)%w,y=(i*593)%h;c.fillStyle=i%2?'#4d4538':'#554c3e';c.fillRect(x,y,1+i%3,2);}
      // the picture half: a hill under a sky, the kind of thing a feed store gives away
      c.fillStyle='#3a3628';c.fillRect(0,22,w,168);c.fillStyle='#2b2a24';c.beginPath();c.arc(w/2,200,220,Math.PI,0);c.fill();
      c.fillStyle='#4d4538';c.beginPath();c.arc(w*.72,86,26,0,Math.PI*2);c.fill();   // the sun, in the picture, where it still is
      c.textAlign='center';c.fillStyle='#030201';c.font='bold 84px Georgia';c.fillText('NOVEMBER',w/2,262);
      const gx=43,gy=290,gw=w-86,gh=600,cw=gw/7,ch=gh/5;
      c.strokeStyle='#0d0a06';c.lineWidth=2;c.strokeRect(gx,gy,gw,gh);
      for(let row=0;row<5;row++)for(let col=0;col<7;col++){
        const x=gx+col*cw,y=gy+row*ch,n=row*7+col+1;
        c.strokeStyle='#1a150f';c.lineWidth=2;c.strokeRect(x,y,cw,ch);
        if(n>30)continue;
        c.fillStyle='#030201';c.font='34px Georgia';c.textAlign='left';c.fillText(String(n),x+8,y+34);
        if(n===1){
          c.strokeStyle='#3a0a06';c.lineWidth=5;c.beginPath();c.ellipse(x+cw/2,y+ch/2,cw*.47,ch*.45,.12,0,Math.PI*2);c.stroke();
          c.fillStyle='#3a0a06';c.font='bold 26px Georgia';c.textAlign='center';c.fillText('FALL',x+cw/2,y+ch*.58);c.fillText('BACK',x+cw/2,y+ch*.84);
          continue;
        }
        c.strokeStyle='#250504';c.lineWidth=n<20?6:4;c.beginPath();c.moveTo(x+14,y+16+n%7);c.lineTo(x+cw-12,y+ch-12);c.moveTo(x+cw-14,y+14);c.lineTo(x+12,y+ch-14-n%9);c.stroke();
      }
      c.textAlign='center';c.fillStyle='#060302';c.font='italic 38px Georgia';c.fillText('Still here.',w/2,h-108);
      c.strokeStyle='#0c0603';c.lineWidth=6;c.beginPath();c.moveTo(190,h-65);c.lineTo(582,h-61);c.stroke();
    });
    this._paper('shelter-bed-sign',-5.245,this.padY+2.45,-.8,1.04,.48,(c,w,h)=>{
      c.fillStyle='#294343';c.fillRect(0,0,w,h);c.strokeStyle='#a89a72';c.lineWidth=10;c.strokeRect(14,14,w-28,h-28);
      c.strokeStyle='#b9ab84';c.lineWidth=18;c.beginPath();c.moveTo(95,h-80);c.lineTo(95,85);c.moveTo(95,h-120);c.lineTo(430,h-120);c.lineTo(430,h-80);c.moveTo(120,h-155);c.lineTo(420,h-155);c.stroke();
      c.font='bold 75px sans-serif';c.fillStyle='#b9ab84';c.textAlign='center';c.fillText('REST',w*.75,h*.64);
    },Math.PI/2);
    // Signs stand at actual outgoing road mouths, not invented compass directions.
    const signs=[['HOLDFAST','works-cut',43,-1],['RESERVOIR','reservoir-road',46,1],['COUNTY ROAD','spur-west',45,-1],['NORTHWEST','station-northwest',46,1]];
    const k=new Kit(),roads=this._sys('roads');this.signs=[];
    for(const [label,route,distance,side] of signs){
      const road=openingRoadPoint(roads,route,distance);if(!road)continue;
      const offset=road.width*.5+2.3,dx=road.x-road.tz*side*offset-O.x,dz=road.z+road.tx*side*offset-O.z;
      const x=dx*Math.cos(this.yaw)-dz*Math.sin(this.yaw),z=dx*Math.sin(this.yaw)+dz*Math.cos(this.yaw);
      const yaw=Math.atan2(-road.tx,-road.tz)-this.yaw;
      const gy=this.api.heightAt(this.api.wx(x,z),this.api.wz(x,z));
      box(k,this.api,.14,2.2,.14,x,gy+1.1,z,IRON,'metal',false);
      this._paper('road-sign-'+label,x+Math.sin(yaw)*.12,gy+2.05,z+Math.cos(yaw)*.12,2.9,.59,(c,w,h)=>{
        c.fillStyle='#514b39';c.fillRect(0,0,w,h);c.strokeStyle='#080c08';c.lineWidth=8;c.strokeRect(10,10,w-20,h-20);
        c.fillStyle='#000000';c.font='bold 64px sans-serif';c.textAlign='center';c.fillText(label,w*.45,h*.66);
        c.fillRect(w-81,52,16,h-83);c.beginPath();c.moveTo(w-73,23);c.lineTo(w-105,65);c.lineTo(w-41,65);c.fill();
      },yaw);
      this.signs.push({label,route,x,z,y:gy,yaw,roadClearance:roads.roadDistance(this.api.wx(x,z),this.api.wz(x,z))-road.width*.5});
    }
    this._mesh(k.build(),this._sys('places').matBody,'opening-signposts');
  }
  _room(){
    const k=new Kit(),y=this.padY,a=this.api;
    const glassMat=new THREE.MeshBasicMaterial({color:0x44555c,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide});
    this.materials.push(glassMat);const glass=this._mesh(new THREE.PlaneGeometry(2.8,1.3),glassMat,'shelter-window-glass');glass.position.set(-13.6,y+2.05,-3);glass.rotation.y=Math.PI;
    // Framed calendar, pin heads, a pencil on a string, and a coat by the bed.
    for(const x of [-11.89,-10.51])k.box(.035,2.05,.035,x,y+1.73,3.70,WOOD);
    for(const h of [.70,2.76])k.box(1.40,.035,.035,-11.2,y+h,3.70,WOOD);
    for(const x of [-11.76,-10.64])k.cyl(.018,.018,.018,8,x,y+2.65,3.66,IRON,0,Math.PI/2);
    k.cyl(.008,.008,.65,5,-10.41,y+1.01,3.66,PALE);
    k.box(.028,.22,.028,-10.42,y+.59,3.66,[.30,.18,.045],0,0,.1);
    // Rug strips and a low shoe tray never obstruct the doorway-to-bed lane.
    k.box(2.5,.023,2.0,-11.2,y+.042,.1,[.064,.043,.034]);
    for(let i=0;i<9;i++)k.box(2.38,.024,.042,-11.2,y+.048,-.77+i*.21,[.12,.08,.055]);
    k.box(.66,.07,.38,-9,y+.04,-2.25,WOOD);
    k.box(.78,.08,.22,-8.9,y+2.15,3.6,WOOD);
    for(let i=0;i<4;i++)k.cyl(.025,.025,.13,6,-9.17+i*.18,y+2.08,3.49,IRON,0,Math.PI/2);
    k.box(.50,.9,.18,-8.95,y+1.55,3.47,[.054,.075,.064]);
    k.box(.19,.67,.14,-9.27,y+1.56,3.47,[.054,.075,.064],0,0,-.18);
    k.box(.19,.67,.14,-8.63,y+1.56,3.47,[.054,.075,.064],0,0,.18);
    // A practical washstand, with basin, mirror and towel, against the east wall.
    box(k,a,.68,.79,1.15,-6.2,y+.4,.0,WOOD);
    k.tube(.28,.19,.13,18,-6.2,y+.86,0,PALE);
    k.cyl(.22,.22,.015,16,-6.2,y+.80,0,IRON);
    k.box(.03,.34,.70,-5.89,y+1.29,0,[.11,.145,.14]);
    k.box(.20,.56,.04,-6.5,y+.67,-.43,[.16,.14,.10]);
    const g=k.build();projectPlaceSurfaceUVs(g,2.5);this._mesh(g,this._sys('places').matBody,'opening-room-details');
  }
  _lanterns(){
    const k=new Kit(),g=new Kit();
    this.lamps=[{x:8,z:-10,y:this.padY+1.4},{x:24,z:-25,y:this.api.heightAt(this.api.wx(24,-25),this.api.wz(24,-25))+1.4},
      {x:25,z:3,y:this.padY+1.4},{x:16,z:-17,y:this.padY+17.2}];
    for(const p of this.lamps){
      const base=p.y-this.api.heightAt(this.api.wx(p.x,p.z),this.api.wz(p.x,p.z));
      if(base<3)k.box(.11,base,.11,p.x,p.y-base/2,p.z,IRON);
      k.box(.23,.05,.23,p.x,p.y-.18,p.z,IRON);k.cone(.21,.17,8,p.x,p.y+.22,p.z,IRON);
      for(const dx of [-.11,.11])for(const dz of [-.11,.11])k.box(.025,.36,.025,p.x+dx,p.y,p.z+dz,IRON);
      g.cyl(.07,.07,.24,8,p.x,p.y,p.z,[1,.57,.20]);
    }
    this._mesh(k.build(),this._sys('places').matBody,'opening-lamp-housings');
    this.lampMat=this._sys('places').matGlow.clone();this.materials.push(this.lampMat);
    this.lampMesh=this._mesh(g.build(),this.lampMat,'opening-lamp-cores');
  }
  _weather(){
    const rng=this.ctx.rng.fork('opening-rain');this.rainDrops=[];
    for(let i=0;i<360;i++){
      const x=rng.range(-44,44),z=rng.range(-40,40);
      if((x>-29&&x<7&&z>-5.5&&z<6)||(Math.abs(x-16)<4.9&&Math.abs(z+17)<4.9)||(Math.abs(x-2)<2.4&&Math.abs(z+20)<2))continue;
      this.rainDrops.push({x,z,y:this.api.heightAt(this.api.wx(x,z),this.api.wz(x,z)),phase:rng.next()*11});
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(this.rainDrops.length*18),3));
    this.rainMat=new THREE.MeshBasicMaterial({color:0x718c99,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
    this.rain=new THREE.Mesh(geo,this.rainMat);this.rain.name='opening-night-rain';this.rain.frustumCulled=false;this.root.add(this.rain);this.geometries.push(geo);this.materials.push(this.rainMat);
    // Thin wet streaks on the room's exterior are visible through the open door.
    const k=new Kit();for(let i=0;i<7;i++){
      const x=27+i*.8,z=-29+(i%3),y=this.padY+13+(i%2)*1.1;
      beam(k,[x-.23,y+.08,z],[x,y,z],.045,[.013,.018,.023]);beam(k,[x,y,z],[x+.23,y+.08,z],.045,[.013,.018,.023]);
    }
    this.birds=this._mesh(k.build(),this._sys('places').matBody,'opening-birds');this.birds.visible=false;this.birdT=-1;
  }
  _cue(kind,x,y,z,gain){const voice=this._sys('audio')?.dread(kind,this.api.wx(x,z),y,this.api.wz(x,z),gain);this.cues.push({kind,t:+this.elapsed.toFixed(2),voice:!!voice});}
  _night(){if(this.nightT>=0)return;this.nightT=0;this._sys('progress').flag('opening:night',1);}
  step(dt){
    if(!this.ctx.playing||this.ctx.paused)return;this.elapsed+=dt;
    const p=this._sys('player'),r=this._sys('refuge'),clock=this._sys('clock');
    const near=Math.hypot(p.pos.x-O.x,p.pos.z-O.z)<100;
    this.root.visible=near||Math.hypot(p.pos.x-O.x,p.pos.z-O.z)<380;
    if(near&&clock.phase==='dusk'&&clock.phaseT>.68&&!this.warned){
      this.warned=true;this.birdT=0;this._cue('tell',27,this.padY+12,-28,.58);
    }
    if(this.pendingWake&&!r.resting){this.pendingWake=false;this._night();this.woke=true;}
    if(this.nightT>=0){
      const before=this.nightT;this.nightT+=dt;
      if(near){
        for(const [t,kind,x,z,gain] of [[.25,'canopy-rush',30,-28,.52],[2.6,'call',-28,-35,.68],[6.8,'branch',29,-10,.56]])
          if(before<=t&&this.nightT>t)this._cue(kind,x,this.padY+3,z,gain);
      }
    }
    const powered=r.powerK||0;
    this.lampMat.color.setRGB(.12+.88*powered,.12+.88*powered,.12+.88*powered);
    // Existing rover pool only. Interior's powered bed remains the brightest refuge.
    const lights=this._sys('lights');
    if(near&&powered>.02){
      if(!this.lampHandle)this.lampHandle=lights.borrow('opening-path',p.pos.x,this.padY+1,p.pos.z,0xe5ae65,.001,0);
      let best=this.lamps[0],d=Infinity;for(const q of this.lamps.slice(0,3)){const v=Math.hypot(p.pos.x-this.api.wx(q.x,q.z),p.pos.z-this.api.wz(q.x,q.z));if(v<d){d=v;best=q;}}
      if(this.lampHandle){Object.assign(this.lampHandle,{x:this.api.wx(best.x,best.z),y:best.y,z:this.api.wz(best.x,best.z),peak:5.0*powered,decay:1.5});}
    }else if(this.lampHandle){lights.release(this.lampHandle);this.lampHandle=null;}
    if(this.birdT>=0)this.birdT+=dt;
    this.rainLevel=clock.phase==='dusk'?Math.max(0,(clock.phaseT-.68)/.32):clock.phase==='dawn'?.4:1;
  }
  present(){
    if(!this.root.visible)return;
    this.rainMat.opacity=.14*(this.rainLevel||0);
    const p=this.rain.geometry.attributes.position,t=this.elapsed;
    this.rainDrops.forEach((r,i)=>{const h=((r.phase-t*7.5)%11+11)%11,x=r.x+(11-h)*.18,z=r.z+(11-h)*.09,y=r.y+h;
      p.setXYZ(i*6,x-.009,y,z);p.setXYZ(i*6+1,x+.009,y,z);p.setXYZ(i*6+2,x+.089,y-.55,z+.03);
      p.setXYZ(i*6+3,x-.009,y,z);p.setXYZ(i*6+4,x+.089,y-.55,z+.03);p.setXYZ(i*6+5,x+.071,y-.55,z+.03);
    });p.needsUpdate=true;
    this.birds.visible=this.birdT>=0&&this.birdT<9;
    if(this.birds.visible){this.birds.position.set(-this.birdT*2.5,this.birdT*1.8,-this.birdT*3);this.birds.rotation.z=Math.sin(this.birdT*8)*.01;}
  }
  state(){return{trees:this.trees.length,tower:O.tower,car:O.departure,signs:this.signs,night:this.nightT>=0,woke:!!this.woke,cues:this.cues,calendar:this.calendar?.name};}
  ready(){return !!this.calendar&&this.trees.length>=12;}
  dispose(){this.off?.forEach(f=>f());this.root.removeFromParent();this._sys('collision').removeChunk('station-opening');if(this.lampHandle)this._sys('lights').release(this.lampHandle);this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());}
}
