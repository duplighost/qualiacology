// The mansions have grounds: two different histories, working service routes and
// deliberately open approach lanes. All geometry merges into their existing body.
import * as THREE from 'three';
import { kits, groundY, GLOW, PANE_LAMP } from './sites.js';

const STONE = [0.123, 0.127, 0.115], DARK = [0.033, 0.039, 0.035];
const WOOD = [0.108, 0.073, 0.048], RUST = [0.161, 0.067, 0.042];
const IRON = [0.052, 0.059, 0.064], CLOTH = [0.225, 0.206, 0.172];
const GREEN = [0.055, 0.098, 0.068], TRIM = [0.185, 0.168, 0.132];

function solid(k, a, x, z, w, d, base, h, colour = WOOD,
  tag = 'wood', standable = true, yaw = 0) {
  k.solid.box(w, h, d, x, a.padY + base + h * 0.5, z, colour, yaw);
  a.emit({ kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw,
    y0: a.padY + base, y1: a.padY + base + h, tag, standable,
    climbable: standable });
}

function beam(k, a, v, w, r = 0.065, col = IRON) {
  const d = new THREE.Vector3(w[0] - v[0], w[1] - v[1], w[2] - v[2]);
  const g = new THREE.CylinderGeometry(r, r, d.length(), 5);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((v[0] + w[0]) * 0.5, a.padY + (v[1] + w[1]) * 0.5, (v[2] + w[2]) * 0.5);
  k.solid.push(g, col);
}

const ground = (a, x, z) => groundY(a, x, z) - a.padY;

function deck(k, a, x, z, w, d, top, col = WOOD) {
  solid(k, a, x, z, w, d, top - 0.18, 0.18, col);
  for (let i = 1; i < 6; i++) k.solid.box(0.025, 0.018, d - 0.03,
    x - w * 0.5 + i * w / 6, a.padY + top - 0.004, z, DARK);
  for (const side of [-1, 1]) k.solid.box(w, 0.22, 0.12,
    x, a.padY + top - 0.25, z + side * (d * 0.5 - 0.14), IRON);
}

function lamp(k, a, x, z, y) {
  k.solid.box(0.38, 0.51, 0.34, x, a.padY + y, z, IRON);
  k.solid.cone(0.34, 0.25, 4, x, a.padY + y + 0.37, z, IRON, Math.PI * 0.25);
  for (const yaw of [0, Math.PI]) k.glow.pane(0.24, 0.33, x,
    a.padY + y, z + Math.cos(yaw) * 0.18, PANE_LAMP, yaw, 0, 4, 5);
}

function planter(k, a, x, z, w, d, h = 0.54) {
  const y = ground(a, x, z);
  solid(k, a, x, z, w, d, y, h, STONE, 'stone');
  k.solid.box(w - 0.15, 0.04, d - 0.15, x, a.padY + y + h + 0.01, z, DARK);
  for (let i = 0; i < 7; i++) {
    const px = x - w * 0.40 + i * w * 0.13, pz = z + Math.sin(i * 2.1) * d * 0.23;
    const top = y + h + 0.45 + (i % 3) * 0.30;
    beam(k, a, [px, y + h, pz], [px + 0.17, top, pz], 0.023, GREEN);
    beam(k, a, [px + 0.13, top - 0.15, pz], [px - 0.21, top + 0.09, pz + 0.10], 0.018, WOOD);
  }
}

function bench(k, a, x, z, yaw = 0) {
  const y = ground(a, x, z), c = Math.cos(yaw), s = Math.sin(yaw);
  solid(k, a, x, z, 2.9, 0.65, y + 0.40, 0.14, WOOD, 'wood', true, yaw);
  for (const side of [-1, 1]) k.solid.box(0.18, 0.42, 0.50,
    x + side * 1.1 * c, a.padY + y + 0.21, z - side * 1.1 * s, IRON, yaw);
  solid(k, a, x + 0.29 * s, z + 0.29 * c, 2.9, 0.08,
    y + 0.53, 0.55, WOOD, 'wood', false, yaw);
}

