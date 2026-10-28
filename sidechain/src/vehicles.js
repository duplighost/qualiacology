// The ambulance and the bus, built from code: shaped bodies with rounded edges,
// glass, chrome, wheels with hubs, light bars, mirrors, lettering. Local axes:
// +z is the nose, +x is the vehicle's left, y is up from the road.

import * as THREE from 'three';

// a side silhouette (points along z, y) pushed out across the width, its edges rounded
function profile(points, width, round = 0.12) {
  const s = new THREE.Shape();
  points.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width - round * 2, bevelEnabled: true, bevelThickness: round, bevelSize: round, bevelSegments: 4, curveSegments: 8 });
  // shape is in (x=z, y): turn so the extrusion runs across the vehicle (x) and centre it
  g.translate(0, 0, -(width - round * 2) / 2);
  g.rotateY(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

// a box with rounded edges all round
function roundBox(w, h, l, r = 0.1) {
  const s = new THREE.Shape();
  const x = w / 2 - r, z = l / 2 - r;
  s.moveTo(-x, -l / 2); s.lineTo(x, -l / 2); s.quadraticCurveTo(w / 2, -l / 2, w / 2, -z); s.lineTo(w / 2, z);
  s.quadraticCurveTo(w / 2, l / 2, x, l / 2); s.lineTo(-x, l / 2); s.quadraticCurveTo(-w / 2, l / 2, -w / 2, z);
  s.lineTo(-w / 2, -z); s.quadraticCurveTo(-w / 2, -l / 2, -x, -l / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.5, bevelSegments: 3, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);   // extrude up
  g.translate(0, -h / 2 + r, 0);
  g.computeVertexNormals();
  return g;
}

function textTexture(lines, opt = {}) {
  const W = opt.w || 1024, H = opt.h || 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  if (opt.bg) { g.fillStyle = opt.bg; g.fillRect(0, 0, W, H); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = opt.font || 'bold 150px "Arial Narrow", Arial, sans-serif';
  if (opt.glow) { g.shadowColor = opt.glow; g.shadowBlur = opt.blur ?? 16; }
  g.fillStyle = opt.color || '#c8102e';
  lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * (opt.lh || 150)));
  if (opt.mirror) { const m = document.createElement('canvas'); m.width = W; m.height = H; const mg = m.getContext('2d'); mg.translate(W, 0); mg.scale(-1, 1); mg.drawImage(c, 0, 0); return tex(m); }
  return tex(c);
}
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// the inside of a night bus seen through its windows: warm strip lights, the tops of the
// seats, the window frames, and somebody sitting by one of them
function busInterior(panes, who) {
  const W = 128 * panes, H = 160;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#fff1d6'); grad.addColorStop(0.35, '#ffd69e'); grad.addColorStop(1, '#a8743e');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // strip light along the ceiling
  g.fillStyle = '#fffaf0'; g.fillRect(0, 6, W, 7);
  for (let i = 0; i < panes; i++) {
    const x0 = i * 128;
    // the seats: two backs per pane, dark red against the light
    for (const sx of [18, 70]) {
      g.fillStyle = '#4a1a24';
      g.beginPath(); g.roundRect(x0 + sx, 98, 40, 70, 10); g.fill();
      g.fillStyle = '#6a2a34'; g.fillRect(x0 + sx + 4, 104, 32, 6);
    }
    // a handrail
    g.fillStyle = '#c8b090'; g.fillRect(x0, 40, 128, 3);
    // window frame
    g.fillStyle = '#1a1c22'; g.fillRect(x0, 0, 8, H); g.fillRect(x0 + 120, 0, 8, H);
  }
  // the passenger: head and shoulders by the window, looking out
  if (who !== undefined) {
    const x = who * 128 + 56;
    g.fillStyle = '#140c0e';
    g.beginPath(); g.ellipse(x, 72, 15, 18, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.roundRect(x - 28, 92, 56, 70, 18); g.fill();
  }
  g.fillStyle = '#1a1c22'; g.fillRect(0, 0, W, 4); g.fillRect(0, H - 6, W, 6);
  return tex(c);
}

// the star of life: six blue arms and the staff in white
function starTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.translate(128, 128);
  g.fillStyle = '#0b5fd6';
  for (let i = 0; i < 3; i++) { g.save(); g.rotate(i * Math.PI / 3); g.fillRect(-26, -112, 52, 224); g.restore(); }
  g.strokeStyle = '#ffffff'; g.lineWidth = 9;
  g.beginPath(); g.moveTo(0, -78); g.lineTo(0, 78); g.stroke();
  g.lineWidth = 6; g.beginPath();
  for (let y = -60; y <= 60; y += 2) { const x = Math.sin(y * 0.11) * 14; if (y === -60) g.moveTo(x, y); else g.lineTo(x, y); }
  g.stroke();
  return tex(c);
}

