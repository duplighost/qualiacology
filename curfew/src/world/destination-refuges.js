// Sleeping rooms share their exact footprint with Refuge, including the door and mattress.
// Each is a working part of its destination: lamp room, sacristy, weigh office or bunk room.
import { kits, shell, groundY, gableFloor, C } from './sites.js';

export const DESTINATION_REFUGES = Object.freeze([
  { id: 'weeping-mine', x: -15, z: -14, w: 7, d: 7, yaw: 0, type: 'weigh', roof: 3.2 },
  { id: 'cathedral', x: -16, z: -13, w: 7, d: 6, yaw: 0, type: 'sacristy', roof: 3.8 },
  { id: 'hollow-mill', x: -16, z: 18, w: 7, d: 7, yaw: 0, type: 'bunk', roof: 3.2 },
  { id: 'garden-of-rest', x: 15, z: 17, w: 6, d: 7, yaw: 0, type: 'keeper', roof: 3.4 },
  { id: 'jackfield', x: -23, z: -2, w: 6, d: 6, yaw: 0, type: 'bunk', roof: 3.2 },
  { id: 'chapel', x: -13, z: 3, w: 10.5, d: 17, yaw: Math.PI, existing: true,
    doorW: 2.6, bag: { x: 3.2, z: 5, yaw: 0 } },
  // ROUND 22: the planetarium at Morning. The whole building is the room: shut the door
  // and the hall is a refuge while the projection runs. existing:true (planetarium.js builds
  // the walls); yaw PI puts the leaf on the site's +Z face at (0, 24); the bag is in the foyer.
  { id: 'morning', x: 0, z: 11, w: 17, d: 26, yaw: Math.PI, existing: true,
    doorW: 2.4, bag: { x: 4.6, z: -10.6, yaw: 0 } },
]);

