// The station's small, authored exploration loop. Coordinates are relative to its pad.
export const STATION_PYLON=Object.freeze({x:18,z:10});
export const OPENING = Object.freeze({
  id:'filling-station', x:-520, z:240,
  tower:{x:16,z:-17,deck:12},
  // THE CAR IS IN THE GARAGE NOW (opening.js, and world/garage-opening.js owns the night it
  // starts in). What is left of the old road park is the departure marks and the road signs,
  // which still use `works-cut` at 28 m through openingRoadPoint below.
  departure:{route:'works-cut',distance:28},
  path:[[7,5],[9,-7],[9,-16],[9,-24],[17,-28],[26,-24],[29,-14],[28,-3],[21,4],[13,9]],
  trees:[[-36,-21,0,.94],[-32,-29,4,.85],[-23,-30,1,1.1],[-11,-29,0,.9],[-3,-33,4,1.15],
    [7,-35,1,1.2],[16,-36,0,1.05],[25,-32,4,.93],[33,-25,1,1.1],[36,-14,0,1.14],
    [35,-3,4,1.1],[32,8,1,.85],[28,16,0,1.08],[22,24,4,1],[7,31,1,1.1],
    [-5,32,0,1.14],[-17,29,4,1.1],[-31,22,1,.92],[-38,12,0,1],[-39,-3,4,.9],
    [28,-18,4,.72],[30,-6,0,.85],[6,-27,1,.80],[-3,-22,4,.72]],
  supplies:[
    {id:'woodstore',x:2.6,z:-20.7,kind:'crate'},
    {id:'tower-foot',x:19,z:-17,kind:'crate'},
    {id:'tower-top',x:18.5,z:-14.3,y:12.08,kind:'crate',cash:60,xp:60},
    {id:'fallen-log',x:29,z:-22,kind:'crate'},
    {id:'cedar',x:31,z:-2,kind:'crate'},
    {id:'garden',x:6,z:-24,kind:'dig'},
    {id:'roots',x:26,z:-28,kind:'dig'},
    {id:'old-fence',x:29,z:5,kind:'dig'},
  ],
});

// Departure furniture follows the road that is actually built. Sampling from the
// station end also works for routes whose authored control points run toward it.
export function openingRoadPoint(roads,routeId,distance){
  const index=roads.routes.findIndex(r=>r.id===routeId),line=roads.routePolylines()[index];
  if(!line||line.length<2)return null;
  const first=line[0],last=line[line.length-1];
  const reverse=Math.hypot(last.x-OPENING.x,last.z-OPENING.z)<Math.hypot(first.x-OPENING.x,first.z-OPENING.z);
  let left=Math.max(0,distance);
  for(let n=1;n<line.length;n++){
    const a=line[reverse?line.length-n:n-1],b=line[reverse?line.length-n-1:n];
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    if(length<.0001)continue;
    if(left<=length||n===line.length-1){const t=Math.min(1,left/length);return{x:a.x+dx*t,z:a.z+dz*t,tx:dx/length,tz:dz/length,width:roads.routes[index].width};}
    left-=length;
  }
  return null;
}
