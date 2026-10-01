import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// The original 1K props and a reduced hero tree are shipped locally. Published
// checksums, preparation, creators and CC0 provenance live in assets/props/sources.json.
const ASSETS = Object.freeze({
  barrel: 'barrel_03',
  storageCart: 'industrial_storage_cart',
  gasTank: 'propane_tank',
  rock: 'rock_face_02',
  crate: 'wooden_crate_02',
  lamp: 'hanging_industrial_lamp',
  tree: 'quiver_tree_01',
});

/**
 * Preload the bounded prop library before building a World.
 *
 * Every template is in metres, centered in X/Z, with its lowest point at Y=0.
 * get(name) returns a fresh Object3D hierarchy; geometry, textures and materials
 * remain shared. place(name, { position: Vector3 | [x,y,z],
 * rotation: [x,y,z], scale: number }) applies an optional transform to a clone.
 * bounds(name) returns the unscaled { width, height, depth } or null.
 *
 * World teardown must skip resources marked userData.breakwaterShared. Dispose
 * the library only when the complete game is torn down, never between sectors.
 * Failed files are collected in errors so a missing optional prop cannot prevent
 * the playable campaign from starting. A fully loaded library has errors=[] and
 * names.length===7. This function resolves after all models and textures settle.
 */
export async function createProps() {
  const errors = [];
  const manager = new THREE.LoadingManager();
  manager.onError = (url) => {
    if (errors.some((error) => error.url === url)) return;
    const name = Object.keys(ASSETS).find((key) => url.includes(`/${ASSETS[key]}/`)) ?? 'asset';
    errors.push(Object.freeze({ name, url, message: 'A model or texture dependency could not load.' }));
  };
  const loader = new GLTFLoader(manager);
  const templates = new Map();
  const measurements = new Map();
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const byName = {};
  const stats = { models: 0, meshes: 0, triangles: 0, byName };
  let disposed = false;

  await Promise.all(Object.entries(ASSETS).map(async ([name, asset]) => {
    const file = name === 'tree' ? `${asset}.glb` : `${asset}_1k.gltf`;
    const url = new URL(`../assets/props/${asset}/${file}`, import.meta.url);
    try {
      const gltf = await loader.loadAsync(url.href);
      const model = gltf.scene;
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      if (box.isEmpty() || ![size.x, size.y, size.z].every(Number.isFinite)) {
        throw new Error('Model has no finite geometry bounds.');
      }
      const center = box.getCenter(new THREE.Vector3());
      const template = new THREE.Group();
      template.name = `prop:${name}`;
      template.userData.breakwaterProp = name;
      template.userData.breakwaterShared = true;
      model.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
      template.add(model);
      template.updateMatrixWorld(true);

      const modelStats = { meshes: 0, triangles: 0 };
      model.traverse((object) => {
        if (!object.isMesh) return;
        object.userData.breakwaterShared = true;
        object.geometry.userData.breakwaterShared = true;
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = true;
        geometries.add(object.geometry);
        const triangles = (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
        modelStats.meshes++;
        modelStats.triangles += triangles;
        stats.meshes++;
        stats.triangles += triangles;
        const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of meshMaterials) {
          // GLTFLoader assigns sRGB to base colour/emission and linear data to
          // normal/ORM maps. Preserve those semantics and the original PBR maps.
          material.envMapIntensity = 0.6;
          material.userData.breakwaterShared = true;
          materials.add(material);
          for (const value of Object.values(material)) {
            if (!value?.isTexture) continue;
            value.anisotropy = 4;
            value.userData.breakwaterShared = true;
            textures.add(value);
          }
        }
      });

      measurements.set(name, Object.freeze({ width: size.x, height: size.y, depth: size.z }));
      templates.set(name, template);
      byName[name] = Object.freeze(modelStats);
      stats.models++;
    } catch (error) {
      const failure = Object.freeze({ name, url: url.href, message: String(error?.message ?? error) });
      errors.push(failure);
      console.warn(`BREAKWATER prop ${name} could not load: ${failure.message}`);
    }
  }));

  function get(name) {
    if (disposed) return null;
    return templates.get(name)?.clone(true) ?? null;
  }

  function place(name, { position, rotation, scale = 1 } = {}) {
    const object = get(name);
    if (!object) return null;
    if (position?.isVector3) object.position.copy(position);
    else if (Array.isArray(position)) object.position.fromArray(position);
    if (Array.isArray(rotation)) object.rotation.set(rotation[0] ?? 0, rotation[1] ?? 0, rotation[2] ?? 0);
    object.scale.setScalar(scale);
    return object;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    templates.clear();
    measurements.clear();
  }

  Object.freeze(byName);
  return Object.freeze({
    get,
    place,
    bounds: (name) => measurements.get(name) ?? null,
    has: (name) => !disposed && templates.has(name),
    names: Object.freeze(Object.keys(ASSETS).filter((name) => templates.has(name))),
    errors: Object.freeze(errors),
    stats: Object.freeze(stats),
    dispose,
  });
}
