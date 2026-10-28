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

// The pasta textures are drawn on CPU canvases: on the GPU they would hold up the baked textures' shader compiles,
// which then run alongside the drawing instead of after it.
const CPU = { willReadFrequently: true };

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Draws a texture on the GPU from shader code and reads it back as data. Its shader starts compiling at once (in the
// background, where the browser can) and `ready` settles when it has; `finish()` then renders and reads it.
function prepareBake(renderer, size, body) {
  const rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false, type: THREE.UnsignedByteType });
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: GLSL_NOISE + body, uniforms: { uTexel: { value: 1 / size } }, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // compiled against the target it renders into, so the render below reuses this program
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  const ready = renderer.compileAsync(scene, cam);
  renderer.setRenderTarget(prev);
  const finish = () => {
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
  };
  return { ready, finish };
}

// A height map (the red channel of a canvas read back) to a normal map, wrapping at the edges. Canvas rows run down
// and texture v runs up, so the rows are stored flipped and the y slope flipped with them. Size is a power of two.
function heightToNormal(hd, size, k) {
  const nd = new Uint8Array(size * size * 4), m = size - 1, s = k / 255;
  for (let y = 0; y < size; y++) {
    const up = ((y + m) & m) * size, row = y * size, dn = ((y + 1) & m) * size, o = (m - y) * size * 4;
    for (let x = 0; x < size; x++) {
      const dx = (hd[(row + ((x + 1) & m)) * 4] - hd[(row + ((x + m) & m)) * 4]) * s, dy = (hd[(dn + x) * 4] - hd[(up + x) * 4]) * s;
      const il = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = o + x * 4;
      nd[i] = (-dx * il * 0.5 + 0.5) * 255; nd[i + 1] = (dy * il * 0.5 + 0.5) * 255; nd[i + 2] = (il * 0.5 + 0.5) * 255; nd[i + 3] = 255;
    }
  }
  return nd;
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
  const a = cA.getContext('2d', CPU), h = cH.getContext('2d', CPU);
  a.fillStyle = '#7a5520'; a.fillRect(0, 0, size, size);
  h.fillStyle = '#000'; h.fillRect(0, 0, size, size);
  a.imageSmoothingQuality = h.imageSmoothingQuality = 'high';
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
  // Every piece is stamped from a sprite drawn once per shape, layer and tint rather than built from a path and
  // gradients each time, which is several times faster. A sprite holds one piece of s = R, centred, with its shadow.
  const R = 24, O = 1.5 * R;
  const sprite = (paint) => { const c = document.createElement('canvas'); c.width = c.height = 3 * R; const x = c.getContext('2d'); x.translate(O, O); paint(x); return c; };
  const WARM = [0.93, 0.99, 1.05], BLUE = [0.89, 0.975, 1.06];
  for (const L of layers) {
    const col = [0, 1, 2, 3].map((type) => WARM.map((warm) => BLUE.map((bj) => sprite((x) => {
      const r = Math.round(236 * L.shade * warm), g = Math.round(190 * L.shade * warm * 0.995), b = Math.round(92 * L.shade * warm * bj);
      // contact shadow under the piece
      x.save(); x.translate(R * 0.18, R * 0.22); shapePath(x, type, R * 1.08); x.fillStyle = 'rgba(40,22,4,0.45)'; x.fill(); x.restore();
      shapePath(x, type, R);
      x.fillStyle = `rgb(${r},${g},${b})`; x.fill();
      const grd = x.createRadialGradient(-R * 0.3, -R * 0.35, 0, 0, 0, R * 1.1);
      grd.addColorStop(0, 'rgba(255,246,214,0.34)'); grd.addColorStop(0.55, 'rgba(255,240,200,0.06)'); grd.addColorStop(1, 'rgba(70,40,5,0.28)');
      x.fillStyle = grd; x.fill();
    }))));
    const hgt = [0, 1, 2, 3].map((type) => sprite((x) => {
      shapePath(x, type, R);
      const hg = x.createRadialGradient(0, 0, 0, 0, 0, R);
      hg.addColorStop(0, `rgb(${L.hv},${L.hv},${L.hv})`); hg.addColorStop(1, `rgb(${L.hv * 0.55 | 0},${L.hv * 0.55 | 0},${L.hv * 0.55 | 0})`);
      x.fillStyle = hg; x.fill();
    }));
    for (let i = 0; i < L.n; i++) {
      const x = rnd() * size, y = rnd() * size, rot = rnd() * Math.PI * 2;
      const tr = rnd();
      const type = tr < 0.38 ? 0 : tr < 0.62 ? 1 : tr < 0.88 ? 2 : 3;
      const s = (type === 0 ? 7.5 : 6) * (0.8 + rnd() * 0.5) * (size / 1024);
      const warm = 0.9 + rnd() * 0.18; rnd();   // this draw once set each piece's green; kept so every piece stays where it was
      const bj = 0.85 + rnd() * 0.25;
      const spr = col[type][warm < 0.96 ? 0 : warm < 1.02 ? 1 : 2][bj < 0.93 ? 0 : bj < 1.02 ? 1 : 2];
      const k = s / R, c = Math.cos(rot) * k, sn = Math.sin(rot) * k;
      for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
        const px = x + ox, py = y + oy;
        if (px < -20 || py < -20 || px > size + 20 || py > size + 20) continue;
        a.setTransform(c, sn, -sn, c, px, py); a.drawImage(spr, -O, -O);
        h.setTransform(c, sn, -sn, c, px, py); h.drawImage(hgt[type], -O, -O);
      }
    }
  }
  a.setTransform(1, 0, 0, 1, 0, 0); h.setTransform(1, 0, 0, 1, 0, 0);
  const albedo = new THREE.CanvasTexture(cA);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
  albedo.anisotropy = 8;
  const normal = new THREE.DataTexture(heightToNormal(h.getImageData(0, 0, size, size).data, size, 2.2), size, size, THREE.RGBAFormat);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.minFilter = THREE.LinearMipmapLinearFilter; normal.magFilter = THREE.LinearFilter; normal.generateMipmaps = true;
  normal.anisotropy = 8; normal.flipY = false; normal.needsUpdate = true;
  return { albedo, normal };
}

