// The five guardian landmarks are horizon-scale progression monuments. Their
// upper architecture is deliberately low-poly and never distance-culled; the
// existing detailed destination group remains the near-field base and door.
// Once (and only once) the canonical reward is owned, the upper structure falls
// away and leaves a permanent breached silhouette plus stable rubble.

import * as THREE from 'three';
import { REGIONS } from './regions.js';
import { mats } from './props.js';

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (r0, r1, h, seg, mat, open = false) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat);
const cone = (r, h, seg, mat) => new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);

export const MAJOR_MONUMENT_HEIGHTS = Object.freeze({
  mill: 72,
  forge: 78,
  lighthouse: 86,
  chapel: 68,
  tower: 98,
});

function monumentMaterials(dest) {
  const R = REGIONS[dest.region];
  const stoneColor = new THREE.Color(...R.terra.cliff).multiplyScalar(0.72);
  const key = new THREE.Color(...R.key);
  return {
    stone: new THREE.MeshStandardMaterial({
      color: stoneColor, emissive: key.clone().multiplyScalar(0.08), emissiveIntensity: 0.28,
      roughness: 0.9, metalness: dest.region === 'shatter' ? 0.28 : 0.04, flatShading: true,
    }),
    dark: new THREE.MeshStandardMaterial({
      color: stoneColor.clone().multiplyScalar(0.36), emissive: key.clone().multiplyScalar(0.06),
      emissiveIntensity: 0.22, roughness: 0.96, metalness: dest.region === 'shatter' ? 0.38 : 0.08,
      flatShading: true,
    }),
    metal: new THREE.MeshStandardMaterial({
      color: key.clone().multiplyScalar(0.34), emissive: key, emissiveIntensity: 0.5,
      roughness: 0.3, metalness: 0.58, flatShading: true,
    }),
    light: new THREE.MeshBasicMaterial({
      color: key, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending,
      depthWrite: false, fog: false, toneMapped: false,
    }),
  };
}

function add(parent, mesh, x = 0, y = 0, z = 0) {
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function piece(ctx, name, x, y, z, fall, tiltX, tiltZ) {
  const group = new THREE.Group();
  group.name = `monument-${ctx.dest.id}-${name}`;
  group.position.set(x, y, z);
  ctx.structure.add(group);
  ctx.pieces.push({
    mesh: group,
    origin: group.position.clone(),
    baseRotation: group.rotation.clone(),
    fall,
    tiltX,
    tiltZ,
    delay: ctx.pieces.length * 0.055,
  });
  return group;
}

function ring(parent, radius, y, mat, tube = 0.18, rotX = Math.PI / 2) {
  const mesh = add(parent, new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 7, 32), mat), 0, y, 0);
  mesh.rotation.x = rotX;
  return mesh;
}

function registerPiers(ctx, radius, count, pierR, height, phase = 0) {
  for (let i = 0; i < count; i++) {
    const a = phase + i / count * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    // Keep the +z door lane physically clear.
    if (z > radius * 0.55 && Math.abs(x) < 2.5) continue;
    ctx.colliders.push(ctx.collide.addCircle(
      ctx.dest.x + x, ctx.dest.z + z, pierR,
      ctx.dest.y, ctx.dest.y + height,
    ));
  }
}

