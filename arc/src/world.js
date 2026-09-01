// The drowned valley: water, sky, moon, fog, and the drowned buildings you skate on.
// Buildings are data (`{x,z,w,d,h,ridge,rot,kind,r}`); each chapter is merged into a
// handful of draws. Collision is analytic against the same data the meshes are built from.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CFG } from './config.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();

export const CHAPTER_WARMTH = [0.0, 0.0, 0.0, 0.0]; // mutated at runtime by setWake

// ---- sky ---------------------------------------------------------------------
const SkyShader = {
  uniforms: {
    uZenith: { value: new THREE.Color(0x050716) },
    uHorizon: { value: new THREE.Color(0x1b2150) },
    uDawn: { value: 0 },
    uMoon: { value: new THREE.Vector3(...CFG.world.moonDir).normalize() },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec3 vDir;
    void main(){ vDir = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w * 0.99999; }`,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform vec3 uZenith, uHorizon, uMoon; uniform float uDawn, uTime;
    varying vec3 vDir;
    float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
    void main(){
      vec3 d = normalize(vDir);
      float h = clamp(d.y, -0.2, 1.0);
      vec3 col = mix(uHorizon, uZenith, pow(max(0.0, h), 0.55));
      // dawn: warm the horizon, lift the zenith, from one direction (behind the dam, -z)
      float dawnSide = 0.5 + 0.5 * dot(normalize(vec3(d.x, 0.0, d.z)), vec3(0.0, 0.0, -1.0));
      vec3 dawnCol = mix(vec3(0.95, 0.45, 0.22), vec3(0.62, 0.72, 0.95), clamp(h * 2.2, 0.0, 1.0));
      col = mix(col, dawnCol, uDawn * (0.35 + 0.65 * dawnSide) * (1.0 - 0.6 * h));
      // moon
      float m = max(0.0, dot(d, uMoon));
      col += vec3(0.75, 0.82, 1.0) * (pow(m, 900.0) * 3.0 + pow(m, 40.0) * 0.16 + pow(m, 6.0) * 0.05) * (1.0 - uDawn * 0.8);
      // stars
      vec3 g = floor(d * 260.0);
      float s = hash(g);
      vec3 fr = fract(d * 260.0) - 0.5 - (vec3(hash(g + 3.0), hash(g + 7.0), hash(g + 11.0)) - 0.5) * 0.5;
      float star = step(0.9955, s) * smoothstep(0.32, 0.04, length(fr)) * (0.55 + 0.45 * sin(uTime * (1.5 + 3.0 * hash(g + 1.0)) + s * 40.0));
      col += vec3(0.8, 0.85, 1.0) * star * smoothstep(0.02, 0.35, h) * (1.0 - uDawn);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

// ---- water -------------------------------------------------------------------
const WaterShader = {
  uniforms: {
    uTime: { value: 0 },
    uMoon: { value: new THREE.Vector3(...CFG.world.moonDir).normalize() },
    uDeep: { value: new THREE.Color(0x03040c) },
    uShallow: { value: new THREE.Color(0x0b1236) },
    uFog: { value: new THREE.Color(CFG.world.fog) },
    uFogDensity: { value: CFG.world.fogDensity },
    uCam: { value: new THREE.Vector3() },
    uDawn: { value: 0 },
    uLight: { value: new THREE.Vector3(0, -100, 0) },
    uLightColor: { value: new THREE.Color(0xffb24a) },
    uLightPower: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec3 vWorld; varying vec2 vUv;
    void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vUv = uv; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform float uTime, uFogDensity, uDawn, uLightPower; uniform vec3 uMoon, uDeep, uShallow, uFog, uCam, uLight, uLightColor;
    varying vec3 vWorld;
    // cheap ripples: three moving sine fields as a fake normal
    vec3 ripple(vec2 p){
      float t = uTime;
      float a = sin(p.x * 0.35 + t * 0.9) + sin(p.y * 0.28 - t * 0.7) + sin((p.x + p.y) * 0.19 + t * 0.5);
      float b = cos(p.x * 0.31 - t * 0.6) + cos(p.y * 0.41 + t * 0.8) + cos((p.x - p.y) * 0.23 - t * 0.45);
      // a fine chop on top so the moon breaks into glitter instead of soft blobs
      // domain-warp the chop so its maxima never line up into a lattice (the checkerboard of glitter)
      vec2 q = p + vec2(sin(p.y * 0.07 + t * 0.3), cos(p.x * 0.06 - t * 0.25)) * 6.0;
      a += sin(q.x * 2.7 + q.y * 1.9 + t * 2.6) * 0.6 + sin(q.x * 4.1 - q.y * 3.3 - t * 3.1) * 0.35;
      b += cos(q.y * 3.1 - q.x * 2.2 + t * 2.2) * 0.6 + cos(q.x * 3.7 + q.y * 4.4 + t * 2.9) * 0.35;
      return normalize(vec3(a * 0.05, 1.0, b * 0.05));
    }
    void main(){
      vec3 n = ripple(vWorld.xz);
      vec3 v = normalize(uCam - vWorld);
      float fres = pow(1.0 - max(0.0, dot(n, v)), 3.0);
      vec3 col = mix(uDeep, uShallow, fres * 0.8);
      // moon glitter
      vec3 h = normalize(uMoon + v);
      float spec = pow(max(0.0, dot(n, h)), 420.0) * 0.22 + pow(max(0.0, dot(n, h)), 30.0) * 0.03;
      col += vec3(0.7, 0.78, 1.0) * spec * (1.0 - uDawn * 0.5);
      // the swift's light on the water
      vec3 L = uLight - vWorld; float dl = length(L); L /= dl;
      float ld = max(0.0, dot(n, L)) * uLightPower / (1.0 + dl * dl * 0.02);
      vec3 hl = normalize(L + v);
      col += uLightColor * (ld * 0.05 + pow(max(0.0, dot(n, hl)), 160.0) * uLightPower * 0.07 / (1.0 + dl * 0.08));
      // dawn tint
      col = mix(col, vec3(0.2, 0.26, 0.42), uDawn * 0.6);
      // fog
      float dist = length(uCam - vWorld);
      float f = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
      col = mix(col, mix(uFog, vec3(0.55, 0.6, 0.8), uDawn), f);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

// ---- building material with wake-able windows ----------------------------------
function makeBuildingMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.05 });
  return m;
}

const WindowShader = {
  uniforms: { uWake: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color(0xffb86a) } },
  vertexShader: /* glsl */`
    attribute float aSeed; varying float vSeed; varying float vFog;
    void main(){ vSeed = aSeed; vec4 mv = modelViewMatrix * vec4(position, 1.0); vFog = -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: /* glsl */`
    precision highp float; uniform float uWake, uTime; uniform vec3 uColor; varying float vSeed; varying float vFog;
    void main(){
      float on = step(vSeed, uWake);
      float flicker = 0.85 + 0.15 * sin(uTime * (2.0 + vSeed * 3.0) + vSeed * 50.0);
      vec3 col = uColor * on * flicker * 2.2 + vec3(0.02, 0.025, 0.05);
      float fog = 1.0 - exp(-${CFG.world.fogDensity} * ${CFG.world.fogDensity} * vFog * vFog);
      col = mix(col, vec3(${((CFG.world.fog >> 16) & 255) / 255}, ${((CFG.world.fog >> 8) & 255) / 255}, ${(CFG.world.fog & 255) / 255}), fog);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class World {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer;
    this.buildings = [];
    this.chapterGroups = [];
    this.windowMats = [];
    this.waterY = CFG.world.waterY;
    this.time = 0;
    this.dawn = 0;

    scene.fog = new THREE.FogExp2(CFG.world.fog, CFG.world.fogDensity);

    // sky
    this.skyMat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(SkyShader.uniforms), vertexShader: SkyShader.vertexShader, fragmentShader: SkyShader.fragmentShader, side: THREE.BackSide, depthWrite: false, fog: false });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), this.skyMat); this.sky.name = 'sky'; this.sky.frustumCulled = false; this.sky.renderOrder = -10;
    scene.add(this.sky);

    // water
    this.waterMat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(WaterShader.uniforms), vertexShader: WaterShader.vertexShader, fragmentShader: WaterShader.fragmentShader, fog: false });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000, 1, 1), this.waterMat);
    this.water.rotation.x = -Math.PI / 2; this.water.position.y = this.waterY; this.water.name = 'water'; this.water.renderOrder = -5;
    scene.add(this.water);

    // lights: one cool moon key, a dim hemisphere, and the swift's warm point (owned by the swift)
    this.moon = new THREE.DirectionalLight(0x9fb4ff, 0.42);
    this.moon.position.set(...CFG.world.moonDir).multiplyScalar(300);
    scene.add(this.moon);
    this.hemi = new THREE.HemisphereLight(0x2a3570, 0x05060f, 0.55);
    scene.add(this.hemi);

    this.buildingMat = makeBuildingMaterial();
  }

  // ---- chapter geometry --------------------------------------------------------
  addChapter(index, data) {
    const group = new THREE.Group(); group.name = 'chapter-' + index;
    const geos = [];
    const winGeos = [];
    for (const b of data.buildings) {
      b.chapter = index;
      b.rot = b.rot || 0; b.ridge = b.ridge ?? 0; b.kind = b.kind || 'roof';
      this.buildings.push(b);
      if (b.kind === 'spire') this._spireGeo(b, geos, winGeos);
      else this._roofGeo(b, geos, winGeos);
    }
    if (geos.length) {
      const merged = mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(merged, this.buildingMat); mesh.name = 'buildings-' + index; mesh.castShadow = false; mesh.receiveShadow = false;
      group.add(mesh);
    }
    if (winGeos.length) {
      const merged = mergeGeometries(winGeos, false);
      const mat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(WindowShader.uniforms), vertexShader: WindowShader.vertexShader, fragmentShader: WindowShader.fragmentShader, fog: false });
      const mesh = new THREE.Mesh(merged, mat); mesh.name = 'windows-' + index;
      group.add(mesh);
      this.windowMats[index] = mat;
    }
    this.scene.add(group);
    this.chapterGroups[index] = group;
    return group;
  }

  _colorGeo(geo, color, jitter = 0.05) {
    const c = new THREE.Color(color);
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const j = 1 + (Math.random() - 0.5) * jitter; arr[i * 3] = c.r * j; arr[i * 3 + 1] = c.g * j; arr[i * 3 + 2] = c.b * j; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  }

  _roofGeo(b, geos, winGeos) {
    const wall = b.tag === 'dam' || b.tag === 'buttress' ? 0x0d1026 : 0x1a1f3d, slate = 0x232848, trim = 0x2b3160;
    const base = -3; // walls continue below the water line
    const bodyH = b.h - base;
    const body = new THREE.BoxGeometry(b.w, bodyH, b.d);
    body.translate(0, base + bodyH / 2, 0);
    this._colorGeo(body, wall, 0.08);
    const parts = [body];
    if (b.ridge > 0) {
      // a prism roof: ridge along the local z axis (the long side is d)
      const shape = new THREE.Shape();
      shape.moveTo(-b.w / 2, 0); shape.lineTo(b.w / 2, 0); shape.lineTo(0, b.ridge); shape.closePath();
      const prism = new THREE.ExtrudeGeometry(shape, { depth: b.d, bevelEnabled: false });
      prism.translate(0, b.h, -b.d / 2);
      this._colorGeo(prism, slate, 0.06);
      parts.push(prism);
      // a chimney
      const ch = new THREE.BoxGeometry(0.9, 2.2 + b.ridge * 0.4, 0.9);
      ch.translate(b.w * 0.28, b.h + 0.9 + b.ridge * 0.3, -b.d * 0.3);
      this._colorGeo(ch, trim, 0.05);
      parts.push(ch);
    } else {
      // a flat roof gets a parapet lip
      const lip = new THREE.BoxGeometry(b.w + 0.5, 0.5, b.d + 0.5);
      lip.translate(0, b.h + 0.05, 0);
      this._colorGeo(lip, trim, 0.04);
      parts.push(lip);
    }
    // a lamp on every ledge of the dam: the wordless route up (always lit: seed -1)
    if (b.tag === 'ledge' || b.tag === 'socket-ledge') {
      const q = new THREE.PlaneGeometry(4.5, 1.2); q.translate(0, b.h + 0.7, b.d / 2 + 0.03);
      q.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(q.attributes.position.count).fill(-1), 1));
      winGeos.push(this._place(q, b));
    }
    // windows: rows on the long faces above the water (never on the dam or its buttresses)
    const noWindows = b.tag === 'dam' || b.tag === 'buttress' || b.tag === 'ledge' || b.tag === 'socket-ledge';
    const rows = noWindows ? 0 : Math.max(0, Math.floor((b.h - 2.2) / 3));
    for (let r = 0; r < rows; r++) {
      const y = 2.0 + r * 3 + 0.9;
      const cols = Math.max(1, Math.floor(b.d / 3.2));
      for (let c = 0; c < cols; c++) {
        const z = -b.d / 2 + (c + 0.5) * (b.d / cols);
        for (const side of [-1, 1]) {
          if (Math.random() < 0.35) continue;
          const q = new THREE.PlaneGeometry(1.1, 1.5);
          q.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
          q.translate(side * (b.w / 2 + 0.03), y, z);
          const seed = new Float32Array(q.attributes.position.count).fill(0.15 + Math.random() * 0.85);
          q.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
          winGeos.push(this._place(q, b));
        }
      }
    }
    for (const p of parts) geos.push(this._place(p, b));
  }

  _spireGeo(b, geos, winGeos) {
    const stone = 0x1c2142, cap = 0x2a2f5c;
    const base = -3;
    const rTop = b.r * 0.72;
    const body = new THREE.CylinderGeometry(rTop, b.r, b.h - base, 14, 1);
    body.translate(0, base + (b.h - base) / 2, 0);
    this._colorGeo(body, stone, 0.08);
    const parapet = new THREE.CylinderGeometry(rTop + 0.4, rTop + 0.4, 0.6, 14, 1);
    parapet.translate(0, b.h + 0.1, 0);
    this._colorGeo(parapet, cap, 0.04);
    geos.push(this._place(body, b), this._place(parapet, b));
    // a spike on the axis, but never on a spire you stand on (it hides the rider from the chase camera)
    if (!b.tag) {
      const spike = new THREE.ConeGeometry(0.5, Math.max(4, b.h * 0.12), 8);
      spike.translate(0, b.h + Math.max(4, b.h * 0.12) / 2, 0);
      this._colorGeo(spike, cap, 0.04);
      geos.push(this._place(spike, b));
    }
    // slit windows spiralling up
    const n = Math.floor(b.h / 4);
    for (let i = 0; i < n; i++) {
      const y = 3 + i * 4;
      const a = i * 1.9 + (b.x * 0.01);
      const rr = THREE.MathUtils.lerp(b.r, rTop, (y - base) / (b.h - base)) + 0.05;
      const q = new THREE.PlaneGeometry(0.5, 1.6);
      q.rotateY(a + Math.PI / 2);
      q.translate(Math.cos(a) * rr, y, Math.sin(a) * rr);
      const seed = new Float32Array(q.attributes.position.count).fill(0.15 + Math.random() * 0.85);
      q.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      winGeos.push(this._place(q, b));
    }
  }

  _place(geo, b) {
    if (b.rot) geo.rotateY(b.rot); geo.translate(b.x, 0, b.z);
    // merge needs every part non-indexed with the same attribute set (Extrude is non-indexed, Box is not)
    if (geo.index) geo = geo.toNonIndexed();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', 'color', 'aSeed'].includes(k)) geo.deleteAttribute(k);
    return geo;
  }

  setWake(index, amount) {
    CHAPTER_WARMTH[index] = amount;
    const m = this.windowMats[index];
    if (m) m.uniforms.uWake.value = amount;
  }

  setDawn(d) {
    this.dawn = d; this.skyMat.uniforms.uDawn.value = d; this.waterMat.uniforms.uDawn.value = d;
    this.scene.fog.color.copy(new THREE.Color(CFG.world.fog).lerp(new THREE.Color(0xa8a6b4), d));
    // morning air is clearer: the valley opens up as the light comes
    this.scene.fog.density = CFG.world.fogDensity * (1 - 0.6 * d); this.waterMat.uniforms.uFogDensity.value = this.scene.fog.density;
    this.moon.intensity = 0.42 + d * 1.6; this.moon.color.setHex(0x9fb4ff).lerp(new THREE.Color(0xffd9b0), d);
    this.hemi.intensity = 0.55 + d * 1.2; this.hemi.color.setHex(0x2a3570).lerp(new THREE.Color(0xe0cdb8), d);
  }

  setWaterY(y) { this.waterY = y; this.water.position.y = y; }

  // ---- collision ------------------------------------------------------------------
  // Local coordinates of a building (rotation about its centre).
  _local(b, x, z, out) {
    const dx = x - b.x, dz = z - b.z;
    if (!b.rot) { out.x = dx; out.z = dz; return out; }
    const c = Math.cos(-b.rot), s = Math.sin(-b.rot);
    out.x = dx * c - dz * s; out.z = dx * s + dz * c;
    return out;
  }

  // Standing height at (x, z): the highest building top under the point, or -Infinity.
  heightAt(x, z, out = null) {
    let best = -Infinity, bb = null;
    for (const b of this.buildings) {
      if (Math.abs(x - b.x) > 80 || Math.abs(z - b.z) > 80) continue;
      const l = this._local(b, x, z, _v);
      if (b.kind === 'spire') {
        const rTop = b.r * 0.72 + 0.4;
        if (l.x * l.x + l.z * l.z <= rTop * rTop) { if (b.h + 0.1 > best) { best = b.h + 0.1; bb = b; } }
        continue;
      }
      if (Math.abs(l.x) <= b.w / 2 + 0.25 && Math.abs(l.z) <= b.d / 2 + 0.25) {
        let top = b.h;
        if (b.ridge > 0) { const u = Math.min(1, Math.abs(l.x) / (b.w / 2)); top = b.h + b.ridge * (1 - u); }
        else top = b.h + 0.05;
        if (top > best) { best = top; bb = b; }
      }
    }
    if (out) out.building = bb;
    return best;
  }

  // Push a capsule of radius r whose feet are at y out of any wall higher than feet + stepUp.
  resolveWalls(pos, r, stepUp) {
    for (const b of this.buildings) {
      if (Math.abs(pos.x - b.x) > 80 || Math.abs(pos.z - b.z) > 80) continue;
      const l = this._local(b, pos.x, pos.z, _v);
      if (b.kind === 'spire') {
        const t = THREE.MathUtils.clamp((pos.y + 3) / (b.h + 3), 0, 1);
        const rr = THREE.MathUtils.lerp(b.r, b.r * 0.72, t) + r;
        const d2 = l.x * l.x + l.z * l.z;
        if (d2 < rr * rr && pos.y < b.h - stepUp) {
          const d = Math.sqrt(d2) || 0.001; const push = rr - d;
          _w.set(l.x / d, 0, l.z / d);
          if (b.rot) { const c = Math.cos(b.rot), s = Math.sin(b.rot); const px = _w.x * c - _w.z * s, pz = _w.x * s + _w.z * c; _w.x = px; _w.z = pz; }
          pos.x += _w.x * push; pos.z += _w.z * push;
          return b;
        }
        continue;
      }
      const hw = b.w / 2 + r, hd = b.d / 2 + r;
      if (Math.abs(l.x) < hw && Math.abs(l.z) < hd && pos.y < b.h - stepUp) {
        const px = hw - Math.abs(l.x), pz = hd - Math.abs(l.z);
        if (px < pz) _w.set(Math.sign(l.x || 1) * px, 0, 0); else _w.set(0, 0, Math.sign(l.z || 1) * pz);
        if (b.rot) { const c = Math.cos(b.rot), s = Math.sin(b.rot); const qx = _w.x * c - _w.z * s, qz = _w.x * s + _w.z * c; _w.x = qx; _w.z = qz; }
        pos.x += _w.x; pos.z += _w.z;
        return b;
      }
    }
    return null;
  }

  // Is the point inside a building's solid volume? Returns the building or null.
  solidAt(p) {
    for (const b of this.buildings) {
      if (Math.abs(p.x - b.x) > 80 || Math.abs(p.z - b.z) > 80) continue;
      const l = this._local(b, p.x, p.z, _v);
      if (b.kind === 'spire') {
        const t = THREE.MathUtils.clamp((p.y + 3) / (b.h + 3), 0, 1);
        const rr = THREE.MathUtils.lerp(b.r, b.r * 0.72, t);
        if (l.x * l.x + l.z * l.z <= rr * rr && p.y <= b.h + 0.2) return b;
        continue;
      }
      if (Math.abs(l.x) <= b.w / 2 && Math.abs(l.z) <= b.d / 2) {
        let top = b.h; if (b.ridge > 0) top = b.h + b.ridge * (1 - Math.min(1, Math.abs(l.x) / (b.w / 2)));
        if (p.y <= top) return b;
      }
    }
    return null;
  }

  // Segment test for the swift: first solid along from->to, backed off to the surface.
  hitTest(from, to, extraColliders = null, ignore = null) {
    const steps = Math.max(2, Math.ceil(from.distanceTo(to) / 0.4));
    // prev must be its own vector: solidAt -> _local overwrites the module temps
    const prev = from.clone();
    for (let i = 1; i <= steps; i++) {
      const p = _w.copy(from).lerp(to, i / steps);
      const b = this.solidAt(p);
      if (b && b !== ignore) {
        // back off to just outside
        const hit = p.clone().lerp(prev, 0.6);
        return { hit, object: b, kind: 'building' };
      }
      if (extraColliders) {
        for (const c of extraColliders) {
          const d = p.distanceTo(c.centre);
          if (d < c.radius) {
            const n = p.clone().sub(c.centre).normalize();
            const hit = c.centre.clone().addScaledVector(n, c.radius + 0.15);
            return { hit, object: c.owner, kind: 'boss', collider: c, normal: n };
          }
        }
      }
      prev.copy(p);
    }
    return null;
  }

  update(dt, time, camPos, lightPos, lightPower) {
    this.time = time;
    this.skyMat.uniforms.uTime.value = time;
    this.waterMat.uniforms.uTime.value = time;
    this.waterMat.uniforms.uCam.value.copy(camPos);
    this.waterMat.uniforms.uLight.value.copy(lightPos);
    this.waterMat.uniforms.uLightPower.value = lightPower;
    this.water.position.x = camPos.x; this.water.position.z = camPos.z;
    this.sky.position.copy(camPos);
    for (const m of this.windowMats) if (m) m.uniforms.uTime.value = time;
  }
}
