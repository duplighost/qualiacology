// Good Girls Don't Fight Back. A frozen lake at night, made into a garden of the rules girls are
// raised on. The pond with its lamps, its fishing huts and a signpost pointing every way ("are you
// confused?"); a music box opens on "this song is for you"; the sampler says FEEL PLEASANTLY
// SUBDUED; on the threat the lamps go out and the ice cracks under her, and in the silence one
// statue stands lit: GOOD GIRLS DON'T FIGHT BACK. The band comes in, the road breaks over a rift in
// the ice, and she rides an avenue of colossal ice girls who keep every rule as it's sung (hands
// over their eyes, over their mouths, a curtsy), past cages being covered, a cake under glass, a
// microphone frozen in a block of ice. The chorus: the pond's rules spring up out of the ice and
// snowflakes burst on the beat; the long table where they sit in their places; the carousel for the
// la-la-la; one weeps, one screams; the wedding cake, the dream. At the peak the whole lake breaks
// into floes with the light coming up between them, the cake goes under, and the girls put their
// arms up, crack, and burst, a bird of light out of every one; the cages fly open; a heart of ice
// breaks; a ring goes down; the glass coffin stands open and empty. At the end, in open water at
// dawn, the great cage with its door open and the birds going up out of it. (ggb- files: the girls
// and the things on the ice. Names from this song start with gg.)

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { paint, rgb, seeded, box } from './summer.js';
import { drawBird, iceMaterial } from './ggb-figures.js';
import { cageGeo, cageDoor, clothGeo, litVC } from './ggb-sets.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const ICE = [0.55, 0.92, 1.0], DEEP = [0.2, 0.6, 1.0];
const MAXC = 16, RIFT = 7;


