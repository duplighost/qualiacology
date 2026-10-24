// Nothing Happens Every Week. A small town over a week where nothing happens: Monday morning
// on the street (the dentist three teeth this week, his car halfway down her street, the
// receipts, the mirror), a Friday night of nothing much under the interrogation lamp, a
// broad daylight brunch, and Main Street on a Saturday where something finally does: the
// hydrants open and the water leaps over the road on every beat. Sunday: the church bells, the
// summons, the loopholes, the errands, the market, the matinee; the hat and the sunglasses; the
// shredder. The parade. The evening: the door held till it closed, the hall of frames, the
// courthouse and its gavel. The getaway at the speed limit through the fire trucks' salute, out
// of town and up the hill to the lookout, the whole town below with its lights coming on.

import * as THREE from 'three';
import { extend, col, glowAt, poolAt, local, PASTEL } from './scenery.js';
import { tintMaterial, buildingMaterial } from './props.js';
import { prepare, groundAt, Terrain } from './trail.js';
import { donutGeometry } from './pickups.js';
import { HOUSES, TREES, STREET, paint, merge, box, cyl, sph, bare, seeded } from './nh-geo.js';
import { SETS, CANVAS } from './nh-sets.js';
import { buildValley, valleyMaterial, valleyLights } from './nh-town.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);

// ---------- materials ----------
// the houses' walls: clapboard, and windows that wake (the props' building material underneath)
function wallsMaterial(P, cell, opt, lap) {
  const m = buildingMaterial(P, cell, opt);
  const base = m.onBeforeCompile;
  m.customProgramCacheKey = () => 'nh-walls-' + cell.join('x') + '-' + (lap ?? 0);
  m.onBeforeCompile = (sh, r) => {
    base(sh, r);
    if (lap === 'brick') {
      // brick: courses in running bond, a little life in each brick, the mortar settling to the
      // brick's own tone where it gets finer than a pixel (so nothing shimmers)
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float by = vObjY / 0.32, row = floor(by);
          float bx = vWin.x * ${cell[0].toFixed(2)} / 0.66 + 0.5 * mod(row, 2.0);
          vec2 bw = max(fwidth(vec2(bx, by)), vec2(1e-4));
          float far = smoothstep(0.18, 0.45, max(bw.x, bw.y));
          float mort = max(1.0 - smoothstep(0.0, max(0.08, bw.y * 1.5), fract(by)), 1.0 - smoothstep(0.0, max(0.05, bw.x * 1.5), fract(bx)));
          float tone = 0.92 + 0.14 * wh(vec2(floor(bx), row) + vec2(3.1, 7.7));
          float wallK = step(abs(vUp), 0.5);
          diffuseColor.rgb *= mix(1.0, mix(tone * (1.0 - 0.32 * mort), 0.95, far), wallK); }`);
      return;
    }
    if (!lap) return;
    // siding: a shadow line under each board, settling to its average where it gets finer than a pixel
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float lp = vObjY / ${lap.toFixed(3)}; float lw = max(fwidth(lp), 1e-4); float lf = fract(lp);
        float line = 1.0 - smoothstep(0.0, max(0.12, lw * 1.5), lf);
        diffuseColor.rgb *= 1.0 - step(abs(vUp), 0.5) * mix(0.16 * line, 0.04, smoothstep(0.25, 0.6, lw)); }`);
  };
  return m;
}
// three colours a vertex can carry are keys for the instance's own: walls, roof, accent
function keyedMaterial(o = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000, side: o.side ?? THREE.FrontSide });
  m.customProgramCacheKey = () => 'nh-key-' + (o.name || '');
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; attribute vec3 aTint2; attribute vec3 aTint3; varying vec3 vTA; varying vec3 vTB; varying vec3 vTC;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTA = aTint; vTB = aTint2; vTC = aTint3;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTA; varying vec3 vTB; varying vec3 vTC;')
      .replace('#include <color_fragment>', `
        vec3 vcol = vColor.rgb;
        float kA = step(0.995, vcol.r) * step(vcol.g, 0.005) * step(vcol.b, 0.005);
        float kB = step(0.995, vcol.b) * step(vcol.r, 0.005) * step(vcol.g, 0.005);
        float kC = step(0.995, vcol.g) * step(vcol.r, 0.005) * step(vcol.b, 0.005);
        diffuseColor.rgb *= mix(mix(mix(vcol, vTA, kA), vTB, kB), vTC, kC);`);
  };
  return m;
}
const KEY = { aTint: 3, aTint2: 3, aTint3: 3 };
const TT = { aTint: 3 };
const VC = (M, key, o = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.75, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000, side: o.side ?? THREE.FrontSide, flatShading: !!o.flat }));
const KM = (M) => M.nhKey || (M.nhKey = keyedMaterial());
// the shared clock every moving thing here reads
function clocked(M) { return M.nhU || (M.nhU = { uTime: { value: 0 }, uGust: { value: 0 }, uBeat: { value: 0 }, uPhase: { value: 0 }, uFog: { value: new THREE.Color() }, uFogD: { value: 0.001 }, uSun: { value: new THREE.Color(1, 1, 1) }, uSky: { value: new THREE.Color(0.6, 0.75, 1) } }); }
// trees that sway, and bow together on the beat in a chorus
function treeMaterial(M) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true });
  const U = clocked(M);
  m.customProgramCacheKey = () => 'nh-tree';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uGust = U.uGust;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint; uniform float uTime, uGust;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vTint = aTint;
        vec3 wp0 = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float hh = max(position.y - 3.5, 0.0);
        float ph = wp0.x * 0.045 + wp0.z * 0.037;
        float sw = sin(uTime * 1.4 + ph) * 0.55 + sin(uTime * 2.3 + ph * 1.7) * 0.25 + uGust * 1.7;
        transformed.x += hh * hh * 0.0045 * sw;
        transformed.z += hh * hh * 0.003 * sin(uTime * 1.1 + ph * 2.0);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;');
  };
  return m;
}
// bunting and banners: cloth that flutters
function clothMaterial(M) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
  const U = clocked(M);
  m.customProgramCacheKey = () => 'nh-cloth';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uGust = U.uGust;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime, uGust;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float tip = clamp(-(position.y + (1.0 - position.x * position.x)) / 0.9, 0.0, 1.0);
        transformed.z += tip * (sin(uTime * 7.0 + position.x * 9.0) * 0.28 + uGust * 0.55);`);
  };
  return m;
}
// the water: a stream from the hydrant over the road, a slug of it on every beat
function waterMaterial(M) {
  const U = clocked(M);
  return new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */`
      attribute vec2 aWake; uniform float uPhase;
      varying vec2 vUv; varying float vK; varying float vSlug; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        vUv = uv; vK = aWake.x;
        float front = fract(uPhase + aWake.y);
        float slug = exp(-pow((uv.x - front) * 6.0, 2.0));
        vSlug = slug;
        // a tight jet from the nozzle that opens out as it falls, fatter where the beat's slug is
        vec3 pos = position + normal * (-0.08 + 0.55 * uv.x * uv.x + 0.32 * slug) * step(0.01, aWake.x);
        vec4 w = modelMatrix * instanceMatrix * vec4(pos, 1.0); vW = w.xyz;
        vec4 mv = viewMatrix * w;
        vV = -mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFogD; uniform vec3 uSun, uSky, uFog;
      varying vec2 vUv; varying float vK; varying float vSlug; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        if (vK < 0.01) discard;
        float u = vUv.x;
        float f = abs(dot(normalize(vN), normalize(vV)));
        // ropes of white water running along it, breaking up toward the far end
        float s1 = fract(u * 11.0 - uTime * 3.6 + vUv.y * 0.31);
        float s2 = fract(u * 23.0 - uTime * 5.3 + vUv.y * 0.73 + 0.37);
        float rope = smoothstep(0.0, 0.35, s1) * smoothstep(1.0, 0.55, s1) * 0.6 + smoothstep(0.1, 0.4, s2) * smoothstep(0.9, 0.6, s2) * 0.4;
        float core = smoothstep(0.12, 0.7, f) * (1.0 - 0.5 * u * u * (1.0 - rope));
        // it reaches as far as the hydrant's opened (vK), the far end breaking into spray
        float reach = 1.0 - smoothstep(vK * 1.1 - 0.12, vK * 1.1, u);
        float ends = smoothstep(0.0, 0.025, u) * (1.0 - smoothstep(0.84, 1.0, u));
        float a = (0.12 + 0.62 * core * (0.55 + 0.45 * rope) + 0.4 * vSlug * core) * ends * reach;
        vec3 col = mix(uSky * 0.4 + vec3(0.52, 0.6, 0.64), vec3(1.0), 0.5 + 0.5 * rope * core);
        col *= 0.92 + 0.3 * vSlug;
        col += uSun * pow(f, 8.0) * 0.18 * rope;
        float d = length(cameraPosition - vW); float fg = 1.0 - exp(-pow(d * uFogD, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fg, 0.0, 1.0)), clamp(a, 0.0, 0.9));
      }`,
    transparent: true, depthWrite: false,
  });
}
// pictures, pages and boards: one texture, a cell an instance (aIdx), lit by itself, in the fog
function cellMaterial(M, map, cols, o = {}) {
  const U = clocked(M);
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uK: { value: o.k ?? 1 }, uFog: U.uFog, uFogD: U.uFogD },
    vertexShader: `attribute float aIdx; varying vec2 vUv; varying vec3 vW; void main(){ vUv = vec2((aIdx + uv.x) / ${cols.toFixed(1)}, uv.y); vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uK, uFogD; uniform vec3 uFog; varying vec2 vUv; varying vec3 vW; void main(){ vec4 c = texture2D(uMap, vUv); ${o.cut ? 'if (c.a < 0.35) discard;' : ''} float d = length(cameraPosition - vW); float f = 1.0 - exp(-pow(d * uFogD, 1.5)); gl_FragColor = vec4(mix(c.rgb * uK, uFog, clamp(f, 0.0, 1.0)), ${o.cut ? 'c.a' : '1.0'}); }`,
    side: THREE.DoubleSide, transparent: !!o.cut,
  });
}
// light falling from a lamp: a soft cone, brightest at the bulb
function coneMaterial(M) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(1, 0.9, 0.62) }, uK: { value: 1 } },
    vertexShader: `attribute vec2 aWake; varying float vL; varying vec3 vN; varying vec3 vV; varying float vK; void main(){ vL = -position.y; vK = aWake.x; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uK; varying float vL; varying vec3 vN; varying vec3 vV; varying float vK; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 2.0) * pow(1.0 - clamp(vL, 0.0, 1.0), 1.4) * vK * uK * 0.5; gl_FragColor = vec4(uCol * a, 1.0); }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}
// soap bubbles: thin, a rainbow sheen at the edges
function bubbleMaterial(M) {
  const U = clocked(M);
  return new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime },
    vertexShader: `attribute vec2 aWake; varying vec3 vN; varying vec3 vV; varying float vK; varying float vS; void main(){ vK = aWake.x; vS = aWake.y; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vK; varying float vS; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float rim = pow(max(1.0 - f, 0.0), 2.2); vec3 film = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + rim * 1.6 + vS + uTime * 0.1)); vec3 c = film * rim * 1.1 + vec3(1.0) * pow(max(f, 0.0), 40.0) * 0.6; gl_FragColor = vec4(c, (rim * 0.75 + 0.05) * vK); }`,
    transparent: true, depthWrite: false,
  });
}
// the rainbow over a chorus
function rainbowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uK; varying vec2 vUv; void main(){ float r = vUv.y; vec3 c = clamp(abs(fract(vec3(0.0, 0.33, 0.67) + (1.0 - r) * 0.78) * 6.0 - 3.0) - 1.0, 0.0, 1.0); float band = smoothstep(0.0, 0.12, r) * smoothstep(1.0, 0.82, r); float ends = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x); gl_FragColor = vec4(c * band * ends * uK * 0.32, 1.0); }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
}

