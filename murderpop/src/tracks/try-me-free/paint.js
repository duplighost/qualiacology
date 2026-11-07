// Canvas paint for TRY ME FREE!: the gingham vinyl, the record's cereal boxes (each song as a box on the shelf),
// the hero box's front, the mini box, the TV's screens, gaffer-tape marks, her cut-out silhouette, toasted
// alphabet letters, the caption chyron, the blue check and the banner.
import * as THREE from 'three';

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
export function tex(c, { srgb = true, repeat = null, aniso = 8, mips = true, flipY = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = aniso; t.generateMipmaps = mips; t.flipY = flipY;
  return t;
}
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const FONT = '"Archivo Black", "Arial Black", Impact, sans-serif';

export function starburst(g, cx, cy, r0, r1, n, fill, stroke, lw = 0) {
  g.beginPath();
  for (let i = 0; i <= n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n; const r = i % 2 ? r0 : r1; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.closePath(); g.fillStyle = fill; g.fill();
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
function fitText(g, text, x, y, maxW, size, { fill = '#fff', stroke = null, lw = 0, weight = '', align = 'center', skew = 0 } = {}) {
  let s = size;
  g.font = `${weight}${s}px ${FONT}`;
  while (g.measureText(text).width > maxW && s > 8) { s -= 2; g.font = `${weight}${s}px ${FONT}`; }
  g.save(); g.translate(x, y); if (skew) g.transform(1, 0, skew, 1, 0, 0);
  g.textAlign = align; g.textBaseline = 'middle';
  if (stroke) { g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(text, 0, 0); }
  g.fillStyle = fill; g.fillText(text, 0, 0);
  g.restore();
  return s;
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// red-and-white gingham vinyl: 0.8 m checks (one texture = 2 x 2 checks = 1.6 m); where red crosses red it's red,
// where white crosses white it's white, pink between. A fine weave in the roughness.
export function gingham() {
  const N = 256, h = N / 2;
  const [c, g] = canvas(N, N);
  const R = [214, 22, 38], W = [244, 234, 224];
  const img = g.createImageData(N, N), d = img.data, rnd = rng(11);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const a = x < h ? 1 : 0, b = y < h ? 1 : 0, k = (a + b) / 2;
    const weave = ((x + y) % 4 < 2 ? 0.97 : 1.0) * (0.985 + rnd() * 0.03);
    const i = (y * N + x) * 4;
    for (let ch = 0; ch < 3; ch++) d[i + ch] = Math.min(255, (W[ch] + (R[ch] - W[ch]) * k) * weave);
    d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c, { repeat: [1, 1] });
}

// the record as cereal: each song's box front (4.5 x 10 m, canvas 460 x 1024)
export const BOXES = {
  ppg: { title: ['PRETTY', 'UNTIL', 'PROVEN', 'GUILTY'], side: 'A', n: 3, bg: '#d6182e', bg2: '#ff3a5a', ink: '#fff4e6', burst: '#ffd21a', bowl: ['#ff3a5a', '#fff4e6', '#ffd21a'], flash: 'NOW WITH REAL GAVELS' },
  msayf: { title: ['MAKEUP', 'SEX AT', 'YOUR', 'FUNERAL'], side: 'A', n: 4, bg: '#0d0a0c', bg2: '#2a2228', ink: '#f0c860', burst: '#f0c860', bowl: ['#0d0a0c', '#f0c860', '#b8a0ff'], flash: 'OPEN CASKET · OPEN BAR' },
  ifyd: { title: ['I FUCKED', 'YOUR', 'DAD'], side: 'B', n: 2, bg: '#2a4aa8', bg2: '#f4f6ff', ink: '#ffffff', burst: '#ff5a3a', bowl: ['#2a4aa8', '#ffffff', '#ff5a3a'], flash: 'AND HE WAS BETTER', check: true },
  rent: { title: ['RENT', 'FREE'], side: 'B', n: 3, bg: '#a88ae8', bg2: '#d8c8ff', ink: '#2a1250', burst: '#fff2a8', bowl: ['#a88ae8', '#fff2a8', '#ffffff'], flash: 'NO LEASE REQUIRED' },
  stc: { title: ['SEXY', 'TRAUMA', 'COSTUME'], side: 'A', n: 1, bg: '#ff6a10', bg2: '#141010', ink: '#141010', burst: '#141010', burstInk: '#ff6a10', bowl: ['#ff6a10', '#141010', '#ffffff'], flash: 'ONE SIZE FITS ALL' },
  lake: { title: ['YOUR CAR', 'IS AT THE', 'BOTTOM OF', 'THE LAKE'], side: 'A', n: 2, bg: '#127a7a', bg2: '#3ac0b8', ink: '#eaffff', burst: '#ffe14a', bowl: ['#127a7a', '#eaffff', '#ffe14a'], flash: 'NOW WATERPROOF' },
  kmlacc: { title: ['KISS ME', 'LIKE A', 'CAR', 'CRASH'], side: 'B', n: 1, bg: '#ff3a8a', bg2: '#ffc0dc', ink: '#ffffff', burst: '#2a1a40', burstInk: '#ff3a8a', bowl: ['#ff3a8a', '#ffffff', '#2a1a40'], flash: 'BUCKLE UP' },
  rpd: { title: ['REVERSE', 'PSYCHO-', 'LOGY', 'DEGREE'], side: 'B', n: 4, bg: '#b8102a', bg2: '#141014', ink: '#ffffff', burst: '#141014', burstInk: '#ffffff', bowl: ['#b8102a', '#141014', '#ffffff'], flash: 'DOCTOR RECOMMENDED' },
  ptsd: { title: ['PTSDREAM', 'GIRL'], side: 'B', n: 5, bg: '#c8102e', bg2: '#ff8aa0', ink: '#fff0f4', burst: '#fff0f4', burstInk: '#c8102e', bowl: ['#c8102e', '#fff0f4', '#141014'], flash: 'COUNT TO FOUR', lace: true },
};

function bowlArt(g, cx, cy, w, cols, rnd) {
  // loops heaped in a white bowl with a red band, milk splashing
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(cx, cy + w * 0.36, w * 0.5, w * 0.08, 0, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 28; i++) {
    const a = rnd() * Math.PI, rr = rnd() * w * 0.42;
    const x = cx + Math.cos(a) * rr * (rnd() < 0.5 ? -1 : 1), y = cy - w * 0.06 - Math.sin(a) * rr * 0.42;
    const r = w * (0.06 + rnd() * 0.025);
    g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.arc(x, y, r * 0.42, 0, Math.PI * 2, true); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.18, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#fbf8f2'; g.beginPath(); g.moveTo(cx - w * 0.5, cy); g.quadraticCurveTo(cx - w * 0.46, cy + w * 0.4, cx, cy + w * 0.4); g.quadraticCurveTo(cx + w * 0.46, cy + w * 0.4, cx + w * 0.5, cy); g.closePath(); g.fill();
  g.fillStyle = '#e8202e'; g.fillRect(cx - w * 0.49, cy + w * 0.06, w * 0.98, w * 0.05);
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(cx - w * 0.22, cy + w * 0.2, w * 0.05, w * 0.12, 0.3, 0, Math.PI * 2); g.fill();
  g.restore();
}

export function recordBox(key, W = 460, H = 1024) {
  const b = BOXES[key], rnd = rng(key.length * 7 + b.n);
  const [c, g] = canvas(W, H);
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, b.bg); grd.addColorStop(1, b.bg);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  if (key === 'ifyd') {   // the flannel check
    g.globalAlpha = 0.5;
    for (let i = 0; i < W; i += 46) { g.fillStyle = i % 92 ? '#f4f6ff' : '#1a2e70'; g.fillRect(i, 0, 18, H); }
    for (let j = 0; j < H; j += 46) { g.fillStyle = j % 92 ? '#f4f6ff' : '#1a2e70'; g.fillRect(0, j, W, 18); }
    g.globalAlpha = 1;
  } else if (b.lace) {
    g.strokeStyle = 'rgba(255,220,230,0.35)'; g.lineWidth = 3;
    for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 ? 20 : 0; x < W; x += 40) { g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.stroke(); }
  } else {
    g.fillStyle = b.bg2; g.globalAlpha = 0.35;
    for (let i = -H; i < W + H; i += 70) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 30, 0); g.lineTo(i + 30 - H * 0.4, H); g.lineTo(i - H * 0.4, H); g.closePath(); g.fill(); }
    g.globalAlpha = 1;
  }
  // a white panel for the title
  g.fillStyle = 'rgba(0,0,0,0.22)'; rrect(g, 26, 130, W - 52, 330, 26); g.fill();
  g.fillStyle = b.bg2 === '#141010' || b.bg2 === '#141014' ? '#fff6ee' : b.bg2; rrect(g, 20, 120, W - 40, 330, 26); g.fill();
  const lines = b.title, lh = 300 / lines.length;
  lines.forEach((l, i) => fitText(g, l, W / 2, 140 + lh * (i + 0.5), W - 70, Math.min(96, lh * 0.95), { fill: key === 'ifyd' || key === 'stc' ? '#141014' : b.bg, stroke: '#ffffff', lw: 6 }));
  // the side and number in a starburst
  starburst(g, W - 92, 92, 52, 80, 14, b.burst, '#ffffff', 5);
  fitText(g, `SIDE ${b.side}`, W - 92, 76, 100, 26, { fill: b.burstInk || '#141014' });
  fitText(g, `${b.n}`, W - 92, 112, 80, 52, { fill: b.burstInk || '#141014' });
  // brand
  fitText(g, 'DOOPLISS', 92, 70, 150, 34, { fill: '#ffffff', stroke: b.bg, lw: 4, skew: -0.15 });
  // the bowl, lower half (seen in the floor's reflection)
  bowlArt(g, W / 2, 690, W * 0.82, b.bowl, rnd);
  // a flash across the bottom
  g.fillStyle = '#ffffff'; rrect(g, 30, H - 170, W - 60, 70, 35); g.fill();
  fitText(g, b.flash, W / 2, H - 135, W - 100, 34, { fill: b.bg === '#0d0a0c' ? '#0d0a0c' : b.bg });
  fitText(g, 'NET WT 1 SONG', W / 2, H - 58, W - 120, 26, { fill: b.ink });
  return tex(c);
}