// ---------- the lake: frost on black ice, cracks of light, the rift, and at the peak the floes ----------
function lakeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSong: { value: 0 }, uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0012 },
      uSky: { value: new THREE.Color() }, uGlow: { value: new THREE.Color(0x5ad8ff) }, uBreak: { value: 0 }, uLight: { value: 0.5 }, uOpen: { value: 0 },
      uCracks: { value: Array.from({ length: MAXC }, () => new THREE.Vector4(0, 0, -1e5, 0)) },
      uRift: { value: Array.from({ length: RIFT }, () => new THREE.Vector2(1e5, 1e5)) }, uRiftK: { value: 0 }, uRiftW: { value: 9 },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uSong, uFogDensity, uBreak, uLight, uOpen, uRiftK, uRiftW; uniform vec3 uCam, uFog, uSky, uGlow; uniform vec4 uCracks[${MAXC}]; uniform vec2 uRift[${RIFT}];
      varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec2 h22(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      // distance to the nearest edge between cells (the floes), and which cell
      vec3 voro(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 mb; vec2 mr; float md = 8.0; vec2 mc;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 b = vec2(float(x), float(y)); vec2 r = b + h22(i + b) - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mb = b; mc = i + b; } }
        md = 8.0; for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) { vec2 b = mb + vec2(float(x), float(y)); vec2 r = b + h22(i + b) - f; if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr))); }
        return vec3(md, h2(mc), h2(mc + 7.0)); }
      void main(){
        vec2 p = vW.xz;
        float d = length(uCam - vW);
        // black ice with frost on it, drifts of snow
        float frost = n2(p * 0.08) * 0.5 + n2(p * 0.31) * 0.3 + n2(p * 1.7) * 0.2;
        vec3 col = mix(vec3(0.015, 0.03, 0.05), vec3(0.08, 0.14, 0.2), frost);
        col = mix(col, vec3(0.42, 0.5, 0.58), smoothstep(0.62, 0.8, n2(p * 0.02 + 3.0)) * 0.6);
        vec3 V = normalize(uCam - vW);
        float fres = pow(max(1.0 - max(V.y, 0.0), 0.0), 5.0);
        col += uSky * fres * 0.7;
        vec3 glow = vec3(0.0);
        // the cracks: from where each hit landed, out in lines, the front of them bright
        for (int k = 0; k < ${MAXC}; k++) {
          vec4 c = uCracks[k];
          float age = uSong - c.z; if (age < 0.0 || age > 8.0) continue;
          vec2 q = p - c.xy; float r = length(q);
          float R = min(age * 55.0, 120.0) * c.w;
          if (r > R + 4.0) continue;
          float a = atan(q.y, q.x);
          float rays = 9.0 + floor(h2(c.xy) * 6.0);
          float ang = abs(fract(a / 6.2832 * rays + n2(vec2(r * 0.05, c.x)) * 0.8) - 0.5);
          float wob = 0.012 + 0.03 * smoothstep(0.0, 60.0, r);
          float ray = smoothstep(wob, 0.0, ang) * smoothstep(R + 4.0, R - 6.0, r);
          float ring = smoothstep(0.5, 0.0, abs(fract(r / (11.0 + 5.0 * h2(c.xy + 1.0)) + n2(vec2(a * 3.0, c.y)) * 0.3) - 0.5) - 0.44) * step(r, R) * 0.5;
          float line = max(ray, ring * smoothstep(R, R * 0.3, r));
          float front = exp(-abs(r - R) * 0.15);
          float fade = exp(-age * 0.35);
          glow += uGlow * line * (0.6 + 3.5 * front * fade) * (0.4 + 0.6 * fade);
        }
        // the rift: when the band comes in the ice splits open under the road, black water, its lips lit
        if (uRiftK > 0.001) {
          float dr = 1e5;
          for (int k = 0; k < ${RIFT - 1}; k++) { vec2 a = uRift[k], b = uRift[k + 1]; vec2 pa = p - a, ba = b - a; float hh = clamp(dot(pa, ba) / max(dot(ba, ba), 0.001), 0.0, 1.0); dr = min(dr, length(pa - ba * hh)); }
          float w = uRiftW * uRiftK * (0.7 + 0.6 * n2(p * 0.12));
          float inside = smoothstep(w, w - 1.2, dr);
          col = mix(col, vec3(0.0, 0.006, 0.012) + uSky * fres * 0.35, inside);
          glow += uGlow * (exp(-abs(dr - w) * 0.5) * 2.2 + inside * 0.25 * (0.6 + 0.4 * sin(uTime * 3.0 + dr))) * uRiftK;
        }
        // the peak: the whole lake breaks into floes, the light coming up through the gaps
        if (uBreak > 0.001) {
          vec3 vv = voro(p / 22.0);
          float gap = smoothstep(0.015 + 0.1 * uBreak, 0.0, vv.x);
          vec3 water = mix(vec3(0.0, 0.01, 0.02) + uSky * fres * 0.6, uGlow * (0.4 + 0.25 * sin(uTime * 3.0 + vv.y * 6.0)), uLight);
          col *= 0.8 + 0.4 * vv.z;
          col = mix(col, water, gap * uBreak);
          glow += uGlow * smoothstep(0.05 + 0.1 * uBreak, 0.0, vv.x) * uBreak * uLight * 0.16;
        }
        // open water at the end, where the floes have drifted apart, the dawn in it
        if (uOpen > 0.001) { vec3 vv = voro(p / 30.0); float gap = smoothstep(0.08 + 0.4 * uOpen, 0.0, vv.x); col = mix(col, vec3(0.0, 0.01, 0.02) + uSky * fres * 0.9 + vec3(0.6, 0.9, 1.0) * pow(max(0.0, 1.0 - abs(V.y) * 2.0), 8.0) * 0.1, gap); }
        col += glow;
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        col = mix(col, uFog, clamp(fog, 0.0, 1.0));
        col = vec3(col.r == col.r ? col.r : 0.0, col.g == col.g ? col.g : 0.0, col.b == col.b ? col.b : 0.0);
        gl_FragColor = vec4(clamp(col, 0.0, 16.0), 1.0);
      }`,
  });
}
// the aurora: curtains hung over the far side of the lake, folding, rippling upward
function auroraMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uK: { value: 0.5 }, uA: { value: new THREE.Color(0x4affa8) }, uB: { value: new THREE.Color(0x8a4aff) }, uRip: { value: 0 } },
    vertexShader: `varying vec2 vUv; uniform float uTime; void main(){ vUv = uv; vec3 p = position; p.z += sin(p.x * 0.012 + uTime * 0.3) * 60.0 + sin(p.x * 0.03 - uTime * 0.5) * 20.0; gl_Position = projectionMatrix * (modelViewMatrix * vec4(p, 1.0)); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uK, uRip; uniform vec3 uA, uB; varying vec2 vUv;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float x = vUv.x * 30.0, y = vUv.y;
        float streak = n2(vec2(x * 1.6 + uTime * 0.2, 0.0)) * 0.6 + n2(vec2(x * 5.0 - uTime * 0.6, 3.0)) * 0.4;
        float base = smoothstep(0.0, 0.15, y) * (1.0 - smoothstep(0.3, 1.0, y));
        // on the beat a wave of light runs up the curtains
        float rip = uRip * exp(-pow((y - fract(uTime * 0.9)) * 6.0, 2.0)) * 0.8;
        float k = streak * base * (0.6 + 0.4 * sin(y * 12.0 - uTime * 2.0 + x)) + rip * streak;
        vec3 c = mix(uA, uB, smoothstep(0.35, 0.9, y));
        gl_FragColor = vec4(c * k * uK, 1.0);
      }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}
