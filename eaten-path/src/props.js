// props.js — things people left behind. Cemetery fields, dead cars, junk
// clusters that tell small stories, humming machinery, and the twisted snag
// figures the sunlight sometimes stops hiding.
import * as THREE from 'three';
import { clamp, canvasTexture, TAU } from './util.js';

// shared palette materials (never disposed)
const M = {
  stone: new THREE.MeshLambertMaterial({ color: 0x565b54 }),
  snagwood: new THREE.MeshLambertMaterial({ color: 0x5e5244 }),
  stoneDark: new THREE.MeshLambertMaterial({ color: 0x4a4f4a }),
  ironwork: new THREE.MeshLambertMaterial({ color: 0x22201e }),
  wood: new THREE.MeshLambertMaterial({ color: 0x3a3028 }),
  woodPale: new THREE.MeshLambertMaterial({ color: 0x574a3a }),
  rust: new THREE.MeshLambertMaterial({ color: 0x4f342a }),
  rust2: new THREE.MeshLambertMaterial({ color: 0x5e4636 }),
  glass: new THREE.MeshLambertMaterial({ color: 0x0c1210 }),
  whitegoods: new THREE.MeshLambertMaterial({ color: 0x8a8d88 }),
  cloth: new THREE.MeshLambertMaterial({ color: 0x4a4f42, side: THREE.DoubleSide }),
  clothPale: new THREE.MeshLambertMaterial({ color: 0x7d7a6e, side: THREE.DoubleSide }),
  tire: new THREE.MeshLambertMaterial({ color: 0x141414 }),
  bark: new THREE.MeshLambertMaterial({ color: 0x2e2620 }),
  headlightOff: new THREE.MeshBasicMaterial({ color: 0x1a1a16 }),
  screenOff: new THREE.MeshBasicMaterial({ color: 0x0a0d0c }),
  dirt: new THREE.MeshLambertMaterial({ color: 0x241a10 }),
  moss: new THREE.MeshLambertMaterial({ color: 0x3f4a3a }),        // moss-grown ruin stone
  paleStone: new THREE.MeshLambertMaterial({ color: 0x726f64 }),
  brick: new THREE.MeshLambertMaterial({ color: 0x50372c }),
  steel: new THREE.MeshLambertMaterial({ color: 0x35393d }),
  chrome: new THREE.MeshLambertMaterial({ color: 0x5a5e60 }),
  bone: new THREE.MeshLambertMaterial({ color: 0xb2ab98 }),
  red: new THREE.MeshLambertMaterial({ color: 0x7c1a17 }),          // the recurring red thing
  flesh: new THREE.MeshLambertMaterial({ color: 0x9a8a80 }),
};

// shared MISSING-poster texture — the face wears away with depth
function missingTex(tier, rng) {
  return canvasTexture(96, 128, (g, w, h) => {
    g.fillStyle = '#c9c3ad'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#171310'; g.font = 'bold 17px Arial'; g.textAlign = 'center';
    g.fillText('MISSING', w / 2, 20);
    // photo box
    g.fillStyle = '#2a2620'; g.fillRect(18, 30, w - 36, 58);
    if (tier < 3 || rng.chance(0.5)) { // a face, until it's gone
      g.fillStyle = '#6a6258';
      g.beginPath(); g.ellipse(w / 2, 64, 15, 19, 0, 0, TAU); g.fill();
      g.fillStyle = '#2a2620';
      g.beginPath(); g.ellipse(w / 2 - 5, 60, 2, 3, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(w / 2 + 5, 60, 2, 3, 0, 0, TAU); g.fill();
    }
    g.fillStyle = '#171310'; g.font = '9px Courier New';
    const yr = [1994, 1995, 1996, 1989, 1978, 1961][Math.min(5, tier + rng.int(0, 1))];
    g.fillText('LAST SEEN', w / 2, 100);
    g.fillText('OCT ' + rng.int(1, 28) + ' ' + yr, w / 2, 112);
    if (tier >= 3 && rng.chance(0.4)) { // just tallies now
      g.fillStyle = '#171310';
      for (let k = 0; k < 12; k++) g.fillRect(14 + k * 6, 118, 2, 8);
    }
    g.globalAlpha = 0.5; g.fillStyle = '#0d0b08';
    for (let k = 0; k < 60; k++) g.fillRect(rng.float() * w, rng.float() * h, 2, 2); // foxing/stains
  });
}

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.userData.perSeg = true;
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  return m;
}
function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0, seg8 = 7) {
  const g = new THREE.CylinderGeometry(r1, r2, h, seg8);
  g.userData.perSeg = true;
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  return m;
}

// ---------------------------------------------------------------- cemetery

