// Characters: the Quaternius base bodies (CC0) on the UE-style skeleton, the Universal Animation
// Library clips (packed into assets/characters/anims.glb), hair and outfits on the same skeleton.
// A Rig is one character: a skinned model, its mixer, crossfades, one-shots with timed events,
// an upper-body layer (attacks over running legs), and small procedural touches (lean, look, flinch).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const UPPER = new Set(['spine_01', 'spine_02', 'spine_03', 'neck_01', 'head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r', 'upperarm_twist_l', 'upperarm_twist_r', 'lowerarm_twist_l', 'lowerarm_twist_r']);
export const isUpper = (bone) => UPPER.has(bone.toLowerCase()) || /^(index|middle|pinky|ring|thumb)_/.test(bone);

export class CharacterKit {
  constructor(base = 'assets/characters/') {
    this.base = base;
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.clips = {};
    this.upperClips = {};
  }

  async load(url) {
    if (!this.cache.has(url)) this.cache.set(url, this.loader.loadAsync(url));
    return this.cache.get(url);
  }

  async init(onProgress) {
    const anims = await this.load(this.base + 'anims.glb');
    for (const c of anims.animations) {
      this.clips[c.name] = stripRootMotion(c);
    }
    onProgress && onProgress(1);
    return this;
  }

  // the same clip with only the upper body's tracks (for attacks while the legs run)
  upper(name) {
    if (!this.upperClips[name]) {
      const c = this.clips[name];
      if (!c) return null;
      const tracks = c.tracks.filter((t) => isUpper(t.name.split('.')[0]));
      this.upperClips[name] = new THREE.AnimationClip(name + '@upper', c.duration, tracks);
    }
    return this.upperClips[name];
  }

  // a fresh skinned copy of a gltf scene, with shadows on and frustum culling off (skinned bounds lie)
  instance(gltf) {
    const o = SkeletonUtils.clone(gltf.scene);
    o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false; } });
    return o;
  }
}

// keep the pelvis's height motion, drop its travel across the floor (the game moves characters)
function stripRootMotion(clip) {
  const c = clip.clone();
  for (const t of c.tracks) {
    if (t.name === 'pelvis.position') {
      const v = t.values;
      const x0 = v[0], z0 = v[2];
      for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
    }
  }
  return c;
}

export class Rig {
  // model: an Object3D with a SkinnedMesh on the base skeleton
  constructor(kit, model) {
    this.kit = kit;
    this.root = new THREE.Group();
    this.model = model;
    this.root.add(model);
    this.mixer = new THREE.AnimationMixer(model);
    this.base = null;          // current full-body action
    this.baseName = '';
    this.upperAct = null;      // current upper-body action
    this.events = [];          // timed callbacks of the current one-shot
    this.bones = {};
    model.traverse((o) => { if (o.isBone) this.bones[o.name] = o; });
    this.timeScale = 1;
    this.lean = new THREE.Vector2();   // procedural lean (x = sideways, y = forward), radians
    this._leanS = new THREE.Vector2();
    this.flinch = 0;                   // decaying hit flinch
    this.flinchDir = new THREE.Vector3();
    this.lookTarget = null;            // world position the head turns towards
    this.frozen = 0;                   // hit-stop seconds left (local: only this rig)
    // the whole body, on top of the clip: lifted (a jump), spun about its own axis (a pirouette), tipped about the
    // hips (a flip, a dive), and squashed for a frame on a landing. The game sets these; they ease nowhere by themselves.
    this.body = { y: 0, spin: 0, pitch: 0, roll: 0, squash: 0, hip: 1.0 };
    this._m0 = null;                   // the model's own transform, taken as these come on (and put back as they go)
    this.flinchGain = 1;               // how far a blow folds her (her: more than YOU)
    this.meshes = [];
    model.traverse((o) => { if (o.isMesh) this.meshes.push(o); });
    this.mixer.addEventListener('finished', (e) => this._finished(e));
  }

  attach(boneName, obj) { const b = this.bones[boneName]; if (b) b.add(obj); return obj; }

  // crossfade the whole body to a looping or one-shot clip
  play(name, { fade = 0.15, speed = 1, loop = true, offset = 0, force = false } = {}) {
    const clip = this.kit.clips[name];
    if (!clip) { console.warn('no clip', name); return null; }
    if (!force && this.baseName === name && this.base && loop) { this.base.timeScale = speed; return this.base; }
    const a = this.mixer.clipAction(clip);
    a.reset();
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    a.clampWhenFinished = !loop;
    a.timeScale = speed;
    a.time = offset * clip.duration;
    a.enabled = true;
    a.setEffectiveWeight(1);
    if (this.base && this.base !== a) a.crossFadeFrom(this.base, fade, false);
    a.play();
    this.base = a; this.baseName = name;
    this.events = [];
    return a;
  }

