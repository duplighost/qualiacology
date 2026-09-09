import * as THREE from 'three';
import {Kit} from './sites.js';
import {MAJORS} from './placedata.js';
import {skeleton} from './remains.js';
import {OPENING} from './opening-layout.js';

const WOOD=[.13,.085,.046],METAL=[.20,.135,.055],SOIL=[.065,.034,.019];
const _from=new THREE.Vector3(),_dir=new THREE.Vector3(),_up=new THREE.Vector3(0,1,0);

export class Scavenging {
  static id='scavenging';
  constructor(ctx){this.ctx=ctx;this.sites=[];this.root=new THREE.Group();this.root.name='buried-supplies';this.time=0;this.hold=0;this.target=null;this.release=false;}
  _sys(id){return this.ctx.systems.get(id);}
  init(){
    this.ctx.scene.add(this.root);this.mat=this._sys('wilds').matBody;
    const wood=new Kit(),lid=new Kit(),inside=new Kit(),earth=new Kit();
    // An actual hollow chest, with iron bands, a brass latch and things under its lid.
    wood.box(1.10,.12,.76,0,.07,0,WOOD);
    for(const z of [-.36,.36])wood.box(1.10,.56,.09,0,.34,z,WOOD);
    for(const x of [-.51,.51])wood.box(.09,.56,.70,x,.34,0,WOOD);
    for(const x of [-.34,.34])for(const z of [-.415,.415])wood.box(.075,.54,.035,x,.34,z,METAL);
    wood.box(.14,.19,.065,0,.40,-.42,METAL);
    lid.box(1.16,.10,.84,0,0,-.40,WOOD);
    for(const x of [-.34,.34])lid.box(.075,.02,.86,x,.06,-.40,METAL);
    inside.box(.58,.15,.35,-.13,.24,.03,[.10,.14,.14]);
    for(let i=0;i<6;i++)inside.cyl(.040,.040,.09,8,.15+i%3*.10,.22+Math.floor(i/3)*.025,-.18,METAL);
    const soil=new THREE.CylinderGeometry(.55,1.05,.14,24,3),v=soil.attributes.position;
    for(let i=0;i<v.count;i++){
      const x=v.getX(i),z=v.getZ(i),a=Math.atan2(z,x),r=Math.hypot(x,z);
      const edge=1+.10*Math.sin(a*5)+.065*Math.cos(a*9);
      v.setXYZ(i,x*edge,v.getY(i)+.07+.018*Math.sin(a*7)*Math.min(1,r),z*edge*.78);
    }
    soil.computeVertexNormals();earth.push(soil,SOIL);
    for(let i=0;i<18;i++){const a=i*2.399,r=.48+(i%4)*.16;
      earth.box(.10,.025,.06,Math.cos(a)*r,.025,Math.sin(a)*r*.78,[.12,.067,.035],a);
    }
    // Pale roots and a broken board distinguish disturbed soil from ordinary ground.
    earth.box(.62,.035,.055,-.13,.165,-.13,[.22,.17,.10],.5);
    earth.box(.31,.025,.04,.23,.15,.14,[.19,.14,.085],-.65);
    this.geos={wood:wood.build(),lid:lid.build(),inside:inside.build(),earth:earth.build()};
    const rng=this.ctx.rng.fork('buried-supplies');
    const add=(id,x,z,kind,bones=false)=>this.sites.push({id:'supply:'+id,x,z,kind,bones,seed:rng.next(),stage:0,node:null});
    for(const m of MAJORS.filter(m=>m.id!==OPENING.id))for(let i=0;i<3;i++){
      const a=(i/3)*Math.PI*2+.48,r=(m.flat?.radius||30)*(i===2?1.22:(.52+i*.10));
      add(m.id+':'+i,m.x+Math.cos(a)*r,m.z+Math.sin(a)*r,i===2?'dig':'crate',i===2);
    }
    const wild=this._sys('wilds');wild.lookouts();
    const station=this._sys('places').nodes.get(OPENING.id),cy=Math.cos(station.yaw),sy=Math.sin(station.yaw);
    for(const q of OPENING.supplies){
      add('opening:'+q.id,OPENING.x+q.x*cy+q.z*sy,OPENING.z-q.x*sy+q.z*cy,q.kind);
      Object.assign(this.sites.at(-1),{authored:true,noAmbush:true,deckY:q.y===undefined?null:station.padY+q.y,cash:q.cash,xp:q.xp});
    }
    for(let i=0;i<wild.sites.length;i++){
      const w=wild.sites[i];if(w.kind==='travel-water')continue;
      const a=rng.next()*Math.PI*2,r=7+rng.next()*5;
      add('wild:'+w.id,w.x+Math.cos(a)*r,w.z+Math.sin(a)*r,i%3===0?'crate':'dig',true);
    }
    // Geometry and its existing surface program take part in normal boot warmup.
    this.warm=new THREE.Mesh(this.geos.wood,this.mat);this.warm.position.y=-10000;this.root.add(this.warm);
    this.off=this.ctx.bus.on('world:broke',p=>{if(p.tag==='supply')for(const s of this.sites)if(s.node&&Math.hypot(s.x-p.x,s.z-p.z)<1.1&&Math.abs(s.y-p.y)<1)this._take(s);});
  }
  ready(){return !!this.geos&&this.sites.length>0;}
  _build(s){
    const col=this._sys('collision'),terr=this._sys('terrain'),pr=this._sys('progress');
    if(!s.placed){
      const ox=s.x,oz=s.z;let found=false;
      for(let i=0;i<(s.authored?1:20);i++){
        const a=i*2.399,r=i===0?0:1+Math.sqrt(i)*1.2,x=ox+Math.cos(a)*r,z=oz+Math.sin(a)*r,y=s.deckY??terr.heightAt(x,z);
        if(this._sys('roads').roadDistance(x,z)<3.4||y<.5||!col.fits(x,z,y+.03,s.authored?.59:.80,s.authored?1.0:1.7))continue;
        if(!s.authored&&(Math.abs(y-terr.heightAt(x+1,z))>.32||Math.abs(y-terr.heightAt(x,z+1))>.32))continue;
        s.x=x;s.y=y+.04;s.z=z;found=true;break;
      }
      if(!found){s.retry=this.time+15;return;}
      s.placed=true;
    }
    s.stage=Number(pr.flag(s.id))||0;
    const root=new THREE.Group();root.position.set(s.x,s.y,s.z);root.name=s.id;
    const chest=new THREE.Group(),body=new THREE.Mesh(this.geos.wood,this.mat),lid=new THREE.Mesh(this.geos.lid,this.mat),contents=new THREE.Mesh(this.geos.inside,this.mat);
    chest.add(body,contents,lid);lid.position.set(0,.65,.40);root.add(chest);
    const earth=new THREE.Mesh(this.geos.earth,this.mat);earth.visible=s.kind==='dig'&&s.stage<3;root.add(earth);
    s.node={root,chest,body,lid,contents,earth,collider:-1,open:0};this.root.add(root);
    if(s.bones){
      const kit=new Kit(),rng=this.ctx.rng.fork(s.id+':bones');
      const api={scatteredBones:true,heightAt:(x,z)=>terr.heightAt(x,z)-s.y,wx:(x,z)=>s.x+x,wz:(x,z)=>s.z+z,
        emit:()=>{},body:(x,z,y)=>this._sys('search').addBody(s.id+':bones',s.x+x,s.y+y,s.z+z)};
      skeleton(kit,api,1.9,-.5,s.seed*6.28,rng);
      s.node.boneGeo=kit.build();root.add(new THREE.Mesh(s.node.boneGeo,this.mat));
    }
    this._appearance(s);
  }
  _appearance(s){
    const n=s.node;if(!n)return;const buried=s.kind==='dig'&&s.stage<3,taken=s.stage>=4;
    n.earth.visible=buried;n.earth.scale.y=Math.max(.12,1-s.stage*.34);
    n.chest.visible=s.stage!==5&&(!buried||s.stage>=2);n.chest.position.y=buried?-.46:0;
    n.contents.visible=!taken;n.lid.rotation.x=taken?-1.92:0;
    if(!buried&&!taken&&n.collider<0)n.collider=this._sys('collision').addCollider({kind:'obb',x:s.x,z:s.z,halfX:.56,halfZ:.43,yaw:0,y0:s.y-.05,y1:s.y+.70,tag:'supply',breakable:22,standable:true},s.id);
  }
  _take(s){
    if(s.stage>=4||!s.node||s.kind==='dig'&&s.stage<3)return;
    s.stage=4;this._sys('progress').flag(s.id,4);
    this._sys('collision').removeChunk(s.id);s.node.collider=-1;
    this._sys('fx')?.clearDecalsNear(s.x,s.y+.35,s.z,1.25);
    this._sys('progress').payCash(s.cash??(4+Math.floor(s.seed*6)),s.x,s.y+.4,s.z,'supplies');
    this._sys('progress').award(s.xp??18,s.x,s.y+.4,s.z,'supplies');
    this.ctx.bus.emit('pickup:ammo',{n:4+Math.floor(s.seed*5)});
    this._sys('audio')?.dread('branch',s.x,s.y+.3,s.z,.40);
    this._appearance(s);
  }
  strike(origin,dir,range){
    if(dir.y>=-.12)return false;let best=null,near=range;
    for(const s of this.sites){if(!s.node||s.kind!=='dig'||s.stage>=3)continue;
      const t=(s.y+.18-origin.y)/dir.y;if(t<0||t>near)continue;
      const x=origin.x+dir.x*t,z=origin.z+dir.z*t;
      if(Math.hypot(x-s.x,z-s.z)<1.05){best=s;near=t;}}
    if(!best)return false;const s=best;s.stage++;this._sys('progress').flag(s.id,s.stage);
    _from.set(s.x,s.y+.1,s.z);this._sys('fx')?.impact?.('dirt',_from,_up,.65);
    this._sys('audio')?.dread('branch',s.x,s.y+.1,s.z,.38);
    if(s.stage===3&&s.seed<.25&&!s.noAmbush){
      const e=this._sys('enemies').spawn('marrow',s.x,s.z,{feetY:s.y,awake:true,ambush:true,riseS:.95});
      if(e){s.stage=5;this._sys('progress').flag(s.id,5);this._sys('audio')?.dread('canopy-rush',s.x,s.y+.3,s.z,.55);s.node.chest.visible=false;s.ambush=true;}
    }
    this._appearance(s);if(s.ambush)s.node.chest.visible=false;
    this.ctx.bus.emit('dig:struck',{id:s.id,stage:s.stage,ambush:!!s.ambush});return true;
  }
  step(dt){
    if(!this.ctx.playing||this.ctx.paused)return;this.time+=dt;
    const p=this._sys('player'),col=this._sys('collision'),use=this.ctx.input.held('use');if(!use)this.release=false;
    const cam=this._sys('camera');cam.aimDir(_dir);_from.set(p.pos.x,p.eyeY,p.pos.z);
    let target=null,near=3,budget=1;
    for(const s of this.sites){const d=Math.hypot(p.pos.x-s.x,p.pos.z-s.z);
      if(d<85&&!s.node&&budget>0&&(!s.retry||this.time>s.retry)){this._build(s);budget--;}
      if(d>165&&s.node){col.removeChunk(s.id);s.node.root.removeFromParent();s.node.boneGeo?.dispose();s.node=null;}
      if(!s.node)continue;
      if(s.node.collider>=0&&col.massOf(s.node.collider)<0)this._take(s);
      if(s.stage>=4||d>near||Math.abs(p.pos.y-s.y)>1.5)continue;
      const dx=s.x-p.pos.x,dz=s.z-p.pos.z,dot=(dx*_dir.x+dz*_dir.z)/(d||1);
      if(dot<.60||!col.segmentClear(p.pos.x,p.eyeY,p.pos.z,s.x,s.y+.78,s.z))continue;
      target=s;near=d;
    }
    if(target!==this.target){this.target=target;this.hold=0;}
    if(!target)return;
    const dig=target.kind==='dig'&&target.stage<3;
    this.ctx.bus.emit('prompt',{kind:dig?'dig':'hold',label:dig?'V':'E',rank:3,x:target.x,y:target.y+(dig?.3:.6),z:target.z,
      k:dig?target.stage/3:this.hold/.7,detail:dig?'DISTURBED EARTH':'OPEN SUPPLIES',subdetail:dig?'MELEE':''});
    if(!dig&&use&&!this.release){this.hold+=dt;if(this.hold>=.7){this._take(target);this.release=true;this.hold=0;}}
    else this.hold=0;
  }
  state(){return{sites:this.sites.length,digs:this.sites.filter(s=>s.kind==='dig').length,resident:this.sites.filter(s=>s.node).map(s=>({id:s.id,kind:s.kind,x:s.x,y:s.y,z:s.z,stage:s.stage,seed:s.seed}))};}
  dispose(){this.off?.();this.root.removeFromParent();for(const s of this.sites){this._sys('collision').removeChunk(s.id);s.node?.boneGeo?.dispose();}Object.values(this.geos).forEach(g=>g.dispose());}
}
