import * as THREE from 'three';

// Authored, local CC0 scans. The material keeps a procedural fallback and the
// sampler slots exist before shader warmup, so loading never adds a program.
export async function loadScannedSurface(id, renderer) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const loader = new THREE.TextureLoader();
  const base = new URL('../../assets/materials/', import.meta.url);
  const result = await Promise.allSettled(['albedo', 'height'].map((channel) =>
    loader.loadAsync(new URL(id + '-' + channel + '.jpg', base).href)));
  if (result.some((r) => r.status !== 'fulfilled')) {
    for (const r of result) if (r.status === 'fulfilled') r.value.dispose();
    throw new Error('material scan unavailable: ' + id);
  }
  const [albedo, height] = result.map((r) => r.value);
  const anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  for (const map of [albedo, height]) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.magFilter = THREE.LinearFilter;
    map.anisotropy = anisotropy;
  }
  albedo.colorSpace = THREE.SRGBColorSpace;
  height.colorSpace = THREE.NoColorSpace;
  // Normalise only the average, retaining real fissures, moss and grain. The
  // county's vertex colours still control biome/light balance in every phase.
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(albedo.image, 0, 0, 64, 64);
  const pixels = g.getImageData(0, 0, 64, 64).data;
  const mean = new THREE.Vector3();
  const linear = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  for (let i = 0; i < pixels.length; i += 4) {
    mean.x += linear(pixels[i]); mean.y += linear(pixels[i + 1]); mean.z += linear(pixels[i + 2]);
  }
  mean.multiplyScalar(1 / (64 * 64));
  mean.max(new THREE.Vector3(0.02, 0.02, 0.02));
  return { albedo, height, mean, dispose() { albedo.dispose(); height.dispose(); } };
}
