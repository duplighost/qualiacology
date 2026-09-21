import * as THREE from 'three';
import {Kit} from './sites.js';

// Eight-sided stock removes razor edges without changing the authored envelope.
export function bevelStock(w,h,d,edge=.035){
  const axis=w>=h&&w>=d?0:h>=d?1:2;
  const length=[w,h,d][axis],a=axis===0?d:w,b=axis===1?d:h;
  const x=a/2,y=b/2,e=Math.min(edge,a*.16,b*.16);
  const shape=new THREE.Shape();
  [[-x+e,-y],[x-e,-y],[x,-y+e],[x,y-e],[x-e,y],[-x+e,y],[-x,y-e],[-x,-y+e]]
    .forEach(([px,py],i)=>i?shape.lineTo(px,py):shape.moveTo(px,py));
  shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:length,steps:1,bevelEnabled:false});
  g.translate(0,0,-length/2);
  if(axis===0)g.rotateY(Math.PI/2);else if(axis===1)g.rotateX(-Math.PI/2);
  // Kit merges indexed primitives; preserve the flat normals on the chamfers.
  g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
  return g;
}

// The existing wood map's grain runs in U. Stay within one weatherboard course
// in V, instead of stamping horizontal plank joints across every upright post.
export function longitudinalWoodUV(g,axis,phase=0){
  const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  const row=((Math.floor(Math.abs(phase)*7)%16)+.5)/16;
  for(let i=0;i<p.count;i++){
    const v=[p.getX(i),p.getY(i),p.getZ(i)],normal=[Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i))];
    const across=(axis+1)%3,other=(axis+2)%3;
    const cross=normal[across]>normal[other]?v[other]:v[across];
    uv.setXY(i,v[axis]/3.4+phase,row+Math.max(-.021,Math.min(.021,cross*.055)));
  }
  g.userData.longitudinalWoodUV=true;return g;
}

export class StationTimberKit extends Kit{
  at(g,col,x,y,z,ry,rx,rz){
    if(!g.userData.longitudinalWoodUV){
      g.computeBoundingBox();const b=g.boundingBox,s=new THREE.Vector3();b.getSize(s);
      longitudinalWoodUV(g,s.x>=s.y&&s.x>=s.z?0:s.y>=s.z?1:2,x*.17+z*.11);
    }
    return super.at(g,col,x,y,z,ry,rx,rz);
  }
  box(w,h,d,x,y,z,col,ry,rx,rz){
    const g=Math.min(w,h,d)>.14&&Math.max(w,h,d)>.5?bevelStock(w,h,d):new THREE.BoxGeometry(w,h,d);
    return this.at(g,col,x,y,z,ry,rx,rz);
  }
  build(){const g=super.build();if(g)g.userData.authoredSurfaceUVs=true;return g;}
}