function wheel(radius, width, rubber, rim, hub) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 24, 1), rubber);
  tire.rotation.z = Math.PI / 2; g.add(tire);
  const wall = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.82, radius * 0.18, 8, 24), rubber);
  wall.rotation.y = Math.PI / 2; wall.position.x = width * 0.5; g.add(wall);
  const r = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width * 1.02, 20), rim);
  r.rotation.z = Math.PI / 2; g.add(r);
  const h = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.2, radius * 0.24, width * 1.12, 10), hub);
  h.rotation.z = Math.PI / 2; g.add(h);
  for (let k = 0; k < 6; k++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(width * 1.06, radius * 0.08, radius * 0.5), hub);
    sp.rotation.x = k * Math.PI / 3; sp.position.x = 0.002; g.add(sp);
  }
  return g;
}

function mats() {
  return {
    white: new THREE.MeshPhysicalMaterial({ color: 0xf3f1ee, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xc8102e, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0a0e16, roughness: 0.05, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.02 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.12, metalness: 1 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.75 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.9 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.5, metalness: 0.4 }),
    lensW: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 2.2, roughness: 0.2 }),
    lensR: new THREE.MeshStandardMaterial({ color: 0x400004, emissive: 0xff1020, emissiveIntensity: 2.4, roughness: 0.2 }),
    lensA: new THREE.MeshStandardMaterial({ color: 0x402000, emissive: 0xffa020, emissiveIntensity: 1.8, roughness: 0.2 }),
  };
}

function add(g, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; }

