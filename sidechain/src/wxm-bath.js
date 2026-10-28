// White Christmas: grandma's bathroom and her hall, at the size we are in them. The door with its
// little hook-and-eye that drops shut; the fan in the wall that stops; the Christmas sweater on its
// hook; the vanity with the bulbs all round the mirror and the magnifying mirror on its folding arm;
// the counter laid out like an altar (the green ceramic tree with its little lights, the shell soaps,
// the candles nobody lights); the nativity; the toilet in its Santa lid cover with the crocheted doll
// on the tank; the Christmas towels; the Precious Moments girl praying, her painted eyes on you.
// In the hall: everybody's coats and boots, the basement door with the glow coming up the stairs,
// mom's handbag open on the hall table under her smiling photograph.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { paint, rgb, seeded, clamp, smooth, merge, box, cyl, sph, lathe, tor, rod, canvasTex, VCm, pic, tintLit, onFloor } from './wxm-lib.js';

const WHITE = rgb(0xf2f0ea), CHROME = rgb(0xc8ccd4), BRASS = rgb(0xc8a050), PINKT = rgb(0xe8a8b4), RED = rgb(0xc0141c), GREEN = rgb(0x146a34), WOOD = rgb(0x6a4428), DARK = rgb(0x1a1414), SKIN = rgb(0xf4d0bc);
const WARM = [1, 0.8, 0.55], COLD = [0.75, 0.88, 1], LAMPC = [1, 0.78, 0.5];
const ALT = 14.4;   // the altar's things stand on its cabinet
const CERAMIC = [[1, 0.2, 0.15], [0.2, 1, 0.3], [0.25, 0.5, 1], [1, 0.8, 0.2], [1, 0.4, 0.8]];   // the ceramic tree's little lights

// ---------- pictures ----------
// the sweater: red knit, a band of snowflakes, a reindeer, the zigzags
function sweaterTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#b8141c'; g.fillRect(0, 0, W, H);
    const st = (x, y, c) => { g.fillStyle = c; g.fillRect(x * 16, y * 16, 15, 15); };
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      if (y === 4 || y === 27) st(x, y, '#f4f0e8');
      if ((y === 6 || y === 25) && (x + (y === 6 ? 0 : 1)) % 2 === 0) st(x, y, '#1a6a34');
      if (y >= 8 && y <= 11) { const k = (x + y) % 4; if (k === 0 || (y === 9 || y === 10) && x % 4 === 2) st(x, y, '#f4f0e8'); }
      if (y >= 20 && y <= 23 && ((x - y) % 4 + 4) % 4 === 0) st(x, y, '#1a6a34');
    }
    // the reindeer in the middle, in white stitches
    const deer = ['..X.....X..', '.X.X...X.X.', '..XX...XX..', '....XXX....', '...XXXXX...', '....XXX....', '.XXXXXXXXX.', 'XXXXXXXXXXX', 'X.X.....X.X', 'X.X.....X.X'];
    deer.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') st(10 + i, 12 + j, '#f4f0e8'); }));
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
  });
}
// the photograph on the hall table: mom, smiling the smile
function smileTexture() {
  return canvasTex(256, 320, (g, W, H) => {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#7a8aa0'); bg.addColorStop(1, '#4a4a5a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#5a3a24'; g.beginPath(); g.ellipse(128, 150, 92, 112, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f0c8a8'; g.beginPath(); g.ellipse(128, 165, 66, 82, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c84a6a'; g.fillRect(50, 260, 156, 70);
    g.strokeStyle = '#3a2418'; g.lineWidth = 5; g.lineCap = 'round';
    for (const x of [100, 156]) { g.beginPath(); g.arc(x, 150, 13, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.fillStyle = '#ffffff'; g.strokeStyle = '#b02a3a'; g.lineWidth = 6; g.beginPath(); g.arc(128, 188, 34, 0.12 * Math.PI, 0.88 * Math.PI); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 0, W, H);
  });
}
// a cross-stitch in its frame: a cottage under the snow, a heart over it, a border of little hearts
function stitchTexture() {
  return canvasTex(256, 320, (g, W, H) => {
    g.fillStyle = '#f2ead8'; g.fillRect(0, 0, W, H);
    const X = (x, y, c) => { g.strokeStyle = c; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x * 8 + 1.5, y * 8 + 1.5); g.lineTo(x * 8 + 6.5, y * 8 + 6.5); g.moveTo(x * 8 + 6.5, y * 8 + 1.5); g.lineTo(x * 8 + 1.5, y * 8 + 6.5); g.stroke(); };
    for (let x = 1; x < 31; x++) for (const y of [1, 38]) if (x % 3 !== 0) X(x, y, x % 6 < 3 ? '#b8202a' : '#2a7a3a');
    for (let y = 2; y < 38; y++) for (const x of [1, 30]) if (y % 3 !== 0) X(x, y, y % 6 < 3 ? '#2a7a3a' : '#b8202a');
    for (let y = 22; y < 32; y++) for (let x = 8; x < 24; x++) X(x, y, (y === 26 || y === 27) && (x === 11 || x === 12 || x === 19 || x === 20) ? '#f0c040' : (x >= 15 && x <= 16 && y >= 27) ? '#6a3a20' : '#c87a5a');
    for (let k = 0; k < 9; k++) for (let x = 7 + k; x < 25 - k; x++) X(x, 21 - k, k === 0 ? '#f8f8f8' : '#5a2a2a');
    for (let x = 4; x < 28; x++) X(x, 32, '#f8f8f8');
    const heart = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
    heart.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') X(13 + i, 4 + j, '#c8141c'); }));
  });
}
// a laptop's chart down the basement stairs: candles, up and up and then down
function chartTexture() {
  return canvasTex(256, 160, (g, W, H) => {
    g.fillStyle = '#06090c'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(80,120,140,0.25)'; for (let y = 20; y < H; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    let v = 120; const R = seeded(11);
    for (let i = 0; i < 24; i++) { const up = i < 17 ? R() < 0.72 : R() < 0.15; const d = (4 + R() * 12) * (up ? -1 : 1) * (i > 18 ? 2.2 : 1); const o = v, c = clamp(v + d, 12, 150); g.fillStyle = up ? '#2aff8a' : '#ff3a4a'; g.fillRect(8 + i * 10, Math.min(o, c), 7, Math.max(2, Math.abs(c - o))); g.fillRect(11 + i * 10, Math.min(o, c) - 5, 1, Math.abs(c - o) + 10); v = c; }
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { sweater: sweaterTexture(), smile: smileTexture(), chart: chartTexture(), stitch: stitchTexture() });

// the mirror: no reflection, just its silver, the light running down it, brighter when she's looking
function mirrorMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uK: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `attribute float aK; varying float vK; varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vK = aK; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uK, uTime; varying float vK; varying vec2 vUv; varying vec3 vW;
      void main(){
        vec3 c = mix(vec3(0.55, 0.6, 0.68), vec3(0.92, 0.95, 1.0), vUv.y);
        float streak = smoothstep(0.08, 0.0, abs(fract(vUv.x * 1.3 - vUv.y * 0.9 + vW.x * 0.004 + vW.z * 0.004) - 0.5) - 0.32);
        c += vec3(0.5) * streak;
        float rim = smoothstep(0.0, 0.05, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
        gl_FragColor = vec4(c * (0.55 + 0.6 * vK * uK) * (0.7 + 0.3 * rim), 1.0);
      }`,
  });
}

