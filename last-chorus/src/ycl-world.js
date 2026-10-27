// YOUR CAR IS AT THE BOTTOM OF THE LAKE. A lake in the pines at night, and his car. It's parked at her
// cabin while he packs; on "you peeled out the driveway" its lights come on and it goes, away down the
// gravel of the shore road ahead of you; when the band stops it's in neutral, rolling out along the
// pier with its headlights on; on "by the way" it tips off the end, and you jump the shore after it as
// the band comes back. It floats nose down, lights still on under the black water, and goes. His
// suitcase and his mixtape float past. Across the lake the police are at her door, his face on every
// pole; the depth posts count down to fifty feet; on the second "by the way" you go in after it, and
// ride along the bottom past the car with its windows down, its lights on, weed and bubbles and the moon
// coming down through the water. You come up for "you're mine forever now", and end at her cabin, the
// porch light on, the spare key on its hook.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { UNDER, surfaceY, landY, bedY, shoreDist, smooth } from './ycl-lake.js';
import { YC, selfLit } from './ycl-props.js';

const HEAD = [1, 0.95, 0.82], TAIL = [1, 0.08, 0.06], LAKE = [0.3, 0.95, 0.85], PORCH = [1, 0.78, 0.48];
const RING = { aK: 0 }, BUBBLE = [0.7, 0.95, 1], GLINT = [1, 0.9, 0.6], LAMPS = [-0.62, 0.62], BEAMS = [-1.6, 1.6], WINDOWS = [-8.5, 8.5];

// ---------- his car: the coupe the game already has, painted cream ----------
let _car = null;
function loadCar() {
  if (_car) return _car;
  _car = new GLTFLoader().loadAsync('assets/props/coupe.glb').then((g) => {
    const obj = g.scene;
    const heads = [], tails = [];
    obj.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.material && o.material.name) || '';
      if (n === 'Glass') o.material = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.08, metalness: 0.9, transparent: true, opacity: 0.8 });
      else o.material = o.material.clone();
      const m = o.material;
      if (n === 'Paint 1 Carmine') { m.color = new THREE.Color(0xe4d8bc); m.metalness = 0.45; m.roughness = 0.32; m.emissive = new THREE.Color(0x2a261c); m.emissiveMap = null; }
      if (['Trim', 'Rim1', 'Rim2', 'Brake', 'Mirror', 'Hardware'].includes(n)) { m.emissiveMap = null; m.emissive = new THREE.Color(0); }
      if (n === 'Headlight') { m.emissive = new THREE.Color(0xfff2d8); m.emissiveIntensity = 0; heads.push(m); }
      if (n === 'Brakelight') { m.emissive = new THREE.Color(0xff1020); m.emissiveIntensity = 0; tails.push(m); }
      if (n === 'Signallight') { m.emissive = new THREE.Color(0xffa020); m.emissiveIntensity = 0; }
      o.frustumCulled = false;
    });
    // nose along +z, 4.6 m long, wheels on the ground
    const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
    obj.scale.setScalar(4.6 / Math.max(size.x, size.z));
    if (size.x > size.z) obj.rotation.y = Math.PI / 2;
    const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(new THREE.Vector3());
    obj.position.set(-c.x, -b2.min.y, -c.z);
    return { obj, heads, tails };
  }).catch(() => null);
  return _car;
}
let worldReady = null;

