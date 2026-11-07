// The funeral's real-time props: everything that moves, breaks, rises, charges or is cover. Built in code
// (three.js geometry, canvas paint), lit like the characters (the arena's key light and its env map).
// Each maker returns a THREE.Group with userData.foot: its 2D footprint ({ hx, hz } box or { r } circle) in
// its own frame, for cover (her flashes) and for colliders.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ------------------------------------------------------------------------------------------------ paint
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, { srgb = true, repeat = null } = {}) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; }
const cache = new Map();
const once = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };

// mahogany: dark red-brown with a fine grain
function woodTex(base = [58, 22, 16], seed = 3) {
  return once('wood' + base + seed, () => {
    const [c, g] = canvas(512, 128), R = rng(seed);
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 140; i++) { const y = R() * 128, a = 0.04 + R() * 0.08; g.strokeStyle = R() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,200,170,${a * 0.6})`; g.lineWidth = 0.6 + R() * 1.6; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 2 + (R() - 0.5) * 1.5); g.stroke(); }
    return tex(c, { repeat: [1, 1] });
  });
}
// granite: speckled
function graniteTex(base = '#7d7884', seed = 5) {
  return once('gran' + base + seed, () => {
    const [c, g] = canvas(256), R = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4200; i++) { const l = R(); g.fillStyle = l < 0.45 ? 'rgba(20,16,26,0.35)' : l < 0.8 ? 'rgba(235,230,240,0.22)' : 'rgba(150,120,160,0.25)'; const s = 0.6 + R() * 1.8; g.fillRect(R() * 256, R() * 256, s, s); }
    return tex(c, { repeat: [1, 1] });
  });
}
// quilted white satin with stitch-red thread
function quiltTex() {
  return once('quilt', () => {
    const [c, g] = canvas(256), n = 6, s = 256 / n;
    const grd = g.createLinearGradient(0, 0, 256, 256); grd.addColorStop(0, '#fbf8f4'); grd.addColorStop(1, '#ece6e2'); g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    for (let y = -1; y <= n; y++) for (let x = -1; x <= n; x++) { const cx = (x + 0.5 + (y % 2) * 0.5) * s, cy = (y + 0.5) * s; const r = g.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, s * 0.7); r.addColorStop(0, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(160,140,140,0.35)'); g.fillStyle = r; g.beginPath(); g.moveTo(cx, cy - s * 0.55); g.lineTo(cx + s * 0.55, cy); g.lineTo(cx, cy + s * 0.55); g.lineTo(cx - s * 0.55, cy); g.fill(); }
    g.strokeStyle = 'rgba(200,16,46,0.85)'; g.lineWidth = 1.4; g.setLineDash([3, 3]);
    for (let k = -n; k <= 2 * n; k++) { g.beginPath(); g.moveTo(k * s, 0); g.lineTo(k * s + 256, 256); g.stroke(); g.beginPath(); g.moveTo(k * s, 256); g.lineTo(k * s + 256, 0); g.stroke(); }
    return tex(c, { repeat: [2, 1] });
  });
}
// gold letters on a dark face
export function letterTex(text, { w = 1024, h = 512, bg = '#0c0a10', ink = '#e8bd5a', font = '600 150px Fraunces, Georgia, serif', track = 14, glow = 'rgba(255,200,90,0.5)', border = true } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = ink; g.lineWidth = 6; g.strokeRect(28, 28, w - 56, h - 56); g.lineWidth = 2; g.strokeRect(44, 44, w - 88, h - 88); }
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (g.letterSpacing !== undefined) g.letterSpacing = track + 'px';
  g.shadowColor = glow; g.shadowBlur = 10; g.fillStyle = ink; g.fillText(text, w / 2, h / 2 + 6);
  return tex(c);
}

// ------------------------------------------------------------------------------------------------ materials
function phys(o) { return new THREE.MeshPhysicalMaterial({ roughness: 0.4, metalness: 0, ...o }); }
export const MAT = {};
export function mats() {
  if (MAT.ready) return MAT;
  Object.assign(MAT, {
    ready: true,
    lacquer: phys({ color: 0x07060a, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.03 }),
    gold: phys({ color: 0xe0b04c, metalness: 1, roughness: 0.24 }),
    brass: phys({ color: 0xc89a52, metalness: 1, roughness: 0.2 }),
    chrome: phys({ color: 0xeef0f4, metalness: 1, roughness: 0.07 }),
    steel: phys({ color: 0xb8bdc4, metalness: 1, roughness: 0.32 }),
    satin: phys({ color: 0xffffff, map: quiltTex(), roughness: 0.45, sheen: 1, sheenColor: new THREE.Color(0xffe6ee), sheenRoughness: 0.4 }),
    satinWhite: phys({ color: 0xf8f4ee, roughness: 0.5, sheen: 1, sheenColor: new THREE.Color(0xffffff) }),
    velvetBlack: phys({ color: 0x0a070c, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color(0x5a3a6a), sheenRoughness: 0.5 }),
    velvetRed: phys({ color: 0x7a0a1e, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xff4a6a), sheenRoughness: 0.45 }),
    // pew cushions: what the camera sees of a pew is its seat, so the seat carries the colour
    velvetBlush: phys({ color: 0x9a3452, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xffa6c4), sheenRoughness: 0.45 }),
    velvetPlum: phys({ color: 0x4a2346, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xb48ad0), sheenRoughness: 0.45 }),
    mahogany: phys({ color: 0xffffff, map: woodTex(), roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.12 }),
    pewDark: phys({ color: 0x8a7c7c, map: woodTex([40, 30, 34], 9), roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
    pewWhite: phys({ color: 0xf6f2ec, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.08 }),
    granite: phys({ color: 0xffffff, map: graniteTex(), roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.18 }),
    graniteBlack: phys({ color: 0xffffff, map: graniteTex('#141218', 8), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 }),
    marbleWhite: phys({ color: 0xf2eee8, roughness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.08 }),
    porcelain: phys({ color: 0xf4ede9, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.4, sheenColor: new THREE.Color(0xd9d2e6) }),
    soil: phys({ color: 0x6e5440, roughness: 0.95 }),        // fresh dirt by the grave (a near-black one read as a hole)
    mound: phys({ color: 0x5c6a50, roughness: 0.92 }),       // a grassed grave mound: dark brown ones read as open pits at night
    lily: phys({ color: 0xfbf8f2, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color(0xffffff) }),
    leaf: phys({ color: 0x1f3a24, roughness: 0.6 }),
    rose: phys({ color: 0xb00c2a, roughness: 0.4, clearcoat: 0.6 }),
    redPin: phys({ color: 0xe0142e, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
    glassPink: phys({ color: 0xff6fa8, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.75, emissive: new THREE.Color(0x5a0a2a) }),
    paper: phys({ color: 0xf6efe0, roughness: 0.8 }),
    sheet: phys({ color: 0xf2f2f0, roughness: 0.75, sheen: 0.5, sheenColor: new THREE.Color(0xffffff) }),
    asphalt: null, island: phys({ color: 0xf3f0ea, roughness: 0.35, clearcoat: 0.5 }),
    hearseGlass: phys({ color: 0x101018, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.85 }),
    lace: phys({ color: 0xffffff, roughness: 0.7, transparent: true, opacity: 0.9 }),
    tyre: phys({ color: 0x0c0c0e, roughness: 0.8 }),
    head: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.8, 2.3) }),
  });
  return MAT;
}
function m(geo, mat, cast = true) { const o = new THREE.Mesh(geo, mat); o.castShadow = cast; o.receiveShadow = true; return o; }
const rbox = (w, h, d, r = 0.02, s = 2) => new RoundedBoxGeometry(w, h, d, s, r);

// ------------------------------------------------------------------------------------------------ the casket
// 2.2 long (x) x 0.72 wide (z) x 0.6 high on its own; built with its base at y = 0. Two lids: the head lid
// (toward -x) stands open, hinged on the back edge; the foot lid carries the lilies and flips open on "Open".
export function makeCasket() {
  const M = mats(), g = new THREE.Group(); g.name = 'casket';
  const L = 2.2, W = 0.72, H = 0.6;
  // the shell: a lacquered box open at the top, with the quilted satin inside
  const wall = 0.05;
  g.add(m(rbox(L, 0.06, W, 0.02), M.lacquer));                                  // the floor of the box
  const front = m(rbox(L, H, wall, 0.015), M.lacquer); front.position.set(0, H / 2, W / 2 - wall / 2); g.add(front);
  const back = front.clone(); back.position.z = -W / 2 + wall / 2; g.add(back);
  const endA = m(rbox(wall, H, W, 0.015), M.lacquer); endA.position.set(-L / 2 + wall / 2, H / 2, 0); g.add(endA);
  const endB = endA.clone(); endB.position.x = L / 2 - wall / 2; g.add(endB);
  const lining = m(new THREE.BoxGeometry(L - wall * 2, 0.04, W - wall * 2), M.satin, false); lining.position.y = H - 0.18; g.add(lining);
  const pillow = m(rbox(0.36, 0.1, 0.48, 0.04), M.satinWhite, false); pillow.position.set(-L / 2 + 0.3, H - 0.12, 0); g.add(pillow);
  // gold bar handles along both sides, a gold rim line
  for (const s of [-1, 1]) {
    const bar = m(new THREE.CylinderGeometry(0.018, 0.018, L * 0.82, 10), M.gold); bar.rotation.z = Math.PI / 2; bar.position.set(0, H * 0.48, s * (W / 2 + 0.05)); g.add(bar);
    for (const x of [-0.75, 0, 0.75]) { const arm = m(new THREE.BoxGeometry(0.05, 0.04, 0.06), M.gold); arm.position.set(x, H * 0.48, s * (W / 2 + 0.025)); g.add(arm); }
  }
  const rim = m(new THREE.BoxGeometry(L + 0.01, 0.018, W + 0.01), M.gold); rim.position.y = H - 0.005; g.add(rim);
  // the lids: hinged on the back edge (z = -W/2)
  const mkLid = (len) => { const pv = new THREE.Group(); const lid = m(rbox(len, 0.1, W + 0.02, 0.04), M.lacquer); lid.position.set(0, 0.05, W / 2 + 0.01); pv.add(lid); const inner = m(new THREE.BoxGeometry(len - 0.08, 0.01, W - 0.08), M.satin, false); inner.position.set(0, -0.002, W / 2 + 0.01); pv.add(inner); const trim = m(new THREE.BoxGeometry(len, 0.014, 0.014), M.gold); trim.position.set(0, 0.1, W + 0.02); pv.add(trim); return pv; };
  const head = mkLid(L * 0.5); head.position.set(-L / 4, H, -W / 2); head.rotation.x = -1.75; g.add(head);
  const foot = mkLid(L * 0.5); foot.position.set(L / 4, H, -W / 2); g.add(foot);
  // a spray of white lilies on the foot lid
  const lilies = makeLilies(9, 0.32); lilies.position.set(0, 0.11, W / 2 + 0.01); foot.add(lilies);
  g.userData = { foot: { hx: L / 2, hz: W / 2 }, lidHead: head, lidFoot: foot, lilies, H };
  return g;
}
export function makeLilies(n = 9, spread = 0.3, seed = 4) {
  const M = mats(), g = new THREE.Group(), R = rng(seed);
  const petal = new THREE.ConeGeometry(0.045, 0.16, 5, 1, true); petal.translate(0, 0.08, 0);
  for (let i = 0; i < n; i++) {
    const fl = new THREE.Group();
    for (let k = 0; k < 5; k++) { const p = m(petal, M.lily); p.rotation.set(1.0, k / 5 * Math.PI * 2, 0, 'YXZ'); fl.add(p); }
    fl.position.set((R() - 0.5) * spread * 2.6, 0.04 + R() * 0.05, (R() - 0.5) * spread);
    fl.rotation.set((R() - 0.5) * 0.8, R() * 6, (R() - 0.5) * 0.8);
    g.add(fl);
    const lf = m(new THREE.BoxGeometry(0.26, 0.008, 0.05), M.leaf, false); lf.position.copy(fl.position); lf.position.y = 0.02; lf.rotation.y = R() * 6; g.add(lf);
  }
  return g;
}
export function makeCatafalque() {
  const M = mats(), g = new THREE.Group();
  const top = m(rbox(2.6, 0.65, 1.0, 0.03), M.velvetBlack); top.position.y = 0.325; g.add(top);
  const fringe = m(new THREE.BoxGeometry(2.62, 0.08, 1.02), M.gold); fringe.position.y = 0.6; g.add(fringe);
  g.userData.foot = { hx: 1.3, hz: 0.5 };
  return g;
}

// ------------------------------------------------------------------------------------------------ pews, chairs
export const PEW_CUSHION = { mahogany: 'velvetBlush', pewDark: 'velvetPlum', pewWhite: 'satinWhite' };
export function makePew(mat = 'mahogany', len = 2.6) {
  const M = mats(), g = new THREE.Group(), wm = M[mat];
  const seat = m(rbox(len, 0.07, 0.46, 0.02), wm); seat.position.set(0, 0.45, 0.04); g.add(seat);
  const cushion = m(rbox(len - 0.16, 0.06, 0.4, 0.03), PEW_CUSHION[mat] ? M[PEW_CUSHION[mat]] : M.velvetBlush); cushion.position.set(0, 0.51, 0.05);
  cushion.userData.cushion = true; g.add(cushion);
  const back = m(rbox(len, 0.55, 0.06, 0.02), wm); back.position.set(0, 0.7, -0.2); back.rotation.x = -0.08; g.add(back);
  const rail = m(rbox(len + 0.04, 0.05, 0.1, 0.02), wm); rail.position.set(0, 0.97, -0.22); g.add(rail);
  for (const s of [-1, 1]) {
    const end = m(rbox(0.07, 0.95, 0.6, 0.03), wm); end.position.set(s * (len / 2 - 0.035), 0.475, -0.02); g.add(end);
    const cap = m(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 18, 1, false, 0, Math.PI), wm); cap.rotation.set(0, Math.PI / 2, Math.PI / 2); cap.position.set(s * (len / 2 - 0.035), 0.95, -0.02); g.add(cap);
  }
  if (mat === 'pewWhite') { const bow = makeBow(); bow.position.set(len / 2 + 0.01, 0.82, 0.05); g.add(bow); const bow2 = makeBow(); bow2.position.set(-len / 2 - 0.01, 0.82, 0.05); g.add(bow2); }
  g.userData.foot = { hx: len / 2, hz: 0.32 };
  return g;
}
function makeBow() { const M = mats(), g = new THREE.Group(); for (const s of [-1, 1]) { const l = m(new THREE.TorusGeometry(0.07, 0.022, 6, 12), M.satinWhite, false); l.position.z = s * 0.06; l.rotation.y = Math.PI / 2; l.scale.set(1, 0.7, 1); g.add(l); } const t = m(new THREE.BoxGeometry(0.03, 0.3, 0.03), M.satinWhite, false); t.position.y = -0.15; g.add(t); return g; }
export function makeChair() {
  const M = mats(), g = new THREE.Group(), w = M.pewWhite;
  const seat = m(rbox(0.44, 0.04, 0.42, 0.015), w); seat.position.y = 0.46; g.add(seat);
  const back = m(rbox(0.44, 0.26, 0.03, 0.015), w); back.position.set(0, 0.78, -0.2); g.add(back);
  for (const [x, z] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) { const l = m(new THREE.CylinderGeometry(0.014, 0.014, x && z < 0 ? 0.92 : 0.46, 6), M.steel); l.position.set(x, z < 0 ? 0.46 : 0.23, z); g.add(l); }
  g.userData.foot = { hx: 0.24, hz: 0.24 };
  return g;
}

// ------------------------------------------------------------------------------------------------ the cemetery
function archShape(w, h, kind) {
  const s = new THREE.Shape(), hw = w / 2;
  if (kind === 'cross') {
    const a = 0.13, cy = h * 0.7; s.moveTo(-a, 0); s.lineTo(a, 0); s.lineTo(a, cy - a); s.lineTo(hw, cy - a); s.lineTo(hw, cy + a); s.lineTo(a, cy + a); s.lineTo(a, h); s.lineTo(-a, h); s.lineTo(-a, cy + a); s.lineTo(-hw, cy + a); s.lineTo(-hw, cy - a); s.lineTo(-a, cy - a); s.closePath(); return s;
  }
  s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, h - (kind === 'gothic' ? hw * 1.2 : hw));
  if (kind === 'gothic') { s.quadraticCurveTo(hw * 0.9, h - hw * 0.25, 0, h); s.quadraticCurveTo(-hw * 0.9, h - hw * 0.25, -hw, h - hw * 1.2); }
  else s.absarc(0, h - hw, hw, 0, Math.PI, false);
  s.lineTo(-hw, 0); return s;
}
export function makeHeadstone(kind = 'round', seed = 1) {
  const M = mats(), g = new THREE.Group();
  const w = 0.9, h = 1.1, d = 0.22;
  const geo = new THREE.ExtrudeGeometry(archShape(w, h, kind), { depth: d, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 12 });
  geo.translate(0, 0, -d / 2);
  const stone = m(geo, M.granite); g.add(stone);
  const base = m(rbox(w + 0.16, 0.14, d + 0.16, 0.03), M.granite); base.position.y = 0.07; g.add(base);
  // a low mound on its +z side
  const mound = m(new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.mound, false); mound.scale.set(0.42, 0.1, 0.95); mound.position.set(0, 0, 1.15); g.add(mound);
  g.userData.foot = { hx: w / 2 + 0.06, hz: d / 2 + 0.06 };
  g.userData.kind = kind;
  return g;
}
export function makeBeloved() {
  const M = mats(), g = new THREE.Group();
  const w = 2.0, h = 1.4, d = 0.3;
  const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h - 0.25); shape.quadraticCurveTo(w / 2, h, w / 2 - 0.3, h); shape.lineTo(-w / 2 + 0.3, h); shape.quadraticCurveTo(-w / 2, h, -w / 2, h - 0.25); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 10 }); geo.translate(0, 0, -d / 2);
  g.add(m(geo, M.graniteBlack));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.52), new THREE.MeshStandardMaterial({ map: letterTex('BELOVED', { w: 1024, h: 312, bg: '#0d0b10', font: '700 170px Fraunces, Georgia, serif', track: 26 }), roughness: 0.25, metalness: 0.5 }));
  face.position.set(0, h * 0.58, d / 2 + 0.032); g.add(face);
  const base = m(rbox(w + 0.2, 0.16, d + 0.2, 0.03), M.graniteBlack); base.position.y = 0.08; g.add(base);
  g.userData.foot = { hx: w / 2 + 0.05, hz: d / 2 + 0.06 };
  return g;
}
// the open grave in front of BELOVED: a dark pit with a dirt mound and the lowering rails
export function makeGrave() {
  const M = mats(), g = new THREE.Group();
  const pit = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.4), new THREE.MeshBasicMaterial({ color: 0x050306 })); pit.rotation.x = -Math.PI / 2; pit.position.y = 0.012; g.add(pit);
  const carpet = m(new THREE.BoxGeometry(1.5, 0.02, 2.9), phys({ color: 0x2e5a34, roughness: 0.95 }), false); carpet.position.y = 0.005; g.add(carpet);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 2.38), new THREE.MeshBasicMaterial({ color: 0x030204 })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.018; g.add(hole);
  for (const s of [-1, 1]) { const r = m(new THREE.BoxGeometry(0.05, 0.05, 2.7), M.brass); r.position.set(s * 0.56, 0.05, 0); g.add(r); }
  const dirt = m(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.soil, false); dirt.scale.set(0.7, 0.45, 1.3); dirt.position.set(1.6, 0, 0.2); g.add(dirt);
  g.userData.foot = null;
  return g;
}
export function makeLectern() {
  const M = mats(), g = new THREE.Group();
  const post = m(new THREE.CylinderGeometry(0.09, 0.14, 1.0, 12), M.mahogany); post.position.y = 0.5; g.add(post);
  const base = m(rbox(0.6, 0.08, 0.5, 0.03), M.mahogany); base.position.y = 0.04; g.add(base);
  const desk = m(rbox(0.7, 0.06, 0.5, 0.02), M.mahogany); desk.position.set(0, 1.1, 0.05); desk.rotation.x = 0.35; g.add(desk);
  const neck = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.2, 1.13, -0.1), new THREE.Vector3(0.22, 1.35, 0.0), new THREE.Vector3(0.12, 1.48, 0.2)]), 12, 0.012, 6), M.chrome); g.add(neck);
  const mic = m(new THREE.SphereGeometry(0.035, 10, 8), M.lacquer); mic.position.set(0.1, 1.49, 0.24); g.add(mic);
  g.userData.foot = { hx: 0.36, hz: 0.3 };
  g.userData.mic = mic;
  return g;
}
export function makeCanopy() {
  const M = mats(), g = new THREE.Group(), cloth = phys({ color: 0x0a080c, roughness: 0.7, side: THREE.DoubleSide, sheen: 0.6, sheenColor: new THREE.Color(0x4a3a5a) });
  const W = 6, D = 4, H = 2.5;
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) { const p = m(new THREE.CylinderGeometry(0.04, 0.04, H, 8), M.brass); p.position.set(x, H / 2, z); g.add(p); }
  // valance only (scalloped), so the camera sees under it; a thin roof frame
  for (const [w, x, z, ry] of [[W, 0, -D / 2, 0], [W, 0, D / 2, 0], [D, -W / 2, 0, Math.PI / 2], [D, W / 2, 0, Math.PI / 2]]) {
    const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, -0.22);
    const n = Math.round(w / 0.5); for (let i = n; i > 0; i--) { const x0 = -w / 2 + i * w / n, x1 = x0 - w / n; shape.quadraticCurveTo((x0 + x1) / 2, -0.42, x1, -0.22); }
    shape.closePath();
    const v = m(new THREE.ShapeGeometry(shape), cloth); v.position.set(x, H, z); v.rotation.y = ry; g.add(v);
    const fr = m(new THREE.BoxGeometry(w, 0.03, 0.03), M.gold); fr.position.set(x, H - 0.23, z); fr.rotation.y = ry; g.add(fr);
  }
  g.userData.foot = null;
  return g;
}

// ------------------------------------------------------------------------------------------------ the velvet rope (the front edge, always)
export function makeRope(white = false, x0 = -11, x1 = 11, z = 7.2) {
  const M = mats(), g = new THREE.Group();
  const post = mergeGeometries([new THREE.CylinderGeometry(0.16, 0.2, 0.04, 16).translate(0, 0.02, 0), new THREE.CylinderGeometry(0.03, 0.035, 0.92, 10).translate(0, 0.48, 0), new THREE.SphereGeometry(0.06, 12, 8).translate(0, 0.97, 0)]);
  const n = Math.round((x1 - x0) / 2) + 1;
  const posts = new THREE.InstancedMesh(post, white ? M.satinWhite : M.brass, n); posts.castShadow = true;
  const mm = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { mm.makeTranslation(x0 + (x1 - x0) * i / (n - 1), 0, z); posts.setMatrixAt(i, mm); }
  g.add(posts);
  const ropes = [];
  for (let i = 0; i < n - 1; i++) {
    const a = x0 + (x1 - x0) * i / (n - 1), b = x0 + (x1 - x0) * (i + 1) / (n - 1);
    const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new THREE.Vector3(a + (b - a) * t, 0.9 - Math.sin(t * Math.PI) * 0.22, z)); }
    ropes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.028, 6));
  }
  g.add(m(mergeGeometries(ropes), white ? M.satinWhite : M.velvetRed));
  return g;
}

// ------------------------------------------------------------------------------------------------ the procession
export function makeHearse(seed = 1) {
  const M = mats(), g = new THREE.Group();
  // a long 1950s side profile (x along the car, y up), extruded across its width
  const L = 5.6, Wd = 1.5;
  const s = new THREE.Shape();
  s.moveTo(-2.8, 0.32); s.lineTo(2.75, 0.32); s.quadraticCurveTo(2.85, 0.33, 2.85, 0.5); s.lineTo(2.82, 0.78); s.quadraticCurveTo(2.7, 0.9, 1.7, 0.95);
  s.lineTo(1.0, 1.02); s.lineTo(0.55, 1.55); s.lineTo(-2.35, 1.6); s.quadraticCurveTo(-2.65, 1.56, -2.72, 1.2); s.lineTo(-2.85, 1.05); s.lineTo(-2.9, 0.62); s.quadraticCurveTo(-2.9, 0.34, -2.8, 0.32);
  const body = new THREE.ExtrudeGeometry(s, { depth: Wd, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.08, bevelSegments: 3, curveSegments: 10 });
  body.translate(0, 0, -Wd / 2);
  g.add(m(body, M.lacquer));
  // windows: side glass with lace curtains, the back window with flowers
  for (const sd of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.42), M.hearseGlass); win.position.set(-0.95, 1.3, sd * (Wd / 2 + 0.085)); if (sd < 0) win.rotation.y = Math.PI; g.add(win);
    const lace = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.36), M.lace); lace.position.set(-0.95, 1.3, sd * (Wd / 2 + 0.075)); if (sd < 0) lace.rotation.y = Math.PI; g.add(lace);
    // landau bars (gold S-curves on the rear quarter)
    const bar = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-2.5, 1.25, 0), new THREE.Vector3(-2.15, 1.15, 0), new THREE.Vector3(-1.9, 1.32, 0), new THREE.Vector3(-1.6, 1.2, 0)]), 16, 0.022, 6), M.chrome); bar.position.z = sd * (Wd / 2 + 0.09); g.add(bar);
    // chrome trim line, wheels
    const trim = m(new THREE.BoxGeometry(5.4, 0.03, 0.02), M.chrome); trim.position.set(0, 0.72, sd * (Wd / 2 + 0.08)); g.add(trim);
    for (const x of [-1.9, 1.8]) { const w = m(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 18), M.tyre); w.rotation.x = Math.PI / 2; w.position.set(x, 0.36, sd * (Wd / 2 - 0.05)); g.add(w); const hub = m(new THREE.CylinderGeometry(0.2, 0.2, 0.26, 16), M.chrome); hub.rotation.x = Math.PI / 2; hub.position.copy(w.position); g.add(hub); }
  }
  for (const x of [2.92, -2.95]) { const bump = m(rbox(0.16, 0.18, Wd + 0.15, 0.06), M.chrome); bump.position.set(x, 0.45, 0); g.add(bump); }
  // fins at the rear
  for (const sd of [-1, 1]) { const fin = m(new THREE.ConeGeometry(0.08, 0.9, 4), M.lacquer); fin.rotation.z = Math.PI / 2 + 0.15; fin.position.set(-2.6, 1.05, sd * 0.68); g.add(fin); }
  const flowers = makeLilies(6, 0.25, seed + 3); flowers.position.set(-2.4, 1.2, 0); flowers.scale.setScalar(1.4); g.add(flowers);
  // headlights: the glow, and the beams slicing across the floor ahead (additive light pools)
  for (const sd of [-1, 1]) { const hl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), M.head); hl.position.set(2.86, 0.7, sd * 0.5); g.add(hl); }
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 3.4), beamMat()); beam.rotation.x = -Math.PI / 2; beam.position.set(2.9 + 3.75, 0.035, 0); beam.renderOrder = 2; g.add(beam);
  g.userData.foot = { hx: L / 2, hz: Wd / 2 + 0.05 };
  mergeByMaterial(g);   // 60 parts, 9 materials: one draw each
  return g;
}
// A built prop's parts that share a material (and cast alike) become one mesh: same look, a draw call per material.
// Instanced parts and light (additive) parts stay as they are.
function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.material || Array.isArray(o.material)) return;
    if (o.material.blending !== THREE.NormalBlending) return;
    const key = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const geos = list.map((o) => {
      let gm = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      if (gm.index) gm = gm.toNonIndexed();
      if (!gm.attributes.normal) gm.computeVertexNormals();
      return gm;
    });
    const keep = ['position', 'normal', 'uv'].filter((a) => geos.every((gm) => gm.attributes[a]));
    for (const gm of geos) { for (const a of Object.keys(gm.attributes)) if (!keep.includes(a)) gm.deleteAttribute(a); gm.morphAttributes = {}; }
    const merged = mergeGeometries(geos); if (!merged) continue;
    const mesh = new THREE.Mesh(merged, list[0].material);
    mesh.castShadow = list[0].castShadow; mesh.receiveShadow = list[0].receiveShadow;
    for (const o of list) { o.parent.remove(o); o.geometry.dispose(); }
    root.add(mesh);
  }
}
let BEAM = null;
function beamMat() {
  if (BEAM) return BEAM;
  const [c, g] = canvas(256, 128);
  // two warm cones from the left edge, bright at the lamps, fading out
  for (const y of [44, 84]) { const grd = g.createRadialGradient(0, y, 2, 0, y, 250); grd.addColorStop(0, 'rgba(255,240,210,0.9)'); grd.addColorStop(0.5, 'rgba(255,230,190,0.35)'); grd.addColorStop(1, 'rgba(255,220,180,0)'); g.fillStyle = grd; g.beginPath(); g.moveTo(0, y - 4); g.lineTo(256, y - 46); g.lineTo(256, y + 46); g.lineTo(0, y + 4); g.closePath(); g.fill(); }
  BEAM = new THREE.MeshBasicMaterial({ map: tex(c), color: new THREE.Color(1.6, 1.5, 1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  return BEAM;
}
export function makeIsland() {
  const M = mats(), g = new THREE.Group();
  const p = m(rbox(4, 0.32, 1, 0.05), M.island); p.position.y = 0.16; g.add(p);
  const k = m(new THREE.BoxGeometry(4.04, 0.04, 1.04), M.gold); k.position.y = 0.3; g.add(k);
  g.userData.foot = { hx: 2, hz: 0.5 };
  return g;
}
// the cemetery road: asphalt, a gold dashed centre line, white edges; z in [-1.9, 1.9], 34 m long
export function makeRoad(len = 34) {
  const [c, g] = canvas(2048, 256), R = rng(11);
  g.fillStyle = '#17151b'; g.fillRect(0, 0, 2048, 256);
  for (let i = 0; i < 9000; i++) { const l = R(); g.fillStyle = l < 0.5 ? 'rgba(0,0,0,0.3)' : 'rgba(180,170,190,0.12)'; g.fillRect(R() * 2048, R() * 256, 1 + R() * 2, 1 + R() * 2); }
  g.fillStyle = '#e0b04c'; for (let x = 0; x < 2048; x += 96) g.fillRect(x, 124, 52, 8);
  g.fillStyle = 'rgba(240,236,230,0.85)'; g.fillRect(0, 8, 2048, 6); g.fillRect(0, 242, 2048, 6);
  const mat = new THREE.MeshStandardMaterial({ map: tex(c), roughness: 0.55, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -2 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(len, 3.8), mat); road.rotation.x = -Math.PI / 2; road.receiveShadow = true; road.position.y = 0.012;
  const grp = new THREE.Group(); grp.add(road); grp.userData.mat = mat;
  return grp;
}

// ------------------------------------------------------------------------------------------------ the prep room
export function makeTable() {
  const M = mats(), g = new THREE.Group();
  const top = m(rbox(2.2, 0.06, 0.8, 0.02), M.steel); top.position.y = 0.88; g.add(top);
  for (const [x, z] of [[-1, -0.32], [1, -0.32], [-1, 0.32], [1, 0.32]]) { const l = m(new THREE.CylinderGeometry(0.025, 0.025, 0.82, 8), M.chrome); l.position.set(x, 0.47, z); g.add(l); const w = m(new THREE.SphereGeometry(0.05, 10, 8), M.tyre); w.position.set(x, 0.05, z); g.add(w); }
  const sheet = m(rbox(2.24, 0.12, 0.86, 0.05, 3), M.sheet); sheet.position.y = 0.95; g.add(sheet);
  for (const s of [-1, 1]) { const drape = m(new THREE.BoxGeometry(2.2, 0.36, 0.02), M.sheet); drape.position.set(0, 0.76, s * 0.43); g.add(drape); }
  g.userData.foot = { hx: 1.1, hz: 0.4 };
  return g;
}
export function makePartition(w = 23) {
  const M = mats(), g = new THREE.Group();
  const panel = m(new THREE.BoxGeometry(w, 2.6, 0.08), M.steel); panel.position.set(-w / 2, 1.3, 0); g.add(panel);
  for (let i = 0; i < Math.floor(w / 1.2); i++) { const rib = m(new THREE.BoxGeometry(0.04, 2.6, 0.12), M.chrome); rib.position.set(-0.6 - i * 1.2, 1.3, 0); g.add(rib); }
  const track = m(new THREE.BoxGeometry(w + 2, 0.08, 0.14), M.chrome); track.position.set(-w / 2, 2.7, 0); g.add(track);
  g.userData.foot = { hx: w / 2, hz: 0.06, cx: -w / 2 };
  return g;
}
export function makeTrolley(seed = 2) {
  const M = mats(), g = new THREE.Group(), R = rng(seed);
  for (const y of [0.35, 0.82]) { const sh = m(rbox(1.1, 0.04, 0.6, 0.015), M.steel); sh.position.y = y; g.add(sh); }
  for (const [x, z] of [[-0.52, -0.27], [0.52, -0.27], [-0.52, 0.27], [0.52, 0.27]]) { const l = m(new THREE.CylinderGeometry(0.015, 0.015, 0.85, 6), M.chrome); l.position.set(x, 0.45, z); g.add(l); const w = m(new THREE.SphereGeometry(0.04, 8, 6), M.tyre); w.position.set(x, 0.04, z); g.add(w); }
  const jars = new THREE.Group(); jars.name = 'jars';
  for (let i = 0; i < 6; i++) { const h = 0.18 + R() * 0.14; const j = m(new THREE.CylinderGeometry(0.06, 0.06, h, 12), M.glassPink, false); j.position.set(-0.4 + (i % 3) * 0.4 + (R() - 0.5) * 0.06, 0.84 + h / 2, i < 3 ? -0.12 : 0.13); jars.add(j); }
  g.add(jars);
  g.userData.foot = { hx: 0.58, hz: 0.32 }; g.userData.jars = jars;
  return g;
}
export function makeGuestBook() {
  const M = mats(), g = new THREE.Group();
  const post = m(new THREE.CylinderGeometry(0.025, 0.04, 1.0, 10), M.brass); post.position.y = 0.5; g.add(post);
  const foot = m(new THREE.CylinderGeometry(0.22, 0.25, 0.04, 16), M.brass); foot.position.y = 0.02; g.add(foot);
  const desk = new THREE.Group(); desk.position.y = 1.05; desk.rotation.x = 0.3; g.add(desk);
  const pages = m(rbox(0.56, 0.05, 0.4, 0.01), M.paper); desk.add(pages);
  const edge = m(new THREE.BoxGeometry(0.58, 0.02, 0.42), M.gold); edge.position.y = -0.03; desk.add(edge);
  const cover = m(rbox(0.3, 0.02, 0.42, 0.01), phys({ color: 0x2a0a14, roughness: 0.4 })); cover.position.set(0.15, 0.04, 0); desk.add(cover);
  const vase = m(new THREE.CylinderGeometry(0.1, 0.07, 0.5, 14), M.marbleWhite); vase.position.set(0.55, 0.25, 0); g.add(vase);
  const bq = makeBouquet(); bq.position.set(0.55, 0.55, 0); g.add(bq);
  g.userData = { foot: { r: 0.3 }, desk, cover, bouquet: bq };
  return g;
}
export function makeBouquet(white = false) {
  const g = new THREE.Group();
  const l = makeLilies(7, 0.12, 8); l.scale.setScalar(1.3); g.add(l);
  const M = mats();
  for (let i = 0; i < 3; i++) { const rb = m(new THREE.BoxGeometry(0.03, 0.4, 0.005), white ? M.satinWhite : M.satinWhite, false); rb.position.set((i - 1) * 0.05, -0.2, 0.02); rb.rotation.z = (i - 1) * 0.3; g.add(rb); }
  return g;
}

// ------------------------------------------------------------------------------------------------ her things
// the map pin of TAGGED LOCATION: HEAVEN (2.4 m tall), point down at y = 0
export function makePin() {
  const M = mats(), g = new THREE.Group();
  const head = m(new THREE.SphereGeometry(0.62, 24, 16), M.redPin); head.position.y = 1.75; g.add(head);
  const cone = m(new THREE.ConeGeometry(0.6, 1.5, 24, 1, true), M.redPin); cone.rotation.x = Math.PI; cone.position.y = 0.75; g.add(cone);
  const dot = m(new THREE.SphereGeometry(0.22, 16, 12), phys({ color: 0xffffff, roughness: 0.3 })); dot.position.set(0, 1.78, 0.5); g.add(dot);
  g.userData.foot = { r: 0.5 };
  return g;
}
// a phone-style location tag: a white pill with a pin glyph and the word, lower case
export function tagTexture(word) {
  const [c, g] = canvas(512, 160);
  g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 512, 160);
  g.fillStyle = '#fbfbfd'; g.beginPath(); g.roundRect(8, 20, 496, 120, 60); g.fill();
  g.fillStyle = '#e0142e'; g.beginPath(); g.arc(80, 70, 26, Math.PI, 0); g.lineTo(80, 116); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(80, 70, 10, 0, 7); g.fill();
  g.fillStyle = '#16121a'; g.font = '600 72px "Space Grotesk", Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText(word, 130, 84);
  return tex(c);
}
// a porcelain hand bursting out of the soil (DIRT UNDER MY NAILS): a clawed hand ~0.6 m, wrist at y = 0
let HAND_GEO = null;
export function handGeometry() {
  if (HAND_GEO) return HAND_GEO;
  const parts = [];
  const palm = new THREE.CapsuleGeometry(0.11, 0.16, 4, 8); palm.scale(1, 1, 0.45); palm.translate(0, 0.28, 0); parts.push(palm);
  const wrist = new THREE.CylinderGeometry(0.07, 0.08, 0.3, 10); wrist.translate(0, 0.08, 0); parts.push(wrist);
  for (let i = 0; i < 4; i++) {
    const x = -0.075 + i * 0.05, len = [0.15, 0.18, 0.17, 0.13][i];
    const a = new THREE.CapsuleGeometry(0.022, len, 3, 6); a.translate(0, len / 2, 0); a.rotateX(-0.25); a.translate(x, 0.44, 0.0); parts.push(a);
    const b = new THREE.CapsuleGeometry(0.019, len * 0.7, 3, 6); b.translate(0, len * 0.35, 0); b.rotateX(-1.1); b.translate(x, 0.44 + len * 0.95, 0.05); parts.push(b);
  }
  const th = new THREE.CapsuleGeometry(0.025, 0.12, 3, 6); th.translate(0, 0.06, 0); th.rotateZ(0.9); th.translate(-0.11, 0.26, 0.03); parts.push(th);
  HAND_GEO = mergeGeometries(parts.map((p) => p.toNonIndexed ? p.toNonIndexed() : p));
  HAND_GEO.computeVertexNormals();
  return HAND_GEO;
}
// the white rose arch of the wedding (x across, at the back)
export function makeArch() {
  const M = mats(), g = new THREE.Group();
  const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push(new THREE.Vector3(Math.cos(a) * 1.5, Math.sin(a) * 2.6 * 0.9 + 0.2 * (1 - Math.sin(a)), 0)); }
  const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.07, 8), M.satinWhite); arc.castShadow = true; g.add(arc);
  const R = rng(21), rose = new THREE.SphereGeometry(0.09, 10, 8), roses = new THREE.InstancedMesh(rose, M.lily, 70), mm = new THREE.Matrix4();
  for (let i = 0; i < 70; i++) { const a = Math.PI * R(); const r = 1.5 + (R() - 0.5) * 0.2; mm.makeTranslation(Math.cos(a) * r, Math.sin(a) * 2.6 * 0.9 + 0.2 * (1 - Math.sin(a)) + (R() - 0.5) * 0.15, (R() - 0.5) * 0.22); roses.setMatrixAt(i, mm); }
  roses.castShadow = true; g.add(roses);
  for (const s of [-1, 1]) { const b = m(new THREE.CylinderGeometry(0.18, 0.22, 0.2, 14), M.marbleWhite); b.position.set(s * 1.5, 0.1, 0); g.add(b); }
  g.userData.foot = null;
  return g;
}
export function makeRunner(color = 0xf4eee8, len = 9, w = 1.4) {
  const mat = phys({ color, roughness: 0.75, sheen: 0.6, sheenColor: new THREE.Color(0xffffff), polygonOffset: true, polygonOffsetFactor: -3 });
  const r = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat); r.rotation.x = -Math.PI / 2; r.position.y = 0.014; r.receiveShadow = true;
  const g = new THREE.Group(); g.add(r);   // the set places props by their group: the cloth keeps lying flat
  return g;
}
// the funeral home's letter board (OPEN CASKET, OPEN BAR): black felt, white letters clicking in word by word
export function makeLetterBoard() {
  const [c, g] = canvas(512, 384);
  const M = mats(), grp = new THREE.Group();
  const t = tex(c);
  const draw = (words) => {
    g.fillStyle = '#121014'; g.fillRect(0, 0, 512, 384);
    for (let y = 0; y < 384; y += 12) { g.fillStyle = 'rgba(255,255,255,0.035)'; g.fillRect(0, y, 512, 2); }
    g.fillStyle = '#f2efe8'; g.font = '700 74px "Archivo Black", Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = [words.slice(0, 2).join(' '), words.slice(2, 4).join(' ')];
    lines.forEach((l, i) => { if (l) g.fillText(l.replace(',', ''), 256, 120 + i * 140); });
    if (words.length >= 2) { g.fillText(',', 256 + 196, 120); }
    t.needsUpdate = true;
  };
  draw([]);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.05), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
  board.position.set(0, 1.45, 0.03); grp.add(board);
  const frame = m(new THREE.BoxGeometry(1.5, 1.15, 0.05), M.gold); frame.position.set(0, 1.45, 0); grp.add(frame);
  for (const s of [-1, 1]) { const leg = m(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 6), M.brass); leg.position.set(s * 0.5, 0.95, -0.25); leg.rotation.x = 0.15; grp.add(leg); }
  grp.userData = { draw, foot: null };
  return grp;
}
// a sign board (the 3 a.m. hymn board): dark wood, white slide-in letters; readable only when lit
export function makeHymnBoard(text = 'DISRESPECTING THE DECEASED') {
  const [c, g] = canvas(512, 768);
  g.fillStyle = '#1b120e'; g.fillRect(0, 0, 512, 768);
  for (let y = 60; y < 740; y += 62) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(30, y + 46, 452, 6); }
  g.fillStyle = '#f0ece4'; g.font = '700 58px "Archivo Black", Arial Black, sans-serif'; g.textAlign = 'center';
  const words = text.split(' '); words.forEach((w, i) => g.fillText(w, 256, 160 + i * 150));
  const mat = new THREE.MeshStandardMaterial({ map: tex(c), roughness: 0.8, emissive: new THREE.Color(0xffffff), emissiveMap: tex(c), emissiveIntensity: 0 });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), mat); board.position.y = 1.8;
  const grp = new THREE.Group(); grp.add(board); grp.userData = { mat, foot: null };
  return grp;
}
