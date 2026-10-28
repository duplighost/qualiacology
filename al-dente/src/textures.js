// Procedural pasta surface textures. Baked once on the GPU, read back into
// DataTextures so each material can clone them with its own repeat.
import * as THREE from 'three';
import { mulberry32 } from './util.js';

const GLSL_NOISE = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uTexel;
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float gnoise(vec2 x, vec2 per) {
  vec2 i = floor(x), f = fract(x);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 g00 = hash22(mod(i, per)) * 2.0 - 1.0;
  vec2 g10 = hash22(mod(i + vec2(1.0, 0.0), per)) * 2.0 - 1.0;
  vec2 g01 = hash22(mod(i + vec2(0.0, 1.0), per)) * 2.0 - 1.0;
  vec2 g11 = hash22(mod(i + vec2(1.0, 1.0), per)) * 2.0 - 1.0;
  float a = dot(g00, f), b = dot(g10, f - vec2(1.0, 0.0)), c = dot(g01, f - vec2(0.0, 1.0)), d = dot(g11, f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.4;
}
float fbm(vec2 uv, vec2 freq, int oct) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 7; i++) { if (i >= oct) break; s += a * gnoise(uv * freq, freq); freq *= 2.0; a *= 0.5; }
  return s;
}
vec2 worley(vec2 uv, vec2 cells) {
  vec2 x = uv * cells; vec2 i = floor(x), f = fract(x);
  float best = 9.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int xx = -1; xx <= 1; xx++) {
    vec2 o = vec2(float(xx), float(y));
    vec2 c = mod(i + o, cells);
    vec2 d = o + hash22(c) - f;
    float dd = dot(d, d);
    if (dd < best) { best = dd; id = hash12(c + 17.0); }
  }
  return vec2(sqrt(best), id);
}
// Isotropic: soft starch undulation, fine grain, semolina pores.
float hPores(vec2 uv) {
  float h = 0.55 * fbm(uv, vec2(3.0), 4);
  h += 0.16 * fbm(uv + 0.31, vec2(24.0), 3);
  vec2 w = worley(uv, vec2(22.0));
  h -= 0.42 * (1.0 - smoothstep(0.0, 0.13 + 0.12 * w.y, w.x)) * step(0.52, w.y);
  vec2 w2 = worley(uv + 0.37, vec2(56.0));
  h -= 0.18 * (1.0 - smoothstep(0.0, 0.22, w2.x)) * step(0.45, w2.y);
  return h;
}
// Bronze-die dry pasta: streaks along u, pores, a little chatter.
float hStriate(vec2 uv) {
  float h = 0.42 * fbm(uv, vec2(2.0, 48.0), 4);
  h += 0.10 * fbm(uv + 0.5, vec2(16.0, 16.0), 3);
  h += 0.06 * sin(uv.y * 6.2831 * 96.0 + 2.0 * fbm(uv, vec2(4.0, 8.0), 2));
  vec2 w = worley(uv, vec2(28.0));
  h -= 0.36 * (1.0 - smoothstep(0.0, 0.12 + 0.08 * w.y, w.x)) * step(0.5, w.y);
  return h;
}
`;

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function bakeToData(renderer, size, body) {
  const rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false, type: THREE.UnsignedByteType });
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: GLSL_NOISE + body, uniforms: { uTexel: { value: 1 / size } }, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.render(scene, cam);
  const px = new Uint8Array(size * size * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
  renderer.setRenderTarget(prev);
  rt.dispose(); mat.dispose(); quad.geometry.dispose();
  const tex = new THREE.DataTexture(px, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.needsUpdate = true;
  return tex;
}

const normalBody = (fn, k) => /* glsl */`
void main() {
  float e = uTexel;
  float hx = ${fn}(vUv + vec2(e, 0.0)) - ${fn}(vUv - vec2(e, 0.0));
  float hy = ${fn}(vUv + vec2(0.0, e)) - ${fn}(vUv - vec2(0.0, e));
  vec3 n = normalize(vec3(-hx / (2.0 * e) * ${k}, -hy / (2.0 * e) * ${k}, 1.0));
  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
}`;

// Albedo multiplier for big surfaces: mottling, bran specks, flour dust. Linear values.
const ALBEDO_BODY = /* glsl */`
void main() {
  vec2 uv = vUv;
  float lo = fbm(uv, vec2(2.0), 5);
  float mid = fbm(uv + 1.7, vec2(8.0), 4);
  vec2 sp = worley(uv, vec2(64.0));
  float speck = (1.0 - smoothstep(0.0, 0.11, sp.x)) * step(0.78, sp.y);
  vec2 sp2 = worley(uv + 0.5, vec2(150.0));
  float speck2 = (1.0 - smoothstep(0.0, 0.16, sp2.x)) * step(0.7, sp2.y);
  float dust = smoothstep(0.1, 0.55, fbm(uv + 3.1, vec2(4.0), 4));
  vec3 c = vec3(0.92 + 0.08 * lo + 0.03 * mid);
  c *= vec3(1.0, 0.985 - 0.03 * lo, 0.96 - 0.06 * lo);
  c *= 1.0 - 0.22 * speck - 0.1 * speck2;
  c = mix(c, vec3(1.0, 0.99, 0.96), dust * 0.22);
  gl_FragColor = vec4(clamp(c * 0.97, 0.0, 1.0), 1.0);
}`;

// G = roughness multiplier (dusty patches rougher, starch film smoother).
const ROUGH_BODY = /* glsl */`
void main() {
  vec2 uv = vUv;
  float a = fbm(uv, vec2(3.0), 4);
  float b = fbm(uv + 0.71, vec2(18.0), 3);
  vec2 w = worley(uv, vec2(22.0));
  float pore = (1.0 - smoothstep(0.0, 0.2, w.x)) * step(0.52, w.y);
  float r = 0.72 + 0.16 * a + 0.08 * b + 0.12 * pore;
  gl_FragColor = vec4(1.0, clamp(r, 0.0, 1.0), 1.0, 1.0);
}`;

// Pastina: a tight bed of tiny pasta drawn on canvas, with a height-derived normal map.
function makePastina(size, seed) {
  const rnd = mulberry32(seed);
  const cA = document.createElement('canvas'); cA.width = cA.height = size;
  const cH = document.createElement('canvas'); cH.width = cH.height = size;
  const a = cA.getContext('2d'), h = cH.getContext('2d');
  a.fillStyle = '#7a5520'; a.fillRect(0, 0, size, size);
  h.fillStyle = '#000'; h.fillRect(0, 0, size, size);
  const star = (ctx, r, inner) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * inner : r;
      ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    ctx.closePath();
  };
  const shapePath = (ctx, type, s) => {
    if (type === 0) star(ctx, s, 0.5);
    else if (type === 1) { ctx.beginPath(); ctx.ellipse(0, 0, s * 0.62, s * 0.62, 0, 0, Math.PI * 2); }
    else if (type === 2) { ctx.beginPath(); ctx.ellipse(0, 0, s * 1.05, s * 0.42, 0, 0, Math.PI * 2); }
    else { ctx.beginPath(); ctx.ellipse(0, 0, s * 0.7, s * 0.7, 0, 0, Math.PI * 2); ctx.ellipse(0, 0, s * 0.3, s * 0.3, 0, 0, Math.PI * 2, true); }
  };
  const layers = [ { n: 2600, shade: 0.55, hv: 70 }, { n: 2400, shade: 0.78, hv: 150 }, { n: 1700, shade: 1.0, hv: 230 } ];
  for (const L of layers) {
    for (let i = 0; i < L.n; i++) {
      const x = rnd() * size, y = rnd() * size, rot = rnd() * Math.PI * 2;
      const tr = rnd();
      const type = tr < 0.38 ? 0 : tr < 0.62 ? 1 : tr < 0.88 ? 2 : 3;
      const s = (type === 0 ? 7.5 : 6) * (0.8 + rnd() * 0.5) * (size / 1024);
      const warm = 0.9 + rnd() * 0.18;
      const r = Math.round(236 * L.shade * warm), g = Math.round(190 * L.shade * warm * (0.97 + rnd() * 0.05)), b = Math.round(92 * L.shade * warm * (0.85 + rnd() * 0.25));
      for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
        const px = x + ox, py = y + oy;
        if (px < -20 || py < -20 || px > size + 20 || py > size + 20) continue;
        a.save(); a.translate(px, py); a.rotate(rot);
        // contact shadow under the piece
        a.save(); a.translate(s * 0.18, s * 0.22); shapePath(a, type, s * 1.08); a.fillStyle = 'rgba(40,22,4,0.45)'; a.fill(); a.restore();
        shapePath(a, type, s);
        a.fillStyle = `rgb(${r},${g},${b})`; a.fill();
        const grd = a.createRadialGradient(-s * 0.3, -s * 0.35, 0, 0, 0, s * 1.1);
        grd.addColorStop(0, 'rgba(255,246,214,0.34)'); grd.addColorStop(0.55, 'rgba(255,240,200,0.06)'); grd.addColorStop(1, 'rgba(70,40,5,0.28)');
        a.fillStyle = grd; a.fill();
        a.restore();
        h.save(); h.translate(px, py); h.rotate(rot); shapePath(h, type, s);
        const hg = h.createRadialGradient(0, 0, 0, 0, 0, s);
        hg.addColorStop(0, `rgb(${L.hv},${L.hv},${L.hv})`); hg.addColorStop(1, `rgb(${L.hv * 0.55 | 0},${L.hv * 0.55 | 0},${L.hv * 0.55 | 0})`);
        h.fillStyle = hg; h.fill(); h.restore();
      }
    }
  }
  const albedo = new THREE.CanvasTexture(cA);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
  albedo.anisotropy = 8;
  const hd = h.getImageData(0, 0, size, size).data;
  const nd = new Uint8Array(size * size * 4);
  const H = (x, y) => hd[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  const k = 2.2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k;
    const l = Math.hypot(dx, dy, 1);
    const i = ((size - 1 - y) * size + x) * 4;
    // canvas rows run down, texture v runs up: store rows flipped and flip the y slope
    nd[i] = (-dx / l * 0.5 + 0.5) * 255; nd[i + 1] = (dy / l * 0.5 + 0.5) * 255; nd[i + 2] = (1 / l * 0.5 + 0.5) * 255; nd[i + 3] = 255;
  }
  const normal = new THREE.DataTexture(nd, size, size, THREE.RGBAFormat);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.minFilter = THREE.LinearMipmapLinearFilter; normal.magFilter = THREE.LinearFilter; normal.generateMipmaps = true;
  normal.anisotropy = 8; normal.flipY = false; normal.needsUpdate = true;
  return { albedo, normal };
}

// A bed of tangled cooked spaghetti: strands drawn as shaded tubes in layers, with a height-derived normal map.
function makeTangle(size, seed) {
  const rnd = mulberry32(seed);
  const cA = document.createElement('canvas'); cA.width = cA.height = size;
  const cH = document.createElement('canvas'); cH.width = cH.height = size;
  const a = cA.getContext('2d'), h = cH.getContext('2d');
  a.fillStyle = '#5c3d14'; a.fillRect(0, 0, size, size);
  h.fillStyle = '#000'; h.fillRect(0, 0, size, size);
  a.lineCap = h.lineCap = 'round'; a.lineJoin = h.lineJoin = 'round';
  const W = size / 1024 * 22;
  const strands = 230;
  for (let s = 0; s < strands; s++) {
    const layer = s / strands;
    // a lazy curve: random walk with smooth turning
    const pts = [];
    let x = rnd() * size, y = rnd() * size, ang = rnd() * Math.PI * 2, turn = 0;
    const len = size * (0.35 + rnd() * 0.75), step = 6;
    for (let d = 0; d < len; d += step) {
      turn += (rnd() - 0.5) * 0.05; turn *= 0.96;
      ang += turn;
      x += Math.cos(ang) * step; y += Math.sin(ang) * step;
      pts.push(x, y);
    }
    const warm = 0.92 + rnd() * 0.12;
    const base = [Math.round(232 * warm), Math.round(188 * warm), Math.round(104 * warm * (0.9 + rnd() * 0.15))];
    const hv = 40 + layer * 200;
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      // skip copies that can't touch the tile
      let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
      for (let i = 0; i < pts.length; i += 2) { minx = Math.min(minx, pts[i] + ox); maxx = Math.max(maxx, pts[i] + ox); miny = Math.min(miny, pts[i + 1] + oy); maxy = Math.max(maxy, pts[i + 1] + oy); }
      if (maxx < -W || minx > size + W || maxy < -W || miny > size + W) continue;
      const path = (ctx, dx = 0, dy = 0) => { ctx.beginPath(); ctx.moveTo(pts[0] + ox + dx, pts[1] + oy + dy); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] + ox + dx, pts[i + 1] + oy + dy); };
      // contact shadow on what's below
      a.strokeStyle = 'rgba(45,25,4,0.55)'; a.lineWidth = W * 1.35; path(a, W * 0.18, W * 0.24); a.stroke();
      // body, darker rim, lit center, specular streak
      a.strokeStyle = `rgb(${base[0] * 0.72 | 0},${base[1] * 0.68 | 0},${base[2] * 0.6 | 0})`; a.lineWidth = W; path(a); a.stroke();
      a.strokeStyle = `rgb(${base[0]},${base[1]},${base[2]})`; a.lineWidth = W * 0.72; path(a); a.stroke();
      a.strokeStyle = `rgba(255,236,190,0.55)`; a.lineWidth = W * 0.28; path(a, -W * 0.12, -W * 0.14); a.stroke();
      // height: rounded profile, later strands on top
      h.strokeStyle = `rgb(${hv * 0.55 | 0},${hv * 0.55 | 0},${hv * 0.55 | 0})`; h.lineWidth = W; path(h); h.stroke();
      h.strokeStyle = `rgb(${hv * 0.85 | 0},${hv * 0.85 | 0},${hv * 0.85 | 0})`; h.lineWidth = W * 0.6; path(h); h.stroke();
      h.strokeStyle = `rgb(${hv | 0},${hv | 0},${hv | 0})`; h.lineWidth = W * 0.25; path(h); h.stroke();
    }
  }
  const albedo = new THREE.CanvasTexture(cA);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping; albedo.anisotropy = 8;
  const hd = h.getImageData(0, 0, size, size).data;
  const nd = new Uint8Array(size * size * 4);
  const H = (x, y) => hd[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  const k = 2.6;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k;
    const l = Math.hypot(dx, dy, 1), i = ((size - 1 - y) * size + x) * 4;
    nd[i] = (-dx / l * 0.5 + 0.5) * 255; nd[i + 1] = (dy / l * 0.5 + 0.5) * 255; nd[i + 2] = (1 / l * 0.5 + 0.5) * 255; nd[i + 3] = 255;
  }
  const normal = new THREE.DataTexture(nd, size, size, THREE.RGBAFormat);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.minFilter = THREE.LinearMipmapLinearFilter; normal.magFilter = THREE.LinearFilter; normal.generateMipmaps = true;
  normal.anisotropy = 8; normal.needsUpdate = true;
  return { albedo, normal };
}

export function makeTextures(renderer) {
  const T = {};
  T.nPores = bakeToData(renderer, 512, normalBody('hPores', '0.0045'));
  T.nStriate = bakeToData(renderer, 512, normalBody('hStriate', '0.0042'));
  T.albedo = bakeToData(renderer, 512, ALBEDO_BODY);
  T.rough = bakeToData(renderer, 256, ROUGH_BODY);
  const p = makePastina(1024, 11);
  T.pastina = p.albedo; T.pastinaN = p.normal;
  const tg = makeTangle(1024, 23);
  T.tangle = tg.albedo; T.tangleN = tg.normal;
  const cache = new Map();
  // Same image, own repeat. Clones share the GPU upload.
  T.at = (name, repeat) => {
    const key = name + ':' + repeat;
    if (!cache.has(key)) { const t = T[name].clone(); t.repeat.set(repeat, repeat); t.needsUpdate = true; cache.set(key, t); }
    return cache.get(key);
  };
  return T;
}
