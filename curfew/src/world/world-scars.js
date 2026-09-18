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
/* ==========================================================================
   THE RED QUARRY PIT. ALEX, 2026-09-18: "the red quarry destination could be so much cooler
   if it actually was a large spot below ground level."

   A dimension-stone pit, 14 m deep, cut square: a 56 x 56 m floor, three 3.5 m benches and a
   coping round it, and one paved incline down the north face toward the road. Everything here
   is in the SITE's frame (places.js pins the quarry's yaw to QUARRY_PIT.yaw), +Z toward the
   road, and `e` is the square (Chebyshev) distance out from the floor rectangle.

   Terrain cannot draw a vertical face (1.6 m quads, a mesh that disagrees with the analytic
   ground at every kink), so the faces are built blocks (outer-destinations.js) and this carve
   is the ground UNDER them. Two collision rules shape it: a body may stand on anything up to
   0.60 m (STEP_UP + STEP_TOL) over the ground it walks on, and an enemy walks on the ground
   only (nav.js followGround); a walker is stopped moving UP ground steeper than 47 degrees
   when that ground is within 0.48 m of his feet. So:
     1. Wherever an enemy can stand, the ground is the surface you see: the floor and the rim
        are exactly flat, and the incline is the ground itself.
     2. Under every tread the ground is 1.2 m down, so nothing stands in one or walks up
        through a bench; the last 2.4 m up to the rim is 63 degrees, and the crest fence
        (outer-destinations.js) keeps everyone off the paving over it.
   Every kink is at least 1.4 m behind the face that hides it, so the drawn mesh (whose chord
   at a kink leaves the analytic ground) is always inside a block, never in front of one.
   ========================================================================== */
export const QUARRY_PIT=Object.freeze({
  id:'red-quarry',x:820.3,z:-2954.3,
  // The site's own heading, measured once off the road field (atan2 of the nearest road
  // point) and then PINNED here and in placedata, so the carve and the site frame can never
  // drift apart if a road moves.
  yaw:-0.3387809,
  fx0:-28,fx1:28,fz0:-55,fz1:1,depth:14,
  toe:1.4,grade:.875,lip:12,crest:14.4,     // e where the slope starts / steepens / meets the rim
  bench:4,rise:3.5,coping:17.2,             // bands e 0-4, 4-8, 8-12 (treads +3.5/+7/+10.5), coping 12-17.2
  // THE INCLINE, x -2.2..2.2 up the north face: the way in and out, and it is GROUND.
  // A stair cannot be both walked by the player and kept from the enemies here: collision lets
  // a body step onto anything up to 0.60 m over what it stands on, and an enemy stands on the
  // terrain (nav.js followGround), so every tread it reaches it wades through. MEASURED (r3
  // station probe): a hound at a stair foot put its chest 0.4 m into the first tread. So the
  // way down is the carved ground itself, a paved incline the hounds come down after you on,
  // with nothing under its surface for anyone to sink into. Its plane runs 0.75 (37 degrees,
  // under the 47 degree walk limit) between two 5 m parabolic eases, so the drawn mesh's
  // chords at its foot and head sit within ~10 cm of it; it is 2.4 m wider than the walk each
  // side (notchHalf) so the chords at its edges fall under the cheek walls.
  // t0 -0.9: the toe must stop short of the site's origin (0,0), which is t -1: places.js reads
  // rec.padY as the ground there, and a toe under it lifted every pad-relative prop 0.17 m.
  incline:Object.freeze({half:2.2,notchHalf:4.6,t0:-.9,ease:5,pitch:.75}),
  // The frozen sump in the south half of the floor, under the crane's block. rx/rz are the
  // ICE's ellipse with the wilds pool edge (frozen-water.js poolEdge): inside it the bed is at
  // least `ice` under the floor, so the sheet (wilds.js draws it, frozen-water holds the feet
  // on it) never floats over its own shore; a 0.35 m beach runs out to 1.25x.
  sump:Object.freeze({x:-8,z:-40,rx:9,rz:6.5,ice:.35,depth:2.2,bank:1.25}),
});
const QC=Math.cos(QUARRY_PIT.yaw),QS=Math.sin(QUARRY_PIT.yaw);
/** Height of the incline above the pit floor at t (metres out from the north lip of the
 *  floor, +Z). 0 before its toe, the rim after its head; monotonic. */
