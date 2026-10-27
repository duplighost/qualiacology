// Pretty Until Proven Guilty: the courthouse's set-pieces, each on its line.
// Lady Justice down the marble halls, her scales tipping with the beat (and with "pretty, guilty");
// the switchblade over the road that snaps open on "switchblade", and a row of them on stands
// that flick open down the courtroom on "keen as a switchblade"; the dress code by the door,
// SKIRT TOO SHORT FOR THE COURTHOUSE; the stalker's board with its red string; red paint over
// the courtroom doors, CAUGHT RED-HANDED; the lips that swallow the key; the booking wall, a flash
// on every "pretty"; her lawyer the mirror, written on in lipstick. And the press: flashbulbs
// going off all down the room in every chorus.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt, groundAt } from './trail.js';
import { paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 14, hh = 10) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
function tube(a, b, r, n = 8) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
const onGround = (S, it) => { prepare(S.course, S.plan); if (it.h === undefined) it.h = groundAt(S.course, it.t, it.x); return it; };
// vertex-coloured, lit a little by itself so it reads in a dim room
function litVC(M, key, opts, k) {
  return M[key] || (M[key] = (() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts });
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';'); };
    return m;
  })());
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
// lines of text as big as they'll go in a box
function fitLines(g, lines, fontFor, maxW, start) {
  let size = start; g.font = fontFor(size);
  while (Math.max(...lines.map((l) => g.measureText(l).width)) > maxW && size > 12) { size -= 2; g.font = fontFor(size); }
  return size;
}

// ---------- Lady Justice ----------
export const JUS = {
  // on her plinth, robed, blindfolded, one hand up holding the scales' rod, the sword point down in the other
  // her plinth: marble, a gold band
  plinth() {
    const parts = [], m = rgb(0xefeae2), stone = rgb(0xd6cfc2), g = rgb(0xd8b050);
    parts.push(paint(box(8, 0.8, 8, 0, 0.4, 0), stone));
    parts.push(paint(box(7, 4.4, 7, 0, 3.0, 0), m));
    parts.push(paint(box(8, 0.8, 8, 0, 5.6, 0), stone));
    parts.push(paint(box(7.2, 0.3, 7.2, 0, 4.4, 0), g));
    return merge(parts);
  },
  // gilded, and her blindfold red silk
  body() {
    const parts = [], m = rgb(0xd9a94a), g = rgb(0xf0c860), red = rgb(0xd0102a);
    const prof = [[0, 6.0], [2.9, 6.0], [2.85, 6.6], [2.4, 9.0], [1.85, 11.6], [1.5, 12.9], [1.9, 14.4], [1.75, 15.4], [0.9, 15.95], [0.35, 16.1], [0, 16.12]].map(([r, y]) => new THREE.Vector2(r, y));
    const robe = new THREE.LatheGeometry(prof, 28), pa = robe.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), a = Math.atan2(z, x), f = 1 + 0.07 * Math.sin(a * 9) * clamp((13 - y) / 7, 0, 1); pa.setX(i, x * f); pa.setZ(i, z * f); }
    robe.computeVertexNormals(); parts.push(paint(robe, m));
    parts.push(paint(cyl(1.62, 1.62, 0.35, 24, 0, 12.95, 0), g));                       // the girdle
    parts.push(paint(cyl(0.34, 0.4, 0.8, 10, 0, 16.4, 0), m));
    parts.push(paint(sph(0.72, 1, 1.18, 1, 0, 17.25, 0.05, 16, 12), m));
    parts.push(paint(sph(0.8, 1, 0.95, 1.02, 0, 17.45, -0.12, 16, 12), m));
    parts.push(paint(sph(0.5, 1, 0.9, 1, 0, 17.55, -0.78, 12, 8), m));
    parts.push(paint(cyl(0.77, 0.77, 0.3, 20, 0, 17.32, 0.04), red));                   // the blindfold
    for (const sx of [-1, 1]) { const tl = box(0.16, 1.1, 0.06, 0, -0.55, 0); tl.rotateZ(sx * 0.25); tl.translate(sx * 0.18, 17.2, -0.8); parts.push(paint(tl, red)); }
    parts.push(paint(tube(V(-1.55, 15.3, 0), V(-2.25, 17.4, 0.35), 0.33), m));
    parts.push(paint(tube(V(-2.25, 17.4, 0.35), V(-2.2, 19.6, 0.45), 0.28), m));
    parts.push(paint(sph(0.34, 1, 1, 1, -2.2, 19.75, 0.45, 10, 8), m));
    parts.push(paint(cyl(0.07, 0.07, 1.3, 6, -2.2, 20.45, 0.45), g));
    parts.push(paint(tube(V(1.55, 15.3, 0), V(1.95, 13.3, 0.55), 0.33), m));
    parts.push(paint(tube(V(1.95, 13.3, 0.55), V(1.75, 11.5, 1.3), 0.28), m));
    parts.push(paint(sph(0.34, 1, 1, 1, 1.75, 11.4, 1.35, 10, 8), m));
    parts.push(paint(cyl(0.12, 0.12, 1.1, 8, 1.75, 11.75, 1.35), g));
    parts.push(paint(box(1.7, 0.22, 0.3, 1.75, 11.1, 1.35), g));
    const bl = new THREE.CylinderGeometry(0.22, 0.02, 5.0, 4, 1); bl.scale(1, 1, 0.3); bl.translate(1.75, 8.5, 1.35); parts.push(paint(bl, rgb(0xe8ecf4)));
    return merge(parts);
  },
  // the scales' beam: it pivots at the origin
  beam() { const parts = [], g = rgb(0xe0b850); parts.push(paint(box(4.8, 0.16, 0.16, 0, 0, 0), g)); for (const x of [-2.4, 2.4]) parts.push(paint(sph(0.18, 1, 1, 1, x, 0, 0, 8, 6), g)); parts.push(paint(cyl(0.05, 0.22, 0.6, 8, 0, 0.3, 0), g)); return merge(parts); },
  // a pan, hung from the beam's end on three cords
  pan() { const parts = [], g = rgb(0xe0b850); const bowl = new THREE.SphereGeometry(0.95, 18, 6, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4); bowl.translate(0, -1.4, 0); parts.push(paint(bowl, g)); for (let k = 0; k < 3; k++) { const a = k * 2.094; parts.push(paint(tube(V(0, 0, 0), V(Math.cos(a) * 0.8, -2.15, Math.sin(a) * 0.8), 0.03, 4), g)); } return merge(parts); },
};

