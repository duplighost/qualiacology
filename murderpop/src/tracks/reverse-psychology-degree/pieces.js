// The sets' pieces, built in three.js on top of the baked stage: simple shapes, merged per material, instanced where
// they repeat. Each builder returns its group and the handles set.js animates on song time.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LAYER } from '../../game/arena.js';
import * as P from './paint.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

// ---------------------------------------------------------------------------------------- materials
export function materials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const glow = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });
  return {
    wall: std({ color: 0x241718, roughness: 0.85 }),
    oak: std({ color: 0x6b4423, roughness: 0.38 }),
    walnut: std({ color: 0x3a2116, roughness: 0.32 }),
    plaster: std({ color: 0xb9ab98, roughness: 0.9 }),
    slate: std({ color: 0xffffff, roughness: 0.85, map: P.chalkboard() }),
    black: std({ color: 0x0c0b0d, roughness: 0.45 }),
    iron: std({ color: 0x15130f, roughness: 0.5, metalness: 0.6 }),
    brass: std({ color: 0xd9a55b, roughness: 0.25, metalness: 1 }),
    gold: std({ color: 0xe8b84a, roughness: 0.22, metalness: 1, emissive: 0x3a2400 }),
    chrome: std({ color: 0xc8ccd2, roughness: 0.12, metalness: 1 }),
    velvet: std({ color: 0x8e0e1f, roughness: 0.82 }),
    leather: std({ color: 0x5a0c18, roughness: 0.35 }),
    satin: std({ color: 0xb3122a, roughness: 0.3 }),
    white: std({ color: 0xece6da, roughness: 0.6 }),
    stone: std({ color: 0xd8d0c4, roughness: 0.85 }),
    hedge: std({ color: 0xffffff, roughness: 0.95, map: P.leaves() }),
    grass: std({ color: 0xffffff, roughness: 0.97, map: (() => { const t = P.leaves([20, 34, 22]); t.repeat.set(40, 40); return t; })() }),
    screen: std({ color: 0xffffff, roughness: 0.92 }),
    green: glow(0x58c070, 1.6),
    bulb: glow(0xffd49a, 3.2),
    gas: glow(0xffb062, 3.0),
    blue: glow(0x3a6bff, 3.2),
    red: glow(0xff2020, 2.5),
    cool: glow(0xe8f0ff, 2.6),
    dark: std({ color: 0x050405, roughness: 0.6 }),
  };
}

