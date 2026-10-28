// Good Girls Don't Fight Back: the girls. Colossal ice statues of girls in their good dresses,
// hair ribboned, standing on plinths along the lake with the rules carved under them. They keep
// the rules the song sings, pose by pose, on the beat: hands folded, hands over their eyes when
// "they already know", over their mouths when they "stay quiet", a curtsy for "sweet", a dance
// in the la-la-la. At the peak they put their arms up, crack with light and burst, and out of
// every one a bird of light flies free. Also the ice material, the shards and the birds.
// Names here start with ggb.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local } from './scenery.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// geometry with position and normal only (the ice shades itself)
function bare(g) { g = ni(g); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; }
export const mergePN = (gs) => mergeGeometries(gs.map(bare), false);

// ---------- shapes ----------
// a tapered cylinder from a to b (r0 at a, r1 at b), its cross-section scaled sx by sz
export function limb(a, b, r0, r1, seg = 8, sx = 1, sz = 1) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1);
  g.scale(sx, 1, sz); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}
export function ell(rx, ry, rz, x, y, z, w = 10, h = 8) { const g = new THREE.SphereGeometry(1, w, h); g.scale(rx, ry, rz); g.translate(x, y, z); return g; }
export function lathe(pts, seg = 16, sz = 1) { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); g.scale(1, 1, sz); return g; }
function cone(r, h, seg, ax, x, y, z) { const g = new THREE.ConeGeometry(r, h, seg); g.translate(0, h / 2, 0); if (ax === 'x') g.rotateZ(-Math.PI / 2); if (ax === '-x') g.rotateZ(Math.PI / 2); g.scale(1, 1, 0.45); g.translate(x, y, z); return g; }

// ---------- the poses ----------
// For her left arm (+x; the right is mirrored unless given): elbow E and hand H. `face`: the hand
// is placed against the face and bows with the head. head: how far the head bows (back if < 0);
// lean: the upper body bent forward at the waist; dip: knees bent; hem: how wide the skirt goes.
export const POSES = {
  fold:   { E: [0.2, 1.12, 0.07], H: [0.035, 1.0, 0.17], head: 0.36 },
  eyes:   { E: [0.22, 1.42, 0.2], H: [0.045, 1.67, 0.115], face: true, head: 0.24 },
  mouth:  { E: [0.21, 1.32, 0.21], H: [0.03, 1.6, 0.118], face: true, head: 0.12 },
  hush:   { E: [0.2, 1.12, 0.07], H: [0.035, 1.0, 0.17], RE: [-0.18, 1.28, 0.2], RH: [-0.012, 1.585, 0.122], rface: true, finger: true, head: 0.08 },
  curtsy: { E: [0.28, 1.13, 0.05], H: [0.43, 0.93, 0.14], head: 0.44, dip: 0.09, hem: 0.58 },
  pray:   { E: [0.17, 1.17, 0.14], H: [0.014, 1.31, 0.205], head: 0.34 },
  weep:   { E: [0.2, 1.33, 0.25], H: [0.045, 1.6, 0.14], face: true, head: 0.5, lean: 0.24 },
  scream: { E: [0.25, 1.17, -0.06], H: [0.32, 0.96, -0.1], head: -0.46, hem: 0.5 },
  rise:   { E: [0.25, 1.63, 0.03], H: [0.16, 1.93, 0.07], head: -0.22 },
  ballet: { E: [0.21, 1.6, 0.07], H: [0.05, 1.84, 0.08], head: -0.05, dress: 'tutu' },
  bride:  { E: [0.19, 1.12, 0.1], H: [0.0, 1.06, 0.2], head: 0.12, veil: true, bouquet: true },
  sit:    { E: [0.2, 1.16, 0.13], H: [0.07, 1.1, 0.33], head: 0.2, sit: 0.45 },
  // holding up a scroll with the rule on it, chest high
  scroll: { E: [0.3, 1.19, 0.17], H: [0.47, 1.18, 0.31], head: 0.18, scroll: true },
};
// where the words go on her scroll (in her units)
export const SCROLL = { w: 0.9, h: 0.28, y: 1.18, z: 0.335 };
const NECK = 1.52;          // the head bows about here
const WAIST = 1.0;          // the body leans about here
function bowPt(p, a) {      // a point turned with the head about the neck
  const y = p.y - NECK, c = Math.cos(a), s = Math.sin(a);
  return V3(p.x, NECK + y * c - p.z * s, y * s + p.z * c);
}
function leanG(g, a) { if (!a) return g; g.translate(0, -WAIST, 0); g.rotateX(a); g.translate(0, WAIST, 0); return g; }
function leanP(p, a) { if (!a) return p; const y = p.y - WAIST, c = Math.cos(a), s = Math.sin(a); return V3(p.x, WAIST + y * c - p.z * s, y * s + p.z * c); }