function buildCemetery(seg, world, flora, rng) {
  const g = new THREE.Group();
  const c = seg.clearing;
  const center = world.pointAt(seg, c.s, 0);
  const tangent = world.tangentAt(seg, c.s);
  const yaw = Math.atan2(tangent.x, tangent.z);

  // headstones — instanced, rows askew with age
  const stoneGeo = new THREE.BoxGeometry(0.5, 0.78, 0.12);
  stoneGeo.userData.perSeg = true;
  const n = rng.int(14, 24);
  const stones = new THREE.InstancedMesh(stoneGeo, M.stone, n);
  const D = new THREE.Object3D();
  let placed = 0;
  for (let row = -2; row <= 2 && placed < n; row++) {
    for (let colI = -3; colI <= 3 && placed < n; colI++) {
      if (rng.chance(0.28)) continue;
      const lx = colI * rng.range(1.5, 2.1) + rng.gauss() * 0.5;
      const lz = row * rng.range(1.8, 2.4) + rng.gauss() * 0.5;
      const r = Math.hypot(lx, lz);
      if (r > c.r * 0.72 || r < 1.6) continue;
      const x = center.x + Math.cos(yaw) * lx + Math.sin(yaw) * lz;
      const z = center.z - Math.sin(yaw) * lx + Math.cos(yaw) * lz;
      const fallen = rng.chance(0.18);
      D.position.set(x, fallen ? 0.09 : 0.36, z);
      D.rotation.set(fallen ? Math.PI / 2 * 0.94 : rng.gauss() * 0.16, yaw + rng.gauss() * 0.4, rng.gauss() * 0.12);
      const sc = rng.range(0.8, 1.25);
      D.scale.set(sc, sc, sc);
      D.updateMatrix();
      stones.setMatrixAt(placed++, D.matrix);
      if (!fallen) seg.colliders.push({ x, z, r: 0.32 });
    }
  }
  stones.count = placed;
  stones.instanceMatrix.needsUpdate = true;
  g.add(stones);

  // a couple of crosses
  for (let i = 0; i < rng.int(1, 3); i++) {
    const a = rng.float() * TAU, r = rng.range(2, c.r * 0.6);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    const cross = new THREE.Group();
    cross.add(box(0.09, 1.1, 0.09, M.woodPale, 0, 0.55, 0), box(0.5, 0.09, 0.09, M.woodPale, 0, 0.82, 0));
    cross.position.set(x, 0, z);
    cross.rotation.set(rng.gauss() * 0.2, rng.float() * TAU, rng.gauss() * 0.14);
    g.add(cross);
    seg.colliders.push({ x, z, r: 0.25 });
  }

  // partial iron fence arc
  const fenceGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.9, 4);
  fenceGeo.userData.perSeg = true;
  const nf = 22;
  const fence = new THREE.InstancedMesh(fenceGeo, M.ironwork, nf);
  const a0 = rng.float() * TAU;
  for (let i = 0; i < nf; i++) {
    const a = a0 + (i / nf) * TAU * 0.45;
    const r = c.r * 0.8;
    D.position.set(center.x + Math.cos(a) * r, 0.45, center.z + Math.sin(a) * r);
    D.rotation.set(rng.gauss() * 0.15, 0, rng.gauss() * 0.2);
    D.scale.set(1, rng.range(0.7, 1.05), 1);
    D.updateMatrix();
    fence.setMatrixAt(i, D.matrix);
  }
  fence.instanceMatrix.needsUpdate = true;
  g.add(fence);

  // gate arch where the path enters the field
  const entryS = c.s - c.r - 1;
  if (entryS > 2) {
    const p = world.pointAt(seg, entryS, 0);
    const t2 = world.tangentAt(seg, entryS);
    const ay = Math.atan2(t2.x, t2.z);
    const arch = new THREE.Group();
    arch.add(cyl(0.06, 0.08, 2.4, M.ironwork, -1.25, 1.2, 0, 5));
    arch.add(cyl(0.06, 0.08, 2.4, M.ironwork, 1.25, 1.2, 0, 5));
    const topTex = canvasTexture(256, 40, (gg, w, h) => {
      gg.fillStyle = '#1c1a18'; gg.fillRect(0, 0, w, h);
      gg.fillStyle = '#7b7666'; gg.font = 'bold 22px Georgia';
      gg.textAlign = 'center'; gg.fillText('GARDEN  OF  REST', w / 2, 28);
    });
    const topMat = new THREE.MeshLambertMaterial({ map: topTex });
    topMat.userData.perSeg = true;
    const top = box(2.9, 0.42, 0.06, topMat, 0, 2.45, 0);
    arch.add(top);
    arch.position.set(p.x, 0, p.z);
    arch.rotation.y = ay;
    arch.rotation.z = 0.03;
    g.add(arch);
    seg.colliders.push({ x: p.x + Math.cos(ay) * 1.25, z: p.z - Math.sin(ay) * 1.25, r: 0.2 });
    seg.colliders.push({ x: p.x - Math.cos(ay) * 1.25, z: p.z + Math.sin(ay) * 1.25, r: 0.2 });
  }

  // dead tree + open grave
  const dt = new THREE.Group();
  const dtA = rng.float() * TAU, dtR = c.r * rng.range(0.35, 0.6);
  const dtx = center.x + Math.cos(dtA) * dtR, dtz = center.z + Math.sin(dtA) * dtR;
  dt.add(cyl(0.14, 0.34, 5.2, M.bark, 0, 2.6, 0));
  for (let i = 0; i < 4; i++) {
    const len = rng.range(1.4, 2.6);
    const br = cyl(0.03, 0.08, len, M.bark, 0, 0, 0, 5);
    br.geometry.translate(0, len / 2, 0); // hinge at the trunk, not the midpoint
    br.position.y = rng.range(2.8, 4.8);
    br.rotation.set(rng.range(0.6, 1.2), rng.float() * TAU, 0);
    dt.add(br);
  }
  dt.position.set(dtx, 0, dtz);
  g.add(dt);
  seg.colliders.push({ x: dtx, z: dtz, r: 0.4 });

  if (rng.chance(0.6)) {
    const ga = rng.float() * TAU, gr = c.r * rng.range(0.3, 0.55);
    const gx = center.x + Math.cos(ga) * gr, gz = center.z + Math.sin(ga) * gr;
    const pit = box(0.9, 0.06, 2, new THREE.MeshBasicMaterial({ color: 0x020302 }));
    pit.material.userData = { perSeg: true };
    pit.position.set(gx, 0.03, gz);
    pit.rotation.y = rng.float() * TAU;
    const mound = box(0.8, 0.35, 1.6, M.dirt, gx + 1.1, 0.16, gz);
    mound.rotation.y = pit.rotation.y;
    g.add(pit, mound);
    seg.colliders.push({ x: gx, z: gz, r: 1.05 });
  }

  // cold still light over the field, with one or two pale moon columns
  const moon = new THREE.PointLight(0x9fb8e8, 10, c.r * 2.6, 1.8);
  moon.position.set(center.x, 7.5, center.z);
  g.add(moon);
  const nShafts = rng.int(1, 2);
  for (let i = 0; i < nShafts; i++) {
    flora.buildShaft(seg, world, c.s + rng.gauss() * c.r * 0.4, rng.gauss() * c.r * 0.4, rng.range(1.2, 2), g, false);
  }

  seg.group.add(g);
}

// ---------------------------------------------------------------- car wreck

