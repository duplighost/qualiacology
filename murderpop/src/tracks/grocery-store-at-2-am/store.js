// The 24-hour store and its parking lot, built in three.js (its lights change with the song, so nothing is
// baked): five aisles of stocked gondolas under strip fixtures, the freezer wall, dairy along the back,
// produce, three checkouts (one lit), the service desk with its security monitors, the glass front and its
// sliding doors, the letter board, and the lot under sodium lamps.
// Interior: x -15..15, z -10..8 (the doors at x 6..9 on the front wall, z = 8). The lot: z 8..30.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as P from './paint.js';

const Std = (o) => new THREE.MeshStandardMaterial(o);
const COOL = new THREE.Color(0.86, 1.0, 0.92);       // fluorescent, a little green
export const AISLES = [-13, -8, -3, 2, 7];             // aisle centres (x)
export const GONDOLAS = [-10.5, -5.5, -0.5, 4.5, 9.5];
export const LANES = [-10, -6.5, -3];                  // checkout counters (x); lane 2 is lit
export const DOOR = { x0: 6, x1: 9, z: 8 };

// static geometry, merged per material
class Merger {
  constructor() { this.parts = new Map(); }
  add(mat, geo, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
    geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1)));
    if (geo.index === null) geo = geo; // all our generators are indexed
    (this.parts.get(mat) || this.parts.set(mat, []).get(mat)).push(geo);
    return geo;
  }
  box(mat, w, h, d, x, y, z, ry = 0) { return this.add(mat, new THREE.BoxGeometry(w, h, d), x, y, z, ry); }
  cyl(mat, r0, r1, h, x, y, z, seg = 12, rx = 0, rz = 0) { return this.add(mat, new THREE.CylinderGeometry(r0, r1, h, seg), x, y, z, 0, rx, rz); }
  build(parent, { cast = false, receive = true } = {}) {
    const out = [];
    for (const [mat, gs] of this.parts) {
      const g = mergeGeometries(gs.map((x) => (x.attributes.uv ? x : (x.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)), x))), false);
      const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = receive; parent.add(m); out.push(m);
      gs.forEach((x) => x.dispose());
    }
    this.parts.clear();
    return out;
  }
}

// products: boxes, cans and bottles as instances with a label cell each
function productMaterial(atlas, top) {
  const m = Std({ map: atlas.tex, roughness: 0.5, metalness: 0.0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aCell; varying vec2 vCellUv; varying vec2 vCell0; varying float vTop;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        float col = mod(aCell, ${atlas.cols.toFixed(1)}), row = floor(aCell / ${atlas.cols.toFixed(1)});
        vCell0 = vec2(col / ${atlas.cols.toFixed(1)}, (${(atlas.rows - 1).toFixed(1)} - row) / ${atlas.rows.toFixed(1)});
        vCellUv = vCell0 + vec2(uv.x / ${atlas.cols.toFixed(1)}, uv.y / ${atlas.rows.toFixed(1)});
        vTop = abs(normal.y);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vCellUv; varying vec2 vCell0; varying float vTop;')
      .replace('#include <map_fragment>', `
        vec4 sampledDiffuseColor = texture2D(map, vCellUv);
        if (vTop > 0.5) sampledDiffuseColor = ${top === 'metal' ? 'vec4(0.62, 0.63, 0.64, 1.0)' : top === 'cap' ? 'texture2D(map, vCell0 + vec2(0.06, 0.2) / vec2(' + atlas.cols.toFixed(1) + ', ' + atlas.rows.toFixed(1) + '))' : 'texture2D(map, vCell0 + vec2(0.5, 0.93) / vec2(' + atlas.cols.toFixed(1) + ', ' + atlas.rows.toFixed(1) + '))'};
        diffuseColor *= sampledDiffuseColor;`);
  };
  return m;
}
class Stock {
  constructor(atlas) {
    this.atlas = atlas;
    this.lists = { box: [], can: [], bottle: [] };
  }
  // one product: kind, position (base centre), size (w, h, d or r), yaw, cell, tint
  put(kind, x, y, z, w, h, d, ry, cell, tint = 1) { this.lists[kind].push({ x, y, z, w, h, d, ry, cell, tint }); }
  build(parent) {
    const geos = { box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), can: new THREE.CylinderGeometry(0.5, 0.5, 1, 14).translate(0, 0.5, 0), bottle: bottleGeometry() };
    const tops = { box: 'label', can: 'metal', bottle: 'cap' };
    const out = {};
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    for (const kind of Object.keys(this.lists)) {
      const L = this.lists[kind]; if (!L.length) continue;
      const g = geos[kind];
      const cells = new Float32Array(L.length);
      L.forEach((p, i) => { cells[i] = p.cell; });
      g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
      const mesh = new THREE.InstancedMesh(g, productMaterial(this.atlas, tops[kind]), L.length);
      L.forEach((p, i) => {
        q.setFromAxisAngle(up, p.ry);
        if (kind === 'box') s.set(p.w, p.h, p.d); else s.set(p.w * 2, p.h, p.w * 2);
        m4.compose(v.set(p.x, p.y, p.z), q, s); mesh.setMatrixAt(i, m4);
        col.setScalar(p.tint); mesh.setColorAt(i, col);
      });
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.receiveShadow = true; mesh.castShadow = false;
      mesh.frustumCulled = false;
      parent.add(mesh); out[kind] = mesh;
    }
    return out;
  }
}
function bottleGeometry() {
  const pts = [[0, 0], [0.5, 0], [0.5, 0.62], [0.42, 0.72], [0.2, 0.82], [0.18, 1.0], [0, 1.0]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 12);
}

