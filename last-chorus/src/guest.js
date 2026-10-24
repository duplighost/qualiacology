// Make It A No. His place, with a guest in it who never checks out. The street at night with every
// window lit, then in at the front door: the moving boxes, the couch with the guest's blanket, the
// plate, every lamp left on, the clock at 3:12, the suitcase, the copies of keys hung in the doorway;
// the answer in pencil; the kitchen candle that won't go out. Out on the street for the choruses, the
// doors standing open and the punch clock; back inside for the door shut for good and the quiet
// afterwards, until the walls come down on "I'm free". Then a field at sunrise: the typewriter that
// lets the sentence close, the couch empty, the lamps on, and the door that's just a door now.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local, col } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room, paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const lathe = (pts, n = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function signFace(w, h, x = 0, y = 0, z = 0) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(x, y, z); return g; }
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.7, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide }));
const LAMP = [1, 0.78, 0.5], CANDLE = [1, 0.72, 0.38], WHITE = rgb(0xf2eee6), WOOD = rgb(0x6a4428), BRASS = rgb(0xc8a050);

// ---------- the pictures ----------
// the alarm clock: 3:12 in red segments
const SEG = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
function clockTexture() {
  return canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#08080a'; g.fillRect(0, 0, W, H);
    const digit = (x, d) => {
      const y = 46, w = 92, h = 164, t = 15, hh = h / 2;
      const S = { a: [x + t, y, w - 2 * t, t], b: [x + w - t, y + t, t, hh - 1.5 * t], c: [x + w - t, y + hh + 0.5 * t, t, hh - 1.5 * t], d: [x + t, y + h - t, w - 2 * t, t], e: [x, y + hh + 0.5 * t, t, hh - 1.5 * t], f: [x, y + t, t, hh - 1.5 * t], g: [x + t, y + hh - t / 2, w - 2 * t, t] };
      for (const k in S) { const on = SEG[d].includes(k); g.fillStyle = on ? '#ff2a18' : '#22090a'; g.shadowColor = '#ff2a18'; g.shadowBlur = on ? 18 : 0; g.fillRect(...S[k]); }
    };
    digit(58, 3); g.fillStyle = '#ff2a18'; g.shadowBlur = 18; g.fillRect(186, 94, 16, 16); g.fillRect(186, 150, 16, 16); digit(226, 1); digit(352, 2);
  });
}
// the answer: a ruled sheet with pencil on it, half rubbed out
function pencilTexture() {
  return canvasTex(512, 680, (g, W, H) => {
    g.fillStyle = '#f4efe2'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(90,130,200,0.45)'; g.lineWidth = 2; for (let y = 90; y < H - 20; y += 38) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = 'rgba(210,60,60,0.5)'; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, H); g.stroke();
    const R = seeded(31);
    for (let row = 0; row < 7; row++) {
      const y = 82 + row * 38, faint = row > 3 ? 0.18 : 0.55;
      g.strokeStyle = `rgba(70,70,76,${faint})`; g.lineWidth = 3.2; g.beginPath();
      let x = 80 + R() * 20; g.moveTo(x, y);
      const end = row === 6 ? 220 : 420 + R() * 60;
      while (x < end) { const s = 8 + R() * 10; g.bezierCurveTo(x + s * 0.3, y - 18 - R() * 8, x + s * 0.7, y + 4, x + s, y - 2 - R() * 6); x += s; if (R() < 0.12) { x += 14; g.moveTo(x, y); } }
      g.stroke();
    }
    g.fillStyle = 'rgba(240,236,226,0.75)'; g.fillRect(70, 190, 300, 70);
  });
}
// the punch clock's dial
function dialTexture() {
  return canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#2a2a2e'; g.fillRect(0, 0, W, H); g.fillStyle = '#f4f0e6'; g.beginPath(); g.arc(W / 2, H / 2, 112, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1a1e'; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.save(); g.translate(W / 2 + Math.sin(a) * 96, H / 2 - Math.cos(a) * 96); g.rotate(a); g.fillRect(-3, -10, 6, k % 3 ? 14 : 22); g.restore(); }
    g.strokeStyle = '#1a1a1e'; g.lineCap = 'round'; g.lineWidth = 10; g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(W / 2 - 52, H / 2 + 6); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(W / 2 + 4, H / 2 - 88); g.stroke();
  });
}
// the typewriter's page: lines typed, the last one short
function pageTexture() {
  return canvasTex(400, 512, (g, W, H) => {
    g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, W, H);
    const R = seeded(44); g.fillStyle = '#26262c';
    for (let row = 0; row < 12; row++) { const y = 60 + row * 34; let x = 44; const end = row === 11 ? 150 : 330 + R() * 30; while (x < end) { const w = 18 + R() * 46; g.fillRect(x, y, Math.min(w, end - x), 11); x += w + 12; } }
    g.beginPath(); g.arc(160, 433, 6, 0, Math.PI * 2); g.fill();
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { clock: clockTexture(), pencil: pencilTexture(), dial: dialTexture(), page: pageTexture() });

// a candle's flame: a billboard that holds its own shape, never adds up to white
function flameMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aK; attribute float aSeed; varying vec2 vUv; varying float vK; varying float vSeed; void main(){ vUv = uv; vK = aK; vSeed = aSeed; vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz); c.xy += position.xy * vec2(sx, sy); gl_Position = projectionMatrix * c; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec2 vUv; varying float vK; varying float vSeed;
      void main(){
        vec2 q = vUv; float t = uTime * 7.0 + vSeed * 10.0;
        float sway = sin(t) * 0.04 + sin(t * 2.3) * 0.02;
        float w = 0.32 * (1.0 - q.y) * smoothstep(0.0, 0.25, q.y) + 0.02;
        float shape = smoothstep(w, w * 0.4, abs(q.x - 0.5 - sway * q.y * 2.0)) * smoothstep(1.0, 0.7, q.y);
        vec3 c = mix(vec3(1.0, 0.98, 0.8), vec3(1.0, 0.62, 0.18), smoothstep(0.15, 0.75, q.y));
        c = mix(vec3(0.35, 0.45, 1.0), c, smoothstep(0.02, 0.14, q.y));
        gl_FragColor = vec4(c * 1.4, clamp(shape * vK * 1.4, 0.0, 1.0));
      }`,
    depthWrite: false, transparent: true,
  });
}

// ---------- his things, at the scale they take up ----------
const MN = {
  // three boxes and a fourth on top, taped, a label on each
  boxes() {
    const parts = [], cb = rgb(0x9a6e44), tape = rgb(0xc8a878), lab = WHITE;
    for (const [w, h, d, x, y, z, r] of [[13, 10, 11, -6.5, 5, 0, 0.05], [12, 9, 10, 6.8, 4.5, 0.6, -0.08], [11, 9, 10, -4.6, 14.5, 0.4, 0.14], [10, 8, 9, 2, 23, -0.3, -0.1]]) {
      const add = (g) => { g.rotateY(r); g.translate(x, y, z); return g; };
      parts.push(paint(add(box(w, h, d, 0, 0, 0)), cb));
      parts.push(paint(add(box(w + 0.06, 0.12, 2.4, 0, h / 2 + 0.04, 0)), tape));
      parts.push(paint(add(box(2.4, h + 0.06, 0.12, 0, 0, d / 2 + 0.04)), tape));
      parts.push(paint(add(box(3.4, 2.2, 0.1, w * 0.25, h * 0.15, d / 2 + 0.06)), lab));
    }
    return merge(parts);
  },
  // the couch: a frame, three cushions each way, arms, short legs
  couch() {
    const c = rgb(0xd8a848), d = rgb(0xb08030), parts = [paint(box(34, 4.6, 13, 0, 4.3, 0), d), paint(box(34, 10, 3.6, 0, 12.2, -4.7), d)];
    for (const x of [-10.4, 0, 10.4]) { parts.push(paint(box(10.2, 2.8, 11, x, 8, 0.8), c)); parts.push(paint(box(10.2, 8, 2.6, x, 12.8, -2.4), c)); }
    for (const s of [-1, 1]) { parts.push(paint(box(3.4, 9, 13.4, s * 17.6, 6.5, 0), d)); parts.push(paint(new THREE.CylinderGeometry(1.7, 1.7, 13.4, 14).rotateX(Math.PI / 2).translate(s * 17.6, 11, 0), d)); }
    for (const [x, z] of [[-16, -5], [16, -5], [-16, 5], [16, 5]]) parts.push(paint(box(1.2, 2, 1.2, x, 1, z), WOOD));
    return merge(parts);
  },
  // the guest's blanket and pillow: patchwork over the seat and down the front
  blanket() {
    const parts = [], cols = [0xd8a050, 0xb85a48, 0x6a8a58, 0xe8d8b8, 0x8a5a7a]; let k = 0;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) parts.push(paint(box(4, 0.5, 4, -2 + i * 4, 9.7, -3 + j * 4), rgb(cols[k++ % cols.length])));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) parts.push(paint(box(4, 4, 0.5, -2 + i * 4, 7.4 - j * 4, 6.6), rgb(cols[k++ % cols.length])));
    parts.push(paint(sph(3.8, 1, 0.5, 0.75, -11.5, 11.2, -0.6), rgb(0xf0ece2)));
    return merge(parts);
  },
  // a side table with his plate on it, the fork and knife, a napkin
  plate() {
    const parts = [paint(cyl(4, 4.6, 0.8, 24, 0, 0.4, 0), WOOD), paint(cyl(1, 1.4, 6, 12, 0, 3.4, 0), WOOD), paint(cyl(10.5, 10.5, 0.9, 40, 0, 6.6, 0), WOOD)];
    const up = (g) => g.rotateX(Math.PI / 2 - 0.25).translate(0, 15.4, -1);
    parts.push(paint(up(lathe([[0, 0], [6.2, 0], [6.9, 0.45], [7.6, 1.0], [7.6, 1.1], [0, 0.45]], 40)), WHITE));
    parts.push(paint(up(new THREE.TorusGeometry(7.25, 0.22, 6, 56).rotateX(Math.PI / 2).translate(0, 1.0, 0)), rgb(0x3a5aa8)));
    const R = seeded(5); for (let k = 0; k < 9; k++) parts.push(paint(up(sph(0.35 + R() * 0.3, 1, 0.6, 1, (R() - 0.5) * 7, 0.6, (R() - 0.5) * 7, 6, 4)), rgb(0xc89a5a)));
    parts.push(paint(box(5.6, 1, 2.6, 0, 7.5, -2.6), WOOD));
    for (const s of [-1, 1]) { parts.push(paint(box(0.8, 12, 0.3, s * 9.6, 13.2, 0), rgb(0xc8ccd4))); }
    for (const x of [-9.95, -9.25]) parts.push(paint(box(0.18, 3.4, 0.3, x, 20.6, 0), rgb(0xc8ccd4)));
    parts.push(paint(box(1.3, 3.6, 0.32, 9.6, 20.6, 0), rgb(0xc8ccd4)));
    return merge(parts);
  },
  // a floor lamp: the base and pole (the shade is its own, lit)
  lampPole() { return merge([paint(cyl(2.6, 3, 0.6, 24, 0, 0.3, 0), rgb(0x2a2420)), paint(cyl(0.32, 0.32, 21, 8, 0, 11, 0), BRASS), paint(cyl(0.6, 0.6, 1, 10, 0, 20.4, 0), BRASS)]); },
  lampShade() { const g = new THREE.CylinderGeometry(2.8, 4.8, 5.4, 28, 1, true); g.translate(0, 23, 0); return paint(g, rgb(0xf4e2c0)); },
  // the nightstand and the alarm clock on it
  clock() { return merge([paint(box(13, 11, 11, 0, 5.5, 0), WOOD), paint(box(11, 4, 0.3, 0, 7.4, 5.6), rgb(0x7a5434)), paint(sph(0.5, 1, 1, 1, 0, 7.4, 5.9, 8, 6), BRASS), paint(box(13, 7, 6.5, 0, 0, 0).rotateX(-0.12).translate(0, 14.6, 0), rgb(0x1a1a1e))]); },
  clockFace() { const g = new THREE.PlaneGeometry(11, 5.4); g.rotateX(-0.12); g.translate(0, 14.8, 3.35); return g; },
  // the suitcase, open, clothes in it; the lid stands up behind
  suitcase() {
    const parts = [paint(box(20, 4.4, 13, 0, 2.2, 0), rgb(0x8a2a2a))];
    const cl = [0xe8e0d0, 0x4a6a9a, 0xd8a050, 0x2a2a30, 0xc86a8a];
    for (let k = 0; k < 6; k++) parts.push(paint(box(7.4, 1.4, 4.8, -5.2 + (k % 3) * 5.2, 4.7 + Math.floor(k / 3) * 0.4, -2.8 + Math.floor(k / 3) * 5.4), rgb(cl[k % cl.length])));
    const lid = box(20, 1.4, 13, 0, 0.7, 6.5); lid.rotateX(-1.86); lid.translate(0, 4.4, -6.5); parts.push(paint(lid, rgb(0x8a2a2a)));
    const strap = box(0.6, 0.2, 9, 0, 1.5, 6.5); strap.rotateX(-1.86); strap.translate(-6, 4.4, -6.5); parts.push(paint(strap, rgb(0xd8c8a0)));
    const strap2 = strap.clone(); strap2.translate(12, 0, 0); parts.push(paint(strap2, rgb(0xd8c8a0)));
    parts.push(paint(box(6, 1.2, 1, 0, 2.8, 7), rgb(0x2a1a14)));
    return merge(parts);
  },
  // a key, hung from its bow
  key() { const bow = new THREE.TorusGeometry(0.85, 0.3, 8, 18); bow.translate(0, -0.9, 0); return merge([paint(bow, BRASS), paint(box(0.38, 3.4, 0.16, 0, -3.5, 0), BRASS), paint(box(0.55, 0.38, 0.16, 0.42, -4.4, 0), BRASS), paint(box(0.42, 0.32, 0.16, 0.35, -4.95, 0), BRASS), paint(box(0.62, 0.36, 0.16, 0.45, -3.8, 0), BRASS)]); },
  string() { return paint(box(0.07, 1, 0.07, 0, -0.5, 0), rgb(0x2a2420)); },
  // the pencil, its tip on the page
  pencil() {
    const parts = [paint(cyl(1.5, 1.5, 26, 6, 0, 17, 0), rgb(0xf2c230)), paint(cyl(1.5, 0.12, 4, 6, 0, 2, 0), rgb(0xe8c89a)), paint(cyl(0.45, 0.06, 1.2, 6, 0, 0.6, 0), rgb(0x3a3a40)), paint(cyl(1.58, 1.58, 2.6, 12, 0, 31.3, 0), rgb(0xb8bcc4)), paint(cyl(1.52, 1.52, 3, 12, 0, 34.1, 0), rgb(0xe88a9a))];
    for (const p of parts) { p.rotateZ(-0.6); p.rotateX(0.38); p.translate(-3, 7, 0.8); }
    return merge(parts);
  },
  page() { const g = new THREE.PlaneGeometry(18, 24); g.translate(-2, 16, 0.25); return g; },
  // the kitchen table and the candle on it (the flame is its own)
  candle() {
    const parts = [paint(box(28, 1, 15, 0, 6, 0), WOOD), ...[[-12.6, -6], [12.6, -6], [-12.6, 6], [12.6, 6]].map(([x, z]) => paint(box(1.2, 5.6, 1.2, x, 2.8, z), WOOD))];
    parts.push(paint(box(24, 0.12, 4, 0, 6.56, 0), rgb(0xd8c8a8)));
    parts.push(paint(cyl(2.4, 2.8, 0.6, 24, 0, 6.8, 0), BRASS), paint(cyl(1, 1.3, 1.2, 14, 0, 7.6, 0), BRASS), paint(cyl(1.15, 1.15, 9, 18, 0, 12.6, 0), rgb(0xf4ecd8)), paint(box(0.12, 0.7, 0.12, 0, 17.4, 0), rgb(0x1a1a1a)));
    return merge(parts);
  },
  snuffer() { const cone = lathe([[0.1, 2.6], [1.7, 0], [1.75, 0.05], [0.15, 2.7]], 20); return merge([paint(cone, BRASS), paint(cyl(0.18, 0.18, 14, 6, 0, 0, 0).rotateZ(-0.9).translate(5.6, 6.6, 0), BRASS)]); },
  // a door in its frame (the panel is its own, hinged)
  frame() { return merge([paint(box(1.4, 21.4, 1.8, -5.5, 10.7, 0), WHITE), paint(box(1.4, 21.4, 1.8, 5.5, 10.7, 0), WHITE), paint(box(12.4, 1.6, 1.8, 0, 22.2, 0), WHITE), paint(box(12.4, 0.4, 2.4, 0, 0.2, 0), rgb(0x8a8a88))]); },
  door() {
    const parts = [paint(box(9.6, 20.6, 0.7, 4.8, 10.3, 0), rgb(0x8a3a2a))];
    for (const [y, h] of [[4.6, 7], [14.4, 9]]) for (const x of [2.5, 7.1]) parts.push(paint(box(3.4, h, 0.2, x, y, 0.42), rgb(0x7a3222)));
    parts.push(paint(sph(0.5, 1, 1, 1, 8.6, 10, 0.8, 10, 8), BRASS));
    return merge(parts);
  },
  doorLight() { const g = new THREE.PlaneGeometry(9.6, 20.6); g.translate(0, 10.3, -0.5); return g; },
  // the punch clock on its post, the rack of cards beside it
  punch() { return merge([paint(box(2, 13, 2, 0, 6.5, 0), rgb(0x3a3a40)), paint(box(11, 15, 5.4, 0, 20, 0), rgb(0xb8b0a0)), paint(box(4.6, 0.7, 1, 0, 16, 2.75), rgb(0x1a1a1e)), paint(box(7, 16, 1.6, 10, 19, -1.2), rgb(0x8a8478)), paint(box(11.4, 1, 5.8, 0, 27.9, 0), rgb(0x8a8478))]); },
  dial() { const g = new THREE.PlaneGeometry(7.2, 7.2); g.translate(0, 22.6, 2.72); return g; },
  card() { return paint(box(1.6, 5.2, 0.12, 0, 2.6, 0), rgb(0xf0ead8)); },
  // the typewriter, the page standing out of the platen
  typewriter() {
    const parts = [paint(box(28, 5, 20, 0, 2.5, 0), rgb(0x2a3a34)), paint(box(26, 2, 11, 0, 0, 0).rotateX(0.22).translate(0, 5.4, 4), rgb(0x22302a)), paint(cyl(1.7, 1.7, 30, 18, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 8.4, -6.4), rgb(0x1a1a1c)), paint(box(30, 2.6, 4, 0, 6.6, -6.4), rgb(0x2a3a34))];
    for (const s of [-1, 1]) parts.push(paint(cyl(1.2, 1.2, 1.6, 14, 0, 0, 0).rotateZ(Math.PI / 2).translate(s * 15.6, 8.4, -6.4), rgb(0x1a1a1c)));
    parts.push(paint(box(0.5, 0.5, 6, 0, 0, 0).rotateY(0.5).translate(-16.8, 10, -4), rgb(0xb8bcc4)));
    for (let r = 0; r < 4; r++) for (let k = 0; k < 11 - (r === 3 ? 4 : 0); k++) parts.push(paint(cyl(0.85, 0.85, 0.7, 12, -10 + k * 2 + r * 0.6 + (r === 3 ? 4 : 0), 6.4 + r * 0.55, 8.4 - r * 2.1), rgb(0xe8e2d4)));
    for (const p of parts) p.translate(0, 6.5, 0);
    parts.push(paint(box(36, 1, 26, 0, 6, 0), WOOD), ...[[-16.5, -11.5], [16.5, -11.5], [-16.5, 11.5], [16.5, 11.5]].map(([x, z]) => paint(box(1.4, 5.6, 1.4, x, 2.8, z), WOOD)));
    return merge(parts);
  },
  typePage() { const g = new THREE.PlaneGeometry(15, 19); g.rotateX(-0.14); g.translate(0, 24.1, -7.4); return g; },
  // the board his lines are stitched on: a framed sampler, hung on two strings
  signBoard() { return merge([paint(box(25.8, 10.2, 1.2, 0, 0, -1.1), rgb(0x5a3a22)), paint(box(24.6, 9, 0.4, 0, 0, -0.5), rgb(0xefe6d2)), ...[-9, 9].map((x) => paint(box(0.12, 40, 0.12, x, 25.1, -1.1), rgb(0x3a302a))), ...[-7, 7].map((x) => paint(box(2.8, 0.6, 1.4, x, 5.6, 0.2), BRASS))]); },
};

extend({
  layers: {
    mnBoxes: (M) => [MN.boxes(), VCm(M, 'mnBoxesM', 0.25, { roughness: 0.85 }), 2, {}],
    mnCouch: (M) => [MN.couch(), VCm(M, 'mnCouchM', 0.2, { roughness: 0.9 }), 3, {}],
    mnBlanket: (M) => [MN.blanket(), VCm(M, 'mnBlanketM', 0.25, { roughness: 0.9 }), 2, {}],
    mnPlate: (M) => [MN.plate(), VCm(M, 'mnPlateM', 0.3, { roughness: 0.35 }), 2, {}],
    mnLampPole: (M) => [MN.lampPole(), VCm(M, 'mnLampPoleM', 0.2, { roughness: 0.4, metalness: 0.5 }), 90, {}],
    mnLampShade: (M) => [MN.lampShade(), M.mnLampShadeM || (M.mnLampShadeM = selfLit({ roughness: 0.8, side: THREE.DoubleSide }, 1.3)), 90, {}],
    mnClock: (M) => [MN.clock(), VCm(M, 'mnClockM', 0.2, { roughness: 0.6 }), 2, {}],
    mnClockFace: (M) => [MN.clockFace(), M.mnClockFaceM || (M.mnClockFaceM = new THREE.MeshBasicMaterial({ map: tex().clock, color: new THREE.Color(1.3, 1.3, 1.3) })), 2, {}],
    mnSuitcase: (M) => [MN.suitcase(), VCm(M, 'mnSuitcaseM', 0.25, { roughness: 0.7 }), 2, {}],
    mnKey: (M) => [MN.key(), VCm(M, 'mnKeyM', 0.5, { roughness: 0.25, metalness: 0.8 }), 90, {}],
    mnString: (M) => [MN.string(), VCm(M, 'mnStringM', 0.1, { roughness: 0.9 }), 90, {}],
    mnPencil: (M) => [MN.pencil(), VCm(M, 'mnPencilM', 0.3, { roughness: 0.5 }), 2, {}],
    mnPage: (M) => [MN.page(), pic(M, 'mnPageM', tex().pencil, 0.55), 2, {}],
    mnCandle: (M) => [MN.candle(), VCm(M, 'mnCandleM', 0.25, { roughness: 0.6 }), 4, {}],
    mnFlame: (M) => [new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), M.mnFlameM || (M.mnFlameM = flameMaterial()), 12, { aK: 1, aSeed: 1 }],
    mnSnuffer: (M) => [MN.snuffer(), VCm(M, 'mnSnufferM', 0.3, { roughness: 0.3, metalness: 0.7 }), 2, {}],
    mnFrame: (M) => [MN.frame(), VCm(M, 'mnFrameM', 0.25, { roughness: 0.6 }), 40, {}],
    mnDoor: (M) => [MN.door(), VCm(M, 'mnDoorM', 0.2, { roughness: 0.5 }), 40, {}],
    mnDoorLight: (M) => [MN.doorLight(), M.mnDoorLightM || (M.mnDoorLightM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 0.95, 0.62), side: THREE.DoubleSide })), 40, {}],
    mnPunch: (M) => [MN.punch(), VCm(M, 'mnPunchM', 0.25, { roughness: 0.6 }), 2, {}],
    mnDial: (M) => [MN.dial(), pic(M, 'mnDialM', tex().dial, 0.7), 2, {}],
    mnCard: (M) => [MN.card(), VCm(M, 'mnCardM', 0.35, { roughness: 0.8 }), 20, {}],
    mnType: (M) => [MN.typewriter(), VCm(M, 'mnTypeM', 0.25, { roughness: 0.4, metalness: 0.3 }), 2, {}],
    mnTypePage: (M) => [MN.typePage(), pic(M, 'mnTypePageM', tex().page, 0.6), 2, {}],
    mnSignBoard: (M) => [MN.signBoard(), VCm(M, 'mnSignM', 0.3, { roughness: 0.7 }), 16, {}],
    mnSignFace: (M) => [signFace(23.4, 7.8, 0, 0, 0.05), M.sign, 16, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // the set-pieces, each where he sings it
    mnProp(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['mnBoxes', 'mnCouch', 'mnBlanket', 'mnPlate', 'mnClock', 'mnClockFace', 'mnSuitcase', 'mnPencil', 'mnPage', 'mnCandle', 'mnFlame', 'mnSnuffer', 'mnPunch', 'mnDial', 'mnCard', 'mnType', 'mnTypePage', 'mnFrame', 'mnDoor', 'mnDoorLight']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind;
      const at = S._mnv || (S._mnv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2, z = 6, x = 0) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.5, c = LAMP, r = 40) => poolAt(S, at.x, (it.h ?? 0) + 0.15, at.z, r * s, c, k2);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      if (k === 'boxes') { put('mnBoxes'); light(14, 30, LAMP, 0.25); spot(0.45); }
      else if (k === 'couch') { put('mnCouch'); if (it.blanket) put('mnBlanket'); light(12, 40, LAMP, 0.3); spot(0.55); }
      else if (k === 'plate') { put('mnPlate'); light(10, 30, LAMP, 0.3, 2); spot(0.5); }
      else if (k === 'clock') { put('mnClock'); put('mnClockFace'); light(14.8, 16, [1, 0.15, 0.08], 0.9, 4); spot(0.3, [1, 0.3, 0.2], 26); }
      else if (k === 'suitcase') { put('mnSuitcase'); light(8, 30, LAMP, 0.25); spot(0.45); }
      else if (k === 'pencil') { put('mnPage'); put('mnPencil'); light(16, 36, [1, 0.95, 0.85], 0.25, 3); spot(0.45); }
      else if (k === 'candle') {
        put('mnCandle');
        // somebody puts the snuffer on it, and it won't go out; it only minds your mouth
        const sn = it.snuff ?? 1e9, dn = smooth(sn - 0.5, sn, T) * (1 - smooth(sn + 0.6, sn + 1.3, T));
        const blow = it.blow !== undefined ? Math.exp(-Math.pow((T - it.blow) / 0.5, 2)) : 0;
        const fk = (1 - 0.82 * dn) * (1 - 0.4 * blow) * (it.out !== undefined ? 1 - smooth(it.out, it.out + 0.4, T) : 1);
        if (it.snuff !== undefined) put('mnSnuffer', 0, 17.6 + 10 * (1 - dn), 0);
        if (fk > 0.01) { const w = local(at, yaw, Math.sin(T * 9) * 0.06 * s - blow * 0.8 * s, 17.6 * s, 0, S._o); m.makeScale(2.2 * s * (1 + 0.15 * blow), 4.6 * s * fk, 1); m.setPosition(w.x, w.y, w.z); L.mnFlame.add(m, { aK: fk, aSeed: it.t }); }
        light(19.4, 22, CANDLE, 0.9 * fk, 0); light(18, 70, CANDLE, 0.22 * fk, 0); spot(0.5 * fk + 0.08, CANDLE, 44);
        if (it.out !== undefined && T > it.out) for (let j = 0; j < 6; j++) { const f = ((T - it.out) * 0.5 + j / 6) % 1; const w = local(at, yaw, Math.sin(T + j) * s, (18.5 + f * 9) * s, 0, S._o); glowAt(S, w.x, w.y, w.z, (1 + f * 2.4) * s, [0.8, 0.8, 0.85], 0.3 * (1 - f) * smooth(it.out, it.out + 0.5, T)); }
      }
      else if (k === 'punch') {
        put('mnPunch'); put('mnDial');
        for (let j = 0; j < 9; j++) put('mnCard', 7.6 + (j % 3) * 2.4, 12 + Math.floor(j / 3) * 5.2, -0.2);
        const pk = it.punch ?? 1e9, dn = smooth(pk - 0.35, pk, T);
        put('mnCard', 0, 16.4 + 5.6 * (1 - dn), 2.9);
        light(22, 26, [1, 0.95, 0.85], 0.3, 4); spot(0.45);
      }
      else if (k === 'typewriter') {
        put('mnType'); put('mnTypePage');
        const dg = it.ding ?? 1e9; if (T > dg - 0.05 && T < dg + 0.4) light(16.5, 8, [1, 0.95, 0.8], 1.5 * (1 - (T - dg) / 0.45), 0, 16.2);
        light(22, 40, [1, 0.95, 0.85], 0.25, 2); spot(0.5);
      }
      else if (k === 'door') {
        // a door in its frame: open with the light behind it, swung shut, or just a door
        put('mnFrame');
        const open = it.shut !== undefined ? (it.open ?? 1.5) * (1 - smooth(it.shut - 0.25, it.shut, T)) : (it.open ?? 0);
        const hinge = local(at, yaw, -4.8 * s, 0, 0, S._o);
        m.compose(hinge, quat('_mndq', -open), S._s.set(s, s, s)); L.mnDoor.add(m);
        const lit = (it.lit ?? 0) * (it.shut !== undefined ? 0.15 + 0.85 * clamp(open / (it.open ?? 1.5), 0, 1) : 1);
        if (lit > 0.01) { put('mnDoorLight'); light(10, 26, LAMP, 0.5 * lit, 1); poolAt(S, local(at, yaw, 0, 0, 9 * s, S._o).x, (it.h ?? 0) + 0.15, S._o.z, 34 * s, LAMP, 0.55 * lit); }
      }
    },
    // a floor lamp, left on
    mnLamp(S, it, p, q, yaw) {
      const L = S.layers; void L.mnLampPole; void L.mnLampShade;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      const at = S._mnl || (S._mnl = new THREE.Vector3()); at.set(p.x, it.h ?? 0, p.z);
      m.compose(at, q, S._s.set(s, s, s)); L.mnLampPole.add(m); L.mnLampShade.add(m);
      const on = it.on !== undefined ? smooth(it.on, it.on + 0.15, T) : 1;
      const w = local(at, yaw, 0, 21.8 * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 9 * s, LAMP, (0.4 + 0.9 * on) * (0.97 + 0.03 * Math.sin(T * 3 + it.seed * 9)));
      poolAt(S, at.x, at.y + 0.12, at.z, 26 * s, LAMP, 0.15 + 0.45 * on);
    },
    // the copies of keys, hung in a doorway on strings, swinging
    mnKeys(S, it, p, q, yaw) {
      const L = S.layers; void L.mnKey; void L.mnString;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, R = seeded(it.seed * 1000 | 0);
      const top = (it.h ?? 0) + (it.top ?? 26);
      for (let j = 0; j < (it.n ?? 40); j++) {
        const x = (R() - 0.5) * 2 * (it.hw ?? 11), z = (R() - 0.5) * 3, len = 3 + R() * (it.drop ?? 8), sw = Math.sin(T * (1.6 + R()) + j) * 0.25;
        const a = local(p, yaw, x, 0, z, S._o); a.y = top;
        S._e.set(sw, yaw + R() * 6.28, 0); const kq = (S._mnkq || (S._mnkq = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(a, kq, S._s.set(1, len, 1)); L.mnString.add(m);
        const b = S._mnkb || (S._mnkb = new THREE.Vector3()); b.set(0, -len, 0).applyQuaternion(kq).add(a);
        S._e.set(sw, yaw + T * (0.8 + R()) + j, 0); const kq2 = (S._mnkq2 || (S._mnkq2 = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(b, kq2, S._s.set(1.3, 1.3, 1.3)); L.mnKey.add(m);
        if (Math.sin(T * 5 + j * 1.7) > 0.93) glowAt(S, b.x, b.y - 2, b.z, 1.6, [1, 0.9, 0.6], 1.2);
      }
    },
    // his lines, stitched, hung over the road
    mnSign(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, Math.sin(T * 1.1 + it.t) * 0.02); const fq = (S._mnsq || (S._mnsq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.mnSignBoard.add(m); S.layers.mnSignFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      const w = S._o; for (const sd of [-1, 1]) { local(p, h + Math.PI, sd * 7 * s, 5.4 * s, 1.0 * s, w); glowAt(S, w.x, w.y, w.z, 3 * s, LAMP, 1.0); }
      glowAt(S, p.x, p.y, p.z, 30 * s, LAMP, 0.12);
    },
  },
  kits: {
    mnProps(S, z) { for (const c of z.at) { const it = { t: c.t, x: c.x, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), s: c.s ?? 1, y: c.y, kind: c.kind, blanket: c.blanket, snuff: c.snuff, blow: c.blow, out: c.out, punch: c.punch, ding: c.ding, shut: c.shut, open: c.open, lit: c.lit, h: 0, parts: 'mnProp', ahead: c.ahead ?? 40 }; S.items.push(c.floor ? onFloor(S, it) : it); } },
    // lamps standing along both sides, all on (on the floor indoors)
    mnLamps(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.9) for (const side of z.side ? [z.side] : [-1, 1]) { const it = { t: t + R() * 0.1, x: side * ((z.x ?? 24) + R() * (z.spread ?? 4)), rot: 0, s: (z.s ?? 1) * (0.9 + R() * 0.2), seed: R(), on: z.on, h: 0, parts: 'mnLamp', ahead: z.ahead ?? 40 }; S.items.push(z.floor ? onFloor(S, it) : it); } },
    mnKeys(S, z, R) { S.items.push(onFloor(S, { t: z.at, x: 0, rot: 0, seed: R(), n: z.n, hw: z.hw, top: z.top, drop: z.drop, h: 0, parts: 'mnKeys', ahead: 30 })); },
    // doors standing open along the street, the light on behind them
    mnDoors(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.7) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.15, x: side * ((z.x ?? 24) + R() * 3), rot: FACE(side) - side * 0.25, s: (z.s ?? 1.3) * (0.92 + R() * 0.16), kind: 'door', open: z.open ?? (0.9 + R() * 0.7), lit: z.lit ?? 1, h: 0, parts: 'mnProp', ahead: 40 }); },
    // his street: brick fronts with every window lit, lamps along the curb
    mnStreet(S, z, R) {
      const bricks = [0x8a5a4a, 0x9a6a58, 0x7a5a5a, 0xa87a62, 0x6a5a6a, 0x8a6a5a];
      for (const side of [-1, 1]) for (let t = z.from + R() * 0.2; t < z.to; t += 0.34 + R() * 0.1) {
        S.items.push({ t, x: side * ((z.x ?? 34) + R() * 4), rot: SIDE(side), s: 0.95 + R() * 0.15, sy: 0.5 + R() * 0.4, parts: 'block', tint: col(pick(R, bricks)), seed: R(), wake0: 1, keepLit: true, noShop: true });
        if (R() < 0.5) S.items.push({ t: t + R() * 0.2, x: side * (64 + R() * 70), rot: R() * 0.4, s: 0.9 + R() * 0.3, sy: 0.8 + R() * 1.3, parts: R() < 0.4 ? 'tower' : 'block', tint: col(pick(R, bricks)), seed: R(), wake0: 1, keepLit: true, noShop: true });
      }
      for (let t = z.from; t < z.to; t += 0.3) for (const side of [-1, 1]) S.items.push({ t, x: side * 17.5, rot: SIDE(side), parts: 'lamp', seed: R() });
    },
    // the field at sunrise: trees here and there
    mnField(S, z, R) {
      for (let t = z.from; t < z.to; t += 0.5 + R() * 0.4) for (const side of [-1, 1]) if (R() < 0.6) S.items.push({ t: t + R() * 0.3, x: side * (40 + R() * 90), s: 0.8 + R() * 0.7, parts: 'tree', tint: col(pick(R, [0x3a5a32, 0x2a4a2a, 0x4a6a3a])), pine: R() < 0.3, seed: R() });
    },
  },
});

// ---------- his place ----------
const ringFlat = (W = 34, H = 30) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const HOME = {
  rings: { flat: ringFlat },
  ringOf: () => 'flat',
  styles: { living: 0, hall: 1, kitchen: 2 },
  dims: { living: [34, 30], hall: [28, 28], kitchen: [32, 34] },
  lights: (id) => ({ 0: [18, 9], 1: [12, 6], 2: [14, 7] }[id] || null),
};
function homeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyLo: { value: new THREE.Color(0x1a1a34) }, uSkyHi: { value: new THREE.Color(0x05060f) }, uNight: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uNight; uniform vec3 uFog, uCam, uLight, uSkyLo, uSkyHi;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      float box2(vec2 p, vec2 a, vec2 b){ return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float wa = part == 6 ? x : (side > 0.0 ? along + 7.0 : along);
        vec3 glow = vec3(0.0); vec3 col;
        if (part == 7) {
          // the building from the street: brick, every window lit, a cornice
          vec2 br = vec2(x / 1.6 + 0.5 * mod(floor(h / 0.7), 2.0), h / 0.7);
          float mortar = 1.0 - edge(fract(br), 0.06);
          col = mix(vec3(0.42, 0.2, 0.15) * (0.8 + 0.3 * h2(floor(br))), vec3(0.55, 0.5, 0.46), mortar);
          vec2 wq = vec2(x / 9.0, (h - 6.0) / 9.0); vec2 wf = fract(wq); float win = step(0.0, h - 6.0) * box2(wf, vec2(0.28, 0.2), vec2(0.72, 0.82));
          float lit = 0.7 + 0.3 * h2(floor(wq) + 3.0);
          col = mix(col, vec3(1.0, 0.78, 0.48) * lit, win); glow += vec3(1.0, 0.72, 0.4) * win * lit * 0.85;
          col = mix(col, vec3(0.75, 0.7, 0.62), step(abs(fract(h / 9.0 + 0.3) - 0.5), 0.03) * 0.6);
          col *= 0.75;
        }
        else if (part == 8) { col = vec3(0.9, 0.88, 0.84); glow += vec3(0.08); }
        else if (part == 0) {
          // floor: oak planks; a rug down the middle (a runner in the hall, tiles in the kitchen)
          if (st == 2) { vec2 q = vec2(x, along) / 3.0; col = mix(vec3(0.9, 0.88, 0.84), vec3(0.16, 0.16, 0.18), mod(floor(q.x) + floor(q.y), 2.0)) * (0.92 + 0.08 * edge(fract(q), 0.05)); }
          else {
            vec2 pl = vec2(x / 1.4, along / 9.0 + 0.37 * floor(x / 1.4)); float pid = h2(floor(pl));
            col = vec3(0.52, 0.34, 0.2) * (0.78 + 0.35 * pid) * (0.88 + 0.12 * edge(fract(pl), 0.03));
            float rugW = st == 1 ? 7.0 : 15.0;
            float rug = step(abs(x), rugW);
            float bord = step(rugW - 1.6, abs(x)) + step(0.8, fract(along / 24.0)) * step(abs(fract(along / 24.0) - 0.9), 0.08);
            vec3 rc = st == 1 ? vec3(0.18, 0.26, 0.42) : vec3(0.48, 0.12, 0.12);
            vec2 mq = vec2(x / 3.0, along / 3.0); float motif = step(0.75, abs(sin(mq.x * 3.14) * sin(mq.y * 3.14)));
            col = mix(col, mix(rc * (0.9 + 0.2 * motif), vec3(0.85, 0.7, 0.4), clamp(bord, 0.0, 1.0) * 0.8), rug);
          }
        }
        else if (part == 3) {
          col = vec3(0.86, 0.83, 0.78);
          col *= 0.92 + 0.08 * edge(fract(vec2(x / 6.0, along / 6.0)), 0.02);
        }
        else {
          // walls: wainscot to the chair rail, paper above; windows onto the night, pictures between
          float notCap = part == 6 ? 0.0 : 1.0;
          vec3 paper = st == 1 ? vec3(0.36, 0.48, 0.38) : (st == 2 ? vec3(0.9, 0.84, 0.6) : vec3(0.82, 0.74, 0.6));
          float stripe = st == 0 ? step(0.5, fract(wa / 2.4)) : 0.0;
          vec2 dq = fract(vec2(wa / 3.0, h / 3.0) + vec2(0.0, 0.5 * mod(floor(wa / 3.0), 2.0)));
          float dam = st == 1 ? smoothstep(0.32, 0.2, length(dq - 0.5)) : 0.0;
          col = paper * (1.0 - 0.08 * stripe) * (1.0 - 0.12 * dam);
          if (st == 2) { vec2 tq = vec2(wa / 1.6 + 0.5 * mod(floor(h / 0.8), 2.0), h / 0.8); float tile = step(h, 12.0); col = mix(col, vec3(0.93, 0.93, 0.9) * (0.92 + 0.08 * edge(fract(tq), 0.06)), tile); }
          else {
            float wain = step(h, 8.0);
            vec2 pq = vec2(fract(wa / 6.0), h / 8.0); float panel = edge(vec2(pq.x, clamp(pq.y, 0.0, 1.0)), 0.1);
            col = mix(col, vec3(0.88, 0.85, 0.8) * (0.9 + 0.1 * panel), wain);
            col = mix(col, vec3(0.95, 0.93, 0.9), step(abs(h - 8.2), 0.25));
          }
          col = mix(col, vec3(0.95, 0.93, 0.9), step(h, 0.9));
          // windows every so often: night (or morning) out there, a few lit windows across the way
          float per = st == 2 ? 30.0 : 26.0;
          vec2 wv = vec2(mod(wa + 6.0, per) - 6.0, h); float win = notCap * box2(wv, vec2(0.0, 10.0), vec2(11.0, 24.0));
          float frame = win * (1.0 - edge(vec2(wv.x / 11.0, (wv.y - 10.0) / 14.0), 0.06));
          float mull = win * (step(abs(wv.x - 5.5), 0.25) + step(abs(wv.y - 17.0), 0.25));
          vec3 sky = mix(uSkyLo, uSkyHi, clamp((h - 10.0) / 14.0, 0.0, 1.0));
          vec2 cq = vec2(floor(wv.x * 1.2 + floor(along / per) * 7.0), floor(wv.y * 1.4)); float far = step(0.82, h2(cq)) * step(wv.y, 17.0) * uNight;
          vec3 glass = sky + vec3(1.0, 0.75, 0.45) * far * 0.8;
          col = mix(col, glass, win); glow += glass * win * 0.6;
          col = mix(col, vec3(0.94, 0.92, 0.88), clamp(frame + mull, 0.0, 1.0));
          float curt = notCap * (box2(wv, vec2(-2.4, 9.0), vec2(0.4, 25.0)) + box2(wv, vec2(10.6, 9.0), vec2(13.4, 25.0)));
          vec3 cc = st == 1 ? vec3(0.62, 0.3, 0.26) : vec3(0.7, 0.55, 0.3);
          col = mix(col, cc * (0.85 + 0.15 * sin(wv.x * 9.0)), clamp(curt, 0.0, 1.0));
          // a picture between the windows
          vec2 pv = vec2(mod(wa + 6.0 - per * 0.5, per) - 6.0, h); float pf = notCap * box2(pv, vec2(1.5, 13.0), vec2(9.5, 20.0));
          float pin = notCap * box2(pv, vec2(2.3, 13.8), vec2(8.7, 19.2));
          float pid = h2(vec2(floor((wa + 6.0 - per * 0.5) / per), 2.0));
          vec3 art = mix(vec3(0.3, 0.45, 0.6), vec3(0.75, 0.55, 0.35), pid) * (0.8 + 0.3 * sin(pv.x * 1.3 + pv.y * 0.7 + pid * 6.0));
          col = mix(col, vec3(0.42, 0.28, 0.16), pf); col = mix(col, art, pin);
          // the sconce glow by each picture
          glow += vec3(1.0, 0.75, 0.45) * notCap * 0.35 * exp(-dot(pv - vec2(5.5, 22.0), pv - vec2(5.5, 22.0)) / 10.0);
        }
        col *= uLight;
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the door, just a door, the couch empty, the lamp on ----------
export class JustDoorFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -40;
    this.group = new THREE.Group(); scene.add(this.group);
    const mat = selfLit({ roughness: 0.6 }, 0.18);
    const add = (geo, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.y = ry; this.group.add(o); return o; };
    add(MN.frame(), 0, 0, 0); this.doorMesh = add(MN.door(), -4.8, 0, 0, -0.04);
    add(paint(box(11, 0.4, 5, 0, 0.2, 4.2), rgb(0x7a5a3a)), 0, 0, 0);
    add(MN.couch(), 30, 0, 10, -0.55);
    add(MN.lampPole(), -14, 0, 4);
    const shade = new THREE.Mesh(MN.lampShade(), selfLit({ roughness: 0.8, side: THREE.DoubleSide }, 1.3)); shade.position.set(-14, 0, 4); this.group.add(shade);
    this.group.scale.setScalar(cfg.s ?? 1.8);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() {}
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1.8;
    this._w.set(-14, 21.8, 4).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 9 * s, LAMP, 1.2);
    S.pool(this._w.x, 0.2, this._w.z, 26 * s, LAMP, 0.55);
  }
}

// ---------- the place, per frame ----------
export class GuestWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = homeMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, HOME));
    this._g = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyLo.value.set(P.horizon); u.uSkyHi.value.set(P.zenith); u.uNight.value = clamp(P.stars ?? 0, 0, 1) * 2;
    for (const r of this.rooms) r.update(S.track, S.rider, S.rider.t);
    const M = S.town.mats; if (M.mnFlameM) M.mnFlameM.uniforms.uTime.value = time;
  }
  // the ceiling lights
  draw(T) {
    const g = this._g;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) { const fy = floorAt(this.S.course, f.t); this.S.track.ground(f.t, 0, g); T.glow(g.x, fy + r.H - 1.2, g.z, 7, LAMP, 0.9); T.pool(g.x, fy + 0.08, g.z, 30, LAMP, 0.28); }
    }
  }
}
