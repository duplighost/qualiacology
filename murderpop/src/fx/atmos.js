// Atmosphere: volumetric-looking light shafts (sun through windows, stage spots, moonlight under water) and
// dust motes drifting in the air that glint where the light is. Cheap: additive geometry, no ray marching.
import * as THREE from 'three';

const SHAFT_VS = /* glsl */`
varying vec3 vL; varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main() { vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * mv; }`;
const SHAFT_FS = /* glsl */`
uniform vec3 uCol; uniform float uK, uTime, uLen, uSoft;
varying vec3 vL; varying vec3 vN; varying vec3 vV; varying vec3 vW;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) { vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
void main() {
  // y runs 0 (source) .. -uLen (floor); fade toward both ends and at grazing edges
  float along = clamp(-vL.y / uLen, 0.0, 1.0);
  float ends = smoothstep(0.0, 0.12, along) * (1.0 - smoothstep(0.82, 1.0, along));
  float edge = pow(abs(dot(normalize(vN), normalize(vV))), uSoft);
  float dust = 0.75 + 0.5 * noise(vW * 1.7 + vec3(0.0, uTime * 0.12, uTime * 0.05));
  float a = uK * ends * edge * dust * 0.16;
  gl_FragColor = vec4(uCol * a, a);
}`;

export class Shafts {
  constructor(scene) { this.scene = scene; this.list = []; this.t = 0; }
  // a shaft from (x,y,z) pointing along dir (default straight down), length len, radii r0 (source) r1 (floor)
  // box: true makes a rectangular shaft (a window): w0 x d0 at the source, w1 x d1 at the floor
  add({ x = 0, y = 8, z = 0, dir = new THREE.Vector3(0, -1, 0), len = 9, r0 = 0.6, r1 = 1.6, box = false, w0 = 1.4, d0 = 0.3, w1 = 2.2, d1 = 1.4, color = new THREE.Color(1.0, 0.8, 0.55), k = 1, soft = 1.4 } = {}) {
    let g;
    if (box) {
      g = new THREE.BufferGeometry();
      const top = [[-w0 / 2, 0, -d0 / 2], [w0 / 2, 0, -d0 / 2], [w0 / 2, 0, d0 / 2], [-w0 / 2, 0, d0 / 2]];
      const bot = [[-w1 / 2, -len, -d1 / 2], [w1 / 2, -len, -d1 / 2], [w1 / 2, -len, d1 / 2], [-w1 / 2, -len, d1 / 2]];
      const pos = [], idx = [];
      for (const v of [...top, ...bot]) pos.push(...v);
      for (let i = 0; i < 4; i++) { const a = i, b = (i + 1) % 4; idx.push(a, b, b + 4, a, b + 4, a + 4); }
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    } else {
      g = new THREE.CylinderGeometry(r0, r1, len, 40, 1, true); g.translate(0, -len / 2, 0);
    }
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: SHAFT_VS, fragmentShader: SHAFT_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uCol: { value: color }, uK: { value: k }, uTime: { value: 0 }, uLen: { value: len }, uSoft: { value: soft } } }));
    m.position.set(x, y, z);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
    m.renderOrder = 7; m.frustumCulled = false;
    this.scene.add(m);
    const s = { m, k, target: k };
    this.list.push(s);
    return s;
  }
  set(s, k) { s.target = k; }
  update(dt) {
    this.t += dt;
    for (const s of this.list) { const u = s.m.material.uniforms; u.uTime.value = this.t; u.uK.value += (s.target - u.uK.value) * Math.min(1, dt * 3); s.m.visible = u.uK.value > 0.005; }
  }
  dispose() { for (const s of this.list) { this.scene.remove(s.m); s.m.geometry.dispose(); s.m.material.dispose(); } this.list.length = 0; }
}

// dust motes in a box, glinting; brightness can follow a light (e.g. inside shafts)
export class Motes {
  constructor(scene, { n = 600, box = [-12, 0.2, -8, 12, 7, 8], color = new THREE.Color(1.6, 1.4, 1.1), size = 0.03, k = 1 } = {}) {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) { p[i * 3] = box[0] + Math.random() * (box[3] - box[0]); p[i * 3 + 1] = box[1] + Math.random() * (box[4] - box[1]); p[i * 3 + 2] = box[2] + Math.random() * (box[5] - box[2]); ph[i] = Math.random() * 100; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
    this.mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uCol: { value: color }, uSize: { value: size }, uK: { value: k }, uBox: { value: new THREE.Vector3(box[3] - box[0], box[4] - box[1], box[5] - box[2]) }, uMin: { value: new THREE.Vector3(box[0], box[1], box[2]) } },
      vertexShader: `attribute float phase; uniform float uT, uSize; uniform vec3 uBox, uMin; varying float vA;
        void main(){ vec3 p = position; p.x += sin(uT * 0.11 + phase) * 0.6; p.y += sin(uT * 0.07 + phase * 1.3) * 0.4 + uT * 0.02; p.z += cos(uT * 0.09 + phase) * 0.5;
          p = uMin + mod(p - uMin, uBox);
          vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          vA = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uT * 2.3 + phase * 7.0), 6.0);
          gl_PointSize = uSize * 900.0 / -mv.z; }`,
      fragmentShader: `uniform vec3 uCol; uniform float uK; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)) * vA * uK; if (a < 0.01) discard; gl_FragColor = vec4(uCol * a, a); }` });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 7;
    scene.add(this.pts); this.scene = scene;
  }
  update(dt) { this.mat.uniforms.uT.value += dt; }
  dispose() { this.scene.remove(this.pts); this.pts.geometry.dispose(); this.mat.dispose(); }
}
