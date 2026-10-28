// The stage: a meadow that is one enormous cooked lasagna sheet draped over hills,
// cliffs of stacked lasagna, a sea of pastina, and pasta heaps on the horizon.
import * as THREE from 'three';
import { mulberry32, makeNoise2D, smoothstep, lerp, clamp } from './util.js';
import { Colliders } from './collide.js';

export const SEA = -1.0;

const noise = makeNoise2D(7);
const BUMPS = [
  { x: -16, z: 66, r: 10, h: 2.6 }, { x: 17, z: 63, r: 11, h: 2.0 }, { x: -7, z: 44, r: 7, h: 0.8 },
  { x: 23, z: 42, r: 9, h: 2.4 }, { x: -26, z: 46, r: 9, h: 2.8 }, { x: 8, z: 78, r: 12, h: 1.6 },
  { x: -30, z: 30, r: 8, h: 1.4 }, { x: 31, z: 27, r: 8, h: 1.7 },
];

// Meadow ground height. Outside the island it drops under the pastina.
export function meadowH(x, z) {
  const ex = x / 46, ez = (z - 52) / 38;
  const rIsl = Math.sqrt(ex * ex + ez * ez);
  let mask = smoothstep(1.0, 0.8, rIsl);
  // keep the ground up along the cliff base
  const base = smoothstep(30, 26, Math.abs(x)) * smoothstep(12, 17, z) * smoothstep(36, 22, z);
  mask = Math.max(mask, base);
  let h = 0.7;
  for (const b of BUMPS) { const dx = x - b.x, dz = z - b.z; h += b.h * Math.exp(-(dx * dx + dz * dz) / (b.r * b.r)); }
  h += noise(x * 0.055, z * 0.055) * 0.55 + noise(x * 0.16 + 9, z * 0.16) * 0.14;
  h += smoothstep(34, 20, z) * 1.0;                         // rises to meet the first wall
  const sp = Math.hypot(x, z - 58); h = lerp(h, 1.1, smoothstep(6, 2, sp) * 0.6); // a calm landing spot
  return lerp(-3.0, h, mask);
}

// ---------------------------------------------------------------- layered lasagna stacks
function perimeter(hw, hd, rc, step) {
  rc = Math.min(rc, hw * 0.9, hd * 0.9);
  const cx = hw - rc, cz = hd - rc;
  const segs = [
    { l: [hw, -cz, hw, cz, 1, 0] }, { a: [cx, cz, 0, Math.PI / 2] },
    { l: [cx, hd, -cx, hd, 0, 1] }, { a: [-cx, cz, Math.PI / 2, Math.PI] },
    { l: [-hw, cz, -hw, -cz, -1, 0] }, { a: [-cx, -cz, Math.PI, 1.5 * Math.PI] },
    { l: [-cx, -hd, cx, -hd, 0, -1] }, { a: [cx, -cz, 1.5 * Math.PI, 2 * Math.PI] },
  ];
  for (const s of segs) s.len = s.l ? Math.hypot(s.l[2] - s.l[0], s.l[3] - s.l[1]) : rc * (s.a[3] - s.a[2]);
  const total = segs.reduce((a, s) => a + s.len, 0);
  const n = Math.max(24, Math.round(total / step));
  const P = { x: [], z: [], nx: [], nz: [], s: [], n, total };
  for (let i = 0; i < n; i++) {
    let s = (i / n) * total, k = 0;
    while (s > segs[k].len && k < segs.length - 1) { s -= segs[k].len; k++; }
    const g = segs[k], t = g.len > 0 ? s / g.len : 0;
    if (g.l) { P.x.push(lerp(g.l[0], g.l[2], t)); P.z.push(lerp(g.l[1], g.l[3], t)); P.nx.push(g.l[4]); P.nz.push(g.l[5]); }
    else { const a = lerp(g.a[2], g.a[3], t); P.x.push(g.a[0] + rc * Math.cos(a)); P.z.push(g.a[1] + rc * Math.sin(a)); P.nx.push(Math.cos(a)); P.nz.push(Math.sin(a)); }
    P.s.push((i / n) * total);
  }
  return P;
}

const VERDE = new THREE.Color('#7f9f48'), NATURAL = new THREE.Color('#f1cf7f');
const VERDE_TINT = new THREE.Color(VERDE.r / NATURAL.r, VERDE.g / NATURAL.g, VERDE.b / NATURAL.b);

