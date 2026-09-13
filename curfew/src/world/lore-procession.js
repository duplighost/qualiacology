// The road under the seven ribs carries the dead east. This is a passage, not a fight.
import * as THREE from 'three';
import {Kit} from './sites.js';
import {MAJOR_BY_ID} from './placedata.js';

const KEY='story:black-rib-returned', COUNT=7, SPACING=4.7, SPEED=.83;
const PASSAGE=52, EAST_ROAD=26, LENGTH=PASSAGE+EAST_ROAD;
const RUBBLE_Z=[10,-14];
const _point={x:0,z:0,dx:0,dz:0};

// The portals are centred at local x=0, z=-15..15. Travel along that open aisle,
// choosing the end with increasing world x, then turn onto the road due east.
export function processionPoint(distance,frame,out={}) {
  const sy=Math.sin(frame.yaw),cy=Math.cos(frame.yaw),sign=sy<0?-1:1;
  const along=Math.min(PASSAGE,Math.max(0,distance))-PASSAGE/2;
  const localZ=sign*along;
  let localX=0,bend=0;
  // The authored rubble includes stones at (0,10) and (0,-14), with no collider.
  // Walk round their visible footprints instead of trusting only the collision map.
  for(const z of RUBBLE_Z){const q=(localZ-z)/3.4;if(Math.abs(q)<1){localX+=1.2*(1+Math.cos(q*Math.PI));bend-=1.2*Math.sin(q*Math.PI)*Math.PI/3.4*sign;}}
  out.x=frame.x+cy*localX+sy*localZ+Math.max(0,distance-PASSAGE);
  out.z=frame.z-sy*localX+cy*localZ;
  out.dx=distance<PASSAGE?sy*sign+cy*bend:1;out.dz=distance<PASSAGE?cy*sign-sy*bend:0;
  return out;
}

