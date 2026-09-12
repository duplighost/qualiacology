import * as THREE from 'three';
import { HEADS, HEAD_INDEX } from './human-head-data.js';

// Existing CC0 anatomical source, reshaped into a hollow broken effigy. Face
// apertures are missing surface triangles over a recessed inner cavity; they
// remain dark when a flashlight illuminates the cheek and nose around them.
export function fracturedMask({variant=0,origin=[0,0,0],scale=[1,1,1],fracture=.016,mouth=.020}={}) {
  const data=HEADS[variant],position=[],innerPosition=[],uv=[],indices=[],innerIndices=[];
  const deform=(x,y,z,gap=fracture)=>{
    const seam=.006*Math.sin(y*48);
    const side=x>seam?1:-1;
    const jaw=Math.max(0,1-(y-1.605)/.049);
    return [origin[0]+x*scale[0]+side*gap*.5,
      origin[1]+(y-1.68)*scale[1]-(side>0?gap*1.4:0)-jaw*.035,
      origin[2]+z*scale[2]+(side>0?gap*.25:0)];
  };
  for(let i=0;i<data.positions.length;i+=3){
    const x=data.positions[i],y=data.positions[i+1],z=data.positions[i+2];
    position.push(...deform(x,y,z));innerPosition.push(...deform(x,y,z,0));uv.push(x*9,y*9);
  }
  for(let i=0;i<HEAD_INDEX.length;i+=3){
    const ids=[HEAD_INDEX[i],HEAD_INDEX[i+1],HEAD_INDEX[i+2]];
    if(ids.some(n=>data.positions[n*3+1]<1.615))continue;
    innerIndices.push(...ids);
    const x=ids.reduce((n,j)=>n+data.positions[j*3],0)/3;
    const y=ids.reduce((n,j)=>n+data.positions[j*3+1],0)/3;
    const z=ids.reduce((n,j)=>n+data.positions[j*3+2],0)/3;
    if(z<-.045){
      const crosses=ids.some(j=>data.positions[j*3]>.006*Math.sin(data.positions[j*3+1]*48))
        &&ids.some(j=>data.positions[j*3]<.006*Math.sin(data.positions[j*3+1]*48));
      if(crosses)continue;
      if((x/.027)**2+((y-1.639)/mouth)**2<1)continue;
      if(data.eyes.some(([ex,ey])=>((x-ex)/.0135)**2+((y-ey)/.0105)**2<1))continue;
    }
    indices.push(...ids);
  }
  const build=(positions,ids)=>{
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();return g;
  };
  const geometry=build(position,indices),innerGeometry=build(innerPosition,innerIndices);
  const p=innerGeometry.attributes.position,n=innerGeometry.attributes.normal;
  for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)-n.getX(i)*.014,p.getY(i)-n.getY(i)*.014,p.getZ(i)-n.getZ(i)*.014);
  innerGeometry.computeBoundingSphere();geometry.computeBoundingSphere();
  return {geometry,innerGeometry,eyes:data.eyes.map(([x,y,z])=>deform(x,y,z-.006))};
}
