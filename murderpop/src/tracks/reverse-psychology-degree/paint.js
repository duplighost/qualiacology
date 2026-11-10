// Paintings for the sets, drawn on canvases: the lecture screen's slides (and the inkblot), the chalkboards, the
// banner's crest, the dissertations' spines, the clock face, windows, hedges, grass. Her diagrams on the screen are
// drawn mirror-wise; every word on the screen and the chalkboards reads the right way round.
import * as THREE from 'three';

export function tex(c, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// ---------------------------------------------------------------------------------------- the lecture screen
// one canvas the projector throws; draw(slide) redraws it
export class Screen {
  constructor() {
    this.c = canvas(1024, 352); this.g = this.c.getContext('2d');
    this.t = tex(this.c); this.slide = -1;
  }
  // 0: the first slide (sign 1); 1..4: her diagrams; 'ink' with k: the Rorschach bleeding down it
  draw(slide, k = 0) {
    const g = this.g, W = 1024, H = 352;
    if (slide === this.slide && slide !== 'ink') return;
    this.slide = slide;
    g.save();
    g.fillStyle = '#f2efe6'; g.fillRect(0, 0, W, H);
    // a projector's falloff
    const vg = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(40,30,30,0.28)');
    if (slide === 0) {
      // the line above YOUR shadow, not across it: the projector throws the shadow on the middle of the screen with
      // its head about halfway up, and she stands in front of the left of it. Low and centred, both covered it.
      g.fillStyle = '#5a0c1c'; g.textAlign = 'right'; g.textBaseline = 'middle';
      const x1 = W - 40, wMax = W - 340;
      let px = 54; g.font = `700 ${px}px Fraunces, Georgia, serif`;
      const wide = Math.max(g.measureText('GOT MY PhD IN').width, g.measureText('FUCKING WITH YOUR HEAD').width);
      if (wide > wMax) { px = Math.floor(px * wMax / wide); g.font = `700 ${px}px Fraunces, Georgia, serif`; }
      g.fillText('GOT MY PhD IN', x1, H * 0.13);
      g.fillText('FUCKING WITH YOUR HEAD', x1, H * 0.13 + px * 1.1);
      g.strokeStyle = '#5a0c1c'; g.lineWidth = 3; g.strokeRect(x1 - Math.min(wide, wMax) - 24, H * 0.13 - px * 0.75, Math.min(wide, wMax) + 48, px * 2.6);
    } else if (slide === 'ink') {
      this._ink(g, W, H, k);
    } else {
      // her diagrams, drawn mirror-wise: a brain, arrows, a target round a stick figure (the words in them are flipped
      // back where they're written, so they read, and sit where they always did)
      g.translate(W, 0); g.scale(-1, 1);
      const write = (s, x, y) => { g.save(); g.translate(x, y); g.scale(-1, 1); g.textAlign = 'right'; g.fillText(s, 0, 0); g.restore(); };
      g.strokeStyle = '#3a1a1a'; g.fillStyle = '#3a1a1a'; g.lineWidth = 5; g.lineCap = 'round';
      const v = slide % 4;
      if (v === 1 || v === 3) { // the brain in profile, gyri scribbled
        g.beginPath(); g.ellipse(300, 176, 170, 120, 0, 0, Math.PI * 2); g.stroke();
        seed = 11 + v; for (let i = 0; i < 14; i++) { g.beginPath(); let x = 170 + rnd() * 260, y = 90 + rnd() * 170; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rnd() - 0.5) * 70; y += (rnd() - 0.5) * 50; g.quadraticCurveTo(x + 20, y - 20, x, y); } g.stroke(); }
        g.beginPath(); g.moveTo(520, 176); g.lineTo(700, 176); g.moveTo(680, 160); g.lineTo(700, 176); g.lineTo(680, 192); g.stroke();
      }
      if (v === 2 || v === 3) { // a target round a stick figure
        const cx = v === 2 ? 340 : 820, cy = 180;
        for (const r of [130, 92, 54]) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
        g.beginPath(); g.arc(cx, cy - 34, 12, 0, Math.PI * 2); g.moveTo(cx, cy - 22); g.lineTo(cx, cy + 22); g.moveTo(cx - 20, cy - 4); g.lineTo(cx + 20, cy - 4); g.moveTo(cx, cy + 22); g.lineTo(cx - 14, cy + 46); g.moveTo(cx, cy + 22); g.lineTo(cx + 14, cy + 46); g.stroke();
      }
      if (v === 0 || v === 2) { // arrows and her scrawl
        seed = 31 + v; g.font = 'italic 700 34px Fraunces, Georgia, serif';
        for (let i = 0; i < 5; i++) { const y = 70 + i * 52; write(['ego ⇄ id', 'yes = no', 'Δ doubt ∝ t', 'you → me', 'Q.E.D.'][i], 600 + rnd() * 120, y); }
        g.beginPath(); g.moveTo(560, 300); g.bezierCurveTo(470, 330, 420, 240, 470, 200); g.stroke();
      }
    }
    g.restore();
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    this.t.needsUpdate = true;
  }
  // a perfectly symmetric blot dropping onto the slide and bleeding down it
  _ink(g, W, H, k) {
    g.fillStyle = '#f2efe6'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, 0);
    const grow = Math.min(1, k * 1.6), drip = Math.max(0, k * 1.4 - 0.25);
    g.fillStyle = '#060406';
    for (const s of [-1, 1]) {
      g.save(); g.scale(s, 1);
      seed = 5;
      g.beginPath(); g.moveTo(0, 30);
      const pts = 16;
      for (let i = 0; i <= pts; i++) {
        const a = -Math.PI / 2 + i / pts * Math.PI;
        const r = (60 + 120 * rnd()) * grow + 10;
        g.lineTo(Math.cos(a) * r * 1.6 + 40 * grow, H * 0.42 + Math.sin(a) * r * 0.85);
      }
      g.lineTo(0, H * 0.42 + 120 * grow); g.closePath(); g.fill();
      // drips down the screen
      seed = 9;
      for (let i = 0; i < 6; i++) { const x = 20 + rnd() * 240 * grow, w = 6 + rnd() * 12, len = (0.25 + rnd() * 0.75) * drip * H * 0.9; g.fillRect(x, H * 0.45, w, len); g.beginPath(); g.arc(x + w / 2, H * 0.45 + len, w * 0.8, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
    g.restore();
  }
}

// ---------------------------------------------------------------------------------------- slate, crest, spines, clock
export function chalkboard() {
  const c = canvas(512, 280), g = c.getContext('2d');
  g.fillStyle = '#1d2420'; g.fillRect(0, 0, 512, 280);
  seed = 3;
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(230,230,220,${rnd() * 0.05})`; g.fillRect(rnd() * 512, rnd() * 280, 2 + rnd() * 6, 1 + rnd() * 3); }
  g.strokeStyle = 'rgba(240,238,228,0.75)'; g.fillStyle = 'rgba(240,238,228,0.8)'; g.lineWidth = 2.5; g.lineCap = 'round';
  g.font = 'italic 26px Fraunces, Georgia, serif';
  for (let i = 0; i < 6; i++) g.fillText(['∂(you)/∂t < 0', 'denial ≡ assent', 'p(leave) → 0', 'shame × love = ?', 'reverse(x) = x', 'I ⊃ you'][i], 24 + (i % 2) * 230, 46 + Math.floor(i / 2) * 70);
  g.beginPath(); g.arc(420, 220, 34, 0, Math.PI * 2); g.moveTo(386, 220); g.lineTo(454, 220); g.moveTo(420, 186); g.lineTo(420, 254); g.stroke();
  g.beginPath(); g.moveTo(60, 250); g.bezierCurveTo(140, 190, 220, 270, 300, 230); g.stroke();
  return tex(c);
}

// the university crest (book, eye, laurel) in gold on crimson velvet
export function banner(w = 512, h = 230, { star = false } = {}) {
  const c = canvas(w, h), g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#6e0a18'); grd.addColorStop(1, '#8e0e1f');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  seed = 21; for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,180,190'},${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 2, 6); }
  for (let x = 0; x < w; x += 22) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, 0, 6, h); }
  g.strokeStyle = '#e8b84a'; g.fillStyle = '#e8b84a'; g.lineWidth = 4;
  g.strokeRect(10, 10, w - 20, h - 20);
  g.save(); g.translate(w / 2, h * 0.42); g.scale(0.36, 0.36);
  // book
  g.lineWidth = 9; g.beginPath(); g.moveTo(0, -30); g.bezierCurveTo(-60, -60, -130, -55, -170, -35); g.lineTo(-170, 110); g.bezierCurveTo(-130, 90, -60, 92, 0, 120); g.bezierCurveTo(60, 92, 130, 90, 170, 110); g.lineTo(170, -35); g.bezierCurveTo(130, -55, 60, -60, 0, -30); g.stroke();
  g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 120); g.stroke();
  // eye
  g.beginPath(); g.moveTo(-95, -120); g.quadraticCurveTo(0, -190, 95, -120); g.quadraticCurveTo(0, -50, -95, -120); g.stroke();
  g.beginPath(); g.arc(0, -120, 26, 0, Math.PI * 2); g.fill();
  // laurel
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { const a = Math.PI * (0.65 + 0.07 * i); g.save(); g.translate(s * Math.cos(a) * -260, Math.sin(a) * -260 + 60); g.rotate(s * (a - 1.2)); g.beginPath(); g.ellipse(0, 0, 12, 30, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.restore();
  return tex(c);
}

export function spine(title) {
  const c = canvas(256, 512), g = c.getContext('2d');
  g.fillStyle = '#7a0d1b'; g.fillRect(0, 0, 256, 512);
  seed = title.length * 13;
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`; g.fillRect(rnd() * 256, rnd() * 512, 3 + rnd() * 8, 2 + rnd() * 5); }
  g.fillStyle = '#e8b84a';
  for (const y of [34, 54, 456, 476]) g.fillRect(14, y, 228, 7);
  g.save(); g.translate(128, 260); g.rotate(-Math.PI / 2); g.scale(-1, 1);
  g.font = '700 30px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(title, 0, 0);
  g.restore();
  return tex(c);
}