export class LoreProcession {
  static id='lore-procession';
  constructor(ctx){this.ctx=ctx;this.rows=[];this.travel=0;this.finalTravel=null;this.done=false;this.saveT=0;this.loaded=false;}
  _sys(id){return this.ctx.systems.get(id);}
  async init(){
    const places=this._sys('places'),d=MAJOR_BY_ID['black-rib'],rec=places.nodes.get(d.id);
    this.frame={x:d.x,z:d.z,yaw:rec.yaw,padY:rec.padY};
    this.root=new THREE.Group();this.root.name='black-rib-procession';this.root.visible=false;this.ctx.scene.add(this.root);
    const k=new Kit(),cloth=[.22,.235,.22],skin=[.41,.40,.34],shoe=[.082,.073,.06];
    const torso=new THREE.SphereGeometry(1,10,7);torso.scale(.28,.45,.18);k.at(torso,cloth,0,1.22,0);
    k.box(.48,.47,.30,0,.87,.01,cloth);
    const head=new THREE.SphereGeometry(1,10,8);head.scale(.15,.19,.145);k.at(head,skin,0,1.85,-.075,0,.13);
    k.box(.12,.12,.13,0,1.64,0,skin);
    // Both hands rest together at the chest; these people have stopped reaching.
    for(const side of[-1,1]){
      k.cyl(.073,.065,.52,8,side*.245,1.15,-.025,cloth,0,side*.14,side*.07);
      k.at(new THREE.SphereGeometry(.065,8,6),skin,side*.07,1.03,-.22);
      k.box(.22,.09,.13,side*.13,1.03,-.18,cloth,0,0,side*.10);
    }
    this.bodyGeo=k.build();
    const leg=new Kit();leg.cyl(.085,.07,.58,8,0,-.28,0,cloth);leg.box(.16,.11,.28,0,-.585,-.075,shoe);this.legGeo=leg.build();
    for(let i=0;i<COUNT;i++){
      const group=new THREE.Group();group.name='procession-mourner:'+i;this.root.add(group);
      const body=new THREE.Mesh(this.bodyGeo,places.matPeople);group.add(body);
      const legs=[];for(const side of[-1,1]){const m=new THREE.Mesh(this.legGeo,places.matPeople);m.position.set(side*.105,.65,0);group.add(m);legs.push(m);}
      group.scale.set(1+(i%3-1)*.07,1+(i%4-1.5)*.035,1);
      this.rows.push({group,body,legs,distance:i*SPACING,prev:new THREE.Vector3(),pos:new THREE.Vector3(),yaw:0,walk:0});
    }
    this.off=this.ctx.bus.on('save:loaded',()=>{this.loaded=false;});this._load();
  }
  _load(){
    const pr=this._sys('progress');if(!pr?.save?.data)return;
    const s=pr.flag(KEY);this.done=!!s?.done;this.finalTravel=Number.isFinite(s?.travel)?Math.max(0,s.travel):null;
    this.loaded=true;
  }
  _save(){this._sys('progress')?.flag(KEY,{travel:this.finalTravel,done:this.done});}
  step(dt){
    if(!this.ctx.ready||!this.ctx.playing||this.ctx.paused)return;
    if(!this.loaded)this._load();
    const p=this._sys('player')?.pos;if(!p)return;
    const final=!!(this.ctx.shared.lateBellFinal||this.ctx.shared.morningReturned);
    const near=Math.hypot(p.x-this.frame.x,p.z-this.frame.z)<190;
    if(final&&near&&this.finalTravel===null){this.finalTravel=this.travel%LENGTH;this._save();}
    if(this.done||(!final&&this.ctx.shared.phase!=='black')){this.root.visible=false;return;}
    if(final&&this.finalTravel===null){this.root.visible=false;return;}
    if(final){this.finalTravel+=dt*SPEED;this.saveT+=dt;if(this.finalTravel>LENGTH){this.done=true;this._save();this.root.visible=false;return;}if(this.saveT>=5){this.saveT=0;this._save();}}
    else if(near)this.travel+=dt*SPEED;
    this.root.visible=near;if(!near)return;
    const terrain=this._sys('terrain'),col=this._sys('collision');
    for(let i=0;i<this.rows.length;i++){
      const r=this.rows[i],s=(final?this.finalTravel:this.travel)+i*SPACING;
      const lastDistance=r.distance;
      r.distance=final?s:s%LENGTH;r.group.visible=r.distance<LENGTH;
      if(!r.group.visible)continue;
      processionPoint(r.distance,this.frame,_point);
      const y=terrain.heightAt(_point.x,_point.z);
      // The central passage is open; a streamed obstruction must never be walked through.
      if(col?.fits&&!col.fits(_point.x,_point.z,y+.025,.28,2.15)){r.group.visible=false;continue;}
      const sink=Math.max(Math.max(0,1-r.distance/3),Math.max(0,(r.distance-(LENGTH-5))/5))*2.3;
      r.prev.copy(r.pos);r.pos.set(_point.x,y-sink,_point.z);
      if(!r.placed||r.distance<lastDistance){r.prev.copy(r.pos);r.placed=true;}
      r.yaw=Math.atan2(-_point.dx,-_point.dz);r.walk=r.distance*3.3;
    }
  }
  present(alpha=1){
    if(!this.root.visible)return;
    for(const r of this.rows){if(!r.group.visible)continue;r.group.position.lerpVectors(r.prev,r.pos,alpha);r.group.rotation.y=r.yaw;
      r.body.position.y=Math.abs(Math.sin(r.walk))*.012;
      r.legs[0].rotation.x=Math.sin(r.walk)*.12;r.legs[1].rotation.x=-Math.sin(r.walk)*.12;
    }
  }
  state(){return{visible:this.root.visible,departed:this.done,finalTravel:this.finalTravel,frame:this.frame,
    figures:this.rows.filter(r=>this.root.visible&&r.group.visible).map(r=>({x:r.pos.x,y:r.pos.y,z:r.pos.z,distance:r.distance}))};}
  ready(){return this.rows.length===COUNT;}
  dispose(){if(this.finalTravel!==null)this._save();this.off?.();this.root.removeFromParent();this.bodyGeo.dispose();this.legGeo.dispose();}
}
