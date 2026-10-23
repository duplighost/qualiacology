// Set-pieces: the place a song ends. Built when the song loads, lit when the
// last chorus arrives, as brightly as the ride earned.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
let _coupe = null;
function loadCoupe() {
  if (!_coupe) _coupe = new GLTFLoader().loadAsync('assets/props/coupe.glb').catch(() => null);
  return _coupe;
}

// KISS ME LIKE A CAR CRASH: two cars kissing nose to nose in the middle of the highway
export class Wreck {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.P = P; this.cfg = cfg; this.scenery = scenery;
    this.t = cfg.t; this.x = cfg.x ?? -14;
    this.group = new THREE.Group();
    scene.add(this.group);
    // lights stay in the scene for good: adding or hiding a light makes three recompile every material
    this.body = new THREE.Group();
    this.group.add(this.body);
    this.lit = 0; this.earned = 0; this.fired = false;
    this.paints = [0xff2f86, 0xa9dcff];
    // hazard light: one real light so the cars and road catch the blink
    this.light = new THREE.PointLight(0xffa040, 0, 40, 1.6);
    this.light.position.set(0, 3, 0);
    this.group.add(this.light);
    this.head = new THREE.PointLight(0xfff1dd, 0, 30, 1.5);
    this.head.position.set(0, 1.2, 0);
    this.group.add(this.head);
    this.cars = [];
    this.ready = loadCoupe().then((g) => this._build(g));
    // a pillar of light where the song ends, visible from anywhere high
    const bg = new THREE.CylinderGeometry(3.5, 9, 420, 24, 1, true);
    bg.translate(0, 210, 0);
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(P.jacket) }, uK: { value: 0.4 }, uTime: { value: 0 } },
      vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vD; void main(){ vP = position; vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vD = length(cameraPosition.xz - (modelMatrix * vec4(0.0,0.0,0.0,1.0)).xz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uK, uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vD;
        void main(){ float h = vP.y / 420.0; float edge = pow(abs(dot(vN, vV)), 1.5); float a = (1.0 - h) * (1.0 - h) * edge * uK;
          a *= 0.8 + 0.2 * sin(vP.y * 0.05 - uTime * 3.0); a *= smoothstep(60.0, 220.0, vD); gl_FragColor = vec4(uColor * a * 0.9, 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
    });
    this.beam = new THREE.Mesh(bg, this.beamMat);
    this.beam.frustumCulled = false;
    this.group.add(this.beam);
    // police in a loose ring, light bars going
    this.police = [[-11, 6, 0.9], [12, -7, -2.2], [-6, -13, 0.3], [9, 12, 2.6]];
    this.glows = [];   // world-local glows we draw through the scenery glow layer each frame
  }

  _build(g) {
    const mk = (color, flip) => {
      let obj;
      if (g) {
        obj = g.scene.clone(true);
        obj.traverse((o) => {
          if (!o.isMesh) return;
          const n = (o.material && o.material.name) || '';
          if (n === 'Glass') {
            // no transmission pass: dark tinted glass that catches the lights
            o.material = new THREE.MeshStandardMaterial({ color: 0x0c0c14, roughness: 0.06, metalness: 0.9, transparent: true, opacity: 0.78 });
          } else {
            o.material = o.material.clone();
          }
          const m = o.material;
          if (n === 'Paint 1 Carmine') { m.color = new THREE.Color(color); m.metalness = 0.55; m.roughness = 0.3; }
          if (['Trim', 'Rim1', 'Rim2', 'Brake', 'Mirror', 'Hardware'].includes(n)) { m.emissiveMap = null; m.emissive = new THREE.Color(0); }
          if (n === 'Headlight') { m.emissive = new THREE.Color(0xfff2d8); m.emissiveIntensity = 0; o.userData.head = true; }
          if (n === 'Brakelight') { m.emissive = new THREE.Color(0xff1020); m.emissiveIntensity = 0; o.userData.tail = true; }
          if (n === 'Signallight') { m.emissive = new THREE.Color(0xffa020); m.emissiveIntensity = 0; o.userData.hazard = true; }
          o.frustumCulled = false;
        });
        // fit: nose along +z, ~4.6 m long, on the ground
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const long = Math.max(size.x, size.z);
        const s = 4.6 / long;
        obj.scale.setScalar(s);
        if (size.x > size.z) obj.rotation.y = Math.PI / 2;
        const box2 = new THREE.Box3().setFromObject(obj);
        obj.position.y -= box2.min.y;
        const c = box2.getCenter(new THREE.Vector3());
        obj.position.x -= c.x; obj.position.z -= c.z;
      } else {
        obj = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, 4.6), new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.3 }));
        obj.position.y = 0.6;
      }
      const holder = new THREE.Group();
      const tilt = new THREE.Group();   // crumple: noses pushed up into each other
      tilt.add(obj);
      holder.add(tilt);
      holder.rotation.y = flip ? Math.PI : 0;
      holder.position.z = flip ? 2.08 : -2.08;
      tilt.rotation.x = -0.12;
      tilt.position.y = 0.15;
      holder.rotation.z = flip ? -0.04 : 0.05;
      this.body.add(holder);
      this.cars.push(obj);
    };
    mk(this.paints[0], false);
    mk(this.paints[1], true);
    // two police coupes at angles, doors-open feel
    this.cops = [];
    for (const [px, pz, r] of [[-9.5, 4.5, 2.3], [10.5, -5.5, -0.9]]) {
      const before = this.cars.length;
      mk(0x111116, false);
      const holder = this.body.children[this.body.children.length - 1];
      holder.position.set(px, 0, pz); holder.rotation.set(0, r, 0);
      holder.children[0].rotation.x = 0; holder.children[0].position.y = 0;
      const car = this.cars[before];
      car.traverse((o) => { if (o.isMesh && o.material.name === 'Paint 2 Carmine') o.material.color.set(0xf2f2f6); });
      this.cops.push(holder);
    }
    this.group.rotation.y = 0.35;
  }

  // the last chorus: everything comes on, as brightly as the ride earned
  fire(earned, fireworks, track) {
    this.fired = true; this.earned = earned;
    this.fwLeft = Math.round(4 + 22 * earned);
    this.fwNext = 0;
  }

  update(track, rider, songT, dt, fireworks) {
    const p = track.ground(this.t, this.x, this._p || (this._p = new THREE.Vector3()));
    const yaw = this.course.sample(this.t).yaw;
    this.group.position.copy(p);
    this.group.rotation.y = yaw + 0.35;
    const near = this.t - rider.t < 40;
    this.body.visible = near;
    // before the finale: hazards only; after: headlights, flares, fireworks
    const blink = Math.sin(songT * Math.PI * 2 * 1.1) > 0 ? 1 : 0;
    this.lit += ((this.fired ? 1 : 0.15) - this.lit) * Math.min(1, dt * 2);
    this.light.intensity = near ? (40 + 220 * this.lit) * blink : 0;
    this.head.intensity = near ? 160 * this.lit * (0.4 + 0.6 * this.earned) : 0;
    this.beamMat.uniforms.uK.value = 0.35 + 0.9 * this.lit * (0.5 + 0.5 * this.earned);
    this.beamMat.uniforms.uTime.value = songT;
    for (const c of this.cars) c.traverse((o) => {
      if (o.userData.head) o.material.emissiveIntensity = 4 * this.lit;
      if (o.userData.tail) o.material.emissiveIntensity = 1 + 3 * blink;
      if (o.userData.hazard) o.material.emissiveIntensity = 6 * blink;
    });
    // glows: hazards at the four corners of each car, flares in an arc on the road
    const S = this.scenery;
    if (S && near) {
      const cy = Math.cos(yaw + 0.35), sy = Math.sin(yaw + 0.35);
      const at = (lx, ly, lz) => [p.x + lx * cy + lz * sy, p.y + ly, p.z - lx * sy + lz * cy];
      for (const z of [-4.6, -0.4, 0.4, 4.6]) for (const x of [-0.85, 0.85]) {
        const w = at(x, 0.75, z); S.glow(w[0], w[1], w[2], 1.4, [1, 0.55, 0.12], 2.2 * blink);
      }
      if (this.lit > 0.2) for (const z of [-0.55, 0.55]) for (const x of [-0.6, 0.6]) { const w = at(x, 0.7, z); S.glow(w[0], w[1], w[2], 3.2 * this.lit, [1, 0.95, 0.85], 2.5 * this.lit); }
      for (let k = 0; k < 14; k++) {
        const a = (k / 13 - 0.5) * 2.6, r = 9 + (k % 2) * 1.5;
        const w = at(Math.sin(a) * r, 0.25, Math.cos(a) * r * 0.8 - 2);
        const fl = 0.7 + 0.3 * Math.sin(songT * 23 + k * 7.1);
        S.glow(w[0], w[1], w[2], 1.6, [1, 0.12, 0.08], (0.8 + 1.6 * this.lit) * fl);
        S.pool(w[0], p.y + 0.06, w[2], 5, [1, 0.15, 0.1], 0.5 + 0.6 * this.lit);
      }
      S.pool(p.x, p.y + 0.07, p.z, 26, [1, 0.6, 0.25], (0.25 + 0.6 * this.lit) * (0.6 + 0.4 * blink));
      // police light bars on the two black-and-whites
      for (const [lx, lz, r] of [[-9.5, 4.5, 2.3], [10.5, -5.5, -0.9]]) {
        const w = at(lx, 0, lz);
        const a = at(lx - Math.cos(r) * 0.45, 1.35, lz + Math.sin(r) * 0.45), b = at(lx + Math.cos(r) * 0.45, 1.35, lz - Math.sin(r) * 0.45);
        S.glow(a[0], a[1], a[2], 2.6, [1, 0.05, 0.08], 2.6, 2); S.glow(b[0], b[1], b[2], 2.6, [0.1, 0.25, 1], 2.6, 3);
        S.pool(w[0], p.y + 0.08, w[2], 12, [0.7, 0.1, 0.5], 0.5);
      }
    }
    // fireworks over the wreck, one every so often while they last
    if (this.fired && this.fwLeft > 0 && fireworks) {
      this.fwNext -= dt;
      if (this.fwNext <= 0) {
        this.fwLeft--; this.fwNext = 0.18 + Math.random() * 0.25;
        const side = Math.random() < 0.5 ? -1 : 1;
        const from = track.ground(this.t + 2 + Math.random() * 4, side * (30 + Math.random() * 40), new THREE.Vector3());
        const to = from.clone(); to.y = 55 + Math.random() * 45; to.x += (Math.random() - 0.5) * 30; to.z += (Math.random() - 0.5) * 30;
        fireworks.launch(from, to, 0.8 + 0.6 * this.earned);
      }
    }
  }
}