function buildCar(seg, world, rng) {
  const s = seg.samples.length * rng.range(0.35, 0.65);
  const halfW = world.halfWidthAt(seg, s);
  const side = rng.sign();
  const p = world.pointAt(seg, s, side * (halfW - 0.4));
  const t = world.tangentAt(seg, s);
  const yaw = Math.atan2(t.x, t.z) + rng.gauss() * 0.5 + (rng.chance(0.4) ? Math.PI / 2 : 0);

  const g = new THREE.Group();
  const body = box(4.3, 0.95, 1.75, M.rust, 0, 0.62, 0);
  const cabin = box(2.1, 0.68, 1.6, M.rust2, -0.25, 1.42, 0);
  const winF = box(0.05, 0.5, 1.42, M.glass, 0.83, 1.4, 0);
  winF.rotation.z = -0.35;
  const winS = box(1.7, 0.48, 0.05, M.glass, -0.25, 1.42, 0.79);
  const winS2 = winS.clone(); winS2.position.z = -0.79;
  g.add(body, cabin, winF, winS, winS2);
  for (const [wx, wz] of [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]]) {
    const flat = rng.chance(0.5);
    const wheel = cyl(0.38, 0.38, 0.24, M.tire, wx, flat ? 0.28 : 0.38, wz, 10);
    wheel.rotation.x = Math.PI / 2;
    if (flat) wheel.scale.y = 0.75;
    g.add(wheel);
  }
  // headlights — events can light these up
  const hlGeo = new THREE.CircleGeometry(0.16, 10);
  hlGeo.userData.perSeg = true;
  const heads = [];
  for (const hz of [0.58, -0.58]) {
    const hl = new THREE.Mesh(hlGeo, M.headlightOff);
    hl.position.set(2.16, 0.72, hz);
    hl.rotation.y = Math.PI / 2;
    g.add(hl); heads.push(hl);
  }
  if (rng.chance(0.5)) { // a door hangs open
    const door = box(0.05, 0.85, 1.05, M.rust2, 0.6, 0.85, side > 0 ? -0.9 : 0.9);
    door.rotation.y = side > 0 ? -1.1 : 1.1;
    g.add(door);
    // luggage thrown out
    g.add(box(0.6, 0.25, 0.4, M.cloth, 1.4, 0.13, side > 0 ? -1.6 : 1.6));
    g.add(box(0.45, 0.2, 0.3, M.clothPale, 2.1, 0.1, side > 0 ? -2.1 : 2.1));
  }
  g.position.set(p.x, rng.range(-0.06, 0), p.z);
  g.rotation.y = yaw;
  g.rotation.z = rng.gauss() * 0.03;
  seg.group.add(g);
  seg.colliders.push({ x: p.x, z: p.z, r: 2.1 });
  seg.carData = { pos: p.clone().setY(0.8), heads, group: g, armed: true, s };
}

// ---------------------------------------------------------------- sunclear

function buildSnagFigure(rng) {
  // a twisted thing that is only ever wood — but not at first glance.
  // Pale dead timber so the camcorder lamp picks it out of the dark.
  const g = new THREE.Group();
  const spine = cyl(0.1, 0.24, 3.2, M.snagwood, 0, 1.6, 0);
  spine.rotation.z = rng.gauss() * 0.1;
  g.add(spine);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 0), M.snagwood);
  head.geometry.userData.perSeg = true;
  head.position.set(rng.gauss() * 0.08, 3.06, rng.gauss() * 0.08);
  head.scale.set(1, 1.4, 0.8);
  g.add(head);
  for (let i = 0; i < rng.int(2, 3); i++) {
    const arm = cyl(0.035, 0.08, rng.range(1.2, 1.8), M.snagwood, 0, 0, 0, 5);
    arm.geometry.translate(0, 0.6, 0);
    arm.position.y = rng.range(1.8, 2.5);
    arm.rotation.set(rng.range(-0.6, -1.9), rng.float() * TAU, 0);
    g.add(arm);
  }
  const hunch = cyl(0.08, 0.15, 1.3, M.snagwood, 0.14, 2.2, 0, 5);
  hunch.rotation.z = -0.8;
  g.add(hunch);
  return g;
}

function buildSunclear(seg, world, flora, rng) {
  const c = seg.clearing;
  const center = world.pointAt(seg, c.s, 0);
  const shaftGroup = new THREE.Group();
  const nShafts = rng.int(2, 4);
  for (let i = 0; i < nShafts; i++) {
    flora.buildShaft(seg, world, c.s + rng.gauss() * c.r * 0.5, rng.gauss() * c.r * 0.45, rng.range(1, 2.1), shaftGroup);
  }
  const sun = new THREE.PointLight(0xffd9a0, 10, c.r * 3, 1.7);
  sun.position.set(center.x + 1.5, 6.5, center.z);
  shaftGroup.add(sun);
  seg.group.add(shaftGroup);

  const snag = buildSnagFigure(rng);
  snag.visible = false;
  seg.group.add(snag);
  seg.sunData = { shaftGroup, sun, sunBaseIntensity: sun.intensity, snag, center, armed: true, r: c.r };
}

// ---------------------------------------------------------------- ruins

function ruinWall(len, hgt, mat, rng) {
  // a broken stone wall — courses of blocks, the top eaten away. One InstancedMesh.
  const bw = 0.5;
  const items = [];
  for (let x = -len / 2; x < len / 2; x += bw) {
    const colH = hgt * rng.range(0.35, 1);
    for (let y = 0; y < colH; y += 0.28) {
      if (rng.chance(0.12)) continue; // missing blocks
      items.push({ x: x + rng.gauss() * 0.02, y: y + 0.14, z: rng.gauss() * 0.03, ry: rng.gauss() * 0.05 });
    }
  }
  const g = new THREE.Group();
  if (!items.length) return g;
  const geo = new THREE.BoxGeometry(bw * 0.94, 0.26, 0.42); geo.userData.perSeg = true;
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const D = new THREE.Object3D();
  items.forEach((it, i) => { D.position.set(it.x, it.y, it.z); D.rotation.set(0, it.ry, 0); D.updateMatrix(); m.setMatrixAt(i, D.matrix); });
  m.instanceMatrix.needsUpdate = true;
  g.add(m);
  return g;
}

