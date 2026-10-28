// Stage four: the mountain. Snow of orzo, stelline falling, pines of spinach lasagna, a log cabin of
// rigatoni at the summit, and a bobsled run: one long ribbon of wet cooked lasagna laid in a channel
// down the mountain, off a kicker over a crevasse, along a causeway to a mesa where the star waits.
import * as THREE from 'three';
import * as Shapes from './shapes.js';
import { Colliders } from './collide.js';
import { lasagnaStack, addSeaSky, buildHeaps, SEA } from './world.js';
import { FX, Pickups, rodGeometry } from './props.js';
import { mulberry32, makeNoise2D, clamp, lerp, smoothstep, TAU } from './util.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const W = 2.2;            // half-width of the run's channel
const DEPTH = 1.0;        // how far the channel dips below its rims
const SUMMIT = 40.3;

// ------------------------------------------------------------------ the bare mountain
const n1 = makeNoise2D(53), n2 = makeNoise2D(54);
function natural(x, z) {
  const r = Math.hypot(x, z);
  const t = smoothstep(8, 100, r);
  let h = 41.5 * (1 - t) - 1.2;
  const mid = Math.sin(Math.PI * clamp((r - 8) / 92, 0, 1));
  h += mid * (3.0 * n1(x * 0.028, z * 0.028) + 1.1 * n2(x * 0.07, z * 0.07));
  if (r > 100) h -= (r - 100) * 0.25;
  return h;
}

// ------------------------------------------------------------------ the run: a spline down and round the mountain
function buildRun() {
  const ctrl = [];
  const wig = [0, 3, -2.5, 4, -3, 4.5, -4, 3.5, -3, 3, -2.5, 2, 0, 0];
  for (let i = 0; i < 14; i++) {
    const th = 0.15 + i * 0.33, R = 9.5 + 63 * Math.pow(i / 13, 0.95) + wig[i];
    ctrl.push(new THREE.Vector3(Math.cos(th) * R, 0, Math.sin(th) * R));
  }
  const thE = 0.15 + 13 * 0.33;
  const mesa = new THREE.Vector3(Math.cos(thE) * 90, 0, Math.sin(thE) * 90);
  ctrl.push(new THREE.Vector3(Math.cos(thE) * 79, 0, Math.sin(thE) * 79), mesa.clone().lerp(ctrl[13], 0.08));
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  const L = curve.getLength(), N = Math.ceil(L / 0.5);
  const pts = curve.getSpacedPoints(N);
  const P = [];
  for (let i = 0; i <= N; i++) P.push({ x: pts[i].x, z: pts[i].z, s: (i / N) * L });
  for (let i = 0; i <= N; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(N, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    P[i].tx = dx / l; P[i].tz = dz / l; P[i].nx = -dz / l; P[i].nz = dx / l;   // n: to the left
  }
  return { P, L, N, mesa, end: P[N] };
}
const RUN = buildRun();
const GAP_U = 0.6, GAP_LEN = 3.2, DROP_IN = 40, DROP_H = 3.2, LAND_H = 3.5;
const gapS0 = GAP_U * RUN.L, gapS1 = gapS0 + GAP_LEN;
const END_H = 11.0;
// the run's floor height along its length: steeper and flatter stretches, a steep drop-in, then a leap over the crevasse
function runH(s) {
  const u = s / RUN.L, LEAP = DROP_H + LAND_H;
  // always downhill: the base runs to the mesa plus what the drop-in and the leap take, then those are taken
  let h = (SUMMIT - 0.3) - (SUMMIT - 0.3 - END_H - LEAP) * (u + 0.035 * Math.sin(u * TAU * 3));
  h -= DROP_H * smoothstep(gapS0 - DROP_IN, gapS0 - 4, s) + (s > gapS0 ? LAND_H : 0);
  return h;
}

// nearest point on the run, by a coarse grid of sample indices
const CELL = 8, GRID0 = -128, GN = 32;
const buckets = Array.from({ length: GN * GN }, () => []);
RUN.P.forEach((p, i) => {
  const cx = Math.floor((p.x - GRID0) / CELL), cz = Math.floor((p.z - GRID0) / CELL);
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const gx = cx + dx, gz = cz + dz; if (gx < 0 || gz < 0 || gx >= GN || gz >= GN) continue;
    const b = buckets[gz * GN + gx]; if (b[b.length - 1] !== i) b.push(i);
  }
});
function nearestRun(x, z) {
  const cx = Math.floor((x - GRID0) / CELL), cz = Math.floor((z - GRID0) / CELL);
  if (cx < 0 || cz < 0 || cx >= GN || cz >= GN) return null;
  const b = buckets[cz * GN + cx]; if (!b.length) return null;
  let best = null, bd = Infinity;
  for (const i of b) {
    if (i >= RUN.N) continue;
    const a = RUN.P[i], c = RUN.P[i + 1];
    const ex = c.x - a.x, ez = c.z - a.z, l2 = ex * ex + ez * ez || 1e-9;
    const t = clamp(((x - a.x) * ex + (z - a.z) * ez) / l2, 0, 1);
    const px = a.x + ex * t, pz = a.z + ez * t, d2 = (x - px) ** 2 + (z - pz) ** 2;
    if (d2 < bd) { bd = d2; best = { i, t, d: Math.sqrt(d2), side: ((x - px) * a.nx + (z - pz) * a.nz) >= 0 ? 1 : -1, s: a.s + (c.s - a.s) * t }; }
  }
  return best;
}

