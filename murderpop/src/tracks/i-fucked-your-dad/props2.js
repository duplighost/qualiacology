// More of the yard's set pieces: the frozen-foods aisle, Dad's car, the produce scales, the childhood bedroom,
// Christmas, Father's Day, Thanksgiving, the mortar, the cloche, the doormat, the mailbox and gnomes, and the
// strings of bulbs on the house. Glazed primitives, merged per material. Origins on the floor at the centre.
import * as THREE from 'three';
import { M, GLOW, G, Merger, roundBox, canvasTex, texMat } from './mats.js';

const deg = Math.PI / 180;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- the frozen foods aisle
// a glass-door upright freezer, 2.0 wide x 0.9 deep x 2.2 tall, its front at z = +0.45; the door swings on its left
export function freezer() {
  const g = new THREE.Group(), m = new Merger();
  m.rbox(M.white, 2.0, 2.2, 0.9, 0.05, 0, 1.1, 0);
  m.box(M.gold, 2.04, 0.06, 0.94, 0, 2.2, 0); m.box(M.gold, 2.04, 0.06, 0.94, 0, 0.03, 0);
  // the cold glowing inside, its shelves of ice-cream tubs and pies in cream, gold and coral
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.9), G(0x9ad8ff, 0.8)); inner.position.set(0, 1.12, 0.38); g.add(inner);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) {
    const x = -0.75 + i * 0.3, y = 0.35 + r * 0.45, mat = [M.cream, M.gold, M.coral, M.amber][(i + r) % 4];
    if ((i + r * 3) % 3 === 0) m.cyl(mat, 0.1, 0.1, 0.16, x, y + 0.08, 0.3, 12); else m.rbox(mat, 0.24, 0.12, 0.2, 0.02, x, y + 0.06, 0.3);
  }
  for (let r = 0; r < 4; r++) m.box(M.steel, 1.84, 0.02, 0.5, 0, 0.32 + r * 0.45, 0.2);
  m.build(g);
  // the door: frosted glass in a gold frame, a gold handle (hinged on its left edge)
  const door = new THREE.Group(); door.position.set(-0.98, 0, 0.47); g.add(door);
  const dm = new Merger();
  dm.box(M.gold, 0.05, 2.08, 0.05, 0.02, 1.1, 0); dm.box(M.gold, 0.05, 2.08, 0.05, 1.94, 1.1, 0);
  dm.box(M.gold, 1.96, 0.05, 0.05, 0.98, 0.08, 0); dm.box(M.gold, 1.96, 0.05, 0.05, 0.98, 2.12, 0);
  dm.cyl(M.gold, 0.02, 0.02, 0.8, 1.8, 1.2, 0.06, 8);
  dm.build(door);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.0), M.glassBlue); glass.position.set(0.98, 1.1, 0.0); door.add(glass);
  g.userData.door = door;
  return g;
}
// the island chest freezer, its open top glowing (x -3.6..3.6, z -2.2..-1.0, 0.95 tall): 7.2 x 1.2
export function island() {
  const g = new THREE.Group(), m = new Merger();
  m.rbox(M.white, 7.2, 0.95, 1.2, 0.06, 0, 0.475, 0);
  // a gold rim round the open top (not a lid: the cold light shows through, tubs and pies in it)
  for (const z of [-0.6, 0.6]) m.box(M.gold, 7.26, 0.05, 0.07, 0, 0.965, z);
  for (const x of [-3.6, 3.6]) m.box(M.gold, 0.07, 0.05, 1.26, x, 0.965, 0);
  for (let i = 0; i < 14; i++) m.rbox([M.cream, M.coral, M.gold][i % 3], 0.34, 0.1, 0.5, 0.02, -3.2 + i * 0.49, 0.93, (i % 2 ? 0.2 : -0.2));
  m.build(g);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(7.08, 1.12), G(0x6fbcff, 0.55)); top.rotation.x = -Math.PI / 2; top.position.y = 0.957; g.add(top);
  // the coffee cup on it
  const cup = new THREE.Group(), cm = new Merger();
  cm.cyl(M.white, 0.045, 0.035, 0.14, 0, 0.07, 0, 14); cm.cyl(M.gold, 0.047, 0.047, 0.012, 0, 0.13, 0, 14); cm.cyl(M.cream, 0.046, 0.046, 0.02, 0, 0.15, 0, 14);
  cm.build(cup); cup.position.set(2.8, 0.95, 0.2); cup.scale.setScalar(2.0); g.add(cup);
  g.userData.cup = cup;
  return g;
}
// a fluorescent fixture hung on chains (a tube glowing mint-white)
export function fixture() {
  const g = new THREE.Group(), m = new Merger();
  m.rbox(M.white, 2.6, 0.12, 0.4, 0.03, 0, 0, 0);
  for (const x of [-1.1, 1.1]) m.cyl(M.gold, 0.012, 0.012, 3.0, x, 1.56, 0, 6);
  m.build(g, { cast: false });
  const tube = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.12), G(0xd8fff0, 2.6)); tube.position.y = -0.07; g.add(tube);
  g.userData.tube = tube.material;
  return g;
}
// the shopping cart: gold wire box, coral handle, four casters (faces -x: its nose is -x)
export function cart() {
  const g = new THREE.Group(), m = new Merger();
  const W = 0.6, L = 0.95, H = 0.5, y0 = 0.42;
  for (let i = 0; i <= 6; i++) { const x = -L / 2 + i * L / 6; m.box(M.gold, 0.015, H, 0.015, x, y0 + H / 2, W / 2); m.box(M.gold, 0.015, H, 0.015, x, y0 + H / 2, -W / 2); }
  for (let i = 0; i <= 4; i++) { const z = -W / 2 + i * W / 4; m.box(M.gold, 0.015, H, 0.015, -L / 2, y0 + H / 2, z); m.box(M.gold, 0.015, H, 0.015, L / 2, y0 + H / 2, z); }
  for (const y of [y0, y0 + H / 2, y0 + H]) { m.box(M.gold, L, 0.015, 0.015, 0, y, W / 2); m.box(M.gold, L, 0.015, 0.015, 0, y, -W / 2); m.box(M.gold, 0.015, 0.015, W, -L / 2, y, 0); m.box(M.gold, 0.015, 0.015, W, L / 2, y, 0); }
  m.box(M.goldDark, L, 0.02, W, 0, y0, 0);
  m.cyl(M.coral, 0.03, 0.03, W + 0.06, L / 2 + 0.2, y0 + H + 0.12, 0, 10, Math.PI / 2);
  for (const z of [-W / 2, W / 2]) m.box(M.gold, 0.3, 0.015, 0.015, L / 2 + 0.1, y0 + H + 0.06, z, 0, 0, 0.4);
  for (const x of [-L / 2 + 0.06, L / 2 - 0.06]) for (const z of [-W / 2 + 0.05, W / 2 - 0.05]) { m.cyl(M.gold, 0.012, 0.012, 0.32, x, 0.22, z, 6); m.cyl(M.black, 0.06, 0.06, 0.04, x, 0.06, z, 12, Math.PI / 2); }
  m.build(g);
  return g;
}

