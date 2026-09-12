import * as THREE from 'three';
import { groundY, glowColumn, PANE_LAMP, ON_APRON } from './sites.js';

export const P = Object.freeze({
  stone: [0.105, 0.113, 0.128], darkStone: [0.055, 0.060, 0.073], edge: [0.141, 0.152, 0.173],
  snow: [0.25, 0.28, 0.32], ice: [0.12, 0.18, 0.22], slate: [0.042, 0.049, 0.065],
  wood: [0.067, 0.048, 0.036], cutWood: [0.12, 0.089, 0.056], iron: [0.046, 0.050, 0.058],
  purple: [0.063, 0.038, 0.105], violet: [0.088, 0.050, 0.129], moon: [0.33, 0.33, 0.38],
  paper: [0.23, 0.21, 0.16], red: [0.15, 0.036, 0.025], cloth: [0.09, 0.105, 0.113],
});
const shade = (c, k) => c.map(v => v * k);
export function solid(k, api, w, h, d, x, y, z, c = P.stone, yaw = 0, tag = 'wall', standable = true) {
  k.solid.box(w, h, d, x, y, z, c, yaw);
  api.emit({ kind: 'obb', x, z, halfX: w / 2, halfZ: d / 2, yaw,
    y0: y - h / 2, y1: y + h / 2, tag, standable });
}
export function cylinder(k, api, r, h, x, y, z, c, tag = 'stone') {
  k.solid.cyl(r * 0.91, r, h, 12, x, y, z, c);
  api.emit({ kind: 'circle', x, z, r, y0: y - h / 2, y1: y + h / 2, tag, standable: true });
}
const indexed = geometry => {
  if (!geometry.index) geometry.setIndex(Array.from({ length: geometry.attributes.position.count }, (_, i) => i));
  return geometry;
};

// The emblem is real crescent-shaped relief, not a bright circle painted on a square.
export function crescent(k, x, y, z, radius, yaw, col = P.moon, depth = 0.025) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 32; i++) {
    const a = (55 + i / 32 * 250) * Math.PI / 180;
    const p = [Math.cos(a) * radius, Math.sin(a) * radius];
    if (i === 0) shape.moveTo(...p); else shape.lineTo(...p);
  }
  const tx = Math.cos(55 * Math.PI / 180) * radius, ty = Math.sin(55 * Math.PI / 180) * radius;
  for (let i = 0; i <= 32; i++) {
    const a = (-90 - i / 32 * 180) * Math.PI / 180;
    shape.lineTo(tx + Math.cos(a) * radius * 0.78, Math.sin(a) * ty);
  }
  shape.closePath();
  k.at(indexed(new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: false, curveSegments: 1 })), col, x, y, z, yaw);
}

export function banner(k, x, y, z, w, h, yaw, phases = false) {
  const geo = new THREE.PlaneGeometry(w, h, 5, 12), a = geo.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const u = a.getX(i), v = a.getY(i), loose = (h / 2 - v) / h;
    a.setZ(i, Math.sin(u * 3.2 + v * 1.5) * 0.08 * loose + loose * 0.16);
    if (v < -h * 0.4) a.setY(i, v + (Math.abs(u) / w) * 0.4 + (i % 3) * 0.045);
  }
  geo.computeVertexNormals(); k.cloth.at(geo, P.purple, x, y, z, yaw);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  k.solid.box(w + 0.35, 0.08, 0.09, x, y + h / 2 + 0.05, z, P.iron, yaw);
  const mark = (dy, r) => crescent(k.cloth, x + sy * 0.20, y + dy, z + cy * 0.20, r, yaw);
  mark(phases ? h * 0.21 : h * 0.15, w * 0.28);
  if (phases) {
    mark(-h * 0.16, w * 0.20);
    k.cloth.cyl(w * 0.18, w * 0.18, 0.024, 20, x + sy * 0.22, y - h * 0.36, z + cy * 0.22, P.moon, yaw, Math.PI / 2);
  }
  for (const s of [-1, 1]) {
    const dx = s * (w / 2 - 0.05);
    k.cloth.box(0.035, h - 0.35, 0.035, x + dx * cy + sy * 0.08, y + 0.1, z - dx * sy + cy * 0.08, shade(P.moon, 0.45), yaw);
  }
}

