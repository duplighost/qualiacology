// The things in her yard that move, break, rise and sink: YOUR car (copper, ivory roof, chrome, round headlights),
// YOUR three ivory cases, two plastic flamingos, the garden table and chairs, the mailbox, the six MISSING poles with
// YOUR face on them, the five depth posts, YOUR car's gear lever (giant), her pink cinder blocks, the doormat, the
// key plaque with the spare key, the police cruiser, the topiary stumps. Her things are pink, buttercup, white and
// gold; YOUR things are ivory, copper and umber.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// one mesh per material for a prop's parts that never move against each other (fewer draw calls in every pass)
export function mergeByMaterial(root, keep = new Set()) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map(), victims = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
    for (let p = o; p && p !== root; p = p.parent) if (keep.has(p)) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!groups.has(o.material)) groups.set(o.material, []);
    groups.get(o.material).push(g); victims.push(o);
  });
  for (const o of victims) o.parent.remove(o);
  for (const [mat, gs] of groups) { const m = new THREE.Mesh(mergeGeometries(gs, false), mat); m.castShadow = true; m.receiveShadow = true; root.add(m); for (const g of gs) g.dispose(); }
  return root;
}

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, metalness: 0, ...o });
function mesh(g, m, cast = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; }
function rounded(w, h, d, r = 0.04) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.9, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - r * 2) / 2); g.computeVertexNormals(); return g;
}
export function canvasTex(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// the shared palette
export const MAT = {};
function mats() {
  if (MAT.copper) return MAT;
  Object.assign(MAT, {
    copper: std(0xb8733a, { metalness: 0.85, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.04 }),
    ivory: std(0xf4ecdc, { roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 }),
    umber: std(0x5e3519, { roughness: 0.55 }),
    chrome: std(0xffffff, { metalness: 1, roughness: 0.07 }),
    glass: std(0x0a1016, { roughness: 0.04, metalness: 0.3, clearcoat: 1 }),
    tyre: std(0x111014, { roughness: 0.8 }),
    head: new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: new THREE.Color(1.0, 0.94, 0.78), emissiveIntensity: 2.5, roughness: 0.1 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x3a0505, emissive: new THREE.Color(1.0, 0.08, 0.06), emissiveIntensity: 1.2 }),
    pink: std(0xff7fae, { roughness: 0.3, clearcoat: 0.8 }),
    flamingo: std(0xff6fa3, { roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
    white: std(0xf7f2ec, { roughness: 0.42 }),
    iron: std(0x7f7a76, { roughness: 0.5, metalness: 0.35 }),   // mid grey: a pale disc on this floor reads as a white telegraph
    black: std(0x0d0c10, { roughness: 0.5 }),
    block: std(0xf28db2, { roughness: 0.75 }),
    leather: std(0x3a2416, { roughness: 0.6 }),
    red: std(0xd8203a, { roughness: 0.4 }),
    navy: std(0x101827, { roughness: 0.3, metalness: 0.4, clearcoat: 1 }),
    hedge: std(0x1f4f37, { roughness: 0.7 }),
  });
  return MAT;
}

// ---------------------------------------------------------------------------------------------- YOUR car
// a 1960s fastback coupe, die-cast perfect. Its origin is on the ground under its middle; +z is its nose.
export function makeCar() {
  const M = mats();
  const car = new THREE.Group(); car.name = 'your car';
  const body = new THREE.Shape();
  const P = [[-2.2, 0.3], [-2.26, 0.5], [-2.2, 0.72], [-1.9, 0.86], [1.0, 0.9], [1.95, 0.8], [2.2, 0.66], [2.24, 0.48], [2.14, 0.3]];
  body.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) body.lineTo(P[i][0], P[i][1]); body.lineTo(P[0][0], P[0][1]);
  const bg = new THREE.ExtrudeGeometry(body, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.09, bevelSegments: 4, curveSegments: 4 });
  bg.translate(0, 0, -0.75); bg.rotateY(-Math.PI / 2); bg.computeVertexNormals();
  car.add(mesh(bg, M.copper));
  const gh = new THREE.Shape(); const G = [[-1.85, 0.86], [-0.55, 1.28], [0.32, 1.3], [0.98, 0.9]];
  gh.moveTo(G[0][0], G[0][1]); for (let i = 1; i < G.length; i++) gh.lineTo(G[i][0], G[i][1]); gh.lineTo(G[0][0], G[0][1]);
  const gg = new THREE.ExtrudeGeometry(gh, { depth: 1.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
  gg.translate(0, 0, -0.65); gg.rotateY(-Math.PI / 2); gg.computeVertexNormals();
  car.add(mesh(gg, M.glass));
  const roof = mesh(new THREE.BoxGeometry(1.36, 0.05, 0.95), M.ivory); roof.position.set(0, 1.33, 0.12); roof.rotation.x = 0.04; car.add(roof);
  const roofBack = mesh(new THREE.BoxGeometry(1.3, 0.05, 1.2), M.ivory); roofBack.position.set(0, 1.12, -1.05); roofBack.rotation.x = -0.33; car.add(roofBack);
  for (const z of [-2.32, 2.32]) { const b = mesh(new THREE.CapsuleGeometry(0.06, 1.55, 4, 10), M.chrome); b.rotation.z = Math.PI / 2; b.position.set(0, 0.44, z); car.add(b); }
  const lights = new THREE.Group(); lights.name = 'lights';
  for (const x of [-0.6, 0.6]) {
    const rim = mesh(new THREE.TorusGeometry(0.13, 0.022, 8, 24), M.chrome); rim.position.set(x, 0.64, 2.28); car.add(rim);
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), M.head); lamp.position.set(x, 0.64, 2.29); lights.add(lamp);
    const tl = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), M.tail); tl.position.set(x * 1.05, 0.66, -2.33); tl.rotation.y = Math.PI; lights.add(tl);
  }
  car.add(lights);
  const wheels = [];
  const hubTex = canvasTex(128, 128, (g) => { g.fillStyle = '#d8d8dc'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#70707a'; g.lineWidth = 2; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); g.stroke(); } g.fillStyle = '#b8733a'; g.beginPath(); g.arc(64, 64, 14, 0, 7); g.fill(); });
  const hubM = new THREE.MeshStandardMaterial({ map: hubTex, metalness: 1, roughness: 0.15 });
  for (const [x, z] of [[-0.78, -1.38], [0.78, -1.38], [-0.78, 1.38], [0.78, 1.38]]) {
    const w = new THREE.Group(); w.position.set(x, 0.33, z);
    const tyre = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 24), M.tyre); tyre.rotation.z = Math.PI / 2; w.add(tyre);
    const hub = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), hubM); hub.position.x = Math.sign(x) * 0.112; hub.rotation.y = Math.sign(x) * Math.PI / 2; w.add(hub);
    car.add(w); wheels.push(w);
  }
  // the roof rack with the third ivory case strapped to it
  for (const x of [-0.5, 0.5]) { const r = mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.3, 6), M.chrome); r.rotation.x = Math.PI / 2; r.position.set(x, 1.4, -0.1); car.add(r); }
  const roofCase = makeCase(); roofCase.position.set(0, 1.62, -0.15); roofCase.rotation.set(0, 0.06, Math.PI / 2); roofCase.scale.setScalar(0.95); car.add(roofCase);
  const strap = mesh(new THREE.BoxGeometry(1.0, 0.02, 0.05), M.umber); strap.position.set(0, 1.9, -0.15); car.add(strap);
  // high-beam cones in the water (shown when they flare)
  const cone = new THREE.ConeGeometry(0.9, 6, 24, 1, true); cone.translate(0, -3, 0); cone.rotateX(-Math.PI / 2);
  const beamM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uK: { value: 0 } },
    vertexShader: 'varying float vZ; varying vec3 vN; varying vec3 vV; void main(){ vZ = position.z; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uK; varying float vZ; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 1.6); float a = uK * f * smoothstep(6.0, 0.4, vZ) * smoothstep(0.0, 0.4, vZ) * 0.22; gl_FragColor = vec4(vec3(1.0, 0.92, 0.74) * a, a); }' });
  const beams = new THREE.Group();
  for (const x of [-0.6, 0.6]) { const b = new THREE.Mesh(cone, beamM); b.position.set(x, 0.64, 2.3); b.rotation.x = 0.12; b.renderOrder = 9; beams.add(b); }
  car.add(beams);
  car.userData = { lights, wheels, beams, beamM, roofCase };
  mergeByMaterial(car, new Set([lights, beams]));
  return car;
}