// a girl in her good dress, about 1.75 tall, feet at 0, facing +z
export function girl(pose = 'fold') {
  const P = POSES[pose] || POSES.fold;
  const dip = P.dip || 0, lean = P.lean || 0;
  const low = [], up = [], head = [];
  // the skirt: long and full, a frill at the hem; or a ballerina's tutu over her legs
  if (P.sit) {
    // sitting up straight: her lap, her skirt down over her knees to the floor
    low.push(ell(0.2, 0.13, 0.33, 0, 0.56, 0.16, 12, 8));
    low.push(lathe([[0.001, 0.02], [0.3, 0.03], [0.27, 0.2], [0.21, 0.5], [0.16, 0.6]], 14, 0.9).translate(0, 0, 0.36));
  } else if (P.dress === 'tutu') {
    for (const s of [-1, 1]) { low.push(limb(V3(s * 0.07, 0.03, 0), V3(s * 0.08, 0.5, 0), 0.03, 0.05, 7)); low.push(limb(V3(s * 0.08, 0.5, 0), V3(s * 0.09, 0.98, 0), 0.05, 0.075, 7)); }
    low.push(lathe([[0.09, 0.82], [0.42, 0.9], [0.44, 0.94], [0.2, 1.0], [0.14, 1.03]], 18, 0.95));
  } else {
    const hem = P.hem ?? 0.46;
    low.push(lathe([[0.001, 0.02], [hem, 0.03], [hem * 0.93, 0.18], [hem * 0.79, 0.48], [0.25, 0.86 - dip], [0.155, 1.02 - dip]], 16, 0.86));
    const fr = new THREE.TorusGeometry(hem * 0.99, 0.035, 5, 24); fr.rotateX(Math.PI / 2); fr.scale(1, 1, 0.86); fr.translate(0, 0.07, 0); low.push(fr);
  }
  // the bodice, the collar, puffed sleeves, a sash with its bow at the back
  up.push(lathe([[0.152, 1.0], [0.17, 1.14], [0.186, 1.26], [0.176, 1.35], [0.152, 1.42], [0.06, 1.47]], 14, 0.8));
  up.push(limb(V3(0, 1.43, 0), V3(0, 1.57, 0), 0.05, 0.045, 7));
  const collar = new THREE.TorusGeometry(0.068, 0.02, 5, 14); collar.rotateX(Math.PI / 2); collar.translate(0, 1.47, 0.006); up.push(collar);
  const sash = new THREE.TorusGeometry(0.155, 0.022, 5, 18); sash.rotateX(Math.PI / 2); sash.scale(1, 1, 0.82); sash.translate(0, 1.03, 0); up.push(sash);
  up.push(cone(0.045, 0.12, 6, 'x', 0.0, 1.04, -0.14), cone(0.045, 0.12, 6, '-x', 0.0, 1.04, -0.14), ell(0.028, 0.03, 0.02, 0, 1.04, -0.14, 6, 5));
  for (const s of [-1, 1]) up.push(ell(0.068, 0.062, 0.064, s * 0.168, 1.392, 0, 8, 6));
  // the head: face, hair to her shoulders, a ribbon tied in a bow at the back
  head.push(ell(0.1, 0.122, 0.107, 0, 1.656, 0.006, 14, 12));
  head.push(ell(0.108, 0.116, 0.104, 0, 1.673, -0.017, 14, 10));
  head.push(limb(V3(0, 1.67, -0.055), V3(0, 1.3, -0.1), 0.098, 0.066, 9, 1.22, 0.55));
  head.push(cone(0.05, 0.1, 6, 'x', 0.01, 1.745, -0.085), cone(0.05, 0.1, 6, '-x', -0.01, 1.745, -0.085), ell(0.026, 0.028, 0.02, 0, 1.745, -0.09, 6, 5));
  if (P.veil) { const v = new THREE.ConeGeometry(0.2, 0.75, 12, 1, true); v.translate(0, -0.3, 0); v.scale(1, 1, 0.55); v.translate(0, 1.72, -0.08); head.push(v); head.push(ell(0.05, 0.03, 0.05, 0, 1.79, 0, 8, 5)); }
  const hg = mergePN(head);
  if (P.head) { hg.translate(0, -NECK, 0); hg.rotateX(P.head); hg.translate(0, NECK, 0); }
  up.push(hg);
  // the arms: shoulder to elbow to hand
  for (const side of [1, -1]) {
    const r = side < 0;
    const e = r && P.RE ? P.RE : [side * P.E[0], P.E[1], P.E[2]];
    const h = r && P.RH ? P.RH : [side * P.H[0], P.H[1], P.H[2]];
    const S = V3(side * 0.168, 1.4, 0);
    let E = V3(...e), H = V3(...h);
    const onFace = r ? (P.RH ? P.rface : P.face) : P.face;
    if (onFace && P.head) { H = bowPt(H, P.head); E = bowPt(E, P.head * 0.4); }
    up.push(limb(S, E, 0.046, 0.04, 8), ell(0.04, 0.04, 0.04, E.x, E.y, E.z, 7, 5), limb(E, H, 0.038, 0.03, 8));
    up.push(ell(0.036, 0.05, 0.026, H.x, H.y, H.z, 7, 5));
    if (r && P.finger) { const F = bowPt(V3(-0.012, 1.65, 0.128), P.head || 0); up.push(limb(H, F, 0.011, 0.009, 5)); }
  }
  if (P.bouquet) { up.push(ell(0.08, 0.07, 0.08, 0, 1.08, 0.25, 9, 7)); up.push(limb(V3(0, 1.04, 0.22), V3(0, 0.82, 0.19), 0.02, 0.012, 5)); }
  if (P.scroll) {
    // the paper, and the rolled ends she holds it by
    const pg = new THREE.BoxGeometry(SCROLL.w + 0.04, SCROLL.h + 0.05, 0.012); pg.translate(0, SCROLL.y, SCROLL.z - 0.012); up.push(pg);
    for (const s of [-1, 1]) up.push(limb(V3(s * 0.485, SCROLL.y - 0.2, SCROLL.z - 0.01), V3(s * 0.485, SCROLL.y + 0.2, SCROLL.z - 0.01), 0.026, 0.026, 7));
  }
  const ug = mergePN(up);
  leanG(ug, lean);
  if (dip) ug.translate(0, -dip, 0);
  if (P.sit) ug.translate(0, -P.sit, 0);
  const g = mergePN([...low, ug]);
  g.computeBoundingBox();
  return g;
}