// ---------- the switchblade ----------
// in the xy plane facing +z: the pivot at the origin, the handle running off to -x; the blade
// turns about the pivot, folded back along the handle (angle pi) or open (0)
const KN = {
  handle() {
    const parts = [], silver = rgb(0xdfe3ea), black = rgb(0x141016), red = rgb(0x9a0c1e);
    parts.push(paint(box(7.2, 1.45, 0.9, -4.1, 0, 0), black));
    parts.push(paint(box(5.8, 0.9, 0.96, -4.1, 0, 0), red));
    parts.push(paint(box(0.75, 1.6, 1.02, -0.55, 0, 0), silver));
    parts.push(paint(box(0.75, 1.6, 1.02, -7.6, 0, 0), silver));
    const pin = cyl(0.36, 0.36, 1.14, 16, 0, 0, 0); pin.rotateX(Math.PI / 2); parts.push(paint(pin, silver));
    parts.push(paint(cyl(0.3, 0.3, 0.32, 14, -2.3, 0.82, 0), silver));
    return merge(parts);
  },
  blade() {
    const s = new THREE.Shape();
    s.moveTo(0, 0.44); s.lineTo(5.8, 0.5); s.lineTo(8.8, 0.02); s.quadraticCurveTo(7.0, -0.52, 4.8, -0.6); s.lineTo(0.5, -0.6); s.lineTo(0, -0.28); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.07, bevelSegments: 1, curveSegments: 8 });
    g.translate(0, 0, -0.06);
    return paint(g, rgb(0xf2f5fa));
  },
  // a brass stand for a knife on show: a pole (scaled to reach the floor) and its foot
  pole() { const g = cyl(0.18, 0.22, 1, 8, 0, -0.5, 0); return paint(g, rgb(0xc8a050)); },
  foot() { return merge([paint(cyl(1.6, 1.9, 0.6, 16, 0, 0.3, 0), rgb(0x2a1a10)), paint(cyl(0.5, 0.5, 0.3, 12, 0, 0.75, 0), rgb(0xc8a050))]); },
};
// how far open a knife is at song time T if it snaps open at tOpen: shut, then a flick with a bounce
function knifeAngle(T, tOpen) {
  const u = (T - tOpen) / 0.075;
  if (u <= 0) return Math.PI;
  if (u < 1) return Math.PI * (1 - (1 - (1 - u) * (1 - u) * (1 - u)));
  const d = T - tOpen - 0.075;
  return -0.16 * Math.exp(-d * 9) * Math.sin(d * 34);
}

// ---------- the lips that swallow the key ----------
function lipShapes() {
  const up = new THREE.Shape();
  up.moveTo(-7, 0.1); up.bezierCurveTo(-5, 1.4, -2.6, 2.7, -1.5, 2.45); up.quadraticCurveTo(-0.6, 2.3, 0, 1.6); up.quadraticCurveTo(0.6, 2.3, 1.5, 2.45); up.bezierCurveTo(2.6, 2.7, 5, 1.4, 7, 0.1);
  up.bezierCurveTo(4.5, 0.55, 2.2, 0.75, 0, 0.45); up.bezierCurveTo(-2.2, 0.75, -4.5, 0.55, -7, 0.1);
  const lo = new THREE.Shape();
  lo.moveTo(-6.7, -0.05); lo.bezierCurveTo(-5.2, -2.6, -2.4, -3.4, 0, -3.35); lo.bezierCurveTo(2.4, -3.4, 5.2, -2.6, 6.7, -0.05);
  lo.bezierCurveTo(4.4, -0.55, 2.2, -0.62, 0, -0.5); lo.bezierCurveTo(-2.2, -0.62, -4.4, -0.55, -6.7, -0.05);
  const ex = (s) => { const g = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.55, bevelSegments: 5, curveSegments: 18 }); g.translate(0, 0, -0.6); return g; };
  return { up: paint(ex(up), rgb(0xd0102a)), lo: paint(ex(lo), rgb(0xc80c26)) };
}
let LIPS = null;
const lips = () => LIPS || (LIPS = lipShapes());

