// The start and the finish: a lit gantry over the ribbon where the music starts and another
// where it ends. On the start line its lamps count you in on the song's own beat, two searchlights
// sweep the sky, and the music comes in as you pass under it, pyro going off both sides. The
// finish is the same family with a chequered panel; it goes off as you cross. In the song's colours.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function titleTexture(text, color) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#05040a'; g.fillRect(0, 0, 1024, 128);
  const t = text.toUpperCase().split('').join(String.fromCharCode(8202));
  let size = 60; g.font = `800 ${size}px "Helvetica Neue", Arial, sans-serif`;
  while (g.measureText(t).width > 960 && size > 22) { size -= 2; g.font = `800 ${size}px "Helvetica Neue", Arial, sans-serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 22; g.fillStyle = color; g.fillText(t, 512, 66);
  g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.globalAlpha = 0.9; g.fillText(t, 512, 66);
  g.globalAlpha = 1; g.fillStyle = color; g.fillRect(0, 0, 1024, 5); g.fillRect(0, 123, 1024, 5);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
function checkerTexture(color) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64;
  const g = cv.getContext('2d');
  for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#0c0b10' : '#f4f2f8'; g.fillRect(i * 32, j * 32, 32, 32); }
  g.fillStyle = color; g.fillRect(0, 0, 512, 3); g.fillRect(0, 61, 512, 3);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// a truss: two chords and a zigzag of braces between them, as one geometry
function trussGeometry(len, depth, r) {
  const parts = [];
  for (const y of [0, depth]) { const c = new THREE.CylinderGeometry(r, r, len, 8); c.rotateZ(Math.PI / 2); c.translate(0, y, 0); parts.push(c); }
  const n = Math.max(2, Math.round(len / 1.3));
  for (let i = 0; i < n; i++) {
    const x0 = -len / 2 + (i / n) * len, x1 = -len / 2 + ((i + 1) / n) * len;
    const a = new THREE.Vector3(x0, i % 2 ? depth : 0, 0), b = new THREE.Vector3(x1, i % 2 ? 0 : depth, 0);
    const d = b.clone().sub(a), L = d.length();
    const br = new THREE.CylinderGeometry(r * 0.6, r * 0.6, L, 6);
    br.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    br.translate((a.x + b.x) / 2, (a.y + b.y) / 2, 0); parts.push(br);
  }
  return mergeGeometries(parts.map((g) => g.index ? g.toNonIndexed() : g), false);
}

const BEAM_VS = `varying float vL; varying vec3 vN; varying vec3 vV; void main(){ vL = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }`;
const BEAM_FS = `uniform vec3 uCol; uniform float uK; varying float vL; varying vec3 vN; varying vec3 vV; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 1.6) * (1.0 - vL) * (1.0 - vL) * uK; gl_FragColor = vec4(uCol * a, 1.0); }`;

class Arch {
  constructor(scene, opts) {
    const span = opts.span, h = opts.h, y0 = opts.y0;
    this.span = span; this.h = h; this.y0 = y0;
    this.root = new THREE.Group(); scene.add(this.root);
    const top = new THREE.Group(); top.position.y = y0; this.root.add(top); this.top = top;
    const frame = new THREE.MeshStandardMaterial({ color: 0x1b1924, roughness: 0.4, metalness: 0.6 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x5a5866, roughness: 0.35, metalness: 0.7 });
    this.edge = new THREE.Color(opts.color);
    this.stripMat = new THREE.MeshBasicMaterial({ color: this.edge.clone().multiplyScalar(3) });
    this.bandMat = new THREE.MeshBasicMaterial({ color: this.edge.clone().multiplyScalar(2) });
    // the towers: from the street to above the beam, a light strip down the inside, lit bands at the top
    for (const sd of [-1, 1]) {
      const H = Math.max(2, y0 + h + 1.8);
      const legG = new THREE.BoxGeometry(0.85, 1, 0.85); legG.translate(0, 0.5, 0);
      const leg = new THREE.Mesh(legG, frame); leg.position.set(sd * span, 0, 0); leg.scale.y = H; this.root.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 1.7), frame); foot.position.set(sd * span, 0.3, 0); this.root.add(foot);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.9, 4), frame); cap.rotation.y = Math.PI / 4; cap.position.set(sd * span, h + 2.25, 0); top.add(cap);
      for (let k = 0; k < 3; k++) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), this.bandMat); band.position.set(sd * span, h + 1.05 + k * 0.32, 0); top.add(band); }
      for (const z of [-0.18, 0.18]) {
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.14, h + 0.4), this.stripMat);
        strip.position.set(sd * (span - 0.43), (h + 0.4) / 2 - 0.4, z); strip.rotation.y = -sd * Math.PI / 2; top.add(strip);
      }
    }
    // the truss across, and the panel hung in its middle facing the way you come (-z)
    const len = span * 2;
    const truss = new THREE.Mesh(trussGeometry(len, 0.95, 0.07), steel); truss.position.set(0, h, -0.32); top.add(truss);
    const truss2 = truss.clone(); truss2.position.z = 0.32; top.add(truss2);
    const pw = Math.min(len - 4.2, 7.8);
    const panelMat = new THREE.MeshBasicMaterial({ map: opts.face, color: new THREE.Color(1, 1, 1).multiplyScalar(opts.faceK ?? 1.7) });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(pw, pw / 8), panelMat); panel.position.set(0, h + 0.47, -0.4); panel.rotation.y = Math.PI; top.add(panel);
    const back = panel.clone(); back.position.z = 0.4; back.rotation.y = 0; top.add(back);
    const box = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.3, pw / 8 + 0.25, 0.7), frame); box.position.set(0, h + 0.47, 0); top.add(box);
    const under = new THREE.Mesh(new THREE.PlaneGeometry(len - 1, 0.14), this.stripMat); under.position.set(0, h - 0.08, 0); under.rotation.x = Math.PI / 2; top.add(under);
    // the lamps: two each side of the panel, big, facing the rider coming
    this.lamps = [];
    const lx = [-(pw / 2 + 1.75), -(pw / 2 + 0.75), pw / 2 + 0.75, pw / 2 + 1.75];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.MeshBasicMaterial({ color: 0x220808 });
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), m);
      d.position.set(lx[i], h + 0.47, -0.42); d.rotation.y = Math.PI; top.add(d);
      const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 20, 1, true), frame); hood.rotation.x = Math.PI / 2; hood.position.set(lx[i], h + 0.47, -0.55); top.add(hood);
      const b = d.clone(); b.position.z = 0.42; b.rotation.y = 0; top.add(b);
      this.lamps.push(m);
    }
    // searchlights from the tower tops, sweeping
    this.beamMat = new THREE.ShaderMaterial({ uniforms: { uCol: { value: this.edge.clone().lerp(new THREE.Color(1, 1, 1), 0.5) }, uK: { value: 0.5 } }, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const bg = new THREE.CylinderGeometry(3.2, 0.25, 46, 16, 1, true); bg.translate(0, 23, 0);
    // the cylinder's own uv.y is 0 at its bottom, the lamp: bright there, gone by the far end


    this.beams = [-1, 1].map((sd) => { const m = new THREE.Mesh(bg, this.beamMat); m.position.set(sd * span, h + 2.3, 0); m.frustumCulled = false; top.add(m); return m; });
  }
  place(track, course, t, p) {
    track.ground(t, 0, p);
    // legs from y 0 up to the top at the ribbon's height: where the ground rises they come up out of it
    this.root.position.set(p.x, 0, p.z);
    this.root.rotation.set(0, course.sample(t).yaw, 0);
  }
  sweep(time, k) {
    this.beams.forEach((b, i) => { const sd = i ? 1 : -1; b.rotation.set(-0.35 + 0.25 * Math.sin(time * 0.9 + i), 0, sd * (0.32 + 0.22 * Math.sin(time * 0.7 + i * 2.1))); });
    this.beamMat.uniforms.uK.value = k;
  }
  tops(out) {
    this.root.updateMatrixWorld(true);
    for (const sd of [-1, 1]) out.push(new THREE.Vector3(sd * this.span, this.y0 + this.h + 2.3, 0).applyMatrix4(this.root.matrixWorld));
    return out;
  }
}

export class Gates {
  constructor(scene, course, P, entry) {
    this.course = course;
    const opt = entry.gates || {};
    this.on = entry.gates !== false;
    if (!this.on) return;
    const accent = opt.color || entry.accent || '#ff4f9a';
    this.tStart = 0; this.tEnd = course.duration;
    const ws = course.sample(this.tStart), we = course.sample(this.tEnd);
    const h = opt.h ?? 5.4;
    this.start = new Arch(scene, { span: opt.span ?? ws.width + 2.4, h, y0: ws.y, color: accent, face: titleTexture(entry.title, accent) });
    this.finish = new Arch(scene, { span: opt.span ?? we.width + 2.4, h, y0: we.y, color: accent, face: checkerTexture(accent), faceK: 1.25 });
    this.count = 0;         // how many count-in lamps are lit (4 = go)
    this.goK = 0; this.endK = 0;
    this._p = new THREE.Vector3();
    this.red = new THREE.Color(1, 0.12, 0.1).multiplyScalar(3.4);
    this.gold = new THREE.Color(1, 0.8, 0.4).multiplyScalar(3.6);
    this.dim = new THREE.Color(0.16, 0.03, 0.04);
  }

  update(track, rider, dt, beatPulse, time) {
    if (!this.on) return;
    const t = rider.t;
    this.start.root.visible = t > this.tStart - 30 && t < this.tStart + 3;
    this.finish.root.visible = t > this.tEnd - 30 && t < this.tEnd + 16;
    if (this.start.root.visible) { this.start.place(track, this.course, this.tStart, this._p); this.start.sweep(time, 0.35 + 0.5 * this.goK + 0.15 * this.count / 4); }
    if (this.finish.root.visible) { this.finish.place(track, this.course, this.tEnd, this._p); this.finish.sweep(time * 1.3, 0.3 + 0.7 * this.endK + 0.2 * clamp(1 - (this.tEnd - t) / 10, 0, 1)); }
    this.goK *= Math.exp(-dt * 2.0); this.endK *= Math.exp(-dt * 0.9);
    const a = this.start;
    a.lamps.forEach((m, i) => {
      if (this.count >= 4) m.color.setRGB(1, 1, 1).multiplyScalar(1.5 + 4 * this.goK);
      else if (i < this.count) m.color.copy(this.red);
      else m.color.copy(this.dim);
    });
    a.stripMat.color.copy(a.edge).multiplyScalar(2.2 + 1.5 * beatPulse + 6 * this.goK);
    a.bandMat.color.copy(a.edge).multiplyScalar(1.6 + 2 * beatPulse + 5 * this.goK);
    // the finish: the lamps chase on the beat as you come, gold and burning when you cross
    const f = this.finish, near = clamp(1 - (this.tEnd - t) / 12, 0, 1);
    const bi = Math.floor(this.course.beatAt(t));
    f.lamps.forEach((m, i) => {
      if (t > this.tEnd) m.color.copy(this.gold).multiplyScalar(0.6 + this.endK);
      else if (bi % 4 === i) m.color.copy(this.gold).multiplyScalar(0.4 + 0.6 * near);
      else m.color.copy(this.dim);
    });
    f.stripMat.color.copy(f.edge).multiplyScalar(2.2 + 1.5 * beatPulse * near + 5 * this.endK);
    f.bandMat.color.copy(f.edge).multiplyScalar(1.6 + 2 * beatPulse * near + 5 * this.endK);
  }
  setCount(n) { if (this.on) this.count = n; }
  go() { if (this.on) { this.count = 4; this.goK = 1; } }
  cross() { if (this.on) this.endK = 1; }
  tops(which) { if (!this.on) return []; return (which === 'finish' ? this.finish : this.start).tops([]); }
}