export function icicles(k, x, y, z, length, yaw, rng) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), n = Math.ceil(length * 2.2);
  for (let i = 0; i < n; i++) {
    const off = (i + 0.5) / n * length - length / 2, h = rng.range(0.16, 0.72);
    k.solid.cone(rng.range(0.035, 0.085), h, 5, x + cy * off, y - h / 2, z - sy * off, P.ice, 0, Math.PI);
  }
  k.solid.box(length, 0.13, 0.23, x, y + 0.04, z, P.snow, yaw);
}

export function lantern(k, x, y, z, yaw = 0, large = false) {
  const r = large ? 0.25 : 0.15;
  k.solid.box(r * 2.3, r * 0.35, r * 2.3, x, y - r, z, P.iron, yaw);
  k.solid.cone(r * 1.8, r, 4, x, y + r * 1.6, z, P.iron, yaw + Math.PI / 4);
  for (const dx of [-r, r]) for (const dz of [-r, r]) k.solid.box(0.035, r * 2.6, 0.035, x + dx, y + r * 0.2, z + dz, P.iron);
  k.live.cyl(r * 0.72, r * 0.72, r * 1.8, 8, x, y + r * 0.1, z, [0.30, 0.24, 0.17]);
  k.live.pane(r * 3.0, r * 3.6, x, y, z + r, PANE_LAMP, yaw, 0, 4, 4);
}

export function brazier(k, api, x, z, tall = false) {
  const g = groundY(api, x, z) + ON_APRON, h = tall ? 1.35 : 0.65;
  cylinder(k, api, 0.58, 0.26, x, g + 0.13, z, P.darkStone);
  k.solid.cyl(0.24, 0.37, h, 8, x, g + h / 2 + 0.20, z, P.iron);
  k.solid.cyl(0.56, 0.32, 0.42, 10, x, g + h + 0.28, z, P.iron);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    k.solid.box(0.05, 0.50, 0.05, x + Math.cos(a) * 0.43, g + h + 0.40, z + Math.sin(a) * 0.43, P.iron, a);
  }
  glowColumn(k.live, x, g + h + 0.27, z, 0.34, 0.87, 0.25);
  k.live.pane(0.75, 0.75, x, g + h + 0.37, z, PANE_LAMP, 0, -Math.PI / 2, 5, 5);
  api.emit({ kind: 'circle', x, z, r: 0.54, y0: g + 0.2, y1: g + h + 0.64, tag: 'metal', standable: true });
}

