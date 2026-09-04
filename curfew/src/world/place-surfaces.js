// CURFEW — destination surfaces.
//
// Destination geometry is intentionally assembled from a small, cheap procedural kit, but
// cheap geometry must not mean blank prototype walls. This module supplies seven deterministic
// sampled materials and projects their UVs in metres so a forty-metre cathedral wall has many
// courses while a door still has recognisable grain. The maps are shared; per-site material clones
// reuse those textures and the mapped shader variants that places.js warms at boot.

import * as THREE from 'three';

const SIZE = 256;
const TAU = Math.PI * 2;

const STYLE_BY_KIND = Object.freeze({
  station: 'industrial',
  manor: 'plaster',
  avery: 'avery',
  works: 'stone',
  relay: 'metal',
  cathedral: 'stone',
  chapel: 'timber',
  steeple: 'timber',
  lighthouse: 'salt',
  mill: 'timber',
  cemetery: 'mossStone',
  tower: 'stone',
  barn: 'timber',
  stones: 'mossStone',
  'great-tree': 'timber',
  'rock-arch': 'stone',
});

function wrap(v, n) { return ((v % n) + n) % n; }

function hash2(x, y, salt = 0) {
  let n = Math.imul((x | 0) + 0x51ed + salt, 0x45d9f3b) ^
    Math.imul((y | 0) - 0x6c8e - salt, 0x119de1f3);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967295;
}

function smooth(t) { return t * t * (3 - 2 * t); }

/** Seamless bilinear value noise. `cells` must divide SIZE. */
function valueNoise(x, y, cells, salt) {
  const cell = SIZE / cells;
  const gx = x / cell, gy = y / cell;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = smooth(gx - x0), fy = smooth(gy - y0);
  const a = hash2(wrap(x0, cells), wrap(y0, cells), salt);
  const b = hash2(wrap(x0 + 1, cells), wrap(y0, cells), salt);
  const c = hash2(wrap(x0, cells), wrap(y0 + 1, cells), salt);
  const d = hash2(wrap(x0 + 1, cells), wrap(y0 + 1, cells), salt);
  const ab = a + (b - a) * fx;
  const cd = c + (d - c) * fx;
  return ab + (cd - ab) * fy;
}

function clampByte(v) { return Math.max(16, Math.min(255, Math.round(v))); }

function writePixel(data, x, y, rgb) {
  const i = (y * SIZE + x) * 4;
  data[i] = clampByte(rgb[0]);
  data[i + 1] = clampByte(rgb[1]);
  data[i + 2] = clampByte(rgb[2]);
  data[i + 3] = 255;
}

function stonePixel(x, y, moss) {
  const rowH = 28;
  const row = Math.floor(y / rowH);
  const yy = y % rowH;
  const shift = (row & 1) * 31;
  const xx = wrap(x + shift, 62);
  const mortar = yy < 3 || xx < 3;
  const broad = valueNoise(x, y, 8, 11);
  const chip = valueNoise(x, y, 32, 29);
  // Keep old exterior stone below chalk-white so the torch reveals courses and damp
  // instead of bleaching a whole wall into one flat rectangle.
  let v = 210 + (broad - 0.5) * 36 + (chip - 0.5) * 18;
  if (mortar) v = 108 + broad * 35;
  if (!mortar && chip > 0.83) v -= 52;
  const damp = Math.max(0, valueNoise(x, y, 4, 71) - 0.58) * 1.9;
  let r = v - damp * 72, g = v - damp * 62, b = v - damp * 54;
  if (moss) {
    const growth = Math.max(0, valueNoise(x, y, 8, 113) - 0.55) * 2.2;
    r -= growth * 105; g -= growth * 55; b -= growth * 94;
  }
  return [r, g, b];
}

function timberPixel(x, y) {
  const boardH = 32;
  const row = Math.floor(y / boardH);
  const edge = y % boardH;
  const broad = valueNoise(x, y, 8, 17);
  const grainNoise = valueNoise(x, y, 32, 43);
  const grain = Math.sin((x + 17 * broad + 5 * Math.sin(y * 0.12)) * 0.24);
  let v = 208 + (broad - 0.5) * 28 + grain * 10 + (grainNoise - 0.5) * 15;
  if (edge < 3) v = 70 + broad * 34;
  else if (edge < 6) v -= 38;
  const join = wrap(x + (row & 1) * 67, 131);
  if (join < 3 && edge > 5) v -= 76;
  // Peeling paint exposes brown, wet timber in irregular islands rather than as confetti.
  const peel = valueNoise(x, y, 16, 97);
  if (peel > 0.70 && edge > 5) {
    const p = Math.min(1, (peel - 0.70) * 4.2);
    return [v - 88 * p, v - 105 * p, v - 124 * p];
  }
  return [v, v - 4, v - 8];
}

