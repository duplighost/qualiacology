// Flora: thousands of instances, ~9 draw calls. Each type is a small merged
// geometry with vertex colors, instanced across the island wherever its
// region's weight is high. Grass and flowers take per-instance tints so
// borders blend. Big trunks drop circle colliders into the world field.

import * as THREE from 'three';
import { makeRng } from '../core/rng.js';
import { regionWeights } from './regions.js';
import { terrainHeight, terrainNormal } from './terrain.js';
import { DESTS, SPIRE } from './destdata.js';
import { R6_THRESHOLDS, STARFALL_THRESHOLD, WONDERS, WONDERS_BY_REGION } from './wonderdata.js';
import { worldFoliage, worldSurface } from './materials.js';

// ---- tiny geometry merge (position/normal/color, non-indexed) -------------
function mergeGeos(parts) {
  const geos = parts.map(({ geo, color, translate, scale, rotate }) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (scale) g.scale(...scale);
    if (rotate) g.rotateX(rotate[0]), g.rotateY(rotate[1]), g.rotateZ(rotate[2]);
    if (translate) g.translate(...translate);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { colors[i * 3] = color[0]; colors[i * 3 + 1] = color[1]; colors[i * 3 + 2] = color[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  });
  let total = 0;
  for (const g of geos) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3), norm = new Float32Array(total * 3), col = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let off = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, off * 3);
    norm.set(g.attributes.normal.array, off * 3);
    col.set(g.attributes.color.array, off * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, off * 2);
    off += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

const C = THREE.CylinderGeometry, I = THREE.IcosahedronGeometry, Co = THREE.ConeGeometry, B = THREE.BoxGeometry, S = THREE.SphereGeometry;

function organicSphere(radius = 1, seed = 1, ws = 13, hs = 9) {
  const g = new S(radius, ws, hs);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const warp = 1 + Math.sin(x * 2.9 + y * 1.7 + seed) * .055
      + Math.sin(z * 3.7 - y * 2.1 + seed * 1.9) * .038;
    p.setXYZ(i, x * warp, y * (1 + (warp - 1) * .45), z * warp);
  }
  g.computeVertexNormals();
  return g;
}

function pineTier(radius, height, seed) {
  const g = new Co(radius, height, 15, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const edge = 1 + Math.sin(a * 5 + seed) * .075 + Math.sin(a * 9 - seed * .7) * .035;
    p.setXYZ(i, x * edge, y, z * edge);
  }
  g.computeVertexNormals();
  return g;
}

function foliageCross(width, height, centerY, planes = 3) {
  const parts = [];
  for (let i = 0; i < planes; i++) {
    parts.push({
      geo: new THREE.PlaneGeometry(width, height, 1, 1), color: [1, 1, 1],
      translate: [0, centerY, 0], rotate: [0, i / planes * Math.PI, 0],
    });
  }
  return mergeGeos(parts);
}

let floraMap = null, floraBump = null;
function floraTextures() {
  if (floraMap) return { map: floraMap, bump: floraBump };
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#deded8'; g.fillRect(0, 0, 256, 256);
  const rng = makeRng(81721);
  for (let i = 0; i < 4600; i++) {
    const v = 145 + (rng() * 88 | 0), a = .025 + rng() * .07;
    g.fillStyle = `rgba(${v},${v},${Math.min(255, v + 4)},${a})`;
    const x = rng() * 256, y = rng() * 256, w = .4 + rng() * 2.5;
    g.fillRect(x, y, w, .35 + rng() * 2.2);
  }
  g.lineCap = 'round';
  for (let i = 0; i < 74; i++) {
    g.strokeStyle = `rgba(65,58,49,${.025 + rng() * .055})`;
    g.lineWidth = .35 + rng() * .7;
    const x = rng() * 256, y = rng() * 256;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rng() - .5) * 22, y + 8 + rng() * 24); g.stroke();
  }
  floraMap = new THREE.CanvasTexture(c);
  floraMap.wrapS = floraMap.wrapT = THREE.RepeatWrapping;
  floraMap.repeat.set(2.8, 2.8);
  floraMap.colorSpace = THREE.SRGBColorSpace;
  floraMap.anisotropy = 8;
  floraBump = floraMap.clone();
  floraBump.colorSpace = THREE.NoColorSpace;
  floraBump.needsUpdate = true;
  return { map: floraMap, bump: floraBump };
}

