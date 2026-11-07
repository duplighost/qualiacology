// Things in the house. HERS are glossy lilac porcelain with gold leaf and her kiss (claims.js materials).
// YOURS are matte and real: walnut, brass, linen, velvet, paper, plaster, marble.
import * as THREE from 'three';
import { mats, kissDecal } from './claims.js';
import { portraitTexture, plaqueTexture, medallionTexture, stencilTexture, photoTexture } from './paint.js';

// one geometry per shape, shared by every copy of a thing (nothing reshapes them): a claim that arrives mid-fight
// reuses buffers the warm-up already uploaded instead of sending its own
const GEO = new Map();
const geo = (k, make) => { let g = GEO.get(k); if (!g) { g = make(); GEO.set(k, g); } return g; };
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
const cyl = (r0, r1, h, m, x = 0, y = 0, z = 0, seg = 24) => { const o = new THREE.Mesh(geo(`c${r0},${r1},${h},${seg}`, () => new THREE.CylinderGeometry(r0, r1, h, seg)), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
const lathe = (pts, m, seg = 32) => { const g = geo(`l${seg}:${pts.join(';')}`, () => { const q = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); q.computeVertexNormals(); return q; }); const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o; };
const yours = (o) => { o.traverse((m) => { if (m.isMesh) m.userData.yours = true; }); return o; };

// ---------------------------------------------------------------------------------------------- your materials
let Y = null;
export function yourMats() {
  if (Y) return Y;
  const S = (o) => new THREE.MeshStandardMaterial(o);
  Y = {
    walnut: S({ color: '#5a3a26', roughness: 0.62 }), walnutDark: S({ color: '#3a2416', roughness: 0.6 }),
    brass: S({ color: '#b8893c', metalness: 0.85, roughness: 0.35 }),
    linen: S({ color: '#f3eee6', roughness: 0.92 }), velvet: S({ color: '#2f7f7a', roughness: 0.95 }),
    plaster: S({ color: '#f3eee6', roughness: 0.85 }), marble: S({ color: '#f4ece6', roughness: 0.3 }),
    paper: S({ color: '#f5efe2', roughness: 0.9 }), sheet: new THREE.MeshStandardMaterial({ color: '#f4f1ec', roughness: 0.9, side: THREE.DoubleSide }),
    oak: S({ color: '#8a5a32', roughness: 0.6 }), iron: S({ color: '#2a2526', metalness: 0.6, roughness: 0.5 }),
    rugRose: S({ color: '#c97a8a', roughness: 0.95 }), cream: S({ color: '#fbf1e6', roughness: 0.9 }),
    lampShade: new THREE.MeshStandardMaterial({ color: '#ffe8c4', roughness: 0.8, emissive: new THREE.Color('#ffb86a'), emissiveIntensity: 0.0 }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.2) }),
  };
  return Y;
}

