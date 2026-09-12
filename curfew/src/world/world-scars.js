// Pure terrain/road authoring: worker geometry, collision and planting share this scar.
export const SINKHOLE=Object.freeze({id:'swallowed-house',name:'The House Below',x:970,z:200,radius:48,depth:28});
export const LOST_DRIVE=Object.freeze([[1035.6866,383.0126],[1008,357],[1028,321],[1008,291],[983,272],[976,252]]);
const sat=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=sat(n);return n*n*(3-2*n);};
export function sinkholeDepthAt(x,z){
  const dx=x-SINKHOLE.x,dz=z-SINKHOLE.z;
  if(Math.abs(dx)>59||Math.abs(dz)>56)return 0;
  const a=Math.atan2(dz,dx),r=Math.hypot(dx,dz/0.91)/(SINKHOLE.radius*(1+.065*Math.sin(a*3+.5)+.033*Math.sin(a*7)));
  if(r>=1.12)return 0;
  let depth=4*ease((1.12-r)/.30)+24*ease((.82-r)/.60);
  // A fallen strip of the west garden forms a broad climbable way back out.
  // Its height is terrain, not a decorative ramp over contradictory collision.
  if(dx<54){const ramp=Math.max(0,(dx+44)*.48),weight=1-ease((Math.abs(dz)-4)/14);depth-=Math.max(0,depth-ramp)*weight;}
  return depth;
}
export function storyHeightAt(x,z,height){
 if(Math.abs(x-SINKHOLE.x)>59||Math.abs(z-SINKHOLE.z)>56)return height;
 const scar=height-sinkholeDepthAt(x,z),d=Math.hypot(x-979,z-212);
 // The surviving lower floor rests on one settled piece of foundation. Its
 // blend is part of the same field; the open side has no buried terrain wall.
 return scar+(30-scar)*(1-ease((d-5.8)/5.2));
}