function buildRuin(seg, world, flora, rng) {
  const g = new THREE.Group();
  const c = seg.clearing;
  const center = world.pointAt(seg, c.s, 0);
  const t = world.tangentAt(seg, c.s);
  const yaw = Math.atan2(t.x, t.z);
  const type = rng.pick(['chapel', 'stones', 'well', 'foundation']);
  const place = (grp, lx, lz, ry = 0) => {
    grp.position.set(center.x + Math.cos(yaw) * lx + Math.sin(yaw) * lz, 0, center.z - Math.sin(yaw) * lx + Math.cos(yaw) * lz);
    grp.rotation.y = yaw + ry; g.add(grp);
  };
  const coll = (lx, lz, r) => seg.colliders.push({ x: center.x + Math.cos(yaw) * lx + Math.sin(yaw) * lz, z: center.z - Math.sin(yaw) * lx + Math.cos(yaw) * lz, r });

  if (type === 'chapel') {
    // roofless stone chapel — walls to either side of the path, a standing arch
    const side = rng.sign();
    const wallL = ruinWall(rng.range(6, 9), rng.range(1.6, 2.8), M.moss, rng);
    place(wallL, side * (c.r * 0.55), c.r * 0.2, Math.PI / 2);
    coll(side * (c.r * 0.55), c.r * 0.2, 0.4);
    const wallB = ruinWall(rng.range(4, 6), rng.range(1.2, 2.4), M.moss, rng);
    place(wallB, side * (c.r * 0.3), c.r * 0.62);
    // the arch still stands over the path
    const arch = new THREE.Group();
    arch.add(cyl(0.22, 0.28, 3, M.moss, -1.1, 1.5, 0, 6), cyl(0.22, 0.28, 3, M.moss, 1.1, 1.5, 0, 6));
    const key = box(2.8, 0.5, 0.5, M.moss, 0, 3.1, 0); key.rotation.z = rng.gauss() * 0.03; arch.add(key);
    place(arch, -side * c.r * 0.2, -c.r * 0.1);
    coll(-side * c.r * 0.2 - 1.1, -c.r * 0.1, 0.28); coll(-side * c.r * 0.2 + 1.1, -c.r * 0.1, 0.28);
    // toppled altar + a fallen bell
    const altar = box(1.4, 0.7, 0.7, M.paleStone, 0, 0.35, 0); place(new THREE.Group().add(altar), side * c.r * 0.5, c.r * 0.45);
    if (rng.chance(0.6)) {
      const bell = cyl(0.5, 0.35, 0.8, M.rust2, 0, 0.4, 0, 10); bell.rotation.z = 1.4;
      place(new THREE.Group().add(bell), -side * c.r * 0.4, c.r * 0.5);
      coll(-side * c.r * 0.4, c.r * 0.5, 0.5);
    }
    seg.ruinBell = true; // events may toll it
  } else if (type === 'stones') {
    // a ring of standing stones — some fallen
    const nStones = rng.int(5, 8), R = c.r * 0.6;
    for (let i = 0; i < nStones; i++) {
      const a = (i / nStones) * TAU + rng.gauss() * 0.15;
      const fallen = rng.chance(0.25);
      const st = box(rng.range(0.6, 1), fallen ? 0.5 : rng.range(2, 3.2), rng.range(0.4, 0.7), M.paleStone, 0, 0, 0);
      const grp = new THREE.Group();
      st.position.y = fallen ? 0.25 : st.geometry.parameters.height / 2;
      st.rotation.set(fallen ? Math.PI / 2 * 0.9 : rng.gauss() * 0.08, rng.gauss() * 0.3, rng.gauss() * 0.1);
      grp.add(st);
      place(grp, Math.cos(a) * R, Math.sin(a) * R);
      coll(Math.cos(a) * R, Math.sin(a) * R, 0.5);
    }
    const altar = box(1.6, 0.5, 1, M.moss, 0, 0.25, 0); place(new THREE.Group().add(altar), 0, 0);
    coll(0, 0, 0.9);
  } else if (type === 'well') {
    const side = rng.sign();
    const well = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.9, 14, 1, true), M.moss);
    ring.geometry.userData.perSeg = true; ring.position.y = 0.45; well.add(ring);
    const black = new THREE.Mesh(new THREE.CircleGeometry(0.78, 14), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    black.material.userData = { perSeg: true }; black.geometry.userData.perSeg = true;
    black.rotation.x = -Math.PI / 2; black.position.y = 0.2; well.add(black);
    // A-frame + rope going taut down into the black
    well.add(cyl(0.05, 0.06, 1.6, M.wood, -0.8, 0.8, 0, 5), cyl(0.05, 0.06, 1.6, M.wood, 0.8, 0.8, 0, 5));
    const beam = cyl(0.05, 0.05, 1.7, M.wood, 0, 1.55, 0, 5); beam.rotation.z = Math.PI / 2; well.add(beam);
    const rope = cyl(0.02, 0.02, 2.2, M.clothPale, 0.05, 0.2, 0, 4); well.add(rope); // taut, into the dark
    const wjz = rng.gauss() * c.r * 0.2;
    place(well, side * c.r * 0.45, wjz);
    coll(side * c.r * 0.45, wjz, 1);
  } else { // foundation — a house that is simply gone
    const fw = rng.range(5, 7), fd = rng.range(4, 6);
    const outline = new THREE.Group();
    for (const [lx, lz, ln, rot] of [[-fw / 2, 0, fd, Math.PI / 2], [fw / 2, 0, fd, Math.PI / 2], [0, -fd / 2, fw, 0], [0, fd / 2, fw, 0]]) {
      const wall = ruinWall(ln, rng.range(0.4, 0.9), M.brick, rng);
      wall.position.set(lx, 0, lz); wall.rotation.y = rot; outline.add(wall);
    }
    // the chimney still stands
    const chim = box(0.9, rng.range(3, 4.5), 0.9, M.brick, -fw / 2 + 0.3, 0, -fd / 2 + 0.3);
    chim.position.y = chim.geometry.parameters.height / 2; chim.rotation.y = rng.gauss() * 0.04; outline.add(chim);
    // a stove, a claw-foot tub, left where the rooms used to be
    outline.add(box(0.7, 0.9, 0.6, M.whitegoods, fw * 0.2, 0.45, -fd * 0.15));
    const tub = box(1.5, 0.5, 0.7, M.whitegoods, -fw * 0.15, 0.3, fd * 0.2); tub.rotation.y = rng.gauss() * 0.3; outline.add(tub);
    const fjx = rng.gauss() * 1.5, fjz = rng.gauss() * 1.5;
    place(outline, fjx, fjz);
    coll(-fw / 2 + 0.3 + fjx, -fd / 2 + 0.3 + fjz, 0.6); // match the group's jitter
  }

  // one cold light for the ruin space
  const glow = new THREE.PointLight(0x9fb0c8, 7, c.r * 2.4, 1.8);
  glow.position.set(center.x, 6, center.z); g.add(glow);
  const nShafts = rng.int(1, 2);
  for (let i = 0; i < nShafts; i++) flora.buildShaft(seg, world, c.s + rng.gauss() * c.r * 0.4, rng.gauss() * c.r * 0.4, rng.range(1, 1.8), g, false);
  seg.group.add(g);
}

