// Finite encounters: the light in a Candle is usable, and still burns you.
import * as THREE from 'three';
import { MAJOR_BY_ID } from './placedata.js';

const ENCOUNTERS = [
  { id:'candle-chapel', species:'candle', site:'chapel', dx:13, dz:18 },
  { id:'candle-cathedral', species:'candle', site:'cathedral', dx:-18, dz:26 },
  { id:'candle-glass', species:'candle', site:'mourning-glasshouse', dx:18, dz:12 },
  { id:'drowned-fen', species:'drowned', site:'gallowsfen', dx:22, dz:8 },
  { id:'drowned-lamp', species:'drowned', site:'drowned-light', dx:-23, dz:14 },
  { id:'drowned-vault', species:'drowned', site:'choir-vault', dx:-20, dz:25 },
];

export class LoreDead {
  static id='lore-dead';
  constructor(ctx){this.ctx=ctx;this.rows=[];this.ornaments=new Map();this.holes=[];this.time=0;}
  _sys(id){return this.ctx.systems.get(id);}
  async init(){
    for(const d of ENCOUNTERS){const place=MAJOR_BY_ID[d.site];if(place)this.rows.push({...d,x:place.x+d.dx,z:place.z+d.dz,e:null,generation:0});}
    this.off=this.ctx.bus.on('enemy:killed',ev=>{for(const r of this.rows)if(r.e===ev.e&&r.generation===ev.e.gen)this._sys('progress')?.flag('lore-dead:'+r.id,true);});
    this.geo=new THREE.SphereGeometry(1,8,6);
    this.blue=new THREE.MeshBasicMaterial({color:0x739dca,transparent:true,opacity:.75,depthWrite:false});
    this.white=new THREE.MeshStandardMaterial({color:0xafa895,roughness:.54});
    this.vest=new THREE.MeshStandardMaterial({color:0xafab3c,roughness:.47,emissive:0x4a481a,emissiveIntensity:.22});
    this.dark=new THREE.MeshBasicMaterial({color:0x020304});
    this.holeGeo=new THREE.CircleGeometry(1,20);this.holeGeo.rotateX(-Math.PI/2);
  }
  ready(){return this.rows.length>=5;}
  _dress(e){
    if(this.ornaments.has(e))return this.ornaments.get(e);
    const group=new THREE.Group();group.name='lore:'+e.species;e.built.group.add(group);
    const record={group,rover:null,generation:e.gen};
    if(e.species==='candle'){
      for(let i=0;i<3;i++){const flame=new THREE.Mesh(this.geo,this.blue);flame.position.set((i-1)*.12,1.44+i*.09,.02);flame.scale.set(.075,.21,.06);group.add(flame);}
    }else if(e.species==='drowned'){
      const thread=new THREE.CylinderGeometry(.009,.003,.67,5);
      for(let i=0;i<4;i++){const mesh=new THREE.Mesh(thread,this.white);mesh.position.set((i-1.5)*.033,1.34,-.19);mesh.rotation.z=(i-1.5)*.10;group.add(mesh);}
    }else if(e.species==='warden'){
      const band=new THREE.BoxGeometry(.10,.68,.05);
      for(const side of[-1,1]){const mesh=new THREE.Mesh(band,this.vest);mesh.position.set(side*.21,1.55,-.25);group.add(mesh);}
      const helmet=new THREE.Mesh(this.geo,this.vest);helmet.position.set(0,2.39,0);helmet.scale.set(.24,.13,.23);group.add(helmet);
    }
    this.ornaments.set(e,record);return record;
  }
  homeFor(e){
    const col=this._sys('collision'),terr=this._sys('terrain');
    let point=null;
    for(let i=0;i<12;i++){const a=(i-5.5)*.13,x=e.pos.x+Math.cos(a)*15,z=e.pos.z+Math.sin(a)*15;
      if(!col?.canOccupy||col.canOccupy(x,z,.8,1.2)){point={x,z};break;}}
    if(!point)return {x:e.pos.x+15,z:e.pos.z};
    const mesh=new THREE.Mesh(this.holeGeo,this.dark);mesh.position.set(point.x,terr.heightAt(point.x,point.z)+.045,point.z);mesh.scale.set(1.2,1,1.2);mesh.name='hound-road-home';this.ctx.scene.add(mesh);this.holes.push(mesh);
    return point;
  }
  step(dt){
    if(!this.ctx.ready)return;this.time+=dt;
    const p=this._sys('player'),pr=this._sys('progress'),en=this._sys('enemies'),lights=this._sys('lights');
    if(!p?.pos||!pr||!en)return;
    if(!this.ctx.shared.lateBellFinal)for(const r of this.rows){
      if(pr.flag('lore-dead:'+r.id))continue;
      if(r.e?.alive&&r.e.gen===r.generation)continue;
      const d=Math.hypot(p.pos.x-r.x,p.pos.z-r.z);
      if(d<24||d>105||this.time<(r.retry||0))continue;
      r.retry=this.time+3;
      const e=en.spawn(r.species,r.x,r.z,{staged:true,awake:false,yaw:-Math.PI/2,placementRadius:7});
      if(e){r.e=e;r.generation=e.gen;}
    }
    for(const e of en.all){
      if(!['candle','drowned','warden'].includes(e.species))continue;
      const old=this.ornaments.get(e);
      if(!e.alive){if(old?.rover){lights.release(old.rover);old.rover=null;}continue;}
      const rec=this._dress(e),d=Math.hypot(e.pos.x-p.pos.x,e.pos.z-p.pos.z);
      if(e.species!=='candle')continue;
      rec.group.visible=!e.goingHome||!this.ctx.shared.trueDawn;
      rec.group.scale.y=1+Math.sin(this.time*8+e.id)*.08;
      if(d<24&&!e.goingHome){
        if(!rec.rover?.inUse)rec.rover=lights.borrow('candle:'+e.id,e.pos.x,e.pos.y+1.4,e.pos.z,0x83baff,3.4,0);
        if(rec.rover){rec.rover.x=e.pos.x;rec.rover.y=e.pos.y+1.4;rec.rover.z=e.pos.z;rec.rover.distance=6;}
        if(d<2.8&&!p.dead&&pr.save.data.unbanked>0&&this._sys('collision')?.segmentClear(p.pos.x,p.pos.y+1,p.pos.z,e.pos.x,e.pos.y+1.4,e.pos.z))pr.bank('candle');
      }else if(rec.rover){lights.release(rec.rover);rec.rover=null;}
    }
    for(const hole of this.holes)hole.visible=Math.hypot(hole.position.x-p.pos.x,hole.position.z-p.pos.z)<140;
  }
  state(){return {encounters:this.rows.map(r=>({id:r.id,species:r.species,x:r.x,z:r.z,alive:!!r.e?.alive,cleared:!!this._sys('progress')?.flag('lore-dead:'+r.id)})),holes:this.holes.length};}
  dispose(){this.off?.();for(const r of this.ornaments.values()){if(r.rover)this._sys('lights')?.release(r.rover);r.group.removeFromParent();r.group.traverse(o=>{if(o.geometry&&o.geometry!==this.geo)o.geometry.dispose();});}this.holes.forEach(m=>m.removeFromParent());for(const x of[this.geo,this.holeGeo,this.blue,this.white,this.vest,this.dark])x?.dispose();}
}
