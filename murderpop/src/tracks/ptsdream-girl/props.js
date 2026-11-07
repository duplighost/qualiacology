// The set pieces of your life, modelled in code: rooms that fly in on cables, each piece standing on the stage floor
// at its landed place (origin at its footprint's centre, y = 0 on the floor). Painted surfaces are canvases.
// Two worlds: yours (cool and pretty: powder blue, mint, cream, honey oak, brass) and hers (lipstick red, hot pink,
// black lacquer, gold). Everything glossy where the design says lacquered.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { grenadeGeometry } from './girl.js';

const TAU = Math.PI * 2;
const C = (h) => new THREE.Color(h);
let RNG = 12345;
const rnd = () => { RNG = (RNG * 16807) % 2147483647; return RNG / 2147483647; };

// ---------------------------------------------------------------- materials
const MC = new Map();
// the physical model only where a coat, sheen or transmission needs it; the standard one is much cheaper
export function M(key, o) { if (!MC.has(key)) MC.set(key, (o.clearcoat || o.sheen || o.transmission || o.iridescence) ? new THREE.MeshPhysicalMaterial(o) : new THREE.MeshStandardMaterial(o)); return MC.get(key); }
export const MAT = {
  gold: () => M('gold', { color: 0xe9b949, metalness: 1, roughness: 0.24 }),
  brass: () => M('brass', { color: 0xb8893a, metalness: 1, roughness: 0.3 }),
  chrome: () => M('chrome', { color: 0xdfe4ec, metalness: 1, roughness: 0.07 }),
  steel: () => M('steel', { color: 0xc9ccd2, metalness: 0.85, roughness: 0.32 }),
  white: () => M('white', { color: 0xf3eee6, roughness: 0.42 }),
  gloss: () => M('gloss', { color: 0xf6f2ec, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05 }),
  mint: () => M('mint', { color: 0x9fdcc0, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04 }),
  red: () => M('red', { color: 0xc40c2a, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.03 }),
  black: () => M('black', { color: 0x0b0709, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 }),
  velvetRed: () => M('velvetRed', { color: 0x7a0818, roughness: 0.75, sheen: 1, sheenColor: C(0xff5070), sheenRoughness: 0.4 }),
  velvetCream: () => M('velvetCream', { color: 0xeee0cc, roughness: 0.8, sheen: 1, sheenColor: C(0xfff4e6), sheenRoughness: 0.45 }),
  velvetTeal: () => M('velvetTeal', { color: 0x0c5e5a, roughness: 0.78, sheen: 1, sheenColor: C(0x6af0e0), sheenRoughness: 0.4 }),
  leather: () => M('leather', { color: 0x4a0a12, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
  walnut: () => M('walnut', { color: 0x4a2a18, roughness: 0.38, clearcoat: 0.5 }),
  oak: () => M('oak', { color: 0xc89b62, roughness: 0.3, clearcoat: 0.8 }),
  frost: () => M('frost', { color: 0xe8f0f4, roughness: 0.4, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }),
  glass: () => M('glass', { color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, clearcoat: 1, side: THREE.DoubleSide }),
  mirror: () => M('mirror', { color: 0xcfd6e4, metalness: 1, roughness: 0.05 }),
  wax: () => M('wax', { color: 0xf3ead8, roughness: 0.5 }),
  terracotta: () => M('terracotta', { color: 0xc06a44, roughness: 0.7 }),
  leaf: () => M('leaf', { color: 0x2f6e3a, roughness: 0.45, side: THREE.DoubleSide }),
  porcelain: () => M('porcelain', { color: 0xf6f2ec, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 }),
  cloth: () => M('cloth', { color: 0xf6f2ee, roughness: 0.85 }),
  card: () => M('card', { color: 0xc89c6a, roughness: 0.9 }),
};
export const glowMat = (hex, k = 3) => new THREE.MeshBasicMaterial({ color: C(hex).multiplyScalar(k) });

// ---------------------------------------------------------------- geometry
export function mesh(geo, mat, { cast = true, recv = true, name = '' } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; m.name = name; return m; }
export function rbox(w, h, d, mat, r = 0.02, o = {}) { const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)); g.translate(0, h / 2, 0); return mesh(g, mat, o); }
export function box(w, h, d, mat, o = {}) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return mesh(g, mat, o); }
export function cyl(r0, r1, h, mat, seg = 24, o = {}) { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(0, h / 2, 0); return mesh(g, mat, o); }
export function lathe(pts, mat, seg = 32, o = {}) { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), seg); return mesh(g, mat, o); }
export function tube(pts, r, mat, { seg = 24, rs = 6, closed = false } = {}, o = {}) { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed), seg, r, rs, closed); return mesh(g, mat, o); }
export function at(o, x, y, z, ry = 0) { o.position.set(x, y, z); o.rotation.y = ry; return o; }
export function grp(...ch) { const g = new THREE.Group(); for (const c of ch) if (c) g.add(c); return g; }

