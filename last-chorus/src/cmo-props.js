// CUT ME OFF: the things in the Corner Bar on its last night, at the size they take up when you're
// small in it (a real bar times about eight). Geometry only, vertex-coloured; the lit parts (the
// jukebox's arch and bubble tubes, the bottles, the signs) are their own pieces so they can glow.
// cmo-world.js puts them in the place.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, rgb, seeded, box } from './summer.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
export const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
export const sph = (r, sx, sy, sz, x, y, z, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
export const lathe = (pts, n = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export const WALNUT = rgb(0x4a2414), WALNUT2 = rgb(0x6a3420), CHROME = rgb(0xd8dce4), BRASS = rgb(0xd0a048), BLACK = rgb(0x121014), CREAM = rgb(0xf0e6d0), STEEL = rgb(0x3a3c44);

// ---------- the pictures ----------
// the jukebox's title strips: the whole record, two to a strip, and hers in the middle on its own
export function stripsTexture(titles = []) {
  const others = titles.filter((t) => t !== 'CUT ME OFF');
  const strips = [];
  for (let i = 0; i < others.length; i += 2) strips.push([others[i], others[i + 1] || '']);
  strips.splice(Math.min(strips.length, 8), 0, ['CUT ME OFF', null]);
  const cols = 6, rows = Math.max(1, Math.ceil(strips.length / cols));
  return canvasTex(1536, 512, (g, W, H) => {
    g.fillStyle = '#1a0e08'; g.fillRect(0, 0, W, H);
    const cw = W / cols, ch = H / rows;
    strips.forEach(([a, b], i) => {
      const x = (i % cols) * cw, y = Math.floor(i / cols) * ch, hers = b === null;
      g.fillStyle = hers ? '#fff6dc' : '#ece0c2'; g.fillRect(x + 7, y + 8, cw - 14, ch - 16);
      g.fillStyle = hers ? '#e0302a' : '#b04030'; g.fillRect(x + 7, y + ch / 2 - 2, cw - 14, 4);
      g.fillStyle = '#20140e'; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (hers) { g.font = 'bold 46px "Arial Narrow", Arial, sans-serif'; g.fillText(a, x + cw / 2, y + ch / 2, cw - 30); return; }
      g.font = 'bold 22px "Arial Narrow", Arial, sans-serif';
      g.fillText(a.toUpperCase(), x + cw / 2, y + ch * 0.29, cw - 24);
      g.fillText(b.toUpperCase(), x + cw / 2, y + ch * 0.71, cw - 24);
    });
  });
}
// the bar tab, a long strip: the rounds, a year of Saturdays, CLOSED stamped across it
export function tabTexture() {
  return canvasTex(256, 1024, (g, W, H) => {
    g.fillStyle = '#f6f0e2'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a2622'; g.font = 'bold 26px "Courier New", monospace'; g.textAlign = 'center';
    g.fillText('CORNER BAR', W / 2, 54); g.font = '18px "Courier New", monospace'; g.fillText('TAB #1', W / 2, 84);
    g.textAlign = 'left'; g.font = '17px "Courier New", monospace';
    const R = seeded(77), items = ['WHISKEY', 'WHISKEY', 'HOUSE RED', 'GIN', 'WHISKEY', 'LAST ONE', 'WATER', 'WHISKEY', 'SHOT', 'ONE MORE', 'WHISKEY'];
    for (let i = 0; i < 26; i++) { const y = 130 + i * 30; g.fillText(items[i % items.length], 24, y); g.textAlign = 'right'; g.fillText((4 + Math.floor(R() * 9)) + '.' + (R() < 0.5 ? '00' : '50'), W - 24, y); g.textAlign = 'left'; }
    g.fillRect(20, 930, W - 40, 2); g.font = 'bold 22px "Courier New", monospace'; g.fillText('TOTAL', 24, 966);
    g.save(); g.translate(W / 2, 560); g.rotate(-0.42); g.strokeStyle = 'rgba(200,30,40,0.85)'; g.lineWidth = 7; g.strokeRect(-104, -40, 208, 80);
    g.fillStyle = 'rgba(200,30,40,0.85)'; g.font = 'bold 54px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CLOSED', 0, 4); g.restore();
  });
}
// the house bands on the wall: a band of four in front of a brick wall, a print gone brown
export function bandsTexture() {
  return canvasTex(1024, 256, (g, W, H) => {
    const R = seeded(19);
    for (let k = 0; k < 4; k++) {
      const x0 = k * 256;
      const tone = ['#c8a878', '#b8b0a0', '#d0b088', '#a8a0a8'][k];
      g.fillStyle = tone; g.fillRect(x0 + 10, 10, 236, 236);
      g.fillStyle = 'rgba(60,30,20,0.25)'; for (let y = 20; y < 200; y += 14) g.fillRect(x0 + 12, y, 232, 2);
      for (let p = 0; p < 4; p++) {
        const cx = x0 + 52 + p * 50 + (R() - 0.5) * 8, hh = 120 + R() * 30;
        g.fillStyle = 'rgba(30,18,14,0.88)';
        g.beginPath(); g.arc(cx, 246 - hh, 15, 0, Math.PI * 2); g.fill();
        g.fillRect(cx - 18, 246 - hh + 14, 36, hh - 14);
        if (p === 1 || (p === 3 && k % 2)) { g.save(); g.translate(cx + 6, 246 - hh * 0.45); g.rotate(-0.6); g.fillRect(-4, -46, 8, 70); g.beginPath(); g.ellipse(0, 26, 16, 22, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      }
      g.strokeStyle = '#1a120c'; g.lineWidth = 10; g.strokeRect(x0 + 5, 5, 246, 246);
    }
  });
}
// a crate's side: stencilled arrows, THIS SIDE UP, FRAGILE
export function crateTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#b08a58'; g.fillRect(0, 0, W, H);
    const R = seeded(5); for (let y = 0; y < H; y += 64) { g.fillStyle = `rgba(80,50,20,${0.15 + R() * 0.15})`; g.fillRect(0, y, W, 4); for (let k = 0; k < 30; k++) { g.fillStyle = 'rgba(90,60,30,0.12)'; g.fillRect(R() * W, y + R() * 60, 40 + R() * 80, 2); } }
    g.strokeStyle = '#6a4a28'; g.lineWidth = 28; g.strokeRect(14, 14, W - 28, H - 28); g.beginPath(); g.moveTo(14, 14); g.lineTo(W - 14, H - 14); g.stroke();
    g.fillStyle = '#1a1410'; g.font = 'bold 54px Impact, "Arial Black", sans-serif'; g.textAlign = 'center';
    for (const x of [150, 362]) { g.beginPath(); g.moveTo(x, 120); g.lineTo(x - 44, 190); g.lineTo(x - 16, 190); g.lineTo(x - 16, 250); g.lineTo(x + 16, 250); g.lineTo(x + 16, 190); g.lineTo(x + 44, 190); g.closePath(); g.fill(); }
    g.fillText('THIS SIDE UP', W / 2, 320); g.fillStyle = '#a82a20'; g.fillText('FRAGILE', W / 2, 410);
  });
}
// the tip jar's label
export function tipTexture() {
  return canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, W, H);
    g.fillStyle = '#f2ead6'; g.beginPath(); g.ellipse(W / 2, H / 2, 236, 100, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#a8322a'; g.lineWidth = 8; g.stroke();
    g.fillStyle = '#20140e'; g.font = 'bold 50px "Brush Script MT", "Segoe Script", cursive'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('keep the change', W / 2, H / 2 + 4);
  });
}
// the set list taped to a step: the old one, songs crossed out and one circled
export function setlistTexture() {
  return canvasTex(256, 360, (g, W, H) => {
    g.fillStyle = '#f4f0e4'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(240,230,160,0.7)'; g.fillRect(90, 0, 76, 26);
    g.fillStyle = '#1a1a26'; g.font = 'bold 30px "Comic Sans MS", "Segoe Print", cursive'; g.textAlign = 'left';
    const songs = ['OPENER', 'SLOW ONE', 'THE COVER', 'NEW ONE', 'CUT ME OFF', 'ENCORE?'];
    songs.forEach((s, i) => { g.fillText(s, 24, 70 + i * 48); });
    g.strokeStyle = '#1a1a26'; g.lineWidth = 4; g.beginPath(); g.moveTo(18, 308); g.lineTo(200, 300); g.stroke();
    g.strokeStyle = '#c8302a'; g.beginPath(); g.ellipse(110, 262, 104, 26, -0.04, 0, Math.PI * 2); g.stroke();
  });
}

