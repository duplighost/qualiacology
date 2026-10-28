// Heart of the Party. One night out, for the both of them: the street of clubs, the square in
// every chorus, nine years ago past midnight in the second verse, his mother's street on a Sunday,
// the city gone quiet while the kick drum talks, and at the end of the runway, the stage. A heart
// hangs over the city where the moon would be and beats as hard as you keep the beat; at the end
// it comes down over the stage, where his drums play on their own.
// (The place itself is hpt-world.js and its set-pieces hpt-pieces*.js; it's all driven from the
// finale below, which main.js builds and updates every frame. Confetti and Vehicles here are
// shared by many songs.)

import * as THREE from 'three';
import { extend, glowAt, poolAt, col, local } from './scenery.js';
import { buildAmbulance, buildBus, buildSedan, buildPolice, buildHearse } from './vehicles.js';
import { PartyWorld } from './hpt-world.js';
import { fogged, merge, paint, rgb, box, cyl, sph, seeded, HFOG } from './hpt-sets.js';
import { heartGeo } from './hpt-pieces.js';
import { prepare, groundAt } from './trail.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const TAU = Math.PI * 2;

// ---------- the heart itself: the classic curve, extruded and rounded ----------
function heartGeometry() {
  const s = new THREE.Shape();
  const N = 96;
  for (let i = 0; i <= N; i++) {
    const t = i / N * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 5, bevelEnabled: true, bevelThickness: 5.5, bevelSize: 3.2, bevelSegments: 8, curveSegments: 48 });
  g.translate(0, 2.5, -2.5);   // centre the outline (y -17..12) and the depth
  g.computeVertexNormals();
  return g;
}