// his car: a sensible sedan in a sensible colour, both hands at ten and two
export function buildSedan(paint = 0xd8ccb4) {
  const g = new THREE.Group();
  const M = mats();
  const W = 1.84;
  const body = new THREE.MeshPhysicalMaterial({ color: paint, roughness: 0.3, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.06 });
  // the body to the belt line, then the glass house, then the roof
  add(g, profile([[-2.42, 0.3], [2.36, 0.3], [2.44, 0.6], [2.34, 0.84], [1.12, 0.95], [-1.86, 1.0], [-2.43, 0.95], [-2.47, 0.6]], W, 0.14), body, 0, 0, 0);
  add(g, profile([[1.1, 0.93], [0.32, 1.33], [-0.96, 1.35], [-1.84, 0.98]], W - 0.2, 0.06), M.glass, 0, 0, 0);
  add(g, roundBox(W - 0.24, 0.09, 1.24, 0.04), body, 0, 1.42, -0.32);
  // pillars between the windows, so the glass reads as windows
  for (const s of [-1, 1]) {
    add(g, new THREE.BoxGeometry(0.05, 0.44, 0.09), body, s * (W / 2 - 0.1), 1.17, -0.4, 0, 0, 0);
    add(g, new THREE.BoxGeometry(0.04, 0.03, 1.0), M.chrome, s * (W / 2 + 0.005), 0.95, 0.35);
    add(g, roundBox(0.12, 0.1, 0.22, 0.03), body, s * (W / 2 + 0.06), 1.0, 0.95);                 // mirrors
    add(g, new THREE.BoxGeometry(0.02, 0.03, 0.18), M.chrome, s * (W / 2 + 0.01), 0.74, 0.25);     // door handles
    add(g, new THREE.BoxGeometry(0.02, 0.03, 0.18), M.chrome, s * (W / 2 + 0.01), 0.74, -0.85);
    add(g, roundBox(0.42, 0.15, 0.06, 0.04), M.lensW, s * 0.6, 0.68, 2.39);                       // headlights
    add(g, roundBox(0.46, 0.17, 0.06, 0.04), M.lensR, s * 0.58, 0.8, -2.45);                      // tail lights
    add(g, roundBox(0.14, 0.08, 0.05, 0.02), M.lensA, s * 0.86, 0.6, 2.36);                       // indicators
  }
  add(g, roundBox(1.0, 0.18, 0.06, 0.04), M.black, 0, 0.54, 2.42);       // grille
  add(g, roundBox(1.9, 0.14, 0.2, 0.06), M.trim, 0, 0.38, 2.42);         // bumpers
  add(g, roundBox(1.9, 0.14, 0.2, 0.06), M.trim, 0, 0.42, -2.48);
  const plate = new THREE.MeshBasicMaterial({ map: textTexture(['NOTHNG'], { w: 512, h: 256, bg: '#f4f2ea', color: '#1a3a8a', font: 'bold 120px "Arial Narrow", Arial, sans-serif' }) });
  add(g, new THREE.PlaneGeometry(0.52, 0.13), plate, 0, 0.56, -2.59, 0, Math.PI, 0);
  for (const s of [-1, 1]) for (const z of [1.45, -1.48]) {
    const w = wheel(0.33, 0.22, M.rubber, M.chrome, M.chrome); w.position.set(s * (W / 2 - 0.12), 0.33, z); if (s < 0) w.rotation.y = Math.PI; g.add(w);
    add(g, new THREE.TorusGeometry(0.4, 0.06, 6, 16, Math.PI), M.black, s * (W / 2 + 0.002), 0.33, z, 0, Math.PI / 2, 0);
  }
  // lights: heads, tails, and the indicator on the side he's turning to, blinking
  g.userData.lights = [
    [0.6, 0.68, 2.44, 1.5, [1, 0.96, 0.86], 1.4, 0], [-0.6, 0.68, 2.44, 1.5, [1, 0.96, 0.86], 1.4, 0],
    [0.58, 0.8, -2.5, 1.2, [1, 0.08, 0.06], 1.6, 0], [-0.58, 0.8, -2.5, 1.2, [1, 0.08, 0.06], 1.6, 0],
    [0.86, 0.6, 2.4, 1.3, [1, 0.6, 0.08], 2.6, 5], [0.9, 0.8, -2.5, 1.4, [1, 0.6, 0.08], 2.8, 5],
  ];
  return g;
}