// ---------- the booking camera on its tripod ----------
function flashCam() {
  const parts = [], dark = rgb(0x1e1e24);
  for (let k = 0; k < 3; k++) { const a = k * 2.094; parts.push(paint(tube(V(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6), V(0, 7, 0), 0.1, 5), dark)); }
  parts.push(paint(box(2.2, 1.5, 1.6, 0, 7.8, 0), dark));
  const lens = cyl(0.55, 0.65, 1.1, 14, 0, 0, 0); lens.rotateX(Math.PI / 2); lens.translate(0, 7.8, 1.3); parts.push(paint(lens, rgb(0x2a2a30)));
  parts.push(paint(box(0.4, 1.8, 0.4, 1.0, 9.0, 0), dark));
  parts.push(paint(box(1.3, 0.8, 0.5, 1.0, 10.2, 0.2), rgb(0xd8dce4)));
  return merge(parts);
}

extend({
  layers: {
    ppgJPlinth: (M) => [JUS.plinth(), litVC(M, 'ppgMarbleM', { roughness: 0.35, metalness: 0.05 }, 0.22), 40, {}],
    ppgJBody: (M) => [JUS.body(), litVC(M, 'ppgGildM', { roughness: 0.3, metalness: 0.55 }, 0.34), 40, {}],
    ppgJBeam: (M) => [JUS.beam(), litVC(M, 'ppgGoldM', { roughness: 0.22, metalness: 0.65 }, 0.3), 40, {}],
    ppgJPan: (M) => [JUS.pan(), litVC(M, 'ppgGoldDM', { roughness: 0.22, metalness: 0.65, side: THREE.DoubleSide }, 0.3), 80, {}],
    ppgKHandle: (M) => [KN.handle(), litVC(M, 'ppgKnifeM', { roughness: 0.3, metalness: 0.35 }, 0.3), 40, {}],
    ppgKBlade: (M) => [KN.blade(), litVC(M, 'ppgSteelM', { roughness: 0.12, metalness: 0.85 }, 0.55), 40, {}],
    ppgKPole: (M) => [KN.pole(), litVC(M, 'ppgGoldM', { roughness: 0.22, metalness: 0.65 }, 0.3), 40, {}],
    ppgKFoot: (M) => [KN.foot(), litVC(M, 'ppgKnifeM', { roughness: 0.3, metalness: 0.35 }, 0.3), 40, {}],
    ppgLipUp: (M) => [lips().up, litVC(M, 'ppgLipM', { roughness: 0.18, metalness: 0.12 }, 0.4), 3, {}],
    ppgLipLo: (M) => [lips().lo, litVC(M, 'ppgLipM', { roughness: 0.18, metalness: 0.12 }, 0.4), 3, {}],
    ppgMouth: (M) => [(() => { const g = new THREE.CircleGeometry(1, 32); g.scale(6.2, 1.6, 1); g.translate(0, -0.4, -0.7); return g; })(), M.ppgMouthM || (M.ppgMouthM = new THREE.MeshBasicMaterial({ color: 0x1a0306 })), 3, {}],
    ppgCam: (M) => [flashCam(), litVC(M, 'ppgCamM', { roughness: 0.5, metalness: 0.3 }, 0.2), 8, {}],
  },
  parts: {
    // Lady Justice: her scales sway; in a chorus they tip to the beat (neighbours the other way);
    // where the hall's own scales go pretty, guilty, hers go with them
    ppgJustice(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.ppgJPlinth.add(m); S.layers.ppgJBody.add(m);
      const T = S.tNow ?? 0, c = S.course;
      let tilt = Math.sin(T * 1.2 + it.seed * 9) * 0.07;
      if (it.tips) {
        let last = null, prev = 0; for (const tp of it.tips) { if (T >= tp[0]) { if (last) prev = last[1]; last = tp; } }
        if (last && T < it.tipsEnd) { const u = clamp((T - last[0]) / 0.16, 0, 1); tilt = (prev + (last[1] - prev) * u * u * (3 - 2 * u)) * 0.42; }
      }
      if (c) {
        const sec = c.sectionAt(T);
        if ((sec.kind === 'chorus' || sec.kind === 'final') && !(it.tips && T >= it.tips[0][0] && T < it.tipsEnd)) {
          const bp = c.beatAt(T), bi = Math.floor(bp), f = bp - bi, side = ((bi + it.k) % 2 ? 1 : -1);
          const u = clamp(f / 0.3, 0, 1), from = -side, e = u * u * (3 - 2 * u);
          tilt = (from + (side - from) * e) * 0.34;
        }
      }
      const piv = local(p, yaw, -2.2 * s, 21.05 * s, 0.45 * s, S._o).clone();
      const e = S._pje || (S._pje = new THREE.Euler()), bq = S._pjq || (S._pjq = new THREE.Quaternion());
      e.set(0, yaw, tilt); bq.setFromEuler(e); m.compose(piv, bq, S._s.set(s, s, s)); S.layers.ppgJBeam.add(m);
      const yq = S._pjy || (S._pjy = new THREE.Quaternion()); S._e.set(0, yaw, 0); yq.setFromEuler(S._e);
      for (const sd of [-1, 1]) {
        const end = local(piv, yaw, sd * 2.4 * Math.cos(tilt) * s, sd * 2.4 * Math.sin(tilt) * s, 0, S._o);
        m.compose(end, yq, S._s.set(s, s, s)); S.layers.ppgJPan.add(m);
      }
      if (it.lamp) glowAt(S, piv.x, piv.y + 0.6 * s, piv.z, 6 * s, [1, 0.86, 0.55], 0.35);
    },
    // a switchblade: hung over the road (open across it), or stood on its stand point up
    ppgKnife(S, it, p) {
      const T = S.tNow ?? 0, c = S.course, s = it.s ?? 1, m = S._m;
      const handles = S.layers.ppgKHandle, blades = S.layers.ppgKBlade, poles = S.layers.ppgKPole, feet = S.layers.ppgKFoot;
      const h = c.sample(it.t).yaw;
      let yaw, roll0;
      if (it.hang) { p.y = c.sample(it.t).y + (it.lift ?? 13); yaw = h + Math.PI; roll0 = 0; }
      else { p.y = c.sample(it.t).y + (it.lift ?? 5); yaw = h + SIDE(it.x) + (it.x > 0 ? 0.35 : -0.35); roll0 = Math.PI / 2; }
      const e = S._pke || (S._pke = new THREE.Euler()), kq = S._pkq || (S._pkq = new THREE.Quaternion());
      e.set(0, yaw, roll0); kq.setFromEuler(e); m.compose(p, kq, S._s.set(s, s, s)); handles.add(m);
      const a = knifeAngle(T, it.open);
      e.set(0, yaw, roll0 + a); kq.setFromEuler(e); m.compose(p, kq, S._s.set(s, s, s)); blades.add(m);
      if (!it.hang) {
        // the stand: from the floor up to the pommel
        const fy = floorAt(c, it.t), base = local(p, yaw, 0, -7.9 * s, 0, S._o).clone();
        S._e.set(0, yaw, 0); const yq = (S._pky || (S._pky = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(base, yq, S._s.set(s, Math.max(0.5, base.y - fy), s)); poles.add(m);
        S._o.set(base.x, fy, base.z); m.compose(S._o, yq, S._s.set(s, s, s)); feet.add(m);
      }
      // the glint: up the blade as it locks, then a wink on the beat in a chorus
      const d = T - it.open;
      if (d > 0) {
        const sec = c.sectionAt(T), beat = S.beat || 0;
        const k = (d < 0.35 ? 2.6 * (1 - d / 0.35) : 0) + ((sec.kind === 'chorus' || sec.kind === 'final') ? 0.9 * beat : 0.15);
        if (k > 0.05) { const tip = local(p, yaw, 0, 0, 0, S._o); const ca = Math.cos(roll0 + a), sa = Math.sin(roll0 + a), r = (d < 0.35 ? 2 + 6.6 * (d / 0.35) : 8.4) * s; const cy = Math.cos(yaw), sy = Math.sin(yaw); glowAt(S, tip.x + ca * r * cy, tip.y + sa * r, tip.z - ca * r * sy, 2.6 * s, [0.9, 0.95, 1], k); }
      }
    },
    // the lips over the road: open, the key thrown in, shut on the beat with a gulp
    ppgLips(S, it, p) {
      const T = S.tNow ?? 0, c = S.course, s = it.s ?? 1, m = S._m;
      const ups = S.layers.ppgLipUp, los = S.layers.ppgLipLo, mouths = S.layers.ppgMouth, keys = S.layers.key;
      const yaw = c.sample(it.t).yaw + Math.PI;
      p.y = c.sample(it.t).y + (it.lift ?? 12);
      const shut = clamp((T - it.gulp) / 0.09, 0, 1), open = 1 - shut * shut;
      const gulp = T > it.gulp ? 1 + 0.07 * Math.exp(-(T - it.gulp) * 7) * Math.sin((T - it.gulp) * 26) : 1;
      S._e.set(0, yaw, 0); const q = (S._plq || (S._plq = new THREE.Quaternion())).setFromEuler(S._e);
      const up = local(p, yaw, 0, 0.7 * open * s, 0, S._o).clone();
      m.compose(up, q, S._s.set(s * gulp, s * gulp, s)); ups.add(m);
      const lo = local(p, yaw, 0, -1.9 * open * s, 0, S._o).clone();
      m.compose(lo, q, S._s.set(s * gulp, s * gulp, s)); los.add(m);
      m.compose(p, q, S._s.set(s, s * (0.15 + open), s)); mouths.add(m);
      // the key, thrown in from the side, end over end, gone when they shut
      const k0 = it.gulp - 0.55, u = clamp((T - k0) / 0.55, 0, 1);
      if (T > k0 - 2 && T < it.gulp + 0.02) {
        const ks = (it.keyS ?? 0.7) * s, w = local(p, yaw, (1 - u) * (it.keyX ?? 30) * s, (1 - u) * 6 * s + Math.sin(u * Math.PI) * 5 * s - 0.6 * s, 1.5 * s, S._o).clone();
        const ke = S._plk || (S._plk = new THREE.Euler()); ke.set(u * 9, yaw, 1.6 + u * 11); const kq = (S._plkq || (S._plkq = new THREE.Quaternion())).setFromEuler(ke);
        m.compose(w, kq, S._s.set(ks, ks, ks)); keys.add(m);
        glowAt(S, w.x, w.y, w.z, 7 * s, [1, 0.85, 0.5], 1.1);
      }
      glowAt(S, p.x, p.y + 1, p.z, 22 * s, [1, 0.25, 0.32], 0.3 + 0.4 * (S.beat || 0));
    },
    // the booking camera: a flash at every "pretty"
    ppgCam(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; S._e.set(0, yaw + (it.x > 0 ? -0.6 : 0.6), 0); const cq = (S._pcq || (S._pcq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, cq, S._s.set(s, s, s)); S.layers.ppgCam.add(m);
      const T = S.tNow ?? 0; let k = 0;
      for (const tp of it.flashes || []) { const d = T - tp; if (d >= 0 && d < 0.3) k = Math.max(k, 1 - d / 0.3); }
      const w = local(p, yaw, 1.0 * s, 10.3 * s, 0.6 * s, S._o);
      glowAt(S, w.x, w.y, w.z, (3 + 9 * k) * s, [1, 0.98, 0.94], 0.5 + 5 * k * k);
    },
  },
  kits: {
    ppgJustice(S, z, R) {
      let k = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 2.0) for (const side of [-1, 1]) {
        S.items.push(onGround(S, { t: t + (side > 0 ? (z.stagger ?? 0) : 0), x: side * (z.x ?? 31), rot: SIDE(side), s: z.s ?? 1.1, seed: R(), k: k++, tips: z.tips, tipsEnd: z.tipsEnd ?? 1e9, lamp: true, parts: 'ppgJustice', ahead: z.ahead }));
      }
    },
    // one over the road (hang) or a row on stands, opening a pair at a time
    ppgKnife(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1.5, hang: true, lift: z.lift, open: z.open, parts: 'ppgKnife', ahead: z.ahead ?? 40 }); },
    ppgKnives(S, z) {
      prepare(S.course, S.plan); let k = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.45) { for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 27), rot: 0, s: z.s ?? 1.0, lift: z.lift, open: (z.open ?? 0) + k * (z.gap ?? 0.19), parts: 'ppgKnife', ahead: z.ahead }); k++; }
    },
    ppgLips(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1.3, lift: z.lift, gulp: z.gulp, keyS: z.keyS, keyX: z.keyX, parts: 'ppgLips', ahead: z.ahead ?? 40 }); },
    ppgCam(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1.2, flashes: z.flashes, parts: 'ppgCam', ahead: z.ahead })); },
  },
});