// a pile of transformed geometries per material -> one mesh per material
class Pile {
  constructor() { this.m = new Map(); }
  add(geo, mat, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) {
    const g = geo.index ? geo.clone() : geo.clone();
    const M = new THREE.Matrix4().compose(V3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ')), V3(...s));
    g.applyMatrix4(M);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const ng = g.index ? g : g;
    if (!this.m.has(mat)) this.m.set(mat, []);
    this.m.get(mat).push(ng.index ? ng : ng);
    return this;
  }
  build(parent, { cast = false, receive = true } = {}) {
    const out = [];
    for (const [mat, list] of this.m) {
      const idx = list.every((g) => g.index), geos = idx ? list : list.map((g) => (g.index ? g.toNonIndexed() : g));
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
      mesh.castShadow = cast; mesh.receiveShadow = receive;
      parent.add(mesh); out.push(mesh);
    }
    return out;
  }
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r0, r1, h, n = 12) => new THREE.CylinderGeometry(r0, r1, h, n);

// ---------------------------------------------------------------------------------------- S1: the lecture theatre
export function theatre(K, screen) {
  const g = new THREE.Group(); g.name = 'theatre';
  const flats = new THREE.Group(); g.add(flats);
  const p = new Pile();
  p.add(box(34, 8, 0.3), K.wall, { p: [0, 4, -8.35] });
  p.add(box(34, 0.9, 0.12), K.oak, { p: [0, 0.45, -8.14] });
  p.add(box(34, 0.05, 0.16), K.brass, { p: [0, 0.92, -8.12] });
  for (const sx of [-1, 1]) {
    p.add(box(4.6, 2.6, 0.08), K.oak, { p: [sx * 7.4, 2.1, -8.16] });
    p.add(box(0.1, 0.06, 0.2), K.white, { p: [sx * 7.4 + 1.2, 0.92, -8.0] });
  }
  // the screen's black frame and its roller box
  p.add(box(10.0, 0.18, 0.12), K.black, { p: [0, 3.74, -7.92] });
  p.add(box(10.3, 0.32, 0.32), K.black, { p: [0, 3.98, -7.96] });
  p.add(box(10.0, 0.1, 0.1), K.black, { p: [0, 0.3, -7.92] });
  for (const sx of [-1, 1]) p.add(box(0.12, 3.5, 0.12), K.black, { p: [sx * 4.86, 2.0, -7.92] });
  p.build(flats);
  for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.4), K.slate); b.position.set(sx * 7.4, 2.1, -8.11); b.receiveShadow = true; flats.add(b); }
  // the screen in two halves (it tears down the middle)
  const halves = [];
  for (const s of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(4.8, 3.3);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, s < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
    const m = new THREE.Mesh(geo, K.screenMat || (K.screenMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, map: screen.t })));
    m.position.set(s * 2.4, 2.0, -7.88); m.receiveShadow = true; flats.add(m); halves.push(m);
  }
  // the tiers: an oak balustrade with banker's lamps, five benches of crimson velvet rising behind
  const tiers = [];
  for (const sx of [-1, 1]) {
    const t = new THREE.Group(); g.add(t); tiers.push(t);
    const q = new Pile();
    q.add(box(0.14, 0.9, 16.5), K.oak, { p: [sx * 11.32, 0.45, 0] });
    q.add(box(0.3, 0.05, 16.5), K.walnut, { p: [sx * 11.32, 0.92, 0] });
    for (let k = 0; k < 5; k++) {
      const x0 = 11.55 + k * 0.9, h = (k + 1) * 0.45;
      q.add(box(0.9, h, 17), K.wall, { p: [sx * (x0 + 0.45), h / 2 - 0.2, 0] });
      q.add(box(0.5, 0.12, 17), K.velvet, { p: [sx * (x0 + 0.55), h - 0.14, 0] });
      q.add(box(0.06, 0.55, 17), K.oak, { p: [sx * (x0 + 0.08), h + 0.12, 0] });
    }
    q.build(t);
  }
  // banker's lamps: brass bases on the balustrade, green glass shades that ripple on
  const n = 18, lampBase = new THREE.InstancedMesh(cyl(0.05, 0.07, 0.22, 10), K.brass, n);
  const shade = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.14, 0.12, 14, 1, false, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
  const M = new THREE.Matrix4(); let i = 0;
  const lampPos = [];
  for (const sx of [-1, 1]) for (let k = 0; k < 9; k++) {
    const z = 6.4 - k * 1.6; lampPos.push({ sx, z, row: k });
    M.compose(V3(sx * 11.32, 1.04, z), new THREE.Quaternion(), V3(1, 1, 1)); lampBase.setMatrixAt(i, M);
    M.compose(V3(sx * 11.32, 1.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, sx < 0 ? -Math.PI / 2 : Math.PI / 2)), V3(1, 1, 1)); shade.setMatrixAt(i, M);
    shade.setColorAt(i, new THREE.Color(0, 0, 0)); i++;
  }
  shade.userData.rpdTrue = true;
  g.add(lampBase, shade);
  // the lectern (her home mark in the lecture): walnut, a brass reading lamp, a gooseneck mic
  const lectern = new THREE.Group();
  const lp = new Pile();
  lp.add(box(1.1, 1.0, 0.7), K.walnut, { p: [0, 0.5, 0] });
  lp.add(box(1.16, 0.08, 0.8), K.walnut, { p: [0, 1.1, 0.04], r: [-0.2, 0, 0] });
  lp.add(box(1.0, 0.04, 0.04), K.brass, { p: [0, 0.85, 0.36] });
  lp.add(cyl(0.012, 0.012, 0.45), K.brass, { p: [0.4, 1.32, -0.18] });
  lp.add(cyl(0.008, 0.008, 0.4), K.iron, { p: [-0.35, 1.32, -0.1], r: [0.5, 0, 0] });
  lp.build(lectern, { cast: true });
  const llamp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.08, 12, 1, false, 0, Math.PI), K.green); llamp.position.set(0.4, 1.56, -0.12); llamp.rotation.set(Math.PI / 2, 0, -Math.PI / 2); lectern.add(llamp);
  lectern.position.set(-5.0, 0, -5.6);
  g.add(lectern);
  return { group: g, flats, halves, tiers, shade, lampPos, lectern };
}

