// Unloaded: out the loading dock onto your block, where it's still what's playing.
// Walk-ups down both sides, every window lit and somebody dancing in most of them, harder in
// the drop; a banner strung across the street with his last line on it. And the end: the candy
// truck pulled over and tipped, its load in a mountain across the street, the boombox on top of
// it still going.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { prepare, groundAt } from './trail.js';
import { paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const hexRGB = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const onGround = (S, it) => { prepare(S.course, S.plan); if (it.h === undefined) it.h = groundAt(S.course, it.t, it.x); return it; };
const CANDY = [0xff5fb0, 0x6af0c8, 0xffd23a, 0xb070ff, 0xff8a3a, 0xff3a5a, 0x5ab0ff, 0xffffff];

// vertex-coloured and lit a little by itself; pure white parts take the instance's tint (brick)
function walkMat(M) {
  return M.cdyWalkM || (M.cdyWalkM = (() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n if (vColor.r > 0.99 && vColor.g > 0.99 && vColor.b > 0.99) diffuseColor.rgb = vTint;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.22;');
    };
    m.customProgramCacheKey = () => 'cdyWalk';
    return m;
  })());
}
function litVC(M, key, opts, k) {
  return M[key] || (M[key] = (() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts });
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';'); };
    m.customProgramCacheKey = () => 'cdyLit' + k.toFixed(2);
    return m;
  })());
}

// ---------- a walk-up: brick, its cornice, the stoop and its rails, the fire escape ----------
const BW = 16, BH = 19.4, BD = 12;
function walkup() {
  const parts = [], white = [1, 1, 1], cream = rgb(0xe8dcc8), stone = rgb(0x9a8a7a), iron = rgb(0x1e1a20);
  parts.push(paint(box(BW, BH, BD, 0, BH / 2, -BD / 2), white));
  // the cornice and its brackets
  parts.push(paint(box(BW + 0.8, 1.2, 1.8, 0, BH + 0.2, 0.2), cream));
  for (let k = 0; k < 7; k++) parts.push(paint(box(0.5, 0.9, 1.0, -7.5 + k * 2.5, BH - 0.8, 0.4), cream));
  parts.push(paint(box(BW + 0.2, 0.5, 0.6, 0, 4.5, 0.25), cream));
  // the stoop up to the door
  for (let k = 0; k < 4; k++) parts.push(paint(box(3.6, 0.45, 0.8, 0, 0.225 + k * 0.45, 3.0 - k * 0.8), stone));
  parts.push(paint(box(3.6, 1.8, 0.8, 0, 0.9, -0.0), stone));
  // (the ironwork is kept to a few stout members: thin bars go under a pixel far off and sparkle)
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) parts.push(paint(box(0.16, 1.1, 0.16, s * 1.8, 0.55 + k * 0.9 + 0.4, 3.2 - k * 1.6), iron));
    const r = new THREE.BoxGeometry(0.16, 0.16, 3.6); r.rotateX(-0.5); r.translate(s * 1.8, 2.15, 1.6); parts.push(paint(r, iron));
  }
  // the fire escape: three landings across the middle windows, rails, ladders between
  for (let f = 0; f < 3; f++) {
    const y = 8.0 + f * 3.6;
    parts.push(paint(box(9.2, 0.18, 1.5, 0, y, 0.78), iron));
    parts.push(paint(box(9.3, 0.16, 0.16, 0, y + 1.0, 1.5), iron));
    parts.push(paint(box(9.3, 0.12, 0.12, 0, y + 0.5, 1.5), iron));
    for (let k = 0; k <= 4; k++) parts.push(paint(box(0.16, 1.0, 0.16, -4.6 + k * 2.3, y + 0.5, 1.5), iron));
    for (const s of [-1, 1]) parts.push(paint(box(0.16, 1.0, 1.5, s * 4.6, y + 0.5, 0.78), iron));
    if (f < 2) { const l = new THREE.BoxGeometry(0.7, 4.4, 0.16); l.rotateZ(0.62); l.translate(2.4, y + 1.8, 1.2); parts.push(paint(l, iron)); }
  }
  return merge(parts);
}