// ------------------------------------------------------------------ bake the ground into a grid once
const B0 = -128, BS = 0.5, BN = 513;
const HG = new Float32Array(BN * BN), SL = new Uint8Array(BN * BN);
(function bake() {
  const mx = RUN.mesa.x, mz = RUN.mesa.z;
  for (let j = 0; j < BN; j++) for (let i = 0; i < BN; i++) {
    const x = B0 + i * BS, z = B0 + j * BS;
    let h = natural(x, z), slick = 0;
    const nr = nearestRun(x, z);
    if (nr) {
      const { d, s } = nr, u = s / RUN.L;
      const Hc = runH(s);
      const late = smoothstep(0.86, 0.95, u);
      const margin = lerp(6.5, 3.2, late);                       // the causeway at the end has sheer sides
      const dep = DEPTH * (1 - smoothstep(0.962, 0.988, u));      // the channel shallows out to meet the mesa flush
      let hr = d < W ? Hc - dep * (1 - (d / W) * (d / W)) : Hc + 0.12 * smoothstep(W, W + 0.8, d);
      const k = smoothstep(W + 0.8, W + margin, d);
      const outerH = late > 0 && h < hr ? h - 3 * late : h;     // below the causeway the ground falls away
      h = lerp(hr, outerH, k);
      // the crevasse under the gap: a trench across the run that opens downhill (to the run's right)
      if (s > gapS0 - 0.4 && s < gapS1 + 0.4) {
        const along = 1 - smoothstep(GAP_LEN * 0.5 - 0.45, GAP_LEN * 0.5, Math.abs(s - (gapS0 + gapS1) * 0.5));   // sheer, only inside the gap
        const out = -nr.side * d;                                  // positive toward the outside of the mountain
        const floor = runH(gapS0) - 9 - 0.32 * out;
        const sideK = out < 0 ? 1 - smoothstep(10, 15, -out) : 1;
        h = lerp(h, Math.min(h, floor), along * sideK);
      } else if (d < W + 0.25 && u < 0.995) slick = 1;
    }
    // the mesa: a flat top with sheer sides, standing on the shore
    const dm = Math.hypot(x - mx, z - mz);
    if (dm < 11) {
      const onRun = nr && nr.d < W + 1.5;
      const base = onRun ? h : lerp(Math.min(h, 0.5), h, smoothstep(8.4, 11, dm));   // the shore round its foot
      h = lerp(base, END_H, 1 - smoothstep(6.9, 7.9, dm));                            // a sheer edge
      if (dm < 6.9) { h = END_H; slick = 0; }
    }
    HG[j * BN + i] = h; SL[j * BN + i] = slick;
  }
})();
export function mountainH(x, z) {
  const fx = (x - B0) / BS, fz = (z - B0) / BS;
  if (fx < 0 || fz < 0 || fx >= BN - 1 || fz >= BN - 1) return natural(x, z);
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const a = HG[j * BN + i], b = HG[j * BN + i + 1], c = HG[(j + 1) * BN + i], d = HG[(j + 1) * BN + i + 1];
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}
function slickAt(x, z) {
  const i = Math.round((x - B0) / BS), j = Math.round((z - B0) / BS);
  if (i < 0 || j < 0 || i >= BN || j >= BN) return false;
  return SL[j * BN + i] === 1;
}