// ---------------------------------------------------------------------------------------- S2: the quad at night
export function quad(K) {
  const g = new THREE.Group(); g.name = 'quad';
  const hedges = new THREE.Group(); g.add(hedges);
  const p = new Pile();
  for (const sx of [-1, 1]) for (const [z0, z1] of [[-7.2, -0.35], [0.35, 7.2]]) p.add(box(0.6, 0.9, z1 - z0), K.hedge, { p: [sx * 11.7, 0.25, (z0 + z1) / 2] });
  for (const sz of [-1, 1]) p.add(box(22.0, 0.9, 0.6), K.hedge, { p: [0, 0.25, sz * 7.75] });
  p.build(hedges);
  // six cast-iron lamp posts with warm gas globes
  const posts = new THREE.Group(); g.add(posts);
  const q = new Pile(), gl = new Pile();
  for (const [x, z] of [[-11.4, -7.4], [11.4, -7.4], [-11.4, 7.4], [11.4, 7.4], [-11.4, 0], [11.4, 0]]) {
    q.add(cyl(0.05, 0.08, 3.1, 8), K.iron, { p: [x, 1.35, z] });
    q.add(cyl(0.16, 0.2, 0.3, 8), K.iron, { p: [x, -0.05, z] });
    q.add(cyl(0.14, 0.04, 0.12, 8), K.iron, { p: [x, 3.62, z] });
    gl.add(new THREE.SphereGeometry(0.2, 14, 10), K.gas, { p: [x, 3.38, z] });
  }
  q.build(posts, { cast: false }); gl.build(posts);
  // beyond: two collegiate brick ranges with warm windows, and the clock tower (mostly seen in the floor)
  const far = new THREE.Group(); g.add(far);
  const winTex = P.windows(28, 5);
  const range = new THREE.MeshStandardMaterial({ color: 0x3a1a14, roughness: 0.9, emissive: 0xffb062, emissiveMap: winTex, emissiveIntensity: 1.6 });
  for (const sx of [-1, 1]) { const b = new THREE.Mesh(box(26, 12, 52), [range, range, K.wall, K.wall, range, range]); b.position.set(sx * 27, 5.8, -14); far.add(b); }
  const tower = new THREE.Group();
  const tp = new Pile(); tp.add(box(6, 30, 6), K.wall, { p: [0, 15, 0] }); tp.add(new THREE.ConeGeometry(4.6, 9, 4), K.iron, { p: [0, 34.5, 0], r: [0, Math.PI / 4, 0] }); tp.build(tower);
  const face = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ map: P.clockFace(), color: new THREE.Color(1.8, 1.7, 1.5) })); face.position.set(0, 24, 3.02); tower.add(face);
  const hands = [];
  for (const [len, w] of [[1.3, 0.14], [1.9, 0.09]]) { const h = new THREE.Mesh(box(w, len, 0.04), new THREE.MeshBasicMaterial({ color: 0x0a0808 })); h.geometry.translate(0, len / 2, 0); h.position.set(0, 24, 3.08); tower.add(h); hands.push(h); }
  tower.position.set(0, 0, -36); far.add(tower);
  // only the floor's reflection sees them (and the env capture): never in the way of the fight
  far.traverse((o) => o.layers.set(LAYER.HIDDEN));
  // the lawn round the stage
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), K.grass); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.19; grass.receiveShadow = true; g.add(grass);
  return { group: g, hedges, posts, far, tower, hands, grass };
}

// ---------------------------------------------------------------------------------------- S2c: the couch
export function couch(K) {
  const g = new THREE.Group(); g.name = 'couch';
  const tuft = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#5a0c18'; x.fillRect(0, 0, 256, 128); for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) { const cx = 14 + i * 29 + (j % 2) * 14, cy = 16 + j * 32; const gr = x.createRadialGradient(cx, cy, 1, cx, cy, 16); gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(cx - 16, cy - 16, 32, 32); } return P.tex(c); })();
  const leather = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, map: tuft });
  // upholstered, not boxes: rounded cushions, a scrolled head, a bolster, turned gold feet
  const rb = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);
  const chaise = new THREE.Group();
  const cp = new Pile();
  cp.add(rb(1.96, 0.16, 0.78, 0.05), K.walnut, { p: [0.02, 0.2, 0] });
  cp.add(rb(1.9, 0.2, 0.74, 0.09), leather, { p: [0.04, 0.37, 0] });
  cp.add(rb(0.62, 0.2, 0.74, 0.09), leather, { p: [-0.66, 0.6, 0], r: [0, 0, -0.42] });
  cp.add(cyl(0.13, 0.13, 0.76, 20), leather, { p: [-0.9, 0.82, 0], r: [Math.PI / 2, 0, 0] });
  for (const sz of [-1, 1]) cp.add(cyl(0.135, 0.135, 0.02, 20), K.gold, { p: [-0.9, 0.82, sz * 0.385], r: [Math.PI / 2, 0, 0] });
  for (const [x, z] of [[-0.88, -0.32], [0.88, -0.32], [-0.88, 0.32], [0.88, 0.32]]) cp.add(cyl(0.04, 0.022, 0.13, 10), K.gold, { p: [x, 0.065, z] });
  cp.build(chaise, { cast: true });
  chaise.position.set(0, 0, 0.8); chaise.rotation.y = -15 * D2R; g.add(chaise);
  const chair = new THREE.Group();
  const hp = new Pile();
  hp.add(rb(0.86, 0.3, 0.86, 0.08), K.velvet, { p: [0, 0.3, 0.02] });
  hp.add(rb(0.72, 0.14, 0.7, 0.06), K.velvet, { p: [0, 0.5, 0.06] });
  hp.add(rb(0.82, 1.0, 0.2, 0.08), K.velvet, { p: [0, 0.98, -0.34], r: [-0.12, 0, 0] });
  for (const sx of [-1, 1]) {
    hp.add(rb(0.16, 0.34, 0.74, 0.07), K.velvet, { p: [sx * 0.37, 0.6, 0.02] });                              // arms
    hp.add(rb(0.12, 0.62, 0.36, 0.06), K.velvet, { p: [sx * 0.4, 1.12, -0.2], r: [-0.1, sx * 0.35, 0] });       // wings
    for (const sz of [-1, 1]) hp.add(cyl(0.035, 0.025, 0.15, 8), K.gold, { p: [sx * 0.36, 0.075, sz * 0.36] });
  }
  hp.build(chair, { cast: true });
  chair.position.set(-1.9, 0, -0.5); chair.rotation.y = Math.atan2(0 - -1.9, 0.8 - -0.5); g.add(chair);
  const lamp = new THREE.Group();
  const lpp = new Pile();
  lpp.add(cyl(0.018, 0.018, 1.8, 8), K.brass, { p: [0, 0.9, 0] });
  lpp.add(cyl(0.2, 0.24, 0.05, 16), K.brass, { p: [0, 0.025, 0] });
  lpp.build(lamp, { cast: true });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.32, 0.3, 20, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.3, 0.55), side: THREE.DoubleSide })); shade.position.y = 1.95; lamp.add(shade);
  const fringe = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.34, 0.06, 20, 1, true), K.gold); fringe.position.y = 1.78; lamp.add(fringe);
  lamp.position.set(1.4, 0, -0.4); g.add(lamp);
  return { group: g, chaise, chair, lamp };
}

