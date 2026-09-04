// CURFEW — Round 9 destination compounds, east/shore subset.
//
// These are additions to the existing authored destinations, not replacement shells and
// not roadside sheds promoted into map pins. Each one turns the short route from the road
// into a place-sized sequence around the real completion fixture. The base builders keep
// ownership of the tower/mast/barn, claim points and moving pieces; this dress owns the
// surrounding work that makes those objects belong to a substantial compound.

import * as THREE from 'three';
import { C, GLOW, kits, groundY, glowColumn, PANE_LAMP } from './sites.js';

const PI = Math.PI;

function post(k, api, x, z, h, col = C.wood, r = 0.12) {
  const y = groundY(api, x, z);
  k.solid.cyl(r * 0.78, r, h, 7, x, y + h * 0.5, z, col);
  api.emit({ kind: 'circle', x, z, r: r + 0.04, y0: y - 0.2, y1: y + h,
    tag: col === C.metal || col === C.rust ? 'metal' : 'wood' });
  return y;
}

function crate(k, api, x, z, yaw = 0, col = C.wood) {
  const y = groundY(api, x, z);
  k.solid.box(1.45, 0.82, 1.05, x, y + 0.41, z, col, yaw);
  k.solid.box(1.49, 0.08, 1.09, x, y + 0.84, z, C.dark, yaw);
  for (const s of [-1, 1]) k.solid.box(0.10, 0.86, 1.10, x + s * 0.55 * Math.cos(yaw),
    y + 0.43, z - s * 0.55 * Math.sin(yaw), C.plank, yaw);
  api.emit({ kind: 'obb', x, z, halfX: 0.73, halfZ: 0.53, yaw,
    y0: y - 0.2, y1: y + 0.88, tag: 'wood', standable: true });
}

/** A visible horizontal service platform and its exact top collision. */
function platform(k, api, x, z, w, d, top, col = C.plank, yaw = 0,
  tag = 'wood', supports = true) {
  k.solid.box(w, 0.16, d, x, top - 0.08, z, col, yaw);
  api.emit({ kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw,
    y0: top - 0.16, y1: top, tag, standable: true });
  if (!supports) return;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const lx = sx * (w * 0.5 - 0.18), lz = sz * (d * 0.5 - 0.18);
    const px = x + lx * c + lz * s, pz = z - lx * s + lz * c;
    const gy = groundY(api, px, pz), h = Math.max(0.22, top - 0.16 - gy);
    k.solid.box(0.11, h, 0.11, px, gy + h * 0.5, pz,
      tag === 'metal' ? C.rust : C.wood);
  }
}

function routeStud(k, api, x, z, col = C.rust) {
  const y = groundY(api, x, z);
  k.solid.box(0.38, 0.07, 0.70, x, y + 0.035, z, col);
}

function rail(k, api, x0, z0, x1, z1, yOff = 0.86, col = C.rust) {
  const mx = (x0 + x1) * 0.5, mz = (z0 + z1) * 0.5;
  const gy = Math.min(groundY(api, x0, z0), groundY(api, x1, z1));
  const len = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(-(z1 - z0), x1 - x0);
  k.solid.box(len, 0.10, 0.10, mx, gy + yOff, mz, col, yaw);
}

