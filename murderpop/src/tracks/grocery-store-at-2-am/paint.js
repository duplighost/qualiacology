// Canvas paint for the store: the floor tiles, the lot's asphalt, the product labels, the aisle signs (the
// credits), the letter board out front, the wire of a cart basket, and soft shadows.
import * as THREE from 'three';

export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, { srgb = true, repeat = null, aniso = 8, mips = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = aniso; t.generateMipmaps = mips;
  return t;
}
const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// pale vinyl tiles, 12 x 12 per texture (0.6 m each -> 7.2 m), a few darker ones, grout, mop streaks
export function floorTextures() {
  const N = 1024, n = 12, s = N / n, R = rng(7);
  const [c, g] = canvas(N, N), [cr, gr] = canvas(N, N);
  gr.fillStyle = '#5a5a5a'; gr.fillRect(0, 0, N, N);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const accent = (x * 7 + y * 3) % 11 === 0 || (y === 5 && x % 4 === 1);
    const l = accent ? 52 + R() * 3 : 74 + R() * 3.5;
    g.fillStyle = hsl(accent ? 36 : 42, accent ? 14 : 9, l); g.fillRect(x * s, y * s, s, s);
    // mottle (vinyl composite chips)
    for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(${R() < 0.5 ? '90,84,70' : '255,252,240'},${0.05 + R() * 0.07})`; const r = 1 + R() * 2.2; g.fillRect(x * s + R() * s, y * s + R() * s, r, r); }
    gr.fillStyle = `rgb(${70 + R() * 30 | 0},${70 + R() * 30 | 0},${70 + R() * 30 | 0})`; gr.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
  }
  // grout
  g.strokeStyle = 'rgba(70,64,52,0.55)'; g.lineWidth = 2;
  gr.strokeStyle = '#d0d0d0'; gr.lineWidth = 3;
  for (let i = 0; i <= n; i++) { for (const [gg] of [[g], [gr]]) { gg.beginPath(); gg.moveTo(i * s, 0); gg.lineTo(i * s, N); gg.moveTo(0, i * s); gg.lineTo(N, i * s); gg.stroke(); } }
  // mop arcs and scuffs: rougher (lighter on the roughness map), faintly greyer on colour
  for (let k = 0; k < 26; k++) {
    const x = R() * N, y = R() * N, r = 60 + R() * 220, a0 = R() * 6.28;
    gr.strokeStyle = `rgba(255,255,255,${0.08 + R() * 0.12})`; gr.lineWidth = 6 + R() * 18; gr.beginPath(); gr.arc(x, y, r, a0, a0 + 0.6 + R() * 1.4); gr.stroke();
  }
  for (let k = 0; k < 140; k++) { g.strokeStyle = `rgba(40,36,30,${0.05 + R() * 0.08})`; g.lineWidth = 1 + R() * 2; const x = R() * N, y = R() * N, a = R() * 6.28, l = 6 + R() * 26; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  return { map: tex(c, { repeat: [1, 1] }), rough: tex(cr, { srgb: false, repeat: [1, 1] }) };
}

export function asphaltTexture() {
  const N = 1024, R = rng(11);
  const [c, g] = canvas(N, N);
  g.fillStyle = '#34353a'; g.fillRect(0, 0, N, N);
  const img = g.getImageData(0, 0, N, N), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = (R() - 0.5) * 34 + (R() < 0.02 ? 30 : 0); d[i] += v; d[i + 1] += v; d[i + 2] += v * 1.05; }
  g.putImageData(img, 0, 0);
  // worn, lighter patches where the cars pull in (no dark blotches: under sodium light they read as blood)
  for (let k = 0; k < 14; k++) { const x = R() * N, y = R() * N, r = 40 + R() * 120; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(120,120,124,0.16)'); gr.addColorStop(1, 'rgba(120,120,124,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  // hairline cracks, faint
  g.strokeStyle = 'rgba(14,14,16,0.35)';
  for (let k = 0; k < 8; k++) { let x = R() * N, y = R() * N; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 7; j++) { x += (R() - 0.5) * 40; y += (R() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  return tex(c, { repeat: [1, 1] });
}

// 8 x 4 cells of 256 px: product labels. Returns the texture and a few named cells.
export const CELLS = { corn: 0, cereal: 1, frozen0: 2 };
export function labelAtlas() {
  const C = 256, cols = 8, rows = 4, R = rng(23);
  const [c, g] = canvas(C * cols, C * rows);
  const hues = [2, 12, 28, 45, 95, 140, 175, 200, 215, 265, 300, 330];
  const draw = (i, f) => { const x = (i % cols) * C, y = Math.floor(i / cols) * C; g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, C, C); g.clip(); f(g); g.restore(); };
  for (let i = 0; i < cols * rows; i++) {
    draw(i, (g) => {
      const h = hues[Math.floor(R() * hues.length)], h2 = (h + 150 + R() * 60) % 360;
      const dark = R() < 0.35;
      const white = R() < 0.18;
      g.fillStyle = white ? hsl(h, 12, 88) : dark ? hsl(h, 45, 16 + R() * 10) : hsl(h, 45 + R() * 30, 40 + R() * 16); g.fillRect(0, 0, C, C);
      const kind = Math.floor(R() * 4);
      if (kind === 0) { g.fillStyle = hsl(h2, 70, 60); g.fillRect(0, C * 0.62, C, C * 0.2); }
      if (kind === 1) { g.fillStyle = '#f5efe2'; g.beginPath(); g.ellipse(C / 2, C * 0.45, C * 0.32, C * 0.22, 0, 0, 6.3); g.fill(); g.fillStyle = hsl(h, 70, 40); g.beginPath(); g.ellipse(C / 2, C * 0.45, C * 0.2, C * 0.12, 0, 0, 6.3); g.fill(); }
      if (kind === 2) { for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? hsl(h2, 60, 55) : 'rgba(255,255,255,0.85)'; g.fillRect(0, C * (0.1 + k * 0.13), C, C * 0.06); } }
      if (kind === 3) { g.fillStyle = hsl(h2, 75, 55); g.beginPath(); g.moveTo(0, C); g.lineTo(C, C * 0.4); g.lineTo(C, C); g.fill(); }
      // brand block and "words" (unreadable bars: it's the shelf's colour that reads, not its print)
      g.fillStyle = R() < 0.5 ? '#fbf6ea' : hsl(h2, 80, 62); rrect(g, C * 0.14, C * 0.16, C * 0.72, C * 0.2, 14); g.fill();
      g.fillStyle = dark ? '#ffffff' : 'rgba(20,16,14,0.85)';
      for (let k = 0; k < 3; k++) g.fillRect(C * 0.2, C * (0.72 + k * 0.07), C * (0.35 + R() * 0.4), C * 0.03);
    });
  }
  // canned corn: green and gold, a cob
  draw(CELLS.corn, (g) => {
    g.fillStyle = '#1d6b34'; g.fillRect(0, 0, C, C); g.fillStyle = '#f3c419'; g.fillRect(0, C * 0.25, C, C * 0.5);
    g.fillStyle = '#ffe680'; for (let y = 0; y < 6; y++) for (let x = 0; x < 9; x++) { g.beginPath(); g.ellipse(C * 0.16 + x * C * 0.085, C * 0.33 + y * C * 0.07, 9, 7, 0, 0, 6.3); g.fill(); }
    g.fillStyle = '#ffffff'; g.font = `900 ${C * 0.16}px 'Archivo Black', sans-serif`; g.textAlign = 'center'; g.fillText('CORN', C / 2, C * 0.2);
  });
  // TRY ME FREE! cereal: the prize-inside's box
  draw(CELLS.cereal, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, C); gr.addColorStop(0, '#ff2e88'); gr.addColorStop(1, '#ffb347'); g.fillStyle = gr; g.fillRect(0, 0, C, C);
    g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(C * 0.5, C * 0.62, C * 0.26, 0, 6.3); g.fill();
    g.fillStyle = '#f2c25b'; for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(C * (0.3 + Math.random() * 0.4), C * (0.5 + Math.random() * 0.24), 10, 0, 6.3); g.fill(); }
    g.save(); g.translate(C / 2, C * 0.22); g.rotate(-0.12); g.fillStyle = '#ffffff'; g.font = `900 ${C * 0.15}px 'Archivo Black', sans-serif`; g.textAlign = 'center'; g.fillText('TRY ME', 0, 0); g.fillText('FREE!', 0, C * 0.15); g.restore();
  });
  // frozen dinners: frost blue with a plate
  draw(CELLS.frozen0, (g) => { g.fillStyle = '#244a8a'; g.fillRect(0, 0, C, C); g.fillStyle = '#eef4ff'; g.beginPath(); g.ellipse(C / 2, C * 0.58, C * 0.36, C * 0.24, 0, 0, 6.3); g.fill(); g.fillStyle = '#c8542e'; g.beginPath(); g.ellipse(C * 0.42, C * 0.58, C * 0.14, C * 0.09, 0, 0, 6.3); g.fill(); g.fillStyle = '#7fae3c'; g.beginPath(); g.ellipse(C * 0.62, C * 0.6, C * 0.09, C * 0.07, 0, 0, 6.3); g.fill(); });
  const t = tex(c, { aniso: 8 });
  return { tex: t, cols, rows };
}

// an aisle sign: number in a circle, a heading, and lines of [title, who]
export function aisleSign(num, heading, lines, { w = 1280, h = 520 } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#0d4a47'; rrect(g, 6, 6, w - 12, h - 12, 26); g.fill();
  g.strokeStyle = '#efe6d6'; g.lineWidth = 8; rrect(g, 20, 20, w - 40, h - 40, 18); g.stroke();
  // the number
  const cx = 150, cy = h / 2, r = 104;
  g.fillStyle = '#efe6d6'; g.beginPath(); g.arc(cx, cy, r, 0, 6.3); g.fill();
  g.fillStyle = '#0d4a47'; g.font = `900 150px 'Archivo Black', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(num), cx, cy + 8);
  const x0 = 300, x1 = w - 60;
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#efe6d6'; g.font = `900 64px 'Archivo Black', sans-serif`;
  g.fillText(heading, x0, 112);
  g.fillStyle = 'rgba(239,230,214,0.35)'; g.fillRect(x0, 134, x1 - x0, 4);
  const n = lines.length, top = 196, lh = Math.min(74, (h - top - 40) / Math.max(1, n - 0.3));
  lines.forEach(([title, who], i) => {
    const y = top + i * lh;
    let fs = 52; g.font = `italic 600 ${fs}px 'Fraunces', Georgia, serif`;
    const wWho = who ? (g.font = `700 30px 'Space Grotesk', sans-serif`, g.measureText(who.toUpperCase()).width + 40) : 0;
    g.font = `italic 600 ${fs}px 'Fraunces', Georgia, serif`;
    while (g.measureText(title).width > x1 - x0 - wWho && fs > 30) { fs -= 2; g.font = `italic 600 ${fs}px 'Fraunces', Georgia, serif`; }
    g.fillStyle = '#fbf4e8'; g.fillText(title, x0, y);
    if (who) { g.font = `700 30px 'Space Grotesk', sans-serif`; g.fillStyle = '#ff6fae'; g.textAlign = 'right'; g.letterSpacing = '4px'; g.fillText(who.toUpperCase(), x1, y - 4); g.letterSpacing = '0px'; g.textAlign = 'left'; }
  });
  return tex(c, { aniso: 16 });
}