// ---------------------------------------------------------------------------------------- S3: commencement on the lawn
export const POLES = [[-11.7, 7.7], [0, 7.7], [11.7, 7.7], [11.7, 0], [11.7, -7.7], [0, -7.7], [-11.7, -7.7], [-11.7, 0]];
export function lawn(K) {
  const g = new THREE.Group(); g.name = 'lawn';
  const p = new Pile();
  // (no pole at the far middle: it stood as a black line down the banner, the podium and the lyric sign; the two
  // strings meet above the frame)
  for (const [x, z] of POLES) if (!(x === 0 && z < 0)) p.add(cyl(0.05, 0.06, 4.2, 8), K.iron, { p: [x, 1.9, z] });
  // the far riser, the podium, the banner
  p.add(box(13, 0.4, 1.2), K.black, { p: [0, 0.0, -7.85] });
  p.add(box(13.1, 0.04, 1.25), K.gold, { p: [0, 0.2, -7.85] });
  p.build(g, { cast: false });
  // festoon strings and bulbs
  const bulbs = [], strings = [];
  for (let i = 0; i < POLES.length; i++) {
    const [x0, z0] = POLES[i], [x1, z1] = POLES[(i + 1) % POLES.length];
    const L = Math.hypot(x1 - x0, z1 - z0), k = Math.max(4, Math.round(L / 1.25));
    const pts = [];
    for (let j = 0; j <= 24; j++) { const s = j / 24; pts.push(V3(x0 + (x1 - x0) * s, 4.0 - 0.85 * 4 * s * (1 - s), z0 + (z1 - z0) * s)); }
    strings.push(new THREE.CatmullRomCurve3(pts));
    for (let j = 1; j < k; j++) { const s = j / k; bulbs.push(V3(x0 + (x1 - x0) * s, 4.0 - 0.85 * 4 * s * (1 - s) - 0.08, z0 + (z1 - z0) * s)); }
  }
  const sg = mergeGeometries(strings.map((c) => new THREE.TubeGeometry(c, 24, 0.012, 4, false)));
  const sm = new THREE.Mesh(sg, K.black); g.add(sm);
  const bim = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), bulbs.length);
  const M = new THREE.Matrix4();
  bulbs.forEach((b, i) => { M.makeTranslation(b.x, b.y, b.z); bim.setMatrixAt(i, M); bim.setColorAt(i, new THREE.Color(0.08, 0.06, 0.04)); });
  g.add(bim);
  // the podium (solid) and the crimson banner with the gold crest
  const podium = new THREE.Group();
  const pp = new Pile(); pp.add(box(1.0, 1.15, 0.6), K.walnut, { p: [0, 0.575, 0] }); pp.add(box(1.1, 0.06, 0.7), K.gold, { p: [0, 1.17, 0] }); pp.build(podium, { cast: true });
  const crest = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.3), new THREE.MeshStandardMaterial({ map: P.banner(256, 124), roughness: 0.6 })); crest.position.set(0, 0.75, 0.305); podium.add(crest);
  podium.position.set(0, 0, -6.6); g.add(podium);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.6), new THREE.MeshStandardMaterial({ map: P.banner(512, 230), roughness: 0.8 }));
  banner.position.set(0, 2.3, -8.4); banner.receiveShadow = true; g.add(banner);
  const starShape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.5 : 1.2; i ? starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const bigStar = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 1 }), new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 1, roughness: 0.25, emissive: 0x5a3a08 }));
  bigStar.position.set(2.9, 1.55, -8.3); bigStar.scale.setScalar(0.8); bigStar.visible = false; g.add(bigStar);
  return { group: g, bulbs: bim, nb: bulbs.length, podium, banner, bigStar };
}