/** Slender visible brace between two world-height local points; it adds no phantom collider. */
function brace(k, a, b, r = 0.05, col = C.rust, seg = 6) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize(),
  ));
  g.translate((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
  k.solid.push(g, col);
}

function relay(api) {
  const k = kits();
  // A 44 x 40 m radio yard. Its middle stays open from the road frame to the real mast
  // cabinet, then forks left to the powered equipment refuge and right through the noisy
  // transformer bank. Nothing is a blank facade: every mass says what this place did.
  for (let i = 0; i < 9; i++) routeStud(k, api, (i & 1) ? 0.65 : -0.65, 24 - i * 2.45,
    i < 5 ? C.rust : C.metal);

  // Transformer court: steel gantry, three oil cans and porcelain stacks.
  for (const x of [7.0, 14.0]) {
    post(k, api, x, -2.0, 7.2, C.metal, 0.22);
    post(k, api, x, -10.0, 7.2, C.metal, 0.22);
    rail(k, api, x, -2.0, x, -10.0, 6.6, C.metal);
  }
  rail(k, api, 7.0, -2.0, 14.0, -2.0, 6.6, C.metal);
  rail(k, api, 7.0, -10.0, 14.0, -10.0, 6.6, C.metal);
  for (let i = 0; i < 3; i++) {
    const x = 8.2 + i * 2.35, z = -6.0 + (i & 1) * 0.55;
    const y = groundY(api, x, z);
    k.solid.cyl(0.68, 0.72, 2.45, 10, x, y + 1.22, z, i === 1 ? C.rust : C.dark);
    k.solid.tube(0.78, 0.78, 0.12, 10, x, y + 2.42, z, C.metal);
    for (const sx of [-0.34, 0.34]) {
      for (let n = 0; n < 4; n++) k.solid.cyl(0.19, 0.25, 0.13, 8,
        x + sx, y + 2.60 + n * 0.14, z, C.plaster);
    }
    // The porcelain stacks make an irregular crown, not a phantom circular floor.
    api.emit({ kind: 'circle', x, z, r: 0.76, y0: y - 0.2, y1: y + 3.09,
      tag: 'metal', climbable: false });
  }

  // Cable yard on the opposite side: drums and an open rack make this a compound even
  // before the player reaches the little refuge hut.
  for (const [x, z, r] of [[-15, -5, 1.35], [-11.8, -7.4, 1.05], [-16.2, 0.3, 0.90]]) {
    const y = groundY(api, x, z);
    k.solid.cyl(r, r, 0.42, 12, x, y + r, z, C.wood, 0, 0, PI * 0.5);
    k.solid.cyl(r * 0.72, r * 0.72, 0.48, 12, x, y + r, z, C.dark, 0, 0, PI * 0.5);
    api.emit({ kind: 'obb', x, z, halfX: 0.34, halfZ: r, yaw: 0,
      y0: y - 0.2, y1: y + r * 2, tag: 'wood', climbable: false });
  }
  for (const x of [-18.0, -10.0]) post(k, api, x, 4.0, 4.6, C.rust, 0.16);
  rail(k, api, -18.0, 4.0, -10.0, 4.0, 4.25, C.rust);
  rail(k, api, -18.0, 4.0, -10.0, 4.0, 2.15, C.metal);
  crate(k, api, -13.8, 4.4, 0.08, C.rust);

  // A transformer technician's stair rises beside, never through, the open mast route.
  // Four braced equipment stages reach a real service catwalk fixed to the existing front
  // gantry posts. Transformer porcelain and cable reels remain honest non-floors.
  const relayTop = groundY(api, 10.5, -2.0) + 3.18;
  platform(k, api, 10.5, -2.0, 7.20, 1.34, relayTop, C.metal, 0, 'metal', false);
  for (const x of [7.1, 13.9]) {
    const gy = groundY(api, x, -2.0), h = relayTop - 0.16 - gy;
    k.solid.box(0.16, h, 0.16, x, gy + h * 0.5, -2.0, C.rust);
  }
  const relayStages = [];
  const relayX = 7.25, relayCount = 4;
  const relayLow = groundY(api, relayX, 3.55) + 0.72;
  for (let i = 0; i < relayCount; i++) {
    const z = 2.42 - i * 1.08;
    const top = relayLow + (relayTop - 0.62 - relayLow) * (i / (relayCount - 1));
    platform(k, api, relayX, z, 1.42, 1.18, top,
      i & 1 ? C.rust : C.metal, 0, 'metal', true);
    k.solid.box(0.32, 0.24, 0.18, relayX + 0.48, top - 0.28, z,
      i % 3 ? C.dark : C.plaster);
    relayStages.push({ x: relayX, z, y: top });
  }
  api.site.parkourRoute = {
    kind: 'relay-transformer-catwalk', space: 'local',
    approach: { x: relayX, z: 3.62, y: groundY(api, relayX, 3.62) },
    target: { x: 7.35, z: -2.0, y: relayTop },
    crown: { x: 10.5, z: -2.0, y: relayTop },
    stages: relayStages,
  };

  // A powered white indicator inside the equipment court is the visual after-state shared
  // with the real cabinet; the refuge itself provides the useful heal/rest reward.
  const cy = groundY(api, 3.2, 5.4);
  k.solid.box(1.8, 1.15, 0.55, 3.2, cy + 0.57, 5.4, C.dark);
  k.glow.pane(0.80, 0.34, 3.2, cy + 0.78, 5.70, PANE_LAMP, 0, 0, 7, 4);
  glowColumn(k.glow, 3.2, cy + 0.2, 5.72, 0.46, 2.2, 0.55);
  return { solid: k.solid.build(), glow: k.glow.build(), moving: null,
    glowColour: GLOW.white };
}

function drowned(api) {
  const k = kits();
  // The ordinary approach becomes a battered pier rather than grass ending at a tube.
  // It runs directly to the lighthouse door (+Z), with a real fork to the keeper cottage.
  for (let i = 0; i < 12; i++) {
    const z = 27 - i * 1.85, y = groundY(api, 0, z);
    k.solid.box(4.4, 0.18, 1.70, 0, y + 0.12, z, i % 3 === 0 ? C.dark : C.plank);
    api.emit({ kind: 'obb', x: 0, z, halfX: 2.2, halfZ: 0.85, yaw: 0,
      y0: y + 0.03, y1: y + 0.21, tag: 'wood', standable: true });
    if (i % 2 === 0) {
      for (const x of [-2.05, 2.05]) post(k, api, x, z, 1.20, C.wood, 0.10);
      rail(k, api, -2.05, z, -2.05, z - 1.85, 0.92, C.rust);
      rail(k, api, 2.05, z, 2.05, z - 1.85, 0.92, C.rust);
    }
  }
  // The cottage fork is a crooked run of deck and lantern cages, ending at its actual
  // closable door. Powered light from refuge.js turns this whole corner into the safe read.
  for (let i = 0; i < 6; i++) {
    const x = 2.0 + i * 1.18, z = 7.0 - i * 1.35, y = groundY(api, x, z);
    k.solid.box(2.4, 0.16, 1.45, x, y + 0.10, z, i & 1 ? C.wood : C.plank, -0.72);
    api.emit({ kind: 'obb', x, z, halfX: 1.2, halfZ: 0.725, yaw: -0.72,
      y0: y + 0.02, y1: y + 0.18, tag: 'wood', standable: true });
  }
  for (const [x, z] of [[3.1, 6.0], [6.5, 2.2]]) {
    const y = post(k, api, x, z, 2.45, C.rust, 0.12);
    k.solid.box(0.48, 0.50, 0.42, x, y + 2.16, z, C.dark);
    k.glow.pane(0.24, 0.28, x, y + 2.18, z + 0.23, PANE_LAMP, 0, 0, 4, 4);
  }

  // Winch house without another fake building: an open four-post work deck, capstan,
  // suspended chain and a wrecked skiff. It gives the shore a lateral silhouette.
  const wy = groundY(api, -11, 7);
  k.solid.box(10.5, 0.34, 6.2, -11, wy + 0.17, 7, C.dark);
  api.emit({ kind: 'obb', x: -11, z: 7, halfX: 5.25, halfZ: 3.10, yaw: 0,
    y0: wy, y1: wy + 0.34, tag: 'wood', standable: true });
  for (const x of [-15.4, -6.6]) for (const z of [4.8, 9.2]) post(k, api, x, z, 5.0, C.wood, 0.18);
  rail(k, api, -15.4, 4.8, -6.6, 4.8, 4.65, C.rust);
  rail(k, api, -15.4, 9.2, -6.6, 9.2, 4.65, C.rust);
  k.solid.cyl(1.15, 1.15, 1.10, 12, -11, wy + 0.72, 7, C.rust);
  k.solid.cyl(0.20, 0.20, 3.0, 8, -11, wy + 2.30, 7, C.metal);
  api.emit({ kind: 'circle', x: -11, z: 7, r: 1.2, y0: wy + 0.17, y1: wy + 1.27,
    tag: 'metal', standable: true });
  api.emit({ kind: 'circle', x: -11, z: 7, r: 0.22, y0: wy + 0.80, y1: wy + 3.80,
    tag: 'metal', climbable: false });

  // A shipwright stair rises from the real winch deck to a narrow catwalk carried by the
  // existing shore-house posts. The capstan barrel remains a usable low top, while its
  // thin spindle is now correctly a pole rather than an invisible 3.8 m-wide platform.
  const shoreTop = wy + 4.45;
  platform(k, api, -11.0, 4.8, 8.80, 1.14, shoreTop, C.plank, 0, 'wood', false);
  const shoreStages = [];
  const shoreX = -7.2, shoreLow = wy + 0.98;
  for (let i = 0; i < 5; i++) {
    const z = 9.28 - i * 0.94;
    const top = shoreLow + (shoreTop - 0.62 - shoreLow) * (i / 4);
    platform(k, api, shoreX, z, 1.48, 1.18, top,
      i & 1 ? C.wood : C.rust, 0, 'wood', true);
    if (i > 0) brace(k,
      [shoreX - 0.66, shoreStages[i - 1].y - 0.14, shoreStages[i - 1].z],
      [shoreX - 0.66, top - 0.14, z], 0.05, C.rust, 4);
    shoreStages.push({ x: shoreX, z, y: top });
  }
  api.site.parkourRoute = {
    kind: 'drowned-winch-catwalk', space: 'local',
    approach: { x: shoreX, z: 10.82, y: groundY(api, shoreX, 10.82) },
    mount: { x: shoreX, z: 9.95, y: wy + 0.34 },
    target: { x: shoreX, z: 4.8, y: shoreTop },
    crown: { x: -11.0, z: 4.8, y: shoreTop },
    stages: shoreStages,
  };
  k.solid.box(6.8, 1.0, 2.15, -13.0, groundY(api, -13, -1) + 0.65, -1,
    C.wood, -0.28, 0, 0.10);
  k.solid.box(5.7, 0.18, 1.6, -13.0, groundY(api, -13, -1) + 1.18, -1,
    C.dark, -0.28);
  return { solid: k.solid.build(), glow: k.glow.build(), moving: null,
    glowColour: GLOW.lamp };
}

function bell(api) {
  const k = kits();
  // The tower is now the surviving end of a 34 x 46 m roofless priory. Two broken arcades
  // make a processional aisle from the road and frame the shootable bell instead of a gate
  // clipping a white wall.
  for (const side of [-1, 1]) {
    const x = side * 9.0;
    for (let i = 0; i < 6; i++) {
      const z = 22 - i * 5.0, h = (i === 1 || i === 4) ? 4.3 : 6.1;
      const y = post(k, api, x, z, h, i & 1 ? C.brick : C.stone, 0.42);
      k.solid.box(2.0, 0.48, 1.10, x, y + h - 0.28, z, C.dark);
      if (i < 5) rail(k, api, x, z, x, z - 5.0, Math.min(h, 5.4),
        i & 1 ? C.rust : C.stone);
    }
  }
  // Transept ruins make the destination wide from the road without blocking its aisle.
  for (const side of [-1, 1]) {
    const x0 = side * 6.0, x1 = side * 17.0, z = -4.0;
    rail(k, api, x0, z, x1, z, 4.8, C.stone);
    rail(k, api, x0, z, x1, z, 2.4, C.brick);
    for (const x of [x0, side * 11.5, x1]) post(k, api, x, z, 5.2, C.stone, 0.34);
  }
  // Fallen bells and reliquary fragments are the close reward/read after ringing the real
  // bell. Their additive seams join the site's existing claim ripple.
  for (const [x, z, r] of [[-12, 7, 1.25], [13, 2, 0.95]]) {
    const y = groundY(api, x, z);
    k.solid.tube(r, r * 0.58, 1.8, 12, x, y + r * 0.72, z, C.rust, 0, 0, PI * 0.5);
    api.emit({ kind: 'obb', x, z, halfX: 0.9, halfZ: r, yaw: 0,
      y0: y - 0.2, y1: y + r * 1.6, tag: 'metal', climbable: false });
  }

  // A run of broken priory buttress plinths reaches one east-arcade capital. The stones
  // climb inward from the outer yard, leaving the processional aisle at x=0 untouched.
  // The fallen bells keep their curved silhouettes but no longer advertise phantom tops.
  const bellZ = 12.0, bellPostX = 9.0;
  const bellPostGround = groundY(api, bellPostX, bellZ);
  const bellCapTop = bellPostGround + 6.27;
  platform(k, api, bellPostX, bellZ, 1.46, 1.46, bellCapTop,
    C.stone, 0, 'stone', false);
  const bellStages = [];
  const bellStartX = 15.25, bellLow = groundY(api, 16.25, bellZ) + 0.62;
  for (let i = 0; i < 7; i++) {
    const x = bellStartX - i * 0.82;
    const top = bellLow + (bellCapTop - 0.58 - bellLow) * (i / 6);
    const gy = groundY(api, x, bellZ), h = Math.max(0.30, top - 0.16 - gy);
    k.solid.box(0.78 + (i % 2) * 0.12, h, 0.82, x, gy + h * 0.5,
      bellZ, i % 3 ? C.brick : C.stone, (i & 1) ? 0.04 : -0.04);
    platform(k, api, x, bellZ, 1.30, 1.12, top,
      i & 1 ? C.dark : C.stone, 0, 'stone', false);
    bellStages.push({ x, z: bellZ, y: top });
  }
  api.site.parkourRoute = {
    kind: 'bell-priory-buttress', space: 'local',
    approach: { x: 16.35, z: bellZ, y: groundY(api, 16.35, bellZ) },
    target: { x: bellPostX, z: bellZ, y: bellCapTop },
    crown: { x: bellPostX, z: bellZ, y: bellCapTop },
    stages: bellStages,
  };
  const ry = groundY(api, 0, 8.0);
  k.solid.box(3.2, 1.15, 1.55, 0, ry + 0.57, 8.0, C.dark);
  k.solid.box(2.65, 0.18, 1.10, 0, ry + 1.18, 8.0, C.rust, 0, 0, -0.20);
  k.glow.pane(0.42, 0.32, 0, ry + 0.72, 8.80, PANE_LAMP, 0, 0, 5, 4);
  glowColumn(k.glow, 0, ry + 0.2, 8.82, 0.36, 1.8, 0.42);
  return { solid: k.solid.build(), glow: k.glow.build(), moving: null,
    glowColour: GLOW.lamp };
}

function jackfield(api) {
  const k = kits();
  // A farm loop, not a barn alone. The arrival passes an open machinery shed and cattle
  // race, wraps around the barn, then reaches the real shotgun case at its rear lantern.
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const x = 11.5 * Math.sin(t * PI), z = 32 - t * 41;
    routeStud(k, api, x, z, i < 7 ? C.plank : C.rust);
  }

  // Open machinery barn on the east: roof, posts, thresher silhouette and belt wheels.
  const sy = groundY(api, 18, 8);
  for (const x of [12, 24]) for (const z of [1, 15]) post(k, api, x, z, 5.4, C.wood, 0.22);
  k.solid.box(13.5, 0.30, 15.5, 18, sy + 5.25, 8, C.rust);
  api.emit({ kind: 'obb', x: 18, z: 8, halfX: 6.75, halfZ: 7.75, yaw: 0,
    y0: sy + 5.10, y1: sy + 5.40, tag: 'metal', standable: true });
  k.solid.box(6.0, 1.4, 2.4, 18, sy + 0.82, 7, C.dark, -0.18);
  for (const x of [15.8, 20.2]) {
    k.solid.tube(1.45, 1.45, 0.34, 14, x, sy + 1.10, 5.65, C.metal, 0, 0, PI * 0.5);
    api.emit({ kind: 'obb', x, z: 5.65, halfX: 0.25, halfZ: 1.45, yaw: 0,
      y0: sy - 0.2, y1: sy + 2.55, tag: 'metal', climbable: false });
  }
  rail(k, api, 15.8, 5.65, 20.2, 5.65, 2.2, C.rust);

  // A line of motor housings and service stages climbs the south edge of the genuinely
  // horizontal machinery canopy. This is the one roof in this set that physically is a
  // flat steel work surface; its exact thin collider does not flatten the main barn or any
  // gable. The route is east of the barn's shotgun/rear-lantern pocket.
  const jackRoofTop = sy + 5.40;
  const jackStages = [];
  const jackX = 18.0, jackLow = groundY(api, jackX, -7.10) + 0.72;
  for (let i = 0; i < 7; i++) {
    const z = -5.95 + i * 0.92;
    const top = jackLow + (jackRoofTop - 0.58 - jackLow) * (i / 6);
    platform(k, api, jackX, z, 1.52, 1.18, top,
      i % 3 === 0 ? C.dark : C.rust, 0, 'metal', true);
    k.solid.box(0.82, Math.min(0.58, Math.max(0.24, top - groundY(api, jackX, z) - 0.22)),
      0.74, jackX, top - 0.29, z, i & 1 ? C.metal : C.dark);
    jackStages.push({ x: jackX, z, y: top });
  }
  api.site.parkourRoute = {
    kind: 'jackfield-machinery-canopy', space: 'local',
    approach: { x: jackX, z: -7.15, y: groundY(api, jackX, -7.15) },
    target: { x: jackX, z: 0.34, y: jackRoofTop },
    crown: { x: jackX, z: 4.0, y: jackRoofTop },
    stages: jackStages,
  };

  // West cattle race and water tower counterweight the existing silo and create a broad
  // farm silhouette. The centre lane stays car-wide and leads around the real barn.
  for (const x of [-26, -20, -14]) {
    for (const z of [10, 17]) post(k, api, x, z, 1.65, C.wood, 0.13);
    rail(k, api, x, 10, x, 17, 1.35, C.plank);
    rail(k, api, x, 10, x, 17, 0.72, C.wood);
  }
  for (const x of [-24, -18]) post(k, api, x, -11, 7.0, C.metal, 0.20);
  rail(k, api, -24, -11, -18, -11, 6.45, C.metal);
  const ty = groundY(api, -21, -11);
  k.solid.tube(2.65, 2.65, 4.0, 12, -21, ty + 6.5, -11, C.metal);
  k.solid.cone(2.8, 1.7, 12, -21, ty + 9.35, -11, C.rust);

  // Bale steps make the back of the barn a little traversal pocket beside the visible
  // shotgun prize rather than a dead wall. All risers are within the controller step.
  for (let i = 0; i < 5; i++) {
    const x = 8.5 + i * 1.15, z = -8.9;
    const y = groundY(api, x, z);
    for (let j = 0; j <= i; j++) {
      const yaw = 0.08 * j;
      k.solid.box(1.08, 0.44, 1.55, x, y + 0.22 + j * 0.48,
        z, j & 1 ? C.plank : C.cloth, yaw);
      api.emit({ kind: 'obb', x, z, halfX: 0.54, halfZ: 0.775, yaw,
        y0: y + j * 0.48, y1: y + 0.44 + j * 0.48,
        tag: 'wood', standable: true });
    }
  }
  for (const [x, z, yaw] of [[5.8, -11.8, 0.1], [10.5, -12.2, -0.2], [14.2, -10.5, 0.05]])
    crate(k, api, x, z, yaw, C.wood);
  return { solid: k.solid.build(), glow: k.glow.build(), moving: null,
    glowColour: GLOW.lamp };
}

export const DRESS = Object.freeze({
  relay,
  'drowned-light': drowned,
  'bell-tower': bell,
  jackfield,
});

export default DRESS;
