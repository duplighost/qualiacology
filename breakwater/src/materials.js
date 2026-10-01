import * as THREE from 'three';

// Photographic, local PBR sources and conversions are recorded in
// assets/textures/sources.json and CREDITS.md. Color is sRGB; every other map
// contains linear surface data. There are no network/CDN dependencies.
const SURFACES = {
  concrete:      { roughness: 1, metalness: 0, normal: 0.62 },
  concreteClean: { roughness: 1, metalness: 0, normal: 0.44 },
  steel:         { roughness: 0.9, metalness: 1, normal: 0.8 },
  rust:          { roughness: 1, metalness: 0.32, normal: 0.75 },
  brick:         { roughness: 1, metalness: 0, normal: 0.82 },
  stone:         { roughness: 1, metalness: 0, normal: 0.8 },
  marble:        { roughness: 0.68, metalness: 0, normal: 0.25 },
  wood:          { roughness: 1, metalness: 0, normal: 0.6 },
  snow:          { roughness: 1, metalness: 0, normal: 0.48 },
  dark:          { roughness: 0.88, metalness: 0.9, normal: 0.52 },
  soil:          { roughness: 1, metalness: 0, normal: 0.85 },
  grass:         { roughness: 1, metalness: 0, normal: 0.75 },
  moss:          { roughness: 1, metalness: 0, normal: 0.7 },
  bark:          { roughness: 1, metalness: 0, normal: 0.75 },
  plaster:       { roughness: 1, metalness: 0, normal: 0.4 },
  brass:         { roughness: 0.78, metalness: 1, normal: 0.45, color: 0xd5b982 },
  patina:        { source: 'brass', roughness: 0.95, metalness: 0.55, normal: 0.6, color: 0x649790 },
  paint:         { source: 'brass', roughness: 0.83, metalness: 0.22, normal: 0.3, color: 0x8da2a3 },
  leaf:          { roughness: 1, metalness: 0, normal: 0.35, alphaTest: 0.47, side: THREE.DoubleSide },
  glass:         { untextured: true, color: 0xb5d7d8, roughness: 0.12, metalness: 0.22, transparent: true, opacity: 0.2, depthWrite: false },
  water:         { normalOnly: true, color: 0x22545c, roughness: 0.2, metalness: 0.38, normal: 0.48, transparent: true, opacity: 0.84, depthWrite: false },
  emissive:      { untextured: true, color: 0xffbd75, roughness: 0.52, metalness: 0.05, emissive: 0xffbd75, emissiveIntensity: 1.7 },
};

const ALIASES = {
  concreteclean: 'concreteClean', wetConcrete: 'concrete', wetStone: 'stone',
  copper: 'patina', foliage: 'leaf', ground: 'soil', iron: 'dark', metal: 'steel',
};

function colorKey(value) {
  if (value?.isColor) return `color:${value.r},${value.g},${value.b}`;
  return value ?? null;
}

function colorValue(value) {
  return value?.isColor ? value.clone() : new THREE.Color(value);
}

/**
 * Load shared images once, then build cached material/UV variants on demand.
 * Texture clones share image storage; callers must treat returned materials as
 * immutable (call get with new opts for another surface). Missing files degrade
 * to physically reasonable solids and remain visible in the returned errors.
 */
