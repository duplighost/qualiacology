// The actual connected low-ground inlet beside the lighthouse, clipped at the
// county's existing water level. This does not alter terrain or road geometry.
//
// The pure half (the plan, the footprint, RESERVOIR_Y) lives in frozen-water.js, which
// terrain.js imports for surfaceAt(); it is re-exported here so every existing import keeps
// working. This file keeps the THREE side: the mesh geometry and the nine lantern points.
import * as THREE from 'three';
import {heightAt} from './terrain.js';
import {RESERVOIR_Y,reservoirPlan,reservoirContains} from './frozen-water.js';
export {RESERVOIR_Y,reservoirPlan,reservoirContains};

// Positions stay at RESERVOIR_Y (tests/lore-reservoir.mjs rays them); the drawn water sheet
// is lowered by its MESH in lore-drowned-light.js so the ice above it has something to show.
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