function buildMill(ctx) {
  const { stone, dark, metal, light } = ctx.mat;
  const tower = piece(ctx, 'granary-spine', 0, 0, -2, 46, -0.28, 0.18);
  add(tower, cyl(5.4, 7.2, 48, 10, stone), 0, 24, 0);
  for (let y = 9; y < 45; y += 9) ring(tower, 5.4 - y * 0.025, y, dark, 0.32);
  const crown = piece(ctx, 'sail-crown', 0, 52, 3.5, 62, 0.46, -0.34);
  add(crown, cyl(1.1, 1.1, 3.2, 10, metal), 0, 0, 0).rotation.x = Math.PI / 2;
  const sails = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = i / 6 * Math.PI * 2;
    const spar = add(arm, box(0.48, 25, 0.34, i % 2 ? dark : stone), 0, 12.5, 0);
    spar.rotation.z = i % 2 ? 0.015 : -0.015;
    add(arm, box(4.2, 8.6, 0.16, metal), 1.8, 17.2, 0);
    sails.add(arm);
  }
  crown.add(sails);
  ctx.animated.push({ mesh: sails, kind: 'spinZ', speed: 0.055 });
  ring(crown, 14.5, 0, light, 0.12, 0);
  for (const side of [-1, 1]) {
    const brace = piece(ctx, `buttress-${side}`, side * 8.5, 0, -2, 35, side * 0.18, side * -0.42);
    const beam = add(brace, box(2.2, 39, 2.2, dark), 0, 19.5, 0);
    beam.rotation.z = side * -0.13;
  }
  registerPiers(ctx, 8.5, 6, 1.2, 38, Math.PI / 6);
}

function buildForge(ctx) {
  const { stone, dark, metal, light } = ctx.mat;
  const core = piece(ctx, 'crucible', 0, 0, -2, 34, 0.18, -0.22);
  add(core, cyl(8.2, 10.2, 27, 12, dark), 0, 13.5, 0);
  add(core, new THREE.Mesh(new THREE.SphereGeometry(9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), stone), 0, 27, 0);
  ring(core, 9.4, 26.4, metal, 0.45);
  const chimneyHeights = [64, 76, 58, 70];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const x = Math.cos(a) * 9.5;
    const z = Math.sin(a) * 8.4 - 3;
    const h = chimneyHeights[i];
    const stack = piece(ctx, `chimney-${i}`, x, 0, z, h * 0.88, (i - 1.5) * 0.1, i % 2 ? 0.46 : -0.46);
    add(stack, cyl(1.25, 2.35, h, 8, i % 2 ? dark : stone), 0, h / 2, 0);
    for (let y = 12; y < h; y += 13) ring(stack, 1.8 - y / h * 0.38, y, metal, 0.2);
  }
  const halo = piece(ctx, 'furnace-halo', 0, 51, -3, 67, -0.34, 0.52);
  ring(halo, 15, 0, light, 0.22, 0);
  ring(halo, 10.5, 0, metal, 0.32, 0);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const tooth = add(halo, box(1, 5.8, 0.9, metal), Math.cos(a) * 12.7, Math.sin(a) * 12.7, 0);
    tooth.rotation.z = a;
  }
  registerPiers(ctx, 9.5, 4, 1.8, 30, Math.PI / 4);
}

function buildLighthouse(ctx) {
  const { stone, dark, metal, light } = ctx.mat;
  const spine = piece(ctx, 'spiral-spine', 0, 0, -1, 54, 0.22, 0.28);
  for (let i = 0; i < 8; i++) {
    const y = i * 8.2;
    const r0 = 5.3 - i * 0.35;
    const segment = add(spine, cyl(r0 - 0.28, r0, 8.35, 12, i % 2 ? dark : stone), 0, y + 4.1, 0);
    segment.rotation.y = i * 0.21;
    ring(spine, r0, y + 8.1, metal, 0.16);
  }
  const lantern = piece(ctx, 'aurora-lantern', 0, 68, -1, 78, -0.3, -0.46);
  add(lantern, cyl(4.4, 4.4, 6.6, 12, metal, true), 0, 3.3, 0);
  ring(lantern, 5.6, 0.4, dark, 0.36);
  ring(lantern, 5.6, 6.1, dark, 0.36);
  const lens = add(lantern, new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), light), 0, 3.3, 0);
  lens.scale.y = 1.35;
  const crown = add(lantern, cone(6.2, 11, 12, dark), 0, 11.6, 0);
  crown.rotation.y = Math.PI / 12;
  for (let i = 0; i < 3; i++) {
    const beam = add(lantern, box(0.16, 0.16, 38, light), 0, 3.3 + i * 0.35, 0);
    beam.rotation.y = i * Math.PI / 3;
  }
  ctx.animated.push({ mesh: lantern, kind: 'turnY', speed: 0.12 });
  registerPiers(ctx, 4.2, 8, 0.9, 35, Math.PI / 8);
}

