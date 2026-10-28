// Good Girls Don't Fight Back: the things on the ice, each on its line. Iron lamps along the road
// that go out on the threat and go low "when the lights go low"; fishing huts whose windows go dark
// "when they already know"; a signpost pointing every way ("are you confused?"); the music box that
// opens on "this song is for you"; the sampler, FEEL PLEASANTLY SUBDUED; birdcages covered one by one
// for "stay quiet" (and thrown open at the peak); a cake kept under glass ("stay sweet"); the
// microphone frozen in a block of ice ("never speak"); the pond's rules (NO SCREAMING, NO RUNNING,
// NO TEARS ON YOUR FACE) springing up out of the ice; the long table where they sit in their places;
// the carousel for the la-la-la; the wedding cake, "the dream", that cracks and goes under at the peak;
// a heart of ice with no heartbeat to break; the ring going down through the floes; the glass coffin,
// open and empty, THEY NEVER WAKE. Names here start with ggb.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { girl, groom, dove, limb, ell, lathe, iceMaterial, drawBird, mergePN } from './ggb-figures.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
function paint(g, c) { g = ni(g); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
function clean(g) { g = ni(g); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); return g; }
const mergeC = (gs) => mergeGeometries(gs.map(clean), false);
const B = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
// a cylinder standing with its bottom at y
const CY = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r1, r0, h, n); g.translate(x, y + h / 2, z); return g; };
// a ring lying flat at height y
const RING = (R, r, x, y, z, seg = 24) => { const g = new THREE.TorusGeometry(R, r, 5, seg); g.rotateX(Math.PI / 2); g.translate(x, y, z); return g; };
const easeBack = (u) => { u = clamp(u, 0, 1); const c = 2.2; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };

// ---------- materials ----------
// vertex-coloured, lit a little by itself so it holds up at night
export function litVC(key, opts, k) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';'); };
  m.customProgramCacheKey = () => 'ggb' + key;
  return m;
}
const VC = (M, key, opts, k = 0.3) => M[key] || (M[key] = litVC(key, opts, k));
// vertex-coloured and tinted per instance (aTint), with its own extra light (aLit)
function tintVC(key, opts, k) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; attribute float aLit; varying vec3 vTint; varying float vLit;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint; vLit = aLit;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint; varying float vLit;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * (' + k.toFixed(2) + ' + vLit);');
  };
  m.customProgramCacheKey = () => 'ggbT' + key;
  return m;
}
const TV = (M, key, opts, k = 0.3) => M[key] || (M[key] = tintVC(key, opts, k));
// light itself, one colour per instance (lantern glass, windows)
function emitMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: 'attribute vec3 aTint; varying vec3 vC; void main(){ vC = aTint; gl_Position = projectionMatrix * (modelViewMatrix * instanceMatrix * vec4(position, 1.0)); }',
    fragmentShader: 'varying vec3 vC; void main(){ gl_FragColor = vec4(vC, 1.0); }',
  });
}
// glass: a bright edge where it turns from you, nearly nothing face on
export function glassMaterial(col = 0xbfefff, k = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(col) }, uK: { value: k } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uCol; uniform float uK; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = 0.05 + 0.8 * pow(f, 3.0); a = (a == a) ? a : 0.0; gl_FragColor = vec4(uCol * a * uK, 1.0); }',
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}
// porcelain: white with a blush, glossy, a little light of its own
function porcelain() { const m = new THREE.MeshStandardMaterial({ color: 0xfff4f6, roughness: 0.22, metalness: 0.05, emissive: 0x6a5a62, emissiveIntensity: 0.6 }); m.customProgramCacheKey = () => 'ggbPorc'; return m; }
// the sampler's border: cross-stitch on linen, a chain of red diamonds between green lines,
// hearts in the corners
function stitchMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uK: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * (modelViewMatrix * instanceMatrix * vec4(position, 1.0)); }',
    fragmentShader: /* glsl */`
      uniform float uK; varying vec2 vUv;
      void main(){
        vec2 n = vec2(132.0, 46.0);
        vec2 p = vUv * n, c = floor(p), f = fract(p) - 0.5;
        float xd = min(abs(f.x - f.y), abs(f.x + f.y));
        float st = smoothstep(0.2, 0.08, xd) * step(max(abs(f.x), abs(f.y)), 0.46);
        vec2 e2 = min(c, n - 1.0 - c);
        float ed = min(e2.x, e2.y);
        float u = e2.x < e2.y ? c.y : c.x;
        vec3 linen = vec3(0.86, 0.82, 0.74) * (0.94 + 0.06 * fract(sin(dot(c, vec2(12.9, 78.2))) * 4375.5));
        vec3 col = linen;
        vec3 red = vec3(0.62, 0.05, 0.09), green = vec3(0.12, 0.36, 0.2), blue = vec3(0.16, 0.3, 0.56);
        float m = 0.0; vec3 mc = red;
        if (ed > 0.5 && ed < 1.5) { m = 1.0; mc = green; }
        if (ed > 7.5 && ed < 8.5) { m = 1.0; mc = green; }
        if (ed > 1.5 && ed < 7.5) { float a = abs(mod(u, 8.0) - 4.0) + abs(ed - 4.5); if (a < 2.6 && a > 1.4) { m = 1.0; mc = red; } if (a < 0.6) { m = 1.0; mc = blue; } }
        // hearts in the corners
        vec2 k = min(c, n - 1.0 - c);
        if (k.x < 9.0 && k.y < 9.0) { vec2 q = (k - 4.5) / 3.2; q.y = -q.y; float hb = q.x * q.x + q.y * q.y - 1.0; float h = hb * hb * hb - q.x * q.x * q.y * q.y * q.y; m = h < 0.0 ? 1.0 : 0.0; mc = red; }
        col = mix(col, mc, m * st);
        gl_FragColor = vec4(col * 0.85 * uK, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the things ----------
// an iron lamp post, its lantern at 8 (the glass is the ggbLampGlass layer)
function lampGeo() {
  const iron = C(0x1a1c24), p = [];
  p.push(paint(CY(0.45, 0.34, 0.5, 10, 0, 0, 0), iron), paint(CY(0.3, 0.2, 0.9, 10, 0, 0.5, 0), iron), paint(CY(0.13, 0.11, 5.6, 8, 0, 1.4, 0), iron));
  p.push(paint(RING(0.2, 0.05, 0, 1.45, 0, 12), iron), paint(RING(0.18, 0.05, 0, 6.95, 0, 12), iron));
  // the arm and the lantern's frame and cap
  p.push(paint(CY(0.12, 0.36, 0.35, 8, 0, 6.9, 0), iron));
  for (const [x, z] of [[-0.34, -0.34], [0.34, -0.34], [-0.34, 0.34], [0.34, 0.34]]) p.push(paint(B(0.07, 1.05, 0.07, x, 7.8, z), iron));
  const cap = new THREE.ConeGeometry(0.64, 0.6, 4); cap.rotateY(Math.PI / 4); cap.translate(0, 8.63, 0); p.push(paint(cap, iron));
  p.push(paint(ell(0.09, 0.16, 0.09, 0, 9.05, 0, 8, 6), iron));
  // snow on its cap
  const sn = new THREE.ConeGeometry(0.5, 0.25, 4); sn.rotateY(Math.PI / 4); sn.translate(0, 8.82, 0); p.push(paint(sn, C(0xe8f0f8)));
  return mergeC(p);
}
function lampGlass() { return B(0.62, 0.95, 0.62, 0, 7.8, 0); }

// an ice-fishing hut: plank walls painted (the tint), a window toward the road, a door, a stovepipe
function hutWalls() {
  const p = [paint(B(3.0, 2.4, 2.6, 0, 1.2, 0), [1, 1, 1])];
  for (let k = 0; k < 6; k++) p.push(paint(B(3.04, 0.04, 2.64, 0, 0.3 + k * 0.38, 0), [0.7, 0.7, 0.7]));
  p.push(paint(B(0.9, 1.9, 0.06, -0.85, 0.95, 1.31), [0.55, 0.5, 0.48]));
  return mergeC(p);
}
function hutRoof() {
  const p = [];
  const s = new THREE.Shape(); s.moveTo(-1.8, 0); s.lineTo(1.8, 0); s.lineTo(0, 1.15); s.closePath();
  const r = new THREE.ExtrudeGeometry(s, { depth: 3.0, bevelEnabled: false }); r.translate(0, 2.38, -1.5); p.push(paint(r, C(0x2a2228)));
  const s2 = new THREE.Shape(); s2.moveTo(-1.9, 0); s2.lineTo(1.9, 0); s2.lineTo(0, 1.25); s2.closePath();
  const sn = new THREE.ExtrudeGeometry(s2, { depth: 3.1, bevelEnabled: false }); sn.scale(1, 0.55, 1); sn.translate(0, 2.95, -1.55); p.push(paint(sn, C(0xe4eef8)));
  p.push(paint(CY(0.13, 0.13, 1.6, 8, 0.9, 2.6, -0.5), C(0x3a3a40)), paint(CY(0.2, 0.2, 0.15, 8, 0.9, 4.2, -0.5), C(0x3a3a40)));
  // snow drifted up the side
  p.push(paint(ell(1.8, 0.45, 0.7, 0.4, 0.05, -1.4, 10, 6), C(0xdce8f4)));
  return mergeC(p);
}
function hutWindow() { return B(0.85, 0.7, 0.06, 0.55, 1.5, 1.32); }

// the signpost: arms pointing every which way
function signpostGeo() {
  const p = [], wood = C(0x3a2a1c), R = seeded(5);
  p.push(paint(CY(0.3, 0.22, 13.2, 8, 0, 0, 0), wood));
  for (let k = 0; k < 11; k++) {
    const y = 4.4 + k * 0.8, a = R() * TAU, tilt = (R() - 0.5) * 0.55;
    const s = new THREE.Shape(); s.moveTo(0, -0.38); s.lineTo(3.1, -0.38); s.lineTo(3.75, 0); s.lineTo(3.1, 0.38); s.lineTo(0, 0.38); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false }); g.translate(0.15, 0, -0.07); g.rotateZ(tilt); g.rotateY(a); g.translate(0, y, 0);
    p.push(paint(g, k % 3 === 1 ? C(0xb83a3a) : (k % 3 === 2 ? C(0x2a5a8a) : C(0xe0dace))));
  }
  p.push(paint(ell(0.55, 0.3, 0.55, 0, 13.2, 0, 10, 6), C(0xe8f0f8)));
  p.push(paint(ell(2.2, 0.6, 2.2, 0, 0.0, 0, 12, 6), C(0xdce8f4)));
  return mergeC(p);
}

// the music box: a lacquered box on gilt feet (12 wide, 8 deep, 4.5 high), the front at +z; the lid
// is its own piece, hinged at the back; a wind-up key at the side
function boxGeo() {
  const p = [], lac = C(0x3a0e22), gold = C(0xe0b050), velvet = C(0xc83a6a);
  p.push(paint(B(12, 4.0, 8, 0, 2.5, 0), lac));
  for (const y of [0.55, 4.4]) p.push(paint(B(12.3, 0.25, 8.3, 0, y, 0), gold));
  for (const x of [-4, 0, 4]) p.push(paint(B(2.6, 2.2, 0.08, x, 2.5, 4.02), gold), paint(B(2.3, 1.9, 0.1, x, 2.5, 4.03), C(0x5a1a36)));
  for (const [x, z] of [[-5.4, -3.4], [5.4, -3.4], [-5.4, 3.4], [5.4, 3.4]]) p.push(paint(ell(0.7, 0.55, 0.7, x, 0.45, z, 10, 8), gold));
  p.push(paint(B(11.4, 0.1, 7.4, 0, 4.47, 0), velvet));
  p.push(paint(CY(1.4, 1.4, 0.2, 18, 0, 4.4, 0), C(0xd8d8e0)));
  return mergeC(p);
}
function lidGeo() {
  // built hinged at the origin, lying along +z (closed), its inside facing -y
  const p = [], lac = C(0x3a0e22), gold = C(0xe0b050);
  p.push(paint(B(12.2, 0.7, 8.2, 0, 0.35, 4.1), lac), paint(B(12.4, 0.2, 8.4, 0, 0.72, 4.1), gold));
  p.push(paint(B(11.0, 0.06, 7.2, 0, -0.02, 4.1), C(0xb8c4cc)));   // the mirror
  for (const [x, z] of [[-5.6, 0.5], [5.6, 0.5], [-5.6, 7.7], [5.6, 7.7]]) p.push(paint(ell(0.35, 0.18, 0.35, x, 0.9, z, 8, 5), gold));
  return mergeC(p);
}
function keyGeo() {
  const gold = C(0xe0b050), p = [paint(limb(V3(0, 0, 0), V3(1.6, 0, 0), 0.18, 0.18, 8), gold)];
  for (const s of [-1, 1]) { const t = new THREE.TorusGeometry(0.6, 0.16, 6, 14); t.rotateY(Math.PI / 2); t.translate(1.9, s * 0.6, 0); p.push(paint(t, gold)); }
  return mergeC(p);
}

// the sampler on its easel: a gilt frame (13.8 x 5.4) round the stitched border, the motto in it
const SAMPLER_Y = 12.6;     // the middle of the frame, up where it can be read from the road
function easelGeo() {
  const wood = C(0x2a1a12), gold = C(0xd8a840), p = [];
  for (const s of [-1, 1]) p.push(paint(limb(V3(s * 5.0, 0, 1.6), V3(s * 1.2, 18.6, -0.1), 0.28, 0.18, 6), wood));
  p.push(paint(limb(V3(0, 0, -6.0), V3(0, 17.4, -0.3), 0.24, 0.16, 6), wood));
  p.push(paint(B(14.6, 0.4, 1.4, 0, SAMPLER_Y - 2.95, 0.35), wood));
  p.push(paint(limb(V3(-3.4, SAMPLER_Y - 3.0, 0.6), V3(0, SAMPLER_Y - 3.0, -4.0), 0.12, 0.12, 5), wood), paint(limb(V3(3.4, SAMPLER_Y - 3.0, 0.6), V3(0, SAMPLER_Y - 3.0, -4.0), 0.12, 0.12, 5), wood));
  // the frame
  const fy = SAMPLER_Y, W = 13.8, H = 5.4, t = 0.55;
  p.push(paint(B(W, t, 0.45, 0, fy + H / 2 - t / 2, 0.2), gold), paint(B(W, t, 0.45, 0, fy - H / 2 + t / 2, 0.2), gold));
  p.push(paint(B(t, H, 0.45, W / 2 - t / 2, fy, 0.2), gold), paint(B(t, H, 0.45, -W / 2 + t / 2, fy, 0.2), gold));
  for (const x of [-1, 1]) for (const y of [-1, 1]) p.push(paint(ell(0.55, 0.55, 0.3, x * (W / 2 - 0.25), fy + y * (H / 2 - 0.25), 0.4, 10, 8), gold));
  p.push(paint(ell(1.0, 0.6, 0.3, 0, fy + H / 2 + 0.2, 0.35, 10, 6), gold));
  return mergeC(p);
}

// a birdcage, gilt (4.6 across, 6 high): the base, the bars, the rings, a dome of hoops, a ring to
// hang it by, a perch. The door (front, +z) is its own piece.
export function cageGeo() {
  const gold = C(0xe2b24a), p = [];
  p.push(paint(lathe([[0.001, 0], [2.35, 0], [2.35, 0.2], [2.18, 0.32], [2.12, 0.48], [0.001, 0.48]], 24), gold));
  const N = 22, R = 2.0;
  for (let k = 0; k < N; k++) { const a = (k / N) * TAU; if (Math.abs(a - Math.PI / 2) < 0.3) continue; p.push(paint(CY(0.04, 0.04, 3.55, 5, Math.cos(a) * R, 0.48, Math.sin(a) * R), gold)); }
  for (const y of [0.5, 1.6, 3.0, 4.03]) p.push(paint(RING(R, 0.055, 0, y, 0, 32), gold));
  for (let k = 0; k < 6; k++) { const t = new THREE.TorusGeometry(R, 0.045, 4, 16, Math.PI); t.scale(1, 0.62, 1); t.rotateY((k * Math.PI) / 6); t.translate(0, 4.03, 0); p.push(paint(t, gold)); }
  p.push(paint(ell(0.2, 0.28, 0.2, 0, 5.3, 0, 8, 6), gold));
  const hook = new THREE.TorusGeometry(0.45, 0.07, 6, 16); hook.translate(0, 6.0, 0); p.push(paint(hook, gold));
  p.push(paint(limb(V3(-1.7, 2.2, 0), V3(1.7, 2.2, 0), 0.06, 0.06, 6), C(0x6a4a2a)));
  return mergeC(p);
}
export function cageDoor() {
  // hinged at x 0, opening to -x; three bars and its frame
  const gold = C(0xe2b24a), p = [];
  for (const x of [0.05, 0.4, 0.75, 1.1]) p.push(paint(CY(0.04, 0.04, 2.5, 5, -x, 0.5, 0), gold));
  for (const y of [0.5, 3.0]) p.push(paint(limb(V3(0, y, 0), V3(-1.15, y, 0), 0.05, 0.05, 5), gold));
  return mergeC(p);
}
// the cloth thrown over a cage: a bell of heavy linen with a hem that hangs in folds
// (deep rose velvet falling in folds, a gold fringe round the hem, a tassel on top)
export function clothGeo() {
  const g = lathe([[0.001, 6.6], [1.2, 6.35], [2.05, 5.6], [2.42, 4.3], [2.52, 2.4], [2.6, 0.5], [2.75, 0.15]], 36).toNonIndexed();
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
    const fold = Math.sin(a * 9) * (1 - smooth(1.2, 6.0, y));
    const k = 1 + 0.11 * fold;
    p.setXYZ(i, x * k, y - 0.25 * (0.5 + 0.5 * Math.sin(a * 9 + 1.6)) * (1 - smooth(0.0, 0.6, y)), z * k);
    const sh = 0.55 + 0.45 * (0.5 + 0.5 * fold) + 0.15 * smooth(4.5, 6.6, y);
    col.set([0.5 * sh, 0.08 * sh, 0.16 * sh], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const parts = [g], gold = C(0xe2b24a);
  for (let k = 0; k < 36; k++) { const a = (k / 36) * TAU; const f = new THREE.ConeGeometry(0.07, 0.45, 4); f.rotateX(Math.PI); f.translate(Math.cos(a) * 2.95, -0.1, Math.sin(a) * 2.95); parts.push(paint(f, gold)); }
  parts.push(paint(RING(2.85, 0.07, 0, 0.15, 0, 36), gold), paint(ell(0.2, 0.25, 0.2, 0, 6.7, 0, 8, 6), gold), paint(limb(V3(0, 6.6, 0), V3(0, 7.4, 0), 0.05, 0.05, 5), gold));
  return mergeC(parts);
}
// a column for a cage to stand on (9 high)
function columnGeo() {
  return paint(lathe([[0.001, 0], [1.7, 0], [1.7, 0.5], [1.2, 0.8], [0.95, 1.2], [0.85, 7.8], [1.2, 8.3], [1.6, 8.6], [1.6, 9.0], [0.001, 9.0]], 18), C(0xd8e4ee));
}

// the cake under glass: a stand, a pink cake with white piping and cherries; the dome is glass
function standCakeGeo() {
  const p = [], white = C(0xf2eef0), gold = C(0xe0b050), pink = C(0xf2a2c2), red = C(0xc81830);
  p.push(paint(lathe([[0.001, 0], [2.3, 0], [2.3, 0.3], [0.9, 0.7], [0.5, 1.2], [0.42, 4.3], [0.8, 4.65], [4.5, 4.8], [4.7, 4.95], [4.55, 5.05], [0.001, 5.05]], 24), white));
  p.push(paint(RING(4.62, 0.09, 0, 4.95, 0, 40), gold), paint(RING(2.3, 0.08, 0, 0.2, 0, 24), gold));
  p.push(paint(lathe([[0.001, 5.05], [3.2, 5.05], [3.2, 6.7], [3.0, 6.85], [2.2, 6.85], [2.2, 8.1], [2.05, 8.2], [0.001, 8.2]], 28), pink));
  p.push(paint(RING(3.12, 0.16, 0, 6.8, 0, 32), white), paint(RING(2.12, 0.14, 0, 8.15, 0, 28), white), paint(RING(3.22, 0.14, 0, 5.15, 0, 32), white));
  for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; p.push(paint(ell(0.22, 0.38, 0.22, Math.cos(a) * 3.2, 6.45, Math.sin(a) * 3.2, 6, 5), white)); }
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + 0.3; p.push(paint(ell(0.32, 0.32, 0.32, Math.cos(a) * 1.3, 8.45, Math.sin(a) * 1.3, 8, 6), red)); }
  return mergeC(p);
}
function domeGeo() { const g = new THREE.SphereGeometry(4.45, 28, 12, 0, TAU, 0, Math.PI / 2); g.scale(1, 1.2, 1); g.translate(0, 5.0, 0); const k = new THREE.SphereGeometry(0.45, 10, 8); k.translate(0, 10.55, 0); return mergeGeometries([ni(g), ni(k)].map((x) => { for (const a of Object.keys(x.attributes)) if (a !== 'position' && a !== 'normal') x.deleteAttribute(a); return x; }), false); }

// the microphone on its stage, frozen in a block of ice (the block is glass)
function micGeo() {
  const p = [], wood = C(0x24141a), gold = C(0xe0b050), steel = C(0x9aa2b0), dark = C(0x2a2a30);
  p.push(paint(lathe([[0.001, 0], [6.2, 0], [6.2, 1.2], [6.0, 1.32], [0.001, 1.32]], 32), wood), paint(RING(6.1, 0.1, 0, 1.26, 0, 40), gold));
  p.push(paint(CY(1.1, 1.0, 0.18, 18, 0, 1.32, 0), dark), paint(CY(0.09, 0.08, 6.3, 8, 0, 1.5, 0), steel));
  p.push(paint(limb(V3(0, 7.7, 0), V3(0, 8.65, 0.55), 0.2, 0.26, 10), dark));
  p.push(paint(ell(0.4, 0.42, 0.4, 0, 8.95, 0.72, 14, 10), steel), paint(RING(0.38, 0.05, 0, 8.72, 0.6, 16), gold));
  // icicles from the block
  for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU, r = 1.0 + 0.3 * hash(k); const ic = new THREE.ConeGeometry(0.16, 1.2 + hash(k * 3) * 1.4, 5); ic.rotateX(Math.PI); ic.translate(Math.cos(a) * r, 6.1 - 0.6 - hash(k * 3) * 0.7, Math.sin(a) * r); p.push(paint(ic, C(0xd0f0ff))); }
  return mergeC(p);
}
function micIceGeo() { const g = B(2.8, 3.6, 2.8, 0, 7.9, 0.3); return g; }

// a rule sign on two posts (panel 9.6 x 3.6, face at z 0.17); the words are the ggbRuleFace layer
function ruleGeo() {
  const p = [], post = C(0xd8dce4), white = C(0xf4f4f0), red = C(0xc8101a);
  for (const s of [-1, 1]) p.push(paint(B(0.3, 9.3, 0.3, s * 3.6, 4.65, 0), post));
  p.push(paint(B(9.6, 3.6, 0.3, 0, 7.4, 0), white));
  // a red circle with the bar through it, either end
  // a red band along the top, the circle with the bar through it at either end of it
  p.push(paint(B(9.6, 0.6, 0.31, 0, 9.0, 0), red));
  for (const s of [-1, 1]) {
    const ring = new THREE.TorusGeometry(0.62, 0.11, 6, 20); ring.translate(s * 4.15, 10.0, 0.0); p.push(paint(ring, red));
    const bar = new THREE.BoxGeometry(1.2, 0.14, 0.12); bar.rotateZ(-0.785); bar.translate(s * 4.15, 10.0, 0); p.push(paint(bar, red));
    p.push(paint(CY(0.08, 0.08, 0.5, 5, s * 4.15, 9.3, 0), post));
  }
  return mergeC(p);
}

// the long table on the ice, along the road (local z), 34 long: cloth, chairs, candelabras, plates
function tableGeo() {
  const p = [], cloth = C(0xf4f0ec), gold = C(0xe0b050), white = C(0xe8e4ea), china = C(0xffffff), glass = C(0xb8e8ff);
  p.push(paint(B(5.4, 0.25, 34, 0, 3.6, 0), cloth));
  for (const s of [-1, 1]) p.push(paint(B(0.08, 1.7, 34, s * 2.74, 2.8, 0), cloth));
  for (const s of [-1, 1]) p.push(paint(B(5.5, 1.7, 0.08, 0, 2.8, s * 17.02), cloth));
  for (const x of [-2.2, 2.2]) for (const z of [-16, 16]) p.push(paint(B(0.3, 2.0, 0.3, x, 1.0, z), C(0x6a4a3a)));
  for (let k = 0; k < 7; k++) {
    const z = -13.8 + k * 4.6;
    for (const s of [-1, 1]) {
      // her place: a plate, a glass, a little card with no name on it
      p.push(paint(CY(0.75, 0.7, 0.07, 18, s * 1.6, 3.73, z), china), paint(RING(0.72, 0.04, s * 1.6, 3.8, z, 18), gold));
      p.push(paint(CY(0.08, 0.22, 0.6, 8, s * 1.9, 3.73, z + 0.95), glass));
      const card = B(0.6, 0.35, 0.03, s * 1.0, 3.9, z); card.rotateX(0); p.push(paint(card, white));
      // her chair, pulled in
      const cx = s * 3.55;
      p.push(paint(B(1.8, 0.22, 1.8, cx, 2.05, z), white));
      for (const dx of [-0.75, 0.75]) for (const dz of [-0.75, 0.75]) p.push(paint(B(0.14, 2.0, 0.14, cx + dx, 1.0, z + dz), white));
      p.push(paint(B(0.2, 3.3, 1.8, cx + s * 0.85, 3.8, z), white), paint(ell(0.3, 0.42, 0.95, cx + s * 0.85, 5.55, z, 8, 6), gold));
    }
  }
  // three candelabras down the middle
  for (const z of [-10, 0, 10]) {
    p.push(paint(CY(0.6, 0.35, 0.25, 12, 0, 3.73, z), gold), paint(CY(0.12, 0.1, 2.0, 8, 0, 3.95, z), gold));
    for (const s of [-1, 1]) { p.push(paint(limb(V3(0, 5.2, z), V3(0, 5.6, z + s * 1.1), 0.07, 0.06, 5), gold)); p.push(paint(CY(0.11, 0.11, 0.9, 8, 0, 5.6, z + s * 1.1), white)); }
    p.push(paint(CY(0.11, 0.11, 0.9, 8, 0, 5.95, z), white));
  }
  return mergeC(p);
}
// the dais the table stands on: a slab of ice with a step round it
const DAIS = 3.5;
function daisGeo() { const a = new THREE.BoxGeometry(14, DAIS - 0.6, 42); a.translate(0, (DAIS - 0.6) / 2, 0); const b = new THREE.BoxGeometry(12.4, 0.6, 40); b.translate(0, DAIS - 0.3, 0); const c = new THREE.BoxGeometry(16, 0.8, 44); c.translate(0, 0.4, 0); return mergePN([a, b, c]); }
// the card at the head of the table: an A of two boards, the words on the front one
function tentGeo() {
  const p = [], white = C(0xf2f0ea);
  for (const s of [-1, 1]) { const g = B(9.8, 3.4, 0.12, 0, -1.7, 0); g.rotateX(-0.26 * s); g.translate(0, 3.3, 0); p.push(paint(g, white)); }
  return mergeC(p);
}

// the carousel (28 across): its platform, the mirrored column, a striped canopy with its valance
function carouselGeo() {
  const p = [], white = C(0xf4f0f4), gold = C(0xe2b24a), mirror = C(0x9ab8d0), blue = C(0x7ab8e8);
  p.push(paint(lathe([[0.001, 0], [14, 0], [14, 1.0], [13.7, 1.25], [0.001, 1.25]], 40), white), paint(RING(14.0, 0.18, 0, 1.0, 0, 48), gold));
  const col = new THREE.CylinderGeometry(2.4, 2.4, 13.2, 16, 1).toNonIndexed(); col.translate(0, 1.25 + 6.6, 0);
  const cc = new Float32Array(col.attributes.position.count * 3);
  for (let i = 0; i < col.attributes.position.count; i += 3) { const x = (col.attributes.position.getX(i) + col.attributes.position.getX(i + 1) + col.attributes.position.getX(i + 2)) / 3, z = (col.attributes.position.getZ(i) + col.attributes.position.getZ(i + 1) + col.attributes.position.getZ(i + 2)) / 3; const k = Math.floor(((Math.atan2(z, x) + Math.PI) / TAU) * 16) % 2; for (let j = 0; j < 3; j++) cc.set(k ? mirror : gold, (i + j) * 3); }
  col.setAttribute('color', new THREE.BufferAttribute(cc, 3)); p.push(col);
  // the canopy: stripes of white and ice blue
  const can = new THREE.ConeGeometry(15.6, 5.2, 32, 1, true).toNonIndexed(); can.translate(0, 14.45 + 2.6, 0);
  const ca = new Float32Array(can.attributes.position.count * 3);
  for (let i = 0; i < can.attributes.position.count; i += 3) { const x = (can.attributes.position.getX(i) + can.attributes.position.getX(i + 1) + can.attributes.position.getX(i + 2)) / 3, z = (can.attributes.position.getZ(i) + can.attributes.position.getZ(i + 1) + can.attributes.position.getZ(i + 2)) / 3; const k = Math.floor(((Math.atan2(z, x) + Math.PI) / TAU) * 32) % 2; for (let j = 0; j < 3; j++) ca.set(k ? blue : white, (i + j) * 3); }
  can.setAttribute('color', new THREE.BufferAttribute(ca, 3)); p.push(can);
  p.push(paint(RING(15.6, 0.22, 0, 14.45, 0, 48), gold));
  for (let k = 0; k < 32; k++) { const a = ((k + 0.5) / 32) * TAU; const sc = new THREE.CircleGeometry(1.45, 8, Math.PI, Math.PI); sc.rotateY(-a + Math.PI / 2); sc.translate(Math.cos(a) * 15.6, 14.45, Math.sin(a) * 15.6); p.push(paint(sc, k % 2 ? gold : white)); }
  p.push(paint(ell(0.6, 1.0, 0.6, 0, 20.4, 0, 10, 8), gold), paint(CY(0.06, 0.06, 2.4, 5, 0, 21.2, 0), gold));
  const pen = new THREE.BufferGeometry(); pen.setAttribute('position', new THREE.Float32BufferAttribute([0, 23.5, 0, 0, 22.6, 0, 2.0, 23.05, 0], 3)); pen.computeVertexNormals(); p.push(paint(pen, C(0xe84a7a)));
  return mergeC(p);
}
// a carousel horse with its brass pole (pole 13 tall; the horse rides it at about 5)
function horseGeo() {
  const p = [], white = C(0xf6f2f4), gold = C(0xe2b24a), pink = C(0xe86a9a), blue = C(0x6aa8e0);
  p.push(paint(ell(0.85, 0.82, 1.75, 0, 0, 0, 12, 9), white));
  p.push(paint(limb(V3(0, 0.45, 1.25), V3(0, 1.55, 2.0), 0.55, 0.36, 9), white));
  const head = ell(0.34, 0.4, 0.78, 0, 0, 0, 10, 8); head.rotateX(0.55); head.translate(0, 1.7, 2.45); p.push(paint(head, white));
  for (const s of [-1, 1]) { const e = new THREE.ConeGeometry(0.1, 0.35, 5); e.translate(s * 0.15, 2.18, 2.05); p.push(paint(e, white)); }
  p.push(paint(limb(V3(0, 0.9, 1.15), V3(0, 2.0, 1.95), 0.12, 0.1, 5, 1.6, 0.6), gold));
  for (const s of [-1, 1]) { p.push(paint(limb(V3(s * 0.4, -0.3, 1.1), V3(s * 0.42, -0.75, 1.85), 0.2, 0.16, 7), white), paint(limb(V3(s * 0.42, -0.75, 1.85), V3(s * 0.42, -1.45, 1.6), 0.15, 0.12, 7), white)); }
  for (const s of [-1, 1]) p.push(paint(limb(V3(s * 0.45, -0.35, -1.15), V3(s * 0.47, -1.95, -1.45), 0.22, 0.13, 7), white));
  p.push(paint(limb(V3(0, 0.3, -1.65), V3(0, -1.1, -2.3), 0.22, 0.08, 7), gold));
  p.push(paint(ell(0.92, 0.22, 0.78, 0, 0.78, -0.05, 10, 6), pink), paint(B(1.9, 0.6, 0.12, 0, 0.3, -0.05), blue));
  return mergeC(p);
}
function poleGeo() { return paint(CY(0.15, 0.15, 13.2, 8, 0, 1.25, 0), C(0xe2b24a)); }

// the wedding cake: five tiers (it's ice; it'll crack), the piping round every edge
function cakeGeo() {
  const tiers = [[10.5, 0, 0.6], [9, 0.6, 5.0], [7.5, 5.0, 9.4], [6, 9.4, 13.6], [4.5, 13.6, 17.6], [3, 17.6, 21.2]];
  const pts = [[0.001, 0]];
  for (const [r, y0, y1] of tiers) { pts.push([r, y0 + 0.001], [r, y1]); }
  pts.push([0.001, 21.2]);
  const parts = [lathe(pts, 32)];
  for (const [r, y0, y1] of tiers.slice(1)) { parts.push(RING(r, 0.32, 0, y1, 0, 36), RING(r + 0.05, 0.28, 0, y0 + 0.3, 0, 36)); for (let k = 0; k < 18; k++) { const a = (k / 18) * TAU; const sw = new THREE.TorusGeometry(r * 0.17, 0.12, 4, 8, Math.PI); sw.rotateZ(Math.PI); sw.rotateY(-a + Math.PI / 2); sw.translate(Math.cos(a) * (r + 0.05), y1 - 0.6, Math.sin(a) * (r + 0.05)); parts.push(sw); } }
  return mergePN(parts);
}
function rosesGeo() {
  const p = [], pink = C(0xf080a8), deep = C(0xd04a7a), leaf = C(0x4a8a5a);
  for (const [r, y] of [[9, 5.0], [7.5, 9.4], [6, 13.6], [4.5, 17.6], [3, 21.2]]) {
    const n = Math.round(r * 1.6);
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU + r; p.push(paint(ell(0.62, 0.5, 0.62, Math.cos(a) * r, y + 0.25, Math.sin(a) * r, 8, 6), k % 3 ? pink : deep)); if (k % 2) p.push(paint(ell(0.5, 0.12, 0.25, Math.cos(a + 0.12) * (r + 0.3), y + 0.05, Math.sin(a + 0.12) * (r + 0.3), 5, 3), leaf)); }
  }
  return mergeC(p);
}

// the heart: faceted, deep; it stands on its point in a socket on a plinth
function heartGeo() {
  const s = new THREE.Shape();
  s.moveTo(5, 5); s.bezierCurveTo(5, 5, 4, 0, 0, 0); s.bezierCurveTo(-6, 0, -6, 7, -6, 7); s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
  s.bezierCurveTo(12, 15.4, 16, 11, 16, 7); s.bezierCurveTo(16, 7, 16, 0, 10, 0); s.bezierCurveTo(7, 0, 5, 5, 5, 5);
  const g = new THREE.ExtrudeGeometry(s, { depth: 3.0, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.4, bevelSegments: 2, curveSegments: 7 });
  g.translate(-5, -19, -1.5); g.scale(0.52, -0.52, 0.52);   // point down at 0, lobes up, 10 tall
  return mergePN([g]);
}

// the ring: a gold band standing in the ice, its stone held up in four claws
function ringBandGeo() {
  const gold = C(0xe8b84a), p = [];
  const t = new THREE.TorusGeometry(4, 0.75, 10, 44); p.push(paint(t, gold));
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4; p.push(paint(limb(V3(Math.cos(a) * 0.6, 4.4, Math.sin(a) * 0.6), V3(Math.cos(a) * 1.25, 5.6, Math.sin(a) * 1.25), 0.12, 0.09, 5), gold)); }
  p.push(paint(CY(0.9, 0.6, 0.6, 12, 0, 4.2, 0), gold));
  return mergeC(p);
}
function diamondGeo() { const a = new THREE.CylinderGeometry(0.95, 1.7, 0.75, 12, 1); a.translate(0, 5.75, 0); const b = new THREE.ConeGeometry(1.7, 1.7, 12, 1); b.rotateX(Math.PI); b.translate(0, 4.53, 0); return mergePN([a, b]); }

// the glass coffin on its bier, the lid off and broken, the bed empty, roses (along x; front +z)
function bierGeo() {
  const p = [], velvet = C(0x2a0c1a), gold = C(0xe0b050), satin = C(0xf4eef2), red = C(0xb8102a), leaf = C(0x2a5a3a);
  p.push(paint(B(9.4, 2.2, 4.4, 0, 1.1, 0), velvet), paint(B(9.6, 0.2, 4.6, 0, 2.25, 0), gold), paint(B(9.6, 0.2, 4.6, 0, 0.1, 0), gold));
  // the coffin's gold edges (7.8 x 2.2 x 3.0, sitting on the bier)
  const y0 = 2.35, L = 7.8, H = 2.2, D = 3.0;
  for (const y of [y0, y0 + H]) for (const z of [-D / 2, D / 2]) p.push(paint(B(L, 0.14, 0.14, 0, y, z), gold));
  for (const y of [y0, y0 + H]) for (const x of [-L / 2, L / 2]) p.push(paint(B(0.14, 0.14, D, x, y, 0), gold));
  for (const x of [-L / 2, L / 2]) for (const z of [-D / 2, D / 2]) p.push(paint(B(0.14, H, 0.14, x, y0 + H / 2, z), gold));
  // the bed she left: satin, the pillow still dented
  p.push(paint(B(7.5, 0.5, 2.7, 0, y0 + 0.25, 0), satin), paint(ell(0.9, 0.3, 1.1, -3.0, y0 + 0.65, 0, 10, 6), satin));
  const R = seeded(31);
  for (let k = 0; k < 14; k++) { const x = (R() - 0.5) * 7, z = (R() - 0.5) * 2.4; p.push(paint(ell(0.26, 0.2, 0.26, x, y0 + 0.62, z, 7, 5), red)); if (k % 2) p.push(paint(ell(0.3, 0.06, 0.12, x + 0.25, y0 + 0.55, z, 4, 3), leaf)); }
  for (let k = 0; k < 16; k++) { const a = R() * TAU, r = 5.5 + R() * 3; p.push(paint(ell(0.28, 0.2, 0.28, Math.cos(a) * r, 0.15, Math.sin(a) * r * 0.7, 7, 5), red)); }
  // candle stands at the corners
  for (const x of [-5.3, 5.3]) for (const z of [-2.8, 2.8]) p.push(paint(CY(0.5, 0.18, 4.2, 8, x, 0, z), gold), paint(CY(0.15, 0.15, 0.8, 8, x, 4.2, z), satin));
  // the lid, thrown down against the bier, its frame bent
  const lid = [B(7.9, 0.14, 0.14, 0, 0, -1.5), B(7.9, 0.14, 0.14, 0, 0, 1.5), B(0.14, 0.14, 3.1, -3.95, 0, 0), B(0.14, 0.14, 3.1, 3.95, 0, 0)].map((g) => paint(g, gold));
  for (const g of lid) { g.rotateZ(0.08); g.rotateX(1.15); g.translate(0.4, 1.4, 3.6); p.push(g); }
  return mergeC(p);
}
function coffinGlassGeo() {
  const y0 = 2.35, L = 7.8, H = 2.2, D = 3.0, p = [];
  p.push(B(L, H, 0.04, 0, y0 + H / 2, -D / 2), B(L, H, 0.04, 0, y0 + H / 2, D / 2), B(0.04, H, D, -L / 2, y0 + H / 2, 0), B(0.04, H, D, L / 2, y0 + H / 2, 0));
  const lid = B(7.9, 0.06, 3.1, 0, 0, 0); lid.rotateZ(0.08); lid.rotateX(1.15); lid.translate(0.4, 1.4, 3.6); p.push(lid);
  return mergePN(p);
}

// ---------- registered ----------
const TT = { aTint: 3 }, TL = { aTint: 3, aLit: 1 }, FX = { aFx: 3, aTint: 3 }, SG = { aIdx: 1, aWake: 2 };
const face = (w, h, x, y, z, ry = 0) => () => { const g = new THREE.PlaneGeometry(w, h); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
const ICE = (M) => M.ggbIce || (M.ggbIce = iceMaterial());
const GLASS = (M) => M.ggbGlass || (M.ggbGlass = glassMaterial(0xbfefff, 1));
extend({
  layers: {
    ggbLamp: (M) => [lampGeo(), VC(M, 'ggbIron', { roughness: 0.55, metalness: 0.4 }, 0.22), 160, {}],
    ggbLampGlass: (M) => [lampGlass(), M.ggbEmit || (M.ggbEmit = emitMaterial()), 260, TT],
    ggbHut: (M) => [hutWalls(), TV(M, 'ggbHutM', { roughness: 0.85 }, 0.25), 60, TL],
    ggbHutRoof: (M) => [hutRoof(), VC(M, 'ggbSnowM', { roughness: 0.8 }, 0.3), 60, {}],
    ggbHutWin: (M) => [hutWindow(), M.ggbEmit || (M.ggbEmit = emitMaterial()), 60, TT],
    ggbSignpost: (M) => [signpostGeo(), VC(M, 'ggbWood', { roughness: 0.8 }, 0.32), 2, {}],
    ggbBox: (M) => [boxGeo(), VC(M, 'ggbLacq', { roughness: 0.3, metalness: 0.25 }, 0.35), 2, {}],
    ggbLid: (M) => [lidGeo(), VC(M, 'ggbLacq', { roughness: 0.3, metalness: 0.25 }, 0.35), 2, {}],
    ggbLidFace: (M) => [(() => { const g = new THREE.PlaneGeometry(6.4 * 1.45, 2.0 * 1.45); g.rotateX(Math.PI / 2); g.translate(0, -0.06, 4.1); return g; })(), M.sign, 2, SG],
    ggbKey: (M) => [keyGeo(), VC(M, 'ggbLacq', { roughness: 0.3, metalness: 0.25 }, 0.35), 2, {}],
    ggbPorcelain: (M) => [girl('ballet'), M.ggbPorc || (M.ggbPorc = porcelain()), 4, {}],
    ggbEasel: (M) => [easelGeo(), VC(M, 'ggbGilt', { roughness: 0.4, metalness: 0.45 }, 0.3), 2, {}],
    ggbStitch: (M) => [face(13.0, 4.8, 0, SAMPLER_Y, 0.18)(), M.ggbStitchM || (M.ggbStitchM = stitchMaterial()), 2, {}],
    ggbSamplerFace: (M) => [face(6.4 * 1.55, 2.0 * 1.55, 0, SAMPLER_Y, 0.22)(), M.sign, 2, SG],
    ggbCage: (M) => [cageGeo(), VC(M, 'ggbGilt', { roughness: 0.4, metalness: 0.45 }, 0.3), 16, {}],
    ggbCageDoor: (M) => [cageDoor(), VC(M, 'ggbGilt', { roughness: 0.4, metalness: 0.45 }, 0.3), 16, {}],
    ggbCloth: (M) => [clothGeo(), VC(M, 'ggbCloth', { roughness: 0.9, side: THREE.DoubleSide }, 0.32), 16, {}],
    ggbColumn: (M) => [columnGeo(), VC(M, 'ggbSnowM', { roughness: 0.8 }, 0.3), 16, {}],
    ggbStand: (M) => [standCakeGeo(), VC(M, 'ggbChina', { roughness: 0.35 }, 0.4), 2, {}],
    ggbDome: (M) => [domeGeo(), GLASS(M), 2, {}],
    ggbMic: (M) => [micGeo(), VC(M, 'ggbGilt', { roughness: 0.4, metalness: 0.45 }, 0.3), 2, {}],
    ggbMicIce: (M) => [micIceGeo(), GLASS(M), 2, {}],
    ggbRule: (M) => [ruleGeo(), VC(M, 'ggbPaint', { roughness: 0.6 }, 0.35), 6, {}],
    ggbRuleFace: (M) => [face(6.4 * 1.38, 2.0 * 1.38, 0, 7.35, 0.17)(), M.sign, 6, SG],
    ggbTable: (M) => [tableGeo(), VC(M, 'ggbChina', { roughness: 0.35 }, 0.4), 2, {}],
    ggbDais: (M) => [daisGeo(), ICE(M), 2, FX],
    ggbTent: (M) => [tentGeo(), VC(M, 'ggbChina', { roughness: 0.35 }, 0.4), 2, {}],
    ggbTentFace: (M) => [(() => { const g = new THREE.PlaneGeometry(6.4 * 1.42, 2.0 * 1.42); g.translate(0, -1.7, 0.08); g.rotateX(-0.26); g.translate(0, 3.3, 0); return g; })(), M.sign, 2, SG],
    ggbCarousel: (M) => [carouselGeo(), VC(M, 'ggbCarM', { roughness: 0.45, metalness: 0.2 }, 0.38), 2, {}],
    ggbHorse: (M) => [horseGeo(), VC(M, 'ggbCarM', { roughness: 0.45, metalness: 0.2 }, 0.38), 40, {}],
    ggbPole: (M) => [poleGeo(), VC(M, 'ggbGilt', { roughness: 0.4, metalness: 0.45 }, 0.3), 40, {}],
    ggbCake: (M) => [cakeGeo(), ICE(M), 2, FX],
    ggbRoses: (M) => [rosesGeo(), VC(M, 'ggbRoseM', { roughness: 0.7 }, 0.4), 2, {}],
    ggbBride: (M) => [girl('bride'), M.ggbPorc || (M.ggbPorc = porcelain()), 2, {}],
    ggbGroom: (M) => [groom(), M.ggbPorc || (M.ggbPorc = porcelain()), 2, {}],
    ggbCakeFace: (M) => [face(6.4 * 1.4, 2.0 * 1.4, 0, 2.7, 9.12)(), M.sign, 2, SG],
    ggbHeart: (M) => [heartGeo(), ICE(M), 2, FX],
    ggbRing: (M) => [ringBandGeo(), VC(M, 'ggbGilt', { roughness: 0.4, metalness: 0.45 }, 0.3), 2, {}],
    ggbDiamond: (M) => [diamondGeo(), ICE(M), 2, FX],
    ggbBier: (M) => [bierGeo(), VC(M, 'ggbBierM', { roughness: 0.5, metalness: 0.15 }, 0.35), 2, {}],
    ggbCoffinGlass: (M) => [coffinGlassGeo(), GLASS(M), 2, {}],
    ggbBierFace: (M) => [face(6.4 * 0.95, 2.0 * 0.95, 0, 1.12, 2.22)(), M.sign, 2, SG],
  },
  parts: {
    // a lamp post; it goes out on the threat and goes low with the lights
    ggbLamp(S, it, p, q) {
      const L = S.layers; L.ggbLamp; L.ggbLampGlass;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, lv = lampLevel(S.plan, it, T);
      m.compose(p, q, S._s.set(1, 1, 1)); L.ggbLamp.add(m);
      const c = [1.0, 0.82, 0.55];
      L.ggbLampGlass.add(m, { aTint: [c[0] * (0.08 + 1.6 * lv), c[1] * (0.08 + 1.6 * lv), c[2] * (0.08 + 1.6 * lv)] });
      glowAt(S, p.x, p.y + 7.8, p.z, 3.2, c, 1.25 * lv, S.beatLamps ? 4 : 0);
      poolAt(S, p.x, 0.12, p.z, 14, c, 0.85 * lv);
    },
    // a fishing hut: its window lit until "they already know"
    ggbHut(S, it, p, q) {
      const L = S.layers; L.ggbHut; L.ggbHutRoof; L.ggbHutWin;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, know = S.plan.ggb?.know ?? 1e9;
      const off = know + (it.lag ?? 0);
      const lv = (1 - smooth(off, off + 0.12, T)) * (0.85 + 0.15 * Math.sin(T * 7 + it.seed * 20));
      m.compose(p, q, S._s.set(it.s, it.s, it.s)); L.ggbHut.add(m, { aTint: it.tint, aLit: 0.05 + 0.25 * lv }); L.ggbHutRoof.add(m);
      const w = [1, 0.78, 0.45];
      L.ggbHutWin.add(m, { aTint: [w[0] * (0.05 + 1.8 * lv), w[1] * (0.05 + 1.8 * lv), w[2] * (0.05 + 1.8 * lv)] });
      local(p, S.course.sample(it.t).yaw + it.rot, 0.55 * it.s, 1.5 * it.s, 1.6 * it.s, S._o);
      glowAt(S, S._o.x, S._o.y, S._o.z, 2.6 * it.s, w, 0.9 * lv);
      poolAt(S, S._o.x, 0.1, S._o.z, 9 * it.s, w, 0.6 * lv);
    },
    ggbSignpost(S, it, p, q) { const L = S.layers; L.ggbSignpost; if (!S.track) return; const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); L.ggbSignpost.add(m); glowAt(S, p.x, 13.6 * s, p.z, 3 * s, [1, 0.85, 0.6], 0.8); poolAt(S, p.x, 0.12, p.z, 16 * s, [1, 0.85, 0.6], 0.45); },
    // the music box: the lid opens on "song", the dancer springs up and turns; the words in the lid
    ggbMusicBox(S, it, p) {
      const L = S.layers; L.ggbBox; L.ggbLid; L.ggbLidFace; L.ggbKey; L.ggbPorcelain;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, yaw = facing(S, it);
      _e.set(0, yaw, 0); const q = qOf(_e);
      m.compose(p, q, S._s.set(s, s, s)); L.ggbBox.add(m);
      const open = easeBack(smooth(it.open, it.open + 0.7, T) * 1.0) * (1 - smooth(it.shut ?? 1e9, (it.shut ?? 1e9) + 0.25, T));
      // the lid: hinged at the back top edge
      local(p, yaw, 0, 4.5 * s, -4.1 * s, _hv);
      _e.set(-1.85 * open, yaw, 0); const lq = qOf(_e);
      m.compose(_hv, lq, S._s.set(s, s, s)); L.ggbLid.add(m); L.ggbLidFace.add(m, { aIdx: it.idx ?? 0, aWake: [0.3 + 0.7 * open, 0] });
      // the key, turning while it plays
      local(p, yaw, 6.1 * s, 2.6 * s, 0, _hv); _e.set(T * 2.2 * open, yaw + Math.PI / 2, 0); m.compose(_hv, qOf(_e), S._s.set(s, s, s)); L.ggbKey.add(m);
      // the dancer: up on her spring, turning
      const up = easeBack(smooth(it.open + 0.25, it.open + 0.9, T));
      local(p, yaw, 0, 4.55 * s, 0, _hv);
      _e.set(0, yaw + T * 1.6, 0); m.compose(_hv, qOf(_e), S._s.set(3.3 * s, 3.3 * s * (0.15 + 0.85 * up), 3.3 * s)); L.ggbPorcelain.add(m);
      glowAt(S, _hv.x, _hv.y + 2 * s, _hv.z, 9 * s, [1, 0.75, 0.85], 0.3 + 0.9 * open);
      poolAt(S, p.x, 0.15, p.z, 30 * s, [1, 0.7, 0.8], 0.25 + 0.5 * open);
    },
    // the sampler on its easel, the motto stitched in red
    ggbSampler(S, it, p) {
      const L = S.layers; L.ggbEasel; L.ggbStitch; L.ggbSamplerFace;
      if (!S.track) return;
      const m = S._m, s = it.s ?? 1, yaw = facing(S, it); _e.set(0, yaw, 0);
      m.compose(p, qOf(_e), S._s.set(s, s, s)); L.ggbEasel.add(m); L.ggbStitch.add(m); L.ggbSamplerFace.add(m, { aIdx: it.idx ?? 0, aWake: [1, 0] });
      local(p, yaw, 0, (SAMPLER_Y + 2) * s, 6 * s, _hv); glowAt(S, _hv.x, _hv.y, _hv.z, 12 * s, [1, 0.88, 0.7], 0.4);
      poolAt(S, p.x, 0.12, p.z, 22 * s, [1, 0.85, 0.7], 0.5);
    },
    // a cage on its column: a bird inside; the cloth comes down over it on its beat; at the peak the
    // cloth blows off, the door swings open and the bird goes
    ggbCage(S, it, p) {
      const L = S.layers; L.ggbCage; L.ggbCageDoor; L.ggbCloth; L.ggbColumn; L.ggbBird;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, yaw = facing(S, it); _e.set(0, yaw, 0); const q = qOf(_e);
      m.compose(p, q, S._s.set(s, s, s)); L.ggbColumn.add(m);
      const top = _hv2.copy(p); top.y += 9 * s;
      m.compose(top, q, S._s.set(s, s, s)); L.ggbCage.add(m);
      const free = it.free !== undefined ? smooth(it.free, it.free + 0.35, T) : 0;
      // the door
      local(top, yaw, 0.6 * s, 0, 2.0 * s, _hv); _e.set(0, yaw + 1.9 * free, 0); m.compose(_hv, qOf(_e), S._s.set(s, s, s)); L.ggbCageDoor.add(m);
      // the cloth: down from above onto it on its beat; then blown away up and off
      if (it.cover !== undefined && T > it.cover - 0.6 && (it.free === undefined || T < it.free + 1.6)) {
        const d = smooth(it.cover - 0.6, it.cover, T), land = Math.exp(-Math.max(0, T - it.cover) * 9) * (T > it.cover ? 1 : 0);
        const off = it.free !== undefined ? Math.max(0, T - it.free) : 0;
        local(top, yaw, 0, (1 - d) * 9 * s, 0, _hv);
        if (off > 0) { const ry0 = S.course.sample(it.t).yaw, sd0 = it.x > 0 ? 1 : -1, fall = Math.max(-top.y + 0.4, 3.5 * off * s - 11 * off * off); _hv.x += -Math.cos(ry0) * sd0 * off * 9 * s; _hv.z += Math.sin(ry0) * sd0 * off * 9 * s; _hv.y += fall; }
        _e.set(Math.min(off, 0.6) * 2.4, yaw + off * 1.2, Math.min(off, 0.6) * 1.6 * (it.x > 0 ? -1 : 1)); const sq = (1 - 0.12 * land) * (1 - 0.55 * smooth(0.25, 0.7, off));
        m.compose(_hv, qOf(_e), S._s.set(s * (1 + 0.06 * land), s * sq, s * (1 + 0.06 * land))); L.ggbCloth.add(m);
      }
      const covered = it.cover !== undefined ? smooth(it.cover - 0.05, it.cover + 0.05, T) * (1 - free) : 0;
      // the bird on its perch while it can be seen
      if (covered < 0.95 && free <= 0.01) { local(top, yaw, 0, 2.45 * s, 0, _hv); _e.set(0, yaw + Math.sin(T * 1.3 + (it.seed ?? 0) * 9) * 0.6, 0); m.compose(_hv, qOf(_e), S._s.set(1.7 * s, 1.7 * s, 1.7 * s)); L.ggbBird.add(m, { aPh: [it.seed ?? 0, 2, 0.08] }); }
      const lit = 1 - covered;
      glowAt(S, top.x, top.y + 2.5 * s, top.z, 6 * s, [1, 0.85, 0.6], 0.15 + 0.55 * lit);
      poolAt(S, p.x, 0.12, p.z, 14 * s, [1, 0.85, 0.6], 0.15 + 0.35 * lit);
      if (it.free !== undefined && T > it.free) { local(top, yaw, 0, 2.5 * s, 2.2 * s, _hv); const ry = S.course.sample(it.t).yaw; for (let b = 0; b < 3; b++) drawBird(S, _hv, ry, 6 * s, T - it.free - b * 0.18, (it.seed ?? 0) * 31 + b * 3.3, it.x > 0 ? 1 : -1, b, 0.55); }
    },
    // the cake under its glass dome
    ggbCloche(S, it, p) {
      const L = S.layers; L.ggbStand; L.ggbDome;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, yaw = facing(S, it); _e.set(0, yaw + T * 0.15, 0); const q = qOf(_e);
      m.compose(p, q, S._s.set(s, s, s)); L.ggbStand.add(m); L.ggbDome.add(m);
      glowAt(S, p.x, p.y + 7.5 * s, p.z, 12 * s, [1, 0.7, 0.85], 0.35 + 0.15 * (S.beat || 0));
      poolAt(S, p.x, 0.12, p.z, 20 * s, [1, 0.75, 0.88], 0.55);
    },
    // the microphone in its block of ice, a cold light on it
    ggbMic(S, it, p) {
      const L = S.layers; L.ggbMic; L.ggbMicIce;
      if (!S.track) return;
      const m = S._m, s = it.s ?? 1, yaw = facing(S, it); _e.set(0, yaw, 0); const q = qOf(_e);
      m.compose(p, q, S._s.set(s, s, s)); L.ggbMic.add(m); L.ggbMicIce.add(m);
      local(p, yaw, 0, 8.6 * s, 0.6 * s, _hv);
      glowAt(S, _hv.x, _hv.y + 5 * s, _hv.z, 7 * s, [0.8, 0.95, 1], 0.8); glowAt(S, _hv.x, _hv.y, _hv.z, 5 * s, [0.6, 0.9, 1], 0.6);
      poolAt(S, p.x, 1.45 * s, p.z, 11 * s, [0.8, 0.95, 1], 1.0);
    },
    // a rule: up out of the ice on its beat
    ggbRule(S, it, p) {
      const L = S.layers; L.ggbRule; L.ggbRuleFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, yaw = facing(S, it);
      const u = easeBack(smooth(it.up - 0.28, it.up + 0.12, T));
      if (u <= 0.001) return;
      _e.set(0, yaw, (1 - Math.min(1, u)) * 0.3 * (it.x > 0 ? 1 : -1)); const q = qOf(_e);
      _hv.copy(p); _hv.y = p.y - (1 - u) * 10 * s;
      m.compose(_hv, q, S._s.set(s, s, s)); L.ggbRule.add(m); L.ggbRuleFace.add(m, { aIdx: it.idx ?? 0, aWake: [0.75 + 0.25 * (S.beat || 0), 0] });
      local(_hv, yaw, 0, 7.4 * s, 4 * s, _o2); glowAt(S, _o2.x, _o2.y, _o2.z, 9 * s, [1, 0.9, 0.85], 0.25);
      poolAt(S, p.x, 0.12, p.z, 16 * s, [1, 0.4, 0.4], 0.35 * u);
    },
    // the table: they sit in their places, hands folded; the card at the head of it
    ggbTable(S, it, p, q, yaw) {
      const L = S.layers; L.ggbTable; L.ggbTent; L.ggbTentFace; L.ggbGSit; L.ggbDais;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1;
      // up on a dais of ice, so it can be seen from the road
      m.compose(p, q, S._s.set(s, s, s)); L.ggbDais.add(m, { aFx: [0.5 + 0.2 * (S.beat || 0), 0, 0.2], aTint: [0.8, 0.9, 1] });
      const pp = _hv2.copy(p); pp.y += DAIS * s;
      m.compose(pp, q, S._s.set(s, s, s)); L.ggbTable.add(m);
      // the card, at the near end, facing her
      local(pp, yaw, 0, 3.72 * s, -15.2 * s, _hv); _e.set(0, yaw + Math.PI, 0); m.compose(_hv, qOf(_e), S._s.set(s, s, s)); L.ggbTent.add(m); L.ggbTentFace.add(m, { aIdx: it.idx ?? 0, aWake: [1, 0] });
      // the girls, in their places
      const lit = it.lit ?? 0.8, tint = [0.92, 0.96, 1];
      for (let k = 0; k < 7; k++) for (const sd of [-1, 1]) {
        // on her chair, facing the table, her feet on the floor under it
        local(pp, yaw, sd * 3.75 * s, 0, (-13.8 + k * 4.6) * s, _hv);
        _e.set(0, yaw - sd * Math.PI / 2, 0);
        m.compose(_hv, qOf(_e), S._s.set(4.5 * s, 4.5 * s, 4.5 * s)); L.ggbGSit.add(m, { aFx: [lit * (0.8 + 0.3 * (S.beat || 0)), 0, k * 0.1 + sd], aTint: tint });
      }
      // candle light
      const out = smooth(it.out ?? 1e9, (it.out ?? 1e9) + 0.15, T) * (1 - smooth(it.back ?? 1e9, (it.back ?? 1e9) + 0.2, T));
      for (const z of [-10, 0, 10]) for (const dz of [-1.1, 0, 1.1]) { local(pp, yaw, 0, (dz ? 6.65 : 7.0) * s, (z + dz) * s, _hv); glowAt(S, _hv.x, _hv.y, _hv.z, 1.6 * s, [1, 0.8, 0.45], (1.3 + 0.2 * Math.sin(T * 9 + z + dz)) * (1 - out)); }
      for (const z of [-10, 0, 10]) { local(pp, yaw, 0, 3.8 * s, z * s, _hv); poolAt(S, _hv.x, pp.y + 3.78 * s, _hv.z, 9 * s, [1, 0.8, 0.5], 0.6 * (1 - out)); }
      poolAt(S, p.x, 0.12, p.z, 40 * s, [0.6, 0.85, 1], 0.4);
    },
    // the carousel: turning, the horses going up and down on the beat, the lights chasing
    ggbCarousel(S, it, p) {
      const L = S.layers; L.ggbCarousel; L.ggbHorse; L.ggbPole;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, c = S.course;
      const spin = T * (it.rate ?? 0.42), yaw = S.course.sample(it.t).yaw;
      _e.set(0, yaw + spin, 0); const q = qOf(_e);
      m.compose(p, q, S._s.set(s, s, s)); L.ggbCarousel.add(m);
      const bp = c.beatAt(T), bi = Math.floor(bp), bf = bp - bi;
      for (let k = 0; k < 16; k++) {
        // round they go: each horse faces the way it's going
        const a = (k / 16) * TAU + spin + yaw, r = (k % 2 ? 10.6 : 7.6) * s;
        _hv.set(p.x + Math.cos(a) * r, p.y, p.z - Math.sin(a) * r);
        _e.set(0, a + Math.PI, 0); const hq = qOf(_e);
        m.compose(_hv, hq, S._s.set(s, s, s)); L.ggbPole.add(m);
        // up on one beat, down on the next: every other horse the other way
        const ph = ((bi + k) % 2 === 0 ? bf : 1 - bf);
        const yy = 4.6 + 1.3 * Math.sin(ph * Math.PI - Math.PI / 2);
        _hv.y = p.y + yy * s;
        m.compose(_hv, hq, S._s.set(s, s, s)); L.ggbHorse.add(m);
      }
      const chase = Math.floor(T * 6);
      for (let k = 0; k < 32; k++) { const a = (k / 32) * TAU + spin; const on = (k + chase) % 4 === 0 ? 1 : 0.45; glowAt(S, p.x + Math.cos(a) * 15.8 * s, p.y + 14.2 * s, p.z - Math.sin(a) * 15.8 * s, 1.5 * s, (k % 2 ? [1, 0.85, 0.55] : [0.7, 0.92, 1]), on * 1.4); }
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU - spin * 0.5; glowAt(S, p.x + Math.cos(a) * 2.6 * s, p.y + (3 + (k % 4) * 3) * s, p.z - Math.sin(a) * 2.6 * s, 1.1 * s, [1, 0.9, 0.7], 0.9); }
      glowAt(S, p.x, p.y + 10 * s, p.z, 30 * s, [0.6, 0.85, 1], 0.18 + 0.15 * (S.beat || 0));
      poolAt(S, p.x, 0.12, p.z, 44 * s, [1, 0.85, 0.7], 0.55);
    },
    // the wedding cake, "the dream": at the peak it cracks, leans away and goes down through the ice
    ggbCake(S, it, p) {
      const L = S.layers; L.ggbCake; L.ggbRoses; L.ggbBride; L.ggbGroom; L.ggbCakeFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, yaw = facing(S, it);
      const br = it.breaks ?? 1e9, crack = smooth(br - 0.1, br + 0.5, T), lean = smooth(br + 0.3, br + 3.8, T), sink = smooth(br + 0.6, br + 5.0, T);
      if (sink >= 0.999) return;
      // lean away from the road, about its far edge, and down
      const side = it.x > 0 ? 1 : -1;
      _e.set(0, yaw, 0); const q0 = _q5.setFromEuler(_e);
      // away from the road: tipped about the axis up x outward
      const ry = S.course.sample(it.t).yaw, ox = -Math.cos(ry) * side, oz = Math.sin(ry) * side;
      _ax3.set(oz, 0, -ox).normalize();
      _q3.setFromAxisAngle(_ax3, lean * 0.55);
      _q4.copy(_q3).multiply(q0);
      _hv.set(p.x + ox * lean * 5 * s, p.y - sink * 26 * s, p.z + oz * lean * 5 * s);
      m.compose(_hv, _q4, S._s.set(s, s, s));
      L.ggbCake.add(m, { aFx: [0.22 + 0.12 * (S.beat || 0) + crack * 0.5, crack, 0.3], aTint: [1, 0.93, 0.95] });
      L.ggbRoses.add(m); L.ggbCakeFace.add(m, { aIdx: it.idx ?? 0, aWake: [0.9 - 0.6 * crack, 0] });
      // the couple on top
      _v3.set(-1.6, 21.25, 0).multiplyScalar(s).applyQuaternion(_q4).add(_hv); m.compose(_v3, _q4, S._s.set(3.4 * s, 3.4 * s, 3.4 * s)); L.ggbBride.add(m);
      _v3.set(1.6, 21.25, 0).multiplyScalar(s).applyQuaternion(_q4).add(_hv); m.compose(_v3, _q4, S._s.set(3.4 * s, 3.4 * s, 3.4 * s)); L.ggbGroom.add(m);
      glowAt(S, _hv.x, _hv.y + 14 * s, _hv.z, 22 * s, [1, 0.85, 0.92], 0.14 * (1 - sink) + 0.45 * crack * (1 - lean));
      poolAt(S, p.x, 0.12, p.z, 30 * s, [1, 0.8, 0.9], 0.3 * (1 - sink));
    },
    // the heart: beating on the beat; cracks on "heartbeat", bursts on "break"
    ggbHeart(S, it, p) {
      const L = S.layers; L.ggbHeart; L.ggbPlinth; L.ggbPlinthFace; L.ggbShard;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, yaw = facing(S, it), beat = S.beat || 0;
      _e.set(0, yaw, 0); const q = qOf(_e);
      m.compose(p, q, S._s.set(1, 1, 1)); L.ggbPlinth.add(m, { aFx: [0.6, 0, 0.5], aTint: [0.8, 0.75, 0.85] }); if (it.idx !== undefined) L.ggbPlinthFace.add(m, { aIdx: it.idx, aWake: [0.95, 0] });
      const crack = smooth(it.crack ?? 1e9, it.burst ?? 1e9, T), tau = T - (it.burst ?? 1e9);
      const red = [1, 0.32, 0.42];
      _hv.copy(p); _hv.y = p.y + 4.6;
      if (tau < 0.03) {
        const k = 1 + 0.06 * beat * (1 - crack);
        m.compose(_hv, q, S._s.set(s * k, s * k, s * k)); L.ggbHeart.add(m, { aFx: [0.6 + 1.4 * beat + crack, crack, 0.7], aTint: red });
        glowAt(S, _hv.x, _hv.y + 5.5 * s, _hv.z, 14 * s, [1, 0.3, 0.45], 0.35 + 0.9 * beat + crack);
      } else {
        const n = 40;
        for (let j = 0; j < n; j++) {
          const h1 = hash(j * 3.1), h2 = hash(j * 5.3 + 1), h3 = hash(j * 7.9 + 2);
          local(_hv, yaw, (h1 - 0.5) * 9 * s, (1 + h2 * 9) * s, (h3 - 0.5) * 3 * s, _v3);
          const ry = S.course.sample(it.t).yaw, sd = it.x > 0 ? 1 : -1, out = 3 + 9 * h1, along = (h3 - 0.5) * 16; const vx = -Math.cos(ry) * sd * out + Math.sin(ry) * along, vy = 6 + h2 * 15, vz = Math.sin(ry) * sd * out + Math.cos(ry) * along, tl = (vy + Math.sqrt(vy * vy + 44 * _v3.y)) / 22;
          const tt = Math.min(tau, tl);
          _v3.set(_v3.x + vx * tt, Math.max(0.3, _v3.y + vy * tt - 11 * tt * tt), _v3.z + vz * tt);
          _e.set(tt * (4 + 5 * h1), tt * 6 * h2, tt * 3); const sc = s * (0.35 + 0.5 * h3);
          m.compose(_v3, qOf(_e), S._s.set(sc, sc * 1.6, sc)); L.ggbShard.add(m, { aFx: [0.6 + 2.5 * Math.exp(-tau * 1.5), 0.3, h1], aTint: red });
        }
        glowAt(S, _hv.x, _hv.y + 5 * s, _hv.z, 18 * s * (1 + tau * 1.5), [1, 0.4, 0.55], 3.0 * Math.exp(-tau * 2.2));
      }
      poolAt(S, p.x, 0.12, p.z, 28 * s, [1, 0.35, 0.45], (0.45 + 0.5 * beat) * (tau < 0 ? 1 : Math.exp(-tau)));
    },
    // the ring: upright in the ice, then over and down through the black water
    ggbRing(S, it, p) {
      const L = S.layers; L.ggbRing; L.ggbDiamond;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, yaw = facing(S, it);
      const tip = smooth(it.goes ?? 1e9, (it.goes ?? 1e9) + 1.6, T), sink = smooth((it.goes ?? 1e9) + 0.4, (it.goes ?? 1e9) + 3.0, T);
      if (sink >= 0.999) return;
      _e.set(0, yaw, tip * 1.2 * (it.x > 0 ? 1 : -1)); const q = qOf(_e);
      _hv.copy(p); _hv.y = p.y + (3.2 - sink * 14) * s;
      m.compose(_hv, q, S._s.set(s, s, s)); L.ggbRing.add(m); L.ggbDiamond.add(m, { aFx: [1.6 + 0.6 * (S.beat || 0), 0, 0.9], aTint: [1, 1, 1] });
      _v3.set(0, 5.2 * s, 0).applyQuaternion(q).add(_hv);
      glowAt(S, _v3.x, _v3.y, _v3.z, 7 * s, [0.9, 0.97, 1], 1.1 * (1 - sink) + 0.4 * Math.sin(T * 13) ** 2);
      poolAt(S, p.x, 0.12, p.z, 20 * s, [1, 0.85, 0.6], 0.5 * (1 - sink));
    },
    // the glass coffin, open and empty
    ggbCoffin(S, it, p) {
      const L = S.layers; L.ggbBier; L.ggbCoffinGlass; L.ggbBierFace; L.ggbDais;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, yaw = facing(S, it);
      // up on a block of ice (it.h high), the way hers stood on its rock
      if (it.h > 0) { _e.set(0, yaw + Math.PI / 2, 0); _hv2.set(p.x, p.y - it.h, p.z); m.compose(_hv2, qOf(_e), S._s.set(1.0 * s / 2.8 * 1.15, it.h / DAIS, 0.72 * s / 2.8)); L.ggbDais.add(m, { aFx: [0.55, 0, 0.6], aTint: [0.82, 0.9, 1] }); }
      _e.set(0, yaw, 0); const q = qOf(_e);
      m.compose(p, q, S._s.set(s, s, s)); L.ggbBier.add(m); L.ggbCoffinGlass.add(m); L.ggbBierFace.add(m, { aIdx: it.idx ?? 0, aWake: [0.85, 0] });
      for (const x of [-5.3, 5.3]) for (const z of [-2.8, 2.8]) { local(p, yaw, x * s, 5.15 * s, z * s, _hv); glowAt(S, _hv.x, _hv.y, _hv.z, 1.5 * s, [1, 0.8, 0.45], 1.2 + 0.25 * Math.sin(T * 8 + x + z)); }
      local(p, yaw, 0, 3.5 * s, 0, _hv); glowAt(S, _hv.x, _hv.y, _hv.z, 10 * s, [0.9, 0.95, 1], 0.3);
      poolAt(S, p.x, 0.12, p.z, 24 * s, [1, 0.8, 0.6], 0.6);
    },
  },
  kits: {
    // lamps both sides of the road (z.x across, every z.every)
    ggbLamps(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.55) for (const sd of [-1, 1]) S.items.push({ t: t + (sd > 0 ? 0 : (z.every ?? 0.55) / 2), x: sd * (z.x ?? 19), rot: 0, seed: R(), parts: 'ggbLamp', ahead: 14 }); },
    // fishing huts out on the ice, scattered both sides
    ggbHuts(S, z, R) {
      const cols = [0xc83a3a, 0x2a6aa8, 0x3a8a5a, 0xd8a83a, 0xe8e2d6, 0x8a3a8a];
      for (let t = z.from; t < z.to; t += z.every ?? 0.7) {
        const sd = R() < 0.5 ? -1 : 1, x = sd * ((z.x ?? 36) + R() * (z.spread ?? 40));
        const c = new THREE.Color(cols[Math.floor(R() * cols.length)]);
        S.items.push({ t: t + R() * 0.3, x, rot: sd > 0 ? Math.PI / 2 + (R() - 0.5) * 0.8 : -Math.PI / 2 + (R() - 0.5) * 0.8, s: z.s ?? 1.6, seed: R(), tint: [c.r, c.g, c.b], lag: (Math.abs(x) - 30) * 0.004 + R() * 0.25, parts: 'ggbHut', ahead: 18 });
      }
    },
    // one thing on its line: z.part with z.at, z.x and its own fields (sign: the board's key)
    ggbPiece(S, z) {
      const it = { t: z.at, x: z.x, rot: z.rot ?? 0, s: z.s ?? 1, seed: z.seed ?? 0.5, parts: z.part, ahead: z.ahead ?? 20 };
      for (const k of ['open', 'shut', 'cover', 'free', 'up', 'out', 'back', 'rate', 'breaks', 'crack', 'burst', 'goes', 'turn', 'lit', 'h']) if (z[k] !== undefined) it[k] = z[k];
      if (z.sign) it.idx = S.atlas.index[z.sign];
      S.items.push(it);
    },
    // cages along both sides: each covered on its beat (z.at: [[t, side, cover, free]])
    ggbCages(S, z, R) { for (const [t, sd, cover, free] of z.at) S.items.push({ t, x: sd * (z.x ?? 23), rot: 0, s: z.s ?? 1, seed: R(), cover, free, turn: 0.4, parts: 'ggbCage', ahead: 18 }); },
  },
});

const _hv = new THREE.Vector3(), _hv2 = new THREE.Vector3(), _o2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _ax3 = new THREE.Vector3(), _q3 = new THREE.Quaternion(), _q4 = new THREE.Quaternion();
const _qq = new THREE.Quaternion(), _q5 = new THREE.Quaternion();
var _e =new THREE.Euler(0, 0, 0, 'YXZ');      // turned first, then tipped (never the shared S._e)
function qOf(e) { return _qq.setFromEuler(e); }
// turned toward her coming up the road, and a little toward the road
function facing(S, it) { return S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -1 : 1) * (it.turn ?? 0.6); }
// how lit a lamp is at T: plan.ggb.lamps: [[t0, t1, level], ...] (each a stretch at that level), a
// wave along the road for the ones ahead of her
function lampLevel(plan, it, T) {
  let k = 1;
  for (const [a, b, lo, wave] of plan.ggb?.lamps || []) {
    const d = wave ? Math.max(0, it.t - a) * wave : 0;
    k = Math.min(k, 1 - (1 - lo) * smooth(a + d, a + d + 0.15, T) * (1 - smooth(b, b + 0.3, T)));
  }
  return k;
}