// ---------------------------------------------------------------------------------------------- YOUR cases
export function makeCase() {
  const M = mats();
  const g = new THREE.Group(); g.name = 'case';
  const shell = mesh(rounded(0.72, 0.5, 0.24, 0.05), M.ivory); shell.position.y = 0.25; g.add(shell);
  const seam = mesh(new THREE.BoxGeometry(0.74, 0.012, 0.25), M.umber); seam.position.y = 0.25; g.add(seam);
  for (const x of [-0.2, 0.2]) { const l = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), M.copper); l.position.set(x, 0.5, 0.11); g.add(l); }
  const h = mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 16, Math.PI), M.umber); h.position.set(0, 0.5, 0); g.add(h);
  return mergeByMaterial(g);
}

// ---------------------------------------------------------------------------------------------- the flamingos, the garden set, the mailbox
export function makeFlamingo() {
  const M = mats(); const g = new THREE.Group(); g.name = 'flamingo';
  const body = mesh(new THREE.SphereGeometry(0.22, 18, 12), M.flamingo); body.scale.set(0.75, 0.62, 1.1); body.position.y = 0.72; g.add(body);
  const neck = new THREE.CatmullRomCurve3([V3(0, 0.78, 0.18), V3(0, 1.0, 0.24), V3(0, 1.2, 0.12), V3(0, 1.28, 0.2)]);
  g.add(mesh(new THREE.TubeGeometry(neck, 16, 0.035, 8, false), M.flamingo));
  const head = mesh(new THREE.SphereGeometry(0.06, 12, 10), M.flamingo); head.position.set(0, 1.3, 0.24); g.add(head);
  const beak = mesh(new THREE.ConeGeometry(0.025, 0.12, 8), M.black); beak.rotation.x = Math.PI / 2 + 0.6; beak.position.set(0, 1.27, 0.32); g.add(beak);
  for (const x of [-0.04, 0.04]) { const l = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 5), M.black); l.position.set(x, 0.3, 0); g.add(l); }
  return mergeByMaterial(g);
}
export function makeGardenSet() {
  const M = mats(); const g = new THREE.Group(); g.name = 'garden set';
  const top = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 28), M.iron); top.position.y = 0.6; g.add(top);
  const leg = mesh(new THREE.CylinderGeometry(0.03, 0.12, 0.58, 10), M.iron); leg.position.y = 0.3; g.add(leg);
  // her pink gingham cloth over it, square and hanging at the sides: from above a checked diamond, not a disc
  const gingham = canvasTex(64, 64, (c, w) => { c.fillStyle = '#f6eee6'; c.fillRect(0, 0, w, w); c.fillStyle = 'rgba(226,132,165,0.55)'; for (let i = 0; i < 8; i += 2) { c.fillRect(i * 8, 0, 8, w); c.fillRect(0, i * 8, w, 8); } });
  gingham.wrapS = gingham.wrapT = THREE.RepeatWrapping; gingham.repeat.set(3, 3);
  const cloth = new THREE.MeshPhysicalMaterial({ map: gingham, roughness: 0.85 });
  const sheet = mesh(new THREE.BoxGeometry(0.98, 0.012, 0.98), cloth); sheet.position.y = 0.628; sheet.rotation.y = Math.PI / 4; g.add(sheet);
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2, s = mesh(new THREE.BoxGeometry(0.98, 0.16, 0.01), cloth); s.position.set(Math.sin(a) * 0.49, 0.55, Math.cos(a) * 0.49); s.rotation.y = a; g.add(s); }
  const chairs = [];
  for (const s of [-1, 1]) {
    const c = new THREE.Group(); c.position.set(s * 0.75, 0, 0.1); c.rotation.y = -s * Math.PI / 2;
    const seat = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 18), M.iron); seat.position.y = 0.42; c.add(seat);
    const back = mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 18, Math.PI), M.iron); back.position.set(0, 0.62, -0.18); c.add(back);
    for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) { const l = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 5), M.iron); l.position.set(x, 0.21, z); c.add(l); }
    g.add(c); chairs.push(c);
  }
  g.userData.chairs = chairs;
  return mergeByMaterial(g);
}
export function makeMailbox() {
  const M = mats(); const g = new THREE.Group(); g.name = 'mailbox';
  const post = mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), M.white); post.position.y = 0.5; g.add(post);
  const box = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.45, 16, 1, false, 0, Math.PI), M.chrome); box.rotation.z = Math.PI / 2; box.rotation.y = Math.PI / 2; box.position.y = 1.08; g.add(box);
  const base = mesh(new THREE.BoxGeometry(0.3, 0.12, 0.45), M.chrome); base.position.y = 1.02; g.add(base);
  const flag = mesh(new THREE.BoxGeometry(0.02, 0.1, 0.16), M.pink); flag.position.set(0.17, 1.2, -0.08); g.add(flag);
  return mergeByMaterial(g);
}