const timber = [0.12,0.082,0.047], trim=[0.20,0.18,0.14], metal=[0.045,0.05,0.047];
export function refugeFloorY(api, r) {
  if (r.existing) return api.padY;
  let y=api.padY;
  for(const dx of [-r.w/2,0,r.w/2]) for(const dz of [-r.d/2,0,r.d/2])
    y=Math.max(y,api.heightAt(api.wx(r.x+dx,r.z+dz),api.wz(r.x+dx,r.z+dz)));
  return y+0.08;
}
function dress(api, r) {
  if(r.existing) return null;
  api={...api,padY:refugeFloorY(api,r)};
  const k=kits(), y=api.padY, hw=r.w/2, hd=r.d/2;
  const masonry=r.type==='sacristy'||r.type==='keeper';
  const wall=masonry?[0.15,0.145,0.125]:[0.105,0.085,0.066];
  const box=(w,h,d,x,yy,z,col=timber)=>k.solid.box(w,h,d,r.x+x,y+yy,r.z+z,col);
  const slab=(w,d,x,z,top,thick=0.16,col=timber)=>{
    box(w,thick,d,x,top-thick/2,z,col);
    api.emit({kind:'obb',x:r.x+x,z:r.z+z,halfX:w/2,halfZ:d/2,yaw:0,
      y0:y+top-thick,y1:y+top,tag:'wood',standable:true});
  };
  shell(k.solid,api,r.x,r.z,r.w,r.d,r.roof,0,wall,2.0);
  slab(r.w-0.4,r.d-0.4,0,0,0,0.15,[0.10,0.095,0.075]);
  k.solid.gable(r.w+0.55,r.d+0.55,y+r.roof,0.8,r.x,0,r.z,C.slate,0,
    {api,depth:r.d,col:wall});
  gableFloor(api,r.x,r.z,r.w+0.55,r.d+0.55,y+r.roof,0.8,0);
  // A full-height header closes the room above its actual leaf.
  box(2.0,r.roof-2.42,0.45,0,(r.roof+2.42)/2,-hd,wall);
  api.emit({kind:'obb',x:r.x,z:r.z-hd,halfX:1,halfZ:0.23,yaw:0,
    y0:y+2.42,y1:y+r.roof,tag:'wall',climbable:false});
  // Climb from a low tool chest to a covered wood store and up onto the roof.
  const climbX=r.x+hw+0.85, climbZ=r.z-2.45;
  const firstTop=groundY(api,climbX,climbZ)+0.62-y;
  slab(1.55,1.6,hw+0.85,-2.45,firstTop,0.60);
  slab(1.7,1.8,hw+1.25,-0.35,1.7);
  slab(1.5,1.8,hw+0.85,1.85,r.roof-0.12);
  api.site.refugeClimb={space:'local',
    approach:{x:climbX,z:r.z-3.85,y:groundY(api,climbX,r.z-3.85)},
    stages:[{x:climbX,z:climbZ,y:y+firstTop},
      {x:r.x+hw+1.25,z:r.z-0.35,y:y+1.7},
      {x:r.x+hw+0.85,z:r.z+1.85,y:y+r.roof-0.12}]};
  for(const zz of [1.15,3.15]) {
    box(0.14,r.roof,0.14,hw+1.02,r.roof/2,zz,metal);
    box(0.13,1.2,0.13,hw+0.66,r.roof-0.65,zz,timber);
  }
  // A clear porch meets sloping terrain in ordinary walking risers.
  // Work backward from the threshold until a tread actually meets the ground at
  // its own position. Sampling a fixed point then changing the stair length left
  // the cemetery's first tread almost two metres above the footpath.
  for(let i=0;i<64;i++) {
    const z=-hd-0.22-i*0.44, top=-i*0.22;
    const ground=groundY(api,r.x,r.z+z)-y;
    slab(2.8,0.5,0,z,top,0.26,C.stone);
    if(top-ground<=0.28) {
      api.site.refugeApproach={x:r.x,z:r.z+z-0.9};
      break;
    }
  }
  // Wall bays have joints, corner posts, a gutter, and deep framed windows.
  for(const sx of [-1,1]) {
    box(0.17,r.roof,0.17,sx*(hw-0.08),r.roof/2,-hd-0.08,trim);
    box(0.17,r.roof,0.17,sx*(hw-0.08),r.roof/2,hd,trim);
    for(let zz=-hd+0.7;zz<hd;zz+=0.52) box(0.055,r.roof-0.25,0.055,sx*(hw+0.015),r.roof/2,zz,metal);
    box(0.14,0.15,r.d+0.65,sx*(hw+0.28),r.roof-0.04,0,metal);
  }
  const wx=hw-1.12;
  box(1.25,0.9,0.10,wx,1.85,-hd-0.24,metal);
  for(const xx of [wx-0.68,wx+0.68]) box(0.1,1.03,0.16,xx,1.85,-hd-0.27,trim);
  for(const yy of [1.33,2.37]) box(1.46,0.09,0.18,wx,yy,-hd-0.27,trim);
  box(0.07,0.94,0.16,wx,1.85,-hd-0.28,trim);
  // The mattress side of the room stays free. Furniture occupies the opposite wall.
  slab(1.15,2.4,hw-0.95,0.15,0.84,0.12);
  for(const zz of [-0.8,1.1]) box(0.10,0.78,0.10,hw-1.35,0.39,zz,metal);
  box(0.6,0.06,0.38,hw-0.95,0.91,-0.3,[0.25,0.22,0.16]);
  for(let i=0;i<4;i++) {
    const x=hw-1.05+(i%2)*0.19, z=0.2+Math.floor(i/2)*0.20;
    k.solid.cyl(0.055,0.068,0.18,7,r.x+x,y+1.0,r.z+z,metal);
  }
  for(const yy of [1.25,1.85,2.42]) {
    box(r.w-1.1,0.10,0.38,0,yy,hd-0.4,timber);
    for(let i=0;i<4;i++) box(0.38,0.22+(i%2)*0.14,0.26,-hw+0.8+i*(r.w-1.6)/4,yy+0.2,hd-0.42,i%2?trim:metal);
  }
  if(r.type==='sacristy') {
    box(0.16,1.1,0.12,0,1.85,hd-0.31,trim);
    box(0.70,0.12,0.13,0,2.02,hd-0.30,trim);
  } else if(r.type==='weigh') {
    box(0.68,0.10,0.55,hw-1,1.02,0.65,metal);
    k.solid.cyl(0.28,0.28,0.075,12,r.x+hw-1,y+1.18,r.z+0.65,trim);
  } else {
    // Coat pegs and a pair of boots beside the door, below eye level.
    box(0.85,0.10,0.12,-hw+0.7,1.8,-hd+0.28,timber);
    for(const xx of [-hw+0.5,-hw+0.8]) box(0.18,0.3,0.42,xx,0.2,-hd+0.5,metal);
  }
  return {solid:k.solid.build(),glow:null};
}
export const DRESS=Object.fromEntries(DESTINATION_REFUGES.map(r=>[r.id,(api)=>dress(api,r)]));
