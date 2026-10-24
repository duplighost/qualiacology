// Rent Free: the set-pieces, one for a line wherever a line can be shown. Every name that
// reaches the scenery registry starts with rnt. Geometry and pictures are in rnt-geo.js.
//
// The chorus here is the house coming alive: on the hit every dust sheet comes off, the
// sheets go up as ghosts and waltz in pairs over the velvet furniture, which floats and bobs
// on the beat; when the chorus goes they float back down onto it.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { keyGeometry } from './feedback.js';
import {
  clamp, merge, paint, rgb, box, cyl, sph, beam, seeded, RU, litVC, tintVC, cellMat,
  portraitTexture, oldPicturesTexture, cameoTexture, polaroidTexture, futuresTexture, samplerTexture, SAMPLER_COLS, SAMPLER_ROWS,
  bannerTexture, leaseTexture, lipstickTexture,
  chairGeo, sofaGeo, clockGeo, ghostGeo, thoughtGeo, cameoGeo, barCartGeo, luggageGeo, lockBodyGeo, lockShackleGeo, doorLeafGeo,
  bannerGeo, balloonGeo, forgetGeo, dollhouseGeo, fireplaceGeo, flameGeo, candelabraGeo, bigMirrorFrameGeo, bigMirrorGlassGeo, shardGeo,
  bustGeo, standLampGeo, shadeGeo, windowGeo, moonGlassGeo, porchGeo, lanternGeo, topiaryGeo,
} from './rnt-geo.js';

const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const lifts = (k) => k === 'chorus' || k === 'final';
const easeBack = (u) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2; };
// scratch objects kept on the scenery
const v3 = (S, k) => S['_rntV' + k] || (S['_rntV' + k] = new THREE.Vector3());
const qOf = (S, k, x, y, z, order = 'YXZ') => { const e = S['_rntE' + k] || (S['_rntE' + k] = new THREE.Euler()); e.set(x, y, z, order); return (S['_rntQ' + k] || (S['_rntQ' + k] = new THREE.Quaternion())).setFromEuler(e); };
const sc3 = (S, a, b, c) => (S._rntS || (S._rntS = new THREE.Vector3())).set(a, b ?? a, c ?? a);
// make sure a part's layers exist from the scenery's first pass, even the ones it draws only now and then
const touch = (S, ...ks) => { for (const k of ks) void S.layers[k]; };
// a point on the road (the pre-pass has no track yet)
const along = (S, t, x, out) => (S.track ? S.track.ground(t, x, out) : out.set(0, -500, 0));
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const ribbonY = (S, t) => S.course.sample(t).y;
// the world yaw that turns a model's +z toward world direction (dx, dz)
const yawTo = (dx, dz) => Math.atan2(dx, dz);
// a panel facing the rider coming up the road, turned a little toward the road
function facing(S, it, turn = 0.45) { const h = S.course.sample(it.t).yaw; return qOf(S, 'face', 0, h + Math.PI + (it.x > 0 ? -turn : turn), 0); }
const T_ = (S) => S.tNow ?? -1e9;

// ---------- the sheets: on the furniture, up as ghosts, or waltzing ----------
export function sheetState(S) {
  const T = S.tNow ?? 0;
  const st = S._rntSS || (S._rntSS = { t: NaN, up: 0, dance: 0, high: 0 });
  if (st.t === T) return st;
  st.t = T;
  const secs = S.course.sections;
  let i = secs.length - 1; while (i > 0 && T < secs[i].ta) i--;
  const sec = secs[i], prev = secs[i - 1];
  let dance = 0;
  if (lifts(sec.kind)) dance = prev && lifts(prev.kind) ? 1 : smooth(sec.ta - 0.05, sec.ta + 0.45, T);
  else if (prev && lifts(prev.kind)) dance = 1 - smooth(sec.ta, sec.ta + 1.4, T);
  let hover = 0;
  for (const [a, b] of S.plan.rntHover || []) hover = Math.max(hover, smooth(a, a + 1.8, T) * (1 - smooth(b, b + 1.4, T)));
  let high = 0;
  for (const [a, b] of S.plan.rntHigh || []) high = Math.max(high, smooth(a, a + 0.9, T) * (1 - smooth(b - 0.3, b + 1.0, T)));
  st.dance = dance; st.up = Math.max(dance, hover); st.high = high;
  return st;
}

// ---------- materials ----------
function ghostMat() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRTime = RU.time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aPhase; uniform float uRTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float hk = clamp(1.0 - position.y / 3.4, 0.0, 1.0);
        transformed.x += sin(uRTime * 5.2 + aPhase + position.z * 0.9) * 0.42 * hk;
        transformed.z += cos(uRTime * 4.4 + aPhase + position.x * 0.9) * 0.42 * hk;
        transformed.y += sin(uRTime * 6.1 + aPhase * 1.7 + position.x * 1.3) * 0.22 * hk;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.62;');
  };
  m.customProgramCacheKey = () => 'rntGhostMat';
  return m;
}
const BRIGHT = (M, key, hex, k) => M[key] || (M[key] = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), vertexColors: true }));
const LIT = (M, key, k, opts) => M[key] || (M[key] = litVC(k, opts));
const TINT = (M, key, k, g, opts) => M[key] || (M[key] = tintVC(k, g, opts));
// the board texts, set by the boards kit before its layer is made (one song at a time)
let BOARDS = [];
function canvasPlane(w = 12, h = 15, y = 18.5, z = 0.25) { const g = new THREE.PlaneGeometry(w, h); g.translate(0, y, z); return g; }
function samplerFrameGeo(w, h, wires) {
  const parts = [], gold = rgb(0xd0a850), dark = rgb(0x8a6a28);
  for (const [bw, bh, x, y] of [[w + 2.4, 1.2, 0, h / 2 + 0.6], [w + 2.4, 1.2, 0, -h / 2 - 0.6], [1.2, h + 2.4, -w / 2 - 0.6, 0], [1.2, h + 2.4, w / 2 + 0.6, 0]]) parts.push(paint(box(bw, bh, 1.0, x, y, 0.1), gold));
  for (const [bw, bh, x, y] of [[w + 0.4, 0.3, 0, h / 2 + 0.05], [w + 0.4, 0.3, 0, -h / 2 - 0.05], [0.3, h + 0.4, -w / 2 - 0.05, 0], [0.3, h + 0.4, w / 2 + 0.05, 0]]) parts.push(paint(box(bw, bh, 0.6, x, y, 0.45), dark));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) parts.push(paint(sph(0.9, 1, 1, 0.5, sx * (w / 2 + 0.6), sy * (h / 2 + 0.6), 0.6, 8, 6), gold));
  parts.push(paint(sph(1.4, 1.6, 1, 0.5, 0, h / 2 + 1.6, 0.4, 10, 8), gold));
  parts.push(paint(box(w * 0.4, 0.5, 0.7, 0, h / 2 + 2.6, 1.4), gold));
  parts.push(paint(box(0.25, 0.25, 1.4, 0, h / 2 + 2.6, 0.7), gold));
  if (wires) for (const sx of [-1, 1]) parts.push(paint(beam(new THREE.Vector3(sx * w * 0.42, h / 2 + 0.9, 0), new THREE.Vector3(sx * w * 0.12, h / 2 + 40, 0), 0.1, 4), rgb(0x3a3024)));
  return merge(parts);
}
function samplerFaceGeo(w, h) { const g = new THREE.PlaneGeometry(w, h); g.translate(0, 0, 0.42); return g; }
// an easel for a board standing on the floor: three legs, a ledge
function easelGeo() {
  const parts = [], wood = rgb(0x3a1e10), gold = rgb(0xc8a050);
  for (const [x, rz, rx] of [[-7, 0.08, 0.1], [7, -0.08, 0.1], [0, 0, -0.3]]) { const l = box(0.7, 30, 0.7, 0, 15, 0); l.rotateZ(rz); l.rotateX(rx); l.translate(x, 0, rx < 0 ? -4 : 0.8); parts.push(paint(l, wood)); }
  parts.push(paint(box(26, 1, 2, 0, 13.4, 1.6), gold));
  return merge(parts);
}
function chainGeo() { const g = new THREE.CylinderGeometry(0.22, 0.22, 1, 6); g.translate(0, 0.5, 0); return paint(g, rgb(0x8a6a30)); }
// a heart, for the doorway back to his heart: a tube along it
function heartTubeGeo(size) {
  const pts = [];
  for (let i = 0; i <= 96; i++) { const t = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(16 * Math.sin(t) ** 3 / 17 * size, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 * size, 0)); }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  return paint(new THREE.TubeGeometry(curve, 160, 0.55, 8, true), [1, 1, 1]);
}
export function heartPoint(t, size, out) { out.set(16 * Math.sin(t) ** 3 / 17 * size, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 * size, 0); return out; }
function moonTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  const sk = g.createLinearGradient(0, 0, 0, 256); sk.addColorStop(0, '#1a2a5a'); sk.addColorStop(1, '#4a5a9a'); g.fillStyle = sk; g.fillRect(0, 0, 128, 256);
  for (let k = 0; k < 40; k++) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.6) + ')'; g.fillRect(Math.random() * 128, Math.random() * 200, 1.5, 1.5); }
  g.fillStyle = '#fff4dc'; g.beginPath(); g.arc(78, 70, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255, 244, 220, 0.25)'; g.beginPath(); g.arc(78, 70, 34, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(20, 20, 40, 0.8)'; g.lineWidth = 4; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 256); g.moveTo(0, 128); g.lineTo(128, 128); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