// a hearse: long and black and polished, the curtained back, chrome landau bars on the
// rear pillars, purple flags on the front wings
export function buildHearse() {
  const g = new THREE.Group();
  const M = mats();
  const W = 1.96;
  const body = new THREE.MeshPhysicalMaterial({ color: 0x1c1c24, roughness: 0.16, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.04 });
  // body to the belt, a long flat roof over the back, the glass up front
  add(g, profile([[-3.15, 0.32], [3.0, 0.32], [3.1, 0.62], [3.0, 0.9], [1.7, 1.02], [-3.1, 1.06], [-3.2, 0.62]], W, 0.14), body, 0, 0, 0);
  add(g, profile([[1.68, 1.0], [0.98, 1.55], [-3.02, 1.6], [-3.12, 1.04]], W - 0.12, 0.08), body, 0, 0, 0);
  add(g, roundBox(W - 0.18, 0.1, 4.2, 0.05), body, 0, 1.66, -1.0);
  // the windscreen and the front door glass
  add(g, new THREE.PlaneGeometry(W - 0.34, 0.66), M.glass, 0, 1.3, 1.34, -0.85, 0, 0);
  const curtain = new THREE.MeshStandardMaterial({ color: 0x4a3a50, emissive: 0xd8c0f0, emissiveIntensity: 1.1, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const s of [-1, 1]) {
    add(g, new THREE.PlaneGeometry(0.9, 0.46), M.glass, s * (W / 2 + 0.005), 1.28, 0.82, 0, s * Math.PI / 2, 0);
    // the long back window, curtained in pleats, a little light behind them
    add(g, new THREE.PlaneGeometry(1.7, 0.42), curtain, s * (W / 2 + 0.006), 1.3, -1.25, 0, s * Math.PI / 2, 0);
    for (let k = 0; k < 9; k++) add(g, new THREE.BoxGeometry(0.02, 0.42, 0.03), M.trim, s * (W / 2 + 0.012), 1.3, -2.05 + k * 0.2);
    // the landau bar: an S of chrome on the blind rear pillar
    const bar = new THREE.TorusGeometry(0.36, 0.035, 6, 20, Math.PI);
    add(g, bar, M.chrome, s * (W / 2 + 0.02), 1.28, -2.62, 0, s * Math.PI / 2, 0);
    add(g, new THREE.BoxGeometry(0.03, 0.03, 0.9), M.chrome, s * (W / 2 + 0.015), 0.96, -0.2);
    add(g, roundBox(0.12, 0.1, 0.22, 0.03), body, s * (W / 2 + 0.06), 1.08, 1.05);
    add(g, roundBox(0.42, 0.14, 0.06, 0.04), M.lensW, s * 0.66, 0.68, 3.1);
    add(g, roundBox(0.3, 0.22, 0.06, 0.04), M.lensR, s * 0.72, 0.82, -3.22);
    // a purple flag on a short staff over each front wing
    add(g, new THREE.BoxGeometry(0.02, 0.5, 0.02), M.chrome, s * 0.8, 1.15, 2.75);
    add(g, new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshStandardMaterial({ color: 0x5a2a8a, emissive: 0x2a0a4a, roughness: 0.8, side: THREE.DoubleSide }), s * 0.8, 1.28, 2.56, 0, Math.PI / 2, 0);
  }
  add(g, new THREE.PlaneGeometry(W - 0.5, 0.42), curtain, 0, 1.3, -3.13, 0, Math.PI, 0);
  add(g, roundBox(1.1, 0.24, 0.06, 0.04), M.chrome, 0, 0.62, 3.12);      // the grille
  add(g, roundBox(W + 0.04, 0.14, 0.2, 0.06), M.chrome, 0, 0.4, 3.12);  // bumpers
  add(g, roundBox(W + 0.04, 0.14, 0.2, 0.06), M.chrome, 0, 0.42, -3.24);
  for (const s of [-1, 1]) for (const z of [2.0, -2.15]) {
    const w = wheel(0.36, 0.24, M.rubber, M.chrome, M.chrome); w.position.set(s * (W / 2 - 0.12), 0.36, z); if (s < 0) w.rotation.y = Math.PI; g.add(w);
    add(g, new THREE.TorusGeometry(0.44, 0.06, 6, 16, Math.PI), M.black, s * (W / 2 + 0.002), 0.36, z, 0, Math.PI / 2, 0);
  }
  g.userData.lights = [
    [0.66, 0.68, 3.16, 1.6, [1, 0.96, 0.86], 1.5, 0], [-0.66, 0.68, 3.16, 1.6, [1, 0.96, 0.86], 1.5, 0],
    [0.72, 0.82, -3.28, 1.3, [1, 0.08, 0.06], 1.6, 0], [-0.72, 0.82, -3.28, 1.3, [1, 0.08, 0.06], 1.6, 0],
    [0, 1.3, -3.2, 2.6, [0.85, 0.75, 1], 0.9, 0],
  ];
  return g;
}

// a patrol car: the sedan in black and white, a light bar on the roof
export function buildPolice() {
  const g = buildSedan(0x14161c);
  const M = mats();
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.02, 0.4, 2.1), M.white, s * 0.935, 0.66, -0.25);
  add(g, roundBox(1.34, 0.12, 0.36, 0.04), M.trim, 0, 1.52, -0.3);
  const blue = new THREE.MeshStandardMaterial({ color: 0x000820, emissive: 0x2050ff, emissiveIntensity: 2.4, roughness: 0.2 });
  add(g, roundBox(0.62, 0.15, 0.32, 0.05), M.lensR, -0.33, 1.62, -0.3);
  add(g, roundBox(0.62, 0.15, 0.32, 0.05), blue, 0.33, 1.62, -0.3);
  g.userData.lights = [
    [0.6, 0.68, 2.44, 1.5, [1, 0.96, 0.86], 1.4, 0], [-0.6, 0.68, 2.44, 1.5, [1, 0.96, 0.86], 1.4, 0],
    [0.58, 0.8, -2.5, 1.2, [1, 0.08, 0.06], 1.6, 0], [-0.58, 0.8, -2.5, 1.2, [1, 0.08, 0.06], 1.6, 0],
    [-0.33, 1.7, -0.3, 6.5, [1, 0.06, 0.08], 4.6, 2], [0.33, 1.7, -0.3, 6.5, [0.12, 0.3, 1], 4.6, 3],
  ];
  return g;
}