// ---------------------------------------------------------------- Dad's car: a cream porcelain sedan, gold chrome (nose toward -z)
export function car() {
  const g = new THREE.Group(), m = new Merger();
  m.rbox(M.cream, 1.95, 0.62, 4.7, 0.18, 0, 0.62, 0);
  m.rbox(M.cream, 1.86, 0.18, 4.5, 0.1, 0, 0.96, 0);
  m.box(M.gold, 2.0, 0.08, 4.76, 0, 0.44, 0);
  for (const z of [-1.55, 1.5]) for (const x of [-0.9, 0.9]) { m.cyl(M.black, 0.36, 0.36, 0.26, x, 0.36, z, 20, 0, Math.PI / 2); m.cyl(M.gold, 0.2, 0.2, 0.28, x, 0.36, z, 16, 0, Math.PI / 2); }
  m.rbox(M.gold, 1.7, 0.14, 0.14, 0.05, 0, 0.5, -2.38); m.rbox(M.gold, 1.7, 0.14, 0.14, 0.05, 0, 0.5, 2.38);
  for (const x of [-0.65, 0.65]) { m.sphere(GLOW.cream, 0.12, x, 0.72, -2.34, 1, 0.8, 0.5); m.sphere(GLOW.coral, 0.1, x, 0.74, 2.35, 1.2, 0.7, 0.5); }
  m.build(g);
  // the cabin (its roof is crushed by the scale pan at 44.32)
  const cab = new THREE.Group(); cab.position.set(0, 1.05, 0.15); g.add(cab);
  const cm = new Merger();
  cm.rbox(M.cream, 1.7, 0.55, 2.4, 0.16, 0, 0.27, 0);
  cm.build(cab);
  const glass = new THREE.Mesh(roundBox(1.74, 0.36, 2.1, 0.08), new THREE.MeshPhysicalMaterial({ color: 0x1a2030, roughness: 0.05, metalness: 0.2, clearcoat: 1 }));
  glass.position.y = 0.24; cab.add(glass);
  g.userData.cab = cab;
  return g;
}