// ---------- the bar ----------
export const PROP = {
  // a stool: the round seat, the chrome post, the foot ring, the base
  stool() {
    return merge([paint(cyl(2.2, 2.0, 1.1, 20, 0, 6.6, 0), rgb(0x8a1a1a)), paint(cyl(2.25, 2.25, 0.35, 20, 0, 6.0, 0), CHROME), paint(cyl(0.32, 0.32, 5.6, 8, 0, 3.0, 0), CHROME),
      paint(new THREE.TorusGeometry(1.4, 0.16, 6, 20).rotateX(Math.PI / 2).translate(0, 2.4, 0), CHROME), paint(cyl(1.6, 1.8, 0.3, 20, 0, 0.15, 0), CHROME)]);
  },
  // a booth against the wall: the high back, the bench, the table between, a candle in red glass
  booth() {
    const r = rgb(0x6a1418), d = rgb(0x4a0e10), parts = [];
    for (const z of [-7.5, 7.5]) { const s = Math.sign(z); parts.push(paint(box(14, 4, 4.4, 0, 2, z), d), paint(box(14, 1.4, 4.8, 0, 4.6, z), r), paint(box(14, 8, 1.6, 0, 8.6, z + s * 2.2), r), paint(box(14.4, 0.6, 2.0, 0, 12.8, z + s * 2.0), d)); }
    parts.push(paint(box(10, 0.7, 7.6, 0, 6.6, 0), WALNUT2), paint(cyl(0.5, 0.5, 6.2, 8, 0, 3.3, 0), STEEL), paint(cyl(2.4, 2.6, 0.3, 16, 0, 0.15, 0), STEEL));
    return merge(parts);
  },
  boothCandle() { return paint(cyl(0.55, 0.45, 1.2, 12, 0, 7.55, 0), rgb(0xff3a2a)); },
  // the brass bell they ring for last call, on its bracket, the rope hanging
  bellBracket() { return merge([paint(box(0.6, 0.6, 7, 0, 0, 3.2), BRASS), paint(box(0.5, 3.6, 0.5, 0, -1.6, 6.6), BRASS), paint(box(2.4, 2.4, 0.4, 0, 0, 0), BRASS)]); },
  bell() { return merge([paint(lathe([[0.2, 0], [0.95, -0.25], [1.2, -0.8], [1.55, -1.9], [2.2, -2.9], [2.05, -3.2], [0.01, -3.05]], 24), BRASS), paint(cyl(0.18, 0.18, 6, 6, 0.3, -6.2, 0), rgb(0xe8dcc0))]); },
  // the regulars' drinks, each its own: whiskey on the rocks, a martini, a pint, house red, a highball, a coupe, a shot
  glass(kind) {
    const glassC = rgb(0xe8f4ff), parts = [];
    if (kind === 0) { parts.push(paint(lathe([[1.1, 0], [1.2, 0.2], [1.3, 2.4], [1.2, 2.4], [1.1, 0.4], [0, 0.4]]), glassC), paint(cyl(1.08, 1.08, 1.2, 16, 0, 1.0, 0), rgb(0xc87a20)), paint(box(1.0, 0.9, 0.9, 0.1, 1.5, 0.1).rotateY(0.5), rgb(0xf0f8ff))); }
    else if (kind === 1) { parts.push(paint(lathe([[0.9, 0], [0.1, 0.2], [0.1, 2.0], [1.6, 3.6], [1.5, 3.6], [0.05, 2.1]]), glassC), paint(new THREE.ConeGeometry(1.3, 1.3, 16).rotateX(Math.PI).translate(0, 2.95, 0), rgb(0xe8f0e0)), paint(sph(0.32, 1, 1, 1, 0.3, 3.1, 0, 8, 6), rgb(0x6a8a2a)), paint(new THREE.BoxGeometry(0.08, 2.0, 0.08).rotateZ(0.3).translate(0.3, 3.4, 0), rgb(0xd8b878))); }
    else if (kind === 2) { parts.push(paint(lathe([[1.0, 0], [1.1, 0.2], [1.45, 4.0], [1.35, 4.0], [1.0, 0.4], [0, 0.4]]), glassC), paint(cyl(1.32, 1.0, 3.0, 16, 0, 1.9, 0), rgb(0xe0a830)), paint(cyl(1.42, 1.34, 0.7, 16, 0, 3.75, 0), rgb(0xfff8ec))); }
    else if (kind === 3) { parts.push(paint(lathe([[0.9, 0], [0.12, 0.15], [0.12, 1.6], [1.0, 2.2], [1.15, 3.4], [1.05, 3.4], [0.05, 1.7]]), glassC), paint(sph(0.98, 1, 0.55, 1, 0, 2.35, 0, 14, 8), rgb(0x8a1020))); }
    else if (kind === 4) { parts.push(paint(cyl(0.95, 0.85, 4.4, 16, 0, 2.2, 0), glassC), paint(cyl(0.9, 0.82, 3.4, 16, 0, 1.8, 0), rgb(0xd8e8d0)), paint(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 12).rotateZ(0.4).translate(0.6, 4.3, 0), rgb(0x8ac83a)), paint(new THREE.BoxGeometry(0.12, 5.0, 0.12).rotateZ(-0.15).translate(-0.3, 3.4, 0), rgb(0xd83a3a))); }
    else if (kind === 5) { parts.push(paint(lathe([[0.9, 0], [0.1, 0.15], [0.1, 1.8], [1.4, 2.4], [1.6, 2.9], [1.5, 2.9], [0.05, 1.9]]), glassC), paint(sph(1.38, 1, 0.3, 1, 0, 2.55, 0, 14, 6), rgb(0xff7aa0))); }
    else { parts.push(paint(cyl(0.7, 0.55, 1.4, 12, 0, 0.7, 0), glassC), paint(cyl(0.62, 0.5, 1.0, 12, 0, 0.6, 0), rgb(0xd8b040))); }
    return merge(parts);
  },
  // a bottle, tipped to pour, and the pour itself
  bottle() { return merge([paint(lathe([[0.01, 0], [1.3, 0.05], [1.35, 5.2], [1.2, 5.9], [0.45, 6.8], [0.42, 8.6], [0.5, 8.7], [0.01, 8.8]], 18), rgb(0x8a4a10)), paint(cyl(1.38, 1.38, 2.4, 18, 0, 2.6, 0), CREAM)]); },
  stream() { return paint(cyl(0.16, 0.12, 7.2, 8, 0, 3.6, 0), rgb(0xe89a30)); },
  coaster() { return paint(cyl(1.7, 1.7, 0.08, 20, 0, 0.04, 0), rgb(0xe8dcc0)); },
  // the brass cash register, the drawer below (its own, it slides), the sale flags on top (their own)
  register() {
    const parts = [paint(box(8, 4.4, 7, 0, 2.2, 0), BRASS), paint(box(7.6, 3.6, 4.2, 0, 6.2, -1.2), BRASS), paint(box(7.2, 1.5, 3.4, 0, 4.9, 2.2).rotateX(-0.5), rgb(0x8a6a2a))];
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) parts.push(paint(cyl(0.38, 0.38, 0.4, 10, -2.9 + k * 1.15, 5.1 + r * 0.45, 2.0 + r * 0.55).rotateX(0), CREAM));
    parts.push(paint(box(7.8, 0.4, 4.4, 0, 8.2, -1.2), rgb(0x8a6a2a)), paint(box(5.4, 1.6, 0.3, 0, 7.3, 0.95), rgb(0x1a1410)));
    return merge(parts);
  },
  drawer() { return merge([paint(box(7.6, 1.9, 6.4, 0, 1.0, 0), BRASS), paint(box(1.6, 0.4, 0.3, 0, 1.0, 3.3), CREAM)]); },
  flag() { return merge([paint(box(1.6, 1.3, 0.12, 0, 0.65, 0), CREAM), paint(box(0.14, 1.8, 0.14, 0, -0.6, 0), BLACK)]); },
  // a pool table: the green felt, the rails, the legs, a few balls, the lamp over it (its own)
  pool() {
    const parts = [paint(box(30, 1.2, 16, 0, 7.4, 0), rgb(0x1a6a3a)), paint(box(32, 2.0, 1.4, 0, 8.2, 8.6), WALNUT2), paint(box(32, 2.0, 1.4, 0, 8.2, -8.6), WALNUT2), paint(box(1.4, 2.0, 18.6, 15.8, 8.2, 0), WALNUT2), paint(box(1.4, 2.0, 18.6, -15.8, 8.2, 0), WALNUT2), paint(box(28, 4.0, 14, 0, 4.8, 0), WALNUT)];
    for (const [x, z] of [[-13, -6], [13, -6], [-13, 6], [13, 6]]) parts.push(paint(box(2.2, 3.2, 2.2, x, 1.6, z), WALNUT));
    const cols = [0xf0e8d0, 0xe8c020, 0x2040a0, 0xc82020, 0x5a2080, 0xe86a10, 0x186030, 0x101010];
    const R = seeded(8); cols.forEach((c, i) => parts.push(paint(sph(0.75, 1, 1, 1, (R() - 0.5) * 22, 8.75, (R() - 0.5) * 11, 12, 8), rgb(c))));
    parts.push(paint(new THREE.BoxGeometry(0.3, 0.3, 26).rotateY(0.3).translate(3, 8.6, 0), rgb(0xd8b878)));
    return merge(parts);
  },
  poolShade() { const g = new THREE.CylinderGeometry(3, 7.5, 3.4, 4, 1, true); g.rotateY(Math.PI / 4); g.scale(2.4, 1, 1); g.translate(0, 22, 0); return merge([paint(g, rgb(0x1a5a3a)), paint(box(0.12, 12, 0.12, 0, 29.6, 0), BLACK)]); },
  // the corner stage: a low riser, carpet on it
  riser() { return merge([paint(box(30, 2.6, 22, 0, 1.3, 0), rgb(0x2a1a14)), paint(box(29.6, 0.12, 21.6, 0, 2.66, 0), rgb(0x5a1a22))]); },
  // her mic stand, pushed aside: the base, the pole, the boom, the mic, the cable coiled at its foot
  micStand() {
    const parts = [paint(cyl(2.6, 2.8, 0.5, 20, 0, 0.25, 0), BLACK), paint(cyl(0.2, 0.2, 16, 8, 0, 8.2, 0), CHROME), paint(new THREE.BoxGeometry(0.25, 0.25, 7).rotateX(-0.35).translate(0, 17.2, 2.4), CHROME), paint(sph(0.8, 1, 1.2, 1, 0, 18.6, 5.6, 12, 10), rgb(0x9a9ca4)), paint(new THREE.CylinderGeometry(0.5, 0.4, 2.2, 10).rotateX(0.6).translate(0, 18.1, 5.2), BLACK)];
    for (let k = 0; k < 4; k++) parts.push(paint(new THREE.TorusGeometry(2.2 + k * 0.12, 0.16, 6, 28).rotateX(Math.PI / 2).translate(3.6, 0.3 + k * 0.32, 1.8), BLACK));
    return merge(parts);
  },
  // the jukebox: walnut cabinet with an arched top, chrome, the grille, the selector
  jukebox() {
    const sh = new THREE.Shape(); sh.moveTo(-6, 8); sh.lineTo(6, 8); sh.lineTo(6, 13); sh.absarc(0, 13, 6, 0, Math.PI, false); sh.lineTo(-6, 8);
    const top = new THREE.ExtrudeGeometry(sh, { depth: 7.6, bevelEnabled: false, curveSegments: 28 }); top.translate(0, 0, -3.8);
    const parts = [paint(box(12, 8, 7.6, 0, 4, 0), WALNUT), paint(top, WALNUT2), paint(box(12.6, 0.8, 8.2, 0, 0.4, 0), BLACK)];
    parts.push(paint(box(8.6, 5.4, 0.3, 0, 4.0, 3.85), rgb(0x2a1a12)));
    for (let k = 0; k < 6; k++) parts.push(paint(box(9.2, 0.26, 0.4, 0, 1.6 + k * 0.95, 4.05), CHROME));
    parts.push(paint(new THREE.TorusGeometry(6.05, 0.22, 6, 40, Math.PI).translate(0, 13, 3.9), CHROME));
    parts.push(paint(box(12.2, 0.4, 0.5, 0, 8.0, 3.95), CHROME));
    for (let k = 0; k < 10; k++) parts.push(paint(box(0.5, 0.45, 0.5, -3.4 + k * 0.76, 7.5, 4.05), CREAM));
    parts.push(paint(box(0.9, 1.4, 0.4, 4.6, 7.2, 4.0), CHROME), paint(box(0.12, 0.6, 0.45, 4.6, 7.3, 4.2), BLACK));
    parts.push(paint(sph(0.9, 1.2, 0.7, 0.8, 0, 19.2, 0, 14, 8), CHROME));
    return merge(parts);
  },
  // its lights: the rainbow arch, the two bubble tubes either side (the shader makes the colours run)
  jukeArch() {
    const a = new THREE.TorusGeometry(5.3, 0.5, 8, 40, Math.PI); a.translate(0, 13, 4.0);
    const b = new THREE.TorusGeometry(4.35, 0.32, 8, 36, Math.PI); b.translate(0, 13, 4.0);
    return merge([paint(a, rgb(0xff8a3a)), paint(b, rgb(0xffd23a))]);
  },
  jukeTubes() { return merge([paint(cyl(0.62, 0.62, 11.6, 14, -5.35, 7.4, 3.9), rgb(0xff5a2a)), paint(cyl(0.62, 0.62, 11.6, 14, 5.35, 7.4, 3.9), rgb(0xff5a2a))]); },
  jukeWindow() { const g = new THREE.CircleGeometry(3.85, 32, 0, Math.PI); g.translate(0, 13, 3.86); return paint(g, rgb(0x2a1408)); },
  record() { return merge([paint(cyl(1.7, 1.7, 0.12, 32, 0, 0, 0), rgb(0x0a0a0c)), paint(cyl(0.6, 0.6, 0.14, 20, 0, 0, 0), rgb(0xc8302a))]).rotateX(Math.PI / 2); },
  jukeStrips() { const g = new THREE.PlaneGeometry(9.6, 3.0); g.translate(0, 10.0, 3.87); return g; },
  // the crate it came in, on a hand truck at the curb
  crate() { return merge([paint(box(14, 22, 10, 0, 11.6, 0), rgb(0xffffff)), paint(box(15, 0.8, 11, 0, 0.4, 0), STEEL), paint(box(0.6, 26, 0.6, -6.6, 13, -6), STEEL), paint(box(0.6, 26, 0.6, 6.6, 13, -6), STEEL), paint(new THREE.CylinderGeometry(1.4, 1.4, 1, 14).rotateZ(Math.PI / 2).translate(-6, 1.4, -6.4), BLACK), paint(new THREE.CylinderGeometry(1.4, 1.4, 1, 14).rotateZ(Math.PI / 2).translate(6, 1.4, -6.4), BLACK)]); },
  // the banner they hung across the room: cloth, two ropes up to the ceiling
  banner() { return merge([paint(box(26, 8.4, 0.3, 0, 0, -0.3), rgb(0xf4ecd8)), ...[-12.5, 12.5].map((x) => paint(box(0.18, 30, 0.18, x, 19, -0.3), rgb(0x3a3028)))]); },
  // the lit letter board her lines go up on: a black box, the panel, the bulbs round it (glows)
  letterBoard() { return merge([paint(box(26, 9.6, 1.6, 0, 0, -1.0), BLACK), paint(box(27, 0.8, 2.0, 0, 5.0, -1.0), BRASS), paint(box(27, 0.8, 2.0, 0, -5.0, -1.0), BRASS), ...[-9, 9].map((x) => paint(box(0.14, 40, 0.14, x, 25, -1.0), rgb(0x2a2420)))]); },
  signFace(w, h) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); return g; },
  // a neon blade sign off the front of the building: the box, the bracket
  blade() { return merge([paint(box(2.2, 24, 6.6, 0, 0, 0), BLACK), paint(box(0.6, 0.6, 8, 0, 10, -5), STEEL), paint(box(0.6, 0.6, 8, 0, -10, -5), STEEL)]); },
  // the tip jar, as big as a building: the glass (its own, see-through), the coins in it, the label (its own)
  tipJar() { return merge([paint(cyl(7.6, 7.6, 9, 32, 0, 4.5, 0), rgb(0xd8a840)), paint(cyl(8.2, 8.0, 0.8, 32, 0, 0.4, 0), rgb(0xc8d8e0))]); },
  tipGlass() { const g = lathe([[7.9, 0], [8.2, 0.8], [8.3, 18], [7.4, 19.5], [7.4, 21.2], [8.0, 21.6], [7.0, 21.6], [6.9, 19.4]], 40); return paint(g, rgb(0xc8e0ff)); },
  tipLabel() { const g = new THREE.CylinderGeometry(8.36, 8.36, 6, 32, 1, true, -0.9, 1.8); g.translate(0, 11, 0); return g; },
  coin() { return merge([paint(cyl(1.2, 1.2, 0.18, 24, 0, 0, 0), rgb(0xc8ccd4)), paint(new THREE.TorusGeometry(1.15, 0.08, 4, 24).rotateX(Math.PI / 2), rgb(0xe8ecf4))]); },
};