export function clockFace() {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#f1ebdc'; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#1a1414'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#1a1414'; g.font = '700 26px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const nums = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i++) { const a = -i / 12 * Math.PI * 2 - Math.PI / 2; g.save(); g.translate(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96); g.scale(-1, 1); g.fillText(nums[i], 0, 0); g.restore(); }   // the numbers run backwards
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; g.fillRect(128 + Math.cos(a) * 112 - 1.5, 128 + Math.sin(a) * 112 - 1.5, 3, i % 5 ? 3 : 8); }
  return tex(c);
}

// lit windows on a brick range: rows of warm mullioned windows, some dark
export function windows(cols = 24, rows = 5) {
  const c = canvas(1024, 256), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 256);
  seed = 77;
  const cw = 1024 / cols, rh = 256 / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (rnd() < 0.3) continue;
    const warm = 0.55 + rnd() * 0.45;
    g.fillStyle = `rgb(${Math.round(255 * warm)},${Math.round(176 * warm)},${Math.round(98 * warm)})`;
    const x = i * cw + cw * 0.25, y = j * rh + rh * 0.18, w = cw * 0.5, h = rh * 0.62;
    g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w * 0.5); g.arc(x + w / 2, y + w * 0.5, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill();
    g.fillStyle = '#000'; g.fillRect(x + w / 2 - 1, y, 2, h); g.fillRect(x, y + h * 0.55, w, 2);
  }
  return tex(c);
}
export function brick() {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#3a1712'; g.fillRect(0, 0, 256, 256);
  seed = 5;
  for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < 256; x += 32) { const v = 40 + rnd() * 30; g.fillStyle = `rgb(${v + 50},${v * 0.45},${v * 0.35})`; g.fillRect(x + 1, y + 1, 30, 14); }
  return tex(c, { repeat: [1, 1] });
}
export function leaves(base = [22, 46, 26]) {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = `rgb(${base.join(',')})`; g.fillRect(0, 0, 256, 256);
  seed = 9;
  for (let i = 0; i < 2600; i++) { const v = rnd(); g.fillStyle = `rgba(${Math.round(base[0] * (0.4 + v))},${Math.round(base[1] * (0.4 + v))},${Math.round(base[2] * (0.4 + v))},0.8)`; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 2 + rnd() * 4, 1 + rnd() * 2, rnd() * 3, 0, Math.PI * 2); g.fill(); }
  return tex(c, { repeat: [1, 1] });
}
// tall arched windows on a cold night (the exam hall)
export function archWindow() {
  const c = canvas(128, 256), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 256);
  const grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#24345c'); grd.addColorStop(1, '#0c1222');
  g.fillStyle = grd; g.beginPath(); g.moveTo(14, 250); g.lineTo(14, 64); g.arc(64, 64, 50, Math.PI, 0); g.lineTo(114, 250); g.closePath(); g.fill();
  g.fillStyle = '#000'; for (let x = 38; x < 114; x += 26) g.fillRect(x, 20, 3, 236); for (let y = 90; y < 250; y += 40) g.fillRect(14, y, 100, 3);
  return tex(c);
}