// ---------------------------------------------------------------- bog

function buildBog(seg, world, flora, rng) {
  const g = new THREE.Group();
  const c = seg.clearing;
  const center = world.pointAt(seg, c.s, 0);
  const side = rng.sign();
  const waterC = world.pointAt(seg, c.s, side * (c.r * 0.45));
  const wr = c.r * rng.range(0.55, 0.8);
  flora.buildWaterPatch(waterC, wr, g);
  flora.buildReedPatch(waterC, wr, rng.int(20, 34), rng, g);

  // dead leaning trees, half-sunk
  for (let i = 0; i < rng.int(3, 6); i++) {
    const a = rng.float() * TAU, r = wr * rng.range(0.3, 1.1);
    const tx = waterC.x + Math.cos(a) * r, tz = waterC.z + Math.sin(a) * r;
    const tr = cyl(0.1, 0.22, rng.range(3.5, 6), M.snagwood, 0, 1.5, 0, 6);
    const grp = new THREE.Group(); grp.add(tr);
    grp.position.set(tx, rng.range(-0.3, 0), tz);
    grp.rotation.set(rng.range(0.1, 0.5), rng.float() * TAU, rng.gauss() * 0.2);
    g.add(grp);
    if (r > wr * 0.7) seg.colliders.push({ x: tx, z: tz, r: 0.35 });
  }
  // a half-sunk thing: a chair, a suitcase, a bathtub-boat
  const sunk = rng.pick(['chair', 'case', 'boat']);
  if (sunk === 'chair') {
    const ch = box(0.5, 0.5, 0.06, M.woodPale, 0, 0.55, -0.22);
    const grp = new THREE.Group(); grp.add(box(0.5, 0.06, 0.5, M.woodPale, 0, 0.3, 0), ch);
    grp.position.set(waterC.x, -0.15, waterC.z); grp.rotation.set(0.3, rng.float() * TAU, 0.2); g.add(grp);
  } else if (sunk === 'case') {
    const cs = box(0.7, 0.24, 0.5, M.rust2, waterC.x, 0.02, waterC.z); cs.rotation.y = rng.float() * TAU; g.add(cs);
  } else {
    const boat = box(2.4, 0.4, 0.9, M.wood, waterC.x, -0.05, waterC.z); boat.rotation.set(0.08, rng.float() * TAU, 0.05); g.add(boat);
  }

  // will-o'-wisps — faint cold glows hovering over black water
  const wispMat = new THREE.MeshBasicMaterial({ color: 0x8fffc0, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  wispMat.userData = { perSeg: true };
  const wispGeo = new THREE.SphereGeometry(0.09, 6, 5); wispGeo.userData.perSeg = true;
  const wisps = [];
  for (let i = 0; i < rng.int(3, 6); i++) {
    const a = rng.float() * TAU, r = wr * rng.range(0.2, 0.9);
    const w = new THREE.Mesh(wispGeo, wispMat);
    w.position.set(waterC.x + Math.cos(a) * r, rng.range(0.5, 1.4), waterC.z + Math.sin(a) * r);
    g.add(w);
    wisps.push({ mesh: w, bx: w.position.x, bz: w.position.z, by: w.position.y, ph: rng.float() * TAU });
  }
  const wispLight = new THREE.PointLight(0x6fffb0, 3, wr * 2.2, 2);
  wispLight.position.set(waterC.x, 1, waterC.z); g.add(wispLight);
  seg.bogWisps = wisps;
  seg.humSources = seg.humSources || [];
  seg.humSources.push({ pos: waterC.clone().setY(0.6), loud: false, id: 'bog' + seg.id });

  seg.group.add(g);
}

// ---------------------------------------------------------------- deadwood

function buildDeadwood(seg, world, flora, rng) {
  const g = new THREE.Group();
  const c = seg.clearing;
  const center = world.pointAt(seg, c.s, 0);
  // a deer skull on a stake, watching the path
  if (rng.chance(0.7)) {
    const side = rng.sign();
    const p = world.pointAt(seg, c.s - rng.range(1, 3), side * (world.halfWidthAt(seg, c.s) + 0.5));
    const stake = new THREE.Group();
    stake.add(cyl(0.05, 0.07, 1.5, M.wood, 0, 0.75, 0, 5));
    const skull = box(0.28, 0.3, 0.4, M.bone, 0, 1.55, 0);
    stake.add(skull);
    // antlers
    for (const s2 of [-1, 1]) {
      for (let b = 0; b < 3; b++) {
        const ant = cyl(0.02, 0.03, rng.range(0.3, 0.6), M.bone, s2 * 0.12, 1.7 + b * 0.12, 0, 4);
        ant.rotation.z = s2 * rng.range(0.5, 1.1); stake.add(ant);
      }
    }
    stake.position.copy(p); stake.rotation.y = Math.atan2(center.x - p.x, center.z - p.z); g.add(stake);
    seg.colliders.push({ x: p.x, z: p.z, r: 0.25 });
  }
  // scattered bones / a ribcage in the field
  for (let i = 0; i < rng.int(2, 5); i++) {
    const a = rng.float() * TAU, r = c.r * rng.range(0.2, 0.7);
    const bx = center.x + Math.cos(a) * r, bz = center.z + Math.sin(a) * r;
    const bone = cyl(0.03, 0.03, rng.range(0.3, 0.7), M.bone, bx, 0.05, bz, 4);
    bone.rotation.set(Math.PI / 2, 0, rng.float() * TAU); g.add(bone);
  }
  // cold light — the bone trees loom pale out of the dark
  const glow = new THREE.PointLight(0xbccadd, 12, c.r * 2.8, 1.7);
  glow.position.set(center.x, 6.5, center.z); g.add(glow);
  const glow2 = new THREE.PointLight(0x9fb0c8, 6, c.r * 2, 2);
  glow2.position.set(center.x + rng.gauss() * c.r * 0.4, 3, center.z + rng.gauss() * c.r * 0.4); g.add(glow2);
  for (let i = 0; i < rng.int(1, 2); i++) flora.buildShaft(seg, world, c.s + rng.gauss() * c.r * 0.4, rng.gauss() * c.r * 0.4, rng.range(1, 1.7), g, false);
  seg.group.add(g);
}

// ---------------------------------------------------------------- junk clusters

const JUNK_BUILDERS = {
  tent(g, rng) {
    const tent = box(1.9, 0.5, 1.4, M.cloth, 0, 0.22, 0);
    tent.rotation.z = 0.25; tent.rotation.y = rng.float() * TAU;
    g.add(tent, cyl(0.02, 0.02, 1.1, M.wood, 0.7, 0.4, 0.3, 4));
    for (let i = 0; i < 4; i++) g.add(cyl(0.05, 0.05, 0.12, M.rust, rng.gauss() * 1.4, 0.05, rng.gauss() * 1.4, 6));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 4, 8), M.stoneDark);
    ring.geometry.userData.perSeg = true;
    ring.rotation.x = Math.PI / 2; ring.position.set(1.6, 0.05, -0.6);
    g.add(ring);
    return { collR: 1.2 };
  },
  tv(g, rng) {
    g.add(cyl(0.3, 0.42, 0.7, M.wood, 0, 0.35, 0, 8)); // stump
    const tvBody = box(0.72, 0.55, 0.55, M.wood, 0, 1, 0);
    const screenTex = canvasTexture(64, 48, (gg, w, h) => { gg.fillStyle = '#0a0d0c'; gg.fillRect(0, 0, w, h); });
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
    screenMat.userData = { perSeg: true };
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.4), screenMat);
    screen.geometry.userData.perSeg = true;
    screen.position.set(0, 1.02, 0.28);
    g.add(tvBody, screen);
    return { collR: 0.6, actuator: { type: 'tv', screen, tex: screenTex } };
  },
  radiochair(g, rng) {
    const chair = new THREE.Group();
    chair.add(box(0.5, 0.06, 0.5, M.woodPale, 0, 0.45, 0), box(0.5, 0.55, 0.06, M.woodPale, 0, 0.75, -0.24));
    for (const [cx, cz] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]]) chair.add(cyl(0.025, 0.025, 0.45, M.woodPale, cx, 0.22, cz, 4));
    chair.rotation.y = rng.float() * TAU;
    const radio = box(0.42, 0.26, 0.16, M.rust2, 0, 0.62, 0.02);
    radio.rotation.y = chair.rotation.y;
    g.add(chair, radio);
    return { collR: 0.55, actuator: { type: 'radio' } };
  },
  swing(g, rng) {
    const y = rng.range(3.2, 4);
    g.add(cyl(0.06, 0.09, 2.6, M.bark, 0, y, 0, 5)).children.at(-1).rotation.z = Math.PI / 2;
    const pivot = new THREE.Group();
    pivot.position.y = y;
    pivot.add(cyl(0.015, 0.015, y - 0.55, M.wood, -0.35, -(y - 0.55) / 2, 0, 4));
    pivot.add(cyl(0.015, 0.015, y - 0.55, M.wood, 0.35, -(y - 0.55) / 2, 0, 4));
    pivot.add(box(0.9, 0.05, 0.25, M.woodPale, 0, -(y - 0.55), 0));
    g.add(pivot);
    return { collR: 0.5, actuator: { type: 'swing', pivot } };
  },
  cart(g, rng) {
    const cart = new THREE.Group();
    cart.add(box(0.85, 0.5, 0.55, M.ironwork, 0, 0.62, 0));
    for (const [cx, cz] of [[-0.35, -0.22], [0.35, -0.22], [-0.35, 0.22], [0.35, 0.22]]) {
      const w = cyl(0.08, 0.08, 0.04, M.tire, cx, 0.08, cz, 8);
      w.rotation.x = Math.PI / 2; cart.add(w);
    }
    for (let i = 0; i < 6; i++) cart.add(box(0.22, 0.1, 0.1, [M.cloth, M.clothPale, M.tire][rng.int(0, 2)], rng.gauss() * 0.25, 0.92, rng.gauss() * 0.18));
    cart.rotation.z = rng.chance(0.4) ? 0.9 : 0; // tipped over
    if (cart.rotation.z) cart.position.y = -0.15;
    cart.rotation.y = rng.float() * TAU;
    g.add(cart);
    return { collR: 0.7 };
  },
  fridge(g, rng) {
    const fr = box(0.7, 1.6, 0.7, M.whitegoods, 0, 0.78, 0);
    fr.rotation.z = rng.gauss() * 0.06;
    const door = box(0.66, 1.5, 0.05, M.whitegoods, 0.5, 0.78, 0.42);
    door.rotation.y = rng.range(0.5, 1.3);
    const washer = box(0.65, 0.85, 0.65, M.whitegoods, 1.1, 0.4, -0.3);
    washer.rotation.y = rng.float();
    g.add(fr, door, washer);
    return { collR: 1.1, actuator: { type: 'washer' }, hum: true };
  },
  phone(g, rng) {
    g.add(cyl(0.28, 0.4, 0.8, M.wood, 0, 0.4, 0, 8));
    g.add(box(0.3, 0.14, 0.3, M.tire, 0, 0.87, 0));
    g.add(box(0.26, 0.07, 0.09, M.tire, 0, 0.98, 0));
    return { collR: 0.5, actuator: { type: 'phone' } };
  },
  frames(g, rng) {
    for (let i = 0; i < rng.int(3, 5); i++) {
      const fr = new THREE.Group();
      fr.add(box(0.3, 0.4, 0.03, M.woodPale, 0, 0, 0));
      fr.add(box(0.24, 0.34, 0.035, M.glass, 0, 0, 0.004));
      fr.position.set(rng.gauss() * 1.6, rng.range(1.1, 1.9), rng.gauss() * 1.6);
      fr.rotation.y = rng.float() * TAU;
      fr.rotation.z = rng.gauss() * 0.15;
      g.add(fr);
    }
    return { collR: 0 };
  },
  birdhouses(g, rng) {
    const trunk = cyl(0.28, 0.4, 7, M.bark, 0, 3.5, 0);
    g.add(trunk);
    for (let i = 0; i < rng.int(6, 11); i++) {
      const bh = new THREE.Group();
      bh.add(box(0.22, 0.26, 0.2, M.woodPale, 0, 0, 0));
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), M.glass);
      hole.geometry.userData.perSeg = true;
      hole.position.set(0, 0.02, 0.101);
      bh.add(hole);
      const a = rng.float() * TAU;
      bh.position.set(Math.cos(a) * 0.42, rng.range(1.2, 5.6), Math.sin(a) * 0.42);
      bh.rotation.y = -a + Math.PI / 2;
      g.add(bh);
    }
    return { collR: 0.5 };
  },
  mattress(g, rng) {
    const mat = box(1.1, 0.22, 1.9, M.clothPale, 0, 0.11, 0);
    mat.rotation.y = rng.float() * TAU;
    const lamp = new THREE.Group();
    lamp.add(cyl(0.02, 0.14, 1.3, M.ironwork, 0, 0.65, 0, 6));
    const shadeMat = new THREE.MeshLambertMaterial({ color: 0x9a8a68, emissive: 0x000000 });
    shadeMat.userData = { perSeg: true };
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.25, 8, 1, true), shadeMat);
    shade.geometry.userData.perSeg = true;
    shade.position.y = 1.35;
    lamp.add(shade);
    lamp.position.set(0.9, 0, 0.4);
    g.add(mat, lamp);
    return { collR: 1, actuator: { type: 'lamp', shadeMat, lampPos: new THREE.Vector3(0.9, 1.35, 0.4) } };
  },
  machinery(g, rng) {
    // a transformer box no one remembers installing
    const bodyM = box(1.3, 1.5, 0.9, M.ironwork, 0, 0.75, 0);
    bodyM.rotation.y = rng.gauss() * 0.2;
    g.add(bodyM);
    g.add(box(1.4, 0.08, 1, M.rust, 0, 1.54, 0));
    for (let i = 0; i < 3; i++) g.add(cyl(0.04, 0.04, 0.5, M.stone, -0.4 + i * 0.4, 1.85, 0, 6));
    const cable = cyl(0.02, 0.02, 3.4, M.tire, 0, 1.9, 0, 4);
    cable.rotation.z = 1.25;
    cable.position.set(1.6, 1.6, 0);
    g.add(cable);
    return { collR: 1, hum: true, humLoud: true };
  },

  // ---- environmental storytelling: someone was here, and is not now ----
  bicycle(g, rng) {
    // a child's bike on its side, one wheel still turned up
    const bike = new THREE.Group();
    const frame = box(0.9, 0.06, 0.06, M.red, 0, 0.12, 0);
    bike.add(frame, box(0.06, 0.4, 0.06, M.red, -0.35, 0.25, 0), box(0.06, 0.35, 0.06, M.steel, 0.35, 0.2, 0));
    for (const wx of [-0.42, 0.42]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 5, 12), M.steel);
      wheel.geometry.userData.perSeg = true;
      wheel.position.set(wx, 0.28, 0);
      bike.add(wheel);
    }
    bike.rotation.set(Math.PI / 2 * 0.92, rng.float() * TAU, 0); // fallen over
    bike.position.y = 0.05;
    g.add(bike);
    // a single small shoe, a little away
    const shoe = box(0.22, 0.12, 0.1, M.clothPale, rng.range(0.8, 1.5), 0.06, rng.range(-0.6, 0.6));
    shoe.rotation.y = rng.float() * TAU; g.add(shoe);
    return { collR: 0.6 };
  },
  flyers(g, rng, world) {
    // a notice board papered with MISSING posters, facing the path
    const tier = world.tier();
    g.add(cyl(0.05, 0.06, 1.9, M.wood, -0.7, 0.95, 0, 5), cyl(0.05, 0.06, 1.9, M.wood, 0.7, 0.95, 0, 5));
    const board = box(1.7, 1.0, 0.05, M.wood, 0, 1.5, 0); g.add(board);
    // one poster texture, repeated — the same missing face, over and over
    const tex = missingTex(tier, rng);
    const posterGeo = new THREE.PlaneGeometry(0.34, 0.46); posterGeo.userData.perSeg = true;
    const posterMat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }); posterMat.userData = { perSeg: true };
    for (let i = 0; i < rng.int(3, 6); i++) {
      const poster = new THREE.Mesh(posterGeo, posterMat);
      poster.position.set(rng.range(-0.62, 0.62), rng.range(1.15, 1.85), 0.03);
      poster.rotation.z = rng.gauss() * 0.08;
      g.add(poster);
    }
    for (let i = 0; i < rng.int(1, 3); i++) { // some come loose onto the ground
      const loose = new THREE.Mesh(posterGeo, posterMat);
      loose.rotation.x = -Math.PI / 2;
      loose.position.set(rng.range(-1, 1), 0.03, rng.range(0.5, 1.4));
      loose.rotation.z = rng.float() * TAU;
      g.add(loose);
    }
    return { collR: 0.5 };
  },
  searchgear(g, rng) {
    // abandoned search-party kit — and the flashlights are still on
    g.add(box(0.9, 0.5, 0.5, M.rust2, 0, 0.25, -0.3)); // a dropped pack
    const jacket = box(0.6, 0.1, 0.5, M.cloth, 0.6, 0.05, 0.3); jacket.rotation.y = rng.float(); g.add(jacket);
    const lights = [];
    for (let i = 0; i < rng.int(1, 3); i++) {
      const fx = rng.range(-1.2, 1.2), fz = rng.range(-0.6, 1);
      g.add(cyl(0.04, 0.05, 0.22, M.steel, fx, 0.05, fz, 6));
      const beam = new THREE.PointLight(0xfff0c8, 3.5, 5, 2);
      beam.position.set(fx, 0.12, fz); g.add(beam);
      // a little lit disc where the beam lies against the dirt
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
      disc.material.userData = { perSeg: true }; disc.geometry.userData.perSeg = true;
      disc.rotation.x = -Math.PI / 2; disc.position.set(fx + 0.4, 0.05, fz); g.add(disc);
      lights.push(beam);
    }
    return { collR: 0.6 };
  },
  stroller(g, rng) {
    const s = new THREE.Group();
    s.add(box(0.55, 0.4, 0.5, M.cloth, 0, 0.5, 0));
    s.add(cyl(0.03, 0.03, 0.5, M.steel, -0.2, 0.25, 0.28, 4), cyl(0.03, 0.03, 0.5, M.steel, 0.2, 0.25, 0.28, 4));
    for (const [wx, wz] of [[-0.24, 0.28], [0.24, 0.28], [0, -0.28]]) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 4, 8), M.steel);
      w.geometry.userData.perSeg = true; w.rotation.y = Math.PI / 2; w.position.set(wx, 0.11, wz); s.add(w);
    }
    s.rotation.set(0.9, rng.float() * TAU, 0.3); // tipped over
    s.position.y = 0.15; g.add(s);
    const blanket = box(0.5, 0.05, 0.4, M.clothPale, rng.range(0.4, 0.9), 0.03, rng.range(-0.4, 0.4)); g.add(blanket);
    return { collR: 0.6 };
  },
  shrine(g, rng) {
    // a roadside shrine — some candles still lit
    g.add(box(0.9, 0.5, 0.5, M.paleStone, 0, 0.25, 0)); // plinth
    g.add(box(0.1, 0.7, 0.1, M.wood, 0, 0.85, -0.15), box(0.4, 0.1, 0.1, M.wood, 0, 1.0, -0.15)); // small cross
    for (let i = 0; i < rng.int(3, 6); i++) {
      const cx = rng.range(-0.35, 0.35), cz = rng.range(-0.05, 0.2);
      g.add(cyl(0.03, 0.035, rng.range(0.1, 0.22), M.clothPale, cx, 0.55, cz, 5));
      if (rng.chance(0.6)) {
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffb040 }));
        flame.material.userData = { perSeg: true }; flame.geometry.userData.perSeg = true;
        flame.position.set(cx, 0.68, cz); g.add(flame);
      }
    }
    // photos and flowers left behind
    for (let i = 0; i < rng.int(1, 3); i++) g.add(box(0.14, 0.18, 0.02, M.woodPale, rng.range(-0.3, 0.3), 0.62, rng.range(-0.18, 0.05)));
    const glow = new THREE.PointLight(0xffb060, 2, 4, 2); glow.position.set(0, 0.75, 0.1); g.add(glow);
    return { collR: 0.55 };
  },
  redthing(g, rng) {
    // the recurring red thing. you have not seen it before. you cannot have.
    const pick = rng.pick(['coat', 'balloon', 'ball']);
    if (pick === 'coat') {
      const coat = box(0.4, 0.6, 0.15, M.red, 0, 0.3, 0); coat.rotation.set(0.2, rng.float() * TAU, 0.1);
      g.add(coat);
    } else if (pick === 'balloon') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), M.red); b.geometry.userData.perSeg = true;
      b.scale.y = 1.2; b.position.y = rng.range(1.2, 1.8); g.add(b);
      g.add(cyl(0.004, 0.004, b.position.y, M.tire, 0, b.position.y / 2, 0, 3));
    } else {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), M.red); ball.geometry.userData.perSeg = true;
      ball.position.y = 0.16; g.add(ball);
    }
    return { collR: 0.2 };
  },
};