// ---------- the things ----------
const BA = {
  // the vanity: the cabinet, the pink counter, the basin and its tap, the mirror's frame (the glass
  // and the bulbs are their own)
  vanity() {
    const parts = [paint(box(30, 13, 12, 0, 6.5, 0), WHITE), paint(box(31, 1.2, 13, 0, 13.6, 0.4), PINKT)];
    for (const x of [-7.5, 7.5]) { parts.push(paint(box(13.5, 10.5, 0.3, x, 6.4, 6.05), rgb(0xe8e4dc))); parts.push(paint(sph(0.45, 1, 1, 1, x + (x < 0 ? 5.5 : -5.5), 7, 6.4, 8, 6), BRASS)); }
    parts.push(paint(lathe([[0, 13.9], [4.2, 13.9], [4.4, 14.4], [3.6, 14.3], [0, 12.6]], 28).translate(0, 0, 1.5), WHITE));
    parts.push(paint(cyl(0.45, 0.55, 3, 10, 0, 15.6, -3.2), CHROME), paint(rod([0, 16.9, -3.2], [0, 16.9, -0.9], 0.38, 8), CHROME));
    for (const x of [-2.6, 2.6]) parts.push(paint(cyl(0.7, 0.7, 0.8, 10, x, 14.6, -3.6), CHROME));
    parts.push(paint(box(24, 22, 0.8, 0, 26, -5.6), rgb(0xe8e2d6)));
    return merge(parts);
  },
  mirror() { const g = new THREE.PlaneGeometry(21, 18); g.translate(0, 26, -5.1); return g; },
  // the bulbs round the mirror, like a dressing room's
  vanityBulbs() {
    const parts = [];
    for (let i = 0; i < 7; i++) parts.push(sph(0.95, 1, 1, 1, -10.8 + i * 3.6, 36.2, -4.6, 10, 8));
    for (const x of [-11.6, 11.6]) for (let j = 0; j < 4; j++) parts.push(sph(0.95, 1, 1, 1, x, 19 + j * 4.6, -4.6, 10, 8));
    return paint(merge(parts), [1, 0.94, 0.82]);
  },
  // the magnifying mirror: the plate on the wall, the folding arm (drawn per frame), the round glass
  magPlate() { return merge([paint(cyl(2.2, 2.2, 0.6, 20, 0, 0, 0).rotateX(Math.PI / 2), CHROME)]); },
  magArm() { return paint(cyl(0.35, 0.35, 1, 8, 0, 0.5, 0), CHROME); },
  magRing() { return paint(merge([tor(8.6, 0.9, 0, 0, 0, 48, 10), cyl(0.6, 0.6, 2.4, 8, 0, -9.8, 0)]), CHROME); },
  magGlass() { return new THREE.CircleGeometry(8.4, 48); },
  // the fan in the wall: its grille (the blades behind it turn)
  fanGrille() {
    const parts = [paint(box(12, 12, 1.2, 0, 0, 0), WHITE)];
    for (let i = 0; i < 7; i++) parts.push(paint(box(10, 0.5, 0.6, 0, -4.5 + i * 1.5, 0.8), rgb(0xd8d6d0)));
    return merge(parts);
  },
  fanBlades() { const parts = []; for (let i = 0; i < 4; i++) parts.push(box(1.6, 4.6, 0.2, 0, 2.4, 0).rotateZ(i * Math.PI / 2)); return paint(merge(parts), rgb(0x9a9a9e)); },
  // the bathroom door in the wall, white panels; the hook (its own) drops into the eye
  door() {
    const parts = [paint(box(1.6, 34, 2, -9.2, 17, 0), WHITE), paint(box(1.6, 34, 2, 9.2, 17, 0), WHITE), paint(box(20, 1.6, 2, 0, 34.6, 0), WHITE)];
    parts.push(paint(box(17, 33.4, 0.8, 0, 16.7, -0.4), rgb(0xf4f2ec)));
    for (const [y, h] of [[8, 11], [24, 14]]) for (const x of [-4, 4]) parts.push(paint(box(6, h, 0.3, x, y, 0.1), rgb(0xe8e6de)));
    parts.push(paint(sph(0.8, 1, 1, 1, 6.5, 16, 0.6, 10, 8), BRASS), paint(sph(0.35, 1, 1, 1, 7.6, 22.5, 0.4, 8, 6), BRASS));
    parts.push(paint(tor(0.45, 0.14, 9.6, 22.5, 0.6, 12, 6), BRASS));
    return merge(parts);
  },
  hook() { return paint(merge([tor(0.32, 0.12, 0, 0, 0, 10, 5), rod([0, -0.3, 0], [0, -2.4, 0], 0.13, 6), tor(0.35, 0.12, 0.3, -2.4, 0, 8, 5, Math.PI)]), BRASS); },
  // the sweater on its hook
  sweater() {
    const g = new THREE.PlaneGeometry(14, 15, 1, 1); g.translate(0, -8, 0);
    const sl = (s) => { const p = new THREE.PlaneGeometry(4.6, 12); p.translate(0, -6, 0); p.rotateZ(s * 0.42); p.translate(s * 6.6, -1.4, -0.05); return p; };
    return merge([g, sl(-1), sl(1)]);
  },
  sweaterHook() { return paint(merge([box(3, 1, 0.6, 0, 0.6, -0.4), rod([0, 0.6, 0], [0, 1.6, 1.2], 0.25, 6)]), BRASS); },
  // the counter's altar: the green ceramic tree with its little plastic lights, the shell soaps in
  // their dish, two red candles nobody lights, the bowl of potpourri
  altar() {
    const cab = [paint(box(32, 13.6, 12, 0, 6.8, 0), rgb(0xf0ece4)), paint(box(33, 1, 13, 0, 13.9, 0.3), PINKT)];
    for (const x of [-8, 8]) cab.push(paint(box(14.6, 10.6, 0.3, x, 6.6, 6.05), rgb(0xe4ded4)), paint(sph(0.45, 1, 1, 1, x + (x < 0 ? 6 : -6), 7, 6.4, 8, 6), BRASS));
    return merge([...cab, BA.altarTop().translate(0, ALT, 0)]);
  },
  altarTop() {
    const parts = [];
    const tree = lathe([[0, 0], [4.2, 0], [4.2, 1.2], [3.6, 1.6], [3.4, 2.4], [2.9, 4.8], [3.1, 5.0], [2.3, 7.4], [2.5, 7.6], [1.6, 10.0], [1.8, 10.2], [0.8, 12.6], [0, 13.6]], 18);
    parts.push(paint(tree, rgb(0x1a6a3a)), paint(cyl(4.4, 4.6, 1.4, 18, 0, 0.7, 0), rgb(0xf0ece2)), paint(new THREE.OctahedronGeometry(0.9).translate(0, 14.2, 0), rgb(0xffe8a0)));
    parts.push(paint(cyl(4, 4.6, 0.8, 20, -11, 0.4, 2), rgb(0xf4e8e0)));
    for (let k = 0; k < 4; k++) { const a = k * 1.6; parts.push(paint(sph(1.3, 1, 0.55, 1.1, -11 + Math.cos(a) * 1.8, 1.3, 2 + Math.sin(a) * 1.8, 8, 6), rgb(0xf0b0b8))); }
    for (const x of [10, 13.5]) { parts.push(paint(cyl(1.2, 1.6, 1, 12, x, 0.5, -1), BRASS), paint(cyl(0.7, 0.7, 9, 10, x, 5.5, -1), rgb(0xb8141c))); }
    parts.push(paint(lathe([[0, 0], [2.4, 0.2], [3.4, 1.8], [3.6, 2.4], [0, 1.0]], 18).translate(5, 0, 3.5), rgb(0xd8c8b0)));
    const R = seeded(4); for (let k = 0; k < 10; k++) parts.push(paint(sph(0.6, 1, 0.6, 1, 5 + (R() - 0.5) * 4, 2.1, 3.5 + (R() - 0.5) * 4, 6, 4), rgb(R() < 0.5 ? 0x9a3a2a : 0xc87a3a)));
    return merge(parts);
  },
  // the nativity on the sill: the stable, Mary, Joseph, the manger and the baby (the star is a light)
  nativity() {
    const parts = [paint(box(26, 1, 12, 0, 0.5, 0), WOOD), paint(box(26, 16, 0.8, 0, 8.5, -5.6), rgb(0x5a3a22))];
    for (const x of [-12.5, 12.5]) parts.push(paint(box(0.9, 16, 0.9, x, 8.5, 4.5), WOOD));
    for (const s of [-1, 1]) parts.push(paint(box(15, 0.8, 13, s * 6.6, 18.4, 0).rotateZ(s * 0.42).translate(0, 0, 0), rgb(0x4a2a16)));
    parts.push(paint(lathe([[0, 0], [2.6, 0], [2.3, 4], [1.4, 7.6], [0, 8]], 14).translate(-6, 1, 0.5), rgb(0x3a5aa8)), paint(sph(1.25, 1, 1.1, 1, -6, 10.1, 0.5), SKIN), paint(sph(1.4, 1, 1.2, 1, -6, 10.4, 0.2), rgb(0xf0f0f4)));
    parts.push(paint(lathe([[0, 0], [2.8, 0], [2.5, 4.6], [1.5, 8.6], [0, 9]], 14).translate(6, 1, 0), rgb(0x7a5a3a)), paint(sph(1.3, 1, 1.1, 1, 6, 11.2, 0), SKIN), paint(cyl(0.25, 0.25, 13, 6, 8.4, 7.5, 1), WOOD));
    parts.push(paint(box(6.4, 3, 3.6, 0, 2.5, 2.6), rgb(0x8a6038)), paint(box(6, 0.8, 3.2, 0, 4.2, 2.6), rgb(0xe8c860)));
    parts.push(paint(sph(1.5, 1.5, 0.75, 0.8, 0, 4.9, 2.6), rgb(0xf8f4ec)), paint(sph(0.75, 1, 1, 1, -1.8, 5.1, 2.6, 8, 6), SKIN));
    return merge(parts);
  },
  // the toilet, its lid down in the Santa cover, the tank in crochet, the doll on top
  toilet() {
    const parts = [paint(lathe([[0, 0], [5, 0], [5.6, 2], [6.4, 7.8], [6.9, 9.2], [0, 9.2]], 28).scale(1, 1, 1.32).translate(0, 0, 1.2), WHITE)];
    parts.push(paint(box(15, 13, 6.5, 0, 15.5, -7.6), WHITE), paint(box(15.8, 1.2, 7.4, 0, 22.5, -7.6), WHITE));
    parts.push(paint(box(3, 0.7, 1.2, -5, 20, -4.3), CHROME));
    // the lid cover: red plush, a fringe of white fur, a face and a beard
    parts.push(paint(sph(7, 1, 0.16, 1.32, 0, 9.7, 1.2, 28, 8), rgb(0xc8141c)), paint(tor(7.2, 0.7, 0, 9.6, 1.2, 36, 6).rotateX(Math.PI / 2).scale(1, 1, 1.32).translate(0, 0, 0), WHITE));
    parts.push(paint(sph(2.8, 1, 0.22, 1, 0, 10.6, 1.6), SKIN), paint(sph(3.6, 1, 0.3, 1.1, 0, 10.5, 4.6), WHITE));
    for (const x of [-1, 1]) parts.push(paint(sph(0.35, 1, 0.5, 1, x, 10.95, 0.8, 6, 4), DARK));
    parts.push(paint(sph(0.6, 1, 0.6, 1, 0, 11.0, 1.9, 8, 6), rgb(0xe86a6a)));
    // the tank's crochet cover and the doll: a spare roll under her great skirt
    parts.push(paint(box(15.4, 9, 6.9, 0, 17.6, -7.6), rgb(0xf0e0e8)));
    for (let i = 0; i < 6; i++) parts.push(paint(box(15.6, 0.5, 7.1, 0, 13.6 + i * 1.6, -7.6), rgb(i % 2 ? 0xd8a0b8 : 0xa8d8c8)));
    parts.push(paint(lathe([[0, 0], [4.6, 0], [4.8, 0.8], [3.6, 2.6], [2.6, 5.2], [1.4, 6.6], [0, 6.8]], 22).translate(0, 23.1, -7.6), rgb(0xe8a8c8)));
    for (let i = 0; i < 4; i++) parts.push(paint(tor(4.4 - i * 0.8, 0.22, 0, 23.6 + i * 1.5, -7.6, 26, 4).rotateX(0).translate(0, 0, 0), rgb(0xf8f0f4)));
    parts.push(paint(sph(1.4, 1, 1.1, 1, 0, 31, -7.6), SKIN), paint(sph(1.5, 1, 0.8, 1, 0, 31.7, -7.8), rgb(0xe8c048)));
    return merge(parts);
  },
  // the towel bar and its two Christmas towels (not for using)
  towels() {
    const parts = [paint(rod([-11, 22, 0.8], [11, 22, 0.8], 0.4, 8), CHROME), paint(cyl(0.6, 0.6, 1.4, 8, -11.4, 22, 0.2).rotateX(Math.PI / 2), CHROME), paint(cyl(0.6, 0.6, 1.4, 8, 11.4, 22, 0.2).rotateX(Math.PI / 2), CHROME)];
    for (const [x, c] of [[-5.4, 0xb8141c], [5.4, 0x14583a]]) {
      parts.push(paint(box(9.6, 15, 1.2, x, 15.2, 1.2), rgb(c)));
      parts.push(paint(box(9.7, 2.2, 1.3, x, 11.6, 1.2), WHITE));
      for (let k = 0; k < 4; k++) parts.push(paint(new THREE.OctahedronGeometry(0.55).translate(x - 3 + k * 2, 11.6, 1.95), rgb(c)));
      for (let k = 0; k < 9; k++) parts.push(paint(box(0.3, 1.4, 0.3, x - 4.4 + k * 1.1, 7.1, 1.2), WHITE));
    }
    return merge(parts);
  },
  // the Precious Moments girl: the gown, the collar, her hands together (the head is its own, it turns)
  girl() {
    const parts = [paint(cyl(11, 12, 2.4, 32, 0, 1.2, 0), rgb(0xf4f2ee))];
    parts.push(paint(lathe([[0, 2.4], [9, 2.4], [9.4, 3.4], [8, 8], [6.4, 13], [5.2, 17.6], [0, 18.4]], 30), rgb(0xa8c8ec)));
    parts.push(paint(tor(5.6, 1.1, 0, 17.6, 0, 28, 8).rotateX(Math.PI / 2), rgb(0xf8f8f4)));
    for (const s of [-1, 1]) parts.push(paint(rod([s * 5.2, 16.6, 0.5], [s * 1.6, 13.8, 5.2], 1.5, 10), rgb(0xa8c8ec)));
    parts.push(paint(sph(1.5, 0.9, 1.5, 0.75, -0.75, 15.3, 6.1, 10, 8).rotateZ(0.05), SKIN), paint(sph(1.5, 0.9, 1.5, 0.75, 0.75, 15.3, 6.1, 10, 8).rotateZ(-0.05), SKIN));
    for (const s of [-1, 1]) parts.push(paint(sph(1.6, 1.2, 0.7, 1.5, s * 3, 2.9, 6.4, 10, 6), rgb(0xf0e8ec)));
    return merge(parts);
  },
  // her head: big and round, the brown cap of her hair and its bow, the cheeks, the eyes like teardrops
  girlHead() {
    const parts = [paint(sph(7, 1, 0.96, 0.96, 0, 0, 0, 28, 20), SKIN)];
    const hair = new THREE.SphereGeometry(7.25, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.46); hair.translate(0, 0.3, -0.4); parts.push(paint(hair, rgb(0x6a4228)));
    parts.push(paint(sph(1.6, 1.3, 0.8, 0.7, -3.6, 5.6, 2.2), rgb(0xf08aa8)), paint(sph(1.6, 1.3, 0.8, 0.7, -0.6, 5.9, 2.4), rgb(0xf08aa8)), paint(sph(0.7, 1, 1, 1, -2.1, 5.8, 2.6, 8, 6), rgb(0xe86a90)));
    for (const s of [-1, 1]) {
      parts.push(paint(sph(1.05, 0.62, 1.15, 0.45, s * 2.5, 0.6, 6.45, 12, 10).rotateZ(-s * 0.18), rgb(0x1a1210)));
      parts.push(paint(sph(1.4, 1.2, 0.5, 0.3, s * 3.9, -1.9, 5.8, 10, 6), rgb(0xf4a8b0)));
    }
    parts.push(paint(sph(0.5, 1.6, 0.4, 0.4, 0, -2.6, 6.75, 8, 6), rgb(0xc86a6a)));
    return merge(parts);
  },
  // a shelf on the wall for more of her collection (the little girls on it are drawn per frame)
  shelf() { return merge([paint(box(26, 1.2, 8, 0, 18, 2.4), WOOD), paint(box(1, 4, 6, -10, 15.6, 1.6), WOOD), paint(box(1, 4, 6, 10, 15.6, 1.6), WOOD), paint(cyl(5.6, 5.6, 0.12, 24, 0, 18.66, 2.6), rgb(0xf8f4ec))]); },
  // a framed cross-stitch
  stitchFrame() { return merge([paint(box(14.4, 17.6, 0.8, 0, 22, 0.4), rgb(0x8a6a3a)), paint(box(12.6, 15.8, 0.3, 0, 22, 0.75), rgb(0xd8c090))]); },
  stitch() { const g = new THREE.PlaneGeometry(12, 15); g.translate(0, 22, 0.95); return g; },
  // the hall's half-moon table and its lamp (the shade is lit)
  hallTable() {
    const parts = [paint(cyl(9, 9, 1.2, 24, 0, 14, 0, ).scale(1, 1, 0.55), WOOD)];
    for (const [x, z] of [[-6.5, 2], [6.5, 2], [0, 4.4]]) parts.push(paint(cyl(0.5, 0.4, 14, 8, x, 7, z), WOOD));
    parts.push(paint(lathe([[0, 0], [2.6, 0], [2.8, 0.8], [1.6, 2], [2.4, 6], [1.2, 9], [0.4, 9.4], [0, 9.6]], 18).translate(-3, 14.6, 1), rgb(0x3a6a5a)), paint(cyl(0.2, 0.2, 3, 6, -3, 25.4, 1), BRASS));
    parts.push(paint(lathe([[0, 0], [3.4, 0], [4, 1.6], [0, 1.4]], 18).translate(4, 14.6, 2), rgb(0xc8a050)));
    return merge(parts);
  },
  lampShade() { const g = new THREE.CylinderGeometry(3.0, 4.6, 4.8, 24, 1, true); g.translate(-3, 28.6, 1); return paint(g, rgb(0xf4e2c0)); },
  // the hall: the coat tree heaped with everybody's coats, the bench, the boots in the meltwater
  coats() {
    const parts = [paint(cyl(0.9, 1.1, 40, 10, 0, 20, 0), WOOD), paint(cyl(5, 6, 1.4, 16, 0, 0.7, 0), WOOD)];
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; parts.push(paint(rod([0, 36, 0], [Math.cos(a) * 3.6, 38.5, Math.sin(a) * 3.6], 0.4, 6), WOOD)); }
    const R = seeded(21), cols = [0x2a2a30, 0x6a1a1a, 0x1a3a5a, 0x5a4a2a, 0x3a5a3a, 0x8a6a4a, 0x1a1a1a];
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + 0.3, r = 3.2, c = rgb(cols[k % cols.length]), y = 36 - (k % 3) * 1.5;
      parts.push(paint(lathe([[0, 0], [3.4 + R(), 0.6], [3.8 + R(), 10], [3.0, 16 + R() * 4], [1.2, 19], [0, 19.5]], 10).scale(1, 1, 0.6).rotateY(a).translate(Math.cos(a) * r, y - 19.5, Math.sin(a) * r), c));
    }
    parts.push(paint(box(5, 2, 0.6, 2.4, 22, 4.6).rotateZ(0.3), rgb(0xd8b830)), paint(box(1.2, 18, 0.5, 4.2, 26, 3.4), rgb(0xb8141c)));
    parts.push(paint(box(26, 1.4, 9, 20, 9, 0), WOOD), paint(box(1.2, 9, 8, 8, 4.5, 0), WOOD), paint(box(1.2, 9, 8, 32, 4.5, 0), WOOD));
    for (const [x, z, c] of [[14, 4, 0x2a1a10], [17.4, 4.6, 0x2a1a10], [24, 4, 0x5a2a2a], [27, 4.4, 0x5a2a2a], [34, 7, 0x1a1a1a]]) parts.push(paint(merge([cyl(1.3, 1.4, 6, 10, 0, 3, 0), sph(1.5, 1.2, 0.7, 1.8, 0, 0.7, 1.2, 10, 6)]).translate(x, 0, z + 4), rgb(c)));
    return merge(parts);
  },
  // the basement door, ajar on the dark of the stairs (the chart glows down there)
  basement() {
    const parts = [paint(box(1.6, 34, 2, -9.2, 17, 0), WHITE), paint(box(1.6, 34, 2, 9.2, 17, 0), WHITE), paint(box(20, 1.6, 2, 0, 34.6, 0), WHITE)];
    parts.push(paint(box(17, 33.4, 0.4, 0, 16.7, -1.2), rgb(0x050506)));
    for (let k = 0; k < 6; k++) parts.push(paint(box(17, 0.8, 3, 0, 2 - k * 3, -2.6 - k * 3), rgb(0x2a1e18)));
    return merge(parts);
  },
  basementDoor() { const parts = [paint(box(17, 33.4, 0.8, 8.5, 16.7, 0), rgb(0xf4f2ec)), paint(sph(0.8, 1, 1, 1, 15, 16, 0.6, 10, 8), BRASS)]; return merge(parts); },
  chart() { const g = new THREE.PlaneGeometry(11, 7); g.translate(0, 14, -8); return g; },
  // the hall table: mom's handbag open on it, a little orange bottle in it, her photograph standing
  purse() {
    const parts = [paint(box(22, 1.2, 10, 0, 14, 0), WOOD)];
    for (const [x, z] of [[-10, -4], [10, -4], [-10, 4], [10, 4]]) parts.push(paint(cyl(0.6, 0.45, 14, 8, x, 7, z), WOOD));
    parts.push(paint(lathe([[0, 0], [4.4, 0], [5, 3], [4.2, 6], [0, 6.2]], 18).scale(1.3, 1, 0.6).translate(-3, 14.6, 0.8), rgb(0x6a1a2a)));
    parts.push(paint(tor(3, 0.35, -3, 21, 0.8, 18, 6, Math.PI), rgb(0xc8a050)));
    parts.push(paint(cyl(0.9, 0.9, 2.4, 12, -1.6, 21.4, 1.4), rgb(0xe88a1a)), paint(cyl(1.0, 1.0, 0.6, 12, -1.6, 22.8, 1.4), WHITE));
    parts.push(paint(box(7.4, 9.2, 0.8, 5.5, 19.6, -2).rotateX(-0.12), rgb(0xc8a050)));
    return merge(parts);
  },
  smile() { const g = new THREE.PlaneGeometry(6.2, 7.8); g.rotateX(-0.12); g.translate(5.5, 19.7, -1.55); return g; },
};

