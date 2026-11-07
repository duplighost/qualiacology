// YOU: Heroine A (the heroine Alex chose: auburn waves, ivory and copper). Loads her model, retargets the
// Universal Animation Library clips onto her skeleton, puts springs on her coat tails and hair, lifts her two
// copper ring blades out of the skinned mesh into rigid pieces held by her hands (so they can be thrown and come
// back), and runs her face: blinks and expressions.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Retargeter } from '../engine/retarget.js';
import { Rig, isUpper } from '../engine/character.js';
import { Springs } from '../engine/springs.js';

export const HEROINE_CLIPS = [
  'Sword_Idle', 'Idle_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Walk_Loop', 'Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C',
  'Sword_Regular_Combo', 'Sword_Attack', 'Sword_Heavy_Combo', 'Sword_Dash', 'Sword_Block', 'Shield_Dash', 'Punch_Jab', 'Punch_Cross',
  'Melee_Hook', 'OverhandThrow', 'Roll', 'Slide_Start', 'Slide_Loop', 'Hit_Chest', 'Hit_Head', 'Hit_Knockback', 'Death01', 'LayToIdle',
  'Dance_Loop', 'Yes', 'Idle_FoldArms_Loop', 'Spell_Simple_Shoot', 'NinjaJump_Start', 'NinjaJump_Land', 'Sitting_Idle_Loop', 'Sitting_Exit',
  'Swim_Idle_Loop', 'Swim_Fwd_Loop', 'Crouch_Idle_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Interact', 'PickUp_Table', 'Idle_Talking_Loop',
];

// a kit-like object for Rig: retargeted clips + upper-body versions
class HeroineKit {
  constructor(clips) { this.clips = clips; this.upperClips = {}; }
  upper(name) {
    if (!this.upperClips[name]) {
      const c = this.clips[name]; if (!c) return null;
      this.upperClips[name] = new THREE.AnimationClip(name + '@upper', c.duration, c.tracks.filter((t) => isUpper(t.name.split('.')[0])));
    }
    return this.upperClips[name];
  }
}

// a skinned piece (the ring blades) -> a rigid mesh in the local space of the bone that carries most of it
function rigidFromSkinned(sm) {
  const geo = sm.geometry, skel = sm.skeleton;
  const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
  const tally = new Map();
  for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > 0) tally.set(si.getComponent(i, k), (tally.get(si.getComponent(i, k)) || 0) + w); }
  let bi = 0, bw = -1; for (const [k, w] of tally) if (w > bw) { bw = w; bi = k; }
  const bone = skel.bones[bi];
  const m = new THREE.Matrix4().multiplyMatrices(skel.boneInverses[bi], sm.bindMatrix);
  const g = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) if (geo.attributes[name]) g.setAttribute(name, geo.attributes[name].clone());
  if (geo.attributes.tangent) g.setAttribute('tangent', geo.attributes.tangent.clone());
  if (geo.index) g.setIndex(geo.index.clone());
  for (const gr of geo.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
  g.applyMatrix4(m);
  const mesh = new THREE.Mesh(g, sm.material);
  mesh.castShadow = true;
  return { mesh, bone };
}

export async function loadHeroine(url = 'assets/characters/heroine.glb', animsUrl = 'assets/characters/anims.glb', onProgress) {
  const loader = new GLTFLoader();
  const [g, an] = await Promise.all([loader.loadAsync(url, (e) => onProgress && e.total && onProgress(e.loaded / e.total)), loader.loadAsync(animsUrl)]);
  const model = g.scene;
  const rt = new Retargeter(an.scene, model, { nameMap: { head: 'Head', Root: 'root' } });
  const clips = {};
  for (const name of HEROINE_CLIPS) {
    const src = an.animations.find((c) => c.name === name);
    if (src) clips[name] = rt.retarget(src);
  }
  return new Heroine(model, new HeroineKit(clips));
}

export class Heroine {
  constructor(model, kit) {
    this.model = model;
    model.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } });
    this.rig = new Rig(kit, model);
    this.root = this.rig.root;
    const bones = this.rig.bones;
    // rigid rings
    this.rings = [];
    for (const side of ['L', 'R']) {
      let sm = null; model.traverse((o) => { if (o.name === `A_Weapon_Ring_${side}` && (o.isSkinnedMesh || o.isMesh)) sm = o; });
      if (!sm) { model.traverse((o) => { if (!sm && o.isSkinnedMesh && o.parent && o.parent.name === `A_Weapon_Ring_${side}`) sm = o; }); }
      if (!sm) continue;
      const meshes = sm.isSkinnedMesh ? [sm] : sm.children.filter((c) => c.isSkinnedMesh);
      const holder = new THREE.Group(); holder.name = `ring_${side}`;
      let bone = null;
      for (const s of meshes) { const r = rigidFromSkinned(s); holder.add(r.mesh); bone = r.bone; s.visible = false; }
      if (sm.isSkinnedMesh) sm.visible = false;
      if (bone) bone.add(holder);
      this.rings.push({ side, holder, bone, inHand: true });
    }
    // springs: coat tails and hair, kept off the legs and hips
    this.springs = new Springs();
    for (const s of ['l', 'r']) this.springs.addChain(bones, [`coat_${s}_01`, `coat_${s}_02`, `coat_${s}_03`], { stiffness: 0.5, drag: 0.2, gravity: 0.9, radius: 0.05 });
    for (const s of ['back', 'l', 'r']) this.springs.addChain(bones, [`hair_${s}_01`, `hair_${s}_02`, `hair_${s}_03`], { stiffness: 0.75, drag: 0.28, gravity: 0.5, radius: 0.03 });
    for (const s of ['l', 'r']) {
      this.springs.addCollider(bones[`thigh_${s}`], 0.11, new THREE.Vector3(0, 0.12, 0));
      this.springs.addCollider(bones[`thigh_${s}`], 0.095, new THREE.Vector3(0, 0.3, 0));
      this.springs.addCollider(bones[`calf_${s}`], 0.075, new THREE.Vector3(0, 0.15, 0));
    }
    this.springs.addCollider(bones.pelvis, 0.15);
    // face: morph targets by name across the face meshes
    this.morphs = [];
    model.traverse((m) => { if (m.isMesh && m.morphTargetDictionary) this.morphs.push(m); });
    this.expr = { A_Amused: 0, A_Focus: 0, A_Exertion: 0, A_Delight: 0 };
    this.exprT = { ...this.expr };
    this.blinkT = 2 + Math.random() * 2; this.blink = 0;
  }

  setExpression(name, w = 1) { for (const k of Object.keys(this.exprT)) this.exprT[k] = 0; if (name) this.exprT[name] = w; }

  _morph(name, v) {
    for (const m of this.morphs) { const i = m.morphTargetDictionary[name]; if (i !== undefined) m.morphTargetInfluences[i] = v; }
  }

  update(dt) {
    this.rig.update(dt);
    this.springs.update(dt);
    // expressions ease
    for (const k of Object.keys(this.expr)) { this.expr[k] += (this.exprT[k] - this.expr[k]) * Math.min(1, dt * 8); this._morph(k, this.expr[k]); }
    // blink
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 1; this.blinkT = 2.2 + Math.random() * 3.5; }
    if (this.blink > 0) { this.blink = Math.max(0, this.blink - dt * 9); const b = Math.sin(this.blink * Math.PI); this._morph('eyeBlinkLeft', b); this._morph('eyeBlinkRight', b); }
  }
}