// the graduates: identical porcelain mannequins in black gowns and mortarboards, faceless bisque heads.
// Two instanced halves (the gown below the hips; above: torso, head) so they can bow; caps their own instances.
export function graduates(K, spots) {
  const n = spots.length;
  const vc = (geo, c) => { const col = new THREE.Color(c); const a = new Float32Array(geo.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; };
  const merge = (list) => mergeGeometries(list.map(([geo, c, m]) => { const g2 = geo.clone(); g2.applyMatrix4(m); for (const k of Object.keys(g2.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g2.deleteAttribute(k); return vc(g2.index ? g2.toNonIndexed() : g2, c); }));
  const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
  const lower = merge([[cyl(0.2, 0.32, 0.95, 12), 0x0d0c10, T(0, 0.475, 0)]]);
  const upper = merge([[cyl(0.24, 0.2, 0.6, 12), 0x0d0c10, T(0, 0.3, 0)], [new THREE.SphereGeometry(0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x0d0c10, T(0, 0.56, 0).multiply(new THREE.Matrix4().makeScale(1, 0.45, 0.8))],
    [cyl(0.05, 0.06, 0.12, 8), 0xb7afa6, T(0, 0.66, 0)], [new THREE.SphereGeometry(0.115, 12, 10), 0xb7afa6, T(0, 0.82, 0).multiply(new THREE.Matrix4().makeScale(0.9, 1.1, 0.95))],
    [cyl(0.05, 0.05, 0.36, 6), 0x0d0c10, T(0, 0.28, 0.17).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))]]);
  const cap = merge([[box(0.3, 0.018, 0.3), 0x0b0a0d, T(0, 0.03, 0)], [cyl(0.1, 0.1, 0.06, 10), 0x0b0a0d, T(0, 0.0, 0)], [box(0.012, 0.14, 0.012), 0xe8b84a, T(0.13, -0.04, 0.0)]]);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 });
  const lo = new THREE.InstancedMesh(lower, mat, n), up = new THREE.InstancedMesh(upper, mat, n), caps = new THREE.InstancedMesh(cap, mat, n);
  for (const m of [lo, up, caps]) { m.frustumCulled = false; m.count = n; }
  return { lo, up, caps, n, spots };
}

// folding chairs (white wood, a mortarboard on each seat): instanced
export function chairs(K, spots) {
  const n = spots.length;
  const wood = mergeGeometries([box(0.46, 0.04, 0.44).translate(0, 0.46, 0), box(0.46, 0.34, 0.035).translate(0, 0.74, -0.2), box(0.035, 0.46, 0.035).translate(-0.2, 0.23, 0.18), box(0.035, 0.46, 0.035).translate(0.2, 0.23, 0.18), box(0.035, 0.9, 0.035).translate(-0.2, 0.45, -0.2), box(0.035, 0.9, 0.035).translate(0.2, 0.45, -0.2)]);
  const cap = mergeGeometries([box(0.3, 0.018, 0.3).translate(0, 0.52, 0), new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10).translate(0, 0.49, 0)]);
  const w = new THREE.InstancedMesh(wood, K.white, n), c = new THREE.InstancedMesh(cap, K.black, n);
  w.castShadow = true;
  return { wood: w, caps: c, n, spots };
}

// ---------------------------------------------------------------------------------------- S3b, S3c: call boxes, dissertations
export function callBoxes(K, spots) {
  const g = new THREE.Group(); g.name = 'callboxes';
  const list = spots.map(([x, z]) => {
    const b = new THREE.Group();
    const p = new Pile();
    p.add(box(0.45, 2.45, 0.45), K.iron, { p: [0, 1.225, 0] });
    p.add(box(0.3, 0.42, 0.03), K.chrome, { p: [0, 1.32, 0.23] });
    p.add(cyl(0.16, 0.2, 0.12, 10), K.iron, { p: [0, 2.47, 0] });
    p.build(b, { cast: true });
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), K.red); btn.position.set(0, 1.3, 0.25); b.add(btn);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3a6bff).multiplyScalar(3) })); globe.position.y = 2.66; b.add(globe);
    b.position.set(x, 0, z);
    // the box faces the middle of the stage
    b.rotation.y = Math.atan2(-x, -z);
    g.add(b);
    return { obj: b, globe, x, z };
  });
  return { group: g, list };
}