// columns of light and spray up through the gaps at the peak
function columnMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(0x8af0ff) } },
    vertexShader: `attribute float aK; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = aK; gl_Position = projectionMatrix * (modelViewMatrix * instanceMatrix * vec4(position, 1.0)); }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; varying float vK; void main(){ float y = clamp(vUv.y, 0.0, 1.0); float a = (1.0 - y) * (0.35 + 0.65 * (1.0 - y)); gl_FragColor = vec4(uCol * a * 0.32 * vK, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}
// a snowflake of light (the chorus throws them up out of the ice on the beat)
function flakeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(0xc8f4ff) } },
    vertexShader: `attribute float aK; varying float vK; void main(){ vK = aK; gl_Position = projectionMatrix * (modelViewMatrix * instanceMatrix * vec4(position, 1.0)); }`,
    fragmentShader: `uniform vec3 uCol; varying float vK; void main(){ gl_FragColor = vec4(uCol * vK, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}
// ---------- the lake's things ----------
const IG = {
  // a cluster of shards, hexagonal, pointed, leaning out
  shards() {
    const parts = [], R = seeded(11);
    for (let k = 0; k < 7; k++) {
      const h = 10 + R() * 20, r = 1.6 + R() * 2.2;
      const g = new THREE.CylinderGeometry(0.05, r, h, 6, 1); g.translate(0, h / 2, 0);
      g.rotateZ((R() - 0.5) * 0.7); g.rotateX((R() - 0.5) * 0.5); g.translate((R() - 0.5) * 9, -1, (R() - 0.5) * 9);
      parts.push(paint(g, [0.6 + R() * 0.2, 0.85 + R() * 0.1, 1]));
    }
    return merge(parts);
  },
  column() { const g = new THREE.CylinderGeometry(3, 5, 1, 16, 1, true); g.translate(0, 0.5, 0); return g; },
  // an iceberg: a tall broken block, faceted
  berg() { const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position, R = seeded(3); for (let i = 0; i < p.count; i++) { const k = 0.75 + R() * 0.5; p.setXYZ(i, p.getX(i) * k * 1.2, Math.max(-0.2, p.getY(i)) * k * 2.2, p.getZ(i) * k); } g.computeVertexNormals(); return paint(g, [0.7, 0.9, 1]); },
  // a snowflake: six arms, each with its branches, in the xy plane (1 across)
  flake() {
    const parts = [];
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      const arm = new THREE.BoxGeometry(0.07, 1, 0.02); arm.translate(0, 0.5, 0); arm.rotateZ(a); parts.push(arm);
      for (const [y, l] of [[0.35, 0.3], [0.62, 0.22], [0.82, 0.13]]) for (const s of [-1, 1]) { const b = new THREE.BoxGeometry(0.05, l, 0.02); b.translate(0, l / 2, 0); b.rotateZ(s * 0.75); b.translate(0, y, 0); b.rotateZ(a); parts.push(b); }
    }
    const hex = new THREE.CircleGeometry(0.16, 6); parts.push(hex);
    return merge(parts);
  },
};

