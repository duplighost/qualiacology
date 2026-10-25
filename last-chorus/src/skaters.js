// The skaters you can unlock: Alex's four, each in their own clothes and with their own
// riding clips. They stand on whichever board is chosen (the boards built into two of the
// models are left off), and the ride drives them by blending their clips: crouched into a
// dip, leaning up the far side, carving with the steering, arms out in the air, tucked on a
// dive, absorbing a landing, celebrating at the end. Loaded only when one's chosen.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';

// clip names differ a little between the packs: what each part of the ride uses, first found wins
const CLIPS = {
  idle: ['Ride_Idle'],
  crouch: ['Downhill_Crouch', 'Downhill_Tuck'],
  up: ['Uphill_Lean'],
  left: ['Carve_Left'],
  right: ['Carve_Right'],
  air: ['Air_Open', 'Air_ArmsOut'],
  tuck: ['Air_Tuck', 'Downhill_Tuck'],
  land: ['Land_Absorb', 'Landing'],
  cheer: ['Jump_Celebrate', 'Jump_HandsUp'],
  select: ['Select_Idle', 'Ride_Idle'],
};

export const SKATERS = [
  { id: 'classic', name: 'Classic', color: '#5ff2ff' },
  { id: 'saffron', name: 'Saffron', color: '#ffb21a', file: 'assets/riders/saffron.glb' },
  { id: 'red', name: 'Red', color: '#ff6a3d', file: 'assets/riders/red.glb' },
  { id: 'leather', name: 'Leather', color: '#e8c27a', file: 'assets/riders/leather.glb', lids: 0.32 },
  { id: 'bam', name: 'Bam', color: '#ff4f6a', file: 'assets/riders/bam.glb' },
];

const cache = new Map();
export function loadSkater(file) {
  if (!cache.has(file)) cache.set(file, new GLTFLoader().loadAsync(file).catch((e) => { console.warn('skater', file, e); return null; }));
  return cache.get(file);
}

