// Back by Popular Demand. The venue he played for a decade and a day. In June they changed the
// locks: the alley behind it at night, string lights over the bins' side of town, the stage door with
// its new deadbolt and the memo taped to it; the room next door, where the party comes through the
// drywall, every toast, the frames shaking; the calendar, nineteen days, the guest list, his name.
// Out the window into the street under the marquee: the banner, the punch, the balloons. In through
// the front doors that swing like they're sorry: the hallway that smells like home, the piano playing
// his songs on its own, tonight on the calendar, the spotlight on the mic; the dressing room, his
// letters, the seat saved; the party; the bar with the tab still open, the jukebox, the banner in the
// doorway, glitter; the quiet; the stands full of lights. And out the back to the stage door again,
// where somebody made a key.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room, paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 14, hh = 10) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
function tube(a, b, r, n = 8) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1); g.translate(0, L / 2, 0);
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
const VC = (M, key, opts) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }));
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const FONT = '"Arial Black", Impact, sans-serif';
const HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';

// ---------- the paper and the pictures ----------
// the memo taped to the stage door: a notice nobody wanted to write
function memoTexture() {
  return canvasTex(384, 512, (g, W, H) => {
    g.fillStyle = '#f2efe6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1a1a20'; g.fillRect(40, 44, W - 80, 10);
    const R = seeded(12);
    for (let y = 92; y < H - 60; y += 26) { if (R() < 0.15) { y += 14; continue; } g.fillStyle = '#3a3a44'; g.fillRect(40, y, 60 + R() * (W - 140), 7); }
    g.fillStyle = '#3a3a44'; g.fillRect(W - 170, H - 70, 120, 7);
    g.fillStyle = 'rgba(220, 220, 200, 0.75)'; g.save(); g.translate(W / 2, 12); g.rotate(-0.06); g.fillRect(-60, -14, 120, 30); g.restore();
  });
}
// June on the wall: nineteen days crossed out, then (on the other face) tonight circled
function calendarTexture() {
  return canvasTex(1024, 512, (g, W, H) => {
    for (const [ox, circle] of [[0, false], [512, true]]) {
      g.fillStyle = '#f6f2ea'; g.fillRect(ox, 0, 512, H);
      g.fillStyle = '#c8202a'; g.fillRect(ox, 0, 512, 92);
      g.fillStyle = '#ffffff'; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JUNE', ox + 256, 48);
      g.strokeStyle = '#c8c0b4'; g.lineWidth = 2;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
        const x = ox + 16 + c * 68.5, y = 104 + r * 80, day = r * 7 + c - 1;
        g.strokeRect(x, y, 68.5, 80);
        if (day < 1 || day > 30) continue;
        g.fillStyle = '#3a3a44'; g.font = `700 22px ${FONT}`; g.textAlign = 'left'; g.fillText(String(day), x + 6, y + 18);
        if (!circle && day >= 6 && day < 25) { g.strokeStyle = '#d0202a'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + 10, y + 12); g.lineTo(x + 60, y + 72); g.moveTo(x + 60, y + 12); g.lineTo(x + 10, y + 72); g.stroke(); g.strokeStyle = '#c8c0b4'; g.lineWidth = 2; }
        if (circle && day === 25) { g.strokeStyle = '#d0202a'; g.lineWidth = 9; g.beginPath(); g.ellipse(x + 34, y + 40, 44, 40, -0.2, 0, Math.PI * 1.9); g.stroke(); g.fillStyle = '#d0202a'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.fillText('TONIGHT', x + 34, y - 26); g.textAlign = 'left'; g.strokeStyle = '#c8c0b4'; g.lineWidth = 2; }
      }
    }
  });
}
// counted twice: nineteen marks in chalk
function tallyTexture() {
  return canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#2a2e2a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(240,240,232,0.92)'; g.lineWidth = 9; g.lineCap = 'round';
    const R = seeded(19);
    let x = 34;
    for (let k = 0; k < 19; k++) {
      const grp = k % 5;
      if (grp === 4) { g.beginPath(); g.moveTo(x - 4 * 26 - 10, 170 + R() * 6); g.lineTo(x + 8, 78 + R() * 6); g.stroke(); x += 40; continue; }
      g.beginPath(); g.moveTo(x + R() * 4, 70 + R() * 8); g.lineTo(x + R() * 6 - 3, 190 + R() * 8); g.stroke(); x += 26;
    }
  });
}
// the guest list on its clipboard, one name struck out
function listTexture() {
  return canvasTex(384, 512, (g, W, H) => {
    g.fillStyle = '#f4f0e8'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#9ab0d0'; g.lineWidth = 2; for (let y = 90; y < H; y += 34) { g.beginPath(); g.moveTo(24, y); g.lineTo(W - 24, y); g.stroke(); }
    g.fillStyle = '#16181e'; g.font = `900 34px ${FONT}`; g.textAlign = 'center'; g.fillText('GUEST LIST', W / 2, 56);
    const R = seeded(8); g.strokeStyle = '#2a2a50'; g.lineWidth = 4; g.lineCap = 'round';
    for (let k = 0; k < 12; k++) { const y = 82 + k * 34; let x = 36; g.beginPath(); g.moveTo(x, y); while (x < 120 + R() * 160) { const w = 8 + R() * 10; g.quadraticCurveTo(x + w / 2, y - 12 - R() * 6, x + w, y); x += w; } g.stroke(); }
    g.strokeStyle = '#d0202a'; g.lineWidth = 8; g.beginPath(); g.moveTo(26, 82 + 5 * 34 - 6); g.lineTo(W - 40, 82 + 5 * 34 - 10); g.stroke();
  });
}
// hello, my name is
function tagTexture() {
  return canvasTex(512, 384, (g, W, H) => {
    g.fillStyle = '#d0202a'; g.beginPath(); g.roundRect(0, 0, W, H, 40); g.fill();
    g.fillStyle = '#ffffff'; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HELLO', W / 2, 62);
    g.font = `700 32px ${FONT}`; g.fillText('MY NAME IS', W / 2, 120);
    g.fillStyle = '#ffffff'; g.fillRect(20, 150, W - 40, H - 180);
    g.strokeStyle = '#16181e'; g.lineWidth = 10; g.lineCap = 'round'; g.lineJoin = 'round';
    const R = seeded(3); g.beginPath(); let x = 70; g.moveTo(x, 270); while (x < W - 80) { const w = 18 + R() * 22; g.bezierCurveTo(x + w * 0.3, 200 + R() * 40, x + w * 0.6, 320 - R() * 20, x + w, 250 + R() * 30); x += w; } g.stroke();
  });
}
// the marquee's letters: BACK BY POPULAR DEMAND, black on lit white
function marqueeTexture() {
  return canvasTex(1024, 384, (g, W, H) => {
    g.fillStyle = '#f8f2e0'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#16141a'; g.font = `900 96px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('BACK BY', W / 2, 108); g.fillText('POPULAR DEMAND', W / 2, 264);
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 3; for (const y of [190, 350]) { g.beginPath(); g.moveTo(10, y); g.lineTo(W - 10, y); g.stroke(); }
  });
}
// sheet music, a page of it
function musicTexture() {
  return canvasTex(256, 352, (g, W, H) => {
    g.fillStyle = '#f6f2e6'; g.fillRect(0, 0, W, H);
    const R = seeded(21);
    for (let s = 0; s < 6; s++) {
      const y0 = 30 + s * 54;
      g.strokeStyle = '#3a3a44'; g.lineWidth = 1.5; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(14, y0 + k * 7); g.lineTo(W - 14, y0 + k * 7); g.stroke(); }
      for (let x = 30; x < W - 20; x += 16 + R() * 10) { const y = y0 + Math.floor(R() * 9) * 3.5; g.fillStyle = '#1a1a20'; g.beginPath(); g.ellipse(x, y, 5, 3.6, -0.4, 0, 7); g.fill(); g.fillRect(x + 3.5, y - 24, 1.8, 24); }
    }
  });
}
// a letter in its envelope (front), and the letter itself, just one sentence
function envelopeTexture() {
  return canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#efe6d0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#c8b896'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(W / 2, H * 0.62); g.lineTo(W, 0); g.stroke();
    g.fillStyle = '#d0202a'; g.beginPath(); g.arc(W / 2, H * 0.6, 22, 0, 7); g.fill();
    g.strokeStyle = '#2a2a50'; g.lineWidth = 4; g.lineCap = 'round'; const R = seeded(5); for (const y of [170, 200]) { g.beginPath(); let x = 150; g.moveTo(x, y); while (x < 360) { const w = 10 + R() * 12; g.quadraticCurveTo(x + w / 2, y - 10, x + w, y); x += w; } g.stroke(); }
  });
}
function letterTexture() {
  return canvasTex(384, 512, (g, W, H) => {
    g.fillStyle = '#f6f0e2'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#c8d4e8'; g.lineWidth = 2; for (let y = 80; y < H; y += 36) { g.beginPath(); g.moveTo(26, y); g.lineTo(W - 26, y); g.stroke(); }
    g.fillStyle = '#1e2050'; g.font = `700 40px ${HAND}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText('Save my seat,', 36, 148); g.fillText("it's not the end.", 36, 220);
  });
}
// the card on the saved seat
function seatTexture() {
  return canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#f6f0e0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#b08a3a'; g.lineWidth = 10; g.strokeRect(12, 12, W - 24, H - 24);
    g.fillStyle = '#7a1018'; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SAVE', W / 2, 92); g.fillText('MY SEAT', W / 2, 168);
  });
}
// the tab, still open: a long receipt
function tabTexture() {
  return canvasTex(128, 1024, (g, W, H) => {
    g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a2a30'; const R = seeded(9);
    for (let y = 30; y < H - 10; y += 20) { if (R() < 0.12) { g.fillRect(10, y, W - 20, 2); continue; } g.fillRect(12, y, 30 + R() * 40, 6); g.fillRect(W - 40, y, 26, 6); }
  });
}
// gig posters, ten years of them: shapes and colours, a band name you can't read from here
function posterTexture() {
  return canvasTex(1024, 512, (g, W, H) => {
    const R = seeded(44), cols = ['#e83a3a', '#f0c040', '#3a8ae8', '#1a1a20', '#f4f0e6', '#e86ac0', '#3ac08a', '#ff8a3a'];
    for (let k = 0; k < 8; k++) {
      const x = (k % 4) * 256, y = Math.floor(k / 4) * 256;
      const bg = cols[Math.floor(R() * cols.length)]; g.fillStyle = bg; g.fillRect(x + 4, y + 4, 248, 248);
      const fg = cols[(cols.indexOf(bg) + 1 + Math.floor(R() * 6)) % cols.length]; g.fillStyle = fg;
      const kind = k % 4;
      if (kind === 0) { g.beginPath(); g.arc(x + 128, y + 110, 70, 0, 7); g.fill(); }
      else if (kind === 1) { for (let s = 0; s < 6; s++) g.fillRect(x + 20, y + 30 + s * 30, 210, 14); }
      else if (kind === 2) { g.beginPath(); g.moveTo(x + 128, y + 30); g.lineTo(x + 220, y + 190); g.lineTo(x + 36, y + 190); g.fill(); }
      else { g.save(); g.translate(x + 128, y + 110); g.rotate(0.6); g.fillRect(-60, -60, 120, 120); g.restore(); }
      g.fillStyle = fg; g.fillRect(x + 24, y + 206, 140 + R() * 60, 16); g.fillRect(x + 24, y + 228, 80, 8);
    }
  });
}
// the jukebox's front: the bubble tubes' colours, the record behind the glass
function jukeTexture() {
  return canvasTex(256, 384, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, 0); ['#ff3a3a', '#ffb03a', '#f8f040', '#3ae86a', '#3ab0ff', '#b04aff'].forEach((c, i) => gr.addColorStop(i / 5, c));
    g.fillStyle = '#1a0e0a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = gr; g.lineWidth = 22; g.beginPath(); g.arc(W / 2, 150, 104, Math.PI, 0); g.stroke();
    g.fillStyle = gr; g.fillRect(14, 150, 22, 220); g.fillRect(W - 36, 150, 22, 220);
    g.fillStyle = '#2a2018'; g.fillRect(52, 120, W - 104, 120);
    g.fillStyle = '#0a0a0c'; g.beginPath(); g.arc(W / 2, 182, 46, 0, 7); g.fill(); g.fillStyle = '#d0202a'; g.beginPath(); g.arc(W / 2, 182, 14, 0, 7); g.fill();
    g.fillStyle = '#e8d8b0'; for (let k = 0; k < 8; k++) g.fillRect(60 + (k % 4) * 36, 262 + Math.floor(k / 4) * 30, 30, 22);
    g.fillStyle = '#c8a050'; g.fillRect(52, 330, W - 104, 30);
  });
}
// the banner over the doorway: stars and glitter, a bit homemade
function bannerTexture() {
  return canvasTex(1024, 256, (g, W, H) => {
    g.fillStyle = '#7a1a8a'; g.fillRect(0, 0, W, H);
    const R = seeded(77);
    for (let k = 0; k < 900; k++) { g.fillStyle = ['#ffd84a', '#ffffff', '#ff8ad8', '#8ae8ff'][k % 4]; g.globalAlpha = 0.5 + R() * 0.5; g.fillRect(R() * W, R() * H, 3, 3); }
    g.globalAlpha = 1;
    const star = (cx, cy, r, c) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.fill(); };
    for (let k = 0; k < 7; k++) star(80 + k * 144, 128 + (k % 2 ? 20 : -20), 54, ['#ffd84a', '#ffffff', '#ff8ad8'][k % 3]);
  });
}
function picTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    // the sea at sunset
    let gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#f0a060'); gr.addColorStop(0.55, '#ffd8a0'); gr.addColorStop(0.56, '#2a4a7a'); gr.addColorStop(1, '#1a2a4a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#fff0c0'; g.beginPath(); g.arc(128, 140, 30, Math.PI, 0); g.fill();
    // hills
    gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#8ab8e8'); gr.addColorStop(1, '#d8e8f0'); g.fillStyle = gr; g.fillRect(256, 0, 256, 256);
    g.fillStyle = '#4a7a4a'; g.beginPath(); g.moveTo(256, 256); g.lineTo(256, 160); g.quadraticCurveTo(330, 90, 400, 150); g.quadraticCurveTo(450, 110, 512, 140); g.lineTo(512, 256); g.fill();
    g.fillStyle = '#2a5a3a'; g.beginPath(); g.moveTo(256, 256); g.lineTo(256, 200); g.quadraticCurveTo(360, 160, 512, 210); g.lineTo(512, 256); g.fill();
    // a gold record
    g.fillStyle = '#16141a'; g.fillRect(0, 256, 256, 256);
    gr = g.createRadialGradient(128, 384, 10, 128, 384, 100); gr.addColorStop(0, '#fff0b0'); gr.addColorStop(0.3, '#d8a840'); gr.addColorStop(0.7, '#f0c860'); gr.addColorStop(1, '#a87820'); g.fillStyle = gr; g.beginPath(); g.arc(128, 384, 100, 0, 7); g.fill();
    g.strokeStyle = 'rgba(80,50,10,0.35)'; for (let r = 40; r < 100; r += 6) { g.beginPath(); g.arc(128, 384, r, 0, 7); g.stroke(); }
    g.fillStyle = '#c8202a'; g.beginPath(); g.arc(128, 384, 30, 0, 7); g.fill(); g.fillStyle = '#16141a'; g.beginPath(); g.arc(128, 384, 5, 0, 7); g.fill();
    // a setlist, taped down
    g.fillStyle = '#f2ece0'; g.fillRect(256, 256, 256, 256);
    g.strokeStyle = '#1a1a2a'; g.lineWidth = 6; g.lineCap = 'round'; const R = seeded(31);
    for (let k = 0; k < 9; k++) { const y = 290 + k * 24; g.beginPath(); let x = 290; g.moveTo(x, y); while (x < 330 + R() * 130) { const w = 8 + R() * 10; g.quadraticCurveTo(x + w / 2, y - 8, x + w, y); x += w; } g.stroke(); }
  });
}
function brickTexture() {
  const t = canvasTex(256, 256, (g, W, H) => { g.fillStyle = '#3a3634'; g.fillRect(0, 0, W, H); const R = seeded(2); for (let r = 0; r < 16; r++) for (let c = -1; c < 9; c++) { const x = c * 32 + (r % 2) * 16, y = r * 16; g.fillStyle = `rgb(${90 + R() * 40 | 0},${38 + R() * 20 | 0},${28 + R() * 14 | 0})`; g.fillRect(x + 1.5, y + 1.5, 29, 13); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
let TEX = null;
const tex = () => TEX || (TEX = { brick: brickTexture(), pics: picTexture(), memo: memoTexture(), cal: calendarTexture(), tally: tallyTexture(), list: listTexture(), tag: tagTexture(), marquee: marqueeTexture(), music: musicTexture(), env: envelopeTexture(), letter: letterTexture(), seat: seatTexture(), tab: tabTexture(), poster: posterTexture(), juke: jukeTexture(), banner: bannerTexture() });
// a picture lit like paper under a light (and a little by itself so it reads in the dark)
const paper = (M, key, map, k = 0.45, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.85, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, ...opts }));
// a cell of a picture grid per instance
function cellPaper(map, cols, rows, k = 0.5) {
  return new THREE.ShaderMaterial({
    uniforms: { tMap: { value: map }, uK: { value: k } },
    vertexShader: `attribute float aCell; varying vec2 vUv; varying float vCell; void main(){ vUv = uv; vCell = aCell; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tMap; uniform float uK; varying vec2 vUv; varying float vCell; void main(){ float cell = floor(vCell + 0.5); float c = mod(cell, ${cols.toFixed(1)}), r = floor((cell + 0.5) / ${cols.toFixed(1)}); vec3 t = texture2D(tMap, vec2((c + vUv.x) / ${cols.toFixed(1)}, 1.0 - (r + 1.0 - vUv.y) / ${rows.toFixed(1)})).rgb; gl_FragColor = vec4(t * uK, 1.0); }`,
    side: THREE.DoubleSide,
  });
}
// additive light: a spotlight's cone, a beam of the stage lights
function coneMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(0xfff0d0) } },
    vertexShader: `attribute float aK; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = aK; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; varying float vK; void main(){ float y = clamp(vUv.y, 0.0, 1.0); float a = 0.25 + 0.75 * y * y; gl_FragColor = vec4(uCol * a * 0.12 * vK, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}

// ---------- the venue's things, at its scale ----------
const BG = {
  // the stage door: a steel door in a frame, the new deadbolt shining on it; the memo taped up
  door() { const parts = [], red = rgb(0x8a2a24); parts.push(paint(box(18, 30, 1.6, 0, 15, -0.4), red)); for (const [w, h, x, y] of [[20, 1.4, 0, 30.7], [1.4, 31.4, -9.7, 15.7], [1.4, 31.4, 9.7, 15.7]]) parts.push(paint(box(w, h, 2.4, x, y, -0.2), rgb(0x2a2a30))); parts.push(paint(box(0.9, 7, 1.8, -6.6, 14, 0.6), rgb(0x8a8e98))); parts.push(paint(box(18, 1.2, 1.7, 0, 3, -0.3), rgb(0x5a1a18))); return merge(parts); },
  bolt() { const parts = [], brass = rgb(0xe8c050); parts.push(paint(box(4.6, 6.4, 0.8, -5.6, 18, 0.8), brass)); parts.push(paint(cyl(1.6, 1.6, 1.4, 24, 0, 0, 0).rotateX(Math.PI / 2).translate(-5.6, 18.6, 1.5), brass)); parts.push(paint(box(0.5, 2.4, 0.5, -5.6, 18.6, 2.4), rgb(0x8a6a20))); return merge(parts); },
  memo() { const g = new THREE.PlaneGeometry(9, 12); g.rotateZ(0.04); g.translate(2.4, 17, 0.62); return g; },
  // a string of bulbs: just the wire segment; the bulbs are glows
  wire() { return paint(box(1, 0.12, 0.12, 0.5, 0, 0), rgb(0x1a1a1e)); },
  bulb() { return sph(0.7, 1, 1.3, 1, 0, -0.9, 0, 10, 8); },
  // posters pasted on a wall: one panel, its picture a cell of the poster sheet
  poster() { const g = new THREE.PlaneGeometry(10, 10); g.translate(0, 0, 0); return g; },
  // the calendar on the wall; the chalk board with the tally
  calBoard() { return paint(box(25, 25, 1, 0, 0, -0.9), rgb(0x2a2a30)); },
  calFace() { const g = new THREE.PlaneGeometry(24, 24); return g; },
  tallyBoard() { return merge([paint(box(30, 15, 1, 0, 0, -0.9), rgb(0x5a3a22)), paint(box(29, 14, 1.1, 0, 0, -0.85), rgb(0x2a2e2a))]); },
  tallyFace() { return new THREE.PlaneGeometry(28, 13.4); },
  // the clipboard; the name tag
  clipboard() { const parts = []; parts.push(paint(box(17, 23, 0.8, 0, 0, -0.9), rgb(0x8a6a44))); parts.push(paint(box(7, 2.6, 1.6, 0, 11, -0.4), rgb(0xa8acb8))); parts.push(paint(box(0.2, 40, 0.2, -6, 31, -0.9), rgb(0x6a6e78))); parts.push(paint(box(0.2, 40, 0.2, 6, 31, -0.9), rgb(0x6a6e78))); return merge(parts); },
  clipFace() { const g = new THREE.PlaneGeometry(15, 20); g.translate(0, -1, 0); return g; },
  tagBack() { return merge([paint(box(25, 19, 0.6, 0, 0, -0.8), rgb(0xb01820)), paint(box(0.2, 40, 0.2, -8, 29, -0.8), rgb(0x6a6e78)), paint(box(0.2, 40, 0.2, 8, 29, -0.8), rgb(0x6a6e78))]); },
  tagFace() { return new THREE.PlaneGeometry(24, 18); },
  // the theatre's marquee over the street: the box, the letters both sides, bulbs round it
  marquee() {
    const parts = [], gold = rgb(0xd8a840), dark = rgb(0x2a1a22);
    parts.push(paint(box(56, 22, 10, 0, 0, 0), dark));
    for (const z of [-5.4, 5.4]) for (const [w, h, x, y] of [[57, 1.6, 0, 11.6], [57, 1.6, 0, -11.6], [1.6, 24.8, -28.2, 0], [1.6, 24.8, 28.2, 0]]) parts.push(paint(box(w, h, 1.2, x, y, z), gold));
    parts.push(paint(box(60, 3, 13, 0, 13.4, 0), rgb(0xc8202a))); parts.push(paint(box(62, 1.2, 14, 0, 15.4, 0), gold));
    for (const s of [-1, 1]) parts.push(paint(box(0.4, 40, 0.4, s * 24, 34, 0), rgb(0x3a3a44)));
    return merge(parts);
  },
  marqueeFace() { const parts = []; for (const z of [-5.8, 5.8]) { const g = new THREE.PlaneGeometry(52, 18.5); if (z < 0) g.rotateY(Math.PI); g.translate(0, 0, z); parts.push(g); } return merge(parts); },
  // bunting: one flag
  flag() { const s = new THREE.Shape(); s.moveTo(-1.6, 0); s.lineTo(1.6, 0); s.lineTo(0, -3.4); s.lineTo(-1.6, 0); return new THREE.ShapeGeometry(s); },
  // a balloon on its string
  balloon() { const g = new THREE.SphereGeometry(2.4, 18, 14); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y * 1.2 + (y < 0 ? y * y * -0.05 : 0)); } g.computeVertexNormals(); g.translate(0, 0, 0); return merge([g, cyl(0.25, 0.5, 0.5, 8, 0, -3.1, 0)].map((x) => paint(x, [1, 1, 1]))); },
  string() { return paint(box(0.06, 1, 0.06, 0, -0.5, 0), rgb(0xe8e8e8)); },
  // the punch: the glass bowl on its foot, red punch, the ladle, cups; the bottle going in
  bowl() {
    const pts = [[0, 0], [5, 0.2], [5.2, 1], [2, 2.4], [1.6, 5], [9, 7], [13, 11], [14.4, 16], [14.6, 17]].map(([r, y]) => new THREE.Vector2(r, y));
    return paint(new THREE.LatheGeometry(pts, 40), rgb(0xc8e0e8));
  },
  punch() { const parts = []; parts.push(paint(cyl(13.4, 13.4, 0.4, 40, 0, 14.6, 0), rgb(0xe82a4a))); for (let k = 0; k < 7; k++) { const a = k * 0.9; parts.push(paint(cyl(2.2, 2.2, 0.5, 16, Math.cos(a) * 7, 14.9, Math.sin(a) * 7), rgb(k % 2 ? 0xffd040 : 0xff8a3a))); } return merge(parts); },
  ladle() { const parts = [], s = rgb(0xd8dce4); parts.push(paint(tube(V(4, 14, 2), V(13, 26, 6), 0.45, 8), s)); parts.push(paint(new THREE.SphereGeometry(2.4, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(4, 14.5, 2), s)); return merge(parts); },
  cups() { const parts = []; for (const [x, z] of [[-18, 4], [-21, -2], [18, 3], [21, -3], [19, 8]]) parts.push(paint(cyl(1.6, 1.3, 3.6, 14, x, 1.8, z), rgb(0xd8ecf0))); return merge(parts); },
  pour() { const parts = []; const b = merge([paint(cyl(2, 2, 9, 16, 0, 0, 0), rgb(0x2a5a2a)), paint(cyl(0.8, 2, 2.6, 16, 0, 5.8, 0), rgb(0x2a5a2a)), paint(cyl(0.8, 0.8, 2.4, 12, 0, 8.3, 0), rgb(0x2a5a2a)), paint(cyl(2.02, 2.02, 3.4, 16, 0, -0.6, 0), rgb(0xe8d8b0))]); b.rotateZ(2.1); b.translate(-12, 26, 0); parts.push(b); return merge(parts); },
  // a champagne flute: the bowl, the stem, the foot; the wine in it
  flute() {
    const pts = [[0, 0], [3, 0.1], [3, 0.5], [0.4, 0.9], [0.35, 9], [1.6, 11], [2.1, 15], [2.2, 21], [2.25, 21.2]].map(([r, y]) => new THREE.Vector2(r, y));
    return paint(new THREE.LatheGeometry(pts, 24), rgb(0xd8ecf4));
  },
  wine() { const pts = [[0, 11.4], [1.5, 11.6], [1.95, 15], [2.05, 19], [0, 19]].map(([r, y]) => new THREE.Vector2(r, y)); return paint(new THREE.LatheGeometry(pts, 20), rgb(0xffd860)); },
  // a picture frame on the wall (an empty landscape in it, nobody)
  frame() { const parts = [], gold = rgb(0xb8903a); for (const [w, h, x, y] of [[14, 1.4, 0, 5.3], [14, 1.4, 0, -5.3], [1.4, 12, -6.3, 0], [1.4, 12, 6.3, 0]]) parts.push(paint(box(w, h, 1, x, y, 0), gold)); return merge(parts); },
  framePic() { const g = new THREE.PlaneGeometry(11.6, 9.6); g.translate(0, 0, 0.05); return g; },
  // the grand piano: body, lid propped open, legs, the keys (a layer of their own, they move)
  piano() {
    const parts = [], black = rgb(0x0e0e12);
    const s = new THREE.Shape(); s.moveTo(-8, 0); s.lineTo(8, 0); s.lineTo(8, 10); s.bezierCurveTo(8, 18, 3, 24, -2, 26); s.bezierCurveTo(-6, 27, -8, 24, -8, 18); s.lineTo(-8, 0);
    const body = new THREE.ExtrudeGeometry(s, { depth: 4, bevelEnabled: false, curveSegments: 16 }); body.rotateX(-Math.PI / 2); body.translate(0, 9, 0); parts.push(paint(body, black));
    const lid = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 16 }); lid.rotateX(-Math.PI / 2); lid.translate(0, 0, 0); lid.rotateX(0); const L = lid; L.rotateZ(0.6); L.translate(-8 + 8 * Math.cos(0.6), 13 + 8 * Math.sin(0.6), 0); parts.push(paint(L, black));
    parts.push(paint(tube(V(7.6, 13, -14), V(1, 22, -12), 0.25, 6), rgb(0x2a2a30)));
    for (const [x, z] of [[-6.5, -2], [6.5, -2], [0, -22]]) parts.push(paint(cyl(0.9, 0.7, 9, 10, x, 4.5, z), black));
    parts.push(paint(box(16.4, 1.4, 4, 0, 10.6, 2), black)); parts.push(paint(box(16.4, 3, 1, 0, 12, -1), black));
    parts.push(paint(box(6, 4, 0.3, 0, 14.6, -0.6), rgb(0xf6f2e6)));
    parts.push(paint(box(8, 1.2, 3.4, 0, 6.2, 5), black)); for (const x of [-3.4, 3.4]) parts.push(paint(box(0.8, 6, 0.8, x, 3, 5), black));
    return merge(parts);
  },
  key() { return paint(box(0.42, 0.5, 3, 0, 0, 0), [1, 1, 1]); },
  // a page of sheet music
  page() { return new THREE.PlaneGeometry(3.2, 4.4); },
  // the mic on its stand
  mic() { const parts = [], chrome = rgb(0xc8ccd4), black = rgb(0x16161a); parts.push(paint(cyl(3, 3.4, 0.6, 24, 0, 0.3, 0), black)); parts.push(paint(cyl(0.3, 0.3, 17, 8, 0, 8.8, 0), chrome)); parts.push(paint(tube(V(0, 17, 0), V(0, 19, 2.4), 0.25, 6), chrome)); parts.push(paint(sph(1.2, 1, 1.4, 1, 0, 20.2, 2.8, 14, 10), rgb(0x8a8e98))); return merge(parts); },
  cone() { const g = new THREE.CylinderGeometry(0.6, 9, 1, 24, 1, true); g.translate(0, -0.5, 0); return g; },
  // an envelope; a letter
  env() { return new THREE.PlaneGeometry(6, 3); },
  letter() { return merge([paint(box(18, 24, 0.4, 0, 0, -0.6), rgb(0xe8e0d0)), paint(box(0.2, 40, 0.2, -6, 32, -0.6), rgb(0x6a6e78)), paint(box(0.2, 40, 0.2, 6, 32, -0.6), rgb(0x6a6e78))]); },
  letterFace() { return new THREE.PlaneGeometry(17.4, 23.4); },
  // the saved seat: a velvet theatre seat, its card
  seat() { const parts = [], red = rgb(0x8a1424), gold = rgb(0xb8903a); parts.push(paint(box(11, 3, 10, 0, 7, 1.5), red)); parts.push(paint(box(11, 13, 2.4, 0, 13, -3.8), red)); for (const s of [-1, 1]) { parts.push(paint(box(1.4, 9, 11, s * 6.2, 5.5, 0), rgb(0x3a1a12))); parts.push(paint(box(1.6, 0.8, 11, s * 6.2, 10.4, 0), gold)); } return merge(parts); },
  seatCard() { const g = new THREE.PlaneGeometry(7, 3.5); g.rotateX(-0.5); g.translate(0, 9.3, 3.4); return g; },
  // the mirrored ball
  disco() { const g = new THREE.IcosahedronGeometry(6, 3); return paint(g, rgb(0xd8dce8)); },
  // the bar's register and the tab coming out of it, curling over the road
  register() { const parts = []; parts.push(paint(box(30, 12, 9, 0, -6, 0), rgb(0x2a160c))); parts.push(paint(box(31, 1, 10, 0, 0.4, 0), rgb(0x5a3a1e))); parts.push(paint(box(9, 6, 7, 0, 3.9, 0), rgb(0x3a2a20))); const sc = box(8, 4, 0.8, 0, 0, 0); sc.rotateX(-0.5); sc.translate(0, 7.6, -1.6); parts.push(paint(sc, rgb(0x2a2a30))); parts.push(paint(box(7, 1, 4, 0, 6.3, 1.2), rgb(0x8a8e98))); return merge(parts); },
  tab() { const g = new THREE.PlaneGeometry(3.2, 1, 1, 60); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = 0.5 - p.getY(i), L = v * 60; let y, z; if (L < 14) { y = 7 + L; z = -1; } else { const a = (L - 14) / 9; y = 21 + Math.sin(Math.min(a, Math.PI)) * 9; z = -1 + (L - 14) * 0.9; if (a > Math.PI) { y = 21 - (a - Math.PI) * 8; } } p.setXYZ(i, p.getX(i), y, z); } g.computeVertexNormals(); return g; },
  // the jukebox
  juke() { const parts = [], wood = rgb(0x6a3a20); parts.push(paint(box(14, 16, 8, 0, 8, 0), wood)); const arch = new THREE.CylinderGeometry(7, 7, 8, 24, 1, false, -Math.PI / 2, Math.PI); arch.rotateX(Math.PI / 2); arch.rotateZ(Math.PI / 2); arch.translate(0, 16, 0); parts.push(paint(arch, wood)); return merge(parts); },
  jukeFace() { const s = new THREE.Shape(); s.moveTo(-6.6, 0.6); s.lineTo(6.6, 0.6); s.lineTo(6.6, 16); s.absarc(0, 16, 6.6, 0, Math.PI, false); s.lineTo(-6.6, 0.6); const g = new THREE.ShapeGeometry(s, 24); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + 6.6) / 13.2, p.getY(i) / 22.6); g.translate(0, 0, 4.05); return g; },
  // the banner: cloth with its picture
  bannerCloth() { return merge([paint(box(46, 11, 0.4, 0, 0, -0.6), rgb(0x5a1a6a)), paint(box(0.2, 40, 0.2, -21, 25, -0.6), rgb(0x6a6e78)), paint(box(0.2, 40, 0.2, 21, 25, -0.6), rgb(0x6a6e78))]); },
  bannerFace() { return new THREE.PlaneGeometry(45, 10.4); },
  // the stands: rows of steps going up and back
  stands() { const parts = [], R = seeded(3); for (let k = 0; k < 14; k++) { parts.push(paint(box(60, 2.2, 3.6, 0, 1.1 + k * 2.2, -k * 3.6), k % 2 ? rgb(0x2a2c3a) : rgb(0x34364a))); } parts.push(paint(box(60, 31, 1, 0, 15.5, -51), rgb(0x1a1a24))); return merge(parts); },
  // the key: a big new brass key
  bigKey() {
    const parts = [], brass = rgb(0xf0c850);
    const ring = new THREE.TorusGeometry(3.4, 1.1, 12, 32); parts.push(paint(ring, brass));
    parts.push(paint(box(1.6, 1.6, 15, 0, 0, -10.5), brass));
    for (const [z, h] of [[-15.5, 2.6], [-13.4, 1.6], [-11.6, 2.2]]) parts.push(paint(box(1.2, h, 1.4, 0, -h / 2 - 0.4, z), brass));
    parts.push(paint(cyl(1.5, 1.5, 1.4, 16, 0, 0, -3.6).rotateX(Math.PI / 2), brass));
    return merge(parts);
  },
};