// ------------------------------------------------------------------ falling stelline
class Snowfall {
  constructor(scene, K) {
    this.n = 760;
    // a flat five-point star: at this size the bevels of the real stellina are invisible
    const sh = new THREE.Shape();
    for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU + Math.PI / 2, r = k % 2 ? 0.017 : 0.038; k ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const g = new THREE.ShapeGeometry(sh);
    this.mesh = new THREE.InstancedMesh(g, K.flake, this.n); this.mesh.frustumCulled = false;
    const rnd = mulberry32(61);
    this.p = new Float32Array(this.n * 3); this.ph = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) { this.p[i * 3] = (rnd() - 0.5) * 30; this.p[i * 3 + 1] = (rnd() - 0.5) * 18; this.p[i * 3 + 2] = (rnd() - 0.5) * 30; this.ph[i] = rnd() * TAU; }
    scene.add(this.mesh);
  }
  update(dt, time, cam) {
    const c = cam.position, B = 15, H = 9;
    for (let i = 0; i < this.n; i++) {
      const o = i * 3, ph = this.ph[i];
      this.p[o] += (Math.sin(time * 0.7 + ph) * 0.35 + 0.25) * dt; this.p[o + 1] -= (0.9 + (i % 7) * 0.08) * dt; this.p[o + 2] += Math.cos(time * 0.6 + ph * 1.3) * 0.3 * dt;
      let x = this.p[o], y = this.p[o + 1], z = this.p[o + 2];
      x = ((x - c.x + B) % (2 * B) + 2 * B) % (2 * B) - B + c.x;
      y = ((y - c.y + H) % (2 * H) + 2 * H) % (2 * H) - H + c.y;
      z = ((z - c.z + B) % (2 * B) + 2 * B) % (2 * B) - B + c.z;
      this.p[o] = x; this.p[o + 1] = y; this.p[o + 2] = z;
      _e.set(ph + time * 1.1, ph * 2 + time * 0.8, time * 0.5); _q.setFromEuler(_e);
      _m.compose(_p.set(x, y, z), _q, _s.setScalar(0.8 + (i % 5) * 0.12)); this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ the stage
export function buildMountain(scene, K, audio) {
  const col = new Colliders(mountainH);
  const S = { id: 'mountain', scene, colliders: col, zones: [], supports: [], tube: null };
  const SS = addSeaSky(scene, K); S.skyMat = SS.skyMat;
  SS.sea.material = K.drift;
  buildHeaps(scene, K, { seed: 17, cx0: 0, cz0: 0, turn: 0.4 });
  const fx = new FX(scene, K, audio); S.fx = fx;
  S.slickAt = slickAt;
  S.run = RUN; S.runH = runH; S.gap = [gapS0, gapS1];
  S.groundSurface = (x, z) => slickAt(x, z) ? 'slick' : 'snow';
  // a cold place: paler sky, cooler haze and sun
  S.sky = { zen: [0.34, 0.5, 0.82], hor: [0.92, 0.93, 0.96], low: [0.86, 0.88, 0.92], glow: [1.0, 0.94, 0.84] };
  S.fogColor = new THREE.Color(0.86, 0.88, 0.93);
  S.sunColor = new THREE.Color(1.0, 0.95, 0.88); S.sunIntensity = 3.0;

  // ---------------------------------------------------------------- ground mesh
  {
    const X0 = -114, X1 = 114, step = 1.0, nx = Math.round((X1 - X0) / step);
    const g = new THREE.PlaneGeometry(X1 - X0, X1 - X0, nx, nx); g.rotateX(-Math.PI / 2);
    const p = g.getAttribute('position'), uv = g.getAttribute('uv');
    const colA = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y0 = mountainH(x, z);
      const nr = nearestRun(x, z), near = nr ? 1 - smoothstep(W + 0.5, W + 3.5, nr.d) : 0;
      const under = nr && slickAt(x, z) ? 0.22 : 0, y = y0 - under;
      p.setY(i, y); uv.setXY(i, x, z);
      const v = 0.95 + 0.05 * n2(x * 0.3, z * 0.3) - near * 0.07, shore = 1 - smoothstep(-0.6, 1.5, y);
      colA[i * 3] = v * lerp(1, 0.92, shore); colA[i * 3 + 1] = v * lerp(1, 0.9, shore); colA[i * 3 + 2] = v * lerp(1.0, 0.82, shore);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colA, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, K.snow); m.receiveShadow = true; scene.add(m);
  }

  // ---------------------------------------------------------------- the run: lasagna sheets laid end to end in the channel
  {
    const cols = 18, pos = [], colA = [], uvs = [], idx = [];
    let rowsMade = 0, start = 0;
    const flush = (rows) => {
      for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
        const a = start + r * cols + c, b = a + 1, cc = a + cols, d = cc + 1; idx.push(a, cc, b, b, cc, d);
      }
    };
    let rows = 0;
    for (let i = 0; i <= RUN.N; i++) {
      const p = RUN.P[i];
      const inGap = p.s > gapS0 && p.s < gapS1;
      const onMesa = Math.hypot(p.x - RUN.mesa.x, p.z - RUN.mesa.z) < 7.15;   // the ribbon stops at the mesa's rim
      if (inGap || onMesa || i === RUN.N) { if (rows > 1) flush(rows); start = pos.length / 3; rows = 0; if (inGap) continue; if (onMesa) break; }
      const seam = (p.s % 3.9) / 3.9, dark = seam < 0.05 ? 0.82 : 1;
      for (let c = 0; c < cols; c++) {
        const o = (c / (cols - 1) - 0.5) * 2 * (W + 0.45);
        const x = p.x + p.nx * o, z = p.z + p.nz * o;
        const edge = smoothstep(W - 0.1, W + 0.45, Math.abs(o));
        const ruf = Math.sin(p.s * 7.5 + (o > 0 ? 1.3 : 0)) * 0.07 * edge;
        pos.push(x, mountainH(x, z) + 0.07 + edge * 0.06 + ruf, z);
        const tone = (0.96 + 0.04 * Math.sin(p.s * 0.37)) * dark;
        colA.push(tone, tone * 0.99, tone * 0.96);
        uvs.push(o, p.s);
      }
      rows++;
    }
    if (rows > 1) flush(rows);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, K.run); m.receiveShadow = true; scene.add(m);
  }

  // ---------------------------------------------------------------- the summit: a log cabin of rigatoni, a start banner
  const log = Shapes.rigatoniTower({ innerRadius: 0.15, outerRadius: 0.26, height: 1, ridges: 14, notch: null, cols: 42, rows: 2 });
  log.rotateZ(Math.PI / 2); log.translate(0.5, 0, 0);          // now along x, from -0.5 to 0.5
  const cab = { x: -3.6, z: 3.4, w: 6.4, d: 5.0, h: 3.0 };
  const cy = mountainH(cab.x, cab.z) - 0.1;
  const logs = [];
  for (let k = 0; k < 6; k++) {
    const y = cy + 0.26 + k * 0.48;
    logs.push([cab.x, y, cab.z - cab.d / 2, cab.w + 0.6, 0]); logs.push([cab.x, y, cab.z + cab.d / 2, cab.w + 0.6, 0]);
    logs.push([cab.x - cab.w / 2, y + 0.24, cab.z, cab.d + 0.6, Math.PI / 2]); logs.push([cab.x + cab.w / 2, y + 0.24, cab.z, cab.d + 0.6, Math.PI / 2]);
  }
  const logIM = new THREE.InstancedMesh(log, K.dryBig, logs.length);
  logs.forEach(([x, y, z, len, rot], i) => { _m.compose(_p.set(x, y, z), _q.setFromAxisAngle(UP, rot), _s.set(len, 1, 1)); logIM.setMatrixAt(i, _m); });
  logIM.castShadow = true; logIM.receiveShadow = true; scene.add(logIM);
  col.add({ type: 'box', x: cab.x, y: cy + cab.h / 2 + 0.2, z: cab.z, hx: cab.w / 2 + 0.3, hy: cab.h / 2 + 0.2, hz: cab.d / 2 + 0.3, surface: 'dry', sticky: false });
  // roof: two cooked sheets, snow on top
  const roofG = Shapes.lasagnaRiccia({ width: cab.d * 0.62 + 0.6, length: cab.w + 1.2, thickness: 0.08, ruffleAmp: 0.06, ruffleWaves: 10, ruffleWidth: 0.25 });
  roofG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(roofG.getAttribute('position').count * 3).fill(1), 3));
  for (const sgn of [-1, 1]) {
    const r = new THREE.Mesh(roofG, K.sheet);
    r.position.set(cab.x, cy + cab.h + 0.85, cab.z + sgn * cab.d * 0.26); r.rotation.set(sgn * 0.62, Math.PI / 2, 0, 'YXZ');
    r.castShadow = true; r.receiveShadow = true; scene.add(r);
    const snow = new THREE.Mesh(roofG, K.snow); snow.position.copy(r.position).add(new THREE.Vector3(0, 0.09, sgn * 0.05)); snow.rotation.copy(r.rotation); snow.scale.set(0.92, 1, 0.94);
    snow.receiveShadow = true; scene.add(snow);
  }
  col.add({ type: 'box', x: cab.x, y: cy + cab.h + 1.0, z: cab.z, hx: cab.w / 2 + 0.6, hy: 0.9, hz: cab.d / 2 - 0.3, surface: 'dry', sticky: false });
  // the start: two penne posts and a spinach banner over the head of the run
  const p0 = RUN.P[8];
  const penne = Shapes.penne({ radius: 0.2, length: 5.0, wall: 0.05, ridges: 12 });
  for (const sgn of [-1, 1]) {
    const x = p0.x + p0.nx * sgn * (W + 0.9), z = p0.z + p0.nz * sgn * (W + 0.9), y = mountainH(x, z);
    const m = new THREE.Mesh(penne, K.dryBig); m.position.set(x, y + 2.3, z); m.castShadow = true; scene.add(m);
    col.add({ type: 'cyl', x, z, r: 0.22, y0: y - 1, y1: y + 4.8, surface: 'dry', sticky: false });
  }
  {
    const bar = new THREE.Mesh(rodGeometry(2 * (W + 0.9) + 0.5, 0.07, 10, 6), K.dry);
    bar.position.set(p0.x, mountainH(p0.x, p0.z) + 4.72, p0.z); bar.rotation.y = Math.atan2(-p0.nz, p0.nx); bar.castShadow = true; scene.add(bar);
    const g = Shapes.drapedSheet({ width: 2 * (W + 0.9), drop: 0.9, flap: 0.3, fold: 0.1, seed: 77 });
    const m = new THREE.Mesh(g, K.banner); const y = mountainH(p0.x, p0.z) + 4.7;
    m.position.set(p0.x, y, p0.z); m.rotation.y = Math.atan2(p0.tx, p0.tz) + Math.PI; m.castShadow = true; scene.add(m);
  }

  // ---------------------------------------------------------------- pines of spinach lasagna, away from the run
  {
    const rnd = mulberry32(71), spots = [];
    for (let k = 0; k < 2600 && spots.length < 54; k++) {
      const a = rnd() * TAU, r = 12 + rnd() * 84, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const nr = nearestRun(x, z); if (nr && nr.d < W + 5) continue;
      if (Math.hypot(x - RUN.mesa.x, z - RUN.mesa.z) < 13) continue;
      if (Math.hypot(x - cab.x, z - cab.z) < 7) continue;
      const y = mountainH(x, z); if (y < 0.6) continue;
      const slope = Math.abs(mountainH(x + 1, z) - mountainH(x - 1, z)) + Math.abs(mountainH(x, z + 1) - mountainH(x, z - 1));
      if (slope > 1.6) continue;
      if (spots.some(s => Math.hypot(s[0] - x, s[2] - z) < 3.4)) continue;
      spots.push([x, y, z, 0.75 + rnd() * 0.6, rnd() * TAU]);
    }
    const geos = [Shapes.pineTiers({ seed: 1 }), Shapes.pineTiers({ seed: 2, tiers: 6, height: 6.2 })];
    const trunk = Shapes.rodBundle({ count: 7, length: 2.0, rodRadius: 0.075, bundleRadius: 0.2, twist: 0.5, flareBottom: 0.6, flareTop: 0.2, seed: 9 });
    const tIM = new THREE.InstancedMesh(trunk, K.wheat, spots.length);
    const lists = [[], []];
    spots.forEach((s, i) => { lists[i % 2].push(s); _m.compose(_p.set(s[0], s[1] - 0.15, s[2]), _q.setFromAxisAngle(UP, s[4]), _s.setScalar(s[3])); tIM.setMatrixAt(i, _m); col.add({ type: 'cyl', x: s[0], z: s[2], r: 0.32 * s[3], y0: s[1] - 1, y1: s[1] + 5 * s[3], surface: 'dry', sticky: false }); });
    tIM.castShadow = true; scene.add(tIM);
    lists.forEach((L, gi) => {
      const im = new THREE.InstancedMesh(geos[gi], K.pine, L.length);
      L.forEach((s, i) => { _m.compose(_p.set(s[0], s[1] - 0.1, s[2]), _q.setFromAxisAngle(UP, s[4]), _s.setScalar(s[3])); im.setMatrixAt(i, _m); });
      im.castShadow = true; im.receiveShadow = true; scene.add(im);
    });
    S.pines = spots;
  }

  // ---------------------------------------------------------------- the mesa: a round stack of dry lasagna, a nest and the star
  const mx = RUN.mesa.x, mz = RUN.mesa.z;
  {
    const g = lasagnaStack({ w: 14.6, d: 14.6, y0: -3, y1: END_H + 0.06, seed: 91, lh: 0.32, rc: 7.3, step: 0.5, bulgeK: 0.45, rufK: 1.2, driftK: 1.1, tint: new THREE.Color(1, 0.97, 0.9) });
    const m = new THREE.Mesh(g, K.dryStack); m.position.set(mx, 0, mz); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    col.add({ type: 'cyl', x: mx, z: mz, r: 7.25, y0: -3, y1: END_H, surface: 'dry', sticky: false });
    const capG = new THREE.CylinderGeometry(6.6, 7.0, 0.14, 48, 1);
    capG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(capG.getAttribute('position').count * 3).fill(1), 3));
    const cap = new THREE.Mesh(capG, K.snow); cap.position.set(mx, END_H, mz); cap.receiveShadow = true; scene.add(cap);
  }
  const nest = new THREE.Mesh(Shapes.nido({ radius: 1.0, height: 0.5, ribbons: 22, ribbonWidth: 0.11, ribbonThickness: 0.024, seed: 81 }), K.nest);
  nest.position.set(mx, END_H - 0.02, mz); nest.castShadow = true; nest.receiveShadow = true; scene.add(nest);
  const star = new THREE.Mesh(Shapes.stellina({ outerRadius: 1.0, innerRadius: 0.53, thickness: 0.34, points: 5, holeRadius: 0.11 }), K.star);
  star.position.set(mx, END_H + 1.2, mz); star.castShadow = true; scene.add(star);
  S.star = { mesh: star, home: star.position.clone(), taken: false };

  // ---------------------------------------------------------------- rotelle: down the run, round the summit, on the mountain
  const R = 0.36, pk = [];
  for (const u of [0.05, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.585, 0.66, 0.74, 0.82, 0.9]) {
    const p = RUN.P[Math.round(u * RUN.N)]; pk.push([p.x, mountainH(p.x, p.z) + 0.75, p.z]);
  }
  pk.push([3, SUMMIT + 0.8, -4], [-2, SUMMIT + 0.8, -6], [5, SUMMIT + 0.8, 5]);
  for (const [a, r] of [[1.0, 30], [2.2, 44], [3.4, 58], [4.0, 36], [5.2, 50], [0.4, 70], [2.8, 76], [5.8, 66]]) {
    const x = Math.cos(a) * r, z = Math.sin(a) * r; pk.push([x, mountainH(x, z) + 0.8, z]);
  }
  pk.push([mx + 2.4, END_H + 0.8, mz + 1.2], [mx - 2.2, END_H + 0.8, mz - 1.6]);
  const pickups = new Pickups(scene, K, audio, pk);
  S.pickups = pickups;

  const snow = new Snowfall(scene, K);

  // ---------------------------------------------------------------- spawn, intro
  const a0 = RUN.P[2];
  S.spawn = new THREE.Vector3(-1.5, mountainH(-1.5, -2) + 0.46, -2);
  S.facing = Math.atan2(a0.x - -1.5, a0.z - -2);
  const st = S.star.home, rp = (u, up) => { const p = RUN.P[Math.round(u * RUN.N)]; return new THREE.Vector3(p.x, mountainH(p.x, p.z) + up, p.z); };
  S.intro = {
    len: 7.4,
    fly: new THREE.CatmullRomCurve3([st.clone().add(new THREE.Vector3(5, 2.5, 5)), rp(0.92, 9), rp(0.7, 12), rp(0.45, 13), rp(0.18, 10), new THREE.Vector3(-9, SUMMIT + 4.5, -10)], false, 'centripetal'),
    look: new THREE.CatmullRomCurve3([st.clone(), rp(0.97, 1), rp(0.78, 2), rp(0.5, 2), rp(0.2, 2), new THREE.Vector3(2, SUMMIT + 1.5, 0)], false, 'centripetal'),
  };

  // wind is strongest at the top
  let camRef = null;
  S.update = (dt, time, hero) => {
    fx.update(dt, col);
    pickups.update(dt, time, hero);
    if (!S.star.taken) { star.rotation.y = time * 0.6; star.position.y = S.star.home.y + Math.sin(time * 1.3) * 0.08; }
    // brushing a pine knocks orzo off it
    if (hero.grounded && Math.hypot(hero.vel.x, hero.vel.z) > 3) {
      for (const s of S.pines) {
        if (Math.abs(hero.pos.x - s[0]) < 1.2 * s[3] && Math.abs(hero.pos.z - s[2]) < 1.2 * s[3] && (s.t ?? 0) < time - 1.5) { s.t = time; audio?.thump?.(0.6); }
      }
    }
  };
  S.view = (dt, time, camera) => { snow.update(dt, time, camera); return { wind01: clamp((camera.position.y - 4) / 36, 0.15, 1) }; };
  S.fixed = () => {};
  S.resetBreakables = () => {};
  S.reset = () => { pickups.reset(); S.star.taken = false; star.position.copy(S.star.home); };
  return S;
}