extend({
  layers: {
    ggShards: (M) => [IG.shards(), M.ggShardM || (M.ggShardM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.82, emissive: 0x2a6a8a, emissiveIntensity: 0.9, flatShading: true }); return m; })()), 300, {}],
    ggColumn: (M) => [IG.column(), M.ggColumnM || (M.ggColumnM = columnMaterial()), 200, { aK: 1 }],
    ggBerg: (M) => [IG.berg(), M.ggbIce || (M.ggbIce = iceMaterial()), 40, { aFx: 3, aTint: 3 }],
    ggbFlake: (M) => [IG.flake(), M.ggbFlakeM || (M.ggbFlakeM = flakeMaterial()), 60, { aK: 1 }],
  },
  parts: {
    // shards pushed up out of the ice on the bar, a crack of light where they break through
    ggShards(S, it, p, q, yaw) {
      const L = S.layers; L.ggShards;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, u = smooth(it.rise, it.rise + 0.18, T), s = (it.s ?? 1) * (0.2 + 0.8 * u);
      if (u <= 0) return;
      S._e.set(0, yaw + it.seed * 6, 0); const sq = (S._sq || (S._sq = new THREE.Quaternion())).setFromEuler(S._e);
      const w = S._sw || (S._sw = new THREE.Vector3()); w.set(p.x, -14 * (1 - u), p.z);
      m.compose(w, sq, S._s.set(s, s, s)); L.ggShards.add(m);
      const burst = Math.exp(-Math.max(0, T - it.rise) * 2.5);
      glowAt(S, p.x, 8 * s, p.z, 22 * (it.s ?? 1), ICE, 0.35 + 1.4 * burst);
      poolAt(S, p.x, 0.2, p.z, 34 * (it.s ?? 1), DEEP, 0.3 + 0.6 * burst);
    },
    // icebergs heaving up at the peak's hardest hits
    ggBerg(S, it, p) {
      const L = S.layers; L.ggBerg;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, u = smooth(it.rise, it.rise + 0.5, T); if (u <= 0) return;
      const s = it.s ?? 30; S._e.set(0, it.seed * 6, 0); const bq = (S._bq || (S._bq = new THREE.Quaternion())).setFromEuler(S._e);
      const w = S._bw || (S._bw = new THREE.Vector3()); w.set(p.x, -s * 1.5 * (1 - u) + Math.sin(T * 0.7 + it.seed * 9) * 0.6, p.z);
      m.compose(w, bq, S._s.set(s, s, s)); L.ggBerg.add(m, { aFx: [0.55 + 0.6 * Math.exp(-Math.max(0, T - it.rise) * 1.2) + 0.25 * (S.beat || 0), 0, it.seed], aTint: [0.8, 0.92, 1] });
      glowAt(S, p.x, s * 1.2, p.z, s * 2.6, ICE, 0.25 + 0.8 * Math.exp(-Math.max(0, T - it.rise) * 1.5));
    },
    // light pouring up through the gaps between the floes, on the beat
    ggColumns(S, it, p, q, yaw) {
      const L = S.layers; L.ggColumn;
      if (!S.track) return;
      const T = S.tNow ?? 0, b = S.beat ?? 0, m = S._m, on = smooth(it.from, it.from + 0.5, T) * (1 - smooth(it.to, it.to + 1, T)); if (on <= 0) return;
      const q0 = S._q0 || (S._q0 = new THREE.Quaternion());
      for (let k = 0; k < 2; k++) { const h = hash(it.seed * 31 + k), w = local(p, yaw, (h - 0.5) * 60, 0, (hash(it.seed * 7 + k) - 0.5) * 40, S._o); const hh = (30 + 50 * h) * (0.45 + 0.55 * b); m.compose(w, q0, S._s.set(1 + h, hh, 1 + h)); L.ggColumn.add(m, { aK: on * (0.3 + 0.4 * b) }); glowAt(S, w.x, 2, w.z, 14, ICE, on * (0.18 + 0.35 * b)); }
    },
  },
  kits: {
    ggShards(S, z, R) { for (const [t, rise] of z.at) for (const side of [-1, 1]) { if (z.side && z.side !== side) continue; S.items.push({ t: t + R() * 0.2, x: side * ((z.x ?? 30) + R() * (z.spread ?? 16)), rot: 0, s: (z.s ?? 1) * (0.8 + R() * 0.5), seed: R(), rise: rise + (R() < 0.5 ? 0 : 0.02), h: 0, parts: 'ggShards', ahead: z.ahead ?? 30 }); } },
    ggBergs(S, z, R) { for (const [t, x, rise, s] of z.at) S.items.push({ t, x, rot: 0, s, rise, seed: R(), h: 0, parts: 'ggBerg', ahead: 46 }); },
    ggColumns(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.8) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.3, x: side * ((z.x ?? 60) + R() * 30), rot: 0, from: z.on ?? z.from, to: z.off ?? z.to, seed: R(), h: 0, parts: 'ggColumns', ahead: 9 }); },
  },
});