// ---------------------------------------------------------------- a giant gold produce scale pan on its chains (r 3.0)
export function scalePan() {
  const g = new THREE.Group(), m = new Merger();
  m.lathe(M.gold, [[0, 0], [2.6, 0.02], [3.0, 0.2], [3.05, 0.32], [2.95, 0.3], [2.5, 0.1], [0, 0.08]], 0, 0, 0, 48);
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; const x = Math.cos(a) * 2.8, z = Math.sin(a) * 2.8; const L = Math.hypot(2.8, 6.5); const c = new THREE.CylinderGeometry(0.03, 0.03, L, 6); c.rotateZ(Math.atan2(2.8, 6.5)); c.rotateY(-a); m.add(M.goldDark, c, x / 2, 0.3 + 6.5 / 2, z / 2); }
  m.cyl(M.goldDark, 0.05, 0.05, 14, 0, 6.8 + 7, 0, 6);
  m.sphere(M.gold, 0.22, 0, 6.8, 0);
  m.build(g, { cast: true });
  return g;
}

// ---------------------------------------------------------------- your childhood bedroom (verse 2)
export function twinBed() {
  const g = new THREE.Group(), m = new Merger();
  m.rbox(M.brown, 1.1, 0.3, 2.1, 0.03, 0, 0.15, 0);
  m.rbox(M.white, 1.04, 0.2, 2.0, 0.06, 0, 0.4, 0);
  m.rbox(M.ivory, 0.7, 0.14, 0.4, 0.06, 0, 0.56, -0.75);
  m.rbox(M.brown, 1.1, 0.9, 0.08, 0.03, 0, 0.45, -1.05); m.rbox(M.brown, 1.1, 0.5, 0.08, 0.03, 0, 0.25, 1.05);
  m.build(g);
  // the navy-and-cream plaid quilt
  const tex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#1c2440'; c.fillRect(0, 0, w, h); c.globalAlpha = 0.55; c.fillStyle = '#efe3cf'; for (let i = 0; i < 8; i++) { c.fillRect(i * 32 + 10, 0, 10, h); c.fillRect(0, i * 32 + 10, w, 10); } c.globalAlpha = 0.8; c.fillStyle = '#e0b04a'; for (let i = 0; i < 8; i++) { c.fillRect(i * 32 + 26, 0, 2, h); c.fillRect(0, i * 32 + 26, w, 2); } }, { repeat: true });
  tex.repeat.set(2, 3);
  const quilt = new THREE.Mesh(roundBox(1.12, 0.1, 1.45, 0.04), texMat(tex, { rough: 0.6, coat: 0.3 })); quilt.position.set(0, 0.55, 0.28); g.add(quilt);
  return g;
}
export function rug(r = 2.5) {
  const tex = canvasTex(512, 512, (c, w, h) => { const cx = w / 2; for (let i = 24; i > 0; i--) { c.fillStyle = ['#8a3a2a', '#e0b04a', '#efe3cf', '#1e5a5a', '#5c1a1f'][i % 5]; c.beginPath(); c.ellipse(cx, cx, i * 10.5, i * 10.5, 0, 0, TAU); c.fill(); } });
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m); return g;
}
// a poster flat: faded teal pinstripe wallpaper, 90s posters and a family photo with YOUR face cut out
export function posterFlat(seed = 0) {
  const g = new THREE.Group();
  const tex = canvasTex(768, 666, (c, w, h) => {
    c.fillStyle = '#5f8e88'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7aa8a0'; for (let x = 0; x < w; x += 22) c.fillRect(x, 0, 6, h);
    const poster = (x, y, pw, ph, bg, fg, label) => { c.fillStyle = '#efe3cf'; c.fillRect(x - 6, y - 6, pw + 12, ph + 12); c.fillStyle = bg; c.fillRect(x, y, pw, ph); c.fillStyle = fg; c.font = '900 34px "Archivo Black", Arial Black, sans-serif'; c.textAlign = 'center'; c.fillText(label, x + pw / 2, y + ph - 26); };
    if (seed === 0) {
      poster(60, 70, 230, 320, '#1c2440', '#e0b04a', 'GOLD STARS');
      c.fillStyle = '#e0b04a'; for (let i = 0; i < 5; i++) { const sx = 110 + i * 34, sy = 180; c.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU - Math.PI / 2, r = k % 2 ? 7 : 16; c.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } c.fill(); }
      poster(380, 90, 320, 210, '#d93a33', '#efe3cf', 'TURBO');
      c.fillStyle = '#efe3cf'; c.beginPath(); c.ellipse(540, 190, 110, 34, 0, 0, TAU); c.fill();
    } else {
      poster(420, 60, 260, 360, '#5c1a1f', '#e0b04a', '1996');
      poster(60, 110, 250, 250, '#efe3cf', '#5c1a1f', '');
    }
    // the family photo: three faces, yours cut out with a neat gold-edged hole, hers glued in too big
    const fx = seed === 0 ? 260 : 120, fy = seed === 0 ? 410 : 420;
    c.fillStyle = '#e0b04a'; c.fillRect(fx - 10, fy - 10, 260, 190); c.fillStyle = '#c9a070'; c.fillRect(fx, fy, 240, 170);
    for (const [px, py, col] of [[50, 70, '#f2c8a8'], [190, 68, '#e8b898']]) { c.fillStyle = col; c.beginPath(); c.arc(fx + px, fy + py, 26, 0, TAU); c.fill(); c.fillStyle = '#5c1a1f'; c.fillRect(fx + px - 30, fy + py + 28, 60, 60); }
    c.fillStyle = '#e0b04a'; c.beginPath(); c.arc(fx + 120, fy + 72, 28, 0, TAU); c.fill(); c.fillStyle = '#0b0a0f'; c.beginPath(); c.arc(fx + 120, fy + 72, 24, 0, TAU); c.fill();
    c.fillStyle = '#f3e7d6'; c.beginPath(); c.arc(fx + 205, fy + 50, 36, 0, TAU); c.fill(); c.fillStyle = '#ff5a4a'; c.fillRect(fx + 192, fy + 64, 26, 6);
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.6), texMat(tex, { rough: 0.55, coat: 0.3 }));
  face.position.set(0, 1.3, 0.05); g.add(face);
  const m = new Merger();
  m.box(M.cream, 3.1, 2.7, 0.1, 0, 1.35, -0.02); m.box(M.gold, 3.14, 0.06, 0.12, 0, 2.7, -0.01);
  for (const x of [-1.2, 1.2]) m.box(M.brown, 0.08, 1.4, 0.8, x, 0.7, -0.45, 0, -0.35);
  m.build(g);
  return g;
}