function buildJunk(seg, world, rng, kindList) {
  const s = seg.samples.length * rng.range(0.2, 0.8);
  const halfW = world.halfWidthAt(seg, s);
  const side = rng.sign();
  const g = new THREE.Group();
  const kind = kindList[rng.int(0, kindList.length - 1)];
  const res = JUNK_BUILDERS[kind](g, rng, world) || {};
  // CRITICAL: keep the collider clear of the walkable band. A prop that walls a
  // narrow corridor is an unrecoverable soft-lock (you can never go back). Push
  // it out so its inflated edge sits beyond the far walkable edge (+player r).
  const collR = res.collR || 0;
  const wantMag = halfW + rng.range(-0.4, 1.2);
  const clearMag = (halfW - 0.38) + collR + 0.34 + 0.25;
  const latMag = Math.max(wantMag, collR ? clearMag : halfW - 0.1);
  const p = world.pointAt(seg, s, side * latMag);
  g.position.copy(p);
  const centerP = world.pointAt(seg, s, 0);
  g.rotation.y = Math.atan2(centerP.x - p.x, centerP.z - p.z) + rng.gauss() * 0.3;
  seg.group.add(g);
  if (collR) seg.colliders.push({ x: p.x, z: p.z, r: collR });
  if (res.actuator) {
    const a = res.actuator;
    g.updateMatrixWorld(true);
    a.pos = a.lampPos ? g.localToWorld(a.lampPos.clone()) : p.clone().setY(1);
    a.r = 6.5; a.fired = false; a.group = g;
    seg.actuators.push(a);
  }
  if (res.hum) {
    seg.humSources = seg.humSources || [];
    seg.humSources.push({ pos: p.clone().setY(1), loud: !!res.humLoud, id: 'hum' + seg.id + '_' + seg.humSources.length });
  }
  return kind;
}

