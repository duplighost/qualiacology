// Cash turns a dead lantern crown into a persistent island of warm forest.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MAJORS } from './placedata.js';
import { heightAt } from './terrain.js';
import { Kit } from './sites.js';

const TAU = Math.PI * 2, RADIUS = 96, HOLD = 1.15;
const IRON = [.042,.050,.049], BRONZE = [.24,.15,.063], STONE = [.19,.17,.135];

function lanternCrown(s, bodyMat) {
  const root = new THREE.Group(); root.name = 'woodland-sanctuary-' + s.id;
  root.position.set(s.x, s.y, s.z);
  const k = new Kit(), lit = new Kit();
  const rod = (a, b, r, color) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), d = to.clone().sub(from);
    const g = new THREE.CylinderGeometry(r*.76, r, d.length(), 10);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));
    g.translate(...from.add(to).multiplyScalar(.5).toArray());
    const cols = new Float32Array(g.attributes.position.count*3);
    for (let i=0;i<cols.length;i+=3) cols.set(color,i);
    g.setAttribute('color',new THREE.BufferAttribute(cols,3));
    rods.push(g);
  };
  const rods = [];
  k.cyl(1.25,1.42,.30,24,0,.08,0,STONE);
  k.cyl(.75,1.08,.65,24,0,.55,0,STONE);
  k.cyl(.34,.58,9.8,16,0,5.7,0,IRON);
  for (let y=1.5;y<10.5;y+=.78) k.cyl(.375,.375,.09,16,0,y,0,BRONZE);
  // Six curved iron ribs carry hanging lanterns: a recognisable crown above the trees.
  for (let i=0;i<6;i++) {
    const a=i*TAU/6, ux=Math.cos(a), uz=Math.sin(a);
    const points=[[0,8.4,0],[ux*.75,10.1,uz*.75],[ux*2.35,11.4,uz*2.35],[ux*3.8,10.8,uz*3.8],[ux*4.35,9.5,uz*4.35]];
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const samples=curve.getPoints(10);
    for(let j=1;j<samples.length;j++) rod(samples[j-1].toArray(),samples[j].toArray(),.105,IRON);
    const x=ux*4.35,z=uz*4.35;
    rod([x,9.5,z],[x,7.8,z],.025,BRONZE);
    k.cyl(.6,.43,.22,16,x,7.65,z,BRONZE);
    k.cyl(.46,.62,.18,16,x,6.32,z,IRON);
    for(let j=0;j<6;j++){
      const b=j*TAU/6;rod([x+Math.cos(b)*.43,6.35,z+Math.sin(b)*.43],[x+Math.cos(b)*.43,7.63,z+Math.sin(b)*.43],.024,IRON);
    }
    lit.cyl(.32,.38,1.18,12,x,7.0,z,[2.3,1.35,.46]);
    rod([ux*.45,.4,uz*.45],[ux*1.2,1.35,uz*1.2],.16,IRON);
  }
  // The payment handle is at hand height, with a broad brass switch and coin slot.
  k.box(.90,1.16,.30,0,1.22,1.12,IRON);
  k.box(.70,.92,.05,0,1.22,1.29,[.10,.11,.10]);
  k.box(.30,.045,.035,0,1.55,1.33,[.004,.005,.006]);
  k.box(.18,.33,.11,0,1.19,1.36,BRONZE);
  k.box(.56,.12,.16,0,1.07,1.47,[.36,.21,.075]);
  const base=k.build();
  const merged=mergeGeometries([base,...rods],false); base.dispose(); rods.forEach(g=>g.dispose());
  const mesh=new THREE.Mesh(merged,bodyMat);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  const mat=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
  mat.name='sanctuary-lantern-glow';
  const glow=new THREE.Mesh(lit.build(),mat);root.add(glow);
  const beamMat=new THREE.MeshBasicMaterial({color:0xffc77b,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.7,7.5,12,32,1,true),beamMat);
  beam.position.y=6.8;root.add(beam);
  // Amber ground illumination follows the terrain, avoiding a glowing disc through hills.
  const gp=[],gc=[],gi=[], rings=12, seg=64;
  for(let j=0;j<=rings;j++) for(let i=0;i<=seg;i++) {
    const a=i/seg*TAU,r=j/rings*RADIUS;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    gp.push(x,heightAt(s.x+x,s.z+z)-s.y+.055,z);
    const f=Math.pow(1-j/rings,2)*.065;gc.push(f,f*.63,f*.26);
    if(j<rings&&i<seg){const q=j*(seg+1)+i;gi.push(q,q+seg+1,q+1,q+1,q+seg+1,q+seg+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(gc,3));geo.setIndex(gi);
  const groundMat=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const ground=new THREE.Mesh(geo,groundMat);root.add(ground);
  // Light motes belong to this reclaimed patch, not to the hostile forest beyond it.
  const pp=[];for(let i=0;i<160;i++){const a=i*2.399963,r=9+Math.sqrt(i/160)*65,x=Math.cos(a)*r,z=Math.sin(a)*r;pp.push(x,heightAt(s.x+x,s.z+z)-s.y+.8+(i%11)*.24,z);}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));
  const pm=new THREE.PointsMaterial({color:0xffd191,size:.065,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const motes=new THREE.Points(pg,pm);root.add(motes);
  return {root,mesh,mat,beamMat,groundMat,pm,motes};
}

export class Sanctuaries {
  static id='sanctuaries';
  constructor(ctx) { this.ctx=ctx;this.sites=[];this.hold=0;this.target=null;this.release=false;this.loaded=false;this.clock=0;this.handles=[];this.safe=[]; }
  _sys(id){return this.ctx.systems.get(id);}
  _plan(){
    if(this.sites.length)return;
    const roads=this._sys('roads'),terrain=this._sys('terrain'),wilds=this._sys('wilds');
    if(!roads||!terrain)return;
    const rng=this.ctx.rng.fork('woodland-sanctuaries');
    for(const d of MAJORS){
      for(let attempt=0;attempt<90;attempt++){
        const a=rng.next()*TAU,dist=135+rng.next()*140;
        const x=d.x+Math.cos(a)*dist,z=d.z+Math.sin(a)*dist;
        const road=roads.nearestRoadInfo(x,z,180),rd=roads.roadDistance(x,z);
        if(!road?.hit||rd<28||rd>100||terrain.slopeAt(x,z)>.20||heightAt(x,z)<5)continue;
        if(MAJORS.some(m=>Math.hypot(x-m.x,z-m.z)<115))continue;
        if(this.sites.some(m=>Math.hypot(x-m.x,z-m.z)<450)||wilds?.padClear(x,z))continue;
        this.sites.push({id:d.id,x,z,y:heightAt(x,z),roadX:road.x,roadZ:road.z,r:RADIUS,on:false,found:false,k:0,price:this.sites.length===0?120:200,art:null});break;
      }
    }
  }
  clearsTrees(x,z){
    this._plan();
    for(const s of this.sites){
      const dx=x-s.x,dz=z-s.z;if(dx*dx+dz*dz<81)return true;
      const ax=s.roadX-s.x,az=s.roadZ-s.z,den=ax*ax+az*az;
      const t=Math.max(0,Math.min(1,(dx*ax+dz*az)/(den||1)));
      if((dx-ax*t)**2+(dz-az*t)**2<5.8)return true;
    }
    return false;
  }
  async init(){
    this._plan();this.ctx.shared.sanctuaryZones=this.sites;
    this.group=new THREE.Group();this.group.name='woodland-sanctuaries';this.ctx.scene.add(this.group);
    this.bodyMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:.6});
    this.bodyMat.name='sanctuary-aged-metal';
    for(const s of this.sites){s.art=lanternCrown(s,this.bodyMat);this.group.add(s.art.root);
      this._sys('collision').addCollider({kind:'circle',x:s.x,z:s.z,r:1.35,y0:s.y-.4,y1:s.y+2,tag:'stone'},'sanctuary:'+s.id);
    }
    this.off=this.ctx.bus.on('save:loaded',()=>{this.loaded=false;});
  }
  ready(){return this.sites.length>0;}
  _restore(){const pr=this._sys('progress');for(const s of this.sites){s.on=!!pr.flag('sanctuary:'+s.id);s.found=s.on||!!pr.flag('sanctuary-found:'+s.id);s.k=s.on?1:0;}this.loaded=true;}
  light(id){
    const s=this.sites.find(q=>q.id===id),pr=this._sys('progress');
    if(!s||s.on||!pr.spendCash(s.price,'woodland-sanctuary'))return false;
    s.on=s.found=true;pr.flag('sanctuary:'+s.id,true);pr.flag('sanctuary-found:'+s.id,true);
    this.ctx.bus.emit('sanctuary:lit',{id:s.id,x:s.x,y:s.y,z:s.z,r:s.r});
    this._sys('audio')?.whisper?.('claim','',s.x,s.y+5,s.z);
    return true;
  }
  step(dt){
    if(!this.ctx.ready)return;if(!this.loaded)this._restore();this.clock+=dt;
    const p=this._sys('player'),pr=this._sys('progress');if(!p?.pos)return;
    const use=this.ctx.input.held('use');if(!use)this.release=false;
    let target=null,nearest=null,nearD=Infinity;
    for(const s of this.sites){
      const dx=s.x-p.pos.x,dz=s.z+1.45-p.pos.z,dist=Math.hypot(dx,dz);
      if(dist<80&&!s.found){s.found=true;pr.flag('sanctuary-found:'+s.id,true);this.ctx.bus.emit('sanctuary:found',{id:s.id});}
      s.k=Math.min(1,Math.max(0,s.k+(s.on?dt*.35:0)));
      if(s.on&&dist<nearD){nearD=dist;nearest=s;}
      s.art.root.visible=dist<560;
      if(s.art.root.visible){s.art.mat.opacity=s.k*.75;s.art.beamMat.opacity=s.k*.008;s.art.groundMat.opacity=s.k;s.art.pm.opacity=s.k*(.45+Math.sin(this.clock*.65)*.1);s.art.motes.position.y=Math.sin(this.clock*.5)*.13;}
      const cam=this._sys('camera'),dot=(-Math.sin(cam.yaw)*dx-Math.cos(cam.yaw)*dz)/(dist||1);
      if(dist<3.1&&Math.abs(p.pos.y-s.y)<1.7&&dot>.45&&!this.ctx.shared.inCar)target=s;
    }
    // Publish the same circles to both placement and pursuit. Every entry remains stable.
    this.safe.length=0;this.safe.push(...(this.ctx.shared.litPoles||[]),...this.sites,...(this.ctx.shared.territoryZones||[]));this.ctx.shared.safeLightZones=this.safe;
    this.ctx.shared.sanctuary=nearest&&nearD<nearest.r?nearest.id:'';
    if(target!==this.target){this.target=target;this.hold=0;}
    if(target){const s=target,can=pr.cash()>=s.price;
      this.ctx.bus.emit('prompt',{kind:'hold',label:'E',rank:5,x:s.x,y:s.y+1.25,z:s.z+1.5,k:this.hold/HOLD,
        detail:s.on?'THE WOODS ARE LIT':'LIGHT THE WOODS · '+s.price+' COINS',
        subdetail:s.on?'96 M OF QUIET':can?'A PERMANENT CIRCLE OF LIGHT':'YOU HAVE '+pr.cash()+' · NEED '+(s.price-pr.cash()),unavailable:s.on||!can});
      if(use&&!this.release&&can&&!s.on){this.hold+=dt;if(this.hold>=HOLD){this.light(s.id);this.release=true;this.hold=0;}}else this.hold=0;
    }else this.hold=0;
    const lights=this._sys('lights');
    if(nearest&&nearD<125){
      for(let i=0;i<3;i++){
        const a=i*TAU/3,px=nearest.x+Math.cos(a)*9,pz=nearest.z+Math.sin(a)*9;
        let h=this.handles[i];if(!h?.inUse){h=lights.borrow('sanctuary',px,nearest.y+6,pz,0xffc176,24,0);this.handles[i]=h;}
        if(h){h.x=px;h.y=heightAt(px,pz)+5.8;h.z=pz;h.peak=30*nearest.k;h.decay=.82;h.distance=108;}
      }
    }else{for(const h of this.handles)if(h?.inUse)lights.release(h);this.handles.length=0;}
  }
  state(){return {sites:this.sites.map(({art,...s})=>({...s})),holding:this.target?.id||'',hold:this.hold};}
  dispose(){this.off?.();for(const h of this.handles)h?.release?.();for(const s of this.sites){this._sys('collision').removeChunk('sanctuary:'+s.id);s.art.root.traverse(o=>{o.geometry?.dispose();});s.art.mat.dispose();s.art.beamMat.dispose();s.art.groundMat.dispose();s.art.pm.dispose();}this.bodyMat?.dispose();this.group?.removeFromParent();this.ctx.shared.sanctuaryZones=[];this.ctx.shared.safeLightZones=null;}
}