// a plain glowing colour per instance
function tintBasic(opts = {}) { return new THREE.ShaderMaterial({ vertexShader: `attribute vec3 aTint; varying vec3 vC; void main(){ vC = aTint; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`, fragmentShader: `varying vec3 vC; void main(){ gl_FragColor = vec4(vC, 1.0); }`, side: THREE.DoubleSide, ...opts }); }
// lit, tinted per instance (balloons, flags)
function tintLit(rough = 0.4, metal = 0.1, k = 0.25) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, metalness: metal, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vTint * ' + k.toFixed(2) + ';');
  };
  return m;
}
const BULB = [1, 0.78, 0.45];
const PARTY = [0xff3a5a, 0xffd23a, 0x3ab0ff, 0xff8ad8, 0x3ae88a, 0xffffff, 0xff8a3a, 0xb04aff];

extend({
  layers: {
    bpDoor: (M) => [BG.door(), VCm(M, 'bpDoorM', 0.35, { roughness: 0.55, metalness: 0.3 }), 4, {}],
    bpBackWall: (M) => [(() => { const g = merge([box(44, 50, 6, 0, 25, -3.6), box(46, 2, 7, 0, 50.5, -3.4)]); const uv = g.attributes.uv, pos = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + pos.getZ(i)) / 9, pos.getY(i) / 9); return g; })(), M.bpBrickM || (M.bpBrickM = new THREE.MeshStandardMaterial({ map: tex().brick, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex().brick, emissiveIntensity: 0.12 })), 4, {}],
    bpBolt: (M) => [BG.bolt(), VCm(M, 'bpBoltM', 0.55, { roughness: 0.2, metalness: 0.8 }), 4, {}],
    bpMemo: (M) => [BG.memo(), paper(M, 'bpMemoM', tex().memo, 0.55), 4, {}],
    bpWire: (M) => [BG.wire(), M.bpWireM || (M.bpWireM = new THREE.MeshBasicMaterial({ color: 0x141418 })), 1400, {}],
    bpBulb: (M) => [BG.bulb(), M.bpBulbM || (M.bpBulbM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.5).multiplyScalar(2.2) })), 1400, {}],
    bpPoster: (M) => [BG.poster(), M.bpPosterM || (M.bpPosterM = cellPaper(tex().poster, 4, 2, 0.62)), 700, { aCell: 1 }],
    bpCalBoard: (M) => [BG.calBoard(), VC(M, 'bpBoardM', { roughness: 0.6, emissive: 0x0a0a0c }), 4, {}],
    bpCalFace: (M) => [BG.calFace(), M.bpCalM || (M.bpCalM = cellPaper(tex().cal, 2, 1, 1.0)), 4, { aCell: 1 }],
    bpTallyBoard: (M) => [BG.tallyBoard(), VC(M, 'bpBoardM', { roughness: 0.6, emissive: 0x0a0a0c }), 2, {}],
    bpTallyFace: (M) => [BG.tallyFace(), paper(M, 'bpTallyM', tex().tally, 0.7), 2, {}],
    bpClip: (M) => [BG.clipboard(), VC(M, 'bpClipM', { roughness: 0.6, emissive: 0x140e08 }), 2, {}],
    bpClipFace: (M) => [BG.clipFace(), paper(M, 'bpListM', tex().list, 0.75), 2, {}],
    bpTagBack: (M) => [BG.tagBack(), VC(M, 'bpTagBackM', { roughness: 0.6, emissive: 0x200404 }), 2, {}],
    bpTagFace: (M) => [BG.tagFace(), paper(M, 'bpTagM', tex().tag, 0.8), 2, {}],
    bpMarquee: (M) => [BG.marquee(), VCm(M, 'bpMarqueeM', 0.2, { roughness: 0.4, metalness: 0.4 }), 2, {}],
    bpMarqueeFace: (M) => [BG.marqueeFace(), M.bpMarqueeFaceM || (M.bpMarqueeFaceM = new THREE.MeshBasicMaterial({ map: tex().marquee, color: new THREE.Color(1.15, 1.1, 1.0), side: THREE.DoubleSide })), 2, {}],
    bpFlag: (M) => [BG.flag(), M.bpFlagM || (M.bpFlagM = tintLit(0.8, 0, 0.35)), 1200, { aTint: 3 }],
    bpBalloon: (M) => [BG.balloon(), M.bpBalloonM || (M.bpBalloonM = tintLit(0.18, 0.15, 0.3)), 400, { aTint: 3 }],
    bpString: (M) => [BG.string(), M.bpStringM || (M.bpStringM = new THREE.MeshBasicMaterial({ color: 0xd8d8d8 })), 400, {}],
    bpBowl: (M) => [BG.bowl(), VCm(M, 'bpBowlM', 0.25, { roughness: 0.08, metalness: 0.5 }), 3, {}],
    bpPunch: (M) => [BG.punch(), VCm(M, 'bpPunchM', 0.7, { roughness: 0.2 }), 3, {}],
    bpLadle: (M) => [BG.ladle(), VC(M, 'bpLadleM', { roughness: 0.2, metalness: 0.9, emissive: 0x202228 }), 3, {}],
    bpCups: (M) => [BG.cups(), VCm(M, 'bpCupsM', 0.3, { roughness: 0.1, metalness: 0.3 }), 3, {}],
    bpPour: (M) => [BG.pour(), VCm(M, 'bpPourM', 0.25, { roughness: 0.15, metalness: 0.3 }), 3, {}],
    bpFlute: (M) => [BG.flute(), VCm(M, 'bpFluteM', 0.35, { roughness: 0.05, metalness: 0.6 }), 4, {}],
    bpWine: (M) => [BG.wine(), VCm(M, 'bpWineM', 0.9, { roughness: 0.2 }), 4, {}],
    bpFrame: (M) => [BG.frame(), VCm(M, 'bpFrameM', 0.25, { roughness: 0.4, metalness: 0.5 }), 60, {}],
    bpFramePic: (M) => [BG.framePic(), M.bpFramePicM || (M.bpFramePicM = cellPaper(tex().pics, 2, 2, 0.95)), 60, { aCell: 1 }],
    bpPiano: (M) => [BG.piano(), VC(M, 'bpPianoM', { roughness: 0.12, metalness: 0.3, emissive: 0x0a0a10 }), 2, {}],
    bpKey: (M) => [BG.key(), M.bpKeyM || (M.bpKeyM = tintLit(0.3, 0, 0.25)), 80, { aTint: 3 }],
    bpPage: (M) => [BG.page(), paper(M, 'bpPageM', tex().music, 0.7), 40, {}],
    bpMic: (M) => [BG.mic(), VC(M, 'bpMicM', { roughness: 0.2, metalness: 0.8, emissive: 0x1a1a1e }), 2, {}],
    bpCone: (M) => [BG.cone(), M.bpConeM || (M.bpConeM = coneMaterial()), 12, { aK: 1 }],
    bpEnv: (M) => [BG.env(), paper(M, 'bpEnvM', tex().env, 0.75), 60, {}],
    bpLetter: (M) => [BG.letter(), VC(M, 'bpLetterM', { roughness: 0.8, emissive: 0x1a1814 }), 2, {}],
    bpLetterFace: (M) => [BG.letterFace(), paper(M, 'bpLetterFaceM', tex().letter, 0.8), 2, {}],
    bpSeat: (M) => [BG.seat(), VCm(M, 'bpSeatM', 0.15, { roughness: 0.85 }), 2, {}],
    bpSeatCard: (M) => [BG.seatCard(), paper(M, 'bpSeatCardM', tex().seat, 0.9), 2, {}],
    bpDisco: (M) => [BG.disco(), M.bpDiscoM || (M.bpDiscoM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.95, flatShading: true, emissive: 0x3a3a44 })), 2, {}],
    bpRegister: (M) => [BG.register(), VC(M, 'bpRegisterM', { roughness: 0.4, metalness: 0.4, emissive: 0x0e0a08 }), 2, {}],
    bpTab: (M) => [BG.tab(), paper(M, 'bpTabM', tex().tab, 0.8), 2, {}],
    bpJuke: (M) => [BG.juke(), VCm(M, 'bpJukeM', 0.15, { roughness: 0.35, metalness: 0.2 }), 2, {}],
    bpJukeFace: (M) => [BG.jukeFace(), M.bpJukeFaceM || (M.bpJukeFaceM = new THREE.MeshBasicMaterial({ map: tex().juke, color: new THREE.Color(1.4, 1.4, 1.4) })), 2, {}],
    bpBanner: (M) => [BG.bannerCloth(), VC(M, 'bpBannerM', { roughness: 0.8, emissive: 0x200a24 }), 4, {}],
    bpBannerFace: (M) => [BG.bannerFace(), paper(M, 'bpBannerFaceM', tex().banner, 0.9), 4, {}],
    bpStands: (M) => [BG.stands(), VCm(M, 'bpStandsM', 0.05, { roughness: 0.8 }), 40, {}],
  },
  parts: {
    // the stage door in the alley wall: the new deadbolt shining, the memo taped on
    bpStageDoor(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.bpBackWall.add(m); S.layers.bpDoor.add(m); S.layers.bpBolt.add(m); if (it.memo) S.layers.bpMemo.add(m);
      const cone = S.layers.bpCone, l = local(p, yaw, 0, 33 * s, 3 * s, S._o).clone(); glowAt(S, l.x, l.y, l.z, 12 * s, BULB, 1.5); poolAt(S, l.x, p.y + 0.1, l.z + 0, 34 * s, BULB, 0.7);
      const lp = local(p, yaw, 0, 0, 5 * s, S._o); S._m.compose(l, S._q0 || (S._q0 = new THREE.Quaternion()), S._s.set(1.2 * s, l.y - p.y, 1.2 * s)); cone.add(S._m, { aK: 1.2 });
      const b = local(p, yaw, -5.6 * s, 18.6 * s, 2.5 * s, S._o); glowAt(S, b.x, b.y, b.z, 6 * s, [1, 0.85, 0.4], 0.5 + 0.3 * Math.sin((S.tNow ?? 0) * 3));
    },
    // a string of bulbs across the alley, sagging, swinging a little
    bpFestoon(S, it, p, q, yaw) {
      const wire = S.layers.bpWire, bulbs = S.layers.bpBulb;
      if (!S.course) return;
      const L = it.span ?? 26, n = 14, T = S.tNow ?? 0, m = S._m;
      const pts = S._fe || (S._fe = Array.from({ length: n + 1 }, () => new THREE.Vector3()));
      const h0 = (it.h0 ?? S.course.sample(it.t).y + 12), sw = Math.sin(T * 1.3 + it.t) * 0.6;
      for (let k = 0; k <= n; k++) { const u = k / n; local(p, yaw + (it.skew ?? 0), -L + 2 * L * u, 0, sw * Math.sin(u * Math.PI), pts[k]); pts[k].y = h0 - 3.2 * (1 - Math.pow(2 * u - 1, 2)); }
      const d = S._fd || (S._fd = new THREE.Vector3()), qq = S._fq || (S._fq = new THREE.Quaternion()), X = S._fx || (S._fx = new THREE.Vector3(1, 0, 0));
      for (let k = 0; k < n; k++) { d.copy(pts[k + 1]).sub(pts[k]); const len = d.length(); qq.setFromUnitVectors(X, d.normalize()); m.compose(pts[k], qq, S._s.set(len, 1, 1)); wire.add(m); }
      const wk = 0.7 + 0.5 * (it.wakeNow ?? 0);
      for (let k = 1; k < n; k++) { m.makeTranslation(pts[k].x, pts[k].y, pts[k].z); bulbs.add(m); glowAt(S, pts[k].x, pts[k].y - 0.9, pts[k].z, 3.2, BULB, wk * (0.8 + 0.2 * Math.sin(T * 7 + k * 2.1 + it.t))); }
    },
    // a decade of gig posters pasted up the wall, layer over layer
    bpPosters(S, it, p, q, yaw) {
      const R = seeded(Math.floor(it.seed * 1e6) + 3), m = S._m;
      for (let k = 0; k < (it.n ?? 5); k++) { const w = local(p, yaw, (R() - 0.5) * 22, 4 + R() * 7, 0.05 + k * 0.06, S._o); S._e.set(0, yaw, (R() - 0.5) * 0.14); const pq = S._pq || (S._pq = new THREE.Quaternion()); pq.setFromEuler(S._e); const sc = 0.36 + R() * 0.2; m.compose(w, pq, S._s.set(sc, sc * 1.4, 1)); S.layers.bpPoster.add(m, { aCell: Math.floor(R() * 8) }); }
    },
    // nineteen days on the calendar; tonight on the calendar
    bpCal(S, it, p, q, yaw) {
      p.y = (it.h ?? 0) + (it.y ?? 18);
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.bpCalBoard.add(m); S.layers.bpCalFace.add(m, { aCell: it.cell ?? 0 });
      const l = local(p, yaw, 0, 15 * s, 4 * s, S._o); glowAt(S, l.x, l.y, l.z, 30 * s, [1, 0.9, 0.75], 0.3);
    },
    bpTally(S, it, p, q, yaw) { p.y = (it.h ?? 0) + (it.y ?? 18); const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.bpTallyBoard.add(m); S.layers.bpTallyFace.add(m); const l = local(p, yaw, 0, 9 * s, 4 * s, S._o); glowAt(S, l.x, l.y, l.z, 26 * s, [1, 0.9, 0.75], 0.25); },
    // hung over the road: the guest list, his name tag, the letter
    bpHung(S, it, p) {
      const h = S.course.sample(it.t).yaw, T = S.tNow ?? 0; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.3 : it.x < 0 ? 0.3 : 0) + Math.sin(T * 0.9 + it.t) * 0.08, (it.tilt ?? 0) + Math.sin(T * 1.2 + it.t) * 0.03); const fq = (S._hq || (S._hq = new THREE.Quaternion())).setFromEuler(S._e);
      const k = it.kind, s = (it.s ?? 1) * ({ list: 0.62, tag: 0.6, letter: 0.6, cal: 0.7, banner: 1 }[k] ?? 1);
      p.y = S.course.sample(it.t).y + (it.lift ?? (k === 'banner' ? 15 : 18));
      const m = S._m; m.compose(p, fq, S._s.set(s, s, s));
      if (k === 'list') { S.layers.bpClip.add(m); S.layers.bpClipFace.add(m); }
      else if (k === 'tag') { S.layers.bpTagBack.add(m); S.layers.bpTagFace.add(m); }
      else if (k === 'letter') { S.layers.bpLetter.add(m); S.layers.bpLetterFace.add(m); }
      else if (k === 'banner') { S.layers.bpBanner.add(m); S.layers.bpBannerFace.add(m); }
      else if (k === 'cal') { S.layers.bpCalBoard.add(m); S.layers.bpCalFace.add(m, { aCell: it.cell ?? 0 }); }
      glowAt(S, p.x, p.y, p.z, 34 * s, [1, 0.88, 0.7], 0.22);
      if (k === 'banner') for (let j = 0; j < 6; j++) { const a = T * 2 + j * 1.7, w = local(p, h + Math.PI, Math.sin(a * 0.7) * 20 * s, Math.cos(a) * 4 * s, 1.2 * s, S._o); glowAt(S, w.x, w.y, w.z, 2.4 * s, [1, 0.9, 0.5], 0.6 + 0.6 * Math.sin(T * 9 + j)); }
    },
    // frames on the wall next door, rattling with the party
    bpFrames(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, loud = S.bpLoud ?? 0, b = S.beat ?? 0;
      p.y = (it.h ?? 0) + (it.y ?? 16);
      S._e.set(0, yaw, Math.sin(T * 31 + it.seed * 10) * 0.05 * b * (0.4 + loud) + (it.seed - 0.5) * 0.1); const fq = (S._frq || (S._frq = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.bpFrame.add(m); S.layers.bpFramePic.add(m, { aCell: it.cell ?? 0 });
    },
    // every toast: two glasses swinging in to clink on the beat
    bpToast(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw, y = S.course.sample(it.t).y + (it.lift ?? 14), m = S._m, s = it.s ?? 1;
      const ph = S.course.beatAt(T) % 2, clink = Math.exp(-Math.min(ph, 2 - ph) * 5);
      const qq = S._tq || (S._tq = new THREE.Quaternion());
      for (const sd of [-1, 1]) {
        const tilt = sd * (0.55 - 0.42 * clink);
        const w = local(p, h + Math.PI, sd * (3.2 + 4 * (1 - clink)) * s, 0, 0, S._o).clone(); w.y = y - 10 * s;
        S._e.set(0, h + Math.PI, -tilt); qq.setFromEuler(S._e); m.compose(w, qq, S._s.set(s, s, s)); S.layers.bpFlute.add(m); S.layers.bpWine.add(m);
      }
      const c = local(p, h + Math.PI, 0, 0, 0, S._o); c.y = y + 8 * s; glowAt(S, c.x, c.y, c.z, (6 + 18 * clink) * s, [1, 0.95, 0.7], 0.2 + 1.4 * clink);
    },
    // the marquee over the street, bulbs chasing round it
    bpMarquee(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._mq || (S._mq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 15);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.bpMarquee.add(m); S.layers.bpMarqueeFace.add(m);
      const w = S._o; let k = 0;
      for (let j = 0; j < 40; j++) { const u = j / 40; let x, yy; if (u < 0.35) { x = -27 + 54 * (u / 0.35); yy = 10.6; } else if (u < 0.5) { x = 27; yy = 10.6 - 21.2 * ((u - 0.35) / 0.15); } else if (u < 0.85) { x = 27 - 54 * ((u - 0.5) / 0.35); yy = -10.6; } else { x = -27; yy = -10.6 + 21.2 * ((u - 0.85) / 0.15); } const on = ((j + Math.floor(T * 8)) % 3) === 0 ? 1 : 0.35; local(p, h + Math.PI, x * s, yy * s, 6.2 * s, w); glowAt(S, w.x, w.y, w.z, 2.6 * s, BULB, on * 1.3); k++; }
      glowAt(S, p.x, p.y, p.z, 60 * s, [1, 0.85, 0.6], 0.25);
    },
    // bunting across the street
    bpBunting(S, it, p, q, yaw) {
      const flags = S.layers.bpFlag;
      if (!S.course) return;
      const L = it.span ?? 30, n = 18, T = S.tNow ?? 0, m = S._m, h0 = S.course.sample(it.t).y + (it.lift ?? 11);
      const fq = S._bq || (S._bq = new THREE.Quaternion()), w = S._bw || (S._bw = new THREE.Vector3());
      for (let k = 0; k < n; k++) { const u = (k + 0.5) / n; local(p, yaw, -L + 2 * L * u, 0, 0, w); w.y = h0 - 2.6 * (1 - Math.pow(2 * u - 1, 2)); S._e.set(Math.sin(T * 3 + k) * 0.25, yaw, 0); fq.setFromEuler(S._e); m.compose(w, fq, S._s.set(1.2, 1.2, 1.2)); flags.add(m, { aTint: col(PARTY[(k + Math.floor(it.seed * 8)) % PARTY.length]) }); }
    },
    // a bunch of balloons tied by the road, bobbing
    bpBalloons(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, R = seeded(Math.floor(it.seed * 1e6) + 7);
      const base = (it.h ?? 0) + (it.y ?? 0);
      for (let k = 0; k < (it.n ?? 5); k++) {
        const hh = 14 + R() * 8, ox = (R() - 0.5) * 6, oz = (R() - 0.5) * 6;
        const w = local(p, yaw, ox + Math.sin(T * 1.1 + k) * 0.8, hh, oz + Math.cos(T * 0.9 + k) * 0.8, S._o).clone(); w.y = base + hh * s;
        m.compose(w, S._q0 || (S._q0 = new THREE.Quaternion()), S._s.set(s * 1.6, s * 1.6, s * 1.6)); S.layers.bpBalloon.add(m, { aTint: col(PARTY[Math.floor(R() * PARTY.length)]) });
        const sb = local(p, yaw, ox * 0.3, 0, oz * 0.3, S._o2 || (S._o2 = new THREE.Vector3())); sb.y = base; const len = w.y - 5 * s - base; m.compose(sb, S._q0, S._s.set(1, Math.max(0.1, len), 1)); m.setPosition(sb.x, base + len, sb.z); S.layers.bpString.add(m);
      }
    },
    // the punch bowl on its table; the bottle going in
    bpPunch(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.bpBowl.add(m); S.layers.bpPunch.add(m); S.layers.bpLadle.add(m); S.layers.bpCups.add(m);
      if (it.pour) S.layers.bpPour.add(m);
      const T = S.tNow ?? 0, c = local(p, yaw, 0, 16 * s, 0, S._o); glowAt(S, c.x, c.y, c.z, 34 * s, [1, 0.3, 0.4], 0.35);
      if (it.pour) for (let k = 0; k < 4; k++) { const f = (T * 2.2 + k / 4) % 1, d = local(p, yaw, (-9.6 + f * 3) * s, (21 - f * 6) * s, 0, S._o); glowAt(S, d.x, d.y, d.z, 1.6 * s, [1, 0.85, 0.5], 0.7); }
    },
    // the piano on the stage, playing his songs on its own
    bpPiano(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, T = S.tNow ?? 0; m.compose(p, q, S._s.set(s, s, s)); S.layers.bpPiano.add(m);
      const keys = S.layers.bpKey, kq = S._kq || (S._kq = new THREE.Quaternion()), good = smooth(it.good ?? 1e9, (it.good ?? 1e9) + 0.3, T);
      for (let k = 0; k < 36; k++) {
        const x = -7.8 + k * 0.445, phase = Math.sin(T * 9 + k * 0.7) * Math.sin(T * 3.1 + k * 0.23), down = phase > 0.55 ? 1 : 0;
        const w = local(p, yaw, x * s, (10.9 - down * 0.25) * s, 3 * s, S._o); S._e.set(down * 0.06, yaw, 0); kq.setFromEuler(S._e); m.compose(w, kq, S._s.set(s, s, s));
        const c = down && good > 0.5 ? [1.6, 1.3, 0.6] : [0.95, 0.93, 0.88]; keys.add(m, { aTint: c });
      }
      const l = local(p, yaw, 0, 18 * s, 0, S._o); glowAt(S, l.x, l.y, l.z, 30 * s, [1, 0.85, 0.6], 0.3 + 0.4 * good);
      if (good > 0) for (let k = 0; k < 6; k++) { const f = (T * 0.8 + k / 6) % 1, w = local(p, yaw, Math.sin(k * 2.1 + T) * 8 * s, (13 + f * 16) * s, (2 + Math.cos(k * 1.3) * 4) * s, S._o); glowAt(S, w.x, w.y, w.z, 2.5 * s, [1, 0.85, 0.4], (1 - f) * good); }
    },
    // sheet music coming up off the piano and over the road
    bpPages(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw, y0 = S.course.sample(it.t).y, m = S._m, pq = S._pgq || (S._pgq = new THREE.Quaternion());
      const go = clamp((T - it.go) / 2.5, 0, 1);
      for (let k = 0; k < 16; k++) {
        const R = seeded(k * 7 + 3), f = clamp(go * 1.4 - R() * 0.4, 0, 1);
        const w = local(p, h + Math.PI, (-28 + f * (28 + (R() - 0.5) * 50)) * (it.x < 0 ? 1 : -1), 0, (R() - 0.5) * 30, S._o); w.y = y0 + 4 + f * (10 + R() * 14) + Math.sin(T * 2 + k) * 1.5;
        S._e.set(T * (1 + R()) + k, T * 0.7 + k, T * 1.3 * R()); pq.setFromEuler(S._e); m.compose(w, pq, S._s.set(1.6, 1.6, 1.6)); S.layers.bpPage.add(m);
      }
    },
    // the mic on its stand on the stage, the spotlight coming down on it
    bpMic(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, T = S.tNow ?? 0; m.compose(p, q, S._s.set(s, s, s)); S.layers.bpMic.add(m);
      const on = smooth(it.spot ?? -1e9, (it.spot ?? -1e9) + 0.6, T) * (it.off ? 1 - smooth(it.off, it.off + 1, T) : 1);
      const top = (it.h ?? 0) + (it.ceil ?? 40), c = S._mc || (S._mc = new THREE.Vector3()); c.copy(p); c.y = top;
      m.compose(c, S._q0 || (S._q0 = new THREE.Quaternion()), S._s.set(s * 1.1, top - p.y, s * 1.1)); S.layers.bpCone.add(m, { aK: on });
      const mk = local(p, yaw, 0, 20 * s, 2.8 * s, S._o); glowAt(S, mk.x, mk.y, mk.z, 10 * s, [1, 0.95, 0.85], 0.25 + 0.9 * on);
      poolAt(S, p.x, p.y + 0.1, p.z, 22 * s, [1, 0.95, 0.85], 0.15 + 0.7 * on);
    },
    // his letters, the ones he never sent, going round the dressing room
    bpLetters(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw, y0 = S.course.sample(it.t).y, m = S._m, eq = S._eq || (S._eq = new THREE.Quaternion());
      for (let k = 0; k < 24; k++) {
        const a = T * (0.6 + (k % 5) * 0.08) + k * 0.9, r = 16 + (k % 4) * 6;
        const w = local(p, h, Math.cos(a) * r, 0, Math.sin(a) * r * 1.6, S._o); w.y = y0 + 8 + (k % 6) * 3 + Math.sin(T * 1.5 + k) * 2;
        S._e.set(Math.sin(T + k) * 0.6, a + Math.PI / 2 + h, Math.sin(T * 1.3 + k) * 0.4); eq.setFromEuler(S._e); m.compose(w, eq, S._s.set(1.4, 1.4, 1.4)); S.layers.bpEnv.add(m);
      }
    },
    bpSeat(S, it, p, q, yaw) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.bpSeat.add(m); S.layers.bpSeatCard.add(m); const l = local(p, yaw, 0, 30 * s, 4 * s, S._o); glowAt(S, l.x, l.y, l.z, 20 * s, [1, 0.9, 0.7], 0.4); poolAt(S, p.x, p.y + 0.1, p.z, 24 * s, [1, 0.9, 0.7], 0.5); },
    // the mirrored ball, turning, throwing light
    bpDisco(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, T * 0.8, 0); const dq = (S._dq || (S._dq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 18);
      const m = S._m, s = it.s ?? 1; m.compose(p, dq, S._s.set(s, s, s)); S.layers.bpDisco.add(m);
      glowAt(S, p.x, p.y, p.z, 26 * s, [1, 0.95, 0.9], 0.45 + 0.4 * (S.beat ?? 0));
      for (let k = 0; k < 10; k++) { const a = T * 0.8 + k * 0.63, w = local(p, h, Math.cos(a) * 6.4 * s, Math.sin(k * 1.7) * 4 * s, Math.sin(a) * 6.4 * s, S._o); if (Math.sin(T * 6 + k * 3) > 0.6) glowAt(S, w.x, w.y, w.z, 2.2 * s, [1, 1, 1], 1.4); }
    },
    // the register on the bar and the tab still open
    bpRegister(S, it, p, q, yaw) { p.y = (it.h ?? 0) + (it.y ?? 12); const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.bpRegister.add(m); S.layers.bpTab.add(m); const l = local(p, yaw, 0, 22 * s, 8 * s, S._o); glowAt(S, l.x, l.y, l.z, 24 * s, [1, 0.9, 0.7], 0.3); },
    bpJuke(S, it, p, q, yaw) { const m = S._m, s = it.s ?? 1, T = S.tNow ?? 0; m.compose(p, q, S._s.set(s, s, s)); S.layers.bpJuke.add(m); S.layers.bpJukeFace.add(m); const l = local(p, yaw, 0, 14 * s, 6 * s, S._o); glowAt(S, l.x, l.y, l.z, 30 * s, [1, 0.5, 0.3], 0.5 + 0.2 * Math.sin(T * 4)); poolAt(S, p.x, p.y + 0.1, p.z, 40 * s, [1, 0.6, 0.3], 0.45); for (let k = 0; k < 6; k++) { const f = (T * 0.7 + k / 6) % 1, w = local(p, yaw, (k % 2 ? 6 : -6) * s, (4 + f * 12) * s, 4.2 * s, S._o); glowAt(S, w.x, w.y, w.z, 1.4 * s, [1, 1, 1], 0.9 * (1 - f)); } },
    // the stands: rows going up and back, full of little lights swaying
    bpStands(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, T = S.tNow ?? 0; m.compose(p, q, S._s.set(s, s, s)); S.layers.bpStands.add(m);
      const on = smooth(it.on ?? -1e9, (it.on ?? -1e9) + 1.5, T), R = seeded(Math.floor(it.seed * 1e6) + 11), w = S._o;
      if (on <= 0.01) return;
      for (let k = 0; k < 36; k++) { const row = Math.floor(R() * 13), x = (R() - 0.5) * 56 + Math.sin(T * 1.6 + k) * 1.2; local(p, yaw, x * s, (3.4 + row * 2.2 + 2.5) * s, -row * 3.6 * s - 1.5 * s, w); glowAt(S, w.x, w.y, w.z, 2.2 * s, R() < 0.7 ? [1, 0.8, 0.45] : [0.85, 0.9, 1], on * (0.6 + 0.4 * Math.sin(T * 3 + k))); }
    },
  },
  kits: {
    bpStageDoor(S, z) { S.items.push({ t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, memo: z.memo, h: 0, parts: 'bpStageDoor', ahead: z.ahead }); },
    bpFestoon(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.7) S.items.push({ t: t + R() * 0.1, x: 0, rot: (R() - 0.5) * 0.5, span: z.span, h0: z.h0, seed: R(), wake0: 0.4, parts: 'bpFestoon', ahead: z.ahead ?? 24 }); },
    bpPosters(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) if (!(z.clear || []).some(([a, b, c]) => t > a && t < b && (!c || c === side))) S.items.push({ t: t + R() * 0.2, x: side * (z.x ?? 21), rot: SIDE(side), seed: R(), n: z.n, h: 0, parts: 'bpPosters', ahead: z.ahead ?? 24 }); },
    bpCal(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), y: z.y, s: z.s ?? 1, cell: z.cell, parts: 'bpCal', ahead: z.ahead ?? 30 })); },
    bpTally(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), y: z.y, s: z.s ?? 1, parts: 'bpTally', ahead: z.ahead ?? 30 })); },
    bpHung(S, z) { prepare(S.course, S.plan); for (const [t, kind, x, cell] of z.at) S.items.push({ t, x: x ?? 0, rot: 0, s: z.s ?? 1, lift: z.lift, tilt: z.tilt, kind, cell, parts: 'bpHung', ahead: z.ahead ?? 30 }); },
    bpFrames(S, z, R) { const cells = z.cells ?? [0, 1], clear = (t, sd) => (z.clear || []).some(([a, b, c]) => t > a && t < b && (!c || c === sd)); let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.45) { const side = k++ % 2 ? 1 : -1; if (clear(t, side)) continue; S.items.push(onFloor(S, { t: t + R() * 0.15, x: side * (z.x ?? 29.4), rot: SIDE(side), y: (z.y ?? 12) + R() * 6, s: (z.s ?? 1.3) * (0.85 + R() * 0.3), seed: R(), cell: cells[Math.floor(R() * cells.length)], parts: 'bpFrames', ahead: z.ahead ?? 20 })); } },
    bpToast(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, parts: 'bpToast', ahead: z.ahead ?? 30 }); },
    bpMarquee(S, z) { prepare(S.course, S.plan); for (const t of [].concat(z.at)) S.items.push({ t, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, parts: 'bpMarquee', ahead: z.ahead ?? 40 }); },
    bpBunting(S, z, R) { prepare(S.course, S.plan); for (let t = z.from; t < z.to; t += z.every ?? 0.8) S.items.push({ t: t + R() * 0.1, x: 0, rot: (R() - 0.5) * 0.4, span: z.span, lift: z.lift, seed: R(), parts: 'bpBunting', ahead: z.ahead ?? 24 }); },
    bpBalloons(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.9) for (const side of [-1, 1]) S.items.push(z.floor ? onFloor(S, { t: t + R() * 0.3, x: side * ((z.x ?? 18) + R() * 4), rot: 0, s: z.s ?? 1, seed: R(), n: z.n, parts: 'bpBalloons', ahead: z.ahead ?? 20 }) : { t: t + R() * 0.3, x: side * ((z.x ?? 18) + R() * 4), rot: 0, s: z.s ?? 1, seed: R(), n: z.n, h: 0, parts: 'bpBalloons', ahead: z.ahead ?? 20 }); },
    bpPunch(S, z) { for (const [t, x, pour] of z.at) S.items.push(z.floor ? onFloor(S, { t, x, rot: SIDE(x), s: z.s ?? 1, pour, parts: 'bpPunch', ahead: z.ahead ?? 30 }) : { t, x, rot: SIDE(x), s: z.s ?? 1, pour, h: 0, parts: 'bpPunch', ahead: z.ahead ?? 30 }); },
    bpPiano(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x) + (z.x > 0 ? 0.4 : -0.4), s: z.s ?? 1, good: z.good, parts: 'bpPiano', ahead: z.ahead ?? 30 })); },
    bpPages(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: z.x ?? -1, rot: 0, go: z.go, parts: 'bpPages', ahead: z.ahead ?? 30 }); },
    bpMic(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, spot: z.spot, off: z.off, ceil: z.ceil, parts: 'bpMic', ahead: z.ahead ?? 30 })); },
    bpLetters(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, parts: 'bpLetters', ahead: z.ahead ?? 24 }); },
    bpSeat(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, parts: 'bpSeat', ahead: z.ahead ?? 30 })); },
    bpDisco(S, z) { prepare(S.course, S.plan); for (const t of [].concat(z.at)) S.items.push({ t, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, parts: 'bpDisco', ahead: z.ahead ?? 30 }); },
    bpRegister(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), y: z.y, s: z.s ?? 1, parts: 'bpRegister', ahead: z.ahead ?? 30 })); },
    bpJuke(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, parts: 'bpJuke', ahead: z.ahead ?? 30 })); },
    bpStands(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + R() * 0.05, x: side * (z.x ?? 74), rot: SIDE(side), s: z.s ?? 1, on: z.on, seed: R(), parts: 'bpStands', ahead: z.ahead ?? 14 })); },
  },
});

