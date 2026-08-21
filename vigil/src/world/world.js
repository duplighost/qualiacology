// World assembly: scene, the light rig (single owner — every intensity is an
// ABSOLUTE function of (threat, power) written each frame), fog, terrain,
// the relay, cover, rubble, spawn geography, and the collision registry.
//
// LAW 2: every placed object registers through place() — a collider
// {kind,x,z,r,yMin,yMax} or an explicit decor:true. The audit test walks and
// shoots every registered kind. Cinderbloom's walk-through bug was opt-in
// collision that flora never opted into; here opting out is the explicit act.

import * as THREE from 'three';
import { TAU, clamp, clamp01, lerp, damp } from '../engine/math.js';
import { PLAY_RADIUS, terrainHeight, buildTerrain } from './terrain.js';
import { createCosmos } from './cosmos.js';
import { CFG, buildStructure, structureSurfaces } from './structure.js';

export { PLAY_RADIUS };

const PLATFORM_GRACE = 1.7;

export function create(ctx) {
  const scene = ctx.scene;
  const rng = ctx.rng.fork('world');

  /* ---------------- collision registry (the placement API) ----------------
   * Two shapes: a circle {x,z,r} and an axis-aligned box {minX,maxX,minZ,maxZ}.
   * Both carry {yMin,yMax} so a rail can be a low wall bullets fly over.
   * LAW 2: every placed object is a collider or an explicit decor:true. */
  const colliders = [];        // circles
  const boxes = [];            // {kind,minX,maxX,minZ,maxZ,yMin,yMax}
  const platforms = [];        // {x,z,r,y} one-way flat tops
  const kinds = new Map();     // kind -> {colliders:n, boxes:n, decor:n}
  const place = (spec) => {
    const k = kinds.get(spec.kind) || { colliders: 0, boxes: 0, decor: 0 };
    if (spec.decor) k.decor++;
    else if (spec.box) {
      const b = { yMin: -Infinity, yMax: Infinity, ...spec.box, kind: spec.kind };
      if (!(b.maxX > b.minX && b.maxZ > b.minZ)) throw new Error(`box ${spec.kind} is degenerate`);
      boxes.push(b);
      k.boxes++;
    } else {
      if (!(spec.r > 0)) throw new Error(`collider ${spec.kind} without radius`);
      colliders.push({ yMin: -Infinity, yMax: Infinity, ...spec });
      k.colliders++;
    }
    kinds.set(spec.kind, k);
  };

  /* ---------------- fog + lights (absolute-value atmosphere) ---------------- */
  scene.fog = new THREE.FogExp2(0x101827, 0.0039);
  const fogCold = new THREE.Color(0x101827);
  const fogThreat = new THREE.Color(0x21162f);

  const sun = new THREE.DirectionalLight(0xa6e8ff, 1.65);
  sun.position.set(-92, 136, 64);
  sun.target.position.set(0, 8, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 320;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.45;
  scene.add(sun, sun.target);

  const fill = new THREE.DirectionalLight(0x8c70d8, 0.5);
  fill.position.set(88, 54, -110);
  fill.target.position.set(0, 12, 0);
  scene.add(fill, fill.target);

  const hemi = new THREE.HemisphereLight(0x9bdcff, 0x140e26, 1.14);
  scene.add(hemi);

  // lunar readability floor: detail stays alive inside hard moon shadow
  const ambient = new THREE.AmbientLight(0x7692bd, 0.42);
  scene.add(ambient);

  // 4 practicals bouncing the lower arena — short range on purpose so the
  // deck stays dark against the sky. Added ONCE; never toggled (recompiles).
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    const p = new THREE.PointLight(i % 2 ? 0xb08cff : 0x66dfff, 55, 30, 2);
    p.position.set(Math.cos(a) * 13.2, 5.4, Math.sin(a) * 13.2);
    scene.add(p);
  }

  /* ---------------- geometry ---------------- */
  scene.add(buildTerrain());
  const cosmos = createCosmos(ctx.rng);
  scene.add(cosmos.root);
  const relay = buildStructure({ place });
  scene.add(relay.group);

  // cover ring: flat-topped 7-sided cylinders, alternating plain / fractured
  const coverSpecs = [
    [-39, -18, 2.8, 4.2, 0], [33, -30, 3.1, 3.6, 1], [-24, 40, 2.6, 3.2, 0],
    [46, 18, 3.4, 4.6, 1], [-52, 12, 3.0, 3.8, 0], [12, 48, 2.7, 3.4, 1],
    [-14, -50, 3.2, 4.0, 0], [55, -8, 2.5, 3.0, 1], [-44, -40, 2.9, 4.4, 0],
    [22, -56, 3.3, 3.7, 1], [-60, -14, 2.6, 3.5, 0], [10, -34, 2.4, 2.9, 1],
  ];
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x747c8a, roughness: 0.85, flatShading: true });
  const fracMat = new THREE.MeshStandardMaterial({ color: 0x2e3542, roughness: 0.8, flatShading: true, emissive: 0x1d4258, emissiveIntensity: 0.85 });
  for (let ci = 0; ci < coverSpecs.length; ci++) {
    const [x, z, r, h, dark] = coverSpecs[ci];
    const gy = terrainHeight(x, z);
    const geo = new THREE.CylinderGeometry(r * 0.76, r, h, 7);
    // chip the verts so no two rocks read identical
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const chip = Math.sin((i + 1) * 19.71 + ci * 7.31) * 0.075;
      p.setX(i, p.getX(i) * (1 + chip));
      p.setZ(i, p.getZ(i) * (1 - chip));
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, dark ? fracMat : rockMat);
    m.position.set(x, gy + h / 2 - 0.25, z);
    m.rotation.y = ci * 0.83;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    place({ kind: 'cover-rock', x, z, r: r * 0.88, yMin: gy - 1, yMax: gy + h - 0.3 });
    platforms.push({ x, z, r: r * 0.72, y: gy + h - 0.25 });
  }

  // instanced rubble (decor by declaration — too small to block a capsule)
  const rubbleGeo = new THREE.DodecahedronGeometry(1, 0);
  const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x4c525e, roughness: 0.95, flatShading: true });
  const rubble = new THREE.InstancedMesh(rubbleGeo, rubbleMat, 84);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3();
  for (let i = 0; i < 84; i++) {
    const a = rng.next() * TAU;
    const rr = CFG.floorR + 6 + Math.sqrt(rng.next()) * (PLAY_RADIUS - CFG.floorR - 12);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const s = 0.32 + rng.next() * 0.68;
    e.set(rng.next() * TAU, rng.next() * TAU, rng.next() * TAU);
    m4.compose(v.set(x, terrainHeight(x, z) + s * 0.3, z), q.setFromEuler(e), new THREE.Vector3(s, s * 0.8, s));
    rubble.setMatrixAt(i, m4);
  }
  rubble.castShadow = true;
  rubble.receiveShadow = true;
  scene.add(rubble);
  place({ kind: 'rubble', decor: true });

  /* ---------------- ground + collision queries ---------------- */

  /** highest walkable surface at (x,z) eligible from height y (one-way). */
  function groundAt(x, z, y) {
    let g = terrainHeight(x, z);
    const surfs = structureSurfaces(x, z);
    if (surfs) {
      for (const s of surfs) if (s > g && y + PLATFORM_GRACE >= s) g = s;
    }
    for (const p of platforms) {
      if (p.y > g && y + PLATFORM_GRACE >= p.y) {
        const dx = x - p.x, dz = z - p.z;
        if (dx * dx + dz * dz <= p.r * p.r) g = p.y;
      }
    }
    return g;
  }

  /** circle-vs-cylinders pushout; mutates pos, kills velocity into surfaces. */
  function collideCircle(pos, radius, vel = null, feetY = pos.y) {
    for (const c of colliders) {
      if (feetY > c.yMax - 0.35 || feetY + 1.7 < c.yMin) continue;
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const rr = radius + c.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 < 1e-9) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d, nz = dz / d;
      pos.x = c.x + nx * rr;
      pos.z = c.z + nz * rr;
      if (vel) {
        const into = vel.x * nx + vel.z * nz;
        if (into < 0) { vel.x -= nx * into; vel.z -= nz * into; }
      }
    }
    // circle vs axis-aligned boxes (ramp rails): push out along the shallowest
    // axis so a body sliding along a rail stays on the ramp instead of popping
    for (const b of boxes) {
      if (feetY > b.yMax - 0.2 || feetY + 1.7 < b.yMin) continue;
      const eMinX = b.minX - radius, eMaxX = b.maxX + radius;
      const eMinZ = b.minZ - radius, eMaxZ = b.maxZ + radius;
      if (pos.x <= eMinX || pos.x >= eMaxX || pos.z <= eMinZ || pos.z >= eMaxZ) continue;
      const dxL = pos.x - eMinX, dxR = eMaxX - pos.x;
      const dzL = pos.z - eMinZ, dzR = eMaxZ - pos.z;
      const m = Math.min(dxL, dxR, dzL, dzR);
      let nx = 0, nz = 0;
      if (m === dxL) { pos.x = eMinX; nx = -1; }
      else if (m === dxR) { pos.x = eMaxX; nx = 1; }
      else if (m === dzL) { pos.z = eMinZ; nz = -1; }
      else { pos.z = eMaxZ; nz = 1; }
      if (vel) {
        const into = vel.x * nx + vel.z * nz;
        if (into < 0) { vel.x -= nx * into; vel.z -= nz * into; }
      }
    }
    // soft arena boundary
    const d = Math.hypot(pos.x, pos.z);
    const lim = PLAY_RADIUS + 6;
    if (d > lim) {
      const nx = pos.x / d, nz = pos.z / d;
      pos.x = nx * lim; pos.z = nz * lim;
      if (vel) {
        const out = vel.x * nx + vel.z * nz;
        if (out > 0) { vel.x -= nx * out; vel.z -= nz * out; }
      }
    }
  }

  /**
   * Analytic ray vs (terrain + structure layers): march then bisect.
   * Returns {t, point, kind} or null within maxT.
   */
  const _p = new THREE.Vector3();
  function marchGround(origin, dir, maxT) {
    const STEP = 0.7;
    let tPrev = 0;
    let abovePrev = origin.y - groundLike(origin.x, origin.z, origin.y);
    if (abovePrev <= 0) return { t: 0, point: origin.clone(), kind: 'ground' };
    for (let t = STEP; t <= maxT; t += STEP) {
      _p.copy(origin).addScaledVector(dir, t);
      const above = _p.y - groundLike(_p.x, _p.z, _p.y);
      if (above <= 0) {
        // bisect
        let lo = tPrev, hi = t;
        for (let i = 0; i < 6; i++) {
          const mid = (lo + hi) / 2;
          _p.copy(origin).addScaledVector(dir, mid);
          if (_p.y - groundLike(_p.x, _p.z, _p.y) <= 0) hi = mid; else lo = mid;
        }
        _p.copy(origin).addScaledVector(dir, hi);
        return { t: hi, point: _p.clone(), kind: surfaceKind(_p.x, _p.z, _p.y) };
      }
      tPrev = t;
      abovePrev = above;
    }
    return null;
  }
  // ground-like height for bullets: terrain or the structure layer just below
  function groundLike(x, z, y) {
    let g = terrainHeight(x, z);
    const surfs = structureSurfaces(x, z);
    if (surfs) for (const s of surfs) if (s > g && s <= y + 0.01) g = s;
    return g;
  }
  function surfaceKind(x, z, y) {
    const surfs = structureSurfaces(x, z);
    if (surfs) for (const s of surfs) if (Math.abs(y - s) < 0.6) return 'metal';
    return 'rock';
  }

  /** ray vs collider cylinders (for bullets hitting columns/rocks). */
  function rayColliders(origin, dir, maxT) {
    let best = null;
    for (const c of colliders) {
      // 2D ray-circle in XZ
      const ox = origin.x - c.x, oz = origin.z - c.z;
      const dx = dir.x, dz = dir.z;
      const a = dx * dx + dz * dz;
      if (a < 1e-8) continue;
      const b = 2 * (ox * dx + oz * dz);
      const cc = ox * ox + oz * oz - c.r * c.r;
      const disc = b * b - 4 * a * cc;
      if (disc < 0) continue;
      const t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t < 0 || t > maxT) continue;
      const y = origin.y + dir.y * t;
      if (y < c.yMin || y > c.yMax) continue;
      if (!best || t < best.t) {
        best = { t, kind: c.kind.startsWith('relay') ? 'metal' : 'rock', collider: c };
      }
    }
    // slab method vs the boxes, with the y-span honoured at the hit point
    for (const b of boxes) {
      let t0 = 0, t1 = maxT;
      let ok = true;
      for (const [o, d, lo, hi] of [
        [origin.x, dir.x, b.minX, b.maxX],
        [origin.z, dir.z, b.minZ, b.maxZ],
        [origin.y, dir.y, b.yMin, b.yMax],
      ]) {
        if (Math.abs(d) < 1e-8) { if (o < lo || o > hi) { ok = false; break; } continue; }
        let a = (lo - o) / d, z2 = (hi - o) / d;
        if (a > z2) { const s = a; a = z2; z2 = s; }
        if (a > t0) t0 = a;
        if (z2 < t1) t1 = z2;
        if (t0 > t1) { ok = false; break; }
      }
      if (!ok || t0 < 0 || t0 > maxT) continue;
      if (!best || t0 < best.t) best = { t: t0, kind: 'metal', collider: b };
    }
    if (best) best.point = origin.clone().addScaledVector(dir, best.t);
    return best;
  }

  /* ---------------- spawn geography ---------------- */
  const spawnPoints = { outer: [], inner: [], deck: [] };
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const r = 66 + (i % 3) * 3;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    spawnPoints.outer.push({ x, z, y: terrainHeight(x, z) });
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.3;
    const x = Math.cos(a) * 27, z = Math.sin(a) * 27;
    spawnPoints.inner.push({ x, z, y: terrainHeight(x, z) });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.8;
    const x = Math.cos(a) * 9.2, z = Math.sin(a) * 9.2;
    spawnPoints.deck.push({ x, z, y: CFG.deckY });
  }

  /* ---------------- state ---------------- */
  let threat = 0, threatTarget = 0, power = 0.14, progress = 0;
  const exposureBase = 1.28;

  const api = {
    id: 'world',
    scene,
    sun,
    groundAt,
    terrainHeight,
    collideCircle,
    marchGround,
    rayColliders,
    place,
    colliders,
    boxes,
    platforms,
    kinds,
    spawnPoints,
    playRadius: PLAY_RADIUS,
    structure: CFG,
    playerStart: { x: 0, y: 0, z: 33 },
    get threat() { return threat; },
    setThreat(t) { threatTarget = clamp01(t); },
    setPower(p) { power = clamp01(p); },
    setProgress(p) { progress = clamp01(p); },

    update(dt) {
      threat = damp(threat, threatTarget, 1.6, dt);
      // absolute-value atmosphere — one owner, immune to drift
      scene.fog.color.copy(fogCold).lerp(fogThreat, threat * 0.58);
      scene.fog.density = 0.0039 + threat * 0.0020;
      sun.intensity = 1.65 - threat * 0.18;
      fill.intensity = 0.5 + threat * 0.14;
      hemi.intensity = 1.14 - threat * 0.08;
      ambient.intensity = 0.42 + threat * 0.04;
      ctx.renderer.toneMappingExposure = exposureBase - threat * 0.06 + (ctx.shared?.flashEV || 0) * 0.35;
      cosmos.update(dt, ctx.camera.position, threat, progress);
      relay.update(dt, threat, 0.14 + power * 0.86);
    },
  };
  return api;
}