export function statue(k, api, x, z, yaw = 0, size = 1) {
  const g = groundY(api, x, z) + ON_APRON;
  cylinder(k, api, 1.12 * size, 0.45 * size, x, g + 0.225 * size, z, P.darkStone);
  cylinder(k, api, 0.90 * size, 0.22 * size, x, g + 0.55 * size, z, P.edge);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const pos = (px, py, pz) => [x + (px * cy + pz * sy) * size, g + py * size, z + (-px * sy + pz * cy) * size];
  k.solid.cyl(0.38 * size, 0.69 * size, 2.4 * size, 12, ...pos(0, 1.86, 0), P.stone, yaw);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    k.solid.cyl(0.028 * size, 0.13 * size, 2.1 * size, 5, ...pos(Math.cos(a) * 0.39, 1.76, Math.sin(a) * 0.39), shade(P.edge, i % 2 ? 0.85 : 0.65), yaw);
  }
  k.solid.cyl(0.51 * size, 0.42 * size, 0.85 * size, 10, ...pos(0, 3.18, 0), P.stone, yaw);
  k.solid.cone(0.54 * size, 0.76 * size, 10, ...pos(0, 3.72, -0.03), P.stone, yaw);
  k.solid.cyl(0.24 * size, 0.19 * size, 0.46 * size, 9, ...pos(0, 3.19, 0.36), P.darkStone, yaw);
  for (const side of [-1, 1]) {
    k.solid.cyl(0.24 * size, 0.31 * size, 1.15 * size, 8, ...pos(side * 0.48, 2.68, 0.08), P.stone, yaw, 0, side * 0.40);
    k.solid.cyl(0.13 * size, 0.17 * size, 0.6 * size, 8, ...pos(side * 0.26, 2.28, 0.46), P.edge, yaw, Math.PI / 2, side * 0.45);
  }
  crescent(k.solid, ...pos(0, 3.91, -0.04), 0.99 * size, yaw, P.edge, 0.13 * size);
  api.emit({ kind: 'circle', x, z, r: 0.70 * size, y0: g + 0.59 * size, y1: g + 4.0 * size, tag: 'stone', standable: false });
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, [cx, yy, cz] = pos(Math.cos(a) * 0.95, 0.57, Math.sin(a) * 0.95);
    k.solid.cyl(0.047, 0.051, 0.17 + i % 3 * 0.05, 6, cx, yy + 0.10, cz, P.paper);
    k.live.cyl(0.019, 0.027, 0.053, 5, cx, yy + 0.24, cz, [0.35, 0.26, 0.12]);
  }
}

// A real arched opening with radial wedge stones and open sky between its legs.
export function arch(k, api, x, z, width, spring, rise, depth, y, yaw = 0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), radius = width / 2;
  for (const side of [-1, 1]) {
    const lx = side * (radius + 0.38);
    solid(k, api, 0.76, spring, depth, x + lx * cy, y + spring / 2, z - lx * sy, P.stone, yaw);
    k.solid.box(1.00, 0.28, depth + 0.24, x + lx * cy, y + spring - 0.06, z - lx * sy, P.edge, yaw);
  }
  // Filled spandrels carry the curve into the level street above. Without this
  // masonry the arch is a bent beam with open triangular holes above it.
  const fill = new THREE.Shape(), span = radius + 0.73, top = rise + 0.60;
  fill.moveTo(-span, 0); fill.lineTo(-radius, 0);
  for (let i = 1; i <= 24; i++) {
    const a = i / 24 * Math.PI; fill.lineTo(-Math.cos(a) * radius, Math.sin(a) * rise);
  }
  fill.lineTo(span, 0); fill.lineTo(span, top); fill.lineTo(-span, top); fill.closePath();
  const fillGeo = indexed(new THREE.ExtrudeGeometry(fill, { depth: depth - 0.08, steps: 1, bevelEnabled: false }));
  fillGeo.translate(0, 0, -(depth - 0.08) / 2);
  k.solid.at(fillGeo, P.stone, x, y + spring, z, yaw);
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI, b = (i + 1) / 18 * Math.PI, s = new THREE.Shape();
    s.moveTo(Math.cos(a) * radius, Math.sin(a) * rise);
    s.lineTo(Math.cos(b) * radius, Math.sin(b) * rise);
    s.lineTo(Math.cos(b) * (radius + 0.73), Math.sin(b) * (rise + 0.60));
    s.lineTo(Math.cos(a) * (radius + 0.73), Math.sin(a) * (rise + 0.60)); s.closePath();
    const geo = indexed(new THREE.ExtrudeGeometry(s, { depth, steps: 1, bevelEnabled: false }));
    geo.translate(0, 0, -depth / 2);
    k.solid.at(geo, i % 4 === 0 ? P.darkStone : P.edge, x, y + spring, z, yaw);
  }
  const bands = 16, bw = span * 2 / bands;
  for (let i = 0; i < bands; i++) {
    const px = -span + (i + 0.5) * bw, near = Math.max(0, Math.abs(px) - bw / 2);
    const bottom = near < radius ? rise * Math.sqrt(1 - (near / radius) ** 2) : 0;
    api.emit({ kind: 'obb', x: x + px * cy, z: z - px * sy, halfX: bw / 2, halfZ: depth / 2, yaw,
      y0: y + spring + bottom, y1: y + spring + top, tag: 'wall', standable: true });
  }
}