// ---------- the rooms ----------
const flatRing = (W = 40, H = 36) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const VENUE = {
  rings: { flat: flatRing },
  ringOf: () => 'flat',
  styles: { next: 0, hall: 1, club: 2, dressing: 3, party: 4, bar: 5, quiet: 6, arena: 7 },
  dims: { next: [40, 34], hall: [22, 30], club: [52, 46], dressing: [34, 34], party: [52, 46], bar: [40, 36], quiet: [52, 46], arena: [72, 64] },
  lights: (id) => ({ 0: [40, 20], 1: [16, 8], 2: [36, 18], 3: [20, 10], 4: [26, 13], 5: [22, 11], 7: [30, 15] }[id] || null),
};

function venueMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uWarm: { value: new THREE.Color(0xffc070) }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyTop: { value: new THREE.Color() }, uSkyLow: { value: new THREE.Color() },
      uLoud: { value: 0 }, uGlow: { value: new THREE.Color(0xff8a50) },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uBeat, uFogDensity, uLoud;
      uniform vec3 uFog, uCam, uWarm, uLight, uSkyTop, uSkyLow, uGlow;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      vec3 hue(float t){ return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67))); }
      // brick, for the outsides
      vec3 brick(vec2 q, vec3 base){ vec2 b = vec2(q.x / 2.4 + mod(floor(q.y / 1.1), 2.0) * 0.5, q.y / 1.1); vec2 f = fract(b); float mortar = 1.0 - edge(f, 0.06); return mix(base * (0.75 + 0.35 * h2(floor(b))), vec3(0.32, 0.3, 0.28), mortar * 0.8); }
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float st = uStyle;
        float wa = part == 6 ? x * 1.3 + 9.0 : (side > 0.0 ? along + 11.0 : along);
        vec2 fx = st < 0.5 ? vec2(40.0, 20.0) : st < 1.5 ? vec2(16.0, 8.0) : st < 2.5 ? vec2(36.0, 18.0) : st < 3.5 ? vec2(20.0, 10.0) : st < 4.5 ? vec2(26.0, 13.0) : st < 5.5 ? vec2(22.0, 11.0) : st < 6.5 ? vec2(36.0, 18.0) : vec2(30.0, 15.0);
        float dl = mod(along - fx.y + fx.x * 0.5, fx.x) - fx.x * 0.5;
        float lightK = 0.6 + 0.45 * exp(-dl * dl / (fx.x * fx.x * 0.12));
        vec3 glow = vec3(0.0);
        vec3 col;
        bool club = (st > 1.5 && st < 2.5) || (st > 3.5 && st < 4.5) || (st > 5.5 && st < 6.5);
        if (part == 7) {
          if (st < 0.5) {
            // next door, from the alley: brick, a lit window or two, the side door
            col = brick(vec2(x, h), vec3(0.5, 0.24, 0.18));
            vec2 wq = vec2(mod(abs(x) - 18.0, 22.0), h - 14.0);
            float win = step(16.0, abs(x)) * step(4.0, wq.x) * step(wq.x, 14.0) * step(0.0, wq.y) * step(wq.y, 12.0) * step(h, 50.0);
            vec3 wc = uWarm * (0.6 + 0.4 * h2(vec2(floor((abs(x) - 18.0) / 22.0), floor(h / 30.0))));
            col = mix(col, vec3(0.03), win); glow += wc * win * 0.8;
            col *= 0.6;
          } else {
            // the venue's front: cream stone, gold stripes going up, the bulbs round the doors, poster cases
            col = vec3(0.7, 0.64, 0.54) * (0.9 + 0.1 * n2(vec2(x, h) * 0.3));
            col = mix(col, vec3(0.78, 0.6, 0.25), step(abs(mod(x + 4.0, 16.0) - 8.0), 0.8) * step(h, 52.0));
            col = mix(col, vec3(0.42, 0.08, 0.1), step(abs(h - 38.0), 3.0));
            float pc = step(18.0, abs(x)) * step(abs(x), 30.0) * step(6.0, h) * step(h, 24.0);
            col = mix(col, vec3(0.1, 0.08, 0.08), pc); glow += hue(floor(x / 12.0) * 0.37) * pc * step(20.0, abs(x)) * step(abs(x), 28.0) * step(8.0, h) * step(h, 22.0) * 0.35;
            vec2 bq = vec2(x, h); float bulb = 0.0;
            float frame = step(abs(abs(x) - 14.5), 1.0) * step(h, 30.0) + step(abs(h - 29.5), 1.0) * step(abs(x), 15.5);
            bulb = frame * smoothstep(0.45, 0.2, length(fract(bq / 1.8) - 0.5));
            glow += vec3(1.0, 0.8, 0.45) * bulb * (0.8 + 0.4 * step(0.5, fract(uTime * 2.0 + (x + h) * 0.1))) * 1.6;
            col *= 0.55;
            glow += vec3(0.25, 0.2, 0.14) * smoothstep(40.0, 0.0, h);
          }
        }
        else if (part == 8) { col = vec3(0.12, 0.1, 0.08); glow += uWarm * 0.25 * step(abs(fract(h * 0.3) - 0.5), 0.08); }
        else if (st < 0.5) {
          // next door: plain drywall, a carpet, a bulb; the party coming through the cracks
          if (part == 0) { col = vec3(0.32, 0.26, 0.22) * (0.8 + 0.2 * n2(vec2(x, along) * 0.6)); }
          else if (part == 3) { col = vec3(0.72, 0.7, 0.66) * (0.9 + 0.1 * n2(vec2(x, along) * 2.0)); }
          else {
            col = vec3(0.66, 0.63, 0.58) * (0.92 + 0.08 * n2(vec2(wa, h) * 0.2));
            col *= 1.0 - 0.18 * smoothstep(0.08, 0.0, abs(fract(wa / 8.0) - 0.5) - 0.48);
            col = mix(col, vec3(0.86), step(h, 1.2));
            // cracks, wider and brighter the louder it gets through the wall
            float cx = mod(wa, 23.0) - 11.5 + 3.0 * sin(h * 0.37 + floor(wa / 23.0)) + 1.4 * sin(h * 1.31 + wa);
            float len = step(2.0 + 5.0 * h2(vec2(floor(wa / 23.0), 4.0)), h) * step(h, 30.0 - 4.0 * h2(vec2(floor(wa / 23.0), 7.0)));
            float w = 0.45 + 0.9 * uLoud;
            float crack = smoothstep(w, 0.0, abs(cx)) * len * (part == 6 ? 0.0 : 1.0);
            float pulse = 0.55 + 0.45 * uBeat;
            glow += mix(uWarm, uGlow, 0.5 + 0.5 * sin(h * 0.2 + uTime)) * crack * (1.6 + 2.0 * uLoud) * pulse;
            glow += mix(uWarm, uGlow, 0.5) * exp(-abs(cx) * (0.7 - 0.35 * uLoud)) * len * (0.18 + 0.4 * uLoud) * pulse * (part == 6 ? 0.0 : 1.0);
          }
        } else if (st < 1.5) {
          // the hallway backstage: oxblood below, cream above, posters, a checker floor, pipes
          if (part == 0) { vec2 q = vec2(x, along) / 4.0; col = mix(vec3(0.08), vec3(0.78, 0.76, 0.7), mod(floor(q.x) + floor(q.y), 2.0)); col *= 0.85 + 0.15 * edge(fract(q), 0.05); }
          else if (part == 3) { col = vec3(0.5, 0.48, 0.44); col = mix(col, vec3(0.25, 0.22, 0.2), step(abs(abs(x) - 9.0), 0.8)); }
          else {
            col = h < 11.0 ? vec3(0.34, 0.08, 0.08) : vec3(0.78, 0.72, 0.6);
            col = mix(col, vec3(0.5, 0.36, 0.18), step(abs(h - 11.0), 0.4));
            vec2 pq = vec2(mod(wa, 13.0), h - 13.0);
            float poster = step(2.0, pq.x) * step(pq.x, 11.0) * step(0.0, pq.y) * step(pq.y, 12.0) * (part == 6 ? 0.0 : 1.0);
            float id = floor(wa / 13.0);
            vec3 pc = hue(h2(vec2(id, 2.0))) * 0.8;
            pc = mix(pc, vec3(0.95), step(0.5, fract((pq.y + h2(vec2(id, 5.0)) * 12.0) / 6.0)) * 0.3);
            col = mix(col, pc, poster);
          }
        } else if (club) {
          // the main room: velvet down the walls, gold bands, a dark wood floor
          float dim = st > 5.5 ? 0.25 : 1.0;
          if (part == 0) { vec2 q = vec2(x / 3.0, along / 18.0 + floor(x / 3.0) * 0.37); col = vec3(0.24, 0.14, 0.09) * (0.75 + 0.3 * h2(floor(q))) * (0.85 + 0.15 * edge(fract(q), 0.03)); col += uWarm * 0.12 * exp(-dl * dl / 40.0); }
          else if (part == 3) { vec2 q = fract(vec2(x, along) / 12.0) - 0.5; col = vec3(0.12, 0.05, 0.05); col = mix(col, vec3(0.6, 0.45, 0.2), smoothstep(0.04, 0.0, abs(length(q) - 0.32))); }
          else {
            float fold = 0.62 + 0.38 * sin(wa * 2.2 + sin(h * 0.11) * 1.2);
            col = vec3(0.45, 0.05, 0.08) * fold;
            col = mix(col, vec3(0.75, 0.55, 0.22), step(abs(h - 4.0), 0.6) + step(abs(h - 36.0), 0.6));
            col = mix(col, vec3(0.08, 0.02, 0.03), step(36.6, h));
            // sconces between the drapes
            float sc = smoothstep(1.4, 0.4, length(vec2(mod(wa, 24.0) - 12.0, h - 22.0))) * (part == 6 ? 0.0 : 1.0);
            glow += uWarm * sc * 1.4 * dim;
          }
          if (st > 3.5 && st < 4.5) {
            // the party: specks from the mirrored ball going round, coloured light coming and going
            vec2 sq = vec2(wa * 0.5 + uTime * 6.0, h * 0.5 + (part == 0 || part == 3 ? x * 0.5 : 0.0));
            float spk = step(0.93, h2(floor(sq))) * smoothstep(0.5, 0.2, length(fract(sq) - 0.5));
            glow += mix(vec3(1.0), hue(h2(floor(sq) + 3.0)), 0.5) * spk * 1.4;
            glow += hue(floor(uTime * 1.5) * 0.31 + wa * 0.002) * 0.08 * (0.5 + uBeat);
          }
          col *= dim;
        } else if (st < 3.5) {
          // the dressing room: mirrors all down the walls with bulbs round each one, a counter under them
          if (part == 0) { vec2 q = vec2(x, along) / 3.0; col = vec3(0.5, 0.48, 0.45) * (0.85 + 0.15 * edge(fract(q), 0.04)); }
          else if (part == 3) { col = vec3(0.82, 0.8, 0.76); }
          else {
            col = vec3(0.6, 0.42, 0.36);
            float u = mod(wa, 14.0);
            float mir = step(2.0, u) * step(u, 12.0) * step(12.0, h) * step(h, 26.0) * (part == 6 ? 0.0 : 1.0);
            vec3 glass = mix(uSkyLow * 0.4 + vec3(0.25, 0.22, 0.24), vec3(0.9, 0.88, 0.85), smoothstep(0.4, 1.0, n2(vec2(u * 0.4 + h * 0.2, h * 0.1))) * 0.4);
            col = mix(col, glass, mir);
            // the bulbs round the mirror
            float onRim = (step(abs(u - 2.0), 0.6) + step(abs(u - 12.0), 0.6)) * step(12.0, h) * step(h, 26.0) + step(abs(h - 26.0), 0.6) * step(2.0, u) * step(u, 12.0);
            float bulb = onRim * smoothstep(0.55, 0.25, length(fract(vec2(u, h) / 1.6) - 0.5)) * (part == 6 ? 0.0 : 1.0);
            glow += vec3(1.0, 0.85, 0.6) * bulb * 2.2;
            col = mix(col, vec3(0.2, 0.14, 0.1), step(abs(h - 10.5), 1.5) * (part == 6 ? 0.0 : 1.0));
          }
        } else if (st < 5.5) {
          // the bar: wood panelling, shelves of bottles glowing on the back wall, a mirror strip
          if (part == 0) { vec2 q = vec2(x / 2.4, along / 14.0 + floor(x / 2.4) * 0.41); col = vec3(0.2, 0.12, 0.07) * (0.75 + 0.3 * h2(floor(q))); }
          else if (part == 3) { vec2 q = fract(vec2(x, along) / 3.0); col = vec3(0.4, 0.36, 0.3) * (0.8 + 0.2 * edge(q, 0.15)); }
          else {
            col = vec3(0.3, 0.17, 0.08) * (0.85 + 0.15 * sin(wa * 3.0));
            float shelfZone = step(14.0, h) * step(h, 30.0) * (part == 6 ? 0.0 : 1.0);
            float sh = step(abs(fract((h - 14.0) / 5.0) - 0.05), 0.05) * shelfZone;
            col = mix(col, vec3(0.5, 0.36, 0.2), sh);
            vec2 bq = vec2(wa / 2.2, (h - 14.0) / 5.0); vec2 bc = floor(bq), bf = fract(bq);
            float tall = 0.55 + 0.25 * h2(bc + 2.0);
            float body = step(0.3, bf.x) * step(bf.x, 0.7) * step(0.1, bf.y) * step(bf.y, tall);
            float neck = step(0.44, bf.x) * step(bf.x, 0.56) * step(tall, bf.y) * step(bf.y, tall + 0.22);
            float bottle = clamp(body + neck, 0.0, 1.0) * shelfZone * step(0.25, h2(bc + 9.0));
            glow += uWarm * 0.12 * shelfZone * (1.0 - bottle);
            vec3 bcol = h2(bc + 1.0) < 0.3 ? vec3(0.9, 0.55, 0.15) : h2(bc + 1.0) < 0.6 ? vec3(0.2, 0.6, 0.25) : h2(bc + 1.0) < 0.8 ? vec3(0.8, 0.85, 0.9) : vec3(0.6, 0.15, 0.2);
            col = mix(col, bcol * 0.4, bottle); glow += bcol * bottle * 0.55;
            col = mix(col, uSkyLow * 0.3 + vec3(0.2), step(abs(h - 32.0), 1.4) * (part == 6 ? 0.0 : 1.0));
          }
        } else {
          // the arena: the stands painted up the walls, lights all through them, the rig over the floor
          if (part == 0) { vec2 q = vec2(x, along) / 8.0; col = vec3(0.16, 0.16, 0.2) * (0.85 + 0.15 * edge(fract(q), 0.03)); col += vec3(0.6, 0.6, 0.7) * 0.06 * exp(-dl * dl / 60.0); }
          else if (part == 3) { col = vec3(0.03, 0.03, 0.05); col += vec3(0.5, 0.5, 0.55) * step(abs(mod(x, 18.0) - 9.0), 0.4) * 0.6; col += vec3(0.5, 0.5, 0.55) * step(abs(dl), 0.4) * 0.6; }
          else {
            float row = floor(h / 2.6);
            col = mix(vec3(0.12, 0.12, 0.16), vec3(0.18, 0.18, 0.24), mod(row, 2.0)) * (0.9 + 0.1 * h2(vec2(floor(wa / 1.2), row)));
            col = mix(col, vec3(0.04), step(h, 4.0));
            vec2 lq = vec2(wa / 2.2, h / 2.6); vec2 lc = floor(lq);
            float lit = step(0.55, h2(lc)) * smoothstep(0.32, 0.1, length(fract(lq) - vec2(0.5, 0.4) + vec2(sin(uTime * 2.0 + lc.x) * 0.06, 0.0))) * step(5.0, h) * (part == 6 ? 0.0 : 1.0);
            glow += (h2(lc + 4.0) < 0.75 ? vec3(1.0, 0.75, 0.4) : vec3(0.8, 0.88, 1.0)) * lit * (0.8 + 0.5 * sin(uTime * 3.0 + lc.x * 1.7 + lc.y)) * 1.4;
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

// ---------- the end: the stage door again, a new key in the lock, the door coming open ----------
export class KeyFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? 0;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    // the end of the alley: the venue's back wall across it, the stage door in the middle
    const brickTex = tex().brick;
    const wallG = merge([box(52, 60, 3, -35, 30, -1.6), box(52, 60, 3, 35, 30, -1.6), box(18.2, 29, 3, 0, 45.5, -1.6)]);
    const uv = wallG.attributes.uv, pos = wallG.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 9, pos.getY(i) / 9);
    this.group.add(new THREE.Mesh(wallG, new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: brickTex, emissiveIntensity: 0.12 })));
    this.group.add(new THREE.Mesh(merge([paint(box(20, 1.4, 2.4, 0, 30.7, -0.2), rgb(0x2a2a30)), paint(box(1.4, 31.4, 2.4, -9.7, 15.7, -0.2), rgb(0x2a2a30)), paint(box(1.4, 31.4, 2.4, 9.7, 15.7, -0.2), rgb(0x2a2a30)), paint(box(26, 1.6, 6, 0, 33.4, 2), rgb(0x2a2a30))]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 })));
    // the door on its hinge, its new bolt; the key in the lock
    this.hinge = new THREE.Group(); this.hinge.position.set(9, 0, 0); this.group.add(this.hinge);
    const leaf = new THREE.Mesh(merge([paint(box(18, 30, 1.6, -9, 15, -0.4), rgb(0x8a2a24)), paint(box(18, 1.2, 1.7, -9, 3, -0.3), rgb(0x5a1a18)), paint(box(0.9, 7, 1.8, -15.6, 14, 0.6), rgb(0x8a8e98))]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3, emissive: 0x2a0e0a }));
    this.hinge.add(leaf);
    const bolt = new THREE.Mesh(BG.bolt(), selfLit({ roughness: 0.2, metalness: 0.8 }, 0.55)); bolt.position.set(-9, 0, 0); this.hinge.add(bolt);
    this.key = new THREE.Mesh(BG.bigKey(), selfLit({ roughness: 0.18, metalness: 0.85 }, 0.8)); this.key.rotation.y = Math.PI; this.key.position.set(-14.6, 18.6, 18); this.key.scale.setScalar(0.9); this.hinge.add(this.key);
    // inside: the venue lit up, warm, a long way back
    this.inside = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.72, 0.4).multiplyScalar(0.9) })); this.inside.position.set(0, 30, -60); this.group.add(this.inside);
    this.group.scale.setScalar(1.1);
    this.fired = false; this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() { this.fired = true; }
  update(track, rider, songT, dt) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + Math.PI, 0);
    const c = this.cfg, turn = smooth(c.turn, c.turn + 0.8, songT), open = smooth(c.open, c.open + 2.2, songT);
    this.key.position.z = 18 - 15 * smooth(c.turn - 1.6, c.turn - 0.2, songT);
    this.key.rotation.z = turn * Math.PI / 2;
    this.hinge.rotation.y = -1.25 * open;
    this.inside.visible = open > 0.01;
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    this._w.set(0, 15, 8).applyMatrix4(this.group.matrixWorld);
    S.glow(this._w.x, this._w.y, this._w.z, 46, [1, 0.72, 0.4], 0.1 + 0.8 * open);
    this._w.set(0, 0, 18).applyMatrix4(this.group.matrixWorld); S.pool(this._w.x, 0.1, this._w.z, 60, [1, 0.72, 0.4], 0.12 + 0.6 * open);
    this._w.set(0, 35.6, 3).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 12, BULB, 1.3);
    this.key.updateMatrixWorld(true); this._w.setFromMatrixPosition(this.key.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 12, [1, 0.85, 0.4], 0.5 + 0.7 * turn);
  }
}