// Where his car is at song time t: the song time of the place it's at (tc), how far across (x), its
// turn off the road's heading, its nose down (pitch), its height, and its lights.
const CAR = { tc: 0, x: 0, turn: 0, pitch: 0, roll: 0, y: 0, head: 0, tail: 0, under: 0, show: true, sunk: 0 };
const PIER_END = 43.5, PARK = 29.0;
function hermite(p0, m0, p1, m1, u) { const u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1; }
function carAt(t) {
  const C = CAR; C.roll = 0; C.under = 0; C.show = true; C.sunk = 0; C.pitch = 0; C.y = 0;
  if (t < 25.78) {
    // parked in her drive, nose to the road, dark
    C.tc = PARK; C.x = -44; C.turn = -Math.PI / 2; C.head = 0; C.tail = 0;
  } else if (t < 27.3) {
    // "you pulled out the driveway": lights on, out onto the shore road and away
    const u = smooth(25.78, 27.3, t);
    C.tc = PARK + 0.8 * u * u; C.x = -44 + 20 * Math.sin(u * Math.PI / 2); C.turn = -Math.PI / 2 * (1 - u); C.head = smooth(25.7, 25.95, t); C.tail = C.head;
  } else if (t < 38.0) {
    // down the shore road ahead of you, gravel under it
    C.tc = PARK + 0.8 + (t - 27.3); C.x = -24; C.turn = 0.02 * Math.sin(t * 2.3); C.head = 1; C.tail = 1;
  } else if (t < 40.7) {
    // the band stops: in neutral, rolling out along the pier, headlights on
    const u = (t - 38.0) / 2.7;
    C.tc = hermite(PARK + 0.8 + 10.7, 2.7, PIER_END, 1.1 * 2.7, u); C.x = -24; C.turn = 0; C.head = 1; C.tail = 1 - smooth(38.0, 38.3, t);
    C.y = smooth(38.5, 39.3, C.tc) * 1.2;
  } else if (t < 40.95) {
    // over the end
    const u = (t - 40.7) / 0.25;
    C.tc = PIER_END + 0.15 * u; C.x = -24; C.turn = 0.05 * u; C.head = 1; C.tail = 0; C.pitch = -0.7 * u * u; C.y = 1.2 - 2.0 * u * u;
  } else if (t < 45.0) {
    // nose down in the water, lights still on, going under
    const u = smooth(40.95, 44.6, t);
    C.tc = PIER_END + 0.15; C.x = -24.5; C.turn = 0.05 + 0.08 * u; C.head = 1; C.tail = 0; C.pitch = -0.7 - 0.35 * u; C.roll = 0.06 * Math.sin(t * 1.3);
    C.y = -0.8 - 1.0 * u - 2.4 * u * u + 0.15 * Math.sin(t * 2.1) * (1 - u); C.sunk = u;
  } else if (t > UNDER[0] - 0.6 && t < UNDER[1] + 0.2) {
    // on the bottom, windows down, lights on
    C.tc = 85.0; C.x = -21; C.turn = -0.95; C.head = 1; C.tail = 0; C.pitch = 0.06; C.roll = 0.1; C.y = bedY(85.0, -21) - 0.35; C.under = 1;
  } else { C.show = false; C.head = 0; C.tail = 0; C.tc = PIER_END; C.x = -24; C.turn = 0; }
  return C;
}

