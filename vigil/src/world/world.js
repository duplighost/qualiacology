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
import {
  CFG, buildStructure, structureGroundHeight, structureBlocksBody, raycastStructure,
} from './structure.js';
import { buildFieldDetail } from './detail.js';
import { buildBreakableRocks } from './breakables.js';
import { batchStaticMeshes } from '../gfx/geometry.js';

export { PLAY_RADIUS };

const PLATFORM_GRACE = 1.7;

export function create(ctx) {
  const scene = ctx.scene;
  const rng = ctx.rng.fork('world');

  /* ---------------- collision registry (the placement API) ----------------
   * Three shapes: a circle, an axis-aligned box, and a horizontal segment
   * capsule for curved rails. All carry {yMin,yMax}, so a low guard stops
   * bodies while correctly allowing fire over it.
   * LAW 2: every placed object is a collider or an explicit decor:true. */
  const colliders = [];        // circles
  const boxes = [];            // {kind,minX,maxX,minZ,maxZ,yMin,yMax}
  const segments = [];         // horizontal capsules {x1,z1,x2,z2,r,yMin,yMax}
  const platforms = [];        // {x,z,r,y} one-way flat tops
  const kinds = new Map();     // kind -> {colliders:n, boxes:n, segments:n, decor:n}
  const place = (spec) => {
    const k = kinds.get(spec.kind) || { colliders: 0, boxes: 0, segments: 0, decor: 0 };
    let registered = spec;
    if (spec.decor) k.decor++;
    else if (spec.box) {
      const b = {
        yMin: -Infinity, yMax: Infinity, active: spec.active !== false,
        ...spec.box, kind: spec.kind, surface: spec.surface,
      };
      if (!(b.maxX > b.minX && b.maxZ > b.minZ)) throw new Error(`box ${spec.kind} is degenerate`);
      boxes.push(b);
      k.boxes++;
      registered = b;
    } else if (spec.segment) {
      const s = {
        yMin: -Infinity, yMax: Infinity, active: spec.active !== false,
        ...spec.segment, kind: spec.kind, surface: spec.surface,
      };
      const len = Math.hypot(s.x2 - s.x1, s.z2 - s.z1);
      if (!(len > 1e-4 && s.r > 0)) throw new Error(`segment ${spec.kind} is degenerate`);
      segments.push(s);
      k.segments++;
      registered = s;
    } else {
      if (!(spec.r > 0)) throw new Error(`collider ${spec.kind} without radius`);
      registered = { yMin: -Infinity, yMax: Infinity, active: spec.active !== false, ...spec };
      colliders.push(registered);
      k.colliders++;
    }
    kinds.set(spec.kind, k);
    return registered;
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
    const structure = structureGroundHeight(x, z, y + PLATFORM_GRACE);
    if (structure > g) g = structure;
    for (const p of platforms) {
      if (p.y > g && y + PLATFORM_GRACE >= p.y) {
        const dx = x - p.x, dz = z - p.z;
        if (dx * dx + dz * dz <= p.r * p.r) g = p.y;
      }
    }
    return g;
  }

  // Curated natural geodes are dynamic and therefore remain outside the
  // relay/terrain static batches. Their geometry, shards, and reward cores
  // are nevertheless fully pooled at boot.
  const breakableRocks = buildBreakableRocks(ctx, { place, groundAt, terrainHeight });
  scene.add(breakableRocks.group);

  const _segPoint = { x: 0, z: 0, t: 0 };
  const _segPair = { s: 0, t: 0, ax: 0, az: 0, bx: 0, bz: 0, d2: 0 };
  const _segmentBlocker = { x: 0, z: 0, r: 0, kind: '', segment: null };

  function closestPointOnSegment(px, pz, x1, z1, x2, z2, out = _segPoint) {
    const dx = x2 - x1, dz = z2 - z1;
    const ll = dx * dx + dz * dz;
    const t = ll > 1e-10 ? clamp(((px - x1) * dx + (pz - z1) * dz) / ll, 0, 1) : 0;
    out.t = t;
    out.x = x1 + dx * t;
    out.z = z1 + dz * t;
    return out;
  }

  /** Allocation-free closest pair between two 2-D line segments. */
  function closestSegmentPair(ax, az, bx, bz, cx, cz, dx, dz, out = _segPair) {
    const d1x = bx - ax, d1z = bz - az;
    const d2x = dx - cx, d2z = dz - cz;
    const rx = ax - cx, rz = az - cz;
    const a = d1x * d1x + d1z * d1z;
    const e = d2x * d2x + d2z * d2z;
    const f = d2x * rx + d2z * rz;
    let s = 0, t = 0;
    if (a <= 1e-10 && e <= 1e-10) {
      s = t = 0;
    } else if (a <= 1e-10) {
      t = clamp(f / e, 0, 1);
    } else {
      const c = d1x * rx + d1z * rz;
      if (e <= 1e-10) {
        s = clamp(-c / a, 0, 1);
      } else {
        const b = d1x * d2x + d1z * d2z;
        const denom = a * e - b * b;
        if (Math.abs(denom) > 1e-10) s = clamp((b * f - c * e) / denom, 0, 1);
        t = (b * s + f) / e;
        if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); }
        else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
      }
    }
    out.s = s; out.t = t;
    out.ax = ax + d1x * s; out.az = az + d1z * s;
    out.bx = cx + d2x * t; out.bz = cz + d2z * t;
    const qx = out.ax - out.bx, qz = out.az - out.bz;
    out.d2 = qx * qx + qz * qz;
    return out;
  }

  /** circle-vs-cylinders pushout; mutates pos, kills velocity into surfaces. */
  function collideCircle(pos, radius, vel = null, feetY = pos.y, bodyHeight = 1.7) {
    for (const c of colliders) {
      if (c.active === false) continue;
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
      if (b.active === false) continue;
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
    // Curved handrails register as short horizontal capsules. The closest
    // point pushout matches their visible centerline and stays smooth through
    // joins, unlike rotated AABB approximations that catch a moving capsule.
    for (const s of segments) {
      if (s.active === false) continue;
      if (feetY > s.yMax - 0.2 || feetY + bodyHeight < s.yMin) continue;
      const q = closestPointOnSegment(pos.x, pos.z, s.x1, s.z1, s.x2, s.z2);
      let dx = pos.x - q.x, dz = pos.z - q.z;
      const rr = radius + s.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr) continue;
      let d = Math.sqrt(d2);
      if (d < 1e-7) {
        const sx = s.x2 - s.x1, sz = s.z2 - s.z1;
        const sl = Math.hypot(sx, sz) || 1;
        dx = -sz / sl; dz = sx / sl; d = 1;
      } else { dx /= d; dz /= d; }
      pos.x = q.x + dx * rr;
      pos.z = q.z + dz * rr;
      if (vel) {
        const into = vel.x * dx + vel.z * dz;
        if (into < 0) { vel.x -= dx * into; vel.z -= dz * into; }
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
      if (c.active === false) continue;
      if (feetY > c.yMax - 0.35 || headY < c.yMin) continue;
      const dx = x - c.x, dz = z - c.z;
      // A tiny inward tolerance treats collideCircle's exact tangent pushout
      // as clear instead of intermittently forcing crouch on floating error.
      const rr = radius + c.r - 1e-4;
      if (dx * dx + dz * dz < rr * rr) return false;
    }
    for (const b of boxes) {
      if (b.active === false) continue;
      if (feetY > b.yMax - 0.2 || headY < b.yMin) continue;
      const r = radius - 1e-4;
      if (x > b.minX - r && x < b.maxX + r
          && z > b.minZ - r && z < b.maxZ + r) return false;
    }
    for (const s of segments) {
      if (s.active === false) continue;
      if (feetY > s.yMax - 0.2 || headY < s.yMin) continue;
      const q = closestPointOnSegment(x, z, s.x1, s.z1, s.x2, s.z2);
      const dx = x - q.x, dz = z - q.z;
      const rr = radius + s.r - 1e-4;
      if (dx * dx + dz * dz < rr * rr) return false;
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
      if (c.active === false) continue;
      if (!bodyTouches(feetY, c)) continue;
      const rr = radius + c.r + clearance;
      const dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz < rr * rr) return false;
    }
    for (const b of boxes) {
      if (b.active === false) continue;
      if (!bodyTouches(feetY, b)) continue;
      if (x > b.minX - radius - clearance && x < b.maxX + radius + clearance
          && z > b.minZ - radius - clearance && z < b.maxZ + radius + clearance) return false;
    }
    for (const s of segments) {
      if (s.active === false) continue;
      if (!bodyTouches(feetY, s)) continue;
      const q = closestPointOnSegment(x, z, s.x1, s.z1, s.x2, s.z2);
      const dx = x - q.x, dz = z - q.z;
      const rr = radius + clearance + s.r;
      if (dx * dx + dz * dz < rr * rr) return false;
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
      if (c.active === false) continue;
      if (!bodyTouches(feetY, c)) continue;
      const t = clamp(((c.x - x0) * sx + (c.z - z0) * sz) / ll, 0, 1);
      const qx = x0 + sx * t - c.x, qz = z0 + sz * t - c.z;
      const rr = radius + c.r + clearance;
      if (qx * qx + qz * qz < rr * rr && t < bestT) { best = c; bestT = t; }
    }
    for (const s of segments) {
      if (s.active === false) continue;
      if (!bodyTouches(feetY, s)) continue;
      const pair = closestSegmentPair(x0, z0, x1, z1, s.x1, s.z1, s.x2, s.z2);
      const rr = radius + s.r + clearance;
      if (pair.d2 < rr * rr && pair.s < bestT) {
        // Existing detour code expects a circle-like blocker. Return the
        // closest point on this rail with its physical radius.
        _segmentBlocker.x = pair.bx; _segmentBlocker.z = pair.bz;
        _segmentBlocker.r = s.r; _segmentBlocker.kind = s.kind;
        _segmentBlocker.segment = s;
        best = _segmentBlocker;
        bestT = pair.s;
      }
    }
    return best;
  }

  function corridorClear(x0, z0, x1, z1, radius, feetY, clearance = 0.12) {
    if (firstCircleBlocker(x0, z0, x1, z1, radius, feetY, clearance)) return false;
    const sx = x1 - x0, sz = z1 - z0;
    for (const b of boxes) {
      if (b.active === false) continue;
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
    for (const s of segments) {
      if (s.active === false) continue;
      if (!bodyTouches(feetY, s)) continue;
      const pair = closestSegmentPair(x0, z0, x1, z1, s.x1, s.z1, s.x2, s.z2);
      const rr = radius + clearance + s.r;
      if (pair.d2 < rr * rr) return false;
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

  /** Analytic terrain ray plus solid manufactured-floor slabs. */
  const _p = new THREE.Vector3();
  function marchGround(origin, dir, maxT) {
    const STEP = 0.7;
    const structureT = raycastStructure(origin, dir, maxT);
    const terrainLimit = Math.min(maxT, structureT);
    let tPrev = 0;
    const aboveStart = origin.y - terrainHeight(origin.x, origin.z);
    if (aboveStart <= 0) return { t: 0, point: origin.clone(), kind: 'ground' };
    let t = Math.min(STEP, terrainLimit);
    while (t > tPrev + 1e-9) {
      _p.copy(origin).addScaledVector(dir, t);
      const above = _p.y - terrainHeight(_p.x, _p.z);
      if (above <= 0) {
        let lo = tPrev, hi = t;
        for (let i = 0; i < 6; i++) {
          const mid = (lo + hi) / 2;
          _p.copy(origin).addScaledVector(dir, mid);
          if (_p.y - terrainHeight(_p.x, _p.z) <= 0) hi = mid; else lo = mid;
        }
        _p.copy(origin).addScaledVector(dir, hi);
        return { t: hi, point: _p.clone(), kind: 'rock' };
      }
      tPrev = t;
      if (t >= terrainLimit - 1e-9) break;
      t = Math.min(terrainLimit, t + STEP);
    }
    if (Number.isFinite(structureT)) {
      _p.copy(origin).addScaledVector(dir, structureT);
      return { t: structureT, point: _p.clone(), kind: 'metal' };
    }
    return null;
  }

  function rayCircle2DT(ox, oz, dx, dz, cx, cz, radius, maxT) {
    const rx = ox - cx, rz = oz - cz;
    const a = dx * dx + dz * dz;
    if (a < 1e-10) return Infinity;
    const b = 2 * (rx * dx + rz * dz);
    const c = rx * rx + rz * rz - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return Infinity;
    const root = Math.sqrt(disc);
    const t0 = (-b - root) / (2 * a);
    const t1 = (-b + root) / (2 * a);
    const t = t0 >= 0 ? t0 : t1 >= 0 ? t1 : Infinity;
    return t <= maxT ? t : Infinity;
  }

  /** Ray against a horizontal 2-D capsule extruded through the rail's y span. */
  function raySegmentT(origin, dir, s, maxT) {
    const sx = s.x2 - s.x1, sz = s.z2 - s.z1;
    const len = Math.hypot(sx, sz);
    const ux = sx / len, uz = sz / len;
    const nx = -uz, nz = ux;
    const mx = (s.x1 + s.x2) * 0.5, mz = (s.z1 + s.z2) * 0.5;
    const rox = origin.x - mx, roz = origin.z - mz;
    const oa = rox * ux + roz * uz, op = rox * nx + roz * nz;
    const da = dir.x * ux + dir.z * uz, dp = dir.x * nx + dir.z * nz;
    let t0 = 0, t1 = maxT, ok = true;
    const half = len * 0.5;
    if (Math.abs(da) < 1e-10) {
      if (oa < -half || oa > half) ok = false;
    } else {
      let a = (-half - oa) / da, b = (half - oa) / da;
      if (a > b) { const q = a; a = b; b = q; }
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      if (t0 > t1) ok = false;
    }
    if (ok) {
      if (Math.abs(dp) < 1e-10) {
        if (op < -s.r || op > s.r) ok = false;
      } else {
        let a = (-s.r - op) / dp, b = (s.r - op) / dp;
        if (a > b) { const q = a; a = b; b = q; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        if (t0 > t1) ok = false;
      }
    }
    let best = Infinity;
    if (ok && t0 >= 0 && t0 <= maxT) best = t0;
    const e0 = rayCircle2DT(origin.x, origin.z, dir.x, dir.z, s.x1, s.z1, s.r, maxT);
    const e1 = rayCircle2DT(origin.x, origin.z, dir.x, dir.z, s.x2, s.z2, s.r, maxT);
    best = Math.min(best, e0, e1);
    if (!Number.isFinite(best)) return Infinity;
    const y = origin.y + dir.y * best;
    return y >= s.yMin && y <= s.yMax ? best : Infinity;
  }

  /** ray vs collider cylinders (for bullets hitting columns/rocks). */
  function rayColliders(origin, dir, maxT) {
    let best = null;
    for (const c of colliders) {
      if (c.active === false) continue;
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
      if (b.active === false) continue;
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
    for (const s of segments) {
      if (s.active === false) continue;
      const t = raySegmentT(origin, dir, s, maxT);
      if (!Number.isFinite(t) || (best && t >= best.t)) continue;
      const metal = s.surface === 'metal' || s.kind.startsWith('relay')
        || s.kind.includes('rail') || s.kind.includes('bulkhead');
      best = { t, kind: metal ? 'metal' : 'rock', collider: s };
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
    segments,
    platforms,
    breakableRocks,
    kinds,
    spawnPoints,
    playRadius: PLAY_RADIUS,
    structure: CFG,
    playerStart: { x: 0, y: 0, z: 33 },
    get threat() { return threat; },
    setThreat(t) { threatTarget = clamp01(t); },
    setPower(p) { power = clamp01(p); },
    setProgress(p) { progress = clamp01(p); },
    strikeBreakable(collider, damage, point, normal) {
      return breakableRocks.strike(collider, damage, point, normal);
    },
    reset() { breakableRocks.reset(); },

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
      breakableRocks.update(dt);
    },
  };
  return api;
}