/** A stack of cooked lasagna sheets: wavy sheet edges, slight hand-stacked drift, flat top. */
export function lasagnaStack({ w, d, y0, y1, lh = 0.24, seed = 1, verde = 0, rc = 0.7, step = 0.42, bands = null, bandColor = null, bulgeK = 1, rufK = 1, driftK = 1, tint = null }) {
  const rnd = mulberry32(seed);
  const hw = w / 2, hd = d / 2;
  const P = perimeter(hw, hd, rc, step);
  const n = P.n;
  const layers = Math.max(1, Math.round((y1 - y0) / lh));
  const lhh = (y1 - y0) / layers;
  const pos = [], nor = [], uv = [], col = [], idx = [];
  let dx = 0, dz = 0;
  let topRing = null;
  for (let L = 0; L < layers; L++) {
    const yb = y0 + L * lhh, yt = yb + lhh;
    dx = clamp(dx + (rnd() - 0.5) * 0.05 * driftK, -0.08 * driftK, 0.08 * driftK);
    dz = clamp(dz + (rnd() - 0.5) * 0.05 * driftK, -0.08 * driftK, 0.08 * driftK);
    const off = (rnd() - 0.5) * 0.1;
    const ph = rnd() * 100, ph2 = rnd() * 100, amp = (0.025 + rnd() * 0.05) * rufK, k = (Math.PI * 2) / (0.75 + rnd() * 0.5);
    const isTop = L === layers - 1;
    const bulge = lhh * (isTop ? 0.55 : 0.42) * bulgeK;
    let tint = NATURAL;
    const isVerde = L < layers - 2 && (bands ? bands(L, layers) : rnd() < verde);
    const c = new THREE.Color(1, 1, 1);
    if (isVerde) c.copy(bandColor || VERDE_TINT);
    if (tint) c.multiply(tint);
    c.multiplyScalar(0.93 + rnd() * 0.1);
    const rings = [
      { y: yb, out: off - 0.02, rf: 0.5, yw: 0 },
      { y: yb + lhh * 0.5, out: off + bulge, rf: 1.0, yw: 1 },
      { y: yt, out: off + 0.01, rf: 0.6, yw: 0.4 },
    ];
    const base = pos.length / 3;
    for (let ri = 0; ri < rings.length; ri++) {
      const R = rings[ri];
      for (let i = 0; i < n; i++) {
        const s = P.s[i];
        const ruf = (Math.sin(k * s + ph) + 0.35 * Math.sin(2.3 * k * s + ph2)) * amp;
        const o = R.out + ruf * R.rf;
        const yv = R.y + Math.cos(k * s + ph) * amp * 0.45 * R.yw;
        pos.push(P.x[i] + P.nx[i] * o + dx, yv, P.z[i] + P.nz[i] * o + dz);
        nor.push(P.nx[i], 0, P.nz[i]);
        uv.push(s, yv);
        const shade = ri === 0 ? 0.86 : 1.0;
        col.push(c.r * shade, c.g * shade, c.b * shade);
      }
    }
    for (let ri = 0; ri < rings.length - 1; ri++) {
      for (let i = 0; i < n; i++) {
        const a = base + ri * n + i, b = base + ri * n + ((i + 1) % n);
        const c2 = a + n, d2 = b + n;
        idx.push(a, d2, b, a, c2, d2);
      }
    }
    if (isTop) topRing = { start: base + 2 * n, c };
  }
  // flat top: triangulate the top ring outline
  const contour = [];
  for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(pos[(topRing.start + i) * 3], pos[(topRing.start + i) * 3 + 2]));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const capBase = pos.length / 3;
  for (let i = 0; i < n; i++) {
    const x = contour[i].x, z = contour[i].y;
    pos.push(x, y1, z); nor.push(0, 1, 0); uv.push(x, z); col.push(topRing.c.r, topRing.c.g, topRing.c.b);
  }
  // orient cap triangles upward
  for (const t of tris) {
    const [a, b, c] = t;
    const ax = contour[a].x, az = contour[a].y, bx = contour[b].x, bz = contour[b].y, cx = contour[c].x, cz = contour[c].y;
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    if (ny > 0) idx.push(capBase + a, capBase + b, capBase + c); else idx.push(capBase + a, capBase + c, capBase + b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  // side bands: smooth normals from the actual rounded profile; keep the cap flat
  const capStart = capBase;
  const tmp = g.clone(); tmp.computeVertexNormals();
  const nn = tmp.getAttribute('normal');
  const na = g.getAttribute('normal');
  for (let i = 0; i < capStart; i++) na.setXYZ(i, nn.getX(i), nn.getY(i), nn.getZ(i));
  tmp.dispose();
  g.computeBoundingSphere();
  return g;
}

function fixWinding(g, capStart) {
  const p = g.getAttribute('position'), n = g.getAttribute('normal'), ix = g.getIndex();
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
  const a = ix.getX(0), b = ix.getX(1), c = ix.getX(2);
  A.fromBufferAttribute(p, a); B.fromBufferAttribute(p, b); C.fromBufferAttribute(p, c);
  const fn = B.sub(A).cross(C.sub(A));
  N.fromBufferAttribute(n, a);
  if (fn.dot(N) < 0) {
    const arr = ix.array;
    for (let i = 0; i < arr.length; i += 3) {
      if (arr[i] >= capStart) continue;
      const t = arr[i + 1]; arr[i + 1] = arr[i + 2]; arr[i + 2] = t;
    }
    ix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- the stage
export function buildWorld(scene, K, opts = {}) {
  const colliders = new Colliders(meadowH);
  const W = { colliders, slabs: [], zones: [], meshes: [], tops: [] };

  // meadow ground
  const gw = 128, gd = 96, gx = 0, gz = 54;
  const tg = new THREE.PlaneGeometry(gw, gd, 256, 192);
  tg.rotateX(-Math.PI / 2);
  const tp = tg.getAttribute('position'), tuv = tg.getAttribute('uv');
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i) + gx, z = tp.getZ(i) + gz;
    tp.setXYZ(i, x, meadowH(x, z), z);
    tuv.setXY(i, x, z);
  }
  tg.computeVertexNormals();
  const ground = new THREE.Mesh(tg, K.ground);
  ground.receiveShadow = true; ground.castShadow = false;
  scene.add(ground);
  W.ground = ground;

  // lasagna stacks: { id, x, z, w, d, y0, y1, verde, bands }
  const SLABS = [
    // the first wall: a step you climb by sticking to it
    { id: 'step', x: 0, z: 21.8, w: 15, d: 6.6, y0: -1.4, y1: 3.7, verde: 0.15, seed: 3 },
    // the cliff, cut by a chimney (left, right, back) and the chimney floor
    { id: 'cliffL', x: -14.65, z: 7.75, w: 26.7, d: 21.5, y0: -1.4, y1: 9.6, bands: (L) => (L % 9) < 2, seed: 4, rc: 0.4 },
    { id: 'cliffR', x: 14.65, z: 7.75, w: 26.7, d: 21.5, y0: -1.4, y1: 9.6, bands: (L) => (L % 9) < 2, seed: 5, rc: 0.4 },
    { id: 'cliffB', x: 0, z: 5.1, w: 3.4, d: 16.2, y0: -1.4, y1: 9.6, bands: (L) => (L % 9) < 2, seed: 6, rc: 0.3 },
    { id: 'chimneyFloor', x: 0, z: 15.9, w: 3.2, d: 5.4, y0: -1.4, y1: 3.7, verde: 0.1, seed: 7, rc: 0.25 },
    // the far side of the ravine: the garden
    { id: 'garden', x: 0, z: -28.5, w: 32, d: 19, y0: -1.4, y1: 9.2, verde: 0.3, seed: 8 },
    // a ledge on the garden, and the high shelf
    { id: 'ledge', x: -10, z: -33, w: 8, d: 8, y0: 9.0, y1: 14.0, verde: 0.0, seed: 9, rc: 0.8 },
    { id: 'shelf', x: -10, z: -44.5, w: 12, d: 7, y0: -1.4, y1: 19.5, bands: (L) => (L % 7) === 3, seed: 10 },
    // the tower ground
    { id: 'tower', x: 24, z: -51, w: 20, d: 22, y0: -1.4, y1: 18.5, bands: (L) => (L % 11) < 3, seed: 11 },
  ];
  for (const s of SLABS) {
    const g = lasagnaStack({ w: s.w, d: s.d, y0: s.y0, y1: s.y1, seed: s.seed, verde: s.verde ?? 0, bands: s.bands, rc: s.rc ?? 0.7 });
    const m = new THREE.Mesh(g, K.sheet);
    m.position.set(s.x, 0, s.z);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    const c = colliders.add({ type: 'box', id: s.id, x: s.x, y: (s.y0 + s.y1) / 2, z: s.z, hx: s.w / 2, hy: (s.y1 - s.y0) / 2, hz: s.d / 2, sticky: true, surface: 'cooked', safe: true });
    W.slabs.push({ ...s, mesh: m, collider: c });
    W.tops.push({ x: s.x, z: s.z, w: s.w, d: s.d, y: s.y1, id: s.id });
  }

  // camera hint: the chimney wants a camera from the south, looking in
  W.zones.push({ id: 'chimney', x0: -1.6, x1: 1.6, z0: 12.8, z1: 19.0, y0: 3.4, y1: 11.0, yaw: 0, pitch: 0.16, dist: 8.5 });

  const SS = addSeaSky(scene, K);
  W.sea = SS.sea; W.sky = SS.sky; W.skyMat = SS.skyMat;

  buildHeaps(scene, K);
  buildMeadowSheets(scene, K);
  return W;
}

// Loose lasagna sheets lying on the meadow: ruffled long edges, visible thickness.
function buildMeadowSheets(scene, K) {
  const rnd = mulberry32(404);
  const sheets = [
    [-9, 54, 0.5, 7, 3.6, 0], [10, 47, -0.4, 8, 4.0, 1], [-18, 40, 1.2, 6, 3.4, 0], [19, 60, 0.2, 7.5, 3.8, 0],
    [-4, 72, -0.9, 9, 4.2, 1], [14, 30, 1.0, 6, 3.2, 0], [-24, 56, -0.2, 6.5, 3.5, 1], [4, 38, 2.0, 5.5, 3.0, 0],
    [-12, 27, 0.3, 7, 3.6, 0], [24, 50, 1.6, 6, 3.3, 1],
  ];
  const pos = [], nor = [], uv = [], col = [], idx = [];
  const NX = 10, NZ = 26, RUF = 0.32;
  for (const [cx, cz, rot, len, wid, verde] of sheets) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const tint = verde ? VERDE_TINT : new THREE.Color(1, 1, 1);
    const k = (Math.PI * 2) / (0.62 + rnd() * 0.2), ph = rnd() * 9;
    const base = pos.length / 3;
    const ring = [];
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const u = i / NX - 0.5, v = j / NZ - 0.5;
      let lx = u * wid, lz = v * len;
      const edge = Math.max(0, (Math.abs(lx) - (wid / 2 - RUF)) / RUF); // 0 inside, 1 at the ruffled edge
      const ruf = Math.sin(lz * k + ph + (lx > 0 ? 1.7 : 0)) * edge * edge;
      lx += Math.sign(lx) * ruf * 0.05;
      const x = cx + c * lx + s * lz, z = cz - s * lx + c * lz;
      const lift = 0.055 + ruf * 0.07 + edge * 0.02;
      pos.push(x, meadowH(x, z) + lift, z);
      nor.push(0, 1, 0); uv.push(lx, lz);
      const sh = 0.95 + rnd() * 0.04;
      col.push(tint.r * sh, tint.g * sh, tint.b * sh);
      if (i === 0 || i === NX || j === 0 || j === NZ) ring.push([i, j]);
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const a = base + j * (NX + 1) + i, b = a + 1, d = a + NX + 1, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    // skirt: the sheet's cut edge down to the ground, so it has thickness
    const perim = [];
    for (let i = 0; i <= NX; i++) perim.push(i);
    for (let j = 1; j <= NZ; j++) perim.push(j * (NX + 1) + NX);
    for (let i = NX - 1; i >= 0; i--) perim.push(NZ * (NX + 1) + i);
    for (let j = NZ - 1; j >= 1; j--) perim.push(j * (NX + 1));
    const sb = pos.length / 3;
    for (const p of perim) {
      const o = (base + p) * 3;
      pos.push(pos[o], pos[o + 1] - 0.09, pos[o + 2]); nor.push(0, 0, 0); uv.push(uv[(base + p) * 2], uv[(base + p) * 2 + 1] + 0.1);
      col.push(col[o] * 0.8, col[o + 1] * 0.8, col[o + 2] * 0.8);
    }
    for (let q = 0; q < perim.length; q++) {
      const a = base + perim[q], b = base + perim[(q + 1) % perim.length], c2 = sb + q, d2 = sb + (q + 1) % perim.length;
      idx.push(a, b, c2, b, d2, c2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, K.sheet);
  m.receiveShadow = true; m.castShadow = true;
  scene.add(m);
}


// The pastina sea and the sky dome every stage stands in.
export function addSeaSky(scene, K, { sea: withSea = true } = {}) {
  const W = {};
  // sea of pastina
  if (withSea) {
  const sg = new THREE.PlaneGeometry(1400, 1400, 1, 1); sg.rotateX(-Math.PI / 2);
  const suv = sg.getAttribute('uv'), sp = sg.getAttribute('position');
  for (let i = 0; i < sp.count; i++) suv.setXY(i, sp.getX(i), sp.getZ(i));
  const sea = new THREE.Mesh(sg, K.pastina);
  sea.position.y = SEA; sea.receiveShadow = true;
  scene.add(sea);
  W.sea = sea;
  }

  // sky
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: new THREE.Vector3(0, 1, 0) } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `varying vec3 vDir; uniform vec3 uSun;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 zen = vec3(0.16, 0.33, 0.72) * 1.15;
        vec3 hor = vec3(1.0, 0.8, 0.58) * 1.1;
        vec3 low = vec3(0.95, 0.74, 0.5) * 1.1;
        vec3 c = h > 0.0 ? mix(hor, zen, pow(clamp(h, 0.0, 1.0), 0.38)) : mix(hor, low, clamp(-h * 4.0, 0.0, 1.0));
        float s = max(dot(d, uSun), 0.0);
        c += vec3(1.0, 0.82, 0.55) * (pow(s, 7.0) * 0.55 + pow(s, 60.0) * 1.4) + vec3(1.0, 0.9, 0.7) * pow(s, 900.0) * 30.0;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -1;
  scene.add(sky);
  W.sky = sky; W.skyMat = skyMat;

  return W;
}

// Pasta heaps rising out of the pastina on the horizon: piles of big tubes and wheels.
export function buildHeaps(scene, K, { seed = 99, cx0 = 0, cz0 = 40, turn = 0 } = {}) {
  const rnd = mulberry32(seed);
  const tube = new THREE.CylinderGeometry(1, 1, 1, 7, 1, true);
  tube.rotateZ(Math.PI / 2);
  const tubeUv = tube.getAttribute('uv'), tubeP = tube.getAttribute('position');
  for (let i = 0; i < tubeUv.count; i++) tubeUv.setXY(i, tubeP.getX(i) * 4, tubeUv.getX(i) * 6);
  const heaps = [
    { a: 0.25, r: 300, R: 62, H: 30, n: 760, k: 0 }, { a: 1.15, r: 340, R: 80, H: 38, n: 900, k: 1 },
    { a: 2.05, r: 290, R: 55, H: 26, n: 640, k: 0 }, { a: 2.85, r: 360, R: 90, H: 44, n: 1000, k: 1 },
    { a: 3.75, r: 310, R: 60, H: 28, n: 700, k: 0 }, { a: 5.95, r: 330, R: 70, H: 34, n: 800, k: 0 },
  ];
  for (const h of heaps) h.n = Math.round(h.n * 0.65);
  const total = heaps.reduce((s, h) => s + h.n, 0);
  const mesh = new THREE.InstancedMesh(tube, K.dryBig, total);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), Pv = new THREE.Vector3();
  let i = 0;
  for (const h of heaps) {
    const cx = cx0 + Math.cos(h.a + turn) * h.r, cz = cz0 + Math.sin(h.a + turn) * h.r;
    for (let k = 0; k < h.n; k++) {
      const rr = Math.sqrt(rnd()) * h.R, th = rnd() * Math.PI * 2;
      const prof = Math.pow(Math.max(0, 1 - (rr / h.R) ** 2), 0.85);
      const y = SEA + h.H * prof - rnd() * 2.5;
      Pv.set(cx + Math.cos(th) * rr, y, cz + Math.sin(th) * rr);
      E.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28); Q.setFromEuler(E);
      const len = 4.5 + rnd() * 4, rad = 0.9 + rnd() * 0.6;
      S.set(len, rad, rad);
      M.compose(Pv, Q, S);
      mesh.setMatrixAt(i++, M);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false; mesh.receiveShadow = false;
  scene.add(mesh);
}
