// ETYMOLOGY OF SCREAMS. A library at night, where every scream is filed under a family name. Up the
// wet street to the door under its Latin. The stacks: the book chained shut, three generations of
// ledgers, the gramophone and its minor third, the family tree that splinters. The archive: drawers
// to the ceiling, letters nobody chose to send, the trace with the break in its line. The
// scriptorium; then out into the storm: new tongues in the air, the tower of Babel built of books,
// the manuscript, the letters coming down like rain, the dead tree, the stone in a language no one
// else will ever speak; and the reading room, where the great book writes a new one.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local } from './scenery.js';
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
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function tube(a, b, r0, r1 = r0, n = 8) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function signFace(w, h, x = 0, y = 0, z = 0) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(x, y, z); return g; }
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const SERIF = 'Georgia, "Times New Roman", serif';
const CANDLE = [1, 0.72, 0.36], INK = rgb(0x16120e), BRASS = rgb(0xc89a48), WOOD = rgb(0x4a2c18), PARCH = rgb(0xe8dcc0), STONE = rgb(0x6a645c);
const GOLDEN = [1, 0.8, 0.45];

// ---------- the pictures ----------
// three ledgers' spines: the years of three generations
function spineTexture() {
  return canvasTex(768, 512, (g) => {
    ['1911', '1952', '1987'].forEach((y, i) => {
      const x = i * 256; g.fillStyle = ['#5a1a18', '#1a3a2a', '#1a2a4a'][i]; g.fillRect(x, 0, 256, 512);
      g.fillStyle = '#c8a050'; for (const yy of [40, 70, 440, 470]) g.fillRect(x + 20, yy, 216, 8);
      // (the box a little wider and the year sized inside it: 1952 and 1987 ran over its sides)
      g.fillStyle = '#e8c880'; g.font = `700 80px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const yw = g.measureText(y).width; if (yw > 160) g.font = `700 ${Math.floor(80 * 160 / yw)}px ${SERIF}`;
      g.fillText(y, x + 128, 256);
      g.strokeStyle = '#c8a050'; g.lineWidth = 4; g.strokeRect(x + 34, 196, 188, 120);
    });
  });
}
// the surnames on the family tree's plaques
const NAMES = ['ASHFORD', 'BELLAMY', 'CALLOWAY', 'DALE', 'ELLERY', 'FINCH', 'HALE', 'IVES', 'KEMP', 'LOWELL', 'MARSH', 'NORTH', 'PRICE', 'REED', 'SLOANE', 'VANCE'];
function plaqueTexture() {
  return canvasTex(1024, 512, (g) => {
    NAMES.forEach((n, i) => {
      const x = (i % 4) * 256, y = Math.floor(i / 4) * 128;
      g.fillStyle = '#2a1a10'; g.fillRect(x, y, 256, 128);
      g.fillStyle = '#e8d4a0'; g.beginPath(); g.ellipse(x + 128, y + 64, 118, 56, 0, 0, 7); g.fill();
      g.strokeStyle = '#8a6a30'; g.lineWidth = 6; g.beginPath(); g.ellipse(x + 128, y + 64, 108, 48, 0, 0, 7); g.stroke();
      g.fillStyle = '#2a1a10'; g.font = `700 ${n.length > 7 ? 30 : 36}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, x + 128, y + 66);
    });
  });
}
// tongues: letters from many scripts, one to a cell
const GLYPHS = ['A', 'Ω', 'Ж', 'ש', 'ع', '语', 'あ', '한', 'क', 'ᚠ', 'Σ', 'λ', 'Я', 'ψ', 'ß', 'Q'];
function glyphTexture() {
  return canvasTex(1024, 1024, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 1024);
    GLYPHS.forEach((c, i) => {
      const x = (i % 4) * 256 + 128, y = Math.floor(i / 4) * 256 + 136;
      g.font = `700 170px ${SERIF}, "Segoe UI Historic", "Nirmala UI", "Microsoft YaHei", "Malgun Gothic", "Yu Gothic", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const [blur, f] of [[30, '#ffb050'], [8, '#ffd890'], [0, '#fff4dc']]) { g.shadowColor = '#ffb050'; g.shadowBlur = blur; g.fillStyle = f; g.fillText(c, x, y); }
    });
  });
}
// the illuminated manuscript: a page of ink with a great D at the head of it
function manuscriptTexture() {
  return canvasTex(768, 1024, (g, W, H) => {
    g.fillStyle = '#e8dcbc'; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(120,90,50,${Math.random() * 0.06})`; g.beginPath(); g.arc(Math.random() * W, Math.random() * H, Math.random() * 30, 0, 7); g.fill(); }
    g.strokeStyle = '#a8862e'; g.lineWidth = 10; g.strokeRect(40, 40, W - 80, H - 80);
    g.strokeStyle = '#2a6a3a'; g.lineWidth = 5; g.beginPath(); for (let y = 60; y < H - 60; y += 6) g.lineTo(52 + Math.sin(y * 0.05) * 10, y); g.stroke();
    g.fillStyle = '#1a3a8a'; g.fillRect(90, 100, 230, 230); g.fillStyle = '#c89a2e'; g.fillRect(100, 110, 210, 210);
    g.fillStyle = '#9a1a1a'; g.font = `700 200px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('D', 205, 222);
    g.fillStyle = '#2a1e14';
    for (let r = 0; r < 26; r++) { const y = 140 + r * 30, x0 = r < 7 ? 350 : 90; for (let x = x0; x < W - 90;) { const w = 14 + Math.random() * 46; g.fillRect(x, y, w, 9); x += w + 10; } }
    g.fillStyle = '#9a1a1a'; g.font = `italic 700 34px ${SERIF}`; g.fillText('dolor habet linguam', W / 2, H - 100);
  });
}
// a language no one else will ever speak: marks nobody has made before, glowing in the stone
function steleTexture() {
  return canvasTex(512, 1024, (g, W, H) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const R = seeded(23);
    g.strokeStyle = '#ff9a40'; g.lineWidth = 7; g.lineCap = 'round'; g.shadowColor = '#ff8a30'; g.shadowBlur = 16;
    for (let r = 0; r < 14; r++) for (let c = 0; c < 5; c++) {
      const x = 60 + c * 92, y = 70 + r * 66; g.beginPath();
      const n = 2 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) { const kind = R(); if (kind < 0.4) { g.moveTo(x + R() * 40 - 20, y + R() * 40 - 20); g.lineTo(x + R() * 40 - 20, y + R() * 40 - 20); } else if (kind < 0.7) { g.moveTo(x + 14, y); g.arc(x, y, 6 + R() * 12, 0, Math.PI * (1 + R())); } else { g.moveTo(x - 16, y + 16); g.lineTo(x, y - 16); g.lineTo(x + 16, y + 16); } }
      g.stroke();
    }
  });
}
// the letters nobody chose to send: an envelope, its red seal
function envelopeTexture() {
  return canvasTex(512, 320, (g, W, H) => {
    g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#b8a888'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(W / 2, H * 0.6); g.lineTo(W, 0); g.stroke();
    g.fillStyle = '#8a1a1a'; g.beginPath(); g.arc(W / 2, H * 0.6, 42, 0, 7); g.fill(); g.fillStyle = '#c83a2a'; g.beginPath(); g.arc(W / 2, H * 0.6, 30, 0, 7); g.fill();
    g.fillStyle = '#8a1a1a'; g.font = `700 36px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('D', W / 2, H * 0.6 + 2);
  });
}
// the great book's pages: lines of writing, and the new letters lighting in them
function pageTexture() {
  return canvasTex(1024, 768, (g, W, H) => {
    g.fillStyle = '#e8dcbc'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(120,90,50,0.25)'; g.fillRect(W / 2 - 20, 0, 40, H);
    const R = seeded(41); g.fillStyle = '#2a1e14';
    for (const x0 of [60, W / 2 + 50]) for (let r = 0; r < 20; r++) { const y = 70 + r * 32; for (let x = x0; x < x0 + W / 2 - 120;) { const w = 10 + R() * 40; g.fillRect(x, y, w, 8); x += w + 9; } }
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { spine: spineTexture(), plaque: plaqueTexture(), glyph: glyphTexture(), manuscript: manuscriptTexture(), stele: steleTexture(), envelope: envelopeTexture(), page: pageTexture() });
const lit = (M, key, map, k = 1, opts = {}) => M[key] || (M[key] = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(k, k, k), side: THREE.DoubleSide, ...opts }));
const paper = (M, key, map, k = 0.5) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.8, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide }));
function cellMat(map, cols, rows, k = 1, additive = false) {
  return new THREE.ShaderMaterial({
    uniforms: { tMap: { value: map }, uK: { value: k } },
    vertexShader: `attribute float aCell; attribute float aK; varying vec2 vUv; varying float vCell; varying float vK; void main(){ vUv = uv; vCell = aCell; vK = aK; gl_Position = projectionMatrix * (modelViewMatrix * instanceMatrix * vec4(position, 1.0)); }`,
    fragmentShader: `uniform sampler2D tMap; uniform float uK; varying vec2 vUv; varying float vCell; varying float vK; void main(){ float cell = floor(vCell + 0.5); float c = mod(cell, ${cols.toFixed(1)}), r = floor((cell + 0.5) / ${cols.toFixed(1)}); vec3 t = texture2D(tMap, vec2((c + vUv.x) / ${cols.toFixed(1)}, 1.0 - (r + 1.0 - vUv.y) / ${rows.toFixed(1)})).rgb; gl_FragColor = vec4(t * uK * vK, 1.0); }`,
    side: THREE.DoubleSide, ...(additive ? { blending: THREE.AdditiveBlending, depthWrite: false, transparent: true } : {}),
  });
}
function tintLit(rough = 0.7, metal = 0, k = 0.12) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: rough, metalness: metal });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';');
  };
  return m;
}
// the trace on the recorder's paper: a grid, the line of a voice, and the break in it
function traceMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFlat: { value: 0 } },
    vertexShader: `attribute float aK; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = aK; gl_Position = projectionMatrix * (modelViewMatrix * instanceMatrix * vec4(position, 1.0)); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFlat; varying vec2 vUv; varying float vK;
      float h2(float x){ return fract(sin(x * 127.1) * 43758.5453); }
      void main(){
        float u = vUv.x * 6.0 + uTime * 0.8;
        vec3 col = vec3(0.92, 0.9, 0.84);
        vec2 gq = abs(fract(vec2(u * 4.0, vUv.y * 10.0)) - 0.5); col = mix(col, vec3(0.85, 0.55, 0.5), step(0.46, max(gq.x, gq.y)) * 0.5);
        float seg = floor(u * 1.3);
        float brk = step(0.72, h2(seg));
        float y = 0.5 + 0.28 * sin(u * 9.0) * sin(u * 2.3 + 1.0) + 0.1 * sin(u * 31.0);
        y = mix(y, 0.5 + (h2(floor(u * 20.0)) - 0.5) * 0.9, brk);
        y = mix(y, 0.5, vK * uFlat);
        float d = abs(vUv.y - y);
        float line = smoothstep(0.03, 0.0, d);
        col = mix(col, mix(vec3(0.1, 0.1, 0.18), vec3(0.85, 0.1, 0.1), brk), line);
        gl_FragColor = vec4(col * 1.05, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the library's things, at its scale ----------
const LB = {
  // a standing book: the cover is tinted, the page block cream, the spine toward +z
  book() { return merge([paint(box(2, 9, 6.4, 0, 4.5, 0), [1, 1, 1]), paint(box(1.7, 8.4, 6.0, 0, 4.5, -0.3), rgb(0xfff4dc).map((c) => c * 1.0)), paint(box(2.1, 0.5, 6.5, 0, 1.4, 0), rgb(0xd8b060)), paint(box(2.1, 0.5, 6.5, 0, 7.6, 0), rgb(0xd8b060))]); },
  // a great book chained shut on its lectern, the padlock hanging off it
  lockBook() {
    const parts = [];
    parts.push(paint(box(10, 2.4, 1.6, 0, 9, 0), WOOD)); parts.push(paint(cyl(1.2, 1.6, 9, 10, 0, 4.5, 0), WOOD)); parts.push(paint(box(7, 1, 7, 0, 0.5, 0), WOOD));
    const bk = merge([paint(box(14, 2.8, 10, 0, 0, 0), rgb(0x5a1a14)), paint(box(13.4, 2.4, 9.6, 0.3, 0, 0), rgb(0xe8dcc0)), paint(box(14.2, 0.6, 10.2, 0, 1.2, 0), rgb(0x3a0e0a))]); bk.rotateX(-0.45); bk.translate(0, 11.4, 1.4); parts.push(bk);
    for (const x of [-3.6, 3.6]) for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; const l = new THREE.TorusGeometry(0.62, 0.2, 6, 12); l.rotateY(k % 2 ? Math.PI / 2 : 0); l.translate(x, Math.sin(a) * 3.0, Math.cos(a) * 5.6); l.rotateX(-0.45); l.translate(0, 11.4, 1.4); parts.push(paint(l, rgb(0x6a6a70))); }
    parts.push(paint(box(3.2, 3.6, 1.6, 0, 6.8, 6.4), BRASS)); const sh = new THREE.TorusGeometry(1.2, 0.35, 8, 16, Math.PI); sh.translate(0, 8.6, 6.4); parts.push(paint(sh, rgb(0xa8a8b0)));
    parts.push(paint(cyl(0.3, 0.3, 0.4, 10, 0, 6.6, 7.3).rotateX(Math.PI / 2), INK));
    return merge(parts);
  },
  // the gramophone: its wooden case, the record, the arm, the horn turned to you
  gramophone() {
    const parts = [];
    parts.push(paint(box(14, 7, 14, 0, 3.5, 0), WOOD)); parts.push(paint(box(14.4, 0.6, 14.4, 0, 7.2, 0), rgb(0x6a3a1a)));
    const horn = lathe([[0.6, 0], [0.8, 4], [1.4, 10], [3, 15], [6, 19], [9.5, 21.2], [10, 21.6], [9.6, 21.4], [5.6, 18.8], [2.6, 14.6], [1.1, 9.8], [0.4, 4], [0.3, 0]], 40);
    horn.rotateX(-1.25); horn.translate(4.2, 10, -3); parts.push(paint(horn, rgb(0xd8a848)));
    parts.push(paint(tube(V(4.2, 10, -3), V(4.2, 7.6, -3.4), 0.6), rgb(0xd8a848)));
    parts.push(paint(box(0.6, 0.6, 7, 3.8, 8.2, 1.4), rgb(0xc8c8d0)));
    return merge(parts);
  },
  record() { return merge([paint(cyl(5.6, 5.6, 0.3, 40, 0, 0, 0), rgb(0x0c0c10)), paint(cyl(1.6, 1.6, 0.34, 20, 0, 0, 0), rgb(0x9a1a1a))]); },
  // the music staff: five lines across the road, two notes a minor third apart
  staff() { const parts = []; for (let k = 0; k < 5; k++) parts.push(box(60, 0.25, 0.25, 0, k * 1.6, 0)); return merge(parts.map((g) => paint(g, [1, 1, 1]))); },
  note() { const h = sph(1.4, 1.35, 1, 0.5, 0, 0, 0); h.rotateZ(0.4); return merge([paint(h, [1, 1, 1]), paint(box(0.3, 7, 0.3, 1.7, 3.4, 0), [1, 1, 1])]); },
  // the family tree: a trunk, its branches; the plaques hang off the branch ends
  tree() {
    const parts = [], R = seeded(77), bark = rgb(0x3a2818), ends = [];
    parts.push(paint(tube(V(0, 0, 0), V(0.6, 14, 0), 3.2, 2.2, 12), bark));
    const grow = (a, dir, len, r, depth) => {
      const b = a.clone().addScaledVector(dir, len);
      parts.push(paint(tube(a, b, r, r * 0.68, 8), bark));
      if (depth === 0) { ends.push(b); return; }
      for (let k = 0; k < 2; k++) { const d2 = dir.clone().applyAxisAngle(V(0, 0, 1), (k ? 1 : -1) * (0.35 + R() * 0.35)).applyAxisAngle(V(0, 1, 0), (R() - 0.5) * 1.6).normalize(); grow(b, d2, len * 0.74, r * 0.68, depth - 1); }
    };
    grow(V(0.6, 14, 0), V(0.25, 1, 0).normalize(), 9, 2.2, 3);
    grow(V(0.6, 14, 0), V(-0.4, 1, 0.2).normalize(), 8, 1.9, 3);
    const g = merge(parts); g.userData.ends = ends; return g;
  },
  plaque() { const g = new THREE.CircleGeometry(1, 24); g.scale(2.4, 1.2, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i)); return g; },
  // a drawer of the card catalogue, pulled out
  drawer() { return merge([paint(box(4, 2.4, 6, 0, 0, -3), rgb(0x6a4a2a)), paint(box(4.2, 2.6, 0.3, 0, 0, 0.1), rgb(0x7a5a34)), paint(box(1.6, 0.8, 0.2, 0, 0.5, 0.35), rgb(0xe8dcc0)), paint(box(1.2, 0.3, 0.6, 0, -0.5, 0.4), BRASS)]); },
  // the recorder: the cabinet, the two rollers, the pen on its arm; the paper is its own layer
  recorder() { return merge([paint(box(30, 10, 8, 0, 5, -2), rgb(0x2a2a30)), paint(box(30.4, 0.8, 8.4, 0, 10.2, -2), BRASS), ...[-14, 14].map((x) => paint(cyl(1.4, 1.4, 6, 16, x, 14, 0).rotateX(Math.PI / 2).translate(0, 0, 0), rgb(0x8a8a90))), paint(box(1, 6, 1, 0, 19, 1.2), BRASS)]); },
  paper() { const g = new THREE.PlaneGeometry(28, 9); g.translate(0, 14, 1.0); return g; },
  pen() { return merge([paint(box(0.5, 8, 0.5, 0, -4, 0), BRASS), paint(cyl(0.2, 0.05, 1.2, 6, 0, -8.4, 0), rgb(0x9a1a1a))]); },
  // the tower of Babel: books stacked in rings, narrowing as it goes up, a ramp winding round it
  babel() {
    const parts = [], R = seeded(5), covers = [0x5a1a18, 0x1a3a2a, 0x1a2a4a, 0x4a3018, 0x6a5a2a, 0x2a1a2a, 0x7a3a1a];
    let y = 0;
    for (let lv = 0; lv < 22; lv++) {
      const r = 46 - lv * 1.75, h = 7.4, n = Math.floor(2 * Math.PI * r / 2.6);
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + lv * 0.13; const b = box(2.2 + R() * 0.4, h * (0.86 + R() * 0.14), 6.6, 0, 0, 0); b.translate(0, h / 2, 0); b.rotateY(-a); b.translate(Math.cos(a) * r, y, Math.sin(a) * r); parts.push(paint(b, rgb(covers[Math.floor(R() * covers.length)]).map((c) => c * (0.7 + R() * 0.5)))); }
      parts.push(paint(cyl(r - 2.8, r - 2.8, 1.2, 36, 0, y + h, 0), rgb(0xd8ccb0)));
      y += h + 1.2;
    }
    parts.push(paint(cyl(4, 6, 10, 16, 0, y + 5, 0), rgb(0x3a2a20)));
    return merge(parts);
  },
  // a page standing on its easel
  easel() { const parts = [], w = WOOD; for (const s of [-1, 1]) { const l = box(1, 44, 1, 0, 22, 0); l.rotateZ(s * 0.1); l.translate(s * 9, 0, -1); parts.push(paint(l, w)); } const b = box(1, 40, 1, 0, 20, 0); b.rotateX(-0.35); b.translate(0, 0, -5); parts.push(paint(b, w)); parts.push(paint(box(26, 1.2, 3, 0, 10, 0), w)); for (const [ww, hh, x, y] of [[25, 1, 0, 10.8], [25, 1, 0, 43.2], [1, 33.4, -12.4, 27], [1, 33.4, 12.4, 27]]) parts.push(paint(box(ww, hh, 1.4, x, y, 0.2), rgb(0xc89a3a))); return merge(parts); },
  manuscript() { const g = new THREE.PlaneGeometry(24, 32); g.translate(0, 27, 0.75); return g; },
  // the stone: a black slab on its plinth; the marks are the glowing face
  stele() { return merge([paint(box(22, 44, 5, 0, 26, 0), rgb(0x1e1c20)), paint(box(26, 4, 8, 0, 2, 0), rgb(0x3a3640)), paint(box(23, 2, 6, 0, 49, 0), rgb(0x2a2830))]); },
  steleFace() { const g = new THREE.PlaneGeometry(19, 38); g.translate(0, 26, 2.55); return g; },
  envelope() { return new THREE.PlaneGeometry(3.2, 2.0); },
  glyph() { return new THREE.PlaneGeometry(4, 4); },
  // a gas lamp: the post, the glass lantern
  lamp() { return merge([paint(cyl(0.35, 0.5, 14, 8, 0, 7, 0), rgb(0x1a1a1e)), paint(box(1.8, 2.4, 1.8, 0, 15, 0), rgb(0x2a2a30)), paint(cyl(0.2, 1.2, 1, 4, 0, 16.7, 0).rotateY(Math.PI / 4), rgb(0x1a1a1e))]); },
  // his lines cut in stone tablets, a lantern each side
  signBoard() { return merge([paint(box(25.4, 9.8, 1.4, 0, 0, -1.2), rgb(0x8a8478)), ...[[26.6, 1.0, 0, 5.3], [26.6, 1.0, 0, -5.3], [1.0, 11.6, -13.3, 0], [1.0, 11.6, 13.3, 0]].map(([w, h, x, y]) => paint(box(w, h, 2.0, x, y, -1.0), rgb(0x5a554c))), ...[-9, 9].map((x) => paint(box(0.3, 40, 0.3, x, 25.4, -1.2), rgb(0x2a2a30)))]); },
};

extend({
  layers: {
    eyBook: (M) => [LB.book(), M.eyBookM || (M.eyBookM = tintLit(0.7, 0, 0.15)), 2400, { aTint: 3 }],
    eyLock: (M) => [LB.lockBook(), VCm(M, 'eyLockM', 0.2, { roughness: 0.5, metalness: 0.3 }), 2, {}],
    eySpine: (M) => [(() => { const g = new THREE.PlaneGeometry(1.9, 8.8); g.translate(0, 4.5, 3.25); return g; })(), M.eySpineM || (M.eySpineM = cellMat(tex().spine, 3, 1, 0.9)), 6, { aCell: 1, aK: 1 }],
    eyGram: (M) => [LB.gramophone(), VCm(M, 'eyGramM', 0.25, { roughness: 0.3, metalness: 0.6 }), 2, {}],
    eyRecord: (M) => [LB.record(), VCm(M, 'eyRecordM', 0.2, { roughness: 0.2 }), 2, {}],
    eyStaff: (M) => [LB.staff(), M.eyStaffM || (M.eyStaffM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.45).multiplyScalar(1.5) })), 3, {}],
    eyNote: (M) => [LB.note(), M.eyStaffM || (M.eyStaffM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.45).multiplyScalar(1.5) })), 8, {}],
    eyTree: (M) => [LB.tree(), VCm(M, 'eyTreeM', 0.6, { roughness: 0.9 }), 4, {}],
    eyPlaque: (M) => [LB.plaque(), M.eyPlaqueM || (M.eyPlaqueM = cellMat(tex().plaque, 4, 4, 0.95)), 120, { aCell: 1, aK: 1 }],
    eyDrawer: (M) => [LB.drawer(), VCm(M, 'eyDrawerM', 0.12, { roughness: 0.6, metalness: 0.2 }), 300, {}],
    eyEnvelope: (M) => [LB.envelope(), paper(M, 'eyEnvM', tex().envelope, 0.7), 120, {}],
    eyRecorder: (M) => [LB.recorder(), VCm(M, 'eyRecM', 0.18, { roughness: 0.4, metalness: 0.5 }), 3, {}],
    eyPaper: (M) => [LB.paper(), M.eyTraceM || (M.eyTraceM = traceMaterial()), 3, { aK: 1 }],
    eyPen: (M) => [LB.pen(), VCm(M, 'eyPenM', 0.3, { roughness: 0.3, metalness: 0.6 }), 3, {}],
    eyBabel: (M) => [LB.babel(), VCm(M, 'eyBabelM', 0.55, { roughness: 0.8 }), 3, {}],
    eyEasel: (M) => [LB.easel(), VCm(M, 'eyEaselM', 0.15, { roughness: 0.6, metalness: 0.2 }), 2, {}],
    eyManuscript: (M) => [LB.manuscript(), paper(M, 'eyManuM', tex().manuscript, 0.75), 2, {}],
    eyStele: (M) => [LB.stele(), VCm(M, 'eySteleM', 0.08, { roughness: 0.5, metalness: 0.2 }), 2, {}],
    eySteleFace: (M) => [LB.steleFace(), M.eySteleFaceM || (M.eySteleFaceM = new THREE.MeshBasicMaterial({ map: tex().stele, color: new THREE.Color(1.3, 1.3, 1.3), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })), 2, {}],
    eyGlyph: (M) => [LB.glyph(), M.eyGlyphM || (M.eyGlyphM = cellMat(tex().glyph, 4, 4, 1.4, true)), 500, { aCell: 1, aK: 1 }],
    eyLamp: (M) => [LB.lamp(), VCm(M, 'eyLampM', 0.1, { roughness: 0.5, metalness: 0.5 }), 200, {}],
    eySignBoard: (M) => [LB.signBoard(), VCm(M, 'eySignM', 0.18, { roughness: 0.9 }), 12, {}],
    eySignFace: (M) => [signFace(23, 7.6, 0, 0, 0.02), M.sign, 12, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // books, rows of them, shelved along the road where the walls are too far off (and the tower's floor)
    eyStack(S, it, p, q, yaw) {
      const L = S.layers; L.eyBook;
      if (!S.track) return;
      const m = S._m, R = seeded(Math.floor(it.seed * 1e6) + 3), bq = S._bq || (S._bq = new THREE.Quaternion()), s = it.s ?? 1;
      for (let k = 0; k < (it.n ?? 12); k++) { const w = local(p, yaw, (k - (it.n ?? 12) / 2) * 2.1 * s, 0, 0, S._o); S._e.set(0, yaw, (R() - 0.5) * 0.12); bq.setFromEuler(S._e); const h = s * (0.8 + R() * 0.4); m.compose(w, bq, S._s.set(s, h, s)); const c = [[0.42, 0.12, 0.1], [0.12, 0.28, 0.18], [0.12, 0.18, 0.36], [0.36, 0.24, 0.12], [0.5, 0.42, 0.2]][Math.floor(R() * 5)]; L.eyBook.add(m, { aTint: c }); }
    },
    // the set-pieces standing by the road
    eyProp(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['eyLock', 'eyBook', 'eySpine', 'eyGram', 'eyRecord', 'eyTree', 'eyPlaque', 'eyRecorder', 'eyPaper', 'eyPen', 'eyEasel', 'eyManuscript', 'eyStele', 'eySteleFace', 'eyBabel']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind, base = (it.h ?? 0) + (it.y ?? 0);
      const at = S._pv || (S._pv = new THREE.Vector3()); at.set(p.x, base, p.z);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2, z = 6) => { const w = local(at, yaw, 0, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.6, c = CANDLE) => poolAt(S, at.x, (it.h ?? 0) + 0.15, at.z, 40 * s, c, k2);
      if (k === 'lock') {
        S._e.set(Math.sin(T * 9) * 0.01 * (T > (it.rattle ?? 1e9) && T < (it.rattle ?? 1e9) + 1.2 ? 1 : 0), yaw, 0); const lq = (S._lq || (S._lq = new THREE.Quaternion())).setFromEuler(S._e);
        put('eyLock', 0, 0, 0, lq); light(12, 30, CANDLE, 0.4); spot(0.7);
        for (const sd of [-1, 1]) { const w = local(at, yaw, sd * 8 * s, 15 * s, 2 * s, S._o); glowAt(S, w.x, w.y, w.z, 3 * s, CANDLE, 1.2 + 0.2 * Math.sin(T * 13 + sd)); }
      } else if (k === 'ledgers') {
        const bq = S._bq2 || (S._bq2 = new THREE.Quaternion()); S._e.set(0, yaw, 0); bq.setFromEuler(S._e);
        for (let j = 0; j < 3; j++) { const w = local(at, yaw, (j - 1) * 5.2 * s, 0, 0, S._o); const h = 2.2 * s; m.compose(w, bq, S._s.set(2.4 * s, h, 1.4 * s)); L.eyBook.add(m, { aTint: [[0.42, 0.12, 0.1], [0.12, 0.28, 0.18], [0.12, 0.18, 0.36]][j] }); L.eySpine.add(m, { aCell: j, aK: 1 }); }
        light(14, 34, CANDLE, 0.35); spot(0.6);
      } else if (k === 'gramophone') {
        put('eyGram'); S._e.set(0, yaw + T * 3.5, 0); const rq = (S._rq || (S._rq = new THREE.Quaternion())).setFromEuler(S._e); put('eyRecord', 0, 7.7, 2, rq);
        light(10, 30, CANDLE, 0.35); spot(0.6);
        // the notes coming out of the horn
        for (let j = 0; j < 8; j++) { const f = ((T * 0.5 + j / 8) % 1); const w = local(at, yaw, (4.2 - f * 10) * s, (17 + f * 10 + Math.sin(T * 3 + j) * 2) * s, (8 + f * 30) * s, S._o); glowAt(S, w.x, w.y, w.z, 1.6 * s, GOLDEN, 1.1 * (1 - f)); }
      } else if (k === 'tree') {
        const crack = smooth(it.snap ?? 1e9, (it.snap ?? 1e9) + 0.25, T), fall = T - (it.snap ?? 1e9);
        put('eyTree');
        const ends = LB._ends || (LB._ends = LB.tree().userData.ends);
        const pq = S._pq || (S._pq = new THREE.Quaternion());
        ends.forEach((e, j) => {
          const drop = fall > 0 && hash(j * 7.1) < 0.6 ? Math.max(0, fall - hash(j) * 0.6) : 0;
          const w = local(at, yaw, e.x * s, (e.y - 1.8 - 4.9 * drop * drop) * s, e.z * s, S._o);
          S._e.set(Math.sin(T * 2 + j) * 0.1 + drop * 2, yaw + Math.sin(T * 1.3 + j) * 0.3 + drop * 3, Math.sin(T * 1.7 + j) * 0.12); pq.setFromEuler(S._e);
          m.compose(w, pq, S._s.set(s * 2.2, s * 2.2, s * 2.2)); L.eyPlaque.add(m, { aCell: j % NAMES.length, aK: 1.2 - clamp(drop * 0.3, 0, 0.6) });
        });
        if (crack > 0) for (let j = 0; j < 9; j++) { const w = local(at, yaw, (0.3 + Math.sin(j * 2.1) * 0.8) * s, (2 + j * 3.2) * s, 3.0 * s, S._o); glowAt(S, w.x, w.y, w.z, (2.4 + 1.2 * Math.sin(j)) * s, [1, 0.55, 0.25], crack * (1.6 - j * 0.12) * (0.7 + 0.3 * Math.sin(T * 30 + j))); }
        light(20, 60, CANDLE, 0.45, 0); spot(0.9); for (const [ox, oy] of [[-14, 6], [14, 8], [-8, 26], [10, 30]]) { const w = local(at, yaw, ox * s, oy * s, 6 * s, S._o); glowAt(S, w.x, w.y, w.z, 5 * s, CANDLE, 1.3); }
      } else if (k === 'recorder') {
        put('eyRecorder'); put('eyPaper', 0, 0, 0, q, s, { aK: it.flat ? 1 : 0 });
        const tr = S._recT || 0, y = 0.5 + 0.28 * Math.sin(tr * 9) * Math.sin(tr * 2.3 + 1);
        const pw = local(at, yaw, 0, (14 + (it.flat ? 0 : (y - 0.5) * 9)) * s, 1.2 * s, S._o); S._e.set(0, yaw, 0); const nq = (S._nq || (S._nq = new THREE.Quaternion())).setFromEuler(S._e); m.compose(pw.set(pw.x, pw.y + 8.4 * s, pw.z), nq, S._s.set(s, s, s)); L.eyPen.add(m);
        light(14, 36, [1, 0.9, 0.8], 0.4); spot(0.6);
      } else if (k === 'manuscript') { put('eyEasel'); put('eyManuscript'); light(27, 40, [1, 0.85, 0.6], 0.35); spot(0.6); }
      else if (k === 'stele') { put('eyStele'); put('eySteleFace'); light(26, 50, [1, 0.6, 0.3], 0.3 + 0.1 * Math.sin(T * 2)); spot(0.6, [1, 0.5, 0.25]); }
      else if (k === 'babel') {
        put('eyBabel');
        for (let j = 0; j < 70; j++) { const lv = j % 22, a = j * 2.4 + T * 0.05, r = 46 - lv * 1.75 + 1.5; const w = local(at, yaw, Math.cos(a) * r * s, (lv * 8.6 + 4) * s, Math.sin(a) * r * s, S._o); glowAt(S, w.x, w.y, w.z, 6 * s, CANDLE, 1.0 + 0.4 * Math.sin(T * 4 + j)); }
        for (let j = 0; j < 4; j++) { const w = local(at, yaw, 0, (40 + j * 45) * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 120 * s, [1, 0.6, 0.35], 0.12); }
        const top = local(at, yaw, 0, 200 * s, 0, S._o); glowAt(S, top.x, top.y, top.z, 30 * s, [1, 0.7, 0.4], 0.5 + 0.3 * Math.sin(T * 2));
      }
    },
    // drawers of the card catalogue sliding out of the walls on the beat
    eyDrawers(S, it, p, q, yaw) {
      const L = S.layers; L.eyDrawer;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, b = S.course.beatAt ? S.course.beatAt(T) : T * 2;
      for (let j = 0; j < 6; j++) { const ph = hash(it.seed * 13 + j); const out = Math.max(0, Math.sin((b * 0.5 + ph * 4) * Math.PI)) * 4; const w = local(p, yaw, (j - 2.5) * 4.6, (3 + ((j * 5) % 7) * 2.8), out, S._o); m.compose(w, q, S._s.set(1, 1, 1)); L.eyDrawer.add(m); }
    },
    // things in the air: letters out of the drawers, letters of every script, letters falling
    eyAir(S, it, p) {
      const L = S.layers; L.eyEnvelope; L.eyGlyph; L.eyNote; L.eyStaff;
      if (!S.track) return;
      const T = S.tNow ?? 0, sm = S.course.sample(it.t), h = sm.yaw, m = S._m, fq = S._afq || (S._afq = new THREE.Quaternion());
      const go = smooth(it.go ?? -1e9, (it.go ?? -1e9) + 0.6, T), k = it.kind;
      if (k === 'staff') {
        // five lines across the road and two notes on them, a minor third apart
        const c = local(p, h, 0, 0, 0, S._o).clone(); c.y = sm.y + (it.lift ?? 17);
        S._e.set(0, h + Math.PI, 0); fq.setFromEuler(S._e); m.compose(c, fq, S._s.set(1, 1, 1)); L.eyStaff.add(m);
        for (const [x, ln] of [[-6, 0], [6, 1]]) { const n = local(c, h + Math.PI, x, ln * 1.6 + Math.sin(T * 3 + x) * 0.3, 0.2, S._o); m.compose(n, fq, S._s.set(1.2, 1.2, 1.2)); L.eyNote.add(m); glowAt(S, n.x, n.y, n.z, 8, GOLDEN, 0.8 * go); }
        glowAt(S, c.x, c.y + 3, c.z, 40, GOLDEN, 0.12);
        return;
      }
      if (go <= 0) return;
      const n = it.n ?? 50;
      for (let j = 0; j < n; j++) {
        const R1 = hash(j * 3.1 + it.t), R2 = hash(j * 7.7 + it.t), R3 = hash(j * 1.3 + it.t);
        let w, sc = 1;
        if (k === 'fall') { const f = ((T * 0.22 + R1) % 1); w = local(p, h, (R2 - 0.5) * 80, 0, (R3 - 0.5) * 70, S._o); w.y = sm.y + 42 - f * 46; sc = 1.4; }
        else if (k === 'swirl') { const a = T * (0.6 + R1 * 0.5) + j * 0.7, r = 14 + R2 * 26; w = local(p, h, Math.cos(a) * r, 0, Math.sin(a) * r * 1.3, S._o); w.y = sm.y + 6 + R3 * 26 + Math.sin(T * 1.5 + j) * 2; sc = 1.2 + R3; }
        else { const f = ((T * 0.3 + R1) % 1), side = R2 < 0.5 ? -1 : 1; w = local(p, h, side * (34 - f * 30) + (R3 - 0.5) * 6, 0, (R1 - 0.5) * 40, S._o); w.y = sm.y + 4 + f * 18 + Math.sin(T * 2 + j) * 1.5; }
        S._e.set(Math.sin(T * 1.3 + j) * 0.5, h + Math.PI + Math.sin(T * 0.9 + j) * 0.6, Math.sin(T * 1.7 + j) * 0.4); fq.setFromEuler(S._e);
        m.compose(w, fq, S._s.set(sc * go, sc * go, sc * go));
        if (k === 'letters') L.eyEnvelope.add(m); else L.eyGlyph.add(m, { aCell: Math.floor(R2 * 16), aK: 0.6 + 0.4 * Math.sin(T * 3 + j) });
      }
    },
    // gas lamps along the wet street
    eyLamp(S, it, p, q, yaw) {
      const L = S.layers; L.eyLamp;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.eyLamp.add(m);
      const w = local(p, yaw, 0, 15, 0, S._o); glowAt(S, w.x, w.y, w.z, 8, CANDLE, 1.1 + 0.08 * Math.sin(T * 17 + it.seed * 9)); poolAt(S, p.x, 0.1, p.z, 22, CANDLE, 0.55);
    },
    // his lines in stone, hung over the road between two lanterns
    eySign(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, Math.sin(T * 1.1 + it.t) * 0.015); const fq = (S._esq || (S._esq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.eySignBoard.add(m); S.layers.eySignFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      const w = S._o; for (const sd of [-1, 1]) { local(p, h + Math.PI, sd * 14.6 * s, 0, 1.2 * s, w); glowAt(S, w.x, w.y, w.z, 4 * s, CANDLE, 1.3 + 0.15 * Math.sin(T * 13 + sd)); }
      glowAt(S, p.x, p.y, p.z, 32 * s, CANDLE, 0.16);
    },
  },
  kits: {
    eyProps(S, z) { for (const c of z.at) { const it = { t: c.t, x: c.x, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), s: c.s ?? 1, y: c.y, kind: c.kind, snap: c.snap, rattle: c.rattle, flat: c.flat, h: 0, parts: 'eyProp', ahead: c.ahead ?? 40 }; S.items.push(c.floor ? onFloor(S, it) : it); } },
    eyStacks(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + R() * 0.1, x: side * ((z.x ?? 26) + R() * 4), rot: SIDE(side), s: z.s ?? 1.6, n: z.n ?? 10, seed: R(), parts: 'eyStack', ahead: z.ahead ?? 26 })); },
    eyDrawers(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.45) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + R() * 0.1, x: side * (z.x ?? 31), rot: SIDE(side), seed: R(), parts: 'eyDrawers', ahead: z.ahead ?? 24 })); },
    eyAir(S, z) { prepare(S.course, S.plan); for (const c of z.at) S.items.push({ t: c.t, x: 0, rot: 0, h: 0, kind: c.kind, go: c.go, n: c.n, lift: c.lift, parts: 'eyAir', ahead: c.ahead ?? 36 }); },
    eyLamps(S, z, R) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.7) { const side = k++ % 2 ? 1 : -1; S.items.push({ t: t + R() * 0.1, x: side * (z.x ?? 22), rot: SIDE(side), seed: R(), h: 0, parts: 'eyLamp', ahead: z.ahead ?? 30 }); } },
  },
});

// ---------- the rooms: the stacks, the archive, the scriptorium, the reading room ----------
const flatRing = (W = 40, H = 36) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const LIBRARY = {
  rings: { flat: flatRing },
  ringOf: () => 'flat',
  styles: { stacks: 0, archive: 1, script: 2, reading: 3 },
  dims: { stacks: [40, 42], archive: [34, 30], script: [36, 38], reading: [46, 48] },
  lights: (id) => ({ 0: [22, 11], 1: [16, 8], 2: [20, 10], 3: [24, 12] }[id] || null),
};

function roomMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uWarm: { value: new THREE.Color(0xffb860) }, uLight: { value: new THREE.Color(1, 1, 1) }, uMoon: { value: new THREE.Color(0x8aa8ff) }, uFlash: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uFlash;
      uniform vec3 uFog, uCam, uWarm, uLight, uMoon;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      // shelves of books: spines of every colour, gold bands, the boards between
      vec3 shelves(float u, float h, out float bright){
        float row = floor(h / 3.0), fy = fract(h / 3.0);
        float wid = 0.28 + 0.35 * h2(vec2(floor(u / 0.45), row));
        float id = floor(u / wid + row * 3.7);
        vec3 c = h2(vec2(id, 1.0)) < 0.25 ? vec3(0.42, 0.1, 0.08) : h2(vec2(id, 1.0)) < 0.5 ? vec3(0.1, 0.24, 0.14) : h2(vec2(id, 1.0)) < 0.7 ? vec3(0.1, 0.14, 0.3) : h2(vec2(id, 1.0)) < 0.85 ? vec3(0.36, 0.22, 0.1) : vec3(0.5, 0.42, 0.24);
        float top = 0.62 + 0.3 * h2(vec2(id, 4.0));
        c *= 0.75 + 0.35 * h2(vec2(id, 3.0));
        c = mix(c, vec3(0.75, 0.6, 0.3), step(abs(fy - 0.25), 0.02) + step(abs(fy - top + 0.08), 0.02));
        c *= 0.6 + 0.4 * smoothstep(0.0, 0.08, fract(u / wid));
        c = mix(c, vec3(0.03, 0.02, 0.015), step(top, fy));
        c = mix(c, vec3(0.2, 0.12, 0.06), step(fy, 0.07));
        bright = step(fy, top);
        // (where the spines get down to a few pixels the row settles to its average, the gold bands to a
        // haze: drawn sharp, the far shelves sparkled down both walls)
        vec2 fw = fwidth(vec2(u / 0.45, h / 3.0)); float far = smoothstep(0.15, 0.5, max(fw.x, fw.y));
        vec3 avg = mix(vec3(0.2, 0.13, 0.09), vec3(0.03, 0.02, 0.015), step(0.85, fy)) * mix(1.0, 0.85, step(fy, 0.07));
        c = mix(c, avg, far); bright = mix(bright, 0.85, far);
        return c;
      }
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float st = uStyle;
        float wa = part == 6 ? x * 1.3 + 9.0 : (side > 0.0 ? along + 11.0 : along);
        vec2 fx = st < 0.5 ? vec2(22.0, 11.0) : st < 1.5 ? vec2(16.0, 8.0) : st < 2.5 ? vec2(20.0, 10.0) : vec2(24.0, 12.0);
        float dl = mod(along - fx.y + fx.x * 0.5, fx.x) - fx.x * 0.5;
        float lightK = 0.5 + 0.55 * exp(-dl * dl / (fx.x * fx.x * 0.1));
        vec3 glow = vec3(0.0);
        vec3 col;
        float notCap = part == 6 ? 0.0 : 1.0;
        if (part == 7) {
          // the library from the street: pale stone, columns, a frieze, tall windows lit gold behind them
          col = vec3(0.62, 0.58, 0.52) * (0.85 + 0.15 * n2(vec2(x, h) * 0.25));
          float colm = smoothstep(0.0, 0.4, abs(fract(x / 10.0) - 0.5) - 0.32);
          col *= 0.75 + 0.25 * colm;
          float win = step(0.4, abs(fract(x / 10.0) - 0.5)) * 0.0 + step(abs(fract(x / 10.0) - 0.5), 0.18) * step(10.0, h) * step(h, 32.0) * step(16.0, abs(x));
          col = mix(col, vec3(0.06, 0.04, 0.03), win); glow += uWarm * win * (0.5 + 0.4 * h2(vec2(floor(x / 10.0), 2.0)));
          col = mix(col, vec3(0.5, 0.46, 0.4), step(abs(h - 38.0), 2.5));
          col *= 0.8;
          glow += uWarm * 0.12 * smoothstep(30.0, 0.0, h);
        }
        else if (part == 8) { col = vec3(0.3, 0.22, 0.14); glow += uWarm * 0.15; }
        else if (st < 0.5 || st > 2.5) {
          // the stacks (and the reading room): shelves to the ceiling, a gallery rail, ladders; wood floor, a red runner
          if (part == 0) { vec2 q = vec2(x / 1.6, along / 9.0 + floor(x / 1.6) * 0.37); col = vec3(0.26, 0.15, 0.08) * (0.75 + 0.3 * h2(floor(q))) * (0.85 + 0.15 * edge(fract(q), 0.03)); col = mix(col, vec3(0.36, 0.06, 0.06) * (0.85 + 0.15 * n2(vec2(x, along) * 0.8)), step(abs(x), 5.0)); col = mix(col, vec3(0.6, 0.45, 0.2), step(abs(abs(x) - 5.0), 0.25)); }
          else if (part == 3) { col = vec3(0.14, 0.09, 0.05); float beam = step(abs(fract(along / 8.0) - 0.5), 0.06); col = mix(col, vec3(0.08, 0.05, 0.03), beam); if (st > 2.5) { vec2 q = fract(vec2(x, along) / 14.0) - 0.5; col = mix(col, vec3(0.7, 0.55, 0.25), smoothstep(0.03, 0.0, abs(length(q) - 0.4))); } }
          else {
            float b; vec3 sh = shelves(wa, h, b);
            col = sh;
            col = mix(col, vec3(0.22, 0.13, 0.07), step(abs(h - 20.5), 0.8));
            col = mix(col, vec3(0.65, 0.5, 0.24), step(abs(h - 22.5), 0.25) + step(abs(mod(wa, 3.0) - 1.5), 0.08) * step(20.5, h) * step(h, 22.5));
            // a ladder now and then
            float lu = mod(wa, 30.0);
            float ladder = (step(abs(lu - 8.0 - h * 0.08), 0.18) + step(abs(lu - 11.0 - h * 0.08), 0.18) + step(abs(fract(h / 1.2) - 0.5), 0.05) * step(8.0 + h * 0.08, lu) * step(lu, 11.0 + h * 0.08)) * step(h, 20.0) * notCap;
            col = mix(col, vec3(0.45, 0.3, 0.15), clamp(ladder, 0.0, 1.0));
            col = mix(col, vec3(0.05, 0.03, 0.02), step(h, 1.0));
          }
        } else if (st < 1.5) {
          // the archive: card-catalogue drawers floor to ceiling, brass pulls, little cream labels
          if (part == 0) { vec2 q = vec2(x, along) / 4.0; col = vec3(0.3, 0.28, 0.26) * (0.85 + 0.15 * h2(floor(q))) * (0.85 + 0.15 * edge(fract(q), 0.03)); }
          else if (part == 3) { col = vec3(0.08, 0.07, 0.06); }
          else {
            vec2 q = vec2(wa / 1.6, h / 1.0); vec2 c = floor(q), f = fract(q);
            col = vec3(0.4, 0.27, 0.15) * (0.8 + 0.25 * h2(c)) * (0.75 + 0.25 * edge(f, 0.08));
            float label = step(abs(f.x - 0.5), 0.2) * step(abs(f.y - 0.68), 0.12);
            col = mix(col, vec3(0.85, 0.8, 0.68), label);
            float pull = smoothstep(0.12, 0.05, length(vec2((f.x - 0.5) * 1.6, f.y - 0.32)));
            col = mix(col, vec3(0.8, 0.6, 0.3), pull);
            col = mix(col, vec3(0.06, 0.05, 0.04), step(26.0, h));
            float open = step(0.92, h2(c + floor(uTime * 0.5))) * notCap; col *= 1.0 - open * 0.7;
          }
        } else {
          // the scriptorium: stone, tall arched windows full of the storm, rib vaults over
          if (part == 0) { vec2 q = vec2(x, along) / vec2(3.0, 2.0); vec2 c = floor(q + vec2(0.0, mod(floor(q.x), 2.0) * 0.5)); col = vec3(0.32, 0.3, 0.28) * (0.8 + 0.25 * h2(c)) * (0.85 + 0.15 * edge(fract(q), 0.04)); }
          else if (part == 3) { col = vec3(0.24, 0.22, 0.2); float rib = step(abs(fract(along / 12.0) - 0.5), 0.03) + step(abs(fract((along + x) / 17.0) - 0.5), 0.02) + step(abs(fract((along - x) / 17.0) - 0.5), 0.02); col = mix(col, vec3(0.12, 0.11, 0.1), clamp(rib, 0.0, 1.0)); }
          else {
            vec2 sq = vec2(wa / 2.4 + mod(floor(h / 1.2), 2.0) * 0.5, h / 1.2); col = vec3(0.36, 0.34, 0.31) * (0.8 + 0.25 * h2(floor(sq))) * (0.85 + 0.15 * edge(fract(sq), 0.06));
            float u = mod(wa, 16.0) - 8.0;
            float win = step(abs(u), 3.0) * step(8.0, h) * step(h, 26.0 + 3.0 * sqrt(max(0.0, 9.0 - u * u))) * notCap;
            vec3 glass = mix(uMoon * 0.35, uMoon * 0.8, n2(vec2(u * 0.5, h * 0.3 + uTime * 0.3))) * (0.6 + 0.4 * step(0.08, abs(fract(u / 2.0) - 0.5)));
            col = mix(col, glass, win); glow += uMoon * win * (0.25 + 1.6 * uFlash);
          }
        }
        col *= lightK * uLight;
        col += glow;
        col += uMoon * uFlash * 0.25 * notCap;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the great book on its lectern, the new letters lighting on its pages ----------
export class BookFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? 0;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    const wood = selfLit({ roughness: 0.6 }, 0.12);
    this.group.add(new THREE.Mesh(merge([paint(box(30, 2, 18, 0, 1, 0), WOOD), paint(cyl(4, 6, 20, 16, 0, 12, 0), WOOD), paint(box(46, 2.4, 30, 0, 23, 2), rgb(0x3a2010))]), wood));
    // the book open on the lectern, tipped toward you
    this.book = new THREE.Group(); this.book.position.set(0, 25, 2); this.book.rotation.x = 0.55; this.group.add(this.book);
    const pages = new THREE.MeshStandardMaterial({ map: tex().page, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex().page, emissiveIntensity: 0.85, side: THREE.DoubleSide });
    const spread = new THREE.PlaneGeometry(44, 30, 24, 1); const pp = spread.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, 2.4 * (1 - Math.pow(pp.getX(i) / 22, 2)) - 2.4 + Math.abs(pp.getX(i)) * 0.0); spread.computeVertexNormals();
    const sp = new THREE.Mesh(spread, pages); sp.rotation.x = -Math.PI / 2; sp.position.y = 1.4; this.book.add(sp);
    this.book.add(new THREE.Mesh(merge([paint(box(46, 1.6, 31, 0, 0, 0), rgb(0x4a0e0a)), paint(box(46.4, 0.4, 31.4, 0, -0.9, 0), rgb(0xc8a050))]), selfLit({ roughness: 0.6 }, 0.15)));
    // a page lifting and turning over, again and again
    this.leaf = new THREE.Group(); this.leaf.position.set(0, 1.6, 0); this.book.add(this.leaf);
    const lg = new THREE.PlaneGeometry(21, 29); lg.translate(10.5, 0, 0); lg.rotateX(-Math.PI / 2);
    this.leafMesh = new THREE.Mesh(lg, pages); this.leaf.add(this.leafMesh);
    // the new letters: glowing where the pen writes them
    this.glyphMat = new THREE.MeshBasicMaterial({ color: 0xa81818, alphaMap: tex().glyph, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.glyphs = [];
    for (let k = 0; k < 12; k++) { const g = new THREE.PlaneGeometry(4.2, 4.2); const c = (k * 5) % 16, u0 = (c % 4) / 4, v0 = 1 - (Math.floor(c / 4) + 1) / 4; const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) / 4, v0 + uv.getY(i) / 4); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, this.glyphMat); const page = k < 6 ? -1 : 1, idx = k % 6; m.position.set(page * (7 + (idx % 2) * 8), 1.9, -9 + Math.floor(idx / 2) * 8); this.book.add(m); this.glyphs.push(m); }
    // candles round it
    this.candles = [];
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, r = 30 + (k % 2) * 6, hh = 6 + (k % 3) * 3; const c = new THREE.Mesh(merge([paint(cyl(1.2, 1.4, hh, 12, 0, 0, 0), rgb(0xf0e8d8)), paint(cyl(2.4, 2.8, 1, 12, 0, -hh / 2, 0), BRASS)]), selfLit({ roughness: 0.6 }, 0.4)); c.position.set(Math.cos(a) * r, hh / 2 + 1, Math.sin(a) * r); c.userData.top = hh / 2 + 1.2; this.group.add(c); this.candles.push(c); }
    this.fired = false; this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() { this.fired = true; }
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = floorAt(this.course, this.t);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + Math.PI + (this.cfg.rot ?? 0), 0);
    const c = this.cfg, k = smooth(c.write ?? 0, (c.write ?? 0) + 6, songT);
    const turn = ((songT * 0.25) % 1); this.leaf.rotation.z = Math.PI * smooth(0.1, 0.9, turn);
    this.glyphs.forEach((g, j) => { g.material.opacity = 1; g.visible = k * 12 > j; g.scale.setScalar(0.8 + 0.2 * Math.sin(songT * 3 + j)); });
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    for (const cd of this.candles) { this._w.set(0, cd.userData.top, 0).applyMatrix4(cd.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 4, CANDLE, 1.3 + 0.15 * Math.sin(songT * 13 + cd.position.x)); }
    this.book.updateMatrixWorld(true); this._w.set(0, 6, 0).applyMatrix4(this.book.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 30, GOLDEN, 0.12 + 0.2 * k);
    this._w.set(0, 0, 0).applyMatrix4(this.group.matrixWorld); S.pool(this._w.x, this._w.y + 0.2, this._w.z, 70, CANDLE, 0.5);
  }
}

// ---------- the place, per frame ----------
export class LibraryWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = roomMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, LIBRARY));
    this._g = new THREE.Vector3(); this.flash = 0;
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, t = S.rider.t;
    u.uTime.value = time; u.uCam.value.copy(camera.position);
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uWarm.value.set(P.lamp ?? 0xffb860); u.uMoon.value.set(P.moon ?? 0x8aa8ff);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    // lightning through the windows with the thunder
    let f = 0; for (const m of S.entry.moments || []) if (m.kind === 'thunder' && t > m.t && t < m.t + 0.9) f = Math.max(f, (1 - (t - m.t) / 0.9) * (0.6 + 0.4 * Math.sin((t - m.t) * 40)));
    u.uFlash.value = f;
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    const M = S.town.mats;
    if (M.eyTraceM) { M.eyTraceM.uniforms.uTime.value = time; M.eyTraceM.uniforms.uFlat.value = 1; }
    S.town._recT = time * 0.8;
  }
  // candle chandeliers in the stacks, green lamps in the archive, candles in the scriptorium
  draw(T) {
    const g = this._g;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(this.S.course, f.t);
        if (r.style === 1) { for (const x of [-12, 12]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 6, g.z, 6, [0.5, 1, 0.6], 0.8); T.pool(g.x, fy + 0.08, g.z, 22, [0.75, 0.95, 0.7], 0.3); } continue; }
        if (r.style === 2) { for (const x of [-20, 20]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + 10, g.z, 4, CANDLE, 1.2); } this.S.track.ground(f.t, 0, g); T.pool(g.x, fy + 0.08, g.z, 30, CANDLE, 0.3); continue; }
        this.S.track.ground(f.t, 0, g); T.glow(g.x, fy + r.H - 9, g.z, 14, CANDLE, 0.9);
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; T.glow(g.x + Math.cos(a) * 5, fy + r.H - 10, g.z + Math.sin(a) * 5, 1.6, CANDLE, 1.4); }
        T.pool(g.x, fy + 0.08, g.z, 44, CANDLE, 0.4);
      }
    }
  }
}
