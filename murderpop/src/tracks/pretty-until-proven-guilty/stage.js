// The court's bigger set pieces (design §4-§6): THE FRONT PAGE (unrolls, her silhouette swells on it, she bursts
// through, it topples, YOU rips through it), the CELLS (four walls of bars and the booking camera), the FROST of the
// mirror room, the MIRROR DOUBLES, the back DOORS onto the night square, the gate, the searchlights and the floor's
// light washes. All driven by song time, all put back by setStateAt(t).
import * as THREE from 'three';
import { mats, M } from './pieces.js';

const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ease = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = false; o.receiveShadow = true; return o; };

// ------------------------------------------------------------------------------------------ THE FRONT PAGE
export const PAGE = { z: -1.5, w: 22, h: 4.5, t0: 82.484, t1: 82.883, burst: 84.052, fall0: 84.442, fall1: 85.6, gone: 94.89 };
export class FrontPage {
  constructor(f) {
    this.f = f;
    const c = document.createElement('canvas'); c.width = 2048; c.height = 420; const g = c.getContext('2d');
    g.fillStyle = '#ece6d6'; g.fillRect(0, 0, 2048, 420);
    g.fillStyle = '#1a1416'; g.font = '700 30px Georgia, serif'; g.textAlign = 'center';
    g.fillText('THE COURT OF PUBLIC OPINION', 1024, 40); g.fillRect(80, 52, 1888, 3); g.fillRect(80, 60, 1888, 1);
    g.font = '900 150px "Archivo Black", "Arial Black", sans-serif'; g.fillText('CRIME OF THE CENTURY', 1024, 210);
    g.font = 'italic 700 64px Georgia, serif'; g.fillStyle = '#c8102e'; g.fillText('OWNING MY NAME', 1024, 290);
    g.fillStyle = '#1a1416'; g.font = '20px Georgia, serif'; g.textAlign = 'left';
    for (let col = 0; col < 6; col++) for (let ln = 0; ln < 8; ln++) { if (col === 2 || col === 3) continue; g.fillRect(90 + col * 315, 320 + ln * 11, 260 - ((ln * 37 + col * 11) % 60), 4); }
    // her photo: a pink halftone duotone of a woman with two buns
    const px = 760, py = 305, pw = 520, ph = 110;
    for (let y = 0; y < ph; y += 7) for (let x = 0; x < pw; x += 7) {
      const u = (x - pw / 2) / 60, v = (y - 20) / 60;
      const head = Math.hypot(u, v - 0.2) < 0.5 || Math.hypot(u - 0.55, v + 0.3) < 0.25 || Math.hypot(u + 0.55, v + 0.3) < 0.25 || (v > 0.75 && Math.abs(u) < 1.4 - (v - 0.75) * -0.4);
      const k = head ? 0.85 : 0.15 + 0.1 * Math.sin(x * 0.05);
      g.fillStyle = '#ff4f94'; g.beginPath(); g.arc(px + x, py + y, 3.4 * k, 0, 6.3); g.fill();
    }
    this.tex = new THREE.CanvasTexture(c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    // the tear mask: white = paper, black = a hole
    this.maskC = document.createElement('canvas'); this.maskC.width = 1024; this.maskC.height = 210; this.mask = this.maskC.getContext('2d');
    this.maskT = new THREE.CanvasTexture(this.maskC);
    // one pass for both faces (three draws a transparent double-sided material back-then-front otherwise, and its back
    // pass reports the back as front-facing): the shader tells the faces apart
    this.mat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, transparent: true, forceSinglePass: true,
      uniforms: { uTex: { value: this.tex }, uMask: { value: this.maskT }, uUnroll: { value: 0 }, uSil: { value: new THREE.Vector4(0, 0, 0, 0) }, uBack: { value: 1 }, uLight: { value: 1 } },
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D uTex, uMask; uniform float uUnroll, uBack, uLight; uniform vec4 uSil; varying vec2 vU;
        void main(){ if (vU.y < 1.0 - uUnroll) discard; if (texture2D(uMask, vU).r < 0.5) discard;
          vec3 c = texture2D(uTex, vU).rgb;
          // it falls face down toward YOU: from above that's its back, plain newsprint with the ink barely bleeding through
          if (!gl_FrontFacing) c = mix(texture2D(uTex, vec2(0.5, 0.992)).rgb, c, 0.12);
          // her silhouette, backlit on the paper (uSil: x centre (uv), scale, strength)
          vec2 q = vec2((vU.x - uSil.x) * 22.0, vU.y * 4.5) / max(0.01, uSil.y);
          float body = smoothstep(0.42, 0.36, length(vec2(q.x * 1.6, (q.y - 2.2) * 0.75))) + smoothstep(0.23, 0.2, length(q - vec2(0.0, 3.1))) + smoothstep(0.13, 0.1, length(q - vec2(0.2, 3.35))) + smoothstep(0.13, 0.1, length(q - vec2(-0.2, 3.35)));
          body += smoothstep(0.5, 0.42, abs(q.x) * 2.6) * step(q.y, 1.4) * step(0.0, q.y) * 0.9;
          float sil = clamp(body, 0.0, 1.0) * uSil.z;
          vec3 glow = vec3(1.0, 0.86, 0.66) * uBack;
          gl_FragColor = vec4(mix(c * (0.55 * uLight + 0.6 * glow), vec3(0.06, 0.03, 0.04), sil * 0.92), 1.0); }` });
    const geo = new THREE.PlaneGeometry(PAGE.w, PAGE.h, 1, 1); geo.translate(0, PAGE.h / 2, 0);
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.position.set(0, 0, PAGE.z); this.mesh.renderOrder = 1;
    f.scene.add(this.mesh);
    this.backlight = new THREE.PointLight(0xffe0b0, 0, 18, 1.4); this.backlight.position.set(0, 4, -6); f.scene.add(this.backlight);
    this.reset();
  }
  reset() { this.mask.fillStyle = '#fff'; this.mask.fillRect(0, 0, 1024, 210); this.maskT.needsUpdate = true; this.holes = []; }
  // a hole the size of a person at world x (standing) or, once fallen, at world (x, z)
  tear(x, zOrY, w = 1.0, h = 1.9, fallen = false) {
    const u = (x + PAGE.w / 2) / PAGE.w, v = fallen ? (zOrY - PAGE.z) / PAGE.h : zOrY / PAGE.h;
    const px = u * 1024, py = (1 - v) * 210, rw = w / PAGE.w * 1024 / 2, rh = h / PAGE.h * 210 / 2;
    this.mask.fillStyle = '#000'; this.mask.beginPath();
    for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, j = 0.8 + 0.35 * Math.sin(i * 7.3 + x); this.mask.lineTo(px + Math.cos(a) * rw * j, (fallen ? py : py - rh) + Math.sin(a) * rh * j); }
    this.mask.fill(); this.maskT.needsUpdate = true;
  }
  update(t, boss) {
    const vis = t >= PAGE.t0 && t < PAGE.gone;
    this.mesh.visible = vis;
    this.backlight.intensity = t >= PAGE.t0 && t < PAGE.burst + 0.2 ? 60 : 0;
    if (!vis) return;
    this.mat.uniforms.uUnroll.value = ease((t - PAGE.t0) / (PAGE.t1 - PAGE.t0));
    // her silhouette swells as she winds up behind it
    const wind = clamp01((t - 82.883) / (PAGE.burst - 82.883));
    this.mat.uniforms.uSil.value.set(boss ? (boss.x + PAGE.w / 2) / PAGE.w : 0.5, 1.0 + wind * 0.55, t < PAGE.burst && boss && boss.z < PAGE.z ? 0.8 : 0, 0);
    this.mat.uniforms.uBack.value = t < PAGE.burst + 0.1 ? 1.0 : 0.15;
    // toppling toward the front, about its bottom edge
    const fk = t < PAGE.fall0 ? 0 : Math.pow(clamp01((t - PAGE.fall0) / (PAGE.fall1 - PAGE.fall0)), 1.8);
    // fallen, it lies in the night light: dim enough that the white shapes drawn over it (the skirt, the knives) still read
    this.mat.uniforms.uLight.value = 1 - 0.6 * fk;
    this.mesh.rotation.x = fk * (Math.PI / 2 - 0.01);
    this.mesh.position.y = fk >= 1 ? 0.02 : 0;
  }
  dispose() { this.f.scene.remove(this.mesh, this.backlight); }
}

// ------------------------------------------------------------------------------------------ THE CELLS
// four walls of blackened steel bars with gold caps drop from the fly loft (x = +-6.6 on 95.48, x = +-2.2 on 95.87) and
// fly up on 99.531; the booking camera (a 1940s press camera with a dish flash) rolls to (0, 8.6); a height chart
// flies in behind Lady Justice.
export const CELLS = { outer: 95.48, inner: 95.87, up: 99.531, from: 94.502, xs: [-6.6, -2.2, 2.2, 6.6] };
export class Cells {
  constructor(f) {
    this.f = f; mats();
    const n = 56, walls = CELLS.xs.length;
    const bar = new THREE.CylinderGeometry(0.035, 0.035, 4.2, 6); bar.translate(0, 2.1, 0);
    const cap = new THREE.SphereGeometry(0.06, 8, 6);
    this.bars = new THREE.InstancedMesh(bar, M.black, n * walls); this.caps = new THREE.InstancedMesh(cap, M.gold, n * walls);
    const rail = new THREE.BoxGeometry(0.08, 0.08, 14.2);
    this.rails = new THREE.InstancedMesh(rail, M.black, walls * 2);
    for (const m of [this.bars, this.caps, this.rails]) { m.castShadow = false; m.frustumCulled = false; f.scene.add(m); }
    this.n = n;
    // the booking camera
    const cam = this.camera = new THREE.Group();
    cam.add(box(0.5, 0.42, 0.42, M.black, 0, 1.55, 0)); const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.32, 16), M.chrome); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.55, -0.34); cam.add(lens);
    const dish = this.dish = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.15, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0, side: THREE.DoubleSide }));
    dish.rotation.x = Math.PI / 2; dish.position.set(0.32, 1.9, -0.2); cam.add(dish);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; const l = box(0.04, 1.45, 0.04, M.brass, Math.sin(a) * 0.3, 0.7, Math.cos(a) * 0.3); l.rotation.set(Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2); cam.add(l); }
    cam.position.set(0, 0, 14); f.scene.add(cam);
    this.flashT = -9;
    // the height chart behind Lady Justice
    const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#d9d4cc'; g.fillRect(0, 0, 256, 512); g.fillStyle = '#222'; g.font = '700 22px Arial';
    for (let i = 0; i <= 16; i++) { const y = 512 - i * 30; g.fillRect(0, y, i % 2 ? 140 : 256, 3); if (i % 2 === 0) g.fillText(`${4 + i / 2}'`, 180, y - 6); }
    const ct = new THREE.CanvasTexture(c); ct.colorSpace = THREE.SRGBColorSpace;
    this.chart = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.8 })); this.chart.position.set(0, 13, -10.9); f.scene.add(this.chart);
    this.light = new THREE.PointLight(0xffb062, 0, 16, 1.2); this.light.position.set(0, 7, 0); f.scene.add(this.light);
  }
  // walls that are down at t (for colliders)
  downAt(t) { return CELLS.xs.filter((x) => t >= (Math.abs(x) > 4 ? CELLS.outer : CELLS.inner) && t < CELLS.up + 0.25); }
  resolve(x, z, r, t) {
    for (const wx of this.downAt(t)) { if (Math.abs(x - wx) < r + 0.05 && z > -7.2 && z < 7.2) x = wx + Math.sign(x - wx || 1) * (r + 0.05); }
    return { x, z };
  }
  flash(t) { this.flashT = t; }
  update(t) {
    const m = new THREE.Matrix4(); let i = 0;
    CELLS.xs.forEach((wx, w) => {
      const slam = Math.abs(wx) > 4 ? CELLS.outer : CELLS.inner;
      const down = t < slam - 0.25 ? 0 : t < slam ? Math.pow((t - (slam - 0.25)) / 0.25, 2) : t < CELLS.up ? 1 : 1 - ease((t - CELLS.up) / 0.6);
      const y = (1 - down) * 7.5;
      for (let k = 0; k < this.n; k++) { const z = -7 + (k + 0.5) * 14 / this.n; m.makeTranslation(wx, y, z); this.bars.setMatrixAt(i, m); m.makeTranslation(wx, y + 4.25, z); this.caps.setMatrixAt(i, m); i++; }
      m.makeTranslation(wx, y + 0.15, 0); this.rails.setMatrixAt(w * 2, m); m.makeTranslation(wx, y + 4.0, 0); this.rails.setMatrixAt(w * 2 + 1, m);
    });
    const vis = t > CELLS.from && t < CELLS.up + 0.7;
    for (const mm of [this.bars, this.caps, this.rails]) { mm.visible = vis; mm.instanceMatrix.needsUpdate = true; }
    // the booking camera rolls into the aisle (94.890) and back out after the last flash
    const ck = t < 94.89 ? 0 : t < 103.2 ? ease((t - 94.89) / 1.2) : 1 - ease((t - 103.2) / 1.0);
    this.camera.visible = ck > 0.01; this.camera.position.z = 14 - (14 - 8.6) * ck;
    const fl = Math.exp(-Math.max(0, t - this.flashT) * 9) * (t >= this.flashT ? 1 : 0);
    this.dish.material.emissiveIntensity = fl * 40;
    this.chart.position.y = t < 94.89 ? 13 : t < 99.531 ? 13 - 8.5 * ease((t - 94.89) / 1.2) : 4.5 + 8.5 * ease((t - 99.531) / 1.0);
    this.chart.visible = t > 94.8 && t < 101;
    this.light.intensity = t > 94.89 && t < 99.6 ? 30 : 0;
  }
  dispose() { for (const m of [this.bars, this.caps, this.rails, this.camera, this.chart, this.light]) this.f.scene.remove(m); }
}

