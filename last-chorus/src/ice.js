// Good Girls Don't Fight Back. Made from the music and nothing else. A frozen lake at night: the
// first hits crack the ice open with blue light under it; the silence, and the band breaks in with
// the aurora; shards of ice pushed up along the road on every bar; a ship locked in the ice; one bar
// of nothing; the peak breaks the whole lake into floes with light pouring up between them, columns of
// it on the beat; and at the end the ship sits in open black water under the aurora.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const ICE = [0.55, 0.92, 1.0], DEEP = [0.2, 0.6, 1.0];
const MAXC = 16;

// ---------- the lake: frost on black ice, cracks of light, and at the peak the floes ----------
function lakeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSong: { value: 0 }, uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0012 },
      uSky: { value: new THREE.Color() }, uGlow: { value: new THREE.Color(0x5ad8ff) }, uBreak: { value: 0 }, uLight: { value: 0.5 }, uOpen: { value: 0 },
      uCracks: { value: Array.from({ length: MAXC }, () => new THREE.Vector4(0, 0, -1e5, 0)) },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uSong, uFogDensity, uBreak, uLight, uOpen; uniform vec3 uCam, uFog, uSky, uGlow; uniform vec4 uCracks[${MAXC}];
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
        float fres = pow(1.0 - max(V.y, 0.0), 5.0);
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
        // the peak: the whole lake breaks into floes, the light coming up through the gaps
        if (uBreak > 0.001) {
          vec3 vv = voro(p / 22.0);
          float gap = smoothstep(0.02 + 0.22 * uBreak, 0.0, vv.x);
          vec3 water = mix(vec3(0.0, 0.01, 0.02) + uSky * fres * 0.6, uGlow * (1.2 + 0.8 * sin(uTime * 3.0 + vv.y * 6.0)), uLight);
          col *= 0.8 + 0.4 * vv.z;
          col = mix(col, water, gap * uBreak);
          glow += uGlow * smoothstep(0.08 + 0.2 * uBreak, 0.0, vv.x) * uBreak * uLight * 0.6;
        }
        // open water at the end, where the floes have drifted apart
        if (uOpen > 0.001) { vec3 vv = voro(p / 30.0); float gap = smoothstep(0.08 + 0.4 * uOpen, 0.0, vv.x); col = mix(col, vec3(0.0, 0.01, 0.02) + uSky * fres * 0.8 + vec3(0.6, 0.9, 1.0) * pow(max(0.0, 1.0 - abs(V.y) * 2.0), 8.0) * 0.1, gap); }
        col += glow;
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}
// the aurora: curtains hung over the far side of the lake, folding, rippling upward
function auroraMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uK: { value: 0.5 }, uA: { value: new THREE.Color(0x4affa8) }, uB: { value: new THREE.Color(0x8a4aff) } },
    vertexShader: `varying vec2 vUv; uniform float uTime; void main(){ vUv = uv; vec3 p = position; p.z += sin(p.x * 0.012 + uTime * 0.3) * 60.0 + sin(p.x * 0.03 - uTime * 0.5) * 20.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uK; uniform vec3 uA, uB; varying vec2 vUv;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float x = vUv.x * 30.0, y = vUv.y;
        float streak = n2(vec2(x * 1.6 + uTime * 0.2, 0.0)) * 0.6 + n2(vec2(x * 5.0 - uTime * 0.6, 3.0)) * 0.4;
        float base = smoothstep(0.0, 0.15, y) * (1.0 - smoothstep(0.3, 1.0, y));
        float k = streak * base * (0.6 + 0.4 * sin(y * 12.0 - uTime * 2.0 + x));
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
    vertexShader: `attribute float aK; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = aK; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; varying float vK; void main(){ float y = clamp(vUv.y, 0.0, 1.0); float a = (1.0 - y) * (0.35 + 0.65 * (1.0 - y)); gl_FragColor = vec4(uCol * a * 0.32 * vK, 1.0); }`,
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
  // the ship: the hull, the castle at the stern, three masts, the yards, the sails furled and frosted
  ship() {
    const parts = [], wood = rgb(0x2a1e16), frost = rgb(0xd8ecf8), dark = rgb(0x14100c);
    const hull = (L, B, h, y, c) => { const s = new THREE.Shape(); s.moveTo(-L / 2, -B / 2); s.lineTo(L * 0.22, -B / 2); s.quadraticCurveTo(L * 0.44, -B / 2.2, L / 2, 0); s.quadraticCurveTo(L * 0.44, B / 2.2, L * 0.22, B / 2); s.lineTo(-L / 2, B / 2); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return paint(g, c); };
    parts.push(hull(64, 14, 9, -3, wood)); parts.push(hull(65, 14.6, 1.2, 5.6, dark)); parts.push(hull(60, 12.4, 0.6, 6.2, frost));
    parts.push(paint(box(14, 6, 13, -24, 9, 0), wood)); parts.push(paint(box(14.6, 0.6, 13.6, -24, 12.2, 0), frost));
    for (let k = 0; k < 6; k++) parts.push(paint(box(1.4, 1.4, 0.4, -20 + k * 7, 3, 7.1), rgb(0x8a6a3a)));
    parts.push(paint(cyl(0.4, 0.7, 22, 8, 0, 0, 0).rotateZ(-1.2).translate(38, 9, 0), wood));
    for (const [x, h] of [[-14, 44], [4, 52], [20, 42]]) {
      parts.push(paint(cyl(0.6, 1.0, h, 10, x, 6 + h / 2, 0), wood));
      for (const [y, w] of [[0.45, 22], [0.68, 17], [0.88, 11]]) { const yy = 6 + h * y; parts.push(paint(cyl(0.3, 0.3, w, 6, 0, 0, 0).rotateX(Math.PI / 2).translate(x, yy, 0), wood)); parts.push(paint(cyl(1.0, 1.0, w * 0.9, 10, 0, 0, 0).rotateX(Math.PI / 2).translate(x, yy - 1.0, 0), frost)); }
    }
    return merge(parts);
  },
  flake() { const parts = []; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; const arm = new THREE.BoxGeometry(0.1, 1, 0.04); arm.translate(0, 0.5, 0); arm.rotateZ(a); parts.push(arm); for (const s of [-1, 1]) { const b = new THREE.BoxGeometry(0.08, 0.3, 0.04); b.translate(0, 0.15, 0); b.rotateZ(s * 0.7); b.translate(0, 0.55, 0); b.rotateZ(a); parts.push(b); } } return merge(parts); },
};

extend({
  layers: {
    ggShards: (M) => [IG.shards(), M.ggShardM || (M.ggShardM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.82, emissive: 0x2a6a8a, emissiveIntensity: 0.9, flatShading: true }); return m; })()), 300, {}],
    ggColumn: (M) => [IG.column(), M.ggColumnM || (M.ggColumnM = columnMaterial()), 200, { aK: 1 }],
    ggBerg: (M) => [IG.berg(), M.ggBergM || (M.ggBergM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0.1, emissive: 0x1a4a6a, emissiveIntensity: 0.9, flatShading: true })), 40, {}],
    ggShip: (M) => [IG.ship(), VCm(M, 'ggShipM', 0.18, { roughness: 0.8 }), 2, {}],
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
      m.compose(w, bq, S._s.set(s, s, s)); L.ggBerg.add(m);
      glowAt(S, p.x, s * 1.2, p.z, s * 2.6, ICE, 0.25 + 0.8 * Math.exp(-Math.max(0, T - it.rise) * 1.5));
    },
    // light pouring up through the gaps between the floes, on the beat
    ggColumns(S, it, p, q, yaw) {
      const L = S.layers; L.ggColumn;
      if (!S.track) return;
      const T = S.tNow ?? 0, b = S.beat ?? 0, m = S._m, on = smooth(it.from, it.from + 0.5, T) * (1 - smooth(it.to, it.to + 1, T)); if (on <= 0) return;
      const q0 = S._q0 || (S._q0 = new THREE.Quaternion());
      for (let k = 0; k < 4; k++) { const h = hash(it.seed * 31 + k), w = local(p, yaw, (h - 0.5) * 60, 0, (hash(it.seed * 7 + k) - 0.5) * 40, S._o); const hh = (40 + 80 * h) * (0.4 + 0.6 * b); m.compose(w, q0, S._s.set(1 + h, hh, 1 + h)); L.ggColumn.add(m, { aK: on * (0.6 + 0.6 * b) }); glowAt(S, w.x, 2, w.z, 16, ICE, on * (0.22 + 0.45 * b)); }
    },
    // the ship locked in the ice
    ggShip(S, it, p, q) {
      const L = S.layers; L.ggShip;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); L.ggShip.add(m);
      const lan = local(p, S.course.sample(it.t).yaw + it.rot, -24 * s, 14 * s, 0, S._o); glowAt(S, lan.x, lan.y, lan.z, 5 * s, [1, 0.75, 0.4], 0.9 + 0.2 * Math.sin(T * 5));
      glowAt(S, p.x, 30 * s, p.z, 90 * s, ICE, 0.08);
    },
  },
  kits: {
    ggShards(S, z, R) { for (const [t, rise] of z.at) for (const side of [-1, 1]) { if (z.side && z.side !== side) continue; S.items.push({ t: t + R() * 0.2, x: side * ((z.x ?? 30) + R() * (z.spread ?? 16)), rot: 0, s: (z.s ?? 1) * (0.8 + R() * 0.5), seed: R(), rise: rise + (R() < 0.5 ? 0 : 0.02), h: 0, parts: 'ggShards', ahead: z.ahead ?? 30 }); } },
    ggBergs(S, z, R) { for (const [t, x, rise, s] of z.at) S.items.push({ t, x, rot: 0, s, rise, seed: R(), h: 0, parts: 'ggBerg', ahead: 46 }); },
    ggColumns(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.8) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.3, x: side * ((z.x ?? 60) + R() * 30), rot: 0, from: z.on ?? z.from, to: z.off ?? z.to, seed: R(), h: 0, parts: 'ggColumns', ahead: 36 }); },
    ggShip(S, z) { S.items.push({ t: z.at, x: z.x, rot: z.rot ?? 0.3, s: z.s ?? 1, h: -1.5, parts: 'ggShip', ahead: 46 }); },
  },
});

// ---------- the end: the ship in open water, the floes gone off, the aurora over it ----------
export class ShipFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -70;
    this.group = new THREE.Group(); scene.add(this.group);
    this.ship = new THREE.Mesh(IG.ship(), selfLit({ roughness: 0.8 }, 0.2)); this.ship.scale.setScalar(cfg.s ?? 1.2); this.ship.position.y = -1.6; this.group.add(this.ship);
    this.fired = false; this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() { this.fired = true; }
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(Math.sin(songT * 0.6) * 0.012, this.course.sample(this.t).yaw + (this.cfg.rot ?? 0.5), Math.sin(songT * 0.5) * 0.02);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1.2;
    for (const [x, y] of [[-24, 14], [30, 9], [4, 58]]) { this._w.set(x, y, 0).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 6 * s, [1, 0.75, 0.4], 1.1 + 0.2 * Math.sin(songT * 5 + x)); }
    this._w.set(0, 0, 0).applyMatrix4(this.group.matrixWorld); S.pool(this._w.x, 0.3, this._w.z, 90 * s, [1, 0.7, 0.4], 0.35);
  }
}

// ---------- the place, per frame ----------
export class IceWorld {
  constructor(scene, S) {
    this.S = S;
    this.lakeMat = lakeMaterial();
    const g = new THREE.PlaneGeometry(4000, 4000, 1, 1); g.rotateX(-Math.PI / 2);
    this.lake = new THREE.Mesh(g, this.lakeMat); this.lake.position.y = 0.06; this.lake.renderOrder = -5; this.lake.frustumCulled = false; scene.add(this.lake);
    // the aurora: long curtains a long way off on both sides and ahead
    this.auroraMat = auroraMaterial();
    this.aurora = new THREE.Group(); scene.add(this.aurora);
    for (const [x, z, yaw, w] of [[-700, 400, 0.3, 1600], [600, 700, -0.4, 1400], [0, 1100, 0, 1800], [-300, -600, 2.6, 1400]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 420, 60, 1), this.auroraMat); m.position.set(x, 380, z); m.rotation.y = yaw; m.frustumCulled = false; this.aurora.add(m); }
    // the cracks: where each hit lands, a little ahead of you
    this.events = (S.plan.cracks || []).map(([t, x, ahead, k]) => ({ t, x, ahead: ahead ?? 2.2, k: k ?? 1, pos: null }));
    this._p = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const P = S.P, t = S.rider.t, plan = S.plan, u = this.lakeMat.uniforms;
    this.lake.position.x = camera.position.x; this.lake.position.z = camera.position.z;
    u.uTime.value = time; u.uSong.value = t; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uSky.value.set(P.horizon); u.uGlow.value.set(P.glow ?? 0x5ad8ff);
    const br = plan.breakup || [1e9, 1e9, 1e9];
    u.uBreak.value = smooth(br[0], br[0] + 2.0, t); u.uLight.value = smooth(br[0], br[0] + 0.5, t) * (1 - smooth(br[1], br[1] + 2.5, t)); u.uOpen.value = smooth(br[1], br[2], t);
    // the nearest cracks to now go in the shader, placed where you'll see them
    const live = [];
    for (const e of this.events) { if (t < e.t - 0.5 || t > e.t + 8) continue; if (!e.pos) { S.track.ground(e.t + e.ahead, e.x, this._p); e.pos = [this._p.x, this._p.z]; } live.push(e); }
    for (let k = 0; k < MAXC; k++) { const e = live[k], v = u.uCracks.value[k]; if (e) v.set(e.pos[0], e.pos[1], e.t, e.k); else v.set(0, 0, -1e5, 0); }
    // the aurora: brighter with the band, brightest at the peak
    const au = this.auroraMat.uniforms; au.uTime.value = time;
    let k = 0.35; for (const [a, b] of plan.aurora || []) if (t >= a) k = b;
    au.uK.value += (k * (0.85 + 0.15 * (S.town.beat || 0)) - au.uK.value) * Math.min(1, dt * 3);
    au.uA.value.set(P.skyGlow ?? 0x4affa8); au.uB.value.set(P.hold ?? 0x8a4aff);
    this.aurora.position.set(camera.position.x, 0, camera.position.z);
    this.aurora.rotation.y = S.course.sample(t).yaw;
  }
}