// ---------------------------------------------------------------- Christmas: the tree, presents, Polaroids
export function tree() {
  const g = new THREE.Group(), m = new Merger();
  m.cyl(M.brown, 0.18, 0.22, 0.6, 0, 0.3, 0, 12);
  const tiers = [[1.5, 0.4, 1.7], [1.25, 1.35, 1.6], [1.0, 2.25, 1.5], [0.75, 3.1, 1.35], [0.5, 3.9, 1.2], [0.3, 4.6, 0.9]];
  for (const [r, y, h] of tiers) m.add(M.emerald, new THREE.ConeGeometry(r, h, 24, 3), 0, y + h / 2, 0);
  m.build(g);
  // gold baubles, and lights: coral, amber, cream (no green bulbs)
  const bm = new Merger();
  const lights = [];
  for (let i = 0; i < 46; i++) {
    const y = 0.6 + (i / 46) * 4.4, r = Math.max(0.25, 1.45 * (1 - (y - 0.4) / 5.0)), a = i * 2.39996;
    bm.sphere(M.gold, 0.11, Math.cos(a) * r, y, Math.sin(a) * r, 1, 1, 1, 10);
  }
  for (let i = 0; i < 90; i++) { const y = 0.55 + (i / 90) * 4.5, r = Math.max(0.22, 1.5 * (1 - (y - 0.4) / 5.0)) + 0.03, a = i * 0.9; lights.push([Math.cos(a) * r, y, Math.sin(a) * r, i % 3]); }
  bm.build(g);
  // the gold star on top
  const st = new THREE.Shape(); for (let k = 0; k <= 10; k++) { const a = k / 10 * TAU + Math.PI / 2, r = k % 2 ? 0.14 : 0.34; st.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(st, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }), GLOW.gold);
  star.position.set(0, 5.62, -0.03); g.add(star);
  g.userData.lights = lights;
  return g;
}
const WRAPS = [[0xe0b04a, 0x5c1a1f], [0x5c1a1f, 0xe0b04a], [0xefe3cf, 0xd93a33], [0xe0b04a, 0xefe3cf], [0x5c1a1f, 0xefe3cf], [0xefe3cf, 0xe0b04a], [0xd93a33, 0xefe3cf]];
export function present(i, s) {
  const g = new THREE.Group(), m = new Merger();
  const [a, b] = WRAPS[i % WRAPS.length];
  const ma = mat(a), mb = mat(b);
  m.rbox(ma, s, s * 0.8, s, 0.03, 0, s * 0.4, 0);
  m.box(mb, s + 0.01, s * 0.8 + 0.01, s * 0.16, 0, s * 0.4, 0); m.box(mb, s * 0.16, s * 0.8 + 0.01, s + 0.01, 0, s * 0.4, 0);
  m.sphere(mb, s * 0.14, -s * 0.12, s * 0.82, 0, 1.3, 0.7, 0.6); m.sphere(mb, s * 0.14, s * 0.12, s * 0.82, 0, 1.3, 0.7, 0.6);
  m.build(g);
  return g;
}
const matCache = new Map();
function mat(hex) { if (!matCache.has(hex)) matCache.set(hex, new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.06, metalness: hex === 0xe0b04a ? 1 : 0 })); return matCache.get(hex); }
// a Polaroid on a gold string: a warm, blurry, intimate image (lamplight, a blur of coral, a hand on a shoulder)
export function polaroid(i) {
  const g = new THREE.Group();
  const tex = canvasTex(160, 190, (c, w, h) => {
    c.fillStyle = '#f6f1e6'; c.fillRect(0, 0, w, h);
    const img = c.createLinearGradient(0, 0, w, 160); img.addColorStop(0, ['#3a1a12', '#5a2a1a', '#2a1418'][i % 3]); img.addColorStop(1, ['#a8502a', '#d97a4a', '#7a3a3a'][i % 3]);
    c.fillStyle = img; c.fillRect(12, 12, w - 24, 140);
    c.filter = 'blur(6px)';
    c.fillStyle = 'rgba(255,190,120,0.9)'; c.beginPath(); c.arc(40 + (i * 37) % 80, 50 + (i * 13) % 40, 22, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,90,74,0.8)'; c.beginPath(); c.ellipse(90 - (i * 23) % 50, 110, 40, 22, 0.4, 0, TAU); c.fill();
    c.fillStyle = 'rgba(243,231,214,0.75)'; c.beginPath(); c.ellipse(60 + (i * 31) % 60, 95, 16, 34, -0.6, 0, TAU); c.fill();
    c.filter = 'none';
  });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.5), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.35, clearcoat: 1, side: THREE.DoubleSide, emissive: new THREE.Color(0, 0, 0), emissiveMap: tex }));
  g.add(card);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 3, 4), M.gold); str.position.y = 1.75; g.add(str);
  g.userData.card = card;
  return g;
}