export async function createMaterials(renderer) {
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.max(1, Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  const originals = new Map();
  const variants = new Map();
  const materials = new Map();
  const errors = [];
  let disposed = false;

  const sources = [...new Set(Object.entries(SURFACES)
    .filter(([, v]) => !v.untextured)
    .map(([name, v]) => v.source || name))];

  const requests = sources.flatMap(name => {
    const kinds = name === 'water' ? ['normal'] : ['color', 'normal', 'orm'];
    return kinds.map(async kind => {
      const path = `assets/textures/${name}.${kind}.webp`;
      try {
        const texture = await loader.loadAsync(new URL(`../${path}`, import.meta.url).href);
        texture.name = `${name}.${kind}`;
        texture.colorSpace = kind === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = texture.wrapT = name === 'leaf' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
        texture.anisotropy = anisotropy;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.channel = 0;
        originals.set(`${name}:${kind}`, texture);
      } catch (error) {
        errors.push({ path, message: String(error?.message || error) });
      }
    });
  });
  const ready = Promise.all(requests);
  await ready;
  if (errors.length) console.warn('BREAKWATER: some surface maps could not load; using material fallbacks.', errors);

  function textureFor(source, kind, repeat) {
    const texture = originals.get(`${source}:${kind}`);
    if (!texture) return null;
    const key = `${source}:${kind}:${repeat[0]},${repeat[1]}`;
    if (variants.has(key)) return variants.get(key);
    const variant = texture.clone();
    variant.name = `${texture.name}@${repeat[0]},${repeat[1]}`;
    variant.repeat.set(repeat[0], repeat[1]);
    variant.needsUpdate = true;
    variants.set(key, variant);
    return variant;
  }

  function get(requestedName, opts = {}) {
    if (disposed) throw new Error('BREAKWATER materials have been disposed.');
    const name = SURFACES[requestedName] ? requestedName : ALIASES[requestedName] || 'concrete';
    const base = SURFACES[name];
    const source = base.source || name;
    const rawRepeat = Array.isArray(opts.repeat) ? opts.repeat : [opts.repeat ?? 1, opts.repeat ?? 1];
    const repeat = rawRepeat.map(v => Number.isFinite(v) ? Math.max(0.001, v) : 1);
    const options = {
      color: opts.color ?? base.color ?? 0xffffff,
      roughness: opts.roughness ?? base.roughness,
      metalness: opts.metalness ?? base.metalness,
      emissive: opts.emissive ?? (name === 'emissive' ? opts.color ?? base.emissive : 0x000000),
      emissiveIntensity: opts.emissiveIntensity ?? base.emissiveIntensity ?? 1,
      transparent: opts.transparent ?? base.transparent ?? false,
      opacity: opts.opacity ?? base.opacity ?? 1,
      side: opts.side ?? base.side ?? THREE.FrontSide,
    };
    const key = JSON.stringify([name, repeat, ...Object.values(options).map(colorKey)]);
    if (materials.has(key)) return materials.get(key);

    const material = new THREE.MeshStandardMaterial({
      ...options,
      color: colorValue(options.color),
      emissive: colorValue(options.emissive),
      alphaTest: base.alphaTest ?? 0,
      alphaToCoverage: !!base.alphaTest,
      depthWrite: options.transparent ? (base.depthWrite ?? false) : true,
    });
    material.name = `BREAKWATER/${name}`;
    material.userData.surface = name;
    material.userData.repeat = repeat;
    if (!base.untextured) {
      const normal = textureFor(source, 'normal', repeat);
      if (normal) {
        material.normalMap = normal;
        material.normalScale.set(base.normal ?? 0.6, base.normal ?? 0.6);
      }
      if (!base.normalOnly) {
        material.map = textureFor(source, 'color', repeat);
        const orm = textureFor(source, 'orm', repeat);
        if (orm) {
          material.aoMap = orm;
          material.aoMapIntensity = 0.75;
          material.roughnessMap = orm;
          // A completely dielectric map can still be used on newly painted
          // machinery without accidentally cancelling a requested scalar metal.
          if (!['paint', 'patina'].includes(name)) material.metalnessMap = orm;
        }
      }
    }
    materials.set(key, material);
    return material;
  }

  return {
    get,
    ready,
    errors,
    names: Object.keys(SURFACES),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const material of materials.values()) material.dispose();
      for (const texture of new Set([...variants.values(), ...originals.values()])) texture.dispose();
      materials.clear();
      variants.clear();
      originals.clear();
    },
  };
}
