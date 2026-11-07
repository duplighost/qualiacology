// The yard's real-time set pieces, built from primitives as glazed ceramic holiday-village pieces. Each builder
// returns a THREE.Group with its origin on the floor at the piece's centre (the set places, raises, drops and
// sinks them on the beats). Sizes in metres, from the design (§4).
import * as THREE from 'three';
import { M, GLOW, Merger, roundBox, canvasTex, texMat } from './mats.js';

const deg = Math.PI / 180;

// ---------------------------------------------------------------- our bed (dumped on the right lawn) and your things
export function bed() {
  const g = new THREE.Group(), m = new Merger();
  m.rbox(M.cream, 2.0, 0.3, 2.2, 0.04, 0, 0.15, 0);                     // frame
  m.rbox(M.white, 1.94, 0.22, 2.1, 0.07, 0, 0.41, 0);                   // mattress
  m.rbox(M.white, 2.04, 0.14, 1.62, 0.07, 0, 0.58, 0.28);               // duvet
  for (const z of [-0.53, 1.09]) m.box(M.gold, 2.06, 0.03, 0.03, 0, 0.58, z);   // gold piping
  for (const x of [-1.02, 1.02]) m.box(M.gold, 0.03, 0.03, 1.62, x, 0.58, 0.28);
  for (const x of [-0.48, 0.48]) m.rbox(M.ivory, 0.82, 0.16, 0.42, 0.07, x, 0.62, -0.78);   // pillows
  m.rbox(M.cream, 2.04, 1.05, 0.12, 0.04, 0, 0.6, -1.06);               // headboard
  m.box(M.gold, 2.08, 0.05, 0.14, 0, 1.13, -1.06);
  for (const x of [-0.97, 0.97]) m.cyl(M.gold, 0.035, 0.035, 1.1, x, 0.55, -1.06, 10);
  m.build(g);
  return g;
}
export function bedside() {
  const g = new THREE.Group(), m = new Merger();
  // the nightstand at (6.4, -1.4) and a lamp; a cardboard box and clothes strewn in the snow (relative to the bed)
  m.rbox(M.cream, 0.5, 0.55, 0.45, 0.03, 1.4, 0.275, -0.8); m.box(M.gold, 0.06, 0.04, 0.02, 1.4, 0.4, -0.57);
  m.lathe(M.gold, [[0, 0], [0.09, 0], [0.09, 0.02], [0.02, 0.05], [0.02, 0.4], [0, 0.4]], 1.4, 0.55, -0.8, 16);
  m.lathe(M.cream, [[0.06, 0], [0.15, -0.0], [0.11, 0.2], [0.05, 0.2]].map(([r, h]) => [r, h]), 1.4, 0.88, -0.8, 18);
  m.rbox(M.brown, 0.62, 0.42, 0.48, 0.02, -1.6, 0.21, 1.4, 0.3);         // the cardboard box
  m.box(M.amber, 0.66, 0.02, 0.24, -1.6, 0.43, 1.18, 0.3, -0.5);        // a flap
  m.rbox(M.plaidNavy, 0.7, 0.05, 0.5, 0.02, -1.25, 0.03, 2.1, 0.7);     // clothes
  m.rbox(M.teal, 0.55, 0.05, 0.4, 0.02, 1.7, 0.03, 1.6, -0.4);
  m.rbox(M.cream, 0.4, 0.04, 0.3, 0.02, -2.2, 0.03, 0.6, 1.2);
  m.build(g);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.15, 0.2, 18, 1, true), GLOW.cream); shade.position.set(1.4, 0.98, -0.8); g.add(shade);
  return g;
}

// ---------------------------------------------------------------- the giant matchbook (bridge 1): rises at (0, -5.3)
export function matchbook() {
  const g = new THREE.Group(), lean = new THREE.Group(); g.add(lean);
  const m = new Merger();
  const W = 1.6, H = 2.4, D = 0.4;
  m.rbox(M.gold, W, H, D, 0.03, 0, H / 2, 0);
  m.box(M.coral, 0.08, H * 0.92, D * 0.8, W / 2 + 0.03, H / 2, 0);     // the striker strip down its side
  m.box(M.goldDark, W * 0.98, 0.18, D + 0.02, 0, 0.3, 0);               // the fold
  // match heads peeking out of the top
  for (let i = 0; i < 7; i++) { const x = -0.55 + i * 0.18; m.box(M.birch, 0.06, 0.3, 0.06, x, H + 0.05, -0.05); m.sphere(M.coral, 0.06, x, H + 0.22, -0.05, 1, 1.4, 1); }
  m.build(lean);
  // the cover: oxblood panel, gold script, two lines (lyric sign 1); its glow is driven by the set
  const tex = canvasTex(1024, 1536, (c, w, h) => {
    c.fillStyle = '#3a0d12'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e0b04a'; c.lineWidth = 18; c.strokeRect(40, 40, w - 80, h - 80);
    c.lineWidth = 5; c.strokeRect(78, 78, w - 156, h - 156);
    c.fillStyle = '#f2c860'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'italic 700 150px Fraunces, Georgia, serif';
    const lines = ['You lit', 'the match', 'so gently'];
    lines.forEach((s, i) => c.fillText(s, w / 2, 480 + i * 230));
    c.font = '900 60px "Archivo Black", Arial Black, sans-serif'; c.fillStyle = '#e0b04a';
    c.fillText('★  SAFETY MATCHES  ★', w / 2, 1240);
  });
  const coverMat = new THREE.MeshPhysicalMaterial({ map: tex, emissive: new THREE.Color(1, 0.7, 0.3), emissiveMap: tex, emissiveIntensity: 0, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 });
  const cover = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.86, H * 0.8), coverMat);
  cover.position.set(0, H * 0.55, D / 2 + 0.006); lean.add(cover);
  lean.rotation.x = -25 * deg;              // tilted back toward the camera... back, toward the house
  lean.position.z = 0.25;
  g.userData = { cover: coverMat, lean };
  return g;
}

