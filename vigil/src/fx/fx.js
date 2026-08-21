// FX: pooled particles, tracers, impact decals, flash lights, and time-scale
// (hitstop). Everything is ring-buffer pooled — combat never allocates.
// impact() is the ONLY door into hit feedback (FLARE's law): particles,
// light, decal, sound, and hitstop all route through it, so a hit can never
// half-happen.
//
// Flash lights live in the scene permanently at intensity 0: toggling a
// light's presence changes numPointLights and recompiles every lit material
// (a multi-second ANGLE hitch the first time you pull the trigger).

import * as THREE from 'three';
import { TAU, clamp, clamp01, lerp } from '../engine/math.js';

const MAX_PARTICLES = 1400;
const MAX_TRACERS = 24;
const MAX_DECALS = 64;
const FLASH_LIGHTS = 5;

export function create(ctx) {
  const scene = ctx.scene;
  const rng = ctx.rng.fork('fx');

  /* ---------------- particles: one Points, CPU-integrated ring ---------------- */
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAX_PARTICLES * 3);
  const pCol = new Float32Array(MAX_PARTICLES * 3);
  const pAttr = new Float32Array(MAX_PARTICLES * 2); // size, alpha
  pPos.fill(-9999);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('aP', new THREE.BufferAttribute(pAttr, 2));
  const pVel = new Float32Array(MAX_PARTICLES * 3);
  const pLife = new Float32Array(MAX_PARTICLES * 2); // age, life
  const pDrag = new Float32Array(MAX_PARTICLES);
  const pGrav = new Float32Array(MAX_PARTICLES);
  const pSize0 = new Float32Array(MAX_PARTICLES);
  const pAlpha0 = new Float32Array(MAX_PARTICLES);
  let pCursor = 0;
  const pMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: /* glsl */`
      attribute vec2 aP;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = aP.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // aP.x is an approximate world diameter in metres
        gl_PointSize = clamp(aP.x * 700.0 / max(1.0, -mv.z), 1.5, 90.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float r = length(p) * 2.0;
        float a = (1.0 - smoothstep(0.35, 1.0, r)) * vAlpha;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vColor * a, a);
      }`,
    vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);

  function spawnParticle(x, y, z, vx, vy, vz, life, size, r, g, b, grav = 12, drag = 0.9, alpha0 = 1) {
    const i = pCursor;
    pCursor = (pCursor + 1) % MAX_PARTICLES;
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
    pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
    pLife[i * 2] = 0; pLife[i * 2 + 1] = life;
    pCol[i * 3] = r; pCol[i * 3 + 1] = g; pCol[i * 3 + 2] = b;
    pGrav[i] = grav; pDrag[i] = drag; pSize0[i] = size; pAlpha0[i] = alpha0;
    pAttr[i * 2] = size; pAttr[i * 2 + 1] = alpha0;
  }

  function burst(point, normal, count, speed, life, size, color, opts = {}) {
    const { spread = 1, grav = 12, drag = 0.9, alpha = 1 } = opts;
    for (let i = 0; i < count; i++) {
      const a = rng.next() * TAU;
      const up = rng.next();
      const s = speed * (0.4 + rng.next() * 0.8);
      const vx = (normal.x * (1 - spread * 0.5) + Math.cos(a) * spread * (1 - up * 0.5)) * s;
      const vy = (normal.y + up * spread) * s * 0.8;
      const vz = (normal.z * (1 - spread * 0.5) + Math.sin(a) * spread * (1 - up * 0.5)) * s;
      spawnParticle(point.x, point.y, point.z, vx, vy, vz,
        life * (0.6 + rng.next() * 0.8), size * (0.7 + rng.next() * 0.6),
        color.r, color.g, color.b, grav, drag, alpha);
    }
  }

  /* ---------------- tracers: instanced stretched boxes ---------------- */
  // camera-facing ribbons approximated as thin instanced boxes oriented along
  // flight; a screen-space min-width floor keeps them visible (sub-pixel
  // additive lines vanish — Cinderbloom's receipt).
  const trGeo = new THREE.BoxGeometry(1, 1, 1);
  const trMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(4.5, 2.6, 1.15), transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const tracers = new THREE.InstancedMesh(trGeo, trMat, MAX_TRACERS);
  tracers.frustumCulled = false;
  tracers.count = MAX_TRACERS;
  scene.add(tracers);
  const trState = [];
  for (let i = 0; i < MAX_TRACERS; i++) trState.push({ live: false, age: 0, dist: 0, speed: 340, origin: new THREE.Vector3(), dir: new THREE.Vector3(), maxDist: 0 });
  let trCursor = 0;
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p2 = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0), _zAxis = new THREE.Vector3(0, 0, 1);

  function tracer(origin, dir, maxDist) {
    const t = trState[trCursor];
    trCursor = (trCursor + 1) % MAX_TRACERS;
    t.live = true; t.age = 0; t.dist = 1.2; // hidden first 1.2 m
    t.origin.copy(origin); t.dir.copy(dir); t.maxDist = maxDist;
  }

  /* ---------------- decals: pooled dark scorch discs ---------------- */
  const dcGeo = new THREE.CircleGeometry(1, 10);
  const dcMat = new THREE.MeshBasicMaterial({
    color: 0x0a0d14, transparent: true, opacity: 0.55, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const decals = new THREE.InstancedMesh(dcGeo, dcMat, MAX_DECALS);
  decals.count = MAX_DECALS;
  decals.frustumCulled = false;
  scene.add(decals);
  const dcState = [];
  for (let i = 0; i < MAX_DECALS; i++) {
    dcState.push({ age: 99 });
    _m4.makeScale(0, 0, 0);
    decals.setMatrixAt(i, _m4);
  }
  decals.instanceMatrix.needsUpdate = true;
  let dcCursor = 0;

  function decal(point, normal, size) {
    const i = dcCursor;
    dcCursor = (dcCursor + 1) % MAX_DECALS;
    dcState[i].age = 0;
    _q.setFromUnitVectors(_zAxis, normal);
    _p2.copy(point).addScaledVector(normal, 0.02);
    _m4.compose(_p2, _q, _s.set(size, size, size));
    decals.setMatrixAt(i, _m4);
    decals.instanceMatrix.needsUpdate = true;
  }

  /* ---------------- flash lights: permanent, intensity 0 ---------------- */
  const lights = [];
  for (let i = 0; i < FLASH_LIGHTS; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 20, 2);
    l.position.set(0, -100, 0);
    scene.add(l);
    lights.push({ light: l, age: 99, life: 0.06, peak: 0 });
  }
  let liCursor = 0;
  function flashLight(point, color, intensity, life = 0.06, dist = 18) {
    const s = lights[liCursor];
    liCursor = (liCursor + 1) % FLASH_LIGHTS;
    s.light.position.copy(point);
    s.light.color.set(color);
    s.light.distance = dist;
    s.age = 0; s.life = life; s.peak = intensity;
  }

  /* ---------------- time scale (hitstop) ---------------- */
  let freeze = 0;
  function hitstop(t) { freeze = Math.max(freeze, t); }

  /* ---------------- impact language: the ONLY door ---------------- */
  const COLORS = {
    rock: new THREE.Color(0.55, 0.5, 0.42),
    dust: new THREE.Color(0.32, 0.33, 0.38),
    metal: new THREE.Color(1.0, 0.75, 0.35),
    energy: new THREE.Color(0.36, 0.87, 1.0),
    flesh: new THREE.Color(0.66, 0.42, 1.0),   // violet — enemy anatomy
    deflect: new THREE.Color(0.55, 0.62, 0.75),
  };
  const _n = new THREE.Vector3(0, 1, 0);

  function impact(kind, point, normal = _n, power = 1) {
    switch (kind) {
      case 'rock':
        burst(point, normal, 6, 5.2 * power, 0.24, 0.05, COLORS.metal, { grav: 14 });
        burst(point, normal, 4, 1.8 * power, 0.8, 0.42, COLORS.dust, { grav: 2.5, drag: 2.4, spread: 1.4, alpha: 0.15 });
        decal(point, normal, 0.16);
        break;
      case 'metal':
        burst(point, normal, 9, 6.5 * power, 0.18, 0.045, COLORS.metal, { grav: 16 });
        flashLight(point, 0xffc46a, 14, 0.05, 7);
        decal(point, normal, 0.11);
        break;
      case 'energy':
        burst(point, normal, 7, 4.2 * power, 0.3, 0.09, COLORS.energy, { grav: 2, drag: 1.6, alpha: 0.8 });
        flashLight(point, 0x5df7ff, 16, 0.07, 9);
        break;
      case 'flesh':
        burst(point, normal, 12, 3.6 * power, 0.42, 0.075, COLORS.flesh, { grav: 8, spread: 1.2, alpha: 0.9 });
        break;
      case 'deflect':
        burst(point, normal, 8, 7.0 * power, 0.15, 0.04, COLORS.deflect, { grav: 12 });
        flashLight(point, 0x9fb4d8, 10, 0.04, 6);
        break;
      case 'death':
        burst(point, normal, 26, 5.0, 0.6, 0.12, COLORS.flesh, { grav: 6, spread: 1.5, alpha: 0.85 });
        flashLight(point, 0x896dff, 30, 0.12, 14);
        break;
    }
    ctx.bus.emit('fx:impact', { kind, point, power });
  }

  return {
    id: 'fx',
    impact,
    burst,
    tracer,
    flashLight,
    hitstop,
    decal,
    spawnParticle,
    consumeTimeScale() {
      return freeze > 0 ? 0 : 1;
    },

    warmup() {
      // one of everything so no shader compiles mid-fight
      const p = new THREE.Vector3(0, -50, 0);
      impact('rock', p); impact('metal', p); impact('energy', p);
      impact('flesh', p); impact('deflect', p); impact('death', p);
      tracer(p, _n, 1);
    },

    update(dt) {
      freeze = Math.max(0, freeze - dt);
      // particles
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (pLife[i * 2] >= pLife[i * 2 + 1]) continue;
        pLife[i * 2] += dt;
        const t = pLife[i * 2] / pLife[i * 2 + 1];
        if (t >= 1) { pPos[i * 3 + 1] = -9999; pAttr[i * 2 + 1] = 0; continue; }
        const dr = Math.exp(-pDrag[i] * dt);
        pVel[i * 3] *= dr;
        pVel[i * 3 + 1] = pVel[i * 3 + 1] * dr - pGrav[i] * dt;
        pVel[i * 3 + 2] *= dr;
        pPos[i * 3] += pVel[i * 3] * dt;
        pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
        pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
        pAttr[i * 2 + 1] = pAlpha0[i] * (1 - t * t);
        pAttr[i * 2] = pSize0[i] * (1 + t * 0.6);
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.aP.needsUpdate = true;
      pGeo.attributes.color.needsUpdate = true;

      // tracers: head advances at 340 m/s; 1.6x width for the first 120 ms
      for (let i = 0; i < MAX_TRACERS; i++) {
        const t = trState[i];
        if (!t.live) { _m4.makeScale(0, 0, 0); tracers.setMatrixAt(i, _m4); continue; }
        t.age += dt;
        t.dist += t.speed * dt;
        const headD = Math.min(t.dist, t.maxDist);
        const tailD = clamp(t.dist - 2.6, 1.2, t.maxDist);
        if (t.dist > t.maxDist + 2.6 || t.age > 0.055 + t.maxDist / t.speed) { t.live = false; continue; }
        const len = Math.max(headD - tailD, 0.05);
        const mid = (headD + tailD) / 2;
        _p2.copy(t.origin).addScaledVector(t.dir, mid);
        // min screen width: scale thickness with distance to camera
        const dCam = _p2.distanceTo(ctx.camera.position);
        const wBase = 0.022 * (t.age < 0.12 ? 1.6 : 1);
        const w = Math.max(wBase, dCam * 0.0011) * Math.sqrt(Math.min(1, wBase / Math.max(wBase, dCam * 0.0011)) + 0.5);
        _q.setFromUnitVectors(_zAxis, t.dir);
        _m4.compose(_p2, _q, _s.set(w, w, len));
        tracers.setMatrixAt(i, _m4);
      }
      tracers.instanceMatrix.needsUpdate = true;

      // decals fade over 22 s
      let dcDirty = false;
      for (let i = 0; i < MAX_DECALS; i++) {
        const d = dcState[i];
        if (d.age > 22) continue;
        d.age += dt;
        if (d.age > 22) {
          _m4.makeScale(0, 0, 0);
          decals.setMatrixAt(i, _m4);
          dcDirty = true;
        }
      }
      if (dcDirty) decals.instanceMatrix.needsUpdate = true;

      // flash lights decay exponentially
      for (const s of lights) {
        if (s.age > s.life) { s.light.intensity = 0; continue; }
        s.age += dt;
        s.light.intensity = s.peak * Math.exp(-s.age / (s.life * 0.4));
        if (s.age > s.life) s.light.intensity = 0;
      }
    },
  };
}
