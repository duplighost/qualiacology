// Spring bones (VRM-style): chains of bones (coat tails, hair, veils, skirts) that lag, swing and
// settle under inertia and gravity, kept out of the body by sphere colliders on legs and hips.
// Run after the animation mixer each frame: the animation poses the chain's root, the springs do the rest.
import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4();

class Joint {
  constructor(bone, child, opts) {
    this.bone = bone;
    this.child = child;
    this.stiffness = opts.stiffness; this.drag = opts.drag; this.gravity = opts.gravity; this.radius = opts.radius;
    this.restLocal = bone.quaternion.clone();
    // bone axis in its own local space: towards the child (or +Y)
    this.axis = child ? child.position.clone().normalize() : new THREE.Vector3(0, 1, 0);
    this.length = child ? child.position.length() * worldScale(bone) : 0.1;
    bone.updateMatrixWorld(true);
    this.tail = child ? child.getWorldPosition(new THREE.Vector3()) : bone.localToWorld(new THREE.Vector3(0, 0.1, 0));
    this.prev = this.tail.clone();
  }
}
function worldScale(o) { o.updateMatrixWorld(true); return new THREE.Vector3().setFromMatrixScale(o.matrixWorld).x; }

export class Springs {
  constructor() { this.chains = []; this.colliders = []; this.enabled = true; }

  // names: bone names root -> tip; the last named bone swings towards its own child (or +Y)
  addChain(bones, names, { stiffness = 0.9, drag = 0.35, gravity = 0.6, radius = 0.05 } = {}) {
    const list = names.map((n) => bones[n]).filter(Boolean);
    if (!list.length) return null;
    const joints = list.map((b, i) => new Joint(b, list[i + 1] || b.children.find((c) => c.isBone) || null, { stiffness, drag, gravity, radius }));
    const chain = { joints };
    this.chains.push(chain);
    return chain;
  }

  // a sphere stuck to a bone (offset in the bone's local space), radius in metres
  addCollider(bone, radius, offset = new THREE.Vector3()) {
    if (!bone) return;
    this.colliders.push({ bone, radius, offset: offset.clone(), world: new THREE.Vector3() });
  }

  reset() {
    for (const ch of this.chains) for (const j of ch.joints) {
      j.bone.quaternion.copy(j.restLocal);
      j.bone.updateMatrixWorld(true);
      if (j.child) j.child.getWorldPosition(j.tail); else j.bone.localToWorld(j.tail.set(0, 0.1, 0));
      j.prev.copy(j.tail);
    }
  }

  update(dt) {
    if (!this.enabled || dt <= 0) return;
    dt = Math.min(dt, 1 / 30);
    for (const c of this.colliders) { c.bone.updateMatrixWorld(true); c.world.copy(c.offset).applyMatrix4(c.bone.matrixWorld); }
    const k = dt * 60; // tuned per 60 fps frame
    for (const ch of this.chains) {
      for (const j of ch.joints) {
        const bone = j.bone;
        // the bone at its animated rest rotation
        bone.quaternion.copy(j.restLocal);
        bone.updateMatrixWorld(true);
        const head = _a.setFromMatrixPosition(bone.matrixWorld);
        // where the tail would rest given the parent's current pose
        const restDir = _b.copy(j.axis).transformDirection(bone.matrixWorld);
        // verlet: inertia + stiffness towards rest + gravity
        const vel = _c.copy(j.tail).sub(j.prev).multiplyScalar(1 - j.drag);
        const next = j.tail.clone().add(vel)
          .addScaledVector(restDir, j.stiffness * 0.2 * k * j.length)
          .add(new THREE.Vector3(0, -j.gravity * 0.02 * k * j.length, 0));
        // keep the bone's length
        next.sub(head).setLength(j.length).add(head);
        // stay outside the body
        for (const col of this.colliders) {
          const r = col.radius + j.radius;
          const d = next.distanceTo(col.world);
          if (d < r) { next.sub(col.world).setLength(r).add(col.world); next.sub(head).setLength(j.length).add(head); }
        }
        j.prev.copy(j.tail); j.tail.copy(next);
        // rotate the bone so its axis points at the tail
        const cur = _b.copy(j.axis).transformDirection(bone.matrixWorld);
        const want = _c.copy(j.tail).sub(head).normalize();
        _q.setFromUnitVectors(cur, want);
        // world delta -> local: q_local' = parentWorld^-1 * delta * parentWorld * q_local
        const parentWorld = bone.parent ? bone.parent.getWorldQuaternion(_q2) : _q2.identity();
        const inv = parentWorld.clone().invert();
        bone.quaternion.premultiply(inv.multiply(_q).multiply(parentWorld));
        bone.updateMatrixWorld(true);
      }
    }
  }
}
