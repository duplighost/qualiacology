// The record: the game's menu. A black vinyl record on a turntable under a spotlight. Each track is a band
// of grooves on the disc; the label says MURDERPOP. Hover a band and it lights; a won track's groove is gold.
// Drop the needle on a band to play it. Flip the record for Side B.
import * as THREE from 'three';
import { makeKeepsake, KEEPSAKE_SIZE } from './keepsakes.js';

const REC_R = 3.0, LABEL_R = 1.02;

const REC_VS = /* glsl */`
varying vec2 vP; varying vec3 vW; varying vec3 vN;
void main() { vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * (viewMatrix * w); }`;
const REC_FS = /* glsl */`
uniform sampler2D tLabel; uniform float uSpin; uniform vec3 uLight; uniform vec3 uCam;
uniform float uBands[24]; uniform float uHover; uniform float uWon[12]; uniform float uN; uniform float uTime; uniform float uFlip;
varying vec2 vP; varying vec3 vW; varying vec3 vN;
float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }
void main() {
  float r = length(vP);
  float ang = atan(vP.y, vP.x);
  if (r > ${REC_R.toFixed(3)}) discard;
  vec3 col;
  if (r < ${LABEL_R.toFixed(3)}) {
    // the label, spinning with the record
    float a = ang - uSpin;
    vec2 uv = vec2(cos(a), sin(a)) * r / ${LABEL_R.toFixed(3)} * 0.5 + 0.5;
    col = texture2D(tLabel, uv).rgb;
    if (r < 0.06) col = vec3(0.02);
    gl_FragColor = vec4(col, 1.0); return;
  }
  // grooves: fine rings; the spaces between tracks are smooth and glossy
  int band = -1; float bandK = 0.0;
  for (int i = 0; i < 12; i++) {
    if (float(i) >= uN) break;
    float r0 = uBands[i * 2], r1 = uBands[i * 2 + 1];
    if (r >= r0 && r <= r1) { band = i; bandK = (r - r0) / (r1 - r0); }
  }
  float groove = 0.5 + 0.5 * sin(r * 900.0 + hash(floor(r * 300.0)) * 2.0);
  float rough = band >= 0 ? 0.45 + 0.3 * groove : 0.15;
  // anisotropic sheen: light catches the grooves along a line through the centre toward the light
  vec2 toL = normalize(uLight.xz - vW.xz);
  vec2 tang = normalize(vec2(-vP.y, vP.x));
  vec3 V = normalize(uCam - vW);
  float aniso = clamp(abs(dot(tang, toL)), 0.0, 1.0);
  float sheen = pow(max(0.0, 1.0 - aniso), 18.0) * (band >= 0 ? 1.0 : 0.4);
  vec3 base = vec3(0.012, 0.01, 0.014);
  col = base + vec3(0.32, 0.3, 0.36) * sheen * (0.6 + 0.4 * groove);
  // track bands: won = gold, hover = pink
  if (band >= 0) {
    float won = uWon[band];
    float edge = smoothstep(0.0, 0.08, bandK) * smoothstep(1.0, 0.92, bandK);
    col += vec3(0.62, 0.4, 0.09) * won * (0.14 + 0.86 * sheen) * (0.7 + 0.3 * groove) * edge;
    // the groove you're on catches pink light along its rings (vinyl, not a painted band)
    if (float(band) == uHover) col += vec3(0.6, 0.06, 0.24) * (0.22 + 0.78 * sheen + 0.08 * sin(uTime * 6.0)) * (0.5 + 0.5 * groove) * edge;
  }
  // the lead-in and the gaps
  if (band < 0 && r > ${(LABEL_R + 0.08).toFixed(3)}) col += vec3(0.05) * pow(max(0.0, 1.0 - aniso), 30.0);
  // the edge bevel
  col += vec3(0.25) * smoothstep(${(REC_R - 0.03).toFixed(3)}, ${REC_R.toFixed(3)}, r);
  gl_FragColor = vec4(col, 1.0);
}`;