// ---------- the place, per frame ----------
export class VenueWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = venueMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, VENUE));
    const c = S.course;
    if (S.town) { S.town.floorFn = (t, x) => floorAt(c, t); }
    // the front doors of the venue: two leaves swinging in like they're sorry
    const d = S.plan.doors;
    if (d) {
      this.doors = new THREE.Group(); scene.add(this.doors);
      const leafG = merge([paint(box(11.5, 26, 1.2, -5.75, 13, 0), rgb(0x6a1a14)), paint(box(9, 14, 1.3, -5.75, 15, 0), rgb(0xd8b86a)), paint(box(0.6, 8, 1.6, -10, 13, 0.6), rgb(0xd8b050))]);
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.3, emissive: 0x2a1408 });
      this.leaves = [-1, 1].map((sd) => { const g = new THREE.Group(); g.position.set(sd * -11.5, 0, 0); const m = new THREE.Mesh(leafG, mat); if (sd > 0) m.scale.x = -1; g.add(m); this.doors.add(g); return { g, sd }; });
      this.doors.visible = false;
    }
    this._g = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, t = S.rider.t, ev = S.plan.roomEvents || {};
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uBeat.value = S.town.beat || 0;
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uWarm.value.set(P.lamp ?? 0xffc070); u.uGlow.value.set(P.glow ?? 0xff8a50);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyTop.value.set(P.zenith); u.uSkyLow.value.set(P.horizon);
    u.uLoud.value = ev.loud ? smooth(ev.loud[0], ev.loud[1], t) : 0;
    S.town.bpLoud = u.uLoud.value;
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    const M = S.town.mats;
    if (M.bpConeM) M.bpConeM.uniforms.uCol.value.set(0xfff0d8);
    if (this.doors) {
      const d = S.plan.doors, show = t > d.t - 46 && t < d.t + 3;
      this.doors.visible = show;
      if (show) {
        S.track.ground(d.t, 0, this._g); this.doors.position.set(this._g.x, floorAt(S.course, d.t), this._g.z); this.doors.rotation.set(0, S.course.sample(d.t).yaw, 0);
        const o = smooth(d.open, d.open + 0.9, t), sorry = Math.sin((t - d.open) * 3.2) * 0.18 * Math.exp(-Math.max(0, t - d.open - 0.9) * 0.8) * (t > d.open ? 1 : 0);
        for (const { g, sd } of this.leaves) g.rotation.y = sd * (1.45 * o + sorry);
      }
    }
  }
  // the lights in each room
  draw(T) {
    const g = this._g, lamp = col(this.S.P.lamp ?? 0xffc070);
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(this.S.course, f.t);
        if (r.style === 0) { this.S.track.ground(f.t, 0, g); T.glow(g.x, fy + r.H - 4, g.z, 6, BULB, 0.9); T.pool(g.x, fy + 0.08, g.z, 34, BULB, 0.3); continue; }
        if (r.style === 1) { this.S.track.ground(f.t, 0, g); T.glow(g.x, fy + r.H - 2, g.z, 5, BULB, 1.0); T.pool(g.x, fy + 0.08, g.z, 18, BULB, 0.35); continue; }
        if (r.style === 3) { for (const x of [-18, 18]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 1, g.z, 7, [1, 0.95, 0.85], 0.8); } continue; }
        if (r.style === 4) { for (const x of [-30, 30]) { this.S.track.ground(f.t, x, g); const c = col(PARTY[Math.floor((f.along / 26) % PARTY.length + PARTY.length) % PARTY.length]); T.glow(g.x, fy + r.H - 3, g.z, 12, c, 0.9); T.pool(g.x, fy + 0.08, g.z, 30, c, 0.35); } continue; }
        if (r.style === 7) { for (const x of [-40, 0, 40]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 2, g.z, 14, [0.95, 0.97, 1], 1.0); } this.S.track.ground(f.t, 0, g); T.pool(g.x, fy + 0.08, g.z, 60, [0.9, 0.92, 1], 0.3); continue; }
        if (r.style === 6) continue;
        // the club and the bar: chandeliers and pendants
        for (const x of r.style === 5 ? [-14, 14] : [-22, 22]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 6, g.z, r.style === 5 ? 6 : 12, lamp, 0.9); }
        this.S.track.ground(f.t, 0, g); T.pool(g.x, fy + 0.08, g.z, 50, lamp, 0.35);
      }
    }
  }
}