// ---------- the stage ----------
export const STAGE = {
  // an amp stack: two cabinets and the head, the grille cloth, the brand plate
  amp() {
    const parts = [];
    for (const y of [0, 9.4]) { parts.push(paint(box(12, 9, 6.4, 0, y + 4.5, 0), BLACK), paint(box(10.6, 7.6, 0.2, 0, y + 4.5, 3.25), rgb(0x2a2420))); for (const [x, yy] of [[-2.6, 2.4], [2.6, 2.4], [-2.6, 6.4], [2.6, 6.4]]) parts.push(paint(new THREE.CylinderGeometry(2.0, 2.0, 0.2, 16).rotateX(Math.PI / 2).translate(x, y + yy, 3.3), rgb(0x16141a))); }
    parts.push(paint(box(12, 4.6, 5.6, 0, 21.1, -0.2), BLACK), paint(box(11, 1.2, 0.2, 0, 22.2, 2.65), rgb(0xd8c088)));
    for (let k = 0; k < 8; k++) parts.push(paint(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 8).rotateX(Math.PI / 2).translate(-4 + k * 1.15, 20.3, 2.75), CREAM));
    return merge(parts);
  },
  // a monitor wedge on the floor, angled up at where she'd stand
  wedge() { const g = new THREE.BoxGeometry(10, 5, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0 && p.getZ(i) > 0) p.setY(i, p.getY(i) - 4.2); g.translate(0, 2.5, 0); return merge([paint(g, BLACK), paint(box(8, 0.2, 2.6, 0, 3.1, 1.0).rotateX(-0.58), rgb(0x2a2a30))]); },
  // the house kit: the kick with the bar's name on it (its own face), toms, snare, cymbals
  kit() {
    const parts = [paint(new THREE.CylinderGeometry(5, 5, 4.4, 28).rotateX(Math.PI / 2).translate(0, 5, 0), rgb(0x8a1a22)), paint(new THREE.CylinderGeometry(4.6, 4.6, 4.5, 28).rotateX(Math.PI / 2).translate(0, 5, 0), CREAM)];
    for (const [x, y, z, r] of [[-3.4, 11.2, 1.0, 2.0], [3.4, 11.2, 1.0, 2.2], [7.6, 6.6, 2.4, 2.8]]) parts.push(paint(cyl(r, r, 2.6, 20, x, y, z), rgb(0x8a1a22)), paint(cyl(r * 1.02, r * 1.02, 0.2, 20, x, y + 1.35, z), CREAM));
    parts.push(paint(cyl(2.2, 2.2, 1.6, 20, -7.4, 8.4, 3.0), CHROME), paint(cyl(0.16, 0.16, 8.4, 6, -7.4, 4.2, 3.0), CHROME));
    for (const [x, y, z] of [[-9.6, 16, -1], [8.4, 17.6, -2.4], [0, 18.6, -4.6]]) parts.push(paint(cyl(4.2, 4.2, 0.12, 28, x, y, z), BRASS), paint(cyl(0.16, 0.16, y, 6, x, y / 2, z), CHROME));
    return merge(parts);
  },
  kickFace() { const g = new THREE.CircleGeometry(4.4, 28); g.translate(0, 5, 2.27); return g; },
  // a row of four-lamp blinders on a stand (the lamp faces are their own and flash)
  blinderStand() { return merge([paint(cyl(0.4, 0.4, 24, 8, 0, 12, 0), STEEL), paint(cyl(3, 3.2, 0.5, 16, 0, 0.25, 0), STEEL), paint(box(13, 6.4, 3, 0, 26, 0), BLACK)]); },
  blinderLamps() { const parts = []; for (const [x, y] of [[-3.1, 27.6], [3.1, 27.6], [-3.1, 24.4], [3.1, 24.4]]) { const g = new THREE.CircleGeometry(1.35, 18); g.translate(x, y, 1.55); parts.push(paint(g, rgb(0xfff4d8))); } return merge(parts); },
  // the desk: channel strips, the faders (their own, they slide up)
  desk() { const g = new THREE.BoxGeometry(34, 4, 14); const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0 && p.getZ(i) < 0) p.setY(i, p.getY(i) + 3); g.rotateY(0); g.translate(0, 9, 0); return merge([paint(g, rgb(0x2a2c34)), paint(box(30, 7, 10, 0, 3.5, 0), rgb(0x1a1a20)), ...[...Array(12)].map((_, k) => paint(new THREE.BoxGeometry(0.3, 0.12, 9).rotateX(-0.2).translate(-13.2 + k * 2.4, 12.6, 0), rgb(0x0a0a0c)))]); },
  fader() { return merge([paint(box(1.6, 1.1, 1.0, 0, 0, 0), rgb(0xe8e4dc)), paint(box(1.7, 0.2, 1.05, 0, 0.1, 0), rgb(0xd8302a))]); },
  // the vintage mic on its stand with her kiss on the grille (the print is its own)
  bigMic() {
    const g = new THREE.CapsuleGeometry(3.4, 4.6, 8, 20); g.translate(0, 46, 0);
    return merge([paint(cyl(5, 5.4, 0.8, 24, 0, 0.4, 0), BLACK), paint(cyl(0.45, 0.45, 38, 10, 0, 19.4, 0), CHROME), paint(g, CHROME), paint(cyl(3.5, 3.5, 0.6, 24, 0, 43.2, 0), rgb(0x9a9ca4)), paint(cyl(3.5, 3.5, 0.6, 24, 0, 48.8, 0), rgb(0x9a9ca4)), ...[...Array(7)].map((_, k) => paint(new THREE.TorusGeometry(3.45, 0.12, 4, 24).rotateX(Math.PI / 2).translate(0, 43.8 + k * 0.7, 0), rgb(0x6a6c74)))]);
  },
  kiss() {
    const sh = new THREE.Shape(); sh.moveTo(-2.4, 0); sh.bezierCurveTo(-1.6, 1.4, -0.6, 1.3, 0, 0.7); sh.bezierCurveTo(0.6, 1.3, 1.6, 1.4, 2.4, 0); sh.bezierCurveTo(1.2, -1.6, -1.2, -1.6, -2.4, 0);
    const g = new THREE.ShapeGeometry(sh, 12); g.scale(1, 1, 1); g.translate(0, 46.4, 3.62); return paint(g, rgb(0xd8102a));
  },
  // the encore sign: a lightbox on a pole (the face is from the sign sheet)
  encoreBox() { return merge([paint(box(18, 6, 2, 0, 0, -1.1), BLACK), paint(cyl(0.4, 0.4, 30, 8, 0, -18, -1.1), STEEL)]); },
  // the tab hung up like a banner: a long strip of paper (its texture), the clip at the top
  tab() { const g = new THREE.PlaneGeometry(9, 36, 1, 12); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getY(i) * 0.18) * 1.2); g.translate(0, -18, 0); return g; },
  tabClip() { return merge([paint(box(9.6, 1.6, 1.2, 0, 0.6, 0), BRASS), paint(box(0.16, 40, 0.16, 0, 20.8, 0), rgb(0x2a2420))]); },
};