// ---------- the front: brick, the windows lit and people dancing in them ----------
const FACADE_VS = `attribute vec3 aTint; attribute float aSeed; varying vec2 vP; varying vec3 vTint; varying float vSeed; varying vec3 vW;
  void main(){ vP = position.xy; vTint = aTint; vSeed = aSeed; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`;
const FACADE_FS = `uniform float uTime, uBeat, uPhase, uParity, uParty, uFogDensity, uWin; uniform vec3 uFog, uCam, uWarm, uAlt;
  varying vec2 vP; varying vec3 vTint; varying float vSeed; varying vec3 vW;
  // a hash without sin: an interpolated seed is never quite constant across a face, and sin of a
  // big number turns those last digits into noise in every pixel
  float h2(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
  float grout(vec2 p, float w){ vec2 d = max(fwidth(p), vec2(1e-4)), f = abs(fract(p) - 0.5); vec2 g = smoothstep(0.5 - w - d, 0.5 - w + d, f); float mean = 1.0 - (1.0 - 2.0 * w) * (1.0 - 2.0 * w); return mix(max(g.x, g.y), mean, clamp(max(d.x, d.y) * 2.5 - 0.6, 0.0, 1.0)); }
  // somebody dancing, against the light (p: metres inside the window, from its bottom middle)
  float dancer(vec2 p, float s, float wild){
    float side = h2(vec2(s, 9.0)) > 0.5 ? 1.0 : -1.0;
    float ph = uPhase * 6.2832 + s * 6.0;
    float sway = sin(ph) * (0.12 + 0.1 * wild), bob = abs(sin(ph)) * (0.06 + 0.06 * wild);
    vec2 q = p - vec2(sway + 0.15 * side, bob);
    float head = length(q - vec2(0.0, 1.78)) - 0.23;
    float body = seg(q, vec2(0.0, 0.55), vec2(0.0, 1.42)) - 0.3;
    float up = mod(uParity + floor(s * 3.0), 2.0);
    vec2 hl = mix(vec2(-0.62, 1.05), vec2(-0.5, 2.35), up * (0.5 + 0.5 * wild));
    vec2 hr = mix(vec2(0.62, 2.3), vec2(0.66, 1.15), up);
    float arms = min(seg(q, vec2(-0.26, 1.38), hl), seg(q, vec2(0.26, 1.38), hr)) - 0.11;
    return min(min(head, body), arms);
  }
  void main(){
    vec2 p = vP;
    float seed = floor(vSeed * 251.0 + 0.5);
    // how big a pixel is here, in metres: small things settle to their average far off
    float px = max(fwidth(p.x), fwidth(p.y));
    // brick, a course every 30 cm, each brick its own shade of the building's colour
    vec2 bq = vec2(p.x / 0.9 + 0.5 * mod(floor(p.y / 0.3), 2.0), p.y / 0.3);
    float near = 1.0 - smoothstep(0.06, 0.16, px);
    vec3 col = vTint * (0.89 + 0.22 * (h2(floor(bq) + vec2(seed * 3.0, seed * 7.0)) - 0.5) * near);
    col = mix(col, vec3(0.42, 0.38, 0.36), grout(bq, 0.06) * 0.7);
    float lit = 0.0;
    // the windows: four a floor, four floors over the stoop
    if (p.y > 5.0 && p.y < 19.0) {
      float fy = floor((p.y - 5.0) / 3.6), wy = p.y - 5.0 - fy * 3.6 - 0.45;
      float fx = floor((p.x + 8.0) / 4.0), wx = p.x + 8.0 - fx * 4.0 - 2.0;
      vec2 id = vec2(fx, fy) + vec2(seed * 5.0, seed * 11.0);
      if (abs(wx) < 1.25 && wy > -0.15 && wy < 2.8) {
        float frame = 1.0 - step(abs(wx), 1.08) * step(0.0, wy) * step(wy, 2.62);
        float on = step(0.12, h2(id + 3.0));
        float pick = h2(id + 7.0);
        vec3 room = pick < 0.45 ? uWarm : pick < 0.75 ? uAlt : vec3(0.6, 1.0, 0.85);
        room *= (0.55 + 0.45 * wy / 2.6) * (0.75 + 0.5 * h2(id + 1.0));
        // the room's light breathes with the music, more in the drop
        room *= 1.0 + (0.18 + 0.5 * uParty) * uBeat * step(0.5, h2(id + 5.0));
        vec3 win = mix(vec3(0.03, 0.025, 0.04), room * uWin, on);
        // curtains at the sides
        float cur = smoothstep(0.62, 0.95, abs(wx)) * step(h2(id + 11.0), 0.7);
        win = mix(win, win * 0.45 + vTint * 0.1, cur);
        // somebody dancing in most of them (far off, just the room a little darker where they are)
        float farW = smoothstep(0.13, 0.26, px);
        if (on > 0.5 && h2(id + 13.0) < 0.62 + 0.3 * uParty) {
          float d = dancer(vec2(wx, wy), h2(id + 17.0) * 10.0, uParty);
          float aa = max(px * 1.5, 0.02);
          float sil = 1.0 - smoothstep(-aa, aa, d);
          win = mix(win, vec3(0.04, 0.02, 0.05) + room * 0.05, mix(sil, 0.22, farW));
        }
        // the mullion and the sash
        float mull = step(abs(wx), 0.05) + step(abs(wy - 1.35), 0.05);
        win = mix(win, vec3(0.85, 0.82, 0.78), clamp(mull, 0.0, 1.0) * on * 0.6 + clamp(mull, 0.0, 1.0) * (1.0 - on) * 0.3);
        col = mix(win, vec3(0.86, 0.83, 0.78), frame);
        lit = on * (1.0 - frame);
        // the sill
        col = mix(col, vec3(0.72, 0.68, 0.62), step(abs(wy + 0.1), 0.12) * step(abs(wx), 1.25));
      }
    } else if (p.y < 4.4) {
      // the ground floor: the door at the top of the stoop, its transom lit; a lit window either side
      if (abs(p.x) < 1.25 && p.y > 1.8 && p.y < 4.2) { col = vec3(0.12, 0.05, 0.06); if (p.y > 3.6) { col = uWarm * uWin * 0.8; lit = 1.0; } }
      float sx = abs(abs(p.x) - 5.0);
      if (sx < 2.0 && p.y > 1.4 && p.y < 3.9) { col = mix(uWarm * uWin * 0.7, vec3(0.8, 0.76, 0.7), 1.0 - step(sx, 1.85) * step(1.55, p.y) * step(p.y, 3.75)); lit = 1.0; }
    }
    float d = length(uCam - vW);
    float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
    gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0) * (1.0 - 0.35 * lit)), 1.0);
  }`;
