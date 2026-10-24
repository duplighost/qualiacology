// Cunt Holiday. A grand hotel on the coast, all of it charged to him. Up the drive at golden hour
// under the palms, the sea on the left: the luggage cart, the minibar, the robe, the gold case, the
// black card, the bell, the ice and the champagne. The pool party: the tray, the first-class tag, the
// rosé tower, the shaker spraying glitter; mini bottles strung over the road, the tab; the motorcade.
// The lobby, the bar: the olive, the better car on its turntable, the flowers, the towel swans; the
// hall. Sunset at the pool; then night: the white boat, wet tile, the fruit on its silver cart, the
// art, the lipstick glass, the perfume, the chandelier; three, two, one and fireworks over the marina;
// the valet; the ballroom: cash, a scandal, the buffet; and at dawn the white boat leaving.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function canvasTex(w, h, draw, wrap = false) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
function signFace(w, h, x = 0, y = 0, z = 0) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(x, y, z); return g; }
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VC = (M, key, opts) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }));
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const lit = (M, key, map, k = 1, opts = {}) => M[key] || (M[key] = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(k, k, k), side: THREE.DoubleSide, ...opts }));
const paper = (M, key, map, k = 0.5) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.7, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide }));
const SERIF = 'Didot, "Bodoni MT", "Times New Roman", serif';
const FONT = '"Arial Black", Impact, sans-serif';
const GOLD = rgb(0xe8b850), BRASS = rgb(0xc89a48), SILVER = rgb(0xd8dce4), WHITE = rgb(0xf6f4ee);
const WARM = [1, 0.82, 0.55], PINK = [1, 0.55, 0.72];