// ---------------------------------------------------------------------------------------------- MISSING: YOUR face on a pole
// the poster's photo is rendered from YOU herself (see world.js portrait()); the word is stencilled over it in red
export function posterTexture(photo) {
  return canvasTex(512, 720, (g, w, h) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8102e'; g.font = '900 104px "Archivo Black", Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
    g.save(); g.translate(w / 2, 18); g.scale(0.9, 1.0); g.fillText('MISSING', 0, 0); g.restore();
    if (photo) { g.drawImage(photo, 46, 150, w - 92, 440); g.strokeStyle = '#1a1416'; g.lineWidth = 4; g.strokeRect(46, 150, w - 92, 440); }
    else { g.fillStyle = '#7a5a48'; g.fillRect(46, 150, w - 92, 440); }
    g.fillStyle = '#2a2224'; for (let i = 0; i < 4; i++) g.fillRect(70, 615 + i * 22, w - 140 - (i % 2) * 90, 9);
  });
}
export function makePole(photoTex) {
  const M = mats(); const g = new THREE.Group(); g.name = 'pole';
  const post = mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.0, 10), M.white); post.position.y = 2.0; g.add(post);
  const board = new THREE.Group(); board.position.set(0, 3.05, 0.11); board.rotation.x = -0.32;
  const back = mesh(new THREE.BoxGeometry(0.78, 1.08, 0.03), M.white); board.add(back);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.01), new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.6 })); face.position.z = 0.017; board.add(face);
  g.add(board);
  g.userData = { board, face };
  mergeByMaterial(board); mergeByMaterial(g, new Set([board]));
  return g;
}

