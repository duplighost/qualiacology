// Canvas paint for the house in your head: her kiss, crack networks, damask, the flats (wainscot, paper,
// painted light), the floors that roll out (sunburst parquet, walnut boards, crawlspace concrete, the
// blueprint), her portraits, your brass plaques, the MINE medallion, stitched samplers, stencils, the lease.
import * as THREE from 'three';

export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
export function tex(c, { srgb = true, repeat = null, aniso = 8, mips = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = aniso; t.generateMipmaps = mips;
  return t;
}
export const C = {
  lilac: '#c86aff', lilacDeep: '#8e3fd0', gold: '#e9b949', kiss: '#c0102a', walnut: '#5a3a26', brass: '#b8893c',
  pistachio: '#bfe3cf', blush: '#f4c9cf', wainscot: '#f3eee6', teal: '#2f7f7a', marbleA: '#f2c6ce', marbleB: '#fbf1e6',
};
const cache = new Map();
const once = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };

// ---------------------------------------------------------------------------------------------- her kiss
export function kissTexture() {
  return once('kiss', () => {
    const N = 256, [c, g] = canvas(N, N), R = rng(3);
    g.translate(N / 2, N / 2);
    const lip = (top) => {
      g.beginPath();
      if (top) { g.moveTo(-96, 6); g.bezierCurveTo(-70, -40, -30, -58, -6, -26); g.quadraticCurveTo(0, -20, 6, -26); g.bezierCurveTo(30, -58, 70, -40, 96, 6); g.quadraticCurveTo(0, -4, -96, 6); }
      else { g.moveTo(-92, 12); g.quadraticCurveTo(0, 6, 92, 12); g.bezierCurveTo(70, 70, -70, 70, -92, 12); }
      g.closePath();
    };
    g.fillStyle = C.kiss; lip(true); g.fill(); lip(false); g.fill();
    // the creases of a real print: fine radial lines, the paper showing through
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 70; i++) {
      const x = -88 + i * 2.55 + R() * 1.5, top = R() < 0.5;
      g.strokeStyle = `rgba(0,0,0,${0.25 + R() * 0.45})`; g.lineWidth = 0.8 + R() * 1.4;
      g.beginPath(); g.moveTo(x, top ? -2 : 18); g.lineTo(x * 0.92 + (R() - 0.5) * 6, top ? -30 - R() * 20 : 44 + R() * 16); g.stroke();
    }
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.9)'; g.beginPath(); g.moveTo(-90, 9); g.quadraticCurveTo(0, 3, 90, 9); g.stroke();
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.5})`; g.beginPath(); g.arc((R() - 0.5) * 190, (R() - 0.5) * 90, R() * 3, 0, 7); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    return tex(c);
  });
}

// ---------------------------------------------------------------------------------------------- cracks
// a crack network on a transparent tile: dark violet hairlines with a pale bisque rim
export function crackTexture(level = 1) {
  return once('crack' + level, () => {
    const N = 512, [c, g] = canvas(N, N), R = rng(17 + level * 31);
    const branch = (x, y, a, len, w, depth) => {
      const segs = 6 + (R() * 6 | 0); const pts = [[x, y]];
      for (let i = 0; i < segs; i++) { a += (R() - 0.5) * 0.9; x += Math.cos(a) * len / segs; y += Math.sin(a) * len / segs; pts.push([x, y]); }
      for (const [col, lw] of [['rgba(255,253,248,0.95)', w + 2.2], ['rgba(40,10,46,0.95)', w]]) { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.stroke(); }
      if (depth > 0) for (let k = 0; k < 2; k++) { const p = pts[2 + (R() * (pts.length - 3) | 0)]; branch(p[0], p[1], a + (R() < 0.5 ? 1 : -1) * (0.6 + R() * 0.8), len * 0.55, w * 0.7, depth - 1); }
    };
    const n = 2 + level * 2;
    for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2; branch(N / 2 + (R() - 0.5) * 120, N / 2 + (R() - 0.5) * 120, a, 160 + R() * 120 + level * 40, 1.6 + level * 0.5, 2); }
    return tex(c);
  });
}

// ---------------------------------------------------------------------------------------------- damask
function damaskMotif(g, cx, cy, s, ink, alpha = 1) {
  g.save(); g.translate(cx, cy); g.scale(s, s); g.globalAlpha = alpha; g.fillStyle = ink;
  for (const m of [1, -1]) {
    g.save(); g.scale(m, 1);
    g.beginPath(); g.moveTo(0, -1); g.bezierCurveTo(0.35, -0.75, 0.55, -0.35, 0.18, -0.1); g.bezierCurveTo(0.45, -0.05, 0.62, 0.25, 0.32, 0.4);
    g.bezierCurveTo(0.2, 0.55, 0.08, 0.7, 0, 1); g.lineTo(0, -1); g.fill();
    g.beginPath(); g.ellipse(0.5, -0.55, 0.12, 0.22, 0.6, 0, 7); g.fill();
    g.beginPath(); g.ellipse(0.62, 0.15, 0.09, 0.18, -0.5, 0, 7); g.fill();
    g.beginPath(); g.ellipse(0.28, 0.75, 0.07, 0.14, 0.4, 0, 7); g.fill();
    g.restore();
  }
  g.globalAlpha = 1; g.restore();
}
export function damaskCanvas(base, ink, N = 512, { shade = 0.0, stripe = false } = {}) {
  const [c, g] = canvas(N, N);
  g.fillStyle = base; g.fillRect(0, 0, N, N);
  if (stripe) { g.fillStyle = ink; g.globalAlpha = 0.16; for (let x = 0; x < N; x += N / 8) g.fillRect(x, 0, N / 32, N); g.globalAlpha = 1; }
  const s = N * 0.21;
  for (const [x, y] of [[0.25, 0.25], [0.75, 0.75]]) damaskMotif(g, x * N, y * N, s, ink, 0.55);
  for (const [x, y] of [[0.75, 0.25], [0.25, 0.75]]) damaskMotif(g, x * N, y * N, s * 0.45, ink, 0.32);
  // wrap the edge motifs
  for (const [x, y] of [[0.25 + 1, 0.25], [0.25, 0.25 + 1], [-0.25, 0.75], [0.75, -0.25]]) damaskMotif(g, x * N, y * N, s, ink, 0.55);
  if (shade) { g.fillStyle = `rgba(0,0,0,${shade})`; g.fillRect(0, 0, N, N); }
  return c;
}

// ---------------------------------------------------------------------------------------------- the flats
// One flat's inner face: wallpaper above a white wainscot (panels, chair rail, skirting), the crown band at the
// top, painted light (darker toward the floor's corners and up under the flies). w, h in metres.
export function flatTexture({ w, h, paper = C.pistachio, ink = '#9ccbb5', wain = C.wainscot, wainH = 1.1, ppm = 64, panel = 1.6, dark = 0.0, stripe = false, slope = null, seed = 1 } = {}) {
  const W = Math.min(2048, Math.round(w * ppm)), H = Math.min(1024, Math.round(h * ppm));
  const sx = W / w, sy = H / h;
  const [c, g] = canvas(W, H), R = rng(seed);
  const tile = damaskCanvas(paper, ink, 256, { stripe });
  const pat = g.createPattern(tile, 'repeat');
  const m = new DOMMatrix(); m.scaleSelf(0.62 * sx / 256 * 1.0, 0.62 * sy / 256);
  pat.setTransform(m);
  g.fillStyle = pat; g.fillRect(0, 0, W, H);
  // the wainscot
  const yW = H - wainH * sy;
  g.fillStyle = wain; g.fillRect(0, yW, W, H - yW);
  const n = Math.max(1, Math.round(w / panel)), pw = W / n;
  for (let i = 0; i < n; i++) {
    const x0 = i * pw + pw * 0.12, x1 = (i + 1) * pw - pw * 0.12, y0 = yW + 0.16 * sy, y1 = H - 0.22 * sy;
    g.strokeStyle = 'rgba(120,100,90,0.35)'; g.lineWidth = 3; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5; g.strokeRect(x0 + 3, y0 + 3, x1 - x0, y1 - y0);
  }
  g.fillStyle = '#e8dccb'; g.fillRect(0, yW - 0.05 * sy, W, 0.07 * sy);            // chair rail
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(0, yW - 0.05 * sy, W, 0.015 * sy);
  g.fillStyle = '#5a3a26'; g.fillRect(0, H - 0.13 * sy, W, 0.13 * sy);              // walnut skirting
  g.fillStyle = 'rgba(255,220,170,0.25)'; g.fillRect(0, H - 0.13 * sy, W, 0.02 * sy);
  // painted light: the floor's corners darker, the top falling off into the flies
  let gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, `rgba(30,10,40,${0.55 + dark * 0.3})`); gr.addColorStop(0.35, `rgba(30,10,40,${0.12 + dark * 0.3})`); gr.addColorStop(0.8, `rgba(30,10,40,${dark * 0.3})`); gr.addColorStop(1, `rgba(20,8,20,${0.25 + dark * 0.3})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  gr = g.createLinearGradient(0, 0, W, 0);
  gr.addColorStop(0, 'rgba(20,6,30,0.22)'); gr.addColorStop(0.08, 'rgba(20,6,30,0)'); gr.addColorStop(0.92, 'rgba(20,6,30,0)'); gr.addColorStop(1, 'rgba(20,6,30,0.22)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // age: faint water marks
  for (let i = 0; i < 6; i++) { const x = R() * W, y = R() * yW * 0.8; const rg = g.createRadialGradient(x, y, 0, x, y, 60 + R() * 90); rg.addColorStop(0, 'rgba(90,60,40,0.06)'); rg.addColorStop(1, 'rgba(90,60,40,0)'); g.fillStyle = rg; g.fillRect(x - 160, y - 160, 320, 320); }
  if (slope) { g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(slope[0] * sx, 0); g.lineTo(slope[1] * sx, H - slope[2] * sy); g.lineTo(slope[1] * sx, 0); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over'; }
  return tex(c);
}

// ---------------------------------------------------------------------------------------------- the floors
// floor-space canvases: x -11..11 -> 0..W, z -7..7 -> 0..H (z = -7 is the top row, the back wall)
export const FLOOR = { x0: -11.6, x1: 11.6, z0: -7.6, z1: 7.6 };
function floorCanvas(N = 2048) {
  const W = N, H = Math.round(N * (FLOOR.z1 - FLOOR.z0) / (FLOOR.x1 - FLOOR.x0));
  const [c, g] = canvas(W, H);
  const px = (x) => (x - FLOOR.x0) / (FLOOR.x1 - FLOOR.x0) * W, pz = (z) => (z - FLOOR.z0) / (FLOOR.z1 - FLOOR.z0) * H;
  return { c, g, W, H, px, pz, ppm: W / (FLOOR.x1 - FLOOR.x0) };
}
export function parquetTexture() {
  return once('parquet', () => {
    const F = floorCanvas(2048), { g, W, H, px, pz } = F, R = rng(5);
    const cx = px(0), cy = pz(-0.5);
    const rays = 48;
    for (let i = 0; i < rays; i++) {
      const a0 = i / rays * Math.PI * 2, a1 = (i + 1) / rays * Math.PI * 2;
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, W * 1.2, a0, a1); g.closePath();
      const light = i % 2 === 0;
      g.fillStyle = light ? '#c9955e' : '#7a4a2c'; g.fill();
      // grain along the ray
      g.save(); g.clip();
      for (let k = 0; k < 60; k++) { const rr = R() * W * 0.9, aa = a0 + R() * (a1 - a0); g.strokeStyle = `rgba(${light ? '90,55,25' : '30,15,8'},${0.12 + R() * 0.15})`; g.lineWidth = 1 + R() * 2; g.beginPath(); g.moveTo(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr); g.lineTo(cx + Math.cos(aa) * (rr + 40 + R() * 90), cy + Math.sin(aa) * (rr + 40 + R() * 90)); g.stroke(); }
      g.restore();
    }
    // rings of maple and a gilt medallion at the heart
    for (const [r, w, col] of [[F.ppm * 1.1, 6, '#e9c88f'], [F.ppm * 1.25, 3, '#b8893c'], [F.ppm * 4.0, 5, '#e9c88f'], [F.ppm * 4.12, 2, '#b8893c'], [F.ppm * 7.8, 7, '#e9c88f']]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); }
    g.fillStyle = '#3f2616'; g.beginPath(); g.arc(cx, cy, F.ppm * 1.05, 0, 7); g.fill();
    g.fillStyle = '#b8893c'; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - 0.12) * F.ppm * 0.95, cy + Math.sin(a - 0.12) * F.ppm * 0.95); g.lineTo(cx + Math.cos(a) * F.ppm * 1.02, cy + Math.sin(a) * F.ppm * 1.02); g.lineTo(cx + Math.cos(a + 0.12) * F.ppm * 0.95, cy + Math.sin(a + 0.12) * F.ppm * 0.95); g.fill(); }
    // a walnut border round the room
    g.strokeStyle = '#4a2c1a'; g.lineWidth = F.ppm * 0.6; g.strokeRect(px(-11) + F.ppm * 0.3, pz(-7) + F.ppm * 0.3, px(11) - px(-11) - F.ppm * 0.6, pz(7) - pz(-7) - F.ppm * 0.6);
    g.strokeStyle = '#e9c88f'; g.lineWidth = 4; g.strokeRect(px(-11) + F.ppm * 0.62, pz(-7) + F.ppm * 0.62, px(11) - px(-11) - F.ppm * 1.24, pz(7) - pz(-7) - F.ppm * 1.24);
    // polish: a faint sheen variation
    for (let i = 0; i < 30; i++) { const x = R() * W, y = R() * H, r = 80 + R() * 200; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(255,240,220,0.035)'); rg.addColorStop(1, 'rgba(255,240,220,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
    return tex(F.c);
  });
}
export function boardsTexture(tint = '#5a3a26', { rug = null } = {}) {
  return once('boards' + tint + (rug ? 'r' : ''), () => {
    const F = floorCanvas(2048), { g, W, H, px, pz, ppm } = F, R = rng(9);
    const bw = 0.19 * ppm;
    for (let y = 0; y < H; y += bw) {
      let x = -R() * 300;
      while (x < W) {
        const len = (1.6 + R() * 2.4) * ppm; const l = 0.75 + R() * 0.4;
        const base = new THREE.Color(tint).multiplyScalar(l);
        g.fillStyle = `#${base.getHexString()}`; g.fillRect(x, y, len, bw);
        for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(20,10,4,${0.12 + R() * 0.15})`; g.lineWidth = 1 + R(); const yy = y + R() * bw; g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + len * 0.3, yy + (R() - 0.5) * 6, x + len * 0.6, yy + (R() - 0.5) * 6, x + len, yy); g.stroke(); }
        g.fillStyle = 'rgba(10,5,2,0.7)'; g.fillRect(x + len - 2, y, 2, bw);
        x += len;
      }
      g.fillStyle = 'rgba(10,5,2,0.6)'; g.fillRect(0, y, W, 2);
    }
    if (rug) {
      const [rx, rz, rw, rd, col, ink] = rug;
      const x0 = px(rx - rw / 2), y0 = pz(rz - rd / 2), x1 = px(rx + rw / 2), y1 = pz(rz + rd / 2);
      g.fillStyle = col; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.strokeStyle = ink; g.lineWidth = ppm * 0.12; g.strokeRect(x0 + ppm * 0.2, y0 + ppm * 0.2, x1 - x0 - ppm * 0.4, y1 - y0 - ppm * 0.4);
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${R() * 0.05})`; g.fillRect(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), 3, 3); }
    }
    return tex(F.c);
  });
}
export function concreteTexture() {
  return once('concrete', () => {
    const F = floorCanvas(1024), { g, W, H, ppm } = F, R = rng(21);
    g.fillStyle = '#4b4248'; g.fillRect(0, 0, W, H);
    const img = g.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = (R() - 0.5) * 26; d[i] += v; d[i + 1] += v * 0.95; d[i + 2] += v * 1.05; }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 40; i++) { const x = R() * W, y = R() * H, r = 30 + R() * 120; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(${R() < 0.5 ? '20,15,20' : '120,100,90'},0.18)`); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.strokeStyle = 'rgba(15,10,15,0.5)'; g.lineWidth = 2;
    for (let x = 0; x < W; x += 3 * ppm) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    return tex(F.c);
  });
}
// the blueprint: Prussian blue paper and white lines (the house drawn as a plan)
export function blueprintTexture() {
  return once('blueprint', () => {
    const F = floorCanvas(2048), { g, W, H, px, pz, ppm } = F, R = rng(33);
    g.fillStyle = '#12306b'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(170,210,255,0.13)'; g.lineWidth = 1;
    for (let x = 0; x < W; x += ppm * 0.5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += ppm * 0.5) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = 'rgba(221,243,255,0.85)'; g.lineWidth = 4;
    g.strokeRect(px(-11), pz(-7), px(11) - px(-11), pz(7) - pz(-7));
    g.lineWidth = 2.5;
    // rooms of the house, drawn as a plan
    for (const [x0, z0, x1, z1] of [[-11, -7, -3, -1], [-3, -7, 3, -1], [3, -7, 11, -1], [-11, -1, -4, 7], [4, -1, 11, 7]]) g.strokeRect(px(x0), pz(z0), px(x1) - px(x0), pz(z1) - pz(z0));
    // door swings
    for (const [x, z, r, a0] of [[-3, -3, 1.0, 0], [3, -3, 1.0, Math.PI], [-6, -1, 0.9, Math.PI / 2], [7, -1, 0.9, Math.PI / 2]]) { g.beginPath(); g.arc(px(x), pz(z), r * ppm, a0, a0 + Math.PI / 2); g.stroke(); }
    g.font = `600 ${ppm * 0.32}px "Space Grotesk", sans-serif`; g.fillStyle = 'rgba(221,243,255,0.75)'; g.textAlign = 'center';
    for (const [t, x, z] of [['FOYER', -7, -4], ['GALLERY', 0, -4], ['BALLROOM', 7, -4], ['BEDROOM', -7.5, 3], ['PARLOUR', 7.5, 3], ['HALL', 0, 3.2]]) g.fillText(t, px(x), pz(z));
    // dimension ticks
    g.lineWidth = 1.5; for (let i = -11; i <= 11; i++) { g.beginPath(); g.moveTo(px(i), pz(7) - 10); g.lineTo(px(i), pz(7) - 22); g.stroke(); }
    for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(255,255,255,${R() * 0.04})`; g.fillRect(R() * W, R() * H, 2, 2); }
    return tex(F.c);
  });
}