// ---------- the one-off boards, each with its own picture ----------
// SKIRT TOO SHORT FOR THE COURTHOUSE on the dress code by the door, with its no-entry signs
function dressTex(text) {
  return canvasTex(1024, 900, (g, W, H) => {
    g.fillStyle = '#efe8d6'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#1c2340'; g.lineWidth = 10; g.strokeRect(26, 26, W - 52, H - 52); g.lineWidth = 3; g.strokeRect(44, 44, W - 88, H - 88);
    const lines = text.split('\n'), f = (s) => `700 ${s}px Georgia, "Times New Roman", "Liberation Serif", serif`;
    const size = fitLines(g, lines, f, W - 150, 104);
    g.fillStyle = '#1c2340'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    lines.forEach((l, i) => g.fillText(l, W / 2, 80 + size * 0.95 + i * size * 1.08));
    const top = 80 + size * 0.95 + (lines.length - 1) * size * 1.08 + 40;
    g.fillRect(140, top, W - 280, 4);
    // three signs: no hat, no shorts, no short skirt
    const cy = top + 170, r = 120;
    [W / 2 - 300, W / 2, W / 2 + 300].forEach((cx, i) => {
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#16161a';
      if (i === 0) { g.beginPath(); g.ellipse(cx, cy + 10, 62, 46, 0, Math.PI, 0); g.fill(); g.fillRect(cx - 86, cy + 6, 172, 18); }
      else if (i === 1) { g.beginPath(); g.moveTo(cx - 58, cy - 62); g.lineTo(cx + 58, cy - 62); g.lineTo(cx + 66, cy + 52); g.lineTo(cx + 12, cy + 52); g.lineTo(cx, cy - 6); g.lineTo(cx - 12, cy + 52); g.lineTo(cx - 66, cy + 52); g.closePath(); g.fill(); }
      else { g.beginPath(); g.moveTo(cx - 34, cy - 60); g.lineTo(cx + 34, cy - 60); g.lineTo(cx + 74, cy + 22); g.lineTo(cx - 74, cy + 22); g.closePath(); g.fill(); g.fillRect(cx - 30, cy + 22, 16, 66); g.fillRect(cx + 14, cy + 22, 16, 66); }
      g.strokeStyle = '#d0102a'; g.lineWidth = 22; g.beginPath(); g.arc(cx, cy, r - 11, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(cx - (r - 18) * 0.707, cy - (r - 18) * 0.707); g.lineTo(cx + (r - 18) * 0.707, cy + (r - 18) * 0.707); g.stroke();
    });
  });
}
// the stalker's board: cork, photos of her pinned up, red string from one to the next, clippings
function corkTex() {
  return canvasTex(1024, 640, (g, W, H) => {
    const R = seeded(19);
    g.fillStyle = '#9a6a3c'; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 4200; k++) { g.fillStyle = R() < 0.5 ? 'rgba(60,34,14,0.35)' : 'rgba(210,160,100,0.3)'; g.fillRect(R() * W, R() * H, 2 + R() * 3, 2 + R() * 3); }
    const pins = [];
    for (let k = 0; k < 13; k++) {
      const x = 60 + (k % 5) * 196 + (R() - 0.5) * 60, y = 50 + Math.floor(k / 5) * 200 + (R() - 0.5) * 50, a = (R() - 0.5) * 0.3;
      g.save(); g.translate(x + 70, y + 80); g.rotate(a);
      if (k % 4 === 3) { g.fillStyle = '#e8e2d2'; g.fillRect(-70, -80, 150, 170); g.fillStyle = '#5a5a60'; for (let l = 0; l < 9; l++) g.fillRect(-58, -66 + l * 17, 120 - (l % 3) * 20, 6); }
      else if (k % 4 === 1) { g.fillStyle = '#f2d84a'; g.fillRect(-60, -60, 120, 120); g.strokeStyle = '#2a2a30'; g.lineWidth = 6; g.beginPath(); g.moveTo(-40, -10); g.lineTo(40, -10); g.moveTo(-40, 14); g.lineTo(26, 14); g.stroke(); }
      else {
        g.fillStyle = '#f6f4ee'; g.fillRect(-70, -80, 140, 166);
        g.fillStyle = k % 2 ? '#3a3440' : '#5a3a40'; g.fillRect(-58, -68, 116, 116);
        g.fillStyle = '#1a1418'; g.beginPath(); g.ellipse(0, -18, 30, 36, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(0, 46, 52, 30, 0, Math.PI, 0); g.fill();
        if (k % 3 === 0) { g.strokeStyle = '#d0102a'; g.lineWidth = 8; g.beginPath(); g.arc(0, -10, 48, 0, Math.PI * 2); g.stroke(); }
      }
      g.restore();
      pins.push([x + 70, y + 10]);
    }
    g.strokeStyle = '#d0102a'; g.lineWidth = 5;
    const order = [0, 6, 2, 8, 4, 9, 3, 12, 1, 7, 11, 5, 10, 0];
    g.beginPath(); order.forEach((i, j) => (j ? g.lineTo(...pins[i]) : g.moveTo(...pins[i]))); g.stroke();
    for (const [x, y] of pins) { g.fillStyle = '#e8102a'; g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(x - 3, y - 3, 4, 0, Math.PI * 2); g.fill(); }
  });
}
// the booking wall: a height chart, her shadow on it
function chartTex() {
  return canvasTex(640, 900, (g, W, H) => {
    g.fillStyle = '#c9d0d6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1a1c22'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '700 30px "Arial Black", Arial, sans-serif';
    const feet = ['7\'0"', '6\'6"', '6\'0"', '5\'6"', '5\'0"', '4\'6"', '4\'0"'];
    // (each height over its line, as on a booking wall: under it, 4'0" fell off the bottom of the chart)
    for (let k = 0; k <= 18; k++) { const y = 40 + k * 46; g.fillRect(0, y, k % 3 === 0 ? W : 60, k % 3 === 0 ? 5 : 3); if (k % 3 === 0) g.fillText(feet[k / 3], 18, y - 20); }
    g.fillStyle = 'rgba(30,26,30,0.5)';
    const hx = W / 2 + 40, hy = 330;
    g.beginPath(); g.ellipse(hx, hy, 104, 120, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(hx - 82, hy + 92, 54, 120, 0.2, 0, Math.PI * 2); g.ellipse(hx + 82, hy + 92, 54, 120, -0.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(hx - 200, H); g.quadraticCurveTo(hx - 180, hy + 200, hx, hy + 180); g.quadraticCurveTo(hx + 180, hy + 200, hx + 200, H); g.closePath(); g.fill();
  });
}
// his line in red paint, dripping: no panel, straight on the wall
function paintTex(text) {
  return canvasTex(2048, 640, (g, W, H) => {
    const R = seeded(23), lines = text.split('\n'), f = (s) => `900 ${s}px Impact, "Arial Black", "Haettenschweiler", sans-serif`;
    // (no bigger than leaves the last line room for its drips: at 300px RED-HANDED sat on the bottom
    // edge and its drips were cut off)
    const size = fitLines(g, lines, f, W - 120, Math.min(300, Math.floor((H - 60 - 170) / (0.9 + (lines.length - 1) * 1.02))));
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    lines.forEach((l, i) => {
      const y = 60 + size * 0.9 + i * size * 1.02;
      g.fillStyle = '#e8102e'; g.fillText(l, W / 2, y);
      // the drips off the bottom of the letters
      const w = g.measureText(l).width;
      for (let k = 0; k < 26; k++) { const x = W / 2 - w / 2 + R() * w, len = 20 + R() * R() * 150, dw = 6 + R() * 12; g.fillRect(x, y - 12, dw, len); g.beginPath(); g.arc(x + dw / 2, y - 12 + len, dw * 0.75, 0, Math.PI * 2); g.fill(); }
    });
  });
}
// his line in lipstick on the glass, a kiss under it
function lipWriteTex(text) {
  return canvasTex(1536, 640, (g, W, H) => {
    const lines = text.split('\n'), f = (s) => `italic 700 ${s}px "Segoe Script", "Bradley Hand", "Snell Roundhand", "Brush Script MT", "Apple Chancery", Georgia, serif`;
    const size = fitLines(g, lines, f, W - 160, 150);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#d4102c';
    g.save(); g.translate(W / 2, H / 2); g.rotate(-0.06); g.translate(-W / 2, -H / 2);
    lines.forEach((l, i) => g.fillText(l, W / 2, 40 + size + i * size * 1.15));
    g.restore();
    g.save(); g.translate(W - 230, H - 120); g.rotate(-0.25); g.fillStyle = 'rgba(200,12,40,0.9)';
    g.beginPath(); g.moveTo(-110, 0); g.bezierCurveTo(-64, -54, -18, -36, 0, -20); g.bezierCurveTo(18, -36, 64, -54, 110, 0); g.bezierCurveTo(56, -6, -56, -6, -110, 0); g.fill();
    g.beginPath(); g.moveTo(-110, 6); g.bezierCurveTo(-56, 12, 56, 12, 110, 6); g.bezierCurveTo(64, 74, -64, 74, -110, 6); g.fill();
    g.restore();
  });
}

// a frame round a board and the legs it stands on (legs reach the floor: drawn per frame)
function standFrame(w, h) {
  const parts = [], gold = rgb(0xc8a050), wood = rgb(0x3a2212);
  for (const [bw, bh, x, y] of [[w + 1.2, 0.6, 0, h / 2 + 0.3], [w + 1.2, 0.6, 0, -h / 2 - 0.3], [0.6, h + 1.2, -w / 2 - 0.3, 0], [0.6, h + 1.2, w / 2 + 0.3, 0]]) parts.push(paint(box(bw, bh, 0.5, x, y, -0.05), gold));
  parts.push(paint(box(w, h, 0.3, 0, 0, -0.3), wood));
  return merge(parts);
}
const LEG = (() => { const g = cyl(0.22, 0.26, 1, 8, 0, -0.5, 0); return paint(g, rgb(0xc8a050)); })();

export class PpgBoards {
  constructor(scene, S, list) {
    this.S = S; prepare(S.course, S.plan);
    this.items = [];
    const frameM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.5 });
    frameM.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.25;'); };
    for (const b of list || []) {
      const kind = b.kind;
      let tex, w, h, decal = false;
      if (kind === 'dress') { tex = dressTex(b.text); w = b.w ?? 12; h = w * 900 / 1024; }
      else if (kind === 'cork') { tex = corkTex(); w = b.w ?? 18; h = w * 640 / 1024; }
      else if (kind === 'chart') { tex = chartTex(); w = b.w ?? 13; h = w * 900 / 640; }
      else if (kind === 'paint') { tex = paintTex(b.text); w = b.w ?? 64; h = w * 640 / 2048; decal = true; }
      else if (kind === 'lips') { tex = lipWriteTex(b.text); w = b.w ?? 34; h = w * 640 / 1536; decal = true; }
      else continue;
      const mat = decal
        ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color(1, 1, 1).multiplyScalar(b.k ?? 1.0), polygonOffset: true, polygonOffsetFactor: -2 })
        : (() => { const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }); m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + (b.k ?? 0.5).toFixed(2) + ';'); }; return m; })();
      const g = new THREE.Group(); g.visible = false; scene.add(g);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); face.frustumCulled = false; g.add(face);
      let legs = null;
      if (!decal) {
        g.add(new THREE.Mesh(standFrame(w, h), frameM));
        legs = [-1, 1].map((sd) => { const l = new THREE.Mesh(LEG, frameM); l.position.set(sd * w * 0.36, -h / 2 - 0.6, -0.3); g.add(l); return l; });
      }
      for (const o of g.children) o.frustumCulled = false;
      this.items.push({ ...b, t: b.t, g, w, h, legs, decal });
    }
    this._p = new THREE.Vector3();
  }
  update(S) {
    const T = S.rider.t, c = S.course;
    for (const it of this.items) {
      const on = T > it.t - (it.ahead ?? 40) && T < it.t + 1.5;
      it.g.visible = on;
      if (!on) continue;
      const yaw = c.sample(it.t).yaw;
      S.track.ground(it.t, it.x ?? 0, this._p);
      if (it.wall !== undefined) {
        // on a room's end wall, facing back down the room, up above its door
        it.g.position.set(this._p.x, floorAt(c, it.t) + it.wall, this._p.z);
        it.g.rotation.set(0, yaw + Math.PI, 0);
        it.g.translateZ(it.z ?? 0.5);
      } else {
        const y = c.sample(it.t).y + (it.lift ?? 4);
        it.g.position.set(this._p.x, y, this._p.z);
        const turn = it.x > 0 ? -(it.turn ?? 0.5) : it.x < 0 ? (it.turn ?? 0.5) : 0;
        it.g.rotation.set(0, yaw + Math.PI + turn, 0);
        if (it.z) it.g.translateZ(it.z);
        if (it.legs) { const len = Math.max(0.5, y - it.h / 2 - 0.6 - floorAt(c, it.t)); for (const l of it.legs) l.scale.set(1, len, 1); }
      }
    }
  }
}

