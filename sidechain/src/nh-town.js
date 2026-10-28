// Nothing Happens Every Week: the town in the valley, seen from the lookout at the end. One mesh
// for all of it (houses, Main Street, the square and its bandstand, the courthouse, the church,
// the water tower, the ball field, the trees) with its windows lighting one by one at dusk, and
// one set of points for its lights. Built in the finale's own frame: +z along the road you came
// up, -x away from it down into the valley. The end card sits on the left of the screen, so Main
// Street runs down the right of the picture (-z) and the town spreads out from it.

import * as THREE from 'three';
import { seeded } from './nh-geo.js';
import { SETS } from './nh-sets.js';

// everything goes into one buffer: positions, normals, colours, and when it lights (0 = never)
class Builder {
  constructor() { this.p = []; this.n = []; this.c = []; this.l = []; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._nm = new THREE.Matrix3(); }
  add(g, x, y, z, yaw, sx, sy, sz, color, lit = 0) {
    g = g.index ? g.toNonIndexed() : g;
    const m = this._m.compose(this._v.set(x, y, z), this._q.setFromEuler(this._e.set(0, yaw, 0)), this._s.set(sx, sy, sz));
    const nm = this._nm.getNormalMatrix(m), pos = g.attributes.position, nor = g.attributes.normal, cl = g.attributes.color;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m); this.p.push(v.x, v.y, v.z);
      v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); this.n.push(v.x, v.y, v.z);
      if (color) this.c.push(color[0], color[1], color[2]); else this.c.push(cl.getX(i), cl.getY(i), cl.getZ(i));
      this.l.push(lit);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aLit', new THREE.Float32BufferAttribute(this.l, 1));
    return g;
  }
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const QUAD = new THREE.PlaneGeometry(1, 1);
const FLAT = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
const BLOB = new THREE.IcosahedronGeometry(1, 0);
// a gable roof of unit size: ridge along x at y 1, eaves at y 0 and z +-0.56
const ROOF = (() => {
  const s = new THREE.Shape(); s.moveTo(-0.56, 0); s.lineTo(0, 1); s.lineTo(0.56, 0); s.lineTo(-0.56, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); g.rotateY(Math.PI / 2);
  g.computeVertexNormals(); return g;
})();

const WALLS = [[0.92, 0.88, 0.8], [0.86, 0.8, 0.72], [0.75, 0.82, 0.88], [0.92, 0.84, 0.66], [0.8, 0.86, 0.76], [0.9, 0.78, 0.8], [0.84, 0.86, 0.9]];
const ROOFS = [[0.25, 0.25, 0.3], [0.35, 0.22, 0.18], [0.22, 0.28, 0.35], [0.4, 0.34, 0.28], [0.45, 0.2, 0.15]];
const WARM = [1, 0.78, 0.42], PALE = [1, 0.9, 0.7], STREET = [0.13, 0.13, 0.15], WALK = [0.42, 0.41, 0.4], DARKWIN = [0.12, 0.13, 0.16];

