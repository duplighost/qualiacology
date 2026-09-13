import * as THREE from 'three';
import { Kit, GLOW, PANE_LAMP } from './sites.js';
import {boatLanternPositions,reservoirGeometry} from './lore-reservoir.js';
// Ingrid's signal appears once, when a living hand restores the lighthouse.
export class DrownedLightMemory {
 constructor(ctx){this.ctx=ctx;this.time=-1;this.points=[];this.off=ctx.bus.on('place:claimed',e=>{if(e.id==='drowned-light'&&!this.pr()?.flag('story:nine-boats')){this.time=0;this.pr()?.flag('story:nine-boats-pending',true);}});this.buildReservoir();}
 pr(){return this.ctx.systems.get('progress');}
 buildReservoir(){const material=this.ctx.systems.get('wilds')?.matWater;if(!material)return;this.water=new THREE.Mesh(reservoirGeometry(),material);this.water.name='drowned-light-reservoir';this.water.userData.waterSurface=true;this.ctx.scene.add(this.water);}
 step(dt){
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
  const positions=boatLanternPositions();for(let i=0;i<positions.length;i++){
   const {x,y,z}=positions[i],k=new Kit();
   k.pane(1.5,1.5,0,0,0,PANE_LAMP,0,0,2,2);k.pane(1.5,1.5,0,0,0,PANE_LAMP,Math.PI/2,0,2,2);
   const mat=places.matGlow.clone();mat.color.set(GLOW.lamp);mat.opacity=0;
   const m=new THREE.Mesh(k.build(),mat);m.position.set(x,y,z);m.renderOrder=4;m.name='boat-lantern-'+(i+1);this.group.add(m);this.points.push(m);
  }
 }
 clear(){for(const p of this.points){p.geometry.dispose();p.material.dispose();}this.points=[];this.group?.removeFromParent();this.group=null;}
 state(){return{active:this.time>=0,visible:this.points.filter(p=>p.visible).length,seen:!!this.pr()?.flag('story:nine-boats')};}
 dispose(){this.off?.();this.clear();this.water?.geometry.dispose();this.water?.removeFromParent();}
}
