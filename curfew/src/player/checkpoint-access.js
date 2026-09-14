import { MAJOR_BY_ID } from '../world/placedata.js';

// The Holdfast's lights belong to its residents. Seeing those lights or carrying
// an old claimed flag does not grant access through the closed curtain gate.
export function respawnPointAllowed(ctx,x,z,placeId='') {
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  const places=ctx.systems?.get('places'),progress=ctx.systems?.get('progress');
  const open=places?.gateIsOpen?.('holdfast')??!!progress?.flag?.('gate:holdfast');
  if(open)return true;
  if(placeId==='holdfast')return false;
  const frame=places?.nodes?.get('holdfast'),def=frame?.def||MAJOR_BY_ID.holdfast;
  const dx=x-def.x,dz=z-def.z,yaw=frame?.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw);
  const lx=dx*c-dz*s,lz=dx*s+dz*c;
  // Wall centre lines are +/-66 m. Include their thickness and the body radius;
  // the inhabited approach outside +Z remains an eligible place to stand.
  return Math.abs(lx)>=68||lz<=-68||lz>=68;
}

export function accessibleRespawnFallback(ctx,x,z) {
  if(respawnPointAllowed(ctx,x,z))return {x,z};
  const start=ctx.systems?.get('terrain')?.playerStart||ctx.spawn;
  if(start&&respawnPointAllowed(ctx,start.x,start.z))return {x:start.x,z:start.z};
  const station=MAJOR_BY_ID['filling-station'];
  return {x:station.x,z:station.z};
}