// Four bent, tapered leaves replace the old five rigid triangles. The triangle
// budget stays bounded, but each cluster now has a readable base, shoulder,
// and tip instead of becoming a field of black spikes at desktop distance.
function bladeCluster() {
  const positions = [];
  const colors = [];
  const add = (angle, x, z, h, width, lean, shade) => {
    const wx = Math.cos(angle) * width, wz = Math.sin(angle) * width;
    const lx = -Math.sin(angle) * lean, lz = Math.cos(angle) * lean;
    const ml = [x - wx * .58 + lx * .42, h * .58, z - wz * .58 + lz * .42];
    const mr = [x + wx * .58 + lx * .42, h * .58, z + wz * .58 + lz * .42];
    const tip = [x + lx, h, z + lz];
    const bl = [x - wx, 0, z - wz], br = [x + wx, 0, z + wz];
    positions.push(
      ...bl, ...br, ...mr,
      ...bl, ...mr, ...ml,
      ...ml, ...mr, ...tip,
    );
    for (const v of [.68, .68, .84, .68, .84, .84, .84, .84, 1]) {
      colors.push(shade * v, shade * v, shade * v);
    }
  };
  add(.12, -.04, .01, .34, .105, .24, .98);
  add(1.61, .08, -.03, .29, .092, .20, .87);
  add(3.12, -.06, .07, .31, .096, .21, .92);
  add(4.76, .05, .08, .26, .084, .18, .82);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

const FLORA = {
  birch: {
    region: 'vale', count: 285, minW: 0.5, scale: [0.82, 1.62], collider: 0.32, colliderH: 6,
    crown: { texture: 'broadleaf', make: () => foliageCross(4.75, 4.0, 5.25, 3), alphaTest: .32 },
    make: () => mergeGeos([
      { geo: new C(.16, .31, 3.2, 11, 3), color: [.60, .59, .55], translate: [0, 1.6, 0], rotate: [0, 0, .018] },
      { geo: new C(.10, .18, 2.55, 10, 3), color: [.72, .72, .68], translate: [.15, 4.38, 0], rotate: [0, 0, -.10] },
      { geo: new C(.045, .105, 1.95, 9, 2), color: [.38, .32, .25], translate: [.75, 3.86, .04], rotate: [0, 0, -.76] },
      { geo: new C(.04, .09, 1.65, 9, 2), color: [.42, .35, .27], translate: [-.58, 4.35, -.42], rotate: [.48, 0, .60] },
      { geo: new C(.035, .075, 1.38, 8, 2), color: [.35, .31, .24], translate: [.36, 4.98, .48], rotate: [-.58, 0, -.34] },
      { geo: new C(.035, .13, .82, 8, 2), color: [.48, .43, .34], translate: [.27, .14, 0], rotate: [0, .10, 1.18] },
      { geo: new C(.035, .12, .72, 8, 2), color: [.44, .39, .31], translate: [-.24, .13, -.10], rotate: [0, .78, -1.15] },
      { geo: new C(.03, .11, .68, 8, 2), color: [.46, .40, .32], translate: [.02, .12, .26], rotate: [1.17, .25, 0] },
    ]),
  },
  pine: {
    region: 'frost', count: 250, minW: 0.5, scale: [0.78, 1.68], collider: 0.3, colliderH: 7,
    crown: { texture: 'spruce', make: () => foliageCross(5.25, 7.2, 3.55, 3), alphaTest: .30 },
    make: () => mergeGeos([
      { geo: new C(.13, .27, 5.8, 10, 3), color: [.27, .20, .16], translate: [0, 2.9, 0] },
      { geo: new C(.045, .08, 2.8, 8), color: [.22, .17, .14], translate: [.85, 2.5, 0], rotate: [0, 0, -1.12] },
      { geo: new C(.04, .075, 2.4, 8), color: [.22, .17, .14], translate: [-.72, 3.3, -.35], rotate: [.38, 0, 1.06] },
    ]),
  },
  shroom: {
    region: 'mycel', count: 130, minW: 0.5, scale: [0.7, 1.8], collider: 0.4, colliderH: 3.5,
    crown: {
      texture: 'mushroom', make: () => foliageCross(4.9, 3.25, 3.22, 3), alphaTest: .24,
      emissive: 0xffffff, emissiveIntensity: 1.18,
    },
    make: () => mergeGeos([
      { geo: new C(0.28, 0.54, 2.6, 10, 2), color: [0.70, 0.69, 0.62], translate: [0, 1.3, 0] },
      { geo: new C(0.42, 0.31, 0.22, 10), color: [0.50, 0.42, 0.38], translate: [0, 2.12, 0] },
      { geo: new C(1.12, 1.34, 0.12, 14), color: [0.50, 0.42, 0.40], translate: [0, 2.55, 0] },
    ]),
  },
  spike: {
    region: 'ember', count: 150, minW: 0.5, scale: [0.6, 2.2], collider: 0.5, colliderH: 4,
    make: () => mergeGeos([
      { geo: new Co(0.7, 3.4, 5), color: [0.1, 0.07, 0.09], translate: [0, 1.7, 0] },
      { geo: new Co(0.4, 1.8, 5), color: [0.16, 0.1, 0.12], translate: [0.5, 0.9, 0.2], rotate: [0, 0, 0.5] },
      { geo: new Co(0.3, 1.4, 4), color: [0.55, 0.18, 0.08], translate: [-0.45, 0.7, -0.15], rotate: [0, 0, -0.4] },
    ]),
  },
  column: {
    region: 'shatter', count: 80, minW: 0.55, scale: [0.7, 1.5], collider: 0.55, colliderH: 5,
    make: () => mergeGeos([
      { geo: new C(0.58, 0.70, 1.65, 10), color: [0.42, 0.39, 0.51], translate: [0, .83, 0], rotate: [0, 0, -.025] },
      { geo: new C(0.51, 0.58, 1.48, 10), color: [0.50, 0.46, 0.60], translate: [.07, 2.37, -.03], rotate: [.02, 0, .075] },
      { geo: new C(0.43, 0.52, 1.42, 10), color: [0.58, 0.53, 0.68], translate: [-.04, 3.82, .05], rotate: [-.035, 0, -.09] },
      { geo: new B(1.55, 0.34, 1.55), color: [0.36, 0.33, 0.45], translate: [0, 0.17, 0] },
      { geo: new B(1.12, 0.28, 1.12), color: [0.47, 0.43, 0.56], translate: [-.06, 4.67, .04], rotate: [.02, .05, -.05] },
      { geo: new I(.42, 1), color: [0.31, 0.29, 0.40], translate: [.72, .18, -.42], scale: [1.2, .62, .8] },
      { geo: new I(.28, 1), color: [0.43, 0.38, 0.52], translate: [-.68, .12, .35], scale: [.9, .55, 1.1] },
    ]),
  },
  shrub: {
    region: 'vale', count: 460, minW: .46, scale: [.42, 1.08],
    make: () => mergeGeos([
      { geo: new C(.035, .06, .9, 7), color: [.28, .20, .13], translate: [0, .45, 0], rotate: [0, 0, .18] },
      { geo: organicSphere(.58, 31, 10, 7), color: [.20, .42, .19], translate: [-.28, .68, .02], scale: [1.0, .68, .9] },
      { geo: organicSphere(.52, 37, 10, 7), color: [.28, .51, .24], translate: [.33, .76, .12], scale: [.95, .72, 1.0] },
      { geo: organicSphere(.38, 41, 9, 6), color: [.35, .56, .27], translate: [.02, 1.05, -.22], scale: [.9, .75, .9] },
    ]),
  },
  emberTuft: {
    region: 'ember', count: 430, minW: .46, scale: [.38, 1.18], emissive: 0x421006, emissiveIntensity: .18,
    make: () => mergeGeos([
      { geo: new Co(.16, 1.25, 7, 2), color: [.13, .08, .075], translate: [-.22, .62, 0], rotate: [0, 0, -.18] },
      { geo: new Co(.13, 1.02, 7, 2), color: [.38, .11, .045], translate: [.18, .51, .10], rotate: [0, 0, .24] },
      { geo: new Co(.10, .76, 6, 2), color: [.66, .22, .06], translate: [0, .38, -.20], rotate: [.18, 0, -.08] },
    ]),
  },
  frostBrush: {
    region: 'frost', count: 360, minW: .46, scale: [.42, 1.14],
    make: () => mergeGeos([
      { geo: new Co(.26, 1.25, 8, 2), color: [.54, .68, .70], translate: [0, .62, 0] },
      { geo: new Co(.20, .96, 8, 2), color: [.68, .79, .80], translate: [.34, .48, .12], rotate: [0, 0, .18] },
      { geo: new Co(.18, .82, 8, 2), color: [.45, .60, .64], translate: [-.30, .41, -.14], rotate: [0, 0, -.23] },
    ]),
  },
  sporeBed: {
    region: 'mycel', count: 390, minW: .44, scale: [.40, 1.02], emissive: 0x07110e, emissiveIntensity: .08,
    make: () => mergeGeos([
      { geo: new S(.25, 9, 6), color: [.38, .56, .45], translate: [0, .30, 0], scale: [1, .78, 1] },
      { geo: new S(.18, 8, 6), color: [.50, .65, .54], translate: [.34, .20, .16], scale: [1, .78, 1] },
      { geo: new S(.14, 8, 6), color: [.30, .48, .40], translate: [-.29, .16, -.12], scale: [1, .76, 1] },
    ]),
  },
  fractureReed: {
    region: 'shatter', count: 360, minW: .47, scale: [.40, 1.16], emissive: 0x2f174f, emissiveIntensity: .30,
    make: () => mergeGeos([
      { geo: new Co(.15, 1.45, 6, 2), color: [.48, .34, .67], translate: [-.20, .72, 0], rotate: [0, 0, -.16] },
      { geo: new Co(.12, 1.08, 6, 2), color: [.68, .49, .86], translate: [.19, .54, .14], rotate: [0, 0, .22] },
      { geo: new Co(.09, .82, 5, 2), color: [.37, .29, .54], translate: [.04, .41, -.22], rotate: [.16, 0, -.08] },
    ]),
  },
  rock: {
    region: null, count: 320, minW: 0, scale: [0.4, 1.8], collider: 0.7, colliderH: 1.4, tint: true,
    make: () => {
      const source = new I(1, 3);
      const g = source.index ? source.toNonIndexed() : source.clone();
      g.scale(1, 0.64, 1);
      const n = g.attributes.position.count;
      const colors = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const y = g.attributes.position.getY(i);
        const shade = .50 + (y + .64) * .13 + (i % 5) * .012;
        colors[i * 3] = shade * .94;
        colors[i * 3 + 1] = shade * .97;
        colors[i * 3 + 2] = shade;
      }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return g;
    },
  },
  grass: {
    region: null, count: 30000, minW: 0, scale: [0.42, 0.98], tint: 'region', doubleSide: true,
    make: bladeCluster,
  },
  flower: {
    region: null, count: 1400, minW: 0, scale: [0.6, 1.2], tint: 'flower', valeBias: true,
    make: () => mergeGeos([
      { geo: new C(0.014, 0.022, 0.48, 5), color: [0.32, 0.55, 0.31], translate: [0, 0.24, 0] },
      { geo: new I(0.055, 1), color: [1.0, .82, .35], translate: [0, 0.51, 0] },
      { geo: new I(0.07, 1), color: [1, 1, 1], translate: [.07, 0.52, 0], scale: [1.25, .58, .82] },
      { geo: new I(0.07, 1), color: [.94, .98, 1], translate: [-.07, 0.52, 0], scale: [1.25, .58, .82] },
      { geo: new I(0.07, 1), color: [1, .94, .96], translate: [0, 0.52, .07], scale: [.82, .58, 1.25] },
      { geo: new I(0.07, 1), color: [.96, .91, 1], translate: [0, 0.52, -.07], scale: [.82, .58, 1.25] },
    ]),
  },
};