function buildChapel(ctx) {
  const { stone, dark, metal, light } = ctx.mat;
  const nave = piece(ctx, 'drowned-nave', 0, 0, -4, 42, 0.22, -0.18);
  for (let z = -13; z <= 13; z += 6.5) {
    for (const side of [-1, 1]) {
      const buttress = add(nave, box(1.4, 31, 1.7, side < 0 ? dark : stone), side * 8.5, 15.5, z);
      buttress.rotation.z = side * -0.12;
    }
    const rib = add(nave, new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.56, 7, 20, Math.PI), stone), 0, 23, z);
    rib.rotation.z = Math.PI;
  }
  const twin = [-1, 1].map((side) => {
    const spire = piece(ctx, `fungal-spire-${side}`, side * 6.4, 0, -8, 58 + side * 5, side * 0.38, side * -0.42);
    add(spire, cyl(1.5, 3.8, 49 + side * 4, 9, side < 0 ? dark : stone), 0, 24, 0);
    const cap = add(spire, new THREE.Mesh(new THREE.SphereGeometry(7.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal), 0, 49, 0);
    cap.scale.y = 0.48;
    ring(spire, 5.2, 51, light, 0.15);
    return spire;
  });
  const rose = piece(ctx, 'rose-window', 0, 39, 5, 52, -0.52, 0.12);
  ring(rose, 6.4, 0, light, 0.24, 0);
  ring(rose, 4.2, 0, metal, 0.26, 0);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const ray = add(rose, box(0.18, 5.4, 0.2, light), Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0);
    ray.rotation.z = -a;
  }
  void twin;
  registerPiers(ctx, 9, 8, 1.05, 32);
}

function buildTower(ctx) {
  const { stone, dark, metal, light } = ctx.mat;
  for (let i = 0; i < 7; i++) {
    const y = i * 12.5;
    const r = 3.8 + i * 0.9;
    const tier = piece(ctx, `inverted-tier-${i}`, 0, y, -2, 34 + i * 9, (i % 2 ? 1 : -1) * (0.14 + i * 0.025), (i % 3 - 1) * 0.28);
    const body = add(tier, cyl(r + 0.8, r, 12.8, 9, i % 2 ? dark : stone), 0, 6.4, 0);
    body.rotation.y = i * 0.23;
    ring(tier, r + 0.8, 12, i % 3 ? metal : light, i % 3 ? 0.24 : 0.13);
  }
  const crown = piece(ctx, 'impossible-crown', 0, 88, -2, 106, -0.62, 0.48);
  for (let i = 0; i < 4; i++) {
    const r = 5 + i * 2.1;
    const q = ring(crown, r, 0, i % 2 ? light : metal, 0.17, i % 2 ? 0 : Math.PI / 2);
    q.rotation.y = i * 0.42;
  }
  const eye = add(crown, new THREE.Mesh(new THREE.OctahedronGeometry(2.8, 0), light), 0, 0, 0);
  eye.scale.y = 2.1;
  ctx.animated.push({ mesh: crown, kind: 'turnY', speed: -0.09 });
  registerPiers(ctx, 6.4, 8, 1.0, 38, Math.PI / 8);
}

const BUILDERS = { mill: buildMill, forge: buildForge, lighthouse: buildLighthouse, chapel: buildChapel, tower: buildTower };