// ---------------------------------------------------------------- entry point

export function dressSegment(seg, world, flora, rng) {
  if (seg.kind === 'cemetery') buildCemetery(seg, world, flora, rng);
  if (seg.kind === 'sunclear') buildSunclear(seg, world, flora, rng);
  if (seg.kind === 'carspot') buildCar(seg, world, rng);
  if (seg.kind === 'ruin') buildRuin(seg, world, flora, rng);
  if (seg.kind === 'bog') buildBog(seg, world, flora, rng);
  if (seg.kind === 'deadwood') buildDeadwood(seg, world, flora, rng);

  const tier = world.tier();
  // the story items — grief left in the woods — grow more common as you descend
  const stories = ['bicycle', 'flyers', 'searchgear', 'stroller'];
  if (tier >= 1) stories.push('shrine');
  if (tier >= 2) stories.push('flyers', 'searchgear'); // more of them, deeper

  if (seg.kind === 'corridor' || seg.kind === 'carspot' || seg.kind === 'ruin' || seg.kind === 'deadwood') {
    if (rng.chance(0.4)) {
      const list = ['tent', 'tv', 'radiochair', 'swing', 'cart', 'fridge', 'frames', 'birdhouses', 'mattress'];
      if (tier >= 2) list.push('phone', 'phone');
      buildJunk(seg, world, rng, list);
    }
    if (rng.chance(0.34)) buildJunk(seg, world, rng, stories);
    if (rng.chance(0.1 + tier * 0.03)) buildJunk(seg, world, rng, ['machinery']);
  }
  if (seg.kind === 'thicket' && rng.chance(0.3)) {
    buildJunk(seg, world, rng, ['flyers', 'redthing', 'shrine', 'frames']);
  }
  if (seg.kind === 'cave' && rng.chance(0.28)) {
    buildJunk(seg, world, rng, ['frames', 'phone', 'mattress', 'shrine']);
  }
  // the red thing — rare, anywhere, and it should not be here
  if (seg.kind !== 'bog' && rng.chance(0.05)) buildJunk(seg, world, rng, ['redthing']);
}