// ---------- the press: flashbulbs all down the room in a chorus ----------
// Every eighth note a few go off somewhere ahead, out in the gallery either side: a star of light
// that's gone in a fifth of a second, a halo round it and a splash of it on the floor. Where they
// go is fixed by the note, so nothing jitters.
const STAR_VS = `attribute vec2 aK; varying vec2 vUv; varying float vA;
void main(){ vUv = uv; vA = aK.x; vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float s = length(instanceMatrix[0].xyz);
  float r = aK.y; vec2 p = vec2(position.x * cos(r) - position.y * sin(r), position.x * sin(r) + position.y * cos(r));
  c.xy += p * s; gl_Position = projectionMatrix * c; }`;
const STAR_FS = `varying vec2 vUv; varying float vA;
void main(){ vec2 q = abs(vUv - 0.5) * 2.0; float d = length(q);
  float star = exp(-q.x * 34.0) * exp(-q.y * 2.4) + exp(-q.y * 34.0) * exp(-q.x * 2.4);
  float a = (star * 0.9 + exp(-d * d * 26.0) * 1.3) * vA; a = (a == a) ? clamp(a, 0.0, 6.0) : 0.0;
  gl_FragColor = vec4(vec3(1.0, 0.97, 0.93) * a, 1.0); }`;