// ---------- the end: the great cage on its floe in open water, its door open, the birds going ----------
export class ShipFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -40; this.s = cfg.s ?? 6;
    this.group = new THREE.Group(); scene.add(this.group);
    const gold = litVC('ggbFinGold', { roughness: 0.35, metalness: 0.55 }, 0.42);
    this.gold = gold;
    const s = this.s, H = this.H = cfg.h ?? 9;
    this.cage = new THREE.Mesh(cageGeo(), gold); this.cage.scale.setScalar(s); this.cage.position.y = H + 0.2; this.group.add(this.cage);
    this.door = new THREE.Mesh(cageDoor(), gold); this.door.scale.setScalar(s); this.group.add(this.door);
    // the swing she sat on, hanging empty from the top of the dome
    const sw = [];
    const ring = new THREE.TorusGeometry(0.75, 0.05, 6, 24); ring.translate(0, -2.35, 0); sw.push(paint(ring, [0.9, 0.7, 0.3]));
    for (const x of [-0.7, 0.7]) { const c = new THREE.CylinderGeometry(0.02, 0.02, 2.35, 4); c.translate(x * 0.98, -1.17, 0); sw.push(paint(c, [0.9, 0.7, 0.3])); }
    this.swing = new THREE.Mesh(merge(sw), gold); this.swing.scale.setScalar(s); this.group.add(this.swing);
    // roses wound round its foot
    const ro = [], R = seeded(41);
    for (let k = 0; k < 46; k++) { const a = (k / 46) * Math.PI * 2 + R() * 0.1, r = 2.35 + R() * 0.25; const g = new THREE.SphereGeometry(0.17 + R() * 0.07, 7, 5); g.translate(Math.cos(a) * r, 0.25 + R() * 0.25, Math.sin(a) * r); ro.push(paint(g, k % 3 ? [0.75, 0.06, 0.16] : [0.95, 0.4, 0.55])); if (k % 2) { const l = new THREE.SphereGeometry(0.14, 5, 3); l.scale(1.4, 0.4, 0.8); l.translate(Math.cos(a + 0.06) * (r + 0.15), 0.2, Math.sin(a + 0.06) * (r + 0.15)); ro.push(paint(l, [0.16, 0.36, 0.2])); } }
    this.roses = new THREE.Mesh(merge(ro), litVC('ggbFinRose', { roughness: 0.7 }, 0.45)); this.roses.scale.setScalar(s); this.roses.position.y = H + 0.2; this.group.add(this.roses);
    // the cloth it was kept under, thrown down on the ice beside it
    const cloth = new THREE.Mesh(clothGeo(), litVC('ggbFinCloth', { roughness: 0.9, side: THREE.DoubleSide }, 0.35));
    cloth.scale.set(s * 0.9, s * 0.2, s * 0.75); cloth.rotation.set(0.12, 0.6, 0.1); cloth.position.set(-2.4 * s, H + 0.3, -2.3 * s); this.group.add(cloth);
    // the island of ice it stands up on, out of the open water, icicles round its lip
    const isl = new THREE.CylinderGeometry(3.5 * s, 4.1 * s, H, 11, 2).toNonIndexed(); const ip = isl.attributes.position;
    for (let i = 0; i < ip.count; i++) { const x = ip.getX(i), y = ip.getY(i), z = ip.getZ(i), a = Math.atan2(z, x), k = 0.86 + 0.24 * hash(Math.round(a * 4.0) * 1.7 + Math.round(y)); if (y < H / 2 - 0.01) { ip.setX(i, x * k); ip.setZ(i, z * k); } }
    isl.translate(0, H / 2, 0); isl.computeVertexNormals(); paint(isl, [0.78, 0.9, 1]);
    const ice = [isl];
    for (let k = 0; k < 26; k++) { const a = (k / 26) * Math.PI * 2, ic = new THREE.ConeGeometry(0.35 + 0.3 * hash(k), 2 + 3.5 * hash(k * 3), 5); ic.rotateX(Math.PI); ic.translate(Math.cos(a) * 3.45 * s, H - 1.2 - 1.5 * hash(k * 3), Math.sin(a) * 3.45 * s); ice.push(paint(ic, [0.85, 0.95, 1])); }
    for (let k = 0; k < 9; k++) { const a = hash(k * 5.1) * Math.PI * 2, r = (4.2 + hash(k * 2.3) * 1.8) * s, b = new THREE.IcosahedronGeometry(1.2 + hash(k) * 2.4, 0); b.scale(1.3, 0.7, 1); b.translate(Math.cos(a) * r, 0.4, Math.sin(a) * r); ice.push(paint(b, [0.82, 0.92, 1])); }
    this.island = new THREE.Mesh(merge(ice), litVC('ggbFinIsle', { roughness: 0.35, metalness: 0.1, flatShading: true }, 0.4)); this.group.add(this.island);
    // the floe it stands on
    const floeG = new THREE.CylinderGeometry(1, 1.04, 1, 9, 1); const fp = floeG.attributes.position;
    for (let i = 0; i < fp.count; i++) { const a = Math.atan2(fp.getZ(i), fp.getX(i)), k = 0.82 + 0.3 * hash(Math.round(a * 3) + 5); if (Math.abs(fp.getY(i)) > 0.1 || Math.hypot(fp.getX(i), fp.getZ(i)) > 0.5) { fp.setX(i, fp.getX(i) * k); fp.setZ(i, fp.getZ(i) * k); } }
    floeG.computeVertexNormals(); paint(floeG, [0.86, 0.93, 1]);
    const floe = new THREE.Mesh(floeG, litVC('ggbFinFloe', { roughness: 0.6, flatShading: true }, 0.35)); floe.scale.set(s * 5.2, 1.6, s * 4.2); floe.position.y = 0.2; this.group.add(floe);
    this.fired = false; this.earned = 0.5; this.lit = 0;
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3(); this._d = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    // turned toward her coming, the open door on her side
    const yaw = this.course.sample(this.t).yaw + Math.PI + (this.x > 0 ? -1 : 1) * (this.cfg.turn ?? 0.7);
    this.group.rotation.set(0, yaw, 0);
    const s = this.s;
    // the door, open, swaying a little; the empty swing still moving
    const open = 1.9 + 0.08 * Math.sin(songT * 1.1);
    const H = this.H;
    this.door.position.set(0.6 * s, H + 0.2, 2.0 * s); this.door.rotation.set(0, open, 0);
    this.swing.position.set(0, H + 0.2 + 5.2 * s, 0); this.swing.rotation.set(0.16 * Math.sin(songT * 1.3), 0.3, 0);
    this.lit += ((this.fired ? 1 : 0.35) - this.lit) * Math.min(1, dt * 1.2);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const e = 0.5 + 0.5 * this.earned, M = this.group.matrixWorld;
    // the lamp inside it, and the gold catching it
    this._w.set(0, H + 2.6 * s, 0).applyMatrix4(M);
    S.glow(this._w.x, this._w.y, this._w.z, 6.5 * s, [1, 0.82, 0.55], 0.45 + 0.6 * this.lit * e);
    S.pool(this._w.x, H - 0.3, this._w.z, 16 * s, [1, 0.8, 0.55], 0.5 + 0.6 * this.lit);
    for (let k = 0; k < 22; k++) { const a = (k / 22) * Math.PI * 2; this._w.set(Math.cos(a) * 2.05 * s, (4.05 + 0.1) * s + H + 0.2, Math.sin(a) * 2.05 * s).applyMatrix4(M); S.glow(this._w.x, this._w.y, this._w.z, 0.3 * s, [1, 0.88, 0.6], (0.4 + 0.9 * this.lit) * ((k + Math.floor(songT * 4)) % 3 === 0 ? 1.4 : 0.7)); }
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; this._w.set(Math.cos(a) * 2.2 * s, 0.6 * s + H + 0.2, Math.sin(a) * 2.2 * s).applyMatrix4(M); S.glow(this._w.x, this._w.y, this._w.z, 0.28 * s, [1, 0.85, 0.6], 0.5 + 0.8 * this.lit); }
    this._w.set(0, 6.05 * s + H + 0.2, 0).applyMatrix4(M); S.glow(this._w.x, this._w.y, this._w.z, 0.9 * s, [1, 0.9, 0.7], 1.2 * this.lit);
    const L = S.layers; if (!L.ggbBird) return;
    const _q = this._q, _m = this._m, _s = this._s, _e = this._e;
    // one of the girls, fallen, lying in the shallows by it with her arms still up
    if (L.ggbGRise) {
      this._w.set(2.95 * s, H + 0.9, 1.0 * s).applyMatrix4(M);
      _e.set(-1.45, yaw - 0.9, 0.1); _q.setFromEuler(_e); const sg = s * 1.15;
      _m.compose(this._w, _q, _s.set(sg, sg, sg)); L.ggbGRise.add(_m, { aFx: [0.45 + 0.25 * this.lit, 0.25, 0.4], aTint: [0.85, 0.95, 1] });
    }
    // the birds: a stream of them out of the door and up round it into the morning
    const n = Math.round(30 + 40 * this.lit * e);
    const door = this._d.set(0.0, 2.0 * s + H + 0.2, 2.4 * s);
    for (let k = 0; k < n; k++) {
      const h1 = hash(k * 1.7 + 0.3), h2 = hash(k * 3.1 + 5), h3 = hash(k * 7.3 + 1);
      const u = ((songT * (0.045 + 0.035 * h1) + h2) % 1);
      // out of the door, then round and up, wider and higher, the way smoke goes
      const turn = (h1 < 0.5 ? 1 : -1), a = Math.PI / 2 + turn * u * 7.5 + (h3 - 0.5) * 0.6;
      const r = (1.0 + u * 7.5 + h3 * 1.5) * s * 0.75, y = door.y + u * u * 22 * s * 0.75 + (h2 - 0.5) * s;
      const ox = Math.cos(a) * r, oz = Math.sin(a) * r;
      const k0 = 1 - smooth(0.0, 0.12, u);
      this._w.set(door.x * k0 + ox * (1 - k0), y, door.z * k0 + oz * (1 - k0)).applyMatrix4(M);
      const ta = a + turn * Math.PI / 2;
      _e.set(-0.25 - 0.3 * u, yaw - ta + Math.PI / 2, turn * 0.35); _q.setFromEuler(_e);
      const sc = s * 0.62 * (0.8 + 0.4 * h3) * smooth(0, 0.05, u) * (1 - smooth(0.88, 1, u));
      _m.compose(this._w, _q, _s.set(sc, sc, sc)); L.ggbBird.add(_m, { aPh: [k * 1.3, 10 + 3 * h2, 1] });
      S.glow(this._w.x, this._w.y, this._w.z, sc * 1.6, [0.85, 0.95, 1], 0.75);
    }
    // a few sat along its top, and one on the open door
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.4;
      this._w.set(Math.cos(a) * 1.3 * s, 5.35 * s + H + 0.2 - Math.abs(Math.cos(a)) * 0.2 * s, Math.sin(a) * 1.3 * s).applyMatrix4(M);
      _e.set(0, yaw + a * 2.3, 0); _q.setFromEuler(_e); const sc = s * 0.4;
      _m.compose(this._w, _q, _s.set(sc, sc, sc)); L.ggbBird.add(_m, { aPh: [k, 3, 0.06 + 0.06 * Math.sin(songT * 2 + k)] });
    }
    this._w.set(0.6 * s + Math.cos(open) * -1.1 * s * 0.5, 3.05 * s + H + 0.2 + 0.15 * s, 2.0 * s + Math.sin(open) * 1.1 * s * 0.5).applyMatrix4(M);
    _e.set(0, yaw + 1.2, 0); _q.setFromEuler(_e);
    _m.compose(this._w, _q, _s.set(s * 0.45, s * 0.45, s * 0.45)); L.ggbBird.add(_m, { aPh: [9, 2.5, 0.1] });
  }
}