// ---------- the pictures ----------
// the hotel's front: cream stone, an arched window to each bay with its little balcony, the
// awnings; the lit ones are in the glow picture
function facadeTextures() {
  const W = 512, H = 256, bays = 4;
  const draw = (g, glow) => {
    g.fillStyle = glow ? '#000' : '#efe6d4'; g.fillRect(0, 0, W, H);
    if (!glow) { for (let y = 0; y < H; y += 32) { g.fillStyle = 'rgba(160,140,110,0.12)'; g.fillRect(0, y, W, 2); } g.fillStyle = '#d8c8a8'; g.fillRect(0, H - 14, W, 14); }
    const R = seeded(17);
    for (let b = 0; b < bays; b++) {
      const x0 = b * 128 + 30, w = 68, y0 = 64, h = 130;
      const on = R();
      if (glow) { if (on > 0.35) { const k = 0.55 + 0.45 * R(); g.fillStyle = `rgba(255,${190 + 40 * R() | 0},${110 + 50 * R() | 0},${k})`; g.beginPath(); g.moveTo(x0, y0 + h); g.lineTo(x0, y0 + 34); g.arc(x0 + w / 2, y0 + 34, w / 2, Math.PI, 0); g.lineTo(x0 + w, y0 + h); g.closePath(); g.fill(); } continue; }
      g.fillStyle = '#1a2230'; g.beginPath(); g.moveTo(x0, y0 + h); g.lineTo(x0, y0 + 34); g.arc(x0 + w / 2, y0 + 34, w / 2, Math.PI, 0); g.lineTo(x0 + w, y0 + h); g.closePath(); g.fill();
      g.strokeStyle = '#f8f4ea'; g.lineWidth = 6; g.stroke();
      g.fillStyle = '#f8f4ea'; g.fillRect(x0 + w / 2 - 2, y0 + 10, 4, h - 10);
      // the balcony rail
      g.fillStyle = '#f8f4ea'; g.fillRect(x0 - 10, y0 + h - 4, w + 20, 6); for (let k = 0; k <= 8; k++) g.fillRect(x0 - 8 + k * (w + 16) / 8, y0 + h - 30, 3, 28); g.fillRect(x0 - 10, y0 + h - 32, w + 20, 4);
      // the awning, blue and white
      for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#f4f4f0' : '#2a5a9a'; g.beginPath(); const ax = x0 - 8 + k * (w + 16) / 8; g.moveTo(ax, y0 - 6); g.lineTo(ax + (w + 16) / 8, y0 - 6); g.lineTo(ax + (w + 16) / 8 + 2, y0 + 16); g.lineTo(ax + 2, y0 + 16); g.closePath(); g.fill(); }
    }
  };
  return { map: canvasTex(W, H, (g) => draw(g, false), true), glow: canvasTex(W, H, (g) => draw(g, true), true) };
}
// the cheque on the tray, made out to cash
function chequeTexture() {
  return canvasTex(768, 352, (g, W, H) => {
    g.fillStyle = '#f2ecd8'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#b8a070'; g.lineWidth = 10; g.strokeRect(10, 10, W - 20, H - 20);
    g.fillStyle = '#2a2a30'; g.font = `700 30px ${SERIF}`; g.fillText('PAY TO THE ORDER OF', 44, 110);
    g.fillRect(380, 112, 340, 3); g.fillRect(44, 202, 460, 3);
    g.strokeStyle = '#2a2a30'; g.lineWidth = 3; g.strokeRect(540, 150, 180, 64);
    g.font = `900 40px ${SERIF}`; g.fillText('$ 1,000,000', 548, 196);
    g.font = `italic 700 44px ${SERIF}`; g.fillStyle = '#1a2a6a'; g.fillText('Cash', 420, 104);
    g.strokeStyle = '#1a2a6a'; g.lineWidth = 4; g.beginPath(); g.moveTo(470, 300); for (let k = 0; k < 14; k++) g.lineTo(480 + k * 16, 290 + Math.sin(k * 1.7) * 18); g.stroke();
    g.fillStyle = '#2a2a30'; g.fillRect(450, 312, 270, 3);
  });
}
function tagTexture() {
  return canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#3a1a10'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#d8b060'; g.lineWidth = 6; g.setLineDash([14, 10]); g.strokeRect(18, 18, W - 36, H - 36); g.setLineDash([]);
    g.fillStyle = '#f2c86a'; g.font = `900 70px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#f2c86a'; g.shadowBlur = 8;
    g.fillText('FIRST', W / 2, 92); g.fillText('CLASS', W / 2, 168);
  });
}
// the tab: a long receipt, line after line of minibar
function receiptTexture() {
  return canvasTex(256, 1024, (g, W, H) => {
    g.fillStyle = '#f8f6f0'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a2a30'; g.font = '700 22px "Courier New", monospace';
    const items = ['MINIBAR', 'MINIBAR', 'CHAMPAGNE', 'MINIBAR', 'ROOM SVC', 'MINIBAR', 'SPA', 'MINIBAR', 'VALET', 'MINIBAR', 'ROSE', 'MINIBAR', 'CAVIAR', 'MINIBAR', 'MINIBAR', 'SUITE', 'MINIBAR', 'MINIBAR', 'FLOWERS', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'BOAT', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR', 'MINIBAR'];
    const R = seeded(31);
    items.forEach((s, i) => { const y = 40 + i * 25; g.textAlign = 'left'; g.fillText(s, 16, y); g.textAlign = 'right'; g.fillText((20 + R() * 480).toFixed(2), W - 16, y); });
  }, true);
}
// three paintings for the gallery: colour fields, a sun, stripes
function artTexture() {
  return canvasTex(1536, 512, (g) => {
    let x = 0;
    g.fillStyle = '#c84a2a'; g.fillRect(x, 0, 512, 512); g.fillStyle = '#e8a040'; g.fillRect(x + 40, 40, 432, 200); g.fillStyle = '#5a1a2a'; g.fillRect(x + 40, 280, 432, 190);
    x = 512; g.fillStyle = '#1a3a6a'; g.fillRect(x, 0, 512, 512); g.fillStyle = '#f2c86a'; g.beginPath(); g.arc(x + 256, 210, 130, 0, 7); g.fill(); g.fillStyle = '#ff8ab8'; g.fillRect(x, 360, 512, 152); g.fillStyle = '#f4f0e8'; for (let k = 0; k < 6; k++) g.fillRect(x + 20 + k * 80, 380 + (k % 2) * 30, 40, 12);
    x = 1024; for (let k = 0; k < 8; k++) { g.fillStyle = ['#f4efe6', '#2a2a30', '#e8b850', '#ff8ab8'][k % 4]; g.fillRect(x + k * 64, 0, 64, 512); } g.fillStyle = 'rgba(20,20,30,0.9)'; g.beginPath(); g.arc(x + 256, 256, 90, 0, 7); g.fill();
  });
}
function noteTexture() {
  return canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#e8d0d8'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#a86a80'; g.lineWidth = 8; g.strokeRect(12, 12, W - 24, H - 24);
    g.fillStyle = '#c87a98'; g.beginPath(); g.ellipse(W / 2, H / 2, 90, 70, 0, 0, 7); g.fill();
    g.fillStyle = '#f8eef2'; g.font = `900 64px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('100', W / 2, H / 2 + 4);
    g.fillStyle = '#8a4a60'; g.font = `900 46px ${SERIF}`; g.fillText('100', 66, 50); g.fillText('100', W - 66, H - 46);
  });
}
function paperTexture() {
  return canvasTex(512, 640, (g, W, H) => {
    g.fillStyle = '#ece8dc'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#16161a'; g.font = `900 92px ${FONT}`; g.textAlign = 'center'; g.fillText('SCANDAL', W / 2, 110);
    g.fillRect(24, 132, W - 48, 6);
    g.fillStyle = '#c8b8a0'; g.fillRect(24, 156, 220, 170);
    const R = seeded(8); g.fillStyle = '#3a3a40';
    for (let c = 0; c < 2; c++) for (let k = 0; k < 18; k++) { if (c === 0 && k < 7) continue; g.fillRect(24 + c * 240, 160 + k * 25, 200 + R() * 20, 8); }
    for (let k = 0; k < 7; k++) g.fillRect(264, 160 + k * 25, 200 + R() * 20, 8);
  });
}
// the black card: no name on it, a gold chip
function cardTexture() {
  return canvasTex(512, 320, (g, W, H) => {
    const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, '#24242a'); grd.addColorStop(1, '#08080a'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = '#d8b060'; g.fillRect(56, 110, 74, 56); g.strokeStyle = '#8a6a30'; g.lineWidth = 3; for (const y of [128, 148]) { g.beginPath(); g.moveTo(56, y); g.lineTo(130, y); g.stroke(); }
    g.fillStyle = '#c8c8d0'; g.font = '700 34px "Courier New", monospace'; g.fillText('0000  0000  0000  0001', 56, 236);
    g.fillStyle = '#8a8a94'; g.font = '700 20px "Courier New", monospace'; g.fillText('CHARGED TO HIM', 56, 280);
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { facade: facadeTextures(), cheque: chequeTexture(), tag: tagTexture(), receipt: receiptTexture(), art: artTexture(), note: noteTexture(), paper: paperTexture(), card: cardTexture() });

// ---------- materials ----------
// the pool: clear blue over white tile, the light moving on the floor of it; lit from under at night
function poolMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uSun: { value: new THREE.Color(1, 0.9, 0.7) }, uSky: { value: new THREE.Color(0.6, 0.75, 0.9) }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: `varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uNight, uFogDensity; uniform vec3 uSun, uSky, uFog, uCam; varying vec3 vW; varying vec2 vUv;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = vW.xz * 0.35;
        float c1 = n2(p + vec2(uTime * 0.6, uTime * 0.3)), c2 = n2(p * 1.7 - vec2(uTime * 0.4, -uTime * 0.5));
        float caus = pow(1.0 - abs(c1 - c2), 6.0);
        vec2 tq = fract(vW.xz / 1.2); float tile = smoothstep(0.0, 0.06, min(min(tq.x, 1.0 - tq.x), min(tq.y, 1.0 - tq.y)));
        float edge = smoothstep(0.0, 0.1, min(vUv.x, 1.0 - vUv.x));
        vec3 day = mix(vec3(0.05, 0.42, 0.62), vec3(0.22, 0.78, 0.86), edge * 0.6) * (0.85 + 0.15 * tile) + uSun * caus * 0.5;
        vec3 night = mix(vec3(0.02, 0.35, 0.55), vec3(0.1, 0.8, 0.95), 0.5 + 0.5 * edge) * (0.75 + 0.25 * tile) * 1.5 + vec3(0.6, 1.0, 1.0) * caus * 0.7;
        vec3 col = mix(day, night, uNight);
        vec3 V = normalize(uCam - vW);
        float fres = pow(1.0 - max(V.y, 0.0), 4.0);
        col = mix(col, uSky, fres * 0.55 * (1.0 - uNight * 0.6));
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}
function hotelMaterial(M) {
  if (M.chHotelM) return M.chHotelM;
  const t = tex().facade;
  const m = new THREE.MeshStandardMaterial({ map: t.map, emissive: 0xffffff, emissiveMap: t.glow, emissiveIntensity: 0.1, roughness: 0.85 });
  M.chHotelM = m; return m;
}
// a colour per instance, lit (the palms' fronds, the umbrellas, the swans)
function tintLit(rough = 0.6, metal = 0, k = 0.1) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: rough, metalness: metal, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';');
  };
  return m;
}

// ---------- the hotel's things, at its scale ----------
function palmTrunk() {
  const N = 14, R = 7, pos = [], col = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, y = u * 24, bx = 3.2 * u * u, r = (1.0 - 0.45 * u) * (i % 2 ? 0.92 : 1.05);
    for (let j = 0; j < R; j++) { const a = j / R * Math.PI * 2; pos.push(bx + Math.cos(a) * r, y, Math.sin(a) * r); const k = i % 2 ? 0.75 : 1; col.push(0.42 * k, 0.32 * k, 0.22 * k); }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + (j + 1) % R, c = a + R, d = b + R; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return merge([g, paint(sph(0.9, 1, 1, 1, 2.6, 23.4, 0.9), rgb(0x4a3418)), paint(sph(0.9, 1, 1, 1, 3.6, 23.2, -0.6), rgb(0x4a3418)), paint(sph(0.9, 1, 1, 1, 3.4, 23.6, 0.9), rgb(0x4a3418))]);
}
function palmFronds() {
  const parts = [];
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * Math.PI * 2 + 0.3, L = 9 + (k % 3), droop = 0.55 + 0.15 * (k % 2);
    const pos = [], col = [], idx = [], S = 12;
    for (let i = 0; i <= S; i++) {
      const u = i / S, r = u * L, y = 1.2 * u * L * 0.35 - droop * r * r / L, w = Math.sin(Math.PI * Math.min(1, u * 1.15)) * 1.5 + 0.1;
      for (const sd of [-1, 0, 1]) { const lx = r, lz = sd * w, ly = y - Math.abs(sd) * 0.35; pos.push(Math.cos(a) * lx - Math.sin(a) * lz, ly, Math.sin(a) * lx + Math.cos(a) * lz); const g = 0.75 + 0.25 * u; col.push(0.16 * g, 0.42 * g, 0.18 * g); }
    }
    for (let i = 0; i < S; i++) for (let j = 0; j < 2; j++) { const a0 = i * 3 + j, b0 = a0 + 1, c0 = a0 + 3, d0 = b0 + 3; idx.push(a0, c0, b0, b0, c0, d0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    parts.push(g);
  }
  const g = merge(parts); g.translate(3.2, 24, 0); return g;
}
function hotelBlock() {
  // 72 along the road, 44 tall, 30 deep; UVs in metres so the bays repeat
  const g = new THREE.BoxGeometry(72, 44, 30); g.translate(0, 22, 0);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = n.getX(i), ny = n.getY(i), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (Math.abs(ny) > 0.5) uv.setXY(i, 0.01, 0.99); else if (Math.abs(nx) > 0.5) uv.setXY(i, z / 24, y / 11); else uv.setXY(i, x / 24, y / 11);
  }
  return g;
}
function hotelRoof() {
  const parts = [paint(box(74, 2.4, 32, 0, 45.2, 0), rgb(0xe8dcc4)), paint(box(30, 8, 14, 0, 50, 0), rgb(0xe8dcc4)), paint(box(31, 1.4, 15, 0, 54.7, 0), rgb(0xd8b868))];
  for (const x of [-30, 30]) parts.push(paint(box(8, 5, 8, x, 48.9, 6), rgb(0xe8dcc4)));
  return merge(parts);
}
const HG = {
  // the luggage cart: brass frame, red carpet base, a stack of cases
  cart() {
    const parts = [];
    parts.push(paint(box(8, 0.8, 4.6, 0, 1.4, 0), rgb(0x8a1a1a)));
    for (const x of [-3.6, 3.6]) for (const z of [-2, 2]) parts.push(paint(cyl(0.12, 0.12, 9, 8, x, 5.8, z), BRASS));
    const arch = new THREE.TorusGeometry(3.6, 0.14, 8, 24, Math.PI); arch.translate(0, 10.3, 0); parts.push(paint(arch, BRASS)); const arch2 = arch.clone(); arch2.translate(0, 0, -2); parts.push(paint(arch2, BRASS)); arch.translate(0, 0, 2);
    for (const [x, z] of [[-3.4, 1.8], [3.4, 1.8], [-3.4, -1.8], [3.4, -1.8]]) parts.push(paint(cyl(0.5, 0.5, 0.4, 12, x, 0.5, z).rotateX(Math.PI / 2), rgb(0x1a1a1e)));
    const cases = [[0, 2.8, 0, 7, 2.2, 3.8, 0x2a4a8a], [0.4, 4.9, 0, 6, 2.0, 3.4, 0xc8a060], [-0.5, 6.8, 0.2, 5, 1.8, 3.0, 0x8a2a3a], [0.3, 8.4, -0.1, 3.6, 1.4, 2.4, 0x1a5a4a]];
    for (const [x, y, z, w, h, d, c] of cases) { parts.push(paint(box(w, h, d, x, y, z), rgb(c))); parts.push(paint(box(w + 0.05, 0.3, d + 0.05, x, y, z), BRASS)); parts.push(paint(box(1.2, 0.4, 0.3, x, y + h / 2 + 0.2, z), rgb(0x2a1a10))); }
    return merge(parts);
  },
  // the minibar: a little fridge the size of a house, the door open, the light on inside
  minibar() {
    const parts = [], wood = rgb(0x5a3a22);
    parts.push(paint(box(14, 18, 1, 0, 9, -6), wood)); for (const x of [-7, 7]) parts.push(paint(box(1, 18, 12, x, 9, 0), wood)); parts.push(paint(box(15, 1, 12, 0, 18.4, 0), wood)); parts.push(paint(box(15, 1, 12, 0, 0.5, 0), wood));
    for (const y of [5, 9.5, 14]) parts.push(paint(box(13, 0.3, 11, 0, y, 0), rgb(0xd8dce4)));
    const door = box(13.6, 17, 1.2, 6.8, 0, 0); door.translate(0, 9.4, 0); door.rotateY(-1.9); door.translate(7, 0, 6); parts.push(paint(door, wood));
    return merge(parts);
  },
  // the little bottles on the minibar's shelves (bright, lit from the fridge)
  minis() {
    const parts = [], cols = [0x6a3a10, 0xe8e8f0, 0x2a6a2a, 0xc83a2a, 0xe8b850, 0x3a2a6a];
    for (const [y, n] of [[5.15, 8], [9.65, 7], [14.15, 6]]) for (let k = 0; k < n; k++) { const x = -5.6 + k * (11.2 / (n - 1)), c = rgb(cols[(k + Math.round(y)) % cols.length]); parts.push(paint(lathe([[0, 0], [0.55, 0], [0.55, 2.2], [0.25, 2.8], [0.22, 3.4], [0, 3.4]], 12).translate(x, y, -1.5 + (k % 2) * 2), c)); parts.push(paint(cyl(0.24, 0.24, 0.5, 8, x, y + 3.6, -1.5 + (k % 2) * 2), GOLD)); }
    return merge(parts);
  },
  receipt() { const g = new THREE.PlaneGeometry(3.4, 30, 1, 30); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 15; p.setZ(i, Math.sin(y * 0.22) * 2.4 + y * y * 0.006); } g.translate(0, 15, 0); g.computeVertexNormals(); return g; },
  // the robe on its hanger: terry white, the shawl collar, the sleeves, the belt
  robe() {
    const parts = [], w = WHITE;
    const sh = new THREE.Shape(); sh.moveTo(-6, 13); sh.quadraticCurveTo(-7.4, 4, -6.6, -12); sh.lineTo(6.6, -12); sh.quadraticCurveTo(7.4, 4, 6, 13); sh.quadraticCurveTo(0, 15.5, -6, 13);
    const body = new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 3 }); body.translate(0, 0, -1.2); parts.push(paint(body, w));
    for (const s of [-1, 1]) { const sl = cyl(1.9, 2.4, 13, 12, 0, 0, 0); sl.rotateZ(s * 0.5); sl.translate(s * 8.6, 6.4, 0); parts.push(paint(sl, w)); }
    for (const s of [-1, 1]) { const col = box(2.2, 16, 0.8, 0, 0, 0); col.rotateZ(s * 0.28); col.translate(s * 2.4, 6.6, 1.9); parts.push(paint(col, rgb(0xece8de))); }
    parts.push(paint(box(14.4, 1.4, 3.6, 0, -1, 0.4), rgb(0xece8de))); for (const s of [-1, 1]) parts.push(paint(box(1.2, 6, 0.6, s * 1.4, -4.4, 2.2), rgb(0xece8de)));
    const hook = new THREE.TorusGeometry(1.4, 0.24, 8, 16, Math.PI * 1.4); hook.rotateZ(-0.2); hook.translate(0, 17.4, 0); parts.push(paint(hook, GOLD)); parts.push(paint(box(13, 0.5, 0.5, 0, 14.4, 0), GOLD));
    const crest = new THREE.CircleGeometry(1.3, 20); crest.translate(-3.8, 8.4, 2.25); parts.push(paint(crest, GOLD));
    return merge(parts);
  },
  // the gold case
  goldCase() { const parts = [], g = GOLD; parts.push(paint(box(16, 11, 5, 0, 5.5, 0), g)); for (const y of [2.6, 8.4]) parts.push(paint(box(16.2, 0.7, 5.2, 0, y, 0), rgb(0xa8822e))); for (const x of [-7.4, 7.4]) parts.push(paint(box(1.4, 11.2, 5.3, x, 5.5, 0), rgb(0xc89a3a))); const hd = new THREE.TorusGeometry(2.2, 0.45, 8, 16, Math.PI); hd.translate(0, 11, 0); parts.push(paint(hd, rgb(0x4a2a10))); for (const x of [-4, 4]) parts.push(paint(box(1.4, 1.4, 0.6, x, 10, 2.6), rgb(0xf0d070))); return merge(parts); },
  // a silver tray and its pedestal; the card or the cheque lies on it
  tray() { return merge([paint(cyl(9, 9, 0.5, 40, 0, 0, 0), SILVER), paint(new THREE.TorusGeometry(9, 0.45, 8, 40).rotateX(Math.PI / 2).translate(0, 0.3, 0), SILVER)]); },
  plate() { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0.62, 0); return g; },
  stand() { return merge([paint(lathe([[0, 0], [5, 0], [5, 0.8], [1.2, 2], [0.8, 10], [1.6, 11], [0, 11]], 24), SILVER)]); },
  // the bell on the front desk
  bell() { const parts = []; parts.push(paint(lathe([[0, 0], [5.4, 0], [5.6, 0.4], [5.2, 1.2], [4.6, 2.8], [3.4, 4.2], [1.8, 5.0], [0, 5.2]], 36), rgb(0xe8c060))); parts.push(paint(cyl(5.8, 6.2, 0.8, 36, 0, -0.4, 0), rgb(0x2a1a14))); parts.push(paint(cyl(0.4, 0.4, 1.8, 10, 0, 5.9, 0), rgb(0xd8b050))); parts.push(paint(sph(0.7, 1, 0.6, 1, 0, 6.9, 0), rgb(0xd8b050))); return merge(parts); },
  desk() { return merge([paint(box(30, 9, 9, 0, 4.5, 0), rgb(0xe8e0d0)), paint(box(31, 0.8, 10, 0, 9.3, 0), rgb(0x3a2a20)), paint(box(30.2, 1, 9.2, 0, 2, 0), GOLD)]); },
  // the ice bucket, the ice, the bottle in it
  bucket() {
    const parts = [];
    parts.push(paint(lathe([[0, 0], [3.6, 0], [3.8, 0.4], [4.4, 7], [4.8, 7.6], [4.9, 8], [0, 8]], 32), SILVER));
    for (let k = 0; k < 12; k++) { const a = k * 2.4, r = 1.6 + (k % 3) * 0.9; const c = box(1.4, 1.4, 1.4, Math.cos(a) * r, 7.6 + (k % 2) * 0.6, Math.sin(a) * r); c.rotateY(k); parts.push(paint(c, rgb(0xd8f0ff))); }
    const bottle = lathe([[0, 0], [1.7, 0], [1.8, 6], [1.6, 7.4], [0.7, 9.2], [0.6, 11.6], [0, 11.6]], 24); bottle.rotateZ(0.32); bottle.translate(-1.2, 3.4, 0); parts.push(paint(bottle, rgb(0x1a3a22)));
    const foil = cyl(0.66, 0.72, 2.4, 16, 0, 0, 0); foil.translate(0, 10.6, 0); foil.rotateZ(0.32); foil.translate(-1.2, 3.4, 0); parts.push(paint(foil, GOLD));
    const lab = cyl(1.84, 1.84, 2.6, 24, 0, 0, 0); lab.translate(0, 3.6, 0); lab.rotateZ(0.32); lab.translate(-1.2, 3.4, 0); parts.push(paint(lab, rgb(0xf2ead2)));
    parts.push(paint(lathe([[0, 0], [3, 0], [3, 0.6], [0.6, 1.4], [0.5, 12], [3.4, 12.4], [0, 12.6]], 20).translate(0, -12.6, 0), SILVER));
    return merge(parts);
  },
  // the first-class tag on its strap
  tag() { const sh = new THREE.Shape(); sh.moveTo(-8, -4); sh.lineTo(8, -4); sh.lineTo(8, 4); sh.lineTo(-8, 4); sh.lineTo(-10, 0); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.3, bevelSegments: 2 }); g.translate(0, 0, -1.0); return merge([paint(g, rgb(0x3a1a10)), paint(cyl(0.35, 0.35, 30, 6, -8.6, 15, -0.7).rotateZ(0.1), rgb(0x2a1a10))]); },
  tagFace() { const g = new THREE.PlaneGeometry(15, 7.4); g.translate(0.6, 0, 0); return g; },
  // a tower of coupes, the rosé in them
  coupeTower(liquid) {
    const parts = [];
    for (let lv = 0; lv < 4; lv++) {
      const n = 4 - lv, y = lv * 3.2;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = (i - (n - 1) / 2) * 3.4, z = (j - (n - 1) / 2) * 3.4;
        if (liquid) parts.push(cyl(1.35, 0.3, 0.8, 16, x, y + 2.7, z));
        else parts.push(lathe([[0, 0], [1.1, 0], [1.1, 0.12], [0.14, 0.3], [0.14, 2.1], [1.6, 3.0], [1.62, 3.1], [0, 2.3]], 16).translate(x, y, z));
      }
    }
    if (!liquid) parts.push(box(16, 0.6, 16, 0, -0.3, 0));
    return merge(parts.map((g) => paint(g, liquid ? [1, 0.6, 0.7] : rgb(0xf0f4f8))));
  },
  bottle() { const g = lathe([[0, 0], [1.7, 0], [1.8, 6], [1.6, 7.4], [0.7, 9.2], [0.6, 11.6], [0, 11.6]], 24); return merge([paint(g, rgb(0xe88aa8)), paint(cyl(0.66, 0.72, 2.4, 16, 0, 10.6, 0), GOLD)]); },
  // the shaker: the cup, the cap, the little top
  shaker() { return merge([paint(lathe([[0, 0], [3.2, 0], [3.4, 0.3], [4.2, 9], [4.3, 9.6], [0, 9.6]], 32), SILVER), paint(lathe([[0, 9.4], [4.4, 9.4], [4.6, 10.2], [3.4, 13], [1.6, 14.2], [1.4, 15.4], [0, 15.4]], 32), rgb(0xe8eaf0)), paint(cyl(1.0, 1.2, 1.6, 16, 0, 16.2, 0), GOLD)]); },
  // a string of little bottles across the road: one segment's bottle
  mini() { return merge([paint(lathe([[0, 0], [0.55, 0], [0.55, 2.2], [0.25, 2.8], [0.22, 3.4], [0, 3.4]], 10), [1, 1, 1]), paint(cyl(0.24, 0.24, 0.5, 8, 0, 3.6, 0), GOLD)]); },
  wire() { return box(1, 0.1, 0.1, 0.5, 0, 0); },
  // the martini: the cone, the stem, the foot; the olive on its pick is its own
  martini() { return merge([paint(lathe([[0.3, 0], [7, 0], [7, 0.4], [0.5, 0.8], [0.45, 14], [11, 24], [11.2, 24.3], [0.6, 14.4]], 40), rgb(0xe8f0f8))]); },
  gin() { return paint(lathe([[0, 15.2], [9.2, 22.2], [0, 22.2]], 40), rgb(0xd8f0e8)); },
  olive(bitten) { const ol = bitten ? new THREE.SphereGeometry(2.4, 20, 14, 0.4, Math.PI * 1.35) : new THREE.SphereGeometry(2.4, 20, 14); ol.scale(1, 1.25, 1); const parts = [paint(ol, rgb(0x5a7a2a)), paint(cyl(0.16, 0.16, 16, 6, 0, 3, 0), rgb(0xe8d8a8))]; if (!bitten) parts.push(paint(sph(0.8, 1, 0.6, 1, 0, 2.7, 0), rgb(0xc83a2a))); else parts.push(paint(sph(1.9, 1, 1.15, 1, 0, 0, 0, 14, 10), rgb(0xd8d8a0))); const g = merge(parts); g.rotateZ(0.5); return g; },
  turntable() { return merge([paint(cyl(16, 17, 2, 48, 0, 1, 0), rgb(0x1a1a20)), paint(cyl(16.2, 16.2, 0.3, 48, 0, 2.1, 0), rgb(0xd8b868))]); },
  // the flowers: a tall urn and the blooms that open; petals are their own layer
  urn() { return paint(lathe([[0, 0], [5, 0], [5.4, 0.6], [3, 2.6], [2.4, 6], [4.6, 11], [5.2, 13], [4.8, 13.6], [0, 13.6]], 32), rgb(0xf0ece4)); },
  bloom() { const parts = []; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, pt = sph(1.6, 1, 0.35, 1.8, 0, 0, 1.6, 12, 8); pt.rotateX(-0.7); pt.rotateY(a); parts.push(pt); } parts.push(sph(1.0, 1, 0.8, 1, 0, 0.3, 0)); return merge(parts.map((g, i) => paint(g, i === 6 ? [1, 0.85, 0.4] : [1, 1, 1]))); },
  // a towel folded into a swan
  swan() {
    const pts = []; for (let k = 0; k <= 20; k++) { const u = k / 20; pts.push(new THREE.Vector3(0, 2 + u * 9 + Math.sin(u * 3.4) * 1.5, 4.5 - u * 3 - Math.sin(u * Math.PI) * 2.6)); }
    const neck = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.75, 10, false);
    return merge([paint(sph(3.2, 1.0, 0.6, 1.6, 0, 1.8, -1), WHITE), paint(neck, WHITE), paint(sph(0.9, 0.9, 0.9, 1.1, 0, 11.1, 1.2), WHITE), paint(cyl(0.1, 0.3, 1.2, 8, 0, 11, 2.4).rotateX(Math.PI / 2), rgb(0xe89a3a))]);
  },
  table() { return merge([paint(box(20, 0.8, 10, 0, 7.6, 0), rgb(0xf4f2ec)), paint(box(20.4, 7.4, 10.4, 0, 3.8, 0), rgb(0xf0eee8))]); },
  // the white boat
  yacht() {
    const parts = [], white = rgb(0xf4f6f8), dark = rgb(0x1a2430);
    const hullShape = (L, B) => { const s = new THREE.Shape(); s.moveTo(-L / 2, -B / 2); s.lineTo(L * 0.18, -B / 2); s.quadraticCurveTo(L * 0.42, -B / 2, L / 2, 0); s.quadraticCurveTo(L * 0.42, B / 2, L * 0.18, B / 2); s.lineTo(-L / 2, B / 2); s.closePath(); return s; };
    const deck = (L, B, h, y, c) => { const g = new THREE.ExtrudeGeometry(hullShape(L, B), { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return paint(g, c); };
    parts.push(deck(60, 13, 5, -1, white)); parts.push(deck(61, 13.4, 0.6, 3.8, rgb(0x2a3a5a)));
    parts.push(deck(40, 10.6, 3.6, 4.4, white)); parts.push(deck(40.6, 11, 1.4, 5.4, dark));
    const s2 = deck(28, 9, 3.2, 8, white); s2.translate(-3, 0, 0); parts.push(s2); const w2 = deck(28.4, 9.3, 1.2, 9, dark); w2.translate(-3, 0, 0); parts.push(w2);
    const s3 = deck(16, 7, 2.6, 11.2, white); s3.translate(-6, 0, 0); parts.push(s3);
    parts.push(paint(cyl(0.3, 0.3, 9, 8, -6, 18, 0), white)); parts.push(paint(box(3, 0.3, 0.3, -6, 20, 0), white));
    return merge(parts);
  },
  // the room-service cart: the cloth, the silver dome lifted, the fruit
  cart2() {
    const parts = [];
    parts.push(paint(box(16, 0.8, 9, 0, 8, 0), rgb(0xf6f4ee))); parts.push(paint(box(16.4, 6, 9.4, 0, 5, 0), rgb(0xf0eee8)));
    for (const x of [-6.6, 6.6]) for (const z of [-3.6, 3.6]) parts.push(paint(sph(0.9, 1, 1, 1, x, 0.9, z), rgb(0xd8b868)));
    parts.push(paint(cyl(5.4, 5.4, 0.4, 32, 0, 8.6, 0), SILVER));
    parts.push(paint(lathe([[0, 0], [1.6, 0], [2.4, 2], [2.2, 5], [1.2, 6], [0, 6]], 16).translate(1.2, 8.8, 0.4), rgb(0xd8a030)));
    for (let k = 0; k < 7; k++) { const lf = box(0.5, 4, 1.4, 0, 2, 0); lf.rotateZ((k - 3) * 0.35); lf.rotateY(k); lf.translate(1.2, 14.4, 0.4); parts.push(paint(lf, rgb(0x2a6a2a))); }
    for (let k = 0; k < 14; k++) parts.push(paint(sph(0.7, 1, 1, 1, -2.8 + (k % 4) * 0.8, 9.4 + Math.floor(k / 4) * 0.7, -1.8 + (k % 3) * 0.7), rgb(0x6a2a6a)));
    for (let k = 0; k < 4; k++) parts.push(paint(sph(1.2, 1, 1, 1, -1 + k * 1.3, 9.6, 3), rgb(0xf09020)));
    const dome = lathe([[0, 0], [5.2, 0], [5, 1.6], [4, 3.6], [2, 4.8], [0, 5]], 32); dome.translate(0, 0, 0); dome.rotateX(-1.1); dome.translate(0, 9, -6); parts.push(paint(dome, SILVER));
    return merge(parts);
  },
  // the paintings on their easels; the canvas is its own layer
  easel() { const parts = [], w = rgb(0x6a4a2a); for (const s of [-1, 1]) { const l = box(0.8, 30, 0.8, 0, 15, 0); l.rotateZ(s * 0.12); l.translate(s * 6, 0, 0); parts.push(paint(l, w)); } const b = box(0.8, 28, 0.8, 0, 14, 0); b.rotateX(-0.35); b.translate(0, 0, -3); parts.push(paint(b, w)); parts.push(paint(box(18, 1, 2, 0, 9, 0.8), w)); for (const [ww, hh, x, y] of [[18.8, 0.9, 0, 9.6], [18.8, 0.9, 0, 27.6], [0.9, 18.8, -9.4, 18.6], [0.9, 18.8, 9.4, 18.6]]) parts.push(paint(box(ww, hh, 1.2, x, y, 1.0), GOLD)); return merge(parts); },
  canvas() { const g = new THREE.PlaneGeometry(18, 18); g.translate(0, 18.6, 1.65); return g; },
  // a wine glass, the lipstick on its rim
  wineGlass() { return paint(lathe([[0, 0], [6, 0], [6, 0.4], [0.5, 0.9], [0.45, 12], [4.6, 15], [5.6, 19], [5.4, 23], [5.3, 23.1], [5.2, 23], [5.3, 19], [4.4, 15.4], [0, 13]], 40), rgb(0xf0f4f8)); },
  wine() { return paint(lathe([[0, 13.2], [4.2, 15.4], [5.0, 18], [0, 18]], 40), rgb(0x8a1428)); },
  lipstick() { const g = new THREE.CylinderGeometry(5.42, 5.42, 1.4, 40, 1, true, -0.6, 1.2); g.translate(0, 22.2, 0); return paint(g, rgb(0xd8203a)); },
  // the perfume: a faceted bottle, the pink in it, the gold atomiser and its bulb
  perfume() {
    const parts = [];
    const b = new THREE.OctahedronGeometry(8, 0); b.scale(1, 1.1, 0.6); b.translate(0, 9, 0); parts.push(paint(b, rgb(0xf4e0ec)));
    parts.push(paint(cyl(1.6, 1.8, 3, 12, 0, 18.6, 0), GOLD)); parts.push(paint(cyl(0.3, 0.3, 6, 6, 0, 21, 0).rotateZ(Math.PI / 2).translate(3, 20.3, 0), GOLD));
    parts.push(paint(sph(2, 1, 1.2, 1, 7.6, 20.3, 0), rgb(0xd83a7a)));
    for (let k = 0; k < 5; k++) parts.push(paint(cyl(0.12, 0.12, 5, 4, 7.6 + (k - 2) * 0.3, 16.8, 0), GOLD));
    return merge(parts);
  },
  perfumeInside() { const b = new THREE.OctahedronGeometry(6.4, 0); b.scale(1, 0.8, 0.5); b.translate(0, 7.2, 0); return paint(b, [1, 0.45, 0.7]); },
  // the chandelier: gold rings, the arms, a crown; the crystals are glows
  chandelier() {
    const parts = [];
    for (const [r, y] of [[9, 0], [6, 3.4], [3.2, 6.4]]) parts.push(paint(new THREE.TorusGeometry(r, 0.35, 8, 40).rotateX(Math.PI / 2).translate(0, y, 0), GOLD));
    parts.push(paint(cyl(0.5, 0.5, 30, 8, 0, 18, 0), GOLD)); parts.push(paint(sph(1.6, 1, 1.6, 1, 0, -2.2, 0), GOLD));
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; parts.push(paint(cyl(0.18, 0.18, 9, 6, 0, 0, 0).rotateZ(Math.PI / 2).rotateY(a).translate(Math.cos(a) * 4.5, 0.2, -Math.sin(a) * 4.5), GOLD)); parts.push(paint(cyl(0.4, 0.3, 1.6, 8, Math.cos(a) * 9, 1.0, -Math.sin(a) * 9), rgb(0xf8f4ea))); }
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, r = k % 2 ? 9 : 6, y = k % 2 ? -1.6 : 1.8; const d = new THREE.OctahedronGeometry(0.55, 0); d.scale(0.7, 1.6, 0.7); d.translate(Math.cos(a) * r, y, Math.sin(a) * r); parts.push(paint(d, rgb(0xf0f8ff))); }
    return merge(parts);
  },
  // the valet: the podium, the key cabinet on its stand, the jar of tips
  valet() {
    const parts = [], wood = rgb(0x4a2a18);
    parts.push(paint(box(8, 11, 5, 0, 5.5, 0), wood)); parts.push(paint(box(9, 0.6, 6, 0, 11.3, 0.2), BRASS)); parts.push(paint(box(8.2, 0.6, 5.2, 0, 1, 0), BRASS));
    parts.push(paint(box(14, 18, 1.6, 12, 16, -1), wood)); parts.push(paint(box(0.8, 9, 0.8, 12, 4.5, -1), BRASS));
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { const x = 7.4 + c * 1.84, y = 9.6 + r * 3.1; parts.push(paint(cyl(0.12, 0.12, 0.8, 6, x, y + 0.8, 0).rotateX(Math.PI / 2).translate(0, 0, 0), BRASS)); if ((r * 6 + c) % 5) { parts.push(paint(box(0.7, 1.6, 0.2, x, y - 0.4, 0.2), rgb(0xd8b050))); parts.push(paint(box(0.9, 1.4, 0.15, x, y - 1.9, 0.25), [[0.9, 0.2, 0.2], [0.2, 0.3, 0.8], [0.2, 0.6, 0.3], [0.9, 0.7, 0.2]][(r + c) % 4])); } }
    parts.push(paint(lathe([[0, 0], [1.6, 0], [1.8, 3.6], [1.4, 4.2], [0, 4.2]], 16).translate(-2.4, 11.6, 0.6), rgb(0xd8f0ff)));
    for (let k = 0; k < 5; k++) parts.push(paint(box(1.6, 0.8, 0.1, -2.4, 12.6 + k * 0.5, 0.6).rotateY(k * 0.7), rgb(0xc87a98)));
    parts.push(paint(cyl(0.2, 0.2, 9, 6, 3, 15.5, 0), BRASS)); parts.push(paint(cyl(1.6, 0.6, 2, 12, 3, 20, 0), rgb(0x1a3a2a)));
    return merge(parts);
  },
  note() { return new THREE.PlaneGeometry(3.2, 1.6); },
  page() { return new THREE.PlaneGeometry(4.4, 5.5); },
  // the buffet: a long table in white, silver domes down it, a cake in tiers at the end
  buffet() {
    const parts = [];
    parts.push(paint(box(40, 0.8, 10, 0, 8, 0), rgb(0xf6f4ee))); parts.push(paint(box(40.4, 7.4, 10.4, 0, 3.8, 0), rgb(0xf0eee8))); parts.push(paint(box(40.6, 1.2, 10.6, 0, 7.2, 0), GOLD));
    for (let k = 0; k < 5; k++) { const x = -16 + k * 6.4; parts.push(paint(lathe([[0, 0], [2.6, 0], [2.5, 1], [2, 2.2], [1, 2.9], [0, 3]], 24).translate(x, 8.4, 0), SILVER)); parts.push(paint(sph(0.4, 1, 1, 1, x, 11.6, 0), SILVER)); }
    for (let t = 0; t < 4; t++) parts.push(paint(cyl(3.6 - t * 0.8, 3.6 - t * 0.8, 2.4, 24, 18, 9.6 + t * 2.6, 0), t % 2 ? rgb(0xffd8e4) : rgb(0xfff8f0)));
    for (let t = 0; t < 4; t++) parts.push(paint(new THREE.TorusGeometry(3.6 - t * 0.8, 0.25, 6, 24).rotateX(Math.PI / 2).translate(18, 8.5 + t * 2.6, 0), GOLD));
    parts.push(paint(sph(0.9, 1, 1, 1, 18, 19.6, 0), rgb(0xd83a5a)));
    return merge(parts);
  },
  // the sign for his lines: black lacquer, a gold frame, two brass lamps on top, gold chains
  signBoard() {
    const parts = [paint(box(25, 9.4, 1, 0, 0, -1.0), rgb(0x0c0a0a))];
    for (const [w, h, x, y] of [[26.2, 0.8, 0, 5.0], [26.2, 0.8, 0, -5.0], [0.8, 10.8, -12.9, 0], [0.8, 10.8, 12.9, 0]]) parts.push(paint(box(w, h, 1.4, x, y, -0.8), GOLD));
    for (const x of [-8, 8]) { parts.push(paint(cyl(0.6, 1.0, 1.2, 12, x, 6.0, -0.6), BRASS)); for (let k = 0; k < 14; k++) parts.push(paint(new THREE.TorusGeometry(0.5, 0.12, 4, 8).rotateY(k % 2 ? Math.PI / 2 : 0).translate(x, 7.2 + k * 1.6, -1.0), GOLD)); }
    return merge(parts);
  },
  // gold coins for the money falling
  umbrella() {
    const parts = [];
    for (let k = 0; k < 12; k++) { const a0 = k / 12 * Math.PI * 2, a1 = (k + 1) / 12 * Math.PI * 2; const g = new THREE.BufferGeometry(); const v = [0, 4.6, 0, Math.cos(a0) * 6, 2.8, Math.sin(a0) * 6, Math.cos(a1) * 6, 2.8, Math.sin(a1) * 6]; g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); parts.push(paint(g, k % 2 ? [1, 1, 1] : [1, 0.5, 0.66])); }
    parts.push(paint(cyl(0.18, 0.18, 4.6, 6, 0, 2.3, 0), WHITE));
    return merge(parts);
  },
  lounger() { const parts = [paint(box(2.4, 0.5, 7, 0, 1.2, 0), WHITE)]; const back = box(2.4, 0.4, 3, 0, 0, 0); back.rotateX(0.7); back.translate(0, 2.2, -4); parts.push(paint(back, WHITE)); parts.push(paint(box(2.2, 0.2, 6, 0, 1.55, 0.4), rgb(0xff9ab8))); return merge(parts); },
};

const BIT = (S, k) => S.layers[k];
extend({
  layers: {
    chPalm: (M) => [palmTrunk(), VCm(M, 'chPalmM', 0.04, { roughness: 0.9 }), 400, {}],
    chFronds: (M) => [palmFronds(), M.chFrondsM || (M.chFrondsM = tintLit(0.7, 0, 0.12)), 400, { aTint: 3 }],
    chHotel: (M) => [hotelBlock(), hotelMaterial(M), 40, {}],
    chHotelRoof: (M) => [hotelRoof(), VCm(M, 'chRoofM', 0.08, { roughness: 0.8 }), 40, {}],
    chHotelSign: (M) => [(() => { const g = new THREE.PlaneGeometry(28, 5.6); g.translate(0, 50.4, 7.45); return g; })(), M.chHotelSignM || (M.chHotelSignM = new THREE.MeshBasicMaterial({ map: canvasTex(1024, 205, (g, W, H) => { g.fillStyle = '#16100c'; g.fillRect(0, 0, W, H); g.fillStyle = '#f2c46a'; g.shadowColor = '#f2c46a'; g.shadowBlur = 14; g.font = `700 132px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GRAND HOTEL', W / 2, H / 2 + 6); }), color: new THREE.Color(1.2, 1.2, 1.2) })), 40, {}],
    chPool: (M) => [(() => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; })(), M.chPoolM || (M.chPoolM = poolMaterial()), 90, {}],
    chCoping: (M) => [box(1, 0.6, 1, 0, 0.3, 0), M.chCopingM || (M.chCopingM = new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.6, emissive: 0x2a2824 })), 200, {}],
    chTerrace: (M) => [box(1, 0.6, 1, 0, 0.3, 0), M.chTerraceM || (M.chTerraceM = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.8, emissive: 0x2a241c })), 200, {}],
    chUmbrella: (M) => [HG.umbrella(), VCm(M, 'chUmbM', 0.12, { roughness: 0.8, side: THREE.DoubleSide }), 200, {}],
    chLounger: (M) => [HG.lounger(), VCm(M, 'chLoungerM', 0.1, { roughness: 0.7 }), 400, {}],
    chYacht: (M) => [HG.yacht(), VCm(M, 'chYachtM', 0.16, { roughness: 0.35, metalness: 0.1 }), 30, {}],
    chCart: (M) => [HG.cart(), VCm(M, 'chCartM', 0.16, { roughness: 0.4, metalness: 0.3 }), 2, {}],
    chMinibar: (M) => [HG.minibar(), VCm(M, 'chMinibarM', 0.12, { roughness: 0.5 }), 3, {}],
    chMinis: (M) => [HG.minis(), VCm(M, 'chMinisM', 0.75, { roughness: 0.2, metalness: 0.2 }), 3, {}],
    chFridge: (M) => [(() => { const g = new THREE.PlaneGeometry(13, 17); g.translate(0, 9.4, -5.4); return g; })(), M.chFridgeM || (M.chFridgeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.9).multiplyScalar(1.15) })), 3, {}],
    chReceipt: (M) => [HG.receipt(), paper(M, 'chReceiptM', tex().receipt, 0.6), 6, {}],
    chRobe: (M) => [HG.robe(), VCm(M, 'chRobeM', 0.28, { roughness: 0.95 }), 2, {}],
    chCase: (M) => [HG.goldCase(), VCm(M, 'chCaseM', 0.6, { roughness: 0.25, metalness: 0.5 }), 2, {}],
    chTray: (M) => [HG.tray(), VCm(M, 'chTrayM', 0.22, { roughness: 0.15, metalness: 0.9 }), 4, {}],
    chStand: (M) => [HG.stand(), VCm(M, 'chStandM', 0.2, { roughness: 0.15, metalness: 0.9 }), 4, {}],
    chCard: (M) => [HG.plate(), paper(M, 'chCardM', tex().card, 0.85), 2, {}],
    chCheque: (M) => [HG.plate(), paper(M, 'chChequeM', tex().cheque, 0.8), 2, {}],
    chBell: (M) => [HG.bell(), VCm(M, 'chBellM', 0.35, { roughness: 0.15, metalness: 0.9 }), 2, {}],
    chDesk: (M) => [HG.desk(), VCm(M, 'chDeskM', 0.12, { roughness: 0.4 }), 2, {}],
    chBucket: (M) => [HG.bucket(), VCm(M, 'chBucketM', 0.25, { roughness: 0.15, metalness: 0.7 }), 2, {}],
    chTag: (M) => [HG.tag(), VC(M, 'chTagM', { roughness: 0.7, emissive: 0x140804 }), 2, {}],
    chTagFace: (M) => [HG.tagFace(), paper(M, 'chTagFaceM', tex().tag, 0.75), 2, {}],
    chCoupes: (M) => [HG.coupeTower(false), VC(M, 'chCoupesM', { roughness: 0.06, metalness: 0.3, transparent: true, opacity: 0.75, emissive: 0x2a2a30 }), 2, {}],
    chRose: (M) => [HG.coupeTower(true), M.chRoseM || (M.chRoseM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.7).multiplyScalar(1.5) })), 2, {}],
    chBottle: (M) => [HG.bottle(), VCm(M, 'chBottleM', 0.3, { roughness: 0.15, metalness: 0.3 }), 3, {}],
    chShaker: (M) => [HG.shaker(), VCm(M, 'chShakerM', 0.25, { roughness: 0.12, metalness: 0.9 }), 2, {}],
    chMini: (M) => [HG.mini(), M.chMiniM || (M.chMiniM = tintLit(0.25, 0.2, 0.6)), 900, { aTint: 3 }],
    chWire: (M) => [HG.wire(), M.chWireM || (M.chWireM = new THREE.MeshBasicMaterial({ color: 0xd8b868 })), 400, {}],
    chMartini: (M) => [HG.martini(), VC(M, 'chMartiniM', { roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.6, emissive: 0x2a3034 }), 2, {}],
    chGin: (M) => [HG.gin(), M.chGinM || (M.chGinM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.95, 0.9), transparent: true, opacity: 0.55 })), 2, {}],
    chOlive: (M) => [HG.olive(false), VCm(M, 'chOliveM', 0.3, { roughness: 0.3 }), 2, {}],
    chOliveBit: (M) => [HG.olive(true), VCm(M, 'chOliveM', 0.3, { roughness: 0.3 }), 2, {}],
    chTurntable: (M) => [HG.turntable(), VCm(M, 'chTurnM', 0.15, { roughness: 0.3, metalness: 0.4 }), 2, {}],
    chUrn: (M) => [HG.urn(), VCm(M, 'chUrnM', 0.2, { roughness: 0.5 }), 4, {}],
    chBloom: (M) => [HG.bloom(), M.chBloomM || (M.chBloomM = tintLit(0.6, 0, 0.3)), 80, { aTint: 3 }],
    chSwan: (M) => [HG.swan(), VCm(M, 'chSwanM', 0.3, { roughness: 0.95 }), 8, {}],
    chTable: (M) => [HG.table(), VCm(M, 'chTableM', 0.18, { roughness: 0.8 }), 4, {}],
    chCart2: (M) => [HG.cart2(), VCm(M, 'chCart2M', 0.22, { roughness: 0.4, metalness: 0.3 }), 2, {}],
    chEasel: (M) => [HG.easel(), VCm(M, 'chEaselM', 0.15, { roughness: 0.5, metalness: 0.3 }), 6, {}],
    chCanvas: (M) => [HG.canvas(), M.chCanvasM || (M.chCanvasM = (() => { const m = new THREE.ShaderMaterial({ uniforms: { tMap: { value: tex().art }, uK: { value: 0.95 } }, vertexShader: `attribute float aCell; varying vec2 vUv; varying float vCell; void main(){ vUv = uv; vCell = aCell; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`, fragmentShader: `uniform sampler2D tMap; uniform float uK; varying vec2 vUv; varying float vCell; void main(){ float c = floor(vCell + 0.5); gl_FragColor = vec4(texture2D(tMap, vec2((c + vUv.x) / 3.0, vUv.y)).rgb * uK, 1.0); }`, side: THREE.DoubleSide }); return m; })()), 6, { aCell: 1 }],
    chGlass: (M) => [HG.wineGlass(), VC(M, 'chGlassM', { roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55, emissive: 0x2a3034 }), 2, {}],
    chWine: (M) => [HG.wine(), M.chWineM || (M.chWineM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.06, 0.14) })), 2, {}],
    chLipstick: (M) => [HG.lipstick(), M.chLipM || (M.chLipM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.12, 0.22), side: THREE.DoubleSide })), 2, {}],
    chPerfume: (M) => [HG.perfume(), VC(M, 'chPerfumeM', { roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.7, emissive: 0x3a2a34 }), 2, {}],
    chPerfumeIn: (M) => [HG.perfumeInside(), M.chPerfumeInM || (M.chPerfumeInM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.4, 0.68).multiplyScalar(1.2) })), 2, {}],
    chChandelier: (M) => [HG.chandelier(), VCm(M, 'chChandM', 0.4, { roughness: 0.2, metalness: 0.8 }), 6, {}],
    chValet: (M) => [HG.valet(), VCm(M, 'chValetM', 0.2, { roughness: 0.4, metalness: 0.3 }), 2, {}],
    chNote: (M) => [HG.note(), paper(M, 'chNoteM', tex().note, 0.75), 300, {}],
    chPage: (M) => [HG.page(), paper(M, 'chPageM', tex().paper, 0.7), 60, {}],
    chBuffet: (M) => [HG.buffet(), VCm(M, 'chBuffetM', 0.2, { roughness: 0.4, metalness: 0.4 }), 3, {}],
    chSignBoard: (M) => [HG.signBoard(), VCm(M, 'chSignM', 0.25, { roughness: 0.3, metalness: 0.5 }), 24, {}],
    chSignFace: (M) => [signFace(23, 7.2, 0, 0, 0.02), M.sign, 24, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // palms down both sides of the drive, nodding in the breeze off the sea
    chPalm(S, it, p) {
      const L = S.layers; L.chPalm; L.chFronds;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      S._e.set(Math.sin(T * 0.9 + it.seed * 9) * 0.03, it.seed * 6.28, Math.sin(T * 0.7 + it.seed * 5) * 0.035); const pq = (S._palmq || (S._palmq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, pq, S._s.set(s, s, s)); L.chPalm.add(m); L.chFronds.add(m, { aTint: it.tint });
    },
    // the grand hotel along the drive, its windows coming on as it gets dark
    chHotel(S, it, p, q, yaw) {
      const L = S.layers; L.chHotel; L.chHotelRoof; L.chHotelSign;
      if (!S.track) return;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); L.chHotel.add(m); L.chHotelRoof.add(m); if (it.sign) { L.chHotelSign.add(m); const w = local(p, yaw, 0, 50.4 * s, 9 * s, S._o); glowAt(S, w.x, w.y, w.z, 30 * s, [1, 0.8, 0.45], 0.25); }
    },
    // the pool beside the road: a stretch of water with its coping, loungers and umbrellas past it
    chPool(S, it, p) {
      const L = S.layers; L.chPool; L.chCoping; L.chUmbrella; L.chLounger; L.chTerrace;
      if (!S.track) return;
      const c = S.course, dt = it.dt ?? 0.6, a = S._pa || (S._pa = new THREE.Vector3()), b = S._pb || (S._pb = new THREE.Vector3());
      const x0 = it.x0 ?? 26, x1 = it.x1 ?? 62, xm = (x0 + x1) / 2;
      S.track.ground(it.t - dt * 0.55, xm, a); S.track.ground(it.t + dt * 0.55, xm, b);
      const len = Math.hypot(b.x - a.x, b.z - a.z), yaw = Math.atan2(b.x - a.x, b.z - a.z);
      S._e.set(0, yaw, 0); const pq = (S._poolq || (S._poolq = new THREE.Quaternion())).setFromEuler(S._e);
      const ty = it.y ?? 6, ctr = S._pc || (S._pc = new THREE.Vector3()); ctr.set((a.x + b.x) / 2, ty + 0.2, (a.z + b.z) / 2);
      const m = S._m; m.compose(ctr, pq, S._s.set(x1 - x0, 1, len)); L.chPool.add(m);
      for (const xx of [x0 - 1, x1 + 1]) { const e = local(ctr, yaw, -(xx - xm), -0.2, 0, S._o); m.compose(e, pq, S._s.set(2.2, 1, len)); L.chCoping.add(m); }
      // the terrace it sits on: a stone wall down to the lawn on the road side, the deck beyond
      const tw = local(ctr, yaw, -(x0 - 2.6 - xm), 0, 0, S._o); tw.y = 0; m.compose(tw, pq, S._s.set(1.6, ty / 0.6, len)); L.chTerrace.add(m);
      const dk = local(ctr, yaw, -(x1 + 14 - xm), 0, 0, S._o); dk.y = ty - 0.6; m.compose(dk, pq, S._s.set(24, 1, len)); L.chTerrace.add(m);
      if (it.deck) {
        const e = local(ctr, yaw, -(x1 + 9 - xm), -0.2, 0, S._o).clone();
        S._e.set(0, yaw - Math.PI / 2, 0); const lq = (S._lq || (S._lq = new THREE.Quaternion())).setFromEuler(S._e);
        for (const dz of [-0.3, 0, 0.3]) { const w = local(e, yaw, 0, 0, dz * len, S._o); m.compose(w, lq, S._s.set(1.3, 1.3, 1.3)); L.chLounger.add(m); }
        const u = local(ctr, yaw, -(x1 + 16 - xm), -0.2, 0, S._o); m.compose(u, pq, S._s.set(1.2, 1.2, 1.2)); L.chUmbrella.add(m);
      }
      if ((S.chNight ?? 0) > 0.05) { const g = local(ctr, yaw, 0, 1, 0, S._o); glowAt(S, g.x, g.y, g.z, 34, [0.3, 0.9, 1], 0.25 * S.chNight); }
    },
    // white boats moored in the marina, their lights on
    chYacht(S, it, p, q, yaw) {
      const L = S.layers; L.chYacht;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1; p.y = -1.2 + Math.sin(T * 0.8 + it.seed * 6) * 0.3;
      S._e.set(Math.sin(T * 0.6 + it.seed * 3) * 0.015, yaw, Math.sin(T * 0.7 + it.seed * 4) * 0.02); const yq = (S._yq || (S._yq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, yq, S._s.set(s, s, s)); L.chYacht.add(m);
      const n = S.chNight ?? 0; if (n > 0.05) { for (let k = 0; k < 5; k++) { const w = local(p, yaw, 0, 6 + (k % 2) * 4, (k - 2) * 7 * s, S._o); glowAt(S, w.x, w.y, w.z, 6 * s, WARM, 0.6 * n); } const top = local(p, yaw, 0, 22.5 * s, -6 * s, S._o); glowAt(S, top.x, top.y, top.z, 2.4, [1, 1, 1], 1.2 * n); }
    },
    // the set-pieces standing by the road
    chProp(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['chCart', 'chMinibar', 'chMinis', 'chReceipt', 'chCase', 'chTray', 'chStand', 'chCard', 'chCheque', 'chBell', 'chDesk', 'chBucket', 'chCoupes', 'chRose', 'chBottle', 'chShaker', 'chUrn', 'chFridge', 'chBloom', 'chSwan', 'chTable', 'chCart2', 'chEasel', 'chCanvas', 'chGlass', 'chWine', 'chLipstick', 'chPerfume', 'chPerfumeIn', 'chValet', 'chBuffet', 'chMartini', 'chGin', 'chOlive', 'chOliveBit', 'chTurntable']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind, base = (it.h ?? 0) + (it.y ?? 0);
      const at = S._pv || (S._pv = new THREE.Vector3()); at.set(p.x, base, p.z);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2) => { const w = local(at, yaw, 0, y * s, 6 * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.6, c = WARM) => poolAt(S, at.x, (it.h ?? 0) + 0.15, at.z, 40 * s, c, k2);
      if (k === 'cart') { put('chCart'); light(8, 30, WARM, 0.25); spot(); }
      else if (k === 'minibar') { put('chMinibar'); put('chFridge'); put('chMinis'); put('chReceipt', -2, 18.6, -3, q); light(10, 30, [1, 0.97, 0.9], 0.6); spot(0.7); }
      else if (k === 'case') { put('chCase'); light(6, 28, [1, 0.85, 0.5], 0.35); spot(); }
      else if (k === 'card' || k === 'cheque') {
        // the tray on its stand, tipped toward you, the card (or the cheque) lying on it
        put('chStand', 0, 0, 0); S._e.set(0.55, yaw, 0); const tq = (S._tq || (S._tq = new THREE.Quaternion())).setFromEuler(S._e);
        put('chTray', 0, 11.4, 0, tq); const w = local(at, yaw, 0, 11.4 * s, 0, S._o); m.compose(w, tq, S._s.set(k === 'card' ? 11 * s : 14 * s, s, k === 'card' ? 7 * s : 6.4 * s)); L[k === 'card' ? 'chCard' : 'chCheque'].add(m);
        light(13, 30, [1, 0.97, 0.9], 0.3); spot();
      }
      else if (k === 'bell') { put('chDesk'); put('chBell', 0, 9.7, 0); const ding = Math.exp(-Math.max(0, T - (it.ding ?? 1e9)) * 3) * (T > (it.ding ?? 1e9) ? 1 : 0); light(14, 30, [1, 0.85, 0.5], 0.3 + 1.2 * ding); spot(); }
      else if (k === 'bucket') { put('chBucket', 0, 12.6); light(16, 30, [0.85, 0.95, 1], 0.35); for (let j = 0; j < 6; j++) { const f = ((T * 0.5 + j / 6) % 1), a = j * 1.05; const w = local(at, yaw, Math.cos(a) * 4.5 * s, (12.6 + 7.5 - f * 7) * s, Math.sin(a) * 4.5 * s, S._o); glowAt(S, w.x, w.y, w.z, 0.9 * s, [0.9, 0.97, 1], 1.2 * (1 - f)); } spot(); }
      else if (k === 'tower') {
        put('chCoupes', 0, 0.6); put('chRose', 0, 0.6);
        S._e.set(0, yaw, 2.2); const bq = (S._bq2 || (S._bq2 = new THREE.Quaternion())).setFromEuler(S._e); put('chBottle', -2, 22, 0, bq);
        for (let j = 0; j < 8; j++) { const f = ((T * 1.6 + j / 8) % 1); const w = local(at, yaw, (-1.4 + f * 1.4) * s, (16 - f * 5) * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 1.2 * s, PINK, 1.3); }
        light(12, 34, PINK, 0.4); spot(0.6, PINK);
      }
      else if (k === 'shaker') {
        const b = S.beat ?? 0, sh = Math.sin(T * 26) * 0.18 * (0.3 + b);
        S._e.set(sh * 0.4, yaw, sh); const sq = (S._sq2 || (S._sq2 = new THREE.Quaternion())).setFromEuler(S._e); put('chShaker', 0, 0, 0, sq);
        const go = smooth(it.go ?? 1e9, (it.go ?? 1e9) + 0.3, T);
        if (go > 0) for (let j = 0; j < 22; j++) { const f = ((T * 1.2 + j / 22) % 1), a = j * 2.4; const w = local(at, yaw, Math.cos(a) * f * 14 * s, (17 + f * 22 - f * f * 12) * s, Math.sin(a) * f * 14 * s, S._o); glowAt(S, w.x, w.y, w.z, 1.1 * s, j % 3 ? PINK : [1, 0.85, 0.4], 1.6 * go * (1 - f)); }
        light(10, 30, [1, 0.95, 0.9], 0.3); spot();
      }
      else if (k === 'martini') {
        put('chMartini'); put('chGin');
        const bit = T > (it.bite ?? 1e9);
        const w = local(at, yaw, 3 * s, 21 * s, 0, S._o); S._e.set(0, yaw, 0); const oq = (S._oq || (S._oq = new THREE.Quaternion())).setFromEuler(S._e); m.compose(w, oq, S._s.set(s, s, s)); L[bit ? 'chOliveBit' : 'chOlive'].add(m);
        light(20, 34, [0.8, 1, 0.9], 0.3); spot(0.5);
      }
      else if (k === 'turntable') { put('chTurntable'); light(6, 40, [1, 0.95, 0.85], 0.25); spot(0.8, [1, 0.95, 0.85]); }
      else if (k === 'flowers') {
        put('chUrn'); const open = smooth(it.bloom ?? -1e9, (it.bloom ?? -1e9) + 1.2, T), R = seeded(5);
        for (let j = 0; j < 14; j++) { const a = R() * 6.28, r = R() * 6, y = 14 + R() * 9; S._e.set(-0.4 + R() * 0.8, a, -0.4 + R() * 0.8); const fq = (S._fq || (S._fq = new THREE.Quaternion())).setFromEuler(S._e); const sc = s * (0.5 + 0.9 * open) * (0.8 + R() * 0.5); const w = local(at, yaw, Math.cos(a) * r * s, y * s, Math.sin(a) * r * s, S._o); m.compose(w, fq, S._s.set(sc, sc, sc)); L.chBloom.add(m, { aTint: [[1, 0.6, 0.72], [1, 0.95, 0.95], [1, 0.4, 0.55], [1, 0.8, 0.85]][j % 4] }); }
        light(18, 30, [1, 0.8, 0.85], 0.3); spot();
      }
      else if (k === 'swans') { put('chTable'); S._e.set(0, yaw + 0.5, 0); const a = (S._swq || (S._swq = new THREE.Quaternion())).setFromEuler(S._e); put('chSwan', -3.2, 8, 0, a); S._e.set(0, yaw - 0.5 + Math.PI, 0); const b = (S._swq2 || (S._swq2 = new THREE.Quaternion())).setFromEuler(S._e); put('chSwan', 3.2, 8, 0, b); light(12, 26, [1, 0.97, 0.92], 0.35); spot(); }
      else if (k === 'fruit') { put('chCart2'); light(12, 28, [1, 0.95, 0.85], 0.35); spot(); }
      else if (k === 'art') { put('chEasel'); put('chCanvas', 0, 0, 0, q, s, { aCell: it.cell ?? 0 }); light(19, 30, [1, 0.95, 0.85], 0.3); spot(0.5); }
      else if (k === 'glass') { put('chGlass'); put('chWine'); put('chLipstick'); light(18, 30, [1, 0.6, 0.6], 0.3); spot(0.5, [1, 0.7, 0.7]); }
      else if (k === 'perfume') { put('chPerfume'); put('chPerfumeIn'); light(10, 34, PINK, 0.45); for (let j = 0; j < 10; j++) { const f = ((T * 0.7 + j / 10) % 1); const w = local(at, yaw, (9 + f * 14) * s, (20.3 + Math.sin(f * 6 + j) * 2) * s, Math.cos(j * 2) * f * 4 * s, S._o); glowAt(S, w.x, w.y, w.z, (1 + f * 2.4) * s, PINK, 0.8 * (1 - f)); } spot(0.6, PINK); }
      else if (k === 'valet') { put('chValet'); light(16, 30, WARM, 0.45); const lmp = local(at, yaw, 3 * s, 20 * s, 0, S._o); glowAt(S, lmp.x, lmp.y - 1, lmp.z, 4 * s, WARM, 1.4); spot(0.8); }
      else if (k === 'buffet') { put('chBuffet'); light(12, 40, WARM, 0.35); spot(0.7); }
    },
    // hung over the road: the robe, the first-class tag, the chandelier
    chHung(S, it, p) {
      const L = S.layers; L.chRobe; L.chTag; L.chTagFace; L.chChandelier;
      if (!S.track) return;
      const T = S.tNow ?? 0, sm = S.course.sample(it.t), h = sm.yaw, k = it.kind;
      const sw = k === 'tag' ? Math.sin(T * 1.6 + it.t) * 0.25 : Math.sin(T * 0.9 + it.t) * 0.06;
      S._e.set(0, h + Math.PI + sw, Math.sin(T * 1.2 + it.t) * 0.03); const fq = (S._hq || (S._hq = new THREE.Quaternion())).setFromEuler(S._e);
      const s = (it.s ?? 1) * ({ robe: 0.55, tag: 0.85, chandelier: 1.1 }[k] ?? 1);
      p.y = sm.y + (it.lift ?? (k === 'chandelier' ? 22 : k === 'robe' ? 13 : 16));
      const m = S._m; m.compose(p, fq, S._s.set(s, s, s));
      if (k === 'robe') { L.chRobe.add(m); glowAt(S, p.x, p.y, p.z, 36 * s, [1, 0.97, 0.92], 0.25); }
      else if (k === 'tag') { L.chTag.add(m); L.chTagFace.add(m); glowAt(S, p.x, p.y, p.z, 30 * s, [1, 0.85, 0.5], 0.25); }
      else if (k === 'chandelier') {
        L.chChandelier.add(m);
        for (let j = 0; j < 24; j++) { const a = j / 24 * Math.PI * 2 + T * 0.1, r = j % 2 ? 9 : 6, y = j % 2 ? -1.6 : 1.8; const w = local(p, h, Math.cos(a) * r * s, y * s, Math.sin(a) * r * s, S._o); glowAt(S, w.x, w.y, w.z, 1.6 * s, [1, 0.97, 0.9], 0.9 + 0.5 * Math.sin(T * 5 + j * 1.7)); }
        for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2; const w = local(p, h, Math.cos(a) * 9 * s, 2.2 * s, Math.sin(a) * 9 * s, S._o); glowAt(S, w.x, w.y, w.z, 2.4 * s, WARM, 1.4); }
        for (let j = 0; j < 8; j++) { const f = ((T * 0.9 + j / 8) % 1), a = j * 0.8; const w = local(p, h, Math.cos(a) * 7 * s, (-2 - f * 14) * s, Math.sin(a) * 7 * s, S._o); glowAt(S, w.x, w.y, w.z, 0.8 * s, [0.9, 0.97, 1], 1.0 * (1 - f)); }
        glowAt(S, p.x, p.y, p.z, 60 * s, WARM, 0.25);
      }
    },
    // the first-class tag; mini bottles strung across the road, swinging
    chMinis(S, it, p, q, yaw) {
      const L = S.layers; L.chMini; L.chWire;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, span = it.span ?? 30, n = 15, h0 = S.course.sample(it.t).y + (it.lift ?? 13);
      const pts = S._mp || (S._mp = Array.from({ length: n + 1 }, () => new THREE.Vector3()));
      for (let j = 0; j <= n; j++) { const u = j / n; local(p, yaw, -span + 2 * span * u, 0, Math.sin(T * 1.2 + it.t) * 0.6 * Math.sin(u * Math.PI), pts[j]); pts[j].y = h0 - 3 * (1 - (2 * u - 1) ** 2); }
      const d = S._md || (S._md = new THREE.Vector3()), qq = S._mq || (S._mq = new THREE.Quaternion()), X = S._mx || (S._mx = new THREE.Vector3(1, 0, 0));
      for (let j = 0; j < n; j++) { d.copy(pts[j + 1]).sub(pts[j]); const len = d.length(); qq.setFromUnitVectors(X, d.normalize()); m.compose(pts[j], qq, S._s.set(len, 1, 1)); L.chWire.add(m); }
      const cols = [[0.42, 0.24, 0.08], [0.9, 0.9, 0.95], [0.2, 0.5, 0.25], [0.85, 0.25, 0.2], [0.95, 0.75, 0.3], [0.3, 0.2, 0.55]];
      const bq = S._mbq || (S._mbq = new THREE.Quaternion());
      for (let j = 1; j < n; j++) { const w = pts[j]; S._e.set(Math.sin(T * 2 + j) * 0.2, yaw, Math.PI + Math.sin(T * 1.7 + j * 1.3) * 0.25); bq.setFromEuler(S._e); m.compose(w, bq, S._s.set(1.6, 1.6, 1.6)); L.chMini.add(m, { aTint: cols[(j + Math.floor(it.t)) % cols.length] }); glowAt(S, w.x, w.y - 3, w.z, 2.4, WARM, 0.5); }
    },
    // money falling: notes fluttering down over the road; the scandal sheets blowing past
    chFall(S, it, p) {
      const L = S.layers; L.chNote; L.chPage;
      if (!S.track) return;
      const T = S.tNow ?? 0, sm = S.course.sample(it.t), h = sm.yaw, m = S._m, fq = S._nq || (S._nq = new THREE.Quaternion());
      const go = smooth(it.go ?? -1e9, (it.go ?? -1e9) + 0.6, T), n = it.n ?? 60, page = it.kind === 'paper';
      if (go <= 0) return;
      for (let j = 0; j < n; j++) {
        const R1 = hash(j * 3.1 + it.t), R2 = hash(j * 7.7 + it.t), R3 = hash(j * 1.3 + it.t);
        const f = ((T * (page ? 0.18 : 0.14) + R1) % 1);
        const w = local(p, h, (R2 - 0.5) * 70, 0, (R3 - 0.5) * 60, S._o); w.y = sm.y + 34 - f * 40 + Math.sin(T * 2 + j) * 1.2;
        S._e.set(T * (1 + R2) + j, T * 0.8 * (R3 - 0.5) + j, Math.sin(T * 3 + j) * 0.8); fq.setFromEuler(S._e);
        const sc = (page ? 1.6 : 1.4) * go; m.compose(w, fq, S._s.set(sc, sc, sc)); (page ? L.chPage : L.chNote).add(m);
      }
    },
    // his lines on the hotel's signs: black and gold, hung on gold chains over the road
    chSign(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, Math.sin(T * 1.1 + it.t) * 0.02); const fq = (S._csq || (S._csq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.chSignBoard.add(m); S.layers.chSignFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      const w = S._o; for (const sd of [-1, 1]) { local(p, h + Math.PI, sd * 8 * s, 6.4 * s, 0.4 * s, w); glowAt(S, w.x, w.y, w.z, 3 * s, WARM, 1.2); }
      glowAt(S, p.x, p.y, p.z, 30 * s, WARM, 0.14);
    },
  },
  kits: {
    chPalms(S, z, R) { const sides = z.side ? [z.side] : [-1, 1]; for (let t = z.from; t < z.to; t += z.every ?? 0.45) for (const side of sides) { if ((z.clear || []).some(([a, b, c]) => t > a && t < b && (!c || c === side))) continue; const g = 0.7 + R() * 0.4; S.items.push({ t: t + R() * 0.2, x: side * ((z.x ?? 24) + R() * (z.spread ?? 10)), rot: 0, s: (z.s ?? 1) * (0.8 + R() * 0.45), seed: R(), tint: [g, g * (0.95 + R() * 0.1), g * 0.9], h: 0, parts: 'chPalm', ahead: z.ahead ?? 30 }); } },
    chHotel(S, z) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 1.5) S.items.push({ t, x: z.x ?? 70, rot: SIDE(z.x ?? 70), s: z.s ?? 1, sign: k++ % 2 === 0, h: 0, parts: 'chHotel', ahead: z.ahead ?? 46 }); },
    chPool(S, z) { for (let t = z.from; t < z.to; t += z.dt ?? 0.6) S.items.push({ t, x: 0, rot: 0, h: 0, dt: z.dt ?? 0.6, x0: z.x0, x1: z.x1, deck: z.deck, parts: 'chPool', ahead: z.ahead ?? 30 }); },
    chYachts(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.1) S.items.push({ t: t + R() * 0.3, x: -((z.x ?? 110) + R() * 40), rot: Math.PI / 2 + (R() - 0.5) * 0.3, s: (z.s ?? 1) * (0.7 + R() * 0.5), seed: R(), h: 0, parts: 'chYacht', ahead: z.ahead ?? 40 }); },
    chProps(S, z) { for (const c of z.at) { const it = { t: c.t, x: c.x, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), s: c.s ?? 1, y: c.y, kind: c.kind, ding: c.ding, go: c.go, bite: c.bite, bloom: c.bloom, cell: c.cell, h: 0, parts: 'chProp', ahead: c.ahead ?? 40 }; S.items.push(c.floor ? onFloor(S, it) : it); } },
    chHung(S, z) { prepare(S.course, S.plan); for (const [t, kind, x] of z.at) S.items.push({ t, x: x ?? 0, rot: 0, s: z.s ?? 1, lift: z.lift, kind, parts: 'chHung', ahead: z.ahead ?? 36 }); },
    chMinis(S, z, R) { prepare(S.course, S.plan); for (let t = z.from; t < z.to; t += z.every ?? 0.8) S.items.push({ t: t + R() * 0.1, x: 0, rot: (R() - 0.5) * 0.4, span: z.span, lift: z.lift, parts: 'chMinis', ahead: z.ahead ?? 26 }); },
    chFall(S, z) { prepare(S.course, S.plan); for (const [t, kind, go] of z.at) S.items.push({ t, x: 0, rot: 0, kind, go, n: z.n, parts: 'chFall', ahead: z.ahead ?? 30 }); },
  },
});

