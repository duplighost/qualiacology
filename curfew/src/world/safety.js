// One vocabulary for the actual ground enemies respect, used by spawn and navigation.
export function lightZones(ctx) {
  const s = ctx?.shared;
  return s?.safeLightZones || s?.litPoles || [];
}
export function peacefulAt(ctx, x, z) {
  if(ctx?.systems?.get('holdfast-life')?.contains(x,z)) return true;
  const s = ctx?.shared;
  for (const list of [s?.sanctuaryZones, s?.territoryZones, s?.bossZones]) for (const q of list || []) {
    if (q.on && (x - q.x) ** 2 + (z - q.z) ** 2 < q.r ** 2) return true;
  }
  return false;
}