// ---------- the stage at the end of the runway ----------
// local frame: x across, +z toward her (the audience), y up from the ground; z 0 is the deck's
// front edge, which her road runs onto at deck height. dh: the deck's height.
const withUv = (g) => { if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; };
function stageGeometry(dh) {
  const parts = [], black = rgb(0x111016), steel = rgb(0x9a9aa6), dark = rgb(0x1a1820), gold = rgb(0xf0c060);
  // the deck, its lit edge, the skirt
  parts.push(paint(box(64, dh, 30, 0, dh / 2, -15), black));
  parts.push(paint(box(64.4, 0.25, 0.4, 0, dh - 0.1, 0.1), gold), paint(box(64.4, 0.18, 0.3, 0, 0.4, 0.15), rgb(0xff2a50)));
  for (let k = 0; k < 16; k++) parts.push(paint(box(0.2, dh - 0.6, 0.12, -30 + k * 4, dh / 2, 0.06), rgb(0x24202a)));
  // the riser for the drums, with steps
  parts.push(paint(box(16, 2.2, 11, 0, dh + 1.1, -17), dark), paint(box(16.2, 0.18, 0.2, 0, dh + 2.15, -11.4), gold));
  for (let k = 0; k < 3; k++) parts.push(paint(box(4, 0.73 * (k + 1), 1.2, 9.6, dh + 0.37 * (k + 1), -12 - k * 1.2), dark));
  // the screen's frame (the screen itself is its own mesh), and the black behind the stage
  parts.push(paint(box(52, 31, 1.2, 0, dh + 16, -27.4), black));
  // the towers and the roof truss: two legs each side, a box truss across the top
  const truss = (x0, y0, z0, x1, y1, z1, r = 0.22) => { const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), d = b.clone().sub(a), L = d.length(); const g = new THREE.CylinderGeometry(r, r, L, 6); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); parts.push(paint(g, steel)); };
  const H = dh + 36;
  for (const sx of [-1, 1]) for (const z of [-4, -26]) {
    for (const dx of [-0.9, 0.9]) for (const dz of [-0.9, 0.9]) truss(sx * 31 + dx, 0, z + dz, sx * 31 + dx, H, z + dz);
    for (let y = 2; y < H; y += 3) { truss(sx * 31 - 0.9, y, z - 0.9, sx * 31 + 0.9, y + 3, z + 0.9, 0.08); truss(sx * 31 + 0.9, y, z - 0.9, sx * 31 - 0.9, y + 3, z + 0.9, 0.08); }
  }
  for (const z of [-4, -26]) for (const dy of [-0.9, 0.9]) for (const dz of [-0.9, 0.9]) truss(-31, H + dy, z + dz, 31, H + dy, z + dz);
  for (const x of [-31, 31]) for (const dy of [-0.9, 0.9]) truss(x, H + dy, -4, x, H + dy, -26);
  for (let x = -30; x < 30; x += 3) { truss(x, H - 0.9, -4.9, x + 3, H + 0.9, -4.9, 0.08); truss(x, H - 0.9, -25.1, x + 3, H + 0.9, -25.1, 0.08); }
  // the lamps hanging off the front of the roof (their light is a glow)
  for (let k = 0; k < 14; k++) parts.push(paint(cyl(0.5, 0.7, 1.4, 10, -26 + k * 4, H - 1.8, -4), rgb(0x2a2a30)));
  // the PA: a line array hung each side, curving in at the bottom; subs on the ground in front
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 11; k++) { const g = box(5.2, 1.5, 3.4, 0, 0, 0); g.rotateX(-0.03 * k * k * 0.12); g.translate(sx * 37, H - 4 - k * 1.55, -1.5 + 0.02 * k * k); parts.push(paint(g, black)); parts.push(paint(box(4.8, 1.1, 0.08, sx * 37, H - 4 - k * 1.55, 0.25 + 0.02 * k * k), dark)); }
    truss(sx * 37, H - 2.6, -1.5, sx * 37, H + 0.9, -4, 0.12);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { parts.push(paint(box(3.8, 2.6, 3.4, sx * (19 + c * 4), 1.3 + r * 2.6, 4), black)); parts.push(paint(cyl(1.0, 1.0, 0.1, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(sx * (19 + c * 4), 1.3 + r * 2.6, 5.72), dark)); }
  }
  // the backline: amp stacks either side of the riser
  for (const sx of [-1, 1]) for (const k of [0, 1]) { const x = sx * (13 + k * 4.4); parts.push(paint(box(4, 2.6, 2.2, x, dh + 1.3, -21), black), paint(box(4, 2.6, 2.2, x, dh + 3.9, -21), black)); parts.push(paint(box(3.6, 2.2, 0.1, x, dh + 1.3, -19.88), rgb(0x3a3640)), paint(box(3.6, 2.2, 0.1, x, dh + 3.9, -19.88), rgb(0x3a3640))); parts.push(paint(box(4, 0.4, 0.12, x, dh + 5.0, -19.86), gold)); }
  // three mics at the front, and the wedges
  for (const x of [-12, 0, 12]) { parts.push(paint(cyl(0.9, 0.9, 0.12, 12, x, dh + 0.06, -3.5), steel), paint(cyl(0.07, 0.07, 3.6, 6, x, dh + 1.8, -3.5), steel), paint(sph(0.24, 1, 1.4, 1, x, dh + 3.75, -3.4, 8, 6), rgb(0x2a2a30))); }
  for (const x of [-16, -6, 6, 16]) { const w = box(3, 1.2, 1.8, 0, 0, 0); w.rotateX(-0.5); w.translate(x, dh + 0.6, -1.4); parts.push(paint(w, black)); }
  // the barrier in front, and cables
  for (let x = -30; x <= 30; x += 2.4) parts.push(paint(box(2.2, 1.3, 0.25, x, 0.65, 9), steel));
  return merge(parts.map(withUv));
}
// his drums, on the riser, nobody at them: the kick's head to +z with a red heart on it
// (built round the riser's top, the kit's own origin; the stage places and scales it)
function drumsGeometry() {
  const parts = [], shell = rgb(0xb80a20), chrome = rgb(0xdcdfe6), headW = rgb(0xf4f0f0), brass = rgb(0xe0b040);
  const y0 = 0, z0 = 0;
  const kick = new THREE.CylinderGeometry(1.7, 1.7, 1.5, 32); kick.rotateX(Math.PI / 2); kick.translate(0, y0 + 1.75, z0); parts.push(paint(kick, shell));
  for (const z of [-0.78, 0.78]) parts.push(paint(new THREE.TorusGeometry(1.72, 0.09, 6, 32).translate(0, y0 + 1.75, z0 + z), chrome));
  parts.push(paint(new THREE.CircleGeometry(1.62, 32).translate(0, y0 + 1.75, z0 + 0.77), headW));
  const h = heartGeo(0.95, 0.06, 0.02); h.translate(0, y0 + 1.55, z0 + 0.82); parts.push(paint(h, rgb(0xe8203a)));
  const tom = (x, y, z, r, d) => { const g = new THREE.CylinderGeometry(r, r, d, 24); g.rotateX(0.35); g.translate(x, y, z); parts.push(paint(g, shell)); parts.push(paint(new THREE.CylinderGeometry(r * 0.96, r * 0.96, 0.02, 24).rotateX(0.35).translate(x, y + d / 2 * Math.cos(0.35), z + d / 2 * Math.sin(0.35)), headW)); };
  tom(-0.85, y0 + 3.75, z0 - 0.2, 0.62, 0.55); tom(0.85, y0 + 3.75, z0 - 0.2, 0.68, 0.6);
  tom(2.6, y0 + 1.7, z0 + 0.4, 0.95, 1.1); tom(-2.4, y0 + 2.1, z0 + 0.6, 0.7, 0.42);
  for (const [x, z, hh, r] of [[-3.4, z0 + 0.4, 3.3, 0.85], [3.6, z0 - 0.8, 4.7, 1.1], [-2.8, z0 - 1.2, 4.9, 1.0]]) { parts.push(paint(cyl(0.05, 0.05, hh, 5, x, y0 + hh / 2, z), chrome), paint(cyl(r, r * 0.95, 0.05, 20, x, y0 + hh, z), brass)); }
  parts.push(paint(cyl(0.55, 0.55, 0.12, 12, 0, y0 + 1.35, z0 - 2.4), rgb(0x1a1a1e)), paint(cyl(0.06, 0.06, 1.3, 5, 0, y0 + 0.65, z0 - 2.4), chrome));
  return merge(parts.map(withUv));
}
// the beater, from its pivot up (it hits the back of the kick)
const beaterGeometry = () => merge([paint(cyl(0.05, 0.05, 1.2, 6, 0, 0.6, 0), rgb(0xdcdfe6)), paint(sph(0.16, 1, 1, 1.2, 0, 1.25, 0, 8, 6), rgb(0xf0ece4))].map(withUv));