export function path(k, api, points, width) {
  for (let j = 1; j < points.length; j++) {
    const a = points[j - 1], b = points[j], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const n = Math.ceil(length / 2.5), yaw = Math.atan2(dx, dz);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = a[0] + dx * t, z = a[1] + dz * t;
      const geo = new THREE.PlaneGeometry(width, length / n + 0.05, 2, 2), p = geo.attributes.position;
      geo.rotateX(-Math.PI / 2); geo.rotateY(yaw); geo.translate(x, 0, z);
      for (let v = 0; v < p.count; v++) p.setY(v, groundY(api, p.getX(v), p.getZ(v)) + ON_APRON + 0.018);
      geo.computeVertexNormals(); k.solid.push(geo, i % 3 ? [0.075, 0.082, 0.090] : [0.087, 0.090, 0.097]);
      for (const side of [-1, 1]) {
        const px = x + Math.cos(yaw) * width / 2 * side, pz = z - Math.sin(yaw) * width / 2 * side;
        k.solid.box(0.26, 0.13, length / n - 0.07, px, groundY(api, px, pz) + ON_APRON + 0.06, pz, P.edge, yaw);
      }
    }
  }
}

export function lowWall(k, api, x, z, length, yaw) {
  const n = Math.ceil(length / 3), cy = Math.cos(yaw), sy = Math.sin(yaw);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * length / n - length / 2, px = x + t * cy, pz = z - t * sy, g = groundY(api, px, pz);
    solid(k, api, length / n + 0.02, 0.97, 0.68, px, g + 0.47, pz, P.darkStone, yaw);
    k.solid.box(length / n + 0.09, 0.16, 0.84, px, g + 1.03, pz, P.edge, yaw);
    k.solid.box(length / n - 0.08, 0.06, 0.68, px, g + 1.14, pz, P.snow, yaw);
  }
}

export function chair(k, api, x, y, z, yaw = 0) {
  solid(k, api, 0.58, 0.12, 0.57, x, y + 0.48, z, P.wood, yaw, 'wood');
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  k.solid.box(0.59, 0.62, 0.09, x + sy * 0.24, y + 0.85, z + cy * 0.24, P.wood, yaw);
  api.emit({ kind: 'obb', x: x + sy * 0.24, z: z + cy * 0.24, halfX: 0.295, halfZ: 0.045, yaw,
    y0: y + 0.54, y1: y + 1.16, tag: 'wood', standable: true });
  for (const xx of [-0.23, 0.23]) for (const zz of [-0.22, 0.22]) k.solid.box(0.07, 0.46, 0.07, x + xx * cy + zz * sy, y + 0.23, z - xx * sy + zz * cy, P.wood, yaw);
}

export function chest(k, api, x, y, z, yaw = 0) {
  k.solid.open(); k.solid.box(0.87, 0.56, 0.60, x, y + 0.28, z, P.cutWood, yaw);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  for (const off of [-0.30, 0.30]) k.solid.box(0.055, 0.62, 0.65, x + off * cy, y + 0.30, z - off * sy, P.iron, yaw);
  k.solid.box(0.14, 0.13, 0.07, x + sy * 0.34, y + 0.30, z + cy * 0.34, P.iron, yaw);
  k.solid.close(x, z, 0.70, P.cutWood);
  api.emit({ kind: 'obb', x, z, halfX: 0.45, halfZ: 0.32, yaw, y0: y, y1: y + 0.61, tag: 'strongbox', standable: true, breakable: true });
}