// ---------------------------------------------------------------- Father's Day: the grill, lawn chairs, the banner, bunting
export function grill() {
  const g = new THREE.Group(), m = new Merger();
  m.sphere(M.black, 0.5, 0, 0.75, 0, 1, 0.75, 1, 24);
  m.add(M.gold, new THREE.TorusGeometry(0.5, 0.025, 8, 32), 0, 0.75, 0, 0, Math.PI / 2);
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; m.cyl(M.gold, 0.025, 0.025, 0.75, Math.cos(a) * 0.3, 0.37, Math.sin(a) * 0.3, 8, Math.sin(a) * 0.35, -Math.cos(a) * 0.35); }
  m.cyl(M.gold, 0.03, 0.03, 0.16, 0, 1.2, 0, 8); m.sphere(M.black, 0.05, 0, 1.3, 0);
  m.build(g);
  return g;
}
export function lawnChair(c1 = 0xe0b04a, c2 = 0xefe3cf) {
  const g = new THREE.Group(), m = new Merger();
  const ma = mat(c1), mb = mat(c2);
  for (let i = 0; i < 6; i++) m.box(i % 2 ? ma : mb, 0.1, 0.02, 0.55, -0.25 + i * 0.1, 0.42, 0);
  for (let i = 0; i < 6; i++) m.box(i % 2 ? ma : mb, 0.1, 0.65, 0.02, -0.25 + i * 0.1, 0.74, -0.3, 0, -0.25);
  for (const x of [-0.31, 0.31]) { m.cyl(M.gold, 0.018, 0.018, 0.9, x, 0.42, 0.05, 6, 0.6); m.cyl(M.gold, 0.018, 0.018, 0.9, x, 0.42, -0.05, 6, -0.6); m.box(M.gold, 0.03, 0.03, 0.5, x, 0.6, 0); }
  m.build(g);
  return g;
}
export function banner(text = '#1 DAD', w = 6.0, h = 1.1) {
  const tex = canvasTex(1024, 192, (c, W, H) => {
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffe08a'); gr.addColorStop(0.5, '#e0b04a'); gr.addColorStop(1, '#a8781e');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.fillStyle = '#5c1a1f'; c.font = '900 130px "Archivo Black", Arial Black, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, W / 2, H / 2 + 6);
    c.strokeStyle = '#fff1d6'; c.lineWidth = 6; c.strokeRect(10, 10, W - 20, H - 20);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.6, roughness: 0.25, clearcoat: 1, emissive: new THREE.Color(0.25, 0.18, 0.08), emissiveMap: tex }));
  const g = new THREE.Group(); g.add(m); return g;
}
// a string of triangle flags between two points (cream and gold)
export function bunting(a, b, sag = 0.4, n = 18) {
  const g = new THREE.Group(), m = new Merger();
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n, p = A.clone().lerp(Bv, k); p.y -= Math.sin(k * Math.PI) * sag;
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.14, 0, 0, 0.14, 0, 0, 0, -0.32, 0], 3)); tri.computeVertexNormals();
    const yaw = Math.atan2(Bv.x - A.x, Bv.z - A.z) - Math.PI / 2;
    m.add(i % 2 ? M.gold : M.cream, tri, p.x, p.y, p.z, yaw);
  }
  m.build(g, { cast: false });
  g.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.side = THREE.DoubleSide; } });
  return g;
}

