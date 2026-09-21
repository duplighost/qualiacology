import * as THREE from 'three';
import { coveragePreservingChain } from './impostors.js';
import { drawConiferBough } from './flora-conifer.js';

// Spruce, fir, birch and oak. The bark band remains above v=0.82; generous
// transparent gutters prevent its opaque texels bleeding into minified leaves.
export const FOLIAGE_CELLS = Object.freeze([
  { x: 0.025, y: 0.425, w: 0.45, h: 0.31 },
  { x: 0.525, y: 0.425, w: 0.45, h: 0.31 },
  { x: 0.025, y: 0.025, w: 0.45, h: 0.31 },
  { x: 0.525, y: 0.025, w: 0.45, h: 0.31 },
]);

export async function loadFoliageImage() {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const url = new URL('../../assets/foliage/county-foliage-v1.png', import.meta.url);
  return new THREE.ImageLoader().loadAsync(url.href);
}

function cellBounds(cell, width, height) {
  return {
    x0: Math.ceil(cell.x * width), x1: Math.floor((cell.x + cell.w) * width),
    y0: Math.ceil((1 - cell.y - cell.h) * height), y1: Math.floor((1 - cell.y) * height),
  };
}

function cellCoverage(data, width, bounds, scale = 1) {
  let covered = 0, count = 0;
  for (let y = bounds.y0; y < bounds.y1; y++) for (let x = bounds.x0; x < bounds.x1; x++) {
    if (data[(y * width + x) * 4 + 3] * scale >= 77) covered++;
    count++;
  }
  return count ? covered / count : 0;
}

export function foliageMipChain(base, width, height, cells = FOLIAGE_CELLS) {
  const mips = coveragePreservingChain(base, width, height, 0.30 * 255);
  const targets = cells.map(c => cellCoverage(base, width, cellBounds(c, width, height)));
  // A single atlas-wide target lets the opaque bark band and denser oak leaves
  // fatten each other's mips. Preserve each species' own open silhouette instead.
  for (let level = 1; level < mips.length; level++) {
    const m = mips[level];
    for (let cell = 0; cell < cells.length; cell++) {
      const bounds = cellBounds(cells[cell], m.width, m.height);
      if ((bounds.x1 - bounds.x0) * (bounds.y1 - bounds.y0) < 9) continue;
      let lo = 0.25, hi = 4;
      for (let i = 0; i < 12; i++) {
        const scale = (lo + hi) * 0.5;
        if (cellCoverage(m.data, m.width, bounds, scale) > targets[cell]) hi = scale;
        else lo = scale;
      }
      const scale = (lo + hi) * 0.5;
      for (let y = bounds.y0; y < bounds.y1; y++) for (let x = bounds.x0; x < bounds.x1; x++) {
        const a = (y * m.width + x) * 4 + 3;
        m.data[a] = Math.min(255, Math.round(m.data[a] * scale));
      }
    }
  }
  return mips;
}