// ---------------------------------------------------------------------------------------------- her portrait
// her painted self: champagne bouffant, blush porcelain, violet eyes, cherry lips, the lilac housecoat, pearls
export function portraitCanvas({ eyes = 'open', glow = 0, empty = false, lying = false } = {}) {
  const W = 512, H = 670, [c, g] = canvas(W, H);
  const bg = g.createRadialGradient(W / 2, H * 0.42, 20, W / 2, H * 0.5, H * 0.7);
  bg.addColorStop(0, '#f6d6ee'); bg.addColorStop(0.55, '#c98fd8'); bg.addColorStop(1, '#5a2a6e');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (empty) return c;
  g.save(); if (lying) { g.translate(W / 2, H / 2); g.scale(0.9, 0.9); g.translate(-W / 2, -H / 2); }
  // shoulders: the housecoat
  g.fillStyle = '#b058f0'; g.beginPath(); g.moveTo(40, H); g.bezierCurveTo(60, 470, 160, 440, 256, 440); g.bezierCurveTo(352, 440, 452, 470, 472, H); g.fill();
  g.fillStyle = '#8e3fd0'; g.beginPath(); g.moveTo(256, 470); g.lineTo(196, H); g.lineTo(316, H); g.closePath(); g.fill();
  g.strokeStyle = '#e9b949'; g.lineWidth = 12; g.beginPath(); g.moveTo(170, 450); g.lineTo(256, 600); g.lineTo(342, 450); g.stroke();
  g.fillStyle = '#f7e4df'; g.beginPath(); g.moveTo(196, 452); g.lineTo(256, 582); g.lineTo(316, 452); g.closePath(); g.fill();
  // neck and pearls
  g.fillStyle = '#f3d6cf'; g.fillRect(222, 360, 68, 100);
  g.fillStyle = '#fff6ee'; for (let s = 0; s < 3; s++) for (let i = 0; i < 13; i++) { const a = Math.PI * (0.15 + 0.7 * i / 12); g.beginPath(); g.arc(256 - Math.cos(a) * (40 + s * 8), 400 + s * 13 + Math.sin(a) * 16, 6, 0, 7); g.fill(); }
  // hair: the perfect set, a champagne bouffant
  const hairG = g.createLinearGradient(0, 70, 0, 380); hairG.addColorStop(0, '#fbf0d4'); hairG.addColorStop(1, '#c9b27e');
  g.fillStyle = hairG; g.beginPath(); g.ellipse(256, 200, 168, 150, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(96, 230); g.bezierCurveTo(70, 330, 110, 380, 150, 360); g.lineTo(170, 260); g.fill();
  g.beginPath(); g.moveTo(416, 230); g.bezierCurveTo(442, 330, 402, 380, 362, 360); g.lineTo(342, 260); g.fill();
  // face
  g.fillStyle = '#f7e4df'; g.beginPath(); g.ellipse(256, 270, 96, 122, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(242,150,165,0.35)'; for (const x of [200, 312]) { g.beginPath(); g.ellipse(x, 300, 30, 18, 0, 0, 7); g.fill(); }
  // fringe swoop
  g.fillStyle = hairG; g.beginPath(); g.moveTo(150, 210); g.bezierCurveTo(200, 120, 330, 110, 372, 200); g.bezierCurveTo(330, 160, 240, 170, 150, 210); g.fill();
  // eyes: lilac shadow, winged liner, violet irises
  for (const [x, s] of [[214, -1], [298, 1]]) {
    g.fillStyle = 'rgba(160,100,210,0.55)'; g.beginPath(); g.ellipse(x, 252, 30, 16, 0, Math.PI, 0); g.fill();
    if (eyes === 'closed') { g.strokeStyle = '#120a10'; g.lineWidth = 5; g.beginPath(); g.arc(x, 252, 22, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    else {
      g.fillStyle = '#fffaf6'; g.beginPath(); g.ellipse(x, 262, 22, eyes === 'wide' ? 15 : 11, 0, 0, 7); g.fill();
      g.fillStyle = glow > 0 ? `rgb(${180 + glow * 60},${120 + glow * 80},255)` : '#6b3fa0'; g.beginPath(); g.arc(x, 263, 9.5, 0, 7); g.fill();
      g.fillStyle = '#0b0610'; g.beginPath(); g.arc(x, 263, 4, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + 3, 259, 2.5, 0, 7); g.fill();
      g.strokeStyle = '#120a10'; g.lineWidth = 5; g.beginPath(); g.ellipse(x, 262, 23, eyes === 'wide' ? 15 : 11, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    }
    g.strokeStyle = '#120a10'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + s * 22, 256); g.lineTo(x + s * 38, 244); g.stroke();
    g.strokeStyle = '#2a1712'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(x - 24, 228 - (s > 0 ? 6 : 0)); g.quadraticCurveTo(x, 212 - (s > 0 ? 8 : 0), x + 26, 226 - (s > 0 ? 4 : 0)); g.stroke();
  }
  // the smile: cherry red, a full cupid's bow, the beauty mark
  g.fillStyle = glow > 0 ? `rgb(255,${60 + glow * 120},${90 + glow * 120})` : '#c0102a';
  g.beginPath(); g.moveTo(222, 330); g.quadraticCurveTo(240, 318, 256, 326); g.quadraticCurveTo(272, 318, 290, 330); g.quadraticCurveTo(256, 356, 222, 330); g.fill();
  g.fillStyle = '#2a1712'; g.beginPath(); g.arc(300, 318, 3, 0, 7); g.fill();
  g.restore();
  // varnish: a soft glaze sheen and the craquelure of an old oil
  const sh = g.createLinearGradient(0, 0, W, H); sh.addColorStop(0, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(40,0,40,0.25)');
  g.fillStyle = sh; g.fillRect(0, 0, W, H);
  return c;
}
export function portraitTexture(o = {}) { const key = 'portrait' + JSON.stringify(o); return once(key, () => tex(portraitCanvas(o))); }

// a tiny painted figure of her, for the frame-walk (she walks through her canvases)
export function paintedFigureTexture() {
  return once('figure', () => {
    const W = 128, H = 256, [c, g] = canvas(W, H);
    g.fillStyle = '#f0e2c0'; g.beginPath(); g.ellipse(64, 40, 26, 24, 0, 0, 7); g.fill();
    g.fillStyle = '#f7e4df'; g.beginPath(); g.ellipse(64, 52, 15, 18, 0, 0, 7); g.fill();
    g.fillStyle = '#c86aff'; g.beginPath(); g.moveTo(40, 80); g.lineTo(88, 80); g.lineTo(104, 230); g.lineTo(24, 230); g.closePath(); g.fill();
    g.fillStyle = '#e9b949'; g.fillRect(44, 128, 40, 7);
    g.fillStyle = '#f7e4df'; g.fillRect(34, 230, 16, 18); g.fillRect(78, 230, 16, 18);
    g.fillStyle = '#c0102a'; g.beginPath(); g.ellipse(64, 60, 5, 2.5, 0, 0, 7); g.fill();
    return tex(c);
  });
}

// ---------------------------------------------------------------------------------------------- yours: brass, linen, paper
export function plaqueTexture(text) {
  return once('plaque' + text, () => {
    const W = 512, H = 170, [c, g] = canvas(W, H);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#d9ad5c'); gr.addColorStop(0.5, '#b8893c'); gr.addColorStop(1, '#8a6224');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#6e4a18'; g.lineWidth = 6; g.strokeRect(10, 10, W - 20, H - 20);
    g.fillStyle = '#fff1c8'; for (const [x, y] of [[26, 26], [W - 26, 26], [26, H - 26], [W - 26, H - 26]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
    let fs = 70; g.font = `900 ${fs}px "Archivo Black", Arial Black, sans-serif`;
    while (g.measureText(text).width > W - 90 && fs > 20) { fs -= 2; g.font = `900 ${fs}px "Archivo Black", Arial Black, sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#4a2f0c'; g.fillText(text, W / 2, H / 2 + 3);
    g.fillStyle = 'rgba(255,240,200,0.5)'; g.fillText(text, W / 2 - 1, H / 2 + 1);
    return tex(c);
  });
}
// the MINE medallion: lilac porcelain inlay, MINE in gold script, her kiss
export function medallionTexture() {
  return once('mine', () => {
    const N = 512, [c, g] = canvas(N, N);
    const gr = g.createRadialGradient(N / 2, N / 2, 10, N / 2, N / 2, N / 2);
    gr.addColorStop(0, '#e2a8ff'); gr.addColorStop(0.75, '#c86aff'); gr.addColorStop(1, '#8e3fd0');
    g.fillStyle = gr; g.beginPath(); g.arc(N / 2, N / 2, N / 2 - 4, 0, 7); g.fill();
    g.strokeStyle = '#e9b949'; g.lineWidth = 14; g.beginPath(); g.arc(N / 2, N / 2, N / 2 - 14, 0, 7); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.arc(N / 2, N / 2, N / 2 - 36, 0, 7); g.stroke();
    g.font = 'italic 800 150px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#7a4a10'; g.fillText('Mine', N / 2 + 3, N / 2 + 8);
    g.fillStyle = '#f6d27a'; g.fillText('Mine', N / 2, N / 2 + 4);
    g.drawImage(kissTexture().image, N / 2 + 40, N / 2 + 70, 110, 110);
    return tex(c);
  });
}
// a stitched sampler, the Home Sweet Home kind: cream linen, cross-stitch in her lilac and red, keys and kisses
export function samplerTexture(text, { lines = null } = {}) {
  return once('sampler' + text, () => {
    const W = 1024, H = 420, [c, g] = canvas(W, H), R = rng(text.length);
    g.fillStyle = '#efe6d2'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,255,250' : '150,130,100'},${R() * 0.08})`; g.fillRect(R() * W, R() * H, 2, 2); }
    // the text, rasterised and then stitched cell by cell
    const [m, mg] = canvas(W, H);
    const rows = lines || [text];
    const fs = rows.length > 1 ? 92 : 104;
    mg.font = `italic 800 ${fs}px Fraunces, Georgia, serif`; mg.textAlign = 'center'; mg.textBaseline = 'middle';
    let s = fs; while (rows.some((r) => mg.measureText(r).width > W - 140) && s > 30) { s -= 4; mg.font = `italic 800 ${s}px Fraunces, Georgia, serif`; }
    mg.fillStyle = '#000';
    rows.forEach((r, i) => mg.fillText(r, W / 2, H / 2 + (i - (rows.length - 1) / 2) * s * 1.08));
    const md = mg.getImageData(0, 0, W, H).data;
    const cell = 7;
    const stitch = (x, y, col) => { g.strokeStyle = col; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x + 1, y + 1); g.lineTo(x + cell - 1, y + cell - 1); g.moveTo(x + cell - 1, y + 1); g.lineTo(x + 1, y + cell - 1); g.stroke(); };
    for (let y = 0; y < H; y += cell) for (let x = 0; x < W; x += cell) { const a = md[((y + 3) * W + x + 3) * 4 + 3]; if (a > 110) stitch(x, y, (Math.floor(y / cell) % 9 < 1) ? '#c0102a' : '#8e3fd0'); }
    // border: a running stitch with tiny keys and kisses
    for (let x = 28; x < W - 28; x += cell) { stitch(x, 20, '#c86aff'); stitch(x, H - 27, '#c86aff'); }
    for (let y = 28; y < H - 28; y += cell) { stitch(20, y, '#c86aff'); stitch(W - 27, y, '#c86aff'); }
    for (let i = 0; i < 9; i++) {
      const x = 70 + i * (W - 140) / 8;
      for (const y of [44, H - 52]) {
        if (i % 2) { g.fillStyle = '#c0102a'; for (const [dx, dy] of [[0, 0], [7, 0], [14, 0], [-7, 7], [21, 7], [0, 14], [7, 14], [14, 14]]) g.fillRect(x + dx - 7, y + dy - 4, 5, 5); }
        else { g.fillStyle = '#b8893c'; for (const [dx, dy] of [[0, 0], [7, 0], [0, 7], [7, 7], [14, 3.5], [21, 3.5], [28, 3.5], [28, 10]]) g.fillRect(x + dx - 14, y + dy - 4, 5, 5); }
      }
    }
    return tex(c);
  });
}
export function stencilTexture(text, base = '#8a6a48') {
  return once('stencil' + text + base, () => {
    const W = 256, H = 160, [c, g] = canvas(W, H), R = rng(text.length * 7);
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(40,25,10,${R() * 0.12})`; g.fillRect(0, R() * H, W, 1 + R() * 3); }
    g.strokeStyle = 'rgba(30,18,8,0.6)'; g.lineWidth = 6; g.strokeRect(6, 6, W - 12, H - 12);
    g.font = '900 46px "Archivo Black", Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let s = 46; while (g.measureText(text).width > W - 30 && s > 16) { s -= 2; g.font = `900 ${s}px "Archivo Black", Arial Black, sans-serif`; }
    g.fillStyle = 'rgba(25,18,12,0.85)'; g.fillText(text, W / 2, H / 2 + 2);
    return tex(c);
  });
}
// her lease: parchment, a gold border, the fine print, her kiss as the signature
export function leaseTexture() {
  return once('lease', () => {
    const F = floorCanvas(2048), { g, W, H, px, pz, ppm } = F, R = rng(44);
    g.fillStyle = '#f1e3c4'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { const x = R() * W, y = R() * H, r = 40 + R() * 160; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(160,120,60,0.08)'); rg.addColorStop(1, 'rgba(160,120,60,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.strokeStyle = '#c7922b'; g.lineWidth = ppm * 0.12; g.strokeRect(px(-10.7), pz(-6.8), px(10.7) - px(-10.7), pz(6.8) - pz(-6.8));
    g.lineWidth = 3; g.strokeRect(px(-10.4), pz(-6.5), px(10.4) - px(-10.4), pz(6.5) - pz(-6.5));
    g.font = `italic 800 ${ppm * 0.55}px Fraunces, Georgia, serif`; g.textAlign = 'center'; g.fillStyle = '#5a3a26';
    g.fillText('Lease', px(0), pz(-6.25));
    g.font = `600 ${ppm * 0.16}px "Space Grotesk", sans-serif`; g.fillStyle = 'rgba(60,40,25,0.55)'; g.textAlign = 'left';
    for (let z = -5.8; z < 6.4; z += 0.26) { let s = ''; while (s.length < 160) s += ['the tenant', 'in perpetuity', 'all rooms', 'every thought', 'forever', 'and ever', 'herein', 'the undersigned', 'shall', 'remain'][R() * 10 | 0] + ' '; g.fillText(s, px(-10.0), pz(z)); }
    g.drawImage(kissTexture().image, px(6.5), pz(5.0), ppm * 2.2, ppm * 2.2);
    return tex(F.c);
  });
}
// the photo of your new girl (a small, plain snapshot: hers is the only face you can't see)
export function photoTexture() {
  return once('photo', () => {
    const W = 128, H = 160, [c, g] = canvas(W, H);
    g.fillStyle = '#fbf7ee'; g.fillRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 10, 0, 130); gr.addColorStop(0, '#9fc6e0'); gr.addColorStop(1, '#e8d2b0');
    g.fillStyle = gr; g.fillRect(10, 10, W - 20, 120);
    g.fillStyle = '#6a3a22'; g.beginPath(); g.ellipse(W / 2, 62, 20, 24, 0, 0, 7); g.fill();
    g.fillStyle = '#e9b8a0'; g.beginPath(); g.ellipse(W / 2, 66, 13, 16, 0, 0, 7); g.fill();
    g.fillStyle = '#2f7f7a'; g.beginPath(); g.moveTo(30, 130); g.quadraticCurveTo(W / 2, 80, W - 30, 130); g.fill();
    return tex(c);
  });
}
// soft round glow for floor pools (candles, the lamp, follow-spots, gobo dots)
export function glowTexture() {
  return once('glow', () => {
    const N = 256, [c, g] = canvas(N, N);
    const rg = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.55)'); rg.addColorStop(0.7, 'rgba(255,255,255,0.15)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, N, N);
    return tex(c, { srgb: false });
  });
}
// bars of light: the window panes (gallery), slits through floorboards (crawlspace)
export function barsTexture(kind = 'window') {
  return once('bars' + kind, () => {
    const W = 512, H = 512, [c, g] = canvas(W, H);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (kind === 'window') {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) { g.fillStyle = '#fff'; g.fillRect(40 + i * 230, 20 + j * 122, 200, 104); }
      g.globalCompositeOperation = 'destination-in'; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    } else {
      for (let i = 0; i < 11; i++) { g.fillStyle = '#fff'; g.fillRect(0, 14 + i * 46, W, 2 + (i % 3)); }
    }
    const t = tex(c, { srgb: false }); return t;
  });
}
