// THE REFLECTION. From "MIR-ror" (19.12) the tri-fold mirror shows YOU; from 80.33 her reflection runs two beats
// late, and on the bar with no bass (85.31) it steps out through the burst glass: YOU's own body in white glaze, with
// gold-leaf rings, replaying everything YOU did two beats ago. Its strikes hit YOU and her; touching it hurts and
// knocks it a further beat behind; three hits of any kind (or a pit, or the first fishnet) shatter it.
// How: YOU's rig calls are recorded and replayed on a second rig `delay` seconds later. In the glass it is drawn by
// a camera mirrored across the centre panel (a layer only that camera sees); out of the glass, it's in the room.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Rig } from '../../engine/character.js';
import { MIRROR } from './props.js';
import * as M from './moves.js';

const LAYER_R = 7;
const RING = /(^|_)ring(_|$)|crescent/i;
const STRIKES = new Set(['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C', 'Punch_Jab', 'Punch_Cross', 'Melee_Hook']);
const T_ON = 19.12, T_LATE = 80.33, T_OUT = 85.31, T_END = 93.14;

export class Reflection {
  constructor(R) {
    this.R = R; this.f = R.f;
    const f = this.f, pl = f.player;
    this.model = SkeletonUtils.clone(pl.h.model);
    this.rig = new Rig(pl.rig.kit, this.model);
    this.root = this.rig.root;
    this.normal = []; this.glaze = new THREE.MeshPhysicalMaterial({ color: 0xf6f2ec, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.5, sheenColor: new THREE.Color(0xffd6e4) });
    this.gold = new THREE.MeshStandardMaterial({ color: 0xe2ae4c, metalness: 1, roughness: 0.25 });
    this.model.traverse((m) => { if (m.isMesh) { m.frustumCulled = false; this.normal.push([m, m.material]); } });
    R.group.add(this.root);
    // the camera in the glass, its render target, the panel that shows it
    this.cam = new THREE.PerspectiveCamera(); this.cam.layers.set(LAYER_R);
    this.rt = new THREE.WebGLRenderTarget(384, 768, { type: THREE.HalfFloatType });
    this.key = new THREE.DirectionalLight(0xffe2b0, 3.2); this.key.layers.set(LAYER_R); this.key.position.set(MIRROR.x + 3, 4, MIRROR.z + 3); R.group.add(this.key, this.key.target);
    const centre = R.mirror.panels[1];
    this.panel = centre;
    this.tm = new THREE.Matrix4();
    this.glass = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 2.56), new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
      uniforms: { tMap: { value: this.rt.texture }, uTM: { value: this.tm }, uA: { value: 0 } },
      vertexShader: 'uniform mat4 uTM; varying vec4 vP; void main(){ vP = uTM * modelMatrix * vec4(position,1.0); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D tMap; uniform float uA; varying vec4 vP; void main(){ vec4 c = texture2DProj(tMap, vP); gl_FragColor = vec4(c.rgb * 0.9, c.a * uA); }' }));
    this.glass.position.copy(centre.mesh.position); this.glass.rotation.copy(centre.mesh.rotation);
    this.glass.translateZ(0.004); R.group.add(this.glass);
    this._setLayer(LAYER_R);
    // record YOU's rig calls
    this.log = []; this.frames = [];
    this._wrap(pl.rig);
    this.delay = 0; this.alive = false; this.out = false; this.x = MIRROR.x; this.z = MIRROR.z;
    this.piece = null;
  }

  _wrap(rig) {
    const self = this;
    this._orig = { play: rig.play, once: rig.once, upperOnce: rig.upperOnce, upperStop: rig.upperStop };
    const rec = (k) => function (...args) { self.log.push({ t: self.f.t, k, args }); return self._orig[k].apply(this, args); };
    rig.play = rec('play'); rig.once = rec('once'); rig.upperOnce = rec('upperOnce'); rig.upperStop = rec('upperStop');
    this._rig = rig;
  }
  dispose() { if (this._rig) Object.assign(this._rig, this._orig); this.rt.dispose(); }

  _setLayer(L) { this.model.traverse((m) => { if (m.isMesh) m.layers.set(L); }); }
  // at load: compile the reflection as the glass draws it (its own camera and key light) and as it steps out
  // (porcelain, in the room's light), so neither compiles on the spot (a second's freeze when she first shows)
  warm() {
    const f = this.f, r = f.app.renderer, prev = r.getRenderTarget(), vis = this.root.visible;
    this.root.visible = true;
    const c = this.cam; c.position.set(MIRROR.x, 1.6, MIRROR.z + 5); c.lookAt(MIRROR.x, 1.2, MIRROR.z); c.aspect = 0.5; c.near = 0.3; c.far = 80; c.updateProjectionMatrix(); c.updateMatrixWorld();
    try {
      r.setRenderTarget(this.rt); r.compile(f.scene, c); r.render(f.scene, c);
      this._setLayer(0); this._porcelain(true);
      r.setRenderTarget(f.app.post.target); r.compile(f.scene, f.cam.cam);
    } catch (e) { console.warn('reflection warm', e.message); }
    this._porcelain(false); this._setLayer(LAYER_R);
    r.setRenderTarget(prev); this.root.visible = vis;
  }
  // every material to white glaze, her two ring blades to gold leaf (names: ring_L/ring_R holders, the crescent
  // blades; not "Tailoring", which also contains "ring": her coat is glaze like the rest of her)
  _porcelain(on) { for (const [m, mat] of this.normal) m.material = on ? (RING.test(m.name) || RING.test(m.parent?.name || '') ? this.gold : this.glaze) : mat; }

  // where it stands (world)
  pos() { return { x: this.x, z: this.z }; }

  at(t) {
    this.log.length = 0; this.frames.length = 0;
    this.delay = t >= T_LATE ? this.f.beat * 2 : 0;
    this.out = t >= T_OUT && t < T_END;
    this.alive = this.out;
    this.dead = t >= T_END;
    this._setLayer(this.out ? 0 : LAYER_R);
    this._porcelain(this.out);
    this.root.visible = t >= T_ON && !this.dead;
    this.glass.visible = t >= T_ON && t < T_OUT;
    if (this.piece) { this.R._unstage(this.piece); this.piece = null; }
    if (this.out) this._enter(true);
  }

  // out through the frame: in the room now, a breakable porcelain echo
  _enter(quiet) {
    const R = this.R, f = this.f;
    this.out = this.alive = true; this.dead = false;
    this._setLayer(0); this._porcelain(true);
    this.glass.visible = false;
    this.root.visible = true;
    this.x = this.panel.cx; this.z = this.panel.cz;
    this.enterT = f.t;
    this.piece = R.stage.add(this.root, { solid: false, breakable: { hp: 3, chips: new THREE.Color(2.4, 2.3, 2.2), onBreak: () => this.shatter() } });
    this.hits = new Set(); this.cool = -9; this.spent = false;
    if (!quiet) f.fx.glitter(this.x, 1.3, this.z, new THREE.Color(2.6, 2.6, 3.0), 30, 1);
  }
  shatter() {
    if (!this.alive) return;
    const f = this.f;
    this.alive = false; this.dead = true; this.root.visible = false;
    if (this.piece) { this.R._unstage(this.piece); this.piece = null; }
    f.fx.chips(this.x, 1.0, this.z, new THREE.Color(2.4, 2.3, 2.2), 40); f.fx.glitter(this.x, 1.2, this.z, new THREE.Color(2.8, 2.8, 3.2), 40, 1.2);
    f.player.addMeter(0.5);
    this.R.snd.glass(this.x);
  }
  netHit() { this.shatter(); }
  hitBy() { if (this.piece) this.R.stage.hit(this.piece, 1, 0); }

  update(dt, t) {
    const f = this.f, pl = f.player;
    if (t < T_ON - 0.05 || this.dead) { this.root.visible = false; this.glass.visible = false; if (!this.dead) this.log.length = 0; return; }
    if (!this.out && t >= T_OUT) this._enter(false);
    if (this.out && t >= T_END && this.alive) this.shatter();
    if (!this.out) this.root.visible = true;
    // the delay: none at first, two beats from "in the fitting room"
    const want = t >= T_LATE ? f.beat * 2 : 0;
    if (this.delay < want) this.delay = want;
    // record where YOU is; replay what YOU did `delay` ago
    this.frames.push({ t, x: pl.x, z: pl.z, fa: pl.facing, lx: pl.rig.lean.x, ly: pl.rig.lean.y });
    const tt = t - this.delay;
    while (this.frames.length > 2 && this.frames[1].t <= tt) this.frames.shift();
    while (this.log.length && this.log[0].t <= tt) { const e = this.log.shift(); try { this.rig[e.k](...e.args); } catch (err) { /* a clip YOU had */ } if (this.out && e.k === 'once' && STRIKES.has(e.args[0])) this._strike(e.args[1]); }
    const fr = this.frames[0];
    let x = fr.x, z = fr.z;
    if (this.out) { const k = M.clamp((t - this.enterT) / 0.5, 0, 1); x = this.panel.cx + (fr.x - this.panel.cx) * k; z = this.panel.cz + (fr.z - this.panel.cz) * k; }
    this.x = x; this.z = z;
    this.root.position.set(x, 0, z); this.root.rotation.y = fr.fa;
    this.rig.lean.set(fr.lx, fr.ly);
    this.rig.update(dt);
    if (!this.out) { this.glass.visible = t >= T_ON; this.glass.material.uniforms.uA.value = M.clamp((t - T_ON) / 0.2, 0, 1) * (t > 84 ? 0.75 + 0.25 * Math.sin(t * 13) : 1); if ((this._odd = !this._odd)) this._render(); return; }
    // out in the room: touching it hurts YOU and knocks it a beat further behind. It can't hit twice in a row: its
    // touch comes back only once YOU has stepped clear of it (its replayed strikes still land where YOU was)
    const dYou = Math.hypot(pl.x - x, pl.z - z);
    if (this.spent && dYou > 1.2) { this.spent = false; this.cool = t + f.beat; }
    if (this.alive && !this.spent && t > this.cool && dYou < 0.75) {
      const r = M.touch(f, x, z, 0.4, { why: 'reflection' });
      if (r === 'hit') { this.spent = true; this.delay += f.beat; }
    }
    // a return or a ring through it is a hit
    if (this.alive && this.piece) {
      for (const p of f.proj.list) if (p.owner === 'you' && !p.dead && Math.hypot(p.x - x, p.z - z) < 0.8) { p.dead = true; this.R.stage.hit(this.piece, 1, 0); }
      for (const r of pl.rings) { if (r.state === 'hand') { this.hits.delete(r); continue; } if (!this.hits.has(r) && Math.hypot(r.pos.x - x, r.pos.z - z) < 0.8) { this.hits.add(r); this.R.stage.hit(this.piece, 1, 0); } }
    }
  }

  // its strike lands where YOU was: on YOU if YOU stood still, on her if she's in reach
  _strike(o = {}) {
    const f = this.f, self = this;
    f.after((o.duration || 0.28) * 0.5, () => {
      if (!self.alive || f.state !== 'play') return;
      const fa = self.root.rotation.y, pl = f.player, b = f.boss;
      const inArc = (px, pz, r) => { const dx = px - self.x, dz = pz - self.z, d = Math.hypot(dx, dz); if (d > r) return false; const a = Math.atan2(dx, dz); return Math.abs(M.angDiff(a, fa)) < 1.3 || d < 0.6; };
      f.audio && f.audio.tone && f.audio.tone(2900, { type: 'triangle', a: 0.001, d: 0.03, peak: 0.11, out: f.audio.pan(f.pan(self.x)) });
      if (inArc(pl.x, pl.z, 2.1)) { if (pl.hurt(f._ctx(0), 1, self.x, self.z, 'reflection')) f._hurt(self.x, self.z); }
      if (b.targetable && inArc(b.x, b.z, 2.1 + b.radius)) b.takeHit({ dmg: M.U, kind: 'echo', heavy: false, x: self.x, z: self.z, onBeat: false });
    });
  }

  // the glass: a camera mirrored across the centre panel, seeing only the reflection
  _render() {
    const f = this.f, r = f.app.renderer, cam = f.cam.cam, p = this.panel.mesh;
    p.updateMatrixWorld();
    // only when the mirror is in the picture
    this._fr ||= new THREE.Frustum(); this._pm ||= new THREE.Matrix4();
    this._fr.setFromProjectionMatrix(this._pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    this._sp ||= new THREE.Sphere(); this._sp.set(p.getWorldPosition(new THREE.Vector3()), 1.6);
    if (!this._fr.intersectsSphere(this._sp)) return;
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(p.getWorldQuaternion(new THREE.Quaternion()));
    const pp = p.getWorldPosition(new THREE.Vector3()), cp = cam.getWorldPosition(new THREE.Vector3());
    const view = pp.clone().sub(cp); if (view.dot(n) > 0) return;
    view.reflect(n).negate().add(pp);
    const rot = new THREE.Matrix4().extractRotation(cam.matrixWorld);
    const look = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(cp);
    const target = pp.clone().sub(look).reflect(n).negate().add(pp);
    const c = this.cam;
    c.position.copy(view); c.up.set(0, 1, 0).applyMatrix4(rot).reflect(n); c.lookAt(target);
    c.fov = cam.fov; c.aspect = cam.aspect; c.near = 0.3; c.far = 80; c.updateProjectionMatrix(); c.updateMatrixWorld();
    c.projectionMatrix.elements[8] *= -1; c.projectionMatrix.elements[12] *= -1;
    this.tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(c.projectionMatrix).multiply(c.matrixWorldInverse);
    const prev = r.getRenderTarget(), bg = f.scene.background, cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
    f.scene.background = null; r.setClearColor(0x000000, 0);
    r.setRenderTarget(this.rt); r.clear(); r.render(f.scene, c);
    r.setRenderTarget(prev); r.setClearColor(cc, ca); f.scene.background = bg;
  }
}