// a Type III ambulance: cab up front, the patient box behind, light bar on top
export function buildAmbulance() {
  const g = new THREE.Group();
  const M = mats();
  const W = 2.36;
  const cabW = W - 0.08, cabS = cabW / 2 + 0.012;         // cab side surface
  const boxS = W / 2 + 0.08 + 0.012;                      // box side surface (the rounded box grows by half its radius)
  const B0 = 0.55, BH = 2.62, Bz = -1.1, BL = 4.4;
  const boxBack = Bz - BL / 2 - 0.08 - 0.012, boxTop = B0 + BH;
  // cab: bonnet, windscreen, roof (the profile's faces sit 0.14 out from its outline)
  add(g, profile([[1.25, 0.55], [3.42, 0.55], [3.5, 0.82], [3.42, 1.32], [2.55, 1.46], [1.95, 2.3], [1.25, 2.34]], cabW, 0.14), M.white, 0, 0, 0);
  const front = 3.5 + 0.14;
  // the box
  add(g, roundBox(W, BH, BL, 0.16), M.white, 0, B0 + BH / 2, Bz);
  // the red band round the box and a stripe on down the cab
  add(g, new THREE.BoxGeometry(W + 0.2, 0.36, BL + 0.12), M.red, 0, 1.52, Bz);
  add(g, new THREE.BoxGeometry(cabW + 0.035, 0.12, 2.1), M.red, 0, 1.02, 2.4);
  // lettering and the star on both sides, the star on the back, AMBULANCE mirrored on the bonnet
  const word = textTexture(['AMBULANCE'], { color: '#c8102e', font: 'bold 170px "Arial Narrow", Arial, sans-serif' });
  const star = starTexture();
  const wordM = new THREE.MeshStandardMaterial({ map: word, transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
  const starM = new THREE.MeshStandardMaterial({ map: star, transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const side of [-1, 1]) {
    add(g, new THREE.PlaneGeometry(3.3, 0.82), wordM, side * boxS, 2.2, -1.35, 0, side * Math.PI / 2, 0);
    add(g, new THREE.PlaneGeometry(0.8, 0.8), starM, side * boxS, 2.28, 0.48, 0, side * Math.PI / 2, 0);
  }
  add(g, new THREE.PlaneGeometry(1.0, 1.0), starM, 0, 2.6, boxBack - 0.002, 0, Math.PI, 0);
  const hood = new THREE.MeshStandardMaterial({ map: textTexture(['AMBULANCE'], { color: '#c8102e', mirror: true, font: 'bold 170px "Arial Narrow", Arial, sans-serif' }), transparent: true, polygonOffset: true, polygonOffsetFactor: -2 });
  add(g, new THREE.PlaneGeometry(1.5, 0.36), hood, 0, 1.4 + 0.15, 2.98, -Math.PI / 2 + 0.16, 0, 0);
  // glass: the windscreen on its slope, the cab's side windows, the back doors
  add(g, new THREE.PlaneGeometry(cabW - 0.24, 0.9), M.glass, 0, 1.885 + 0.582 * 0.16, 2.25 + 0.814 * 0.16, -0.62, 0, 0);
  for (const side of [-1, 1]) {
    add(g, new THREE.PlaneGeometry(1.0, 0.62), M.glass, side * cabS, 1.88, 1.68, 0, side * Math.PI / 2, 0);
    add(g, new THREE.BoxGeometry(0.03, 0.05, 1.05), M.trim, side * cabS, 1.54, 1.66);   // door line
    add(g, new THREE.BoxGeometry(0.03, 0.85, 0.04), M.trim, side * cabS, 1.15, 1.13);
    add(g, new THREE.BoxGeometry(0.035, 0.05, 0.24), M.chrome, side * (cabS + 0.01), 1.36, 1.3);   // handle
    // mirror on an arm
    add(g, new THREE.BoxGeometry(0.42, 0.05, 0.05), M.trim, side * (cabS + 0.2), 1.8, 2.08);
    add(g, roundBox(0.12, 0.42, 0.26, 0.04), M.black, side * (cabS + 0.42), 1.8, 2.05);
    // the box's side compartment doors and a handle
    add(g, new THREE.BoxGeometry(0.02, 1.2, 0.03), M.trim, side * boxS, 1.15, -0.2);
    add(g, new THREE.BoxGeometry(0.02, 1.2, 0.03), M.trim, side * boxS, 1.15, -2.6);
    add(g, new THREE.BoxGeometry(0.03, 0.05, 0.22), M.chrome, side * (boxS + 0.01), 1.2, -1.4);
  }
  for (const x of [-0.46, 0.46]) add(g, new THREE.PlaneGeometry(0.62, 0.76), M.glass, x, 2.3, boxBack - 0.003, 0, Math.PI, 0);
  add(g, new THREE.BoxGeometry(0.03, 2.2, 0.03), M.trim, 0, 1.75, boxBack - 0.004);
  // grille, headlights, bumpers, the back step
  add(g, new THREE.BoxGeometry(1.4, 0.52, 0.04), M.trim, 0, 0.98, front + 0.01);
  for (let k = 0; k < 6; k++) add(g, new THREE.BoxGeometry(1.32, 0.025, 0.05), M.chrome, 0, 0.77 + k * 0.085, front + 0.03);
  add(g, roundBox(W + 0.06, 0.26, 0.3, 0.07), M.chrome, 0, 0.56, front + 0.12);
  add(g, roundBox(W + 0.06, 0.24, 0.34, 0.07), M.black, 0, 0.5, boxBack - 0.1);
  add(g, new THREE.BoxGeometry(W * 0.75, 0.06, 0.42), M.trim, 0, 0.4, boxBack - 0.3);
  for (const side of [-1, 1]) {
    add(g, roundBox(0.42, 0.26, 0.06, 0.05), M.lensW, side * 0.86, 1.02, front + 0.02);
    add(g, roundBox(0.16, 0.12, 0.05, 0.03), M.lensA, side * 0.98, 0.74, front + 0.02);
    add(g, roundBox(0.24, 0.44, 0.06, 0.04), M.lensR, side * 0.98, 1.05, boxBack - 0.01);
    add(g, roundBox(0.22, 0.22, 0.08, 0.04), M.lensR, side * (W / 2 - 0.1), boxTop - 0.18, boxBack);
    add(g, roundBox(0.22, 0.22, 0.08, 0.04), M.lensR, side * (W / 2 - 0.1), boxTop - 0.18, Bz + BL / 2 + 0.06);
    add(g, roundBox(0.06, 0.22, 0.32, 0.03), M.lensR, side * (boxS + 0.01), boxTop - 0.28, -1.1);
  }
  const zb = Bz + BL / 2 - 0.25;
  add(g, roundBox(1.74, 0.16, 0.38, 0.05), M.black, 0, boxTop + 0.08, zb);
  add(g, roundBox(0.72, 0.14, 0.32, 0.05), M.lensR, -0.42, boxTop + 0.2, zb);
  add(g, roundBox(0.72, 0.14, 0.32, 0.05), M.lensW, 0.42, boxTop + 0.2, zb);
  add(g, roundBox(0.9, 0.18, 0.8, 0.06), M.trim, 0, boxTop + 0.09, -2.2);
  // wheels: singles at the front, duals at the back, in black arches
  const fr = 0.43;
  for (const side of [-1, 1]) {
    const wf = wheel(fr, 0.26, M.rubber, M.trim, M.chrome); wf.position.set(side * 1.0, fr, 2.32); if (side < 0) wf.rotation.y = Math.PI; g.add(wf);
    const wb = wheel(fr, 0.42, M.rubber, M.trim, M.chrome); wb.position.set(side * 0.98, fr, -1.95); if (side < 0) wb.rotation.y = Math.PI; g.add(wb);
    add(g, new THREE.TorusGeometry(fr + 0.1, 0.08, 6, 16, Math.PI), M.black, side * (cabS - 0.005), fr, 2.32, 0, Math.PI / 2, 0);
    add(g, new THREE.TorusGeometry(fr + 0.1, 0.08, 6, 16, Math.PI), M.black, side * (boxS - 0.01), fr, -1.95, 0, Math.PI / 2, 0);
  }
  // where its lights shine, for the glow layer: [x, y, z, size, rgb, strength, blink mode]
  g.userData.lights = [
    [-0.42, boxTop + 0.22, zb, 3.2, [1, 0.08, 0.12], 3.0, 2], [0.42, boxTop + 0.22, zb, 3.2, [1, 1, 1], 2.8, 3],
    [W / 2 - 0.1, boxTop - 0.18, boxBack - 0.08, 2.2, [1, 0.08, 0.12], 2.4, 3], [-(W / 2 - 0.1), boxTop - 0.18, boxBack - 0.08, 2.2, [1, 0.08, 0.12], 2.4, 2],
    [W / 2 - 0.1, boxTop - 0.18, Bz + BL / 2 + 0.12, 2.0, [1, 0.08, 0.12], 2.2, 2], [-(W / 2 - 0.1), boxTop - 0.18, Bz + BL / 2 + 0.12, 2.0, [1, 0.08, 0.12], 2.2, 3],
    [0.86, 1.02, front + 0.08, 2.0, [1, 0.95, 0.85], 2.0, 0], [-0.86, 1.02, front + 0.08, 2.0, [1, 0.95, 0.85], 2.0, 0],
    [0.98, 1.05, boxBack - 0.06, 1.2, [1, 0.08, 0.1], 1.5, 0], [-0.98, 1.05, boxBack - 0.06, 1.2, [1, 0.08, 0.1], 1.5, 0],
  ];
  return g;
}

// a city bus, lit inside, the route on its signs
export function buildBus(route = '19') {
  const g = new THREE.Group();
  const M = mats();
  const W = 2.55, L = 12, R = 0.16;
  const side = W / 2 + 0.014, nose = L / 2 + R + 0.012, tail = -L / 2 - R - 0.012;
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xe9eef0, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.12 });
  const band = new THREE.MeshPhysicalMaterial({ color: 0x14707e, roughness: 0.4, clearcoat: 0.6 });
  const lit = new THREE.MeshStandardMaterial({ color: 0x1a120a, emissive: new THREE.Color(0xffd6a0), emissiveIntensity: 1.6, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 });
  const inside = (who) => { const t = busInterior(9, who); return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.35, roughness: 0.15, metalness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 }); };
  const seat = new THREE.MeshStandardMaterial({ color: 0x5a2030, roughness: 0.8, emissive: 0x200810 });
  // body: rounded at the nose, flat at the back
  add(g, profile([[-L / 2, 0.45], [L / 2 - 0.3, 0.45], [L / 2, 0.8], [L / 2, 2.9], [L / 2 - 0.35, 3.25], [-L / 2 + 0.15, 3.25], [-L / 2, 3.05]], W, R), paint, 0, 0, 0);
  add(g, new THREE.BoxGeometry(W + 0.03, 0.42, L - 0.4), band, 0, 0.8, -0.1);
  add(g, new THREE.BoxGeometry(W + 0.025, 0.08, L - 0.5), band, 0, 3.0, -0.1);
  for (const s of [-1, 1]) {
    // the window band: glass lit from inside, mullions, seat backs in the light
    add(g, new THREE.PlaneGeometry(L - 1.9, 1.12), inside(s > 0 ? 7 : 2), s * side, 2.22, -0.55, 0, s * Math.PI / 2, 0);
    add(g, new THREE.BoxGeometry(0.04, 0.04, L - 1.2), M.chrome, s * (side + 0.01), 1.62, -0.3);
    // mirrors
    add(g, new THREE.BoxGeometry(0.5, 0.05, 0.05), M.trim, s * (side + 0.24), 2.65, L / 2 - 0.3);
    add(g, roundBox(0.1, 0.5, 0.3, 0.04), M.black, s * (side + 0.48), 2.5, L / 2 - 0.32);
  }
  // doors (glass, folding), front and middle, on the kerb side
  for (const z of [L / 2 - 1.0, 0.4]) {
    add(g, new THREE.PlaneGeometry(1.1, 2.2), M.glass, -side - 0.006, 1.6, z, 0, -Math.PI / 2, 0);
    add(g, new THREE.BoxGeometry(0.03, 2.2, 0.04), M.trim, -side - 0.01, 1.6, z);
  }
  // windscreen, back window, signs
  add(g, new THREE.PlaneGeometry(W - 0.3, 1.5), M.glass, 0, 2.05, nose);
  add(g, new THREE.PlaneGeometry(W - 0.5, 0.9), lit, 0, 2.35, tail, 0, Math.PI, 0);
  const sign = textTexture([route], { color: '#ffb347', bg: '#0b0804', glow: '#ffb347', blur: 14, w: 512, h: 128, font: 'bold 104px "Arial Narrow", Arial, sans-serif' });
  const signM = new THREE.MeshBasicMaterial({ map: sign, polygonOffset: true, polygonOffsetFactor: -3 });
  add(g, new THREE.PlaneGeometry(1.9, 0.42), signM, 0, 3.0, nose + 0.002);
  add(g, new THREE.PlaneGeometry(1.4, 0.36), signM, 0, 2.97, tail - 0.002, 0, Math.PI, 0);
  add(g, new THREE.PlaneGeometry(1.2, 0.3), signM, -side - 0.008, 2.97, L / 2 - 2.0, 0, -Math.PI / 2, 0);
  // bumpers, lights, roof pods
  add(g, roundBox(W + 0.04, 0.32, 0.22, 0.08), M.black, 0, 0.6, nose + 0.08);
  add(g, roundBox(W + 0.04, 0.32, 0.22, 0.08), M.black, 0, 0.6, tail - 0.08);
  for (const s of [-1, 1]) {
    add(g, roundBox(0.36, 0.2, 0.05, 0.05), M.lensW, s * 0.92, 0.98, nose + 0.01);
    add(g, roundBox(0.28, 0.52, 0.05, 0.05), M.lensR, s * 1.03, 1.12, tail - 0.01);
  }
  add(g, roundBox(1.8, 0.28, 2.4, 0.1), M.trim, 0, 3.54, -3.0);
  add(g, roundBox(1.4, 0.22, 1.6, 0.1), M.trim, 0, 3.48, 2.0);
  for (const s of [-1, 1]) for (const z of [L / 2 - 2.1, -L / 2 + 2.6]) {
    const w = wheel(0.5, 0.34, M.rubber, M.trim, M.chrome); w.position.set(s * 1.1, 0.5, z); if (s < 0) w.rotation.y = Math.PI; g.add(w);
    add(g, new THREE.TorusGeometry(0.6, 0.08, 6, 16, Math.PI), M.black, s * (side - 0.01), 0.5, z, 0, Math.PI / 2, 0);
  }
  g.userData.lights = [
    [0.92, 0.98, nose + 0.06, 1.6, [1, 0.95, 0.8], 1.6, 0], [-0.92, 0.98, nose + 0.06, 1.6, [1, 0.95, 0.8], 1.6, 0],
    [1.03, 1.12, tail - 0.06, 1.2, [1, 0.1, 0.1], 1.5, 0], [-1.03, 1.12, tail - 0.06, 1.2, [1, 0.1, 0.1], 1.5, 0],
    [0, 2.97, tail - 0.08, 1.3, [1, 0.7, 0.3], 0.6, 0],
  ];
  return g;
}
