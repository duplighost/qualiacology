// Pretty Until Proven Guilty: the way out. "Case closed": the gavel, and on the second one the
// courthouse's front doors swing open. "Lipstick stays on": out onto the steps into the night and
// the press, flashbulbs going off all down the risers, the vans' masts up, the city lit beyond; in
// the square her monument, a lipstick as tall as the courthouse rising out of its case on a plinth
// that says so, Lady Justice either side of it. "You're welcome."

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local, col } from './scenery.js';
import { prepare, floorAt, groundAt, Terrain } from './trail.js';
import { paint, rgb, seeded, box, litTint } from './summer.js';
import { JUS } from './ppg-sets.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 12, hh = 8) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
function tube(a, b, r, n = 6) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
const onGround = (S, it) => { prepare(S.course, S.plan); if (it.h === undefined) it.h = groundAt(S.course, it.t, it.x); return it; };
function litVC(M, key, opts, k) {
  return M[key] || (M[key] = (() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts });
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';'); };
    return m;
  })());
}
const selfLit = (m, k) => { m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';'); }; return m; };

// ---------- the square's things ----------
const SQ = {
  // a door leaf: bronze, panelled, a ring for a handle; hinged on its x = 0 edge, running to +x
  leaf(w, h) {
    const parts = [], br = rgb(0x4a2e14), lt = rgb(0x7a5228), gold = rgb(0xd8b050);
    parts.push(paint(box(w, h, 0.9, w / 2, h / 2, 0), br));
    for (let r = 0; r < 4; r++) for (const z of [-0.5, 0.5]) parts.push(paint(box(w * 0.78, h * 0.18, 0.25, w * 0.5, h * (0.14 + r * 0.235), z), lt));
    for (const z of [-0.55, 0.55]) { const ring = new THREE.TorusGeometry(1.0, 0.16, 8, 20); ring.translate(w * 0.86, h * 0.44, z); parts.push(paint(ring, gold)); }
    parts.push(paint(box(0.5, h, 1.0, w - 0.25, h / 2, 0), rgb(0x2a1a0a)));
    return merge(parts);
  },
  // a courthouse lamp: a fluted iron post, a cross-arm, five globes (their light is glows)
  lamp() {
    const parts = [], iron = rgb(0x1a1a20), glass = rgb(0xfff2d8);
    parts.push(paint(box(1.6, 0.8, 1.6, 0, 0.4, 0), iron));
    parts.push(paint(cyl(0.32, 0.5, 9, 10, 0, 5.3, 0), iron));
    parts.push(paint(cyl(0.6, 0.6, 0.4, 10, 0, 9.9, 0), iron));
    for (const sx of [-1, 1]) parts.push(paint(tube(V(0, 10, 0), V(sx * 1.8, 10.8, 0), 0.12), iron));
    for (const [x, y] of [[-1.8, 11.4], [1.8, 11.4], [0, 11.9]]) parts.push(paint(sph(0.6, 1, 1.1, 1, x, y, 0), glass));
    return merge(parts);
  },
  // a press riser: three steps going up away from the road (the road is +z)
  riser() {
    const parts = [], c = rgb(0x26262c), e = rgb(0x111114);
    parts.push(paint(box(10, 1.0, 3, 0, 0.5, 3), c)); parts.push(paint(box(10, 2.0, 3, 0, 1.0, 0), c)); parts.push(paint(box(10, 3.0, 3, 0, 1.5, -3), c));
    parts.push(paint(box(10.2, 0.4, 0.2, 0, 1.1, 4.5), rgb(0xc8a050)));     // the rail along the front
    for (const x of [-5, 0, 5]) parts.push(paint(box(0.12, 1.1, 0.12, x, 0.55, 4.5), rgb(0xc8a050)));
    parts.push(paint(box(10, 3, 0.1, 0, 1.5, -4.55), e));
    return merge(parts);
  },
  // a photographer, camera up to the face, facing +z
  snapper() {
    const parts = [];
    for (const sx of [-1, 1]) parts.push(cyl(0.11, 0.1, 0.86, 6, sx * 0.13, 0.43, 0));
    parts.push(cyl(0.25, 0.21, 0.78, 8, 0, 1.24, 0));
    parts.push(sph(0.13, 1, 1.1, 1, 0, 1.78, 0.02));
    for (const sx of [-1, 1]) parts.push(tube(V(sx * 0.22, 1.56, 0), V(sx * 0.08, 1.72, 0.3), 0.06, 5));
    parts.push(box(0.26, 0.17, 0.14, 0, 1.75, 0.34));
    parts.push(cyl(0.06, 0.07, 0.14, 8, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 1.74, 0.46));
    parts.push(box(0.09, 0.12, 0.07, 0.07, 1.89, 0.34));
    return merge(parts);
  },
  // a TV van: the box, the cab, a stripe (no names), a mast with its dish (long side along x)
  van() {
    const parts = [], w = rgb(0xe8eaee), d = rgb(0x1a1c22), red = rgb(0xc8102a);
    parts.push(paint(box(7.4, 3.2, 2.7, 0, 2.2, 0), w));
    parts.push(paint(box(2.3, 2.5, 2.6, 4.8, 1.75, 0), w));
    parts.push(paint(box(0.12, 1.0, 2.3, 5.96, 2.35, 0), d));
    parts.push(paint(box(7.42, 0.45, 2.72, 0, 2.7, 0), red));
    for (const x of [-2.6, 3.6]) for (const z of [-1.25, 1.25]) parts.push(paint(cyl(0.55, 0.55, 0.4, 12, 0, 0, 0).rotateX(Math.PI / 2).translate(x, 0.55, z), d));
    parts.push(paint(cyl(0.12, 0.16, 11, 8, -1.8, 9.3, 0), rgb(0xb8bcc4)));
    const dish = new THREE.SphereGeometry(1.5, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.32); dish.rotateX(-Math.PI / 2 + 0.5); dish.translate(-1.8, 14.6, 0.3); parts.push(paint(dish, w));
    parts.push(paint(box(0.6, 0.4, 0.6, -1.8, 14.9, 0), d));
    return merge(parts);
  },
};