// ---------- after close ----------
export const AFTER = {
  // a table with its chairs upside down on it
  chairsUp() {
    const parts = [paint(cyl(5, 5, 0.6, 24, 0, 7.4, 0), WALNUT2), paint(cyl(0.6, 0.8, 7, 10, 0, 3.6, 0), STEEL), paint(cyl(2.8, 3.0, 0.4, 16, 0, 0.2, 0), STEEL)];
    for (const a of [0.3, 1.9, 3.5, 5.1]) {
      const c = [paint(box(4.2, 0.5, 4.2, 0, 0, 0), WALNUT), ...[[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].map(([x, z]) => paint(box(0.4, 5.2, 0.4, x, 2.8, z), WALNUT)), paint(box(4.2, 4.4, 0.4, 0, -2.4, -2.0), WALNUT)];
      for (const g of c) { g.rotateY(-(a + Math.PI / 2)); g.translate(Math.cos(a) * 3.2, 8.0, Math.sin(a) * 3.2); }
      parts.push(...c);
    }
    return merge(parts);
  },
  // a tall stack of the same chairs
  chairStack() {
    const parts = [];
    for (let k = 0; k < 7; k++) {
      const y = k * 1.6, jog = (k % 2) * 0.25;
      parts.push(paint(box(4.4, 0.5, 4.4, jog, y + 5, 0), WALNUT), paint(box(4.4, 5.0, 0.4, jog, y + 7.6, -2.0), WALNUT));
      if (k === 0) for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) parts.push(paint(box(0.4, 5, 0.4, x, 2.5, z), WALNUT));
    }
    return merge(parts);
  },
  // cables coiled on the floor: orange and black, loops piled
  coil() { const parts = []; const R = seeded(3); for (let k = 0; k < 9; k++) parts.push(paint(new THREE.TorusGeometry(3.4 + R() * 0.8, 0.3, 6, 32).rotateX(Math.PI / 2 + (R() - 0.5) * 0.3).translate((R() - 0.5) * 0.6, 0.35 + k * 0.42, (R() - 0.5) * 0.6), k % 3 === 0 ? rgb(0x1a1a1e) : rgb(0xe86a1a))); return merge(parts); },
  // the stairs up to the office: treads, risers, the banister, the posts
  stairs() {
    const parts = [];
    for (let k = 0; k < 12; k++) { parts.push(paint(box(10, 0.6, 4.2, 0, 2.2 + k * 2.2, -k * 3.6), WALNUT2), paint(box(10, 2.2, 0.4, 0, 1.1 + k * 2.2, -k * 3.6 + 2.0), WALNUT)); }
    parts.push(paint(box(10, 26.4, 2, 0, 13.2, -42), WALNUT));
    const rail = box(0.5, 0.5, 46, 0, 0, 0); rail.rotateX(Math.atan2(2.2, 3.6)); rail.translate(4.9, 18, -19); parts.push(paint(rail, BRASS));
    for (let k = 0; k < 12; k += 2) parts.push(paint(box(0.3, 6, 0.3, 4.9, 5.4 + k * 2.2, -k * 3.6), BRASS));
    return merge(parts);
  },
  setlist() { const g = new THREE.PlaneGeometry(3, 4.2); g.rotateX(-0.06); g.translate(0, 3.6 + 2 * 2.2, -2 * 3.6 + 2.26); return g; },
  // the back door, open: the frame, the door swung out, the exit sign over it (its face lit)
  backDoor() { return merge([paint(box(1.4, 24, 2, -6.6, 12, 0), STEEL), paint(box(1.4, 24, 2, 6.6, 12, 0), STEEL), paint(box(14.6, 1.6, 2, 0, 24.8, 0), STEEL), paint(box(12, 22.4, 0.8, 0, 11.6, 0).translate(-6, 0, 0).rotateY(-1.9).translate(6.2, 0, 0.6), rgb(0x5a6068)), paint(box(6, 2.6, 1, 0, 28.2, 0.3), BLACK)]); },
  backLight() { const g = new THREE.PlaneGeometry(12.2, 22.8); g.translate(0, 11.6, -0.4); return g; },
  exitFace() { const g = new THREE.PlaneGeometry(5.2, 1.9); g.translate(0, 28.2, 0.85); return g; },
  // the tabs left open for the ghosts: a corkboard, papers pinned all over it
  tabsBoard() { const parts = [paint(box(24, 16, 0.8, 0, 0, 0), rgb(0x8a6a44)), paint(box(25, 17, 0.6, 0, 0, -0.3), WALNUT)]; const R = seeded(12); for (let k = 0; k < 34; k++) { const g = box(2.4 + R(), 4 + R() * 1.6, 0.1, (R() - 0.5) * 20, (R() - 0.5) * 12, 0.5); g.rotateZ((R() - 0.5) * 0.3); parts.push(paint(g, rgb(R() < 0.8 ? 0xf4ecd8 : 0xf0d870))); } return merge(parts); },
};