// ---------------------------------------------------------------------------------------------- the depth posts, the stick shift
export function makeDepthPost(label) {
  const M = mats(); const g = new THREE.Group(); g.name = 'depth ' + label;
  const post = mesh(new THREE.CylinderGeometry(0.13, 0.15, 2.6, 14), M.white); post.position.y = 1.3; g.add(post);
  for (let k = 0; k < 4; k++) { const b = mesh(new THREE.CylinderGeometry(0.151, 0.151, 0.12, 14), M.red); b.position.y = 0.35 + k * 0.55; g.add(b); }
  const tex = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#f7f2ec'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8102e'; c.font = '900 76px "Archivo Black", Arial Black, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, w / 2, h / 2 + 4); });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
  plate.position.set(0, 2.25, 0.16); plate.rotation.x = -0.5; g.add(plate);
  const cap = mesh(new THREE.ConeGeometry(0.16, 0.18, 14), M.red); cap.position.y = 2.69; g.add(cap);
  return mergeByMaterial(g);
}
export function makeStick() {
  const M = mats(); const g = new THREE.Group(); g.name = 'stick shift';
  const boot = mesh(new THREE.CylinderGeometry(0.16, 0.52, 0.6, 20, 4), M.leather); boot.position.y = 0.3; g.add(boot);
  const ring = mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 32), M.chrome); ring.rotation.x = Math.PI / 2; ring.position.y = 0.04; g.add(ring);
  const shaft = mesh(new THREE.CylinderGeometry(0.075, 0.1, 2.7, 14), M.chrome); shaft.position.y = 1.85; shaft.rotation.z = -0.05; g.add(shaft);
  const knobTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#f4ecdc'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b8733a'; c.lineWidth = 9; c.lineCap = 'round';
    const X = [70, 128, 186]; for (const x of X) { c.beginPath(); c.moveTo(x, 70); c.lineTo(x, 186); c.stroke(); }
    c.beginPath(); c.moveTo(70, 128); c.lineTo(186, 128); c.stroke();
    c.fillStyle = '#b8733a'; c.font = '700 26px "Space Grotesk", sans-serif'; c.textAlign = 'center';
    ['1', '3', '5'].forEach((s, i) => c.fillText(s, X[i], 58)); ['2', '4', '6'].forEach((s, i) => c.fillText(s, X[i], 214));
  });
  const knob = mesh(new THREE.SphereGeometry(0.3, 28, 18), new THREE.MeshPhysicalMaterial({ map: knobTex, roughness: 0.2, clearcoat: 1 })); knob.position.y = 3.3; knob.rotation.x = -0.9; g.add(knob);
  return mergeByMaterial(g);
}