extend({
  layers: {
    ppgLampPost: (M) => [SQ.lamp(), litVC(M, 'ppgIronM', { roughness: 0.5, metalness: 0.4 }, 0.25), 60, {}],
    ppgRiser: (M) => [SQ.riser(), litVC(M, 'ppgRiserM', { roughness: 0.7, metalness: 0.1 }, 0.2), 30, {}],
    ppgSnapper: (M) => [SQ.snapper(), M.ppgSnapM || (M.ppgSnapM = litTint(0.3)), 300, { aTint: 3 }],
    ppgVan: (M) => [SQ.van(), litVC(M, 'ppgVanM', { roughness: 0.4, metalness: 0.2 }, 0.3), 8, {}],
  },
  parts: {
    ppgLampPost(S, it, p, q) {
      const m = S._m, s = it.s ?? 1.2; m.compose(p, q, S._s.set(s, s, s)); S.layers.ppgLampPost.add(m);
      const yaw = S.course.sample(it.t).yaw + (it.rot || 0);
      for (const [x, y] of [[-1.8, 11.4], [1.8, 11.4], [0, 11.9]]) { const w = local(p, yaw, x * s, y * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 2.6 * s, [1, 0.88, 0.62], 1.3, S.beatLamps ? 4 : 0); }
      poolAt(S, p.x, p.y + 0.08, p.z, 22 * s, [1, 0.82, 0.55], 0.6);
    },
    // a riser, its photographers in rows on the steps
    ppgRiser(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1.4; m.compose(p, q, S._s.set(s, s, s)); S.layers.ppgRiser.add(m);
      const snaps = S.layers.ppgSnapper;
      for (const sn of it.snaps) {
        const w = local(p, yaw, sn[0] * s, sn[1] * s, sn[2] * s, S._o);
        S._e.set(0, yaw + sn[3], 0); const sq = (S._ppq || (S._ppq = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(w, sq, S._s.set(s * 1.15, s * 1.15, s * 1.15)); snaps.add(m, { aTint: sn[4] });
      }
    },
    ppgVan(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1.3; m.compose(p, q, S._s.set(s, s, s)); S.layers.ppgVan.add(m);
      const w = local(p, yaw, -1.8 * s, 15.3 * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 2.2, [1, 0.1, 0.1], 1.6, 1);
      const r = local(p, yaw, 3.4 * s, 4.2 * s, 0, S._o); glowAt(S, r.x, r.y, r.z, 3.5, [0.7, 0.85, 1], 0.5);
    },
  },
  kits: {
    ppgLamps(S, z) { const clear = z.clear || []; for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) { if (clear.some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue; S.items.push(onGround(S, { t, x: side * (z.x ?? 19), rot: SIDE(side), s: z.s ?? 1.2, parts: 'ppgLampPost', ahead: z.ahead ?? 12 })); } },
    // risers down both sides of the way out, photographers on every step; their flashes are fired by
    // the press (ppg-sets.js) from the list kept here
    ppgRisers(S, z, R) {
      prepare(S.course, S.plan);
      const coats = [[0.16, 0.16, 0.2], [0.24, 0.22, 0.26], [0.1, 0.12, 0.18], [0.42, 0.36, 0.3], [0.2, 0.14, 0.16], [0.3, 0.3, 0.34]];
      S.ppgSnappers = S.ppgSnappers || [];
      const s = z.s ?? 1.4;
      for (let t = z.from; t < z.to; t += z.every ?? 0.62) for (const side of [-1, 1]) {
        const x = side * (z.x ?? 30), h = groundAt(S.course, t, x), snaps = [];
        for (const [zz, yy] of [[3, 1.0], [0, 2.0], [-3, 3.0]]) for (let k = 0; k < 3; k++) {
          const xx = -3.6 + k * 3.6 + (R() - 0.5) * 1.4;
          snaps.push([xx, yy, zz, (R() - 0.5) * 0.7, coats[Math.floor(R() * coats.length)]]);
          // where its flash goes off: along the road, across, how high (world)
          const across = x - side * zz * s;
          S.ppgSnappers.push({ t: t + xx * s / 60, x: across, y: h + (yy + 1.9) * s * 1.15 });
        }
        S.items.push({ t, x, rot: SIDE(side), s, h, snaps, parts: 'ppgRiser', ahead: z.ahead ?? 12 });
      }
    },
    ppgVans(S, z) { for (const [t, x] of z.at) S.items.push(onGround(S, { t, x, rot: SIDE(x), s: z.s ?? 1.3, parts: 'ppgVan', ahead: z.ahead ?? 12 })); },
    // the city beyond the square, every window lit
    ppgSkyline(S, z, R) {
      const greys = [0x6a6a88, 0x7a7090, 0x5e6a86, 0x8a809a, 0x707c94];
      for (const side of [-1, 1]) for (let t = z.from + R() * 0.2; t < z.to; t += (z.every ?? 0.28) + R() * 0.3) {
        const x = side * (z.x ?? 95) * (1 + R() * 1.4), tall = R() < 0.6;
        S.items.push(onGround(S, { t, x, rot: R() * 0.5, s: 0.9 + R() * 0.5, sy: tall ? 0.9 + R() * 1.6 : 0.5 + R() * 0.9, parts: tall ? 'tower' : 'block', noShop: true, tint: col(greys[Math.floor(R() * greys.length)]), seed: R(), wake0: z.wake0 ?? 0.75, ahead: z.ahead ?? 14 }));
      }
    },
  },
});

// ---------- the doors, the ground outside ----------
export class PpgOutside {
  constructor(scene, S, cfg) {
    this.S = S; this.cfg = cfg; const c = S.course; prepare(c, S.plan);
    this.terrain = new Terrain(scene, c, S.P, S.plan);
    const tu = this.terrain.mat.uniforms; tu.uPath.value = 0; tu.uLawn.value = 1; tu.uDry.value = 0.1; tu.uWood.value = 0;
    this.terrain.mesh.visible = false;
    this.spans = (S.plan.rooms || []).map((r) => [r.from, r.to]);
    this.from = cfg.from ?? cfg.door.t;
    // the front doors: two bronze leaves in the last room's end wall, swinging out on the gavel
    const d = cfg.door; this.door = d;
    this.dg = new THREE.Group(); this.dg.visible = false; scene.add(this.dg);
    const m = selfLit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }), 0.25);
    const geo = SQ.leaf(d.hw, d.hh);
    // (the right leaf is the left one mirrored, so both hinge at their jamb and meet in the middle)
    this.leaves = [-1, 1].map((sd) => { const g = new THREE.Group(); g.position.set(sd * d.hw, 0, 0); this.dg.add(g); const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; if (sd > 0) mesh.scale.x = -1; g.add(mesh); return { sd, g }; });
    this._p = new THREE.Vector3();
  }
  update(S, dt, camera) {
    const T = S.rider.t, c = S.course, d = this.door;
    // the ground outside: only once there's an outside to see
    const near = T > this.from - 7;   // (the doors are shut till then: nothing outside to see)
    this.terrain.mesh.visible = near;
    if (near) {
      const Tr = this.terrain; Tr.update(S.track, S.rider, S.P, camera, 0); Tr.mat.uniforms.uWood.value = 0;
      let sunk = false;
      for (let i = 0; i < Tr.N; i++) {
        const t = Tr.rowT0 + i * Tr.rowDT;
        if (!this.spans.some(([a, b]) => t > a + 0.25 && t < b - 0.25)) continue;
        for (let j = 0; j < Tr.M; j++) Tr.pos[(i * Tr.M + j) * 3 + 1] -= 9;
        sunk = true;
      }
      if (sunk) Tr.geo.attributes.position.needsUpdate = true;
    }
    // the doors: shut until the gavel, then thrown open outward
    const show = T > d.t - 40 && T < d.t + 0.45;   // (gone once she's through: from out here the wall isn't a building)
    this.dg.visible = show;
    if (show) {
      S.track.ground(d.t, 0, this._p);
      this.dg.position.set(this._p.x, floorAt(c, d.t), this._p.z);
      this.dg.rotation.set(0, c.sample(d.t).yaw, 0);
      const u = clamp((T - d.open) / 0.55, 0, 1), e = 1 - Math.pow(1 - u, 3);
      const a = 1.62 * e + (u >= 1 ? 0.06 * Math.exp(-(T - d.open - 0.55) * 4) * Math.sin((T - d.open - 0.55) * 14) : 0);
      // each leaf turns on its jamb so its free edge goes out into the night
      for (const l of this.leaves) l.g.rotation.y = l.sd * a;
    }
  }
}

