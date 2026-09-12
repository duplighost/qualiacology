// The Holdfast is an occupied building. Its skin is permanent; floors, rooms and
// fittings stream with the town. No solid decorative band crosses its interior.
import { kits, Kit, GLOW, PANE_WINDOW, ON_APRON } from './sites.js';
import { P, solid, arch, banner, lantern, chair, chest, icicles, snowCap, crescent } from './holdfast-town-art.js';
import { furnishRoom } from './holdfast-town-houses.js';

export const KEEP_LEVELS = [0, 6.3, 12.6, 18.9, 25.2, 31.5, 37.8];
export const KEEP_ROOMS = KEEP_LEVELS.slice(0, -1).flatMap((y, level) => [
  { id: 'keep-west-' + level, x: -8.7, z: -8.9, y, w: 7.2, d: 6.2, yaw: -Math.PI / 2, use: ['kitchen', 'infirmary', 'archive', 'cloth', 'home', 'memorial'][level] },
  { id: 'keep-rear-' + level, x: -8.7, z: -20.1, y, w: 8.1, d: 6.2, yaw: -Math.PI / 2, use: ['bakery', 'home', 'school', 'candles', 'bells', 'garden'][level] },
]);

function wall(k, api, axis, c, a, b, lo, hi, col = P.stone, thick = 1.0) {
  if (b <= a || hi <= lo) return;
  const along = (a + b) / 2;
  solid(k, api, axis === 'x' ? b - a : thick, hi - lo, axis === 'x' ? thick : b - a,
    axis === 'x' ? along : c, api.padY + (lo + hi) / 2, axis === 'x' ? c : along, col);
}

function windowWall(k, api, axis, c, from, to, lo, hi, windows, outward) {
  const half = 0.92, sill = lo + 1.40, head = hi - 1.02;
  wall(k, api, axis, c, from, to, lo, sill);
  wall(k, api, axis, c, from, to, head, hi);
  let cursor = from;
  for (const centre of windows) {
    wall(k, api, axis, c, cursor, centre - half, sill, head); cursor = centre + half;
    const x = axis === 'x' ? centre : c, z = axis === 'x' ? c : centre;
    const yaw = axis === 'x' ? (outward > 0 ? 0 : Math.PI) : outward * Math.PI / 2;
    // Recessed amber glass, with actual deep window reveals and a narrow mullion.
    k.glow.pane(1.58, Math.max(0.3, head - sill - 0.32), x, api.padY + (sill + head) / 2, z, PANE_WINDOW, yaw, 0, 4, 6);
    const sx = x + Math.sin(yaw) * 0.59, sz = z + Math.cos(yaw) * 0.59;
    k.solid.box(0.11, head - sill, 0.18, sx, api.padY + (sill + head) / 2, sz, P.darkStone, yaw);
    k.solid.box(2.45, 0.19, 1.24, x, api.padY + sill, z, P.edge, axis === 'x' ? 0 : Math.PI / 2);
    arch(k, api, sx, sz, 1.80, head - 0.9 - lo, 0.76, 0.30, api.padY + lo, yaw);
  }
  wall(k, api, axis, c, cursor, to, sill, head);
}

