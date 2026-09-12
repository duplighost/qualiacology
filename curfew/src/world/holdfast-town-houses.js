import { groundY, shell, gableFloor, glowColumn, PANE_WINDOW, ON_APRON } from './sites.js';
import { P, solid, banner, icicles, lantern, chair, chest, arch } from './holdfast-town-art.js';

function furnish(k, api, b, y) {
  const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw), P2 = (x, z) => [b.x + x * cy + z * sy, b.z - x * sy + z * cy];
  const mineral = c => c === P.stone || c === P.darkStone || c === P.edge;
  const box = (w, h, d, x, yy, z, c = P.wood, tag = 'wood') => {
    const [px, pz] = P2(x, z); solid(mineral(c) ? k : { solid: k.cloth }, api, w, h, d, px, y + yy, pz, c, b.yaw, tag);
  };
  const detail = (w, h, d, x, yy, z, c = P.wood) => { const [px, pz] = P2(x, z); (mineral(c) ? k.solid : k.cloth).box(w, h, d, px, y + yy, pz, c, b.yaw); };
  // Furnishings sit at the edges; the actual resident and shopkeeper stand on the
  // clear axis between the door and room centre from the shared town plan.
  const back = b.d / 2 - 0.62;
  box(b.w * 0.60, 2.65, 0.48, 0, 1.325, back);
  for (let row = 0; row < 3; row++) {
    detail(b.w * 0.61, 0.08, 0.65, 0, 0.55 + row * 0.79, back - 0.12, P.cutWood);
    for (let j = 0; j < 7; j++) {
      const px = (j - 3) * b.w * 0.075, base = 0.59 + row * 0.79;
      if (b.use === 'archive' || b.use === 'school') {
        const h = 0.25 + (j + row) % 3 * 0.075;
        detail(0.14 + j % 3 * 0.04, h, 0.20, px, base + h / 2, back - 0.38, [0.08 + j % 3 * 0.022, 0.055, 0.04]);
        detail(0.07, 0.025, 0.012, px, base + h * 0.72, back - 0.488, P.paper);
      } else {
        const [xx, zz] = P2(px, back - 0.38);
        if ((j + row) % 3 === 0) {
          const h = 0.20 + j % 2 * 0.09;
          k.cloth.cyl(0.10, 0.115, h, 10, xx, y + base + h / 2, zz, [0.042, 0.070, 0.055]);
          k.cloth.cyl(0.047, 0.093, 0.06, 10, xx, y + base + h + 0.03, zz, P.cloth);
          k.cloth.cyl(0.044, 0.044, 0.08, 8, xx, y + base + h + 0.10, zz, P.cutWood);
          k.cloth.cyl(0.104, 0.116, 0.047, 10, xx, y + base + h * 0.55, zz, P.paper);
        } else if (b.use === 'bakery' && j % 2) {
          k.cloth.cyl(0.13, 0.16, 0.15, 12, xx, y + base + 0.075, zz, P.cutWood);
          k.cloth.cone(0.132, 0.095, 12, xx, y + base + 0.19, zz, P.cutWood);
          for (let score = -1; score <= 1; score++) detail(0.016, 0.012, 0.14, px + score * 0.05, base + 0.20, back - 0.38, P.paper);
        } else {
          const h = 0.20 + (j + row) % 3 * 0.05;
          k.cloth.cyl(0.13, 0.16, h, 10, xx, y + base + h / 2, zz, j % 2 ? P.paper : P.cloth);
          k.cloth.cone(0.13, 0.10, 10, xx, y + base + h + 0.05, zz, j % 2 ? P.paper : P.cloth);
          k.cloth.cyl(0.032, 0.046, 0.065, 8, xx, y + base + h + 0.11, zz, P.wood);
        }
      }
    }
  }
  const hearthX = -b.w / 2 + 1.0;
  box(1.3, 0.20, 1.3, hearthX, 0.10, 1.1, P.darkStone, 'stone');
  for (const off of [-0.63, 0.63]) box(0.22, 1.30, 1.0, hearthX + off, 0.70, 1.1, P.stone, 'stone');
  detail(1.65, 0.22, 1.25, hearthX, 1.42, 1.1, P.edge);
  const [fx, fz] = P2(hearthX, 1.1); glowColumn(k.live, fx, y + 0.18, fz, 0.23, 0.77, 0.21);
  const [lampX, lampZ] = P2(b.w / 2 - 0.72, -b.d / 2 + 0.32);
  lantern(k, lampX, y + 2.5, lampZ, b.yaw);
  k.solid.cyl(0.016, 0.016, 0.62, 5, lampX, y + 2.99, lampZ, P.iron);
  const tableX = b.w * 0.25;
  box(2.0, 0.13, 1.25, tableX, 0.89, 0.55, P.cutWood);
  for (const xx of [-0.80, 0.80]) for (const zz of [-0.45, 0.45]) detail(0.11, 0.85, 0.11, tableX + xx, 0.43, 0.55 + zz);
  for (const zz of [-0.72, 1.85]) { const [px, pz] = P2(tableX, zz); chair(k, api, px, y, pz, b.yaw + (zz < 0 ? Math.PI : 0)); }
  if (b.use === 'weapons') {
    for (let j = 0; j < 5; j++) {
      const xx = -2.2 + j * 1.1;
      detail(0.11, 1.05, 0.12, xx, 1.45, back - 0.55, P.iron);
      detail(0.18, 0.45, 0.22, xx, 0.83, back - 0.56, P.cutWood);
      detail(0.26, 0.18, 0.26, xx, 1.17, back - 0.55, P.iron);
    }
    detail(0.70, 0.12, 0.28, tableX, 1.00, 0.5, P.iron);
    detail(0.54, 0.18, 0.42, tableX - 0.62, 1.06, 0.70, P.paper);
  } else if (b.use === 'car') {
    const [tx, tz] = P2(-b.w * 0.25, -1.25);
    for (let i = 0; i < 3; i++) k.solid.tube(0.58, 0.58, 0.27, 12, tx, y + 0.15 + i * 0.28, tz, P.iron);
    box(1.05, 0.60, 0.75, tableX, 1.18, 0.5, P.iron);
    for (let i = 0; i < 4; i++) detail(0.08, 0.26, 0.79, tableX - 0.36 + i * 0.24, 1.50, 0.5, P.edge);
    detail(1.25, 0.04, 0.15, tableX - 0.25, 0.99, 0.05, P.iron);
  } else if (b.use === 'home' || b.use === 'inn' || b.use === 'infirmary') {
    box(1.55, 0.43, 2.65, -b.w * 0.24, 0.27, -1.18);
    detail(1.40, 0.18, 2.40, -b.w * 0.24, 0.55, -1.18, b.use === 'infirmary' ? P.paper : P.purple);
    detail(1.12, 0.19, 0.54, -b.w * 0.24, 0.72, -0.37, P.paper);
    if (b.use === 'infirmary') {
      detail(0.75, 0.05, 0.23, -b.w * 0.24, 0.665, -1.6, P.red);
      detail(0.23, 0.05, 0.75, -b.w * 0.24, 0.668, -1.6, P.red);
    }
  } else if (b.use === 'kitchen' || b.use === 'bakery') {
    for (let i = 0; i < 5; i++) {
      const [px, pz] = P2(tableX - 0.72 + (i % 3) * 0.6, 0.27 + Math.floor(i / 3) * 0.6);
      k.solid.cyl(0.18, 0.13, 0.10, 10, px, y + 1.0, pz, b.use === 'bakery' ? P.cutWood : P.iron);
    }
    const [px, pz] = P2(hearthX, 1.1); k.solid.cyl(0.32, 0.23, 0.36, 12, px, y + 0.71, pz, P.iron);
  } else if (b.use === 'school' || b.use === 'archive') {
    box(2.8, 1.6, 0.12, -b.w / 2 + 1.62, 2.10, -b.d / 2 + 0.3, P.darkStone);
    for (let i = 0; i < 17; i++) detail(0.025, 0.20, 0.02, -b.w / 2 + 0.43 + (i % 9) * 0.27, 2.42 - Math.floor(i / 9) * 0.43, -b.d / 2 + 0.22, P.paper);
    detail(0.8, 0.045, 0.57, tableX, 0.98, 0.6, P.paper);
  } else if (b.use === 'garden') {
    for (let i = 0; i < 6; i++) {
      const [px, pz] = P2(-3 + i * 1.2, back - 1.2);
      k.solid.cyl(0.29, 0.22, 0.5, 9, px, y + 0.25, pz, P.cutWood);
      for (let j = 0; j < 4; j++) k.solid.cone(0.12, 0.5, 5, px + Math.sin(j * 2) * 0.1, y + 0.61, pz + Math.cos(j * 2) * 0.1, [0.037, 0.078, 0.052], j, 0.22, 0.22);
    }
  } else if (b.use === 'bells') {
    for (let i = 0; i < 3; i++) { const [px, pz] = P2(-2 + i * 2 + (i === 1 ? 0.75 : 0), -1.0); k.solid.cyl(0.11, 0.38, 0.52, 12, px, y + 2.9, pz, P.iron); k.solid.cyl(0.02, 0.02, 2.1, 4, px, y + 1.7, pz, P.paper); }
  } else if (b.use === 'memorial') {
    for (let i = 0; i < 4; i++) {
      const [px, pz] = P2(-3 + i * 1.8, -1.8); chair(k, api, px, y, pz, b.yaw);
      detail(0.33, 0.09, 0.28, -3 + i * 1.8, 0.61, -1.8, i % 2 ? P.purple : P.paper);
    }
  } else if (b.use === 'candles') {
    for (let i = 0; i < 12; i++) { const [px, pz] = P2(tableX - 0.7 + i % 4 * 0.42, 0.14 + Math.floor(i / 4) * 0.35); k.solid.cyl(0.055, 0.068, 0.27 + i % 3 * 0.09, 7, px, y + 1.14, pz, P.paper); }
  } else if (b.use === 'cloth') {
    box(2.0, 1.8, 0.17, -b.w * 0.27, 1.2, -0.8);
    for (let i = 0; i < 9; i++) detail(0.035, 1.42, 0.022, -b.w * 0.27 - 0.75 + i * 0.19, 1.20, -0.92, P.paper);
    detail(1.5, 0.77, 0.025, -b.w * 0.27, 0.8, -0.93, P.purple);
  }
  if (['archive', 'inn', 'memorial'].includes(b.use) || b.id === 'outer-home') {
    const [cx, cz] = P2(b.w / 2 - 1.0, back - 0.7); chest(k, api, cx, y, cz, b.yaw);
  }
}

