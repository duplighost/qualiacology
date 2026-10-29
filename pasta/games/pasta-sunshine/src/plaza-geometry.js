import * as THREE from '../vendor/three.module.js';
import {AirstripPastaBatch} from './airstrip-world.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';

export const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),TAU=Math.PI*2;

// Geometry is grouped by material AND a local spatial cell. The previous Plaza
// used a single city-sized bound for each material, forcing every street and
// the entire sea into every view. Splitting at strand boundaries keeps pasta
// silhouettes intact while ordinary Three.js frustum culling can do its job.
export class PlazaPastaBatch{
  constructor(material,{cellSize=24,castShadow=true,staticGeometry=false}={}){this.material=material;this.cellSize=cellSize;this.castShadow=castShadow;this.staticGeometry=staticGeometry;this.bins=new Map();}
  tube(points,r=.1,sides=6){
    if(!points||points.length<2)return;
    let segment=[points[0]],length=0;
    const flush=()=>{if(segment.length<2)return;const center=new THREE.Vector3();for(const p of segment)center.add(p);center.multiplyScalar(1/segment.length);const key=Math.floor((center.x+this.cellSize*.5)/this.cellSize)+','+Math.floor((center.z+this.cellSize*.5)/this.cellSize);let bin=this.bins.get(key);if(!bin){bin={high:new AirstripPastaBatch(this.material),low:this.staticGeometry?new AirstripPastaBatch(this.material):null};this.bins.set(key,bin);}bin.high.tube(segment,r,sides);if(bin.low)bin.low.tube(segment.filter((_,i)=>i%3===0||i===segment.length-1),r,4);};
    for(let j=1;j<points.length;j++){
      const a=points[j-1],c=points[j],distance=a.distanceTo(c),parts=Math.max(1,Math.ceil(distance/6));
      for(let k=1;k<=parts;k++){const p=k===parts?c:a.clone().lerp(c,k/parts);length+=segment.at(-1).distanceTo(p);segment.push(p);if(length>=14){flush();segment=[p];length=0;}}
    }
    flush();
  }
  finish(parent,name){let first=null;for(const [cell,bin]of this.bins){for(const level of ['high','low']){if(!bin[level])continue;const mesh=bin[level].finish(parent,name+' · spatial cell '+cell+' · '+level);if(mesh){mesh.castShadow=this.castShadow;mesh.geometry.computeBoundingBox();if(this.staticGeometry)mesh.userData.plazaStatic={cell,level};mesh.visible=level==='high';first||=mesh;}}}this.bins.clear();return first;}
}

// Merge coincident static cells from the town and landmark builders. The far
// model keeps every strand and its radius, reducing only radial sections and
// longitudinal samples. Close-range silhouette/detail remains unchanged.
export function finalizePlazaStaticGeometry(root){
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),bins=new Map(),originals=[];
  root.traverse(o=>{const tag=o.userData.plazaStatic;if(!o.isMesh||!tag)return;const key=o.material.uuid+'|'+tag.cell+'|'+Number(o.castShadow);let bin=bins.get(key);if(!bin){bin={material:o.material,cell:tag.cell,castShadow:o.castShadow,high:[],low:[]};bins.set(key,bin);}bin[tag.level].push(o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));originals.push(o);});
  for(const bin of bins.values()){
    const high=mergeGeometries(bin.high,false),low=mergeGeometries(bin.low,false);high.computeBoundingSphere();const center=high.boundingSphere.center.clone();high.translate(-center.x,-center.y,-center.z);low.translate(-center.x,-center.y,-center.z);high.computeBoundingSphere();low.computeBoundingSphere();high.computeBoundingBox();low.computeBoundingBox();
    const lod=new THREE.LOD();lod.name='Spatial pasta cell '+bin.cell;lod.position.copy(center);lod.userData.plazaCell=bin.cell;
    for(const [level,geometry]of [['near',high],['far',low]]){const mesh=new THREE.Mesh(geometry,bin.material);mesh.name='Plaza '+level+' pasta strands';mesh.castShadow=bin.castShadow;mesh.receiveShadow=true;mesh.visible=level==='near';lod.addLevel(mesh,level==='near'?0:36,.12);}root.add(lod);for(const g of [...bin.high,...bin.low])g.dispose();
  }
  for(const o of originals){o.removeFromParent();o.geometry.dispose();}
  return bins.size;
}

export function packedDeck(batch,x0,x1,z0,z1,y,r=.14){for(let z=z0;z<=z1+.001;z+=r*1.92){const p=[];for(let x=x0;x<x1;x+=1.8)p.push(V(x,y-r+Math.sin(x*.71+z*.3)*.009,z));p.push(V(x1,y-r,z));batch.tube(p,r,7);}}
export function packedWall(batch,a,c,height,r=.16){for(let y=0;y<height;y+=r*1.92){const p=[];for(let j=0;j<=Math.max(3,Math.ceil(a.distanceTo(c)/1.8));j++){const t=j/Math.max(3,Math.ceil(a.distanceTo(c)/1.8));p.push(a.clone().lerp(c,t).add(V(0,y,0)));}batch.tube(p,r,7);}}
export function circle(x,y,z,rx,rz,n=32){return Array.from({length:n+1},(_,i)=>{const a=i/n*TAU;return V(x+Math.cos(a)*rx,y,z+Math.sin(a)*rz);});}
export function braid(batch,a,c,r=.18,count=4){const tangent=c.clone().sub(a).normalize(),side=V().crossVectors(tangent,Math.abs(tangent.y)>.9?V(1,0,0):V(0,1,0)).normalize(),up=V().crossVectors(tangent,side).normalize();for(let s=0;s<count;s++){const p=[];for(let j=0;j<=28;j++){const t=j/28,angle=t*TAU*2+s/count*TAU;p.push(a.clone().lerp(c,t).addScaledVector(side,Math.cos(angle)*r*.66).addScaledVector(up,Math.sin(angle)*r*.66));}batch.tube(p,r*.42,7);}}