extend({
  layers: {
    rntChair: (M) => [chairGeo(), LIT(M, 'rntVelvetM', 0.22, { roughness: 0.85, metalness: 0.05 }), 90, {}],
    rntSofa: (M) => [sofaGeo(), LIT(M, 'rntVelvetM', 0.22, { roughness: 0.85, metalness: 0.05 }), 60, {}],
    rntClock: (M) => [clockGeo(), LIT(M, 'rntVelvetM', 0.22, { roughness: 0.85, metalness: 0.05 }), 30, {}],
    rntGhost: (M) => [ghostGeo(), M.rntGhostM || (M.rntGhostM = ghostMat()), 200, { aPhase: 1 }],
    rntThought: (M) => [thoughtGeo(), LIT(M, 'rntCloudM', 0.55, { roughness: 0.95, metalness: 0 }), 70, {}],
    rntCameo: (M) => [cameoGeo(3.0, 2.3), M.rntCameoM || (M.rntCameoM = cellMat(cameoTexture(), 2, 2, 0.75, { alphaTest: 0.5 })), 90, { aCell: 2 }],
    rntBarCart: (M) => [barCartGeo(), LIT(M, 'rntShinyM', 0.32, { roughness: 0.25, metalness: 0.5 }), 4, {}],
    rntLuggage: (M) => [luggageGeo(), LIT(M, 'rntMatteM', 0.25, { roughness: 0.75, metalness: 0.05 }), 6, {}],
    rntLockBody: (M) => [lockBodyGeo(), LIT(M, 'rntShinyM', 0.32, { roughness: 0.25, metalness: 0.5 }), 3, {}],
    rntLockShackle: (M) => [lockShackleGeo(), LIT(M, 'rntShinyM', 0.32, { roughness: 0.25, metalness: 0.5 }), 3, {}],
    rntDoorA: (M) => [doorLeafGeo(11.5, 30, false), LIT(M, 'rntMatteM', 0.25, { roughness: 0.75, metalness: 0.05 }), 12, {}],
    rntDoorB: (M) => [doorLeafGeo(11.5, 30, true), LIT(M, 'rntMatteM', 0.25, { roughness: 0.75, metalness: 0.05 }), 12, {}],
    rntBanner: (M) => [bannerGeo(40), M.rntBannerM || (M.rntBannerM = Object.assign(litVC(0.6, { map: bannerTexture(), side: THREE.DoubleSide, roughness: 0.8 }))), 6, {}],
    rntBalloon: (M) => [balloonGeo(), TINT(M, 'rntBalloonM', 0.42, 0.5, { roughness: 0.25, metalness: 0.15 }), 140, { aTint: 3, aGlint: 1 }],
    rntForget: (M) => [forgetGeo(), LIT(M, 'rntFlowerM', 0.7, { roughness: 0.8, metalness: 0 }), 260, {}],
    rntDollhouse: (M) => [dollhouseGeo(), BRIGHT(M, 'rntLineM', 0xeef4ff, 1.5), 2, {}],
    rntFireplace: (M) => [fireplaceGeo(), LIT(M, 'rntMatteM', 0.25, { roughness: 0.75, metalness: 0.05 }), 2, {}],
    rntFlame: (M) => [flameGeo(), BRIGHT(M, 'rntFlameM', 0xffffff, 2.2), 4, {}],
    rntCandles: (M) => [candelabraGeo(), LIT(M, 'rntIronM', 0.2, { roughness: 0.5, metalness: 0.4 }), 90, {}],
    rntMirrorFrame: (M) => [bigMirrorFrameGeo(15, 20), LIT(M, 'rntGiltM', 0.38, { roughness: 0.3, metalness: 0.6 }), 2, {}],
    rntMirrorGlass: (M) => [bigMirrorGlassGeo(15, 20), M.rntMirrorM || (M.rntMirrorM = cellMat(portraitTexture(), 2, 2, 0.95, { color: 0xc8d0e0, roughness: 0.15, metalness: 0.3 })), 2, { aCell: 2 }],
    rntShard: (M) => [shardGeo(), M.rntShardM || (M.rntShardM = litVC(0.42, { roughness: 0.06, metalness: 0.9, side: THREE.DoubleSide })), 160, {}],
    rntBust: (M) => [bustGeo(), LIT(M, 'rntMarbleM', 0.42, { roughness: 0.45, metalness: 0.05 }), 4, {}],
    rntSampler: (M) => [samplerFaceGeo(22, 8.6), M.rntSamplerM || (M.rntSamplerM = cellMat(samplerTexture(BOARDS), SAMPLER_COLS, SAMPLER_ROWS, 0.62)), 24, { aCell: 2 }],
    rntSamplerFrame: (M) => [samplerFrameGeo(22, 8.6, false), LIT(M, 'rntGiltM', 0.38, { roughness: 0.3, metalness: 0.6 }), 24, {}],
    rntSamplerWires: (M) => [samplerFrameGeo(22, 8.6, true), LIT(M, 'rntGiltM', 0.38, { roughness: 0.3, metalness: 0.6 }), 24, {}],
    rntEasel: (M) => [easelGeo(), LIT(M, 'rntMatteM', 0.25, { roughness: 0.75, metalness: 0.05 }), 24, {}],
    rntOld: (M) => [canvasPlane(), M.rntOldM || (M.rntOldM = cellMat(oldPicturesTexture(), 2, 2, 0.7)), 6, { aCell: 2 }],
    rntFuture: (M) => [canvasPlane(), M.rntFutureM || (M.rntFutureM = cellMat(futuresTexture(), 2, 2, 0.7)), 10, { aCell: 2 }],
    rntPolaroid: (M) => [(() => { const g = new THREE.PlaneGeometry(4.4, 5.15); return g; })(), M.rntPolaroidM || (M.rntPolaroidM = cellMat(polaroidTexture(), 4, 1, 0.55)), 120, { aCell: 2 }],
    rntLease: (M) => [canvasPlane(16, 21.3, 0, 0), M.rntLeaseM || (M.rntLeaseM = cellMat(leaseTexture(), 1, 1, 0.6)), 2, { aCell: 2 }],
    rntLeaseRods: (M) => [merge([paint(cyl(0.7, 0.7, 18, 12, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 10.9, 0), rgb(0x5a3018)), paint(cyl(0.7, 0.7, 18, 12, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, -10.9, 0), rgb(0x5a3018)), paint(beam(new THREE.Vector3(-7, 11, 0), new THREE.Vector3(-2, 40, 0), 0.1), rgb(0x3a3024)), paint(beam(new THREE.Vector3(7, 11, 0), new THREE.Vector3(2, 40, 0), 0.1), rgb(0x3a3024))]), LIT(M, 'rntMatteM', 0.25, { roughness: 0.75, metalness: 0.05 }), 2, {}],
    rntMine: (M) => [canvasPlane(20, 10, 0, 0), M.rntMineM || (M.rntMineM = cellMat(lipstickTexture(), 2, 2, 1.1, { alphaTest: 0.35 })), 24, { aCell: 2 }],
    rntKey: (M) => [(() => { const g = keyGeometry(); g.scale(2.6, 2.6, 2.6); return g; })(), TINT(M, 'rntKeyM', 0.3, 1.6, { roughness: 0.3, metalness: 0.65 }), 900, { aTint: 3, aGlint: 1 }],
    rntChain: (M) => [chainGeo(), LIT(M, 'rntShinyM', 0.32, { roughness: 0.25, metalness: 0.5 }), 80, {}],
    rntHeart: (M) => [heartTubeGeo(20), BRIGHT(M, 'rntNeonM', 0xff2a4a, 2.4), 2, {}],
    rntStandLamp: (M) => [standLampGeo(), LIT(M, 'rntMatteM', 0.25, { roughness: 0.75, metalness: 0.05 }), 6, {}],
    rntShade: (M) => [shadeGeo(), M.rntShadeM || (M.rntShadeM = new THREE.MeshStandardMaterial({ color: 0xf4e0c0, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffb060, emissiveIntensity: 1.25 })), 6, {}],
    rntWindow: (M) => [windowGeo(), LIT(M, 'rntMatteM', 0.25, { roughness: 0.75, metalness: 0.05 }), 12, {}],
    rntMoonGlass: (M) => [moonGlassGeo(), M.rntMoonM || (M.rntMoonM = new THREE.MeshBasicMaterial({ map: moonTexture(), color: new THREE.Color(1.15, 1.15, 1.25) })), 12, {}],
    rntPorch: (M) => [porchGeo(), LIT(M, 'rntStoneM', 0.3, { roughness: 0.85, metalness: 0, side: THREE.DoubleSide }), 2, {}],
    rntLantern: (M) => [lanternGeo(), LIT(M, 'rntIronM', 0.2, { roughness: 0.5, metalness: 0.4 }), 30, {}],
    rntTopiary: (M) => [topiaryGeo(), LIT(M, 'rntHedgeM', 0.22, { roughness: 0.9, metalness: 0, flatShading: true }), 30, {}],
  },

  parts: {
    // a piece of furniture: under its dust sheet, or uncovered and floating while its sheet waltzes
    rntFurniture(S, it, p, q, yaw) {
      touch(S, 'rntChair', 'rntSofa', 'rntClock', 'rntGhost', 'ghostChair', 'ghostSofa');
      const st = sheetState(S), s = it.s ?? 1, m = S._m, kind = it.kind;
      if (st.up <= 0.002) {
        m.compose(p, q, sc3(S, s));
        if (kind === 2) S.layers.rntClock.add(m); else S.layers[kind === 1 ? 'ghostSofa' : 'ghostChair'].add(m);
        return;
      }
      const T = T_(S), c = S.course, bp = c.beatAt(T);
      const float = st.dance * (1.4 + 1.1 * Math.sin((bp / 2 + it.seed * 4) * Math.PI)) + st.high * (7 + 5 * it.seed);
      const fp = v3(S, 'fp').copy(p); fp.y += float;
      const tilt = (st.dance * 0.07 + st.high * 0.18) * Math.sin(bp * Math.PI / 2 + it.seed * 6);
      m.compose(fp, qOf(S, 'fq', tilt, yaw + st.high * Math.sin(T * 0.9 + it.seed * 5) * 0.7, tilt * 0.6), sc3(S, s));
      S.layers[['rntChair', 'rntSofa', 'rntClock'][kind]].add(m);
      if (kind === 2) return;
      // the sheet, up in the air as a ghost; in a chorus a partner comes and they waltz
      const top = (kind === 1 ? 11.5 : 13.5) * s + float, hov = (it.hov ?? 17) * s;
      const e = st.up * st.up * (3 - 2 * st.up);
      const cy = top + (hov - top) * e;
      const r = 3.6 * st.dance * s, th = (bp / 8) * Math.PI * 2 + it.seed * 6.28;
      const hop = st.dance * 1.1 * (S.beat || 0);
      const n = st.dance > 0.02 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const a = th + k * Math.PI, lx = Math.cos(a) * r, lz = Math.sin(a) * r;
        const gp = local(p, yaw, lx, cy + hop + Math.sin(T * 1.7 + it.seed * 9 + k) * 0.7 * e, lz, v3(S, 'g'));
        let gy = yaw;
        if (st.dance > 0.02) { const c0 = Math.cos(yaw), s0 = Math.sin(yaw); const wx = -lx * c0 - lz * s0, wz = lx * s0 - lz * c0; gy = yawTo(wx, wz) + 0.35; }
        gy += e * (1 - e) * 5;
        const sk = s * (k === 0 ? 1 : st.dance);
        m.compose(gp, qOf(S, 'gq', 0.12 * st.dance * Math.sin(a), gy, 0.1 * st.dance * Math.cos(a)), sc3(S, sk));
        S.layers.rntGhost.add(m, { aPhase: it.seed * 10 + k * 3 });
        glowAt(S, gp.x, gp.y + 5.5 * sk, gp.z, 11 * sk, [0.75, 0.82, 1], 0.16 * e);
      }
    },
    // the portrait swap: the old picture falls off its wires, hers comes down on them
    rntSwap(S, it, p, q, yaw) {
      touch(S, 'canvas0', 'canvas1', 'canvas2', 'canvas3', 'gilt', 'plaque', 'hangWire', 'rntOld');
      const T = T_(S), m = S._m, s = it.s ?? 1;
      const u = clamp((T - it.at) / 0.85, 0, 1), after = T - it.at - 0.85;
      if (u < 1) {
        const fall = 0.5 * 75 * (u * 0.85) ** 2, rot = u * u * 1.6;
        const op = v3(S, 'op').copy(p); op.y -= fall;
        const oq = qOf(S, 'oq', -rot * 0.7, yaw, rot * 0.35);
        m.compose(op, oq, sc3(S, s));
        S.layers.rntOld.add(m, { aCell: [it.old % 2, Math.floor(it.old / 2)] });
        S.layers.gilt.add(m, { aTint: [0.9, 0.7, 0.36] });
        if (u <= 0) S.layers.hangWire.add(m, { aTint: [0.25, 0.2, 0.14] });
      }
      if (u > 0) {
        const d = (1 - easeBack(u)) * 36 * s;
        const sw = after > 0 ? Math.sin(after * 4.2) * 0.13 * Math.exp(-after * 1.1) : 0;
        const hp = v3(S, 'hp').copy(p); hp.y += d;
        m.compose(hp, qOf(S, 'hq', sw, yaw, 0), sc3(S, s));
        S.layers['canvas' + (it.v % 4)].add(m);
        S.layers.gilt.add(m, { aTint: [1, 0.76, 0.36] });
        S.layers.hangWire.add(m, { aTint: [0.25, 0.2, 0.14] });
        if (u >= 1) { const w = local(p, yaw, 0, 28.0 * s, 1.6 * s, S._o); glowAt(S, w.x, w.y, w.z, 5 * s, [1, 0.85, 0.6], 0.7, S.beatLamps ? 4 : 0); }
      }
      m.compose(p, q, sc3(S, s));
      if (it.idx !== undefined) S.layers.plaque.add(m, { aIdx: it.idx, aWake: [0.85, 0] });
    },
    // a thought, going up: a cloud with her in it
    rntThought(S, it, p, q, yaw) {
      touch(S, 'rntThought', 'rntCameo');
      const T = T_(S), age = T - (it.t - it.lead);
      if (age < 0 || !S.track) return;
      const y = it.h + 2 + age * it.rise;
      if (y > it.h + 44) return;
      const pop = Math.min(1, age * 2.2), fade = 1 - smooth(it.h + 36, it.h + 44, y);
      const s = (it.s ?? 1) * pop * fade;
      if (s < 0.02) return;
      const tp = local(p, yaw, Math.sin(age * 1.6 + it.seed * 7) * 1.6, 0, Math.cos(age * 1.3 + it.seed * 5) * 1.2, v3(S, 'tp'));
      tp.y = y;
      const fq = facing(S, it, 0.5);
      S._m.compose(tp, fq, sc3(S, s));
      S.layers.rntThought.add(S._m);
      S.layers.rntCameo.add(S._m, { aCell: [it.k % 2, (it.k >> 1) % 2] });
    },
    rntBarCart(S, it, p, q) { touch(S, 'rntBarCart'); const s = it.s ?? 1; S._m.compose(p, q, sc3(S, s)); S.layers.rntBarCart.add(S._m); glowAt(S, p.x, p.y + 12 * s, p.z, 14 * s, [1, 0.8, 0.5], 0.35); },
    rntLuggage(S, it, p, q) { touch(S, 'rntLuggage'); const s = it.s ?? 1; S._m.compose(p, q, sc3(S, s)); S.layers.rntLuggage.add(S._m); },
    // the padlock over the road: the shackle springs on the word, the lock swings on its chain
    rntLock(S, it, p, q, yaw) {
      touch(S, 'rntLockBody', 'rntLockShackle', 'rntChain');
      const T = T_(S), s = it.s ?? 1, m = S._m;
      const u = clamp((T - it.pop) / 0.25, 0, 1), after = Math.max(0, T - it.pop);
      const sw = Math.sin(after * 5) * 0.2 * Math.exp(-after * 1.2) * (u > 0 ? 1 : 0);
      const lq = qOf(S, 'lq', sw, yaw, sw * 0.4);
      m.compose(p, lq, sc3(S, s));
      S.layers.rntLockBody.add(m);
      // the shackle: up out of the body and turned open
      const up = u * 3.2 * s;
      const sp = v3(S, 'sp').set(0, up, 0).applyQuaternion(lq).add(p);
      const sq = qOf(S, 'sq', sw, yaw + u * 1.6, sw * 0.4);
      m.compose(sp, sq, sc3(S, s)); S.layers.rntLockShackle.add(m);
      // the chain from the shackle to the ceiling
      const top = v3(S, 'ct').set(0, 7.6 * s + up, 0).applyQuaternion(lq).add(p);
      const L = Math.max(1, (it.ceil ?? p.y + 60) - top.y);
      m.compose(top, qOf(S, 'cq', 0, 0, 0), sc3(S, 1, L, 1)); S.layers.rntChain.add(m);
      glowAt(S, p.x, p.y + 1, p.z, 18 * s, [1, 0.8, 0.45], 0.35 + 0.6 * Math.exp(-after * 3) * (u > 0 ? 1 : 0));
    },
    // a door in a doorway: closed, knocking, and thrown open just before she gets to it
    rntDoors(S, it, p, q, yaw) {
      touch(S, 'rntDoorA', 'rntDoorB');
      const T = T_(S), m = S._m;
      const u = smooth(it.open, it.open + (it.swing ?? 0.42), T);
      let shake = 0;
      for (const k of it.knocks || []) { const d = T - k; if (d > 0 && d < 0.5) shake = Math.max(shake, Math.exp(-d * 9) * (0.6 + 0.4 * Math.sin(d * 70))); }
      const ang = u * 1.75 + shake * 0.05;
      const sx = it.hw / 11.5, sy = it.hh / 30;
      for (const side of [-1, 1]) {
        // hinged at the opening's edge (item-local +x is the road's -x): each leaf reaches in to
        // the middle and swings forward, away from her
        const hp = local(p, yaw, -side * it.hw, 0, 0, v3(S, 'dh'));
        const leafYaw = yaw - side * ang;
        m.compose(hp, qOf(S, 'dq', 0, leafYaw, 0), sc3(S, sx, sy, 1));
        S.layers[side > 0 ? 'rntDoorA' : 'rntDoorB'].add(m);
      }
      if (u > 0.05 && u < 1) glowAt(S, p.x, p.y + it.hh * 0.5, p.z, it.hw * 2.6 * u, [1, 0.86, 0.6], 0.5 * (1 - u));
      if (shake > 0.05) glowAt(S, p.x, p.y + 1, p.z, it.hw * 2.2, [1, 0.8, 0.5], 0.6 * shake);
    },
    // a WELCOME HOME banner across the room, swinging on the beat
    rntBanner(S, it, p, q, yaw) {
      touch(S, 'rntBanner');
      const T = T_(S), bp = S.course.beatAt(T), sw = Math.sin(bp * Math.PI) * 0.06;
      S._m.compose(p, qOf(S, 'bq', sw, yaw, 0), sc3(S, it.span / 40, 1, 1));
      S.layers.rntBanner.add(S._m);
    },
    // balloons let go: up from both sides, bobbing on the beat
    rntBalloons(S, it, p, q, yaw) {
      touch(S, 'rntBalloon');
      const T = T_(S); if (!S.track) return;
      const cols = [[1, 0.78, 0.25], [0.95, 0.35, 0.55], [0.62, 0.38, 0.95], [1, 0.95, 0.88]];
      const R = seeded(it.seed), age = T - it.from;
      if (age < 0) return;
      for (let k = 0; k < it.n; k++) {
        const t = it.t0 + R() * (it.t1 - it.t0), side = R() < 0.5 ? -1 : 1, x = side * (14 + R() * 26), y0 = R() * 6, sp = 3 + R() * 2.5, ph = R() * 6.28;
        const y = floorAt(S.course, t) + 2 + y0 + age * sp + 0.6 * (S.beat || 0);
        const bp = along(S, t, x + Math.sin(T * 1.1 + ph) * 1.2, v3(S, 'bp')); bp.y = y;
        S._m.compose(bp, qOf(S, 'blq', Math.sin(T * 1.4 + ph) * 0.12, ph, Math.cos(T * 1.2 + ph) * 0.12), sc3(S, 1.3));
        S.layers.rntBalloon.add(S._m, { aTint: cols[k % 4], aGlint: 0.5 + R() * 0.5 });
      }
    },
    // forget-me-nots, coming up on the beat once he sings forget
    rntForget(S, it, p, q, yaw) {
      touch(S, 'rntForget');
      const T = T_(S), g0 = Math.max(it.grow, it.t - 2.6);
      const g = smooth(g0, g0 + 0.5, T);
      if (g <= 0.01) return;
      const s = (it.s ?? 1) * g * (1 + 0.05 * (S.beat || 0));
      // on a wall the clump's top turns to face the road
      S._m.compose(p, it.wall ? qOf(S, 'fw', 0, yaw, Math.PI / 2 * (it.x > 0 ? -1 : 1), 'XYZ') : q, sc3(S, s));
      S.layers.rntForget.add(S._m);
    },
    // the house he drew to keep her out, turning in the air, and her already in its window
    rntDollhouse(S, it, p, q, yaw) {
      touch(S, 'rntDollhouse', 'rntCameo');
      const T = T_(S), s = it.s ?? 1, spin = it.spin ? (T - it.t) * 0.25 : 0;
      const dq = qOf(S, 'dhq', 0, yaw + spin, 0);
      S._m.compose(p, dq, sc3(S, s)); S.layers.rntDollhouse.add(S._m);
      if (T > it.her) {
        const k = smooth(it.her, it.her + 0.4, T);
        const wp = v3(S, 'wp').set(0, 9 * s, 5.3 * s).applyQuaternion(dq).add(p);
        S._m.compose(wp, dq, sc3(S, 0.42 * s * k)); S.layers.rntCameo.add(S._m, { aCell: [1, 0] });
        glowAt(S, wp.x, wp.y, wp.z, 6 * s, [1, 0.2, 0.25], 0.9 * k);
      }
      glowAt(S, p.x, p.y + 12 * s, p.z, 40 * s, [0.6, 0.75, 1], 0.12);
    },
    // the fire: marble, the flames moving, the light on the floor
    rntFireplace(S, it, p, q, yaw) {
      touch(S, 'rntFireplace', 'rntFlame', 'rntChair');
      const T = T_(S), s = it.s ?? 1, m = S._m;
      m.compose(p, q, sc3(S, s)); S.layers.rntFireplace.add(m);
      const fl = 0.85 + 0.12 * Math.sin(T * 13) + 0.08 * Math.sin(T * 23 + 1) + 0.1 * (S.beat || 0);
      const fp = local(p, yaw, 0, 2.2 * s, 0.6 * s, v3(S, 'ffp'));
      m.compose(fp, q, sc3(S, s * (0.9 + 0.1 * Math.sin(T * 9)), s * fl, s)); S.layers.rntFlame.add(m);
      glowAt(S, fp.x, fp.y + 3 * s, fp.z, 16 * s, [1, 0.55, 0.2], 1.1 * fl);
      poolAt(S, fp.x, p.y + 0.1, fp.z, 50 * s, [1, 0.5, 0.2], 0.7 * fl);
      for (const sx of [-1, 1]) { const w = local(p, yaw, sx * 7 * s, 20.6 * s, 0.6 * s, v3(S, 'fc')); glowAt(S, w.x, w.y, w.z, 2.4 * s, [1, 0.72, 0.36], 1.2); }
      // two armchairs drawn up to it, turned to each other a little
      for (const sx of [-1, 1]) { const cp = local(p, yaw, sx * 12 * s, 0, 14 * s, v3(S, 'fcp')); m.compose(cp, qOf(S, 'fcq', 0, yaw + Math.PI + sx * 0.5, 0), sc3(S, s * 0.85)); S.layers.rntChair.add(m); }
    },
    // a candelabrum on the floor: five flames; on "breath" they bend and nearly go
    rntCandles(S, it, p, q, yaw) {
      touch(S, 'rntCandles');
      const T = T_(S), s = it.s ?? 1;
      S._m.compose(p, q, sc3(S, s)); S.layers.rntCandles.add(S._m);
      let k = 1;
      for (const b of S.plan.rntBreath || []) { const d = T - b; if (d > -0.1 && d < 2.2) k = Math.min(k, 0.25 + 0.75 * smooth(0.2, 2.2, d)); }
      const fl = (0.85 + 0.15 * Math.sin(T * 12 + it.seed * 40)) * k;
      for (let j = -2; j <= 2; j++) { const w = local(p, yaw, j * 1.8 * s, (18.6 + (j % 2) * 0.6) * s, 0, S._o); glowAt(S, w.x - (1 - k) * 0.6, w.y, w.z, 2.4 * s, [1, 0.72, 0.36], 1.4 * fl); }
      glowAt(S, p.x, p.y + 18 * s, p.z, 14 * s, [1, 0.66, 0.3], 0.32 * fl);
      poolAt(S, p.x, p.y + 0.1, p.z, 22 * s, [1, 0.64, 0.3], 0.5 * fl);
    },
    // the mirror at the drop: her where you should be; it goes to pieces as you go through it
    rntMirror(S, it, p, q, yaw) {
      touch(S, 'rntMirrorFrame', 'rntMirrorGlass', 'rntShard');
      const T = T_(S), m = S._m, s = it.s ?? 1;
      const hit = it.t - 0.04;
      m.compose(p, q, sc3(S, s)); S.layers.rntMirrorFrame.add(m);
      if (T < hit) { S.layers.rntMirrorGlass.add(m, { aCell: [it.v % 2, (it.v >> 1) % 2] }); glowAt(S, p.x, p.y, p.z, 40 * s, [1, 0.85, 0.7], 0.18); return; }
      const age = T - hit; if (age > 3.5 || !S.track) return;
      const R = seeded(31), c0 = Math.cos(yaw), s0 = Math.sin(yaw), fwd = v3(S, 'mf').set(s0, 0, c0);
      for (let k = 0; k < 120; k++) {
        const a = R() * 6.28, r = Math.sqrt(R()), lx = Math.cos(a) * 15 * r * s, ly = Math.sin(a) * 20 * r * s;
        const out = 9 + R() * 14, fw = 16 + R() * 30;
        const sp = local(p, yaw, lx * (1 + age * 0.6) + Math.cos(a) * out * age, ly + Math.sin(a) * out * age - 11 * age * age, fw * age, v3(S, 'sp'));
        m.compose(sp, qOf(S, 'shq', age * (4 + R() * 6), a + age * 3, age * (3 + R() * 5)), sc3(S, (0.7 + R() * 1.3) * s));
        S.layers.rntShard.add(m);
      }
    },
    rntBust(S, it, p, q) { touch(S, 'rntBust'); const s = it.s ?? 1; S._m.compose(p, q, sc3(S, s)); S.layers.rntBust.add(S._m); glowAt(S, p.x, p.y + 24 * s, p.z, 16 * s, [1, 0.9, 0.75], 0.45); poolAt(S, p.x, p.y + 0.1, p.z, 26 * s, [1, 0.85, 0.65], 0.6); },
    // a board: his words stitched on linen, hung over the road on wires or on an easel by it
    rntBoard(S, it, p, q, yaw) {
      touch(S, 'rntSampler', 'rntSamplerFrame', 'rntSamplerWires', 'rntEasel');
      const T = T_(S), s = it.s ?? 1, m = S._m;
      const sw = it.hang ? Math.sin(T * 1.3 + it.seed * 5) * 0.03 : 0;
      const bq = it.hang ? qOf(S, 'bdq', sw, yaw, 0) : facing(S, it, it.turn ?? 0.45);
      const bp = v3(S, 'bdp').copy(p); if (!it.hang) bp.y += 18 * s;
      m.compose(bp, bq, sc3(S, s));
      S.layers.rntSampler.add(m, { aCell: [it.cell % SAMPLER_COLS, Math.floor(it.cell / SAMPLER_COLS)] });
      S.layers[it.hang ? 'rntSamplerWires' : 'rntSamplerFrame'].add(m);
      const lp = v3(S, 'blp').set(0, 4.9 * s, 2.2 * s).applyQuaternion(bq).add(bp);
      glowAt(S, lp.x, lp.y, lp.z, 9 * s, [1, 0.9, 0.7], 0.55, S.beatLamps ? 4 : 0);
      if (!it.hang) { m.compose(p, bq, sc3(S, s)); S.layers.rntEasel.add(m); }
    },
    // the futures he pictures, in frames, and she's in all of them
    rntFuture(S, it, p, q, yaw) {
      touch(S, 'rntFuture', 'gilt');
      const s = it.s ?? 1, fq = facing(S, it, 0.42);
      S._m.compose(p, fq, sc3(S, s));
      S.layers.rntFuture.add(S._m, { aCell: [it.k % 2, (it.k >> 1) % 2] });
      S.layers.gilt.add(S._m, { aTint: [1, 0.76, 0.36] });
      const w = local(p, new THREE.Euler().setFromQuaternion(fq, 'YXZ').y, 0, 28 * s, 1.6 * s, S._o);
      glowAt(S, w.x, w.y, w.z, 6 * s, [1, 0.86, 0.62], 0.7, S.beatLamps ? 4 : 0);
    },
    // the lease he never had her sign, hung over the road
    rntLease(S, it, p, q, yaw) {
      touch(S, 'rntLease', 'rntLeaseRods');
      const T = T_(S), sw = Math.sin(T * 1.1) * 0.05, s = it.s ?? 1;
      S._m.compose(p, qOf(S, 'lsq', sw, yaw, 0), sc3(S, s));
      S.layers.rntLease.add(S._m, { aCell: [0, 0] }); S.layers.rntLeaseRods.add(S._m);
      glowAt(S, p.x, p.y + 4, p.z, 26 * s, [1, 0.92, 0.75], 0.22);
    },
    // MINE, in her lipstick, on his walls
    rntMine(S, it, p, q) { touch(S, 'rntMine'); S._m.compose(p, q, sc3(S, it.s ?? 1)); S.layers.rntMine.add(S._m, { aCell: [it.k % 2, (it.k >> 1) % 2] }); },
    // a stretch of wall hung with keys: the copies (they glint on the beat)
    rntKeyWall(S, it, p, q, yaw) {
      touch(S, 'rntKey');
      const T = T_(S); if (!S.track) return;
      const c = S.course, m = S._m, rows = it.rows || [9, 14, 19, 24, 29];
      const a = Math.max(it.from, T - 0.6), b = Math.min(it.to, T + 5);
      const step = it.every ?? 0.1;
      for (let t = Math.ceil(a / step) * step; t < b; t += step) {
        const kt = Math.round(t / step), fy = floorAt(c, t), y0 = c.sample(t).yaw + SIDE(it.side);
        const wp = along(S, t, it.side * (it.W - 0.7), v3(S, 'kw'));
        for (let r = 0; r < rows.length; r++) {
          const h = (kt * 7 + r * 13) % 17;
          const kp = v3(S, 'kp').set(wp.x, fy + rows[r] + (h % 3) * 0.5, wp.z);
          m.compose(kp, qOf(S, 'kq', 0, y0 + 0.2 * Math.sin(kt + r), Math.sin(T * 2.1 + kt * 0.7 + r) * 0.12), sc3(S, 1));
          S.layers.rntKey.add(m, { aTint: h % 4 ? [1, 0.86, 0.52] : [0.95, 0.95, 1], aGlint: (h / 17) });
        }
      }
    },
    // keys coming down out of the ceiling: copies, all of them
    rntKeyRain(S, it, p, q, yaw) {
      touch(S, 'rntKey');
      const T = T_(S); if (!S.track || T < it.from - 3) return;
      const R = seeded(53), c = S.course, m = S._m;
      for (let k = 0; k < it.n; k++) {
        const at = it.from + R() * (it.to - it.from), x = (R() - 0.5) * 2 * it.spread, start = at - 2.2 - R() * 0.6, ph = R() * 6.28;
        const age = T - start; if (age < 0 || age > 4) continue;
        const top = floorAt(c, at) + 40, y = top - 0.5 * 14 * age * age;
        if (y < floorAt(c, at)) continue;
        const kp = along(S, at, x + Math.sin(age * 2 + ph) * 1.5, v3(S, 'krp')); kp.y = y;
        m.compose(kp, qOf(S, 'krq', age * 3 + ph, ph + age * 2, age * 2.4), sc3(S, 1.1));
        S.layers.rntKey.add(m, { aTint: [1, 0.86, 0.52], aGlint: 1 });
      }
    },
    // the flashbacks: photographs of the two of them coming down, turning over
    rntPolaroids(S, it, p, q, yaw) {
      touch(S, 'rntPolaroid');
      const T = T_(S); if (!S.track || T < it.from - 3) return;
      const R = seeded(77), c = S.course, m = S._m;
      for (let k = 0; k < it.n; k++) {
        const at = it.from + R() * (it.to - it.from), side = R() < 0.5 ? -1 : 1, x = side * (6 + R() * it.spread), start = at - 2.8 - R() * 0.8, ph = R() * 6.28, cell = k % 4;
        const age = T - start; if (age < 0 || age > 5) continue;
        const top = floorAt(c, at) + 38, y = top - age * (5.5 + R() * 2);
        if (y < floorAt(c, at) + 1) continue;
        const pp = along(S, at, x + Math.sin(age * 1.8 + ph) * 2.4, v3(S, 'pp')); pp.y = y;
        m.compose(pp, qOf(S, 'pq', Math.sin(age * 2.2 + ph) * 0.9, ph + age * 1.4, Math.cos(age * 1.7 + ph) * 0.6), sc3(S, 1.5));
        S.layers.rntPolaroid.add(m, { aCell: [cell, 0] });
      }
    },
    // the light he leaves on: a big lamp, warm, moths round it
    rntLamp(S, it, p, q, yaw) {
      touch(S, 'rntStandLamp', 'rntShade');
      const T = T_(S), s = it.s ?? 1, m = S._m;
      m.compose(p, q, sc3(S, s)); S.layers.rntStandLamp.add(m); S.layers.rntShade.add(m);
      const lp = local(p, yaw, 0, 18.4 * s, 0, v3(S, 'lmp'));
      glowAt(S, lp.x, lp.y, lp.z, 30 * s, [1, 0.72, 0.38], 1.1);
      glowAt(S, lp.x, lp.y, lp.z, 8 * s, [1, 0.9, 0.7], 1.4);
      poolAt(S, p.x, p.y + 0.1, p.z, 90 * s, [1, 0.7, 0.36], 1.0);
      for (let k = 0; k < 9; k++) { const a = T * (2.2 + k * 0.37) + k * 2.1, r = (4.5 + (k % 3) * 1.6) * s; glowAt(S, lp.x + Math.cos(a) * r, lp.y + Math.sin(a * 1.7) * 2.2 * s, lp.z + Math.sin(a) * r, 0.7 * s, [1, 0.95, 0.85], 1.3); }
    },
    // the doorway back to his heart: a heart of lights round it, chasing on the beat
    rntHeartDoor(S, it, p, q, yaw) {
      touch(S, 'rntHeart');
      const T = T_(S), m = S._m, s = it.s ?? 1;
      const hp = v3(S, 'hdp').copy(p); hp.y += it.lift ?? 17;
      const hq = qOf(S, 'hdq', 0, yaw + Math.PI, 0);
      m.compose(hp, hq, sc3(S, s)); S.layers.rntHeart.add(m);
      const bi = Math.floor(S.course.beatAt(T)), w = v3(S, 'hdw');
      for (let k = 0; k < 40; k++) {
        heartPoint((k / 40) * Math.PI * 2, 20, w).multiplyScalar(s).applyQuaternion(hq).add(hp);
        w.add(v3(S, 'hdf').set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(-0.8));
        const on = (k + bi) % 4 === 0 ? 1.7 : 0.75;
        glowAt(S, w.x, w.y, w.z, 2.2 * s, [1, 0.3, 0.38], on);
      }
      glowAt(S, hp.x, hp.y, hp.z, 50 * s, [1, 0.25, 0.35], 0.22 + 0.2 * (S.beat || 0));
    },
    // eyes under the stairs, blinking
    rntEyes(S, it, p, q, yaw) {
      const T = T_(S); if (!S.track) return;
      const blink = (Math.sin(T * 2.3 + it.seed * 9) > 0.93) ? 0.05 : 1;
      for (const sx of [-1, 1]) { const w = local(p, yaw, sx * 1.3 * (it.s ?? 1), 0, 0, S._o); glowAt(S, w.x, w.y, w.z, 1.6 * (it.s ?? 1), [1, 0.85, 0.5], 1.8 * blink); glowAt(S, w.x, w.y, w.z, 0.6 * (it.s ?? 1), [1, 1, 1], 2.4 * blink); }
    },
    // a tall window in his bedroom wall, the moon in it
    rntWindow(S, it, p, q) {
      touch(S, 'rntWindow', 'rntMoonGlass');
      S._m.compose(p, q, sc3(S, it.s ?? 1)); S.layers.rntWindow.add(S._m); S.layers.rntMoonGlass.add(S._m);
      glowAt(S, p.x, p.y + 14, p.z, 24, [0.55, 0.65, 1], 0.32);
    },
    // the front of the house: the porch, its two big lanterns lit, the round window in the pediment
    rntPorch(S, it, p, q, yaw) {
      touch(S, 'rntPorch', 'rntLantern');
      const m = S._m; m.compose(p, q, sc3(S, 1)); S.layers.rntPorch.add(m);
      for (const sx of [-1, 1]) {
        const lp = local(p, yaw, sx * 9.6, 0, -2.6, v3(S, 'pl')); lp.y = p.y;
        m.compose(lp, q, sc3(S, 2.0)); S.layers.rntLantern.add(m);
        glowAt(S, lp.x, lp.y + 16.4, lp.z, 16, [1, 0.78, 0.42], 1.3, S.beatLamps ? 4 : 0);
        poolAt(S, lp.x, p.y + 0.1, lp.z, 30, [1, 0.72, 0.4], 0.7);
      }
      const rw = local(p, yaw, 0, 41, -3.8, v3(S, 'prw')); glowAt(S, rw.x, rw.y, rw.z, 9, [1, 0.8, 0.45], 0.8);
    },
    rntLampPost(S, it, p, q, yaw) {
      touch(S, 'rntLantern');
      S._m.compose(p, q, sc3(S, it.s ?? 1.4)); S.layers.rntLantern.add(S._m);
      glowAt(S, p.x, p.y + 8.2 * (it.s ?? 1.4), p.z, 9, [1, 0.78, 0.42], 1.15, S.beatLamps ? 4 : 0);
      poolAt(S, p.x, p.y + 0.1, p.z, 16, [1, 0.72, 0.4], 0.5);
    },
    rntTopiary(S, it, p, q) { touch(S, 'rntTopiary'); S._m.compose(p, q, sc3(S, it.s ?? 1.2)); S.layers.rntTopiary.add(S._m); },
    // at 3 a.m. the sheets come up off his bed and turn over in the air and come down again
    rntSheets(S, it, p, q, yaw) {
      touch(S, 'rntGhost');
      const T = T_(S), u = (T - it.from) / (it.to - it.from);
      if (u < 0 || u > 1) return;
      const e = Math.sin(Math.PI * u);
      for (let k = 0; k < 3; k++) {
        const a = u * 9 + k * 2.1, r = 7 * e;
        const gp = local(p, yaw, Math.cos(a) * r, 9 + e * (10 + k * 3), Math.sin(a) * r, v3(S, 'shp'));
        S._m.compose(gp, qOf(S, 'shq2', 0.4 * Math.sin(a), a, 0.3 * Math.cos(a)), sc3(S, 1.1 * (0.5 + 0.5 * e)));
        S.layers.rntGhost.add(S._m, { aPhase: k * 4 });
      }
    },
  },

  kits: {
    // furniture under dust sheets either side of the road (what the chorus uncovers)
    rntFurniture(S, z, R) {
      for (let t = z.from + R() * 0.4; t < z.to; t += (z.every ?? 1.2) * (0.7 + R() * 0.6)) {
        const sd = R() < 0.5 ? -1 : 1, kind = R() < (z.clocks ?? 0.12) ? 2 : (R() < 0.35 ? 1 : 0);
        S.items.push(onFloor(S, { t, x: sd * ((z.x ?? 18) + R() * (z.spread ?? 14)), rot: SIDE(sd) + (R() - 0.5) * 0.6, s: 0.9 + R() * 0.35, kind, seed: R(), hov: 15 + R() * 8, parts: 'rntFurniture', ahead: z.ahead ?? 9 }));
      }
    },
    // the portraits that replace what used to hang there (over the road, on wires)
    rntSwap(S, z) {
      prepare(S.course, S.plan);
      z.at.forEach((t, k) => S.items.push({ t, x: 0, rot: Math.PI, s: z.s ?? 0.95, v: z.v[k], old: z.old[k], at: z.swap[k], h: ribbonY(S, t) + (z.lift ?? 1.2), idx: z.plaques ? S.atlas.index[z.plaques[k]] : undefined, parts: 'rntSwap', ahead: 9 }));
    },
    // thoughts going up along both walls, her in every one
    rntThoughts(S, z, R) {
      prepare(S.course, S.plan);
      let k = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.32) for (const side of [-1, 1]) {
        if (R() < 0.25) continue;
        S.items.push({ t: t + R() * 0.2, x: side * ((z.x ?? 20) + R() * (z.spread ?? 14)), rot: 0, h: floorAt(S.course, t), lead: 3.2 + R() * 1.4, rise: 6 + R() * 3, s: 0.8 + R() * 0.45, k: k++, seed: R(), parts: 'rntThought', ahead: 7 });
      }
    },
    rntCart(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: (z.x > 0 ? -1 : 1) * (Math.PI / 2 + 0.4), s: z.s ?? 1.5, parts: 'rntBarCart', ahead: 9 })); },
    rntLuggage(S, z) { for (const [t, x, s] of z.at) S.items.push(onFloor(S, { t, x, rot: SIDE(x) + 0.3, s: s ?? 1.5, parts: 'rntLuggage', ahead: 9 })); },
    rntLock(S, z) { prepare(S.course, S.plan); const h = ribbonY(S, z.at) + (z.lift ?? 10); S.items.push({ t: z.at, x: 0, rot: Math.PI, h, s: z.s ?? 1, pop: z.pop, ceil: floorAt(S.course, z.at) + (z.ceil ?? 40), parts: 'rntLock', ahead: 9 }); },
    // doors in doorways: [t, open, hw, hh, knocks]
    rntDoors(S, z) { for (const d of z.doors) S.items.push(onFloor(S, { t: d.t, x: 0, rot: 0, open: d.open, swing: d.swing, hw: d.hw ?? 11.5, hh: d.hh ?? 30, knocks: d.knocks, parts: 'rntDoors', ahead: 9 })); },
    rntBanners(S, z) { prepare(S.course, S.plan); for (const t of z.at) S.items.push({ t, x: 0, rot: Math.PI, h: ribbonY(S, t) + (z.lift ?? 11), span: z.span ?? 40, parts: 'rntBanner', ahead: 9 }); },
    rntBalloons(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.t1 + 3, x: 0, rot: 0, h: 0, from: z.from, t0: z.t0, t1: z.t1, n: z.n ?? 60, seed: z.seed ?? 7, parts: 'rntBalloons' }); },
    rntForget(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.22) for (const side of [-1, 1]) {
        if (R() < 0.3) continue;
        const wall = R() < (z.walls ?? 0.35), W = z.W ?? 40;
        const grow = z.grow[Math.floor(R() * z.grow.length)];
        if (wall) { prepare(S.course, S.plan); S.items.push({ t, x: side * (W - 0.5), rot: 0, h: floorAt(S.course, t) + 3 + R() * 22, s: 1.3 + R() * 0.9, wall: true, grow, parts: 'rntForget', ahead: 7 }); }
        else S.items.push(onFloor(S, { t, x: side * (19 + R() * (W - 22)), rot: R() * 6.28, s: 1.5 + R() * 1.0, grow, parts: 'rntForget', ahead: 7 }));
      }
    },
    rntDollhouse(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x) + (z.x > 0 ? 0.5 : -0.5), s: z.s ?? 1, her: z.her, spin: true, parts: 'rntDollhouse', ahead: 9 })); },
    rntFireplace(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, parts: 'rntFireplace', ahead: 9 })); },
    rntCandles(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.66) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + (side > 0 ? (z.every ?? 0.66) / 2 : 0), x: side * (z.x ?? 20), rot: R() * 0.4, s: z.s ?? 1, seed: R(), parts: 'rntCandles', ahead: z.ahead ?? 9 })); },
    rntMirror(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: Math.PI, h: floorAt(S.course, z.at) + (z.y ?? 21), s: z.s ?? 1, v: z.v ?? 1, parts: 'rntMirror', ahead: 9 }); },
    rntBust(S, z) { for (const [t, x] of z.at) S.items.push(onFloor(S, { t, x, rot: SIDE(x) + (x > 0 ? 0.5 : -0.5), s: z.s ?? 1, parts: 'rntBust', ahead: 9 })); },
    // the boards: the texts go on the sheet in order; each says where it stands
    rntBoards(S, z, R) {
      BOARDS = z.boards.map((b) => ({ text: b.text, thread: b.thread, accent: b.accent, linen: b.linen }));
      prepare(S.course, S.plan);
      z.boards.forEach((b, i) => {
        if (b.hang) S.items.push({ t: b.at, x: 0, rot: Math.PI, h: ribbonY(S, b.at) + (b.lift ?? 10), s: b.s ?? 1, cell: i, hang: true, seed: R(), parts: 'rntBoard', ahead: 9 });
        else S.items.push(onFloor(S, { t: b.at, x: b.x, rot: 0, s: b.s ?? 1, cell: i, turn: b.turn, seed: R(), parts: 'rntBoard', ahead: 9 }));
      });
    },
    rntFutures(S, z) { z.at.forEach(([t, x], k) => S.items.push(onFloor(S, { t, x, rot: 0, s: z.s ?? 1.4, k: (z.k ?? 0) + k, parts: 'rntFuture', ahead: 9 }))); },
    rntLease(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: Math.PI, h: ribbonY(S, z.at) + (z.lift ?? 15), s: z.s ?? 1, parts: 'rntLease', ahead: 9 }); },
    rntMine(S, z) { prepare(S.course, S.plan); z.at.forEach(([t, x, y], k) => S.items.push({ t, x, rot: SIDE(x), h: floorAt(S.course, t) + (y ?? 18), s: z.s ?? 1, k: k % 4, parts: 'rntMine', ahead: 7 })); },
    rntKeyWall(S, z) { for (const side of [-1, 1]) for (let a = z.from; a < z.to; a += 1) S.items.push({ t: Math.min(z.to, a + 1), x: side * (z.W ?? 40), rot: 0, h: 0, from: a, to: Math.min(z.to, a + 1), side, W: z.W ?? 40, rows: z.rows, every: z.every, parts: 'rntKeyWall', ahead: 6 }); },
    rntKeyRain(S, z) { S.items.push({ t: z.to + 1, x: 0, rot: 0, h: 0, from: z.from, to: z.to, n: z.n ?? 140, spread: z.x ?? 30, parts: 'rntKeyRain' }); },
    rntPolaroids(S, z) { S.items.push({ t: z.to + 1, x: 0, rot: 0, h: 0, from: z.from, to: z.to, n: z.n ?? 90, spread: z.x ?? 34, parts: 'rntPolaroids' }); },
    rntLamp(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: 0, s: z.s ?? 2, parts: 'rntLamp', ahead: 9 })); },
    rntHeartDoor(S, z) { S.items.push(onFloor(S, { t: z.at, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, parts: 'rntHeartDoor', ahead: 9 })); },
    rntEyes(S, z, R) { prepare(S.course, S.plan); for (const [t, x, y] of z.at) S.items.push({ t, x, rot: SIDE(x), h: floorAt(S.course, t) + y, s: z.s ?? 1, seed: R(), parts: 'rntEyes', ahead: 6 }); },
    rntWindows(S, z) { for (const [t, x] of z.at) S.items.push(onFloor(S, { t, x, rot: SIDE(x), s: z.s ?? 1, parts: 'rntWindow', ahead: 9 })); },
    rntSheets(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), from: z.from, to: z.to, parts: 'rntSheets', ahead: 9 })); },
    // outside: the path up to the house, lamps and clipped hedges either side; the porch on the front
    rntFront(S, z, R) {
      S.items.push({ t: z.at, x: 0, rot: 0, h: 0, parts: 'rntPorch' });
      for (let t = z.from; t < z.at - 0.3; t += z.every ?? 0.55) for (const side of [-1, 1]) {
        S.items.push({ t, x: side * (z.x ?? 17), rot: 0, h: 0, s: 1.4, parts: 'rntLampPost' });
        S.items.push({ t: t + 0.27, x: side * ((z.x ?? 17) + 8 + R() * 3), rot: R() * 6.28, h: 0, s: 1.1 + R() * 0.3, parts: 'rntTopiary' });
      }
    },
  },
});