const FLOWER_COLORS = [[1, 0.65, 0.75], [1, 0.85, 0.4], [0.75, 0.65, 1], [1, 1, 0.9], [0.95, 0.5, 0.35]];
const LANDMARKS = Object.freeze([...WONDERS, ...R6_THRESHOLDS]);
const LANDMARKS_BY_REGION = Object.freeze(Object.fromEntries(
  Object.keys(WONDERS_BY_REGION).map((region) => [
    region,
    LANDMARKS.filter((site) => site.region === region),
  ]),
));
const FLORA_SURFACE = Object.freeze({
  birch: 'forest', shrub: 'forest', pine: 'forest',
  shroom: 'mycel', sporeBed: 'mycel', root: 'mycel',
  spike: 'obsidian', emberTuft: 'obsidian',
  frostBrush: 'ice',
  column: 'stone', fractureReed: 'stone', rock: 'stone',
});

function nearDestination(x, z, pad = 3, groundCover = false) {
  if (Math.hypot(x - SPIRE.x, z - SPIRE.z) < (groundCover ? 4.5 : SPIRE.r + pad)) return true;
  for (const d of DESTS) if (Math.hypot(x - d.x, z - d.z) < d.r + pad) return true;
  return false;
}

function inWonderApproach(x, z) {
  for (const w of LANDMARKS) {
    const dx = x - w.x, dz = z - w.z;
    if (dx * dx + dz * dz > 39 * 39) continue;
    const c = Math.cos(w.rotation), s = Math.sin(w.rotation);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    const approachZ = w === STARFALL_THRESHOLD ? -lz : lz;
    if (approachZ > -3 && approachZ < 35 && Math.abs(lx) < 6.2) return true;
  }
  return false;
}