// ---------------------------------------------------------------------------------------------- her pink cinder block, with a bow on it
export function makeBlock() {
  const M = mats(); const g = new THREE.Group(); g.name = 'cinder block';
  const b = mesh(new THREE.BoxGeometry(0.62, 0.32, 0.32), M.block); g.add(b);
  for (const x of [-0.15, 0.15]) { const hole = mesh(new THREE.BoxGeometry(0.2, 0.322, 0.18), std(0xb85f84, { roughness: 0.9 })); hole.position.x = x; g.add(hole); }
  const bow = new THREE.Group(); bow.position.y = 0.19;
  for (const s of [-1, 1]) { const l = mesh(new THREE.SphereGeometry(0.07, 12, 8), M.pink); l.scale.set(1.3, 0.6, 0.5); l.position.x = s * 0.07; bow.add(l); }
  const rib = mesh(new THREE.BoxGeometry(0.06, 0.34, 0.33), M.pink); rib.position.y = -0.19; bow.add(rib);
  g.add(bow);
  return mergeByMaterial(g);
}

// ---------------------------------------------------------------------------------------------- the doormat and the key plaque
export function makeDoormat() {
  const tex = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#8a6a43'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${60 + Math.random() * 60},${40 + Math.random() * 40},${20 + Math.random() * 20},0.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 6); }
    g.strokeStyle = '#5e4429'; g.lineWidth = 18; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#ff6fa3'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'italic 700 96px Fraunces, Georgia, serif'; g.fillText('Just in case', w / 2, h * 0.34);
    g.font = 'italic 700 82px Fraunces, Georgia, serif'; g.fillText('you wanna come home', w / 2, h * 0.68);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, emissiveMap: tex, emissive: new THREE.Color(0.32, 0.26, 0.22) }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.name = 'doormat';
  // a film of lake water over it, gone on "Just"
  const film = new THREE.Mesh(new THREE.PlaneGeometry(2.42, 1.22), new THREE.MeshPhysicalMaterial({ color: 0x0a1418, roughness: 0.02, metalness: 0.0, transparent: true, opacity: 0.6, clearcoat: 1, depthWrite: false }));
  film.rotation.x = -Math.PI / 2; film.position.y = 0.006; film.name = 'film';
  const g = new THREE.Group(); g.add(m, film); g.userData.film = film;
  return g;
}
export function makePlaque() {
  const M = mats(); const g = new THREE.Group(); g.name = 'key plaque';
  const hs = new THREE.Shape(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; const x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); if (i) hs.lineTo(x * 0.017, y * 0.017); else hs.moveTo(x * 0.017, y * 0.017); }
  const plate = mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3 }), std(0xf59ab8, { roughness: 0.3, clearcoat: 1 }));
  g.add(plate);
  const brass = std(0xd8b25a, { metalness: 1, roughness: 0.25 });
  const hooks = [];
  for (let i = 0; i < 6; i++) { const x = -0.2 + i * 0.08; const hk = mesh(new THREE.TorusGeometry(0.012, 0.004, 6, 10, Math.PI * 1.3), brass); hk.position.set(x, -0.04, 0.05); hk.rotation.z = Math.PI * 1.15; g.add(hk); hooks.push(V3(x, -0.06, 0.05)); }
  // the spare key: brass, a pink enamel heart fob with a tiny chip, a thread of dried weed in the ring
  const key = makeSpareKey(); key.position.copy(hooks[2]).add(V3(0, -0.08, 0.01)); g.add(key);
  g.userData = { key };
  mergeByMaterial(g, new Set([key])); g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return g;
}
export function makeSpareKey() {
  const k = new THREE.Group(); k.name = 'spare key';
  const brass = std(0xd8b25a, { metalness: 1, roughness: 0.28 });
  const ring = mesh(new THREE.TorusGeometry(0.018, 0.003, 6, 16), brass); k.add(ring);
  const ks = new THREE.Shape(); ks.moveTo(-0.006, 0); ks.lineTo(0.006, 0); ks.lineTo(0.006, -0.07); ks.lineTo(0.0, -0.075); ks.lineTo(-0.006, -0.07); ks.lineTo(-0.006, -0.055); ks.lineTo(-0.012, -0.05); ks.lineTo(-0.006, -0.045); ks.lineTo(-0.006, -0.035); ks.lineTo(-0.011, -0.03); ks.lineTo(-0.006, -0.025); ks.lineTo(-0.006, 0);
  const blade = mesh(new THREE.ExtrudeGeometry(ks, { depth: 0.003, bevelEnabled: false }), brass); blade.position.set(0.0, -0.035, 0); k.add(blade);
  const bow = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.004, 18).rotateX(Math.PI / 2), brass); bow.position.y = -0.03; k.add(bow);
  const hs = new THREE.Shape(); for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI * 2; const x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); if (i) hs.lineTo(x * 0.0016, y * 0.0016); else hs.moveTo(x * 0.0016, y * 0.0016); }
  const fob = mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.002, bevelSegments: 2 }), std(0xff6fa3, { roughness: 0.12, clearcoat: 1 }));
  fob.position.set(0.024, 0.006, -0.002); k.add(fob);
  return k;
}