function facadeMaterial(M) {
  return M.cdyFacadeM || (M.cdyFacadeM = new THREE.ShaderMaterial({
    vertexShader: FACADE_VS, fragmentShader: FACADE_FS,
    uniforms: { uTime: { value: 0 }, uBeat: { value: 0 }, uPhase: { value: 0 }, uParity: { value: 0 }, uParty: { value: 0 }, uFogDensity: { value: 0.002 }, uWin: { value: 1.6 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uWarm: { value: new THREE.Color(0xffc890) }, uAlt: { value: new THREE.Color(0xff9ad8) } },
  }));
}

// a banner strung across the street: the cloth, its pole-ends, the bunting along its bottom
function bannerCloth() {
  const parts = [], white = rgb(0xf4eef0);
  parts.push(paint(box(33, 11, 0.25, 0, 0, -0.2), white));
  for (const s of [-1, 1]) parts.push(paint(cyl(0.3, 0.3, 12, 8, s * 16.6, 0, 0), rgb(0xe8c050)));
  for (let k = 0; k < 16; k++) { const g = new THREE.ConeGeometry(1.0, 1.6, 3); g.rotateZ(Math.PI); g.scale(1, 1, 0.15); g.translate(-15 + k * 2, -6.3, 0); parts.push(paint(g, rgb(CANDY[k % 6]))); }
  return merge(parts);
}

const BOX = {
  // the boombox: the body, two speakers' rims, the deck window, the handle, the antenna
  body() {
    const parts = [], body = rgb(0x24222a), chrome = rgb(0xd8dce4), pink = rgb(0xff4fa8);
    parts.push(paint(box(22, 11, 6, 0, 5.5, 0), body));
    parts.push(paint(box(22.4, 0.6, 6.2, 0, 11.0, 0), chrome)); parts.push(paint(box(22.4, 0.6, 6.2, 0, 0.3, 0), chrome));
    for (const x of [-7, 7]) { const g = new THREE.TorusGeometry(4.3, 0.35, 10, 36); g.translate(x, 5.5, 3.05); parts.push(paint(g, chrome)); }
    parts.push(paint(box(6, 3.4, 0.4, 0, 6.6, 3.05), rgb(0x0a0a0c)));
    for (let k = 0; k < 6; k++) parts.push(paint(box(0.7, 0.6, 0.5, -1.9 + k * 0.76, 3.4, 3.1), k === 2 ? pink : chrome));
    for (const x of [-10, 10]) parts.push(paint(box(0.8, 3.4, 0.8, x, 12.4, 0), chrome));
    parts.push(paint(box(20.8, 0.9, 0.9, 0, 14.1, 0), chrome));
    const ant = new THREE.CylinderGeometry(0.15, 0.15, 13, 6); ant.translate(0, 6.5, 0); ant.rotateZ(-0.5); ant.translate(8, 11, -2); parts.push(paint(ant, chrome));
    return merge(parts);
  },
  cone() { const g = new THREE.CylinderGeometry(3.9, 1.3, 1.6, 32, 1, true); g.rotateX(Math.PI / 2); return g; },
  // the candy truck: the cab, the chassis, the wheels (the tipper is its own piece)
  truck() {
    const parts = [], pink = rgb(0xff4fa8), white = rgb(0xfff4f8), dark = rgb(0x1a1a20), chrome = rgb(0xd8dce4), glass = rgb(0x2a3440);
    parts.push(paint(box(5.6, 1.2, 17, 0, 1.9, -1), dark));
    parts.push(paint(box(5.6, 5.6, 5.0, 0, 4.4, 6.6), pink));
    parts.push(paint(box(5.0, 2.2, 0.2, 0, 5.4, 9.12), glass));
    for (const s of [-1, 1]) parts.push(paint(box(0.2, 1.8, 2.8, s * 2.82, 5.4, 7.0), glass));
    parts.push(paint(box(5.8, 0.5, 5.2, 0, 7.3, 6.6), white));
    parts.push(paint(box(5.8, 1.2, 0.5, 0, 2.2, 9.2), chrome));
    for (const s of [-1, 1]) parts.push(paint(box(1.0, 0.6, 0.2, s * 2.0, 3.0, 9.2), rgb(0xfff4c8)));
    for (const z of [-6.6, -3.4, 6.6]) for (const s of [-1, 1]) { const w = cyl(1.4, 1.4, 1.0, 18, 0, 0, 0); w.rotateZ(Math.PI / 2); w.translate(s * 2.6, 1.4, z); parts.push(paint(w, dark)); const hub = cyl(0.6, 0.6, 1.05, 12, 0, 0, 0); hub.rotateZ(Math.PI / 2); hub.translate(s * 2.62, 1.4, z); parts.push(paint(hub, chrome)); }
    return merge(parts);
  },
  // the tipper: a steel bin in candy stripes, hinged at its back end (the origin)
  tipper() {
    const parts = [], pink = rgb(0xff4fa8), white = rgb(0xfff4f8), steel = rgb(0x9aa0aa);
    parts.push(paint(box(5.8, 0.4, 12, 0, 0.2, 6), steel));
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) parts.push(paint(box(0.3, 3.6, 2, s * 2.9, 2.0, 1 + k * 2), k % 2 ? white : pink));
    parts.push(paint(box(5.8, 4.2, 0.4, 0, 2.3, 12), pink));
    parts.push(paint(box(6.2, 0.4, 12.4, 0, 4.1, 6), steel));
    // a big wrapped sweet painted on each side
    for (const s of [-1, 1]) { const m = sph(1, 0.3, 1.2, 1.8, s * 3.05, 2.0, 6, 14, 10); parts.push(paint(m, rgb(0xffd23a))); for (const e of [-1, 1]) { const c = new THREE.ConeGeometry(0.9, 1.4, 8); c.rotateX(e * Math.PI / 2); c.scale(0.3, 1, 1); c.translate(s * 3.05, 2.0, 6 + e * 2.4); parts.push(paint(c, rgb(0xffd23a))); } }
    return merge(parts);
  },
  sweet() { const parts = []; const mid = new THREE.SphereGeometry(0.62, 12, 8); mid.scale(1.35, 1, 1); parts.push(mid); for (const s of [-1, 1]) { const c = new THREE.ConeGeometry(0.52, 0.8, 8); c.rotateZ(s * Math.PI / 2); c.translate(s * 1.15, 0, 0); parts.push(c); } return merge(parts); },
};