// ---------- geometry made here ----------
// the stream's path: a parabola 24 m across from the hydrant's nozzle, 9.4 m high in the middle
function arcGeometry(span = 24, h = 9.4, r = 0.24) {
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(new THREE.Vector3(-span / 2 + span * u, 0.6 + h * (1 - Math.pow(2 * u - 1, 2)), 0)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 44, r, 6, false);
}
// a white dove: a body, two wings out flat (they beat in the material)
function doveGeometry() {
  const parts = [];
  parts.push(paint(sph(0.22, 1, 0.8, 2.2, 0, 0, 0, 8, 6), [0.96, 0.96, 0.94]));
  parts.push(paint(sph(0.14, 1, 1, 1, 0, 0.12, 0.5, 6, 5), [0.96, 0.96, 0.94]));
  const w = new THREE.BufferGeometry();
  w.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, -1.3, 0.05, -0.1, 0, 0, -0.3, 0, 0, 0.25, 0, 0, -0.3, 1.3, 0.05, -0.1], 3));
  w.computeVertexNormals(); parts.push(paint(w, [0.98, 0.98, 0.97]));
  parts.push(paint(new THREE.ConeGeometry(0.18, 0.6, 5).rotateX(-Math.PI / 2).translate(0, 0, -0.65), [0.92, 0.92, 0.9]));
  return merge(parts);
}
function doveMaterial(M) {
  const U = clocked(M);
  // white even against a sunset: they carry some light of their own
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x9a9a96 });
  m.customProgramCacheKey = () => 'nh-dove';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = instanceMatrix[3][0] * 0.37 + instanceMatrix[3][2] * 0.21;
        transformed.y += sin(uTime * 19.0 + ph) * abs(position.x) * 0.75;`);
  };
  return m;
}
// a main-street building: shop window and awning below (the shared store/awning layers fit
// its front at z 7), a row or two of windows above, a cornice along the top
function mainGeometry(floors) {
  const H = floors === 3 ? 12.9 : 9.5, parts = [];
  parts.push(bare(box(13.4, H, 14, 0, H / 2, 0)));
  parts.push(bare(box(13.9, 0.7, 0.9, 0, H - 0.1, 7.1)));
  parts.push(bare(box(13.6, 0.28, 0.3, 0, 4.75, 7.1)));
  for (const x of [-6.55, 6.55]) parts.push(bare(box(0.4, H - 0.4, 0.3, x, (H - 0.4) / 2, 7.1)));
  return merge(parts);
}
// on top of a main-street building: brackets under the cornice, a parapet, lintels over the windows
function mainTrim(floors, v) {
  const H = floors === 3 ? 12.9 : 9.5, parts = [], stone = [0.9, 0.87, 0.8];
  for (let k = 0; k < 9; k++) parts.push(paint(box(0.28, 0.5, 0.5, -6 + k * 1.5, H - 0.62, 7.35), stone));
  if (v === 0) { parts.push(paint(box(13.9, 1.2, 0.5, 0, H + 0.6, 6.9), [1, 0, 0])); parts.push(paint(box(4.6, 1.6, 0.52, 0, H + 1.6, 6.9), [1, 0, 0])); parts.push(paint(box(5.0, 0.25, 0.7, 0, H + 2.45, 6.95), stone)); }
  else if (v === 1) { const a = new THREE.CylinderGeometry(3.2, 3.2, 0.5, 20, 1, false, -Math.PI / 2, Math.PI); a.rotateX(Math.PI / 2); a.translate(0, H + 0.2, 6.9); parts.push(paint(a, [1, 0, 0])); parts.push(paint(box(13.9, 0.5, 0.5, 0, H + 0.45, 6.9), stone)); }
  else { for (let k = 0; k < 7; k++) parts.push(paint(box(1.2, 0.8, 0.5, -6 + k * 2, H + 0.6, 6.9), [1, 0, 0])); }
  for (const row of floors === 3 ? [0, 1] : [0]) for (const x of [-3.9, -1.3, 1.3, 3.9]) parts.push(paint(box(2.1, 0.32, 0.3, x, 5.6 + row * 3.4 + 2.6, 7.12), stone));
  return merge(parts);
}

// ---------- placing ----------
// kits here put things on the town's own ground, which rises and falls with the song
function onGround(S) {
  const c = S.course; prepare(c, S.plan);
  return (it) => { if (it.h === undefined) it.h = groundAt(c, it.t, it.x); S.items.push(it); return it; };
}
// a zone can keep a stretch clear, on one side, for a set-piece: clear: [[t0, t1, side], ...]
const cleared = (z, t, side, all) => (z.clear || []).some(([a, b, sd, how]) => t > a && t < b && (!sd || sd === side) && (!all || how === 'all'));
// the height of the ribbon over the street here, and the beat position of a song time
const ribbonY = (S, t) => S.course.sample(t).y;
// a panel facing the rider coming up the road, turned a little toward the road
function facing(S, it, turn = 0.5) {
  const h = S.course.sample(it.t).yaw;
  (S._nhE || (S._nhE = new THREE.Euler())).set(0, h + Math.PI + (it.x > 0 ? -turn : turn), 0);
  return (S._nhQf || (S._nhQf = new THREE.Quaternion())).setFromEuler(S._nhE);
}
const qOf = (S, k, x, y, z, order = 'XYZ') => { const e = S['_nhEe' + k] || (S['_nhEe' + k] = new THREE.Euler()); e.set(x, y, z, order); return (S['_nhQq' + k] || (S['_nhQq' + k] = new THREE.Quaternion())).setFromEuler(e); };
const v3 = (S, k) => S['_nhV' + k] || (S['_nhV' + k] = new THREE.Vector3());
// make sure a part's layers exist from the scenery's first pass, even ones it only draws now and then
const touch = (S, ...ks) => { for (const k of ks) void S.layers[k]; };
// a point on the road (the pre-pass has no track yet)
const along = (S, t, x, out) => (S.track ? S.track.ground(t, x, out) : out.set(0, -500, 0));
// the song's own loudness at a time, from the beat data (0..1), and the low and the high
function music(S, t) {
  const c = S.course, ch = c.chart, b = c.beatAt(t), i = Math.floor(b) - c.beatOffset, f = b - Math.floor(b);
  const at = (arr) => { if (!arr || !arr.length) return 0.4; const a = arr[clamp(i, 0, arr.length - 1)], bb = arr[clamp(i + 1, 0, arr.length - 1)]; return a + (bb - a) * f; };
  return [at(ch.energy), at(ch.low), at(ch.high)];
}
// how the lift's going right now (the world writes it each frame), and the section at a time
const liftK = (S) => S.nhLift || 0;
const lifting = (S, t) => { const k = S.course.sectionAt(t).kind; return k === 'chorus' || k === 'final'; };

// the town's colours
const FACADES = [0xa8543e, 0xe6d8bc, 0x9aae96, 0x8aa2bc, 0xd4ac5c, 0x8a5a46, 0xc88a74, 0xe8e0d0];
const AWNINGS = [0x2a5a3a, 0x8a2030, 0x204a6a, 0xd86a3a, 0xf2efe6, 0x3a3a46];
const WALLS = [0xf6f2e8, 0xe8dcc8, 0xc8d8e4, 0xf2e2b8, 0xd8e4d0, 0xf0d0d4, 0xe0e6ee, 0xcfc4b4, 0xb8cce0, 0xf4ecd8];
const ROOFS = [0x4a4a52, 0x5a3a32, 0x3a4a5a, 0x6a5a4a, 0x7a3a2a, 0x3a4a3a];
const ACCENTS = [0x1a3a2a, 0x2a2a30, 0x6a1a1a, 0x1a2a4a, 0x2a4a3a, 0x8a2a1a];
const GREENS = [[0.95, 1, 0.92], [1.06, 1, 0.84], [0.9, 1.06, 0.96], [1.1, 0.98, 0.8]];
const KINDS = ['nhColonial', 'nhBungalow', 'nhRanch', 'nhCape'];
const INKS = [[0.8, 0.06, 0.08], [0.08, 0.12, 0.45], [0.06, 0.06, 0.07]];
const WIDE = { nhColonial: 16.5, nhBungalow: 11.5, nhRanch: 22.5, nhCape: 11.5 };

const HG = (M, k) => (M.nhHG || (M.nhHG = {}))[k] || (M.nhHG[k] = HOUSES[k]());
const house = (kind) => ({ nhColonial: 'colonial', nhBungalow: 'bungalow', nhRanch: 'ranch', nhCape: 'cape' }[kind]);

extend({
  layers: {
    // the houses: walls with lit windows, and the rest (roof, trim, porch, flowers) in keyed colours
    nhColonial: (M) => [HG(M, 'colonial').walls, M.nhWalls || (M.nhWalls = wallsMaterial(M.P, [2.4, 2.9], { floors: 2, sill: 0.9 }, 0.24)), 160, { aWake: 3, aTint: 3 }],
    nhBungalow: (M) => [HG(M, 'bungalow').walls, M.nhWalls || (M.nhWalls = wallsMaterial(M.P, [2.4, 2.9], { floors: 2, sill: 0.9 }, 0.24)), 160, { aWake: 3, aTint: 3 }],
    nhRanch: (M) => [HG(M, 'ranch').walls, M.nhWalls || (M.nhWalls = wallsMaterial(M.P, [2.4, 2.9], { floors: 2, sill: 0.9 }, 0.24)), 160, { aWake: 3, aTint: 3 }],
    nhCape: (M) => [HG(M, 'cape').walls, M.nhWalls || (M.nhWalls = wallsMaterial(M.P, [2.4, 2.9], { floors: 2, sill: 0.9 }, 0.24)), 160, { aWake: 3, aTint: 3 }],
    nhColonialX: (M) => [HG(M, 'colonial').rest, KM(M), 160, KEY],
    nhBungalowX: (M) => [HG(M, 'bungalow').rest, KM(M), 160, KEY],
    nhRanchX: (M) => [HG(M, 'ranch').rest, KM(M), 160, KEY],
    nhCapeX: (M) => [HG(M, 'cape').rest, KM(M), 160, KEY],
    // trees
    nhMaple: (M) => [TREES.maple(), M.nhTreeM || (M.nhTreeM = treeMaterial(M)), 1100, TT],
    nhElm: (M) => [TREES.elm(), M.nhTreeM || (M.nhTreeM = treeMaterial(M)), 600, TT],
    nhSpruce: (M) => [TREES.spruce(), M.nhTreeM || (M.nhTreeM = treeMaterial(M)), 400, TT],
    // the street
    nhLamp: (M) => [STREET.lamp(), VC(M, 'nhVC'), 420, {}],
    nhHydrant: (M) => [STREET.hydrant(), VC(M, 'nhVC'), 240, {}],
    nhMailbox: (M) => [STREET.mailbox(), KM(M), 420, KEY],
    nhBin: (M) => [STREET.bin(), KM(M), 260, KEY],
    nhFlamingo: (M) => [STREET.flamingo(), VC(M, 'nhVC'), 160, {}],
    nhBunting: (M) => [STREET.bunting(), M.nhCloth || (M.nhCloth = clothMaterial(M)), 140, {}],
    nhLine: (M) => [STREET.line(), VC(M, 'nhVC'), 140, {}],
    nhWater: (M) => [arcGeometry(), M.nhWaterM || (M.nhWaterM = waterMaterial(M)), 120, { aWake: 2 }],
    nhSalute: (M) => [arcGeometry(44, 18, 0.7), M.nhWaterM || (M.nhWaterM = waterMaterial(M)), 6, { aWake: 2 }],
    nhSprinkler: (M) => [arcGeometry(9, 3.6, 0.08).translate(4.5, 0, 0), M.nhWaterM || (M.nhWaterM = waterMaterial(M)), 90, { aWake: 2 }],
    nhDove: (M) => [doveGeometry(), M.nhDoveM || (M.nhDoveM = doveMaterial(M)), 64, {}],
    // main street
    nhMain2: (M) => [mainGeometry(2), M.nhMainW || (M.nhMainW = wallsMaterial(M.P, [2.6, 3.4], { floors: 2, sill: 5.6 }, 'brick')), 170, { aWake: 3, aTint: 3 }],
    nhMain3: (M) => [mainGeometry(3), M.nhMainW || (M.nhMainW = wallsMaterial(M.P, [2.6, 3.4], { floors: 2, sill: 5.6 }, 'brick')), 170, { aWake: 3, aTint: 3 }],
    nhTrim20: (M) => [mainTrim(2, 0), KM(M), 70, KEY], nhTrim21: (M) => [mainTrim(2, 1), KM(M), 70, KEY], nhTrim22: (M) => [mainTrim(2, 2), KM(M), 70, KEY],
    nhTrim30: (M) => [mainTrim(3, 0), KM(M), 70, KEY], nhTrim31: (M) => [mainTrim(3, 1), KM(M), 70, KEY], nhTrim32: (M) => [mainTrim(3, 2), KM(M), 70, KEY],
    // (funeral.js hangs its labels on this one too: keep its name and shape)
    wallSign: (M) => [new THREE.PlaneGeometry(7.5, 2.35), M.sign, 200, { aIdx: 1, aWake: 2 }],
    nhBladeArm: (M) => [(() => { const g = box(0.08, 0.08, 1.6, 0, 0.7, 0); return merge([bare(g), bare(box(0.05, 1.4, 0.05, 0, 0, 0.75))]); })(), M.metal, 200, TT],
    // set-pieces
    nhTooth: (M) => [SETS.tooth(), M.nhEnamel || (M.nhEnamel = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0xfff8f0, emissiveIntensity: 0.22 })), 8, {}],
    nhToothPole: (M) => [SETS.toothPole(), M.metal, 8, TT],
    nhPancakes: (M) => [SETS.pancakes(), VC(M, 'nhGlossVC', { rough: 0.45 }), 3, {}],
    nhCafeTable: (M) => [(() => { const p = []; p.push(bare(cyl(0.55, 0.55, 0.05, 16, 0, 0.74, 0)), bare(cyl(0.04, 0.04, 0.72, 6, 0, 0.36, 0)), bare(cyl(0.28, 0.3, 0.04, 12, 0, 0.02, 0))); for (const z of [-0.8, 0.8]) { p.push(bare(box(0.42, 0.05, 0.42, 0, 0.46, z)), bare(box(0.42, 0.45, 0.04, 0, 0.7, z + Math.sign(z) * 0.2))); } return merge(p); })(), M.metal, 80, TT],
    nhLampShade: (M) => [SETS.lampShade(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhBulb: (M) => [SETS.bulb(), M.nhBulbM || (M.nhBulbM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.75).multiplyScalar(3) })), 4, {}],
    nhCone: (M) => [SETS.lightCone(), M.nhConeM || (M.nhConeM = coneMaterial(M)), 4, { aWake: 2 }],
    nhReceipt: (M) => [SETS.receipt(), M.nhReceiptM || (M.nhReceiptM = new THREE.MeshStandardMaterial({ map: CANVAS.receipt(), roughness: 0.9, side: THREE.DoubleSide, emissive: 0x3a3a38 })), 4, {}],
    nhClip: (M) => [SETS.clip(), VC(M, 'nhVC'), 4, {}],
    nhMirrorFrame: (M) => [SETS.mirrorFrame(), VC(M, 'nhGlossVC', { rough: 0.45 }), 4, {}],
    nhMirrorFace: (M) => [SETS.mirrorFace(), M.nhMirrorM || (M.nhMirrorM = cellMaterial(M, CANVAS.mirror(), 3, { k: 1.15 })), 4, { aIdx: 1 }],
    nhCalBlock: (M) => [SETS.calendarBlock(), VC(M, 'nhVC'), 2, {}],
    nhCalPage: (M) => [SETS.calendarPage(), M.nhCalM || (M.nhCalM = cellMaterial(M, CANVAS.calendar(), 8, { k: 1.05 })), 16, { aIdx: 1 }],
    nhGlassRim: (M) => [SETS.glassRim(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhLens: (M) => [SETS.lens(), M.nhLensM || (M.nhLensM = new THREE.MeshStandardMaterial({ map: CANVAS.fingerprint(), color: 0xd8ecf4, transparent: true, opacity: 0.85, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false })), 2, {}],
    nhCarWash: (M) => [SETS.carWash(), VC(M, 'nhVC'), 2, {}],
    nhBrush: (M) => [SETS.brush(), VC(M, 'nhVC'), 6, {}],
    nhBubble: (M) => [SETS.bubble(), M.nhBubbleM || (M.nhBubbleM = bubbleMaterial(M)), 160, { aWake: 2 }],
    nhPolygraph: (M) => [SETS.polygraph(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhChart: (M) => [SETS.chartFace(), M.nhChartM || (M.nhChartM = new THREE.MeshBasicMaterial({ map: CANVAS.chart() })), 2, {}],
    nhPen: (M) => [SETS.pen(), VC(M, 'nhVC'), 6, {}],
    nhInk: (M) => [SETS.ink(), M.nhInkM || (M.nhInkM = (() => { const m = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;'); }; return m; })()), 240, TT],
    nhCloset: (M) => [SETS.closet(), VC(M, 'nhVC'), 2, {}],
    nhClosetDoor: (M) => [SETS.closetDoor(), VC(M, 'nhVC'), 4, {}],
    nhBalloon: (M) => [SETS.balloon(), M.nhBalloonM || (M.nhBalloonM = keyedMaterial({ rough: 0.3, name: 'balloon' })), 220, KEY],
    nhChurch: (M) => [SETS.church(), VC(M, 'nhVC'), 2, {}],
    nhBell: (M) => [SETS.bell(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhBoardFrame: (M) => [SETS.boardFrame(), VC(M, 'nhVC'), 6, {}],
    nhBoardBless: (M) => [SETS.boardFace(), M.nhBlessM || (M.nhBlessM = new THREE.MeshBasicMaterial({ map: CANVAS.letterBoard(['I WROTE IT', 'AS A BLESSING'], { seed: 3 }) })), 2, {}],
    nhBoardSummons: (M) => [SETS.boardFace(), M.nhSummonsM || (M.nhSummonsM = new THREE.MeshBasicMaterial({ map: CANVAS.letterBoard(['YOU READ IT', 'AS A SUMMONS'], { seed: 9, bg: '#1e3a2c', ink: '#f2efe2', rule: 'rgba(255,255,255,0.06)' }) })), 2, {}],
    nhHoop: (M) => [SETS.hoop(), M.nhHoopM || (M.nhHoopM = keyedMaterial({ rough: 0.35, name: 'hoop', emissive: 0x111111 })), 8, KEY],
    nhCinema: (M) => [SETS.cinema(), VC(M, 'nhVC'), 2, {}],
    nhBlade: (M) => [merge([paint(box(3.6, 15, 1.1, 0, 0, 0), [0.14, 0.08, 0.1]), paint(box(3.9, 0.4, 1.3, 0, 7.6, 0), [1, 0.76, 0.3]), paint(box(3.9, 0.4, 1.3, 0, -7.6, 0), [1, 0.76, 0.3])]), VC(M, 'nhVC'), 2, {}],
    nhPaper: (M) => [(() => { const g = new THREE.PlaneGeometry(9, 12, 1, 6); const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 3) p[i + 2] = -Math.abs(p[i]) * 0.12 + Math.sin(p[i + 1] * 0.4) * 0.15; g.computeVertexNormals(); g.translate(0, 9, 0); return g; })(), M.nhPaperM || (M.nhPaperM = new THREE.MeshStandardMaterial({ map: CANVAS.newspaper(['NOTHING', 'NEW']), roughness: 0.9, side: THREE.DoubleSide, emissive: 0x2a2a28 })), 2, {}],
    nhPaperStand: (M) => [merge([paint(box(0.4, 3.2, 0.4, -3, 1.6, -0.4), [0.3, 0.3, 0.32]), paint(box(0.4, 3.2, 0.4, 3, 1.6, -0.4), [0.3, 0.3, 0.32]), paint(box(9.6, 0.4, 1.2, 0, 3.1, -0.3), [0.3, 0.3, 0.32])]), VC(M, 'nhVC'), 2, {}],
    nhShades: (M) => [SETS.shades(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhHat: (M) => [SETS.hat(), VC(M, 'nhVC'), 2, {}],
    nhShredder: (M) => [SETS.shredder(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhFolder: (M) => [new THREE.PlaneGeometry(9, 12.4), M.nhFolderM || (M.nhFolderM = new THREE.MeshStandardMaterial({ map: CANVAS.folder(), roughness: 0.85, side: THREE.DoubleSide, emissive: 0x3a3020 })), 2, {}],
    nhStrip: (M) => [SETS.strip(), M.nhStripM || (M.nhStripM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x404040 })), 200, {}],
    nhDoorFrame: (M) => [SETS.doorFrame(), VC(M, 'nhVC'), 2, {}],
    nhDoor: (M) => [SETS.door(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhFrame: (M) => [SETS.frame(), M.nhGold || (M.nhGold = tintMaterial(0xffffff, { rough: 0.32, metal: 0.25, emissive: 0x7a5214 })), 12, TT],
    nhFrameWire: (M) => [SETS.frameWire(), M.metal, 12, TT],
    nhPicture: (M) => [SETS.picture(), M.nhPicM || (M.nhPicM = cellMaterial(M, CANVAS.paintings(), 6, { k: 1.1 })), 12, { aIdx: 1 }],
    nhCourthouse: (M) => [SETS.courthouse(), VC(M, 'nhVC'), 2, {}],
    nhClock: (M) => [SETS.clockFace(), M.nhClockM || (M.nhClockM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.96, 0.85).multiplyScalar(1.3) })), 2, {}],
    nhCourtWords: (M) => [(() => { const g = new THREE.PlaneGeometry(16, 1.3); g.translate(0, 18.4, 13.72); return g; })(), M.nhCourtM || (M.nhCourtM = new THREE.MeshBasicMaterial({ map: CANVAS.letterBoard(['COURT ADJOURNED'], { bg: '#e8e4d8', ink: '#3a3a40', rule: 'rgba(0,0,0,0)', size: 150 }) })), 2, {}],
    nhGavel: (M) => [SETS.gavel(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhGavelBlock: (M) => [SETS.block(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhFireTruck: (M) => [SETS.fireTruck(), VC(M, 'nhGlossVC', { rough: 0.45 }), 4, {}],
    nhTape: (M) => [SETS.tape(), M.nhTapeM || (M.nhTapeM = new THREE.MeshBasicMaterial({ map: CANVAS.tape(), side: THREE.DoubleSide })), 4, {}],
    nhRibbon: (M) => [SETS.ribbonHalf(), VC(M, 'nhGlossVC', { rough: 0.45 }), 4, {}],
    nhBow: (M) => [SETS.bow(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhRoadPole: (M) => [SETS.roadPole(), M.metal, 60, TT],
    nhRoadFace: (M) => [SETS.roadFace(), M.sign, 60, { aIdx: 1, aWake: 2 }],
    nhTownPosts: (M) => [SETS.townSignPosts(), VC(M, 'nhVC'), 2, {}],
    nhTownFace: (M) => [SETS.townSignFace(), M.nhTownM || (M.nhTownM = new THREE.MeshBasicMaterial({ map: CANVAS.townSign(['NOW LEAVING'], 'DRIVE SAFELY') })), 2, {}],
    nhThread: (M) => [SETS.thread(), M.nhThreadM || (M.nhThreadM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff1a28).multiplyScalar(1.3) })), 900, {}],
    nhPin: (M) => [SETS.pin(), M.nhThreadM || (M.nhThreadM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff1a28).multiplyScalar(1.3) })), 400, {}],
    nhPolaroid: (M) => [SETS.polaroid(), KM(M), 200, KEY],
    nhStall: (M) => [(() => { const p = [bare(box(3.2, 0.9, 1.4, 0, 0.45, 0))]; for (const x of [-1.5, 1.5]) for (const z of [-0.65, 0.65]) p.push(bare(cyl(0.04, 0.04, 2.6, 5, x, 1.3, z))); return merge(p); })(), M.wood, 130, TT],
    nhCanopy: (M) => [(() => { const parts = []; for (let k = 0; k < 6; k++) parts.push(paint(box(0.6, 0.12, 2.0, -1.5 + k * 0.6, 0, 0), k % 2 ? [1, 1, 1] : [1, 0, 0])); const g = merge(parts); g.rotateX(0.18); g.translate(0, 2.62, 0); return g; })(), KM(M), 130, KEY],
    nhProduce: (M) => [(() => { const p = []; for (let k = 0; k < 14; k++) p.push(bare(new THREE.SphereGeometry(0.12 + (k % 3) * 0.02, 8, 6).translate(-1.3 + (k % 7) * 0.43, 0.98, -0.3 + Math.floor(k / 7) * 0.5))); return merge(p); })(), M.cloth, 130, TT],
    nhParade: (M) => [donutGeometry().scale(9, 9, 9), VC(M, 'nhGlossVC', { rough: 0.45 }), 4, {}],
    nhHand: (M) => [SETS.redHand(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhPhone: (M) => [SETS.phone(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhHandset: (M) => [SETS.handset(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
    nhBench: (M) => [SETS.bench(), VC(M, 'nhVC'), 12, {}],
    nhStoneWall: (M) => [SETS.stoneWall(), VC(M, 'nhVC'), 170, {}],
    nhViewer: (M) => [SETS.viewer(), VC(M, 'nhGlossVC', { rough: 0.45 }), 2, {}],
  },
  parts: {
    // ---- the town ----
    nhHouse(S, it, p, q, yaw) {
      touch(S, ...KINDS, ...KINDS.map((k) => k + 'X'));
      const m = S._m, s = it.s ?? 1;
      m.compose(p, q, S._s.set(s, s, s));
      S.layers[it.kind].add(m, { aWake: [it.wakeNow, it.seed, 0], aTint: it.tint });
      S.layers[it.kind + 'X'].add(m, { aTint: it.tint, aTint2: it.roofTint, aTint3: it.accent });
      // the porch light, once it's dusk
      const nk = Math.min(1.1, S.P.windowK ?? 0.1);
      if (nk > 0.3) { const w = local(p, yaw, it.kind === 'nhRanch' ? 2.4 * s : 0, 2.9 * s, (it.kind === 'nhBungalow' ? 7.0 : 5.4) * s, S._o); glowAt(S, w.x, w.y, w.z, 1.5 * s, col(S.P.window), (0.3 + 1.2 * it.wakeNow) * nk); }
    },
    nhTree(S, it, p, q, yaw) {
      touch(S, 'nhMaple', 'nhElm', 'nhSpruce', 'blob');
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.s * (it.sy ?? 1), it.s)); S.layers[it.kind].add(m, { aTint: it.tint });
      if (it.blob) { const o = v3(S, 'b'); o.copy(p); o.y += 0.07; m.compose(o, q, S._s.set(it.s * 8, 1, it.s * 8)); S.layers.blob.add(m, { aWake: [0.26 + 0.12 * (S.P.sunK ?? 1) / 3, 0] }); }
    },
    nhLamp(S, it, p, q, yaw) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.nhLamp.add(m);
      const nk = 0.25 + 0.75 * clamp((S.P.windowK ?? 0.1), 0, 1);
      glowAt(S, p.x, p.y + 5.3, p.z, 2.6, col(S.P.lamp), (0.3 + 0.9 * it.wakeNow) * nk, S.beatLamps ? 4 : 0);
      if (nk > 0.5) poolAt(S, p.x, p.y + 0.06, p.z, 10, col(S.P.lamp), (0.2 + 0.6 * it.wakeNow) * nk);
    },
    nhMailbox(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1.3, 1.3, 1.3)); S.layers.nhMailbox.add(m, { aTint: it.tint, aTint2: it.tint, aTint3: it.tint }); },
    nhBin(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1.2, 1.2, 1.2)); S.layers.nhBin.add(m, { aTint: it.tint, aTint2: it.tint, aTint3: it.tint }); },
    nhFlamingo(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1.5, 1.5, 1.5)); S.layers.nhFlamingo.add(m); },
    // a hydrant at the curb; in a chorus it opens and throws its water over the road on the beat
    nhHydrant(S, it, p, q, yaw) {
      const m = S._m; m.compose(p, q, S._s.set(1.5, 1.5, 1.5)); S.layers.nhHydrant.add(m);
      const on = it.wet ? clamp(liftK(S) * 1.4, 0, 1) * (lifting(S, it.t) ? 1 : 0) : 0;
      // the stream: from this side over to the other, high enough to clear her. The 24 m arc
      // is centred on the road, its nozzle end (-x) turned to this hydrant's side
      const sy = clamp((ribbonY(S, it.t) - p.y + 5.6) / 9.4, 0.7, 2.2);
      const wq = qOf(S, 'w', 0, S.course.sample(it.t).yaw + (it.x > 0 ? 0 : Math.PI), 0);
      const c = along(S, it.t, 0, v3(S, 'wc')); c.y = p.y;
      m.compose(c, wq, S._s.set(1, sy, 1));
      S.layers.nhWater.add(m, { aWake: [on, it.ph] });
      if (on > 0.05) {
        // the glitter in the slug as it goes over, and the splash where it comes down
        const ry = S.course.sample(it.t).yaw + (it.x > 0 ? 0 : Math.PI), us = (((S.course.beatAt(S.tNow ?? 0) / 2) % 1) + it.ph) % 1;
        for (let k = 0; k < 4; k++) {
          const u = us + (k - 1.5) * 0.035; if (u <= 0.02 || u >= 0.95 || u > on * 1.1) continue;
          const g = local(c, ry, -12 + 24 * u, (0.6 + 9.4 * (1 - (2 * u - 1) ** 2)) * sy, (k - 1.5) * 0.15, v3(S, 'wg'));
          glowAt(S, g.x, g.y, g.z, 1.1, [1, 1, 1], 0.55 * on);
        }
        if (on > 0.9) { const g = local(c, ry, 11.2, 0.8, 0, v3(S, 'ws')); glowAt(S, g.x, g.y, g.z, 3.4, [0.9, 0.95, 1], 0.35 + 0.4 * Math.exp(-Math.pow((us - 0.92) * 8, 2))); }
      }
    },
    // pennants across the road, over her head
    nhBunting(S, it, p, q, yaw) {
      const m = S._m, half = it.half ?? 14;
      const y = Math.max(it.h + 8.5, ribbonY(S, it.t) + 6.0);
      const o = v3(S, 'bu'); o.copy(p); o.y = y;
      const bq = qOf(S, 'bu', 0, S.course.sample(it.t).yaw, 0);
      m.compose(o, bq, S._s.set(half, it.sag ?? 1.4, 1)); S.layers.nhLine.add(m); S.layers.nhBunting.add(m);
    },
    // a main-street building with its shop and its sign (and every other one a sign hung out over the sidewalk)
    nhMain(S, it, p, q, yaw) {
      touch(S, 'nhMain2', 'nhMain3', 'nhTrim20', 'nhTrim21', 'nhTrim22', 'nhTrim30', 'nhTrim31', 'nhTrim32', 'wallSign', 'nhBladeArm');
      const m = S._m, s = it.s ?? 1;
      m.compose(p, q, S._s.set(s, 1, 1)); S.layers[it.tall ? 'nhMain3' : 'nhMain2'].add(m, { aWake: [it.wakeNow, it.seed, 0], aTint: it.tint });
      S.layers[(it.tall ? 'nhTrim3' : 'nhTrim2') + it.trim].add(m, { aTint: it.tint, aTint2: it.tint, aTint3: it.tint });
      S.layers.store.add(m, { aWake: [0.2 + 0.8 * it.wakeNow, (it.seed * 7.31) % 1, 0] });
      S.layers.awning.add(m, { aTint: it.awning });
      if (it.idx === undefined) return;
      const w = local(p, yaw, 0, 5.25, 7.27, S._o);
      m.compose(w, q, S._s.set(0.62, 0.62, 1)); S.layers.wallSign.add(m, { aIdx: it.idx, aWake: [0.5 + 0.5 * it.wakeNow, 0] });
      if (!it.blade) return;
      const b = local(p, yaw, 4.6 * s * (it.x > 0 ? 1 : -1), 6.9, 8.0, S._o);
      const fq = qOf(S, 'mb', 0, S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -0.25 : 0.25), 0);
      m.compose(b, fq, S._s.set(0.4, 0.4, 1)); S.layers.wallSign.add(m, { aIdx: it.idx, aWake: [0.5 + 0.5 * it.wakeNow, 0] });
      S._o.y += 0.5; m.compose(S._o, q, S._s.set(1, 1, 1)); S.layers.nhBladeArm.add(m, { aTint: [0.18, 0.18, 0.2] });
    },
    // a lamp post with the red string run from it to the next one, pinned under the globe, a photo on it now and then
    nhStringPost(S, it, p, q, yaw) {
      touch(S, 'nhThread', 'nhPolaroid');
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.nhLamp.add(m);
      const top = v3(S, 'st').set(p.x, p.y + 4.6, p.z);
      m.makeTranslation(top.x, top.y, top.z); S.layers.nhPin.add(m);
      const nk = 0.25 + 0.75 * clamp((S.P.windowK ?? 0.1), 0, 1);
      glowAt(S, p.x, p.y + 5.3, p.z, 2.6, col(S.P.lamp), (0.3 + 0.9 * it.wakeNow) * nk, S.beatLamps ? 4 : 0);
      if (!it.next || !S.track || it.t > (S.tNow ?? 0) + 18) return;
      const n = S.track.ground(it.next.t, it.next.x, v3(S, 'sn')); n.y = (it.next.h ?? 0) + 4.6;
      const mid = v3(S, 'sm'); mid.copy(top).add(n).multiplyScalar(0.5); mid.y -= 1.0;
      for (const [a, b] of [[top, mid], [mid, n]]) {
        const d = v3(S, 'sd').copy(b).sub(a); const len = d.length(); if (len < 0.01) continue;
        const qq = S._nhQs || (S._nhQs = new THREE.Quaternion());
        qq.setFromUnitVectors(S._nhZ || (S._nhZ = new THREE.Vector3(0, 0, 1)), d.normalize());
        m.compose(a, qq, S._s.set(1, 1, len)); S.layers.nhThread.add(m);
      }
      if (it.photo) { m.compose(mid, q, S._s.set(1.6, 1.6, 1.6)); S.layers.nhPolaroid.add(m, { aTint: it.photo, aTint2: it.photo, aTint3: it.photo }); }
    },
    // a road sign, turned to you a little
    nhRoadsign(S, it, p) {
      const fq = facing(S, it, 0.35), m = S._m, s = it.s ?? 1.6; m.compose(p, fq, S._s.set(s, s, s));
      S.layers.nhRoadPole.add(m, { aTint: [0.6, 0.62, 0.66] }); S.layers.nhRoadFace.add(m, { aIdx: it.idx, aWake: [0.55, 0] });
    },
    nhCafeTable(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1.2, 1.2, 1.2)); S.layers.nhCafeTable.add(m, { aTint: [0.85, 0.85, 0.82] }); },
    nhStall(S, it, p, q) {
      const m = S._m, s = it.s ?? 1.4; m.compose(p, q, S._s.set(s, s, s));
      S.layers.nhStall.add(m, { aTint: [0.62, 0.46, 0.3] }); S.layers.nhCanopy.add(m, { aTint: it.tint, aTint2: it.tint, aTint3: it.tint }); S.layers.nhProduce.add(m, { aTint: it.fruit });
    },
    nhBench(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.nhBench.add(m); },

    // ---- the set-pieces ----
    // the dentist's teeth, bouncing on the beat, a glint on the crown
    nhTooth(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, b = S.beat ?? 0;
      m.compose(p, q, S._s.set(s, s, s)); S.layers.nhToothPole.add(m, { aTint: [0.7, 0.72, 0.76] });
      const o = v3(S, 'to'); o.copy(p); o.y += 6.8 * s * (1 - 0.04 * b);
      const tq = qOf(S, 'to', 0, yaw + Math.sin((S.tNow ?? 0) * 1.3 + it.t) * 0.25, 0);
      m.compose(o.set(p.x, p.y - 0.4 * b * s, p.z), tq, S._s.set(s * (1 + 0.05 * b), s * (1 - 0.06 * b), s * (1 + 0.05 * b))); S.layers.nhTooth.add(m);
      const g = local(p, yaw, 0.9 * s, 10.6 * s, 1.2 * s, v3(S, 'tg')); glowAt(S, g.x, g.y, g.z, 3.2 * s, [1, 1, 1], 0.25 + 1.2 * b);
    },
    nhPancakes(S, it, p, q) { const m = S._m, s = it.s ?? 1, b = S.beat ?? 0; m.compose(p, q, S._s.set(s, s * (1 + 0.03 * b), s)); S.layers.nhPancakes.add(m); },
    // the interrogation lamp: swinging a little on its cord, its light falling on the road
    nhInterrogation(S, it, p, q, yaw) {
      const m = S._m, T = S.tNow ?? 0, sw = Math.sin(T * 1.6 + 0.4) * 0.07;
      const o = v3(S, 'il'); o.copy(p);
      const lq = qOf(S, 'il', sw, yaw, sw * 0.6);
      m.compose(o, lq, S._s.set(1, 1, 1)); S.layers.nhLampShade.add(m); S.layers.nhBulb.add(m);
      const night = clamp((S.P.windowK ?? 0.1), 0, 1);
      const reach = it.h - it.floor + 1;
      m.compose(o, lq, S._s.set(5.6 + reach * 0.35, reach, 5.6 + reach * 0.35)); S.layers.nhCone.add(m, { aWake: [0.25 + 0.75 * night, 0] });
      glowAt(S, o.x, o.y + 0.5, o.z, 7, [1, 0.92, 0.7], 0.8 + 0.8 * night);
      poolAt(S, o.x, it.floor + 0.05, o.z, 16 + reach * 0.4, [1, 0.88, 0.6], 0.5 + 1.0 * night);
    },
    // receipts hanging over the road from a wire, curling, turning in the air
    nhReceipt(S, it, p, q, yaw) {
      const m = S._m, T = S.tNow ?? 0;
      const rq = qOf(S, 'rc', Math.sin(T * 1.9 + it.t) * 0.08, yaw + Math.PI + Math.sin(T * 0.9 + it.t * 3) * 0.35, Math.sin(T * 1.3 + it.t) * 0.05);
      m.compose(p, rq, S._s.set(it.s ?? 1, it.s ?? 1, it.s ?? 1)); S.layers.nhReceipt.add(m); S.layers.nhClip.add(m);
    },
    // the dressing-room mirror, the bulbs round it blinking on the beat
    nhMirror(S, it, p, q, yaw) {
      const fq = facing(S, it, 0.45), m = S._m, s = it.s ?? 1;
      m.compose(p, fq, S._s.set(s, s, s)); S.layers.nhMirrorFrame.add(m); S.layers.nhMirrorFace.add(m, { aIdx: it.pose });
      const by = S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -0.45 : 0.45), bi = Math.floor(S.course.beatAt(S.tNow ?? 0));
      const bulbs = [];
      for (let k = 0; k < 7; k++) bulbs.push([-4.2 + k * 1.4, 16.5]);
      for (let k = 0; k < 6; k++) { bulbs.push([-5.2, 5 + k * 2.1]); bulbs.push([5.2, 5 + k * 2.1]); }
      bulbs.forEach(([x, y], k) => { const w = local(p, by, -x * s, y * s, 0.6 * s, v3(S, 'mi')); glowAt(S, w.x, w.y, w.z, 1.1 * s, [1, 0.85, 0.6], (k + bi) % 2 ? 1.5 : 0.55); });
    },
    // the tear-off calendar: the week flying off it a page a beat
    nhCalendar(S, it, p, q, yaw) {
      const fq = facing(S, it, 0.35), m = S._m, s = it.s ?? 1, T = S.tNow ?? 0, c = S.course;
      m.compose(p, fq, S._s.set(s, s, s)); S.layers.nhCalBlock.add(m);
      const by = c.sample(it.t).yaw + Math.PI + (it.x > 0 ? -0.35 : 0.35);
      const b0 = c.nearestBeatIndex(it.from), b1 = c.nearestBeatIndex(it.to), bn = Math.floor(c.beatAt(T));
      const torn = clamp(bn - b0 + 1, 0, b1 - b0);
      const day = (it.day0 + torn) % 7;
      const face = local(p, by, 0, -0.6 * s, 0.05, v3(S, 'cf'));
      m.compose(face, fq, S._s.set(s, s, s)); S.layers.nhCalPage.add(m, { aIdx: day });
      // the pages in the air: torn on their beat, blown out over the road and back at you, turning
      for (let k = Math.max(0, torn - 7); k < torn; k++) {
        const tb = c.beats[b0 + k], age = T - tb; if (age < 0 || age > 2.4) continue;
        const u = age / 2.4, R = seeded(31 + k * 7); R();
        const w = along(S, it.t - age * (0.5 + R() * 0.3), it.x * (1 - 0.45 * age) + Math.sin(age * 3 + k) * 2.5, v3(S, 'cp'));
        w.y = it.h + (-1 + age * 4.5 - age * age * 1.7) * s;
        const pq = qOf(S, 'cp', age * (3 + R() * 2), by + age * (2 + R() * 3), age * (1.5 + R()));
        m.compose(w, pq, S._s.set(s * (1 - 0.3 * u), s * (1 - 0.3 * u), s)); S.layers.nhCalPage.add(m, { aIdx: (it.day0 + k) % 7 });
      }
    },
    // the magnifying glass over the road, the fingerprint in its lens
    nhGlass(S, it, p, q, yaw) {
      const m = S._m, T = S.tNow ?? 0, s = it.s ?? 1;
      const gq = qOf(S, 'mg', 0.05 * Math.sin(T * 1.2), yaw + Math.PI + 0.12 * Math.sin(T * 0.8), -0.62 + 0.05 * Math.sin(T * 1.7));
      m.compose(p, gq, S._s.set(s, s, s)); S.layers.nhGlassRim.add(m); S.layers.nhLens.add(m);
      const g = v3(S, 'mg2'); g.copy(p); g.y += 4 * s; glowAt(S, g.x, g.y, g.z, 4 * s, [1, 1, 1], 0.4 + 0.8 * (S.beat ?? 0));
    },
    // the car wash: its brushes turning, bubbles drifting out over the road
    nhCarWash(S, it, p, q, yaw) {
      touch(S, 'nhBubble');
      const m = S._m, T = S.tNow ?? 0, c = S.course;
      m.compose(p, q, S._s.set(1, 1, 1)); S.layers.nhCarWash.add(m);
      for (const [bx, bz] of [[-4.5, 9], [4.5, 9], [-4.5, 2], [4.5, 2]]) { const w = local(p, yaw, bx, 0.2, bz, v3(S, 'cw')); m.compose(w, qOf(S, 'cw', 0, T * 6 * (bx > 0 ? 1 : -1), 0), S._s.set(1, 1, 1)); S.layers.nhBrush.add(m); }
      // the bubbles: blown out of the tunnel's mouth, rising and drifting across the road
      const R = seeded(77), sideSign = it.x > 0 ? -1 : 1;
      for (let k = 0; k < 120; k++) {
        const t0 = it.from + R() * (it.to - it.from), life = 3.5 + R() * 2.5, age = T - t0, sz = 0.5 + R() * 1.3, ph = R();
        if (age < 0 || age > life) { R(); R(); continue; }
        const off = (R() - 0.5) * 1.6, rise = 2 + R() * 4;
        const x = it.x + sideSign * (age * (6 + R() * 4)), y = it.h + 2 + age * rise * 0.6 + Math.sin(age * 2 + k) * 0.6;
        const w = along(S, it.t + off * 0.5 + age * 0.05, x, v3(S, 'bb')); w.y = Math.max(y, ribbonY(S, it.t) + 1.5 + age * rise * 0.5);
        const k2 = Math.min(1, age * 3) * Math.min(1, (life - age) * 2);
        m.compose(w, q, S._s.set(sz, sz, sz)); S.layers.nhBubble.add(m, { aWake: [k2, ph] });
      }
    },
    // the lie detector: the chart scrolling, its pens drawing the song (loudness, the low, the high)
    nhPolygraph(S, it, p, q, yaw) {
      const tn = it.turn ?? 0.6, fq = facing(S, it, tn), m = S._m, s = it.s ?? 1, T = S.tNow ?? 0;
      m.compose(p, fq, S._s.set(s, s, s)); S.layers.nhPolygraph.add(m); S.layers.nhChart.add(m);
      if (S.nhChartTex) S.nhChartTex.offset.x = T * 0.4;
      const by = S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -tn : tn);
      // three needles: the song's loudness, its low end, its top. They jump on every beat and
      // scrawl hard between them, the way a lie looks on one of these
      const N = 40, dt = 0.06, pts = [[], [], []], c = S.course;
      for (let j = 0; j <= N; j++) {
        const tj = T - j * dt, mu = music(S, tj), bf = c.beatAt(tj) % 1, kick = Math.exp(-bf * 7);
        for (let r = 0; r < 3; r++) {
          const jag = Math.sin(tj * (41 + r * 17)) * 0.5 + Math.sin(tj * (97 + r * 29)) * 0.35;
          pts[r].push([8.4 - j * (16.4 / N), 12.4 - r * 3.0 + (mu[r] - 0.45) * 2.6 + jag * (0.25 + 1.1 * mu[r]) * (0.5 + kick) + (r === 0 ? kick * 1.1 : 0)]);
        }
      }
      const a = v3(S, 'pa'), b = v3(S, 'pb'), d = v3(S, 'pd');
      for (let r = 0; r < 3; r++) {
        for (let j = 0; j < N; j++) {
          const [x0, y0] = pts[r][j], [x1, y1] = pts[r][j + 1];
          local(p, by, -x0 * s, y0 * s, -0.3 * s, a); local(p, by, -x1 * s, y1 * s, -0.3 * s, b);
          d.copy(a).add(b).multiplyScalar(0.5);
          const len = a.distanceTo(b), ang = Math.atan2(y1 - y0, -(x1 - x0) * 1);
          m.compose(d, qOf(S, 'ink', 0, by, ang), S._s.set(len + 0.08, 0.3 * s, 1)); S.layers.nhInk.add(m, { aTint: INKS[r] });
        }
        const [px, py] = pts[r][0]; local(p, by, -(px + 0.2) * s, py * s, 0.2 * s, a); m.compose(a, qOf(S, 'pen', 0, by, -0.1), S._s.set(s, s, s)); S.layers.nhPen.add(m);
      }
    },
    // the closet: rattling on the beat while he's hiding, then the doors fly open and out come the balloons
    nhCloset(S, it, p, q, yaw) {
      const tn = it.turn ?? 0.55, fq = facing(S, it, tn), m = S._m, s = it.s ?? 1, T = S.tNow ?? 0, b = S.beat ?? 0;
      m.compose(p, fq, S._s.set(s, s, s)); S.layers.nhCloset.add(m);
      const by = S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -tn : tn);
      // shut and rattling while he hides (harder the nearer it gets), then flung open
      const open = T < it.open ? 0.035 * b * (T > it.open - 4 ? 1 : 0.3) : smooth(it.open, it.open + 0.35, T) * 1.95;
      for (const sd of [-1, 1]) {
        const h = local(p, by, sd * 4.6 * s, 8.6 * s, 0.25 * s, v3(S, 'cd'));
        const dy = sd < 0 ? by - open : by + Math.PI + open;
        m.compose(h, qOf(S, 'cd' + sd, 0, dy, 0), S._s.set(s, s, s)); S.layers.nhClosetDoor.add(m);
      }
    },
    // balloons let go at a moment, rising and drifting, each its own colour
    nhBalloons(S, it, p, q, yaw) {
      touch(S, 'nhBalloon');
      const m = S._m, T = S.tNow ?? 0, age0 = T - it.at;
      if (age0 < -0.05 && !it.tied) return;
      const R = seeded(it.seed ?? 5), cols = [[0.95, 0.15, 0.25], [1, 0.8, 0.15], [0.2, 0.55, 1], [0.3, 0.85, 0.45], [0.95, 0.45, 0.8], [1, 0.55, 0.15], [0.6, 0.35, 0.95], [1, 1, 1]];
      const by = S.course.sample(it.t).yaw;
      for (let k = 0; k < it.n; k++) {
        const d = R() * (it.delay ?? 0.4), rise = (4 + R() * 3) * (it.rise ?? 1), sx = (R() - 0.5) * (it.spread ?? 6), sz = (R() - 0.5) * (it.spread ?? 6), c = cols[Math.floor(R() * cols.length)], ph = R() * 6.28, sc = (it.size ?? 1.3) * (0.8 + R() * 0.4);
        const age = Math.max(0, age0 - d);
        if (age0 < d && !it.tied) continue;
        const up = age * rise + age * age * 0.4 * (it.rise ?? 1);
        if (up > 70) continue;
        const w = local(p, by, sx + Math.sin(age * 1.3 + ph) * age * 0.8 + (it.drift ?? 0) * age, 2 + up + Math.sin(age * 2 + ph) * 0.3, sz + age * (it.wind ?? 1.5), v3(S, 'bl'));
        m.compose(w, qOf(S, 'bl', Math.sin(age * 2 + ph) * 0.2, ph, Math.cos(age * 1.7 + ph) * 0.2), S._s.set(sc, sc, sc)); S.layers.nhBalloon.add(m, { aTint: c, aTint2: c, aTint3: c });
      }
    },
    // the white church, the bell in its steeple swinging on the line
    nhChurch(S, it, p, q, yaw) {
      touch(S, 'nhDove');
      const m = S._m, T = S.tNow ?? 0, s = it.s ?? 1;
      m.compose(p, q, S._s.set(s, s, s)); S.layers.nhChurch.add(m);
      let sw = 0; for (const tb of it.bells) if (T > tb) sw += Math.sin((T - tb) * 7) * Math.exp(-(T - tb) * 0.9) * 0.9;
      const bp = local(p, yaw, 0, 19.6 * s, 10 * s, v3(S, 'cb'));
      m.compose(bp, qOf(S, 'cb', sw, yaw, 0), S._s.set(s, s, s)); S.layers.nhBell.add(m);
      // on the first bell the doves go up out of the belfry and over the road
      const age0 = T - it.bells[0];
      if (age0 > 0 && age0 < 7) {
        const R = seeded(57);
        for (let k = 0; k < 26; k++) {
          const d = R() * 0.5, age = age0 - d, a = (R() - 0.5) * 2.2, sp = 7 + R() * 6, up = 2 + R() * 3, ph = R() * 6.28;
          if (age < 0) continue;
          const w = local(bp, yaw, Math.sin(a) * sp * age, up * age + Math.sin(age * 3 + ph) * 0.6, Math.cos(a) * sp * age, v3(S, 'dv'));
          const dq = qOf(S, 'dv', -0.25, yaw + a, Math.sin(age * 2 + ph) * 0.3, 'YXZ');
          const sc = 1.5 * Math.min(1, age * 4);
          m.compose(w, dq, S._s.set(sc, sc, sc)); S.layers.nhDove.add(m);
        }
      }
    },
    // the phone she tells it all on: ringing, the handset jumping in its cradle on every beat
    nhPhone(S, it, p, q, yaw) {
      const tn = 0.6, fq = facing(S, it, tn), m = S._m, s = it.s ?? 1, T = S.tNow ?? 0, b = S.beat ?? 0;
      m.compose(p, fq, S._s.set(s, s, s)); S.layers.nhPhone.add(m);
      const by = S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -tn : tn), ring = T > it.ring ? 1 : 0.25;
      const h = local(p, by, 0, (5.0 + 0.9 * b * ring) * s, -0.6 * s, v3(S, 'ph'));
      m.compose(h, qOf(S, 'ph', 0, by, Math.sin(T * 31) * 0.08 * b * ring), S._s.set(s, s, s)); S.layers.nhHandset.add(m);
      if (ring > 0.5) glowAt(S, h.x, h.y + 2 * s, h.z, 5 * s, [1, 0.7, 0.85], 0.3 + 1.2 * b);
    },
    // a flock of doves let go at a moment from a point, up and out over the road
    nhFlock(S, it, p, q, yaw) {
      touch(S, 'nhDove');
      const T = S.tNow ?? 0, age0 = T - it.at, m = S._m; if (age0 < 0 || age0 > 7) return;
      const R = seeded(it.seed ?? 77), ry = S.course.sample(it.t).yaw;
      for (let k = 0; k < (it.n ?? 24); k++) {
        const d = R() * 0.4, age = age0 - d, a = (R() - 0.5) * 2.6, sp = 8 + R() * 7, up = 1.2 + R() * 2.4, ph = R() * 6.28;
        if (age < 0) continue;
        const w = local(p, ry, Math.sin(a) * sp * age * 0.6, up * age + Math.sin(age * 3 + ph) * 0.6, (Math.cos(a) * 0.5 + 0.6) * sp * age, v3(S, 'fk'));
        const sc = 1.15 * Math.min(1, age * 4);
        m.compose(w, qOf(S, 'fk', -0.3, ry + a * 0.5, Math.sin(age * 2 + ph) * 0.3, 'YXZ'), S._s.set(sc, sc, sc)); S.layers.nhDove.add(m);
      }
    },
    // a sprinkler on a lawn: its fan of water sweeping across and back once a bar
    nhSprinkler(S, it, p, q, yaw) {
      const m = S._m, c = S.course, bar = (c.beatAt(S.tNow ?? 0) / 4 + it.ph) % 1;
      const sw = Math.sin(bar * Math.PI * 2) * 1.05;
      m.compose(p, qOf(S, 'sp', 0, S.course.sample(it.t).yaw + Math.PI / 2 + (it.x > 0 ? sw : -sw), 0), S._s.set(1, 1, 1));
      S.layers.nhSprinkler.add(m, { aWake: [it.on ?? 1, it.ph] });
    },
    // a letter board on its posts, turned to you
    nhBoard(S, it, p) { touch(S, 'nhBoardBless', 'nhBoardSummons'); const fq = facing(S, it, 0.4), m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.nhBoardFrame.add(m); S.layers[it.face].add(m); },
    // hoops over the road: the loopholes. Each one flashes as its beat comes round
    nhHoop(S, it, p, q, yaw) {
      const m = S._m, T = S.tNow ?? 0, near = Math.exp(-Math.pow((T - it.t) * 3, 2));
      const hq = qOf(S, 'hp', 0, S.course.sample(it.t).yaw, (T - it.t) * 0.6);
      m.compose(p, hq, S._s.set(1 + 0.08 * near, 1 + 0.08 * near, 1)); S.layers.nhHoop.add(m, { aTint: it.tint, aTint2: it.tint, aTint3: it.tint });
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + T * 0.6; const w = local(p, S.course.sample(it.t).yaw, Math.cos(a) * 9, Math.sin(a) * 9, 0, v3(S, 'hg')); glowAt(S, w.x, w.y, w.z, 2.2, it.tint, 0.3 + 2.2 * near + 0.5 * (S.beat ?? 0)); }
    },
    // the picture house: the marquee's bulbs chasing round on the beat
    nhCinema(S, it, p, q, yaw) {
      touch(S, 'nhBlade');
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.nhCinema.add(m);
      const w = local(p, yaw, 0, 6.2, 13.92, S._o); m.compose(w, q, S._s.set(1.9, 1.3, 1)); S.layers.wallSign.add(m, { aIdx: it.idx, aWake: [1, 0] });
      // the blade: out over the sidewalk at the near end, square to the street so it faces up it at you
      const ry = S.course.sample(it.t).yaw, near = it.x > 0 ? 1 : -1;
      const bp = local(p, yaw, near * 7.5, 15, 10.6, v3(S, 'cb2'));
      m.compose(bp, qOf(S, 'cb2', 0, ry, 0), S._s.set(1, 1, 1)); S.layers.nhBlade.add(m);
      const tf = local(p, yaw, near * 7.5, 15, 10.6, v3(S, 'ct')); const tq = qOf(S, 'ct', 0, ry + Math.PI, -Math.PI / 2, 'YXZ');
      const off = v3(S, 'co').set(0, 0, -0.62).applyQuaternion(qOf(S, 'cz', 0, ry, 0)); tf.add(off);
      m.compose(tf, tq, S._s.set(1.55, 1.05, 1)); S.layers.wallSign.add(m, { aIdx: it.idx, aWake: [1, 0] });
      const bi = Math.floor(S.course.beatAt(S.tNow ?? 0) * 2);
      for (let k = 0; k < 22; k++) for (const yy of [4.25, 8.15]) { const x = -7.8 + k * (15.6 / 21); const g = local(p, yaw, x, yy, 13.95, v3(S, 'cg')); glowAt(S, g.x, g.y, g.z, 0.9, [1, 0.82, 0.45], (k + bi) % 3 === 0 ? 1.9 : 0.35); }
      // and the blade's own bulbs, running up its edges
      for (let k = 0; k < 12; k++) for (const e of [-1.5, 1.5]) { const g = local(bp, ry, e, -6.6 + k * 1.2, -0.7, v3(S, 'cbl')); glowAt(S, g.x, g.y, g.z, 0.8, [1, 0.85, 0.5], (k + bi) % 2 ? 1.6 : 0.4); }
    },
    nhNewspaper(S, it, p) { const fq = facing(S, it, 0.3), m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.nhPaper.add(m); S.layers.nhPaperStand.add(m); },
    // the disguise: the hat and the sunglasses over the road, bobbing on the beat
    nhDisguise(S, it, p, q, yaw) {
      const m = S._m, T = S.tNow ?? 0, b = S.beat ?? 0, s = it.s ?? 1;
      const dq = qOf(S, 'dg', 0, S.course.sample(it.t).yaw + Math.PI, Math.sin(T * 1.1) * 0.05);
      const o = v3(S, 'dg'); o.copy(p); o.y += 0.25 * b;
      m.compose(o, dq, S._s.set(s, s, s)); S.layers.nhShades.add(m);
      o.y += 7.8 * s + 0.5 * b; m.compose(o, qOf(S, 'dh', -0.08, S.course.sample(it.t).yaw + Math.PI, Math.sin(T * 1.1) * 0.05), S._s.set(s, s, s)); S.layers.nhHat.add(m);
      for (const sd of [-1, 1]) { const g = local(p, S.course.sample(it.t).yaw, sd * 7 * s, 1.5 * s, 0.6, v3(S, 'dl')); glowAt(S, g.x, g.y, g.z, 3 * s, [1, 1, 1], 0.2 + 1.6 * b * b); }
    },
    // the shredder: the folder going in, the strips coming out on every beat
    nhShredder(S, it, p, q, yaw) {
      touch(S, 'nhFolder', 'nhStrip');
      const tn = it.turn ?? 0.65, fq = facing(S, it, tn), m = S._m, s = it.s ?? 1, T = S.tNow ?? 0;
      m.compose(p, fq, S._s.set(s, s, s)); S.layers.nhShredder.add(m);
      const by = S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -tn : tn);
      const feed = clamp((T - it.from) / (it.to - it.from), 0, 1);
      // the folder, upright over the slot, going down into it as the line goes on
      const fs = 0.72 * s, fh = 12.4 * fs;
      const f = local(p, by, 0, 16.4 * s + fh / 2 - fh * feed, 0.2 * s, v3(S, 'sf'));
      m.compose(f, qOf(S, 'sf', -0.12, by, Math.sin(T * 9) * 0.02 * (feed > 0 && feed < 1 ? 1 : 0)), S._s.set(fs, fs, fs)); if (feed < 1) S.layers.nhFolder.add(m);
      const R = seeded(9);
      for (let k = 0; k < 70; k++) {
        const t0 = it.from + R() * (it.to - it.from + 1.5), age = T - t0, life = 2.2 + R(), x = (R() - 0.5) * 11, sp = 8 + R() * 8;
        if (age < 0 || age > life) continue;
        const w = local(p, by, x * s, (6 - age * 1.5 - age * age * 3) * s, (4.6 + age * sp) * s, v3(S, 'ss'));
        m.compose(w, qOf(S, 'ss', age * 3 + k, by + k, age * 5), S._s.set(1.2 * s, (3 + R() * 2) * s, s)); S.layers.nhStrip.add(m);
      }
    },
    // the door in its frame over the road: held open, swinging shut behind her
    // held wide open toward her as she comes, easing in a little; once she's through it slams
    nhDoor(S, it, p, q, yaw) {
      const m = S._m, T = S.tNow ?? 0, s = it.s ?? 1, sx = it.sx ?? 1, ry = S.course.sample(it.t).yaw;
      m.compose(p, qOf(S, 'df', 0, ry, 0), S._s.set(sx, s, s)); S.layers.nhDoorFrame.add(m);
      const shut = it.shut;
      const ang = T < shut ? 2.1 - 0.35 * smooth(shut - 3.5, shut, T) : Math.max(0, 1.75 - Math.pow((T - shut) / 0.3, 2) * 1.75) + Math.max(0, Math.sin((T - shut - 0.3) * 18) * Math.exp(-(T - shut - 0.3) * 8) * 0.06) * (T > shut + 0.3 ? 1 : 0);
      const h = local(p, ry, 8.4 * sx, 0, 0, v3(S, 'dh2'));
      m.compose(h, qOf(S, 'dd', 0, ry + Math.PI - ang, 0), S._s.set(sx, s, s)); S.layers.nhDoor.add(m);
    },
    // a gilded frame hanging in the hall, its picture in it
    nhHallFrame(S, it, p, q, yaw) {
      const fq = facing(S, it, 0.4), m = S._m, s = it.s ?? 1, T = S.tNow ?? 0;
      const o = v3(S, 'hf'); o.copy(p); const sw = Math.sin(T * 1.2 + it.t * 5) * 0.04;
      const hq = qOf(S, 'hf', 0, S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -0.4 : 0.4), sw);
      m.compose(o, hq, S._s.set(s, s, s)); S.layers.nhFrame.add(m, { aTint: [1, 0.78, 0.36] }); S.layers.nhFrameWire.add(m, { aTint: [0.12, 0.1, 0.08] }); S.layers.nhPicture.add(m, { aIdx: it.pic });
    },
    // the big frame you fly through
    nhBigFrame(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, it.sy ?? s, s)); S.layers.nhFrame.add(m, { aTint: [1, 0.78, 0.36] }); S.layers.nhFrameWire.add(m, { aTint: [0.12, 0.1, 0.08] }); },
    // the courthouse, COURT ADJOURNED over its columns, the clock lit
    nhCourthouse(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.nhCourthouse.add(m); S.layers.nhClock.add(m); S.layers.nhCourtWords.add(m); },
    // the gavel: up, then down on its block on the beat of "adjourned"
    // the gavel: its pivot out at the side, the head 16 m along its handle over the road's edge.
    // It's raised slowly through "court", then comes down on its block on "adjourned"
    nhGavel(S, it, p, q, yaw) {
      const m = S._m, T = S.tNow ?? 0, s = it.s ?? 1, ry = S.course.sample(it.t).yaw, sd = it.x > 0 ? 1 : -1;
      const hit = it.hit;
      const ang = T < hit - 0.22 ? 1.35 * smooth(hit - 2.6, hit - 0.5, T) + 0.12 : T < hit ? 1.47 * (1 - Math.pow((T - (hit - 0.22)) / 0.22, 2)) : Math.max(0, Math.sin((T - hit) * 14) * Math.exp(-(T - hit) * 9) * 0.1);
      // its +z (the handle, toward the head) turned in toward the road
      m.compose(p, qOf(S, 'gv', -ang, ry + sd * Math.PI / 2, 0, 'YXZ'), S._s.set(s, s, s)); S.layers.nhGavel.add(m);
      const bl = along(S, it.t, it.x - sd * 16 * s, v3(S, 'gb')); bl.y = it.h - (2.2 + 2.05) * s;
      m.compose(bl, qOf(S, 'gb', 0, ry, 0), S._s.set(s, s, s)); S.layers.nhGavelBlock.add(m);
      if (T > hit && T < hit + 0.5) { const k = 1 - (T - hit) / 0.5; glowAt(S, bl.x, bl.y + 2.5 * s, bl.z, 16 * s, [1, 0.92, 0.75], 1.8 * k); poolAt(S, bl.x, bl.y + 2.1 * s, bl.z, 18 * s, [1, 0.9, 0.7], 1.2 * k); }
    },
    // the fire trucks' salute: their cannons throwing two great arcs over the road
    nhFireTruck(S, it, p, q, yaw) {
      const m = S._m, T = S.tNow ?? 0, ry = S.course.sample(it.t).yaw;
      const TS = 2.1; m.compose(p, qOf(S, 'ft', 0, ry + (it.x > 0 ? 0 : Math.PI), 0), S._s.set(TS, TS, TS)); S.layers.nhFireTruck.add(m);
      for (const [x, z] of [[0.6, 3.2], [-0.6, 3.2]]) { const g = local(p, ry + (it.x > 0 ? 0 : Math.PI), x * TS, 4.8 * TS, z * TS, v3(S, 'fl')); glowAt(S, g.x, g.y, g.z, 2.4, (Math.floor(T * 4) + (x > 0 ? 1 : 0)) % 2 ? [1, 0.1, 0.08] : [0.2, 0.3, 1], 2.4); }
      // the two arcs cross over the road a little apart, from nozzles up on the ladders
      const on = smooth(it.from, it.from + 0.6, T) * (1 - smooth(it.to - 0.5, it.to, T));
      const c = along(S, it.t + (it.x > 0 ? 0.06 : -0.06), 0, v3(S, 'fc')); c.y = it.h + 6.5;
      const sy = clamp((ribbonY(S, it.t) - c.y + 9) / 17, 0.6, 2.5) * (it.x > 0 ? 1 : 0.9);
      m.compose(c, qOf(S, 'fw', 0, ry + (it.x > 0 ? 0 : Math.PI), 0), S._s.set(1, sy, 1)); S.layers.nhSalute.add(m, { aWake: [on, it.x > 0 ? 0.5 : 0] });
    },
    // police tape across the road: it snaps as she breaks through
    nhTape(S, it, p, q, yaw) {
      const m = S._m, T = S.tNow ?? 0, ry = S.course.sample(it.t).yaw, half = it.half ?? 9;
      const snap = T < it.t ? 0 : clamp((T - it.t) / 0.9, 0, 1);
      if (snap <= 0) { m.compose(p, qOf(S, 'tp', 0, ry, Math.sin(T * 9) * 0.01, 'YXZ'), S._s.set(half, 3.4, 1)); S.layers.nhTape.add(m); return; }
      // broken in the middle: each half swings down from its post, fluttering
      for (const sd of [-1, 1]) {
        const a = Math.min(1.45, snap * 2.2) + Math.sin(T * 11 + sd) * 0.06;
        const mid = local(p, ry, sd * half - sd * (half / 2) * Math.cos(a), -(half / 2) * Math.sin(a), 0, v3(S, 'tm'));
        m.compose(mid, qOf(S, 'tq' + sd, 0, ry, sd * a, 'YXZ'), S._s.set(half * 0.5, 3.4, 1)); S.layers.nhTape.add(m);
      }
    },
    // the ribbon across the start line and its bow: cut as she crosses
    nhRibbon(S, it, p, q, yaw) {
      const m = S._m, T = S.tNow ?? 0, ry = S.course.sample(it.t).yaw, half = it.half;
      const cut = clamp(T / 0.6, 0, 1) * (T > 0 ? 1 : 0);
      // each half hangs from its post (it runs +x from there, so the far post's half is turned round)
      for (const sd of [-1, 1]) {
        const post = local(p, ry, sd * half, 0, 0, v3(S, 'rb'));
        const droop = cut * 1.35 + Math.sin(T * 6 + sd) * 0.02;
        m.compose(post, qOf(S, 'rb' + sd, 0, ry + (sd > 0 ? Math.PI : 0), -droop, 'YXZ'), S._s.set(half, 1, 1)); S.layers.nhRibbon.add(m);
      }
      const b = local(p, ry, 0, cut * 2.5 - cut * cut * 9, cut * 9, v3(S, 'rw'));
      m.compose(b, qOf(S, 'rw', cut * 4, ry, cut * 2), S._s.set(1.4, 1.4, 1.4)); S.layers.nhBow.add(m);
    },
    // the town line sign
    nhTownSign(S, it, p) { const fq = facing(S, it, 0.45), m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.nhTownPosts.add(m); S.layers.nhTownFace.add(m); },
    // the parade's balloons over the road on their lines, bobbing on the beat: the donut, the red
    // hand (red-handed), the dentist's tooth (squeaky clean)
    nhParade(S, it, p, q, yaw) {
      touch(S, 'nhParade', 'nhHand', 'nhTooth');
      const m = S._m, T = S.tNow ?? 0, b = S.beat ?? 0, ry = S.course.sample(it.t).yaw;
      const o = v3(S, 'pr'); o.copy(p); o.y += Math.sin(T * 1.3 + it.t) * 0.8 + 0.4 * b;
      const k = 1 + 0.03 * b;
      if (it.kind === 'hand') { m.compose(o, qOf(S, 'pr', -0.15, ry + Math.PI + Math.sin(T * 0.8) * 0.25, Math.sin(T * 1.1) * 0.12), S._s.set(1.6 * k, 1.6 * k, 1.6 * k)); S.layers.nhHand.add(m); return; }
      if (it.kind === 'tooth') { o.y -= 25; m.compose(o, qOf(S, 'pr', 0, ry + T * 0.5, Math.sin(T * 1.1) * 0.1), S._s.set(2.4 * k, 2.4 * k, 2.4 * k)); S.layers.nhTooth.add(m); const g = v3(S, 'pg').copy(o); g.y += 25.5; glowAt(S, g.x + 1.5, g.y, g.z, 7, [1, 1, 1], 0.3 + 1.8 * b); return; }
      m.compose(o, qOf(S, 'pr', 0.6 + Math.sin(T * 0.9) * 0.1, ry + T * 0.4, Math.sin(T * 1.1) * 0.08), S._s.set(k, k, k)); S.layers.nhParade.add(m);
    },
    nhStoneWall(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.nhStoneWall.add(m); },
    nhViewer(S, it, p, q) { const m = S._m, s = it.s ?? 1.5; m.compose(p, q, S._s.set(s, s, s)); S.layers.nhViewer.add(m); },
  },
  kits: {
    // houses on lawns, picket fences and mailboxes, maples and elms; a second row behind
    nhStreet(S, z, R) {
      const push = onGround(S);
      for (const side of [-1, 1]) {
        for (let t = z.from + R() * 0.3; t < z.to;) {
          const kind = pick(R, KINDS), s = 0.92 + R() * 0.16, x = side * (25 + R() * 3);
          const step = (WIDE[kind] * s + 4 + R() * 6) / 36;
          if (!cleared(z, t, side, true)) {
            push({ t, x, rot: SIDE(side), s, parts: 'nhHouse', kind, tint: col(pick(R, WALLS)), roofTint: col(pick(R, ROOFS)), accent: col(pick(R, ACCENTS)), seed: R(), wake0: 0.08, ahead: 20 });
            // a sprinkler on its front lawn, out where you can see it over the ribbon's edge
            if (z.sprinklers && kind !== 'nhBungalow' && R() < 0.55) push({ t: t + (R() - 0.5) * 0.12, x: side * (Math.abs(x) - 4.8 * s - 1.4), ph: R(), parts: 'nhSprinkler', ahead: 12 });
            if (!cleared(z, t, side)) {
              push({ t, x: side * 14.6, rot: 0, s: 1.4, parts: 'fence', tint: col(0xf6f4ee), ahead: 13 });
              if (R() < 0.8) push({ t: t + 0.05, x: side * 13.4, rot: SIDE(side), parts: 'nhMailbox', tint: col(pick(R, [0x2a2a30, 0xe8e4dc, 0x2a4a8a, 0x8a2a2a, 0x3a6a3a])), ahead: 10 });
              if (z.bins && R() < 0.7) push({ t: t + 0.09, x: side * 12.9, rot: SIDE(side) + (R() - 0.5) * 0.4, parts: 'nhBin', tint: col(pick(R, [0x2a5a3a, 0x3a3a42, 0x2a4a7a])), ahead: 10 });
              if (R() < 0.12) for (let k = 0; k < 2 + Math.floor(R() * 2); k++) push({ t: t + 0.1 + k * 0.03, x: side * (16.5 + R() * 1.5), rot: R() * 6.28, parts: 'nhFlamingo', ahead: 10 });
              if (R() < 0.3) push({ t: t + 0.16, x: side * 18.6, rot: SIDE(side) + Math.PI / 2 + (R() - 0.5) * 0.1, parts: 'parked', tint: col(pick(R, PASTEL)), ahead: 13 });
            }
            if (R() < 0.75) { const tk = R() < 0.25 ? 'nhElm' : R() < 0.1 ? 'nhSpruce' : 'nhMaple'; push({ t: t + step * 0.5, x: side * (17.5 + R() * 2.5), rot: R() * 6.28, s: 0.8 + R() * 0.3, sy: 0.9 + R() * 0.25, parts: 'nhTree', kind: tk, tint: pick(R, GREENS), ahead: 18, blob: true }); }
          }
          // the second row and the trees behind
          if (R() < 0.7) { const k2 = pick(R, KINDS); push({ t: t + R() * 0.3, x: side * (48 + R() * 8), rot: SIDE(side), s: 0.9 + R() * 0.2, parts: 'nhHouse', kind: k2, tint: col(pick(R, WALLS)), roofTint: col(pick(R, ROOFS)), accent: col(pick(R, ACCENTS)), seed: R(), wake0: 0.06, ahead: 20 }); }
          if (R() < 0.8) push({ t: t + R() * 0.4, x: side * (36 + R() * 5), rot: R() * 6.28, s: 0.85 + R() * 0.4, sy: 0.9 + R() * 0.3, parts: 'nhTree', kind: R() < 0.3 ? 'nhElm' : 'nhMaple', tint: pick(R, GREENS), ahead: 20 });
          if (R() < 0.8) push({ t: t + R() * 0.5, x: side * (62 + R() * 80), rot: R() * 6.28, s: 0.9 + R() * 0.5, sy: 0.9 + R() * 0.3, parts: 'nhTree', kind: R() < 0.25 ? 'nhSpruce' : R() < 0.3 ? 'nhElm' : 'nhMaple', tint: pick(R, GREENS), ahead: 24 });
          t += step;
        }
      }
      if (!z.string) for (let t = z.from; t < z.to; t += 0.62) for (const side of [-1, 1]) push({ t, x: side * 11.5, rot: SIDE(side), parts: 'nhLamp', seed: R(), wake0: 0.1, ahead: 16 });
    },
    // main street: shops with their signs, a second row of houses and trees behind, benches
    nhMainStreet(S, z, R) {
      const push = onGround(S);
      const signs = z.signs || ['BARBER', 'PHARMACY', 'FLORIST', 'HARDWARE', 'BAKERY'];
      for (const side of [-1, 1]) {
        let k = side > 0 ? 2 : 0;
        for (let t = z.from + R() * 0.2; t < z.to;) {
          const s = 0.92 + R() * 0.16;
          if (!cleared(z, t, side)) push({ t, x: side * 20.2, rot: SIDE(side), s, parts: 'nhMain', tall: R() < 0.35, trim: Math.floor(R() * 3), tint: col(pick(R, FACADES)), awning: col(pick(R, AWNINGS)), seed: R(), idx: S.atlas.index[signs[k % signs.length]], blade: R() < 0.55, wake0: 0.1, ahead: 20 });
          k++;
          t += 0.215 * s + (R() < 0.12 ? 0.12 : 0.004);
        }
        for (let t = z.from + R() * 0.4; t < z.to; t += 0.55 + R() * 0.4) {
          if (R() < 0.55) push({ t, x: side * (40 + R() * 8), rot: SIDE(side), s: 0.95, parts: 'nhHouse', kind: pick(R, KINDS), tint: col(pick(R, WALLS)), roofTint: col(pick(R, ROOFS)), accent: col(pick(R, ACCENTS)), seed: R(), wake0: 0.06, ahead: 20 });
          push({ t: t + 0.25, x: side * (34 + R() * 34), rot: R() * 6.28, s: 0.8 + R() * 0.4, parts: 'nhTree', kind: R() < 0.3 ? 'nhElm' : 'nhMaple', tint: pick(R, GREENS), ahead: 20 });
        }
      }
      if (!z.string) for (let t = z.from; t < z.to; t += 0.62) for (const side of [-1, 1]) push({ t, x: side * 11.5, rot: SIDE(side), parts: 'nhLamp', seed: R(), wake0: 0.1, ahead: 16 });
    },
    // the red string: lamp posts both sides, a length of it to the next post, a photo pinned now and then
    nhEvidence(S, z, R) {
      const push = onGround(S);
      const photos = [[0.95, 0.75, 0.55], [0.55, 0.75, 0.95], [0.6, 0.85, 0.55], [0.95, 0.6, 0.7]];
      for (const side of [-1, 1]) {
        let prev = null;
        for (let t = z.from; t < z.to; t += 0.62) {
          const it = { t, x: side * 11.5, rot: SIDE(side), parts: 'nhStringPost', ahead: 16, seed: R(), wake0: 0.1, photo: R() < 0.35 ? pick(R, photos) : null };
          if (prev) prev.next = it;
          push(it); prev = it;
        }
      }
    },
    // the town's hydrants: one on every beat, the sides taking turns (the water's only in a chorus)
    nhHydrants(S, z, R) {
      const push = onGround(S), c = S.course;
      for (let b = c.nearestBeatIndex(z.from); b < c.beats.length && c.beats[b] < z.to; b++) {
        const t = c.beats[b], side = b % 2 ? 1 : -1;
        push({ t, x: side * 12.2, rot: SIDE(side), parts: 'nhHydrant', wet: true, ph: (b % 2) * 0.5, ahead: 12 });
      }
    },
    nhBunting(S, z, R) {
      const push = onGround(S);
      for (let t = z.from; t < z.to; t += z.every ?? 0.55) push({ t, x: 0, half: z.half ?? 14, sag: 1.2 + R() * 0.5, parts: 'nhBunting', ahead: 16 });
    },
    // the last houses, further apart, then fields
    nhEdge(S, z, R) {
      const push = onGround(S);
      for (const side of [-1, 1]) for (let t = z.from + R() * 0.3; t < z.to; t += 0.8 + R() * 0.9) {
        if (cleared(z, t, side, true)) { R(); R(); R(); R(); R(); continue; }
        if (R() < 0.55) push({ t, x: side * (28 + R() * 10), rot: SIDE(side), s: 0.95, parts: 'nhHouse', kind: pick(R, KINDS), tint: col(pick(R, WALLS)), roofTint: col(pick(R, ROOFS)), accent: col(pick(R, ACCENTS)), seed: R(), wake0: 0.06, ahead: 22 });
        push({ t: t + 0.3, x: side * (16 + R() * 40), rot: R() * 6.28, s: 0.8 + R() * 0.5, parts: 'nhTree', kind: R() < 0.3 ? 'nhSpruce' : 'nhMaple', tint: pick(R, GREENS), ahead: 24, blob: true });
      }
      for (let t = z.from; t < z.to; t += 0.5) for (const side of [-1, 1]) push({ t, x: side * 10.5, rot: 0, s: 1.4, parts: 'fence', tint: col(0xe8e4dc), ahead: 14 });
    },
    nhFields(S, z, R) {
      const push = onGround(S);
      for (let t = z.from; t < z.to; t += 0.3 + R() * 0.45) { const side = z.side ?? (R() < 0.5 ? -1 : 1); push({ t, x: side * (16 + Math.pow(R(), 1.3) * 120), rot: R() * 6.28, s: 0.8 + R() * 0.6, parts: 'nhTree', kind: R() < 0.35 ? 'nhSpruce' : R() < 0.3 ? 'nhElm' : 'nhMaple', tint: pick(R, GREENS), ahead: 26, blob: true }); }
      for (let t = z.from; t < z.to; t += 0.5) for (const side of [-1, 1]) push({ t, x: side * 9.5, rot: 0, s: 1.4, parts: 'fence', tint: col(0xd8d0c0), ahead: 14 });
    },
    nhSpeedSigns(S, z, R) { const push = onGround(S); for (let t = z.from; t < z.to; t += z.every ?? 2.4) push({ t, x: 10.8, s: 1.8, parts: 'nhRoadsign', idx: S.atlas.index.SPEED, ahead: 16 }); },
    // ---- set-pieces ----
    nhTeeth(S, z, R) {
      const push = onGround(S), at = [].concat(z.at), x = z.x ?? 15;
      at.forEach((t, k) => push({ t, x: (k % 2 ? -1 : 1) * x, rot: R() * 6.28, s: z.s ?? 1.6, parts: 'nhTooth', ahead: 34 }));
      const last = at[at.length - 1];
      push({ t: last + 0.3, x: 20.2, rot: SIDE(1), s: 1, parts: 'nhMain', trim: 1, tint: col(0xeef4f6), awning: col(0x2a6ad8), seed: 0.37, idx: S.atlas.index.DENTIST, blade: true, wake0: 0.4, keepLit: true, ahead: 40 });
    },
    nhBrunch(S, z, R) {
      const push = onGround(S), side = Math.sign(z.x ?? -1);
      push({ t: z.at, x: side * 20.2, rot: SIDE(side), s: 1.05, parts: 'nhMain', trim: 0, tint: col(0xf6e3b4), awning: col(0xff5a3a), seed: 0.02, idx: S.atlas.index.BRUNCH, blade: true, wake0: 0.4, keepLit: true, ahead: 40 });
      // the stack up on its roof, a roadside giant
      push({ t: z.at, x: side * 19.2, h: groundAt(S.course, z.at, side * 19.2) + 2.4, rot: 0.4, s: 1.05, parts: 'nhPancakes', ahead: 34 });
      for (let k = 0; k < 10; k++) { const t = z.at - 0.5 + k * 0.11, x = side * (13.5 + (k % 2) * 2.4); push({ t, x, rot: R() * 0.5, parts: 'nhCafeTable', ahead: 16 }); push({ t, x, rot: R() * 6.28, s: 0.85, parts: 'umbrella', tint: col(pick(R, [0xff6f6f, 0xffffff, 0x4a9adf, 0xffd166])), ahead: 16 }); }
    },
    nhInterrogation(S, z) { prepare(S.course, S.plan); const y = ribbonY(S, z.at); S.items.push({ t: z.at, x: 0, rot: 0, h: y + (z.lift ?? 8.4), floor: y, parts: 'nhInterrogation', ahead: 30 }); },
    nhReceipts(S, z) { prepare(S.course, S.plan); for (const [t, x] of z.at) S.items.push({ t, x, rot: 0, h: ribbonY(S, t) + (z.lift ?? 14.5), s: z.s ?? 1, parts: 'nhReceipt', ahead: 24 }); },
    nhMirrors(S, z) { const push = onGround(S); z.at.forEach(([t, x], k) => push({ t, x, s: z.s ?? 1, pose: k % 3, parts: 'nhMirror', ahead: 30 })); },
    nhCalendar(S, z) { const push = onGround(S); const it = push({ t: z.at, x: z.x, from: z.flip[0], to: z.flip[1], day0: z.day0 ?? 4, s: z.s ?? 1.4, parts: 'nhCalendar', ahead: 30 }); it.h += z.lift ?? 15; },
    nhGlass(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: z.x ?? 0, rot: 0, h: ribbonY(S, z.at) + (z.lift ?? 12), s: z.s ?? 1, parts: 'nhGlass', ahead: 30 }); },
    nhCarWash(S, z) { const push = onGround(S); push({ t: z.at, x: z.x, rot: SIDE(z.x), from: z.from, to: z.to, parts: 'nhCarWash', ahead: 34 }); },
    nhPolygraph(S, z) { const push = onGround(S); push({ t: z.at, x: z.x, s: z.s ?? 1.2, parts: 'nhPolygraph', ahead: 30 }); },
    nhCloset(S, z) { const push = onGround(S); push({ t: z.at, x: z.x, s: z.s ?? 1.2, open: z.open, parts: 'nhCloset', ahead: 30 }); push({ t: z.at + 0.15, x: z.x * 0.9, at: z.open, n: z.n ?? 40, delay: 0.5, spread: 8, wind: -2.5, drift: Math.sign(z.x) * 3, size: 1.5, seed: 11, parts: 'nhBalloons', ahead: 30 }); },
    nhBalloons(S, z) { const push = onGround(S); for (const b of z.list) push({ ...b, x: b.x ?? 0, h: b.lift !== undefined ? ribbonY(S, b.t) + b.lift : undefined, parts: 'nhBalloons', ahead: 34 }); },
    nhHouses(S, z) { const push = onGround(S); for (const h of z.list) push({ t: h.t, x: h.x, rot: SIDE(h.x), s: h.s ?? 1, parts: 'nhHouse', kind: h.kind, tint: col(h.tint), roofTint: col(h.roof), accent: col(h.accent), seed: 0.5, wake0: 0.3, ahead: 40 }); },
    nhChurch(S, z) { const push = onGround(S); push({ t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1.2, bells: z.bells || [], parts: 'nhChurch', ahead: 40 }); },
    nhBoards(S, z) { const push = onGround(S); for (const b of z.list) push({ t: b.t, x: b.x, s: b.s ?? 1.4, face: b.face, parts: 'nhBoard', ahead: 30 }); },
    nhHoops(S, z, R) {
      prepare(S.course, S.plan); const c = S.course, cols = [[1, 0.35, 0.55], [1, 0.8, 0.2], [0.3, 0.7, 1], [0.4, 0.95, 0.5]];
      let b = c.nearestBeatIndex(z.from), k = 0;
      for (; c.beats[b] <= z.to; b += z.every ?? 2, k++) S.items.push({ t: c.beats[b], x: 0, rot: 0, h: ribbonY(S, c.beats[b]) + 1.2, tint: cols[k % cols.length], parts: 'nhHoop', ahead: 20 });
    },
    nhCinema(S, z) { const push = onGround(S); push({ t: z.at, x: z.x, rot: SIDE(z.x), idx: S.atlas.index.MATINEE, parts: 'nhCinema', wake0: 1, keepLit: true, ahead: 40 }); },
    nhNewspaper(S, z) { const push = onGround(S); push({ t: z.at, x: z.x, s: z.s ?? 1.5, parts: 'nhNewspaper', ahead: 30 }); },
    nhDisguise(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, h: ribbonY(S, z.at) + (z.lift ?? 8), s: z.s ?? 1, parts: 'nhDisguise', ahead: 30 }); },
    nhShredder(S, z) { const push = onGround(S); push({ t: z.at, x: z.x, s: z.s ?? 1.2, from: z.from, to: z.to, parts: 'nhShredder', ahead: 30 }); },
    nhDoor(S, z) { prepare(S.course, S.plan); const g = groundAt(S.course, z.at, 0), y = ribbonY(S, z.at); S.items.push({ t: z.at, x: 0, rot: 0, h: g, s: Math.max(1, (y - g + 9) / 26), sx: Math.max(1, (S.course.sample(z.at).width + 2.2) / 9.2), shut: z.shut, parts: 'nhDoor', ahead: 30 }); },
    nhHall(S, z) { prepare(S.course, S.plan); z.list.forEach(([t, x], k) => S.items.push({ t, x, h: Math.max(groundAt(S.course, t, x) + 4, ribbonY(S, t) + 1), s: z.s ?? 1.5, pic: k % 6, parts: 'nhHallFrame', ahead: 30 })); },
    nhBigFrame(S, z) { prepare(S.course, S.plan); const s = z.s ?? 2.5, sy = z.sy ?? s, y = ribbonY(S, z.at); S.items.push({ t: z.at, x: 0, rot: 0, s, sy, h: y - 1.4 - 3.65 * sy, parts: 'nhBigFrame', ahead: 30 }); },
    nhCourthouse(S, z) { const push = onGround(S); const side = Math.sign(z.x); push({ t: z.at, x: z.x, rot: SIDE(side), s: z.s ?? 1, parts: 'nhCourthouse', ahead: 40 }); },
    nhGavel(S, z) { prepare(S.course, S.plan); const y = ribbonY(S, z.at); S.items.push({ t: z.at, x: z.x, rot: 0, h: y + (z.lift ?? 9), drop: (z.lift ?? 9) - 1.0, s: z.s ?? 1, hit: z.hit, parts: 'nhGavel', ahead: 30 }); },
    nhFireTrucks(S, z) { const push = onGround(S); for (const sd of [-1, 1]) push({ t: z.at, x: sd * (z.x ?? 17), from: z.from, to: z.to, parts: 'nhFireTruck', ahead: 34 }); },
    nhTape(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, h: ribbonY(S, z.at) + 1.1, half: S.course.sample(z.at).width + 1.6, parts: 'nhTape', ahead: 20 }); },
    nhRibbon(S, z) { prepare(S.course, S.plan); const w = S.course.sample(0).width + 2.4; S.items.push({ t: 0.0, x: 0, rot: 0, h: ribbonY(S, 0) + 1.0, half: w, parts: 'nhRibbon', ahead: 20 }); },
    nhTownSign(S, z) { const push = onGround(S); push({ t: z.at, x: z.x, s: z.s ?? 1.4, parts: 'nhTownSign', ahead: 30 }); },
    nhPhone(S, z) { const push = onGround(S); push({ t: z.at, x: z.x, s: z.s ?? 1.6, ring: z.ring, parts: 'nhPhone', ahead: 30 }); },
    nhFlock(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: z.x ?? 0, rot: 0, h: ribbonY(S, z.t ?? z.at) + (z.lift ?? 2), at: z.when, n: z.n ?? 24, seed: z.seed ?? 77, parts: 'nhFlock', ahead: 20 }); },
    // the lookout on the ridge: a low stone wall at the edge, the viewer you put a coin in, a bench, a lamp
    nhLookout(S, z) {
      const push = onGround(S), c = S.course;
      for (let t = z.from; t < z.to; t += 0.13) push({ t, x: RIDGE + 1.2, h: groundAt(c, t, 0), rot: 0, parts: 'nhStoneWall', ahead: 24 });
      push({ t: z.viewer, x: RIDGE - 0.6, h: groundAt(c, z.viewer, 0), rot: -Math.PI / 2 - 0.5, s: 1.5, parts: 'nhViewer', ahead: 24 });
      push({ t: z.viewer + 0.9, x: RIDGE - 1.5, h: groundAt(c, z.viewer, 0), rot: -Math.PI / 2, parts: 'nhBench', ahead: 24 });
      push({ t: z.viewer - 0.6, x: RIDGE - 0.8, h: groundAt(c, z.viewer, 0), rot: SIDE(1), parts: 'nhLamp', seed: 0.4, wake0: 1, keepLit: true, ahead: 24 });
    },
    nhParade(S, z) { prepare(S.course, S.plan); for (const [t, x, kind] of z.at) S.items.push({ t, x, kind, rot: 0, h: ribbonY(S, t) + (z.lift ?? 15), parts: 'nhParade', ahead: 30 }); },
    nhMarket(S, z, R) {
      const push = onGround(S);
      const tints = [[0.9, 0.2, 0.25], [0.2, 0.55, 0.3], [0.95, 0.75, 0.2], [0.3, 0.45, 0.85], [0.95, 0.5, 0.2]];
      const fruit = [[1, 0.35, 0.2], [0.9, 0.8, 0.2], [0.4, 0.8, 0.3], [0.85, 0.2, 0.35]];
      // the square opened up for it: rows of stalls out on the ground, their striped canopies to the road
      for (let t = z.from; t < z.to; t += 0.2) for (const side of [-1, 1]) for (const [x0, p0] of [[16, 0.9], [23, 0.85], [30, 0.75]]) if (R() < p0) push({ t: t + R() * 0.05, x: side * (x0 + R() * 1.5), rot: SIDE(side) + (R() - 0.5) * 0.15, s: 1.9, parts: 'nhStall', tint: pick(R, tints), fruit: pick(R, fruit), ahead: 18 });
      for (let t = z.from + 0.3; t < z.to; t += 0.9) for (const side of [-1, 1]) push({ t, x: side * (36 + R() * 6), rot: R() * 6.28, s: 0.9 + R() * 0.3, parts: 'nhTree', kind: 'nhMaple', tint: pick(R, GREENS), ahead: 20, blob: true });
    },
  },
});

// ---------- the end: the lookout over the town ----------
// Up on the ridge the ground falls away to the right into the valley, and there's the town where
// nothing happens, all of it at once: its windows and porch lights coming on one by one as the
// dusk comes down, cars about its streets, his tail lights going off up the highway, and from the
// last chorus on, fireworks over it (more of them the better you rode).
const VALLEY_Y = 11, RIDGE = 14, FOOT = 62;
// the valley floor at a distance out from the road (it falls away to the plain at the far edge)
const valleyFloor = (x) => VALLEY_Y * (1 - smooth(255, 315, x));
export class TownLineFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? 165;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    this.floor = (X) => valleyFloor(this.x - X);
    const V = buildValley(this.floor);
    this.V = V;
    this.townMat = valleyMaterial();
    this.town = new THREE.Mesh(V.town, this.townMat); this.town.frustumCulled = false; this.group.add(this.town);
    this.lightMat = valleyLights();
    this.points = new THREE.Points(V.lights, this.lightMat); this.points.frustumCulled = false; this.group.add(this.points);
    this.lit = 0; this.fired = false; this.earned = 0; this.clock = 0; this.next = 0; this.volley = false;
    this.R = seeded(4242);
    this._p = new THREE.Vector3(); this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
    this.cols = [0xffd27a, 0xff4a5a, 0xffffff, 0x8ad8ff, 0xff8ad8, 0xffa040].map((c) => new THREE.Color(c));
    // cars about town: [street z, start x, speed]
    this.cars = []; for (let k = 0; k < 18; k++) { const R = this.R; const z = k < 6 ? V.ZM + (k % 2 ? 3 : -3) : V.streets[1 + Math.floor(R() * (V.streets.length - 1))] + (R() < 0.5 ? 2 : -2); this.cars.push([z, V.X1 + R() * (V.X0 - V.X1), (R() < 0.5 ? 1 : -1) * (7 + R() * 6)]); }
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  // a point in the town's frame, in the world
  w(x, y, z, out) { return out.set(x, y, z).applyMatrix4(this.group.matrixWorld); }
  update(track, rider, songT, dt, fireworks) {
    const show = rider.t > 186;
    this.group.visible = show;
    if (!show) return;
    const p = track.ground(this.t, this.x, this._p);
    p.y = 0;
    this.group.position.copy(p);
    this.group.rotation.y = this.course.sample(this.t).yaw;
    this.group.updateMatrixWorld(true);
    // the town lights up as the dusk comes down, all of it by the time you're on the ridge
    const want = clamp((rider.t - 195) / 8, 0, 1) * (0.8 + 0.25 * this.earned);
    this.lit += (want - this.lit) * Math.min(1, dt * 1.2);
    this.townMat.userData.u.uLit.value = this.lit; this.lightMat.uniforms.uLit.value = this.lit; this.lightMat.uniforms.uTime.value += dt;
    const S = this.S; if (!S) return;
    // cars about its streets, their lights
    const V = this.V, span = V.X0 - V.X1;
    this.clock += dt;
    for (const [z, x0, sp] of this.cars) {
      const x = V.X1 + ((((x0 - V.X1) + sp * this.clock) % span) + span) % span, d = Math.sign(sp);
      const fy = this.floor(x) + 0.9;
      this.w(x + d * 2.2, fy, z, this._a); S.glow(this._a.x, this._a.y, this._a.z, 2.2, [1, 0.95, 0.8], 1.2 * this.lit);
      this.w(x - d * 2.2, fy, z, this._a); S.glow(this._a.x, this._a.y, this._a.z, 1.6, [1, 0.1, 0.08], 1.1 * this.lit);
    }
    // his tail lights, going off up the highway, the blinker on for the turn
    const hw = V.highway, u = clamp((rider.t - 196) / 26, 0, 1) * (hw.length - 1), i = Math.min(hw.length - 2, Math.floor(u)), f = u - i;
    if (rider.t > 196 && u < hw.length - 1.5) {
      const [ax, ay, az] = hw[i], [bx, by, bz] = hw[i + 1];
      this.w(ax + (bx - ax) * f, ay + 0.9, az + (bz - az) * f, this._a);
      S.glow(this._a.x, this._a.y, this._a.z, 2.6, [1, 0.12, 0.08], 1.6); S.glow(this._a.x, this._a.y + 0.4, this._a.z, 2.4, [1, 0.6, 0.1], 2.4, 5);
    }
    // fireworks over the town from the last chorus on: a volley on the downbeat, then shells
    // on and on through the end, more and bigger the better you rode
    if (this.fired && fireworks) {
      const R = this.R, e = this.earned;
      const shell = (k) => {
        const fx = -100 + R() * 160; this.w(fx, this.floor(fx) + 1, -130 + R() * 160, this._a);
        this._b.copy(this._a); this._b.y += 60 + R() * 50;
        fireworks.launch(this._a.clone(), this._b.clone(), 0.85 + 0.55 * e + R() * 0.3, this.cols[Math.floor(R() * this.cols.length)]);
      };
      if (!this.volley) { this.volley = true; for (let k = 0; k < 4 + Math.round(4 * e); k++) setTimeout(() => shell(k), k * 140); }
      if (this.clock >= this.next) { const n = 1 + (R() < 0.4 + 0.5 * e ? 1 : 0); for (let k = 0; k < n; k++) shell(k); this.next = this.clock + 0.55 - 0.2 * e + R() * 0.35; }
    }
  }
}

// ---------- the place, per frame ----------
export class SundayWorld {
  constructor(scene, S) {
    this.S = S;
    this.terrain = new Terrain(scene, S.course, S.P, S.plan);
    const u = this.terrain.mat.uniforms; u.uPath.value = 0; u.uLawn.value = 1; u.uDry.value = 0.35; u.uWood.value = 0;
    const c = S.course;
    if (S.town) S.town.floorFn = (t, x) => groundAt(c, t, x);
    if (S.town) for (const r of S.town.roadMeshes) r.floorFn = S.town.floorFn;
    // the rainbow, far off over the road while a chorus lasts
    const rg = new THREE.RingGeometry(0.86, 1, 96, 1, 0, Math.PI);
    { const uv = rg.attributes.uv, pos = rg.attributes.position; for (let i = 0; i < uv.count; i++) { const x = pos.getX(i), y = pos.getY(i); uv.setXY(i, Math.atan2(y, x) / Math.PI, (Math.hypot(x, y) - 0.86) / 0.14); } }
    this.rainbow = new THREE.Mesh(rg, rainbowMaterial()); this.rainbow.frustumCulled = false; this.rainbow.visible = false; this.rainbow.renderOrder = -1;
    scene.add(this.rainbow);
    this._f = new THREE.Vector3(); this._c = new THREE.Color(); this.gust = 0;
  }
  // past the town line the hill falls away on the right, down to the valley the town's in
  carve(S) {
    const T = this.terrain, c = S.course, rt = S.rider.t, t0 = rt - 4, t1 = rt + 46;
    if (t1 < 192) return;
    const P3 = T.pos, N = T.N, M = T.M;
    let first = -1;
    for (let i = 0; i < N; i++) {
      const t = t0 + (t1 - t0) * (i / (N - 1)), k = smooth(192.5, 199.5, t);
      if (k <= 0) continue;
      if (first < 0) first = i;
      const base = groundAt(c, t, 0);
      for (let j = 0; j < M; j++) {
        const x = T.cols[j]; if (x <= RIDGE) continue;
        const fall = smooth(RIDGE, FOOT, x), wob = Math.sin(t * 0.7 + x * 0.05) * 1.2 * fall * (1 - fall) * 4;
        const y = base + (valleyFloor(x) - base) * fall + wob;
        const o = (i * M + j) * 3 + 1; P3[o] += (y - P3[o]) * k;
      }
    }
    if (first < 0) return;
    // the normals there again, from the neighbours
    const a = this._na || (this._na = new THREE.Vector3()), b = this._nb || (this._nb = new THREE.Vector3());
    for (let i = Math.max(0, first - 1); i < N; i++) for (let j = 0; j < M; j++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(M - 1, j + 1);
      a.set(P3[(i1 * M + j) * 3] - P3[(i0 * M + j) * 3], P3[(i1 * M + j) * 3 + 1] - P3[(i0 * M + j) * 3 + 1], P3[(i1 * M + j) * 3 + 2] - P3[(i0 * M + j) * 3 + 2]);
      b.set(P3[(i * M + j1) * 3] - P3[(i * M + j0) * 3], P3[(i * M + j1) * 3 + 1] - P3[(i * M + j0) * 3 + 1], P3[(i * M + j1) * 3 + 2] - P3[(i * M + j0) * 3 + 2]);
      a.cross(b).normalize(); if (a.y < 0) a.negate();
      const o = (i * M + j) * 3; T.nor[o] = a.x; T.nor[o + 1] = a.y; T.nor[o + 2] = a.z;
    }
    T.geo.attributes.position.needsUpdate = true; T.geo.attributes.normal.needsUpdate = true;
  }
  update(S, dt, camera, time) {
    this.terrain.update(S.track, S.rider, S.P, camera, 0); this.terrain.mat.uniforms.uWood.value = 0;
    this.carve(S);
    const T = S.town, M = T.mats, P = S.P, r = S.rider;
    const U = clocked(M);
    U.uTime.value = time; U.uBeat.value = T.beat;
    // the water's slug: one leaves each hydrant every other beat
    U.uPhase.value = (S.course.beatAt(r.t) / 2) % 1;
    const lk = S.lift ? S.lift.k : 0; T.nhLift = lk;
    this.gust += ((T.beat * lk * 0.9) - this.gust) * Math.min(1, dt * 12);
    U.uGust.value = this.gust;
    U.uFog.value.set(P.fog); U.uFogD.value = P.fogDensity * (1 - (S.entry.lift?.fog ?? 0.32) * lk);
    U.uSun.value.set(P.moon); U.uSky.value.set(P.horizon);
    T.nhChartTex = M.nhChartM ? M.nhChartM.map : null;
    // my buildings' windows follow the light (the shared ones are set by the look)
    for (const k of ['nhWalls', 'nhMainW']) {
      const sh = M[k] && M[k].userData.shader; if (!sh) continue;
      sh.uniforms.uWarm.value.set(P.window); sh.uniforms.uCandy.value.set(P.windowAlt); sh.uniforms.uBeat.value = T.beat;
      sh.uniforms.uWinK.value = P.windowK ?? 1; sh.uniforms.uGlass.value.set(P.glass ?? 0x030406);
    }
    // a layer with nothing in it this frame draws nothing at all
    for (const k in T._layers) if (k.startsWith('nh')) { const L = T._layers[k]; L.mesh.visible = L.n > 0; }
    // the rainbow: out ahead, low, while the chorus lasts and the sun is out
    const rk = lk * clamp(((P.sunK ?? 1) - 1.2) / 1.2, 0, 1) * (S.entry.rainbow === false ? 0 : 1);
    this.rainbow.visible = rk > 0.01;
    if (this.rainbow.visible) {
      const f = camera.getWorldDirection(this._f); f.y = 0; f.normalize();
      const D = 900, R0 = 520;
      this.rainbow.position.set(camera.position.x + f.x * D, camera.position.y - R0 * 0.32, camera.position.z + f.z * D);
      this.rainbow.lookAt(camera.position.x, this.rainbow.position.y, camera.position.z);
      this.rainbow.scale.setScalar(R0);
      this.rainbow.material.uniforms.uK.value = rk;
    }
  }
}
