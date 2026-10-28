// Heart of the Party, the second half of the night's set-pieces. The night it happened, nine
// years ago: the clock past midnight, the phone ringing, the slot machine coming up hearts (the
// last one with a zipper: the catch), the match struck for fire, the hospital, the 1 and the 9
// that never burn down, the page that never turns. Then the empty seat with the ticket on it,
// the speaker stacks; his mother's street with the coffee and the church; the little stage in
// the dark, front row; the champagne; the banner over the road. Every name starts hpt.

import * as THREE from 'three';
import { extend, col, glowAt, poolAt, local, faceQ, PARTS } from './scenery.js';
import { merge, cyl, sph, box, paint, rgb, seeded, VC, HFOG, clamp, smooth, TAU, SIDE, cleared, lowered } from './hpt-sets.js';
import { FACE, HQ, HE, heartGeo, heartShape } from './hpt-pieces.js';

const BLANK = {};
const pick = (R, a) => a[Math.floor(R() * a.length)];
const roadY = (S, t) => S.course.sample(t).y;
const withUv = (g) => { if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; };
// a textured, self-lit material (pictures that should read at night), fogged
function picture(tex, k = 1.2, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { tMap: { value: tex }, uK: { value: k }, ...HFOG },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tMap; uniform float uK; uniform vec3 uHptFog; uniform float uHptFogD; varying vec2 vUv; varying vec3 vW;
      void main(){ vec4 t = texture2D(tMap, vUv); if (t.a < 0.5) discard; vec3 c = t.rgb * uK; float d = length(cameraPosition - vW); float f = 1.0 - exp(-pow(d * uHptFogD, 1.5)); gl_FragColor = vec4(mix(c, uHptFog, clamp(f, 0.0, 1.0)), 1.0); }`,
    side: THREE.DoubleSide, ...opts,
  });
}
const canvasTex = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// ---------- pictures ----------
let REEL_TEX = null, PAGE_TEX = null;
// the reel strip: six symbols round it; 0 a heart, 5 a heart with a zipper down it
function reelTexture() {
  return canvasTex(1536, 256, (g, W, H) => {
    const cw = W / 6;
    for (let i = 0; i < 6; i++) {
      const x0 = i * cw;
      g.fillStyle = '#f6f0e4'; g.fillRect(x0, 0, cw, H);
      g.strokeStyle = '#d8c8a8'; g.lineWidth = 4; g.strokeRect(x0 + 2, 2, cw - 4, H - 4);
      const cx = x0 + cw / 2, cy = H / 2;
      const heart = (s, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(cx, cy + 70 * s); g.bezierCurveTo(cx - 110 * s, cy - 10 * s, cx - 55 * s, cy - 95 * s, cx, cy - 40 * s); g.bezierCurveTo(cx + 55 * s, cy - 95 * s, cx + 110 * s, cy - 10 * s, cx, cy + 70 * s); g.fill(); };
      if (i === 0 || i === 5) {
        heart(1, '#e0102e');
        if (i === 5) { g.strokeStyle = '#ffd88a'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx, cy - 38); g.lineTo(cx, cy + 66); g.stroke(); for (let k = 0; k < 9; k++) { g.fillStyle = '#ffd88a'; g.fillRect(cx - (k % 2 ? 12 : 0), cy - 30 + k * 11, 12, 6); } }
      } else if (i === 1) { g.fillStyle = '#e8b030'; g.beginPath(); g.moveTo(cx - 60, cy + 50); g.quadraticCurveTo(cx - 55, cy - 70, cx, cy - 75); g.quadraticCurveTo(cx + 55, cy - 70, cx + 60, cy + 50); g.closePath(); g.fill(); g.beginPath(); g.arc(cx, cy + 62, 14, 0, Math.PI * 2); g.fill(); }
      else if (i === 2) { g.fillStyle = '#c8102e'; for (const dx of [-32, 30]) { g.beginPath(); g.arc(cx + dx, cy + 40, 34, 0, Math.PI * 2); g.fill(); } g.strokeStyle = '#2a7a2a'; g.lineWidth = 8; g.beginPath(); g.moveTo(cx - 32, cy + 8); g.quadraticCurveTo(cx, cy - 70, cx + 20, cy - 80); g.moveTo(cx + 30, cy + 8); g.quadraticCurveTo(cx + 26, cy - 50, cx + 20, cy - 80); g.stroke(); }
      else if (i === 3) { g.fillStyle = '#7a3ad8'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 36 : 82; g.lineTo(cx + Math.cos(a) * r, cy + 8 + Math.sin(a) * r); } g.closePath(); g.fill(); }
      else { g.fillStyle = '#1a8ad8'; g.beginPath(); g.moveTo(cx, cy - 80); g.lineTo(cx + 62, cy); g.lineTo(cx, cy + 80); g.lineTo(cx - 62, cy); g.closePath(); g.fill(); }
    }
  });
}
// a page in someone's hand: lines of writing, a date at the top, a little heart in the margin
function pageTexture() {
  return canvasTex(512, 720, (g, W, H) => {
    g.fillStyle = '#f2e8d4'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#b8c0d8'; g.lineWidth = 2; for (let y = 90; y < H - 30; y += 34) { g.beginPath(); g.moveTo(30, y); g.lineTo(W - 30, y); g.stroke(); }
    g.strokeStyle = '#e8a0a8'; g.beginPath(); g.moveTo(70, 0); g.lineTo(70, H); g.stroke();
    const R = seeded(77); g.strokeStyle = '#1a1a40'; g.lineWidth = 3;
    for (let y = 86, k = 0; y < H - 60; y += 34, k++) {
      if (k === 6 || k === 13) continue;
      let x = 82 + (k === 0 ? 180 : 0); g.beginPath(); g.moveTo(x, y);
      const end = W - 40 - R() * (k % 5 === 4 ? 220 : 40);
      while (x < end) { x += 7 + R() * 7; g.quadraticCurveTo(x - 4, y - 12 * R(), x, y - 3 + 6 * R()); }
      g.stroke();
    }
    g.fillStyle = '#c8102e'; g.beginPath(); const cx = 44, cy = 300; g.moveTo(cx, cy + 14); g.bezierCurveTo(cx - 22, cy - 2, cx - 11, cy - 19, cx, cy - 8); g.bezierCurveTo(cx + 11, cy - 19, cx + 22, cy - 2, cx, cy + 14); g.fill();
  });
}

// ---------- models ----------
const G = {
  // a street clock: the post, the head with a face each side (the hands are separate)
  clock() {
    const parts = [], iron = rgb(0x1a1820), gold = rgb(0xc8a050);
    parts.push(paint(cyl(1.4, 1.8, 1.2, 12, 0, 0.6, 0), iron), paint(cyl(0.55, 0.7, 13, 12, 0, 7.3, 0), iron), paint(cyl(0.9, 0.9, 0.6, 12, 0, 13.6, 0), gold));
    const rim = new THREE.CylinderGeometry(3.6, 3.6, 1.4, 40); rim.rotateX(Math.PI / 2); rim.translate(0, 17.6, 0); parts.push(paint(rim, iron));
    for (const z of [0.72, -0.72]) {
      const f = new THREE.CircleGeometry(3.15, 40); if (z < 0) f.rotateY(Math.PI); f.translate(0, 17.6, z); parts.push(paint(f, rgb(0xfff4e0)));
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; const m = box(k % 3 ? 0.18 : 0.32, k % 3 ? 0.5 : 0.9, 0.06, 0, 0, 0); m.rotateZ(-a); m.translate(Math.sin(a) * 2.6, 17.6 + Math.cos(a) * 2.6, z + Math.sign(z) * 0.03); parts.push(paint(m, rgb(0x14121a))); }
    }
    parts.push(paint(sph(0.6, 1, 1, 1, 0, 21.4, 0, 10, 8), gold));
    return merge(parts.map(withUv));
  },
  // a hand, from its pivot (the origin) up: length 1 (scaled by the part)
  hand() { return paint(box(0.24, 1, 0.08, 0, 0.42, 0), rgb(0x14121a)); },
  // the telephone: a rotary desk set, red; the handset is separate
  phone() {
    const parts = [], red = rgb(0xd8102a), dark = rgb(0x2a0a10), cream = rgb(0xf4ecdc);
    const body = new THREE.CylinderGeometry(4.2, 6.2, 5.2, 4, 1); body.rotateY(Math.PI / 4); body.scale(1.1, 1, 0.8); body.translate(0, 2.6, 0); parts.push(paint(body, red));
    parts.push(paint(box(9.4, 0.5, 7.4, 0, 0.25, 0), dark));
    // the dial, tipped toward you
    const dial = new THREE.CylinderGeometry(2.4, 2.4, 0.4, 32); dial.rotateX(Math.PI / 2 - 0.5); dial.translate(0, 3.9, 2.4); parts.push(paint(dial, cream));
    for (let k = 0; k < 10; k++) { const a = -0.4 + (k / 10) * 5.0; const h = new THREE.CylinderGeometry(0.34, 0.34, 0.5, 10); h.rotateX(Math.PI / 2 - 0.5); h.translate(Math.cos(a) * 1.7, 3.9 + Math.sin(a) * 1.7 * Math.cos(0.5), 2.4 + Math.sin(a) * 1.7 * Math.sin(0.5) + 0.12); parts.push(paint(h, rgb(0x1a1a1e))); }
    parts.push(paint(cyl(0.6, 0.6, 0.5, 16, 0, 0, 0).rotateX(Math.PI / 2 - 0.5).translate(0, 3.9, 2.55), red));
    // the cradle's two prongs
    for (const x of [-2.6, 2.6]) parts.push(paint(box(0.7, 1.4, 0.9, x, 5.6, -0.6), red));
    // the cord, in loops down the back
    for (let k = 0; k < 14; k++) parts.push(paint(new THREE.TorusGeometry(0.4, 0.13, 5, 10).translate(-4.4 - k * 0.08, 0.6 + k * 0.32, -2.8 - k * 0.1), red));
    return merge(parts.map(withUv));
  },
  handset() {
    const parts = [], red = rgb(0xd8102a);
    parts.push(paint(box(7.4, 0.9, 1.3, 0, 0, 0), red));
    for (const x of [-3.5, 3.5]) { const cup = new THREE.CylinderGeometry(1.25, 0.9, 1.2, 16); cup.translate(x, -0.7, 0); parts.push(paint(cup, red)); parts.push(paint(new THREE.CircleGeometry(1.0, 16).rotateX(Math.PI / 2).translate(x, -1.32, 0), rgb(0x1a0a0e))); }
    return merge(parts.map(withUv));
  },
  // the slot machine: the cabinet, its window, the top with its lights; the reels are separate
  slots() {
    const parts = [], red = rgb(0xb8102a), gold = rgb(0xe0b040), dark = rgb(0x14101a), chrome = rgb(0xd8dce4);
    parts.push(paint(box(11, 10, 7, 0, 5, 0), red));
    parts.push(paint(box(11.4, 0.6, 7.4, 0, 10.2, 0), gold));
    parts.push(paint(box(10.4, 6.6, 6.2, 0, 13.8, -0.4), red));
    parts.push(paint(box(9.2, 4.6, 0.3, 0, 13.6, 2.75), dark));                 // the window (the reels show through)
    for (const [w, h, x, y] of [[9.8, 0.4, 0, 16.1], [9.8, 0.4, 0, 11.1], [0.4, 5.2, -4.8, 13.6], [0.4, 5.2, 4.8, 13.6]]) parts.push(paint(box(w, h, 0.5, x, y, 2.8), chrome));
    const top = new THREE.CylinderGeometry(5.6, 5.6, 6.6, 24, 1, false, 0, Math.PI); top.rotateZ(Math.PI / 2); top.rotateY(Math.PI / 2); top.scale(1, 0.55, 1); top.translate(0, 17.1, -0.4); parts.push(paint(top, gold));
    parts.push(paint(box(9.2, 1.4, 1.4, 0, 6.6, 3.4), chrome));                  // the tray
    parts.push(paint(box(5, 1.6, 0.2, 0, 8.4, 3.55), dark));
    // the lever on the right
    parts.push(paint(cyl(0.9, 0.9, 1.6, 16, 0, 0, 0).rotateZ(Math.PI / 2).translate(6.2, 9.4, 0), chrome));
    return merge(parts.map(withUv));
  },
  lever() { return merge([paint(cyl(0.3, 0.3, 7, 8, 0, 3.5, 0), rgb(0xd8dce4)), paint(sph(1.1, 1, 1, 1, 0, 7.2, 0, 12, 8), rgb(0xe8102a))].map(withUv)); },
  // one reel: a drum round the x axis, its strip outward
  reel() { const g = new THREE.CylinderGeometry(2.3, 2.3, 2.6, 36, 1, true); g.rotateZ(Math.PI / 2); return g; },
  // the matchbox: the tray, the sleeve with its heart, the striker on the side to her; the match is separate
  // stood on its end like a building: the red sleeve with a white heart on the face to her, the
  // tray showing at the top, a striker down each narrow side
  matchbox() {
    const parts = [], red = rgb(0xc8102e), cream = rgb(0xf2e8d4), strike = rgb(0x3a2418);
    parts.push(paint(box(12, 18, 5, 0, 9, 0), red));
    parts.push(paint(box(11.4, 2.6, 4.6, 0, 18.9, 0.0), cream));
    parts.push(paint(box(12.2, 0.4, 5.2, 0, 17.8, 0), rgb(0xf8f0e0)));
    const h = heartGeo(4.2, 0.3, 0.08); h.translate(0, 8.6, 2.6); parts.push(paint(h, cream));
    for (const sx of [-1, 1]) { parts.push(paint(box(0.14, 15.6, 3.8, sx * 6.05, 9, 0), rgb(0x5a3a28))); for (let k = 0; k < 9; k++) parts.push(paint(box(0.2, 0.3, 3.6, sx * 6.1, 2 + k * 1.75, 0), strike)); }
    return merge(parts.map(withUv));
  },
  match() { return merge([paint(box(0.7, 0.7, 18, 0, 0, 0), rgb(0xe8c890)), paint(sph(0.75, 1, 1, 1.4, 0, 0, 9.4, 12, 8), rgb(0xd0102a))].map(withUv)); },
  // the 1 and the 9, number candles on a little pink cake (wicks on top)
  nineteen() {
    const parts = [], pink = rgb(0xff8ab8), blue = rgb(0x7ad0ff), white = rgb(0xfaf2f4), gold = rgb(0xe0b860);
    parts.push(paint(cyl(9.5, 9.5, 3.6, 36, 0, 1.8, 0), white), paint(new THREE.TorusGeometry(9.5, 0.5, 6, 36).rotateX(Math.PI / 2).translate(0, 3.6, 0), pink), paint(cyl(10.5, 10, 0.6, 36, 0, 0.3, 0), gold));
    // the 1
    parts.push(paint(box(2.2, 11, 2, -4.2, 9.1, 0), pink), paint(box(3.4, 1.3, 2, -5.2, 13.6, 0).rotateZ(0.6).translate(0, 0, 0), pink), paint(box(4.4, 1.2, 2.1, -4.2, 4.2, 0), pink));
    // the 9: a loop and its tail
    const loop = new THREE.TorusGeometry(2.4, 1.0, 10, 28); loop.translate(4.2, 11.4, 0); parts.push(paint(loop, blue));
    const tail = box(2.0, 8, 2, 6.0, 7.2, 0); parts.push(paint(tail, blue));
    const foot = new THREE.TorusGeometry(2.0, 0.9, 8, 16, Math.PI * 0.7); foot.rotateZ(Math.PI * 1.05); foot.translate(4.2, 4.6, 0); parts.push(paint(foot, blue));
    // stripes and wicks
    for (const [x, y] of [[-4.2, 7], [-4.2, 10], [6.0, 6], [6.0, 9]]) parts.push(paint(box(2.3, 0.4, 2.1, x, y, 0), white));
    parts.push(paint(cyl(0.1, 0.1, 1, 4, -4.2, 15.1, 0), rgb(0x1a1210)), paint(cyl(0.1, 0.1, 1, 4, 4.2, 14.3, 0), rgb(0x1a1210)));
    return merge(parts.map(withUv));
  },
  // the open book on its stand, the left page and the block under the right; the turning page is separate
  bookStand() {
    const parts = [], wood = rgb(0x5a2a18), dark = rgb(0x2a1008);
    parts.push(paint(cyl(1.2, 1.8, 9, 10, 0, 4.5, 0), wood), paint(cyl(4, 4.6, 0.8, 16, 0, 0.4, 0), dark));
    const top = box(22, 0.8, 13, 0, 0, 0); top.rotateX(0.5); top.translate(0, 10.2, 0); parts.push(paint(top, wood));
    return merge(parts.map(withUv));
  },
  pageBlock() {
    // both halves of the open book: cover and page stack, the spine at x 0, tipped up at 0.5 like the stand
    const parts = [], cover = rgb(0x6a0e1e);
    for (const s of [-1, 1]) { parts.push(paint(box(10.4, 0.4, 14, s * 5.3, 0, 0), cover)); parts.push(paint(box(9.8, 1.0, 13.2, s * 5.1, 0.7, 0), rgb(0xe8dcc4))); }
    const g = merge(parts.map(withUv)); g.rotateX(0.5); g.translate(0, 11.2, 0); return g;
  },
  // a page: textured on both sides (x from 0 to 9.8 off the spine, flat)
  page() { const g = new THREE.PlaneGeometry(9.8, 13.2); g.rotateX(-Math.PI / 2); g.translate(4.9, 0, 0); return g; },
  // a row of three theatre seats: velvet, gold; the two empty ones folded up the way they do, the
  // middle one down with the ticket on it (faces +z)
  seat() {
    const parts = [], velvet = rgb(0xb0102a), gold = rgb(0xd8a848), dark = rgb(0x1a0a10);
    for (const ox of [-7.4, 0, 7.4]) {
      if (ox === 0) parts.push(paint(box(6.4, 1.6, 5.6, ox, 4.4, 0.6), velvet));
      else parts.push(paint(box(6.2, 5.4, 1.5, ox, 5.6, -0.7).rotateX(0.08), velvet));
      const back = box(6.4, 8.4, 1.4, ox, 9.2, -2.2); back.rotateX(-0.12); parts.push(paint(back, velvet));
      for (let k = 0; k < 5; k++) parts.push(paint(box(0.25, 7.6, 0.2, ox - 2.4 + k * 1.2, 9.4, -1.48).rotateX(-0.12), rgb(0x8a0a1e)));
    }
    for (const x of [-11.1, -3.7, 3.7, 11.1]) { parts.push(paint(box(0.9, 7, 6.8, x, 3.5, -0.4), dark)); parts.push(paint(box(1.1, 0.6, 6.4, x, 7.2, 0.2), gold)); }
    parts.push(paint(box(22.4, 0.5, 6.6, 0, 0.25, -0.2), dark));
    parts.push(paint(box(2.6, 0.08, 1.2, 0.6, 5.25, 1.2).rotateY(0.3), rgb(0xf4ead2)), paint(box(0.7, 0.1, 1.2, 1.7, 5.26, 1.55).rotateY(0.3), rgb(0xc8102e)));
    return merge(parts.map(withUv));
  },
  // a speaker stack: two wide, three high, the grilles dark; the cones are separate
  stack() {
    const parts = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { parts.push(paint(box(3.3, 3.3, 2.6, -1.7 + c * 3.4, 1.7 + r * 3.4, 0), rgb(0x141218))); parts.push(paint(box(3.0, 3.0, 0.1, -1.7 + c * 3.4, 1.7 + r * 3.4, 1.31), rgb(0x24222a))); }
    parts.push(paint(box(7.2, 0.3, 2.8, 0, 10.35, 0), rgb(0x3a3a44)));
    return merge(parts.map(withUv));
  },
  cone() { const c = new THREE.CylinderGeometry(1.25, 0.4, 0.5, 20, 1, true); c.rotateX(Math.PI / 2); const cap = new THREE.SphereGeometry(0.42, 12, 6, 0, TAU, 0, Math.PI / 2); cap.rotateX(Math.PI / 2); cap.translate(0, 0, -0.2); return merge([paint(c, rgb(0x4a4a54)), paint(cap, rgb(0x2a2a30)), paint(new THREE.TorusGeometry(1.3, 0.12, 6, 20).translate(0, 0, 0.25), rgb(0x8a8a94))].map(withUv)); },
  // the coffee: a diner mug on its saucer
  mug() {
    const parts = [], white = rgb(0xf6f2ec), red = rgb(0xd8203a);
    parts.push(paint(cyl(6.4, 7.2, 0.7, 36, 0, 0.35, 0), white));
    const pts = [[0, 0.7], [3.6, 0.7], [3.9, 1.6], [4.3, 8.6], [4.4, 9.4], [3.9, 9.4], [3.8, 8.6], [0, 8.4]].map(([r, y]) => new THREE.Vector2(r, y));
    parts.push(paint(new THREE.LatheGeometry(pts, 32), white));
    parts.push(paint(cyl(4.38, 4.32, 0.9, 32, 0, 7.3, 0), red), paint(cyl(4.2, 4.12, 0.5, 32, 0, 2.2, 0), red));
    const handle = new THREE.TorusGeometry(2.2, 0.55, 10, 20, Math.PI * 1.25); handle.rotateZ(-Math.PI * 0.62); handle.translate(5.3, 5.2, 0); parts.push(paint(handle, white));
    parts.push(paint(cyl(3.8, 3.8, 0.1, 32, 0, 8.3, 0), rgb(0x3a1e0e)));
    return merge(parts.map(withUv));
  },
  // a white church with a steeple, its door and windows lit (front +z)
  church() {
    const parts = [], white = rgb(0xece8e4), roof = rgb(0x3a3440), warm = rgb(0xffd08a);
    parts.push(paint(box(14, 11, 22, 0, 5.5, -4), white));
    const r = new THREE.CylinderGeometry(0.01, 10.6, 6, 4, 1); r.rotateY(Math.PI / 4); r.scale(1, 1, 1.55); r.translate(0, 14, -4); parts.push(paint(r, roof));
    parts.push(paint(box(6, 14, 6, 0, 7, 8), white), paint(box(6.4, 4, 6.4, 0, 16, 8), white));
    const sp = new THREE.ConeGeometry(4.2, 12, 4); sp.rotateY(Math.PI / 4); sp.translate(0, 24, 8); parts.push(paint(sp, roof));
    parts.push(paint(box(0.4, 3, 0.4, 0, 31.5, 8), rgb(0xd8b060)), paint(box(1.8, 0.4, 0.4, 0, 32, 8), rgb(0xd8b060)));
    parts.push(paint(box(2.6, 4.6, 0.2, 0, 2.3, 11.05), warm));
    for (const x of [-7.05, 7.05]) for (const z of [-12, -6, 0]) parts.push(paint(box(0.2, 4, 2, x, 5.5, z - 1), warm));
    parts.push(paint(box(1.8, 2.2, 0.2, 0, 16, 11.25), warm));
    return merge(parts.map(withUv));
  },
  // the little stage in the dark: boards, a curtain, a drum kit, an amp, a mic, a chair in front
  memory() {
    const parts = [], wood = rgb(0x6a4424), curtain = rgb(0x5a0a1a), chrome = rgb(0xc8ccd4), drum = rgb(0xd8d0c0), R = seeded(13);
    parts.push(paint(box(18, 1.4, 11, 0, 0.7, 0), wood));
    for (let k = 0; k < 9; k++) parts.push(paint(box(0.12, 1.42, 11, -8 + k * 2, 0.71, 0), rgb(0x4a2c14)));
    for (let k = 0; k < 14; k++) parts.push(paint(box(1.4, 12, 0.6, -8.4 + k * 1.3, 7.4, -5.2 + (k % 2) * 0.4), curtain));
    // the kit: kick (a small heart on it), snare, toms, hi-hat, a cymbal
    const kick = new THREE.CylinderGeometry(1.8, 1.8, 1.6, 24); kick.rotateX(Math.PI / 2); kick.translate(0, 3.2, -1.6); parts.push(paint(kick, drum));
    const kh = heartGeo(0.9, 0.1, 0.03); kh.translate(0, 2.9, -0.75); parts.push(paint(kh, rgb(0xd8203a)));
    parts.push(paint(cyl(0.9, 0.9, 0.6, 16, 1.9, 3.6, -0.4), drum), paint(cyl(0.7, 0.7, 0.6, 16, -0.9, 5.2, -1.8), drum), paint(cyl(0.7, 0.7, 0.6, 16, 0.9, 5.2, -1.8), drum), paint(cyl(1.0, 1.0, 1.2, 16, -2.4, 2.4, -1.0), drum));
    parts.push(paint(cyl(1.3, 1.3, 0.06, 20, -2.6, 4.6, -0.2), rgb(0xe0b040)), paint(cyl(1.6, 1.6, 0.06, 20, 2.4, 6.0, -2.2), rgb(0xe0b040)));
    for (const [x, z, h] of [[-2.6, -0.2, 3.9], [2.4, -2.2, 5.3], [1.9, -0.4, 3.0]]) parts.push(paint(cyl(0.06, 0.06, h, 5, x, 1.4 + h / 2, z), chrome));
    parts.push(paint(box(0.8, 1.2, 0.8, 0, 2.0, -3.6), rgb(0x1a1a1e)));        // the drummer's stool
    // the amp and the mic
    parts.push(paint(box(3.2, 3.4, 1.8, 6.2, 3.1, -2.6), rgb(0x1a1a1e)), paint(box(2.9, 2.3, 0.1, 6.2, 3.3, -1.68), rgb(0x8a7a5a)));
    parts.push(paint(cyl(0.05, 0.05, 5.6, 5, -5, 4.2, 1.8), chrome), paint(cyl(0.7, 0.7, 0.1, 10, -5, 1.45, 1.8), chrome), paint(sph(0.28, 1, 1.3, 1, -5, 7.1, 1.8, 8, 6), rgb(0x2a2a30)));
    // the chair in front, on the floor: the front row
    const chair = [box(2.4, 0.25, 2.2, 0, 2.2, 0), box(2.4, 2.4, 0.2, 0, 3.6, -1.0)];
    for (const [x, z] of [[-1.05, -0.95], [1.05, -0.95], [-1.05, 0.95], [1.05, 0.95]]) chair.push(box(0.16, 2.2, 0.16, x, 1.1, z));
    for (const g of chair) { g.rotateY(Math.PI); g.translate(0, 0, 10.5); parts.push(paint(g, rgb(0x8a8a94))); }
    void R;
    return merge(parts.map(withUv));
  },
  // the champagne: the bottle (dark glass, gold foil, a cream label with a heart), tipped up; the cork is separate
  bottle() {
    const pts = [[0, 0], [3.4, 0], [3.6, 0.6], [3.6, 12], [3.2, 14.6], [1.6, 17.4], [1.3, 19.2], [1.45, 20.4], [1.3, 21], [0, 21]].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(pts, 32);
    { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) c.set(p.getY(i) > 16.4 ? rgb(0xe0b040) : rgb(0x12301e), i * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
    const parts = [g];
    const lab = new THREE.CylinderGeometry(3.65, 3.65, 5, 32, 1, true, -0.9, 1.8); lab.translate(0, 7, 0); parts.push(paint(lab, rgb(0xf2e8d0)));
    const h = heartGeo(1.3, 0.12, 0.03); h.translate(0, 6.6, 3.72); parts.push(paint(h, rgb(0xd8203a)));
    parts.push(paint(new THREE.TorusGeometry(3.68, 0.15, 6, 32).rotateX(Math.PI / 2).translate(0, 9.5, 0), rgb(0xe0b040)), paint(new THREE.TorusGeometry(3.68, 0.15, 6, 32).rotateX(Math.PI / 2).translate(0, 4.5, 0), rgb(0xe0b040)));
    return merge(parts.map(withUv));
  },
  cork() { return merge([paint(cyl(1.25, 1.1, 2.2, 14, 0, 1.1, 0), rgb(0xc8a070)), paint(sph(1.5, 1, 0.6, 1, 0, 2.4, 0, 12, 6), rgb(0xd8b080)), paint(box(2.8, 0.2, 0.2, 0, 1.8, 0), rgb(0xd8d8e0))].map(withUv)); },
  // coupes in a tower, five high
  coupes() {
    const parts = [], glass = rgb(0xf4f0e8), fizz = rgb(0xffd890);
    let y = 0;
    for (let n = 5; n >= 1; n--) {
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = (i - (n - 1) / 2) * 2.5, z = (j - (n - 1) / 2) * 2.5;
        parts.push(paint(new THREE.CylinderGeometry(1.2, 0.2, 0.8, 12, 1, true).translate(x, y + 1.9, z), glass));
        parts.push(paint(cyl(1.08, 1.08, 0.08, 12, x, y + 2.15, z), fizz));
        parts.push(paint(cyl(0.08, 0.08, 1.4, 5, x, y + 0.8, z), glass), paint(cyl(0.6, 0.6, 0.06, 10, x, y + 0.05, z), glass));
      }
      y += 2.35;
    }
    return merge(parts.map(withUv));
  },
  // a banner across the road on two poles (the words go on in front)
  banner() {
    const parts = [], cloth = rgb(0x8a0a24), gold = rgb(0xe0b040), steel = rgb(0x24202c);
    parts.push(paint(box(30, 7.6, 0.3, 0, 0, 0), cloth));
    for (const y of [3.95, -3.95]) parts.push(paint(box(30.6, 0.35, 0.36, 0, y, 0.02), gold));
    for (const x of [-15.3, 15.3]) parts.push(paint(box(0.35, 8, 0.36, x, 0, 0.02), gold));
    for (let k = 0; k < 15; k++) { const fl = new THREE.ConeGeometry(0.9, 1.8, 3); fl.rotateZ(Math.PI); fl.translate(-14 + k * 2, -4.9, 0); parts.push(paint(fl, k % 2 ? gold : rgb(0xff6fa0))); }
    for (const s of [-1, 1]) parts.push(paint(box(0.8, 40, 0.8, s * 21, -12, 0), steel), paint(box(6.6, 0.3, 0.3, s * 18, 3.8, 0), steel));
    return merge(parts.map(withUv));
  },
  bannerFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(3.5, 3.0, 1); g.translate(0, 0, 0.2); return g; },
};

// the turning page: textured both sides
function pageMaterial() {
  const tex = PAGE_TEX || (PAGE_TEX = pageTexture());
  const m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.9, side: THREE.DoubleSide });
  return m;
}

extend({
  layers: {
    hptClock: (M) => [G.clock(), VC(M, 'hptIronM', { roughness: 0.4, metalness: 0.35, lit: 0.5 }), 2, BLANK],
    hptHand: (M) => [G.hand(), VC(M, 'hptIronM', { roughness: 0.4, metalness: 0.35, lit: 0.5 }), 8, BLANK],
    hptPhone: (M) => [G.phone(), VC(M, 'hptGlossM', { roughness: 0.25, metalness: 0.15, lit: 0.45 }), 2, BLANK],
    hptHandset: (M) => [G.handset(), VC(M, 'hptGlossM', { roughness: 0.25, metalness: 0.15, lit: 0.45 }), 2, BLANK],
    hptSlots: (M) => [G.slots(), VC(M, 'hptGlossM', { roughness: 0.25, metalness: 0.15, lit: 0.45 }), 2, BLANK],
    hptLever: (M) => [G.lever(), VC(M, 'hptGlossM', { roughness: 0.25, metalness: 0.15, lit: 0.45 }), 2, BLANK],
    hptReel: (M) => [G.reel(), M.hptReelM || (M.hptReelM = picture(REEL_TEX || (REEL_TEX = reelTexture()), 1.25)), 6, BLANK],
    hptMatchbox: (M) => [G.matchbox(), VC(M, 'hptCardM2', { roughness: 0.6, metalness: 0, lit: 0.45 }), 2, BLANK],
    hptMatch: (M) => [G.match(), VC(M, 'hptCardM2', { roughness: 0.6, metalness: 0, lit: 0.45 }), 2, BLANK],
    hptNineteen: (M) => [G.nineteen(), VC(M, 'hptWaxM', { roughness: 0.55, metalness: 0, lit: 0.5 }), 2, BLANK],
    hptBookStand: (M) => [G.bookStand(), VC(M, 'hptWoodM', { roughness: 0.7, metalness: 0, lit: 0.35 }), 2, BLANK],
    hptPageBlock: (M) => [G.pageBlock(), VC(M, 'hptWoodM', { roughness: 0.7, metalness: 0, lit: 0.35 }), 2, BLANK],
    hptPage: (M) => [G.page(), M.hptPageM || (M.hptPageM = fogPage(pageMaterial())), 4, BLANK],
    hptSeat: (M) => [G.seat(), VC(M, 'hptVelvetM', { roughness: 0.75, metalness: 0.1, lit: 0.45 }), 2, BLANK],
    hptStack: (M) => [G.stack(), VC(M, 'hptDarkM2', { roughness: 0.7, metalness: 0.2, lit: 0.3 }), 40, BLANK],
    hptCone: (M) => [G.cone(), VC(M, 'hptDarkM2', { roughness: 0.7, metalness: 0.2, lit: 0.3 }), 240, BLANK],
    hptMug: (M) => [G.mug(), VC(M, 'hptChinaM', { roughness: 0.35, metalness: 0, lit: 0.42 }), 2, BLANK],
    hptChurch: (M) => [G.church(), VC(M, 'hptChinaM', { roughness: 0.35, metalness: 0, lit: 0.42 }), 2, BLANK],
    hptMemory: (M) => [G.memory(), VC(M, 'hptMemM', { roughness: 0.6, metalness: 0.1, lit: 0.6 }), 2, BLANK],
    hptBottle: (M) => [G.bottle(), VC(M, 'hptBottleM', { roughness: 0.12, metalness: 0.4, lit: 0.42 }), 2, BLANK],
    hptCork: (M) => [G.cork(), VC(M, 'hptCardM2', { roughness: 0.6, metalness: 0, lit: 0.45 }), 2, BLANK],
    hptCoupes: (M) => [G.coupes(), VC(M, 'hptGlassM', { roughness: 0.08, metalness: 0.3, lit: 0.55, transparent: true, opacity: 0.85 }), 2, BLANK],
    hptBanner: (M) => [G.banner(), VC(M, 'hptClothM', { roughness: 0.8, metalness: 0, lit: 0.45 }), 4, BLANK],
    hptBannerFace: (M) => [G.bannerFace(), M.sign, 4, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // the street clock, a few minutes past midnight, the second hand ticking on the beat
    hptClock(S, it, p, q, yaw) {
      const L = S.layers.hptClock, H = S.layers.hptHand, m = S._m, s = it.s ?? 1;
      m.compose(p, q, S._s.set(s, s, s)); L.add(m);
      const T = S.tNow ?? 0, min = 2 + clamp((T - (it.t - 8)) * 0.6, 0, 9), bp = S.course.beatAt(T);
      const hands = [[(min / 60) * TAU / 12, 1.7, 0.32], [(min / 60) * TAU, 2.5, 0.26], [Math.floor(bp) * TAU / 60, 2.8, 0.1]];
      const e = HE(S);
      for (const z of [0.82, -0.82]) for (const [a, len, w] of hands) {
        e.set(0, yaw, -a * Math.sign(z)); const hq = HQ(S).setFromEuler(e);
        m.compose(local(p, yaw, 0, 17.6 * s, z * s, S._o), hq, S._s.set(w / 0.24 * s, len * s, s)); H.add(m);
      }
      if (S.tNow === undefined) return;
      for (const z of [1.6, -1.6]) { const w = local(p, yaw, 0, 17.6 * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, 8 * s, [1, 0.95, 0.85], 0.5); }
      poolAt(S, p.x, p.y + 0.2, p.z, 16 * s, [0.75, 0.85, 1], 0.4);
    },
    // the phone, ringing: the handset jumping on its cradle in bursts
    hptPhone(S, it, p, q, yaw) {
      const L = S.layers.hptPhone, Hs = S.layers.hptHandset, m = S._m, s = it.s ?? 1;
      m.compose(p, q, S._s.set(s, s, s)); L.add(m);
      const T = S.tNow ?? 0;
      let ring = 0; for (const r of it.rings || []) if (T >= r && T < r + 0.42) ring = 1;
      const j = ring * Math.abs(Math.sin(T * 70)) * 0.9, tilt = ring * Math.sin(T * 47) * 0.12;
      const e = HE(S); e.set(tilt, yaw, tilt * 0.6); const hq = HQ(S).setFromEuler(e);
      m.compose(local(p, yaw, 0, (6.9 + j) * s, -0.6 * s, S._o), hq, S._s.set(s, s, s)); Hs.add(m);
      if (S.tNow === undefined) return;
      glowAt(S, p.x, p.y + 6 * s, p.z, 26 * s, [1, 0.2, 0.25], 0.12 + 0.5 * ring);
      if (ring) { const w = local(p, yaw, 0, 8.6 * s, 0, S._o); for (let k = 0; k < 6; k++) { const a = k * 1.05 + T * 9; glowAt(S, w.x + Math.cos(a) * 5 * s, w.y + Math.sin(a * 1.3) * 1.5 * s, w.z + Math.sin(a) * 5 * s, 1.4 * s, [1, 0.85, 0.4], 1.6); } }
      poolAt(S, p.x, p.y + 0.2, p.z, 22 * s, [0.6, 0.75, 1], 0.4);
    },
    // the slot machine: the lever goes down, the reels spin and land on hearts one by one
    // (the third on the heart with the zipper: the catch), then the lights and the coins
    hptSlots(S, it, p, q, yaw) {
      const L = S.layers.hptSlots, Lv = S.layers.hptLever, Rl = S.layers.hptReel, m = S._m, s = it.s ?? 1;
      m.compose(p, q, S._s.set(s, s, s)); L.add(m);
      const T = S.tNow ?? 0, stops = it.stops || [0, 0, 0], pull = it.pull ?? stops[0] - 0.8;
      const lv = smooth(pull, pull + 0.15, T) * (1 - smooth(pull + 0.35, pull + 0.8, T));
      const e = HE(S); e.set(lv * 1.1, yaw, 0); const lq = HQ(S).setFromEuler(e);
      m.compose(local(p, yaw, 6.2 * s, 9.4 * s, 0, S._o), lq, S._s.set(s, s, s)); Lv.add(m);
      const sym = [0, 0, 5];
      for (let k = 0; k < 3; k++) {
        // landed: the symbol at the front; before that spinning (decelerating into the stop)
        const land = ((sym[k] + 0.5) / 6) * TAU, d = stops[k] - T;
        let a = land;
        if (T > pull && d > 0) a = land + d * 14 + d * d * 6;
        else if (T <= pull) a = land + 2.2;
        const e2 = HE(S); e2.set(a, yaw, 0); const rq = HQ(S).setFromEuler(e2);
        m.compose(local(p, yaw, (k - 1) * 2.9 * s, 13.6 * s, 0.4 * s, S._o), rq, S._s.set(s, s, s)); Rl.add(m);
      }
      if (S.tNow === undefined) return;
      const won = T > stops[2] ? 1 : 0, chase = Math.floor(T * 10);
      const w = S._o;
      for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI; local(p, yaw, -Math.cos(a) * 5.4 * s, (17.1 + Math.sin(a) * 3.0) * s, 1.2 * s, w); const on = (k + chase) % 3 === 0; glowAt(S, w.x, w.y, w.z, 1.1 * s, [1, 0.85, 0.4], (on ? 1.6 : 0.4) * (0.5 + won)); }
      for (let k = 0; k < 10; k++) { local(p, yaw, (-4.6 + k * 1.02) * s, 10.6 * s, 3.8 * s, w); glowAt(S, w.x, w.y, w.z, 0.9 * s, [1, 0.3, 0.4], 0.5 + won * ((k + chase) % 2) * 1.6); }
      local(p, yaw, 0, 13.6 * s, 3.4 * s, w); glowAt(S, w.x, w.y, w.z, 14 * s, [1, 0.95, 0.85], 0.25 + 0.35 * won);
      // the coins: a gold fountain out of the tray after the jackpot
      if (won && T < stops[2] + 5) {
        const d = T - stops[2];
        for (let k = 0; k < 40; k++) {
          const ph = ((d * 0.9 + k / 40) % 1), vx = Math.sin(k * 2.39) * 4, vz = 6 + (k % 5);
          local(p, yaw, vx * ph * s, (7 + 10 * ph - 22 * ph * ph) * s, (3.6 + vz * ph) * s, w);
          if (w.y > p.y) glowAt(S, w.x, w.y, w.z, 0.8 * s, [1, 0.8, 0.3], 1.4);
        }
      }
      poolAt(S, p.x, p.y + 0.2, p.z, 26 * s, [1, 0.5, 0.4], 0.3 + 0.4 * won);
    },
    // the match: laid against the striker, struck along it on the beat, then up and burning
    hptMatch(S, it, p, q, yaw) {
      const L = S.layers.hptMatchbox, Mt = S.layers.hptMatch, m = S._m, s = it.s ?? 1;
      m.compose(p, q, S._s.set(s, s, s)); L.add(m);
      const T = S.tNow ?? 0, st = it.strike ?? it.t - 1.2;
      // head down at the top of the striker on the side toward the road (+x); dragged down it on
      // the beat; then turned head up and lifted, burning
      const sd = it.x < 0 ? 1 : -1;
      const u = smooth(st - 0.26, st, T), up = smooth(st + 0.05, st + 0.75, T);
      const hx = sd * (6.7 + up * 3), hy = 16 - 12.5 * u + up * 16, hz = 0.5 + up * 2;
      const e = HE(S); e.set(Math.PI / 2 - Math.PI * up, yaw, sd * 0.12 * (1 - up)); const mq = HQ(S).setFromEuler(e);
      // the match's head is at its +z end: put that end at (hx, hy, hz)
      const dir = new THREE.Vector3(0, 0, 9.4).applyQuaternion(mq);
      const hw = local(p, yaw, hx * s, hy * s, hz * s, S._o);
      const mp = S._hm || (S._hm = new THREE.Vector3()); mp.set(hw.x - dir.x * s, hw.y - dir.y * s, hw.z - dir.z * s);
      m.compose(mp, mq, S._s.set(s, s, s)); Mt.add(m);
      if (S.tNow === undefined) return;
      const lit = T > st ? 1 : 0;
      if (lit) {
        const d = T - st, flare = Math.exp(-d * 3);
        const hp = S._hm2 || (S._hm2 = new THREE.Vector3()); hp.set(mp.x + dir.x * s, mp.y + dir.y * s, mp.z + dir.z * s);
        for (let k = 0; k < 7; k++) { const wob = Math.sin(T * (8 + k) + k) * 0.3; glowAt(S, hp.x + wob * s, hp.y + (0.6 + k * 0.9) * s, hp.z, (3.4 - Math.abs(k - 1.5) * 0.35) * s, [1, 0.6 + 0.04 * k, 0.18 + 0.03 * k], (1.9 - k * 0.2) * (0.85 + 0.15 * Math.sin(T * 21 + k))); }
        glowAt(S, hp.x, hp.y + 2 * s, hp.z, (16 + 30 * flare) * s, [1, 0.62, 0.25], 0.35 + 1.6 * flare);
        if (d < 0.6) for (let k = 0; k < 24; k++) { const a = k * 2.4, r = d * (8 + (k % 5) * 3); glowAt(S, hp.x + Math.cos(a) * r * s, hp.y + Math.abs(Math.sin(a * 2)) * r * s - d * d * 12, hp.z + Math.sin(a) * r * s, 0.7 * s, [1, 0.75, 0.3], 2.4 * (1 - d / 0.6)); }
        poolAt(S, p.x, p.y + 0.2, p.z, 34 * s, [1, 0.6, 0.25], 0.5 + 0.8 * flare);
      }
    },
    // nineteen, the candles that never go out
    hptNineteen(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.hptNineteen.add(m);
      if (S.tNow === undefined) return;
      const T = S.tNow;
      for (const [x, y] of [[-4.2, 15.9], [4.2, 15.1]]) { const w = local(p, yaw, x * s, y * s, 0, S._o); const f = 0.85 + 0.15 * Math.sin(T * 17 + x); glowAt(S, w.x, w.y, w.z, 2.2 * s, [1, 0.68, 0.28], 2.2 * f); glowAt(S, w.x, w.y + 0.7 * s, w.z, 1.2 * s, [1, 0.95, 0.75], 1.8 * f); }
      glowAt(S, p.x, p.y + 12 * s, p.z, 30 * s, [1, 0.6, 0.6], 0.2); poolAt(S, p.x, p.y + 0.2, p.z, 32 * s, [1, 0.7, 0.5], 0.4);
    },
    // the book: a page lifts and falls back, lifts and falls back, never turns
    hptBook(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.hptBookStand.add(m); S.layers.hptPageBlock.add(m);
      const T = S.tNow ?? 0, ph = ((T - (it.t - 6)) / 2.0) % 1, lift = Math.sin(Math.PI * clamp(ph * 1.3, 0, 1)) * 1.75;
      // the page on the spine (x 0), tipped up with the book at 0.5, lifting toward the other side
      const e = HE(S); e.set(0.5, yaw, lift); const pq = HQ(S).setFromEuler(e);
      m.compose(local(p, yaw, 0, 12.26 * s, 0.6 * s, S._o), pq, S._s.set(s, s, s)); S.layers.hptPage.add(m);
      if (S.tNow === undefined) return;
      const w = local(p, yaw, 0, 16 * s, 4 * s, S._o); glowAt(S, w.x, w.y, w.z, 22 * s, [1, 0.88, 0.7], 0.25); poolAt(S, p.x, p.y + 0.2, p.z, 26 * s, [1, 0.85, 0.65], 0.4);
    },
    // the empty seat with the ticket on it, under one light
    hptSeat(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.hptSeat.add(m);
      if (S.tNow === undefined) return;
      const T = S.tNow, w = S._o;
      for (let k = 0; k < 10; k++) { local(p, yaw, 0, (40 - k * 3.6) * s, 0, w); glowAt(S, w.x, w.y, w.z, (2 + k * 1.1) * s, [1, 0.95, 0.85], 0.1 + 0.02 * k); }
      poolAt(S, p.x, p.y + 0.2, p.z, 20 * s, [1, 0.95, 0.85], 1.1);
      local(p, yaw, 0.6 * s, 5.4 * s, 1.3 * s, w); glowAt(S, w.x, w.y, w.z, 2.2 * s, [1, 1, 0.95], 0.8 + 0.2 * Math.sin(T * 3));
    },
    // a stack of speakers, every cone pushing out on the kick
    hptStack(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.hptStack.add(m);
      const T = S.tNow ?? 0, bp = S.course.beatAt(T), f = bp - Math.floor(bp), k = Math.exp(-f * 9) * (it.k ?? 1);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
        m.compose(local(p, yaw, (-1.7 + c * 3.4) * s, (1.7 + r * 3.4) * s, (1.45 + 0.25 * k) * s, S._o), q, S._s.set(s, s, s * (1 + 1.4 * k))); S.layers.hptCone.add(m);
      }
      if (S.tNow === undefined) return;
      const w = local(p, yaw, 0, 10.8 * s, 1 * s, S._o); glowAt(S, w.x, w.y, w.z, 2 * s, [1, 0.2, 0.3], 0.6 + 1.4 * k);
    },
    // the coffee, steam coming off it
    hptMug(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.hptMug.add(m);
      if (S.tNow === undefined) return;
      const T = S.tNow, w = S._o;
      for (let k = 0; k < 14; k++) { const ph = (T * 0.32 + k / 14) % 1; local(p, yaw, Math.sin(ph * 6 + k) * 1.6 * s, (9 + ph * 14) * s, Math.cos(ph * 5 + k) * 1.2 * s, w); glowAt(S, w.x, w.y, w.z, (2.4 + ph * 4) * s, [1, 0.95, 0.92], 0.22 * Math.sin(Math.PI * ph)); }
      poolAt(S, p.x, p.y + 0.2, p.z, 20 * s, [1, 0.85, 0.65], 0.45);
    },
    // the church on a Sunday, its door open and lit, the bell
    hptChurch(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.hptChurch.add(m);
      if (S.tNow === undefined) return;
      const w = local(p, yaw, 0, 16 * s, 11.6 * s, S._o); glowAt(S, w.x, w.y, w.z, 4 * s, [1, 0.8, 0.5], 0.8);
      local(p, yaw, 0, 2.5 * s, 12 * s, w); glowAt(S, w.x, w.y, w.z, 9 * s, [1, 0.8, 0.5], 0.5); poolAt(S, w.x, p.y + 0.2, w.z, 16 * s, [1, 0.8, 0.5], 0.6);
    },
    // the little stage in the dark: it comes up out of the dark like a memory, its one light
    // goes off on "before the world went wrong"
    hptMemory(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.hptMemory.add(m);
      if (S.tNow === undefined) return;
      const T = S.tNow, on = smooth(it.on ?? it.t - 4, (it.on ?? it.t - 4) + 1.2, T) * (1 - smooth(it.off ?? 1e9, (it.off ?? 1e9) + 0.25, T));
      const fl = on * (0.92 + 0.08 * Math.sin(T * 13)), w = S._o, warm = [1, 0.78, 0.48];
      for (let k = 0; k < 9; k++) { local(p, yaw, 0, (30 - k * 3) * s, 1 * s, w); glowAt(S, w.x, w.y, w.z, (1.6 + k * 1.0) * s, warm, (0.12 + 0.02 * k) * fl); }
      poolAt(S, p.x, p.y + 1.5 * s, p.z, 18 * s, warm, 1.2 * fl);
      for (let k = 0; k < 8; k++) { local(p, yaw, (-7 + k * 2) * s, 13.6 * s, 4 * s, w); glowAt(S, w.x, w.y + Math.sin(k * 1.7) * 0.3, w.z, 1.0 * s, [1, 0.85, 0.55], 1.3 * fl); }
      for (let k = 0; k < 16; k++) { const a = T * 0.3 + k * 2.39; local(p, yaw, Math.sin(a) * 5 * s, (3 + ((T * 0.4 + k * 0.37) % 1) * 12) * s, Math.cos(a * 1.3) * 3 * s, w); glowAt(S, w.x, w.y, w.z, 0.35 * s, [1, 0.9, 0.7], 1.2 * fl); }
      local(p, yaw, 0, 1.2 * s, 10.5 * s, w); poolAt(S, w.x, p.y + 0.2, w.z, 8 * s, warm, 0.8 * fl);
      glowAt(S, p.x, p.y + 6 * s, p.z, 30 * s, warm, 0.18 * on);
    },
    // the champagne: the cork pops on the beat and goes over the road, the foam fountains
    hptBubbly(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, tip = it.tip ?? 0.42;
      const e = HE(S); e.set(0, yaw, tip * (it.x > 0 ? 1 : -1)); const bq = HQ(S).setFromEuler(e);
      m.compose(p, bq, S._s.set(s, s, s)); S.layers.hptBottle.add(m);
      const T = S.tNow ?? 0, pop = it.pop ?? it.t - 1.2, d = T - pop;
      // the neck's end, in the world
      const ax = new THREE.Vector3(0, 21 * s, 0).applyQuaternion(bq), neck = S._hb || (S._hb = new THREE.Vector3()); neck.set(p.x + ax.x, p.y + ax.y, p.z + ax.z);
      if (d < 0) { m.compose(neck, bq, S._s.set(s, s, s)); S.layers.hptCork.add(m); }
      else {
        const dir = ax.clone().normalize();
        const cp = S._hc || (S._hc = new THREE.Vector3()); cp.copy(neck).addScaledVector(dir, 38 * d * s); cp.y -= 16 * d * d;
        e.set(d * 9, yaw, d * 7); m.compose(cp, HQ(S).setFromEuler(e), S._s.set(s, s, s)); S.layers.hptCork.add(m);
      }
      m.compose(local(p, yaw, (it.x > 0 ? -1 : 1) * 11 * s, 0, 4 * s, S._o), q, S._s.set(s * 0.9, s * 0.9, s * 0.9)); S.layers.hptCoupes.add(m);
      if (S.tNow === undefined) return;
      if (d >= 0 && d < 3.5) {
        const dir = ax.clone().normalize(), k0 = Math.exp(-d * 0.8);
        for (let k = 0; k < 46; k++) {
          const ph = ((d * 1.6 + k / 46) % 1), spread = Math.sin(k * 2.39) * 0.35, w = S._o;
          w.copy(neck).addScaledVector(dir, 22 * ph * s);
          w.x += Math.cos(yaw) * spread * 14 * ph * s; w.z -= Math.sin(yaw) * spread * 14 * ph * s; w.y -= 9 * ph * ph * s;
          glowAt(S, w.x, w.y, w.z, (1.0 + 1.6 * ph) * s, [1, 0.95, 0.8], 1.6 * k0 * (1 - ph));
        }
        glowAt(S, neck.x, neck.y, neck.z, 18 * s, [1, 0.95, 0.85], 2.2 * Math.exp(-d * 4));
      }
      glowAt(S, p.x, p.y + 12 * s, p.z, 30 * s, [1, 0.85, 0.5], 0.18); poolAt(S, p.x, p.y + 0.2, p.z, 34 * s, [1, 0.85, 0.5], 0.5);
    },
    // a banner over the road with his line on it, waving a little
    hptBanner(S, it, p, q, yaw) {
      void S.layers.hptBanner; void S.layers.hptBannerFace;
      const T = S.tNow ?? 0, h = S.course.sample(it.t).y + (it.lift ?? 10.5);
      const e = HE(S); e.set(0.05 * Math.sin(T * 1.6), S.course.sample(it.t).yaw + Math.PI, 0.02 * Math.sin(T * 1.1)); const bq = HQ(S).setFromEuler(e);
      const w = S._hb || (S._hb = new THREE.Vector3()); w.set(p.x, h, p.z);
      const m = S._m, s = it.s ?? 1; m.compose(w, bq, S._s.set(s, s, s)); S.layers.hptBanner.add(m); S.layers.hptBannerFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      if (S.tNow === undefined) return;
      const chase = Math.floor(S.course.beatAt(T) * 4), yw = S.course.sample(it.t).yaw + Math.PI;
      for (let k = 0; k < 24; k++) { const x = -14.4 + k * 1.25; for (const y of [4.6, -4.6]) { local(w, yw, x * s, y * s, 0.4 * s, S._o); const on = (k + chase + (y > 0 ? 0 : 2)) % 4 === 0; glowAt(S, S._o.x, S._o.y, S._o.z, 1.0 * s, [1, 0.85, 0.5], on ? 2 : 0.5); } }
      glowAt(S, w.x, w.y, w.z, 30 * s, [1, 0.4, 0.5], 0.22);
    },
  },
  kits: {
    // his mother's street: little houses with their porch lights, fences, trees; room left
    // round the set-pieces
    hptSuburb(S, z, R) {
      const PAST = [0xf6c1d9, 0xbfe6dc, 0xd7c6f2, 0xf6e3b4, 0xc6dcf5, 0xf3cdb8, 0xe8e2ec];
      for (let t = z.from; t < z.to; t += 0.13) {
        for (const side of [-1, 1]) {
          if (cleared(z, t, side, S) || lowered(z, t, side, S)) continue;
          const rot = SIDE(side), r1 = R();
          if (r1 < 0.62) {
            const x = side * (21 + R() * 4);
            S.items.push({ t: t + R() * 0.05, x, rot, s: 0.85 + R() * 0.25, parts: 'house', tint: col(pick(R, PAST)), roofTint: col(pick(R, [0x2a2030, 0x30243a, 0x22202c])), seed: R(), wake0: 0.35, porch: true });
            S.items.push({ t, x: x - side * 5.4, rot: 0, s: 1.25, parts: 'fence', tint: col(0xf2eef0) });
          } else if (r1 < 0.85) S.items.push({ t, x: side * (17 + R() * 5), s: 0.7 + R() * 0.4, parts: 'tree', tint: col(pick(R, [0x1c3a32, 0x223a2a, 0x2a2440])), seed: R() });
          if (R() < 0.5) S.items.push({ t: t + R() * 0.1, x: side * (40 + R() * 14), rot, s: 0.85 + R() * 0.3, parts: 'house', tint: col(pick(R, PAST)), roofTint: col(0x2a2030), seed: R(), wake0: 0.3 });
        }
        if (Math.round(t / 0.13) % 3 === 0) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.lampX ?? 16), rot: SIDE(side), parts: 'lamp', seed: R() });
      }
    },
    // a row of speaker stacks either side (z.x out, z.every along)
    hptStacks(S, z, R) {
      let k = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) {
        if (cleared(z, t, side, S)) continue;
        S.items.push({ t: t + R() * 0.05, x: side * (z.x ?? 21.5), rot: SIDE(side) + (R() - 0.5) * 0.2, s: (z.s ?? 1) * (0.9 + R() * 0.2), parts: 'hptStack', k: 0.8 + 0.4 * ((k++ % 3) / 2), ahead: z.ahead ?? 16 });
      }
    },
  },
});

// the page's own fog
function fogPage(m) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uHptFog = HFOG.uHptFog; sh.uniforms.uHptFogD = HFOG.uHptFogD;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHptFog; uniform float uHptFogD;')
      .replace('#include <fog_fragment>', `float hptD = length(vViewPosition); float hptF = 1.0 - exp(-pow(hptD * uHptFogD, 1.5)); gl_FragColor.rgb = mix(gl_FragColor.rgb, uHptFog, clamp(hptF, 0.0, 1.0));`);
  };
  m.customProgramCacheKey = () => 'hptPage';
  return m;
}
void PARTS; void faceQ; void heartShape; void sph;
