import * as THREE from 'three';
import {CRYPT_ROOM} from '../world/boss-catalog.js';

// Contact paths use the very same wall faces and roof underside as the room mesh.
// Position is the creature's foot plane, not a detached animation above its collider.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const BOSS_PACE=Object.freeze({crypt:18,burrow:14.8,lantern:16,antler:14,bell:9.2,furnace:7,mire:12.2,moth:16.5,choir:6,sea:6.2,tree:0});

export function buildCryptTraverse(position,home,hop=0,player=home){
 const wall=CRYPT_ROOM.halfWidth,roof=CRYPT_ROOM.ceiling,r=3;
 const points=[],add=(x,y,z,nx=0,ny=1,nz=0)=>points.push({position:new THREE.Vector3(home.x+x,home.y+y,home.z+z),normal:new THREE.Vector3(nx,ny,nz)});
 const start=position.clone().sub(home),stage=hop%4;
 // The clear bay between the old columns at -17/-4 avoids the vestibule and stair.
 const bay=-10.5,side=stage===0?(player.x>home.x?1:-1):Math.sign(start.x)||1;
 if(stage===0){
  add(start.x,0,start.z);add(side*(wall-r),0,bay);
  for(let i=1;i<=8;i++){const a=i*Math.PI/16;add(side*(wall-r+r*Math.sin(a)),r-r*Math.cos(a),bay,-side*Math.sin(a),Math.cos(a));}
  add(side*wall,roof/2,bay,-side,0);
 }else if(stage===1){
  add(start.x,start.y,start.z,-side,0);add(side*wall,roof-r,bay,-side,0);
  for(let i=1;i<=8;i++){const a=i*Math.PI/16;add(side*(wall-r+r*Math.cos(a)),roof-r+r*Math.sin(a),bay,-side*Math.cos(a),-Math.sin(a));}
  add(side*12,roof,bay,0,-1);
 }else if(stage===2){
  const other=-side;add(start.x,start.y,start.z,0,-1);add(other*(wall-r),roof,bay,0,-1);
  for(let i=1;i<=8;i++){const a=i*Math.PI/16;add(other*(wall-r+r*Math.sin(a)),roof-r+r*Math.cos(a),bay,-other*Math.sin(a),-Math.cos(a));}
  add(other*wall,roof/2,bay,-other,0);
 }else{
  add(start.x,start.y,start.z,-side,0);add(side*wall,r,bay,-side,0);
  for(let i=1;i<=8;i++){const a=i*Math.PI/16;add(side*(wall-r+r*Math.cos(a)),r-r*Math.sin(a),bay,-side*Math.cos(a),Math.sin(a));}
  add(side*18,0,bay);
 }
 let length=0;for(let i=1;i<points.length;i++){length+=points[i].position.distanceTo(points[i-1].position);points[i].distance=length;}points[0].distance=0;
 return {points,length,duration:length/24,stage,surface:stage===1?'ceiling':stage===3?'floor':'wall'};
}

export function sampleCryptTraverse(route,time,outPosition,outNormal,outTangent){
 const distance=clamp(time/route.duration,0,1)*route.length;
 let i=1;while(i<route.points.length-1&&route.points[i].distance<distance)i++;
 const a=route.points[i-1],b=route.points[i],f=clamp((distance-a.distance)/(b.distance-a.distance||1),0,1);
 outPosition.lerpVectors(a.position,b.position,f);outNormal.lerpVectors(a.normal,b.normal,f).normalize();
 outTangent.subVectors(b.position,a.position).addScaledVector(outNormal,-outTangent.dot(outNormal)).normalize();
 return time>=route.duration;
}

const right=new THREE.Vector3(),forward=new THREE.Vector3(),basis=new THREE.Matrix4();
export function orientToSurface(root,normal,tangent){
 forward.copy(tangent).addScaledVector(normal,-tangent.dot(normal));
 if(forward.lengthSq()<.0001)forward.set(0,0,1).addScaledVector(normal,-normal.z);
 forward.normalize();right.crossVectors(normal,forward).normalize();forward.crossVectors(right,normal).normalize();
 basis.makeBasis(right,normal,forward);root.quaternion.setFromRotationMatrix(basis);
}
