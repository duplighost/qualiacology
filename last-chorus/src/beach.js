// The beach town (Summer People). The town sings it: cottages boarded for the
// winter, screen doors in spring, umbrellas and the lit-up train in summer,
// the last car south in September, plywood going back up in the first cold rain.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, PASTEL, glowAt, poolAt, local } from './scenery.js';
import { prepare, groundAt } from './trail.js';
import { SummerPieces } from './sp-pieces.js';

const merge = (gs) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)), false);
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);

const G = {
  cottage() {
    const body = new THREE.BoxGeometry(7.5, 5.2, 7); body.translate(0, 2.6, 0);
    return body;
  },
  cottageRoof() {
    const roof = new THREE.CylinderGeometry(0.01, 5.9, 3.0, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1, 1, 0.95); roof.translate(0, 6.7, 0);
    const porch = new THREE.BoxGeometry(7.5, 0.18, 2.4); porch.translate(0, 3.2, 4.6);
    const posts = [];
    for (const x of [-3.5, 3.5]) { const p = new THREE.BoxGeometry(0.16, 3.2, 0.16); p.translate(x, 1.6, 5.7); posts.push(p); }
    return merge([roof, porch, ...posts]);
  },
  lifeguard() {
    const parts = [];
    for (const x of [-0.7, 0.7]) for (const z of [-0.6, 0.6]) { const l = new THREE.BoxGeometry(0.12, 3.2, 0.12); l.translate(x, 1.6, z); l.rotateX(z * 0.12); parts.push(l); }
    const seat = new THREE.BoxGeometry(1.6, 0.12, 1.0); seat.translate(0, 3.2, 0); parts.push(seat);
    const back = new THREE.BoxGeometry(1.6, 1.0, 0.1); back.translate(0, 3.75, -0.5); parts.push(back);
    for (let y = 0.6; y < 3; y += 0.6) { const r = new THREE.BoxGeometry(1.4, 0.08, 0.08); r.translate(0, y, 0.55); parts.push(r); }
    return merge(parts);
  },
  umbrella() {
    const can = new THREE.ConeGeometry(1.6, 0.7, 10, 1, true); can.translate(0, 2.35, 0);
    const pole = new THREE.CylinderGeometry(0.035, 0.035, 2.4, 5); pole.translate(0, 1.2, 0);
    return merge([can, pole]);
  },
  duneFence() {
    const parts = [];
    for (let z = -3; z <= 3; z += 0.22) { const s = new THREE.BoxGeometry(0.05, 1.1 + Math.sin(z * 9) * 0.12, 0.08); s.translate(0, 0.55, z); s.rotateZ(Math.sin(z * 5) * 0.05); parts.push(s); }
    const w = new THREE.BoxGeometry(0.03, 0.03, 6.2); w.translate(0, 0.85, 0); parts.push(w);
    return merge(parts);
  },
  bwLamp() {
    const pole = new THREE.CylinderGeometry(0.07, 0.11, 4.2, 6); pole.translate(0, 2.1, 0);
    const cap = new THREE.CylinderGeometry(0.22, 0.06, 0.2, 8); cap.translate(0, 4.55, 0);
    return merge([pole, cap]);
  },
  plankDeck() { const g = new THREE.BoxGeometry(14, 0.35, 6); g.translate(0, 2.4, 0); return g; },
  pierPost() { const g = new THREE.CylinderGeometry(0.3, 0.3, 4, 6); g.translate(0, 0.5, 0); return g; },
  trainCar() {
    const body = new THREE.BoxGeometry(3.0, 3.4, 20); body.translate(0, 2.5, 0);
    const roof = new THREE.CylinderGeometry(1.55, 1.55, 20, 10, 1, false, 0, Math.PI); roof.rotateX(Math.PI / 2); roof.rotateZ(Math.PI / 2); roof.scale(1, 0.3, 1); roof.translate(0, 4.2, 0);
    return merge([body, roof]);
  },
  rail() { const g = new THREE.BoxGeometry(4.2, 0.25, 0.4); g.translate(0, 0.12, 0); return g; },
};

