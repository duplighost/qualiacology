// Procedural materials — every surface in the manor is painted on canvas at load.
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// deterministic rng so the house always looks the same
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function noiseFill(ctx, w, h, alpha, r) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 255 * alpha;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/* ---------------- floor / wall painters ---------------- */

function woodPlanks(w, h, base, gap, seed) {
  const [c, ctx] = canvas(w, h);
  const r = rng(seed);
  const plankH = h / 8;
  for (let row = 0; row < 8; row++) {
    const off = (row % 2) * w * 0.33;
    for (let px = -1; px < 4; px++) {
      const x = ((px * w) / 3 + off) % (w + w / 3) - w / 6;
      const shade = 0.82 + r() * 0.36;
      ctx.fillStyle = `rgb(${base[0] * shade | 0},${base[1] * shade | 0},${base[2] * shade | 0})`;
      ctx.fillRect(x, row * plankH, w / 3 - 2, plankH - 2);
      // grain
      ctx.strokeStyle = `rgba(20,12,6,${0.12 + r() * 0.12})`;
      for (let g = 0; g < 5; g++) {
        ctx.beginPath();
        const gy = row * plankH + r() * plankH;
        ctx.moveTo(x, gy);
        ctx.bezierCurveTo(x + w / 9, gy + (r() - 0.5) * 6, x + w / 5, gy + (r() - 0.5) * 6, x + w / 3, gy);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = gap;
  for (let row = 0; row <= 8; row++) ctx.fillRect(0, row * plankH - 1, w, 2);
  noiseFill(ctx, w, h, 0.06, r);
  return c;
}

function damask(w, h, bg, fg, seed) {
  const [c, ctx] = canvas(w, h);
  const r = rng(seed);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  const cell = w / 4;
  for (let ix = 0; ix < 4; ix++) for (let iy = 0; iy < 4; iy++) {
    const cx = ix * cell + cell / 2 + ((iy % 2) * cell) / 2;
    const cy = iy * cell + cell / 2;
    // stylised fleuron
    ctx.save();
    ctx.translate(cx % w, cy);
    ctx.beginPath();
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      ctx.ellipse(Math.cos(a) * cell * 0.16, Math.sin(a) * cell * 0.16,
        cell * 0.13, cell * 0.05, a, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, cell * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // water stains and age
  for (let s = 0; s < 9; s++) {
    const g = ctx.createRadialGradient(r() * w, r() * h, 4, r() * w, r() * h, 30 + r() * 120);
    g.addColorStop(0, 'rgba(30,20,10,0.16)');
    g.addColorStop(1, 'rgba(30,20,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  noiseFill(ctx, w, h, 0.05, r);
  return c;
}

function stone(w, h, base, seed) {
  const [c, ctx] = canvas(w, h);
  const r = rng(seed);
  ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
  ctx.fillRect(0, 0, w, h);
  const rows = 5;
  for (let row = 0; row < rows; row++) {
    const bh = h / rows;
    const off = (row % 2) * 40;
    for (let x = -1; x < 5; x++) {
      const bw = w / 4;
      const shade = 0.75 + r() * 0.4;
      ctx.fillStyle = `rgb(${base[0] * shade | 0},${base[1] * shade | 0},${base[2] * shade | 0})`;
      ctx.fillRect((x * bw + off) % (w + bw) - bw / 2 + 2, row * bh + 2, bw - 4, bh - 4);
    }
  }
  noiseFill(ctx, w, h, 0.12, r);
  return c;
}

function carpetPattern(w, h, base, border, seed) {
  const [c, ctx] = canvas(w, h);
  const r = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const m = 14 + i * 16;
    ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  }
  ctx.fillStyle = border;
  for (let ix = 0; ix < 6; ix++) for (let iy = 0; iy < 6; iy++) {
    ctx.save();
    ctx.translate((ix + 0.5) * w / 6, (iy + 0.5) * h / 6);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  }
  noiseFill(ctx, w, h, 0.09, r);
  return c;
}

function marbleTiles(w, h, seed) {
  const [c, ctx] = canvas(w, h);
  const r = rng(seed);
  const n = 4;
  for (let ix = 0; ix < n; ix++) for (let iy = 0; iy < n; iy++) {
    const dark = (ix + iy) % 2 === 0;
    ctx.fillStyle = dark ? '#1c1a1e' : '#8d8578';
    ctx.fillRect(ix * w / n, iy * h / n, w / n, h / n);
    // veins
    ctx.strokeStyle = dark ? 'rgba(120,110,120,0.25)' : 'rgba(60,50,45,0.3)';
    ctx.lineWidth = 1.2;
    for (let v = 0; v < 4; v++) {
      ctx.beginPath();
      let vx = ix * w / n + r() * w / n, vy = iy * h / n;
      ctx.moveTo(vx, vy);
      for (let s = 0; s < 5; s++) {
        vx += (r() - 0.5) * 30; vy += w / n / 5;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }
  }
  noiseFill(ctx, w, h, 0.05, r);
  return c;
}

/* ---------------- portraits ---------------- */

// A gallery of gaunt Victorian portraits, painted procedurally.
export function portraitCanvas(seed, opts = {}) {
  const [c, ctx] = canvas(256, 320);
  const r = rng(seed);
  // murky background
  const g = ctx.createRadialGradient(128, 130, 30, 128, 160, 260);
  g.addColorStop(0, `rgb(${58 + r() * 30 | 0},${48 + r() * 20 | 0},${38 + r() * 16 | 0})`);
  g.addColorStop(1, '#0c0906');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 320);
  // shoulders / garment
  ctx.fillStyle = opts.pale ? '#d8d2c4' : `rgb(${18 + r() * 20 | 0},${14 + r() * 12 | 0},${16 + r() * 12 | 0})`;
  ctx.beginPath();
  ctx.ellipse(128, 330, 105, 120, 0, Math.PI, 0);
  ctx.fill();
  // neck + face
  const skin = `rgb(${168 + r() * 30 | 0},${140 + r() * 24 | 0},${116 + r() * 20 | 0})`;
  ctx.fillStyle = skin;
  ctx.fillRect(112, 176, 32, 40);
  ctx.beginPath();
  ctx.ellipse(128, 140, 46, 60 + r() * 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // hollow cheeks
  ctx.fillStyle = 'rgba(60,40,30,0.25)';
  ctx.beginPath(); ctx.ellipse(104, 158, 12, 20, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(152, 158, 12, 20, -0.3, 0, Math.PI * 2); ctx.fill();
  // hair
  ctx.fillStyle = `rgb(${20 + r() * 40 | 0},${16 + r() * 26 | 0},${12 + r() * 18 | 0})`;
  ctx.beginPath();
  ctx.ellipse(128, 104, 50, 40, 0, Math.PI, 0, true);
  ctx.fill();
  if (opts.woman) { // long hair
    ctx.fillRect(78, 104, 18, 90);
    ctx.fillRect(160, 104, 18, 90);
  }
  // eyes — dark, watching
  ctx.fillStyle = '#efe9dc';
  ctx.beginPath(); ctx.ellipse(110, 134, 9, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(146, 134, 9, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#100c08';
  const look = (r() - 0.5) * 5;
  ctx.beginPath(); ctx.arc(110 + look, 134, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(146 + look, 134, 3.6, 0, Math.PI * 2); ctx.fill();
  // brows, nose, grim mouth
  ctx.strokeStyle = 'rgba(30,20,14,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(99, 124); ctx.lineTo(121, 121); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(135, 121); ctx.lineTo(157, 124); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(128, 134); ctx.lineTo(125, 160); ctx.lineTo(132, 163); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(112, 180); ctx.quadraticCurveTo(128, 178 + r() * 8, 144, 180); ctx.stroke();
  // craquelure + murk
  const rr = rng(seed + 7);
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    let x = rr() * 256, y = rr() * 320;
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) { x += (rr() - 0.5) * 40; y += (rr() - 0.5) * 40; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  const vg = ctx.createRadialGradient(128, 150, 80, 128, 160, 240);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,5,2,0.72)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 256, 320);
  return c;
}

/* ---------------- book rows for shelves ---------------- */

function bookRow(seed) {
  const [c, ctx] = canvas(256, 64);
  const r = rng(seed);
  ctx.fillStyle = '#140d06';
  ctx.fillRect(0, 0, 256, 64);
  let x = 0;
  const palette = [[96, 32, 28], [40, 52, 38], [52, 42, 70], [110, 84, 40], [70, 30, 44], [36, 40, 58], [90, 70, 50]];
  while (x < 252) {
    const bw = 8 + r() * 14;
    const bh = 46 + r() * 16;
    const p = palette[(r() * palette.length) | 0];
    const shade = 0.7 + r() * 0.5;
    ctx.fillStyle = `rgb(${p[0] * shade | 0},${p[1] * shade | 0},${p[2] * shade | 0})`;
    ctx.fillRect(x, 64 - bh, bw - 1.5, bh);
    ctx.fillStyle = 'rgba(200,170,90,0.5)';
    ctx.fillRect(x + 1, 64 - bh + 6, bw - 3.5, 1.5);
    ctx.fillRect(x + 1, 56, bw - 3.5, 1.5);
    x += bw;
  }
  return c;
}

/* ---------------- material set ---------------- */

export function makeMaterials() {
  const M = {};
  const std = (o) => new THREE.MeshStandardMaterial(o);

  M.woodFloor = std({ map: tex(woodPlanks(512, 512, [122, 88, 52], '#17100a', 11), 2, 2), roughness: 0.72, metalness: 0.05 });
  M.woodFloorDark = std({ map: tex(woodPlanks(512, 512, [76, 52, 32], '#0d0906', 12), 2, 2), roughness: 0.8 });
  M.woodDark = std({ map: tex(woodPlanks(256, 256, [58, 38, 24], '#0a0705', 13), 1, 1), roughness: 0.62, metalness: 0.08 });
  M.woodMid = std({ map: tex(woodPlanks(256, 256, [96, 66, 40], '#120b06', 14), 1, 1), roughness: 0.7 });
  M.marble = std({ map: tex(marbleTiles(512, 512, 15), 3, 3), roughness: 0.32, metalness: 0.12 });
  M.marblePlain = std({ color: '#8f8672', roughness: 0.38, metalness: 0.1 });
  M.stone = std({ map: tex(stone(512, 512, [88, 84, 78], 16), 2, 2), roughness: 0.95 });
  M.stoneDark = std({ map: tex(stone(512, 512, [54, 52, 50], 17), 2, 2), roughness: 0.98 });
  M.brick = std({ map: tex(stone(512, 256, [96, 58, 44], 18), 3, 1.5), roughness: 0.95 });

  M.wallRed = std({ map: tex(damask(512, 512, '#3d1a18', 'rgba(140,70,58,0.5)', 21), 2, 1.4), roughness: 0.92 });
  M.wallGreen = std({ map: tex(damask(512, 512, '#22301f', 'rgba(96,120,80,0.42)', 22), 2, 1.4), roughness: 0.92 });
  M.wallBlue = std({ map: tex(damask(512, 512, '#1d2433', 'rgba(90,110,150,0.4)', 23), 2, 1.4), roughness: 0.92 });
  M.wallGold = std({ map: tex(damask(512, 512, '#4a3a1e', 'rgba(180,150,80,0.4)', 24), 2, 1.4), roughness: 0.9 });
  M.wallPlum = std({ map: tex(damask(512, 512, '#2e1e2e', 'rgba(140,100,140,0.35)', 25), 2, 1.4), roughness: 0.92 });
  M.plaster = std({ map: tex(damask(512, 512, '#4e463a', 'rgba(70,62,52,0.25)', 26), 2, 1.4), roughness: 0.96 });
  M.plasterOld = std({ map: tex(damask(512, 512, '#3a352c', 'rgba(50,46,38,0.3)', 27), 2, 1.4), roughness: 0.98 });

  M.ceiling = std({ color: '#3a352e', roughness: 0.98 });
  M.ceilingOrnate = std({ color: '#46402f', roughness: 0.9 });

  M.carpetRed = std({ map: tex(carpetPattern(512, 512, '#4a1616', '#8a5a2a', 31), 1, 1), roughness: 1 });
  M.carpetBlue = std({ map: tex(carpetPattern(512, 512, '#16204a', '#7a6a3a', 32), 1, 1), roughness: 1 });
  M.runner = std({ map: tex(carpetPattern(256, 512, '#3c1212', '#7a5a2a', 33), 1, 3), roughness: 1 });

  M.bookRows = [std({ map: tex(bookRow(41), 1, 1), roughness: 0.9 }),
                std({ map: tex(bookRow(42), 1, 1), roughness: 0.9 }),
                std({ map: tex(bookRow(43), 1, 1), roughness: 0.9 })];

  M.brass = std({ color: '#8a6a2a', roughness: 0.35, metalness: 0.85 });
  M.iron = std({ color: '#2a2a2e', roughness: 0.5, metalness: 0.8 });
  M.silver = std({ color: '#7a7a80', roughness: 0.3, metalness: 0.9 });
  M.candleWax = std({ color: '#d8cba8', roughness: 0.6 });
  M.flame = new THREE.MeshBasicMaterial({ color: '#ffb84d' });
  M.ember = new THREE.MeshBasicMaterial({ color: '#ff5a1a' });

  M.fabricRed = std({ color: '#5a1e1e', roughness: 1 });
  M.fabricGreen = std({ color: '#22381f', roughness: 1 });
  M.fabricDark = std({ color: '#1c1a20', roughness: 1 });
  M.curtain = std({ color: '#33121a', roughness: 1, side: THREE.DoubleSide });
  M.sheet = std({ color: '#b8b2a2', roughness: 1, side: THREE.DoubleSide });
  M.linen = std({ color: '#c8c0a8', roughness: 1 });
  M.paper = std({ color: '#d8ccaa', roughness: 0.9, side: THREE.DoubleSide });
  M.leather = std({ color: '#3c2618', roughness: 0.65 });

  M.glass = new THREE.MeshPhysicalMaterial({
    color: '#9ab0c8', transmission: 0.65, opacity: 0.5, transparent: true,
    roughness: 0.15, ior: 1.5, side: THREE.DoubleSide, depthWrite: false,
  });
  M.windowGlow = new THREE.MeshBasicMaterial({ color: '#26344e', side: THREE.DoubleSide });
  M.mirror = std({ color: '#5a6068', roughness: 0.08, metalness: 0.95 });

  M.frameGold = std({ color: '#6a5220', roughness: 0.45, metalness: 0.6 });
  M.doorWood = std({ map: tex(woodPlanks(256, 256, [70, 46, 28], '#0c0805', 51), 0.8, 1.4), roughness: 0.6 });

  M.ghost = new THREE.MeshBasicMaterial({
    color: '#b8cce8', transparent: true, opacity: 0.0, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });

  M.moon = new THREE.MeshBasicMaterial({ color: '#cdd8e8' });
  M.night = new THREE.MeshBasicMaterial({ color: '#05070c', side: THREE.BackSide });

  return M;
}

export function makePortraitTexture(seed, opts) {
  return tex(portraitCanvas(seed, opts), 1, 1);
}
