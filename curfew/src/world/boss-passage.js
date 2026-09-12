// The stairwell is a real recess in the same analytic field sampled by rendering,
// collision and the worker. Holdfast's surveyed road-facing yaw is zero.
export const KEPT_STAIR=Object.freeze({x:45,z:-43,halfWidth:2.1,topZ:-36.4,footZ:-46.0,depth:3.25,steps:16});
export function passageDepthAt(x,z){
 const s=KEPT_STAIR,dx=Math.abs(x-s.x);
 if(dx>s.halfWidth+.35||z>s.topZ+.15||z<s.footZ-1.5)return 0;
 const width=Math.max(0,Math.min(1,(s.halfWidth+.35-dx)/.35));
 const length=Math.max(0,Math.min(1,(s.topZ-z)/(s.topZ-s.footZ)));
 return s.depth*length*width;
}
export function passageHeightAt(x,z,height){return height-passageDepthAt(x,z);}