export function building(k, api, b, rng) {
  const y = groundY(api, b.x, b.z) + ON_APRON;
  const bapi = { ...api, padY: y }, cy = Math.cos(b.yaw), sy = Math.sin(b.yaw);
  const P2 = (ux, uz) => [b.x + ux * cy + uz * sy, b.z - ux * sy + uz * cy];
  const dw = b.use === 'car' ? 3.2 : 2.35;
  shell(k.solid, bapi, b.x, b.z, b.w, b.d, b.h, b.yaw, P.stone, dw);
  // Thin floor and separate wall feet: no foundation box blocks the interior.
  solid(k, api, b.w, 0.12, b.d, b.x, y + 0.01, b.z, P.darkStone, b.yaw, 'floor');
  for (const side of [-1, 1]) {
    const [x, z] = P2(side * b.w / 2, 0);
    k.solid.box(0.58, 0.46, b.d + 0.4, x, y + 0.23, z, P.darkStone, b.yaw);
    k.solid.box(0.68, 0.25, b.d + 0.6, x, y + 3.0, z, P.edge, b.yaw);
  }
  const front = -b.d / 2 - 0.14;
  for (const side of [-1, 1]) {
    const [px, pz] = P2(side * (b.w / 2 - 0.1), front);
    k.solid.box(0.5, b.h + 0.15, 0.5, px, y + b.h / 2, pz, P.edge, b.yaw);
    for (let i = 0; i < 5; i++) k.solid.box(0.70, 0.26, 0.66, px, y + 0.55 + i * (b.h - 1) / 4, pz, P.darkStone, b.yaw);
  }
  const [dx, dz] = P2(0, front - 0.07);
  arch(k, api, dx, dz, dw, 2.25, 0.63, 0.56, y, b.yaw);
  solid(k, api, dw, Math.max(0.1, b.h - 3.10), 0.44, dx + sy * 0.14, y + (b.h + 3.10) / 2, dz + cy * 0.14, P.stone, b.yaw);
  for (const row of [0, 1]) for (const side of [-1, 1]) {
    const wx = side * b.w * 0.29, wy = row ? Math.min(b.h - 1.45, 5.4) : 1.9;
    const [px, pz] = P2(wx, front - 0.01);
    k.solid.box(1.30, 1.64, 0.16, px, y + wy, pz, P.darkStone, b.yaw);
    const [gx, gz] = P2(wx, front - 0.105);
    k.live.pane(0.88, 1.17, gx, y + wy, gz, PANE_WINDOW, b.yaw + Math.PI, 0, 4, 5);
    k.solid.box(0.065, 1.37, 0.22, gx, y + wy, gz, P.iron, b.yaw);
    k.solid.box(1.16, 0.065, 0.22, gx, y + wy, gz, P.iron, b.yaw);
    for (const ss of [-1, 1]) { const [sx, sz] = P2(wx + ss * 0.80, front - 0.11); k.cloth.box(0.38, 1.51, 0.13, sx, y + wy, sz, row ? P.purple : P.wood, b.yaw); }
    const [ix, iz] = P2(wx, front - 0.2); icicles(k, ix, y + wy + 0.81, iz, 1.35, b.yaw, rng);
  }
  // An upper-storey overhang/ceiling compresses the lane above the player's head.
  solid(k, api, b.w + 0.75, 0.22, b.d + 0.55, b.x, y + 3.42, b.z, P.wood, b.yaw, 'wood');
  const roofYaw = b.yaw + Math.PI / 2;
  k.solid.gable(b.d + 0.5, b.w + 0.55, y + b.h, 2.0, b.x, 0, b.z, P.slate, roofYaw, { api: bapi, depth: b.w, col: P.darkStone });
  gableFloor(api, b.x, b.z, b.d + 0.5, b.w + 0.55, y + b.h, 2.0, roofYaw);
  const [rx, rz] = P2(0, front - 0.37); icicles(k, rx, y + b.h - 0.03, rz, b.w + 0.9, b.yaw, rng);
  const [chx, chz] = P2(-b.w * 0.32, b.d * 0.20);
  k.solid.box(0.85, 3.2, 0.94, chx, y + b.h + 0.95, chz, P.darkStone, b.yaw);
  k.solid.box(1.1, 0.18, 1.15, chx, y + b.h + 2.59, chz, P.snow, b.yaw);
  const [bx, bz] = P2(-b.w * 0.30, front - 0.24); banner(k, bx, y + 4.5, bz, 0.79, 1.8, b.yaw + Math.PI);
  const [lx, lz] = P2(dw / 2 + 0.47, front - 0.33); lantern(k, lx, y + 2.61, lz, b.yaw + Math.PI);
  for (let i = 0; i < 8; i++) {
    const [fx, fz] = P2(-b.w / 2 + 0.7 + i % 4 * 0.28, front - 0.52);
    k.solid.cyl(0.11, 0.12, 0.6, 6, fx, y + 0.13 + Math.floor(i / 4) * 0.24, fz, P.cutWood, b.yaw, Math.PI / 2);
  }
  furnish(k, api, b, y + 0.075);
}