export function buildHoldfastKeepLandmark(api) {
  const k = kits(), y = api.padY, height = KEEP_LEVELS.at(-1);
  k.cloth = new Kit();
  for (let floor = 0; floor < KEEP_LEVELS.length - 1; floor++) {
    const lo = KEEP_LEVELS[floor], hi = KEEP_LEVELS[floor + 1];
    for (const side of [-1, 1]) windowWall(k, api, 'z', side * 14.5, -26, -2, lo, hi, [-21, -14, -7], side);
    windowWall(k, api, 'x', -26.5, -15, 15, lo, hi, [-9, 0, 9], -1);
    if (floor === 0) {
      windowWall(k, api, 'x', -1.5, -15, -2.6, lo, hi, [-9], 1);
      windowWall(k, api, 'x', -1.5, 2.6, 15, lo, hi, [9], 1);
      wall(k, api, 'x', -1.5, -2.6, 2.6, 4.8, hi);
      arch(k, api, 0, -0.86, 5.2, 3.25, 1.25, 1.50, y);
    } else windowWall(k, api, 'x', -1.5, -15, 15, lo, hi, [-9, 0, 9], 1);
    // A string course is four narrow perimeter strips, never a floor through rooms.
    for (const side of [-1, 1]) {
      k.solid.box(0.46, 0.24, 27, side * 15.02, y + hi - 0.18, -14, P.edge);
      k.solid.box(30.5, 0.24, 0.46, 0, y + hi - 0.18, -14 + side * 13.02, P.edge);
      snowCap(k,0,y+hi-.045,-14+side*13.02,30.6,.69,0,.13,floor+side);
      snowCap(k,side*15.02,y+hi-.045,-14,.65,26.9,0,.13,floor-side);
    }
  }
  // Carved moon medallions and paired ribs give the front a hierarchy of bays.
  for(const x of[-5,5]){
    for(const dx of[-.30,.30])k.solid.cyl(.11,.16,29.6,8,x+dx,y+18.6,-.79,P.edge);
    for(const yy of[9.5,22.1,34.7]){
      k.solid.cyl(.73,.73,.14,24,x,y+yy,-.71,P.darkStone,0,Math.PI/2);
      crescent(k.cloth,x,y+yy,-.54,.45,0,P.moon);
    }
  }
  // Stepped buttresses and capped watch turrets articulate the old rectangular shaft.
  for (const side of [-1, 1]) for (const z of [-25.9, -14, -2.1]) {
    for (let step = 0; step < 4; step++) {
      const h = height / 4, width = 2.40 - step * 0.30;
      solid(k, api, width, h, 1.42, side * 15.85, y + (step + 0.5) * h, z, step % 2 ? P.darkStone : P.stone);
      k.solid.box(width + 0.20, 0.25, 1.69, side * 15.85, y + (step + 1) * h, z, P.edge);
    }
    k.solid.cone(1.42, 2.9, 8, side * 15.85, y + height + 1.55, z, P.slate, Math.PI / 8);
  }
  for (const z of [-25.85, -2.15]) for (const x of [-13.6, 13.6]) {
    // Turrets stand outside usable rooms; their lower footprint is part of the wall.
    k.solid.cyl(1.30, 1.55, 8.8, 12, x, y + height + 1.15, z, P.stone);
    k.solid.cone(1.72, 4.8, 12, x, y + height + 7.95, z, P.slate);
    api.emit({ kind: 'circle', x, z, r: 1.55, y0: y + height - 3.25, y1: y + height + 10.35, tag: 'wall' });
  }
  for (const side of [-1, 1]) {
    wall(k, api, 'z', side * 14.6, -25.8, -2.2, height, height + 1.12, P.darkStone, 0.55);
    wall(k, api, 'x', -14 + side * 12.6, -13.2, 13.2, height, height + 1.12, P.darkStone, 0.55);
    for (let i = 0; i < 10; i++) {
      const z = -24.5 + i * 2.32;
      k.solid.box(0.8, 0.65, 0.85, side * 14.6, y + height + 1.42, z, P.edge);
    }
  }
  // The existing hinged paid/fought gate remains on the permanent landmark node.
  for (const side of [-1, 1]) {
    const leaf = new Kit(), reach = 4.9;
    leaf.box(reach, 6.4, 0.34, -side * reach / 2, 0, 0, [0.026, 0.021, 0.016]);
    for (let i = 0; i < 4; i++) leaf.box(reach - 0.2, 0.22, 0.42, -side * reach / 2, -2.3 + i * 1.5, 0, P.iron);
    k.moving.push({ geo: leaf.build(), role: 'gateLeaf', rate: 0, x: side * 4.95, y: y + 3.2, z: 65.8, open: -side * 1.40 });
  }
  banner(k, -5.0, y + 12.2, -0.78, 1.65, 6.9, 0, true);
  banner(k, 5.0, y + 24.8, -0.78, 1.65, 6.9, 0, true);
  return { solid: k.solid.build(), people: k.cloth.build(), glow: k.glow.build(), moving: k.moving, glowColour: GLOW.ember };
}

function deck(k, api, x0, x1, z0, z1, top) {
  solid(k, api, x1 - x0, 0.32, z1 - z0, (x0 + x1) / 2, api.padY + top - 0.16, (z0 + z1) / 2, P.darkStone, 0, 'floor');
}
function doorwayWall(k, api, axis, c, a, b, door, y, h = 4.8) {
  wall(k, api, axis, c, a, door - 1.2, y, y + h, P.stone, 0.36);
  wall(k, api, axis, c, door + 1.2, b, y, y + h, P.stone, 0.36);
  wall(k, api, axis, c, door - 1.2, door + 1.2, y + 2.8, y + h, P.stone, 0.36);
}