// ---------------------------------------------------------------- canvases
export function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); return c; }
export function tex(c, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
function noiseDots(g, w, h, n, colors, rmin = 0.6, rmax = 1.6) { for (let i = 0; i < n; i++) { g.fillStyle = colors[(rnd() * colors.length) | 0]; g.beginPath(); g.arc(rnd() * w, rnd() * h, rmin + rnd() * (rmax - rmin), 0, TAU); g.fill(); } }
const SCRIPT = 'italic 700 FONTpx Fraunces, Georgia, serif';
const SANS = '900 FONTpx "Archivo Black", Arial Black, sans-serif';
const HAND = 'italic 500 FONTpx "Segoe Script", "Brush Script MT", cursive';
const font = (f, px) => f.replace('FONT', Math.round(px));

// ---------------------------------------------------------------- the floors (one canvas each over the stage floor)
// the stage floor mesh spans x -12.4..12.4 and z -9.0..8.4 (canvas top = the back of the stage)
export const FLOOR = { x0: -12.4, x1: 12.4, z0: -9.0, z1: 8.4 };
export function floorPainter(W, H) {
  const sx = W / (FLOOR.x1 - FLOOR.x0), sz = H / (FLOOR.z1 - FLOOR.z0);
  return { W, H, X: (x) => (x - FLOOR.x0) * sx, Z: (z) => (z - FLOOR.z0) * sz, S: (m) => m * sx, SZ: (m) => m * sz };
}
export function paintFloors(W = 3072, H = 2160) {
  const P = floorPainter(W, H);
  const out = {};
  // A: YOUR PLACE. Herringbone honey oak; the bathroom in powder-blue hex tile; the kitchen in mint-and-white checker;
  // a round blush rug at (0, +1)
  out.A = canvas(W, H, (g) => {
    g.fillStyle = '#b8874f'; g.fillRect(0, 0, W, H);
    const pw = 0.62, ph = 0.1;
    g.save(); g.translate(P.X(0), P.Z(0)); g.scale(P.S(1), P.SZ(1));
    for (let i = -60; i < 60; i++) for (let j = -40; j < 40; j++) {
      const x = i * ph * 2, z = j * ph * 2 + i * ph * 2;
      if (Math.abs(x) > 13 || Math.abs(z) > 10) continue;
      for (const [ox, oz, rot] of [[0, 0, 0], [ph, -ph, 1]]) {
        const tone = 0.86 + rnd() * 0.22, c = [200 * tone, 152 * tone, 96 * tone].map((v) => Math.min(255, v | 0));
        g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        g.save(); g.translate(x + ox, z + oz); g.rotate(rot ? -Math.PI / 4 : Math.PI / 4);
        g.fillRect(0, 0, pw, ph); g.strokeStyle = 'rgba(70,40,18,0.55)'; g.lineWidth = 0.006; g.strokeRect(0, 0, pw, ph);
        g.fillStyle = `rgba(90,55,25,${0.08 + rnd() * 0.08})`; for (let k = 0; k < 3; k++) g.fillRect(rnd() * pw, rnd() * ph * 0.8, pw * 0.4, 0.004);
        g.restore();
      }
    }
    g.restore();
    // the bathroom: hex tile
    const bx0 = P.X(-12.4), bx1 = P.X(-4), bz0 = P.Z(-9), bz1 = P.Z(-2.5);
    g.save(); g.beginPath(); g.rect(bx0, bz0, bx1 - bx0, bz1 - bz0); g.clip();
    g.fillStyle = '#eef3f6'; g.fillRect(bx0, bz0, bx1 - bx0, bz1 - bz0);
    const hr = P.S(0.11), hw = hr * Math.sqrt(3);
    for (let yy = bz0 - hr; yy < bz1 + hr; yy += hr * 1.5) for (let xx = bx0 - hw, k = 0; xx < bx1 + hw; xx += hw, k++) {
      const off = (Math.round((yy - bz0) / (hr * 1.5)) % 2) * hw / 2;
      const cx = xx + off, cy = yy; const v = 0.9 + rnd() * 0.12;
      g.fillStyle = `rgb(${(178 * v) | 0},${(208 * v) | 0},${(230 * v) | 0})`;
      g.beginPath(); for (let a = 0; a < 6; a++) { const an = Math.PI / 6 + a * Math.PI / 3; const px = cx + Math.cos(an) * hr * 0.9, py = cy + Math.sin(an) * hr * 0.9; a ? g.lineTo(px, py) : g.moveTo(px, py); } g.fill();
    }
    g.restore();
    // the kitchen: mint and white checker
    const kx0 = P.X(4), kx1 = P.X(12.4), kz0 = P.Z(-9), kz1 = P.Z(-2.5);
    const ts = 0.5;
    for (let x = 4; x < 12.4; x += ts) for (let z = -9; z < -2.5; z += ts) {
      const odd = (Math.round((x - 4) / ts) + Math.round((z + 9) / ts)) % 2;
      g.fillStyle = odd ? '#a8dcc4' : '#f4f6f2'; g.fillRect(P.X(x), P.Z(z), P.S(ts) + 1, P.SZ(ts) + 1);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(P.X(x) + 3, P.Z(z) + 3, P.S(ts) * 0.4, P.SZ(ts) * 0.08);
    }
    g.strokeStyle = 'rgba(40,60,50,0.35)'; g.lineWidth = 2; g.strokeRect(kx0, kz0, kx1 - kx0, kz1 - kz0);
    g.strokeStyle = 'rgba(40,60,70,0.35)'; g.strokeRect(bx0, bz0, bx1 - bx0, bz1 - bz0);
    // the round blush rug
    const rx = P.X(0), rz = P.Z(1), rr = P.S(3);
    const gr = g.createRadialGradient(rx, rz, 0, rx, rz, rr); gr.addColorStop(0, '#f2c4c8'); gr.addColorStop(0.9, '#e9adb4'); gr.addColorStop(1, '#d99aa2');
    g.fillStyle = gr; g.beginPath(); g.ellipse(rx, rz, rr, P.SZ(3), 0, 0, TAU); g.fill();
    g.strokeStyle = '#f8dfe0'; g.lineWidth = P.S(0.06); g.beginPath(); g.ellipse(rx, rz, rr * 0.93, P.SZ(3) * 0.93, 0, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(200,120,130,0.6)'; g.lineWidth = P.S(0.02); g.beginPath(); g.ellipse(rx, rz, rr * 0.6, P.SZ(3) * 0.6, 0, 0, TAU); g.stroke();
    noiseDots(g, W, H, 9000, ['rgba(255,255,255,0.04)', 'rgba(0,0,0,0.05)'], 0.5, 1.4);
  });
  // B: THE 24-HOUR STORE. Speckled vinyl tile, high gloss. Grey-green, not white: under the store's hard light a
  // white floor washed out every white warning shape (the barcode, the stomp) to an outline
  out.B = canvas(W, H, (g) => {
    g.fillStyle = '#8f9893'; g.fillRect(0, 0, W, H);
    const ts = 0.6;
    for (let x = -12.6; x < 12.6; x += ts) for (let z = -9.2; z < 8.6; z += ts) { const v = 0.93 + rnd() * 0.09; g.fillStyle = `rgb(${(160 * v) | 0},${(170 * v) | 0},${(164 * v) | 0})`; g.fillRect(P.X(x) + 1, P.Z(z) + 1, P.S(ts) - 2, P.SZ(ts) - 2); }
    noiseDots(g, W, H, 60000, ['#6d7570', '#b9c0ba', '#58625e', '#b88088', '#7f99a6'], 0.6, 1.5);
  });
  // D: THE BEDROOM, OCTOBER. Cream wool carpet, a sheepskin rug at the foot of the bed
  out.D = canvas(W, H, (g) => {
    g.fillStyle = '#e6d9c2'; g.fillRect(0, 0, W, H);
    noiseDots(g, W, H, 140000, ['rgba(255,250,240,0.35)', 'rgba(160,140,110,0.18)', 'rgba(120,100,80,0.12)'], 0.5, 1.3);
    const cx = P.X(0), cz = P.Z(-0.9);
    g.fillStyle = '#f7f1e8'; g.beginPath();
    for (let a = 0; a < TAU; a += 0.05) { const r = 1 + 0.07 * Math.sin(a * 9) + 0.04 * Math.sin(a * 23); const px = cx + Math.cos(a) * P.S(1.45) * r, pz = cz + Math.sin(a) * P.SZ(0.95) * r; a ? g.lineTo(px, pz) : g.moveTo(px, pz); }
    g.fill();
    noiseDots(g, W, H, 0, []);
    for (let i = 0; i < 2500; i++) { const a = rnd() * TAU, r = rnd(); g.fillStyle = `rgba(${200 + rnd() * 40},${190 + rnd() * 40},${170 + rnd() * 40},0.5)`; g.fillRect(cx + Math.cos(a) * P.S(1.35) * r, cz + Math.sin(a) * P.SZ(0.85) * r, 2, 3); }
  });
  // E: THE JOURNAL. An open two-page spread across the floor: cream paper, pale blue rules every 0.8 m along x,
  // red margins at x -9.4 and x +1.6, the spine down x = 0; your handwriting in blue ink, crossed out; her
  // lipstick in the margins; the bottom margin (z > 4.4) is blank
  out.E = canvas(W, H, (g) => {
    g.fillStyle = '#f2ead8'; g.fillRect(0, 0, W, H);
    // the spine's shadow
    const sg = g.createLinearGradient(P.X(-1.2), 0, P.X(1.2), 0); sg.addColorStop(0, 'rgba(120,100,70,0)'); sg.addColorStop(0.5, 'rgba(120,100,70,0.35)'); sg.addColorStop(1, 'rgba(120,100,70,0)');
    g.fillStyle = sg; g.fillRect(P.X(-1.2), 0, P.X(1.2) - P.X(-1.2), H);
    g.strokeStyle = 'rgba(110,150,200,0.55)'; g.lineWidth = P.SZ(0.035);
    for (let z = -6.4; z < 4.4; z += 0.8) { g.beginPath(); g.moveTo(P.X(-11.2), P.Z(z)); g.lineTo(P.X(11.2), P.Z(z)); g.stroke(); }
    g.strokeStyle = 'rgba(210,60,70,0.7)'; g.lineWidth = P.S(0.04);
    for (const x of [-9.4, 1.6]) { g.beginPath(); g.moveTo(P.X(x), P.Z(-9)); g.lineTo(P.X(x), P.Z(8.4)); g.stroke(); }
    // your handwriting, blue biro, crossed out
    // (not her rule: the fight teaches that by itself)
    const lines = ['i am fine i am fine', 'she is not here', 'three years', 'breathe in for four', 'it was not my fault', 'i slept with the light on', 'new girl is kind', 'do not text her'];
    g.textBaseline = 'middle';
    let k = 0;
    for (let z = -6.0; z < 4.0; z += 0.8, k++) for (const xs of [-8.9, 2.1]) {
      if (rnd() < 0.35) continue;
      const txt = lines[(k + (xs > 0 ? 3 : 0)) % lines.length];
      g.font = font(HAND, P.SZ(0.42)); g.fillStyle = 'rgba(30,50,140,0.75)';
      const x = P.X(xs + rnd() * 1.5), y = P.Z(z + 0.38);
      g.fillText(txt, x, y);
      if (rnd() < 0.6) { const w = g.measureText(txt).width; g.strokeStyle = 'rgba(30,50,140,0.7)'; g.lineWidth = P.SZ(0.03); g.beginPath(); g.moveTo(x - 4, y + (rnd() - 0.5) * 6); for (let s = 0; s < w; s += 18) g.lineTo(x + s, y + Math.sin(s * 0.3) * 5); g.stroke(); }
    }
    // her lipstick in the margins
    g.font = font(SCRIPT, P.SZ(0.6)); g.fillStyle = 'rgba(210,10,40,0.8)';
    for (const [x, z, t] of [[-10.6, -4.2, 'xo'], [-10.7, 0.6, 'mine'], [0.6, -2.4, 'xx'], [0.4, 2.2, '♥']]) { g.save(); g.translate(P.X(x), P.Z(z)); g.rotate(-0.4); g.fillText(t, 0, 0); g.restore(); }
    for (let i = 0; i < 4; i++) { const x = P.X(-10.4 + (i % 2) * 11), z = P.Z(-5 + i * 2.6); g.fillStyle = 'rgba(220,20,50,0.55)'; g.beginPath(); g.ellipse(x, z, P.S(0.18), P.SZ(0.09), 0.3, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x + P.S(0.1), z + P.SZ(0.1), P.S(0.16), P.SZ(0.08), -0.3, 0, TAU); g.fill(); }
    // the page edge and the bottom margin
    g.strokeStyle = 'rgba(150,130,100,0.6)'; g.lineWidth = P.SZ(0.05); g.beginPath(); g.moveTo(P.X(-11.2), P.Z(4.4)); g.lineTo(P.X(11.2), P.Z(4.4)); g.stroke();
    g.fillStyle = 'rgba(80,60,40,0.18)'; g.fillRect(P.X(-12.4), P.Z(6.9), W, P.SZ(1.6));
    noiseDots(g, W, H, 30000, ['rgba(120,100,70,0.06)', 'rgba(255,255,255,0.12)'], 0.5, 1.6);
  });
  // F: THE WATER. Dark, nearly black, a little blue
  // light floors are toned down so white and pink telegraphs read on them
  const tone = (c, hex) => { const g = c.getContext('2d'); g.globalCompositeOperation = 'multiply'; g.fillStyle = hex; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; };
  tone(out.B, '#7d8784'); tone(out.D, '#8f877c'); tone(out.E, '#9c968a');
  out.F = canvas(1024, 720, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, w * 0.7); gr.addColorStop(0, '#0a1626'); gr.addColorStop(1, '#03070e'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  return out;
}
// roughness/metal (G/B) per floor, small
export function ormCanvas(rough, metal = 0, var1 = 0) { return canvas(64, 64, (g) => { for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) { const r = Math.max(0, Math.min(255, (rough + (rnd() - 0.5) * var1) * 255)); g.fillStyle = `rgb(255,${r | 0},${(metal * 255) | 0})`; g.fillRect(i, j, 1, 1); } }); }
export function rippleNormal() {
  return canvas(512, 512, (g, w, h) => {
    const img = g.createImageData(w, h);
    const waves = Array.from({ length: 9 }, () => ({ kx: (rnd() - 0.5) * 0.12, kz: (rnd() - 0.5) * 0.12, p: rnd() * TAU, a: 0.4 + rnd() }));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let dx = 0, dz = 0;
      for (const v of waves) { const kx = Math.round(v.kx * w / TAU) * TAU / w, kz = Math.round(v.kz * h / TAU) * TAU / h; const c = Math.cos(x * kx + y * kz + v.p) * v.a; dx += c * kx * 6; dz += c * kz * 6; }
      const i = (y * w + x) * 4; img.data[i] = 128 + dx * 60; img.data[i + 1] = 128 + dz * 60; img.data[i + 2] = 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
}

// ---------------------------------------------------------------- flats (a wall 22 m across, 4.2 m tall, painted)
const FW = 22.4, FH = 4.4;
function flatMesh(c, w = FW, h = FH, depth = 0.16) {
  const t = tex(c);
  const front = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.55 });
  const edge = MAT.white();
  const g = new THREE.BoxGeometry(w, h, depth); g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, [edge, edge, edge, edge, front, edge]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const FPX = 180;  // px per metre on the flats
function flatCanvas(paint) { return canvas(Math.round(FW * FPX / 2) * 2 > 4096 ? 4032 : Math.round(FW * FPX), Math.round(FH * FPX * (4032 / (FW * FPX) < 1 ? 4032 / (FW * FPX) : 1)), (g, w, h) => { const s = w / FW; g.save(); g.scale(s, s); paint(g, s); g.restore(); }); }
// in a flat's paint(), x runs -11.2..11.2 (left to right), y runs 0..4.4 (floor up): convert
const FX = (x) => x + FW / 2, FY = (y) => FH - y;

function tiles(g, x0, x1, y0, y1, tw, th, base, grout, vary = 0.08, offset = 0) {
  g.fillStyle = grout; g.fillRect(FX(x0), FY(y1), x1 - x0, y1 - y0);
  for (let y = y0, r = 0; y < y1; y += th, r++) for (let x = x0 - ((r % 2) * offset * tw); x < x1; x += tw) {
    const v = 1 - vary / 2 + rnd() * vary; const c = C(base); g.fillStyle = `rgb(${Math.min(255, c.r * 255 * v) | 0},${Math.min(255, c.g * 255 * v) | 0},${Math.min(255, c.b * 255 * v) | 0})`;
    g.fillRect(FX(Math.max(x0, x)) + 0.006, FY(Math.min(y1, y + th)) + 0.006, Math.min(tw, x1 - x) - 0.012, Math.min(th, y1 - y) - 0.012);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(FX(Math.max(x0, x)) + 0.02, FY(Math.min(y1, y + th)) + 0.02, (Math.min(tw, x1 - x)) * 0.5, 0.012);
  }
}
function moulding(g, x0, y0, x1, y1, col = 'rgba(255,255,255,0.9)', w = 0.025) { g.strokeStyle = col; g.lineWidth = w; g.strokeRect(FX(x0), FY(y1), x1 - x0, y1 - y0); g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = w * 0.5; g.strokeRect(FX(x0) + w, FY(y1) + w, x1 - x0 - 2 * w, y1 - y0 - 2 * w); }

// A: the back flat of your place: bathroom tile | blush plaster with the gold mirror | mint kitchen with the window
export function backFlatA() {
  const c = flatCanvas((g) => {
    // bathroom: powder-blue zellige
    tiles(g, -11.2, -3.7, 0, 4.4, 0.15, 0.15, '#a9cde6', '#eef4f7', 0.16);
    // living room: blush plaster, white mouldings, a gold picture rail, six pale rectangles where her pictures hung
    g.fillStyle = '#e8b9b6'; g.fillRect(FX(-3.7), FY(4.4), 7.4, 4.4);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.05})`; g.fillRect(FX(-3.7 + rnd() * 7.4), FY(rnd() * 4.4), 0.3, 0.2); }
    g.fillStyle = '#f7f1ea'; g.fillRect(FX(-3.7), FY(0.14), 7.4, 0.14); g.fillRect(FX(-3.7), FY(0.95), 7.4, 0.05);
    for (const [x0, x1] of [[-3.5, -1.2], [1.2, 3.5]]) moulding(g, x0, 0.18, x1, 0.86), moulding(g, x0, 1.1, x1, 3.0);
    g.fillStyle = '#d9a644'; g.fillRect(FX(-3.7), FY(3.22), 7.4, 0.04);
    for (const [x, y, w, h] of [[-3.2, 1.6, 0.7, 0.9], [-2.2, 2.0, 0.5, 0.6], [-2.9, 2.75, 0.9, 0.4], [1.6, 1.5, 0.8, 1.0], [2.7, 2.1, 0.6, 0.5], [2.2, 2.8, 0.5, 0.35]]) { g.fillStyle = 'rgba(255,236,232,0.55)'; g.fillRect(FX(x), FY(y + h), w, h); }
    g.fillStyle = '#b8893a'; g.beginPath(); g.arc(FX(-2.0), FY(2.9), 0.025, 0, TAU); g.fill();
    // kitchen: mint lacquer cabinets, open shelves, a counter
    g.fillStyle = '#f3efe8'; g.fillRect(FX(3.7), FY(4.4), 7.5, 4.4);
    tiles(g, 3.7, 11.2, 0.95, 1.5, 0.15, 0.075, '#ffffff', '#dfe4e0', 0.05, 0.5);
    for (let x = 3.75; x < 11.1; x += 0.6) { g.fillStyle = '#9fdcc0'; g.fillRect(FX(x), FY(0.9), 0.56, 0.78); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.012; g.strokeRect(FX(x) + 0.05, FY(0.85), 0.46, 0.68); g.fillStyle = '#d9a644'; g.fillRect(FX(x + 0.24), FY(0.8), 0.08, 0.015); }
    g.fillStyle = '#f6f2ec'; g.fillRect(FX(3.7), FY(0.98), 7.5, 0.08);
    for (let x = 3.75; x < 6.3; x += 0.6) { g.fillStyle = '#9fdcc0'; g.fillRect(FX(x), FY(2.7), 0.56, 0.95); g.fillStyle = '#d9a644'; g.fillRect(FX(x + 0.24), FY(1.85), 0.08, 0.015); }
    for (const y of [2.0, 2.45]) { g.fillStyle = '#f6f2ec'; g.fillRect(FX(9.0), FY(y), 2.1, 0.03); for (let x = 9.05; x < 11; x += 0.16) { g.fillStyle = ['#f2d0d4', '#bfe2d4', '#f6f2ec', '#c9daf0'][(rnd() * 4) | 0]; g.fillRect(FX(x), FY(y + 0.18), 0.12, 0.18); } }
    // the skirting
    g.fillStyle = '#ffffff'; g.fillRect(FX(-11.2), FY(0.1), 22.4, 0.1);
  });
  const g = grp(flatMesh(c));
  // the BIG GOLD MIRROR (x 0): 1.6 x 2.6, bottom at 0.2, a rococo gold frame; behind its glass, a red-lit space
  const mirror = new THREE.Group(); mirror.name = 'goldMirror';
  const gold = MAT.gold();
  const fw = 1.6, fh = 2.6, fy = 0.2;
  const frameShape = new THREE.Shape(); frameShape.moveTo(-fw / 2 - 0.16, 0); frameShape.lineTo(fw / 2 + 0.16, 0); frameShape.lineTo(fw / 2 + 0.16, fh + 0.16); frameShape.quadraticCurveTo(0, fh + 0.5, -fw / 2 - 0.16, fh + 0.16); frameShape.lineTo(-fw / 2 - 0.16, 0);
  const hole = new THREE.Path(); hole.moveTo(-fw / 2, 0.08); hole.lineTo(fw / 2, 0.08); hole.lineTo(fw / 2, fh); hole.quadraticCurveTo(0, fh + 0.3, -fw / 2, fh); hole.lineTo(-fw / 2, 0.08); frameShape.holes.push(hole);
  const fg = new THREE.ExtrudeGeometry(frameShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 16 });
  const frame = mesh(fg, gold); frame.position.set(0, fy - 0.08, 0.08); mirror.add(frame);
  for (const [x, y, s] of [[0, fh + 0.42, 0.14], [-fw / 2 - 0.12, fh * 0.55, 0.09], [fw / 2 + 0.12, fh * 0.55, 0.09], [-fw / 2 - 0.1, 0.1, 0.08], [fw / 2 + 0.1, 0.1, 0.08]]) { const o = mesh(new THREE.SphereGeometry(s, 16, 10), gold); o.scale.z = 0.5; o.position.set(x, fy + y, 0.16); mirror.add(o); }
  const shape = new THREE.Shape(); shape.moveTo(-fw / 2, 0.08); shape.lineTo(fw / 2, 0.08); shape.lineTo(fw / 2, fh); shape.quadraticCurveTo(0, fh + 0.3, -fw / 2, fh); shape.lineTo(-fw / 2, 0.08);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x3a3440, metalness: 0.9, roughness: 0.06, emissive: C(0x000000) });
  const glass = mesh(new THREE.ShapeGeometry(shape, 12), glassM, { name: 'mirrorGlass' }); glass.position.set(0, fy - 0.08, 0.11); mirror.add(glass);
  mirror.userData = { glass, glassM };
  mirror.position.set(0, 0, 0.0);
  g.add(mirror);
  // the vanity mirror (x -6.4): frameless, a bulb strip above, a basin below with a cup and one toothbrush
  const van = new THREE.Group(); van.name = 'vanity';
  const vm = new THREE.MeshPhysicalMaterial({ color: 0x8a96a8, metalness: 1, roughness: 0.06, emissive: C(0) });
  const vg = mesh(new THREE.PlaneGeometry(1.4, 1.0), vm, { name: 'vanityGlass' }); vg.position.set(0, 1.75, 0.1); van.add(vg);
  const strip = box(1.5, 0.08, 0.06, MAT.chrome()); strip.position.set(0, 2.3, 0.1); van.add(strip);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 10, 8), glowMat(0xffe0b0, 2.2), 7);
  for (let i = 0; i < 7; i++) bulbs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-0.6 + i * 0.2, 2.34, 0.16)); van.add(bulbs);
  const basin = rbox(0.9, 0.18, 0.5, MAT.gloss(), 0.05); basin.position.set(0, 0.82, 0.28); van.add(basin);
  const ped = cyl(0.1, 0.14, 0.82, MAT.gloss()); ped.position.set(0, 0, 0.3); van.add(ped);
  const cup = cyl(0.045, 0.04, 0.11, M('cupglass', { color: 0xdbe8f0, roughness: 0.1, transparent: true, opacity: 0.6 })); cup.position.set(0.32, 1.0, 0.25); van.add(cup);
  const brush1 = box(0.012, 0.18, 0.012, M('brush1', { color: 0xffb6c8, roughness: 0.4 })); brush1.position.set(0.31, 1.02, 0.25); brush1.rotation.z = 0.15; van.add(brush1);
  const brush2 = box(0.012, 0.18, 0.012, M('brush2', { color: 0x8fe0c8, roughness: 0.4 }), { name: 'brush2' }); brush2.position.set(0.34, 1.02, 0.26); brush2.rotation.z = -0.2; brush2.visible = false; van.add(brush2);
  van.position.set(-6.4, 0, 0); van.userData = { glassM: vm, brush2 };
  g.add(van);
  // the window (x +7.6): 2.4 x 2.0, venetian blinds, moonlight
  const win = windowUnit(2.4, 2.0, 1.1, { glow: 0x5a6a9a, night: true }); win.position.set(7.6, 0, 0); win.name = 'window'; g.add(win);
  return g;
}
// a window with venetian blinds (open or shut), glowing with what's outside
export function windowUnit(w, h, sill, { glow = 0x5a6a9a, night = true, outside = null } = {}) {
  const g = new THREE.Group();
  const frame = MAT.white();
  for (const [x, y, ww, hh] of [[0, sill - 0.06, w + 0.2, 0.08], [0, sill + h, w + 0.2, 0.08], [-w / 2 - 0.05, sill, 0.1, h], [w / 2 + 0.05, sill, 0.1, h]]) { const b = box(ww, hh, 0.14, frame); b.position.set(x, y, 0.08); g.add(b); }
  const outM = new THREE.MeshBasicMaterial({ color: C(glow), map: outside ? tex(outside) : null });
  const out = mesh(new THREE.PlaneGeometry(w, h), outM, { cast: false, name: 'outside' }); out.position.set(0, sill + h / 2, 0.05); g.add(out);
  // the blinds: slats that turn (open/shut) and pull up (snap open)
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(w, 0.05, 0.012), M('slat', { color: 0xf3efe8, roughness: 0.4 }), Math.floor(h / 0.06));
  slats.castShadow = true;
  g.add(slats);
  g.userData = { outM, slats, w, h, sill, setBlinds(open, up = 0) { const n = slats.count; const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1); for (let i = 0; i < n; i++) { const y = sill + h - 0.04 - i * 0.06 * (1 - up * 0.9); q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), open ? 1.25 : 0.12); m.compose(new THREE.Vector3(0, Math.max(sill + h * up, y), 0.11), q, s); slats.setMatrixAt(i, m); } slats.instanceMatrix.needsUpdate = true; } };
  g.userData.setBlinds(false);
  return g;
}

// a side flat (along z, at x = side * 11.15) with a door in it at z = dz
export function sideFlat(side, color, dz, { doorColor = 0xf3ead8, knob = 'brass', glowName = 'doorGlow' } = {}) {
  const L = 14.4;
  const c = canvas(1600, 480, (g, w, h) => { g.fillStyle = color; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`; g.fillRect(rnd() * w, rnd() * h, 30, 20); } g.fillStyle = '#ffffff'; g.fillRect(0, h - 12, w, 12); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(0, h - h * 0.95 / 4.4 - 4, w, 4); });
  const m = flatMesh(c, L, 4.4, 0.16);
  m.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  const g = grp(m);
  // the door: cream panels, a brass knob; its gap glows when she's about to come through
  const door = new THREE.Group(); door.name = 'door';
  const dm = M('door' + doorColor, { color: doorColor, roughness: 0.35, clearcoat: 0.5 });
  const leaf = rbox(1.0, 2.25, 0.06, dm, 0.01); leaf.position.x = 0.5; const hinge = new THREE.Group(); hinge.position.x = -0.5; hinge.add(leaf);
  for (const y of [0.4, 1.3]) { const p = rbox(0.7, 0.6, 0.02, dm, 0.01); p.position.set(0.5, y, 0.04); hinge.add(p); }
  const kn = mesh(new THREE.SphereGeometry(0.04, 12, 8), knob === 'brass' ? MAT.brass() : MAT.chrome()); kn.position.set(0.88, 1.0, 0.07); hinge.add(kn);
  door.add(hinge);
  const casing = MAT.white();
  for (const [x, y, ww, hh] of [[-0.56, 0, 0.1, 2.32], [0.56, 0, 0.1, 2.32], [0, 2.3, 1.22, 0.1]]) { const b = box(ww, hh, 0.1, casing); b.position.set(x, y, 0.04); door.add(b); }
  const glow = mesh(new THREE.PlaneGeometry(0.06, 2.2), new THREE.MeshBasicMaterial({ color: C(0xff2040).multiplyScalar(3), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), { cast: false, name: glowName });
  glow.position.set(0.5, 1.12, 0.09); door.add(glow);
  door.position.set(0, 0, 0);
  const dHolder = new THREE.Group(); dHolder.add(door);
  dHolder.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  dHolder.position.set(side < 0 ? 0.09 : -0.09, 0, dz);
  g.add(dHolder);
  g.userData = { door, hinge, glow };
  return g;
}

// ---------------------------------------------------------------- set A pieces
export function showerStall() {
  // x -10.9..-8.7, z -7..-4.8: a frosted glass box in a brass frame, a rain head; origin at its centre
  const g = new THREE.Group();
  const W = 2.2, D = 2.2, Hh = 2.3, b = MAT.brass();
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) { const p = box(0.06, Hh, 0.06, b); p.position.set(x, 0, z); g.add(p); }
  for (const [x, z, w, d] of [[0, -D / 2, W, 0.06], [0, D / 2, W, 0.06], [-W / 2, 0, 0.06, D], [W / 2, 0, 0.06, D]]) { const r = box(w, 0.06, d, b); r.position.set(x, Hh - 0.06, z); g.add(r); const f = box(w, 0.08, d, b); f.position.set(x, 0, z); g.add(f); }
  const base = rbox(W, 0.08, D, MAT.gloss(), 0.02); g.add(base);
  const frostM = new THREE.MeshPhysicalMaterial({ color: 0xe6eef2, roughness: 0.4, transparent: true, opacity: 0.46, depthWrite: false, side: THREE.DoubleSide, emissive: C(0) });
  const crackT = tex(canvas(512, 512, (g2, w, h) => { g2.strokeStyle = 'rgba(255,255,255,0.9)'; g2.lineWidth = 2; for (let k = 0; k < 4; k++) { const cx = w * (0.2 + rnd() * 0.6), cy = h * (0.2 + rnd() * 0.6); for (let i = 0; i < 9; i++) { g2.beginPath(); g2.moveTo(cx, cy); let x = cx, y = cy; const a = rnd() * TAU; for (let s = 0; s < 6; s++) { x += Math.cos(a + (rnd() - 0.5)) * 30; y += Math.sin(a + (rnd() - 0.5)) * 30; g2.lineTo(x, y); } g2.stroke(); } } }));
  const crackM = new THREE.MeshBasicMaterial({ map: crackT, transparent: true, opacity: 0, depthWrite: false });
  const panes = [];
  for (const [x, z, ry, w] of [[0, D / 2, 0, W], [W / 2, 0, Math.PI / 2, D]]) {
    const p = mesh(new THREE.PlaneGeometry(w - 0.06, Hh - 0.14), frostM, { cast: false }); p.position.set(x, Hh / 2, z); p.rotation.y = ry; g.add(p); panes.push(p);
    const cr = mesh(new THREE.PlaneGeometry(w - 0.06, Hh - 0.14), crackM, { cast: false }); cr.position.set(x + (ry ? 0.01 : 0), Hh / 2, z + (ry ? 0 : 0.01)); cr.rotation.y = ry; g.add(cr); panes.push(cr);
  }
  const head = cyl(0.18, 0.18, 0.03, MAT.chrome()); head.position.set(-0.3, Hh - 0.3, -0.3); g.add(head);
  const pipe = tube([[-0.3, Hh - 0.28, -0.3], [-0.3, Hh - 0.05, -0.3], [-0.3, Hh - 0.05, -D / 2 + 0.05]], 0.02, MAT.chrome()); g.add(pipe);
  g.userData = { frostM, crackM, panes };
  return g;
}
export function doorFrame() {
  // a freestanding white door frame facing the camera, an opening 1.2 x 2.4, its door leaf ajar
  const g = new THREE.Group(), w = MAT.gloss();
  for (const x of [-0.66, 0.66]) { const p = box(0.12, 2.5, 0.16, w); p.position.x = x; g.add(p); }
  const top = box(1.44, 0.12, 0.16, w); top.position.y = 2.42; g.add(top);
  const leafM = M('leafWhite', { color: 0xf6f1ea, roughness: 0.3, clearcoat: 0.6 });
  const hinge = new THREE.Group(); hinge.position.set(-0.6, 0, 0.03);
  const leaf = rbox(1.18, 2.36, 0.05, leafM, 0.01); leaf.position.x = 0.59; hinge.add(leaf);
  for (const y of [0.3, 1.3]) { const p = rbox(0.86, 0.8, 0.02, leafM, 0.01); p.position.set(0.59, y, 0.035); hinge.add(p); }
  const kn = mesh(new THREE.SphereGeometry(0.035, 12, 8), MAT.brass()); kn.position.set(1.06, 1.0, 0.06); hinge.add(kn);
  hinge.rotation.y = -1.1; g.add(hinge);
  const glowM = new THREE.MeshBasicMaterial({ color: C(0xff2040).multiplyScalar(2.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const glow = mesh(new THREE.PlaneGeometry(1.2, 2.36), glowM, { cast: false }); glow.position.set(0, 1.18, 0); g.add(glow);
  g.userData = { glowM, hinge };
  return g;
}
export function island(knifeSlotGlow = true) {
  // 3.2 x 1.0, 0.95 tall: white marble top with a gold edge, a mint base; the knife block on it, one slot empty
  const g = new THREE.Group();
  const marbleT = tex(canvas(1024, 320, (c, w, h) => { c.fillStyle = '#f3efe9'; c.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { c.strokeStyle = `rgba(150,140,130,${0.15 + rnd() * 0.3})`; c.lineWidth = 0.6 + rnd() * 2; c.beginPath(); let x = rnd() * w, y = 0; c.moveTo(x, y); while (y < h) { x += (rnd() - 0.4) * 40; y += 12; c.lineTo(x, y); } c.stroke(); } }));
  const marble = new THREE.MeshPhysicalMaterial({ map: marbleT, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 });
  const base = rbox(3.0, 0.85, 0.85, MAT.mint(), 0.03); g.add(base);
  const top = rbox(3.2, 0.06, 1.0, marble, 0.012); top.position.y = 0.86; g.add(top);
  const edge = box(3.22, 0.02, 1.02, MAT.gold()); edge.position.y = 0.85; g.add(edge);
  // the knife block (walnut, six slots, one empty)
  const kb = new THREE.Group(); kb.position.set(1.0, 0.92, 0);
  const blk = rbox(0.3, 0.36, 0.22, MAT.walnut(), 0.02); blk.rotation.x = -0.25; kb.add(blk);
  for (let i = 0; i < 6; i++) { if (i === 3) continue; const h = rbox(0.035, 0.14, 0.03, M('hilt', { color: 0x1a0d08, roughness: 0.4, clearcoat: 0.5 }), 0.008); h.position.set(-0.1 + i * 0.04, 0.38, -0.06 + (i % 2) * 0.03); h.rotation.x = -0.25; kb.add(h); }
  const slotM = new THREE.MeshBasicMaterial({ color: C(0xff1a30).multiplyScalar(4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const slot = mesh(new THREE.SphereGeometry(0.08, 12, 8), slotM, { cast: false }); slot.position.set(0.02, 0.38, -0.03); kb.add(slot);
  g.add(kb);
  g.userData = { slotM, knives: kb };
  return g;
}
export function fridge() {
  const g = new THREE.Group();
  g.add(rbox(0.85, 1.85, 0.72, MAT.mint(), 0.12));
  const hd = box(0.04, 0.42, 0.05, MAT.chrome()); hd.position.set(0.32, 1.1, 0.38); g.add(hd);
  const hd2 = box(0.04, 0.3, 0.05, MAT.chrome()); hd2.position.set(0.32, 0.5, 0.38); g.add(hd2);
  const seam = box(0.86, 0.015, 0.73, MAT.chrome()); seam.position.y = 1.32; g.add(seam);
  const note = mesh(new THREE.PlaneGeometry(0.14, 0.14), new THREE.MeshStandardMaterial({ map: tex(canvas(64, 64, (c) => { c.fillStyle = '#ffe36a'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#e8304a'; c.lineWidth = 3; c.beginPath(); c.moveTo(32, 46); c.bezierCurveTo(8, 30, 18, 12, 32, 24); c.bezierCurveTo(46, 12, 56, 30, 32, 46); c.stroke(); })), roughness: 0.8 }), { name: 'note' });
  note.position.set(-0.1, 1.5, 0.365); note.rotation.z = 0.08; note.visible = false; g.add(note);
  g.userData = { note };
  return g;
}
export function herBox(k) {
  const g = new THREE.Group();
  const t = tex(canvas(256, 256, (c, w, h) => { c.fillStyle = '#c49a68'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(80,50,20,0.15)'; for (let i = 0; i < 40; i++) c.fillRect(rnd() * w, rnd() * h, 60, 2); c.fillStyle = '#b48a58'; c.fillRect(0, h * 0.46, w, h * 0.08); c.font = font(SANS, 70); c.fillStyle = '#1a1010'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.save(); c.translate(w / 2, h * 0.32); c.rotate(-0.06 + k * 0.05); c.fillText('HERS', 0, 0); c.restore(); }));
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  g.add(box(0.6, 0.6, 0.6, m));
  return g;
}
export function coatStand(coatColor = 0xc40c2a) {
  const g = new THREE.Group(), b = MAT.brass();
  g.add(cyl(0.22, 0.24, 0.04, b)); const pole = cyl(0.025, 0.025, 1.85, b); g.add(pole);
  for (let i = 0; i < 4; i++) { const a = i * TAU / 4; const hk = tube([[0, 1.75, 0], [Math.sin(a) * 0.16, 1.82, Math.cos(a) * 0.16], [Math.sin(a) * 0.2, 1.9, Math.cos(a) * 0.2]], 0.012, b); g.add(hk); }
  const coatM = M('coat' + coatColor, { color: coatColor, roughness: coatColor === 0xc40c2a ? 0.2 : 0.6, clearcoat: coatColor === 0xc40c2a ? 1 : 0, sheen: 0.6, sheenColor: C(coatColor) });
  const coat = lathe([[0.02, 1.78], [0.16, 1.68], [0.2, 1.4], [0.24, 0.8], [0.27, 0.5], [0.0, 0.5]], coatM, 20, { name: 'coat' }); coat.scale.z = 0.6; coat.position.set(0.12, 0, 0.0); g.add(coat);
  g.userData = { coat };
  return g;
}
export function dish() {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.32, 0], [0.36, 0.03], [0.3, 0.06], [0, 0.05]], MAT.gold(), 40));
  const gm = grenadeGeometry(0.5);
  const bottle = new THREE.Group(); bottle.name = 'bottle';
  bottle.add(mesh(gm.body, M('ruby', { color: 0x9a0016, roughness: 0.08, clearcoat: 1, emissive: C(0x300004) })));
  for (const [geo, name] of gm.gold) { if (name === 'ring') { const r = mesh(geo, MAT.gold()); r.name = 'ring'; bottle.add(r); } else bottle.add(mesh(geo, MAT.gold())); }
  bottle.position.y = 0.05; g.add(bottle);
  // the sealed pink ring round it
  const ringM = new THREE.MeshBasicMaterial({ color: C(0xff3a8a).multiplyScalar(1.6), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = mesh(new THREE.RingGeometry(0.62, 0.68, 64), ringM, { cast: false }); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
  g.userData = { bottle, ringM };
  return g;
}
// the keepsake: a gold pull-ring on a bent split pin
export function pinModel() {
  const g = new THREE.Group();
  const ring = mesh(new THREE.TorusGeometry(0.06, 0.012, 10, 28), MAT.gold()); ring.rotation.x = Math.PI / 2; ring.position.y = 0.014; g.add(ring);
  const pin = tube([[0.06, 0.014, 0], [0.16, 0.014, 0.01], [0.22, 0.02, 0.04]], 0.008, MAT.gold()); g.add(pin);
  return g;
}

// ---------------------------------------------------------------- set A' (the new girl's things: warm, kind)
export function plant() {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.2, 0], [0.26, 0.38], [0.28, 0.42], [0, 0.42]], MAT.terracotta(), 24));
  const lf = new THREE.Shape(); lf.moveTo(0, 0); lf.bezierCurveTo(0.18, 0.05, 0.22, 0.3, 0, 0.42); lf.bezierCurveTo(-0.22, 0.3, -0.18, 0.05, 0, 0);
  const lg = new THREE.ShapeGeometry(lf, 8);
  for (let i = 0; i < 9; i++) { const a = i * 2.4, s = 0.9 + rnd() * 0.6; const l = mesh(lg, MAT.leaf()); l.scale.setScalar(s); l.position.set(Math.sin(a) * 0.08, 0.5 + rnd() * 0.35, Math.cos(a) * 0.08); l.rotation.set(-0.9 + rnd() * 0.5, a, 0); g.add(l); const st = tube([[0, 0.4, 0], [Math.sin(a) * 0.05, 0.5 + rnd() * 0.3, Math.cos(a) * 0.05]], 0.008, MAT.leaf()); g.add(st); }
  return g;
}
export function candle() {
  const g = new THREE.Group(), b = MAT.brass();
  g.add(cyl(0.18, 0.2, 0.03, b)); const leg = cyl(0.03, 0.03, 0.42, b); g.add(leg); const tray = cyl(0.16, 0.14, 0.02, b); tray.position.y = 0.42; g.add(tray);
  const wax = cyl(0.08, 0.08, 0.2, MAT.wax()); wax.position.y = 0.44; g.add(wax);
  const hur = lathe([[0.12, 0], [0.15, 0.1], [0.14, 0.3], [0.11, 0.42], [0.105, 0.42]], MAT.glass(), 28); hur.position.y = 0.44; g.add(hur);
  const flame = mesh(new THREE.SphereGeometry(0.025, 10, 8), glowMat(0xffb24a, 4), { cast: false, name: 'flame' }); flame.scale.y = 1.8; flame.position.y = 0.69; g.add(flame);
  g.userData = { flame };
  return g;
}
export function mugStool() {
  const g = new THREE.Group();
  const rattan = M('rattan', { color: 0xc8a06a, roughness: 0.7 });
  g.add(lathe([[0.0, 0.0], [0.2, 0.0], [0.18, 0.45], [0.22, 0.48], [0.0, 0.48]], rattan, 20));
  const mug = new THREE.Group(); mug.position.y = 0.48;
  mug.add(cyl(0.06, 0.065, 0.11, M('mug', { color: 0xf2c53a, roughness: 0.2, clearcoat: 1 })));
  const hd = mesh(new THREE.TorusGeometry(0.035, 0.01, 8, 16, Math.PI), M('mug', {})); hd.position.set(0.07, 0.055, 0); hd.rotation.z = -Math.PI / 2; mug.add(hd);
  g.add(mug);
  return g;
}
export function flowers() {
  const g = new THREE.Group();
  g.add(lathe([[0.0, 0], [0.09, 0], [0.11, 0.12], [0.07, 0.3], [0.08, 0.36], [0.075, 0.36]], MAT.glass(), 20));
  for (let i = 0; i < 7; i++) { const a = i * 0.9, h = 0.65 + rnd() * 0.15; const st = tube([[0, 0.05, 0], [Math.sin(a) * 0.08, h * 0.6, Math.cos(a) * 0.08], [Math.sin(a) * 0.14, h, Math.cos(a) * 0.14]], 0.006, MAT.leaf(), { seg: 8, rs: 4 }); g.add(st); const tl = mesh(new THREE.SphereGeometry(0.035, 10, 8), M('tulip', { color: 0xfbf8f2, roughness: 0.4 })); tl.scale.y = 1.5; tl.position.set(Math.sin(a) * 0.14, h + 0.02, Math.cos(a) * 0.14); g.add(tl); }
  return g;
}