export function dissertations(K, spots) {
  const g = new THREE.Group(); g.name = 'dissertations';
  const titles = ['ON HER CONSENT', 'THE GASLIGHT EFFECT', 'YOUR BREAKDOWN, ANNOTATED', 'REVERSE PSYCHOLOGY', 'I KNOW BETTER'];
  const pages = new THREE.MeshStandardMaterial({ color: 0x9c8a62, roughness: 0.55, metalness: 0.4 });
  // gilt page edges that take the light rather than glow (in the dark cloister a glowing top read as a floating card)
  const gilt = new THREE.MeshStandardMaterial({ color: 0xc89a3a, roughness: 0.35, metalness: 1 });
  const list = spots.map(([x, z], i) => {
    const pivot = new THREE.Group();
    const leatherS = new THREE.MeshStandardMaterial({ map: P.spine(titles[i]), roughness: 0.4 });
    const slab = new THREE.Mesh(box(1.4, 2.2, 0.4), [pages, pages, gilt, K.leather, leatherS, K.leather]);
    slab.position.y = 1.1; slab.castShadow = true;
    pivot.add(slab);
    pivot.position.set(x, 0, z);
    g.add(pivot);
    return { pivot, slab, x, z, hp: 3, alive: true };
  });
  // balloons tied to each (crimson and gold), released on "let go"
  const nb = spots.length * 6;
  const bal = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 10).scale(1, 1.2, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }), nb);
  for (let i = 0; i < nb; i++) bal.setColorAt(i, new THREE.Color(i % 2 ? 0x8e0e1f : 0xe8b84a));
  bal.frustumCulled = false; g.add(bal);
  return { group: g, list, balloons: bal, nb };
}

// ---------------------------------------------------------------------------------------- S4: the cloister
// limestone arcades with round arches (cut out of a plane), and the moonlight they throw across the floor
function arcadeMask(u, y, span = 2.6, col = 0.4, spring = 2.3, top = 4.6) {
  const pitch = span + col;
  const local = ((u % pitch) + pitch) % pitch - col / 2;
  if (y > top || y < 0) return y > top ? 0 : 1;
  if (local < 0 || local > span) return 1;           // a column
  const c = span / 2, r = span / 2;
  const dx = local - c;
  if (y < spring) return 0;                           // the opening below the springing
  if (y < spring + Math.sqrt(Math.max(0, r * r - dx * dx))) return 0;
  return 1;
}
export function cloister(K) {
  const g = new THREE.Group(); g.name = 'cloister';
  const mk = (len) => {
    const c = document.createElement('canvas'); c.width = Math.round(len * 40); c.height = 220; const x = c.getContext('2d');
    const img = x.createImageData(c.width, c.height);
    for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
      const u = i / 40 - len / 2 + 0.2, y = (c.height - 1 - j) / 40;
      const solid = arcadeMask(u, y, 2.6, 0.4, 2.3, 5.5) && y < 5.5;
      const k = 4 * (j * c.width + i), n = 200 + ((i * 7 + j * 13) % 23);
      img.data[k] = n; img.data[k + 1] = n * 0.96; img.data[k + 2] = n * 0.9; img.data[k + 3] = solid ? 255 : 0;
    }
    x.putImageData(img, 0, 0);
    return P.tex(c);
  };
  const mat = (len) => new THREE.MeshStandardMaterial({ map: mk(len), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
  const sides = [];
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(18, 5.5), mat(18)); m.position.set(sx * 12.1, 2.75, 0); m.rotation.y = Math.PI / 2; g.add(m); sides.push(m); }
  const far = new THREE.Mesh(new THREE.PlaneGeometry(24, 5.5), mat(24)); far.position.set(0, 2.75, -8.25); g.add(far);
  // iron lanterns hanging in the arches
  const lp = new Pile();
  for (const sx of [-1, 1]) for (let z = -7.3; z <= 7.0; z += 3.0) lp.add(box(0.16, 0.24, 0.16), K.gas, { p: [sx * 12.0, 2.05, z] });
  for (let x = -10.7; x <= 10.5; x += 3.0) lp.add(box(0.16, 0.24, 0.16), K.gas, { p: [x, 2.05, -8.15] });
  lp.build(g);
  return { group: g };
}
// the moon through the arcades, projected on the floor: 1 = lit, 0 = in an arch's shadow
export function cloisterShadow(dir = V3(0.8, 0.42, -0.42)) {
  const W = 512, H = 326, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const img = x.createImageData(W, H);
  const d = dir.clone().normalize();
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const px = -11.2 + i / W * 22.4, pz = -7.2 + j / H * 14.4;
    let lit = 1;
    // the right arcade (x = 12.1): the ray toward the moon climbs as it goes
    if (d.x > 0) { const t = (12.1 - px) / d.x, y = d.y * t, zc = pz + d.z * t; if (arcadeMask(-zc + 0.2, y, 2.6, 0.4, 2.3, 5.5)) lit = 0; }
    if (lit && d.z < 0) { const t = (pz - -8.25) / -d.z, y = d.y * t, xc = px + d.x * t; if (arcadeMask(xc + 0.2, y, 2.6, 0.4, 2.3, 5.5)) lit = 0; }
    const k = 4 * (j * W + i), v = lit ? 255 : 38;
    img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = Math.min(255, v + 14); img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // soften the edges a little
  x.filter = 'blur(2px)'; x.drawImage(c, 0, 0); x.filter = 'none';
  return P.tex(c, { srgb: false });
}