// ---------- the monument ----------
function plaqueTex(text) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#16161c'; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = '#d8b050'; g.lineWidth = 8; g.strokeRect(14, 14, 996, 228);
  let size = 150; const f = (s) => `700 ${s}px Georgia, "Times New Roman", "Liberation Serif", serif`; g.font = f(size);
  while (g.measureText(text).width > 900 && size > 30) { size -= 4; g.font = f(size); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f0cc68'; g.shadowColor = '#ffd27a'; g.shadowBlur = 18; g.fillText(text, 512, 136);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const MON = {
  // the terrace it stands on, three steps up out of the square (so it clears the road)
  terrace() {
    const parts = [], st = rgb(0x8a8478), lt = rgb(0xb8b0a4);
    [[30, 2], [26.5, 4], [23, 6]].forEach(([r, y], i) => { parts.push(paint(cyl(r, r + 0.4, 2, 8, 0, y - 1, 0), i % 2 ? lt : st)); });
    for (const g of parts) g.rotateY(Math.PI / 8);
    return merge(parts);
  },
  basin() { const parts = []; const rim = new THREE.TorusGeometry(15, 0.9, 10, 64); rim.rotateX(Math.PI / 2); rim.translate(0, 0.9, 0); parts.push(paint(rim, rgb(0xd8d0c4))); parts.push(paint(cyl(15, 15.6, 0.9, 64, 0, 0.45, 0), rgb(0xb8b0a4))); return merge(parts); },
  water() { const g = new THREE.CircleGeometry(14.4, 64); g.rotateX(-Math.PI / 2); g.translate(0, 1.1, 0); return g; },
  plinth() {
    const parts = [], st = rgb(0x26262e), gold = rgb(0xd8b050);
    parts.push(paint(cyl(8, 9, 2, 8, 0, 1, 0), st)); parts.push(paint(cyl(8.1, 8.1, 0.3, 8, 0, 2.1, 0), gold));
    parts.push(paint(cyl(6.5, 7.5, 2.6, 8, 0, 3.4, 0), st)); parts.push(paint(cyl(6.6, 6.6, 0.3, 8, 0, 4.8, 0), gold));
    parts.push(paint(cyl(5.2, 5.8, 3.4, 8, 0, 6.6, 0), st)); parts.push(paint(cyl(5.4, 5.4, 0.35, 8, 0, 8.35, 0), gold));
    for (const g of parts) g.rotateY(Math.PI / 8);
    return merge(parts);
  },
  // the lipstick's case and collar, gold and silver, ribbed
  tube() {
    const parts = [], gold = rgb(0xe0b048), black = rgb(0x1a0a10), silver = rgb(0xdfe3ea);
    parts.push(paint(cyl(2.4, 2.5, 8, 40, 0, 4, 0), gold));
    for (let k = 0; k < 4; k++) parts.push(paint(cyl(2.52, 2.52, 0.22, 40, 0, 1.2 + k * 1.6, 0), black));
    parts.push(paint(cyl(2.5, 2.5, 0.5, 40, 0, 8.2, 0), gold));
    parts.push(paint(cyl(2.05, 2.05, 2.6, 40, 0, 9.7, 0), silver));
    return merge(parts);
  },
  // the bullet, cut on the slant; it winds up out of the collar
  bullet() {
    const b = new THREE.CylinderGeometry(1.75, 1.75, 6, 40, 6), p = b.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 2.0) p.setY(i, 2.0 + (p.getY(i) - 2.0) * 0.3 + (p.getX(i) + 1.75) * 0.75);
    b.computeVertexNormals(); b.translate(0, 3, 0);
    return paint(b, rgb(0xd0102a));
  },
  cap() {
    const parts = [], gold = rgb(0xe0b048);
    parts.push(paint(cyl(2.55, 2.55, 9, 40, 0, 0, 0), gold)); parts.push(paint(cyl(2.6, 2.6, 0.4, 40, 0, 3.6, 0), rgb(0x1a0a10)));
    const g = merge(parts); g.rotateZ(Math.PI / 2); return g;
  },
};
const BEAM_VS = `varying float vL; varying vec3 vN; varying vec3 vV; void main(){ vL = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }`;
const BEAM_FS = `uniform vec3 uCol; uniform float uK; varying float vL; varying vec3 vN; varying vec3 vV; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 1.6) * pow(max(1.0 - vL, 0.0), 2.0) * smoothstep(0.0, 0.15, vL) * uK; a = (a == a) ? clamp(a, 0.0, 3.0) : 0.0; gl_FragColor = vec4(uCol * a, 1.0); }`;