export function plantWorld(scene, collide) {
  const rng = makeRng(4242);
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  const _e = new THREE.Euler(), _c = new THREE.Color();
  const up = new THREE.Vector3();
  const surface = floraTextures();

  for (const [key, def] of Object.entries(FLORA)) {
    const groundCover = key === 'grass' || key === 'flower';
    const groundCoverTexture = key === 'grass' ? worldFoliage('groundcover') : null;
    const geo = groundCoverTexture ? foliageCross(1.42, .94, .44, 2) : def.make();
    const authored = worldSurface(FLORA_SURFACE[key]);
    const mat = key === 'grass'
      ? (groundCoverTexture
          ? new THREE.MeshBasicMaterial({
              map: groundCoverTexture, alphaTest: .42, transparent: false,
              vertexColors: true, side: THREE.DoubleSide,
              fog: true, toneMapped: true,
            })
          : new THREE.MeshBasicMaterial({
              vertexColors: true, side: THREE.DoubleSide,
              fog: true, toneMapped: true,
            }))
      : new THREE.MeshStandardMaterial({
          vertexColors: true, map: authored?.map || surface.map, bumpMap: authored?.bump || surface.bump,
          bumpScale: key === 'rock' ? .16 : (key === 'birch' || key === 'pine' || key === 'shroom' ? .11 : .085),
          flatShading: key === 'spike' || key === 'column', roughness: key === 'rock' ? .94 : .82,
          metalness: key === 'column' ? .04 : 0,
          emissive: def.emissive || (key === 'birch' || key === 'pine' ? 0x0b1c13 : 0x000000),
          emissiveIntensity: def.emissiveIntensity ?? (key === 'birch' || key === 'pine' ? .24 : .14),
          side: def.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
          alphaTest: 0, transparent: false,
        });
    mat.dithering = true;
    const mesh = new THREE.InstancedMesh(geo, mat, def.count);
    const crownTexture = def.crown ? worldFoliage(def.crown.texture) : null;
    const crown = crownTexture ? new THREE.InstancedMesh(
      def.crown.make(),
      new THREE.MeshBasicMaterial({
        map: crownTexture, alphaTest: def.crown.alphaTest, transparent: false,
        side: THREE.DoubleSide, vertexColors: true, fog: true, toneMapped: true,
      }),
      def.count,
    ) : null;
    mesh.castShadow = key !== 'grass' && key !== 'flower';
    mesh.receiveShadow = key === 'grass';
    if (crown) { crown.castShadow = true; crown.receiveShadow = true; }
    let placed = 0, guard = 0;
    while (placed < def.count && guard++ < def.count * 30) {
      let x, z;
      const distribution = rng();
      if (groundCover && distribution < .58) {
        // Ground detail pools around authored sites in overlapping ecological
        // skirts. This keeps every approach rich while retaining a clear core.
        const d = LANDMARKS[(rng() * LANDMARKS.length) | 0];
        const a = rng() * Math.PI * 2;
        const r = 7 + Math.sqrt(rng()) * (key === 'grass' ? 42 : 31);
        x = d.x + Math.cos(a) * r; z = d.z + Math.sin(a) * r;
      } else if (!groundCover && distribution < .86) {
        // R6's one inner threshold per region receives the same authored
        // ecological lobe grammar as the nine established outer sites. The
        // total instance budget is unchanged; distribution is simply shared
        // across all ten regional anchors instead of leaving the hub ring bare.
        const anchors = def.region ? LANDMARKS_BY_REGION[def.region] : LANDMARKS;
        const d = anchors[(rng() * anchors.length) | 0];
        // Several dense lobes read as a grove, drift, or colony—not a ring.
        const lobe = (rng() * 5) | 0;
        const centerA = d.rotation + lobe * 2.3999632297 + (rng() - .5) * .32;
        const centerR = 10 + lobe * 3.2 + rng() * 6;
        const cx = d.x + Math.cos(centerA) * centerR;
        const cz = d.z + Math.sin(centerA) * centerR;
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * (4.2 + lobe * .9);
        x = cx + Math.cos(a) * r; z = cz + Math.sin(a) * r;
      } else if (groundCover && distribution < .84) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * (key === 'grass' ? 180 : 170);
        x = Math.cos(a) * r; z = Math.sin(a) * r;
      } else {
        x = (rng() * 2 - 1) * 640;
        z = (rng() * 2 - 1) * 640;
      }
      if (Math.hypot(x, z) > 620) continue;
      const h = terrainHeight(x, z);
      if (h < 1.2) continue;                       // not on beaches/underwater
      const n = terrainNormal(x, z, up);
      if (n.y < 0.82) continue;                    // not on cliffs
      if (nearDestination(x, z, 3, groundCover)) continue;
      if (!groundCover) {
        let inCore = false;
        for (const w of LANDMARKS) {
          if ((x - w.x) ** 2 + (z - w.z) ** 2 < 7.2 * 7.2) { inCore = true; break; }
        }
        if (inCore) continue;
        if (inWonderApproach(x, z)) continue;
      }
      const w = regionWeights(x, z);
      if (def.region && w[def.region] < def.minW) continue;
      if (def.region && rng() > w[def.region]) continue;
      if (def.valeBias && rng() > w.vale + 0.15) continue;

      const sc = def.scale[0] + rng() * (def.scale[1] - def.scale[0]);
      _e.set(0, rng() * Math.PI * 2, 0);
      _q.setFromEuler(_e);
      if (key === 'grass') {
        _s.set(sc * (.78 + rng() * .34), sc * (.84 + rng() * .34), sc * (.78 + rng() * .34));
      } else {
        _s.set(sc, sc, sc);
      }
      _m.compose(_p.set(x, h - 0.05, z), _q, _s);
      mesh.setMatrixAt(placed, _m);
      crown?.setMatrixAt(placed, _m);

      if (def.tint === 'region') {
        // grass takes the local terrain hue so borders blend
        let r = 0.2, g = 0.32, b = 0.14;
        const rw = regionWeights(x, z);
        if (groundCoverTexture) {
          r = .90 * rw.vale + .70 * rw.ember + .76 * rw.frost + .64 * rw.mycel + .78 * rw.shatter;
          g = 1.00 * rw.vale + .52 * rw.ember + .68 * rw.frost + .84 * rw.mycel + .68 * rw.shatter;
          b = .86 * rw.vale + .36 * rw.ember + .72 * rw.frost + .75 * rw.mycel + .92 * rw.shatter;
        } else {
          r = 0.32 * rw.vale + 0.44 * rw.ember + 0.52 * rw.frost + 0.16 * rw.mycel + 0.31 * rw.shatter;
          g = 0.58 * rw.vale + 0.25 * rw.ember + 0.68 * rw.frost + 0.46 * rw.mycel + 0.31 * rw.shatter;
          b = 0.31 * rw.vale + 0.16 * rw.ember + 0.73 * rw.frost + 0.38 * rw.mycel + 0.52 * rw.shatter;
        }
        _c.setRGB(r * (0.86 + rng() * 0.28), g * (0.86 + rng() * 0.28), b * (0.86 + rng() * 0.28));
        mesh.setColorAt(placed, _c);
      } else if (def.tint === 'flower') {
        const fc = FLOWER_COLORS[(rng() * FLOWER_COLORS.length) | 0];
        _c.setRGB(fc[0], fc[1], fc[2]);
        mesh.setColorAt(placed, _c);
      } else if (def.tint) {
        _c.setHSL(0.08 + rng() * 0.05, 0.08 + rng() * 0.1, 0.46 + rng() * 0.18);
        mesh.setColorAt(placed, _c);
      } else if (!groundCover) {
        // Subtle organism-to-organism variation keeps groves from reading as
        // cloned meshes while preserving each biome's authored palette.
        const v = .86 + rng() * .18;
        _c.setRGB(v * (.98 + rng() * .04), v, v * (.96 + rng() * .05));
        mesh.setColorAt(placed, _c);
        const crownLift = key === 'pine' ? 1.28 : (key === 'shroom' ? 1.30 : 1.07);
        crown?.setColorAt(placed, _c.setRGB(
          crownLift * (.86 + rng() * .13),
          crownLift * (.88 + rng() * .12),
          crownLift * (.84 + rng() * .13),
        ));
      }

      if (def.collider && sc > 0.75) {
        collide.addCircle(x, z, def.collider * sc, h - 1, h + def.colliderH * sc);
      }
      placed++;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
    if (crown) {
      crown.count = placed;
      crown.instanceMatrix.needsUpdate = true;
      if (crown.instanceColor) crown.instanceColor.needsUpdate = true;
      crown.matrixAutoUpdate = false;
      scene.add(crown);
    }
  }
}
