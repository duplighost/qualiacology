/** The county map knows only poles in travelled cells. Darkness never reveals a road. */
export function knownRoadLamps(poles,grid,size){
  if(!Array.isArray(poles)||!grid?.cells||!Number.isInteger(grid.n)||grid.n<=0||!Number.isFinite(size)||size<=0)return [];
  const n=grid.n,half=size*.5,known=[];
  for(const pole of poles){
    const x=pole.hx??pole.x,z=pole.hz??pole.z;
    if(!Number.isFinite(x)||!Number.isFinite(z))continue;
    const cx=Math.floor((x+half)/size*n),cz=Math.floor((z+half)/size*n);
    if(cx<0||cz<0||cx>=n||cz>=n||!grid.cells[cz*n+cx])continue;
    known.push({i:pole.i,x,z,lit:!!pole.lit&&!pole.daylightOff,daylightOff:!!pole.daylightOff,flicker:!!pole.flicker||pole.flickerT>0});
  }
  return known;
}
