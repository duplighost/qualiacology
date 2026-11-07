// The yard's glazes: every real-time set piece is a glazed ceramic holiday-village piece with gold-leaf edges.
// No hot pink anywhere (pink is the catch colour): gold, coral, oxblood, cream, amber, lilac, teal.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const glaze = (color, o = {}) => {
  const p = { color, roughness: o.rough ?? 0.28, metalness: o.metal ?? 0, clearcoat: o.coat ?? 1, clearcoatRoughness: o.coatRough ?? 0.07, sheen: o.sheen ?? 0, emissiveIntensity: o.ei ?? 1, side: o.side ?? THREE.FrontSide, envMapIntensity: o.env ?? 1, transparent: !!o.transparent, opacity: o.opacity ?? 1, depthWrite: o.depthWrite ?? true };
  if (o.sheenColor) p.sheenColor = new THREE.Color(o.sheenColor);
  if (o.emissive) p.emissive = new THREE.Color(o.emissive);
  return new THREE.MeshPhysicalMaterial(p);
};

export const M = {
  ivory: glaze(0xf3ead8), cream: glaze(0xefe3cf), bone: glaze(0xede3d1, { rough: 0.35 }),
  gold: glaze(0xe0b04a, { metal: 1, rough: 0.24, coat: 0.6 }), goldDark: glaze(0xb78a2e, { metal: 1, rough: 0.32, coat: 0.4 }),
  coral: glaze(0xff5a4a), coralDeep: glaze(0xd93a33), oxblood: glaze(0x5c1a1f), oxbloodDoor: glaze(0x6b1220),
  teal: glaze(0x1e5a5a), navy: glaze(0x1c2440), honey: glaze(0xc9893a, { rough: 0.85, coat: 0.1, sheen: 1, sheenColor: 0xffd8a0 }),
  honeyDark: glaze(0x8a5a2a, { rough: 0.8, coat: 0.1, sheen: 1, sheenColor: 0xffc890 }),
  black: glaze(0x0b0a0f, { rough: 0.2 }), birch: glaze(0xe8dcc0, { rough: 0.5, coat: 0.4 }),
  felt: glaze(0x0f6b45, { rough: 0.9, coat: 0.05, sheen: 1, sheenColor: 0x6af0b0 }), feltDark: glaze(0x0a4a30, { rough: 0.9, coat: 0.05, sheen: 0.8, sheenColor: 0x4ad090 }),
  emerald: glaze(0x0f5a3a, { rough: 0.85, coat: 0.1, sheen: 1, sheenColor: 0x9affd0 }),
  white: glaze(0xf6f2ea), steel: glaze(0xd8dde6, { metal: 1, rough: 0.12, coat: 0.3 }), silver: glaze(0xe6e9ee, { metal: 1, rough: 0.08, coat: 0.5 }),
  lilac: glaze(0xb6a6ff), amber: glaze(0xffb84a), plaidNavy: glaze(0x24305a), brown: glaze(0x6a3a22, { rough: 0.5 }),
  glassBlue: glaze(0x9ad8ff, { rough: 0.05, emissive: 0x6ab8ff, ei: 0.9, transparent: true, opacity: 0.55, depthWrite: false }),
  frost: glaze(0xdff2ff, { rough: 0.35, emissive: 0x9ad8ff, ei: 0.5 }),
};
// glowing things (bulbs, screens, flames' hearts): unlit, bright enough to bloom
export const G = (hex, k = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: false });
export const GLOW = {
  cream: G(0xfff1d6, 2.6), amber: G(0xffb04a, 2.6), coral: G(0xff6a50, 2.4), gold: G(0xffc860, 2.4), blue: G(0xbfe6ff, 2.2),
  window: G(0xffc46b, 1.6), fireWin: G(0xff6a2a, 2.2), lilac: G(0xc8b8ff, 2.2), white: G(0xf8f4ff, 2.4), teal: G(0x7ff0e0, 2.0),
};

// static geometry, merged per material (fewer draws: everything is drawn twice, once in the floor mirror)
export class Merger {
  constructor() { this.parts = new Map(); }
  add(mat, geo, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1) {
    geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), typeof s === 'number' ? new THREE.Vector3(s, s, s) : s));
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (geo.index === null) { const n = geo.attributes.position.count; geo.setIndex(Array.from({ length: n }, (_, i) => i)); }
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    (this.parts.get(mat) || this.parts.set(mat, []).get(mat)).push(geo);
    return geo;
  }
  box(mat, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { return this.add(mat, new THREE.BoxGeometry(w, h, d), x, y, z, ry, rx, rz); }
  rbox(mat, w, h, d, r, x, y, z, ry = 0, rx = 0, rz = 0) { return this.add(mat, roundBox(w, h, d, r), x, y, z, ry, rx, rz); }
  cyl(mat, r0, r1, h, x, y, z, seg = 16, rx = 0, rz = 0, ry = 0) { return this.add(mat, new THREE.CylinderGeometry(r0, r1, h, seg), x, y, z, ry, rx, rz); }
  sphere(mat, r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 16) { const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)); g.scale(sx, sy, sz); return this.add(mat, g, x, y, z); }
  torus(mat, R, r, x, y, z, rx = 0, ry = 0, rz = 0, arc = Math.PI * 2) { return this.add(mat, new THREE.TorusGeometry(R, r, 8, 32, arc), x, y, z, ry, rx, rz); }
  lathe(mat, prof, x, y, z, seg = 24) { return this.add(mat, new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), seg), x, y, z); }
  build(parent, { cast = true, receive = true } = {}) {
    const out = [];
    for (const [mat, gs] of this.parts) {
      const g = mergeGeometries(gs, false);
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.castShadow = cast && !(mat instanceof THREE.MeshBasicMaterial); m.receiveShadow = receive; parent.add(m); out.push(m);
      gs.forEach((x) => x.dispose());
    }
    this.parts.clear();
    return out;
  }
}

// a box with rounded edges (glazed ceramic never has a sharp corner)
export function roundBox(w, h, d, r = 0.04, seg = 3) {
  const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
  const p = g.attributes.position, v = new THREE.Vector3();
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const c = new THREE.Vector3(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
    const n = v.clone().sub(c); const l = n.length();
    if (l > 1e-6) v.copy(c).addScaledVector(n, r / l);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// a canvas texture (paintings, posters, labels): draw(ctx, w, h)
export function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export const texMat = (tex, o = {}) => { const p = { map: tex, roughness: o.rough ?? 0.3, clearcoat: o.coat ?? 1, clearcoatRoughness: 0.08, transparent: !!o.transparent, side: o.side ?? THREE.FrontSide, emissiveIntensity: o.ei ?? 1 }; if (o.emissive) { p.emissive = new THREE.Color(o.emissive); p.emissiveMap = tex; } return new THREE.MeshPhysicalMaterial(p); };
