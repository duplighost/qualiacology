// One vocabulary for the actual ground enemies respect, used by spawn and navigation.
export function lightZones(ctx) {
  const s = ctx?.shared;
  return s?.safeLightZones || s?.litPoles || [];
}
export function peacefulAt(ctx, x, z) {
  if(ctx?.systems?.get('holdfast-life')?.contains(x,z)) return true;
  // THE ELEVEN REWIRE: a hamlet is lit ground for the same reason the Holdfast is. This call
  // is the cheap one and runs on the spawn path; hamlet-life.contains() is the whole answer
  // (it pushes nothing into ctx.shared.sanctuaryZones — that array is sanctuaries.js's own).
  // D16: while a hamlet's defence is LIVE, contains() ignores that one hamlet (C22), so the
  // waves can walk in and the dread lane treats it as open ground until it holds again.
  if(ctx?.systems?.get('hamlet-life')?.contains(x,z)) return true;
  const s = ctx?.shared;
  for (const list of [s?.sanctuaryZones, s?.territoryZones, s?.bossZones]) for (const q of list || []) {
    if (q.on && (x - q.x) ** 2 + (z - q.z) ** 2 < q.r ** 2) return true;
  }
  return false;
}