// ---------------------------------------------------------------- the giant match (her staff from 52.52 to 93.84)
export function giantMatch() {
  const g = new THREE.Group(), m = new Merger();
  m.cyl(M.birch, 0.035, 0.035, 2.2, 0, 1.1, 0, 10);
  m.sphere(M.coral, 0.12, 0, 2.28, 0, 0.85, 1.3, 0.85, 16);
  m.build(g, { cast: true });
  g.userData.tip = new THREE.Vector3(0, 2.32, 0);
  return g;
}
// a small match (in her hand: struck, held up, flicked)
export function smallMatch() {
  const g = new THREE.Group(), m = new Merger();
  m.cyl(M.birch, 0.006, 0.006, 0.12, 0, 0.06, 0, 6); m.sphere(M.coral, 0.011, 0, 0.125, 0, 1, 1.3, 1, 8);
  m.build(g, { cast: false });
  return g;
}

// ---------------------------------------------------------------- the gold gas can (the quiets)
export function gasCan() {
  const g = new THREE.Group(), m = new Merger();
  m.rbox(M.gold, 0.17, 0.45, 0.35, 0.03, 0, 0.225, 0);
  m.box(M.goldDark, 0.18, 0.04, 0.3, 0, 0.3, 0); m.box(M.goldDark, 0.18, 0.04, 0.3, 0, 0.16, 0);
  m.cyl(M.gold, 0.025, 0.03, 0.12, 0, 0.5, 0.12, 10, 0.6); m.sphere(M.coral, 0.03, 0, 0.55, 0.16);
  m.torus(M.gold, 0.07, 0.015, 0, 0.47, -0.05, 0, Math.PI / 2, 0, Math.PI);
  m.build(g);
  return g;
}

// ---------------------------------------------------------------- your phone (rose-gold slab, emissive screen)
export function phone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(roundBox(0.08, 0.16, 0.012, 0.006, 2), new THREE.MeshPhysicalMaterial({ color: 0xe8b89a, metalness: 1, roughness: 0.25 }));
  g.add(body);
  const tex = canvasTex(128, 256, (c, w, h) => { c.fillStyle = '#fff1dc'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff7a5a'; for (let i = 0; i < 6; i++) { const y = 26 + i * 38; c.beginPath(); c.roundRect(i % 2 ? 50 : 14, y, 64, 24, 10); c.fill(); } });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.145), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.6, 1.5, 1.4) }));
  screen.position.z = 0.0065; g.add(screen);
  g.userData.screen = screen.material;
  return g;
}

// ---------------------------------------------------------------- the dead-eye teddy bear (giant in verse 2; the keepsake)
export function teddy(scale = 1) {
  const g = new THREE.Group(), m = new Merger();
  const S = scale;
  m.sphere(M.honey, 0.5 * S, 0, 0.62 * S, 0, 1.0, 1.05, 0.9, 24);       // body, sitting
  m.sphere(M.honey, 0.38 * S, 0, 1.38 * S, 0.02 * S, 1, 0.95, 0.92, 24);  // head
  m.sphere(M.honeyDark, 0.16 * S, 0, 1.28 * S, 0.32 * S, 1.15, 0.85, 0.9, 16); // snout
  m.sphere(M.black, 0.05 * S, 0, 1.33 * S, 0.47 * S, 1.2, 0.9, 0.8, 10);   // nose
  for (const s of [-1, 1]) {
    m.sphere(M.honey, 0.15 * S, s * 0.3 * S, 1.7 * S, -0.02 * S, 1, 1, 0.55, 14);   // ears
    m.sphere(M.honeyDark, 0.09 * S, s * 0.3 * S, 1.7 * S, 0.04 * S, 1, 1, 0.4, 12);
    m.sphere(M.honey, 0.17 * S, s * 0.5 * S, 0.75 * S, 0.12 * S, 1, 1.5, 1, 14);    // arms
    m.sphere(M.honey, 0.2 * S, s * 0.28 * S, 0.22 * S, 0.38 * S, 1, 0.9, 1.5, 14);   // legs
    m.sphere(M.honeyDark, 0.13 * S, s * 0.28 * S, 0.22 * S, 0.62 * S, 1, 1.0, 0.4, 12); // foot pads
  }
  m.sphere(M.black, 0.055 * S, -0.15 * S, 1.48 * S, 0.33 * S, 1, 1, 0.6, 12);          // one black button eye
  m.box(M.black, 0.012 * S, 0.12 * S, 0.02 * S, 0.15 * S, 1.48 * S, 0.34 * S, 0, 0.2, 0.785);   // an X of thread
  m.box(M.black, 0.012 * S, 0.12 * S, 0.02 * S, 0.15 * S, 1.48 * S, 0.34 * S, 0, 0.2, -0.785);
  // the gold bow
  m.sphere(M.gold, 0.08 * S, 0, 1.03 * S, 0.36 * S, 1, 1, 0.6, 12);
  for (const s of [-1, 1]) m.sphere(M.gold, 0.12 * S, s * 0.14 * S, 1.03 * S, 0.33 * S, 1.3, 0.8, 0.45, 12);
  m.build(g);
  return g;
}

// ---------------------------------------------------------------- the street lamp head glow (the lamp itself is baked)
export function bulb(r = 0.12, mat = GLOW.cream) { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat); return b; }
