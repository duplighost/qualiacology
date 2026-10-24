// Until She Stopped Fighting. Nothing from the words: a place for the sound. A steelworks at night,
// from the drone out of silence to the long full-volume climax. The yard in the dark, stacks and
// sheds; the doors glowing open on the first swell; cranes over the road; the ladle lifted and the
// pour on the drop; steam in the breaks; the hammer on the next drop; slabs racing down the rolling
// mill; the cooling yard under the stars in the quiet; the converter blowing; and on the climax the
// blast furnace cast, iron running in rivers both sides. Then morning, and the furnace in it.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local, col } from './scenery.js';
import { paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const lathe = (pts, n = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
function tube(a, b, r0, r1 = r0, n = 8) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
// molten metal: white-hot in the middle, orange at the edges, moving
function moltenMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aHeat; varying vec3 vP; varying float vH; varying vec3 vN; void main(){ vP = position; vH = aHeat; vN = normalize(mat3(instanceMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; varying vec3 vP; varying float vH; varying vec3 vN;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){ float n = n2(vP.xz * 0.35 + vec2(0.0, -uTime * 1.6)) * 0.6 + n2(vP.xz * 1.1 + vec2(uTime * 0.4, -uTime * 2.6)) * 0.4;
        float t = clamp(vH * (0.75 + 0.5 * n), 0.0, 1.4);
        vec3 c = mix(vec3(0.35, 0.03, 0.0), vec3(1.0, 0.35, 0.02), smoothstep(0.1, 0.55, t)); c = mix(c, vec3(1.0, 0.85, 0.45), smoothstep(0.55, 0.95, t)); c = mix(c, vec3(1.0, 1.0, 0.9), smoothstep(0.95, 1.3, t));
        gl_FragColor = vec4(c * (1.2 + 0.6 * t), 1.0); }`,
  });
}

// ---------- the works ----------
const SW = {
  // a long shed: corrugated walls, a saw-tooth roof, the doors along it (the glow is its own)
  shed() {
    const parts = [], wall = rgb(0x3a3a42), roof = rgb(0x2a2a30);
    parts.push(paint(box(60, 22, 24, 0, 11, 0), wall));
    for (let k = 0; k < 6; k++) { const g = new THREE.BufferGeometry(); const x0 = -30 + k * 10; const v = new Float32Array([x0, 22, -12, x0, 22, 12, x0 + 10, 22, 12, x0, 22, -12, x0 + 10, 22, 12, x0 + 10, 22, -12, x0, 22, -12, x0, 29, 12, x0, 22, 12, x0, 22, -12, x0, 29, -12, x0, 29, 12, x0, 29, -12, x0 + 10, 22, -12, x0 + 10, 22, 12, x0, 29, -12, x0 + 10, 22, 12, x0, 29, 12]); g.setAttribute('position', new THREE.BufferAttribute(v, 3)); g.computeVertexNormals(); parts.push(paint(g, roof)); }
    for (let k = 0; k < 12; k++) parts.push(paint(box(0.4, 22, 0.4, -29 + k * 5.2, 11, 12.1), rgb(0x2a2a30)));
    return merge(parts);
  },
  shedGlow() { const parts = []; for (const x of [-18, 0, 18]) parts.push(paint(box(9, 14, 0.3, x, 7, 12.2), [1, 1, 1])); for (let k = 0; k < 6; k++) parts.push(paint(box(9.4, 1.6, 0.3, -25 + k * 10, 19.5, 12.2), [1, 1, 1])); return merge(parts); },
  // a stack, banded at the top
  stack() { return merge([paint(cyl(3.2, 4.6, 80, 16, 0, 40, 0), rgb(0x4a4448)), paint(cyl(3.3, 3.3, 4, 16, 0, 72, 0), rgb(0xc8382a)), paint(cyl(3.3, 3.3, 4, 16, 0, 64, 0), rgb(0xe8e4e0)), paint(cyl(3.6, 3.6, 1, 16, 0, 80, 0), rgb(0x2a2a2e))]); },
  // a gantry crane over the road: legs both sides, the girder, the trolley and its hook
  crane() {
    const parts = [], y = rgb(0xd8a82a), d = rgb(0x2a2a30);
    for (const s of [-1, 1]) { parts.push(paint(box(2, 46, 2, s * 34, 23, -4), y), paint(box(2, 46, 2, s * 34, 23, 4), y), paint(box(2, 2, 10, s * 34, 1, 0), d)); for (let k = 0; k < 5; k++) parts.push(paint(tube(V(s * 34, k * 9, -4), V(s * 34, k * 9 + 9, 4), 0.25), y)); }
    parts.push(paint(box(72, 4, 3, 0, 46, -3), y), paint(box(72, 4, 3, 0, 46, 3), y), paint(box(8, 4, 9, 6, 50, 0), d));
    return merge(parts);
  },
  hook() { return merge([paint(box(0.25, 30, 0.25, -0.8, 15, 0), rgb(0x2a2a30)), paint(box(0.25, 30, 0.25, 0.8, 15, 0), rgb(0x2a2a30)), paint(box(3, 2.4, 2, 0, 0, 0), rgb(0xd8a82a)), paint(new THREE.TorusGeometry(1.4, 0.45, 8, 16, Math.PI * 1.4).rotateZ(Math.PI * 0.8).translate(0, -2.4, 0), rgb(0x3a3a40))]); },
  // pipe racks along the road
  pipes() { const parts = []; for (const z of [-7, 7]) parts.push(paint(box(1.2, 16, 1.2, 0, 8, z), rgb(0x3a3a42))); parts.push(paint(box(1.6, 1.2, 16, 0, 15, 0), rgb(0x3a3a42))); for (const [y, r, c] of [[12.4, 1.1, 0x3a2e28], [12.4, 0.8, 0x2e2e34], [16.4, 1.4, 0x40302a], [16.4, 0.7, 0x2a322a]]) parts.push(paint(cyl(r, r, 14.2, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, y, -4 + r * 6), rgb(c))); return merge(parts); },
  // the ladle: a great bucket on its bail, tipped to pour
  ladle() { const parts = [paint(lathe([[0, 0], [7, 0], [9, 2], [10.6, 14], [11, 15], [10.2, 15.4], [9.6, 14.2], [8.2, 2.8], [0, 1.4]], 24), rgb(0x3a2a24)), paint(cyl(0.9, 0.9, 3, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(11.6, 9, 0), rgb(0x2a2a30)), paint(cyl(0.9, 0.9, 3, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(-11.6, 9, 0), rgb(0x2a2a30))]; const bail = new THREE.TorusGeometry(12.4, 0.7, 8, 24, Math.PI); bail.translate(0, 9, 0); parts.push(paint(bail, rgb(0x2a2a30))); parts.push(paint(cyl(9.8, 9.8, 0.4, 24, 0, 13.2, 0), [1, 0.5, 0.1])); return merge(parts); },
  // ingot molds in a row, open at the top (the metal in them is its own)
  molds() { const parts = []; for (let k = 0; k < 6; k++) parts.push(paint(box(4.4, 6, 4.4, -12.5 + k * 5, 3, 0), rgb(0x2a2626))); parts.push(paint(box(32, 1, 7, 0, 0.5, 0), rgb(0x1a1a1c))); return merge(parts); },
  moldMetal() { const parts = []; for (let k = 0; k < 6; k++) parts.push(box(3.4, 0.4, 3.4, -12.5 + k * 5, 6.0, 0)); return merge(parts); },
  // the steam hammer: the frame, the ram (its own), the anvil
  hammer() { return merge([paint(box(5, 34, 6, -12, 17, 0), rgb(0x2a3a4a)), paint(box(5, 34, 6, 12, 17, 0), rgb(0x2a3a4a)), paint(box(30, 7, 8, 0, 37, 0), rgb(0x2a3a4a)), paint(cyl(3.4, 3.4, 10, 16, 0, 44, 0), rgb(0x3a4a5a)), paint(box(16, 6, 10, 0, 3, 0), rgb(0x1a1a1e)), paint(box(10, 3, 8, 0, 7.5, 0), rgb(0x2a2a2e))]); },
  ram() { return merge([paint(box(12, 9, 8, 0, 0, 0), rgb(0x3a3a40)), paint(cyl(1.4, 1.4, 20, 10, 0, 14, 0), rgb(0x8a8a90))]); },
  billet() { return box(7, 2.4, 5, 0, 10.2, 0); },
  // the roller table: rollers along a bed
  rollers() { const parts = [paint(box(10, 14, 40, 0, 7, 0), rgb(0x1a1a1e))]; for (let k = 0; k < 16; k++) parts.push(paint(cyl(0.9, 0.9, 8, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 14.8, -18.75 + k * 2.5), rgb(0x4a4a50))); return merge(parts); },
  slab() { return box(7, 2, 24, 0, 16.6, 0); },
  // a coil on its winder, red hot
  coil() { const g = new THREE.TorusGeometry(7, 3.6, 12, 32); g.translate(0, 12, 0); return g; },
  coilStand() { return merge([paint(box(4, 8, 6, -9, 4, 0), rgb(0x2a2a30)), paint(box(4, 8, 6, 9, 4, 0), rgb(0x2a2a30)), paint(cyl(1.2, 1.2, 22, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 12, 0), rgb(0x5a5a60))]); },
  // ingots cooling in rows
  ingot() { return box(5, 4, 10, 0, 2, 0); },
  // the converter, tilted on its trunnions
  converter() { const parts = [paint(lathe([[0, 0], [8, 0.4], [11, 5], [12, 14], [10, 24], [6, 30], [5.4, 32], [0, 32]], 24), rgb(0x3a3a40))]; parts.push(paint(box(4, 30, 6, -16, 15, 0), rgb(0x2a2a30)), paint(box(4, 30, 6, 16, 15, 0), rgb(0x2a2a30)), paint(cyl(2, 2, 34, 12, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 26, 0), rgb(0x4a4a50))); return merge(parts); },
  // slag: a pot on its carrier, tipped
  slagPot() { return merge([paint(lathe([[0, 0], [5, 0], [9, 10], [10, 11], [0, 11]], 20), rgb(0x2a2626)), paint(box(16, 3, 10, 0, -2, 0), rgb(0x1a1a1e))]); },
  // the runner: a channel along the road for the iron
  runner() { const parts = [paint(box(16, 2.4, 40, 0, 7.8, 0), rgb(0x2a2420))]; for (const z of [-14, 0, 14]) for (const x of [-6, 6]) parts.push(paint(box(1.6, 7, 1.6, x, 3.5, z), rgb(0x2a2a2e))); return merge(parts); },
  runnerIron() { return box(12, 3.4, 40, 0, 10.6, 0); },
};

extend({
  layers: {
    swShed: (M) => [SW.shed(), VCm(M, 'swShedM', 0.06, { roughness: 0.8, metalness: 0.3 }), 120, {}],
    swShedGlow: (M) => [SW.shedGlow(), M.swShedGlowM || (M.swShedGlowM = (() => { const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9, emissive: 0xffffff, emissiveIntensity: 1.0 }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vTint;'); }; return m; })()), 120, { aTint: 3 }],
    swStack: (M) => [SW.stack(), VCm(M, 'swStackM', 0.15, { roughness: 0.8 }), 60, {}],
    swCrane: (M) => [SW.crane(), VCm(M, 'swCraneM', 0.18, { roughness: 0.6, metalness: 0.4 }), 16, {}],
    swHook: (M) => [SW.hook(), VCm(M, 'swHookM', 0.1, { roughness: 0.6, metalness: 0.5 }), 16, {}],
    swPipes: (M) => [SW.pipes(), VCm(M, 'swPipesM', 0.03, { roughness: 0.7, metalness: 0.3 }), 200, {}],
    swLadle: (M) => [SW.ladle(), VCm(M, 'swLadleM', 0.4, { roughness: 0.7, metalness: 0.3 }), 4, {}],
    swMolds: (M) => [SW.molds(), VCm(M, 'swMoldsM', 0.1, { roughness: 0.8 }), 40, {}],
    swHammer: (M) => [SW.hammer(), VCm(M, 'swHammerM', 0.18, { roughness: 0.5, metalness: 0.5 }), 3, {}],
    swRam: (M) => [SW.ram(), VCm(M, 'swRamM', 0.15, { roughness: 0.4, metalness: 0.6 }), 3, {}],
    swRollers: (M) => [SW.rollers(), VCm(M, 'swRollersM', 0.1, { roughness: 0.5, metalness: 0.5 }), 120, {}],
    swCoilStand: (M) => [SW.coilStand(), VCm(M, 'swCoilStandM', 0.1, { roughness: 0.6 }), 8, {}],
    swConverter: (M) => [SW.converter(), VCm(M, 'swConverterM', 0.2, { roughness: 0.6, metalness: 0.4 }), 2, {}],
    swSlagPot: (M) => [SW.slagPot(), VCm(M, 'swSlagPotM', 0.15, { roughness: 0.8 }), 4, {}],
    swRunner: (M) => [SW.runner(), VCm(M, 'swRunnerM', 0.1, { roughness: 0.9 }), 120, {}],
    // everything molten shares one material, its heat per instance
    swMoltenMold: (M) => [SW.moldMetal(), M.swMoltenM || (M.swMoltenM = moltenMaterial()), 40, { aHeat: 1 }],
    swMoltenBillet: (M) => [SW.billet(), M.swMoltenM || (M.swMoltenM = moltenMaterial()), 3, { aHeat: 1 }],
    swMoltenSlab: (M) => [SW.slab(), M.swMoltenM || (M.swMoltenM = moltenMaterial()), 60, { aHeat: 1 }],
    swMoltenCoil: (M) => [SW.coil(), M.swMoltenM || (M.swMoltenM = moltenMaterial()), 8, { aHeat: 1 }],
    swMoltenIngot: (M) => [SW.ingot(), M.swMoltenM || (M.swMoltenM = moltenMaterial()), 400, { aHeat: 1 }],
    swMoltenRunner: (M) => [SW.runnerIron(), M.swMoltenM || (M.swMoltenM = moltenMaterial()), 120, { aHeat: 1 }],
    swMoltenStream: (M) => [new THREE.CylinderGeometry(1, 1, 1, 12, 1).translate(0, -0.5, 0), M.swMoltenM || (M.swMoltenM = moltenMaterial()), 8, { aHeat: 1 }],
  },
  parts: {
    // the yard: sheds with their doors, stacks, pipe racks
    swShed(S, it, p, q, yaw) {
      const L = S.layers; void L.swShed; void L.swShedGlow; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s * (it.sy ?? 1), s)); L.swShed.add(m);
      const g = (0.12 + 0.88 * smooth(it.on ?? -1e9, (it.on ?? -1e9) + 0.6, T)) * (0.9 + 0.1 * Math.sin(T * 7 + it.seed * 9)) * (it.dim !== undefined ? 1 - 0.7 * smooth(it.dim, it.dim + 2, T) : 1);
      L.swShedGlow.add(m, { aTint: [0.04 + 1.3 * g, 0.03 + 0.55 * g, 0.03 + 0.15 * g] });
      if (g > 0.3) { const w = local(p, S.course.sample(it.t).yaw + (it.rot || 0), 0, 8 * s, 18 * s, S._o); poolAt(S, w.x, 0.2, w.z, 40 * s, [1, 0.5, 0.15], 0.4 * g); glowAt(S, w.x, w.y, w.z, 30 * s, [1, 0.5, 0.15], 0.12 * g); }
    },
    swStack(S, it, p, q, yaw) {
      const L = S.layers; void L.swStack; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); L.swStack.add(m);
      glowAt(S, p.x, 82 * s, p.z, 2.4, [1, 0.1, 0.08], Math.sin(T * 3 + it.seed * 7) > 0 ? 1.6 : 0.3, 1);
      for (let j = 0; j < 4; j++) { const f = ((T * 0.12 + j / 4 + it.seed) % 1); glowAt(S, p.x + f * 20 * s, (82 + f * 40) * s, p.z + f * 8 * s, (8 + f * 26) * s, [0.5, 0.42, 0.42], 0.25 * (1 - f) * (it.k ?? 1)); }
      if (it.flare) glowAt(S, p.x, 84 * s, p.z, 10 * s, [1, 0.55, 0.15], 0.6 + 0.3 * Math.sin(T * 9 + it.seed));
    },
    swPipes(S, it, p, q) { const L = S.layers; void L.swPipes; if (!S.track) return; const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.swPipes.add(m); },
    // a crane over the road, its trolley drifting, the hook swinging
    swCrane(S, it, p, q, yaw) {
      const L = S.layers; void L.swCrane; void L.swHook; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.swCrane.add(m);
      const tx = Math.sin(T * 0.35 + it.seed * 6) * 22, sw = Math.sin(T * 1.2 + it.seed * 3) * 0.12;
      const h = local(p, yaw, tx, 48, 0, S._o); S._e.set(sw, yaw, 0); const hq = (S._swhq || (S._swhq = new THREE.Quaternion())).setFromEuler(S._e);
      h.y -= 30; m.compose(h, hq, S._s.set(1, 1, 1)); L.swHook.add(m);
      glowAt(S, h.x, 50, h.z, 1.8, [1, 0.6, 0.2], Math.sin(T * 4 + it.seed * 5) > 0.2 ? 1.2 : 0.2, 1);
    },
    // grinders at the roadside: a fan of sparks on the bars
    swSparks(S, it, p, q, yaw) {
      if (!S.track) return;
      const T = S.tNow ?? 0, k = (it.k ?? 1) * smooth(it.on ?? -1e9, (it.on ?? -1e9) + 0.3, T) * (1 - smooth(it.off ?? 1e9, (it.off ?? 1e9) + 0.5, T)); if (k <= 0) return;
      const ph = it.beat ? ((S.beatT ?? T) % 1) : 0;
      for (let j = 0; j < 22; j++) { const f = ((T * (1.6 + hash(j) ) + hash(j * 3.7 + it.seed)) % 1); const a = hash(j * 1.3 + it.seed) * Math.PI - Math.PI / 2, v = 14 + hash(j * 5.1) * 16; const w = local(p, yaw, Math.sin(a) * v * f, (it.y ?? 6) + v * f * 0.8 - 30 * f * f, Math.cos(a) * v * f * 0.6, S._o); glowAt(S, w.x, w.y, w.z, 1.0 + (1 - f), [1, 0.75 - 0.3 * f, 0.3], 1.4 * (1 - f) * k); }
      glowAt(S, p.x, (it.y ?? 6), p.z, 10, [1, 0.6, 0.2], 0.4 * k);
    },
    // the set-pieces
    swProp(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['swLadle', 'swMolds', 'swHammer', 'swRam', 'swRollers', 'swCoilStand', 'swConverter', 'swSlagPot', 'swMoltenMold', 'swMoltenBillet', 'swMoltenSlab', 'swMoltenCoil', 'swMoltenStream']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind;
      const at = S._swv || (S._swv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2, z = 0, x = 0) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.6, c = [1, 0.5, 0.15], r = 60) => poolAt(S, at.x, 0.15, at.z, r * s, c, k2);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      const sparks = (x, y, z, n, v, k2, t0 = 0) => { for (let j = 0; j < n; j++) { const f = ((T * (1.2 + hash(j + t0)) + hash(j * 3.3 + t0)) % 1); const a = hash(j * 7.1 + t0) * 6.28, sp = v * (0.5 + hash(j * 2.2)); const w = local(at, yaw, (x + Math.cos(a) * sp * f) * s, (y + sp * 1.2 * f - 26 * f * f) * s, (z + Math.sin(a) * sp * f) * s, S._o); glowAt(S, w.x, w.y, w.z, (1.2 + (1 - f)) * s, [1, 0.8 - 0.4 * f, 0.35], 1.5 * (1 - f) * k2); } };
      if (k === 'pour') {
        // the ladle comes up on the crane and tips; the stream goes into the molds, sparks off it
        const up = smooth(it.lift ?? -1e9, (it.lift ?? -1e9) + 1.6, T), tip = smooth(it.go ?? 1e9, (it.go ?? 1e9) + 0.5, T) * (1 - smooth(it.stop ?? 1e9, (it.stop ?? 1e9) + 1, T));
        const ly = 16 + 22 * up; put('swLadle', -8, ly, 0, quat('_swlq', 0, 0, -0.9 * tip));
        for (let j = 0; j < 3; j++) put('swMolds', 0, 0, -10 + j * 10);
        const fill = smooth(it.go ?? 1e9, (it.go ?? 1e9) + 4, T);
        for (let j = 0; j < 3; j++) put('swMoltenMold', 0, 0, -10 + j * 10, q, s, { aHeat: 0.3 + 0.9 * fill * (1 - 0.25 * j) });
        if (tip > 0.05) {
          const lip = local(at, yaw, (-8 + 11) * s, (ly + 13) * s, 0, S._o).clone(); const len = (ly + 13 - 6) * s;
          m.makeScale(1.4 * s * tip, len, 1.4 * s * tip); m.setPosition(lip.x, lip.y, lip.z); L.swMoltenStream.add(m, { aHeat: 1.2 });
          sparks(3, 6, 0, 30, 14, tip, it.t); light(6, 40, [1, 0.6, 0.2], 1.0 * tip, 0, 3); light(ly + 13, 30, [1, 0.6, 0.2], 0.5 * tip, 0, 3);
        }
        light(ly + 8, 30, [1, 0.45, 0.12], 0.3 + 0.4 * up, 0, -8); spot(0.4 + 0.6 * tip);
      }
      else if (k === 'hammer') {
        // the ram falls on every hit; sparks off the billet
        put('swHammer'); let fall = 0, hit = 0; for (const h of it.hits || []) { const d = T - h; if (d > -0.25 && d < 0) fall = Math.max(fall, 1 + d / 0.25); if (d >= 0 && d < 0.6) { hit = Math.max(hit, 1 - d / 0.6); fall = Math.max(fall, 1 - d / 0.6); } }
        put('swRam', 0, 30 - 18 * fall * fall, 0); put('swMoltenBillet', 0, 0, 0, q, s, { aHeat: 0.7 + 0.5 * hit });
        if (hit > 0) sparks(0, 11, 0, 40, 20, hit, it.t + Math.floor(T)); light(11, 40, [1, 0.6, 0.2], 0.4 + 1.6 * hit, 4); spot(0.5 + 0.8 * hit);
      }
      else if (k === 'coil') { put('swCoilStand'); S._e.set(T * 1.6, yaw, 0); const cq = (S._swcq || (S._swcq = new THREE.Quaternion())).setFromEuler(S._e); m.compose(local(at, yaw, 0, 12 * s, 0, S._o), cq, S._s.set(s, s, s)); L.swMoltenCoil.add(m, { aHeat: 0.8 }); light(12, 40, [1, 0.45, 0.12], 0.6); spot(0.6); }
      else if (k === 'converter') {
        // tipped up, then the blow: a jet of flame and sparks into the sky
        const blow = smooth(it.blow ?? 1e9, (it.blow ?? 1e9) + 0.4, T) * (1 - smooth(it.end ?? 1e9, (it.end ?? 1e9) + 2, T));
        put('swConverter', 0, 0, 0, quat('_swvq', 0, 0, 0.35 * (1 - blow)));
        for (let j = 0; j < 14; j++) { const f = ((T * 1.8 + j / 14) % 1); const w = local(at, yaw, Math.sin(j * 2.1 + T * 3) * 3 * f * s, (34 + f * 60) * s, Math.cos(j * 1.7) * 3 * f * s, S._o); glowAt(S, w.x, w.y, w.z, (5 + f * 14) * s, [1, 0.85 - 0.4 * f, 0.5 - 0.3 * f], 1.4 * (1 - f) * blow); }
        sparks(0, 34, 0, 40, 24, blow, it.t); light(40, 90, [1, 0.6, 0.2], 0.8 * blow, 0); spot(0.4 + 0.8 * blow, [1, 0.6, 0.2], 90);
      }
      else if (k === 'slag') {
        // the pot tipped, a glowing fall down the heap
        const go = smooth(it.go ?? -1e9, (it.go ?? -1e9) + 1, T); put('swSlagPot', 0, 14, 0, quat('_swsq', 0, 0, -1.3 * go));
        for (let j = 0; j < 24; j++) { const f = ((T * 0.6 + j / 24) % 1); const w = local(at, yaw, (9 + f * 14) * s, (20 - f * 20) * s, (Math.sin(j * 1.9) * 5) * s, S._o); glowAt(S, w.x, w.y, w.z, (3 + f * 3) * s, [1, 0.5 - 0.3 * f, 0.1], 1.2 * go * (1 - 0.5 * f)); }
        light(10, 50, [1, 0.45, 0.1], 0.5 * go, 0, 14); spot(0.6 * go, [1, 0.4, 0.1]);
      }
    },
    // the rolling mill: a roller table with a slab racing down it
    swMill(S, it, p, q, yaw) {
      const L = S.layers; void L.swRollers; void L.swMoltenSlab; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.swRollers.add(m);
      const ph = ((T * 0.9 + it.seed) % 1), z = -30 + ph * 60; if (Math.abs(z) < 26) { const w = local(p, yaw, 0, 0, z, S._o); m.compose(w, q, S._s.set(1, 1, 1)); L.swMoltenSlab.add(m, { aHeat: 0.75 }); glowAt(S, w.x, 19, w.z, 30, [1, 0.45, 0.12], 0.45); poolAt(S, w.x, 0.2, w.z, 40, [1, 0.45, 0.12], 0.45); }
    },
    // the cooling yard: rows of ingots going from orange to dark
    swIngots(S, it, p, q, yaw) {
      const L = S.layers; void L.swMoltenIngot; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, heat = 0.25 + 0.5 * (it.heat ?? 1) * (1 - smooth(it.cool ?? 1e9, (it.cool ?? 1e9) + 12, T));
      for (let lv = 0; lv < 4; lv++) for (let r = 0; r < 4 - lv; r++) for (let j = 0; j < 3; j++) { const w = local(p, yaw, (r * 6 + lv * 3) * Math.sign(it.x), lv * 4, (j - 1) * 11, S._o); m.compose(w, q, S._s.set(1, 1, 1)); L.swMoltenIngot.add(m, { aHeat: heat * (0.8 + 0.3 * hash(lv * 9 + r * 4 + j + it.seed)) }); }
      glowAt(S, p.x, 4, p.z, 30, [1, 0.4, 0.1], 0.2 * heat);
    },
    // the cast: iron running in its runner, sparks springing off it
    swRunner(S, it, p, q, yaw) {
      const L = S.layers; void L.swRunner; void L.swMoltenRunner; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.swRunner.add(m);
      const fill = smooth(it.on ?? -1e9, (it.on ?? -1e9) + 1.2, T) * (1 - smooth(it.off ?? 1e9, (it.off ?? 1e9) + 3, T));
      if (fill > 0.02) { L.swMoltenRunner.add(m, { aHeat: 1.1 * fill }); poolAt(S, p.x, 0.2, p.z, 44, [1, 0.5, 0.12], 0.6 * fill); glowAt(S, p.x, 12, p.z, 30, [1, 0.6, 0.2], 0.45 * fill);
        for (let j = 0; j < 6; j++) { const f = ((T * 2.2 + hash(j + it.seed * 9)) % 1); const w = local(p, yaw, (hash(j * 3 + it.seed) - 0.5) * 10, 12 + f * 14 - 18 * f * f, (hash(j * 7 + it.seed) - 0.5) * 36, S._o); glowAt(S, w.x, w.y, w.z, 1.4, [1, 0.8, 0.4], 1.4 * (1 - f) * fill); } }
    },
  },
  kits: {
    // the yard: sheds and stacks back from the road, pipe racks close in
    swYard(S, z, R) {
      for (const side of [-1, 1]) {
        for (let t = z.from + R() * 0.3; t < z.to; t += 1.4 + R() * 0.6) S.items.push({ t, x: side * ((z.x ?? 46) + R() * 10), rot: SIDE(side), s: 0.9 + R() * 0.3, sy: 0.9 + R() * 0.4, seed: R(), on: (z.on ?? -1e9) + R() * 1.5, dim: z.dim, h: 0, parts: 'swShed', ahead: 46 });
        for (let t = z.from + R(); t < z.to; t += 2.2 + R() * 1.6) S.items.push({ t, x: side * (80 + R() * 70), rot: 0, s: 0.8 + R() * 0.5, seed: R(), flare: R() < 0.3, k: z.smoke ?? 1, h: 0, parts: 'swStack', ahead: 46 });
        if (z.pipes !== false) for (let t = z.from; t < z.to; t += 0.42) S.items.push({ t, x: side * (z.pipeX ?? 21), rot: 0, h: 0, parts: 'swPipes', ahead: 26 });
      }
    },
    swCranes(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 3.0) S.items.push({ t, x: 0, rot: 0, seed: R(), h: 0, parts: 'swCrane', ahead: 40 }); },
    swSparks(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.0) S.items.push({ t: t + R() * 0.2, x: (R() < 0.5 ? -1 : 1) * ((z.x ?? 26) + R() * 6), y: (z.y ?? 6) + R() * 8, rot: R() * 6.28, seed: R(), k: z.k, on: z.on, off: z.off, h: 0, parts: 'swSparks', ahead: 30 }); },
    swProps(S, z) { for (const c of z.at) S.items.push({ t: c.t, x: c.x, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), s: c.s ?? 1, y: c.y, kind: c.kind, lift: c.lift, go: c.go, stop: c.stop, hits: c.hits, blow: c.blow, end: c.end, h: 0, parts: 'swProp', ahead: c.ahead ?? 40 }); },
    swMill(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.9) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 26), rot: 0, seed: R(), h: 0, parts: 'swMill', ahead: 36 }); },
    swIngots(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.9) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 28), rot: 0, seed: R(), heat: z.heat, cool: z.cool, h: 0, parts: 'swIngots', ahead: 36 }); },
    swRunners(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.75) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 24), rot: 0, seed: R(), on: (z.on ?? -1e9) + Math.max(0, t - z.from) * (z.wave ?? 0), off: z.off, h: 0, parts: 'swRunner', ahead: 40 }); },
  },
});

// ---------- the end: the blast furnace at dawn ----------
export class FurnaceFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -70;
    this.group = new THREE.Group(); scene.add(this.group);
    const parts = [], shell = rgb(0x4a4044), dark = rgb(0x2a2628);
    parts.push(paint(lathe([[0, 0], [16, 0], [17, 8], [14, 30], [11, 54], [9, 60], [0, 60]], 28), shell));
    for (const [y, r] of [[12, 16.6], [26, 14.8], [40, 12.6]]) parts.push(paint(new THREE.TorusGeometry(r, 0.7, 6, 32).rotateX(Math.PI / 2).translate(0, y, 0), dark));
    for (const x of [-34, -46, -58]) { parts.push(paint(cyl(7, 7, 56, 20, x, 28, -10), rgb(0x5a5054))); parts.push(paint(sph(7, 1, 0.7, 1, x, 56, -10, 20, 10), rgb(0x5a5054))); }
    parts.push(paint(tube(V(0, 60, 0), V(0, 82, 0), 2.4), dark), paint(tube(V(0, 82, 0), V(-18, 70, -6), 2.2), dark), paint(tube(V(-18, 70, -6), V(-24, 30, -10), 2.6), dark));
    parts.push(paint(tube(V(30, 0, 8), V(4, 58, 0), 1.6), rgb(0x3a3438)), paint(tube(V(34, 0, 0), V(8, 58, -6), 1.6), rgb(0x3a3438)));
    parts.push(paint(box(46, 16, 30, 0, 8, 24), rgb(0x3a3438)), paint(box(48, 2, 32, 0, 17, 24), dark));
    this.mesh = new THREE.Mesh(merge(parts), selfLit({ roughness: 0.7, metalness: 0.3 }, 0.12)); this.group.add(this.mesh);
    this.group.scale.setScalar(cfg.s ?? 1.6);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() {}
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1.6, T = songT;
    // the cast house still glowing at its doors, steam off the top
    this._w.set(0, 6, 40).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 30 * s, [1, 0.5, 0.15], 0.5); S.pool(this._w.x, 0.2, this._w.z, 50 * s, [1, 0.5, 0.15], 0.5);
    for (let j = 0; j < 6; j++) { const f = ((T * 0.1 + j / 6) % 1); this._w.set(f * 10, 84 + f * 50, f * 4).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, (10 + f * 30) * s, [0.85, 0.82, 0.85], 0.25 * (1 - f)); }
    this._w.set(0, 62, 0).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 4, [1, 0.1, 0.08], Math.sin(T * 3) > 0 ? 1.5 : 0.3, 1);
  }
}

// ---------- the place, per frame ----------
export class FoundryWorld {
  constructor(scene, S) { this.S = S; }
  update(S, dt, camera, time) {
    const M = S.town.mats; if (M.swMoltenM) M.swMoltenM.uniforms.uTime.value = time;
  }
}