// a boy in his suit (the groom on the cake)
export function groom() {
  const parts = [];
  for (const s of [-1, 1]) parts.push(limb(V3(s * 0.08, 0.02, 0), V3(s * 0.085, 0.95, 0), 0.055, 0.075, 7));
  parts.push(lathe([[0.16, 0.86], [0.2, 1.0], [0.205, 1.3], [0.17, 1.44], [0.06, 1.48]], 12, 0.75));
  parts.push(limb(V3(0, 1.44, 0), V3(0, 1.57, 0), 0.05, 0.046, 7));
  parts.push(ell(0.098, 0.118, 0.104, 0, 1.66, 0.006, 12, 10), ell(0.104, 0.07, 0.1, 0, 1.73, -0.01, 12, 8));
  for (const s of [-1, 1]) { const S = V3(s * 0.19, 1.4, 0), E = V3(s * 0.22, 1.13, 0.06), H = V3(s * 0.12, 1.05, 0.17); parts.push(limb(S, E, 0.055, 0.048, 7), limb(E, H, 0.045, 0.036, 7), ell(0.036, 0.046, 0.026, H.x, H.y, H.z, 6, 5)); }
  return mergePN(parts);
}

// ---------- the ice ----------
// Clear ice, cut in facets: dark and deep inside, a bright rim where it turns from you, the light
// from the lake coming up through it from below, breathing on the beat. aFx: x how lit, y how far
// cracked (lines of light running through it before it bursts), z a seed. aTint colours it.
export function iceMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0012 },
      uSky: { value: new THREE.Color(0x4a6a9a) }, uMoon: { value: new THREE.Color(0xc8e0ff) }, uMoonDir: { value: new THREE.Vector3(-0.3, 0.6, 0.75).normalize() },
      uIce: { value: new THREE.Color(0x8ae8ff) }, uDeep: { value: new THREE.Color(0x0a2a4a) }, uRim: { value: new THREE.Color(0xd8f8ff) }, uBeat: { value: 0 }, uTime: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute vec3 aFx; attribute vec3 aTint; varying vec3 vW; varying vec3 vL; varying vec3 vFx; varying vec3 vTint;
      void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; vL = position; vFx = aFx; vTint = aTint; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCam, uFog, uSky, uMoon, uMoonDir, uIce, uDeep, uRim; uniform float uFogDensity, uBeat, uTime;
      varying vec3 vW; varying vec3 vL; varying vec3 vFx; varying vec3 vTint;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){
        vec3 cr = cross(dFdx(vW), dFdy(vW));
        vec3 N = dot(cr, cr) > 1e-14 ? normalize(cr) : vec3(0.0, 1.0, 0.0);
        vec3 V = normalize(uCam - vW);
        if (dot(N, V) < 0.0) N = -N;
        float nv = max(dot(N, V), 0.0);
        float fres = pow(max(1.0 - nv, 0.0), 3.0);
        float ndl = max(dot(N, normalize(uMoonDir)), 0.0);
        float hgt = clamp(vL.y / 1.9, 0.0, 1.0);
        float lit = vFx.x;
        vec3 body = mix(uDeep, uIce * 0.55, 0.2 + 0.35 * hgt) * vTint;
        vec3 col = body * (0.35 + 0.45 * ndl) + uSky * 0.06 + uMoon * pow(max(dot(reflect(-V, N), normalize(uMoonDir)), 0.0), 12.0) * 0.35;
        col += mix(uRim, uIce, 0.35) * vTint * fres * (0.35 + 0.9 * lit);
        // light from below, up through the ice
        col += uIce * vTint * lit * (0.12 + 0.5 * pow(1.0 - hgt, 2.0)) * (0.85 + 0.35 * uBeat);
        // facets catching it, a little each
        col += uIce * vTint * lit * 0.08 * h3(floor(N * 9.0));
        // cracks: lines of light through it
        if (vFx.y > 0.001) {
          vec3 q = vL * 7.0 + vFx.z * 13.0;
          float r = 1.0 - abs(2.0 * n3(q) - 1.0);
          float r2 = 1.0 - abs(2.0 * n3(q * 2.3 + 5.0) - 1.0);
          float line = pow(max(r, 0.0), 14.0) + 0.6 * pow(max(r2, 0.0), 16.0);
          col += mix(uIce, vec3(1.0), 0.4) * line * vFx.y * 3.5;
          col += uIce * vFx.y * 0.15;
        }
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        col = mix(col, uFog, clamp(fog, 0.0, 1.0));
        // never let a bad value through (one NaN in the HDR target blooms over the whole frame)
        col = vec3(col.r == col.r ? col.r : 0.0, col.g == col.g ? col.g : 0.0, col.b == col.b ? col.b : 0.0);
        gl_FragColor = vec4(clamp(col, 0.0, 16.0), 1.0);
      }`,
  });
}

// the birds: white, lit from within, wings beating (aPh: phase, speed, size of the beat)
export function birdMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0012 }, uCol: { value: new THREE.Color(0xf0fcff) }, uGlow: { value: new THREE.Color(0x8ae8ff) } },
    vertexShader: /* glsl */`
      attribute vec3 aPh; uniform float uTime; varying float vK; varying vec3 vW; varying float vTip;
      void main(){
        vec3 p = position;
        float ax = abs(p.x);
        float flap = sin(uTime * aPh.y + aPh.x);
        float w = smoothstep(0.05, 0.6, ax);
        p.y += flap * w * ax * 1.1 * aPh.z;
        p.x *= 1.0 - 0.18 * w * (0.5 + 0.5 * flap) * aPh.z;
        vTip = w; vK = 1.0;
        vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0); vW = wp.xyz;
        gl_Position = projectionMatrix * (viewMatrix * wp);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCam, uFog, uCol, uGlow; uniform float uFogDensity; varying float vK; varying vec3 vW; varying float vTip;
      void main(){
        vec3 col = mix(uCol * 1.6, uGlow * 1.8, vTip * 0.5);
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity * 0.8, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// a dove: a body, its head, a fanned tail and two long wings (spans 1 across, nose at +z)
export function dove() {
  const parts = [];
  parts.push(ell(0.07, 0.065, 0.2, 0, 0, 0, 8, 6), ell(0.05, 0.05, 0.055, 0, 0.04, 0.2, 7, 5));
  const tail = new THREE.BufferGeometry(); tail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.12, -0.1, 0.0, -0.38, 0.1, 0.0, -0.38], 3)); tail.computeVertexNormals(); parts.push(tail);
  for (const s of [-1, 1]) {
    const w = new THREE.BufferGeometry();
    w.setAttribute('position', new THREE.Float32BufferAttribute([s * 0.05, 0.02, 0.1, s * 0.05, 0.02, -0.1, s * 0.62, 0.05, -0.12, s * 0.05, 0.02, 0.1, s * 0.62, 0.05, -0.12, s * 0.5, 0.05, 0.06], 3));
    w.computeVertexNormals(); parts.push(w);
  }
  return mergePN(parts);
}