export class PpgPress {
  constructor(scene, S, cfg = {}) {
    this.cfg = cfg; this.N = 72;
    const g = new THREE.PlaneGeometry(1, 1);
    this.aK = new THREE.InstancedBufferAttribute(new Float32Array(this.N * 2), 2); this.aK.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aK', this.aK);
    this.mesh = new THREE.InstancedMesh(g, new THREE.ShaderMaterial({ vertexShader: STAR_VS, fragmentShader: STAR_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), this.N);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false; this.mesh.count = 0;
    scene.add(this.mesh);
    this.list = []; this._m = new THREE.Matrix4(); this._p = new THREE.Vector3();
  }
  on(S, rt) {
    const sec = S.course.sectionAt(rt);
    if (sec.kind === 'chorus' || sec.kind === 'final') return sec.kind === 'final' ? 2 : 1;
    return (this.cfg.extra || []).some(([a, b]) => rt > a && rt < b) ? 2 : 0;
  }
  update(S) {
    const c = S.course, rt = S.rider.t;
    // outside, from the doors on, it's the photographers on the risers going off
    const snaps = this.cfg.outFrom !== undefined && rt > this.cfg.outFrom - 3 && S.town && S.town.ppgSnappers;
    const lvl = snaps ? 3 : S.track ? this.on(S, rt) : 0;
    this.list.length = 0;
    let n = 0;
    if (lvl) {
      const bp = c.beatAt(rt), n8 = Math.floor(bp * 2), per = lvl === 3 ? 10 : lvl === 2 ? 8 : 5, life = 0.2;
      const near = snaps ? S.town.ppgSnappers.filter((q) => q.t > rt - 0.3 && q.t < rt + 4.5) : null;
      for (let k = n8 - 1; k <= n8; k++) {
        const ts = c.timeOfBeat(k / 2), age = rt - ts;
        if (age < 0 || age > life) continue;
        const R = seeded(9001 + k * 13);
        for (let j = 0; j < per && n < this.N; j++) {
          let p, fy, size;
          if (near) {
            if (!near.length) break;
            const q = near[Math.floor(R() * near.length)];
            p = S.track.ground(q.t, q.x, this._p); p.y = q.y; fy = groundAt(c, q.t, q.x); size = 6 + R() * 4;
          } else {
            const ta = ts + 0.3 + R() * 2.3, side = R() < 0.5 ? -1 : 1, x = side * ((this.cfg.x ?? 12) + R() * (this.cfg.spread ?? 24));
            p = S.track.ground(ta, x, this._p); fy = floorAt(c, ta);
            p.y = Math.max(fy + 1.5, c.sample(ta).y + 1.5 + R() * 13);   // above the road's edge, or it hides them
            size = 10 + R() * 7;
          }
          const kk = 1 - age / life, k2 = kk * kk;
          this._m.makeScale(size, size, size); this._m.setPosition(p);
          this.mesh.setMatrixAt(n, this._m); this.aK.array[n * 2] = 4.5 * k2; this.aK.array[n * 2 + 1] = R() * 0.8;
          this.list.push([p.x, p.y, p.z, fy, k2, size]);
          n++;
        }
      }
    }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true; this.aK.needsUpdate = true;
  }
  // their halo, and the light they throw on the floor (drawn through the scenery's glows)
  draw(T) {
    for (const [x, y, z, fy, k, size] of this.list) { T.glow(x, y, z, size * 1.4, [0.92, 0.94, 1], 1.5 * k); T.pool(x, fy + 0.06, z, 34, [1, 0.98, 0.95], 0.55 * k); }
  }
}