function buildRubble(ctx) {
  const rubble = new THREE.Group();
  rubble.name = `monument-${ctx.dest.id}-rubble`;
  rubble.visible = false;
  for (let i = 0; i < 20; i++) {
    const a = i * 2.399963;
    const r = 3.8 + (i % 6) * 1.45;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r - 1.5;
    if (z > 4 && Math.abs(x) < 3) continue;
    const chunk = add(rubble, new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + (i % 4) * 0.22, 0), i % 3 ? ctx.mat.stone : ctx.mat.dark), x, 0.25 + (i % 3) * 0.22, z);
    chunk.scale.set(1.5, 0.55, 1.05);
    chunk.rotation.set(i * 0.27, a, i * -0.18);
  }
  // A split halo makes the completed state readable without sealing the door.
  for (const side of [-1, 1]) {
    const jaw = add(rubble, new THREE.Mesh(new THREE.TorusGeometry(5.1, 0.38, 7, 16, Math.PI * 0.72), ctx.mat.metal), side * 2.9, 2.2, 3.1);
    jaw.rotation.set(0, 0, side < 0 ? 1.9 : -1.9);
    jaw.scale.set(0.72, 1, 1);
  }
  ctx.group.add(rubble);
  return rubble;
}

export function buildMajorMonument(scene, group, dest, collide) {
  const build = BUILDERS[dest.id];
  if (!build) return null;
  const structure = new THREE.Group();
  structure.name = `monument-${dest.id}`;
  group.add(structure);
  const ctx = {
    scene, group, structure, dest, collide,
    mat: monumentMaterials(dest),
    pieces: [], colliders: [], animated: [],
  };
  build(ctx);
  const rubble = buildRubble(ctx);
  structure.traverse((o) => {
    if (o.isMesh) {
      o.frustumCulled = true;
      o.castShadow = o.position.y < 45;
      o.receiveShadow = true;
    }
  });
  return {
    id: dest.id,
    dest,
    structure,
    rubble,
    pieces: ctx.pieces,
    colliders: ctx.colliders,
    animated: ctx.animated,
    height: MAJOR_MONUMENT_HEIGHTS[dest.id],
    collapseT: 0,
    collapsing: false,
    settled: false,
  };
}

export function beginMonumentCollapse(site) {
  if (!site || site.collapsing || site.settled) return false;
  site.collapsing = true;
  site.collapseT = 0;
  for (const collider of site.colliders) collider.dead = true;
  return true;
}

function applyCollapse(site, rawT) {
  const t = THREE.MathUtils.clamp(rawT, 0, 1);
  for (const p of site.pieces) {
    const local = THREE.MathUtils.clamp((t - p.delay) / Math.max(0.01, 1 - p.delay), 0, 1);
    const eased = local * local * (3 - 2 * local);
    p.mesh.position.set(p.origin.x, p.origin.y - p.fall * eased, p.origin.z);
    p.mesh.rotation.set(
      p.baseRotation.x + p.tiltX * eased,
      p.baseRotation.y + Math.sin(eased * Math.PI) * p.tiltZ * 0.18,
      p.baseRotation.z + p.tiltZ * eased,
    );
  }
  site.rubble.visible = t > 0.18;
  const rubbleScale = THREE.MathUtils.clamp((t - 0.18) / 0.38, 0, 1);
  site.rubble.scale.setScalar(0.82 + rubbleScale * 0.18);
}

export function settleMonument(site) {
  if (!site) return;
  site.collapsing = false;
  site.settled = true;
  site.collapseT = 1;
  for (const collider of site.colliders) collider.dead = true;
  applyCollapse(site, 1);
}

export function updateMonument(site, dt, t) {
  if (!site) return false;
  if (!site.collapsing && !site.settled) {
    for (const a of site.animated) {
      if (a.kind === 'spinZ') a.mesh.rotation.z += dt * a.speed;
      else if (a.kind === 'turnY') a.mesh.rotation.y += dt * a.speed;
    }
  }
  if (!site.collapsing) return false;
  site.collapseT = Math.min(1, site.collapseT + dt / 3.4);
  applyCollapse(site, site.collapseT);
  if (site.collapseT >= 1) {
    site.collapsing = false;
    site.settled = true;
  }
  // The caller uses this to emit dust and shake only while motion is active.
  return site.collapsing || site.collapseT >= 1;
}

export function monumentCollapseProgress(site) {
  return site?.collapseT || 0;
}
