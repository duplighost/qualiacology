// The Holdfast is an occupied building. Its skin is permanent; floors, rooms and
// fittings stream with the town. No solid decorative band crosses its interior.
import * as THREE from 'three';
import { kits, Kit, GLOW, ON_APRON } from './sites.js';
import { P, solid, arch, banner, lantern, chair, chest, icicles, snowCap, crescent, inhabitedWindow, chamferedBlock } from './holdfast-town-art.js';
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
    // Each occupied room has its own lamplight, sash and interior silhouette.
    inhabitedWindow(k,x,api.padY+(sill+head)/2,z,1.58,Math.max(.3,head-sill-.32),yaw,
      lo*19+centre*7+c*11,.59);
    const sx = x + Math.sin(yaw) * 0.59, sz = z + Math.cos(yaw) * 0.59;
    k.solid.box(2.45, 0.19, 1.24, x, api.padY + sill, z, P.edge, axis === 'x' ? 0 : Math.PI / 2);
    arch(k, api, sx, sz, 1.80, head - 0.9 - lo, 0.76, 0.30, api.padY + lo, yaw);
  }
  wall(k, api, axis, c, cursor, to, sill, head);
}

/** The civic front has one tall central bay and two stepped shoulders. These
 * additions stay outside the rooms; roof projections clear the occupied deck. */