// the hero box's front: 7 x 12 m (canvas 588 x 1008). The window is cut out (alpha) at its place:
// window w x h metres with its bottom `wy` metres above the box's base.
export function heroBox({ W = 588, H = 1008, boxW = 7, boxH = 12, win = { w: 2.6, h: 3.0, wy: 0.3 } } = {}) {
  const [c, g] = canvas(W, H), s = W / boxW, rnd = rng(42);
  g.fillStyle = '#ffd21a'; g.fillRect(0, 0, W, H);
  // sunburst rays
  g.save(); g.translate(W / 2, H * 0.5); g.fillStyle = '#ffe46a';
  for (let i = 0; i < 24; i++) { g.rotate(Math.PI / 12); g.beginPath(); g.moveTo(0, 0); g.lineTo(-40, -H); g.lineTo(40, -H); g.closePath(); g.fill(); }
  g.restore();
  // the name band
  const by = H * 0.16;
  g.fillStyle = '#9a0c18'; rrect(g, 18, by + 8, W - 36, 190, 30); g.fill();
  g.fillStyle = '#e8202e'; rrect(g, 14, by, W - 28, 190, 30); g.fill();
  fitText(g, 'TRY ME', W / 2 - 40, by + 62, W - 140, 104, { fill: '#ffffff', stroke: '#9a0c18', lw: 8, skew: -0.12 });
  fitText(g, 'FREE!', W / 2 + 40, by + 146, W - 160, 112, { fill: '#ffffff', stroke: '#9a0c18', lw: 8, skew: -0.12 });
  // the cobalt starburst
  starburst(g, W - 110, by + 290, 70, 108, 16, '#3a6aff', '#ffffff', 6);
  fitText(g, 'FREE!', W - 110, by + 290, 150, 50, { fill: '#ffffff', skew: -0.1 });
  fitText(g, 'DOOPLISS', 108, 70, 170, 40, { fill: '#e8202e', stroke: '#ffffff', lw: 5, skew: -0.15 });
  fitText(g, 'PART OF A COMPLETE BREAKDOWN', W / 2, H * 0.45, W - 80, 30, { fill: '#9a0c18' });
  // FREE PRIZE INSIDE! over the window
  const wx0 = (W - win.w * s) / 2, wy1 = H - win.wy * s, wy0 = wy1 - win.h * s;
  g.fillStyle = '#3a6aff'; rrect(g, wx0 - 40, wy0 - 92, win.w * s + 80, 70, 35); g.fill();
  fitText(g, 'FREE PRIZE INSIDE!', W / 2, wy0 - 57, win.w * s + 40, 40, { fill: '#ffffff' });
  // a gold die-cut frame around the window
  g.save(); g.beginPath(); archPath(g, wx0 - 14, wy0 - 14, win.w * s + 28, win.h * s + 28); g.fillStyle = '#f0c860'; g.fill(); g.restore();
  // cut the window (alpha)
  g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); archPath(g, wx0, wy0, win.w * s, win.h * s); g.fill(); g.restore();
  // net weight
  fitText(g, 'NET WT 0.00 OZ · YOU', W * 0.22, H - 40, 220, 24, { fill: '#9a0c18' });
  return tex(c);
}
function archPath(g, x, y, w, h) { const r = w / 2; g.moveTo(x, y + h); g.lineTo(x, y + r); g.arc(x + r, y + r, r, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); }