// his lines on show cards: dark red, a gold frame, bulbs round it, hung over the road
extend({
  layers: {
    bpSignBoard: (M) => [merge([paint(box(24.6, 8.6, 1, 0, 0, -1.0), rgb(0x2a0a10)), paint(box(25.4, 0.7, 1.3, 0, 4.4, -0.8), rgb(0xd8a840)), paint(box(25.4, 0.7, 1.3, 0, -4.4, -0.8), rgb(0xd8a840)), paint(box(0.7, 9.4, 1.3, -12.7, 0, -0.8), rgb(0xd8a840)), paint(box(0.7, 9.4, 1.3, 12.7, 0, -0.8), rgb(0xd8a840)), paint(box(0.2, 40, 0.2, -9, 24.4, -1.0), rgb(0x5a5e68)), paint(box(0.2, 40, 0.2, 9, 24.4, -1.0), rgb(0x5a5e68))]), VCm(M, 'bpSignM', 0.25, { roughness: 0.4, metalness: 0.4 }), 24, {}],
    bpSignFace: (M) => [signFace(23, 7.2, 0, 0, 0.02), M.sign, 24, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    bpSign(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.3 : it.x < 0 ? 0.3 : 0), Math.sin(T * 1.1 + it.t) * 0.02); const fq = (S._bsq || (S._bsq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.bpSignBoard.add(m); S.layers.bpSignFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      const w = S._o, yaw = h + Math.PI + (it.x > 0 ? -0.3 : it.x < 0 ? 0.3 : 0);
      for (let j = 0; j < 16; j++) { const u = j / 16; let x, y; if (u < 0.5) { x = -12 + 24 * (u / 0.5); y = 4.4; } else { x = 12 - 24 * ((u - 0.5) / 0.5); y = -4.4; } local(p, yaw, x * s, y * s, 0.6 * s, w); glowAt(S, w.x, w.y, w.z, 1.6 * s, BULB, ((j + Math.floor(T * 6)) % 2 ? 1.2 : 0.45)); }
      glowAt(S, p.x, p.y, p.z, 30 * s, [1, 0.8, 0.5], 0.15);
    },
  },
});
