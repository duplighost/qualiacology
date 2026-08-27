// Static mesh batching for authored procedural scenery.  All source meshes are
// constructed at boot, baked into relay-local coordinates, and collapsed by
// material/shadow state.  This keeps dense geometric detail cheap without
// changing the separate analytic collision model.

import * as THREE from 'three';

function appendAttribute(geometries, name) {
  const first = geometries[0].getAttribute(name);
  if (!first) return null;
  const Ctor = first.array.constructor;
  let total = 0;
  for (const geo of geometries) {
    const attr = geo.getAttribute(name);
    if (!attr || attr.itemSize !== first.itemSize || attr.normalized !== first.normalized) return null;
    total += attr.array.length;
  }
  const array = new Ctor(total);
  let offset = 0;
  for (const geo of geometries) {
    const src = geo.getAttribute(name).array;
    array.set(src, offset);
    offset += src.length;
  }
  return new THREE.BufferAttribute(array, first.itemSize, first.normalized);
}

export function mergeBufferGeometries(geometries) {
  const flat = geometries.map((source) => {
    const clone = source.clone();
    if (!clone.index) return clone;
    const expanded = clone.toNonIndexed();
    clone.dispose();
    return expanded;
  });
  const merged = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'color']) {
    const attr = appendAttribute(flat, name);
    if (attr) merged.setAttribute(name, attr);
  }
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  for (const geo of flat) geo.dispose();
  return merged;
}

/**
 * Collapse every direct child Mesh in `root` into one mesh per material and
 * shadow-state tuple. Non-mesh children are preserved. Source geometries are
 * disposed only after their transformed data has been copied.
 */
export function batchStaticMeshes(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const originals = [];
  for (const child of [...root.children]) {
    if (!child.isMesh || Array.isArray(child.material)) continue;
    const key = `${child.material.uuid}|${child.castShadow ? 1 : 0}|${child.receiveShadow ? 1 : 0}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { material: child.material, castShadow: child.castShadow, receiveShadow: child.receiveShadow, geos: [] };
      buckets.set(key, bucket);
    }
    const geo = child.geometry.clone();
    geo.applyMatrix4(child.matrix);
    bucket.geos.push(geo);
    originals.push(child);
  }
  for (const child of originals) {
    root.remove(child);
    child.geometry.dispose();
  }
  let i = 0;
  for (const bucket of buckets.values()) {
    const geometry = mergeBufferGeometries(bucket.geos);
    for (const geo of bucket.geos) geo.dispose();
    const mesh = new THREE.Mesh(geometry, bucket.material);
    mesh.name = `relay-static-batch-${i++}`;
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = bucket.receiveShadow;
    root.add(mesh);
  }
  return { sourceMeshes: originals.length, batches: buckets.size };
}