export class PpgMonument {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -36; this.rise = cfg.rise ?? 161.32;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    const stone = selfLit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.2 }), 0.22);
    const shiny = selfLit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.55 }), 0.35);
    const red = selfLit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.15 }), 0.55);
    this.top = new THREE.Group(); this.top.position.y = 6; this.group.add(this.top);
    const add = (geo, mat, x = 0, y = 0, z = 0, s = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.setScalar(s); m.frustumCulled = false; this.top.add(m); return m; };
    { const t = new THREE.Mesh(MON.terrace(), stone); t.frustumCulled = false; this.group.add(t); }
    add(MON.basin(), stone);
    this.water = add(MON.water(), new THREE.MeshStandardMaterial({ color: 0x0c1420, roughness: 0.06, metalness: 0.75, emissive: 0x0a0c18 }));
    add(MON.plinth(), stone);
    const S2 = 1.55; this.S2 = S2;
    add(MON.tube(), shiny, 0, 8.5, 0, S2);
    this.bullet = add(MON.bullet(), red, 0, 8.5 + 9.7 * S2, 0, S2);
    add(MON.cap(), shiny, -19, 2.55 * S2 * 0.9, 9, S2 * 0.9).rotation.y = 0.9;
    // a stone tablet in front of the basin, toward the road: his line on it
    add(merge([paint(box(14, 3.8, 1.4, 0, 1.9, 0), rgb(0x26262e)), paint(box(14.4, 0.35, 1.6, 0, 3.9, 0), rgb(0xd8b050))]), stone, 0, 0, 18.5);
    add(new THREE.PlaneGeometry(13.2, 3.3), new THREE.MeshBasicMaterial({ map: plaqueTex(cfg.text || 'LIPSTICK STAYS ON'), color: new THREE.Color(1.25, 1.25, 1.25) }), 0, 1.95, 19.22);
    // Lady Justice either side
    const marble = selfLit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.05 }), 0.22);
    const gild = selfLit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.55 }), 0.36);
    // (on the terrace's top step, holding up her scales)
    for (const sx of [-1, 1]) {
      const j = new THREE.Group(); j.position.set(sx * 19, 0, 4); j.rotation.y = -sx * 0.35; j.scale.setScalar(1.15); this.top.add(j);
      for (const [geo, mat] of [[JUS.plinth(), marble], [JUS.body(), gild]]) { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; j.add(m); }
      const beam = new THREE.Mesh(JUS.beam(), gild); beam.position.set(-2.2, 21.05, 0.45); beam.rotation.z = sx * 0.12; beam.frustumCulled = false; j.add(beam);
      for (const sd of [-1, 1]) { const pan = new THREE.Mesh(JUS.pan(), gild); pan.position.set(-2.2 + sd * 2.4 * Math.cos(0.12), 21.05 + sd * 2.4 * Math.sin(sx * 0.12), 0.45); pan.frustumCulled = false; j.add(pan); }
    }
    // two searchlights behind it, sweeping the sky
    this.beamMat = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(1, 0.92, 0.8) }, uK: { value: 0.4 } }, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const bg = new THREE.CylinderGeometry(4.5, 0.4, 150, 18, 1, true); bg.translate(0, 75, 0);
    this.beams = [-1, 1].map((sx) => { const b = new THREE.Mesh(bg, this.beamMat); b.position.set(sx * 11, 0.5, -12); b.frustumCulled = false; this.top.add(b); return b; });
    this.lit = 0.5; this.fired = false; this.earned = 0;
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3(); this._a = new THREE.Vector3();
  }
  fire(earned) { this.fired = true; this.earned = earned ?? 0.5; }
  update(track, rider, songT, dt) {
    const c = this.course;
    track.ground(this.t, this.x, this._p); this._p.y = groundAt(c, this.t, this.x);
    this.group.position.copy(this._p);
    // turned to face the way she comes out, a little toward the road
    track.ground(this.t - (this.cfg.face ?? 5), 0, this._a);
    this.group.rotation.set(0, Math.atan2(this._a.x - this._p.x, this._a.z - this._p.z), 0);
    // "lipstick stays on": the bullet winds up out of its case
    const u = clamp((songT - this.rise) / 1.3, 0, 1), e = u * u * (3 - 2 * u);
    this.bullet.position.y = 8.5 + this.S2 * (5.0 + 5.4 * e);
    this.bullet.rotation.y = e * Math.PI * 1.5;
    this.lit += ((this.fired ? 1.25 : 0.55) - this.lit) * Math.min(1, dt * 2);
    const sw = songT * 0.45;
    this.beams.forEach((b, i) => { const sd = i ? 1 : -1; b.rotation.set(-0.12 + 0.18 * Math.sin(sw + i * 2), 0, sd * (0.28 + 0.2 * Math.sin(sw * 1.3 + i))); });
    this.beamMat.uniforms.uK.value = 0.35 * this.lit;
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const beat = this.beat ?? (S.beat || 0), L = this.lit;
    const at = (x, y, z) => this._w.set(x, y, z).applyMatrix4(this.group.matrixWorld);
    // uplights on the plinth, the bullet glowing at the top, the water lit, the fountain's jets
    for (const [x, z] of [[6, 6], [-6, 6], [6, -6], [-6, -6]]) { at(x, 8.6, z); S.glow(this._w.x, this._w.y, this._w.z, 4, [1, 0.86, 0.6], 1.0 * L); }
    at(0, 6 + this.bullet.position.y + this.S2 * 6, 0); S.glow(this._w.x, this._w.y, this._w.z, 26, [1, 0.25, 0.32], (0.35 + 0.25 * beat) * L);
    at(0, 7.2, 0); S.pool(this._w.x, this._w.y, this._w.z, 80, [1, 0.82, 0.62], 0.5 * L);
    if (this.fired) for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, h = 4 + 5 * (0.6 + 0.4 * beat) * Math.min(1, (songT - this.rise + 0.5) * 2);
      for (let j = 1; j <= 4; j++) { at(Math.cos(a) * 13.6, 7.2 + h * j / 4, Math.sin(a) * 13.6); S.glow(this._w.x, this._w.y, this._w.z, 1.6 + j * 0.25, [0.85, 0.92, 1], 0.5 * L); }
    }
  }
}