// a shard of ice: a long thin splinter
function shardGeo() { const g = new THREE.OctahedronGeometry(1, 0); g.scale(0.32, 1, 0.22); return bare(g); }

// the plinth: a block with a cornice and a base (7 wide, 4.4 high, or 10.9 tall), facing +z; a
// tall one has the words cut in its face, high enough to read from the road
export const PLINTH = { low: 4.4, tall: 10.9 };
function plinth(tall) {
  const parts = [], H = tall ? 9.1 : 2.6, W = tall ? 1.42 : 1;
  const b = (w, h, d, y) => { const g = new THREE.BoxGeometry(w * W, h, d); g.translate(0, y, 0); return g; };
  parts.push(b(8.2, 0.7, 7.2, 0.35), b(7.4, 0.35, 6.6, 0.85), b(6.8, H, 6.0, 1.0 + H / 2), b(7.4, 0.35, 6.6, 1.0 + H + 0.15), b(8.0, 0.55, 7.0, 1.0 + H + 0.55));
  return mergePN(parts);
}

// ---------- where and how they stand ----------
const POSE_NAMES = Object.keys(POSES);
const LAYER = Object.fromEntries(POSE_NAMES.map((n) => [n, 'ggbG' + n[0].toUpperCase() + n.slice(1)]));
// points inside each pose (for where the shards come from)
const SAMPLES = {};
function samplesOf(pose) {
  if (SAMPLES[pose]) return SAMPLES[pose];
  const g = girl(pose), p = g.attributes.position, out = [];
  for (let k = 0; k < 64; k++) { const i = Math.floor(hash(k * 7.13 + 1.7) * p.count); out.push([p.getX(i) * 0.8, p.getY(i), p.getZ(i) * 0.8]); }
  return (SAMPLES[pose] = out);
}