// ---------------------------------------------------------------------------------------- S5b: the exam hall
export function examHall(K) {
  const g = new THREE.Group(); g.name = 'exam';
  const win = new THREE.MeshBasicMaterial({ map: P.archWindow(), color: new THREE.Color(1.3, 1.4, 1.8), transparent: true, alphaTest: 0.02 });
  win.userData = {};
  const walls = [];
  const wall = (len, side) => {
    const pivot = new THREE.Group(); pivot.rotation.order = 'YXZ';
    const p = new Pile();
    p.add(box(len, 5.4, 0.25), K.plaster, { p: [0, 2.7, -0.12] });
    p.add(box(len, 1.2, 0.08), K.oak, { p: [0, 0.6, 0.04] });
    p.add(box(len, 0.06, 0.12), K.walnut, { p: [0, 1.22, 0.06] });
    p.build(pivot, { cast: false });
    for (let u = -len / 2 + 1.4; u < len / 2 - 0.8; u += 2.4) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.7), win); w.position.set(u, 1.4 + 1.35, 0.02); pivot.add(w); }
    walls.push({ pivot, side });
    g.add(pivot);
    return pivot;
  };
  const L = wall(16, 'left'); L.position.set(-11.85, 0, 0); L.rotation.y = Math.PI / 2;
  const Rw = wall(16, 'right'); Rw.position.set(11.85, 0, 0); Rw.rotation.y = -Math.PI / 2;
  const F = wall(24, 'far'); F.position.set(0, 0, -8.05);
  // the exam clock on the far wall, hands running backwards
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), new THREE.MeshStandardMaterial({ map: P.clockFace(), roughness: 0.5, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0.05 }));
  face.position.set(0, 2.4, 0.05); F.add(face);
  const hands = [];
  for (const [len, w] of [[0.5, 0.07], [0.75, 0.045]]) { const h = new THREE.Mesh(box(w, len, 0.02), K.dark); h.geometry.translate(0, len / 2, 0); h.position.set(0, 2.4, 0.08); F.add(h); hands.push(h); }
  // fluorescent strips hanging at 4 m
  const strips = [];
  for (const z of [-4.7, -1.6, 1.5, 4.6]) for (const x of [-7.2, 0, 7.2]) {
    const s = new THREE.Group();
    // slim and pale from above: a black iron hood read as a black bar across the fighters when they stood under it
    const tube = new THREE.Mesh(box(2.6, 0.06, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff })); s.add(tube);
    const hood = new THREE.Mesh(box(2.66, 0.03, 0.12), K.chrome); hood.position.y = 0.045; s.add(hood);
    s.position.set(x, 4.0, z); g.add(s); strips.push({ s, tube, x, z });
    tube.userData.rpdTrue = true;
  }
  // the invigilator's desk on the riser
  const desk = new THREE.Group(); const dp = new Pile(); dp.add(box(1.6, 0.08, 0.8), K.oak, { p: [0, 0.76, 0] }); dp.add(box(1.5, 0.7, 0.06), K.oak, { p: [0, 0.37, 0.36] }); for (const sx of [-1, 1]) dp.add(box(0.06, 0.72, 0.74), K.oak, { p: [sx * 0.76, 0.36, 0] }); dp.build(desk, { cast: true });
  desk.position.set(0, 0, -6.8); g.add(desk);
  return { group: g, walls, hands, strips, desk, face };
}
// 24 exam desks with their chairs (instanced): rows z -3.75 .. 3.75, columns x -8.25 .. 8.25
export const DESK_ROWS = [-3.75, -1.25, 1.25, 3.75], DESK_COLS = [-8.25, -4.95, -1.65, 1.65, 4.95, 8.25];
export function desks(K) {
  const geo = mergeGeometries([box(1.0, 0.05, 0.5).translate(0, 0.74, 0.08), box(0.05, 0.72, 0.05).translate(-0.45, 0.36, -0.12), box(0.05, 0.72, 0.05).translate(0.45, 0.36, -0.12), box(0.05, 0.72, 0.05).translate(-0.45, 0.36, 0.3), box(0.05, 0.72, 0.05).translate(0.45, 0.36, 0.3),
    box(0.44, 0.04, 0.38).translate(0, 0.44, -0.32), box(0.44, 0.36, 0.03).translate(0, 0.66, -0.5), box(0.04, 0.44, 0.04).translate(-0.2, 0.22, -0.45), box(0.04, 0.44, 0.04).translate(0.2, 0.22, -0.45)]);
  const im = new THREE.InstancedMesh(geo, K.oak, DESK_ROWS.length * DESK_COLS.length);
  im.castShadow = true; im.frustumCulled = false;
  return im;
}