function metalPixel(x, y, industrial) {
  const rib = 0.5 + 0.5 * Math.cos(TAU * x / 18);
  const broad = valueNoise(x, y, 8, 23);
  const pits = valueNoise(x, y, 32, 89);
  let v = 194 + rib * 34 + (broad - 0.5) * 21;
  if (wrap(x, 64) < 3) v -= 63;
  if (pits > 0.82) v -= 43;
  const source = Math.max(0, valueNoise(x, 0, 16, 157) - 0.61) * 2.55;
  const drip = source * (0.35 + 0.65 * y / SIZE) *
    (0.72 + 0.28 * Math.sin(y * 0.19 + x));
  const rust = Math.min(1, Math.max(0, valueNoise(x, y, 16, 131) - 0.53) * 2.6 + drip);
  const soot = industrial ? Math.max(0, valueNoise(x, y, 4, 211) - 0.55) * 1.5 : 0;
  return [v - soot * 105, v - rust * 92 - soot * 111, v - rust * 142 - soot * 102];
}

function plasterPixel(x, y, salt) {
  const broad = valueNoise(x, y, 8, salt ? 181 : 31);
  const peel = valueNoise(x, y, 16, salt ? 229 : 67);
  const fine = hash2(x, y, salt ? 19 : 7);
  let v = 214 + (broad - 0.5) * 34 + (fine - 0.5) * 11;
  let r = v, g = v - 2, b = v - 4;
  if (peel > 0.67) {
    const p = Math.min(1, (peel - 0.67) * 4.6);
    r -= 90 * p; g -= 82 * p; b -= 72 * p;
  }
  // Hairline cracks fork at cell boundaries and are deliberately rare, long marks.
  const crack = Math.abs(wrap(x + y * 0.57 + Math.floor(broad * 41), 109) - 54.5);
  if (crack < 0.78 && peel > 0.47) { r -= 112; g -= 112; b -= 108; }
  const wet = Math.max(0, valueNoise(x, y, 4, 149) - (salt ? 0.48 : 0.61)) * 2.1;
  r -= wet * (salt ? 74 : 56);
  g -= wet * (salt ? 57 : 51);
  b -= wet * (salt ? 47 : 44);
  if (salt && fine > 0.975) { r = 254; g = 253; b = 246; }
  return [r, g, b];
}

function averyPixel(x, y) {
  const base = plasterPixel(x, y, false);
  const damp = Math.max(0, valueNoise(x, y, 4, 313) - 0.48) * 2.25;
  const source = Math.max(0, valueNoise(x, 0, 16, 379) - 0.62) * 2.7;
  const drip = source * (0.2 + 0.8 * y / SIZE);
  const lichen = Math.max(0, valueNoise(x, y, 16, 421) - 0.69) * 3.1;
  return [
    base[0] - 22 - damp * 52 - drip * 66 - lichen * 58,
    base[1] - 16 - damp * 34 - drip * 51 - lichen * 24,
    base[2] - 25 - damp * 46 - drip * 58 - lichen * 50,
  ];
}

function pixelFor(style, x, y) {
  if (style === 'timber') return timberPixel(x, y);
  if (style === 'stone') return stonePixel(x, y, false);
  if (style === 'mossStone') return stonePixel(x, y, true);
  if (style === 'metal') return metalPixel(x, y, false);
  if (style === 'industrial') return metalPixel(x, y, true);
  if (style === 'salt') return plasterPixel(x, y, true);
  if (style === 'avery') return averyPixel(x, y);
  return plasterPixel(x, y, false);
}

function makeTexture(style) {
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) writePixel(data, x, y, pixelFor(style, x, y));
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.name = 'place-surface-' + style;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createPlaceSurfaceLibrary() {
  const lib = Object.create(null);
  for (const style of ['timber', 'stone', 'mossStone', 'metal', 'industrial', 'plaster', 'salt', 'avery']) {
    lib[style] = makeTexture(style);
  }
  return lib;
}

export function placeSurfaceFor(lib, siteOrKind) {
  const kind = typeof siteOrKind === 'string' ? siteOrKind : siteOrKind && siteOrKind.kind;
  return lib[STYLE_BY_KIND[kind] || 'timber'];
}

/**
 * Replace primitive-local 0..1 UVs with metre-scaled box projection. Merged destination
 * kits retain per-face normals, so this stays stable across walls, roofs, towers and props.
 */
export function projectPlaceSurfaceUVs(geometry, metresPerTile = 4) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) return geometry;
  const pos = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  let uv = geometry.attributes.uv;
  if (!uv || uv.count !== pos.count) {
    uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    geometry.setAttribute('uv', uv);
  }
  const inv = 1 / Math.max(0.25, metresPerTile);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = normal ? Math.abs(normal.getX(i)) : 0;
    const ny = normal ? Math.abs(normal.getY(i)) : 1;
    const nz = normal ? Math.abs(normal.getZ(i)) : 0;
    if (ny >= nx && ny >= nz) uv.setXY(i, x * inv, -z * inv);
    else if (nx >= nz) uv.setXY(i, z * inv, y * inv);
    else uv.setXY(i, x * inv, y * inv);
  }
  uv.needsUpdate = true;
  return geometry;
}

export function disposePlaceSurfaceLibrary(lib) {
  if (!lib) return;
  for (const tex of Object.values(lib)) if (tex && typeof tex.dispose === 'function') tex.dispose();
}