function path(k, a, points, width = 2.7) {
  for (let p = 0; p < points.length - 1; p++) {
    const [x0, z0] = points[p], [x1, z1] = points[p + 1];
    const length = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(length / 1.7);
    const yaw = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      k.solid.box(width, 0.045, length / n * 0.91, x,
        groundY(a, x, z) + 0.025, z, i % 4 ? STONE : IRON, yaw);
    }
  }
}

function fountain(k, a, x, z, radius, modern = false) {
  const y = ground(a, x, z), n = modern ? 12 : 18;
  // Low basin floor holds the player; the separate wall sections are honest
  // knee-high edges, and one broken-out bay gives a direct way in.
  const g = new THREE.CylinderGeometry(radius, radius, 0.14, n);
  g.translate(x, a.padY + y + 0.07, z); k.solid.push(g, DARK);
  a.emit({ kind: 'circle', x, z, r: radius, y0: a.padY + y,
    y1: a.padY + y + 0.14, tag: 'stone', standable: true });
  for (let i = 0; i < n; i++) {
    if (i === Math.floor(n * 0.25)) continue;
    const ang = i / n * Math.PI * 2, xx = x + Math.cos(ang) * radius,
      zz = z + Math.sin(ang) * radius;
    solid(k, a, xx, zz, radius * 2 * Math.sin(Math.PI / n) + 0.10, 0.34,
      y, 0.52, i % 4 ? STONE : TRIM, 'stone', true, Math.PI * 0.5 - ang);
  }
  if (modern) {
    solid(k, a, x, z, 1.85, 1.85, y + 0.14, 0.32, IRON, 'stone');
    for (const side of [-1, 1]) solid(k, a, x + side * 0.39, z,
      0.13, 0.90, y + 0.46, 2.4 - (side > 0 ? 0.3 : 0), GREEN, 'metal', false);
    k.solid.box(1.28, 0.13, 0.90, x, a.padY + y + 2.57, z, GREEN);
  } else {
    k.solid.cyl(0.40, 0.68, 1.9, 10, x, a.padY + y + 1.08, z, STONE);
    a.emit({ kind: 'circle', x, z, r: 0.68, y0: a.padY + y + 0.14,
      y1: a.padY + y + 2.03, tag: 'stone', climbable: false });
    k.solid.tube(1.5, 0.83, 0.30, 16, x, a.padY + y + 2.12, z, GREEN);
    // A headless stone figure whose missing face is readable from the garden gate.
    k.solid.cone(0.46, 1.25, 7, x, a.padY + y + 2.83, z, STONE);
    k.solid.box(0.52, 0.36, 0.38, x, a.padY + y + 3.40, z, STONE);
    for (const side of [-1, 1]) beam(k, a, [x + side * 0.23, y + 3.35, z],
      [x + side * 0.91, y + 3.02, z], 0.10, STONE);
  }
}

function serviceClimb(k, a, side, style) {
  // Wide repair treads, separate risers and real timber supports: a route a player
  // can see all the way to its destination, with ample flat space at the roof edge.
  const x = side * 31.66, startZ = 11.2, n = 12, end = 10.88;
  const low = ground(a, x, startZ + 1.65) + 0.58;
  const stages = [];
  for (let i = 0; i < n; i++) {
    const z = startZ - i * 1.14, top = low + (end - low) * i / (n - 1);
    deck(k, a, x, z, 2.38, 1.44, top, i % 3 ? WOOD : IRON);
    for (const sx of [-1, 1]) {
      const xx = x + sx * 0.98, gy = ground(a, xx, z), h = Math.max(0.2, top - gy - 0.18);
      k.solid.box(0.12, h, 0.12, xx, a.padY + gy + h * 0.5, z, IRON);
      if (i > 0) beam(k, a, [xx, stages[i - 1].y - a.padY - 0.25, z + 1.14],
        [xx, top - 0.25, z], 0.055, RUST);
    }
    k.solid.box(2.13, 0.06, 0.07, x, a.padY + top - 0.03, z + 0.69, TRIM);
    stages.push({ x, z, y: a.padY + top });
  }
  const endZ = startZ - (n - 1) * 1.14;
  // The final landing extends 0.65m onto the actual hip roof. The last step,
  // landing and root's roof support form one continuous physical route.
  deck(k, a, side * 31.20, endZ - 0.54, 3.1, 2.38, end);
  const outside = side * 32.74;
  solid(k, a, outside, endZ - 0.54, 0.09, 2.38, end, 1.05, IRON, 'metal', false);
  lamp(k, a, outside, endZ - 1.45, end + 0.65);
  // A salvage store at the foot gives the scaffolding a reason to be here.
  const gy = ground(a, side * 35.2, 6.8);
  for (let i = 0; i < 4; i++) solid(k, a, side * 35.2, 6.8, 1.72, 3.3,
    gy + i * 0.22, 0.20, i & 1 ? WOOD : IRON);
  a.site.parkourRoute = {
    kind: style + '-roof-restoration', space: 'local',
    approach: { x, z: startZ + 1.80, y: groundY(a, x, startZ + 1.80) },
    target: { x, z: endZ, y: a.padY + end },
    crown: { x: side * 29.6, z: endZ - 0.54, y: a.padY + end + 0.24 },
    stages,
  };
}