// the screen behind the band: a heart that beats and a trace that writes every beat down
const SCREEN_VS = `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SCREEN_FS = /* glsl */`
  uniform float uBeat, uBeatPos, uK, uHptFogD; uniform vec3 uCol, uLine, uHptFog;
  varying vec2 vUv; varying vec3 vW;
  float dot2(vec2 v){ return dot(v, v); }
  float sdHeart(vec2 p){ p.x = abs(p.x); if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - 0.35355; return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y); }
  float ecg(float ph){ float d = ph - 0.12; return 0.1 * exp(-dot2(vec2((d + 0.1) / 0.03, 0.0))) - 0.15 * exp(-dot2(vec2((d + 0.025) / 0.01, 0.0))) + exp(-dot2(vec2(d / 0.012, 0.0))) - 0.3 * exp(-dot2(vec2((d - 0.025) / 0.01, 0.0))) + 0.2 * exp(-dot2(vec2((d - 0.2) / 0.05, 0.0))); }
  void main(){
    vec2 px = vUv * vec2(150.0, 82.0); vec2 f = fract(px);
    float led = smoothstep(0.5, 0.3, length(f - 0.5));
    vec2 q = (vUv - vec2(0.5, 0.36)) * vec2(1.82, 1.0) / (0.4 * (1.0 + 0.07 * uBeat));
    float sd = sdHeart(q);
    vec3 c = uCol * ((1.0 - step(0.0, sd)) * (0.35 + 1.1 * uBeat) + exp(-abs(sd) * 22.0) * (0.6 + 1.2 * uBeat));
    // the trace, sweeping left to right a bar at a time, a spike where each beat fell
    float head = fract(uBeatPos / 4.0), age = fract(head - vUv.x);
    float y = 0.14 + 0.09 * ecg(fract(uBeatPos - age * 4.0));
    float line = exp(-abs(vUv.y - y) * 260.0) * (1.0 - smoothstep(0.7, 0.98, age)) * (0.4 + 0.6 * exp(-age * 3.0));
    c += uLine * line * 2.2 + uLine * exp(-dot2((vUv - vec2(head, y)) * vec2(60.0, 120.0))) * 3.0;
    c = c * led * uK + vec3(0.01, 0.006, 0.012);
    float d = length(cameraPosition - vW); float fg = 1.0 - exp(-pow(d * uHptFogD * 0.7, 1.5));
    gl_FragColor = vec4(mix(c, uHptFog, clamp(fg, 0.0, 1.0)), 1.0);
  }`;
// a beam of light out of a moving head on the roof (from its lamp up its length)
const BEAM_VS = `varying float vH; varying vec3 vN; varying vec3 vV; varying vec3 vA; void main(){ vH = position.y / 160.0; vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vA = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0)); gl_Position = projectionMatrix * viewMatrix * w; }`;
const BEAM_FS = `uniform vec3 uColor; uniform float uK; varying float vH; varying vec3 vN; varying vec3 vV; varying vec3 vA;
  void main(){ float e = pow(abs(dot(normalize(vN), normalize(vV))), 2.0); float end = 1.0 - smoothstep(0.55, 0.92, abs(dot(normalize(vA), normalize(vV))));
    float a = pow(max(1.0 - vH, 0.0), 1.5) * smoothstep(0.0, 0.04, vH) * e * uK * end; a = (a == a) ? clamp(a, 0.0, 3.0) : 0.0; gl_FragColor = vec4(uColor * a * 0.6, 1.0); }`;

export class HeartStage {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? 0;
    // the whole night out is driven from here: main.js builds and updates the finale every frame
    this.world = new PartyWorld(scene, { course, plan: scenery ? scenery.plan : {}, P, town: scenery });
    prepare(course, scenery ? scenery.plan : {});
    this.group = new THREE.Group(); scene.add(this.group);
    this.body = new THREE.Group(); this.group.add(this.body);
    // the deck comes up to her road's height where it runs onto it
    this.gy0 = groundAt(course, this.t, this.x);
    const dh = this.dh = Math.max(2.5, course.sample(this.t).y - this.gy0 + 0.1);
    const sm = (key, opts) => fogged(new THREE.MeshStandardMaterial({ vertexColors: true, ...opts.o }), key, null, opts.lit);
    this.stageMat = sm('StageM', { o: { roughness: 0.45, metalness: 0.45 }, lit: 0.32 });
    this.body.add(new THREE.Mesh(stageGeometry(dh), this.stageMat));
    this.drumMat = sm('DrumsM', { o: { roughness: 0.3, metalness: 0.4 }, lit: 0.45 });
    this.drums = new THREE.Mesh(drumsGeometry(), this.drumMat); this.drums.position.set(0, dh + 2.2, -15.5); this.drums.scale.setScalar(cfg.drums ?? 1.7); this.body.add(this.drums);
    this.beater = new THREE.Mesh(beaterGeometry(), this.drumMat); this.beater.position.set(0, 0.1, -1.3); this.drums.add(this.beater);
    // the screen
    this.screenMat = new THREE.ShaderMaterial({ uniforms: { uBeat: { value: 0 }, uBeatPos: { value: 0 }, uK: { value: 0.6 }, uCol: { value: new THREE.Color(P.heart ?? 0xff2a50) }, uLine: { value: new THREE.Color(0x7affc8) }, ...HFOG }, vertexShader: SCREEN_VS, fragmentShader: SCREEN_FS });
    const sg = new THREE.PlaneGeometry(48, 27); sg.translate(0, dh + 16, -26.75);
    this.body.add(new THREE.Mesh(sg, this.screenMat));
    // the heart over it all, its zipper down the front
    this.size = cfg.size ?? 0.95;
    this.y = dh + (cfg.heartY ?? 58);
    this.mat = new THREE.MeshPhysicalMaterial({ color: 0x6a0820, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.1, emissive: new THREE.Color(P.heart ?? 0xff2a50), emissiveIntensity: 0.4 });
    this.heart = new THREE.Mesh(heartGeometry(), this.mat);
    this.pivot = new THREE.Group(); this.pivot.position.set(0, this.y, -14); this.pivot.add(this.heart);
    this.body.add(this.pivot);
    const teethG = new THREE.BoxGeometry(1.1, 0.42, 0.5);
    this.zipMat = new THREE.MeshStandardMaterial({ color: 0xffd9a0, metalness: 0.9, roughness: 0.25, emissive: new THREE.Color(0xffc070), emissiveIntensity: 0.3 });
    const nT = 46, teeth = new THREE.InstancedMesh(teethG, this.zipMat, nT * 2), m = new THREE.Matrix4();
    for (let side = 0; side < 2; side++) for (let i = 0; i < nT; i++) { m.makeTranslation(i % 2 ? 0.42 : -0.42, 6.8 - i * 0.44, side ? -8.15 : 8.15); teeth.setMatrixAt(side * nT + i, m); }
    this.pivot.add(teeth);
    // (one instance of its own: a plain mesh on the teeth's material swapped its shader twice a frame)
    const pull = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 3.2, 0.5), this.zipMat, 1); pull.setMatrixAt(0, new THREE.Matrix4()); pull.position.set(0.2, 5.4, 8.5); pull.rotation.z = 0.25; this.pivot.add(pull);
    this.pivot.scale.setScalar(this.size);
    // moving heads on the roof: beams that sweep the sky over the crowd
    this.beams = [];
    const bg = new THREE.CylinderGeometry(7, 0.5, 160, 16, 1, true); bg.translate(0, 80, 0);
    const beamCols = [0xff4f8a, 0xffd27a, 0xff2a50, 0xffb3c8, 0x8affd8, 0xffe8c0];
    for (let k = 0; k < 10; k++) {
      const mm = new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(beamCols[k % beamCols.length]) }, uK: { value: 0 } }, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide });
      const beam = new THREE.Mesh(bg, mm); beam.frustumCulled = false;
      beam.position.set(-27 + k * 6, dh + 34.2, -4);
      this.body.add(beam);
      this.beams.push({ beam, m: mm, phase: k * 0.9, k });
    }
    this.lit = 0; this.earned = 0; this.fired = false; this.beat = 0;
    this.body.visible = false;
    this._p = new THREE.Vector3(); this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._e = new THREE.Euler();
  }

  fire(earned) { this.fired = true; this.earned = earned; }

  // a point in the stage's own frame, in the world
  _at(x, y, z, out) { out.set(x, y, z); return out.applyMatrix4(this.group.matrixWorld); }

  update(track, rider, songT, dt, fireworks) {
    if (this.world) {
      this.world.frame(track, rider, songT, dt, this.camPos, this.beat, this.S ? this.S.P : this.P);
      if (this.S) this.world.draw(this.S, track, rider);
    }
    const p = track.ground(this.t, this.x, this._p);
    p.y = this.gy0;
    this.group.position.copy(p);
    this.group.rotation.y = this.course.sample(this.t).yaw + Math.PI;
    // the stage is there once the road is laid out that far; the heart in the sky comes down to it
    // over the last chorus's end (heartFrame in main.js fades the sky one by this)
    this.near = smooth(this.t - 17, this.t - 9, rider.t);
    this.body.visible = rider.t > this.t - 34;
    if (!this.body.visible) return;
    this.group.updateMatrixWorld(true);
    this.lit += ((this.fired ? 1 : 0.4) - this.lit) * Math.min(1, dt * 1.2);
    const b = this.beat, c = this.course, bp = c.beatAt(songT), bf = bp - Math.floor(bp);
    this.pivot.scale.setScalar(this.size * (1 + 0.06 * b));
    // it turns to whoever is looking, swaying a little
    const cam = this.camPos;
    const face = cam ? Math.atan2(cam.x - p.x, cam.z - p.z) - this.group.rotation.y : 0;
    this.pivot.rotation.y = face + Math.sin(songT * 0.25) * 0.12;
    this.mat.emissiveIntensity = (0.55 + 1.9 * b) * (0.5 + 0.5 * this.lit) * (0.25 + 0.75 * this.near);
    this.zipMat.emissiveIntensity = 0.2 + 0.9 * b * this.lit;
    // his drums play on their own: the beater into the kick with the heart (after the song, with it)
    const hit = Math.max(b, Math.exp(-bf * 7) * (songT < c.duration ? 0.8 : 0));
    this.beater.rotation.x = -0.4 + 0.85 * Math.max(hit, 0);
    const su = this.screenMat.uniforms; su.uBeat.value = b; su.uBeatPos.value = songT < c.duration ? bp : bp; su.uK.value = 0.35 + 0.65 * this.lit; su.uCol.value.set(this.P.heart ?? 0xff2a50);
    for (const L of this.beams) {
      L.beam.rotation.set(-0.35 + Math.sin(songT * 0.55 + L.phase) * 0.45, 0, Math.cos(songT * 0.41 + L.phase * 1.3) * 0.55 + (L.k - 4.5) * 0.06);
      L.m.uniforms.uK.value = (0.35 + 0.65 * this.lit) * (0.55 + 0.45 * b);
    }
    const S = this.S; if (!S) return;
    const w = this._w, heartC = col(this.P.heart ?? this.P.glow), dh = this.dh;
    // the lamps on the roof, changing colour every bar, brighter on the beat
    const bar = Math.floor(bp / 4), pal = [heartC, col(this.P.edge), [1, 0.85, 0.6], col(this.P.windowAlt), [0.55, 1, 0.85]];
    for (let k = 0; k < 14; k++) { this._at(-26 + k * 4, dh + 32.6, -4, w); glowAt(S, w.x, w.y, w.z, 3.2, pal[(k + bar) % 5], (0.8 + 1.6 * Math.exp(-bf * 4)) * (0.5 + 0.5 * this.lit)); }
    // light on the deck and the riser, a halo round the screen
    this._at(0, dh + 0.3, -12, w); poolAt(S, w.x, w.y, w.z, 46, [1, 0.8, 0.7], 0.7 * this.lit + 0.2);
    this._at(0, dh + 2.4, -16, w); poolAt(S, w.x, w.y, w.z, 14, [1, 0.92, 0.85], 0.9 + 0.8 * hit);
    this._at(0, dh + 16, -25, w); glowAt(S, w.x, w.y, w.z, 70, heartC, (0.08 + 0.25 * b) * this.lit);
    // the heart's glow over the field, and its light on the crowd
    this._at(0, this.y, -14, w); glowAt(S, w.x, w.y, w.z, 70 * (1 + 0.06 * b), heartC, (0.14 + 0.5 * b) * (0.4 + 0.6 * this.lit) * this.near);
    this._at(0, 0.3, 40, w); poolAt(S, w.x, this.gy0 + 0.3, w.z, 110, heartC, (0.12 + 0.45 * b) * this.lit);
    // sparks off the front of the deck on the beat once it's lit
    if (this.fired && bf < 0.35) for (const x of [-24, -16, -8, 8, 16, 24]) for (let j = 0; j < 4; j++) { const u = bf / 0.35; this._at(x + Math.sin(j * 2.1 + bp) * 0.4, dh + 0.5 + u * (5 + j * 1.6), 0.4, w); glowAt(S, w.x, w.y, w.z, 0.9, [1, 0.8, 0.45], 2.2 * (1 - u) * this.lit); }
    // fireworks behind the stage from the moment it lights
    if (this.fired && fireworks && this.earned > 0.05) {
      this.fwNext = (this.fwNext ?? 0) - dt;
      if (this.fwNext <= 0) {
        this.fwNext = 0.35 + Math.random() * 0.4 + (1 - this.earned) * 0.8;
        const from = this._at((Math.random() - 0.5) * 140, 0, -40 - Math.random() * 90, this._v).clone();
        const to = from.clone(); to.y += 55 + Math.random() * 55;
        fireworks.launch(from, to, 0.9 + 0.7 * this.earned);
      }
    }
  }
}

// ---------- confetti in the air around you in the choruses ----------
export class Confetti {
  constructor(scene, colors, n = 1100, opts = {}) {
    this.n = n; this.on = 0;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.c = new Float32Array(n * 3); this.s = new Float32Array(n);
    const cs = colors.map((h) => new THREE.Color(h));
    for (let i = 0; i < n; i++) { const c = cs[i % cs.length]; this.c.set([c.r, c.g, c.b], i * 3); this.s[i] = Math.random(); this.p[i * 3 + 1] = -9999; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.c, 3));
    g.setAttribute('aS', new THREE.BufferAttribute(this.s, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uA: { value: 0 }, uNormal: { value: opts.normal ? 1 : 0 } },
      vertexShader: /* glsl */`attribute float aS; varying vec3 vC; varying float vF; uniform float uT;
        uniform float uNormal;
        void main(){ vC = color; vF = abs(sin(uT * (3.0 + aS * 7.0) + aS * 40.0));
          vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uNormal > 0.5 ? clamp(200.0 / -mv.z, 2.0, 11.0) : clamp(90.0 / -mv.z, 1.0, 9.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`uniform float uA, uNormal; varying vec3 vC; varying float vF;
        void main(){ vec2 d = abs(gl_PointCoord - 0.5); if (d.x > 0.5 || d.y > 0.12 + 0.38 * vF) discard;
          if (uNormal > 0.5) { gl_FragColor = vec4(vC * (0.6 + 0.5 * vF), uA); return; }
          gl_FragColor = vec4(vC * (0.35 + 1.1 * vF * vF) * uA, 1.0); }`,
      vertexColors: true, transparent: true, depthWrite: false, blending: opts.normal ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; scene.add(this.points);
    this.geo = g;
  }
  // burst: a cloud right in front of you (the drop)
  burst(cam, fwd, k = 1) {
    const n = Math.floor(this.n * 0.5 * k);
    for (let j = 0; j < n; j++) {
      const i = Math.floor(Math.random() * this.n);
      const d = 6 + Math.random() * 40;
      this.p[i * 3] = cam.position.x + fwd.x * d + (Math.random() - 0.5) * 40;
      this.p[i * 3 + 1] = cam.position.y + 2 + Math.random() * 22;
      this.p[i * 3 + 2] = cam.position.z + fwd.z * d + (Math.random() - 0.5) * 40;
    }
    this.on = Math.max(this.on, 0.9 * k);
  }
  update(cam, dt, t, on) {
    this.on += (on - this.on) * Math.min(1, dt * (on > this.on ? 3 : 0.8));
    this.mat.uniforms.uT.value = t; this.mat.uniforms.uA.value = this.on;
    this.points.visible = this.on > 0.01;
    if (!this.points.visible) return;
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    for (let i = 0; i < this.n; i++) {
      const y = this.p[i * 3 + 1];
      if (y < cy - 14 || y > cy + 40 || Math.abs(this.p[i * 3] - cx) > 48 || Math.abs(this.p[i * 3 + 2] - cz) > 48) {
        if (on < 0.05) { this.p[i * 3 + 1] = -9999; continue; }
        this.p[i * 3] = cx + (Math.random() - 0.5) * 96; this.p[i * 3 + 1] = cy + 4 + Math.random() * 30; this.p[i * 3 + 2] = cz + (Math.random() - 0.5) * 96;
        this.v[i * 3] = (Math.random() - 0.5) * 1.6; this.v[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
      }
      this.p[i * 3] += (this.v[i * 3] + Math.sin(t * 1.9 + i) * 0.7) * dt;
      this.p[i * 3 + 1] -= (1.3 + this.s[i] * 1.3) * dt;
      this.p[i * 3 + 2] += (this.v[i * 3 + 2] + Math.cos(t * 1.6 + i * 1.3) * 0.7) * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

// ---------- vehicles: the ambulance in the second verse, the 19 in the bridge ----------
function leadAt(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const [t0, a] = keys[i - 1], [t1, b] = keys[i], k = (t - t0) / (t1 - t0); return a + (b - a) * k * k * (3 - 2 * k); }
  return keys[keys.length - 1][1];
}

export class Vehicles {
  // they ride the ribbon itself: anything down on the street is hidden under it
  constructor(scene, course, list) {
    this.course = course;
    this.list = list.map((v) => {
      const obj = v.kind === 'bus' ? buildBus(v.route || '19') : v.kind === 'sedan' ? buildSedan(v.paint) : v.kind === 'police' ? buildPolice() : v.kind === 'hearse' ? buildHearse() : buildAmbulance();
      obj.visible = false; scene.add(obj);
      const lights = obj.userData.lights || [];
      return { ...v, obj, lights };
    });
    this._p = new THREE.Vector3(); this._f = new THREE.Vector3(); this._w = new THREE.Vector3(); this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
  }
  update(track, rider, songT, S) {
    for (const v of this.list) {
      // either a steady rate, or a lead over you that changes: lead: [[songT, seconds ahead], ...]
      const tau = v.lead ? songT + leadAt(v.lead, songT) : v.at + v.rate * (songT - v.at);
      const show = songT > v.from && songT < v.to && tau > rider.t - 3 && tau < rider.t + 30;
      v.obj.visible = show;
      v.near = show ? Math.max(0, 1 - Math.abs(tau - rider.t) / 3) : 0;
      if (!show) continue;
      const w = this.course.sample(tau).width;
      const x = Math.sign(v.x) * Math.max(1.6, w - Math.abs(v.lane ?? 2.2));
      let p;
      if (v.ground) {
        // parked down on the street, not on the ribbon
        p = track.ground(tau, v.x, this._p); if (S && S.floorFn) p.y = S.floorFn(tau, v.x);
        const yaw = this.course.sample(tau).yaw;
        this._e.set(0, yaw + (v.yaw || 0), 0);
      } else {
        p = track.at(tau, x, 0.02, this._p);
        const f = track.dirAt(tau, this._f);
        // a car coming the other way: turned round, so its pitch and lean turn round too
        const rv = v.reverse ? -1 : 1;
        this._e.set(-Math.asin(clamp(f.y, -1, 1)) * rv, Math.atan2(f.x, f.z) + (v.yaw || 0) + (v.reverse ? Math.PI : 0), -track.bankAt(tau) * rv);
      }
      v.obj.position.copy(p); v.obj.rotation.copy(this._e);
      v.obj.updateMatrixWorld(true);
      if (!S) continue;
      // a parked car that starts: its lights come on at lightsOn
      const on = v.lightsOn === undefined ? 1 : clamp((songT - v.lightsOn) / 0.12, 0, 1);
      if (on <= 0) continue;
      for (const [ox, oy, oz, size, c, k0, mode] of v.lights) {
        if (v.hazard && mode !== 5) continue;
        const k = k0 * on * (v.lightsOn !== undefined && mode === 0 && oz > 0 ? 1.8 : 1);
        for (const sx of v.hazard ? [1, -1] : [1]) {
          this._w.set(ox * sx, oy, oz).applyMatrix4(v.obj.matrixWorld);
          glowAt(S, this._w.x, this._w.y, this._w.z, size, c, k, mode);
        }
      }
    }
  }
}

// ---------- rib arches over the last chorus ----------
function ribMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(0xffd0e0) }, uGlow: { value: new THREE.Color(0xff2a55) }, uBeat: { value: 0 }, uFog: { value: new THREE.Color(0x200818) }, uFogDensity: { value: 0.0018 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */`
      attribute vec3 aWake; varying float vW; varying vec3 vWp; varying vec3 vN; varying float vU;
      void main(){ vW = aWake.x; vU = uv.x; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vWp = w.xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCol, uGlow, uFog, uCam; uniform float uBeat, uFogDensity; varying float vW; varying vec3 vWp; varying vec3 vN; varying float vU;
      void main(){
        vec3 V = normalize(uCam - vWp);
        float face = abs(dot(normalize(vN), V));
        float k = 0.1 + 0.9 * vW;
        // bone white at the core, the heart's red at the edges, brighter on the kick
        vec3 c = mix(uGlow * 1.4, uCol * 1.6, pow(face, 1.5)) * k * (0.55 + 1.0 * uBeat * vW);
        // the tips where they meet the street fade into the dark
        c *= smoothstep(0.0, 0.08, vU) * smoothstep(1.0, 0.92, vU);
        float d = length(uCam - vWp); float fog = 1.0 - exp(-pow(d * uFogDensity, 1.6));
        gl_FragColor = vec4(mix(c, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}
function ribGeometry() {
  // a half ellipse across the street, flat like a rib
  const g = new THREE.TorusGeometry(1, 0.03, 6, 56, Math.PI);
  return g;
}

// ---------- kits and parts ----------
extend({
  layers: {
    ribArch: (M) => [ribGeometry(), (M.rib = ribMaterial()), 90, { aWake: 3 }],
  },
  kits: {
    // garlands of coloured bulbs strung between the lamp posts on both sides
    partystreet(S, z, R) {
      for (const side of [-1, 1]) {
        let prev = null;
        for (let t = z.from; t < z.to; t += 0.3) {
          const it = { t, x: side * 15.5, rot: 0, parts: 'garland', seed: R(), wake0: 0.35 };
          if (prev) prev.next = it;
          S.items.push(it); prev = it;
        }
      }
    },
    // ribs: an arch over the street every other beat
    ribs(S, z, R) {
      const c = S.course;
      for (let b = 0; b < c.beats.length; b++) {
        const t = c.beats[b];
        if (t < z.from || t > z.to || ((b - c.barPhase) % 2 + 2) % 2) continue;
        S.items.push({ t, x: 0, rot: 0, parts: 'rib', seed: R(), wake0: 0.15 });
      }
    },
    // a low city, so the heart shows over the roofs: blocks on the street, towers far back
    lowrise(S, z, R) {
      const greys = [0x9a8aa8, 0xb3a0b8, 0x8f8aa6, 0xa890a4, 0xc0aabc];
      const signs = ['BAR', 'OPEN', 'KISS', 'DANCING', 'LIVETONIGHT', 'ENCORE', 'HOTEL', 'DINER'];
      for (const side of [-1, 1]) {
        for (let t = z.from; t < z.to; t += 0.3 + R() * 0.25) {
          S.items.push({ t, x: side * (24 + R() * 5), rot: (side > 0 ? Math.PI / 2 : -Math.PI / 2) + (R() - 0.5) * 0.05, s: 0.85 + R() * 0.35, sy: 0.35 + R() * 0.55, parts: 'block', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.35 });
          // near the end of the street the back rows open up into the square around the stage
          if (z.clear && t > z.to - z.clear) continue;
          if (R() < 0.45) S.items.push({ t: t + R() * 0.2, x: side * (60 + R() * 60), rot: R() * 0.4, s: 0.8 + R() * 0.5, sy: 0.4 + R() * 0.7, parts: 'block', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.3 });
          if (R() < (z.tall ?? 0.25) * 0.5) S.items.push({ t: t + R() * 0.3, x: side * (110 + R() * 140), rot: R() * 0.4, s: 0.9 + R() * 0.4, sy: 0.6 + R() * 1.6, parts: 'tower', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.3 });
          if (z.signs !== false && R() < 0.2) S.items.push({ t, x: side * 18.5, s: 1, parts: 'sign', idx: S.atlas.index[pick(R, signs)], seed: R(), wake0: 0.4 });
        }
      }
      for (let t = z.from; t < z.to; t += 0.3) for (const side of [-1, 1]) S.items.push({ t, x: side * 15.5, rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, parts: 'lamp', seed: R(), dim: z.dark ? 0.3 : 1 });
    },
    // the hospital, its emergency sign facing the street
    hospital(S, z, R) {
      const side = Math.sign(z.x || -1);
      S.items.push({ t: z.from, x: z.x, rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, s: 1.5, sy: 1.25, parts: 'block', tint: col(0xd8dde4), seed: R(), wake0: 0.85, keepLit: false });
      S.items.push({ t: z.from - 0.35, x: z.x - side * 12, s: 1.35, parts: 'sign', idx: S.atlas.index.ER, seed: R(), wake0: 1, keepLit: true });
    },
  },
  parts: {
    garland(S, it, p, q, yaw) {
      if (!it.next || !S.track || it.t > (S.tNow ?? 0) + 20) return;
      const n = S._n || (S._n = new THREE.Vector3());
      S.track.ground(it.next.t, it.next.x, n);
      const lit = 0.6 + 1.3 * it.wakeNow;
      const P = S.P;
      const cs = [col(P.glow), col(P.edge), col(P.fret), col(P.windowAlt)];
      for (let k = 0; k < 8; k++) {
        const f = (k + 0.5) / 8, sag = Math.sin(f * Math.PI) * 1.3;
        glowAt(S, p.x + (n.x - p.x) * f, 7.0 - sag, p.z + (n.z - p.z) * f, 0.9, cs[(k + Math.floor(it.seed * 4)) % 4], lit, S.beatLamps ? 4 : 0);
      }
    },
    rib(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(22, 40, 22));
      S.layers.ribArch.add(m, { aWake: [it.wakeNow, it.seed, 0] });
    },
  },
});

// per-frame uniforms for the party's own materials
export function partyFrame(S, camera, beat) {
  const ribMat = S.town.mats.rib;
  if (ribMat) {
    ribMat.uniforms.uBeat.value = beat;
    ribMat.uniforms.uCam.value.copy(camera.position);
    ribMat.uniforms.uFog.value.set(S.P.fog); ribMat.uniforms.uFogDensity.value = S.P.fogDensity;
    ribMat.uniforms.uGlow.value.set(S.P.heart ?? S.P.glow); ribMat.uniforms.uCol.value.set(S.P.fret);
  }
}