/** Pack the selected diffuse sprites and existing bark into one material map. */
export function packFoliageAtlas(proceduralCanvas, authoredImage = null) {
  const size = authoredImage ? 2048 : 1024;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const sourceSize = proceduralCanvas.width;
  g.drawImage(proceduralCanvas, 0, 0, sourceSize, sourceSize * 0.1875,
    0, 0, size, size * 0.1875);
  let authoredCoverage = 0, authoredPixels = 0;
  for (let i = 0; i < FOLIAGE_CELLS.length; i++) {
    const c = FOLIAGE_CELLS[i];
    const x = Math.round(c.x * size), y = Math.round((1 - c.y - c.h) * size);
    const w = Math.round(c.w * size), h = Math.round(c.h * size);
    if (authoredImage) {
      const sw = authoredImage.width / 2, sh = authoredImage.height / 2;
      g.drawImage(authoredImage, (i % 2) * sw, Math.floor(i / 2) * sh, sw, sh, x, y, w, h);
      const image = g.getImageData(x, y, w, h), p = image.data;
      let weightedMean = 0, weight = 0;
      for (let k = 0; k < p.length; k += 4) {
        const a = p[k + 3] / 255;
        weightedMean += (p[k] * 0.2126 + p[k + 1] * 0.7152 + p[k + 2] * 0.0722) * a;
        weight += a;
        authoredCoverage += p[k + 3] > 77 ? 1 : 0;
        authoredPixels++;
      }
      const mean = Math.max(1, weightedMean / Math.max(1, weight));
      // Vertex colours already author each biome's palette. Keep the photographic
      // vein/needle contrast without multiplying the foliage green a second time.
      // This is diffuse material calibration; the generated alpha stays intact.
      for (let k = 0; k < p.length; k += 4) {
        const luma = p[k] * 0.2126 + p[k + 1] * 0.7152 + p[k + 2] * 0.0722;
        const value = Math.min(255, Math.max(42, luma / mean * 202));
        p[k] = p[k + 1] = p[k + 2] = value;
      }
      g.putImageData(image, x, y);
    } else {
      // Original authored procedural sprites remain available offline/on failure.
      const sx = (i < 2 ? 0.03 : 0.53) * sourceSize;
      g.drawImage(proceduralCanvas, sx, 0.64 * sourceSize, 0.44 * sourceSize, 0.34 * sourceSize,
        x, y, w, h);
    }
  }
  if (authoredImage && (authoredCoverage < authoredPixels * 0.08
    || authoredCoverage > authoredPixels * 0.92)) {
    throw new Error('foliage asset lacks a usable transparent silhouette');
  }
  const rgba = g.getImageData(0, 0, size, size).data;
  const mips = foliageMipChain(new Uint8Array(rgba), size, size);
  // Preserve bark and broadleaf bytes at EVERY level. The previous chain first
  // holds whole-atlas coverage, so changing a conifer's alpha before that pass
  // would also reshape the birch/oak mips. Generate the two new cells separately
  // and copy only their padded region into the completed, unchanged chain.
  const needleCanvas = document.createElement('canvas');needleCanvas.width=needleCanvas.height=size;
  const ng = needleCanvas.getContext('2d',{willReadFrequently:true});
  for (let i=0;i<2;i++) {
    const c=FOLIAGE_CELLS[i],x=Math.round(c.x*size),y=Math.round((1-c.y-c.h)*size);
    const w=Math.round(c.w*size),h=Math.round(c.h*size);
    ng.save();ng.translate(x,y);ng.scale(w/1024,h/1024);drawConiferBough(ng,i);ng.restore();
    g.clearRect(x,y,w,h);g.drawImage(needleCanvas,x,y,w,h,x,y,w,h);
  }
  const needleMips=foliageMipChain(new Uint8Array(ng.getImageData(0,0,size,size).data),size,size,FOLIAGE_CELLS.slice(0,2));
  for(let level=0;level<mips.length&&mips[level].width>=8;level++) {
    const m=mips[level],fresh=needleMips[level];
    for(const c of FOLIAGE_CELLS.slice(0,2)) {
      const x0=Math.floor(c.x*m.width),x1=Math.ceil((c.x+c.w)*m.width);
      const y0=Math.floor((1-c.y-c.h)*m.height),y1=Math.ceil((1-c.y)*m.height);
      for(let y=y0;y<y1;y++) {
        const a=(y*m.width+x0)*4,b=(y*m.width+x1)*4;
        m.data.set(fresh.data.subarray(a,b),a);
      }
    }
  }
  // Below eight square texels the species share texels; retain that common tail.
  // The near/mid geometry is already subpixel there; distant trees use impostors.
  const tex = new THREE.DataTexture(mips[0].data, size, size, THREE.RGBAFormat);
  tex.flipY = true;
  tex.generateMipmaps = false;
  tex.mipmaps = mips;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.userData.sourceCanvas = canvas;
  tex.userData.authored = !!authoredImage;
  tex.userData.proceduralConifers = true;
  tex.name = authoredImage ? 'county-branch-and-leaf-atlas' : 'county-procedural-foliage-atlas';
  tex.needsUpdate = true;
  return tex;
}