function blackthorn(api) {
  const k = kits();
  serviceClimb(k, api, -1, 'blackthorn');
  // The west lawn is an enclosed mourning garden; its fountain and pergola
  // answer the mansion's formal rooms. The central arrival/stair lane stays clear.
  path(k, api, [[-5.3, 23.0], [-11, 25], [-20, 25], [-29, 18], [-31.66, 13]]);
  fountain(k, api, -20, 26.5, 3.5);
  for (const z of [20.5, 32.4]) planter(k, api, -20, z, 11.0, 1.18, 0.52);
  bench(k, api, -26.0, 26.3, Math.PI * 0.5);
  bench(k, api, -13.9, 26.3, -Math.PI * 0.5);
  // Trellis outside the house, made of open bays you can actually pass through.
  for (let i = 0; i < 5; i++) {
    const z = -19.5 + i * 4.4;
    for (const x of [33.3, 37.3]) {
      const y = ground(api, x, z);
      solid(k, api, x, z, 0.22, 0.22, y, 3.6, WOOD, 'wood', false);
      if (i < 4) beam(k, api, [x, y + 3.35, z], [x, y + 3.35, z + 4.4], 0.10, WOOD);
    }
    const y = ground(api, 35.3, z);
    beam(k, api, [33.0, y + 3.58, z], [37.6, y + 3.58, z], 0.10, WOOD);
  }
  // A rear garden room surrounds a low broken sundial. Door-sized gaps on every
  // side keep this a place to investigate and circle rather than an obstacle.
  const x = -14.0, z = -33.0, gy = ground(api, x, z);
  deck(k, api, x, z, 8.4, 7.2, gy + 0.28, STONE);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const px = x + sx * 3.65, pz = z + sz * 3.05;
    solid(k, api, px, pz, 0.56, 0.56, gy + 0.28, 4.3, STONE, 'stone', false);
    k.solid.cone(0.62, 1.0, 4, px, api.padY + gy + 5.06, pz, GREEN, Math.PI * 0.25);
    beam(k, api, [px, gy + 4.5, pz], [x, gy + 5.35, z], 0.12, WOOD);
  }
  solid(k, api, x, z, 1.15, 1.15, gy + 0.28, 1.0, STONE, 'stone');
  k.solid.cyl(0.87, 0.75, 0.12, 12, x, api.padY + gy + 1.33, z, GREEN);
  k.solid.cone(0.36, 0.83, 3, x + 0.07, api.padY + gy + 1.79, z, IRON, 0, 0, -0.4);
  for (const sx of [-1, 1]) bench(k, api, x + sx * 5.3, z,
    sx > 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
  path(k, api, [[-31.7, -3], [-34, -23], [-24, -30], [-14,-29]]);
  lamp(k, api, -10.2, -29.9, gy + 3.1);
  // Facade trim remains shallow: it deepens the window bays without forming
  // invisible walls outside actual windows or existing door openings.
  for (const x of [-27, -20, -13, 12, 19, 27]) {
    for (const y of [3.45, 7.65]) {
      k.solid.box(2.5, 0.12, 0.30, x, api.padY + y, 16.34, STONE);
      for (const side of [-1, 1]) k.solid.box(0.12, 2.45, 0.16,
        x + side * 1.23, api.padY + y + 1.28, 16.29, TRIM);
    }
  }
  return { solid: k.solid.build(), glow: k.glow.build(), glowColour: GLOW.lamp };
}