// ---------- the rooms: the lobby, the bar, the hall, the ballroom ----------
const flatRing = (W = 40, H = 36) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const HOTEL = {
  rings: { flat: flatRing },
  ringOf: () => 'flat',
  styles: { lobby: 0, bar: 1, hall: 2, ballroom: 3 },
  dims: { lobby: [46, 40], bar: [40, 34], hall: [28, 30], ballroom: [56, 44] },
  lights: (id) => ({ 0: [30, 15], 1: [18, 9], 2: [14, 7], 3: [26, 13] }[id] || null),
};

function roomMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uWarm: { value: new THREE.Color(0xffc890) }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyLow: { value: new THREE.Color() }, uSkyTop: { value: new THREE.Color() },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uBeat, uFogDensity;
      uniform vec3 uFog, uCam, uWarm, uLight, uSkyLow, uSkyTop;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      // marble: a pale stone with grey veins
      vec3 marble(vec2 q, vec3 base, vec3 vein){ float v = n2(q * 0.15) * 0.6 + n2(q * 0.5) * 0.3 + n2(q * 1.4) * 0.1; float line = smoothstep(0.035, 0.0, abs(fract(v * 4.0 + q.x * 0.02) - 0.5) - 0.46); return mix(base * (0.92 + 0.08 * v), vein, line * 0.8); }
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float st = uStyle;
        float wa = part == 6 ? x * 1.3 + 9.0 : (side > 0.0 ? along + 11.0 : along);
        vec2 fx = st < 0.5 ? vec2(30.0, 15.0) : st < 1.5 ? vec2(18.0, 9.0) : st < 2.5 ? vec2(14.0, 7.0) : vec2(26.0, 13.0);
        float dl = mod(along - fx.y + fx.x * 0.5, fx.x) - fx.x * 0.5;
        float lightK = 0.62 + 0.45 * exp(-dl * dl / (fx.x * fx.x * 0.12));
        vec3 glow = vec3(0.0);
        vec3 col;
        float notCap = part == 6 ? 0.0 : 1.0;
        if (part == 7) {
          // the hotel from the drive: cream stone, tall arched windows lit gold, a band of gold over the door
          col = vec3(0.86, 0.8, 0.68) * (0.9 + 0.1 * n2(vec2(x, h) * 0.3));
          vec2 wq = vec2(mod(abs(x), 12.0) - 6.0, h);
          float win = step(18.0, abs(x)) * step(abs(wq.x), 3.0) * step(6.0, wq.y) * step(wq.y, 22.0 + 3.0 * sqrt(max(0.0, 9.0 - wq.x * wq.x)));
          float win2 = step(abs(wq.x), 3.0) * step(30.0, wq.y) * step(wq.y, 40.0);
          col = mix(col, vec3(0.08, 0.06, 0.05), clamp(win + win2, 0.0, 1.0));
          glow += uWarm * clamp(win + win2 * 0.8, 0.0, 1.0) * (0.55 + 0.45 * h2(vec2(floor(x / 12.0), floor(h / 20.0))));
          col = mix(col, vec3(0.85, 0.66, 0.3), step(abs(h - 44.0), 1.2));
          col *= 0.5;
          glow += vec3(0.3, 0.25, 0.18) * smoothstep(40.0, 0.0, h) * 0.4;
        }
        else if (part == 8) { col = vec3(0.7, 0.55, 0.25); glow += uWarm * 0.2; }
        else if (st < 0.5) {
          // the lobby: cream marble floor in a gold-banded grid, pale walls with pilasters and mirrors, a coffered ceiling
          if (part == 0) { vec2 q = vec2(x, along); col = marble(q, vec3(0.86, 0.83, 0.76), vec3(0.55, 0.52, 0.5)); vec2 g = fract(q / 8.0); col = mix(col, vec3(0.75, 0.58, 0.28), (1.0 - edge(g, 0.025)) * 0.9); }
          else if (part == 3) { vec2 q = fract(vec2(x, along) / 9.0); col = vec3(0.82, 0.78, 0.7) * (0.75 + 0.25 * edge(q, 0.12)); col = mix(col, vec3(0.8, 0.62, 0.3), (1.0 - edge(q, 0.04)) * 0.8); }
          else {
            col = vec3(0.9, 0.86, 0.78) * (0.92 + 0.08 * n2(vec2(wa, h) * 0.2));
            float u = mod(wa, 16.0);
            col = mix(col, vec3(0.8, 0.64, 0.32), step(abs(u - 1.0), 0.8) * notCap);
            float mir = step(4.0, u) * step(u, 14.0) * step(8.0, h) * step(h, 28.0) * notCap;
            vec3 glass = mix(vec3(0.5, 0.45, 0.4), uWarm * 0.7, smoothstep(0.3, 1.0, n2(vec2(u * 0.3 + h * 0.15, h * 0.05)))) * 0.8;
            col = mix(col, glass, mir); col = mix(col, vec3(0.8, 0.64, 0.32), step(abs(h - 8.0), 0.4) * step(4.0, u) * step(u, 14.0) * notCap);
            col = mix(col, vec3(0.75, 0.58, 0.28), step(abs(h - 3.0), 0.5)); col = mix(col, vec3(0.6, 0.5, 0.4), step(h, 2.5));
            float sc = smoothstep(1.2, 0.3, length(vec2(u - 9.0, h - 31.0))) * notCap; glow += uWarm * sc * 1.4;
          }
        } else if (st < 1.5) {
          // the bar: green walls, brass, the bottles lit along the back, a dark wood floor
          if (part == 0) { vec2 q = vec2(x / 2.0, along / 12.0 + floor(x / 2.0) * 0.37); col = vec3(0.24, 0.14, 0.08) * (0.75 + 0.3 * h2(floor(q))) * (0.85 + 0.15 * edge(fract(q), 0.03)); }
          else if (part == 3) { vec2 q = fract(vec2(x, along) / 6.0); col = vec3(0.1, 0.2, 0.16) * (0.8 + 0.2 * edge(q, 0.1)); col = mix(col, vec3(0.7, 0.55, 0.25), (1.0 - edge(q, 0.03)) * 0.8); }
          else {
            col = vec3(0.08, 0.24, 0.18) * (0.85 + 0.15 * sin(wa * 2.0));
            col = mix(col, vec3(0.3, 0.18, 0.1), step(h, 10.0));
            col = mix(col, vec3(0.78, 0.6, 0.28), step(abs(h - 10.0), 0.5) + step(abs(h - 30.0), 0.4));
            float zone = step(12.0, h) * step(h, 28.0) * notCap;
            float sh = step(abs(fract((h - 12.0) / 4.0) - 0.05), 0.05) * zone; col = mix(col, vec3(0.78, 0.6, 0.28), sh);
            vec2 bq = vec2(wa / 1.8, (h - 12.0) / 4.0); vec2 bc = floor(bq), bf = fract(bq);
            float tall = 0.55 + 0.25 * h2(bc + 2.0);
            float body = step(0.3, bf.x) * step(bf.x, 0.7) * step(0.12, bf.y) * step(bf.y, tall);
            float neck = step(0.44, bf.x) * step(bf.x, 0.56) * step(tall, bf.y) * step(bf.y, tall + 0.22);
            float bottle = clamp(body + neck, 0.0, 1.0) * zone * step(0.2, h2(bc + 9.0));
            vec3 bcol = h2(bc + 1.0) < 0.3 ? vec3(0.95, 0.6, 0.2) : h2(bc + 1.0) < 0.6 ? vec3(0.3, 0.75, 0.35) : h2(bc + 1.0) < 0.8 ? vec3(0.9, 0.9, 0.95) : vec3(0.85, 0.3, 0.45);
            glow += uWarm * 0.12 * zone * (1.0 - bottle);
            col = mix(col, bcol * 0.4, bottle); glow += bcol * bottle * 0.6;
          }
        } else if (st < 2.5) {
          // the hall: that carpet, the doors down both sides with their brass numbers, sconces
          if (part == 0) { vec2 q = vec2(x, along) / 3.0; vec2 c = floor(q), f = fract(q) - 0.5; float hexa = step(0.32, max(abs(f.x) * 0.87 + abs(f.y) * 0.5, abs(f.y))); col = mix(vec3(0.55, 0.12, 0.08), vec3(0.85, 0.4, 0.1), hexa); col = mix(col, vec3(0.15, 0.08, 0.05), step(0.42, max(abs(f.x) * 0.87 + abs(f.y) * 0.5, abs(f.y))) * 0.6); }
          else if (part == 3) { col = vec3(0.85, 0.8, 0.72); }
          else {
            col = vec3(0.86, 0.78, 0.62) * (0.92 + 0.08 * n2(vec2(wa, h) * 0.3));
            float u = mod(wa, 14.0);
            float door = step(4.0, u) * step(u, 10.0) * step(h, 16.0) * notCap;
            col = mix(col, vec3(0.42, 0.24, 0.14) * (0.85 + 0.15 * edge(vec2((u - 4.0) / 6.0, h / 16.0), 0.1)), door);
            col = mix(col, vec3(0.8, 0.64, 0.3), smoothstep(0.5, 0.2, length(vec2(u - 7.0, h - 12.5))) * notCap);
            col = mix(col, vec3(0.5, 0.3, 0.2), step(h, 1.2));
            float sc = smoothstep(1.0, 0.3, length(vec2(u - 1.5, h - 18.0))) * notCap; glow += uWarm * sc * 1.6;
          }
        } else {
          // the ballroom: red silk walls, gold, a parquet floor, the mirrors catching the chandeliers
          if (part == 0) { vec2 q = vec2(x, along) / 2.4; vec2 c = floor(q); float dir = mod(c.x + c.y, 2.0); vec2 f = fract(q); float plank = dir > 0.5 ? fract(f.x * 3.0) : fract(f.y * 3.0); col = vec3(0.42, 0.26, 0.14) * (0.8 + 0.2 * smoothstep(0.0, 0.1, plank) * smoothstep(1.0, 0.9, plank)) * (0.85 + 0.15 * h2(c)); }
          else if (part == 3) { vec2 q = fract(vec2(x, along) / 12.0) - 0.5; col = vec3(0.92, 0.88, 0.8); col = mix(col, vec3(0.8, 0.62, 0.3), smoothstep(0.03, 0.0, abs(length(q) - 0.36)) + smoothstep(0.02, 0.0, abs(abs(q.x) - 0.48)) + smoothstep(0.02, 0.0, abs(abs(q.y) - 0.48))); }
          else {
            float fold = 0.75 + 0.25 * sin(wa * 1.6);
            col = vec3(0.55, 0.06, 0.1) * fold;
            float u = mod(wa, 20.0);
            col = mix(col, vec3(0.8, 0.64, 0.3), step(abs(u - 1.0), 1.0) * notCap + step(abs(h - 5.0), 0.5) + step(abs(h - 36.0), 0.6));
            float mir = step(5.0, u) * step(u, 17.0) * step(9.0, h) * step(h, 32.0) * notCap;
            col = mix(col, mix(vec3(0.4, 0.3, 0.28), uWarm * 0.8, smoothstep(0.4, 1.0, n2(vec2(u * 0.2 + h * 0.1, h * 0.03)))), mir);
            col = mix(col, vec3(0.3, 0.04, 0.06), step(h, 5.0));
            float sp = step(0.92, h2(floor(vec2(wa * 0.6, h * 0.6)))) * mir; glow += uWarm * sp * 1.2;
          }
        }
        col *= lightK * uLight;
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the white boat leaving the marina at dawn, streamers off its rail ----------
export class BoatFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -80;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    this.boat = new THREE.Group(); this.group.add(this.boat);
    const s = cfg.s ?? 1.6;
    this.boat.add(new THREE.Mesh(HG.yacht(), selfLit({ roughness: 0.3, metalness: 0.1 }, 0.2))); this.boat.scale.setScalar(s);
    // the dock it's leaving: planks out over the water, bollards, a string of bulbs
    const dock = merge([paint(box(18, 1.2, 140, 0, 0.6, 0), rgb(0x8a6a48)), ...[-60, -30, 0, 30, 60].map((z) => paint(cyl(0.8, 0.9, 2.4, 10, 7, 1.8, z), rgb(0x2a2a30)))]);
    this.dock = new THREE.Mesh(dock, selfLit({ roughness: 0.8 }, 0.08)); this.dock.position.set(cfg.dockX ?? -18, 0, 0); this.group.add(this.dock);
    // streamers from the rail back to the dock, stretching and breaking as it goes
    this.streamers = [];
    const cols = [0xff8ab8, 0xffd860, 0xffffff, 0x8ae8ff, 0xff4a6a];
    for (let k = 0; k < 10; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(cols[k % cols.length]).multiplyScalar(1.3) })); this.group.add(m); this.streamers.push(m); }
    this.fired = false; this._p = new THREE.Vector3(); this._w = new THREE.Vector3(); this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
  }
  fire() { this.fired = true; }
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? 0), 0);
    const c = this.cfg, go = smooth(c.leave, c.leave + (c.leaveFor ?? 30), songT);
    // she pulls away along the dock and out
    this.boat.position.set(4 + go * 40, -1.4 + Math.sin(songT * 0.8) * 0.3, go * 90 - 10);
    this.boat.rotation.set(Math.sin(songT * 0.6) * 0.01, -Math.PI / 2 + go * 0.35, Math.sin(songT * 0.7) * 0.015);
    this.group.updateMatrixWorld(true);
    const s = c.s ?? 1.6, dx = c.dockX ?? -18;
    for (let k = 0; k < this.streamers.length; k++) {
      const u = (k + 0.5) / this.streamers.length;
      this._a.set(-24 + 48 * u, 6, 6.5).applyMatrix4(this.boat.matrixWorld);
      this._b.set(dx + Math.sign(-dx) * 8.6, 1.4, -30 + 60 * u).applyMatrix4(this.group.matrixWorld);
      const snap = go > 0.25 + 0.06 * k;
      const m = this.streamers[k];
      if (snap) { this._b.copy(this._a); this._b.y -= 4 + 3 * Math.sin(k); }
      const d = this._w.subVectors(this._b, this._a), L = Math.max(0.1, d.length());
      m.position.copy(this._a).addScaledVector(d, 0.5);
      m.scale.set(L, 1, 1);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
      m.position.sub(this.group.position); m.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.group.rotation.y);
      m.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -this.group.rotation.y));
    }
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    for (let k = 0; k < 8; k++) { this._w.set(-24 + k * 7, 7 + (k % 2) * 4, 0).applyMatrix4(this.boat.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 7 * s, WARM, 0.45); }
    this._w.set(-6, 22.5, 0).applyMatrix4(this.boat.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 3, [1, 1, 1], 1.3);
    for (let k = 0; k < 12; k++) { this._w.set(dx - Math.sign(-dx) * 8, 5, -66 + k * 12).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 2.4, WARM, 1.1); }
  }
}