function keepMassing(k, y, height) {
  const profile = (points, depth, x, z, colour) => {
    const shape = new THREE.Shape();
    points.forEach(([px, py], i) => i ? shape.lineTo(px, py) : shape.moveTo(px, py));
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {depth,steps:1,bevelEnabled:false,curveSegments:1});
    geo.setIndex(Array.from({length:geo.attributes.position.count}, (_, i) => i));
    geo.translate(0, 0, -depth / 2);
    k.solid.at(geo, colour, x, y, z);
  };
  const rake = (ax, ay, bx, by, depth, z, width, colour) => {
    const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy);
    k.solid.box(length, width, depth, (ax + bx) / 2, y + (ay + by) / 2, z, colour, 0, 0, Math.atan2(dy, dx));
  };
  const pitchedCap = (x, base, width, rise, front, rear, colour) => {
    const half = width / 2;
    for (const side of [-1, 1]) {
      rake(x + side * half, base, x, base + rise, front - rear, (front + rear) / 2, .19, colour);
      rake(x + side * half, base + .10, x, base + rise + .10, .22, front + .04, .22, P.edge);
    }
    k.solid.box(.23,.20,front-rear+.16,x,y+base+rise+.12,(front+rear)/2,P.darkStone);
  };

  // The entrance pediment begins above the original arch. Deep corbels grow
  // from its existing piers, leaving the full 5.2 m doorway and street clear.
  for (const side of [-1, 1]) {
    for (let course = 0; course < 4; course++) {
      const depth = .62 + course * .25;
      chamferedBlock(k.solid,.72+course*.12,.28,depth,side*3.13,y+3.78+course*.29,
        -.20+course*.10,course%2?P.stone:P.edge,0,.045);
    }
  }
  chamferedBlock(k.solid,9.70,.35,1.70,0,y+4.93,.34,P.darkStone,0,.065);
  chamferedBlock(k.solid,10.02,.24,1.94,0,y+5.20,.40,P.edge,0,.052);
  profile([[-4.76,5.28],[0,7.15],[4.76,5.28]],.64,0,.76,P.stone);
  for (const side of [-1, 1]) {
    rake(side*4.90,5.25,0,7.24,.82,.79,.28,P.edge);
    rake(side*4.40,5.46,0,7.09,.15,1.17,.08,P.darkStone);
  }
  chamferedBlock(k.solid,10.0,.11,.15,0,y+5.41,1.27,P.stone,0,.025);

  // Strong returns around the existing centre windows read as a deeper volume,
  // while the banners at x +/-5 retain their full width and original positions.
  for (const side of [-1, 1]) {
    const x = side * 3.43;
    for (const [lo,hi,width,depth] of [[7.10,12.43,1.00,1.82],[12.82,25.04,.92,1.63],[25.43,37.77,.84,1.47]]) {
      chamferedBlock(k.solid,width,hi-lo,depth,x,y+(lo+hi)/2,-.20,P.stone,0,.10);
      k.solid.box(.14,hi-lo-.18,.12,x+side*(width/2-.09),y+(lo+hi)/2,.59,P.edge);
    }
  }
  for (const high of [12.60,25.20,37.92]) {
    chamferedBlock(k.solid,7.95,.40,2.05,0,y+high,-.04,P.edge,0,.055);
    k.solid.box(7.62,.17,1.84,0,y+high-.29,-.04,P.darkStone);
    for (const x of [-3.45,-2.10,2.10,3.45]) chamferedBlock(k.solid,.35,.48,.53,x,y+high-.49,.53,P.stone,0,.045);
  }

  // Side bays have lower, stepped roofs. Their returns flank the real window
  // openings; the hoods fit in the empty masonry between pairs of floors.
  for (const side of [-1, 1]) {
    for (const px of [6.72,12.18]) {
      for (const [lo,hi,width,depth] of [[4.95,12.35,1.30,1.74],[12.95,24.95,1.03,1.42],[25.55,37.52,.79,1.06]]) {
        chamferedBlock(k.solid,width,hi-lo,depth,side*px,y+(lo+hi)/2,-.24,P.stone,0,.105);
        chamferedBlock(k.solid,width+.18,.27,depth+.17,side*px,y+hi-.03,-.20,P.edge,0,.05);
      }
    }
    const cx = side * 9.45;
    for (const [base,rise] of [[12.65,.72],[25.25,.72],[37.86,1.75]]) {
      chamferedBlock(k.solid,6.70,.32,2.02,cx,y+base-.22,-.03,P.edge,0,.055);
      profile([[-3.35,base],[0,base+rise],[3.35,base]],.35,cx,1.02,P.darkStone);
      pitchedCap(cx,base,6.94,rise,1.25,-1.12,P.slate);
      for (const dx of [-2.70,-1.58,1.58,2.70]) {
        chamferedBlock(k.solid,.32,.46,.62,cx+dx,y+base-.57,.38,P.stone,0,.045);
      }
    }
  }

  // A steep stone gable breaks the broad flat skyline. Its front is outside
  // the parapet. Only its slate roof reaches over the deck, above 41.1 m;
  // the roof floor is at 37.8 m and the stair landing begins at x=5.8.
  const shoulder = height + 3.46, peak = height + 11.02;
  profile([[-4.42,height+.15],[-4.42,shoulder],[0,peak],[4.42,shoulder],[4.42,height+.15]],.84,0,.06,P.stone);
  pitchedCap(0,shoulder,9.30,peak-shoulder,.78,-4.85,P.slate);
  for (const side of [-1, 1]) {
    rake(side*4.39,shoulder+.04,0,peak+.07,.55,.64,.31,P.edge);
    rake(side*3.98,shoulder+.14,0,peak-.30,.15,.58,.10,P.darkStone);
    chamferedBlock(k.solid,.39,2.96,.36,side*4.26,y+height+1.48,.47,P.edge,0,.055);
  }
  // Blind tracery repeats the keep's carved crescent language, without adding
  // a luminous window, a light slot, or a new interactive symbol.
  k.solid.cyl(1.12,1.12,.12,28,0,y+height+5.00,.54,P.darkStone,0,Math.PI/2);
  k.solid.at(new THREE.TorusGeometry(1.15,.105,6,28),P.edge,0,y+height+5.00,.66);
  crescent(k.cloth,0,y+height+5.00,.69,.74,0,P.edge,.07);
  for (const x of [-1.64,1.64]) {
    chamferedBlock(k.solid,.56,1.84,.10,x,y+height+1.72,.53,P.darkStone,0,.06);
    k.solid.box(.065,1.56,.10,x,y+height+1.72,.63,P.edge);
  }
  chamferedBlock(k.solid,.31,.70,.39,0,y+peak+.40,.09,P.edge,0,.055);

  // Crown the existing corner towers within their 1.55 m collider cylinders.
  // Broad stepped bands and short corbels put a real base beneath each cone.
  for (const z of [-25.85,-2.15]) for (const x of [-13.6,13.6]) {
    k.solid.cyl(1.46,1.32,.38,12,x,y+height+4.18,z,P.edge);
    k.solid.cyl(1.53,1.46,.30,12,x,y+height+4.52,z,P.stone);
    k.solid.cyl(1.53,1.53,.13,12,x,y+height+4.76,z,P.edge);
    for (let i=0;i<8;i++) {
      const a=i*Math.PI/4,px=x+Math.sin(a)*1.29,pz=z+Math.cos(a)*1.29;
      k.solid.box(.25,.56,.30,px,y+height+3.91,pz,P.darkStone,a);
    }
  }
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
    // The occupied keep has three large architectural stages, rather than six equal
    // brick slices. Projecting ledges and shadowed undersides group pairs of floors.
    for (const x of [-14.35, -6.3, 6.3, 14.35]) {
      const outer = Math.abs(x) > 10;
      chamferedBlock(k.solid,outer ? .64 : .42,hi-lo-.39,outer ? .55 : .35,
        x,y+(lo+hi)/2-.05,-.91,outer ? P.stone : P.darkStone,0,.055);
      chamferedBlock(k.solid,outer ? .86 : .64,.27,.60,x,y+hi-.42,-.80,P.edge,0,.035);
    }
    if (floor % 2 === 1) {
      chamferedBlock(k.solid,30.8,.30,.86,0,y+hi-.27,-.90,P.edge,0,.045);
      k.solid.box(30.4,.115,.59,0,y+hi-.50,-.94,P.darkStone);
      for (let x = -13.5; x <= 13.6; x += 3) {
        chamferedBlock(k.solid,.36,.36,.48,x,y+hi-.67,-.91,P.stone,0,.035);
      }
    }
  }
  // Carved entrance dress sits on the existing arch and leaves its clear opening intact.
  for (const side of [-1, 1]) {
    chamferedBlock(k.solid,.46,3.92,.40,side*3.12,y+2.05,-.18,P.stone,0,.052);
    chamferedBlock(k.solid,.69,.24,.61,side*3.12,y+4.12,-.12,P.edge,0,.04);
    chamferedBlock(k.solid,.62,.32,.56,side*3.12,y+.25,-.18,P.darkStone,0,.045);
  }
  chamferedBlock(k.solid,7.24,.27,.62,0,y+4.65,-.16,P.edge,0,.045);
  chamferedBlock(k.solid,7.62,.20,.88,0,y+4.87,-.13,P.stone,0,.035);
  // Purely decorative moon relief, now seated on the deeper entrance pediment.
  k.solid.cyl(.52,.52,.10,20,0,y+5.83,1.15,P.darkStone,0,Math.PI/2);
  crescent(k.cloth,0,y+5.83,1.21,.34,0,P.edge,.035);
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
  keepMassing(k, y, height);
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
      if (level === 0) {
        // THE BREAKER'S LIGHT. Alex: "the castle breaker needs to be more lit up and visible
        // when you walk in." refuge.js hangs the keep's board at local (-4.67, -18.18) on this
        // doorway wall, facing +X into the hall, and by its own design the housing is the
        // darkest thing on the wall — so nothing on the board gets brighter. The WALL does:
        // a bracket lantern on the hall side a metre along from it (the matching layout lamp
        // 'keep-breaker-lantern' is what holdfast-life borrows a rover for), and a stone hood
        // over the recess so it reads as a made thing from the arch, 17 m away, before the
        // board's own hood resolves.
        const by = api.padY + floor;
        lantern(k, -3.95, by + 2.75, -17.0, Math.PI / 2, true);
        k.solid.box(0.62, 0.09, 0.09, -4.23, by + 3.17, -17.0, P.edge);   // the bracket, back to the wall
        k.solid.box(0.18, 0.30, 0.18, -4.44, by + 3.02, -17.0, P.iron);   // its wall plate
        // the hood: a lintel proud of the wall over the board, chest-to-head height clear
        solid(k, api, 0.55, 0.22, 1.5, -4.38, by + 2.12, -18.18, P.edge, 0, 'wall', false);
        k.solid.box(0.42, 0.10, 1.62, -4.44, by + 2.29, -18.18, P.darkStone);
      }
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