// ------------------------------------------------------------------------------------------ FROST
// "Let the cold bite deep": frost creeps in from the walls toward (0, -1.5); each bite pulls the warm floor in
// (safe r < 6, then 4.5, then 3); frozen floor glitters and re-bites; it all shatters on the lift (113.473).
export const FROST = { c: { x: 0, z: -1.5 }, creep: 107.92, bites: [[108.811, 6], [110.36, 4.5], [111.917, 3]], shatter: 113.473 };
export class Frost {
  constructor(f) {
    this.f = f;
    this.mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uR: { value: 30 }, uT: { value: 0 }, uA: { value: 0 }, uFlash: { value: 0 } },
      vertexShader: 'varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uR, uT, uA, uFlash; varying vec2 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
        void main(){ vec2 d = vW - vec2(0.0, -1.5); float r = length(d);
          float edge = r - uR; if (edge < -0.2) discard;
          float frozen = smoothstep(-0.2, 0.25, edge);
          vec2 g = floor(vW * 9.0); float sp = step(0.985, h(g + floor(uT * 6.0)));
          float veins = smoothstep(0.92, 1.0, abs(sin(vW.x * 3.1 + sin(vW.y * 2.3)) * sin(vW.y * 2.7 + vW.x * 0.7)));
          float rim = exp(-abs(edge) * 6.0) * 0.8;
          float a = (frozen * (0.18 + 0.22 * veins + 0.9 * sp) + rim + uFlash * frozen * 0.5) * uA;
          gl_FragColor = vec4(vec3(0.56, 0.81, 1.0) * a * 1.4, a); }` });
    const m = this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), this.mat); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.045, -1.5); m.renderOrder = 3;
    f.scene.add(m);
    this.flashT = -9;
  }
  // the warm radius at t
  radius(t) {
    const lerp = (x, y, k) => x + (y - x) * ease(k);
    if (t < FROST.creep || t >= FROST.shatter) return 30;
    if (t < 108.811) return lerp(13, 6, (t - FROST.creep) / (108.811 - FROST.creep));
    if (t < 109.216) return 6;
    if (t < 110.36) return lerp(6, 4.5, (t - 109.216) / (110.36 - 109.216));
    if (t < 110.747) return 4.5;
    if (t < 111.917) return lerp(4.5, 3, (t - 110.747) / (111.917 - 110.747));
    return 3;
  }
  flash(t) { this.flashT = t; }
  update(t) {
    const on = t >= FROST.creep && t < FROST.shatter + 0.3;
    this.mesh.visible = on;
    if (!on) return;
    this.mat.uniforms.uR.value = this.radius(t);
    this.mat.uniforms.uT.value = t;
    this.mat.uniforms.uA.value = t < FROST.shatter ? 1 : 1 - (t - FROST.shatter) / 0.3;
    this.mat.uniforms.uFlash.value = Math.exp(-Math.max(0, t - this.flashT) * 8);
  }
  dispose() { this.f.scene.remove(this.mesh); }
}

// ------------------------------------------------------------------------------------------ MIRROR DOUBLES
// four glass copies of her step out of the side mirrors (113.473) and take places around YOU on the diagonals. They
// copy her pose (her bones, every frame) in a mirror glaze; one strike, one gold return or a ring shatters one.
export class Doubles {
  constructor(f, kit, gltf) {
    this.f = f; this.list = [];
    const glass = this.mat = new THREE.MeshPhysicalMaterial({ color: 0xdfe8ff, metalness: 0.9, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.82, emissive: new THREE.Color(0x6a7aff), emissiveIntensity: 0.12 });
    for (let i = 0; i < 4; i++) {
      const model = kit.instance(gltf);
      model.traverse((m) => { if (m.isMesh) { m.material = glass; m.castShadow = false; } });
      model.scale.setScalar(1.25);
      const root = new THREE.Group(); root.add(model); root.visible = false; f.scene.add(root);
      const bones = {}; model.traverse((b) => { if (b.isBone) bones[b.name] = b; });
      this.list.push({ root, bones, alive: false, x: 0, z: 0, from: { x: 0, z: 0 }, i });
    }
  }
  // her bones -> theirs
  copy(boss) {
    const src = boss.rig.bones;
    for (const d of this.list) { if (!d.root.visible) continue; for (const [n, b] of Object.entries(d.bones)) { const s = src[n]; if (s) b.quaternion.copy(s.quaternion); } const hp = src.pelvis; if (hp && d.bones.pelvis) d.bones.pelvis.position.copy(hp.position); }
  }
  aliveList() { return this.list.filter((d) => d.alive); }
  shatter(d) {
    if (!d.alive) return;
    const f = this.f; d.alive = false; d.root.visible = false;
    f.fx.chips(d.x, 1.2, d.z, new THREE.Color(2.4, 2.6, 3.0), 30); f.fx.glitter(d.x, 1.3, d.z, new THREE.Color(2.6, 2.6, 3.2), 26, 1.0);
    f.ppg.snd.play('glass', { pan: f.pan(d.x), gain: 0.7 }); f.cam.shake(0.3, 0.1); f._good && f._good(100);
    d.brokeAt = f.t;
  }
  update(t, boss) {
    for (const d of this.list) {
      if (!d.alive) { d.root.visible = false; continue; }
      d.root.visible = true;
      const k = ease((t - 113.473) / 0.386);
      const x = d.from.x + (d.x - d.from.x) * k, z = d.from.z + (d.z - d.from.z) * k;
      d.root.position.set(x, 0, z);
      d.root.rotation.y = Math.atan2(this.f.player.x - x, this.f.player.z - z) + (t > 115.0 && t < 115.8 ? (t - 115.0) * 9 : 0);
    }
    if (boss) this.copy(boss);
  }
  dispose() { for (const d of this.list) this.f.scene.remove(d.root); }
}

// ------------------------------------------------------------------------------------------ the DOORS, the gate
// two tall arched doors in the back wall (x = +-6.6) swing open on 160.297 over a bar onto a night square: press risers
// full of flashbulbs, sodium lamps, broadcast vans and a skyline. The bar's gate swings shut behind YOU at the start.
export class Doors {
  constructor(f) {
    this.f = f; mats();
    this.group = new THREE.Group(); this.group.name = 'ppg:doors'; f.scene.add(this.group);
    this.leaves = [];
    const wood = new THREE.MeshPhysicalMaterial({ color: 0x3a0a14, roughness: 0.25, clearcoat: 1 });
    for (const x of [-6.6, 6.6]) for (const s of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(x + s * 1.35, 0, -11.0);
      const leaf = new THREE.Group(); hinge.add(leaf);
      leaf.add(box(1.35, 5.75, 0.1, wood, -s * 0.675, 2.875, 0));
      leaf.add(box(1.1, 0.06, 0.12, M.gold, -s * 0.675, 1.2, 0)); leaf.add(box(1.1, 0.06, 0.12, M.gold, -s * 0.675, 4.4, 0));
      leaf.add(box(0.06, 0.4, 0.14, M.gold, -s * 1.2, 2.6, 0.05));
      hinge.userData.s = s; this.group.add(hinge); this.leaves.push(hinge);
    }
    // the night square behind
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, '#0a1030'); sky.addColorStop(0.6, '#263870'); sky.addColorStop(1, '#3a2a40'); g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 40; i++) { const w = 20 + (i * 37) % 60, h = 80 + (i * 53) % 220, x = (i * 97) % 1024; g.fillStyle = '#0a0c18'; g.fillRect(x, 380 - h, w, h + 132); g.fillStyle = '#ffd890'; for (let k = 0; k < 6; k++) if ((i + k) % 3 === 0) g.fillRect(x + 4 + (k % 3) * 6, 390 - h + Math.floor(k / 3) * 14 + 10, 3, 5); }
    g.fillStyle = '#121018'; g.fillRect(0, 400, 1024, 112);
    for (let i = 0; i < 8; i++) { g.fillStyle = '#ffb062'; g.beginPath(); g.arc(60 + i * 130, 330, 6, 0, 6.3); g.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    this.back = new THREE.Mesh(new THREE.PlaneGeometry(36, 18), new THREE.MeshBasicMaterial({ map: tex })); this.back.position.set(0, 7, -20); this.group.add(this.back);
    // flashbulbs on the risers (sprites)
    const fc = document.createElement('canvas'); fc.width = fc.height = 64; const fg = fc.getContext('2d'); const gr = fg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, 'rgba(255,240,216,0.7)'); gr.addColorStop(1, 'rgba(255,240,216,0)'); fg.fillStyle = gr; fg.fillRect(0, 0, 64, 64);
    const ft = new THREE.CanvasTexture(fc);
    this.bulbs = [];
    for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ft, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.set(-9 + (i * 0.73) % 18, 1.0 + (i % 4) * 0.7, -15 - (i % 3)); s.scale.setScalar(1.2); s.visible = false; this.group.add(s); this.bulbs.push(s); }
    this.rim = new THREE.DirectionalLight(0xffb062, 0); this.rim.position.set(0, 6, -20); this.group.add(this.rim, this.rim.target);
    // the gate at the bar
    this.gate = [];
    for (const s of [-1, 1]) { const h = new THREE.Group(); h.position.set(s * 0.9, 0, 7.15); const leaf = box(0.88, 0.8, 0.06, M.lacquer, -s * 0.44, 0.5, 0); h.add(leaf); h.add(box(0.9, 0.05, 0.08, M.gold, -s * 0.44, 0.92, 0)); h.userData.s = s; this.group.add(h); this.gate.push(h); }
  }
  update(t) {
    const k = t < 160.297 ? 0 : ease((t - 160.297) / 1.55);
    for (const h of this.leaves) h.rotation.y = h.userData.s * k * 1.7;
    this.back.visible = k > 0.001; this.rim.intensity = k * 3.5;
    const beat = this.f.beat || 0.387;
    for (let i = 0; i < this.bulbs.length; i++) { const b = this.bulbs[i]; const ph = (t * 1.0 / beat + i * 0.37) % 1; b.visible = k > 0.3 && ph < 0.12 && (i * 7 + Math.floor(t / beat)) % 3 === 0; }
    // the gate swings behind YOU and latches with a click at 0.9 s (two damped swings)
    for (const h of this.gate) { const u = Math.max(0, t); const a = u < 0.9 ? 1.2 * Math.exp(-u * 4) * Math.cos(u * 14) : 0; h.rotation.y = h.userData.s * a; }
  }
  dispose() { this.f.scene.remove(this.group); }
}

// ------------------------------------------------------------------------------------------ light on the floor
// the follow-spots (gold on YOU, rose on her), three searchlights sweeping from the gallery, the chant's pink/white
// flips, colour washes (the cells' sodium lanes, the mirror room's cold blue): additive light the baked set can't take.
export class FloorLight {
  constructor(f) {
    this.f = f;
    const mk = (color) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uC: { value: new THREE.Color(color) }, uA: { value: 0 }, uSoft: { value: 0.5 } },
      vertexShader: 'varying vec2 vU; void main(){ vU = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uC; uniform float uA, uSoft; varying vec2 vU; void main(){ float d = length(vU); float a = smoothstep(1.0, 1.0 - uSoft, d) * uA; gl_FragColor = vec4(uC * a, a); }' });
    const disc = (r, color) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), mk(color)); m.rotation.x = -Math.PI / 2; m.position.y = 0.05; m.renderOrder = 2; f.scene.add(m); return m; };
    this.youSpot = disc(1.7, 0xffe0a8); this.herSpot = disc(2.0, 0xff6e96);
    this.youSpot.material.uniforms.uSoft.value = 0.95; this.herSpot.material.uniforms.uSoft.value = 0.95;
    this.search = [disc(2.6, 0xfff4e0), disc(2.6, 0xff3a5a), disc(2.6, 0xffd27a)];
    for (const d of this.search) d.material.uniforms.uSoft.value = 0.98;
    // the beams (cones from the gallery, additive)
    const coneGeo = new THREE.ConeGeometry(1.0, 1, 24, 1, true); coneGeo.translate(0, -0.5, 0); coneGeo.rotateX(-Math.PI / 2);
    this.beams = [];
    // the follow-spots: real light on the two of them (gold on YOU, rose on her), from the gallery
    this.youLight = new THREE.SpotLight(0xffe0a8, 0, 45, 0.12, 0.6, 2.0); this.herLight = new THREE.SpotLight(0xff6e96, 0, 45, 0.12, 0.6, 2.0);
    for (const L of [this.youLight, this.herLight]) { f.scene.add(L, L.target); }
    // a full-floor wash (pink / white / sodium / cold)
    this.wash = new THREE.Mesh(new THREE.PlaneGeometry(26, 18), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.wash.rotation.x = -Math.PI / 2; this.wash.position.set(0, 0.04, 0); this.wash.renderOrder = 2; f.scene.add(this.wash);
    this.chantT = -9; this.chantColor = new THREE.Color();
  }
  chant(t, pretty) { this.chantT = t; this.chantColor.set(pretty ? 0xff5fa0 : 0xf4f0ff); }
  update(t, player, boss) {
    const on = (a, b) => t >= a && t < b;
    // the follow-spots are the SHOW's (8.174-46.897) and the STEPS' (YOU keeps hers); elsewhere a dim fill keeps you both readable
    const showing = on(8.174, 46.897), steps = t >= 160.297;
    this.youSpot.position.set(player.x, 0.05, player.z); this.youSpot.material.uniforms.uA.value = showing || steps ? 0.12 : 0.04;
    this.herSpot.position.set(boss.x, 0.05, boss.z); this.herSpot.material.uniforms.uA.value = showing ? 0.1 : on(46.897, 49.985) || on(135.138, 138.229) || on(150.633, 160.297) ? 0.16 : 0.04;
    if (on(46.897, 49.985) || on(150.633, 160.297)) this.herSpot.material.uniforms.uC.value.set(0xdce6ff); else this.herSpot.material.uniforms.uC.value.set(0xff6e96);
    // three searchlights sweep during the lift and chorus 1, and in NIGHT COURT
    const sweep = on(22.118, 28.301) || on(34.502, 46.897) || on(84.052, 94.89) || on(99.531, 105.719) || on(138.229, 150.633);
    this.search.forEach((d, i) => {
      const x = Math.sin(t * (0.45 + i * 0.13) + i * 2.1) * 8, z = Math.sin(t * (0.31 + i * 0.07) + i) * 4.5 - 0.5;
      d.position.set(x, 0.05, z); d.material.uniforms.uA.value = sweep ? 0.07 : 0;

    });
    // the follow-spots follow (dim in the blackouts, cold top light on her in the verdicts)
    const L1 = this.youLight, L2 = this.herLight;
    L1.position.set(player.x * 0.5, 16, player.z + 15); L1.target.position.set(player.x, 0.9, player.z);
    L2.position.set(boss.x * 0.5, 16, boss.z + 15); L2.target.position.set(boss.x, 1.1, boss.z);
    const cold = on(46.897, 49.985) || on(135.138, 138.229) || on(150.633, 160.297) || on(94.89, 99.531);
    L2.color.set(on(135.138, 138.229) ? 0xff7aa0 : cold ? 0xdce6ff : 0xff8aa8);   // the breath's top light is rose
    if (cold) { L2.position.set(boss.x, 14, boss.z + 0.5); }
    L1.intensity = (showing || steps ? 900 : 220) * (t < 8.174 ? 0.4 : 1);
    L2.intensity = showing ? 700 : cold ? 1100 : 220;
    // washes
    let c = new THREE.Color(0, 0, 0);
    const ch = Math.exp(-Math.max(0, t - this.chantT) * 5) * (t >= this.chantT ? 1 : 0);
    if (on(127.4, 135.14)) c.copy(this.chantColor).multiplyScalar(0.06 * ch + 0.012);
    if (on(94.89, 99.531)) c.set(0xffb062).multiplyScalar(0.035);
    if (on(107.92, 113.473)) c.set(0x8ecfff).multiplyScalar(0.03 * clamp01((t - 107.92) / 3));
    if (on(113.473, 121.215)) c.set(0xffc4d2).multiplyScalar(0.04);
    this.wash.material.color.copy(c); this.wash.visible = c.r + c.g + c.b > 0.001;
  }
  dispose() { for (const m of [this.youSpot, this.herSpot, ...this.search, this.wash, this.youLight, this.youLight.target, this.herLight, this.herLight.target]) this.f.scene.remove(m); }
}

// ------------------------------------------------------------------------------------------ handprints and footprints
export class Prints {
  constructor(f) {
    this.f = f;
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(64, 78, 30, 34, 0, 0, 6.3); g.fill();
    for (const [x, y, r, a] of [[30, 30, 9, -0.4], [48, 18, 9, -0.15], [68, 14, 9, 0], [88, 20, 8, 0.2], [104, 56, 8, 0.9]]) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, r, r * 2.4, 0, 0, 6.3); g.fill(); g.restore(); }
    this.tex = new THREE.CanvasTexture(c);
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, color: 0xb80d22, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.list = [];
  }
  stamp(x, z, r = 1.3, a = Math.random() * 6.3) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), this.mat); m.rotation.set(-Math.PI / 2, 0, a); m.position.set(x, 0.035, z); m.renderOrder = 1;
    this.f.scene.add(m); this.list.push(m);
  }
  clear() { for (const m of this.list) this.f.scene.remove(m); this.list = []; }
  dispose() { this.clear(); }
}
