// flora.js — everything that grows. Instanced trees/canopy/shrubs/roots per
// segment, ground ribbons, cave tunnels, the rising seal walls, fork signposts.
import * as THREE from 'three';
import { RNG, clamp, lerp, smoothstep, canvasTexture, speckle, TAU } from './util.js';
import { dressSegment } from './props.js';

function crossPlanesGeo() {
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [];
  for (let k = 0; k < 2; k++) {
    const a = (k * Math.PI) / 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    const b = k * 4;
    pos.push(-dx, 0, -dz, dx, 0, dz, dx, 1.35, dz, -dx, 1.35, -dz);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export class Flora {
  constructor(scene) {
    this.scene = scene;
    this.sealAnims = [];
    this.dummy = new THREE.Object3D();
    this.texRng = new RNG(90210);
    this._makeShared();
  }

  _makeShared() {
    const rng = this.texRng;
    this.groundTex = canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = '#33271a'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 900, ['#4a3620', '#3d2c1a', '#553f24', '#241a10', '#63482a', '#6d5530'], rng, 0.6, 2.4);
      speckle(g, w, h, 140, ['#7d6038', '#8a6f42', '#5e5a30'], rng, 0.5, 1.4); // dead leaves catching light
    }, { repeat: true });
    this.pathTex = canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = '#4a3a26'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 700, ['#5d4a30', '#6d5638', '#3a2c1c', '#7d6642', '#4d3d28'], rng, 0.5, 2);
      g.globalAlpha = 0.28; g.fillStyle = '#2b2114';
      g.fillRect(w * 0.22, 0, w * 0.1, h); g.fillRect(w * 0.66, 0, w * 0.1, h); // wheel-rut ghosts
      g.globalAlpha = 1;
    }, { repeat: true });
    this.shrubTex = canvasTexture(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const x = 8 + rng.float() * (w - 16), y = h - rng.float() * (h - 6);
        const r = rng.range(3, 9);
        g.fillStyle = ['#1c2818', '#16211a', '#212e1a', '#0f1810'][rng.int(0, 3)];
        g.beginPath(); g.ellipse(x, y, r, r * rng.range(0.55, 1), rng.float() * TAU, 0, TAU); g.fill();
      }
    });

    this.trunkGeo = new THREE.CylinderGeometry(0.13, 0.24, 1, 7, 1);
    this.trunkGeo.translate(0, 0.5, 0);
    this.canopyGeo = new THREE.IcosahedronGeometry(1, 1);
    this.canopyGeo.scale(1, 0.62, 1);
    this.rootGeo = new THREE.TorusGeometry(1, 0.085, 5, 9, Math.PI * 0.85);
    this.branchGeo = new THREE.CylinderGeometry(0.045, 0.075, 1, 5, 1);
    this.branchGeo.translate(0, 0.5, 0);
    this.shrubGeo = crossPlanesGeo();
    this.shaftGeo = new THREE.CylinderGeometry(0.45, 1.5, 1, 10, 1, true);
    this.discGeo = new THREE.CircleGeometry(1, 18);
    this.discGeo.rotateX(-Math.PI / 2);

    this.barkMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.canopyMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    this.rootMat = new THREE.MeshLambertMaterial({ color: 0x30241a });
    this.shrubMat = new THREE.MeshLambertMaterial({
      color: 0xffffff, map: this.shrubTex, alphaTest: 0.42, side: THREE.DoubleSide,
    });
    this.groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: this.groundTex, vertexColors: true });
    this.pathMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: this.pathTex, vertexColors: true });
    this.shaftMat = new THREE.MeshBasicMaterial({
      color: 0xffe2a8, transparent: true, opacity: 0.075, fog: false,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.shaftDiscMat = new THREE.MeshBasicMaterial({
      color: 0xffd894, transparent: true, opacity: 0.09, fog: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.coldShaftMat = new THREE.MeshBasicMaterial({
      color: 0x9fb4d8, transparent: true, opacity: 0.05, fog: false,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.coldDiscMat = new THREE.MeshBasicMaterial({
      color: 0x9fb8e0, transparent: true, opacity: 0.06, fog: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.woodMat = new THREE.MeshLambertMaterial({ color: 0x3a3028 });
    // pale dead timber for the deadwood snag fields — bone against the dark
    this.deadBarkMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    // still black water for the bog
    this.waterMat = new THREE.MeshLambertMaterial({ color: 0x0a1512, transparent: true, opacity: 0.85 });
    this.reedMat = new THREE.MeshLambertMaterial({ color: 0x3a3a22, side: THREE.DoubleSide });
    this.reedGeo = crossPlanesGeo();

    // per-biome ground base colour (multiplies the shared dirt texture)
    this.GROUND_BASE = {
      corridor: [0.72, 0.68, 0.55], cave: [0.55, 0.52, 0.46], thicket: [0.5, 0.55, 0.4],
      cemetery: [0.7, 0.74, 0.6], sunclear: [0.76, 0.9, 0.62], carspot: [0.72, 0.68, 0.55],
      ruin: [0.62, 0.66, 0.56], bog: [0.34, 0.42, 0.36], deadwood: [0.66, 0.68, 0.72],
    };
  }

  // ---------- per-segment build ----------

  buildSegment(seg, world) {
    const rng = seg.rng.fork(11);
    const group = new THREE.Group();
    seg.group = group;
    this.scene.add(group);
    const L = seg.samples.length;
    const isCave = seg.kind === 'cave';
    const isThicket = seg.kind === 'thicket';
    const isDead = seg.kind === 'deadwood';
    const dense = isCave || isThicket;      // foliage/rock crowds the path

    this._buildGround(seg, world, group);

    // plan instances first, then bake exact-count InstancedMeshes
    const trunks = [], canopies = [], branches = [], shrubs = [], roots = [];
    const treeStep = isThicket ? 1.05 : isCave ? 1.25 : isDead ? 1.5 : 1.7;
    const spread = dense ? 3.2 : isDead ? 5.5 : 6.5;
    seg.eyeSpots = [];

    for (let s = 2; s < L - 1.5; s += treeStep * rng.range(0.75, 1.3)) {
      const halfW = world.halfWidthAt(seg, s);
      const inClearing = seg.clearing && Math.abs(s - seg.clearing.s) < seg.clearing.r + 2;
      for (const side of [-1, 1]) {
        const n = inClearing ? 1 : (isThicket ? rng.int(2, 3) : rng.int(1, 2));
        for (let k = 0; k < n; k++) {
          const off = halfW + (isThicket ? 0.35 : 0.7) + Math.min(spread + 1.5, -Math.log(1 - rng.float()) * (spread * 0.45));
          const p = world.pointAt(seg, s + rng.gauss() * 0.7, side * off);
          const h = dense ? rng.range(4, 6.5) : isDead ? rng.range(7, 12.5) : rng.range(6.5, 11.5);
          const rad = rng.range(0.75, 1.7) * (dense ? 0.8 : 1) * (isDead ? 0.7 : 1);
          const lean = (off < halfW + 2.4 ? rng.range(0.04, dense ? 0.3 : 0.14) : rng.range(-0.05, 0.08));
          trunks.push({ p, h, rad, rotY: rng.float() * TAU, lean, leanDir: -side, s, tint: rng.range(0.75, 1.15), pale: isDead });
          // deadwood: bare skeletal limbs instead of leaves
          if (isDead) {
            for (let b = 0; b < rng.int(2, 4); b++) {
              const y0 = rng.range(h * 0.4, h * 0.92);
              const a0 = world.pointAt(seg, s, side * off); a0.y = y0;
              const reach = rng.range(1, 2.4), az = rng.float() * TAU;
              branches.push({ a: a0, b: a0.clone().add(new THREE.Vector3(Math.cos(az) * reach, rng.range(0.3, 1.4), Math.sin(az) * reach)), thin: true });
            }
          } else if (!isCave || rng.chance(0.5)) {
            canopies.push({
              p: p.clone().add(new THREE.Vector3(rng.gauss() * 0.8, h * rng.range(0.82, 0.98), rng.gauss() * 0.8)),
              sc: rng.range(1.7, 3.1) * (isThicket ? 1.25 : 1), tint: rng.range(0.6, 1.1), rotY: rng.float() * TAU,
            });
          }
          // eye candidates: near-wall trunks facing the path
          const eyeCap = isThicket ? 16 : 10;
          if (off < halfW + 2.2 && seg.eyeSpots.length < eyeCap && rng.chance(isThicket ? 0.5 : 0.35) && !inClearing) {
            const ep = world.pointAt(seg, s, side * (off - rad * 0.16));
            ep.y = rng.range(1.15, 2.5);
            seg.eyeSpots.push({ pos: ep, s, side, used: false });
          }
        }
      }
      // overhead canopy — the forest closing over the path
      const cover = isThicket ? 1.35 : isCave ? 1.0 : isDead ? 0 : seg.kind === 'corridor' ? 0.55 : 0.3;
      const nCanopy = isThicket ? 2 : 1;
      for (let cc = 0; cc < nCanopy; cc++) {
        if (!inClearing && rng.chance(cover * 0.55)) {
          const p = world.pointAt(seg, s, rng.gauss() * halfW * 0.6);
          p.y = isThicket ? rng.range(3.2, 4.8) : isCave ? rng.range(3.4, 4.4) : rng.range(5.4, 7.4);
          canopies.push({ p, sc: rng.range(2.2, 3.6), tint: rng.range(0.45, 0.8), rotY: rng.float() * TAU });
        }
      }
      // knitting branches across the path
      if (!inClearing && rng.chance(isThicket ? 0.62 : isCave ? 0.5 : 0.22)) {
        const y = dense ? rng.range(2.2, 3.2) : rng.range(2.9, 4.2);
        const a = world.pointAt(seg, s, -(halfW + rng.range(0, 0.8)));
        const b = world.pointAt(seg, s + rng.gauss() * 1.2, halfW + rng.range(0, 0.8));
        a.y = y + rng.gauss() * 0.4; b.y = y + rng.gauss() * 0.4;
        branches.push({ a, b });
      }
    }

    // shrub walls — the surfaces of the corridor. Use the unpinched width so
    // mouth-pinch zones don't put foliage right against the lens.
    for (let s = 1.5; s < L - 1; s += 0.95 * rng.range(0.8, 1.25)) {
      const wallW = Math.max(world.halfWidthAt(seg, s), seg.baseHalfW);
      const inClearing = seg.clearing && Math.abs(s - seg.clearing.s) < seg.clearing.r + 1;
      for (const side of [-1, 1]) {
        if (inClearing && rng.chance(0.8)) continue;
        const p = world.pointAt(seg, s, side * (wallW + rng.range(0.35, 1.1)));
        shrubs.push({ p, sc: rng.range(0.55, 1.25), rotY: rng.float() * TAU, tint: rng.range(0.55, 1.05) });
        if (rng.chance(0.3)) {
          const p2 = world.pointAt(seg, s, side * (wallW + rng.range(1.6, 3.6)));
          shrubs.push({ p: p2, sc: rng.range(0.8, 1.6), rotY: rng.float() * TAU, tint: rng.range(0.4, 0.8) });
        }
      }
    }

    // roots breaking out of the dirt across the path
    const nRoots = isCave ? rng.int(4, 7) : rng.int(2, 5);
    for (let i = 0; i < nRoots; i++) {
      const s = rng.range(4, L - 4);
      if (seg.clearing && Math.abs(s - seg.clearing.s) < seg.clearing.r) continue;
      const halfW = world.halfWidthAt(seg, s);
      const p = world.pointAt(seg, s, rng.gauss() * halfW * 0.5);
      roots.push({ p, sc: rng.range(0.4, halfW * 0.75), rotY: Math.atan2(world.tangentAt(seg, s).x, world.tangentAt(seg, s).z) + Math.PI / 2 + rng.gauss() * 0.5, squash: rng.range(0.22, 0.5) });
    }
    // cave: hanging roots from the ceiling
    if (isCave) {
      for (let s = 3; s < L - 3; s += rng.range(1.2, 2.6)) {
        const p = world.pointAt(seg, s, rng.gauss() * world.halfWidthAt(seg, s) * 0.8);
        const len2 = rng.range(0.5, 1.5);
        p.y = rng.range(2.5, 3.3);
        branches.push({ a: p, b: p.clone().setY(p.y - len2), thin: true });
      }
    }

    this._bakeInstances(seg, group, { trunks, canopies, branches, shrubs, roots });

    // a lone safe sun shaft in ordinary corridors, sometimes (the unsettling kind of relief)
    if (seg.kind === 'corridor' && rng.chance(0.22)) {
      const s = rng.range(L * 0.3, L * 0.75);
      this.buildShaft(seg, world, s, rng.gauss() * 1.2, rng.range(0.9, 1.6), group);
    }

    dressSegment(seg, world, this, rng.fork(77));
  }

  _buildGround(seg, world, group) {
    const L = seg.samples.length;
    const FR = 7.5; // fringe beyond the corridor
    const mk = (widthFn, colorFn, mat, y) => {
      const posA = [], uvA = [], colA = [], idxA = [];
      for (let i = 0; i <= L; i++) {
        const hw = widthFn(i);
        const a = world.pointAt(seg, i, -hw), b = world.pointAt(seg, i, hw);
        posA.push(a.x, y, a.z, b.x, y, b.z);
        uvA.push(0, i * 0.26, hw * 0.5, i * 0.26);
        const [c1, c2] = colorFn(i);
        colA.push(...c1, ...c2);
        if (i < L) { const k = i * 2; idxA.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvA, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
      g.setIndex(idxA);
      g.computeVertexNormals();
      g.userData.perSeg = true;
      const m = new THREE.Mesh(g, mat);
      m.receiveShadow = false;
      group.add(m);
      return m;
    };
    const gRng = seg.rng.fork(5);
    const biomeBase = this.GROUND_BASE[seg.kind] || this.GROUND_BASE.corridor;
    mk(
      (i) => world.halfWidthAt(seg, i) + FR,
      (i) => {
        const inClr = seg.clearing && Math.abs(i - seg.clearing.s) < seg.clearing.r + 3;
        // clearings read a touch paler/greener; deadwood & bog keep their cast
        const base = inClr && seg.kind !== 'bog' && seg.kind !== 'deadwood'
          ? biomeBase.map((c, k) => c * (k === 1 ? 1.14 : 1.05))
          : biomeBase;
        const v = () => base.map((c) => c * gRng.range(0.75, 1.1));
        return [v(), v()];
      },
      this.groundMat, 0,
    );
    mk(
      (i) => Math.min(world.halfWidthAt(seg, i) * 0.72, 1.5),
      () => { const c = [0.98, 0.9, 0.74]; return [c, c]; },
      this.pathMat, 0.025,
    );
  }

  _bakeInstances(seg, group, plan) {
    const D = this.dummy;
    const mkInst = (geo, mat, items, place, colorOf) => {
      if (!items.length) return null;
      const m = new THREE.InstancedMesh(geo, mat, items.length);
      m.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      items.forEach((it, i) => {
        place(it); D.updateMatrix(); m.setMatrixAt(i, D.matrix);
        if (colorOf) m.setColorAt(i, colorOf(it));
      });
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.frustumCulled = true;
      group.add(m);
      return m;
    };
    const col = new THREE.Color();
    const pale = plan.trunks.length && plan.trunks[0].pale;
    mkInst(this.trunkGeo, pale ? this.deadBarkMat : this.barkMat, plan.trunks, (it) => {
      D.position.copy(it.p);
      D.rotation.set(it.lean * (it.leanDir || 1), it.rotY, it.lean * 0.3);
      D.scale.set(it.rad, it.h, it.rad);
    }, (it) => (pale
      ? col.setRGB(0.74 * it.tint, 0.72 * it.tint, 0.66 * it.tint)
      : col.setRGB(0.52 * it.tint, 0.44 * it.tint, 0.36 * it.tint)));
    mkInst(this.canopyGeo, this.canopyMat, plan.canopies, (it) => {
      D.position.copy(it.p); D.rotation.set(0, it.rotY, 0);
      D.scale.setScalar(it.sc);
    }, (it) => col.setRGB(0.17 * it.tint, 0.24 * it.tint, 0.17 * it.tint));
    mkInst(this.shrubGeo, this.shrubMat, plan.shrubs, (it) => {
      D.position.copy(it.p); D.rotation.set(0, it.rotY, 0);
      D.scale.set(it.sc, it.sc, it.sc);
    }, (it) => col.setRGB(0.48 * it.tint, 0.58 * it.tint, 0.4 * it.tint));
    // torus sits in a vertical plane by default; yaw it to arc across the path
    mkInst(this.rootGeo, this.rootMat, plan.roots, (it) => {
      D.position.copy(it.p); D.position.y = -0.04;
      D.rotation.set(0, it.rotY, 0);
      D.scale.set(it.sc, it.sc * it.squash, it.sc * 0.8);
    }, null);
    // branches: cylinder from a to b
    if (plan.branches.length) {
      const m = new THREE.InstancedMesh(this.branchGeo, this.rootMat, plan.branches.length);
      const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion();
      plan.branches.forEach((it, i) => {
        dir.subVectors(it.b, it.a);
        const len = dir.length();
        q.setFromUnitVectors(up, dir.normalize());
        D.position.copy(it.a); D.quaternion.copy(q);
        const th = it.thin ? 0.35 : 1;
        D.scale.set(th, len, th);
        D.updateMatrix(); m.setMatrixAt(i, D.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
      group.add(m);
    }
  }

  buildShaft(seg, world, s, latOff, radius, group, warm = true) {
    // a visible column of light + a lit patch on the ground
    const p = world.pointAt(seg, s, latOff);
    const shaft = new THREE.Mesh(this.shaftGeo, warm ? this.shaftMat : this.coldShaftMat);
    shaft.position.set(p.x + 1.2, 7, p.z + 0.6);
    shaft.scale.set(radius, 14, radius);
    shaft.rotation.z = 0.09; shaft.rotation.x = 0.05;
    const disc = new THREE.Mesh(this.discGeo, warm ? this.shaftDiscMat : this.coldDiscMat);
    disc.position.set(p.x, 0.06, p.z);
    disc.scale.setScalar(radius * 1.7);
    group.add(shaft, disc);
    return { shaft, disc, pos: p };
  }

  // still black water for the bog — a shallow pool the path skirts
  buildWaterPatch(center, radius, group) {
    const geo = new THREE.CircleGeometry(radius, 20);
    geo.rotateX(-Math.PI / 2);
    geo.userData.perSeg = true;
    const m = new THREE.Mesh(geo, this.waterMat);
    m.position.set(center.x, 0.04, center.z);
    group.add(m);
    return m;
  }

  // a stand of reeds around a wet patch
  buildReedPatch(center, radius, n, rng, group) {
    if (n <= 0) return;
    const m = new THREE.InstancedMesh(this.reedGeo, this.reedMat, n);
    const D = this.dummy, col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = rng.float() * TAU, r = radius * (0.6 + rng.float() * 0.7);
      D.position.set(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r);
      D.rotation.set(rng.gauss() * 0.14, rng.float() * TAU, rng.gauss() * 0.14);
      const sc = rng.range(0.7, 1.5);
      D.scale.set(sc * 0.5, sc, sc * 0.5);
      D.updateMatrix(); m.setMatrixAt(i, D.matrix);
      const t = rng.range(0.6, 1.1);
      m.setColorAt(i, col.setRGB(0.32 * t, 0.36 * t, 0.2 * t));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.frustumCulled = false;
    group.add(m);
    return m;
  }

  // ---------- seal walls: the forest knitting shut ----------

  _ensureSealPool(seg) {
    if (seg.sealPool) return seg.sealPool;
    const cap = Math.ceil(seg.samples.length * 3.4) + 60;
    const trunks = new THREE.InstancedMesh(this.trunkGeo, this.barkMat, cap);
    const shrubsCap = Math.ceil(cap * 0.9);
    const shrubs = new THREE.InstancedMesh(this.shrubGeo, this.shrubMat, shrubsCap);
    trunks.count = 0; shrubs.count = 0;
    trunks.frustumCulled = false; shrubs.frustumCulled = false;
    const col = new THREE.Color();
    for (let i = 0; i < cap; i++) trunks.setColorAt(i, col.setRGB(0.44, 0.37, 0.3));
    for (let i = 0; i < shrubsCap; i++) shrubs.setColorAt(i, col.setRGB(0.62, 0.76, 0.54));
    trunks.instanceColor.needsUpdate = true;
    shrubs.instanceColor.needsUpdate = true;
    seg.group.add(trunks, shrubs);
    seg.sealPool = { trunks, shrubs, tN: 0, sN: 0, cap, shrubsCap };
    return seg.sealPool;
  }

  spawnSealAt(seg, s, density = 2.6, instant = false) {
    if (!seg.group) return;
    const pool = this._ensureSealPool(seg);
    const rng = seg.rng;
    const halfW = Math.max(1.2, seg.baseHalfW);
    const n = Math.round(density);
    for (let i = 0; i < n; i++) {
      if (pool.tN >= pool.cap) break;
      const lat = (i / Math.max(1, n - 1) - 0.5) * 2 * halfW * 0.85 + rng.gauss() * 0.4;
      const p = new THREE.Vector3();
      // world.pointAt equivalent without world ref: sample directly
      const idx = clamp(Math.round(s), 0, seg.samples.length);
      const sp = seg.samples.pos[idx], tn = seg.samples.tan[idx];
      p.set(sp.x + tn.z * lat, 0, sp.z - tn.x * lat);
      const h = rng.range(4.5, 8), rad = rng.range(0.8, 1.5);
      const D = this.dummy;
      D.position.copy(p); D.position.y = instant ? 0 : -h;
      D.rotation.set(rng.gauss() * 0.06, rng.float() * TAU, rng.gauss() * 0.06);
      D.scale.set(rad, h, rad);
      D.updateMatrix();
      const ti = pool.tN++;
      pool.trunks.setMatrixAt(ti, D.matrix);
      pool.trunks.count = pool.tN;
      pool.trunks.instanceMatrix.needsUpdate = true;
      if (!instant) this.sealAnims.push({ mesh: pool.trunks, idx: ti, p, h, rad, rotY: D.rotation.y, t: -rng.range(0, 0.5), dur: rng.range(1.9, 3) });
      // brush beneath it
      if (pool.sN < pool.shrubsCap) {
        const si = pool.sN++;
        D.position.set(p.x + rng.gauss() * 0.5, instant ? 0 : -1.6, p.z + rng.gauss() * 0.5);
        const sc = rng.range(0.8, 1.5);
        D.rotation.set(0, rng.float() * TAU, 0); D.scale.set(sc, sc, sc);
        D.updateMatrix();
        pool.shrubs.setMatrixAt(si, D.matrix);
        pool.shrubs.count = pool.sN;
        pool.shrubs.instanceMatrix.needsUpdate = true;
        if (!instant) this.sealAnims.push({ mesh: pool.shrubs, idx: si, p: D.position.clone(), h: 1.6, rad: sc, rotY: D.rotation.y, t: -rng.range(0.2, 0.8), dur: 1.6, shrub: true });
      }
    }
  }

  buildSignpost(seg, headings) {
    const rng = seg.rng.fork(31);
    const L = seg.samples.length;
    const world = { pointAt: (sg, s, lat) => { // local mini-helper
      const idx = clamp(Math.round(s), 0, sg.samples.length);
      const sp = sg.samples.pos[idx], tn = sg.samples.tan[idx];
      return new THREE.Vector3(sp.x + tn.z * (lat || 0), 0, sp.z - tn.x * (lat || 0));
    } };
    const base = world.pointAt(seg, L - 2.5, (rng.chance(0.5) ? 1 : -1) * (seg.baseHalfW + 0.35));
    const g = new THREE.Group();
    g.position.copy(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.3, 6), this.woodMat);
    post.position.y = 1.15;
    post.rotation.z = rng.gauss() * 0.12;
    post.geometry.userData.perSeg = true;
    g.add(post);
    const WORDS = ['OUT', 'DEEPER', 'HOME', 'CHAPEL', 'NO', 'SOON', 'REST', 'END', 'BACK', 'AGAIN'];
    headings.forEach((h, i) => {
      const word = WORDS[rng.int(0, WORDS.length - 1)];
      const tex = canvasTexture(128, 32, (gg, w, hh) => {
        gg.fillStyle = '#2c251d'; gg.fillRect(0, 0, w, hh);
        gg.fillStyle = '#d8d0b8'; gg.font = 'bold 20px Courier New';
        gg.textAlign = 'center'; gg.textBaseline = 'middle';
        gg.fillText(word + ' →', w / 2, hh / 2 + 1);
        gg.globalAlpha = 0.5; gg.fillStyle = '#151009';
        for (let k = 0; k < 40; k++) gg.fillRect(Math.random() * w, Math.random() * hh, 2, 2);
      });
      const mat = new THREE.MeshLambertMaterial({ map: tex });
      mat.userData.perSeg = true;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.2, 0.04), mat);
      plank.geometry.userData.perSeg = true;
      plank.position.y = 1.9 - i * 0.34;
      plank.rotation.y = -h + Math.PI / 2 + rng.gauss() * 0.2; // arrow roughly toward the branch
      plank.rotation.z = rng.gauss() * 0.1;
      g.add(plank);
    });
    seg.group.add(g);
  }

  update(dt) {
    const D = this.dummy;
    for (let i = this.sealAnims.length - 1; i >= 0; i--) {
      const a = this.sealAnims[i];
      a.t += dt;
      if (a.t < 0) continue;
      const k = smoothstep(0, 1, Math.min(1, a.t / a.dur));
      const rise = a.shrub ? 1.6 : a.h;
      D.position.copy(a.p);
      D.position.y = (a.shrub ? 0 : 0) - rise * (1 - k);
      D.rotation.set(0, a.rotY, 0);
      D.scale.set(a.rad, a.shrub ? a.rad : a.h, a.rad);
      D.updateMatrix();
      a.mesh.setMatrixAt(a.idx, D.matrix);
      a.mesh.instanceMatrix.needsUpdate = true;
      if (k >= 1) this.sealAnims.splice(i, 1);
    }
  }

  disposeSegment(seg) {
    if (!seg.group) return;
    // drop any pending anims that reference this segment's pools
    if (seg.sealPool) {
      this.sealAnims = this.sealAnims.filter((a) => a.mesh !== seg.sealPool.trunks && a.mesh !== seg.sealPool.shrubs);
    }
    seg.group.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
      if (o.geometry && o.geometry.userData.perSeg) o.geometry.dispose();
      if (o.material && o.material.userData && o.material.userData.perSeg) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    this.scene.remove(seg.group);
    seg.group = null; seg.sealPool = null;
  }
}
