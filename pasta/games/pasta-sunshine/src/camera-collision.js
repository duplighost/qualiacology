import * as THREE from '../vendor/three.module.js';

// An analytic segment test catches thin walls that a sampled orbit can miss.
// The camera has a small radius, so its near plane cannot enter a pasta wall.
export function clipCameraSegment(focus,desired,colliders,out=new THREE.Vector3(),radius=.24){
  const x=focus.x,y=focus.y,z=focus.z,dx=desired.x-x,dy=desired.y-y,dz=desired.z-z,length=Math.hypot(dx,dy,dz);
  if(length<1e-6)return out.copy(focus);
  let fraction=1;
  for(const box of colliders||[]){
    if(box.cameraPassThrough===true)continue;
    const x0=box.minX-radius,x1=box.maxX+radius,y0=(box.bottom??-10)-radius,y1=box.top+radius,z0=box.minZ-radius,z1=box.maxZ+radius;
    if(!Number.isFinite(x0+x1+y0+y1+z0+z1))continue;
    // The visual head can be inside its supporting roof's padding. Ignore
    // that enclosing collider rather than collapsing the camera to zero.
    if(x>x0&&x<x1&&y>y0&&y<y1&&z>z0&&z<z1)continue;
    let enter=0,exit=1,hit=true;
    for(let axis=0;axis<3;axis++){
      const start=axis===0?x:axis===1?y:z,direction=axis===0?dx:axis===1?dy:dz,lo=axis===0?x0:axis===1?y0:z0,hi=axis===0?x1:axis===1?y1:z1;
      if(Math.abs(direction)<1e-9){if(start<lo||start>hi){hit=false;break;}continue;}
      let a=(lo-start)/direction,b=(hi-start)/direction;if(a>b){const swap=a;a=b;b=swap;}enter=Math.max(enter,a);exit=Math.min(exit,b);if(enter>exit){hit=false;break;}
    }
    if(hit&&enter>=0&&enter<1&&exit>0)fraction=Math.min(fraction,Math.max(0,enter-.06/length));
  }
  return out.set(x+dx*fraction,y+dy*fraction,z+dz*fraction);
}