// ---------- the shore: rows at fixed song times along the road, the land's height under each ----------
const COLS = [-240, -190, -150, -118, -92, -72, -56, -44, -35, -30, -27, -24, -21, -18, -14, -9, -4, 0, 5, 10, 15, 20, 26, 32, 40, 50, 62, 78, 98, 124, 158, 200, 240];
// the gravel of the shore road, the car's road: [from, to, x, half width]
const ROADS = [[-6, 38.6, -24, 3.6]];
class Shore {
  constructor(scene) {
    const N = this.N = 120, M = this.M = COLS.length;
    this.DT = 48 / (N - 1);
    const g = new THREE.BufferGeometry(), idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b = a + 1, c = a + M, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    this.pos = new Float32Array(N * M * 3); this.info = new Float32Array(N * M * 4);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aInfo', new THREE.BufferAttribute(this.info, 4).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    // what never changes about a row (by its song time): each column's height on land and under the
    // water, how far it is from the shore, whether it's road
    this.cache = new Map();
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uLand: { value: new THREE.Color() }, uLight: { value: new THREE.Color(1, 1, 1) }, uSky: { value: new THREE.Color() }, uMoon: { value: new THREE.Color() } },
      vertexShader: `attribute vec4 aInfo; varying vec4 vI; varying vec3 vW; void main(){ vI = aInfo; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform vec3 uFog, uCam, uLand, uLight, uSky, uMoon; uniform float uFogDensity, uTime; varying vec4 vI; varying vec3 vW;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
        void main(){
          vec2 q = vec2(vI.x, vI.y);           // across, along (metres, stuck to the place)
          float d = vI.z;                      // inland from the water's edge
          vec3 col;
          if (vI.w > 0.5) {
            // the lake's bottom: silt in long ripples, the light from above wavering over it
            float rip = n2(q * vec2(0.08, 0.3)) * 0.5 + n2(q * 0.5) * 0.25;
            col = vec3(0.1, 0.17, 0.14) * (0.6 + rip);
            vec2 c = q * 0.11 + vec2(uTime * 0.35, uTime * 0.2);
            float ca = abs(sin(c.x + sin(c.y * 1.3 + uTime * 0.5) * 1.6) * sin(c.y * 0.9 - sin(c.x * 1.1 - uTime * 0.4) * 1.4));
            col += vec3(0.2, 0.55, 0.5) * pow(clamp(1.0 - ca, 0.0, 1.0), 6.0) * 0.8;
          } else {
            // pine needles and dirt; a band of mud and stones along the water, wet at the edge
            float n = n2(q * 0.22) * 0.6 + n2(q * 1.3) * 0.4;
            col = uLand * (0.55 + 0.6 * n) * uLight;
            vec3 mud = vec3(0.26, 0.23, 0.2) * (0.7 + 0.5 * n2(q * 2.1)) * uLight;
            col = mix(mud, col, smoothstep(1.0, 9.0, d));
            col = mix(col, mud * 0.45 + uSky * 0.05, smoothstep(2.5, 0.0, d));
            // the gravel road: pale stones, two ruts
            float road = vI.w < -0.5 ? 1.0 : 0.0;
            if (road > 0.5) { float g = n2(q * 3.0) * 0.5 + h2(floor(q * 6.0)) * 0.5; col = mix(col, vec3(0.32, 0.3, 0.27) * (0.65 + 0.5 * g) * uLight, 0.85); }
            // the moon catching the higher ground
            col += uMoon * 0.025 * smoothstep(2.0, 18.0, vW.y);
          }
          float dist = length(uCam - vW);
          float fog = 1.0 - exp(-pow(dist * uFogDensity, 1.5));
          gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -2;
    scene.add(this.mesh);
    this._p = new THREE.Vector3();
  }
  _row(k) {
    let r = this.cache.get(k);
    if (r) return r;
    const t = k * this.DT, M = this.M;
    r = { land: new Float32Array(M), bed: new Float32Array(M), d: new Float32Array(M), road: new Float32Array(M), bedRow: t > UNDER[0] - 2 && t < UNDER[1] + 5 };
    for (let j = 0; j < M; j++) {
      const x = COLS[j];
      r.land[j] = landY(t, x); r.bed[j] = bedY(t, x); r.d[j] = shoreDist(t, x);
      for (const [a, b, rx, hw] of ROADS) if (t > a && t < b && Math.abs(x - rx) < hw + 0.5) r.road[j] = 1;
    }
    this.cache.set(k, r);
    if (this.cache.size > 600) { for (const key of this.cache.keys()) { if (key < k - 300) this.cache.delete(key); } }
    return r;
  }
  update(track, rider, wet) {
    const N = this.N, M = this.M, DT = this.DT, k0 = Math.floor((rider.t - 4) / DT), P = this.pos, I = this.info;
    for (let i = 0; i < N; i++) {
      const k = k0 + i, t = k * DT, r = this._row(k);
      const yaw = track.groundYaw(t, 0, this._p), cx = this._p.x, cz = this._p.z, c = Math.cos(yaw), s = Math.sin(yaw);
      const bed = wet && r.bedRow;
      for (let j = 0; j < M; j++) {
        const o = i * M + j, x = COLS[j];
        P[o * 3] = cx - c * x; P[o * 3 + 1] = bed ? r.bed[j] : (wet ? Math.min(r.land[j], -3) : r.land[j]); P[o * 3 + 2] = cz + s * x;
        I[o * 4] = x; I[o * 4 + 1] = t * 40; I[o * 4 + 2] = r.d[j]; I[o * 4 + 3] = bed ? 1 : (r.road[j] ? -1 : 0);
      }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aInfo.needsUpdate = true;
  }
}

// ---------- the surface over her while she's under the lake ----------
class Surface {
  constructor(scene) {
    const g = new THREE.PlaneGeometry(6000, 6000, 1, 1); g.rotateX(-Math.PI / 2);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.006 }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) }, uY: { value: 0 } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform vec3 uCam, uFog, uMoonDir; uniform float uTime, uFogDensity, uY; varying vec3 vW;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
        void main(){
          vec3 V = normalize(vW - uCam);
          vec2 p = vW.xz * 0.045;
          float w = n2(p + vec2(uTime * 0.25, uTime * 0.1)) * 0.6 + n2(p * 2.7 - vec2(uTime * 0.3, 0.0)) * 0.4;
          vec3 col;
          if (uCam.y < uY) {
            // from under it: dark, the light through it wavering; a bright window straight up, brightest toward the moon
            float up = smoothstep(0.55, 0.95, V.y);
            float moon = pow(max(dot(V, normalize(uMoonDir)), 0.0), 8.0);
            col = vec3(0.03, 0.09, 0.09) + vec3(0.18, 0.42, 0.4) * w * (0.35 + 0.65 * up) + vec3(0.5, 0.8, 0.75) * moon * (0.5 + 0.5 * w);
          } else {
            col = vec3(0.01, 0.025, 0.04) + vec3(0.05, 0.1, 0.12) * w;
          }
          float d = length(uCam - vW);
          float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
          gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
        }`,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false; this.mesh.visible = false;
    scene.add(this.mesh);
  }
}