// ---------- the place, per frame ----------
export class HotelWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = roomMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, HOTEL));
    // the better car on its turntable in the bar
    const car = S.plan.car;
    this.car = null;
    if (car) {
      this.carGroup = new THREE.Group(); scene.add(this.carGroup);
      new GLTFLoader().loadAsync('assets/props/coupe.glb').then((g) => {
        const obj = g.scene;
        obj.traverse((o) => {
          if (!o.isMesh) return;
          o.frustumCulled = false;
          const n = (o.material && o.material.name) || '';
          if (n === 'Glass') o.material = new THREE.MeshStandardMaterial({ color: 0x0c0c14, roughness: 0.06, metalness: 0.9, transparent: true, opacity: 0.8 });
          else o.material = o.material.clone();
          const m = o.material;
          if (n === 'Paint 1 Carmine') { m.color = new THREE.Color(car.paint ?? 0xe8b850); m.metalness = 0.85; m.roughness = 0.22; m.emissive = new THREE.Color(car.paint ?? 0xe8b850); m.emissiveIntensity = 0.35; }
          if (n === 'Headlight') { m.emissive = new THREE.Color(0xfff2d8); m.emissiveIntensity = 1.2; }
        });
        const bb = new THREE.Box3().setFromObject(obj), sz = new THREE.Vector3(); bb.getSize(sz);
        const k = (car.len ?? 26) / Math.max(sz.x, sz.z); obj.scale.setScalar(k); obj.position.y = -bb.min.y * k;
        this.carGroup.add(obj); this.car = obj; this._warm = 4;
      }).catch(() => {});
    }
    this._g = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, t = S.rider.t;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uBeat.value = S.town.beat || 0;
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uWarm.value.set(P.lamp ?? 0xffc890);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyTop.value.set(P.zenith); u.uSkyLow.value.set(P.horizon);
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    // how dark it is: the windows come on, the pool lights up, the boats light their decks
    const night = clamp(P.windowK ?? 0, 0, 1);
    S.town.chNight = night;
    const M = S.town.mats;
    if (M.chHotelM) M.chHotelM.emissiveIntensity = 0.08 + 1.1 * night;
    if (M.chPoolM) { const pu = M.chPoolM.uniforms; pu.uTime.value = time; pu.uNight.value = night; pu.uSun.value.set(P.moon ?? 0xffffff); pu.uSky.value.set(P.horizon); pu.uFog.value.set(P.fog); pu.uFogDensity.value = P.fogDensity; pu.uCam.value.copy(camera.position); }
    if (this.carGroup) {
      const c = S.plan.car, show = t > c.t - 46 && t < c.t + 3;
      // drawn for a few frames as soon as it loads, so its materials are ready before it's seen
      const warm = (this._warm ?? 0) > 0; if (warm) this._warm--;
      this.carGroup.visible = show || warm;
      if (show || warm) {
        S.track.ground(c.t, c.x, this._g); this.carGroup.position.set(this._g.x, floorAt(S.course, c.t) + 2.2, this._g.z);
        this.carGroup.rotation.set(0, S.course.sample(c.t).yaw + time * 0.5, 0);
      }
    }
  }
  // the lights in the rooms: chandeliers in the lobby and the ballroom, pendants in the bar, sconces in the hall
  draw(T) {
    const g = this._g, lamp = [1, 0.85, 0.62];
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(this.S.course, f.t);
        if (r.style === 0 || r.style === 3) { for (const x of r.style === 3 ? [-22, 22] : [0]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 8, g.z, 16, lamp, 1.0); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + T.tNow * 0.2; T.glow(g.x + Math.cos(a) * 5, fy + r.H - 9, g.z + Math.sin(a) * 5, 1.8, [1, 0.97, 0.92], 1.2); } } this.S.track.ground(f.t, 0, g); T.pool(g.x, fy + 0.08, g.z, 50, lamp, 0.4); continue; }
        if (r.style === 1) { for (const x of [-14, 14]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 6, g.z, 6, lamp, 1.0); } this.S.track.ground(f.t, 0, g); T.pool(g.x, fy + 0.08, g.z, 30, lamp, 0.35); continue; }
        for (const x of [-26, 26]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + 18, g.z, 5, lamp, 0.9); }
      }
    }
  }
}