// put one in the rider's place: returns the controller RiderView drives each frame
export function attachSkater(view, gltf, def, P) {
  const model = skClone(gltf.scene);
  const blink = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    // a board that came with the model: ours is underneath already
    if (!o.isSkinnedMesh) { o.visible = false; return; }
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = mats.map((m) => { const c = m.clone(); c.userData.rimF = rimFor(m.name); rimLight(c, P.rim ?? P.edge, 0.55 * c.userData.rimF); return c; });
    if (o.material.length === 1) o.material = o.material[0];
    if (o.morphTargetDictionary && ('Blink_Left' in o.morphTargetDictionary)) blink.push(o);
  });
  // stand on the deck: the soles at the top of the board, centred over it
  model.updateMatrixWorld(true);
  const box = new THREE.Box3();
  model.traverse((o) => { if (o.isSkinnedMesh && o.visible) box.expandByObject(o); });
  const size = box.getSize(new THREE.Vector3());
  const s = 1.68 / Math.max(1.2, size.y);                // about her height, whoever it is
  model.scale.setScalar(s);
  const c = box.getCenter(new THREE.Vector3());
  model.position.set(-c.x * s, -box.min.y * s + (def.lift ?? 0), -c.z * s);
  view.char.add(model);
  // her soles stay on the deck whatever a clip does with her hips: each foot bone's height
  // above the sole, taken standing, is what it must keep
  const target = def.lift ?? 0;                                       // the sole's height on the deck
  const feet = [], inv = new THREE.Matrix4(), fp = new THREE.Vector3();
  model.traverse((o) => { if (o.isBone && /(Left|Right)(Foot|ToeBase)$/.test(o.name)) feet.push({ bone: o, h: 0 }); });
  const footY = (f) => { fp.setFromMatrixPosition(f.bone.matrixWorld).applyMatrix4(inv); return model.position.y + fp.y * s; };
  const measure = () => { model.updateMatrixWorld(true); inv.copy(model.matrixWorld).invert(); };
  measure();
  for (const f of feet) f.h = footY(f) - target;
  const baseY = model.position.y;
  const mixer = new THREE.AnimationMixer(model);
  const acts = {};
  for (const [k, names] of Object.entries(CLIPS)) {
    const clip = names.map((n) => gltf.animations.find((a) => a.name === n)).find(Boolean);
    if (!clip) continue;
    const a = mixer.clipAction(clip);
    a.setEffectiveWeight(0); a.play();
    if (k === 'land' || k === 'cheer') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    acts[k] = a;
  }
  const w = { idle: 1, crouch: 0, up: 0, left: 0, right: 0, air: 0, tuck: 0, land: 0, cheer: 0, select: 0 };
  let blinkT = 2 + Math.random() * 3, landK = 0, wasAir = false;
  // the end of a song: the celebration once (a real jump, off the board and back), then standing
  // easy on it, and again every few seconds. Looped back to back with her feet held to the deck,
  // it read as someone frozen waving.
  let cheerOn = false, cheerClock = 0, cheerPlaying = false, nextCheer = 0;
  const startCheer = () => {
    if (!acts.cheer) return;
    acts.cheer.reset(); acts.cheer.play(); cheerPlaying = true;
    nextCheer = cheerClock + acts.cheer.getClip().duration + 1.6 + Math.random() * 1.6;
  };
  const share = new Map();
  const lids = def.lids ?? 0;
  return {
    model, mixer, acts,
    update(p, rider, dt, titleK) {
      const ease = (k, target, rate) => { w[k] += (target - w[k]) * Math.min(1, dt * rate); };
      const air = p.air, cheer = p.cheer || 0;
      // a landing: the absorb clip from its start
      if (wasAir && rider.grounded && acts.land) { acts.land.reset(); acts.land.play(); landK = 1; }
      wasAir = !rider.grounded;
      landK *= Math.exp(-dt * 3.2);
      const crouch = Math.max(0, Math.min(1, (p.crouch - 0.38) / 0.5));
      const goingUp = rider.grounded && !rider.press && rider.vy > 1.5 ? 1 : 0;
      const lean = Math.max(-1, Math.min(1, p.lean * 2.2));
      const tuck = !rider.grounded && (rider.press || p.grab > 0.5) ? 1 : 0;
      ease('crouch', (1 - air) * crouch, 10);
      ease('up', (1 - air) * goingUp * (1 - crouch) * 0.8, 6);
      ease('left', (1 - air) * Math.max(0, -lean), 8);
      ease('right', (1 - air) * Math.max(0, lean), 8);
      ease('air', air * (1 - tuck), 8);
      ease('tuck', air * tuck, 10);
      if (cheer > 0.05) {
        if (!cheerOn) { cheerOn = true; cheerClock = 0; startCheer(); }
        cheerClock += dt;
        if (cheerPlaying && acts.cheer && acts.cheer.time >= acts.cheer.getClip().duration - 0.25) cheerPlaying = false;
        if (!cheerPlaying && cheerClock >= nextCheer) startCheer();
      } else { cheerOn = false; cheerPlaying = false; }
      ease('select', Math.max(titleK, cheer * (cheerPlaying ? 0 : 1)), 5);
      ease('cheer', cheer * (cheerPlaying ? 1 : 0), 9);
      w.land = landK * (1 - air);
      // the stance gives way to whatever she's doing, so a press is a full tuck, not half of one
      w.idle = Math.max(0, 1 - (w.crouch + w.up + w.left + w.right + w.air + w.tuck + w.land));
      // the cheer and the title take over everything else
      const over = Math.max(w.cheer, w.select);
      // a rider short of a clip uses one clip for two things (her tuck is her crouch): add up
      // what each clip is asked for, so one use doesn't zero the other
      share.clear();
      for (const k in w) { const a = acts[k]; if (!a) continue; const v = k === 'cheer' || k === 'select' ? w[k] : w[k] * (1 - over); share.set(a, (share.get(a) || 0) + v); }
      let sum = 0;
      for (const [a, v] of share) { a.setEffectiveWeight(v); sum += v; }
      if (sum < 1e-3 && acts.idle) acts.idle.setEffectiveWeight(1);
      mixer.update(dt);
      // back on the deck: the lowest foot, less its own height above the sole (let go for the
      // celebration's jump, so it really leaves the board)
      if (feet.length) {
        model.position.y = baseY;
        measure();
        let low = Infinity;
        for (const f of feet) low = Math.min(low, footY(f) - f.h);
        const lock = 1 - 0.92 * Math.min(1, w.cheer * 1.2);
        model.position.y = baseY - (low - target) * lock;
      }
      // her lids rest a little lower, and she blinks now and then
      if (blink.length) {
        blinkT -= dt;
        let b = lids;
        if (blinkT < 0.14) b = Math.max(b, 1 - Math.abs(blinkT - 0.07) / 0.07);
        if (blinkT <= 0) blinkT = 2.5 + Math.random() * 3.5;
        for (const o of blink) { const d = o.morphTargetDictionary; o.morphTargetInfluences[d.Blink_Left] = b; o.morphTargetInfluences[d.Blink_Right] = b; }
      }
    },
    setRim(k) { model.traverse((o) => { if (o.isSkinnedMesh) for (const m of [].concat(o.material)) if (m.userData.shader) m.userData.shader.uniforms.uRimK.value = k * m.userData.rimF; }); },
  };
}

// the edge light is for her outline: clothes and skin. Dark hair would turn the light's colour
// and lit eyes look wrong, so those get a trace of it or none
function rimFor(name = '') {
  const n = name.toLowerCase();
  if (/eye|iris|pupil|enamel|mouth|oral|teeth/.test(n)) return 0;
  if (/hair|curl|strand|goatee|brow|lash/.test(n)) return 0.12;
  return 1;
}

function rimLight(m, color, k) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = { value: new THREE.Color(color) };
    sh.uniforms.uRimK = { value: k };
    m.userData.shader = sh;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimF = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
        totalEmissiveRadiance += uRim * rimF * 1.2 * uRimK;`);
  };
  m.customProgramCacheKey = () => 'skaterRim';
}