  // a one-shot whose length is fitted to `duration` seconds (so a strike lands on a beat), with events
  // at fractions of it: [{at: 0.45, fn}]. `then` is the loop to return to.
  once(name, { duration = 0, speed = 1, fade = 0.08, events = [], then = null, thenFade = 0.2, from = 0, to = 1 } = {}) {
    const clip = this.kit.clips[name];
    if (!clip) { console.warn('no clip', name); return null; }
    const span = clip.duration * (to - from);
    const sp = duration > 0 ? span / duration : speed;
    const a = this.play(name, { fade, speed: sp, loop: false, offset: from, force: true });
    this._onceEnd = to < 1 ? clip.duration * to : 0;
    this.events = events.map((e) => ({ t: clip.duration * (from + (to - from) * e.at), fn: e.fn, done: false }));
    this._then = then; this._thenFade = thenFade;
    return a;
  }

  // upper body only, over whatever the legs are doing
  upperOnce(name, { duration = 0, speed = 1, fade = 0.06, events = [], from = 0, to = 1, weight = 1 } = {}) {
    const clip = this.kit.upper(name);
    if (!clip) return null;
    const span = clip.duration * (to - from);
    const sp = duration > 0 ? span / duration : speed;
    if (this.upperAct) this.upperAct.fadeOut(fade);
    this._upperHold = false;
    const a = this.mixer.clipAction(clip);
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true;
    a.timeScale = sp; a.time = clip.duration * from; a.enabled = true;
    a.setEffectiveWeight(weight); a.fadeIn(fade); a.play();
    this.upperAct = a;
    this._upperEnd = to < 1 ? clip.duration * to : clip.duration;
    this.upperEvents = events.map((e) => ({ t: clip.duration * (from + (to - from) * e.at), fn: e.fn, done: false }));
    return a;
  }
  // upper body: play into a pose and hold it there (a guard) until upperStop()
  upperHold(name, { duration = 0.12, from = 0, to = 0.3, fade = 0.06, weight = 1 } = {}) {
    const a = this.upperOnce(name, { duration, from, to, fade, weight });
    if (a) this._upperHold = true;
    return a;
  }
  upperStop(fade = 0.12) { this._upperHold = false; if (this.upperAct) { this.upperAct.fadeOut(fade); this.upperAct = null; } }

  // a clip driven by hand: the caller sets where in [from, to] the pose is, every frame (a strike that has to land
  // on a beat keeps its own clock). scrubTo(k): k 0..1 of the window. It holds its last pose until something else plays.
  scrub(name, { from = 0, to = 1, fade = 0.05 } = {}) {
    const clip = this.kit.clips[name];
    if (!clip) { console.warn('no clip', name); return null; }
    const a = this.play(name, { fade, speed: 0, loop: false, offset: from, force: true });
    this._onceEnd = 0; this._then = null;
    this._scrub = { a, from, to, dur: clip.duration };
    return a;
  }
  scrubTo(k) { const s = this._scrub; if (!s || s.a !== this.base) return; s.a.time = s.dur * (s.from + (s.to - s.from) * Math.max(0, Math.min(1, k))); }
  // the same for the upper body alone (the legs keep running, or stay tucked in the air)
  upperScrub(name, { from = 0, to = 1, fade = 0.05 } = {}) {
    const clip = this.kit.upper(name);
    if (!clip) return null;
    if (this.upperAct) this.upperAct.fadeOut(fade);
    const a = this.mixer.clipAction(clip);
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = 0; a.time = clip.duration * from; a.enabled = true;
    a.setEffectiveWeight(1); a.fadeIn(fade); a.play();
    this.upperAct = a; this._upperHold = true; this._upperEnd = clip.duration; this.upperEvents = null;
    this._uscrub = { a, from, to, dur: clip.duration };
    return a;
  }
  upperScrubTo(k) { const s = this._uscrub; if (!s || s.a !== this.upperAct) return; s.a.time = s.dur * (s.from + (s.to - s.from) * Math.max(0, Math.min(1, k))); }

  _finished(e) {
    if (e.action === this.base && this._then) { const t = this._then; this._then = null; this.play(t, { fade: this._thenFade }); }
    if (e.action === this.upperAct && !this._upperHold) { this.upperAct.fadeOut(0.15); this.upperAct = null; }
  }

  hitStop(sec) { this.frozen = Math.max(this.frozen, sec); }

  update(dt) {
    if (this.frozen > 0) { this.frozen -= dt; dt *= 0.04; }
    const step = dt * this.timeScale;
    // (the mixer only writes a bone whose clip value changed: a bone a clip holds still would keep last frame's nudge
    // and take another, every frame, until she'd folded in half. So the clip's own pose goes back first.)
    if (this._clean) for (const c of this._clean) c.bone.quaternion.copy(c.q);
    this.mixer.update(step);
    // timed events of the one-shot, and an early end
    if (this.base && this.events.length) {
      const t = this.base.time;
      for (const e of this.events) if (!e.done && t >= e.t) { e.done = true; e.fn(); }
    }
    if (this._onceEnd && this.base && this.base.time >= this._onceEnd) {
      this._onceEnd = 0;
      if (this._then) { const t = this._then; this._then = null; this.play(t, { fade: this._thenFade }); }
    }
    if (this.upperAct && this.upperEvents) {
      for (const e of this.upperEvents) if (!e.done && this.upperAct.time >= e.t) { e.done = true; e.fn(); }
      if (this.upperAct.time >= this._upperEnd - 1e-3) {
        if (this._upperHold) { if (!(this._uscrub && this._uscrub.a === this.upperAct)) { this.upperAct.time = this._upperEnd - 1e-3; this.upperAct.timeScale = 0; } }   // held in the pose
        else { this.upperAct.fadeOut(0.12); this.upperAct = null; }
      }
    }
    this._post(dt);
  }