export function quarryInclineHeight(t){
  const I=QUARRY_PIT.incline,D=QUARRY_PIT.depth,e=I.ease,s=I.pitch;
  const tA=I.t0,tB=tA+e,hB=s*e/2,tC=tB+(D-2*hB)/s,tD=tC+e;
  if(t<=tA)return 0;
  if(t<tB){const u=t-tA;return s*u*u/(2*e);}
  if(t<=tC)return hB+s*(t-tB);
  if(t<tD){const u=tD-t;return D-s*u*u/(2*e);}
  return D;
}
/** Where the incline meets the rim (t). */
export function quarryInclineEnd(){const I=QUARRY_PIT.incline;return I.t0+2*I.ease+(QUARRY_PIT.depth-I.pitch*I.ease)/I.pitch;}
/** Height of the carved ground above the pit floor, from e (floor 0 .. rim 14). */
export function quarryBenchGround(e){
  const Q=QUARRY_PIT;
  if(e<=Q.toe)return 0;
  if(e<=Q.lip)return Q.grade*(e-Q.toe);
  const atLip=Q.grade*(Q.lip-Q.toe);
  if(e<Q.crest)return atLip+(Q.depth-atLip)*(e-Q.lip)/(Q.crest-Q.lip);
  return Q.depth;
}
/** Carve depth (metres below the rim) at a point in the SITE frame. Pure, allocation-free. */
export function quarryDepthLocal(lx,lz){
  const Q=QUARRY_PIT;
  const e=Math.max(Q.fx0-lx,lx-Q.fx1,Q.fz0-lz,lz-Q.fz1,0);
  let h=e>=Q.crest?Q.depth:quarryBenchGround(e);
  // the incline (see QUARRY_PIT.incline): the ground IS its plane, over its whole width
  if(Math.abs(lx)<Q.incline.notchHalf){
    const t=lz-Q.fz1;
    if(t>Q.incline.t0&&t<quarryInclineEnd())h=quarryInclineHeight(t);
  }
  let d=Q.depth-h;
  if(d<=0)return 0;
  if(e===0){
    const s=Q.sump,nx=(lx-s.x)/s.rx,nz=(lz-s.z)/s.rz,r0=Math.sqrt(nx*nx+nz*nz);
    if(r0<s.bank*1.12){
      const a=Math.atan2(nz,nx),r=r0/(1+.075*Math.sin(a*3+.6)+.045*Math.sin(a*7-.4));
      if(r<=1){let t=(1-r)/.5;t=t>1?1:t;d+=s.ice+(s.depth-s.ice)*t*t*(3-2*t);}
      else if(r<s.bank){const t=(r-1)/(s.bank-1);d+=s.ice*(1-t*t*(3-2*t));}
    }
  }
  return d;
}
/** Carve depth at a WORLD point. One multiply-add outside 95 m of the pit. */
export function quarryDepthAt(x,z){
  const dx=x-QUARRY_PIT.x,dz=z-QUARRY_PIT.z;
  if(dx*dx+dz*dz>9025)return 0;
  return quarryDepthLocal(dx*QC-dz*QS,dx*QS+dz*QC);
}

export function storyHeightAt(x,z,height){
 const q=quarryDepthAt(x,z);if(q>0)return height-q;
 if(Math.abs(x-SINKHOLE.x)>59||Math.abs(z-SINKHOLE.z)>56)return height;
 const scar=height-sinkholeDepthAt(x,z),d=Math.hypot(x-979,z-212);
 // The surviving lower floor rests on one settled piece of foundation. Its
 // blend is part of the same field; the open side has no buried terrain wall.
 return scar+(30-scar)*(1-ease((d-5.8)/5.2));
}