// Snow of orzo: rice-shaped pasta piled deep, pale and dry, with a height-derived normal map.
function makeOrzo(size, seed) {
  const rnd = mulberry32(seed);
  const cA = document.createElement('canvas'); cA.width = cA.height = size;
  const cH = document.createElement('canvas'); cH.width = cH.height = size;
  const a = cA.getContext('2d', CPU), h = cH.getContext('2d', CPU);
  a.fillStyle = '#b9ae98'; a.fillRect(0, 0, size, size);
  h.fillStyle = '#000'; h.fillRect(0, 0, size, size);
  a.imageSmoothingQuality = h.imageSmoothingQuality = 'high';
  // a grain of orzo: a fat lens, pointed at both ends
  const grain = (ctx, s) => { ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.62, s, 0); ctx.quadraticCurveTo(0, s * 0.62, -s, 0); ctx.closePath(); };
  const k2 = (size / 1024) ** 2;   // a smaller piece keeps the same grain size and density
  const layers = [ { n: Math.round(5200 * k2), shade: 0.7, hv: 80 }, { n: Math.round(4800 * k2), shade: 0.86, hv: 160 }, { n: Math.round(3600 * k2), shade: 1.0, hv: 235 } ];
  // Every grain is stamped from a sprite drawn once per layer (three tints for the colour) rather than built from a path
  // and gradients each time, which is several times faster. A sprite holds one grain of s = R, with room for its shadow.
  const R = 24, OX = 1.25 * R, OY = 0.6 * R;
  const sprite = (paint) => { const c = document.createElement('canvas'); c.width = Math.ceil(2.6 * R); c.height = Math.ceil(1.4 * R); const x = c.getContext('2d'); x.translate(OX, OY); paint(x); return c; };
  const TINTS = [0.96, 0.99, 1.02];
  const colorSprite = (shade, w) => sprite((x) => {
    const r = Math.round(250 * shade * w), g = Math.round(243 * shade * w), b = Math.round(222 * shade * w * 0.99);
    x.save(); x.translate(R * 0.14, R * 0.2); grain(x, R * 1.06); x.fillStyle = 'rgba(70,60,48,0.32)'; x.fill(); x.restore();
    grain(x, R); x.fillStyle = `rgb(${r},${g},${b})`; x.fill();
    const grd = x.createLinearGradient(0, -R * 0.5, 0, R * 0.5);
    grd.addColorStop(0, 'rgba(255,255,250,0.38)'); grd.addColorStop(1, 'rgba(90,80,60,0.22)');
    x.fillStyle = grd; x.fill();
  });
  const heightSprite = (hv) => sprite((x) => {
    grain(x, R);
    const lo = hv * 0.6 | 0, hg = x.createLinearGradient(0, -R * 0.5, 0, R * 0.5);
    hg.addColorStop(0, `rgb(${lo},${lo},${lo})`); hg.addColorStop(0.5, `rgb(${hv},${hv},${hv})`); hg.addColorStop(1, `rgb(${lo},${lo},${lo})`);
    x.fillStyle = hg; x.fill();
  });
  for (const L of layers) {
    const cs = TINTS.map((w) => colorSprite(L.shade, w)), hs = heightSprite(L.hv);
    for (let i = 0; i < L.n; i++) {
      const x = rnd() * size, y = rnd() * size, rot = rnd() * Math.PI * 2;
      const s = 7.2 * (0.78 + rnd() * 0.45);
      const w = 0.95 + rnd() * 0.08; rnd();   // this draw once set each grain's blue; kept so every grain stays where it was
      const spr = cs[w < 0.975 ? 0 : w < 1.005 ? 1 : 2], k = s / R, c = Math.cos(rot) * k, sn = Math.sin(rot) * k;
      for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
        const px = x + ox, py = y + oy;
        if (px < -20 || py < -20 || px > size + 20 || py > size + 20) continue;
        a.setTransform(c, sn, -sn, c, px, py); a.drawImage(spr, -OX, -OY);
        h.setTransform(c, sn, -sn, c, px, py); h.drawImage(hs, -OX, -OY);
      }
    }
  }
  a.setTransform(1, 0, 0, 1, 0, 0); h.setTransform(1, 0, 0, 1, 0, 0);
  const albedo = new THREE.CanvasTexture(cA);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
  albedo.anisotropy = 8;
  const normal = new THREE.DataTexture(heightToNormal(h.getImageData(0, 0, size, size).data, size, 2.0), size, size, THREE.RGBAFormat);
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
  const a = cA.getContext('2d', CPU), h = cH.getContext('2d', CPU);
  a.fillStyle = '#5c3d14'; a.fillRect(0, 0, size, size);
  h.fillStyle = '#000'; h.fillRect(0, 0, size, size);
  a.lineCap = h.lineCap = 'round'; a.lineJoin = h.lineJoin = 'round';
  const W = size / 1024 * 22;
  const strands = 230;
  // each strand's path is built once and stroked seven times; the offset strokes move the context, not the points
  const stroke = (ctx, path, style, width, dx = 0, dy = 0) => {
    ctx.strokeStyle = style; ctx.lineWidth = width;
    if (dx || dy) { ctx.translate(dx, dy); ctx.stroke(path); ctx.translate(-dx, -dy); } else ctx.stroke(path);
  };
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
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (let i = 0; i < pts.length; i += 2) { minx = Math.min(minx, pts[i]); maxx = Math.max(maxx, pts[i]); miny = Math.min(miny, pts[i + 1]); maxy = Math.max(maxy, pts[i + 1]); }
    const path = new Path2D(); path.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i], pts[i + 1]);
    const rim = `rgb(${base[0] * 0.72 | 0},${base[1] * 0.68 | 0},${base[2] * 0.6 | 0})`, body = `rgb(${base[0]},${base[1]},${base[2]})`;
    const grey = (f) => { const v = hv * f | 0; return `rgb(${v},${v},${v})`; };
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      // skip copies that can't touch the tile
      if (maxx + ox < -W || minx + ox > size + W || maxy + oy < -W || miny + oy > size + W) continue;
      a.setTransform(1, 0, 0, 1, ox, oy); h.setTransform(1, 0, 0, 1, ox, oy);
      // contact shadow on what's below; then body, darker rim, lit center, specular streak
      stroke(a, path, 'rgba(45,25,4,0.55)', W * 1.35, W * 0.18, W * 0.24);
      stroke(a, path, rim, W); stroke(a, path, body, W * 0.72);
      stroke(a, path, 'rgba(255,236,190,0.55)', W * 0.28, -W * 0.12, -W * 0.14);
      // height: rounded profile, later strands on top
      stroke(h, path, grey(0.55), W); stroke(h, path, grey(0.85), W * 0.6); stroke(h, path, grey(1), W * 0.25);
    }
  }
  a.setTransform(1, 0, 0, 1, 0, 0); h.setTransform(1, 0, 0, 1, 0, 0);
  const albedo = new THREE.CanvasTexture(cA);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping; albedo.anisotropy = 8;
  const normal = new THREE.DataTexture(heightToNormal(h.getImageData(0, 0, size, size).data, size, 2.6), size, size, THREE.RGBAFormat);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.minFilter = THREE.LinearMipmapLinearFilter; normal.magFilter = THREE.LinearFilter; normal.generateMipmaps = true;
  normal.anisotropy = 8; normal.needsUpdate = true;
  return { albedo, normal };
}

