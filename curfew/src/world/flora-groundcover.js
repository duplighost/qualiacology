import * as THREE from 'three';
import { foliageMipChain } from './flora-atlas.js';

function hashI(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Separate silhouettes, with real gutters through the mip chain. All colours
// are neutral linear diffuse: the biome's instance tint supplies the hue once.
export const GROUND_CELLS = Object.freeze([
  { x: .025, y: .525, w: .45, h: .45 },
  { x: .525, y: .525, w: .45, h: .45 },
  { x: .025, y: .025, w: .45, h: .45 },
  { x: .525, y: .025, w: .45, h: .45 },
]);
const gray = v => { const k = Math.round(v); return `rgb(${k},${k},${k})`; };

function grass(g, variant) {
  const S = 9217 + variant * 373;
  // Fine upright leaves and shorter arching leaves emerge from different roots.
  // Filled tapered curves keep thickness near the soil without white wire tips.
  for (let i = 0; i < 57; i++) {
    const x = 16 + hashI(i, 1, S) * 96;
    const top = 7 + hashI(i, 2, S) ** 1.25 * 74;
    const bend = (hashI(i, 3, S) - .5) * (variant ? 69 : 54);
    const tipX = Math.max(4, Math.min(124, x + bend));
    const w = 1.1 + hashI(i, 4, S) * 2.1;
    const shade = 123 + hashI(i, 5, S) * 85;
    const gradient = g.createLinearGradient(0, 124, 0, top);
    gradient.addColorStop(0, gray(shade * .32));
    gradient.addColorStop(.34, gray(shade * .68));
    gradient.addColorStop(1, gray(shade));
    g.fillStyle = gradient;
    g.beginPath(); g.moveTo(x - w * .5, 126);
    g.bezierCurveTo(x - w * .3, 97, tipX - bend * .35, top + 9, tipX, top);
    g.bezierCurveTo(tipX - bend * .22, top + 17, x + w * .9, 95, x + w * .5, 126);
    g.fill();
    if (i % 17 === 3) {
      // Sparse seed heads stay subordinate to the leaves.
      g.strokeStyle = gray(shade * .74); g.lineWidth = .38;
      for (let seed = 0; seed < 7; seed++) {
        const y = top + 1 + seed * 1.1;
        g.beginPath(); g.moveTo(tipX, y);
        g.lineTo(tipX + (seed % 2 ? 1 : -1) * 1.7, y - 2.1); g.stroke();
      }
    }
  }
}

function fern(g, variant) {
  const S = 7411 + variant * 391;
  g.lineCap = 'round';
  g.strokeStyle = gray(106); g.lineWidth = .95;
  g.beginPath(); g.moveTo(63, 127); g.quadraticCurveTo(58, 68, 68, 6); g.stroke();
  for (let row = 0; row < 20; row++) {
    const t = row / 20, sy = 116 - row * 5.35;
    const sx = 63 - Math.sin(t * Math.PI) * 3 + t * 5;
    for (const side of [-1, 1]) {
      const length = (41 + hashI(row, side + 4, S) * 11) * (1 - t * .86);
      const lift = 8 + t * 8 + hashI(row, side + 9, S) * 3;
      const shade = 122 + t * 51 + hashI(row, side + 15, S) * 25;
      g.strokeStyle = gray(shade * .7); g.lineWidth = .55;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + side * length, sy - lift); g.stroke();
      const count = Math.max(4, Math.round(length / 3.9));
      // Each pinna splits into individual curved pinnules. Open gaps survive
      // in alpha; there is no triangular membrane beneath these leaflets.
      for (let j = 1; j <= count; j++) {
        const u = j / (count + 1), px = sx + side * length * u, py = sy - lift * u;
        for (const edge of [-1, 1]) {
          const reach = (2.2 + Math.sin(u * Math.PI) * 3.5) * (1 - t * .44);
          const ex = px + side * 2.5, ey = py + edge * reach - 1.1;
          g.fillStyle = gray(shade * (.87 + hashI(j + row * 21, edge + 3, S) * .13));
          g.beginPath(); g.moveTo(px, py);
          g.quadraticCurveTo(px + side * 1.5, py + edge * reach * .8, ex, ey);
          g.quadraticCurveTo(px + side * 3.2, py + edge * reach * .4, px, py);
          g.fill();
        }
      }
    }
  }
}

export function makeGroundCoverTexture() {
  const size = 1024;
  let rgba;
  if (typeof document !== 'undefined' && document.createElement) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const g = cv.getContext('2d');
    for (let i = 0; i < 4; i++) {
      const c = GROUND_CELLS[i];
      g.save();
      g.translate(c.x * size, (1 - c.y - c.h) * size);
      g.scale(c.w * size / 128, c.h * size / 128);
      if (i < 2) grass(g, i); else fern(g, i - 2);
      g.restore();
    }
    rgba = new Uint8Array(g.getImageData(0, 0, size, size).data);
  } else {
    // Geometry/streaming checks run without a DOM; no browser is started here.
    rgba = new Uint8Array(size * size * 4);
    for (const c of GROUND_CELLS) {
      for (let y = Math.ceil((1 - c.y - c.h) * size); y < (1 - c.y) * size; y++) {
        for (let x = Math.ceil(c.x * size); x < (c.x + c.w) * size; x++) {
          const o = (y * size + x) * 4;
          rgba[o] = rgba[o + 1] = rgba[o + 2] = 160;
          rgba[o + 3] = (x + Math.round(Math.sin(y * .06) * 6)) % 17 < 4 ? 255 : 0;
        }
      }
    }
  }
  const mips = foliageMipChain(rgba, size, size, GROUND_CELLS);
  const tex = new THREE.DataTexture(mips[0].data, size, size, THREE.RGBAFormat);
  tex.name = 'county-groundcover-alpha';
  tex.flipY = true; tex.mipmaps = mips; tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4; tex.colorSpace = THREE.NoColorSpace; tex.needsUpdate = true;
  return tex;
}