// the pose everyone is in at song time T (plan.ggb.poses: [[t, pose], ...] in order)
export function poseAt(plan, T) {
  const L = plan.ggb && plan.ggb.poses; if (!L) return 'fold';
  let p = L[0][1]; for (const [t, n] of L) { if (T >= t) p = n; else break; } return p;
}
// how lit they are: dark until the band comes in, then up in a wave away from her
function litAt(plan, it, T) {
  const g = plan.ggb || {}, w = g.wake ?? 0;
  if (it.spot && T < w) return smooth(it.spot, it.spot + 0.5, T) * 0.9;   // the first one, alone in the dark
  const u = smooth(w + Math.max(0, it.t - w) * 0.035, w + Math.max(0, it.t - w) * 0.035 + 0.35, T);
  let k = 0.12 + 0.88 * u;
  for (const [a, b, lo] of g.dim || []) k *= 1 - (1 - lo) * smooth(a, a + 0.25, T) * (1 - smooth(b, b + 0.4, T));
  return k;
}

const TINTS = [[0.85, 0.95, 1], [0.92, 0.9, 1], [0.8, 0.95, 0.95], [0.95, 0.95, 1]];
const _qI = new THREE.Quaternion();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _ax = new THREE.Vector3();
// turned toward her as she comes, and a little to the road
function standYaw(S, it) { return S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -1 : 1) * (it.turn ?? 0.75); }

