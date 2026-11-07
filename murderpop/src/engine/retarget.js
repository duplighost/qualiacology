// Retarget animation clips between two skeletons whose bones share names (UE-style rigs) but whose
// rest orientations differ (different bone rolls, A-pose vs T-pose, Z-up vs Y-up roots).
//
// For each mapped bone b:  K(b) = (Ralign(b) * S_rest_world(b))^-1 * T_rest_world(b)
// where Ralign turns the source bone's rest direction onto the target bone's rest direction (so the
// two skeletons are compared in the same physical pose). Then for every frame:
//   T_world(b,t) = S_world(b,t) * K(b);  T_local(b,t) = T_world(parent,t)^-1 * T_world(b,t)
// Bones the source doesn't have (hair, coat, twist, jaw, eyes) keep their rest pose.
import * as THREE from 'three';

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();

function boneMap(root) {
  const m = new Map();
  root.traverse((o) => { if (o.isBone || o.type === 'Bone' || o.isObject3D) if (o.name) m.set(o.name, o); });
  return m;
}

// world direction a bone points in at rest: towards its (first mapped) child, else its local +Y
function restDir(bone, worldPos, out, keep) {
  const kids = bone.children.filter((c) => (c.isBone || c.type === 'Bone') && (!keep || keep(c.name)));
  if (kids.length) {
    // prefer the child that continues the chain (largest offset)
    let best = null, bl = -1;
    for (const k of kids) { const l = k.position.length(); if (l > bl) { bl = l; best = k; } }
    if (best && bl > 1e-4) return out.copy(worldPos.get(best)).sub(worldPos.get(bone)).normalize();
  }
  return out.set(0, 1, 0).applyQuaternion(bone.getWorldQuaternion(_q)).normalize();
}

export class Retargeter {
  // sourceRoot / targetRoot: Object3D scene roots of each skeleton in their rest pose
  // nameMap: target bone name -> source bone name (defaults to the same name; case-insensitive fallback)
  constructor(sourceRoot, targetRoot, { nameMap = {}, alignSkip = ['root', 'Root', 'pelvis'] } = {}) {
    this.src = sourceRoot; this.tgt = targetRoot;
    sourceRoot.updateMatrixWorld(true); targetRoot.updateMatrixWorld(true);
    const S = boneMap(sourceRoot), T = boneMap(targetRoot);
    const sLower = new Map([...S].map(([k, v]) => [k.toLowerCase(), v]));
    this.S = S; this.T = T;
    const sPos = new Map(), tPos = new Map();
    for (const [, b] of S) sPos.set(b, b.getWorldPosition(new THREE.Vector3()));
    for (const [, b] of T) tPos.set(b, b.getWorldPosition(new THREE.Vector3()));
    this.pairs = [];
    const tBones = []; targetRoot.traverse((o) => { if (o.isBone) tBones.push(o); });
    this.tBones = tBones; // traversal order: parents before children
    // only aim a bone at children both skeletons have (a head must not aim at its hair)
    const srcName = (tn) => nameMap[tn] || tn;
    const hasSrc = (tn) => S.has(srcName(tn)) || sLower.has(srcName(tn).toLowerCase());
    const tgtOfSrc = new Map(); for (const tb of tBones) { const sn = srcName(tb.name); if (hasSrc(tb.name)) tgtOfSrc.set(sn.toLowerCase(), tb.name); }
    const keepT = (n) => hasSrc(n);
    const keepS = (n) => tgtOfSrc.has(n.toLowerCase());
    for (const tb of tBones) {
      const sn = nameMap[tb.name] || tb.name;
      const sb = S.get(sn) || sLower.get(sn.toLowerCase());
      if (!sb) continue;
      const sRest = sb.getWorldQuaternion(new THREE.Quaternion());
      const tRest = tb.getWorldQuaternion(new THREE.Quaternion());
      let align = new THREE.Quaternion();
      if (!alignSkip.includes(tb.name)) {
        const ds = restDir(sb, sPos, new THREE.Vector3(), keepS), dt = restDir(tb, tPos, new THREE.Vector3(), keepT);
        align.setFromUnitVectors(ds, dt);
      } else {
        // root and hips: match the whole orientation by facing (+Z forward, +Y up) rather than bone direction
        align.identity();
      }
      const sP = align.clone().multiply(sRest);
      const K = sP.clone().invert().multiply(tRest);
      this.pairs.push({ tb, sb, K, tRestLocal: tb.quaternion.clone() });
    }
    this.pairOf = new Map(this.pairs.map((p) => [p.tb, p]));
    // hips height: scale vertical motion by leg length
    const sPel = S.get('pelvis'), tPel = T.get('pelvis');
    this.sPelvisRest = sPel ? sPos.get(sPel).clone() : new THREE.Vector3();
    this.tPelvisRest = tPel ? tPos.get(tPel).clone() : new THREE.Vector3();
    const sFoot = S.get('foot_l'), tFoot = T.get('foot_l');
    const sLeg = sPel && sFoot ? this.sPelvisRest.y - sPos.get(sFoot).y : 1;
    const tLeg = tPel && tFoot ? this.tPelvisRest.y - tPos.get(tFoot).y : 1;
    this.heightScale = tLeg / Math.max(1e-3, sLeg);
    this.tPel = tPel; this.sPel = sPel;
    // remember rest locals so we can restore after baking
    this.sRestLocal = new Map(); for (const [, b] of S) this.sRestLocal.set(b, b.quaternion.clone());
    this.sRestPos = new Map(); for (const [, b] of S) this.sRestPos.set(b, b.position.clone());
    this.tRestPos = tPel ? tPel.position.clone() : new THREE.Vector3();
  }