  // procedural touches applied after the mixer
  _post(dt) {
    // the body's own lift, spin and tip (about the hips), over whatever the model's rest transform is
    const B = this.body, m = this.model;
    const bodyOn = !!(B.y || B.spin || B.pitch || B.roll || B.squash);
    if (bodyOn && !this._bodyOn) this._m0 = { p: m.position.clone(), q: m.quaternion.clone(), s: m.scale.clone() };
    const m0 = this._m0;
    if ((bodyOn || this._bodyOn) && m0) {
      _e1.set(B.pitch, B.spin, B.roll, 'YXZ'); _q2b.setFromEuler(_e1);
      m.quaternion.copy(m0.q).multiply(_q2b);
      const h = B.hip * m0.s.y;
      _v3.set(0, h, 0).applyQuaternion(_q2b);
      m.position.set(m0.p.x - _v3.x, m0.p.y + B.y + h - _v3.y, m0.p.z - _v3.z);
      const sq = B.squash; m.scale.set(m0.s.x * (1 + sq * 0.5), m0.s.y * (1 - sq), m0.s.z * (1 + sq * 0.5));
      this._bodyOn = bodyOn;
    }
    const clean = this._clean || (this._clean = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'head', 'upperarm_l', 'upperarm_r']
      .map((n) => this.bones[n]).filter(Boolean).map((bone) => ({ bone, q: new THREE.Quaternion() })));
    for (const c of clean) c.q.copy(c.bone.quaternion);
    const k = 1 - Math.exp(-dt * 10);
    this._leanS.x += (this.lean.x - this._leanS.x) * k;
    this._leanS.y += (this.lean.y - this._leanS.y) * k;
    const sp = this.bones.spine_01;
    if (sp) { sp.rotation.z += this._leanS.x * 0.6; sp.rotation.x += this._leanS.y * 0.6; }
    const pel = this.bones.pelvis;
    if (pel) { pel.rotation.z += this._leanS.x * 0.4; }
    if (this.flinch > 0.001) {
      // a blow folds her round it: the spine away from it, the head whipping after, the arms thrown out
      const f = this.flinch * this.flinchGain, dz = this.flinchDir.z, dx = this.flinchDir.x, g = this.flinchGain > 1 ? 1 : 0;
      const s1 = this.bones.spine_01, s2 = this.bones.spine_02, s3 = this.bones.spine_03;
      if (s2) { s2.rotation.x -= f * 0.35 * dz; s2.rotation.z += f * 0.35 * dx; }
      if (g && s1) { s1.rotation.x -= f * 0.16 * dz; s1.rotation.z += f * 0.16 * dx; }
      if (g && s3) { s3.rotation.x -= f * 0.14 * dz; s3.rotation.z += f * 0.14 * dx; }
      const hd = this.bones.Head || this.bones.head; if (hd) { hd.rotation.x -= f * 0.3 * (g ? Math.abs(dz) + 0.3 : 1); if (g) hd.rotation.z += f * 0.22 * dx; }
      if (g) { const ul = this.bones.upperarm_l, ur = this.bones.upperarm_r; if (ul) ul.rotation.z += f * 0.2; if (ur) ur.rotation.z -= f * 0.2; }
      this.flinch *= Math.exp(-dt * (g ? 7 : 9));
    }
    if (this.lookTarget && (this.bones.Head || this.bones.head)) {
      const head = this.bones.Head || this.bones.head;
      const wp = head.getWorldPosition(_v1);
      const dir = _v2.copy(this.lookTarget).sub(wp);
      const inv = _q1.copy(this.root.quaternion).invert();
      dir.applyQuaternion(inv);
      const yaw = Math.atan2(dir.x, dir.z);
      const cy = Math.max(-0.9, Math.min(0.9, yaw));
      head.rotation.y += cy * 0.55;
      const n3 = this.bones.neck_01; if (n3) n3.rotation.y += cy * 0.25;
    }
  }

  // a flash of colour over the whole character (hit, parry), handled through emissive
  flash(color, k) {
    for (const m of this.meshes) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        if (!mat.emissive) continue;
        if (!mat.userData.baseEmissive) mat.userData.baseEmissive = mat.emissive.clone();
        mat.emissive.copy(mat.userData.baseEmissive).lerp(color, k);
      }
    }
  }
}

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2b = new THREE.Quaternion(), _e1 = new THREE.Euler();
