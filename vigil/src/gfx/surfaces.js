// Deterministic, synchronous material detail.  VIGIL never streams during a
// run, so its physical surface maps are generated once at boot and immediately
// available for shader warm-up.

import * as THREE from 'three';

const metalCache = new Map();
const lunarCache = new Map();
let lunarSourceImage = null;

/**
 * Prime the arena's authored regolith scan before systems are constructed.
 * Boot awaits the image, so the world is still whole-at-boot and never swaps
 * materials under the player during a run.
 */
export function setLunarSurfaceSource(image) {
  lunarSourceImage = image || null;
  lunarCache.clear();
}

function randomFactory(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function textureFrom(canvas, { color = false, repeat = 1 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  if (color) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function remapCanvas(source, low, high, invert = false) {
  const c = document.createElement('canvas');
  c.width = source.width; c.height = source.height;
  const g = c.getContext('2d');
  g.drawImage(source, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    let l = (img.data[i] + img.data[i + 1] + img.data[i + 2]) / (3 * 255);
    if (invert) l = 1 - l;
    const v = Math.round(low + (high - low) * l);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function metalCanvas(size, seed) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const rnd = randomFactory(seed);
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const brushed = Math.sin(y * 0.67 + Math.sin(x * 0.043) * 3.0) * 5;
      const grain = (rnd() + rnd() + rnd() - 1.5) * 14;
      const panel = ((x % 128) < 3 || (y % 128) < 3) ? -22 : 0;
      const v = Math.max(78, Math.min(235, 196 + brushed + grain + panel));
      img.data[i] = v;
      img.data[i + 1] = Math.min(255, v + 4);
      img.data[i + 2] = Math.min(255, v + 9);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  g.globalAlpha = 0.24;
  for (let i = 0; i < 180; i++) {
    const x = rnd() * size, y = rnd() * size;
    const len = 8 + rnd() * 70;
    g.strokeStyle = rnd() > 0.18 ? '#f3f7ff' : '#18202c';
    g.lineWidth = 0.35 + rnd() * 0.75;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y + (rnd() - 0.5) * 1.5);
    g.stroke();
  }
  g.globalAlpha = 1;
  return c;
}

function lunarCanvas(size, seed) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (lunarSourceImage) {
    g.drawImage(lunarSourceImage, 0, 0, size, size);
    return c;
  }
  const rnd = randomFactory(seed);
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const broad = Math.sin(x * 0.031) * 6 + Math.sin((x + y) * 0.071) * 4;
      const grain = (rnd() + rnd() + rnd() + rnd() - 2) * 19;
      const v = Math.max(54, Math.min(210, 142 + broad + grain));
      img.data[i] = v;
      img.data[i + 1] = Math.min(255, v + 5);
      img.data[i + 2] = Math.min(255, v + 12);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 210; i++) {
    const x = rnd() * size, y = rnd() * size;
    const r = 0.8 + Math.pow(rnd(), 2.2) * 9;
    const grad = g.createRadialGradient(x - r * 0.22, y - r * 0.22, r * 0.08, x, y, r);
    grad.addColorStop(0, 'rgba(28,31,40,0.62)');
    grad.addColorStop(0.62, 'rgba(72,77,89,0.22)');
    grad.addColorStop(0.80, 'rgba(232,238,246,0.22)');
    grad.addColorStop(1, 'rgba(116,121,132,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // Fine ejecta scratches make grazing light read without geometric noise.
  g.globalAlpha = 0.18;
  for (let i = 0; i < 120; i++) {
    const x = rnd() * size, y = rnd() * size, a = rnd() * Math.PI * 2;
    const len = 4 + rnd() * 22;
    g.strokeStyle = rnd() > 0.5 ? '#eef2f7' : '#202631';
    g.lineWidth = 0.45;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
  }
  g.globalAlpha = 1;
  return c;
}

export function createMetalSurface(seed = 0x31a51) {
  if (metalCache.has(seed)) return metalCache.get(seed);
  const canvas = metalCanvas(512, seed);
  const surface = {
    color: textureFrom(canvas, { color: true, repeat: 3 }),
    bump: textureFrom(canvas, { repeat: 3 }),
    roughness: textureFrom(remapCanvas(canvas, 118, 232, true), { repeat: 3 }),
  };
  metalCache.set(seed, surface);
  return surface;
}

export function createLunarSurface(seed = 0x71a11) {
  if (lunarCache.has(seed)) return lunarCache.get(seed);
  const canvas = lunarCanvas(512, seed);
  const surface = {
    color: textureFrom(canvas, { color: true, repeat: 96 }),
    bump: textureFrom(canvas, { repeat: 96 }),
    roughness: textureFrom(remapCanvas(canvas, 220, 255), { repeat: 96 }),
  };
  lunarCache.set(seed, surface);
  return surface;
}