// floor(x): the ground's height under the town at its own x (the valley floor, falling away at the far edge)
export function buildValley(floor) {
  const B = new Builder(), R = seeded(2026), lights = [];
  const light = (x, y, z, c, size, from = 0.05) => lights.push({ x, y: floor(x) + y, z, c, size, from });
  const ZM = -45;                                         // Main Street
  const longs = [-135, -90, 0, 45, 90];                   // the streets alongside it
  const cross = [62, 26, -10, -46];                       // and across
  const X0 = 80, X1 = -112;                               // the town's near and far edges
  const at = (x) => floor(x) + 0.05;
  // the streets: laid in lengths so they sit on the ground where it slopes
  const strip = (x0, x1, z, w, c, dy = 0) => { for (let x = x0; x > x1; x -= 20) { const xe = Math.max(x1, x - 20), xm = (x + xe) / 2; B.add(FLAT, xm, at(xm) + dy, z, 0, x - xe + 0.5, 1, w, c); } };
  strip(X0, X1, ZM, 13, STREET);
  for (const s of [-1, 1]) strip(X0, X1, ZM + s * 8.5, 3.4, WALK, 0.01);
  for (const z of longs) strip(X0, X1, z, 8, STREET);
  for (const x of cross) B.add(FLAT, x, at(x) + 0.02, -20, 0, 9, 1, 250, STREET);
  for (let x = X0; x > X1; x -= 16) for (const s of [-1, 1]) light(x, 6, ZM + s * 7.5, PALE, 2.2, 0.03);
  for (const z of longs) for (let x = X0 - 5; x > X1; x -= 24) light(x, 5, z + 5, PALE, 1.8, 0.05 + R() * 0.3);
  for (const x of cross) for (let z = -140; z < 100; z += 28) light(x + 5, 5, z, PALE, 1.8, 0.05 + R() * 0.3);

  const tree = (x, z, s) => { const y = floor(x); B.add(CYL, x, y + 1.5 * s, z, 0, 0.5 * s, 3 * s, 0.5 * s, [0.2, 0.15, 0.1]); B.add(BLOB, x, y + 5 * s, z, R() * 6, 3.4 * s, 3.8 * s, 3.4 * s, [0.11 + R() * 0.04, 0.2 + R() * 0.05, 0.1]); };
  // houses along the streets, facing them; their windows (on the front, and the end that looks
  // up the hill at you) each come on at their own moment
  const house = (x, z, face, s) => {
    const y = floor(x), w = 9 * s, d = 8 * s, h = (R() < 0.5 ? 6 : 3.8) * s, wall = WALLS[Math.floor(R() * WALLS.length)], roof = ROOFS[Math.floor(R() * ROOFS.length)];
    B.add(BOX, x, y + h / 2, z, face, w, h, d, wall);
    B.add(ROOF, x, y + h, z, face, w + 0.8, 3 * s, d + 1, roof);
    const c = Math.cos(face), sn = Math.sin(face);
    const win = (lx, ly, lz, yaw) => { const lit = R() < 0.85 ? 0.05 + R() * 0.85 : 0; B.add(QUAD, x + lx * c + lz * sn, y + ly, z - lx * sn + lz * c, face + yaw, 1.5 * s, 1.2 * s, 1, lit ? (R() < 0.15 ? [0.75, 0.85, 1] : WARM) : DARKWIN, lit); };
    const rows = h > 5 ? [1.6, 4.2] : [1.6];
    for (const yy of rows) { for (const wx of [-2.6, 2.6]) win(wx * s, yy * s, d / 2 + 0.06, 0); win(w / 2 + 0.06, yy * s, (R() - 0.5) * 3 * s, Math.PI / 2); }
    if (R() < 0.6) light(x + (d / 2 + 1) * sn, 2.4, z + (d / 2 + 1) * c, WARM, 1.2, 0.1 + R() * 0.7);
    if (R() < 0.7) tree(x + (R() - 0.5) * 12, z - c * (6 + R() * 3), 0.8 + R() * 0.5);
  };
  for (const z of longs) for (const side of [-1, 1]) for (let x = X0 - 6 + R() * 6; x > X1 + 6; x -= 15 + R() * 4) {
    if (cross.some((c) => Math.abs(x - c) < 9)) continue;
    if (z === 0 && side < 0 && x < 50 && x > 0) continue;      // the church's lot
    if (z === -90 && side > 0 && x > 10 && x < 60) continue;   // the water tower's
    house(x, z + side * 12, side > 0 ? Math.PI : 0, 0.9 + R() * 0.25);
  }
  // Main Street: shops both sides, their fronts lit, awnings, rooms upstairs, the ends of the
  // buildings lit too where they face you
  const AW = [[0.75, 0.15, 0.18], [0.15, 0.4, 0.25], [0.15, 0.3, 0.55], [0.85, 0.45, 0.2], [0.9, 0.88, 0.82]];
  for (const side of [-1, 1]) for (let x = X0 - 6; x > -40; x -= 12.5) {
    if (cross.some((c) => Math.abs(x - c) < 7)) continue;
    const y = floor(x), h = R() < 0.4 ? 13 : 9.5, face = side > 0 ? Math.PI : 0, z = ZM + side * 17.5;
    B.add(BOX, x, y + h / 2, z, face, 12, h, 14, [0.55 + R() * 0.35, 0.35 + R() * 0.3, 0.3 + R() * 0.25]);
    B.add(BOX, x, y + h + 0.4, z - side * 6.8, face, 12.4, 0.8, 1.2, [0.85, 0.82, 0.76]);
    B.add(QUAD, x, y + 2.2, z - side * 7.05, face, 10, 3.2, 1, [1, 0.82, 0.55], 0.02 + R() * 0.12);
    B.add(BOX, x, y + 4.2, z - side * 7.7, face, 11, 0.3, 1.6, AW[Math.floor(R() * AW.length)]);
    for (const wx of [-3.5, 0, 3.5]) for (const yy of h > 10 ? [6.6, 10] : [6.6]) { const lit = R() < 0.75 ? 0.1 + R() * 0.8 : 0; B.add(QUAD, x + wx, y + yy, z - side * 7.04, face, 1.6, 1.6, 1, lit ? WARM : DARKWIN, lit); }
    for (const yy of h > 10 ? [6.6, 10] : [6.6]) { const lit = R() < 0.6 ? 0.1 + R() * 0.8 : 0; B.add(QUAD, x + 6.05, y + yy, z + (R() - 0.5) * 6, Math.PI / 2, 1.6, 1.6, 1, lit ? WARM : DARKWIN, lit); }
    light(x, 3.5, z - side * 9.5, [1, 0.8, 0.55], 2.6, 0.04);
  }
  // string lights back and forth over Main Street
  for (let x = X0 - 8; x > -38; x -= 12) for (let k = 0; k <= 10; k++) { const u = k / 10; light(x - u * 6, 8 - Math.sin(Math.PI * u) * 1.5, ZM - 9 + 18 * u, [1, 0.75 + 0.2 * (k % 2), 0.45], 0.9, 0.02); }

  // the square: a lawn, paths, the bandstand under its strings of lights
  const SX = -68, sy = floor(SX);
  B.add(FLAT, SX, sy + 0.06, ZM, 0, 44, 1, 44, [0.18, 0.3, 0.14]);
  B.add(FLAT, SX, sy + 0.08, ZM, 0, 44, 1, 3, [0.5, 0.48, 0.44]); B.add(FLAT, SX, sy + 0.08, ZM, 0, 3, 1, 44, [0.5, 0.48, 0.44]);
  B.add(new THREE.CylinderGeometry(5, 5, 0.8, 8), SX, sy + 0.4, ZM, 0, 1, 1, 1, [0.92, 0.9, 0.85]);
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; B.add(CYL, SX + Math.cos(a) * 4.4, sy + 2.6, ZM + Math.sin(a) * 4.4, 0, 0.35, 3.6, 0.35, [0.95, 0.94, 0.9]); }
  B.add(new THREE.ConeGeometry(6, 3, 8), SX, sy + 5.9, ZM, 0, 1, 1, 1, [0.75, 0.2, 0.2]);
  B.add(QUAD, SX + 3, sy + 2.4, ZM, Math.PI / 2, 6, 2.6, 1, [1, 0.8, 0.5], 0.02);
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2; for (let j = 1; j <= 7; j++) { const u = j / 8, r = 6 + u * 16; light(SX + Math.cos(a) * r, 7.4 - u * 3.5 - Math.sin(Math.PI * u) * 0.8, ZM + Math.sin(a) * r, [[1, 0.4, 0.5], [1, 0.85, 0.4], [0.5, 0.8, 1], [0.6, 1, 0.6]][(j + k) % 4], 0.9, 0.02); } }
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; tree(SX + Math.cos(a) * 19, ZM + Math.sin(a) * 19, 0.9); }
  // the courthouse at the head of the square, floodlit, the clock in its dome
  const CX = -100, cy = floor(CX);
  B.add(SETS.courthouse(), CX, cy, ZM, Math.PI / 2, 1.25, 1.25, 1.25, null, 0);
  B.add(new THREE.CircleGeometry(2.6, 24), CX + 5.05 * 1.25 + 0.05, cy + 21.6 * 1.25, ZM, Math.PI / 2, 1.25, 1.25, 1.25, [1, 0.95, 0.8], 0.01);
  for (const z of [-15, 15]) light(CX + 18, 2, ZM + z, [1, 0.92, 0.75], 8, 0.02);
  light(CX, 34, ZM, [1, 0.9, 0.7], 14, 0.02);
  // the church, its windows coloured, its steeple floodlit
  const HX = 26, hy = floor(HX), HZ = -14;
  B.add(SETS.church(), HX, hy, HZ, Math.PI / 2, 1.15, 1.15, 1.15, null, 0);
  for (let k = 0; k < 4; k++) for (const s of [-1, 1]) B.add(QUAD, HX - 12 + k * 6.3, hy + 5.8, HZ + s * 8.15, s > 0 ? 0 : Math.PI, 1.6, 4, 1, [[0.9, 0.4, 0.3], [0.4, 0.6, 1], [1, 0.8, 0.3], [0.6, 0.9, 0.5]][k], 0.15);
  light(HX + 16, 12, HZ, [1, 0.92, 0.8], 10, 0.02);
  // the water tower: legs, the tank with its red band, the floodlights under it
  {
    const wx = 36, wz = -96, wy = floor(wx);
    for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) B.add(CYL, wx + dx, wy + 12, wz + dz, 0, 0.6, 24, 0.6, [0.62, 0.64, 0.68]);
    B.add(new THREE.CylinderGeometry(7, 7, 9, 24), wx, wy + 28, wz, 0, 1, 1, 1, [0.82, 0.84, 0.88]);
    B.add(new THREE.CylinderGeometry(7.05, 7.05, 1.6, 24), wx, wy + 28, wz, 0, 1, 1, 1, [0.8, 0.12, 0.12]);
    B.add(new THREE.ConeGeometry(7.6, 4, 24), wx, wy + 34.5, wz, 0, 1, 1, 1, [0.6, 0.62, 0.66]);
    B.add(new THREE.CylinderGeometry(7.4, 7.4, 0.4, 24), wx, wy + 23.4, wz, 0, 1, 1, 1, [0.4, 0.42, 0.46]);
    for (const [dx, dz] of [[10, 6], [-10, 6], [6, -10]]) light(wx + dx, 2, wz + dz, [1, 0.95, 0.85], 6, 0.03);
  }
  // the ball field under its lights, the bleachers
  {
    const fx = -40, fz = -170, fy = floor(fx);
    B.add(FLAT, fx, fy + 0.06, fz, 0, 110, 1, 55, [0.16, 0.36, 0.14]);
    for (let k = 0; k <= 10; k++) B.add(FLAT, fx - 50 + k * 10, fy + 0.08, fz, 0, 0.5, 1, 50, [0.9, 0.9, 0.88]);
    for (let k = 0; k < 5; k++) B.add(BOX, fx, fy + 0.5 + k * 0.9, fz + 32 + k * 1.4, 0, 70, 1, 1.6, [0.55, 0.56, 0.6]);
    for (const [dx, dz] of [[-48, 30], [48, 30], [-48, -30], [48, -30]]) { B.add(CYL, fx + dx, fy + 14, fz + dz, 0, 0.7, 28, 0.7, [0.5, 0.5, 0.55]); B.add(BOX, fx + dx, fy + 28.5, fz + dz, 0, 6, 2.4, 0.8, [1, 1, 0.95], 0.01); light(fx + dx, 28.5, fz + dz, [1, 1, 0.95], 14, 0.01); }
  }
  // trees round the town, thick at its edges
  for (let k = 0; k < 120; k++) { const x = X1 - 6 - R() * 60, z = -200 + R() * 330; tree(x, z, 0.9 + R() * 0.7); }
  for (let k = 0; k < 80; k++) { const x = X0 + 4 + R() * 30, z = -200 + R() * 330; if (Math.abs(z - ZM) < 22) continue; tree(x, z, 0.8 + R() * 0.5); }
  for (let k = 0; k < 70; k++) { const z = (R() < 0.5 ? -205 - R() * 40 : 120 + R() * 40), x = X1 + R() * (X0 - X1); tree(x, z, 0.9 + R() * 0.6); }
  // the highway out the far side: where he went
  const hw = [];
  for (let k = 0; k <= 40; k++) { const u = k / 40, x = X1 - 10 - u * 560, z = ZM - 20 - u * 230 + Math.sin(u * 5) * 30; hw.push([x, floor(x) + 0.4, z]); }
  for (let k = 0; k < hw.length - 1; k++) {
    const [ax, ay, az] = hw[k], [bx, by, bz] = hw[k + 1], L = Math.hypot(bx - ax, bz - az), a = Math.atan2(bx - ax, bz - az);
    B.add(BOX, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, a, 7, 0.3, L + 0.5, [0.1, 0.1, 0.12]);
    if (k % 3 === 0) lights.push({ x: ax, y: ay + 6, z: az, c: PALE, size: 1.4, from: 0.2 });
  }
  const lp = new Float32Array(lights.length * 3), lc = new Float32Array(lights.length * 3), ls = new Float32Array(lights.length), lf = new Float32Array(lights.length);
  lights.forEach((L, i) => { lp.set([L.x, L.y, L.z], i * 3); lc.set(L.c, i * 3); ls[i] = L.size; lf[i] = L.from; });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  lg.setAttribute('aSize', new THREE.BufferAttribute(ls, 1)); lg.setAttribute('aFrom', new THREE.BufferAttribute(lf, 1));
  return { town: B.geometry(), lights: lg, highway: hw, streets: [ZM, ...longs], X0, X1, ZM };
}