// ---------- the ghosts of every house band: their gear, carried out the back door ----------
export const GHOST = {
  amp() { return merge([box(9, 8, 5, 0, 4, 0), box(9, 3.4, 4.4, 0, 9.8, 0)]); },
  case() { const sh = new THREE.Shape(); sh.moveTo(0, -6); sh.bezierCurveTo(3.4, -6, 3.6, -1, 2.2, 0.6); sh.bezierCurveTo(2.8, 2.4, 2.2, 4, 1.2, 4.4); sh.lineTo(1.0, 8.6); sh.lineTo(-1.0, 8.6); sh.lineTo(-1.2, 4.4); sh.bezierCurveTo(-2.2, 4, -2.8, 2.4, -2.2, 0.6); sh.bezierCurveTo(-3.6, -1, -3.4, -6, 0, -6); const g = new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 6.4, -0.8); return g; },
  drum() { return merge([new THREE.CylinderGeometry(3.6, 3.6, 3.2, 20).rotateX(Math.PI / 2).translate(0, 3.6, 0), cyl(2.2, 2.2, 2.4, 16, 4.6, 6.4, 0)]); },
  stand() { return merge([cyl(1.8, 2.0, 0.4, 14, 0, 0.2, 0), cyl(0.18, 0.18, 12, 6, 0, 6.2, 0), cyl(0.5, 0.4, 1.6, 8, 0, 12.6, 0)]); },
};
