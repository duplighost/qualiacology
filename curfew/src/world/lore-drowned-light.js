import * as THREE from 'three';
import { Kit, GLOW, PANE_LAMP } from './sites.js';
import {boatLanternPositions,reservoirGeometry} from './lore-reservoir.js';
import {sharedIceMaterial,disposeSharedIceMaterial} from './ice-surface.js';
// The reservoir inlet is frozen (frozen-water.js registers it at RESERVOIR_Y; movers stand
// on terrain.surfaceAt). Two meshes on ONE clipped geometry whose positions stay at
// RESERVOIR_Y (tests/lore-reservoir.mjs rays them): the water sheet's MESH drops 0.30 m so
// the dark water shows through the translucent middle of the ice, and the ice mesh rises
// 0.03 m so feet at 1.5 sit on the drawn ice rather than in it.
const WATER_UNDER_ICE=-0.30;
const ICE_ABOVE_LEVEL=0.03;
// Ingrid's signal appears once, when a living hand restores the lighthouse.
export class DrownedLightMemory {
 constructor(ctx){this.ctx=ctx;this.time=-1;this.points=[];this.off=ctx.bus.on('place:claimed',e=>{if(e.id==='drowned-light'&&!this.pr()?.flag('story:nine-boats')){this.time=0;this.pr()?.flag('story:nine-boats-pending',true);}});this.buildReservoir();}
 pr(){return this.ctx.systems.get('progress');}
 buildReservoir(){
  const material=this.ctx.systems.get('wilds')?.matWater;if(!material)return;
  const geometry=reservoirGeometry();
  this.water=new THREE.Mesh(geometry,material);this.water.name='drowned-light-reservoir';this.water.userData.waterSurface=true;this.water.position.y=WATER_UNDER_ICE;this.ctx.scene.add(this.water);
  // Built here, at world-stories init, so the one new program is in the scene for main's
  // warm-up compile; the material is shared with any pool the wilds freeze later.
  this.iceMaterial=sharedIceMaterial(this.ctx);
  this.ice=new THREE.Mesh(geometry,this.iceMaterial);this.ice.name='drowned-light-ice';this.ice.userData.iceSurface=true;this.ice.position.y=ICE_ABOVE_LEVEL;this.ice.renderOrder=3;this.ctx.scene.add(this.ice);
 }
 step(dt){
  // The sheet takes the county's lying snow and rain from the weather system every step
  // (two floats into one uniform; the weather fans out to chunks and places the same way).
  const wu=this.iceMaterial?.uniforms?.uWeather;if(wu){const w=this.ctx.systems.get('weather');if(w)wu.value.set(w.snow||0,w.wet||0);}
  if(!this.ctx.playing||this.ctx.paused)return;
  if(this.time<0&&this.pr()?.flag('story:nine-boats-pending')&&!this.pr()?.flag('story:nine-boats')){const p=this.ctx.systems.get('player')?.pos;if(p&&Math.hypot(p.x+1380.3,p.z+208.1)<70)this.time=0;}
  if(this.time<0)return;
  if(!this.group)this.build();this.time+=dt;
  // Hold all nine long enough to count; then the same loss Ingrid logged, one by one.
  for(let i=0;i<this.points.length;i++){const m=this.points[i];m.material.opacity=Math.max(0,Math.min(1,(this.time-1)*.8))*Math.max(0,Math.min(1,11+i*1.7-this.time));m.visible=m.material.opacity>0;}
  if(this.time>27){this.pr()?.flag('story:nine-boats',true);this.pr()?.flag('story:nine-boats-pending',false);this.pr()?.save.flush();this.time=-1;this.clear();}
 }
 build(){
  this.group=new THREE.Group();this.group.name='ingrids-nine-lanterns';this.ctx.scene.add(this.group);
  const places=this.ctx.systems.get('places');
  // Nine lanterns 0.6 m over the level: they stand out on the ice now, and need no hole in it.
  const positions=boatLanternPositions();for(let i=0;i<positions.length;i++){
   const {x,y,z}=positions[i],k=new Kit();
   k.pane(1.5,1.5,0,0,0,PANE_LAMP,0,0,2,2);k.pane(1.5,1.5,0,0,0,PANE_LAMP,Math.PI/2,0,2,2);
   const mat=places.matGlow.clone();mat.color.set(GLOW.lamp);mat.opacity=0;
   const m=new THREE.Mesh(k.build(),mat);m.position.set(x,y,z);m.renderOrder=4;m.name='boat-lantern-'+(i+1);this.group.add(m);this.points.push(m);
  }
 }
 clear(){for(const p of this.points){p.geometry.dispose();p.material.dispose();}this.points=[];this.group?.removeFromParent();this.group=null;}
 state(){return{active:this.time>=0,visible:this.points.filter(p=>p.visible).length,seen:!!this.pr()?.flag('story:nine-boats')};}
 dispose(){this.off?.();this.clear();this.water?.geometry.dispose();this.water?.removeFromParent();this.ice?.removeFromParent();this.water=null;this.ice=null;if(this.iceMaterial){this.iceMaterial=null;disposeSharedIceMaterial();}}
}
