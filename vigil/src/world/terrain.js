// Analytic lunar terrain. THE contract (Duskfall keystone): terrainHeight(x,z)
// is a pure function; the render mesh is BUILT from it, and player, enemies,
// brass, and hitscan all sample the same function — nothing can disagree
// about where the ground is.

import * as THREE from 'three';
import { clamp, clamp01, lerp, smoothstep } from '../engine/math.js';

export const PLAY_RADIUS = 82;
const SIZE = 420;
const SEG = 192;
const SEED = 20260821;

/* 2-D value noise, deterministic */
function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263 + SEED * 2246822519) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uz) * 2 - 1;
}

const CRATERS = [
  { x: -46, z: 30, r: 13, d: 2.6 },
  { x: 52, z: -38, r: 16, d: 3.1 },
  { x: 30, z: 55, r: 10, d: 2.0 },
  { x: -58, z: -44, r: 12, d: 2.4 },
  { x: 5, z: -66, r: 9, d: 1.8 },
  { x: -22, z: 64, r: 8, d: 1.5 },
];

export function terrainHeight(x, z) {
  const d = Math.hypot(x, z);
  // the fighting field must stay readable: big rolling swells fade in only
  // toward the rim, so a 2.4 m warden can never hide behind the ground at 8 m
  const roll = smoothstep(30, 62, d);
  let h = 0.6
    + vnoise(x * 0.013, z * 0.013) * 11.0 * lerp(0.10, 1.0, roll)
    + vnoise(x * 0.035 + 37.2, z * 0.035 - 11.8) * 5.2 * lerp(0.18, 1.0, roll)
    + vnoise(x * 0.11 - 8.1, z * 0.11 + 21.4) * 0.72;
  for (const c of CRATERS) {
    const cd = Math.hypot(x - c.x, z - c.z);
    if (cd < c.r) {
      const t = cd / c.r;
      h -= c.d * (1 - t * t) * (1 - t * t);
    }
  }
  // Flatten the inner bowl completely, out PAST the ramp feet (x=26 + apron):
  // the ramps must land on level ground, and a horde needs a clean fighting
  // bowl rather than swells that hide a charging warden.
  const flat = smoothstep(29, 46, d);
  h = lerp(0.30, h, flat);
  // CAPPED rim fence past playRadius — capped so the rim reads as a valley
  // edge with real sky above it, never a fogged wall that becomes the sky.
  if (d > PLAY_RADIUS) {
    h += Math.min(((d - PLAY_RADIUS) / 25) ** 2 * 13, 24);
  }
  return h;
}

/* lunar mineral palette, blended by height/slope via vertex colors */
const MINERALS = [
  new THREE.Color(0x6b7079), new THREE.Color(0x9299a5), new THREE.Color(0x4a4f59),
  new THREE.Color(0x6a6560), new THREE.Color(0x39495b), new THREE.Color(0x252934),
];

function lunarTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#6d727b';
  g.fillRect(0, 0, 256, 256);
  let s = SEED;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < 5200; i++) {
    const v = 88 + rnd() * 72 | 0;
    g.fillStyle = `rgba(${v},${v + 4 | 0},${v + 10 | 0},${0.16 + rnd() * 0.3})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
  }
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 256, y = rnd() * 256, r = 2 + rnd() * 6;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(30,33,42,0.35)');
    grad.addColorStop(0.7, 'rgba(122,128,140,0.18)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(72, 72);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildTerrain() {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    // slope from cheap finite difference
    const sl = Math.abs(terrainHeight(x + 1.5, z) - h) + Math.abs(terrainHeight(x, z + 1.5) - h);
    const hn = clamp01((h + 6) / 26);
    const a = MINERALS[Math.floor(clamp(hn * 3.99, 0, 3))];
    const b = MINERALS[sl > 1.6 ? 5 : sl > 0.8 ? 4 : 1];
    col.copy(a).lerp(b, clamp01(sl * 0.55));
    const tint = 0.78 + vnoise(x * 0.21, z * 0.21) * 0.12;
    colors[i * 3] = col.r * tint;
    colors[i * 3 + 1] = col.g * tint;
    colors[i * 3 + 2] = col.b * tint;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: lunarTexture(), vertexColors: true, roughness: 0.91, metalness: 0.08,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  // NEVER raycast this ~74k-tri heightfield: hitscan marches terrainHeight
  // analytically (Duskfall's 125 ms shotgun-hitch receipt).
  mesh.raycast = () => {};
  return mesh;
}