// train windows: a strip of lit glass down each side
function trainMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.3 });
  m.customProgramCacheKey = () => 'train-car';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; attribute vec2 aWake; varying vec3 vTint; varying vec2 vW2; varying vec3 vOP; varying vec3 vON;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint; vW2 = aWake; vOP = position; vON = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint; varying vec2 vW2; varying vec3 vOP; varying vec3 vON;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float side = step(0.5, abs(vON.x));
        float win = step(2.1, vOP.y) * step(vOP.y, 3.3) * step(0.25, fract(vOP.z / 1.6)) * side;
        totalEmissiveRadiance += vec3(1.0, 0.86, 0.6) * win * (0.3 + 1.8 * vW2.x);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), win * (1.0 - vW2.x) * 0.6);`);
  };
  return m;
}

const BW = { aWake: 3, aTint: 3 }, TT = { aTint: 3 };
extend({
  layers: {
    cottage: (M) => [G.cottage(), M.cottage, 500, BW],
    cottageRoof: (M) => [G.cottageRoof(), M.roof, 500, TT],
    lifeguard: (M) => [G.lifeguard(), M.wood, 80, TT],
    umbrella: (M) => [G.umbrella(), M.cloth, 600, TT],
    duneFence: (M) => [G.duneFence(), M.wood, 500, TT],
    bwLamp: (M) => [G.bwLamp(), M.metal, 500, TT],
    trainCar: (M) => [G.trainCar(), M.train || (M.train = trainMaterial()), 40, { aTint: 3, aWake: 2 }],
    rail: (M) => [G.rail(), M.wood, 900, TT],
  },
  parts: {
    cottage(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s));
      S.layers.cottage.add(m, { aWake: [it.wakeNow, it.seed, it.boarded || 0], aTint: it.tint });
      S.layers.cottageRoof.add(m, { aTint: it.roofTint });
      if (!it.boarded) { const w = local(p, S.course.sample(it.t).yaw + it.rot, 0, 2.9 * it.s, 4.4 * it.s, S._o); glowAt(S, w.x, w.y, w.z, 1.3 * it.s, col(S.P.window), 0.3 + 1.3 * it.wakeNow); poolAt(S, w.x, p.y + 0.06, w.z + 1.5, 6 * it.s, col(S.P.window), 0.2 + 0.6 * it.wakeNow); }
    },
    lifeguard(S, it, p, q, yaw) {
      const m = S._m;
      if (it.stacked) {
        // winter: two chairs tipped over and stacked bone on bone
        S._e.set(Math.PI / 2, yaw, 0); const q2 = new THREE.Quaternion().setFromEuler(S._e);
        m.compose(S._p2 ? S._p2.copy(p).setY(0.7) : (S._p2 = p.clone().setY(0.7)), q2, S._s.set(1, 1, 1)); S.layers.lifeguard.add(m, { aTint: [0.85, 0.82, 0.78] });
        S._e.set(Math.PI / 2, yaw + 0.3, 0); q2.setFromEuler(S._e);
        m.compose(S._p2.setY(1.5), q2, S._s.set(1, 1, 1)); S.layers.lifeguard.add(m, { aTint: [0.85, 0.82, 0.78] });
      } else { m.compose(p, q, S._s.set(1, 1, 1)); S.layers.lifeguard.add(m, { aTint: [0.95, 0.93, 0.9] }); }
    },
    umbrella(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.umbrella.add(m, { aTint: it.tint }); },
    duneFence(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.duneFence.add(m, { aTint: [0.55, 0.45, 0.35] }); },
    bwLamp(S, it, p, q, yaw) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.bwLamp.add(m, { aTint: [0.2, 0.2, 0.24] });
      const lit = (0.4 + 1.1 * it.wakeNow) * (it.dark ? 0.15 : 1);
      glowAt(S, p.x, p.y + 4.45, p.z, 2.4, col(S.P.lamp), lit, S.beatLamps ? 4 : 0);
      poolAt(S, p.x, p.y + 0.07, p.z, 9, col(S.P.lamp), lit * 0.7);
      // string lights sagging to the next lamp
      if (it.next && S.track) {
        const n = S._n || (S._n = new THREE.Vector3());
        S.track.ground(it.next.t, it.next.x, n);
        for (let k = 1; k < 6; k++) {
          const f = k / 6, sag = Math.sin(f * Math.PI) * 0.9;
          glowAt(S, p.x + (n.x - p.x) * f, p.y + 4.2 - sag, p.z + (n.z - p.z) * f, 0.55, col(k % 2 ? S.P.fret : S.P.lamp), lit * 1.3, S.beatLamps ? 4 : 0);
        }
      }
    },
    rail(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.rail.add(m, { aTint: [0.25, 0.2, 0.17] }); },
  },
  kits: {
    // cottages and shops on the town side; boarded in winter and in the rain at the end
    beachtown(S, z, R) {
      const shops = ['CLAMS', 'FRIEDDOUGH', 'ICECREAM', 'TAFFY', 'ARCADE', 'SURF', 'VACANCY', 'MOTEL'];
      const board = z.boarded ?? 0, wake0 = z.wake0 ?? 0.25;
      for (let t = z.from; t < z.to; t += 0.24) {
        if (R() < 0.75) {
          const x = 20 + R() * 7;
          const shop = R() < 0.35;
          if (shop) S.items.push({ t, x, rot: SIDE(x), s: 1, parts: 'shop', tint: col(pick(R, PASTEL)), seed: R(), idx: S.atlas.index[pick(R, shops)], wake0, boarded: board > R() ? 1 : 0 });
          else S.items.push({ t, x: x + 2, rot: SIDE(x), s: 0.9 + R() * 0.25, parts: 'cottage', tint: col(pick(R, PASTEL)), roofTint: col(pick(R, [0x3a3a48, 0x4a3a40, 0x2c3442])), seed: R(), wake0, boarded: board > R() ? 1 : 0 });
        }
        if (R() < 0.6) S.items.push({ t: t + 0.12, x: 40 + R() * 40, rot: SIDE(1), s: 0.85 + R() * 0.3, parts: 'cottage', tint: col(pick(R, PASTEL)), roofTint: col(0x3a3a48), seed: R(), wake0: wake0 * 0.8, boarded: board > R() ? 1 : 0 });
        if (R() < 0.25) S.items.push({ t, x: 30 + R() * 80, s: 0.6 + R() * 0.5, parts: 'tree', tint: col(0x1f3a30), pine: R() < 0.6, seed: R() });
      }
    },
    // the sand: lifeguard chairs (stacked in winter), dune fences, umbrellas when it's summer
    sand(S, z, R) {
      for (let t = z.from; t < z.to; t += 3.2 + R() * 1.5) S.items.push({ t, x: -(36 + R() * 6), rot: Math.PI / 2 + (R() - 0.5) * 0.3, parts: 'lifeguard', stacked: !!z.winter });
      for (let t = z.from; t < z.to; t += 0.13) if (R() < 0.7) S.items.push({ t, x: -(13.5 + R() * 4), rot: (R() - 0.5) * 0.3, parts: 'duneFence' });
      if (z.umbrellas) for (let t = z.from; t < z.to; t += 0.07) if (R() < 0.75) {
        S.items.push({ t, x: -(20 + Math.pow(R(), 0.8) * 42), rot: R() * 6.28, s: 0.9 + R() * 0.3, parts: 'umbrella', tint: col(pick(R, [0xff6fa8, 0xffd166, 0x7fe0d2, 0xff8a5c, 0xb48cff, 0xffffff])) });
      }
    },
    // lamps both sides of the boardwalk with string lights between them
    boardwalk(S, z, R) {
      for (const side of [-1, 1]) {
        let prev = null;
        for (let t = z.from; t < z.to; t += 0.42) {
          const it = { t, x: side * 11, rot: 0, parts: 'bwLamp', seed: R(), dark: z.dark && R() < z.dark, wake0: z.wake0 ?? 0.3 };
          if (prev) prev.next = it;
          S.items.push(it); prev = it;
        }
      }
    },
    // the line the trains run on, right along the water
    railway(S, z, R) { for (let t = z.from; t < z.to; t += 0.05) S.items.push({ t, x: z.x ?? -58, rot: 0, parts: 'rail' }); },
  },
});

// a train going by: a string of lit cars moving along the rails in song time
export class Train {
  constructor(course, x, passes) {
    this.course = course; this.x = x;
    // each pass: the front meets the rider at song time `at`, moving toward them (rate < 0) at `rate`
    this.passes = passes;
  }
  draw(S, rider, songT) {
    for (const ps of this.passes) {
      // where the front is in course time, now: it reaches the rider's course time at ps.at
      const front = ps.at + ps.rate * (songT - ps.at);
      for (let k = 0; k < ps.cars; k++) {
        const tau = front - Math.sign(ps.rate) * k * 0.42;
        if (tau < rider.t - 4 || tau > rider.t + 40) continue;
        const p = S.track.ground(tau, this.x, S._p);
        const yaw = this.course.sample(tau).yaw + (ps.rate < 0 ? Math.PI : 0);
        S._e.set(0, yaw, 0); S._q.setFromEuler(S._e);
        S._m.compose(p.setY(0.3), S._q, S._s.set(1, 1, 1));
        S.layers.trainCar.add(S._m, { aTint: col(k === 0 ? 0xe8e4f0 : 0xd0c8dc), aWake: [ps.lit, 0] });
        if (k === 0) {
          const fx = Math.sin(yaw), fz = Math.cos(yaw);
          glowAt(S, p.x + fx * 10.2, 2.4, p.z + fz * 10.2, 5, [1, 0.95, 0.8], 2.5);
          poolAt(S, p.x + fx * 16, 0.08, p.z + fz * 16, 14, [1, 0.9, 0.7], 0.8);
        }
      }
    }
  }
}

// the land: sand from the water's edge to the boardwalk, then the town. The
// ocean is the ground plane under it.
export class Land {
  constructor(scene, course, P, opt = {}) {
    this.course = course; this.x0 = opt.shore ?? -78; this.x1 = opt.far ?? 260;
    const N = 160;
    this.N = N;
    const g = new THREE.BufferGeometry();
    // foam / wet sand / sand up the dune / boardwalk / town (the dune's extra columns only matter on a bluff)
    this.cols = [this.x0 - 6, this.x0, this.x0 + 10, this.x0 + 24, -40, -30, -22, -16, -12, -9, 9, 14, 30, 60, this.x1];
    this.floorFn = null;
    const M = this.cols.length;
    this.M = M;
    this.pos = new Float32Array(N * M * 3); this.uvs = new Float32Array(N * M * 2);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b = a + 1, c = a + M, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uFog: { value: new THREE.Color(P.fog) }, uFogDensity: { value: P.fogDensity }, uCam: { value: new THREE.Vector3() }, uSand: { value: new THREE.Color(P.sand ?? 0xb8a48a) }, uTown: { value: new THREE.Color(P.ground) }, uSnow: { value: 0 }, uWet: { value: 0 }, uSky: { value: new THREE.Color(P.horizon) }, uTime: { value: 0 }, uX0: { value: this.x0 } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform vec3 uFog, uCam, uSand, uTown, uSky; uniform float uFogDensity, uSnow, uWet, uTime, uX0; varying vec2 vUv; varying vec3 vW;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
        void main(){
          float x = vUv.x;                       // metres across, from the road centre
          float along = vUv.y;
          vec3 col;
          if (x < -9.0) {
            // sand, ripples, darker and glossy near the water, a lace of foam at the edge
            float rip = n2(vec2(along * 0.35, x * 1.3)) * 0.12;
            col = uSand * (0.42 + rip);
            float wet = smoothstep(uX0 + 14.0, uX0 + 3.0, x);
            col = mix(col, uSand * 0.18 + uSky * 0.12, wet);
            float foamLine = uX0 + 2.0 + sin(along * 0.08 + uTime * 0.6) * 2.5 + sin(along * 0.31 - uTime * 1.1) * 1.0;
            float foam = smoothstep(1.6, 0.0, abs(x - foamLine)) * (0.5 + 0.5 * n2(vec2(along * 0.6, uTime)));
            col += vec3(0.85, 0.9, 0.95) * foam * 0.35;
            col = mix(col, vec3(0.8, 0.85, 0.9), uSnow * 0.55 * smoothstep(uX0 + 10.0, uX0 + 20.0, x));
          } else if (x < 9.0) {
            // the old boardwalk at ground level, planks across
            float pl = fract(along / 0.24);
            col = vec3(0.16, 0.11, 0.08) * (0.75 + 0.5 * h2(vec2(floor(along / 0.24), 3.0))) * (0.55 + 0.45 * smoothstep(0.0, 0.08, pl) * smoothstep(1.0, 0.92, pl));
            col = mix(col, vec3(0.7, 0.74, 0.8), uSnow * 0.6);
          } else {
            col = uTown * (0.8 + 0.4 * n2(vW.xz * 0.05));
            col = mix(col, vec3(0.62, 0.66, 0.74), uSnow * 0.7);
          }
          col += uSky * uWet * 0.08;
          float d = length(uCam - vW);
          float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
          gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -3;
    scene.add(this.mesh);
    this._p = new THREE.Vector3();
  }
  update(track, rider, time) {
    const t0 = rider.t - 4, t1 = rider.t + 44, N = this.N, M = this.M;
    const cum = this._cum || (this._cum = new Float32Array(N));
    const iR = Math.round((rider.t - t0) / (t1 - t0) * (N - 1));
    let last = null;
    for (let i = 0; i < N; i++) {
      const t = t0 + (t1 - t0) * (i / (N - 1));
      for (let j = 0; j < M; j++) {
        track.ground(t, this.cols[j], this._p);
        const o = (i * M + j) * 3;
        this.pos[o] = this._p.x; this.pos[o + 1] = j === 0 ? -0.35 : (this.floorFn ? this.floorFn(t, this.cols[j]) : 0.02); this.pos[o + 2] = this._p.z;
        this.uvs[(i * M + j) * 2] = this.cols[j];
      }
      const cx = this.pos[(i * M + 9) * 3], cz = this.pos[(i * M + 9) * 3 + 2];
      cum[i] = last ? cum[i - 1] + Math.hypot(cx - last[0], cz - last[1]) : 0;
      last = [cx, cz];
    }
    const base = rider.stats.dist - cum[iR];
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) this.uvs[(i * M + j) * 2 + 1] = cum[i] + base;
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
    this.mat.uniforms.uTime.value = time;
  }
}

// the ocean: the ground for this place. Swell, the sky in it, the sun's road to the horizon
export function oceanMaterial(P) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color(P.fog) }, uFogDensity: { value: P.fogDensity },
      uGround: { value: new THREE.Color(P.water ?? 0x0d1a2a) }, uStreet: { value: new THREE.Color(P.street) }, uFlow: { value: 0.3 },
      uHorizon: { value: new THREE.Color(P.horizon) }, uZenith: { value: new THREE.Color(P.zenith) }, uSunDir: { value: new THREE.Vector3(...(P.moonDir || [0, 0.3, 1])).normalize() }, uSun: { value: new THREE.Color(P.moon) }, uTime: { value: 0 }, uRain: { value: 0 },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCam, uFog, uGround, uStreet, uHorizon, uZenith, uSunDir, uSun; uniform float uFogDensity, uFlow, uTime, uRain; varying vec3 vW;
      vec2 wv(vec2 p, vec2 d, float f, float s, float a){ float ph = dot(p, d) * f + uTime * s; return d * cos(ph) * f * a; }
      void main(){
        vec2 p = vW.xz;
        vec2 g = wv(p, normalize(vec2(1.0, 0.3)), 0.05, 1.1, 0.5) + wv(p, normalize(vec2(0.4, 1.0)), 0.11, 1.6, 0.25) + wv(p, normalize(vec2(-0.7, 0.6)), 0.23, 2.3, 0.12) + wv(p, normalize(vec2(0.9, -0.5)), 0.6, 3.1, 0.05);
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 V = normalize(uCam - vW);
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N);
        vec3 sky = mix(uHorizon, uZenith, smoothstep(0.0, 0.5, R.y));
        vec3 col = uGround * 0.6 + sky * fres * 0.9;
        float sp = pow(max(dot(R, normalize(uSunDir)), 0.0), 220.0);
        float sp2 = pow(max(dot(R, normalize(uSunDir)), 0.0), 24.0);
        col += uSun * (sp * 4.0 + sp2 * 0.25);
        col *= 1.0 - uRain * 0.25;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.4));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}

// the end of the pier: a Ferris wheel that keeps turning for whoever stays
export class FerrisWheel {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -70;
    this.group = new THREE.Group(); scene.add(this.group);
    this.R = 26; this.spokes = 18;
    const steel = new THREE.MeshStandardMaterial({ color: 0xe8e2f0, roughness: 0.4, metalness: 0.6 });
    this.steel = steel;   // lit by its own bulbs once it's on (emissive only: no recompile)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(this.R, 0.35, 6, 72), steel);
    const rim2 = rim.clone(); rim.position.z = 1.4; rim2.position.z = -1.4;
    this.wheel = new THREE.Group(); this.wheel.add(rim, rim2);
    for (let k = 0; k < this.spokes; k++) {
      const a = k / this.spokes * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.18, this.R, 0.18), steel);
      s.position.set(Math.cos(a) * this.R / 2, Math.sin(a) * this.R / 2, 0); s.rotation.z = a - Math.PI / 2;
      this.wheel.add(s);
    }
    this.wheel.position.y = this.R + 6;
    this.group.add(this.wheel);
    // the A-frame legs
    for (const z of [-3, 3]) for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, this.R + 9, 0.6), steel);
      leg.position.set(sx * 7, (this.R + 6) / 2, z); leg.rotation.z = -sx * 0.26; this.group.add(leg);
    }
    // the pier under it
    const deck = new THREE.Mesh(new THREE.BoxGeometry(40, 0.6, 70), new THREE.MeshStandardMaterial({ color: 0x5a4434, roughness: 0.9 }));
    deck.position.set(0, 2.2, 10); this.group.add(deck);
    this.gondolas = [];
    const gm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const gcols = [0xff6fa8, 0x7fe0d2, 0xffd166, 0xb48cff, 0xff8a5c, 0xf6c1d9];
    for (let k = 0; k < this.spokes; k++) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), gm.clone());
      g.material.color.set(gcols[k % gcols.length]);
      this.group.add(g); this.gondolas.push(g);
    }
    this.lit = 0; this.earned = 0; this.fired = false; this.rot = 0;
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    const p = track.ground(this.t, this.x, this._p || (this._p = new THREE.Vector3()));
    const yaw = this.course.sample(this.t).yaw;
    this.group.position.copy(p);
    this.group.rotation.y = yaw + Math.PI / 2;
    this.rot += dt * (0.05 + 0.1 * this.lit);
    this.wheel.rotation.z = this.rot;
    this.lit += ((this.fired ? 1 : 0.25) - this.lit) * Math.min(1, dt * 1.5);
    const wp = new THREE.Vector3();
    for (let k = 0; k < this.spokes; k++) {
      const a = k / this.spokes * Math.PI * 2 + this.rot;
      const g = this.gondolas[k];
      g.position.set(Math.cos(a) * this.R, this.R + 6 + Math.sin(a) * this.R - 1.6, 0);
      // the cabins are lamps too: a warm light inside each, brighter once it's all on
      g.material.emissive.copy(g.material.color).multiplyScalar(0.12 + 0.55 * this.lit);
    }
    this.steel.emissive.setRGB(0.32, 0.22, 0.26).multiplyScalar(0.15 + 0.6 * this.lit);
    // lights: bulbs round the rim and along the spokes, chasing on the beat
    const S = this.S; if (!S) return;
    this.group.updateMatrixWorld(true);
    const near = this.t - rider.t < 45;
    if (!near) return;
    const chase = Math.floor(songT * 4);
    const cols = [col(this.P.fret), col(this.P.lamp), [1, 0.95, 0.85]];
    for (let k = 0; k < 96; k++) {
      const a = k / 96 * Math.PI * 2 + this.rot;
      const on = this.fired ? ((k + chase) % 3 === 0 ? 1 : 0.55) : 0.25;
      for (const z of [1.6, -1.6]) {
        wp.set(Math.cos(a) * this.R, this.R + 6 + Math.sin(a) * this.R, z).applyMatrix4(this.group.matrixWorld);
        S.glow(wp.x, wp.y, wp.z, 2.1, cols[k % 3], on * (0.6 + 2.2 * this.lit * (0.5 + 0.5 * this.earned)));
      }
    }
    for (let k = 0; k < this.spokes; k++) for (let r = 1; r < 5; r++) {
      const a = k / this.spokes * Math.PI * 2 + this.rot, rr = this.R * r / 5;
      wp.set(Math.cos(a) * rr, this.R + 6 + Math.sin(a) * rr, 0).applyMatrix4(this.group.matrixWorld);
      S.glow(wp.x, wp.y, wp.z, 1.1, cols[(k + r) % 3], this.lit * (0.3 + 1.4 * this.earned));
    }
    wp.set(0, this.R + 6, 0).applyMatrix4(this.group.matrixWorld);
    S.glow(wp.x, wp.y, wp.z, 9, col(this.P.fret), 0.6 + 1.6 * this.lit);
    S.pool(p.x, 2.6, p.z, 60, col(this.P.lamp), 0.3 + 0.7 * this.lit);
  }
}

// Summer People's ground: the boardwalk runs along the top of a bluff over the beach, the town
// on the bluff behind it, and the bluff rises and falls with the ride, so the town is round her
// rather than far down below. Off the boardwalk the dune falls away to the flat wet sand, the
// railway and the water stay at sea level.
export class BeachWorld {
  constructor(scene, S) {
    this.S = S;
    const c = S.course, plan = S.plan || {};
    prepare(c, plan);
    const shore = (S.entry && S.entry.land && S.entry.land.shore) ?? -78;
    const foot = shore + 28, top = -12;        // the dune: from its foot on the flat sand to the boardwalk's edge
    this.floor = (t, x) => {
      const g = groundAt(c, t, Math.max(x, top));
      if (x >= top) return g;
      if (x <= foot) return 0.02;
      const u = (x - foot) / (top - foot);
      return 0.02 + (g - 0.02) * Math.pow(u, 1.6);
    };
    if (S.town) {
      S.town.floorFn = this.floor;
      for (const it of S.town.items) if (!it.abs) it.h = (it.h || 0) + this.floor(it.t, it.x);
    }
    this.pieces = new SummerPieces(S);
    // layers first used mid-ride, made now so the loading card compiles them (no stall when they come)
    if (S.town) for (const k of ['trainCar', 'sumKite', 'sumBall', 'sumRing', 'sumPly']) void S.town.layers[k];
  }
  update(S) {
    if (S.land && !S.land.floorFn) S.land.floorFn = this.floor;
  }
  draw(T) { this.pieces.draw(T); }
}