// the inside of her box: a printed display tray, blue sky and clouds
export function trayArt() {
  const [c, g] = canvas(256, 320);
  const grd = g.createLinearGradient(0, 0, 0, 320); grd.addColorStop(0, '#4a8aff'); grd.addColorStop(1, '#bfe0ff');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 320);
  g.fillStyle = '#ffffff';
  for (const [x, y, r] of [[60, 80, 30], [90, 70, 36], [125, 84, 26], [180, 170, 28], [210, 160, 34], [236, 176, 22], [40, 240, 24], [70, 232, 30]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  return tex(c);
}

// the mini box she holds up for the product shot (front 0.25 x 0.35)
export function miniBox() {
  const [c, g] = canvas(200, 280);
  g.fillStyle = '#ffd21a'; g.fillRect(0, 0, 200, 280);
  g.fillStyle = '#e8202e'; rrect(g, 8, 40, 184, 90, 14); g.fill();
  fitText(g, 'TRY ME', 100, 68, 170, 40, { fill: '#fff', skew: -0.12 });
  fitText(g, 'FREE!', 100, 108, 150, 42, { fill: '#fff', skew: -0.12 });
  starburst(g, 150, 190, 30, 44, 12, '#3a6aff', '#fff', 3);
  fitText(g, 'FREE!', 150, 190, 60, 20, { fill: '#fff' });
  bowlArt(g, 70, 210, 100, ['#ff3a4a', '#3ab8ff', '#ffd21a', '#a85aff'], rng(3));
  return tex(c);
}

// her gaffer-tape T: 1 m, glossy tape with torn ends
export function tapeT(col, col2 = null) {
  const [c, g] = canvas(256, 256);
  const tape = (x, y, w, h) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i <= 8; i++) g.lineTo(x + w * i / 8, y + (i % 2 ? 4 : 0));
    g.lineTo(x + w, y + h); for (let i = 8; i >= 0; i--) g.lineTo(x + w * i / 8, y + h - (i % 2 ? 4 : 0)); g.closePath(); g.fill();
    if (col2) { g.fillStyle = col2; g.fillRect(x, y + h * 0.42, w, h * 0.16); }
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y + 3, w, h * 0.18);
  };
  tape(20, 30, 216, 50);
  g.save(); g.translate(128, 0); tape(-25, 78, 50, 160); g.restore();
  return tex(c);
}