// a plain wall sign (DAIRY, PRODUCE, FROZEN)
export function wallSign(text, { w = 1024, h = 220, bg = '#0d4a47', fg = '#efe6d6' } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg; rrect(g, 4, 4, w - 8, h - 8, 20); g.fill();
  g.fillStyle = fg; g.font = `900 ${h * 0.56}px 'Archivo Black', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = `${h * 0.08}px`; g.fillText(text, w / 2 + h * 0.04, h / 2 + 6);
  return tex(c, { aniso: 16 });
}

// big channel letters on the parapet, drawn as glowing faces with dark returns
export function channelLetters(text, { w = 2048, h = 360, color = '#ff3b30' } = {}) {
  const [c, g] = canvas(w, h);
  g.clearRect(0, 0, w, h);
  g.font = `900 ${h * 0.82}px 'Archivo Black', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = `${h * 0.1}px`;
  g.fillStyle = 'rgba(30,8,6,0.9)'; g.fillText(text, w / 2 + 8, h / 2 + 14);
  g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 4);
  g.fillStyle = 'rgba(255,230,210,0.55)'; g.fillText(text, w / 2, h / 2 + 2);
  return tex(c, { aniso: 16 });
}

// vinyl lettering on glass (THANK YOU FOR PLAYING, OPEN 24 HOURS)
export function vinyl(lines, { w = 1024, h = 256, size = 54 } = {}) {
  const [c, g] = canvas(w, h);
  g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => { g.font = `700 ${size}px 'Space Grotesk', sans-serif`; g.letterSpacing = `${size * 0.18}px`; g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.35); });
  return tex(c, { aniso: 16 });
}

