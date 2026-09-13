// The actual connected low-ground inlet beside the lighthouse, clipped at the
// county's existing water level. This does not alter terrain or road geometry.
import * as THREE from 'three';
import CFG from '../config.js';
import {heightAt} from './terrain.js';

export const RESERVOIR_Y = CFG.wilds.waterY;
const X0=-1488, Z0=-336, STEP=2, NX=119, NZ=189;
let cached;
export function reservoirPlan(){
  if(cached)return cached;
  const heights=new Float32Array(NX*NZ),wet=new Uint8Array(NX*NZ),queue=[];
  for(let z=0;z<NZ;z++)for(let x=0;x<NX;x++)heights[z*NX+x]=heightAt(X0+x*STEP,Z0+z*STEP);
  const seed=Math.round((-80-Z0)/STEP)*NX+Math.round((-1336-X0)/STEP);
  queue.push(seed);wet[seed]=1;
  for(let q=0;q<queue.length;q++){
    const i=queue[q],x=i%NX,z=Math.floor(i/NX);
    for(const j of [x>0?i-1:-1,x<NX-1?i+1:-1,z>0?i-NX:-1,z<NZ-1?i+NX:-1]){
      if(j<0||wet[j]||heights[j]>=RESERVOIR_Y)continue;wet[j]=1;queue.push(j);
    }
  }
  const positions=[],depths=[];
  const clip=(ids)=>{
    if(!ids.some(i=>wet[i]))return;
    const p=ids.map(i=>({x:X0+(i%NX)*STEP,z:Z0+Math.floor(i/NX)*STEP,h:heights[i]})),out=[];
    for(let i=0;i<3;i++){
      const a=p[i],b=p[(i+1)%3],ain=a.h<RESERVOIR_Y,bin=b.h<RESERVOIR_Y;
      if(ain)out.push(a);
      if(ain!==bin){const t=(RESERVOIR_Y-a.h)/(b.h-a.h);out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,h:RESERVOIR_Y});}
    }
    for(let i=1;i<out.length-1;i++)for(const v of [out[0],out[i],out[i+1]]){positions.push(v.x,RESERVOIR_Y,v.z);depths.push(Math.min(1,Math.max(0,(RESERVOIR_Y-v.h)/2.5)));}
  };
  for(let z=0;z<NZ-1;z++)for(let x=0;x<NX-1;x++){const a=z*NX+x;clip([a,a+NX,a+1]);clip([a+1,a+NX,a+NX+1]);}
  cached={heights,wet,positions:new Float32Array(positions),depths:new Float32Array(depths),waterY:RESERVOIR_Y};
  return cached;
}

// This is the exact piecewise-linear footprint of the rendered, clipped triangles.
export function reservoirContains(x,z){
  const fx=(x-X0)/STEP,fz=(z-Z0)/STEP,ix=Math.floor(fx),iz=Math.floor(fz);
  if(ix<0||iz<0||ix>=NX-1||iz>=NZ-1)return false;
  const p=reservoirPlan(),a=iz*NX+ix,u=fx-ix,v=fz-iz;
  const ids=u+v<=1?[a,a+1,a+NX]:[a+NX+1,a+NX,a+1];
  if(!ids.some(i=>p.wet[i]))return false;
  const h=u+v<=1?p.heights[a]*(1-u-v)+p.heights[a+1]*u+p.heights[a+NX]*v:
    p.heights[a+NX+1]*(u+v-1)+p.heights[a+NX]*(1-u)+p.heights[a+1]*(1-v);
  return h<RESERVOIR_Y;
}

export function reservoirGeometry(){
  const p=reservoirPlan(),g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(p.positions.slice(),3));
  g.setAttribute('waterDepth',new THREE.BufferAttribute(p.depths.slice(),1));
  g.computeVertexNormals();g.computeBoundingSphere();return g;
}

// Nine distinct bearings within a 33-degree view from the gallery. Each point is
// selected on real, rendered water with at least .7 m of depth below the signal.
export function boatLanternPositions(){
  const points=[];
  for(let i=0;i<9;i++){
    const angle=.84+i*.07;let best=null;
    for(let d=95;d<=195;d+=2){
      const x=-1380.3+Math.cos(angle)*d,z=-208.1+Math.sin(angle)*d;
      if(heightAt(x,z)>.8||!reservoirContains(x,z))continue;
      if(!best||Math.abs(d-140)<Math.abs(best.distance-140))best={x,z,y:RESERVOIR_Y+.6,distance:d};
    }
    if(best)points.push(best);
  }
  return points;
}