// the town's surfaces: lit from the sky like everything else, its windows and fronts glowing as
// uLit comes up past each one's own moment
export function valleyMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  m.userData.u = { uLit: { value: 0 } };
  m.customProgramCacheKey = () => 'nh-valley';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uLit = m.userData.u.uLit;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aLit; varying float vLit;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLit = aLit;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uLit; varying float vLit;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float on = vLit > 0.0 ? smoothstep(vLit, vLit + 0.04, uLit) : 0.0; totalEmissiveRadiance += vColor.rgb * on * 2.4; diffuseColor.rgb *= 1.0 - 0.6 * on;');
  };
  return m;
}
// its lights: soft points that come on with the dusk, the porch lights one at a time
export function valleyLights() {
  return new THREE.ShaderMaterial({
    uniforms: { uLit: { value: 0 }, uTime: { value: 0 }, uScale: { value: 620 } },
    vertexShader: `attribute float aSize; attribute float aFrom; varying vec3 vC; varying float vA; uniform float uLit, uTime, uScale;
      void main(){ vC = color; float on = smoothstep(aFrom, aFrom + 0.05, uLit); vA = on * (0.85 + 0.15 * sin(uTime * 3.0 + position.x * 0.7 + position.z * 0.3));
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.0, aSize * uScale / -mv.z) * on; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; gl_FragColor = vec4(vC * (exp(-r * 4.0) * 0.9 + exp(-r * 30.0) * 0.9) * vA, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true,
  });
}