extend({
  layers: {
    cdyWalkup: (M) => [walkup(), walkMat(M), 160, { aTint: 3 }],
    cdyFacade: (M) => [(() => { const g = new THREE.PlaneGeometry(BW, BH, 1, 1); g.translate(0, BH / 2, 0.04); return g; })(), facadeMaterial(M), 160, { aTint: 3, aSeed: 1 }],
    cdyBanner: (M) => [bannerCloth(), litVC(M, 'cdyBannerM', { roughness: 0.8, metalness: 0.05 }, 0.5), 4, {}],
    cdyBannerFace: (M) => [(() => { const g = new THREE.PlaneGeometry(32, 10); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.05 + 0.9 * uv.getY(i)); g.translate(0, 0, 0.0); return g; })(), M.sign, 4, { aIdx: 1, aWake: 2 }],
    cdyRope: (M) => [(() => { const g = new THREE.CylinderGeometry(0.07, 0.07, 1, 5); g.translate(0, 0.5, 0); return paint(g, rgb(0xd8d0c0)); })(), litVC(M, 'cdyRopeM', { roughness: 0.9 }, 0.4), 16, {}],
  },
  parts: {
    // a walk-up facing the street, its windows lit and danced in
    cdyWalkup(S, it, p, q) {
      S._m.compose(p, q, S._s.set(1, it.sy ?? 1, 1)); S.layers.cdyWalkup.add(S._m, { aTint: it.tint });
      S.layers.cdyFacade.add(S._m, { aTint: it.tint, aSeed: it.seed });
      if (it.lamp) { const w = local(p, S.course.sample(it.t).yaw + (it.rot || 0), 0, 4.6, 1.6, S._o); glowAt(S, w.x, w.y, w.z, 2.6, [1, 0.85, 0.6], 1.0); poolAt(S, w.x, p.y + 0.1, w.z, 9, [1, 0.8, 0.55], 0.6); }
    },
    // his last line on a banner across the street, strung from the walk-ups either side
    cdyBanner(S, it, p) {
      const sm = S.course.sample(it.t), yaw = sm.yaw;
      const c = S._cbc || (S._cbc = new THREE.Vector3()); c.set(p.x, sm.y + (it.h || 17), p.z);
      const sway = Math.sin((S.tNow ?? 0) * 1.3) * 0.04;
      S._e.set(sway, yaw + Math.PI, 0); const bq = (S._cbq || (S._cbq = new THREE.Quaternion())).setFromEuler(S._e);
      S._m.compose(c, bq, S._s.set(1, 1, 1)); S.layers.cdyBanner.add(S._m); S.layers.cdyBannerFace.add(S._m, { aIdx: it.idx, aWake: [0.9, 0] });
      // the ropes out to the buildings
      const R = S.layers.cdyRope, a = S._cra || (S._cra = new THREE.Vector3()), b = S._crb || (S._crb = new THREE.Vector3()), d = S._crd || (S._crd = new THREE.Vector3()), Y = S._cry || (S._cry = new THREE.Vector3(0, 1, 0)), rq = S._crq || (S._crq = new THREE.Quaternion());
      // (the scenery's first pass runs before there's a track: the rope layer is made, nothing placed)
      if (!S.track) { R.add(S._m.makeScale(0, 0, 0)); return; }
      for (const sd of [-1, 1]) for (const dy of [4.6, -4.6]) {
        local(c, yaw, sd * 16.6, dy, 0, a); S.track.ground(it.t, -sd * 24.2, b); b.y = groundAt(S.course, it.t, -sd * 24.2) + 15 + dy * 0.5;
        d.subVectors(b, a); const L = d.length(); rq.setFromUnitVectors(Y, d.normalize()); S._m.compose(a, rq, S._s.set(1, L, 1)); R.add(S._m);
      }
      glowAt(S, c.x, c.y, c.z, 30, [1, 0.85, 0.9], 0.25);
    },
  },
  kits: {
    // a row of walk-ups down each side, shoulder to shoulder
    cdyWalkups(S, z, R) {
      const bricks = [0xa84a3a, 0xb8604a, 0x8a3a30, 0xc07858, 0x9a4a40, 0xb06a5a, 0x7a3a3a, 0xc88a6a];
      // (laid out in song time, so at her speed they can crowd a little: every other one stands a
      // little back, so no two fronts ever share a plane)
      for (const side of z.sides || [-1, 1]) {
        let t = z.from + R() * 0.1, k = 0;
        while (t < z.to) {
          if (!(z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) {
            S.items.push(onGround(S, { t, x: side * ((z.x ?? 31) + (k % 2) * 0.9), rot: SIDE(side), sy: 0.86 + R() * 0.3, tint: hexRGB(pick(R, bricks)), seed: R(), lamp: R() < 0.5, parts: 'cdyWalkup', ahead: z.ahead }));
          }
          t += z.every ?? 0.34; k++;
        }
      }
    },
  },
});