// (the values handed to the layers, filled and handed over again and again)
const KV = { aK: 1 }, kv = (k) => { KV.aK = k; return KV; };

extend({
  layers: {
    wxmVanity: (M) => [BA.vanity(), VCm(M, 'wxmVanityM', 0.25, { roughness: 0.4 }), 4, {}],
    wxmMirror: (M) => [BA.mirror(), M.wxmMirrorM || (M.wxmMirrorM = mirrorMaterial()), 4, { aK: 1 }],
    wxmVanityBulbs: (M) => [BA.vanityBulbs(), VCm(M, 'wxmVanityBulbsM', 1.6, { roughness: 0.2 }), 4, {}],
    wxmMagPlate: (M) => [BA.magPlate(), VCm(M, 'wxmMagPlateM', 0.35, { roughness: 0.2, metalness: 0.7 }), 4, {}],
    wxmMagArm: (M) => [BA.magArm(), VCm(M, 'wxmMagArmM', 0.35, { roughness: 0.2, metalness: 0.7 }), 24, {}],
    wxmMagRing: (M) => [BA.magRing(), VCm(M, 'wxmMagRingM', 0.4, { roughness: 0.2, metalness: 0.7 }), 4, {}],
    wxmMagGlass: (M) => [BA.magGlass(), M.wxmMirrorM2 || (M.wxmMirrorM2 = mirrorMaterial()), 4, { aK: 1 }],
    wxmFanGrille: (M) => [BA.fanGrille(), VCm(M, 'wxmFanGrilleM', 0.3, { roughness: 0.5 }), 4, {}],
    wxmFanBlades: (M) => [BA.fanBlades(), VCm(M, 'wxmFanBladesM', 0.2, { roughness: 0.5 }), 4, {}],
    wxmDoor: (M) => [BA.door(), VCm(M, 'wxmDoorM', 0.25, { roughness: 0.5 }), 4, {}],
    wxmHook: (M) => [BA.hook(), VCm(M, 'wxmHookM', 0.5, { roughness: 0.25, metalness: 0.7 }), 4, {}],
    wxmSweater: (M) => [BA.sweater(), pic(M, 'wxmSweaterM', tex().sweater, 0.4, { roughness: 0.95 }), 4, {}],
    wxmSweaterHook: (M) => [BA.sweaterHook(), VCm(M, 'wxmSweaterHookM', 0.4, { roughness: 0.3, metalness: 0.6 }), 4, {}],
    wxmAltar: (M) => [BA.altar(), VCm(M, 'wxmAltarM', 0.3, { roughness: 0.35 }), 4, {}],
    wxmNativity: (M) => [BA.nativity(), VCm(M, 'wxmNativityM', 0.3, { roughness: 0.6 }), 4, {}],
    wxmToilet: (M) => [BA.toilet(), VCm(M, 'wxmToiletM', 0.28, { roughness: 0.45 }), 4, {}],
    wxmTowels: (M) => [BA.towels(), VCm(M, 'wxmTowelsM', 0.3, { roughness: 0.9 }), 4, {}],
    wxmGirl: (M) => [BA.girl(), VCm(M, 'wxmGirlM', 0.3, { roughness: 0.3 }), 48, {}],
    wxmGirlHead: (M) => [BA.girlHead(), VCm(M, 'wxmGirlHeadM', 0.3, { roughness: 0.3 }), 48, {}],
    wxmShelf: (M) => [BA.shelf(), VCm(M, 'wxmShelfM', 0.3, { roughness: 0.6 }), 16, {}],
    wxmStitchFrame: (M) => [BA.stitchFrame(), VCm(M, 'wxmStitchFrameM', 0.3, { roughness: 0.6 }), 16, {}],
    wxmStitch: (M) => [BA.stitch(), pic(M, 'wxmStitchM', tex().stitch, 0.45), 16, {}],
    wxmHallTable: (M) => [BA.hallTable(), VCm(M, 'wxmHallTableM', 0.3, { roughness: 0.5 }), 12, {}],
    wxmLampShade: (M) => [BA.lampShade(), VCm(M, 'wxmLampShadeM', 1.3, { roughness: 0.8, side: THREE.DoubleSide }), 12, {}],
    wxmCoats: (M) => [BA.coats(), VCm(M, 'wxmCoatsM', 0.22, { roughness: 0.9 }), 4, {}],
    wxmBasement: (M) => [BA.basement(), VCm(M, 'wxmBasementM', 0.2, { roughness: 0.7 }), 4, {}],
    wxmBasementDoor: (M) => [BA.basementDoor(), VCm(M, 'wxmBasementDoorM', 0.25, { roughness: 0.5 }), 4, {}],
    wxmChart: (M) => [BA.chart(), pic(M, 'wxmChartM', tex().chart, 1.4), 4, {}],
    wxmPurse: (M) => [BA.purse(), VCm(M, 'wxmPurseM', 0.28, { roughness: 0.6 }), 4, {}],
    wxmSmile: (M) => [BA.smile(), pic(M, 'wxmSmileM', tex().smile, 0.55), 4, {}],
    wxmTreeLight: (M) => [new THREE.SphereGeometry(0.45, 7, 5), M.wxmTreeLightM || (M.wxmTreeLightM = tintLit(0.3, 2.6, { roughness: 0.3 })), 240, { aTint: 3, aK: 1 }],
  },
  parts: {
    // the bathroom's and the hall's things, each where it's sung
    wxmBathProp(S, it, p, q, yaw) {
      const L = S.layers;
      for (const k of ['wxmVanity', 'wxmMirror', 'wxmVanityBulbs', 'wxmMagPlate', 'wxmMagArm', 'wxmMagRing', 'wxmMagGlass', 'wxmFanGrille', 'wxmFanBlades', 'wxmDoor', 'wxmHook', 'wxmSweater', 'wxmSweaterHook', 'wxmAltar', 'wxmNativity', 'wxmToilet', 'wxmTowels', 'wxmGirl', 'wxmGirlHead', 'wxmCoats', 'wxmBasement', 'wxmBasementDoor', 'wxmChart', 'wxmPurse', 'wxmSmile', 'wxmTreeLight', 'wxmShelf', 'wxmStitchFrame', 'wxmStitch', 'wxmHallTable', 'wxmLampShade']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind, W = S.wxm || {};
      const at = S._wxb || (S._wxb = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const o = S._o, sv = S._s;
      const put = (layer, x = 0, y = 0, z = 0, qq = q, vals) => { const w = local(at, yaw, x * s, y * s, z * s, o); m.compose(w, qq, sv.set(s, s, s)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2, z = 4, x = 0) => { const w = local(at, yaw, x * s, y * s, z * s, o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.45, c = WARM, r = 40) => poolAt(S, at.x, (it.h ?? 0) + 0.15, at.z, r * s, c, k2);
      const turn = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      if (k === 'vanity') {
        // the bulbs round the mirror: bright, and brighter for "better lighting than your apartment"
        const blaze = 1 + (W.blaze ?? 0);
        put('wxmVanity'); put('wxmMirror', 0, 0, 0, q, kv(0.8 * blaze)); put('wxmVanityBulbs');
        for (let i = 0; i < 7; i += 2) light(36.2, 7 * blaze, [1, 0.94, 0.8], 0.55 * blaze, -3.4, -10.8 + i * 3.6);
        for (const x of [-11.6, 11.6]) light(26, 9 * blaze, [1, 0.94, 0.8], 0.5 * blaze, -3.4, x);
        spot(0.5 * blaze, [1, 0.95, 0.85], 46);
      }
      else if (k === 'mag') {
        // the magnifying mirror folds out from the wall on its arm and turns to her
        const e = it.out !== undefined ? smooth(it.out, it.out + 1.6, T) : 1, len = 2 + 15 * e;
        put('wxmMagPlate', 0, 26, 0.3);
        for (let j = 0; j < 4; j++) {
          const z0 = len * j / 4, z1 = len * (j + 1) / 4, dx = (j % 2 ? -1 : 1) * Math.sqrt(Math.max(0, 16 - (len / 4) ** 2)) * 0.5;
          for (const sg of [-1, 1]) { const a = local(at, yaw, sg * dx * 0.5 * s, 26 * s, z0 * s, S._wxa || (S._wxa = new THREE.Vector3())); const b = local(at, yaw, -sg * dx * 0.5 * s, 26 * s, z1 * s, o); const d = S._wxd || (S._wxd = new THREE.Vector3()); d.subVectors(b, a); const Ld = d.length(); (S._wxaq || (S._wxaq = new THREE.Quaternion())).setFromUnitVectors(S._wxup || (S._wxup = new THREE.Vector3(0, 1, 0)), d.normalize()); m.compose(a, S._wxaq, sv.set(s, Ld, s)); L.wxmMagArm.add(m); }
        }
        const fq = turn('_wxmq', -0.5 * e, 0, 0);
        put('wxmMagRing', 0, 26, len + 1, fq); put('wxmMagGlass', 0, 26, len + 1.05, fq, kv(1.1 + 0.9 * e));
        light(26, 22, [0.9, 0.95, 1], 0.25 + 0.35 * e, len + 2);
      }
      else if (k === 'fan') {
        // the fan in the wall goes round until she kills it
        const st = it.stop ?? 1e9, spin = T < st ? T * 14 : st * 14 + (1 - Math.exp(-(T - st) * 3)) * 4.6;
        put('wxmFanGrille', 0, 30, 0.2);
        const bq = turn('_wxfq', 0, 0, spin); put('wxmFanBlades', 0, 30, -0.2, bq);
      }
      else if (k === 'door') {
        // the hook and eye: up, then down into the eye on "lock the bathroom door"
        put('wxmDoor');
        const lk = it.lock ?? 1e9, a = smooth(lk - 0.25, lk + 0.05, T);
        const hq = turn('_wxhq', 0, 0, 1.25 * (1 - a)); put('wxmHook', 7.6, 22.5, 0.55, hq);
        light(30, 18, WARM, 0.15, 3);
      }
      else if (k === 'sweater') { put('wxmSweaterHook', 0, 30, 0); put('wxmSweater', 0, 30.5, 0.4); spot(0.3, WARM, 24); }
      else if (k === 'altar') {
        put('wxmAltar');
        // the ceramic tree's little plastic lights, a different colour each
        for (let j = 0; j < 22; j++) {
          const yy = ALT + 2.6 + (j / 22) * 10.2, rr = 4.0 - (j / 22) * 3.1, a = j * 2.4;
          const w = local(at, yaw, Math.cos(a) * rr * s, yy * s, Math.sin(a) * rr * s, o); m.compose(w, q, sv.set(s * 0.9, s * 0.9, s * 0.9));
          TL.aTint = CERAMIC[j % 5]; TL.aK = 0.7 + 0.3 * Math.sin(T * 2 + j); L.wxmTreeLight.add(m, TL);
        }
        light(ALT + 14.2, 6, [1, 0.9, 0.5], 0.9, 0); light(ALT + 8, 20, [0.6, 1, 0.6], 0.18, 2); spot(0.4, [1, 0.9, 0.8], 30);
      }
      else if (k === 'nativity') {
        put('wxmNativity');
        light(25, 5, [1, 0.9, 0.55], 1.3, 0); light(25, 20, [1, 0.9, 0.55], 0.25, 0);
        light(5.2, 7, [1, 0.95, 0.75], 0.9, 2.6); light(5.2, 18, [1, 0.95, 0.75], 0.3, 2.6); spot(0.4, [1, 0.9, 0.7], 30);
      }
      else if (k === 'toilet') { put('wxmToilet'); spot(0.4, WARM, 30); }
      else if (k === 'towels') put('wxmTowels');
      else if (k === 'girl') {
        // she turns her head to keep you in her painted eyes; on "she knows" she nods
        put('wxmGirl');
        const hp = local(at, yaw, 0, 25.2 * s, 0.4 * s, S._wxg || (S._wxg = new THREE.Vector3()));
        const rp = S.wxmRider; let ry = 0;
        if (rp) { const dx = rp.x - hp.x, dz = rp.z - hp.z; ry = Math.atan2(dx, dz) - yaw; ry = Math.atan2(Math.sin(ry), Math.cos(ry)); ry = clamp(ry, -1.0, 1.0); }
        const nod = it.nod !== undefined ? 0.16 * Math.sin(clamp((T - it.nod) / 1.6, 0, 1) * Math.PI) : 0;
        S._e.set(0.05 + nod, yaw + ry, Math.sin(T * 0.7) * 0.03); const hq = (S._wxgq || (S._wxgq = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(hp, hq, sv.set(s, s, s)); L.wxmGirlHead.add(m);
        light(26, 40, [1, 0.92, 0.85], 0.16, 6); spot(0.55, [1, 0.94, 0.88], 34);
      }
      else if (k === 'shelf') {
        // more of her collection: three little girls on a shelf, all turning to watch you go by
        put('wxmShelf');
        for (let j = 0; j < 3; j++) {
          const gx = (j - 1) * 7.4, ss = s * 0.24;
          const b = local(at, yaw, gx * s, 18.6 * s, 2.6 * s, S._wxsb || (S._wxsb = new THREE.Vector3())); m.compose(b, q, sv.set(ss, ss, ss)); L.wxmGirl.add(m);
          const hp = local(at, yaw, gx * s, (18.6 + 25.2 * 0.24) * s, 2.7 * s, S._wxg || (S._wxg = new THREE.Vector3()));
          const rp = S.wxmRider; let ry = 0; if (rp) { ry = Math.atan2(rp.x - hp.x, rp.z - hp.z) - yaw; ry = clamp(Math.atan2(Math.sin(ry), Math.cos(ry)), -1.1, 1.1); }
          S._e.set(0.05, yaw + ry, 0); const hq = (S._wxgq || (S._wxgq = new THREE.Quaternion())).setFromEuler(S._e); m.compose(hp, hq, sv.set(ss, ss, ss)); L.wxmGirlHead.add(m);
        }
        light(24, 26, [1, 0.92, 0.85], 0.12, 6);
      }
      else if (k === 'stitch') { put('wxmStitchFrame'); put('wxmStitch'); light(22, 18, WARM, 0.1, 3); }
      else if (k === 'hallTable') { put('wxmHallTable'); put('wxmLampShade'); light(28.6, 9, LAMPC, 1.0, 1, -3); light(26, 30, LAMPC, 0.2, 1, -3); spot(0.55, LAMPC, 30); }
      else if (k === 'coats') { put('wxmCoats'); spot(0.5, WARM, 46); light(42, 12, WARM, 0.6, 0); light(24, 40, WARM, 0.12, 6); }
      else if (k === 'basement') {
        // the door ajar, a cold glow coming up from the screens down there, flickering
        put('wxmBasement'); const dq = turn('_wxdq', 0.9, 0, 0); put('wxmBasementDoor', -8.5, 0, 0.4, dq); put('wxmChart');
        const fl = 0.75 + 0.25 * Math.sin(T * 11) * Math.sin(T * 3.7);
        light(10, 26, [0.5, 1, 0.75], 0.4 * fl, -2); light(14, 9, [0.6, 1, 0.8], 0.8 * fl, -7.5); spot(0.35 * fl, [0.5, 1, 0.8], 26);
      }
      else if (k === 'purse') { put('wxmPurse'); put('wxmSmile'); light(30, 22, WARM, 0.22, 0); spot(0.45, WARM, 30); }
    },
  },
  kits: {
    // what's on her walls between the things that are sung: shelves of her little girls, cross-stitch,
    // towels (in the hall: the tables with their lamps)
    wxmWalls(S, z, R) {
      const kinds = z.kinds || ['shelf', 'stitch', 'towels', 'stitch'];
      let n = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 1.7) {
        const side = n % 2 ? -1 : 1, kind = kinds[n % kinds.length]; n++;
        if ((z.skip || []).some(([a, b]) => t > a && t < b)) continue;
        S.items.push(onFloor(S, { t: t + R() * 0.2, x: side * (z.x ?? 35.4), rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, s: z.s ?? 1, kind, h: 0, parts: 'wxmBathProp', ahead: 40 }));
      }
    },
    wxmBath(S, z) {
      for (const c of z.at) {
        const it = { t: c.t, x: c.x, rot: c.rot ?? (c.wall ? (c.x > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.x > 0 ? Math.PI / 2 + 0.4 : -Math.PI / 2 - 0.4)), s: c.s ?? 1, y: c.y, kind: c.kind, lock: c.lock, stop: c.stop, out: c.out, nod: c.nod, h: 0, parts: 'wxmBathProp', ahead: c.ahead ?? 40 };
        S.items.push(onFloor(S, it));
      }
    },
  },
});
const TL = { aTint: null, aK: 1 };
