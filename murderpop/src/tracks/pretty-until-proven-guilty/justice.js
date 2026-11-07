// LADY JUSTICE, the judge (design §4): a seated white-marble statue behind the bench, blindfolded in gold. Her
// right hand (screen left) holds the 2.2 m gold gavel over a brass sound block; every verdict, she raises it over
// a beat and strikes on the downbeat, and a gold shockwave rolls across the floor (harmless). Her left hand
// (screen right) holds up the scales: the PRETTY pan with its pink glass heart, the GUILTY pan where the case
// against her piles up. All real-time: the arm is a two-bone reach on the statue's skeleton.
import * as THREE from 'three';
import { PAN } from './court.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
export const BLOCK = new THREE.Vector3(-2.4, 1.62, -7.3);     // the brass sound block on the bench
export const BEAM = new THREE.Vector3(2.6, 5.4, -7.8);        // the scales' beam
const ease = (k) => k * k * (3 - 2 * k);

function marbleTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#f1ede7'; g.fillRect(0, 0, 512, 512);
  // soft grey-gold veins
  for (let k = 0; k < 26; k++) {
    g.strokeStyle = k % 5 === 0 ? 'rgba(196,160,96,0.35)' : 'rgba(150,140,140,0.22)'; g.lineWidth = 0.6 + Math.random() * 2.2;
    g.beginPath(); let x = Math.random() * 512, y = Math.random() * 512; g.moveTo(x, y);
    for (let i = 0; i < 14; i++) { x += (Math.random() - 0.3) * 60; y += (Math.random() - 0.5) * 50; g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

// a two-bone reach: point upper (its +Y toward the child) and lower so that the hand lands on `target`,
// the elbow bending toward `pole`
export function reach(upper, lower, hand, target, pole) {
  const S = upper.getWorldPosition(new THREE.Vector3()), E0 = lower.getWorldPosition(new THREE.Vector3()), H0 = hand.getWorldPosition(new THREE.Vector3());
  const L1 = S.distanceTo(E0), L2 = E0.distanceTo(H0);
  const toT = target.clone().sub(S); let d = toT.length();
  d = Math.min(d, (L1 + L2) * 0.999); toT.setLength(d);
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const dir = toT.clone().normalize();
  const pv = pole.clone().sub(S); pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize();
  const E = S.clone().addScaledVector(dir, a).addScaledVector(pv, h);
  const H = S.clone().add(toT);
  aimBone(upper, E0, E);
  lower.updateWorldMatrix(true, false);
  aimBone(lower, lower.getWorldPosition(new THREE.Vector3()).add(hand.getWorldPosition(new THREE.Vector3()).sub(lower.getWorldPosition(new THREE.Vector3()))), H);
}
// rotate a bone (in world space, about its own origin) so its child at `cur` moves to `want`
function aimBone(bone, cur, want) {
  bone.updateWorldMatrix(true, false);
  const o = bone.getWorldPosition(new THREE.Vector3());
  const a = cur.clone().sub(o).normalize(), b = want.clone().sub(o).normalize();
  if (a.lengthSq() < 1e-8 || b.lengthSq() < 1e-8) return;
  const rot = new THREE.Quaternion().setFromUnitVectors(a, b);
  const wq = bone.getWorldQuaternion(new THREE.Quaternion());
  const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pq.invert().multiply(rot.multiply(wq)));
  bone.updateWorldMatrix(false, true);
}

export class Justice {
  constructor(f, o = {}) {
    this.f = f; this.group = new THREE.Group(); this.group.name = 'ppg:justice'; f.scene.add(this.group);
    this.strikes = [];          // [{t, raise, hold}] scheduled gavel strikes
    this.tremUntil = -9;
    this.tilt = 0.25; this.tiltV = 0; this.tiltTarget = 0.25;   // + = GUILTY pan down
    this.panItems = [];
    this.waves = [];
    this.scale = o.scale ?? 4.0;
    this.base = new THREE.Vector3(o.x ?? 0.0, 0, o.z ?? -9.5);
    this.seatTop = 1.9;
    this.ready = this._build(o);
  }

  async _build(o) {
    const f = this.f;
    const mat = this.marble = new THREE.MeshPhysicalMaterial({ color: 0xf1ede7, map: marbleTexture(), roughness: 0.33, clearcoat: 0.4, clearcoatRoughness: 0.25, sheen: 0.2, sheenColor: new THREE.Color(0xffe8d0) });
    const gold = this.gold = new THREE.MeshPhysicalMaterial({ color: 0xd8a443, metalness: 1, roughness: 0.24, emissive: new THREE.Color(0x3a2000), emissiveIntensity: 0.2 });
    this.goldMat = gold;
    // the statue: the base body, seated, in marble, scaled up
    const kit = o.kit;
    const gl = await kit.load('assets/characters/base/Superhero_Female_FullBody.gltf');
    const model = kit.instance(gl);
    model.traverse((m) => { if (m.isMesh) { m.material = m.name.startsWith('Eye') ? mat : mat; m.castShadow = true; m.receiveShadow = true; } });
    model.scale.setScalar(this.scale);
    const root = this.root = new THREE.Group(); root.add(model);
    root.position.copy(this.base); root.rotation.y = 0;
    this.group.add(root);
    this.bones = {}; model.traverse((b) => { if (b.isBone) this.bones[b.name] = b; });
    this.mixer = new THREE.AnimationMixer(model);
    const clip = kit.clips.Sitting_Idle_Loop;
    if (clip) { const a = this.mixer.clipAction(clip); a.play(); this.mixer.update(0.4); a.paused = true; }
    // her hands close round the gavel and the scales' post
    for (const s of ['l', 'r']) for (const fn of ['index', 'middle', 'ring', 'pinky']) for (let j = 1; j <= 3; j++) { const b = this.bones[`${fn}_0${j}_${s}`]; if (b) b.rotateZ((s === 'r' ? -1 : 1) * (j === 1 ? 1.0 : 1.2)); }
    for (const s of ['l', 'r']) { const b = this.bones[`thumb_02_${s}`]; if (b) b.rotateZ((s === 'r' ? -1 : 1) * 0.5); }
    root.updateWorldMatrix(true, true);
    // seat her on the throne: the hips just above its top
    const pel = this.bones.pelvis.getWorldPosition(new THREE.Vector3());
    root.position.y += this.seatTop + 0.1 * this.scale - pel.y;
    root.updateWorldMatrix(true, true);
    this.rest = {}; for (const [n, b] of Object.entries(this.bones)) this.rest[n] = b.quaternion.clone();
    { const b = this.bones; const a = b.upperarm_r.getWorldPosition(new THREE.Vector3()), e = b.lowerarm_r.getWorldPosition(new THREE.Vector3()), h = b.hand_r.getWorldPosition(new THREE.Vector3()); this.armLen = (a.distanceTo(e) + e.distanceTo(h)) * 0.97; }
    // a gold blindfold
    const head = this.bones.Head;
    if (head) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 8, 40), gold);
      band.scale.set(1, 1, 1.2); band.position.set(0, 0.1, 0.01); band.rotation.x = Math.PI / 2 + 0.12;
      head.add(band);
    }
    // a marble drape over her lap, falling in pleats to the floor in front of the throne
    {
      const n = 26, m = 20, P = [], I = [], U = [];
      const knee = this.bones.calf_l.getWorldPosition(new THREE.Vector3()), hip = this.bones.pelvis.getWorldPosition(new THREE.Vector3());
      const zK = knee.z + 0.25, yK = knee.y + 0.18, yH = hip.y + 0.25, zH = hip.z;
      for (let i = 0; i <= m; i++) {
        const v = i / m;
        // waist -> over the knees -> down to the dais
        const y = v < 0.45 ? THREE.MathUtils.lerp(yH, yK, v / 0.45) : THREE.MathUtils.lerp(yK, 0.2, (v - 0.45) / 0.55);
        const z = v < 0.45 ? THREE.MathUtils.lerp(zH, zK, Math.sin(v / 0.45 * Math.PI / 2)) : zK + 0.05 + 0.25 * (v - 0.45);
        const w = THREE.MathUtils.lerp(0.95, 1.35, v);
        for (let j = 0; j <= n; j++) {
          const u = j / n - 0.5, pleat = Math.sin(u * Math.PI * 9) * 0.06 * (0.3 + v);
          P.push(this.base.x + u * 2 * w, y, z + pleat - Math.pow(Math.abs(u) * 2, 3) * 0.35); U.push(j / n, v);
        }
      }
      for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) { const a = i * (n + 1) + j, b = a + n + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
      const drape = new THREE.Mesh(g, mat.clone()); drape.material.side = THREE.DoubleSide; drape.castShadow = true; this.group.add(drape);
    }
    // the throne: a marble block with a gold band
    const throne = new THREE.Mesh(new THREE.BoxGeometry(3.6, this.seatTop, 2.0), mat); throne.position.set(this.base.x, this.seatTop / 2, this.base.z - 0.3); throne.castShadow = true; this.group.add(throne);
    const tb = new THREE.Mesh(new THREE.BoxGeometry(3.64, 0.08, 2.04), gold); tb.position.set(this.base.x, this.seatTop - 0.04, this.base.z - 0.3); this.group.add(tb);
    // her own light: a white statue reads from the high camera
    const spot = this.spot = new THREE.SpotLight(0xfff2e4, 160, 30, 0.42, 0.6, 2.0); spot.position.set(0.5, 11, -1.5); spot.target.position.set(0, 4.2, -9.4);
    this.group.add(spot, spot.target);
    // the gavel (world space: the handle's end in her hand, pointing at its head)
    const gav = this.gavelMesh = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 2.2, 14), gold); handle.position.y = 1.0; gav.add(handle);
    const ghead = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.8, 24), gold); ghead.rotation.z = Math.PI / 2; ghead.position.y = 2.1; gav.add(ghead);
    for (const s of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 8, 24), gold); ring.rotation.y = Math.PI / 2; ring.position.set(s * 0.32, 2.1, 0); gav.add(ring); }
    gav.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    this.group.add(gav);
    // the brass sound block
    const block = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.16, 28), new THREE.MeshPhysicalMaterial({ color: 0xb88a3e, metalness: 1, roughness: 0.3 }));
    block.position.copy(BLOCK).setY(BLOCK.y - 0.06); this.group.add(block);
    // the scales
    const sc = this.scales = new THREE.Group(); sc.position.copy(BEAM); this.group.add(sc);
    const beam = this.beam = new THREE.Group(); sc.add(beam);
    beam.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.0, 12).rotateZ(Math.PI / 2), gold));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 10), gold); post.position.y = 0.45; sc.add(post);
    const orn = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), gold); orn.position.y = 0.95; sc.add(orn);
    this.pans = [];
    for (const s of [-1, 1]) {
      const hang = new THREE.Group(); hang.position.x = s * 1.4; beam.add(hang);
      const swing = new THREE.Group(); hang.add(swing);
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 2.0, 4), gold); ch.position.set(Math.cos(a) * 0.32, -1.0, Math.sin(a) * 0.32); ch.lookAt(new THREE.Vector3(0, 0, 0)); ch.rotateX(Math.PI / 2); swing.add(ch); }
      const pan = new THREE.Mesh(new THREE.SphereGeometry(0.6, 28, 10, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), gold); pan.position.y = -1.75; pan.material = gold;
      swing.add(pan);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.025, 8, 32), gold); rim.rotation.x = Math.PI / 2; rim.position.y = -2.0; swing.add(rim);
      this.pans.push({ hang, swing, pan, items: new THREE.Group() });
      swing.add(this.pans[this.pans.length - 1].items); this.pans[this.pans.length - 1].items.position.y = -1.98;
    }
    // PRETTY pan (screen left of the beam): a pink glass heart
    const hs = new THREE.Shape(); hs.moveTo(0, -0.25); hs.bezierCurveTo(0.36, 0.02, 0.25, 0.3, 0, 0.14); hs.bezierCurveTo(-0.25, 0.3, -0.36, 0.02, 0, -0.25);
    const heart = this.heart = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 }), new THREE.MeshPhysicalMaterial({ color: 0xff6fa8, roughness: 0.04, transparent: true, opacity: 0.9, clearcoat: 1, emissive: new THREE.Color(0xff2f80), emissiveIntensity: 0.5 }));
    heart.position.set(-0.0, 0.26, -0.06); heart.scale.setScalar(0.8);
    this.pans[0].items.add(heart);
    this.group.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    // the shockwave decal
    this.waveMat = (c) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uR: { value: 0.1 }, uA: { value: 1 } },
      vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uR, uA; varying vec2 vU; void main(){ float d = length(vU); float w = 0.3;
        float band = smoothstep(uR - w * 2.0, uR - w * 0.2, d) * (1.0 - smoothstep(uR - 0.05, uR + 0.08, d));
        float a = band * uA; if (a < 0.003) discard; gl_FragColor = vec4(vec3(1.25, 0.8, 0.22) * a, a); }` });
    this.waveGeo = new THREE.CircleGeometry(30, 128);
  }

  // ---------------------------------------------------------------- the gavel's schedule
  gavel(t, raise, peak) {
    if (this.strikes.some((s) => Math.abs(s.t - t) < 0.05)) return;
    const bt = this.f.beat;
    this.strikes.push({ t, raise: raise ?? t - bt, peak: peak ?? t - 0.1, hit: false });
    this.strikes.sort((a, b) => a.t - b.t);
    this.f.ppg && this.f.ppg.snd && this.f.at(raise ?? t - bt, () => this.f.ppg.snd.play('grind', { pan: this.f.pan(BLOCK.x), gain: 0.6 }));
  }
  strike(t) {
    // the gold shockwave from the sound block (harmless), the scales slam to GUILTY
    if (this.waveGeo) {
      const m = new THREE.Mesh(this.waveGeo, this.waveMat()); m.rotation.x = -Math.PI / 2; m.position.set(BLOCK.x, 0.05, BLOCK.z); m.renderOrder = 4;
      this.group.add(m); this.waves.push({ m, t0: t, age: 0 });
    }
    this.tiltTarget = -0.32; this.tiltV -= 2.4;
    const f = this.f;
    f.cam.shake(0.7, 0.18); f.cam.kick(1.0);
    f.fx.sparks(BLOCK.x, BLOCK.y + 0.2, BLOCK.z, new THREE.Color(3.4, 2.2, 0.7), 26);
    f.fx.flash(new THREE.Color(0.022, 0.016, 0.006), 1);   // a pulse: the flash is added after exposure, so on black marble a little goes a long way
    f.ppg && f.ppg.onShock && f.ppg.onShock(t);
  }
  tremble(until) { this.tremUntil = Math.max(this.tremUntil, until); }
  settle() { this.tiltTarget = 0.25; this.tiltV += 1.2; }
  jolt() { this.tiltV -= 1.4; }
  panAdd(kind, mesh) {
    const p = this.pans[1]; if (!p) return;
    const m = mesh.clone(); m.scale.setScalar(0.45); const n = p.items.children.length;
    m.position.set(((n % 3) - 1) * 0.22, 0.06 + Math.floor(n / 3) * 0.08, ((n * 7) % 3 - 1) * 0.12); m.rotation.set(0, n * 1.3, 0);
    p.items.add(m); this.tiltV -= 0.8;
  }
  restorePan(list) {
    const p = this.pans[1]; if (!p) return;
    while (p.items.children.length) p.items.remove(p.items.children[0]);
    this._restoreList = list;
  }
  setStateAt(t) {
    this.strikes = this.strikes.filter((s) => s.t <= t);
    this.tremUntil = -9;
    for (const w of this.waves) this.group.remove(w.m); this.waves = [];
    this.tiltTarget = this.f.court && !this.f.court.pretty ? -0.32 : 0.25; this.tilt = this.tiltTarget; this.tiltV = 0;
  }

  // the arm: 0 = the gavel's head on the block, 1 = raised high
  armAt(t) {
    let k = 0.04;
    for (const s of this.strikes) {
      const top = Math.min(s.peak, s.t - 0.1), slam = s.t - 0.1;
      if (t >= s.raise && t < top) { const u = (t - s.raise) / Math.max(0.05, top - s.raise); k = 0.04 + (1 - 0.04) * (1 - Math.pow(1 - Math.min(1, u), 2)); }
      else if (t >= top && t < slam) k = 1 + 0.015 * Math.sin(t * 50);
      else if (t >= slam && t < s.t) { const u = (t - slam) / 0.1; k = 1 - u * u; }
      else if (t >= s.t && t < s.t + 0.6) { const u = (t - s.t) / 0.6; k = Math.max(k, 0.04 * ease(u) + (u < 0.15 ? 0.06 * Math.sin(u / 0.15 * Math.PI) : 0)); }
    }
    if (t < this.tremUntil && t > this.tremUntil - 6) k = Math.max(k, 0.92 + 0.02 * Math.sin(t * 60));
    return k;
  }

  update(dt, t) {
    if (!this.root) return;
    const b = this.bones;
    for (const [n, q] of Object.entries(this.rest)) b[n].quaternion.copy(q);
    this.root.updateWorldMatrix(true, true);
    // the gavel: a rigid swing about her shoulder, from the block (k=0) to straight up (k=1)
    const k = this.armAt(t);
    const S = b.upperarm_r.getWorldPosition(new THREE.Vector3());
    const toBlock = BLOCK.clone().add(new THREE.Vector3(0, 0.26, 0)).sub(S);
    const R = toBlock.length(), Lg = Math.max(2.2, R - this.armLen);
    const down = toBlock.clone().normalize();
    const back = new THREE.Vector3(0.15, 1, -0.45).normalize();
    const axis = new THREE.Vector3().crossVectors(down, back).normalize();
    const full = down.angleTo(back);
    const dir = down.clone().applyAxisAngle(axis, full * k);
    const H = S.clone().addScaledVector(dir, R - Lg);
    reach(b.upperarm_r, b.lowerarm_r, b.hand_r, H, S.clone().add(new THREE.Vector3(-2.0, -0.6, 1.2)));
    b.hand_r.getWorldPosition(this.gavelMesh.position);
    const G = S.clone().addScaledVector(dir, R);
    this.gavelMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), G.clone().sub(this.gavelMesh.position).normalize());
    this.gavelMesh.scale.set(1, G.distanceTo(this.gavelMesh.position) / 2.2, 1);
    // the scales arm: her left hand up at the beam's post
    if (b.upperarm_l && b.lowerarm_l && b.hand_l) reach(b.upperarm_l, b.lowerarm_l, b.hand_l, BEAM.clone().add(new THREE.Vector3(-0.05, 1.0, 0)), BEAM.clone().add(new THREE.Vector3(2, -2, 1)));
    // the scales: a damped spring toward the state, slammed by the gavel
    const target = this.f.court ? (this.f.court.pretty ? 0.25 : -0.32) : 0.25;
    this.tiltTarget = target;
    this.tiltV += ((this.tiltTarget - this.tilt) * 38 - this.tiltV * 5.5) * dt;
    this.tilt += this.tiltV * dt;
    this.beam.rotation.z = this.tilt * 0.55;
    for (const p of this.pans) { p.swing.rotation.z = -this.tilt * 0.55 + Math.sin(t * 1.3 + p.hang.position.x) * 0.02; }
    if (this.heart) this.heart.rotation.y = t * 0.6;
    if (this._restoreList && this.pans[1]) { const list = this._restoreList; this._restoreList = null; for (const kind of list) this.panAdd(kind, this.f.ppg.exhibitMesh(kind)); }
    // shockwaves: 18 m/s across the floor
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i]; w.age += dt; const r = w.age * 18;   // its own clock: it still rolls after the song clock stops
      w.m.material.uniforms.uR.value = r; w.m.material.uniforms.uA.value = Math.max(0, 1 - r / 28);
      if (r > 28 || t < w.t0 - 0.05) { this.group.remove(w.m); w.m.material.dispose(); this.waves.splice(i, 1); }
    }
  }
  shockRadius(t) { const w = this.waves[this.waves.length - 1]; return w ? w.age * 18 : -1; }
  dispose() { this.f.scene.remove(this.group); }
}