export async function makeTextures(renderer) {
  const T = {};
  // The GPU-drawn textures' shaders compile while the pasta below is drawn on canvases; then each is rendered.
  const bakes = {
    nPores: prepareBake(renderer, 512, normalBody('hPores', '0.0045')),
    nStriate: prepareBake(renderer, 512, normalBody('hStriate', '0.0042')),
    albedo: prepareBake(renderer, 512, ALBEDO_BODY),
    rough: prepareBake(renderer, 256, ROUGH_BODY),
  };
  await new Promise((r) => setTimeout(r, 0));   // one turn, so the browser sends those compiles to the GPU now
  const p = makePastina(1024, 11);
  T.pastina = p.albedo; T.pastinaN = p.normal;
  const tg = makeTangle(1024, 23);
  T.tangle = tg.albedo; T.tangleN = tg.normal;
  // The mountain's snow is drawn the first time something asks for it (the mountain's build, on black),
  // not at boot. The island's patch of it gets a quarter-size piece now, at the same grain size.
  let oz = null;
  const orzo = () => oz || (oz = makeOrzo(1024, 29));
  Object.defineProperty(T, 'orzo', { get: () => orzo().albedo });
  Object.defineProperty(T, 'orzoN', { get: () => orzo().normal });
  const ozs = makeOrzo(512, 31);
  T.orzoSmall = ozs.albedo; T.orzoSmallN = ozs.normal;
  await Promise.all(Object.values(bakes).map((b) => b.ready));
  for (const [name, b] of Object.entries(bakes)) T[name] = b.finish();
  const cache = new Map();
  // Same image, own repeat. Clones share the GPU upload.
  T.at = (name, repeat) => {
    const key = name + ':' + repeat;
    if (!cache.has(key)) { const t = T[name].clone(); t.repeat.set(repeat, repeat); t.needsUpdate = true; cache.set(key, t); }
    return cache.get(key);
  };
  return T;
}