// the headlights' beams through the water, from the car on the bottom
function beamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    vertexShader: `varying float vL; varying vec3 vN; varying vec3 vV; void main(){ vL = uv.y; vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uK; varying float vL; varying vec3 vN; varying vec3 vV; void main(){ float e = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.2); float a = e * pow(clamp(vL, 0.0, 1.0), 2.2) * uK;
      // (never a bad value: one NaN in the HDR target blooms white with black holes)
      a = (a == a) ? clamp(a, 0.0, 2.0) : 0.0; gl_FragColor = vec4(vec3(0.85, 0.95, 0.8) * a * 0.42, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}

// ---------- the place, per frame ----------
export class YclWorld {
  constructor(scene, S) {
    this.S = S; this.scene = scene;
    this.shore = new Shore(scene);
    this.surface = new Surface(scene);
    // everything standing on the land stands on it (the town's things were placed on flat ground)
    const town = S.town;
    if (town) {
      town.floorFn = (t, x) => Math.max(0, landY(t, x));
      for (const it of town.items) if (it.parts === 'yclSign') it.h = Math.max(0, landY(it.t, it.x));
    }
    // his car, its pitch on a group of its own; the beams for when it's on the bottom
    this.car = new THREE.Group(); this.carTilt = new THREE.Group(); this.car.add(this.carTilt); this.car.visible = false;
    scene.add(this.car);
    this.beamMat = beamMaterial();
    const bg = new THREE.CylinderGeometry(0.25, 4.2, 26, 16, 1, true); bg.translate(0, -13, 0); bg.rotateX(-Math.PI / 2);
    // (rotated so it runs along +z from the lamp; uv.y is 1 at the lamp)
    this.beams = [];
    for (const x of [-0.62, 0.62]) { const b = new THREE.Mesh(bg, this.beamMat); b.position.set(x, 0.62, 2.25); b.rotation.x = -0.12; b.frustumCulled = false; this.carTilt.add(b); this.beams.push(b); }
    this.carScale = 3.0;
    this.carTilt.scale.setScalar(this.carScale);
    this.ready = worldReady = loadCar().then((c) => { if (c) { this.carTilt.add(c.obj); this.heads = c.heads; this.tails = c.tails; } });
    this.wet = false; this.wetK = 0; this.splashed = new Set();
    this._p = new THREE.Vector3(); this._v = new THREE.Vector3(); this._c = new THREE.Color(); this._w = new THREE.Vector3();
    this.nose = new THREE.Vector3();
    this.bubbles = [];
    for (let i = 0; i < 40; i++) this.bubbles.push({ x: 0, y: 0, z: 0, vy: 0, age: 9, life: 1 });
    this._nb = 0;
  }

  // a splash where something hits the water: spray, and the white of it
  _splash(S, p, n, k) {
    const c = this._c.setRGB(0.75, 0.9, 1).multiplyScalar(1.4 * k);
    S.sparks.emit(p, this._v.set(0, 6 * k, 0), c, n, { spread: 13 * k, life: 1.3, size: 0.5 + 0.5 * k, grav: 18, drag: 0.6, up: 1.6, jitter: 3 * k });
  }
  _bubble(x, y, z, vy, life) { const b = this.bubbles[this._nb = (this._nb + 1) % this.bubbles.length]; b.x = x; b.y = y; b.z = z; b.vy = vy; b.age = 0; b.life = life; }

  update(S, dt, camera, time) {
    const t = S.rider.t, P = S.P;
    // (the beach's strip of sand along the road isn't this lake's)
    if (S.land && !S.land._ycl) { S.land._ycl = true; S.land.mesh.visible = false; S.land.update = () => {}; }
    // under the water while the camera's under its surface
    const ys = surfaceY(t);
    const wet = ys !== null && camera.position.y < ys - 0.3;
    if (wet !== this.wet) {
      this.wet = wet;
      // going in, coming out: the white of it, spray round her
      if (S.track && S.rider) { const p = S.track.at(t, S.rider.x, 1, this._w); this._splash(S, p, 160, 1.4); S.flash = Math.max(S.flash, wet ? 0.35 : 0.45); if (wet) S.muffle = Math.max(S.muffle, 0.9); if (S.sound) S.sound.thud(wet ? 0.45 : 0.3); }
    }
    this.wetK += ((wet ? 1 : 0) - this.wetK) * Math.min(1, dt * 3);
    // (the bottom's weed, rocks and light only stand there while she's down there with them)
    S.town._yclWet = wet;
    // the song muffled, as if heard under water
    if (this.wetK > 0.01) S.muffle = Math.max(S.muffle, 0.42 * this.wetK);
    this.shore.update(S.track, S.rider, wet);
    const su = this.shore.mat.uniforms;
    su.uFog.value.set(P.fog); su.uFogDensity.value = P.fogDensity; su.uCam.value.copy(camera.position); su.uTime.value = time;
    su.uLand.value.set(P.ground); su.uSky.value.set(P.horizon); su.uMoon.value.set(P.moon);
    su.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    // the surface over her
    const sf = this.surface;
    sf.mesh.visible = ys !== null && ys > 0.2;
    if (sf.mesh.visible) {
      sf.mesh.position.set(camera.position.x, ys, camera.position.z);
      const u = sf.mat.uniforms; u.uCam.value.copy(camera.position); u.uTime.value = time; u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity; u.uY.value = ys;
      if (P.moonDir) u.uMoonDir.value.set(...P.moonDir).normalize();
    }
    // the town's under-water things
    const M = S.town.mats;
    if (M.yclWeedM) { const w = M.yclWeedM.uniforms; w.uTime.value = time; w.uFog.value.set(P.fog); w.uFogDensity.value = P.fogDensity; w.uCam.value.copy(camera.position); }
    if (M.yclShaftM) { M.yclShaftM.uniforms.uTime.value = time; M.yclShaftM.uniforms.uK.value = this.wetK; }
    // his car
    const C = carAt(t);
    this.car.visible = C.show && !!this.heads && (C.under ? wet : true);
    if (this.car.visible) {
      const yaw = S.track.groundYaw(C.tc, C.x, this._p);
      // (on the shore road it rides the ground; out on the pier and in the water its own height)
      this.car.position.set(this._p.x, C.y + (t < 38.0 ? Math.max(0, landY(C.tc, C.x)) : 0), this._p.z);
      this.car.rotation.set(0, yaw + C.turn, 0);
      this.carTilt.rotation.set(-C.pitch, 0, C.roll);   // (a negative pitch is nose down)
      this.carTilt.updateMatrixWorld(true);
      this.nose.set(0, 0.62, 2.3).applyMatrix4(this.carTilt.matrixWorld);
      for (const m of this.heads) m.emissiveIntensity = 2.5 * C.head;
      for (const m of this.tails) m.emissiveIntensity = 2.0 * C.tail;
      this.beamMat.uniforms.uK.value = C.under ? 1 : 0;
      for (const b of this.beams) b.visible = !!C.under;
    }
    // the splash when it goes in off the end of the pier
    if (t > 40.92 && t < 41.3 && !this.splashed.has('pier')) { this.splashed.add('pier'); const p = S.track.ground(PIER_END + 0.15, -24, this._w); p.y = 0.5; this._splash(S, p, 220, 1.8); }
    // bubbles: off the car as it goes under, off it on the bottom
    if ((t > 41 && t < 47) || (C.under && wet)) {
      const rate = C.under ? 14 : 22 * (1 - smooth(44, 47, t));
      if (Math.random() < dt * rate) { const p = S.track.ground(C.tc, C.x + (Math.random() - 0.5) * 3, this._w); this._bubble(p.x + (Math.random() - 0.5) * 2, C.under ? C.y + 2 : -0.4, p.z + (Math.random() - 0.5) * 2, 3 + Math.random() * 3, C.under ? 6 : 1.2); }
    }
    for (const b of this.bubbles) if (b.age < b.life) { b.age += dt; b.y += b.vy * dt; b.x += Math.sin(time * 3 + b.age * 5) * dt * 0.6; }
  }

  // the car's lights, and the glow of them under the water
  draw(T, rider, songT) {
    const t = rider.t, C = CAR;
    if (C.show && (C.head > 0 || C.tail > 0) && !C.under) {
      const yaw = this.car.rotation.y, s = this.carScale, c = Math.cos(yaw), sn = Math.sin(yaw), p = this.car.position;
      const fx = sn, fz = c, rx = -c, rz = sn;
      const dip = Math.sin(-C.pitch);
      if (C.sunk < 0.05) {
        for (const side of LAMPS) {
          const hx = p.x + (fx * 2.3 + rx * side) * s, hz = p.z + (fz * 2.3 + rz * side) * s, hy = p.y + (0.66 - 2.3 * dip) * s;
          T.glow(hx, hy, hz, 2.6 * s, HEAD, 1.6 * C.head);
          const tx = p.x - (fx * 2.3 - rx * side) * s, tz = p.z - (fz * 2.3 - rz * side) * s;
          if (C.tail > 0.01) { T.glow(tx, p.y + (0.7 + 2.3 * dip) * s, tz, 2.6 * s, TAIL, 2.2 * C.tail); T.glow(tx, p.y + 0.8 * s, tz, 7 * s, TAIL, 0.22 * C.tail); }
        }
        // where the headlights land
        if (C.head > 0.01) { T.pool(p.x + fx * 13 * s, Math.max(p.y - 1, 0.25), p.z + fz * 13 * s, 22 * s, HEAD, 0.55 * C.head); T.glow(p.x + fx * 6 * s, p.y + 1.2 * s, p.z + fz * 6 * s, 9 * s, HEAD, 0.18 * C.head); }
      }
    }
    // in the water nose down: its lights on under the surface round its nose, and rings going out
    if (C.show && C.sunk > 0 && !C.under) {
      const k = 1 - smooth(44.0, 45.0, t), n = this.nose;
      T.glow(n.x, -0.25, n.z, 9, HEAD, 1.1 * k); T.glow(n.x, -0.2, n.z, 26, LAKE, 0.35 * k); T.pool(n.x, -0.33, n.z, 46, LAKE, 0.6 * k);
    }
    if (t > 40.95 && t < 46 && T.layers.yclRing) {
      const p = this.S.track.ground(PIER_END + 0.15, -24, this._w), m = this._m || (this._m = new THREE.Matrix4());
      for (let j = 0; j < 4; j++) {
        const f = (t - 40.95 - j * 0.45) / 3.2; if (f <= 0 || f >= 1) continue;
        const r = 6 + f * 60; m.makeScale(r, 1, r); m.setPosition(p.x, -0.34, p.z); RING.aK = 0.7 * (1 - f) * (1 - f); T.layers.yclRing.add(m, RING);
      }
    }
    // gone under: two lights in the black water, and the green of them round it, fading as it sinks
    if (t > 40.95 && t < 58) {
      const k = (1 - smooth(46, 58, t)) * (0.4 + 0.6 * smooth(41.5, 43.5, t));
      this._sunkGlow(T, PIER_END + 0.15 + 0.05, -24.5, k, t);
    }
    // the lights under the water again, ahead, for "yeah, your car is at the bottom of the lake" and "you're mine forever now"
    if (t > 44 && t < 53) this._sunkGlow(T, 50.6, -26, smooth(44, 46, t) * (1 - smooth(51.5, 53, t)) * 0.9, t);
    if (t > 92.8 && t < 102) this._sunkGlow(T, 99.2, -34, smooth(93, 95, t) * (1 - smooth(100, 102, t)), t);
    // the bubbles
    for (const b of this.bubbles) if (b.age < b.life) {
      const f = b.age / b.life;
      if (!this.wet && b.y > -0.4) { T.glow(b.x, -0.3, b.z, 1.4 + 2.5 * f, LAKE, 0.6 * (1 - f)); continue; }
      T.glow(b.x, b.y, b.z, 0.9 + 0.6 * f, BUBBLE, 0.9 * (1 - f) * smooth(0, 0.1, f));
    }
  }
  _sunkGlow(T, tc, x, k, t) {
    if (k <= 0.01 || !this.S.track) return;
    const p = this.S.track.ground(tc, x, this._w), yaw = this.S.course.yawAt(tc), fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
    for (const side of BEAMS) T.glow(p.x + fx * 7 + rx * side, -0.3, p.z + fz * 7 + rz * side, 6, HEAD, 0.9 * k * (0.9 + 0.1 * Math.sin(t * 3 + side)));
    T.pool(p.x + fx * 6, -0.33, p.z + fz * 6, 40, LAKE, 0.5 * k);
    T.glow(p.x + fx * 6, -0.2, p.z + fz * 6, 34, LAKE, 0.16 * k);
  }
}

// ---------- the end: her cabin by the water, the porch light on, the spare key on its hook ----------
export class YclFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? 44;
    this.group = new THREE.Group(); scene.add(this.group);
    const mat = selfLit({ roughness: 0.8 }, 0.22);
    const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; this.group.add(o); return o; };
    add(YC.cabin(), mat, 0, 0, 0);
    add(YC.cabinGlass(), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc878).multiplyScalar(1.3) }), 0, 0, 0);
    // the rack by the door, and on it the one key
    const rack = YC.rack(); rack.scale(0.32, 0.32, 0.32); add(rack, selfLit({ roughness: 0.6, metalness: 0.2 }, 0.3), -5.6, 1.6, 8.6);
    const key = YC.key(); key.scale(0.34, 0.34, 0.34); this.key = add(key, selfLit({ roughness: 0.25, metalness: 0.85 }, 0.7), -5.6 + 8 * 0.32, 1.6 + 15.2 * 0.32, 9.4);
    const mug = YC.mug(); mug.scale(0.16, 0.16, 0.16); add(mug, selfLit({ roughness: 0.3 }, 0.35), 9.6, 4.85, 14.6);
    this.group.scale.setScalar(cfg.s ?? 1);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  // (the car is loaded by the world; the ride waits for it here, so nothing compiles mid-ride)
  get ready() { return worldReady || loadCar(); }
  fire() { this.fired = true; }
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = Math.max(0, landY(this.t, this.x));
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    this.key.rotation.y = Math.sin(songT * 0.9) * 0.5;
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1, w = this._w;
    w.set(0, 9.4, 12.6).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 4.5 * s, PORCH, 1.7); S.glow(w.x, w.y, w.z, 24 * s, PORCH, 0.45);
    for (const x of WINDOWS) { w.set(x, 5.5, 9.5).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 14 * s, PORCH, 0.5); }
    w.set(0, 0, 16).applyMatrix4(this.group.matrixWorld); S.pool(w.x, w.y + 0.2, w.z, 36 * s, PORCH, 0.6);
    w.set(-5.6 + 8 * 0.32, 1.6 + 11.6 * 0.32, 10).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 2.2 * s, GLINT, 0.9 + 0.6 * Math.max(0, Math.sin(songT * 2.2)));
  }
}