// a shopping cart: wire basket, red handle, casters. Returns a Group (origin on the floor, basket toward +z)
export function makeCart(mats) {
  const g = new THREE.Group();
  const M = new Merger();
  const L = 0.9, W = 0.56, H = 0.42, y0 = 0.52;  // basket
  // rims and frame
  for (const y of [y0, y0 + H]) { M.box(mats.chrome, W, 0.025, 0.025, 0, y, -L / 2); M.box(mats.chrome, W, 0.025, 0.025, 0, y, L / 2); M.box(mats.chrome, 0.025, 0.025, L, -W / 2, y, 0); M.box(mats.chrome, 0.025, 0.025, L, W / 2, y, 0); }
  for (const x of [-W / 2, W / 2]) for (const z of [-L / 2, L / 2]) M.box(mats.chrome, 0.025, H, 0.025, x, y0 + H / 2, z);
  // the base frame and legs
  M.box(mats.chrome, 0.03, 0.03, L + 0.1, -W / 2 + 0.04, 0.14, 0.02); M.box(mats.chrome, 0.03, 0.03, L + 0.1, W / 2 - 0.04, 0.14, 0.02);
  for (const x of [-W / 2 + 0.04, W / 2 - 0.04]) { M.box(mats.chrome, 0.03, y0 - 0.14, 0.03, x, (y0 + 0.14) / 2, -L / 2 + 0.02); M.box(mats.chrome, 0.03, y0 + 0.2, 0.03, x, (y0 + 0.2) / 2 + 0.07, L / 2 + 0.06); }
  // lower rack
  M.box(mats.wire, W - 0.1, 0.01, L - 0.1, 0, 0.16, 0.02);
  // handle (the back is +z)
  M.box(mats.chrome, 0.025, 0.2, 0.025, -W / 2, y0 + H + 0.08, L / 2 + 0.06); M.box(mats.chrome, 0.025, 0.2, 0.025, W / 2, y0 + H + 0.08, L / 2 + 0.06);
  M.cyl(mats.handle, 0.022, 0.022, W + 0.04, 0, y0 + H + 0.18, L / 2 + 0.08, 10, 0, Math.PI / 2);
  // casters
  for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) for (const z of [-L / 2 + 0.05, L / 2 + 0.02]) { M.cyl(mats.rubber, 0.05, 0.05, 0.03, x, 0.05, z, 12, 0, Math.PI / 2); M.box(mats.chrome, 0.02, 0.06, 0.02, x, 0.1, z); }
  M.build(g, { cast: true });
  // the wire walls (alpha tested), one mesh
  const walls = [];
  const wall = (w, h, x, y, z, ry) => { const p = new THREE.PlaneGeometry(w, h); p.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1))); walls.push(p); };
  wall(W, H, 0, y0 + H / 2, -L / 2, 0); wall(W, H, 0, y0 + H / 2, L / 2, 0); wall(L, H, -W / 2, y0 + H / 2, 0, Math.PI / 2); wall(L, H, W / 2, y0 + H / 2, 0, Math.PI / 2);
  const fl = new THREE.PlaneGeometry(W, L); fl.rotateX(-Math.PI / 2); fl.translate(0, y0 + 0.01, 0); walls.push(fl);
  const wm = new THREE.Mesh(mergeGeometries(walls), mats.wire); wm.castShadow = true; g.add(wm);
  g.userData = { basketY: y0 + 0.02, L, W };
  return g;
}