// the changeable letter board: rows of slots. draw(slots) where slots[r][i] = {ch, k (0 down .. 1 up), glow}
export class LetterBoard {
  constructor(cols = 18, rows = 2) {
    this.cols = cols; this.rows = rows;
    [this.c, this.g] = canvas(1792, 280);
    this.tex = tex(this.c, { aniso: 16 });
  }
  draw(slots, light = 1) {
    const g = this.g, W = this.c.width, H = this.c.height;
    g.fillStyle = '#15181a'; g.fillRect(0, 0, W, H);
    const pad = 26, iw = W - pad * 2, ih = H - pad * 2;
    // the backlit panel
    const b = Math.round(220 * light + 20);
    g.fillStyle = `rgb(${b},${b},${Math.round(b * 0.96)})`; g.fillRect(pad, pad, iw, ih);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
    for (let r = 1; r < this.rows; r++) { g.beginPath(); g.moveTo(pad, pad + ih * r / this.rows); g.lineTo(pad + iw, pad + ih * r / this.rows); g.stroke(); }
    const cw = iw / this.cols, rh = ih / this.rows;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let r = 0; r < this.rows; r++) for (let i = 0; i < this.cols; i++) {
      const s = slots[r] && slots[r][i]; if (!s || !s.ch || s.ch === ' ') continue;
      const x = pad + cw * (i + 0.5), y = pad + rh * (r + 0.5);
      g.save(); g.translate(x, y + (1 - s.k) * rh * 0.9); g.rotate((1 - s.k) * (s.tilt || 0.6)); g.globalAlpha = Math.max(0, Math.min(1, s.k * 1.4));
      g.fillStyle = s.glow ? `rgba(255,${Math.round(46 + 120 * (1 - s.glow))},136,1)` : '#101010';
      g.font = `900 ${rh * 0.74}px 'Archivo Black', sans-serif`; g.fillText(s.ch, 0, 4);
      g.restore();
    }
    this.tex.needsUpdate = true;
  }
}

