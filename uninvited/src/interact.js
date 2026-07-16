// Interaction: raycast from the camera at what you're looking at; E to use.
// Groups get an invisible hit-box so even empty anchor groups are targetable.
import * as THREE from 'three';

const REACH = 2.9;

export class Interactions {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.ray = new THREE.Raycaster();
    this.ray.far = REACH;
    this.targets = [];       // meshes with userData.inter
    this.current = null;
    this.hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
  }

  add(obj, prompt, action, opts = {}) {
    const inter = { prompt, action, enabled: true, obj, ...opts };
    // ensure there is at least one raycastable mesh
    let hasMesh = false;
    obj.traverse?.((c) => { if (c.isMesh) hasMesh = true; });
    if (obj.isMesh) hasMesh = true;
    let hb;
    if (!hasMesh || obj.isGroup) {
      // size an invisible hit-box from the bounding box (or a default cube)
      const bb = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      bb.getSize(size);
      if (!isFinite(size.x) || size.length() < 0.05) size.set(0.7, 0.9, 0.7);
      size.x = Math.max(size.x, 0.4); size.y = Math.max(size.y, 0.4); size.z = Math.max(size.z, 0.4);
      hb = new THREE.Mesh(new THREE.BoxGeometry(size.x + 0.15, size.y + 0.15, size.z + 0.15), this.hitboxMat);
      const ctr = new THREE.Vector3();
      if (isFinite(bb.min.x)) bb.getCenter(ctr); else obj.getWorldPosition(ctr);
      if (!isFinite(ctr.x)) obj.getWorldPosition(ctr);
      // parent the hit-box to the object so it follows it
      obj.updateWorldMatrix(true, false);
      const local = obj.worldToLocal(ctr.clone());
      hb.position.copy(local);
      obj.add(hb);
    }
    const tagged = [];
    const tag = (m) => { m.userData.inter = inter; tagged.push(m); };
    if (hb) tag(hb);
    else {
      if (obj.isMesh) tag(obj);
      obj.traverse?.((c) => { if (c.isMesh && c !== obj) tag(c); });
    }
    this.targets.push(...tagged);
    return inter;
  }

  update() {
    this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.ray.intersectObjects(this.targets, false);
    this.current = null;
    for (const h of hits) {
      const inter = h.object.userData.inter;
      if (inter && inter.enabled !== false) { this.current = inter; break; }
    }
    return this.current;
  }

  use() {
    if (this.current && this.current.enabled !== false) {
      this.current.action();
      return true;
    }
    return false;
  }
}