// ---------------------------------------------------------------------------------------------- hers
// her luggage: a steamer trunk, stacked hatboxes, a vanity case, suitcases, a birdcage, a gramophone, a cello case
export function luggage(kind = 'trunk', s = 1) {
  const M = mats(), g = new THREE.Group();
  if (kind === 'trunk') {
    g.add(box(1.2 * s, 0.62 * s, 0.7 * s, M.glaze, 0, 0.31 * s, 0));
    g.add(box(1.24 * s, 0.14 * s, 0.74 * s, M.deep, 0, 0.72 * s, 0));
    for (const x of [-0.6, 0.6]) for (const z of [-0.35, 0.35]) g.add(box(0.06 * s, 0.84 * s, 0.06 * s, M.gold, x * s, 0.4 * s, z * s));
    g.add(box(1.25 * s, 0.05 * s, 0.75 * s, M.gold, 0, 0.64 * s, 0));
    g.add(kissDecal(0.32 * s, [0.2 * s, 0.8 * s, 0], [0, 1, 0]));
    g.add(kissDecal(0.28 * s, [-0.25 * s, 0.38 * s, 0.356 * s], [0, 0, 1]));
  } else if (kind === 'hatboxes') {
    g.add(cyl(0.32 * s, 0.32 * s, 0.42 * s, M.glaze, 0, 0.21 * s, 0, 32));
    g.add(cyl(0.335 * s, 0.335 * s, 0.07 * s, M.gold, 0, 0.42 * s, 0, 32));
    g.add(cyl(0.26 * s, 0.26 * s, 0.36 * s, M.deep, 0.03 * s, 0.63 * s, 0.02 * s, 32));
    g.add(cyl(0.275 * s, 0.275 * s, 0.06 * s, M.gold, 0.03 * s, 0.82 * s, 0.02 * s, 32));
    g.add(kissDecal(0.26 * s, [0.03 * s, 0.856 * s, 0.02 * s], [0, 1, 0]));
  } else if (kind === 'vanity') {
    g.add(box(0.5 * s, 0.3 * s, 0.35 * s, M.glaze, 0, 0.15 * s, 0));
    g.add(box(0.52 * s, 0.06 * s, 0.37 * s, M.gold, 0, 0.32 * s, 0));
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.08 * s, 0.012 * s, 8, 20, Math.PI), M.gold); h.position.set(0, 0.35 * s, 0); g.add(h);
    g.add(kissDecal(0.2 * s, [0, 0.356 * s, 0], [0, 1, 0]));
  } else if (kind === 'suitcase') {
    g.add(box(0.85 * s, 0.32 * s, 0.55 * s, M.glaze, 0, 0.16 * s, 0));
    g.add(box(0.87 * s, 0.04 * s, 0.57 * s, M.gold, 0, 0.28 * s, 0));
    g.add(kissDecal(0.22 * s, [0, 0.326 * s, 0], [0, 1, 0]));
  } else if (kind === 'birdcage') {
    g.add(cyl(0.3 * s, 0.34 * s, 0.08 * s, M.gold, 0, 0.04 * s, 0, 24));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(cyl(0.01 * s, 0.01 * s, 0.7 * s, M.gold, Math.cos(a) * 0.29 * s, 0.43 * s, Math.sin(a) * 0.29 * s, 6)); }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3 * s, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.glaze); dome.position.y = 0.78 * s; g.add(dome);
    g.add(cyl(0.05 * s, 0.05 * s, 0.1 * s, M.glaze, 0, 0.3 * s, 0, 12));
  } else if (kind === 'gramophone') {
    g.add(box(0.5 * s, 0.25 * s, 0.5 * s, M.glaze, 0, 0.125 * s, 0));
    const horn = lathe([[0.03, 0], [0.05, 0.15], [0.12, 0.35], [0.32, 0.55], [0.34, 0.58]].map(([r, y]) => [r * s, y * s]), M.gold, 28);
    horn.position.set(0.1 * s, 0.25 * s, 0); horn.rotation.z = -0.6; g.add(horn);
    g.add(kissDecal(0.2 * s, [0, 0.256 * s, 0], [0, 1, 0]));
  } else if (kind === 'cello') {
    const b = lathe([[0, 0], [0.22, 0.04], [0.3, 0.3], [0.2, 0.6], [0.26, 0.9], [0.12, 1.15], [0.04, 1.3], [0, 1.32]].map(([r, y]) => [r * s, y * s]), M.glaze, 24);
    b.rotation.x = -Math.PI / 2; b.scale.set(1, 1, 0.45); b.position.set(0, 0.16 * s, 0.66 * s); g.add(b);
    g.add(kissDecal(0.22 * s, [0, 0.31 * s, 0.1 * s], [0, 1, 0]));
  }
  return g;
}
// her portrait: a 1.3 x 1.7 gilt porcelain frame, her smug face painted inside; returns the group and canvas
export function portrait(face = 1) {
  const M = mats(), g = new THREE.Group();
  const W = 1.3, H = 1.7, t = 0.12;
  const frame = new THREE.Group();
  for (const [w, h, x, y] of [[W + t * 2, t, 0, H / 2 + t / 2], [W + t * 2, t, 0, -H / 2 - t / 2], [t, H, -W / 2 - t / 2, 0], [t, H, W / 2 + t / 2, 0]]) frame.add(box(w, h, 0.12, M.glaze, x, y, 0.06));
  for (const [w, h, x, y] of [[W + 0.02, 0.035, 0, H / 2 + 0.01], [W + 0.02, 0.035, 0, -H / 2 - 0.01], [0.035, H, -W / 2 - 0.01, 0], [0.035, H, W / 2 + 0.01, 0]]) frame.add(box(w, h, 0.15, M.gold, x, y, 0.07));
  for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), M.gold); k.position.set(x * (W / 2 + t / 2), y * (H / 2 + t / 2), 0.12); frame.add(k); }
  const crest = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 20), M.gold); crest.position.set(0, H / 2 + t + 0.12, 0.08); frame.add(crest);
  const kd = kissDecal(0.2, [0, H / 2 + t + 0.12, 0.14], [0, 0, 1]); frame.add(kd);
  g.add(frame);
  const canvasMat = new THREE.MeshStandardMaterial({ map: portraitTexture({ eyes: face ? 'open' : 'closed' }), roughness: 0.5, emissive: new THREE.Color('#ffffff'), emissiveMap: portraitTexture({ eyes: 'open' }), emissiveIntensity: 0.06 });
  const canvasM = new THREE.Mesh(new THREE.PlaneGeometry(W, H), canvasMat); canvasM.position.z = 0.03; g.add(canvasM);
  canvasM.userData.canvas = true;
  return { group: g, canvas: canvasM, mat: canvasMat };
}
// furniture: her chaise, upright piano, cheval mirror, wardrobe, armchair, vanity table; busts on plinths
export function furniture(kind) {
  const M = mats(), g = new THREE.Group();
  if (kind === 'chaise') {
    g.add(box(1.9, 0.42, 0.75, M.glaze, 0, 0.21, 0));
    const back = box(0.5, 0.55, 0.75, M.glaze, -0.75, 0.62, 0); back.rotation.z = 0.25; g.add(back);
    for (const x of [-0.85, 0.85]) for (const z of [-0.3, 0.3]) g.add(cyl(0.04, 0.03, 0.12, M.gold, x, 0.03, z, 10));
    g.add(box(1.95, 0.05, 0.8, M.gold, 0, 0.42, 0));
    g.add(kissDecal(0.3, [-0.75, 0.6, 0.38], [0, 0, 1]));
  } else if (kind === 'piano') {
    g.add(box(1.5, 1.3, 0.62, M.glaze, 0, 0.65, 0));
    g.add(box(1.5, 0.08, 0.5, M.deep, 0, 0.78, 0.4));
    g.add(box(1.3, 0.05, 0.12, M.bisque, 0, 0.83, 0.45));
    g.add(box(1.55, 0.06, 0.66, M.gold, 0, 1.32, 0));
    for (const x of [-0.7, 0.7]) g.add(box(0.08, 0.7, 0.08, M.gold, x, 0.35, 0.55));
    g.add(kissDecal(0.34, [0.3, 1.05, 0.315], [0, 0, 1]));
  } else if (kind === 'mirror') {
    for (const x of [-0.5, 0.5]) g.add(box(0.08, 1.85, 0.08, M.glaze, x, 0.92, 0));
    g.add(box(1.1, 0.08, 0.5, M.glaze, 0, 0.06, 0));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.4), new THREE.MeshStandardMaterial({ color: '#cfc7dd', metalness: 1, roughness: 0.06 })); glass.position.set(0, 1.1, 0.02); g.add(glass);
    g.add(box(0.95, 0.06, 0.08, M.gold, 0, 1.83, 0));
  } else if (kind === 'wardrobe') {
    g.add(box(1.4, 2.2, 0.7, M.glaze, 0, 1.1, 0));
    g.add(box(1.5, 0.12, 0.76, M.gold, 0, 2.26, 0));
    g.add(box(0.02, 1.9, 0.02, M.gold, 0, 1.15, 0.36));
    for (const x of [-0.08, 0.08]) g.add(cyl(0.025, 0.025, 0.04, M.gold, x, 1.15, 0.37, 10));
    g.add(kissDecal(0.36, [0.36, 1.6, 0.356], [0, 0, 1]));
  } else if (kind === 'armchair') {
    g.add(box(0.9, 0.45, 0.85, M.glaze, 0, 0.225, 0));
    g.add(box(0.9, 0.95, 0.2, M.glaze, 0, 0.75, -0.33));
    for (const x of [-0.42, 0.42]) g.add(box(0.14, 0.6, 0.8, M.deep, x, 0.4, 0));
    g.add(box(0.94, 0.05, 0.24, M.gold, 0, 1.22, -0.33));
    g.add(kissDecal(0.3, [0, 0.9, -0.225], [0, 0, 1]));
  } else if (kind === 'vanityTable') {
    g.add(box(1.2, 0.75, 0.5, M.glaze, 0, 0.375, 0));
    g.add(box(1.25, 0.05, 0.55, M.gold, 0, 0.77, 0));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 10, 36), M.glaze); ring.position.set(0, 1.35, -0.18); g.add(ring);
    // (a darker, softer glass: in the moonlit bedroom the bright one caught the window and bloomed into a white blot)
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.4, 36), new THREE.MeshStandardMaterial({ color: '#a49cb4', metalness: 1, roughness: 0.14 })); glass.position.set(0, 1.35, -0.16); g.add(glass);
    g.add(kissDecal(0.2, [0, 1.84, -0.17], [0, 0, 1]));
  } else if (kind === 'bust') {
    g.add(box(0.7, 1.0, 0.7, M.gold, 0, 0.5, 0));
    g.add(box(0.8, 0.08, 0.8, M.glaze, 0, 1.02, 0));
    const torso = lathe([[0, 0], [0.32, 0.02], [0.3, 0.25], [0.2, 0.42], [0.1, 0.5], [0, 0.52]], M.glaze, 24); torso.position.y = 1.06; torso.scale.set(1, 1, 0.65); g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#f7e4df', roughness: 0.25, clearcoat: 1 })); head.position.y = 1.72; head.scale.set(0.9, 1.1, 0.95); g.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshPhysicalMaterial({ color: '#eadbb8', roughness: 0.15, clearcoat: 1, metalness: 0.3 })); hair.position.y = 1.78; hair.scale.set(1, 1.05, 1.1); g.add(hair);
    // its eyes follow YOU (a pair of dots the track turns)
    const eyes = new THREE.Group(); eyes.name = 'eyes'; eyes.position.y = 1.74;
    for (const x of [-0.055, 0.055]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.25, 0.8) })); e.position.set(x, 0, 0.14); eyes.add(e); }
    g.add(eyes);
  }
  return g;
}
// a giant gilt lipstick standing at the back rim of a MINE medallion: the pen she wrote it with
export function lipstick() {
  const M = mats(), g = new THREE.Group();
  g.add(cyl(0.16, 0.16, 0.5, M.gold, 0, 0.25, 0, 24));
  g.add(cyl(0.14, 0.14, 0.32, M.glaze, 0, 0.66, 0, 24));
  const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.3, 24), new THREE.MeshPhysicalMaterial({ color: '#c0102a', roughness: 0.18, clearcoat: 1 }));
  bullet.position.y = 0.96; bullet.rotation.z = 0.25; g.add(bullet);
  g.add(cyl(0.17, 0.17, 0.05, M.gold, 0, 0.5, 0, 24));
  return g;
}
export function medallion(r = 2.0) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshPhysicalMaterial({ map: medallionTexture(), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.receiveShadow = true; m.renderOrder = 1;
  return m;
}
// a porcelain-glazed moving crate (0.9 m cube) and a clump of porcelain forget-me-nots
export function crate() {
  const M = mats(), g = new THREE.Group();
  g.add(box(0.9, 0.9, 0.9, M.glaze, 0, 0.45, 0));
  for (const y of [0.1, 0.8]) g.add(box(0.94, 0.08, 0.94, M.gold, 0, y, 0));
  g.add(kissDecal(0.3, [0, 0.906, 0], [0, 1, 0]));
  return g;
}
const FLOWER = new THREE.MeshPhysicalMaterial({ color: '#6f9cff', roughness: 0.2, clearcoat: 1 });
export function forgetMeNots() {
  const g = new THREE.Group(), M = mats();
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, r = i ? 0.22 : 0;
    const st = cyl(0.012, 0.012, 0.3, M.gold, Math.cos(a) * r, 0.15, Math.sin(a) * r, 5); g.add(st);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 6), FLOWER); fl.position.set(Math.cos(a) * r, 0.32, Math.sin(a) * r); fl.scale.set(1, 0.4, 1); g.add(fl);
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.gold); c.position.set(Math.cos(a) * r, 0.36, Math.sin(a) * r); g.add(c);
  }
  return g;
}
// a balloon bouquet: a porcelain weight with five balloons on strings
export function bouquet() {
  const M = mats(), g = new THREE.Group();
  g.add(cyl(0.22, 0.3, 0.4, M.glaze, 0, 0.2, 0, 24));
  g.add(cyl(0.23, 0.23, 0.05, M.gold, 0, 0.4, 0, 24));
  const cols = ['#c86aff', '#ff8ac8', '#e9b949', '#ff8ac8', '#c86aff'];
  const balloons = new THREE.Group(); balloons.name = 'balloons'; g.add(balloons);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshPhysicalMaterial({ color: cols[i], roughness: 0.15, clearcoat: 1 }));
    b.scale.set(1, 1.18, 1); b.position.set(Math.cos(a) * 0.35, 2.1 + (i % 2) * 0.3, Math.sin(a) * 0.35); balloons.add(b);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.7, 3), M.gold); str.position.set(Math.cos(a) * 0.17, 1.25 + (i % 2) * 0.15, Math.sin(a) * 0.17); balloons.add(str);
  }
  g.add(kissDecal(0.2, [0, 0.43, 0], [0, 1, 0]));
  return g;
}
// her key rack: gilt-and-lilac, 2.4 m wide, hundreds of keys on hooks
export function keyRack() {
  const M = mats(), g = new THREE.Group();
  g.add(box(2.4, 0.9, 0.08, M.glaze, 0, 0, 0));
  g.add(box(2.5, 0.06, 0.12, M.gold, 0, 0.47, 0.02)); g.add(box(2.5, 0.06, 0.12, M.gold, 0, -0.47, 0.02));
  const keyG = new THREE.BoxGeometry(0.025, 0.12, 0.01);
  const im = new THREE.InstancedMesh(keyG, M.gold, 120); const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion();
  for (let i = 0; i < 120; i++) { const x = -1.1 + (i % 30) * 0.076, y = 0.3 - Math.floor(i / 30) * 0.2; q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (Math.random() - 0.5) * 0.3); m4.compose(new THREE.Vector3(x, y, 0.06), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); }
  g.add(im);
  g.add(kissDecal(0.26, [0.95, 0.3, 0.05], [0, 0, 1]));
  return g;
}
// a nib: her porcelain-and-gold fountain-pen nib, 0.9 m tall, standing where her signature ends
export function nib() {
  const M = mats(), g = new THREE.Group();
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0.22, 0.5); shape.quadraticCurveTo(0.25, 0.75, 0.16, 0.9); shape.lineTo(-0.16, 0.9); shape.quadraticCurveTo(-0.25, 0.75, -0.22, 0.5); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
  const n = new THREE.Mesh(geo, M.gold); n.position.z = -0.04; n.castShadow = true; g.add(n);
  const band = box(0.36, 0.12, 0.14, M.glaze, 0, 0.92, 0); g.add(band);
  return g;
}
// a gilt frame lying flat on the floor with her painted inside, looking up (a future you picture)
export function flatFrame() {
  const M = mats(), g = new THREE.Group();
  for (const [w, d, x, z] of [[2.2, 0.12, 0, -0.8], [2.2, 0.12, 0, 0.8], [0.12, 1.6, -1.1, 0], [0.12, 1.6, 1.1, 0]]) g.add(box(w, 0.1, d, M.gold, x, 0.05, z));
  const cv = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.45), new THREE.MeshStandardMaterial({ map: portraitTexture({ lying: true }), roughness: 0.5 }));
  cv.rotation.x = -Math.PI / 2; cv.rotation.z = Math.PI / 2; cv.position.y = 0.03; g.add(cv);
  return g;
}