// a wire grid with alpha (cart baskets, the cart corral)
export function wireTexture() {
  const N = 256; const [c, g] = canvas(N, N);
  g.clearRect(0, 0, N, N); g.strokeStyle = '#ffffff'; g.lineWidth = 7;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * N / 8, 0); g.lineTo(i * N / 8, N); g.stroke(); g.beginPath(); g.moveTo(0, i * N / 8); g.lineTo(N, i * N / 8); g.stroke(); }
  const t = tex(c, { srgb: false }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// a soft round shadow (an alphaMap: grey = how dark)
export function blobTexture() {
  const N = 128; const [c, g] = canvas(N, N);
  const gr = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  // darkness lives in the colour (used as an alphaMap, which reads green)
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
  gr.addColorStop(0, 'rgb(190,190,190)'); gr.addColorStop(0.5, 'rgb(105,105,105)'); gr.addColorStop(1, 'rgb(0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, N, N);
  return tex(c, { srgb: false });
}
// a soft rectangular contact shadow (an alphaMap), for under shelves and counters
export function aoTexture() {
  const N = 128; const [c, g] = canvas(N, N);
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = Math.max(0, Math.abs(x - N / 2 + 0.5) / (N / 2) - 0.55) / 0.45, dy = Math.max(0, Math.abs(y - N / 2 + 0.5) / (N / 2) - 0.55) / 0.45;
    const d = Math.min(1, Math.hypot(dx, dy)); const a = Math.pow(1 - d, 1.6) * 0.8;
    const i = (y * N + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = a * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c, { srgb: false });
}

// a paper receipt-ish strip, the price tags along shelf edges
export function tagStrip() {
  const W = 1024, H = 32, R = rng(5); const [c, g] = canvas(W, H);
  g.fillStyle = '#f2efe6'; g.fillRect(0, 0, W, H);
  for (let x = 6; x < W; x += 40 + R() * 40) { g.fillStyle = R() < 0.2 ? '#f7d23a' : '#ffffff'; g.fillRect(x, 4, 26, H - 8); g.fillStyle = '#333'; g.fillRect(x + 4, 10, 16, 3); g.fillRect(x + 4, 17, 10, 3); }
  return tex(c, { repeat: [1, 1] });
}