// ---------------------------------------------------------------------------------------------- the police cruiser (no siren)
export function makeCruiser() {
  const M = mats(); const g = new THREE.Group(); g.name = 'cruiser';
  const body = mesh(rounded(1.8, 0.62, 4.8, 0.14), M.navy); body.position.y = 0.62; g.add(body);
  for (const s of [-1, 1]) { const d = mesh(new THREE.BoxGeometry(0.02, 0.5, 1.9), M.white); d.position.set(s * 0.905, 0.64, 0.1); g.add(d); }
  const cab = mesh(rounded(1.6, 0.5, 2.3, 0.12), M.glass); cab.position.set(0, 1.18, -0.2); g.add(cab);
  const bar = new THREE.Group(); bar.position.set(0, 1.5, -0.2);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.22), new THREE.MeshStandardMaterial({ color: 0x400008, emissive: new THREE.Color(1.0, 0.08, 0.12), emissiveIntensity: 0 }));
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.22), new THREE.MeshStandardMaterial({ color: 0x000a40, emissive: new THREE.Color(0.12, 0.3, 1.0), emissiveIntensity: 0 }));
  red.position.x = -0.32; blue.position.x = 0.32; bar.add(red, blue); g.add(bar);
  for (const [x, z] of [[-0.82, -1.5], [0.82, -1.5], [-0.82, 1.5], [0.82, 1.5]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18), M.tyre); w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w); }
  g.userData = { red, blue };
  return mergeByMaterial(g, new Set([bar]));
}

// the stump a trimmed topiary leaves, and its clippings
export function makeStump() {
  const M = mats(); const g = new THREE.Group(); g.name = 'stump';
  const pot = mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.5, 18), std(0xf2eee8, { roughness: 0.3 })); pot.position.y = 0.25; g.add(pot);
  const stem = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 8), M.umber); stem.position.y = 0.75; g.add(stem);
  const tuft = mesh(new THREE.IcosahedronGeometry(0.3, 1), M.hedge); tuft.position.y = 1.0; tuft.scale.y = 0.6; g.add(tuft);
  return mergeByMaterial(g);
}