// ---------------------------------------------------------------- Thanksgiving: the long table, its dressing, the chairs
export function dinnerTable() {
  const g = new THREE.Group(), m = new Merger();
  m.rbox(M.brown, 8.0, 0.08, 1.4, 0.02, 0, 0.76, 0);
  for (const x of [-3.8, 3.8]) for (const z of [-0.6, 0.6]) m.cyl(M.brown, 0.05, 0.05, 0.76, x, 0.38, z, 8);
  m.box(M.white, 8.1, 0.02, 1.5, 0, 0.81, 0); m.box(M.white, 8.1, 0.3, 0.02, 0, 0.67, 0.75); m.box(M.white, 8.1, 0.3, 0.02, 0, 0.67, -0.75);
  m.box(M.gold, 8.1, 0.025, 0.25, 0, 0.825, 0);
  // the golden turkey, pies, gravy boats, plates, gold candlesticks (their tapers are lit: flames are the set's)
  m.sphere(M.gold, 0.32, 0.3, 1.0, 0, 1.3, 0.8, 1.0, 20); m.sphere(M.gold, 0.1, 0.72, 1.05, 0.12); m.sphere(M.gold, 0.1, 0.72, 1.05, -0.12);
  m.cyl(M.white, 0.5, 0.42, 0.04, 0.3, 0.84, 0, 24);
  for (const x of [-2.6, 2.8]) { m.cyl(M.amber, 0.24, 0.22, 0.08, x, 0.87, 0.2, 18); m.cyl(M.gold, 0.25, 0.25, 0.01, x, 0.91, 0.2, 18); }
  for (const x of [-1.6, 1.9]) { m.sphere(M.gold, 0.12, x, 0.9, -0.3, 1.6, 0.6, 0.9, 12); }
  const candles = [];
  for (const x of [-3.2, -1.0, 1.3, 3.4]) { m.cyl(M.gold, 0.06, 0.09, 0.32, x, 0.98, 0, 10); m.cyl(M.coral, 0.025, 0.025, 0.36, x, 1.32, 0, 8); candles.push([x, 1.52, 0]); }
  for (let i = 0; i < 8; i++) { const x = -3.5 + i; for (const z of [-0.45, 0.45]) { m.cyl(M.white, 0.16, 0.13, 0.025, x, 0.835, z, 20); m.add(M.gold, new THREE.TorusGeometry(0.15, 0.008, 6, 24), x, 0.85, z, 0, Math.PI / 2); } }
  // framed family photos, YOUR face cut out
  for (const x of [-2.1, 0.9, 2.4]) { m.box(M.gold, 0.26, 0.32, 0.03, x, 0.99, 0.05, 0.2, -0.2); m.box(M.cream, 0.2, 0.26, 0.035, x, 0.99, 0.055, 0.2, -0.2); m.sphere(M.black, 0.035, x, 1.02, 0.08); }
  m.build(g);
  g.userData.candles = candles;
  return g;
}
export function chair(empty = false) {
  const g = new THREE.Group(), m = new Merger();
  m.rbox(M.cream, 0.5, 0.06, 0.5, 0.02, 0, 0.47, 0);
  m.rbox(M.cream, 0.5, 0.62, 0.06, 0.02, 0, 0.8, -0.24); m.box(M.gold, 0.52, 0.04, 0.08, 0, 1.12, -0.24);
  for (const x of [-0.21, 0.21]) for (const z of [-0.21, 0.21]) m.cyl(M.cream, 0.025, 0.025, 0.47, x, 0.235, z, 6);
  m.build(g);
  return g;
}
// the garage door (it flies up at 166.54): cream panels, gold trim, 5.8 wide x 2.7 tall
export function garageDoor() {
  const g = new THREE.Group(), m = new Merger();
  for (let r = 0; r < 4; r++) { m.rbox(M.cream, 5.8, 0.66, 0.08, 0.02, 0, 0.35 + r * 0.67, 0); for (let i = 0; i < 4; i++) m.rbox(M.ivory, 1.2, 0.42, 0.03, 0.02, -2.15 + i * 1.43, 0.35 + r * 0.67, 0.05); }
  m.box(M.gold, 5.86, 0.04, 0.1, 0, 2.7, 0); m.cyl(M.gold, 0.03, 0.03, 0.5, 0, 0.5, 0.08, 8, 0, Math.PI / 2);
  m.build(g);
  return g;
}