const FX = { aFx: 3, aTint: 3 };
extend({
  layers: {
    ...Object.fromEntries(POSE_NAMES.map((n) => [LAYER[n], (M) => [girl(n), M.ggbIce || (M.ggbIce = iceMaterial()), n === 'ballet' || n === 'bride' ? 6 : 44, FX]])),
    ggbPlinth: (M) => [plinth(false), M.ggbIce || (M.ggbIce = iceMaterial()), 60, FX],
    ggbPlinthTall: (M) => [plinth(true), M.ggbIce || (M.ggbIce = iceMaterial()), 8, FX],
    ggbPlinthFace: (M) => [(() => { const g = new THREE.PlaneGeometry(6.4, 2.0); g.translate(0, 2.3, 3.02); return g; })(), M.sign, 30, { aIdx: 1, aWake: 2 }],
    ggbPlinthTallFace: (M) => [(() => { const g = new THREE.PlaneGeometry(6.4 * 1.42, 2.0 * 1.42); g.translate(0, 7.6, 3.02); return g; })(), M.sign, 8, { aIdx: 1, aWake: 2 }],
    ggbScrollFace: (M) => [(() => { const g = new THREE.PlaneGeometry(SCROLL.w, SCROLL.h); g.translate(0, SCROLL.y, SCROLL.z); return g; })(), M.sign, 12, { aIdx: 1, aWake: 2 }],
    ggbShard: (M) => [shardGeo(), M.ggbIce || (M.ggbIce = iceMaterial()), 900, FX],
    ggbBird: (M) => [dove(), M.ggbBirdM || (M.ggbBirdM = birdMaterial()), 400, { aPh: 3 }],
  },
  parts: {
    // a colossus on her plinth. it: s (scale of the girl), pose (fixed, else the song's), spot (lit
    // alone from then, before the rest), shatter (song time she bursts), birds, idx (the rule on
    // the plinth), crack (from when lines of light run through her), tears, scream
    ggbColossus(S, it, p) {
      const L = S.layers; L.ggbPlinth; L.ggbPlinthTall; L.ggbPlinthFace; L.ggbPlinthTallFace; L.ggbScrollFace; L.ggbShard; L.ggbBird; if (it.spot) L.ggColumn; for (const n of POSE_NAMES) L[LAYER[n]];
      if (!S.track) return;
      const T = S.tNow ?? 0, plan = S.plan, beat = S.beat || 0, s = it.s ?? 10;
      const yaw = standYaw(S, it);
      _e.set(0, yaw, 0); _q.setFromEuler(_e);
      const lit = litAt(plan, it, T);
      const tint = TINTS[Math.floor((it.seed ?? 0) * 4) % 4];
      const pose = it.pose || poseAt(plan, T);
      // the plinth, and on a tall one the rule cut in it
      _m.compose(p, _q, _s.set(1, 1, 1)); L[it.tall ? 'ggbPlinthTall' : 'ggbPlinth'].add(_m, { aFx: [lit * 0.55, 0, it.seed ?? 0], aTint: [0.7, 0.8, 0.9] });
      if (it.idx !== undefined && pose !== 'scroll') L[it.tall ? 'ggbPlinthTallFace' : 'ggbPlinthFace'].add(_m, { aIdx: it.idx, aWake: [0.25 + 0.75 * lit, 0] });
      const top = _w.copy(p); top.y = p.y + (it.tall ? PLINTH.tall : PLINTH.low);
      const sh = it.shatter, tau = sh !== undefined ? T - sh : -1;
      // before she goes: cracks of light running through her, faster as it comes
      let crack = it.crack !== undefined ? smooth(it.crack, sh ?? it.crack + 2, T) : 0;
      if (tau < 0.04) {
        _m.compose(top, _q, _s.set(s, s, s));
        const lk = lit * (1 + 0.6 * crack) + (it.scream !== undefined ? 1.5 * Math.exp(-Math.max(0, T - it.scream) * 1.2) * (T > it.scream ? 1 : 0) : 0);
        L[LAYER[pose]].add(_m, { aFx: [lk * (0.9 + 0.25 * beat), crack, it.seed ?? 0], aTint: tint });
        // the rule on her scroll
        if (it.idx !== undefined && pose === 'scroll') L.ggbScrollFace.add(_m, { aIdx: it.idx, aWake: [0.3 + 0.7 * lit, 0] });
      }
      // her light: a pool round her feet and a glow at her heart, on the beat
      poolAt(S, p.x, 0.25, p.z, 20, [0.45, 0.85, 1], (0.16 + 0.32 * lit) * (0.8 + 0.4 * beat) * (tau < 0 ? 1 : Math.exp(-tau * 0.8)));
      if (tau < 0) glowAt(S, top.x, top.y + s * 1.25, top.z, s * 0.9, [0.55, 0.9, 1], lit * (0.12 + 0.18 * beat + 0.5 * crack));
      // the first one, in the dark: one cold light from above on her, a shaft of it standing up into the sky
      if (it.spot && T > it.spot - 0.2 && T < (plan.ggb?.wake ?? 0) + 1.5) {
        const k = smooth(it.spot, it.spot + 0.4, T), w = plan.ggb?.wake ?? 0, beam = k * (1 - smooth(w + 0.3, w + 1.4, T));
        glowAt(S, top.x, top.y + s * 2.1, top.z, 9, [0.8, 0.95, 1], 0.9 * k); poolAt(S, p.x, top.y + 0.2, p.z, 16, [0.8, 0.95, 1], 0.8 * k);
        if (L.ggColumn && beam > 0.01) { _m.compose(_v.set(top.x, top.y, top.z), _qI, _s.set(0.75, 80, 0.75)); L.ggColumn.add(_m, { aK: 0.6 * beam }); }
      }
      // tears: two lines of light down her face and on down the ice
      if (it.tears !== undefined && T > it.tears - 0.2) {
        const k = smooth(it.tears, it.tears + 0.5, T);
        for (const sd of [-1, 1]) for (let j = 0; j < 7; j++) {
          const f = ((T * 0.9 + j / 7) % 1);
          local(top, yaw, sd * 0.05 * s, s * (1.63 - f * 0.9), s * 0.2 + f * s * 0.08, _v);
          glowAt(S, _v.x, _v.y, _v.z, s * 0.09, [0.6, 0.95, 1], k * (1.2 - f) * 1.4);
        }
      }
      // the scream: light out of her, a ring out across the ice (the lake draws the cracks)
      if (it.scream !== undefined && T > it.scream && T < it.scream + 3) {
        const u = T - it.scream;
        glowAt(S, top.x, top.y + s * 1.7, top.z, s * (1.2 + u * 3), [0.75, 0.95, 1], 2.2 * Math.exp(-u * 2.2));
      }
      if (tau >= 0) {
        // she bursts: her ice flies, a bird comes out of her and goes
        const smp = samplesOf(pose), n = Math.min(smp.length, it.shards ?? 32);
        const ry = S.course.sample(it.t).yaw, rrx = -Math.cos(ry), rrz = Math.sin(ry), sd = it.x > 0 ? 1 : -1;
        for (let k = 0; k < n; k++) {
          const o = smp[k], h1 = hash(k * 3.1 + (it.seed ?? 0) * 17), h2 = hash(k * 5.7 + 2), h3 = hash(k * 1.3 + 9);
          // out from her middle and up; what flies toward the road only goes a little way
          local(top, yaw, o[0] * s, o[1] * s, o[2] * s, _v);
          const ox = _v.x - top.x, oz = _v.z - top.z, ol = Math.hypot(ox, oz) || 1;
          const sp = 4 + 10 * h1, vy = 6 + 13 * h2;
          let vx = (ox / ol) * sp + (h3 - 0.5) * 5, vz = (oz / ol) * sp + (h1 - 0.5) * 5;
          // what heads for the road is turned back out (nothing comes at her)
          const inward = -(vx * rrx + vz * rrz) * sd;
          if (inward > 0) { vx += rrx * sd * inward * 1.4; vz += rrz * sd * inward * 1.4; }
          const tl = (vy + Math.sqrt(vy * vy + 2 * 22 * Math.max(0.1, _v.y))) / 22;
          let x, y, z, spin;
          if (tau < tl) { x = _v.x + vx * tau; z = _v.z + vz * tau; y = _v.y + vy * tau - 11 * tau * tau; spin = tau; }
          else { const sl = (1 - Math.exp(-2.5 * (tau - tl))) / 2.5; x = _v.x + vx * (tl + sl * 0.5); z = _v.z + vz * (tl + sl * 0.5); y = 0.3; spin = tl; }
          _e.set(spin * (3 + 6 * h1), spin * 5 * h2, spin * 4 * h3 + h1 * 3); _q2.setFromEuler(_e);
          const sc = s * (0.035 + 0.065 * h3);
          _m.compose(_v.set(x, y, z), _q2, _s.set(sc, sc * (1.2 + h2), sc));
          L.ggbShard.add(_m, { aFx: [0.5 + 1.5 * Math.exp(-tau * 1.8), 0.4 * Math.exp(-tau), h1], aTint: tint });
        }
        // the light she had in her, gone up
        glowAt(S, top.x, top.y + s * 1.2, top.z, s * 1.4 * (1 + tau), [0.7, 0.95, 1], 1.3 * Math.exp(-tau * 2.8));
        // her bird: out of her heart, up and over the road, on ahead into the sky
        _w.copy(top); _w.y += s * 1.3;
        for (let b = 0; b < (it.birds ?? 2); b++) drawBird(S, _w, ry, s, tau, (it.seed ?? 0) * 13 + b * 7.7, sd, b);
      }
    },
  },
  kits: {
    // colossi either side, on the bar: z.at: [[t, side], ...] or z.from..z.to every z.every
    ggbColossi(S, z, R) {
      const list = z.at || [];
      if (!z.at) for (let t = z.from; t < z.to; t += z.every ?? 1.655) for (const sd of z.sides || [-1, 1]) list.push([t + (sd > 0 ? 0 : (z.stagger ?? 0)), sd]);
      for (const [t, side, extra] of list) {
        const it = { t, x: side * (z.x ?? 31) + side * R() * (z.spread ?? 0), rot: 0, s: (z.s ?? 10) * (0.94 + R() * 0.12), seed: R(), parts: 'ggbColossus', ahead: z.ahead ?? 18, turn: z.turn };
        if (z.pose) it.pose = z.pose;
        if (z.shatterFrom !== undefined && t >= z.shatterFrom) {
          // she goes on the beat before she's level with her, while she can see it
          const c = S.course, bi = c.nearestBeatIndex(t - (z.lead ?? 1.5));
          it.shatter = c.beats[bi]; it.crack = it.shatter - (z.crackFor ?? 1.6); it.birds = z.birds ?? 2;
        }
        Object.assign(it, extra || {});
        if (it.sign) { it.idx = S.atlas.index[it.sign]; delete it.sign; }
        S.items.push(it);
      }
    },
  },
});

