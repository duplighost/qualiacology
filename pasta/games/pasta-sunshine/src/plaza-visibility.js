// Segment/AABB visibility for the Plaza's real collision geometry. A small
// endpoint allowance permits a strand decal to sit against its supporting
// wall without allowing spray through that wall to a target on the far side.
export function plazaRayClear(colliders,origin,target,endpointTolerance=.28){
  const delta={x:target.x-origin.x,y:target.y-origin.y,z:target.z-origin.z},length=Math.hypot(delta.x,delta.y,delta.z);
  if(!Number.isFinite(length)||length<1e-7)return false;
  const end=1-Math.min(.15,Math.max(0,endpointTolerance)/length);
  for(const c of colliders??[]){let t0=0,t1=1,hit=true;for(const [axis,min,max]of[['x',c.minX,c.maxX],['y',c.bottom??-10,c.top],['z',c.minZ,c.maxZ]]){
      if(Math.abs(delta[axis])<1e-9){if(origin[axis]<min||origin[axis]>max){hit=false;break;}}else{let a=(min-origin[axis])/delta[axis],b=(max-origin[axis])/delta[axis];if(a>b)[a,b]=[b,a];t0=Math.max(t0,a);t1=Math.min(t1,b);if(t0>t1){hit=false;break;}}
    }
    if(hit&&t1>.015&&t0<end)return false;
  }
  return true;
}