function labelCanvas(side, tracks, encore = false) {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  const grd = g.createRadialGradient(512, 512, 60, 512, 512, 512);
  // the encore pressing is gold
  if (encore) { grd.addColorStop(0, '#ffe08a'); grd.addColorStop(0.7, '#f2c25b'); grd.addColorStop(1, '#9a6a14'); }
  else { grd.addColorStop(0, '#ff5fa8'); grd.addColorStop(0.7, '#ff2e88'); grd.addColorStop(1, '#a8004a'); }
  g.fillStyle = grd; g.beginPath(); g.arc(512, 512, 512, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,240,245,.55)'; g.lineWidth = 6; g.beginPath(); g.arc(512, 512, 470, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#fff4f8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 118px "Archivo Black", Arial Black, sans-serif';
  g.save(); g.translate(512, 330); g.fillText('MURDER', 0, 0); g.restore();
  g.save(); g.translate(512, 450); g.fillText('POP', 0, 0); g.restore();
  g.font = 'italic 600 44px Fraunces, Georgia, serif'; g.fillStyle = '#ffe1ee';
  g.fillText(side === 'A' ? 'Side A' : 'Side B', 512, 640);
  g.font = '600 26px "Space Grotesk", sans-serif'; g.fillStyle = 'rgba(255,240,246,.8)';
  g.fillText('33⅓', 512, 720);
  g.fillText('DOOPLISS', 512, 790);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export class RecordMenu {
  constructor(app) {
    this.app = app;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050307);
    this.cam = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);
    this.cam.position.set(1.2, 9.4, 6.9); this.cam.lookAt(1.75, -0.2, 0.25);
    this.side = 'A'; this.hover = -1; this.spin = 0; this.spinV = 0.35; this.flipK = 0; this.flipping = 0;
    this.tracks = [];
    // the plinth and platter
    const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x1a0d0b, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.18 });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.6, 7.4), lacquer); plinth.position.set(0.9, -0.42, 0); this.scene.add(plinth);
    const brass = new THREE.MeshStandardMaterial({ color: 0xd8a64a, metalness: 1, roughness: 0.25 });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.05, 7.5), brass); trim.position.set(0.9, -0.1, 0); this.scene.add(trim);
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.15, 0.14, 128), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.8, roughness: 0.35 })); platter.position.y = -0.04; this.scene.add(platter);
    // the record
    this.recMat = new THREE.ShaderMaterial({ vertexShader: REC_VS, fragmentShader: REC_FS,
      uniforms: { tLabel: { value: labelCanvas('A', []) }, uSpin: { value: 0 }, uLight: { value: new THREE.Vector3(-3, 8, -2) }, uCam: { value: this.cam.position },
        uBands: { value: new Array(24).fill(0) }, uHover: { value: -1 }, uWon: { value: new Array(12).fill(0) }, uN: { value: 0 }, uTime: { value: 0 }, uFlip: { value: 0 } } });
    this.record = new THREE.Mesh(new THREE.CircleGeometry(REC_R, 256), this.recMat);
    this.record.rotation.x = -Math.PI / 2; this.record.position.y = 0.05;
    this.recGroup = new THREE.Group(); this.recGroup.add(this.record); this.scene.add(this.recGroup);
    // the spindle
    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16), brass); spindle.position.y = 0.15; this.scene.add(spindle);
    // the tonearm: a pivot at the right, the arm, the head
    this.arm = new THREE.Group(); this.arm.position.set(4.1, 0.35, -2.4); this.scene.add(this.arm);
    const chrome = new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 1, roughness: 0.12 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.5, 40), chrome); base.position.y = -0.2; this.scene.add(base); base.position.copy(this.arm.position).add(new THREE.Vector3(0, -0.25, 0));
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 4.2, 16), chrome); tube.rotation.x = Math.PI / 2; tube.position.z = 2.1; this.arm.add(tube);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.55), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.4, roughness: 0.4 })); head.position.set(0, -0.05, 4.25); this.arm.add(head);
    const counter = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 32), chrome); counter.rotation.x = Math.PI / 2; counter.position.z = -0.45; this.arm.add(counter);
    this.armRest = -0.55; this.armAng = this.armRest; this.armTarget = this.armRest; this.armLift = 0.3; this.armLiftT = 0.3;
    // light
    const spot = new THREE.SpotLight(0xffe2c4, 70, 26, 0.62, 0.85, 1.6); spot.position.set(-2.5, 9, -1.5); spot.target.position.set(0.2, 0, 0.2); this.scene.add(spot, spot.target);
    this.scene.add(new THREE.HemisphereLight(0x3a2a44, 0x060407, 0.35));
    const rim = new THREE.PointLight(0xff2e88, 9, 12, 1.6); rim.position.set(6.5, 1.6, 3.5); this.scene.add(rim);
    const back = new THREE.PointLight(0x8a5cff, 5, 14, 1.6); back.position.set(-6, 2.5, -5); this.scene.add(back);
    // the room behind: a wall with a pink neon tube, out of focus by distance
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshStandardMaterial({ color: 0x120a10, roughness: 0.9 })); wall.position.set(0, 2, -9); this.scene.add(wall);
    const neonTube = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.06, 12, 80, Math.PI * 1.25), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 0.4, 1.4) })); neonTube.position.set(-6.5, 3.4, -8.8); neonTube.rotation.z = 0.4; this.scene.add(neonTube);
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2();
    this.onPick = null;
  }

  setTracks(side, tracks, wonIds = new Set()) {
    this.side = side; this.tracks = tracks;
    const n = tracks.length, inner = LABEL_R + 0.18, outer = REC_R - 0.12, gap = 0.05;
    const bands = new Array(24).fill(0), won = new Array(12).fill(0);
    // the first track is on the outside, like a real record
    const total = tracks.reduce((a, t) => a + (t.length || 200), 0);
    let r = outer;
    tracks.forEach((t, i) => {
      const w = ((outer - inner) - gap * (n - 1)) * (t.length || 200) / total;
      bands[i * 2] = r - w; bands[i * 2 + 1] = r; t._r0 = r - w; t._r1 = r; r -= w + gap;
      won[i] = wonIds.has(t.id) ? 1 : 0;
    });
    const u = this.recMat.uniforms; u.uBands.value = bands; u.uWon.value = won; u.uN.value = n;
    // each won track keeps her keepsake in its groove, going round with the record
    if (!this.keepGroup) { this.keepGroup = new THREE.Group(); this.keepGroup.position.y = 0.06; this.scene.add(this.keepGroup); }
    this.keepGroup.clear();
    tracks.forEach((t, i) => {
      if (!wonIds.has(t.id) || !t.prize) return;
      const k = makeKeepsake(t.prize); k.scale.setScalar(0.34 / (KEEPSAKE_SIZE[t.prize] || 0.1));
      const r = (t._r0 + t._r1) / 2, a = 0.9 + i * 2.39;
      k.position.set(Math.cos(a) * r, 0, -Math.sin(a) * r); k.rotation.y = a + Math.PI / 2;
      k.traverse((m) => { if (m.isMesh) m.castShadow = false; });
      this.keepGroup.add(k);
    });
    if (u.tLabel.value) u.tLabel.value.dispose();
    u.tLabel.value = labelCanvas(side, tracks, this.encore);
  }

  pick(mx, my) {
    this.ndc.set(mx * 2 - 1, -(my * 2 - 1));
    this.ray.setFromCamera(this.ndc, this.cam);
    const hit = this.ray.intersectObject(this.record)[0];
    if (!hit) return -1;
    const p = hit.point; const r = Math.hypot(p.x, p.z);
    return this.tracks.findIndex((t) => r >= t._r0 - 0.02 && r <= t._r1 + 0.02);
  }

  // arm angle so the stylus sits over radius r (approximate: rotate about the pivot)
  _armFor(r) {
    const pv = this.arm.position, L = 4.25;
    // find the angle where the head is at distance r from the centre
    let best = this.armRest, bd = 1e9;
    for (let a = -1.2; a <= 0.6; a += 0.002) { const hx = pv.x + Math.sin(a) * L, hz = pv.z + Math.cos(a) * L; const d = Math.abs(Math.hypot(hx, hz) - r); if (d < bd) { bd = d; best = a; } }
    return best;
  }
  hoverTo(i) {
    this.hover = i; this.recMat.uniforms.uHover.value = i;
    const t = this.tracks[i];
    this.armTarget = t ? this._armFor((t._r0 + t._r1) / 2 + 0.05) : this.armRest;
  }
  drop() { this.armLiftT = 0; }   // the needle goes down
  lift() { this.armLiftT = 0.3; }
  // after the credits: close on the label going round, the needle in the run-out groove; it lifts, and we pull back
  runout() {
    this.runT = 0; this.armTarget = this._armFor(LABEL_R + 0.12); this.armAng = this.armTarget; this.armLift = 0; this.armLiftT = 0;
    this._camHome = this._camHome || { p: new THREE.Vector3(1.2, 9.4, 6.9), l: new THREE.Vector3(1.75, -0.2, 0.25) };
  }
  get runningOut() { return this.runT !== undefined && this.runT >= 0; }

  update(dt, time) {
    if (this.runT !== undefined && this.runT >= 0) {
      this.runT += dt;
      const close = { p: new THREE.Vector3(0.35, 3.3, 1.55), l: new THREE.Vector3(0, 0, 0) };
      if (this.runT > 2.2 && this.armLiftT === 0) { this.armLiftT = 0.3; this.app.sfx.ui && this.app.sfx.ui('back'); }
      if (this.runT > 3.0) this.armTarget = this.armRest;
      const k = Math.min(1, Math.max(0, (this.runT - 3.4) / 2.4)), e = k * k * (3 - 2 * k);
      const h = this._camHome;
      this.cam.position.lerpVectors(close.p, h.p, e);
      const look = close.l.clone().lerp(h.l, e); this.cam.lookAt(look);
      if (this.runT > 5.9) { this.runT = -1; this.onRunoutDone && this.onRunoutDone(); }
    }
    this.spinV += ((this.dropping ? 0.9 : 0.35) - this.spinV) * Math.min(1, dt * 2);
    this.spin += this.spinV * dt * Math.PI * 2 * 0.55;
    this.recMat.uniforms.uSpin.value = this.spin;
    if (this.keepGroup) this.keepGroup.rotation.y = this.spin;
    this.recMat.uniforms.uTime.value = time;
    this.armAng += (this.armTarget - this.armAng) * Math.min(1, dt * 7);
    this.armLift += (this.armLiftT - this.armLift) * Math.min(1, dt * 8);
    this.arm.rotation.y = this.armAng;
    this.arm.position.y = 0.35 + this.armLift;
  }
  render(renderer, post, time) { post.render(this.scene, this.cam, time); }
  setAspect(a) { this.cam.aspect = a; this.cam.updateProjectionMatrix(); }
}