// a bird, τ seconds out of the statue at `from` (ry: the road's heading there; side: which side
// she stood on; k: which of her birds). One goes up and over the road, the next up and away;
// both on ahead of the rider, climbing into the sky.
const _bp = new THREE.Vector3();
export function drawBird(S, from, ry, s, tau, seed, side, k, size = 0.42) {
  if (tau < 0 || tau > 9) return;
  const h1 = hash(seed + 1.3), h2 = hash(seed * 2.1 + 4), h3 = hash(seed * 3.7 + 8);
  const fx = Math.sin(ry), fz = Math.cos(ry), rx = -Math.cos(ry), rz = Math.sin(ry);
  const cross = k % 2 === 0;
  const dir = cross ? -side : side, reach = cross ? 40 + 26 * h2 : 12 + 14 * h2;
  const ease = 1 - Math.exp(-tau * 1.2), fwd = (8 + 10 * h1) * tau, up = (7 + 7 * h3) * tau - 0.25 * tau * tau;
  const wob = Math.sin(tau * 2.2 + seed) * 1.5;
  _bp.set(from.x + fx * fwd + rx * (dir * reach * ease + wob), from.y + up, from.z + fz * fwd + rz * (dir * reach * ease + wob));
  // facing the way it flies
  const vx = fx * (8 + 10 * h1) + rx * dir * reach * 1.2 * Math.exp(-tau * 1.2), vz = fz * (8 + 10 * h1) + rz * dir * reach * 1.2 * Math.exp(-tau * 1.2);
  _e.set(-0.35 + 0.15 * Math.exp(-tau), Math.atan2(vx, vz), Math.sin(tau * 1.7 + seed) * 0.3); _q2.setFromEuler(_e);
  const sc = s * size * (0.8 + 0.4 * h1) * smooth(0, 0.3, tau);
  _m.compose(_bp, _q2, _s.set(sc, sc, sc));
  S.layers.ggbBird.add(_m, { aPh: [seed * 5, 11 + 4 * h2, 1] });
  glowAt(S, _bp.x, _bp.y, _bp.z, sc * 2.0, [0.75, 0.95, 1], 1.2 * smooth(0, 0.4, tau));
}
