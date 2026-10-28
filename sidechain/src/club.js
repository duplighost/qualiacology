// Spiked. The night going wrong, seen from her side. The street of clubs and the queue under
// the marquee; in through the doors and we are small in it. The lounge, sweet and clean: the
// mirror ball, the bar, the tall drink and the little white pill going into it. The dance floor
// in the dark: the crowd hands-up on every beat while the room drops with the kick. The red
// room, losing control; the back corridors where every phone is recording and every exit points
// the wrong way; the washroom's mirrors cracking; the floor again, the crowd turned to stone;
// the void; lost time; the house lights on the mess. Then the doors, and outside it's morning.
// (the street kit `clubstreet` is shared with Unloaded: leave it as it is)

import * as THREE from 'three';
import { AA_GLSL } from './aa.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local, PARTS } from './scenery.js';
import { prepare, floorAt, groundAt } from './trail.js';
import { Room, paint, rgb, seeded, box } from './summer.js';
import { SpdCrowd } from './spd-crowd.js';
import { SPD_FOG } from './spd-sets.js';
import { SpdMorningFinale } from './spd-finale.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const ALONG = (x) => (x > 0 ? 0 : Math.PI);
const onFloor = (S, it) => { prepare(S.course, S.plan); if (it.h === undefined) it.h = groundAt(S.course, it.t, it.x); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 14, hh = 10) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
// a tube from a to b (for neon and ropes)
function tube(a, b, r, n = 6) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
// a time window with soft edges: [from, to, in, out]; a list of them takes the strongest
const one = (w, t) => smooth(w[0] - (w[2] ?? 0.05), w[0], t) * (1 - smooth(w[1], w[1] + (w[3] ?? 0.4), t));
export const win = (w, t) => (!w ? 0 : Array.isArray(w[0]) ? Math.max(0, ...w.map((x) => one(x, t))) : one(w, t));

const KG = {
  // a brass stanchion (the rope to the next one is drawn per frame)
  stanchion() { const parts = [], brass = rgb(0xe0b860); parts.push(paint(cyl(0.12, 0.12, 2.6, 10, 0, 1.3, 0), brass)); parts.push(paint(cyl(0.55, 0.62, 0.18, 16, 0, 0.09, 0), brass)); parts.push(paint(sph(0.24, 1, 1, 1, 0, 2.7, 0, 12, 8), brass)); return merge(parts); },
  rope() { const g = new THREE.CylinderGeometry(0.09, 0.09, 1, 6, 1); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.5); return g; },
  // the marquee over the door: a deep box, its words on the face, bulbs all round (glows)
  marquee() { const parts = []; parts.push(paint(box(40, 12, 3, 0, 0, -1.6), rgb(0x0e0a12))); for (const [w, h, x, y] of [[41, 1, 0, 6.2], [41, 1, 0, -6.2], [1, 13.4, -20.4, 0], [1, 13.4, 20.4, 0]]) parts.push(paint(box(w, h, 3.4, x, y, -1.4), rgb(0xd8b060))); return merge(parts); },
  marqueeFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(5.1, 4.4, 1); g.translate(0, 0, 0.05); return g; },
  // a neon cocktail glass: the outline of a coupe, the stem, an olive on a pick
  neonGlass() {
    const parts = [], r = 0.32;
    const rim = [V(-7, 12), V(7, 12), V(0.4, 4.5), V(0.4, 0), V(3.5, -0.4), V(-3.5, -0.4), V(-0.4, 0), V(-0.4, 4.5), V(-7, 12)];
    for (let k = 0; k + 1 < rim.length; k++) parts.push(tube(rim[k], rim[k + 1], r));
    parts.push(tube(V(-5.3, 10.1), V(5.3, 10.1), r * 0.8));
    parts.push(tube(V(-2, 13.5), V(2.6, 7.4), r * 0.7));
    const o = new THREE.TorusGeometry(1.1, r, 6, 18); o.translate(1.6, 8.9, 0); parts.push(o);
    return merge(parts);
  },
  // the mirror ball: faceted, on its chain
  mirrorBall() {
    const g = new THREE.SphereGeometry(7, 30, 18).toNonIndexed(); g.computeVertexNormals();
    const n = g.attributes.position.count, c = new Float32Array(n * 3), R = seeded(71);
    for (let i = 0; i < n; i += 6) {
      const r = R(), k = r < 0.35 ? 0.25 : r < 0.75 ? 0.75 : 1.25;
      const tint = R() < 0.18 ? (R() < 0.5 ? [1, 0.4, 0.9] : [0.4, 0.9, 1]) : [1, 1, 1];
      for (let v = i; v < Math.min(n, i + 6); v++) { c[v * 3] = tint[0] * k; c[v * 3 + 1] = tint[1] * k; c[v * 3 + 2] = tint[2] * k; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const chain = cyl(0.18, 0.18, 30, 6, 0, 22, 0);
    const cap = cyl(1.2, 1.6, 1.2, 12, 0, 7.4, 0);
    return merge([g, paint(chain, rgb(0x6a6a72)), paint(cap, rgb(0x6a6a72))]);
  },
  // the bar: a long counter lit along its front, the stools before it (runs along z, faces +x)
  bar() {
    const parts = [], R = seeded(19);
    parts.push(paint(box(9, 12, 60, 0, 6, 0), rgb(0x16101e)));
    parts.push(paint(box(11, 0.9, 61, 0.8, 12.4, 0), rgb(0x2a2234)));
    parts.push(paint(box(0.4, 0.5, 60, 4.7, 11.4, 0), rgb(0xff4fd8)));
    parts.push(paint(box(0.4, 0.5, 60, 4.7, 1.2, 0), rgb(0x6ad8ff)));
    for (let k = 0; k < 6; k++) {
      const z = -25 + k * 10;
      parts.push(paint(cyl(0.3, 0.3, 7, 8, 8, 3.5, z), rgb(0xb8b8c4)));
      parts.push(paint(cyl(2.2, 2.2, 0.8, 18, 8, 7.4, z), rgb(0x2a1a3a)));
      parts.push(paint(cyl(2.4, 2.6, 0.3, 18, 8, 0.15, z), rgb(0xb8b8c4)));
    }
    for (let k = 0; k < 14; k++) {
      const z = -28 + k * 4.2 + (R() - 0.5), x = -1.5 + R() * 2, c = pick(R, [0x2a6a3a, 0x6a3a1a, 0x1a3a6a, 0x8a1a3a, 0xd8d0b8]);
      if (R() < 0.6) { parts.push(paint(cyl(0.7, 0.7, 3.8, 10, x, 14.7, z), rgb(c))); parts.push(paint(cyl(0.25, 0.6, 1.6, 10, x, 17.4, z), rgb(c))); }
      else parts.push(paint(cyl(0.8, 0.55, 2.2, 12, x, 13.9, z), rgb(0xd8e0ec)));
    }
    return merge(parts);
  },
  // a stack of speakers: three cabinets; the cones are their own layer, pumping
  speakers() {
    const parts = [];
    for (let k = 0; k < 3; k++) {
      const y = 4.5 + k * 9;
      parts.push(paint(box(9, 8.6, 7, 0, y, 0), rgb(0x0c0c10)));
      parts.push(paint(box(9.3, 0.3, 7.2, 0, y + 4.3, 0), rgb(0x2a2a32)));
    }
    return merge(parts);
  },
  cones() {
    const parts = [];
    for (let k = 0; k < 3; k++) {
      const y = 4.5 + k * 9;
      for (const [x, yy, r] of [[-2.1, 1.8, 1.7], [2.1, 1.8, 1.7], [0, -1.8, 2.4]]) {
        const c = new THREE.CylinderGeometry(r, r * 0.45, 0.9, 20, 1, true); c.rotateX(-Math.PI / 2); c.translate(x, y + yy, 3.2); parts.push(paint(c, rgb(0x34343c)));
        const d = cyl(r * 0.32, r * 0.32, 0.3, 14, 0, 0, 0); d.rotateX(Math.PI / 2); d.translate(x, y + yy, 3.0); parts.push(paint(d, rgb(0x5a5a64)));
      }
    }
    return merge(parts);
  },
  // a velvet booth, curved, its back high
  booth() {
    const parts = [], red = rgb(0xc8142e), dark = rgb(0x7a0a1a);
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI * (0.1 + 0.8 * k / 10), x = Math.cos(a) * 12, z = -Math.sin(a) * 9;
      parts.push(paint(box(3.2, 11, 2.6, x, 5.5, z), k % 2 ? red : dark));
      parts.push(paint(sph(1.4, 1.1, 1, 1, x, 11, z, 8, 6), red));
    }
    const seat = new THREE.CylinderGeometry(11, 11, 4, 24, 1, false, Math.PI * 0.6, Math.PI * 0.8); seat.translate(0, 2, 0); parts.push(paint(seat, dark));
    parts.push(paint(cyl(4, 4, 0.8, 20, 0, 7, -2), rgb(0x2a2228)));
    parts.push(paint(cyl(0.8, 1.2, 7, 10, 0, 3.5, -2), rgb(0x2a2228)));
    parts.push(paint(cyl(0.3, 0.5, 2.4, 10, 0, 8.6, -2), rgb(0xd8b060)));
    parts.push(paint(new THREE.CylinderGeometry(1.0, 1.7, 1.6, 16, 1, true).translate(0, 10.4, -2), rgb(0xffb8a0)));
    return merge(parts);
  },
  // an exit sign: a box, the word lit in red, an arrow (the word is the sign layer)
  exitBox() { const parts = []; parts.push(paint(box(8.6, 3.4, 1.4, 0, 0, -0.75), rgb(0x1a1a1e))); parts.push(paint(box(0.3, 4, 0.3, 0, 3.6, -0.75), rgb(0x3a3a40))); return merge(parts); },
  exitFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(1.08, 1.2, 1); return g; },
  // a row of basins on a counter, the taps
  sinks() {
    const parts = [];
    parts.push(paint(box(9, 1.2, 46, 0, 12, 0), rgb(0xe8e6e2)));
    parts.push(paint(box(8.6, 11.4, 45.6, -0.2, 5.7, 0), rgb(0x3a3a40)));
    for (let k = 0; k < 4; k++) {
      const z = -16.5 + k * 11;
      const b = new THREE.SphereGeometry(3.4, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); b.scale(1, 0.55, 1); b.translate(0.6, 12.7, z); parts.push(paint(b, rgb(0xf0f0f4)));
      parts.push(paint(cyl(0.3, 0.3, 2.8, 8, -3, 13.9, z), rgb(0xd0d4dc)));
      const sp = cyl(0.25, 0.25, 2.2, 8, 0, 0, 0); sp.rotateZ(Math.PI / 2); sp.translate(-2, 15.2, z); parts.push(paint(sp, rgb(0xd0d4dc)));
    }
    return merge(parts);
  },
  // what's left on the floor when the lights come up: cups on their sides, a glass, straws
  mess() {
    const parts = [], R = seeded(57);
    for (let k = 0; k < 9; k++) {
      const x = (R() - 0.5) * 16, z = (R() - 0.5) * 22, kind = R();
      if (kind < 0.55) { const c = new THREE.CylinderGeometry(1.7, 1.2, 4.2, 16, 1, true); c.rotateZ(Math.PI / 2); c.rotateY(R() * 6); c.translate(x, 1.7, z); parts.push(paint(c, rgb(pick(R, [0xd8202a, 0x2a4ad8, 0xf0f0f0])))); }
      else if (kind < 0.8) { const g = new THREE.CylinderGeometry(1.4, 1.2, 4.6, 16, 1, true); g.translate(x, 2.3, z); parts.push(paint(g, rgb(0xd8e0ec))); }
      else { const s = cyl(0.18, 0.18, 6, 6, 0, 0, 0); s.rotateZ(Math.PI / 2); s.rotateY(R() * 6); s.translate(x, 0.2, z); parts.push(paint(s, rgb(pick(R, [0xff5fb0, 0x6ad8ff])))); }
    }
    return merge(parts);
  },
  // a laser: a long thin beam from the truss (additive)
  laser() { const g = new THREE.CylinderGeometry(0.12, 0.35, 140, 6, 1, true); g.translate(0, -70, 0); return g; },
};

function laserMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `attribute vec3 aTint; varying vec3 vC; varying float vY; void main(){ vC = aTint; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vC; varying float vY; void main(){ float k = smoothstep(-140.0, -100.0, vY) * 0.8 + 0.2; gl_FragColor = vec4(vC * k, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
}

const VC = (M, key, opts) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }));
const TT = { aTint: 3 };
extend({
  layers: {
    stanchion: (M) => [KG.stanchion(), VC(M, 'kBrass', { roughness: 0.3, metalness: 0.5, emissive: 0x2a1a06 }), 160, {}],
    rope: (M) => [KG.rope(), M.ropeM || (M.ropeM = new THREE.MeshStandardMaterial({ color: 0xa00a2a, roughness: 0.7, emissive: 0x3a0410 })), 320, {}],
    marquee: (M) => [KG.marquee(), VC(M, 'kBox', { roughness: 0.5, metalness: 0.2, emissive: 0x0a0608 }), 4, {}],
    marqueeFace: (M) => [KG.marqueeFace(), M.sign, 4, { aIdx: 1, aWake: 2 }],
    neonGlass: (M) => [KG.neonGlass(), M.neonM || (M.neonM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5fd8).multiplyScalar(1.8) })), 4, {}],
    mirrorBall: (M) => [KG.mirrorBall(), M.ballM || (M.ballM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, metalness: 0.2, flatShading: true, emissive: 0xffffff, emissiveIntensity: 0.35 }); m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); }; return m; })()), 4, {}],
    bar: (M) => [KG.bar(), VC(M, 'kBar', { roughness: 0.35, metalness: 0.2, emissive: 0x0c0810 }), 4, {}],
    speakers: (M) => [KG.speakers(), VC(M, 'kBox', { roughness: 0.5, metalness: 0.2, emissive: 0x0a0608 }), 60, {}],
    spdCones: (M) => [KG.cones(), VC(M, 'spdConeM', { roughness: 0.6, metalness: 0.1, emissive: 0x16161c }), 60, {}],
    booth: (M) => [KG.booth(), VC(M, 'kVelvet', { roughness: 0.8, metalness: 0, emissive: 0x3a060e }), 24, {}],
    exitBox: (M) => [KG.exitBox(), VC(M, 'kBox', { roughness: 0.5, metalness: 0.2, emissive: 0x0a0608 }), 60, {}],
    exitFace: (M) => [KG.exitFace(), M.sign, 60, { aIdx: 1, aWake: 2 }],
    sinks: (M) => [KG.sinks(), VC(M, 'kPorcelain', { roughness: 0.2, metalness: 0.1, emissive: 0x2a2c30 }), 6, {}],
    mess: (M) => [KG.mess(), VC(M, 'kPlastic', { roughness: 0.4, metalness: 0, emissive: 0x1a1a1a }), 40, {}],
    laser: (M) => [KG.laser(), M.laserM || (M.laserM = laserMaterial()), 80, TT],
    neonBox: (M) => [box(18.4, 6.4, 1.2, 0, 0, -0.7), VC(M, 'kBoxN', { roughness: 0.5, metalness: 0.2, emissive: 0x0a0608 }), 16, {}],
    neonFace: (M) => [(() => { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(2.3, 2.5, 1); return g; })(), M.sign, 16, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // a brass post, and the red rope sagging to the next one
    stanchion(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.stanchion.add(m);
      const ropes = S.layers.rope;   // made now, not the first time it's drawn
      if (!it.next || !S.track || it.t > (S.tNow ?? 0) + 14 || !ropes) return;
      const a = S._ra || (S._ra = new THREE.Vector3()), b = S._rb || (S._rb = new THREE.Vector3());
      a.set(p.x, p.y + 2.5 * it.s, p.z);
      S.track.ground(it.next.t, it.next.x, b); b.y = (it.next.h ?? 0) + 2.5 * it.s;
      const n = 6, prev = S._rp || (S._rp = new THREE.Vector3()), cur = S._rc || (S._rc = new THREE.Vector3());
      const qq = S._rq || (S._rq = new THREE.Quaternion()), Z = S._zAxis || (S._zAxis = new THREE.Vector3(0, 0, 1)), d = S._rd || (S._rd = new THREE.Vector3());
      prev.copy(a);
      for (let k = 1; k <= n; k++) {
        const u = k / n; cur.lerpVectors(a, b, u); cur.y -= Math.sin(Math.PI * u) * 1.1 * it.s;
        d.subVectors(cur, prev); const L = d.length(); if (L > 0.01) { qq.setFromUnitVectors(Z, d.normalize()); m.compose(prev, qq, S._s.set(it.s, it.s, L)); ropes.add(m); }
        prev.copy(cur);
      }
    },
    marquee(S, it, p, q, yaw) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.marquee.add(m); S.layers.marqueeFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      // the bulbs round the edge, chasing, faster as the door comes
      const T = S.tNow ?? 0, by = h + Math.PI, rate = 8 + 10 * clamp((T - 9.4) / 5.4, 0, 1);
      for (let k = 0; k < 44; k++) {
        const u = k / 44;
        let d = u * 2 * (41 + 13.4), x, y;
        if (d < 41) { x = -20.5 + d; y = 6.7; } else if ((d -= 41) < 13.4) { x = 20.5; y = 6.7 - d; } else if ((d -= 13.4) < 41) { x = 20.5 - d; y = -6.7; } else { d -= 41; x = -20.5; y = -6.7 + d; }
        const on = ((k + Math.floor(T * rate)) % 3) ? 1 : 0.25;
        const w = local(p, by, x * s, y * s, 0.6 * s, S._o); glowAt(S, w.x, w.y, w.z, 1.2 * s, [1, 0.86, 0.5], 1.4 * on);
      }
    },
    neonGlass(S, it, p, q, yaw) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.4 : 0.4), 0); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.neonGlass.add(m);
      glowAt(S, p.x, p.y + 7 * s, p.z, 18 * s, [1, 0.3, 0.85], 0.55);
    },
    mirrorBall(S, it, p, q) {
      const T = S.tNow ?? 0; S._e.set(0, T * 0.6, 0); const bq = (S._q5 || (S._q5 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, bq, S._s.set(s, s, s)); S.layers.mirrorBall.add(m);
      for (let k = 0; k < 18; k++) { const a = k * 2.399 + T * 0.6, e = Math.sin(k * 1.7) * 0.9; const on = Math.max(0, Math.sin(T * 5 + k * 3.1)); glowAt(S, p.x + Math.cos(a) * Math.cos(e) * 7.2 * s, p.y + Math.sin(e) * 7.2 * s, p.z + Math.sin(a) * Math.cos(e) * 7.2 * s, 1.6 * s, [1, 1, 1], 2.4 * on * on); }
      glowAt(S, p.x, p.y, p.z, 26 * s, [0.9, 0.85, 1], 0.18);
    },
    clubBar(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.bar.add(m); },
    // the speakers: the cabinets, and the cones kicking out on every beat
    speakers(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, b = S.beat || 0; m.compose(p, q, S._s.set(s, s, s)); S.layers.speakers.add(m);
      const kick = (S.spd ? S.spd.pump : 0.4) * b;
      local(p, yaw, 0, 0, kick * 0.8 * s, S._o); m.compose(S._o, q, S._s.set(s, s, s * (1 + 0.5 * kick))); S.layers.spdCones.add(m);
    },
    // a booth in the red room; everything in there sways a little, losing it slow
    booth(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, sw = S.spd ? S.spd.sway : 0, T = S.tNow ?? 0;
      S._e.set(0.06 * sw * Math.sin(T * 0.7 + it.t), yaw, 0.09 * sw * Math.sin(T * 0.55 + it.t * 1.3)); const bq = (S._q6 || (S._q6 = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, bq, S._s.set(s, s, s)); S.layers.booth.add(m);
      const w = local(p, yaw, 0, 10.4 * s, -2 * s, S._o); glowAt(S, w.x, w.y, w.z, 9 * s, [1, 0.55, 0.4], 1.1); poolAt(S, w.x, p.y + 0.1, w.z, 30 * s, [1, 0.3, 0.25], 0.7);
    },
    exit(S, it, p, q) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.3 : 0.3), it.roll || 0); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.exitBox.add(m);
      // the way out: they flash in turn when they're the real ones
      const T = S.tNow ?? 0, k = it.chase ? (Math.floor(T * 4.47 - it.t * 3) % 3 === 0 ? 1 : 0.25) : 1;
      S.layers.exitFace.add(m, { aIdx: it.idx, aWake: [k, 0] });
      glowAt(S, p.x, p.y, p.z, 9 * s, it.green ? [0.2, 1, 0.4] : [1, 0.1, 0.1], 0.6 * k);
    },
    sinks(S, it, p, q, yaw) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.sinks.add(m);
      for (let k = 0; k < 4; k++) { const w = local(p, yaw, -3.6, 27.8, -16.5 + k * 11, S._o); glowAt(S, w.x, w.y, w.z, 7, [0.85, 1, 0.95], 0.8 * (S.flicker ?? 1)); }
    },
    mess(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.mess.add(m); },
    // a line of his in neon, high on the wall, turned to you coming
    neonSign(S, it, p, q) {
      p.y = (S.floorFn ? S.floorFn(it.t, it.x) : 0) + (it.h || 18);
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.5 : 0.5), 0); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.neonBox.add(m); S.layers.neonFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      glowAt(S, p.x, p.y, p.z, 16 * s, [1, 0.35, 0.85], 0.35);
    },
    // the same, its tubes going: it buzzes and drops out
    spdNeonDying(S, it, p, q) {
      p.y = (S.floorFn ? S.floorFn(it.t, it.x) : 0) + (it.h || 18);
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.5 : 0.5), 0.05 * (it.x > 0 ? 1 : -1)); const fq = (S._q4 || (S._q4 = new THREE.Quaternion())).setFromEuler(S._e);
      const T = S.tNow ?? 0, r = Math.sin(T * 41 + it.t) * Math.sin(T * 13.7 + 2.1), k = r > 0.35 ? 0.15 : (Math.sin(T * 3.1) > 0.8 ? 0.4 : 1);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.neonBox.add(m); S.layers.neonFace.add(m, { aIdx: it.idx, aWake: [k, 0] });
      glowAt(S, p.x, p.y, p.z, 16 * s, [1, 0.35, 0.85], 0.35 * k);
    },
    // lasers from up in the dark, sweeping on the beat
    laser(S, it, p, q) {
      const T = S.tNow ?? 0, on = S.lasers ?? 0; void S.layers.laser; if (on < 0.02) return;
      const m = S._m, e = S._le || (S._le = new THREE.Euler(0, 0, 0, 'YXZ')), lq = S._lq || (S._lq = new THREE.Quaternion());
      for (let k = 0; k < 4; k++) {
        e.set(0.55 * Math.sin(T * (0.9 + k * 0.23) + it.seed * 9 + k), S.course.sample(it.t).yaw + k * 1.57 + T * 0.4, 0.5 * Math.cos(T * (0.7 + k * 0.31) + k));
        lq.setFromEuler(e); m.compose(p, lq, S._s.set(1, 1, 1));
        const c = it.cols[k % it.cols.length]; S.layers.laser.add(m, { aTint: [c[0] * on, c[1] * on, c[2] * on] });
      }
      glowAt(S, p.x, p.y, p.z, 4, it.cols[0], 1.2 * on);
    },
  },
  kits: {
    // the street outside: dark blocks, a wet road, the queue's ropes either side to the door
    clubstreet(S, z, R) {
      const greys = [0x3a3448, 0x2a2838, 0x4a4058, 0x34303e];
      for (const side of [-1, 1]) {
        for (let t = z.from; t < z.to; t += 0.32 + R() * 0.2) {
          S.items.push(onFloor(S, { t, x: side * (26 + R() * 6), rot: SIDE(side), s: 0.9 + R() * 0.3, sy: 0.6 + R() * 0.9, parts: 'block', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.3 }));
          if (R() < 0.5) S.items.push(onFloor(S, { t: t + R() * 0.2, x: side * (60 + R() * 90), rot: R() * 0.4, s: 0.9 + R() * 0.4, sy: 0.8 + R() * 1.6, parts: R() < 0.5 ? 'tower' : 'block', tint: col(pick(R, greys)), seed: R(), wake0: 0.25 }));
        }
        for (let t = z.from; t < z.to; t += 0.4) S.items.push(onFloor(S, { t, x: side * 17, rot: SIDE(side), parts: 'lamp', seed: R(), dim: z.dim ?? 1 }));
      }
    },
    ropes(S, z, R) {
      for (const side of [-1, 1]) {
        let prev = null;
        for (let t = z.from; t < z.to; t += z.every ?? 0.16) { const it = onFloor(S, { t, x: side * (z.x ?? 10.5), rot: 0, s: z.s ?? 2.4, parts: 'stanchion' }); if (prev) prev.next = it; S.items.push(it); prev = it; }
      }
    },
    marquee(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, h: floorAt(S.course, z.at) + (z.y ?? 40), s: z.s ?? 1, idx: S.atlas.index[z.sign], parts: 'marquee', ahead: z.ahead ?? 40 }); },
    neonGlass(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, s: z.s ?? 1.6, parts: 'neonGlass', ahead: z.ahead, h: z.y !== undefined ? floorAt(S.course, z.at) + z.y : undefined })); },
    mirrorBall(S, z) { prepare(S.course, S.plan); for (const t of [].concat(z.at)) S.items.push({ t, x: z.x ?? 0, rot: 0, s: z.s ?? 1, h: S.course.sample(t).y + (z.lift ?? 16), parts: 'mirrorBall', ahead: z.ahead }); },
    clubBar(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: ALONG(z.x), parts: 'clubBar', ahead: z.ahead })); },
    speakers(S, z, R) { let k = 0; for (let t = z.from + 0.3; t < z.to; t += z.every ?? 1.6) { const side = k++ % 2 ? 1 : -1; S.items.push(onFloor(S, { t, x: side * (z.x ?? 44), rot: SIDE(side), s: z.s ?? 1, parts: 'speakers', ahead: z.ahead })); } },
    booths(S, z, R) { let k = 0; for (let t = z.from + 0.4; t < z.to; t += z.every ?? 1.4) { const side = k++ % 2 ? 1 : -1; S.items.push(onFloor(S, { t, x: side * (z.x ?? 30), rot: SIDE(side), s: z.s ?? 1, parts: 'booth', ahead: z.ahead })); } },
    exits(S, z, R) { for (const [t, x, y, sg, roll] of z.at) S.items.push(onFloor(S, { t, x, s: z.s ?? 1.5, idx: S.atlas.index[sg ?? z.sign ?? 'EXITL'], parts: 'exit', ahead: z.ahead, roll: roll || 0, chase: z.chase, green: z.green, h: floorAt(S.course, t) + (y ?? 18) })); },
    sinks(S, z) { for (const [t, x] of z.at) S.items.push(onFloor(S, { t, x, rot: ALONG(x), parts: 'sinks', ahead: z.ahead })); },
    mess(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.5) { const side = R() < 0.5 ? -1 : 1; S.items.push(onFloor(S, { t, x: side * (16 + R() * 18), rot: R() * 6.28, s: 1 + R() * 0.4, parts: 'mess', ahead: z.ahead })); } },
    lasers(S, z, R) {
      prepare(S.course, S.plan);
      const cols = (z.cols || [0x40ff9a, 0xff4fd8, 0x40d8ff]).map(col);
      for (let t = z.from; t < z.to; t += z.every ?? 1.1) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 30), rot: 0, h: floorAt(S.course, t) + (z.y ?? 36), parts: 'laser', seed: R(), cols, ahead: z.ahead ?? 20 });
    },
  },
});

// ---------- the rooms of the club ----------
const flat = (W = 60, H = 40) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const CLUB = {
  rings: { flat },
  ringOf: () => 'flat',
  styles: { floor: 0, club: 0, redroom: 1, hall: 2, wash: 3, lounge: 4 },
  dims: { floor: [60, 44], club: [60, 40], redroom: [46, 30], hall: [18, 24], wash: [30, 26], lounge: [54, 40] },
  lights: (id) => ({ 1: [34, 17], 2: [26, 13], 3: [22, 11], 4: [24, 12] }[id] || null),
};

function clubMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uMove: { value: 0 },
      uWarm: { value: new THREE.Color(0xff4fd8) }, uLight: { value: new THREE.Color(1, 1, 1) }, uA: { value: new THREE.Color(0xff4fd8) }, uB: { value: new THREE.Color(0x40d8ff) },
      uHouse: { value: 0 }, uRed: { value: 0 }, uVoid: { value: 0 }, uFlicker: { value: 1 }, uSkyTop: { value: new THREE.Color() }, uSkyLow: { value: new THREE.Color() },
      uChorus: { value: 0 }, uRingR: { value: 0 }, uRingK: { value: 0 }, uAlong: { value: 0 }, uVu: { value: 0 }, uSpeed: { value: 38 },
      uCrackT: { value: new THREE.Vector4(-1e5, -1e5, -1e5, -1e5) }, uCrackK: { value: new THREE.Vector4(0, 0, 0, 0) }, uCrackS: { value: new THREE.Vector4(1, -1, 1, -1) },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uBeat, uFogDensity, uHouse, uRed, uVoid, uFlicker, uChorus, uRingR, uRingK, uAlong, uVu, uSpeed, uMove;
      uniform vec3 uFog, uCam, uWarm, uLight, uA, uB, uSkyTop, uSkyLow;
      uniform vec4 uCrackT, uCrackK, uCrackS;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float box2(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
      vec3 hue(float t){ return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67))); }
      // a line of width w at d == 0, kept to the pixel so it never sparkles
      float aaLine(float d, float w){ float f = fwidth(d); return (1.0 - smoothstep(w - f, w + f, abs(d))) * clamp(w / max(f, 1e-4), 0.0, 1.0); }
      // the mirror ball's light: little squares drifting across everything
      float spots(vec2 q){ vec2 g = q * 0.42 + vec2(uTime * 0.35, uTime * 0.07); vec2 c = floor(g), f = fract(g) - 0.5; float on = step(0.72, h2(c)); float fw = fwidth(g.x); return on * (1.0 - smoothstep(0.08, 0.16 + fw, max(abs(f.x), abs(f.y)))) * clamp(0.4 / max(fw, 0.01), 0.0, 1.0); }
      // a mirror cracked from a point: lines out from it, two rings
      float crack(vec2 q, float k, float seed){
        float r = length(q), a = atan(q.y, q.x);
        float n = 9.0 + floor(h2(vec2(seed, 1.0)) * 4.0);
        float arc = abs(fract(a / 6.2832 * n + h2(vec2(seed, 2.0)) + 0.08 * sin(r * 1.7 + seed)) - 0.5) * 6.2832 / n * r;
        float c = (1.0 - smoothstep(0.1, 0.24, arc)) * step(0.4, r);
        c = max(c, (1.0 - smoothstep(0.08, 0.18, abs(r - 2.2 - 0.3 * sin(a * 5.0 + seed)))) * step(r, 9.0));
        c = max(c, (1.0 - smoothstep(0.08, 0.18, abs(r - 5.0 - 0.5 * sin(a * 3.0 + seed * 2.0)))) * 0.8);
        return c * step(r, 1.0 + 11.0 * k) * step(0.001, k);
      }
      ${AA_GLSL}
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float st = uStyle;
        float wa = part == 6 ? x * 1.3 + 9.0 : (side > 0.0 ? along + 11.0 : along);
        bool onWall = part == 1 || part == 2 || part == 6;
        float live = (1.0 - uHouse) * (1.0 - uRed) * (1.0 - uVoid);
        vec3 col;
        if (part == 8) { col = mix(vec3(0.05), vec3(0.35), uHouse) + uA * 0.4 * live; }
        else if (part == 7) {
          // the front: black brick, a pink line of neon round the door and along the top
          vec2 b = vec2(x / 2.6 + mod(floor(h / 1.1), 2.0) * 0.5, h / 1.1);
          col = vec3(0.06, 0.055, 0.07) * (0.8 + 0.3 * h2(floor(b))) * (0.8 + 0.2 * aaSq(b.x * 0.5 + 0.25) * aaSq(b.y * 0.5 + 0.25));
          float neon = smoothstep(0.5, 0.0, abs(box2(vec2(x, h - 14.0), vec2(14.0, 15.0)))) + smoothstep(0.45, 0.0, abs(h - 52.0));
          col += uA * neon * (1.6 + 0.8 * uBeat);
          col *= mix(vec3(1.0), uLight, 0.5);
        } else if (st < 0.5) {
          // the dance floor
          if (part == 0) {
            // glass tiles lit from under: a slow colour drift, and on the beat a ring of light out from her
            vec2 tq = vec2(x, along) / 4.0, tc = floor(tq), tf = fract(tq);
            float fw = max(fwidth(tq.x), fwidth(tq.y));
            float detail = 1.0 - smoothstep(0.18, 0.45, fw);
            float k = h2(tc + floor(uTime * 2.2) * 0.17);
            vec3 tile = hue(k * 0.5 + uTime * 0.04 + tc.x * 0.05) * (0.08 + (0.55 + 0.9 * uChorus) * step(0.72, k) * (0.35 + 0.65 * uBeat));
            vec3 avg = hue(uTime * 0.04 + 0.25) * (0.08 + (0.55 + 0.9 * uChorus) * 0.28 * (0.35 + 0.65 * uBeat));
            tile = mix(avg, tile, detail);
            float dc = length(vec2((tc.x + 0.5) * 4.0, (tc.y + 0.5) * 4.0 - uAlong));
            float ring = exp(-pow((dc - uRingR) / 5.0, 2.0)) * uRingK;
            tile += mix(uA, vec3(1.0), 0.45) * ring * 2.2 * mix(0.5, 1.0, detail);
            float gr = min(min(tf.x, 1.0 - tf.x), min(tf.y, 1.0 - tf.y));
            float grout = mix(0.82, smoothstep(0.0, 0.045 + fw, gr), detail);
            col = (vec3(0.012, 0.01, 0.018) + tile) * grout * live;
            col = mix(col, vec3(0.32, 0.31, 0.3) * (0.8 + 0.2 * n2(vec2(x, along) * 0.3)) + vec3(0.04), uHouse);
          } else if (part == 3) {
            // the ceiling: black, a truss grid
            vec2 g = vec2(x, along) / 12.0;
            float tr = max(aaLine(fract(g.x + 0.5) - 0.5, 0.04), aaLine(fract(g.y + 0.5) - 0.5, 0.04));
            col = vec3(0.012) + vec3(0.1, 0.09, 0.12) * tr * (0.4 + 0.6 * live);
            col = mix(col, vec3(0.75, 0.74, 0.72), uHouse * 0.8);
          } else if (part == 6 && h > 30.0) {
            // over the far door: the screen, its big pixels breathing with the beat
            vec2 sq = vec2(x, h) / 2.2, sc = floor(sq), sf = fract(sq);
            float k = 0.5 + 0.5 * sin(sc.x * 0.35 + uTime * 2.6) * sin(sc.y * 0.6 - uTime * 1.9);
            vec3 c = mix(uA, uB, k) * (0.25 + 1.6 * uBeat * (0.4 + 0.6 * uChorus)) * (0.5 + 0.5 * step(0.5, h2(sc + floor(uTime * 4.0))));
            float px = smoothstep(0.0, 0.12, min(min(sf.x, 1.0 - sf.x), min(sf.y, 1.0 - sf.y)));
            col = c * px * live + vec3(0.01);
            col = mix(col, vec3(0.4), uHouse);
          } else {
            // the walls: black, light bars that climb with the music, a rail of light at the balcony, the ball's spots
            col = vec3(0.016, 0.014, 0.022) * (0.9 + 0.1 * n2(vec2(wa, h) * 0.2));
            float bi = floor(wa / 9.0), bx = (fract(wa / 9.0) - 0.5) * 9.0;
            float bar = aaLine(bx, 0.45);
            float lvl = 4.0 + 30.0 * clamp(uVu * (0.55 + 0.45 * h2(vec2(bi, floor(uTime * 4.47)))) , 0.0, 1.0);
            float seg = 0.55 + 0.45 * aaSq(h * 0.9);
            vec3 sc = mix(uA, uB, 0.5 + 0.5 * sin(bi * 0.7 + uTime * 0.8));
            col += sc * bar * seg * step(h, lvl) * (0.5 + 1.3 * uBeat) * live * (part == 6 ? 0.0 : 1.0);
            col += sc * aaLine(h - 13.5, 0.22) * (0.5 + 0.8 * uBeat) * live;
            col += vec3(1.0, 0.95, 1.0) * spots(vec2(wa, h)) * 0.8 * live;
            col = mix(col, vec3(0.42, 0.41, 0.4) * (0.85 + 0.15 * n2(vec2(wa, h) * 0.2)), uHouse);
          }
        } else if (st < 1.5) {
          // the red room: tufted velvet walls, black lacquer underfoot with the lamps in it
          if (part == 0) {
            col = vec3(0.03, 0.005, 0.01) + uWarm * 0.08 * (0.5 + 0.5 * n2(vec2(x, along) * 0.2));
            float dl = mod(along + 17.0, 34.0) - 17.0;
            col += uWarm * 0.25 * exp(-(dl * dl) / 60.0) * exp(-x * x / 400.0);
          }
          else if (part == 3) { col = vec3(0.04, 0.0, 0.01); }
          else {
            vec2 tq = vec2(wa / 3.0 + mod(floor(h / 3.0), 2.0) * 0.5, h / 3.0), tf = fract(tq) - 0.5;
            float fw = fwidth(tq.x);
            float tuft = mix(0.5 + 0.45 * smoothstep(0.7, 0.0, length(tf)), 0.72, smoothstep(0.15, 0.5, fw));
            col = vec3(0.32, 0.02, 0.06) * tuft;
            col = mix(col, vec3(0.6, 0.45, 0.2), (1.0 - smoothstep(0.05, 0.08 + fw, length(tf))) * (1.0 - smoothstep(0.15, 0.5, fw)));
          }
        } else if (st < 2.5) {
          // the back corridors: black walls, a concrete floor, doors, a tube light now and then (flickering)
          float fa = mod(along + 13.0, 26.0) - 13.0;
          float lk = (0.18 + 0.9 * exp(-fa * fa / 40.0)) * uFlicker;
          if (part == 0) { col = vec3(0.12, 0.12, 0.13) * (0.8 + 0.3 * n2(vec2(x, along) * 0.4)) * lk; }
          else if (part == 3) { col = vec3(0.05) * lk; col += vec3(1.4, 1.5, 1.45) * step(abs(fa), 3.0) * step(abs(x), 0.8) * uFlicker; }
          else {
            col = vec3(0.07, 0.065, 0.08) * (0.85 + 0.15 * n2(vec2(wa, h) * 0.2));
            float dx = mod(wa, 30.0) - 15.0;
            if (abs(dx) < 5.0 && h < 17.0 && part != 6) { col = vec3(0.16, 0.06, 0.06) * (0.8 + 0.2 * n2(vec2(dx, h))); col = mix(col, vec3(0.6, 0.6, 0.62), step(4.4, abs(dx)) + step(16.4, h)); col = mix(col, vec3(0.8, 0.8, 0.82), step(length(vec2(dx - 3.4 * side, h - 8.0)), 0.35)); }
            col *= lk;
          }
        } else if (st < 3.5) {
          // the washroom: small black and white tiles, a band of mirror the length of the wall
          vec2 tq = vec2(wa, h) / 1.2;
          if (part == 0) tq = vec2(x, along) / 2.0;
          vec2 tf = fract(tq);
          float fw = max(fwidth(tq.x), fwidth(tq.y));
          float chk = aaChkM(tq, part == 0 ? vec2(0.0, uMove / 2.0) : vec2(uMove / 1.2, 0.0));
          float gr = mix(0.75 + 0.25 * smoothstep(0.0, 0.08 + fw, min(min(tf.x, 1.0 - tf.x), min(tf.y, 1.0 - tf.y))), 0.9, smoothstep(0.15, 0.5, fw));
          col = mix(vec3(0.85, 0.85, 0.84), vec3(0.05), chk) * gr;
          if (part == 3) col = vec3(0.7, 0.72, 0.72);
          if (onWall && part != 6 && h > 15.0 && h < 24.0) {
            col = vec3(0.1, 0.12, 0.14) + vec3(0.18, 0.2, 0.22) * smoothstep(0.96, 1.0, sin(wa * 0.3 + h * 0.6 + uTime * 0.2));
            col = mix(col, vec3(0.6), max(aaLine(h - 15.2, 0.25), aaLine(h - 23.8, 0.25)));
            // cracking, one after another, as she comes: a flash, the lines out from it, the glass gone to pieces
            float cr = 0.0, sh = 0.0, fl = 0.0;
            for (int i = 0; i < 4; i++) {
              float k = i == 0 ? uCrackK.x : (i == 1 ? uCrackK.y : (i == 2 ? uCrackK.z : uCrackK.w));
              float tc = i == 0 ? uCrackT.x : (i == 1 ? uCrackT.y : (i == 2 ? uCrackT.z : uCrackT.w));
              float sd = i == 0 ? uCrackS.x : (i == 1 ? uCrackS.y : (i == 2 ? uCrackS.z : uCrackS.w));
              if (k <= 0.0 || sd * side < 0.0) continue;
              vec2 q = vec2((vT - tc) * uSpeed, h - 19.5);
              cr = max(cr, crack(q, k, float(i) + 3.0));
              float rr = length(q);
              sh = max(sh, step(rr, 1.0 + 11.0 * k) * step(0.62, h2(floor(q * 1.3 + float(i) * 7.0))));
              fl = max(fl, (1.0 - k) * exp(-rr * 0.35));
            }
            col = mix(col, vec3(0.32, 0.36, 0.42), sh * 0.6);
            col = mix(col, vec3(0.95, 0.97, 1.0), cr * 0.95);
            col += vec3(1.6, 1.7, 1.8) * fl;
          }
          float fa = mod(along + 11.0, 22.0) - 11.0;
          col *= (0.3 + 0.85 * exp(-fa * fa / 70.0)) * uFlicker;
        } else {
          // the lounge: sweet and clean. White marble, blush walls pleated in gold, lights in the ceiling
          float fa = mod(along + 12.0, 24.0) - 12.0;
          if (part == 0) {
            vec2 q = vec2(x, along);
            float v = n2(q * 0.08) + 0.5 * n2(q * 0.21 + 7.0);
            float fw = fwidth(v);
            float vein = (1.0 - smoothstep(0.006, 0.016 + fw, abs(v - 0.78))) * (1.0 - smoothstep(0.05, 0.2, fw));
            col = vec3(0.8, 0.77, 0.78) * (0.9 + 0.1 * n2(q * 0.5)) - vec3(0.12, 0.15, 0.13) * vein;
            // the lights in it, and the pink of the walls at its edges
            col += vec3(1.0, 0.92, 0.95) * 0.35 * exp(-fa * fa / 30.0) * exp(-pow(abs(x) - 22.0, 2.0) / 60.0);
            col += uA * 0.12 * smoothstep(30.0, 54.0, abs(x));
            col *= 0.75;
          } else if (part == 3) {
            col = vec3(0.86, 0.84, 0.86);
            vec2 lq = vec2(abs(x) - 22.0, fa);
            col = mix(col, vec3(2.2, 2.0, 2.1), 1.0 - smoothstep(1.6, 2.0, length(lq)));
            col = mix(col, vec3(0.7, 0.55, 0.3), aaLine(length(lq) - 2.4, 0.2));
            col *= 0.8;
          } else {
            vec3 blush = vec3(0.62, 0.34, 0.44);
            float fw = fwidth(wa);
            float pleat = mix(0.84 + 0.16 * sin(wa * 3.1416), 0.84, smoothstep(0.3, 0.9, fw));
            col = blush * pleat * (0.92 + 0.08 * n2(vec2(wa, h) * 0.1));
            // arched niches lit pink every twenty-four metres
            float nx = mod(wa, 24.0) - 12.0;
            float arch = step(abs(nx), 4.0) * step(4.0, h) * step(h, 18.0) + step(length(vec2(nx, h - 18.0)), 4.0) * step(18.0, h);
            col = mix(col, uA * 1.4 + vec3(0.25, 0.12, 0.2), arch * (part == 6 ? 0.0 : 1.0));
            float gold = max(max(aaLine(h - 3.5, 0.18), aaLine(h - 26.0, 0.25)), aaLine(mod(wa + 6.0, 12.0) - 6.0, 0.15) * step(26.0, h));
            col = mix(col, vec3(0.95, 0.72, 0.36), gold);
            col *= 0.85 + 0.25 * exp(-fa * fa / 80.0);
          }
          col *= 0.9 + 0.2 * uBeat * uChorus;
        }
        // red emergency light: nearly black, one colour
        col = mix(col, vec3(0.5, 0.02, 0.03) * (0.3 + 0.7 * smoothstep(0.0, 30.0, h)) * (0.4 + 0.6 * n2(vec2(wa * 0.05, uTime * 0.3))), uRed * (part == 0 ? 0.85 : 1.0));
        col *= part == 7 ? vec3(1.0) : mix(vec3(1.0), uLight, 0.6 + 0.4 * uHouse);
        // the room going: everything but a few lights into the dark
        if (uVoid > 0.001) {
          vec2 vq = vec2(part == 0 ? x : wa, part == 0 ? along : h) * 0.35 + vec2(uTime * 1.4, uTime * 0.5);
          vec2 vf = fract(vq) - 0.5;
          float star = step(0.93, h2(floor(vq))) * smoothstep(0.35, 0.05, length(vf * vec2(1.0, 4.0)));
          col = mix(col, hue(h2(floor(vq)) + uTime * 0.15) * star * 2.4, uVoid);
        }
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the morning outside, the bus home (spd-finale.js) ----------
export const BusStopFinale = SpdMorningFinale;

// ---------- the crowd's rows, from the plan ----------
const CLOTHES = [0x16121c, 0x1c1024, 0x10161c, 0x22121a, 0x1a1a1e, 0x26122a, 0x121c28, 0x2a1416, 0x0e0e12];
function buildCrowd(crowd, plan, course) {
  const R = seeded(1871);
  const tint = () => col(pick(R, CLOTHES)).map((v) => v * (0.8 + R() * 0.6));
  for (const z of plan.spdCrowd || []) {
    const clear = z.clear || [];
    for (let t = z.from; t < z.to; t += z.every ?? 0.3) {
      const tt = t + (R() - 0.5) * (z.every ?? 0.3) * 0.4;
      const figs = [];
      for (const side of [-1, 1]) for (const x0 of z.xs) {
        if (clear.some(([a, b, sd]) => tt > a && tt < b && (!sd || sd === side))) continue;
        if (R() < (z.skip ?? 0.12)) continue;
        figs.push({ x: side * (x0 + (R() - 0.5) * (z.jx ?? 3)), rot: (z.rot ?? 0) + (R() - 0.5) * (z.spread ?? 0.8) + (z.face === 'road' ? SIDE(side) : 0), s: (z.s ?? 7) * (0.9 + R() * 0.2), seed: R(), variant: R() < 0.55 ? 0 : 1, mode: z.mode ?? 1, lag: R() * 0.12, tint: tint() });
      }
      if (figs.length) crowd.addRow({ t: tt, figs });
    }
  }
  // the ones placed by hand: the bouncer, the watcher, the statues, the DJ
  for (const f of plan.spdPeople || []) {
    crowd.addRow({ t: f.t, figs: [{ x: f.x, rot: f.rot ?? 0, s: f.s ?? 7, seed: f.seed ?? R(), variant: f.variant ?? 1, mode: f.mode ?? 4, lag: 0, tint: f.tint ? col(f.tint) : tint(), dy: f.dy ? f.dy : 0, eyes: f.eyes, track: f.track }] });
  }
  // under the gap on the drop: hands up to her as she flies over
  for (const g of course.gaps) {
    if (!plan.spdReach || !plan.spdReach.some((a) => Math.abs(a - g.lip) < 0.3)) continue;
    for (let t = g.from + 0.05; t < g.to; t += 0.16) {
      const figs = [], ry = course.sample(t).y, fy = floorAt(course, t);
      const s = clamp((ry - fy - 1.2) / 2.15, 2.5, 7);
      for (const x of [-11, -5.5, 0, 5.5, 11]) figs.push({ x: x + (R() - 0.5) * 2.5, rot: Math.PI + (R() - 0.5) * 0.6, s: s * (0.9 + R() * 0.1), seed: R(), variant: R() < 0.5 ? 0 : 1, mode: 3, lag: R() * 0.1, tint: tint() });
      crowd.addRow({ t, figs });
    }
  }
  crowd.done();
}

// ---------- the club, per frame ----------
export class ClubWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = clubMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, CLUB));
    const c = S.course;
    if (S.town) { S.town.floorFn = (t, x) => groundAt(c, t, x); for (const r of S.town.roadMeshes) r.floorFn = S.town.floorFn; }
    this.flicker = 1;
    this.crowd = new SpdCrowd(scene, c, S.plan);
    buildCrowd(this.crowd, S.plan, c);
    this.st = { beatF: 0, jump: 0, arms: 0, crouch: 0, freeze: 0, stone: 0, dissolve: 0, rimK: 1, rimA: new THREE.Color(), rimB: new THREE.Color(), top: new THREE.Color(), below: new THREE.Color(), amb: new THREE.Color(), stoneK: 1, dropY: 0, ahead: 12, pump: 0.4, sway: 0 };
    this.ringT = -99; this.lastBeat = -1;
    this.cracks = (S.plan.spdCracks || []).map((k) => ({ ...k }));
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, t = S.rider.t, ev = S.plan.roomEvents || {}, sp = S.plan.spd || {}, c = S.course;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uBeat.value = S.town.beat || 0;
    u.uMove.value = S.rider.v * Math.min(dt, 1 / 30);
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uWarm.value.set(P.lamp ?? 0xff4fd8); u.uA.value.set(P.glow ?? 0xff4fd8); u.uB.value.set(P.fret ?? 0x40d8ff);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyTop.value.set(P.zenith); u.uSkyLow.value.set(P.horizon);
    // the house lights come on with a stutter
    let house = win(ev.house, t); if (house > 0 && house < 1) house = house * (0.6 + 0.4 * (Math.sin(time * 61) > 0 ? 1 : 0));
    u.uHouse.value = house; u.uRed.value = win(ev.red, t); u.uVoid.value = win(ev.void, t);
    // the corridor lights stutter
    const r = Math.sin(time * 37.0) * Math.sin(time * 11.3 + 1.7);
    this.flicker += ((r > 0.2 || Math.sin(time * 2.3) < 0.7 ? 1 : 0.15) - this.flicker) * Math.min(1, dt * 30);
    u.uFlicker.value = this.flicker; S.town.flicker = this.flicker;
    S.town.lasers = win(ev.lasers, t) * (0.6 + 0.4 * (S.town.beat || 0));
    // the beat, and what the music is doing
    const bpos = c.beatAt(t), bi = Math.floor(bpos), bf = bpos - bi, pulse = Math.exp(-bf * 7);
    const chorus = clamp(S.lift ? S.lift.k : 0, 0, 1);
    u.uChorus.value = chorus;
    const energy = c.sample(t).energy;
    u.uVu.value = clamp(0.25 + 0.75 * energy * (0.55 + 0.45 * pulse), 0, 1) * (1 - house);
    // a ring of light out across the floor from her on every beat of the chorus
    const ringOn = win(sp.rings, t);
    if (bi !== this.lastBeat) { this.lastBeat = bi; if (ringOn > 0.05) this.ringT = time; }
    const ra = time - this.ringT;
    u.uRingR.value = ra * 95; u.uRingK.value = ringOn * Math.max(0, 1 - ra / 0.6);
    u.uAlong.value = S.rider.stats.dist; u.uSpeed.value = Math.max(15, S.rider.v || 38);
    // the mirrors crack ahead of her, each on its beat
    for (let i = 0; i < 4; i++) {
      const k = this.cracks[i];
      const kk = k ? clamp((t - k.at) / 0.35, 0, 1) : 0;
      u.uCrackK.value.setComponent(i, kk); u.uCrackT.value.setComponent(i, k ? k.at + (k.ahead ?? 1.4) : -1e5); u.uCrackS.value.setComponent(i, k ? k.side : 1);
    }
    // the room drops with the kick
    const dropK = win(sp.drop, t);
    const dropY = -(sp.dropM ?? 0.9) * dropK * pulse;
    // the crowd
    const st = this.st;
    st.beatF = bpos; st.jump = win(sp.jump, t); st.arms = win(sp.arms, t); st.crouch = win(sp.crouch, t);
    st.freeze = win(sp.freeze, t); st.stone = win(sp.stone, t); st.dissolve = win(sp.dissolve, t);
    st.rimA.set(P.glow ?? 0xff4fd8); st.rimB.set(P.fret ?? 0x40d8ff); st.rimK = (0.7 + 0.9 * pulse * (0.3 + st.jump)) * (1 - house) + 0.15;
    st.top.set(P.skyLight ?? 0x8a6aff).multiplyScalar(0.12 * (P.hemiK ?? 1.5));
    st.below.set(P.lamp ?? 0xff4fd8).multiplyScalar(0.18 + 0.25 * chorus * pulse);
    st.amb.set(P.skyLight ?? 0x5a4a8a).multiplyScalar(0.07 * (P.hemiK ?? 1.5) * (1 - 0.5 * st.stone)).add(this._amb0 || (this._amb0 = new THREE.Color(0.02, 0.018, 0.028)));
    st.stoneK = 0.55 + 0.25 * pulse;
    st.dropY = dropY; st.pump = 0.5 + 0.5 * chorus; st.sway = win(sp.sway, t);
    st.house = house; st.rig = win(sp.rig, t); st.rigDrop = dropK;
    // the CO2 goes on each bar while it's on
    let bb = bi; while (bb > 0 && !c.isBar(bb)) bb--;
    st.jet = win(sp.jets, t); st.jetAge = t - c.beats[bb];
    SPD_FOG.uFog.value.set(P.fog); SPD_FOG.uFogD.value = P.fogDensity; SPD_FOG.uTime.value = time;
    this.crowd.update(S, camera, time, st);
    S.town.spd = st;
    for (const rm of this.rooms) {
      rm.update(S.track, S.rider, t);
      const dy = rm.style === 0 ? dropY : 0;
      rm.mesh.position.y = dy;
      for (const cap of rm.caps) cap.position.y += dy;
    }
  }
  // the tube lights in the corridors, the washroom's, the lounge's; eyes; phones in the queue
  draw(T) {
    const g = this._g || (this._g = new THREE.Vector3());
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        this.S.track.ground(f.t, 0, g);
        const fy = floorAt(this.S.course, f.t);
        if (r.style === 4) { for (const sd of [-1, 1]) { const w = this.S.track.ground(f.t, sd * 22, this._w || (this._w = new THREE.Vector3())); T.glow(w.x, fy + r.H - 1.2, w.z, 8, [1, 0.92, 0.95], 0.7); T.pool(w.x, fy + 0.08, w.z, 26, [1, 0.85, 0.9], 0.3); } continue; }
        if (r.style === 1) { T.glow(g.x, fy + r.H - 4, g.z, 14, [1, 0.5, 0.35], 0.5); continue; }
        T.glow(g.x, fy + r.H - 0.6, g.z, 9, [0.85, 1, 0.95], 0.8 * this.flicker);
        T.pool(g.x, fy + 0.08, g.z, 28, [0.85, 1, 0.95], 0.35 * this.flicker);
      }
    }
    const cr = this.crowd;
    if (cr.eyes) for (let i = 0; i < cr.eyes.length; i += 3) T.glow(cr.eyes[i], cr.eyes[i + 1], cr.eyes[i + 2], 0.9, [1, 0.85, 0.8], 2.6);
    if (cr.phones) for (let i = 0; i < cr.phones.length; i += 4) T.glow(cr.phones[i], cr.phones[i + 1], cr.phones[i + 2], 0.12 * cr.phones[i + 3], [0.75, 0.85, 1], 1.5);
  }
}