// ---------------------------------------------------------------- the final chorus: the gold mortar; the silver cloche
export function mortar() {
  const g = new THREE.Group(), m = new Merger();
  m.lathe(M.gold, [[0, 0], [0.55, 0], [0.55, 0.12], [0.45, 0.18], [0.5, 1.15], [0.56, 1.2], [0.42, 1.2], [0.38, 0.3], [0, 0.3]], 0, 0, 0, 32);
  m.torus(M.coral, 0.5, 0.04, 0, 0.6, 0, Math.PI / 2); m.torus(M.coral, 0.48, 0.03, 0, 0.95, 0, Math.PI / 2);
  m.cyl(M.birch, 0.015, 0.015, 0.6, 0.45, 0.35, 0.3, 6, 0.6);
  m.build(g);
  return g;
}
export function cloche() {
  const g = new THREE.Group(), m = new Merger();
  const prof = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; prof.push([Math.cos(a) * 2.5, Math.sin(a) * 2.3]); }
  m.lathe(M.silver, [...prof, [0, 2.3]], 0, 0, 0, 64);
  m.torus(M.silver, 2.5, 0.06, 0, 0.02, 0, Math.PI / 2);
  m.sphere(M.silver, 0.22, 0, 2.42, 0); m.cyl(M.silver, 0.07, 0.1, 0.18, 0, 2.3, 0, 12);
  m.build(g);
  g.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.side = THREE.DoubleSide; } });
  return g;
}
export function goldPlate() {
  const g = new THREE.Group(), m = new Merger();
  m.lathe(M.gold, [[0, 0], [1.2, 0.02], [1.5, 0.1], [1.55, 0.12], [1.2, 0.06], [0, 0.04]], 0, 0, 0, 48);
  m.cyl(M.birch, 0.03, 0.03, 0.6, 0, 0.36, 0, 8); m.sphere(M.coral, 0.06, 0, 0.7, 0, 1, 1.3, 1);
  m.build(g);
  return g;
}