// THE CUT: three frames of a flat white cut-out of her (buns, a skirt, arms a little out)
export function silhouette() {
  const [c, g] = canvas(256, 512);
  g.fillStyle = '#fffaf2';
  g.beginPath(); g.arc(128, 70, 34, 0, Math.PI * 2); g.fill();                    // head
  g.beginPath(); g.arc(92, 40, 22, 0, Math.PI * 2); g.arc(164, 40, 22, 0, Math.PI * 2); g.fill();   // buns
  g.beginPath(); g.moveTo(84, 120); g.lineTo(172, 120); g.lineTo(162, 230); g.lineTo(206, 300); g.lineTo(50, 300); g.lineTo(94, 230); g.closePath(); g.fill();   // torso, skirt
  g.beginPath(); g.moveTo(84, 124); g.lineTo(40, 250); g.lineTo(54, 254); g.lineTo(98, 150); g.fill();
  g.beginPath(); g.moveTo(172, 124); g.lineTo(216, 250); g.lineTo(202, 254); g.lineTo(158, 150); g.fill();
  g.fillRect(96, 296, 22, 196); g.fillRect(138, 296, 22, 196);                     // legs
  return tex(c);
}

// toasted alphabet cereal, one letter (the O of OMG is a loop, painted pink by the game)
export function letter(ch) {
  const [c, g] = canvas(128, 128);
  g.font = `110px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = 14; g.strokeStyle = '#7a3a10'; g.strokeText(ch, 64, 70);
  const grd = g.createLinearGradient(0, 10, 0, 120); grd.addColorStop(0, '#ffcf6a'); grd.addColorStop(1, '#d9862a');
  g.fillStyle = grd; g.fillText(ch, 64, 70);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillText(ch, 61, 66);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = grd; g.fillText(ch, 64, 70);
  return tex(c);
}

// the TV lower-third: a glossy blue chyron with the channel's starburst, no words
export function chyron() {
  const [c, g] = canvas(1024, 128);
  const grd = g.createLinearGradient(0, 0, 0, 128); grd.addColorStop(0, '#5a8cff'); grd.addColorStop(0.5, '#2a52d8'); grd.addColorStop(1, '#16308a');
  g.fillStyle = grd; rrect(g, 0, 8, 1024, 112, 20); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(10, 14, 1004, 18);
  starburst(g, 70, 64, 30, 50, 14, '#ffd21a', '#fff', 4);
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,255,255,0.55)'; rrect(g, 150 + i * 140, 52, 110, 24, 12); g.fill(); }
  return tex(c);
}

// lyric sign 2: BLUE CHECK ON MY TRAUMA, a starburst display card with the verified badge
export function blueCheckSign() {
  const [c, g] = canvas(1024, 512);
  starburst(g, 512, 256, 210, 250, 28, '#2a6aff', '#ffffff', 10);
  g.fillStyle = '#2a6aff'; rrect(g, 40, 150, 944, 212, 60); g.fill();
  g.lineWidth = 10; g.strokeStyle = '#ffffff'; rrect(g, 40, 150, 944, 212, 60); g.stroke();
  fitText(g, 'BLUE CHECK', 420, 212, 640, 84, { fill: '#ffffff', skew: -0.1 });
  fitText(g, 'ON MY TRAUMA', 420, 300, 640, 70, { fill: '#ffffff', skew: -0.1 });
  badge(g, 850, 256, 80);
  return tex(c);
}
export function badge(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; const rr = r * (0.9 + 0.1 * Math.cos(a * 12)); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.fillStyle = '#1d9bf0'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.stroke();
  g.beginPath(); g.moveTo(x - r * 0.4, y); g.lineTo(x - r * 0.1, y + r * 0.32); g.lineTo(x + r * 0.45, y - r * 0.3);
  g.lineWidth = r * 0.18; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#ffffff'; g.stroke();
}
export function badgeTex() { const [c, g] = canvas(256, 256); badge(g, 128, 128, 110); return tex(c); }

// lyric sign 3: MAKE DESTRUCTION SICKLY SWEET, the new slogan unrolling down the box
export function banner() {
  const [c, g] = canvas(256, 1024);
  g.fillStyle = '#ffd21a'; g.fillRect(0, 0, 256, 1024);
  g.fillStyle = '#e8202e'; g.fillRect(0, 0, 256, 24); g.fillRect(0, 1000, 256, 24);
  const words = ['MAKE', 'DESTRUC-', 'TION', 'SICKLY', 'SWEET'];
  words.forEach((w, i) => fitText(g, w, 128, 130 + i * 180, 230, 72, { fill: '#e8202e', skew: -0.1 }));
  return tex(c);
}

// the price strip on the shelf edge
export function priceStrip() {
  const [c, g] = canvas(2048, 64);
  g.fillStyle = '#e8202e'; g.fillRect(0, 0, 2048, 64);
  for (let i = 0; i < 6; i++) { fitText(g, 'TRY ME FREE! · $0.00', 170 + i * 340, 33, 320, 34, { fill: '#ffffff' }); }
  return tex(c, { repeat: [1, 1] });
}

// ---------------------------------------------------------------- the TV
// a 4:3 screen drawn every frame it changes: the title card, LIVE, NEW SUBSCRIBER, SWIPE UP TO MONETIZE, the
// follower counter, and off (collapsing to a dot)
export class Screen {
  constructor() { [this.c, this.g] = canvas(512, 384); this.t = tex(this.c); this.key = ''; }
  draw(mode, k = 0, n = 0) {
    const key = mode + ':' + (mode === 'count' ? Math.floor(n) : Math.round(k * 20));
    if (key === this.key) return; this.key = key;
    const g = this.g, W = 512, H = 384;
    g.fillStyle = '#05060a'; g.fillRect(0, 0, W, H);
    if (mode === 'off') { this.t.needsUpdate = true; return; }
    if (mode === 'collapse') {
      const w = W * Math.max(0.02, 1 - k * 1.4), h = Math.max(2, H * (1 - k) * (1 - k) * 0.6);
      g.fillStyle = '#e8f0ff'; g.fillRect(W / 2 - w / 2, H / 2 - h / 2, w, h); this.t.needsUpdate = true; return;
    }
    if (mode === 'title') {
      const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#3a6aff'); grd.addColorStop(1, '#bfe0ff'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
      starburst(g, W / 2, H / 2, 120, 170, 18, '#ffd21a', '#ffffff', 6);
      fitText(g, 'TRY ME', W / 2, H / 2 - 30, 300, 70, { fill: '#e8202e', stroke: '#fff', lw: 6, skew: -0.12 });
      fitText(g, 'FREE!', W / 2, H / 2 + 40, 260, 76, { fill: '#e8202e', stroke: '#fff', lw: 6, skew: -0.12 });
    } else if (mode === 'live' || mode === 'sub' || mode === 'swipe' || mode === 'count') {
      const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, '#2a1a5a'); grd.addColorStop(1, '#080818'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ff2a4a'; rrect(g, 24, 24, 120, 48, 10); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(48, 48, 9, 0, Math.PI * 2); g.fill();
      fitText(g, 'LIVE', 98, 49, 70, 30, { fill: '#fff' });
      if (mode === 'sub') {
        g.fillStyle = '#ffffff'; rrect(g, 56, 130, 400, 120, 24); g.fill();
        badge(g, 120, 190, 36);
        fitText(g, 'NEW SUBSCRIBER', 300, 172, 270, 34, { fill: '#2a1a5a' });
        fitText(g, 'to your funeral', 300, 214, 270, 24, { fill: '#7a6a9a' });
      } else if (mode === 'swipe') {
        const bob = Math.sin(k * Math.PI * 2) * 14;
        g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(W / 2, 110 + bob); g.lineTo(W / 2 - 50, 170 + bob); g.lineTo(W / 2 + 50, 170 + bob); g.closePath(); g.fill();
        fitText(g, 'SWIPE UP', W / 2, 230, 380, 56, { fill: '#ffffff' });
        fitText(g, 'TO MONETIZE', W / 2, 290, 380, 44, { fill: '#ffd21a' });
      } else if (mode === 'count') {
        fitText(g, Math.floor(n).toLocaleString('en-US'), W / 2, H / 2, 440, 72, { fill: '#ffffff' });
        fitText(g, 'FOLLOWERS', W / 2, H / 2 + 64, 300, 30, { fill: '#b8a0ff' });
      } else {
        g.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 6; i++) { rrect(g, 40, 110 + i * 42, 300 + (i * 37) % 120, 26, 13); g.fill(); }
      }
    }
    // scanlines
    g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2);
    this.t.needsUpdate = true;
  }
}