export function buildStore(scene) {
  RectAreaLightUniformsLib.init();
  const root = new THREE.Group(); root.name = 'store'; scene.add(root);
  const R = P.rng(2026);
  const floorT = P.floorTextures(), asphalt = P.asphaltTexture(), atlas = P.labelAtlas(), wireT = P.wireTexture(), blobT = P.blobTexture(), aoT = P.aoTexture(), tags = P.tagStrip();
  floorT.map.repeat.set(30 / 7.2, 18 / 7.2); floorT.rough.repeat.copy(floorT.map.repeat);
  asphalt.repeat.set(64 / 12, 24 / 12);
  const wire2 = wireT.clone(); wire2.repeat.set(4, 3); wire2.needsUpdate = true;
  const mats = {
    floor: Std({ map: floorT.map, roughnessMap: floorT.rough, roughness: 0.62, metalness: 0 }),
    ceiling: Std({ color: 0x6f716c, roughness: 0.95 }),
    wallUp: Std({ color: 0xd2d6ca, roughness: 0.85 }), wallLow: Std({ color: 0x4d5d57, roughness: 0.7 }),
    shelf: Std({ color: 0xe6e6e0, roughness: 0.42, metalness: 0.15 }), kick: Std({ color: 0x2f3336, roughness: 0.6 }),
    peg: Std({ color: 0xd8d6cc, roughness: 0.8 }), tags: Std({ map: tags, roughness: 0.5 }),
    counter: Std({ color: 0xbdb3a2, roughness: 0.45 }), counterDark: Std({ color: 0x26292c, roughness: 0.45 }),
    chrome: Std({ color: 0xc8ccd0, roughness: 0.28, metalness: 0.85 }), steel: Std({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.7 }),
    handle: Std({ color: 0xc42a22, roughness: 0.45 }), rubber: Std({ color: 0x141414, roughness: 0.8 }),
    wire: Std({ color: 0xd0d4d8, roughness: 0.3, metalness: 0.8, alphaMap: wireT, alphaTest: 0.5, side: THREE.DoubleSide }),
    glass: Std({ color: 0x8fb0bc, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.12 }),
    frost: Std({ color: 0xcfe4f2, roughness: 0.15, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    asphalt: Std({ map: asphalt, roughness: 0.82 }), sidewalk: Std({ color: 0x75746d, roughness: 0.92 }), curb: Std({ color: 0x96948b, roughness: 0.85 }),
    paint: Std({ color: 0xd8cfa6, roughness: 0.7 }), paintY: Std({ color: 0xd9b23a, roughness: 0.7 }),
    facade: Std({ color: 0x2c3035, roughness: 0.7, transparent: true }), facadeSteel: Std({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.7, transparent: true }), brick: Std({ color: 0x6a3a2d, roughness: 0.88 }),
    pole: Std({ color: 0x3d4042, roughness: 0.5, metalness: 0.5 }), housing: Std({ color: 0xe4e6e2, roughness: 0.5, metalness: 0.3 }),
    wood: Std({ color: 0x6b4a2f, roughness: 0.7 }), card: Std({ color: 0xa8814f, roughness: 0.9 }), velvet: Std({ color: 0x3a0f1e, roughness: 0.95 }),
    dark: Std({ color: 0x111214, roughness: 0.6 }), screenOff: Std({ color: 0x05070a, roughness: 0.2 }),
    lilac: Std({ color: 0xb79ad6, roughness: 0.9 }), orange: Std({ color: 0xe06a16, roughness: 0.6 }),
    coolerIn: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.85, 2.1) }),
    dairyIn: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.75, 1.8) }),
    redGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.25, 0.2) }),
    sodium: new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3.0, 0.9) }),
    blob: new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: blobT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    ao: new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: aoT, transparent: true, depthWrite: false, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -1 }),
  };
  const M = new Merger(), MC = new Merger();   // MC: things that cast shadows (for the warm spot)
  const stock = new Stock(atlas);
  const colliders = [];  // {minX, maxX, minZ, maxZ, tag}
  const aabb = (x0, x1, z0, z1, tag = '') => { const c = { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), tag, on: true }; colliders.push(c); return c; };
  const ao = (x, z, w, d, k = 0.9) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats.ao); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, z); m.material = k === 0.9 ? mats.ao : mats.ao.clone(); m.material.opacity = k; m.renderOrder = 1; root.add(m); return m; };

  // ---------- floor, ceiling, walls ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), mats.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -1); floor.receiveShadow = true; root.add(floor);
  const ceil = { min: new THREE.Vector2(-15.5, -10.5), size: new THREE.Vector2(31, 19), c: document.createElement('canvas') };
  ceil.c.width = 768; ceil.c.height = 470; ceil.g = ceil.c.getContext('2d');
  ceil.tex = new THREE.CanvasTexture(ceil.c); ceil.tex.colorSpace = THREE.SRGBColorSpace; ceil.tex.generateMipmaps = true; ceil.tex.minFilter = THREE.LinearMipmapLinearFilter;
  const CU = { uCeil: { value: ceil.tex }, uCeilMin: { value: ceil.min }, uCeilSize: { value: ceil.size }, uCeilK: { value: 8.0 } };
  mats.floor.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, CU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMpW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvMpW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vMpW; uniform sampler2D uCeil; uniform vec2 uCeilMin, uCeilSize; uniform float uCeilK;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec3 mpV = normalize(vMpW - cameraPosition);
        vec3 mpR = reflect(mpV, vec3(0.0, 1.0, 0.0));
        vec2 mpH = vMpW.xz + mpR.xz * ((3.42 - vMpW.y) / max(mpR.y, 0.05));
        vec2 mpUv = (mpH - uCeilMin) / uCeilSize;
        float mpIn = step(0.0, mpUv.x) * step(mpUv.x, 1.0) * step(0.0, mpUv.y) * step(mpUv.y, 1.0);
        vec3 mpE = textureLod(uCeil, vec2(mpUv.x, 1.0 - mpUv.y), clamp(roughnessFactor * 8.0, 0.0, 5.0)).rgb;
        float mpF = 0.06 + 0.94 * pow(1.0 - clamp(-mpV.y, 0.0, 1.0), 5.0);
        totalEmissiveRadiance += mpE * uCeilK * mpF * mpIn * clamp(1.15 - roughnessFactor * 1.6, 0.0, 1.0);
      }`);
  };
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), mats.ceiling); ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 4.5, -1); root.add(ceiling);
  // back
  M.box(mats.wallLow, 30.6, 1.2, 0.3, 0, 0.6, -10.15); M.box(mats.wallUp, 30.6, 3.4, 0.3, 0, 2.9, -10.15); M.box(mats.dark, 30.62, 0.06, 0.32, 0, 4.63, -10.15);
  for (const s of [-1, 1]) { M.box(mats.wallLow, 0.3, 1.2, 18.3, s * 15.15, 0.6, -1.15); M.box(mats.wallUp, 0.3, 3.4, 18.3, s * 15.15, 2.9, -1.15); M.box(mats.dark, 0.32, 0.06, 18.32, s * 15.15, 4.63, -1.15); }
  aabb(-15.6, 15.6, -10.6, -10); aabb(-15.6, -15, -10.6, 8.3); aabb(15, 15.6, -10.6, 8.3);
  // the front: brick bulkhead, glass, mullions, doors' frame (the fascia and parapet are the facade below)
  const facade = new THREE.Group(); root.add(facade);
  const FM = new Merger();
  const frontGlass = [];
  for (const [a, b] of [[-15.3, DOOR.x0], [DOOR.x1, 15.3]]) {
    M.box(mats.brick, b - a, 0.55, 0.3, (a + b) / 2, 0.275, 8.15);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 2.75), mats.glass.clone()); gl.position.set((a + b) / 2, 1.925, 8.05); gl.renderOrder = 6; facade.add(gl); frontGlass.push(gl.material);
    for (let x = a; x <= b + 0.01; x += (b - a) / Math.max(1, Math.round((b - a) / 2.4))) FM.box(mats.facadeSteel, 0.08, 2.75, 0.1, x, 1.925, 8.05);
    FM.box(mats.facadeSteel, b - a, 0.1, 0.12, (a + b) / 2, 3.3, 8.05); M.box(mats.steel, b - a, 0.06, 0.12, (a + b) / 2, 0.58, 8.05);
    aabb(a, b, 7.85, 8.35, 'front');
  }
  FM.box(mats.facadeSteel, DOOR.x1 - DOOR.x0 + 0.2, 0.32, 0.16, (DOOR.x0 + DOOR.x1) / 2, 3.12, 8.05);
  for (const x of [DOOR.x0, DOOR.x1]) FM.box(mats.facadeSteel, 0.12, 2.98, 0.16, x, 1.49, 8.05);
  // the doors (two sliding panels)
  const doorL = new THREE.Group(), doorR = new THREE.Group();
  for (const [d, sx] of [[doorL, -1], [doorR, 1]]) {
    const DM = new Merger(); const w = 1.52, h = 2.94;
    DM.box(mats.steel, w, 0.08, 0.06, 0, h - 0.04, 0); DM.box(mats.steel, w, 0.12, 0.06, 0, 0.06, 0); DM.box(mats.steel, 0.07, h, 0.06, -w / 2 + 0.035, h / 2, 0); DM.box(mats.steel, 0.07, h, 0.06, w / 2 - 0.035, h / 2, 0);
    DM.box(mats.steel, w, 0.05, 0.065, 0, 1.0, 0);
    DM.build(d, { cast: true });
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, h - 0.18), mats.glass); gl.position.set(0, h / 2, 0); gl.renderOrder = 6; d.add(gl);
    d.position.set((DOOR.x0 + DOOR.x1) / 2 + sx * 0.75, 0, 8.02); d.userData.home = d.position.x; d.userData.open = d.position.x + sx * 1.42;
    root.add(d);
  }
  const hours = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), new THREE.MeshBasicMaterial({ map: P.vinyl(['OPEN 24 HOURS'], { w: 1024, h: 256, size: 70 }), transparent: true, depthWrite: false, color: new THREE.Color(0.8, 0.8, 0.8) }));
  hours.position.set(0.05, 1.55, 0.04); doorR.add(hours);
  const doorCol = aabb(DOOR.x0, DOOR.x1, 7.9, 8.3, 'door');

  // ---------- facade (cut away while you're inside) ----------
  FM.box(mats.facade, 30.6, 1.3, 0.42, 0, 3.95, 8.21); FM.box(mats.facade, 30.6, 1.15, 0.3, 0, 5.17, 8.15);
  FM.box(mats.facade, 30.8, 0.08, 0.5, 0, 5.78, 8.15);
  FM.build(facade);
  const letters = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.4), new THREE.MeshBasicMaterial({ map: P.channelLetters('GROCERY'), transparent: true, depthWrite: false, color: new THREE.Color(2.6, 2.6, 2.6) }));
  letters.position.set(6.5, 5.15, 8.32); facade.add(letters);
  const board = new P.LetterBoard(18, 2);
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.12), new THREE.MeshBasicMaterial({ map: board.tex, transparent: true, color: new THREE.Color(1.5, 1.5, 1.5) }));
  boardMesh.position.set(-2.2, 3.95, 8.44); facade.add(boardMesh);
  // a wall-pack over the doors
  const wp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), mats.dark); wp.position.set(7.5, 3.55, 8.55); facade.add(wp);
  const wpGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2), mats.sodium); wpGlow.rotation.x = Math.PI / 2; wpGlow.position.set(7.5, 3.42, 8.56); facade.add(wpGlow);
  const facadeMats = [mats.facade, mats.facadeSteel, letters.material, boardMesh.material, wp.material, wpGlow.material, ...frontGlass];

  // ---------- gondolas ----------
  const LEVELS = [0.14, 0.56, 0.98, 1.4, 1.8];
  const anyCell = () => 3 + Math.floor(R() * (atlas.cols * atlas.rows - 3));
  // fill a shelf run: from (x,z) along (ux,uz) for len, products facing (nx,nz), on shelf height y, max height hmax
  const run = (x, z, ux, uz, len, nx, nz, y, hmax, opts = {}) => {
    let s = 0.04;
    const ry = Math.atan2(nx, nz);
    while (s < len - 0.08) {
      const kind = opts.kind || (R() < 0.45 ? 'box' : R() < 0.7 ? 'can' : 'bottle');
      const cell = opts.cell ?? anyCell();
      const count = 3 + Math.floor(R() * 9);
      const empty = R() < (opts.empty ?? 0.07);
      let w, h, d;
      if (kind === 'box') { w = 0.12 + R() * 0.16; h = Math.min(hmax, 0.16 + R() * 0.2); d = 0.06 + R() * 0.06; }
      else if (kind === 'can') { w = 0.034 + R() * 0.016; h = Math.min(hmax, 0.1 + R() * 0.04); d = w * 2; }
      else { w = 0.035 + R() * 0.02; h = Math.min(hmax, 0.18 + R() * 0.12); d = w * 2; }
      const step = (kind === 'box' ? w : w * 2) + 0.012;
      const tint = 0.86 + R() * 0.18;
      if (s > len - step) break;            // the next facing doesn't fit: the shelf is full
      for (let i = 0; i < count && s < len - step; i++, s += step) {
        if (empty && R() < 0.85) continue;
        const px = x + ux * (s + step / 2), pz = z + uz * (s + step / 2);
        const rows = kind === 'box' ? 2 : 3;
        for (let r = 0; r < rows; r++) {
          const back = 0.04 + r * (kind === 'box' ? d + 0.02 : w * 2 + 0.01) + (R() < 0.3 ? R() * 0.04 : 0);
          if (back > 0.46) break;
          stock.put(kind, px + nx * (0.5 - back) * (opts.depth || 1), y, pz + nz * (0.5 - back) * (opts.depth || 1), w, h, d, ry + (R() - 0.5) * 0.12, cell, tint);
          if (kind === 'can' && h * 2 + 0.02 < hmax && R() < 0.35) stock.put(kind, px + nx * (0.5 - back), y + h + 0.004, pz + nz * (0.5 - back), w, h, d, ry, cell, tint);
        }
      }
      s += 0.015 + R() * 0.03;               // a little gap between one product and the next
    }
  };
  GONDOLAS.forEach((gx, gi) => {
    const z0 = -6.4, z1 = -0.6, zc = (z0 + z1) / 2, L = z1 - z0;
    MC.box(mats.kick, 1.2, 0.14, L, gx, 0.07, zc); MC.box(mats.peg, 0.05, 1.8, L, gx, 1.04, zc); MC.box(mats.steel, 0.1, 0.05, L + 1.2, gx, 1.97, zc - 0.0);
    for (const s of [-1, 1]) for (const y of LEVELS) {
      if (y > 0.15) M.box(mats.shelf, 0.48, 0.025, L, gx + s * 0.31, y, zc);
      M.box(mats.tags, 0.012, 0.045, L, gx + s * 0.555, y - 0.01, zc);
      const corn = gi === 1 && s === 1;     // aisle three's left side: the canned corn
      if (corn) {
        run(gx + s * 0.06, z0, 0, 1, 2.2, s, 0, y + 0.0125, 0.38, { kind: undefined });
        run(gx + s * 0.06, z0 + 2.2, 0, 1, 2.0, s, 0, y + 0.0125, 0.38, { kind: 'can', cell: P.CELLS.corn, empty: 0.02 });
        run(gx + s * 0.06, z0 + 4.2, 0, 1, L - 4.2, s, 0, y + 0.0125, 0.38);
      } else run(gx + s * 0.06, z0, 0, 1, L, s, 0, y + 0.0125, y > 1.7 ? 0.3 : 0.38);
    }
    // endcaps (front faces +z, back faces -z)
    for (const [ez, nz] of [[-0.3, 1], [-6.7, -1]]) {
      MC.box(mats.kick, 1.2, 0.14, 0.6, gx, 0.07, ez); MC.box(mats.peg, 1.2, 1.8, 0.05, gx, 1.04, ez - nz * 0.27);
      for (const y of LEVELS) { if (y > 0.15) M.box(mats.shelf, 1.2, 0.025, 0.5, gx, y, ez + nz * 0.02); M.box(mats.tags, 1.2, 0.045, 0.012, gx, y - 0.01, ez + nz * 0.275); }
      const cereal = gi === 2 && nz === 1;
      for (const y of LEVELS) run(gx - 0.58 * nz, ez - nz * 0.25 + nz * 0.04, nz, 0, 1.16, 0, nz, y + 0.0125, 0.38, cereal ? { kind: 'box', cell: P.CELLS.cereal, empty: 0 } : { kind: 'box', depth: 0.9 });
    }
    aabb(gx - 0.6, gx + 0.6, -7.0, 0.0, 'gondola');
    ao(gx, -3.5, 2.0, 7.8);
  });

  // ---------- the freezer wall (aisle one) ----------
  {
    const x0 = -15, x1 = -14.1, z0 = -7.0, z1 = 0.0, n = 9, dw = (z1 - z0) / n;
    MC.box(mats.wallLow, 0.9, 0.18, z1 - z0, (x0 + x1) / 2, 0.09, (z0 + z1) / 2);
    M.box(mats.housing, 0.95, 0.3, z1 - z0, (x0 + x1) / 2 + 0.02, 2.38, (z0 + z1) / 2);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 2.0), mats.coolerIn); inner.rotation.y = Math.PI / 2; inner.position.set(-14.92, 1.2, (z0 + z1) / 2); root.add(inner);
    for (let i = 0; i < n; i++) {
      const zc = z0 + dw * (i + 0.5);
      M.box(mats.steel, 0.06, 2.06, 0.05, x1, 1.21, z0 + dw * i); M.box(mats.chrome, 0.04, 0.9, 0.03, x1 + 0.04, 1.25, zc + dw * 0.36);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(dw - 0.06, 2.0), mats.frost); gl.rotation.y = Math.PI / 2; gl.position.set(x1 + 0.01, 1.2, zc); gl.renderOrder = 6; root.add(gl);
      for (const y of [0.32, 0.76, 1.2, 1.64]) {
        M.box(mats.steel, 0.7, 0.02, dw - 0.06, -14.55, y, zc);
        for (let k = 0; k < 4; k++) stock.put('box', -14.42 - (k % 2) * 0.22, y + 0.01, zc - dw * 0.34 + (k >> 1) * dw * 0.34 + R() * 0.04, 0.24, 0.05 + R() * 0.02, 0.2, Math.PI / 2 + (R() - 0.5) * 0.2, R() < 0.5 ? P.CELLS.frozen0 : anyCell(), 0.9);
        for (let k = 0; k < 5; k++) stock.put('box', -14.4 - R() * 0.3, y + 0.07 + R() * 0.02, zc - dw * 0.4 + k * dw * 0.2, 0.22, 0.04, 0.17, Math.PI / 2 + (R() - 0.5) * 0.4, R() < 0.6 ? P.CELLS.frozen0 : anyCell(), 0.9);
      }
    }
    M.box(mats.steel, 0.06, 2.06, 0.05, x1, 1.21, z1);
    aabb(x0, x1 + 0.08, z0, z1, 'freezer');
    ao(-14.4, (z0 + z1) / 2, 1.8, 7.6, 0.6);
  }
  // ---------- dairy along the back wall ----------
  {
    const x0 = -14.0, x1 = 10.0, zb = -10.0, zf = -9.15, xc = (x0 + x1) / 2, w = x1 - x0;
    MC.box(mats.wallLow, w, 0.5, 0.85, xc, 0.25, (zb + zf) / 2);
    M.box(mats.housing, w, 0.32, 0.95, xc, 2.15, (zb + zf) / 2 + 0.05);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.5), mats.dairyIn); inner.position.set(xc, 1.25, -9.97); root.add(inner);
    for (const y of [0.9, 1.3, 1.7]) {
      M.box(mats.steel, w, 0.02, 0.62, xc, y, -9.55);
      for (let x = x0 + 0.1; x < x1 - 0.1; x += 0.13) {
        if (R() < 0.12) continue;
        const milk = R() < 0.6;
        stock.put(milk ? 'box' : 'can', x, y + 0.01, -9.42 + (R() - 0.5) * 0.04, milk ? 0.11 : 0.04, milk ? 0.24 : 0.08, 0.11, 0, milk ? 3 + (Math.floor(x * 3) % 3) : anyCell(), 1.0);
        stock.put(milk ? 'box' : 'can', x, y + 0.01, -9.62, milk ? 0.11 : 0.04, milk ? 0.24 : 0.08, 0.11, 0, milk ? 3 + (Math.floor(x * 3) % 3) : anyCell(), 0.95);
      }
    }
    for (let x = x0 + 0.1; x < x1 - 0.1; x += 0.11) stock.put('box', x, 0.51, -9.4, 0.1, 0.16, 0.1, 0, anyCell(), 0.95);
    aabb(x0, x1, -10, zf, 'dairy');
    ao(xc, -9.4, w + 0.6, 1.4, 0.6);
  }
  // ---------- produce ----------
  const produce = [];
  {
    const tables = [[12.8, -5.6], [12.8, -2.9], [12.8, -0.2]];
    const fruit = [[0xc0231b, 0.045], [0x7cb342, 0.045], [0xf08a12, 0.05], [0xf2d335, 0.04], [0x5d8c2a, 0.035], [0x8a5a34, 0.05], [0xd9c79e, 0.045], [0x6a1b3a, 0.04]];
    for (const [tx, tz] of tables) {
      MC.box(mats.wood, 1.6, 0.7, 2.0, tx, 0.35, tz);
      for (let k = 0; k < 4; k++) {
        const [c, r] = fruit[Math.floor(R() * fruit.length)];
        const sx = tx - 0.4 + (k % 2) * 0.8, sz = tz - 0.5 + (k >> 1) * 1.0;
        for (let i = 0; i < 70; i++) { const u = R() - 0.5, v = R() - 0.5; produce.push({ x: sx + u * 0.72, y: 0.72 + r + (1 - Math.max(Math.abs(u), Math.abs(v)) * 2) * 0.12 + R() * 0.03, z: sz + v * 0.9, r: r * (0.85 + R() * 0.3), c }); }
      }
      aabb(tx - 0.82, tx + 0.82, tz - 1.02, tz + 1.02, 'produce');
      ao(tx, tz, 2.2, 2.6, 0.7);
    }
    // the misted wall rack of greens
    MC.box(mats.wood, 0.7, 0.9, 8, 14.6, 0.45, -3.2); M.box(mats.housing, 0.8, 0.2, 8, 14.6, 2.3, -3.2);
    for (let i = 0; i < 160; i++) produce.push({ x: 14.4 + R() * 0.4, y: 0.95 + R() * 0.08, z: -7 + R() * 7.6, r: 0.07 + R() * 0.03, c: R() < 0.6 ? 0x3f8f2f : 0x9ccc4a });
    aabb(14.2, 15, -7.2, 0.8, 'greens');
  }
  // ---------- checkouts ----------
  const belts = [];
  LANES.forEach((lx, li) => {
    const z0 = 2.4, z1 = 5.6;
    MC.box(mats.counter, 0.8, 0.84, z1 - z0, lx, 0.44, (z0 + z1) / 2); M.box(mats.kick, 0.82, 0.1, z1 - z0 + 0.02, lx, 0.05, (z0 + z1) / 2);
    M.box(mats.steel, 0.82, 0.03, z1 - z0, lx, 0.865, (z0 + z1) / 2);
    const beltT = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#1b1c1e'; g.fillRect(0, 0, 64, 256); g.fillStyle = '#2a2b2e'; for (let y = 0; y < 256; y += 16) g.fillRect(0, y, 64, 3); return c; })());
    beltT.wrapS = beltT.wrapT = THREE.RepeatWrapping; beltT.repeat.set(1, 6); beltT.colorSpace = THREE.SRGBColorSpace;
    const belt = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.9), Std({ map: beltT, roughness: 0.7 })); belt.rotation.x = -Math.PI / 2; belt.position.set(lx, 0.885, z0 + 1.05); root.add(belt);
    belts.push({ mesh: belt, tex: beltT, x: lx, z0: z0 + 0.1, z1: z0 + 2.0 });
    // scanner, register, the lane light
    M.box(mats.dark, 0.44, 0.012, 0.34, lx, 0.884, 4.3);
    const scan = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.004, 0.02), li === 1 ? mats.redGlow : mats.dark); scan.position.set(lx, 0.892, 4.3); root.add(scan);
    MC.box(mats.dark, 0.06, 0.5, 0.06, lx - 0.32, 1.12, 4.55); MC.box(mats.dark, 0.34, 0.26, 0.05, lx - 0.34, 1.45, 4.55);
    MC.cyl(mats.steel, 0.03, 0.03, 2.4, lx - 0.34, 1.2, z0 + 0.1, 8);
    root.userData['lane' + li] = { x: lx - 0.34, y: 2.5, z: z0 + 0.1 };
    // bagging rack
    M.box(mats.chrome, 0.02, 0.5, 0.02, lx - 0.25, 1.1, 5.45); M.box(mats.chrome, 0.02, 0.5, 0.02, lx + 0.25, 1.1, 5.45); M.box(mats.chrome, 0.52, 0.02, 0.02, lx, 1.35, 5.45);
    aabb(lx - 0.42, lx + 0.42, z0, z1, 'counter');
    aabb(lx - 0.95, lx - 0.42, 3.9, 5.0, 'register');
    ao(lx, (z0 + z1) / 2, 1.3, 3.8, 0.75);
  });
  // lane number boxes
  const laneBoxes = LANES.map((lx, li) => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#0d4a47'; g.font = "900 96px 'Archivo Black', sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(li + 1), 64, 70);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.12), new THREE.MeshBasicMaterial({ map: t, color: li === 1 ? new THREE.Color(2.2, 2.2, 2.2) : new THREE.Color(0.25, 0.25, 0.25) }));
    m.position.set(lx - 0.34, 2.55, 2.5); root.add(m); return m;
  });
  // ---------- customer service and its monitors ----------
  {
    MC.box(mats.counter, 0.7, 1.05, 3.6, -12.95, 0.525, 5.4); MC.box(mats.counter, 2.3, 1.05, 0.7, -14.05, 0.525, 3.95);
    M.box(mats.dark, 0.74, 0.04, 3.62, -12.95, 1.07, 5.4); M.box(mats.dark, 2.32, 0.04, 0.72, -14.05, 1.07, 3.95);
    aabb(-13.3, -12.6, 3.6, 7.2, 'desk'); aabb(-15, -12.6, 3.6, 4.3, 'desk');
    ao(-13.6, 5.0, 3.6, 4.6, 0.6);
    // the jewellery case on the counter
    MC.box(mats.velvet, 0.5, 0.06, 0.9, -12.95, 1.12, 6.2);
    const gc = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.96), mats.glass); gc.position.set(-12.95, 1.24, 6.2); gc.renderOrder = 6; root.add(gc);
  }
  const monitors = [];
  {
    const bank = new THREE.Group(); bank.position.set(-14.05, 1.1, 3.95); root.add(bank);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 0.3), mats.dark); frame.position.set(0, 0.62, -0.1); frame.castShadow = true; bank.add(frame);
    for (let i = 0; i < 4; i++) {
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.46), mats.screenOff); scr.position.set(-0.35 + (i % 2) * 0.7, 0.88 - (i >> 1) * 0.5, 0.055); bank.add(scr); monitors.push(scr);
    }
    bank.rotation.x = -0.18;
  }
  // ---------- seasonal clearance, the bargain bin, the key hook ----------
  {
    // a rolling rack by the doors with Halloween leftovers and a lilac housecoat
    MC.box(mats.chrome, 1.8, 0.03, 0.03, 12.5, 1.7, 3.2); for (const x of [11.6, 13.4]) { MC.box(mats.chrome, 0.03, 1.7, 0.03, x, 0.85, 3.2); MC.box(mats.chrome, 0.03, 0.03, 0.6, x, 0.05, 3.2); }
    aabb(11.5, 13.5, 2.9, 3.5, 'rack');
    // a clearance table of costume packages
    MC.box(mats.orange, 1.6, 0.7, 0.9, 12.5, 0.35, 5.0); aabb(11.7, 13.3, 4.55, 5.45, 'table');
    for (let i = 0; i < 10; i++) stock.put('box', 11.85 + (i % 5) * 0.32, 0.71 + (i > 4 ? 0.05 : 0), 4.75 + (i > 4 ? 0.42 : 0), 0.26, 0.05, 0.36, (R() - 0.5) * 0.4, anyCell(), 0.8);
    ao(12.5, 4.2, 2.6, 3.0, 0.5);
    // the bargain bin
    MC.add(mats.wire, new THREE.CylinderGeometry(0.55, 0.55, 0.7, 20, 1, true), 1.3, 0.35, 3.6); M.add(mats.chrome, new THREE.TorusGeometry(0.55, 0.018, 6, 28), 1.3, 0.7, 3.6, 0, Math.PI / 2); M.cyl(mats.kick, 0.54, 0.54, 0.02, 1.3, 0.3, 3.6, 20);
    for (let i = 0; i < 40; i++) { const a = R() * 6.28, r = Math.sqrt(R()) * 0.45; stock.put(R() < 0.5 ? 'box' : 'can', 1.3 + Math.cos(a) * r, 0.42 + R() * 0.2, 3.6 + Math.sin(a) * r, 0.1 + R() * 0.1, 0.08 + R() * 0.08, 0.08, R() * 6, anyCell(), 0.85); }
    aabb(0.75, 1.85, 3.05, 4.15, 'bin');
    // the lost and found: a shallow tray on the service counter
    MC.box(mats.kick, 0.46, 0.04, 0.62, -12.95, 1.11, 4.75); M.box(mats.velvet, 0.42, 0.012, 0.58, -12.95, 1.135, 4.75);
  }
  // ---------- the lot ----------
  {
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(64, 24), mats.asphalt); lot.rotation.x = -Math.PI / 2; lot.position.set(0, -0.005, 20); lot.receiveShadow = true; root.add(lot);
    M.box(mats.sidewalk, 32, 0.14, 2.6, 0, 0.07, 9.3); M.box(mats.curb, 32, 0.15, 0.16, 0, 0.075, 10.62);
    for (const zr of [[13.4, 18.2], [21.4, 26.2]]) for (let x = -16; x <= 22; x += 2.8) M.box(mats.paint, 0.1, 0.006, zr[1] - zr[0], x, 0.003, (zr[0] + zr[1]) / 2);
    M.box(mats.paintY, 36, 0.006, 0.1, 3, 0.003, 12.1);
    const poles = [[-12, 23.5], [2, 23.5], [16, 23.5]];
    for (const [x, z] of poles) { MC.cyl(mats.pole, 0.1, 0.14, 7.4, x, 3.7, z, 10); M.box(mats.pole, 0.12, 0.12, 1.3, x, 7.35, z - 0.6); M.box(mats.pole, 0.5, 0.22, 0.7, x, 7.32, z - 1.2); aabb(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 'pole'); const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.6), mats.sodium); gl.rotation.x = Math.PI / 2; gl.position.set(x, 7.2, z - 1.2); root.add(gl); }
    // the cart corral
    for (const x of [1.9, 3.1]) { M.cyl(mats.chrome, 0.03, 0.03, 4.4, x, 0.95, 15.4, 8, Math.PI / 2); for (const z of [13.2, 17.6]) MC.cyl(mats.chrome, 0.04, 0.04, 0.95, x, 0.475, z, 8); }
    aabb(1.8, 3.2, 13.1, 17.7, 'corral');
    // the way out
    MC.cyl(mats.pole, 0.05, 0.05, 2.4, -9.5, 1.2, 21.5, 8);
    const ty = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.66), new THREE.MeshStandardMaterial({ map: P.wallSign('THANK YOU FOR PLAYING', { w: 1400, h: 220, bg: '#0d4a47' }), roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.06 }));
    ty.material.emissiveMap = ty.material.map; ty.position.set(-9.5, 2.25, 21.56); root.add(ty);
    aabb(-9.65, -9.35, 21.35, 21.65, 'sign');
  }
  // ---------- signs on the back wall, the aisle signs (the credits) ----------
  const wallSigns = [['FROZEN', -12.5, 4.0], ['DAIRY', -2.0, 6.0], ['PRODUCE', 12.6, 4.4]];
  for (const [t, x, w] of wallSigns) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 220 / 1024), Std({ map: P.wallSign(t), roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.12 })); m.material.emissiveMap = m.material.map; m.position.set(x, 3.55, -9.98); root.add(m); }
  const aisleSigns = [];
  const CREDITS = [
    ['SIDE A', [['Sexy Trauma Costume', 'The Clerk'], ['Your Car Is at the Bottom of the Lake', 'The Problem Solver'], ['Pretty Until Proven Guilty', 'The Defendant'], ['Makeup Sex at Your Funeral', 'The Mourner']]],
    ['SIDE B', [['Kiss Me Like a Car Crash', 'The Wreck'], ['I Fucked Your Dad', 'The Ex'], ['Rent Free', 'The Tenant'], ['Reverse Psychology Degree', 'The Doctor'], ['PTSDream Girl', 'PTSDream Girl']]],
    ['CANNED GOODS · BONUS', [['Try Me Free!', 'The Prize Inside'], ['Grocery Store at 2 AM', ''], ['Back by Popular Demand', 'Encore']]],
    ['MUSIC', [['Doopliss', 'Songs'], ['Back by Popular Demand', ''], ['Thank you for listening', '']]],
    ['A GAME BY ALEX', [['Made with Claude', ''], ['three.js · Blender', ''], ['Quaternius · MakeHuman · Cortu', 'Bodies'], ['Kenney', 'Sounds']]],
  ];
  AISLES.forEach((ax, i) => {
    const [head, lines] = CREDITS[i];
    const t = P.aisleSign(i + 1, head, lines);
    const w = 3.1, h = w * 520 / 1280;
    const mat = Std({ map: t, roughness: 0.55, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.32, transparent: true });
    const sg = new THREE.Group(); sg.position.set(ax, 2.92, 0.35); sg.rotation.x = -0.34; root.add(sg);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); front.position.z = 0.012; sg.add(front);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), Std({ color: 0x0d4a47, roughness: 0.6, transparent: true })); back.rotation.y = Math.PI; back.position.z = -0.012; sg.add(back);
    for (const sx of [-1, 1]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.0, 0.012), mats.steel); ch.position.set(sx * w * 0.4, h / 2 + 0.5, 0); sg.add(ch); }
    aisleSigns.push({ group: sg, mats: [mat, back.material], x: ax, z: 0.35, k: 1 });
  });
  // ---------- light fixtures: strip panels (instanced, each on/off/flickering) ----------
  const panels = [];
  const groups = [];
  const addRow = (x0, z0, x1, z1, seg, group) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / seg)), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    for (let i = 0; i < n; i++) {
      const s = (i + 0.5) * len / n, x = x0 + ux * s, z = z0 + uz * s;
      panels.push({ x, y: 3.38, z, len: len / n - 0.08, alongX: Math.abs(ux) > 0.5, group, base: 1, flick: 0, k: 0, seed: R() * 100 });
    }
  };
  const mkRect = (w, h, x, y, z, look, up, base) => {
    const l = new THREE.RectAreaLight(COOL, 0, w, h); l.position.set(x, y, z); l.up.copy(up); l.lookAt(look); root.add(l);
    const g = { light: l, base, members: [] }; groups.push(g); return groups.length - 1;
  };
  const down = new THREE.Vector3(), upZ = new THREE.Vector3(0, 0, -1), upY = new THREE.Vector3(0, 1, 0);
  AISLES.forEach((ax) => { const gi = mkRect(0.32, 6.6, ax, 3.36, -3.5, down.set(ax, 0, -3.5).clone(), upZ, 14.0); addRow(ax, -6.8, ax, -0.2, 1.32, gi); });
  // the front of the store: short tubes in columns over the aisle mouths, the checkouts and the doors
  for (const zr of [1.8, 5.4]) { const gi = mkRect(26, 1.2, 0, 3.36, zr, new THREE.Vector3(0, 0, zr), upZ, 6.8); for (const x of [-13, -8, -3, 2, 7, 12.6]) addRow(x, zr - 0.7, x, zr + 0.7, 1.4, gi); }
  { const gi = mkRect(26, 0.32, 0, 3.36, -8.1, new THREE.Vector3(0, 0, -8.1), upZ, 11.0); addRow(-13.2, -8.1, 13.2, -8.1, 1.32, gi); }
  { const gi = mkRect(0.32, 7.2, 12.8, 3.36, -3.2, new THREE.Vector3(12.8, 0, -3.2), upZ, 15.0); addRow(12.8, -6.8, 12.8, 0.4, 1.44, gi); }
  const freezerLight = new THREE.RectAreaLight(new THREE.Color(0.8, 0.95, 1.0), 3.2, 7.0, 1.8); freezerLight.position.set(-14.1, 1.2, -3.5); freezerLight.lookAt(-10, 1.2, -3.5); root.add(freezerLight);
  const dairyLight = new THREE.RectAreaLight(new THREE.Color(0.95, 1.0, 1.0), 2.6, 24, 1.2); dairyLight.position.set(-2, 1.25, -9.15); dairyLight.lookAt(-2, 1.25, 0); root.add(dairyLight);
  // panels: some dead, a few that flicker
  panels.forEach((p) => { if (R() < 0.27) p.base = 0; else if (R() < 0.07) p.flick = 1; });
  panels.forEach((p) => groups[p.group].members.push(p));
  const pmesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), panels.length);
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
    panels.forEach((p, i) => { m4.compose(v.set(p.x, p.y + 0.01, p.z), q, p.alongX ? s.set(p.len - 0.1, 0.06, 0.13) : s.set(0.13, 0.06, p.len - 0.1)); pmesh.setMatrixAt(i, m4); pmesh.setColorAt(i, new THREE.Color(0, 0, 0)); });
  }
  pmesh.frustumCulled = false; root.add(pmesh);
  pmesh.layers.set(1);     // the tubes themselves: only cameras at the ceiling see them; from above, you see them in the floor
  // the ceiling's light, as the floor sees it
  ceil.paint = () => {
    const g = ceil.g, W = ceil.c.width, H = ceil.c.height, sx = W / ceil.size.x, sz = H / ceil.size.y;
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    for (const p of panels) {
      if (p.k < 0.01) continue;
      const cx = (p.x - ceil.min.x) * sx, cz = (p.z - ceil.min.y) * sz, l = (p.len - 0.1), w = 0.13;
      const ww = (p.alongX ? l : w) * sx, hh = (p.alongX ? w : l) * sz;
      const v = Math.min(1, p.k * (p.boost || 1));
      g.fillStyle = `rgba(${Math.round(200 * v)},${Math.round(236 * v)},${Math.round(214 * v)},0.22)`; g.fillRect(cx - ww / 2 - 5, cz - hh / 2 - 5, ww + 10, hh + 10);
      g.fillStyle = `rgb(${Math.round(225 * v)},${Math.round(255 * v)},${Math.round(238 * v)})`; g.fillRect(cx - ww / 2, cz - hh / 2, ww, hh);
    }
    ceil.tex.needsUpdate = true;
  };

  // ---------- exterior light ----------
  const sodiumC = new THREE.Color(1.0, 0.56, 0.2);
  const lamps = [[-12, 23.5], [2, 23.5], [16, 23.5]].map(([x, z], i) => {
    const l = new THREE.SpotLight(sodiumC, 900, 0, 1.05, 0.75, 2); l.position.set(x, 7.2, z - 1.2); l.target.position.set(x, 0, z - 1.8); root.add(l, l.target);
    if (i === 1) { l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0004; l.shadow.camera.near = 1; l.shadow.camera.far = 14; }
    return l;
  });
  const entry = new THREE.SpotLight(sodiumC, 160, 0, 0.95, 0.7, 2); entry.position.set(7.5, 3.4, 8.7); entry.target.position.set(7.5, 0, 10.5); root.add(entry, entry.target);
  for (const x of [-7.5, 13.5]) {
    const w = new THREE.SpotLight(sodiumC, 260, 0, 1.05, 0.8, 2); w.position.set(x, 3.6, 8.7); w.target.position.set(x, 0, 13.5); root.add(w, w.target);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), mats.dark); box.position.set(x, 3.55, 8.55); facade.add(box);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2), mats.sodium); gl.rotation.x = Math.PI / 2; gl.position.set(x, 3.42, 8.56); facade.add(gl);
  }
  const spill = new THREE.RectAreaLight(COOL, 1.2, 28, 2.6); spill.position.set(0, 1.9, 8.2); spill.lookAt(0, 1.9, 20); root.add(spill);
  const amb = new THREE.HemisphereLight(0x6f7a8c, 0x1c1916, 0.12); root.add(amb);

  // ---------- build ----------
  M.build(root, { cast: false, receive: true });
  MC.build(root, { cast: true, receive: true });
  const products = stock.build(root);
  {
    const g = new THREE.IcosahedronGeometry(1, 1), mesh = new THREE.InstancedMesh(g, Std({ roughness: 0.45 }), produce.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    produce.forEach((p, i) => { m4.compose(v.set(p.x, p.y, p.z), q, s.set(p.r, p.r * 0.92, p.r)); mesh.setMatrixAt(i, m4); c.setHex(p.c); c.multiplyScalar(0.85 + R() * 0.3); mesh.setColorAt(i, c); });
    mesh.frustumCulled = false; root.add(mesh);
  }

  return {
    root, mats, colliders, doorCol, doors: { L: doorL, R: doorR, k: 0 }, facade, facadeMats, letters, board, boardMesh,
    panels, groups, pmesh, ceil, freezerLight, dairyLight, lamps, entry, spill, amb, aisleSigns, monitors, belts, laneBoxes, atlas, products,
    tex: { blob: mats.blob, wire: wireT },
    bounds: { minX: -14.5, maxX: 14.5, minZ: -10, maxZ: 27 },
  };
}