// ---------- the end: the truck tipped, the candy in a mountain, the boombox on top ----------
export class UnloadedFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -24;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.3 });
    mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.45;'); };
    mat.customProgramCacheKey = () => 'cdyFinale';
    // the truck, side-on to the road, its back to the heap
    this.truck = new THREE.Group(); this.group.add(this.truck);
    this.truck.position.set(cfg.truckX ?? 10, 0, cfg.truckZ ?? 4); this.truck.rotation.y = cfg.truckRot ?? -1.9;
    this.truck.add(new THREE.Mesh(BOX.truck(), mat));
    this.tip = new THREE.Group(); this.tip.position.set(0, 3.0, -9.5); this.truck.add(this.tip);
    const tm = new THREE.Mesh(BOX.tipper(), mat); this.tip.add(tm);
    // the heap: every kind of sweet, in a mountain out the back of it
    // the sweets lie over its surface; a core of candy under them fills it out
    const R = seeded(71), N = cfg.n ?? 560, HR = cfg.heapR ?? 13, HH = cfg.heapH ?? 12;
    this.N = N; this.pieces = [];
    for (let i = 0; i < N; i++) {
      const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * HR;
      const bump = 1 + 0.12 * Math.sin(a * 3 + 1) + 0.08 * Math.sin(a * 7);
      const hx = Math.cos(a) * rr * bump, hz = Math.sin(a) * rr * bump * 0.85;
      const hy = Math.max(0.3, HH * Math.pow(1 - rr / HR, 1.15)) + (R() - 0.3) * 0.7;
      this.pieces.push({ to: new THREE.Vector3(hx, hy, hz), at: R(), s: 1.2 + R() * 1.0, rot: [R() * 6, R() * 6, R() * 6], tint: hexRGB(CANDY[Math.floor(R() * CANDY.length)]), kind: R() < 0.55 ? 0 : 1 });
    }
    this.pieces.sort((p1, p2) => p1.to.y - p2.to.y);
    const coreG = new THREE.ConeGeometry(HR * 0.96, HH * 0.98, 40, 6);
    { const p = coreG.attributes.position, n = p.count, col = new Float32Array(n * 3), RC = seeded(5); for (let i = 0; i < n; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); const k = 1 + 0.12 * Math.sin(a * 3 + 1) + 0.08 * Math.sin(a * 7); p.setX(i, x * k); p.setZ(i, z * k * 0.85); col.set(hexRGB(CANDY[Math.floor(RC() * 6)]), i * 3); } coreG.setAttribute('color', new THREE.BufferAttribute(col, 3)); coreG.translate(0, HH * 0.49, 0); coreG.computeVertexNormals(); }
    this.core = new THREE.Mesh(coreG, mat);
    const tintMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.05 });
    tintMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.5;');
    };
    tintMat.customProgramCacheKey = () => 'cdyHeap';
    const mk = (geo, n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); geo.setAttribute('aTint', a); const m = new THREE.InstancedMesh(geo, tintMat, n); m.frustumCulled = false; m.count = 0; this.group.add(m); return m; };
    this.sweets = mk(BOX.sweet(), N); this.balls = mk(new THREE.SphereGeometry(0.75, 12, 9), N);
    this.heap = new THREE.Group(); this.heap.position.set(cfg.heapX ?? -2, 0, cfg.heapZ ?? -6); this.group.add(this.heap);
    this.heap.add(this.sweets); this.heap.add(this.balls); this.heap.add(this.core);
    // the boombox on top
    this.box = new THREE.Group(); this.box.position.set(0, HH - 0.6, 0); this.box.rotation.y = cfg.boxRot ?? 0.5; this.heap.add(this.box);
    this.box.add(new THREE.Mesh(BOX.body(), mat));
    const coneM = new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide });
    this.cones = [-7, 7].map((x) => { const c = new THREE.Mesh(BOX.cone(), coneM); c.position.set(x, 5.5, 3.6); this.box.add(c); return c; });
    this.deck = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6ac8).multiplyScalar(1.4) }));
    this.deck.position.set(0, 6.6, 3.3); this.box.add(this.deck);
    this.box.scale.setScalar(cfg.boxS ?? 0.7);
    this.fired = false; this.earned = 0.5; this.lit = 0.6;
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3();
    this.pour0 = cfg.pour ?? (course.duration - 3.2); this.pourFor = cfg.pourFor ?? 2.4;
    this.shells = 0; this.beatT = 0;
  }
  fire(earned) { this.fired = true; this.earned = earned ?? 0.5; }
  update(track, rider, songT, dt, fireworks) {
    track.ground(this.t, this.x, this._p); this._p.y = groundAt(this.course, this.t, this.x);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.x > 0 ? Math.PI / 2 : -Math.PI / 2), 0);
    this.group.updateMatrixWorld(true);
    const T = songT, c = this.course;
    // the tipper goes up, the load comes out the back
    const tk = smooth(this.pour0 - 0.6, this.pour0 + 0.8, T);
    this.tip.rotation.x = -0.82 * tk;
    this.tip.updateMatrixWorld(true);
    // where the load leaves the back of the tipper, in the heap's own frame
    const from = this._from || (this._from = new THREE.Vector3());
    this.truck.localToWorld(from.set(0, 3.6, -11.0)); this.heap.worldToLocal(from);
    let ns = 0, nb = 0;
    const m = this._m, q = this._q, e = this._e, s = this._s, w = this._w;
    for (let i = 0; i < this.N; i++) {
      const pc = this.pieces[i];
      const t0 = this.pour0 + pc.at * this.pourFor;
      const u = clamp((T - t0) / 0.7, 0, 1);
      if (u <= 0) continue;
      // from the back of the tipper down onto the heap, in an arc
      const x = from.x + (pc.to.x - from.x) * u, z = from.z + (pc.to.z - from.z) * u;
      const y = from.y + (pc.to.y - from.y) * u + 6 * u * (1 - u);
      e.set(pc.rot[0] + (1 - u) * 6, pc.rot[1], pc.rot[2]); q.setFromEuler(e);
      m.compose(w.set(x, y, z), q, s.setScalar(pc.s));
      if (pc.kind === 0) { this.sweets.setMatrixAt(ns, m); this.sweets.geometry.attributes.aTint.array.set(pc.tint, ns * 3); ns++; }
      else { this.balls.setMatrixAt(nb, m); this.balls.geometry.attributes.aTint.array.set(pc.tint, nb * 3); nb++; }
    }
    this.sweets.count = ns; this.balls.count = nb;
    for (const mm of [this.sweets, this.balls]) { mm.instanceMatrix.needsUpdate = true; mm.geometry.attributes.aTint.needsUpdate = true; }
    // the boombox rides the heap up as it grows, and pumps on the beat
    this.box.visible = T > this.pour0 + 0.8;
    const grown = smooth(this.pour0, this.pour0 + this.pourFor + 0.5, T), HH = this.cfg.heapH ?? 12;
    this.box.position.y = HH * (0.55 + 0.45 * grown) - 0.6;
    this.core.visible = grown > 0.01; this.core.scale.set(0.6 + 0.4 * grown, Math.max(0.01, grown), 0.6 + 0.4 * grown);
    // still playing after the song's done: the beat goes on at its tempo
    if (T < c.duration - 0.05) this.beatT = T; else this.beatT += dt;
    const spb = 60 / (c.chart.bpm || 120), b = this.beatT < c.duration ? c.beatAt(this.beatT) : c.beatAt(c.duration) + (this.beatT - c.duration) / spb;
    const pulse = Math.exp(-(b - Math.floor(b)) * 6);
    for (const cn of this.cones) cn.scale.set(1 + 0.08 * pulse, 1 + 0.08 * pulse, 1 + 0.9 * pulse);
    this.lit += ((this.fired ? 1.0 + 0.4 * this.earned : 0.7) - this.lit) * Math.min(1, dt * 2);
    // when it's been earned: shells over the block, a few at a time
    if (this.fired && fireworks && T > c.duration - 0.3 && this.shells < 4 + Math.round(6 * this.earned)) {
      this.shellT = (this.shellT ?? 0) - dt;
      if (this.shellT <= 0) {
        this.shellT = 0.55;
        const from = track.ground(this.t + 1.5 + Math.random() * 3, (Math.random() < 0.5 ? -1 : 1) * (36 + Math.random() * 20), new THREE.Vector3());
        const to = from.clone(); to.y = 46 + Math.random() * 22;
        fireworks.launch(from, to, 0.8 + 0.4 * this.earned); this.shells++;
      }
    }
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    this.box.localToWorld(w.set(0, 7, 3));
    S.glow(w.x, w.y, w.z, 18, [1, 0.45, 0.8], (0.45 + 0.55 * pulse) * this.lit);
    this.heap.localToWorld(w.set(0, 2, 0));
    S.glow(w.x, w.y + 3, w.z, 34, [1, 0.6, 0.85], 0.35 * this.lit);
    S.pool(w.x, this._p.y + 0.12, w.z, 46, [1, 0.55, 0.8], 0.55 * this.lit);
    // the truck's lights: its hazards going on the beat
    for (const sd of [-1, 1]) { this.truck.localToWorld(w.set(sd * 2.0, 3.0, 9.3)); S.glow(w.x, w.y, w.z, 2.4, [1, 0.95, 0.8], 1.2); this.truck.localToWorld(w.set(sd * 2.6, 2.4, -8.6)); S.glow(w.x, w.y, w.z, 2.2, [1, 0.55, 0.1], Math.floor(b) % 2 ? 1.6 : 0.2); }
  }
}