// ---------------------------------------------------------------- the WELCOME doormat (lyric sign 3 burns YOU'RE in above it)
export function doormat() {
  const draw = (you) => (c, w, h) => {
    c.fillStyle = '#c49a5a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) { c.fillStyle = `rgba(${90 + Math.random() * 60},${60 + Math.random() * 40},${30},0.18)`; c.fillRect(Math.random() * w, Math.random() * h, 2, 6); }
    c.strokeStyle = '#e0b04a'; c.lineWidth = 14; c.strokeRect(14, 14, w - 28, h - 28);
    c.fillStyle = '#120c08'; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (you) {
      // YOU'RE burned in big above WELCOME: scorch-black with a singed halo, so it reads from the high camera
      c.font = 'italic 900 210px Fraunces, Georgia, serif';
      c.shadowColor = 'rgba(70,20,6,0.85)'; c.shadowBlur = 28; c.fillStyle = '#140805'; c.fillText("YOU'RE", w / 2, h * 0.33);
      c.shadowBlur = 0; c.fillText("YOU'RE", w / 2, h * 0.33);
      c.font = '900 120px "Archivo Black", Arial Black, sans-serif'; c.fillStyle = '#120c08'; c.fillText('WELCOME', w / 2, h * 0.74); }
    else { c.font = '900 120px "Archivo Black", Arial Black, sans-serif'; c.fillText('WELCOME', w / 2, h / 2 + 4); }
  };
  const t0 = canvasTex(1024, 600, draw(false)), t1 = canvasTex(1024, 600, draw(true));
  const mat = new THREE.MeshPhysicalMaterial({ map: t0, roughness: 0.7, clearcoat: 0.4 });
  const mesh = new THREE.Mesh(roundBox(1.2, 0.03, 0.7, 0.01), mat);
  mesh.position.y = 0.015;
  const g = new THREE.Group(); g.add(mesh);
  g.userData = { mat, t0, t1 };
  return g;
}
// the mailbox (breakable: it bursts into letters) and the gnomes (breakable)
export function mailbox() {
  const g = new THREE.Group(), m = new Merger();
  m.cyl(M.cream, 0.05, 0.05, 1.0, 0, 0.5, 0, 8);
  m.rbox(M.oxblood, 0.3, 0.3, 0.55, 0.1, 0, 1.12, 0); m.box(M.gold, 0.02, 0.18, 0.04, 0.17, 1.22, -0.1); m.box(M.gold, 0.06, 0.02, 0.2, 0.17, 1.32, -0.05);
  m.build(g);
  return g;
}
export function gnome() {
  const g = new THREE.Group(), m = new Merger();
  m.sphere(M.teal, 0.2, 0, 0.22, 0, 1, 1.1, 1, 14);
  m.sphere(M.ivory, 0.13, 0, 0.5, 0.02, 1, 1, 1, 12); m.sphere(M.white, 0.12, 0, 0.42, 0.08, 1, 1.2, 0.8, 12);
  m.add(M.coral, new THREE.ConeGeometry(0.14, 0.4, 14), 0, 0.78, 0);
  m.sphere(M.gold, 0.035, 0, 0.98, 0);
  m.build(g);
  return g;
}