// ---------------------------------------------------------------------------------------------- yours
export function armchair() {
  const Ym = yourMats(), g = new THREE.Group();
  g.add(box(0.86, 0.42, 0.8, Ym.velvet, 0, 0.3, 0));
  g.add(box(0.86, 0.95, 0.16, Ym.velvet, 0, 0.78, -0.33));
  for (const x of [-0.4, 0.4]) { g.add(box(0.12, 0.55, 0.76, Ym.velvet, x, 0.45, 0)); g.add(box(0.14, 0.06, 0.78, Ym.walnut, x, 0.74, 0)); }
  for (const x of [-0.38, 0.38]) for (const z of [-0.34, 0.34]) g.add(box(0.06, 0.12, 0.06, Ym.walnut, x, 0.06, z));
  return yours(g);
}
export function bed() {
  const Ym = yourMats(), g = new THREE.Group();
  g.add(box(2.2, 0.35, 2.3, Ym.walnut, 0, 0.18, 0));
  g.add(box(2.1, 0.22, 2.2, Ym.linen, 0, 0.46, 0.02));
  g.add(box(2.24, 1.2, 0.14, Ym.walnut, 0, 0.6, -1.15));
  for (const x of [-0.5, 0.5]) { const p = box(0.7, 0.14, 0.42, Ym.linen, x, 0.64, -0.85); g.add(p); }
  const cover = box(2.16, 0.06, 1.5, new THREE.MeshStandardMaterial({ color: '#e8d8e8', roughness: 0.9 }), 0, 0.6, 0.38); g.add(cover);
  return yours(g);
}
export function nightstand(withLamp = false) {
  const Ym = yourMats(), g = new THREE.Group();
  g.add(box(0.5, 0.6, 0.42, Ym.walnut, 0, 0.3, 0));
  if (withLamp) {
    g.add(cyl(0.07, 0.1, 0.3, Ym.brass, 0, 0.75, 0, 16));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.24, 24, 1, true), Ym.lampShade); shade.position.y = 1.0; shade.name = 'shade'; g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), Ym.glow); bulb.position.y = 0.95; bulb.name = 'bulb'; g.add(bulb);
  }
  return yours(g);
}
export function carriageClock() {
  const Ym = yourMats(), g = new THREE.Group();
  g.add(box(0.18, 0.24, 0.12, Ym.brass, 0, 0.12, 0));
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), new THREE.MeshStandardMaterial({ color: '#fbf4e4', emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 })); dial.position.set(0, 0.14, 0.061); dial.name = 'dial'; g.add(dial);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 16, Math.PI), Ym.brass); handle.position.y = 0.25; g.add(handle);
  return yours(g);
}
export function framedPhoto() {
  const Ym = yourMats(), g = new THREE.Group();
  g.add(box(0.16, 0.2, 0.02, Ym.walnut, 0, 0.1, 0));
  const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.15), new THREE.MeshStandardMaterial({ map: photoTexture(), roughness: 0.6 })); ph.position.set(0, 0.1, 0.011); g.add(ph);
  return yours(g);
}
export function brassPlaque(text) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.03), [yourMats().brass, yourMats().brass, yourMats().brass, yourMats().brass, new THREE.MeshStandardMaterial({ map: plaqueTexture(text), metalness: 0.8, roughness: 0.32, emissive: new THREE.Color('#fff2c0'), emissiveIntensity: 0 }), yourMats().brass]);
  m.castShadow = true; m.userData.yours = true;
  return m;
}
export function trophy() {
  const Ym = yourMats(), g = new THREE.Group();
  g.add(box(0.2, 0.08, 0.2, Ym.walnut, 0, 0.04, 0));
  const cup = lathe([[0.03, 0.08], [0.04, 0.12], [0.02, 0.22], [0.1, 0.3], [0.12, 0.42], [0.0, 0.42]], Ym.brass, 20); g.add(cup);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 12, Math.PI), Ym.brass); h.position.set(s * 0.12, 0.34, 0); h.rotation.z = s * Math.PI / 2; g.add(h); }
  return yours(g);
}
export function teaChest(text) {
  const Ym = yourMats(), g = new THREE.Group();
  const lab = new THREE.MeshStandardMaterial({ map: stencilTexture(text), roughness: 0.85 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.6), [Ym.oak, Ym.oak, Ym.oak, Ym.oak, lab, Ym.oak]); m.position.y = 0.3; m.castShadow = m.receiveShadow = true; g.add(m);
  return yours(g);
}