function avery(api) {
  const k = kits();
  serviceClimb(k, api, 1, 'avery');
  // The family estate's west terrace has a dry pool, garden furniture left for
  // a party, and a potting court. Its spare concrete shapes differ from Blackthorn.
  path(k, api, [[-5.3, 23], [-14, 25], [-22, 27], [-30, 20], [-34, 8]]);
  fountain(k, api, -21, 27.5, 3.6, true);
  for (const z of [22.1, 33.0]) planter(k, api, -21, z, 10.6, 0.85, 0.38);
  for (const x of [-27.2, -14.8]) bench(k, api, x, 28,
    x < -20 ? Math.PI * 0.5 : -Math.PI * 0.5);
  // The back terrace is large enough to walk around its table; chairs are placed
  // along its long edges, not in the routes from either end.
  const tx = 10.5, tz = -31.5, gy = ground(api, tx, tz);
  deck(k, api, tx, tz, 13.2, 8.3, gy + 0.24, STONE);
  solid(k, api, tx, tz, 5.0, 1.4, gy + 1.02, 0.13, WOOD);
  for (const x of [8.5, 12.5]) for (const z of [-31.95, -31.05])
    k.solid.box(0.12, 0.79, 0.12, x, api.padY + gy + 0.63, z, IRON);
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = 8.7 + i * 1.8, z = tz + side * 1.55;
    solid(k, api, x, z, 0.66, 0.66, gy + 0.62, 0.10, WOOD);
    solid(k, api, x, z + side * 0.30, 0.63, 0.08, gy + 0.72, 0.67, WOOD, 'wood', false);
    for (const dx of [-0.24, 0.24]) k.solid.box(0.055, 0.42, 0.055,
      x + dx, api.padY + gy + 0.44, z, IRON);
  }
  for (let i = 0; i < 6; i++) {
    const x = 8.4 + (i % 3) * 1.7, z = tz + (i < 3 ? -0.37 : 0.37);
    k.solid.cyl(0.15, 0.15, 0.035, 10, x, api.padY + gy + 1.175, z, CLOTH);
    k.solid.cyl(0.052, 0.058, 0.15, 7, x + 0.28, api.padY + gy + 1.24, z, GREEN);
  }
  // All six place settings are still laid. The seventh chair is turned toward
  // the house at a distance, a composition the player can notice without a popup.
  bench(k, api, 10.5, -37.4, Math.PI);
  for (const x of [4.4, 16.6]) {
    solid(k, api, x, -35.1, 0.16, 0.16, gy + 0.24, 3.5, IRON, 'metal', false);
    lamp(k, api, x, -35.1, gy + 3.46);
  }
  beam(k, api, [4.4, gy + 3.65, -35.1], [16.6, gy + 3.65, -35.1], 0.04, IRON);
  path(k, api, [[31.66, -2], [34, -23], [22, -30], [17,-31.5]]);
  // Potting bench on the west service path, with shelves, pots, boards and
  // proper low climb surfaces. They are distinct from the bed inside the house.
  const py = ground(api, -35, -9);
  solid(k, api, -35, -9, 1.10, 5.5, py + 0.82, 0.14, WOOD);
  for (const z of [-11.2, -6.8]) k.solid.box(0.12, 0.82, 0.12,
    -35, api.padY + py + 0.41, z, IRON);
  for (let i = 0; i < 7; i++) {
    const z = -11.1 + i * 0.71;
    k.solid.tube(0.19, 0.13, 0.33, 7, -35, api.padY + py + 1.13, z, RUST);
    if (i & 1) beam(k, api, [-35, py + 1.30, z], [-34.8, py + 1.95, z], 0.022, GREEN);
  }
  return { solid: k.solid.build(), glow: k.glow.build(), glowColour: GLOW.lamp };
}

export const DRESS = Object.freeze({ 'blackthorn-manor': blackthorn, 'avery-house': avery });