// ---------- the place, per frame ----------
export class IceWorld {
  constructor(scene, S) {
    this.S = S;
    const plan = S.plan || {};
    this.lakeMat = lakeMaterial();
    const g = new THREE.PlaneGeometry(4000, 4000, 1, 1); g.rotateX(-Math.PI / 2);
    this.lake = new THREE.Mesh(g, this.lakeMat); this.lake.position.y = 0.06; this.lake.renderOrder = -5; this.lake.frustumCulled = false; scene.add(this.lake);
    // the aurora: long curtains a long way off on both sides and ahead
    this.auroraMat = auroraMaterial();
    this.aurora = new THREE.Group(); scene.add(this.aurora);
    for (const [x, z, yaw, w] of [[-700, 400, 0.3, 1600], [600, 700, -0.4, 1400], [0, 1100, 0, 1800], [-300, -600, 2.6, 1400]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 420, 60, 1), this.auroraMat); m.position.set(x, 380, z); m.rotation.y = yaw; m.frustumCulled = false; this.aurora.add(m); }
    // the cracks: where each hit lands, a little ahead of you
    this.events = (plan.cracks || []).map(([t, x, ahead, k]) => ({ t, x, ahead: ahead ?? 2.2, k: k ?? 1, pos: null }));
    this._p = new THREE.Vector3(); this._q = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._qq = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    // made now, so it's compiled with everything else before the ride
    if (S.town && plan.ggb && plan.ggb.flakes) void S.town.layers.ggbFlake;
  }
  update(S, dt, camera, time) {
    const P = S.P, t = S.rider.t, plan = S.plan, u = this.lakeMat.uniforms, beat = S.town.beat || 0;
    const fogD = P.fogDensity * (1 - (S.entry.lift?.fog ?? 0.32) * (S.lift ? S.lift.k : 0));
    this.lake.position.x = camera.position.x; this.lake.position.z = camera.position.z;
    u.uTime.value = time; u.uSong.value = t; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = fogD;
    u.uSky.value.set(P.horizon); u.uGlow.value.set(P.glow ?? 0x5ad8ff);
    const br = plan.breakup || [1e9, 1e9, 1e9];
    u.uBreak.value = smooth(br[0], br[0] + 2.0, t); u.uLight.value = smooth(br[0], br[0] + 0.5, t) * (1 - smooth(br[1], br[1] + 2.5, t)); u.uOpen.value = smooth(br[1], br[2], t);
    // the nearest cracks to now go in the shader, placed where you'll see them
    const live = [];
    for (const e of this.events) { if (t < e.t - 0.5 || t > e.t + 8) continue; if (!e.pos) { S.track.ground(e.t + e.ahead, e.x, this._p); e.pos = [this._p.x, this._p.z]; } live.push(e); }
    for (let k = 0; k < MAXC; k++) { const e = live[k], v = u.uCracks.value[k]; if (e) v.set(e.pos[0], e.pos[1], e.t, e.k); else v.set(0, 0, -1e5, 0); }
    // the rift under the road, from the lip to the landing
    const rf = plan.ggb && plan.ggb.rift;
    if (rf && t > rf[0] - 2 && t < rf[3]) {
      for (let k = 0; k < RIFT; k++) { S.track.ground(rf[1] + (rf[2] - rf[1]) * (k / (RIFT - 1)), Math.sin(k * 1.9) * 2.5, this._p); u.uRift.value[k].set(this._p.x, this._p.z); }
      u.uRiftK.value = smooth(rf[0], rf[0] + 0.45, t); u.uRiftW.value = rf[4] ?? 9;
    } else u.uRiftK.value = 0;
    // the aurora: brighter with the band, brightest at the peak, a wave up it on the beat in the choruses
    const au = this.auroraMat.uniforms; au.uTime.value = time;
    let k = 0.35; for (const [a, b] of plan.aurora || []) if (t >= a) k = b;
    const sec = S.course.sectionAt(t), big = sec.kind === 'chorus' || sec.kind === 'final';
    au.uK.value += (k * (0.85 + (big ? 0.22 : 0.12) * beat) - au.uK.value) * Math.min(1, dt * 3);
    au.uRip.value += ((big ? 1 : 0) * beat - au.uRip.value) * Math.min(1, dt * 10);
    au.uA.value.set(P.skyGlow ?? 0x4affa8); au.uB.value.set(P.hold ?? 0x8a4aff);
    this.aurora.position.set(camera.position.x, 0, camera.position.z);
    this.aurora.rotation.y = S.course.sample(t).yaw;
    // the ice, the birds: the light of the look, the fog, the beat
    const M = S.town.mats;
    if (M.ggbIce) {
      const iu = M.ggbIce.uniforms;
      iu.uCam.value.copy(camera.position); iu.uFog.value.set(P.fog); iu.uFogDensity.value = fogD; iu.uBeat.value = beat; iu.uTime.value = time;
      iu.uSky.value.set(P.skyLight ?? 0x4a6a9a); iu.uMoon.value.set(P.moon ?? 0xc8e0ff); if (P.moonDir) iu.uMoonDir.value.set(...P.moonDir).normalize();
      iu.uIce.value.set(P.glow ?? 0x8ae8ff);
    }
    if (M.ggbBirdM) { const bu = M.ggbBirdM.uniforms; bu.uTime.value = time; bu.uCam.value.copy(camera.position); bu.uFog.value.set(P.fog); bu.uFogDensity.value = fogD; bu.uGlow.value.set(P.glow ?? 0x8ae8ff); }
    if (M.ggbStitchM) M.ggbStitchM.uniforms.uK.value = 1;
    if (M.ggbFlakeM) M.ggbFlakeM.uniforms.uCol.value.set(P.edge ?? 0xc8f4ff);
  }
  // drawn with the scenery: the snowflakes the chorus throws up
  draw(T) {
    const S = this.S, t = T.tNow ?? 0, plan = S.plan || {}, c = S.course;
    const fl = plan.ggb && plan.ggb.flakes;
    if (!fl || !T.layers.ggbFlake) return;
    const _m = this._m, _q = this._qq, _s = this._s, _e = this._e, p = this._p;
    for (const [a, b, every, only] of fl) {
      if (t < a - 0.5 || t > b + 2.5) continue;
      const i0 = c.nearestBeatIndex(a), i1 = c.nearestBeatIndex(b);
      for (let i = i0; i < i1; i += every ?? 1) {
        const tb = c.beats[i], age = t - tb;
        if (age < 0 || age > 2.4) continue;
        const side = only || (i % 2 ? 1 : -1), h = hash(i * 1.37);
        T.track.ground(tb + 2.0 + h * 0.6, side * (30 + 18 * h), p);
        const grow = 1 - Math.exp(-age * 5), fade = 1 - smooth(1.2, 2.4, age);
        p.y = 3 + 20 * (1 - Math.exp(-age * 1.4)) + h * 6;
        _e.set(0, c.sample(tb + 2).yaw + Math.PI + side * 0.5, age * (1.2 + h) * (h < 0.5 ? 1 : -1)); _q.setFromEuler(_e);
        const sc = (7 + 5 * h) * grow;
        _m.compose(p, _q, _s.set(sc, sc, sc)); T.layers.ggbFlake.add(_m, { aK: 0.95 * fade });
        T.glow(p.x, p.y, p.z, sc * 1.4, [0.7, 0.92, 1], 0.45 * fade * (1 - grow * 0.4));
      }
    }
  }
}