  // bake one clip at fps; returns a new clip whose tracks address the target bones by name
  retarget(clip, fps = 30) {
    const mixer = new THREE.AnimationMixer(this.src);
    const action = mixer.clipAction(clip);
    action.play();
    const frames = Math.max(2, Math.round(clip.duration * fps) + 1);
    const times = new Float32Array(frames);
    const qv = new Map(this.pairs.map((p) => [p.tb, new Float32Array(frames * 4)]));
    const pelvisPos = new Float32Array(frames * 3);
    const tWorld = new Map();
    const tParentWorld = new THREE.Quaternion();
    // the target's parent chain above the first bone (scene-root rotations)
    const firstBone = this.tBones[0];
    const aboveRoot = firstBone.parent ? firstBone.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
    for (let f = 0; f < frames; f++) {
      const t = Math.min(clip.duration, f / fps);
      times[f] = t;
      mixer.setTime(t);
      this.src.updateMatrixWorld(true);
      tWorld.clear();
      for (const tb of this.tBones) {
        const parentW = tb.parent && tWorld.has(tb.parent) ? tWorld.get(tb.parent) : (tb === firstBone ? aboveRoot : (tb.parent ? tb.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion()));
        const p = this.pairOf.get(tb);
        let w;
        if (p) {
          w = p.sb.getWorldQuaternion(new THREE.Quaternion()).multiply(p.K);
          const local = tParentWorld.copy(parentW).invert().multiply(w);
          const arr = qv.get(tb); local.normalize();
          // keep quaternion sign continuous between frames
          if (f > 0) { const d = arr[(f - 1) * 4] * local.x + arr[(f - 1) * 4 + 1] * local.y + arr[(f - 1) * 4 + 2] * local.z + arr[(f - 1) * 4 + 3] * local.w; if (d < 0) { local.x *= -1; local.y *= -1; local.z *= -1; local.w *= -1; } }
          arr[f * 4] = local.x; arr[f * 4 + 1] = local.y; arr[f * 4 + 2] = local.z; arr[f * 4 + 3] = local.w;
        } else {
          w = parentW.clone().multiply(tb.quaternion); // rest local
        }
        tWorld.set(tb, w);
      }
      if (this.sPel && this.tPel) {
        const sp = this.sPel.getWorldPosition(_v);
        const dy = (sp.y - this.sPelvisRest.y) * this.heightScale;
        pelvisPos[f * 3] = this.tRestPos.x; pelvisPos[f * 3 + 1] = this.tRestPos.y + dy; pelvisPos[f * 3 + 2] = this.tRestPos.z;
      }
    }
    mixer.stopAllAction(); mixer.uncacheRoot(this.src);
    // restore source rest pose
    for (const [b, q] of this.sRestLocal) b.quaternion.copy(q);
    for (const [b, p] of this.sRestPos) b.position.copy(p);
    const tracks = [];
    for (const p of this.pairs) tracks.push(new THREE.QuaternionKeyframeTrack(p.tb.name + '.quaternion', times, qv.get(p.tb)));
    if (this.tPel) tracks.push(new THREE.VectorKeyframeTrack(this.tPel.name + '.position', times, pelvisPos));
    return new THREE.AnimationClip(clip.name, clip.duration, tracks);
  }
}
