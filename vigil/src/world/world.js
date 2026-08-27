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
import { CFG, buildStructure, structureSurfaces, structureBlocksBody } from './structure.js';
import { buildFieldDetail } from './detail.js';
import { batchStaticMeshes } from '../gfx/geometry.js';

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
  const fogDawn = new THREE.Color(0x526b7f);
  const sunNight = new THREE.Color(0xa6e8ff);
  const sunDawn = new THREE.Color(0xd9f4ff);
  const fillNight = new THREE.Color(0x4c70ff);
  const fillDawn = new THREE.Color(0x94cfff);
  const hemiNightSky = new THREE.Color(0x7289b5);
  const hemiDawnSky = new THREE.Color(0xb5d3e0);
  const hemiNightGround = new THREE.Color(0x101420);
  const hemiDawnGround = new THREE.Color(0x34424b);
  const ambientNight = new THREE.Color(0x7692bd);
  const ambientDawn = new THREE.Color(0xabc7d4);

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

  // Outer-ring field bastions. These preserve the original conservative
  // circular colliders and walkable top planes exactly, but the silhouette now
  // belongs to the relay: armored gravitic capacitors, not extruded rocks.
  // Every mesh is boot-built and folded into three static material batches.
  const coverSpecs = [
    [-39, -18, 2.8, 4.2, 0], [33, -30, 3.1, 3.6, 1], [-24, 40, 2.6, 3.2, 0],
    [46, 18, 3.4, 4.6, 1], [-52, 12, 3.0, 3.8, 0], [12, 48, 2.7, 3.4, 1],
    [-14, -50, 3.2, 4.0, 0], [55, -8, 2.5, 3.0, 1], [-44, -40, 2.9, 4.4, 0],
    [22, -56, 3.3, 3.7, 1], [-60, -14, 2.6, 3.5, 0], [10, -34, 2.4, 2.9, 1],
  ];
  const bastionShellMat = new THREE.MeshStandardMaterial({
    color: 0x202c39, roughness: 0.42, metalness: 0.72, flatShading: true,
  });
  const bastionArmorMat = new THREE.MeshStandardMaterial({
    color: 0x718393, roughness: 0.30, metalness: 0.84, flatShading: true,
  });
  const bastionGlowMat = new THREE.MeshStandardMaterial({
    color: 0x164454, roughness: 0.28, metalness: 0.48,
    emissive: 0x35dfff, emissiveIntensity: 2.35, flatShading: true,
  });
  const bastionBaseGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
  const bastionCoreGeo = new THREE.CylinderGeometry(0.60, 0.72, 1, 8);
  const bastionCrownGeo = new THREE.CylinderGeometry(0.64, 0.78, 1, 8);
  const bastionRibGeo = new THREE.BoxGeometry(0.18, 1, 0.30);
  const bastionPanelGeo = new THREE.BoxGeometry(0.24, 0.13, 0.035);
  const bastionRingGeo = new THREE.TorusGeometry(1, 0.032, 5, 24);
  bastionRingGeo.rotateX(Math.PI / 2);
  const coverRoot = new THREE.Group();
  coverRoot.name = 'field-bastions';
  scene.add(coverRoot);
  for (let ci = 0; ci < coverSpecs.length; ci++) {
    const [x, z, r, h, dark] = coverSpecs[ci];
    const gy = terrainHeight(x, z);
    const unitYaw = ci * 0.83;
    const unitCos = Math.cos(unitYaw), unitSin = Math.sin(unitYaw);
    const part = (geo, mat, px, py, pz, sx, sy, sz, ry = 0) => {
      const mesh = new THREE.Mesh(geo, mat);
      // Parts remain direct children so batchStaticMeshes can collapse all
      // twelve bastions by material. Bake each unit's local yaw/translation
      // here instead of hiding hundreds of meshes beneath nested Groups.
      mesh.position.set(
        x + px * unitCos + pz * unitSin,
        gy + py,
        z - px * unitSin + pz * unitCos,
      );
      mesh.scale.set(sx, sy, sz);
      mesh.rotation.y = unitYaw + ry;
      mesh.castShadow = mat !== bastionGlowMat;
      mesh.receiveShadow = mat !== bastionGlowMat;
      coverRoot.add(mesh);
      return mesh;
    };

    // Wide deployed foot and tapered energy core stay inside the historical
    // collider while giving enemies and players the same slide-along contour.
    part(bastionBaseGeo, bastionShellMat, 0, 0.16, 0, r * 0.84, 0.32, r * 0.84);
    part(bastionBaseGeo, bastionArmorMat, 0, 0.34, 0, r * 0.73, 0.16, r * 0.73);
    part(bastionCoreGeo, dark ? bastionShellMat : bastionArmorMat,
      0, h * 0.50 - 0.25, 0, r, h - 0.50, r);

    // Eight load-bearing vanes make the units read as fabricated machinery at
    // combat distance; paired light bands identify them as relay-owned cover.
    for (let j = 0; j < 8; j++) {
      const a = j * TAU / 8;
      // Push the ribs out to the historical collider skin. Their outer edge is
      // ~0.85r (collider 0.88r): visually structural, physically unchanged.
      const rr = r * 0.70;
      part(bastionRibGeo, j % 2 ? bastionShellMat : bastionArmorMat,
        Math.sin(a) * rr, h * 0.48 - 0.19, Math.cos(a) * rr,
        r, h * 0.68, r, a);
      if ((j & 1) === 0) {
        part(bastionPanelGeo, bastionGlowMat,
          Math.sin(a) * r * 0.84, h * (0.42 + (j === 0 || j === 4 ? 0.10 : 0)), Math.cos(a) * r * 0.84,
          r, 1, r, a);
      }
    }
    for (const y of [h * 0.30, h * 0.70]) {
      part(bastionRingGeo, bastionGlowMat, 0, y, 0, r * 0.84, 1, r * 0.84);
    }

    // A recessed armored crown keeps the exact old walkable height and gives
    // the player a convincing manufactured platform when standing on one.
    part(bastionCrownGeo, bastionShellMat, 0, h - 0.39, 0, r, 0.28, r);
    part(bastionBaseGeo, bastionArmorMat, 0, h - 0.27, 0, r * 0.70, 0.04, r * 0.70);
    part(bastionRingGeo, bastionGlowMat, 0, h - 0.245, 0, r * 0.64, 1, r * 0.64);

    place({ kind: 'field-bastion', surface: 'metal', x, z, r: r * 0.88, yMin: gy - 1, yMax: gy + h - 0.3 });
    platforms.push({ x, z, r: r * 0.72, y: gy + h - 0.25 });
  }
  coverRoot.userData.staticBatch = batchStaticMeshes(coverRoot);

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

  // Hundreds of sub-capsule stones and fragments in three instanced draws.
  // They bias toward the outer field, preserving the clean central horde bowl.
  scene.add(buildFieldDetail(ctx.rng.fork('field-detail'), terrainHeight, place));

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
  function collideCircle(pos, radius, vel = null, feetY = pos.y, bodyHeight = 1.7) {
    for (const c of colliders) {
      if (feetY > c.yMax - 0.35 || feetY + bodyHeight < c.yMin) continue;
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
      if (feetY > b.yMax - 0.2 || feetY + bodyHeight < b.yMin) continue;
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

  /** True when a body of the requested height fits without intersecting a
   * registered volume or a walkable surface above its feet. Player posture
   * uses this to defer standing under low cover; navigation keeps its existing
   * standing-height queries and therefore cannot drift. */
  function canFitBody(x, z, radius, feetY, bodyHeight = 1.7) {
    const headY = feetY + bodyHeight;
    for (const c of colliders) {
      if (feetY > c.yMax - 0.35 || headY < c.yMin) continue;
      const dx = x - c.x, dz = z - c.z;
      // A tiny inward tolerance treats collideCircle's exact tangent pushout
      // as clear instead of intermittently forcing crouch on floating error.
      const rr = radius + c.r - 1e-4;
      if (dx * dx + dz * dz < rr * rr) return false;
    }
    for (const b of boxes) {
      if (feetY > b.yMax - 0.2 || headY < b.yMin) continue;
      const r = radius - 1e-4;
      if (x > b.minX - r && x < b.maxX + r
          && z > b.minZ - r && z < b.maxZ + r) return false;
    }
    if (structureBlocksBody(x, z, feetY, headY)) return false;
    for (const p of platforms) {
      if (p.y <= feetY + 0.08 || p.y >= headY + 0.02) continue;
      const dx = x - p.x, dz = z - p.z;
      const rr = radius + p.r;
      if (dx * dx + dz * dz < rr * rr) return false;
    }
    return true;
  }

  /* ---------------- navigation / placement queries ----------------
   * These are scalar, allocation-free companions to collideCircle(). Enemy
   * routing and the director use the exact same collider registry as the
   * player instead of maintaining a second, drifting idea of free space. */
  const bodyTouches = (feetY, c, pad = 0) =>
    feetY <= c.yMax - 0.2 + pad && feetY + 1.7 >= c.yMin - pad;

  function canOccupyCircle(x, z, radius, feetY = terrainHeight(x, z), clearance = 0) {
    if (Math.hypot(x, z) > PLAY_RADIUS - radius - clearance) return false;
    for (const c of colliders) {
      if (!bodyTouches(feetY, c)) continue;
      const rr = radius + c.r + clearance;
      const dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz < rr * rr) return false;
    }
    for (const b of boxes) {
      if (!bodyTouches(feetY, b)) continue;
      if (x > b.minX - radius - clearance && x < b.maxX + radius + clearance
          && z > b.minZ - radius - clearance && z < b.maxZ + radius + clearance) return false;
    }
    return true;
  }

  /** First circular blocker along a swept body segment, or null. */
  function firstCircleBlocker(x0, z0, x1, z1, radius, feetY, clearance = 0.12) {
    const sx = x1 - x0, sz = z1 - z0;
    const ll = sx * sx + sz * sz;
    let best = null, bestT = Infinity;
    if (ll < 1e-8) return null;
    for (const c of colliders) {
      if (!bodyTouches(feetY, c)) continue;
      const t = clamp(((c.x - x0) * sx + (c.z - z0) * sz) / ll, 0, 1);
      const qx = x0 + sx * t - c.x, qz = z0 + sz * t - c.z;
      const rr = radius + c.r + clearance;
      if (qx * qx + qz * qz < rr * rr && t < bestT) { best = c; bestT = t; }
    }
    return best;
  }

  function corridorClear(x0, z0, x1, z1, radius, feetY, clearance = 0.12) {
    if (firstCircleBlocker(x0, z0, x1, z1, radius, feetY, clearance)) return false;
    const sx = x1 - x0, sz = z1 - z0;
    for (const b of boxes) {
      if (!bodyTouches(feetY, b)) continue;
      const loX = b.minX - radius - clearance, hiX = b.maxX + radius + clearance;
      const loZ = b.minZ - radius - clearance, hiZ = b.maxZ + radius + clearance;
      let t0 = 0, t1 = 1;
      if (Math.abs(sx) < 1e-8) {
        if (x0 < loX || x0 > hiX) continue;
      } else {
        let a = (loX - x0) / sx, c = (hiX - x0) / sx;
        if (a > c) { const q = a; a = c; c = q; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, c);
        if (t0 > t1) continue;
      }
      if (Math.abs(sz) < 1e-8) {
        if (z0 < loZ || z0 > hiZ) continue;
      } else {
        let a = (loZ - z0) / sz, c = (hiZ - z0) / sz;
        if (a > c) { const q = a; a = c; c = q; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, c);
      }
      if (t0 <= t1 && t1 >= 0 && t0 <= 1) return false;
    }
    return true;
  }

  function terrainPatchRange(x, z, radius = 1.5, samples = 8) {
    let lo = terrainHeight(x, z), hi = lo;
    for (let i = 0; i < samples; i++) {
      const a = (i / samples) * TAU;
      const h = terrainHeight(x + Math.cos(a) * radius, z + Math.sin(a) * radius);
      lo = Math.min(lo, h); hi = Math.max(hi, h);
    }
    return hi - lo;
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
        const metal = c.surface === 'metal' || c.kind === 'field-bastion' || c.kind.startsWith('relay');
        best = { t, kind: metal ? 'metal' : 'rock', collider: c };
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

  /** Certified outer salvage site: clear footprint, modest local slope, and
   * at least one unobstructed body-width corridor back to the inner ring. */
  function isCrashSiteAccessible(site) {
    const y = terrainHeight(site.x, site.z);
    if (Math.hypot(site.x, site.z) > PLAY_RADIUS - 6) return false;
    if (terrainPatchRange(site.x, site.z, 1.5, 8) > 0.9) return false;
    if (!canOccupyCircle(site.x, site.z, 1.15, y, 0.55)) return false;
    for (const gate of spawnPoints.inner) {
      if (corridorClear(site.x, site.z, gate.x, gate.z, 0.36, y, 0.22)) return true;
    }
    return false;
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
    canFitBody,
    canOccupyCircle,
    firstCircleBlocker,
    corridorClear,
    terrainPatchRange,
    isCrashSiteAccessible,
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
      // Dawn only arrives after the final clear. Wave X stops at progress .9;
      // the jump to 1 is therefore a readable earned payoff, never a combat
      // exposure shift halfway through a firefight.
      const dawn = THREE.MathUtils.smoothstep(progress, 0.94, 1.0);
      // absolute-value atmosphere — one owner, immune to drift
      scene.fog.color.copy(fogCold).lerp(fogThreat, threat * 0.58);
      scene.fog.color.lerp(fogDawn, dawn * 0.76);
      scene.fog.density = 0.0039 + threat * 0.0020 - dawn * 0.00125;
      sun.color.copy(sunNight).lerp(sunDawn, dawn);
      sun.intensity = 1.65 - threat * 0.18 + dawn * 0.72;
      fill.color.copy(fillNight).lerp(fillDawn, dawn);
      fill.intensity = 0.5 + threat * 0.14 + dawn * 0.20;
      hemi.color.copy(hemiNightSky).lerp(hemiDawnSky, dawn);
      hemi.groundColor.copy(hemiNightGround).lerp(hemiDawnGround, dawn);
      hemi.intensity = 1.14 - threat * 0.08 + dawn * 0.28;
      ambient.color.copy(ambientNight).lerp(ambientDawn, dawn);
      ambient.intensity = 0.42 + threat * 0.04 + dawn * 0.12;
      ctx.renderer.toneMappingExposure = exposureBase - threat * 0.06 + dawn * 0.10 + (ctx.shared?.flashEV || 0) * 0.35;
      cosmos.update(dt, ctx.camera.position, threat, progress);
      relay.update(dt, threat, 0.14 + power * 0.86);
    },
  };
  return api;
}