// ---------------------------------------------------------------------------------------- the sky (mostly seen in the floor)
const SKY_VS = `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_FS = `uniform vec3 uTop, uHor; uniform float uStars, uMoon; varying vec3 vD;
float h(vec3 p){ p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main(){ vec3 d = normalize(vD); float y = clamp(d.y, -0.2, 1.0);
  vec3 c = mix(uHor, uTop, smoothstep(-0.05, 0.6, y));
  vec3 q = floor(d * 220.0); float s = step(0.9965, h(q)) * smoothstep(0.05, 0.3, y) * uStars; c += vec3(1.6, 1.6, 1.8) * s;
  vec3 md = normalize(vec3(0.45, 0.62, -0.62)); float m = smoothstep(0.9988, 0.9993, dot(d, md)); c += vec3(2.4, 2.4, 2.6) * m * uMoon + vec3(0.35, 0.4, 0.6) * pow(max(0.0, dot(d, md)), 60.0) * uMoon;
  gl_FragColor = vec4(c, 1.0); }`;
export function sky() {
  const u = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uStars: { value: 0 }, uMoon: { value: 0 } };
  const m = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: u, side: THREE.BackSide, depthWrite: false }));
  m.renderOrder = -10; m.frustumCulled = false; m.userData.rpdTrue = true;
  return { mesh: m, u };
}

// ---------------------------------------------------------------------------------------- floor decals (never mirrored)
export function decal(w, h, mat, { x = 0, z = 0, y = 0.012, order = 1 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
  m.layers.set(LAYER.NO_REFLECT); m.renderOrder = order; m.frustumCulled = false; m.userData.rpdTrue = true;
  return m;
}
export function glowMat(color, { radial = true, tex = null, opacity = 1 } = {}) {
  const t = tex || (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 2, 64, 64, 63); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return P.tex(c, { srgb: false }); })();
  return new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 });
}
export function multiplyMat(tex, gain = 1) {
  return new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(gain, gain * 1.05, gain * 1.25), transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor, polygonOffset: true, polygonOffsetFactor: -2 });
}
// the brain: gyri over the whole floor in gold (two hemispheres, split at x = 0)
const BRAIN_FS = `uniform float uK, uT; varying vec2 vW;
float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ns(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hs(i), hs(i + vec2(1,0)), f.x), mix(hs(i + vec2(0,1)), hs(i + vec2(1,1)), f.x), f.y); }
void main(){ vec2 p = vW; float side = sign(p.x); vec2 q = vec2(abs(p.x) - 0.3, p.y);
  float e = length(vec2(q.x - 4.0, q.y) / vec2(4.3, 5.6)); if (e > 1.0) discard;
  float f = ns(q * 0.55) * 1.0 + ns(q * 1.3 + 7.0) * 0.5; float w = abs(fract(f * 4.0 + q.y * 0.05) - 0.5);
  float line = 1.0 - smoothstep(0.012, 0.024, w); line *= smoothstep(1.0, 0.9, e);
  float rim = 1.0 - smoothstep(0.0, 0.025, abs(e - 0.985));
  float a = (line * 0.45 + rim * 0.7) * uK * (0.75 + 0.25 * sin(uT * 3.0 + q.y));
  gl_FragColor = vec4(vec3(3.2, 2.0, 0.6) * a, a); }`;
export function brain() {
  const u = { uK: { value: 0 }, uT: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: BRAIN_FS, uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 });
  const m = decal(22, 14, mat, { y: 0.013, order: 1 });
  return { mesh: m, u };
}