export function dressHoldfastKeep(k, api) {
  const base = ON_APRON + 0.08;
  for (let level = 0; level < KEEP_LEVELS.length; level++) {
    const floor = KEEP_LEVELS[level] + base;
    if (level === 0) deck(k, api, -14, 14, -26, -2, floor);
    else {
      deck(k, api, -14, 5.8, -26, -2, floor);
      deck(k, api, 5.8, 14, -26, -16, floor);
      deck(k, api, 5.8, 14, -7, -2, floor);
      // Safety rails follow the actual stairwell opening, with a clear landing mouth.
      solid(k, api, 0.18, 0.97, 9.0, 5.9, api.padY + floor + 0.485, -11.5, P.iron, 0, 'metal');
    }
    if (level < KEEP_LEVELS.length - 1) {
      // Opposed flights leave headroom above every tread and land on the next real floor.
      for (let i = 0; i < 9; i++) {
        const h = (i + 1) * 0.35, zA = -7 - (i + 0.5) * 0.72, zB = -13.48 + (i + 0.5) * 0.72;
        solid(k, api, 2.30, h, 0.74, 7.40, api.padY + floor + h / 2, zA, P.stone, 0, 'stone');
        solid(k, api, 2.30, h, 0.74, 10.70, api.padY + floor + 3.15 + h / 2, zB, P.stone, 0, 'stone');
        for (const [x, zz, bottom] of [[6.19, zA, floor + h], [8.62, zA, floor + h], [9.48, zB, floor + 3.15 + h], [11.92, zB, floor + 3.15 + h]])
          solid(k, api, 0.12, 0.86, 0.74, x, api.padY + bottom + 0.43, zz, P.darkStone);
      }
      deck(k, api, 6.15, 12.05, -16, -13.35, floor + 3.15);
      doorwayWall(k, api, 'z', -4.7, -25.7, -14.5, -20.1, floor, 5.98);
      doorwayWall(k, api, 'z', -4.7, -14.1, -2.4, -8.9, floor, 5.98);
      doorwayWall(k, api, 'x', -14.3, -13.8, -4.7, -9, floor, 5.98);
      const lx = 3.9, lz = -5.0;
      lantern(k, lx, api.padY + floor + 2.9, lz, 0, true);
      k.cloth.box(4.6, 0.03, 6.0, -0.1, api.padY + floor + 0.025, -17.8, level % 2 ? P.purple : P.cloth);
      if (level === 0 || level === 2 || level === 4) {
        solid({ solid: k.cloth }, api, 2.1, 0.16, 5.4, 0.2, api.padY + floor + 0.90, -19, P.cutWood, 0, 'wood');
        for (const z of [-21, -19, -17]) for (const x of [-1.6, 2.0]) chair(k, api, x, api.padY + floor, z, x < 0 ? -Math.PI / 2 : Math.PI / 2);
        for (let i = 0; i < 5; i++) k.cloth.cyl(0.16, 0.13, 0.085, 9, 0.2, api.padY + floor + 1.04, -21 + i, P.paper);
      } else chest(k, api, 3.2, api.padY + floor, -23.7);
      for (const x of [-3.6, 4.6]) for (const z of [-24.8, -14.8]) {
        k.solid.cyl(0.20, 0.28, 5.94, 8, x, api.padY + floor + 2.97, z, P.edge);
        api.emit({ kind: 'circle', x, z, r: 0.28, y0: api.padY + floor, y1: api.padY + floor + 5.94, tag: 'wall' });
      }
    }
  }
  for (const room of KEEP_ROOMS) furnishRoom(k, api, room, api.padY + room.y + base + 0.015);
  // Roof garden, stargazing table and occupied sheltered balcony are a destination.
  const roof = api.padY + KEEP_LEVELS.at(-1) + base;
  for (const x of [-10, -8.5, -7]) for (const z of [-23, -21.5]) {
    k.cloth.cyl(0.37, 0.29, 0.55, 10, x, roof + 0.275, z, P.cutWood);
    k.cloth.cone(0.22, 0.70, 8, x, roof + 0.85, z, [0.040, 0.078, 0.052]);
  }
  solid({ solid: k.cloth }, api, 2.5, 0.15, 1.3, -5.0, roof + 0.95, -6.0, P.cutWood, 0, 'wood');
  for (const x of [-6.7, -3.3]) chair(k, api, x, roof, -6.0, x < -5 ? -Math.PI / 2 : Math.PI / 2);
  lantern(k, -5.0, roof + 1.40, -6.0, 0, true);
  chest(k, api, -11.8, roof, -4.2);
  for (const side of [-1, 1]) icicles(k, side * 14.8, roof - 0.1, -14, 24, Math.PI / 2, api.rng);
}
